# Kalshi-only execution and pricing design

Status: design locked before implementation; Phase 4 implemented and verified locally on 2026-08-27
Scope: Kalshi `KXNFLWINS` regular-season team-win contracts only

## Purpose

Phase 4 answers one operational question: at a stated capture time and requested size, what price could have been executed on Kalshi, what fee and residual rounding uncertainty applied, and how did that all-in break-even probability compare with a separately versioned fair-probability input?

The layer does not place orders, read an account, infer a bankroll or label a wager actionable while the independent forecast is provisional.

## Removed from the forward architecture

- sportsbook ingestion and refreshes;
- sportsbook de-vigging and consensus construction;
- paired-venue capture synchronization;
- sportsbook-versus-Kalshi candidates;
- multi-venue best execution.

Existing sportsbook files remain immutable historical Edition 7 evidence. They are not selected by the Phase 4 current-state manifest or imported by the current UI.

## Canonical public inputs

Each capture snapshots or identifies:

- Kalshi series metadata and fee type;
- the `KXNFLWINS` contract terms and settlement sources;
- all open 2026-season markets in the series;
- the complete YES and NO bid books for all 544 contracts;
- the effective Kalshi fee schedule and any scheduled series fee changes;
- the active forecast version used for diagnostic comparison.

Public market endpoints require no account state. API keys, balances, positions, orders and fills are outside the public pipeline.

## Binary order-book normalization

Kalshi returns YES bids and NO bids. For a binary contract:

```text
YES ask = 1 - opposing NO bid
NO ask  = 1 - opposing YES bid
```

The executable ladder for a buy order sorts those derived asks from lowest to highest and consumes quantity until the requested contract count is filled or visible depth is exhausted. No depth is invented beyond the captured book.

Each normalized side records a stable contract ID, timestamped quote ID, best bid and ask, displayed size, spread, source-time confidence, fee schedule, stale-after time and full derived ask ladder.

## Reference execution scenarios

Every contract side is priced at 1, 10 and 100 contracts. The 100-contract result is the primary comparable diagnostic; it is not a recommended stake.

For each size report:

- filled and unfilled contracts;
- volume-weighted average price and worst consumed price;
- position cost before fees;
- quadratic taker-fee estimate by consumed level;
- a separately disclosed conservative one-cent rounding reserve;
- all-in cost, break-even probability, maximum payout and maximum profit;
- whether the full requested size was available.

Fill-specific account rounding and rebates cannot be known exactly before execution. The diagnostic break-even includes the conservative reserve; actual fills remain authoritative.

## Forecast comparison

For a threshold `k`, the forecast probability is computed directly from its exact-win mass:

```text
YES fair probability = P(W >= k)
NO fair probability  = 1 - P(W >= k)
```

Net edge is fair probability minus conservative all-in break-even probability. A row can qualify as a research diagnostic only when the full 100-contract reference size is displayed, spread is at most 12 cents, and net edge is at least 5 cents.

No row is action eligible unless the referenced forecast is `validated`, the quote is no more than five minutes old, the effective fee schedule is versioned, and the same qualifying side survives at least two captures spaced 2–15 minutes apart. Every failed gate is retained.

## Movement and persistence

Snapshots are append-only. A capture compares like-for-like ticker and side with the prior Phase 4 capture and records bid, ask, spread and depth changes. Persistence counts consecutive qualifying captures only when their spacing is inside the policy window. Duplicate reads from the same capture never count twice.

## Public/private boundary

Public GitHub data may contain anonymous markets, order books, trades, fees, movement and diagnostic comparisons. Local private state may reference public quote IDs and later store intended orders, actual orders, fills, positions and personal notes.

Phase 4 uses no credentials and performs no order submission. Authenticated read-only reconciliation and order placement require separate future approval.

## Completion gates

- all 32 teams retain complete 17-tail coverage;
- all 544 contracts resolve to one team and threshold;
- every order book derives YES/NO executable ladders without complement errors;
- fee calculations reproduce published examples and use the live series multiplier;
- no scenario claims more fill than captured depth;
- movement compares like-for-like quote IDs across distinct timestamps;
- persistence uses the locked spacing rule;
- provisional forecasts cannot create action-eligible rows;
- manifest, public build, private fixture lifecycle and privacy scans pass.
