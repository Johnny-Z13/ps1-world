import assert from 'node:assert/strict';
import test from 'node:test';

import { applyMouseLook, createInputVector, resolveMovement } from '../src/playerPhysics.js';

test('normalizes diagonal WASD movement so it is not faster', () => {
  const forward = createInputVector({ forward: true, back: false, left: false, right: false });
  const diagonal = createInputVector({ forward: true, back: false, left: false, right: true });

  assert.equal(forward.length, 1);
  assert.equal(Math.round(diagonal.length * 1000) / 1000, 1);
});

test('slides against axis-aligned warehouse walls instead of passing through', () => {
  const walls = [{ minX: -1, maxX: 1, minZ: 2, maxZ: 3 }];
  const start = { x: 0, z: 0 };
  const desired = { x: 0.2, z: 2.5 };

  const next = resolveMovement(start, desired, walls, 0.25);

  assert.equal(next.x, 0.2);
  assert.ok(next.z < 1.75);
});

test('applies mouse-look deltas and clamps vertical pitch', () => {
  const look = applyMouseLook({ yaw: 1, pitch: 0.9 }, { movementX: 100, movementY: -1000 });

  assert.equal(look.yaw, 1.24);
  assert.equal(look.pitch, 0.92);
});

test('supports inverted vertical mouse look', () => {
  const look = applyMouseLook(
    { yaw: 1, pitch: 0 },
    { movementX: 0, movementY: -100 },
    { invertY: true },
  );

  assert.equal(look.pitch, -0.18);
});
