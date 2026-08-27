import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const steps = [
  ['atomic evidence view rebuild', 'npm', ['run', 'evidence:build']],
  ['forecast deterministic rebuild', 'npm', ['run', 'forecast:build']],
  ['learning report rebuild', 'npm', ['run', 'learning:build']],
  ['current-state rebuild', 'npm', ['run', 'current:build']],
  ['root tests', 'npm', ['test']],
  ['contract validation', 'npm', ['run', 'contracts:validate']],
  ['TypeScript', './site/node_modules/.bin/tsc', ['--noEmit', '-p', 'site/tsconfig.json']],
  ['ESLint', 'npm', ['--prefix', 'site', 'run', 'lint']],
  ['public standalone build', 'npm', ['run', 'report:build']],
  ['public artifact/privacy audit', 'npm', ['run', 'artifact:audit']],
];

const run = (label, command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    process.stderr.write(`${result.stdout ?? ''}${result.stderr ?? ''}`);
    throw new Error(`${label} failed`);
  }
  console.log(`PASS ${label}`);
};

const runQuiet = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    process.stderr.write(`${result.stdout ?? ''}${result.stderr ?? ''}`);
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
};

for (const [label, command, args] of steps) run(label, command, args);

const verificationRoot = await mkdtemp(join(tmpdir(), 'nfl-decision-verify-'));
try {
  const inputs = JSON.parse(await readFile('tests/fixtures/decision-event-inputs.json', 'utf8'));
  await mkdir(verificationRoot, { recursive: true });
  const env = { ...process.env, NFL_DECISION_ROOT: verificationRoot, NFL_DECISION_APP_OUT: join(verificationRoot, 'app') };
  runQuiet('node', ['scripts/decision-ledger.mjs', 'init'], { env });
  for (const [index, input] of inputs.entries()) {
    const inputPath = join(verificationRoot, `input-${index}.json`);
    await writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`);
    runQuiet('node', ['scripts/decision-ledger.mjs', 'append', inputPath], { env });
  }
  run('private decision fixture lifecycle', 'node', ['scripts/decision-ledger.mjs', 'validate'], { env });
  const materialized = JSON.parse(await readFile(join(verificationRoot, 'materialized.json'), 'utf8'));
  if (materialized.ledger.event_count !== inputs.length || materialized.summary.thesis_count !== 2 || materialized.summary.passed_theses !== 1) {
    throw new Error('Private decision fixture materialization does not match the expected lifecycle summary');
  }
  run('private decision fixture build', 'npm', ['--prefix', 'site', 'run', 'build:decision'], { env });
} finally {
  await rm(verificationRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({ status: 'passed', checks: steps.length + 2 }, null, 2));
