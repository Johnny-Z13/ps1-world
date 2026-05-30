import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('renders a center reticule with an options toggle', () => {
  assert.match(index, /id="reticule"/);
  assert.match(index, /id="showReticule"/);
  assert.match(styles, /\.reticule/);
});

test('starts on a PS1-style title screen before random scene play', () => {
  assert.match(index, /id="titleScreen"/);
  assert.match(index, /id="titleCanvas"/);
  assert.match(index, /id="startButton"/);
  assert.match(index, /aria-label="\[start\]"/);
  assert.match(styles, /\.title-screen/);
  assert.match(styles, /\.title-canvas/);
  assert.match(styles, /image-rendering:\s*pixelated/);
  assert.match(app, /function startRandomScene/);
  assert.match(app, /const TITLE_WIDTH = 512/);
  assert.match(app, /drawBitmapGlyph/);
  assert.match(app, /Math\.random\(\) \* SCENE_DEFINITIONS\.length/);
  assert.match(app, /document\.body\.classList\.remove\('title-active'\)/);
});

test('hides the game canvas cursor during play', () => {
  assert.match(styles, /cursor:\s*none/);
  assert.match(styles, /body\.options-open\s+#screen/);
});

test('keeps mouse look tied to pointer lock until Escape releases it', () => {
  assert.match(app, /pointerlockchange/);
  assert.match(app, /hasActiveMouseCapture/);
  assert.match(app, /softMouseLockActive/);
  assert.match(app, /openOptions\(\{ releasePointerLock: false \}\)/);
});

test('renders one-bit scenes with ordered dithering instead of hard clipping', () => {
  assert.match(app, /orderedDither/);
  assert.match(app, /oneBitPaper/);
  assert.match(app, /oneBitInk/);
});

test('renders scene cards and motion flags for animated preset props', () => {
  assert.match(app, /scene\.floorPieces/);
  assert.match(app, /scene\.cards/);
  assert.match(app, /scene\.movingBillboards/);
  assert.match(app, /function motionCode/);
  assert.match(app, /attribute float aMotion/);
});

test('offers a player torch toggle and sends torch uniforms to the scene shader', () => {
  assert.match(index, /id="playerTorch"/);
  assert.match(index, /Player torch/);
  assert.match(app, /playerTorch/);
  assert.match(app, /uTorchPosition/);
  assert.match(app, /uTorchEnabled/);
  assert.match(app, /distance\(vWorldPosition,\s*uTorchPosition\)/);
});

test('maps number keys to selectable scene shortcuts', () => {
  assert.match(app, /function getSceneShortcutIndex/);
  assert.match(app, /Digit\(\[0-9\]\)/);
  assert.match(app, /Numpad\(\[0-9\]\)/);
  assert.match(app, /SCENE_DEFINITIONS\[shortcutIndex\]/);
  assert.match(app, /syncSceneSelect\(\)/);
});

test('updates vertical ground collision and respawns after falling below the scene', () => {
  assert.match(app, /getGroundYAt/);
  assert.match(app, /getVoidDeathY/);
  assert.match(app, /isBelowKillPlane/);
  assert.match(app, /walkableSurfaces/);
  assert.match(app, /getSceneWalkableSurfaces/);
  assert.match(app, /world\.killY/);
  assert.match(app, /resetPlayerToSpawn\(\)/);
});

test('holds the dead camera briefly with red tint and death audio before respawn', () => {
  assert.match(app, /const DEATH_RESPAWN_DELAY_MS = 2000/);
  assert.match(app, /deathState/);
  assert.match(app, /function startDeathSequence/);
  assert.match(app, /function updateDeathSequence/);
  assert.match(app, /function getDeathTint/);
  assert.match(app, /function playDeathSound/);
  assert.match(app, /uDeathTint/);
  assert.match(app, /mix\(color,\s*vec3\(0\.78,\s*0\.02,\s*0\.02\),\s*uDeathTint\)/);
});

test('adds mobile floating joystick, look drag, and jump touch controls', () => {
  assert.match(index, /id="touchMove"/);
  assert.match(index, /id="touchMoveStick"/);
  assert.match(index, /id="touchJump"/);
  assert.match(styles, /\.touch-move/);
  assert.match(styles, /@media \(pointer: coarse\)/);
  assert.match(styles, /touch-action:\s*none/);
  assert.match(app, /const touchMovement/);
  assert.match(app, /function setupTouchControls/);
  assert.match(app, /function updateTouchMovement/);
  assert.match(app, /function updateTouchLook/);
  assert.match(app, /touchJumpActive/);
});

test('adds gamepad movement, look, jump, sprint, and menu bindings', () => {
  assert.match(index, /Gamepad/);
  assert.match(app, /navigator\.getGamepads/);
  assert.match(app, /const gamepadInput/);
  assert.match(app, /function updateGamepadInput/);
  assert.match(app, /function applyGamepadLook/);
  assert.match(app, /function normalizeGamepadAxis/);
  assert.match(app, /buttonPressed\(gamepad,\s*0\)/);
  assert.match(app, /buttonPressed\(gamepad,\s*9\)/);
  assert.match(app, /gamepadInput\.sprint/);
});
