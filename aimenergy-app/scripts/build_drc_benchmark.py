"""Fixed geographic benchmark of DRC uptake and conditional kWh purchases.

No tuning, Uganda model changes, individual predictions exported, or zero-filled
consumption targets. Protocol is recorded before fitting; source outcomes have
already been inspected descriptively, so this is not a preregistered experiment.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline

from audit_drc_data import audit

ROOT = Path(__file__).resolve().parents[1]
AREAS = {1: "Goma", 2: "Lubero", 3: "Mutwanga"}
FEATURES = {
    "household": ["male", "age", "education", "hhsize", "depratio", "solar",
                  "appliances", "energy_exp", "income", "parcel_own", "good_qual"],
    "SME": ["male", "age", "education", "employment", "solar", "generator",
            "appliances", "energy_exp", "sales", "parcel_own", "good_qual"],
}
PARAMS = {"n_estimators": 64, "max_depth": 4, "min_samples_leaf": 12,
          "random_state": 20261031, "n_jobs": 1}
PROTOCOL = {
    "id": "drc-geographic-purchase-v1",
    "status": "retrospective_fixed_design_not_preregistered",
    "dataset": "https://doi.org/10.7910/DVN/KPDREF",
    "license": "CC0-1.0", "features": FEATURES, "forest_parameters": PARAMS,
    "split": "Three folds: hold out each complete analysis area, train on the other two. Separate household and SME models.",
    "uptake": "Author-coded follow-up connection status, including attritors coded unconnected; sensitivity excludes attritors from training and evaluation.",
    "purchase": "Monthly prepaid kWh purchases averaged over connection-to-follow-up, conditional on observed connection; windows vary and exact dates are unreleased.",
    "baselines": "Training-weighted connection prevalence; training-weighted purchase median and mean. All are recomputed within each fold/subgroup/sensitivity.",
    "preprocessing": "Unweighted training-only median imputation, then sample-weighted forest fit; raw kWh squared-error regression, no log transform.",
    "metrics": "Held-out sampling-weighted Brier/log loss or MAE/RMSE/bias. Bias is prediction minus observation. Log loss clips probabilities at 1e-6.",
    "aggregation": "Pooled out-of-fold sampling-weighted metrics and separately named equal-area averages of fold metrics. Pooled RMSE uses pooled squared errors.",
    "excluded": "Area, ID, enumerator, target/log-target, connection, attrition and follow-up/conflict fields are never predictors. Distance is omitted because planned alignment availability is uncertain.",
    "selection": "One fixed model per task; no hyperparameter search, favorable-fold selection or switch after viewing results.",
    "scope": "Three analysis areas, one operator, DRC. Not direct-meter, independent-operator, Uganda transfer, village-total, growth, interval or equipment-size validation.",
}


def weighted_median(y, w):
    order = np.argsort(y, kind="stable")
    return float(y[order][np.searchsorted(np.cumsum(w[order]), w.sum() / 2, side="left")])


def metrics(y, prediction, w, task):
    if task == "uptake":
        p = np.clip(prediction, 1e-6, 1 - 1e-6)
        return {"brier": float(np.average((prediction - y) ** 2, weights=w)),
                "log_loss": float(-np.average(y * np.log(p) + (1 - y) * np.log(1 - p), weights=w))}
    residual = prediction - y
    return {"mae_kwh": float(np.average(np.abs(residual), weights=w)),
            "rmse_kwh": float(np.sqrt(np.average(residual ** 2, weights=w))),
            "bias_kwh": float(np.average(residual, weights=w))}


def support(frame):
    w = frame.weights.to_numpy(dtype=float)
    return {"rows": len(frame), "connected": int(frame.connected.eq(1).sum()),
            "weight_sum": float(w.sum()), "weight_effective_sample_size": float(w.sum() ** 2 / (w @ w))}


def membership_hash(frame):
    return hashlib.sha256("\n".join(sorted(str(int(x)) for x in frame.id)).encode()).hexdigest()


def experiment(frame, kind, task, sensitivity):
    group = frame[frame.firm.eq(0 if kind == "household" else 1)].copy()
    if sensitivity == "exclude_attritors":
        group = group[group.attrition.eq(0)]
    if task == "purchase":
        group = group[group.connected.eq(1) & group.kwh.notna()]
    features = FEATURES[kind]
    target = "connected" if task == "uptake" else "kwh"
    folds, pooled = [], []
    for code, name in AREAS.items():
        train, test = group[~group.area.eq(code)], group[group.area.eq(code)]
        if not len(train) or not len(test) or train[features].isna().all().any():
            raise ValueError(f"Insufficient training/test support: {kind}/{task}/{name}/{sensitivity}")
        x_train, x_test = train[features], test[features]
        y_train, y = train[target].to_numpy(dtype=float), test[target].to_numpy(dtype=float)
        w_train, w = train.weights.to_numpy(dtype=float), test.weights.to_numpy(dtype=float)
        model = make_pipeline(SimpleImputer(strategy="median"),
                              (RandomForestClassifier if task == "uptake" else RandomForestRegressor)(**PARAMS))
        model.fit(x_train, y_train, **{model.steps[-1][0] + "__sample_weight": w_train})
        if task == "uptake":
            classes = model.steps[-1][1].classes_
            probability = model.predict_proba(x_test)
            prediction = probability[:, list(classes).index(1)] if 1 in classes else np.zeros(len(test))
            predictions = {"forest": prediction,
                           "prevalence": np.full(len(test), np.average(y_train, weights=w_train))}
        else:
            predictions = {"forest": np.maximum(model.predict(x_test), 0),
                           "median": np.full(len(test), weighted_median(y_train, w_train)),
                           "mean": np.full(len(test), np.average(y_train, weights=w_train))}
        folds.append({"held_out_area": name, "train": support(train), "test": support(test),
                      "train_membership_sha256": membership_hash(train),
                      "test_membership_sha256": membership_hash(test),
                      "metrics": {k: metrics(y, p, w, task) for k, p in predictions.items()}})
        pooled.append((y, w, predictions))
    all_y, all_w = np.concatenate([p[0] for p in pooled]), np.concatenate([p[1] for p in pooled])
    names = pooled[0][2].keys()
    pooled_metrics = {name: metrics(all_y, np.concatenate([p[2][name] for p in pooled]), all_w, task) for name in names}
    equal_area = {name: {metric: float(np.mean([f["metrics"][name][metric] for f in folds]))
                         for metric in pooled_metrics[name]} for name in names}
    return {"population": kind, "task": task, "sensitivity": sensitivity,
            "features": features, "folds": folds, "pooled_weighted_metrics": pooled_metrics,
            "equal_area_mean_fold_metrics": equal_area, "out_of_fold_rows": len(all_y)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT.parent / "dataversefiles")
    args = parser.parse_args()
    inventory = audit(args.source)  # Enforces publisher checksums before fitting.
    frame = pd.read_stata(args.source / "survey.dta", convert_categoricals=False)
    if not frame.id.is_unique or frame.id.isna().any() or not np.isfinite(frame.weights).all() or (frame.weights <= 0).any():
        raise ValueError("Require unique respondent IDs and finite positive sampling weights")
    protocol_path = ROOT / "Data/metadata/drc-benchmark-protocol.json"
    protocol_path.write_text(json.dumps(PROTOCOL, indent=2) + "\n", encoding="utf-8")
    results = [experiment(frame, kind, task, sensitivity)
               for sensitivity in ["author_coded_primary", "exclude_attritors"]
               for kind in FEATURES for task in ["uptake", "purchase"]]
    result = {"protocol": PROTOCOL, "dataset": {"doi": inventory["dataset_doi"],
              "url": PROTOCOL["dataset"], "license": "CC0 1.0", "areas": list(AREAS.values()),
              "survey_rows": len(frame), "observed_purchase_rows": int(frame.kwh.notna().sum()),
              "survey_sha256": hashlib.sha256((args.source / "survey.dta").read_bytes()).hexdigest()},
              "provenance": {"python": platform.python_version(), "numpy": np.__version__,
                  "pandas": pd.__version__, "sklearn": sklearn.__version__,
                  "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  "protocol_sha256": hashlib.sha256(protocol_path.read_bytes()).hexdigest()},
              "experiments": results, "individual_predictions_exported": False,
              "uganda_model_modified": False}
    output = ROOT / "dist/data/drc-benchmark.json"
    output.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(results)} experiments / {sum(len(r['folds']) for r in results)} geographic folds: {output}")
    for r in results[:4]:
        print(r["population"], r["task"], json.dumps(r["pooled_weighted_metrics"]))


if __name__ == "__main__":
    main()
