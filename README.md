# 2026 NFL Outlook Field Guide

An evidence-first study report built from four Action Network 2026 NFL ranking-podcast transcripts: quarterbacks, coaching staffs, offensive lines, and skill positions. It preserves the exact 1–32 rankings, team-level arguments, named personnel, qualifiers, public source locators, and clearly labeled cross-category synthesis.

The current edition compares those inputs with two timestamped NFL win-market snapshots: same-book paired sportsbook Over/Under prices and Kalshi's complete 17-tail team-win ladders. Sportsbook pairs are de-vigged independently for the cross-market scanner; Kalshi bid, ask, and midpoint curves are audited and projected to monotone order. Team profiles show the full exact-win density from 0–17, while expected wins, league/conference/division totals, and market rankings come from the complete Kalshi distributions and remain explicitly labeled as modeled values.

## Current edition

- Edition: 3
- Data through: 2026-08-23
- Editorial coverage: 128 of 128 expected team-category cells; no missing or duplicate ranks
- Sportsbook coverage: 32 of 32 teams with paired primary quotes; 19 teams with a second observed threshold
- Kalshi coverage: 544 open contracts; 32 of 32 teams with all 17 tails; 32 teams with coverage-supported expected-win estimates
- Cross-market scan: 102 executable-side comparisons; 8 timestamped candidates passed the current 5¢ minimum pre-fee edge, 12¢ maximum spread, and available-size filters
- Publication surface: `docs/index.html`
- Published report: https://longo1231.github.io/nfl-2026-outlook/
- Offline behavior: self-contained; no server, package installation, or network connection is required except to open outbound source links
- Legacy reference: the prior owner-only Sites edition is preserved privately as a frozen v1 and is not part of this repository

Publication URL and commit are recorded in `CHECKPOINT.md`.

## Report sections

1. Executive briefing
2. League matrix
3. Team profiles with 0–17 modeled win distributions
4. Quarterbacks
5. Coaching
6. Offensive lines
7. Skill positions
8. Paired sportsbook markets, Kalshi ladders, group win totals, and cross-market scan
9. Cross-category synthesis
10. Sources and QA

The Action input average is the equal-weight mean of the four available ordinal ranks. It is deliberately labeled as incomplete and is not a power rating, a win forecast, or a bet recommendation. Defense should become a fifth input when that ranking episode is available.

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

At thresholds also observed in the sportsbook snapshot, the scanner compares the same-book de-vigged sportsbook probability with the executable Kalshi Yes or No ask. The current list requires at least 5¢ pre-fee edge, no more than a 12¢ Kalshi spread, and displayed top-of-book size. It does not include Kalshi fees or slippage, and the source snapshots were captured about 40 minutes apart. Candidates are research prompts, not recommendations.

## Reproduce and test

The market-math tests use Node's built-in test runner and require no package installation:

```sh
npm test
```

Run a fresh append-only Kalshi scan with a private environment file containing `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY_PATH`:

```sh
npm run kalshi:scan -- --env-file /path/to/private/.env
```

Authentication follows Kalshi's RSA-PSS request-signing contract and is used only for a read-only connection check. The market ladder itself is collected from the public markets endpoint. No credential value, key path, or account response is written to the snapshot.

The interactive React source lives in `site/`. After installing its locked dependencies, build the standalone artifact with:

```sh
npm --prefix site ci
npm --prefix site run build
```

The standalone build inlines the React bundle, data, and CSS into `docs/index.html`.

## Project map

| Path | Purpose |
|---|---|
| `AGENTS.md` | Source-integrity, publication-safety, market-modeling, and durable-state rules |
| `SPEC.md` | Data contract, report architecture, methodology, and completion gates |
| `CHECKPOINT.md` | Current edition, exact public sources, QA, publication commit, blockers, and next action |
| `NEXT_PHASE.md` | Completed full-ladder, group-total, scanner, and publication phase record |
| `lib/market-math.mjs` | Odds conversion, de-vigging, isotonic regression, probability-mass, and tail-sum functions |
| `lib/kalshi-auth.mjs` | Private environment parsing and Kalshi RSA-PSS request signing |
| `lib/kalshi-nfl.mjs` | Kalshi ladder normalization, monotone curves, expected wins, group totals, and comparisons |
| `scripts/build-market-snapshot.mjs` | Deterministic parser and market-snapshot builder |
| `scripts/scan-kalshi-nfl.mjs` | Read-only, append-only Kalshi NFL ladder and opportunity scanner |
| `tests/market-math.test.mjs` | Unit tests for sportsbook market calculations |
| `tests/kalshi-nfl.test.mjs` | Unit tests for authentication, full ladders, totals, ranks, and scanner edges |
| `data/nfl/teams.json` | Canonical NFL team, conference, division, and Kalshi-code registry |
| `data/sources/manifest.json` | Sanitized publisher provenance, hashes, and source counts |
| `data/rankings/` | Compact canonical 1–32 category orders |
| `data/markets/` | Append-only timestamped market snapshots |
| `data/audit/coverage.json` | Machine-readable content and market QA |
| `site/app/` | React report source and normalized evidence |
| `docs/index.html` | Complete offline and GitHub Pages report |

Private provenance, raw transcript snapshots, archived Sites metadata, environment files, caches, credentials, account data, positions, balances, orders, fills, and personal commit details are excluded from Git.

## Update procedure

For a new ranking episode:

1. Acquire the canonical transcript read-only and preserve a private immutable snapshot plus hash.
2. Reconcile a complete, unique 1–32 order before interpreting commentary.
3. Extract every substantive positive, concern, qualifier, comparison, named person, methodological rule, and source locator.
4. Add a new timestamped paired market snapshot without overwriting history.
5. Capture a new append-only Kalshi ladder snapshot, recompute expected wins, group totals, market ranks, and exact-threshold comparisons.
6. Run the content audit, market tests, Vite build, privacy scan, and desktop/mobile browser checks.
7. Commit and publish the updated `docs/` artifact; record the commit and URL in `CHECKPOINT.md`.

## Known source exceptions

- One garbled Jordan Love rate claim is described but not numerically reconstructed.
- The offensive-line name “Keelan Rutledge” is retained as a transcript-derived possible error.
- The skill transcript's “Caslat” is cautiously normalized to Isaac TeSlaa.
- Cleveland's second rookie reference is cautiously normalized to Harold Fannin Jr.
- One garbled Saints backfield name is omitted rather than guessed.
- The coaching source carries implausible private-library publication metadata; episode content and the immutable snapshot determine the edition.

Market information is a timestamped research input, not advice or an instruction to place a wager. Prices can move after capture.
