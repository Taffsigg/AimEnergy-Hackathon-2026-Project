# Demand scenario methodology

The dashboard uses a **Transparent appliance/profile scenario model**. It is deterministic and uncalibrated. Its low, base, and high cases are transparent assumption envelopes. They are not confidence intervals, a statistical forecast, or evidence of measured validation. The model does not claim to implement RAMP; an optional external hourly template only supplies a normalized load shape.

## Population and household assumptions

Site population is a count of **people**. Potential household equivalents are `population people / assumed people per household`. The default **4.5 people/household** is a planning assumption, not an inferred household count and not the survey `hhsize` field. Household connection uptake is applied to those household equivalents. Fractional connections preserve continuous scenario comparisons; they are not a count of contracted customers.

The default **20 kWh per connected household per 30-day month** is an explicit mini-grid scenario assumption. Grid-connected household survey evidence can provide context but does not directly establish mini-grid consumption, connection uptake, load shape, appliance ownership, or willingness to pay. `defaultInputs` intentionally does not turn survey summary statistics into household size or demand. Users should replace these assumptions after local customer and appliance surveys.

## Monthly energy

Each model month contains 30 days, so model years contain 360 days. The energy series has 24 months.

| Sector | Monthly energy calculation | Default assumption |
| --- | --- | --- |
| Household | connected household equivalents × kWh/household/month × appliance growth | 20 kWh/household/month |
| Mill | count × operating kW × hours/day × days/month × productive-use growth | 7.5 kW × 3 h × 22 days |
| Refrigeration | count × average operating kW × hours/day × days/month × productive-use growth | 0.15 kW × 24 h × 30 days |
| Salon | count × operating kW × hours/day × days/month × productive-use growth | 1.2 kW × 6 h × 26 days |
| Welding | count × operating kW × hours/day × days/month × productive-use growth | 3 kW × 3 h × 20 days |
| School | facility count × assumed daily energy × 30 | 3 kWh/school/day |
| Clinic | facility count × assumed daily energy × 30 | 5 kWh/clinic/day |

Business counts default to supplied site counts when available and otherwise zero. Site school and clinic counts describe facilities; their energy per facility is a separate assumption. The operating kW field describes energy accounting power: motor starting, intermittent tool duty, and compressor cycling need local assessment. Refrigeration's default represents average operating demand rather than a measured or rated compressor load.

Household connection uptake affects **households only**. Listed businesses and public facilities are assumed separately connected anchor customers. Their demand remains when household uptake is zero. To model no customers, set household uptake and every anchor count to zero.

## Growth

The progress fraction is `(month - 1) / 23`, so month 1 uses initial assumptions and month 24 reaches the stated growth:

- Connection share = `min(100%, initial connection share × (1 + connection growth × progress))`.
- Household intensity = `initial kWh/household/month × (1 + appliance growth × progress)`.
- Business energy = `initial business energy × (1 + productive-use growth × progress)`.

Defaults are 20% relative connection growth, 25% appliance/intensity growth, and 20% productive-use growth over the full 24 months. These are relative changes, not percentage-point changes or annual rates. Household connection and intensity growth compound through multiplication. Service energy stays constant. Negative growth is outside this model's scope and is clamped to zero with a warning. Growth in business energy represents equivalent activity/uptake, not a claim that a particular motor becomes more powerful.

## Hourly profiles and peak treatment

Every sector has an explicit 24-hour profile. Nonnegative template values are normalized to sum to one; each hour receives `monthly sector kWh / 30 × hourly share`. With one-hour bins, the resulting number is kW. Summing the 24 hourly kW bins yields daily kWh, and multiplying by 30 recovers monthly energy. The total diversified peak is the maximum of the **sum** of sector profiles, allowing their different timing to affect coincidence.

The default household shape emphasizes evening use. Milling and welding occupy hours 09–11; salon use occupies hours 10–15; refrigeration is flat; schools occupy hours 08–15; clinics combine continuous and daytime use. These are assumed average-day shapes. Business operating days are averaged over all 30 days; the chart does not resolve operating-day peaks. Default shape normalization means monthly energy is conserved even when a user changes business hours. Changing operating hours changes energy; users must replace the corresponding template if its timing should also change. Optional externally generated shapes have the same interpretation and do not calibrate the model's energy assumptions.

Noncoincident peak sums each category's assumed connected/nameplate kW. Household defaults use 0.35 kW/connection, schools 1.5 kW/facility, and clinics 2.5 kW/facility. For consistency, each category is floored at its own profile maximum, so the sum is never below the diversified peak. Household and business assumptions grow with their respective demand factors. Zero-energy categories contribute zero. The estimate is a scenario diagnostic, not generator, inverter, network, or motor-starting sizing. Load factor is `monthly kWh / (30 × 24 × diversified peak kW)`; zero-demand load factor is zero.

## Scenario envelopes

Low, base, and high multiply every sector's energy and hourly demand by **0.70, 1.00, and 1.35** respectively. Connections are shared between envelopes. This provides coherent, ordered cases for monthly energy and peak; it does not sample independent uncertainties or assign probabilities. The common multiplier keeps load factor unchanged. Connection, appliance, and productive-use assumptions can be edited independently for sensitivity comparisons.

## Validation and limitations

The pure ES module has no network calls, random sampling, or dependencies. Numeric input strings are accepted; nonfinite, negative, and out-of-range values are replaced or clamped using declared field bounds, with `validationWarnings` returned. Missing population yields zero household demand with a warning. Missing facility/business counts become zero. Site population is capped at one billion people to prevent numerical overflow from malformed source values. Bad hourly templates fall back to documented default profiles. Returned outputs remain finite and JSON-serializable.

Tests verify sector and profile energy conservation across all 24 months and three scenarios, ordered envelopes, exact anchor-load energy, monotonic connection and growth behavior, growth endpoints and connection caps, deterministic results, safe custom templates, and malformed-input handling. Run `node --test tests/engine.test.mjs` from the application folder.

The model excludes distribution and conversion losses, battery dispatch, solar resource and seasonality, outages, unmet load, tariffs, affordability, appliance ownership evidence, and measured calibration. It is intended for transparent early-stage demand discussions. Local surveys, time-series measurement, supply simulation, and engineering review are required before investment or equipment sizing.

## JavaScript contract

`defaultInputs(site, surveySummary)` returns the flat editable input object. `calculateDemand(site, inputs, profileTemplates?)` returns model and assumption metadata; sanitized inputs; warnings; `scenarios.low/base/high`; base `monthly[24]`, `firstMonth`, `year1`, and `year2`; first-month `hourlyKW[24]` and `dailyProfile`; sector `breakdown`; `drivers`; and `scenarioComparison`. `compareScenarios` returns that compact comparison directly. `dailyProfile(dailyKWh, hourlyShares?)` provides a standalone conservation-preserving shape helper.

Each monthly row includes `month`, `connections`, `householdKWh`, `businessKWh`, `servicesKWh`, `totalKWh`, `dailyKWh`, `peakKW`, `noncoincidentPeakKW`, `loadFactor`, `hourlyKW`, `dailyProfile`, `businessLoads`, and `serviceLoads`. Hourly bins have `hour`, `householdKW`, `businessKW`, `servicesKW`, and `totalKW`. Annual summaries have `totalKWh`, sector totals, `averageMonthlyKWh`, and `maxPeakKW`. All energy values are kWh, power values kW, shares and load factors fractions, and growth inputs percentages.
