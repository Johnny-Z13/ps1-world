export const PLAYER_EYE_HEIGHT = 1.45;

export function createInputVector(input) {
  let x = 0;
  let z = 0;

  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (input.forward) z += 1;
  if (input.back) z -= 1;

  const rawLength = Math.hypot(x, z);
  if (rawLength > 0) {
    x /= rawLength;
    z /= rawLength;
  }

  return { x, z, length: Math.hypot(x, z) };
}

export function createMovementDelta(inputVector, yaw, speed, dt) {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  return {
    dx: (cos * inputVector.x + sin * inputVector.z) * speed * dt,
    dz: (cos * inputVector.z - sin * inputVector.x) * speed * dt,
  };
}

export function resolveMovement(start, desired, colliders, radius) {
  const xOnly = { x: desired.x, z: start.z };
  const afterX = isBlocked(xOnly, colliders, radius, start.y) ? start : xOnly;
  const zOnly = { x: afterX.x, z: desired.z };

  if (!isBlocked(zOnly, colliders, radius, start.y)) {
    return zOnly;
  }

  return {
    x: afterX.x,
    z: clampAgainstZ(afterX, desired.z, colliders, radius, start.y),
  };
}

export function applyMouseLook(look, delta, options = {}) {
  const yawSensitivity = options.yawSensitivity ?? 0.0024;
  const pitchSensitivity = options.pitchSensitivity ?? 0.0018;
  const pitchDirection = options.invertY ? 1 : -1;

  return {
    yaw: look.yaw + delta.movementX * yawSensitivity,
    pitch: clamp(look.pitch + delta.movementY * pitchSensitivity * pitchDirection, -0.92, 0.92),
  };
}

export function createMouseLookDelta(event, previousPosition = null) {
  const movementX = Number.isFinite(event.movementX) ? event.movementX : 0;
  const movementY = Number.isFinite(event.movementY) ? event.movementY : 0;
  const position = {
    x: Number.isFinite(event.clientX) ? event.clientX : previousPosition?.x ?? 0,
    y: Number.isFinite(event.clientY) ? event.clientY : previousPosition?.y ?? 0,
  };

  if (movementX !== 0 || movementY !== 0 || !previousPosition) {
    return { movementX, movementY, position };
  }

  return {
    movementX: position.x - previousPosition.x,
    movementY: position.y - previousPosition.y,
    position,
  };
}

export function applyJumpPhysics(state, options) {
  const gravity = options.gravity ?? 9.8;
  const jumpVelocity = options.jumpVelocity ?? 4.8;
  let y = state.y;
  let velocityY = state.velocityY;
  let grounded = state.grounded;

  if (options.jump && grounded) {
    velocityY = jumpVelocity;
    grounded = false;
  }

  if (!grounded) {
    velocityY -= gravity * options.dt;
    y += velocityY * options.dt;
  }

  if (y <= options.groundY) {
    return { y: options.groundY, velocityY: 0, grounded: true };
  }

  return { y, velocityY, grounded };
}

export function getGroundYAt(position, surfaces, eyeHeight = PLAYER_EYE_HEIGHT) {
  let topY = null;

  for (const surface of surfaces) {
    const withinX = position.x >= surface.minX && position.x <= surface.maxX;
    const withinZ = position.z >= surface.minZ && position.z <= surface.maxZ;
    if (!withinX || !withinZ) continue;
    if (topY === null || surface.topY > topY) topY = surface.topY;
  }

  return topY === null ? null : topY + eyeHeight;
}

export function isBelowKillPlane(state, killY) {
  return state.y < killY;
}

export function getVoidDeathY(killY) {
  return killY * 3;
}

function isBlocked(position, colliders, radius, playerY = null) {
  return colliders.some((collider) => (
    blocksAtPlayerHeight(collider, playerY)
    &&
    position.x + radius > collider.minX
    && position.x - radius < collider.maxX
    && position.z + radius > collider.minZ
    && position.z - radius < collider.maxZ
  ));
}

function blocksAtPlayerHeight(collider, playerY) {
  if (!Number.isFinite(playerY) || !Number.isFinite(collider.maxY)) return true;

  const feetY = playerY - PLAYER_EYE_HEIGHT;
  return feetY < collider.maxY - 0.08;
}

function clampAgainstZ(position, desiredZ, colliders, radius, playerY = null) {
  let nextZ = position.z;

  for (const collider of colliders) {
    if (!blocksAtPlayerHeight(collider, playerY)) continue;

    const overlapsX = position.x + radius > collider.minX && position.x - radius < collider.maxX;
    if (!overlapsX) continue;

    if (desiredZ > position.z && desiredZ + radius > collider.minZ && position.z <= collider.minZ) {
      nextZ = Math.min(nextZ || collider.minZ - radius - 0.001, collider.minZ - radius - 0.001);
    } else if (desiredZ < position.z && desiredZ - radius < collider.maxZ && position.z >= collider.maxZ) {
      nextZ = Math.max(nextZ, collider.maxZ + radius + 0.001);
    }
  }

  return nextZ;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
