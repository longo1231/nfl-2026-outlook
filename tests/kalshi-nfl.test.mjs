import assert from 'node:assert/strict';
import { constants, createVerify, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { kalshiSigningPath, parseEnv, signKalshiRequest } from '../lib/kalshi-auth.mjs';
import {
  buildBetComparisons,
  buildKalshiTeamCurve,
  buildWinAggregates,
  rankExpectedWins,
} from '../lib/kalshi-nfl.mjs';

const marketsFor = (abbr, probabilities) => probabilities.map((probability, index) => ({
  ticker: `KXNFLWINS-27${abbr}-${index + 1}`,
  title: `${abbr} ${index + 1}+ wins`,
  floor_strike: index + 1,
  yes_bid_dollars: Math.max(0, probability - 0.02).toFixed(4),
  yes_ask_dollars: Math.min(1, probability + 0.02).toFixed(4),
  yes_bid_size_fp: '100.00',
  yes_ask_size_fp: '100.00',
  volume_fp: '500.00',
  open_interest_fp: '250.00',
}));

test('Kalshi env parsing and signing match the documented RSA-PSS contract', () => {
  assert.deepEqual(parseEnv('A=one\nexport B="two words"\n# C=no\n'), { A: 'one', B: 'two words' });
  assert.equal(kalshiSigningPath('/account/limits?ignored=yes'), '/trade-api/v2/account/limits');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const timestamp = '1703123456789';
  const signature = signKalshiRequest(pem, timestamp, 'GET', '/account/limits?ignored=yes');
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${timestamp}GET/trade-api/v2/account/limits`);
  verifier.end();
  assert.equal(verifier.verify({ key: publicKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: constants.RSA_PSS_SALTLEN_DIGEST }, Buffer.from(signature, 'base64')), true);
});

test('a complete Kalshi ladder produces monotone tails and expected-win bounds', () => {
  const raw = Array.from({ length: 17 }, (_, index) => (17 - index) / 18);
  raw[6] = raw[5] + 0.05;
  const curve = buildKalshiTeamCurve(marketsFor('BAL', raw));
  assert.equal(curve.coverage.all_17_tails, true);
  assert.ok(curve.monotonicity_audit.midpoint_violations_before > 0);
  assert.equal(curve.monotonicity_audit.all_curves_monotone_after, true);
  assert.ok(curve.expected_wins.bid_bound < curve.expected_wins.midpoint_estimate);
  assert.ok(curve.expected_wins.midpoint_estimate < curve.expected_wins.ask_bound);
});

test('conference and division totals sum complete team expected-win curves', () => {
  const base = Array.from({ length: 17 }, (_, index) => (17 - index) / 18);
  const curves = {
    A: buildKalshiTeamCurve(marketsFor('A', base)),
    B: buildKalshiTeamCurve(marketsFor('B', base.map(value => value * 0.9))),
  };
  const registry = [
    { abbr: 'A', conference: 'AFC', division: 'East' },
    { abbr: 'B', conference: 'NFC', division: 'West' },
  ];
  const aggregates = buildWinAggregates(curves, registry);
  assert.equal(aggregates.league.team_count, 2);
  assert.equal(aggregates.conferences.reduce((sum, row) => sum + row.midpoint_estimate, 0), aggregates.league.midpoint_estimate);
});

test('expected-win ranking uses the complete Kalshi ladder', () => {
  const base = Array.from({ length: 17 }, (_, index) => (17 - index) / 18);
  const curves = {
    HIGH: buildKalshiTeamCurve(marketsFor('HIGH', base)),
    LOW: buildKalshiTeamCurve(marketsFor('LOW', base.map(value => value * 0.7))),
  };
  rankExpectedWins(curves);
  assert.equal(curves.HIGH.expected_win_rank, 1);
  assert.equal(curves.LOW.expected_win_rank, 2);
});

test('bet comparisons score executable Yes and No asks before fees', () => {
  const probabilities = Array.from({ length: 17 }, (_, index) => (17 - index) / 18);
  const curve = buildKalshiTeamCurve(marketsFor('BAL', probabilities));
  const sportsbook = { teams: { BAL: { thresholds: [{ wins_at_least: 10, adjusted_tail_probability: 0.7, paired_quote_count: 4, books: ['A', 'B'], median_hold: 0.04 }] } } };
  const result = buildBetComparisons({ BAL: curve }, sportsbook, { minEdgeCents: 5, maxSpreadCents: 12 });
  assert.equal(result.comparisons.length, 2);
  assert.equal(result.candidates[0].side, 'yes');
  assert.ok(result.candidates[0].pre_fee_edge_cents >= 5);

  const noSizeMarkets = marketsFor('BAL', probabilities).map(({ yes_bid_size_fp, yes_ask_size_fp, ...market }) => market);
  const noSizeCurve = buildKalshiTeamCurve(noSizeMarkets);
  const noSizeResult = buildBetComparisons({ BAL: noSizeCurve }, sportsbook, { minEdgeCents: 5, maxSpreadCents: 12 });
  assert.equal(noSizeResult.candidates.length, 0);
});
