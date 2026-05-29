import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyJumpPhysics,
  applyMouseLook,
  createMouseLookDelta,
  createInputVector,
  createMovementDelta,
  resolveMovement,
} from '../src/playerPhysics.js';

test('normalizes diagonal WASD movement so it is not faster', () => {
  const forward = createInputVector({ forward: true, back: false, left: false, right: false });
  const diagonal = createInputVector({ forward: true, back: false, left: false, right: true });

  assert.equal(forward.length, 1);
  assert.equal(Math.round(diagonal.length * 1000) / 1000, 1);
});

test('maps WASD onto yaw-oriented ground movement', () => {
  assert.deepEqual(roundGround(createMovementDelta({ x: 0, z: 1 }, 0, 1, 1)), { dx: 0, dz: 1 });
  assert.deepEqual(roundGround(createMovementDelta({ x: 0, z: -1 }, 0, 1, 1)), { dx: 0, dz: -1 });
  assert.deepEqual(roundGround(createMovementDelta({ x: 1, z: 0 }, 0, 1, 1)), { dx: 1, dz: 0 });
  assert.deepEqual(roundGround(createMovementDelta({ x: -1, z: 0 }, 0, 1, 1)), { dx: -1, dz: 0 });
  assert.deepEqual(roundGround(createMovementDelta({ x: 0, z: 1 }, Math.PI / 2, 1, 1)), { dx: 1, dz: 0 });
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

test('derives mouse-look deltas from client position when pointer-lock movement is unavailable', () => {
  const delta = createMouseLookDelta(
    { movementX: 0, movementY: 0, clientX: 220, clientY: 140 },
    { x: 160, y: 120 },
  );

  assert.deepEqual(delta, {
    movementX: 60,
    movementY: 20,
    position: { x: 220, y: 140 },
  });
});

test('starts a jump only from the ground and then applies gravity', () => {
  const jumped = applyJumpPhysics({ y: 1.45, velocityY: 0, grounded: true }, { jump: true, dt: 0.1, groundY: 1.45 });
  const falling = applyJumpPhysics(jumped, { jump: false, dt: 0.1, groundY: 1.45 });

  assert.equal(jumped.grounded, false);
  assert.ok(jumped.velocityY > 0);
  assert.ok(falling.velocityY < jumped.velocityY);
  assert.ok(falling.y > 1.45);
});

test('lands back on the scene ground height', () => {
  const landed = applyJumpPhysics({ y: 1.5, velocityY: -10, grounded: false }, { jump: false, dt: 0.2, groundY: 1.45 });

  assert.deepEqual(landed, { y: 1.45, velocityY: 0, grounded: true });
});

function roundGround(delta) {
  return {
    dx: Math.round(delta.dx * 1000) / 1000,
    dz: Math.round(delta.dz * 1000) / 1000,
  };
}
