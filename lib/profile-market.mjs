const DEFAULT_FIELD_SIZE = 32;

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
  return number;
}

export function rankStrength(rank, fieldSize = DEFAULT_FIELD_SIZE) {
  const value = finite(rank, 'Rank');
  const size = finite(fieldSize, 'Field size');
  if (!Number.isInteger(value) || !Number.isInteger(size) || size < 2 || value < 1 || value > size) {
    throw new RangeError(`Rank must be an integer from 1 to ${size}`);
  }
  return ((size - value) / (size - 1)) * 100;
}

export function normalizeCategoryWeights(categories, overrides = {}) {
  if (!categories.length) throw new RangeError('At least one category is required');
  const raw = categories.map(category => {
    const value = finite(overrides[category.id] ?? category.analysisWeight, `Weight for ${category.id}`);
    if (value < 0) throw new RangeError(`Weight for ${category.id} cannot be negative`);
    return [category.id, value];
  });
  const total = raw.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) throw new RangeError('At least one category weight must be positive');
  return Object.fromEntries(raw.map(([id, value]) => [id, value / total]));
}

export function weightedProfileScore(rankByCategory, categories, overrides = {}, fieldSize = DEFAULT_FIELD_SIZE) {
  const weights = normalizeCategoryWeights(categories, overrides);
  return categories.reduce((score, category) => {
    if (!(category.id in rankByCategory)) throw new RangeError(`Missing ${category.id} rank`);
    return score + rankStrength(rankByCategory[category.id], fieldSize) * weights[category.id];
  }, 0);
}

export function rankScores(scores) {
  const ordered = Object.entries(scores).sort(([leftId, left], [rightId, right]) =>
    finite(right, `Score for ${rightId}`) - finite(left, `Score for ${leftId}`) || leftId.localeCompare(rightId));
  return Object.fromEntries(ordered.map(([id], index) => [id, index + 1]));
}

export function probabilityAtLeast(distribution, threshold) {
  const floor = finite(threshold, 'Threshold');
  return distribution.reduce((sum, point) => sum + (point.wins >= floor ? finite(point.probability, 'Probability') : 0), 0);
}

export function probabilityAtMost(distribution, threshold) {
  const ceiling = finite(threshold, 'Threshold');
  return distribution.reduce((sum, point) => sum + (point.wins <= ceiling ? finite(point.probability, 'Probability') : 0), 0);
}

export function distributionMoments(distribution) {
  const total = distribution.reduce((sum, point) => sum + finite(point.probability, 'Probability'), 0);
  if (Math.abs(total - 1) > 1e-6) throw new RangeError(`Distribution must sum to one; received ${total}`);
  const mean = distribution.reduce((sum, point) => sum + finite(point.wins, 'Wins') * point.probability, 0);
  const variance = distribution.reduce((sum, point) => sum + ((point.wins - mean) ** 2) * point.probability, 0);
  return { mean, variance, standardDeviation: Math.sqrt(Math.max(0, variance)) };
}
