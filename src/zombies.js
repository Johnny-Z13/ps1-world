import {
  PLAYER_EYE_HEIGHT,
  getGroundYAt,
  resolveMovement,
} from './playerPhysics.js';
import {
  ENEMY_FACTIONS,
  applyEnemyDifficulty,
  createLevelEncounterConfig,
  getEnemyDefinition,
} from './enemyCatalog.js';

const ZOMBIE_SPEED = 1.15;
const ZOMBIE_RADIUS = 0.38;
const PLAYER_RADIUS = 0.36;
const TOUCH_VERTICAL_TOLERANCE = 1.05;

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

export function updateZombieEnemies(zombies, player, options) {
  const moved = zombies.map((zombie) => updateZombieEnemy(zombie, player, zombies, options));
  return applyEnemyInfightingDamage(separateEnemyCapsules(moved), player, options);
}

export function isPlayerTouchedByZombie(player, zombies) {
  return Boolean(getTouchingEnemy(player, zombies));
}

export function getTouchingEnemy(player, zombies) {
  return zombies.find((zombie) => {
    const horizontalDistance = Math.hypot(player.x - zombie.x, player.z - zombie.z);
    const verticalDistance = Math.abs(player.y - zombie.y);
    return horizontalDistance <= PLAYER_RADIUS + zombie.radius && verticalDistance <= TOUCH_VERTICAL_TOLERANCE;
  });
}

export function resolvePlayerZombieCollision(player, zombies, playerRadius = PLAYER_RADIUS) {
  return zombies.reduce((position, zombie) => (
    resolveCapsuleAgainstBody(position, playerRadius, zombie, zombie.radius)
  ), player);
}

export function selectEnemyTarget(enemy, player, enemies = []) {
  const definition = getEnemyDefinition(enemy.enemyType);
  const playerTarget = { ...player, id: 'player', faction: ENEMY_FACTIONS.player, radius: PLAYER_RADIUS };
  const candidates = [
    playerTarget,
    ...enemies.filter((candidate) => candidate.id !== enemy.id && candidate.state !== 'dead'),
  ];
  const hostileCandidates = candidates.filter((candidate) => (
    definition.targeting.hostileFactions.includes(candidate.faction ?? ENEMY_FACTIONS.player)
  ));

  const playerDistance = distance2D(enemy, playerTarget);
  const nearbyEnemyTarget = hostileCandidates
    .filter((candidate) => candidate.faction !== ENEMY_FACTIONS.player)
    .filter((candidate) => distance2D(enemy, candidate) <= definition.targeting.secondaryTargetRange)
    .sort((a, b) => distance2D(enemy, a) - distance2D(enemy, b))[0];

  if (playerDistance <= definition.base.attackRange || !nearbyEnemyTarget) return playerTarget;
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
    mesh: spawn.mesh,
    animationSeed: stableEnemySeed(world.id, index),
  };
}

function updateZombieEnemy(zombie, player, enemies, options) {
  const target = selectEnemyTarget(zombie, player, enemies);
  const dx = target.x - zombie.x;
  const dz = target.z - zombie.z;
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
  };
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function applyEnemyInfightingDamage(enemies, player, options) {
  const now = options.now ?? 0;
  const next = enemies.map((enemy) => ({ ...enemy }));

  for (const attacker of next) {
    if (attacker.state === 'dead') continue;
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
      state: health <= 0 ? 'dead' : next[targetIndex].state,
    };
  }

  return next.filter((enemy) => enemy.state !== 'dead');
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
