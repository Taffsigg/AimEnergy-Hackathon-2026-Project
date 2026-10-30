# AimEnergy: initial folder analysis

Date: 30 October 2026. Working directory: C:/Users/Dell/Downloads/AimEnergy/AimEnergy Project.

## Assessment

AimEnergy has useful Uganda research and geospatial inputs, but no AimEnergy application or verified preconstruction demand model yet. The project directory was empty when reviewed. The best starting point is a transparent site-demand estimator with explicit assumptions, followed by calibration against actual mini-grid meter data. The main dependency is reliable demand evidence, rather than map presentation.

This review started with the hackathon brief and schedule, inventoried 285 source files, profiled the four processed Lamwo CSVs and the Stata survey, read the reference documentation and app entry points, and reviewed the supplied research PDFs. Notebook implementations could not be reviewed because their contents are missing Git LFS objects. No application was built, model trained, notebook executed, or serialized model loaded. Original inputs were left unchanged.

## What the hackathon requires

Source: ../Hackathone Files/GEH_Brief_03_Predict_mini_grid_demand_before_building.pdf, pages 2–4.

- A location-based demand estimate with an uncertainty range and understandable drivers.
- Growth during the first years after connection, including productive-use businesses.
- Validation on held-out metered sites.
- Operation on a laptop or free cloud tier, with public inputs for inference.
- A proposal for safe sharing of operator meter data.
- A working prototype/model, a three-minute pitch and a one-page impact estimate.

Judging weights: impact 25%, innovation 25%, sustainability 25%, feasibility 15%, scalability 10%. Metered validation and growth deserve early attention because they directly support the brief's core requirements.

The supplied schedule labels the sprint as 30 October–1 November 2026, with submissions at 12pm EST on 1 November. It separately mentions a 3–5 minute prototype demo video. Keep the brief's three-minute pitch requirement distinct from that demo; confirm the submission portal's exact time-zone interpretation and upload requirements before submitting.

## Source inventory and intended use

| Material | Observed contents | Value for AimEnergy | Limit |
|---|---|---|---|
| Hackathone Files | Four-page challenge brief and one-page schedule | Requirements and delivery scope | Not training data |
| AimEnergy Project | Empty at review start | Workspace for AimEnergy | No existing implementation |
| Lamwo reference repository | Geospatial layers, processed tables, model files, notebook pointers and old visualization code | Site features, geographic demonstration and planning context | Different prediction targets; notebook code missing |
| Household electricity demand in Uganda | Stata data and four-page saved Mendeley description | Survey-derived household demand evidence | Repeated households, inconsistent fields, assumed-tariff target |
| Load profile analysis and forecasting for rural mini-grids in Uganda.pdf | Nine-page 2026 paper on Buzaami and Ssenyondo operating sites | Load shapes and operational forecasting context | Underlying time series not found in supplied files |
| Uganda_Case_Study.pdf | Six-page extract from a 2020 market report | Historical business context | Its market, policy and tariff statements are historical |

## Verified data findings

### Lamwo features are useful; demand labels are absent

The processed folder contains:

| File | Rows | Columns | Role |
|---|---:|---:|---|
| village_data.csv | 411 | 27 | Village feature table; 411 unique village IDs |
| existing_mg_trainingdata.csv | 25 | 38 | Existing-site features with ratings and winch_prob |
| existing_mg_villages.csv | 25 | 11 | Existing-site metadata and ratings |
| candidate_mg_testdata.csv | 39 | 19 | Candidate features, without measured demand outcomes |

None of these four tables contains a metered kWh demand outcome. Capacity is not consumed energy, and winch_prob is not a kWh measurement. The 39 candidate rows are therefore inference inputs, not a labelled demand test set. A 25-record site table is also too small to support strong generalization claims without careful validation.

Potential raster-coverage problems need investigation: 366/411 villages have zero mean_ndvi, 366 have zero mean_wind_speed, and 32 have zero mean_pvout_solar_radiation. There are also 21 zero building counts and 18 zero population values. These are observed zeros, not proof that data is missing. Check raster coverage, nodata handling, coordinate systems and feature extraction before interpreting them as physical measurements. protected_area_name is empty for 333 villages; this may be expected for villages outside protected areas.

### The household dataset has 445 independent household IDs

The Stata file contains 28,625 rows and 255 columns, but only 445 unique hhid values. Each household appears 64–71 times. Repeated rows appear to represent multiple records per household; their exact construction needs tracing to the source workflow.

- kwh_m, electricity payment, payment days, survey weight, district and urban code are constant within each household.
- hhsize varies within 421 of the 445 households. Taking an arbitrary first row would preserve an unresolved demographic error.
- The description identifies Uganda National Household Survey 2019/2020 as the original source. A 2026 dataset publication does not make its observations contemporary.
- The description explicitly characterizes the data as survey evidence rather than engineering meter data.
- Its target is calculated as kWh/month = payment_UGX × 30 / days_covered / 250. Every one of the 28,561 rows where that formula can be evaluated matches kwh_m within numerical tolerance. elec_price has one value: 250.

Consequences: split by household rather than row; audit the merge/reshape and rebuild household-level features; use survey weights for population inference; exclude payment-derived variables from predictors of the derived kWh target. A random row split can put the same household and identical target into both training and testing. Predictions from this sample remain survey-proxy estimates and do not satisfy held-out metered-site validation.

The survey and Lamwo table also operate at different geographic levels. No shared village-level join key was established in this review. Do not silently attach household observations to specific Lamwo villages.

## Reference code and model limitations

All 16 local .ipynb files are three-line Git LFS pointers, not executable notebooks. Their listed file sizes are approximately 129–133 bytes. The original LFS content must be retrieved before code, training splits or model results can be audited. The actual notebook training behavior remains unverified.

The available documentation describes different tasks:

- mgperf: a site-performance probability or score, with a documented leave-one-out comparison.
- PUE_score: a productive-use ranking proxy. Its training document includes hypothetical features and does not establish an observed consumption target.
- electrification_strategy and minigrid classifiers: technology/suitability labels.
- Building-growth notebooks: potential contextual inputs, with actual code unavailable.

These tasks can inform site selection, but none establishes a validated monthly energy forecast or demand-growth interval.

The webapp README explicitly marks the visualization app deprecated. Its manifest specifies Next 10, React 17, node-sass 5 and Node >=14.2.0 <16. Its Lamwo API reads a local villages.json file and filters it; the inspected route does not perform demand inference. The map references local geographic layers and Mapbox. Use this app as a reference rather than assuming it is a ready AimEnergy frontend. This was a static inspection; no build or runtime compatibility check was performed. The repository includes a GNU GPL version 3 license file; preserve source attribution and review applicable reuse terms before distributing adapted code. Dataset permissions require their own provenance review.

## What the papers contribute

The 2026 forecasting paper uses operational histories from already electrified sites. It can inform daily profile design and potential partner-data questions. Its reported forecasting accuracy does not demonstrate transfer to an unelectrified location. In particular, a history-dependent LSTM does not solve the absence of preconnection meter history by itself. No associated raw operational time-series file was found in this folder.

The paper's hybrid equations use contemporaneous prediction error as a fuzzy-system input (PDF page 4, equations 8–10). Before reusing this approach, establish what information is available at forecast time; using the future actual load would invalidate a deployable forecast. This is a methodological question raised by the paper, not an audited failure in executable code.

The 2020 case study is useful historical context. Do not present its installed-site counts, policies, institutions or tariff statements as current facts without a separate current-source check.

## Recommended prototype scope

Start with a Uganda/Lamwo demonstration and make its coverage explicit. The brief ultimately asks for arbitrary locations and cross-country scalability; the supplied data alone does not establish either. Outside supported coverage, request manual site inputs and clearly label the estimate's evidence level.

A developer selects a site or enters household/building counts, likely connections, businesses and public services. AimEnergy returns monthly and daily energy, household/business/service contributions, an illustrative daily load profile, a 24-month growth scenario, and the assumptions that change the result most. Distinguish kWh energy from kW peak power; deriving a peak requires a load-shape and coincidence assumption.

Use a transparent initial calculation:

site_energy(t) = connected_households(t) × household_energy(t) + business_energy(t) + service_energy(t)

Connection uptake, appliance adoption, productive-use equipment and seasonal activity should be separate adjustable drivers. Anchor household consumption in the audited survey where appropriate. Treat business loads, connection rates and growth as explicit assumptions until observations support them. Do not infer household counts directly from buildings without a documented conversion.

Before metered calibration, present low/base/high outputs as scenario ranges. Do not label them calibrated confidence or prediction intervals. Once metered data is available, compare a simple baseline with a compact tabular model, hold out entire sites, and measure error, bias, interval coverage and interval width. For growth forecasts, also separate future periods from training periods. Avoid selecting a complex model before the effective sample size and target quality are known.

## Work in priority order

1. Audit household joins and repair household size; define one record per household and a documented target. Establish units, survey weights and feature provenance.
2. Obtain partner site-level consumption, connection dates, customer counts, outages and business mix. Keep evaluation sites isolated from fitting and tuning. If unavailable, explicitly report the metered-validation requirement as unmet.
3. Build the transparent household + business + service baseline and growth scenarios. Show sensitivity to tariffs, connection uptake and productive use.
4. Add a small local interface with site selection, manual overrides, explanations and an exportable assumptions report. Defer a broad map platform or heavy model training until the demand calculation is credible.
5. Prepare the prototype demo, three-minute pitch and one-page impact estimate. Describe avoided oversizing as a hypothesis or evaluated scenario until actual comparisons support an impact claim.

For the meter-sharing proposal, start with operator-approved site/month aggregates, pseudonymous site IDs, coarse location where needed, no household identifiers, agreed access/retention limits, and a shared unit/quality schema. This is a proposal, not an implemented sharing system.

## Evidence and remaining uncertainty

The companion dataset_audit.json records the observed counts. Relevant local sources are the hackathon brief pages 2–4; the saved Mendeley description pages 1–3; the processed CSVs; webapp/README.md and package.json; and the notebook README/docs files under the Lamwo reference repository. The reference-model review used documentation only because the notebook bodies are absent.

This analysis establishes data readiness and a build direction. It does not establish forecast accuracy, calibrated uncertainty, current market facts, successful app execution, country-wide coverage, or financial bankability.
