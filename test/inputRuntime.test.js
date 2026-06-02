import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GAMEPAD_DEADZONE,
  createGamepadSnapshot,
  createSoftMouseEdgeTurn,
  createTouchJoystickState,
  getPressedGamepadButtons,
  isGamepadButtonPressed,
  normalizeGamepadAxis,
} from '../src/inputRuntime.js';

function gamepad({ axes = [], buttons = [] } = {}) {
  return {
    axes,
    buttons: buttons.map((button) => (
      typeof button === 'number'
        ? { value: button, pressed: false }
        : button
    )),
  };
}

test('normalizes gamepad axes with a deadzone and full-scale edge', () => {
  assert.equal(normalizeGamepadAxis(0), 0);
  assert.equal(normalizeGamepadAxis(GAMEPAD_DEADZONE - 0.01), 0);
  assert.equal(normalizeGamepadAxis(1), 1);
  assert.equal(normalizeGamepadAxis(-1), -1);
  assert.ok(normalizeGamepadAxis(0.5) > 0);
  assert.ok(normalizeGamepadAxis(-0.5) < 0);
});

test('reads pressed gamepad buttons from pressed flags or analog values', () => {
  const pad = gamepad({
    buttons: [
      { pressed: true, value: 0 },
      0.2,
      0.75,
    ],
  });

  assert.equal(isGamepadButtonPressed(pad, 0), true);
  assert.equal(isGamepadButtonPressed(pad, 1), false);
  assert.equal(isGamepadButtonPressed(pad, 2), true);
  assert.deepEqual([...getPressedGamepadButtons(pad)], [0, 2]);
});

test('creates a normalized gamepad snapshot with menu and start edge flags', () => {
  const previousButtons = new Set([0]);
  const snapshot = createGamepadSnapshot(gamepad({
    axes: [0.5, -0.5, 0.25, -0.25],
    buttons: [
      { pressed: true, value: 1 },
      0,
      0,
      0,
      0.8,
      0,
      0,
      0,
      0,
      { pressed: true, value: 1 },
    ],
  }), previousButtons);

  assert.ok(snapshot.x > 0);
  assert.ok(snapshot.z > 0);
  assert.ok(snapshot.lookX > 0);
  assert.ok(snapshot.lookY < 0);
  assert.equal(snapshot.jump, true);
  assert.equal(snapshot.sprint, true);
  assert.equal(snapshot.menuPressed, true);
  assert.equal(snapshot.startPressed, false);
  assert.deepEqual([...snapshot.pressedButtons], [0, 4, 9]);
});

test('creates clamped touch joystick movement from origin and pointer position', () => {
  const right = createTouchJoystickState({
    originX: 100,
    originY: 100,
    clientX: 148,
    clientY: 100,
  });
  const farUp = createTouchJoystickState({
    originX: 100,
    originY: 100,
    clientX: 100,
    clientY: -100,
  });

  assert.deepEqual(right, {
    stickX: 48,
    stickY: 0,
    x: 1,
    z: 0,
  });
  assert.equal(Math.round(farUp.stickY), -48);
  assert.equal(Math.round(farUp.z), 1);
});

test('creates soft mouse edge turn from viewport position', () => {
  assert.deepEqual(createSoftMouseEdgeTurn({
    clientX: 400,
    clientY: 300,
    width: 800,
    height: 600,
  }), { yaw: 0, pitch: 0 });

  const topLeft = createSoftMouseEdgeTurn({
    clientX: 0,
    clientY: 0,
    width: 800,
    height: 600,
  });
  const bottomRight = createSoftMouseEdgeTurn({
    clientX: 800,
    clientY: 600,
    width: 800,
    height: 600,
  });

  assert.equal(topLeft.yaw, -3.2);
  assert.equal(topLeft.pitch, 1.4);
  assert.equal(bottomRight.yaw, 3.2);
  assert.equal(bottomRight.pitch, -1.4);
});
