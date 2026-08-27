import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const [sportsbookPath, kalshiPath, outputPath] = process.argv.slice(2);
if (!sportsbookPath || !kalshiPath || !outputPath) {
  throw new Error('Usage: node scripts/audit-decision-system.mjs SPORTSBOOK_JSON KALSHI_JSON OUTPUT_JSON');
}

const readJson = async path => JSON.parse(await readFile(resolve(path), 'utf8'));
const [manifest, previews, teams, sportsbook, kalshi] = await Promise.all([
  readJson('data/sources/manifest.json'),
  readJson('data/previews/2026-team-previews.json'),
  readJson('data/nfl/teams.json'),
  readJson(sportsbookPath),
  readJson(kalshiPath),
]);

const rankingFiles = [
  '2026-qb.json',
  '2026-coaching.json',
  '2026-offensive-line.json',
  '2026-skill-positions.json',
  '2026-offense.json',
  '2026-defense.json',
];
const rankings = await Promise.all(rankingFiles.map(file => readJson(`data/rankings/${file}`)));
const sourceIds = manifest.documents.map(source => source.category_id ?? source.source_id);
const previewTeamIds = previews.sources.flatMap(source => source.covered_teams);
const previewEvidence = previews.sources.flatMap(source => source.teams);
const ballots = previews.sources.flatMap(source => source.ballots);
const previewClaimFragments = previewEvidence.reduce((total, team) => total + team.positives.length + team.concerns.length + team.context.length, 0);
const scoringSources = manifest.documents.filter(source => source.scoring_eligible);
const analysisWeight = scoringSources.reduce((total, source) => total + source.analysis_weight, 0);
const sportsbookCaptured = new Date(sportsbook.captured_at);
const kalshiCaptured = new Date(kalshi.captured_at);
const marketFiles = (await readdir(resolve('data/markets'))).filter(file => file.endsWith('.json'));

if (sourceIds.length !== new Set(sourceIds).size) throw new Error('Editorial source identifiers must be unique');
if (manifest.selected_count !== sourceIds.length) throw new Error('Manifest selected_count does not match documents');
if (previews.sources.length !== manifest.preview_source_count) throw new Error('Preview registry and source manifest counts disagree');
if (teams.length !== 32 || new Set(teams.map(team => team.abbr)).size !== 32) throw new Error('Team registry must contain 32 unique teams');
if (new Set(previewTeamIds).size !== 32) throw new Error('Preview evidence must cover all 32 teams in the current edition');
if (previewEvidence.length !== 32 || new Set(previewEvidence.map(team => team.team)).size !== 32) throw new Error('Current preview registry must contain one team evidence record per NFL team');
if (rankings.some(ranking => ranking.order.length !== 32 || new Set(ranking.order).size !== 32)) throw new Error('Every scoring ranking must contain 32 unique teams');
if (analysisWeight !== 100) throw new Error(`Scoring-source analysis weights must sum to 100; found ${analysisWeight}`);
if (sportsbook.audit.teams_with_paired_primary_quote !== 32) throw new Error('Sportsbook snapshot must cover 32 paired primary quotes');
if (kalshi.audit.teams_with_all_17_tails !== 32) throw new Error('Kalshi snapshot must cover all 17 tails for 32 teams');

const audit = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  inputs: {
    sportsbook_snapshot: basename(resolve(sportsbookPath)),
    kalshi_snapshot: basename(resolve(kalshiPath)),
  },
  intended_use: 'Preseason futures research and the first weeks of the 2026 NFL regular season',
  decision_grain: 'team × evidence source × as-of snapshot × market contract; a future private decision layer must add wager × price × time',
  readiness_verdict: {
    auditable_research_source_of_truth: true,
    calibrated_forecast_source_of_truth: false,
    execution_and_portfolio_source_of_truth: false,
    summary: 'The corpus, eligibility contracts and market math are auditable. Fair probabilities, time-aware updating, private decision records and outcome calibration are not yet implemented.',
  },
  quality_profile: {
    editorial_sources: sourceIds.length,
    unique_editorial_source_ids: new Set(sourceIds).size,
    scoring_sources: scoringSources.length,
    complete_unique_1_to_32_contracts: rankings.length,
    scoring_cells_expected: rankings.length * teams.length,
    scoring_cells_represented: rankings.reduce((total, ranking) => total + ranking.order.length, 0),
    preview_sources: previews.sources.length,
    preview_unique_teams: new Set(previewTeamIds).size,
    preview_team_records: previewEvidence.length,
    preview_claim_fragments: previewClaimFragments,
    preview_ballots: ballots.length,
    complete_preview_ballots: ballots.filter(ballot => ballot.complete).length,
    partial_preview_ballots: ballots.filter(ballot => !ballot.complete).length,
    preview_team_records_with_claim_ids_and_locators: previewEvidence.filter(team => team.claims || team.locators).length,
    preview_team_records_with_people_index: previewEvidence.filter(team => team.people).length,
    market_snapshot_files_retained: marketFiles.length,
    paired_sportsbook_teams: sportsbook.audit.teams_with_paired_primary_quote,
    sportsbook_multi_threshold_teams: sportsbook.audit.teams_with_multiple_thresholds,
    kalshi_complete_team_ladders: kalshi.audit.teams_with_all_17_tails,
    kalshi_tail_contracts: kalshi.audit.current_season_markets,
    capture_mismatch_seconds: Math.abs(kalshiCaptured - sportsbookCaptured) / 1000,
    kalshi_candidates_after_current_filters: kalshi.audit.candidates_passing_filters,
    league_modeled_midpoint_wins: kalshi.aggregates.league.midpoint_estimate,
    league_midpoint_minus_272: kalshi.aggregates.league.midpoint_minus_maximum_team_wins,
  },
  layer_status: {
    evidence: {
      status: 'ready-with-documentation-debt',
      strengths: ['immutable private source snapshots', 'sanitized public provenance', 'complete scoring contracts', 'all-team qualitative preview coverage'],
      gaps: ['preview evidence is summarized rather than stored as atomic claim records', 'preview people and source locators are not normalized', 'claim-level effective dates and review dates are absent'],
    },
    forecast: {
      status: 'missing',
      current_profile: 'ordinal dependence-aware research ordering',
      calibrated_team_probabilities: false,
      outcome_trained_coefficients: false,
      uncertainty_intervals: false,
      backtest_or_holdout_validation: false,
    },
    market: {
      status: 'usable-with-guardrails',
      append_only_snapshots: true,
      paired_same_book_devigging: true,
      complete_kalshi_tails: true,
      source_quote_age_exposed: false,
      fee_adjusted_edges: false,
      slippage_model: false,
      minimum_executable_size_filter: false,
      cross_snapshot_movement_view: false,
    },
    decision: {
      status: 'missing-private-layer',
      private_thesis_ledger: false,
      target_and_limit_prices: false,
      catalysts_and_invalidation_rules: false,
      position_and_portfolio_exposure: false,
      closing_line_value_and_outcomes: false,
    },
    operations: {
      status: 'manual-but-tested',
      generated_current_snapshot_pointer: false,
      freshness_ttl_and_stale_state: false,
      weekly_preseason_to_live_update_contract: false,
      continuous_integration_workflow: false,
      offline_self_contained_public_artifact: true,
    },
  },
  highest_priority_remediations: [
    {
      priority: 0,
      action: 'Define a private decision ledger with thesis, fair-price range, target price, catalyst, invalidation, stake/risk limits and immutable decision timestamps.',
      reason: 'Without it, the report cannot answer what was believed, what price was actionable or whether a wager still fits the thesis.',
    },
    {
      priority: 0,
      action: 'Add a time-aware current-state manifest with source effective time, captured time, review due, stale-after and supersession links.',
      reason: 'Preseason injuries, depth charts and prices decay at different speeds; a data-through date alone is not enough for first-week decisions.',
    },
    {
      priority: 1,
      action: 'Separate the existing ordinal evidence profile from a calibrated forecast model with uncertainty and historical validation.',
      reason: 'Current rank percentiles and reasoned weights are transparent research priors, not fair probabilities or expected wins.',
    },
    {
      priority: 1,
      action: 'Normalize preview evidence into atomic claims with people, locators, polarity, confidence and effective dates.',
      reason: 'The specification promises auditable claim-level lineage, but current preview team summaries cannot be mechanically traced to exact source blocks.',
    },
    {
      priority: 1,
      action: 'Make the market scanner execution-aware with fees, minimum size/notional, quote age, movement persistence and best available executable price.',
      reason: 'The current pre-fee edge filter can surface one-contract or otherwise non-actionable rows and does not prove an edge survived long enough to trade.',
    },
    {
      priority: 2,
      action: 'Build a weekly update and calibration loop using closing prices, outcomes, Brier/log loss and CLV by evidence/model version.',
      reason: 'Learned weights require historical out-of-sample evidence; without feedback, the system cannot distinguish useful priors from persuasive narratives.',
    },
    {
      priority: 2,
      action: 'Generate UI metadata, audits and market imports from one canonical registry and add CI gates.',
      reason: 'Weights, counts, edition labels and current snapshot paths are duplicated across code and documentation and can drift during manual refreshes.',
    },
  ],
};

const resolvedOutput = resolve(outputPath);
try {
  await access(resolvedOutput);
  throw new Error(`Refusing to overwrite existing readiness audit: ${resolvedOutput}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await writeFile(resolvedOutput, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ output: resolvedOutput, readiness_verdict: audit.readiness_verdict, quality_profile: audit.quality_profile }, null, 2));
