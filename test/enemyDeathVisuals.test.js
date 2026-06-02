import assert from 'node:assert/strict';
import test from 'node:test';

import { getEnemyDeathRenderState } from '../src/enemyDeathVisuals.js';

test('leaves live enemy rendering unchanged', () => {
  assert.deepEqual(getEnemyDeathRenderState({ state: 'chase' }, 1000), {
    progress: 0,
    verticalScale: 1,
    horizontalScale: 1,
    yOffset: 0,
    shade: 0.98,
    motionScale: 1,
  });
});

test('collapses and darkens dying enemy rendering over time', () => {
  const enemy = { state: 'dying', diedAt: 1000 };
  const early = getEnemyDeathRenderState(enemy, 1100);
  const late = getEnemyDeathRenderState(enemy, 2300);

  assert.ok(early.progress > 0);
  assert.ok(late.progress > early.progress);
  assert.ok(late.verticalScale < early.verticalScale);
  assert.ok(late.horizontalScale > early.horizontalScale);
  assert.ok(late.yOffset < early.yOffset);
  assert.ok(late.shade < early.shade);
  assert.equal(late.motionScale, 0);
});
