# AimEnergy household survey-proxy model

## Intended use

An exploratory household electricity-use scenario aid and reproducible hackathon demonstration. A fitted model predicts monthly electricity expenditure proxies from seven auditable household features. It can help frame local survey collection and compare explicit household scenarios. It is not validated to size a Lamwo mini-grid, forecast a metered village load, approve financing, or determine tariff affordability.

## Data and target

The supplied `analysis_clean_noMI.dta` contains 28,625 repeated analysis rows representing 445 unique Uganda National Household Survey 2019/2020 households. Household-level stability, including missingness, is checked before deduplication. There are 91 rural and 354 urban households across 57 districts, with **zero Lamwo observations**. This is a selected sample with reported electricity expenditure, not a representative sample of unelectrified Lamwo households.

The target `kwh_m` is an expenditure-derived proxy: `elec_cost_ugx × 30 ÷ elec_days ÷ 250`, assuming a constant 250 UGX/kWh tariff. The formula agrees for all 28,561 source rows where the last-payment fields permit a finite calculation; 64 repeated rows are uncheckable. The training target is stable within every household. It is not a meter reading, and the interval does not account for tariff or self-report uncertainty.

Predictors are sleeping rooms (`h9q03`), roof (`h9q04`), external wall (`h9q05`), floor (`h9q06`), rural/urban (`urban`), region (`region`) and usual daily power availability (`s10q02`). Categorical labels come from Stata metadata; category vocabularies, numeric medians, categorical modes and training ranges are fitted on training households only. All seven fields are constant within every household. `hhsize` varies within 421 households and is excluded. Household IDs, district, cost, tariff, payment, target-derived variables and unstable record-level variables are excluded from model inputs.

Power availability records usual observed supply. Entering planned supply hours into the browser is an unvalidated prospective transfer assumption. The source sample has very few non-iron roofs; some category scenarios have weak support. Numeric extrapolation and unknown categories are flagged. Unknown categories use the training mode; missing/nonfinite inputs use training-only defaults. Those flags do not constitute a formal geographic out-of-distribution detector.

## Fitting and locked evaluation

Seed: `20261030`. Sorted unique household IDs are randomly split 60/20/20, stratified by rural/urban: 267 training, 89 calibration and 89 test households. Source repeats cannot cross splits. Local split CSVs and SHA-256 checksums make membership auditable without publishing household records.

A 64-tree random forest uses depth 4, at least 12 training observations per leaf and a `log1p` target. Each tree's output is averaged in log space and transformed with `expm1`. Categorical variables are one-hot encoded. Training is unweighted; weighted metrics use one cross-sectional survey weight per household. These weights do not turn this selected sample into a Lamwo population estimate.

Five-fold rural/urban-stratified cross-validation uses only the training partition, refitting preprocessing separately in each fold. It compares the forest against a training median baseline using mean fold unweighted MAE. The forest wins at 29.38 versus 33.30 kWh/household/month. The final forest is then fitted once on the 267 training households and frozen before calibration. Calibration and test households are excluded from preprocessing fits, model selection and model fitting. No hyperparameter search or tuning against test results is performed.

| Untouched test metric, 89 households | Forest | Median baseline |
| --- | ---: | ---: |
| MAE (primary), kWh/month | 44.14 | 49.09 |
| RMSE, kWh/month | 72.09 | 79.79 |
| Survey-weighted MAE, kWh/month | 45.91 | 51.28 |
| Survey-weighted RMSE, kWh/month | 83.60 | 89.67 |
| WAPE | 47.47% | 52.78% |
| Mean prediction minus observation, kWh/month | -28.96 | -33.00 |

The forest reduces this test sample's MAE by about 10.1%, but underpredicts larger values. The rural test subgroup has only 18 households: MAE 31.05 and weighted MAE 28.62 kWh/month, descriptive only. The sample is too small for dependable subgroup or geographic performance claims. Test errors are higher than training cross-validation errors; retain the test results when presenting the model.

## Intervals and explanations

Split conformal calibration uses absolute residuals from the separate 89-household calibration set. For nominal 90% coverage, the finite-sample quantile is the 81st sorted residual, `ceil((89+1)×0.9)`, equal to 91.46 kWh/month. Lower bounds are clipped to zero. Untouched test coverage is **86.52% (77/89)** with mean width **154.48 kWh/month**. The nominal level is not an observed 90% success rate. The finite-sample statement depends on exchangeable household observations from the same survey domain; it offers no Lamwo, temporal, geographic, individual subgroup, village-sum or tariff-uncertainty guarantee. Summing household bounds does not create a calibrated village interval.

Driver bars show global impurity-based forest feature importance aggregated over one-hot columns. They are not local explanations, causal effects, confidence values or evidence that changing a building material changes demand. Correlated predictors and category prevalence can affect importance. The public calibration chart contains five aggregate bins of 17–18 test households each, not individual household points.

## Village context clustering

A separate four-cluster KMeans model fits all 411 Lamwo villages using standardized `log1p` population, buildings, education/health/social facility counts and road fields. Missing values use corpus medians; source zeros remain observations. NDVI, wind and solar zeros are not treated as meaningful demand signals. It uses 20 deterministic initializations with the same seed. Cluster IDs are ordered by median source population and labels describe relative context only. This is unsupervised discovery with no training/test accuracy, demand, economic-potential or eligibility claim. Raster-derived fractional population estimates are not household counts.

## Artifacts, privacy and reproduction

`python scripts/train_model.py` recreates `Data`, `Models`, portable browser artifacts and aggregate evaluation. `Models/requirements-training.txt` records exact library versions used. No notebook or pickle from the reference repository is executed or loaded. Public runtime is dependency-free JavaScript over JSON tree arrays; synthetic fixtures verify Python/scikit-learn parity to 1e-8. Out-of-range inputs receive flags and physically impossible numeric inputs are clipped.

`Data/raw/survey`, `Data/processed/households.csv` and `Data/splits` are private local files. They must be excluded from public hosting, Docker build contexts and handover bundles intended for publication. Only compact app assets, fitted tree aggregates, aggregate test metrics and explicitly synthetic fixtures appear in `dist/data`. Raw survey redistribution rights have not been verified. Source/split/artifact hashes, stability audits, feature labels and dependency versions are saved for reproducibility.

## Path to field deployment

Before operational use, collect consented Lamwo household and productive-use surveys paired with meter readings, time stamps, connection histories and verified tariffs. Obtain repeated intervals across seasons and sites, validate geographic joins, then retrain against the actual operational target. Use site-level and time-based holdouts, compare against measured baselines, evaluate rural/group performance, monitor prediction/coverage drift and test engineering sizing decisions independently. The present model is a working software and survey-proxy baseline for that process, not evidence that the required local validation has already happened.
