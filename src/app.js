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
import { normalizeEnemySpawns } from './enemySpawnValidation.js';
import { SCENE_DEFINITIONS, createSceneWorld } from './world.js';
import { LEVEL_GLB_URLS, loadLevelGlb } from './levelGlb.js';
import {
  createZombieEnemies,
  getTouchingEnemy,
  isPlayerTouchedByZombie,
  resolvePlayerZombieCollision,
  updateZombieEnemies,
} from './zombies.js';
import {
  CHARACTER_MODEL_URLS,
  animateZombieModel,
  loadCharacterGlb,
  loadZombieGlb,
} from './zombieModel.js';
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
import {
  createRogueRun,
  getRogueSceneId,
  getRogueStageLabel,
  isRogueComplete,
  stepRogueRun,
} from './rogueMode.js';
import { motionCode, drawGeneratedTexture } from './generatedTextures.js';
import {
  skyVertexShader,
  skyFragmentShader,
  sceneVertexShader,
  sceneFragmentShader,
  postVertexShader,
  postFragmentShader,
} from './renderShaders.js';
import {
  ZOMBIE_GRUNT_LOOP_URL,
  LIGHTNING_SOUND_URL,
  MENU_START_CONFIRM_SOUND_URL,
  TITLE_MUSIC_LOOP_URL,
  FREE_ROAM_MUSIC_LOOP_URL,
  CUT_UP_MUSIC_LOOP_URL,
  FREE_ROAM_START_SOUND_URL,
  CUT_UP_START_SOUND_URL,
  CUT_UP_SCENE_SLICE_SOUND_URL,
  CUT_UP_COUNTDOWN_TICK_SOUND_URL,
  ROGUE_WIN_SOUND_URL,
  OPTIONS_OPEN_SOUND_URL,
  OPTIONS_CLOSE_SOUND_URL,
  HEALTH_PICKUP_SOUND_URL,
  PLAYER_DEATH_SOUND_URL,
  PLAYER_DAMAGE_SOUND_URL,
  PLAYER_JUMP_SOUND_URL,
  PLAYER_LAND_SOUND_URL,
  PLAYER_WALK_FOOTSTEP_LOOP_URL,
  PLAYER_SPRINT_FOOTSTEP_LOOP_URL,
  PLAYER_LOW_HEALTH_BREATHING_LOOP_URL,
  UI_HOVER_SOUND_URL,
  UI_TOGGLE_SOUND_URL,
  UI_SELECT_SOUND_URL,
  RAIN_SPOT_DRIP_SOUND_URL,
  WORLD_RARE_STINGER_SOUND_URL,
  ENEMY_AUDIO_PROFILES,
  SCENE_AMBIENCE_URLS,
  SCENE_AMBIENCE_MAX_GAIN,
  LIGHTNING_SOUND_GAIN,
  MENU_START_CONFIRM_SOUND_GAIN,
  TITLE_MUSIC_GAIN,
  FREE_ROAM_MUSIC_GAIN,
  CUT_UP_MUSIC_GAIN,
  UI_SFX_GAIN,
  TRANSITION_SFX_GAIN,
  CUT_UP_AUDIO_DUCK_DURATION_MS,
  HEALTH_PICKUP_SOUND_GAIN,
  PLAYER_DEATH_SOUND_GAIN,
  PLAYER_DAMAGE_SOUND_GAIN,
  PLAYER_JUMP_SOUND_GAIN,
  PLAYER_LAND_SOUND_GAIN,
  PLAYER_WALK_FOOTSTEP_GAIN,
  PLAYER_SPRINT_FOOTSTEP_GAIN,
  PLAYER_LOW_HEALTH_BREATHING_GAIN,
  HEALTH_PICKUP_FLASH_DURATION_MS,
  DAMAGE_FLASH_DURATION_MS,
  DAMAGE_SCRATCH_MAX_OFFSET,
  DAMAGE_SCRATCH_MAX_ROTATION,
  LOW_HEALTH_NOTICE_DURATION_MS,
  ZOMBIE_BITE_COOLDOWN_MS,
  DAMAGE_ZONE_SOUND_INTERVAL_MS,
  PLAYER_HEARTBEAT_BASE_INTERVAL_MS,
  PLAYER_HEARTBEAT_DANGER_INTERVAL_MS,
  PLAYER_HEARTBEAT_BASE_GAIN,
  PLAYER_HEARTBEAT_DANGER_GAIN,
  PLAYER_HEARTBEAT_DANGER_DISTANCE,
  TORCH_CRACKLE_MAX_DISTANCE,
  TORCH_CRACKLE_REF_DISTANCE,
  TORCH_CRACKLE_GAIN,
  RAIN_WATER_MAX_DISTANCE,
  RAIN_WATER_REF_DISTANCE,
  RAIN_WATER_BED_GAIN,
  RAIN_DRIP_GAIN,
  ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE,
  ZOMBIE_GRUNT_MAX_DISTANCE,
  ZOMBIE_GRUNT_MAX_GAIN,
  ZOMBIE_GRUNT_OCCLUDED_GAIN_MULTIPLIER,
  ZOMBIE_GRUNT_OPEN_FILTER_HZ,
  ZOMBIE_GRUNT_OCCLUDED_FILTER_HZ,
  SCENE_REVERB_PRESETS,
} from './audioConfig.js';
import { getEnemyDefinition } from './enemyCatalog.js';

const canvas = document.querySelector('#screen');
const reticule = document.querySelector('#reticule');
const debugHudPanel = document.querySelector('#debugHud');
const debugFps = document.querySelector('#debugFps');
const debugScene = document.querySelector('#debugScene');
const debugZombies = document.querySelector('#debugZombies');
const debugEnemies = document.querySelector('#debugEnemies');
const titleScreen = document.querySelector('#titleScreen');
const titleCanvas = document.querySelector('#titleCanvas');
const startButton = document.querySelector('#startButton');
const cutUpButton = document.querySelector('#cutUpButton');
const rogueButton = document.querySelector('#rogueButton');
const cutUpHud = document.querySelector('#cutUpHud');
const rogueWinScreen = document.querySelector('#rogueWinScreen');
const rogueReturnButton = document.querySelector('#rogueReturnButton');
const lowHealthNotice = document.querySelector('#lowHealthNotice');
const optionsDialog = document.querySelector('#options');
const quitGameButton = document.querySelector('#quitGameButton');
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
const SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE = 1.2;
const SPECIAL_ENEMY_LOOP_MAX_DISTANCE = 24;
const SPECIAL_ENEMY_ATTACK_COOLDOWN_MS = 1450;
let world = createSceneWorld(effects.sceneId);
let renderResolution = getResolutionMode(effects.resolutionId);
let textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
const loadedLevels = new Map();
let sceneLoadRequest = 0;
let colliders = getSceneColliders(world);
let walkableSurfaces = getSceneWalkableSurfaces(world);
let zombies = createZombieEnemies(world);
let healthPotions = createSceneHealthPotions(world);
let damageZones = createSceneDamageZones(world);
let playerHealth = createPlayerHealth();
let lastZombieBiteAt = -Infinity;
let lastDamageZoneSoundAt = -Infinity;
let healthPickupFlashStartedAt = -Infinity;
let lastDamageFlashStartedAt = -Infinity;
let damageScratchOffset = { x: 0, y: 0 };
let damageScratchRotation = 0;
let lowHealthNoticeStartedAt = -Infinity;
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
const rogueButtonState = { active: false };
const gameState = { mode: 'normal' };
const cutUpState = createCutUpState(CUT_UP_SCENE_COUNT);
let rogueRun = null;
let rogueTransitionPending = false;
let mouseLookActive = false;
let gameModeRequested = false;
let optionsCloseReturnsToTitle = false;
let lastPointerUnlockAt = 0;
let softMouseLockActive = false;
let softMouseEdgeTurn = { yaw: 0, pitch: 0 };
let lastMousePosition = null;
let skyProgram;
let sceneProgram;
let postProgram;
let warehouseMesh;
let skyDomeMesh;
let zombieMesh;
let zombieModel = null;
let zombieTextureImage = null;
let characterModels = new Map();
let characterTextureImages = new Map();
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
  updateRogueMode(now);
  render(now / 1000, now);
  requestAnimationFrame(frame);
}

function updatePlayer(dt, now) {
  if (!rogueWinScreen.hidden) return;

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

  const separated = resolvePlayerZombieCollision({ ...player, x: next.x, z: next.z }, zombies);
  player.x = separated.x;
  player.z = separated.z;

  const groundY = getGroundYAt(player, walkableSurfaces);
  if (groundY === null || (player.grounded && player.y > groundY + 0.08)) {
    player.grounded = false;
  } else if (player.grounded) {
    player.groundY = groundY;
  }

  const wasGrounded = player.grounded;
  const previousVelocityY = player.velocityY;
  const jump = applyJumpPhysics(player, {
    jump: keys.has('Space') || touchJumpActive || gamepadInput.jump,
    dt,
    groundY: groundY ?? -Infinity,
  });
  player.y = jump.y;
  player.velocityY = jump.velocityY;
  player.grounded = jump.grounded;
  player.groundY = jump.grounded ? jump.y : groundY ?? player.groundY;
  syncPlayerMovementSpotAudio(wasGrounded, jump.grounded, previousVelocityY, jump.velocityY);

  if (isBelowKillPlane(player, getVoidDeathY(world.killY ?? -8))) {
    playerHealth = applyPlayerDamage(playerHealth, MAX_PLAYER_HEALTH);
    startDeathSequence(now, { damage: false });
    return;
  }

  updateDamageZones(dt, now);
  if (deathState.active) return;

  updateHealthPotions(now);

  if (effects.zombies) {
    zombies = updateZombieEnemies(zombies, player, {
      colliders,
      walkableSurfaces,
      dt,
      now,
    });
  }
  const touchingEnemy = effects.zombies ? getTouchingEnemy(player, zombies) : null;
  if (touchingEnemy && isPlayerTouchedByZombie(player, zombies)) {
    damagePlayer(now, touchingEnemy);
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

  drawSkyDome(time, now);

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
    updateZombieMesh(gl, zombieMesh, zombies, textureIndices, characterModels, time);
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
  gl.uniform1f(postProgram.uniforms.uDamageFlash, getDamageFlash(now));
  gl.uniform2f(postProgram.uniforms.uDamageScratchOffset, damageScratchOffset.x, damageScratchOffset.y);
  gl.uniform1f(postProgram.uniforms.uDamageScratchRotation, damageScratchRotation);
  gl.uniform1f(postProgram.uniforms.uDeathTint, getDeathTint(now));
  gl.uniform1f(postProgram.uniforms.uDeathProgress, getDeathSceneProgress(now));
  gl.uniform1f(postProgram.uniforms.uCutUpFlash, getCutUpJumpFlash(cutUpState, now));
  gl.uniform1f(postProgram.uniforms.uCutUpCountdown, getCutUpCountdownNumber(cutUpState, now));
  drawQuad(gl, postProgram, quad);

  if (titleActive) {
    renderTitleScreen(time);
  }
  updateLowHealthNotice(now);
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
      waterfallVoices: new Map(),
      waterNoiseBuffer: createWaterNoiseBuffer(context),
      zombieVoices: new Map(),
      specialEnemyVoices: new Map(),
      enemyAttackTimes: new Map(),
      zombieLoopLoading: false,
      zombieLoopFailed: false,
      lastLightningIndex: -1,
      lastCutUpCountdownTick: null,
      cutUpAudioDuckStartedAt: -Infinity,
      nextWorldStingerAt: performance.now() + 14000,
      worldStingerSceneId: world.id,
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
    PLAYER_JUMP_SOUND_URL,
    PLAYER_LAND_SOUND_URL,
    UI_HOVER_SOUND_URL,
    UI_TOGGLE_SOUND_URL,
    UI_SELECT_SOUND_URL,
    RAIN_SPOT_DRIP_SOUND_URL,
    WORLD_RARE_STINGER_SOUND_URL,
    ...getEnemyAudioUrls(),
  ]) {
    loadAudioBuffer(state, url).catch(() => {});
  }
  ensurePlayerFootstepLoops(state);
  ensureLowHealthBreathingLoop(state);
  ensurePlayerHeartbeatLoop(state);
  ensureZombieGruntLoop(state);
}

function getEnemyAudioUrls() {
  return Object.values(ENEMY_AUDIO_PROFILES).flatMap((profile) => [profile.loopUrl, profile.attackUrl]);
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

function playOneShotToNode(state, url, outputNode, volume = 1) {
  const buffer = state.audioBuffers.get(url);
  if (!buffer) {
    loadAudioBuffer(state, url)
      .then(() => {
        if (audioState === state) playOneShotToNode(state, url, outputNode, volume);
      })
      .catch(() => {});
    return;
  }

  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(outputNode);
  source.start();
}

function playSpatialOneShot(state, url, position, volume = 1, options = {}) {
  const buffer = state.audioBuffers.get(url);
  if (!buffer) {
    loadAudioBuffer(state, url)
      .then(() => {
        if (audioState === state) playSpatialOneShot(state, url, position, volume, options);
      })
      .catch(() => {});
    return;
  }

  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  const panner = state.context.createPanner();
  source.buffer = buffer;
  gain.gain.value = volume;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = options.refDistance ?? 1.2;
  panner.maxDistance = options.maxDistance ?? 20;
  panner.rolloffFactor = options.rolloffFactor ?? 1.8;
  setAudioParam(panner.positionX, position.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, position.y ?? player.y, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, position.z, state.context.currentTime, 0);
  source.connect(gain);
  gain.connect(panner);
  connectSceneAudioNode(panner, state.dryGain, state.reverbInput);
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

function playUiHoverSound() {
  playUiOneShot(UI_HOVER_SOUND_URL, UI_SFX_GAIN * 0.34);
}

function playUiToggleSound() {
  playUiOneShot(UI_TOGGLE_SOUND_URL, UI_SFX_GAIN * 0.42);
}

function playUiSelectSound() {
  playUiOneShot(UI_SELECT_SOUND_URL, UI_SFX_GAIN * 0.46);
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

function syncWorldStingerAudio(state) {
  const now = performance.now();
  if (state.worldStingerSceneId !== world.id) {
    state.worldStingerSceneId = world.id;
    state.nextWorldStingerAt = now + 8000 + Math.random() * 9000;
    return;
  }

  if (titleActive || optionsDialog.open || deathState.active || now < state.nextWorldStingerAt) return;

  playSpatialOneShot(state, WORLD_RARE_STINGER_SOUND_URL, {
    x: player.x + Math.sin(now * 0.0017) * 5,
    y: player.y + 0.4,
    z: player.z + Math.cos(now * 0.0013) * 5,
  }, 0.16, { refDistance: 3.5, maxDistance: 28, rolloffFactor: 0.9 });
  state.nextWorldStingerAt = now + 18000 + Math.random() * 24000;
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
  syncRainWaterAudio(audioState);
  syncZombieSpatialAudio(audioState);
  syncSpecialEnemyAudio(audioState);
  syncWorldStingerAudio(audioState);
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

function syncPlayerMovementSpotAudio(wasGrounded, isGrounded, previousVelocityY, currentVelocityY) {
  if (titleActive || optionsDialog.open || deathState.active) return;
  if (wasGrounded && !isGrounded && currentVelocityY > 0.5) {
    playPlayerOneShot(PLAYER_JUMP_SOUND_URL, PLAYER_JUMP_SOUND_GAIN);
    return;
  }
  if (!wasGrounded && isGrounded && previousVelocityY < -1.2) {
    const landGain = Math.min(0.38, PLAYER_LAND_SOUND_GAIN + Math.abs(previousVelocityY) * 0.035);
    playPlayerOneShot(PLAYER_LAND_SOUND_URL, landGain);
  }
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

function createWaterNoiseBuffer(context) {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, sampleRate * 2, sampleRate);
  const channel = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < channel.length; index += 1) {
    previous = previous * 0.82 + (Math.random() * 2 - 1) * 0.18;
    channel[index] = previous * 0.7;
  }
  return buffer;
}

function syncRainWaterAudio(state) {
  const activeIds = new Set();
  const rainSources = getRainWaterSources();
  if (!titleActive && !optionsDialog.open && !deathState.active && rainSources.length) {
    for (const source of rainSources) {
      const id = `${world.id}:waterfall:${source.index}`;
      activeIds.add(id);
      const voice = getRainWaterVoice(state, id, source);
      const gain = RAIN_WATER_BED_GAIN * Math.min(1.35, source.height / 22);
      voice.gain.gain.setTargetAtTime(gain, state.context.currentTime, 0.36);
      voice.panner.positionX.setTargetAtTime(source.x, state.context.currentTime, 0.12);
      voice.panner.positionY.setTargetAtTime(source.y - source.height * 0.42, state.context.currentTime, 0.12);
      voice.panner.positionZ.setTargetAtTime(source.z, state.context.currentTime, 0.12);
    }
  }

  for (const [id, voice] of state.waterfallVoices) {
    if (activeIds.has(id)) continue;
    stopRainWaterVoice(state, voice);
    state.waterfallVoices.delete(id);
  }
}

function getRainWaterSources() {
  if (!world.rain?.drops?.length) return [];
  return world.rain.drops
    .map((drop, index) => ({ ...drop, index }))
    .sort((a, b) => (b.height * b.width) - (a.height * a.width))
    .slice(0, 4);
}

function getRainWaterVoice(state, id, source) {
  if (state.waterfallVoices.has(id)) return state.waterfallVoices.get(id);

  const sourceNode = state.context.createBufferSource();
  const filter = state.context.createBiquadFilter();
  const gain = state.context.createGain();
  const panner = state.context.createPanner();
  sourceNode.buffer = state.waterNoiseBuffer;
  sourceNode.loop = true;
  filter.type = 'bandpass';
  filter.frequency.value = 1450 + (source.index % 5) * 180;
  filter.Q.value = 0.75;
  gain.gain.value = 0;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = RAIN_WATER_REF_DISTANCE;
  panner.maxDistance = RAIN_WATER_MAX_DISTANCE;
  panner.rolloffFactor = 1.4;
  setAudioParam(panner.positionX, source.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, source.y - source.height * 0.42, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, source.z, state.context.currentTime, 0);
  sourceNode.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  connectSceneAudioNode(panner, state.dryGain, state.reverbInput);
  sourceNode.start();

  const voice = { id, source: sourceNode, gain, panner, timerId: null, seed: source.index * 23.41 };
  state.waterfallVoices.set(id, voice);
  scheduleRainDripPulse(state, voice);
  return voice;
}

function scheduleRainDripPulse(state, voice) {
  const delay = 220 + Math.floor(Math.random() * 980 + voice.seed % 160);
  voice.timerId = window.setTimeout(() => {
    voice.timerId = null;
    if (audioState !== state || !state.waterfallVoices.has(voice.id)) return;

    playRainDripPulse(state, voice);
    scheduleRainDripPulse(state, voice);
  }, delay);
}

function playRainDripPulse(state, voice) {
  if (state.audioBuffers.has(RAIN_SPOT_DRIP_SOUND_URL)) {
    playOneShotToNode(
      state,
      RAIN_SPOT_DRIP_SOUND_URL,
      voice.panner,
      RAIN_DRIP_GAIN * (0.55 + Math.random() * 0.7),
    );
    return;
  }

  const now = state.context.currentTime;
  const oscillator = state.context.createOscillator();
  const envelope = state.context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(880 + Math.random() * 1700, now);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(RAIN_DRIP_GAIN * (0.45 + Math.random() * 0.55), now + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.055 + Math.random() * 0.08);
  oscillator.connect(envelope);
  envelope.connect(voice.panner);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

function stopRainWaterVoice(state, voice) {
  if (voice.timerId) {
    window.clearTimeout(voice.timerId);
    voice.timerId = null;
  }
  voice.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.12);
  window.setTimeout(() => {
    try {
      voice.source.stop();
    } catch {
      // Already stopped by the browser audio engine.
    }
  }, 220);
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
      if ((zombie.enemyType ?? 'zombie') !== 'zombie') continue;
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

function syncSpecialEnemyAudio(state) {
  const activeIds = new Set();
  if (!titleActive && !optionsDialog.open && !deathState.active && effects.zombies) {
    for (const enemy of zombies) {
      if (!isSpecialEnemy(enemy)) continue;
      const profile = getEnemyAudioProfile(enemy);
      const buffer = state.audioBuffers.get(profile.loopUrl);
      if (!buffer) {
        loadAudioBuffer(state, profile.loopUrl).catch(() => {});
        continue;
      }
      const gain = getSpecialEnemyLoopGain(enemy);
      if (gain <= 0) continue;

      activeIds.add(enemy.id);
      const voice = getSpecialEnemyVoice(state, enemy, buffer, profile);
      const occluded = isZombieAudioOccluded(enemy);
      voice.gain.gain.setTargetAtTime(gain, state.context.currentTime, 0.28);
      voice.filter.frequency.setTargetAtTime(
        occluded ? profile.occludedFilterHz : profile.openFilterHz,
        state.context.currentTime,
        0.18,
      );
      voice.panner.positionX.setTargetAtTime(enemy.x, state.context.currentTime, 0.08);
      voice.panner.positionY.setTargetAtTime(enemy.y, state.context.currentTime, 0.08);
      voice.panner.positionZ.setTargetAtTime(enemy.z, state.context.currentTime, 0.08);
      if (Math.hypot(player.x - enemy.x, player.z - enemy.z) < 1.7) {
        playEnemyAttackSound(state, enemy, 0.72);
      }
    }
  }

  for (const [id, voice] of state.specialEnemyVoices) {
    if (activeIds.has(id)) continue;
    stopSpecialEnemyVoice(state, voice);
    state.specialEnemyVoices.delete(id);
    state.enemyAttackTimes.delete(id);
  }
}

function isSpecialEnemy(enemy) {
  return enemy?.enemyType === 'one-eye-alien' || enemy?.enemyType === 'molten-sentinel';
}

function getEnemyAudioProfile(enemy) {
  return ENEMY_AUDIO_PROFILES[enemy?.enemyType ?? 'zombie'] ?? ENEMY_AUDIO_PROFILES.zombie;
}

function getSpecialEnemyVoice(state, enemy, buffer, profile) {
  if (state.specialEnemyVoices.has(enemy.id)) return state.specialEnemyVoices.get(enemy.id);

  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  const filter = state.context.createBiquadFilter();
  const panner = state.context.createPanner();

  source.buffer = buffer;
  source.loop = true;
  gain.gain.value = 0;
  filter.type = enemy.enemyType === 'one-eye-alien' ? 'bandpass' : 'lowpass';
  filter.frequency.value = profile.openFilterHz;
  filter.Q.value = enemy.enemyType === 'one-eye-alien' ? 5.5 : 1.4;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE;
  panner.maxDistance = SPECIAL_ENEMY_LOOP_MAX_DISTANCE;
  panner.rolloffFactor = enemy.enemyType === 'one-eye-alien' ? 2.4 : 2.0;
  setAudioParam(panner.positionX, enemy.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, enemy.y, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, enemy.z, state.context.currentTime, 0);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  connectSceneAudioNode(panner, state.dryGain, state.reverbInput);
  source.start();

  const voice = {
    source,
    gain,
    filter,
    panner,
  };
  state.specialEnemyVoices.set(enemy.id, voice);
  return voice;
}

function stopSpecialEnemyVoice(state, voice) {
  voice.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.08);
  setTimeout(() => {
    try {
      voice.source.stop();
    } catch {
      // Already stopped by the browser audio engine.
    }
  }, 160);
}

function getSpecialEnemyLoopGain(enemy) {
  const distance = Math.hypot(player.x - enemy.x, player.z - enemy.z);
  if (distance >= SPECIAL_ENEMY_LOOP_MAX_DISTANCE) return 0;
  const occlusion = isZombieAudioOccluded(enemy) ? 0.45 : 1;
  const maxGain = getEnemyAudioProfile(enemy).maxLoopGain;
  if (distance <= SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE) return maxGain * occlusion;
  const fadeRange = SPECIAL_ENEMY_LOOP_MAX_DISTANCE - SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE;
  const fade = 1 - (distance - SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE) / fadeRange;
  return Math.max(0, Math.min(maxGain, fade * fade * maxGain * occlusion));
}

function playEnemyAttackSound(state, enemy, volumeScale = 1) {
  const now = performance.now();
  const lastAttackAt = state.enemyAttackTimes.get(enemy.id) ?? -Infinity;
  if (now - lastAttackAt < SPECIAL_ENEMY_ATTACK_COOLDOWN_MS) return;

  state.enemyAttackTimes.set(enemy.id, now);
  const profile = getEnemyAudioProfile(enemy);
  playSpatialOneShot(state, profile.attackUrl, enemy, profile.attackGain * volumeScale, {
    refDistance: 1,
    maxDistance: 20,
    rolloffFactor: enemy.enemyType === 'molten-sentinel' ? 1.6 : 2.2,
  });
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
  rogueButton.addEventListener('click', () => {
    startRogueMode();
  });
  quitGameButton.addEventListener('click', () => {
    playUiSelectSound();
    quitToTitleScreen();
  });
  rogueReturnButton.addEventListener('click', () => {
    playUiSelectSound();
    quitToTitleScreen();
  });
  startButton.addEventListener('pointerenter', () => {
    titleButtonState.active = true;
    playUiHoverSound();
  });
  startButton.addEventListener('pointerleave', () => {
    titleButtonState.active = false;
  });
  startButton.addEventListener('focus', () => {
    titleButtonState.active = true;
    playUiHoverSound();
  });
  startButton.addEventListener('blur', () => {
    titleButtonState.active = false;
  });
  cutUpButton.addEventListener('pointerenter', () => {
    cutUpButtonState.active = true;
    playUiHoverSound();
  });
  cutUpButton.addEventListener('pointerleave', () => {
    cutUpButtonState.active = false;
  });
  cutUpButton.addEventListener('focus', () => {
    cutUpButtonState.active = true;
    playUiHoverSound();
  });
  cutUpButton.addEventListener('blur', () => {
    cutUpButtonState.active = false;
  });
  rogueButton.addEventListener('pointerenter', () => {
    rogueButtonState.active = true;
    playUiHoverSound();
  });
  rogueButton.addEventListener('pointerleave', () => {
    rogueButtonState.active = false;
  });
  rogueButton.addEventListener('focus', () => {
    rogueButtonState.active = true;
    playUiHoverSound();
  });
  rogueButton.addEventListener('blur', () => {
    rogueButtonState.active = false;
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
      playUiToggleSound();
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
    playUiSelectSound();
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
    playUiSelectSound();
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
    playUiSelectSound();
    setRenderResolution(resolution.value);
  });

  const pixelScale = document.querySelector('#pixelScale');
  pixelScale.value = String(effects.pixelScale);
  pixelScale.addEventListener('input', () => {
    playUiToggleSound();
    effects.pixelScale = normalizePixelScale(pixelScale.value);
    pixelScale.value = String(effects.pixelScale);
    canvas.style.imageRendering = effects.pixelScale <= 1 ? 'auto' : 'pixelated';
  });

  optionsDialog.addEventListener('close', () => {
    if (optionsCloseReturnsToTitle) {
      optionsCloseReturnsToTitle = false;
      return;
    }
    if (titleActive) return;
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
  damageZones = createSceneDamageZones(world);
  resetPlayerToSpawn();
  rebuildWarehouseMesh();
  syncSceneSelect();
  leaveTitleScreen();
  updateCutUpHud(cutUpState.sceneStartedAt);
}

async function startRogueMode() {
  if (!titleActive) return;

  gameState.mode = 'rogue';
  cutUpState.active = false;
  cutUpHud.hidden = true;
  rogueRun = createRogueRun(SCENE_DEFINITIONS, performance.now());
  rogueTransitionPending = false;
  rogueWinScreen.hidden = true;
  ensureSceneAudio();
  playMenuStartConfirmSound();
  playTransitionOneShot(FREE_ROAM_START_SOUND_URL);
  const sceneLoaded = await setScene(getRogueSceneId(rogueRun, SCENE_DEFINITIONS));
  if (!sceneLoaded) return;
  syncSceneSelect();
  leaveTitleScreen();
}

function leaveTitleScreen() {
  titleActive = false;
  titleScreen.hidden = true;
  document.body.classList.remove('title-active');
  enterGameMode({ requestLock: true });
}

function quitToTitleScreen() {
  keys.clear();
  titleActive = true;
  titleScreen.hidden = false;
  gameState.mode = 'rogue-complete';
  rogueRun = null;
  rogueTransitionPending = false;
  rogueWinScreen.hidden = true;
  cutUpState.active = false;
  cutUpHud.hidden = true;
  mouseLookActive = false;
  gameModeRequested = false;
  softMouseLockActive = false;
  resetSoftMouseEdgeTurn();
  lastDamageFlashStartedAt = -Infinity;
  damageScratchOffset = { x: 0, y: 0 };
  damageScratchRotation = 0;
  lowHealthNoticeStartedAt = -Infinity;
  lowHealthNotice.hidden = true;
  deathState.active = false;
  deathState.profile = null;
  deathState.cameraStart = null;
  deathState.cameraImpactY = 0;
  deathState.finalDeathRattlePlayed = false;
  playerHealth = createPlayerHealth();
  resetPlayerToSpawn();
  document.body.classList.add('title-active');
  document.body.classList.remove('game-active', 'options-open');
  if (document.pointerLockElement) document.exitPointerLock();
  if (optionsDialog.open) {
    optionsCloseReturnsToTitle = true;
    optionsDialog.close();
  }
  syncReticule();
}

async function updateRogueMode(now) {
  if (gameState.mode !== 'rogue' || !rogueRun?.active || titleActive || optionsDialog.open || deathState.active) return;
  if (rogueTransitionPending) return;
  if (!world.warpGate) return;

  const gate = world.warpGate;
  const distance = Math.hypot(player.x - gate.x, player.z - gate.z);
  const verticalDistance = Math.abs((player.y - PLAYER_EYE_HEIGHT) - gate.y);
  if (distance > (gate.radius ?? 1.05) || verticalDistance > 2.2) return;

  rogueTransitionPending = true;
  rogueRun = stepRogueRun(rogueRun, SCENE_DEFINITIONS, now);
  if (isRogueComplete(rogueRun, SCENE_DEFINITIONS)) {
    completeRogueRun();
    return;
  }

  const sceneId = getRogueSceneId(rogueRun, SCENE_DEFINITIONS);
  playTransitionOneShot(CUT_UP_SCENE_SLICE_SOUND_URL, TRANSITION_SFX_GAIN * 0.58);
  try {
    await setScene(sceneId);
    syncSceneSelect();
  } finally {
    rogueTransitionPending = false;
  }
}

function completeRogueRun() {
  keys.clear();
  gameState.mode = 'normal';
  rogueRun = { ...rogueRun, active: false, complete: true };
  rogueTransitionPending = false;
  mouseLookActive = false;
  gameModeRequested = false;
  softMouseLockActive = false;
  resetSoftMouseEdgeTurn();
  if (document.pointerLockElement) document.exitPointerLock();
  rogueWinScreen.hidden = false;
  playUiOneShot(ROGUE_WIN_SOUND_URL, UI_SFX_GAIN);
}

const TITLE_WIDTH = 512;
const TITLE_HEIGHT = 480;
const TITLE_LAST_COMMIT_MESSAGE = 'last commit polish scenes and gameplay feedback';
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
  k: ['10010', '10100', '11000', '10100', '10010', '10010', '10010'],
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
  y: ['10010', '10010', '10010', '01110', '00100', '00100', '00100'],
  z: ['11110', '00010', '00100', '01000', '10000', '10000', '11110'],
});

function renderTitleScreen(time) {
  titleContext.imageSmoothingEnabled = false;
  titleContext.clearRect(0, 0, TITLE_WIDTH, TITLE_HEIGHT);
  drawTitleBackdrop(time);
  drawCenteredBitmapText('ps1-world', 146, 7, '#17100b', time, { x: 6, y: 6 });
  drawCenteredBitmapText('ps1-world', 146, 7, '#1ca6a5', time, { x: -2, y: 1 });
  drawCenteredBitmapText('ps1-world', 146, 7, '#b42638', time, { x: 2, y: 0 });
  drawCenteredBitmapText('ps1-world', 146, 7, '#f3dc92', time);
  drawBloodWarningText(time);
  const titleButtonBlink = getTitleButtonBlink(time);
  drawBitmapButton(time, { y: 264, label: 'free roam', active: titleButtonState.active, blink: titleButtonBlink });
  drawBitmapButton(time, { y: 310, label: 'cut-up mode', active: cutUpButtonState.active, blink: titleButtonBlink });
  drawBitmapButton(time, { y: 356, label: 'rogue', active: rogueButtonState.active, blink: titleButtonBlink });
  drawCenteredBitmapText('wasd+mouse or gamepad', 416, 1.25, '#cfc7aa', time);
  drawCenteredBitmapText(TITLE_LAST_COMMIT_MESSAGE, 462, 1, '#8f8a77', time);
}

function drawBloodWarningText(time) {
  const text = 'watch out for the zombies';
  const y = 234;
  const scale = 1.5;
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
    titleContext.fillRect(x + column * 0.75, y + 12, scale, length);
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
  titleContext.fillRect(132, 174 + Math.floor(pulse / 8), 248, 86);
}

function drawBitmapButton(time, options) {
  const width = 150;
  const height = 32;
  const textScale = 1.5;
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
  drawCenteredBitmapText(options.label, y + 10, textScale, active ? '#17110d' : '#f7e9b7', time);
}

function getTitleButtonBlink(time) {
  return Math.sin(time * 5) > 0.74;
}

function drawCenteredBitmapText(text, y, scale, color, time, offset = { x: 0, y: 0 }) {
  const width = measureBitmapText(text, scale);
  const snap = Math.sin(time * 24 + y) > 0.92 ? 1 : 0;
  drawBitmapText(text, Math.floor((TITLE_WIDTH - width) / 2 + offset.x + snap), y + offset.y, scale, color);
}

function drawRightAlignedBitmapText(text, right, y, scale, color) {
  drawBitmapText(text, right - measureBitmapText(text, scale), y, scale, color);
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
  if (debugScene) debugScene.textContent = world.label;
  if (debugZombies) debugZombies.textContent = String(zombieCount);
  if (debugEnemies) debugEnemies.textContent = String(enemyCount);
}

function damagePlayer(now, enemy = null) {
  if (now - lastZombieBiteAt < ZOMBIE_BITE_COOLDOWN_MS) return;

  lastZombieBiteAt = now;
  playerHealth = applyPlayerDamage(playerHealth, getEnemyDamage(enemy));
  randomizeDamageScratch();
  lastDamageFlashStartedAt = now;
  if (!playerHealth.dead && getHealthDanger(playerHealth) > 0) {
    lowHealthNoticeStartedAt = now;
  }
  const state = ensureAudioState();
  if (state && enemy) playEnemyAttackSound(state, enemy, 1);
  playPlayerOneShot(PLAYER_DAMAGE_SOUND_URL, PLAYER_DAMAGE_SOUND_GAIN);
  if (playerHealth.dead) {
    startDeathSequence(now, { damage: false });
  }
}

function getEnemyDamage(enemy) {
  return enemy?.damage ?? getEnemyDefinition(enemy?.enemyType).base.attackDamage ?? ZOMBIE_BITE_DAMAGE;
}

function randomizeDamageScratch() {
  damageScratchOffset = {
    x: (Math.random() * 2 - 1) * DAMAGE_SCRATCH_MAX_OFFSET,
    y: (Math.random() * 2 - 1) * DAMAGE_SCRATCH_MAX_OFFSET,
  };
  damageScratchRotation = (Math.random() * 2 - 1) * DAMAGE_SCRATCH_MAX_ROTATION;
}

function updateDamageZones(dt, now) {
  const zone = damageZones.find((item) => isPlayerInsideDamageZone(player, item));
  if (!zone) return;

  playerHealth = applyPlayerDamage(playerHealth, zone.damagePerSecond * dt);
  lastDamageFlashStartedAt = now;
  if (!playerHealth.dead && getHealthDanger(playerHealth) > 0) {
    lowHealthNoticeStartedAt = now;
  }
  if (now - lastDamageZoneSoundAt >= DAMAGE_ZONE_SOUND_INTERVAL_MS) {
    lastDamageZoneSoundAt = now;
    playPlayerOneShot(PLAYER_DAMAGE_SOUND_URL, PLAYER_DAMAGE_SOUND_GAIN * 0.52);
  }
  if (playerHealth.dead) {
    startDeathSequence(now, { damage: true });
  }
}

function isPlayerInsideDamageZone(position, zone) {
  const halfWidth = zone.width / 2;
  const halfDepth = zone.depth / 2;
  const halfHeight = (zone.height ?? 0.5) / 2;
  const feetY = position.y - PLAYER_EYE_HEIGHT;
  const centerY = zone.y ?? halfHeight;
  return position.x >= zone.x - halfWidth
    && position.x <= zone.x + halfWidth
    && position.z >= zone.z - halfDepth
    && position.z <= zone.z + halfDepth
    && feetY >= centerY - halfHeight
    && feetY <= centerY + halfHeight;
}

function updateHealthPotions(now) {
  const pickedIndex = healthPotions.findIndex((potion) => (
    Math.hypot(player.x - potion.x, player.z - potion.z) <= (potion.radius ?? 0.72)
    && Math.abs((player.y - PLAYER_EYE_HEIGHT) - (potion.y - potion.height / 2)) <= 1.2
  ));
  if (pickedIndex === -1) return;

  playerHealth = restorePlayerHealth(playerHealth);
  healthPickupFlashStartedAt = now;
  lowHealthNoticeStartedAt = -Infinity;
  if (lowHealthNotice) lowHealthNotice.hidden = true;
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

function getDamageFlash(now) {
  if (titleActive || optionsDialog.open || deathState.active) return 0;

  const elapsed = now - lastDamageFlashStartedAt;
  if (elapsed < 0 || elapsed > DAMAGE_FLASH_DURATION_MS) return 0;

  const progress = elapsed / DAMAGE_FLASH_DURATION_MS;
  return Math.max(0, (1 - progress) * (1 - progress));
}

function updateLowHealthNotice(now) {
  if (!lowHealthNotice) return;

  const elapsed = now - lowHealthNoticeStartedAt;
  const visible = !titleActive
    && !optionsDialog.open
    && !deathState.active
    && elapsed >= 0
    && elapsed <= LOW_HEALTH_NOTICE_DURATION_MS;
  lowHealthNotice.hidden = !visible;
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

async function jumpToCutUpScene(index, now = performance.now()) {
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
  const sceneLoaded = await setScene(sceneId);
  if (!sceneLoaded) return;
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
  cutUpHud.hidden = true;
  cutUpHud.textContent = getCutUpHudText(cutUpState, SCENE_DEFINITIONS, now);
}

function getCutUpCountdownNumber(state, now = performance.now()) {
  if (!state.active || titleActive || optionsDialog.open || deathState.active) return 0;

  const remaining = Math.max(0, CUT_UP_INTERVAL_MS - (now - state.sceneStartedAt)) / 1000;
  if (remaining <= 0 || remaining > CUT_UP_COUNTDOWN_SECONDS) return 0;
  return Math.ceil(remaining);
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
  if (requestId !== sceneLoadRequest) return false;

  if (world.id === nextWorld.id) {
    syncSceneSelect();
    return true;
  }

  effects.sceneId = nextWorld.id;
  world = nextWorld;
  textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
  colliders = getSceneColliders(world);
  walkableSurfaces = getSceneWalkableSurfaces(world);
  healthPotions = createSceneHealthPotions(world);
  damageZones = createSceneDamageZones(world);
  resetPlayerToSpawn();

  deleteMeshBuffers(gl, warehouseMesh);
  deleteMeshBuffers(gl, zombieMesh);
  gl.deleteTexture(atlasTexture);
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions }, textureIndices);
  zombieMesh = createZombieMesh(gl);
  atlasTexture = await createSceneTextureAtlas(gl, world, characterTextureImages);
  if (audioState) ensureSceneAudio();
  syncSceneSelect();
  return true;
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
  const levelColliders = getLevelRuntimeColliders(levelAsset);
  const levelWalkableSurfaces = getLevelRuntimeWalkableSurfaces(levelAsset);
  const zombieSpawns = normalizeEnemySpawns(
    levelAsset.zombieSpawns.length ? levelAsset.zombieSpawns : fallback.zombieSpawns,
    { colliders: levelColliders, walkableSurfaces: levelWalkableSurfaces, defaultRadius: 0.38 },
  );
  const enemySpawns = normalizeEnemySpawns(
    getRuntimeEnemySpawns(fallback, levelAsset.enemySpawns),
    { colliders: levelColliders, walkableSurfaces: levelWalkableSurfaces, defaultRadius: 0.38 },
  );

  return {
    ...fallback,
    levelAsset,
    playerSpawn: levelAsset.playerSpawn ?? fallback.playerSpawn,
    zombieSpawns,
    enemySpawns,
    healthPotions: levelAsset.healthPotions.length ? mergeLevelHealthPotions(levelAsset.healthPotions, fallback.healthPotions) : fallback.healthPotions,
    damageZones: levelAsset.damageZones.length ? levelAsset.damageZones : fallback.damageZones ?? [],
    lights: levelAsset.lights.length ? levelAsset.lights : fallback.lights,
    torchLights: levelAsset.torchLights.length ? levelAsset.torchLights : fallback.torchLights,
    killY: levelAsset.killY ?? fallback.killY,
    textures: createLevelTextureDescriptors(levelAsset, fallback),
  };
}

function getLevelRuntimeColliders(levelAsset) {
  return levelAsset.collision.map((collider) => ({
    minX: collider.minX,
    maxX: collider.maxX,
    minY: collider.minY,
    maxY: collider.maxY,
    minZ: collider.minZ,
    maxZ: collider.maxZ,
  }));
}

function getLevelRuntimeWalkableSurfaces(levelAsset) {
  return levelAsset.walkableSurfaces.map((surface) => ({
    minX: surface.minX,
    maxX: surface.maxX,
    minZ: surface.minZ,
    maxZ: surface.maxZ,
    topY: surface.topY,
  }));
}

function getRuntimeEnemySpawns(fallback, levelEnemySpawns) {
  const enemySpawns = levelEnemySpawns.length ? levelEnemySpawns : fallback.enemySpawns;
  return enemySpawns.filter((spawn) => (
    spawn.enemyType !== 'molten-sentinel'
    || !fallback.ceiling
    || (spawn.minimumHeadClearance ?? 0) >= 4.8
  ));
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
  lastDamageFlashStartedAt = -Infinity;
  damageScratchOffset = { x: 0, y: 0 };
  damageScratchRotation = 0;
  lowHealthNoticeStartedAt = -Infinity;
  lastDamageZoneSoundAt = -Infinity;
  if (lowHealthNotice) lowHealthNotice.hidden = true;
  lastZombieBiteAt = -Infinity;
  zombies = createZombieEnemies(world);
}

function mergeLevelHealthPotions(levelPotions, fallbackPotions) {
  return levelPotions.map((potion, index) => ({
    ...(fallbackPotions[index] ?? {}),
    ...potion,
  }));
}

function createSceneHealthPotions(scene) {
  return (scene.healthPotions ?? []).map((potion) => ({ ...potion }));
}

function createSceneDamageZones(scene) {
  return (scene.damageZones ?? []).map((zone) => ({ ...zone }));
}

function rebuildWarehouseMesh() {
  deleteMeshBuffers(gl, warehouseMesh);
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions }, textureIndices);
}

function getSceneColliders(scene) {
  if (scene.levelAsset) {
    return getLevelRuntimeColliders(scene.levelAsset);
  }

  return [...scene.walls, ...scene.crates, ...(scene.platforms ?? [])]
    .map((item) => item.collider)
    .filter(Boolean);
}

function getSceneWalkableSurfaces(scene) {
  if (scene.levelAsset) {
    return getLevelRuntimeWalkableSurfaces(scene.levelAsset);
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
    const textureId = indices.get(mesh.textureId) ?? 0;
    const motion = motionCode(mesh.motion);
    for (let index = 0; index < mesh.vertices.length; index += 3) {
      const shade = levelTriangleShade(mesh, index);
      for (const vertex of mesh.vertices.slice(index, index + 3)) {
        geometry.positions.push(vertex.x, vertex.y, vertex.z);
        geometry.uvs.push(vertex.u, vertex.v);
        geometry.textureIds.push(textureId);
        geometry.shades.push(shade);
        geometry.motions.push(motion);
      }
    }
  }

  if (scene.healthPotions) {
    for (const item of scene.healthPotions) {
      addHealthPotionFlask(geometry, item, indices);
    }
  }

  if (scene.warpGate) {
    addWarpGate(geometry, scene.warpGate, indices);
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

function levelTriangleShade(mesh, vertexIndex) {
  if (isBrightLevelTexture(mesh.textureId)) {
    return mesh.textureId === 'lightning' ? 1.3 : 1.18;
  }

  const a = mesh.vertices[vertexIndex];
  const b = mesh.vertices[vertexIndex + 1];
  const c = mesh.vertices[vertexIndex + 2];
  if (!a || !b || !c) return 0.86;

  const normal = triangleNormal(a, b, c);
  if (normal.y > 0.68) return 0.82;
  if (normal.y < -0.68) return 0.42;
  if (Math.abs(normal.x) > Math.abs(normal.z)) return normal.x > 0 ? 0.9 : 0.72;
  return normal.z > 0 ? 0.84 : 0.64;
}

function isBrightLevelTexture(textureId) {
  return textureId === 'star'
    || textureId === 'sun'
    || textureId === 'paleMoon'
    || textureId === 'shootingStar'
    || textureId === 'flickerComet'
    || textureId === 'comet'
    || textureId === 'firefly'
    || textureId === 'moonbeam'
    || textureId === 'torchFlame'
    || textureId === 'lightning'
    || textureId === 'rain';
}

function triangleNormal(a, b, c) {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const normal = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  return {
    x: normal.x / length,
    y: normal.y / length,
    z: normal.z / length,
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

  if (scene.warpGate) {
    addWarpGate(geometry, scene.warpGate, indices);
  }

  if (scene.movingBillboards) {
    for (const item of scene.movingBillboards) {
      addCard(geometry, item, indices);
    }
  }

  if (scene.skyDome) {
    // Sky domes replace flat star cards for distant sky.
  } else if (scene.stars) {
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

function updateZombieMesh(glContext, mesh, zombieList, indices, models = new Map(), time = 0) {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [], motions: [] };
  for (const zombie of zombieList) {
    const model = models.get(zombie.enemyType ?? 'zombie') ?? zombieModel;
    const animationName = selectEnemyAnimation(zombie, model, time);
    const animatedVertices = model
      ? animateZombieModel(model, time + (zombie.animationSeed ?? 0) * 4, animationName)
      : null;
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

function selectEnemyAnimation(enemy, model, time) {
  if (!model?.animations?.length) return null;
  const enemyDefinition = getEnemyDefinition(enemy.enemyType);
  if ((enemy.enemyType ?? 'zombie') === 'molten-sentinel') {
    const closeToPlayer = Math.hypot(player.x - enemy.x, player.z - enemy.z) < (enemy.attackRange ?? enemyDefinition.base.attackRange);
    if (closeToPlayer) {
      return findPreferredAnimationName(model, enemyDefinition.animation.attackNames)
        ?? findNonPreferredAnimationName(model, enemyDefinition.animation.locomotionNames)
        ?? model.animations[0].name;
    }
    return findPreferredAnimationName(model, enemyDefinition.animation.locomotionNames) ?? model.animations[0].name;
  }
  if (enemy.enemyType === 'one-eye-alien') {
    const closeToPlayer = Math.hypot(player.x - enemy.x, player.z - enemy.z) < 1.8;
    const attackName = findPreferredAnimationName(model, enemyDefinition.animation.attackNames);
    if (closeToPlayer && attackName) return attackName;
    const normalizedAttackNames = enemyDefinition.animation.attackNames.map(normalizeAnimationName);
    const ambientClips = model.animations.filter((animation) => !normalizedAttackNames.includes(normalizeAnimationName(animation.name)));
    if (!ambientClips.length) return model.animations[0].name;
    const index = Math.floor((time + (enemy.animationSeed ?? 0) * 9) / 5) % ambientClips.length;
    return ambientClips[index].name;
  }
  return model.animations[0].name;
}

function findPreferredAnimationName(model, preferredNames) {
  const normalizedPreferred = preferredNames.map(normalizeAnimationName);
  const animation = model.animations.find((clip) => normalizedPreferred.includes(normalizeAnimationName(clip.name)));
  return animation?.name ?? null;
}

function findNonPreferredAnimationName(model, excludedNames) {
  const normalizedExcluded = excludedNames.map(normalizeAnimationName);
  const animation = model.animations.find((clip) => !normalizedExcluded.includes(normalizeAnimationName(clip.name)));
  return animation?.name ?? null;
}

function normalizeAnimationName(name) {
  return String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function addZombieModel(geometry, zombie, vertices, indices) {
  const enemyType = zombie.enemyType ?? 'zombie';
  const textureId = indices.get(enemyType) ?? indices.get('zombie') ?? 0;
  const motion = motionCode('zombie-walk');
  const zombieMasterYaw = zombie.yaw;
  const enemyRender = getEnemyDefinition(enemyType).render;
  const zombieModelYaw = enemyRender.frontRotation;
  const feetY = zombie.y - PLAYER_EYE_HEIGHT;
  const scale = enemyRender.modelScale;

  for (const vertex of vertices) {
    const localX = vertex.x * scale;
    const localY = vertex.y * scale;
    const localZ = vertex.z * scale;
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
  const textureId = indices.get(zombie.enemyType ?? 'zombie') ?? indices.get('zombie') ?? 0;
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

function addWarpGate(geometry, item, indices) {
  const textureId = indices.get(item.texture) ?? 0;
  const motion = motionCode(item.motion);
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const y0 = item.y - halfHeight;
  const y1 = item.y + halfHeight;

  face(geometry, textureId, 1.42, [
    [item.x - halfWidth, y0, item.z],
    [item.x + halfWidth, y0, item.z],
    [item.x + halfWidth, y1, item.z],
    [item.x - halfWidth, y1, item.z],
  ], 1, 1, motion);
  face(geometry, textureId, 1.25, [
    [item.x, y0, item.z - halfWidth],
    [item.x, y0, item.z + halfWidth],
    [item.x, y1, item.z + halfWidth],
    [item.x, y1, item.z - halfWidth],
  ], 1, 1, motion);
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

function drawSkyDome(time, now) {
  if (!world.skyDome || !skyProgram || !skyDomeMesh) return;

  const camera = getActiveCamera(now);
  gl.depthMask(false);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(skyProgram.program);
  bindAttribute(gl, skyProgram.attributes.aPosition, skyDomeMesh.position, 3);
  gl.uniformMatrix4fv(skyProgram.uniforms.uViewProjection, false, createViewProjection(now));
  gl.uniform3f(skyProgram.uniforms.uCameraPosition, camera.x, camera.y, camera.z);
  gl.uniform1f(skyProgram.uniforms.uTime, time);
  gl.uniform1f(skyProgram.uniforms.uSkyMode, getSkyDomeMode(world.skyDome));
  gl.uniform1f(skyProgram.uniforms.uSkyPalette, getSkyDomePalette(world.skyDome));
  gl.drawArrays(gl.TRIANGLES, 0, skyDomeMesh.count);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
}

function getSkyDomeMode(skyDome) {
  return skyDome.mode === 'clouds' ? 1 : 0;
}

function getSkyDomePalette(skyDome) {
  if (skyDome.palette === 'electric-blue') return 1;
  if (skyDome.palette === 'one-bit-night') return 2;
  if (skyDome.palette === 'psychedelic-purple') return 3;
  if (skyDome.palette === 'liminal-blue') return 4;
  return 0;
}

function createSkyDomeMesh(glContext) {
  const positions = [];
  const rings = 9;
  const segments = 32;
  const bottom = -0.18;

  for (let ring = 0; ring < rings; ring += 1) {
    const v0 = ring / rings;
    const v1 = (ring + 1) / rings;
    const y0 = bottom + (1 - bottom) * v0;
    const y1 = bottom + (1 - bottom) * v1;
    const r0 = Math.sqrt(Math.max(0, 1 - y0 * y0));
    const r1 = Math.sqrt(Math.max(0, 1 - y1 * y1));

    for (let segment = 0; segment < segments; segment += 1) {
      const a0 = segment / segments * Math.PI * 2;
      const a1 = (segment + 1) / segments * Math.PI * 2;
      const p00 = [Math.cos(a0) * r0, y0, Math.sin(a0) * r0];
      const p01 = [Math.cos(a1) * r0, y0, Math.sin(a1) * r0];
      const p10 = [Math.cos(a0) * r1, y1, Math.sin(a0) * r1];
      const p11 = [Math.cos(a1) * r1, y1, Math.sin(a1) * r1];
      positions.push(...p00, ...p10, ...p01, ...p01, ...p10, ...p11);
    }
  }

  return {
    count: positions.length / 3,
    position: createBuffer(glContext, new Float32Array(positions)),
  };
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
  const textureIds = new Set(fallback.textures.map((texture) => texture.id));
  const missingLevelTextures = levelAsset.materials
    .filter((material) => !textureIds.has(material.textureId))
    .map((material) => ({
      id: material.textureId,
      size: 128,
      material,
    }));

  return [...fallback.textures, ...missingLevelTextures];
}

async function createSceneTextureAtlas(glContext, scene, characterImages = characterTextureImages) {
  if (!scene.levelAsset) return createTextureAtlas(glContext, scene.textures, characterImages);
  return createLevelTextureAtlas(glContext, scene, characterImages);
}

async function createLevelTextureAtlas(glContext, scene, characterImages = characterTextureImages) {
  const textures = await Promise.all(scene.textures.map(async (texture) => {
    if (!texture.material?.texture?.bytes) return texture;
    return {
      ...texture,
      image: await loadTextureBytesImage(texture.material.texture),
    };
  }));

  return createTextureAtlas(glContext, textures, characterImages);
}

function createTextureAtlas(glContext, textures, characterImages = characterTextureImages) {
  const tile = 128;
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = tile * textures.length;
  atlasCanvas.height = tile;
  const ctx = atlasCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  textures.forEach((texture, index) => {
    const x = index * tile;
    const characterImage = characterImages?.get?.(texture.id) ?? null;
    if (characterImage) {
      drawZombieModelTexture(ctx, characterImage, x, 0, tile);
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function start() {
  skyProgram = createProgram(gl, skyVertexShader, skyFragmentShader);
  sceneProgram = createProgram(gl, sceneVertexShader, sceneFragmentShader);
  postProgram = createProgram(gl, postVertexShader, postFragmentShader);
  world = await createSceneRuntimeWorld(effects.sceneId);
  textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
  colliders = getSceneColliders(world);
  walkableSurfaces = getSceneWalkableSurfaces(world);
  healthPotions = createSceneHealthPotions(world);
  damageZones = createSceneDamageZones(world);
  resetPlayerToSpawn();
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions }, textureIndices);
  skyDomeMesh = createSkyDomeMesh(gl);
  zombieMesh = createZombieMesh(gl);
  quad = createPostQuad(gl);
  atlasTexture = await createSceneTextureAtlas(gl, world, characterTextureImages);
  renderTarget = createRenderTarget(gl, renderResolution.width, renderResolution.height);

  setupOptions();
  setupInput();
  resize();
  renderTitleScreen(0);
  loadAllCharacterModels().then(async () => {
    if (characterTextureImages.size > 0) {
      gl.deleteTexture(atlasTexture);
      atlasTexture = await createSceneTextureAtlas(gl, world, characterTextureImages);
    }
  });
  requestAnimationFrame(frame);
}

async function loadAllCharacterModels() {
  const entries = await Promise.all(Object.entries(CHARACTER_MODEL_URLS).map(async ([enemyType, url]) => {
    try {
      const model = enemyType === 'zombie'
        ? await loadZombieGlb(url)
        : await loadCharacterGlb(enemyType, url);
      const image = await loadZombieTextureImage(model.texture);
      return [enemyType, model, image];
    } catch (error) {
      console.warn(`Could not load character model ${enemyType}:`, error);
      return [enemyType, null, null];
    }
  }));

  characterModels = new Map();
  characterTextureImages = new Map();
  for (const [enemyType, model, image] of entries) {
    if (!model) continue;
    characterModels.set(enemyType, model);
    if (image) characterTextureImages.set(enemyType, image);
  }
  zombieModel = characterModels.get('zombie') ?? null;
  zombieTextureImage = characterTextureImages.get('zombie') ?? null;
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

start().catch((error) => {
  console.error(error);
});
