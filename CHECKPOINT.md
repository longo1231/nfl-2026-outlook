# 2026 NFL Outlook Field Guide — checkpoint

## Objective

Maintain an auditable 2026 NFL research source of truth, compare its eligible evidence with timestamped market distributions, and build toward a private, execution-aware futures decision system for preseason and the first weeks without implying certainty the infrastructure does not possess.

## Current state

- Edition: 7
- Report build date: 2026-08-27
- Editorial and market evidence through: 2026-08-27
- Public repository: https://github.com/longo1231/nfl-2026-outlook
- GitHub Pages URL: https://longo1231.github.io/nfl-2026-outlook/
- Edition 7 artifact commit: `95596c22f9206c442266d6e7271fb57421be5924`
- Edition 7 deployment-record commit: this record commit; exact hash is carried by Git history and the release handoff because a commit cannot contain its own hash
- GitHub Pages workflow result: legacy Pages build `1178503494` for the exact artifact commit, status `built`, created `2026-08-27T13:10:51Z`, completed `2026-08-27T13:11:12Z`, duration 21.744 seconds, no error
- GitHub Pages build API: https://api.github.com/repos/longo1231/nfl-2026-outlook/pages/builds/1178503494
- Deployed HTTPS verification: passed at `2026-08-27T13:12:56Z` (`2026-08-27T09:12:56-04:00`)
- Deployed artifact SHA-256: `42a3ec619851f1388b58b587948db524a099c32355eb6de62e51945b33aaea5d` (byte-for-byte equal to `docs/index.html`)
- Prior Edition 6 artifact commit: `2418b876ad5a3aaee8ac6f3ef210fd072941d254`
- Frozen owner-only Sites v1 reference: preserved privately and unchanged

## Source-of-truth boundary

Edition 7 is ready as an auditable research source of truth. It is not yet a calibrated forecast, an execution system, or a portfolio ledger.

- Evidence layer: ready with claim-lineage and freshness debt.
- Forecast layer: missing; the current profile is ordinal and must not be read as a fair probability or expected-win model.
- Market layer: usable with guardrails; current differences are pre-fee and lack minimum-notional, quote-age, movement, and persistence tests.
- Decision/portfolio layer: missing and intentionally private when built.
- Operations: manual but tested; a generated current-state pointer, freshness contract, and CI remain future work.

The full diagnosis and phased target architecture are in `META_REVIEW.md`; the reproducible result is in `data/audit/20260827T124348.007Z-decision-system-readiness.json`.

## Fixed decisions

- “Upcoming season” means the 2026 NFL regular season.
- Canonical creator transcripts are privately snapshotted and hashed before interpretation. If unavailable, canonical publisher audio is preserved and any machine transcript is a labeled private working copy.
- Source discovery, acquisition, verification, and extraction default to read-only. The Edition 6 sources were archived only afterward under explicit user authorization; six moved and four were already archived. The newly incorporated NFC source was then moved to archive under the same authorization and remains unopened; no other Reader field changed.
- Public provenance excludes Reader identifiers/URLs, private metadata, raw transcript/audio payloads, credentials, account data, and local filesystem paths.
- Only a complete, unique, comparable league-wide 1–32 ordinal or score contract can be scoring-eligible. Discussion order, odds, projections, and wagers never become inferred rankings.
- Eligibility does not imply independence. Every scored source has a dependence group and disclosed adjustable reasoned-prior weight.
- Modeled expected wins are always labeled modeled. Team and group bid/ask sums are marginal market-width bounds, not confidence intervals or joint portfolio guarantees.
- Sportsbook and Kalshi histories are append-only. Timestamp mismatches and aggregate incoherence remain visible.

## Editorial corpus

The sanitized public manifest contains 11 sources. Six are scoring-eligible complete 1–32 contracts:

1. Quarterbacks — 25 points — `offense-family`
2. Coaching staffs — 15 points — `cross-unit`
3. Offensive lines — 11 points — `offense-family`
4. Skill positions — 8 points — `offense-family`
5. Offenses — 11 points — `offense-family`
6. Defenses — 30 points — `defense-family`

The defaults are adjustable reasoned priors, not learned coefficients and not fitted to outcomes or market prices. QB, line, skill, and offense share a fixed 55-point offensive-family budget because the Offenses methodology reuses those components and adds interaction, play calling, schedule, and DVOA context. Defense receives 30 points as the only dedicated defensive source; coaching receives 15 as a cross-unit multiplier. Equal weight remains a visible sensitivity test.

Five market-aware previews remain at weight 0:

- NFC East — three complete division ballots.
- AFC Preview Part 1 — one complete and one partial AFC East ballot; no AFC West order. Canonical publisher audio is preserved with a labeled private machine-transcript working copy because no creator transcript was available.
- AFC Preview Part 2 — three winner-only ballots across the AFC South and AFC North.
- NFC North — three complete speaker ballots; Cousin Sal explicitly withheld picks and receives no inferred ballot.
- NFC Preview Part 1 — NFC West and NFC South team evidence; one explicit Stuckey Tampa Bay winner-only ballot, no NFC West order, and no complete NFC South order.

The registry now contains five preview sources, 12 source-stated ballots, and qualitative evidence for all 32 teams. Seven ballots are complete and five are partial. Every preview is `scoring_eligible=false`, `analysis_weight=0`, and `market_aware=true`.

## NFC Preview Part 1 audit

- Verified one unique current-season source and no duplicate or other relevant recent unincorporated 2026 NFL transcript across every non-feed Reader location.
- Privately snapshotted and hashed the complete creator transcript before interpretation.
- Preserved evidence for Seattle, the Rams, San Francisco, Arizona, Tampa Bay, Atlanta, New Orleans, and Carolina.
- Preserved only Stuckey’s explicit Tampa Bay NFC South winner pick as a partial ballot.
- Did not infer rankings from power ratings, projected wins, discussion order, prices, props, or wagers.
- Disclosed uncertain speaker handoffs, phonetic names, time-sensitive preseason availability, and one garbled Saints passing-yard prop rather than reconstructing it.

## Fresh append-only market evidence

Sportsbook snapshot:

- Captured: `2026-08-27T08:43:29-04:00`
- File: `data/markets/2026-08-27T084329-0400-paired-win-totals.json`
- 32/32 teams with paired primary quotes; 13 teams with multiple thresholds; six books

Kalshi snapshot:

- Captured: `2026-08-27T12:43:48.007Z` (`2026-08-27T08:43:48.007-04:00`)
- File: `data/markets/20260827T124348.007Z-kalshi-nfl-win-ladders.json`
- 544 open current-season contracts; 32 teams; 17/17 tails for every team
- Read-only authentication verified; no account response persisted
- 45 raw midpoint monotonicity violations; 115 midpoint points adjusted; every final curve monotone
- 90 exact sportsbook-side comparisons; five rows pass the current 5¢ edge, 12¢ spread, and positive displayed-size filters

The captures are 19.007 seconds apart. The sportsbook source supplies capture time rather than per-quote age. Scanner rows remain pre-fee watchlist prompts with no minimum notional or persistence requirement.

Modeled market totals:

- League midpoint: 271.080; marginal bid/ask sum: 254.349–288.585; residual below the 272-game ceiling: -0.920
- AFC midpoint: 132.968; NFC midpoint: 138.112
- Division midpoints: AFC East 30.051, AFC North 34.178, AFC South 33.428, AFC West 35.311, NFC East 33.804, NFC North 38.177, NFC South 30.017, NFC West 36.114

The residual is preserved as aggregate market incoherence rather than normalized away. Marginal team curves are not a coherent joint league distribution.

## Derived analysis

- Weighted/equal sensitivity includes all 32 teams; Baltimore moves seven ranks and Houston five.
- All 17 Kalshi tail comparisons include all 32 teams.
- At the default 11-win tail, Detroit has the largest absolute profile/tail gap at 15 ranks; 11 teams differ by at least six.
- All 12 preview ballots are compared only over source-stated positions; partial ballots remain partial.
- The cross-market scanner is separate from podcast analysis and uses no editorial evidence.
- Defense is represented. Special teams, an independent schedule model, calibrated forecasts, claim freshness, changing injuries, execution costs, and portfolio state remain missing dimensions.

## Local verification

- Content and market tests: 16 passed, 0 failed
- TypeScript: passed
- ESLint: passed from the configured site package
- Standalone Vite build: passed; `docs/index.html` rebuilt
- Offline/self-contained and privacy audit: passed; inline scripts/styles, no external script or stylesheet dependency, 22 private identifiers tested with zero leaks, no prohibited public patterns
- Desktop 1440×1000: passed with 15 navigation tabs and zero document overflow
- Mobile 390×844: passed with responsive cards, intentionally scrollable labeled tables, and zero document overflow
- Interaction/accessibility: passed for named native controls, equal/default weight actions, tail selection, preview-to-profile navigation, one named navigation, zero unnamed buttons/links, zero duplicate IDs, and clean browser logs
- Deployed HTTPS: passed with HTTP/2 200, HSTS, a byte-identical artifact, Edition 7/Aug. 27 content, 11 source cards, five preview cards, 32 analysis rows, 12 preview-ballot rows, five scanner rows, 15 tabs, six weight controls, 17 tail choices, zero document overflow, and clean browser logs

## Next action

Begin the private decision ledger and time-aware freshness manifest before adding a calibrated forecast layer.
