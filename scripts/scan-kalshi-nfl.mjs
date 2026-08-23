import { readFile, writeFile, access } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sportsbookSnapshot from '../data/markets/2026-08-23T184126-0400-paired-win-totals.json' with { type: 'json' };
import teamRegistry from '../data/nfl/teams.json' with { type: 'json' };
import { kalshiAuthHeaders, parseEnv } from '../lib/kalshi-auth.mjs';
import {
  buildBetComparisons,
  buildKalshiTeamCurve,
  buildWinAggregates,
  rankExpectedWins,
} from '../lib/kalshi-nfl.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'https://external-api.kalshi.com';
const API_ROOT = '/trade-api/v2';

function parseArgs(argv) {
  const options = {
    season: 2026,
    series: 'KXNFLWINS',
    minEdgeCents: 5,
    maxSpreadCents: 12,
    envFile: null,
    output: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--season') options.season = Number(value);
    else if (flag === '--series') options.series = value;
    else if (flag === '--min-edge-cents') options.minEdgeCents = Number(value);
    else if (flag === '--max-spread-cents') options.maxSpreadCents = Number(value);
    else if (flag === '--env-file') options.envFile = value;
    else if (flag === '--output') options.output = value;
    else if (flag === '--help') {
      console.log('Usage: node scripts/scan-kalshi-nfl.mjs [--env-file PATH] [--output PATH] [--min-edge-cents N] [--max-spread-cents N]');
      process.exit(0);
    } else throw new Error(`Unknown or incomplete argument: ${flag}`);
    index += 1;
  }
  if (!Number.isInteger(options.season) || !Number.isFinite(options.minEdgeCents) || !Number.isFinite(options.maxSpreadCents)) {
    throw new TypeError('Season and scanner thresholds must be numeric');
  }
  return options;
}

async function loadAuth(envFile) {
  let fileValues = {};
  let envBase = process.cwd();
  if (envFile) {
    const envPath = resolve(envFile);
    fileValues = parseEnv(await readFile(envPath, 'utf8'));
    envBase = dirname(envPath);
  }
  const keyId = process.env.KALSHI_API_KEY_ID || fileValues.KALSHI_API_KEY_ID;
  const configuredKeyPath = process.env.KALSHI_PRIVATE_KEY_PATH || fileValues.KALSHI_PRIVATE_KEY_PATH;
  if (!keyId && !configuredKeyPath) return null;
  if (!keyId || !configuredKeyPath) throw new Error('Kalshi auth requires both KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY_PATH');
  const privateKeyPath = isAbsolute(configuredKeyPath) ? configuredKeyPath : resolve(envBase, configuredKeyPath);
  await access(privateKeyPath);
  return { keyId, privateKeyPem: await readFile(privateKeyPath, 'utf8') };
}

async function verifyAuth(auth) {
  if (!auth) return { credentials_requested: false, verified: false, verification_endpoint: null, response_data_persisted: false };
  const path = `${API_ROOT}/account/limits`;
  const response = await fetch(`${HOST}${path}`, { headers: kalshiAuthHeaders({ ...auth, pathOrUrl: path }) });
  if (!response.ok) throw new Error(`Kalshi authentication check failed (${response.status})`);
  await response.json();
  return { credentials_requested: true, verified: true, verification_endpoint: '/account/limits', response_data_persisted: false };
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
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Kalshi market request failed (${response.status})`);
    const payload = await response.json();
    markets.push(...(payload.markets || []));
    cursor = payload.cursor;
    if (!cursor) return markets;
  }
  throw new Error('Kalshi market pagination exceeded the 10-page safety cap');
}

const options = parseArgs(process.argv.slice(2));
const capturedAt = new Date().toISOString();
const auth = await loadAuth(options.envFile);
const authStatus = await verifyAuth(auth);
const rawMarkets = await fetchOpenMarkets(options.series);
const eventPrefix = `${options.series}-${String(options.season + 1).slice(-2)}`;
const currentMarkets = rawMarkets.filter(market => market.event_ticker?.startsWith(eventPrefix));
const registryByKalshiCode = Object.fromEntries(teamRegistry.map(team => [team.kalshi_code, team]));
const grouped = Map.groupBy(currentMarkets, market => market.event_ticker.slice(eventPrefix.length));
const teamCurves = {};
for (const [kalshiCode, markets] of grouped) {
  const team = registryByKalshiCode[kalshiCode];
  if (!team) throw new Error(`Unmapped Kalshi NFL team code: ${kalshiCode}`);
  teamCurves[team.abbr] = {
    team_name: team.name,
    event_ticker: markets[0].event_ticker,
    ...buildKalshiTeamCurve(markets),
  };
}
if (Object.keys(teamCurves).length !== 32) throw new Error(`Expected 32 Kalshi NFL team ladders; found ${Object.keys(teamCurves).length}`);
rankExpectedWins(teamCurves);
const aggregates = buildWinAggregates(teamCurves, teamRegistry);
const scan = buildBetComparisons(teamCurves, sportsbookSnapshot, options);

const snapshot = {
  schema_version: 1,
  season: options.season,
  captured_at: capturedAt,
  source: {
    label: 'Kalshi NFL win-total series',
    series_ticker: options.series,
    api_url: `${HOST}${API_ROOT}/markets?series_ticker=${options.series}&status=open&limit=1000`,
    api_documentation: 'https://docs.kalshi.com/api-reference/market/get-markets',
    event_prefix: eventPrefix,
    authentication: authStatus,
  },
  methodology: {
    expected_wins: 'For each team, the midpoint of the executable Yes bid/ask at every P(W >= k), k=1..17, is weighted by inverse spread, projected to a non-increasing curve, and summed. This is a modeled midpoint estimate, not a directly observed expected-win quote.',
    bounds: 'Bid and ask tail curves are separately projected to non-increasing order and summed. Aggregate bounds are sums of marginal team bounds, not a joint portfolio guarantee.',
    scanner: 'At sportsbook-observed thresholds, the same-book paired and de-vigged sportsbook probability is compared with the executable Kalshi Yes or No ask. Reported edge is pre-fee and does not include slippage.',
  },
  filters: {
    min_pre_fee_edge_cents: options.minEdgeCents,
    max_kalshi_spread_cents: options.maxSpreadCents,
    require_available_top_of_book_size: true,
  },
  audit: {
    open_markets_received: rawMarkets.length,
    current_season_markets: currentMarkets.length,
    teams: Object.keys(teamCurves).length,
    teams_with_all_17_tails: Object.values(teamCurves).filter(team => team.coverage.all_17_tails).length,
    raw_midpoint_monotonicity_violations: Object.values(teamCurves).reduce((sum, team) => sum + team.monotonicity_audit.midpoint_violations_before, 0),
    isotonic_midpoint_points_adjusted: Object.values(teamCurves).reduce((sum, team) => sum + team.monotonicity_audit.midpoint_points_adjusted, 0),
    all_curves_monotone_after: Object.values(teamCurves).every(team => team.monotonicity_audit.all_curves_monotone_after),
    sportsbook_threshold_comparisons: scan.comparisons.length,
    candidates_passing_filters: scan.candidates.length,
  },
  aggregates,
  candidates: scan.candidates,
  comparisons: scan.comparisons,
  teams: teamCurves,
};

const safeTimestamp = capturedAt.replace(/[-:]/g, '').replace('.000', '');
const outputPath = resolve(options.output || `${ROOT}/data/markets/${safeTimestamp}-kalshi-nfl-win-ladders.json`);
try {
  await access(outputPath);
  throw new Error(`Refusing to overwrite existing market snapshot: ${outputPath}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(JSON.stringify({
  captured_at: capturedAt,
  authenticated: authStatus.verified,
  markets: currentMarkets.length,
  teams: Object.keys(teamCurves).length,
  complete_ladders: snapshot.audit.teams_with_all_17_tails,
  candidates: snapshot.audit.candidates_passing_filters,
  output: outputPath,
}, null, 2));
