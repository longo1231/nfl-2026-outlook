# 2026 NFL Outlook Field Guide — checkpoint

## Objective

Maintain an evidence-complete, eligibility-aware study report from 2026 NFL ranking and preview podcasts, then compare the scoring-eligible inputs with timestamped paired sportsbook prices and complete Kalshi team-win distributions without exposing private source material.

## Current edition

- Edition: 5
- Report build date: 2026-08-24
- Content and market snapshots through: 2026-08-24
- Public artifact: `docs/index.html`
- Edition 5 published report artifact commit: `d27aea0bd48409430e258133301ac28573dfca53`
- GitHub Pages URL: https://longo1231.github.io/nfl-2026-outlook/
- Prior Edition 4 report artifact commit: `b1be6fc3bc40abe333653b504a03d176b98062aa`
- Prior Edition 3 report artifact commit: `94c64a2594566d228f687abbd18cbd6c85a863e1`
- Legacy edition: the owner-only Sites v1 remains frozen and preserved privately; it was not modified or deleted

## Locked decisions

- “Upcoming season” means the 2026 NFL season.
- Private-library ingestion is read-only; no source items are moved, tagged, edited, marked read, highlighted, or annotated.
- Canonical sources are privately snapshotted and hashed before interpretation. Public provenance excludes private-library identifiers and raw transcript/audio payloads.
- Source opinion, market evidence, and Field Guide synthesis remain visibly separate.
- The default league profile converts exact 1–32 ranks to strength percentiles and applies provisional importance points of QB 40, Coaching 25, Offensive Line 20, and Skill Position 15. The weights are visible, adjustable, and are not learned forecast coefficients.
- Equal weighting is a sensitivity reference only.
- Every editorial source declares kind, coverage mode, covered teams, ranking scheme, scoring eligibility, analysis weight, and market awareness.
- Only a complete, unique, comparable full-league ordinal or score contract can receive nonzero weight. Partial or market-aware previews remain qualitative evidence at weight 0.
- Completing a set of division previews is not sufficient unless the combined series supplies a stable comparable league-wide contract.
- Exact speaker ballots remain distinct. Discussion order, opening odds, prior finish, projections, and bets are not converted into rankings; partial ballots remain partial.
- Podcast × Kalshi tail gaps are ordinal research prompts, not podcast-implied probabilities, betting edges, or recommendations.
- Complete Kalshi `KXNFLWINS` ladders supply modeled expected wins and market rank. Bid, ask, and midpoint tails are projected separately to non-increasing order.
- The preview-ballot versus Kalshi-tail module is scoped and visibly separate. The cross-market scanner remains market-versus-market.
- Betting data is a timestamped research input, not a recommendation or instruction to trade.

## Editorial sources

Scoring-eligible complete rankings:

- Quarterbacks: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/4e657898-f2f9-4a05-9cb6-e5a27f8c3cf2/transcript
- Coaching staffs: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/536e0274-0383-4b97-904b-986237b1b6d8/transcript
- Offensive lines: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/736ccaf1-f5e8-4b45-813f-cc8e25075f74/transcript
- Skill positions: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/98f3433e-7487-4c23-87ee-9bef34eaa4dc/transcript

Zero-weight scoped previews:

- NFC East Preview! | Ringer Wise Guys: https://pocketcasts.com/podcasts/19da8d60-ee2a-0139-d4ca-0acc26574db2/30a31d33-1d74-48ea-8e3c-14a354a2b63a/transcript
  - Coverage: DAL, PHI, NYG, WAS
  - Exact ballots: Palmer `DAL-PHI-NYG-WAS`; Dabbundo `DAL-PHI-WAS-NYG`; House `PHI-DAL-WAS-NYG`
- 2026 AFC Betting Preview | Part 1: https://pocketcasts.com/podcast/the-action-network-sports-betting-podcast/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/2026-afc-betting-preview-part-1/d6ef47c4-3532-4430-aa6f-9f91df8e5ddb
  - Coverage: AFC West and AFC East
  - Exact ballot: Abrams `NE-BUF-NYJ-MIA`
  - Partial ballot: Stuckey `BUF-NE`; third and fourth were not stated
  - No AFC West exact-finish order and no 1–16 AFC ranking were stated
  - A creator transcript was unavailable; analysis used a private local machine working copy derived from canonical publisher audio
- 2026 AFC Betting Preview | Part 2: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/90a36c38-dfa8-4c87-b29a-897924118428/transcript
  - Coverage: AFC South and AFC North
  - Partial ballot: Dabbundo `HOU` as AFC South winner; Indianapolis was separately his preferred division wager at the available price
  - Partial ballot: Stuckey `CIN` as AFC North winner
  - Partial ballot: Dabbundo `PIT` as AFC North winner
  - No second-through-fourth order was stated for those winner picks; no 1–16 AFC ranking was stated across the two episodes
  - The complete creator transcript was privately snapshotted and hashed before interpretation; garbled Houston/Jacksonville numeric projection passages remain unresolved

Canonical hashes, sizes, sanitized counts, ranking schemes, eligibility, and weights are in `data/sources/manifest.json`. Detailed private provenance, raw snapshots, machine transcript, private-library identifiers, credentials, key paths, and account data remain local and ignored.

## Refreshed market evidence

Sportsbook:

- Board: https://www.outrights.io/nfl/win-totals-odds
- Captured: `2026-08-24T18:35:36-04:00`
- Snapshot: `data/markets/2026-08-24T183536-0400-paired-win-totals.json`
- Raw page SHA-256: `45f6f5691fa5817bac5178265bb16c21f494db53c035e8cadff0de538b9582c5`
- Coverage: 184 paired quotes; 32/32 primary thresholds; 14 teams with multiple thresholds

Kalshi:

- Series: `KXNFLWINS`; current-season prefix `KXNFLWINS-27`
- Endpoint: https://external-api.kalshi.com/trade-api/v2/markets?series_ticker=KXNFLWINS&status=open&limit=1000
- Captured: `2026-08-24T22:35:52.402Z` (`2026-08-24T18:35:52.402-04:00`)
- Snapshot: `data/markets/20260824T223552.402Z-kalshi-nfl-win-ladders.json`
- Authentication verified read-only: yes; account response persisted: no
- Coverage: 544/544 current-season contracts; 32/32 teams; 17/17 tails per team

The refreshed sportsbook and Kalshi snapshots were captured 16 seconds apart. Prices remain timestamped evidence and are not represented as current after capture.

## Implemented Edition 5 integration

- Extended `data/previews/2026-team-previews.json` with the privately snapshotted AFC Part 2 creator transcript, eight paraphrased team dossiers, three winner-only partial ballots, ranking limits, ambiguity disclosures, and a public canonical-source hash.
- Added explicit eligibility metadata to complete categories and derived the scored-category set separately from preview sources.
- The Team Previews tab now covers 20 unique teams and shows all three source scopes, zero-weight/market-aware labels, exact or partial ballots, scoped Kalshi order, ambiguity ledgers, and dossier links.
- Added zero-weight preview evidence to each covered team profile without changing the profile score.
- Added a scoped preview-ballot versus selectable Kalshi-tail module, separate from both the league profile comparison and the cross-market scanner.
- Added an append-only profile sensitivity audit and a scanner `--sportsbook` option so each Kalshi scan records and uses the intended paired snapshot.
- Refreshed all report market adapters and rebuilt the self-contained offline artifact.

## Current snapshot audit

- Raw Kalshi midpoint monotonicity violations: 24
- Midpoint observations adjusted by isotonic projection: 58
- All bid, ask, and midpoint curves monotone after audit: yes
- Exact sportsbook-side comparisons: 92
- Passing scanner candidates: 4 at ≥5¢ pre-fee edge, ≤12¢ spread, and available top-of-book size
- League midpoint: 275.584 wins; marginal bid/ask sum: 263.865–287.404; 272-game ceiling residual: +3.584
- Calibration handling: retain and disclose the aggregate incoherence; do not force-normalize marginal team curves into a joint league distribution
- AFC midpoint: 135.551; NFC midpoint: 140.033
- Default 11-plus tail comparison: Detroit remains the largest absolute gap at 16 rank places, with Kalshi stronger
- Weighted/equal sensitivity: 2 teams move at least five ranks; Baltimore has the largest movement at 5
- Preview registration changed the league profile: no
- Durable audit: `data/audit/20260824T223552.402Z-profile-market-sensitivity.json`

## QA results

- Content coverage: 128/128 scored team-category cells; 0 missing; 0 duplicates; 3 preview sources; 20 unique preview teams
- Node tests: 15 passed, 0 failed, including exact preview ballots and zero-weight eligibility
- ESLint: passed
- TypeScript: passed with the repository-installed compiler
- Vite standalone production build: passed; the only build warning is the expected non-blocking >500 kB inline bundle
- Self-contained artifact: passed; CSS, JavaScript, data, and favicon are inline, with no local asset dependency
- Offline direct-file browser: passed
- Desktop browser at 1440×1000: passed; 3 preview sources, 4 scored weight controls, 17 tail choices, 32 league rows, 8 preview-ballot rows, and 4 scanner candidates; no document overflow or browser errors
- Mobile browser at 390×844: passed; preview cards stay within the document viewport and responsive layouts stack without document overflow
- Interactions: exact preview navigation, team-profile inclusion/exclusion, equal-weight 25/25/25/25, restored 40/25/20/15, threshold 13 update, and scanner exclusion from Win Markets all passed
- Semantic controls: passed; no unnamed buttons
- Browser console: 0 warnings or errors
- Public-tree privacy scan: passed; no private-library locator, raw transcript, local path, credential, key material, or account payload entered the artifact
- Dependency audit: 0 vulnerabilities
- GitHub Pages build: passed for artifact commit `d27aea0bd48409430e258133301ac28573dfca53`; workflow run https://github.com/longo1231/nfl-2026-outlook/actions/runs/32786113638 completed `2026-08-24T22:45:10Z`
- Deployed desktop/mobile and interactions: passed over HTTPS with zero console warnings or errors
- Deployment verified: `2026-08-24T22:45:58Z` (`2026-08-24T18:45:58-04:00`)

## Blockers

None.

## Next action

Acquire the defensive-ranking episode when available, verify its complete 1–32 contract, propose its provisional importance before activation, and rerun the append-only market, sensitivity, audit, build, browser, privacy, and publication sequence. Revisit the full weighting model after all intended comparable sources arrive.
