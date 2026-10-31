"""Audit the user-supplied DRC replication package without training or publishing rows.

Requires pandas from the existing research environment. Original files are read-only.
The default source is the repository-root dataversefiles folder, outside dist.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
AREAS = {1: "Goma", 2: "Lubero", 3: "Mutwanga"}
CLIENT_AREAS = {1: "Mutwanga", 2: "Goma", 3: "Lubero"}


def stats(series: pd.Series) -> dict:
    values = series.dropna()
    return {"observed": int(values.size), "missing": int(series.isna().sum()),
            **({k: float(v) for k, v in {
                "mean": values.mean(), "median": values.median(),
                "min": values.min(), "max": values.max(),
            }.items()} if len(values) else {})}


def audit(source: Path) -> dict:
    files, frames = [], {}
    for name in ["acled", "census", "electricity1", "electricity2", "electricity3", "survey"]:
        path = source / f"{name}.dta"
        with pd.io.stata.StataReader(path, convert_categoricals=False) as reader:
            frame = reader.read()
            files.append({"filename": path.name, "bytes": path.stat().st_size,
                          "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                          "md5": hashlib.md5(path.read_bytes()).hexdigest(),
                          "rows": len(frame), "columns": list(frame.columns),
                          "variable_labels": reader.variable_labels(),
                          "value_labels": {str(k): {str(a): b for a, b in v.items()}
                                           for k, v in reader.value_labels().items()},
                          "missing": {k: int(v) for k, v in frame.isna().sum().items() if v}})
            frames[name] = frame
    for name in ["readme.rtf", "replication.do"]:
        path = source / name
        files.append({"filename": name, "bytes": path.stat().st_size,
                      "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                      "md5": hashlib.md5(path.read_bytes()).hexdigest()})

    metadata = json.loads((ROOT / "Data/metadata/drc-dataverse-source.json").read_text(encoding="utf-8"))
    version = metadata["response"]["data"]["latestVersion"]
    published = {f["dataFile"].get("originalFileName", f["dataFile"]["filename"]): f
                 for f in version["files"]}
    for item in files:
        official = published[item["filename"]]
        checksum = official["dataFile"]["checksum"]
        item["publisher_checksum_matches"] = (checksum["type"] == "MD5" and
                                                 checksum["value"].lower() == item["md5"])
        item["restricted"] = official["restricted"]
        if not item["publisher_checksum_matches"]:
            raise ValueError(f"Publisher checksum mismatch: {item['filename']}")

    monthly = frames["electricity1"]
    site_months = []
    for code, group in monthly.groupby("area"):
        group = group.sort_values("ym")
        periods = group.ym.dt.to_period("M")
        expected = pd.period_range(periods.min(), periods.max(), freq="M")
        site_months.append({"area": AREAS[int(code)], "rows": len(group),
                           "start": str(periods.min()), "end": str(periods.max()),
                           "duplicate_months": int(periods.duplicated().sum()),
                           "absent_calendar_months": [str(p) for p in expected.difference(periods)],
                           "missing_household_totals": int(group.kwh_month_tot_hh.isna().sum()),
                           "missing_sme_totals": int(group.kwh_month_tot_sme.isna().sum())})
    client_summaries = []
    for (code, kind), group in frames["electricity2"].groupby(["area", "client"]):
        client_summaries.append({"area": CLIENT_AREAS[int(code)],
                                 "client": {1: "household", 2: "SME"}[int(kind)],
                                 "monthly_purchase_kwh_per_client": stats(group.kwh_client_av)})
    survey = frames["survey"]
    survey_groups = []
    for (code, firm), group in survey.groupby(["area", "firm"]):
        survey_groups.append({"area": AREAS[int(code)], "type": "SME" if firm else "household",
                              "rows": len(group), "connected": int(group.connected.eq(1).sum()),
                              "observed_kwh": int(group.kwh.notna().sum())})
    normalized = frames["electricity3"]
    return {
        "audit_version": 1,
        "dataset_doi": "10.7910/DVN/KPDREF",
        "paper_doi": "10.1016/j.eneco.2026.109141",
        "license": version["license"],
        "published_version": f"{version['versionNumber']}.{version['versionMinorNumber']}",
        "metadata_accessed_utc": metadata["accessed_utc"],
        "source_folder": "repository-root/dataversefiles (override with --source)",
        "measurement": "Administrative prepaid electricity purchases in kWh, used as a consumption proxy; not direct meter readings.",
        "method_reference": "Authors' June 2025 working paper; final article methods not independently inspected.",
        "files": files,
        "monthly_area_records": site_months,
        "client_average_records": client_summaries,
        "survey": {"rows": len(survey), "unique_ids": int(survey.id.nunique()),
                   "duplicate_ids": int(survey.id.duplicated().sum()),
                   "missing_ids": int(survey.id.isna().sum()), "groups": survey_groups,
                   "observed_kwh": int(survey.kwh.notna().sum()),
                   "missing_kwh": int(survey.kwh.isna().sum()),
                   "unconnected_with_missing_kwh": int((survey.connected.eq(0) & survey.kwh.isna()).sum()),
                   "connected_with_missing_kwh": int((survey.connected.eq(1) & survey.kwh.isna()).sum()),
                   "attritors": int(survey.attrition.eq(1).sum()),
                   "positive_finite_weights": bool((survey.weights.notna() & survey.weights.gt(0) & survey.weights.lt(float('inf'))).all())},
        "normalized_goma": {"rows": len(normalized),
                            "start": normalized.yrmth.min().strftime("%Y-%m"),
                            "end": normalized.yrmth.max().strftime("%Y-%m"),
                            "unit": "Index normalized to December 2024; not absolute kWh"},
        "checks": {
            "monthly_area_month_unique": not bool(monthly.duplicated(["area", "ym"]).any()),
            "client_averages_nonnegative": bool(frames["electricity2"].kwh_client_av.ge(0).all()),
            "survey_id_unique_nonmissing": bool(survey.id.notna().all() and survey.id.is_unique),
            "area_mapping_differs_between_files": AREAS != CLIENT_AREAS,
        },
        "limitations": [
            "Three analysis areas under one operator, not 13,479 independent sites.",
            "electricity2 is one average per client, with no released client ID or observation dates.",
            "census has only area, firm and construction quality; no parcel ID, coordinates or individual linkage key.",
            "The published client-month/transaction counts are not rows in this released package.",
            "Survey outcome windows differ from client administrative averages; do not merge by row order.",
            "Do not fill missing survey consumption with zero without defining a separate uptake-times-conditional-use target.",
            "Future conflict, follow-up answers, attrition and outcome-derived fields must not become pre-grid predictors.",
            "No AimEnergy prediction accuracy, unseen-site validation or Uganda transfer result has been established.",
        ],
        "model_training_performed": False,
        "raw_rows_exported": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT.parent / "dataversefiles")
    args = parser.parse_args()
    result = audit(args.source)
    output = ROOT / "Data/metadata/drc-dataverse-audit.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Audited {len(result['files'])} files; aggregate-only report: {output}")


if __name__ == "__main__":
    main()
