import { readFile, writeFile } from 'node:fs/promises';

import { buildEvidenceViews, validateEvidenceLedger, validateEvidenceViews } from '../lib/evidence-ledger.mjs';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const [ledger, freshnessPolicy] = await Promise.all([
  readJson('data/evidence/2026-evidence-ledger.json'),
  readJson('config/freshness-policy.json'),
]);
validateEvidenceLedger(ledger, { freshnessPolicy });
const views = buildEvidenceViews(ledger);
validateEvidenceViews(views, ledger);
await writeFile('data/evidence/2026-generated-summaries.json', `${JSON.stringify(views, null, 2)}\n`);
console.log(JSON.stringify({ ledger_id: ledger.ledger_id, category_records: Object.values(views.categories).flat().length, preview_records: Object.values(views.previews).flat().length, lineage_records: Object.keys(views.lineage).length }, null, 2));
