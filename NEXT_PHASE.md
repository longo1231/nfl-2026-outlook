# 2026 NFL Outlook Field Guide — next phase

Status: Edition 7 source and decision-system integration published and verified through 2026-08-27; exact publication details are finalized in `CHECKPOINT.md`.

## Completed source expansion

- Read the governing project files and configured Readwise workflow completely before private-library access.
- Verified the full recent non-feed library across new, later, shortlist and archive.
- Confirmed one unique unincorporated 2026 NFL episode: `2026 NFC Betting Preview | Part 1`, published Aug. 26, 2026; no duplicate title or publisher episode and no other relevant recent unincorporated transcript were present.
- Privately snapshotted and hashed the complete creator transcript before interpretation.
- Source discovery, acquisition, verification and extraction were read-only. After incorporation, the new item was moved to archive under Stephen's explicit authorization; it remains unopened and no other Reader field changed.
- Corrected provenance history to record the separate user-authorized post-integration archive of the ten Edition 6 sources—six moved and four were already archived—and the newly incorporated NFC Part 1 source on 2026-08-27. No content, tag, highlight, note or metadata other than location changed.

## NFC Part 1 preview contract

- Covers the NFC West and NFC South: Seattle, Los Angeles Rams, San Francisco, Arizona, Tampa Bay, Atlanta, New Orleans and Carolina.
- Registered as a market-aware `team-preview` at analysis weight 0 because it supplies no NFC West order, only one winner-only NFC South ballot and no comparable conference-wide or league-wide contract.
- Preserved Stuckey's explicit Tampa Bay NFC South winner pick as one partial ballot.
- Did not infer any position from power ratings, projected wins, discussion order, futures prices, props or preferred wagers.
- Added source-aware positive, concern and context evidence to all eight team profiles.
- Disclosed speaker-handoff uncertainty, phonetic name variants, time-sensitive preseason availability and one garbled Saints passing-yard prop rather than reconstructing it.
- The preview registry now contains five sources, 12 source-stated ballots and 32 unique covered teams. Seven ballots are complete and five are partial. Every preview remains scoring-ineligible and weight 0.

## Scoring and weighting status

- The six scored category defaults remain QB 25, Coaching 15, Offensive Line 11, Skill Positions 8, Offense 11 and Defense 30.
- These are adjustable reasoned priors, not learned coefficients and not fitted to outcomes, sportsbook prices or Kalshi.
- QB, line, skill and offense remain inside a fixed 55-point offensive-family budget. The offense episode stays an interaction/schedule overlay rather than an independent category-sized block.
- Equal weight remains a deliberate sensitivity stress test.
- Adding the preview changed no profile score or league rank.

## Fresh append-only market evidence

Sportsbook:

- Capture: `2026-08-27T08:43:29-04:00`
- Snapshot: `data/markets/2026-08-27T084329-0400-paired-win-totals.json`
- 32/32 teams with paired primary quotes; 13 teams with more than one observed threshold
- Six named books; 90 exact sportsbook-side comparisons against Kalshi

Kalshi:

- Capture: `2026-08-27T12:43:48.007Z` (`2026-08-27T08:43:48.007-04:00`)
- Snapshot: `data/markets/20260827T124348.007Z-kalshi-nfl-win-ladders.json`
- 544 current-season open contracts; all 32 teams; all 17 tails per team
- Read-only authentication verified; account response not persisted
- 45 raw midpoint monotonicity violations; 115 midpoint points adjusted; every final curve monotone
- Five rows passed the current 5¢ minimum pre-fee edge, 12¢ maximum spread and positive displayed-size filters

The captures are 19.007 seconds apart. The sportsbook source exposes capture time rather than per-quote age. Candidates remain pre-fee watchlist prompts; the current scanner has no minimum notional, quote-age or persistence requirement.

## Derived audit

- Weighted/equal and all-17-tail audit: `data/audit/20260827T124348.007Z-profile-market-sensitivity.json`
- Decision-system readiness audit: `data/audit/20260827T124348.007Z-decision-system-readiness.json`
- Weighted/equal sensitivity still has two teams moving at least five ranks: Baltimore moves seven and Houston five.
- At the default 11-win tail, Detroit has the largest absolute rank gap at 15 places; 11 teams differ by at least six.
- Preview-ballot comparisons contain 12 source-stated rows and compare partial ballots only over their stated positions.
- Modeled Kalshi team midpoint sum: 271.080 wins; marginal bid/ask sum: 254.349–288.585.
- The -0.920 residual below the 272-game ceiling is retained as aggregate market incoherence rather than normalized away.
- Conference modeled midpoint sums: AFC 132.968 and NFC 138.112. All eight division totals reproduce from the 32 team curves.

## Meta-review conclusion

Edition 7 classifies the current system as:

- **Auditable research source of truth:** ready.
- **Market comparison layer:** usable with explicit execution guardrails.
- **Calibrated forecast source of truth:** not implemented.
- **Execution and portfolio source of truth:** not implemented; must remain private.

The highest-priority gaps are:

1. Private decision ledger: thesis, fair-price range, target/limit, catalyst, invalidation, confidence and risk.
2. Current-state and freshness manifest: effective time, captured time, review due, stale-after, status and supersession.
3. Separate calibrated forecast layer with uncertainty and historical holdout validation.
4. Atomic preview claims with people, source locators, confidence and effective dates.
5. Execution-aware scanner with fees, minimum size/notional, quote age, movement and persistence.
6. Weekly update, CLV, outcome and calibration feedback loop.
7. One canonical registry and generated CI-backed metadata to eliminate duplicated configuration.

The full evidence, target architecture and phased roadmap are in `META_REVIEW.md`.

## Next build sequence

1. Design the ignored private decision-ledger schema and decide whether it renders as a separate local artifact or an ignored overlay. Separate local output is safer by default.
2. Add the generated current-state/freshness manifest and stale-state UI before Week 1.
3. Add an explicitly probabilistic forecast baseline without changing or relabeling the current ordinal research profile.
4. Migrate preview summaries to atomic claims and generate the existing team summaries from them.
5. Add market movement, fee/size/age/persistence gates and separate watchlist from action-list semantics.
6. Freeze preseason priors, add weekly versioned updates and score forecasts/decisions against closing prices and outcomes.

## Recurring publication gate

- Refresh paired sportsbook and Kalshi snapshots together when price freshness matters; never overwrite history.
- Ingest new previews only through the read-only source protocol; preserve partial ballots and never infer ranks.
- Rerun content, market, readiness, privacy, offline, responsive, interaction, accessibility and deployed HTTPS checks for every edition.
- Preserve the frozen owner-only Sites v1 reference.
