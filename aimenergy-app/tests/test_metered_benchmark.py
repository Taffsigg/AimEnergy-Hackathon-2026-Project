import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("benchmark", ROOT / "scripts/build_metered_benchmark.py")
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


class MeteredDiagnostic(unittest.TestCase):
    def test_midnight_alignment_and_partial_days(self):
        rows = [[float(i), 1., 0., 2.] for i in range(4000)]
        days = benchmark.complete_days(rows, "11:25")
        self.assertEqual([i for i, _ in days], [755, 2195])
        self.assertEqual(days[0][1][-1][0], 2194)
        self.assertEqual(benchmark.complete_days(rows[:1000], "11:25"), [])
        self.assertEqual(benchmark.complete_days(rows[:1440], "00:00")[0][0], 0)
        rows[10][0] = 11
        with self.assertRaises(ValueError):
            benchmark.complete_days(rows, "11:25")

    def test_units_and_normalization(self):
        uniform = [[float(i), 2., 1., 3.] for i in range(1440)]
        shares = benchmark.shares(uniform)
        self.assertAlmostEqual(sum(shares), 1)
        self.assertAlmostEqual(benchmark.errors(shares, [1/24] * 24)["mae_pp"], 0)
        concentrated = [1.] + [0.] * 23
        self.assertAlmostEqual(benchmark.errors([1/24] * 24, concentrated)["mae_pp"], 100 * 23/288)
        with self.assertRaises(ValueError):
            benchmark.shares([[float(i), 0., 0., 0.] for i in range(1440)])

    def test_saved_evidence_reproduces_all_later_days(self):
        public, private = benchmark.build()
        stored = json.loads((ROOT / "dist/data/metered-evidence.json").read_text())
        self.assertEqual(public, stored)
        evaluation = public["evaluation"]
        self.assertEqual(evaluation["independent_sites"], 1)
        self.assertEqual(evaluation["test_days"], 4)
        self.assertEqual([(r["series"], r["test_complete_day"]) for r in evaluation["runs"]],
                         [("Minigrid1a", 2), ("Minigrid1a", 3), ("Minigrid1b", 2), ("Minigrid1b", 3)])
        for run in private["evaluation"]["runs"]:
            self.assertLess(run["train_elapsed_minutes"][1], run["test_elapsed_minutes"][0])
            self.assertAlmostEqual(sum(run["train_shares"]), 1)
            self.assertAlmostEqual(sum(run["test_shares"]), 1)
        self.assertNotIn("train_shares", str(public))
        worse = evaluation["runs"][2]
        self.assertGreater(worse["repeat_first_day"]["rmse_pp"], worse["flat"]["rmse_pp"])


if __name__ == "__main__":
    unittest.main()
