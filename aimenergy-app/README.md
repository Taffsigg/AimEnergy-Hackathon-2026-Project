# AimEnergy — inspectable AI for mini-grid planning

AimEnergy combines a trained household consumption-proxy model, geographic clustering, RAMP timing simulation and explicit growth scenarios. Its model lab exposes held-out results, input assumptions, global feature importance and profile sensitivity.

## Run

Requires Node.js 20+. No npm install is needed for serving or JavaScript tests.

    npm start

Open http://127.0.0.1:4173 for the landing page, choose Open prototype, then AI model lab. The planner is also available directly at http://127.0.0.1:4173/planner.html. The Start AimEnergy.cmd launcher also starts the server. Keep its window open; Ctrl+C stops it. API health is /api/health.

## Actual ML

- A 64-tree household random forest, selected through training-only five-fold cross-validation against a median baseline. Features: sleeping rooms, roof/wall/floor materials, rural/urban context, region and power availability.
- Independent household splits: 267 training, 89 calibration, 89 untouched test. Preprocessing is fitted within training folds. The model is frozen before calibration.
- Four KMeans geographic context groups across 411 villages, using population, buildings, facilities and roads. Sizes: 50, 329, 31 and 1. The singleton is a context outlier, not an energy-demand label.
- Seven RAMP-generated timing templates, averaged over 30 seeded days. Monthly energy comes from the planning scenario, not the normalized timing shape.

## Evaluation

Held-out household-proxy MAE is 44.14 kWh/month, versus 49.09 for the median benchmark: about 10.1% lower on this sample. Mean signed error is −28.96 kWh/month; systematic underprediction remains. Nominal 90% residual intervals covered 77/89 test observations (86.5%), with mean width 154.48 kWh. Only 18 test households are rural.

The target is inferred from 2019/2020 payments at an assumed 250 UGX/kWh, not meter readings. No Lamwo households or matched unseen-site kWh evaluation are available. The separately acquired Tanzania current data supports a retrospective timing diagnostic only. Applying a household model output to the village planner is an explicit scenario transfer, not an unbiased population estimate. Household intervals do not become village intervals.

## Data folder

Data/ contains local working data: raw source copies; deduplicated household features and compact geography under processed/; fixed split membership under splits/; feature dictionaries, audits and SHA-256 manifests under metadata/. Original sibling inputs are unchanged.

Household data and split membership remain local and are excluded from the deployment and portable source ZIP. The public app serves curated geography, aggregate evidence and trained model artifacts under dist/data/. Read Data/README.md before retraining or sharing data.

## Reproduce and test

Training uses Python 3.11 and the versions in Models/training-provenance.json. Create an isolated environment and install Models/requirements-training.txt. The RAMP generator needs its separately documented environment; do not mix its NumPy 1.x requirements with the current training stack.

    python scripts/train_model.py
    npm test
    python -m unittest discover -s tests -p test_ml_data.py

Models/ stores the plain-JSON forest, evaluation, dependency pins and source/script/artifact hashes. Reference pickles and missing notebooks are not executed. Python/JavaScript parity fixtures use synthetic profiles, not public household rows.

## Product and deployment

The app provides 411 real village boundaries, 39 candidate villages, and 25 existing-site records across 24 villages; manual location scenarios; household/business/service calculations; average-day profiles; 24-month growth; saved comparisons; reports and evidence exports.

The Node REST API supports health, metadata, household prediction and planning forecasts with input checks, body limits, rate limits and bounded static paths. A non-root container configuration and CI test/build workflow are included. Docker is unavailable locally, so image build verification remains for CI. The prototype has no built-in user authentication; a private pilot needs an authenticated TLS gateway and operational controls.

It is technically runnable now. An evidence-backed operator deployment is planned for March–April 2027, conditional on partner data, held-out site evaluation, geographic transfer and operational gates. No public cloud deployment was performed.

## Hackathon kit

- docs/PITCH.md: three-minute AI story and demo flow.
- docs/IMPACT_ESTIMATE.md: one-page result and evidence limits.
- docs/MODEL_CARD.md: training, evaluation and appropriate use.
- docs/ARCHITECTURE.md: data, model and serving boundaries.
- docs/DEPLOYMENT_ROADMAP.md: gated five-to-six-month path.
- docs/API.md: API contract and private deployment commands.
- docs/METHODOLOGY.md and docs/RAMP.md: scenario equations and simulation assumptions.
- docs/OPERATOR_DATA_SHARING.md: proposed data partnership and site validation.

Browser checks and remaining verification limits are recorded in docs/VERIFICATION.md.

## Field assessment and offline kit

Open Field assessment for the evidence passport, five sensitivity-ranked priority questions, locally saved responses, before/after comparison, read-only applied history and assessment exports. The original source records remain unchanged. Prepare offline pack explicitly while online; APIs and raw household files are excluded from its coherent cached snapshot. Reload once after preparation. Field records stay on this device until exported; no automatic synchronization is implemented. See docs/FIELD_ASSESSMENT.md and docs/OFFLINE.md.

## Metered evidence and pilot package

Open **Metered evidence** for the real Tanzania data audit and four later-day current-shape comparisons, including the comparison where RMSE favors the flat baseline. The source has 40,809 minute records from one site, not measured kWh labels for our village model. See docs/METERED_EVIDENCE.md for reproduction and CC BY-NC 3.0 conditions. Raw metered files and curves remain local; the noncommercial research exhibit is separate from model inference.

Data/templates/site_month.csv and its dictionary provide an empty operator aggregate template. docs/PILOT_PROTOCOL.md freezes the proposed target, site-split design, baselines, acceptance process and draft outreach. No operator message has been sent or partnership claimed.

## Landing page

The root page introduces AimEnergy with real Lamwo geography, a live grain-mill scenario, an actual field-workspace screenshot and scoped evidence results. Open prototype launches planner.html; direct links can open the AI, field and evidence workspaces. Offline snapshot field-v4 includes both pages. See docs/LANDING_PAGE.md.
