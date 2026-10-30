import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {predictHousehold, sanitizeHousehold, predictBatch} from '../dist/ml-model.js';

const artifact = JSON.parse(fs.readFileSync(new URL('../dist/data/ml-model.json', import.meta.url)));
const evaluation = JSON.parse(fs.readFileSync(new URL('../dist/data/ml-evaluation.json', import.meta.url)));
const clusters = JSON.parse(fs.readFileSync(new URL('../dist/data/site-clusters.json', import.meta.url)));

test('exported inference matches independent Python sklearn predictions on synthetic fixtures', () => {
  for (const fixture of artifact.parity_fixtures) {
    assert.equal(fixture.synthetic, true);
    const result = predictHousehold(fixture.input, artifact);
    for (const key of ['prediction', 'lower', 'upper']) assert.ok(Math.abs(result[key] - fixture[key]) < 1e-8, `${fixture.id} ${key}`);
  }
});

test('missing, hostile and out-of-domain household inputs stay finite and flagged', () => {
  const result = predictHousehold({h9q03: Infinity, s10q02: 99, region: '<script>', urban: 82}, artifact);
  assert.ok(result.flags.includes('imputed_h9q03'));
  assert.ok(result.flags.includes('unknown_category_urban'));
  assert.ok(result.flags.includes('outside_training_range_s10q02'));
  assert.equal(result.inputs.s10q02, 24);
  assert.ok(Number.isFinite(result.prediction));
  assert.ok(result.lower >= 0 && result.lower <= result.prediction && result.upper >= result.prediction);
  assert.equal(result.driver_kind, 'global_feature_importance');
  assert.equal(predictBatch([{}, {}], artifact).length, 2);
  assert.ok(!Object.keys(sanitizeHousehold({hhid: 'private'}, artifact).inputs).includes('hhid'));
});

test('evaluation records disjoint household split counts and correct finite-sample conformal rank', () => {
  assert.equal(Object.values(evaluation.split).reduce((sum, split) => sum + split.households, 0), 445);
  assert.equal(evaluation.test.selected.n, evaluation.split.test.households);
  assert.equal(evaluation.test.interval.finite_sample_rank, Math.ceil((evaluation.split.calibration.households + 1) * .9));
  assert.ok(evaluation.calibration_plot.every(bin => bin.count >= 5));
  assert.equal(evaluation.calibration_plot.reduce((sum, bin) => sum + bin.count, 0), evaluation.split.test.households);
  assert.equal(artifact.model.trees.length, 64);
  assert.ok(!artifact.feature_schema.some(feature => /hhid|cost|price|kwh|district|hhsize/.test(feature.name)));
});

test('all 411 geospatial villages have one nonempty context cluster', () => {
  assert.equal(Object.keys(clusters.assignments).length, 411);
  assert.equal(clusters.clusters.reduce((sum, cluster) => sum + cluster.size, 0), 411);
  assert.ok(clusters.clusters.every(cluster => cluster.size > 0));
  assert.ok(Object.values(clusters.assignments).every(id => Number.isInteger(id) && id >= 0 && id < 4));
});
