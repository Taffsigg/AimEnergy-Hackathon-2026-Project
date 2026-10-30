# AimEnergy HTTP API

The Node 20+ server serves the same portable household model and scenario engine used by the browser. It has no npm runtime dependencies. Start with `npm start` (or `node server.mjs`); the default address is `http://127.0.0.1:4173`. `HOST` and `PORT` configure binding. Model and RAMP artifacts are loaded once at startup; restart after replacing them.

This is a technically deployable prototype. Household ML predicts a **survey payment-derived consumption proxy**, not independently metered mini-grid demand. Village demand remains an **uncalibrated planning scenario**. Household residual intervals must not be multiplied by connections and described as calibrated village intervals.

## Endpoints

| Method | Route | Result |
| --- | --- | --- |
| GET / HEAD | `/api/health` | Process liveness, `planningReady`, `modelReady`, profile engine. HTTP 200 can include `modelReady:false`. |
| GET / HEAD | `/api/model` | Metadata, feature schema, calibration description and limitations; no forest trees or training rows. HTTP 503 when ML is unavailable. |
| POST | `/api/predict` | A household proxy prediction, interval, flags and explanatory drivers. |
| POST | `/api/forecast` | 24 model months, low/base/high scenarios, average-day load profiles and transparent assumptions. |

### Household prediction

```sh
curl http://127.0.0.1:4173/api/model
curl -X POST http://127.0.0.1:4173/api/predict \
  -H 'Content-Type: application/json' -d '{"features":{}}'
```

`features` must be an object. Discover accepted feature names, numeric ranges, categorical option values and defaults from `/api/model`'s `feature_schema`; omitted features use the model's documented defaults. Unknown names, invalid options and numbers outside `physical_min`/`physical_max` return 400 (falling back to `min`/`max` if physical bounds are absent). Values outside the observed training `min`/`max` but within physical bounds are accepted and flagged by the model. The empty object deliberately requests the default profile and is useful for a smoke test; operators should submit evidence-based household features.

The response contains `prediction`, `lower`, `upper`, `units`, sanitized `inputs`, `flags`, `drivers`, `driver_kind`, and `model_id`, plus `evidenceScope` and `limitation`. Driver importance is global model importance where `driver_kind` says so; it is not a household-specific causal attribution. The model's calibration metadata and limitations explain the scope of its residual interval.

### Village scenario

```sh
curl -X POST http://127.0.0.1:4173/api/forecast \
  -H 'Content-Type: application/json' \
  -d '{"site":{"population":900,"schools":1,"clinics":1},"inputs":{"connectionPercent":60,"householdKWhPerMonth":20,"millCount":1}}'
```

`site.population` is required, numeric and between 0 and 1 billion people. Optional site fields: `id`, `name`, `country`, `latitude`, `longitude`, `schoolCount`, `clinicCount`, `schools`, `clinics`, `millCount`, `refrigerationCount`, `salonCount`, `weldingCount`. Text labels are limited to 200 characters. Facility counts are nonnegative numeric planning equivalents. The engine uses population and connected anchor counts; coordinates are descriptive and do not fetch external data.

`inputs` is optional. Its keys are the engine's explicit assumptions: `peoplePerHousehold`, `connectionPercent`, `householdKWhPerMonth`, `householdNoncoincidentKW`, `connectionGrowthPercent`, `applianceGrowthPercent`, `productiveUseGrowthPercent`; school/clinic `Count`, `KWhPerDay`, `NoncoincidentKW`; and mill/refrigeration/salon/welding `Count`, `PowerKW`, `HoursPerDay`, `DaysPerMonth`. All values must be finite JSON numbers. Engine ranges clamp out-of-range planning assumptions and disclose changes in `validationWarnings`; returned `inputs` contains the applied values. Do not assume a submitted value was accepted unchanged.

Optionally add `"householdFeatures":{...}` using the household feature schema. Its ML point prediction replaces `inputs.householdKWhPerMonth`. The original household result is returned separately under `householdPrediction`; otherwise that field is null. If the scenario engine clamps an extreme ML point prediction to its planning range, returned `inputs` and `validationWarnings` disclose this. No household interval is propagated into village interval coverage.

Responses include `monthly`, `firstMonth`, `year1`, `year2`, `scenarios`, `hourlyKW`, category breakdown, assumptions and validation warnings. `profileProvenance` identifies cached RAMP shapes (or explicit engine fallback shapes). RAMP shapes are synthetic timing assumptions; they do not supply independently measured village energy. The engine uses seven cached profile arrays from `dist/data/ramp-profiles.json` as its third argument. Each model month is 30 days. Low/base/high use 0.70/1.00/1.35 multipliers, not confidence levels. Peaks describe an average day, not motor surges or equipment sizing.

## Validation, operations and privacy

All POST requests require `Content-Type: application/json` and uncompressed bodies of at most 65,536 bytes, including chunked requests. Top-level and feature/assumption objects reject unsupported keys. Responses use JSON errors: `{"error":"..."}`. Statuses: 400 malformed JSON or invalid fields; 404 unknown routes/files or blocked traversal; 405 unsupported method with `Allow`; 413 body too large; 415 unsupported media type/encoding; 429 rate limited; 503 model unavailable; 500 an unexpected internal error without exposed stack traces.

The API allows 120 requests per remote socket IP per 60-second window, with at most 1,000 tracked clients per process. New clients are rejected at map capacity until counters expire. `Retry-After` accompanies an exceeded individual limit. Proxy forwarding headers are not trusted. Behind a reverse proxy, all clients may share that proxy's allowance: configure authentication, trusted-client limits and request caps at the proxy before broader access. This memory-only limiter is a prototype safeguard, not a distributed abuse-control system.

The server does not store submitted household records, log request bodies, make external inference calls, or serve the project root. Only permitted public assets under `dist` are served; dot paths, traversal and symlink escapes are blocked. Public model artifacts and curated aggregate/geographic data are intentionally downloadable for browser inference. Keep raw household files and training data outside `dist`; a model artifact is not itself a privacy guarantee. Review model leakage and release permissions before external sharing. No built-in login, tenancy, audit retention, TLS termination or durable job storage is provided. Use a private network and an authenticating TLS proxy for an operator pilot.

`createServer(options)` is an async exported factory returning an unbound Node HTTP server. Tests use `listen(0, '127.0.0.1')` for isolated ports. Options include `staticDir`, `modelPath`, `rateLimit`, `rateWindowMs`, and `maxRateClients`; they are server-side configuration, never request fields. `npm test` checks valid inference/scenarios, missing-model behavior, static bounds, malformed/oversized requests, methods and rate limiting.
