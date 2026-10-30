# Sources and attribution

- Lamwo green electrification planning reference project: GIZ FairForward, Sunbird AI and Uganda Ministry of Energy and Mineral Development as identified in the supplied README. Its supplied repository includes GNU GPL version3. AimEnergy uses derived geographic data; the reference application, model pickles and notebook implementations are not executed or copied into the app. Preserve applicable upstream terms for source/data reuse.
- Household electricity demand in Uganda: Geoffrey Mubiinzi 2026, Mendeley Data V2, DOI10.17632/h5cc2cfy26.2; originally Uganda National Household Survey2019/2020. Only aggregate summaries are distributed here.
- RAMP: open-source demand profile generator, EUPL1.2 or later. Lombardi et al., Energy2019, DOI10.1016/j.energy.2019.04.097. Generated profile provenance and full assumed appliance definitions are packaged with the app.
- Optional Google Fonts: DM Sans and Manrope from Google Fonts. The app uses system-font fallbacks and does not bundle font binaries.

Input hashes and field-level provenance are in dist/data/catalog.json. No blanket data license is inferred beyond the supplied source material.

- Household ML training uses scikit-learn, NumPy, pandas and SciPy; runtime inference is original JavaScript over an exported model. Exact training versions and provenance hashes are in Models/training-provenance.json. Public evaluation contains aggregate metrics and binned means, not household rows.

## Tanzania measured-current research exhibit

Hartvigsson, Elias; Ahlgren, Erik (2018), Data for: Comparison of load profiles in a mini-grid: assessment of performance metrics using measured and interview-based data, Mendeley Data V1, DOI 10.17632/bbtn9wxhzm.1. https://data.mendeley.com/datasets/bbtn9wxhzm/1 — CC BY-NC 3.0, https://creativecommons.org/licenses/by-nc/3.0/. Numeric originals remain unchanged locally; aggregate timing diagnostics are derived for this noncommercial research demonstration. Raw records and curves are not publicly served. This source is not used to train the household model or set planner inputs. Commercial deployment/training clearance is not established; replace or clear the research exhibit before commercial use.
