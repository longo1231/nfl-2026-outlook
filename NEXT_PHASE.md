# 2026 NFL Outlook Field Guide — next phase

Status: Phases 0–6 were implemented, committed and published on 2026-08-27. The public artifact commit is `a29db1040065a0c139d175e3d0b2a44c80c32762`; the explicit Pages workflow commit is `7423a6914877f10fe6b180907288bb9e6f4a7af6`. Exact active files and verification state are recorded in `CHECKPOINT.md`.

## Completed system

- Phase 0 preserved the published Edition 7 baseline and added one full verification command.
- Phase 1 added validated policies, schemas, freshness and one generated current-state manifest.
- Phase 2 added the ignored hash-chained private ledger and separate local app. The canonical ledger remains empty.
- Phase 3 added the market-independent schedule simulator and frozen validation report. The forecast remains provisional because ECE is `0.043943` versus the locked `0.040000` maximum and sourced current-adjustment coverage is `0/32`.
- Phase 4 added Kalshi-only full-book capture, depth-aware execution, fees, movement, persistence and fail-closed action eligibility.
- Phase 5 migrated visible summaries into 972 atomic claims, 270 source blocks and 506 normalized people with exact parity and zero orphans.
- Phase 6 added the Today/Opportunities/Team dossiers/Markets/Research workflow, immutable weekly state, public outcome-scoring contracts and private same-side CLV/postmortem materializations.

## Active state

- Evidence ledger: `data/evidence/2026-evidence-ledger.json`; 42 time-sensitive claims require current-use review across 19 teams.
- Forecast: `data/forecasts/fcst-2026-preseason-bf554ba7c4aee595.json`; provisional and not decision eligible.
- Kalshi execution: `data/markets/20260827T153038.207Z-kalshi-nfl-execution.json`; historical after its five-minute action window, with 99 persistent research diagnostics and zero action candidates.
- Readiness audit: `data/audit/20260827T170147Z-decision-system-readiness.json`.
- Weekly checkpoint: `weekly-2026-preseason-prior-3c7ab67d2d4db794`; two immutable preseason states are retained.
- Learning report: `data/current/learning-report.json`; `awaiting_observations` with zero fabricated rows.
- Private ledger: initialized and empty; no account, balance, order or position connection.

## Phase 6 completion gate — passed as operating infrastructure

- A redacted historical lifecycle reconstructs through 13 immutable thesis, decision, fill, closing-price, close, outcome and postmortem events.
- Weekly state files archive the exact public manifest and hash every selected evidence, forecast, market, readiness and policy file. Verification re-hashes every retained reference.
- Public learning observations must reconcile the frozen weekly model and decision-time market with a retained same-side closing quote before they can be appended.
- Public Brier, log loss, calibration and model-to-close groupings are implemented by model version, horizon, confidence and market type.
- Private entry-price CLV, realized P&L and postmortem queues derive from the append-only local ledger.
- The public workflow imports no private thesis, bankroll, exposure, order, fill, position or note state.

## Next operating sequence

1. Review the 42 current-use evidence flags. Append sourced successors when the underlying roster, role or availability fact has changed; never rewrite the original source claim.
2. Before using a materially refreshed state for a decision, run a new Kalshi capture, rebuild the current state and freeze a new game-week checkpoint.
3. Record source-backed closing prices and settlements only when they exist. The learning report must remain empty before then.
4. Operate the private Today/Theses/Portfolio/Learning loop manually and establish an encrypted backup policy before meaningful private state accumulates.
5. Pursue forecast promotion as a separate version: source quarterback and material-availability adjustments for all 32 teams, preregister any calibration change and never retune on the frozen holdout.
6. Add full validation CI separately if desired. The current GitHub workflow is intentionally deployment-only and uploads only the already-verified `docs/` artifact.

## Recurring commands

- `npm run kalshi:capture` — append a new public full-book snapshot; never overwrites history.
- `npm run current:build` — rebuild the current public pointers and workflow summary.
- `npm run weekly:freeze -- game-week <N>` — freeze one immutable checkpoint after source and market review.
- `npm run learning:record -- <observation.json>` — append one reconciled public close/outcome observation.
- `npm run learning:build` — rebuild the public scoring report, including its truthful empty state.
- `npm run decision:build` — materialize and build the ignored private application.
- `npm run verify` — deterministic evidence, forecast, learning, current state, tests, contracts, public privacy/offline build and redacted private lifecycle.

## Publication boundary

- The Phase 0–6 public checkpoint is deployed at https://longo1231.github.io/nfl-2026-outlook/; future source, forecast or market-state changes require a new verified commit and immutable weekly state where applicable.
- Keep the private decision ledger, materialized state and private app output local and ignored.
- Preserve the frozen owner-only Sites v1 reference.
- Ingest private-library sources only through the configured read-only workflow.
- No brokerage/exchange order placement or account integration is in scope.
