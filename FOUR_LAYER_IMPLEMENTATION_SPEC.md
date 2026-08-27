# 2026 NFL Outlook Field Guide — four-layer implementation specification

Status: approved; Phases 0–6 implemented locally on 2026-08-27
Based on: `META_REVIEW.md`, Edition 7 baseline, 2026-08-27

Implementation status:

| Phase | State | Result |
|---|---|---|
| 0 | Complete | Edition 7 baseline rebuilt byte-identically; consolidated verification command added. |
| 1 | Complete | Schemas, versioned policies, deterministic public manifest, generated UI imports and visible degraded/freshness state added. |
| 2 | Complete | Ignored hash-chained ledger, deterministic materializations, manual CLI workflow and separate local app added. Canonical ledger is empty. |
| 3 | Complete as provisional | Independent schedule simulator, exact-win distributions, time-split validation, versioned artifacts and a lab-only UI are implemented. Calibration does not yet pass the validated-model promotion gate. |
| 4 | Complete | Kalshi-only full-book capture, depth-aware 1/10/100-contract execution, versioned fees, movement, persistence and fail-closed action gating are implemented. |
| 5 | Complete | 972 atomic claims, 270 disposed source blocks, 506 people, generated-view parity, full-source residual review and claim-level freshness are implemented. |
| 6 | Complete as operating infrastructure | Five-part public workflow, private Learning view, two immutable preseason states and public/private learning contracts are implemented. Real 2026 observations remain empty until source-backed closes and settlements exist. |

Nothing in the Phase 0–6 implementation was committed, pushed, deployed, connected to an account or used to place an order.

## 1. Recommendation

Build the decision system as four explicit layers joined by versioned references, not as one larger dashboard:

1. **Evidence ledger** — what sources said and whether each claim is still decision-relevant.
2. **Forecast layer** — the system's independent, probabilistic view of outcomes.
3. **Market and pricing layer** — what is currently executable, including cost, size, age and movement.
4. **Private decision and portfolio layer** — what Stephen believes, intends, owns, risks and learns.

The public Field Guide remains the evidence, forecast and market research artifact. The private layer renders as a separate local-only application and may consume public outputs, but the public build must have no import path, runtime fetch or generated reference to private data.

The existing weighted podcast profile remains unchanged as an ordinal research index. It may be displayed beside a forecast, but it is not converted into win probabilities and is not allowed to create an action candidate.

## 2. System boundary and dependency rules

```text
immutable sources
      |
      v
evidence ledger ---------> forecast versions ---------+
      |                         |                      |
      |                         v                      v
      +------------------> team dossiers       model/market comparison
                                                        |
append-only quotes ------> market/pricing --------------+
                                                        |
                                                        v
                                      private decision/portfolio ledger
                                                        |
                                                        v
                                      CLV, outcomes and process review
```

Required dependency rules:

- Evidence never contains a forecast, market recommendation or personal decision.
- The forecast model may reference evidence versions, but the first independent model must not use sportsbook or exchange prices as features. Markets are evaluation benchmarks and comparison inputs only.
- Market normalization never reads editorial opinion or private positions.
- The private layer may read all three public layers. Nothing outside the private layer may read private data.
- Outcome and closing-price records evaluate frozen versions; they never rewrite a prior forecast or decision.
- Every derived artifact names its exact input versions. No UI module selects files directly by a hard-coded latest filename.

## 3. Shared contracts

### 3.1 Identity and time

- Use stable, opaque record IDs. Human-readable labels are attributes, not keys.
- Store canonical timestamps as RFC 3339 UTC. Convert to America/New_York only for display.
- Distinguish:
  - `source_event_at`: when the real-world event or source statement occurred.
  - `effective_at`: when the record became decision-relevant.
  - `captured_at`: when the system acquired it.
  - `recorded_at`: when the normalized record was written.
  - `review_due_at`: when a human or process should reassess it.
  - `stale_after`: when it becomes ineligible for current decisions.
- Never overwrite history. Corrections and updates create a new record with `supersedes` and preserve the prior record.

### 3.2 Status vocabulary

Mutable records use one of:

- `active`
- `review_due`
- `stale`
- `superseded`
- `retracted`
- `ambiguous`

The source statement itself remains historically true even after its real-world subject becomes stale. For example, an Aug. 26 injury claim remains a faithful source fact while becoming stale for an Aug. 30 decision.

### 3.3 Current-state manifests

Generate two manifests:

- `data/current/public-manifest.json` selects the active evidence snapshot, forecast version, Kalshi execution snapshot, policies and warnings used by the public build.
- `.private/current/private-manifest.json` selects the public manifest plus the active thesis, decision and portfolio materializations used by the local build.

The public manifest contract contains:

```json
{
  "schema_version": 1,
  "season": 2026,
  "generated_at": "<UTC timestamp>",
  "policy_versions": {
    "freshness": "freshness-2026.1",
    "forecast": "forecast-policy-2026.1",
    "market": "market-policy-2026.2"
  },
  "evidence": {"snapshot_id": "<id>", "status": "review_due"},
  "forecast": {"version_id": "<id>", "status": "provisional", "decision_eligible": false},
  "markets": {
    "kalshi": {
      "snapshot_id": "<id>",
      "summary_path": "data/current/kalshi-execution-summary.json",
      "fee_schedule_id": "<id>",
      "reference_contract_count": 100,
      "research_qualified_diagnostics": 0,
      "persistent_research_diagnostics": 0,
      "action_eligible_candidates": 0
    }
  },
  "readiness": {"audit_id": "<id>", "status": "degraded"},
  "warnings": ["<visible readiness or eligibility warning>"]
}
```

Generation fails unless every required reference exists, resolves to the expected season, passes schema validation and has an unambiguous active version. A missing or stale layer produces a visible degraded state; it never silently falls back to an older file.

### 3.4 Policies as data

Add versioned public configuration rather than embedding thresholds in UI components:

- `config/freshness-policy.json`
- `config/forecast-policy.json`
- `config/market-policy.json`
- `config/source-registry.json`

Each generated record stores the policy version used. Changing a threshold is therefore auditable and cannot retroactively alter a historical candidate.

### 3.5 Validation states

Each layer reports three separate results:

- `schema_valid`: the record has the required shape.
- `quality_valid`: its domain invariants pass.
- `decision_eligible`: it is fresh and meets the stricter rules for current use.

A record may remain useful historical research even when `decision_eligible=false`.

## 4. Layer 1 — evidence ledger

### 4.1 Purpose

Preserve what reputable sources said with exact public-safe lineage, while separately tracking whether time-sensitive claims still deserve attention.

### 4.2 Canonical records

The evidence layer contains:

- source documents and immutable snapshot hashes;
- stable source blocks with public-safe locators;
- atomic claims;
- exact ranking and ballot contracts;
- normalized people and entity records;
- claim dispositions, review state and supersession history;
- generated team and category summaries.

The existing six 1–32 rankings remain canonical source contracts. Phase 5 verified the former embedded summaries against the Edition 7 visible baseline before retiring them from production.

### 4.3 Atomic claim contract

```json
{
  "claim_id": "clm_<opaque-id>",
  "season": 2026,
  "source_id": "action-nfc-preview-part-1",
  "source_block_id": "blk_<opaque-id>",
  "source_locator": {"kind": "line-range", "start": 120, "end": 128},
  "team_ids": ["TB"],
  "entity_ids": ["person_<opaque-id>"],
  "category": "injury-availability",
  "claim_type": "contingency",
  "paraphrase": "<faithful public-safe paraphrase>",
  "speaker": "<name or null>",
  "polarity": "negative",
  "confidence": "medium",
  "qualifier": "<condition or null>",
  "source_event_at": "<UTC timestamp or null>",
  "effective_at": "<UTC timestamp>",
  "captured_at": "<UTC timestamp>",
  "recorded_at": "<UTC timestamp>",
  "review_due_at": "<UTC timestamp or null>",
  "stale_after": "<UTC timestamp or null>",
  "status": "active",
  "supersedes": null,
  "ambiguity_note": null
}
```

`source_locator` must never expose a private Reader ID or private filesystem path. A locator may be a public transcript timecode, a stable private block ID represented by a public-safe alias, or a line range within the hashed canonical snapshot.

### 4.4 Freshness classes

The freshness policy assigns a class, not one universal time-to-live:

- `immutable-source-opinion`: no automatic expiry; remains a historical statement.
- `methodology-or-ranking`: valid for the named edition/season unless superseded.
- `roster-role-or-depth`: short review window; configurable default 72 hours in the preseason and game week.
- `injury-or-availability`: configurable default 24 hours and immediate review when a newer source is captured.
- `transaction`: active from its effective time until superseded; review if role implications are unresolved.
- `projection-or-contingency`: review at its stated catalyst or the next team event.

These defaults are proposed policy values, not hidden constants. The manifest reports overdue and stale counts by team and claim class.

### 4.5 Generated views

Only generated views feed the UI:

- current claims by team;
- changed claims since the previous manifest;
- people/entity index;
- claim history and supersession chain;
- positives, concerns, context and ambiguity summaries matching the current presentation;
- evidence coverage and freshness audit.

### 4.6 Evidence gates

- Every claim resolves to a source and source block.
- Every named entity resolves to the entity registry.
- Every source block has a disposition: `captured`, `non-substantive` or `ambiguous`.
- Every time-sensitive claim has `effective_at`, `review_due_at` and `stale_after`.
- Supersession chains are acyclic and preserve all prior versions.
- Complete ranking contracts remain exact unique `1..32` orders.
- Partial ballots remain partial; no unstated position is generated.
- Generated preview summaries match the Edition 7 visible baseline before the hand-written summaries are retired.

### 4.7 Explicit non-goals

- No source opinion is turned directly into a fair probability.
- No private notes, Reader locators or raw transcript payload enter public data.
- No automated current-roster lookup silently edits a source claim.

## 5. Layer 2 — forecast layer

### 5.1 Purpose

Produce an independent, versioned probability distribution over team outcomes with uncertainty and reproducible validation. This is the only layer allowed to call a number a model fair probability.

### 5.2 Model states

Every model version has one of three states:

- `research`: the contract or simulator is under development.
- `provisional`: distribution and reproducibility gates pass, but historical validation is incomplete or inadequate.
- `validated`: preregistered time-split evaluation and calibration gates pass.

Only a `validated` model may feed the primary model-versus-market opportunity board. Research and provisional forecasts may appear in a clearly labeled lab view and may be referenced manually in the private ledger, but cannot create an automated action label.

### 5.3 Recommended first model

Use a market-independent schedule simulation, not a transformation of the podcast ranks and not a copy of Kalshi expected wins.

Recommended structure:

1. Estimate a posterior team-strength distribution from historical, opponent-adjusted team performance and an explicit preseason prior.
2. Apply versioned quarterback availability, material roster/injury and home-field inputs.
3. Convert paired team strengths into game win/tie probabilities.
4. For each simulation draw, sample latent team strengths, then simulate the complete NFL schedule so each game produces one coherent result.
5. Aggregate exact regular-season win distributions first. Add division, playoff, conference and Super Bowl probabilities only when schedule, tiebreaker and postseason rules are implemented and tested.

Sampling latent strength on each season simulation is important: it carries team-level uncertainty across games instead of pretending every game probability is known exactly.

The weighted editorial profile remains a side-by-side diagnostic. It does not enter the first model coefficient set. It may become a candidate feature only after a historical version of the feature exists and improves a time-split holdout against the simpler baseline.

### 5.4 Forecast inputs

Required, each with version and as-of time:

- official 2026 schedule and venue designation;
- historical game results and chosen opponent-adjusted performance features;
- team and quarterback priors;
- player/quarterback availability adjustments;
- home-field and tie assumptions;
- simulator seed, draw count and code version.

Sportsbook and exchange prices are excluded from model features. They are retained as baselines for honest comparison.

### 5.5 Forecast version contract

```json
{
  "forecast_version_id": "fcst_<opaque-id>",
  "season": 2026,
  "model_id": "schedule-sim-v1",
  "model_state": "provisional",
  "as_of": "<UTC timestamp>",
  "generated_at": "<UTC timestamp>",
  "code_commit": "<git commit or working-tree fingerprint>",
  "input_versions": ["<versioned refs>"],
  "policy_version": "forecast-policy-2026.1",
  "seed": 20260827,
  "draws": 100000,
  "teams": [{
    "team_id": "TB",
    "win_probability_mass": ["<18 values for W=0..17>"],
    "expected_wins": 8.4,
    "median_wins": 8,
    "interval_80": [6, 11]
  }],
  "validation_report_id": "<id or null>",
  "warnings": []
}
```

The output must distinguish posterior uncertainty intervals from market bid/ask width. They are different concepts and use different visual treatments.

### 5.6 Forecast gates

- Each team's exact-win mass has 18 nonnegative values summing to one.
- Expected wins reproduce from the mass function.
- Each simulated regular-season game has a coherent winner/tie outcome; aggregate team wins reproduce the schedule total after ties.
- Repeated generation with the same inputs and seed is deterministic.
- Training, tuning and holdout seasons are time-separated and recorded before results are evaluated.
- Report Brier score, log loss, calibration/reliability, interval coverage and rank correlation where applicable.
- Compare with preregistered naive, prior-season and market baselines without using those market prices as model features.
- Promotion to `validated` requires documented holdout criteria in the versioned forecast policy; it is not a subjective UI toggle.

### 5.7 Explicit non-goals

- No rescaling of the current 0–100 profile into expected wins.
- No learned editorial weights without historical versions and holdout evidence.
- No playoff or championship probabilities from incomplete tiebreaker/bracket logic.
- No claim that a calibrated model is automatically profitable.

## 6. Layer 3 — Kalshi market and execution layer

### 6.1 Purpose

Represent what could actually be bought on Kalshi at a stated time, side, price and size. Sportsbook snapshots remain immutable historical Edition 7 evidence but are removed from active collection, current-state selection and comparison logic.

### 6.2 Records

The layer contains:

- append-only Kalshi series, market and full order-book snapshots;
- all 544 KXNFLWINS contracts: 32 teams × 17 at-least-win thresholds;
- normalized YES and NO bids plus asks derived from the complementary bid book;
- size-aware buy scenarios at 1, 10 and 100 contracts, with 100 as the primary reference size;
- a versioned quadratic taker-fee rule and a conservative one-cent pretrade rounding reserve;
- five-minute capture-time freshness, cross-snapshot price movement and two-capture persistence;
- model-versus-market research diagnostics with every failed gate recorded;
- source contract-terms and fee-schedule PDFs snapshotted and hashed before interpretation.

### 6.3 Quote contract

```json
{
  "quote_id": "qte_<opaque-id>",
  "snapshot_id": "mkt_<opaque-id>",
  "venue_id": "kalshi",
  "contract_id": "<canonical contract id>",
  "team_id": "TB",
  "market_type": "regular-season-wins-tail",
  "threshold": 9,
  "side": "yes",
  "bid": 0.51,
  "ask": 0.54,
  "bid_size": 100,
  "ask_size": 25,
  "executable_asks": [{"price": 0.54, "contracts": 25}],
  "execution_scenarios": [
    {
      "requested_contracts": 100,
      "full_fill": false,
      "volume_weighted_price": 0.54,
      "formula_fee_estimate": 0.4347,
      "conservative_rounding_reserve": 0.01,
      "conservative_break_even_probability": 0.5578
    }
  ],
  "source_quote_at": null,
  "captured_at": "<UTC timestamp>",
  "recorded_at": "<UTC timestamp>",
  "source_time_confidence": "capture-time-only",
  "fee_schedule_id": "<versioned id>",
  "stale_after": "<UTC timestamp>",
  "status": "active"
}
```

The canonical order book stores bids only because YES offers are the complement of NO bids and vice versa. Derived asks remain traceable to the captured book. A requested size never receives a full-fill label unless visible depth supplies all requested contracts; there is no extrapolated liquidity.

### 6.4 Comparison types

There is one active derived product:

- `model_market_candidate`: the forecast tail probability versus the all-in Kalshi buy break-even for an exact contract, side and requested size.

While the forecast is provisional, the same record may be shown only as a `research_qualified` diagnostic. It cannot be action eligible. The prior sportsbook-versus-Kalshi scanner is frozen historical code and data, not an active Phase 4 product.

Each comparison freezes:

- input quote and forecast IDs;
- side and exact threshold;
- best executable price and displayed size;
- gross edge;
- fee estimate and fee-policy version;
- slippage or top-of-book size limit;
- net edge and uncertainty allowance;
- capture age and source-time confidence;
- persistence observation IDs;
- eligibility result and every failed gate.

### 6.5 Implemented default gates

`config/market-policy.json` version `market-policy-2026.2` implements:

- Kalshi KXNFLWINS is the only active venue/series;
- capture age is at most five minutes because the endpoint does not expose source quote time;
- the requested 100-contract reference size must be fully supplied by visible book depth;
- the displayed spread must be no more than 12 cents for a research diagnostic;
- model probability minus the conservative all-in break-even must be at least 5 cents for a research diagnostic;
- the direction must survive two qualifying captures 2–15 minutes apart;
- the fee schedule must be versioned and match the snapshot;
- the referenced forecast must be `validated` and `decision_eligible=true` before action eligibility;
- account access is `none` and order placement is disabled.

Fees use `ceil(0.07 × contracts × price × (1 − price), $0.0001)` for the active series multiplier of one. The implementation walks each fill level separately, then adds a conservative one-cent reserve because exact fill-fragment balance rounding and later rebates are not available before trading. This is deliberately more conservative than displaying the formula fee alone.

### 6.6 Market gates

- Raw snapshots remain append-only.
- Every normalized quote resolves to a raw snapshot and contract.
- Fee results reproduce from a versioned venue rule sourced from current primary documentation at implementation time.
- Movement compares like-for-like venue, contract and side.
- Persistence never treats duplicate reads from one capture as independent observations.
- A candidate records all failed gates, not just a boolean result.
- Group win totals and exact-win densities retain current mathematical invariants.
- Public capture never requests account, balance, position, order or fill data and cannot place an order.
- The full live snapshot validates as exactly 544 contracts, 544 books, 1,088 side quotes and one diagnostic per side.

## 7. Layer 4 — private decision and portfolio layer

### 7.1 Purpose

Record what Stephen considered, believed, decided, executed, owns and learned without allowing any personal state into the public repository or Pages artifact.

### 7.2 Deployment decision

Use a separate local-only artifact by default:

- versioned application code may live in the repository;
- canonical private records and generated private output live under `.private/decision-system/`;
- the app reads the public current-state manifest plus the private manifest;
- it binds to localhost for active use and may also generate a self-contained ignored file;
- the public `site/` build has no private imports or feature flag that can accidentally turn them on.

This is safer than injecting an ignored overlay into the public application bundle.

### 7.3 Event ledger

Use append-only JSON Lines as the canonical MVP store, with generated current-state JSON views. This is portable, diffable locally, easy to back up and does not require account or database integration.

Event types:

- `thesis.created`
- `thesis.revised`
- `thesis.invalidated`
- `decision.watch`
- `decision.pass`
- `decision.approve`
- `order.recorded`
- `fill.recorded`
- `position.marked`
- `position.closed`
- `outcome.recorded`
- `postmortem.recorded`

Every event contains an opaque event ID, entity ID, UTC occurrence and record times, actor, prior event hash, public input references and a payload appropriate to its type. Corrections append compensating events; they do not edit history.

### 7.4 Thesis and decision contract

At minimum, a contemplated wager must record:

- thesis ID and lifecycle state;
- team, venue, market, side and threshold;
- linked evidence snapshot and specific supporting/contrary claim IDs;
- linked forecast and quote IDs;
- fair-price range, target price and hard limit price;
- catalyst and expected decision horizon;
- explicit invalidation rule;
- confidence with a written reason;
- stake/risk cap and unit convention;
- correlation tags such as team, division, conference, quarterback, injury or common thesis driver;
- decision timestamp and quoted price/size;
- pass reason when no wager is made.

Recording passes is required for process evaluation; otherwise the ledger only remembers bets and cannot reveal selection bias.

### 7.5 Portfolio materializations

Generate, never hand-maintain:

- open positions and maximum loss/payout;
- exposure by team, division, conference, market type and correlation tag;
- remaining user-defined risk capacity;
- theses awaiting catalyst, review or invalidation checks;
- positions with stale forecasts or market marks;
- closing-line value, outcome and postmortem queues.

The MVP does not infer diversification from team count. Shared quarterback, division, conference and narrative drivers remain visible correlation tags until a defensible covariance model exists.

### 7.6 Privacy and safety gates

- `.private/decision-system/` and all private build output are ignored before the first record exists.
- Use public redacted fixtures for tests; tests never read canonical private records.
- The public build and audit fail if any module imports `.private`, private-manifest names, position fields or private output paths.
- Existing artifact privacy scanning expands to thesis IDs, order/fill fields and representative canary values.
- No balance, position, order, fill, account response, token, key path or personal note is written to logs.
- MVP storage relies on local filesystem permissions and backups; it does not claim encryption at rest. Encryption can be a later explicit decision.
- No brokerage/exchange order placement is in scope. Initial order and fill entry is manual and read-only market access remains unchanged.

## 8. User experience after the layers exist

The workflow-first navigation from the meta review should be implemented only after the underlying records exist:

1. **Today** — layer readiness, stale/review-due evidence, forecast changes, market movement, thesis review queue and warnings.
2. **Opportunity board** — validated model-versus-Kalshi candidates; otherwise a visibly disabled explanation. Provisional differences remain in the Kalshi execution lab only.
3. **Team dossiers** — source thesis, forecast distribution and uncertainty, market curve/movement, catalysts, invalidation and change history.
4. **Markets** — full curves, liquidity, fee/age/persistence detail and group totals.
5. **Portfolio** — private local app only.
6. **Research library** — current matrices, category rankings, previews, synthesis, sources and QA.

Phase 3 added the Forecast Lab. Phase 4 adds a Kalshi execution calculator and diagnostic table inside Win Markets, without creating an Opportunity board. The active forecast still blocks that promotion.

## 9. Implementation plan

### Phase 0 — protect the baseline — complete

Outcome: a reproducible Edition 7 starting point.

- Confirm the clean working tree and freeze the current artifact checksum and tests.
- Add public redacted fixtures for each future private contract.
- Add a plan-specific verification command that runs root tests, TypeScript, lint, standalone build and artifact audit.
- Make no source, market, model or UI behavior change.

Gate: the Edition 7 artifact is byte-identical and all existing checks still pass.

### Phase 1 — shared schemas, policies and current state — complete

Outcome: one versioned system spine and truthful freshness status.

- Add JSON Schemas for common references, evidence, forecast, quotes, comparisons and private redacted fixtures.
- Add versioned freshness, forecast and market policies.
- Generate `data/current/public-manifest.json` from validated inputs.
- Replace hard-coded current audit and market filenames in `site/app/data.ts` with the manifest.
- Add freshness/degraded-state audit output and minimal badges to current team/source/market views.
- Extend public privacy and schema gates.

Gate: exactly one active public state is selected; deliberate missing, stale and ambiguous inputs fail safely and visibly.

### Phase 2 — private decision MVP — complete

Outcome: Stephen can record a thesis, pass or approval and see current exposure without publishing any of it.

- Extend `.gitignore` before creating canonical records.
- Implement append-only ledger validation, event hashing and deterministic materialization.
- Add local commands for initializing, validating and materializing the ledger.
- Build the separate local-only Today, Theses and Portfolio views.
- Link records to exact public evidence, forecast and quote versions.
- Keep fair-price input manual until a validated forecast exists.

Gate: a redacted end-to-end fixture can create, revise, pass/approve, fill, mark, close and review a thesis; the public artifact remains byte-scanned clean and contains no private references.

### Phase 3 — independent forecast baseline — complete as provisional

Outcome: a reproducible schedule-simulation forecast, clearly labeled research/provisional/validated.

- Add and snapshot the official schedule and the agreed historical input set with provenance.
- Build the time-split training/holdout dataset and preregister validation criteria.
- Implement the latent-strength game model and coherent season simulator.
- Produce versioned exact-win distributions with uncertainty.
- Add baseline comparison and calibration reports.
- Expose provisional forecasts only in a labeled lab view until promotion gates pass.

Gate: forecast invariants, deterministic reproduction and holdout report pass. The model remains ineligible for the opportunity board until the versioned validation policy promotes it.

Implemented result:

- The market-independent `schedule-sim-v1.0.1` model fits recency-weighted, opponent-adjusted team strengths to 2010–2025 regular-season results and simulates the full 272-game 2026 schedule coherently.
- Training and tuning are separated from the untouched 2022–2025 holdout. The selected hyperparameters and validation thresholds were preregistered before holdout evaluation.
- Production runs use a fixed seed and 100,000 draws and publish exact 0–17 win probability masses for all 32 teams.
- Distribution, determinism, provenance, privacy and schedule-coherence gates pass. The 80% win-interval coverage gate passes.
- Holdout expected calibration error is `0.043943`, above the maximum `0.04`; current 2026 roster/quarterback adjustment coverage is also `0/32`. The active version is therefore `provisional`, has `decision_eligible=false`, and appears only in Forecast Lab.
- A rejected half-point tie-band prototype remains append-only as a `research` artifact. The accepted structural amendment uses the historical empirical tie rate and is recorded in `FORECAST_DESIGN.md`.

### Phase 4 — Kalshi-only execution-aware market layer — complete

Outcome: research watchlists are separated from genuinely executable candidate records.

- Lock the Kalshi-only design and archive the prior active policy before implementation.
- Snapshot and hash the current fee schedule and KXNFLWINS contract terms.
- Capture every full public order book without authentication, account access or order capability.
- Normalize complementary YES/NO books and calculate 1, 10 and 100-contract fills from visible depth.
- Apply the versioned quadratic fee formula plus conservative rounding reserve.
- Add capture-time expiry, like-for-like movement and two-snapshot persistence.
- Materialize research and action gates separately, with all failures retained.
- Remove sportsbook data from active policy, current-state selection, generated imports and forward UI.

Gate: thin, old, one-shot, mismatched, pre-fee-only and unvalidated-model rows cannot enter the action-eligible materialization.

Implemented result:

- Active snapshot: `kalshi-exec-20260827T153038.207Z`.
- 544 contracts and full books produce 1,088 normalized side quotes and 3,264 execution scenarios.
- 909 sides can fill the complete 100-contract reference size from displayed depth.
- 99 diagnostics pass the research edge/spread/size rules and persist across captures 146.332 seconds apart.
- Zero diagnostics are action eligible because the referenced forecast is provisional.
- The public UI exposes model probability, depth-weighted price, formula fee, reserve, conservative break-even, movement, persistence and failed status in one Kalshi-only panel.

### Phase 5 — atomic evidence migration

Implemented locally on 2026-08-27.

Outcome: every preview and category summary is generated from a uniform claim/entity ledger.

- Migrate one source at a time, beginning with the most time-sensitive team previews.
- Create stable blocks, atomic claims, people/entities and freshness classes.
- Preserve source-stated ballots exactly and retain ambiguity.
- Generate the existing summaries from claims and compare them with the Edition 7 baseline.
- Retire embedded/hand-maintained summary data only after parity and orphan-block review pass.

Gate: every substantive source block has a disposition, every claim has lineage and time state, and visible summary parity is signed off.

Result: passed. The canonical ledger has 972 claims, 270 source blocks, 506 normalized people, 11 full-source reviews with zero unreviewed substantive residuals, exact preservation of all 12 ballots and 23 ambiguity records, and zero visible-parity or orphan differences across 224 generated summary records.

### Phase 6 — workflow UI and learning loop

Implemented locally on 2026-08-27.

Outcome: the four layers operate as one decision workflow without blurring their meanings.

- Implement Today, Opportunity board, Team dossiers, Markets and Research library in the public app.
- Implement Portfolio only in the private local app.
- Freeze preseason priors and generate immutable weekly forecast/current-state versions.
- Record closing prices and outcomes.
- Add CLV, Brier score, log loss, calibration and postmortem views by model version, horizon, confidence and market type.
- Generate edition metadata, counts and QA from canonical registries.

Gate: a historical decision can be reconstructed from the exact evidence, forecast, quote, policy and portfolio state visible at its decision time.

Result: passed on the redacted end-to-end lifecycle. The public app now opens into Today, Opportunities, Team dossiers, Markets and Research library; Opportunities remains disabled with zero eligible rows. Two content-addressed preseason checkpoints preserve exact manifests and hashed layer references. Public learning observations validate decision-time and closing snapshots before scoring Brier, log loss, calibration and model-to-close movement. The private event chain adds same-side closing prices and derives entry-price CLV, outcomes and postmortem queues. The production learning report contains zero observations because no 2026 contract has truthfully reached a retained close and settlement.

## 10. Implemented approval scope

Stephen approved **Phases 0–6**: baseline protection, the shared current-state/freshness spine, the private decision MVP, the independent forecast baseline, the Kalshi-only execution layer, the atomic evidence migration and the workflow/learning infrastructure. Phase 4 delivers realistic captured prices without pretending the provisional probability model qualifies a wager; Phase 5 supplies claim-level lineage without changing the visible analysis; Phase 6 makes those layers operable without weakening either guardrail.

The next work is operation rather than another architecture phase: review stale evidence with sourced successors, freeze each material weekly state, record real closes/outcomes when available and run the private postmortem loop. Forecast promotion remains a separate evidence-based branch: complete current-season adjustment inputs, diagnose the calibration miss without changing the frozen holdout result, preregister any successor specification and evaluate it as a new version.

No phase includes a public commit, GitHub push, Pages deployment, private-library mutation, live order placement or account integration unless Stephen separately authorizes that action.

## 11. Decisions governing the implementation

1. **Private surface:** separate local-only application, not an overlay in the public Pages bundle.
2. **Private store:** append-only JSON Lines plus deterministic materialized views for the MVP.
3. **Forecast independence:** no sportsbook or exchange prices as model features; markets are benchmarks and comparisons only.
4. **Forecast eligibility:** no model-driven opportunity board until a versioned time-split validation gate passes.
5. **Current-state spine:** generated public and private manifests; no hard-coded latest filenames in UI code.
6. **Action persistence:** at least two qualifying like-for-like Kalshi captures 2–15 minutes apart, with a five-minute capture-age limit because source quote time is unavailable.
7. **Active market scope:** Kalshi KXNFLWINS only; sportsbook artifacts are frozen history and no account or order API is in scope.
8. **Implementation order:** Phases 0–6 are complete locally; recurring source refresh, weekly freezes, real observations and forecast promotion are the remaining operating work.

## 12. Definition of done for the four-layer program

The program is complete when:

- every current public view resolves through one validated manifest;
- all decision-relevant evidence has atomic lineage, time state and supersession;
- an independent versioned forecast produces coherent outcome distributions and publishes holdout/calibration results;
- market candidates include executable price, size, fees, age, movement and persistence;
- every private thesis/decision can be reconstructed without exposing any private field publicly;
- closing prices and outcomes evaluate frozen forecast and decision versions;
- the public offline artifact, privacy gate and all existing source/market invariants continue to pass;
- `README.md`, `CHECKPOINT.md`, `SPEC.md` and `NEXT_PHASE.md` accurately describe the implemented—not merely proposed—state.
