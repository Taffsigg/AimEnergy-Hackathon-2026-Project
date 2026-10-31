# Verification record — ML extension

30 October 2026.

## Passed

- 25 JavaScript tests: scenario engine, all411 village integrations, aggregate evidence, exported ML parity, inference/interval contracts, AI UI event regressions and API validation/security behavior.
- 4 Python private-data audits: household independence, split isolation, leakage exclusions and source/provenance consistency.
- 64-tree model selected on training-only CV; frozen training/calibration/test split 267/89/89 verified. Three Python/JavaScript synthetic parity fixtures match.
- RAMP previously executed 7 categories × 30 seeded days, regenerated identically; normalized shares conserve scenario energy.
- Live local /api/health reports modelReady and planningReady true with RAMP shapes.
- Browser UI shows real metrics, split counts, importance, input flags and geographic groups. Numeric and categorical edits update prediction; applying it changes the planner.
- Desktop 1366 × 900 and mobile 390 × 844 layout inspected. No horizontal overflow observed at the mobile breakpoint. Temporary viewport override reset.
- HTML planning report actually downloaded and inspected: includes model identity, household profile labels/values and limitations. CSV downloaded with 25 rows (header + 24 months), 10 columns.
- Browser error log empty after tested flows. A browser-discovered numeric-input update defect was fixed and covered by a regression test.

## Limits

No operator-metered site validation, current Lamwo household evaluation, causal feature effect, calibrated village-total interval or validated demand-growth forecast was established. Test household MAE 44.14 vs 49.09 baseline; signed bias −28.96; nominal 90% interval covered 77/89 = 86.5%, mean width 154.48 kWh. Rural test n = 18.

Docker is not installed locally, so image build is unverified. The Node 22 container/CI baseline is configured, while local Node 24 execution was tested. Hosting was not provisioned or published; the runnable local API/app and deployment configuration are delivered. Broader browser/device coverage and production hardening remain part of the roadmap.

Screenshot: screenshots/ai-model-lab.png. Example exported report: examples/Orii-Gangodye-AI-report.html. Raw Data and household split membership are excluded from deployment and portable release archives.

## Field assessment release

38 JavaScript tests pass, including eight assessment/provenance tests and five offline snapshot tests; four private-data Python audits also pass. Browser checks verified the passport, sensitivity-ranked questions, valid response saving, before/after comparison, read-only application and demonstration provenance. Manual locations remain user-entered, and every active engine input has a passport entry.

A complete offline pack was prepared. The owned Node server was stopped and independently confirmed unreachable. The browser then reloaded from its snapshot, recovered the draft, accepted a second demonstration answer, recomputed and applied the scenario, and downloaded an assessment HTML report. The server was restored afterward. This is a server-unavailability test, not a claim that every device/network configuration was tested.

The demonstration starts at 1,569.57 kWh/month in Orii Gangodye. A hypothetical mill adds 495 kWh at three equivalent hours per operating day; changing to six hours makes the revision +990 kWh/month. Both answers are explicitly marked Demonstration response. No actual field visit or measured accuracy improvement is claimed.

Desktop 1366×900 and mobile 390×844 were inspected; no page-level horizontal overflow appeared on mobile. The browser error log was empty. The final snapshot was refreshed after source edits and the viewport override reset. Screenshot: screenshots/field-assessment.png. Example export: examples/Orii-Gangodye-demonstration-assessment.html.

## Metered evidence release — 30 October 2026

38 JavaScript regressions pass. Three additional Python tests verify midnight alignment, exclusion of partial days, minute-index gaps, normalization, zero-current rejection, metric units, exact reproduction, all later-day inclusion and retention of the unfavorable RMSE result. The four existing private household-data audits also pass: 45 automated checks total. The current benchmark received an independent review with no material issues.

Browser checks show the new navigation, source count, complete result ledger, correct rounded metrics and caveats. At desktop1366×900 and mobile390×844, no page-level horizontal overflow was observed; charts/tables can scroll inside their panels. Screenshot: screenshots/metered-evidence.png. The JSON resource is checked through the local server; a browser download-event check timed out, so successful download interaction is not claimed.

Tanzania source SHA-256 matches the publisher; no kWh conversion, forest retraining or current-derived planner input was made. KIT archive access succeeded, but throttling/slow throughput prevented complete retrieval; its partial archive is explicitly excluded from validation and release ZIPs. No measured kWh/cold-start validation or growth accuracy is established.

The final 23-asset offline snapshot reached Ready, was reloaded, and displayed the Metered evidence view with all four result rows. Temporary viewport overrides were reset. Portable and private ZIP integrity/exclusion checks passed; partial files and request headers/cookies are excluded.

## Landing-page release — version 3.2.0

The root URL now serves the AimEnergy landing page; planner.html preserves the full application. All38 JavaScript regressions pass with updated checks for separate entry pages, JPEG serving and the expanded offline allowlist. Five offline tests also pass after adding fragment canonicalization assertions.

Desktop1366×900 and mobile390×844 layouts were inspected without page-level horizontal overflow. The mobile menu opens/closes, Escape returns focus, the actual product image loads, the household-model deep link opens the model lab, and Home returns to the landing page. The interactive preview uses real Orii Gangodye inputs and the shared engine: displayed energy changes1,570→2,065kWh/month when a hypothetical mill is added. It does not overwrite saved planner inputs.

The27-asset field-v4 snapshot reached Ready. With the verified owned server stopped, the landing page and preview worked. An initial offline section link exposed a cache-key fragment issue, which was fixed and covered by assertions. The final server-unavailability retest successfully navigated field→Home/landing→planner.html#field with the offline-ready indication and assessment workspace intact. The server was restored afterward. No universal browser/device offline guarantee is claimed.

This is an integrated local prototype release; no public hosting deployment was performed. Screenshot: screenshots/landing-page.jpg.

## Satellite and drone release — version 3.3.0

42 JavaScript checks pass, adding bounded WGS84 imports, malformed/projected/open-ring rejection, source/date checks, fractional and declining annual histories, zero-base handling, raster pixel/type limits and restored-image validation. Source imagery SHA-256 matches the public manifest. A bounded independent review identified two saved-state issues (null entries and bypassed image validation); both were corrected before handoff.

Browser QA verified the actual2024 satellite crop with village boundary and visible EOxCloudless/EOX/Copernicus attribution, honest missing annual-history state, local GeoJSON import, PNG/JPEG overlay import, CSV history import, year selection, restoration after reload and actual evidence JSON download. QA sources were explicitly labelled synthetic; the test imports were removed afterward. The exported QA file was inspected for site identity, source manifest, geometry, history and raster presence. No real drone survey is claimed.

Desktop1366×900 and mobile390×844 were checked without page-level horizontal overflow. The mobile navigation scrolls and centers the active workspace. Both the real satellite image and AI illustration loaded. The final33-asset field-v5 snapshot reached Ready and the new workspace reloaded from that prepared application snapshot. No additional server-unavailability test was performed for this release; the prior v4 cross-page test remains recorded separately. The browser error log was empty. Viewport overrides were reset. Screenshot: screenshots/satellite-drone-evidence.jpg.

Google annual village-count aggregation remains not_acquired: temporary raster processing installation failed for insufficient local disk capacity. The public dataset is accessible; no history values were fabricated. Satellite context and imported annotations do not validate village kWh or alter demand assumptions automatically. The EOX crop has noncommercial/share-alike asset terms; artwork is explicitly AI-generated concept imagery. No cloud deployment was performed.

## DRC geographic benchmark — version 3.4.0, 31 October 2026

44 JavaScript tests pass, including new DRC ledger/unavailable-state checks and expanded offline-asset assertions. Two new Python checks pass for weighted baselines/metrics, finite probability-edge scoring, complete-area separation, exclusion of missing unconnected purchase targets, attrition sensitivity and isolation of held-out outcomes from predictions. Earlier unrelated Python suites were not rerun for this release.

All eight source hashes match Harvard's original-file MD5 checksums. The script performs 24 fixed geographic folds across household/SME uptake/purchase tasks and primary/attrition-excluded analyses. A bounded independent review found one cross-target wording issue, corrected before handoff; no substantive leakage or metric issue remained. Result script/protocol hashes and the locally served JSON were verified. The Uganda model and planner assumptions are unchanged.

Browser QA inspected the primary ledger, every-area tables, unfavorable SME results and expanded attrition sensitivity. Desktop 1366×900 and mobile 390×844 had no page-level horizontal overflow; wide tables scroll within their panels. No browser errors were recorded. The DRC download-event check timed out, so successful browser download interaction is not claimed; its link and served JSON contents were verified separately. Screenshot: screenshots/drc-benchmark.jpg. Temporary viewport overrides were reset.

The 35-asset field-v6 pack reached Ready and the DRC workspace rendered after reload. No additional server-unavailability test was performed for this release. No individual respondent predictions/rows were exported, no public hosting deployment was performed, and purchase-proxy results do not establish direct-meter, Uganda, growth or calibrated-interval accuracy.

## Community USSD release — version 3.5.0, 31 October 2026

48 JavaScript tests pass. Four new community checks cover consent/completion gates, household/business flows, appliance intent, invalid villages/choices/hours, cancellation, inactivity expiry, stored-record validation, fixed simulation provenance, arbitrary-property stripping and village-scoped passport evidence. Offline assertions include the three new assets. After the final consent/confirmation refinement, the four affected tests passed again. Unrelated Python suites were not rerun.

Browser QA completed business and household flows, rejected an invalid village code, reviewed a response, inspected passport details, and exercised removal/undo. A 38-asset field-v7 pack reached Ready. The verified owned server was stopped and port 4173 confirmed unreachable. The browser reloaded, completed a household response, reviewed it, reloaded again with review status retained, opened the passport and downloaded both response and passport JSON. Actual downloaded files retained consent, simulation method/channel, review time and matching village answers. No phone number or automatic model-input changes were introduced; Overview stayed at 1,570 kWh/month and 74 assumed connections. The server was restored.

Desktop 1366x900 and mobile 390x844 had no page-level horizontal overflow. The active mobile navigation was visible. Browser error logs were empty; viewport overrides were reset. Screenshot: screenshots/community-ussd.jpg. One reviewed household simulation remains for demonstration; the screenshot also shows an unsubmitted business preview. These are not real survey records.

No live provider, service code, cellular traffic, SMS, identity verification, shared backend or automatic synchronization was implemented or tested. Server unavailability verifies this prepared browser snapshot, not universal device/network coverage.
