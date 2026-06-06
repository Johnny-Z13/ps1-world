export const GAMEPAD_DEADZONE = 0.18;
export const TOUCH_JOYSTICK_MAX_DISTANCE = 48;
export const DEBUG_FREE_CAMERA_WALK_SPEED = 5.6;
export const DEBUG_FREE_CAMERA_SPRINT_SPEED = 13.5;

export function normalizeGamepadAxis(value, deadzone = GAMEPAD_DEADZONE) {
  if (Math.abs(value) < deadzone) return 0;

  const sign = Math.sign(value);
  return sign * Math.min(1, (Math.abs(value) - deadzone) / (1 - deadzone));
}

export function isGamepadButtonPressed(gamepad, index) {
  const button = gamepad.buttons[index];
  return Boolean(button?.pressed || button?.value > 0.5);
}

export function getPressedGamepadButtons(gamepad) {
  const pressedButtons = new Set();
  for (let index = 0; index < gamepad.buttons.length; index += 1) {
    if (isGamepadButtonPressed(gamepad, index)) pressedButtons.add(index);
  }
  return pressedButtons;
}

export function createGamepadSnapshot(gamepad, previousButtons = new Set()) {
  const pressedButtons = getPressedGamepadButtons(gamepad);
  const jump = isGamepadButtonPressed(gamepad, 0);
  const menuButtonPressed = isGamepadButtonPressed(gamepad, 9);
  const menuPressed = menuButtonPressed && !previousButtons.has(9);
  const startPressed = (jump || menuButtonPressed)
    && !previousButtons.has(0)
    && !previousButtons.has(9);

  return {
    x: normalizeGamepadAxis(gamepad.axes[0] ?? 0),
    z: -normalizeGamepadAxis(gamepad.axes[1] ?? 0),
    lookX: normalizeGamepadAxis(gamepad.axes[2] ?? 0),
    lookY: normalizeGamepadAxis(gamepad.axes[3] ?? 0),
    jump,
    sprint: pressedButtons.has(4) || pressedButtons.has(5) || pressedButtons.has(6) || pressedButtons.has(7),
    menuPressed,
    startPressed,
    pressedButtons,
  };
}

export function createTouchJoystickState({
  originX,
  originY,
  clientX,
  clientY,
  maxDistance = TOUCH_JOYSTICK_MAX_DISTANCE,
}) {
  const dx = clientX - originX;
  const dy = clientY - originY;
  const distance = Math.min(maxDistance, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const stickX = Math.cos(angle) * distance;
  const stickY = Math.sin(angle) * distance;

  return {
    stickX: roundInputValue(stickX),
    stickY: roundInputValue(stickY),
    x: roundInputValue(stickX / maxDistance),
    z: roundInputValue(-stickY / maxDistance),
  };
}

export function createDebugFreeCameraMovement(camera, {
  local = { x: 0, z: 0 },
  up = false,
  down = false,
  sprint = false,
  dt = 0,
} = {}) {
  const speed = sprint ? DEBUG_FREE_CAMERA_SPRINT_SPEED : DEBUG_FREE_CAMERA_WALK_SPEED;
  const step = speed * dt;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const forwardX = sinYaw * cosPitch;
  const forwardY = sinPitch;
  const forwardZ = cosYaw * cosPitch;
  const rightX = cosYaw;
  const rightZ = -sinYaw;
  const vertical = (up ? 1 : 0) - (down ? 1 : 0);

  return {
    ...camera,
    x: roundInputValue(camera.x + (forwardX * local.z + rightX * local.x) * step),
    y: roundInputValue(camera.y + (forwardY * local.z + vertical) * step),
    z: roundInputValue(camera.z + (forwardZ * local.z + rightZ * local.x) * step),
  };
}

export function createSoftMouseEdgeTurn({
  clientX,
  clientY,
  width,
  height,
}) {
  const edgeX = Math.max(80, width * 0.12);
  const edgeY = Math.max(60, height * 0.12);
  const rightStart = width - edgeX;
  const bottomStart = height - edgeY;
  let yaw = 0;
  let pitch = 0;

  if (clientX < edgeX) yaw = -((edgeX - clientX) / edgeX) * 3.2;
  if (clientX > rightStart) yaw = ((clientX - rightStart) / edgeX) * 3.2;
  if (clientY < edgeY) pitch = (edgeY - clientY) / edgeY * 1.4;
  if (clientY > bottomStart) pitch = -((clientY - bottomStart) / edgeY) * 1.4;

  return {
    yaw: roundInputValue(yaw),
    pitch: roundInputValue(pitch),
  };
}

function roundInputValue(value) {
  const rounded = Math.round(value * 1000000) / 1000000;
  return Object.is(rounded, -0) ? 0 : rounded;
}
