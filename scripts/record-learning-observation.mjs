import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { validateLearningObservation } from '../lib/learning-loop.mjs';
import { validateWeeklyStateVersion } from '../lib/weekly-state.mjs';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/record-learning-observation.mjs OBSERVATION_JSON');
const root = resolve(new URL('..', import.meta.url).pathname);
const readJson = async path => JSON.parse(await readFile(resolve(path), 'utf8'));
const [observation, policy] = await Promise.all([
  readJson(inputPath),
  readJson(resolve(root, 'config/learning-policy.json')),
]);
validateLearningObservation(observation, { policy });
const weeklyPath = resolve(root, 'data/weekly', `${observation.weekly_state_version_id}.json`);
const weeklyVersion = JSON.parse(await readFile(weeklyPath, 'utf8'));
validateWeeklyStateVersion(weeklyVersion);
if (weeklyVersion.forecast.id !== observation.model_version_id) throw new Error('Learning observation model version does not match the frozen weekly state');
if (weeklyVersion.market.id !== observation.decision_market_snapshot_id) throw new Error('Learning observation decision market does not match the frozen weekly state');
const marketFiles = (await readdir(resolve(root, 'data/markets'))).filter(file => file.endsWith('-kalshi-nfl-execution.json'));
const marketSnapshots = await Promise.all(marketFiles.map(file => readJson(resolve(root, 'data/markets', file))));
const closingSnapshot = marketSnapshots.find(snapshot => snapshot.snapshot_id === observation.closing_market_snapshot_id);
if (!closingSnapshot) throw new Error('Learning observation closing market snapshot is not retained');
if (!closingSnapshot.quotes.some(quote => quote.quote_id === observation.closing_quote_id && quote.contract_id === observation.contract_id && quote.side === observation.side)) throw new Error('Learning observation closing quote does not match the retained contract side');
const outputRoot = resolve(root, 'data/learning/observations');
const outputPath = resolve(outputRoot, `${observation.observation_id}.json`);
await mkdir(outputRoot, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(observation, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ recorded: true, observation_id: observation.observation_id, output: `data/learning/observations/${observation.observation_id}.json`, next: 'npm run learning:build' }, null, 2));
