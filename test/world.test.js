import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCENE_DEFINITIONS,
  createSceneWorld,
  createWarehouseWorld,
} from '../src/world.js';

test('registers dungeon and alien landscape scene options', () => {
  assert.deepEqual(
    SCENE_DEFINITIONS.map((scene) => [scene.id, scene.label]),
    [
      ['dungeon', 'Dungeon'],
      ['alien-landscape', 'Alien landscape'],
    ],
  );
});

test('falls back to dungeon for unknown scene ids', () => {
  assert.equal(createSceneWorld('missing').id, 'dungeon');
});

test('builds a warehouse test scene with rooms, corridors, crates, and low-res textures', () => {
  const world = createWarehouseWorld();

  assert.ok(world.walls.length >= 20);
  assert.ok(world.crates.length >= 10);
  assert.ok(world.lights.length >= 4);
  assert.ok(world.playerSpawn);
  assert.ok(world.textures.every((texture) => texture.size === 64 || texture.size === 128));
});

test('keeps collision bounds available for every wall and crate', () => {
  const world = createWarehouseWorld();
  const colliders = [...world.walls, ...world.crates].map((item) => item.collider);

  assert.ok(colliders.length > 0);
  assert.ok(colliders.every((collider) => Number.isFinite(collider.minX)));
  assert.ok(colliders.every((collider) => Number.isFinite(collider.maxX)));
  assert.ok(colliders.every((collider) => Number.isFinite(collider.minZ)));
  assert.ok(colliders.every((collider) => Number.isFinite(collider.maxZ)));
});

test('builds an alien landscape with sun, distant mountains, and low-res textures', () => {
  const world = createSceneWorld('alien-landscape');

  assert.equal(world.id, 'alien-landscape');
  assert.ok(world.sun);
  assert.ok(world.mountains.length >= 6);
  assert.ok(world.floor.width >= 70);
  assert.ok(world.textures.some((texture) => texture.id === 'sun' && texture.size === 64));
  assert.ok(world.textures.some((texture) => texture.id === 'alienGround' && texture.size === 128));
});
