import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_drc_benchmark import FEATURES, experiment, metrics, weighted_median


class DrcBenchmarkTests(unittest.TestCase):
    def test_weighted_baselines_and_metrics(self):
        y, w = np.array([0., 10.]), np.array([1., 3.])
        self.assertEqual(weighted_median(y, w), 10.)
        m = metrics(y, np.array([2., 6.]), w, "purchase")
        self.assertEqual(m["mae_kwh"], 3.5)
        self.assertEqual(m["bias_kwh"], -2.5)
        self.assertAlmostEqual(m["rmse_kwh"], np.sqrt(13))
        c = metrics(np.array([0., 1.]), np.array([0., 1.]), w, "uptake")
        self.assertEqual(c["brier"], 0)
        self.assertTrue(np.isfinite(c["log_loss"]))

    def test_area_holdout_and_conditional_target(self):
        rows = []
        for area in [1, 2, 3]:
            for i in range(24):
                rows.append({**{f: float(i % 3) for f in FEATURES["household"]},
                             "id": area * 100 + i, "area": area, "firm": 0,
                             "connected": float(i % 2), "kwh": float(area * 10) if i % 2 else np.nan,
                             "weights": 1., "attrition": float(i < 4)})
        frame = pd.DataFrame(rows)
        result = experiment(frame, "household", "purchase", "author_coded_primary")
        self.assertEqual(result["out_of_fold_rows"], 36)  # Missing unconnected kWh never becomes zero.
        for fold in result["folds"]:
            self.assertEqual(fold["train"]["rows"], 24)
            self.assertEqual(fold["test"]["rows"], 12)
            self.assertNotEqual(fold["train_membership_sha256"], fold["test_membership_sha256"])
        goma = result["folds"][0]["metrics"]
        self.assertEqual(goma["mean"]["bias_kwh"], 15.)  # Training areas 20/30; held-out target 10.
        changed = frame.copy()
        changed.loc[changed.area.eq(1) & changed.connected.eq(1), "kwh"] = 1000.
        modified = experiment(changed, "household", "purchase", "author_coded_primary")
        # Changing held-out outcomes cannot alter their predictions (constant target per area).
        self.assertAlmostEqual(modified["folds"][0]["metrics"]["forest"]["bias_kwh"] + 1000,
                               goma["forest"]["bias_kwh"] + 10.)
        sensitivity = experiment(frame, "household", "purchase", "exclude_attritors")
        self.assertEqual(sensitivity["out_of_fold_rows"], 30)


if __name__ == "__main__":
    unittest.main()
