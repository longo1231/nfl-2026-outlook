# Completed phase: AFC Part 2, full AFC preview coverage, and weighting guardrails

Status: implemented through 2026-08-24; exact publication details are finalized in `CHECKPOINT.md`.

## Outcome

The new `2026 AFC Betting Preview | Part 2` item was ingested through the configured private-library workflow without mutation. Its complete creator/Reader transcript was privately snapshotted and hashed before interpretation. Part 2 covers the AFC South and AFC North, completing team-level AFC preview coverage when paired with Part 1.

All three preview sources enter the editorial registry as market-aware `team-preview` evidence with partial coverage, `scoring_eligible=false`, and analysis weight 0. They enrich 20 covered team profiles, a dedicated Team Previews tab, and a separate scoped preview-ballot versus Kalshi-tail module. The two AFC episodes cover all 16 conference teams but do not state a comparable 1–16 order or scoring contract, so they do not change the four-category league profile or the market-versus-market scanner.

## Source-eligibility and weighting contract

- Every source declares `kind`, `coverage_mode`, `covered_teams`, `ranking_scheme`, `scoring_eligible`, `analysis_weight`, and `market_aware`.
- Current scored categories remain QB 40, Coaching 25, Offensive Line 20, and Skill Position 15.
- A source can enter league scoring only with complete, unique, comparable full-league coverage and a stable ordinal or score contract.
- A set of division previews is not automatically scoreable merely because all teams eventually appear. The combined series must also use a comparable league-wide ranking or scoring method.
- Market-aware preview evidence never manufactures an independent Podcast × Kalshi edge; it is shown in a separate scoped comparison.
- Exact speaker ballots remain distinct. Discussion order, opening odds, prior finish, projections, and bets are not promoted into rankings.
- Transcription ambiguity is disclosed. Uncertain names and sequences are omitted or left unresolved rather than silently repaired.

## Exact source treatment

### NFC East Preview! | Ringer Wise Guys

- Public source: https://pocketcasts.com/podcasts/19da8d60-ee2a-0139-d4ca-0acc26574db2/30a31d33-1d74-48ea-8e3c-14a354a2b63a/transcript
- Coverage: Dallas, Philadelphia, New York Giants, Washington
- Exact ballots:
  - Raheem Palmer: DAL, PHI, NYG, WAS
  - Anthony Dabbundo: DAL, PHI, WAS, NYG
  - Joe House: PHI, DAL, WAS, NYG
- Registry: `team-preview`, division coverage, multi-ballot division ranking, market-aware, weight 0

### 2026 AFC Betting Preview | Part 1

- Public source: https://pocketcasts.com/podcast/the-action-network-sports-betting-podcast/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/2026-afc-betting-preview-part-1/d6ef47c4-3532-4430-aa6f-9f91df8e5ddb
- Coverage: Kansas City, Los Angeles Chargers, Denver, Las Vegas, Buffalo, New England, New York Jets, Miami
- Exact ballot: Evan Abrams — NE, BUF, NYJ, MIA
- Partial ballot: Stuckey — BUF first, NE second; third and fourth were not stated
- No AFC West exact-finish order and no conference-wide AFC ranking were stated
- Registry: `team-preview`, multi-division coverage, partial-order scheme, market-aware, weight 0
- Creator transcript unavailable; a private machine working copy derived from canonical publisher audio was used for analysis only

### 2026 AFC Betting Preview | Part 2

- Public source: https://pocketcasts.com/podcasts/6bd8a7b0-f1fd-0132-1157-059c869cc4eb/90a36c38-dfa8-4c87-b29a-897924118428/transcript
- Coverage: Houston, Jacksonville, Indianapolis, Tennessee, Baltimore, Cincinnati, Pittsburgh, Cleveland
- Partial ballot: Anthony Dabbundo — Houston as AFC South winner; no second-through-fourth order. Indianapolis is separately identified as his preferred division wager at the available price.
- Partial ballot: Stuckey — Cincinnati as AFC North winner; no second-through-fourth order
- Partial ballot: Anthony Dabbundo — Pittsburgh as AFC North winner; no second-through-fourth order
- No complete AFC South/North finish and no conference-wide AFC ranking were stated
- Registry: `team-preview`, multi-division coverage, partial-order scheme, market-aware, weight 0
- Complete creator transcript available; garbled Houston and Jacksonville numeric projection passages remain unresolved rather than reconstructed

Canonical source hashes and sanitized counts are in `data/sources/manifest.json`. Private-library identifiers, canonical snapshots, raw transcripts, derived transcript working copies, and detailed private provenance remain excluded from Git and publication.

## Refreshed market evidence

Sportsbook snapshot:

- Board: https://www.outrights.io/nfl/win-totals-odds
- Capture: `2026-08-24T18:35:36-04:00`
- File: `data/markets/2026-08-24T183536-0400-paired-win-totals.json`
- Raw page SHA-256: `45f6f5691fa5817bac5178265bb16c21f494db53c035e8cadff0de538b9582c5`
- Coverage: 184 paired quotes, 32/32 primary thresholds, 14 teams with multiple thresholds

Kalshi snapshot:

- Series: `KXNFLWINS`
- Capture: `2026-08-24T22:35:52.402Z` (`2026-08-24T18:35:52.402-04:00`)
- File: `data/markets/20260824T223552.402Z-kalshi-nfl-win-ladders.json`
- Coverage: 544 current-season contracts, 32 teams, all 17 tails for every team
- Read-only authentication check: passed; no account response was persisted
- Monotonicity: 24 raw midpoint violations; 58 midpoint observations adjusted; all curves monotone after projection
- Cross-market scanner: 92 exact-side comparisons; 4 rows passed the 5¢ edge, 12¢ spread, and size filters

The two refreshed snapshots were captured 16 seconds apart. Every result remains tied to both timestamps; no price is represented as current after capture.

## Sensitivity and tail audit

The reproducible audit is `data/audit/20260824T223552.402Z-profile-market-sensitivity.json`.

- Registered sources: 7; scoring categories: 4; preview sources: 3 at weight 0; 20 unique preview teams
- Profile changes caused by preview registration: 0
- Weighted versus equal reference: 2 teams move at least five ranks; Baltimore has the largest movement at 5 places
- Default 11-plus-win comparison: Detroit remains the largest absolute gap at 16 rank places, with Kalshi's tail ranking stronger
- All 17 Kalshi thresholds are recomputed against all 32 weighted profiles
- Scoped preview-ballot comparisons are displayed separately and do not enter league scoring

Kalshi's summed team midpoint estimate is 275.584, 3.584 above the 272-game league ceiling. This is retained as a calibration warning rather than normalized away; marginal team curves are not a coherent joint league distribution.

## Completion gates

- [x] Private-library ingestion remained read-only with zero source mutations.
- [x] Canonical sources were snapshotted and hashed before interpretation.
- [x] Exact source ballots and partial-order limits are preserved.
- [x] Transcription ambiguity and the AFC machine-transcript status are disclosed.
- [x] Preview evidence is registered at weight 0 and cannot affect the league profile.
- [x] Fresh append-only paired sportsbook and complete Kalshi snapshots were captured.
- [x] Weighted/equal sensitivity and all 17 tail comparisons were rerun.
- [x] The self-contained Pages artifact was rebuilt.
- [x] Offline desktop/mobile, accessibility, and privacy checks are recorded in `CHECKPOINT.md`.
- [x] The Edition 5 artifact commit and deployment verification are recorded in `CHECKPOINT.md`.

## Next content phase

Acquire the defensive-ranking episode when available. Preserve it read-only, verify its exact 1–32 contract, propose a provisional importance weight before activation, and rerun the same append-only market, sensitivity, audit, build, browser, privacy, and publication sequence. Revisit all category weights after the full intended comparable source set has arrived; previews remain qualitative unless they gain a stable league-wide contract.
