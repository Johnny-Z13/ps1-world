import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sourcePaths = [
  new URL('../src/app.js', import.meta.url),
  new URL('../src/audioConfig.js', import.meta.url),
];
const appSource = await import('node:fs/promises')
  .then((fs) => Promise.all(sourcePaths.map((sourcePath) => fs.readFile(sourcePath, 'utf8'))))
  .then((sources) => sources.join('\n'));
const root = new URL('../', import.meta.url);

test('every app audio URL points to a non-empty local asset', () => {
  const matches = appSource.matchAll(/'\.\/(assets\/audio\/[^']+\.(?:mp3|wav))\?v=\d+'/g);
  const urls = [...matches].map((match) => match[1]);
  assert.ok(urls.length > 0);

  for (const url of urls) {
    const file = fileURLToPath(new URL(url, root));
    assert.equal(existsSync(file), true, url);
    assert.ok(statSync(file).size > 0, url);
  }
});
