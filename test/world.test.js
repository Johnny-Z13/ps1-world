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

test('marks a dungeon lava floor as a damaging material zone', () => {
  const world = createWarehouseWorld();

  assert.ok(world.textures.some((texture) => texture.id === 'lava'), 'dungeon exposes a lava material');
  assert.ok(world.floorPieces.some((piece) => piece.texture === 'lava' && piece.surfaceType === 'lava'), 'dungeon has a named lava floor piece');
  assert.ok(world.damageZones.length >= 1, 'dungeon has at least one authored damage zone');
  assert.ok(world.damageZones.some((zone) => (
    zone.name.includes('lava')
    && zone.surfaceType === 'lava'
    && zone.damagePerSecond > 0
  )));
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
  assert.deepEqual(world.skyDome, { mode: 'starry', palette: 'deep-night' });
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

test('builds the derelict starship with varied metal ceiling geometry instead of repeated warning chevrons', () => {
  const world = createSceneWorld('derelict-starship');
  const objects = [world.floor, world.ceiling, ...world.walls, ...world.crates, ...world.platforms, ...world.props].filter(Boolean);
  const warningObjects = objects.filter((item) => item.texture === 'warning');
  const ceilingProps = world.props.filter((item) => item.name.includes('ceiling') || item.name.includes('overhead'));
  const ceilingHeights = new Set(ceilingProps.map((item) => item.y.toFixed(2)));
  const starshipGeometry = objects.filter((item) => (
    /rib|recess|bulkhead|hull|conduit|vent|ceiling|panel|trim|hatch|door/.test(item.name)
  ));

  assert.equal(world.ceiling.texture, 'shipCeiling');
  assert.ok(world.textures.some((texture) => texture.id === 'shipCeiling' && texture.size === 128));
  assert.ok(world.textures.some((texture) => texture.id === 'darkMetal' && texture.size === 128));
  assert.ok(world.textures.some((texture) => texture.id === 'hullPanel' && texture.size === 128));
  assert.ok(world.textures.some((texture) => texture.id === 'reactorGlow' && texture.size === 64));
  assert.ok(warningObjects.length <= 1);
  assert.ok(ceilingProps.length >= 10);
  assert.ok(ceilingHeights.size >= 5);
  assert.ok(starshipGeometry.length >= 24);
  assert.ok(world.props.every((item) => item.collider === null));
});

test('builds rotwood forest with dark-fantasy landmarks and living cards', () => {
  const world = createSceneWorld('rotwood-forest');
  const objects = [...world.walls, ...world.crates, ...world.cards];

  assert.equal(world.id, 'rotwood-forest');
  assert.ok(objects.some((item) => item.name.includes('hollow tree')));
  assert.ok(objects.some((item) => item.name.includes('stone circle')));
  assert.ok(objects.some((item) => item.name.includes('sunken footbridge')));
  assert.ok(objects.some((item) => item.name.includes('black pond')));
  assert.ok(world.crates.filter((item) => item.mesh === 'whole-tree').length >= 36);
  assert.ok(world.crates.filter((item) => item.mesh === 'whole-tree').every((item) => item.canopyTexture));
  assert.equal(world.crates.filter((item) => item.name.includes('black tree trunk')).length, 0);
  assert.ok(world.cards.filter((item) => item.motion === 'sway').length >= 12);
  assert.ok(world.cards.filter((item) => item.motion === 'firefly').length >= 8);
  assert.ok(world.cards.filter((item) => item.motion === 'falling-leaf').length >= 80);
  assert.ok(world.cards.filter((item) => item.texture === 'moonbeam').length >= 5);
  assert.ok(world.movingBillboards.some((item) => item.name.includes('moon') && item.motion === 'moon-slide'));
  assert.ok(world.textures.some((texture) => texture.id === 'moonbeam'));
  assert.equal(world.rain?.texture, 'rain');
  assert.ok(world.rain?.drops.length >= 48);
  assert.ok(world.rain.drops.every((drop) => drop.y >= 16 && drop.height >= 10));
  assert.equal(world.lightning?.texture, 'lightning');
  assert.ok(world.lightning?.bolts.length >= 3);
  assert.ok(world.textures.some((texture) => texture.id === 'rain'));
  assert.ok(world.textures.some((texture) => texture.id === 'lightning'));
  assert.deepEqual(world.playerTorch, {
    radius: 12,
    intensity: 2.9,
    color: [1.0, 0.52, 0.22],
  });
  assert.ok(world.textures.every((texture) => texture.size === 64 || texture.size === 128));
});

test('builds astral geometry garden as a navigable haunted demo-disc sculpture park', () => {
  const world = createSceneWorld('astral-geometry-garden');
  const colliders = [...world.walls, ...world.crates].map((item) => item.collider).filter(Boolean);
  const doglegPlatforms = world.floorPieces.filter((item) => item.name.includes('dogleg') || item.name.includes('skyblock'));
  const treeForms = world.crates.filter((item) => item.name.includes('floating tree'));
  const neonFragments = [...world.crates, ...world.walls, ...world.cards].filter((item) => item.name.includes('neon backstreet'));

  assert.equal(world.id, 'astral-geometry-garden');
  assert.ok(world.floorPieces.length >= 12);
  assert.ok(world.floor.width >= 22);
  assert.ok(doglegPlatforms.length >= 4);
  assert.ok(world.floorPieces.some((item) => item.x > 34 && item.z < -38));
  assert.ok(world.floorPieces.some((item) => item.x < -28 && item.z < -54));
  assert.ok(world.platforms.some((item) => item.y >= 3.2));
  assert.ok(world.crates.filter((item) => item.motion === 'bob').length >= 7);
  assert.ok(world.crates.filter((item) => item.motion === 'orbit').length >= 12);
  assert.ok(treeForms.length >= 10);
  assert.ok(neonFragments.length >= 8);
  assert.deepEqual(world.skyDome, { mode: 'clouds', palette: 'liminal-blue' });
  assert.ok(world.clearColor[2] > world.clearColor[0]);
  assert.ok(world.clearColor[1] > 0.6);
  assert.ok(world.mountains.filter((item) => item.name.includes('pyramid')).length >= 6);
  assert.ok(world.cards.filter((item) => item.motion === 'flicker-comet').length >= 6);
  assert.equal(world.shootingStar.interval, 10);
  assert.ok(colliders.length >= 30);
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
  assert.deepEqual(world.skyDome, { mode: 'clouds', palette: 'electric-blue' });
  assert.ok(objects.filter((item) => item.name.includes('floating platform')).length >= 4);
  assert.ok(objects.filter((item) => item.name.includes('tree')).length >= 8);
  assert.ok(objects.filter((item) => item.name.includes('cloud')).length >= 3);
  assert.ok(world.lightning?.bolts.length >= 2);
  assert.ok(world.textures.some((texture) => texture.id === 'neonSky' && texture.size === 128));
  assert.ok(world.textures.some((texture) => texture.id === 'neonCloud' && texture.size === 128));
});

test('keeps Neon Backstreets Rogue route gaps within sprint-jump range', () => {
  const world = createSceneWorld('neon-backstreets');
  const routeNames = [
    'floating platform spawn deck',
    'floating platform entry',
    'floating platform near span',
    'floating platform glass ledge',
    'floating platform mid span',
    'floating platform far bridge',
  ];
  const surfaces = [world.floor, ...world.walls, ...world.platforms].filter(Boolean);
  const route = routeNames.map((name) => surfaces.find((surface) => surface.name === name));

  assert.deepEqual(route.map((surface) => surface?.name), routeNames);

  for (let index = 0; index < route.length - 1; index += 1) {
    const from = route[index];
    const to = route[index + 1];
    const gapX = Math.max(0, Math.abs(from.x - to.x) - (from.width + to.width) / 2);
    const gapZ = Math.max(0, Math.abs(from.z - to.z) - (from.depth + to.depth) / 2);
    const gap = Math.hypot(gapX, gapZ);
    const verticalRise = (to.y + to.height) - (from.y + from.height);

    assert.ok(gap <= 3, `${from.name} to ${to.name} gap ${gap}`);
    assert.ok(verticalRise <= 0.55, `${from.name} to ${to.name} rise ${verticalRise}`);
  }

  const gate = world.warpGate;
  const bridge = route.at(-1);
  assert.ok(gate.x >= bridge.x - bridge.width / 2 && gate.x <= bridge.x + bridge.width / 2);
  assert.ok(gate.z >= bridge.z - bridge.depth / 2 && gate.z <= bridge.z + bridge.depth / 2);
});

test('builds a 1-bit polygon cathedral with black and white texture mapping', () => {
  const world = createSceneWorld('one-bit-cathedral');
  const colliders = [...world.walls, ...world.crates].map((item) => item.collider).filter(Boolean);

  assert.equal(world.id, 'one-bit-cathedral');
  assert.equal(world.label, '1-bit cathedral');
  assert.equal(world.oneBitStyle, 'dithered-gradient');
  assert.deepEqual(world.skyDome, { mode: 'starry', palette: 'one-bit-night' });
  assert.ok(world.floor);
  assert.ok(world.textures.every((texture) => (
    texture.id.startsWith('oneBit')
    || ['zombie', 'one-eye-alien', 'molten-sentinel', 'healthPotion', 'warpGate', 'bloodBurst'].includes(texture.id)
  )));
  assert.ok(world.textures.every((texture) => texture.size === 64 || texture.size === 128));
  assert.ok(world.clearColor[0] > 0);
  assert.ok(world.walls.length >= 28);
  assert.ok(world.crates.length >= 18);
  assert.ok(colliders.length >= 40);
  assert.ok(world.playerSpawn.z > 15);
});

test('adds non-colliding rain to the sunken temple scene', () => {
  const world = createSceneWorld('sunken-temple');
  const highestDrop = Math.max(...world.rain.drops.map((drop) => drop.y));
  const tallestDrop = Math.max(...world.rain.drops.map((drop) => drop.height));

  assert.equal(world.rain?.texture, 'rain');
  assert.ok(world.rain?.drops.length >= 24);
  assert.ok(highestDrop >= 24);
  assert.ok(tallestDrop >= 20);
  assert.equal(world.skyDome?.mode, 'clouds');
  assert.equal(world.skyDome?.palette, 'psychedelic-purple');
  assert.ok(world.clearColor[2] > world.clearColor[0]);
  assert.ok(world.clearColor[1] < 0.04);
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

test('places Rogue warp gates far from player spawn and outside colliders', () => {
  const radius = 1.05;

  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);
    const gate = world.warpGate;
    const distanceFromPlayer = Math.hypot(gate.x - world.playerSpawn.x, gate.z - world.playerSpawn.z);
    const blocking = [...world.walls, ...world.crates, ...world.platforms]
      .filter((item) => item.collider)
      .filter((item) => (
        gate.x + radius > item.collider.minX
        && gate.x - radius < item.collider.maxX
        && gate.z + radius > item.collider.minZ
        && gate.z - radius < item.collider.maxZ
      ));

    assert.ok(distanceFromPlayer >= 8, definition.id);
    assert.deepEqual(blocking.map((item) => item.name), [], definition.id);
    assert.equal(gate.texture, 'warpGate');
    assert.ok(world.textures.some((texture) => texture.id === 'warpGate'), definition.id);
  }
});

test('dots every scene with two or three zombie spawn points away from the player', () => {
  const playerRadius = 1.6;
  const zombieRadius = 0.38;

  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);

    if (definition.id === 'alien-landscape') {
      assert.equal(world.zombieSpawns.length, 20, definition.id);
    } else {
      assert.ok(world.zombieSpawns.length >= 2, definition.id);
      assert.ok(world.zombieSpawns.length <= 3, definition.id);
    }

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

test('adds typed enemy spawners for the alien and molten sentinel to every scene', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);
    const enemyTypes = world.enemySpawns.map((spawn) => spawn.enemyType);

    assert.equal(enemyTypes.filter((type) => type === 'one-eye-alien').length, 1, definition.id);
    if (world.ceiling) {
      assert.equal(enemyTypes.filter((type) => type === 'molten-sentinel').length, 0, definition.id);
    } else {
      assert.equal(enemyTypes.filter((type) => type === 'molten-sentinel').length, 1, definition.id);
    }

    for (const spawn of world.enemySpawns) {
      const distanceFromPlayer = Math.hypot(spawn.x - world.playerSpawn.x, spawn.z - world.playerSpawn.z);
      const overlappingZombie = world.zombieSpawns.find((zombieSpawn) => {
        const zombieRadius = zombieSpawn.radius ?? 0.38;
        return Math.hypot(spawn.x - zombieSpawn.x, spawn.z - zombieSpawn.z) < spawn.radius + zombieRadius;
      });
      const blocking = [...world.walls, ...world.crates, ...world.platforms]
        .filter((item) => item.collider)
        .filter((item) => (
          spawn.x + spawn.radius > item.collider.minX
          && spawn.x - spawn.radius < item.collider.maxX
          && spawn.z + spawn.radius > item.collider.minZ
          && spawn.z - spawn.radius < item.collider.maxZ
        ));

      assert.ok(distanceFromPlayer > 3, definition.id);
      assert.equal(overlappingZombie, undefined, `${definition.id} ${spawn.enemyType}`);
      assert.deepEqual(blocking.map((item) => item.name), [], `${definition.id} ${spawn.enemyType}`);
      assert.equal(spawn.role, 'enemy');
      if (spawn.enemyType === 'molten-sentinel') {
        assert.equal(world.ceiling, null, definition.id);
        assert.ok(spawn.minimumHeadClearance >= 4.8, definition.id);
      }
    }
  }
});

test('maps every scene to an explicit enemy encounter difficulty and composition', () => {
  const difficulties = new Set();

  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);
    const encounter = world.enemyEncounter;
    const enemyTypes = world.enemySpawns.map((spawn) => spawn.enemyType);

    assert.equal(typeof encounter.difficulty, 'number', definition.id);
    assert.ok(encounter.difficulty >= 1, definition.id);
    assert.ok(encounter.difficulty <= 3, definition.id);
    assert.ok(encounter.allowedTypes.includes('zombie'), definition.id);
    assert.ok(Array.isArray(encounter.allowedTypes), definition.id);
    assert.deepEqual([...new Set(encounter.allowedTypes)], encounter.allowedTypes, definition.id);
    assert.equal(encounter.horde.enabled, true, definition.id);
    assert.ok(encounter.horde.maxAlive >= world.zombieSpawns.length, definition.id);
    assert.ok(encounter.horde.pulseIntervalMs >= 4000, definition.id);
    assert.ok(encounter.horde.minPlayerDistance >= 6, definition.id);
    assert.equal(typeof encounter.ecology, 'object', definition.id);
    assert.deepEqual(world.hordeTriggers, [], definition.id);
    assert.deepEqual(world.encounterTriggers, [], definition.id);
    assert.deepEqual(world.soundZones, [], definition.id);
    assert.deepEqual(world.objectives, [], definition.id);
    difficulties.add(encounter.difficulty);

    for (const enemyType of enemyTypes) {
      assert.ok(encounter.allowedTypes.includes(enemyType), `${definition.id} ${enemyType}`);
    }

    if (encounter.boss) {
      assert.ok(encounter.allowedTypes.includes(encounter.boss), definition.id);
      assert.ok(enemyTypes.includes(encounter.boss), definition.id);
    }
  }

  assert.ok(difficulties.size >= 3);
  assert.ok(createSceneWorld('alien-landscape').enemyEncounter.ecology['one-eye-alien'].secondaryTargetRange > 4.4);
});

test('gives every scene a diegetic navigation artifact instead of a clean minimap', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);
    const map = world.diegeticMap;

    assert.equal(map.sceneId, definition.id);
    assert.ok(map.artifactType, definition.id);
    assert.ok(map.title, definition.id);
    assert.ok(map.clueText, definition.id);
    assert.equal(map.reliable, false, definition.id);
    assert.ok(map.glitchIntensity >= 0, definition.id);
    assert.ok(map.glitchIntensity <= 1, definition.id);
  }

  assert.equal(createSceneWorld('motel-mirage').diegeticMap.artifactType, 'fire-exit-plan');
  assert.equal(createSceneWorld('derelict-starship').diegeticMap.artifactType, 'bulkhead-diagram');
  assert.equal(createSceneWorld('one-bit-cathedral').diegeticMap.artifactType, 'stained-glass-floor');
});

test('exposes fallback emitter metadata as an empty authoring surface', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const scene = createSceneWorld(definition.id);

    assert.deepEqual(scene.emitters, [], definition.id);
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

test('keeps dungeon health flasks clear of cubes and walls', () => {
  const world = createSceneWorld('dungeon');

  for (const potion of world.healthPotions) {
    const blocking = [...world.walls, ...world.crates, ...world.platforms]
      .filter((item) => item.collider)
      .filter((item) => (
        potion.x + potion.radius > item.collider.minX
        && potion.x - potion.radius < item.collider.maxX
        && potion.z + potion.radius > item.collider.minZ
        && potion.z - potion.radius < item.collider.maxZ
      ));

    assert.deepEqual(blocking.map((item) => item.name), [], potion.name);
  }
});

test('gives every scene a cheap 90s-style audio reverb profile', () => {
  const allowedReverbs = ['tight-room', 'open-air', 'metal-hall', 'stone-vault', 'dream-space'];

  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);

    assert.ok(allowedReverbs.includes(world.audio.reverb), definition.id);
  }
});
