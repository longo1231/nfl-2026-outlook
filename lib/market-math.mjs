const EPSILON = 1e-12;

export function americanToImplied(odds) {
  const value = Number(odds);
  if (!Number.isFinite(value) || value === 0) {
    throw new TypeError(`American odds must be a finite non-zero number; received ${odds}`);
  }
  return value < 0 ? Math.abs(value) / (Math.abs(value) + 100) : 100 / (value + 100);
}

export function deVigPair(overOdds, underOdds) {
  const rawOver = americanToImplied(overOdds);
  const rawUnder = americanToImplied(underOdds);
  const rawTotal = rawOver + rawUnder;
  return {
    rawOver,
    rawUnder,
    hold: rawTotal - 1,
    qOver: rawOver / rawTotal,
    qUnder: rawUnder / rawTotal,
  };
}

export function median(values) {
  if (!values.length) throw new RangeError('Median requires at least one value');
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function weightedIsotonicNonIncreasing(points) {
  if (!points.length) return [];
  const blocks = points.map((point, index) => {
    const value = Number(point.value);
    const weight = Number(point.weight ?? 1);
    if (!Number.isFinite(value) || !Number.isFinite(weight) || weight <= 0) {
      throw new TypeError('Isotonic points require finite values and positive weights');
    }
    return { start: index, end: index, weight, weightedSum: value * weight, value };
  });

  for (let index = 1; index < blocks.length;) {
    if (blocks[index - 1].value + EPSILON >= blocks[index].value) {
      index += 1;
      continue;
    }
    const right = blocks.splice(index, 1)[0];
    const left = blocks[index - 1];
    left.end = right.end;
    left.weight += right.weight;
    left.weightedSum += right.weightedSum;
    left.value = left.weightedSum / left.weight;
    if (index > 1) index -= 1;
  }

  const adjusted = new Array(points.length);
  for (const block of blocks) {
    for (let index = block.start; index <= block.end; index += 1) adjusted[index] = block.value;
  }
  return adjusted;
}

export function distributionFromTails(tails) {
  if (tails.length !== 17) throw new RangeError('A 17-game distribution requires tails P(W >= k) for k=1..17');
  tails.forEach((value, index) => {
    if (value < -EPSILON || value > 1 + EPSILON) throw new RangeError(`Tail ${index + 1} is outside [0,1]`);
    if (index > 0 && tails[index - 1] + EPSILON < value) throw new RangeError('Tail probabilities must be non-increasing');
  });
  const masses = [1 - tails[0]];
  for (let index = 0; index < 16; index += 1) masses.push(tails[index] - tails[index + 1]);
  masses.push(tails[16]);
  return masses.map(value => Math.abs(value) < EPSILON ? 0 : value);
}

export function expectedWinsFromTails(tails) {
  distributionFromTails(tails);
  return tails.reduce((sum, value) => sum + value, 0);
}

export function observedMedianBracket(points) {
  const ordered = [...points].sort((a, b) => a.winsAtLeast - b.winsAtLeast);
  const exact = ordered.filter(point => Math.abs(point.q - 0.5) <= EPSILON);
  const lowerCandidates = ordered.filter(point => point.q > 0.5 + EPSILON).map(point => point.winsAtLeast);
  const upperCandidates = ordered.filter(point => point.q < 0.5 - EPSILON).map(point => point.winsAtLeast - 1);
  let lower = lowerCandidates.length ? Math.max(...lowerCandidates) : null;
  let upper = upperCandidates.length ? Math.min(...upperCandidates) : null;

  if (exact.length) {
    const threshold = exact[0].winsAtLeast;
    lower = lower === null ? threshold - 1 : Math.min(lower, threshold - 1);
    upper = upper === null ? threshold : Math.max(upper, threshold);
  }

  let display;
  if (lower !== null && upper !== null && lower <= upper) {
    display = lower === upper ? `${lower} wins` : `${lower}\u2013${upper} wins`;
  } else if (lower !== null && upper === null) {
    display = `\u2265${lower} wins`;
  } else if (lower === null && upper !== null) {
    display = `\u2264${upper} wins`;
  } else {
    display = 'Not bounded';
  }
  return { lower, upper, display };
}

export function priceAdjustedOrderIndex(line, qOver) {
  if (!Number.isFinite(line) || !Number.isFinite(qOver) || qOver < 0 || qOver > 1) {
    throw new TypeError('Price-adjusted order index requires a finite line and probability in [0,1]');
  }
  return line + qOver - 0.5;
}
