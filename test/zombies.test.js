import assert from 'node:assert/strict';
import test from 'node:test';

import { applyEnemyDifficulty } from '../src/enemyCatalog.js';
import { PLAYER_EYE_HEIGHT } from '../src/playerPhysics.js';
import { createSceneWorld } from '../src/world.js';
import {
  createHordeState,
  createZombieEnemies,
  selectEnemyTarget,
  isPlayerTouchedByZombie,
  resolvePlayerZombieCollision,
  updateHordeSpawns,
  updateZombieEnemies,
} from '../src/zombies.js';

test('creates zombie enemies plus typed special enemies from scene spawn points', () => {
  const world = createSceneWorld('dungeon');
  const zombies = createZombieEnemies(world);
  const enemyTypes = zombies.map((zombie) => zombie.enemyType);

  assert.ok(zombies.length >= 4);
  assert.ok(zombies.length <= 5);
  assert.ok(zombies.every((zombie) => zombie.state === 'chase'));
  assert.ok(zombies.every((zombie) => zombie.radius > 0));
  assert.ok(zombies.every((zombie) => zombie.faction));
  assert.ok(zombies.every((zombie) => zombie.health > 0));
  assert.ok(enemyTypes.includes('one-eye-alien'));
  assert.equal(enemyTypes.includes('molten-sentinel'), false);
});

test('applies level difficulty to spawned enemy stats', () => {
  const world = {
    id: 'arena',
    playerSpawn: { x: 0, y: PLAYER_EYE_HEIGHT, z: 0, yaw: 0 },
    enemyEncounter: { difficulty: 3 },
    zombieSpawns: [{ x: 6, z: 0 }],
    enemySpawns: [{ enemyType: 'molten-sentinel', x: 8, z: 0 }],
  };

  const enemies = createZombieEnemies(world);
  const zombie = enemies.find((enemy) => enemy.enemyType === 'zombie');
  const sentinel = enemies.find((enemy) => enemy.enemyType === 'molten-sentinel');

  assert.ok(zombie.health > 30);
  assert.ok(zombie.damage > 20);
  assert.ok(sentinel.health > zombie.health);
  assert.ok(sentinel.damage > zombie.damage);
});

test('uses scene encounter difficulty when spawning enemies from worlds', () => {
  const easyWorld = createSceneWorld('dungeon');
  const hardWorld = createSceneWorld('neon-backstreets');
  const easyZombie = createZombieEnemies(easyWorld).find((enemy) => enemy.enemyType === 'zombie');
  const hardZombie = createZombieEnemies(hardWorld).find((enemy) => enemy.enemyType === 'zombie');

  assert.equal(easyWorld.enemyEncounter.difficulty, 1);
  assert.equal(hardWorld.enemyEncounter.difficulty, 3);
  assert.ok(hardZombie.health > easyZombie.health);
  assert.ok(hardZombie.damage > easyZombie.damage);
});

test('scene-authored special enemies inherit scaled catalog stats', () => {
  const world = createSceneWorld('neon-backstreets');
  const sentinel = createZombieEnemies(world).find((enemy) => enemy.enemyType === 'molten-sentinel');
  const expectedStats = applyEnemyDifficulty('molten-sentinel', world.enemyEncounter.difficulty);

  assert.equal(sentinel.damage, expectedStats.attackDamage);
  assert.equal(sentinel.speed, expectedStats.speed);
  assert.equal(sentinel.radius, expectedStats.radius);
});

test('boss targets the player first but can acquire nearby zombies and aliens', () => {
  const player = { id: 'player', faction: 'player', x: 12, y: PLAYER_EYE_HEIGHT, z: 0 };
  const sentinel = {
    id: 'sentinel',
    enemyType: 'molten-sentinel',
    faction: 'boss',
    x: 0,
    y: PLAYER_EYE_HEIGHT,
    z: 0,
    radius: 0.55,
  };
  const enemies = [
    sentinel,
    { id: 'zombie', enemyType: 'zombie', faction: 'undead', x: 2, y: PLAYER_EYE_HEIGHT, z: 0, radius: 0.38 },
    { id: 'alien', enemyType: 'one-eye-alien', faction: 'alien', x: 4, y: PLAYER_EYE_HEIGHT, z: 0, radius: 0.45 },
  ];

  const nearbyTarget = selectEnemyTarget(sentinel, player, enemies);
  const playerTarget = selectEnemyTarget(sentinel, { ...player, x: 1 }, enemies);

  assert.equal(nearbyTarget.id, 'zombie');
  assert.equal(playerTarget.id, 'player');
});

test('scene ecology overrides enemy target priorities', () => {
  const world = {
    id: 'ecology-arena',
    playerSpawn: { x: 0, y: PLAYER_EYE_HEIGHT, z: 0, yaw: 0 },
    enemyEncounter: {
      difficulty: 1,
      ecology: {
        'one-eye-alien': {
          hostileFactions: ['undead'],
          secondaryTargetRange: 8,
        },
      },
    },
    zombieSpawns: [{ x: 4, y: PLAYER_EYE_HEIGHT, z: 0 }],
    enemySpawns: [{ enemyType: 'one-eye-alien', x: 0, y: PLAYER_EYE_HEIGHT, z: 0 }],
  };
  const enemies = createZombieEnemies(world);
  const alien = enemies.find((enemy) => enemy.enemyType === 'one-eye-alien');

  const target = selectEnemyTarget(alien, { id: 'player', x: 1, y: PLAYER_EYE_HEIGHT, z: 0 }, enemies);

  assert.deepEqual(alien.targeting.hostileFactions, ['undead']);
  assert.equal(alien.targeting.secondaryTargetRange, 8);
  assert.equal(target.enemyType, 'zombie');
});

test('boss damages nearby hostile enemies when not focused on the player', () => {
  const enemies = [
    {
      id: 'sentinel',
      enemyType: 'molten-sentinel',
      faction: 'boss',
      x: 0,
      y: PLAYER_EYE_HEIGHT,
      z: 0,
      yaw: 0,
      radius: 0.58,
      speed: 0.82,
      damage: 45,
      attackRange: 2.25,
      health: 180,
    },
    {
      id: 'zombie',
      enemyType: 'zombie',
      faction: 'undead',
      x: 1.2,
      y: PLAYER_EYE_HEIGHT,
      z: 0,
      yaw: 0,
      radius: 0.38,
      speed: 1.15,
      health: 90,
    },
  ];

  const updated = updateZombieEnemies(enemies, { id: 'player', x: 12, y: PLAYER_EYE_HEIGHT, z: 0 }, {
    colliders: [],
    walkableSurfaces: [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100, topY: 0 }],
    dt: 0.1,
    now: 1000,
  });

  const sentinel = updated.find((enemy) => enemy.id === 'sentinel');
  const zombie = updated.find((enemy) => enemy.id === 'zombie');
  assert.equal(sentinel.state, 'attack');
  assert.equal(sentinel.targetId, 'zombie');
  assert.ok(zombie.health < 90);
  assert.equal(zombie.lastHitAt, 1000);
  assert.equal(zombie.hitById, 'sentinel');
  assert.equal(zombie.hitByEnemyType, 'molten-sentinel');
});

test('keeps enemies killed by hostile enemies visible before removing them', () => {
  const enemies = [
    {
      id: 'sentinel',
      enemyType: 'molten-sentinel',
      faction: 'boss',
      x: 0,
      y: PLAYER_EYE_HEIGHT,
      z: 0,
      yaw: 0,
      radius: 0.58,
      speed: 0.82,
      damage: 45,
      attackRange: 2.25,
      health: 180,
    },
    {
      id: 'zombie',
      enemyType: 'zombie',
      faction: 'undead',
      x: 1.2,
      y: PLAYER_EYE_HEIGHT,
      z: 0,
      yaw: 0,
      radius: 0.38,
      speed: 1.15,
      health: 30,
    },
  ];

  const dying = updateZombieEnemies(enemies, { id: 'player', x: 12, y: PLAYER_EYE_HEIGHT, z: 0 }, {
    colliders: [],
    walkableSurfaces: [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100, topY: 0 }],
    dt: 0.1,
    now: 1000,
  });

  const dyingZombie = dying.find((enemy) => enemy.id === 'zombie');
  assert.equal(dyingZombie.state, 'dying');
  assert.equal(dyingZombie.diedAt, 1000);
  assert.equal(dyingZombie.killedById, 'sentinel');

  const removed = updateZombieEnemies(dying, { id: 'player', x: 12, y: PLAYER_EYE_HEIGHT, z: 0 }, {
    colliders: [],
    walkableSurfaces: [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100, topY: 0 }],
    dt: 0.1,
    now: 2601,
  });

  assert.equal(removed.some((enemy) => enemy.id === 'zombie'), false);
});

test('dying enemies no longer touch or block the player', () => {
  const player = { x: 0.2, y: PLAYER_EYE_HEIGHT, z: 0 };
  const enemies = [
    { id: 'zombie-1', state: 'dying', x: 0, y: PLAYER_EYE_HEIGHT, z: 0, radius: 0.38 },
  ];

  assert.equal(isPlayerTouchedByZombie(player, enemies), false);
  assert.deepEqual(resolvePlayerZombieCollision(player, enemies), player);
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

test('horde director pulses extra zombies from distant authored markers under a scene cap', () => {
  const world = {
    id: 'arena',
    playerSpawn: { x: 0, y: PLAYER_EYE_HEIGHT, z: 0, yaw: 0 },
    enemyEncounter: {
      difficulty: 1,
      horde: {
        enabled: true,
        maxAlive: 3,
        pulseIntervalMs: 500,
        minPlayerDistance: 5,
      },
    },
    zombieSpawns: [
      { x: 1, z: 0 },
      { x: 8, z: 0 },
      { x: -8, z: 0 },
      { x: 12, z: 0 },
    ],
    enemySpawns: [],
  };
  const player = { x: 0, y: PLAYER_EYE_HEIGHT, z: 0 };
  const enemies = createZombieEnemies({ ...world, zombieSpawns: [{ x: 8, z: 0 }] });
  const state = createHordeState(world);

  const first = updateHordeSpawns(enemies, world, player, state, { now: 500 });

  assert.equal(first.enemies.length, 2);
  assert.ok(first.enemies.some((enemy) => enemy.id === 'arena-horde-zombie-1'));
  assert.notEqual(first.enemies.find((enemy) => enemy.id === 'arena-horde-zombie-1').x, 1);
  assert.equal(first.state.spawned, 1);
  assert.equal(first.state.nextPulseAt, 1000);

  const capped = updateHordeSpawns(first.enemies, world, player, first.state, { now: 1000 });
  assert.equal(capped.enemies.length, 3);

  const stillCapped = updateHordeSpawns(capped.enemies, world, player, capped.state, { now: 1500 });
  assert.equal(stillCapped.enemies.length, 3);
});

test('horde director stays idle when disabled or before its pulse time', () => {
  const world = {
    id: 'quiet',
    playerSpawn: { x: 0, y: PLAYER_EYE_HEIGHT, z: 0, yaw: 0 },
    enemyEncounter: {
      difficulty: 1,
      horde: { enabled: false, maxAlive: 4, pulseIntervalMs: 500, minPlayerDistance: 5 },
    },
    zombieSpawns: [{ x: 8, z: 0 }],
    enemySpawns: [],
  };
  const enemies = createZombieEnemies(world);
  const state = createHordeState(world);

  assert.deepEqual(updateHordeSpawns(enemies, world, world.playerSpawn, state, { now: 1000 }), {
    enemies,
    state,
  });

  const enabledWorld = {
    ...world,
    enemyEncounter: {
      ...world.enemyEncounter,
      horde: { enabled: true, maxAlive: 4, pulseIntervalMs: 500, minPlayerDistance: 5 },
    },
  };
  const waitingState = createHordeState(enabledWorld);
  assert.equal(updateHordeSpawns(enemies, enabledWorld, enabledWorld.playerSpawn, waitingState, { now: 499 }).enemies.length, enemies.length);
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

test('horde zombies use deterministic target offsets so packs fan out while chasing', () => {
  const enemies = [
    {
      id: 'horde-a',
      role: 'horde',
      enemyType: 'zombie',
      faction: 'undead',
      x: -4,
      y: PLAYER_EYE_HEIGHT,
      z: 0,
      yaw: 0,
      radius: 0.38,
      speed: 1.15,
      hordeLaneOffset: -1.2,
    },
    {
      id: 'horde-b',
      role: 'horde',
      enemyType: 'zombie',
      faction: 'undead',
      x: -4,
      y: PLAYER_EYE_HEIGHT,
      z: 1.2,
      yaw: 0,
      radius: 0.38,
      speed: 1.15,
      hordeLaneOffset: 1.2,
    },
  ];

  const updated = updateZombieEnemies(enemies, { id: 'player', x: 4, y: PLAYER_EYE_HEIGHT, z: 0 }, {
    colliders: [],
    walkableSurfaces: [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100, topY: 0 }],
    dt: 0.5,
  });

  assert.notEqual(updated[0].targetOffsetZ, updated[1].targetOffsetZ);
  assert.notEqual(updated[0].yaw, updated[1].yaw);
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
