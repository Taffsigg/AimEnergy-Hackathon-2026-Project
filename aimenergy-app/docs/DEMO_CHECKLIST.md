# Demo and submission checklist

## Before recording

- Start npm start and open the printed local address. Close any duplicate server if the port is occupied.
- Test the page visually on the presentation laptop and at a narrow/mobile width. Desktop and mobile browser checks are recorded in VERIFICATION.md.
- Open Demo story and start the journey. Reset assumptions so saved local state does not change the rehearsed numbers.
- Save Baseline; add one mill; save With grain mill. Confirm the monthly increase is495 kWh under default mill assumptions.
- Test village search, map selection, manual site validation, advanced growth controls and saved comparisons.
- Export HTML, CSV and JSON. Open HTML and use Print/Save as PDF; ensure the assumptions and validation limits accompany results.
- Check whether Evidence & method shows RAMP or explicit fallback profile shapes. Never call the fallback RAMP.
- Keep a local source ZIP and exported report available if the network fails. Maps and calculations do not need a live map API.

## Submission assets

- Working prototype/model and source package.
- Three-minute pitch: docs/PITCH.md.
- One-page impact estimate: docs/IMPACT_ESTIMATE.md.
- Prototype demo video if the portal requests it; supplied schedule mentions3–5 minutes.
- Operator sharing and validation proposal: docs/OPERATOR_DATA_SHARING.md.

## Claims to check

-411 villages;39 candidate villages;25 existing records covering24 villages.
-445 unique survey households, not28,625 independent households.
-Payment-derived kWh, not meter readings; no Lamwo household survey sample established.
-Low/high scenario envelopes, not90% confidence intervals.
-Average-day simulated peak, not an inverter/battery/PV recommendation.
-Growth assumptions, not empirically learned adoption trajectories.
-No claimed measured accuracy, prevented outages, avoided capital expenditure or prize outcome.

The supplied schedule says submissions1 November 2026 at 12pm EST. Confirm the portal's exact timezone and final asset requirements directly before submission.

## AI extension

Open AI model lab. Verify the 44.1 vs49.1 held-out MAE cards,86.5% observed interval coverage and267/89/89 split. Edit sleeping rooms and confirm immediate prediction updates. Set rural/region scenario inputs deliberately; defaults are not observed village characteristics. Apply the result and inspect the changed planner. Export a planning report and confirm AI profile assumptions accompany it. Model card, Data/manifest, API and the gated March–April2027 deployment roadmap are included. See MODEL_CARD.md for bias and scope.

## Metered evidence release

Open Metered evidence: verify 40,809 current records, four later complete days, one site and zero unseen-site kWh tests. Show the Minigrid1b day2 RMSE counterexample. Current shares must not be described as energy shares. Data/raw/metered/tanzania contains the acquired local source; KIT raw acquisition is incomplete and its .part file is not evidence. The aggregate exhibit is noncommercial research under CC BY-NC3.0, separate from household model training.

Refresh the offline pack after deployment, wait for Ready, reload, then verify Metered evidence loads. The operator template is intentionally blank; the draft outreach has not been sent. See PILOT_PROTOCOL.md and METERED_EVIDENCE.md.
