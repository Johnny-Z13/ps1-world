import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSceneRuntimeWorld,
  createWorldFromLevelAsset,
  getSceneColliders,
  getSceneWalkableSurfaces,
} from '../src/sceneRuntime.js';
import { PLAYER_EYE_HEIGHT } from '../src/playerPhysics.js';

const fallbackScene = {
  id: 'test-scene',
  playerSpawn: { x: 0, y: 0, z: 0, yaw: 0 },
  zombieSpawns: [{ x: -4, y: 0, z: 0 }],
  enemySpawns: [
    { x: 2, y: 0, z: 0, enemyType: 'one-eye-alien' },
    { x: 4, y: 0, z: 0, enemyType: 'molten-sentinel', minimumHeadClearance: 2 },
  ],
  healthPotions: [{ x: 1, y: 0.2, z: 1, radius: 0.3 }],
  damageZones: [{ id: 'fallback-lava' }],
  hordeTriggers: [],
  encounterTriggers: [],
  soundZones: [{ id: 'fallback-hum', soundZoneType: 'ambience' }],
  objectives: [],
  emitters: [{ id: 'fallback-drip', emitterType: 'water_drip' }],
  lights: [{ x: 0, y: 3, z: 0, color: [1, 1, 1] }],
  torchLights: [{ x: 1, y: 2, z: 1 }],
  killY: -8,
  textures: [{ id: 'floor', size: 128 }],
  walls: [{ collider: { minX: -5, maxX: -4, minY: 0, maxY: 2, minZ: -1, maxZ: 1 } }],
  crates: [{ collider: { minX: 3, maxX: 4, minY: 0, maxY: 1, minZ: -1, maxZ: 1 } }],
  platforms: [{ x: 0, y: 1, z: 0, width: 2, height: 0.4, depth: 2, collider: { minX: -1, maxX: 1, minY: 1, maxY: 1.4, minZ: -1, maxZ: 1 } }],
  floor: { x: 0, y: -0.2, z: 0, width: 10, height: 0.2, depth: 10 },
  ceiling: true,
};

const levelAsset = {
  id: 'test-scene',
  collision: [{ minX: -1, maxX: 1, minY: 0, maxY: 2, minZ: -1, maxZ: 1 }],
  walkableSurfaces: [{ minX: -5, maxX: 5, minZ: -5, maxZ: 5, topY: 0 }],
  zombieSpawns: [{ x: 3, y: 3, z: 3 }],
  enemySpawns: [
    { x: -2, y: 1, z: 1, enemyType: 'one-eye-alien' },
    { x: -3, y: 1, z: 1, enemyType: 'molten-sentinel', minimumHeadClearance: 5 },
  ],
  healthPotions: [{ x: 2, y: 0.5, z: 2 }],
  damageZones: [{ id: 'level-lava' }],
  hordeTriggers: [{ id: 'level-horde', triggerType: 'awaken-horde' }],
  encounterTriggers: [{ id: 'closet-a', encounterType: 'monster_closet' }],
  soundZones: [{ id: 'level-radio', soundZoneType: 'radio_bleed' }],
  objectives: [{ objectiveId: 'beacon-a', objectiveType: 'tune_beacon' }],
  emitters: [{ id: 'level-spark', emitterType: 'radio_spark' }],
  lights: [{ x: 2, y: 4, z: 2, color: [1, 0, 0] }],
  torchLights: [{ x: 3, y: 2, z: 3 }],
  playerSpawn: { x: 5, y: 0, z: 5, yaw: 1 },
  killY: -12,
  materials: [
    { textureId: 'floor', baseColor: [1, 1, 1, 1] },
    { textureId: 'level-wall', baseColor: [0.5, 0.5, 0.5, 1] },
  ],
};

test('assembles Blender level assets into runtime scene metadata', () => {
  const world = createWorldFromLevelAsset(fallbackScene, levelAsset);

  assert.equal(world.levelAsset, levelAsset);
  assert.deepEqual(world.playerSpawn, levelAsset.playerSpawn);
  assert.deepEqual(world.damageZones, levelAsset.damageZones);
  assert.deepEqual(world.hordeTriggers, levelAsset.hordeTriggers);
  assert.deepEqual(world.encounterTriggers, levelAsset.encounterTriggers);
  assert.deepEqual(world.soundZones, levelAsset.soundZones);
  assert.deepEqual(world.objectives, levelAsset.objectives);
  assert.deepEqual(world.emitters, levelAsset.emitters);
  assert.deepEqual(world.lights, levelAsset.lights);
  assert.deepEqual(world.torchLights, levelAsset.torchLights);
  assert.equal(world.killY, -12);
  assert.equal(world.zombieSpawns[0].y, PLAYER_EYE_HEIGHT);
  assert.equal(world.enemySpawns.length, 2);
  assert.equal(world.healthPotions[0].radius, 0.3);
  assert.equal(world.healthPotions[0].x, 2);
  assert.deepEqual(world.textures.map((texture) => texture.id), ['floor', 'level-wall']);
});

test('falls back to procedural scene data when GLB loading is unavailable or fails', async () => {
  const warnings = [];
  const noGlb = await createSceneRuntimeWorld('test-scene', {
    createFallback: () => fallbackScene,
    levelUrls: {},
  });
  assert.equal(noGlb, fallbackScene);

  const failed = await createSceneRuntimeWorld('test-scene', {
    createFallback: () => fallbackScene,
    levelUrls: { 'test-scene': 'test-scene.glb' },
    loadLevel: async () => {
      throw new Error('missing');
    },
    warn: (...args) => warnings.push(args),
  });

  assert.equal(failed, fallbackScene);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0][0], /Falling back to procedural scene test-scene/);
});

test('keeps scene collider and walkable conversion independent from app runtime state', () => {
  const world = createWorldFromLevelAsset(fallbackScene, levelAsset);

  assert.deepEqual(getSceneColliders(world), levelAsset.collision);
  assert.deepEqual(getSceneWalkableSurfaces(world), levelAsset.walkableSurfaces);
  assert.equal(getSceneColliders(fallbackScene).length, 3);
  assert.equal(getSceneWalkableSurfaces(fallbackScene).length, 4);
});
