import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { buildWeeklyIndex, hashWeeklyContent, validateWeeklyStateVersion } from '../lib/weekly-state.mjs';

const [kind, weekArgument, labelArgument] = process.argv.slice(2);
if (!['preseason-prior', 'game-week'].includes(kind)) throw new Error('Usage: node scripts/freeze-weekly-state.mjs preseason-prior | game-week WEEK [LABEL]');
const week = kind === 'game-week' ? Number(weekArgument) : null;
if (kind === 'game-week' && (!Number.isInteger(week) || week < 1 || week > 22)) throw new Error('Game week must be an integer from 1 through 22');
const label = kind === 'preseason-prior' ? (weekArgument || 'Preseason prior') : (labelArgument || `Week ${week}`);
const root = resolve(new URL('..', import.meta.url).pathname);
const fromRoot = path => resolve(root, path);
const readJson = async path => JSON.parse(await readFile(fromRoot(path), 'utf8'));
const sha256 = async path => createHash('sha256').update(await readFile(fromRoot(path))).digest('hex');
const reference = async (id, path) => ({ id, path, sha256: await sha256(path) });
const writeImmutable = async (path, value) => {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  try {
    await writeFile(fromRoot(path), serialized, { flag: 'wx' });
    return 'created';
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(fromRoot(path), 'utf8') !== serialized) throw new Error(`Immutable weekly path already exists with different content: ${path}`);
    return 'existing';
  }
};

const manifest = await readJson('data/current/public-manifest.json');
if (!manifest.forecast.path) throw new Error('Weekly freeze requires an active forecast version');
const archivePath = `data/weekly/manifests/${manifest.manifest_id}.json`;
await mkdir(fromRoot('data/weekly/manifests'), { recursive: true });
const archiveState = await writeImmutable(archivePath, manifest);
const policies = [
  ['freshness', manifest.policy_versions.freshness, 'config/freshness-policy.json'],
  ['forecast', manifest.policy_versions.forecast, 'config/forecast-policy.json'],
  ['market', manifest.policy_versions.market, 'config/market-policy.json'],
  ['sources', manifest.policy_versions.sources, 'config/source-registry.json'],
  ['learning', 'learning-policy-2026.1', 'config/learning-policy.json'],
];
const frozenContent = {
  schema_version: 1,
  season: manifest.season,
  period: { kind, week, label },
  frozen_at: manifest.generated_at,
  public_manifest: await reference(manifest.manifest_id, archivePath),
  evidence: await reference(manifest.evidence.snapshot_id, manifest.evidence.path),
  forecast: await reference(manifest.forecast.version_id, manifest.forecast.path),
  market: await reference(manifest.markets.kalshi.snapshot_id, manifest.markets.kalshi.path),
  readiness: await reference(manifest.readiness.audit_id, manifest.readiness.path),
  policies: await Promise.all(policies.map(async ([, id, path]) => reference(id, path))),
};
const fingerprint = hashWeeklyContent(frozenContent);
const periodSlug = kind === 'preseason-prior' ? 'preseason-prior' : `week-${String(week).padStart(2, '0')}`;
const version = {
  ...frozenContent,
  weekly_state_version_id: `weekly-${manifest.season}-${periodSlug}-${fingerprint.slice(0, 16)}`,
  content_fingerprint: fingerprint,
};
validateWeeklyStateVersion(version);
await mkdir(fromRoot('data/weekly'), { recursive: true });
const versionPath = `data/weekly/${version.weekly_state_version_id}.json`;
const versionState = await writeImmutable(versionPath, version);
const files = (await readdir(fromRoot('data/weekly'))).filter(file => /^weekly-.*\.json$/.test(file)).sort();
const versions = await Promise.all(files.map(file => readJson(`data/weekly/${file}`)));
const index = buildWeeklyIndex(versions);
await writeFile(fromRoot('data/current/weekly-index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(JSON.stringify({ weekly_state_version_id: version.weekly_state_version_id, output: versionPath, version_state: versionState, manifest_archive: archivePath, archive_state: archiveState, frozen_versions: index.version_count, file: basename(versionPath) }, null, 2));
