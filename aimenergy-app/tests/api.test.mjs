import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createServer } from '../server.mjs';
import { calculateDemand } from '../dist/engine.js';

async function running(t, options = {}) {
  const server = await createServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}
const post = (base, endpoint, value) => fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
const raw = (base, pathname) => new Promise((resolve, reject) => {
  const url = new URL(base);
  const req = http.request({ hostname: url.hostname, port: url.port, path: pathname }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
  req.on('error', reject); req.end();
});

test('health and static app are available; raw source and traversal are blocked', async t => {
  const base = await running(t);
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200); assert.equal((await health.json()).planningReady, true);
  const page = await fetch(base + '/'); assert.equal(page.status, 200); assert.match(await page.text(), /AimEnergy/);
  assert.equal((await fetch(base + '/', { method: 'HEAD' })).status, 200);
  for (const pathname of ['/server.mjs', '/package.json', '/Data/source.json', '/Models/model.json', '/.git/config', '/missing.js', '/api/missing', '/%2e%2e/package.json', '/%2e%2e%5cpackage.json']) assert.equal(await raw(base, pathname), 404, pathname);
  assert.equal((await fetch(base + '/api/predict')).status, 405);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
});

test('forecast uses the cached RAMP profiles and keeps scenario uncertainty explicit', async t => {
  const base = await running(t);
  const site = { population: 900, schools: 1 };
  const inputs = { householdKWhPerMonth: 25, millCount: 1 };
  const response = await post(base, '/api/forecast', { site, inputs });
  assert.equal(response.status, 200);
  const result = await response.json();
  const ramp = JSON.parse(await readFile(new URL('../dist/data/ramp-profiles.json', import.meta.url), 'utf8'));
  const profiles = Object.fromEntries(Object.entries(ramp.profiles).map(([key, value]) => [key, value.hourlyShares]));
  const expected = calculateDemand(site, inputs, profiles);
  assert.deepEqual(result.hourlyKW, expected.hourlyKW); assert.equal(result.monthly.length, 24);
  assert.equal(result.profileProvenance.engine, 'RAMP'); assert.equal(result.householdPrediction, null);
  assert.match(result.limitation, /not calibrated prediction intervals/);
  assert.ok(result.scenarios.low.firstMonth.totalKWh <= result.firstMonth.totalKWh);
  assert.ok(result.scenarios.high.firstMonth.totalKWh >= result.firstMonth.totalKWh);
});

test('predict returns trained model results; metadata excludes forest internals', async t => {
  const base = await running(t);
  const response = await fetch(base + '/api/model');
  assert.equal(response.status, 200, 'Model must be built before full verification.');
  const metadata = await response.json();
  assert.ok(metadata.feature_schema.length); assert.equal(metadata.model, undefined); assert.equal(metadata.trees, undefined);
  const prediction = await post(base, '/api/predict', { features: {} });
  assert.equal(prediction.status, 200);
  const result = await prediction.json();
  assert.ok(Number.isFinite(result.prediction)); assert.equal(result.model_id, metadata.model_id);
  assert.ok(result.lower <= result.prediction && result.upper >= result.prediction);
  const forecast = await post(base, '/api/forecast', { site: { population: 900 }, householdFeatures: {} });
  assert.equal(forecast.status, 200);
  const village = await forecast.json();
  assert.equal(village.inputs.householdKWhPerMonth, result.prediction);
  assert.deepEqual(village.householdPrediction.prediction, result.prediction);
  assert.match(village.evidenceScope, /uncalibrated/);
  assert.equal((await post(base, '/api/predict', { features: { unknown: 1 } })).status, 400);
  const numeric = metadata.feature_schema.find(field => field.type === 'number');
  assert.equal((await post(base, '/api/predict', { features: { [numeric.name]: (numeric.physical_max ?? numeric.max) + 1 } })).status, 400);
  const categorical = metadata.feature_schema.find(field => field.type === 'categorical');
  assert.equal((await post(base, '/api/predict', { features: { [categorical.name]: -999 } })).status, 400);
});

test('invalid payloads, JSON, type, size and unsupported methods have explicit statuses', async t => {
  const base = await running(t);
  assert.equal((await fetch(base + '/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(base + '/api/predict', { method: 'POST', body: '{}' })).status, 415);
  assert.equal((await fetch(base + '/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features: {}, padding: 'x'.repeat(65536) }) })).status, 413);
  const chunkedStatus = await new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request({ hostname: url.hostname, port: url.port, path: '/api/predict', method: 'POST', headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.write('x'.repeat(40000)); req.end('x'.repeat(40000));
  });
  assert.equal(chunkedStatus, 413);
  for (const payload of [null, [], {}, { site: { population: '900' } }, { site: { population: -1 } }, { site: { population: 1 }, inputs: { madeUp: 1 } }, { site: { population: 1 }, inputs: { householdKWhPerMonth: null } }]) assert.equal((await post(base, '/api/forecast', payload)).status, 400);
  assert.equal((await fetch(base + '/api/health', { method: 'DELETE' })).status, 405);
});

test('missing model stays healthy, returns 503 for inference, and still plans', async t => {
  const base = await running(t, { modelPath: new URL('../dist/data/no-such-model.json', import.meta.url).pathname });
  assert.equal((await (await fetch(base + '/api/health')).json()).modelReady, false);
  assert.equal((await fetch(base + '/api/model')).status, 503);
  assert.equal((await post(base, '/api/predict', { features: {} })).status, 503);
  assert.equal((await post(base, '/api/forecast', { site: { population: 100 } })).status, 200);
});

test('API rate limiting is explicit and independent server instances remain isolated', async t => {
  const base = await running(t, { rateLimit: 1 });
  assert.equal((await fetch(base + '/api/health')).status, 200);
  const limited = await fetch(base + '/api/health'); assert.equal(limited.status, 429); assert.ok(limited.headers.get('retry-after'));
  assert.equal((await fetch(base + '/')).status, 200);
  const other = await running(t, { rateLimit: 1 }); assert.equal((await fetch(other + '/api/health')).status, 200);
});
