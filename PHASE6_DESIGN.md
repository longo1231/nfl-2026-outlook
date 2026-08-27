# Phase 6 workflow and learning-loop design

Status: approved for local implementation on 2026-08-27

## Outcome

Turn the four existing layers into one weekly operating workflow without converting provisional research into a recommendation or exposing private state publicly.

## Public workflow

The public app has five top-level destinations:

1. **Today** — current layer readiness, evidence review queue, forecast gates, market age and movement, frozen weekly state, learning-loop status and public warnings.
2. **Opportunities** — only validated, executable, persistent model-versus-Kalshi candidates. When the forecast is not validated, the board is disabled and provisional differences remain visibly labeled lab diagnostics.
3. **Team dossiers** — atomic source thesis, current evidence-review count, independent forecast distribution, Kalshi distribution/movement and change context for one team.
4. **Markets** — complete Kalshi curves, depth, size-aware price, fees, age, movement, persistence and league/division totals.
5. **Research library** — the existing briefing, decision-system audit, forecast lab, matrices, category rankings, previews, synthesis and source QA.

Portfolio and personal decision state stay in the separate ignored local application.

## Immutable weekly state

- A weekly state version is a content-addressed, immutable JSON record.
- It freezes the exact public manifest, evidence ledger, forecast, Kalshi execution snapshot, readiness audit and policy versions used at that point.
- The public manifest copy is archived beside the weekly record before the mutable `data/current/` pointer moves.
- Re-running the freeze against identical inputs returns the existing version. A different input set creates a new file; no history is overwritten.
- The first record is the 2026 preseason prior. Later weekly records must use the same command and contract.

## Learning records

Public learning observations evaluate a frozen forecast against an observed Kalshi close and settlement. Each observation names the exact weekly state, model version, decision-time market snapshot, closing market snapshot, contract, horizon, confidence bucket, model probability, closing probability and binary outcome.

The public report calculates Brier score, log loss, expected calibration error, closing-price benchmark scores and model-to-close probability movement. These are model/process measurements, not personal wagering performance.

Actual entry-price CLV remains private. A new append-only `closing_price.recorded` event links a thesis to the same-side closing price and exact public quote reference. The local materialization derives per-contract and total CLV, realized P&L where available, outcome coverage and postmortem queues.

## Empty-state rule

No 2026 learning observation is fabricated. Until a qualifying close and settlement exist, the learning report is `awaiting_observations`, metrics are `null`, and the UI explains what will populate them.

## Reconstruction gate

A decision is reconstructable when its event chain resolves to:

- an archived public manifest and weekly state version;
- the exact evidence, forecast, Kalshi quote and policy identifiers;
- the original thesis, decision, order and fill events;
- a same-side closing-price record, settlement outcome and postmortem when those events exist.

Public verification must prove that no public module imports the private ledger or materialized portfolio.
