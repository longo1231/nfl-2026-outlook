# 2026 NFL Outlook Field Guide — checkpoint

## Objective

Maintain an evidence-complete, eligibility- and dependence-aware study report from 2026 NFL ranking and preview podcasts, then compare the scoring-eligible inputs with timestamped paired sportsbook prices and complete Kalshi team-win distributions without exposing private source material.

## Current state

- Edition: 6
- Report build date: 2026-08-26
- Content and market snapshots through: 2026-08-26
- Public repository: https://github.com/longo1231/nfl-2026-outlook
- GitHub Pages URL: https://longo1231.github.io/nfl-2026-outlook/
- Edition 6 artifact commit: publication pending
- Edition 6 deployment-record commit: publication pending
- GitHub Pages workflow result: publication pending
- Deployed HTTPS verification: publication pending
- Prior Edition 5 artifact commit: `d27aea0bd48409430e258133301ac28573dfca53`
- Frozen owner-only Sites v1 reference: preserved privately and unchanged

## Fixed decisions

- “Upcoming season” means the 2026 NFL regular season.
- Canonical creator transcripts are privately snapshotted and hashed before interpretation. If unavailable, canonical publisher audio is preserved and any machine transcript is a labeled private working copy.
- Private Reader access is strictly read-only. No item is moved, archived, tagged, edited, marked read/seen, highlighted, annotated, or otherwise mutated.
- Public provenance excludes Reader identifiers/URLs, private metadata, raw transcript/audio payloads, credentials, account data, and local filesystem paths.
- Only a complete, unique, comparable league-wide 1–32 ordinal or score contract can be scoring-eligible. Preview discussion order, odds, projections, and wagers never become inferred rankings.
- Eligibility does not imply independence. Every scored source is assigned a dependence group and a disclosed adjustable reasoned-prior weight.
- Modeled expected wins are always labeled modeled. Team and group bid/ask sums are marginal market-width bounds, not confidence intervals or joint portfolio guarantees.
- Sportsbook and Kalshi histories are append-only. Timestamp mismatches and aggregate incoherence remain visible.

## Editorial corpus

The sanitized public manifest is `data/sources/manifest.json`; exact compact orders are in `data/rankings/`; the preview registry is `data/previews/2026-team-previews.json`. Detailed private provenance and canonical source payloads remain ignored.

Scoring-eligible complete 1–32 sources:

1. Quarterbacks — 25 points — `offense-family`
2. Coaching staffs — 15 points — `cross-unit`
3. Offensive lines — 11 points — `offense-family`
4. Skill positions — 8 points — `offense-family`
5. Offenses — 11 points — `offense-family`
6. Defenses — 30 points — `defense-family`

The new Offenses and Defenses contracts each contain all 32 NFL teams exactly once with all ranks 1–32 exactly once. Both are scoring-eligible.

Default weights are adjustable reasoned priors, not learned coefficients and not fitted to outcomes or market prices. QB, line, skill, and offense share a fixed 55-point offensive-family budget because the Offenses methodology explicitly culminates QB, line, skill, offensive play calling, and schedule-adjusted DVOA context. The 11-point offense weight is an interaction/schedule overlay rather than a second independent copy of the component evidence. Defense receives 30 points as the only dedicated defensive unit source; coaching receives 15 as a cross-unit multiplier with overlap on both sides. Equal weight remains a visible sensitivity stress test.

Zero-weight market-aware previews:

- NFC East — three complete division ballots
- AFC Preview Part 1 — one complete AFC East ballot, one partial AFC East ballot, no AFC West finish order; canonical publisher audio with a private machine-transcript working copy because no creator transcript was available
- AFC Preview Part 2 — three winner-only partial ballots across the AFC South and AFC North; no inferred second-through-fourth or conference order
- NFC North — three complete speaker ballots: Raheem Palmer `DET-MIN-CHI-GB`, Joe House `DET-MIN-GB-CHI`, Anthony Dabbundo `GB-CHI-MIN-DET`; Cousin Sal explicitly withheld picks and receives no inferred ballot

The four preview sources cover 24 unique teams and preserve 11 source-stated ballots. Every preview remains `scoring_eligible=false`, `analysis_weight=0`, and `market_aware=true`.

## Source audit results

- Full recent non-feed Reader search found exactly the three publicly identified but unincorporated items and no other relevant unincorporated 2026 NFL transcript.
- Each new item had one canonical copy, correct 2026 season identity, complete creator transcript, and no duplicate copy.
- Offense ambiguities include several phonetically garbled personnel/coach references. They remain explicitly uncertain rather than silently normalized.
- Defense ambiguities include scattered name variants and one implausible Ravens return reference. A brief Rams “No. 4” slip is resolved only because the explicit list and top-ten recap both establish Baltimore fourth and the Rams fifth.
- NFC North preserves every identifiable speaker ballot separately; no rank is inferred from conversation sequence, prices, projections, or bets.

## Fresh market evidence

Sportsbook snapshot:

- Captured: `2026-08-26T12:13:56-04:00`
- File: `data/markets/2026-08-26T121356-0400-paired-win-totals.json`
- Board: https://www.outrights.io/nfl/win-totals-odds
- Raw public-board snapshot hash: `d2b1af8fe840e41873004a61f178ed7cd3dd128d309838787e124a18495ab01f`
- 32/32 teams with paired primary quotes; 13 teams with multiple thresholds; six books

Kalshi snapshot:

- Captured: `2026-08-26T16:14:21.058Z` (`2026-08-26T12:14:21.058-04:00`)
- File: `data/markets/20260826T161421.058Z-kalshi-nfl-win-ladders.json`
- 544 open current-season contracts; 32 teams; 17/17 tails for every team
- Read-only authentication verified; no account response persisted
- 30 raw midpoint monotonicity violations; 78 midpoint points adjusted; every adjusted bid, ask, and midpoint curve monotone
- 90 exact sportsbook-side comparisons; 8 candidates pass the current 5¢ edge, 12¢ spread, and displayed-size filters

The market captures are 25.058 seconds apart. They are not represented as simultaneous or current after capture.

Modeled market totals:

- League midpoint: 272.693; marginal bid/ask sum: 259.322–286.412; residual over the 272-game ceiling: +0.693
- AFC midpoint: 133.393; NFC midpoint: 139.300
- Division midpoints: AFC East 30.812, AFC North 34.339, AFC South 32.787, AFC West 35.455, NFC East 34.783, NFC North 38.540, NFC South 30.012, NFC West 35.965

The +0.693 league residual is preserved as aggregate market incoherence rather than normalized away. Marginal team curves are not a coherent joint league distribution.

## Derived analysis

- Audit: `data/audit/20260826T161421.058Z-profile-market-sensitivity.json`
- Weighted/equal sensitivity: all 32 teams; BAL moves seven places and HOU five; no other team moves at least five.
- All 17 Kalshi tail comparisons contain all 32 teams.
- At the default 11-win tail, DET has the largest absolute profile/tail gap at 15 places; 10 teams have an absolute gap of at least six.
- Preview-ballot comparison stays division-scoped and uses only source-stated positions; partial ballots remain partial.
- The cross-market scanner is separate from podcast analysis and uses no editorial evidence.
- Defense is represented. Special teams, an independent schedule model, and changing injury information remain missing dimensions.

## Verification

- Content and market tests: 16 passed, 0 failed
- TypeScript: passed
- ESLint: passed
- Standalone Vite build: passed
- Self-contained `docs/index.html`: rebuilt
- Offline/self-contained checks: passed; the publication has inline scripts/styles, an inline data-URI favicon, no external script or stylesheet dependency, and local HTTP requests only for `/`
- Privacy scans: passed; no tracked private source tree, transcript snapshot, local absolute path, Reader locator, environment file, credential, key, log, or build scratch directory
- Desktop 1440×1000: passed with 14 navigation tabs, 32 matrix rows, four preview cards, 11 preview ballots, six weight controls, 32 analysis rows, 17 tail choices, eight scanner candidates, and zero document overflow
- Mobile 390×844: passed with four 366-pixel preview cards inside the 390-pixel viewport, horizontally scrollable labeled tables, and zero document overflow
- Interaction/accessibility: passed for native labeled controls, weight restore/equal actions, threshold 13 update, scoped preview navigation, scanner separation, one main landmark, named navigation, zero unlabeled buttons/links, zero duplicate IDs, and clean browser logs
- Deployed HTTPS: pending publication

## Next action

Complete offline/privacy/browser QA, publish the Edition 6 artifact through GitHub Pages with a GitHub no-reply identity, verify the deployed HTTPS artifact, and replace all publication-pending fields above with exact commit, workflow, URL, and timestamp records.
