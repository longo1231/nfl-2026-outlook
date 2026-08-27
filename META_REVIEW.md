# 2026 NFL Outlook Field Guide — decision-system meta review

Status: Edition 7 baseline review, 2026-08-27

## Bottom line

The Field Guide is already a strong **auditable research source of truth**: it preserves canonical source evidence, enforces ranking and preview contracts, keeps market snapshots append-only, separates market-aware previews from scoring, and makes the current weighting assumptions visible.

It is **not yet a calibrated forecast, execution, or portfolio source of truth**. It cannot currently answer five questions that must be answered before a futures wager:

1. What is the current fair probability or fair-price range, with uncertainty?
2. What changed since the last view, and is every supporting fact still fresh?
3. At what executable price does the thesis become actionable after fees and slippage?
4. What would invalidate the thesis, and how much correlated risk is already owned?
5. Did prior decisions beat the closing market and produce calibrated forecasts?

The right next move is not another composite-score tweak. It is to separate the system into four explicit layers—evidence, forecast, market, and private decision/portfolio—and give each layer its own data contract, freshness policy, and validation standard.

## Intended use and grain

Primary use:

- Make and monitor 2026 NFL futures decisions before the season.
- Preserve the preseason thesis through the first few weeks without overreacting to small samples.
- Compare current market prices with an explicit, revisable view of team outcomes.
- Retain enough history to judge process quality, closing-line value, calibration, and results.

Required analytical grain:

```text
team × evidence source × effective time × captured time × market contract
```

The future private decision layer adds:

```text
wager × venue × side × threshold × quoted price × executable size × decision time
```

The current system handles the first grain well at source and market-snapshot level, but not yet at atomic claim level. It does not implement the second grain.

## Current data-quality profile

Edition 7 passes the following structural checks:

- 11 unique editorial sources: six scoring sources and five zero-weight previews.
- 192/192 scoring cells represented across six complete, unique 1–32 contracts.
- Preview coverage now reaches all 32 teams with one preview evidence record per team.
- 12 source-stated preview ballots: seven complete and five partial; no unstated ranks are inferred.
- 205 preview evidence fragments retained across positive, concern, and context fields.
- 32/32 sportsbook teams have paired primary quotes; 13 have multiple observed thresholds.
- 32/32 Kalshi teams have all 17 tails, for 544 current-season contracts.
- The new paired captures are 19.007 seconds apart.
- The current Kalshi marginal midpoint sum is 271.080 wins, 0.920 below the 272-game ceiling; the inconsistency remains disclosed rather than normalized away.

Important contract gap:

- Zero preview team records currently have atomic claim IDs/source locators.
- Zero preview team records currently have a normalized people index.

That means the preview presentation is useful and faithfully summarized, but it does not yet satisfy the specification's strongest claim-level auditability standard.

The reproducible machine-readable profile is the timestamped decision-system readiness audit in `data/audit/`.

## What is trustworthy now

### Evidence layer — ready with documentation debt

Strong:

- Canonical source snapshots are private, immutable, and hashed before interpretation.
- Public provenance is sanitized and checksum-backed.
- Scoring eligibility requires a complete comparable league-wide contract.
- Dependence and market awareness are explicit registry fields.
- Offense is discounted inside a fixed offensive-family budget instead of counted as an independent full signal.
- Preview ballots remain speaker-specific and partial ballots remain partial.

Debt:

- Preview evidence is stored as team-level summaries rather than atomic source-linked claims.
- Claim confidence, effective date, review date, and supersession are absent.
- Category and preview evidence do not share one uniform normalized schema.

### Market layer — usable with guardrails

Strong:

- Same-book Over/Under pairs are de-vigged before aggregation.
- Kalshi tails use executable bid/ask data and complete pagination.
- Raw and monotone curves, exact-win densities, modeled expected wins, group totals, and aggregate incoherence are audited.
- Sportsbook-versus-Kalshi scanning is separate from podcast evidence.
- History is append-only.

Guardrails still needed:

- The source board exposes capture time, not per-quote age.
- Candidate edges are pre-fee and do not include slippage.
- The filter requires positive displayed size but has no minimum executable size or notional. The current list includes rows with only one or six contracts displayed.
- A one-snapshot difference is not evidence that an edge persisted long enough to execute.
- The dashboard does not yet show price movement across retained snapshots.

### Current weighting layer — transparent research prior, not forecast

Strong:

- Defaults are visible, adjustable reasoned priors.
- Offensive reuse is explicitly discounted.
- Equal weighting remains available as a sensitivity test.
- Every derived ordering is labeled non-probabilistic.

Limitations:

- Converting ranks to evenly spaced percentiles assumes the distance between every adjacent rank is equal.
- The source categories still have unmeasured covariance; coaching overlaps both sides of the ball, and schedule appears only indirectly.
- Source confidence varies by tier and team, but the score treats each ordinal rank as equally certain.
- No coefficient has been trained or validated on outcomes or closing prices.

The current profile should remain a **research index**. It should not be rescaled into fair win probabilities.

## Highest-risk findings

### P0 — no private decision contract

Risk: the dashboard can surface information and market differences, but cannot record why a bet was or was not made, the acceptable price, the invalidation condition, or existing correlated exposure.

Smallest useful remediation:

- Add a private, ignored decision ledger.
- Required fields: thesis ID, team/market/side/threshold, fair-price range, target and limit price, catalyst, invalidation rule, confidence, stake/risk cap, decision timestamp, quoted venue/price/size, and links to evidence/model versions.
- Never publish positions, balances, orders, fills, account data, or private strategy notes.

### P0 — no freshness and supersession contract

Risk: preseason injuries, depth charts, quotes, forecasts, and evergreen methodology decay at different rates. A single “data through” date makes stale evidence look current.

Smallest useful remediation:

- Add `source_event_at`, `effective_at`, `captured_at`, `review_due_at`, `stale_after`, `supersedes`, and `status` to mutable evidence.
- Show fresh / review due / stale badges in every team dossier.
- Generate a current-state manifest that selects the active editorial, injury/news, forecast, sportsbook, and Kalshi snapshots.

### P1 — no calibrated forecast layer

Risk: ordinal disagreement with Kalshi is informative, but it is not an edge. The system has no independent fair probability to compare with price.

Smallest useful remediation:

- Preserve the current evidence profile unchanged.
- Add a separate probabilistic baseline: team win distribution, division/conference/Super Bowl probabilities, uncertainty interval, version, and inputs.
- Begin with explicit priors and shrinkage. Do not learn weights until historical training and holdout data exist.
- Validate with Brier score, log loss, calibration curves, rank correlation, and comparison with closing market baselines.

### P1 — claim-level lineage is incomplete for previews

Risk: team summaries can be checked manually against the source, but the system cannot mechanically prove that every claim has a locator, person, polarity, confidence, and disposition.

Smallest useful remediation:

- Migrate preview summaries into atomic claims.
- Preserve the current summaries as generated views.
- Add automated orphan-block, locator, people-index, and claim-disposition checks.

### P1 — market candidates are not yet execution-aware

Risk: a pre-fee theoretical difference with minimal size or uncertain quote age can look more actionable than it is.

Smallest useful remediation:

- Add fees, minimum size/notional, quote age, best executable price, and slippage assumptions.
- Require persistence across two or more closely spaced snapshots for the primary action list.
- Keep thin or one-shot differences in a separate watchlist.

### P2 — no feedback and calibration loop

Risk: persuasive narratives and prior weights cannot be distinguished from repeatable signal.

Smallest useful remediation:

- Preserve decision-time forecasts and prices immutably.
- Record closing prices, CLV, outcomes, and forecast scores by model/source version.
- Review performance by market type, horizon, confidence, evidence family, and price band—not only by profit and loss.

### P2 — duplicated configuration can drift

Risk: weights, edition labels, counts, source metadata, and current market paths are repeated across UI code, audit scripts, manifests, and prose documents.

Smallest useful remediation:

- Create one canonical public registry and one generated current-state manifest.
- Generate coverage audits and UI source metadata from those files.
- Add CI gates for tests, lint, TypeScript, build, privacy, offline behavior, and schema consistency.

## Target four-layer architecture

### 1. Evidence ledger

Purpose: what reputable sources said, with exact lineage and as-of status.

Contains:

- Immutable source snapshot and hash.
- Atomic claim records with team, people, polarity, qualifier, confidence, source locator, effective date, and review date.
- Exact rankings and ballots as source contracts.
- Independence group and market-awareness flags.

Does not contain:

- Fair probabilities.
- Bet recommendations.
- Personal positions.

### 2. Forecast layer

Purpose: what the system currently believes about outcome probabilities.

Contains:

- Preseason priors and weekly posterior versions.
- Team win distributions and futures probabilities.
- Uncertainty and scenario ranges.
- Explicit input versions and update rules.
- Backtest and calibration metrics.

The current weighted profile remains an input/diagnostic, not the forecast itself.

### 3. Market and pricing layer

Purpose: what can be bought or sold, where, at what price and size.

Contains:

- Append-only quotes and exchange books.
- De-vigged same-book consensus.
- Best executable price, size, fees, slippage, age, and movement.
- Model-versus-market and market-versus-market comparisons kept separate.

### 4. Private decision and portfolio layer

Purpose: what Stephen intends to do, owns, risks, and learns.

Contains:

- Thesis, target, limit, catalyst, invalidation, confidence, stake and correlated exposure.
- Decision, order, fill, close and outcome timestamps.
- CLV, outcome, and postmortem.

This layer must remain ignored and must never enter the public artifact.

## Recommended presentation

The primary navigation should become workflow-first while retaining the deep reference views:

1. **Today** — freshness, changed evidence, changed prices, active review items, and system warnings.
2. **Opportunity board** — model-versus-market only after a calibrated forecast exists; current scanner remains a market-versus-market research module.
3. **Team dossiers** — current thesis, forecast range, market curve, catalysts, invalidation, evidence, and change history.
4. **Markets** — complete curves, movement, liquidity, group totals, and execution detail.
5. **Portfolio** — private positions, exposure and review queue.
6. **Research library** — matrices, category rankings, previews, synthesis, sources, and QA.

Edition 7 adds a visible Decision System section so the present boundary and roadmap are not hidden. A larger navigation redesign should follow the private decision and freshness schemas, because the new workflow needs real decision data rather than new labels around the current content.

## Early-season update policy

To avoid throwing away strong priors after one or two games:

- Freeze the preseason prior as an immutable version.
- Create weekly snapshots rather than rewriting preseason evidence.
- Update injuries and availability immediately, with short stale-after windows.
- Update team strength with opponent- and situation-adjusted performance, using explicit shrinkage toward the preseason prior.
- Keep descriptive results, process metrics, and market movement separate.
- Do not infer a large team-quality change from raw record, one-score result, turnover margin, or unsustainable red-zone performance alone.
- Record every model and decision version before games begin.

## Automated gates to add

Already present or strengthened in Edition 7:

- Unique source IDs.
- Complete 1–32 scoring contracts.
- All-team preview coverage.
- Ballot rank/team uniqueness and covered-team integrity.
- Scoring weights sum to 100.
- Paired sportsbook and complete Kalshi coverage.
- Append-only audit output.
- Privacy and publication checks.

Next gates:

- Every atomic claim has a valid locator, effective time, confidence, and disposition.
- Every mutable record has a review date and stale state.
- Current-state manifest selects exactly one active snapshot per required feed.
- No market candidate enters the action list without fee-adjusted edge, minimum size, quote age, and persistence.
- Forecast distributions are valid and reproduce aggregate events consistently.
- Model versions have calibration and holdout metrics before coefficients are called learned.
- Public builds contain no private decision or account data.

## Recommended sequence

1. **Now / Edition 7:** finish all-team preview coverage, expose the decision-system boundary, add the reproducible readiness audit, and keep current market evidence fresh.
2. **Before placing/monitoring futures in the dashboard:** implement the private decision ledger and current-state/freshness manifest.
3. **Before Week 1:** add a forecast interface with explicit priors and uncertainty, even if the first model is deliberately simple.
4. **Weeks 1–4:** add immutable weekly updates, opponent adjustment, injury/news review queues, and price movement.
5. **Ongoing:** record closing prices and outcomes, evaluate calibration/CLV, and only then test learned coefficients against the transparent reasoned-prior baseline.

## Assumptions and open decisions

- The public GitHub Pages report remains a research artifact; personal decisions and positions stay private and local.
- The current six-source weighted profile remains available as a transparent diagnostic even after a forecast model is added.
- A “truth” label should mean reproducible provenance and explicit as-of state—not certainty.
- The first private decision ledger can be local structured data; no account integration is required to make it useful.
- The main open design choice is whether the eventual private dashboard is generated into a separate local artifact or injected as an ignored overlay into the same UI. The separate local artifact is safer by default.
