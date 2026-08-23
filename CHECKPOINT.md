# 2026 NFL Outlook Field Guide — checkpoint

## Objective

Maintain an evidence-complete, extensible study report from Action Network's 2026 NFL unit-ranking podcasts and compare the inputs with timestamped, paired, price-adjusted win-total markets.

## Current edition

- Edition: 2
- Content and market date: 2026-08-23
- Public artifact: `docs/index.html`
- Publication commit: pending final publication
- GitHub Pages URL: pending final publication
- Legacy edition: the owner-only Sites v1 remains frozen and preserved privately; it was not modified or deleted

## Locked decisions

- “Upcoming season” means the 2026 NFL season.
- Private-library ingestion is read-only; no source items were moved, tagged, edited, marked read, highlighted, or annotated.
- Source opinion and Field Guide synthesis remain visibly separate.
- The Action input average is the equal-weight mean of the four available exact ranks and is not a win forecast.
- Betting data is a timestamped market expectation, not a standings record or recommendation.
- Ambiguous transcript names and claims are disclosed rather than silently reconstructed.
- Every market probability comes from a same-book paired Over/Under quote. Each pair is de-vigged independently before any same-threshold consensus calculation.
- Observed tail probabilities are audited for non-increasing order; weighted isotonic regression is available for violations and preserves raw values.
- Expected wins are shown only with complete 17-tail coverage. The current snapshot has no qualifying team, so the report shows observed 50% bounds and leaves E[W] blank.
- The synthesis market order uses a labeled ordinal index: half-win line + no-vig Over probability − 0.5. It is not represented as expected wins.
- Private provenance and archived v1 metadata remain ignored under `.private/`.

## Exact public sources

Editorial publisher transcripts:

- Quarterbacks: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/4e657898-f2f9-4a05-9cb6-e5a27f8c3cf2/transcript
- Coaching staffs: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/536e0274-0383-4b97-904b-986237b1b6d8/transcript
- Offensive lines: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/736ccaf1-f5e8-4b45-813f-cc8e25075f74/transcript
- Skill positions: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/98f3433e-7487-4c23-87ee-9bef34eaa4dc/transcript

Market sources:

- Primary paired board: https://www.outrights.io/nfl/win-totals-odds
- Captured: `2026-08-23T18:41:26-04:00`
- Captured page SHA-256: `5c82d4410db707c0e22e9bd6dd206adceca3a08872d33f2378e1ddccb7b7e346`
- Official pairing cross-check: https://sports.betmgm.com/en/blog/nfl/nfl-over-under-wins-2026-win-totals-all-32-teams-bm16/
- Cross-check published: `2026-08-12T15:06:00-04:00`; it was not mixed into the newer captured prices

Exact transcript hashes and counts are in the sanitized `data/sources/manifest.json`. Private-library identifiers and raw snapshots remain local and ignored.

## Completed implementation

- Preserved the prior one-sided market snapshot instead of overwriting it.
- Added `data/markets/2026-08-23T184126-0400-paired-win-totals.json` with 191 paired quotes across six books and 32 teams.
- Implemented American-odds conversion, proportional de-vigging, same-threshold median consensus, weighted non-increasing isotonic regression, probability-mass derivation, tail-sum expectation, median bounds, coverage labels, and price-adjusted ordering.
- Replaced the nominal-line-only market view and synthesis.
- Added a deterministic market parser/builder and six unit tests.
- Generated a self-contained offline `docs/index.html` with all report data, styles, and interactions inlined.
- Removed private-library URLs/IDs from the report source and public artifact.
- Preserved private source provenance and former Sites Git metadata under ignored `.private/`.

## QA results

- Content coverage: 128/128 team-category cells; 0 missing; 0 duplicates
- Paired primary market quotes: 32/32 teams
- Teams with multiple observed thresholds: 19
- Teams with complete expected-win coverage: 0; E[W] withheld for all teams
- Raw tail-curve monotonicity violations: 0
- Isotonic-adjusted points: 0
- Market-math tests: 6 passed, 0 failed
- Deterministic market regeneration: byte-identical to the committed snapshot
- ESLint: passed
- TypeScript check: passed
- Vite production build: passed
- Dependency audit: 0 vulnerabilities
- Standalone HTML build: passed; no external local assets
- Offline desktop browser: passed at 1440×1000; tabs and Win Markets interaction passed; no page or console errors
- Offline mobile browser: passed at 390×844; no document overflow; market cards scroll horizontally; conference filter and synthesis navigation passed
- Automated accessibility: 0 WCAG A/AA violations after the footer contrast fix; gradient-backed text remained manual-review-only
- Public staged-tree privacy scan: passed; ignored private/source/build paths absent from the index
- Deployed GitHub Pages verification: pending final publication

## Blockers

None.

## Next action

Publish the clean repository and GitHub Pages artifact, verify the deployed desktop/mobile page, then record the exact commit and URL here. After publication, the next content update is the defensive-ranking episode: preserve it read-only, add the exact 1–32 evidence list, rerun coverage, recompute the now-five-input Action average, capture a new paired market snapshot, regenerate the standalone HTML, and publish a new commit without overwriting prior market history.
