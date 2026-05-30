import assert from 'node:assert/strict';
import test from 'node:test';

import { PLAYER_EYE_HEIGHT } from '../src/playerPhysics.js';
import { createSceneWorld } from '../src/world.js';
import {
  createZombieEnemies,
  isPlayerTouchedByZombie,
  updateZombieEnemies,
} from '../src/zombies.js';

test('creates two or three zombie enemies from scene spawn points', () => {
  const world = createSceneWorld('dungeon');
  const zombies = createZombieEnemies(world);

  assert.ok(zombies.length >= 2);
  assert.ok(zombies.length <= 3);
  assert.ok(zombies.every((zombie) => zombie.state === 'chasing'));
  assert.ok(zombies.every((zombie) => zombie.radius > 0));
});

test('moves zombies toward the player without changing their count', () => {
  const world = createSceneWorld('dungeon');
  const zombies = createZombieEnemies(world);
  const target = {
    x: world.playerSpawn.x,
    y: world.playerSpawn.y,
    z: world.playerSpawn.z,
  };
  const before = Math.hypot(zombies[0].x - target.x, zombies[0].z - target.z);

  const updated = updateZombieEnemies(zombies, target, {
    colliders: [],
    walkableSurfaces: [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100, topY: 0 }],
    dt: 0.5,
  });

  const after = Math.hypot(updated[0].x - target.x, updated[0].z - target.z);
  assert.equal(updated.length, zombies.length);
  assert.ok(after < before);
  assert.equal(updated[0].y, PLAYER_EYE_HEIGHT);
});

test('turns zombies to face the player while chasing', () => {
  const zombies = [
    { id: 'zombie-1', x: 0, y: PLAYER_EYE_HEIGHT, z: 0, yaw: 0, radius: 0.38, speed: 1.15 },
  ];
  const player = { x: 4, y: PLAYER_EYE_HEIGHT, z: 0 };

  const [updated] = updateZombieEnemies(zombies, player, {
    colliders: [],
    walkableSurfaces: [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100, topY: 0 }],
    dt: 0.1,
  });

  assert.equal(updated.yaw, Math.PI / 2);
});

test('detects zombie contact with the player on the same level', () => {
  const player = { x: 1, y: PLAYER_EYE_HEIGHT, z: 1 };
  const zombies = [
    { x: 1.3, y: PLAYER_EYE_HEIGHT, z: 1.2, radius: 0.38 },
  ];

  assert.equal(isPlayerTouchedByZombie(player, zombies), true);
});

test('ignores zombies that are horizontally near but vertically separated', () => {
  const player = { x: 1, y: PLAYER_EYE_HEIGHT + 2.2, z: 1 };
  const zombies = [
    { x: 1.1, y: PLAYER_EYE_HEIGHT, z: 1.1, radius: 0.38 },
  ];

  assert.equal(isPlayerTouchedByZombie(player, zombies), false);
});
