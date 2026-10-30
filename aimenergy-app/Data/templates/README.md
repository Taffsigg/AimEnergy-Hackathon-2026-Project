# Operator aggregate template

`site_month.csv` is intentionally empty apart from its header. It contains no fabricated pilot records. One row represents a pseudonymous site in one calendar month. This is a proposed exchange schema, not an implemented ingestion API.

| Field | Meaning |
|---|---|
| site_id | Stable operator-approved pseudonym; never customer/meter ID |
| country / region | Country and approved coarse region; avoid household coordinates |
| first_service_date | Actual energization date, ISO YYYY-MM-DD; unknown stays blank |
| month | Measured calendar month, YYYY-MM |
| measurement_definition | Explicit customer-meter delivered consumption boundary and aggregation; generation and billing/payment proxies are not equivalent |
| customer_consumption_kwh | Measured aggregate customer energy, kWh for that month; nonnegative; missing stays blank |
| available_supply_hours | Verified supply availability hours within that month and boundary; unknown stays blank |
| expected_supply_hours | Hours in the measurement window; record partial windows in quality_flags |
| active_*_connections | Actual active household/business/service customer counts during the target period, with convention documented; evaluation context, not future cold-start predictors |
| preconnection_population | Estimate available before first_service_date, people; report method/source in separate operator-approved metadata |
| preconnection_population_observed_date | ISO date when the source feature was observed; unknown is not assumed preconnection |
| preconnection_household_estimate | Estimated households available before connection; distinct from structures and actual later customers |
| preconnection_business_count | Dated business inventory available before connection; distinguish connected and unconnected enterprises in metadata |
| preconnection_features_observed_date | Observation date for household/business estimates; use additional dated fields if methods differ |
| preconnection_features_available | true / false; true requires documented availability before connection, not just a retrospective date |
| tariff_currency / tariff_per_kwh | Applicable energy tariff with currency and conventions; tariff changes, fixed fees and taxes go in metadata; never convert payments to measured kWh |
| quality_flags | Missing intervals, partial months, supply constraints, meter changes, aggregation anomalies, disclosure suppression; semicolon separated |

Keep raw records private. Operator/evaluator agree aggregation, access, retention and publication rights before transfer. See `docs/PILOT_PROTOCOL.md` and `docs/OPERATOR_DATA_SHARING.md`.
