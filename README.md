# 2026 NFL Outlook Field Guide

An evidence-first study report built from six Action Network 2026 NFL ranking-podcast transcripts—quarterbacks, coaching staffs, offensive lines, skill positions, offenses, and defenses—plus five scoped team-preview episodes now covering all 32 teams. It preserves exact source rankings, team-level arguments, qualifiers, public source locators, transcription ambiguities, and clearly labeled synthesis.

The current edition compares the six complete league-wide inputs with two timestamped NFL win-market snapshots: same-book paired sportsbook Over/Under prices and Kalshi's complete 17-tail team-win ladders. The five market-aware previews are registered at analysis weight 0 because they have partial coverage and incompatible ranking schemes. They enrich all 32 team profiles and a separate scoped ballot-versus-Kalshi view without entering the league score.

Edition 7 also adds a decision-system meta review. Its conclusion is intentionally strict: the Field Guide is an auditable research source of truth, but it is not yet a calibrated forecast, execution, or portfolio source of truth. The visible Decision System section and `META_REVIEW.md` identify the missing forecast, freshness, private decision, execution and feedback layers.

## Current edition

- Edition: 7
- Data through: 2026-08-27
- Editorial coverage: 192 of 192 scoring cells plus five zero-weight preview sources covering all 32 teams
- Sportsbook coverage: 32 of 32 teams with paired primary quotes; 13 teams with multiple observed thresholds
- Kalshi coverage: 544 open contracts; 32 of 32 teams with all 17 tails; 32 teams with coverage-supported expected-win estimates
- Cross-market scan: 90 executable-side comparisons; 5 timestamped candidates passed the current 5¢ minimum pre-fee edge, 12¢ maximum spread, and positive displayed-size filters
- Publication surface: `docs/index.html`
- Published report: https://longo1231.github.io/nfl-2026-outlook/
- Offline behavior: self-contained; no server, package installation, or network connection is required except to open outbound source links
- Legacy reference: the prior owner-only Sites edition is preserved privately as a frozen v1 and is not part of this repository

Publication URL and commit are recorded in `CHECKPOINT.md`.

## Report sections

1. Executive briefing
2. Decision System: current readiness boundary, four-layer target architecture, and prioritized roadmap
3. League matrix
4. Team profiles with 0–17 modeled win distributions
5. Quarterbacks
6. Coaching
7. Offensive lines
8. Skill positions
9. Offenses
10. Defenses
11. Team previews: exact scoped ballots, ambiguity ledgers, and evidence for all 32 teams
12. Kalshi ladders, exact-win distributions, and group win totals
13. Analysis vs Market: adjustable scored-category weights, full-league tail disagreements, scoped preview-ballot comparisons, and a separate cross-market scanner
14. Cross-category synthesis
15. Sources and QA

The default podcast profile converts each ordinal rank to a 0–100 strength percentile, then applies adjustable reasoned-prior importance points: quarterback 25, coaching 15, offensive line 11, skill positions 8, offense 11, and defense 30. No coefficient is learned from outcomes, sportsbook prices, or Kalshi. QB, line, skill, and the composite offense episode share a fixed 55-point offensive-family budget because the offense methodology explicitly reuses those inputs; the offense weight represents interaction and schedule context rather than a second full independent signal. The interface exposes every default and rationale and retains equal weight as a sensitivity stress test. This remains an incomplete analytical ordering—not a power rating, win forecast, calibrated probability, or bet recommendation.

Every editorial source records its kind, coverage mode, covered teams, ranking scheme, scoring eligibility, analysis weight, dependence group, market awareness, evidence, audit, and rationale. Only a complete, unique, comparable league-wide 1–32 rank or score contract can enter the profile, and eligibility does not remove the need to audit dependence. A partial or market-aware preview remains visible at weight 0; completing a set of previews does not make it scoreable unless the combined series supplies a stable comparable league-wide contract.

## Podcast × Kalshi method

For a selected Kalshi threshold `k`, every team receives its observed monotone tail probability `P(W >= k)` and a league tail rank. The report compares that rank with the weighted podcast profile rank:

```text
tail gap = Kalshi tail rank - weighted podcast profile rank
```

A positive gap means the podcast profile ranks the team more strongly than Kalshi does at that threshold; a negative gap means the Kalshi tail ranks more strongly. The view also shows market expected wins, `P(W <= 6)`, distribution standard deviation, and the equal-weight profile rank. These are ordinal research disagreements. The podcast side is never converted into an invented probability distribution.

## Market method

The captured board contains paired Over/Under prices from named books. For American odds, raw implied probability is:

```text
negative odds -A: A / (A + 100)
positive odds +A: 100 / (A + 100)
```

At each half-win sportsbook threshold, the two sides from one book are normalized proportionally:

```text
q_over = p_over / (p_over + p_under)
```

When several books quote the same threshold, the report takes the median of their independently de-vigged probabilities. It never combines an Over from one book with an Under from another.

Kalshi provides executable Yes bid and ask prices for every tail `P(W >= k)`, `k=1..17`. The scanner forms raw midpoint tails, weights them by inverse spread, and projects bid, ask, and midpoint series separately with non-increasing isotonic regression. The team estimate is:

```text
modeled E[W] = sum from k=1 to 17 of monotone midpoint P(W >= k)
```

Adjacent monotone tails produce the exact-win density:

```text
P(W = 0)  = 1 - P(W >= 1)
P(W = k)  = P(W >= k) - P(W >= k+1)
P(W = 17) = P(W >= 17)
```

Every team profile displays those 18 probability masses, their most likely exact-win outcome, and the expected-win marker. These are derived midpoint probabilities, not directly traded exact-win contracts. The market rank orders the modeled expected win value. Team bid/ask brackets and conference/division totals sum the corresponding monotone marginal curves; they are market-width bounds, not confidence intervals or jointly executable portfolio guarantees.

At thresholds also observed in the sportsbook snapshot, the scanner compares the same-book de-vigged sportsbook probability with the executable Kalshi Yes or No ask. The current list requires at least 5¢ pre-fee edge, no more than a 12¢ Kalshi spread, and positive displayed top-of-book size. It does not include Kalshi fees, slippage, a minimum notional, quote-age verification, or persistence, and the refreshed source snapshots were captured 19.007 seconds apart. Candidates are watchlist research prompts, not recommendations.

The fresh Kalshi marginal midpoint sum is 271.080 wins, or 0.920 below the 272-game league ceiling. The report preserves that aggregate incoherence as a calibration warning rather than forcing individually estimated team curves to sum to a coherent joint league distribution.

## Reproduce and test

The market-math tests use Node's built-in test runner and require no package installation:

```sh
npm test
```

Run a fresh append-only Kalshi scan with a private environment file containing `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY_PATH`:

```sh
npm run kalshi:scan -- --env-file /path/to/private/.env --sportsbook data/markets/<paired-snapshot>.json
```

Authentication follows Kalshi's RSA-PSS request-signing contract and is used only for a read-only connection check. The market ladder itself is collected from the public markets endpoint. No credential value, key path, or account response is written to the snapshot.

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

The decision-system readiness script requires explicit sportsbook, Kalshi, and new append-only output paths:

```sh
npm run system:audit -- data/markets/<paired-snapshot>.json data/markets/<kalshi-snapshot>.json data/audit/<timestamp>-decision-system-readiness.json
```

## Project map

| Path | Purpose |
|---|---|
| `AGENTS.md` | Source-integrity, publication-safety, market-modeling, and durable-state rules |
| `SPEC.md` | Data contract, report architecture, methodology, and completion gates |
| `CHECKPOINT.md` | Current edition, exact public sources, QA, publication commit, blockers, and next action |
| `NEXT_PHASE.md` | Completed full-ladder, group-total, scanner, and publication phase record |
| `META_REVIEW.md` | Decision-system readiness audit, target architecture, risks, and phased roadmap |
| `lib/market-math.mjs` | Odds conversion, de-vigging, isotonic regression, probability-mass, and tail-sum functions |
| `lib/profile-market.mjs` | Extensible category weighting, profile scores, tail probabilities, distribution moments, and ranks |
| `lib/kalshi-auth.mjs` | Private environment parsing and Kalshi RSA-PSS request signing |
| `lib/kalshi-nfl.mjs` | Kalshi ladder normalization, monotone curves, expected wins, group totals, and comparisons |
| `scripts/build-market-snapshot.mjs` | Deterministic parser and market-snapshot builder |
| `scripts/scan-kalshi-nfl.mjs` | Read-only, append-only Kalshi NFL ladder and opportunity scanner |
| `scripts/audit-profile-sensitivity.mjs` | Reproducible weighted/equal and all-17-tail sensitivity audit |
| `scripts/audit-decision-system.mjs` | Reproducible source, preview, market, and decision-layer readiness audit |
| `scripts/validate-public-artifact.mjs` | Reproducible offline/self-contained and private-identifier leak gate |
| `tests/market-math.test.mjs` | Unit tests for sportsbook math, category weighting, extensibility, and tail-shape calculations |
| `tests/kalshi-nfl.test.mjs` | Unit tests for authentication, full ladders, totals, ranks, and scanner edges |
| `data/nfl/teams.json` | Canonical NFL team, conference, division, and Kalshi-code registry |
| `data/sources/manifest.json` | Sanitized publisher provenance, hashes, and source counts |
| `data/rankings/` | Compact canonical 1–32 category orders |
| `data/previews/2026-team-previews.json` | Sanitized scoped preview registry, exact ballots, ambiguities, and paraphrased team evidence |
| `data/markets/` | Append-only timestamped market snapshots |
| `data/audit/coverage.json` | Machine-readable content and market QA |
| `site/app/` | React report source and normalized evidence |
| `docs/index.html` | Complete offline and GitHub Pages report |

Private provenance, raw transcript snapshots, archived Sites metadata, environment files, caches, credentials, account data, positions, balances, orders, fills, and personal commit details are excluded from Git.

## Update procedure

For a new editorial episode:

1. Acquire the canonical transcript read-only and preserve a private immutable snapshot plus hash.
2. Classify coverage and ranking scheme before interpretation. Preserve any exact ballot and never convert discussion order, projections, prior finish, or odds into a ranking.
3. Extract every substantive positive, concern, qualifier, comparison, named person, methodological rule, and source locator.
4. Register the source with its coverage, scoring eligibility, market-awareness flag, dependence group, weight, and rationale. Only a comparable full-league contract can receive nonzero weight, and every new eligible source requires a dependence audit.
5. Add a new timestamped paired market snapshot without overwriting history.
6. Capture a new append-only Kalshi ladder snapshot, recompute expected wins, group totals, market ranks, tail gaps, and exact-threshold comparisons.
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
