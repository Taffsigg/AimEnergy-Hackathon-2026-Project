import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/engine.js', import.meta.url), 'utf8');
const { calculateDemand, defaultInputs, dailyProfile, compareScenarios } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const site = { population: 450, schools: 2, clinics: 1 };
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const sum = array => array.reduce((a,b) => a+b,0);

test('households derive from people and an explicit assumption, never survey household-size fields', () => {
  const defaults = defaultInputs(site, { hhsize: 99, meanMonthlyKWh: 800 });
  assert.equal(defaults.peoplePerHousehold, 4.5);
  assert.equal(defaults.householdKWhPerMonth, 20);
  assert.equal(defaults.schoolCount, 2);
  const result = calculateDemand(site, { ...defaults, connectionPercent: 50 });
  close(result.potentialHouseholds, 100);
  close(result.firstMonth.connections, 50);
  close(result.firstMonth.householdKWh, 1000);
  close(result.firstMonth.servicesKWh, 330);
});

test('every scenario and month conserves energy across its profile and all sectors', () => {
  const result = calculateDemand(site, { millCount: 2, refrigerationCount: 4, salonCount: 3, weldingCount: 1 });
  for (const scenario of Object.values(result.scenarios)) {
    assert.equal(scenario.monthly.length, 24);
    for (const row of scenario.monthly) {
      assert.equal(row.hourlyKW.length, 24);
      close(sum(row.hourlyKW) * 30, row.totalKWh);
      close(row.householdKWh + row.businessKWh + row.servicesKWh, row.totalKWh);
      close(sum(row.dailyProfile.map(bin => bin.householdKW)) * 30, row.householdKWh);
      close(sum(row.dailyProfile.map(bin => bin.businessKW)) * 30, row.businessKWh);
      close(sum(row.dailyProfile.map(bin => bin.servicesKW)) * 30, row.servicesKWh);
      close(Math.max(...row.hourlyKW), row.peakKW);
      assert.ok(row.noncoincidentPeakKW + 1e-8 >= row.peakKW);
      assert.ok(row.loadFactor >= 0 && row.loadFactor <= 1 + 1e-10);
    }
    close(scenario.year1.totalKWh, sum(scenario.monthly.slice(0,12).map(row => row.totalKWh)));
    close(scenario.year2.totalKWh, sum(scenario.monthly.slice(12).map(row => row.totalKWh)));
  }
});

test('low/base/high envelopes remain ordered for energy and peaks, with deterministic output', () => {
  const result = calculateDemand(site, { millCount: 1 });
  assert.deepEqual(calculateDemand(site, { millCount: 1 }), result);
  for (let index = 0; index < 24; index++) {
    for (const field of ['totalKWh','peakKW','noncoincidentPeakKW','householdKWh','businessKWh','servicesKWh']) {
      assert.ok(result.scenarios.low.monthly[index][field] <= result.scenarios.base.monthly[index][field]);
      assert.ok(result.scenarios.base.monthly[index][field] <= result.scenarios.high.monthly[index][field]);
    }
  }
  assert.equal(compareScenarios(site, { millCount: 1 }).length, 3);
});

test('business anchors retain exact power × hours × days energy at zero household uptake', () => {
  const result = calculateDemand(site, { connectionPercent: 0, millCount: 2, millPowerKW: 7.5, millHoursPerDay: 3, millDaysPerMonth: 22 });
  assert.equal(result.firstMonth.connections, 0);
  assert.equal(result.firstMonth.householdKWh, 0);
  close(result.firstMonth.businessKWh, 990);
  assert.ok(result.firstMonth.servicesKWh > 0);
  assert.ok(result.assumptions.some(text => text.includes('zero')));
});

test('higher uptake increases household energy and profile peak without altering anchor demand', () => {
  const low = calculateDemand(site, { connectionPercent: 20, millCount: 1 });
  const high = calculateDemand(site, { connectionPercent: 80, millCount: 1 });
  for (let index=0; index<24; index++) {
    assert.ok(high.monthly[index].totalKWh > low.monthly[index].totalKWh);
    assert.ok(high.monthly[index].peakKW >= low.monthly[index].peakKW);
    assert.equal(high.monthly[index].businessKWh, low.monthly[index].businessKWh);
  }
});

test('growth reaches declared month24 assumptions, remains nonnegative, and caps uptake', () => {
  const result = calculateDemand(site, { connectionPercent: 80, connectionGrowthPercent: 50, applianceGrowthPercent: 25, productiveUseGrowthPercent: 20, millCount: 1 });
  close(result.monthly[23].connections, 100);
  close(result.monthly[23].householdKWh, 100*20*1.25);
  close(result.monthly[23].businessKWh, result.firstMonth.businessKWh*1.2);
  for (let index=1; index<24; index++) assert.ok(result.monthly[index].totalKWh >= result.monthly[index-1].totalKWh);
});

test('bad inputs and missing sites produce finite serializable outputs and explain corrections', () => {
  for (const malformed of [null, undefined, {}, { population: Infinity }, { population: Number.MAX_VALUE }]) {
    const result = calculateDemand(malformed, { connectionPercent: Infinity, peoplePerHousehold: 0, householdKWhPerMonth: -20, millCount: NaN, schoolCount: '2', connectionGrowthPercent: -10 });
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('null'), 'No NaN/Infinity should serialize into null.');
    assert.ok(result.validationWarnings.length >= 4);
    assert.equal(result.inputs.schoolCount, 2);
    assert.equal(result.inputs.householdKWhPerMonth, 0);
    assert.equal(result.inputs.connectionGrowthPercent, 0);
  }
  const zero = calculateDemand({}, { connectionPercent: 0 });
  assert.equal(zero.firstMonth.totalKWh, 0);
  assert.equal(zero.firstMonth.loadFactor, 0);
  assert.deepEqual(defaultInputs(null), defaultInputs({}));
});

test('custom shapes normalize safely and change timing while preserving energy', () => {
  const shape = Array(24).fill(0); shape[12] = 100;
  const custom = calculateDemand({ population: 450 }, { connectionPercent: 100 }, { household: shape });
  close(custom.hourlyKW[12], custom.firstMonth.dailyKWh);
  assert.equal(custom.hourlyKW[18], 0);
  close(sum(dailyProfile(10, Array(24).fill(1e308))), 10);
  const invalid = calculateDemand(site, {}, { household: Array(24).fill(0), mill: [-1] });
  assert.ok(invalid.validationWarnings.some(text => text.includes('household profile')));
  close(sum(invalid.hourlyKW)*30, invalid.firstMonth.totalKWh);
});
