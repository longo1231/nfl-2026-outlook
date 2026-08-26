import assert from 'node:assert/strict';
import test from 'node:test';
import previewRegistry from '../data/previews/2026-team-previews.json' with { type: 'json' };
import qbRanking from '../data/rankings/2026-qb.json' with { type: 'json' };
import coachingRanking from '../data/rankings/2026-coaching.json' with { type: 'json' };
import offensiveLineRanking from '../data/rankings/2026-offensive-line.json' with { type: 'json' };
import skillRanking from '../data/rankings/2026-skill-positions.json' with { type: 'json' };
import offenseRanking from '../data/rankings/2026-offense.json' with { type: 'json' };
import defenseRanking from '../data/rankings/2026-defense.json' with { type: 'json' };
import {
  americanToImplied,
  deVigPair,
  distributionFromTails,
  expectedWinsFromTails,
  observedMedianBracket,
  weightedIsotonicNonIncreasing,
} from '../lib/market-math.mjs';
import {
  distributionMoments,
  normalizeCategoryWeights,
  probabilityAtLeast,
  probabilityAtMost,
  rankScores,
  rankStrength,
  weightedProfileScore,
} from '../lib/profile-market.mjs';

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

test('podcast category weights normalize and produce a transparent strength score', () => {
  const categories = [
    { id: 'qb', analysisWeight: 40 },
    { id: 'coaching', analysisWeight: 25 },
    { id: 'ol', analysisWeight: 20 },
    { id: 'skill', analysisWeight: 15 },
  ];
  const weights = normalizeCategoryWeights(categories);
  assert.deepEqual(weights, { qb: 0.4, coaching: 0.25, ol: 0.2, skill: 0.15 });
  const score = weightedProfileScore({ qb: 1, coaching: 32, ol: 32, skill: 32 }, categories);
  assert.equal(score, 40);
  assert.equal(rankStrength(1), 100);
  assert.equal(rankStrength(32), 0);
});

test('profile scoring accepts new categories and adjustable importance without formula changes', () => {
  const categories = [
    { id: 'qb', analysisWeight: 40 },
    { id: 'defense', analysisWeight: 30 },
  ];
  const ranks = { qb: 1, defense: 32 };
  assert.ok(Math.abs(weightedProfileScore(ranks, categories) - (400 / 7)) < 1e-12);
  assert.equal(weightedProfileScore(ranks, categories, { qb: 0, defense: 1 }), 0);
  assert.deepEqual(rankScores({ BUF: 80, KC: 80, LAR: 75 }), { BUF: 1, KC: 2, LAR: 3 });
});

test('all six scoring sources preserve a complete unique 1–32 ranking contract', () => {
  for (const ranking of [qbRanking, coachingRanking, offensiveLineRanking, skillRanking, offenseRanking, defenseRanking]) {
    assert.equal(ranking.season, 2026);
    assert.equal(ranking.order.length, 32);
    assert.equal(new Set(ranking.order).size, 32);
  }
});

test('partial market-aware previews are registered without entering league scoring', () => {
  assert.equal(previewRegistry.sources.length, 4);
  assert.ok(previewRegistry.sources.every(source => source.kind === 'team-preview'));
  assert.ok(previewRegistry.sources.every(source => source.scoring_eligible === false && source.analysis_weight === 0 && source.market_aware === true));
  assert.deepEqual([...new Set(previewRegistry.sources.flatMap(source => source.covered_teams))].sort(), ['BAL','BUF','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LV','MIA','MIN','NE','NYG','NYJ','PHI','PIT','TEN','WAS']);
  assert.deepEqual(previewRegistry.sources[0].ballots.map(ballot => ballot.positions.map(position => position.team)), [
    ['DAL','PHI','NYG','WAS'],
    ['DAL','PHI','WAS','NYG'],
    ['PHI','DAL','WAS','NYG'],
  ]);
  assert.deepEqual(previewRegistry.sources[1].ballots[0].positions.map(position => position.team), ['NE','BUF','NYJ','MIA']);
  assert.deepEqual(previewRegistry.sources[1].ballots[1].positions.map(position => position.team), ['BUF','NE']);
  assert.deepEqual(previewRegistry.sources[2].ballots.map(ballot => ballot.positions.map(position => position.team)), [['HOU'],['CIN'],['PIT']]);
  assert.ok(previewRegistry.sources[2].ballots.every(ballot => ballot.complete === false));
  assert.deepEqual(previewRegistry.sources[3].ballots.map(ballot => ballot.positions.map(position => position.team)), [
    ['DET','MIN','CHI','GB'],
    ['DET','MIN','GB','CHI'],
    ['GB','CHI','MIN','DET'],
  ]);
  assert.ok(previewRegistry.sources[3].ballots.every(ballot => ballot.complete === true));
});

test('tail and distribution-shape metrics use the complete exact-win density', () => {
  const distribution = Array.from({ length: 18 }, (_, wins) => ({ wins, probability: wins === 8 ? 0.6 : wins === 12 ? 0.4 : 0 }));
  assert.equal(probabilityAtMost(distribution, 6), 0);
  assert.equal(probabilityAtLeast(distribution, 9), 0.4);
  const moments = distributionMoments(distribution);
  assert.ok(Math.abs(moments.mean - 9.6) < 1e-12);
  assert.ok(Math.abs(moments.standardDeviation - 1.959591794) < 1e-8);
});
