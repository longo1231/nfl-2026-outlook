import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, relative, resolve } from 'node:path';

import { materializeDecisionLedger } from '../lib/decision-ledger.mjs';
import { DECISION_EVENT_TYPES, prepareDecisionEvent, validateDecisionEventChain } from '../lib/system-contracts.mjs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const configuredRoot = process.env.NFL_DECISION_ROOT;
const decisionRoot = configuredRoot ? resolve(configuredRoot) : resolve(projectRoot, '.private/decision-system');
const eventsPath = resolve(decisionRoot, 'events.jsonl');
const materializedPath = resolve(decisionRoot, 'materialized.json');
const privacyCanaryPath = resolve(decisionRoot, 'privacy-canaries.json');
const privateManifestPath = configuredRoot
  ? resolve(decisionRoot, 'private-manifest.json')
  : resolve(projectRoot, '.private/current/private-manifest.json');
const publicManifestPath = resolve(projectRoot, 'data/current/public-manifest.json');
const command = process.argv[2];

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const displayPath = path => configuredRoot ? basename(path) : relative(projectRoot, path);

const readEvents = async ({ allowMissing = false } = {}) => {
  if (!existsSync(eventsPath)) {
    if (allowMissing) return [];
    throw new Error('Private ledger is not initialized. Run npm run decision:init first.');
  }
  const text = await readFile(eventsPath, 'utf8');
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`Private ledger contains invalid JSON on line ${index + 1}`);
    }
  });
};

const writeMaterialized = async events => {
  const [publicManifest, weeklyIndex, learningPolicy] = await Promise.all([
    readJson(publicManifestPath),
    readJson(resolve(projectRoot, 'data/current/weekly-index.json')),
    readJson(resolve(projectRoot, 'config/learning-policy.json')),
  ]);
  const state = materializeDecisionLedger(events);
  const generatedAt = events.at(-1)?.recorded_at ?? publicManifest.generated_at;
  const privateManifest = {
    schema_version: 1,
    generated_at: generatedAt,
    public_manifest: {
      manifest_id: publicManifest.manifest_id,
      path: 'data/current/public-manifest.json',
      forecast: {
        version_id: publicManifest.forecast.version_id,
        status: publicManifest.forecast.status,
        decision_eligible: publicManifest.forecast.decision_eligible,
      },
      market: {
        venue_id: 'kalshi',
        snapshot_id: publicManifest.markets.kalshi.snapshot_id,
        status: 'execution-aware',
        fee_schedule_id: publicManifest.markets.kalshi.fee_schedule_id,
        action_eligible_candidates: publicManifest.markets.kalshi.action_eligible_candidates,
      },
      weekly_state: {
        version_id: weeklyIndex.latest_version_id,
        index_path: 'data/current/weekly-index.json',
      },
      learning_policy_id: learningPolicy.policy_id,
    },
    ledger: { path: 'events.jsonl', event_count: state.ledger.event_count, head_hash: state.ledger.head_hash },
    materialized: { path: 'materialized.json', schema_version: state.schema_version },
    local_app: { output_path: 'app', contains_private_data: true, publishable: false },
  };
  await mkdir(decisionRoot, { recursive: true });
  await mkdir(dirname(privateManifestPath), { recursive: true });
  await writeFile(materializedPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await writeFile(privateManifestPath, `${JSON.stringify(privateManifest, null, 2)}\n`, { mode: 0o600 });
  return state;
};

const templatePayload = eventType => {
  if (eventType === 'thesis.created') return {
    title: '<short thesis title>',
    team_id: '<team abbreviation>',
    market: { venue_id: 'kalshi', market_type: 'regular-season-wins-tail', side: '<yes|no>', threshold: null, contract_id: '<Kalshi ticker>' },
    thesis: '<case for the wager>',
    contrary_case: '<best case against it>',
    fair_price_range: { low: 0, high: 0, basis: 'manual; no validated forecast active' },
    target_price: 0,
    limit_price: 0,
    catalyst: '<what should change or confirm the thesis>',
    invalidation: '<observable condition that kills the thesis>',
    confidence: { level: 'medium', rationale: '<why>' },
    risk_cap: { amount: 0, unit: 'unit' },
    correlation_tags: [],
    review_due_at: null,
  };
  if (eventType === 'thesis.revised') return { changes: {}, reason: '<why the thesis changed>' };
  if (eventType === 'thesis.invalidated') return { reason: '<invalidation condition that occurred>' };
  if (eventType.startsWith('decision.')) return { reason: '<decision reason>', quoted_price: null, quoted_size: null };
  if (eventType === 'order.recorded') return { price: 0, size: 0, order_status: '<status>' };
  if (eventType === 'fill.recorded') return { price: 0, size: 0 };
  if (eventType === 'position.marked') return { price: 0 };
  if (eventType === 'closing_price.recorded') return { price: 0, observed_at: new Date().toISOString(), source_quote_id: '<same-side closing quote ID>', horizon: 'decision-to-close' };
  if (eventType === 'position.closed') return { price: 0, size: 0, reason: '<close reason>' };
  if (eventType === 'outcome.recorded') return { result: '<market outcome>' };
  return { summary: '<process review>' };
};

if (command === 'init') {
  await mkdir(decisionRoot, { recursive: true, mode: 0o700 });
  if (!existsSync(eventsPath)) await writeFile(eventsPath, '', { mode: 0o600, flag: 'wx' });
  if (!existsSync(privacyCanaryPath)) {
    const canaries = {
      schema_version: 1,
      values: [`private-thesis-${randomUUID()}`, `private-fill-${randomUUID()}`, `private-note-${randomUUID()}`],
    };
    await writeFile(privacyCanaryPath, `${JSON.stringify(canaries, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  }
  const events = await readEvents();
  const state = await writeMaterialized(events);
  console.log(JSON.stringify({ initialized: true, events: state.ledger.event_count, open_positions: state.summary.open_positions }, null, 2));
} else if (command === 'validate') {
  const events = await readEvents();
  const chain = validateDecisionEventChain(events);
  const state = materializeDecisionLedger(events);
  console.log(JSON.stringify({ valid: true, events: chain.event_count, theses: state.summary.thesis_count, open_positions: state.summary.open_positions }, null, 2));
} else if (command === 'materialize') {
  const events = await readEvents();
  const state = await writeMaterialized(events);
  console.log(JSON.stringify({ materialized: true, events: state.ledger.event_count, theses: state.summary.thesis_count, open_positions: state.summary.open_positions }, null, 2));
} else if (command === 'template') {
  const eventType = process.argv[3];
  if (!DECISION_EVENT_TYPES.includes(eventType)) throw new Error(`Template type must be one of: ${DECISION_EVENT_TYPES.join(', ')}`);
  const [publicManifest, weeklyIndex] = await Promise.all([
    readJson(publicManifestPath),
    readJson(resolve(projectRoot, 'data/current/weekly-index.json')),
  ]);
  if (!weeklyIndex.latest_version_id) throw new Error('Freeze a weekly state before creating a decision template');
  const weeklyVersion = await readJson(resolve(projectRoot, 'data/weekly', `${weeklyIndex.latest_version_id}.json`));
  const draftPath = resolve(decisionRoot, 'drafts', `${eventType.replace('.', '-')}-${Date.now()}.json`);
  const input = {
    event_type: eventType,
    entity_id: '<existing thesis id; choose a new opaque id for thesis.created>',
    actor: 'local',
    public_refs: {
      public_manifest_id: weeklyVersion.public_manifest.id,
      evidence_snapshot_id: weeklyVersion.evidence.id,
      forecast_version_id: weeklyVersion.forecast.id,
      weekly_state_version_id: weeklyVersion.weekly_state_version_id,
      market_snapshot_id: weeklyVersion.market.id,
      policy_versions: publicManifest.policy_versions,
      quote_ids: [],
    },
    payload: templatePayload(eventType),
  };
  await mkdir(dirname(draftPath), { recursive: true, mode: 0o700 });
  await writeFile(draftPath, `${JSON.stringify(input, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ template_created: true, event_type: eventType, path: displayPath(draftPath) }, null, 2));
} else if (command === 'append') {
  const inputPath = process.argv[3];
  if (!inputPath) throw new Error('Usage: npm run decision:append -- PATH_TO_PRIVATE_EVENT_JSON');
  const [input, events] = await Promise.all([readJson(resolve(inputPath)), readEvents()]);
  const event = prepareDecisionEvent(input, { previousEventHash: events.at(-1)?.event_hash ?? null });
  const nextEvents = [...events, event];
  validateDecisionEventChain(nextEvents);
  materializeDecisionLedger(nextEvents);
  await appendFile(eventsPath, `${JSON.stringify(event)}\n`, { mode: 0o600 });
  const state = await writeMaterialized(nextEvents);
  console.log(JSON.stringify({ appended: true, event_type: event.event_type, events: state.ledger.event_count, open_positions: state.summary.open_positions }, null, 2));
} else {
  throw new Error('Usage: node scripts/decision-ledger.mjs init|validate|materialize|template EVENT_TYPE|append EVENT_JSON');
}
