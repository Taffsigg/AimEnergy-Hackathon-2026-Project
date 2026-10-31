<img src="dist/images/aimenergy-logo.png" width="96" height="96" alt="AimEnergy logo">

# AimEnergy

A browser-based mini-grid planning prototype with village data, demand scenarios, field assessments and hourly system feasibility calculations.

## Run

Requires Node.js 20 or newer. No dependency installation is needed to serve the prepared app.

```sh
npm start
```

Open [localhost:4173](http://127.0.0.1:4173/), or use [planner.html](http://127.0.0.1:4173/planner.html) directly. The Windows launcher is **Start AimEnergy.cmd**. Keep the server running while using the local app.

## Workspaces

- **Village explorer:** 411 Lamwo records and mapped boundaries.
- **Demand overview:** household, business and service loads, daily timing and 24-month scenarios.
- **Model lab:** household predictions, evaluation results and geographic context groups.
- **Field assessment:** input sources, priority questions, revisions and exports.
- **Satellite & drone:** a dated pilot mosaic and local survey/image imports.
- **Community USSD:** simulated basic-phone responses, review and passport handoff.
- **Metered evidence:** DRC purchase benchmarks and Tanzania current-data diagnostics.
- **System feasibility:** hourly PV/battery/generator scenarios, illustrative costs, LCOE, NPV and local versions.

Prepare the offline pack from Field assessment before disconnecting. Records stay in browser storage until exported; no account storage or automatic synchronization is implemented.

The solar example covers Orii Gangodye; other locations need matching PVGIS data. The USSD workspace is a browser simulation. Equipment and cost results are exploratory and do not replace engineering design or financial due diligence.

## Tests and reproduction

```sh
npm test
```

The JavaScript suite has 55 tests. Python is needed only for data preparation, model training and research benchmarks. Use the documented dependency versions and keep the RAMP environment separate from household training.

```sh
python scripts/train_model.py
python scripts/build_drc_benchmark.py
python scripts/acquire_solar_resource.py
```

These commands require the documented source files. Raw household data and split membership are excluded from public assets and portable releases. Read [Data/README.md](Data/README.md) before sharing or retraining.

## Deployment

For a static Vercel demo, use this folder as the Root Directory. The configuration serves **dist**. The Node API runs with the local server and is separate from static hosting. See [VERCEL_DEMO.md](docs/VERCEL_DEMO.md).

## Documentation

[READ.md](READ.md) contains the full setup and methods guide. See [MODEL_CARD.md](docs/MODEL_CARD.md) for model limits, [DRC_BENCHMARK.md](docs/DRC_BENCHMARK.md) for the purchase benchmark, [SYSTEM_FEASIBILITY.md](docs/SYSTEM_FEASIBILITY.md) for dispatch and financial assumptions, and [VERIFICATION.md](docs/VERIFICATION.md) for checks performed.

Source credits and licensing, including generated artwork, are recorded in [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).
