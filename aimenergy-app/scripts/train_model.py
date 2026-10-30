"""Fit and export honest household survey-proxy ML and village archetypes.

No pickle loading, notebook execution, network requests, or metered-demand claims.
Run from any directory: python scripts/train_model.py
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import platform
import shutil
from pathlib import Path

import numpy as np
import pandas as pd
import scipy
import sklearn
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1]
DATA = APP / "Data"
MODELS = APP / "Models"
PUBLIC = APP / "dist/data"
SEED = 20261030
CANDIDATES = ["h9q03", "h9q04", "h9q05", "h9q06", "urban", "region", "s10q02"]
CATEGORICAL = {"h9q04", "h9q05", "h9q06", "urban", "region"}
LABELS = {"h9q03": "Sleeping rooms", "h9q04": "Roof material", "h9q05": "Wall material",
          "h9q06": "Floor material", "urban": "Rural or urban", "region": "Region",
          "s10q02": "Usual daily power availability (hours)"}


def clean(v):
    if isinstance(v, dict):
        return {str(k): clean(x) for k, x in v.items()}
    if isinstance(v, (list, tuple, np.ndarray)):
        return [clean(x) for x in v]
    if isinstance(v, np.generic):
        v = v.item()
    if isinstance(v, float) and not math.isfinite(v):
        return None
    return v


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(clean(value), ensure_ascii=False, allow_nan=False,
                               separators=(",", ":")), encoding="utf-8")


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def prepare(source):
    """Preserve source microdata locally; public output remains aggregate/model only."""
    folders = ["raw/survey", "raw/lamwo", "processed/geospatial", "splits", "metadata"]
    for folder in folders:
        (DATA / folder).mkdir(parents=True, exist_ok=True)
    local_source = DATA / "raw/survey/analysis_clean_noMI.dta"
    if source.resolve() != local_source.resolve():
        shutil.copy2(source, local_source)
    repo = ROOT / "lamwo-electrification-project-main/lamwo-electrification-project-main"
    sources = [(source, local_source, "Supplied Uganda household survey analysis file; local microdata")]
    for path in sorted((repo / "data/processed").glob("*.csv")):
        target = DATA / "raw/lamwo" / path.name
        shutil.copy2(path, target)
        sources.append((path, target, "Supplied Lamwo reference repository processed geospatial table"))
    for name in ["sites.json", "boundaries.geojson", "survey-summary.json", "catalog.json", "ramp-profiles.json"]:
        path = PUBLIC / name
        if path.exists():
            target = DATA / "processed/geospatial" / name
            shutil.copy2(path, target)
            sources.append((path, target, "Existing compact app asset; see catalog provenance"))
    provenance = [{"source": str(src.relative_to(ROOT)), "local_path": str(dst.relative_to(APP)).replace("\\", "/"),
                   "sha256": sha(dst), "bytes": dst.stat().st_size, "description": description}
                  for src, dst, description in sources]
    write(DATA / "metadata/source-manifest.json", {"algorithm": "SHA-256", "files": provenance,
          "exclusions": ["Large raw rasters and source archives are not duplicated.",
                         "Household microdata, household IDs and split rows must not be published in dist.",
                         "Third-party data redistribution rights must be reviewed before sharing local Data/raw."]})
    return local_source


def fit_schema(train, fields, value_labels, label_keys):
    schema = []
    for field in fields:
        series = train[field].replace([np.inf, -np.inf], np.nan)
        categorical = field in CATEGORICAL
        default = float(series.mode().iloc[0] if categorical else series.median())
        entry = {"name": field, "label": LABELS[field], "type": "categorical" if categorical else "number",
                 "default": default, "min": float(series.min()), "max": float(series.max()),
                 "missing_training": int(series.isna().sum())}
        if categorical:
            labels = value_labels.get(label_keys.get(field), {})
            entry["options"] = [{"value": float(code), "label": labels.get(code, str(code))}
                                for code in sorted(series.dropna().unique())]
        else:
            entry["physical_min"] = 0
            entry["physical_max"] = 24 if field == "s10q02" else 50
        schema.append(entry)
    return schema


def encode(frame, schema):
    columns = []
    names = []
    for feature in schema:
        field = feature["name"]
        values = pd.to_numeric(frame[field], errors="coerce").replace([np.inf, -np.inf], np.nan).fillna(feature["default"]).to_numpy(float)
        if feature["type"] == "categorical":
            allowed = [x["value"] for x in feature["options"]]
            values = np.where(np.isin(values, allowed), values, feature["default"])
            for value in allowed:
                columns.append((values == value).astype(float))
                names.append({"feature": field, "category": value})
        else:
            columns.append(values)
            names.append({"feature": field})
    return np.column_stack(columns).astype(np.float32), names


def forest():
    return RandomForestRegressor(n_estimators=64, max_depth=4, min_samples_leaf=12,
                                 max_features=1.0, random_state=SEED, n_jobs=1)


def metrics(y, prediction, weights):
    error = np.asarray(y) - prediction
    return {"mae": float(np.mean(abs(error))), "rmse": float(np.sqrt(np.mean(error ** 2))),
            "weighted_mae": float(np.average(abs(error), weights=weights)),
            "weighted_rmse": float(np.sqrt(np.average(error ** 2, weights=weights))),
            "wape": float(np.sum(abs(error)) / np.sum(abs(y))) if np.sum(abs(y)) else None,
            "bias": float(np.mean(-error)), "bias_prediction_minus_observed": float(np.mean(-error)), "n": len(y)}


def export_trees(model):
    return [{"left": t.tree_.children_left.tolist(), "right": t.tree_.children_right.tolist(),
             "feature": t.tree_.feature.tolist(), "threshold": t.tree_.threshold.tolist(),
             "value": t.tree_.value[:, 0, 0].tolist()} for t in model.estimators_]


def train(source):
    path = prepare(source)
    fields = ["hhid", "kwh_m", "wgt", "district", "hhsize", "elec_cost_ugx", "elec_days", "elec_price", *CANDIDATES]
    raw = pd.read_stata(path, columns=fields, convert_categoricals=False)
    reader = pd.io.stata.StataReader(path)
    value_labels, variable_labels = reader.value_labels(), reader.variable_labels()
    label_keys = dict(zip(reader._varlist, reader._lbllist))
    stability = {field: int((raw.groupby("hhid")[field].nunique(dropna=False) > 1).sum())
                 for field in fields if field != "hhid"}
    assert all(stability[f] == 0 for f in ["kwh_m", "wgt", "urban", "district", "elec_cost_ugx", "elec_days", "elec_price"])
    selected = [f for f in CANDIDATES if stability[f] == 0]
    households = raw.drop_duplicates("hhid").sort_values("hhid").reset_index(drop=True)
    households = households.loc[households.kwh_m.notna() & np.isfinite(households.kwh_m) & (households.kwh_m >= 0)].copy()
    assert len(households) == 445
    formula = raw.elec_cost_ugx * 30 / raw.elec_days / 250
    valid = formula.notna() & np.isfinite(formula)
    assert np.allclose(raw.loc[valid, "kwh_m"], formula[valid])
    train_idx, other_idx = train_test_split(np.arange(len(households)), train_size=.6, random_state=SEED, stratify=households.urban)
    cal_idx, test_idx = train_test_split(other_idx, test_size=.5, random_state=SEED, stratify=households.iloc[other_idx].urban)
    partitions = {"train": train_idx, "calibration": cal_idx, "test": test_idx}
    for name, indices in partitions.items():
        subset = households.iloc[indices].copy()
        subset[["hhid", *selected, "kwh_m", "wgt"]].to_csv(DATA / f"splits/{name}.csv", index=False)
    households[["hhid", *selected, "kwh_m", "wgt"]].to_csv(DATA / "processed/households.csv", index=False)
    write(DATA / "metadata/quality-audit.json", {"raw_rows": len(raw), "unique_households": len(households),
          "within_household_inconsistent_counts_including_missingness": stability, "included_features": selected,
          "excluded_unstable_features": [f for f in CANDIDATES if stability[f]],
          "excluded_by_design": ["hhid", "district", "hhsize", "all payment/cost/tariff/target-derived fields", "record-level individual, asset and consumption variables"],
          "target_formula_checked_rows": int(valid.sum()), "target_formula_uncheckable_rows": int((~valid).sum()),
          "target_formula": "elec_cost_ugx * 30 / elec_days / 250", "lamwo_households": 0})
    train_frame = households.iloc[train_idx]
    cv = []
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    for fit_rows, validation_rows in folds.split(train_frame, train_frame.urban):
        fit, validation = train_frame.iloc[fit_rows], train_frame.iloc[validation_rows]
        schema = fit_schema(fit, selected, value_labels, label_keys)
        xfit, _ = encode(fit, schema)
        xval, _ = encode(validation, schema)
        model = forest().fit(xfit, np.log1p(fit.kwh_m))
        cv.append({"forest_mae": float(np.mean(abs(validation.kwh_m.to_numpy() - np.expm1(model.predict(xval))))),
                   "baseline_mae": float(np.mean(abs(validation.kwh_m.to_numpy() - fit.kwh_m.median())))})
    cv_forest = float(np.mean([r["forest_mae"] for r in cv]))
    cv_baseline = float(np.mean([r["baseline_mae"] for r in cv]))
    selected_kind = "random_forest" if cv_forest < cv_baseline else "median_baseline"
    schema = fit_schema(train_frame, selected, value_labels, label_keys)
    matrix, encoded_names = encode(train_frame, schema)
    model = forest().fit(matrix, np.log1p(train_frame.kwh_m))
    baseline = float(train_frame.kwh_m.median())
    def predict(frame, kind):
        x, _ = encode(frame, schema)
        return np.expm1(model.predict(x)) if kind == "random_forest" else np.full(len(frame), baseline)
    calibration = households.iloc[cal_idx]
    residuals = abs(calibration.kwh_m.to_numpy() - predict(calibration, selected_kind))
    rank = min(len(residuals), math.ceil((len(residuals) + 1) * .9))
    q = float(np.sort(residuals)[rank - 1])
    test = households.iloc[test_idx]
    prediction = predict(test, selected_kind)
    lower, upper = np.maximum(0, prediction - q), prediction + q
    test_y = test.kwh_m.to_numpy()
    evaluation = {"schema_version": 1, "seed": SEED, "units": "kWh per household per 30-day month (survey expenditure proxy)",
          "target_kind": "survey_expenditure_proxy", "metered": False, "selection_metric": "unweighted MAE",
          "selection_method": "5-fold stratified cross-validation on training households only; lowest mean fold MAE",
          "selected_model": selected_kind, "cross_validation": {"folds": cv, "forest_mae": cv_forest, "baseline_mae": cv_baseline},
          "split": {name: {"households": len(indices), "rural": int((households.iloc[indices].urban == 0).sum()),
                             "urban": int((households.iloc[indices].urban == 1).sum())} for name, indices in partitions.items()},
          "test": {"selected": metrics(test_y, prediction, test.wgt),
                   "random_forest": metrics(test_y, predict(test, "random_forest"), test.wgt),
                   "median_baseline": metrics(test_y, predict(test, "median_baseline"), test.wgt),
                   "interval": {"nominal_coverage": .9, "observed_coverage": float(np.mean((test_y >= lower) & (test_y <= upper))),
                                "mean_width": float(np.mean(upper - lower)), "calibration_residual_quantile": q,
                                "finite_sample_rank": rank, "calibration_households": len(calibration)}},
          "interpretation": "Held-out household survey-proxy error only. No Lamwo observations, metered mini-grid validation, temporal forecast, geographic transfer guarantee or village-aggregate interval guarantee."}
    evaluation["models"] = {kind: {"test": evaluation["test"][kind]} for kind in ["random_forest", "median_baseline"]}
    evaluation["cv"] = evaluation["cross_validation"]
    evaluation["conformal"] = {"nominal_coverage": .9, "test_coverage": evaluation["test"]["interval"]["observed_coverage"],
                               "mean_width": evaluation["test"]["interval"]["mean_width"], "n_calibration": len(calibration)}
    evaluation["calibration_plot"] = [{"bin": i + 1, "pred_mean": float(np.mean(prediction[idx])),
                                        "actual_mean": float(np.mean(test_y[idx])), "count": len(idx)}
                                       for i, idx in enumerate(np.array_split(np.argsort(prediction, kind="stable"), 5))]
    evaluation["test"]["rural_descriptive"] = metrics(test_y[test.urban.to_numpy() == 0], prediction[test.urban.to_numpy() == 0], test.loc[test.urban == 0, "wgt"])
    importance = {field: 0.0 for field in selected}
    for encoded, score in zip(encoded_names, model.feature_importances_):
        importance[encoded["feature"]] += float(score)
    artifact = {"schema_version": 1, "model_id": "aimenergy-household-proxy-rf64-20261030", "title": "Household survey-proxy model",
          "target": {"field": "kwh_m", "units": evaluation["units"], "kind": "survey_expenditure_proxy", "metered": False,
                     "formula": "elec_cost_ugx * 30 / elec_days / 250", "assumed_tariff_ugx_per_kwh": 250},
          "feature_schema": schema, "encoded_features": encoded_names,
          "model": {"kind": selected_kind, "forest_kind": "random_forest", "trees": export_trees(model),
                    "target_transform": "log1p", "baseline": baseline, "n_estimators": 64, "max_depth": 4, "min_samples_leaf": 12},
          "calibration": {"method": "split conformal absolute residuals", "nominal_coverage": .9, "q": q,
                          "n": len(calibration), "rank": rank, "lower_clip": 0},
          "global_feature_importance": importance, "training_households": len(train_frame),
          "training_region_counts": {str(k): int(v) for k, v in train_frame.region.value_counts().items()},
          "limitations": ["445 unique surveyed households; 354 urban, 91 rural; none in Lamwo.",
                          "Target is inferred from reported spending using an assumed 250 UGX/kWh tariff, not meters.",
                          "Power hours are usual reported availability; proposed supply hours are an unvalidated scenario.",
                          "Intervals exclude uncertainty in the assumed tariff and reported payments.",
                          "Intervals target exchangeable household survey proxies; transfer to Lamwo or aggregate totals is not guaranteed.",
                          "Global feature importance is descriptive of the fitted forest, not a causal explanation."],
          "evaluation_file": "ml-evaluation.json", "runtime": "JSON trees, one-hot categories, float32 inputs; no Python server required"}
    synthetic = []
    for i, overrides in enumerate([{}, {"urban": 0, "region": 3, "h9q03": 1, "s10q02": 8}, {"urban": 1, "h9q03": 4, "s10q02": 24}]):
        values = {f["name"]: f["default"] for f in schema}
        values.update({k: v for k, v in overrides.items() if k in selected})
        result = float(predict(pd.DataFrame([values]), selected_kind)[0])
        synthetic.append({"id": f"synthetic-{i + 1}", "synthetic": True, "input": values, "prediction": result,
                          "lower": max(0, result - q), "upper": result + q})
    artifact["parity_fixtures"] = synthetic
    write(PUBLIC / "ml-model.json", artifact)
    write(PUBLIC / "ml-evaluation.json", evaluation)
    write(MODELS / "household-proxy-forest.json", artifact)
    write(MODELS / "evaluation.json", evaluation)
    write(DATA / "metadata/feature-dictionary.json", {f: {"source_label": variable_labels[f],
          "value_labels": value_labels.get(label_keys.get(f), {})} for f in selected})
    write(DATA / "metadata/split-manifest.json", {"seed": SEED, "unit": "unique household", "stratify": "urban",
          "method": "60/20/20 deterministic random split; all source repeats remain in one household",
          "files": [{"path": f"Data/splits/{name}.csv", "sha256": sha(DATA / f"splits/{name}.csv"), "rows": len(indices)}
                    for name, indices in partitions.items()], "private": True})
    write(MODELS / "training-provenance.json", {"seed": SEED, "source_sha256": sha(path),
          "script_sha256": sha(Path(__file__)), "artifact_sha256": sha(PUBLIC / "ml-model.json"),
          "versions": {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__,
                       "scipy": scipy.__version__, "scikit-learn": sklearn.__version__},
          "fit_sample_weight": False, "metric_weight": "wgt for explicitly weighted metrics only",
          "preprocessing_fit_scope": "train only; refit separately inside each CV fold", "test_used_for_selection": False})
    print(json.dumps({"selected_model": selected_kind, "cv_forest_mae": cv_forest,
                      "cv_baseline_mae": cv_baseline, "test": evaluation["test"]}, indent=2))
    return evaluation


def cluster_sites():
    sites = json.loads((PUBLIC / "sites.json").read_text(encoding="utf-8"))["sites"]
    frame = pd.DataFrame(sites)
    features = ["total_population", "building_count", "educational_facilities", "health_facilities",
                "social_facilities", "primary_roads", "secondary_roads", "tertiary_roads", "unclassified_roads"]
    # Use only actual available context fields; source zeros remain observations.
    features = [f for f in features if f in frame and pd.api.types.is_numeric_dtype(frame[f])]
    assert len(features) >= 4
    x = frame[features].replace([np.inf, -np.inf], np.nan)
    medians = x.median()
    transformed = np.log1p(x.fillna(medians).clip(lower=0))
    scaler = StandardScaler().fit(transformed)
    model = KMeans(n_clusters=4, n_init=20, random_state=SEED).fit(scaler.transform(transformed))
    # Order cluster IDs by median population, making descriptive labels reproducible.
    order = sorted(range(4), key=lambda c: frame.loc[model.labels_ == c, "total_population"].median())
    remap = {old: new for new, old in enumerate(order)}
    labels = np.array([remap[c] for c in model.labels_])
    names = ["Lower population context", "Smaller settlement context", "Larger settlement context", "Highest population context"]
    artifact = {"schema_version": 1, "algorithm": "KMeans on standardized log1p geospatial features",
          "features": features, "seed": SEED, "k": 4, "n_init": 20, "village_count": len(frame),
          "clusters": [{"id": c, "label": names[c], "size": int(sum(labels == c)),
                        "summary": {f: float(frame.loc[labels == c, f].median()) for f in features}} for c in range(4)],
          "assignments": {str(int(row["id"])): int(c) for row, c in zip(sites, labels)},
          "preprocessing": {"transform": "log1p nonnegative features; missing imputed with corpus medians", "medians": medians.to_dict(),
                            "scale_mean": scaler.mean_.tolist(), "scale_std": scaler.scale_.tolist()},
          "centers_standardized": model.cluster_centers_[order].tolist(),
          "limitations": "Unsupervised context discovery across 411 villages. Labels describe median features; no electricity demand, economic potential, eligibility or accuracy claims."}
    write(PUBLIC / "site-clusters.json", artifact)
    write(MODELS / "site-clusters.json", artifact)
    write(MODELS / "site-cluster-provenance.json", {"seed": SEED, "source": "dist/data/sites.json",
          "source_sha256": sha(PUBLIC / "sites.json"), "script_sha256": sha(Path(__file__)),
          "artifact_sha256": sha(PUBLIC / "site-clusters.json"), "fit_scope": "all 411 villages; unsupervised discovery",
          "algorithm": "KMeans", "sklearn_version": sklearn.__version__, "no_target_labels": True})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "Household electricity demand in Uganda/analysis_clean_noMI.dta")
    args = parser.parse_args()
    MODELS.mkdir(parents=True, exist_ok=True)
    train(args.source)
    cluster_sites()
