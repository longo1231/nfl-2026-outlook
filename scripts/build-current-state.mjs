import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import {
  validateFreshnessPolicy,
  validateForecastPolicy,
  validateForecastVersion,
  validateKalshiExecutionSnapshot,
  validateKalshiFeeSchedule,
  validateMarketPolicy,
  validatePublicManifest,
} from '../lib/system-contracts.mjs';
import { evidenceFreshnessSummary, validateEvidenceLedger } from '../lib/evidence-ledger.mjs';
import { validateLearningPolicy } from '../lib/learning-loop.mjs';
import { buildWeeklyIndex } from '../lib/weekly-state.mjs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const fromRoot = path => resolve(projectRoot, path);
const readJson = async path => JSON.parse(await readFile(fromRoot(path), 'utf8'));
const sha256 = async path => createHash('sha256').update(await readFile(fromRoot(path))).digest('hex');
const compactTimestamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace('.000', '');
const toImportPath = path => `../../${path}`;

const [freshnessPolicy, forecastPolicy, marketPolicy, feeSchedule, learningPolicy, learningReport, sourceRegistry, sourceManifest, evidenceLedger, evidenceAudit] = await Promise.all([
  readJson('config/freshness-policy.json'),
  readJson('config/forecast-policy.json'),
  readJson('config/market-policy.json'),
  readJson('config/kalshi-fee-schedule.json'),
  readJson('config/learning-policy.json'),
  readJson('data/current/learning-report.json'),
  readJson('config/source-registry.json'),
  readJson('data/sources/manifest.json'),
  readJson('data/evidence/2026-evidence-ledger.json'),
  readJson('data/evidence/2026-evidence-audit.json'),
]);
validateFreshnessPolicy(freshnessPolicy);
validateForecastPolicy(forecastPolicy);
validateMarketPolicy(marketPolicy);
validateKalshiFeeSchedule(feeSchedule);
validateLearningPolicy(learningPolicy);
validateEvidenceLedger(evidenceLedger, { freshnessPolicy });
if (evidenceAudit.ledger_id !== evidenceLedger.ledger_id || !evidenceAudit.visible_summary_parity) throw new Error('Evidence audit does not match the active atomic ledger');
if (learningReport.policy_id !== learningPolicy.policy_id) throw new Error('Learning report does not match the active learning policy');

const weeklyFiles = (await readdir(fromRoot('data/weekly'))).filter(file => /^weekly-.*\.json$/.test(file)).sort();
const weeklyVersions = await Promise.all(weeklyFiles.map(file => readJson(`data/weekly/${file}`)));
const weeklyIndex = buildWeeklyIndex(weeklyVersions);
await writeFile(fromRoot('data/current/weekly-index.json'), `${JSON.stringify(weeklyIndex, null, 2)}\n`);

const marketFiles = (await readdir(fromRoot('data/markets'))).filter(file => file.endsWith('-kalshi-nfl-execution.json'));
const executionSnapshots = await Promise.all(marketFiles.map(async file => {
  const entry = { file, path: `data/markets/${file}`, data: await readJson(`data/markets/${file}`) };
  validateKalshiExecutionSnapshot(entry.data, { policy: marketPolicy, feeSchedule });
  return entry;
}));
const kalshi = executionSnapshots
  .filter(snapshot => snapshot.data.season === 2026)
  .toSorted((left, right) => new Date(right.data.captured_at) - new Date(left.data.captured_at))[0];
if (!kalshi) throw new Error('Current-state generation requires one Phase 4 Kalshi execution snapshot');

const auditFiles = (await readdir(fromRoot('data/audit'))).filter(file => file.endsWith('-decision-system-readiness.json'));
const audits = await Promise.all(auditFiles.map(async file => ({ file, path: `data/audit/${file}`, data: await readJson(`data/audit/${file}`) })));
const readiness = audits
  .filter(entry => entry.data.inputs?.kalshi_execution_snapshot === kalshi.file)
  .toSorted((left, right) => new Date(right.data.generated_at) - new Date(left.data.generated_at))[0];
if (!readiness) throw new Error('No readiness audit matches the selected Kalshi execution snapshot');

let forecast = null;
try {
  const forecastFiles = (await readdir(fromRoot('data/forecasts'))).filter(file => file.endsWith('.json'));
  const forecasts = await Promise.all(forecastFiles.map(async file => {
    const entry = { file, path: `data/forecasts/${file}`, data: await readJson(`data/forecasts/${file}`) };
    validateForecastVersion(entry.data);
    return entry;
  }));
  forecast = forecasts
    .filter(entry => entry.data.season === 2026 && entry.data.model_state === forecastPolicy.active_model_state)
    .toSorted((left, right) => new Date(right.data.as_of) - new Date(left.data.as_of))[0] ?? null;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const forecastValidation = forecast ? await readJson(forecast.data.validation_report_path) : null;
if (forecast && forecastValidation.validation_report_id !== forecast.data.validation_report_id) throw new Error('Forecast validation report ID does not match the active forecast');
if (forecast && kalshi.data.forecast_version_id !== forecast.data.forecast_version_id) throw new Error('Kalshi execution snapshot does not reference the active forecast');

const executionSummary = {
  schema_version: kalshi.data.schema_version,
  snapshot_id: kalshi.data.snapshot_id,
  season: kalshi.data.season,
  captured_at_started: kalshi.data.captured_at_started,
  captured_at: kalshi.data.captured_at,
  stale_after: kalshi.data.stale_after,
  source: kalshi.data.source,
  policy_version: kalshi.data.policy_version,
  fee_schedule_id: kalshi.data.fee_schedule_id,
  forecast_version_id: kalshi.data.forecast_version_id,
  forecast_state: kalshi.data.forecast_state,
  primary_reference_contract_count: kalshi.data.primary_reference_contract_count,
  methodology: kalshi.data.methodology,
  audit: kalshi.data.audit,
  aggregates: kalshi.data.aggregates,
  teams: kalshi.data.teams,
  contracts: kalshi.data.contracts,
  quotes: kalshi.data.quotes.map(quote => ({
    quote_id: quote.quote_id,
    contract_id: quote.contract_id,
    team_id: quote.team_id,
    threshold: quote.threshold,
    side: quote.side,
    bid: quote.bid,
    ask: quote.ask,
    bid_size: quote.bid_size,
    ask_size: quote.ask_size,
    spread: quote.spread,
    captured_at: quote.captured_at,
    stale_after: quote.stale_after,
    fee_schedule_id: quote.fee_schedule_id,
    movement: quote.movement,
    execution_scenarios: quote.execution_scenarios.map(({ fills: _fills, ...scenario }) => scenario),
  })),
  diagnostics: kalshi.data.diagnostics.map(diagnostic => {
    const { fills: _fills, ...execution } = diagnostic.execution;
    return {
      comparison_id: diagnostic.comparison_id,
      quote_id: diagnostic.quote_id,
      team_id: diagnostic.team_id,
      contract_id: diagnostic.contract_id,
      side: diagnostic.side,
      wins_at_least: diagnostic.wins_at_least,
      requested_contracts: diagnostic.requested_contracts,
      model_fair_probability: diagnostic.model_fair_probability,
      executable_price: diagnostic.executable_price,
      conservative_break_even_probability: diagnostic.conservative_break_even_probability,
      gross_edge: diagnostic.gross_edge,
      net_edge: diagnostic.net_edge,
      spread: diagnostic.spread,
      execution,
      research_gates: diagnostic.research_gates,
      research_qualified: diagnostic.research_qualified,
      persistence: diagnostic.persistence,
      action_gates: diagnostic.action_gates,
      failed_gates: diagnostic.failed_gates,
      action_eligible: diagnostic.action_eligible,
    };
  }),
  research_diagnostic_ids: kalshi.data.research_diagnostic_ids,
  persistent_diagnostic_ids: kalshi.data.persistent_diagnostic_ids,
  action_candidate_ids: kalshi.data.action_candidate_ids,
  warnings: kalshi.data.warnings,
};
const summaryPath = 'data/current/kalshi-execution-summary.json';
await mkdir(dirname(fromRoot(summaryPath)), { recursive: true });
await writeFile(fromRoot(summaryPath), `${JSON.stringify(executionSummary, null, 2)}\n`);

const evidenceCapturedAt = new Date(sourceManifest.source_capture_completed_at).toISOString();
const generatedAt = new Date(Math.max(
  new Date(readiness.data.generated_at),
  new Date(kalshi.data.captured_at),
  new Date(evidenceLedger.recorded_at),
  forecast ? new Date(forecast.data.generated_at) : 0,
)).toISOString();
const currentEvidenceFreshness = evidenceFreshnessSummary(evidenceLedger, { asOf: generatedAt });
const manifest = {
  schema_version: 1,
  manifest_id: `public-2026-${compactTimestamp(generatedAt)}`,
  season: 2026,
  generated_at: generatedAt,
  policy_versions: {
    freshness: freshnessPolicy.policy_id,
    forecast: forecastPolicy.policy_id,
    market: marketPolicy.policy_id,
    sources: sourceRegistry.registry_id,
    learning: learningPolicy.policy_id,
  },
  evidence: {
    snapshot_id: evidenceLedger.ledger_id,
    path: 'data/evidence/2026-evidence-ledger.json',
    generated_view_path: 'data/evidence/2026-generated-summaries.json',
    audit_path: 'data/evidence/2026-evidence-audit.json',
    sha256: await sha256('data/evidence/2026-evidence-ledger.json'),
    generated_view_sha256: await sha256('data/evidence/2026-generated-summaries.json'),
    captured_at: evidenceCapturedAt,
    status: currentEvidenceFreshness.status_counts.stale > 0 ? 'review_due' : 'active',
    claim_level_freshness_complete: true,
    claim_count: currentEvidenceFreshness.claim_count,
    source_block_count: currentEvidenceFreshness.source_block_count,
    entity_count: currentEvidenceFreshness.entity_count,
    stale_claim_count: currentEvidenceFreshness.status_counts.stale,
    ambiguous_claim_count: currentEvidenceFreshness.status_counts.ambiguous,
    visible_summary_parity: evidenceAudit.visible_summary_parity,
    review_due_at: currentEvidenceFreshness.status_counts.stale > 0 ? generatedAt : null,
    stale_after: null,
    note: `${currentEvidenceFreshness.claim_count} atomic claims have source-block lineage and time state. ${currentEvidenceFreshness.status_counts.stale} time-sensitive preseason claims require a current-use review; their historical source meaning remains preserved.`,
  },
  forecast: forecast ? {
    version_id: forecast.data.forecast_version_id,
    path: forecast.path,
    status: forecast.data.model_state,
    as_of: forecast.data.as_of,
    stale_after: forecast.data.stale_after ?? null,
    decision_eligible: forecast.data.decision_eligible,
    validation_report_id: forecast.data.validation_report_id,
    validation_report_path: forecast.data.validation_report_path,
  } : {
    version_id: null,
    path: null,
    status: 'missing',
    as_of: null,
    stale_after: null,
    decision_eligible: false,
    validation_report_id: null,
    validation_report_path: null,
  },
  markets: {
    kalshi: {
      snapshot_id: kalshi.data.snapshot_id,
      path: kalshi.path,
      summary_path: summaryPath,
      sha256: await sha256(kalshi.path),
      summary_sha256: await sha256(summaryPath),
      captured_at: kalshi.data.captured_at,
      stale_after: kalshi.data.stale_after,
      source_time_confidence: 'capture-time-only',
      fee_schedule_id: kalshi.data.fee_schedule_id,
      full_orderbook: true,
      reference_contract_count: kalshi.data.primary_reference_contract_count,
      research_qualified_diagnostics: kalshi.data.audit.research_qualified_diagnostics,
      persistent_research_diagnostics: kalshi.data.audit.persistent_research_diagnostics,
      action_eligible_candidates: kalshi.data.audit.action_eligible_candidates,
      action_eligible: kalshi.data.audit.action_eligible_candidates > 0,
    },
  },
  readiness: {
    audit_id: `readiness-${compactTimestamp(readiness.data.generated_at)}`,
    path: readiness.path,
    status: 'degraded',
  },
  warnings: [
    ...(forecast ? [
      `The active ${forecast.data.model_state} forecast is a lab output and is not decision eligible.`,
      ...forecast.data.warnings,
    ] : ['No independent probabilistic forecast is active.']),
    `${currentEvidenceFreshness.status_counts.stale} time-sensitive evidence claims are stale for current use and should be reviewed before relying on roster or availability details.`,
    'Kalshi execution pricing is size- and fee-aware, but capture-time quotes expire after five minutes for action review.',
    'No model-market row is action eligible while the independent forecast remains provisional.',
    'Sportsbook snapshots are frozen historical Edition 7 evidence and are outside the active market pipeline.',
  ],
};
const manifestFingerprint = createHash('sha256').update(JSON.stringify({ ...manifest, manifest_id: null })).digest('hex');
manifest.manifest_id = `public-${manifest.season}-${compactTimestamp(generatedAt)}-${manifestFingerprint.slice(0, 12)}`;
validatePublicManifest(manifest);

const topEvidenceReviews = Object.entries(currentEvidenceFreshness.teams)
  .map(([team_id, state]) => ({ team_id, ...state }))
  .filter(team => team.stale > 0 || team.review_due > 0)
  .toSorted((left, right) => right.stale - left.stale || right.review_due - left.review_due || left.team_id.localeCompare(right.team_id));
const marketMovers = kalshi.data.quotes
  .filter(quote => quote.movement?.ask_change !== null)
  .map(quote => ({
    quote_id: quote.quote_id,
    team_id: quote.team_id,
    threshold: quote.threshold,
    side: quote.side,
    ask: quote.ask,
    ask_change: quote.movement.ask_change,
    spread: quote.spread,
  }))
  .toSorted((left, right) => Math.abs(right.ask_change) - Math.abs(left.ask_change) || left.quote_id.localeCompare(right.quote_id))
  .slice(0, 12);
const workflowSummary = {
  schema_version: 1,
  generated_at: generatedAt,
  public_manifest_id: manifest.manifest_id,
  today: {
    evidence_review_claims: currentEvidenceFreshness.status_counts.stale + currentEvidenceFreshness.status_counts.review_due,
    evidence_review_teams: topEvidenceReviews.length,
    top_evidence_reviews: topEvidenceReviews,
    forecast_state: manifest.forecast.status,
    forecast_decision_eligible: manifest.forecast.decision_eligible,
    forecast_calibration_pass: forecastValidation?.gates.quantitative.calibration.pass ?? false,
    forecast_current_adjustments: forecastValidation?.gates.current_adjustments ?? null,
    market_captured_at: manifest.markets.kalshi.captured_at,
    market_stale_after: manifest.markets.kalshi.stale_after,
    market_movement_rows: kalshi.data.quotes.filter(quote => quote.movement?.prior_quote_id).length,
    top_market_movers: marketMovers,
    private_review_queue: 'local-only-not-loaded',
    warnings: manifest.warnings,
  },
  opportunities: {
    status: manifest.forecast.decision_eligible && manifest.markets.kalshi.action_eligible ? 'ready' : 'disabled',
    action_eligible_candidates: manifest.markets.kalshi.action_eligible_candidates,
    research_diagnostics: manifest.markets.kalshi.research_qualified_diagnostics,
    persistent_research_diagnostics: manifest.markets.kalshi.persistent_research_diagnostics,
    disabled_reasons: [
      ...(manifest.forecast.decision_eligible ? [] : ['The independent forecast is provisional and cannot authorize a wager.']),
      ...(manifest.markets.kalshi.action_eligible ? [] : ['No model-market row passes every action gate.']),
      'The public app never reads private bankroll, exposure, order or fill state.',
    ],
  },
  weekly: weeklyIndex,
  learning: learningReport,
};

const manifestPath = fromRoot('data/current/public-manifest.json');
const workflowPath = fromRoot('data/current/workflow-summary.json');
const generatedModulePath = fromRoot('site/app/generated-current.ts');
const forecastImports = forecast
  ? `import activeForecast from '${toImportPath(forecast.path)}';\nimport forecastValidation from '${toImportPath(forecast.data.validation_report_path)}';\n`
  : 'const activeForecast = null;\nconst forecastValidation = null;\n';
const generatedModule = `// Generated by scripts/build-current-state.mjs. Do not edit by hand.\nimport publicCurrentState from '${toImportPath('data/current/public-manifest.json')}';\nimport kalshiSnapshot from '${toImportPath(summaryPath)}';\nimport readinessAudit from '${toImportPath(readiness.path)}';\nimport workflowSummary from '${toImportPath('data/current/workflow-summary.json')}';\n${forecastImports}\nexport { activeForecast, forecastValidation, kalshiSnapshot, publicCurrentState, readinessAudit, workflowSummary };\n`;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(workflowPath, `${JSON.stringify(workflowSummary, null, 2)}\n`);
await writeFile(generatedModulePath, generatedModule);
console.log(JSON.stringify({
  manifest: relative(projectRoot, manifestPath),
  execution_summary: summaryPath,
  generated_module: relative(projectRoot, generatedModulePath),
  workflow_summary: relative(projectRoot, workflowPath),
  manifest_id: manifest.manifest_id,
  readiness: manifest.readiness.status,
  forecast: manifest.forecast.status,
  market: 'kalshi-execution-aware',
}, null, 2));
