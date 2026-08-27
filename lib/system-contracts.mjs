import { createHash, randomUUID } from 'node:crypto';

export const DECISION_EVENT_TYPES = Object.freeze([
  'thesis.created',
  'thesis.revised',
  'thesis.invalidated',
  'decision.watch',
  'decision.pass',
  'decision.approve',
  'order.recorded',
  'fill.recorded',
  'position.marked',
  'closing_price.recorded',
  'position.closed',
  'outcome.recorded',
  'postmortem.recorded',
]);

const DECISION_EVENT_TYPE_SET = new Set(DECISION_EVENT_TYPES);
const RECORD_STATUSES = new Set(['active', 'review_due', 'stale', 'superseded', 'retracted', 'ambiguous']);
const MODEL_STATES = new Set(['research', 'provisional', 'validated']);

export class ContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContractError';
  }
}

const fail = message => { throw new ContractError(message); };
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const requireObject = (value, label) => isPlainObject(value) ? value : fail(`${label} must be an object`);
const requireArray = (value, label) => Array.isArray(value) ? value : fail(`${label} must be an array`);
const requireString = (value, label, { nullable = false } = {}) => {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${label} must be a non-empty string`);
  return value;
};
const requireNumber = (value, label, { minimum = -Infinity, maximum = Infinity, nullable = false } = {}) => {
  if (nullable && value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    fail(`${label} must be a number from ${minimum} to ${maximum}`);
  }
  return value;
};
const requireInteger = (value, label, { minimum = -Infinity } = {}) => {
  if (!Number.isInteger(value) || value < minimum) fail(`${label} must be an integer >= ${minimum}`);
  return value;
};
const requireBoolean = (value, label) => typeof value === 'boolean' ? value : fail(`${label} must be a boolean`);
const requireIso = (value, label, { nullable = false } = {}) => {
  if (nullable && value === null) return null;
  requireString(value, label);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) fail(`${label} must be an RFC 3339 timestamp`);
  return value;
};
const requireEnum = (value, allowed, label) => allowed.has(value) ? value : fail(`${label} has unsupported value ${JSON.stringify(value)}`);
const requireStringArray = (value, label) => {
  requireArray(value, label);
  value.forEach((entry, index) => requireString(entry, `${label}[${index}]`));
  return value;
};

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

export function hashDecisionEvent(event) {
  const eventWithoutHash = { ...event };
  delete eventWithoutHash.event_hash;
  return createHash('sha256').update(JSON.stringify(canonicalize(eventWithoutHash))).digest('hex');
}

export function validateFreshnessPolicy(policy) {
  requireObject(policy, 'freshness policy');
  if (policy.schema_version !== 1) fail('freshness policy schema_version must be 1');
  requireString(policy.policy_id, 'freshness policy policy_id');
  requireInteger(policy.season, 'freshness policy season', { minimum: 2000 });
  requireObject(policy.evidence_classes, 'freshness policy evidence_classes');
  requireObject(policy.market, 'freshness policy market');
  requireNumber(policy.market.capture_time_only_action_ttl_seconds, 'market capture-time TTL', { minimum: 1 });
  requireNumber(policy.market.source_time_action_ttl_seconds, 'market source-time TTL', { minimum: 1 });
  return true;
}

export function validateForecastPolicy(policy) {
  requireObject(policy, 'forecast policy');
  if (policy.schema_version !== 1) fail('forecast policy schema_version must be 1');
  requireString(policy.policy_id, 'forecast policy policy_id');
  requireInteger(policy.season, 'forecast policy season', { minimum: 2000 });
  if (policy.active_model_state !== null) requireEnum(policy.active_model_state, MODEL_STATES, 'forecast active_model_state');
  requireBoolean(policy.market_prices_allowed_as_features, 'forecast market_prices_allowed_as_features');
  if (policy.market_prices_allowed_as_features) fail('Forecast policy must keep market prices out of model features');
  requireStringArray(policy.required_validation_metrics, 'forecast required_validation_metrics');
  const model = requireObject(policy.model, 'forecast policy model');
  requireString(model.model_id, 'forecast policy model.model_id');
  requireString(model.code_version, 'forecast policy model.code_version');
  requireInteger(model.training_start_season, 'forecast policy model.training_start_season', { minimum: 2000 });
  for (const key of ['tuning_seasons', 'holdout_seasons', 'recency_half_life_grid', 'ridge_penalty_grid', 'margin_cap_grid']) {
    requireArray(model[key], `forecast policy model.${key}`);
    if (model[key].length === 0) fail(`forecast policy model.${key} cannot be empty`);
  }
  model.tuning_seasons.forEach((season, index) => requireInteger(season, `forecast policy tuning_seasons[${index}]`, { minimum: 2000 }));
  model.holdout_seasons.forEach((season, index) => requireInteger(season, `forecast policy holdout_seasons[${index}]`, { minimum: 2000 }));
  if (model.tuning_seasons.some(season => model.holdout_seasons.includes(season))) fail('Forecast tuning and holdout seasons must not overlap');
  model.recency_half_life_grid.forEach((value, index) => requireNumber(value, `forecast recency_half_life_grid[${index}]`, { minimum: Number.EPSILON }));
  model.ridge_penalty_grid.forEach((value, index) => requireNumber(value, `forecast ridge_penalty_grid[${index}]`, { minimum: Number.EPSILON }));
  model.margin_cap_grid.forEach((value, index) => requireNumber(value, `forecast margin_cap_grid[${index}]`, { minimum: 1 }));
  requireNumber(model.home_field_ridge_penalty, 'forecast home_field_ridge_penalty', { minimum: Number.EPSILON });
  requireString(model.tie_probability_method, 'forecast tie_probability_method');
  if (model.tie_probability_method !== 'recency-weighted-empirical') fail('Forecast tie_probability_method must be recency-weighted-empirical');
  requireNumber(model.offseason_drift_sd_points, 'forecast offseason_drift_sd_points', { minimum: 0 });
  requireNumber(model.missing_context_sd_points, 'forecast missing_context_sd_points', { minimum: 0 });
  const simulation = requireObject(policy.simulation, 'forecast policy simulation');
  requireInteger(simulation.production_draws, 'forecast production_draws', { minimum: 1 });
  requireInteger(simulation.validation_draws, 'forecast validation_draws', { minimum: 1 });
  requireInteger(simulation.seed, 'forecast seed', { minimum: 0 });
  requireNumber(simulation.interval_probability, 'forecast interval_probability', { minimum: Number.EPSILON, maximum: 1 - Number.EPSILON });
  const promotion = requireObject(policy.promotion, 'forecast policy promotion');
  requireInteger(promotion.minimum_holdout_seasons, 'forecast minimum_holdout_seasons', { minimum: 1 });
  requireNumber(promotion.minimum_brier_improvement_vs_league, 'forecast minimum_brier_improvement_vs_league', { minimum: 0 });
  requireBoolean(promotion.requires_brier_no_worse_than_prior_record, 'forecast prior-record Brier requirement');
  requireBoolean(promotion.requires_log_loss_no_worse_than_prior_record, 'forecast prior-record log-loss requirement');
  requireNumber(promotion.maximum_expected_calibration_error, 'forecast maximum calibration error', { minimum: 0, maximum: 1 });
  requireNumber(promotion.minimum_interval_coverage, 'forecast minimum interval coverage', { minimum: 0, maximum: 1 });
  requireNumber(promotion.maximum_interval_coverage, 'forecast maximum interval coverage', { minimum: 0, maximum: 1 });
  if (promotion.minimum_interval_coverage > promotion.maximum_interval_coverage) fail('Forecast interval coverage minimum cannot exceed maximum');
  requireBoolean(promotion.requires_current_adjustment_coverage, 'forecast current-adjustment requirement');
  return true;
}

export function validateForecastVersion(forecast) {
  requireObject(forecast, 'forecast version');
  if (forecast.schema_version !== 1) fail('forecast version schema_version must be 1');
  requireString(forecast.forecast_version_id, 'forecast version forecast_version_id');
  requireInteger(forecast.season, 'forecast version season', { minimum: 2000 });
  requireString(forecast.model_id, 'forecast version model_id');
  requireEnum(forecast.model_state, MODEL_STATES, 'forecast version model_state');
  requireIso(forecast.as_of, 'forecast version as_of');
  requireIso(forecast.generated_at, 'forecast version generated_at');
  requireString(forecast.code_version, 'forecast version code_version');
  requireString(forecast.code_fingerprint, 'forecast version code_fingerprint');
  requireStringArray(forecast.input_versions, 'forecast version input_versions');
  if (forecast.input_versions.length < 3) fail('forecast version must name at least three input versions');
  requireString(forecast.policy_version, 'forecast version policy_version');
  requireInteger(forecast.seed, 'forecast version seed', { minimum: 0 });
  requireInteger(forecast.draws, 'forecast version draws', { minimum: 1 });
  requireObject(forecast.fit_summary, 'forecast version fit_summary');
  requireObject(forecast.simulation_summary, 'forecast version simulation_summary');
  requireString(forecast.validation_report_id, 'forecast version validation_report_id');
  requireString(forecast.validation_report_path, 'forecast version validation_report_path');
  requireBoolean(forecast.decision_eligible, 'forecast version decision_eligible');
  if (forecast.model_state !== 'validated' && forecast.decision_eligible) fail('Only a validated forecast can be decision eligible');
  if (forecast.model_state === 'validated' && !forecast.decision_eligible) fail('Validated forecast must be decision eligible');
  requireStringArray(forecast.warnings, 'forecast version warnings');
  const teams = requireArray(forecast.teams, 'forecast version teams');
  if (teams.length !== 32) fail('forecast version teams must contain exactly 32 teams');
  const teamIds = new Set();
  for (const [index, team] of teams.entries()) {
    requireObject(team, `forecast version teams[${index}]`);
    requireString(team.team_id, `forecast version teams[${index}].team_id`);
    if (teamIds.has(team.team_id)) fail(`forecast version contains duplicate team ${team.team_id}`);
    teamIds.add(team.team_id);
    requireNumber(team.strength_mean_points, `forecast version ${team.team_id} strength_mean_points`);
    requireNumber(team.strength_sd_points, `forecast version ${team.team_id} strength_sd_points`, { minimum: 0 });
    const mass = requireArray(team.win_probability_mass, `forecast version ${team.team_id} win_probability_mass`);
    if (mass.length !== 18) fail(`forecast version ${team.team_id} win_probability_mass must contain 18 values`);
    mass.forEach((value, wins) => requireNumber(value, `forecast version ${team.team_id} mass[${wins}]`, { minimum: 0, maximum: 1 }));
    if (Math.abs(1 - mass.reduce((sum, value) => sum + value, 0)) > 1e-6) fail(`forecast version ${team.team_id} mass must sum to one`);
    const expectedWins = mass.reduce((sum, value, wins) => sum + value * wins, 0);
    requireNumber(team.expected_wins, `forecast version ${team.team_id} expected_wins`, { minimum: 0, maximum: 17 });
    if (Math.abs(team.expected_wins - expectedWins) > 1e-3) fail(`forecast version ${team.team_id} expected wins must reproduce from mass`);
    requireInteger(team.median_wins, `forecast version ${team.team_id} median_wins`, { minimum: 0 });
    const interval = requireArray(team.interval_80, `forecast version ${team.team_id} interval_80`);
    if (interval.length !== 2) fail(`forecast version ${team.team_id} interval_80 must contain two values`);
    interval.forEach((value, boundary) => requireInteger(value, `forecast version ${team.team_id} interval_80[${boundary}]`, { minimum: 0 }));
    if (interval[0] > interval[1] || interval[1] > 17) fail(`forecast version ${team.team_id} interval_80 is invalid`);
  }
  return true;
}

export function validateMarketPolicy(policy) {
  requireObject(policy, 'market policy');
  if (policy.schema_version !== 1) fail('market policy schema_version must be 1');
  requireString(policy.policy_id, 'market policy policy_id');
  requireInteger(policy.season, 'market policy season', { minimum: 2000 });
  requireStringArray(policy.venue_scope, 'market policy venue_scope');
  if (policy.venue_scope.length !== 1 || policy.venue_scope[0] !== 'kalshi') fail('Active market policy must be Kalshi-only');
  requireStringArray(policy.series_scope, 'market policy series_scope');
  if (policy.series_scope.length !== 1 || policy.series_scope[0] !== 'KXNFLWINS') fail('Active market policy must target KXNFLWINS');
  const marketData = requireObject(policy.market_data, 'market market_data');
  requireBoolean(marketData.full_orderbook_required, 'market full-orderbook requirement');
  requireEnum(marketData.source_time_confidence, new Set(['source-time', 'capture-time-only']), 'market source-time confidence');
  const referenceCounts = requireArray(marketData.reference_contract_counts, 'market reference contract counts');
  if (referenceCounts.length === 0) fail('Market reference contract counts cannot be empty');
  referenceCounts.forEach((count, index) => requireNumber(count, `market reference contract count[${index}]`, { minimum: Number.EPSILON }));
  requireNumber(marketData.primary_reference_contract_count, 'market primary reference contract count', { minimum: Number.EPSILON });
  if (!referenceCounts.includes(marketData.primary_reference_contract_count)) fail('Primary reference contract count must appear in reference counts');
  const research = requireObject(policy.research_diagnostic, 'market research_diagnostic');
  const persistence = requireObject(policy.persistence, 'market persistence');
  const action = requireObject(policy.action_eligibility, 'market action_eligibility');
  requireNumber(research.minimum_net_edge_cents, 'research minimum net edge', { minimum: 0 });
  requireNumber(research.maximum_spread_cents, 'research maximum spread', { minimum: 0 });
  requireBoolean(research.requires_full_reference_size, 'research full-reference-size requirement');
  requireInteger(persistence.minimum_qualifying_captures, 'market minimum persistent captures', { minimum: 2 });
  requireNumber(persistence.minimum_spacing_seconds, 'market minimum persistence spacing', { minimum: 1 });
  requireNumber(persistence.maximum_spacing_seconds, 'market maximum persistence spacing', { minimum: 1 });
  if (persistence.minimum_spacing_seconds > persistence.maximum_spacing_seconds) fail('Market persistence spacing minimum cannot exceed maximum');
  requireString(policy.fee_schedule_id, 'market fee schedule ID');
  const rounding = requireObject(policy.fee_rounding, 'market fee_rounding');
  requireNumber(rounding.trade_fee_increment_dollars, 'market trade-fee increment', { minimum: Number.EPSILON });
  requireNumber(rounding.maximum_unrebated_rounding_reserve_dollars, 'market rounding reserve', { minimum: 0 });
  requireBoolean(rounding.use_conservative_reserve_for_break_even, 'market conservative rounding requirement');
  requireBoolean(action.requires_validated_forecast_for_model_comparison, 'action validated-forecast requirement');
  requireNumber(action.maximum_capture_age_seconds, 'action maximum capture age', { minimum: 1 });
  requireBoolean(action.requires_full_size_at_executable_price, 'action full-size requirement');
  requireBoolean(action.requires_versioned_fee_schedule, 'action fee-schedule requirement');
  requireBoolean(action.requires_positive_net_edge, 'action positive-net-edge requirement');
  requireBoolean(action.requires_persistence, 'action persistence requirement');
  requireNumber(action.minimum_notional_dollars, 'action minimum notional', { minimum: 0, nullable: true });
  requireEnum(policy.account_access, new Set(['none']), 'market account access');
  requireBoolean(policy.order_placement_enabled, 'market order-placement flag');
  if (policy.order_placement_enabled) fail('Public market policy cannot enable order placement');
  return true;
}

export function validateKalshiFeeSchedule(schedule) {
  requireObject(schedule, 'Kalshi fee schedule');
  if (schedule.schema_version !== 1) fail('Kalshi fee schedule schema_version must be 1');
  requireString(schedule.fee_schedule_id, 'Kalshi fee schedule ID');
  if (schedule.venue_id !== 'kalshi' || schedule.series_ticker !== 'KXNFLWINS') fail('Kalshi fee schedule must target the KXNFLWINS series');
  requireIso(schedule.effective_at, 'Kalshi fee effective_at');
  requireIso(schedule.retrieved_at, 'Kalshi fee retrieved_at');
  requireString(schedule.source_url, 'Kalshi fee source URL');
  requireString(schedule.source_snapshot_path, 'Kalshi fee source snapshot path');
  requireString(schedule.source_snapshot_sha256, 'Kalshi fee source snapshot SHA-256');
  requireInteger(schedule.source_snapshot_bytes, 'Kalshi fee source snapshot bytes', { minimum: 1 });
  requireEnum(schedule.series_fee_type, new Set(['quadratic']), 'Kalshi series fee type');
  requireNumber(schedule.series_fee_multiplier, 'Kalshi series fee multiplier', { minimum: 0 });
  for (const kind of ['taker', 'maker']) {
    const fee = requireObject(schedule[kind], `Kalshi ${kind} fee`);
    requireNumber(fee.rate, `Kalshi ${kind} rate`, { minimum: 0 });
    requireNumber(fee.multiplier, `Kalshi ${kind} multiplier`, { minimum: 0 });
    requireString(fee.formula, `Kalshi ${kind} formula`);
  }
  requireNumber(schedule.settlement_fee, 'Kalshi settlement fee', { minimum: 0 });
  const rounding = requireObject(schedule.rounding, 'Kalshi fee rounding');
  requireNumber(rounding.trade_fee_increment_dollars, 'Kalshi trade fee increment', { minimum: Number.EPSILON });
  requireNumber(rounding.balance_rounding_increment_dollars, 'Kalshi balance rounding increment', { minimum: Number.EPSILON });
  requireBoolean(rounding.pretrade_exact_net_fee_available, 'Kalshi pretrade exact-fee flag');
  return true;
}

export function validateKalshiExecutionSnapshot(snapshot, { policy = null, feeSchedule = null } = {}) {
  requireObject(snapshot, 'Kalshi execution snapshot');
  if (snapshot.schema_version !== 2) fail('Kalshi execution snapshot schema_version must be 2');
  requireString(snapshot.snapshot_id, 'Kalshi execution snapshot ID');
  requireInteger(snapshot.season, 'Kalshi execution season', { minimum: 2000 });
  requireIso(snapshot.captured_at_started, 'Kalshi capture start');
  requireIso(snapshot.captured_at, 'Kalshi captured_at');
  requireIso(snapshot.stale_after, 'Kalshi stale_after');
  if (new Date(snapshot.captured_at_started) > new Date(snapshot.captured_at)) fail('Kalshi capture start cannot follow completion');
  if (new Date(snapshot.stale_after) <= new Date(snapshot.captured_at)) fail('Kalshi stale_after must follow capture');
  requireString(snapshot.policy_version, 'Kalshi execution policy version');
  requireString(snapshot.fee_schedule_id, 'Kalshi execution fee schedule ID');
  requireString(snapshot.forecast_version_id, 'Kalshi execution forecast version ID');
  requireEnum(snapshot.forecast_state, MODEL_STATES, 'Kalshi execution forecast state');
  requireNumber(snapshot.primary_reference_contract_count, 'Kalshi primary reference count', { minimum: Number.EPSILON });
  const source = requireObject(snapshot.source, 'Kalshi execution source');
  if (source.venue_id !== 'kalshi' || source.series_ticker !== 'KXNFLWINS') fail('Execution snapshot must use Kalshi KXNFLWINS');
  requireBoolean(source.authentication_required, 'Kalshi authentication requirement');
  requireBoolean(source.account_data_requested, 'Kalshi account-data flag');
  requireBoolean(source.order_placement_enabled, 'Kalshi order-placement flag');
  if (source.account_data_requested || source.order_placement_enabled) fail('Public Kalshi snapshot cannot access account data or place orders');
  const contracts = requireArray(snapshot.contracts, 'Kalshi contracts');
  if (contracts.length !== 544) fail('Kalshi execution snapshot must contain 544 contracts');
  const contractIds = new Set();
  for (const [index, contract] of contracts.entries()) {
    requireObject(contract, `Kalshi contract[${index}]`);
    requireString(contract.contract_id, `Kalshi contract[${index}].contract_id`);
    if (contractIds.has(contract.contract_id)) fail(`Duplicate Kalshi contract ${contract.contract_id}`);
    contractIds.add(contract.contract_id);
    requireString(contract.team_id, `Kalshi contract[${index}].team_id`);
    requireInteger(contract.wins_at_least, `Kalshi contract[${index}].wins_at_least`, { minimum: 1 });
    if (contract.wins_at_least > 17) fail(`Kalshi contract ${contract.contract_id} threshold exceeds 17`);
    requireString(contract.primary_settlement_rule, `Kalshi contract[${index}].primary_settlement_rule`);
  }
  const orderbooks = requireArray(snapshot.orderbooks, 'Kalshi orderbooks');
  if (orderbooks.length !== contracts.length || new Set(orderbooks.map(book => book.ticker)).size !== contracts.length) fail('Kalshi orderbooks must contain one unique book per contract');
  const quotes = requireArray(snapshot.quotes, 'Kalshi quotes');
  if (quotes.length !== contracts.length * 2) fail('Kalshi snapshot must contain YES and NO quotes for every contract');
  const quoteIds = new Set();
  const referenceCounts = policy?.market_data.reference_contract_counts ?? null;
  for (const [index, quote] of quotes.entries()) {
    requireObject(quote, `Kalshi quote[${index}]`);
    requireString(quote.quote_id, `Kalshi quote[${index}].quote_id`);
    if (quoteIds.has(quote.quote_id)) fail(`Duplicate Kalshi quote ${quote.quote_id}`);
    quoteIds.add(quote.quote_id);
    if (!contractIds.has(quote.contract_id)) fail(`Kalshi quote ${quote.quote_id} has unknown contract`);
    requireEnum(quote.side, new Set(['yes', 'no']), `Kalshi quote ${quote.quote_id} side`);
    requireNumber(quote.bid, `Kalshi quote ${quote.quote_id} bid`, { minimum: 0, maximum: 1, nullable: true });
    requireNumber(quote.ask, `Kalshi quote ${quote.quote_id} ask`, { minimum: 0, maximum: 1, nullable: true });
    requireNumber(quote.spread, `Kalshi quote ${quote.quote_id} spread`, { minimum: 0, maximum: 1, nullable: true });
    requireIso(quote.captured_at, `Kalshi quote ${quote.quote_id} captured_at`);
    requireIso(quote.stale_after, `Kalshi quote ${quote.quote_id} stale_after`);
    if (quote.fee_schedule_id !== snapshot.fee_schedule_id) fail(`Kalshi quote ${quote.quote_id} fee schedule does not match snapshot`);
    const scenarios = requireArray(quote.execution_scenarios, `Kalshi quote ${quote.quote_id} scenarios`);
    if (referenceCounts && (scenarios.length !== referenceCounts.length || scenarios.some(scenario => !referenceCounts.includes(scenario.requested_contracts)))) {
      fail(`Kalshi quote ${quote.quote_id} scenarios do not match market policy`);
    }
    for (const scenario of scenarios) {
      requireNumber(scenario.requested_contracts, 'Kalshi requested contracts', { minimum: Number.EPSILON });
      requireNumber(scenario.filled_contracts, 'Kalshi filled contracts', { minimum: 0 });
      requireNumber(scenario.unfilled_contracts, 'Kalshi unfilled contracts', { minimum: 0 });
      requireBoolean(scenario.full_fill, 'Kalshi full-fill flag');
      if (scenario.filled_contracts - scenario.requested_contracts > 1e-6) fail('Kalshi scenario fills more than requested');
      if (Math.abs(scenario.filled_contracts + scenario.unfilled_contracts - scenario.requested_contracts) > 1e-6) fail('Kalshi scenario filled and unfilled counts do not reconcile');
      if (scenario.full_fill !== (Math.abs(scenario.filled_contracts - scenario.requested_contracts) < 1e-6)) fail('Kalshi scenario full-fill flag is inconsistent');
    }
  }
  const diagnostics = requireArray(snapshot.diagnostics, 'Kalshi diagnostics');
  if (diagnostics.length !== quotes.length) fail('Kalshi snapshot must contain one diagnostic per quote');
  const diagnosticIds = new Set();
  for (const diagnostic of diagnostics) {
    requireString(diagnostic.comparison_id, 'Kalshi diagnostic comparison ID');
    if (diagnosticIds.has(diagnostic.comparison_id)) fail(`Duplicate Kalshi diagnostic ${diagnostic.comparison_id}`);
    diagnosticIds.add(diagnostic.comparison_id);
    if (!quoteIds.has(diagnostic.quote_id)) fail(`Kalshi diagnostic ${diagnostic.comparison_id} has unknown quote`);
    requireBoolean(diagnostic.research_qualified, `Kalshi diagnostic ${diagnostic.comparison_id} research flag`);
    requireBoolean(diagnostic.action_eligible, `Kalshi diagnostic ${diagnostic.comparison_id} action flag`);
    if (snapshot.forecast_state !== 'validated' && diagnostic.action_eligible) fail('Non-validated forecast cannot produce action-eligible Kalshi diagnostics');
    requireStringArray(diagnostic.failed_gates, `Kalshi diagnostic ${diagnostic.comparison_id} failed gates`);
  }
  const actionIds = requireStringArray(snapshot.action_candidate_ids, 'Kalshi action candidate IDs');
  if (actionIds.some(id => !diagnosticIds.has(id))) fail('Kalshi action candidate list contains an unknown diagnostic');
  if (actionIds.length !== diagnostics.filter(diagnostic => diagnostic.action_eligible).length) fail('Kalshi action candidate count does not match diagnostics');
  const teams = requireObject(snapshot.teams, 'Kalshi team curves');
  if (Object.keys(teams).length !== 32) fail('Kalshi snapshot must contain 32 team curves');
  for (const [teamId, team] of Object.entries(teams)) {
    if (team.coverage?.all_17_tails !== true || team.thresholds?.length !== 17) fail(`Kalshi team ${teamId} must contain all 17 tails`);
  }
  if (policy && snapshot.policy_version !== policy.policy_id) fail('Kalshi snapshot policy version does not match active policy');
  if (feeSchedule && snapshot.fee_schedule_id !== feeSchedule.fee_schedule_id) fail('Kalshi snapshot fee schedule does not match active fee schedule');
  return true;
}

export function validatePublicManifest(manifest) {
  requireObject(manifest, 'public manifest');
  if (manifest.schema_version !== 1) fail('public manifest schema_version must be 1');
  requireString(manifest.manifest_id, 'public manifest manifest_id');
  requireInteger(manifest.season, 'public manifest season', { minimum: 2000 });
  requireIso(manifest.generated_at, 'public manifest generated_at');
  const policies = requireObject(manifest.policy_versions, 'public manifest policy_versions');
  ['freshness', 'forecast', 'market', 'sources', 'learning'].forEach(key => requireString(policies[key], `public manifest policy_versions.${key}`));
  const evidence = requireObject(manifest.evidence, 'public manifest evidence');
  requireString(evidence.snapshot_id, 'public manifest evidence.snapshot_id');
  requireString(evidence.path, 'public manifest evidence.path');
  requireIso(evidence.captured_at, 'public manifest evidence.captured_at');
  requireEnum(evidence.status, RECORD_STATUSES, 'public manifest evidence.status');
  requireBoolean(evidence.claim_level_freshness_complete, 'public manifest evidence.claim_level_freshness_complete');
  const forecast = requireObject(manifest.forecast, 'public manifest forecast');
  if (forecast.version_id !== null) requireString(forecast.version_id, 'public manifest forecast.version_id');
  if (forecast.path !== null) requireString(forecast.path, 'public manifest forecast.path');
  requireEnum(forecast.status, new Set(['missing', ...MODEL_STATES]), 'public manifest forecast.status');
  requireBoolean(forecast.decision_eligible, 'public manifest forecast.decision_eligible');
  if (forecast.status !== 'validated' && forecast.decision_eligible) fail('Only a validated public forecast can be decision eligible');
  if (forecast.validation_report_id !== null) requireString(forecast.validation_report_id, 'public manifest forecast.validation_report_id');
  if (forecast.validation_report_path !== null) requireString(forecast.validation_report_path, 'public manifest forecast.validation_report_path');
  const markets = requireObject(manifest.markets, 'public manifest markets');
  const kalshi = requireObject(markets.kalshi, 'public manifest markets.kalshi');
  requireString(kalshi.snapshot_id, 'public manifest markets.kalshi.snapshot_id');
  requireString(kalshi.path, 'public manifest markets.kalshi.path');
  requireString(kalshi.summary_path, 'public manifest markets.kalshi.summary_path');
  requireIso(kalshi.captured_at, 'public manifest markets.kalshi.captured_at');
  requireIso(kalshi.stale_after, 'public manifest markets.kalshi.stale_after');
  requireEnum(kalshi.source_time_confidence, new Set(['source-time', 'capture-time-only']), 'public manifest markets.kalshi.source_time_confidence');
  requireString(kalshi.fee_schedule_id, 'public manifest markets.kalshi.fee_schedule_id');
  requireBoolean(kalshi.full_orderbook, 'public manifest markets.kalshi.full_orderbook');
  requireNumber(kalshi.reference_contract_count, 'public manifest markets.kalshi.reference_contract_count', { minimum: Number.EPSILON });
  requireInteger(kalshi.research_qualified_diagnostics, 'public manifest markets.kalshi.research_qualified_diagnostics', { minimum: 0 });
  requireInteger(kalshi.persistent_research_diagnostics, 'public manifest markets.kalshi.persistent_research_diagnostics', { minimum: 0 });
  requireInteger(kalshi.action_eligible_candidates, 'public manifest markets.kalshi.action_eligible_candidates', { minimum: 0 });
  requireBoolean(kalshi.action_eligible, 'public manifest markets.kalshi.action_eligible');
  if (forecast.status !== 'validated' && kalshi.action_eligible) fail('Kalshi market cannot be action eligible without a validated forecast');
  const readiness = requireObject(manifest.readiness, 'public manifest readiness');
  requireString(readiness.audit_id, 'public manifest readiness.audit_id');
  requireString(readiness.path, 'public manifest readiness.path');
  requireEnum(readiness.status, new Set(['ready', 'degraded', 'blocked']), 'public manifest readiness.status');
  requireStringArray(manifest.warnings, 'public manifest warnings');
  return true;
}

const validatePublicRefs = refs => {
  requireObject(refs, 'decision event public_refs');
  requireString(refs.public_manifest_id, 'decision event public_refs.public_manifest_id');
  if (refs.evidence_snapshot_id !== null) requireString(refs.evidence_snapshot_id, 'decision event public_refs.evidence_snapshot_id');
  if (refs.forecast_version_id !== null) requireString(refs.forecast_version_id, 'decision event public_refs.forecast_version_id');
  requireStringArray(refs.quote_ids, 'decision event public_refs.quote_ids');
  if (refs.weekly_state_version_id !== undefined && refs.weekly_state_version_id !== null) requireString(refs.weekly_state_version_id, 'decision event public_refs.weekly_state_version_id');
  if (refs.market_snapshot_id !== undefined && refs.market_snapshot_id !== null) requireString(refs.market_snapshot_id, 'decision event public_refs.market_snapshot_id');
  if (refs.policy_versions !== undefined) {
    const policies = requireObject(refs.policy_versions, 'decision event public_refs.policy_versions');
    Object.entries(policies).forEach(([key, value]) => requireString(value, `decision event public_refs.policy_versions.${key}`));
  }
};

const validateCreatedPayload = payload => {
  requireString(payload.title, 'thesis.created payload.title');
  requireString(payload.team_id, 'thesis.created payload.team_id');
  const market = requireObject(payload.market, 'thesis.created payload.market');
  ['venue_id', 'market_type', 'side', 'contract_id'].forEach(key => requireString(market[key], `thesis.created payload.market.${key}`));
  requireNumber(market.threshold, 'thesis.created payload.market.threshold', { minimum: 0, maximum: 17, nullable: true });
  requireString(payload.thesis, 'thesis.created payload.thesis');
  requireString(payload.contrary_case, 'thesis.created payload.contrary_case');
  const fair = requireObject(payload.fair_price_range, 'thesis.created payload.fair_price_range');
  requireNumber(fair.low, 'thesis.created fair_price_range.low', { minimum: 0, maximum: 1 });
  requireNumber(fair.high, 'thesis.created fair_price_range.high', { minimum: 0, maximum: 1 });
  if (fair.low > fair.high) fail('thesis.created fair-price range low cannot exceed high');
  requireString(fair.basis, 'thesis.created fair_price_range.basis');
  requireNumber(payload.target_price, 'thesis.created payload.target_price', { minimum: 0, maximum: 1 });
  requireNumber(payload.limit_price, 'thesis.created payload.limit_price', { minimum: 0, maximum: 1 });
  requireString(payload.catalyst, 'thesis.created payload.catalyst');
  requireString(payload.invalidation, 'thesis.created payload.invalidation');
  const confidence = requireObject(payload.confidence, 'thesis.created payload.confidence');
  requireEnum(confidence.level, new Set(['low', 'medium', 'high']), 'thesis.created confidence.level');
  requireString(confidence.rationale, 'thesis.created confidence.rationale');
  const risk = requireObject(payload.risk_cap, 'thesis.created payload.risk_cap');
  requireNumber(risk.amount, 'thesis.created risk_cap.amount', { minimum: 0 });
  requireString(risk.unit, 'thesis.created risk_cap.unit');
  requireStringArray(payload.correlation_tags, 'thesis.created payload.correlation_tags');
  requireIso(payload.review_due_at, 'thesis.created payload.review_due_at', { nullable: true });
};

const validateDecisionPayload = (eventType, payload) => {
  requireObject(payload, `${eventType} payload`);
  if (eventType === 'thesis.created') return validateCreatedPayload(payload);
  if (eventType === 'thesis.revised') {
    requireObject(payload.changes, 'thesis.revised payload.changes');
    requireString(payload.reason, 'thesis.revised payload.reason');
    return;
  }
  if (eventType === 'thesis.invalidated') return requireString(payload.reason, 'thesis.invalidated payload.reason');
  if (eventType.startsWith('decision.')) {
    requireString(payload.reason, `${eventType} payload.reason`);
    if (payload.quoted_price !== undefined && payload.quoted_price !== null) requireNumber(payload.quoted_price, `${eventType} payload.quoted_price`, { minimum: 0, maximum: 1 });
    if (payload.quoted_size !== undefined && payload.quoted_size !== null) requireNumber(payload.quoted_size, `${eventType} payload.quoted_size`, { minimum: 0 });
    return;
  }
  if (eventType === 'order.recorded' || eventType === 'fill.recorded' || eventType === 'position.closed') {
    requireNumber(payload.price, `${eventType} payload.price`, { minimum: 0, maximum: 1 });
    requireNumber(payload.size, `${eventType} payload.size`, { minimum: Number.EPSILON });
    if (eventType === 'order.recorded') requireString(payload.order_status, 'order.recorded payload.order_status');
    if (eventType === 'position.closed') requireString(payload.reason, 'position.closed payload.reason');
    return;
  }
  if (eventType === 'position.marked') {
    requireNumber(payload.price, 'position.marked payload.price', { minimum: 0, maximum: 1 });
    return;
  }
  if (eventType === 'closing_price.recorded') {
    requireNumber(payload.price, 'closing_price.recorded payload.price', { minimum: 0, maximum: 1 });
    requireIso(payload.observed_at, 'closing_price.recorded payload.observed_at');
    requireString(payload.source_quote_id, 'closing_price.recorded payload.source_quote_id');
    requireString(payload.horizon, 'closing_price.recorded payload.horizon');
    return;
  }
  if (eventType === 'outcome.recorded') return requireString(payload.result, 'outcome.recorded payload.result');
  if (eventType === 'postmortem.recorded') return requireString(payload.summary, 'postmortem.recorded payload.summary');
};

export function validateDecisionEvent(event, { verifyHash = true } = {}) {
  requireObject(event, 'decision event');
  const allowedKeys = new Set(['schema_version', 'event_id', 'event_type', 'entity_id', 'occurred_at', 'recorded_at', 'actor', 'previous_event_hash', 'public_refs', 'payload', 'event_hash']);
  const unexpected = Object.keys(event).filter(key => !allowedKeys.has(key));
  if (unexpected.length > 0) fail(`decision event has unexpected fields: ${unexpected.join(', ')}`);
  if (event.schema_version !== 1) fail('decision event schema_version must be 1');
  requireString(event.event_id, 'decision event event_id');
  requireEnum(event.event_type, DECISION_EVENT_TYPE_SET, 'decision event event_type');
  requireString(event.entity_id, 'decision event entity_id');
  requireIso(event.occurred_at, 'decision event occurred_at');
  requireIso(event.recorded_at, 'decision event recorded_at');
  requireString(event.actor, 'decision event actor');
  if (event.previous_event_hash !== null && !/^[a-f0-9]{64}$/.test(event.previous_event_hash)) fail('decision event previous_event_hash must be null or SHA-256');
  validatePublicRefs(event.public_refs);
  validateDecisionPayload(event.event_type, event.payload);
  if (!/^[a-f0-9]{64}$/.test(event.event_hash)) fail('decision event event_hash must be SHA-256');
  if (verifyHash && event.event_hash !== hashDecisionEvent(event)) fail('decision event hash does not match canonical event content');
  return true;
}

export function prepareDecisionEvent(input, { previousEventHash = null, now = new Date().toISOString() } = {}) {
  requireObject(input, 'decision event input');
  const event = {
    schema_version: 1,
    event_id: input.event_id ?? `evt_${randomUUID()}`,
    event_type: input.event_type,
    entity_id: input.entity_id,
    occurred_at: input.occurred_at ?? now,
    recorded_at: input.recorded_at ?? now,
    actor: input.actor ?? 'local',
    previous_event_hash: previousEventHash,
    public_refs: input.public_refs,
    payload: input.payload,
  };
  event.event_hash = hashDecisionEvent(event);
  validateDecisionEvent(event);
  return event;
}

export function validateDecisionEventChain(events) {
  requireArray(events, 'decision event chain');
  const eventIds = new Set();
  let previousHash = null;
  for (const [index, event] of events.entries()) {
    validateDecisionEvent(event);
    if (eventIds.has(event.event_id)) fail(`decision event chain contains duplicate event_id at index ${index}`);
    if (event.previous_event_hash !== previousHash) fail(`decision event chain breaks before index ${index}`);
    eventIds.add(event.event_id);
    previousHash = event.event_hash;
  }
  return { event_count: events.length, head_hash: previousHash };
}

export function validateRecordStatus(status) {
  return requireEnum(status, RECORD_STATUSES, 'record status');
}
