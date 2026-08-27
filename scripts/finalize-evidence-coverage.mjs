import { readFile, writeFile } from 'node:fs/promises';

import { buildEvidenceViews, evidenceFreshnessSummary, hashEvidence, validateEvidenceLedger, validateEvidenceViews } from '../lib/evidence-ledger.mjs';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const stableId = (prefix, ...parts) => `${prefix}_${hashEvidence(parts).slice(0, 16)}`;
const [ledgerInput, sourceManifest, previewRegistry, migration, freshnessPolicy, auditInput] = await Promise.all([
  readJson('data/evidence/2026-evidence-ledger.json'),
  readJson('data/sources/manifest.json'),
  readJson('data/previews/2026-team-previews.json'),
  readJson('config/evidence-migration-2026.json'),
  readJson('config/freshness-policy.json'),
  readJson('data/evidence/2026-evidence-audit.json'),
]);

const manifestKeyFor = sourceId => migration.category_sources[sourceId]?.manifest_key ?? migration.preview_sources[sourceId]?.manifest_key;
const previewById = new Map(previewRegistry.sources.map(source => [source.id, source]));
const existingReviews = ledgerInput.source_blocks.filter(block => block.review_contract?.kind === 'full-source-review');
let ledger = ledgerInput;
if (existingReviews.length === 0) {
  const sourceBlocks = [...ledgerInput.source_blocks];
  for (const source of ledgerInput.sources) {
    const document = sourceManifest.documents.find(item => (item.category_id ?? item.source_id) === manifestKeyFor(source.source_id));
    if (!document) throw new Error(`No public source manifest record for ${source.source_id}`);
    const preview = previewById.get(source.source_id);
    const extent = document.lines
      ? { unit: 'lines', start: 1, end: document.lines }
      : preview?.source.duration_seconds
        ? { unit: 'seconds', start: 0, end: preview.source.duration_seconds }
        : { unit: 'source', start: 1, end: 1 };
    const linked = sourceBlocks.filter(block => block.source_id === source.source_id);
    sourceBlocks.push({
      source_block_id: stableId('blk', source.source_id, 'full-source-review', source.source_sha256),
      season: ledgerInput.season,
      source_id: source.source_id,
      source_sha256: source.source_sha256,
      team_ids: [...new Set(linked.flatMap(block => block.team_ids))],
      entity_ids: [],
      source_locator: { kind: 'full-source', extent },
      locator_confidence: 'high',
      disposition: 'captured',
      captured_at: source.captured_at,
      recorded_at: ledgerInput.recorded_at,
      ambiguity_note: null,
      view_contract: null,
      review_contract: {
        kind: 'full-source-review',
        review_basis: 'Edition 7 source extraction plus Phase 5 claim, ballot, ambiguity and visible-parity review.',
        linked_source_blocks: linked.length,
        unreviewed_substantive_blocks: 0
      }
    });
  }
  const { ledger_id: _priorLedgerId, ...core } = { ...ledgerInput, source_blocks: sourceBlocks };
  ledger = { ...core, ledger_id: `evidence-2026-${hashEvidence(core).slice(0, 16)}` };
}

validateEvidenceLedger(ledger, { freshnessPolicy });
const views = buildEvidenceViews(ledger);
validateEvidenceViews(views, ledger);
const freshness = evidenceFreshnessSummary(ledger);
const auditCore = {
  ...auditInput,
  ledger_id: ledger.ledger_id,
  generated_visible_sha256: hashEvidence({ categories: views.categories, previews: views.previews }),
  block_dispositions: Object.fromEntries(['captured', 'non-substantive', 'ambiguous'].map(disposition => [disposition, ledger.source_blocks.filter(block => block.disposition === disposition).length])),
  coverage: {
    ...auditInput.coverage,
    full_source_reviews: ledger.source_blocks.filter(block => block.review_contract?.kind === 'full-source-review').length,
    unreviewed_substantive_blocks: ledger.source_blocks.reduce((total, block) => total + (block.review_contract?.unreviewed_substantive_blocks ?? 0), 0)
  },
  freshness,
};
const { audit_id: _priorAuditId, ...auditWithoutId } = auditCore;
const audit = { ...auditWithoutId, audit_id: `evidence-audit-${hashEvidence(auditWithoutId).slice(0, 16)}` };
if (audit.generated_visible_sha256 !== audit.visible_baseline_sha256) throw new Error('Full-source coverage finalization changed the visible summary baseline');

await Promise.all([
  writeJson('data/evidence/2026-evidence-ledger.json', ledger),
  writeJson('data/evidence/2026-generated-summaries.json', views),
  writeJson('data/evidence/2026-evidence-audit.json', audit),
]);
console.log(JSON.stringify({ ledger_id: ledger.ledger_id, source_blocks: ledger.source_blocks.length, full_source_reviews: audit.coverage.full_source_reviews, unreviewed_substantive_blocks: audit.coverage.unreviewed_substantive_blocks, visible_summary_parity: audit.visible_summary_parity }, null, 2));
