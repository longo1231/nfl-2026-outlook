import { createHash } from 'node:crypto';

const fail = message => { throw new Error(message); };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const requireString = (value, label) => typeof value === 'string' && value.length > 0 ? value : fail(`${label} must be a non-empty string`);
const requireIso = (value, label) => requireString(value, label) && !Number.isNaN(Date.parse(value)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : fail(`${label} must be an RFC 3339 timestamp`);
const canonicalize = value => Array.isArray(value)
  ? value.map(canonicalize)
  : isObject(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;

export const hashWeeklyContent = value => createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');

const validateReference = (reference, label) => {
  if (!isObject(reference)) fail(`${label} must be an object`);
  if (reference.id !== null) requireString(reference.id, `${label}.id`);
  requireString(reference.path, `${label}.path`);
  if (reference.path.startsWith('/') || reference.path.includes('..')) fail(`${label}.path must be repository-relative`);
  if (!/^[a-f0-9]{64}$/.test(reference.sha256)) fail(`${label}.sha256 must be SHA-256`);
};

export function validateWeeklyStateVersion(version) {
  if (!isObject(version) || version.schema_version !== 1) fail('weekly state schema_version must be 1');
  requireString(version.weekly_state_version_id, 'weekly state version ID');
  if (!Number.isInteger(version.season) || version.season < 2000) fail('weekly state season is invalid');
  if (!isObject(version.period) || !['preseason-prior', 'game-week'].includes(version.period.kind)) fail('weekly state period kind is invalid');
  if (version.period.kind === 'preseason-prior' && version.period.week !== null) fail('preseason prior cannot have a week');
  if (version.period.kind === 'game-week' && (!Number.isInteger(version.period.week) || version.period.week < 1 || version.period.week > 22)) fail('game-week must be 1 through 22');
  requireString(version.period.label, 'weekly state period label');
  requireIso(version.frozen_at, 'weekly state frozen_at');
  if (!/^[a-f0-9]{64}$/.test(version.content_fingerprint)) fail('weekly state content fingerprint must be SHA-256');
  for (const key of ['public_manifest', 'evidence', 'forecast', 'market', 'readiness']) validateReference(version[key], `weekly state ${key}`);
  if (!Array.isArray(version.policies) || version.policies.length === 0) fail('weekly state policies must be non-empty');
  version.policies.forEach((reference, index) => validateReference(reference, `weekly state policy ${index}`));
  const content = { ...version };
  delete content.weekly_state_version_id;
  delete content.content_fingerprint;
  const expected = hashWeeklyContent(content);
  if (expected !== version.content_fingerprint) fail('weekly state content fingerprint does not match');
  return true;
}
export function buildWeeklyIndex(versions) {
  versions.forEach(validateWeeklyStateVersion);
  const ids = versions.map(version => version.weekly_state_version_id);
  if (new Set(ids).size !== ids.length) fail('weekly state version IDs must be unique');
  const ordered = [...versions].sort((left, right) => left.frozen_at.localeCompare(right.frozen_at) || left.weekly_state_version_id.localeCompare(right.weekly_state_version_id));
  return {
    schema_version: 1,
    generated_at: ordered.at(-1)?.frozen_at ?? null,
    version_count: ordered.length,
    latest_version_id: ordered.at(-1)?.weekly_state_version_id ?? null,
    versions: ordered.map(version => ({
      weekly_state_version_id: version.weekly_state_version_id,
      season: version.season,
      period: version.period,
      frozen_at: version.frozen_at,
      path: `data/weekly/${version.weekly_state_version_id}.json`,
      content_fingerprint: version.content_fingerprint,
      public_manifest_id: version.public_manifest.id,
      forecast_version_id: version.forecast.id,
      market_snapshot_id: version.market.id,
    })),
  };
}
