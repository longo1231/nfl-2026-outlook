import { createHash } from 'node:crypto';

const CLAIM_STATUSES = new Set(['active', 'review_due', 'stale', 'superseded', 'retracted', 'ambiguous']);
const BLOCK_DISPOSITIONS = new Set(['captured', 'non-substantive', 'ambiguous']);
const CONFIDENCE_LEVELS = new Set(['low', 'medium', 'high']);
const POLARITIES = new Set(['positive', 'negative', 'neutral', 'conditional']);
const TIME_SENSITIVE_CLASSES = new Set(['roster-role-or-depth', 'injury-or-availability']);

const fail = message => { throw new Error(message); };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const requireObject = (value, label) => isObject(value) ? value : fail(`${label} must be an object`);
const requireArray = (value, label) => Array.isArray(value) ? value : fail(`${label} must be an array`);
const requireString = (value, label, { nullable = false } = {}) => {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
  return value;
};
const requireTimestamp = (value, label, { nullable = false } = {}) => {
  if (nullable && value === null) return null;
  requireString(value, label);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) fail(`${label} must be an RFC 3339 timestamp`);
  return value;
};
const requireStringArray = (value, label) => {
  requireArray(value, label);
  value.forEach((entry, index) => requireString(entry, `${label}[${index}]`));
  return value;
};
const unique = (values, label) => {
  if (new Set(values).size !== values.length) fail(`${label} must be unique`);
};

export function canonicalizeEvidence(value) {
  if (Array.isArray(value)) return value.map(canonicalizeEvidence);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalizeEvidence(value[key])]));
}

export function hashEvidence(value) {
  return createHash('sha256').update(JSON.stringify(canonicalizeEvidence(value))).digest('hex');
}

export function classifyEvidenceFreshness(paraphrase) {
  const text = paraphrase.toLowerCase();
  if (/\b(injur|health|healthy|availability|available|return|out for|missed|suspension|suspended|concussion|acl|achilles|hamstring|knee|shoulder|foot|banged up)\b/.test(text)) return 'injury-or-availability';
  if (/\b(traded|trade|signed|added|addition|depart|gone|lost|loss of|new coordinator|new staff|new scheme|returning five starters)\b/.test(text)) return 'transaction';
  if (/\b(depth|starter|starting|roster|receiver room|secondary|offensive line|defensive line|front seven|backfield|tackle|guard|center|corner|linebacker|safety|pass rush|personnel|role|workload)\b/.test(text)) return 'roster-role-or-depth';
  if (/\b(project|projection|outlook|path|ceiling|floor|could|may|might|would|if |unless|expect|preferred|picked|ballot|win total|wins|price|bet|regression|schedule)\b/.test(text)) return 'projection-or-contingency';
  return 'immutable-source-opinion';
}

export function evidenceTimeState({ evidenceClass, capturedAt, recordedAt, policy, forcedStatus = null }) {
  if (forcedStatus) return { review_due_at: null, stale_after: null, status: forcedStatus };
  const definition = policy.evidence_classes[evidenceClass];
  if (!definition) fail(`Unknown evidence freshness class ${evidenceClass}`);
  const plusSeconds = seconds => seconds === null ? null : new Date(new Date(capturedAt).getTime() + seconds * 1000).toISOString();
  const reviewDueAt = plusSeconds(definition.review_after_seconds);
  const staleAfter = plusSeconds(definition.stale_after_seconds);
  const recorded = new Date(recordedAt).getTime();
  const status = staleAfter && recorded >= new Date(staleAfter).getTime()
    ? 'stale'
    : reviewDueAt && recorded >= new Date(reviewDueAt).getTime()
      ? 'review_due'
      : 'active';
  return { review_due_at: reviewDueAt, stale_after: staleAfter, status };
}

export function validateEvidenceLedger(ledger, { freshnessPolicy = null } = {}) {
  requireObject(ledger, 'evidence ledger');
  if (ledger.schema_version !== 1) fail('evidence ledger schema_version must be 1');
  requireString(ledger.ledger_id, 'evidence ledger ID');
  requireString(ledger.migration_id, 'evidence ledger migration ID');
  if (ledger.season !== 2026) fail('evidence ledger season must be 2026');
  requireTimestamp(ledger.recorded_at, 'evidence ledger recorded_at');
  requireString(ledger.freshness_policy_id, 'evidence ledger freshness policy ID');
  requireString(ledger.source_hash_verification_id, 'evidence ledger source hash verification ID');
  const sources = requireArray(ledger.sources, 'evidence ledger sources');
  const blocks = requireArray(ledger.source_blocks, 'evidence ledger source blocks');
  const claims = requireArray(ledger.claims, 'evidence ledger claims');
  const entities = requireArray(ledger.entities, 'evidence ledger entities');
  if (sources.length !== 11) fail(`evidence ledger must contain 11 sources; found ${sources.length}`);

  const sourceIds = sources.map(source => requireString(source.source_id, 'evidence source ID'));
  unique(sourceIds, 'evidence source IDs');
  for (const source of sources) {
    requireString(source.source_sha256, `evidence source ${source.source_id} hash`);
    if (!/^[a-f0-9]{64}$/.test(source.source_sha256)) fail(`evidence source ${source.source_id} hash must be SHA-256`);
    requireTimestamp(source.captured_at, `evidence source ${source.source_id} captured_at`);
  }

  const entityIds = entities.map(entity => requireString(entity.entity_id, 'entity ID'));
  unique(entityIds, 'entity IDs');
  const entityIdSet = new Set(entityIds);
  for (const entity of entities) {
    if (entity.entity_type !== 'person') fail(`entity ${entity.entity_id} must be a person`);
    requireString(entity.canonical_name, `entity ${entity.entity_id} canonical_name`);
    requireStringArray(entity.aliases, `entity ${entity.entity_id} aliases`);
    if (!['active', 'ambiguous'].includes(entity.status)) fail(`entity ${entity.entity_id} has invalid status`);
  }

  const blockIds = blocks.map(block => requireString(block.source_block_id, 'source block ID'));
  unique(blockIds, 'source block IDs');
  const blockById = new Map(blocks.map(block => [block.source_block_id, block]));
  for (const block of blocks) {
    if (!sourceIds.includes(block.source_id)) fail(`source block ${block.source_block_id} has unknown source ${block.source_id}`);
    if (!BLOCK_DISPOSITIONS.has(block.disposition)) fail(`source block ${block.source_block_id} has invalid disposition`);
    if (!CONFIDENCE_LEVELS.has(block.locator_confidence)) fail(`source block ${block.source_block_id} has invalid locator confidence`);
    requireObject(block.source_locator, `source block ${block.source_block_id} locator`);
    requireString(block.source_locator.kind, `source block ${block.source_block_id} locator kind`);
    requireStringArray(block.team_ids, `source block ${block.source_block_id} team_ids`);
    requireStringArray(block.entity_ids, `source block ${block.source_block_id} entity_ids`);
    unique(block.team_ids, `source block ${block.source_block_id} team_ids`);
    unique(block.entity_ids, `source block ${block.source_block_id} entity_ids`);
    if (block.entity_ids.some(id => !entityIdSet.has(id))) fail(`source block ${block.source_block_id} has an unknown entity`);
    requireTimestamp(block.captured_at, `source block ${block.source_block_id} captured_at`);
    requireTimestamp(block.recorded_at, `source block ${block.source_block_id} recorded_at`);
  }

  const claimIds = claims.map(claim => requireString(claim.claim_id, 'claim ID'));
  unique(claimIds, 'claim IDs');
  const claimIdSet = new Set(claimIds);
  for (const claim of claims) {
    const block = blockById.get(claim.source_block_id);
    if (!block) fail(`claim ${claim.claim_id} has unknown block ${claim.source_block_id}`);
    if (claim.source_id !== block.source_id) fail(`claim ${claim.claim_id} source does not match its block`);
    requireObject(claim.source_locator, `claim ${claim.claim_id} source_locator`);
    requireStringArray(claim.team_ids, `claim ${claim.claim_id} team_ids`);
    requireStringArray(claim.entity_ids, `claim ${claim.claim_id} entity_ids`);
    if (claim.entity_ids.some(id => !entityIdSet.has(id))) fail(`claim ${claim.claim_id} has an unknown entity`);
    requireString(claim.category, `claim ${claim.claim_id} category`);
    requireString(claim.claim_type, `claim ${claim.claim_id} claim_type`);
    requireString(claim.paraphrase, `claim ${claim.claim_id} paraphrase`);
    if (!POLARITIES.has(claim.polarity)) fail(`claim ${claim.claim_id} has invalid polarity`);
    if (!CONFIDENCE_LEVELS.has(claim.confidence)) fail(`claim ${claim.claim_id} has invalid confidence`);
    requireTimestamp(claim.source_event_at, `claim ${claim.claim_id} source_event_at`, { nullable: true });
    requireTimestamp(claim.effective_at, `claim ${claim.claim_id} effective_at`);
    requireTimestamp(claim.captured_at, `claim ${claim.claim_id} captured_at`);
    requireTimestamp(claim.recorded_at, `claim ${claim.claim_id} recorded_at`);
    requireTimestamp(claim.review_due_at, `claim ${claim.claim_id} review_due_at`, { nullable: true });
    requireTimestamp(claim.stale_after, `claim ${claim.claim_id} stale_after`, { nullable: true });
    if (!CLAIM_STATUSES.has(claim.status)) fail(`claim ${claim.claim_id} has invalid status`);
    requireString(claim.evidence_class, `claim ${claim.claim_id} evidence_class`);
    if (freshnessPolicy && !freshnessPolicy.evidence_classes[claim.evidence_class]) fail(`claim ${claim.claim_id} has unknown freshness class`);
    if (TIME_SENSITIVE_CLASSES.has(claim.evidence_class) && (!claim.review_due_at || !claim.stale_after)) fail(`time-sensitive claim ${claim.claim_id} lacks review and stale timestamps`);
    if (claim.supersedes !== null && !claimIdSet.has(claim.supersedes)) fail(`claim ${claim.claim_id} supersedes an unknown claim`);
  }

  for (const claim of claims) {
    const visited = new Set([claim.claim_id]);
    let prior = claim.supersedes;
    while (prior !== null) {
      if (visited.has(prior)) fail(`claim supersession cycle includes ${prior}`);
      visited.add(prior);
      prior = claims.find(candidate => candidate.claim_id === prior)?.supersedes ?? null;
    }
  }

  const viewBlocks = blocks.filter(block => block.view_contract);
  if (viewBlocks.filter(block => block.view_contract.kind === 'scored-evidence').length !== 192) fail('evidence ledger must contain 192 scored view blocks');
  if (viewBlocks.filter(block => block.view_contract.kind === 'preview-evidence').length !== 32) fail('evidence ledger must contain 32 preview view blocks');
  for (const block of viewBlocks) {
    if (block.disposition !== 'captured') fail(`view block ${block.source_block_id} must be captured`);
    const groups = requireObject(block.view_contract.claim_ids, `view block ${block.source_block_id} claim groups`);
    for (const group of ['positives', 'concerns', 'context']) {
      requireStringArray(groups[group], `view block ${block.source_block_id} ${group}`);
      if (groups[group].some(id => !claimIdSet.has(id))) fail(`view block ${block.source_block_id} references an unknown claim`);
    }
  }
  const fullSourceReviews = blocks.filter(block => block.review_contract?.kind === 'full-source-review');
  if (fullSourceReviews.length !== sources.length || new Set(fullSourceReviews.map(block => block.source_id)).size !== sources.length) fail('evidence ledger must contain one full-source residual review per source');
  if (fullSourceReviews.some(block => block.disposition !== 'captured' || block.review_contract.unreviewed_substantive_blocks !== 0)) fail('every full-source review must dispose all substantive residual blocks');
  return true;
}

export function buildEvidenceViews(ledger) {
  validateEvidenceLedger(ledger);
  const claimById = new Map(ledger.claims.map(claim => [claim.claim_id, claim]));
  const entityById = new Map(ledger.entities.map(entity => [entity.entity_id, entity]));
  const summaryBlocks = ledger.source_blocks.filter(block => block.view_contract);
  const categoryBlocks = summaryBlocks.filter(block => block.view_contract.kind === 'scored-evidence');
  const previewBlocks = summaryBlocks.filter(block => block.view_contract.kind === 'preview-evidence');
  const textFor = ids => ids.map(id => claimById.get(id).paraphrase);
  const peopleFor = ids => ids.map(id => entityById.get(id).canonical_name);
  const lineage = {};
  const recordLineage = block => {
    const claimIds = Object.values(block.view_contract.claim_ids).flat();
    lineage[block.source_block_id] = {
      source_id: block.source_id,
      team_ids: block.team_ids,
      source_locator: block.source_locator,
      claim_ids: claimIds,
      entity_ids: block.entity_ids,
      status_counts: Object.fromEntries([...CLAIM_STATUSES].map(status => [status, claimIds.filter(id => claimById.get(id).status === status).length])),
    };
  };
  const categories = {};
  for (const categoryId of [...new Set(categoryBlocks.map(block => block.view_contract.category_id))]) {
    categories[categoryId] = categoryBlocks
      .filter(block => block.view_contract.category_id === categoryId)
      .sort((left, right) => left.view_contract.order - right.view_contract.order)
      .map(block => {
        recordLineage(block);
        const contract = block.view_contract;
        return {
          team: block.team_ids[0],
          rank: contract.rank,
          tier: contract.tier,
          tierLabel: contract.tier_label,
          subject: contract.subject,
          people: peopleFor(block.entity_ids),
          positives: textFor(contract.claim_ids.positives),
          concerns: textFor(contract.claim_ids.concerns),
          context: textFor(contract.claim_ids.context),
          lines: [block.source_locator.start, block.source_locator.end],
        };
      });
  }
  const previews = {};
  for (const sourceId of [...new Set(previewBlocks.map(block => block.source_id))]) {
    previews[sourceId] = previewBlocks
      .filter(block => block.source_id === sourceId)
      .sort((left, right) => left.view_contract.order - right.view_contract.order)
      .map(block => {
        recordLineage(block);
        return {
          team: block.team_ids[0],
          positives: textFor(block.view_contract.claim_ids.positives),
          concerns: textFor(block.view_contract.claim_ids.concerns),
          context: textFor(block.view_contract.claim_ids.context),
        };
      });
  }
  return {
    schema_version: 1,
    ledger_id: ledger.ledger_id,
    generated_at: ledger.recorded_at,
    categories,
    previews,
    lineage,
  };
}

export function evidenceFreshnessSummary(ledger, { asOf = ledger.recorded_at } = {}) {
  const asOfTime = new Date(asOf).getTime();
  const statusAt = claim => {
    if (['ambiguous', 'superseded', 'retracted'].includes(claim.status)) return claim.status;
    if (claim.stale_after && asOfTime >= new Date(claim.stale_after).getTime()) return 'stale';
    if (claim.review_due_at && asOfTime >= new Date(claim.review_due_at).getTime()) return 'review_due';
    return 'active';
  };
  const byStatus = Object.fromEntries([...CLAIM_STATUSES].map(status => [status, ledger.claims.filter(claim => statusAt(claim) === status).length]));
  const classes = Object.fromEntries([...new Set(ledger.claims.map(claim => claim.evidence_class))].sort().map(evidenceClass => [evidenceClass, ledger.claims.filter(claim => claim.evidence_class === evidenceClass).length]));
  const timeSensitive = ledger.claims.filter(claim => TIME_SENSITIVE_CLASSES.has(claim.evidence_class));
  const teamIds = [...new Set(ledger.claims.flatMap(claim => claim.team_ids))].sort();
  const byTeam = Object.fromEntries(teamIds.map(teamId => [teamId, {
    claims: ledger.claims.filter(claim => claim.team_ids.includes(teamId)).length,
    stale: ledger.claims.filter(claim => claim.team_ids.includes(teamId) && statusAt(claim) === 'stale').length,
    review_due: ledger.claims.filter(claim => claim.team_ids.includes(teamId) && statusAt(claim) === 'review_due').length,
  }]));
  return {
    as_of: new Date(asOf).toISOString(),
    claim_count: ledger.claims.length,
    source_block_count: ledger.source_blocks.length,
    entity_count: ledger.entities.length,
    status_counts: byStatus,
    class_counts: classes,
    time_sensitive_claims: timeSensitive.length,
    time_sensitive_with_review_and_stale_times: timeSensitive.filter(claim => claim.review_due_at && claim.stale_after).length,
    teams: byTeam,
  };
}

export function validateEvidenceViews(views, ledger) {
  requireObject(views, 'evidence views');
  if (views.schema_version !== 1 || views.ledger_id !== ledger.ledger_id) fail('evidence views do not match the canonical ledger');
  const expectedCategories = ['qb', 'coaching', 'ol', 'skill', 'offense', 'defense'];
  if (JSON.stringify(Object.keys(views.categories)) !== JSON.stringify(expectedCategories)) fail('evidence views category order is invalid');
  for (const categoryId of expectedCategories) {
    const records = requireArray(views.categories[categoryId], `evidence views ${categoryId}`);
    if (records.length !== 32 || new Set(records.map(record => record.team)).size !== 32) fail(`evidence views ${categoryId} must cover 32 teams`);
    if (new Set(records.map(record => record.rank)).size !== 32 || Math.min(...records.map(record => record.rank)) !== 1 || Math.max(...records.map(record => record.rank)) !== 32) fail(`evidence views ${categoryId} ranks must be exact 1..32`);
  }
  const previewRecords = Object.values(views.previews).flat();
  if (Object.keys(views.previews).length !== 5 || previewRecords.length !== 32 || new Set(previewRecords.map(record => record.team)).size !== 32) fail('evidence views previews must cover all 32 teams once');
  if (Object.keys(views.lineage).length !== 224) fail('evidence views must expose lineage for all 224 visible summary records');
  return true;
}
