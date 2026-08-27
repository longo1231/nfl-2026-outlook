import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import {
  validateKalshiExecutionSnapshot,
  validateKalshiFeeSchedule,
  validateMarketPolicy,
} from '../lib/system-contracts.mjs';
import { evidenceFreshnessSummary, validateEvidenceLedger, validateEvidenceViews } from '../lib/evidence-ledger.mjs';
import { validateLearningPolicy } from '../lib/learning-loop.mjs';
import { buildWeeklyIndex, validateWeeklyStateVersion } from '../lib/weekly-state.mjs';

const [kalshiPath, outputPath, forecastPath] = process.argv.slice(2);
if (!kalshiPath || !outputPath) {
  throw new Error('Usage: node scripts/audit-decision-system.mjs KALSHI_EXECUTION_JSON OUTPUT_JSON [FORECAST_JSON]');
}

const readJson = async path => JSON.parse(await readFile(resolve(path), 'utf8'));
const [manifest, previews, teams, kalshi, marketPolicy, feeSchedule, freshnessPolicy, learningPolicy, learningReport, weeklyIndex, workflowSummary, evidenceLedger, evidenceViews, evidenceAudit] = await Promise.all([
  readJson('data/sources/manifest.json'),
  readJson('data/previews/2026-team-previews.json'),
  readJson('data/nfl/teams.json'),
  readJson(kalshiPath),
  readJson('config/market-policy.json'),
  readJson('config/kalshi-fee-schedule.json'),
  readJson('config/freshness-policy.json'),
  readJson('config/learning-policy.json'),
  readJson('data/current/learning-report.json'),
  readJson('data/current/weekly-index.json'),
  readJson('data/current/workflow-summary.json'),
  readJson('data/evidence/2026-evidence-ledger.json'),
  readJson('data/evidence/2026-generated-summaries.json'),
  readJson('data/evidence/2026-evidence-audit.json'),
]);
validateMarketPolicy(marketPolicy);
validateKalshiFeeSchedule(feeSchedule);
validateKalshiExecutionSnapshot(kalshi, { policy: marketPolicy, feeSchedule });
validateLearningPolicy(learningPolicy);
validateEvidenceLedger(evidenceLedger, { freshnessPolicy });
validateEvidenceViews(evidenceViews, evidenceLedger);
if (!evidenceAudit.visible_summary_parity || evidenceAudit.ledger_id !== evidenceLedger.ledger_id) throw new Error('Evidence migration audit does not match the canonical ledger');
if (learningReport.policy_id !== learningPolicy.policy_id || workflowSummary.learning.report_id !== learningReport.report_id) throw new Error('Phase 6 learning state is inconsistent');
const weeklyVersions = await Promise.all(weeklyIndex.versions.map(entry => readJson(entry.path)));
weeklyVersions.forEach(validateWeeklyStateVersion);
if (JSON.stringify(buildWeeklyIndex(weeklyVersions)) !== JSON.stringify(weeklyIndex)) throw new Error('Phase 6 weekly index does not reproduce');
const forecast = forecastPath ? await readJson(forecastPath) : null;
const forecastValidation = forecast ? await readJson(forecast.validation_report_path) : null;
const auditGeneratedAt = new Date().toISOString();
const currentEvidenceFreshness = evidenceFreshnessSummary(evidenceLedger, { asOf: auditGeneratedAt });

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
const previewEvidence = Object.values(evidenceViews.previews).flat();
const ballots = previews.sources.flatMap(source => source.ballots);
const previewClaimFragments = previewEvidence.reduce((total, team) => total + team.positives.length + team.concerns.length + team.context.length, 0);
const scoringSources = manifest.documents.filter(source => source.scoring_eligible);
const analysisWeight = scoringSources.reduce((total, source) => total + source.analysis_weight, 0);
const marketFiles = (await readdir(resolve('data/markets'))).filter(file => file.endsWith('.json'));

if (sourceIds.length !== new Set(sourceIds).size) throw new Error('Editorial source identifiers must be unique');
if (manifest.selected_count !== sourceIds.length) throw new Error('Manifest selected_count does not match documents');
if (previews.sources.length !== manifest.preview_source_count) throw new Error('Preview registry and source manifest counts disagree');
if (teams.length !== 32 || new Set(teams.map(team => team.abbr)).size !== 32) throw new Error('Team registry must contain 32 unique teams');
if (new Set(previewTeamIds).size !== 32) throw new Error('Preview evidence must cover all 32 teams in the current edition');
if (previewEvidence.length !== 32 || new Set(previewEvidence.map(team => team.team)).size !== 32) throw new Error('Current preview registry must contain one team evidence record per NFL team');
if (rankings.some(ranking => ranking.order.length !== 32 || new Set(ranking.order).size !== 32)) throw new Error('Every scoring ranking must contain 32 unique teams');
if (analysisWeight !== 100) throw new Error(`Scoring-source analysis weights must sum to 100; found ${analysisWeight}`);
if (kalshi.audit.teams_with_all_17_tails !== 32 || kalshi.audit.current_season_contracts !== 544) throw new Error('Kalshi execution snapshot must cover 32 complete 17-tail ladders');

const phase06ContractPaths = [
  'data/current/public-manifest.json',
  'schemas/public-current-manifest.schema.json',
  'schemas/private-decision-event.schema.json',
  'site/decision/app.tsx',
  'scripts/decision-ledger.mjs',
  'FORECAST_DESIGN.md',
  'schemas/forecast-version.schema.json',
  'lib/forecast-model.mjs',
  'scripts/build-forecast.mjs',
  'KALSHI_EXECUTION_DESIGN.md',
  'config/kalshi-fee-schedule.json',
  'schemas/kalshi-execution-snapshot.schema.json',
  'lib/kalshi-execution.mjs',
  'scripts/capture-kalshi-execution.mjs',
  'data/evidence/2026-evidence-ledger.json',
  'data/evidence/2026-generated-summaries.json',
  'data/evidence/2026-evidence-audit.json',
  'lib/evidence-ledger.mjs',
  'scripts/build-evidence-views.mjs',
  'PHASE6_DESIGN.md',
  'config/learning-policy.json',
  'schemas/weekly-state-version.schema.json',
  'schemas/learning-observation.schema.json',
  'schemas/learning-report.schema.json',
  'lib/weekly-state.mjs',
  'lib/learning-loop.mjs',
  'scripts/freeze-weekly-state.mjs',
  'scripts/build-learning-report.mjs',
  'scripts/record-learning-observation.mjs',
  'data/current/weekly-index.json',
  'data/current/learning-report.json',
  'data/current/workflow-summary.json',
  'site/app/workflow.css',
  'site/decision/learning.css',
];
await Promise.all(phase06ContractPaths.map(path => access(resolve(path))));

const audit = {
  schema_version: 4,
  generated_at: auditGeneratedAt,
  inputs: {
    kalshi_execution_snapshot: basename(resolve(kalshiPath)),
    kalshi_snapshot_id: kalshi.snapshot_id,
    market_policy: marketPolicy.policy_id,
    fee_schedule: feeSchedule.fee_schedule_id,
    forecast_version: forecast?.forecast_version_id ?? null,
  },
  intended_use: 'Kalshi-only preseason futures research and execution diagnostics for the 2026 NFL regular season',
  decision_grain: 'team × Kalshi contract × side × requested size × captured order book; the private ledger adds thesis × decision × order/fill record',
  readiness_verdict: {
    auditable_research_source_of_truth: true,
    calibrated_forecast_source_of_truth: forecast?.model_state === 'validated',
    provisional_forecast_lab_ready: forecast?.model_state === 'provisional',
    kalshi_execution_pricing_source_of_truth: true,
    model_driven_action_source_of_truth: kalshi.action_candidate_ids.length > 0,
    private_decision_contract_ready: true,
    generated_current_state_ready: true,
    immutable_weekly_state_ready: weeklyIndex.version_count > 0,
    learning_loop_contract_ready: true,
    summary: 'The atomic evidence ledger, generated summaries, provisional schedule simulation, complete Kalshi execution, workflow UI, immutable weekly state and public/private learning contracts are auditable. No source-backed 2026 settlement observations exist yet, and the forecast remains provisional, so no model-driven action is eligible.',
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
    preview_team_records_with_claim_ids_and_locators: evidenceAudit.coverage.preview_team_blocks,
    preview_team_records_with_people_index: evidenceLedger.source_blocks.filter(block => block.view_contract?.kind === 'preview-evidence' && block.entity_ids.length > 0).length,
    atomic_source_blocks: evidenceLedger.source_blocks.length,
    atomic_claims: evidenceLedger.claims.length,
    normalized_people_entities: evidenceLedger.entities.length,
    claims_with_lineage: evidenceAudit.coverage.claims_with_lineage,
    claims_with_time_state: evidenceAudit.coverage.claims_with_time_state,
    time_sensitive_claims: currentEvidenceFreshness.time_sensitive_claims,
    stale_claims_requiring_current_use_review: currentEvidenceFreshness.status_counts.stale,
    generated_visible_summary_parity: evidenceAudit.visible_summary_parity,
    orphan_summary_records: evidenceAudit.orphan_review.orphan_summary_records,
    market_snapshot_files_retained: marketFiles.length,
    kalshi_complete_team_ladders: kalshi.audit.teams_with_all_17_tails,
    kalshi_tail_contracts: kalshi.audit.current_season_contracts,
    kalshi_full_orderbooks: kalshi.audit.full_orderbooks,
    normalized_kalshi_quotes: kalshi.audit.normalized_quotes,
    execution_scenarios: kalshi.audit.execution_scenarios,
    full_100_contract_quotes: kalshi.audit.full_primary_size_quotes,
    quotes_with_movement_history: kalshi.audit.quotes_with_movement_history,
    research_qualified_diagnostics: kalshi.audit.research_qualified_diagnostics,
    persistent_research_diagnostics: kalshi.audit.persistent_research_diagnostics,
    action_eligible_candidates: kalshi.audit.action_eligible_candidates,
    league_modeled_midpoint_wins: kalshi.aggregates.league.midpoint_estimate,
    league_midpoint_minus_272: kalshi.aggregates.league.midpoint_minus_maximum_team_wins,
    phase_0_to_6_contract_files_verified: phase06ContractPaths.length,
    frozen_weekly_states: weeklyIndex.version_count,
    active_weekly_state_version: weeklyIndex.latest_version_id,
    public_learning_observations: learningReport.observation_count,
    learning_report_status: learningReport.status,
    forecast_teams: forecast?.teams.length ?? 0,
    forecast_draws: forecast?.draws ?? 0,
    forecast_holdout_brier: forecastValidation?.holdout.aggregate_metrics.model.brier_score ?? null,
    forecast_holdout_interval_coverage: forecastValidation?.holdout.interval_80_coverage ?? null,
  },
  layer_status: {
    evidence: {
      status: 'atomic-ledger-ready',
      strengths: ['immutable private source snapshots', 'sanitized public provenance', 'complete scoring contracts', 'uniform atomic claims for every visible category and preview summary', 'normalized people and public-safe locators', 'claim-level freshness and ambiguity state', 'generated-view parity with the Edition 7 baseline'],
      gaps: ['stale time-sensitive preseason claims require review before current use', 'weekly supersession workflow remains to be operated'],
    },
    forecast: {
      status: forecast?.model_state ?? 'missing',
      current_profile: 'ordinal dependence-aware research ordering',
      independent_probability_distributions: Boolean(forecast),
      outcome_trained_coefficients: Boolean(forecast),
      uncertainty_intervals: Boolean(forecast),
      backtest_or_holdout_validation: Boolean(forecastValidation),
      quantitative_promotion_gates_pass: forecastValidation?.quantitative_pass ?? false,
      current_adjustment_coverage_complete: forecastValidation?.gates.current_adjustments.pass ?? false,
      decision_eligible: forecast?.decision_eligible ?? false,
    },
    market: {
      status: 'kalshi-execution-aware',
      venue_scope: ['kalshi'],
      sportsbook_forward_pipeline_enabled: false,
      append_only_snapshots: true,
      complete_kalshi_tails: true,
      full_orderbook_depth: true,
      source_quote_age_exposed: false,
      capture_time_freshness: true,
      versioned_fee_estimates: true,
      depth_aware_execution: true,
      full_requested_size_gate: true,
      cross_snapshot_movement_view: true,
      persistence_gate: true,
      model_action_eligible: kalshi.action_candidate_ids.length > 0,
    },
    decision: {
      status: 'local-learning-loop-ready',
      private_thesis_ledger: true,
      append_only_hash_chain: true,
      target_and_limit_prices: true,
      catalysts_and_invalidation_rules: true,
      position_and_portfolio_exposure: true,
      pass_decisions_preserved: true,
      closing_line_value_and_outcomes: 'event-contract-ready-no-account-feed',
      same_side_closing_price_events: true,
      private_clv_materialization: true,
      outcome_and_postmortem_queue: true,
      account_or_order_integration: false,
      canonical_private_records_read_by_public_audit: false,
    },
    operations: {
      status: 'weekly-workflow-and-learning-ready',
      generated_current_snapshot_pointer: true,
      snapshot_freshness_ttl_and_stale_state: true,
      claim_level_freshness_complete: true,
      weekly_preseason_to_live_update_contract: true,
      immutable_weekly_state_versions: weeklyIndex.version_count > 0,
      workflow_first_public_navigation: true,
      public_learning_report: learningReport.status,
      continuous_integration_workflow: false,
      offline_self_contained_public_artifact: true,
    },
  },
  highest_priority_remediations: [
    {
      priority: 1,
      action: 'Calibrate the provisional schedule model and add sourced quarterback and material availability adjustments for all 32 teams.',
      reason: 'Execution pricing is now realistic, but the independent fair probabilities remain provisional and cannot authorize a wager.',
    },
    {
      priority: 2,
      action: 'Record source-backed closing prices and outcomes as the 2026 contracts settle.',
      reason: 'The append-only contracts and metrics are implemented, but a truthful learning report must remain empty until real observations exist.',
    },
    {
      priority: 2,
      action: 'Finish canonical registry generation and add continuous integration gates.',
      reason: 'Current files are selected through one generated manifest, but weights, edition labels and some source metadata still exist in parallel code and data structures.',
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
await writeFile(resolvedOutput, `${JSON.stringify(audit, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ output: resolvedOutput, readiness_verdict: audit.readiness_verdict, quality_profile: audit.quality_profile }, null, 2));
