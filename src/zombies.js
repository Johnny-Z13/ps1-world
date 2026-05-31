import {
  PLAYER_EYE_HEIGHT,
  getGroundYAt,
  resolveMovement,
} from './playerPhysics.js';

const ZOMBIE_SPEED = 1.15;
const ZOMBIE_RADIUS = 0.38;
const PLAYER_RADIUS = 0.36;
const TOUCH_VERTICAL_TOLERANCE = 1.05;

export function createZombieEnemies(world) {
  return (world.zombieSpawns ?? []).map((spawn, index) => ({
    id: `${world.id}-zombie-${index + 1}`,
    x: spawn.x,
    y: spawn.y ?? world.playerSpawn.y,
    z: spawn.z,
    yaw: spawn.yaw ?? 0,
    radius: spawn.radius ?? ZOMBIE_RADIUS,
    speed: spawn.speed ?? ZOMBIE_SPEED,
    state: 'chasing',
  }));
}

export function updateZombieEnemies(zombies, player, options) {
  return zombies.map((zombie) => updateZombieEnemy(zombie, player, options));
}

export function isPlayerTouchedByZombie(player, zombies) {
  return zombies.some((zombie) => {
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

function updateZombieEnemy(zombie, player, options) {
  const dx = player.x - zombie.x;
  const dz = player.z - zombie.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return zombie;

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
    player,
    PLAYER_RADIUS,
  );
  const groundY = getGroundYAt(separated, options.walkableSurfaces) ?? zombie.y;

  return {
    ...zombie,
    x: separated.x,
    y: groundY,
    z: separated.z,
    yaw: Math.atan2(dx, dz),
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
