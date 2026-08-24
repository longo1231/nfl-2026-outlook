# 2026 NFL Team Outlook — Report Specification

Status: current through Edition 4
Season: 2026 NFL regular season
Primary audience: Stephen, for study, reference, and eventual futures-market triangulation
Editorial sources: four complete Action Network ranking transcripts plus two scoped team-preview episodes, preserved as private immutable canonical snapshots with sanitized public provenance

## 1. Outcome and scope

Build a simple-to-navigate but comprehensive report that preserves the substantive evidence and exact rankings from the four complete league-wide transcripts, plus exact ballots and scoped team evidence from preview episodes. Identify relevant personnel, praise, concern, comparison, context, contingency, and ambiguity without publishing raw transcript text. Add clearly labeled synthesis and a separately sourced, timestamped view of current 2026 regular-season win markets for all 32 teams.

The report must distinguish three kinds of content at all times:

1. **Source fact:** a faithful paraphrase of what the Action Network speakers said, tied to its transcript source and locator.
2. **Market fact:** a quoted line, probability, or derived market-implied value tied to a public source and retrieval time.
3. **Field Guide synthesis:** a transparent calculation or inference from the source facts, visually labeled as derived analysis rather than the speakers' view.

Defense and future category episodes must be addable as data, without changing the report architecture.

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

Readwise access is read-only. The workflow must not move, archive, tag, edit, mark read/seen, highlight, or annotate documents.

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
- `scoring_eligible` and `analysis_weight`
- `market_aware`
- canonical public source, private snapshot audit, methodology, ambiguity ledger, and paraphrased evidence

Only a complete, unique, comparable full-league ordinal or score contract may set `scoring_eligible=true`. Partial division or conference previews receive weight 0 even if their football evidence is useful. Covering every team across a series is insufficient unless the series also supplies a stable comparable league-wide contract. Market-aware preview evidence appears in a separate scoped market comparison and cannot create an independent Podcast × Kalshi signal.

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

## 6. Current win-market data

The market tab is a time-stamped snapshot, not a static season prediction.

### 6.1 Required source hierarchy

1. Prefer paired Over and Under prices from the same sportsbook at the same threshold and capture time.
2. Prefer a complete same-book alternate-win-total ladder.
3. When multiple books quote the same threshold, de-vig each book independently and use the median no-vig probability as consensus.
4. Never combine an Over from one book with an Under from another into a paired probability.
5. Preserve incomplete one-sided quotes as display-only evidence; do not use them for de-vigged probability.
6. Preserve every snapshot rather than overwriting history.
7. Use Kalshi's official `KXNFLWINS` API series for executable bid/ask ladders when available; collect all pages and retain source timestamps.
8. Authentication may verify the connection read-only, but credential values, private-key paths, and account responses never enter public data or logs.

Use public primary market pages or official market APIs when available. Store book, source URL, capture time in America/New_York, source update time when exposed, threshold, both prices, raw implied probabilities, hold, no-vig probabilities, and the derivation method.

### 6.2 Normalized market fields

- team, conference, division
- market type and venue/source
- regular-season half-win threshold
- Over and Under prices from the same book
- raw implied probabilities, sportsbook hold, and proportional no-vig probabilities
- observed and isotonic-adjusted tail probability `P(W >= k)`
- observed 50% bound or bracket
- expected wins only when all material tails support the tail-sum calculation
- coverage status, confidence label, source-book count, and observed-threshold count
- source URL, market timestamp, retrieval timestamp
- stale/unavailable flag
- executable Yes and No bid/ask, bid/ask size, spread, and ticker for exchange markets
- raw and monotone bid, ask, and midpoint curves for complete ladders
- exact-win probability mass for `W=0..17`, derived from adjacent monotone midpoint tails
- league, conference, and division sums with a clear marginal-bound disclaimer

No claim of betting value may be based on lines from mismatched retrieval times. Sparse ladders must not be stretched into false expected-win precision.

### 6.3 Tail-curve and expectation rules

- Sort observed `P(W >= k)` points by integer threshold `k`.
- Audit that tails are non-increasing.
- Repair only actual violations with weighted non-increasing isotonic regression while preserving raw values.
- Derive adjacent probability mass as `P(W = k) = P(W >= k) - P(W >= k+1)` where consecutive tails exist.
- For complete ladders, expose all 18 exact-win masses, require each to be nonnegative, require their sum to equal one, and require their probability-weighted mean to reproduce tail-sum expected wins.
- Report `E[W] = sum(P(W >= k), k=1..17)` only with complete coverage.
- Otherwise report an observed median bound/bracket, or a visibly labeled modeled estimate only if a bounded discrete model and confidence score are documented.
- For a complete Kalshi ladder, weight midpoint observations by inverse spread, project bid, ask, and midpoint tails separately, and sum each 17-tail curve.
- Treat summed bid/ask curves as marginal market-width bounds, not confidence intervals or a jointly executable portfolio guarantee.
- Audit the league midpoint against the 272-game ceiling without forcing normalization; preserve and disclose any residual.

### 6.4 Cross-market scanner

- Compare the sportsbook's paired, de-vigged probability only at the exact integer tail represented by a Kalshi contract.
- Evaluate both Yes and No using the executable Kalshi ask for the chosen side, not a midpoint.
- Record source timestamps for both venues and expose any mismatch.
- Default display filters require at least 5¢ pre-fee edge, no more than 12¢ Kalshi spread, and available top-of-book size.
- Show side, contract, sportsbook probability, Kalshi ask, pre-fee edge, spread, size, and timestamp provenance.
- Exclude fees and slippage only with an explicit warning. Candidate rows are research prompts, not recommendations.

## 7. Derived analysis

Derived metrics are intentionally simple, explainable, and recalculable when new categories arrive.

### 7.1 Core metrics

- **Category percentile:** convert each ordinal rank to a 0–100 strength scale, where rank 1 is strongest and rank 32 is weakest.
- **Weighted podcast profile:** weighted mean of category percentiles. Current provisional importance points are QB 40, Coaching 25, Offensive Line 20, and Skill Position 15; the UI normalizes them to 100%, exposes every rationale, permits adjustment, and retains equal weight only as a sensitivity reference.
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
- Derive `scored_categories` from eligibility and normalize importance points only over those categories; adding defense or another complete category requires no scoring-formula change.
- New complete comparable categories automatically appear in navigation, team profiles, source QA, weight controls, weighted scores, equal-weight sensitivity, and league market comparisons.
- Partial previews appear in their own navigation and covered team profiles at weight 0. They never receive synthetic ranks for uncovered teams.
- Do not silently give a new category equal importance. Choose and disclose its provisional importance and rerun sensitivity analysis.
- Current weights are reasoned priors, not learned coefficients. Never describe a weighted profile score as a fair probability or expected-win estimate.
- Show how many teams move at least five ranks between current weights and equal weights so the effect of the weighting judgment remains visible.

### 7.3 Analysis vs Market

- Keep Podcast × Kalshi and the cross-market scanner as visibly separate modules on one dedicated tab.
- Let the reader select any Kalshi tail from `P(W >= 1)` through `P(W >= 17)`.
- For all 32 teams show weighted profile score/rank, equal-weight rank, Kalshi E[W]/rank, `P(W <= 6)`, selected tail probability/rank, tail gap, and distribution standard deviation.
- Sort by absolute tail disagreement by default and link every row to the complete team evidence and density.
- Label gaps as ordinal research prompts, not edges, bets, or podcast-implied probabilities.
- The separate scanner remains market-versus-market: same-threshold sportsbook consensus versus executable Kalshi ask, with timestamp, fee, spread, size, and slippage caveats.
- A third visibly separate module may compare exact preview ballots with Kalshi tail order inside the same declared division scope. It must remain ordinal, weight 0, and explicitly market-aware.

### 7.4 Synthesis views

- Team archetypes: elite ecosystem, QB-led, infrastructure-led, weapons-heavy, balanced, or weak-link constrained.
- Cross-category reinforcement: themes independently repeated in multiple episodes.
- Cross-category tension: an asset praised in one category but limited by another category's weakness.
- Conference/division landscape: clusters, relative strengths, and likely competitive pressure.
- Market watchlist: largest market/profile gaps with plain-language reasons for and against treating the gap as meaningful.
- Missing-dimension warning: defense and special teams are absent initially; all composite views carry this warning until those categories exist.

Speaker opinion is never converted into false precision. Counts and ordinal transformations are navigation aids, while the source-linked qualitative claims remain primary.

## 8. Report information architecture

The report is a responsive single-page study tool with persistent tab navigation, URL/hash state, keyboard-accessible controls, and print-friendly team/category views.

### 8.1 Tabs

1. **Briefing** — season snapshot, key takeaways, category leaders/laggards, repeated themes, partial-method warning, and “where to study next.”
2. **League Matrix** — all 32 teams with sortable registered-category, weighted-profile, and market columns; conference/division filters.
3. **Team Profiles** — searchable team cards showing every registered rank, people, source-derived positives/negatives/context, cross-category synthesis, and a responsive 0–17 exact-win density with modeled E[W] marker.
4–7 currently. **Scored podcast categories** — one exact 1–32 evidence view per scoring category; navigation expands automatically as eligible categories are added.
8. **Team Previews** — scoped sources, exact and partial ballots, market-aware/weight-0 labels, ambiguity ledgers, covered-team summaries, and scoped Kalshi order.
9. **Win Markets** — AFC/NFC filters, league/conference/division modeled totals, complete Kalshi expected wins, density modes, bid/ask bounds, coverage, timestamps, and direct links to team distributions. It does not contain the cross-market scanner.
10. **Analysis vs Market** — adjustable scored-category importance, equal-weight sensitivity, all-threshold Podcast × Kalshi disagreement table, scoped preview-ballot comparison, distribution-shape diagnostics, and a visibly separate cross-market scanner module.
11. **Synthesis** — archetypes, reinforcing signals, tensions, balance, risk/upside evidence, conference patterns, and incomplete-model caveats.
12. **Sources & QA** — episode/source cards, retrieval dates, eligibility and weights/rationales, methodology, definitions, claim/coverage statistics, exceptions, and data freshness.

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

## 9. Visual direction

The report should feel like a premium analyst's field guide rather than a generic SaaS dashboard: dense but calm, editorial typography, warm paper-like neutrals, ink/graphite text, conference color accents, restrained data bars, and sharp typographic hierarchy. Team identity appears through names/abbreviations and subtle color tokens rather than logo licensing or decorative imagery. Mobile prioritizes one-handed browsing and collapsible evidence; desktop prioritizes side-by-side comparison.

Charts are used only where they improve comparison: rank matrix, category profile bars, and market/profile gap. The full evidence remains readable as text.

## 10. Technical architecture and update path

- Keep raw snapshots, normalized source data, market snapshots, and UI code separate.
- Generate the visible report from validated structured data.
- Version market snapshots by retrieval date rather than overwriting history.
- Keep one canonical public team registry with sportsbook aliases and Kalshi codes.
- Keep Kalshi request signing isolated from public market normalization so tests never require live credentials.
- Generate aggregate totals and scanner comparisons from the same immutable snapshot used by the report.
- Add all editorial sources through one eligibility-aware registry. Scored category views and qualitative preview views derive separately from it.
- Derived metrics specify included category IDs and recalculate automatically.
- Put methodology/version metadata in the data payload so a later report can explain exactly what changed.
- The React source builds through Vite into a single inlined `docs/index.html` for offline use and GitHub Pages.
- Publication excludes raw transcripts, private-library identifiers, private provenance, legacy Sites metadata, local paths, credentials, account data, positions, and personal commit details.

Recommended project layout:

```text
nfl-2026-outlook/
  AGENTS.md
  SPEC.md
  data/
    registry/teams.json
    sources/manifest.json
    transcripts/<private-source>.txt    # local-only, excluded from deployment
    blocks/<category>.json
    claims/<category>.json
    rankings/<category>.json
    previews/2026-team-previews.json
    nfl/teams.json
    markets/<retrieved-at>.json
    audit/coverage.json
  site/                                      # current interactive source and standalone builder
    app or src/
    public/data/                        # validated, publishable data only
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
- Current paired win-market data covers all 32 teams or explicitly marks unavoidable gaps.
- Every displayed no-vig probability traces to a same-book pair or a median of independently de-vigged same-threshold pairs.
- Tail curves are monotone after audit and any required isotonic adjustment.
- Expected wins are shown only where the observed or documented model coverage supports them.
- Complete Kalshi ladders preserve raw and adjusted bid, ask, and midpoint curves plus coverage and monotonicity audits.
- Conference/division totals reproduce exactly from team curves and carry the marginal-bound disclaimer.
- Cross-market candidates use executable asks, exact thresholds, visible filters, source timestamps, and pre-fee/slippage caveats.
- All derived metrics reproduce from the checked data and carry the incomplete-model warning.
- The self-contained report works offline and responsively, supports keyboard navigation, and has no blocking build/runtime errors.
- The Sources & QA tab publishes claim counts, completeness checks, source links, and timestamps.
- Raw transcript text, private-library identifiers, legacy Sites metadata, local paths, credentials, account data, private positions, and personal commit details are absent from the repository and deployed artifact.

## 12. Fixed assumptions for this first build

- “Upcoming season” means the 2026 NFL regular season.
- Action Network rankings are presented faithfully, even when another current source disagrees.
- Current roster/news context may be used to resolve identity or explain a transcription ambiguity, but it cannot replace or quietly “correct” the podcast's stated view.
- The default composite uses disclosed 40/25/20/15 importance points and remains explicitly incomplete until defensive and other comparable league-wide categories are added; equal weight is sensitivity only.
- Market lines are a research input, not financial advice or an instruction to place a wager.
