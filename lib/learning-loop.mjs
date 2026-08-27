import { createHash } from 'node:crypto';

const fail = message => { throw new Error(message); };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const requireString = (value, label) => typeof value === 'string' && value.length > 0 ? value : fail(`${label} must be a non-empty string`);
const requireIso = (value, label) => requireString(value, label) && !Number.isNaN(Date.parse(value)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : fail(`${label} must be an RFC 3339 timestamp`);
const requireProbability = (value, label) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : fail(`${label} must be a probability`);
const round = (value, places = 6) => Number(value.toFixed(places));
const canonicalize = value => Array.isArray(value)
  ? value.map(canonicalize)
  : isObject(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');

export function validateLearningPolicy(policy) {
  if (!isObject(policy) || policy.schema_version !== 1) fail('learning policy schema_version must be 1');
  requireString(policy.policy_id, 'learning policy ID');
  requireIso(policy.effective_at, 'learning policy effective_at');
  if (!Number.isInteger(policy.season) || policy.season < 2000) fail('learning policy season is invalid');
  if (typeof policy.probability_epsilon !== 'number' || policy.probability_epsilon <= 0 || policy.probability_epsilon >= 0.5) fail('learning probability epsilon is invalid');
  if (!Number.isInteger(policy.calibration_bins) || policy.calibration_bins < 2) fail('learning calibration_bins must be at least two');
  for (const key of ['required_dimensions', 'allowed_horizons', 'allowed_confidence_buckets']) {
    if (!Array.isArray(policy[key]) || policy[key].length === 0 || policy[key].some(value => typeof value !== 'string' || value.length === 0)) fail(`learning policy ${key} is invalid`);
  }
  requireString(policy.private_clv_definition, 'learning private CLV definition');
  requireString(policy.public_close_delta_definition, 'learning public close-delta definition');
  return true;
}

export function validateLearningObservation(observation, { policy } = {}) {
  if (!isObject(observation) || observation.schema_version !== 1) fail('learning observation schema_version must be 1');
  for (const key of ['observation_id', 'weekly_state_version_id', 'model_version_id', 'decision_market_snapshot_id', 'closing_market_snapshot_id', 'team_id', 'contract_id', 'market_type', 'closing_quote_id']) requireString(observation[key], `learning observation ${key}`);
  for (const key of ['recorded_at', 'closing_observed_at', 'settled_at']) requireIso(observation[key], `learning observation ${key}`);
  if (!Number.isInteger(observation.season) || observation.season < 2000) fail('learning observation season is invalid');
  if (!['yes', 'no'].includes(observation.side)) fail('learning observation side must be yes or no');
  if (!Number.isInteger(observation.threshold) || observation.threshold < 1 || observation.threshold > 17) fail('learning observation threshold must be 1 through 17');
  requireString(observation.evaluation_horizon, 'learning observation evaluation_horizon');
  requireString(observation.confidence_bucket, 'learning observation confidence_bucket');
  requireProbability(observation.model_probability, 'learning observation model_probability');
  requireProbability(observation.closing_probability, 'learning observation closing_probability');
  if (![0, 1].includes(observation.outcome)) fail('learning observation outcome must be binary');
  if (new Date(observation.closing_observed_at) > new Date(observation.settled_at)) fail('learning observation settlement cannot precede close');
  if (!isObject(observation.source) || observation.source.venue_id !== 'kalshi') fail('learning observation source must be Kalshi');
  requireString(observation.source.close_source, 'learning observation close source');
  requireString(observation.source.outcome_source, 'learning observation outcome source');
  if (policy) {
    validateLearningPolicy(policy);
    if (observation.season !== policy.season) fail('learning observation season does not match policy');
    if (!policy.allowed_horizons.includes(observation.evaluation_horizon)) fail('learning observation horizon is not allowed by policy');
    if (!policy.allowed_confidence_buckets.includes(observation.confidence_bucket)) fail('learning observation confidence bucket is not allowed by policy');
  }
  return true;
}

export function scoreLearningObservations(observations, policy) {
  validateLearningPolicy(policy);
  observations.forEach(observation => validateLearningObservation(observation, { policy }));
  if (observations.length === 0) return null;
  const epsilon = policy.probability_epsilon;
  const brier = key => observations.reduce((sum, observation) => sum + (observation[key] - observation.outcome) ** 2, 0) / observations.length;
  const logLoss = key => observations.reduce((sum, observation) => {
    const probability = Math.min(1 - epsilon, Math.max(epsilon, observation[key]));
    return sum - observation.outcome * Math.log(probability) - (1 - observation.outcome) * Math.log(1 - probability);
  }, 0) / observations.length;
  const bins = Array.from({ length: policy.calibration_bins }, () => []);
  for (const observation of observations) bins[Math.min(policy.calibration_bins - 1, Math.floor(observation.model_probability * policy.calibration_bins))].push(observation);
  const expectedCalibrationError = bins.reduce((sum, bin) => {
    if (bin.length === 0) return sum;
    const predicted = bin.reduce((total, row) => total + row.model_probability, 0) / bin.length;
    const observed = bin.reduce((total, row) => total + row.outcome, 0) / bin.length;
    return sum + Math.abs(predicted - observed) * bin.length / observations.length;
  }, 0);
  const closeDeltas = observations.map(observation => observation.closing_probability - observation.model_probability);
  return {
    observations: observations.length,
    model_brier_score: round(brier('model_probability')),
    model_log_loss: round(logLoss('model_probability')),
    model_expected_calibration_error: round(expectedCalibrationError),
    closing_brier_score: round(brier('closing_probability')),
    closing_log_loss: round(logLoss('closing_probability')),
    mean_model_to_close_probability_delta: round(closeDeltas.reduce((sum, value) => sum + value, 0) / closeDeltas.length),
    mean_absolute_model_to_close_probability_delta: round(closeDeltas.reduce((sum, value) => sum + Math.abs(value), 0) / closeDeltas.length),
  };
}

export function buildLearningReport(observations, policy) {
  validateLearningPolicy(policy);
  const observationIds = observations.map(observation => observation.observation_id);
  if (new Set(observationIds).size !== observationIds.length) fail('learning observations must have unique IDs');
  observations.forEach(observation => validateLearningObservation(observation, { policy }));
  const sorted = [...observations].sort((left, right) => left.observation_id.localeCompare(right.observation_id));
  const dimensionFields = {
    model_version: 'model_version_id',
    evaluation_horizon: 'evaluation_horizon',
    confidence_bucket: 'confidence_bucket',
    market_type: 'market_type',
  };
  const groupings = {};
  for (const dimension of policy.required_dimensions) {
    const field = dimensionFields[dimension];
    if (!field) fail(`Unsupported learning dimension ${dimension}`);
    const values = [...new Set(sorted.map(observation => observation[field]))].sort();
    groupings[dimension] = values.map(value => ({ value, metrics: scoreLearningObservations(sorted.filter(observation => observation[field] === value), policy) }));
  }
  const generatedAt = sorted.length > 0 ? [...sorted].sort((left, right) => right.recorded_at.localeCompare(left.recorded_at))[0].recorded_at : policy.effective_at;
  const fingerprint = hash({ policy_id: policy.policy_id, observation_ids: observationIds.sort() });
  return {
    schema_version: 1,
    report_id: `learning-${policy.season}-${fingerprint.slice(0, 16)}`,
    generated_at: generatedAt,
    policy_id: policy.policy_id,
    status: sorted.length > 0 ? 'ready' : 'awaiting_observations',
    observation_count: sorted.length,
    overall: scoreLearningObservations(sorted, policy),
    groupings,
    definitions: {
      brier_score: 'Mean squared error between the frozen probability and binary outcome; lower is better.',
      log_loss: 'Mean negative log likelihood using the policy probability clamp; lower is better.',
      expected_calibration_error: `Absolute forecast-versus-outcome gap weighted across ${policy.calibration_bins} equal-width probability bins.`,
      model_to_close_probability_delta: policy.public_close_delta_definition,
      private_clv: policy.private_clv_definition,
    },
  };
}
