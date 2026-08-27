import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import { parseCsv } from '../lib/csv.mjs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const fromRoot = path => resolve(projectRoot, path);
const readJson = async path => JSON.parse(await readFile(fromRoot(path), 'utf8'));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const round = (value, digits = 6) => Number(value.toFixed(digits));
const writeJson = async (path, value) => {
  const absolute = fromRoot(path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
};

const teamAliases = new Map([
  ['LA', 'LAR'],
  ['STL', 'LAR'],
  ['SD', 'LAC'],
  ['OAK', 'LV'],
]);
const normalizeTeam = team => teamAliases.get(team) ?? team;
const numberOrNull = value => value === '' ? null : Number(value);

const [sourceConfig, teamRegistry] = await Promise.all([
  readJson('config/forecast-source.json'),
  readJson('data/nfl/teams.json'),
]);
const sourceFileArgument = process.argv[2] ?? null;
const raw = sourceFileArgument
  ? await readFile(resolve(sourceFileArgument), 'utf8')
  : await fetch(sourceConfig.source_url).then(response => {
    if (!response.ok) throw new Error(`Forecast source download failed with HTTP ${response.status}`);
    return response.text();
  });
const rawHash = sha256(raw);
const rows = parseCsv(raw);
const requiredColumns = ['game_id', 'season', 'game_type', 'week', 'gameday', 'away_team', 'away_score', 'home_team', 'home_score', 'location', 'away_moneyline', 'home_moneyline'];
for (const column of requiredColumns) {
  if (!(column in (rows[0] ?? {}))) throw new Error(`Forecast source is missing required column ${column}`);
}

const teamIds = new Set(teamRegistry.map(team => team.abbr));
const regularSeason = rows.filter(row => row.game_type === 'REG');
const historicalRows = regularSeason.filter(row => Number(row.season) >= 2010 && Number(row.season) <= 2025);
const resultRows = historicalRows.filter(row => row.away_score !== '' && row.home_score !== '');
const scheduleRows = regularSeason.filter(row => Number(row.season) === 2026);
const benchmarkRows = historicalRows.filter(row => Number(row.season) >= 2022 && row.away_moneyline !== '' && row.home_moneyline !== '');

const normalizeIdentity = row => ({
  game_id: row.game_id,
  season: Number(row.season),
  week: Number(row.week),
  gameday: row.gameday,
  away_team: normalizeTeam(row.away_team),
  home_team: normalizeTeam(row.home_team),
  location: row.location === 'Neutral' ? 'neutral' : 'home',
});
const results = resultRows.map(row => ({
  ...normalizeIdentity(row),
  away_score: Number(row.away_score),
  home_score: Number(row.home_score),
}));
const schedule = scheduleRows.map(normalizeIdentity);
const marketBenchmark = benchmarkRows.map(row => ({
  game_id: row.game_id,
  season: Number(row.season),
  away_moneyline: Number(row.away_moneyline),
  home_moneyline: Number(row.home_moneyline),
}));

const duplicateGameIds = values => values.length - new Set(values.map(game => game.game_id)).size;
const invalidTeams = [...new Set([...results, ...schedule].flatMap(game => [game.away_team, game.home_team]).filter(team => !teamIds.has(team)))];
const scheduleAppearances = Object.fromEntries([...teamIds].sort().map(team => [team, 0]));
for (const game of schedule) {
  scheduleAppearances[game.away_team] += 1;
  scheduleAppearances[game.home_team] += 1;
}
const invalidScheduleAppearances = Object.entries(scheduleAppearances).filter(([, count]) => count !== 17);
const seasonCounts = Object.fromEntries([...new Set(results.map(game => game.season))].sort().map(season => [season, results.filter(game => game.season === season).length]));
const source = {
  source_id: sourceConfig.source_id,
  label: sourceConfig.label,
  source_commit: sourceConfig.source_commit,
  source_url: sourceConfig.source_url,
  documentation_url: sourceConfig.documentation_url,
  license: sourceConfig.license,
  retrieved_at: sourceConfig.retrieved_at,
  raw_path: sourceConfig.raw_path,
  raw_sha256: rawHash,
};
const historyId = `forecast-results-2010-2025-${sha256(JSON.stringify(results)).slice(0, 12)}`;
const scheduleId = `forecast-schedule-2026-${sha256(JSON.stringify(schedule)).slice(0, 12)}`;
const benchmarkId = `forecast-market-benchmark-2022-2025-${sha256(JSON.stringify(marketBenchmark)).slice(0, 12)}`;

const historyArtifact = {
  schema_version: 1,
  dataset_id: historyId,
  season_start: 2010,
  season_end: 2025,
  grain: 'one completed regular-season game',
  source,
  market_fields_present: false,
  game_count: results.length,
  season_game_counts: seasonCounts,
  games: results,
};
const scheduleArtifact = {
  schema_version: 1,
  dataset_id: scheduleId,
  season: 2026,
  grain: 'one scheduled regular-season game',
  source,
  market_fields_present: false,
  game_count: schedule.length,
  team_game_counts: scheduleAppearances,
  games: schedule,
};
const benchmarkArtifact = {
  schema_version: 1,
  dataset_id: benchmarkId,
  season_start: 2022,
  season_end: 2025,
  grain: 'one completed regular-season game with both historical moneylines',
  purpose: 'evaluation-only; never accepted by model fitting or simulation functions',
  timing_confidence: 'source-field-timing-unspecified',
  source,
  game_count: marketBenchmark.length,
  games: marketBenchmark,
};

const checks = {
  raw_rows: rows.length,
  historical_completed_regular_season_games: results.length,
  historical_missing_result_rate: round((historicalRows.length - resultRows.length) / historicalRows.length),
  historical_duplicate_game_ids: duplicateGameIds(results),
  normalized_invalid_team_ids: invalidTeams,
  schedule_games: schedule.length,
  schedule_duplicate_game_ids: duplicateGameIds(schedule),
  schedule_teams: Object.keys(scheduleAppearances).length,
  schedule_team_appearance_failures: invalidScheduleAppearances,
  schedule_week_min: Math.min(...schedule.map(game => game.week)),
  schedule_week_max: Math.max(...schedule.map(game => game.week)),
  schedule_market_fields_present: Object.keys(schedule[0] ?? {}).some(key => key.includes('moneyline') || key.includes('spread')),
  history_market_fields_present: Object.keys(results[0] ?? {}).some(key => key.includes('moneyline') || key.includes('spread')),
  evaluation_moneyline_coverage_rate: round(marketBenchmark.length / resultRows.filter(row => Number(row.season) >= 2022).length),
};
const qualityValid = checks.historical_missing_result_rate === 0
  && checks.historical_duplicate_game_ids === 0
  && invalidTeams.length === 0
  && checks.schedule_games === 272
  && checks.schedule_duplicate_game_ids === 0
  && invalidScheduleAppearances.length === 0
  && !checks.schedule_market_fields_present
  && !checks.history_market_fields_present;
const qualityAudit = {
  schema_version: 1,
  audit_id: `forecast-input-quality-${sourceConfig.retrieved_at.replace(/[-:.]/g, '')}`,
  generated_at: sourceConfig.retrieved_at,
  intended_use: 'market-independent preseason team-strength fitting and coherent 2026 schedule simulation',
  source_id: sourceConfig.source_id,
  raw_sha256: rawHash,
  dataset_ids: [historyId, scheduleId, benchmarkId],
  quality_valid: qualityValid,
  checks,
  findings: [
    {
      severity: 'medium',
      confidence: 'high',
      finding: 'The 2022 regular season contains 271 completed games because Buffalo–Cincinnati was canceled and is not imputed.',
      impact: 'Holdout season totals use actual completed games rather than forcing a 272nd result.',
    },
    {
      severity: 'medium',
      confidence: 'high',
      finding: 'Historical moneylines are complete for the holdout but their exact venue and timing are not strong enough to label as closing prices.',
      impact: 'They are reported as an evaluation-only benchmark and are excluded from promotion requirements and model features.',
    },
    {
      severity: 'high',
      confidence: 'high',
      finding: 'Current 2026 quarterback and material availability adjustments are not yet sourced.',
      impact: 'The forecast can be provisional but cannot be promoted to validated or decision-eligible.',
    },
  ],
};
if (!qualityValid) throw new Error(`Forecast input quality gates failed: ${JSON.stringify(checks)}`);

await mkdir(dirname(fromRoot(sourceConfig.raw_path)), { recursive: true });
await writeFile(fromRoot(sourceConfig.raw_path), raw);
await Promise.all([
  writeJson(sourceConfig.history_path, historyArtifact),
  writeJson(sourceConfig.schedule_path, scheduleArtifact),
  writeJson(sourceConfig.market_benchmark_path, benchmarkArtifact),
  writeJson('data/audit/20260827T144340Z-forecast-input-quality.json', qualityAudit),
]);

console.log(JSON.stringify({
  source_snapshot: relative(projectRoot, fromRoot(sourceConfig.raw_path)),
  raw_sha256: rawHash,
  history: { path: sourceConfig.history_path, id: historyId, games: results.length },
  schedule: { path: sourceConfig.schedule_path, id: scheduleId, games: schedule.length },
  market_benchmark: { path: sourceConfig.market_benchmark_path, id: benchmarkId, games: marketBenchmark.length },
  quality_audit: 'data/audit/20260827T144340Z-forecast-input-quality.json',
  quality_valid: qualityValid,
}, null, 2));
