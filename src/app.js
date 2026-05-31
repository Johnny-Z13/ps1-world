import {
  createEffectState,
  getPresetValues,
  getResolutionMode,
  normalizePixelScale,
  PS1_RENDER_TARGET,
  PS1_RESOLUTION_MODES,
  VIDEO_PRESETS,
  applyVideoPreset,
} from './ps1Display.js';
import { cameraView } from './cameraMath.js';
import {
  PLAYER_EYE_HEIGHT,
  applyJumpPhysics,
  applyMouseLook,
  createMouseLookDelta,
  createMovementDelta,
  createInputVector,
  getGroundYAt,
  getVoidDeathY,
  isBelowKillPlane,
  resolveMovement,
} from './playerPhysics.js';
import { SCENE_DEFINITIONS, createSceneWorld } from './world.js';
import { LEVEL_GLB_URLS, loadLevelGlb } from './levelGlb.js';
import {
  createZombieEnemies,
  isPlayerTouchedByZombie,
  updateZombieEnemies,
} from './zombies.js';
import { animateZombieModel, loadZombieGlb } from './zombieModel.js';
import {
  MAX_PLAYER_HEALTH,
  ZOMBIE_BITE_DAMAGE,
  applyPlayerDamage,
  createPlayerHealth,
  getHealthDanger,
  restorePlayerHealth,
} from './playerHealth.js';
import {
  CUT_UP_COUNTDOWN_SECONDS,
  CUT_UP_INTERVAL_MS,
  createCutUpState,
  getCutUpHudText,
  getCutUpJumpFlash,
  getNextCutUpSceneIndex,
  shouldAdvanceCutUpScene,
} from './cutUpMode.js';

const canvas = document.querySelector('#screen');
const reticule = document.querySelector('#reticule');
const debugHudPanel = document.querySelector('#debugHud');
const debugFps = document.querySelector('#debugFps');
const debugZombies = document.querySelector('#debugZombies');
const debugEnemies = document.querySelector('#debugEnemies');
const titleScreen = document.querySelector('#titleScreen');
const titleCanvas = document.querySelector('#titleCanvas');
const startButton = document.querySelector('#startButton');
const cutUpButton = document.querySelector('#cutUpButton');
const cutUpHud = document.querySelector('#cutUpHud');
const optionsDialog = document.querySelector('#options');
const touchMove = document.querySelector('#touchMove');
const touchMoveStick = document.querySelector('#touchMoveStick');
const touchJump = document.querySelector('#touchJump');
const titleContext = titleCanvas.getContext('2d');
const gl = canvas.getContext('webgl', {
  antialias: false,
  alpha: false,
  depth: true,
  preserveDrawingBuffer: false,
});

if (!gl) {
  throw new Error('WebGL is required for this prototype.');
}

const effects = createEffectState();
effects.sceneId = 'dungeon';
const DEATH_RESPAWN_DELAY_MS = 2500;
const DEATH_SCENE_PROFILES = Object.freeze({
  collapseSplat: Object.freeze({
    id: 'collapseSplat',
    impactAt: 0.5,
    finalJiggleStart: 0.8,
    finalJiggleStrength: 0.028,
    dropDistance: 1.15,
    pitchDrop: 0.92,
    bounceHeight: 0.24,
    bounceCount: 2.5,
  }),
});
const GAMEPAD_DEADZONE = 0.18;
const CUT_UP_SCENE_COUNT = SCENE_DEFINITIONS.length;
const MAX_STATIC_TORCH_LIGHTS = 3;
const ZOMBIE_MODEL_SCALE = 1.75;
const ZOMBIE_MODEL_FRONT_ROTATION = -Math.PI / 2;
const ZOMBIE_GRUNT_LOOP_URL = './assets/audio/sfx/zombie-idle-grunt-8bit-loop.mp3?v=1';
const LIGHTNING_SOUND_URL = './assets/audio/sfx/lightning-bolt-strike.mp3?v=1';
const MENU_START_CONFIRM_SOUND_URL = './assets/audio/sfx/menu-start-confirm-8bit.mp3?v=1';
const TITLE_MUSIC_LOOP_URL = './assets/audio/music/title-menu-psx-8bit-loop.mp3?v=1';
const FREE_ROAM_MUSIC_LOOP_URL = './assets/audio/music/free-roam-dread-8bit-loop.mp3?v=1';
const CUT_UP_MUSIC_LOOP_URL = './assets/audio/music/cut-up-clockwork-8bit-loop.mp3?v=1';
const FREE_ROAM_START_SOUND_URL = './assets/audio/sfx/free-roam-start-warp-8bit.mp3?v=1';
const CUT_UP_START_SOUND_URL = './assets/audio/sfx/cut-up-start-burst-8bit.mp3?v=1';
const CUT_UP_SCENE_SLICE_SOUND_URL = './assets/audio/sfx/cut-up-scene-slice-8bit.mp3?v=1';
const CUT_UP_COUNTDOWN_TICK_SOUND_URL = './assets/audio/sfx/cut-up-countdown-tick-8bit.mp3?v=1';
const OPTIONS_OPEN_SOUND_URL = './assets/audio/sfx/options-open-static-8bit.mp3?v=1';
const OPTIONS_CLOSE_SOUND_URL = './assets/audio/sfx/options-close-click-8bit.mp3?v=1';
const HEALTH_PICKUP_SOUND_URL = './assets/audio/sfx/health-pickup-bing-8bit.mp3?v=1';
const PLAYER_DEATH_SOUND_URL = './assets/audio/sfx/player-death-8bit.mp3?v=1';
const PLAYER_DAMAGE_SOUND_URL = './assets/audio/sfx/player-damage-grunt-8bit.mp3?v=1';
const PLAYER_WALK_FOOTSTEP_LOOP_URL = './assets/audio/sfx/player-footsteps-walk-8bit-loop.mp3?v=1';
const PLAYER_SPRINT_FOOTSTEP_LOOP_URL = './assets/audio/sfx/player-footsteps-sprint-8bit-loop.mp3?v=1';
const PLAYER_LOW_HEALTH_BREATHING_LOOP_URL = './assets/audio/sfx/player-low-health-breathing-8bit-loop.mp3?v=1';
const SCENE_AMBIENCE_URLS = Object.freeze({
  dungeon: './assets/audio/ambience/dungeon-8bit-loop.mp3?v=1',
  'alien-landscape': './assets/audio/ambience/alien-landscape-8bit-loop.mp3?v=1',
  'derelict-starship': './assets/audio/ambience/derelict-starship-8bit-loop.mp3?v=1',
  'neon-backstreets': './assets/audio/ambience/neon-backstreets-8bit-loop.mp3?v=1',
  'sunken-temple': './assets/audio/ambience/sunken-temple-8bit-loop.mp3?v=1',
  'one-bit-cathedral': './assets/audio/ambience/one-bit-cathedral-8bit-loop.mp3?v=1',
  'rotwood-forest': './assets/audio/ambience/rotwood-forest-8bit-loop.mp3?v=1',
  'astral-geometry-garden': './assets/audio/ambience/astral-geometry-garden-8bit-loop.mp3?v=1',
  'motel-mirage': './assets/audio/ambience/motel-mirage-8bit-loop.mp3?v=1',
});
const SCENE_AMBIENCE_MAX_GAIN = 0.16;
const LIGHTNING_SOUND_GAIN = 0.55;
const MENU_START_CONFIRM_SOUND_GAIN = 0.5;
const TITLE_MUSIC_GAIN = 0.22;
const FREE_ROAM_MUSIC_GAIN = 0.12;
const CUT_UP_MUSIC_GAIN = 0.18;
const UI_SFX_GAIN = 0.58;
const TRANSITION_SFX_GAIN = 0.72;
const CUT_UP_AUDIO_DUCK_DURATION_MS = 420;
const HEALTH_PICKUP_SOUND_GAIN = 0.46;
const PLAYER_DEATH_SOUND_GAIN = 0.72;
const PLAYER_DAMAGE_SOUND_GAIN = 0.5;
const PLAYER_WALK_FOOTSTEP_GAIN = 0.13;
const PLAYER_SPRINT_FOOTSTEP_GAIN = 0.19;
const PLAYER_LOW_HEALTH_BREATHING_GAIN = 0.24;
const HEALTH_PICKUP_FLASH_DURATION_MS = 520;
const ZOMBIE_BITE_COOLDOWN_MS = 1150;
const PLAYER_HEARTBEAT_BASE_INTERVAL_MS = 1320;
const PLAYER_HEARTBEAT_DANGER_INTERVAL_MS = 560;
const PLAYER_HEARTBEAT_BASE_GAIN = 0.018;
const PLAYER_HEARTBEAT_DANGER_GAIN = 0.07;
const PLAYER_HEARTBEAT_DANGER_DISTANCE = 9;
const TORCH_CRACKLE_MAX_DISTANCE = 16;
const TORCH_CRACKLE_REF_DISTANCE = 1.2;
const TORCH_CRACKLE_GAIN = 0.045;
const ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE = 1.0;
const ZOMBIE_GRUNT_MAX_DISTANCE = 22;
const ZOMBIE_GRUNT_MAX_GAIN = 0.085;
const ZOMBIE_GRUNT_OCCLUDED_GAIN_MULTIPLIER = 0.32;
const ZOMBIE_GRUNT_OPEN_FILTER_HZ = 4200;
const ZOMBIE_GRUNT_OCCLUDED_FILTER_HZ = 760;
const SCENE_REVERB_PRESETS = Object.freeze({
  'tight-room': Object.freeze({ duration: 0.42, decay: 2.8, wet: 0.11 }),
  'open-air': Object.freeze({ duration: 0.28, decay: 4.6, wet: 0.045 }),
  'metal-hall': Object.freeze({ duration: 0.68, decay: 2.2, wet: 0.16 }),
  'stone-vault': Object.freeze({ duration: 0.86, decay: 2.5, wet: 0.19 }),
  'dream-space': Object.freeze({ duration: 1.1, decay: 1.9, wet: 0.22 }),
});
let world = createSceneWorld(effects.sceneId);
let renderResolution = getResolutionMode(effects.resolutionId);
let textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
const loadedLevels = new Map();
let sceneLoadRequest = 0;
let colliders = getSceneColliders(world);
let walkableSurfaces = getSceneWalkableSurfaces(world);
let zombies = createZombieEnemies(world);
let healthPotions = createSceneHealthPotions(world);
let playerHealth = createPlayerHealth();
let lastZombieBiteAt = -Infinity;
let healthPickupFlashStartedAt = -Infinity;
const player = {
  x: world.playerSpawn.x,
  y: world.playerSpawn.y,
  z: world.playerSpawn.z,
  yaw: world.playerSpawn.yaw,
  pitch: 0,
  velocityY: 0,
  grounded: true,
  groundY: world.playerSpawn.y,
};

const keys = new Set();
const deathState = {
  active: false,
  startedAt: 0,
  profile: null,
  cameraStart: null,
  cameraImpactY: 0,
  finalDeathRattlePlayed: false,
};
const touchMovement = { active: false, pointerId: null, originX: 0, originY: 0, x: 0, z: 0 };
const touchLook = { active: false, pointerId: null, x: 0, y: 0 };
const gamepadInput = {
  x: 0,
  z: 0,
  lookX: 0,
  lookY: 0,
  jump: false,
  sprint: false,
  previousButtons: new Set(),
};
let touchJumpActive = false;
let titleActive = true;
const titleButtonState = { active: false };
const cutUpButtonState = { active: false };
const gameState = { mode: 'normal' };
const cutUpState = createCutUpState(CUT_UP_SCENE_COUNT);
let mouseLookActive = false;
let gameModeRequested = false;
let lastPointerUnlockAt = 0;
let softMouseLockActive = false;
let softMouseEdgeTurn = { yaw: 0, pitch: 0 };
let lastMousePosition = null;
let sceneProgram;
let postProgram;
let warehouseMesh;
let zombieMesh;
let zombieModel = null;
let zombieTextureImage = null;
let quad;
let atlasTexture;
let renderTarget;
let audioState = null;

let lastTime = performance.now();
let viewport = { x: 0, y: 0, width: 1, height: 1 };
const debugHud = {
  fps: 0,
};

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  updateDebugHud(dt);

  updateGamepadInput();
  applyGamepadLook(dt);
  updateContinuousMouseLook(dt);
  updatePlayer(dt, now);
  updateCutUpMode(now);
  render(now / 1000, now);
  requestAnimationFrame(frame);
}

function updatePlayer(dt, now) {
  if (deathState.active) {
    updateDeathSequence(now);
    return;
  }

  const local = createInputVector({
    forward: keys.has('KeyW') || touchMovement.z > 0.12,
    back: keys.has('KeyS') || touchMovement.z < -0.12,
    left: keys.has('KeyA') || touchMovement.x < -0.12,
    right: keys.has('KeyD') || touchMovement.x > 0.12,
  });
  local.x = Math.abs(touchMovement.x) > 0.12 ? touchMovement.x : local.x;
  local.z = Math.abs(touchMovement.z) > 0.12 ? touchMovement.z : local.z;
  local.x = Math.abs(gamepadInput.x) > 0 ? gamepadInput.x : local.x;
  local.z = Math.abs(gamepadInput.z) > 0 ? gamepadInput.z : local.z;
  const speed = keys.has('ShiftLeft') || gamepadInput.sprint ? 4.4 : 2.8;
  const movement = createMovementDelta(local, player.yaw, speed, dt);
  const next = resolveMovement(
    { x: player.x, y: player.y, z: player.z },
    { x: player.x + movement.dx, z: player.z + movement.dz },
    colliders,
    0.32,
  );

  player.x = next.x;
  player.z = next.z;

  const groundY = getGroundYAt(player, walkableSurfaces);
  if (groundY === null || (player.grounded && player.y > groundY + 0.08)) {
    player.grounded = false;
  } else if (player.grounded) {
    player.groundY = groundY;
  }

  const jump = applyJumpPhysics(player, {
    jump: keys.has('Space') || touchJumpActive || gamepadInput.jump,
    dt,
    groundY: groundY ?? -Infinity,
  });
  player.y = jump.y;
  player.velocityY = jump.velocityY;
  player.grounded = jump.grounded;
  player.groundY = jump.grounded ? jump.y : groundY ?? player.groundY;

  if (isBelowKillPlane(player, getVoidDeathY(world.killY ?? -8))) {
    playerHealth = applyPlayerDamage(playerHealth, MAX_PLAYER_HEALTH);
    startDeathSequence(now, { damage: false });
    return;
  }

  updateHealthPotions(now);

  if (effects.zombies) {
    zombies = updateZombieEnemies(zombies, player, {
      colliders,
      walkableSurfaces,
      dt,
    });
  }
  if (effects.zombies && isPlayerTouchedByZombie(player, zombies)) {
    damagePlayer(now);
  }
}

function render(time, now = performance.now()) {
  const lightningStrength = getLightningStrength(time, world.lightning);
  const healthEffect = getHealthEffectStrength(now);
  updateSceneAudio(time, lightningStrength);

  gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.framebuffer);
  gl.viewport(0, 0, renderResolution.width, renderResolution.height);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.clearColor(...world.clearColor);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(sceneProgram.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
  gl.uniform1i(sceneProgram.uniforms.uAtlas, 0);
  gl.uniform1f(sceneProgram.uniforms.uTextureCount, world.textures.length);
  gl.uniform1f(sceneProgram.uniforms.uTime, time);
  gl.uniform1f(sceneProgram.uniforms.uOneBit, world.oneBit ? 1 : 0);
  gl.uniform1f(sceneProgram.uniforms.uLightningTextureId, getTextureIndex(world.lightning?.texture));
  gl.uniform1f(sceneProgram.uniforms.uLightningStrength, lightningStrength);
  gl.uniform1f(sceneProgram.uniforms.uRainTextureId, getTextureIndex(world.rain?.texture));
  gl.uniform1f(sceneProgram.uniforms.uShootingStarTextureId, getTextureIndex(world.shootingStar?.texture));
  gl.uniform1f(sceneProgram.uniforms.uWarping, effects.warping ? 1 : 0);
  gl.uniform3f(sceneProgram.uniforms.uTorchPosition, player.x, player.y + 0.25, player.z);
  gl.uniform3f(sceneProgram.uniforms.uTorchColor, ...(world.playerTorch?.color ?? [1, 0.55, 0.22]));
  gl.uniform1f(sceneProgram.uniforms.uTorchRadius, world.playerTorch?.radius ?? 0);
  gl.uniform1f(sceneProgram.uniforms.uTorchIntensity, world.playerTorch?.intensity ?? 0);
  gl.uniform1f(sceneProgram.uniforms.uTorchEnabled, effects.playerTorch && world.playerTorch ? 1 : 0);
  setStaticTorchUniforms(sceneProgram, world.torchLights ?? [], time);
  gl.uniformMatrix4fv(sceneProgram.uniforms.uViewProjection, false, createViewProjection(now));
  drawMesh(gl, sceneProgram, warehouseMesh);
  if (effects.zombies) {
    updateZombieMesh(gl, zombieMesh, zombies, textureIndices, zombieModel, time);
    drawMesh(gl, sceneProgram, zombieMesh);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.disable(gl.DEPTH_TEST);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

  const preset = getPresetValues(effects);
  gl.useProgram(postProgram.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderTarget.texture);
  gl.uniform1i(postProgram.uniforms.uScene, 0);
  gl.uniform2f(postProgram.uniforms.uResolution, viewport.width, viewport.height);
  gl.uniform1f(postProgram.uniforms.uTime, time);
  gl.uniform1f(postProgram.uniforms.uScanlines, effects.scanlines ? 1 : 0);
  gl.uniform1f(postProgram.uniforms.uDistortion, effects.crtDistortion ? preset.distortion : 0);
  gl.uniform1f(postProgram.uniforms.uDither, effects.dither ? 1 : 0);
  gl.uniform1f(postProgram.uniforms.uNoise, effects.noise ? preset.noise : 0);
  gl.uniform1f(postProgram.uniforms.uColorBleed, effects.colorBleed ? preset.colorBleed : 0);
  gl.uniform1f(postProgram.uniforms.uScanlineStrength, preset.scanlineStrength);
  gl.uniform1f(postProgram.uniforms.uVignette, preset.vignette);
  gl.uniform1f(postProgram.uniforms.uBrightness, effects.brightness);
  gl.uniform1f(postProgram.uniforms.uContrast, effects.contrast);
  gl.uniform1f(postProgram.uniforms.uSaturation, effects.saturation);
  gl.uniform1f(postProgram.uniforms.uPixelScale, effects.pixelScale);
  gl.uniform2f(postProgram.uniforms.uSourceResolution, renderResolution.width, renderResolution.height);
  gl.uniform1f(postProgram.uniforms.uFlipFramebufferY, effects.flipFramebufferY ? 1 : 0);
  gl.uniform1f(postProgram.uniforms.uOneBit, world.oneBit ? 1 : 0);
  gl.uniform1f(postProgram.uniforms.uLightningStrength, lightningStrength);
  gl.uniform1f(postProgram.uniforms.uHealthDanger, healthEffect.danger);
  gl.uniform1f(postProgram.uniforms.uHealthPulse, healthEffect.pulse);
  gl.uniform1f(postProgram.uniforms.uHealthPickupFlash, getHealthPickupFlash(now));
  gl.uniform1f(postProgram.uniforms.uDeathTint, getDeathTint(now));
  gl.uniform1f(postProgram.uniforms.uDeathProgress, getDeathSceneProgress(now));
  gl.uniform1f(postProgram.uniforms.uCutUpFlash, getCutUpJumpFlash(cutUpState, now));
  drawQuad(gl, postProgram, quad);

  if (titleActive) {
    renderTitleScreen(time);
  }
}

function getTextureIndex(id) {
  if (!id) return -1;
  return textureIndices.get(id) ?? -1;
}

function getLightningStrength(time, lightning) {
  if (!lightning) return 0;

  const interval = lightning.interval ?? 8;
  const duration = lightning.duration ?? 0.4;
  const phase = time % interval;
  if (phase > duration) return 0;

  const envelope = 1 - phase / duration;
  const strobe = Math.sin(phase * 95) > -0.15 ? 1 : 0.35;
  return Math.min(1, Math.max(0, envelope * strobe));
}

function setStaticTorchUniforms(program, torchLights, time) {
  const count = Math.min(torchLights.length, MAX_STATIC_TORCH_LIGHTS);
  if (program.uniforms.uStaticTorchCount) {
    gl.uniform1f(program.uniforms.uStaticTorchCount, count);
  }

  for (let i = 0; i < MAX_STATIC_TORCH_LIGHTS; i += 1) {
    const torchLight = torchLights[i] ?? {};
    const flicker = getTorchFlicker(torchLight, i, time);
    const position = [torchLight.x ?? 0, torchLight.y ?? 0, torchLight.z ?? 0];
    const color = torchLight.color ?? [1, 0.43, 0.12];
    const radius = i < count ? (torchLight.radius ?? 0) * (0.96 + flicker * 0.08) : 0;
    const intensity = i < count ? (torchLight.intensity ?? 0) * (0.72 + flicker * 0.42) : 0;
    const positionLocation = program.uniforms[`uStaticTorchPosition${i}`];
    const colorLocation = program.uniforms[`uStaticTorchColor${i}`];
    const radiusLocation = program.uniforms[`uStaticTorchRadius${i}`];
    const intensityLocation = program.uniforms[`uStaticTorchIntensity${i}`];

    if (positionLocation) gl.uniform3f(positionLocation, ...position);
    if (colorLocation) gl.uniform3f(colorLocation, ...color);
    if (radiusLocation) gl.uniform1f(radiusLocation, radius);
    if (intensityLocation) gl.uniform1f(intensityLocation, intensity);
  }
}

function getTorchFlicker(torchLight, index, time) {
  const seed = (torchLight.x ?? 0) * 3.7 + (torchLight.z ?? 0) * 5.1 + index * 9.3;
  const quick = Math.sin(time * 17.0 + seed) * 0.5 + 0.5;
  const slow = Math.sin(time * 5.4 + seed * 1.7) * 0.5 + 0.5;
  const dart = Math.sin(time * 31.0 + seed * 2.3) > 0.86 ? 1 : 0;
  return Math.max(0, Math.min(1, quick * 0.55 + slow * 0.3 + dart * 0.25));
}

function ensureAudioState() {
  if (!audioState) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    const dryGain = context.createGain();
    const reverbInput = context.createGain();
    const convolver = context.createConvolver();
    const reverbWetGain = context.createGain();
    const ambienceGain = context.createGain();
    const lightningGain = context.createGain();
    const musicGain = context.createGain();
    const titleMusicGain = context.createGain();
    const freeRoamMusicGain = context.createGain();
    const cutUpMusicGain = context.createGain();
    const uiSfxGain = context.createGain();
    const transitionSfxGain = context.createGain();
    const playerSfxGain = context.createGain();
    const footstepWalkGain = context.createGain();
    const footstepSprintGain = context.createGain();
    const lowHealthBreathingGain = context.createGain();
    const heartbeatGain = context.createGain();

    dryGain.gain.value = 1;
    dryGain.connect(context.destination);
    reverbInput.gain.value = 0.8;
    reverbInput.connect(convolver);
    convolver.connect(reverbWetGain);
    reverbWetGain.gain.value = 0;
    reverbWetGain.connect(context.destination);
    ambienceGain.gain.value = 0;
    connectSceneAudioNode(ambienceGain, dryGain, reverbInput);
    lightningGain.gain.value = LIGHTNING_SOUND_GAIN;
    connectSceneAudioNode(lightningGain, dryGain, reverbInput);
    musicGain.gain.value = 1;
    musicGain.connect(dryGain);
    titleMusicGain.gain.value = 0;
    titleMusicGain.connect(musicGain);
    freeRoamMusicGain.gain.value = 0;
    freeRoamMusicGain.connect(musicGain);
    cutUpMusicGain.gain.value = 0;
    cutUpMusicGain.connect(musicGain);
    uiSfxGain.gain.value = UI_SFX_GAIN;
    uiSfxGain.connect(dryGain);
    transitionSfxGain.gain.value = TRANSITION_SFX_GAIN;
    transitionSfxGain.connect(dryGain);
    playerSfxGain.gain.value = 1;
    connectSceneAudioNode(playerSfxGain, dryGain, reverbInput);
    footstepWalkGain.gain.value = 0;
    connectSceneAudioNode(footstepWalkGain, dryGain, reverbInput);
    footstepSprintGain.gain.value = 0;
    connectSceneAudioNode(footstepSprintGain, dryGain, reverbInput);
    lowHealthBreathingGain.gain.value = 0;
    lowHealthBreathingGain.connect(dryGain);
    heartbeatGain.gain.value = 0;
    heartbeatGain.connect(dryGain);

    audioState = {
      context,
      audioBuffers: new Map(),
      audioBufferLoads: new Map(),
      dryGain,
      reverbInput,
      convolver,
      reverbWetGain,
      activeReverbId: null,
      ambienceGain,
      ambienceSource: null,
      activeAmbienceId: null,
      loadingAmbienceId: null,
      ambienceSlots: [createAmbienceSlot(context, ambienceGain), createAmbienceSlot(context, ambienceGain)],
      activeAmbienceSlotIndex: 0,
      musicGain,
      titleMusicGain,
      freeRoamMusicGain,
      cutUpMusicGain,
      uiSfxGain,
      transitionSfxGain,
      musicSources: new Map(),
      musicLoopsLoading: new Set(),
      musicLoopsFailed: new Set(),
      lightningGain,
      playerSfxGain,
      footstepWalkGain,
      footstepSprintGain,
      lowHealthBreathingGain,
      heartbeatGain,
      footstepWalkSource: null,
      footstepSprintSource: null,
      footstepLoopsLoading: false,
      footstepLoopsFailed: false,
      lowHealthBreathingSource: null,
      lowHealthBreathingLoading: false,
      lowHealthBreathingFailed: false,
      heartbeatLoopTimer: null,
      torchCrackleVoices: new Map(),
      zombieVoices: new Map(),
      zombieLoopLoading: false,
      zombieLoopFailed: false,
      lastLightningIndex: -1,
      lastCutUpCountdownTick: null,
      cutUpAudioDuckStartedAt: -Infinity,
    };
    applySceneReverb(audioState);
  }

  if (audioState.context.state === 'suspended') {
    audioState.context.resume();
  }

  return audioState;
}

function connectSceneAudioNode(node, dryGain, reverbInput) {
  node.connect(dryGain);
  node.connect(reverbInput);
}

function createAmbienceSlot(context, ambienceGain) {
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(ambienceGain);
  return {
    id: null,
    source: null,
    gain,
    loadingId: null,
  };
}

function ensureSceneAudio() {
  if (!SCENE_AMBIENCE_URLS[world.id] && !world.lightning && !effects.zombies && !(world.torchLights ?? []).length) return;

  const state = ensureAudioState();
  if (!state) return;

  applySceneReverb(state);
  ensureSceneAmbienceLoop(state);
  syncCinematicMusicAudio(state);
  if (world.lightning) loadAudioBuffer(state, LIGHTNING_SOUND_URL);
  for (const url of [
    MENU_START_CONFIRM_SOUND_URL,
    HEALTH_PICKUP_SOUND_URL,
    PLAYER_DEATH_SOUND_URL,
    PLAYER_DAMAGE_SOUND_URL,
    TITLE_MUSIC_LOOP_URL,
    FREE_ROAM_MUSIC_LOOP_URL,
    CUT_UP_MUSIC_LOOP_URL,
    FREE_ROAM_START_SOUND_URL,
    CUT_UP_START_SOUND_URL,
    CUT_UP_SCENE_SLICE_SOUND_URL,
    CUT_UP_COUNTDOWN_TICK_SOUND_URL,
    OPTIONS_OPEN_SOUND_URL,
    OPTIONS_CLOSE_SOUND_URL,
  ]) {
    loadAudioBuffer(state, url).catch(() => {});
  }
  ensurePlayerFootstepLoops(state);
  ensureLowHealthBreathingLoop(state);
  ensurePlayerHeartbeatLoop(state);
  ensureZombieGruntLoop(state);
}

function loadAudioBuffer(state, url) {
  if (state.audioBuffers.has(url)) return Promise.resolve(state.audioBuffers.get(url));
  if (state.audioBufferLoads.has(url)) return state.audioBufferLoads.get(url);

  const loading = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load audio asset ${url}: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((arrayBuffer) => state.context.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      state.audioBuffers.set(url, buffer);
      state.audioBufferLoads.delete(url);
      return buffer;
    })
    .catch((error) => {
      state.audioBufferLoads.delete(url);
      console.warn(error);
      throw error;
    });

  state.audioBufferLoads.set(url, loading);
  return loading;
}

function ensureSceneAmbienceLoop(state) {
  const sceneId = world.id;
  const url = SCENE_AMBIENCE_URLS[sceneId];
  if (!url || state.activeAmbienceId === sceneId || state.loadingAmbienceId === sceneId) return;

  state.loadingAmbienceId = sceneId;
  loadAudioBuffer(state, url)
    .then((buffer) => {
      if (audioState !== state || world.id !== sceneId) return;

      const nextSlotIndex = (state.activeAmbienceSlotIndex + 1) % state.ambienceSlots.length;
      const nextSlot = state.ambienceSlots[nextSlotIndex];
      if (nextSlot.source) nextSlot.source.stop();
      nextSlot.source = state.context.createBufferSource();
      nextSlot.source.buffer = buffer;
      nextSlot.source.loop = true;
      nextSlot.source.connect(nextSlot.gain);
      nextSlot.id = sceneId;
      nextSlot.source.start();

      const previousSlot = state.ambienceSlots[state.activeAmbienceSlotIndex];
      nextSlot.gain.gain.setTargetAtTime(1, state.context.currentTime, 0.42);
      previousSlot.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.42);
      stopAmbienceSlotAfterFade(state, previousSlot);

      state.ambienceSource = nextSlot.source;
      state.activeAmbienceId = sceneId;
      state.activeAmbienceSlotIndex = nextSlotIndex;
    })
    .catch(() => {})
    .finally(() => {
      if (state.loadingAmbienceId === sceneId) state.loadingAmbienceId = null;
    });
}

function stopAmbienceSlotAfterFade(state, slot) {
  window.setTimeout(() => {
    if (audioState !== state || !slot.source || state.ambienceSlots[state.activeAmbienceSlotIndex] === slot) return;
    try {
      slot.source.stop();
    } catch {
      // Already stopped by the browser audio engine.
    }
    slot.source = null;
    slot.id = null;
  }, 900);
}

function getSceneAmbienceGain() {
  if (titleActive || deathState.active || !SCENE_AMBIENCE_URLS[world.id]) return 0;

  const duck = getAudioDuckAmount(performance.now());
  const optionsDuck = optionsDialog.open ? 0.35 : 1;
  return SCENE_AMBIENCE_MAX_GAIN * optionsDuck * (1 - duck * 0.52);
}

function getAudioDuckAmount(now) {
  if (!audioState) return 0;
  const elapsed = now - audioState.cutUpAudioDuckStartedAt;
  if (elapsed < 0 || elapsed > CUT_UP_AUDIO_DUCK_DURATION_MS) return 0;
  return 1 - elapsed / CUT_UP_AUDIO_DUCK_DURATION_MS;
}

function playAssetOneShot(state, url, gainNode) {
  const buffer = state.audioBuffers.get(url);
  if (!buffer) {
    loadAudioBuffer(state, url)
      .then((loadedBuffer) => {
        if (audioState !== state) return;
        const source = state.context.createBufferSource();
        source.buffer = loadedBuffer;
        source.connect(gainNode);
        source.start();
      })
      .catch(() => {});
    return;
  }

  const source = state.context.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode);
  source.start();
}

function playPlayerOneShot(url, volume) {
  const state = ensureAudioState();
  if (!state) return;

  state.playerSfxGain.gain.setValueAtTime(volume, state.context.currentTime);
  playAssetOneShot(state, url, state.playerSfxGain);
}

function playTransitionOneShot(url, volume = TRANSITION_SFX_GAIN) {
  const state = ensureAudioState();
  if (!state) return;

  state.transitionSfxGain.gain.setValueAtTime(volume, state.context.currentTime);
  playAssetOneShot(state, url, state.transitionSfxGain);
}

function playUiOneShot(url, volume = UI_SFX_GAIN) {
  const state = ensureAudioState();
  if (!state) return;

  state.uiSfxGain.gain.setValueAtTime(volume, state.context.currentTime);
  playAssetOneShot(state, url, state.uiSfxGain);
}

function playMenuStartConfirmSound() {
  playPlayerOneShot(MENU_START_CONFIRM_SOUND_URL, MENU_START_CONFIRM_SOUND_GAIN);
}

function ensureMusicLoop(state, id, url, gainNode) {
  if (state.musicSources.has(id) || state.musicLoopsLoading.has(id) || state.musicLoopsFailed.has(id)) return;

  state.musicLoopsLoading.add(id);
  loadAudioBuffer(state, url)
    .then((buffer) => {
      if (audioState !== state) return;

      const source = state.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      source.start();
      state.musicSources.set(id, source);
    })
    .catch((error) => {
      state.musicLoopsFailed.add(id);
      console.warn(error);
    })
    .finally(() => {
      state.musicLoopsLoading.delete(id);
    });
}

function syncCinematicMusicAudio(state) {
  ensureMusicLoop(state, 'title', TITLE_MUSIC_LOOP_URL, state.titleMusicGain);
  ensureMusicLoop(state, 'free-roam', FREE_ROAM_MUSIC_LOOP_URL, state.freeRoamMusicGain);
  ensureMusicLoop(state, 'cut-up', CUT_UP_MUSIC_LOOP_URL, state.cutUpMusicGain);

  const duck = getAudioDuckAmount(performance.now());
  const optionsDuck = optionsDialog.open ? 0.48 : 1;
  const titleGain = titleActive ? TITLE_MUSIC_GAIN : 0;
  const freeRoamGain = !titleActive && gameState.mode === 'normal' && !deathState.active ? FREE_ROAM_MUSIC_GAIN : 0;
  const cutUpGain = !titleActive && gameState.mode === 'cut-up' && !deathState.active ? CUT_UP_MUSIC_GAIN : 0;
  const musicDuck = optionsDuck * (1 - duck * 0.45);

  state.titleMusicGain.gain.setTargetAtTime(titleGain * musicDuck, state.context.currentTime, 0.5);
  state.freeRoamMusicGain.gain.setTargetAtTime(freeRoamGain * musicDuck, state.context.currentTime, 0.5);
  state.cutUpMusicGain.gain.setTargetAtTime(cutUpGain * musicDuck, state.context.currentTime, 0.5);
}

function syncCutUpCountdownAudio(state) {
  if (!cutUpState.active || titleActive || optionsDialog.open || deathState.active) {
    state.lastCutUpCountdownTick = null;
    cutUpState.lastCutUpCountdownTick = null;
    return;
  }

  const remainingMs = cutUpState.sceneStartedAt + CUT_UP_INTERVAL_MS - performance.now();
  const remainingSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  if (remainingSeconds <= 0 || remainingSeconds > CUT_UP_COUNTDOWN_SECONDS) {
    state.lastCutUpCountdownTick = null;
    cutUpState.lastCutUpCountdownTick = null;
    return;
  }

  if (state.lastCutUpCountdownTick === remainingSeconds) return;
  state.lastCutUpCountdownTick = remainingSeconds;
  cutUpState.lastCutUpCountdownTick = remainingSeconds;
  playTransitionOneShot(CUT_UP_COUNTDOWN_TICK_SOUND_URL, TRANSITION_SFX_GAIN * 0.44);
}

function triggerCutUpAudioDuck(now = performance.now()) {
  const state = ensureAudioState();
  if (!state) return;

  state.cutUpAudioDuckStartedAt = now;
  state.lastCutUpCountdownTick = null;
  cutUpState.lastCutUpCountdownTick = null;
}

function updateSceneAudio(time, lightningStrength) {
  if (!audioState) return;

  updateAudioListener(audioState);
  applySceneReverb(audioState);
  ensureSceneAmbienceLoop(audioState);
  ensurePlayerFootstepLoops(audioState);
  ensureLowHealthBreathingLoop(audioState);
  ensurePlayerHeartbeatLoop(audioState);
  syncCinematicMusicAudio(audioState);
  syncPlayerFootstepAudio(audioState);
  syncLowHealthBreathingAudio(audioState);
  syncPlayerHeartbeatAudio(audioState);
  syncCutUpCountdownAudio(audioState);
  syncTorchCrackleAudio(audioState);
  syncZombieSpatialAudio(audioState);
  const targetAmbience = getSceneAmbienceGain();
  audioState.ambienceGain.gain.setTargetAtTime(targetAmbience, audioState.context.currentTime, 0.36);

  if (!world.lightning || lightningStrength <= 0.6) return;

  const index = Math.floor(time / (world.lightning.interval ?? 8));
  if (index === audioState.lastLightningIndex) return;

  audioState.lastLightningIndex = index;
  playAssetOneShot(audioState, LIGHTNING_SOUND_URL, audioState.lightningGain);
}

function ensurePlayerFootstepLoops(state) {
  if (
    state.footstepWalkSource
    || state.footstepSprintSource
    || state.footstepLoopsLoading
    || state.footstepLoopsFailed
  ) return;

  state.footstepLoopsLoading = true;
  Promise.all([
    loadAudioBuffer(state, PLAYER_WALK_FOOTSTEP_LOOP_URL),
    loadAudioBuffer(state, PLAYER_SPRINT_FOOTSTEP_LOOP_URL),
  ])
    .then(([walkBuffer, sprintBuffer]) => {
      if (audioState !== state) return;

      const walkSource = state.context.createBufferSource();
      walkSource.buffer = walkBuffer;
      walkSource.loop = true;
      walkSource.connect(state.footstepWalkGain);
      walkSource.start();

      const sprintSource = state.context.createBufferSource();
      sprintSource.buffer = sprintBuffer;
      sprintSource.loop = true;
      sprintSource.connect(state.footstepSprintGain);
      sprintSource.start();

      state.footstepWalkSource = walkSource;
      state.footstepSprintSource = sprintSource;
    })
    .catch((error) => {
      state.footstepLoopsFailed = true;
      console.warn(error);
    })
    .finally(() => {
      state.footstepLoopsLoading = false;
    });
}

function syncPlayerFootstepAudio(state) {
  const footstep = getPlayerFootstepGains();
  state.footstepWalkGain.gain.setTargetAtTime(footstep.walk, state.context.currentTime, 0.08);
  state.footstepSprintGain.gain.setTargetAtTime(footstep.sprint, state.context.currentTime, 0.08);
}

function getPlayerFootstepGains() {
  if (titleActive || optionsDialog.open || deathState.active || !player.grounded) return { walk: 0, sprint: 0 };

  const moving = keys.has('KeyW')
    || keys.has('KeyA')
    || keys.has('KeyS')
    || keys.has('KeyD')
    || Math.hypot(touchMovement.x, touchMovement.z) > 0.12
    || Math.hypot(gamepadInput.x, gamepadInput.z) > 0.12;
  if (!moving) return { walk: 0, sprint: 0 };

  const sprinting = keys.has('ShiftLeft') || gamepadInput.sprint;
  return {
    walk: sprinting ? 0 : PLAYER_WALK_FOOTSTEP_GAIN,
    sprint: sprinting ? PLAYER_SPRINT_FOOTSTEP_GAIN : 0,
  };
}

function ensureLowHealthBreathingLoop(state) {
  if (state.lowHealthBreathingSource || state.lowHealthBreathingLoading || state.lowHealthBreathingFailed) return;

  state.lowHealthBreathingLoading = true;
  loadAudioBuffer(state, PLAYER_LOW_HEALTH_BREATHING_LOOP_URL)
    .then((buffer) => {
      if (audioState !== state) return;

      const source = state.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(state.lowHealthBreathingGain);
      source.start();
      state.lowHealthBreathingSource = source;
    })
    .catch((error) => {
      state.lowHealthBreathingFailed = true;
      console.warn(error);
    })
    .finally(() => {
      state.lowHealthBreathingLoading = false;
    });
}

function syncLowHealthBreathingAudio(state) {
  const healthEffect = getHealthEffectStrength(performance.now());
  const targetGain = healthEffect.danger * PLAYER_LOW_HEALTH_BREATHING_GAIN;
  state.lowHealthBreathingGain.gain.setTargetAtTime(targetGain, state.context.currentTime, 0.18);
}

function ensurePlayerHeartbeatLoop(state) {
  if (state.heartbeatLoopTimer) return;

  scheduleHeartbeatPulse(state, PLAYER_HEARTBEAT_BASE_INTERVAL_MS);
}

function scheduleHeartbeatPulse(state, delayMs) {
  state.heartbeatLoopTimer = window.setTimeout(() => {
    state.heartbeatLoopTimer = null;
    if (audioState !== state) return;

    const heartbeat = getPlayerHeartbeatParams();
    if (heartbeat.gain > 0) {
      playHeartbeatThump(state, state.context.currentTime, 84, heartbeat.gain);
      playHeartbeatThump(state, state.context.currentTime + 0.16, 64, heartbeat.gain * 0.72);
    }

    scheduleHeartbeatPulse(state, heartbeat.intervalMs);
  }, delayMs);
}

function playHeartbeatThump(state, startTime, frequency, gain) {
  const oscillator = state.context.createOscillator();
  const envelope = state.context.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  envelope.gain.setValueAtTime(0, startTime);
  envelope.gain.linearRampToValueAtTime(gain, startTime + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.11);
  oscillator.connect(envelope);
  envelope.connect(state.heartbeatGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.14);
}

function syncPlayerHeartbeatAudio(state) {
  const heartbeat = getPlayerHeartbeatParams();
  state.heartbeatGain.gain.setTargetAtTime(heartbeat.masterGain, state.context.currentTime, 0.18);
}

function getPlayerHeartbeatParams() {
  if (titleActive || optionsDialog.open || deathState.active) {
    return { intervalMs: PLAYER_HEARTBEAT_BASE_INTERVAL_MS, gain: 0, masterGain: 0 };
  }

  const nearestZombieDistance = getNearestZombieDistance();
  const danger = nearestZombieDistance === null
    ? 0
    : Math.max(0, Math.min(1, 1 - nearestZombieDistance / PLAYER_HEARTBEAT_DANGER_DISTANCE));

  return {
    intervalMs: Math.round(
      PLAYER_HEARTBEAT_BASE_INTERVAL_MS
        + (PLAYER_HEARTBEAT_DANGER_INTERVAL_MS - PLAYER_HEARTBEAT_BASE_INTERVAL_MS) * danger,
    ),
    gain: PLAYER_HEARTBEAT_BASE_GAIN
      + (PLAYER_HEARTBEAT_DANGER_GAIN - PLAYER_HEARTBEAT_BASE_GAIN) * danger,
    masterGain: 1,
  };
}

function getNearestZombieDistance() {
  if (!effects.zombies || !zombies.length) return null;

  let nearest = Infinity;
  for (const zombie of zombies) {
    nearest = Math.min(nearest, Math.hypot(player.x - zombie.x, player.z - zombie.z));
  }
  return Number.isFinite(nearest) ? nearest : null;
}

function syncTorchCrackleAudio(state) {
  const activeIds = new Set();
  if (!titleActive && !optionsDialog.open && !deathState.active) {
    for (let index = 0; index < (world.torchLights ?? []).length; index += 1) {
      const torchLight = world.torchLights[index];
      const id = `${world.id}:torch-crackle:${index}`;
      activeIds.add(id);
      const voice = getTorchCrackleVoice(state, id, torchLight, index);
      voice.gain.gain.setTargetAtTime(TORCH_CRACKLE_GAIN, state.context.currentTime, 0.24);
      voice.panner.positionX.setTargetAtTime(torchLight.x, state.context.currentTime, 0.08);
      voice.panner.positionY.setTargetAtTime(torchLight.y, state.context.currentTime, 0.08);
      voice.panner.positionZ.setTargetAtTime(torchLight.z, state.context.currentTime, 0.08);
    }
  }

  for (const [id, voice] of state.torchCrackleVoices) {
    if (activeIds.has(id)) continue;
    stopTorchCrackleVoice(state, voice);
    state.torchCrackleVoices.delete(id);
  }
}

function getTorchCrackleVoice(state, id, torchLight, index) {
  if (state.torchCrackleVoices.has(id)) return state.torchCrackleVoices.get(id);

  const gain = state.context.createGain();
  const filter = state.context.createBiquadFilter();
  const panner = state.context.createPanner();
  gain.gain.value = 0;
  filter.type = 'bandpass';
  filter.frequency.value = 1300;
  filter.Q.value = 2.8;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = TORCH_CRACKLE_REF_DISTANCE;
  panner.maxDistance = TORCH_CRACKLE_MAX_DISTANCE;
  panner.rolloffFactor = 2.2;
  setAudioParam(panner.positionX, torchLight.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, torchLight.y, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, torchLight.z, state.context.currentTime, 0);
  gain.connect(filter);
  filter.connect(panner);
  connectSceneAudioNode(panner, state.dryGain, state.reverbInput);

  const voice = { id, gain, filter, panner, timerId: null, seed: index * 19.13 };
  state.torchCrackleVoices.set(id, voice);
  scheduleTorchCracklePulse(state, voice);
  return voice;
}

function scheduleTorchCracklePulse(state, voice) {
  const delay = 55 + Math.floor(Math.random() * 145 + voice.seed % 37);
  voice.timerId = window.setTimeout(() => {
    voice.timerId = null;
    if (audioState !== state || !state.torchCrackleVoices.has(voice.id)) return;

    playTorchCracklePulse(state, voice);
    scheduleTorchCracklePulse(state, voice);
  }, delay);
}

function playTorchCracklePulse(state, voice) {
  const now = state.context.currentTime;
  const oscillator = state.context.createOscillator();
  const envelope = state.context.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(620 + Math.random() * 2100, now);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(0.16 + Math.random() * 0.22, now + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.045 + Math.random() * 0.07);
  oscillator.connect(envelope);
  envelope.connect(voice.gain);
  oscillator.start(now);
  oscillator.stop(now + 0.14);
}

function stopTorchCrackleVoice(state, voice) {
  if (voice.timerId) {
    window.clearTimeout(voice.timerId);
    voice.timerId = null;
  }
  voice.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.08);
}

function ensureZombieGruntLoop(state) {
  if (state.audioBuffers.has(ZOMBIE_GRUNT_LOOP_URL) || state.zombieLoopLoading || state.zombieLoopFailed) return;

  state.zombieLoopLoading = true;
  loadAudioBuffer(state, ZOMBIE_GRUNT_LOOP_URL)
    .catch((error) => {
      state.zombieLoopFailed = true;
      console.warn(error);
    })
    .finally(() => {
      state.zombieLoopLoading = false;
    });
}

function syncZombieSpatialAudio(state) {
  const buffer = state.audioBuffers.get(ZOMBIE_GRUNT_LOOP_URL);
  if (!buffer) {
    ensureZombieGruntLoop(state);
    stopZombieVoices(state);
    return;
  }

  const activeIds = new Set();
  if (!titleActive && !optionsDialog.open && !deathState.active && effects.zombies) {
    for (const zombie of zombies) {
      const gain = getZombieGruntGain(zombie);
      if (gain <= 0) continue;

      activeIds.add(zombie.id);
      const voice = getZombieVoice(state, zombie, buffer);
      const occluded = isZombieAudioOccluded(zombie);
      voice.gain.gain.setTargetAtTime(gain, state.context.currentTime, 0.32);
      voice.filter.frequency.setTargetAtTime(
        occluded ? ZOMBIE_GRUNT_OCCLUDED_FILTER_HZ : ZOMBIE_GRUNT_OPEN_FILTER_HZ,
        state.context.currentTime,
        0.18,
      );
      voice.panner.positionX.setTargetAtTime(zombie.x, state.context.currentTime, 0.08);
      voice.panner.positionY.setTargetAtTime(zombie.y, state.context.currentTime, 0.08);
      voice.panner.positionZ.setTargetAtTime(zombie.z, state.context.currentTime, 0.08);
    }
  }

  for (const [id, voice] of state.zombieVoices) {
    if (activeIds.has(id)) continue;
    stopZombieVoice(state, voice);
    state.zombieVoices.delete(id);
  }
}

function getZombieVoice(state, zombie, buffer) {
  if (state.zombieVoices.has(zombie.id)) return state.zombieVoices.get(zombie.id);

  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  const filter = state.context.createBiquadFilter();
  const panner = state.context.createPanner();
  source.buffer = buffer;
  source.loop = true;
  gain.gain.value = 0;
  filter.type = 'lowpass';
  filter.frequency.value = ZOMBIE_GRUNT_OPEN_FILTER_HZ;
  filter.Q.value = 0.6;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE;
  panner.maxDistance = ZOMBIE_GRUNT_MAX_DISTANCE;
  panner.rolloffFactor = 2.9;
  setAudioParam(panner.positionX, zombie.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, zombie.y, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, zombie.z, state.context.currentTime, 0);
  source.connect(gain);
  gain.connect(filter);
  filter.connect(panner);
  connectSceneAudioNode(panner, state.dryGain, state.reverbInput);
  source.start();

  const voice = { source, gain, filter, panner };
  state.zombieVoices.set(zombie.id, voice);
  return voice;
}

function stopZombieVoices(state) {
  for (const voice of state.zombieVoices.values()) {
    stopZombieVoice(state, voice);
  }
  state.zombieVoices.clear();
}

function stopZombieVoice(state, voice) {
  voice.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.08);
  setTimeout(() => {
    try {
      voice.source.stop();
    } catch {
      // Already stopped by the browser audio engine.
    }
  }, 160);
}

function getZombieGruntGain(zombie) {
  if (titleActive || optionsDialog.open || deathState.active || !effects.zombies || !zombie) return 0;

  const nearestDistance = Math.hypot(player.x - zombie.x, player.z - zombie.z);
  const occlusion = isZombieAudioOccluded(zombie) ? ZOMBIE_GRUNT_OCCLUDED_GAIN_MULTIPLIER : 1;

  if (nearestDistance >= ZOMBIE_GRUNT_MAX_DISTANCE) return 0;
  if (nearestDistance <= ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE) return ZOMBIE_GRUNT_MAX_GAIN * occlusion;

  const fadeRange = ZOMBIE_GRUNT_MAX_DISTANCE - ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE;
  const fade = 1 - (nearestDistance - ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE) / fadeRange;
  return Math.max(0, Math.min(ZOMBIE_GRUNT_MAX_GAIN, fade * fade * ZOMBIE_GRUNT_MAX_GAIN * occlusion));
}

function isZombieAudioOccluded(zombie) {
  return colliders.some((collider) => {
    if (!collider) return false;
    if (Math.max(player.y, zombie.y) < collider.minY || Math.min(player.y, zombie.y) > collider.maxY) return false;
    return lineIntersectsCollider2D(
      { x: player.x, z: player.z },
      { x: zombie.x, z: zombie.z },
      collider,
    );
  });
}

function lineIntersectsCollider2D(start, end, collider) {
  if (pointInsideCollider2D(start, collider) || pointInsideCollider2D(end, collider)) return false;

  const dx = end.x - start.x;
  const dz = end.z - start.z;
  let tMin = 0;
  let tMax = 1;

  const xHit = clipSegmentAxis(start.x, dx, collider.minX, collider.maxX, tMin, tMax);
  if (!xHit.hit) return false;
  tMin = xHit.tMin;
  tMax = xHit.tMax;

  const zHit = clipSegmentAxis(start.z, dz, collider.minZ, collider.maxZ, tMin, tMax);
  return zHit.hit;
}

function clipSegmentAxis(start, delta, min, max, tMin, tMax) {
  if (Math.abs(delta) < 0.0001) {
    return { hit: start >= min && start <= max, tMin, tMax };
  }

  const inverse = 1 / delta;
  let near = (min - start) * inverse;
  let far = (max - start) * inverse;
  if (near > far) {
    const swap = near;
    near = far;
    far = swap;
  }

  const nextMin = Math.max(tMin, near);
  const nextMax = Math.min(tMax, far);
  return { hit: nextMin <= nextMax, tMin: nextMin, tMax: nextMax };
}

function pointInsideCollider2D(point, collider) {
  return point.x >= collider.minX
    && point.x <= collider.maxX
    && point.z >= collider.minZ
    && point.z <= collider.maxZ;
}

function updateAudioListener(state) {
  const listener = state.context.listener;
  const time = state.context.currentTime;
  const forwardX = Math.sin(player.yaw) * Math.cos(player.pitch);
  const forwardY = Math.sin(player.pitch);
  const forwardZ = -Math.cos(player.yaw) * Math.cos(player.pitch);

  if (listener.positionX) {
    listener.positionX.setTargetAtTime(player.x, time, 0.05);
    listener.positionY.setTargetAtTime(player.y, time, 0.05);
    listener.positionZ.setTargetAtTime(player.z, time, 0.05);
    listener.forwardX.setTargetAtTime(forwardX, time, 0.05);
    listener.forwardY.setTargetAtTime(forwardY, time, 0.05);
    listener.forwardZ.setTargetAtTime(forwardZ, time, 0.05);
    listener.upX.setTargetAtTime(0, time, 0.05);
    listener.upY.setTargetAtTime(1, time, 0.05);
    listener.upZ.setTargetAtTime(0, time, 0.05);
  } else {
    listener.setPosition(player.x, player.y, player.z);
    listener.setOrientation(forwardX, forwardY, forwardZ, 0, 1, 0);
  }
}

function applySceneReverb(state) {
  const reverbId = world.audio.reverb;
  const preset = SCENE_REVERB_PRESETS[reverbId] ?? SCENE_REVERB_PRESETS['tight-room'];
  if (state.activeReverbId !== reverbId) {
    state.convolver.buffer = createReverbImpulse(state.context, preset);
    state.activeReverbId = reverbId;
  }
  state.reverbWetGain.gain.setTargetAtTime(preset.wet, state.context.currentTime, 0.8);
}

function createReverbImpulse(context, preset) {
  const length = Math.max(1, Math.floor(context.sampleRate * preset.duration));
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const phase = i / length;
      const bitCrush = ((i * 1103515245 + channel * 12345) & 255) / 128 - 1;
      data[i] = bitCrush * ((1 - phase) ** preset.decay) * 0.42;
    }
  }

  return impulse;
}

function setAudioParam(param, value, time, smoothing) {
  if (smoothing > 0) {
    param.setTargetAtTime(value, time, smoothing);
  } else {
    param.setValueAtTime(value, time);
  }
}

function createViewProjection(now = performance.now()) {
  const projection = perspective(Math.PI / 3.2, PS1_RENDER_TARGET.aspect, 0.08, 80);
  const view = cameraView(getActiveCamera(now));
  return multiplyMat4(projection, view);
}

function getActiveCamera(now) {
  return deathState.active ? getDeathSceneCamera(now) : player;
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  const targetAspect = PS1_RENDER_TARGET.aspect;
  let width = canvas.width;
  let height = Math.round(width / targetAspect);

  if (height > canvas.height) {
    height = canvas.height;
    width = Math.round(height * targetAspect);
  }

  viewport = {
    x: Math.floor((canvas.width - width) / 2),
    y: Math.floor((canvas.height - height) / 2),
    width,
    height,
  };
}

function setupInput() {
  window.addEventListener('resize', resize);
  document.addEventListener('keydown', (event) => {
    if (titleActive) {
      ensureSceneAudio();
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        startRandomScene();
      } else if (event.code === 'KeyC') {
        event.preventDefault();
        startCutUpMode();
      }
      return;
    }

    ensureSceneAudio();
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (performance.now() - lastPointerUnlockAt < 250 && optionsDialog.open) return;
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      } else if (softMouseLockActive) {
        openOptions({ releasePointerLock: false });
      } else {
        toggleOptions();
      }
      return;
    }
    const shortcutIndex = getSceneShortcutIndex(event.code);
    if (shortcutIndex !== -1 && !optionsDialog.open) {
      const shortcutScene = SCENE_DEFINITIONS[shortcutIndex];
      if (shortcutScene) {
        event.preventDefault();
        if (gameState.mode === 'cut-up') {
          jumpToCutUpScene(shortcutIndex, performance.now());
        } else {
          setScene(shortcutScene.id);
        }
        syncSceneSelect();
      }
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    keys.add(event.code);
  }, { capture: true });
  document.addEventListener('keyup', (event) => keys.delete(event.code), { capture: true });
  titleScreen.addEventListener('pointerdown', () => {
    if (titleActive) ensureSceneAudio();
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (titleActive) return;
    ensureSceneAudio();
    if (optionsDialog.open) return;
    lastMousePosition = { x: event.clientX, y: event.clientY };
    enterGameMode({ requestLock: true });
  });
  optionsDialog.addEventListener('pointerdown', () => ensureSceneAudio());
  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('mousemove', (event) => {
    if (optionsDialog.open) return;
    if (!hasActiveMouseCapture()) return;
    const delta = createMouseLookDelta(event, lastMousePosition);
    lastMousePosition = delta.position;
    const look = applyMouseLook(player, delta, { invertY: effects.invertY });
    player.yaw = look.yaw;
    player.pitch = look.pitch;
    updateSoftMouseEdgeTurn(event);
  });
  setupTouchControls();
}

function setupTouchControls() {
  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    if (titleActive || optionsDialog.open || deathState.active) return;
    if (event.target === touchJump) return;

    ensureSceneAudio();
    enterGameMode({ requestLock: false });
    event.preventDefault();

    if (event.clientX <= window.innerWidth * 0.52 && !touchMovement.active) {
      touchMovement.active = true;
      touchMovement.pointerId = event.pointerId;
      touchMovement.originX = event.clientX;
      touchMovement.originY = event.clientY;
      touchMove.style.left = `${event.clientX}px`;
      touchMove.style.top = `${event.clientY}px`;
      touchMove.classList.add('active');
      updateTouchMovement(event);
    } else if (!touchLook.active) {
      touchLook.active = true;
      touchLook.pointerId = event.pointerId;
      touchLook.x = event.clientX;
      touchLook.y = event.clientY;
    }
  }, { passive: false });

  document.addEventListener('pointermove', (event) => {
    if (event.pointerId === touchMovement.pointerId) {
      event.preventDefault();
      updateTouchMovement(event);
    } else if (event.pointerId === touchLook.pointerId) {
      event.preventDefault();
      updateTouchLook(event);
    }
  }, { passive: false });

  document.addEventListener('pointerup', endTouchPointer, { passive: false });
  document.addEventListener('pointercancel', endTouchPointer, { passive: false });
  touchJump.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    if (titleActive || optionsDialog.open || deathState.active) return;
    ensureSceneAudio();
    enterGameMode({ requestLock: false });
    touchJumpActive = true;
    event.preventDefault();
  }, { passive: false });
  touchJump.addEventListener('pointerup', () => {
    touchJumpActive = false;
  });
  touchJump.addEventListener('pointercancel', () => {
    touchJumpActive = false;
  });
}

function updateTouchMovement(event) {
  const maxDistance = 48;
  const dx = event.clientX - touchMovement.originX;
  const dy = event.clientY - touchMovement.originY;
  const distance = Math.min(maxDistance, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const stickX = Math.cos(angle) * distance;
  const stickY = Math.sin(angle) * distance;

  touchMovement.x = stickX / maxDistance;
  touchMovement.z = -stickY / maxDistance;
  touchMoveStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
}

function updateTouchLook(event) {
  const delta = {
    movementX: event.clientX - touchLook.x,
    movementY: event.clientY - touchLook.y,
  };
  const look = applyMouseLook(player, delta, {
    invertY: effects.invertY,
    yawSensitivity: 0.0042,
    pitchSensitivity: 0.0032,
  });

  player.yaw = look.yaw;
  player.pitch = look.pitch;
  touchLook.x = event.clientX;
  touchLook.y = event.clientY;
}

function endTouchPointer(event) {
  if (event.pointerId === touchMovement.pointerId) {
    touchMovement.active = false;
    touchMovement.pointerId = null;
    touchMovement.x = 0;
    touchMovement.z = 0;
    touchMove.classList.remove('active');
    touchMoveStick.style.transform = 'translate(0, 0)';
  }

  if (event.pointerId === touchLook.pointerId) {
    touchLook.active = false;
    touchLook.pointerId = null;
  }
}

function updateGamepadInput() {
  const gamepad = getPrimaryGamepad();
  if (!gamepad) {
    resetGamepadInput();
    return;
  }

  const pressedButtons = new Set();
  for (let index = 0; index < gamepad.buttons.length; index += 1) {
    if (buttonPressed(gamepad, index)) pressedButtons.add(index);
  }

  const jumpPressed = buttonPressed(gamepad, 0);
  const menuButtonPressed = buttonPressed(gamepad, 9);
  const menuPressed = menuButtonPressed && !gamepadInput.previousButtons.has(9);
  const startPressed = (jumpPressed || menuButtonPressed)
    && !gamepadInput.previousButtons.has(0)
    && !gamepadInput.previousButtons.has(9);

  if (titleActive) {
    if (startPressed) startRandomScene();
    gamepadInput.previousButtons = pressedButtons;
    return;
  }

  gamepadInput.x = normalizeGamepadAxis(gamepad.axes[0] ?? 0);
  gamepadInput.z = -normalizeGamepadAxis(gamepad.axes[1] ?? 0);
  gamepadInput.lookX = normalizeGamepadAxis(gamepad.axes[2] ?? 0);
  gamepadInput.lookY = normalizeGamepadAxis(gamepad.axes[3] ?? 0);
  gamepadInput.jump = jumpPressed;
  gamepadInput.sprint = pressedButtons.has(4) || pressedButtons.has(5) || pressedButtons.has(6) || pressedButtons.has(7);

  if (menuPressed) {
    ensureSceneAudio();
    toggleOptions();
  }

  gamepadInput.previousButtons = pressedButtons;
}

function applyGamepadLook(dt) {
  if (titleActive || optionsDialog.open || deathState.active) return;
  if (Math.abs(gamepadInput.lookX) <= 0 && Math.abs(gamepadInput.lookY) <= 0) return;

  const look = applyMouseLook(player, {
    movementX: gamepadInput.lookX * dt * 920,
    movementY: gamepadInput.lookY * dt * 760,
  }, { invertY: effects.invertY });

  player.yaw = look.yaw;
  player.pitch = look.pitch;
}

function getPrimaryGamepad() {
  const pads = navigator.getGamepads?.() ?? [];
  return [...pads].find((pad) => pad?.connected) ?? null;
}

function normalizeGamepadAxis(value) {
  if (Math.abs(value) < GAMEPAD_DEADZONE) return 0;

  const sign = Math.sign(value);
  return sign * Math.min(1, (Math.abs(value) - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE));
}

function buttonPressed(gamepad, index) {
  const button = gamepad.buttons[index];
  return Boolean(button?.pressed || button?.value > 0.5);
}

function resetGamepadInput() {
  gamepadInput.x = 0;
  gamepadInput.z = 0;
  gamepadInput.lookX = 0;
  gamepadInput.lookY = 0;
  gamepadInput.jump = false;
  gamepadInput.sprint = false;
  gamepadInput.previousButtons.clear();
}

function requestPointerLockSafely() {
  if (optionsDialog.open || document.pointerLockElement === canvas || softMouseLockActive) return;

  if (!hasNativePointerLock()) {
    activateSoftMouseLock();
    return;
  }

  try {
    const request = canvas.requestPointerLock?.();
    if (request?.catch) {
      request.catch(() => {
        mouseLookActive = false;
        gameModeRequested = false;
        softMouseLockActive = false;
        resetSoftMouseEdgeTurn();
      });
    }
  } catch {
    mouseLookActive = false;
    gameModeRequested = false;
    softMouseLockActive = false;
    resetSoftMouseEdgeTurn();
  }
}

function hasNativePointerLock() {
  return typeof canvas.requestPointerLock === 'function' && typeof document.exitPointerLock === 'function';
}

function hasActiveMouseCapture() {
  return document.pointerLockElement === canvas || softMouseLockActive;
}

function activateSoftMouseLock() {
  softMouseLockActive = true;
  mouseLookActive = true;
  gameModeRequested = true;
  document.body.classList.add('game-active');
  document.body.classList.remove('options-open');
  syncReticule();
}

function updateSoftMouseEdgeTurn(event) {
  if (!softMouseLockActive) {
    resetSoftMouseEdgeTurn();
    return;
  }

  const edgeX = Math.max(80, window.innerWidth * 0.12);
  const edgeY = Math.max(60, window.innerHeight * 0.12);
  const rightStart = window.innerWidth - edgeX;
  const bottomStart = window.innerHeight - edgeY;
  let yaw = 0;
  let pitch = 0;

  if (event.clientX < edgeX) yaw = -((edgeX - event.clientX) / edgeX) * 3.2;
  if (event.clientX > rightStart) yaw = ((event.clientX - rightStart) / edgeX) * 3.2;
  if (event.clientY < edgeY) pitch = (edgeY - event.clientY) / edgeY * 1.4;
  if (event.clientY > bottomStart) pitch = -((event.clientY - bottomStart) / edgeY) * 1.4;

  softMouseEdgeTurn = { yaw, pitch };
}

function updateContinuousMouseLook(dt) {
  if (!softMouseLockActive || optionsDialog.open) return;

  player.yaw += softMouseEdgeTurn.yaw * dt;
  player.pitch = clamp(player.pitch + softMouseEdgeTurn.pitch * dt, -0.92, 0.92);
}

function resetSoftMouseEdgeTurn() {
  softMouseEdgeTurn = { yaw: 0, pitch: 0 };
  lastMousePosition = null;
}

function handlePointerLockChange() {
  if (document.pointerLockElement === canvas) {
    softMouseLockActive = false;
    resetSoftMouseEdgeTurn();
    mouseLookActive = true;
    gameModeRequested = true;
    document.body.classList.add('game-active');
    document.body.classList.remove('options-open');
    syncReticule();
    return;
  }

  const shouldOpenOptions = gameModeRequested && !optionsDialog.open;
  mouseLookActive = false;
  gameModeRequested = false;
  softMouseLockActive = false;
  resetSoftMouseEdgeTurn();
  lastPointerUnlockAt = performance.now();
  keys.clear();

  if (shouldOpenOptions) {
    openOptions({ releasePointerLock: false });
  }
}

function setupOptions() {
  startButton.addEventListener('click', () => {
    startRandomScene();
  });
  cutUpButton.addEventListener('click', () => {
    startCutUpMode();
  });
  startButton.addEventListener('pointerenter', () => {
    titleButtonState.active = true;
  });
  startButton.addEventListener('pointerleave', () => {
    titleButtonState.active = false;
  });
  startButton.addEventListener('focus', () => {
    titleButtonState.active = true;
  });
  startButton.addEventListener('blur', () => {
    titleButtonState.active = false;
  });
  cutUpButton.addEventListener('pointerenter', () => {
    cutUpButtonState.active = true;
  });
  cutUpButton.addEventListener('pointerleave', () => {
    cutUpButtonState.active = false;
  });
  cutUpButton.addEventListener('focus', () => {
    cutUpButtonState.active = true;
  });
  cutUpButton.addEventListener('blur', () => {
    cutUpButtonState.active = false;
  });

  const bindings = [
    ['invertY', 'invertY'],
    ['showReticule', 'showReticule'],
    ['scanlines', 'scanlines'],
    ['crtDistortion', 'crtDistortion'],
    ['dither', 'dither'],
    ['warping', 'warping'],
    ['colorBleed', 'colorBleed'],
    ['noise', 'noise'],
    ['playerTorch', 'playerTorch'],
    ['zombies', 'zombies'],
    ['debugHudToggle', 'debugHud'],
  ];
  for (const [id, key] of bindings) {
    const input = document.querySelector(`#${id}`);
    input.checked = Boolean(effects[key]);
    input.addEventListener('change', () => {
      effects[key] = input.checked;
      if (key === 'showReticule') syncReticule();
      if (key === 'debugHud') updateDebugHud(0);
    });
  }
  syncReticule();

  const preset = document.querySelector('#preset');
  preset.replaceChildren(...VIDEO_PRESETS.map((definition) => {
    const option = document.createElement('option');
    option.value = definition.id;
    option.textContent = definition.label;
    return option;
  }));
  preset.value = effects.preset;
  preset.addEventListener('change', () => {
    Object.assign(effects, applyVideoPreset(effects, preset.value));
    setRenderResolution(effects.resolutionId);
    syncOptionsControls();
  });

  const scene = document.querySelector('#scene');
  scene.replaceChildren(...SCENE_DEFINITIONS.map((definition) => {
    const option = document.createElement('option');
    option.value = definition.id;
    option.textContent = definition.label;
    return option;
  }));
  syncSceneSelect();
  scene.addEventListener('change', () => {
    const index = SCENE_DEFINITIONS.findIndex((definition) => definition.id === scene.value);
    if (gameState.mode === 'cut-up' && index !== -1) {
      jumpToCutUpScene(index);
    } else {
      setScene(scene.value);
    }
  });

  const resolution = document.querySelector('#resolution');
  resolution.replaceChildren(...PS1_RESOLUTION_MODES.map((mode) => {
    const option = document.createElement('option');
    option.value = mode.id;
    option.textContent = mode.label;
    return option;
  }));
  resolution.value = effects.resolutionId;
  resolution.addEventListener('change', () => {
    setRenderResolution(resolution.value);
  });

  const pixelScale = document.querySelector('#pixelScale');
  pixelScale.value = String(effects.pixelScale);
  pixelScale.addEventListener('input', () => {
    effects.pixelScale = normalizePixelScale(pixelScale.value);
    pixelScale.value = String(effects.pixelScale);
    canvas.style.imageRendering = effects.pixelScale <= 1 ? 'auto' : 'pixelated';
  });

  optionsDialog.addEventListener('close', () => {
    enterGameMode({ requestLock: true });
  });
  optionsDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeOptions();
  });
}

function syncOptionsControls() {
  const bindings = [
    ['invertY', 'invertY'],
    ['showReticule', 'showReticule'],
    ['scanlines', 'scanlines'],
    ['crtDistortion', 'crtDistortion'],
    ['dither', 'dither'],
    ['warping', 'warping'],
    ['colorBleed', 'colorBleed'],
    ['noise', 'noise'],
    ['playerTorch', 'playerTorch'],
    ['zombies', 'zombies'],
    ['debugHudToggle', 'debugHud'],
  ];
  for (const [id, key] of bindings) {
    const input = document.querySelector(`#${id}`);
    if (input) input.checked = Boolean(effects[key]);
  }

  const preset = document.querySelector('#preset');
  if (preset) preset.value = effects.preset;

  const resolution = document.querySelector('#resolution');
  if (resolution) resolution.value = effects.resolutionId;

  const pixelScale = document.querySelector('#pixelScale');
  if (pixelScale) pixelScale.value = String(effects.pixelScale);

  canvas.style.imageRendering = effects.pixelScale <= 1 ? 'auto' : 'pixelated';
  syncReticule();
  updateDebugHud(0);
}

function startRandomScene() {
  if (!titleActive) return;

  gameState.mode = 'normal';
  cutUpState.active = false;
  cutUpHud.hidden = true;
  ensureSceneAudio();
  playMenuStartConfirmSound();
  playTransitionOneShot(FREE_ROAM_START_SOUND_URL);
  const randomScene = SCENE_DEFINITIONS[Math.floor(Math.random() * SCENE_DEFINITIONS.length)];
  setScene(randomScene.id);
  syncSceneSelect();
  leaveTitleScreen();
}

function startCutUpMode() {
  if (!titleActive) return;

  gameState.mode = 'cut-up';
  cutUpState.active = true;
  cutUpState.unlockedSceneCount = CUT_UP_SCENE_COUNT;
  cutUpState.activeSceneIndex = 0;
  cutUpState.sceneStartedAt = performance.now();
  cutUpState.flashStartedAt = -Infinity;
  cutUpState.lastCutUpCountdownTick = null;
  cutUpState.sceneStates.clear();
  ensureSceneAudio();
  playMenuStartConfirmSound();
  playTransitionOneShot(CUT_UP_START_SOUND_URL);
  setScene(SCENE_DEFINITIONS[0].id);
  healthPotions = createSceneHealthPotions(world);
  resetPlayerToSpawn();
  rebuildWarehouseMesh();
  syncSceneSelect();
  leaveTitleScreen();
  updateCutUpHud(cutUpState.sceneStartedAt);
}

function leaveTitleScreen() {
  titleActive = false;
  titleScreen.hidden = true;
  document.body.classList.remove('title-active');
  enterGameMode({ requestLock: true });
}

const TITLE_WIDTH = 512;
const TITLE_HEIGHT = 480;
const TITLE_FONT = Object.freeze({
  ' ': ['0', '0', '0', '0', '0', '0', '0'],
  '-': ['00000', '00000', '00000', '11110', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '[': ['111', '100', '100', '100', '100', '100', '111'],
  ']': ['111', '001', '001', '001', '001', '001', '111'],
  '1': ['01100', '11100', '01100', '01100', '01100', '01100', '11110'],
  '2': ['11110', '00010', '00010', '11110', '10000', '10000', '11110'],
  '5': ['11110', '10000', '10000', '11110', '00010', '00010', '11110'],
  a: ['01100', '10010', '10010', '11110', '10010', '10010', '10010'],
  b: ['11100', '10010', '10010', '11100', '10010', '10010', '11100'],
  c: ['01110', '10000', '10000', '10000', '10000', '10000', '01110'],
  d: ['11100', '10010', '10010', '10010', '10010', '10010', '11100'],
  e: ['11110', '10000', '10000', '11100', '10000', '10000', '11110'],
  f: ['11110', '10000', '10000', '11100', '10000', '10000', '10000'],
  g: ['01110', '10000', '10000', '10110', '10010', '10010', '01110'],
  h: ['10010', '10010', '10010', '11110', '10010', '10010', '10010'],
  i: ['11100', '01000', '01000', '01000', '01000', '01000', '11100'],
  l: ['10000', '10000', '10000', '10000', '10000', '10000', '11110'],
  m: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  n: ['10010', '11010', '10110', '10010', '10010', '10010', '10010'],
  o: ['01100', '10010', '10010', '10010', '10010', '10010', '01100'],
  p: ['11100', '10010', '10010', '11100', '10000', '10000', '10000'],
  r: ['11100', '10010', '10010', '11100', '10100', '10010', '10010'],
  s: ['01110', '10000', '10000', '01100', '00010', '00010', '11100'],
  t: ['11110', '00100', '00100', '00100', '00100', '00100', '00100'],
  u: ['10010', '10010', '10010', '10010', '10010', '10010', '01100'],
  w: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  z: ['11110', '00010', '00100', '01000', '10000', '10000', '11110'],
});

function renderTitleScreen(time) {
  titleContext.imageSmoothingEnabled = false;
  titleContext.clearRect(0, 0, TITLE_WIDTH, TITLE_HEIGHT);
  drawTitleBackdrop(time);
  drawCenteredBitmapText('ps1-world', 148, 9, '#17100b', time, { x: 7, y: 8 });
  drawCenteredBitmapText('ps1-world', 148, 9, '#1ca6a5', time, { x: -2, y: 1 });
  drawCenteredBitmapText('ps1-world', 148, 9, '#b42638', time, { x: 3, y: 0 });
  drawCenteredBitmapText('ps1-world', 148, 9, '#f3dc92', time);
  drawBloodWarningText(time);
  const titleButtonBlink = getTitleButtonBlink(time);
  drawBitmapButton(time, { y: 286, label: 'start', detail: 'free roam', active: titleButtonState.active, blink: titleButtonBlink });
  drawBitmapButton(time, { y: 346, label: 'start', detail: 'cut-up mode', active: cutUpButtonState.active, blink: titleButtonBlink });
  drawCenteredBitmapText('wasd+mouse or gamepad', 404, 2, '#cfc7aa', time);
}

function drawBloodWarningText(time) {
  const text = 'watch out for the zombies';
  const y = 252;
  const scale = 2;
  drawCenteredBitmapText(text, y + 2, scale, '#280205', time, { x: 1, y: 1 });
  drawCenteredBitmapText(text, y + 1, scale, '#5e0b16', time, { x: Math.sin(time * 9) > 0.72 ? 1 : 0, y: 0 });
  drawCenteredBitmapText(text, y, scale, '#b42638', time);
  drawBloodDrips(text, y, scale, time);
}

function drawBloodDrips(text, y, scale, time) {
  const width = measureBitmapText(text, scale);
  const x = Math.floor((TITLE_WIDTH - width) / 2);
  const dripColumns = [20, 82, 142, 198];
  titleContext.fillStyle = '#5e0b16';
  for (const column of dripColumns) {
    const length = 4 + Math.floor(Math.abs(Math.sin(time * 3.2 + column)) * 6);
    titleContext.fillRect(x + column, y + 15, scale, length);
  }
}

function drawTitleBackdrop(time) {
  const pulse = Math.sin(time * 1.7) * 10;
  const gradient = titleContext.createRadialGradient(256, 218, 12, 256, 218, 260);
  gradient.addColorStop(0, '#321316');
  gradient.addColorStop(0.34, '#180b0c');
  gradient.addColorStop(1, '#050505');
  titleContext.fillStyle = gradient;
  titleContext.fillRect(0, 0, TITLE_WIDTH, TITLE_HEIGHT);

  titleContext.fillStyle = 'rgba(242, 213, 138, 0.035)';
  for (let y = 0; y < TITLE_HEIGHT; y += 4) {
    titleContext.fillRect(0, y, TITLE_WIDTH, 1);
  }

  titleContext.fillStyle = 'rgba(42, 176, 181, 0.07)';
  for (let x = 0; x < TITLE_WIDTH; x += 32) {
    const jitter = Math.floor(Math.sin(time * 2 + x) * 2);
    titleContext.fillRect(x + jitter, 0, 1, TITLE_HEIGHT);
  }

  titleContext.fillStyle = 'rgba(190, 38, 54, 0.12)';
  titleContext.fillRect(132, 186 + Math.floor(pulse / 8), 248, 94);
}

function drawBitmapButton(time, options) {
  const width = 184;
  const height = 46;
  const textScale = 2;
  const x = Math.floor((TITLE_WIDTH - width) / 2);
  const y = options.y;
  const active = options.active || options.blink;
  titleContext.fillStyle = active ? '#f0d38a' : '#17110d';
  titleContext.fillRect(x, y, width, height);
  titleContext.fillStyle = active ? '#17110d' : '#f0d38a';
  titleContext.fillRect(x, y, width, 3);
  titleContext.fillRect(x, y + height - 3, width, 3);
  titleContext.fillRect(x, y, 3, height);
  titleContext.fillRect(x + width - 3, y, 3, height);
  drawCenteredBitmapText(options.label, y + 6, textScale, active ? '#17110d' : '#f7e9b7', time);
  drawCenteredBitmapText(options.detail, y + 25, textScale, active ? '#2b2116' : '#cfc7aa', time);
}

function getTitleButtonBlink(time) {
  return Math.sin(time * 5) > 0.74;
}

function drawCenteredBitmapText(text, y, scale, color, time, offset = { x: 0, y: 0 }) {
  const width = measureBitmapText(text, scale);
  const snap = Math.sin(time * 24 + y) > 0.92 ? 1 : 0;
  drawBitmapText(text, Math.floor((TITLE_WIDTH - width) / 2 + offset.x + snap), y + offset.y, scale, color);
}

function drawBitmapText(text, x, y, scale, color) {
  let cursor = x;
  titleContext.fillStyle = color;

  for (const character of text) {
    const glyph = TITLE_FONT[character] ?? TITLE_FONT[' '];
    drawBitmapGlyph(glyph, cursor, y, scale);
    cursor += (glyph[0].length + 1) * scale;
  }
}

function drawBitmapGlyph(glyph, x, y, scale) {
  for (let row = 0; row < glyph.length; row += 1) {
    for (let column = 0; column < glyph[row].length; column += 1) {
      if (glyph[row][column] === '1') {
        titleContext.fillRect(x + column * scale, y + row * scale, scale, scale);
      }
    }
  }
}

function measureBitmapText(text, scale) {
  return [...text].reduce((width, character, index) => {
    const glyph = TITLE_FONT[character] ?? TITLE_FONT[' '];
    return width + glyph[0].length * scale + (index === text.length - 1 ? 0 : scale);
  }, 0);
}

function toggleOptions() {
  if (optionsDialog.open) {
    closeOptions();
  } else {
    openOptions();
  }
}

function openOptions(options = {}) {
  const releasePointerLock = options.releasePointerLock ?? true;
  keys.clear();
  mouseLookActive = false;
  gameModeRequested = false;
  softMouseLockActive = false;
  resetSoftMouseEdgeTurn();
  document.body.classList.add('options-open');
  document.body.classList.remove('game-active');
  if (releasePointerLock && document.pointerLockElement) document.exitPointerLock();
  if (!optionsDialog.open) {
    playUiOneShot(OPTIONS_OPEN_SOUND_URL);
    optionsDialog.showModal();
  }
}

function closeOptions() {
  keys.clear();
  if (optionsDialog.open) {
    playUiOneShot(OPTIONS_CLOSE_SOUND_URL);
    optionsDialog.close();
  } else {
    enterGameMode({ requestLock: true });
  }
}

function enterGameMode(options = {}) {
  gameModeRequested = true;
  mouseLookActive = hasActiveMouseCapture();
  document.body.classList.add('game-active');
  document.body.classList.remove('options-open');
  syncReticule();
  if (options.requestLock) requestPointerLockSafely();
}

function syncReticule() {
  reticule.hidden = !effects.showReticule;
}

function updateDebugHud(dt) {
  const instantFps = dt > 0 ? 1 / dt : 0;
  debugHud.fps = debugHud.fps ? debugHud.fps * 0.9 + instantFps * 0.1 : instantFps;

  if (!debugHudPanel) return;

  debugHudPanel.hidden = !effects.debugHud;
  if (!effects.debugHud) return;

  const zombieCount = zombies.length;
  const enemyCount = effects.zombies ? zombieCount : 0;
  if (debugFps) debugFps.textContent = String(Math.round(debugHud.fps));
  if (debugZombies) debugZombies.textContent = String(zombieCount);
  if (debugEnemies) debugEnemies.textContent = String(enemyCount);
}

function damagePlayer(now) {
  if (now - lastZombieBiteAt < ZOMBIE_BITE_COOLDOWN_MS) return;

  lastZombieBiteAt = now;
  playerHealth = applyPlayerDamage(playerHealth, ZOMBIE_BITE_DAMAGE);
  playPlayerOneShot(PLAYER_DAMAGE_SOUND_URL, PLAYER_DAMAGE_SOUND_GAIN);
  if (playerHealth.dead) {
    startDeathSequence(now, { damage: false });
  }
}

function updateHealthPotions(now) {
  const pickedIndex = healthPotions.findIndex((potion) => (
    Math.hypot(player.x - potion.x, player.z - potion.z) <= (potion.radius ?? 0.72)
    && Math.abs((player.y - PLAYER_EYE_HEIGHT) - (potion.y - potion.height / 2)) <= 1.2
  ));
  if (pickedIndex === -1) return;

  playerHealth = restorePlayerHealth(playerHealth);
  healthPickupFlashStartedAt = now;
  playPlayerOneShot(HEALTH_PICKUP_SOUND_URL, HEALTH_PICKUP_SOUND_GAIN);
  healthPotions = healthPotions.filter((_, index) => index !== pickedIndex);
  rebuildWarehouseMesh();
}

function getHealthEffectStrength(now) {
  if (titleActive || optionsDialog.open || deathState.active) return { danger: 0, pulse: 0 };

  const danger = getHealthDanger(playerHealth);
  if (danger <= 0) return { danger: 0, pulse: 0 };

  const pulse = (Math.sin(now * 0.012) * 0.5 + 0.5) * danger;
  return {
    danger,
    pulse: danger >= 1 ? pulse : pulse * 0.48,
  };
}

function getHealthPickupFlash(now) {
  const elapsed = now - healthPickupFlashStartedAt;
  if (elapsed < 0 || elapsed > HEALTH_PICKUP_FLASH_DURATION_MS) return 0;

  const progress = elapsed / HEALTH_PICKUP_FLASH_DURATION_MS;
  return (1 - progress) * (1 - progress);
}

function startDeathSequence(now, options = {}) {
  if (deathState.active) return;

  const scene = createDeathScene(now, options);
  deathState.active = true;
  deathState.startedAt = now;
  deathState.profile = scene.profile;
  deathState.cameraStart = scene.cameraStart;
  deathState.cameraImpactY = scene.cameraImpactY;
  keys.clear();
  player.velocityY = 0;
  player.grounded = false;
  if (options.damage) {
    playPlayerOneShot(PLAYER_DAMAGE_SOUND_URL, PLAYER_DAMAGE_SOUND_GAIN);
  }
  playPlayerOneShot(PLAYER_DEATH_SOUND_URL, PLAYER_DEATH_SOUND_GAIN);
}

function updateDeathSequence(now) {
  const finalProgress = getDeathSceneFinalProgress(now);
  if (finalProgress > 0.14 && !deathState.finalDeathRattlePlayed) {
    deathState.finalDeathRattlePlayed = true;
    playFinalDeathRattle();
  }

  if (now - deathState.startedAt < DEATH_RESPAWN_DELAY_MS) return;

  deathState.active = false;
  deathState.profile = null;
  deathState.cameraStart = null;
  deathState.cameraImpactY = 0;
  deathState.finalDeathRattlePlayed = false;
  resetPlayerToSpawn();
}

function createDeathScene(now, options = {}) {
  const profile = DEATH_SCENE_PROFILES[options.profile ?? 'collapseSplat'];
  const startY = player.y;
  const floorY = (player.groundY ?? world.playerSpawn.y) + 0.22;
  const cameraImpactY = Math.min(floorY, startY - profile.dropDistance);
  return {
    startedAt: now,
    profile,
    cameraStart: {
      x: player.x,
      y: startY,
      z: player.z,
      yaw: player.yaw,
      pitch: player.pitch,
    },
    cameraImpactY,
  };
}

function getDeathSceneCamera(now) {
  if (!deathState.cameraStart || !deathState.profile) return player;

  const progress = getDeathSceneProgress(now);
  const profile = deathState.profile;
  const impactProgress = Math.min(1, progress / profile.impactAt);
  const fall = easeInCubic(impactProgress);
  const afterImpact = Math.max(0, (progress - profile.impactAt) / (1 - profile.impactAt));
  const impactBounce = Math.sin(afterImpact * Math.PI * profile.bounceCount)
    * (1 - afterImpact)
    * profile.bounceHeight;
  const finalJiggle = getDeathSceneFinalProgress(now);
  const finalJiggleStrength = finalJiggle * profile.finalJiggleStrength;
  const cameraJiggleYaw = Math.sin(progress * 122.0) * finalJiggleStrength;
  const cameraJigglePitch = Math.cos(progress * 147.0) * finalJiggleStrength * 0.7;

  return {
    ...deathState.cameraStart,
    y: deathState.cameraStart.y + (deathState.cameraImpactY - deathState.cameraStart.y) * fall + impactBounce,
    yaw: deathState.cameraStart.yaw + cameraJiggleYaw,
    pitch: Math.min(1.28, deathState.cameraStart.pitch + profile.pitchDrop * smoothStep(progress) + cameraJigglePitch),
  };
}

function getDeathSceneProgress(now) {
  if (!deathState.active) return 0;
  return Math.max(0, Math.min(1, (now - deathState.startedAt) / DEATH_RESPAWN_DELAY_MS));
}

function getDeathSceneFinalProgress(now) {
  if (!deathState.active || !deathState.profile) return 0;

  const progress = getDeathSceneProgress(now);
  const start = deathState.profile.finalJiggleStart;
  return smoothStep(Math.max(0, Math.min(1, (progress - start) / (1 - start))));
}

function playFinalDeathRattle() {
  const state = ensureAudioState();
  if (!state) return;

  const now = state.context.currentTime;
  playHeartbeatThump(state, now, 54, 0.12);
  playHeartbeatThump(state, now + 0.11, 41, 0.09);
}

function getDeathTint(now) {
  if (!deathState.active) return 0;

  const elapsed = now - deathState.startedAt;
  const progress = getDeathSceneProgress(now);
  const finalProgress = getDeathSceneFinalProgress(now);
  const pulse = Math.sin(elapsed * 0.018) * 0.08;
  return Math.max(0, Math.min(0.93, 0.32 + smoothStep(progress) * 0.42 + finalProgress * 0.16 + pulse));
}

function easeInCubic(value) {
  return value * value * value;
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function syncSceneSelect() {
  const scene = document.querySelector('#scene');
  if (scene) scene.value = effects.sceneId;
}

function updateCutUpMode(now) {
  if (!cutUpState.active || titleActive || optionsDialog.open || deathState.active) {
    updateCutUpHud(now);
    return;
  }

  if (shouldAdvanceCutUpScene(cutUpState, now)) {
    const nextIndex = getNextCutUpSceneIndex(cutUpState);
    jumpToCutUpScene(nextIndex, now);
    return;
  }

  updateCutUpHud(now);
}

function jumpToCutUpScene(index, now = performance.now()) {
  if (!cutUpState.active || index < 0 || index >= cutUpState.unlockedSceneCount) return;

  captureCutUpSceneState();
  cutUpState.activeSceneIndex = index;
  cutUpState.sceneStartedAt = now;
  cutUpState.flashStartedAt = now;
  cutUpState.lastCutUpCountdownTick = null;
  if (audioState) {
    audioState.lastCutUpCountdownTick = null;
    audioState.cutUpAudioDuckStartedAt = now;
  }
  playTransitionOneShot(CUT_UP_SCENE_SLICE_SOUND_URL);
  const sceneId = SCENE_DEFINITIONS[index].id;
  setScene(sceneId);
  restoreCutUpSceneState(sceneId);
  syncSceneSelect();
  updateCutUpHud(now);
}

function captureCutUpSceneState() {
  if (!cutUpState.active) return;

  cutUpState.sceneStates.set(world.id, {
    player: { ...player },
    playerHealth: { ...playerHealth },
    healthPotions: healthPotions.map((potion) => ({ ...potion })),
    zombies: zombies.map((zombie) => ({ ...zombie })),
    lastZombieBiteAt,
    healthPickupFlashStartedAt,
  });
}

function restoreCutUpSceneState(sceneId) {
  const state = cutUpState.sceneStates.get(sceneId);
  if (!state) return;

  Object.assign(player, state.player);
  playerHealth = createPlayerHealth(state.playerHealth.value);
  healthPotions = state.healthPotions.map((potion) => ({ ...potion }));
  zombies = state.zombies.map((zombie) => ({ ...zombie }));
  lastZombieBiteAt = state.lastZombieBiteAt;
  healthPickupFlashStartedAt = state.healthPickupFlashStartedAt;
  rebuildWarehouseMesh();
}

function updateCutUpHud(now = performance.now()) {
  cutUpHud.hidden = gameState.mode !== 'cut-up' || titleActive;
  if (cutUpHud.hidden) return;

  cutUpHud.textContent = getCutUpHudText(cutUpState, SCENE_DEFINITIONS, now);
}

function getSceneShortcutIndex(code) {
  const match = code.match(/^(?:Digit([0-9])|Numpad([0-9]))$/);
  if (!match) return -1;

  const keyNumber = Number(match[1] ?? match[2]);
  return keyNumber === 0 ? 9 : keyNumber - 1;
}

function setRenderResolution(id) {
  const next = getResolutionMode(id);
  if (renderResolution.id === next.id) return;

  effects.resolutionId = next.id;
  renderResolution = next;
  deleteRenderTarget(gl, renderTarget);
  renderTarget = createRenderTarget(gl, renderResolution.width, renderResolution.height);
}

async function setScene(id) {
  const requestId = ++sceneLoadRequest;
  const nextWorld = await createSceneRuntimeWorld(id);
  if (requestId !== sceneLoadRequest) return;

  if (world.id === nextWorld.id) {
    syncSceneSelect();
    return;
  }

  effects.sceneId = nextWorld.id;
  world = nextWorld;
  textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
  colliders = getSceneColliders(world);
  walkableSurfaces = getSceneWalkableSurfaces(world);
  healthPotions = createSceneHealthPotions(world);
  resetPlayerToSpawn();

  deleteMeshBuffers(gl, warehouseMesh);
  deleteMeshBuffers(gl, zombieMesh);
  gl.deleteTexture(atlasTexture);
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions }, textureIndices);
  zombieMesh = createZombieMesh(gl);
  atlasTexture = await createSceneTextureAtlas(gl, world, zombieTextureImage);
  if (audioState) ensureSceneAudio();
  syncSceneSelect();
}

async function createSceneRuntimeWorld(id) {
  const fallback = createSceneWorld(id);
  if (!LEVEL_GLB_URLS[fallback.id]) return fallback;

  try {
    const levelAsset = await getLoadedLevel(fallback.id);
    return createWorldFromLevelAsset(fallback, levelAsset);
  } catch (error) {
    console.warn(`Falling back to procedural scene ${fallback.id}:`, error);
    return fallback;
  }
}

async function getLoadedLevel(id) {
  if (!loadedLevels.has(id)) {
    loadedLevels.set(id, loadLevelGlb(id));
  }
  return loadedLevels.get(id);
}

function createWorldFromLevelAsset(fallback, levelAsset) {
  return {
    ...fallback,
    levelAsset,
    playerSpawn: levelAsset.playerSpawn ?? fallback.playerSpawn,
    zombieSpawns: levelAsset.zombieSpawns.length ? levelAsset.zombieSpawns : fallback.zombieSpawns,
    healthPotions: levelAsset.healthPotions.length ? levelAsset.healthPotions : fallback.healthPotions,
    lights: levelAsset.lights.length ? levelAsset.lights : fallback.lights,
    torchLights: levelAsset.torchLights.length ? levelAsset.torchLights : fallback.torchLights,
    killY: levelAsset.killY ?? fallback.killY,
    textures: createLevelTextureDescriptors(levelAsset, fallback),
  };
}

function resetPlayerToSpawn() {
  deathState.active = false;
  deathState.startedAt = 0;
  deathState.profile = null;
  deathState.cameraStart = null;
  deathState.cameraImpactY = 0;
  deathState.finalDeathRattlePlayed = false;
  player.x = world.playerSpawn.x;
  player.y = world.playerSpawn.y;
  player.z = world.playerSpawn.z;
  player.yaw = world.playerSpawn.yaw;
  player.pitch = 0;
  player.velocityY = 0;
  player.grounded = true;
  player.groundY = getGroundYAt(player, walkableSurfaces) ?? world.playerSpawn.y;
  playerHealth = createPlayerHealth();
  healthPickupFlashStartedAt = -Infinity;
  lastZombieBiteAt = -Infinity;
  zombies = createZombieEnemies(world);
}

function createSceneHealthPotions(scene) {
  return (scene.healthPotions ?? []).map((potion) => ({ ...potion }));
}

function rebuildWarehouseMesh() {
  deleteMeshBuffers(gl, warehouseMesh);
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions }, textureIndices);
}

function getSceneColliders(scene) {
  if (scene.levelAsset) {
    return scene.levelAsset.collision.map((collider) => ({
      minX: collider.minX,
      maxX: collider.maxX,
      minY: collider.minY,
      maxY: collider.maxY,
      minZ: collider.minZ,
      maxZ: collider.maxZ,
    }));
  }

  return [...scene.walls, ...scene.crates, ...(scene.platforms ?? [])]
    .map((item) => item.collider)
    .filter(Boolean);
}

function getSceneWalkableSurfaces(scene) {
  if (scene.levelAsset) {
    return scene.levelAsset.walkableSurfaces.map((surface) => ({
      minX: surface.minX,
      maxX: surface.maxX,
      minZ: surface.minZ,
      maxZ: surface.maxZ,
      topY: surface.topY,
    }));
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

function createSceneMesh(glContext, scene, indices) {
  if (scene.levelAsset) {
    return createLevelMesh(glContext, scene, indices);
  }
  return createWarehouseMesh(glContext, scene, indices);
}

function createLevelMesh(glContext, scene, indices) {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [], motions: [] };

  for (const mesh of scene.levelAsset.artMeshes) {
    const textureId = indices.get(`level:${mesh.material}`) ?? 0;
    for (const vertex of mesh.vertices) {
      geometry.positions.push(vertex.x, vertex.y, vertex.z);
      geometry.uvs.push(vertex.u, vertex.v);
      geometry.textureIds.push(textureId);
      geometry.shades.push(0.92);
      geometry.motions.push(0);
    }
  }

  if (scene.healthPotions) {
    for (const item of scene.healthPotions) {
      addHealthPotionFlask(geometry, item, indices);
    }
  }

  return {
    count: geometry.positions.length / 3,
    position: createBuffer(glContext, new Float32Array(geometry.positions)),
    uv: createBuffer(glContext, new Float32Array(geometry.uvs)),
    textureId: createBuffer(glContext, new Float32Array(geometry.textureIds)),
    shade: createBuffer(glContext, new Float32Array(geometry.shades)),
    motion: createBuffer(glContext, new Float32Array(geometry.motions)),
  };
}

function createWarehouseMesh(glContext, scene, indices) {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [], motions: [] };
  const floorPieces = scene.floorPieces ?? [scene.floor];
  for (const floorPiece of floorPieces) {
    addBox(geometry, floorPiece, indices, { floor: true, shade: 0.72, uvScale: 2.5, motion: motionCode(floorPiece.motion) });
  }
  if (scene.ceiling) {
    addBox(geometry, scene.ceiling, indices, { ceiling: true, shade: 0.42, uvScale: 2.0 });
  }

  for (const wall of scene.walls) {
    addBox(geometry, wall, indices, { shade: wall.height < 2 ? 0.72 : 0.88, uvScale: 1.0, motion: motionCode(wall.motion) });
  }

  for (const platform of scene.platforms ?? []) {
    addBox(geometry, platform, indices, { shade: 0.76, uvScale: 1.0, motion: motionCode(platform.motion) });
  }

  for (const crateItem of scene.crates) {
    addBox(geometry, crateItem, indices, { shade: 0.8, uvScale: 1.0, motion: motionCode(crateItem.motion) });
  }

  for (const prop of scene.props ?? []) {
    addBox(geometry, prop, indices, { shade: 0.82, uvScale: 1.0, motion: motionCode(prop.motion) });
  }

  for (const mountainItem of scene.mountains) {
    addMountain(geometry, mountainItem, indices);
  }

  if (scene.cards) {
    for (const item of scene.cards) {
      addCard(geometry, item, indices);
    }
  }

  if (scene.healthPotions) {
    for (const item of scene.healthPotions) {
      addHealthPotionFlask(geometry, item, indices);
    }
  }

  if (scene.movingBillboards) {
    for (const item of scene.movingBillboards) {
      addCard(geometry, item, indices);
    }
  }

  if (scene.stars) {
    addStars(geometry, scene.stars, indices);
  }

  if (scene.shootingStar) {
    addShootingStar(geometry, scene.shootingStar, indices);
  }

  if (scene.lightning) {
    addLightningBolts(geometry, scene.lightning, indices);
  }

  if (scene.rain) {
    addRain(geometry, scene.rain, indices);
  }

  if (scene.sun) {
    addSun(geometry, scene.sun, indices);
  }

  return {
    count: geometry.positions.length / 3,
    position: createBuffer(glContext, new Float32Array(geometry.positions)),
    uv: createBuffer(glContext, new Float32Array(geometry.uvs)),
    textureId: createBuffer(glContext, new Float32Array(geometry.textureIds)),
    shade: createBuffer(glContext, new Float32Array(geometry.shades)),
    motion: createBuffer(glContext, new Float32Array(geometry.motions)),
  };
}

function createZombieMesh(glContext) {
  return {
    count: 0,
    position: createDynamicBuffer(glContext),
    uv: createDynamicBuffer(glContext),
    textureId: createDynamicBuffer(glContext),
    shade: createDynamicBuffer(glContext),
    motion: createDynamicBuffer(glContext),
  };
}

function updateZombieMesh(glContext, mesh, zombieList, indices, model = null, time = 0) {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [], motions: [] };
  const animatedVertices = model ? animateZombieModel(model, time) : null;
  for (const zombie of zombieList) {
    if (animatedVertices) {
      addZombieModel(geometry, zombie, animatedVertices, indices);
    } else {
      addZombieCard(geometry, zombie, indices);
    }
  }

  mesh.count = geometry.positions.length / 3;
  updateBuffer(glContext, mesh.position, new Float32Array(geometry.positions));
  updateBuffer(glContext, mesh.uv, new Float32Array(geometry.uvs));
  updateBuffer(glContext, mesh.textureId, new Float32Array(geometry.textureIds));
  updateBuffer(glContext, mesh.shade, new Float32Array(geometry.shades));
  updateBuffer(glContext, mesh.motion, new Float32Array(geometry.motions));
}

function addZombieModel(geometry, zombie, vertices, indices) {
  const textureId = indices.get('zombie') ?? 0;
  const motion = motionCode('zombie-walk');
  const zombieMasterYaw = zombie.yaw;
  const zombieModelYaw = ZOMBIE_MODEL_FRONT_ROTATION;
  const feetY = zombie.y - PLAYER_EYE_HEIGHT;

  for (const vertex of vertices) {
    const localX = vertex.x * ZOMBIE_MODEL_SCALE;
    const localY = vertex.y * ZOMBIE_MODEL_SCALE;
    const localZ = vertex.z * ZOMBIE_MODEL_SCALE;
    const modelSpace = rotateZombieLocalVertex(localX, localY, localZ, zombieModelYaw);
    const worldSpace = rotateZombieMasterVertex(modelSpace.x, modelSpace.y, modelSpace.z, zombieMasterYaw);
    geometry.positions.push(
      zombie.x + worldSpace.x,
      feetY + worldSpace.y,
      zombie.z + worldSpace.z,
    );
    geometry.uvs.push(vertex.u, vertex.v);
    geometry.textureIds.push(textureId);
    geometry.shades.push(0.98);
    geometry.motions.push(motion);
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

function addZombieCard(geometry, zombie, indices) {
  const textureId = indices.get('zombie') ?? 0;
  const motion = motionCode('zombie-walk');
  const width = 0.95;
  const height = 1.75;
  const halfWidth = width / 2;
  const feetY = zombie.y - PLAYER_EYE_HEIGHT;
  const minY = feetY;
  const maxY = feetY + height;

  face(geometry, textureId, 1.05, [
    [zombie.x - halfWidth, minY, zombie.z],
    [zombie.x + halfWidth, minY, zombie.z],
    [zombie.x + halfWidth, maxY, zombie.z],
    [zombie.x - halfWidth, maxY, zombie.z],
  ], 1, 1, motion);
  face(geometry, textureId, 0.92, [
    [zombie.x, minY, zombie.z - halfWidth],
    [zombie.x, minY, zombie.z + halfWidth],
    [zombie.x, maxY, zombie.z + halfWidth],
    [zombie.x, maxY, zombie.z - halfWidth],
  ], 1, 1, motion);
}

function addBox(geometry, item, indices, options = {}) {
  const minX = item.x - item.width / 2;
  const maxX = item.x + item.width / 2;
  const minZ = item.z - item.depth / 2;
  const maxZ = item.z + item.depth / 2;
  const minY = item.y;
  const maxY = item.y + item.height;
  const textureId = indices.get(item.texture) ?? 0;
  const shade = options.shade ?? 0.85;
  const uvScale = options.uvScale ?? 1;
  const motion = options.motion ?? 0;

  face(geometry, textureId, shade * 0.92, [
    [minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ],
  ], item.width / uvScale, item.height / uvScale, motion);
  face(geometry, textureId, shade * 0.72, [
    [maxX, minY, minZ], [minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ],
  ], item.width / uvScale, item.height / uvScale, motion);
  face(geometry, textureId, shade * 0.82, [
    [minX, minY, minZ], [minX, minY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ],
  ], item.depth / uvScale, item.height / uvScale, motion);
  face(geometry, textureId, shade, [
    [maxX, minY, maxZ], [maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ],
  ], item.depth / uvScale, item.height / uvScale, motion);
  face(geometry, textureId, shade * 1.08, [
    [minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ], [minX, maxY, minZ],
  ], item.width / uvScale, item.depth / uvScale, motion);
}

function addMountain(geometry, item, indices) {
  const minX = item.x - item.width / 2;
  const maxX = item.x + item.width / 2;
  const minZ = item.z - item.depth / 2;
  const maxZ = item.z + item.depth / 2;
  const baseY = item.y;
  const apex = [item.x, item.y + item.height, item.z - item.depth * 0.08];
  const textureId = indices.get(item.texture) ?? 0;

  triangle(geometry, textureId, 0.82, [minX, baseY, maxZ], [maxX, baseY, maxZ], apex, item.width / 4, item.height / 4);
  triangle(geometry, textureId, 0.62, [maxX, baseY, maxZ], [maxX, baseY, minZ], apex, item.depth / 4, item.height / 4);
  triangle(geometry, textureId, 0.48, [maxX, baseY, minZ], [minX, baseY, minZ], apex, item.width / 4, item.height / 4);
  triangle(geometry, textureId, 0.7, [minX, baseY, minZ], [minX, baseY, maxZ], apex, item.depth / 4, item.height / 4);
}

function addSun(geometry, item, indices) {
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const textureId = indices.get(item.texture) ?? 0;

  face(geometry, textureId, 1.35, [
    [item.x - halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y + halfHeight, item.z],
    [item.x - halfWidth, item.y + halfHeight, item.z],
  ], 1, 1);
}

function addCard(geometry, item, indices) {
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const textureId = indices.get(item.texture) ?? 0;
  face(geometry, textureId, 1.18, [
    [item.x - halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y + halfHeight, item.z],
    [item.x - halfWidth, item.y + halfHeight, item.z],
  ], 1, 1, motionCode(item.motion));
}

function addHealthPotionFlask(geometry, item, indices) {
  const motion = motionCode(item.motion);
  const baseY = item.y - item.height / 2;
  const depth = item.depth ?? item.width * 0.62;
  const bodyHeight = item.height * 0.62;
  const neckHeight = item.height * 0.22;
  const capHeight = item.height * 0.1;
  const frontZ = item.z - depth / 2 - 0.018;

  addBox(geometry, {
    name: `${item.name} body`,
    x: item.x,
    y: baseY,
    z: item.z,
    width: item.width,
    depth,
    height: bodyHeight,
    texture: item.texture,
  }, indices, { shade: 1.08, uvScale: 1, motion });
  addBox(geometry, {
    name: `${item.name} neck`,
    x: item.x,
    y: baseY + bodyHeight,
    z: item.z,
    width: item.width * 0.42,
    depth: depth * 0.62,
    height: neckHeight,
    texture: item.texture,
  }, indices, { shade: 1.18, uvScale: 1, motion });
  addBox(geometry, {
    name: `${item.name} cap`,
    x: item.x,
    y: baseY + bodyHeight + neckHeight,
    z: item.z,
    width: item.width * 0.56,
    depth: depth * 0.72,
    height: capHeight,
    texture: item.texture,
  }, indices, { shade: 0.72, uvScale: 1, motion });
  addBox(geometry, {
    name: `${item.name} front cross vertical`,
    x: item.x,
    y: baseY + bodyHeight * 0.31,
    z: frontZ,
    width: item.width * 0.13,
    depth: 0.035,
    height: bodyHeight * 0.45,
    texture: item.texture,
  }, indices, { shade: 1.45, uvScale: 1, motion });
  addBox(geometry, {
    name: `${item.name} front cross horizontal`,
    x: item.x,
    y: baseY + bodyHeight * 0.45,
    z: frontZ - 0.002,
    width: item.width * 0.36,
    depth: 0.038,
    height: bodyHeight * 0.12,
    texture: item.texture,
  }, indices, { shade: 1.5, uvScale: 1, motion });
}

function addStars(geometry, stars, indices) {
  const textureId = indices.get('star') ?? 0;

  for (const star of stars) {
    const halfWidth = star.width / 2;
    const halfHeight = star.height / 2;
    face(geometry, textureId, 1.4, [
      [star.x - halfWidth, star.y - halfHeight, star.z],
      [star.x + halfWidth, star.y - halfHeight, star.z],
      [star.x + halfWidth, star.y + halfHeight, star.z],
      [star.x - halfWidth, star.y + halfHeight, star.z],
    ], 1, 1);
  }
}

function addShootingStar(geometry, item, indices) {
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const textureId = indices.get(item.texture) ?? 0;

  face(geometry, textureId, 1.6, [
    [item.x - halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y + halfHeight, item.z],
    [item.x - halfWidth, item.y + halfHeight, item.z],
  ], 1, 1);
}

function addLightningBolts(geometry, lightning, indices) {
  const textureId = indices.get(lightning.texture) ?? 0;

  for (const bolt of lightning.bolts) {
    for (let i = 0; i < bolt.points.length - 1; i += 1) {
      addLightningSegment(geometry, textureId, bolt.points[i], bolt.points[i + 1], bolt.width ?? 0.14);
    }
  }
}

function addLightningSegment(geometry, textureId, start, end, width) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ox = -dy / length * width;
  const oy = dx / length * width;

  face(geometry, textureId, 1.3, [
    [start.x - ox, start.y - oy, start.z],
    [start.x + ox, start.y + oy, start.z],
    [end.x + ox, end.y + oy, end.z],
    [end.x - ox, end.y - oy, end.z],
  ], 1, length / 3);
}

function addRain(geometry, rain, indices) {
  const textureId = indices.get(rain.texture) ?? 0;

  for (const drop of rain.drops) {
    const halfWidth = drop.width / 2;
    const height = drop.height;
    face(geometry, textureId, 1.25, [
      [drop.x - halfWidth, drop.y - height, drop.z],
      [drop.x + halfWidth, drop.y - height, drop.z],
      [drop.x + halfWidth, drop.y, drop.z],
      [drop.x - halfWidth, drop.y, drop.z],
    ], 1, 4);
  }
}

function face(geometry, textureId, shade, corners, uRepeat, vRepeat, motion = 0) {
  const uv = [[0, vRepeat], [uRepeat, vRepeat], [uRepeat, 0], [0, 0]];
  const order = [0, 1, 2, 0, 2, 3];

  for (const index of order) {
    geometry.positions.push(...corners[index]);
    geometry.uvs.push(...uv[index]);
    geometry.textureIds.push(textureId);
    geometry.shades.push(shade);
    geometry.motions.push(motion);
  }
}

function triangle(geometry, textureId, shade, a, b, c, uRepeat, vRepeat, motion = 0) {
  const corners = [a, b, c];
  const uv = [[0, vRepeat], [uRepeat, vRepeat], [uRepeat * 0.5, 0]];

  for (let index = 0; index < 3; index += 1) {
    geometry.positions.push(...corners[index]);
    geometry.uvs.push(...uv[index]);
    geometry.textureIds.push(textureId);
    geometry.shades.push(shade);
    geometry.motions.push(motion);
  }
}

function drawMesh(glContext, program, mesh) {
  if (!mesh || mesh.count <= 0) return;

  bindAttribute(glContext, program.attributes.aPosition, mesh.position, 3);
  bindAttribute(glContext, program.attributes.aUv, mesh.uv, 2);
  bindAttribute(glContext, program.attributes.aTextureId, mesh.textureId, 1);
  bindAttribute(glContext, program.attributes.aShade, mesh.shade, 1);
  bindAttribute(glContext, program.attributes.aMotion, mesh.motion, 1);
  glContext.drawArrays(glContext.TRIANGLES, 0, mesh.count);
}

function createPostQuad(glContext) {
  return createBuffer(glContext, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ]));
}

function drawQuad(glContext, program, buffer) {
  bindAttribute(glContext, program.attributes.aPosition, buffer, 2);
  glContext.drawArrays(glContext.TRIANGLES, 0, 6);
}

function createLevelTextureDescriptors(levelAsset, fallback) {
  const levelTextures = levelAsset.materials.map((material, index) => ({
    id: `level:${index}`,
    size: 128,
    material,
  }));
  const supportTextures = fallback.textures.filter((texture) => (
    texture.id === 'zombie' || texture.id === 'healthPotion'
  ));
  return [...levelTextures, ...supportTextures];
}

async function createSceneTextureAtlas(glContext, scene, zombieImage = null) {
  if (!scene.levelAsset) return createTextureAtlas(glContext, scene.textures, zombieImage);
  return createLevelTextureAtlas(glContext, scene, zombieImage);
}

async function createLevelTextureAtlas(glContext, scene, zombieImage = null) {
  const textures = await Promise.all(scene.textures.map(async (texture) => {
    if (!texture.material?.texture?.bytes) return texture;
    return {
      ...texture,
      image: await loadTextureBytesImage(texture.material.texture),
    };
  }));

  return createTextureAtlas(glContext, textures, zombieImage);
}

function createTextureAtlas(glContext, textures, zombieImage = null) {
  const tile = 128;
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = tile * textures.length;
  atlasCanvas.height = tile;
  const ctx = atlasCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  textures.forEach((texture, index) => {
    const x = index * tile;
    if (texture.id === 'zombie' && zombieImage) {
      drawZombieModelTexture(ctx, zombieImage, x, 0, tile);
    } else if (texture.image) {
      ctx.drawImage(texture.image, x, 0, tile, tile);
    } else if (texture.material) {
      drawMaterialColorTexture(ctx, texture.material.baseColor, x, 0, tile);
    } else {
      drawGeneratedTexture(ctx, texture.id, x, 0, tile, texture.size);
    }
  });

  const texture = glContext.createTexture();
  glContext.bindTexture(glContext.TEXTURE_2D, texture);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.NEAREST);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.NEAREST);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
  glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, atlasCanvas);
  return texture;
}

async function loadTextureBytesImage(texture) {
  const blob = new Blob([texture.bytes], { type: texture.mimeType });
  const image = new Image();
  const url = URL.createObjectURL(blob);
  try {
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawMaterialColorTexture(ctx, baseColor, x, y, tile) {
  const [r, g, b, a = 1] = baseColor ?? [1, 1, 1, 1];
  ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  ctx.fillRect(x, y, tile, tile);
}

function drawZombieModelTexture(ctx, image, x, y, tile) {
  ctx.drawImage(image, x, y, tile, tile);
}

function deleteMeshBuffers(glContext, mesh) {
  if (!mesh) return;
  glContext.deleteBuffer(mesh.position);
  glContext.deleteBuffer(mesh.uv);
  glContext.deleteBuffer(mesh.textureId);
  glContext.deleteBuffer(mesh.shade);
  glContext.deleteBuffer(mesh.motion);
}

function motionCode(name) {
  const codes = {
    sway: 1,
    firefly: 2,
    'falling-leaf': 3,
    'moon-slide': 4,
    bob: 5,
    orbit: 6,
    'flicker-comet': 7,
    'palm-snap': 8,
    'window-pulse': 9,
    'sign-flicker': 10,
    'water-shimmer': 11,
    'zombie-walk': 12,
    'torch-flame': 13,
    'pickup-bob': 14,
  };
  return codes[name] ?? 0;
}

function drawGeneratedTexture(ctx, id, x, y, tile, sourceSize) {
  if (id === 'zombie') {
    drawZombieTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'star') {
    drawStarTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'shootingStar') {
    drawShootingStarTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'paleMoon') {
    drawMoonTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'firefly') {
    drawFireflyTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'fallingLeaf') {
    drawLeafTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'flickerComet') {
    drawCometTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'blackWater' || id === 'poolWater') {
    drawWaterPlaneTexture(ctx, id, x, y, tile);
    return;
  }

  if (id === 'motelSign') {
    drawMotelSignTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'motelWindow') {
    drawMotelWindowTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'rain') {
    drawRainTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'torchFlame') {
    drawTorchFlameTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'healthPotion') {
    drawHealthPotionTexture(ctx, x, y, tile);
    return;
  }

  if (id.startsWith('neon') || id === 'lightning') {
    drawNeonTexture(ctx, id, x, y, tile, sourceSize);
    return;
  }

  if (id.startsWith('oneBit')) {
    drawOneBitTexture(ctx, id, x, y, tile, sourceSize);
    return;
  }

  const cell = tile / (sourceSize === 64 ? 8 : 16);
  ctx.fillStyle = palette(id, 0);
  ctx.fillRect(x, y, tile, tile);

  for (let row = 0; row < tile / cell; row += 1) {
    for (let col = 0; col < tile / cell; col += 1) {
      const n = hash(col, row, id.length);
      ctx.fillStyle = palette(id, n);
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }

  if (id === 'brick') {
    ctx.strokeStyle = '#2d2926';
    ctx.lineWidth = 2;
    for (let row = 0; row < 8; row += 1) {
      const offset = row % 2 === 0 ? 0 : tile / 8;
      ctx.beginPath();
      ctx.moveTo(x, y + row * tile / 8);
      ctx.lineTo(x + tile, y + row * tile / 8);
      ctx.stroke();
      for (let col = -1; col < 8; col += 1) {
        ctx.beginPath();
        ctx.moveTo(x + offset + col * tile / 4, y + row * tile / 8);
        ctx.lineTo(x + offset + col * tile / 4, y + (row + 1) * tile / 8);
        ctx.stroke();
      }
    }
  }

  if (id === 'warning') {
    ctx.fillStyle = '#d7a526';
    for (let stripe = -tile; stripe < tile * 2; stripe += 24) {
      ctx.save();
      ctx.translate(x + stripe, y);
      ctx.rotate(Math.PI / 6);
      ctx.fillRect(0, 0, 12, tile * 2);
      ctx.restore();
    }
  }

  if (id === 'sun') {
    const gradient = ctx.createRadialGradient(x + tile / 2, y + tile / 2, 4, x + tile / 2, y + tile / 2, tile / 2);
    gradient.addColorStop(0, '#fff2a0');
    gradient.addColorStop(0.35, '#ff9744');
    gradient.addColorStop(0.72, '#b63358');
    gradient.addColorStop(1, '#3b1434');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, tile, tile);
  }
}

function drawZombieTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#121612';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = '#6f8d5e';
  ctx.fillRect(x + tile * 0.32, y + tile * 0.08, tile * 0.36, tile * 0.22);
  ctx.fillStyle = '#273822';
  ctx.fillRect(x + tile * 0.28, y + tile * 0.3, tile * 0.44, tile * 0.32);
  ctx.fillStyle = '#4b3128';
  ctx.fillRect(x + tile * 0.2, y + tile * 0.32, tile * 0.16, tile * 0.42);
  ctx.fillRect(x + tile * 0.64, y + tile * 0.32, tile * 0.16, tile * 0.42);
  ctx.fillStyle = '#1c1a1a';
  ctx.fillRect(x + tile * 0.33, y + tile * 0.62, tile * 0.13, tile * 0.32);
  ctx.fillRect(x + tile * 0.55, y + tile * 0.62, tile * 0.13, tile * 0.32);
  ctx.fillStyle = '#f2e6a6';
  ctx.fillRect(x + tile * 0.39, y + tile * 0.16, tile * 0.07, tile * 0.05);
  ctx.fillRect(x + tile * 0.55, y + tile * 0.16, tile * 0.07, tile * 0.05);
  ctx.fillStyle = '#9b2d2d';
  ctx.fillRect(x + tile * 0.44, y + tile * 0.25, tile * 0.14, tile * 0.04);
  ctx.fillStyle = 'rgba(150, 185, 120, 0.28)';
  ctx.fillRect(x + tile * 0.24, y + tile * 0.04, tile * 0.52, tile * 0.9);
}

function drawStarTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#f9f0c4';
  const center = x + tile / 2;
  const middle = y + tile / 2;
  const size = Math.max(14, Math.floor(tile / 4.8));
  ctx.fillRect(center - size / 2, middle - size / 2, size, size);
  ctx.fillStyle = 'rgba(117, 233, 238, 0.65)';
  ctx.fillRect(center - size * 1.2, middle - size / 2, size, size);
  ctx.fillStyle = 'rgba(255, 98, 142, 0.58)';
  ctx.fillRect(center + size * 0.2, middle - size / 2, size, size);
}

function drawShootingStarTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  const middle = y + tile / 2;
  const head = x + tile * 0.78;
  const height = Math.max(8, Math.floor(tile / 10));

  const tail = ctx.createLinearGradient(x + tile * 0.08, middle, head, middle);
  tail.addColorStop(0, 'rgba(255, 255, 255, 0)');
  tail.addColorStop(0.45, 'rgba(88, 220, 232, 0.68)');
  tail.addColorStop(1, 'rgba(255, 245, 194, 1)');
  ctx.fillStyle = tail;
  ctx.fillRect(x + tile * 0.08, middle - height / 2, tile * 0.7, height);

  ctx.fillStyle = '#fff7c8';
  ctx.fillRect(head, middle - height, height * 2, height * 2);
}

function drawMoonTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#d9d1b5';
  ctx.fillRect(x + tile * 0.26, y + tile * 0.18, tile * 0.46, tile * 0.58);
  ctx.fillStyle = '#9f9a8d';
  ctx.fillRect(x + tile * 0.48, y + tile * 0.24, tile * 0.12, tile * 0.1);
  ctx.fillRect(x + tile * 0.38, y + tile * 0.52, tile * 0.16, tile * 0.12);
}

function drawFireflyTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#d8ff72';
  ctx.fillRect(x + tile * 0.36, y + tile * 0.36, tile * 0.28, tile * 0.28);
  ctx.fillStyle = 'rgba(105, 255, 170, 0.38)';
  ctx.fillRect(x + tile * 0.26, y + tile * 0.26, tile * 0.48, tile * 0.48);
}

function drawLeafTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#75602e';
  ctx.fillRect(x + tile * 0.34, y + tile * 0.18, tile * 0.26, tile * 0.54);
  ctx.fillStyle = '#2f3b1d';
  ctx.fillRect(x + tile * 0.46, y + tile * 0.2, tile * 0.12, tile * 0.48);
}

function drawCometTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#ffff4d';
  ctx.fillRect(x + tile * 0.62, y + tile * 0.42, tile * 0.18, tile * 0.18);
  ctx.fillStyle = '#15e8ff';
  ctx.fillRect(x + tile * 0.25, y + tile * 0.46, tile * 0.4, tile * 0.1);
}

function drawWaterPlaneTexture(ctx, id, x, y, tile) {
  ctx.fillStyle = id === 'blackWater' ? '#030506' : '#07131a';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = id === 'blackWater' ? 'rgba(61, 76, 58, 0.5)' : 'rgba(94, 214, 230, 0.5)';
  for (let row = 0; row < 8; row += 1) {
    ctx.fillRect(x + ((row % 2) * 12), y + row * tile / 8, tile * 0.75, 3);
  }
}

function drawMotelSignTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#160909';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = '#f2c25d';
  ctx.fillRect(x + 10, y + 18, tile - 20, 18);
  ctx.fillRect(x + 16, y + 48, tile - 32, 14);
  ctx.fillStyle = '#451818';
  ctx.fillRect(x + 24, y + 22, tile - 48, 6);
  ctx.fillRect(x + 30, y + 52, tile - 60, 4);
}

function drawMotelWindowTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#080808';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = '#ff9b43';
  ctx.fillRect(x + 12, y + 12, tile - 24, tile - 24);
  ctx.fillStyle = '#2a1309';
  ctx.fillRect(x + tile / 2 - 2, y + 12, 4, tile - 24);
}

function drawRainTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#0c2025';
  ctx.fillRect(x, y, tile, tile);
  ctx.strokeStyle = '#b9ffff';
  ctx.lineWidth = 2;

  for (let i = -2; i < 10; i += 1) {
    const sx = x + i * 14;
    ctx.beginPath();
    ctx.moveTo(sx, y + tile);
    ctx.lineTo(sx + 20, y);
    ctx.stroke();
  }
}

function drawNeonTexture(ctx, id, x, y, tile, sourceSize) {
  const cells = sourceSize === 64 ? 8 : 16;
  const cell = tile / cells;
  const base = palette(id, 0);
  ctx.fillStyle = base;
  ctx.fillRect(x, y, tile, tile);

  if (id === 'lightning') {
    ctx.fillStyle = '#f7ffff';
    ctx.fillRect(x, y, tile, tile);
    return;
  }

  if (id === 'neonSky') {
    const gradient = ctx.createLinearGradient(x, y, x, y + tile);
    gradient.addColorStop(0, '#2539ff');
    gradient.addColorStop(0.45, '#6841ff');
    gradient.addColorStop(0.7, '#e0207d');
    gradient.addColorStop(1, '#ff3b1f');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, tile, tile);
  }

  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const n = hash(col, row, id.length);
      let color = palette(id, n);

      if (id === 'neonTile') {
        color = row % 2 === 0 || col % 2 === 0 ? '#d9fff0' : palette(id, n);
      }
      if (id === 'neonGlass') {
        color = col % 3 === 0 ? '#d8ffff' : palette(id, n);
      }
      if (id === 'neonCloud') {
        color = n > 0.48 || row % 5 === 0 ? '#ff9a3d' : '#ff3f8f';
      }
      if (id === 'neonLeaf') {
        color = n > 0.42 ? '#a8ff6a' : '#071b14';
      }
      if (id === 'neonBark') {
        color = col % 3 === 0 ? '#43ff9d' : '#161019';
      }

      ctx.fillStyle = color;
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }

  if (id === 'neonTile' || id === 'neonGlass') {
    ctx.strokeStyle = '#baffff';
    ctx.lineWidth = 2;
    for (let i = 0; i <= cells; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * cell, y);
      ctx.lineTo(x + i * cell, y + tile);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + i * cell);
      ctx.lineTo(x + tile, y + i * cell);
      ctx.stroke();
    }
  }
}

function drawOneBitTexture(ctx, id, x, y, tile, sourceSize) {
  const oneBitPaper = '#d8d0aa';
  const oneBitInk = '#17130e';
  const cells = sourceSize === 64 ? 8 : 16;
  const cell = tile / cells;
  ctx.fillStyle = id === 'oneBitVoid' ? oneBitInk : oneBitPaper;
  ctx.fillRect(x, y, tile, tile);

  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const center = Math.abs(col - (cells - 1) / 2);
      const verticalShade = row / Math.max(cells - 1, 1);
      const n = hash(col, row, id.length);
      const stripe = row % 4 === 0 || col % 4 === 0;
      const checker = (row + col) % 2 === 0;
      const circuit = stripe || (row % 3 === 1 && col % 5 < 2) || (col % 6 === 3 && row % 5 > 1);
      const cross = center < 1 || Math.abs(row - (cells - 1) / 2) < 1 || checker;
      let density = 0.35 + verticalShade * 0.2;

      if (id === 'oneBitVoid') density = 0.82;
      if (id === 'oneBitGrid') density = checker ? 0.32 : 0.52;
      if (id === 'oneBitCross') density = cross ? 0.18 : 0.62;
      if (id === 'oneBitStripe') density = row % 3 === 1 ? 0.24 : 0.68;
      if (id === 'oneBitCircuit') density = circuit ? 0.2 : 0.58;

      ctx.fillStyle = n < density ? oneBitInk : oneBitPaper;
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }
}

function palette(id, n) {
  const palettes = {
    concrete: ['#585650', '#69655c', '#4c4b47', '#777062'],
    brick: ['#55413a', '#6a4d42', '#40332f', '#775547'],
    metal: ['#4c5555', '#67706e', '#394343', '#87908a'],
    crate: ['#79542f', '#94663a', '#5d432c', '#ad7844'],
    warning: ['#2d2b25', '#413b2d', '#1f1e1b', '#6b5523'],
    torchWood: ['#2a160b', '#4a2b14', '#6b3d1d', '#140b06'],
    torchMetal: ['#1a1714', '#433f3a', '#777068', '#2d2925'],
    alienGround: ['#293f37', '#4a5541', '#5e3c5f', '#1e282c'],
    alienRock: ['#3a3048', '#5d526d', '#2b2435', '#74678b'],
    rotMud: ['#1b2012', '#30301b', '#4a3d24', '#152012'],
    rotBark: ['#050505', '#11100c', '#1a1711', '#241d15'],
    rotPine: ['#07110a', '#102116', '#1f321e', '#26321b'],
    rotRoot: ['#16100b', '#2a1d13', '#3a2818', '#0b0906'],
    deadWood: ['#2b2116', '#47341e', '#17110d', '#5c442b'],
    blackWater: ['#030506', '#0c1511', '#111c17', '#030506'],
    sun: ['#ffb044', '#d84a54', '#fff0a6', '#77284a'],
    astralGrid: ['#05050a', '#23f6ff', '#ff2fd0', '#f8f14a'],
    astralCyan: ['#00e8ff', '#12243a', '#aaffff', '#008e9a'],
    astralMagenta: ['#ff2fd0', '#32102d', '#ffd1fb', '#9b197e'],
    astralYellow: ['#f8f14a', '#3a3512', '#fff6a3', '#a79d12'],
    astralBlack: ['#020208', '#101022', '#05050a', '#222244'],
    starshipFloor: ['#1f2b32', '#34454a', '#162026', '#4f5f64'],
    panel: ['#263238', '#3f4b52', '#181f25', '#59656b'],
    motelWall: ['#2c2b31', '#4b4851', '#17171d', '#6a6264'],
    motelDoor: ['#181012', '#39212a', '#5f3141', '#101010'],
    vending: ['#161624', '#e43f65', '#2ed6ff', '#f7e45a'],
    palm: ['#173019', '#2d5b2f', '#75602e', '#0d160b'],
    car: ['#101319', '#303b45', '#672b38', '#aeb1a4'],
    wetAsphalt: ['#11151d', '#1e2430', '#262042', '#101016'],
    poolWater: ['#07131a', '#0d2c35', '#3dbeca', '#13202a'],
    neon: ['#ff2bbd', '#27d8ff', '#f6e85f', '#5635ff'],
    neonSky: ['#2539ff', '#6841ff', '#e0207d', '#ff3b1f'],
    neonTile: ['#53fff2', '#f8fff2', '#2332ff', '#ff44d6'],
    neonGlass: ['#baffff', '#35dfff', '#3631ff', '#f9fff6'],
    neonCloud: ['#ff8a2a', '#ff3f8f', '#ffd15c', '#5d3cff'],
    neonBark: ['#43ff9d', '#161019', '#ff4fe1', '#0f2b25'],
    neonLeaf: ['#a8ff6a', '#071b14', '#46ffcb', '#1a0b30'],
    lightning: ['#f7ffff', '#ffffff', '#caffff', '#e8f7ff'],
    templeStone: ['#4b544b', '#677060', '#313930', '#7a816f'],
    mossStone: ['#36523e', '#4d6843', '#2d3a31', '#71805b'],
    water: ['#14383d', '#1d535a', '#243f58', '#0f272d'],
    rain: ['#0c2025', '#b9ffff', '#6ccdd5', '#183940'],
    oneBitVoid: ['#17130e', '#211b13', '#0e0b08', '#2a2218'],
    oneBitGrid: ['#d8d0aa', '#17130e', '#b8ad88', '#352a1b'],
    oneBitCross: ['#d8d0aa', '#211b13', '#c6bd98', '#17130e'],
    oneBitStripe: ['#d8d0aa', '#17130e', '#a79d78', '#2a2218'],
    oneBitCircuit: ['#d8d0aa', '#17130e', '#c0b890', '#302617'],
  };
  const list = palettes[id] ?? palettes.concrete;
  return list[Math.floor(n * list.length) % list.length];
}

function createRenderTarget(glContext, width, height) {
  const texture = glContext.createTexture();
  glContext.bindTexture(glContext.TEXTURE_2D, texture);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.NEAREST);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.NEAREST);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
  glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, width, height, 0, glContext.RGBA, glContext.UNSIGNED_BYTE, null);

  const depth = glContext.createRenderbuffer();
  glContext.bindRenderbuffer(glContext.RENDERBUFFER, depth);
  glContext.renderbufferStorage(glContext.RENDERBUFFER, glContext.DEPTH_COMPONENT16, width, height);

  const framebuffer = glContext.createFramebuffer();
  glContext.bindFramebuffer(glContext.FRAMEBUFFER, framebuffer);
  glContext.framebufferTexture2D(glContext.FRAMEBUFFER, glContext.COLOR_ATTACHMENT0, glContext.TEXTURE_2D, texture, 0);
  glContext.framebufferRenderbuffer(glContext.FRAMEBUFFER, glContext.DEPTH_ATTACHMENT, glContext.RENDERBUFFER, depth);

  if (glContext.checkFramebufferStatus(glContext.FRAMEBUFFER) !== glContext.FRAMEBUFFER_COMPLETE) {
    throw new Error('Could not create the low-resolution render target.');
  }

  glContext.bindFramebuffer(glContext.FRAMEBUFFER, null);
  return { framebuffer, texture, depth };
}

function deleteRenderTarget(glContext, target) {
  if (!target) return;
  glContext.deleteTexture(target.texture);
  glContext.deleteRenderbuffer(target.depth);
  glContext.deleteFramebuffer(target.framebuffer);
}

function createProgram(glContext, vertexSource, fragmentSource) {
  const vertex = compileShader(glContext, glContext.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);
  const program = glContext.createProgram();
  glContext.attachShader(program, vertex);
  glContext.attachShader(program, fragment);
  glContext.linkProgram(program);

  if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
    throw new Error(glContext.getProgramInfoLog(program));
  }

  return {
    program,
    attributes: collectLocations(glContext, program, glContext.ACTIVE_ATTRIBUTES, glContext.getActiveAttrib, glContext.getAttribLocation),
    uniforms: collectLocations(glContext, program, glContext.ACTIVE_UNIFORMS, glContext.getActiveUniform, glContext.getUniformLocation),
  };
}

function compileShader(glContext, type, source) {
  const shader = glContext.createShader(type);
  glContext.shaderSource(shader, source);
  glContext.compileShader(shader);

  if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
    throw new Error(glContext.getShaderInfoLog(shader));
  }

  return shader;
}

function collectLocations(glContext, program, countName, activeGetter, locationGetter) {
  const locations = {};
  const count = glContext.getProgramParameter(program, countName);

  for (let i = 0; i < count; i += 1) {
    const info = activeGetter.call(glContext, program, i);
    const name = info.name.replace(/\[0\]$/, '');
    locations[name] = locationGetter.call(glContext, program, name);
  }

  return locations;
}

function createBuffer(glContext, data) {
  const buffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, data, glContext.STATIC_DRAW);
  return buffer;
}

function drawTorchFlameTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = 'rgba(255, 105, 18, 0.22)';
  ctx.fillRect(x + tile * 0.22, y + tile * 0.16, tile * 0.56, tile * 0.7);
  ctx.fillStyle = '#d22f16';
  ctx.fillRect(x + tile * 0.32, y + tile * 0.32, tile * 0.36, tile * 0.46);
  ctx.fillStyle = '#ff8a1f';
  ctx.fillRect(x + tile * 0.38, y + tile * 0.22, tile * 0.26, tile * 0.48);
  ctx.fillStyle = '#ffe36a';
  ctx.fillRect(x + tile * 0.44, y + tile * 0.28, tile * 0.14, tile * 0.3);
  ctx.fillStyle = '#fff5ad';
  ctx.fillRect(x + tile * 0.47, y + tile * 0.36, tile * 0.08, tile * 0.16);
}

function drawHealthPotionTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#063015';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = '#15933d';
  ctx.fillRect(x + tile * 0.08, y + tile * 0.08, tile * 0.84, tile * 0.84);
  ctx.fillStyle = '#36ff58';
  ctx.fillRect(x + tile * 0.18, y + tile * 0.18, tile * 0.52, tile * 0.56);
  ctx.fillStyle = '#b8ff8d';
  ctx.fillRect(x + tile * 0.3, y + tile * 0.24, tile * 0.16, tile * 0.34);
  ctx.fillStyle = '#0a4c21';
  ctx.fillRect(x + tile * 0.68, y + tile * 0.16, tile * 0.18, tile * 0.68);
  ctx.fillStyle = '#edffd9';
  ctx.fillRect(x + tile * 0.36, y + tile * 0.44, tile * 0.28, tile * 0.08);
  ctx.fillRect(x + tile * 0.46, y + tile * 0.34, tile * 0.08, tile * 0.28);
}

function createDynamicBuffer(glContext) {
  const buffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, 0, glContext.DYNAMIC_DRAW);
  return buffer;
}

function updateBuffer(glContext, buffer, data) {
  glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, data, glContext.DYNAMIC_DRAW);
}

function bindAttribute(glContext, location, buffer, size) {
  glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
  glContext.enableVertexAttribArray(location);
  glContext.vertexAttribPointer(location, size, glContext.FLOAT, false, 0, 0);
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ]);
}

function multiplyMat4(a, b) {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0]
        + a[1 * 4 + row] * b[column * 4 + 1]
        + a[2 * 4 + row] * b[column * 4 + 2]
        + a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function hash(x, y, seed) {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453) % 1;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function start() {
  sceneProgram = createProgram(gl, sceneVertexShader, sceneFragmentShader);
  postProgram = createProgram(gl, postVertexShader, postFragmentShader);
  world = await createSceneRuntimeWorld(effects.sceneId);
  textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
  colliders = getSceneColliders(world);
  walkableSurfaces = getSceneWalkableSurfaces(world);
  healthPotions = createSceneHealthPotions(world);
  resetPlayerToSpawn();
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions }, textureIndices);
  zombieMesh = createZombieMesh(gl);
  quad = createPostQuad(gl);
  atlasTexture = await createSceneTextureAtlas(gl, world, zombieTextureImage);
  renderTarget = createRenderTarget(gl, renderResolution.width, renderResolution.height);

  setupOptions();
  setupInput();
  resize();
  renderTitleScreen(0);
  loadZombieGlb().then(async (model) => {
    zombieModel = model;
    zombieTextureImage = await loadZombieTextureImage(model.texture);
    if (zombieTextureImage) {
      gl.deleteTexture(atlasTexture);
      atlasTexture = await createSceneTextureAtlas(gl, world, zombieTextureImage);
    }
  }).catch(() => {
    zombieModel = null;
    zombieTextureImage = null;
  });
  requestAnimationFrame(frame);
}

async function loadZombieTextureImage(texture) {
  if (!texture?.bytes) return null;
  const blob = new Blob([texture.bytes], { type: texture.mimeType });
  const image = new Image();
  const url = URL.createObjectURL(blob);
  try {
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const sceneVertexShader = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute float aTextureId;
attribute float aShade;
attribute float aMotion;

uniform mat4 uViewProjection;
uniform float uTime;
uniform float uWarping;
uniform highp float uShootingStarTextureId;

varying vec2 vUv;
varying float vTextureId;
varying float vShade;
varying float vMotion;
varying vec3 vWorldPosition;

void main() {
  vec3 warped = aPosition;
  float shootingStarMask = 1.0 - step(0.5, abs(aTextureId - uShootingStarTextureId));
  float shootingStarPhase = mod(uTime, 9.0);
  float shootingStarTravel = clamp((shootingStarPhase - 1.25) / 2.4, 0.0, 1.0);
  warped += vec3(shootingStarTravel * 52.0, -shootingStarTravel * 9.0, 0.0) * shootingStarMask;
  float swayMask = 1.0 - step(0.5, abs(aMotion - 1.0));
  float fireflyMask = 1.0 - step(0.5, abs(aMotion - 2.0));
  float leafMask = 1.0 - step(0.5, abs(aMotion - 3.0));
  float moonMask = 1.0 - step(0.5, abs(aMotion - 4.0));
  float bobMask = 1.0 - step(0.5, abs(aMotion - 5.0));
  float orbitMask = 1.0 - step(0.5, abs(aMotion - 6.0));
  float cometMask = 1.0 - step(0.5, abs(aMotion - 7.0));
  float palmMask = 1.0 - step(0.5, abs(aMotion - 8.0));
  float waterMask = 1.0 - step(0.5, abs(aMotion - 11.0));
  float zombieMask = 1.0 - step(0.5, abs(aMotion - 12.0));
  float torchFlameMask = 1.0 - step(0.5, abs(aMotion - 13.0));
  float pickupMask = 1.0 - step(0.5, abs(aMotion - 14.0));
  warped.x += sin(uTime * 1.5 + aPosition.z * 1.8) * 0.24 * swayMask;
  warped.x += sin(uTime * 2.8 + aPosition.y * 3.0) * 0.7 * fireflyMask;
  warped.y += sin(uTime * 3.2 + aPosition.x * 2.0) * 0.36 * fireflyMask;
  warped.y -= mod(floor(uTime * 3.0 + aPosition.x * 0.7), 5.0) * 0.45 * leafMask;
  warped.x += floor(mod(uTime * 0.8, 5.0)) * 0.22 * moonMask;
  warped.y += sin(uTime * 1.3 + aPosition.x) * 0.55 * bobMask;
  vec2 orbitCenter = vec2(0.0, -7.0);
  vec2 localOrbit = warped.xz - orbitCenter;
  float orbitAngle = uTime * 0.75;
  vec2 rotatedOrbit = vec2(
    localOrbit.x * cos(orbitAngle) - localOrbit.y * sin(orbitAngle),
    localOrbit.x * sin(orbitAngle) + localOrbit.y * cos(orbitAngle)
  ) + orbitCenter;
  warped.xz = mix(warped.xz, rotatedOrbit, orbitMask);
  warped.x += floor(mod(uTime * 2.0 + aPosition.y, 2.0)) * 1.1 * cometMask;
  warped.x += floor(mod(uTime * 2.0 + aPosition.x, 3.0)) * 0.22 * palmMask;
  warped.y += sin(uTime * 5.0 + aPosition.x) * 0.04 * waterMask;
  warped.x += sin(uTime * 6.5 + aPosition.y * 7.0) * 0.08 * zombieMask;
  warped.y += abs(sin(uTime * 5.5 + aPosition.x)) * 0.08 * zombieMask;
  warped.x += sin(uTime * 17.0 + aPosition.y * 11.0) * 0.06 * torchFlameMask;
  warped.y += floor(mod(uTime * 14.0 + aPosition.x * 3.0, 2.0)) * 0.08 * torchFlameMask;
  warped.y += (sin(uTime * 3.6 + aPosition.x * 1.7) * 0.12 + 0.12) * pickupMask;
  float wobble = sin((aPosition.x + aPosition.z) * 8.0 + uTime * 6.0) * 0.006;
  warped.xz += vec2(wobble, -wobble) * uWarping;

  vec4 clip = uViewProjection * vec4(warped, 1.0);
  vec2 snapped = floor((clip.xy / clip.w) * vec2(160.0, 120.0)) / vec2(160.0, 120.0);
  clip.xy = mix(clip.xy, snapped * clip.w, uWarping);

  gl_Position = clip;
  vUv = aUv;
  vTextureId = aTextureId;
  vShade = aShade;
  vMotion = aMotion;
  vWorldPosition = warped;
}
`;

const sceneFragmentShader = `
precision mediump float;

uniform sampler2D uAtlas;
uniform float uTextureCount;
uniform highp float uTime;
uniform float uOneBit;
uniform float uLightningTextureId;
uniform float uLightningStrength;
uniform float uRainTextureId;
uniform highp float uShootingStarTextureId;
uniform vec3 uTorchPosition;
uniform vec3 uTorchColor;
uniform float uTorchRadius;
uniform float uTorchIntensity;
uniform float uTorchEnabled;
uniform float uStaticTorchCount;
uniform vec3 uStaticTorchPosition0;
uniform vec3 uStaticTorchColor0;
uniform float uStaticTorchRadius0;
uniform float uStaticTorchIntensity0;
uniform vec3 uStaticTorchPosition1;
uniform vec3 uStaticTorchColor1;
uniform float uStaticTorchRadius1;
uniform float uStaticTorchIntensity1;
uniform vec3 uStaticTorchPosition2;
uniform vec3 uStaticTorchColor2;
uniform float uStaticTorchRadius2;
uniform float uStaticTorchIntensity2;

varying vec2 vUv;
varying float vTextureId;
varying float vShade;
varying float vMotion;
varying vec3 vWorldPosition;

float orderedDither(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float x = q.x;
  float y = q.y;
  if (y < 0.5) {
    if (x < 0.5) return 0.0 / 16.0;
    if (x < 1.5) return 8.0 / 16.0;
    if (x < 2.5) return 2.0 / 16.0;
    return 10.0 / 16.0;
  }
  if (y < 1.5) {
    if (x < 0.5) return 12.0 / 16.0;
    if (x < 1.5) return 4.0 / 16.0;
    if (x < 2.5) return 14.0 / 16.0;
    return 6.0 / 16.0;
  }
  if (y < 2.5) {
    if (x < 0.5) return 3.0 / 16.0;
    if (x < 1.5) return 11.0 / 16.0;
    if (x < 2.5) return 1.0 / 16.0;
    return 9.0 / 16.0;
  }
  if (x < 0.5) return 15.0 / 16.0;
  if (x < 1.5) return 7.0 / 16.0;
  if (x < 2.5) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

void main() {
  float id = floor(vTextureId + 0.5);
  float signMask = 1.0 - step(0.5, abs(vMotion - 10.0));
  float windowMask = 1.0 - step(0.5, abs(vMotion - 9.0));
  float cometMask = 1.0 - step(0.5, abs(vMotion - 7.0));
  float torchFlameMask = 1.0 - step(0.5, abs(vMotion - 13.0));
  if (signMask > 0.5 && sin(uTime * 18.0) < -0.58) {
    discard;
  }
  if (cometMask > 0.5 && floor(mod(uTime * 3.0, 2.0)) < 0.5) {
    discard;
  }
  float shootingStarMask = 1.0 - step(0.5, abs(id - uShootingStarTextureId));
  float shootingStarPhase = mod(uTime, 9.0);
  if (shootingStarMask > 0.5 && (shootingStarPhase < 1.25 || shootingStarPhase > 3.65)) {
    discard;
  }

  vec2 tiled = fract(vUv);
  float rainMask = 1.0 - step(0.5, abs(id - uRainTextureId));
  tiled.y = fract(tiled.y + uTime * 2.4 * rainMask);
  vec2 atlasUv = vec2((id + tiled.x) / uTextureCount, tiled.y);
  vec4 texel = texture2D(uAtlas, atlasUv);
  if (texel.a < 0.1) {
    discard;
  }

  float posterize = floor(vShade * 5.0) / 5.0;
  vec3 color = texel.rgb * posterize;
  float torchDistance = distance(vWorldPosition, uTorchPosition);
  float torchFalloff = clamp(1.0 - torchDistance / max(uTorchRadius, 0.001), 0.0, 1.0);
  torchFalloff *= torchFalloff * uTorchEnabled;
  color *= 1.0 + torchFalloff * 0.38;
  color += uTorchColor * torchFalloff * uTorchIntensity * 0.34;
  float staticTorch0 = clamp(1.0 - distance(vWorldPosition, uStaticTorchPosition0) / max(uStaticTorchRadius0, 0.001), 0.0, 1.0);
  float staticTorch1 = clamp(1.0 - distance(vWorldPosition, uStaticTorchPosition1) / max(uStaticTorchRadius1, 0.001), 0.0, 1.0);
  float staticTorch2 = clamp(1.0 - distance(vWorldPosition, uStaticTorchPosition2) / max(uStaticTorchRadius2, 0.001), 0.0, 1.0);
  staticTorch0 *= staticTorch0 * step(0.5, uStaticTorchCount);
  staticTorch1 *= staticTorch1 * step(1.5, uStaticTorchCount);
  staticTorch2 *= staticTorch2 * step(2.5, uStaticTorchCount);
  float flameFlicker = 0.82 + step(0.0, sin(uTime * 18.0 + gl_FragCoord.x * 0.19)) * 0.18;
  color *= 1.0 + (staticTorch0 * uStaticTorchIntensity0 + staticTorch1 * uStaticTorchIntensity1 + staticTorch2 * uStaticTorchIntensity2) * 0.28 * flameFlicker;
  color += uStaticTorchColor0 * staticTorch0 * uStaticTorchIntensity0 * 0.34 * flameFlicker;
  color += uStaticTorchColor1 * staticTorch1 * uStaticTorchIntensity1 * 0.34 * flameFlicker;
  color += uStaticTorchColor2 * staticTorch2 * uStaticTorchIntensity2 * 0.34 * flameFlicker;
  color = mix(color, color * (1.05 + flameFlicker * 0.55) + vec3(0.42, 0.14, 0.01), torchFlameMask);
  color *= mix(1.0, step(0.0, sin(uTime * 2.5 + gl_FragCoord.x * 0.03)) * 0.85 + 0.15, windowMask);
  float lightningMask = 1.0 - step(0.5, abs(id - uLightningTextureId));
  color = mix(color, vec3(0.15 + uLightningStrength * 1.7), lightningMask);
  color = mix(color, color + vec3(0.18, 0.32, 0.34), rainMask);
  float oneBitTone = dot(color, vec3(0.299, 0.587, 0.114));
  float oneBitThreshold = orderedDither(gl_FragCoord.xy) * 0.34 + 0.28;
  vec3 oneBitInk = vec3(0.09, 0.075, 0.055);
  vec3 oneBitPaper = vec3(0.86, 0.82, 0.67);
  color = mix(color, mix(oneBitInk, oneBitPaper, step(oneBitThreshold, oneBitTone)), uOneBit);
  gl_FragColor = vec4(color, 1.0);
}
`;

const postVertexShader = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const postFragmentShader = `
precision mediump float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScanlines;
uniform float uDistortion;
uniform float uDither;
uniform float uNoise;
uniform float uColorBleed;
uniform float uScanlineStrength;
uniform float uVignette;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uPixelScale;
uniform vec2 uSourceResolution;
uniform float uFlipFramebufferY;
uniform float uOneBit;
uniform float uLightningStrength;
uniform float uHealthDanger;
uniform float uHealthPulse;
uniform float uHealthPickupFlash;
uniform float uDeathTint;
uniform float uDeathProgress;
uniform float uCutUpFlash;

varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
}

float orderedDither(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float x = q.x;
  float y = q.y;
  if (y < 0.5) {
    if (x < 0.5) return 0.0 / 16.0;
    if (x < 1.5) return 8.0 / 16.0;
    if (x < 2.5) return 2.0 / 16.0;
    return 10.0 / 16.0;
  }
  if (y < 1.5) {
    if (x < 0.5) return 12.0 / 16.0;
    if (x < 1.5) return 4.0 / 16.0;
    if (x < 2.5) return 14.0 / 16.0;
    return 6.0 / 16.0;
  }
  if (y < 2.5) {
    if (x < 0.5) return 3.0 / 16.0;
    if (x < 1.5) return 11.0 / 16.0;
    if (x < 2.5) return 1.0 / 16.0;
    return 9.0 / 16.0;
  }
  if (x < 0.5) return 15.0 / 16.0;
  if (x < 1.5) return 7.0 / 16.0;
  if (x < 2.5) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

float bloodParticle(vec2 uv, vec2 center, float radius, float seed) {
  vec2 stretched = vec2((uv.x - center.x) * 1.45, uv.y - center.y);
  float distanceToDrop = length(stretched);
  float splat = 1.0 - smoothstep(radius * 0.58, radius, distanceToDrop);
  float grain = step(0.34, rand(floor(uv * 180.0 + seed)));
  float dripY = smoothstep(center.y - 0.22, center.y, uv.y) * (1.0 - step(center.y, uv.y));
  float drip = dripY
    * (1.0 - smoothstep(radius * 0.18, radius * 0.56, abs(uv.x - center.x)));
  return max(splat * grain, drip * 0.42);
}

void main() {
  vec2 sourceUv = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, uFlipFramebufferY));
  vec2 centered = sourceUv * 2.0 - 1.0;
  float r2 = dot(centered, centered);
  vec2 uv = sourceUv + centered * r2 * uDistortion;

  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 chunkySize = uSourceResolution / max(uPixelScale, 1.0);
  uv = (floor(uv * chunkySize) + 0.5) / chunkySize;

  float bleed = uColorBleed;
  vec3 color;
  color.r = texture2D(uScene, uv + vec2(bleed, 0.0)).r;
  color.g = texture2D(uScene, uv).g;
  color.b = texture2D(uScene, uv - vec2(bleed, 0.0)).b;

  float scan = 1.0 - (sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5) * uScanlineStrength * uScanlines;
  color *= scan;

  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luminance), color, uSaturation);
  color = (color - 0.5) * uContrast + 0.5;
  color *= uBrightness;

  if (uDither > 0.5) {
    float threshold = rand(floor(gl_FragCoord.xy)) - 0.5;
    color += threshold / 32.0;
    color = floor(color * 32.0) / 32.0;
  }

  color += (rand(gl_FragCoord.xy + uTime) - 0.5) * uNoise;
  color *= 1.0 - r2 * uVignette;
  color += vec3(0.42, 0.62, 0.75) * uLightningStrength;
  float oneBitTone = dot(color, vec3(0.299, 0.587, 0.114));
  float oneBitThreshold = orderedDither(gl_FragCoord.xy) * 0.32 + 0.30;
  vec3 oneBitInk = vec3(0.09, 0.075, 0.055);
  vec3 oneBitPaper = vec3(0.86, 0.82, 0.67);
  color = mix(color, mix(oneBitInk, oneBitPaper, step(oneBitThreshold, oneBitTone)), uOneBit);
  color *= 1.0 - uHealthDanger * 0.28;
  color = mix(color, vec3(0.58, 0.015, 0.01), clamp(uHealthDanger * 0.2 + uHealthPulse * 0.18, 0.0, 0.42));
  color = mix(color, color + vec3(0.2, 0.95, 0.24), clamp(uHealthPickupFlash * 0.58, 0.0, 0.72));
  float blood = 0.0;
  blood += bloodParticle(sourceUv, vec2(0.20, 0.72), 0.18, 3.0);
  blood += bloodParticle(sourceUv, vec2(0.77, 0.63), 0.14, 11.0);
  blood += bloodParticle(sourceUv, vec2(0.48, 0.38), 0.24, 23.0);
  float finalBlood = smoothstep(0.80, 1.0, uDeathProgress);
  blood += bloodParticle(sourceUv, vec2(0.32, 0.54), 0.26, 31.0) * finalBlood;
  blood += bloodParticle(sourceUv, vec2(0.66, 0.78), 0.22, 41.0) * finalBlood;
  blood += bloodParticle(sourceUv, vec2(0.56, 0.24), 0.20, 53.0) * finalBlood;
  blood *= smoothstep(0.18, 0.62, uDeathProgress);
  color = mix(color, vec3(0.58, 0.0, 0.015), clamp(blood, 0.0, 0.94));
  color = mix(color, vec3(0.78, 0.02, 0.02), uDeathTint);
  color = mix(color, vec3(1.0), uCutUpFlash);

  gl_FragColor = vec4(color, 1.0);
}
`;

start().catch((error) => {
  console.error(error);
});
