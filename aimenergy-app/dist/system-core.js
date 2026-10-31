/** Exploratory solar, battery and diesel feasibility calculations. All costs are illustrative USD. */
export const SYSTEM_DEFAULTS = Object.freeze({
  pvKW: 15, batteryKWh: 40, batteryKW: 10, generatorKW: 15,
  roundTripEfficiency: 0.9, fuelLitresPerKWh: 0.3,
  pvCostPerKW: 1000, batteryCostPerKWh: 250, generatorCostPerKW: 300,
  otherCapex: 10000, omPercent: 2, fuelPrice: 1.2, tariff: 0.3,
  discountPercent: 8, years: 20, replacementYear: 10
});

const LIMITS = Object.freeze({
  pvKW: [0, 1e5], batteryKWh: [0, 1e5], batteryKW: [0, 1e5], generatorKW: [0, 1e5],
  roundTripEfficiency: [0.5, 1], fuelLitresPerKWh: [0, 1e7],
  pvCostPerKW: [0, 1e7], batteryCostPerKWh: [0, 1e7], generatorCostPerKW: [0, 1e7],
  otherCapex: [0, 1e7], omPercent: [0, 100], fuelPrice: [0, 1e7], tariff: [0, 1e7],
  discountPercent: [0, 30], years: [1, 30], replacementYear: [1, 30]
});
const sum = values => values.reduce((a, b) => a + b, 0);
const leapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

export function validateSystemInputs(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('System inputs must be an object.');
  const result = { ...SYSTEM_DEFAULTS };
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(LIMITS, key)) continue;
    const [min, max] = LIMITS[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || ((key === 'years' || key === 'replacementYear') && !Number.isInteger(value))) {
      throw new RangeError(`${key} must be a finite number within ${min}..${max}${key === 'years' || key === 'replacementYear' ? ' and an integer' : ''}.`);
    }
    result[key] = value;
  }
  return result;
}

function coordinate(site, full, short) {
  const value = site?.[full] ?? site?.[short];
  return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
}

/** Validate and convert PVGIS hourly output to cyclic UTC+3 local-year PV yield. */
export function parseSolarResource(raw, site) {
  if (!raw || typeof raw !== 'object' || !raw.inputs || typeof raw.inputs !== 'object' || !Array.isArray(raw.outputs?.hourly)) throw new TypeError('Expected PVGIS 5.3 inputs and outputs.hourly.');
  const location = raw.inputs.location;
  const latitude = location?.latitude, longitude = location?.longitude;
  const siteLat = coordinate(site, 'latitude', 'lat'), siteLon = coordinate(site, 'longitude', 'lon');
  if (![latitude, longitude, siteLat, siteLon].every(Number.isFinite) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || siteLat < -90 || siteLat > 90 || siteLon < -180 || siteLon > 180 || Math.abs(latitude - siteLat) > 0.02 || Math.abs(longitude - siteLon) > 0.02) throw new RangeError('PVGIS coordinates must be legal latitude/longitude values matching the selected site within 0.02 degrees.');
  const peakPower = raw.inputs.pv_module?.peak_power;
  if (typeof peakPower !== 'number' || !Number.isFinite(peakPower) || peakPower <= 0) throw new RangeError('PVGIS pv_module.peak_power must be positive and finite.');
  const records = raw.outputs.hourly;
  if (records.length !== 8760) throw new RangeError('PVGIS resource must contain exactly 8760 hourly records.');
  const first = String(records[0]?.time ?? '');
  const year = Number(first.slice(0, 4));
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || leapYear(year)) throw new RangeError('PVGIS resource must use a non-leap year from 1900 through 2100.');
  const utcYear = Array(8760);
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const stamp = String(record?.time ?? '');
    const match = /^(\d{4})(\d{2})(\d{2}):(\d{2})(\d{2})$/.exec(stamp);
    if (!match) throw new RangeError(`Invalid PVGIS timestamp at record ${i}.`);
    const [, y, mm, dd, hh, minute] = match.map(Number);
    const date = new Date(Date.UTC(y, mm - 1, dd, hh, minute));
    if (y !== year || minute > 59 || hh > 23 || mm < 1 || mm > 12 || date.getUTCFullYear() !== y || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd || date.getUTCHours() !== hh || (i > 0 && date.getTime() - utcYear[i - 1].time !== 3600000)) throw new RangeError(`PVGIS timestamps must be unique, chronological hourly records for one non-leap UTC year (record ${i}).`);
    const power = record.P;
    if (typeof power !== 'number' || !Number.isFinite(power) || power < 0) throw new RangeError(`PVGIS power must be finite and nonnegative (record ${i}).`);
    utcYear[i] = { time: date.getTime(), yield: power / 1000 / peakPower };
    if (utcYear[i].yield > 5) throw new RangeError(`PVGIS normalized hourly yield must be between 0 and 5 kWh/kWp (record ${i}).`);
  }
  const firstDate = new Date(utcYear[0].time), lastDate = new Date(utcYear[8759].time);
  if (firstDate.getUTCMonth() !== 0 || firstDate.getUTCDate() !== 1 || firstDate.getUTCHours() !== 0 || lastDate.getUTCMonth() !== 11 || lastDate.getUTCDate() !== 31 || lastDate.getUTCHours() !== 23) throw new RangeError('PVGIS timestamps must cover the complete UTC year without gaps.');
  const hourlyKWhPerKWp = Array(8760);
  for (let i = 0; i < 8760; i++) hourlyKWhPerKWp[(i + 3) % 8760] = utcYear[i].yield;
  return { siteId: String(site.id), latitude, longitude, year, hourlyKWhPerKWp, source: 'PVGIS', meta: raw.inputs, timezone: 'UTC+3 cyclic year-wrap approximation' };
}

function demandHours(demand) {
  if (!Array.isArray(demand?.monthly) || demand.monthly.length !== 12) throw new TypeError('Demand must include exactly 12 monthly records.');
  return Array.from({ length: 12 }, (_, index) => {
    const month = demand.monthly[index];
    const monthlyKWh = month?.totalKWh;
    const profile = month?.hourlyKW;
    if (typeof monthlyKWh !== 'number' || !Number.isFinite(monthlyKWh) || monthlyKWh < 0 || !Array.isArray(profile) || profile.length !== 24 || profile.some(x => typeof x !== 'number' || !Number.isFinite(x) || x < 0)) throw new RangeError(`Invalid demand data for month ${index + 1}.`);
    const profileTotal = sum(profile);
    const days = new Date(Date.UTC(2021, index + 1, 0)).getUTCDate();
    const bins = Array.from({ length: days * 24 }, (_, h) => profile[h % 24]);
    const binTotal = profileTotal * days;
    return { monthlyKWh, loads: binTotal ? bins.map(value => monthlyKWh * value / binTotal) : bins.map(() => monthlyKWh / bins.length) };
  });
}

export function simulateSystem(demand, resource, suppliedInputs = {}) {
  const inputs = validateSystemInputs(suppliedInputs);
  if (!resource || !Number.isInteger(resource.year) || resource.year < 1900 || resource.year > 2100 || leapYear(resource.year) || !Array.isArray(resource.hourlyKWhPerKWp) || resource.hourlyKWhPerKWp.length !== 8760 || resource.hourlyKWhPerKWp.some(x => typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 5)) throw new RangeError('Solar resource must use a non-leap year from 1900 to 2100 and contain 8760 finite yields in the range 0..5 kWh/kWp.');
  const monthlyDemand = demandHours(demand);
  const annual = { demandKWh: 0, servedKWh: 0, pvKWh: 0, generatorKWh: 0, batteryChargeKWh: 0, batteryDischargeKWh: 0, curtailedKWh: 0, unmetKWh: 0, fuelLitres: 0, endingStoredKWh: 0, initialStoredKWh: 0, unmetHours: 0 };
  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, demandKWh: 0, servedKWh: 0, pvKWh: 0, generatorKWh: 0, unmetKWh: 0 }));
  const hourly = [];
  const minStored = inputs.batteryKWh * 0.2, maxStored = inputs.batteryKWh * 0.95;
  const usable = maxStored - minStored, oneWay = Math.sqrt(inputs.roundTripEfficiency);
  let stored = minStored;
  annual.initialStoredKWh = stored;
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const { monthlyKWh, loads } = monthlyDemand[monthIndex];
    const row = monthly[monthIndex], days = loads.length / 24;
    let monthLoad = 0;
    for (let dayHour = 0; dayHour < loads.length; dayHour++) {
      const yearHour = sum(monthlyDemand.slice(0, monthIndex).map(m => m.loads.length)) + dayHour;
      const loadKWh = loads[dayHour], pvKWh = inputs.pvKW * resource.hourlyKWhPerKWp[yearHour];
      let remaining = loadKWh, chargeKWh = 0, dischargeKWh = 0, generatorKWh = 0, curtailedKWh = 0;
      const direct = Math.min(remaining, pvKWh); remaining -= direct;
      const surplus = pvKWh - direct;
      if (surplus > 0 && usable > 0) {
        chargeKWh = Math.min(surplus, inputs.batteryKW, Math.max(0, maxStored - stored) / oneWay);
        stored += chargeKWh * oneWay;
      }
      curtailedKWh = Math.max(0, surplus - chargeKWh);
      if (remaining > 0 && usable > 0) {
        dischargeKWh = Math.min(remaining, inputs.batteryKW, Math.max(0, stored - minStored) * oneWay);
        stored -= dischargeKWh / oneWay;
        remaining -= dischargeKWh;
      }
      generatorKWh = Math.min(remaining, inputs.generatorKW);
      remaining -= generatorKWh;
      const unmetKWh = remaining;
      const servedKWh = loadKWh - unmetKWh;
      row.demandKWh += loadKWh; row.servedKWh += servedKWh; row.pvKWh += pvKWh;
      row.generatorKWh += generatorKWh; row.unmetKWh += unmetKWh;
      Object.assign(annual, {
        demandKWh: annual.demandKWh + loadKWh, servedKWh: annual.servedKWh + servedKWh,
        pvKWh: annual.pvKWh + pvKWh, generatorKWh: annual.generatorKWh + generatorKWh,
        batteryChargeKWh: annual.batteryChargeKWh + chargeKWh, batteryDischargeKWh: annual.batteryDischargeKWh + dischargeKWh,
        curtailedKWh: annual.curtailedKWh + curtailedKWh, unmetKWh: annual.unmetKWh + unmetKWh,
        fuelLitres: annual.fuelLitres + generatorKWh * inputs.fuelLitresPerKWh,
        unmetHours: annual.unmetHours + (unmetKWh > 1e-9 ? 1 : 0)
      });
      monthLoad += loadKWh;
      hourly.push({ hour: hourly.length, month: monthIndex + 1, loadKWh, pvKWh, chargeKWh, dischargeKWh, generatorKWh, unmetKWh, curtailedKWh, storedKWh: stored });
    }
    // Normalize floating point summation drift to the requested monthly energy.
    row.demandKWh = monthlyKWh;
  }
  annual.endingStoredKWh = stored;
  const capex = inputs.pvKW * inputs.pvCostPerKW + inputs.batteryKWh * inputs.batteryCostPerKWh + inputs.generatorKW * inputs.generatorCostPerKW + inputs.otherCapex;
  const annualOperatingCost = annual.fuelLitres * inputs.fuelPrice + capex * inputs.omPercent / 100;
  const annualRevenue = annual.servedKWh * inputs.tariff;
  const cashflows = [{ year: 0, cost: capex, revenue: 0, net: -capex, discountedNet: -capex }];
  let discountedCosts = capex, discountedEnergy = 0, npv = -capex;
  for (let year = 1; year <= inputs.years; year++) {
    const replacement = year === inputs.replacementYear && year <= inputs.years ? inputs.batteryKWh * inputs.batteryCostPerKWh : 0;
    const cost = annualOperatingCost + replacement, revenue = annualRevenue;
    const factor = (1 + inputs.discountPercent / 100) ** year;
    const discountedNet = (revenue - cost) / factor;
    cashflows.push({ year, cost, revenue, net: revenue - cost, discountedNet });
    npv += discountedNet; discountedCosts += cost / factor; discountedEnergy += annual.servedKWh / factor;
  }
  const warnings = [];
  if (annual.unmetKWh > 0) warnings.push('This exploratory dispatch leaves some demand unmet under the supplied assumptions.');
  if (inputs.batteryKWh > 0 && inputs.batteryKW === 0) warnings.push('Battery energy capacity is present but battery power is zero.');
  warnings.push('Project economics repeat the first-year dispatch each year and reset the battery to its minimum state of charge at the start of every simulated year.');
  return { inputs, annual, monthly, hourly, economics: { capex, annualOperatingCost, annualRevenue, lcoe: discountedEnergy ? discountedCosts / discountedEnergy : null, npv, cashflows }, warnings };
}
