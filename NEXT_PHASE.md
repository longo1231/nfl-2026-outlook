# Completed phase: price-adjusted markets and GitHub Pages

Status: implemented on 2026-08-23; publication details are finalized in `CHECKPOINT.md`.

## Outcome

The one-sided nominal-line market comparison has been replaced by paired, de-vigged probabilities and a price-adjusted ordinal market ranking. The report is packaged as a sanitized, self-contained `docs/index.html` that works offline and is the GitHub Pages publication surface. The owner-only Sites v1 remains frozen and privately preserved.

## Captured market evidence

- Primary board: https://www.outrights.io/nfl/win-totals-odds
- Capture time: `2026-08-23T18:41:26-04:00`
- Snapshot file: `data/markets/2026-08-23T184126-0400-paired-win-totals.json`
- Raw captured page SHA-256: `5c82d4410db707c0e22e9bd6dd206adceca3a08872d33f2378e1ddccb7b7e346`
- Paired quotes: 191 across six named books
- Team coverage: 32/32 paired primary thresholds
- Multi-threshold coverage: 19/32 teams
- Full 17-tail expected-win coverage: 0/32 teams
- Per-quote market update time: unavailable from the rendered board; the capture timestamp is authoritative
- Official cross-check: https://sports.betmgm.com/en/blog/nfl/nfl-over-under-wins-2026-win-totals-all-32-teams-bm16/ (published 2026-08-12; used only to verify pairing and sign format, not mixed with the newer capture)

No source exposed a full same-book alternate ladder in the public board. Cross-book second thresholds are retained only when both sides came from the same book at that threshold.

## Implemented probability method

American odds are converted to raw implied probability:

```text
negative odds -A: p = A / (A + 100)
positive odds +A: p = 100 / (A + 100)
```

Each book is de-vigged independently:

```text
q_over  = p_over  / (p_over + p_under)
q_under = p_under / (p_over + p_under)
```

At a half-win line `k - 0.5`, `q_over` is treated as the observed tail `P(W >= k)`. At each threshold, the consensus is the median of independently de-vigged same-book pairs. The implementation never combines prices from different books into one pair.

Tail points are sorted by `k` and audited for non-increasing probability. Weighted isotonic regression repairs violations when needed; point weight increases with paired-book count and lower hold. The captured curves had zero raw violations and required zero adjustments, but both raw and adjusted fields remain in the snapshot contract.

Expected wins use the tail-sum identity only with all 17 tails:

```text
E[W] = sum from k=1 to 17 of P(W >= k)
```

The current snapshot does not meet that gate for any team. The report therefore shows an observed 50% bound or bracket, a coverage/confidence label, and an em dash for expected wins. It does not fit a distributional model to sparse points.

## Price-adjusted market order

The market order uses:

```text
ordinal index = posted half-win line + no-vig Over probability - 0.5
```

This uses price to resolve and refine teams sharing a nominal total while keeping the score inside the adjacent one-win interval. It is labeled as an ordinal device, not an expected-win estimate. Exact ties receive their average rank.

The synthesis now means:

> The team's equal-weight Action input rank is better than its price-adjusted market expectation rank.

It remains a disagreement for further research, not a wagering recommendation, because defense, schedule, injuries, special teams, and interactions between units remain incomplete.

## Implementation paths

- `lib/market-math.mjs` — calculation primitives
- `scripts/build-market-snapshot.mjs` — deterministic source parser and snapshot builder
- `tests/market-math.test.mjs` — odds, de-vigging, isotonicity, mass, expectation, and median-bound tests
- `data/markets/2026-08-23T184126-0400-paired-win-totals.json` — transparent raw and derived snapshot
- `site/app/data.ts` — report adapter for the snapshot
- `site/app/page.tsx` — price-adjusted market and synthesis views
- `site/scripts/inline-standalone.mjs` — single-file artifact builder
- `docs/index.html` — offline and GitHub Pages artifact

## Completion gates

- [x] Every team has paired primary Over/Under prices and a coverage status.
- [x] Every displayed probability comes from a same-book pair or the median of independently de-vigged same-threshold pairs.
- [x] Tail curves are audited and monotone.
- [x] Probability-mass and tail-sum functions are unit tested.
- [x] Unsupported expected-win values are withheld.
- [x] The nominal-line-only ranking no longer drives synthesis.
- [x] The standalone HTML works without a server or local assets.
- [x] Offline desktop and mobile interactions pass browser checks.
- [x] Automated WCAG A/AA scan reports zero violations.
- [x] Private-library identifiers, raw transcripts, workspace paths, Sites metadata, credentials, account data, private positions, and personal commit email are excluded from the public artifact.
- [x] Exact published report artifact commit and deployed GitHub Pages URL recorded in `CHECKPOINT.md`.

## Next content phase

Add the defensive-ranking episode when available. Preserve and hash it privately, reconcile its exact 1–32 order, extend the evidence model, rerun the now-five-category content audit, capture a new paired market snapshot without overwriting this one, recompute the Action average and market disagreement view, rebuild `docs/index.html`, repeat privacy and browser QA, and publish a new Pages commit.
