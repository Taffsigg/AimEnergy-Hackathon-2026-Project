# Metered evidence and its limits

## Tanzania acquired

Hartvigsson & Ahlgren (2018), [Mendeley Data V1](https://data.mendeley.com/datasets/bbtn9wxhzm/1), DOI 10.17632/bbtn9wxhzm.1, CC BY-NC 3.0. Nine numeric series contain 40,809 minute records. The downloaded ZIP matches the publisher's SHA-256. Raw ZIP, README, metadata and text files are in `Data/raw/metered/tanzania/`; the full audit is `Data/metadata/tanzania-metered-audit.json`.

The [primary paper](https://research.chalmers.se/publication/500718/file/500718_Fulltext.pdf) describes one-phase clamp-current measurements. Concurrent measured voltage and power factor are not supplied. The paper's voltage/power-factor assumptions for interview estimates do not turn these observations into measured kWh. Column order is inferred; the reported average equals the minimum/maximum midpoint within rounding, leaving true time-average semantics unresolved. Absolute dates/timezone are unknown and short-span inconsistencies are retained in the audit.

## Reproducible current-shape diagnostic

The fixed retrospective recipe takes both aggregate-site recordings, aligns them using the README clock and one-minute sampling, uses the first full midnight-to-midnight day as the reference, and evaluates **all** later full days. Partial days are excluded. The reference's normalized 24 hourly current shares predict each later day's shape; a flat 1/24 profile is the comparator. Test-day totals define the observed shape only, not predictive inputs. There is no predicted daily energy total.

| Recording / evaluation day | Repeat-first-day MAE (pp) | Flat MAE (pp) | Repeat RMSE (pp) | Flat RMSE (pp) |
|---|---:|---:|---:|---:|
| Minigrid1a / 2 | 0.217 | 0.340 | 0.404 | 0.553 |
| Minigrid1a / 3 | 0.119 | 0.369 | 0.141 | 0.492 |
| Minigrid1b / 2 | 0.251 | 0.273 | 0.423 | 0.359 |
| Minigrid1b / 3 | 0.281 | 0.335 | 0.411 | 0.438 |

All four comparisons favor the reference on MAE. The third comparison favors the flat baseline on RMSE. Both outcomes are shown. These are four later days, 96 correlated hourly bins, **one site**. This is retrospective exploratory evidence, not a preregistered untouched ML test, an independent-site evaluation, a RAMP benchmark, a household forest test or kWh validation. No significance or universal superiority claim is made.

Reproduce locally, from the app folder:

    python scripts/acquire_tanzania_data.py
    python scripts/build_metered_benchmark.py
    python -m unittest discover -s tests -p test_metered_benchmark.py

Use `--download` on the acquisition script to refresh the original verified HTTPS files. The benchmark aborts if a source hash or minute-index continuity check fails. `Data/metadata/metered-benchmark-protocol.json` records the recipe; local processed output includes curves. `dist/data/metered-evidence.json` contains only aggregate diagnostics, source attribution, splits and limitations.

## Publication and deployment

Raw metered records, extracted curves and source PDFs remain local and excluded from Git, public serving and portable source bundles. The noncommercial hackathon evidence exhibit attributes the NC-licensed Tanzania source. It is not used to train the household forest or to set planner/RAMP inputs. Commercial use or training permission has not been established; replace or clear the NC research exhibit before a commercial release. The pilot's future operator data remains subject to its own agreed terms.

The KIT audit is separately recorded in `Data/metadata/kit-metered-audit.json`. Dataset access status must be taken from that audit; source-paper descriptions are never counted as acquired meter rows. The Rwanda recordings are supply constrained, so delivered power is not a label of unconstrained demand.

## DRC purchase benchmark

The same evidence workspace now starts with a separate CC0 DRC geographic benchmark. Its prepaid kWh-purchase targets are consumption proxies, rather than direct meter readings or current-derived energy. See [DRC_BENCHMARK.md](DRC_BENCHMARK.md) for all folds, mixed results and reproduction. The Tanzania source, license, splits and timing diagnostic below remain separate.
