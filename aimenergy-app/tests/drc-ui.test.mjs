import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setDrcBenchmark, renderDrcBenchmark} from '../dist/drc-lab.js';

test('DRC ledger retains every geographic fold, sensitivity and unfavorable baseline result', async () => {
  const data = JSON.parse(await readFile(new URL('../dist/data/drc-benchmark.json', import.meta.url)));
  assert.equal(data.experiments.length, 8);
  assert.ok(data.experiments.every(e => e.folds.length === 3));
  setDrcBenchmark(data);
  const html = renderDrcBenchmark();
  for (const area of ['Goma', 'Lubero', 'Mutwanga']) assert.ok(html.includes(area));
  assert.ok(html.includes('Higher error'));
  assert.ok(html.includes('Almost unchanged'));
  assert.ok(html.includes('sensitivity analysis'));
  assert.ok(html.includes('rather than direct meter readings'));
  assert.ok(html.includes('Uganda model and planner inputs are unchanged'));
  assert.ok(html.includes('Download DRC results &amp; protocol') || html.includes('Download DRC results & protocol'));
  const sme = data.experiments.find(e => e.population === 'SME' && e.task === 'purchase' && e.sensitivity === 'author_coded_primary');
  assert.ok(sme.pooled_weighted_metrics.forest.mae_kwh > sme.pooled_weighted_metrics.median.mae_kwh);
});

test('Missing DRC results produce a recoverable message', () => {
  setDrcBenchmark(null);
  assert.match(renderDrcBenchmark(), /unavailable.*offline pack/);
});
