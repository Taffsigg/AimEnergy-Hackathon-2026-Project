# AimEnergy: operator pilot and unseen-site evaluation

Status: proposed, not an executed partnership or completed field study. Freeze a signed-off copy before fitting any operator-data model. Public Tanzania observations support a separate retrospective current-shape diagnostic only.

## Decision and target

The pilot asks whether a developer can make a better preconstruction customer-energy estimate using information available before connection. Its primary target is aggregate customer-consumption kWh per site per calendar month. Generation, billed amounts, purchased credit and current A are different measurements and must not be silently substituted.

Record the first service date and target month. Observe 12–24 months where possible to test growth; a short monitoring campaign cannot establish a two-year trajectory. Separate delivered energy under limited supply from unconstrained demand. Do not estimate missing demand from outages without a separately evaluated method.

## Minimum aggregate export

Use the blank header-only template in `Data/templates/site_month.csv`. One row is a pseudonymous site and calendar month. The accompanying dictionary defines units, timing and exclusions. No personal, customer or household meter IDs are requested. Empty means unknown; zero means a verified zero. The operator approves disclosure and aggregation risk, especially at very small sites.

Preconnection features need observation dates and availability flags. Population estimates and enterprise inventories collected after energization cannot quietly become cold-start predictors. Actual active connections are useful evaluation denominators and operating context; future active connections are not preconstruction inputs.

## Freeze before evaluation

1. Operator and evaluator agree sites, target definitions, exclusions and required observation windows. Set a minimum useful data volume after reviewing the inventory; do not treat three sites as a reliable population-wide estimate.
2. Keep whole sites together. Partition fitting, interval calibration and untouched evaluation by site, with a manifest and hashes. If there are too few independent sites, report descriptive results or exploratory leave-one-site-out comparisons instead of a definitive holdout claim.
3. Keep later periods separate for the growth task. Do not use later customer counts, payments, meter-derived profile parameters or test outcomes as cold-start predictors.
4. Freeze three comparators: an agreed per-household baseline, the transparent AimEnergy scenario and any learned extension. Freeze missing-value handling, transformations and horizon definitions using training data only.
5. Agree acceptance thresholds with the operator and intended decision maker **before** seeing final results. Record acceptable energy error, signed bias, interval coverage/width, failure rates and assessment time. No threshold has been accepted yet.

## Evaluation ledger

Report site count, countries, measured months, missingness, supply availability and results for every evaluation site, including low-demand and difficult sites. Primary metrics: MAE in kWh/site/month, signed prediction-minus-observation bias, and WAPE = sum absolute errors / sum measured kWh, with zero-denominator cases reported separately. Average site-level metrics as well as pooled totals so one large site cannot hide failures.

For growth, report declared horizon errors (for example months 3, 6, 12 and 24 when observed) without replacing missing horizons with simulated labels. For intervals, use separate calibration sites; report empirical coverage and width on untouched sites. Assessments must distinguish hypothetical, reported, counted and metered evidence. Evaluate country and customer-mix transfer explicitly.

## Mutual value and delivery

The operator contributes approved aggregates and measurement definitions; AimEnergy returns a private site-level error ledger, baseline comparison, data-quality findings and a prioritized list of inputs worth verifying. Start with a small private analysis, then decide whether a monitored workflow pilot is justified. A data-sharing agreement defines purpose, access, storage, retention, deletion and publication review. No automatic data upload is built into the app.
