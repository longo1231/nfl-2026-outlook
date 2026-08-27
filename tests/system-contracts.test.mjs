import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { materializeDecisionLedger } from '../lib/decision-ledger.mjs';
import {
  prepareDecisionEvent,
  validateDecisionEvent,
  validateDecisionEventChain,
  validateForecastPolicy,
  validateFreshnessPolicy,
  validateKalshiExecutionSnapshot,
  validateKalshiFeeSchedule,
  validateMarketPolicy,
  validatePublicManifest,
} from '../lib/system-contracts.mjs';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('versioned forecast and Kalshi-only market policies preserve feature and action boundaries', async () => {
  const [freshness, forecast, market, fees] = await Promise.all([
    readJson('../config/freshness-policy.json'),
    readJson('../config/forecast-policy.json'),
    readJson('../config/market-policy.json'),
    readJson('../config/kalshi-fee-schedule.json'),
  ]);
  assert.equal(validateFreshnessPolicy(freshness), true);
  assert.equal(validateForecastPolicy(forecast), true);
  assert.equal(validateMarketPolicy(market), true);
  assert.equal(validateKalshiFeeSchedule(fees), true);
  assert.equal(forecast.market_prices_allowed_as_features, false);
  assert.equal(forecast.active_model_state, 'provisional');
  assert.deepEqual(forecast.model.holdout_seasons, [2022, 2023, 2024, 2025]);
  assert.deepEqual(market.venue_scope, ['kalshi']);
  assert.equal(market.persistence.minimum_qualifying_captures, 2);
  assert.equal(market.account_access, 'none');
  assert.equal(market.order_placement_enabled, false);
});

test('the generated public current-state manifest satisfies its runtime contract', async () => {
  const manifest = await readJson('../data/current/public-manifest.json');
  assert.equal(validatePublicManifest(manifest), true);
  assert.equal(manifest.forecast.status, 'provisional');
  assert.equal(manifest.forecast.decision_eligible, false);
  assert.match(manifest.forecast.version_id, /^fcst-2026-preseason-/);
  assert.equal(manifest.evidence.claim_level_freshness_complete, true);
  assert.match(manifest.evidence.snapshot_id, /^evidence-2026-/);
  assert.equal(manifest.evidence.claim_count, 972);
  assert.equal(manifest.policy_versions.learning, 'learning-policy-2026.1');
  assert.deepEqual(Object.keys(manifest.markets), ['kalshi']);
  assert.equal(manifest.markets.kalshi.full_orderbook, true);
  assert.equal(manifest.markets.kalshi.action_eligible_candidates, 0);
});

test('active Kalshi execution snapshot matches the policy, fee schedule and manifest', async () => {
  const [manifest, policy, fees] = await Promise.all([
    readJson('../data/current/public-manifest.json'),
    readJson('../config/market-policy.json'),
    readJson('../config/kalshi-fee-schedule.json'),
  ]);
  const snapshot = await readJson(`../${manifest.markets.kalshi.path}`);
  assert.equal(validateKalshiExecutionSnapshot(snapshot, { policy, feeSchedule: fees }), true);
  assert.equal(snapshot.snapshot_id, manifest.markets.kalshi.snapshot_id);
  assert.equal(snapshot.contracts.length, 544);
  assert.equal(snapshot.orderbooks.length, 544);
  assert.equal(snapshot.quotes.length, 1088);
  assert.equal(snapshot.action_candidate_ids.length, 0);
});

test('redacted decision events form a tamper-evident append-only chain', async () => {
  const inputs = await readJson('./fixtures/decision-event-inputs.json');
  const events = [];
  for (const input of inputs) {
    events.push(prepareDecisionEvent(input, { previousEventHash: events.at(-1)?.event_hash ?? null }));
  }
  const result = validateDecisionEventChain(events);
  assert.equal(result.event_count, inputs.length);
  assert.match(result.head_hash, /^[a-f0-9]{64}$/);

  const tampered = structuredClone(events.at(0));
  tampered.payload.title = 'Tampered title';
  assert.throws(() => validateDecisionEvent(tampered), /hash does not match/);
});

test('decision materialization preserves passes and derives positions without editing history', async () => {
  const inputs = await readJson('./fixtures/decision-event-inputs.json');
  const events = [];
  for (const input of inputs) events.push(prepareDecisionEvent(input, { previousEventHash: events.at(-1)?.event_hash ?? null }));
  const state = materializeDecisionLedger(events);
  assert.equal(state.ledger.event_count, inputs.length);
  assert.equal(state.summary.thesis_count, 2);
  assert.equal(state.summary.passed_theses, 1);
  assert.equal(state.summary.open_positions, 0);
  const closed = state.theses.find(thesis => thesis.thesis_id === 'thesis_fixture_position');
  assert.equal(closed.lifecycle_state, 'closed');
  assert.equal(closed.position.closing_price, 0.6);
  assert.equal(closed.position.clv_per_contract, 0.06);
  assert.equal(closed.position.clv_total, 0.6);
  assert.equal(closed.position.realized_pnl, 0.4);
  assert.equal(state.summary.closing_price_count, 1);
  assert.equal(state.summary.outcome_count, 1);
  assert.equal(state.summary.postmortem_queue_count, 0);
  assert.equal(state.learning.length, 1);
  assert.equal(events.at(0).payload.title, 'Fictional pass fixture');
});

test('decision materialization rejects lifecycle events without a created thesis', () => {
  const input = {
    event_id: 'evt_fixture_orphan',
    event_type: 'decision.watch',
    entity_id: 'thesis_fixture_missing',
    occurred_at: '2026-08-27T15:00:00Z',
    recorded_at: '2026-08-27T15:00:01Z',
    actor: 'fixture',
    public_refs: { public_manifest_id: 'public-fixture', evidence_snapshot_id: 'evidence-fixture', forecast_version_id: null, quote_ids: [] },
    payload: { reason: 'This orphan event must be rejected.' },
  };
  const event = prepareDecisionEvent(input);
  assert.throws(() => materializeDecisionLedger([event]), /has not been created/);
});
