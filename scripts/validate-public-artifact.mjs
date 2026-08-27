import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((path) =>
    !path.startsWith(".private/") &&
    !path.startsWith("data/transcripts/") &&
    !path.startsWith("data/audio/") &&
    existsSync(path) &&
    statSync(path).isFile(),
  );

const publicCorpus = trackedFiles.map((path) => readFileSync(path, "utf8")).join("\n");
const artifact = readFileSync("docs/index.html", "utf8");

const prohibitedPatterns = [
  { label: "local filesystem path", pattern: /\/Users\/[^\s\"<>]+/g },
  { label: "file URI", pattern: /file:\/\//gi },
  { label: "Readwise service URL", pattern: /(?:readwise\.io|read\.readwise|api\.readwise)/gi },
  { label: "private-key header", pattern: /BEGIN (?:RSA )?PRIVATE KEY/gi },
];

const prohibitedMatches = prohibitedPatterns
  .map(({ label, pattern }) => ({ label, count: (publicCorpus.match(pattern) ?? []).length }))
  .filter(({ count }) => count > 0);

const privateManifestPath = ".private/source-provenance/manifest.private.json";
let privateIdentifiersTested = 0;
let privateIdentifierLeaks = 0;

if (existsSync(privateManifestPath)) {
  const manifest = JSON.parse(readFileSync(privateManifestPath, "utf8"));
  const identifiers = manifest.documents
    .flatMap((document) => [
      document.reader_document_id,
      document.reader_url,
    ])
    .filter((value) => typeof value === "string" && value.length > 0);

  privateIdentifiersTested = identifiers.length;
  privateIdentifierLeaks = identifiers.filter((value) => publicCorpus.includes(value)).length;
}

const artifactChecks = {
  inline_style: /<style>/.test(artifact),
  inline_module_script: /<script type="module">/.test(artifact),
  external_script_tags: (artifact.match(/<script[^>]+src=/gi) ?? []).length,
  external_stylesheet_links: (artifact.match(/<link[^>]+stylesheet/gi) ?? []).length,
};

const result = {
  tracked_files_scanned: trackedFiles.length,
  private_identifiers_tested: privateIdentifiersTested,
  private_identifier_leaks: privateIdentifierLeaks,
  prohibited_matches: prohibitedMatches,
  artifact_bytes: Buffer.byteLength(artifact),
  ...artifactChecks,
};

console.log(JSON.stringify(result, null, 2));

if (
  prohibitedMatches.length > 0 ||
  privateIdentifierLeaks > 0 ||
  !artifactChecks.inline_style ||
  !artifactChecks.inline_module_script ||
  artifactChecks.external_script_tags > 0 ||
  artifactChecks.external_stylesheet_links > 0
) {
  process.exitCode = 1;
}
