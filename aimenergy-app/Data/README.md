# AimEnergy data workspace

Run `python scripts/train_model.py` from the app directory to recreate the processed household table, deterministic splits, model artifacts and evaluation. The source Stata file is supplied locally in the parent workspace; use `--source PATH` to override its location. The original supplied file is never modified.

| Folder | Contents | Publication policy |
| --- | --- | --- |
| `raw/survey` | Local copy of `analysis_clean_noMI.dta` | Microdata: never served or included in deployment bundles |
| `raw/lamwo` | Necessary processed CSVs copied from the supplied reference repository | Review upstream data rights before redistribution |
| `processed/households.csv` | 445 unique households, audited stable features, target and survey weight | Local microdata; never public |
| `processed/geospatial` | Existing compact site, boundary and aggregate app assets | Same provenance/limits as app catalog |
| `splits` | Household training, calibration and untouched test CSVs | Local microdata; never public |
| `metadata` | Source SHA-256 manifest, feature dictionary, stability audit and split checksums | Aggregate/provenance documentation |

The 28,625 source rows contain only 445 unique households. Rooms, roof, wall, floor, rural/urban, region, usual daily electricity availability, target and survey weight are checked for within-household stability including missingness before deduplication. `hhsize` varies within 421 households and is excluded. Payment, tariff, electricity-cost, target-derived columns and household/district IDs are excluded from predictors.

`dist/data` contains only a fitted JSON forest, aggregate evaluation, synthetic inference fixtures and existing compact geographic context. No actual household inference rows, IDs or survey splits are exported there. Do not copy this entire `Data` folder into public hosting. The folder intentionally omits large raw rasters, notebooks, reference pickles and unrelated source archives.

The national survey sample has no observed households in Lamwo. The expenditure-derived target is not metered electricity demand. Geographic features support context clustering, not supervised village-demand training.

## Metered research data

Tanzania source ZIP, text files, README, metadata and NC attribution are stored in raw/metered/tanzania; the publisher SHA-256 is verified. Nine series / 40,809 minute current records are not kWh labels. Full metadata audit: metadata/tanzania-metered-audit.json. Retrospective curves are local in processed/metered; only aggregate diagnostics and attribution are public in dist/data/metered-evidence.json. Raw metered data and curves are Git-ignored and excluded from portable releases. See docs/METERED_EVIDENCE.md for license and scope.

KIT access and suitability are documented separately in metadata/kit-metered-audit.json. Source PDFs and catalogues must not be counted as acquired meter observations.

The templates folder contains a header-only operator CSV and dictionary, not fabricated pilot data.

## Remote evidence

raw/satellite retains acquired source documentation and the real pilot crop locally; metadata/satellite-evidence-audit.json records provenance and hashes. dist/data/satellite-evidence.json is the public manifest. No annual Google village-count series was acquired. metadata/drone-illustration.json records the AI-artwork prompt and hash; artwork is not measurement. Empty templates/drone_survey.geojson and templates/building_history.csv contain no fabricated observations. Imports made through the browser stay in its local storage until explicitly exported. See docs/REMOTE_EVIDENCE.md.
