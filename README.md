# 2026 NFL Outlook Field Guide

An evidence-first study report built from four Action Network 2026 NFL ranking-podcast transcripts: quarterbacks, coaching staffs, offensive lines, and skill positions. It preserves the exact 1–32 rankings, team-level arguments, named personnel, qualifiers, public source locators, and clearly labeled cross-category synthesis.

The current edition also compares those inputs with a timestamped, price-adjusted NFL win-total snapshot. Each displayed probability comes from a paired Over and Under price at the same book and threshold. No team is assigned an expected-win figure when the observed ladder does not support the full tail-sum calculation.

## Current edition

- Edition: 2
- Data through: 2026-08-23
- Editorial coverage: 128 of 128 expected team-category cells; no missing or duplicate ranks
- Market coverage: 32 of 32 teams with paired primary quotes; 19 teams with a second observed threshold; 0 teams with complete 17-threshold expected-win coverage
- Publication surface: `docs/index.html`
- Published report: https://longo1231.github.io/nfl-2026-outlook/
- Offline behavior: self-contained; no server, package installation, or network connection is required except to open outbound source links
- Legacy reference: the prior owner-only Sites edition is preserved privately as a frozen v1 and is not part of this repository

Publication URL and commit are recorded in `CHECKPOINT.md`.

## Report sections

1. Executive briefing
2. League matrix
3. Team profiles
4. Quarterbacks
5. Coaching
6. Offensive lines
7. Skill positions
8. Paired and de-vigged win markets
9. Cross-category synthesis
10. Sources and QA

The Action input average is the equal-weight mean of the four available ordinal ranks. It is deliberately labeled as incomplete and is not a power rating, a win forecast, or a bet recommendation. Defense should become a fifth input when that ranking episode is available.

## Market method

The captured board contains paired Over/Under prices from named books. For American odds, raw implied probability is:

```text
negative odds -A: A / (A + 100)
positive odds +A: 100 / (A + 100)
```

At each half-win threshold, the two sides from one book are normalized proportionally:

```text
q_over = p_over / (p_over + p_under)
```

When several books quote the same threshold, the report takes the median of their independently de-vigged probabilities. It never combines an Over from one book with an Under from another. Observed tail probabilities are audited in threshold order and passed through weighted non-increasing isotonic regression only if market noise creates a violation.

The price-adjusted market rank uses this ordinal score:

```text
posted half-win line + no-vig Over probability - 0.5
```

That score stays within one-half win of the posted line and is used only to order teams. It is not an expected-win estimate. Expected wins require all 17 tails `P(W >= k)` for `k=1..17`; the current public board does not provide that coverage, so the report shows an observed 50% bound or bracket and leaves expected wins blank.

## Reproduce and test

The market-math tests use Node's built-in test runner and require no package installation:

```sh
npm test
```

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
| `NEXT_PHASE.md` | Completed price-adjusted-market and GitHub Pages phase record |
| `lib/market-math.mjs` | Odds conversion, de-vigging, isotonic regression, probability-mass, and tail-sum functions |
| `scripts/build-market-snapshot.mjs` | Deterministic parser and market-snapshot builder |
| `tests/market-math.test.mjs` | Unit tests for all required market calculations |
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
5. Recompute the price-adjusted market fields and synthesis.
6. Run the content audit, market-math tests, Vite build, privacy scan, and desktop/mobile browser checks.
7. Commit and publish the updated `docs/` artifact; record the commit and URL in `CHECKPOINT.md`.

## Known source exceptions

- One garbled Jordan Love rate claim is described but not numerically reconstructed.
- The offensive-line name “Keelan Rutledge” is retained as a transcript-derived possible error.
- The skill transcript's “Caslat” is cautiously normalized to Isaac TeSlaa.
- Cleveland's second rookie reference is cautiously normalized to Harold Fannin Jr.
- One garbled Saints backfield name is omitted rather than guessed.
- The coaching source carries implausible private-library publication metadata; episode content and the immutable snapshot determine the edition.

Market information is a timestamped research input, not advice or an instruction to place a wager. Prices can move after capture.
