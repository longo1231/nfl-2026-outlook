# 2026 NFL Outlook Field Guide — next phase

Status: Edition 6 integration complete through 2026-08-26; publication details are finalized in `CHECKPOINT.md`.

## Completed source expansion

- Verified the recent full non-feed private Reader library read-only against the private provenance manifest.
- Confirmed exactly three relevant unincorporated 2026 NFL items: `2026 NFL Rankings | Offenses`, `2026 NFL Rankings | Defenses`, and `NFC North Preview! | Ringer Wise Guys`.
- Confirmed one canonical copy of each, no season mismatch, no duplicate copy, and no other relevant unincorporated 2026 NFL transcript after broad and exact-title searches.
- Privately snapshotted and hashed each complete creator transcript before interpretation. No Reader item was moved, archived, tagged, edited, marked read/seen, highlighted, annotated, or otherwise mutated.
- Added sanitized provenance without private-library identifiers, raw transcript text, local paths, or private metadata.

## Scoring contracts and dependence model

- Offenses and Defenses each preserve a complete, unique league-wide 1–32 contract and are scoring-eligible.
- The six scored category defaults are QB 25, Coaching 15, Offensive Line 11, Skill Positions 8, Offense 11, and Defense 30.
- These are adjustable reasoned priors, not learned coefficients and not fitted to outcomes, sportsbook prices, or Kalshi.
- QB, line, skill, and offense share a fixed 55-point offensive-family budget. The composite offense source explicitly depends on QB, offensive line, skill positions, offensive play calling, and schedule-adjusted DVOA context, so its 11 points are an interaction/schedule overlay rather than an independent category-sized block.
- Defense receives 30 points as the only dedicated defensive unit source, with its own volatility caveat. Cross-unit coaching receives 15 because it overlaps both unit composites.
- Equal weight remains available as a deliberate sensitivity stress test that ignores the default dependence correction.
- Defense is now represented. Special teams, an independent schedule model, and changing injury information remain missing dimensions.

## NFC North preview contract

- Registered as a market-aware `team-preview` at analysis weight 0 because it supplies division ballots rather than a comparable league-wide contract.
- Preserved three complete speaker ballots separately:
  - Raheem Palmer: DET, MIN, CHI, GB
  - Joe House: DET, MIN, GB, CHI
  - Anthony Dabbundo: GB, CHI, MIN, DET
- Cousin Sal explicitly withheld his picks for another show. No ballot or partial order is inferred for him.
- Added paraphrased, source-located team evidence to Detroit, Green Bay, Chicago, and Minnesota profiles.
- The preview registry now contains four sources, 11 source-stated ballots, and 24 unique covered teams. Every preview remains scoring-ineligible and weight 0.

## Fresh append-only market evidence

Sportsbook:

- Capture: `2026-08-26T12:13:56-04:00`
- Snapshot: `data/markets/2026-08-26T121356-0400-paired-win-totals.json`
- 32/32 teams with paired primary quotes; 13 teams with more than one observed threshold
- Six named books; 90 exact sportsbook-side comparisons against Kalshi

Kalshi:

- Capture: `2026-08-26T16:14:21.058Z` (`2026-08-26T12:14:21.058-04:00`)
- Snapshot: `data/markets/20260826T161421.058Z-kalshi-nfl-win-ladders.json`
- 544 current-season open contracts; all 32 teams; all 17 tails per team
- Read-only authentication verified; account response not persisted
- 30 raw midpoint monotonicity violations; 78 midpoint points adjusted; every final curve monotone
- 8 cross-market rows passed the 5¢ minimum pre-fee edge, 12¢ maximum spread, and available-size filters

The two market captures are 25.058 seconds apart. Prices are timestamped evidence and are not represented as simultaneous or current after capture.

## Derived audit

- Durable audit: `data/audit/20260826T161421.058Z-profile-market-sensitivity.json`
- Weighted/equal sensitivity covers all 32 teams; BAL moves seven places and HOU five, the only moves of at least five.
- All 17 selectable Kalshi tails are compared for all 32 teams.
- At the default 11-win tail, DET has the largest absolute rank gap at 15 places; 10 teams differ by at least six places.
- Preview-ballot comparisons derive only from each speaker's stated positions and the selected Kalshi tail inside the same division scope.
- The cross-market scanner remains separate and uses no podcast evidence.
- Modeled Kalshi team midpoint sum: 272.693 wins; marginal bid/ask sum: 259.322–286.412.
- The +0.693 residual over the 272-game ceiling is retained as aggregate market incoherence rather than normalized away. Marginal team curves are not a coherent joint league distribution.
- Conference modeled midpoint sums: AFC 133.393, NFC 139.300. Division totals reproduce from the 32 team curves.

## Completed implementation

- Added Offenses and Defenses to the category registry, navigation, league matrix, every team profile, source cards, weight controls, sensitivity analysis, and derived views.
- Added NFC North to the preview registry, preview navigation, all three explicit ballots, the four covered profiles, ambiguity ledgers, and scoped market comparisons.
- Updated completeness counts, source provenance, missing-dimension language, weighting rationale, market adapters, and append-only audit artifacts.
- Rebuilt the standalone `docs/index.html` artifact.

## Remaining recurring work

- Refresh paired sportsbook and Kalshi snapshots together when price freshness matters; never overwrite history.
- Ingest additional team previews only through the read-only source protocol; preserve partial ballots as partial and do not infer ranks.
- Add a comparable special-teams contract if one becomes available, followed by a fresh dependence audit.
- Revisit the reasoned prior budgets only with an explicit rationale. Learned coefficients would require a separate historical training and validation design and must never be described as the current model.
- Re-run all content, market, privacy, offline, responsive, interaction, accessibility, and deployed HTTPS checks for every published artifact.

## Completion checklist

- [x] Three new canonical sources identified without duplicates or season mismatch.
- [x] Complete creator transcripts privately snapshotted and hashed before interpretation.
- [x] Reader access remained strictly read-only.
- [x] Offense and defense each verified as complete unique 1–32 contracts.
- [x] Dependence-aware adjustable priors documented; equal-weight sensitivity retained.
- [x] NFC North ballots and four team dossiers registered at weight 0 without inferred ranks.
- [x] Fresh append-only paired sportsbook and complete Kalshi snapshots captured.
- [x] Weighted/equal, all-17-tail, group-total, preview-ballot, and cross-market calculations rerun.
- [x] Sanitized manifests, coverage contracts, report navigation, and durable docs updated.
- [ ] Publication commit, GitHub Pages workflow, deployed HTTPS verification, and final timestamps recorded in `CHECKPOINT.md`.
