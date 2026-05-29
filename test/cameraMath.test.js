import assert from 'node:assert/strict';
import test from 'node:test';

import { createCameraBasis } from '../src/cameraMath.js';

test('uses positive world Y as camera up at neutral yaw and pitch', () => {
  const basis = createCameraBasis({ yaw: 0, pitch: 0 });

  assert.deepEqual(roundVector(basis.forward), [0, 0, 1]);
  assert.deepEqual(roundVector(basis.right), [1, 0, 0]);
  assert.deepEqual(roundVector(basis.up), [0, 1, 0]);
});

test('positive pitch looks upward in positive world Y', () => {
  const basis = createCameraBasis({ yaw: 0, pitch: 0.5 });

  assert.ok(basis.forward[1] > 0);
  assert.ok(basis.up[1] > 0);
});

function roundVector(vector) {
  return vector.map((component) => {
    const rounded = Math.round(component * 1000) / 1000;
    return Object.is(rounded, -0) ? 0 : rounded;
  });
}
