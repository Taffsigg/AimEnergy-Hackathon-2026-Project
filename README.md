# AimEnergy

### Better decisions before the first connection.

AimEnergy is an AI-assisted planning prototype for estimating rural mini-grid demand before construction. It connects real village geography, an inspectable household model, editable appliance scenarios and a field-assessment workflow so developers can see what supports an estimate and what to investigate next.

Built for **Global Energy Hackathon — Brief 03: Predict mini-grid demand before building**. The geographic pilot covers **Lamwo, Uganda**.

![AimEnergy landing page](aimenergy-app/docs/screenshots/landing-page.jpg)

## What you can do

- **Explore 411 real villages** with population estimates, building counts, mapped facilities and geographic boundaries.
- **Build a demand scenario** from household connections, productive-use businesses and public services.
- **Compare 24 months** of editable uptake, appliance and business-growth assumptions, with low/base/high envelopes.
- **Inspect a trained household model**, its benchmark, feature inputs and evaluation limits before using its output as an assumption.
- **Take questions into the field:** inspect an evidence passport, answer sensitivity-ranked questions, preserve the baseline and compare a revision.
- **Prepare for offline assessment**, save scenarios locally and export reports with their assumptions and evidence methods.
- **Inspect satellite and drone evidence:** a dated pilot mosaic, local survey/image imports and a building-history CSV view; concept artwork stays distinct from measurements. See the [remote-evidence guide](aimenergy-app/docs/REMOTE_EVIDENCE.md).
- **Review real metered-current evidence** separately from household ML results and village planning scenarios.

## Run the prototype

Requires **Node.js 20 or newer**. No npm dependency installation, Python server, database or API key is needed to run the prepared browser demo.

From the repository root:

```sh
cd aimenergy-app
npm start
```

Open **http://127.0.0.1:4173/** for the landing page, then select **Open prototype**. The planner is also available at **http://127.0.0.1:4173/planner.html**.

On Windows, you can double-click `aimenergy-app/Start AimEnergy.cmd`. Keep the server terminal open while using the local app.

For a first demonstration, open **Demo story**, reset to the intended village defaults, compare a baseline with one hypothetical grain mill, then inspect **AI model lab**, **Field assessment** and **Metered evidence**.

## What the evidence supports

| Component | Current evidence | Scope |
|---|---|---|
| Geographic context | 411 villages, 39 candidate villages, 25 existing-site records across 24 villages | Settlement features and reference labels; not measured demand |
| Household ML | 64-tree random forest; 267 training / 89 calibration / 89 test households | Survey payment-derived electricity-use proxy |
| Held-out household result | MAE 44.14 versus 49.09 kWh/household/month for a median baseline | About 10.1% lower error on this sample; systematic underprediction remains |
| Household interval evaluation | 90% nominal; 77/89 = 86.5% observed coverage | Household survey scope; not village-total coverage |
| Geographic clustering | Four groups describing village context | Unsupervised descriptions, not electricity-demand labels |
| RAMP simulation | Seven categories × 30 seeded simulation days | Synthetic timing shapes scaled to scenario energy |
| Tanzania metered research | 40,809 minute current records; four later-day comparisons at one site | Retrospective current-shape diagnostic, not measured kWh or unseen-site validation |

The survey contains **445 unique households**, despite 28,625 source rows. No Lamwo household sample was identified. Village totals and growth remain **uncalibrated planning scenarios**; low/high values are assumption envelopes, not confidence intervals. Independent unseen-site kWh validation is still an outstanding Brief 03 requirement.

Average-day peaks do not establish equipment sizes, motor starting requirements, reliability or investment returns. See the [model card](aimenergy-app/docs/MODEL_CARD.md), [methods](aimenergy-app/docs/METHODOLOGY.md) and [metered evidence](aimenergy-app/docs/METERED_EVIDENCE.md).

## Repository layout

```text
.
├── README.md                       Repository overview
├── AIMENERGY_ANALYSIS.md            Initial project analysis
└── aimenergy-app/                   Application root
    ├── READ.md                     Complete project guide
    ├── README.md                   Application introduction
    ├── package.json
    ├── server.mjs                  Local static server and optional HTTP API
    ├── vercel.json                 Static demo deployment configuration
    ├── dist/                       Browser app, landing page and public assets
    ├── Data/                       Local data workspace, audits and templates
    ├── Models/                     Model artifacts and training provenance
    ├── scripts/                    Preparation, training and packaging
    ├── tests/                      Runtime and data checks
    └── docs/                       Methods, pitch, pilot and verification
```

The [complete project guide](aimenergy-app/READ.md) covers equations, defaults, datasets, model evaluation, reproduction commands, offline operation, API contracts, deployment, troubleshooting and the documentation index.

## Publish a Vercel demo

Import this repository into Vercel and set **Root Directory** to **`aimenergy-app`**. Its `vercel.json` selects the prepared **`dist`** output and skips installation/build work that is unnecessary for the static demo.

The landing page, planner, browser-side ML, assessments and exports run in this static deployment. The separate Node `/api/*` endpoints are not included. Saved records remain in each visitor's browser; localhost records do not automatically transfer to a deployed domain.

Follow the [Vercel deployment guide](aimenergy-app/docs/VERCEL_DEMO.md) for exact steps and post-deployment checks.

## Verification and reproduction

From `aimenergy-app`:

```sh
npm test
```

Recorded verification includes **38 JavaScript tests** covering planning invariants, village integration, model parity, API handling, field provenance, routing and offline snapshots. Seven additional Python checks cover private household-data audits and the metered diagnostic when their local data is available. Desktop/mobile flows and prepared offline navigation were checked; details and limits are in the [verification record](aimenergy-app/docs/VERIFICATION.md).

Normal inference uses the prepared JSON model. Retraining needs the separately documented Python environment and local source data. RAMP uses a separate pinned environment. See [model artifacts](aimenergy-app/Models/README.md), the [data guide](aimenergy-app/Data/README.md) and the [complete guide](aimenergy-app/READ.md) before reproducing research outputs.

## Hackathon and pilot materials

| Document | Purpose |
|---|---|
| [Pitch](aimenergy-app/docs/PITCH.md) | Three-minute spoken story and demo notes |
| [Impact estimate](aimenergy-app/docs/IMPACT_ESTIMATE.md) | One-page evidence and impact scope |
| [Demo checklist](aimenergy-app/docs/DEMO_CHECKLIST.md) | Rehearsal, exports and submission checks |
| [Pilot protocol](aimenergy-app/docs/PILOT_PROTOCOL.md) | Proposed operator-data and untouched-site evaluation |
| [Operator data sharing](aimenergy-app/docs/OPERATOR_DATA_SHARING.md) | Aggregate sharing proposal and safeguards |
| [Deployment roadmap](aimenergy-app/docs/DEPLOYMENT_ROADMAP.md) | Conditional five-to-six-month path to an operator deployment |

The pilot plan depends on an operator agreement, suitable measured customer-kWh data, site-level validation, geographic transfer and operational readiness. Prototype results do not establish an operator partnership, achieved savings or a guaranteed production date.

## Data, attribution and appropriate use

Public runtime assets are under `aimenergy-app/dist/`. Raw household data, split membership, private operator records and credentials should not be placed there. The portable source package and private local-data package serve different purposes; consult their data-handling documentation before sharing.

The Tanzania research exhibit uses **CC BY-NC 3.0** data; commercial use/training clearance is not established. It is separate from the household model and planner inputs. Other data and dependencies retain their own terms. Read the [third-party notices](aimenergy-app/docs/THIRD_PARTY_NOTICES.md) for source attribution and the [data guide](aimenergy-app/Data/README.md) for publication boundaries.
