import { getEnemyDefinition } from './enemyCatalog.js';
import { chooseEnemyAnimation } from './enemyAnimation.js';
import { getEnemyDeathRenderState } from './enemyDeathVisuals.js';
import { motionCode } from './generatedTextures.js';
import { PLAYER_EYE_HEIGHT } from './playerPhysics.js';
import { clamp } from './renderMath.js';
import { face } from './renderSceneMeshes.js';
import { createDynamicBuffer, updateBuffer } from './webglResources.js';
import { animateZombieModel } from './zombieModel.js';

export function createZombieMesh(glContext) {
  return {
    count: 0,
    position: createDynamicBuffer(glContext),
    uv: createDynamicBuffer(glContext),
    textureId: createDynamicBuffer(glContext),
    shade: createDynamicBuffer(glContext),
    motion: createDynamicBuffer(glContext),
    warping: createDynamicBuffer(glContext),
  };
}

export function updateZombieMesh(
  glContext,
  mesh,
  zombieList,
  indices,
  models = new Map(),
  time = 0,
  now = 0,
  bursts = [],
  fallbackModel = null,
) {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [], motions: [], warpings: [] };
  for (const zombie of zombieList) {
    const model = models.get(zombie.enemyType ?? 'zombie') ?? fallbackModel;
    const animationName = selectEnemyAnimation(zombie, model, time);
    const animatedVertices = model
      ? animateZombieModel(model, time + (zombie.animationSeed ?? 0) * 4, animationName)
      : null;
    if (animatedVertices) {
      addZombieModel(geometry, zombie, animatedVertices, indices, now);
    } else {
      addZombieCard(geometry, zombie, indices, now);
    }
  }
  for (const burst of bursts) {
    addBloodBurstCards(geometry, burst, indices, now);
  }

  mesh.count = geometry.positions.length / 3;
  updateBuffer(glContext, mesh.position, new Float32Array(geometry.positions));
  updateBuffer(glContext, mesh.uv, new Float32Array(geometry.uvs));
  updateBuffer(glContext, mesh.textureId, new Float32Array(geometry.textureIds));
  updateBuffer(glContext, mesh.shade, new Float32Array(geometry.shades));
  updateBuffer(glContext, mesh.motion, new Float32Array(geometry.motions));
  updateBuffer(glContext, mesh.warping, new Float32Array(geometry.warpings));
}

function selectEnemyAnimation(enemy, model, time) {
  return chooseEnemyAnimation(enemy, model, { time });
}

function addZombieModel(geometry, zombie, vertices, indices, now = 0) {
  const enemyType = zombie.enemyType ?? 'zombie';
  const textureId = indices.get(enemyType) ?? indices.get('zombie') ?? 0;
  const deathRender = getEnemyDeathRenderState(zombie, now);
  const motion = motionCode('zombie-walk') * deathRender.motionScale;
  const zombieMasterYaw = zombie.yaw;
  const enemyRender = getEnemyDefinition(enemyType).render;
  const zombieModelYaw = enemyRender.frontRotation;
  const feetY = zombie.y - PLAYER_EYE_HEIGHT + deathRender.yOffset;
  const scale = enemyRender.modelScale;

  for (const vertex of vertices) {
    const localX = vertex.x * scale * deathRender.horizontalScale;
    const localY = vertex.y * scale * deathRender.verticalScale;
    const localZ = vertex.z * scale * deathRender.horizontalScale;
    const modelSpace = rotateZombieLocalVertex(localX, localY, localZ, zombieModelYaw);
    const worldSpace = rotateZombieMasterVertex(modelSpace.x, modelSpace.y, modelSpace.z, zombieMasterYaw);
    geometry.positions.push(
      zombie.x + worldSpace.x,
      feetY + worldSpace.y,
      zombie.z + worldSpace.z,
    );
    geometry.uvs.push(vertex.u, vertex.v);
    geometry.textureIds.push(textureId);
    geometry.shades.push(deathRender.shade);
    geometry.motions.push(motion);
    geometry.warpings.push(1);
  }
}

function addBloodBurstCards(geometry, burst, indices, now) {
  const textureId = indices.get(burst.texture) ?? indices.get('zombie') ?? 0;
  const duration = burst.durationMs ?? 900;
  const progress = clamp((now - burst.startedAt) / duration, 0, 1);
  const shade = Math.max(0.15, 1.25 - progress * 0.9);

  for (const shard of burst.shards ?? []) {
    const drift = shard.distance * progress;
    const x = burst.x + Math.cos(shard.angle) * drift;
    const z = burst.z + Math.sin(shard.angle) * drift;
    const y = burst.y + shard.lift * progress - progress * progress * 0.55;
    const half = shard.size * (1 - progress * 0.35);
    face(geometry, textureId, shade, [
      [x - half, y - half, z], [x + half, y - half, z], [x + half, y + half, z], [x - half, y + half, z],
    ], 1, 1);
    face(geometry, textureId, shade * 0.88, [
      [x, y - half, z - half], [x, y - half, z + half], [x, y + half, z + half], [x, y + half, z - half],
    ], 1, 1);
  }
}

function rotateZombieLocalVertex(x, y, z, yaw) {
  return rotateZombieY(x, y, z, yaw);
}

function rotateZombieMasterVertex(x, y, z, yaw) {
  return rotateZombieY(x, y, z, yaw);
}

function rotateZombieY(x, y, z, yaw) {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return {
    x: x * cos + z * sin,
    y,
    z: z * cos - x * sin,
  };
}

function addZombieCard(geometry, zombie, indices, now = 0) {
  const textureId = indices.get(zombie.enemyType ?? 'zombie') ?? indices.get('zombie') ?? 0;
  const deathRender = getEnemyDeathRenderState(zombie, now);
  const motion = motionCode('zombie-walk') * deathRender.motionScale;
  const width = 0.95 * deathRender.horizontalScale;
  const height = 1.75 * deathRender.verticalScale;
  const halfWidth = width / 2;
  const feetY = zombie.y - PLAYER_EYE_HEIGHT + deathRender.yOffset;
  const minY = feetY;
  const maxY = feetY + height;

  face(geometry, textureId, deathRender.shade * 1.05, [
    [zombie.x - halfWidth, minY, zombie.z],
    [zombie.x + halfWidth, minY, zombie.z],
    [zombie.x + halfWidth, maxY, zombie.z],
    [zombie.x - halfWidth, maxY, zombie.z],
  ], 1, 1, motion);
  face(geometry, textureId, deathRender.shade * 0.92, [
    [zombie.x, minY, zombie.z - halfWidth],
    [zombie.x, minY, zombie.z + halfWidth],
    [zombie.x, maxY, zombie.z + halfWidth],
    [zombie.x, maxY, zombie.z - halfWidth],
  ], 1, 1, motion);
}
