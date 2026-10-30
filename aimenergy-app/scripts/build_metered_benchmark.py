"""Retrospective current-shape diagnostic; never trains the household model.

Uses every later complete civil day after one training day in BOTH site-total
files. Raw observations and curves stay local. Public output contains aggregate
diagnostics with CC BY-NC attribution; it is a noncommercial research exhibit.
"""
from __future__ import annotations
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROTOCOL = {
    "id": "tanzania-current-shape-v1",
    "status": "retrospective_diagnostic_not_blind_model_validation",
    "selection": "Both Minigrid1a and Minigrid1b; same site, same aggregate meter entity.",
    "split": "First complete midnight-to-midnight day trains; ALL subsequent complete days test. Partial days excluded.",
    "prediction": "Repeat first-day hourly current shares; compare fixed flat 1/24 shares. No tuning.",
    "target": "24 hourly shares of the reported current column, normalized separately within each evaluation day.",
    "metrics": "MAE and RMSE of shares, multiplied by 100 for percentage-point display. Lower is better.",
    "scope": "Timing shape only; no daily total, kWh, RAMP, household forest or unseen-site prediction is evaluated.",
}


def complete_days(rows: list[list[float]], start_clock: str) -> list[tuple[int, list[list[float]]]]:
    if any(len(r) != 4 or not all(math.isfinite(v) for v in r) for r in rows):
        raise ValueError("Expected four finite numeric columns")
    if any(r[0] != i for i, r in enumerate(rows)):
        raise ValueError("Expected contiguous elapsed-minute index starting at zero")
    hour, minute = map(int, start_clock.split(":"))
    if not 0 <= hour < 24 or not 0 <= minute < 60:
        raise ValueError("Invalid README clock")
    first = (1440 - hour * 60 - minute) % 1440
    return [(i, rows[i:i + 1440]) for i in range(first, len(rows) - 1439, 1440)]


def shares(block: list[list[float]]) -> list[float]:
    if len(block) != 1440:
        raise ValueError("A complete minute-resolution day is required")
    hourly = [sum(r[1] for r in block[h * 60:(h + 1) * 60]) for h in range(24)]
    total = sum(hourly)
    if total <= 0 or any(v < 0 for v in hourly):
        raise ValueError("Cannot normalize nonpositive or negative current")
    return [v / total for v in hourly]


def errors(prediction: list[float], observed: list[float]) -> dict:
    if len(prediction) != 24 or len(observed) != 24:
        raise ValueError("Expected 24 hourly shares")
    residuals = [p - y for p, y in zip(prediction, observed)]
    return {"mae_pp": sum(abs(e) for e in residuals) / 24 * 100,
            "rmse_pp": math.sqrt(sum(e * e for e in residuals) / 24) * 100}


def build() -> tuple[dict, dict]:
    audit_path = ROOT / "Data/metadata/tanzania-metered-audit.json"
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    selected = [s for s in audit["series"] if s["name"] in ("Minigrid1a", "Minigrid1b")]
    if len(selected) != 2 or len({s["site_id"] for s in selected}) != 1:
        raise ValueError("Require both records from the one source site")
    public_runs, private_runs = [], []
    for item in selected:
        path = ROOT / item["local_path"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
            raise ValueError("Source hash mismatch")
        rows = [list(map(float, line.split())) for line in path.read_text().splitlines() if line.strip()]
        days = complete_days(rows, item["start_clock_local_unspecified_timezone"])
        if len(days) < 2:
            raise ValueError("No complete later day to evaluate")
        train_start, train_rows = days[0]
        prediction = shares(train_rows)
        for ordinal, (test_start, test_rows) in enumerate(days[1:], 2):
            target = shares(test_rows)
            run = {"series": item["name"], "test_complete_day": ordinal,
                   "train_elapsed_minutes": [train_start, train_start + 1439],
                   "test_elapsed_minutes": [test_start, test_start + 1439],
                   "repeat_first_day": errors(prediction, target),
                   "flat": errors([1 / 24] * 24, target)}
            public_runs.append(run)
            private_runs.append({**run, "train_shares": prediction, "test_shares": target})
    public = {"schema_version": 1, "protocol": PROTOCOL,
              "dataset": {"title": audit["title"], "doi": audit["doi"], "url": audit["source_url"],
                          "paper_url": audit["paper_url"], "rows": audit["row_count"],
                          "series": audit["series_count"], "sites": 1, "units": "current A, single measured phase",
                          "archive_sha256": audit["archives"][0]["sha256"],
                          "license": "CC BY-NC 3.0", "attribution": audit["license"]["attribution"]},
              "evaluation": {"training_days": 2, "test_days": len(public_runs),
                             "hourly_bins": 24 * len(public_runs), "independent_sites": 1,
                             "runs": public_runs},
              "limitations": [
                  "Retrospective recipe; not a preregistered or untouched final model test.",
                  "Repeated recordings belong to ONE site; hourly bins are correlated, not independent samples.",
                  "Source columns lack headers. The reported average equals the min/max midpoint within rounding; true time-average semantics remain uncertain.",
                  "README clock and paper's one-minute interval determine day boundaries. Absolute dates/timezone are unknown.",
                  "No concurrent measured voltage or power factor: no conversion to kWh is made.",
                  "No automatic implication for Lamwo, cold-start demand, growth, RAMP shapes or survey-model accuracy.",
                  "Noncommercial research demonstration; no commercial data-training permission established.",
              ]}
    private = {**public, "evaluation": {**public["evaluation"], "runs": private_runs}}
    return public, private


def main() -> None:
    public, private = build()
    destinations = [(ROOT / "dist/data/metered-evidence.json", public),
                    (ROOT / "Data/processed/metered/current-shape-benchmark.json", private),
                    (ROOT / "Data/metadata/metered-benchmark-protocol.json", PROTOCOL)]
    for path, value in destinations:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps(public["evaluation"], indent=2))


if __name__ == "__main__":
    main()
