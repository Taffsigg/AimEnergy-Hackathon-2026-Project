# DRC electricity-purchase replication data: suitability audit

AimEnergy can use this release for a separate, observed-kWh-purchase benchmark and uptake research. It does **not** establish direct-meter validation of the current Uganda household model. No model has been trained or evaluated on these files in this audit.

## Source and integrity

- Lunanga, Stoop, Verpoorten and Desbureaux, *From demand deficit to development strategy: Navigating mini-grid viability in a fragile context*, Energy Economics (2026), [article DOI](https://doi.org/10.1016/j.eneco.2026.109141).
- [Harvard Dataverse replication package](https://doi.org/10.7910/DVN/KPDREF), version 1.0, published 19 January 2026. The official API records **CC0 1.0** and eight unrestricted files. A dated, unauthenticated API response is retained in [source metadata](../Data/metadata/drc-dataverse-source.json).
- User-supplied originals remain in the repository-root `dataversefiles` folder. All eight original-file MD5 checksums match the publisher metadata; SHA-256 hashes are also recorded in the [local audit](../Data/metadata/drc-dataverse-audit.json). Dataverse's ingested `.tab` names differ from the original `.dta` names.
- Detailed methodological interpretation below uses the authors' [June 2025 working paper](https://www.nikstoop.com/wp-content/uploads/2025/06/IOB-WP-2025-09.pdf), Data and Methods section. The paywalled final article's full methods were not independently inspected. The supplied replication instructions are dated January 2026.

## What is actually supplied

| File | Released observations | Meaning and limits |
|---|---:|---|
| `electricity1.dta` | 175 | Monthly area aggregates: connections, uptake, household/SME mean and total kWh purchases |
| `electricity2.dta` | 13,479 | One average monthly kWh-purchase value per client: 12,863 households and 616 SMEs; no client identifier or time sequence |
| `electricity3.dta` | 22 | Goma monthly indices, January 2024–October 2025, normalized to December 2024; these are not absolute kWh |
| `survey.dta` | 1,202 unique IDs | 911 households and 291 SMEs; baseline characteristics and follow-up outcomes; 512 observed consumption outcomes |
| `census.dta` | 27,266 | Only area, household/business type and construction quality; no parcel identifier or coordinates |
| `acled.dta` | 216 | Aggregated conflict-event context; one missing month value |
| `readme.rtf`, `replication.do` | Documentation/code | Author definitions and reproduction instructions; not additional observations |

The administrative target is **prepaid electricity purchases expressed in kWh**, used by the authors as a consumption proxy. It is not direct meter-register or interval consumption. Survey outcomes average purchases from connection until follow-up; client averages cover a different administrative window. Purchasing and physical usage can occur in different months.

The underlying transaction/client-month counts discussed in the paper are not supplied as transaction rows in this package. The public census file omits the paper's 289 institutional parcels: 27,266 released household/business rows versus 27,555 total parcels reported in the working paper.

## Data traps to preserve

**Area codes differ between files.** `electricity1`, `survey` and `census` use 1 = Goma, 2 = Lubero, 3 = Mutwanga. `electricity2` uses 1 = Mutwanga, 2 = Goma, 3 = Lubero. Decode each file's own labels before combining area summaries.

| Monthly aggregate area | Rows | Calendar range | Entirely absent months |
|---|---:|---|---|
| Goma | 67 | May 2019–December 2024 | November 2024 |
| Lubero | 39 | October 2021–December 2024 | None |
| Mutwanga | 69 | February 2019–December 2024 | July 2021, August 2024 |

There are no duplicate area-month pairs. Some existing rows also have missing totals; retain the distinction between absent rows, missing values and observed zero purchases. These are three **analysis areas under one operator**, Virunga Energies; Lubero combines multiple localities. They are not thousands of independently sampled sites.

All 690 unconnected survey respondents have missing `kwh`; all 512 connected respondents have observed `kwh`. Missing usage must not silently become a zero-valued consumption label. The survey includes 212 attritors and positive sampling weights. The working paper describes wealth-stratified sampling and follow-up handling that require explicit treatment in a new model.

There is no released key linking the client-average file to survey respondents or census parcels. Never join those files by row order or infer identities from consumption values. The survey itself already contains its linked outcome, but exact respondent connection/follow-up dates are not released.

## Recommended use in AimEnergy

1. **Observed demand evidence:** show historical purchase uptake and household/SME differences, with explicit units, dates and missing months. Keep these DRC examples distinct from Uganda planning assumptions.
2. **Pre-grid research model:** define connection uptake separately from kWh purchases conditional on connection. Select only verified baseline features; use survey weights and report attrition sensitivity. Exclude outcome/log-outcome, connected status, future intentions, follow-up reasons and future conflict exposures from predictors.
3. **Geographic evaluation:** freeze features, baselines, metrics and missing-data rules before fitting. Evaluate each of the three analysis areas held out in turn; report every area's error and sample size, including failures. This is geographic transfer within one operator, not independent-operator validation. The source outcomes have already been inspected descriptively; do not call the exercise preregistered or a permanently untouched test set.
4. **Separate time forecasting:** area-month purchase forecasting can use calendar-held-out evaluation against persistence/seasonal baselines, but answers a different question from predicting a new village before construction. Never use future connected-client counts as if known before commissioning.

The existing Uganda forest requires different inputs and has a different target. These files cannot simply be appended to its training table or scored by inventing roof, room or power-availability fields. A separate benchmark is the next research step. No claimed accuracy improvement, confidence coverage, equipment-sizing result or Ugandan village validation follows from acquiring the release.

## Reproduce this audit

From `aimenergy-app`, using the existing pandas research environment:

```sh
python scripts/audit_drc_data.py
# Optional source location:
python scripts/audit_drc_data.py --source /path/to/dataversefiles
```

The audit reads originals, verifies the publisher checksums, and writes aggregate inventory, label mappings, missingness, date gaps and provenance to `Data/metadata/drc-dataverse-audit.json`. It exports no respondent rows or IDs and changes no browser data, scenario or trained model. Raw survey/conflict records remain outside `dist`; CC0 does not make individual records necessary for a public demo.
