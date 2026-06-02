import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getLightningStrength,
  getStaticTorchLightRenderState,
  getTorchFlicker,
} from '../src/sceneEffects.js';

test('calculates lightning strength from interval, duration, and strobe', () => {
  const lightning = { interval: 8, duration: 0.4 };

  assert.equal(getLightningStrength(8.5, lightning), 0);
  assert.equal(getLightningStrength(0, null), 0);
  assert.ok(getLightningStrength(0, lightning) > 0);
  assert.ok(getLightningStrength(0.39, lightning) < getLightningStrength(0.02, lightning));
});

test('calculates deterministic torch flicker in normalized range', () => {
  const torch = { x: 2, z: -3 };
  const first = getTorchFlicker(torch, 1, 1.25);
  const second = getTorchFlicker(torch, 1, 1.25);
  const other = getTorchFlicker(torch, 2, 1.25);

  assert.equal(first, second);
  assert.ok(first >= 0);
  assert.ok(first <= 1);
  assert.notEqual(first, other);
});

test('creates static torch render state with flickered radius and intensity', () => {
  const torch = {
    x: 1,
    y: 2,
    z: 3,
    color: [1, 0.5, 0.2],
    radius: 8,
    intensity: 1.4,
  };
  const active = getStaticTorchLightRenderState(torch, 0, 0.25, true);
  const inactive = getStaticTorchLightRenderState(torch, 0, 0.25, false);

  assert.deepEqual(active.position, [1, 2, 3]);
  assert.deepEqual(active.color, [1, 0.5, 0.2]);
  assert.ok(active.radius > 0);
  assert.ok(active.intensity > 0);
  assert.equal(inactive.radius, 0);
  assert.equal(inactive.intensity, 0);
});
