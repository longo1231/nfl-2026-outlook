import {
  expectedWinsFromTails,
  weightedIsotonicNonIncreasing,
} from './market-math.mjs';

const round = (value, digits = 6) => Number(value.toFixed(digits));
const asNumber = value => value === null || value === undefined || value === '' ? null : Number(value);

function violations(values) {
  return values.reduce((count, value, index) => count + (index > 0 && values[index - 1] < value ? 1 : 0), 0);
}

function price(market, dollarsKey, centsKey) {
  const dollars = asNumber(market[dollarsKey]);
  if (Number.isFinite(dollars)) return dollars;
  const cents = asNumber(market[centsKey]);
  return Number.isFinite(cents) ? cents / 100 : null;
}

function size(market, primaryKey, fallbackKey) {
  const primary = asNumber(market[primaryKey]);
  if (Number.isFinite(primary)) return primary;
  const fallback = asNumber(market[fallbackKey]);
  return Number.isFinite(fallback) ? fallback : null;
}

export function buildKalshiTeamCurve(markets) {
  const ordered = [...markets].sort((left, right) => Number(left.floor_strike) - Number(right.floor_strike));
  const thresholds = ordered.map(market => {
    const winsAtLeast = Number(market.floor_strike);
    const yesBid = price(market, 'yes_bid_dollars', 'yes_bid');
    const yesAsk = price(market, 'yes_ask_dollars', 'yes_ask');
    if (!Number.isInteger(winsAtLeast) || winsAtLeast < 1 || winsAtLeast > 17) {
      throw new RangeError(`Invalid Kalshi NFL win threshold for ${market.ticker}`);
    }
    if (![yesBid, yesAsk].every(value => Number.isFinite(value) && value >= 0 && value <= 1) || yesBid > yesAsk) {
      throw new RangeError(`Invalid Kalshi bid/ask for ${market.ticker}`);
    }
    const spread = yesAsk - yesBid;
    return {
      wins_at_least: winsAtLeast,
      ticker: market.ticker,
      title: market.title,
      yes_bid: round(yesBid, 4),
      yes_ask: round(yesAsk, 4),
      no_ask: round(1 - yesBid, 4),
      midpoint: round((yesBid + yesAsk) / 2, 4),
      spread: round(spread, 4),
      yes_bid_size: size(market, 'yes_bid_size_fp', 'yes_bid_size'),
      yes_ask_size: size(market, 'yes_ask_size_fp', 'yes_ask_size'),
      no_ask_size: size(market, 'no_ask_size_fp', 'yes_bid_size_fp'),
      volume: asNumber(market.volume_fp ?? market.volume),
      volume_24h: asNumber(market.volume_24h_fp ?? market.volume_24h),
      open_interest: asNumber(market.open_interest_fp ?? market.open_interest),
      close_time: market.close_time,
      isotonic_weight: 1 / Math.max(spread, 0.01),
    };
  });

  const uniqueThresholds = new Set(thresholds.map(item => item.wins_at_least));
  const complete = thresholds.length === 17 && uniqueThresholds.size === 17
    && Array.from({ length: 17 }, (_, index) => index + 1).every(k => uniqueThresholds.has(k));
  const weights = thresholds.map(item => item.isotonic_weight);
  const rawBids = thresholds.map(item => item.yes_bid);
  const rawAsks = thresholds.map(item => item.yes_ask);
  const rawMidpoints = thresholds.map(item => item.midpoint);
  const adjustedBids = weightedIsotonicNonIncreasing(rawBids.map((value, index) => ({ value, weight: weights[index] })));
  const adjustedAsks = weightedIsotonicNonIncreasing(rawAsks.map((value, index) => ({ value, weight: weights[index] })));
  const adjustedMidpoints = weightedIsotonicNonIncreasing(rawMidpoints.map((value, index) => ({ value, weight: weights[index] })));

  thresholds.forEach((item, index) => {
    item.adjusted_bid = round(adjustedBids[index]);
    item.adjusted_ask = round(adjustedAsks[index]);
    item.adjusted_midpoint = round(adjustedMidpoints[index]);
    item.isotonic_adjusted = Math.abs(adjustedMidpoints[index] - item.midpoint) > 1e-10;
    item.isotonic_weight = round(item.isotonic_weight);
  });

  return {
    thresholds,
    coverage: {
      status: complete ? 'complete' : 'incomplete',
      threshold_count: thresholds.length,
      all_17_tails: complete,
    },
    monotonicity_audit: {
      bid_violations_before: violations(rawBids),
      ask_violations_before: violations(rawAsks),
      midpoint_violations_before: violations(rawMidpoints),
      midpoint_points_adjusted: thresholds.filter(item => item.isotonic_adjusted).length,
      all_curves_monotone_after: [adjustedBids, adjustedAsks, adjustedMidpoints].every(values =>
        values.every((value, index) => index === 0 || values[index - 1] >= value)),
    },
    expected_wins: complete ? {
      midpoint_estimate: round(expectedWinsFromTails(adjustedMidpoints), 3),
      bid_bound: round(expectedWinsFromTails(adjustedBids), 3),
      ask_bound: round(expectedWinsFromTails(adjustedAsks), 3),
      basis: 'sum of 17 spread-weighted, monotone Kalshi tail midpoints',
    } : null,
    average_spread: round(thresholds.reduce((sum, item) => sum + item.spread, 0) / Math.max(1, thresholds.length), 4),
  };
}

function aggregateRows(rows) {
  return {
    team_count: rows.length,
    midpoint_estimate: round(rows.reduce((sum, row) => sum + row.expected_wins.midpoint_estimate, 0), 3),
    bid_bound: round(rows.reduce((sum, row) => sum + row.expected_wins.bid_bound, 0), 3),
    ask_bound: round(rows.reduce((sum, row) => sum + row.expected_wins.ask_bound, 0), 3),
    average_tail_spread: round(rows.reduce((sum, row) => sum + row.average_spread, 0) / Math.max(1, rows.length), 4),
  };
}

export function buildWinAggregates(teamCurves, teamRegistry) {
  const rows = teamRegistry.map(team => ({ ...team, ...teamCurves[team.abbr] }));
  if (rows.some(row => !row.expected_wins)) throw new Error('Conference/division totals require complete expected-win curves for every team');
  const conferences = ['AFC', 'NFC'].map(conference => ({
    conference,
    ...aggregateRows(rows.filter(row => row.conference === conference)),
  }));
  const divisions = ['AFC', 'NFC'].flatMap(conference => ['East', 'North', 'South', 'West'].map(division => ({
    conference,
    division,
    label: `${conference} ${division}`,
    ...aggregateRows(rows.filter(row => row.conference === conference && row.division === division)),
  })));
  const league = aggregateRows(rows);
  league.regular_season_games = 272;
  league.midpoint_minus_maximum_team_wins = round(league.midpoint_estimate - 272, 3);
  return { league, conferences, divisions };
}

export function rankExpectedWins(teamCurves) {
  const ordered = Object.entries(teamCurves).sort(([leftAbbr, left], [rightAbbr, right]) =>
    right.expected_wins.midpoint_estimate - left.expected_wins.midpoint_estimate || leftAbbr.localeCompare(rightAbbr));
  for (let index = 0; index < ordered.length;) {
    let end = index;
    while (end + 1 < ordered.length && Math.abs(ordered[end + 1][1].expected_wins.midpoint_estimate - ordered[index][1].expected_wins.midpoint_estimate) < 1e-9) end += 1;
    const rank = (index + 1 + end + 1) / 2;
    for (let cursor = index; cursor <= end; cursor += 1) ordered[cursor][1].expected_win_rank = rank;
    index = end + 1;
  }
}

export function buildBetComparisons(teamCurves, sportsbookSnapshot, { minEdgeCents = 5, maxSpreadCents = 12 } = {}) {
  const comparisons = [];
  for (const [abbr, sportsbookTeam] of Object.entries(sportsbookSnapshot.teams)) {
    const curve = teamCurves[abbr];
    if (!curve) continue;
    for (const sourceThreshold of sportsbookTeam.thresholds) {
      const threshold = curve.thresholds.find(item => item.wins_at_least === sourceThreshold.wins_at_least);
      if (!threshold) continue;
      const sportsbookOver = sourceThreshold.adjusted_tail_probability;
      const yesEdge = sportsbookOver - threshold.yes_ask;
      const noProbability = 1 - sportsbookOver;
      const noEdge = noProbability - threshold.no_ask;
      for (const side of ['yes', 'no']) {
        const isYes = side === 'yes';
        const edge = isYes ? yesEdge : noEdge;
        const ask = isYes ? threshold.yes_ask : threshold.no_ask;
        const availableSize = isYes ? threshold.yes_ask_size : threshold.no_ask_size;
        comparisons.push({
          team: abbr,
          wins_at_least: threshold.wins_at_least,
          kalshi_ticker: threshold.ticker,
          side,
          contract: `${side.toUpperCase()} ${threshold.wins_at_least}+ wins`,
          sportsbook_probability: round(isYes ? sportsbookOver : noProbability),
          kalshi_ask: round(ask),
          kalshi_spread: threshold.spread,
          available_size: availableSize,
          pre_fee_edge: round(edge),
          pre_fee_edge_cents: round(edge * 100, 2),
          sportsbook_paired_quote_count: sourceThreshold.paired_quote_count,
          sportsbook_books: sourceThreshold.books,
          sportsbook_median_hold: sourceThreshold.median_hold,
          passes_filters: edge * 100 >= minEdgeCents && threshold.spread * 100 <= maxSpreadCents && availableSize !== null && availableSize > 0,
        });
      }
    }
  }
  const candidates = comparisons.filter(item => item.passes_filters).sort((left, right) =>
    right.pre_fee_edge - left.pre_fee_edge || left.team.localeCompare(right.team) || left.wins_at_least - right.wins_at_least);
  return { comparisons, candidates };
}
