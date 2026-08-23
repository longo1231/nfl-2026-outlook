# NFL Outlook Project Rules

This is the canonical workspace for the 2026 NFL Outlook Field Guide. Keep source ingestion, normalized evidence, market modeling, report generation, tests, publication output, and durable notes together here.

## Source integrity

- For private-library ingestion, use the locally configured `readwise-inbox` skill and follow it. If that skill is unavailable, stop before touching the private library. Default to read-only: never move, archive, tag, edit metadata, mark seen/read, create highlights, or create notes unless Stephen explicitly asks.
- Snapshot and hash canonical source documents before interpretation.
- Preserve exact 1–32 source rankings and distinguish source opinion from report-derived synthesis.
- Disclose transcription ambiguities instead of silently reconstructing them.

## Public-repository safety

- Never commit or publish raw transcript snapshots, `.private/`, `.openai/`, environment files, credentials, API/signing keys, account tokens, personal positions, balances, orders, fills, local filesystem paths, logs, caches, `node_modules`, or build scratch directories.
- Before the first public commit, move private provenance containing Reader URLs/IDs into `.private/` or create a sanitized public form.
- Use a GitHub no-reply author email for the public repository when available.
- Treat `docs/` as the GitHub Pages publication surface. Its `index.html` must work offline when opened directly.
- The existing owner-only Sites deployment is a frozen v1 reference until the Pages edition is verified; do not delete it during migration.

## Market modeling

- Follow `NEXT_PHASE.md` for paired-price collection, de-vigging, alternate-line ladders, monotone tail probabilities, coverage labels, expected-win calculations, and tests.
- Never present a modeled expected-win figure as directly observed market data.
- Keep every market snapshot timestamped; do not overwrite history.

## Durable state

- Update `README.md`, `CHECKPOINT.md`, `SPEC.md`, and `NEXT_PHASE.md` when architecture, methodology, sources, deployment, blockers, or next actions change.
- Record exact public commits and deployed URLs after publication.
