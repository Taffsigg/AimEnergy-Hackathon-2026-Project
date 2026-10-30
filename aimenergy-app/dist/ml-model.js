/** Portable fitted forest inference. No household records or model execution dependencies. */
export function sanitizeHousehold(input = {}, artifact) {
  if (!artifact?.feature_schema || !artifact?.model) throw new Error('Invalid ML artifact');
  const inputs = {}, flags = [];
  for (const feature of artifact.feature_schema) {
    let value = input[feature.name];
    if (value === null || value === undefined || value === '' || typeof value === 'boolean' || !Number.isFinite(Number(value))) {
      value = feature.default;
      flags.push(`imputed_${feature.name}`);
    } else value = Number(value);
    if (feature.type === 'categorical') {
      if (!feature.options.some(option => option.value === value)) {
        flags.push(`unknown_category_${feature.name}`);
        value = feature.default;
      }
    } else {
      if (value < feature.min || value > feature.max) flags.push(`outside_training_range_${feature.name}`);
      if (value < feature.physical_min || value > feature.physical_max) {
        flags.push(`clipped_physical_range_${feature.name}`);
        value = Math.max(feature.physical_min, Math.min(feature.physical_max, value));
      }
    }
    inputs[feature.name] = value;
  }
  if (inputs.region === 3) flags.push('northern_region_is_not_lamwo_validation');
  flags.push('survey_proxy_not_metered', 'geographic_transfer_unvalidated');
  return {inputs, flags};
}

function treePredict(tree, vector) {
  let node = 0;
  while (tree.left[node] !== -1) {
    node = vector[tree.feature[node]] <= tree.threshold[node] ? tree.left[node] : tree.right[node];
  }
  return tree.value[node];
}

export function predictHousehold(input, artifact) {
  const {inputs, flags} = sanitizeHousehold(input, artifact);
  const vector = artifact.encoded_features.map(feature => Math.fround(feature.category === undefined
    ? inputs[feature.feature] : Number(inputs[feature.feature] === feature.category)));
  let prediction;
  if (artifact.model.kind === 'median_baseline') prediction = artifact.model.baseline;
  else if (artifact.model.kind === 'random_forest') {
    const meanLog = artifact.model.trees.reduce((sum, tree) => sum + treePredict(tree, vector), 0) / artifact.model.trees.length;
    prediction = Math.max(0, Math.expm1(meanLog));
  } else throw new Error(`Unsupported model: ${artifact.model.kind}`);
  const q = artifact.calibration.q;
  const drivers = artifact.feature_schema.map(feature => ({feature: feature.name, label: feature.label,
    importance: artifact.global_feature_importance[feature.name] || 0, value: inputs[feature.name]}))
    .sort((a, b) => b.importance - a.importance);
  return {prediction, lower: Math.max(0, prediction - q), upper: prediction + q,
    units: artifact.target.units, inputs, flags, drivers, driver_kind: 'global_feature_importance', model_id: artifact.model_id};
}

export function predictBatch(rows, artifact) {
  return rows.map(row => predictHousehold(row, artifact));
}
