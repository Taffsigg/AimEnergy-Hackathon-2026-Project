# Sources and attribution

- Lamwo green electrification planning reference project: GIZ FairForward, Sunbird AI and Uganda Ministry of Energy and Mineral Development as identified in the supplied README. Its supplied repository includes GNU GPL version3. AimEnergy uses derived geographic data; the reference application, model pickles and notebook implementations are not executed or copied into the app. Preserve applicable upstream terms for source/data reuse.
- Household electricity demand in Uganda: Geoffrey Mubiinzi 2026, Mendeley Data V2, DOI10.17632/h5cc2cfy26.2; originally Uganda National Household Survey2019/2020. Only aggregate summaries are distributed here.
- RAMP: open-source demand profile generator, EUPL1.2 or later. Lombardi et al., Energy2019, DOI10.1016/j.energy.2019.04.097. Generated profile provenance and full assumed appliance definitions are packaged with the app.
- Optional Google Fonts: DM Sans and Manrope from Google Fonts. The app uses system-font fallbacks and does not bundle font binaries.

Input hashes and field-level provenance are in dist/data/catalog.json. No blanket data license is inferred beyond the supplied source material.

- Household ML training uses scikit-learn, NumPy, pandas and SciPy; runtime inference is original JavaScript over an exported model. Exact training versions and provenance hashes are in Models/training-provenance.json. Public evaluation contains aggregate metrics and binned means, not household rows.

## Tanzania measured-current research exhibit

Hartvigsson, Elias; Ahlgren, Erik (2018), Data for: Comparison of load profiles in a mini-grid: assessment of performance metrics using measured and interview-based data, Mendeley Data V1, DOI 10.17632/bbtn9wxhzm.1. https://data.mendeley.com/datasets/bbtn9wxhzm/1 — CC BY-NC 3.0, https://creativecommons.org/licenses/by-nc/3.0/. Numeric originals remain unchanged locally; aggregate timing diagnostics are derived for this noncommercial research demonstration. Raw records and curves are not publicly served. This source is not used to train the household model or set planner inputs. Commercial deployment/training clearance is not established; replace or clear the research exhibit before commercial use.

## DRC purchase and uptake benchmark

Lunanga, Elie; Stoop, Nik; Verpoorten, Marijke; Desbureaux, Sébastien (2026), Replication Data for: From demand deficit to development strategy: Navigating mini-grid viability in a fragile context, Harvard Dataverse V1, DOI 10.7910/DVN/KPDREF, https://doi.org/10.7910/DVN/KPDREF. Official metadata specifies CC0 1.0. AimEnergy publishes aggregate evaluation derived from the linked survey; individual survey and conflict-exposure records are not served. These kWh outcomes represent prepaid purchases used as consumption proxies, not direct-meter readings. Dataset-level CC0 does not change the separate Tanzania or satellite asset terms.

## Satellite imagery and drone artwork

The Orii Gangodye 2024 crop is EOxCloudless (https://cloudless.eox.at) by EOX IT Services GmbH (https://eox.at). Contains modified Copernicus Sentinel data 2024. Source announcement: https://www.eox.at/2025/03/sentinel-2-cloudless-2024/. Included under CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/) for noncommercial demonstration; commercial deployment needs an appropriate license or replacement imagery. Spatial extent, annual-mosaic date kind and source hash are recorded in dist/data/satellite-evidence.json and Data/metadata/satellite-evidence-audit.json.

Google Open Buildings Temporal 2016–2023 is cited for potential building-history inputs under its source terms, but no village annual raster aggregation was acquired. The empty state is not a zero-growth finding.

The drone illustration is AI-generated conceptual artwork produced with built-in image_gen. It is not an actual flight, site photo, orthomosaic or measured source. Prompt and artifact hash: Data/metadata/drone-illustration.json.

## PVGIS solar resource

European Commission Joint Research Centre, PVGIS 5.3 / PVGIS-SARAH3 solar and ERA5 meteorological data: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en. The acquired pilot is a 2023 1 kWp c-Si reference at 10 degrees south-facing with 14% system losses. Derived hourly values and provenance retain attribution. Consult the source terms for reuse; software licensing is not asserted to be the numeric data license. No SAM code was copied; the financial scenario is an original simplified calculation, not a SAM validation.
