import { normalizeEnemySpawns } from './enemySpawnValidation.js';
import { LEVEL_GLB_URLS, loadLevelGlb } from './levelGlb.js';
import { createSceneWorld } from './world.js';

const loadedLevels = new Map();

export async function createSceneRuntimeWorld(id, options = {}) {
  const {
    createFallback = createSceneWorld,
    levelUrls = LEVEL_GLB_URLS,
    loadLevel = getLoadedLevel,
    warn = console.warn,
  } = options;
  const fallback = createFallback(id);
  if (!levelUrls[fallback.id]) return fallback;

  try {
    const levelAsset = await loadLevel(fallback.id);
    return createWorldFromLevelAsset(fallback, levelAsset);
  } catch (error) {
    warn(`Falling back to procedural scene ${fallback.id}:`, error);
    return fallback;
  }
}

export async function getLoadedLevel(id) {
  if (!loadedLevels.has(id)) {
    loadedLevels.set(id, loadLevelGlb(id));
  }
  return loadedLevels.get(id);
}

export function createWorldFromLevelAsset(fallback, levelAsset) {
  const levelColliders = getLevelRuntimeColliders(levelAsset);
  const levelWalkableSurfaces = getLevelRuntimeWalkableSurfaces(levelAsset);
  const zombieSpawns = normalizeEnemySpawns(
    levelAsset.zombieSpawns.length ? levelAsset.zombieSpawns : fallback.zombieSpawns,
    { colliders: levelColliders, walkableSurfaces: levelWalkableSurfaces, defaultRadius: 0.38 },
  );
  const enemySpawns = normalizeEnemySpawns(
    getRuntimeEnemySpawns(fallback, levelAsset.enemySpawns),
    { colliders: levelColliders, walkableSurfaces: levelWalkableSurfaces, defaultRadius: 0.38 },
  );

  return {
    ...fallback,
    levelAsset,
    playerSpawn: levelAsset.playerSpawn ?? fallback.playerSpawn,
    zombieSpawns,
    enemySpawns,
    healthPotions: levelAsset.healthPotions.length
      ? mergeLevelHealthPotions(levelAsset.healthPotions, fallback.healthPotions)
      : fallback.healthPotions,
    damageZones: levelAsset.damageZones.length ? levelAsset.damageZones : fallback.damageZones ?? [],
    hordeTriggers: levelAsset.hordeTriggers.length ? levelAsset.hordeTriggers : fallback.hordeTriggers ?? [],
    encounterTriggers: levelAsset.encounterTriggers.length
      ? levelAsset.encounterTriggers
      : fallback.encounterTriggers ?? [],
    soundZones: levelAsset.soundZones.length ? levelAsset.soundZones : fallback.soundZones ?? [],
    objectives: levelAsset.objectives.length ? levelAsset.objectives : fallback.objectives ?? [],
    emitters: levelAsset.emitters.length ? levelAsset.emitters : fallback.emitters ?? [],
    lights: levelAsset.lights.length ? levelAsset.lights : fallback.lights,
    torchLights: levelAsset.torchLights.length ? levelAsset.torchLights : fallback.torchLights,
    killY: levelAsset.killY ?? fallback.killY,
    textures: createLevelTextureDescriptors(levelAsset, fallback),
  };
}

export function getLevelRuntimeColliders(levelAsset) {
  return levelAsset.collision.map((collider) => ({
    minX: collider.minX,
    maxX: collider.maxX,
    minY: collider.minY,
    maxY: collider.maxY,
    minZ: collider.minZ,
    maxZ: collider.maxZ,
  }));
}

export function getLevelRuntimeWalkableSurfaces(levelAsset) {
  return levelAsset.walkableSurfaces.map((surface) => ({
    minX: surface.minX,
    maxX: surface.maxX,
    minZ: surface.minZ,
    maxZ: surface.maxZ,
    topY: surface.topY,
  }));
}

export function getRuntimeEnemySpawns(fallback, levelEnemySpawns) {
  const enemySpawns = levelEnemySpawns.length ? levelEnemySpawns : fallback.enemySpawns;
  return enemySpawns.filter((spawn) => (
    spawn.enemyType !== 'molten-sentinel'
    || !fallback.ceiling
    || (spawn.minimumHeadClearance ?? 0) >= 4.8
  ));
}

export function mergeLevelHealthPotions(levelPotions, fallbackPotions) {
  return levelPotions.map((potion, index) => ({
    ...(fallbackPotions[index] ?? {}),
    ...potion,
  }));
}

export function createSceneHealthPotions(scene) {
  return (scene.healthPotions ?? []).map((potion) => ({ ...potion }));
}

export function createSceneDamageZones(scene) {
  return (scene.damageZones ?? []).map((zone) => ({ ...zone }));
}

export function getSceneColliders(scene) {
  if (scene.levelAsset) {
    return getLevelRuntimeColliders(scene.levelAsset);
  }

  return [...scene.walls, ...scene.crates, ...(scene.platforms ?? [])]
    .map((item) => item.collider)
    .filter(Boolean);
}

export function getSceneWalkableSurfaces(scene) {
  if (scene.levelAsset) {
    return getLevelRuntimeWalkableSurfaces(scene.levelAsset);
  }

  const floorPieces = scene.floorPieces ?? [scene.floor];
  return [...floorPieces, ...(scene.platforms ?? []), ...scene.walls, ...scene.crates]
    .filter(Boolean)
    .map((item) => ({
      minX: item.x - item.width / 2,
      maxX: item.x + item.width / 2,
      minZ: item.z - item.depth / 2,
      maxZ: item.z + item.depth / 2,
      topY: item.y + item.height,
    }));
}

export function createLevelTextureDescriptors(levelAsset, fallback) {
  const textureIds = new Set(fallback.textures.map((texture) => texture.id));
  const missingLevelTextures = levelAsset.materials
    .filter((material) => !textureIds.has(material.textureId))
    .map((material) => ({
      id: material.textureId,
      size: 128,
      material,
    }));

  return [...fallback.textures, ...missingLevelTextures];
}
