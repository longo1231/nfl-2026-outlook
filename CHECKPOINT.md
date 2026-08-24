# 2026 NFL Outlook Field Guide — checkpoint

## Objective

Maintain an evidence-complete, extensible study report from Action Network's 2026 NFL unit-ranking podcasts and compare the inputs with timestamped paired sportsbook prices and complete Kalshi team-win distributions.

## Current edition

- Edition: 3
- Report build date: 2026-08-24
- Content and market snapshots through: 2026-08-23
- Public artifact: `docs/index.html`
- Published report artifact commit: `94c64a2594566d228f687abbd18cbd6c85a863e1`
- GitHub Pages URL: https://longo1231.github.io/nfl-2026-outlook/
- Prior published Edition 3 distribution artifact commit: `82094d10ca1ae3f525ef8258fbd9f754451dae2a`
- Prior published Edition 3 market artifact commit: `a416fa4494889b924c607e2f4c53df16964587e7`
- Prior published Edition 2 artifact commit: `5d512fd1bc39c6f143fe17dbd589abf4686c29b6`
- Legacy edition: the owner-only Sites v1 remains frozen and preserved privately; it was not modified or deleted

## Locked decisions

- “Upcoming season” means the 2026 NFL season.
- Private-library ingestion is read-only; no source items were moved, tagged, edited, marked read, highlighted, or annotated.
- Source opinion and Field Guide synthesis remain visibly separate.
- The default podcast profile converts exact ranks to strength percentiles and applies provisional importance points of QB 40, Coaching 25, Offensive Line 20, and Skill Position 15. Weights are visible, adjustable, normalized to 100%, and are not learned forecast coefficients.
- Equal weighting remains a sensitivity reference; the report shows how many teams move at least five ranks when importance is removed.
- Category evidence, source audit, weight, and rationale share one registry. Defense or another complete 1–32 episode expands navigation, profiles, controls, scoring, and source QA without changing the formula.
- Podcast × Kalshi tail gaps compare ordinal league ranks at each threshold; they are not podcast-implied probabilities, betting edges, or recommendations.
- Every sportsbook probability comes from a same-book paired Over/Under quote. Each pair is de-vigged independently before same-threshold consensus.
- Complete Kalshi `KXNFLWINS` ladders supply the expected-win model and market rank. Midpoint, bid, and ask tails are projected separately to non-increasing order.
- Kalshi E[W] is the 17-tail sum of the monotone midpoint curve. It is modeled from market prices, not a directly observed expected-win quote.
- Exact-win density uses adjacent monotone midpoint differences for `W=0..17`. It must be nonnegative, sum to one, and reproduce E[W]; it is derived rather than an exact-win contract quote.
- Team profiles and the main market table center the complete Kalshi distribution. Sportsbook line, de-vig, and median-bracket fields remain supporting scanner/methodology inputs rather than the primary market presentation.
- Conference/division brackets sum marginal bid and ask curves. They are market-width bounds, not confidence intervals or joint portfolio guarantees.
- Scanner rows compare exact sportsbook thresholds with the executable Kalshi ask for Yes or No. Displayed edge is pre-fee and excludes slippage.
- Win Markets contains the Kalshi distribution view. Analysis vs Market contains two visibly separate modules: Podcast × Kalshi and the market-versus-market scanner.
- Betting data is a timestamped research input, not a standings record, recommendation, or instruction to trade.
- Private provenance and archived v1 metadata remain ignored under `.private/`.

## Exact public sources

Editorial publisher transcripts:

- Quarterbacks: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/4e657898-f2f9-4a05-9cb6-e5a27f8c3cf2/transcript
- Coaching staffs: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/536e0274-0383-4b97-904b-986237b1b6d8/transcript
- Offensive lines: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/736ccaf1-f5e8-4b45-813f-cc8e25075f74/transcript
- Skill positions: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/98f3433e-7487-4c23-87ee-9bef34eaa4dc/transcript

Sportsbook market source:

- Primary paired board: https://www.outrights.io/nfl/win-totals-odds
- Captured: `2026-08-23T18:41:26-04:00`
- Snapshot: `data/markets/2026-08-23T184126-0400-paired-win-totals.json`
- Captured page SHA-256: `5c82d4410db707c0e22e9bd6dd206adceca3a08872d33f2378e1ddccb7b7e346`
- Official pairing cross-check: https://sports.betmgm.com/en/blog/nfl/nfl-over-under-wins-2026-win-totals-all-32-teams-bm16/
- Cross-check published: `2026-08-12T15:06:00-04:00`; it was not mixed into the newer prices

Kalshi market source:

- Series: `KXNFLWINS`; current-season event prefix `KXNFLWINS-27`
- Official markets endpoint: https://external-api.kalshi.com/trade-api/v2/markets?series_ticker=KXNFLWINS&status=open&limit=1000
- Markets API reference: https://docs.kalshi.com/api-reference/market/get-markets
- Authentication reference: https://docs.kalshi.com/getting_started/quick_start_authenticated_requests
- Account-limits reference used for read-only verification: https://docs.kalshi.com/api-reference/account/get-account-api-limits
- Captured: `2026-08-23T23:21:41.768Z` (`2026-08-23T19:21:41.768-04:00`)
- Snapshot: `data/markets/20260823T232141.768Z-kalshi-nfl-win-ladders.json`
- Authentication verified: yes; account response persisted: no

Exact transcript hashes and counts are in `data/sources/manifest.json`. Private-library identifiers, raw snapshots, credentials, private-key paths, and account data remain local and ignored.

## Completed implementation

- Preserved all earlier market snapshots; the scanner refuses to overwrite an existing output.
- Added a canonical 32-team registry with conference, division, and Kalshi codes.
- Reused the established private environment contract (`KALSHI_API_KEY_ID`, `KALSHI_PRIVATE_KEY_PATH`) without copying any credential or path into this repository.
- Implemented official Kalshi RSA-PSS/SHA-256 request signing and a read-only connection check.
- Collected 544 open team-win contracts and built a complete 17-tail curve for every team.
- Implemented separate monotone bid, ask, and inverse-spread-weighted midpoint curves; expected-win estimates; ranks; group totals; and exact-threshold executable-side comparisons.
- Replaced the sportsbook ordinal market rank in the matrix, profiles, markets, and synthesis with the coverage-supported Kalshi modeled expected-win rank. The sparse sportsbook board remains visible as independent evidence.
- Added league, conference, and division total-win cards plus a timestamped candidate table.
- Added a responsive 18-bar exact-win density to every team profile with expected-win marker, mode, market rank, coverage, spread, and tail-sum range.
- Simplified the division market tables to Kalshi E[W], distribution mode, peak probability, spread, coverage, and profile links; removed the redundant sportsbook median/de-vig columns.
- Replaced the unqualified equal-rank average in primary synthesis with a transparent weighted strength profile and retained equal weight as an interactive sensitivity reference.
- Added a dedicated Analysis vs Market tab with adjustable category importance, all 17 selectable Kalshi tails, 32-team mean/floor/ceiling/volatility comparisons, and source-linked evidence navigation.
- Moved the cross-market scanner out of Win Markets and into its own clearly labeled market-versus-market module on Analysis vs Market.
- Refactored categories into an extensible registry that generates navigation, profiles, weights, analysis, and source QA; unit tests cover adding defense without a scoring-formula change.
- Regenerated the self-contained offline `docs/index.html`; no server or external local asset is required.
- Kept the frozen owner-only Sites v1 unchanged.

## Current snapshot audit

- Kalshi open/current-season contracts: 544/544
- Teams represented: 32/32
- Complete 17-tail ladders: 32/32
- Raw midpoint monotonicity violations: 67
- Midpoint observations adjusted by isotonic projection: 165
- All bid, ask, and midpoint curves monotone after audit: yes
- Exact sportsbook-side comparisons: 102
- Passing scanner candidates: 8 at ≥5¢ pre-fee edge, ≤12¢ spread, and available top-of-book size
- League midpoint: 268.577 wins; marginal bid/ask sum: 246.067–292.926; 272-game ceiling residual: −3.423
- AFC midpoint: 131.153; NFC midpoint: 137.424
- Division midpoints: AFC East 29.625, AFC North 34.153, AFC South 33.291, AFC West 34.084, NFC East 34.178, NFC North 37.702, NFC South 30.080, NFC West 35.464
- Default Podcast × Kalshi threshold: at least 11 wins; 32/32 teams compared
- Weight sensitivity: 2 teams move at least five profile ranks between the 40/25/20/15 prior and equal weighting
- Largest default selected-tail disagreement: 16 rank places (Detroit; Kalshi 11+ tail stronger than weighted podcast profile)

The sportsbook and Kalshi snapshots are about 40 minutes apart. The eight rows are capture-time research candidates only; fees, slippage, latency, and subsequent price movement can remove the displayed edge.

## QA results

- Content coverage: 128/128 team-category cells; 0 missing; 0 duplicates
- Node tests: 14 passed, 0 failed (sportsbook math, Kalshi/auth/aggregate/scanner, category weighting/extensibility, and tail-shape tests)
- Distribution audit: 32/32 teams have 18 nonnegative masses; maximum sum error `2.22e-16`; maximum density-mean versus stored E[W] difference `0.000476` wins from display rounding
- ESLint: passed
- TypeScript check: passed
- Vite standalone production build: passed; one non-blocking >500 kB inline-bundle warning because the public snapshot is embedded
- Standalone HTML: self-contained; no external local assets
- Offline desktop: passed at 1440×1000; Analysis vs Market rendered four weight controls, 17 tail choices, 32 comparison rows, and eight scanner candidates; Win Markets contained no scanner; no document overflow or browser errors
- Offline mobile: passed at 390×844; no document overflow; four weight controls stacked cleanly; the 364→1180 px analysis table and 364→730 px scanner remained contained and keyboard focusable
- Analysis interactions: equal weighting changed all normalized weights to 25% and reduced the ≥5-rank sensitivity count to zero; restore returned 40/25/20/15; selecting 13 wins updated the table tail and preserved 32 rows; evidence links opened the matching team density
- New-interface accessibility: semantic controls were browser-addressable by role/name; sampled foreground/background contrast ratios were 6.12–7.77:1; browser console had no warnings or errors
- Conference filter: AFC reduced eight division totals and tables to four
- Public-tree privacy scan: passed; no absolute local path, private-key material, configured secret, private-library URL/ID, account/trading payload, or personal email matched
- Dependency audit: 0 vulnerabilities
- GitHub Pages build: passed from `main:/docs` for artifact commit `94c64a2594566d228f687abbd18cbd6c85a863e1`; HTTPS URL returned Edition 3
- Deployed desktop: passed at 1440×1000; four default weights, 17 tail choices, 32 comparison rows, two ≥5-rank sensitivity movers, and eight separate scanner candidates rendered with no document overflow or browser errors
- Deployed mobile: passed at 390×844; no document overflow; the 364→1180 px analysis table and 364→730 px scanner scroll remained contained; equal-weight, restore, threshold selection, and Win Markets separation behaved correctly
- Deployed accessibility: all new controls remained semantically named and keyboard-addressable; sampled contrast remained at least 6.12:1; no console warnings or errors
- Deployment verified: `2026-08-24T15:29:32Z` (`2026-08-24T11:29:32-04:00`)

## Blockers

None.

## Next action

Make the defensive-ranking episode the next content update. Preserve its source read-only, add the exact 1–32 evidence list, choose and disclose its provisional importance, rerun weighted/equal sensitivity and all 17 tail gaps, and take new append-only sportsbook and Kalshi snapshots before rebuilding and publishing.
