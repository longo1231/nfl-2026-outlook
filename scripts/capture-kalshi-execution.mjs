import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import teamRegistry from '../data/nfl/teams.json' with { type: 'json' };
import {
  buildKalshiDiagnostic,
  calculateKalshiBuyExecution,
  normalizeKalshiOrderbook,
  quoteMovement,
} from '../lib/kalshi-execution.mjs';
import { buildKalshiTeamCurve, buildWinAggregates, rankExpectedWins } from '../lib/kalshi-nfl.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'https://external-api.kalshi.com';
const API_ROOT = '/trade-api/v2';
const readJson = async path => JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const compactTimestamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace('.000', '');
const addSeconds = (value, seconds) => new Date(new Date(value).getTime() + seconds * 1000).toISOString();
const round = (value, digits = 6) => value === null ? null : Number(value.toFixed(digits));

function parseArgs(argv) {
  const options = { season: 2026, series: 'KXNFLWINS', output: null, forecast: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--season') options.season = Number(value);
    else if (flag === '--series') options.series = value;
    else if (flag === '--output') options.output = value;
    else if (flag === '--forecast') options.forecast = value;
    else if (flag === '--help') {
      console.log('Usage: node scripts/capture-kalshi-execution.mjs [--season 2026] [--series KXNFLWINS] [--forecast PATH] [--output PATH]');
      process.exit(0);
    } else throw new Error(`Unknown or incomplete argument: ${flag}`);
    index += 1;
  }
  if (!Number.isInteger(options.season) || options.season < 2000) throw new TypeError('Season must be a valid integer');
  return options;
}

async function fetchResponse(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Kalshi request failed (${response.status}) for ${url}`);
  return response;
}

async function fetchJson(url) {
  return (await fetchResponse(url)).json();
}

async function fetchOpenMarkets(series) {
  const markets = [];
  let cursor = null;
  for (let page = 0; page < 10; page += 1) {
    const url = new URL(`${HOST}${API_ROOT}/markets`);
    url.searchParams.set('series_ticker', series);
    url.searchParams.set('status', 'open');
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);
    const payload = await fetchJson(url);
    markets.push(...(payload.markets ?? []));
    cursor = payload.cursor;
    if (!cursor) return markets;
  }
  throw new Error('Kalshi market pagination exceeded the 10-page safety cap');
}

async function fetchOrderbooks(tickers) {
  const batches = [];
  for (let index = 0; index < tickers.length; index += 100) batches.push(tickers.slice(index, index + 100));
  const responses = await Promise.all(batches.map(async batch => {
    const url = new URL(`${HOST}${API_ROOT}/markets/orderbooks`);
    batch.forEach(ticker => url.searchParams.append('tickers', ticker));
    return fetchJson(url);
  }));
  return responses.flatMap(response => response.orderbooks ?? []);
}

async function snapshotPublicSource(url, path) {
  const bytes = Buffer.from(await (await fetchResponse(url)).arrayBuffer());
  const hash = sha256(bytes);
  const outputPath = resolve(ROOT, path);
  await mkdir(dirname(outputPath), { recursive: true });
  try {
    const existing = await readFile(outputPath);
    if (sha256(existing) !== hash) throw new Error(`Refusing to overwrite changed canonical source snapshot: ${path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(outputPath, bytes, { flag: 'wx' });
  }
  return { path, sha256: hash, bytes: bytes.length, source_url: url };
}

async function latestPriorExecution() {
  const files = (await readdir(resolve(ROOT, 'data/markets')))
    .filter(file => file.endsWith('-kalshi-nfl-execution.json'))
    .toSorted()
    .reverse();
  if (files.length === 0) return null;
  return readJson(`data/markets/${files[0]}`);
}

const options = parseArgs(process.argv.slice(2));
const [policy, feeSchedule, freshnessPolicy, currentManifest, prior] = await Promise.all([
  readJson('config/market-policy.json'),
  readJson('config/kalshi-fee-schedule.json'),
  readJson('config/freshness-policy.json'),
  readJson('data/current/public-manifest.json'),
  latestPriorExecution(),
]);
if (policy.policy_id !== 'market-policy-2026.2' || policy.venue_scope.join(',') !== 'kalshi') throw new Error('Kalshi capture requires the active Kalshi-only market policy');
if (feeSchedule.fee_schedule_id !== policy.fee_schedule_id) throw new Error('Market policy and fee schedule IDs do not match');
const forecastPath = options.forecast ?? currentManifest.forecast.path;
if (!forecastPath) throw new Error('Kalshi diagnostics require an explicit active forecast version');
const forecast = await readJson(forecastPath);

const captureStartedAt = new Date().toISOString();
const [seriesPayload, feeChangesPayload, rawMarkets] = await Promise.all([
  fetchJson(`${HOST}${API_ROOT}/series/${options.series}`),
  fetchJson(`${HOST}${API_ROOT}/series/fee_changes?series_ticker=${options.series}&show_historical=true`),
  fetchOpenMarkets(options.series),
]);
const series = seriesPayload.series;
if (series.ticker !== options.series || series.fee_type !== feeSchedule.series_fee_type || Number(series.fee_multiplier) !== feeSchedule.series_fee_multiplier) {
  throw new Error('Live Kalshi series fee metadata does not match the versioned fee schedule');
}
if ((feeChangesPayload.series_fee_change_arr ?? []).length > 0) throw new Error('KXNFLWINS has fee changes that are not represented by the active fee schedule');

const eventPrefix = `${options.series}-${String(options.season + 1).slice(-2)}`;
const currentMarkets = rawMarkets.filter(market => market.event_ticker?.startsWith(eventPrefix));
if (currentMarkets.length !== 544) throw new Error(`Expected 544 open current-season contracts; found ${currentMarkets.length}`);
const orderbookPayloads = await fetchOrderbooks(currentMarkets.map(market => market.ticker));
const capturedAt = new Date().toISOString();
if (orderbookPayloads.length !== currentMarkets.length) throw new Error(`Expected ${currentMarkets.length} order books; found ${orderbookPayloads.length}`);
const snapshotId = `kalshi-exec-${compactTimestamp(capturedAt)}`;
const staleAfter = addSeconds(capturedAt, freshnessPolicy.market.capture_time_only_action_ttl_seconds);

const contractDate = new Date(series.last_updated_ts).toISOString().slice(0, 10);
const [feeSource, contractSource] = await Promise.all([
  snapshotPublicSource(feeSchedule.source_url, feeSchedule.source_snapshot_path),
  snapshotPublicSource(series.contract_terms_url, `data/markets/sources/kalshi-nflwins-contract-terms-${contractDate}.pdf`),
]);

const orderbookByTicker = new Map(orderbookPayloads.map(entry => [entry.ticker, entry.orderbook_fp]));
const marketByTicker = new Map(currentMarkets.map(market => [market.ticker, market]));
const priorQuoteByKey = new Map((prior?.quotes ?? []).map(quote => [`${quote.contract_id}:${quote.side}`, quote]));
const priorDiagnosticByKey = new Map((prior?.diagnostics ?? []).map(diagnostic => [`${diagnostic.contract_id}:${diagnostic.side}`, diagnostic]));
const forecastByTeam = new Map(forecast.teams.map(team => [team.team_id, team]));
const registryByKalshiCode = Object.fromEntries(teamRegistry.map(team => [team.kalshi_code, team]));
const grouped = Map.groupBy(currentMarkets, market => market.event_ticker.slice(eventPrefix.length));
const teamCurves = {};
for (const [kalshiCode, markets] of grouped) {
  const team = registryByKalshiCode[kalshiCode];
  if (!team) throw new Error(`Unmapped Kalshi NFL team code: ${kalshiCode}`);
  teamCurves[team.abbr] = { team_name: team.name, event_ticker: markets[0].event_ticker, ...buildKalshiTeamCurve(markets) };
}
if (Object.keys(teamCurves).length !== 32) throw new Error(`Expected 32 team ladders; found ${Object.keys(teamCurves).length}`);
rankExpectedWins(teamCurves);
const aggregates = buildWinAggregates(teamCurves, teamRegistry);

const quotes = [];
const normalizedOrderbooks = [];
const contracts = [];
let topOfBookMismatches = 0;
for (const market of currentMarkets.toSorted((left, right) => left.ticker.localeCompare(right.ticker))) {
  const teamCode = market.event_ticker.slice(eventPrefix.length);
  const team = registryByKalshiCode[teamCode];
  const normalized = normalizeKalshiOrderbook({ orderbook_fp: orderbookByTicker.get(market.ticker) }, market);
  normalizedOrderbooks.push({ ticker: market.ticker, yes_bids: normalized.yes_bids, no_bids: normalized.no_bids });
  const liveYesBid = normalized.yes_bids[0]?.price ?? null;
  const liveYesAsk = normalized.yes.executable_asks[0]?.price ?? null;
  if (liveYesBid !== null && Math.abs(liveYesBid - Number(market.yes_bid_dollars)) > 1e-9) topOfBookMismatches += 1;
  if (liveYesAsk !== null && Math.abs(liveYesAsk - Number(market.yes_ask_dollars)) > 1e-9) topOfBookMismatches += 1;
  contracts.push({
    contract_id: market.ticker,
    event_ticker: market.event_ticker,
    team_id: team.abbr,
    wins_at_least: Number(market.floor_strike),
    title: market.title,
    strike_type: market.strike_type,
    primary_settlement_rule: market.rules_primary,
    settlement_sources: series.settlement_sources,
    close_time: market.close_time,
    status: market.status,
    price_level_structure: market.price_level_structure,
  });
  for (const side of ['yes', 'no']) {
    const sideBook = normalized[side];
    const quoteId = `qte-${snapshotId}-${market.ticker}-${side}`;
    const baseQuote = {
      quote_id: quoteId,
      snapshot_id: snapshotId,
      venue_id: 'kalshi',
      series_ticker: options.series,
      contract_id: market.ticker,
      team_id: team.abbr,
      market_type: 'regular-season-wins-tail',
      threshold: Number(market.floor_strike),
      side,
      bid: sideBook.bid,
      ask: sideBook.ask,
      bid_size: sideBook.bid_size,
      ask_size: sideBook.ask_size,
      spread: sideBook.spread,
      source_quote_at: null,
      captured_at: capturedAt,
      recorded_at: capturedAt,
      source_time_confidence: 'capture-time-only',
      fee_schedule_id: feeSchedule.fee_schedule_id,
      stale_after: staleAfter,
      status: 'active',
      executable_asks: sideBook.executable_asks,
      execution_scenarios: policy.market_data.reference_contract_counts.map(requestedContracts => calculateKalshiBuyExecution({
        asks: sideBook.executable_asks,
        requestedContracts,
        feeSchedule,
        roundingReserveDollars: policy.fee_rounding.maximum_unrebated_rounding_reserve_dollars,
      })),
    };
    baseQuote.movement = quoteMovement(baseQuote, priorQuoteByKey.get(`${market.ticker}:${side}`));
    quotes.push(baseQuote);
  }
}

const primaryCount = policy.market_data.primary_reference_contract_count;
const diagnostics = quotes.map(quote => {
  const execution = quote.execution_scenarios.find(scenario => scenario.requested_contracts === primaryCount);
  const forecastTeam = forecastByTeam.get(quote.team_id);
  return buildKalshiDiagnostic({
    snapshotId,
    quote,
    teamId: quote.team_id,
    winsAtLeast: quote.threshold,
    forecast: { ...forecastTeam, model_state: forecast.model_state, decision_eligible: forecast.decision_eligible, forecast_version_id: forecast.forecast_version_id },
    execution,
    policy,
    capturedAt,
    priorDiagnostic: priorDiagnosticByKey.get(`${quote.contract_id}:${quote.side}`) ?? null,
    priorCapturedAt: prior?.captured_at ?? null,
  });
}).toSorted((left, right) => (right.net_edge ?? -Infinity) - (left.net_edge ?? -Infinity) || left.contract_id.localeCompare(right.contract_id) || left.side.localeCompare(right.side));

const researchDiagnostics = diagnostics.filter(diagnostic => diagnostic.research_qualified);
const persistentDiagnostics = researchDiagnostics.filter(diagnostic => diagnostic.persistence.qualifying_captures >= policy.persistence.minimum_qualifying_captures);
const actionCandidates = diagnostics.filter(diagnostic => diagnostic.action_eligible);
if (forecast.model_state !== 'validated' && actionCandidates.length > 0) throw new Error('A provisional forecast produced an action-eligible Kalshi comparison');

const snapshot = {
  schema_version: 2,
  snapshot_id: snapshotId,
  season: options.season,
  captured_at_started: captureStartedAt,
  captured_at: capturedAt,
  stale_after: staleAfter,
  source: {
    venue_id: 'kalshi',
    label: 'Kalshi KXNFLWINS full order books',
    series_ticker: options.series,
    event_prefix: eventPrefix,
    market_api_url: `${HOST}${API_ROOT}/markets?series_ticker=${options.series}&status=open&limit=1000`,
    orderbook_api_url: `${HOST}${API_ROOT}/markets/orderbooks`,
    api_documentation: 'https://docs.kalshi.com/api-reference/market/get-multiple-market-orderbooks',
    authentication_required: false,
    account_data_requested: false,
    order_placement_enabled: false,
    capture_window_seconds: round((new Date(capturedAt) - new Date(captureStartedAt)) / 1000, 3),
    series: {
      title: series.title,
      category: series.category,
      fee_type: series.fee_type,
      fee_multiplier: Number(series.fee_multiplier),
      last_updated_ts: series.last_updated_ts,
      settlement_sources: series.settlement_sources,
      contract_terms_url: series.contract_terms_url,
      contract_source_snapshot: contractSource,
      fee_source_snapshot: feeSource,
      scheduled_fee_changes: feeChangesPayload.series_fee_change_arr ?? [],
    },
  },
  policy_version: policy.policy_id,
  fee_schedule_id: feeSchedule.fee_schedule_id,
  forecast_version_id: forecast.forecast_version_id,
  forecast_state: forecast.model_state,
  primary_reference_contract_count: primaryCount,
  methodology: {
    execution: 'YES asks are complements of NO bids and NO asks are complements of YES bids. Requested size consumes the derived ask ladder from best to worst without extrapolating beyond displayed depth.',
    fees: 'Quadratic taker fees are estimated by consumed price level and rounded to the published centicent increment. The conservative break-even adds one cent for unresolved pretrade balance-rounding and rebate uncertainty.',
    movement: 'Like-for-like ticker and side are compared with the immediately prior Phase 4 snapshot.',
    persistence: `A research-qualified side must repeat in at least ${policy.persistence.minimum_qualifying_captures} captures spaced ${policy.persistence.minimum_spacing_seconds}-${policy.persistence.maximum_spacing_seconds} seconds apart.`,
    forecast_boundary: 'The active forecast supplies diagnostic fair probabilities only. A provisional forecast blocks action eligibility regardless of apparent edge.',
  },
  audit: {
    open_markets_received: rawMarkets.length,
    current_season_contracts: currentMarkets.length,
    full_orderbooks: normalizedOrderbooks.length,
    normalized_quotes: quotes.length,
    teams: Object.keys(teamCurves).length,
    teams_with_all_17_tails: Object.values(teamCurves).filter(team => team.coverage.all_17_tails).length,
    top_of_book_mismatches: topOfBookMismatches,
    execution_scenarios: quotes.reduce((sum, quote) => sum + quote.execution_scenarios.length, 0),
    full_primary_size_quotes: quotes.filter(quote => quote.execution_scenarios.find(scenario => scenario.requested_contracts === primaryCount)?.full_fill).length,
    quotes_with_movement_history: quotes.filter(quote => quote.movement.prior_quote_id).length,
    research_qualified_diagnostics: researchDiagnostics.length,
    persistent_research_diagnostics: persistentDiagnostics.length,
    action_eligible_candidates: actionCandidates.length,
    all_curves_monotone_after: Object.values(teamCurves).every(team => team.monotonicity_audit.all_curves_monotone_after),
  },
  aggregates,
  teams: teamCurves,
  contracts,
  orderbooks: normalizedOrderbooks,
  quotes,
  diagnostics,
  research_diagnostic_ids: researchDiagnostics.map(diagnostic => diagnostic.comparison_id),
  persistent_diagnostic_ids: persistentDiagnostics.map(diagnostic => diagnostic.comparison_id),
  action_candidate_ids: actionCandidates.map(diagnostic => diagnostic.comparison_id),
  warnings: [
    ...(forecast.model_state === 'validated' ? [] : [`The active ${forecast.model_state} forecast is not decision eligible; every model-market row is diagnostic only.`]),
    'Quote time confidence is capture-time-only. Prices and displayed depth can change immediately after capture.',
    'Pretrade fee estimates include a conservative one-cent reserve because exact fill-level balance rounding and rebates are not known before execution.',
    'No Kalshi account, balance, position, order or fill data was requested or retained.',
  ],
};

const outputPath = resolve(options.output ?? `${ROOT}/data/markets/${compactTimestamp(capturedAt)}-kalshi-nfl-execution.json`);
try {
  await access(outputPath);
  throw new Error(`Refusing to overwrite existing execution snapshot: ${outputPath}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({
  snapshot_id: snapshotId,
  captured_at: capturedAt,
  output: basename(outputPath),
  contracts: snapshot.audit.current_season_contracts,
  orderbooks: snapshot.audit.full_orderbooks,
  quotes: snapshot.audit.normalized_quotes,
  full_primary_size_quotes: snapshot.audit.full_primary_size_quotes,
  research_diagnostics: snapshot.audit.research_qualified_diagnostics,
  persistent_diagnostics: snapshot.audit.persistent_research_diagnostics,
  action_candidates: snapshot.audit.action_eligible_candidates,
}, null, 2));
