import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCENE_DEFINITIONS,
  createSceneWorld,
  createWarehouseWorld,
} from '../src/world.js';

test('registers the selectable scene options', () => {
  assert.deepEqual(
    SCENE_DEFINITIONS.map((scene) => [scene.id, scene.label]),
    [
      ['dungeon', 'Dungeon'],
      ['alien-landscape', 'Alien landscape'],
      ['derelict-starship', 'Derelict starship'],
      ['neon-backstreets', 'Neon backstreets'],
      ['sunken-temple', 'Sunken temple'],
      ['one-bit-cathedral', '1-bit cathedral'],
      ['rotwood-forest', 'Polygonal Rotwood Forest'],
      ['astral-geometry-garden', 'Astral Geometry Garden'],
      ['motel-mirage', 'Liminal Motel Mirage'],
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
  assert.ok(world.props.filter((item) => item.name.includes('wall torch')).length >= 4);
  assert.equal(world.cards.filter((item) => item.motion === 'torch-flame').length, 3);
  assert.equal(world.torchLights.length, 3);
  assert.ok(world.textures.some((texture) => texture.id === 'torchFlame'));
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
  assert.ok(world.stars.length >= 30);
  assert.equal(world.shootingStar.texture, 'shootingStar');
  assert.ok(world.shootingStar.duration > 1);
  assert.ok(world.mountains.length >= 6);
  assert.ok(world.floor.width >= 70);
  assert.ok(world.textures.some((texture) => texture.id === 'sun' && texture.size === 64));
  assert.ok(world.textures.some((texture) => texture.id === 'star' && texture.size === 64));
  assert.ok(world.textures.some((texture) => texture.id === 'shootingStar' && texture.size === 128));
  assert.ok(world.textures.some((texture) => texture.id === 'alienGround' && texture.size === 128));
});

test('builds three additional PS1-style wanderable scenes', () => {
  for (const id of ['derelict-starship', 'neon-backstreets', 'sunken-temple', 'rotwood-forest', 'astral-geometry-garden', 'motel-mirage']) {
    const world = createSceneWorld(id);
    const colliders = [...world.walls, ...world.crates].map((item) => item.collider).filter(Boolean);

    assert.equal(world.id, id);
    assert.ok(world.playerSpawn);
    assert.ok(world.floor);
    assert.ok(world.textures.every((texture) => texture.size === 64 || texture.size === 128));
    assert.ok(colliders.length >= 8);
  }
});

test('builds rotwood forest with dark-fantasy landmarks and living cards', () => {
  const world = createSceneWorld('rotwood-forest');
  const objects = [...world.walls, ...world.crates, ...world.cards];

  assert.equal(world.id, 'rotwood-forest');
  assert.ok(objects.some((item) => item.name.includes('hollow tree')));
  assert.ok(objects.some((item) => item.name.includes('stone circle')));
  assert.ok(objects.some((item) => item.name.includes('sunken footbridge')));
  assert.ok(objects.some((item) => item.name.includes('black pond')));
  assert.ok(world.cards.filter((item) => item.motion === 'sway').length >= 12);
  assert.ok(world.cards.filter((item) => item.motion === 'firefly').length >= 8);
  assert.ok(world.cards.filter((item) => item.motion === 'falling-leaf').length >= 8);
  assert.ok(world.movingBillboards.some((item) => item.name.includes('moon') && item.motion === 'moon-slide'));
  assert.deepEqual(world.playerTorch, {
    radius: 12,
    intensity: 1.45,
    color: [1.0, 0.52, 0.22],
  });
  assert.ok(world.textures.every((texture) => texture.size === 64 || texture.size === 128));
});

test('builds astral geometry garden as a navigable haunted demo-disc sculpture park', () => {
  const world = createSceneWorld('astral-geometry-garden');
  const colliders = [...world.walls, ...world.crates].map((item) => item.collider).filter(Boolean);

  assert.equal(world.id, 'astral-geometry-garden');
  assert.ok(world.floorPieces.length >= 5);
  assert.ok(world.crates.filter((item) => item.motion === 'bob').length >= 4);
  assert.ok(world.crates.filter((item) => item.motion === 'orbit').length >= 8);
  assert.ok(world.mountains.filter((item) => item.name.includes('pyramid')).length >= 4);
  assert.ok(world.cards.filter((item) => item.motion === 'flicker-comet').length >= 4);
  assert.equal(world.shootingStar.interval, 10);
  assert.ok(colliders.length >= 12);
  assert.ok(world.textures.every((texture) => texture.size === 64 || texture.size === 128));
});

test('builds motel mirage with a lonely walkable courtyard and flickering props', () => {
  const world = createSceneWorld('motel-mirage');
  const objects = [...world.walls, ...world.crates, ...world.cards];
  const colliders = [...world.walls, ...world.crates].map((item) => item.collider).filter(Boolean);

  assert.equal(world.id, 'motel-mirage');
  assert.ok(objects.some((item) => item.name.includes('empty pool')));
  assert.ok(objects.some((item) => item.name.includes('covered walkway')));
  assert.ok(objects.some((item) => item.name.includes('vending')));
  assert.ok(objects.some((item) => item.name.includes('buzzing sign')));
  assert.ok(world.cards.filter((item) => item.motion === 'palm-snap').length >= 8);
  assert.ok(world.cards.filter((item) => item.motion === 'window-pulse').length >= 6);
  assert.ok(world.cards.some((item) => item.motion === 'sign-flicker'));
  assert.ok(world.cards.some((item) => item.motion === 'water-shimmer'));
  assert.ok(world.shootingStar);
  assert.ok(colliders.length >= 20);
  assert.ok(world.textures.every((texture) => texture.size === 64 || texture.size === 128));
});

test('builds neon backstreets as a psychedelic floating sky scene', () => {
  const world = createSceneWorld('neon-backstreets');
  const objects = [...world.walls, ...world.crates, ...world.mountains];

  assert.equal(world.id, 'neon-backstreets');
  assert.equal(world.skyMode, 'psychedelic');
  assert.ok(objects.filter((item) => item.name.includes('floating platform')).length >= 4);
  assert.ok(objects.filter((item) => item.name.includes('tree')).length >= 8);
  assert.ok(objects.filter((item) => item.name.includes('cloud')).length >= 3);
  assert.ok(world.lightning?.bolts.length >= 2);
  assert.ok(world.textures.some((texture) => texture.id === 'neonSky' && texture.size === 128));
  assert.ok(world.textures.some((texture) => texture.id === 'neonCloud' && texture.size === 128));
});

test('builds a 1-bit polygon cathedral with black and white texture mapping', () => {
  const world = createSceneWorld('one-bit-cathedral');
  const colliders = [...world.walls, ...world.crates].map((item) => item.collider).filter(Boolean);

  assert.equal(world.id, 'one-bit-cathedral');
  assert.equal(world.label, '1-bit cathedral');
  assert.equal(world.oneBitStyle, 'dithered-gradient');
  assert.ok(world.floor);
  assert.ok(world.textures.every((texture) => texture.id.startsWith('oneBit') || texture.id === 'zombie' || texture.id === 'healthPotion'));
  assert.ok(world.textures.every((texture) => texture.size === 64 || texture.size === 128));
  assert.ok(world.clearColor[0] > 0);
  assert.ok(world.walls.length >= 28);
  assert.ok(world.crates.length >= 18);
  assert.ok(colliders.length >= 40);
  assert.ok(world.playerSpawn.z > 15);
});

test('adds non-colliding rain to the sunken temple scene', () => {
  const world = createSceneWorld('sunken-temple');

  assert.equal(world.rain?.texture, 'rain');
  assert.ok(world.rain?.drops.length >= 24);
  assert.ok(world.textures.some((texture) => texture.id === 'rain' && texture.size === 64));
  assert.ok([...world.walls, ...world.crates].every((item) => !item.name.includes('rain')));
});

test('keeps every scene in a positive-Y-up convention', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);
    const objects = [world.floor, world.ceiling, ...world.walls, ...world.crates, ...world.platforms].filter(Boolean);

    assert.ok(world.playerSpawn.y > 0, definition.id);
    assert.ok(objects.every((item) => item.height > 0), definition.id);
    assert.ok(objects.every((item) => item.y + item.height >= item.y), definition.id);
    assert.ok(world.sun === null || world.sun.y > world.playerSpawn.y, definition.id);
    assert.ok(world.mountains.every((item) => item.y >= 0 && item.height > 0), definition.id);
  }
});

test('adds jumpable platforms or stairs and a kill plane to every scene', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);
    const raisedPlatforms = world.platforms.filter((item) => item.y + item.height > 0.35);

    assert.ok(raisedPlatforms.length >= 2, definition.id);
    assert.ok(raisedPlatforms.every((item) => item.collider), definition.id);
    assert.ok(world.killY < 0, definition.id);
  }
});

test('spawns every scene in open floor space outside colliders', () => {
  const radius = 0.32;

  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);
    const spawn = world.playerSpawn;
    const blocking = [...world.walls, ...world.crates, ...world.platforms]
      .filter((item) => item.collider)
      .filter((item) => (
        spawn.x + radius > item.collider.minX
        && spawn.x - radius < item.collider.maxX
        && spawn.z + radius > item.collider.minZ
        && spawn.z - radius < item.collider.maxZ
      ));

    assert.deepEqual(blocking.map((item) => item.name), [], definition.id);
  }
});

test('dots every scene with two or three zombie spawn points away from the player', () => {
  const playerRadius = 1.6;
  const zombieRadius = 0.38;

  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);

    assert.ok(world.zombieSpawns.length >= 2, definition.id);
    assert.ok(world.zombieSpawns.length <= 3, definition.id);

    for (const spawn of world.zombieSpawns) {
      const distanceFromPlayer = Math.hypot(spawn.x - world.playerSpawn.x, spawn.z - world.playerSpawn.z);
      const blocking = [...world.walls, ...world.crates, ...world.platforms]
        .filter((item) => item.collider)
        .filter((item) => (
          spawn.x + zombieRadius > item.collider.minX
          && spawn.x - zombieRadius < item.collider.maxX
          && spawn.z + zombieRadius > item.collider.minZ
          && spawn.z - zombieRadius < item.collider.maxZ
        ));

      assert.ok(distanceFromPlayer > playerRadius, definition.id);
      assert.deepEqual(blocking.map((item) => item.name), [], definition.id);
    }
  }
});

test('places two or three green health potion pickups in every scene', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);

    assert.ok(world.healthPotions.length >= 2, definition.id);
    assert.ok(world.healthPotions.length <= 3, definition.id);
    assert.ok(world.textures.some((texture) => texture.id === 'healthPotion'), definition.id);

    for (const potion of world.healthPotions) {
      assert.equal(potion.texture, 'healthPotion');
      assert.equal(potion.mesh, 'health-flask');
      assert.equal(potion.motion, 'pickup-bob');
      assert.ok(Math.hypot(potion.x - world.playerSpawn.x, potion.z - world.playerSpawn.z) > 2, definition.id);
    }
  }
});

test('gives every scene a cheap 90s-style audio reverb profile', () => {
  const allowedReverbs = ['tight-room', 'open-air', 'metal-hall', 'stone-vault', 'dream-space'];

  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);

    assert.ok(allowedReverbs.includes(world.audio.reverb), definition.id);
  }
});
