import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VERSION_RE = /\?v=\d+$/;
const CACHE_SENSITIVE_RE = /^(?:src\/app\.js|styles\.css|assets\/models\/levels\/.+\.glb|assets\/audio\/.+\.(?:mp3|wav))$/;

export function collectCacheReferences({ indexHtml, levelGlbSource, audioSources }) {
  return [
    ...collectHtmlReferences(indexHtml),
    ...collectStringAssetReferences(levelGlbSource, /(\.\/assets\/models\/levels\/[^'"`\s)]+\.glb(?:\?v=\d+)?)/g, 'src/levelGlb.js'),
    ...audioSources.flatMap((source, index) => (
      collectStringAssetReferences(source, /(\.\/assets\/audio\/[^'"`\s)]+\.(?:mp3|wav)(?:\?v=\d+)?)/g, `audio-source-${index + 1}`)
    )),
  ];
}

function collectHtmlReferences(indexHtml) {
  const references = [];
  const htmlReferenceRe = /\b(?:href|src)="\.\/(styles\.css|src\/app\.js)(\?v=\d+)?"/g;
  for (const match of indexHtml.matchAll(htmlReferenceRe)) {
    references.push({
      path: match[1],
      raw: `./${match[1]}${match[2] ?? ''}`,
      source: 'index.html',
      versioned: VERSION_RE.test(match[2] ?? ''),
    });
  }
  return references;
}

function collectStringAssetReferences(source, pattern, sourceName) {
  const references = [];
  for (const match of source.matchAll(pattern)) {
    const raw = match[1];
    const path = raw.replace(/^\.\//, '').replace(/\?v=\d+$/, '');
    references.push({
      path,
      raw,
      source: sourceName,
      versioned: VERSION_RE.test(raw),
    });
  }
  return references;
}

export function getChangedCacheSensitiveFiles(statusText) {
  return statusText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeStatusPath(line.slice(2).trim()))
    .filter((file) => CACHE_SENSITIVE_RE.test(file));
}

function normalizeStatusPath(file) {
  const renameArrow = ' -> ';
  const normalized = file.includes(renameArrow) ? file.split(renameArrow).at(-1) : file;
  return normalized.replaceAll('\\', '/');
}

export function buildCacheBustingReport({ references, changedFiles }) {
  return {
    missingVersions: references.filter((reference) => !reference.versioned),
    changedCacheSensitiveFiles: changedFiles,
  };
}

function readProjectSources(rootUrl) {
  return {
    indexHtml: readFileSync(new URL('../index.html', rootUrl), 'utf8'),
    levelGlbSource: readFileSync(new URL('../src/levelGlb.js', rootUrl), 'utf8'),
    audioSources: [
      readFileSync(new URL('../src/audioConfig.js', rootUrl), 'utf8'),
      readFileSync(new URL('../src/app.js', rootUrl), 'utf8'),
    ],
  };
}

function readGitStatus(cwd) {
  try {
    return execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function formatReport(report) {
  const lines = [];
  if (report.missingVersions.length) {
    lines.push('Missing cache versions:');
    for (const reference of report.missingVersions) {
      lines.push(`- ${reference.source}: ${reference.raw}`);
    }
  } else {
    lines.push('All known static asset references include cache versions.');
  }

  if (report.changedCacheSensitiveFiles.length) {
    lines.push('', 'Changed cache-sensitive files to review:');
    for (const file of report.changedCacheSensitiveFiles) {
      lines.push(`- ${file}`);
    }
  }

  return lines.join('\n');
}

function main() {
  const rootUrl = new URL('./', import.meta.url);
  const cwd = fileURLToPath(new URL('../', rootUrl));
  const references = collectCacheReferences(readProjectSources(rootUrl));
  const changedFiles = getChangedCacheSensitiveFiles(readGitStatus(cwd));
  const report = buildCacheBustingReport({ references, changedFiles });
  console.log(formatReport(report));
  if (report.missingVersions.length) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
