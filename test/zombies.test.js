import assert from 'node:assert/strict';
import test from 'node:test';

import { PLAYER_EYE_HEIGHT } from '../src/playerPhysics.js';
import { createSceneWorld } from '../src/world.js';
import {
  createZombieEnemies,
  isPlayerTouchedByZombie,
  resolvePlayerZombieCollision,
  updateZombieEnemies,
} from '../src/zombies.js';

test('creates zombie enemies plus typed special enemies from scene spawn points', () => {
  const world = createSceneWorld('dungeon');
  const zombies = createZombieEnemies(world);
  const enemyTypes = zombies.map((zombie) => zombie.enemyType);

  assert.ok(zombies.length >= 4);
  assert.ok(zombies.length <= 5);
  assert.ok(zombies.every((zombie) => zombie.state === 'chasing'));
  assert.ok(zombies.every((zombie) => zombie.radius > 0));
  assert.ok(enemyTypes.includes('one-eye-alien'));
  assert.equal(enemyTypes.includes('molten-sentinel'), false);
});

test('does not spawn enemy capsules on top of each other', () => {
  const world = createSceneWorld('dungeon');
  const enemies = createZombieEnemies(world);

  for (let i = 0; i < enemies.length; i += 1) {
    for (let j = i + 1; j < enemies.length; j += 1) {
      const a = enemies[i];
      const b = enemies[j];
      const distance = Math.hypot(a.x - b.x, a.z - b.z);
      assert.ok(distance >= a.radius + b.radius, `${a.id} overlaps ${b.id}`);
    }
  }
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

test('keeps the player capsule outside zombie body radius on the same level', () => {
  const player = { x: 0.2, y: PLAYER_EYE_HEIGHT, z: 0 };
  const zombies = [
    { x: 0, y: PLAYER_EYE_HEIGHT, z: 0, radius: 0.38 },
  ];

  const resolved = resolvePlayerZombieCollision(player, zombies);
  const distance = Math.hypot(resolved.x - zombies[0].x, resolved.z - zombies[0].z);

  assert.ok(distance >= 0.74);
});

test('separates enemy capsules from each other while chasing', () => {
  const enemies = [
    { id: 'zombie-1', enemyType: 'zombie', x: 0, y: PLAYER_EYE_HEIGHT, z: 0, yaw: 0, radius: 0.38, speed: 1.15 },
    { id: 'alien-1', enemyType: 'one-eye-alien', x: 0.1, y: PLAYER_EYE_HEIGHT, z: 0, yaw: 0, radius: 0.45, speed: 0.92 },
  ];

  const updated = updateZombieEnemies(enemies, { x: 4, y: PLAYER_EYE_HEIGHT, z: 0 }, {
    colliders: [],
    walkableSurfaces: [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100, topY: 0 }],
    dt: 0.1,
  });

  const distance = Math.hypot(updated[0].x - updated[1].x, updated[0].z - updated[1].z);
  assert.ok(distance >= updated[0].radius + updated[1].radius);
});
