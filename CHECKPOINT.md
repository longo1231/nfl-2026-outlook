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
- Local working-tree status: Phases 0–6 of the four-layer implementation are complete as operating infrastructure but are not committed, pushed or deployed
- Local Phase 0–6 artifact SHA-256: `f26b69a8c0adfb164e86da74eccde3b34d55c5cb2716270fe50c00af64d6b8b0`; the deployed Pages artifact remains the frozen hash above

## Source-of-truth boundary

Edition 7 remains ready as an auditable research source of truth. The local working tree now implements the atomic evidence ledger, current-state/freshness spine, private decision ledger, provisional independent forecast, Kalshi-only execution layer, immutable weekly state and the public/private learning loop. It is not yet a validated forecast or model-driven wagering system.

- Evidence layer: atomic-ledger ready. All visible scored and preview summaries are generated from 972 claims, 270 disposed source blocks and 506 normalized people. Forty-two time-sensitive preseason claims are stale for current use and remain visibly reviewable rather than silently treated as current.
- Forecast layer: provisional lab implemented; `schedule-sim-v1.0.1` produces exact 0–17 win distributions from 100,000 coherent 2026 schedule draws. It is market-independent and distinct from the ordinal profile, but is not decision eligible because calibration and current-adjustment gates fail.
- Market layer: Kalshi execution-aware. It captures all full books, walks 1/10/100-contract depth, applies a versioned fee and reserve, expires capture-time quotes, tracks movement and requires two-capture persistence. Zero model rows are action eligible while the forecast is provisional.
- Decision/portfolio layer: local MVP implemented with a hash-chained append-only ledger, manual lifecycle entry, deterministic thesis/position/exposure/CLV views, and a separate ignored app. The canonical ledger is initialized with zero events; no account or order integration exists.
- Operations: a generated manifest selects current public evidence, forecast, Kalshi execution, policy, readiness and learning records. The public workflow exposes Today, Opportunities, Team dossiers, Markets and Research; two content-addressed weekly states are frozen and verifiable. Real weekly source refreshes, real closes/outcomes and CI remain operating work.

The full diagnosis and phased target architecture are in `META_REVIEW.md` and `FOUR_LAYER_IMPLEMENTATION_SPEC.md`; the locked forecast, market and operating methods are in `FORECAST_DESIGN.md`, `KALSHI_EXECUTION_DESIGN.md` and `PHASE6_DESIGN.md`. The current reproducible result is in `data/evidence/2026-evidence-ledger.json`, `data/evidence/2026-evidence-audit.json`, `data/audit/20260827T170147Z-decision-system-readiness.json`, `data/audit/validation-fcst-2026-preseason-bf554ba7c4aee595.json`, `data/forecasts/fcst-2026-preseason-bf554ba7c4aee595.json`, `data/markets/20260827T153038.207Z-kalshi-nfl-execution.json`, `data/current/public-manifest.json`, `data/current/weekly-index.json` and `data/current/learning-report.json`.

## Fixed decisions

- “Upcoming season” means the 2026 NFL regular season.
- Canonical creator transcripts are privately snapshotted and hashed before interpretation. If unavailable, canonical publisher audio is preserved and any machine transcript is a labeled private working copy.
- Source discovery, acquisition, verification, and extraction default to read-only. The Edition 6 sources were archived only afterward under explicit user authorization; six moved and four were already archived. The newly incorporated NFC source was then moved to archive under the same authorization and remains unopened; no other Reader field changed.
- Public provenance excludes Reader identifiers/URLs, private metadata, raw transcript/audio payloads, credentials, account data, and local filesystem paths.
- Only a complete, unique, comparable league-wide 1–32 ordinal or score contract can be scoring-eligible. Discussion order, odds, projections, and wagers never become inferred rankings.
- Eligibility does not imply independence. Every scored source has a dependence group and disclosed adjustable reasoned-prior weight.
- Modeled expected wins are always labeled modeled. Team and group bid/ask sums are marginal market-width bounds, not confidence intervals or joint portfolio guarantees.
- All market histories remain append-only. Sportsbook snapshots are frozen historical evidence; active collection and diagnostics are Kalshi-only. Capture-window mismatches and aggregate incoherence remain visible.
- Public builds select current inputs only through the generated manifest; missing or stale layers fail visibly rather than silently falling back.
- Weekly decision context is content addressed and immutable. The current index retains two preseason states; the active state is `weekly-2026-preseason-prior-3c7ab67d2d4db794`.
- Public learning scores the frozen model against retained closing prices and outcomes. Private learning separately derives entry-price CLV, realized P&L and postmortem queues from the ignored ledger.
- Only generated evidence views feed public team/category cards. Corrections append new claims and use `supersedes`; historical source statements are never overwritten.
- Forecast fitting excludes editorial ranks, sportsbook prices and exchange prices. The separate historical moneyline file is evaluation-only and cannot be passed into the fitting or simulation interfaces.
- Forecast tuning seasons are 2018–2021 and untouched holdout seasons are 2022–2025. Promotion thresholds remain fixed after observation.
- Private decision data and output remain under `.private/`; only generic app code, schemas and redacted fixtures are Git-visible.

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

The registry now contains five preview sources, 12 source-stated ballots, ambiguity metadata and generated-view references for qualitative evidence covering all 32 teams. Seven ballots are complete and five are partial. Every preview is `scoring_eligible=false`, `analysis_weight=0`, and `market_aware=true`.

## NFC Preview Part 1 audit

- Verified one unique current-season source and no duplicate or other relevant recent unincorporated 2026 NFL transcript across every non-feed Reader location.
- Privately snapshotted and hashed the complete creator transcript before interpretation.
- Preserved evidence for Seattle, the Rams, San Francisco, Arizona, Tampa Bay, Atlanta, New Orleans, and Carolina.
- Preserved only Stuckey’s explicit Tampa Bay NFC South winner pick as a partial ballot.
- Did not infer rankings from power ratings, projected wins, discussion order, prices, props, or wagers.
- Disclosed uncertain speaker handoffs, phonetic names, time-sensitive preseason availability, and one garbled Saints passing-yard prop rather than reconstructing it.

## Fresh append-only market evidence

Active Kalshi execution snapshot:

- Captured: `2026-08-27T15:30:38.207Z`
- File: `data/markets/20260827T153038.207Z-kalshi-nfl-execution.json`
- Snapshot ID: `kalshi-exec-20260827T153038.207Z`
- Active policy: `market-policy-2026.2`; active fee schedule: `kalshi-kxnflwins-fees-2026-07-07`
- 544 open current-season contracts, 544 full books, 1,088 normalized side quotes and 3,264 execution scenarios
- 32 teams with all 17 tails; 909 sides with a complete displayed 100-contract fill
- 1,088 like-for-like movement observations
- 99 research-qualified diagnostics; all 99 persist across captures 146.332 seconds apart; zero action candidates
- Full capture uses public market-data endpoints with `account_access=none` and `order_placement_enabled=false`
- Nine list-versus-book top-of-book values changed within the 0.370-second capture window; the full captured order book is canonical for execution

Historical sportsbook and prior ladder snapshots remain append-only, but `market-policy-2026.2`, the public manifest, generated UI imports and current market diagnostics do not select them.

Modeled market totals:

- League midpoint: 271.389; residual below the 272-game ceiling: -0.611

The residual is preserved as aggregate market incoherence rather than normalized away. Marginal team curves are not a coherent joint league distribution.

## Derived analysis

- Weighted/equal sensitivity includes all 32 teams; Baltimore moves seven ranks and Houston five.
- All 17 Kalshi tail comparisons include all 32 teams.
- At the default 11-win tail, Detroit has the largest absolute profile/tail gap at 15 ranks; 11 teams differ by at least six.
- All 12 preview ballots are compared only over source-stated positions; partial ballots remain partial.
- Ordinal podcast-versus-Kalshi analysis remains separate from probability-versus-execution diagnostics.
- Defense, an independent schedule model, execution costs and atomic claim freshness are represented. Special teams, a validated/calibrated forecast and sourced current quarterback/material-availability adjustments remain missing dimensions. Private portfolio state can be recorded locally but is not populated or connected to an account.

## Phase 3 forecast

- Source: immutable nflverse `nfldata` commit `0192370d78ba0cd9ddfb1ac19e3c5cbb2d6cef71`; raw SHA-256 `ef3f2a49c4b7739812763cd5a796c775cb0bf4b52f2fc3c74d4ef3d7fab39564`
- Input quality: 4,175 completed 2010–2025 regular-season games, 272 unique 2026 schedule games, 32 teams with 17 appearances each, zero duplicate game IDs and no market columns in the fit or schedule artifacts
- Active forecast: `fcst-2026-preseason-bf554ba7c4aee595`; model `schedule-sim-v1.0.1`; state `provisional`; 100,000 draws; decision eligible `false`
- Selected tuning parameters: 1.5-season half-life, ridge penalty 12, 21-point margin cap, fitted 1.524-point home field
- Holdout: 2022–2025; Brier 0.239761 versus league 0.247882, prior record 0.246167 and evaluation-only moneyline 0.210681; log loss 0.672423; ECE 0.043943; 80% interval coverage 0.742188; mean season rank correlation 0.372237
- Passed gates: deterministic replay, 32 exact distributions, mass/expectation reproduction, schedule coherence, completeness, Brier improvement, prior-record Brier/log loss and interval coverage
- Failed gates: calibration ECE exceeds the locked 0.040000 ceiling; sourced current quarterback/material-availability coverage is 0/32
- Structural amendment: rejected prototype `fcst-2026-preseason-36c0bb98d4bfcc74` remains labeled `research` because its continuous half-point tie band implied 8.083 ties. The active model uses the recency-weighted empirical rate and implies 0.726 tied games.

## Phase 4 Kalshi execution

- Design: `KALSHI_EXECUTION_DESIGN.md`; active policy: `config/market-policy.json`; archived prior policy: `config/market-policy-2026.1.json`
- Source snapshots: fee schedule SHA-256 `254ad33c665d3a2105632bfb8d2fdf52fbd5020fc0c0b9dffc7c74fc0f0afce3`; contract terms SHA-256 `5f40aa816ba48193a0808b4a59b7a4c02ea4708687a276520b326090f6e199ec`
- Capture: all public full books, complementary derived asks and size-aware fills at 1, 10 and 100 contracts
- Fees: per-level quadratic taker estimate rounded up to `$0.0001`, plus a conservative `$0.01` pretrade rounding reserve per non-empty order
- Research gates: complete 100-contract depth, spread at most 12 cents and forecast minus conservative break-even at least 5 cents
- Persistence gate: two qualifying captures 120–900 seconds apart; the active pair is 146.332 seconds apart
- Action gate: requires a validated and decision-eligible forecast; current action count is zero
- Safety: no credential, account, balance, position, order or fill path; no order placement
- Public UI: state strip and Win Markets execution calculator/table; all model differences are labeled provisional and lab-only
- Private UI: freezes public forecast, Kalshi snapshot and fee-schedule references while retaining manual decision entry

## Phase 5 atomic evidence

- Active ledger: `evidence-2026-ca6a8d83192f78a7`; 11 editorial sources, 270 source blocks, 972 claims and 506 normalized people
- Visible summaries: 192 scored team/category records plus 32 preview team records generated from canonical claims
- Visible evidence fragments: 732 scored plus 205 preview fragments; parity SHA-256 `a40583f1bbc0af75c7fbade5bc38675905b0dd0d19a1b03332f5a08a22dfb760`
- Source integrity: all 11 local canonical snapshot hashes matched the sanitized registry before migration; the public verification record excludes private paths
- Dispositions: 247 captured blocks, 23 ambiguity blocks, 11 full-source reviews and zero unreviewed substantive residual blocks
- Ballots and ambiguity: all 12 exact/partial ballots and all 23 source ambiguity records retained; partial ballots remain partial
- Time state: all 233 time-sensitive claims have review and stale timestamps; 42 are stale for current use
- Retirement gate: exact visible parity across all 224 summary records, zero orphan records, and no production dependency on embedded summary arrays
- Public manifest: claim-level freshness complete; state strip distinguishes current-use review debt from historical source preservation

## Phase 6 operating and learning loop

- Public workflow: five primary destinations — Today, Opportunities, Team dossiers, Markets and Research library. Existing analytical views remain available as nested Research routes.
- Today: surfaces 42 current-use evidence reviews across 19 teams, the latest immutable weekly checkpoint, quote expiry, forecast gate and learning status.
- Opportunities: correctly disabled with zero eligible actions because the forecast remains provisional and the Kalshi capture has expired; 99 persistent diagnostics remain explicitly lab-only.
- Weekly state: two content-addressed states retained. The active `weekly-2026-preseason-prior-3c7ab67d2d4db794` archives its exact public manifest and hashes each evidence, forecast, market, readiness and policy reference.
- Public learning: `learning-2026-7170edca4f4f75bf` is `awaiting_observations` with zero rows. New observations require a frozen model reference, decision-time market snapshot, retained same-side closing quote and outcome.
- Private learning: `closing_price.recorded` joins the immutable event lifecycle; entry-price CLV, realized P&L, outcome and postmortem queues are derived locally. The canonical private ledger remains empty.
- Redacted lifecycle: 13 validated fixture events cover thesis, decision, fill, closing price, close, outcome and postmortem without exposing private state.

## Local verification

- Content, evidence, market, forecast, Kalshi execution, learning, contract and private-ledger tests: 41 passed, 0 failed
- TypeScript: passed
- ESLint: passed from the configured site package
- Full `npm run verify` stack: 12 checks passed, including deterministic evidence/forecast/learning/current rebuilds, immutable weekly-reference validation, redacted private-ledger materialization and private-app build in an isolated temporary directory
- Standalone Vite build: passed; `docs/index.html` rebuilt from the generated current-state manifest
- Offline/self-contained and privacy audit: passed; 162 prospective Git-visible files currently in scope, 4,327,766-byte artifact, inline scripts/styles, no external script or stylesheet dependency, 25 private identifiers/canaries tested with zero leaks and no prohibited public patterns
- Private ledger: initialized empty, hash chain valid, zero theses and zero open positions; canonical files and app output confirmed ignored
- Private local app: build passed with Today, Theses, Portfolio and Learning; the redacted fixture covers the full CLV/outcome/postmortem lifecycle while the canonical app remains empty
- Local public report: Phase 6 verified at `127.0.0.1:8427/#opportunities`; Today shows 42 current-use reviews across 19 teams, the active weekly state, an expired Kalshi quote and zero learning observations
- Desktop: passed across the five primary workflow destinations; Team dossiers keep independent model and Kalshi distributions separate, Opportunities is honestly disabled, and there is no error overlay or console warning/error
- Mobile 390×844: passed with four full-width state cards, internally scrollable navigation and opportunity table, and no document-level horizontal overflow
- Interaction/accessibility: passed for named native controls, workflow and nested Research navigation, active hash state, zero duplicate IDs and clean browser logs
- Deployed HTTPS: passed with HTTP/2 200, HSTS, a byte-identical artifact, Edition 7/Aug. 27 content, 11 source cards, five preview cards, 32 analysis rows, 12 preview-ballot rows, five scanner rows, 15 tabs, six weight controls, 17 tail choices, zero document overflow, and clean browser logs

## Next action

Review the local Phase 6 workflow and implementation. If accepted, operate it: resolve the 42 current-use evidence reviews with sourced successor claims, capture a fresh Kalshi book before decisions, freeze a new game-week state, and append real closing-price/outcome observations only when they exist. Forecast promotion remains a separate version requiring preregistered calibration changes and sourced 32-team quarterback/material-availability adjustments; do not relax the observed gates. Do not commit, push or deploy until separately authorized.
