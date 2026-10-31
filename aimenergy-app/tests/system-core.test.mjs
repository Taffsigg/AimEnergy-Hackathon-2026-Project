import test from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_DEFAULTS, validateSystemInputs, parseSolarResource, simulateSystem } from '../dist/system-core.js';

function solar(year = 2021, watts = 0, minute = '00') {
  const hourly = Array.from({ length: 8760 }, (_, index) => {
    const date = new Date(Date.UTC(year, 0, 1 + Math.floor(index / 24), index % 24, Number(minute)));
    return { time: `${date.toISOString().slice(0, 10).replaceAll('-', '')}:${date.toISOString().slice(11, 16).replace(':', '')}`, P: watts };
  });
  return { inputs: { location: { latitude: 2, longitude: 32 }, pv_module: { peak_power: 1 } }, outputs: { hourly } };
}

const site = { id: 7, latitude: 2, longitude: 32 };
function demand(monthKWh = 20, profile = [1, ...Array(23).fill(0)]) {
  return { monthly: Array.from({ length: 12 }, () => ({ totalKWh: monthKWh, hourlyKW: profile })) };
}

test('defaults are complete and validation strictly accepts bounded known values', () => {
  assert.deepEqual(Object.keys(validateSystemInputs({ ignored: 3 })), Object.keys(SYSTEM_DEFAULTS));
  assert.equal(validateSystemInputs({ pvKW: 0, years: 1 }).pvKW, 0);
  for (const invalid of [-1, Infinity, NaN, '2', 1e6]) assert.throws(() => validateSystemInputs({ pvKW: invalid }));
  assert.throws(() => validateSystemInputs({ years: 1.2 }));
  assert.throws(() => validateSystemInputs({ replacementYear: 31 }));
});

test('PVGIS parser converts watts to kWh/kWp and shifts UTC hours cyclically by three', () => {
  const raw = solar(2021, 1000, '10');
  const parsed = parseSolarResource(raw, site);
  assert.equal(parsed.siteId, '7');
  assert.equal(parsed.hourlyKWhPerKWp.length, 8760);
  assert.equal(parsed.hourlyKWhPerKWp[3], 1);
  assert.equal(parsed.hourlyKWhPerKWp[0], 1);
  assert.equal(parsed.timezone, 'UTC+3 cyclic year-wrap approximation');
});

test('PVGIS parser rejects wrong location, gaps, leap year and invalid power', () => {
  const wrongLocation = solar(); wrongLocation.inputs.location.latitude = 2.03;
  assert.throws(() => parseSolarResource(wrongLocation, site), /coordinates/);
  const gap = solar(); gap.outputs.hourly[400].time = gap.outputs.hourly[399].time;
  assert.throws(() => parseSolarResource(gap, site), /timestamps/);
  assert.throws(() => parseSolarResource(solar(2020), site), /non-leap/);
  const badPower = solar(); badPower.outputs.hourly[20].P = -1;
  assert.throws(() => parseSolarResource(badPower, site), /power/);
  const nullPower = solar(); nullPower.outputs.hourly[20].P = null;
  assert.throws(() => parseSolarResource(nullPower, site), /power/);
  const textCoordinate = solar(); textCoordinate.inputs.location.latitude = '2';
  assert.throws(() => parseSolarResource(textCoordinate, site), /coordinates/);
  const illegalCoordinate = solar(); illegalCoordinate.inputs.location.longitude = 181;
  assert.throws(() => parseSolarResource(illegalCoordinate, site), /coordinates/);
  const excessiveYield = solar(2021, 1000); excessiveYield.inputs.pv_module.peak_power = 1e-10;
  assert.throws(() => parseSolarResource(excessiveYield, site), /normalized hourly yield/);
});

test('dispatch conserves each hour, respects battery SOC and exact monthly energy targets', () => {
  const pv = solar(2021, 1000);
  const result = simulateSystem(demand(100), parseSolarResource(pv, site), {
    pvKW: 2, batteryKWh: 10, batteryKW: 2, generatorKW: 1
  });
  assert.equal(result.hourly.length, 8760);
  for (const hour of result.hourly) {
    assert.ok(hour.storedKWh >= 2 - 1e-9 && hour.storedKWh <= 9.5 + 1e-9);
    assert.ok(hour.generatorKWh <= 1 + 1e-9);
    assert.ok(Math.abs(hour.pvKWh + hour.dischargeKWh + hour.generatorKWh - (hour.loadKWh - hour.unmetKWh + hour.chargeKWh + hour.curtailedKWh)) < 1e-7);
  }
  assert.ok(result.monthly.every(row => Math.abs(row.demandKWh - 100) < 1e-9));
  assert.ok(Math.abs(result.annual.demandKWh - 1200) < 1e-8);
  assert.ok(Math.abs(result.annual.servedKWh + result.annual.unmetKWh - result.annual.demandKWh) < 1e-8);
  assert.ok(Math.abs(result.annual.endingStoredKWh - result.annual.initialStoredKWh - result.annual.batteryChargeKWh * Math.sqrt(result.inputs.roundTripEfficiency) + result.annual.batteryDischargeKWh / Math.sqrt(result.inputs.roundTripEfficiency)) < 1e-8);
  assert.equal(result.annual.initialStoredKWh, 2);
  assert.ok(Math.abs(result.annual.endingStoredKWh - result.hourly.at(-1).storedKWh) < 1e-9);
});

test('diesel-only economics match discounted project cashflows; zero served energy has null LCOE', () => {
  const parsed = parseSolarResource(solar(2021, 0), site);
  const result = simulateSystem(demand(100), parsed, {
    pvKW: 0, batteryKWh: 0, batteryKW: 0, generatorKW: 10,
    generatorCostPerKW: 30, otherCapex: 400, omPercent: 2,
    fuelLitresPerKWh: 0.3, fuelPrice: 2, tariff: 1,
    years: 2, replacementYear: 10, discountPercent: 0
  });
  assert.equal(result.economics.capex, 700);
  assert.ok(Math.abs(result.economics.annualOperatingCost - 734) < 1e-8);
  assert.ok(Math.abs(result.economics.annualRevenue - 1200) < 1e-8);
  assert.ok(Math.abs(result.economics.lcoe - (700 + 734 * 2) / 2400) < 1e-10);
  assert.ok(Math.abs(result.economics.npv - 232) < 1e-8);
  const noService = simulateSystem(demand(1), parsed, { pvKW: 0, batteryKWh: 0, batteryKW: 0, generatorKW: 0 });
  assert.equal(noService.economics.lcoe, null);
  const replacement = simulateSystem(demand(0), parsed, {
    pvKW: 0, batteryKWh: 2, batteryKW: 1, generatorKW: 0,
    batteryCostPerKWh: 5, otherCapex: 0, omPercent: 0,
    years: 11, replacementYear: 10, discountPercent: 10
  }).economics;
  assert.equal(replacement.cashflows[9].cost, 0);
  assert.equal(replacement.cashflows[10].cost, 10);
  assert.equal(replacement.cashflows[11].cost, 0);
  assert.ok(Math.abs(replacement.npv - (-10 - 10 / 1.1 ** 10)) < 1e-10);
});
