import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildLearningReport } from '../lib/learning-loop.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const policy = await readJson('config/learning-policy.json');
const observationRoot = resolve(root, 'data/learning/observations');
let files = [];
try {
  files = (await readdir(observationRoot)).filter(file => file.endsWith('.json')).sort();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const observations = await Promise.all(files.map(file => readJson(`data/learning/observations/${file}`)));
const report = buildLearningReport(observations, policy);
const outputPath = resolve(root, 'data/current/learning-report.json');
await mkdir(resolve(root, 'data/current'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: 'data/current/learning-report.json', report_id: report.report_id, status: report.status, observations: report.observation_count }, null, 2));
