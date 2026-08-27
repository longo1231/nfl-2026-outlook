# 2026 NFL Outlook Field Guide

An evidence-first study report built from six Action Network 2026 NFL ranking-podcast transcripts—quarterbacks, coaching staffs, offensive lines, skill positions, offenses, and defenses—plus five scoped team-preview episodes now covering all 32 teams. It preserves exact source rankings, team-level arguments, qualifiers, public source locators, transcription ambiguities, and clearly labeled synthesis.

The current local edition keeps the six complete league-wide inputs separate from a provisional schedule forecast and a Kalshi-only execution layer. The five market-aware previews remain analysis weight 0 because their coverage and ranking schemes are incompatible; they enrich team profiles without entering the league score.

Phases 0–6 of `FOUR_LAYER_IMPLEMENTATION_SPEC.md` are implemented locally: a generated public current-state manifest, versioned policies and schemas, a 972-claim atomic evidence ledger, a market-independent provisional schedule simulation, full-book Kalshi execution math, a workflow-first public app, immutable weekly states and public/private learning contracts. The boundary remains strict: execution pricing is ready, but the forecast is not validated, so the Opportunity board is disabled and no model difference is action eligible. These local changes are not yet committed or deployed.

## Current edition

- Edition: 7
- Data through: 2026-08-27
- Editorial coverage: 192 of 192 scoring cells plus five zero-weight preview sources covering all 32 teams
- Active market scope: Kalshi `KXNFLWINS` only; sportsbook files are frozen historical evidence outside the forward pipeline
- Kalshi coverage: 544 open contracts, 544 full books, 1,088 side quotes and 3,264 size-aware scenarios
- Execution depth: 909 sides can fill the complete 100-contract reference size from displayed depth
- Diagnostics: 99 pass the research size/spread/net-edge rules and persist across two captures; 0 are action eligible
- Current-state contract: generated from the latest matching source, readiness, forecast and Kalshi execution records; the active forecast is explicitly provisional and not decision eligible
- Forecast: `schedule-sim-v1.0.1`; 100,000 coherent 2026 schedule draws; exact 0–17 distributions for all 32 teams; tuned on 2018–2021 and held out on 2022–2025
- Forecast validation: structural gates pass; Brier 0.239761 versus 0.247882 league and 0.246167 prior-record baselines; 80% interval coverage 74.2188%; calibration ECE 0.043943 misses the locked 0.040000 ceiling; sourced current-adjustment coverage is 0/32
- Weekly state: two immutable preseason checkpoints are retained; the active Phase 6 prior is `weekly-2026-preseason-prior-3c7ab67d2d4db794`
- Learning loop: source-backed public Brier/log-loss/calibration/close-delta report is implemented and truthfully awaits its first settled observation
- Private decision MVP: local-only append-only ledger and separate Today/Theses/Portfolio/Learning app with same-side close and CLV materialization; canonical ledger currently contains zero events
- Publication surface: `docs/index.html`
- Published report: https://longo1231.github.io/nfl-2026-outlook/ (still the frozen Edition 7 artifact until separately authorized publication)
- Offline behavior: self-contained; no server, package installation, or network connection is required except to open outbound source links
- Legacy reference: the prior owner-only Sites edition is preserved privately as a frozen v1 and is not part of this repository

Publication URL and commit are recorded in `CHECKPOINT.md`.

## Report sections

1. **Today** — layer readiness, current-use evidence review, market movement, weekly state, learning status and warnings.
2. **Opportunities** — validated/action-eligible rows only; currently disabled with provisional diagnostics shown separately.
3. **Team dossiers** — evidence, independent forecast distribution, Kalshi distribution, captured change and review state.
4. **Markets** — complete Kalshi ladders, exact-win distributions, totals and size/fee/persistence execution details.
5. **Research library** — briefing, Decision System, Forecast Lab, league matrix, six category rankings, previews, analysis, synthesis and source QA.

Portfolio, entry-price CLV, positions and postmortems appear only in the separate local application.

The default podcast profile converts each ordinal rank to a 0–100 strength percentile, then applies adjustable reasoned-prior importance points: quarterback 25, coaching 15, offensive line 11, skill positions 8, offense 11, and defense 30. No coefficient is learned from outcomes, sportsbook prices, or Kalshi. QB, line, skill, and the composite offense episode share a fixed 55-point offensive-family budget because the offense methodology explicitly reuses those inputs; the offense weight represents interaction and schedule context rather than a second full independent signal. The interface exposes every default and rationale and retains equal weight as a sensitivity stress test. This remains an incomplete analytical ordering—not a power rating, win forecast, calibrated probability, or bet recommendation.

Every editorial source records its kind, coverage mode, covered teams, ranking scheme, scoring eligibility, analysis weight, dependence group, market awareness, evidence, audit, and rationale. Only a complete, unique, comparable league-wide 1–32 rank or score contract can enter the profile, and eligibility does not remove the need to audit dependence. A partial or market-aware preview remains visible at weight 0; completing a set of previews does not make it scoreable unless the combined series supplies a stable comparable league-wide contract.

## Podcast × Kalshi method

For a selected Kalshi threshold `k`, every team receives its observed monotone tail probability `P(W >= k)` and a league tail rank. The report compares that rank with the weighted podcast profile rank:

```text
tail gap = Kalshi tail rank - weighted podcast profile rank
```

A positive gap means the podcast profile ranks the team more strongly than Kalshi does at that threshold; a negative gap means the Kalshi tail ranks more strongly. The view also shows market expected wins, `P(W <= 6)`, distribution standard deviation, and the equal-weight profile rank. These are ordinal research disagreements. The podcast side is never converted into an invented probability distribution.

## Independent forecast method

Phase 3 pins and hashes the nflverse `nfldata` games/schedule source, then separates three normalized artifacts: 2010–2025 results for fitting, the 272-game 2026 schedule for simulation, and 2022–2025 historical moneylines for evaluation only. Market fields never enter the fitting or simulation interfaces.

The model fits recency-weighted, ridge-shrunk team strength and home field in point units from opponent-adjusted capped scoring margins. For each simulation draw it samples one latent preseason strength per team, then plays every scheduled game with a coherent home win, away win, or empirically estimated tie. The 100,000 draws yield exact 0–17 win mass, expected and median wins, and a central 80% predictive interval.

The time split and promotion rules were written in `FORECAST_DESIGN.md` before holdout scoring. The accepted structural amendment replaces an implausible continuous tie band with the recency-weighted empirical tie rate; the rejected prototype remains labeled research history. The active version passes structure, deterministic replay, Brier/log-loss improvement, and interval-coverage gates, but misses the locked calibration gate and lacks sourced current quarterback/availability adjustments. It therefore remains `provisional`, is displayed only in Forecast Lab, and cannot create action labels.

## Market method

The active pipeline collects only Kalshi's public `KXNFLWINS` market data. Every capture appends all 544 markets and their full order books. It never requests an account, balance, position, order or fill and has no order-placement path.

Kalshi exposes YES and NO bids. The opposite side determines the executable ask:

```text
YES ask = 1 - best NO bid
NO ask  = 1 - best YES bid
```

The execution calculator walks every displayed ask level until it either fills the requested 1, 10 or 100 contracts or exhausts visible depth. It reports volume-weighted price and refuses to label a partial fill as executable for the full requested size.

The active quadratic taker-fee estimate is evaluated per fill level:

```text
fee = ceil to $0.0001 of [0.07 × contracts × price × (1 - price)]
```

The pretrade break-even adds one cent per order as a conservative reserve for fill-fragment balance rounding that cannot be known exactly in advance. The formula and source snapshot are versioned in `config/kalshi-fee-schedule.json`.

For the descriptive team curve, the report forms raw Kalshi midpoint tails, weights them by inverse spread and projects bid, ask and midpoint series separately with non-increasing isotonic regression. The team estimate is:

```text
modeled E[W] = sum from k=1 to 17 of monotone midpoint P(W >= k)
```

Adjacent monotone tails produce the exact-win density:

```text
P(W = 0)  = 1 - P(W >= 1)
P(W = k)  = P(W >= k) - P(W >= k+1)
P(W = 17) = P(W >= 17)
```

Every team profile displays those 18 probability masses, their most likely exact-win outcome and the expected-win marker. These are derived midpoint probabilities, not directly traded exact-win contracts. Team and group aggregates are descriptive market-width bounds, not confidence intervals or jointly executable portfolios.

At each exact threshold and side, the research diagnostic compares the provisional forecast probability with the conservative all-in 100-contract break-even. Research qualification requires a complete displayed fill, no more than a 12-cent spread and at least a 5-cent net model difference. Persistence requires two qualifying captures 2–15 minutes apart. Action eligibility additionally requires a validated, decision-eligible forecast, so the active snapshot has zero action candidates.

The active Kalshi marginal midpoint sum is 271.389 wins, or 0.611 below the 272-game league ceiling. The report discloses this aggregate incoherence instead of forcing separately quoted marginal curves into a joint distribution.

## Reproduce and test

The market-math tests use Node's built-in test runner and require no package installation:

```sh
npm test
```

Run a fresh append-only Kalshi execution capture:

```sh
npm run kalshi:capture
```

The command uses public series, markets and order-book endpoints. It needs no API key and writes no account response. Every run creates a new timestamped file and never overwrites market history.

The interactive React source lives in `site/`. After installing its locked dependencies, build the standalone artifact with:

```sh
npm --prefix site ci
npm --prefix site run build
```

The standalone build inlines the React bundle, data, and CSS into `docs/index.html`.

Run the reproducible offline/privacy gate after every build:

```sh
npm run artifact:audit
```

Rebuild the pinned Phase 3 forecast and current-state manifest with:

```sh
npm run evidence:build
npm run forecast:build
npm run current:build
```

Freeze an immutable preseason or game-week checkpoint and rebuild the empty-or-populated public learning report with:

```sh
npm run weekly:freeze -- preseason-prior
npm run weekly:freeze -- game-week 1
npm run learning:build
```

`npm run learning:record -- <observation.json>` accepts only a source-backed settled observation whose frozen weekly model, decision-time market snapshot and retained closing quote all reconcile. It never reads private fills or positions.

Refresh the normalized forecast inputs only when intentionally taking a new source snapshot. With no file argument, the command fetches the immutable URL in `config/forecast-source.json`:

```sh
npm run forecast:ingest -- /path/to/pinned-games.csv
```

Run the complete Phase 0–6 verification stack—deterministic evidence/forecast/learning/current rebuilds, tests, weekly reference hashes, contracts including the active 544-book snapshot, TypeScript, lint, public build/privacy audit and a redacted private-ledger build—with:

```sh
npm run verify
```

The decision-system readiness script requires the Kalshi execution snapshot and a new append-only output path; the forecast argument is optional and defaults to the snapshot reference:

```sh
npm run system:audit -- data/markets/<kalshi-execution-snapshot>.json data/audit/<timestamp>-decision-system-readiness.json data/forecasts/<forecast-version>.json
```

## Local private decision MVP

The private app code is versioned, but its ledger, materialized state, randomized privacy canaries and build output live under ignored `.private/` paths. Initialize and inspect an empty local ledger with:

```sh
npm run decision:init
npm run decision:validate
npm run decision:build
npm --prefix site run dev:decision -- --port 4174
```

Then open `http://127.0.0.1:4174`. Create an event draft and append it only after editing it locally:

```sh
npm run decision:template -- thesis.created
npm run decision:append -- .private/decision-system/drafts/<draft>.json
```

The same template command accepts every supported lifecycle event, including `thesis.revised`, `decision.watch`, `decision.pass`, `decision.approve`, `order.recorded`, `fill.recorded`, `closing_price.recorded`, `position.closed`, `outcome.recorded` and `postmortem.recorded`. Entry is manual. New templates resolve through the latest frozen weekly state. The MVP neither reads an account nor places an order.

## Project map

| Path | Purpose |
|---|---|
| `AGENTS.md` | Source-integrity, publication-safety, market-modeling, and durable-state rules |
| `SPEC.md` | Data contract, report architecture, methodology, and completion gates |
| `CHECKPOINT.md` | Current edition, exact public sources, QA, publication commit, blockers, and next action |
| `NEXT_PHASE.md` | Phase 0–6 checkpoint, remaining operating work and forecast-promotion branch |
| `META_REVIEW.md` | Decision-system readiness audit, target architecture, risks, and phased roadmap |
| `FOUR_LAYER_IMPLEMENTATION_SPEC.md` | Approved four-layer contracts, implementation phases, gates and Phase 0–6 status |
| `FORECAST_DESIGN.md` | Locked Phase 3 data split, model, validation gates, limitations, and structural amendment log |
| `KALSHI_EXECUTION_DESIGN.md` | Locked Kalshi-only Phase 4 boundary, fee, depth, persistence and eligibility design |
| `PHASE6_DESIGN.md` | Locked workflow, immutable weekly-state and public/private learning-loop boundary |
| `config/` | Versioned freshness, forecast, market, learning and source-registry policies |
| `schemas/` | Public JSON Schema documentation for current state and all four record layers |
| `lib/market-math.mjs` | Odds conversion, de-vigging, isotonic regression, probability-mass, and tail-sum functions |
| `lib/profile-market.mjs` | Extensible category weighting, profile scores, tail probabilities, distribution moments, and ranks |
| `lib/system-contracts.mjs` | Runtime contract validation and tamper-evident decision-event hashing |
| `lib/evidence-ledger.mjs` | Atomic evidence validation, freshness classification, parity hashing and generated views |
| `lib/decision-ledger.mjs` | Deterministic private thesis, position, exposure, and review-queue materialization |
| `lib/weekly-state.mjs` | Immutable content-addressed weekly state validation and indexing |
| `lib/learning-loop.mjs` | Public observation validation, Brier/log-loss/calibration and close-delta metrics |
| `lib/forecast-model.mjs` | Opponent-adjusted ridge fit, probability conversion, deterministic season simulation, baselines, calibration and invariants |
| `lib/kalshi-auth.mjs` | Private environment parsing and Kalshi RSA-PSS request signing |
| `lib/kalshi-nfl.mjs` | Kalshi ladder normalization, monotone curves, expected wins, group totals, and comparisons |
| `lib/kalshi-execution.mjs` | Complementary book normalization, level-aware fees, size-aware fills, movement and eligibility gates |
| `scripts/build-market-snapshot.mjs` | Deterministic parser and market-snapshot builder |
| `scripts/scan-kalshi-nfl.mjs` | Read-only, append-only Kalshi NFL ladder and opportunity scanner |
| `scripts/capture-kalshi-execution.mjs` | Public, unauthenticated full-book Kalshi capture and execution diagnostics |
| `scripts/audit-profile-sensitivity.mjs` | Reproducible weighted/equal and all-17-tail sensitivity audit |
| `scripts/audit-decision-system.mjs` | Reproducible source, preview, market, and decision-layer readiness audit |
| `scripts/build-evidence-views.mjs` | Deterministically rebuilds visible evidence cards from the canonical atomic ledger |
| `scripts/validate-public-artifact.mjs` | Reproducible offline/self-contained and private-identifier leak gate |
| `scripts/build-current-state.mjs` | Deterministically selects current public inputs and generates the UI import module |
| `scripts/ingest-forecast-data.mjs` | Snapshots and hashes the pinned schedule source and emits leakage-separated normalized forecast inputs |
| `scripts/build-forecast.mjs` | Tunes on the locked tuning seasons, evaluates the untouched holdout and writes versioned forecast/validation artifacts |
| `scripts/decision-ledger.mjs` | Initializes, templates, appends, validates and materializes the private local ledger |
| `scripts/freeze-weekly-state.mjs` | Archives the exact public manifest and freezes content-addressed weekly inputs |
| `scripts/build-learning-report.mjs` | Deterministically materializes the public learning report from retained observations |
| `scripts/record-learning-observation.mjs` | Appends one reconciled close/outcome observation without overwriting history |
| `scripts/verify-stack.mjs` | Concise end-to-end local verification orchestrator |
| `tests/market-math.test.mjs` | Unit tests for sportsbook math, category weighting, extensibility, and tail-shape calculations |
| `tests/kalshi-nfl.test.mjs` | Unit tests for authentication, full ladders, totals, ranks, and scanner edges |
| `tests/kalshi-execution.test.mjs` | Unit tests for fees, complementary books, depth, reserve and persistence |
| `tests/system-contracts.test.mjs` | Policy, manifest, event-chain, tamper and decision-materialization tests |
| `tests/evidence-ledger.test.mjs` | Source-block, claim, entity, time-state, ballot, parity and retirement-gate tests |
| `tests/forecast-model.test.mjs` | CSV, fit, probability, deterministic simulation, data-quality, leakage, distribution and active-version tests |
| `tests/learning-loop.test.mjs` | Weekly-state immutability plus public scoring and grouping tests |
| `data/nfl/teams.json` | Canonical NFL team, conference, division, and Kalshi-code registry |
| `data/sources/manifest.json` | Sanitized publisher provenance, hashes, and source counts |
| `data/rankings/` | Compact canonical 1–32 category orders |
| `data/previews/2026-team-previews.json` | Sanitized scoped preview metadata, exact ballots, ambiguities and generated-view references |
| `data/evidence/2026-evidence-ledger.json` | Canonical atomic claims, disposed source blocks, people, time state and generated-view contracts |
| `data/evidence/2026-generated-summaries.json` | Only production input for scored-category and preview evidence cards |
| `data/evidence/2026-evidence-audit.json` | Hash, lineage, freshness, parity, orphan and retirement-gate audit |
| `data/markets/` | Append-only timestamped market snapshots |
| `data/forecast/` | Pinned source snapshot, normalized results/schedule/evaluation inputs, adjustments and versioned forecasts |
| `data/audit/coverage.json` | Machine-readable content and market QA |
| `data/current/public-manifest.json` | Generated active public evidence, forecast, market, policy and readiness references |
| `data/current/workflow-summary.json` | Generated Today, Opportunities, weekly and learning state for the public app |
| `data/weekly/` | Immutable weekly checkpoints and archived public manifests |
| `data/learning/` | Append-only public settled observations; currently empty by design |
| `site/app/` | React report source and normalized evidence |
| `site/decision/` | Generic local-only decision UI source; it contains no canonical private records |
| `docs/index.html` | Complete offline and GitHub Pages report |

Private provenance, raw transcript snapshots, archived Sites metadata, environment files, caches, credentials, account data, positions, balances, orders, fills, and personal commit details are excluded from Git.

## Update procedure

For a new editorial episode:

1. Acquire the canonical transcript read-only and preserve a private immutable snapshot plus hash.
2. Classify coverage and ranking scheme before interpretation. Preserve any exact ballot and never convert discussion order, projections, prior finish, or odds into a ranking.
3. Extract every substantive positive, concern, qualifier, comparison, named person, methodological rule, and source locator.
4. Register the source with its coverage, scoring eligibility, market-awareness flag, dependence group, weight, and rationale. Only a comparable full-league contract can receive nonzero weight, and every new eligible source requires a dependence audit.
5. Capture a new append-only Kalshi execution snapshot; never overwrite history.
6. Rebuild current state and recompute expected wins, group totals, market ranks, execution scenarios, movement and persistence.
7. Run the content audit, market tests, Vite build, privacy scan, and desktop/mobile browser checks.
8. Commit and publish the updated `docs/` artifact; record the commit and URL in `CHECKPOINT.md`.

## Known source exceptions

- One garbled Jordan Love rate claim is described but not numerically reconstructed.
- The offensive-line name “Keelan Rutledge” is retained as a transcript-derived possible error.
- The skill transcript's “Caslat” is cautiously normalized to Isaac TeSlaa.
- Cleveland's second rookie reference is cautiously normalized to Harold Fannin Jr.
- One garbled Saints backfield name is omitted rather than guessed.
- The coaching source carries implausible private-library publication metadata; episode content and the immutable snapshot determine the edition.
- The NFC East transcript contains several unclear personnel names, one garbled Dallas offseason sequence, and a few inferential speaker handoffs; none is silently normalized.
- The AFC Part 1 library item did not contain a creator transcript. Analysis used a private machine working copy of canonical publisher audio; systematic name errors are disclosed, numeric claims were spot-checked, and uncertain names were omitted.
- AFC Part 1 covers the AFC West and AFC East. It states one complete AFC East ballot, one partial ballot, and no AFC West finish order.
- AFC Part 2 has a complete creator transcript covering the AFC South and AFC North. Its exact numeric Houston/Jacksonville projection passages are garbled, so they remain unresolved; only three clearly stated winner-only ballots are retained.
- The two AFC episodes cover all 16 conference teams but do not state a comparable 1–16 AFC ranking, so both remain weight 0.
- The offense creator transcript contains several phonetically garbled personnel and coach references. They remain disclosed in evidence context; no uncertain name is silently substituted.
- The defense creator transcript contains scattered garbled names and one implausible Ravens return reference. A brief Rams “No. 4” slip is resolved only because the explicit list and top-ten recap both establish Baltimore fourth and the Rams fifth.
- The NFC North creator transcript supplies three complete, speaker-specific division ballots. Cousin Sal explicitly withheld his picks for another show, so no ballot—complete or partial—is inferred for him.
- NFC Part 1 covers the NFC West and NFC South. It supplies only Stuckey's Tampa Bay winner pick, no NFC West order, and no complete NFC South ballot; a garbled Saints passing-yard threshold is excluded and uncertain names remain disclosed.

Market information is a timestamped research input, not advice or an instruction to place a wager. Prices can move after capture.
