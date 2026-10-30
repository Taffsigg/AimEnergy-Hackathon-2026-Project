# Deployment path: prototype to operator pilot

As of **30 October 2026**, AimEnergy can run privately as a Node service or container with a browser UI, REST API, portable trained survey-proxy model, reproducible evaluation and a transparent village planning engine. That technical deployment is available now. It does not establish field performance, bankability, equipment sizing accuracy or calibrated mini-grid demand intervals.

The proposed path to an evidence-backed operator deployment is **five to six months, through March–April 2027**, conditional on an operator partnership, lawful access to sufficiently representative meter data and passing the gates below. These are planning milestones, not guaranteed delivery dates or accuracy promises. Procurement, permissions, data quality or failed validation can extend the schedule.

| Period | Work and concrete output | Gate to proceed |
| --- | --- | --- |
| 30 Oct–Nov 2026 | Private prototype review; select operator and target use case; agree site eligibility, consent/legal basis, sharing agreement, ownership, retention and permitted outputs. Define a meter-data schema and baseline evaluation protocol before examining held-out outcomes. | Operator sponsor and data steward agree the purpose, access controls, responsible parties and written data-sharing terms. No public rollout using household microdata. |
| Dec 2026 | Acquire authorized interval-meter data, customer connection dates, productive-use inventories, service availability and relevant weather/calendar context. Validate timestamps, outages, missingness, units and train/site boundaries; establish non-ML and operator baselines. | Sufficient usable independent sites and time coverage for the proposed decision; gaps and bias documented. Otherwise narrow the use case or extend collection. |
| Jan 2027 | Train and calibrate against measured demand, separating training, tuning/calibration and final held-out **sites**, with chronological checks where appropriate. Examine energy, peak/timing and interval coverage, including sparse/cold-start sites. Freeze acceptance thresholds jointly with the operator before the final test. | Held-out site results beat agreed baselines and meet pre-agreed errors/coverage for the actual use case. Survey-proxy scores alone cannot pass this gate. |
| Feb 2027 | Test transfer to a second country or materially different service context with a local partner; document feature availability, tariffs, appliance patterns and domain shift. Run private shadow forecasts, usability reviews, privacy/security review and concurrent-load/latency tests against agreed expected traffic. | Country/context limits and failure modes are explicit; security findings and load-test bottlenecks are resolved or accepted with scope restrictions. No claim of universal geographic validity. |
| Mar 2027 | Limited operator pilot with human review, forecast-versus-meter monitoring, override records, incident response, rollback and retraining criteria. Keep engineering/sizing and investment approvals under accountable professional review. | Operator signs off pilot usefulness, data handling, monitoring, support ownership and tested recovery. Pause expansion if data drift, errors or coverage fail thresholds. |
| Mar–Apr 2027 | Production readiness review and staged deployment for the validated scope: authenticated access, TLS, secrets handling, backups where state exists, deployment rollback, dependency/image patch policy, service monitoring and support runbook. | Written go/no-go based on independent measured-site evaluation, pilot outcomes and operational readiness. Broader use requires additional validation. |

## Run the private prototype now

From the app directory, run `npm test` and `npm start`. Node 20+ is required; Node 22 is the configured container/CI baseline; local execution was checked on Node 24. No npm install is needed for serving or tests. The committed public data/model artifacts support inference without Python. Retraining uses the separate documented data pipeline and should not run inside the serving container.

```sh
docker build -t aimenergy:local .
docker run --rm --name aimenergy -p 127.0.0.1:4173:4173 aimenergy:local
```

Open `http://127.0.0.1:4173` and inspect `/api/health`. The container binds internally to `0.0.0.0`, while the example publishes only to host loopback. The image runs as the non-root `node` user and copies only `package.json`, `server.mjs` and curated `dist` assets. The `.dockerignore` allowlist excludes raw Data/Models, training scripts, caches and microdata file formats. The image health check verifies process liveness; readiness additionally requires `modelReady:true` when household inference is needed. A missing model does not disable scenario planning.

For a private pilot, place the service behind an authenticated TLS reverse proxy or private access gateway, configure upstream request/rate limits, restrict allowed users and centralize operational metrics without request bodies. Use a read-only container filesystem and resource limits where the platform supports them. Do not expose the unauthenticated prototype directly to the public internet. The supplied GitHub Actions workflow runs JavaScript tests and builds an image; it does **not** publish an image, provision hosting or deploy publicly. Validate the image on the chosen host before rollout.

Current safeguards include a 64 KiB JSON body cap, finite input/type checks, static path bounds, restricted methods, no raw household request logging, response security headers and a bounded per-process rate map. They do not replace operator authorization, a release privacy review, comprehensive penetration testing, authenticated tenancy or production service management. Public model/aggregate assets remain downloadable by design for offline browser use.

Before each release, record the model/artifact version, source permissions, evaluation and calibration scope, accepted risks, rollback image and operator approver. Monitor real outcomes after release. Recalibrate only with authorized evidence and re-run untouched site/context evaluation before expanding claims or coverage.
