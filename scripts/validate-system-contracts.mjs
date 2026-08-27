import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { materializeDecisionLedger } from '../lib/decision-ledger.mjs';
import { validateEvidenceLedger, validateEvidenceViews } from '../lib/evidence-ledger.mjs';
import { validateLearningPolicy } from '../lib/learning-loop.mjs';
import { buildWeeklyIndex, validateWeeklyStateVersion } from '../lib/weekly-state.mjs';
import {
  prepareDecisionEvent,
  validateDecisionEventChain,
  validateForecastVersion,
  validateForecastPolicy,
  validateFreshnessPolicy,
  validateKalshiExecutionSnapshot,
  validateKalshiFeeSchedule,
  validateMarketPolicy,
  validatePublicManifest,
} from '../lib/system-contracts.mjs';

const readJson = async path => JSON.parse(await readFile(resolve(path), 'utf8'));
const sha256 = async path => createHash('sha256').update(await readFile(resolve(path))).digest('hex');
const [manifest, freshness, forecast, market, feeSchedule, learningPolicy, learningReport, weeklyIndex, inputs, evidenceLedger, evidenceViews, evidenceAudit] = await Promise.all([
  readJson('data/current/public-manifest.json'),
  readJson('config/freshness-policy.json'),
  readJson('config/forecast-policy.json'),
  readJson('config/market-policy.json'),
  readJson('config/kalshi-fee-schedule.json'),
  readJson('config/learning-policy.json'),
  readJson('data/current/learning-report.json'),
  readJson('data/current/weekly-index.json'),
  readJson('tests/fixtures/decision-event-inputs.json'),
  readJson('data/evidence/2026-evidence-ledger.json'),
  readJson('data/evidence/2026-generated-summaries.json'),
  readJson('data/evidence/2026-evidence-audit.json'),
]);
const schemaFiles = (await readdir(resolve('schemas'))).filter(file => file.endsWith('.schema.json'));
const schemas = await Promise.all(schemaFiles.map(file => readJson(`schemas/${file}`)));
if (schemas.some(schema => schema.$schema !== 'https://json-schema.org/draft/2020-12/schema' || typeof schema.$id !== 'string')) {
  throw new Error('Every public schema must declare JSON Schema 2020-12 and a stable $id');
}
validatePublicManifest(manifest);
validateFreshnessPolicy(freshness);
validateForecastPolicy(forecast);
validateMarketPolicy(market);
validateKalshiFeeSchedule(feeSchedule);
validateLearningPolicy(learningPolicy);
validateEvidenceLedger(evidenceLedger, { freshnessPolicy: freshness });
validateEvidenceViews(evidenceViews, evidenceLedger);
if (evidenceAudit.ledger_id !== evidenceLedger.ledger_id || !evidenceAudit.visible_summary_parity) throw new Error('Atomic evidence audit does not match the ledger');
if (manifest.evidence.snapshot_id !== evidenceLedger.ledger_id || !manifest.evidence.claim_level_freshness_complete) throw new Error('Public manifest does not select the complete atomic evidence ledger');
if (market.fee_schedule_id !== feeSchedule.fee_schedule_id) throw new Error('Active market policy does not match the Kalshi fee schedule');
if (manifest.policy_versions.learning !== learningPolicy.policy_id || learningReport.policy_id !== learningPolicy.policy_id) throw new Error('Active learning policy does not match public state');
const weeklyVersions = await Promise.all(weeklyIndex.versions.map(entry => readJson(entry.path)));
weeklyVersions.forEach(validateWeeklyStateVersion);
if (JSON.stringify(buildWeeklyIndex(weeklyVersions)) !== JSON.stringify(weeklyIndex)) throw new Error('Weekly state index does not reproduce from immutable versions');
for (const version of weeklyVersions) {
  for (const reference of [version.public_manifest, version.evidence, version.forecast, version.market, version.readiness, ...version.policies]) {
    if (await sha256(reference.path) !== reference.sha256) throw new Error(`Weekly state ${version.weekly_state_version_id} reference hash changed: ${reference.path}`);
  }
}
const activeKalshiExecution = await readJson(manifest.markets.kalshi.path);
validateKalshiExecutionSnapshot(activeKalshiExecution, { policy: market, feeSchedule });
if (activeKalshiExecution.snapshot_id !== manifest.markets.kalshi.snapshot_id) throw new Error('Active Kalshi snapshot does not match the public manifest');
if (activeKalshiExecution.fee_schedule_id !== manifest.markets.kalshi.fee_schedule_id) throw new Error('Active Kalshi fee schedule does not match the public manifest');
if (!existsSync(resolve(manifest.markets.kalshi.summary_path))) throw new Error('Public manifest Kalshi summary path is missing');
if (manifest.forecast.path) {
  const activeForecast = await readJson(manifest.forecast.path);
  validateForecastVersion(activeForecast);
  if (activeForecast.forecast_version_id !== manifest.forecast.version_id) throw new Error('Active forecast does not match the public manifest');
  if (activeForecast.model_state !== forecast.active_model_state) throw new Error('Active forecast state does not match forecast policy');
}

const events = [];
for (const input of inputs) events.push(prepareDecisionEvent(input, { previousEventHash: events.at(-1)?.event_hash ?? null }));
const chain = validateDecisionEventChain(events);
const materialized = materializeDecisionLedger(events);

const prospectivePublicFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
const trackedPrivate = prospectivePublicFiles.filter(path => path.startsWith('.private/'));
if (trackedPrivate.length > 0) throw new Error(`Private paths are visible to Git: ${trackedPrivate.join(', ')}`);

const ignoredProbe = '.private/decision-system/events.jsonl';
try {
  execFileSync('git', ['check-ignore', '--quiet', ignoredProbe]);
} catch {
  throw new Error(`${ignoredProbe} is not protected by .gitignore`);
}

const publicSourceRoots = ['site/app', 'site/standalone'];
const publicSources = [];
for (const root of publicSourceRoots) {
  for (const file of await readdir(resolve(root))) {
    const path = `${root}/${file}`;
    if (existsSync(path) && /\.(?:ts|tsx|js|jsx|mjs)$/.test(file)) publicSources.push(path);
  }
}
const privateImportLeaks = [];
for (const path of publicSources) {
  const source = await readFile(resolve(path), 'utf8');
  if (/from\s+['"][^'"]*\.private|import\s*\([^)]*\.private|private-manifest\.json/.test(source)) privateImportLeaks.push(path);
}
if (privateImportLeaks.length > 0) throw new Error(`Public UI source imports private state: ${privateImportLeaks.join(', ')}`);

console.log(JSON.stringify({
  public_manifest: 'valid',
  json_schemas: schemas.length,
  policies: 5,
  active_forecast: manifest.forecast.version_id,
  active_kalshi_snapshot: activeKalshiExecution.snapshot_id,
  atomic_evidence_ledger: evidenceLedger.ledger_id,
  atomic_claims: evidenceLedger.claims.length,
  kalshi_orderbooks: activeKalshiExecution.orderbooks.length,
  redacted_decision_events: chain.event_count,
  redacted_theses_materialized: materialized.summary.thesis_count,
  frozen_weekly_states: weeklyIndex.version_count,
  learning_observations: learningReport.observation_count,
  private_gitignore_probe: 'protected',
  public_private_import_leaks: privateImportLeaks.length,
}, null, 2));
