import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import {
  deVigPair,
  expectedWinsFromTails,
  median,
  observedMedianBracket,
  priceAdjustedOrderIndex,
  weightedIsotonicNonIncreasing,
} from '../lib/market-math.mjs';

const [inputPath, outputPath, capturedAt] = process.argv.slice(2);
if (!inputPath || !outputPath || !capturedAt) {
  throw new Error('Usage: node scripts/build-market-snapshot.mjs INPUT_HTML OUTPUT_JSON CAPTURED_AT_ISO');
}

const sourceUrl = 'https://www.outrights.io/nfl/win-totals-odds';
const html = await readFile(inputPath, 'utf8');
const start = html.indexOf('{\\"seasonYear\\":2026');
const end = html.indexOf(',\\"leagueSlug\\":\\"nfl\\"', start);
if (start < 0 || end < 0) throw new Error('Could not locate the embedded 2026 NFL win-total payload');
const escapedPayload = html.slice(start, end);
const sourcePayload = JSON.parse(JSON.parse(`"${escapedPayload}"`));

const round = (value, digits = 6) => Number(value.toFixed(digits));
const quoteWeight = hold => 1 / (1 + Math.max(0, hold) * 10);
const preference = ['betmgm', 'draftkings', 'betrivers', 'pinnacle-sports', 'bovada', 'mybookie'];

const teams = {};
for (const sourceTeam of sourcePayload.teams) {
  const quotes = sourceTeam.books.map(book => {
    const probabilities = deVigPair(book.over.american, book.under.american);
    return {
      book: book.bookShortName,
      book_slug: book.bookSlug,
      line: book.line,
      over_odds: book.over.american,
      under_odds: book.under.american,
      raw_over_probability: round(probabilities.rawOver),
      raw_under_probability: round(probabilities.rawUnder),
      hold: round(probabilities.hold),
      no_vig_over_probability: round(probabilities.qOver),
      no_vig_under_probability: round(probabilities.qUnder),
    };
  });

  const grouped = Map.groupBy(quotes, quote => quote.line);
  const thresholds = [...grouped.entries()].sort(([left], [right]) => left - right).map(([line, lineQuotes]) => ({
    line,
    wins_at_least: line + 0.5,
    paired_quote_count: lineQuotes.length,
    books: lineQuotes.map(quote => quote.book),
    raw_consensus_tail_probability: median(lineQuotes.map(quote => quote.no_vig_over_probability)),
    median_hold: median(lineQuotes.map(quote => quote.hold)),
    isotonic_weight: lineQuotes.reduce((sum, quote) => sum + quoteWeight(quote.hold), 0),
  }));

  const adjusted = weightedIsotonicNonIncreasing(thresholds.map(threshold => ({
    value: threshold.raw_consensus_tail_probability,
    weight: threshold.isotonic_weight,
  })));
  const violationsBefore = thresholds.reduce((count, threshold, index) =>
    count + (index > 0 && thresholds[index - 1].raw_consensus_tail_probability < threshold.raw_consensus_tail_probability ? 1 : 0), 0);
  thresholds.forEach((threshold, index) => {
    const rawProbability = threshold.raw_consensus_tail_probability;
    threshold.raw_consensus_tail_probability = round(rawProbability);
    threshold.median_hold = round(threshold.median_hold);
    threshold.isotonic_weight = round(threshold.isotonic_weight);
    threshold.adjusted_tail_probability = round(adjusted[index]);
    threshold.isotonic_adjusted = Math.abs(adjusted[index] - rawProbability) > 1e-10;
  });

  const primaryThreshold = thresholds.find(threshold => threshold.line === sourceTeam.consensusLine)
    ?? thresholds.toSorted((left, right) => Math.abs(left.line - sourceTeam.consensusLine) - Math.abs(right.line - sourceTeam.consensusLine))[0];
  const primaryQuotes = quotes.filter(quote => quote.line === primaryThreshold.line);
  const referenceQuote = preference.map(slug => primaryQuotes.find(quote => quote.book_slug === slug)).find(Boolean) ?? primaryQuotes[0];
  const observedWinsAtLeast = new Set(thresholds.map(threshold => threshold.wins_at_least));
  const completeTailCoverage = Array.from({ length: 17 }, (_, index) => index + 1).every(k => observedWinsAtLeast.has(k));
  let expectedWins = null;
  if (completeTailCoverage) {
    const tails = Array.from({ length: 17 }, (_, index) => thresholds.find(threshold => threshold.wins_at_least === index + 1).adjusted_tail_probability);
    expectedWins = round(expectedWinsFromTails(tails), 3);
  }

  const thresholdCount = thresholds.length;
  const coverageLabel = completeTailCoverage
    ? 'Observed full ladder'
    : thresholdCount >= 4
      ? 'Partial ladder'
      : thresholdCount >= 2
        ? 'Limited ladder'
        : 'Sparse single threshold';
  const confidence = completeTailCoverage ? 'high' : thresholdCount >= 4 ? 'medium' : thresholdCount >= 2 ? 'low-medium' : 'low';
  const medianBracket = observedMedianBracket(thresholds.map(threshold => ({
    winsAtLeast: threshold.wins_at_least,
    q: threshold.adjusted_tail_probability,
  })));
  const primaryProbability = primaryThreshold.adjusted_tail_probability;

  teams[sourceTeam.teamAbbrev] = {
    team_name: sourceTeam.teamName,
    consensus_line: sourceTeam.consensusLine,
    opening_consensus_line: sourceTeam.openingConsensusLine,
    quotes,
    thresholds,
    primary: {
      line: primaryThreshold.line,
      wins_at_least: primaryThreshold.wins_at_least,
      reference_book: referenceQuote.book,
      over_odds: referenceQuote.over_odds,
      under_odds: referenceQuote.under_odds,
      reference_hold: referenceQuote.hold,
      same_threshold_book_count: primaryThreshold.paired_quote_count,
      raw_consensus_no_vig_over_probability: primaryThreshold.raw_consensus_tail_probability,
      consensus_no_vig_over_probability: primaryProbability,
      median_hold: primaryThreshold.median_hold,
    },
    monotonicity_audit: {
      violations_before_isotonic: violationsBefore,
      points_adjusted: thresholds.filter(threshold => threshold.isotonic_adjusted).length,
      monotone_after_isotonic: thresholds.every((threshold, index) => index === 0 || thresholds[index - 1].adjusted_tail_probability >= threshold.adjusted_tail_probability),
    },
    fair_median_bracket: medianBracket,
    expected_wins: {
      value: expectedWins,
      basis: completeTailCoverage ? 'observed tail-sum' : 'not reported',
      reason: completeTailCoverage
        ? 'All 17 tail thresholds are observed after de-vigging and monotonicity adjustment.'
        : `Only ${thresholdCount} of 17 tail thresholds are observed; the snapshot does not support an expected-win estimate.`,
    },
    coverage: {
      status: completeTailCoverage ? 'complete' : 'insufficient-for-expected-wins',
      label: coverageLabel,
      confidence,
      threshold_count: thresholdCount,
      paired_quote_count: quotes.length,
      source_book_count: new Set(quotes.map(quote => quote.book_slug)).size,
      full_same_book_alternate_ladder_available: false,
    },
    price_adjusted_order_index: round(priceAdjustedOrderIndex(primaryThreshold.line, primaryProbability)),
    price_adjusted_market_rank: null,
  };
}

const ordered = Object.entries(teams).toSorted(([, left], [, right]) =>
  right.price_adjusted_order_index - left.price_adjusted_order_index || left.team_name.localeCompare(right.team_name));
for (let index = 0; index < ordered.length;) {
  let endIndex = index;
  while (endIndex + 1 < ordered.length && Math.abs(ordered[endIndex + 1][1].price_adjusted_order_index - ordered[index][1].price_adjusted_order_index) < 1e-9) endIndex += 1;
  const averageRank = (index + 1 + endIndex + 1) / 2;
  for (let rankIndex = index; rankIndex <= endIndex; rankIndex += 1) ordered[rankIndex][1].price_adjusted_market_rank = averageRank;
  index = endIndex + 1;
}

const output = {
  schema_version: 2,
  season: 2026,
  season_games: 17,
  captured_at: capturedAt,
  timezone: 'America/New_York',
  source: {
    label: 'Outrights NFL Win Totals board',
    url: sourceUrl,
    source_market_updated_at: null,
    update_note: 'The publisher says books are polled every few minutes, but the rendered board does not expose a per-quote update timestamp. Capture time is authoritative for this snapshot.',
    raw_snapshot_sha256: createHash('sha256').update(html).digest('hex'),
    raw_snapshot_bytes: Buffer.byteLength(html),
    books: [...new Set(Object.values(teams).flatMap(team => team.quotes.map(quote => quote.book)))],
  },
  official_crosscheck: {
    label: 'BetMGM 2026 NFL win totals table',
    url: 'https://sports.betmgm.com/en/blog/nfl/nfl-over-under-wins-2026-win-totals-all-32-teams-bm16/',
    published_at: '2026-08-12T15:06:00-04:00',
    retrieved_at: '2026-08-23',
    raw_snapshot_sha256: '0c023863db5823fd319473e93a85aaa0a65b338593252311307db891582a0111',
    use: 'Pairing and sign-format cross-check only; its older prices are not mixed into the captured consensus.',
  },
  methodology: {
    probability: 'American odds are converted to raw implied probabilities; each same-book Over/Under pair is normalized proportionally to remove two-way hold.',
    consensus: 'At each threshold, the median of independently de-vigged same-book probabilities is used. Prices are never paired across books.',
    monotonicity: 'Observed tail probabilities are audited in threshold order and repaired only when necessary with weighted non-increasing isotonic regression. Point weights reward more paired books and lower-hold quotes.',
    order_index: 'For ordinal ranking only, index = posted half-win line + no-vig Over probability - 0.5. It stays within one-half win of the posted line and is not an expected-win estimate.',
    expectation: 'Expected wins are reported only with all 17 P(W >= k) tails observed. Sparse boards show an observed 50% bound/bracket and no expected-win value.',
  },
  audit: {
    teams_expected: 32,
    teams_observed: Object.keys(teams).length,
    teams_with_paired_primary_quote: Object.values(teams).filter(team => team.primary.over_odds && team.primary.under_odds).length,
    teams_with_multiple_thresholds: Object.values(teams).filter(team => team.coverage.threshold_count > 1).length,
    teams_with_full_expected_win_coverage: Object.values(teams).filter(team => team.expected_wins.value !== null).length,
    monotonicity_violations_before: Object.values(teams).reduce((sum, team) => sum + team.monotonicity_audit.violations_before_isotonic, 0),
    monotonicity_points_adjusted: Object.values(teams).reduce((sum, team) => sum + team.monotonicity_audit.points_adjusted, 0),
    all_curves_monotone_after: Object.values(teams).every(team => team.monotonicity_audit.monotone_after_isotonic),
  },
  teams,
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
