"""Generate cached hourly *shape* templates using the real RAMP package.

Install rampdemand==0.5.0 in an isolated environment, then run this script.
No pickle/model loading, network access, or site calibration is involved.
"""
from __future__ import annotations

import argparse
import contextlib
from datetime import date, timedelta
import hashlib
import importlib.metadata
import io
import json
from pathlib import Path
import random
import sys


def appliance(name, watts, minutes, windows, number=1, cycle=10, variability=0.15):
    return {"name": name, "powerW": watts, "number": number,
            "dailyOnMinutes": minutes, "windowsMinutes": windows,
            "minimumOnMinutes": cycle, "durationVariability": variability,
            "windowVariability": 0.05}


# Illustrative appliance assumptions, not measurements of any settlement.
# Compressor appliances use stochastic equivalent on-time; no thermal model.
ASSUMPTIONS = {
    "household": [
        appliance("LED lights", 7, 180, [[300, 420], [1080, 1380]], 4, 20),
        appliance("Television", 40, 120, [[1080, 1380]], cycle=30),
        appliance("Phone charging", 5, 120, [[360, 480], [1020, 1380]], 2, 30),
        appliance("Radio", 10, 90, [[360, 540], [1020, 1320]], cycle=15),
    ],
    "mill": [
        appliance("Grain mill motor", 7500, 180, [[480, 720], [780, 1020]], cycle=20),
        appliance("Task lights", 20, 120, [[420, 600], [960, 1140]], 4, 20),
    ],
    "refrigeration": [
        appliance("Refrigerator compressors, equivalent on-time", 150, 600, [[0, 1440]], 2, 15),
        appliance("Shop lights", 9, 240, [[960, 1320]], 2, 30),
    ],
    "salon": [
        appliance("Hair clippers", 15, 180, [[480, 1080]], cycle=10),
        appliance("Fan", 45, 300, [[480, 1080]], cycle=30),
        appliance("LED lights", 10, 360, [[480, 1140]], 3, 30),
        appliance("Hair dryer", 1000, 60, [[540, 1080]], cycle=5),
    ],
    "welding": [
        appliance("Welder, effective arc-on power", 3000, 120, [[480, 720], [780, 1020]], cycle=5),
        appliance("Angle grinder", 900, 90, [[480, 720], [780, 1020]], cycle=5),
        appliance("Task lights", 20, 360, [[480, 1080]], 2, 30),
    ],
    "school": [
        appliance("Classroom LED lights", 10, 240, [[420, 1020]], 12, 30),
        appliance("Laptops", 35, 180, [[480, 960]], 4, 30),
        appliance("Printer", 50, 30, [[480, 960]], cycle=5),
    ],
    "clinic": [
        appliance("Medical fridge compressor, equivalent on-time", 100, 600, [[0, 1440]], cycle=15),
        appliance("LED lights", 10, 360, [[360, 1320]], 8, 30),
        appliance("Diagnostic equipment", 100, 120, [[480, 1080]], cycle=10),
        appliance("Computer", 45, 360, [[480, 1080]], cycle=30),
    ],
}


def generate(runs, seed):
    import numpy as np
    from ramp import User, UseCase

    profiles = {}
    for index, (category, assumptions) in enumerate(ASSUMPTIONS.items()):
        category_seed = seed + index
        random.seed(category_seed)
        np.random.seed(category_seed)
        user = User(user_name=category, num_users=1)
        for item in assumptions:
            kwargs = dict(name=item["name"], number=item["number"], power=item["powerW"],
                          func_time=item["dailyOnMinutes"], num_windows=len(item["windowsMinutes"]),
                          func_cycle=item["minimumOnMinutes"],
                          time_fraction_random_variability=item["durationVariability"],
                          random_var_w=item["windowVariability"], wd_we_type=2)
            kwargs.update({f"window_{i+1}": window for i, window in enumerate(item["windowsMinutes"])})
            user.add_appliance(**kwargs)
        # Real RAMP at one-minute resolution, then aggregate 60 minutes per hour.
        with contextlib.redirect_stdout(io.StringIO()):
            last_day = (date(2026, 1, 1) + timedelta(days=runs - 1)).isoformat()
            use_case = UseCase(users=[user], date_start="2026-01-01", date_end=last_day)
            samples = np.asarray(use_case.generate_daily_load_profiles(), dtype=float)
        samples = samples.reshape(runs, 24, 60)
        if not np.isfinite(samples).all() or np.any(samples < 0):
            raise ValueError(f"Invalid RAMP output: {category}")
        # Convert W-minutes to Wh; average daily hourly energy before normalizing.
        hourly_wh = samples.sum(axis=2).mean(axis=0) / 60
        total_wh = float(hourly_wh.sum())
        if total_wh <= 0:
            raise ValueError(f"Empty RAMP output: {category}")
        shares = [round(float(value / total_wh), 12) for value in hourly_wh]
        shares[max(range(24), key=shares.__getitem__)] += 1.0 - sum(shares)
        profiles[category] = {"hourlyShares": shares, "seed": category_seed,
                              "appliances": assumptions}
    versions = {package: importlib.metadata.version(package)
                for package in ("rampdemand", "numpy", "pandas")}
    return {"schemaVersion": 1,
            "provenance": {
                "engine": "RAMP", "package": "rampdemand", "version": versions["rampdemand"],
                "dependencyVersions": versions, "seed": seed, "runs": runs,
                "pythonVersion": sys.version.split()[0],
                "resolutionMinutes": 1, "hourConvention": "local clock hour 00:00-23:00; no timezone or DST model",
                "aggregation": "mean hourly Wh over simulated days, normalized to sum 1",
                "purpose": "illustrative active-day shape only; monthly kWh is supplied separately by the AimEnergy scenario engine",
                "calibrated": False,
                "source": "https://github.com/RAMP-project/RAMP",
                "documentation": "https://rampdemand.readthedocs.io/",
                "generatorSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            }, "profiles": profiles}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=int, default=30)
    parser.add_argument("--seed", type=int, default=20261030)
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).resolve().parents[1] / "dist/data/ramp-profiles.json")
    args = parser.parse_args()
    if args.runs < 30:
        parser.error("At least 30 daily runs are required for the cached mean template")
    document = generate(args.runs, args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(document['profiles'])} RAMP profiles from {args.runs} days each: {args.output}")


if __name__ == "__main__":
    main()
