import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const buildRoot = `${siteRoot}standalone-dist`;
const outputRoot = `${projectRoot}docs`;
let html = await readFile(`${buildRoot}/index.html`, 'utf8');

const stylesheetMatch = html.match(/<link rel="stylesheet"[^>]+href="\.\/([^\"]+)"[^>]*>/);
const scriptMatch = html.match(/<script type="module"[^>]+src="\.\/([^\"]+)"[^>]*><\/script>/);
if (!stylesheetMatch || !scriptMatch) throw new Error('Expected one generated stylesheet and one generated module script');

const css = await readFile(`${buildRoot}/${stylesheetMatch[1]}`, 'utf8');
const javascript = (await readFile(`${buildRoot}/${scriptMatch[1]}`, 'utf8')).replaceAll('</script', '<\\/script');
html = html
  .replace(stylesheetMatch[0], () => `<style>${css}</style>`)
  .replace(scriptMatch[0], () => `<script type="module">${javascript}</script>`)
  .replace('</head>', '<meta name="generator" content="NFL Outlook standalone report builder" /></head>');

if (/\b(?:src|href)="\.\/assets\//.test(html)) throw new Error('Generated HTML still references a local asset');
await mkdir(outputRoot, { recursive: true });
await writeFile(`${outputRoot}/index.html`, html);
