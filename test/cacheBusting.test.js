import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCacheBustingReport,
  collectCacheReferences,
  getChangedCacheSensitiveFiles,
} from '../scripts/check-cache-busting.mjs';

test('collects cache-busted static, GLB, and audio references', () => {
  const references = collectCacheReferences({
    indexHtml: `
      <link rel="stylesheet" href="./styles.css?v=14">
      <script type="module" src="./src/app.js?v=126"></script>
    `,
    levelGlbSource: "dungeon: './assets/models/levels/dungeon.glb?v=10'",
    audioSources: [
      "export const HIT = './assets/audio/sfx/hit.wav?v=3';",
    ],
  });

  assert.deepEqual(references.map((reference) => reference.path), [
    'styles.css',
    'src/app.js',
    'assets/models/levels/dungeon.glb',
    'assets/audio/sfx/hit.wav',
  ]);
  assert.equal(references.every((reference) => reference.versioned), true);
});

test('flags missing cache versions and cache-sensitive changed files', () => {
  const report = buildCacheBustingReport({
    references: collectCacheReferences({
      indexHtml: '<script type="module" src="./src/app.js"></script>',
      levelGlbSource: "dungeon: './assets/models/levels/dungeon.glb'",
      audioSources: ["export const HIT = './assets/audio/sfx/hit.wav?v=3';"],
    }),
    changedFiles: getChangedCacheSensitiveFiles(`
 M src/app.js
 M assets/audio/sfx/hit.wav
 M docs/recommendations.md
?? assets/models/levels/new-test.glb
    `),
  });

  assert.deepEqual(report.missingVersions.map((reference) => reference.path), [
    'src/app.js',
    'assets/models/levels/dungeon.glb',
  ]);
  assert.deepEqual(report.changedCacheSensitiveFiles, [
    'src/app.js',
    'assets/audio/sfx/hit.wav',
    'assets/models/levels/new-test.glb',
  ]);
});
