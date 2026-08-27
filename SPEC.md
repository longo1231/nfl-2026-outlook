# 2026 NFL Team Outlook — Report Specification

Status: current through Edition 7 plus locally implemented four-layer Phases 0–3; local changes are not yet published
Season: 2026 NFL regular season
Primary audience: Stephen, for study, reference, and eventual futures-market triangulation
Editorial sources: six complete Action Network ranking transcripts plus five scoped team-preview episodes covering all 32 teams, preserved as private immutable canonical snapshots with sanitized public provenance

## 1. Outcome and scope

Build a simple-to-navigate but comprehensive report that preserves the substantive evidence and exact rankings from the six complete league-wide transcripts, plus exact ballots and scoped team evidence from preview episodes. Identify relevant personnel, praise, concern, comparison, context, contingency, and ambiguity without publishing raw transcript text. Add clearly labeled synthesis and a separately sourced, timestamped view of current 2026 regular-season win markets for all 32 teams.

The report must distinguish three kinds of content at all times:

1. **Source fact:** a faithful paraphrase of what the Action Network speakers said, tied to its transcript source and locator.
2. **Market fact:** a quoted line, probability, or derived market-implied value tied to a public source and retrieval time.
3. **Field Guide synthesis:** a transparent calculation or inference from the source facts, visually labeled as derived analysis rather than the speakers' view.

Future category episodes must be addable as data, without changing the report architecture.

## 2. Non-negotiable completeness standard

“No information lost” means:

- Preserve an immutable local snapshot of each canonical source—creator transcript when available, otherwise publisher audio—plus metadata and a content hash.
- Capture every explicit rank, grade, tier, named person, roster move, injury, role, strength, weakness, comparison, disagreement, uncertainty, conditional statement, scheme note, supporting statistic, and forward-looking claim.
- Capture useful episode-level context that is not attached to one team (methodology, definitions, positional philosophy, and ranking caveats).
- Do not compress multiple distinct claims into one vague summary.
- Keep ambiguous or garbled transcript language in an exceptions ledger rather than silently resolving it.
- Retain source locators for every atomic claim so the normalized record can be audited against the snapshot.
- Avoid republishing long transcript passages; the report uses faithful paraphrases and only very short excerpts when wording itself matters.

Completeness is measured by a claim ledger and a coverage audit, not by prose length.

## 3. Readwise ingestion protocol

Readwise discovery, acquisition, verification and extraction are read-only. The workflow must not move, archive, tag, edit, mark read/seen, highlight, or annotate documents. A later post-incorporation location change is permitted only under explicit user authorization and must be logged separately from ingestion.

### 3.1 Discovery

- Search the entire non-feed Reader library for recent Action Network documents using title, author/source, and category terms.
- Identify exactly one canonical source for each episode. Prefer a creator transcript; if none exists, retain canonical publisher audio and label any local machine transcript as a private derived working copy.
- Record any near-duplicates or partial copies and explain why the canonical copy was selected.
- Confirm the episodes concern the 2026 season from title, publication date, and content; flag any season mismatch before extraction.

### 3.2 Immutable source snapshot

For each canonical source, save:

- Reader document ID
- title, author, source/site, and public/source URL; keep private-library locators outside the public tree
- publication date and retrieval timestamp
- original category and Reader location
- full raw transcript content or canonical publisher audio
- UTF-8 byte count, word count, and SHA-256 hash
- any available time markers, headings, speaker labels, or paragraph boundaries

Raw snapshots, private provenance, and machine-transcript working copies live outside the published site payload. The published Sources tab exposes sanitized metadata, source links, and canonical-source checksums—not copyrighted transcript or audio payloads.

### 3.3 Segmentation and locators

- Normalize whitespace without altering the preserved raw snapshot.
- Split the working copy into addressable blocks using transcript timecodes when available; otherwise stable paragraph/line ranges.
- Detect ranking transitions, team names, and episode-wide discussion.
- Store both the original locator and a stable internal block ID.

## 4. Extraction model

The canonical content layer is structured data, not hand-written page markup.

### 4.1 Category-ranking record

Each team/category pair contains:

- `season`
- `category_id` and display name
- `team_id`, franchise, conference, division
- `rank` and rank denominator
- any explicit tier, grade, score, prior rank, or speaker disagreement
- concise category verdict
- linked atomic claim IDs
- source document ID and team-section locator
- extraction status and reviewer status

### 4.2 Editorial source registry and preview record

Every editorial source declares:

- `kind`: for example `unit-ranking` or `team-preview`
- `coverage_mode` and explicit `covered_teams`
- `ranking_scheme`: league ordinal, multi-ballot division, partial order, or another stated contract
- `scoring_eligible`, `analysis_weight`, `dependency_group`, and the weight basis/rationale
- `market_aware`
- canonical public source, private snapshot audit, methodology, ambiguity ledger, and paraphrased evidence

Only a complete, unique, comparable full-league ordinal or score contract may set `scoring_eligible=true`. Eligibility does not imply statistical independence: every new eligible category must be assigned to a dependence group and receive a disclosed overlap treatment before it enters the default profile. Partial division or conference previews receive weight 0 even if their football evidence is useful. Covering every team across a series is insufficient unless the series also supplies a stable comparable league-wide contract. Market-aware preview evidence appears in a separate scoped market comparison and cannot create an independent Podcast × Kalshi signal.

Current application: AFC Preview Parts 1 and 2 collectively cover all 16 AFC teams, but neither episode supplies a conference-wide 1–16 order or comparable score. The NFC East and NFC North episodes provide speaker-specific division ballots but no league-wide contract. NFC Preview Part 1 covers the NFC West and NFC South, states only one winner-only NFC South ballot and no NFC West order. All five previews remain market-aware qualitative sources at weight 0 even though their combined team coverage now reaches all 32 clubs.

Exact speaker ballots remain separate. Discussion order, opening prices, prior-season finish, numeric projections, and wagers are never converted into rankings. A partial ballot records only its stated positions and must not infer the rest.

### 4.3 Atomic claim record

One record per distinct idea:

- claim ID
- team (nullable for episode-wide context)
- category
- claim type: positive, negative, neutral/context, statistic, comparison, roster move, injury/availability, scheme/fit, role/depth, projection, contingency, methodology, or disagreement
- faithful paraphrase
- named entities: person, unit, team, coach/staff role, position
- speaker, when identifiable
- polarity and strength/certainty
- conditional trigger, if any
- source locator and optional short supporting excerpt
- ambiguity flag and notes

### 4.4 People and entities

Maintain a deduplicated entity index containing canonical name, transcript variants, team, role/position, and every linked claim. Coaching records may include head coach, coordinators, play callers, position coaches, and named former/replacement staff. Player records include starters, backups, rookies, injured players, departures, and comparison players whenever mentioned.

### 4.5 Team identity

Use one canonical 32-team registry with stable IDs, aliases, conference, and division. Do not infer a team from a person when the transcript explicitly places that person elsewhere; preserve the episode's stated context and separately flag likely transcription or roster-date conflicts.

## 5. Extraction workflow and information-loss controls

For each editorial source:

1. Inventory episode metadata, canonical format, speakers, exact scope, ranking contract, market awareness, and stated methodology.
2. Segment all content into stable blocks.
3. Extract stated rankings first. Verify uniqueness and exhaustiveness only within the source's declared scheme; preserve partial ballots as partial.
4. Extract atomic claims block by block, including intros, transitions, disagreements, and closing remarks.
5. Resolve entity names against the team registry and current roster context only for spelling/identity; never rewrite the source's opinion.
6. Build the category/team summaries strictly from the claim ledger.
7. Run coverage checks and review every orphan block that produced no claim.
8. Record unresolved ambiguity explicitly.

### 5.1 Automated checks

- Every scoring-eligible category contains exactly 32 ranked teams.
- Scoring ranks form the complete integer set `1..32`, with no duplicate or missing rank.
- Preview sources declare covered teams, preserve each ballot independently, and contain no inferred positions.
- Every non-scoring source has analysis weight 0; every market-aware preview remains outside the league profile.
- Exactly one category record per team per category.
- Every claim links to a valid source block; every named entity links to at least one claim.
- Every transcript block is marked `captured`, `non-substantive`, or `ambiguous`.
- Team names appearing in a block are represented in that block's claims or intentionally marked as incidental.
- All category and preview records use the same team registry.
- Claim counts, people counts, and exception counts are included in the audit manifest.

### 5.2 Manual review passes

- **Rank pass:** compare the displayed 1–32 order directly with the transcript.
- **Entity pass:** scan every proper name and role against the entity index.
- **Polarity pass:** ensure praise, criticism, uncertainty, and speaker disagreement remain distinct.
- **Orphan pass:** reread every source block not represented by a substantive claim.
- **Report pass:** compare team cards and category summaries back to the claim ledger, never directly to memory.

## 6. Current Kalshi execution data

The active market pipeline is Kalshi-only and time-stamped. Sportsbook captures remain historical Edition 7 evidence, but no active policy, manifest, generated import, diagnostic or forward UI depends on them.

### 6.1 Required source hierarchy

1. Use Kalshi's official public series, markets and full order-book endpoints for `KXNFLWINS`.
2. Collect all 544 contracts and a complete book for each; fail rather than silently publish partial league coverage.
3. Preserve every capture append-only and freeze one active snapshot through the generated manifest.
4. Snapshot and hash the applicable contract terms and fee schedule before implementing or changing calculations.
5. Label quote time `capture-time-only` when the endpoint exposes no source quote timestamp.
6. Never request or persist account, balance, position, order or fill data. Public capture requires no authentication and cannot place an order.

### 6.2 Normalized market fields

- snapshot, contract, team and exact `wins_at_least` threshold IDs;
- YES and NO side records with bid, derived ask, sizes, spread and full executable ask depth;
- source, capture, record and stale times plus source-time confidence;
- fee-schedule ID, policy ID and forecast-version ID;
- execution scenarios for 1, 10 and 100 requested contracts;
- per-level fills, volume-weighted price, worst price and reconciled filled/unfilled size;
- formula fee, conservative rounding reserve, all-in cost, break-even and maximum profit;
- like-for-like bid/ask/spread/size movement from the preceding snapshot;
- raw and monotone Kalshi team tails, exact-win mass and derived team/group expected wins;
- research gates, persistence, action gates, eligibility and every failed gate.

### 6.3 Order-book, fee and depth rules

- Derive a YES ask as `1 - NO bid` and a NO ask as `1 - YES bid`; retain the captured complementary book as provenance.
- Sort executable asks from lowest to highest and consume visible levels until requested size is filled or exhausted.
- Never extrapolate missing depth and never call a partial fill executable for the requested size.
- Apply the active series taker fee to each fill level: `ceil_0.0001(0.07 × contracts × price × (1 - price))`.
- Add the configured one-cent conservative pretrade reserve because exact fill-fragment balance rounding and later rebates cannot be known in advance.
- Compute conservative break-even as `(position cost + formula fee + reserve) / filled contracts`.
- Require scenarios to reconcile `filled + unfilled = requested` and prohibit overfills.

### 6.4 Tail-curve and expectation rules

- Sort observed `P(W >= k)` points by integer threshold `k` and preserve raw values.
- Repair only actual monotonicity violations with weighted non-increasing isotonic regression.
- Derive all 18 exact-win masses from adjacent tails and require nonnegative mass summing to one.
- Report `E[W] = sum(P(W >= k), k=1..17)` only with all 17 tails.
- Treat summed bid/ask curves as marginal market-width bounds, not confidence intervals or a jointly executable portfolio guarantee.
- Audit the league midpoint against the 272-game ceiling without forcing normalization.

### 6.5 Diagnostic and action rules

- The active comparison is exact forecast-versus-Kalshi: same team, threshold, side, captured book and requested size.
- The primary reference size is 100 contracts; 1 and 10 show scale sensitivity.
- Research qualification requires a full 100-contract fill, spread no wider than 12 cents and at least a 5-cent forecast-minus-conservative-break-even difference.
- Persistence requires two independently captured qualifying observations 2–15 minutes apart.
- Capture-time observations expire for action review after five minutes.
- A comparison cannot be action eligible unless the forecast is both `validated` and `decision_eligible=true`.
- A provisional difference may appear only as a clearly labeled research diagnostic. It is not a wager recommendation.

## 7. Derived analysis

Derived metrics are intentionally simple, explainable, and recalculable when new categories arrive.

### 7.1 Core metrics

- **Category percentile:** convert each ordinal rank to a 0–100 strength scale, where rank 1 is strongest and rank 32 is weakest.
- **Weighted podcast profile:** weighted mean of category percentiles. Current adjustable reasoned priors are QB 25, Coaching 15, Offensive Line 11, Skill Position 8, Offense 11, and Defense 30. QB, line, skill, and offense share a fixed 55-point offensive-family budget; offense is an interaction/schedule overlay because its stated method directly reuses those component inputs. The UI exposes every rationale and permits adjustment. Equal weight remains a sensitivity stress test, not the preferred dependence treatment.
- **Weighted profile rank:** league ordering of the weighted podcast profile. It is labeled incomplete and is never presented as a win forecast or calibrated probability.
- **Offensive ecosystem:** equal-weight QB, Offensive Line, and Skill Position percentiles.
- **Infrastructure support:** mean of Coaching and Offensive Line percentiles.
- **Balance:** category-rank spread and standard deviation; low dispersion indicates a balanced profile.
- **Best unit / weakest unit:** best and worst current category ranks.
- **Market-vs-profile mean gap:** difference between complete-ladder Kalshi modeled expected-win rank and weighted podcast profile rank.
- **Tail gap at threshold `k`:** Kalshi league rank for `P(W >= k)` minus weighted podcast profile rank. Positive means the podcast ordering is stronger; negative means the Kalshi tail ordering is stronger.
- **Market downside:** `P(W <= 6)` from the exact-win density.
- **Market volatility:** standard deviation of wins from the exact-win density.
- **Dependency/risk index:** transparent count of negative or conditional claims involving injury, availability, unproven replacements, age/decline, depth, or scheme transition; always show the underlying claims.
- **Upside index:** transparent count of strongly positive or improvement claims, again with the underlying claims.

### 7.2 Source extensibility and weighting guardrails

- Store source kind, coverage, ranking scheme, evidence, audit, scoring eligibility, market awareness, default importance, and rationale together in the editorial registry.
- Derive `scored_categories` from eligibility and normalize importance points only over those categories; adding another complete category requires no scoring-formula change but does require a new dependence audit.
- New complete comparable categories automatically appear in navigation, team profiles, source QA, weight controls, weighted scores, equal-weight sensitivity, and league market comparisons.
- Partial previews appear in their own navigation and covered team profiles at weight 0. They never receive synthetic ranks for uncovered teams.
- Do not silently give a new category equal importance. Choose and disclose its provisional importance and rerun sensitivity analysis.
- Current weights are reasoned priors, not learned coefficients. They are not fitted to outcomes, sportsbook prices, or Kalshi. Never describe a weighted profile score as a fair probability or expected-win estimate.
- The current dependence groups are `offense-family` (QB, offensive line, skill positions, offense), `cross-unit` (coaching), and `defense-family` (defense). Changing those group budgets is a modeling decision that must be separately disclosed.
- Show how many teams move at least five ranks between current weights and equal weights so the effect of the weighting judgment remains visible.

### 7.3 Analysis vs Market

- Keep ordinal Podcast × Kalshi comparison separate from probability-versus-execution diagnostics.
- Let the reader select any Kalshi tail from `P(W >= 1)` through `P(W >= 17)`.
- For all 32 teams show weighted profile score/rank, equal-weight rank, Kalshi E[W]/rank, `P(W <= 6)`, selected tail probability/rank, tail gap, and distribution standard deviation.
- Sort by absolute tail disagreement by default and link every row to the complete team evidence and density.
- Label gaps as ordinal research prompts, not edges, bets, or podcast-implied probabilities.
- Execution diagnostics live in Win Markets and show exact side, size, depth-weighted price, fee, conservative break-even, movement, persistence and failed gates.
- A third visibly separate module may compare exact or partial source-stated preview ballots with Kalshi tail order inside the same declared division scope. It must remain ordinal, weight 0, and explicitly market-aware.

### 7.4 Synthesis views

- Team archetypes: elite ecosystem, QB-led, infrastructure-led, weapons-heavy, balanced, or weak-link constrained.
- Cross-category reinforcement: themes independently repeated in multiple episodes.
- Cross-category tension: an asset praised in one category but limited by another category's weakness.
- Conference/division landscape: clusters, relative strengths, and likely competitive pressure.
- Market watchlist: largest market/profile gaps with plain-language reasons for and against treating the gap as meaningful.
- Missing-dimension warning: defense, an independent schedule model and immutable weekly state are represented. Special teams, sourced current quarterback/injury adjustments, validated calibration and actual settled 2026 learning observations remain absent; all composite views carry that warning.

Speaker opinion is never converted into false precision. Counts and ordinal transformations are navigation aids, while the source-linked qualitative claims remain primary.

### 7.5 Decision-system boundary

The public report separates four layers and must never imply that one can substitute for another:

1. **Evidence ledger:** immutable source lineage, exact contracts, atomic claims, people, confidence, locators, effective dates and review dates.
2. **Forecast layer:** versioned probabilistic team outcomes with uncertainty, explicit priors/update rules and out-of-sample calibration. The current weighted podcast profile is an ordinal research index, not this layer.
3. **Market layer:** append-only Kalshi full books, price/size/age, versioned fees, depth, movement, persistence and executable comparisons.
4. **Private decision/portfolio layer:** thesis, fair-price range, target/limit, catalyst, invalidation, stake/risk, positions, CLV and postmortem. This layer is ignored and never published.

The local Phase 0–6 working tree implements versioned policies and schemas, a generated public current-state manifest, a uniform atomic evidence ledger, generated report views, claim-level freshness, a separate ignored private decision ledger, a provisional market-independent schedule simulation, Kalshi-only execution-aware pricing, immutable weekly states and public/private learning contracts. The evidence ledger contains 972 claims, 270 disposed source blocks and 506 normalized people; all 224 visible summary records match the Edition 7 baseline, and 42 time-sensitive claims are explicitly stale for current use. The forecast produces versioned exact-win distributions and a frozen holdout report but remains ineligible for decisions because calibration and current-adjustment coverage gates fail. The market layer includes depth, fees, movement and persistence, yet produces zero action candidates because it fails closed on forecast state. Public learning remains empty until source-backed closes settle; private lifecycle state can derive same-side CLV, outcome and postmortem queues without any public import of canonical private records.

## 8. Report information architecture

The report is a responsive single-page study tool with persistent tab navigation, URL/hash state, keyboard-accessible controls, and print-friendly team/category views.

### 8.1 Workflow navigation

1. **Today** — layer readiness, stale/review-due evidence, forecast gates, market movement and age, frozen weekly state, learning status and public warnings.
2. **Opportunities** — validated and executable candidates only. When validation fails, the board is visibly disabled and provisional differences remain separate lab diagnostics.
3. **Team dossiers** — evidence profile, review debt, independent 0–17 forecast, Kalshi 0–17 curve, captured movement and every retained source argument.
4. **Markets** — AFC/NFC filters, league/conference/division totals, complete Kalshi expected wins, bid/ask bounds, full-book coverage and the size/fee/movement/persistence lab.
5. **Research library** — Briefing, Decision System, Forecast Lab, League Matrix, six scored category views, Team Previews, Analysis vs Market, Synthesis and Sources & QA.

The separate ignored private app contains Today, Theses, Portfolio and Learning. No public workflow view imports it.

### 8.2 Interaction and study design

- Sticky tab rail with clear active state; tabs work by mouse, touch, and keyboard.
- Global team search and conference/division filters.
- Sortable tables with frozen team column on narrow screens.
- Expandable evidence rows keep the default view clean while preserving every claim.
- Positive, negative, conditional, and contextual claims use redundant icon/label/color coding for accessibility.
- Every team/category view provides a direct source link and locator.
- Deep links preserve tab, team, and filter state.
- Weight controls are generated from the category registry and update all profile/tail comparisons immediately without changing source evidence.
- A visible “data through” timestamp appears on market and source tabs.
- A report-wide state strip exposes evidence review debt, provisional/validated forecast state, action-stale market captures and local-only private decision capability from the generated manifest.

## 9. Visual direction

The report should feel like a premium analyst's field guide rather than a generic SaaS dashboard: dense but calm, editorial typography, warm paper-like neutrals, ink/graphite text, conference color accents, restrained data bars, and sharp typographic hierarchy. Team identity appears through names/abbreviations and subtle color tokens rather than logo licensing or decorative imagery. Mobile prioritizes one-handed browsing and collapsible evidence; desktop prioritizes side-by-side comparison.

Charts are used only where they improve comparison: rank matrix, category profile bars, and market/profile gap. The full evidence remains readable as text.

## 10. Technical architecture and update path

- Keep raw snapshots, normalized source data, market snapshots, and UI code separate.
- Generate the visible report from validated structured data.
- Version market snapshots by retrieval date rather than overwriting history.
- Keep one canonical public team registry with stable team IDs and Kalshi codes. Historical sportsbook aliases may remain for archived artifacts only.
- Keep legacy Kalshi request signing isolated from the active public capture; Phase 4 market collection uses unauthenticated public endpoints.
- Generate aggregate totals and execution diagnostics from the same immutable snapshot used by the report.
- Add all editorial sources through one eligibility-aware registry. Scored category views and qualitative preview views derive separately from it.
- Derived metrics specify included category IDs and recalculate automatically.
- Put methodology/version metadata in the data payload so a later report can explain exactly what changed.
- Generate `data/current/public-manifest.json` deterministically from the newest matching source, readiness, forecast and Kalshi execution records; select only the model state authorized by the versioned forecast policy and never substitute market-implied distributions.
- Snapshot and hash the pinned schedule/results source before normalization. Keep model results, the 2026 schedule and evaluation-only moneylines in separate artifacts so market fields cannot leak into fitting.
- Build the active forecast from the locked 2018–2021 tuning and 2022–2025 holdout split in `FORECAST_DESIGN.md`; write exact-win distributions and validation reports append-only by version ID.
- Give mutable evidence `effective_at`, `captured_at`, `review_due_at`, `stale_after`, `status` and `supersedes` fields; a report-wide data-through date is not sufficient.
- Keep any thesis, target-price, wager, position, balance, order, fill, exposure, CLV or postmortem data in the ignored `.private/decision-system/` layer. The generic app code and redacted fixtures may be public; canonical records and private build output may not.
- Generate UI counts, weights, source metadata and coverage audits from canonical registries instead of maintaining parallel manual copies.
- The React source builds through Vite into a single inlined `docs/index.html` for offline use and GitHub Pages.
- Publication excludes raw transcripts, private-library identifiers, private provenance, legacy Sites metadata, local paths, credentials, account data, positions, and personal commit details.

Recommended project layout:

```text
nfl-2026-outlook/
  AGENTS.md
  SPEC.md
  config/                               # versioned public system policies
  schemas/                              # public four-layer record contracts
  data/
    current/public-manifest.json        # generated active public-state selector
    registry/teams.json
    sources/manifest.json
    transcripts/<private-source>.txt    # local-only, excluded from deployment
    evidence/2026-evidence-ledger.json
    evidence/2026-generated-summaries.json
    evidence/2026-evidence-audit.json
    rankings/<category>.json
    previews/2026-team-previews.json
    nfl/teams.json
    forecast/sources/<pinned-source>.csv
    forecast/inputs/<versioned-input>.json
    forecasts/<forecast-version>.json
    markets/<retrieved-at>.json
    audit/coverage.json
  site/                                      # current interactive source and standalone builder
    app/                                # public Field Guide
    decision/                           # generic local decision UI; no canonical records
    public/data/                        # validated, publishable data only
  .private/decision-system/             # ignored ledger, materialized views and local app output
  .private/current/                     # ignored private manifest
  docs/
    index.html                          # generated standalone Pages report
    .nojekyll
```

## 11. Completion gates

The report is complete only when:

- All canonical editorial sources are identified, snapshotted, hashed, classified, and recorded in the sanitized source manifest.
- Every scoring source has a complete unique 1–32 contract; every partial or market-aware preview is weight 0 and visibly separate.
- All transcript blocks have a disposition and all ambiguity is visible.
- Each category has a verified, unique 1–32 ranking.
- All named people and substantive claims are represented and source-linked.
- Current Kalshi execution data contains all 544 KXNFLWINS contracts and one full book per contract.
- Every derived ask traces to the complementary captured bid book.
- Tail curves are monotone after audit and any required isotonic adjustment.
- Expected wins are shown only where the observed or documented model coverage supports them.
- Complete Kalshi ladders preserve raw and adjusted bid, ask, and midpoint curves plus coverage and monotonicity audits.
- Conference/division totals reproduce exactly from team curves and carry the marginal-bound disclaimer.
- Every execution diagnostic uses exact thresholds and sides, reconciled displayed depth, a versioned fee rule, conservative break-even, capture time, movement, persistence and explicit failed gates.
- All derived metrics reproduce from the checked data and carry the incomplete-model warning.
- The self-contained report works offline and responsively, supports keyboard navigation, and has no blocking build/runtime errors.
- The Sources & QA tab publishes claim counts, completeness checks, source links, and timestamps.
- The Decision System tab truthfully reports which evidence, forecast, market, decision and operating layers are ready, guarded or missing.
- The private ledger rejects invalid hash chains and lifecycle events without a created thesis; redacted fixtures cover watch, pass, approval, order, fill, mark, close, outcome and postmortem flows.
- The public build graph has no import path to canonical private state, and the privacy audit scans prospective Git-visible files plus randomized local decision canaries.
- Market candidates cannot enter an action list without fee-adjusted edge, complete requested size, quote age, persistence and a validated decision-eligible forecast; rows failing any gate remain research diagnostics.
- Learned coefficients cannot be described as learned without historical training data, out-of-sample validation and recorded calibration metrics.
- Raw transcript text, private-library identifiers, legacy Sites metadata, local paths, credentials, account data, private positions, and personal commit details are absent from the repository and deployed artifact.

## 12. Fixed assumptions for this first build

- “Upcoming season” means the 2026 NFL regular season.
- Action Network rankings are presented faithfully, even when another current source disagrees.
- Current roster/news context may be used to resolve identity or explain a transcription ambiguity, but it cannot replace or quietly “correct” the podcast's stated view.
- The default composite uses disclosed 25/15/11/8/11/30 reasoned priors with a fixed 55-point offensive-family budget; defense is present, equal weight is sensitivity only, and the profile remains separate from the now-implemented provisional schedule model. Special teams and validated current-context calibration remain missing.
- Market lines are a research input, not financial advice or an instruction to place a wager.
