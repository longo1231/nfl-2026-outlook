# Completed phase: scoped previews, refreshed markets, and source-eligibility guardrails

Status: implemented through 2026-08-24; exact publication details are finalized in `CHECKPOINT.md`.

## Outcome

Two newly available podcast items were ingested through the configured private-library workflow without mutation. Canonical sources were snapshotted and hashed before interpretation. The NFC East episode supplies three distinct four-team exact-finish ballots. The purported entire-AFC item resolves to Action Network's `2026 AFC Betting Preview | Part 1`, covering only the AFC West and AFC East; it supplies one complete AFC East ballot, one partial AFC East ballot, and no AFC West or 1–16 AFC order.

Both sources now enter the editorial registry as market-aware `team-preview` evidence with partial coverage, `scoring_eligible=false`, and analysis weight 0. They enrich the 12 covered team profiles, a dedicated Team Previews tab, and a separate scoped preview-ballot versus Kalshi-tail module. They do not change the four-category league profile or the market-versus-market scanner.

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

Canonical source hashes and sanitized counts are in `data/sources/manifest.json`. Private-library identifiers, canonical snapshots, raw transcripts, derived transcript working copies, and detailed private provenance remain excluded from Git and publication.

## Refreshed market evidence

Sportsbook snapshot:

- Board: https://www.outrights.io/nfl/win-totals-odds
- Capture: `2026-08-24T17:44:30-04:00`
- File: `data/markets/2026-08-24T174430-0400-paired-win-totals.json`
- Raw page SHA-256: `30bf5e1631cd09c407b276d037a744860bf9f282851cb7ee6be4066a88f74d3a`
- Coverage: 185 paired quotes, 32/32 primary thresholds, 15 teams with multiple thresholds

Kalshi snapshot:

- Series: `KXNFLWINS`
- Capture: `2026-08-24T21:45:03.240Z` (`2026-08-24T17:45:03.240-04:00`)
- File: `data/markets/20260824T214503.240Z-kalshi-nfl-win-ladders.json`
- Coverage: 544 current-season contracts, 32 teams, all 17 tails for every team
- Read-only authentication check: passed; no account response was persisted
- Monotonicity: 18 raw midpoint violations; 43 midpoint observations adjusted; all curves monotone after projection
- Cross-market scanner: 94 exact-side comparisons; 3 rows passed the 5¢ edge, 12¢ spread, and size filters

The two refreshed snapshots were captured 33 seconds apart. Every result remains tied to both timestamps; no price is represented as current after capture.

## Sensitivity and tail audit

The reproducible audit is `data/audit/20260824T214503.240Z-profile-market-sensitivity.json`.

- Registered sources: 6; scoring categories: 4; preview sources: 2 at weight 0
- Profile changes caused by preview registration: 0
- Weighted versus equal reference: 2 teams move at least five ranks; Baltimore has the largest movement at 5 places
- Default 11-plus-win comparison: Detroit remains the largest absolute gap at 16 rank places, with Kalshi's tail ranking stronger
- All 17 Kalshi thresholds are recomputed against all 32 weighted profiles
- Scoped preview-ballot comparisons are displayed separately and do not enter league scoring

Kalshi's summed team midpoint estimate is 275.322, 3.322 above the 272-game league ceiling. This is retained as a calibration warning rather than normalized away; marginal team curves are not a coherent joint league distribution.

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
- [x] The Edition 4 artifact commit and deployment verification are recorded in `CHECKPOINT.md`.

## Next content phase

Acquire AFC Preview Part 2 and the defensive-ranking episode when available. Preserve each source read-only, classify its coverage and ranking contract before assigning weight, and activate a source only when comparable full-league coverage exists. Then rerun the same append-only market, sensitivity, audit, build, browser, privacy, and publication sequence.
