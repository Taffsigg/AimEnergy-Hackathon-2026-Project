# Reproducible model artifacts

`household-proxy-forest.json` is a portable fitted 64-tree random forest with train-only one-hot vocabularies/defaults, training-only model selection, a training median fallback, calibration residual quantile and synthetic Python/JavaScript parity examples. `evaluation.json` includes untouched test metrics for both models. The selected model is chosen only through training cross-validation; the forest remains available for audit if the baseline wins.

`training-provenance.json` records the source, training-script and artifact SHA-256 hashes, dependency versions and fit/metric weighting choices. The household source and split-file hashes are under `Data/metadata`.

`site-clusters.json` contains a separately fitted KMeans model for 411 village contexts, with log1p transform, standardization, medians, centers, memberships and descriptive cluster summaries. This is unsupervised discovery, with no demand labels or predictive accuracy claim.

Training requires Python, NumPy, pandas, SciPy and scikit-learn. Install pinned versions into an isolated virtual environment if needed; the runtime app needs only Node.js and the exported JSON. No pickle is loaded or required. See `docs/MODEL_CARD.md` for intended use and limitations.
