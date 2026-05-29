import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('renders a center reticule with an options toggle', () => {
  assert.match(index, /id="reticule"/);
  assert.match(index, /id="showReticule"/);
  assert.match(styles, /\.reticule/);
});

test('hides the game canvas cursor during play', () => {
  assert.match(styles, /cursor:\s*none/);
  assert.match(styles, /body\.options-open\s+#screen/);
});

test('keeps mouse look tied to pointer lock until Escape releases it', () => {
  assert.match(app, /pointerlockchange/);
  assert.match(app, /hasActiveMouseCapture/);
  assert.match(app, /softMouseLockActive/);
  assert.match(app, /openOptions\(\{ releasePointerLock: false \}\)/);
});

test('renders one-bit scenes with ordered dithering instead of hard clipping', () => {
  assert.match(app, /orderedDither/);
  assert.match(app, /oneBitPaper/);
  assert.match(app, /oneBitInk/);
});
