# Evidence passport and field assessment

The Field assessment workspace implements a source-to-question-to-revision workflow for the selected village.

## Evidence passport

Every active planning parameter carries an evidence type, source and observation date. The original population/building/facility records remain separate from effective scenario inputs. Manual locations are labelled user-entered, never satellite-extracted. A supplied layer without a documented date says Not recorded; app cache timestamps are not observation dates.

The passport distinguishes geographic estimates, mapped references, survey-derived ML outputs, assumed ML profiles, explicit scenario parameters and synthetic timing shapes. User-declared counts, records, reported estimates and demonstration responses remain distinguishable after application. If a later planner edit changes a response value, that old response is no longer presented as the provenance of the current value.

## Priority questions

Start an assessment to freeze a copy of the current site, inputs, ML source and profile provenance. Ten candidate questions cover population, household size, connection uptake, household energy, productive-use counts/hours/days and connected services. The first five unanswered questions are ranked by absolute change in monthly scenario energy across declared test values. Answered questions follow unanswered ones.

Ranges are explicit sensitivity tests, not measured uncertainty distributions, confidence intervals or formal expected value of information. Acquisition costs and decision regret are not modeled. A mill-hours question has zero energy sensitivity until the draft includes a mill. Select Review next priorities to rerank after answers.

Answers save locally as they are edited. Blank means unset, not zero. Invalid values and future/invalid observation dates are rejected; invalid visible answers block application. Only valid answers are saved. Evidence methods are user declarations, not independent verification. Household future electricity use cannot be labelled a field count.

## Apply and retain history

The comparison uses the same active engine and profiles for original and revised inputs. Applying uses the assessment's starting inputs plus its answers, replacing later planner edits; this behavior is stated next to the action. It does not overwrite source records or retrain the ML model. Applied records become read-only. Start a follow-up for a new baseline, or restore a saved applied assessment into the planner.

The applied comparison is retained with the record. Exports contain original inputs, answers, declared methods, dates, notes and scope. Source records, assumptions and assessment responses must not be conflated. Reported or hypothetical future-use estimates are not ground-truth training labels. Future operator-metered observations need their own quality/schema/validation workflow.

## Offline and privacy

Prepare the offline pack while online, then reload once to use its coherent snapshot. Field records stay in browser local storage, independent from cached app assets. No names or contact details are requested. Use anonymous aggregate notes. Export JSON backups; browsers can clear storage. If local storage fails, the app explicitly reports memory-only persistence.

There is no automatic cloud sync or household upload. Download JSON to move a record; save it under Data/field_assessments locally if desired. The static server and deployment image do not expose the project's Data folder. The app does not silently discard old assessment history. Browser quota failures are reported as memory-only operation; export a backup before closing.

## Demo

Use Demo story → Start the demo journey to select Orii Gangodye with default inputs. Open Field assessment and start a record. Set connected grain mills to 1 and choose Demonstration response. The original 1,569.57 kWh/month becomes 2,064.57 kWh/month: a 495 kWh difference. Apply it, inspect the passport, and export the assessment report. This is hypothetical scenario arithmetic, not a field visit or improved measured accuracy.
