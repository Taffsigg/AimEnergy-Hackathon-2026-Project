# Operator data sharing and validation proposal

This is a proposal. No operator connection, upload, data exchange or privacy guarantee is implemented.

## Minimum useful shared unit

Use operator-approved site/month aggregates. A suggested record contains: pseudonymous site ID, country/coarse region, months since connection, aggregate billed or metered kWh with an explicit measurement definition, active household/business/service connection counts, supply availability/outage hours, productive-use categories, applicable tariff metadata, and quality flags. Separate generation from customer consumption. Preserve actual meter time resolution internally if later engineering evaluation requires it.

Do not include household names, meter/customer identifiers, payment-account details or exact household coordinates. Check re-identification risk for small groups; aggregate or suppress rare categories as agreed with the operator. Pseudonymisation alone is not a guarantee of anonymity.

## Operating agreement

Agree purpose, allowed users, retention, access controls, deletion process, attribution and redistribution terms before transfer. Keep the operator's raw records under its control where possible. Share only approved aggregates; do not publish them automatically. Return calibration and benchmark results that give the operator a reason to participate.

## Validation design

1. Define the target: customer consumption kWh/site/30days or calendar month, recording the conversion. Keep outage-constrained delivered consumption separate from an estimate of unconstrained demand.
2. Hold out entire sites before fitting or tuning, with later months separated for growth evaluation. Repeated records from one site must not cross the site split.
3. Compare a simple household-count baseline, the transparent scenario model, and any fitted extension. Report sample sizes, observation periods and geographic scope.
4. Report MAE and signed bias in physical units; use a suitable aggregate percentage metric with a declared denominator and zero-load handling. Assess growth at declared horizons.
5. Calibrate intervals on separate data before reporting coverage probabilities; then report empirical coverage and width on untouched evaluation sites.
6. Keep failed sites, low-consumption periods and outages visible in evaluation rather than selecting only good-looking examples.

## Future optional architecture

A documented CSV/JSON aggregate schema is sufficient for an initial partnership. Federated training or more complex privacy technology should be considered only when a concrete operator requirement and evaluation justify it. The hackathon prototype requires no household-level uploads.
