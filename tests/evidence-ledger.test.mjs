import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildEvidenceViews, hashEvidence, validateEvidenceLedger, validateEvidenceViews } from '../lib/evidence-ledger.mjs';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [ledger, views, audit, freshness, previews] = await Promise.all([
  readJson('../data/evidence/2026-evidence-ledger.json'),
  readJson('../data/evidence/2026-generated-summaries.json'),
  readJson('../data/evidence/2026-evidence-audit.json'),
  readJson('../config/freshness-policy.json'),
  readJson('../data/previews/2026-team-previews.json'),
]);

test('the Phase 5 atomic ledger satisfies lineage, entity, time-state and supersession contracts', () => {
  assert.equal(validateEvidenceLedger(ledger, { freshnessPolicy: freshness }), true);
  assert.equal(ledger.sources.length, 11);
  assert.equal(ledger.source_blocks.length, 270);
  assert.equal(ledger.claims.length, 972);
  assert.equal(ledger.entities.length, 506);
  assert.equal(new Set(ledger.claims.map(claim => claim.claim_id)).size, ledger.claims.length);
  assert.equal(new Set(ledger.source_blocks.map(block => block.source_block_id)).size, ledger.source_blocks.length);
  assert.equal(ledger.source_blocks.filter(block => block.review_contract?.kind === 'full-source-review').length, 11);
  assert.equal(audit.coverage.unreviewed_substantive_blocks, 0);
  assert.ok(ledger.claims.every(claim => claim.source_id && claim.source_block_id && claim.source_locator && claim.effective_at && claim.captured_at && claim.recorded_at));
  assert.ok(ledger.claims.every(claim => claim.entity_ids.every(id => ledger.entities.some(entity => entity.entity_id === id))));
});

test('time-sensitive claims all expose review and stale timestamps without rewriting historical source meaning', () => {
  const timeSensitive = ledger.claims.filter(claim => ['roster-role-or-depth', 'injury-or-availability'].includes(claim.evidence_class));
  assert.equal(timeSensitive.length, 233);
  assert.ok(timeSensitive.every(claim => claim.review_due_at && claim.stale_after));
  assert.equal(ledger.claims.filter(claim => claim.status === 'stale').length, 42);
  assert.equal(ledger.claims.filter(claim => claim.status === 'ambiguous').length, 23);
});

test('only generated evidence views feed the 192 scored and 32 preview records', () => {
  assert.equal(validateEvidenceViews(views, ledger), true);
  assert.deepEqual(buildEvidenceViews(ledger), views);
  assert.equal(Object.values(views.categories).flat().length, 192);
  assert.equal(Object.values(views.previews).flat().length, 32);
  assert.equal(Object.keys(views.lineage).length, 224);
  assert.equal(previews.schema_version, 3);
  assert.ok(previews.sources.every(source => !('teams' in source) && source.evidence_view_source_id === source.id));
});

test('Edition 7 visible meaning passed exact parity and orphan review before embedded summaries retired', () => {
  const visible = { categories: views.categories, previews: views.previews };
  assert.equal(hashEvidence(visible), audit.visible_baseline_sha256);
  assert.equal(audit.generated_visible_sha256, audit.visible_baseline_sha256);
  assert.equal(audit.visible_summary_parity, true);
  assert.deepEqual(audit.orphan_review, { embedded_summary_records: 224, generated_summary_records: 224, orphan_summary_records: 0 });
  assert.equal(audit.retirement_gate.ready_to_retire_embedded_summaries, true);
});

test('all exact and partial preview ballots remain source-stated and no missing position is synthesized', () => {
  const ballotClaims = ledger.claims.filter(claim => claim.claim_type === 'ballot');
  const ballots = previews.sources.flatMap(source => source.ballots);
  assert.equal(ballotClaims.length, ballots.length);
  assert.equal(ballots.length, 12);
  assert.equal(ballots.filter(ballot => ballot.complete).length, 7);
  assert.equal(ballots.filter(ballot => !ballot.complete).length, 5);
  assert.ok(ballots.filter(ballot => !ballot.complete).every(ballot => ballot.positions.length < 4));
});
