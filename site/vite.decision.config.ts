import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const decisionRoot = process.env.NFL_DECISION_ROOT
  ? resolve(process.env.NFL_DECISION_ROOT)
  : resolve(projectRoot, '.private/decision-system');
const outputRoot = process.env.NFL_DECISION_APP_OUT
  ? resolve(process.env.NFL_DECISION_APP_OUT)
  : resolve(decisionRoot, 'app');
const materializedPath = resolve(decisionRoot, 'materialized.json');
const privateManifestPath = process.env.NFL_DECISION_ROOT
  ? resolve(decisionRoot, 'private-manifest.json')
  : resolve(projectRoot, '.private/current/private-manifest.json');

if (!existsSync(materializedPath) || !existsSync(privateManifestPath)) {
  throw new Error('Private decision state is not initialized. Run npm run decision:init from the project root.');
}

const materialized = JSON.parse(readFileSync(materializedPath, 'utf8'));
const privateManifest = JSON.parse(readFileSync(privateManifestPath, 'utf8'));

export default defineConfig({
  root: fileURLToPath(new URL('./decision', import.meta.url)),
  publicDir: false,
  base: './',
  plugins: [react()],
  define: {
    __DECISION_STATE__: JSON.stringify(materialized),
    __PRIVATE_MANIFEST__: JSON.stringify(privateManifest),
  },
  build: {
    outDir: outputRoot,
    emptyOutDir: true,
    cssCodeSplit: false,
  },
});
