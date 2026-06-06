import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inflateSync } from 'node:zlib';

import { LEVEL_GLB_URLS, parseLevelGlb } from '../src/levelGlb.js';
import { SCENE_DEFINITIONS, createSceneWorld } from '../src/world.js';

function readLevel(id) {
  const file = readFileSync(new URL(`../assets/models/levels/${id}.glb`, import.meta.url));
  return parseLevelGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
}

function makeMarkerOnlyGlb(nodes, overrides = {}) {
  const jsonBytes = padChunk(new TextEncoder().encode(JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, index) => index) }],
    nodes,
    buffers: [{ byteLength: 0 }],
    ...overrides,
  })), 0x20);
  const binBytes = new Uint8Array(0);
  const buffer = new ArrayBuffer(12 + 8 + jsonBytes.byteLength + 8 + binBytes.byteLength);
  const view = new DataView(buffer);
  let offset = 0;

  writeAscii(view, offset, 'glTF');
  offset += 4;
  view.setUint32(offset, 2, true);
  offset += 4;
  view.setUint32(offset, buffer.byteLength, true);
  offset += 4;
  view.setUint32(offset, jsonBytes.byteLength, true);
  offset += 4;
  view.setUint32(offset, 0x4e4f534a, true);
  offset += 4;
  new Uint8Array(buffer, offset, jsonBytes.byteLength).set(jsonBytes);
  offset += jsonBytes.byteLength;
  view.setUint32(offset, binBytes.byteLength, true);
  offset += 4;
  view.setUint32(offset, 0x004e4942, true);

  return buffer;
}

function padChunk(bytes, padByte) {
  const paddedLength = Math.ceil(bytes.byteLength / 4) * 4;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded.fill(padByte, bytes.byteLength);
  return padded;
}

function writeAscii(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

test('maps every selectable scene to a Blender-authored GLB', () => {
  assert.deepEqual(
    Object.keys(LEVEL_GLB_URLS),
    SCENE_DEFINITIONS.map((scene) => scene.id),
  );
  assert.equal(LEVEL_GLB_URLS.dungeon, './assets/models/levels/dungeon.glb?v=14');
});

test('parses level GLB art, collision, walkable, and marker roles', () => {
  const level = readLevel('dungeon');

  assert.equal(level.id, 'dungeon');
  assert.ok(level.artMeshes.length >= 40);
  assert.ok(level.collision.length >= 30);
  assert.ok(level.walkableSurfaces.length >= 30);
  assert.equal(level.zombieSpawns.length, 3);
  assert.equal(level.healthPotions.length, 3);
  assert.equal(level.collectibles.length, 1);
  assert.equal(level.collectibles[0].label, 'You found the goblet.');
  assert.equal(level.collectibles[0].x, 2);
  assert.equal(level.collectibles[0].z, 1.5);
  assert.ok(level.artMeshes.some((mesh) => (
    mesh.collectibleId === 'dungeon-golden-goblet'
      && mesh.motion === 'pickup-bob'
      && mesh.warping === false
  )));
  assert.equal(level.damageZones.length, 1);
  assert.equal(level.lights.length, 4);
  assert.equal(level.torchLights.length, 3);
  assert.equal(level.killY, -8);
});

test('converts Blender GLB coordinates back to game coordinates', () => {
  const level = readLevel('dungeon');
  const playerSpawn = level.playerSpawn;
  const northWall = level.collision.find((collider) => collider.name.includes('north_wall_a'));
  const floor = level.walkableSurfaces.find((surface) => surface.name === 'WALKABLE_dungeon_floor');

  assert.deepEqual(playerSpawn, { x: -9.5, y: 1.45, z: 9.5, yaw: 2.35 });
  assert.equal(round(northWall.minZ), -12);
  assert.equal(round(northWall.maxZ), -11.6);
  assert.equal(round(floor.topY), 0);
});

test('all exported level GLBs contain game-authoring roles', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const level = readLevel(definition.id);

    assert.equal(level.id, definition.id);
    assert.ok(level.artMeshes.length > 0, `${definition.id} has art meshes`);
    assert.ok(level.collision.length > 0, `${definition.id} has collision meshes`);
    assert.ok(level.walkableSurfaces.length > 0, `${definition.id} has walkable meshes`);
    assert.ok(level.playerSpawn, `${definition.id} has a player spawn`);
  }
});

test('exported gameplay collision and walkable roles match procedural scene rules', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const scene = createSceneWorld(definition.id);
    const level = readLevel(definition.id);
    const expectedCollisionCount = scene.walls.length + scene.crates.length + (scene.platforms ?? []).length;
    const expectedWalkableCount = (scene.floorPieces ?? [scene.floor]).length
      + scene.walls.length
      + scene.crates.length
      + (scene.platforms ?? []).length;

    assert.equal(level.collision.length, expectedCollisionCount, `${definition.id} collision count`);
    assert.equal(level.walkableSurfaces.length, expectedWalkableCount, `${definition.id} walkable count`);
    assert.ok(!level.collision.some((mesh) => mesh.name.includes('_ceiling')), `${definition.id} ceiling is not collision`);
    assert.ok(!level.walkableSurfaces.some((mesh) => mesh.name.includes('_ceiling')), `${definition.id} ceiling is not walkable`);
  }
});

test('exported level GLBs keep procedural special-effect art meshes', () => {
  const neon = readLevel('neon-backstreets');
  const temple = readLevel('sunken-temple');
  const rotwood = readLevel('rotwood-forest');

  assert.ok(hasMaterialMesh(neon, 'LEVELMAT_lightning'), 'neon-backstreets exports lightning bolt geometry');
  assert.ok(hasMaterialMesh(temple, 'LEVELMAT_rain'), 'sunken-temple exports rain drop geometry');
  assert.ok(hasMaterialMesh(rotwood, 'LEVELMAT_paleMoon'), 'rotwood-forest exports the moving moon billboard');
  assert.ok(hasMaterialMesh(rotwood, 'LEVELMAT_rain'), 'rotwood-forest exports storm rain geometry');
  assert.ok(hasMaterialMesh(rotwood, 'LEVELMAT_lightning'), 'rotwood-forest exports storm lightning geometry');
});

test('health pickup markers keep render dimensions and pickup motion', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const level = readLevel(definition.id);

    for (const potion of level.healthPotions) {
      assert.equal(potion.texture, 'healthPotion', `${definition.id} health potion texture`);
      assert.equal(potion.mesh, 'health-flask', `${definition.id} health potion mesh`);
      assert.equal(potion.motion, 'pickup-bob', `${definition.id} health potion motion`);
      assert.ok(potion.width > 0, `${definition.id} health potion width`);
      assert.ok(potion.depth > 0, `${definition.id} health potion depth`);
      assert.ok(potion.height > 0, `${definition.id} health potion height`);
      assert.ok(potion.radius > 0, `${definition.id} health potion radius`);
    }
  }
});

test('collectible pickup markers and art meshes keep authored metadata', () => {
  const level = parseLevelGlb(makeMarkerOnlyGlb([
    {
      name: 'MARKER_dungeon_PICKUP_COLLECTIBLE_1_golden_goblet',
      translation: [1.25, 0.75, -2.5],
      extras: {
        scene_id: 'dungeon',
        collectibleId: 'dungeon-golden-goblet',
        collectibleType: 'goblet',
        label: 'You found the goblet.',
        radius: '0.75',
        height: '1.2',
      },
    },
    {
      name: 'ART_dungeon_golden_goblet',
      mesh: 0,
      extras: {
        level_role: 'art',
        scene_id: 'dungeon',
        texture_id: 'gold',
        motion: 'pickup-bob',
        warping: 'false',
        collectibleId: 'dungeon-golden-goblet',
      },
    },
  ], {
    meshes: [{
      primitives: [{}],
    }],
  }), 'dungeon');

  assert.deepEqual(level.collectibles, [{
    name: 'MARKER_dungeon_PICKUP_COLLECTIBLE_1_golden_goblet',
    x: 1.25,
    y: 0.75,
    z: 2.5,
    collectibleId: 'dungeon-golden-goblet',
    collectibleType: 'goblet',
    label: 'You found the goblet.',
    radius: 0.75,
    height: 1.2,
  }]);
  assert.equal(level.artMeshes[0].collectibleId, 'dungeon-golden-goblet');
  assert.equal(level.artMeshes[0].motion, 'pickup-bob');
  assert.equal(level.artMeshes[0].warping, false);
});

test('damage zone markers keep lava material gameplay metadata', () => {
  const dungeon = readLevel('dungeon');
  const lavaZone = dungeon.damageZones.find((zone) => zone.surfaceType === 'lava');

  assert.ok(lavaZone, 'dungeon exports a lava damage zone');
  assert.match(lavaZone.name, /lava/);
  assert.ok(lavaZone.width > 0);
  assert.ok(lavaZone.depth > 0);
  assert.ok(lavaZone.height > 0);
  assert.ok(lavaZone.damagePerSecond > 0);
});

test('horde trigger markers preserve authored encounter metadata', () => {
  const level = parseLevelGlb(makeMarkerOnlyGlb([
    {
      name: 'TRIGGER_dungeon_HORDE_TRIGGER_1_lobby_alarm',
      translation: [2.5, 1.25, -7.5],
      extras: {
        scene_id: 'dungeon',
        triggerType: 'awaken_horde',
        width: 6,
        depth: 8,
        height: 2,
        maxAlive: '12',
        pulseIntervalMs: '2400',
      },
    },
    {
      name: 'MarkerWithExtrasRole',
      translation: [-3, 0.5, 4],
      extras: {
        level_role: 'HORDE_TRIGGER',
        scene_id: 'dungeon',
        triggerType: 'boss_feed',
        enabled: 'false',
      },
    },
  ]), 'dungeon');

  assert.deepEqual(level.hordeTriggers, [
    {
      name: 'TRIGGER_dungeon_HORDE_TRIGGER_1_lobby_alarm',
      x: 2.5,
      y: 1.25,
      z: 7.5,
      triggerType: 'awaken_horde',
      width: 6,
      depth: 8,
      height: 2,
      maxAlive: 12,
      pulseIntervalMs: 2400,
    },
    {
      name: 'MarkerWithExtrasRole',
      x: -3,
      y: 0.5,
      z: -4,
      triggerType: 'boss_feed',
      enabled: false,
    },
  ]);
});

test('encounter trigger markers preserve authored set-piece metadata', () => {
  const level = parseLevelGlb(makeMarkerOnlyGlb([
    {
      name: 'TRIGGER_dungeon_ENCOUNTER_TRIGGER_1_monster_closet',
      translation: [1, 0.75, -2],
      extras: {
        scene_id: 'dungeon',
        encounterType: 'monster_closet',
        targetId: 'closet-a',
        width: 3,
        depth: 2,
        height: 2.5,
        oneShot: 'true',
      },
    },
    {
      name: 'JumpScareExtrasRole',
      translation: [-4, 1, 5],
      extras: {
        level_role: 'ENCOUNTER_TRIGGER',
        scene_id: 'dungeon',
        encounterType: 'jump_scare',
        soundId: 'radio-burst',
        enabled: 'false',
      },
    },
  ]), 'dungeon');

  assert.deepEqual(level.encounterTriggers, [
    {
      name: 'TRIGGER_dungeon_ENCOUNTER_TRIGGER_1_monster_closet',
      x: 1,
      y: 0.75,
      z: 2,
      encounterType: 'monster_closet',
      targetId: 'closet-a',
      width: 3,
      depth: 2,
      height: 2.5,
      oneShot: true,
    },
    {
      name: 'JumpScareExtrasRole',
      x: -4,
      y: 1,
      z: -5,
      encounterType: 'jump_scare',
      soundId: 'radio-burst',
      enabled: false,
    },
  ]);
});

test('sound zone markers preserve authored spatial audio metadata', () => {
  const level = parseLevelGlb(makeMarkerOnlyGlb([
    {
      name: 'TRIGGER_dungeon_SOUND_ZONE_1_radio_bleed',
      translation: [2, 1, -3],
      extras: {
        scene_id: 'dungeon',
        soundZoneType: 'radio_bleed',
        soundId: 'radio-static',
        width: 5,
        depth: 7,
        height: 3,
        gain: '0.45',
        enabled: 'true',
      },
    },
    {
      name: 'HummingWallExtrasRole',
      translation: [-6, 0.5, 8],
      extras: {
        level_role: 'SOUND_ZONE',
        scene_id: 'dungeon',
        soundZoneType: 'hostile_silence',
        targetBus: 'ambience',
        gain: '0',
      },
    },
  ]), 'dungeon');

  assert.deepEqual(level.soundZones, [
    {
      name: 'TRIGGER_dungeon_SOUND_ZONE_1_radio_bleed',
      x: 2,
      y: 1,
      z: 3,
      soundZoneType: 'radio_bleed',
      soundId: 'radio-static',
      width: 5,
      depth: 7,
      height: 3,
      gain: 0.45,
      enabled: true,
    },
    {
      name: 'HummingWallExtrasRole',
      x: -6,
      y: 0.5,
      z: -8,
      soundZoneType: 'hostile_silence',
      targetBus: 'ambience',
      gain: 0,
    },
  ]);
});

test('objective markers preserve authored ritual metadata', () => {
  const level = parseLevelGlb(makeMarkerOnlyGlb([
    {
      name: 'MARKER_dungeon_OBJECTIVE_tune_beacon',
      translation: [3, 1.5, -6],
      extras: {
        scene_id: 'dungeon',
        objectiveId: 'beacon-a',
        objectiveType: 'tune_beacon',
        label: 'tune the wrong beacon',
        requiredInRogue: 'true',
        countRequired: '1',
      },
    },
    {
      name: 'ObjectiveTriggerExtrasRole',
      translation: [-2, 0.5, 7],
      extras: {
        level_role: 'OBJECTIVE_TRIGGER',
        scene_id: 'dungeon',
        objectiveId: 'feed-gate',
        objectiveType: 'feed_gate',
        targetId: 'gate-a',
      },
    },
  ]), 'dungeon');

  assert.deepEqual(level.objectives, [
    {
      name: 'MARKER_dungeon_OBJECTIVE_tune_beacon',
      x: 3,
      y: 1.5,
      z: 6,
      objectiveType: 'tune_beacon',
      requiredInRogue: true,
      objectiveId: 'beacon-a',
      label: 'tune the wrong beacon',
      countRequired: 1,
    },
    {
      name: 'ObjectiveTriggerExtrasRole',
      x: -2,
      y: 0.5,
      z: -7,
      objectiveType: 'feed_gate',
      requiredInRogue: true,
      objectiveId: 'feed-gate',
      targetId: 'gate-a',
    },
  ]);
});

test('emitter markers preserve authored visual and audio emitter metadata', () => {
  const level = parseLevelGlb(makeMarkerOnlyGlb([
    {
      name: 'MARKER_dungeon_EMITTER_1_dripping_wall',
      translation: [1, 2, -3],
      extras: {
        scene_id: 'dungeon',
        emitterId: 'drip-a',
        emitterType: 'water_drip',
        targetId: 'pipe-a',
        textureId: 'water-drop',
        soundId: 'rain-spot-drip',
        radius: '4',
        rate: '0.35',
        enabled: 'true',
      },
    },
    {
      name: 'StaticEmitterExtrasRole',
      translation: [-4, 0.5, 6],
      extras: {
        level_role: 'EMITTER',
        scene_id: 'dungeon',
        emitterType: 'radio_spark',
        targetBus: 'sfx',
        gain: '0.6',
      },
    },
  ]), 'dungeon');

  assert.deepEqual(level.emitters, [
    {
      name: 'MARKER_dungeon_EMITTER_1_dripping_wall',
      x: 1,
      y: 2,
      z: 3,
      emitterType: 'water_drip',
      emitterId: 'drip-a',
      targetId: 'pipe-a',
      textureId: 'water-drop',
      soundId: 'rain-spot-drip',
      radius: 4,
      rate: 0.35,
      enabled: true,
    },
    {
      name: 'StaticEmitterExtrasRole',
      x: -4,
      y: 0.5,
      z: -6,
      emitterType: 'radio_spark',
      targetBus: 'sfx',
      gain: 0.6,
    },
  ]);
});

test('surface material metadata preserves authored footstep splash and damage hints', () => {
  const level = parseLevelGlb(makeMarkerOnlyGlb([], {
    materials: [
      {
        name: 'SURFACE_METAL_grate',
        extras: {
          surfaceType: 'metal',
          footstepSoundId: 'boot-metal',
          friction: '0.85',
        },
      },
      {
        name: 'LEVELMAT_water',
        extras: {
          level_surface: 'water',
          splashSoundId: 'water-splash',
          wet: 'true',
        },
      },
      {
        name: 'LEVELMAT_lava',
        extras: {
          surfaceType: 'lava',
          damagePerSecond: '18',
        },
      },
    ],
  }), 'dungeon');

  assert.deepEqual(level.materials.map((material) => ({
    name: material.name,
    textureId: material.textureId,
    surfaceType: material.surfaceType,
    footstepSoundId: material.footstepSoundId,
    splashSoundId: material.splashSoundId,
    damagePerSecond: material.damagePerSecond,
    friction: material.friction,
    wet: material.wet,
  })), [
    {
      name: 'SURFACE_METAL_grate',
      textureId: 'metal_grate',
      surfaceType: 'metal',
      footstepSoundId: 'boot-metal',
      splashSoundId: undefined,
      damagePerSecond: undefined,
      friction: 0.85,
      wet: undefined,
    },
    {
      name: 'LEVELMAT_water',
      textureId: 'water',
      surfaceType: 'water',
      footstepSoundId: undefined,
      splashSoundId: 'water-splash',
      damagePerSecond: undefined,
      friction: undefined,
      wet: true,
    },
    {
      name: 'LEVELMAT_lava',
      textureId: 'lava',
      surfaceType: 'lava',
      footstepSoundId: undefined,
      splashSoundId: undefined,
      damagePerSecond: 18,
      friction: undefined,
      wet: undefined,
    },
  ]);
});

test('enemy spawn markers preserve typed entity metadata', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const level = readLevel(definition.id);
    const types = level.enemySpawns.map((spawn) => spawn.enemyType);

    assert.equal(types.filter((type) => type === 'one-eye-alien').length, 1, definition.id);
    if (createSceneWorld(definition.id).ceiling) {
      assert.equal(types.filter((type) => type === 'molten-sentinel').length, 0, definition.id);
    } else {
      assert.equal(types.filter((type) => type === 'molten-sentinel').length, 1, definition.id);
    }
    assert.ok(level.enemySpawns.every((spawn) => spawn.role === 'enemy'), definition.id);
    assert.ok(level.enemySpawns.every((spawn) => spawn.radius > 0), definition.id);
  }
});

test('neon backstreets GLB exports jumpable Rogue route spans', () => {
  const level = readLevel('neon-backstreets');
  const walkableNames = level.walkableSurfaces.map((surface) => surface.name);

  assert.ok(walkableNames.some((name) => name.includes('floating_platform_near_span')));
  assert.ok(walkableNames.some((name) => name.includes('floating_platform_mid_span')));
});

test('derelict starship GLB exports varied metal ceiling detail instead of repeated warning strips', () => {
  const level = readLevel('derelict-starship');
  const textureIds = level.materials.map((material) => material.textureId);
  const warningMaterial = level.materials.findIndex((material) => material.textureId === 'warning');
  const warningMeshes = warningMaterial < 0
    ? []
    : level.artMeshes.filter((mesh) => mesh.material === warningMaterial);
  const ceilingMeshes = level.artMeshes.filter((mesh) => /ceiling|overhead/.test(mesh.name));
  const ceilingTops = new Set(ceilingMeshes.map((mesh) => Math.max(...mesh.vertices.map((vertex) => vertex.y)).toFixed(2)));

  assert.ok(textureIds.includes('shipCeiling'));
  assert.ok(textureIds.includes('darkMetal'));
  assert.ok(textureIds.includes('hullPanel'));
  assert.ok(textureIds.includes('reactorGlow'));
  assert.ok(warningMeshes.length <= 1);
  assert.ok(ceilingMeshes.length >= 10);
  assert.ok(ceilingTops.size >= 5);
});

test('rotwood forest GLB exports whole-tree meshes, moonbeams, and denser leaf particles', () => {
  const level = readLevel('rotwood-forest');
  const wholeTreeMeshes = level.artMeshes.filter((mesh) => mesh.name.includes('whole_black_pine_tree'));
  const leafMeshes = level.artMeshes.filter((mesh) => mesh.textureId === 'fallingLeaf');
  const moonbeamMeshes = level.artMeshes.filter((mesh) => mesh.textureId === 'moonbeam');

  assert.ok(wholeTreeMeshes.length >= 36);
  assert.equal(level.artMeshes.filter((mesh) => mesh.name.includes('black_tree_trunk')).length, 0);
  assert.ok(leafMeshes.length >= 80);
  assert.ok(moonbeamMeshes.length >= 5);
});

test('art mesh metadata preserves texture ids and animation motion', () => {
  const dungeon = readLevel('dungeon');
  const rotwood = readLevel('rotwood-forest');
  const motel = readLevel('motel-mirage');

  assert.ok(dungeon.artMeshes.some((mesh) => mesh.textureId === 'torchFlame' && mesh.motion === 'torch-flame'));
  assert.ok(dungeon.artMeshes.some((mesh) => (
    mesh.collectibleId === 'dungeon-golden-goblet'
    && mesh.textureId === 'meshyGoldGoblet'
    && mesh.motion === 'pickup-bob'
    && mesh.vertexCount / 3 <= 850
  )));
  assert.ok(rotwood.artMeshes.some((mesh) => mesh.textureId === 'fallingLeaf' && mesh.motion === 'falling-leaf'));
  assert.ok(motel.artMeshes.some((mesh) => mesh.textureId === 'motelWindow' && mesh.motion === 'window-pulse'));
});

test('dungeon goblet collectible is visible and centered in open floor space', () => {
  const dungeon = readLevel('dungeon');
  const goblet = dungeon.collectibles.find((item) => item.collectibleId === 'dungeon-golden-goblet');
  const gobletMesh = dungeon.artMeshes.find((mesh) => mesh.collectibleId === 'dungeon-golden-goblet');
  const bounds = meshBounds(gobletMesh);

  assert.ok(goblet, 'dungeon exports the golden goblet pickup marker');
  assert.ok(gobletMesh, 'dungeon exports the golden goblet render mesh');
  assert.ok(clearanceFromColliders(goblet, dungeon.collision) > 2.5);
  assert.ok(bounds.minY >= 0);
  assert.ok(bounds.maxY - bounds.minY > 1.3);
  assert.ok(bounds.maxX - bounds.minX > 1.35);
  assert.equal(goblet.radius, 0.69);
  assert.equal(goblet.height, 1.44);
});

test('large exported level surfaces keep world-scale texture repeats', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const level = readLevel(definition.id);
    const largeMeshes = level.artMeshes.filter((mesh) => {
      const bounds = meshBounds(mesh);
      const spans = [
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY,
        bounds.maxZ - bounds.minZ,
      ].sort((a, b) => a - b);
      const horizontalSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
      return horizontalSpan >= 8 && spans[0] > 0.02 && spans[1] > 0.02;
    });

    assert.ok(largeMeshes.length > 0, `${definition.id} has large level surfaces`);
    for (const mesh of largeMeshes) {
      const bounds = meshBounds(mesh);
      const uv = uvBounds(mesh);
      const horizontalSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
      const uvSpan = Math.max(uv.maxU - uv.minU, uv.maxV - uv.minV);

      assert.ok(
        uvSpan >= horizontalSpan / 4,
        `${definition.id} ${mesh.name} UV span ${uvSpan} is too small for ${horizontalSpan} world units`,
      );
    }
  }
});

test('exported box UV density matches the pre-GLB procedural renderer', () => {
  const dungeon = readLevel('dungeon');

  assert.ok(
    Math.abs(medianUvWorldRatio(findArtMesh(dungeon, 'ART_dungeon_floor')) - 0.4) < 0.02,
    'floor UV density matches old floor uvScale 2.5',
  );
  assert.ok(
    Math.abs(medianUvWorldRatio(findArtMesh(dungeon, 'ART_dungeon_north_wall_a')) - 1) < 0.02,
    'wall UV density matches old wall uvScale 1.0',
  );
  assert.ok(
    Math.abs(medianUvWorldRatio(findArtMesh(dungeon, 'ART_dungeon_crate_8_8_8_5')) - 1) < 0.02,
    'crate UV density matches old crate uvScale 1.0',
  );
  assert.ok(
    Math.abs(medianUvWorldRatio(findArtMesh(dungeon, 'ART_dungeon_ceiling')) - 0.5) < 0.02,
    'ceiling UV density matches old ceiling uvScale 2.0',
  );
});

test('thin exported wall end caps keep the same UV density as broad faces', () => {
  const dungeon = readLevel('dungeon');
  const wall = findArtMesh(dungeon, 'ART_dungeon_north_wall_a');
  const ratios = uvWorldRatios(wall);

  assert.ok(ratios.length > 0, 'wall exposes measurable UV edges');
  assert.ok(
    ratios.every((ratio) => Math.abs(ratio - 1) < 0.02),
    `wall UV density includes stretched edges: ${ratios.map((ratio) => ratio.toFixed(3)).join(', ')}`,
  );
});

function hasMaterialMesh(level, materialName) {
  const materialIndex = level.materials.findIndex((material) => material.name === materialName);
  assert.notEqual(materialIndex, -1, `${level.id} has ${materialName}`);
  return level.artMeshes.some((mesh) => mesh.material === materialIndex);
}

function findArtMesh(level, name) {
  const mesh = level.artMeshes.find((item) => item.name === name);
  assert.ok(mesh, `${level.id} has ${name}`);
  return mesh;
}

function medianUvWorldRatio(mesh) {
  const ratios = uvWorldRatios(mesh);
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length / 2)];
}

function uvWorldRatios(mesh) {
  const ratios = [];
  for (let index = 0; index < mesh.vertices.length; index += 3) {
    const tri = mesh.vertices.slice(index, index + 3);
    for (const [a, b] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]]) {
      const worldDistance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      const uvDistance = Math.hypot(a.u - b.u, a.v - b.v);
      if (worldDistance > 0.2 && uvDistance > 0.01) {
        ratios.push(uvDistance / worldDistance);
      }
    }
  }
  return ratios;
}

test('sprite textures preserve alpha masks for stars and suns', () => {
  const level = readLevel('alien-landscape');
  const sun = decodePngTexture(findMaterial(level, 'LEVELMAT_sun'));
  const star = decodePngTexture(findMaterial(level, 'LEVELMAT_star'));
  const shootingStar = decodePngTexture(findMaterial(level, 'LEVELMAT_shootingStar'));

  assert.equal(alphaAt(sun, 0, 0), 0, 'sun corner is transparent');
  assert.ok(alphaAt(sun, 32, 32) > 220, 'sun center is opaque');
  assert.equal(alphaAt(star, 0, 0), 0, 'star corner is transparent');
  assert.ok(alphaAt(star, 32, 32) > 220, 'star center is opaque');
  assert.equal(alphaAt(shootingStar, 0, 0), 0, 'shooting star corner is transparent');
  assert.ok(alphaAt(shootingStar, 50, 32) > 180, 'shooting star head is visible');
});

function findMaterial(level, name) {
  const material = level.materials.find((item) => item.name === name);
  assert.ok(material?.texture?.bytes, `${name} has embedded texture bytes`);
  return material;
}

function decodePngTexture(material) {
  const bytes = material.texture.bytes;
  assert.equal(material.texture.mimeType, 'image/png');
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes[1], 0x50);

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (offset < bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'IHDR') {
      width = readUint32(bytes, dataStart);
      height = readUint32(bytes, dataStart + 4);
      colorType = bytes[dataStart + 9];
    } else if (type === 'IDAT') {
      idat.push(...bytes.slice(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  assert.equal(colorType, 6, `${material.name} uses RGBA PNG data`);
  const inflated = inflateSync(Buffer.from(idat));
  const stride = width * 4;
  const pixels = new Uint8Array(width * height * 4);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[sourceOffset + x];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      pixels[y * stride + x] = unfilterByte(filter, raw, left, up, upLeft);
    }
    sourceOffset += stride;
  }

  return { width, height, pixels };
}

function unfilterByte(filter, raw, left, up, upLeft) {
  if (filter === 0) return raw;
  if (filter === 1) return (raw + left) & 0xff;
  if (filter === 2) return (raw + up) & 0xff;
  if (filter === 3) return (raw + Math.floor((left + up) / 2)) & 0xff;
  if (filter === 4) return (raw + paeth(left, up, upLeft)) & 0xff;
  throw new Error(`Unsupported PNG filter: ${filter}`);
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function alphaAt(image, x, y) {
  return image.pixels[(y * image.width + x) * 4 + 3];
}

function readUint32(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function meshBounds(mesh) {
  return mesh.vertices.reduce((bounds, vertex) => ({
    minX: Math.min(bounds.minX, vertex.x),
    maxX: Math.max(bounds.maxX, vertex.x),
    minY: Math.min(bounds.minY, vertex.y),
    maxY: Math.max(bounds.maxY, vertex.y),
    minZ: Math.min(bounds.minZ, vertex.z),
    maxZ: Math.max(bounds.maxZ, vertex.z),
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  });
}

function uvBounds(mesh) {
  return mesh.vertices.reduce((bounds, vertex) => ({
    minU: Math.min(bounds.minU, vertex.u),
    maxU: Math.max(bounds.maxU, vertex.u),
    minV: Math.min(bounds.minV, vertex.v),
    maxV: Math.max(bounds.maxV, vertex.v),
  }), {
    minU: Infinity,
    maxU: -Infinity,
    minV: Infinity,
    maxV: -Infinity,
  });
}

function clearanceFromColliders(point, colliders) {
  return colliders.reduce((min, collider) => {
    const dx = Math.max(collider.minX - point.x, 0, point.x - collider.maxX);
    const dz = Math.max(collider.minZ - point.z, 0, point.z - collider.maxZ);
    return Math.min(min, Math.hypot(dx, dz));
  }, Infinity);
}

function round(value) {
  return Math.round(value * 10) / 10;
}
