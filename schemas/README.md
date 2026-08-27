# System contracts

These JSON Schemas document the four-layer record boundary implemented through Phase 6. Runtime validation lives in `lib/system-contracts.mjs`, `lib/evidence-ledger.mjs`, `lib/weekly-state.mjs` and `lib/learning-loop.mjs`; tests exercise public records and redacted private fixtures without reading canonical `.private/` data.

- `public-current-manifest.schema.json` — selected public evidence, forecast, market and readiness state.
- `evidence-*.schema.json` — canonical atomic claims, source blocks, people/entities, ledger and generated views.
- `forecast-version.schema.json` — independent probabilistic forecast output.
- `kalshi-execution-snapshot.schema.json`, `market-quote.schema.json` and `market-comparison.schema.json` — normalized execution-aware market records.
- `weekly-state-version.schema.json` — immutable weekly reconstruction checkpoint.
- `learning-observation.schema.json` and `learning-report.schema.json` — frozen public close/outcome observations and aggregate model diagnostics.
- `private-decision-event.schema.json` — append-only local thesis, decision, order, fill, close, outcome and postmortem events, including same-side closing prices for private CLV.

Schemas are public. Canonical private records conforming to the decision-event schema remain under `.private/decision-system/` and are never test inputs or repository payloads.
