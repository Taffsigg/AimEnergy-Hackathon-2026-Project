# AimEnergy — complete project guide

- **Project:** AimEnergy
- **Version:** 3.3.0
- **Documentation date:** 30 October 2026
- **Challenge:** Global Energy Hackathon, Brief 03 — Predict mini-grid demand before building
- **Working directory:** `C:\Users\Dell\Downloads\AimEnergy\AimEnergy Project\aimenergy-app`

AimEnergy helps mini-grid developers examine how much electricity a settlement might use before construction. It combines real geographic inputs, a trained household survey-proxy model, reproducible appliance timing simulation and editable demand scenarios. Its field workflow preserves source evidence, identifies sensitive assumptions and records scenario revisions.

This is a working research and planning prototype. The household model has held-out survey evaluation; the village scenarios do not yet have independent unseen-site kWh validation. Those are separate evidence levels throughout this guide.

`READ.md` is the comprehensive handoff guide. The existing `README.md` remains the shorter introduction. Specialist documents are indexed at the end.

## Contents

1. [Quick start](#quick-start)
2. [Problem, users and product value](#problem-users-and-product-value)
3. [Implemented features](#implemented-features)
4. [Architecture and project structure](#architecture-and-project-structure)
5. [Data inventory and source quality](#data-inventory-and-source-quality)
6. [Machine learning and evaluation](#machine-learning-and-evaluation)
7. [Demand equations and defaults](#demand-equations-and-defaults)
8. [RAMP timing simulation](#ramp-timing-simulation)
9. [Metered-data diagnostic](#metered-data-diagnostic)
10. [Field assessment and offline operation](#field-assessment-and-offline-operation)
11. [HTTP API](#http-api)
12. [Reproduction and verification](#reproduction-and-verification)
13. [Deployment and five-to-six-month roadmap](#deployment-and-five-to-six-month-roadmap)
14. [Brief 03 readiness and outstanding work](#brief-03-readiness-and-outstanding-work)
15. [Demo, pitch and submission materials](#demo-pitch-and-submission-materials)
16. [Packaging, licensing and data handling](#packaging-licensing-and-data-handling)
17. [Troubleshooting](#troubleshooting)
18. [Documentation index](#documentation-index)

## Quick start

### Run the application

Requires **Node.js 20 or newer**. Serving the app and running JavaScript tests require no `npm install`, paid API, model account or Python environment.

From PowerShell:

```powershell
Set-Location 'C:\Users\Dell\Downloads\AimEnergy\AimEnergy Project\aimenergy-app'
npm start
```

Open **http://127.0.0.1:4173/** for the landing page, then choose **Open prototype**. The planner is directly available at **http://127.0.0.1:4173/planner.html**. Alternatively, double-click `Start AimEnergy.cmd`. Keep the server terminal open; press Ctrl+C to stop it. Run through HTTP rather than opening `dist/index.html` directly with a `file:` URL.

The default server binds to `127.0.0.1`, port `4173`. To use another local port:

```powershell
$env:PORT = '4174'
npm start
```

Environment changes apply to that terminal. Model and RAMP artifacts load when the server starts; restart after replacing them.

### First visit

1. Select a village in **Demand overview** or **Village explorer**.
2. Inspect its source population, buildings and facilities.
3. Adjust uptake, household energy, businesses and services.
4. Open **AI model lab** to inspect the trained model and its evaluation.
5. Open **Field assessment** to inspect provenance and record answers.
6. Open **Metered evidence** for the separate real-current diagnostic.
7. Save scenarios and export a report with the assumptions attached.

Existing browser storage can restore an earlier scenario. Use the demo journey or reset the assumptions before comparing rehearsed numbers.

## Problem, users and product value

An unelectrified village has no history of customer electricity purchases from the proposed mini-grid. Population, roofs and expressed interest can help describe it, but they do not directly establish connection uptake, appliance ownership, operating hours or willingness to pay.

AimEnergy is intended for mini-grid developers, energy-access planners and field teams investigating those gaps. Its central workflow is:

```text
Settlement evidence → explicit assumptions → demand scenario
        → priority field questions → recorded answers → visible revision
```

The practical distinction is that users can inspect where each input came from and see how a change affects the same village's scenario. ML, geographic context, synthetic profiles and field responses retain separate provenance.

Avoided oversizing, capital savings, fewer outages and faster assessments are potential benefits to evaluate in a pilot. They have not been measured as achieved outcomes. The app does not prescribe engineering system sizes or establish bankability.

## Implemented features

| Workspace | What it does |
|---|---|
| Landing page | Public-facing introduction with real map geometry, live mill scenario and links into the complete prototype |
| Demand overview | Interactive village map; household/business/service breakdown; first-month energy and average-day peak; 24-month low/base/high scenarios |
| Village explorer | Search and filter 411 Lamwo villages; inspect curated candidate/existing labels; create manual locations with supplied inputs |
| Saved scenarios | Retain planning scenarios locally and compare alternative assumptions |
| Field assessment | Evidence passport, sensitivity-ranked questions, valid responses, before/after comparison, applied history and exports |
| Satellite & drone | Dated pilot satellite crop, boundary overlays, locally imported survey features/images and dated building estimates; AI artwork labelled separately |
| AI model lab | Inspect the household forest, evaluation, feature schema, global importance, profile sensitivity and geographic groups; apply an estimate as an assumption |
| Metered evidence | Show acquired Tanzania current-data facts, four later-day comparisons, an unfavorable result, source attribution and limitations |
| Evidence & method | Explain source coverage, scenario equations, assumptions and readiness against the challenge |
| Demo story | Guide a presentation through a real place, productive-use scenario and evidence workflow |

Reports include HTML planning reports, CSV/JSON planning exports and field-assessment exports. HTML reports can be opened and printed or saved as PDF using the browser.

Manual locations support user-entered planning outside Lamwo. They do not trigger satellite extraction or imply that the household model has been validated in that country.

## Architecture and project structure

The frontend uses plain HTML, CSS, SVG and JavaScript ES modules. The Node server uses native modules. There is no frontend build step or required runtime package installation.

```text
aimenergy-app/
├── READ.md                    Comprehensive guide
├── README.md                  Short introduction
├── package.json               Version and runnable commands
├── server.mjs                 Static serving and HTTP API
├── Start AimEnergy.cmd        Windows launcher
├── dist/                      Only publicly served application files
│   ├── index.html             Landing page
│   ├── planner.html           Full planning application
│   ├── landing.css / landing.js
│   ├── app.js                 Navigation, planning UI, scenarios and exports
│   ├── engine.js              Deterministic demand calculations
│   ├── ai-lab.js              Model-lab UI
│   ├── ml-model.js            Portable JSON-model inference
│   ├── field-core.js          Assessment/provenance calculations
│   ├── field-lab.js           Field workflow UI
│   ├── metered-lab.js         Current-data diagnostic UI
│   ├── offline.js / sw.js     Explicit offline preparation and snapshots
│   ├── manifest.webmanifest
│   ├── styles.css             Main styling; feature CSS also included
│   ├── icons/
│   └── data/                  Curated geography, models and aggregate evidence
├── Data/                      Local source, processed, split and audit data
│   ├── raw/
│   ├── processed/
│   ├── splits/
│   ├── metadata/
│   ├── templates/
│   └── field_assessments/
├── Models/                    Fitted artifacts, evaluation and provenance
├── scripts/                   Preparation, training, acquisition and packaging
├── tests/                     JavaScript regressions and Python data checks
├── docs/                      Methods, pitch, pilot, API and verification
├── Dockerfile / .dockerignore
└── .github/workflows/ci.yml
```

The browser and API use the same planning engine and portable household model. Python is needed for preparation, training and research reproduction, not for normal inference. Browser scenarios and field records use local storage; there is no application database or automatic cloud synchronization.

Only `dist/` is served. Placing a file in the project's `Data/` folder does not expose it through the app. Model/aggregate artifacts in `dist/data/` are intentionally downloadable for browser inference and offline use.

## Data inventory and source quality

### Lamwo geographic reference data

- **411 villages** with real names, source feature records, centers and display boundaries.
- **39 curated candidate villages**.
- **25 existing-site records across 24 unique villages**; these are reference labels, not 25 independent meter-validation sites.
- Population, buildings, roads and mapped facilities provide context. Buildings are structures, not verified occupied households.
- Four source centers outside their village polygons are retained with flags rather than silently corrected.
- API building counts disagree with the processed reference table in 397 villages. The app consistently uses the processed table.
- NDVI and wind are zero in 366/411 records. Their missingness/coverage meaning is unresolved; they do not drive demand calculations.
- A pre-acquired 2024 EOxCloudless/Sentinel-2 crop is displayed for Orii Gangodye in Satellite & drone, with its license and provenance. No live acquisition or automated image analysis is performed. Original layer dates are not established by an app/cache timestamp.

Local source copies are in `Data/raw/lamwo/`; compact geographic outputs are in `Data/processed/geospatial/` and `dist/data/`. The original supplied reference repository remains in the parent workspace. Reference pickles are not loaded and Git LFS notebook pointers are not treated as executed notebooks.

### Uganda household survey

Source: *Household electricity demand in Uganda*, Mendeley Data V2, DOI **10.17632/h5cc2cfy26.2**, supplied with a 2019/2020 household survey analysis file.

- **28,625 source rows**, but only **445 unique household IDs**.
- **91 rural and 354 urban households**.
- No Lamwo household sample was identified.
- The household-size field varies within 421 IDs and is excluded.
- The target is a **payment-derived electricity-use proxy**, calculated using payments, days and an assumed **UGX 250/kWh** tariff. It is not meter-measured energy.
- Repeated rows do not become independent ML examples.

Paths:

```text
Data/raw/survey/analysis_clean_noMI.dta
Data/processed/households.csv
Data/splits/
Data/metadata/
```

The original supplied Stata file is also retained outside this app in the workspace's `Household electricity demand in Uganda/` folder. Microdata and household split membership stay local and are excluded from the portable release and runtime image.

### Tanzania measured current

Source: Hartvigsson & Ahlgren (2018), Mendeley Data V1, DOI **10.17632/bbtn9wxhzm.1**, **CC BY-NC 3.0**.

Nine series contain **40,809 minute records** from **one established mini-grid**. The source ZIP matches the publisher's SHA-256. Original files, metadata and attribution are in `Data/raw/metered/tanzania/`. The full audit is `Data/metadata/tanzania-metered-audit.json`.

These are single-measured-phase current readings in **amperes**, not kWh. See the diagnostic section for the specific quality limits and uses.

### KIT dataset access

Source: Luh et al., *High-Resolution Real-World Electricity Data from Three Microgrids in the Global South*, DOI **10.35097/1305**, dataset **CC BY 4.0**.

The public archive endpoint was reached, but throttling and slow transfer prevented complete acquisition. Documentation and a partial archive are stored under `Data/raw/metered/kit/`. **Zero complete KIT metered series were acquired for the present evaluation.** Partial bytes, source-paper plots and metadata are not counted as observed rows.

The Rwanda site is supply constrained; delivered power cannot be assumed to represent unconstrained demand. The DRC and Haiti contexts also differ from typical village-household demand. Raw units, timestamps and coverage still need verification after complete retrieval. See `Data/metadata/kit-metered-audit.json` and the local `ACQUISITION_NOTES.md`.

### Operator template

`Data/templates/site_month.csv` is deliberately **header-only**. It is a proposed operator-approved aggregate exchange format, not fabricated pilot data or an implemented upload API. Its dictionary and `docs/PILOT_PROTOCOL.md` distinguish customer kWh, generation, payments, supply availability and dated preconnection features.

## Machine learning and evaluation

### Household model

The fitted model is a **64-tree random forest**, with log-transformed target, maximum depth 4 and minimum leaf size 12. It uses seven audited household predictors:

| Source field | Meaning |
|---|---|
| `h9q03` | Sleeping rooms |
| `h9q04` | Roof material |
| `h9q05` | Wall material |
| `h9q06` | Floor material |
| `urban` | Rural/urban context |
| `region` | Region |
| `s10q02` | Usual daily power availability, hours |

These are household-profile inputs. The app does not infer them automatically from village roofs or satellite layers. Missing features use documented training-derived defaults and are flagged. Use `/api/model` or the model lab for actual option codes and accepted numeric ranges.

Households are kept disjoint: **267 training / 89 calibration / 89 final test**. Model selection uses five-fold cross-validation on training data only. Preprocessing is fitted within each fold; the final forest is frozen before calibration. Payments, tariff, target-derived columns and household/district identifiers are excluded from predictors.

### Recorded results

| Measure | Result | Interpretation |
|---|---:|---|
| Training-only CV MAE, forest | 29.38 kWh/household/month | Model-selection evidence |
| Training-only CV MAE, median | 33.30 kWh/household/month | Simple comparator |
| Final test MAE, forest | 44.14 kWh/household/month | Held-out survey-proxy error |
| Final test MAE, median | 49.09 kWh/household/month | Baseline; forest MAE is about 10.1% lower |
| Final test RMSE | 72.09 kWh/household/month | Larger errors remain |
| Signed bias, prediction minus target | −28.96 kWh/household/month | Systematic underprediction |
| Survey-weighted test MAE | 45.91 kWh/household/month | Weight-sensitive diagnostic |
| Rural test sample | 18 households | Small descriptive subgroup |
| Rural test MAE | 31.05 kWh/household/month | Does not establish Lamwo transfer |
| Interval nominal coverage | 90% | Requested calibration level |
| Observed final coverage | 77/89 = 86.5% | Below nominal on this sample |
| Mean interval width | 154.48 kWh/household/month | Wide household uncertainty |

The residual interval uses a separate calibration sample, with finite-sample rank 81/89 and residual quantile approximately 91.46 kWh/month. This is household survey evidence. Neither interval coverage nor point-estimate accuracy is established for village totals, metered mini-grids or another country. Multiplying the household interval by connections does not create a calibrated village interval.

The model lab exposes global feature importance and scenario/profile sensitivity. Those are associations and model responses, not causal effects or household-specific explanations of real behavior.

### Geographic clustering

A separate KMeans model groups **411 villages into four geographic context groups**, with sizes **50, 329, 31 and 1**. Inputs describe population, buildings, services and roads; preprocessing includes transformations, imputation and scaling. The singleton is a context outlier requiring inspection. The groups have no measured electricity-demand labels and no supervised demand-accuracy score.

Model artifacts and hashes are in `Models/`; portable runtime copies are in `dist/data/`. Three synthetic Python/JavaScript inference fixtures check numerical parity without publishing real household rows.

## Demand equations and defaults

Village planning is a deterministic scenario engine, separate from the household forest. Each model month is **30 days**, with **24 months** in the horizon; annual summaries therefore represent 360-day model years.

At month 1:

```text
Potential household equivalents = population / people per household
Connected household equivalents = potential households × uptake share
Household kWh/month = connected households × assumed kWh/household/month
Business kWh/month = count × operating kW × equivalent hours/day × days/month
Service kWh/month = connected facility count × kWh/day × 30
Total site kWh/month = households + businesses + public services
```

Fractional household equivalents support continuous scenarios; they are not signed-up customers. Population and buildings are not interchangeable.

| Assumption | Default |
|---|---:|
| People per household | 4.5 |
| Initial household uptake | 60% |
| Energy per connected household | 20 kWh/month |
| Grain mill | 7.5 kW × 3 equivalent hours × 22 days = 495 kWh/month per unit |
| Refrigeration | 0.15 kW × 24 equivalent hours × 30 days = 108 kWh/month per unit |
| Salon | 1.2 kW × 6 equivalent hours × 26 days = 187.2 kWh/month per unit |
| Welding | 3 kW × 3 equivalent hours × 20 days = 180 kWh/month per unit |
| School | 3 kWh/day = 90 kWh/month per connected school |
| Clinic | 5 kWh/day = 150 kWh/month per connected clinic |
| Relative uptake growth by month 24 | 20%, capped at 100% uptake |
| Relative household-energy growth by month 24 | 25% |
| Relative business-energy growth by month 24 | 20% |

Counts and operating assumptions are editable. Mapped facilities are not proof of connection or operational status. Any restored scenario or assessment can supersede defaults.

Growth factors interpolate linearly across the 24-month horizon. These are assumed trajectories, not learned adoption forecasts. The current growth controls are nonnegative; a learned decline/rebound model is not implemented. Services remain fixed unless their inputs are changed.

Low/base/high energy factors are **0.70 / 1.00 / 1.35**. They are fixed planning envelopes, not confidence levels or calibrated probability intervals.

Monthly energy is allocated to normalized 24-hour category shapes and divided across the 30-day month. The resulting kW values describe an **average day**. Motor starting surges, active-day extremes, distribution losses, reliability, phase balance, seasonal loads, battery operation and detailed generation sizing require separate engineering work.

## RAMP timing simulation

RAMP **0.5.0** was executed for **seven categories × 30 seeded simulation days**, with seed **20261030**. The categories are household, mill, refrigeration, salon, welding, school and clinic.

The resulting hourly means are normalized to sum to one and saved in `dist/data/ramp-profiles.json`, with generator/dependency hashes, versions and appliance assumptions. The app consumes those cached arrays rather than running Python/RAMP in the browser. Monthly energy still comes from the scenario engine.

RAMP profiles are synthetic. They have not been calibrated against the Tanzania current data or independently validated as Lamwo load shapes. The mean over simulated days smooths extremes. Changing energy hours changes calculated energy but does not automatically reshape the cached hourly template. If a profile is absent/invalid, the engine can use explicit fallback shapes and identify the fallback.

Reproduction requires a **separate environment** from household training because RAMP 0.5.0 requires the documented NumPy 1.x stack:

```powershell
py -3.12 -m venv .venv-ramp
.venv-ramp/Scripts/python.exe -m pip install rampdemand==0.5.0 numpy==1.26.4 pandas==2.2.2
.venv-ramp/Scripts/python.exe scripts/generate_ramp_profiles.py
```

Match the recorded Python/dependency versions for byte-level reproduction. If a trusted corporate certificate chain is needed, configure it; do not disable certificate verification. See `docs/RAMP.md` for the complete appliance inventory and generator options.

## Metered-data diagnostic

The Tanzania experiment evaluates **timing of current**, not daily energy demand. Both aggregate-meter recordings belong to one site/entity.

For each recording, the first complete midnight-to-midnight day supplies 24 hourly current shares. Those shares are repeated as predictions for **every later complete day**, compared with a flat **1/24** profile. Partial days are excluded. Test-day totals only define the observed normalized shape; they are not predictive inputs.

| Recording / later complete day | Repeat-first-day MAE (pp) | Flat MAE (pp) | Repeat RMSE (pp) | Flat RMSE (pp) |
|---|---:|---:|---:|---:|
| Minigrid1a / 2 | 0.217 | 0.340 | 0.404 | 0.553 |
| Minigrid1a / 3 | 0.119 | 0.369 | 0.141 | 0.492 |
| Minigrid1b / 2 | 0.251 | 0.273 | 0.423 | 0.359 |
| Minigrid1b / 3 | 0.281 | 0.335 | 0.411 | 0.438 |

`pp` means percentage points of the day's normalized current share; lower is better. Repeating the reference has lower MAE in all four comparisons, but **worse RMSE on Minigrid1b day 2**. The unfavorable result remains visible.

This is a **retrospective diagnostic**: two reference days, four later days, 96 correlated hourly bins, one site. It is not a preregistered final ML test, independent-site evaluation, forest test, RAMP test or kWh forecast evaluation.

Data-quality limits:

- Concurrent measured voltage and power factor are absent; no conversion to kWh is made.
- Original columns lack headers. Their interpretation is inferred from numeric ordering and the primary paper.
- The reported average equals the minimum/maximum midpoint within rounding; true time-average semantics remain unresolved.
- README clocks and the paper's one-minute sampling determine day boundaries; absolute dates and timezone are unknown.
- Some series spans differ from the paper's stated device-duration limit; the discrepancy is retained.
- Short recordings cannot establish seasonal variation, growth or geographic transfer.

Raw data and local curves stay in `Data/`. The public `dist/data/metered-evidence.json` contains aggregate metrics, splits, attribution and limitations. This NC-licensed research exhibit does not train the household model or set village assumptions. Commercial clearance has not been established.

## Field assessment and offline operation

### Evidence passport

The passport separates original source values from effective scenario inputs. Every active engine parameter has an evidence entry. Geographic estimates, mapped records, survey ML, assumed profiles, synthetic timing and user-declared responses retain their own labels. Missing observation dates say **Not recorded**.

### Questions and revisions

Ten candidate questions cover population, people per household, uptake, household energy, mill count/hours/days, refrigeration, schools and clinics. The five highest-priority unanswered questions are ranked by the monthly-energy swing across declared test ranges.

This is one-at-a-time sensitivity, not formal expected value of information, a probability distribution or evidence of measured uncertainty reduction. A mill-hours response has no energy effect before a mill is included.

The workflow preserves a starting snapshot, validates responses and shows the revision using the same engine/profiles. Blank is unset, not zero. Invalid values and invalid/future dates are rejected. Evidence methods distinguish planning assumptions, reported estimates, counts, records and demonstration responses. Future household kWh cannot be labelled a field count.

Applying an assessment uses its baseline plus its answers, replacing later planner edits. Applied records become read-only; follow-ups start a new baseline. It does not overwrite geographic sources or retrain a model. Export reports/JSON to retain the answers, methods, dates and comparisons.

### Offline preparation

1. Serve on localhost or HTTPS and open **Field assessment** while online.
2. Choose **Prepare offline pack** and wait for **Ready**.
3. Reload once to use the complete snapshot.
4. Before recording/travel, verify the map, model and evidence screens still load when the app server is unavailable.
5. After an app/model update, choose **Refresh offline pack**, wait for Ready and reload again.

The current allowlist contains **33 required static assets**, including the metered view and summary. Preparation commits a complete snapshot only after all assets succeed; failure preserves the previous complete pack. APIs, raw Data, remote fonts and unknown routes are excluded.

Field records live in browser local storage, independently of cached application assets. No automatic upload or sync is implemented. Use anonymous aggregate notes and export backups. Clearing browser site data can remove assessments and cached assets. Private browsing, quota limits or device policies can prevent persistence. Readiness on one device is not proof of readiness on another.

## HTTP API

| Method | Route | Purpose |
|---|---|---|
| GET / HEAD | `/api/health` | Process liveness, model readiness, planning readiness and profile engine |
| GET / HEAD | `/api/model` | Model metadata, input schema, defaults and scope |
| POST | `/api/predict` | Household survey-proxy inference and separate household interval |
| POST | `/api/forecast` | Village scenario, 24 months, profiles and assumptions |

PowerShell examples, with the server running:

```powershell
Invoke-RestMethod 'http://127.0.0.1:4173/api/health'
Invoke-RestMethod 'http://127.0.0.1:4173/api/model'

# Empty features deliberately request a default profile, not a village observation.
$predictionBody = @{ features = @{} } | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:4173/api/predict' -ContentType 'application/json' -Body $predictionBody

$forecastBody = @{
    site = @{ population = 900; schools = 1; clinics = 1 }
    inputs = @{ connectionPercent = 60; householdKWhPerMonth = 20; millCount = 1 }
} | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:4173/api/forecast' -ContentType 'application/json' -Body $forecastBody
```

Feature names and categorical codes come from `/api/model`; do not invent codes. Planning ranges may clamp an input and return `validationWarnings`; inspect returned values. Optional `householdFeatures` on `/api/forecast` replaces the household energy assumption with the ML point prediction and returns the household result separately.

JSON bodies are limited to **65,536 bytes**. The per-process prototype limiter permits **120 API requests per socket IP per 60 seconds**, with up to 1,000 tracked clients. Behind a reverse proxy, users may share one allowance; forwarding headers are not trusted as identity.

Errors use JSON and appropriate status codes, including 400 invalid inputs, 413 oversized body, 415 unsupported type/encoding, 429 rate limit and 503 unavailable household model. HTTP 200 health can still report `modelReady:false`; planning can remain available.

The server applies input/type checks, static path bounds and security headers. It has no built-in authentication, tenancy, TLS termination or durable state store. It does not store submitted household records or log request bodies. A private operator pilot needs authenticated TLS access and agreed operational controls. Full contracts are in `docs/API.md`.

## Reproduction and verification

### Normal runtime checks

```powershell
npm test
```

The last recorded release verification passed **38 JavaScript tests** covering engine invariants, all 411 village integrations, model parity, UI event regressions, API handling, field provenance and offline snapshot behavior.

### Household training and data audits

Training used Python **3.11.15** with NumPy **2.4.6**, pandas **3.0.5**, SciPy **1.17.1** and scikit-learn **1.9.0**. These are recorded artifact versions, not a statement about current latest releases. Install from `Models/requirements-training.txt` in a separate environment:

```powershell
py -3.11 -m venv .venv-training
.venv-training/Scripts/python.exe -m pip install -r Models/requirements-training.txt
.venv-training/Scripts/python.exe scripts/train_model.py
.venv-training/Scripts/python.exe -m unittest discover -s tests -p test_ml_data.py
```

The default source is the supplied sibling Stata file. Override with `scripts/train_model.py --source PATH` if necessary. Original sources are not modified. Generated models, public artifacts, processed household data and splits are outputs; back up intentional alternative experiments before rerunning.

`scripts/prepare_data.py` rebuilds compact geography and survey summaries from the supplied sibling inputs. `--out PATH` changes its output directory. The original workspace structure or equivalent source paths are needed; the portable ZIP alone does not contain private training inputs or the entire reference repository.

### Metered-data reproduction

```powershell
python scripts/acquire_tanzania_data.py
python scripts/build_metered_benchmark.py
python -m unittest discover -s tests -p test_metered_benchmark.py
```

Use `--download` on the Tanzania acquisition script to refresh official HTTPS files. Existing sources are checked against publisher/source hashes. The benchmark rejects hash mismatches and discontinuous minute indices.

To resume KIT retrieval, first review its access notes and public terms; the explicit acceptance flag asserts they have been reviewed and accepted:

```powershell
python scripts/acquire_kit_data.py --terms-reviewed-and-accepted --max-time-seconds 14400
```

A four-hour bound is not a completion estimate. The script has no automatic quota retries. Respect HTTP 429/Retry-After; do not bypass TLS verification or evade quotas. Only a complete **988,638,720-byte** archive matching the published MD5 is accepted; unit/timezone/coverage auditing still follows acquisition.

### Last recorded verification

**45 automated checks passed:** 38 JavaScript tests, four household-data Python audits and three metered-diagnostic Python checks. Desktop 1366×900 and mobile 390×844 layouts were inspected without page-level horizontal overflow. Browser checks exercised model editing/application, reports, field revisions and metered results.

An offline server-unavailability test verified reload, saved records, scenario calculation and assessment export. The final expanded snapshot reached Ready and reloaded the metered view. This does not claim every device or flight-mode configuration was tested. A metered JSON download-event test timed out, although the JSON resource was verified through the local server.

Docker was unavailable locally, so the container image was not locally built. CI is configured to test and build; its configuration alone is not proof of a successful remote run. No public cloud deployment, operator field trial or held-out metered kWh evaluation has been completed.

These are recorded release results, not an assertion that tests were rerun merely to write this document. See `docs/VERIFICATION.md` for the detailed record.

## Deployment and five-to-six-month roadmap

The app is runnable privately now. A validated operator deployment is a conditional **March–April 2027** target, not a guarantee.

| Period | Planned output | Gate |
|---|---|---|
| Oct–Nov 2026 | Operator use case, data steward, sharing terms and evaluation protocol | Agreed purpose, responsibilities and access |
| Dec 2026 | Authorized customer kWh, connection dates, inventories and supply-quality audit | Sufficient usable independent sites and observation periods |
| Jan 2027 | Metered model/baseline comparisons with site-disjoint fitting, calibration and testing | Pre-agreed errors and coverage met on untouched sites |
| Feb 2027 | Geographic/context transfer, shadow forecasts, usability, security and load testing | Transfer limits and operational failures understood |
| Mar 2027 | Small monitored private pilot with human review and rollback | Operator accepts usefulness and data handling |
| Mar–Apr 2027 | Production review and staged release for validated scope | Written go/no-go and support ownership |

Container commands:

```powershell
docker build -t aimenergy:local .
docker run --rm --name aimenergy -p 127.0.0.1:4173:4173 aimenergy:local
```

The image runs as a non-root user, serves curated runtime files and excludes raw Data/Models. It binds internally to `0.0.0.0`; the example publishes only to host loopback. The configured CI/container Node baseline is 22; recorded local verification used Node 24.

Before operator access: provide authenticated TLS, trusted-client rate limits, release/data permissions review, monitoring, rollback, incident/support ownership and agreed retention. Train outside the serving image. The supplied CI does not publish, provision hosting or deploy automatically.

## Brief 03 readiness and outstanding work

| Requirement | Current state | Remaining evidence/work |
|---|---|---|
| Demand estimate and credible range | Explainable energy scenarios and visible low/high envelopes | Metered site calibration before probabilistic range claims |
| First-years growth | 24-month editable uptake/appliance/business trajectories | Observed connection dates and longitudinal demand evaluation |
| Held-out metered site validation | Tanzania current diagnostic only; no matching unseen-site kWh test | Representative customer-kWh targets and dated preconnection inputs; whole-site holdout |
| Lender-readable drivers | Sector breakdown, assumptions, provenance, model lab and reports | User evaluation with intended developers/lenders |
| Operator meter-sharing proposal | Blank aggregate template, sharing proposal and pilot protocol | Real operator agreement and approved data |
| Public-input, lightweight inference | Local browser/Node inference; 411 automatic Lamwo records | Broader feature coverage, geographic transfer and release rights |
| Prototype and submission material | Working app/API; pitch and impact documents | Record videos and complete portal requirements |

The prototype addresses substantial parts of Brief 03 but does **not yet fully satisfy its metered cold-start validation requirement**. Four same-site timing comparisons cannot substitute for that test.

The pilot protocol requires target definitions, supply-constraint treatment, whole-site splits, frozen baselines and acceptance thresholds before final evaluation. Proposed metrics include kWh MAE, signed bias, WAPE with explicit zero handling, growth-horizon errors and separate interval coverage/width. Acceptance thresholds have not yet been agreed with an operator. No partnership or outreach submission is implied by the draft materials.

## Demo, pitch and submission materials

### Reproducible planning example

1. Use **Demo story → Start the demo journey** and reset to the intended village defaults.
2. Show **Orii Gangodye**, with source population approximately 554.84 people, 4.5 people/household, 60% uptake, 20 kWh/connected household/month and one school at 3 kWh/day.
3. The month-1 base is **1,569.57 kWh**.
4. Add one hypothetical mill: **7.5 kW × 3 hours × 22 days = 495 kWh/month**.
5. The revised total is **2,064.57 kWh/month**. At six mill hours, the increment is 990 kWh; an old saved assessment may restore that alternative.
6. Show the field passport, record the example as **Demonstration response**, apply it and export the comparison.
7. Show the household test result and separate metered evidence, then the operator pilot plan.

This is scenario arithmetic. It is not evidence that a mill exists, a field visit occurred or prediction accuracy improved.

### Submission assets

- `docs/PITCH.md`: spoken three-minute pitch and demonstration notes.
- `docs/IMPACT_ESTIMATE.md`: one-page evidence/impact estimate.
- `docs/DEMO_CHECKLIST.md`: reset, export, offline and claim checks.
- `docs/PILOT_PROTOCOL.md`: proposed evaluation design and unsent operator outreach draft.
- `docs/OPERATOR_DATA_SHARING.md`: aggregation, safeguards and validation proposal.
- `docs/screenshots/`: actual application screenshots.
- `docs/examples/`: exported example reports with scenario/demo scope.

The supplied handbook calls for build-file links and a disclosure statement covering prior work, sprint work, AI tools, open-source code and datasets. Preserve genuine development records and use the organizers' current portal instructions for final requirements. Creating a new repository or importing files does not itself establish development dates or eligibility.

The supplied schedule specifies submission on **1 November 2026 at 12:00 PM ET**. The handbook notes that U.S. daylight saving ends during the sprint; confirm the portal's exact timezone and requirements. Pitch/demo videos still need to be recorded; their source scripts are not finished videos. No hackathon outcome is guaranteed.

## Packaging, licensing and data handling

### Release ZIPs

The parent `AimEnergy Project/` folder contains:

| Package | Intended use |
|---|---|
| `AimEnergy-Hackathon.zip` | Portable noncommercial research/demo source package; excludes raw microdata, meter curves and incomplete downloads |
| `AimEnergy-ML-Local.zip` | Private local working package including selected source/processed data; do not treat it as the public submission ZIP |

Regenerate after changes, including after adding this document:

```powershell
python scripts/package_release.py
python scripts/package_release.py --local
```

The packager excludes incomplete `.part` files, request headers/cookies, caches and selected scratch files. Packaging does not upload, publish, commit or deploy anything.

### Sources and rights

- Lamwo reference attribution identifies GIZ FairForward, Sunbird AI and Uganda's Ministry of Energy and Mineral Development. The supplied reference includes GPLv3; derived-data rights require their own review. No blanket license is inferred for all supplied data.
- The Uganda survey's source and payment-derived target are documented. Local microdata is not published through the app.
- RAMP is EUPL 1.2 or later, with its requested research citation in the notices.
- The Tanzania source is **CC BY-NC 3.0**. Its noncommercial diagnostic is separate from model inference; commercial use/training clearance has not been established. Replace or clear that exhibit before a commercial release.
- KIT's dataset is **CC BY 4.0**; preserve attribution and mark derived changes after acquisition. Its current partial download is not validation evidence.
- Optional Google Fonts use system-font fallbacks when unavailable. Python training libraries and their versions are documented in the model notices/provenance.
- Codex/ChatGPT assisted with research, implementation, audits, verification and documentation. Assistance does not replace independent measurement or operator approval.

Read `docs/THIRD_PARTY_NOTICES.md`, source metadata and the relevant licenses before redistribution. Fitted model files and pseudonymous aggregates are not automatic guarantees of privacy or publication permission.

Do not place raw household files, credentials, customer identifiers or private operator records in `dist/`. Use anonymous aggregate assessment notes. Keep source hashes and provenance with experiments; hypothetical answers must not become ground-truth training labels.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `npm`/`node` not found | Install a supported Node runtime, reopen the terminal, and confirm `node --version` |
| Port already in use | Inspect the existing server before stopping it, or use another `PORT`; do not terminate unrelated processes |
| Blank/data-loading error | Use `npm start` from this folder, check the printed URL and required `dist/data` files; avoid `file:` URLs |
| Changes do not appear | A prepared offline pack can intentionally retain the old complete app; refresh the pack while online and reload |
| Offline says incomplete | Wait for every asset to save; check storage restrictions/space; re-prepare while connected |
| Old scenario or demonstration appears | Browser storage restores prior inputs; reset the site/demo before rehearsing fixed numbers |
| Field answer cannot apply | Check blanks, numeric ranges, evidence method and observation date; applied records are read-only |
| Python dependency conflict | Keep household training and RAMP in separate environments with their documented pins |
| Training source missing | Restore the supplied sibling files or use the training `--source` option; portable bundles intentionally omit private inputs |
| Metered reproduction fails | Verify the official source ZIP/hash and local raw files; never substitute a partial archive or synthesize missing meter labels |
| API returns 503 | Check `modelReady` and model artifacts, then restart the server after replacing artifacts |
| API returns 429 | Respect Retry-After; check shared proxy-IP limits before increasing traffic |
| Export needs to become PDF | Open the downloaded HTML report and use Print / Save as PDF |

## Documentation index

| Document | Contents |
|---|---|
| [README.md](README.md) | Short introduction and quick start |
| [Data/README.md](Data/README.md) | Data workspace and publication policy |
| [Models/README.md](Models/README.md) | Model artifacts and reproduction boundaries |
| [Satellite and drone evidence](docs/REMOTE_EVIDENCE.md) | Source coverage, imports, imagery licensing and artwork provenance |
| [Landing page](docs/LANDING_PAGE.md) | Entry-page design, routing and preview behavior |
| [Architecture](docs/ARCHITECTURE.md) | Runtime, model and source separation |
| [API](docs/API.md) | Endpoints, input validation, statuses and operations |
| [Scenario methodology](docs/METHODOLOGY.md) | Demand equations and engineering limits |
| [Model card](docs/MODEL_CARD.md) | Household target, fitting, evaluation and appropriate use |
| [RAMP](docs/RAMP.md) | Appliance inventory, timing assumptions and reproduction |
| [Metered evidence](docs/METERED_EVIDENCE.md) | Current-data experiment, results and limits |
| [Field assessment](docs/FIELD_ASSESSMENT.md) | Passport, questions, revisions and history |
| [Offline](docs/OFFLINE.md) | Snapshot policy, preparation and recovery |
| [Pilot protocol](docs/PILOT_PROTOCOL.md) | Proposed operator evaluation and draft outreach |
| [Operator data sharing](docs/OPERATOR_DATA_SHARING.md) | Sharing terms, aggregation and validation design |
| [Operator template dictionary](Data/templates/README.md) | Proposed aggregate CSV field definitions |
| [Deployment roadmap](docs/DEPLOYMENT_ROADMAP.md) | Conditional five-to-six-month gates |
| [Verification](docs/VERIFICATION.md) | Recorded tests, browser checks and remaining limits |
| [Pitch](docs/PITCH.md) | Spoken three-minute story |
| [Impact estimate](docs/IMPACT_ESTIMATE.md) | One-page evidence and impact scope |
| [Demo checklist](docs/DEMO_CHECKLIST.md) | Rehearsal and submission checks |
| [Third-party notices](docs/THIRD_PARTY_NOTICES.md) | Attribution, dependencies and source rights |
