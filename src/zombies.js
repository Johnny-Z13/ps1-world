import {
  PLAYER_EYE_HEIGHT,
  getGroundYAt,
  resolveMovement,
} from './playerPhysics.js';
import {
  ENEMY_FACTIONS,
  applyEnemyDifficulty,
  createEnemyTargeting,
  createLevelEncounterConfig,
  getEnemyDefinition,
} from './enemyCatalog.js';

const ZOMBIE_SPEED = 1.15;
const ZOMBIE_RADIUS = 0.38;
const PLAYER_RADIUS = 0.36;
const TOUCH_VERTICAL_TOLERANCE = 1.05;
const ENEMY_DEATH_VISIBLE_MS = 1600;

export function createZombieEnemies(world) {
  const encounter = createLevelEncounterConfig(world);
  const zombies = (world.zombieSpawns ?? []).map((spawn, index) => createEnemyFromSpawn({
    world,
    spawn,
    index,
    enemyType: 'zombie',
    encounter,
  }));
  const specialEnemies = (world.enemySpawns ?? []).map((spawn, index) => createEnemyFromSpawn({
    world,
    spawn,
    index: index + zombies.length,
    enemyType: spawn.enemyType ?? 'zombie',
    encounter,
  }));
  return separateEnemyCapsules([...zombies, ...specialEnemies]);
}

export function createHordeState(world = null) {
  const horde = world?.enemyEncounter?.horde;
  const pulseIntervalMs = horde?.pulseIntervalMs ?? 7000;
  return {
    spawned: 0,
    spawnCursor: 0,
    nextPulseAt: pulseIntervalMs,
  };
}

export function updateHordeSpawns(enemies, world, player, state, options = {}) {
  const horde = world.enemyEncounter?.horde;
  if (!horde?.enabled) return { enemies, state };

  const now = options.now ?? 0;
  const pulseIntervalMs = horde.pulseIntervalMs ?? 7000;
  const nextPulseAt = state.nextPulseAt ?? pulseIntervalMs;
  if (now < nextPulseAt) return { enemies, state };

  const liveEnemies = enemies.filter(isLiveEnemy);
  if (liveEnemies.length >= (horde.maxAlive ?? liveEnemies.length)) {
    return {
      enemies,
      state: { ...state, nextPulseAt: now + pulseIntervalMs },
    };
  }

  const spawn = selectHordeSpawn(world, player, enemies, state.spawnCursor ?? 0, horde);
  if (!spawn) {
    return {
      enemies,
      state: { ...state, nextPulseAt: now + pulseIntervalMs },
    };
  }

  const hordeEnemy = createHordeEnemy(world, spawn, state.spawned ?? 0);
  return {
    enemies: separateEnemyCapsules([...enemies, hordeEnemy]),
    state: {
      spawned: (state.spawned ?? 0) + 1,
      spawnCursor: ((state.spawnCursor ?? 0) + 1) % Math.max(1, (world.zombieSpawns ?? []).length),
      nextPulseAt: now + pulseIntervalMs,
    },
  };
}

export function updateZombieEnemies(zombies, player, options) {
  const currentEnemies = removeExpiredDyingEnemies(zombies, options.now ?? 0);
  const moved = currentEnemies.map((zombie) => updateZombieEnemy(zombie, player, currentEnemies, options));
  return applyEnemyInfightingDamage(separateEnemyCapsules(moved), player, options);
}

export function isPlayerTouchedByZombie(player, zombies) {
  return Boolean(getTouchingEnemy(player, zombies));
}

export function getTouchingEnemy(player, zombies) {
  return zombies.filter(isLiveEnemy).find((zombie) => {
    const horizontalDistance = Math.hypot(player.x - zombie.x, player.z - zombie.z);
    const verticalDistance = Math.abs(player.y - zombie.y);
    return horizontalDistance <= PLAYER_RADIUS + zombie.radius && verticalDistance <= TOUCH_VERTICAL_TOLERANCE;
  });
}

export function resolvePlayerZombieCollision(player, zombies, playerRadius = PLAYER_RADIUS) {
  return zombies.filter(isLiveEnemy).reduce((position, zombie) => (
    resolveCapsuleAgainstBody(position, playerRadius, zombie, zombie.radius)
  ), player);
}

export function selectEnemyTarget(enemy, player, enemies = []) {
  const definition = getEnemyDefinition(enemy.enemyType);
  const targeting = enemy.targeting ?? definition.targeting;
  const playerTarget = { ...player, id: 'player', faction: ENEMY_FACTIONS.player, radius: PLAYER_RADIUS };
  const candidates = [
    playerTarget,
    ...enemies.filter((candidate) => candidate.id !== enemy.id && isLiveEnemy(candidate)),
  ];
  const hostileCandidates = candidates.filter((candidate) => (
    targeting.hostileFactions.includes(candidate.faction ?? ENEMY_FACTIONS.player)
  ));
  const playerIsHostile = hostileCandidates.some((candidate) => candidate.id === playerTarget.id);

  const playerDistance = distance2D(enemy, playerTarget);
  const nearbyEnemyTarget = hostileCandidates
    .filter((candidate) => candidate.faction !== ENEMY_FACTIONS.player)
    .filter((candidate) => distance2D(enemy, candidate) <= targeting.secondaryTargetRange)
    .sort((a, b) => distance2D(enemy, a) - distance2D(enemy, b))[0];

  if (playerIsHostile && (playerDistance <= definition.base.attackRange || !nearbyEnemyTarget)) return playerTarget;
  if (!nearbyEnemyTarget) return playerTarget;
  return nearbyEnemyTarget;
}

function createEnemyFromSpawn({ world, spawn, index, enemyType, encounter }) {
  const definition = getEnemyDefinition(enemyType);
  const stats = applyEnemyDifficulty(enemyType, encounter.difficulty);
  return {
    id: `${world.id}-${definition.id}-${index + 1}`,
    enemyType: definition.id,
    faction: definition.faction,
    role: spawn.role ?? 'enemy',
    x: spawn.x,
    y: spawn.y ?? world.playerSpawn.y,
    z: spawn.z,
    yaw: spawn.yaw ?? 0,
    radius: spawn.radius ?? stats.radius ?? ZOMBIE_RADIUS,
    speed: spawn.speed ?? stats.speed ?? ZOMBIE_SPEED,
    health: spawn.health ?? stats.health,
    state: 'chase',
    damage: spawn.damage ?? stats.attackDamage,
    attackRange: spawn.attackRange ?? stats.attackRange,
    attackCooldownMs: spawn.attackCooldownMs ?? stats.attackCooldownMs,
    targeting: createEnemyTargeting(enemyType, encounter.ecology),
    mesh: spawn.mesh,
    animationSeed: stableEnemySeed(world.id, index),
  };
}

function updateZombieEnemy(zombie, player, enemies, options) {
  if (!isLiveEnemy(zombie)) return zombie;

  const target = selectEnemyTarget(zombie, player, enemies);
  const targetPoint = getEnemyTargetPoint(zombie, target);
  const dx = targetPoint.x - zombie.x;
  const dz = targetPoint.z - zombie.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return { ...zombie, state: 'attack', targetId: target.id };

  const step = Math.min(distance, zombie.speed * options.dt);
  const desired = {
    x: zombie.x + dx / distance * step,
    z: zombie.z + dz / distance * step,
  };
  const moved = resolveMovement(
    { x: zombie.x, y: zombie.y, z: zombie.z },
    desired,
    options.colliders,
    zombie.radius,
  );
  const separated = resolveCapsuleAgainstBody(
    { x: moved.x, y: zombie.y, z: moved.z },
    zombie.radius,
    target,
    target.radius ?? PLAYER_RADIUS,
  );
  const groundY = getGroundYAt(separated, options.walkableSurfaces) ?? zombie.y;

  return {
    ...zombie,
    x: separated.x,
    y: groundY,
    z: separated.z,
    yaw: Math.atan2(dx, dz),
    state: distance <= (zombie.attackRange ?? ZOMBIE_RADIUS + PLAYER_RADIUS) ? 'attack' : 'chase',
    targetId: target.id,
    targetOffsetX: targetPoint.offsetX,
    targetOffsetZ: targetPoint.offsetZ,
  };
}

function getEnemyTargetPoint(enemy, target) {
  if (enemy.role !== 'horde' || target.faction !== ENEMY_FACTIONS.player) {
    return { x: target.x, z: target.z, offsetX: 0, offsetZ: 0 };
  }

  const dx = target.x - enemy.x;
  const dz = target.z - enemy.z;
  const distance = Math.hypot(dx, dz) || 1;
  const laneOffset = enemy.hordeLaneOffset ?? 0;
  const offsetX = -dz / distance * laneOffset;
  const offsetZ = dx / distance * laneOffset;
  return {
    x: target.x + offsetX,
    z: target.z + offsetZ,
    offsetX: roundEnemyValue(offsetX),
    offsetZ: roundEnemyValue(offsetZ),
  };
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function applyEnemyInfightingDamage(enemies, player, options) {
  const now = options.now ?? 0;
  const next = enemies.map((enemy) => ({ ...enemy }));

  for (const attacker of next) {
    if (!isLiveEnemy(attacker)) continue;
    const target = selectEnemyTarget(attacker, player, next);
    if (target.faction === ENEMY_FACTIONS.player) continue;
    if (distance2D(attacker, target) > (attacker.attackRange ?? 0)) continue;
    if (now - (attacker.lastAttackAt ?? -Infinity) < (attacker.attackCooldownMs ?? 1000)) continue;

    const targetIndex = next.findIndex((enemy) => enemy.id === target.id);
    if (targetIndex === -1) continue;

    attacker.state = 'attack';
    attacker.targetId = target.id;
    attacker.lastAttackAt = now;
    const health = (next[targetIndex].health ?? 1) - (attacker.damage ?? 0);
    next[targetIndex] = {
      ...next[targetIndex],
      health,
      state: health <= 0 ? 'dying' : next[targetIndex].state,
      diedAt: health <= 0 ? now : next[targetIndex].diedAt,
      killedById: health <= 0 ? attacker.id : next[targetIndex].killedById,
      lastHitAt: now,
      hitById: attacker.id,
      hitByEnemyType: attacker.enemyType,
    };
  }

  return next;
}

function createHordeEnemy(world, spawn, index) {
  const encounter = createLevelEncounterConfig(world);
  const stats = applyEnemyDifficulty('zombie', encounter.difficulty);
  const animationSeed = stableEnemySeed(world.id, `horde:${index}`);
  return {
    id: `${world.id}-horde-zombie-${index + 1}`,
    enemyType: 'zombie',
    faction: ENEMY_FACTIONS.undead,
    role: 'horde',
    x: spawn.x,
    y: spawn.y ?? world.playerSpawn.y,
    z: spawn.z,
    yaw: spawn.yaw ?? 0,
    radius: spawn.radius ?? stats.radius ?? ZOMBIE_RADIUS,
    speed: spawn.speed ?? stats.speed ?? ZOMBIE_SPEED,
    health: spawn.health ?? stats.health,
    state: 'chase',
    damage: spawn.damage ?? stats.attackDamage,
    attackRange: spawn.attackRange ?? stats.attackRange,
    attackCooldownMs: spawn.attackCooldownMs ?? stats.attackCooldownMs,
    targeting: createEnemyTargeting('zombie', encounter.ecology),
    animationSeed,
    hordeLaneOffset: roundEnemyValue((animationSeed * 2 - 1) * 1.45),
  };
}

function selectHordeSpawn(world, player, enemies, startIndex, horde) {
  const spawns = world.zombieSpawns ?? [];
  if (!spawns.length) return null;

  for (let offset = 0; offset < spawns.length; offset += 1) {
    const spawn = spawns[(startIndex + offset) % spawns.length];
    if (distance2D(spawn, player) < (horde.minPlayerDistance ?? 7)) continue;
    if (enemies.some((enemy) => isLiveEnemy(enemy) && distance2D(spawn, enemy) < (enemy.radius ?? ZOMBIE_RADIUS) + ZOMBIE_RADIUS)) continue;
    return spawn;
  }

  return null;
}

function separateEnemyCapsules(enemies) {
  const separated = enemies.map((enemy) => ({ ...enemy }));
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < separated.length; i += 1) {
      for (let j = i + 1; j < separated.length; j += 1) {
        separateEnemyPair(separated[i], separated[j]);
      }
    }
  }
  return separated;
}

function separateEnemyPair(a, b) {
  if (!isLiveEnemy(a) || !isLiveEnemy(b)) return;
  if (!capsulesOverlapVertically(a, b)) return;

  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const distance = Math.hypot(dx, dz);
  const minimumDistance = a.radius + b.radius;
  if (distance >= minimumDistance) return;

  const directionX = distance > 0.001 ? dx / distance : stablePairDirection(a, b).x;
  const directionZ = distance > 0.001 ? dz / distance : stablePairDirection(a, b).z;
  const push = (minimumDistance - distance) / 2 + 0.001;
  a.x -= directionX * push;
  a.z -= directionZ * push;
  b.x += directionX * push;
  b.z += directionZ * push;
}

function stablePairDirection(a, b) {
  const angle = stableEnemySeed(a.id ?? 'a', b.id ?? 'b') * Math.PI * 2;
  return {
    x: Math.cos(angle),
    z: Math.sin(angle),
  };
}

function resolveCapsuleAgainstBody(position, positionRadius, body, bodyRadius) {
  if (!capsulesOverlapVertically(position, body)) return position;

  const dx = position.x - body.x;
  const dz = position.z - body.z;
  const distance = Math.hypot(dx, dz);
  const minimumDistance = positionRadius + bodyRadius;
  if (distance >= minimumDistance) return position;

  const directionX = distance > 0.001 ? dx / distance : 0;
  const directionZ = distance > 0.001 ? dz / distance : 1;
  return {
    ...position,
    x: body.x + directionX * minimumDistance,
    z: body.z + directionZ * minimumDistance,
  };
}

function capsulesOverlapVertically(a, b) {
  const aFeet = a.y - PLAYER_EYE_HEIGHT;
  const bFeet = b.y - PLAYER_EYE_HEIGHT;
  const aHead = aFeet + PLAYER_EYE_HEIGHT;
  const bHead = bFeet + PLAYER_EYE_HEIGHT;
  return aFeet <= bHead && bFeet <= aHead;
}

function stableEnemySeed(sceneId, index) {
  let hash = 2166136261;
  for (const character of `${sceneId}:${index}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function roundEnemyValue(value) {
  return Math.round(value * 1000) / 1000;
}

function removeExpiredDyingEnemies(enemies, now) {
  return enemies.filter((enemy) => (
    enemy.state !== 'dying'
    || now - (enemy.diedAt ?? now) <= ENEMY_DEATH_VISIBLE_MS
  ));
}

function isLiveEnemy(enemy) {
  return enemy.state !== 'dying' && enemy.state !== 'dead';
}
