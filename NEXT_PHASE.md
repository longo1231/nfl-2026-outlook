# Completed phase: full Kalshi ladders, weighted podcast comparison, and scanner

Status: implemented through 2026-08-24; publication details are finalized in `CHECKPOINT.md`.

## Outcome

The sparse sportsbook board remains a timestamped, same-book paired and de-vigged input to the cross-market scan. Complete Kalshi team-win ladders supply the coverage-supported expected-win estimates, 0–17 team-profile densities, market ranking, conference/division totals, and exact-threshold comparisons. A dedicated Analysis vs Market tab now compares an adjustable, explicitly weighted podcast profile with all 17 Kalshi tails and houses the visibly separate market-versus-market scanner. The sanitized report remains a self-contained `docs/index.html`; the owner-only Sites v1 remains frozen and privately preserved.

## Podcast-profile contract

- Convert each exact 1–32 unit rank to a 0–100 strength percentile.
- Apply provisional importance points of QB 40, Coaching 25, Offensive Line 20, and Skill Position 15, normalized to 100%.
- Expose every weight and rationale, provide an equal-weight sensitivity control, and never call the profile a win forecast or fair probability.
- At every selectable threshold `k=1..17`, compare weighted profile rank with Kalshi rank for `P(W >= k)`; positive tail gap means the podcast ordering is stronger.
- Show Kalshi E[W], `P(W <= 6)`, distribution standard deviation, selected-tail probability/rank, mean gap, and tail gap for all 32 teams.
- Register category evidence, source audit, default weight, and rationale together so defense or another complete episode automatically expands the UI and analysis without changing the scoring formula.

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
- `lib/profile-market.mjs` — category-weight normalization, weighted strength, score ranking, tail probability, and distribution moments
- `scripts/scan-kalshi-nfl.mjs` — public market collection plus optional read-only auth check
- `tests/kalshi-nfl.test.mjs` — authentication and market-model unit tests
- `site/app/data.ts` — sportsbook/Kalshi report adapter
- `site/app/page.tsx` — team densities, modeled wins, adjustable Podcast × Kalshi comparison, and separate scanner module
- `docs/index.html` — self-contained offline and Pages artifact

## Completion gates

- [x] All 32 teams have 17 Kalshi win tails.
- [x] Raw bid, ask, and midpoint evidence is retained; monotone adjusted curves are auditable.
- [x] Expected wins are calculated only from complete ladders and visibly labeled modeled.
- [x] Every team profile shows all 18 exact-win masses derived from adjacent monotone tails; the density sums to one and reproduces E[W].
- [x] The main market table centers the Kalshi distribution; sportsbook median/de-vig fields are confined to the cross-market scanner and methodology.
- [x] Win Markets contains only Kalshi distribution and aggregate material; the scanner lives on Analysis vs Market.
- [x] Podcast profile importance is explicit and adjustable; equal weighting remains a sensitivity reference rather than the default claim.
- [x] All 17 Kalshi tails can be compared with the weighted profile across all 32 teams.
- [x] Category registration carries source audit, weight, and rationale and is tested with an added defense category.
- [x] Conference and division totals derive from the same team curves.
- [x] Scanner comparisons use executable asks and exact sportsbook thresholds.
- [x] Filters, timestamps, fees/slippage caveat, and available size are visible.
- [x] Authentication is read-only and snapshots retain no credential, key path, or account response.
- [x] Unit, lint, type, build, offline, mobile, accessibility, and privacy checks pass.
- [x] The prior Sites v1 remains untouched and private.
- [x] Exact published report artifact commit and deployed GitHub Pages verification are recorded in `CHECKPOINT.md`.

## Next content phase

Add the defensive-ranking episode when available. Preserve and hash it privately, reconcile its exact 1–32 order, register it with a disclosed provisional weight and rationale, rerun weighted/equal sensitivity, take fresh append-only sportsbook and Kalshi snapshots, recompute the full tail-disagreement view, rebuild `docs/index.html`, repeat privacy/browser QA, and publish a new Pages commit.
