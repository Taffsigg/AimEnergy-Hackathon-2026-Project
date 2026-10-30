import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSurvey, parseBuildingHistory, growthSummary, boundsFromInput, observationDate, rasterHeader, rasterDataUrl } from '../dist/remote-core.js';
import { readFile } from 'node:fs/promises';
const now = new Date('2026-10-30T12:00:00Z');
const metadata = { source: 'Synthetic validator fixture; not a real survey', observed_on: '2026-10-01' };
const collection = coordinates => ({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] }, properties: { category: 'building', script: '<script>bad</script>' } }] });
const ring = [[32, 3], [32.1, 3], [32.1, 3.1], [32, 3]];
test('survey validation retains WGS84 geometry and explicit provenance without arbitrary properties', () => {
  const original = collection(ring), result = validateSurvey(original, metadata, now);
  assert.equal(result.polygon_features, 1);
  assert.deepEqual(result.bounds, [32, 3, 32.1, 3.1]);
  assert.equal(result.features[0].properties.script, undefined);
  assert.equal(original.features[0].properties.script, '<script>bad</script>');
  assert.equal(result.source, metadata.source);
  assert.match(result.interpretation, /No demand inputs are changed/);
});
test('raster headers reject pixel bombs and false file types before decoding', async () => {
  const real = new Uint8Array(await readFile(new URL('../dist/images/satellite-orii-gangodye-2024.jpg', import.meta.url)));
  assert.deepEqual(rasterHeader(real), {width:1115,height:783,mime:'image/jpeg'});
  const url='data:image/jpeg;base64,'+Buffer.from(real).toString('base64');
  assert.deepEqual(rasterDataUrl(url).header,{width:1115,height:783,mime:'image/jpeg'});
  assert.throws(()=>rasterDataUrl(url.replace('image/jpeg','image/png')));
  assert.throws(()=>rasterHeader(new Uint8Array(30)));
  const png = new Uint8Array(33);png.set([137,80,78,71,13,10,26,10]);png.set([73,72,68,82],12);
  const view = new DataView(png.buffer);view.setUint32(16,20000);view.setUint32(20,20000);
  assert.throws(()=>rasterHeader(png));
  assert.throws(()=>rasterDataUrl('data:image/png;base64,'+Buffer.from(png).toString('base64')));
  assert.throws(()=>rasterHeader(new Uint8Array(2*1024*1024+1)));
});
test('projected, malformed, excessive, open-ring and nonnumeric surveys are rejected', () => {
  for (const data of [collection([[320000,3],...ring.slice(1)]), collection(ring.slice(0,3)), collection([...ring.slice(0,3),[32,3.01]]), collection([['32',3],...ring.slice(1)]), { ...collection(ring), crs: { name: 'EPSG:3857' } }, { type:'FeatureCollection',features:Array(2001).fill(collection(ring).features[0]) }]) assert.throws(() => validateSurvey(data, metadata, now));
  assert.throws(() => validateSurvey(collection(ring), {...metadata,observed_on:'2027-01-01'}, now));
  assert.throws(() => observationDate('2026-02-30', now));
  assert.throws(() => boundsFromInput(['', 3, 33, 4]));
  assert.throws(() => boundsFromInput([33, 4, 32, 3]));
});
test('annual histories preserve fractional estimates and declines, with explicit zero-base handling', () => {
  const result = parseBuildingHistory('year,building_count\n2023,8.5\n2016,10', 'Synthetic test fixture', now);
  assert.deepEqual(result.records.map(r=>r.year), [2016,2023]);
  assert.equal(growthSummary(result.records).percent, -15);
  assert.equal(growthSummary([{year:2020,building_count:0},{year:2023,building_count:4}]).percent, null);
  for (const csv of ['year,building_count\n2020,1\n2020,2','year,building_count\n2027,1\n2028,2','year,building_count\n2020,-1\n2021,2','year,building_count\n2020,=1+2\n2021,3']) assert.throws(() => parseBuildingHistory(csv,'fixture',now));
});
