# Completed phase: full Kalshi ladders, group totals, and scanner

Status: implemented on 2026-08-23; publication details are finalized in `CHECKPOINT.md`.

## Outcome

The sparse sportsbook board remains a timestamped, same-book paired and de-vigged reference. Complete Kalshi team-win ladders now supply the coverage-supported expected-win estimates, market ranking, conference/division totals, and exact-threshold cross-market scan. The sanitized report remains a self-contained `docs/index.html`; the owner-only Sites v1 remains frozen and privately preserved.

## Exact market evidence

Sportsbook snapshot:

- Board: https://www.outrights.io/nfl/win-totals-odds
- Capture: `2026-08-23T18:41:26-04:00`
- File: `data/markets/2026-08-23T184126-0400-paired-win-totals.json`
- Raw page SHA-256: `5c82d4410db707c0e22e9bd6dd206adceca3a08872d33f2378e1ddccb7b7e346`
- Coverage: 191 paired quotes across six books, 32/32 primary thresholds, 19 teams with a second threshold

Kalshi snapshot:

- Official series: `KXNFLWINS`
- Public markets endpoint: https://external-api.kalshi.com/trade-api/v2/markets?series_ticker=KXNFLWINS&status=open&limit=1000
- API reference: https://docs.kalshi.com/api-reference/market/get-markets
- Authentication reference: https://docs.kalshi.com/getting_started/quick_start_authenticated_requests
- Capture: `2026-08-23T23:21:41.768Z` (`2026-08-23T19:21:41.768-04:00`)
- File: `data/markets/20260823T232141.768Z-kalshi-nfl-win-ladders.json`
- Coverage: 544 open current-season contracts, 32 teams, all 17 tails for every team
- Read-only authentication check: passed at `/trade-api/v2/account/limits`; no account response was persisted

The two snapshots were captured about 40 minutes apart. Every comparison remains tied to both timestamps; no line is represented as simultaneous or current after capture.

## Implemented method

At each sportsbook half-win threshold, same-book Over and Under prices are converted to raw implied probabilities and normalized proportionally. Cross-book consensus is the median of independently de-vigged pairs; opposite sides from different books are never combined.

For each Kalshi team and threshold `k=1..17`:

1. Preserve executable Yes bid and ask prices and displayed size.
2. Form the midpoint and weight it by inverse bid/ask spread.
3. Audit raw midpoint tails for non-increasing order.
4. Project bid, ask, and midpoint curves separately with weighted non-increasing isotonic regression.
5. Calculate modeled expected wins only because all 17 tails exist:

```text
E[W] = sum from k=1 to 17 of P(W >= k)
```

The 32 raw midpoint curves contained 67 order violations; 165 midpoint observations moved during isotonic projection; all curves passed afterward. Kalshi expected wins are modeled from observed prices, not directly quoted expected-win contracts.

League, conference, and division midpoint totals sum team midpoint estimates. Their displayed lower and upper brackets sum the monotone bid and ask curves. These are marginal market-width bounds, not statistical confidence intervals or a jointly executable portfolio guarantee. The league midpoint is 268.577 against the 272-game regular-season ceiling; the residual is a useful calibration audit, not a forced normalization target.

## Scanner contract

At sportsbook-observed thresholds, the scanner compares the paired, de-vigged sportsbook probability with the executable Kalshi ask on both Yes and No. It retains rows only when:

- pre-fee edge is at least 5¢;
- Kalshi bid/ask spread is at most 12¢; and
- top-of-book size is available.

The snapshot contains 102 side comparisons and eight passing candidates. Edge excludes Kalshi fees and slippage; timestamp mismatch and price movement can erase it. Results are research candidates, never bet recommendations or instructions.

## Implementation paths

- `data/nfl/teams.json` — canonical team and Kalshi-code registry
- `lib/kalshi-auth.mjs` — private environment parsing and RSA-PSS signing
- `lib/kalshi-nfl.mjs` — curve, expectation, aggregate, ranking, and comparison logic
- `scripts/scan-kalshi-nfl.mjs` — public market collection plus optional read-only auth check
- `tests/kalshi-nfl.test.mjs` — authentication and market-model unit tests
- `site/app/data.ts` — sportsbook/Kalshi report adapter
- `site/app/page.tsx` — modeled wins, aggregate totals, and candidate board
- `docs/index.html` — self-contained offline and Pages artifact

## Completion gates

- [x] All 32 teams have 17 Kalshi win tails.
- [x] Raw bid, ask, and midpoint evidence is retained; monotone adjusted curves are auditable.
- [x] Expected wins are calculated only from complete ladders and visibly labeled modeled.
- [x] Conference and division totals derive from the same team curves.
- [x] Scanner comparisons use executable asks and exact sportsbook thresholds.
- [x] Filters, timestamps, fees/slippage caveat, and available size are visible.
- [x] Authentication is read-only and snapshots retain no credential, key path, or account response.
- [x] Unit, lint, type, build, offline, mobile, accessibility, and privacy checks pass.
- [x] The prior Sites v1 remains untouched and private.
- [x] Exact published report artifact commit and deployed GitHub Pages verification are recorded in `CHECKPOINT.md`.

## Next content phase

Add the defensive-ranking episode when available. Preserve and hash it privately, reconcile its exact 1–32 order, extend the evidence model, rerun the now-five-category audit, take fresh append-only sportsbook and Kalshi snapshots, recompute the Action average and market disagreement view, rebuild `docs/index.html`, repeat privacy/browser QA, and publish a new Pages commit.
