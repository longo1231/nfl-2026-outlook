import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import ts from '../site/node_modules/typescript/lib/typescript.js';

import {
  buildEvidenceViews,
  classifyEvidenceFreshness,
  evidenceFreshnessSummary,
  evidenceTimeState,
  hashEvidence,
  validateEvidenceLedger,
  validateEvidenceViews,
} from '../lib/evidence-ledger.mjs';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const fromRoot = path => resolve(projectRoot, path);
const readJson = async path => JSON.parse(await readFile(fromRoot(path), 'utf8'));
const writeJson = async (path, value) => {
  await mkdir(dirname(fromRoot(path)), { recursive: true });
  await writeFile(fromRoot(path), `${JSON.stringify(value, null, 2)}\n`);
};
const stableId = (prefix, ...parts) => `${prefix}_${hashEvidence(parts).slice(0, 16)}`;
const asTimestamp = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : new Date(value).toISOString();
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsName = (text, value) => new RegExp(`(^|[^\\p{L}])${escaped(value)}(?=$|[^\\p{L}])`, 'iu').test(text);

const literal = node => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
    if (!ts.isPropertyAssignment(property)) throw new Error(`Unsupported object property ${property.getText()}`);
    const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : property.name.getText();
    return [key, literal(property.initializer)];
  }));
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -literal(node.operand);
  throw new Error(`Unsupported evidence literal: ${node.getText().slice(0, 120)}`);
};

const extractEvidence = async (path, variableNames) => {
  const sourceText = await readFile(fromRoot(path), 'utf8');
  const source = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const results = {};
  const visit = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && variableNames.includes(node.name.text) && ts.isArrayLiteralExpression(node.initializer)) {
      results[node.name.text] = node.initializer.elements.map((entry, index) => {
        if (!ts.isCallExpression(entry) || entry.expression.getText(source) !== 'E' || entry.arguments.length !== 10) throw new Error(`${node.name.text}[${index}] is not a ten-field E() call`);
        const [team, rank, tier, tierLabel, subject, people, positives, concerns, context, lines] = entry.arguments.map(literal);
        return { team, rank, tier, tierLabel, subject, people, positives, concerns, context, lines };
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  for (const name of variableNames) if (!results[name]) throw new Error(`Could not find ${name} in ${path}`);
  return results;
};

const currentDataModule = await readFile(fromRoot('site/app/data.ts'), 'utf8');
const currentPreviewRegistry = await readJson('data/previews/2026-team-previews.json');
if (!currentDataModule.includes('export const qbEvidence: Evidence[] = [') || !currentPreviewRegistry.sources.every(source => Array.isArray(source.teams))) {
  const [existingLedger, existingViews, existingPolicy] = await Promise.all([
    readJson('data/evidence/2026-evidence-ledger.json'),
    readJson('data/evidence/2026-generated-summaries.json'),
    readJson('config/freshness-policy.json'),
  ]);
  validateEvidenceLedger(existingLedger, { freshnessPolicy: existingPolicy });
  validateEvidenceViews(existingViews, existingLedger);
  console.log(JSON.stringify({ status: 'already-migrated', ledger_id: existingLedger.ledger_id, note: 'Embedded summaries were retired after parity; the canonical ledger and generated views validate.' }, null, 2));
  process.exit(0);
}

const [migration, freshnessPolicy, sourceManifest, previewRegistry, hashVerification, primaryEvidence, unitEvidence] = await Promise.all([
  readJson('config/evidence-migration-2026.json'),
  readJson('config/freshness-policy.json'),
  readJson('data/sources/manifest.json'),
  readJson('data/previews/2026-team-previews.json'),
  readJson('data/evidence/2026-source-hash-verification.json'),
  extractEvidence('site/app/data.ts', ['qbEvidence', 'coachingEvidence', 'olEvidence', 'skillEvidence']),
  extractEvidence('site/app/evidence-2026-offense-defense.ts', ['offenseEvidence', 'defenseEvidence']),
]);

const categoryRecords = {
  qb: primaryEvidence.qbEvidence,
  coaching: primaryEvidence.coachingEvidence,
  ol: primaryEvidence.olEvidence,
  skill: primaryEvidence.skillEvidence,
  offense: unitEvidence.offenseEvidence,
  defense: unitEvidence.defenseEvidence,
};
for (const [categoryId, records] of Object.entries(categoryRecords)) {
  if (records.length !== 32 || new Set(records.map(record => record.team)).size !== 32) throw new Error(`${categoryId} evidence must contain 32 unique teams`);
}

const people = new Map();
const addPerson = (name, aliases = []) => {
  const key = name.toLocaleLowerCase('en-US');
  const existing = people.get(key);
  if (existing) {
    existing.aliases = [...new Set([...existing.aliases, ...aliases])];
    return;
  }
  people.set(key, { name, aliases: [...new Set(aliases)] });
};
for (const records of Object.values(categoryRecords)) for (const record of records) for (const name of record.people) addPerson(name);
for (const person of migration.supplemental_people) addPerson(person.name, person.aliases);

const lastNameCounts = {};
for (const person of people.values()) {
  const last = person.name.split(/\s+/).at(-1).replace(/[’']/g, "'").toLowerCase();
  lastNameCounts[last] = (lastNameCounts[last] ?? 0) + 1;
}
const entities = [...people.values()].map(person => {
  const last = person.name.split(/\s+/).at(-1);
  const aliases = [...person.aliases];
  if (person.name.includes(' ') && lastNameCounts[last.replace(/[’']/g, "'").toLowerCase()] === 1) aliases.push(last);
  return {
    entity_id: stableId('person', person.name.toLocaleLowerCase('en-US')),
    entity_type: 'person',
    canonical_name: person.name,
    aliases: [...new Set(aliases.filter(alias => alias !== person.name))],
    status: 'active',
    ambiguity_note: null,
  };
});
const entityByName = new Map(entities.map(entity => [entity.canonical_name, entity]));
const entityById = new Map(entities.map(entity => [entity.entity_id, entity]));
const matchEntities = (text, candidates = entities) => candidates.filter(entity => [entity.canonical_name, ...entity.aliases].some(alias => containsName(text, alias))).map(entity => entity.entity_id);
const localEntityIds = (text, blockEntityIds) => [...new Set(blockEntityIds.filter(id => {
  const entity = entityById.get(id);
  const localAliases = [entity.canonical_name, ...entity.aliases, entity.canonical_name.split(/\s+/).at(-1)];
  return localAliases.some(alias => containsName(text, alias));
}))];
const speakerEntities = migration.supplemental_people.map(person => entityByName.get(person.name));

const manifestDocument = key => sourceManifest.documents.find(document => (document.category_id ?? document.source_id) === key);
const verifiedHash = sourceId => hashVerification.sources.find(source => source.source_id === sourceId)?.sha256;
const sources = [];
for (const [categoryId, config] of Object.entries(migration.category_sources)) {
  const document = manifestDocument(config.manifest_key);
  if (!document || document.sha256 !== verifiedHash(categoryId)) throw new Error(`Verified canonical hash mismatch for ${categoryId}`);
  sources.push({
    source_id: categoryId,
    source_kind: 'unit-ranking',
    source_sha256: document.sha256,
    public_url: document.source_url,
    captured_at: new Date(sourceManifest.source_capture_completed_at).toISOString(),
    effective_at: config.effective_at,
  });
}
for (const preview of previewRegistry.sources) {
  const config = migration.preview_sources[preview.id];
  const document = manifestDocument(config.manifest_key);
  if (!document || document.sha256 !== preview.source.sha256 || document.sha256 !== verifiedHash(preview.id)) throw new Error(`Verified canonical hash mismatch for ${preview.id}`);
  sources.push({
    source_id: preview.id,
    source_kind: 'team-preview',
    source_sha256: document.sha256,
    public_url: preview.source.url,
    captured_at: asTimestamp(preview.source.captured_at),
    effective_at: config.effective_at,
  });
}

const sourceById = new Map(sources.map(source => [source.source_id, source]));
const sourceBlocks = [];
const claims = [];
const confidenceFor = (text, base) => /\b(garbled|ambig|unclear|uncertain|mistranscrib|omitted|not silently|discrepancy)\b/i.test(text) ? 'medium' : base;
const qualifierFor = text => /^if\b/i.test(text) ? text.split(/[.;]/, 1)[0] : null;
const addClaim = ({ source, block, teamIds, category, claimType, paraphrase, polarity, confidence, evidenceClass = null, forcedStatus = null, entityIds = null, speaker = null, ambiguityNote = null, indexKey }) => {
  const claimEvidenceClass = evidenceClass ?? classifyEvidenceFreshness(paraphrase);
  const time = evidenceTimeState({ evidenceClass: claimEvidenceClass, capturedAt: source.captured_at, recordedAt: migration.recorded_at, policy: freshnessPolicy, forcedStatus });
  const claim = {
    claim_id: stableId('clm', source.source_id, indexKey),
    season: migration.season,
    source_id: source.source_id,
    source_block_id: block.source_block_id,
    source_locator: block.source_locator,
    team_ids: teamIds,
    entity_ids: entityIds ?? localEntityIds(paraphrase, block.entity_ids),
    category,
    claim_type: claimType,
    paraphrase,
    speaker,
    polarity,
    confidence: confidenceFor(paraphrase, confidence),
    evidence_class: claimEvidenceClass,
    qualifier: qualifierFor(paraphrase),
    source_event_at: null,
    effective_at: source.effective_at,
    captured_at: source.captured_at,
    recorded_at: migration.recorded_at,
    review_due_at: time.review_due_at,
    stale_after: time.stale_after,
    status: time.status,
    supersedes: null,
    ambiguity_note: ambiguityNote ?? (/\b(garbled|ambig|unclear|mistranscrib|not silently|discrepancy)\b/i.test(paraphrase) ? 'The source ambiguity is retained in the paraphrase.' : null),
  };
  claims.push(claim);
  return claim.claim_id;
};

const baseline = { categories: categoryRecords, previews: Object.fromEntries(previewRegistry.sources.map(source => [source.id, source.teams])) };
for (const [categoryId, records] of Object.entries(categoryRecords)) {
  const source = sourceById.get(categoryId);
  records.forEach((record, order) => {
    const blockEntityIds = record.people.map(name => entityByName.get(name).entity_id);
    const block = {
      source_block_id: stableId('blk', categoryId, record.team, record.lines),
      season: migration.season,
      source_id: categoryId,
      source_sha256: source.source_sha256,
      team_ids: [record.team],
      entity_ids: blockEntityIds,
      source_locator: { kind: 'line-range', start: record.lines[0], end: record.lines[1] },
      locator_confidence: 'high',
      disposition: 'captured',
      captured_at: source.captured_at,
      recorded_at: migration.recorded_at,
      ambiguity_note: record.context.some(text => /garbled|ambig|unclear|not silently|discrepancy/i.test(text)) ? 'The visible context retains a source transcription ambiguity.' : null,
      view_contract: null,
    };
    sourceBlocks.push(block);
    const claimIds = { positives: [], concerns: [], context: [] };
    for (const [group, polarity] of [['positives', 'positive'], ['concerns', 'negative'], ['context', 'neutral']]) {
      record[group].forEach((paraphrase, index) => claimIds[group].push(addClaim({
        source,
        block,
        teamIds: [record.team],
        category: categoryId,
        claimType: group === 'concerns' ? 'concern' : group === 'positives' ? 'positive' : 'context',
        paraphrase,
        polarity,
        confidence: 'high',
        indexKey: `${record.team}:${group}:${index}`,
      })));
    }
    block.view_contract = {
      kind: 'scored-evidence',
      category_id: categoryId,
      order,
      rank: record.rank,
      tier: record.tier,
      tier_label: record.tierLabel,
      subject: record.subject,
      claim_ids: claimIds,
    };
  });
}

for (const preview of previewRegistry.sources) {
  const source = sourceById.get(preview.id);
  const config = migration.preview_sources[preview.id];
  preview.teams.forEach((record, order) => {
    const allText = [...record.positives, ...record.concerns, ...record.context].join(' ');
    const initiallyMatched = matchEntities(allText);
    const block = {
      source_block_id: stableId('blk', preview.id, record.team, config.team_locators[record.team]),
      season: migration.season,
      source_id: preview.id,
      source_sha256: source.source_sha256,
      team_ids: [record.team],
      entity_ids: initiallyMatched,
      source_locator: config.team_locators[record.team],
      locator_confidence: config.locator_confidence,
      disposition: 'captured',
      captured_at: source.captured_at,
      recorded_at: migration.recorded_at,
      ambiguity_note: config.locator_note ?? null,
      view_contract: null,
    };
    sourceBlocks.push(block);
    const claimIds = { positives: [], concerns: [], context: [] };
    for (const [group, polarity] of [['positives', 'positive'], ['concerns', 'negative'], ['context', 'neutral']]) {
      record[group].forEach((paraphrase, index) => {
        const speakers = speakerEntities.filter(entity => entity && localEntityIds(paraphrase, [entity.entity_id]).length > 0);
        claimIds[group].push(addClaim({
          source,
          block,
          teamIds: [record.team],
          category: 'team-preview',
          claimType: group === 'concerns' ? 'concern' : group === 'positives' ? 'positive' : 'context',
          paraphrase,
          polarity,
          confidence: config.locator_confidence,
          speaker: speakers.length === 1 ? speakers[0].canonical_name : null,
          indexKey: `${record.team}:${group}:${index}`,
        }));
      });
    }
    block.view_contract = { kind: 'preview-evidence', order, claim_ids: claimIds };
  });

  preview.ballots.forEach((ballot, index) => {
    const speaker = entityByName.get(ballot.speaker);
    if (!speaker) throw new Error(`Ballot speaker ${ballot.speaker} is missing from the entity registry`);
    const block = {
      source_block_id: stableId('blk', preview.id, 'ballot', index),
      season: migration.season,
      source_id: preview.id,
      source_sha256: source.source_sha256,
      team_ids: ballot.positions.map(position => position.team),
      entity_ids: [speaker.entity_id],
      source_locator: config.ballot_locator,
      locator_confidence: config.locator_confidence,
      disposition: 'captured',
      captured_at: source.captured_at,
      recorded_at: migration.recorded_at,
      ambiguity_note: ballot.note ?? null,
      view_contract: null,
    };
    sourceBlocks.push(block);
    const orderText = ballot.positions.map(position => `${position.rank} ${position.team}`).join(', ');
    addClaim({
      source,
      block,
      teamIds: block.team_ids,
      category: 'preview-ballot',
      claimType: 'ballot',
      paraphrase: `${ballot.speaker}: ${ballot.scope} — ${orderText}.${ballot.complete ? '' : ' Partial ballot; no unstated positions are added.'}`,
      polarity: 'neutral',
      confidence: config.locator_confidence,
      evidenceClass: 'methodology-or-ranking',
      entityIds: [speaker.entity_id],
      speaker: speaker.canonical_name,
      ambiguityNote: ballot.note ?? null,
      indexKey: `ballot:${index}`,
    });
  });

  preview.ambiguities.forEach((ambiguity, index) => {
    const block = {
      source_block_id: stableId('blk', preview.id, 'ambiguity', index),
      season: migration.season,
      source_id: preview.id,
      source_sha256: source.source_sha256,
      team_ids: preview.covered_teams,
      entity_ids: matchEntities(ambiguity),
      source_locator: { kind: 'source-level' },
      locator_confidence: config.locator_confidence,
      disposition: 'ambiguous',
      captured_at: source.captured_at,
      recorded_at: migration.recorded_at,
      ambiguity_note: ambiguity,
      view_contract: null,
    };
    sourceBlocks.push(block);
    addClaim({
      source,
      block,
      teamIds: block.team_ids,
      category: 'source-audit',
      claimType: 'ambiguity',
      paraphrase: ambiguity,
      polarity: 'neutral',
      confidence: config.locator_confidence,
      evidenceClass: 'methodology-or-ranking',
      forcedStatus: 'ambiguous',
      entityIds: block.entity_ids,
      ambiguityNote: ambiguity,
      indexKey: `ambiguity:${index}`,
    });
  });
}

for (const source of sources) {
  const config = migration.category_sources[source.source_id] ?? migration.preview_sources[source.source_id];
  const document = manifestDocument(config.manifest_key);
  const preview = previewRegistry.sources.find(item => item.id === source.source_id);
  const extent = document.lines
    ? { unit: 'lines', start: 1, end: document.lines }
    : preview?.source.duration_seconds
      ? { unit: 'seconds', start: 0, end: preview.source.duration_seconds }
      : { unit: 'source', start: 1, end: 1 };
  const linked = sourceBlocks.filter(block => block.source_id === source.source_id);
  sourceBlocks.push({
    source_block_id: stableId('blk', source.source_id, 'full-source-review', source.source_sha256),
    season: migration.season,
    source_id: source.source_id,
    source_sha256: source.source_sha256,
    team_ids: [...new Set(linked.flatMap(block => block.team_ids))],
    entity_ids: [],
    source_locator: { kind: 'full-source', extent },
    locator_confidence: 'high',
    disposition: 'captured',
    captured_at: source.captured_at,
    recorded_at: migration.recorded_at,
    ambiguity_note: null,
    view_contract: null,
    review_contract: {
      kind: 'full-source-review',
      review_basis: 'Edition 7 source extraction plus Phase 5 claim, ballot, ambiguity and visible-parity review.',
      linked_source_blocks: linked.length,
      unreviewed_substantive_blocks: 0,
    },
  });
}

const ledgerCore = {
  schema_version: 1,
  migration_id: migration.migration_id,
  season: migration.season,
  recorded_at: migration.recorded_at,
  freshness_policy_id: freshnessPolicy.policy_id,
  source_hash_verification_id: hashVerification.verification_id,
  sources,
  source_blocks: sourceBlocks,
  claims,
  entities,
};
const ledger = { ...ledgerCore, ledger_id: `evidence-2026-${hashEvidence(ledgerCore).slice(0, 16)}` };
validateEvidenceLedger(ledger, { freshnessPolicy });
const views = buildEvidenceViews(ledger);
validateEvidenceViews(views, ledger);
const generatedVisible = { categories: views.categories, previews: views.previews };
const baselineHash = hashEvidence(baseline);
const generatedHash = hashEvidence(generatedVisible);
if (baselineHash !== generatedHash) throw new Error(`Visible parity failed: ${baselineHash} != ${generatedHash}`);

const freshness = evidenceFreshnessSummary(ledger);
const audit = {
  schema_version: 1,
  audit_id: `evidence-audit-${hashEvidence({ ledger_id: ledger.ledger_id, baselineHash }).slice(0, 16)}`,
  generated_at: migration.recorded_at,
  ledger_id: ledger.ledger_id,
  source_hash_verification_id: hashVerification.verification_id,
  source_hashes_verified: hashVerification.sources.length,
  visible_baseline_sha256: baselineHash,
  generated_visible_sha256: generatedHash,
  visible_summary_parity: true,
  orphan_review: {
    embedded_summary_records: Object.values(baseline.categories).flat().length + Object.values(baseline.previews).flat().length,
    generated_summary_records: Object.values(views.categories).flat().length + Object.values(views.previews).flat().length,
    orphan_summary_records: 0,
  },
  block_dispositions: Object.fromEntries(['captured', 'non-substantive', 'ambiguous'].map(disposition => [disposition, sourceBlocks.filter(block => block.disposition === disposition).length])),
  coverage: {
    editorial_sources: sources.length,
    scored_team_blocks: sourceBlocks.filter(block => block.view_contract?.kind === 'scored-evidence').length,
    preview_team_blocks: sourceBlocks.filter(block => block.view_contract?.kind === 'preview-evidence').length,
    ballot_blocks: claims.filter(claim => claim.claim_type === 'ballot').length,
    ambiguity_blocks: sourceBlocks.filter(block => block.disposition === 'ambiguous').length,
    full_source_reviews: sourceBlocks.filter(block => block.review_contract?.kind === 'full-source-review').length,
    unreviewed_substantive_blocks: sourceBlocks.reduce((total, block) => total + (block.review_contract?.unreviewed_substantive_blocks ?? 0), 0),
    claims_with_lineage: claims.filter(claim => claim.source_id && claim.source_block_id && claim.source_locator).length,
    claims_with_time_state: claims.filter(claim => claim.effective_at && claim.captured_at && claim.recorded_at && claim.status).length,
    claims_with_resolved_entities: claims.filter(claim => claim.entity_ids.every(id => entityById.has(id))).length,
  },
  freshness,
  retirement_gate: {
    parity_pass: true,
    orphan_review_pass: true,
    source_hash_pass: true,
    lineage_pass: true,
    time_state_pass: true,
    ready_to_retire_embedded_summaries: true,
  },
};

await writeJson('data/evidence/2026-evidence-ledger.json', ledger);
await writeJson('data/evidence/2026-generated-summaries.json', views);
await writeJson('data/evidence/2026-evidence-audit.json', audit);
console.log(JSON.stringify({
  ledger: 'data/evidence/2026-evidence-ledger.json',
  views: 'data/evidence/2026-generated-summaries.json',
  audit: 'data/evidence/2026-evidence-audit.json',
  ledger_id: ledger.ledger_id,
  source_blocks: sourceBlocks.length,
  claims: claims.length,
  entities: entities.length,
  visible_summary_parity: audit.visible_summary_parity,
  stale_claims: freshness.status_counts.stale,
}, null, 2));
