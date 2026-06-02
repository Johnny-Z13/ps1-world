import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BROWSER_SMOKE_CHECKS,
  createBrowserSmokeResult,
  formatBrowserSmokePlan,
} from '../scripts/browser-smoke.mjs';

test('browser smoke checklist covers boot, title controls, GLB load, Rogue start, and console errors', () => {
  assert.deepEqual(BROWSER_SMOKE_CHECKS.map((check) => check.id), [
    'boot',
    'title-controls',
    'glb-scene',
    'rogue-start',
    'console-errors',
  ]);
  assert.ok(formatBrowserSmokePlan().includes('GLB scene loads'));
});

test('browser smoke result records skipped optional automation without failing fast Node tests', () => {
  const result = createBrowserSmokeResult({
    status: 'skipped',
    reason: 'Playwright is not installed',
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.checks.length, BROWSER_SMOKE_CHECKS.length);
  assert.match(result.reason, /Playwright/);
});
