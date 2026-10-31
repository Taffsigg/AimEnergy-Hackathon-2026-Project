# AimEnergy: customer value, impact and delivery case

## Problem and solution

**Problem statement:** Mini-grid developers must commit money before knowing how many households and businesses will connect and how much electricity they will buy. Fragmented geographic data, survey assumptions and uncertain uptake make village assessments difficult to compare, verify and revise. Misjudged demand can leave assets underused or communities poorly served.

**Solution statement:** AimEnergy is a planning and field-assessment workspace for mini-grid developers. It combines geographic context, inspectable model evidence, explicit household/business scenarios and an offline evidence passport. It helps a team decide what to verify before committing to a village, and preserves the reasoning when assumptions change.

**First paying customer:** A mini-grid developer or feasibility consultancy assessing a portfolio of candidate villages. The first buyer is its development or planning lead. Government electrification agencies and funders are later customer hypotheses, not confirmed customers.

**Beneficiaries:** Residents, local enterprises, schools and clinics may benefit from better electrification decisions. Operators may benefit from faster assessments and more defensible demand assumptions. These are proposed benefits; AimEnergy has not installed connections or demonstrated improved village service.

**Value proposition:** Move from disconnected assumptions to a reviewable village assessment, identify high-impact field questions, and update the plan without losing its evidence. The commercial hypothesis is lower assessment cost and faster decisions while preserving assessment quality. Predictive accuracy alone is not the sales promise.

## Innovation and alternatives

AI, satellite imagery and mini-grid planning already exist. ESA documents VIDA combining satellite and ground data for electrification planning: https://business.esa.int/projects/vida. Do not claim AimEnergy is the first or that no competing solution exists.

AimEnergy's proposed differentiation is its connected workflow: input-level evidence passports, explicit uncertainty, sensitivity-ranked field questions, offline responses, preserved baselines and reproducible evaluations that retain unfavorable results. This combination is implemented in the prototype; superiority over alternatives and willingness to pay remain to be tested with users. Demand stimulation is an established sector strategy, not an invention of AimEnergy. World Bank/ESMAP discusses it here: https://documents1.worldbank.org/curated/en/099092023192023389/pdf/P1751521d3f58f6f1307c1499619e141b8baef6de8dd.pdf.

## Unit economics: a hypothesis to validate

**Every money figure below is an illustrative assumption in USD, not an operator quote, measured saving, market price or revenue forecast.** The unit is one completed village assessment, not an electricity connection or kWh sold. The fee is for an assessment workflow/report service, not electricity.

| Per village assessment | Illustrative assumption |
|---|---:|
| Current assessment cost, without AimEnergy | $1,000 |
| Operator field/analysis work with AimEnergy, excluding the fee | $600 |
| AimEnergy service fee | $150 |
| Total customer cost with AimEnergy | $750 |
| Net customer saving | $250 / 25% |
| AimEnergy direct delivery cost | $50 |
| Contribution per assessment, before fixed costs | $100 / 66.7% of revenue |

Customer saving = $1,000 − ($600 + $150) = $250. Contribution = $150 − $50 = $100. Direct delivery cost assumes $5 allocated hosting/compute, $30 analyst quality review and $15 support. Confirm staff rates, travel, support burden and cloud bills in the pilot; avoid counting the same work in both operator costs and AimEnergy costs.

At an assumed $2,000 monthly fixed operating cost, 20 paid assessments cover those fixed costs at this contribution, before tax, acquisition costs and other omitted expenses. This is a conditional break-even calculation, not evidence of profitability. At 100 assessments, assumed customer savings total $25,000; village assessments do not equal 100 deployed mini-grids. If assisted operator work actually costs $850 plus the $150 fee, customer savings become zero.

## Village-level impact and evidence

The demonstration village Orii Gangodye has an estimated population of about 555. Default assumptions imply about 74 household connections and one school, with 1,569.57 kWh/month. These are planning scenarios, not actual connections or verified beneficiaries. A hypothetical mill adds 495 kWh/month, increasing scenario energy to 2,064.57 kWh/month, about 31.5%. This shows why productive uses deserve explicit assessment; it does not demonstrate electricity savings, additional income or a viable mill.

The prototype covers 411 Lamwo village records. This is data coverage, not 411 villages served. Separate DRC tests improve household connection prediction relative to a prevalence baseline but show little or negative improvement for purchase prediction. These are prepaid purchase proxies, not direct-meter validation. See DRC_BENCHMARK.md. Do not convert household model error improvements into capital savings.

**Pilot measures:** assessment cost and staff hours per village; elapsed time to a reviewed assessment; proportion of inputs with dated evidence; priority questions verified; revision history completeness; operator adoption/repeat use; connection uptake error and direct-meter kWh error when suitable held-out data becomes available. Count households or enterprises served only after actual implementation and verification.

## Sustainability

AimEnergy is software supporting infrastructure decisions; it has no demonstrated decades-long unattended lifespan. Propose a five-year supported service horizon, conditional on funding and maintenance, with annual support renewal and named ownership. Review dependencies and security quarterly, sources/model performance at each new geography and when monitoring flags drift, and validate new model versions before replacement. Retain source/model versions and exportable records so a model update does not require redoing the entire assessment.

Browser inference, static demo hosting and offline assessment reduce connectivity and compute requirements. A production service still needs supported browsers/devices, access control, backups where state exists, support, quality review and an ongoing maintenance budget. Drones are optional inputs from completed surveys, not required hardware. Commercial use must replace or clear the current noncommercial satellite and Tanzania exhibit assets; CC0 DRC licensing does not clear unrelated assets.

## Feasibility and scalability

**Available now:** a working browser prototype, offline assessment, scenario engine, trained survey-proxy model, separate DRC benchmark, documented data pipeline and exports. No new hardware, drone purchase or continuous paid AI call is required for the prepared demo.

**Months 1–2:** recruit one operator, define target decisions and permissions, document the current workflow/cost, and collect suitable authorized data. **Months 3–4:** run a small 5–10-village shadow assessment pilot, compare time/cost and quality against the existing workflow, and evaluate held-out direct-meter sites if data supports it. **Months 5–6:** limited paid rollout for the validated scope, with authentication, support ownership, monitoring and rollback. Staff roles: software engineer, energy/data analyst and operator field lead; field staff and privacy/security review can be shared partner resources. This is a conditional plan, not a signed partnership or guaranteed date.

Scale by onboarding a developer portfolio, reusing country-specific data connectors and methods, and training local assessment teams. Software and workflows are reusable; demand-model accuracy is not automatically transferable. Each new region requires data rights, feature mapping, local tariff/appliance/context review and validation. Begin with one operator and Lamwo; expand only when benefits and performance are demonstrated. Larger user volumes will also require backend load tests and account/data management that the static prototype does not yet provide.

## Short answer for the mentor

AimEnergy helps mini-grid developers make village investment decisions with clearer demand assumptions and a more focused field assessment. Our first customer is a developer assessing multiple villages. Our proposed value is reduced assessment cost and better evidence for decisions; the pilot will measure both. Our differentiation is the traceable, offline estimate-to-field-to-revision workflow. The prototype works today, but our cost savings, pricing, cross-region performance and supported service lifetime remain hypotheses to validate, rather than outcomes already achieved.
