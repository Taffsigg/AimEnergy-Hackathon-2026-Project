"""Acquire and audit the Hartvigsson/Ahlgren Tanzania current measurements.

Standard-library only. Uses verified HTTPS and never executes downloaded files.
The NC-licensed source stays under Data/raw; it is not a web/public asset.
Run from any directory: python scripts/acquire_tanzania_data.py [--download]
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import ssl
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "Data/raw/metered/tanzania"
AUDIT = ROOT / "Data/metadata/tanzania-metered-audit.json"
PAGE = "https://data.mendeley.com/datasets/bbtn9wxhzm/1"
API = "https://data.mendeley.com/public-api/datasets/bbtn9wxhzm/files?version=1&folder_id=root"
PAPER = "https://research.chalmers.se/publication/500718/file/500718_Fulltext.pdf"
START = {
    "Household": (None, "08:20"), "Workshop1a": ("Friday", "11:00"),
    "Workshop1b": ("Monday", "12:39"), "Mill1": ("Friday", "10:00"),
    "Mill2a": ("Thursday", "08:25"), "Mill2b": ("Saturday", "08:45"),
    "Minigrid1a": ("Thursday", "11:25"), "Minigrid1b": ("Monday", "11:40"),
    "Hospital": ("Wednesday", "09:15"),
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def fetch(url: str) -> bytes:
    if not url.startswith("https://"):
        raise ValueError("Only HTTPS sources are permitted")
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": PAGE})
    # ssl.create_default_context uses the Windows system trust store here.
    with urllib.request.urlopen(request, context=ssl.create_default_context(), timeout=30) as response:
        if not response.url.startswith("https://"):
            raise ValueError("Refusing redirect to insecure transport")
        return response.read()


def acquire(download: bool) -> list[dict]:
    RAW.mkdir(parents=True, exist_ok=True)
    manifest = RAW / "mendeley-files.json"
    if download or not manifest.exists():
        manifest.write_bytes(fetch(API))
    files = json.loads(manifest.read_text())
    for item in files:
        path = RAW / item["filename"]
        if path.parent != RAW:
            raise ValueError("Unsafe source filename")
        if download or not path.exists():
            path.write_bytes(fetch(item["content_details"]["download_url"]))
        if sha(path) != item["content_details"]["sha256_hash"]:
            raise ValueError(f"Publisher SHA256 mismatch: {path.name}")
        destination = (RAW / "extracted").resolve()
        with zipfile.ZipFile(path) as archive:
            for entry in archive.infolist():
                target = (destination / entry.filename).resolve()
                if not target.is_relative_to(destination):
                    raise ValueError("Unsafe ZIP member")
                if not entry.is_dir():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(archive.read(entry))
    metadata = RAW / "dataset-metadata.json"
    if download or not metadata.exists() or not json.loads(metadata.read_text()).get("name"):
        metadata.write_bytes(fetch("https://data.mendeley.com/public-api/datasets/bbtn9wxhzm/snapshot/1"))
    if not json.loads(metadata.read_text()).get("name"):
        raise ValueError("Official dataset snapshot lacks name")
    return files


def audit_series(path: Path) -> dict:
    rows = [list(map(float, line.split())) for line in path.read_text().splitlines() if line.strip()]
    if any(len(row) != 4 for row in rows) or not all(math.isfinite(x) for row in rows for x in row):
        raise ValueError(f"Invalid numeric data: {path}")
    day, clock = START[path.stem]
    hour, minute = map(int, clock.split(":"))
    start_minute = hour * 60 + minute
    first_midnight = 1440 - start_minute
    complete = []
    cursor = first_midnight
    while cursor + 1440 <= len(rows):
        complete.append(rows[cursor:cursor + 1440])
        cursor += 1440
    profile = [sum(row[1] for block in complete for row in block[h * 60:(h + 1) * 60]) /
               (60 * len(complete)) for h in range(24)] if complete else None
    if profile:
        scale = sum(profile) / 24
        profile = [round(x / scale, 6) for x in profile]
    values = [row[1] for row in rows]
    diagnostic = None
    if len(complete) >= 2:
        def shares(block: list) -> list[float]:
            totals = [sum(row[1] for row in block[h * 60:(h + 1) * 60]) for h in range(24)]
            return [x / sum(totals) for x in totals]
        train, target = shares(complete[0]), shares(complete[1])
        def score(predicted: list[float]) -> dict:
            return {"mae_share": round(sum(abs(x-y) for x,y in zip(predicted, target))/24, 8),
                    "rmse_share": round(math.sqrt(sum((x-y)**2 for x,y in zip(predicted,target))/24), 8),
                    "total_variation_distance": round(sum(abs(x-y) for x,y in zip(predicted,target))/2, 8)}
        diagnostic = {
            "status": "retrospective_single_site_current_shape_diagnostic_not_model_validation",
            "protocol": "Predict second complete civil day's 24 hourly normalized current shares using first complete day's shares; compare fixed uniform 1/24 baseline. No tuning or absolute energy prediction.",
            "train_elapsed_minute_indices_inclusive": [first_midnight, first_midnight + 1439],
            "test_elapsed_minute_indices_inclusive": [first_midnight + 1440, first_midnight + 2879],
            "train_hourly_shares": [round(x, 8) for x in train],
            "test_hourly_shares": [round(x, 8) for x in target],
            "previous_day_shape": score(train), "flat_shape": score([1/24] * 24),
            "limitations": ["One training day and one test day from same entity/site.",
                            "Test total is used only to define evaluation shape, never as predictive input.",
                            "Not a cold-start forecast, independent-site test, survey prediction, or kWh validation.",
                            "Only current share; column-average midpoint caveat applies; full-day diagnostic assumes one-minute sampling and correct README clock."]}
    return {
        "name": path.stem, "local_path": relative(path), "sha256": sha(path),
        "bytes": path.stat().st_size, "rows": len(rows), "numeric_columns": 4,
        "class": "site_total" if path.stem.startswith("Minigrid") else
                 "household" if path.stem == "Household" else
                 "institution" if path.stem == "Hospital" else "SME",
        "entity_id": re.sub(r"[ab]$", "", path.stem), "site_id": "tanzania_hartvigsson_single_site",
        "start_weekday": day, "start_clock_local_unspecified_timezone": clock,
        "absolute_dates": None, "sampling_seconds": 60,
        "sampling_evidence": "paper methods p188; index increments one; original text has no header",
        "elapsed_minutes": [rows[0][0], rows[-1][0]],
        "record_count_hours": round(len(rows) / 60, 4),
        "index_differences": dict(Counter(str(b[0] - a[0]) for a, b in zip(rows, rows[1:]))),
        "columns": [
            {"position": 0, "name": "elapsed_minute", "status": "inferred from index + paper"},
            {"position": 1, "name": "reported_average_current_A", "status": "inferred by ordering + paper; exact midpoint of bounds"},
            {"position": 2, "name": "minimum_current_A", "status": "inferred by ordering + paper"},
            {"position": 3, "name": "maximum_current_A", "status": "inferred by ordering + paper"},
        ],
        "column_ranges": [[min(row[c] for row in rows), max(row[c] for row in rows)] for c in range(4)],
        "negative_value_count": sum(x < 0 for row in rows for x in row),
        "mean_current_A_reported_column": round(sum(values) / len(values), 6),
        "peak_reported_average_current_A": max(values),
        "reported_current_load_factor": round(sum(values) / len(values) / max(values), 6),
        "max_difference_average_vs_midpoint_A": round(max(abs(row[1] - (row[2] + row[3]) / 2) for row in rows), 6),
        "all_reported_averages_between_min_max": all(row[2] <= row[1] <= row[3] for row in rows),
        "complete_midnight_to_midnight_days": len(complete),
        "hourly_mean1_shape_complete_days": profile,
        "shape_status": "descriptive only; full civil days pooled, mean normalized to 1; not held-out validation",
        "chronological_shape_diagnostic": diagnostic,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true", help="refresh the official HTTPS files")
    args = parser.parse_args()
    files = acquire(args.download)
    source = json.loads((RAW / "dataset-metadata.json").read_text())
    series = [audit_series(path) for path in sorted((RAW / "extracted").rglob("*.txt")) if path.name != "README.txt"]
    readme = next((RAW / "extracted").rglob("README.txt"))
    result = {
        "schema_version": 1, "audited_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "measured_current_acquired_audited_not_kwh_validated", "dataset_id": "bbtn9wxhzm", "version": 1,
        "title": source["name"], "doi": source["doi"], "authors": ["Elias Hartvigsson", "Erik Ahlgren"],
        "source_url": PAGE, "files_api_url": API, "paper_url": PAPER,
        "license": {**source["licence"], "interpretation": "Attribution and NonCommercial conditions apply. License scope for public/commercial deployment is unresolved; this audit is not legal advice.",
                    "raw_public_redistribution": False, "commercial_training_permission_established": False,
                    "attribution": "Hartvigsson, Elias; Ahlgren, Erik (2018), Data for: Comparison of load profiles in a mini-grid: assessment of performance metrics using measured and interview-based data, Mendeley Data, V1, doi:10.17632/bbtn9wxhzm.1; CC BY-NC 3.0. Numeric originals unchanged; descriptive statistics derived locally."},
        "archives": [{"name": item["filename"], "local_path": relative(RAW / item["filename"]), "download_url": item["content_details"]["download_url"],
                      "bytes": (RAW / item["filename"]).stat().st_size, "sha256": sha(RAW / item["filename"]), "publisher_hash_verified": True} for item in files],
        "readme": {"local_path": relative(readme), "sha256": sha(readme), "text": readme.read_text()},
        "provenance": {"country": "Tanzania", "site_count": 1, "metered_household_count": 1, "metered_SME_count": 3,
                       "metered_institution_count": 1, "site_total_series_count": 2,
                       "measurement_type": "single-phase TRMS clamp current", "meter": "Amprobe TRMS-16 Pro",
                       "paper_method_pages": [188, 189], "interview_individual_records_in_archive": False,
                       "source_metadata_snapshot": relative(RAW / "dataset-metadata.json"),
                       "source_metadata_url": "https://data.mendeley.com/public-api/datasets/bbtn9wxhzm/snapshot/1",
                       "download_tls": "ssl.create_default_context; certificate and hostname verification enabled"},
        "electrical_interpretation": {"units": "A per measured phase; not kW or kWh", "concurrent_voltage_measured_in_archive": False,
                                      "concurrent_power_factor_measured_in_archive": False,
                                      "paper_assumptions": {"nominal_voltage_V": 230, "power_factor": 0.85, "three_phase_balanced": True},
                                      "energy_conversion_allowed": False,
                                      "reason": "Paper assumptions converted interview appliance ratings to current; they are not concurrent measured voltage/PF for these current series. Phase scope differs by customer. No verified kWh target is supplied."},
        "row_count": sum(item["rows"] for item in series), "series_count": len(series), "series": series,
        "quality_issues": [
            "No original column headers or units per column; ordering is inferred and recorded explicitly.",
            "All purported averages equal (min+max)/2 within rounding; actual time-mean semantics require confirmation.",
            "No absolute dates or timezone; README omits Household weekday. Do not fabricate calendar dates.",
            "Repeated a/b files are the same entity/site, not independent sites.",
            "Some 5448-row spans imply 90.8h at one minute, exceeding the paper's stated 88h device duration. Retain original ranges and flag discrepancy.",
            "Do not identify all small current values as missing or outages; operating status is not labeled.",
            "Paper discusses a possible household fault spike; retain it and conduct sensitivity analysis before normal-load metrics.",
            "Site-total meter scope includes hospital, whereas paper comparison subtracts hospital; do not assume these raw files equal plotted totals.",
            "Short observations at one established hydro mini-grid do not establish seasonal, multi-site or new-site prediction accuracy.",
        ],
        "validation_design": {
            "current_model_kwh_validation": "not_supported",
            "allowed_now": ["descriptive current-A ranges", "normalized hourly current shape", "current load-factor diagnostics with average-column caveat"],
            "temporal_holdout": "Freeze hypotheses/shape recipe first; split whole days chronologically within entity, keep partial days out, fit scaling only on training days. Report tiny effective sample and same-site status.",
            "site_holdout": "Impossible with one site; do not claim unseen-site validation.",
            "entity_holdout": "Keep both a/b records of an entity together; never mix aggregate site target with component-meter training and claim independence.",
            "interview_baseline": "Paper Tables 1-3 supply aggregate appliance/usage summaries and household socioeconomic descriptors; archive contains no matched individual appliance inventory. A table-based historical baseline could be frozen before examining meter curves, but is not a matched survey-to-kWh validation sample.",
            "leakage_controls": ["Do not use current/energy targets or meter-derived shape parameters as input to held-out prediction.", "Do not tune appliance runtimes from held-out measured curves.", "Keep authors' reported measured-energy results out of predictive features."]},
    }
    AUDIT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    (RAW / "LICENSE-NOTICE.txt").write_text(
        result["license"]["attribution"] + "\n\nSource: " + PAGE +
        "\nLicense: " + source["licence"]["url"] + "\n" + source["licence"]["description"] +
        "\n\nLocal research/audit copy. No raw source assets are served publicly by this acquisition script. "
        "Commercial/public deployment clearance has not been established.\n", encoding="utf-8")
    print(json.dumps({"audit": str(AUDIT), "series": len(series), "rows": result["row_count"], "source_hash_verified": True}))


if __name__ == "__main__":
    main()
