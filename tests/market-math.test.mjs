import assert from 'node:assert/strict';
import test from 'node:test';
import {
  americanToImplied,
  deVigPair,
  distributionFromTails,
  expectedWinsFromTails,
  observedMedianBracket,
  weightedIsotonicNonIncreasing,
} from '../lib/market-math.mjs';

test('American odds convert to raw implied probabilities', () => {
  assert.ok(Math.abs(americanToImplied(-140) - 0.5833333333) < 1e-9);
  assert.ok(Math.abs(americanToImplied(115) - 0.4651162791) < 1e-9);
  assert.throws(() => americanToImplied(0), /non-zero/);
});

test('paired quotes are de-vigged proportionally', () => {
  const result = deVigPair(-140, 115);
  assert.ok(Math.abs(result.qOver - 0.5563770795) < 1e-9);
  assert.ok(Math.abs(result.qOver + result.qUnder - 1) < 1e-12);
  assert.ok(result.hold > 0);
});

test('weighted isotonic regression enforces a non-increasing tail curve', () => {
  const adjusted = weightedIsotonicNonIncreasing([
    { value: 0.72, weight: 2 },
    { value: 0.49, weight: 1 },
    { value: 0.53, weight: 3 },
    { value: 0.21, weight: 1 },
  ]);
  assert.deepEqual(adjusted.map(value => Number(value.toFixed(4))), [0.72, 0.52, 0.52, 0.21]);
  assert.ok(adjusted.every((value, index) => index === 0 || adjusted[index - 1] >= value));
});

test('a complete monotone tail curve yields nonnegative mass summing to one', () => {
  const tails = Array.from({ length: 17 }, (_, index) => (17 - index) / 18);
  const masses = distributionFromTails(tails);
  assert.equal(masses.length, 18);
  assert.ok(masses.every(value => value >= 0));
  assert.ok(Math.abs(masses.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
});

test('tail-sum expectation matches the distribution expectation', () => {
  const tails = Array.from({ length: 17 }, (_, index) => (17 - index) / 18);
  const masses = distributionFromTails(tails);
  const direct = masses.reduce((sum, probability, wins) => sum + probability * wins, 0);
  assert.ok(Math.abs(expectedWinsFromTails(tails) - direct) < 1e-12);
});

test('sparse tails produce honest one-sided median bounds', () => {
  assert.equal(observedMedianBracket([{ winsAtLeast: 12, q: 0.5564 }]).display, '\u226512 wins');
  assert.equal(observedMedianBracket([{ winsAtLeast: 11, q: 0.42 }]).display, '\u226410 wins');
  assert.equal(observedMedianBracket([
    { winsAtLeast: 10, q: 0.63 },
    { winsAtLeast: 11, q: 0.41 },
  ]).display, '10 wins');
});
