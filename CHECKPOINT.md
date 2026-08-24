# 2026 NFL Outlook Field Guide — checkpoint

## Objective

Maintain an evidence-complete, extensible study report from Action Network's 2026 NFL unit-ranking podcasts and compare the inputs with timestamped paired sportsbook prices and complete Kalshi team-win distributions.

## Current edition

- Edition: 3
- Content and market date: 2026-08-23
- Public artifact: `docs/index.html`
- Published report artifact commit: `82094d10ca1ae3f525ef8258fbd9f754451dae2a`
- GitHub Pages URL: https://longo1231.github.io/nfl-2026-outlook/
- Prior published Edition 3 market artifact commit: `a416fa4494889b924c607e2f4c53df16964587e7`
- Prior published Edition 2 artifact commit: `5d512fd1bc39c6f143fe17dbd589abf4686c29b6`
- Legacy edition: the owner-only Sites v1 remains frozen and preserved privately; it was not modified or deleted

## Locked decisions

- “Upcoming season” means the 2026 NFL season.
- Private-library ingestion is read-only; no source items were moved, tagged, edited, marked read, highlighted, or annotated.
- Source opinion and Field Guide synthesis remain visibly separate.
- The Action input average is the equal-weight mean of the four available exact ranks and is not a win forecast.
- Every sportsbook probability comes from a same-book paired Over/Under quote. Each pair is de-vigged independently before same-threshold consensus.
- Complete Kalshi `KXNFLWINS` ladders supply the expected-win model and market rank. Midpoint, bid, and ask tails are projected separately to non-increasing order.
- Kalshi E[W] is the 17-tail sum of the monotone midpoint curve. It is modeled from market prices, not a directly observed expected-win quote.
- Exact-win density uses adjacent monotone midpoint differences for `W=0..17`. It must be nonnegative, sum to one, and reproduce E[W]; it is derived rather than an exact-win contract quote.
- Team profiles and the main market table center the complete Kalshi distribution. Sportsbook line, de-vig, and median-bracket fields remain supporting scanner/methodology inputs rather than the primary market presentation.
- Conference/division brackets sum marginal bid and ask curves. They are market-width bounds, not confidence intervals or joint portfolio guarantees.
- Scanner rows compare exact sportsbook thresholds with the executable Kalshi ask for Yes or No. Displayed edge is pre-fee and excludes slippage.
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

The sportsbook and Kalshi snapshots are about 40 minutes apart. The eight rows are capture-time research candidates only; fees, slippage, latency, and subsequent price movement can remove the displayed edge.

## QA results

- Content coverage: 128/128 team-category cells; 0 missing; 0 duplicates
- Node tests: 11 passed, 0 failed (six sportsbook math plus five Kalshi/auth/aggregate/scanner tests)
- Distribution audit: 32/32 teams have 18 nonnegative masses; maximum sum error `2.22e-16`; maximum density-mean versus stored E[W] difference `0.000476` wins from display rounding
- ESLint: passed
- TypeScript check: passed
- Vite standalone production build: passed; one non-blocking >500 kB inline-bundle warning because the public snapshot is embedded
- Standalone HTML: self-contained; no external local assets
- Offline desktop: passed at 1440×1000; every selected profile rendered 18 exact-win bars and its E[W] marker; Win Markets rendered eight division totals, eight candidate rows, and eight simplified distribution tables; no document overflow or browser errors
- Offline mobile: passed at 390×844; 18-bar profiles fit without document overflow; 364→730 px candidate-board and 364→980 px division-table scrolling remained contained and keyboard focusable
- Conference filter: AFC reduced eight division totals and tables to four
- Automated accessibility: 0 WCAG A/AA violations; gradient-backed contrast remains manual-review-only and passed visual review
- Public-tree privacy scan: passed; no absolute local path, private-key material, configured secret, private-library URL/ID, account/trading payload, or personal email matched
- Dependency audit: 0 vulnerabilities
- GitHub Pages build: passed from `main:/docs` for artifact commit `82094d10ca1ae3f525ef8258fbd9f754451dae2a`; HTTPS URL returned Edition 3
- Deployed desktop: passed at 1440×1000; selected profile rendered all 18 exact-win outcomes, modeled E[W], mode, rank, coverage, spread, and bid/ask tail-sum range with no document overflow or browser errors
- Deployed mobile: passed at 390×844; no document overflow; the simplified nine-column market table contained its 364→980 px horizontal scroll; all 32 density links rendered; AFC reduced eight division totals/tables to four
- Deployed accessibility: 0 automated WCAG A/AA violations; gradient-backed contrast remained manual-review-only and passed visual review
- Deployment verified: `2026-08-24T01:22:35Z` (`2026-08-23T21:22:35-04:00`)

## Blockers

None.

## Next action

Make the defensive-ranking episode the next content update. Preserve its source read-only, add the exact 1–32 evidence list, recompute the five-input Action average, and take new append-only sportsbook and Kalshi snapshots before rebuilding and publishing.
