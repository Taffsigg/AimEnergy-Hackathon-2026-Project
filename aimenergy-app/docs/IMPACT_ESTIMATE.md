# AimEnergy: one-page impact estimate

**Purpose.** Help mini-grid developers inspect preconstruction assumptions through real geography, household ML and reproducible appliance timing scenarios.

**Implemented.** 411 real Lamwo villages; four learned geographic context groups; a 64-tree household forest; RAMP profiles; 24-month scenarios; explanations and exports; browser inference and a private deployment API. No live satellite-image pipeline or cold-start metered-site validation is claimed. A separate real-current diagnostic and operator pilot protocol strengthen the evidence package.

| Test evidence | Result |
|---|---|
| Independent household split | 267 train / 89 calibration / 89 untouched test |
| Training-only selection | Five-fold CV MAE 29.38 forest versus 33.30 median |
| Final held-out MAE | 44.14 versus 49.09 kWh/household/month; about 10.1% lower on this sample |
| Signed bias | −28.96 kWh/month; systematic underprediction remains |
| Interval assessment | 90% nominal; 77/89 = 86.5% observed coverage; mean width 154.48 kWh |
| Rural evaluation | 18 test households; descriptive only |
| Target | 2019/2020 survey payments converted using assumed 250 UGX/kWh |
| Metered research | 40,809 Tanzania current records, four later-day shape comparisons at one site; no kWh/cold-start validation |

**Decision demonstration.** At the explicit Orii Gangodye defaults—60% household uptake, 4.5 people per household, 20 kWh/connected household/month and one school at 3 kWh/day—base energy is 1,569.57 kWh/month. A hypothetical 7.5 kW mill × 3 equivalent full-power hours/day × 22 days/month adds 495 kWh, raising total energy to 2,064.57 kWh/month. This is scenario arithmetic, not measured impact or evidence that the mill exists.

**Judging alignment.** Impact: location-specific, inspectable decisions, with future metered error and user assessment-time measurements specified. Innovation: household ML, geographic clustering, RAMP and sensitivity questions linked without confusing their evidence. Sustainability: lightweight inference, reproducible preparation and model/source hashes. Feasibility: runnable UI/API, tests and container configuration. Scalability: manual locations and a planned country-transfer test; universal validity remains unproven.

**Deployment path.** Through March–April 2027, conditional on operator access: agree aggregate data sharing; evaluate measured demand on untouched sites and later periods; test transfer; run a monitored private pilot; pass security, performance and operational readiness gates. Agree acceptance thresholds before final evaluation.

**Claims not established.** Avoided oversizing, reduced outages, capital savings, tariff affordability, bankability and present-village accuracy need independent data and field evaluation. Village low/high values are fixed scenario envelopes, not transferred household conformal intervals. No guaranteed production date or hackathon outcome is asserted.
