import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  actualSeasonWins,
  fitTeamStrength,
  leagueBaselinePredictions,
  marketBaselinePredictions,
  predictGames,
  priorRecordBaselinePredictions,
  scoreGamePredictions,
  simulateSchedule,
  spearmanCorrelation,
  validateForecastDistributions,
} from '../lib/forecast-model.mjs';
import { canonicalize, validateForecastPolicy, validateForecastVersion } from '../lib/system-contracts.mjs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const fromRoot = path => resolve(projectRoot, path);
const readJson = async path => JSON.parse(await readFile(fromRoot(path), 'utf8'));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const round = (value, digits = 6) => Number(value.toFixed(digits));
const roundMetrics = metrics => ({
  observations: metrics.observations,
  brier_score: round(metrics.brier_score),
  log_loss: round(metrics.log_loss),
  expected_calibration_error: round(metrics.expected_calibration_error),
  reliability: metrics.reliability.map(bin => ({
    ...bin,
    mean_probability: bin.mean_probability === null ? null : round(bin.mean_probability),
    observed_rate: bin.observed_rate === null ? null : round(bin.observed_rate),
  })),
});
const writeJson = async (path, value) => {
  const absolute = fromRoot(path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
};

const [policy, history, schedule, benchmark, adjustments, teams] = await Promise.all([
  readJson('config/forecast-policy.json'),
  readJson('data/forecast/inputs/results-2010-2025.json'),
  readJson('data/forecast/inputs/schedule-2026.json'),
  readJson('data/forecast/inputs/market-benchmark-2022-2025.json'),
  readJson('data/forecast/inputs/adjustments-2026.json'),
  readJson('data/nfl/teams.json'),
]);
validateForecastPolicy(policy);
const teamIds = teams.map(team => team.abbr).sort();
const baseParameters = {
  training_start_season: policy.model.training_start_season,
  home_field_ridge_penalty: policy.model.home_field_ridge_penalty,
};

const tuningCandidates = [];
for (const recency of policy.model.recency_half_life_grid) {
  for (const ridge of policy.model.ridge_penalty_grid) {
    for (const marginCap of policy.model.margin_cap_grid) {
      const parameters = { ...baseParameters, recency_half_life_seasons: recency, ridge_penalty: ridge, margin_cap_points: marginCap };
      const tuningGames = [];
      const tuningPredictions = [];
      for (const season of policy.model.tuning_seasons) {
        const fit = fitTeamStrength(history.games, teamIds, season, parameters);
        const games = history.games.filter(game => game.season === season);
        tuningGames.push(...games);
        tuningPredictions.push(...predictGames(games, fit));
      }
      const metrics = scoreGamePredictions(tuningGames, tuningPredictions);
      tuningCandidates.push({ parameters, brier_score: metrics.brier_score, log_loss: metrics.log_loss });
    }
  }
}
tuningCandidates.sort((left, right) => left.brier_score - right.brier_score || left.log_loss - right.log_loss);
const selectedParameters = tuningCandidates[0].parameters;

const aggregateGames = [];
const aggregatePredictions = { model: [], league: [], prior_record: [], market: [] };
const holdoutBySeason = [];
for (const [seasonIndex, season] of policy.model.holdout_seasons.entries()) {
  const trainingGames = history.games.filter(game => game.season < season);
  const targetGames = history.games.filter(game => game.season === season);
  const fit = fitTeamStrength(history.games, teamIds, season, selectedParameters);
  const modelPredictions = predictGames(targetGames, fit);
  const leaguePredictions = leagueBaselinePredictions(trainingGames, targetGames);
  const priorRecordPredictions = priorRecordBaselinePredictions(trainingGames, targetGames, season);
  const trainingTieRate = trainingGames.filter(game => game.home_score === game.away_score).length / trainingGames.length;
  const marketPredictions = marketBaselinePredictions(targetGames, benchmark.games, trainingTieRate);
  aggregateGames.push(...targetGames);
  aggregatePredictions.model.push(...modelPredictions);
  aggregatePredictions.league.push(...leaguePredictions);
  aggregatePredictions.prior_record.push(...priorRecordPredictions);
  aggregatePredictions.market.push(...marketPredictions);

  const simulation = simulateSchedule({
    schedule: targetGames,
    fit,
    adjustments: { coverage_complete: true, teams: teamIds.map(team => ({ team_id: team, quarterback_points: 0, availability_points: 0 })) },
    draws: policy.simulation.validation_draws,
    seed: policy.simulation.seed + seasonIndex + 1,
    intervalProbability: policy.simulation.interval_probability,
    offseasonDriftSdPoints: policy.model.offseason_drift_sd_points,
    missingContextSdPoints: 0,
  });
  const actualWins = actualSeasonWins(targetGames, teamIds);
  const expectedWins = Object.fromEntries(simulation.teams.map(team => [team.team_id, team.expected_wins]));
  const coveredTeams = simulation.teams.filter(team => actualWins[team.team_id] >= team.interval_80[0] && actualWins[team.team_id] <= team.interval_80[1]).length;
  holdoutBySeason.push({
    season,
    games: targetGames.length,
    metrics: {
      model: roundMetrics(scoreGamePredictions(targetGames, modelPredictions)),
      league: roundMetrics(scoreGamePredictions(targetGames, leaguePredictions)),
      prior_record: roundMetrics(scoreGamePredictions(targetGames, priorRecordPredictions)),
      market: roundMetrics(scoreGamePredictions(targetGames, marketPredictions)),
    },
    interval_80_coverage: round(coveredTeams / teamIds.length),
    rank_correlation: round(spearmanCorrelation(teamIds.map(team => expectedWins[team]), teamIds.map(team => actualWins[team]))),
  });
}

const aggregateMetrics = Object.fromEntries(Object.entries(aggregatePredictions).map(([name, predictions]) => [name, roundMetrics(scoreGamePredictions(aggregateGames, predictions))]));
const intervalCoverage = mean(holdoutBySeason.map(season => season.interval_80_coverage));
const meanRankCorrelation = mean(holdoutBySeason.map(season => season.rank_correlation));
const promotion = policy.promotion;
const quantitativeGates = {
  holdout_seasons: {
    pass: holdoutBySeason.length >= promotion.minimum_holdout_seasons,
    observed: holdoutBySeason.length,
    required: promotion.minimum_holdout_seasons,
  },
  brier_vs_league: {
    pass: (aggregateMetrics.league.brier_score - aggregateMetrics.model.brier_score) / aggregateMetrics.league.brier_score >= promotion.minimum_brier_improvement_vs_league,
    observed_relative_improvement: round((aggregateMetrics.league.brier_score - aggregateMetrics.model.brier_score) / aggregateMetrics.league.brier_score),
    required_minimum: promotion.minimum_brier_improvement_vs_league,
  },
  brier_vs_prior_record: {
    pass: aggregateMetrics.model.brier_score <= aggregateMetrics.prior_record.brier_score,
    model: aggregateMetrics.model.brier_score,
    prior_record: aggregateMetrics.prior_record.brier_score,
  },
  log_loss_vs_prior_record: {
    pass: aggregateMetrics.model.log_loss <= aggregateMetrics.prior_record.log_loss,
    model: aggregateMetrics.model.log_loss,
    prior_record: aggregateMetrics.prior_record.log_loss,
  },
  calibration: {
    pass: aggregateMetrics.model.expected_calibration_error <= promotion.maximum_expected_calibration_error,
    observed: aggregateMetrics.model.expected_calibration_error,
    maximum: promotion.maximum_expected_calibration_error,
  },
  interval_coverage: {
    pass: intervalCoverage >= promotion.minimum_interval_coverage && intervalCoverage <= promotion.maximum_interval_coverage,
    observed: round(intervalCoverage),
    range: [promotion.minimum_interval_coverage, promotion.maximum_interval_coverage],
  },
};
const quantitativePass = Object.values(quantitativeGates).every(gate => gate.pass);

const productionFit = fitTeamStrength(history.games, teamIds, 2026, selectedParameters);
const productionSimulation = simulateSchedule({
  schedule: schedule.games,
  fit: productionFit,
  adjustments,
  draws: policy.simulation.production_draws,
  seed: policy.simulation.seed,
  intervalProbability: policy.simulation.interval_probability,
  offseasonDriftSdPoints: policy.model.offseason_drift_sd_points,
  missingContextSdPoints: policy.model.missing_context_sd_points,
});
const replayArguments = {
  schedule: schedule.games.slice(0, 8),
  fit: productionFit,
  adjustments,
  draws: 1024,
  seed: policy.simulation.seed,
  intervalProbability: policy.simulation.interval_probability,
  offseasonDriftSdPoints: policy.model.offseason_drift_sd_points,
  missingContextSdPoints: policy.model.missing_context_sd_points,
};
const deterministicReplay = JSON.stringify(simulateSchedule(replayArguments)) === JSON.stringify(simulateSchedule(replayArguments));

const codeHash = sha256(await readFile(fromRoot('lib/forecast-model.mjs')));
const policyHash = sha256(await readFile(fromRoot('config/forecast-policy.json')));
const versionIdentity = canonicalize({
  model_id: policy.model.model_id,
  code_version: policy.model.code_version,
  code_sha256: codeHash,
  input_versions: [history.dataset_id, schedule.dataset_id, adjustments.adjustment_version_id],
  policy_sha256: policyHash,
  selected_parameters: selectedParameters,
  seed: policy.simulation.seed,
  draws: policy.simulation.production_draws,
});
const versionHash = sha256(JSON.stringify(versionIdentity)).slice(0, 16);
const forecastVersionId = `fcst-2026-preseason-${versionHash}`;
const validationReportId = `validation-${forecastVersionId}`;
const validationReportPath = `data/audit/${validationReportId}.json`;
const distributionProbe = {
  teams: productionSimulation.teams,
};
const distributionValidation = validateForecastDistributions(distributionProbe);
const structuralGates = {
  deterministic_replay: { pass: deterministicReplay },
  exact_win_distributions: { pass: true, ...distributionValidation },
  schedule_coherence: {
    pass: productionSimulation.summary.coherence_error <= 1e-9,
    observed_error: productionSimulation.summary.coherence_error,
  },
  schedule_completeness: {
    pass: productionSimulation.summary.schedule_games === 272,
    observed_games: productionSimulation.summary.schedule_games,
    required_games: 272,
  },
};
const structuralPass = Object.values(structuralGates).every(gate => gate.pass);
const adjustmentGate = {
  pass: adjustments.coverage_complete,
  observed_teams: adjustments.teams.filter(team => team.status !== 'unsourced-placeholder').length,
  required_teams: 32,
};
const modelState = structuralPass && quantitativePass && (!promotion.requires_current_adjustment_coverage || adjustmentGate.pass)
  ? 'validated'
  : structuralPass ? 'provisional' : 'research';

const validationReport = {
  schema_version: 1,
  validation_report_id: validationReportId,
  forecast_version_id: forecastVersionId,
  generated_at: adjustments.as_of,
  preregistration_path: 'FORECAST_DESIGN.md',
  input_versions: {
    historical_results: history.dataset_id,
    evaluation_market_benchmark: benchmark.dataset_id,
  },
  split: {
    training_start_season: policy.model.training_start_season,
    tuning_seasons: policy.model.tuning_seasons,
    holdout_seasons: policy.model.holdout_seasons,
  },
  selected_parameters: selectedParameters,
  tuning_candidates: tuningCandidates.map(candidate => ({
    parameters: candidate.parameters,
    brier_score: round(candidate.brier_score),
    log_loss: round(candidate.log_loss),
  })),
  holdout: {
    aggregate_metrics: aggregateMetrics,
    interval_80_coverage: round(intervalCoverage),
    mean_rank_correlation: round(meanRankCorrelation),
    by_season: holdoutBySeason,
  },
  gates: {
    structural: structuralGates,
    quantitative: quantitativeGates,
    current_adjustments: adjustmentGate,
  },
  structural_pass: structuralPass,
  quantitative_pass: quantitativePass,
  promoted_state: modelState,
  warnings: [
    'Historical moneylines are evaluation-only and have source-field timing confidence, not verified closing-line provenance.',
    ...(adjustmentGate.pass ? [] : ['Current quarterback and material availability coverage is incomplete; validated promotion is blocked.']),
  ],
};

const forecast = {
  schema_version: 1,
  forecast_version_id: forecastVersionId,
  season: 2026,
  model_id: policy.model.model_id,
  model_state: modelState,
  as_of: adjustments.as_of,
  generated_at: adjustments.as_of,
  code_version: policy.model.code_version,
  code_fingerprint: `sha256:${codeHash}`,
  input_versions: [history.dataset_id, schedule.dataset_id, adjustments.adjustment_version_id],
  policy_version: policy.policy_id,
  seed: policy.simulation.seed,
  draws: policy.simulation.production_draws,
  fit_summary: {
    selected_parameters: selectedParameters,
    training_game_count: productionFit.training_game_count,
    effective_training_weight: round(productionFit.effective_training_weight),
    home_field_points: round(productionFit.home_field_points),
    residual_sd_points: round(productionFit.residual_sd_points),
    tie_probability: round(productionFit.tie_probability),
  },
  simulation_summary: {
    schedule_games: productionSimulation.summary.schedule_games,
    expected_team_wins: round(productionSimulation.summary.expected_team_wins),
    expected_tied_games: round(productionSimulation.summary.expected_tied_games),
    coherence_error: productionSimulation.summary.coherence_error,
  },
  teams: productionSimulation.teams.map(team => {
    const storedMass = team.win_probability_mass.map(value => round(value, 8));
    return {
      ...team,
      strength_mean_points: round(team.strength_mean_points),
      strength_sd_points: round(team.strength_sd_points),
      win_probability_mass: storedMass,
      expected_wins: round(storedMass.reduce((sum, probability, wins) => sum + probability * wins, 0), 8),
    };
  }),
  validation_report_id: validationReportId,
  validation_report_path: validationReportPath,
  decision_eligible: modelState === 'validated',
  warnings: [
    ...(adjustmentGate.pass ? [] : ['All 32 current quarterback and availability adjustments are explicit zero placeholders, not sourced estimates.']),
    ...(quantitativePass ? [] : ['One or more preregistered quantitative promotion gates did not pass.']),
    'Provisional forecasts are lab outputs and cannot create automated action labels.',
    'No playoff, conference or championship probabilities are produced in schedule-sim-v1.',
  ],
};
validateForecastVersion(forecast);
validateForecastDistributions(forecast, 1e-6);

const forecastPath = `data/forecasts/${forecastVersionId}.json`;
await Promise.all([
  writeJson(validationReportPath, validationReport),
  writeJson(forecastPath, forecast),
]);
console.log(JSON.stringify({
  forecast: forecastPath,
  forecast_version_id: forecastVersionId,
  model_state: modelState,
  draws: forecast.draws,
  selected_parameters: selectedParameters,
  holdout: {
    model_brier: aggregateMetrics.model.brier_score,
    league_brier: aggregateMetrics.league.brier_score,
    prior_record_brier: aggregateMetrics.prior_record.brier_score,
    market_brier: aggregateMetrics.market.brier_score,
    model_ece: aggregateMetrics.model.expected_calibration_error,
    interval_80_coverage: round(intervalCoverage),
    mean_rank_correlation: round(meanRankCorrelation),
  },
  structural_pass: structuralPass,
  quantitative_pass: quantitativePass,
  adjustment_coverage_pass: adjustmentGate.pass,
  validation_report: validationReportPath,
}, null, 2));

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
