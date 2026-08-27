import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseCsv } from '../lib/csv.mjs';
import {
  fitTeamStrength,
  gameProbabilities,
  normalCdf,
  scorePredictionRows,
  simulateSchedule,
  spearmanCorrelation,
  validateForecastDistributions,
} from '../lib/forecast-model.mjs';
import { validateForecastVersion } from '../lib/system-contracts.mjs';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

test('CSV parser preserves quoted commas and escaped quotes', () => {
  const parsed = parseCsv('id,label,note\n1,"Los Angeles, CA","said ""hello"""\n');
  assert.deepEqual(parsed, [{ id: '1', label: 'Los Angeles, CA', note: 'said "hello"' }]);
});

test('normal CDF is symmetric and game probabilities form a simplex', () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-9);
  assert.ok(Math.abs(normalCdf(1.2) + normalCdf(-1.2) - 1) < 1e-7);
  const probabilities = gameProbabilities({ location: 'home' }, 2, -1, 1.5, 12, 0.004);
  assert.ok(probabilities.home_win > probabilities.away_win);
  assert.ok(Math.abs(probabilities.home_win + probabilities.away_win + probabilities.tie - 1) < 1e-12);
});

test('opponent-adjusted fit points the stronger synthetic team upward', () => {
  const games = [];
  for (let season = 2015; season <= 2020; season += 1) {
    games.push({ game_id: `${season}-a`, season, home_team: 'AAA', away_team: 'BBB', home_score: 27, away_score: 17, location: 'home' });
    games.push({ game_id: `${season}-b`, season, home_team: 'BBB', away_team: 'AAA', home_score: 17, away_score: 24, location: 'home' });
  }
  const fit = fitTeamStrength(games, ['AAA', 'BBB'], 2021, {
    training_start_season: 2015,
    recency_half_life_seasons: 2.5,
    ridge_penalty: 4,
    margin_cap_points: 21,
    home_field_ridge_penalty: 1,
  });
  assert.ok(fit.strengths.AAA > fit.strengths.BBB);
  assert.ok(fit.residual_sd_points > 0);
  assert.ok(fit.tie_probability === 0);
});

test('schedule simulation is deterministic and coherent', () => {
  const fit = {
    team_ids: ['AAA', 'BBB'],
    strengths: { AAA: 2, BBB: -2 },
    coefficient_sd_points: { AAA: 0.5, BBB: 0.5 },
    home_field_points: 1.5,
    residual_sd_points: 12,
    tie_probability: 0.004,
  };
  const schedule = [
    { game_id: 'one', season: 2026, week: 1, home_team: 'AAA', away_team: 'BBB', location: 'home' },
    { game_id: 'two', season: 2026, week: 2, home_team: 'BBB', away_team: 'AAA', location: 'home' },
  ];
  const adjustments = { coverage_complete: true, teams: [
    { team_id: 'AAA', quarterback_points: 0, availability_points: 0 },
    { team_id: 'BBB', quarterback_points: 0, availability_points: 0 },
  ] };
  const options = { schedule, fit, adjustments, draws: 5000, seed: 17, intervalProbability: 0.8, offseasonDriftSdPoints: 2 };
  const first = simulateSchedule(options);
  const second = simulateSchedule(options);
  assert.deepEqual(first, second);
  assert.ok(first.summary.coherence_error < 1e-10);
  for (const team of first.teams) assert.ok(Math.abs(team.win_probability_mass.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
});

test('prediction metrics and Spearman correlation reproduce known cases', () => {
  const perfect = scorePredictionRows([{ probability: 1, outcome: 1 }, { probability: 0, outcome: 0 }]);
  assert.ok(perfect.brier_score < 1e-15);
  assert.ok(perfect.log_loss < 1e-8);
  assert.equal(spearmanCorrelation([1, 2, 3], [10, 20, 30]), 1);
  assert.equal(spearmanCorrelation([1, 2, 3], [30, 20, 10]), -1);
});

test('normalized forecast inputs pass grain, completeness, and leakage checks', async () => {
  const [history, schedule, benchmark, quality] = await Promise.all([
    readJson('data/forecast/inputs/results-2010-2025.json'),
    readJson('data/forecast/inputs/schedule-2026.json'),
    readJson('data/forecast/inputs/market-benchmark-2022-2025.json'),
    readJson('data/audit/20260827T144340Z-forecast-input-quality.json'),
  ]);
  assert.equal(history.game_count, 4175);
  assert.equal(schedule.game_count, 272);
  assert.equal(new Set(schedule.games.map(game => game.game_id)).size, 272);
  assert.ok(Object.values(schedule.team_game_counts).every(count => count === 17));
  assert.equal(history.market_fields_present, false);
  assert.equal(schedule.market_fields_present, false);
  assert.ok(!/(moneyline|spread)/i.test(JSON.stringify(history.games[0])));
  assert.ok(!/(moneyline|spread)/i.test(JSON.stringify(schedule.games[0])));
  assert.ok(benchmark.games.every(game => Number.isFinite(game.home_moneyline) && Number.isFinite(game.away_moneyline)));
  assert.equal(quality.quality_valid, true);
  const raw = await readFile('data/forecast/sources/nflverse-games-0192370d.csv');
  assert.equal(createHash('sha256').update(raw).digest('hex'), quality.raw_sha256);
});

test('active forecast is a valid, coherent, provisional 32-team distribution', async () => {
  const manifest = await readJson('data/current/public-manifest.json');
  const forecast = await readJson(manifest.forecast.path);
  const validation = await readJson(forecast.validation_report_path);
  assert.equal(validateForecastVersion(forecast), true);
  const distribution = validateForecastDistributions(forecast, 1e-6);
  assert.equal(distribution.team_count, 32);
  assert.equal(forecast.model_state, 'provisional');
  assert.equal(forecast.decision_eligible, false);
  assert.equal(forecast.draws, 100000);
  assert.equal(forecast.simulation_summary.schedule_games, 272);
  assert.ok(forecast.simulation_summary.expected_tied_games < 2);
  assert.ok(forecast.simulation_summary.coherence_error < 1e-9);
  assert.equal(validation.structural_pass, true);
  assert.equal(validation.quantitative_pass, false);
  assert.equal(validation.gates.quantitative.calibration.pass, false);
  assert.equal(validation.gates.current_adjustments.pass, false);
});
