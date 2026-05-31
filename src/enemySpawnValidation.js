import { PLAYER_EYE_HEIGHT } from './playerPhysics.js';

const DEFAULT_ENEMY_RADIUS = 0.38;

export function normalizeEnemySpawns(spawns, options = {}) {
  const colliders = options.colliders ?? [];
  const walkableSurfaces = options.walkableSurfaces ?? [];
  const defaultRadius = options.defaultRadius ?? DEFAULT_ENEMY_RADIUS;

  return (spawns ?? []).map((spawn) => (
    findOpenEnemySpawn(spawn, colliders, walkableSurfaces, spawn.radius ?? defaultRadius)
  ));
}

export function isEnemySpawnBlocked(spawn, colliders, radius = spawn.radius ?? DEFAULT_ENEMY_RADIUS) {
  return colliders.some((collider) => (
    blocksAtEnemyHeight(collider, spawn.y)
    && spawn.x + radius > collider.minX
    && spawn.x - radius < collider.maxX
    && spawn.z + radius > collider.minZ
    && spawn.z - radius < collider.maxZ
  ));
}

function findOpenEnemySpawn(spawn, colliders, walkableSurfaces, radius) {
  const snapped = snapSpawnToWalkableSurface(spawn, walkableSurfaces);
  if (!isEnemySpawnBlocked(snapped, colliders, radius)) return snapped;

  const directions = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
    { x: 0.707, z: 0.707 },
    { x: -0.707, z: 0.707 },
    { x: 0.707, z: -0.707 },
    { x: -0.707, z: -0.707 },
  ];
  const distances = [
    radius + 0.2,
    radius * 2 + 0.35,
    radius * 3 + 0.6,
    radius * 5 + 0.9,
  ];

  for (const distance of distances) {
    for (const direction of directions) {
      const candidate = snapSpawnToWalkableSurface({
        ...spawn,
        x: spawn.x + direction.x * distance,
        z: spawn.z + direction.z * distance,
      }, walkableSurfaces);
      if (!isEnemySpawnBlocked(candidate, colliders, radius)) return candidate;
    }
  }

  return snapped;
}

function snapSpawnToWalkableSurface(spawn, walkableSurfaces) {
  const topY = getHighestWalkableTopY(spawn, walkableSurfaces);
  if (topY === null) return { ...spawn };
  return {
    ...spawn,
    y: topY + PLAYER_EYE_HEIGHT,
  };
}

function getHighestWalkableTopY(spawn, walkableSurfaces) {
  let topY = null;

  for (const surface of walkableSurfaces) {
    const withinX = spawn.x >= surface.minX && spawn.x <= surface.maxX;
    const withinZ = spawn.z >= surface.minZ && spawn.z <= surface.maxZ;
    if (!withinX || !withinZ) continue;
    if (topY === null || surface.topY > topY) topY = surface.topY;
  }

  return topY;
}

function blocksAtEnemyHeight(collider, enemyY) {
  if (!Number.isFinite(enemyY) || !Number.isFinite(collider.maxY)) return true;

  const feetY = enemyY - PLAYER_EYE_HEIGHT;
  return feetY < collider.maxY - 0.08;
}
