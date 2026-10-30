/** Deterministic, uncalibrated planning scenarios. No network or runtime dependencies. */
export const MODEL_TYPE = 'Transparent appliance/profile scenario model';
export const SCENARIO_FACTORS = Object.freeze({ low: 0.7, base: 1, high: 1.35 });
const DAYS_PER_MONTH = 30;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const shape = (pairs) => HOURS.map(hour => pairs[hour] || 0);
const DEFAULT_PROFILES = {
  household: [0.02,0.015,0.012,0.012,0.015,0.025,0.045,0.045,0.03,0.025,0.025,0.03,0.035,0.03,0.03,0.035,0.05,0.075,0.11,0.12,0.1,0.065,0.035,0.021],
  mill: shape({ 9: 1, 10: 1, 11: 1 }),
  refrigeration: Array(24).fill(1),
  salon: shape({ 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1 }),
  welding: shape({ 9: 1, 10: 1, 11: 1 }),
  school: shape({ 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1 }),
  clinic: [1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1]
};
const BUSINESS = ['mill', 'refrigeration', 'salon', 'welding'];
const LIMITS = {
  peoplePerHousehold: [1, 20, 4.5], connectionPercent: [0, 100, 60],
  householdKWhPerMonth: [0, 2000, 20], householdNoncoincidentKW: [0, 20, 0.35],
  connectionGrowthPercent: [0, 500, 20], applianceGrowthPercent: [0, 500, 25],
  productiveUseGrowthPercent: [0, 500, 20],
  schoolCount: [0, 100000, 0], clinicCount: [0, 100000, 0],
  schoolKWhPerDay: [0, 10000, 3], clinicKWhPerDay: [0, 10000, 5],
  schoolNoncoincidentKW: [0, 10000, 1.5], clinicNoncoincidentKW: [0, 10000, 2.5],
  millCount: [0, 100000, 0], millPowerKW: [0, 1000, 7.5], millHoursPerDay: [0, 24, 3], millDaysPerMonth: [0, 30, 22],
  refrigerationCount: [0, 100000, 0], refrigerationPowerKW: [0, 1000, 0.15], refrigerationHoursPerDay: [0, 24, 24], refrigerationDaysPerMonth: [0, 30, 30],
  salonCount: [0, 100000, 0], salonPowerKW: [0, 1000, 1.2], salonHoursPerDay: [0, 24, 6], salonDaysPerMonth: [0, 30, 26],
  weldingCount: [0, 100000, 0], weldingPowerKW: [0, 1000, 3], weldingHoursPerDay: [0, 24, 3], weldingDaysPerMonth: [0, 30, 20]
};
const numeric = value => typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
const firstFinite = (...values) => values.map(numeric).find(value => Number.isFinite(value) && value >= 0);
const sum = values => values.reduce((total, value) => total + value, 0);
const max = values => Math.max(0, ...values);

function siteCount(site, name) {
  const plural = name === 'school' ? 'schools' : name === 'clinic' ? 'clinics' : name;
  return firstFinite(site[`${name}Count`], site[plural], site.services?.[`${name}Count`], site.facilities?.[plural], site.businesses?.[name]) ?? 0;
}

/** Survey inputs are deliberately not used as mini-grid demand or household size. */
export function defaultInputs(site = {}, surveySummary = null) {
  site = site && typeof site === 'object' ? site : {};
  const defaults = Object.fromEntries(Object.entries(LIMITS).map(([key, [, , value]]) => [key, value]));
  for (const type of [...BUSINESS, 'school', 'clinic']) defaults[`${type}Count`] = Math.min(100000, siteCount(site, type));
  return defaults;
}

function sanitize(site, supplied) {
  const defaults = defaultInputs(site);
  const warnings = [];
  const inputs = {};
  supplied = supplied && typeof supplied === 'object' && !Array.isArray(supplied) ? supplied : {};
  for (const [key, [minimum, maximum]] of Object.entries(LIMITS)) {
    const hasValue = Object.prototype.hasOwnProperty.call(supplied, key);
    const parsed = numeric(supplied[key]);
    const valid = Number.isFinite(parsed);
    inputs[key] = Math.min(maximum, Math.max(minimum, valid ? parsed : defaults[key]));
    if (hasValue && (!valid || parsed !== inputs[key])) warnings.push(`${key}: invalid or out-of-range value replaced/clamped to ${inputs[key]}.`);
  }
  return { inputs, warnings };
}

function profilesFrom(templates, warnings) {
  const profiles = {};
  for (const [key, fallback] of Object.entries(DEFAULT_PROFILES)) {
    const candidate = templates?.[key];
    const valid = Array.isArray(candidate) && candidate.length === 24 && candidate.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0) && sum(candidate) > 0;
    if (candidate !== undefined && !valid) warnings.push(`${key} profile: expected 24 finite nonnegative values with a positive sum; using explicit default shape.`);
    const values = valid ? candidate : fallback;
    // Scale before summing so even very large finite template weights are safe.
    const scale = max(values);
    const total = sum(values.map(value => value / scale));
    profiles[key] = values.map(value => (value / scale) / total);
  }
  return profiles;
}

/** Normalize a 24-hour shape and return kW for a requested average daily energy (kWh). */
export function dailyProfile(dailyKWh, hourlyShares = DEFAULT_PROFILES.household) {
  const warnings = [];
  const profile = profilesFrom({ household: hourlyShares }, warnings).household;
  const energy = Math.max(0, Number.isFinite(numeric(dailyKWh)) ? numeric(dailyKWh) : 0);
  return profile.map(share => energy * share); // Each bin is one hour.
}

function annualSummary(months) {
  const totalKWh = sum(months.map(month => month.totalKWh));
  return {
    totalKWh, householdKWh: sum(months.map(month => month.householdKWh)),
    businessKWh: sum(months.map(month => month.businessKWh)), servicesKWh: sum(months.map(month => month.servicesKWh)),
    averageMonthlyKWh: totalKWh / months.length, maxPeakKW: max(months.map(month => month.peakKW))
  };
}

/**
 * Calculate 24 model months. Profile templates are 24 average-day energy shares,
 * not measured data; each profile is normalized. Low/high are assumption envelopes.
 */
export function calculateDemand(site = {}, suppliedInputs = {}, profileTemplates = {}) {
  site = site && typeof site === 'object' ? site : {};
  const { inputs, warnings } = sanitize(site, suppliedInputs);
  const profiles = profilesFrom(profileTemplates, warnings);
  const rawPopulation = firstFinite(site.population, site.populationPeople, site.people, site.totalPopulation, site.population_people) ?? 0;
  const populationPeople = Math.min(1e9, rawPopulation);
  if (rawPopulation > populationPeople) warnings.push('Population exceeds the planning range and has been capped at 1 billion people.');
  if (!populationPeople) warnings.push('Site population is missing or zero; household demand is zero. Enter site population in the source data before household planning.');
  const potentialHouseholds = populationPeople / inputs.peoplePerHousehold;
  const monthly = [];
  for (let month = 1; month <= 24; month++) {
    const progress = (month - 1) / 23;
    const connectionShare = Math.min(1, inputs.connectionPercent / 100 * (1 + inputs.connectionGrowthPercent / 100 * progress));
    const connections = potentialHouseholds * connectionShare;
    const applianceGrowth = 1 + inputs.applianceGrowthPercent / 100 * progress;
    const businessGrowth = 1 + inputs.productiveUseGrowthPercent / 100 * progress;
    const householdKWh = connections * inputs.householdKWhPerMonth * applianceGrowth;
    const businessLoads = Object.fromEntries(BUSINESS.map(type => [type, inputs[`${type}Count`] * inputs[`${type}PowerKW`] * inputs[`${type}HoursPerDay`] * inputs[`${type}DaysPerMonth`] * businessGrowth]));
    const serviceLoads = { school: inputs.schoolCount * inputs.schoolKWhPerDay * DAYS_PER_MONTH, clinic: inputs.clinicCount * inputs.clinicKWhPerDay * DAYS_PER_MONTH };
    const businessKWh = sum(Object.values(businessLoads));
    const servicesKWh = sum(Object.values(serviceLoads));
    const dailyProfile = HOURS.map(hour => {
      const householdKW = householdKWh / DAYS_PER_MONTH * profiles.household[hour];
      const businessKW = sum(BUSINESS.map(type => businessLoads[type] / DAYS_PER_MONTH * profiles[type][hour]));
      const servicesKW = sum(Object.keys(serviceLoads).map(type => serviceLoads[type] / DAYS_PER_MONTH * profiles[type][hour]));
      return { hour, householdKW, businessKW, servicesKW, totalKW: householdKW + businessKW + servicesKW };
    });
    const hourlyKW = dailyProfile.map(bin => bin.totalKW);
    const peakKW = max(hourlyKW);
    const householdNameplate = householdKWh > 0 ? Math.max(connections * inputs.householdNoncoincidentKW * applianceGrowth, max(dailyProfile.map(bin => bin.householdKW))) : 0;
    const businessNameplate = sum(BUSINESS.map(type => businessLoads[type] > 0 ? Math.max(inputs[`${type}Count`] * inputs[`${type}PowerKW`] * businessGrowth, businessLoads[type] / DAYS_PER_MONTH * max(profiles[type])) : 0));
    const serviceNameplate = sum(Object.keys(serviceLoads).map(type => serviceLoads[type] > 0 ? Math.max(inputs[`${type}Count`] * inputs[`${type}NoncoincidentKW`], serviceLoads[type] / DAYS_PER_MONTH * max(profiles[type])) : 0));
    const totalKWh = householdKWh + businessKWh + servicesKWh;
    monthly.push({ month, connections, householdKWh, businessKWh, servicesKWh, totalKWh, dailyKWh: totalKWh / DAYS_PER_MONTH, peakKW, noncoincidentPeakKW: householdNameplate + businessNameplate + serviceNameplate, loadFactor: peakKW ? totalKWh / (DAYS_PER_MONTH * 24 * peakKW) : 0, hourlyKW, dailyProfile, businessLoads, serviceLoads });
  }
  const scenarios = {};
  for (const [name, factor] of Object.entries(SCENARIO_FACTORS)) {
    const scenarioMonths = monthly.map(row => ({ ...row, householdKWh: row.householdKWh * factor, businessKWh: row.businessKWh * factor, servicesKWh: row.servicesKWh * factor, totalKWh: row.totalKWh * factor, dailyKWh: row.dailyKWh * factor, peakKW: row.peakKW * factor, noncoincidentPeakKW: row.noncoincidentPeakKW * factor, hourlyKW: row.hourlyKW.map(value => value * factor), dailyProfile: row.dailyProfile.map(bin => ({ hour: bin.hour, householdKW: bin.householdKW * factor, businessKW: bin.businessKW * factor, servicesKW: bin.servicesKW * factor, totalKW: bin.totalKW * factor })), businessLoads: Object.fromEntries(Object.entries(row.businessLoads).map(([key,value]) => [key,value * factor])), serviceLoads: Object.fromEntries(Object.entries(row.serviceLoads).map(([key,value]) => [key,value * factor])) }));
    scenarios[name] = { name, factor, monthly: scenarioMonths, firstMonth: scenarioMonths[0], year1: annualSummary(scenarioMonths.slice(0, 12)), year2: annualSummary(scenarioMonths.slice(12)) };
  }
  const base = scenarios.base;
  const firstMonth = base.firstMonth;
  const assumptions = [
    'Uncalibrated scenario model: low/base/high are 0.70/1.00/1.35 demand multipliers, not confidence intervals, forecasts, or measured validation.',
    `${inputs.peoplePerHousehold} people per household is a planning assumption; source population counts people. Survey hhsize is not used. Fractional connections represent planning equivalents.`,
    `${inputs.householdKWhPerMonth} kWh per connected household per 30-day month is an explicit scenario assumption. Grid-connected household survey evidence is only a contextual proxy, not direct mini-grid demand.`,
    'Each model month has 30 days. All profiles describe an average day; business operating days are averaged across that month. They do not resolve individual operating-day peaks or seasonal variation.',
    'Connection uptake applies only to households. Specified businesses, schools, and clinics are separate connected anchor loads, including when household connection uptake is zero.',
    'Month 1 to 24 growth is linear. Connection growth is relative to initial uptake and capped at 100%; appliance growth raises household energy per connection; productive-use growth raises business energy. Public-service loads stay constant.',
    'Diversified peak is the maximum of the summed hourly load profiles. Noncoincident peak sums assumed connected/nameplate loads with a floor at each category profile maximum; neither is a surge or equipment-sizing estimate.',
    `${inputs.schoolKWhPerDay} kWh/school/day and ${inputs.clinicKWhPerDay} kWh/clinic/day are separate facility-load assumptions.`,
    'No power loss, battery loss, generation reserve, unmet load, tariff response, or measured calibration is included.'
  ];
  return {
    modelType: MODEL_TYPE, inputs, populationPeople, potentialHouseholds, daysPerMonth: DAYS_PER_MONTH,
    assumptions, validationWarnings: warnings, scenarios, monthly: base.monthly, firstMonth, year1: base.year1, year2: base.year2,
    hourlyKW: firstMonth.hourlyKW, dailyProfile: firstMonth.dailyProfile,
    breakdown: [['household','Households','householdKWh'],['business','Businesses','businessKWh'],['services','Public services','servicesKWh']].map(([key,label,field]) => ({ key, label, monthlyKWh: firstMonth[field], share: firstMonth.totalKWh ? firstMonth[field] / firstMonth.totalKWh : 0 })),
    drivers: [
      { label: 'Connected household equivalents', value: firstMonth.connections, unit: 'households', detail: 'Population ÷ assumed people per household × household uptake.' },
      { label: 'Household energy intensity', value: inputs.householdKWhPerMonth, unit: 'kWh/household/month', detail: 'Explicit scenario assumption, before appliance growth.' },
      { label: 'Business anchors', value: sum(BUSINESS.map(type => inputs[`${type}Count`])), unit: 'businesses', detail: 'Count × kW × operating hours/day × operating days/month.' },
      { label: 'Public-service anchors', value: inputs.schoolCount + inputs.clinicCount, unit: 'facilities', detail: 'Facility count × assumed daily facility energy.' }
    ],
    scenarioComparison: Object.values(scenarios).map(scenario => ({ name: scenario.name, factor: scenario.factor, firstMonthKWh: scenario.firstMonth.totalKWh, firstMonthPeakKW: scenario.firstMonth.peakKW, year1KWh: scenario.year1.totalKWh, year2KWh: scenario.year2.totalKWh }))
  };
}

export function compareScenarios(site, inputs, profileTemplates) {
  return calculateDemand(site, inputs, profileTemplates).scenarioComparison;
}
