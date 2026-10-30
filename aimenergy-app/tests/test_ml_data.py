"""Audit private split boundaries and exported train-only preprocessing.

Run locally after training: python -m unittest discover -s tests -p test_ml_data.py
These tests intentionally require local private Data files, never browser assets.
"""
import hashlib
import json
import math
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

APP = Path(__file__).resolve().parents[1]


class ModelDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = json.loads((APP / "dist/data/ml-model.json").read_text(encoding="utf-8"))
        cls.splits = {name: pd.read_csv(APP / f"Data/splits/{name}.csv", dtype={"hhid": str})
                      for name in ["train", "calibration", "test"]}

    def test_unique_households_are_disjoint_and_complete(self):
        ids = {name: set(frame.hhid) for name, frame in self.splits.items()}
        for name, frame in self.splits.items():
            self.assertEqual(len(frame), len(ids[name]))
        self.assertFalse(ids["train"] & ids["calibration"])
        self.assertFalse(ids["train"] & ids["test"])
        self.assertFalse(ids["calibration"] & ids["test"])
        self.assertEqual(len(set.union(*ids.values())), 445)

    def test_preprocessing_values_are_fitted_on_training_only(self):
        train = self.splits["train"]
        for feature in self.model["feature_schema"]:
            values = train[feature["name"]]
            default = values.mode().iloc[0] if feature["type"] == "categorical" else values.median()
            self.assertEqual(feature["default"], default)
            self.assertEqual(feature["min"], values.min())
            self.assertEqual(feature["max"], values.max())
            if feature["type"] == "categorical":
                self.assertEqual({option["value"] for option in feature["options"]}, set(values.unique()))

    def test_calibration_quantile_recomputes_from_separate_private_split(self):
        frame = self.splits["calibration"]
        errors = []
        for row in frame.to_dict(orient="records"):
            vector = [np.float32(row[f["feature"]] if "category" not in f else row[f["feature"]] == f["category"])
                      for f in self.model["encoded_features"]]
            outputs = []
            for tree in self.model["model"]["trees"]:
                node = 0
                while tree["left"][node] != -1:
                    node = tree["left"][node] if vector[tree["feature"][node]] <= tree["threshold"][node] else tree["right"][node]
                outputs.append(tree["value"][node])
            prediction = math.expm1(sum(outputs) / len(outputs)) if self.model["model"]["kind"] == "random_forest" else self.model["model"]["baseline"]
            errors.append(abs(row["kwh_m"] - prediction))
        rank = math.ceil((len(errors) + 1) * .9)
        self.assertEqual(rank, self.model["calibration"]["rank"])
        self.assertAlmostEqual(sorted(errors)[rank - 1], self.model["calibration"]["q"], places=8)

    def test_training_script_and_public_artifact_checksums_are_current(self):
        provenance = json.loads((APP / "Models/training-provenance.json").read_text())
        for key, path in [("script_sha256", APP / "scripts/train_model.py"), ("artifact_sha256", APP / "dist/data/ml-model.json")]:
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), provenance[key])


if __name__ == "__main__":
    unittest.main()
