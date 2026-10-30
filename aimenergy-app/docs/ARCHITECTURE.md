# AimEnergy architecture

Three evidence domains remain distinct: historical household proxy learning, descriptive village geography and forward planning assumptions.

~~~mermaid
flowchart LR
 A[Local household survey] --> B[Stability and leakage audit]
 B --> C[Train-only preprocessing and selection]
 C --> D[Frozen forest JSON]
 D --> E[Separate residual calibration]
 E --> F[Untouched household evaluation]
 G[Village geographic features] --> H[Context clustering]
 D --> I[Browser and API inference]
 E --> I
 I --> J[Explicit household scenario transfer]
 J --> K[Planning engine]
 L[Business and public-service assumptions] --> K
 M[Cached RAMP timing shapes] --> K
 K --> N[Profiles, growth and reports]
 H --> N
~~~

Data/raw, processed household features and splits remain local. Models/ records the exported artifact, metrics, dependency pins and source/script/artifact hashes. Payment-derived inputs, IDs and inconsistent household size are excluded. Preprocessing is fitted within training folds; the selected model is frozen before calibration. Test households never select the model.

The browser and Node API use the same plain-JSON model and JavaScript preprocessing. Python/JavaScript parity tests use synthetic profiles. Public evaluation plots contain aggregate bins with at least 17 observations. Static serving is restricted to dist/; Data/ and Models/ are not served. Containers copy only the runtime and curated dist assets. Training is a separate controlled task.

Household residual intervals describe the historical payment-derived target. Tariff uncertainty and geographic/temporal shift are outside their calibration. Village low/high envelopes are independent assumptions. Multiplying the forest prediction by connections is a planning scenario; systematic underprediction prevents calling it an unbiased population total.

Operator meter data is required for site-transfer learning, measured profile assessment and growth validation. Automatic feature extraction beyond the pilot, weather/calendar effects, seasonal loads, surge analysis and tariff response remain future components. A private pilot also needs authentication/TLS and the operational controls in the roadmap.
