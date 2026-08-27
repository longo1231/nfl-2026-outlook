import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildKalshiDiagnostic,
  calculateKalshiBuyExecution,
  kalshiQuadraticFee,
  normalizeKalshiOrderbook,
} from '../lib/kalshi-execution.mjs';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('quadratic taker fees reproduce published schedule examples', () => {
  assert.equal(kalshiQuadraticFee({ contracts: 100, price: 0.5, rate: 0.07, multiplier: 1 }), 1.75);
  assert.equal(kalshiQuadraticFee({ contracts: 100, price: 0.2, rate: 0.07, multiplier: 1 }), 1.12);
});

test('order-book normalization derives asks from the complementary bid side', () => {
  const book = normalizeKalshiOrderbook({ orderbook_fp: { yes_dollars: [['0.40', '20']], no_dollars: [['0.30', '50']] } });
  assert.deepEqual(book.yes.executable_asks, [{ price: 0.7, contracts: 50 }]);
  assert.deepEqual(book.no.executable_asks, [{ price: 0.6, contracts: 20 }]);
  assert.equal(book.yes.bid, 0.4);
  assert.equal(book.yes.ask, 0.7);
});

test('size-aware execution walks depth, never overfills and reserves fee rounding', async () => {
  const fees = await readJson('../config/kalshi-fee-schedule.json');
  const execution = calculateKalshiBuyExecution({
    asks: [{ price: 0.4, contracts: 25 }, { price: 0.45, contracts: 50 }, { price: 0.5, contracts: 100 }],
    requestedContracts: 100,
    feeSchedule: fees,
  });
  assert.equal(execution.full_fill, true);
  assert.equal(execution.filled_contracts, 100);
  assert.equal(execution.levels_consumed, 3);
  assert.equal(execution.volume_weighted_price, 0.45);
  assert.equal(execution.conservative_rounding_reserve, 0.01);
  assert.ok(execution.conservative_break_even_probability > execution.volume_weighted_price);

  const partial = calculateKalshiBuyExecution({ asks: [{ price: 0.4, contracts: 12 }], requestedContracts: 100, feeSchedule: fees });
  assert.equal(partial.full_fill, false);
  assert.equal(partial.filled_contracts, 12);
  assert.equal(partial.unfilled_contracts, 88);
});

test('a model diagnostic needs two correctly spaced captures before action eligibility', async () => {
  const [policy, fees] = await Promise.all([
    readJson('../config/market-policy.json'),
    readJson('../config/kalshi-fee-schedule.json'),
  ]);
  const quote = { quote_id: 'quote-1', contract_id: 'KXNFLWINS-TEST-10', side: 'yes', spread: 0.02 };
  const execution = calculateKalshiBuyExecution({ asks: [{ price: 0.5, contracts: 100 }], requestedContracts: 100, feeSchedule: fees });
  const forecast = {
    forecast_version_id: 'forecast-test',
    model_state: 'validated',
    decision_eligible: true,
    win_probability_mass: Array.from({ length: 18 }, (_, wins) => wins === 10 ? 1 : 0),
  };
  const first = buildKalshiDiagnostic({ snapshotId: 'first', quote, teamId: 'TEST', winsAtLeast: 10, forecast, execution, policy, capturedAt: '2026-08-27T15:00:00Z' });
  const second = buildKalshiDiagnostic({ snapshotId: 'second', quote: { ...quote, quote_id: 'quote-2' }, teamId: 'TEST', winsAtLeast: 10, forecast, execution, policy, capturedAt: '2026-08-27T15:03:00Z', priorDiagnostic: first, priorCapturedAt: '2026-08-27T15:00:00Z' });
  assert.equal(first.research_qualified, true);
  assert.equal(first.action_eligible, false);
  assert.equal(first.persistence.qualifying_captures, 1);
  assert.deepEqual(first.failed_gates, ['persistence']);
  assert.equal(second.persistence.spacing_valid, true);
  assert.equal(second.persistence.qualifying_captures, 2);
  assert.equal(second.action_eligible, true);
});
