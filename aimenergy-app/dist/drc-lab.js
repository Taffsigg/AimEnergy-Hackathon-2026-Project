let benchmark = null;
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (x, digits = 2) => Number(x).toFixed(digits);
export function setDrcBenchmark(data) { benchmark = data; }

function ledger(experiments, task) {
  const uptake = task === 'uptake';
  const heads = uptake ? ['Model Brier', 'Baseline Brier', 'Model log loss', 'Baseline log loss'] : ['Model MAE', 'Median MAE', 'Model RMSE', 'Mean RMSE', 'Model bias'];
  return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Population / held-out area</th><th>Train / test</th>' + heads.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + experiments.filter(e => e.task === task).flatMap(e => e.folds.map(f => {
    const m = f.metrics;
    const values = uptake ? [m.forest.brier, m.prevalence.brier, m.forest.log_loss, m.prevalence.log_loss] : [m.forest.mae_kwh, m.median.mae_kwh, m.forest.rmse_kwh, m.mean.rmse_kwh, m.forest.bias_kwh];
    return '<tr><td>' + esc(e.population) + ' / ' + esc(f.held_out_area) + '</td><td>' + f.train.rows + ' / ' + f.test.rows + '</td>' + values.map(v => '<td>' + fmt(v, uptake ? 3 : 2) + '</td>').join('') + '</tr>';
  })).join('') + '</tbody></table></div>';
}

function summary(experiments) {
  return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Population / task</th><th>Respondents</th><th>Model</th><th>Baseline</th><th>Comparison</th></tr></thead><tbody>' + experiments.map(e => {
    const uptake = e.task === 'uptake', m = e.pooled_weighted_metrics;
    const metric = uptake ? 'brier' : 'mae_kwh', baseline = uptake ? m.prevalence[metric] : m.median[metric];
    const delta = m.forest[metric] - baseline;
    return '<tr><td>' + esc(e.population) + ' / ' + (uptake ? 'connection uptake' : 'conditional kWh purchases') + '</td><td>' + e.out_of_fold_rows + '</td><td>' + fmt(m.forest[metric], uptake ? 3 : 2) + '</td><td>' + fmt(baseline, uptake ? 3 : 2) + '</td><td>' + (Math.abs(delta) < 0.02 && !uptake ? 'Almost unchanged' : delta < 0 ? 'Lower error' : 'Higher error') + '</td></tr>';
  }).join('') + '</tbody></table></div>';
}

export function renderDrcBenchmark() {
  if (!benchmark) return '<div class="info-note">DRC benchmark unavailable. Refresh the app and offline pack while online.</div>';
  const primary = benchmark.experiments.filter(e => e.sensitivity === 'author_coded_primary');
  const sensitivity = benchmark.experiments.filter(e => e.sensitivity === 'exclude_attritors');
  return '<div class="view-heading"><h2>Demand evidence, tested across areas.</h2><p>A separate DRC connection and electricity-purchase benchmark, followed by the Tanzania measured-current diagnostic.</p></div>' +
    '<div class="evidence-grid"><section class="panel evidence-card"><div class="number">1,202</div><h3>Survey respondents</h3><p>911 households and 291 small businesses. Pre-grid characteristics linked by the authors to follow-up outcomes.</p></section><section class="panel evidence-card"><div class="number">3</div><h3>Areas held out in turn</h3><p>Goma, Lubero and Mutwanga. Each fold trains on the other two areas. All share one operator.</p></section><section class="panel evidence-card"><div class="number">512</div><h3>Observed purchase outcomes</h3><p>Monthly prepaid kWh purchases conditional on connecting. These are consumption proxies, rather than direct meter readings.</p></section></div>' +
    '<div class="meter-verdict"><span class="head-tag">DRC · CC0 · GEOGRAPHIC HOLDOUT</span><h3>The gain is in household connection uptake.</h3><p>The fixed forest improves pooled household connection Brier error. Household purchase MAE barely changes, while business purchase MAE is worse than the training-median baseline. All area results remain visible. This does not validate the Uganda model or village demand totals.</p></div>' +
    '<section class="panel source-list"><div class="panel-head"><div><h2>Primary benchmark</h2><p class="subtext">Pooled out-of-fold, sampling-weighted errors · lower Brier / MAE is better</p></div></div>' + summary(primary) + '<div class="meter-body"><p>Connection uses Brier error against training-weighted connection prevalence. Purchase error is MAE in kWh per connected client per month against a training-weighted median. Household and business models are separate. The download includes both MAE and RMSE against median and mean baselines, signed bias, all folds and equal-area summaries.</p></div></section>' +
    '<section class="panel source-list"><div class="panel-head"><div><h2>Connection uptake: every held-out area</h2><p class="subtext">Author-coded follow-up status, including attritors coded unconnected</p></div></div>' + ledger(primary, 'uptake') + '</section>' +
    '<section class="panel source-list"><div class="panel-head"><div><h2>Conditional purchases: every held-out area</h2><p class="subtext">MAE, RMSE and signed bias in kWh/client/month · negative bias means underprediction</p></div></div>' + ledger(primary, 'purchase') + '<div class="meter-body"><p>Purchase models use only connected respondents with observed kWh. The 690 missing unconnected outcomes are not filled with zero. Lubero household purchase evaluation has only 30 respondents; Mutwanga business evaluation has only 20. RMSE is compared with the training-weighted mean, alongside the median MAE baseline.</p></div></section>' +
    '<section class="panel source-list"><div class="panel-head"><h2>What changes when attritors are excluded?</h2></div><div class="meter-body"><details><summary>View the fixed sensitivity analysis</summary><p>Exclude attritors from both fitting and scoring, preserving the same area folds, features and model settings. This is a sensitivity analysis, not a corrected estimate.</p>' + summary(sensitivity) + '</details></div></section>' +
    '<section class="panel source-list"><div class="panel-head"><h2>Source, method and limits</h2></div><div class="meter-body"><p><a href="https://doi.org/10.7910/DVN/KPDREF" target="_blank" rel="noopener noreferrer">Lunanga, Stoop, Verpoorten & Desbureaux · Harvard Dataverse · CC0 1.0</a>. Eight source files match publisher checksums. The benchmark uses the linked survey, not a fabricated join to client averages.</p><p>One fixed 64-tree forest per task, depth 4, minimum leaf 12; no tuning. Median imputation is fitted only on training areas; sampling weights are used for fitting and scoring. IDs, area, enumerators, outcome-derived fields, future conflict and follow-up answers are excluded from predictors. Source outcomes were inspected before this design; this is a retrospective benchmark.</p><p>Purchase windows vary from connection until follow-up; exact dates are not released. Three areas under one DRC operator do not establish independent-operator or Uganda accuracy. No demand-growth accuracy, calibrated intervals or equipment sizes are inferred. The Uganda model and planner inputs are unchanged.</p><a class="btn" href="./data/drc-benchmark.json" download="AimEnergy-DRC-benchmark.json">Download DRC results & protocol</a></div></section><hr style="border:0;border-top:1px solid var(--line);margin:32px 0">';
}
