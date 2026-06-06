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
import {
  loadSavedOptions,
  saveOptions,
  syncAudioMasterVolumes,
} from './optionsSettings.js';
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
import {
  createSceneDamageZones,
  createSceneHealthPotions,
  createSceneRuntimeWorld,
  getSceneColliders,
  getSceneWalkableSurfaces,
} from './sceneRuntime.js';
import {
  createSceneCollectibles,
  updateCollectibles,
} from './collectibleRuntime.js';
import {
  createHordeState,
  createZombieEnemies,
  getTouchingEnemy,
  isPlayerTouchedByZombie,
  resolvePlayerZombieCollision,
  updateHordeSpawns,
  updateZombieEnemies,
} from './zombies.js';
import {
  CHARACTER_MODEL_URLS,
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
  PLAYER_LOW_HEALTH_BREATHING_LOOP_URL,
  UI_HOVER_SOUND_URL,
  UI_TOGGLE_SOUND_URL,
  UI_SELECT_SOUND_URL,
  RAIN_SPOT_DRIP_SOUND_URL,
  WORLD_RARE_STINGER_SOUND_URL,
  ENEMY_AUDIO_PROFILES,
  SCENE_AMBIENCE_URLS,
  MENU_START_CONFIRM_SOUND_GAIN,
  UI_SFX_GAIN,
  TRANSITION_SFX_GAIN,
  HEALTH_PICKUP_SOUND_GAIN,
  PLAYER_DEATH_SOUND_GAIN,
  PLAYER_DAMAGE_SOUND_GAIN,
  PLAYER_JUMP_SOUND_GAIN,
  PLAYER_LAND_SOUND_GAIN,
  PLAYER_LOW_HEALTH_BREATHING_GAIN,
  DAMAGE_SCRATCH_MAX_OFFSET,
  DAMAGE_SCRATCH_MAX_ROTATION,
  LOW_HEALTH_NOTICE_DURATION_MS,
  ZOMBIE_BITE_COOLDOWN_MS,
  DAMAGE_ZONE_SOUND_INTERVAL_MS,
  TORCH_CRACKLE_GAIN,
  RAIN_WATER_BED_GAIN,
  SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE,
  SPECIAL_ENEMY_LOOP_MAX_DISTANCE,
  ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE,
  ZOMBIE_GRUNT_MAX_DISTANCE,
  ZOMBIE_GRUNT_MAX_GAIN,
  ZOMBIE_GRUNT_OCCLUDED_GAIN_MULTIPLIER,
  ZOMBIE_GRUNT_OPEN_FILTER_HZ,
  ZOMBIE_GRUNT_OCCLUDED_FILTER_HZ,
} from './audioConfig.js';
import {
  applySceneReverb,
  createAudioRuntimeState,
  ensureLoopSource,
  ensureMusicLoop,
  ensurePlayerFootstepLoopSources,
  ensurePlayerHeartbeatLoop,
  ensureSceneAmbienceLoop,
  ensureZombieGruntLoop,
  getCutUpAudioDuckAmount,
  getCinematicMusicTargetGains,
  getEnemyAudioUrls,
  getPlayerHeartbeatParams,
  getPlayerFootstepTargetGains,
  getRainWaterVoice,
  getSceneAmbienceTargetGain,
  getSpecialEnemyVoice,
  getTorchCrackleVoice,
  getZombieVoice,
  isAudioPathOccluded,
  loadAudioBuffer,
  playAssetOneShot,
  playBusOneShot,
  playEnemyAttackSound,
  playHeartbeatThump,
  playOneShotToNode,
  playSpatialOneShot,
  setAudioParam,
  syncPlayerHeartbeatGain,
  stopRainWaterVoice,
  stopSpecialEnemyVoice,
  stopTorchCrackleVoice,
  stopZombieVoice,
  stopZombieVoices,
  updateAudioListener,
} from './audioRuntime.js';
import { getEnemyDefinition } from './enemyCatalog.js';
import { createBloodBurst, updateBloodBursts } from './bloodEffects.js';
import { renderTitleScreen as drawTitleScreen } from './titleRenderer.js';
import {
  DEATH_RESPAWN_DELAY_MS,
  createDeathScene,
  getDamageFlash as getDamageFlashAmount,
  getDeathSceneCamera,
  getDeathSceneFinalProgress as getDeathSceneFinalProgressAmount,
  getDeathSceneProgress as getDeathSceneProgressAmount,
  getDeathTint as getDeathTintAmount,
  getHealthEffectStrength as getHealthEffectStrengthAmount,
  getHealthPickupFlash as getHealthPickupFlashAmount,
} from './playerFeedback.js';
import {
  createGamepadSnapshot,
  createDebugFreeCameraMovement,
  createSoftMouseEdgeTurn,
  createTouchJoystickState,
} from './inputRuntime.js';
import {
  getLightningStrength,
} from './sceneEffects.js';
import {
  clamp,
  multiplyMat4,
  perspective,
} from './renderMath.js';
import {
  createRenderTarget,
  deleteMeshBuffers,
  deleteRenderTarget,
} from './webglResources.js';
import { createProgram } from './webglPrograms.js';
import {
  createPostQuad,
  createSkyDomeMesh,
} from './renderMeshes.js';
import {
  createSceneMesh,
} from './renderSceneMeshes.js';
import {
  createZombieMesh,
  updateZombieMesh,
} from './renderEnemyMeshes.js';
import { createSceneTextureAtlas } from './renderTextureAtlas.js';
import { drawSkyDome as drawSkyDomeMesh } from './renderSkyDome.js';
import { drawPostPass } from './renderPostPass.js';
import { drawScenePass } from './renderScenePass.js';
import {
  applyDebugHudSnapshot,
  createDebugHudSnapshot,
} from './debugHud.js';
import { drawRadarHud } from './radarHud.js';

const canvas = document.querySelector('#screen');
const bootWarning = document.querySelector('#bootWarning');
const reticule = document.querySelector('#reticule');
const radarHudCanvas = document.querySelector('#radarHud');
const debugHudPanel = document.querySelector('#debugHud');
const debugFps = document.querySelector('#debugFps');
const debugScene = document.querySelector('#debugScene');
const debugZombies = document.querySelector('#debugZombies');
const debugEnemies = document.querySelector('#debugEnemies');
const titleScreen = document.querySelector('#titleScreen');
const titleCanvas = document.querySelector('#titleCanvas');
const startButton = document.querySelector('#startButton');
const geometryGardenButton = document.querySelector('#geometryGardenButton');
const cutUpButton = document.querySelector('#cutUpButton');
const rogueButton = document.querySelector('#rogueButton');
const titleOptionsButton = document.querySelector('#titleOptionsButton');
const cutUpHud = document.querySelector('#cutUpHud');
const rogueWinScreen = document.querySelector('#rogueWinScreen');
const rogueReturnButton = document.querySelector('#rogueReturnButton');
const lowHealthNotice = document.querySelector('#lowHealthNotice');
const optionsDialog = document.querySelector('#options');
const quitGameButton = document.querySelector('#quitGameButton');
const touchMove = document.querySelector('#touchMove');
const touchMoveStick = document.querySelector('#touchMoveStick');
const touchJump = document.querySelector('#touchJump');
const radarHudContext = radarHudCanvas.getContext('2d');
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

const effects = createEffectState(loadSavedOptions());
effects.sceneId = 'dungeon';
const BOOT_WARNING_DURATION_MS = 2000;
const GEOMETRY_GARDEN_SCENE_ID = 'astral-geometry-garden';
const CUT_UP_SCENE_COUNT = SCENE_DEFINITIONS.length;
const BOSS_IMPACT_SHAKE_DURATION_MS = 360;
const BOSS_IMPACT_SHAKE_DISTANCE = 10;
const BOSS_IMPACT_SHAKE_STRENGTH = 0.045;
let world = createSceneWorld(effects.sceneId);
let renderResolution = getResolutionMode(effects.resolutionId);
let textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
let sceneLoadRequest = 0;
let colliders = getSceneColliders(world);
let walkableSurfaces = getSceneWalkableSurfaces(world);
let zombies = createZombieEnemies(world);
let hordeState = createHordeState(world);
let bloodBursts = [];
let healthPotions = createSceneHealthPotions(world);
let collectibles = createSceneCollectibles(world);
let collectedCollectibleIds = new Set();
let damageZones = createSceneDamageZones(world);
let playerHealth = createPlayerHealth();
let lastZombieBiteAt = -Infinity;
let lastDamageZoneSoundAt = -Infinity;
let healthPickupFlashStartedAt = -Infinity;
let lastDamageFlashStartedAt = -Infinity;
let damageScratchOffset = { x: 0, y: 0 };
let damageScratchRotation = 0;
let gameplayNoticeText = '';
let gameplayNoticeStartedAt = -Infinity;
let lowHealthNoticeStartedAt = -Infinity;
let bossImpactShakeStartedAt = -Infinity;
let bossImpactShakeStrength = 0;
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
const debugFreeCamera = {
  x: player.x,
  y: player.y,
  z: player.z,
  yaw: player.yaw,
  pitch: player.pitch,
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
let bootWarningActive = true;
let titleActive = true;
const titleButtonState = { active: false };
const geometryGardenButtonState = { active: false };
const cutUpButtonState = { active: false };
const rogueButtonState = { active: false };
const titleOptionsButtonState = { active: false };
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
const OPTION_CHECKBOX_BINDINGS = Object.freeze([
  Object.freeze(['invertY', 'invertY']),
  Object.freeze(['showReticule', 'showReticule']),
  Object.freeze(['scanlines', 'scanlines']),
  Object.freeze(['crtDistortion', 'crtDistortion']),
  Object.freeze(['dither', 'dither']),
  Object.freeze(['warping', 'warping']),
  Object.freeze(['colorBleed', 'colorBleed']),
  Object.freeze(['noise', 'noise']),
  Object.freeze(['playerTorch', 'playerTorch']),
  Object.freeze(['zombies', 'zombies']),
  Object.freeze(['radarMapToggle', 'radarMap']),
  Object.freeze(['debugHudToggle', 'debugHud']),
  Object.freeze(['debugFreeCamToggle', 'debugFreeCam']),
]);

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
  if (effects.debugFreeCam) {
    updateDebugFreeCamera(local, dt);
    return;
  }

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
  updateSceneCollectibles(now);

  const enemyGameplayEnabled = isEnemyGameplayEnabled();
  if (enemyGameplayEnabled) {
    const previousEnemies = zombies;
    zombies = updateZombieEnemies(zombies, player, {
      colliders,
      walkableSurfaces,
      dt,
      now,
    });
    const hordeUpdate = updateHordeSpawns(zombies, world, player, hordeState, { now });
    zombies = hordeUpdate.enemies;
    hordeState = hordeUpdate.state;
    bloodBursts = [
      ...updateBloodBursts(bloodBursts, now),
      ...createEnemyBloodBursts(previousEnemies, zombies, now),
    ];
    triggerBossImpactFeedback(previousEnemies, zombies, now);
  } else {
    bloodBursts = [];
  }
  const touchingEnemy = enemyGameplayEnabled ? getTouchingEnemy(player, zombies) : null;
  if (touchingEnemy && isPlayerTouchedByZombie(player, zombies)) {
    damagePlayer(now, touchingEnemy);
  }
}

function updateDebugFreeCamera(local, dt) {
  const nextCamera = createDebugFreeCameraMovement(debugFreeCamera, {
    local,
    up: keys.has('Space') || gamepadInput.jump,
    down: keys.has('ControlLeft') || keys.has('ControlRight'),
    sprint: keys.has('ShiftLeft') || gamepadInput.sprint,
    dt,
  });
  Object.assign(debugFreeCamera, nextCamera);
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

  const enemyGameplayEnabled = isEnemyGameplayEnabled();
  const debugPlayerMarker = effects.debugFreeCam && !deathState.active ? getDebugPlayerMarker() : null;
  const dynamicEnemyMesh = enemyGameplayEnabled || debugPlayerMarker ? zombieMesh : null;
  if (dynamicEnemyMesh) {
    updateZombieMesh(
      gl,
      zombieMesh,
      enemyGameplayEnabled ? zombies : [],
      textureIndices,
      characterModels,
      time,
      now,
      enemyGameplayEnabled ? bloodBursts : [],
      zombieModel,
      debugPlayerMarker,
    );
  }
  drawScenePass(gl, {
    program: sceneProgram,
    atlasTexture,
    textureCount: world.textures.length,
    textureIndices,
    time,
    oneBit: world.oneBit,
    lightningTexture: world.lightning?.texture,
    lightningStrength,
    rainTexture: world.rain?.texture,
    shootingStarTexture: world.shootingStar?.texture,
    warping: effects.warping,
    player,
    playerTorch: world.playerTorch,
    playerTorchEnabled: effects.playerTorch,
    torchLights: world.torchLights,
    viewProjection: createViewProjection(now),
    staticMesh: warehouseMesh,
    dynamicMesh: dynamicEnemyMesh,
  });

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.disable(gl.DEPTH_TEST);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

  drawPostPass(gl, {
    program: postProgram,
    sceneTexture: renderTarget.texture,
    quad,
    viewport,
    renderResolution,
    time,
    effects,
    preset: getPresetValues(effects),
    oneBit: world.oneBit,
    lightningStrength,
    healthEffect,
    healthPickupFlash: getHealthPickupFlash(now),
    damageFlash: getDamageFlash(now),
    damageScratchOffset,
    damageScratchRotation,
    deathTint: getDeathTint(now),
    deathProgress: getDeathSceneProgress(now),
    cutUpFlash: getCutUpJumpFlash(cutUpState, now),
    cutUpCountdown: getCutUpCountdownNumber(cutUpState, now),
  });

  if (titleActive) {
    renderTitleScreen(time);
  }
  updateLowHealthNotice(now);
  updateRadarHud(now);
}

function ensureAudioState() {
  if (!audioState) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    audioState = createAudioRuntimeState({
      AudioContextClass,
      now: performance.now(),
      sceneId: world.id,
    });
    applySceneReverb(audioState, world.audio.reverb);
    syncAudioMasterVolumes(audioState, effects);
  }

  if (audioState.context.state === 'suspended') {
    audioState.context.resume();
  }

  return audioState;
}

function ensureSceneAudio() {
  if (!SCENE_AMBIENCE_URLS[world.id] && !world.lightning && !isEnemyGameplayEnabled() && !(world.torchLights ?? []).length) return;

  const state = ensureAudioState();
  if (!state) return;

  applySceneReverb(state, world.audio.reverb);
  ensureSceneAmbienceLoop(state, world.id, SCENE_AMBIENCE_URLS, { isCurrent: isCurrentSceneAudioState });
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
  ensurePlayerFootstepLoopSources(state, { isCurrent: isCurrentAudioState });
  ensureLowHealthBreathingLoopSource(state);
  ensurePlayerHeartbeatLoop(state, {
    getHeartbeatParams: getCurrentPlayerHeartbeatParams,
    isCurrent: isCurrentAudioState,
  });
  ensureZombieGruntLoop(state);
}

function getSceneAmbienceGain() {
  return getSceneAmbienceTargetGain({
    titleActive,
    deathActive: deathState.active,
    hasAmbience: Boolean(SCENE_AMBIENCE_URLS[world.id]),
    optionsOpen: optionsDialog.open,
    duckAmount: getCutUpAudioDuckAmount(audioState, performance.now()),
  });
}

function isCurrentAudioState(state) {
  return audioState === state;
}

function isCurrentSceneAudioState(state, sceneId) {
  return audioState === state && (sceneId === undefined || world.id === sceneId);
}

function playPlayerOneShot(url, volume) {
  const state = ensureAudioState();
  if (!state) return;

  playBusOneShot(state, url, state.playerSfxGain, volume, { isCurrent: isCurrentAudioState });
}

function playTransitionOneShot(url, volume = TRANSITION_SFX_GAIN) {
  const state = ensureAudioState();
  if (!state) return;

  playBusOneShot(state, url, state.transitionSfxGain, volume, { isCurrent: isCurrentAudioState });
}

function playUiOneShot(url, volume = UI_SFX_GAIN) {
  const state = ensureAudioState();
  if (!state) return;

  playBusOneShot(state, url, state.uiSfxGain, volume, { isCurrent: isCurrentAudioState });
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

function syncCinematicMusicAudio(state) {
  ensureMusicLoop(state, 'title', TITLE_MUSIC_LOOP_URL, state.titleMusicGain, { isCurrent: isCurrentAudioState });
  ensureMusicLoop(state, 'free-roam', FREE_ROAM_MUSIC_LOOP_URL, state.freeRoamMusicGain, { isCurrent: isCurrentAudioState });
  ensureMusicLoop(state, 'cut-up', CUT_UP_MUSIC_LOOP_URL, state.cutUpMusicGain, { isCurrent: isCurrentAudioState });

  const gains = getCinematicMusicTargetGains({
    titleActive,
    gameMode: gameState.mode,
    deathActive: deathState.active,
    optionsOpen: optionsDialog.open,
    duckAmount: getCutUpAudioDuckAmount(state, performance.now()),
  });

  state.titleMusicGain.gain.setTargetAtTime(gains.title, state.context.currentTime, 0.5);
  state.freeRoamMusicGain.gain.setTargetAtTime(gains.freeRoam, state.context.currentTime, 0.5);
  state.cutUpMusicGain.gain.setTargetAtTime(gains.cutUp, state.context.currentTime, 0.5);
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
  }, 0.16, {
    refDistance: 3.5,
    maxDistance: 28,
    rolloffFactor: 0.9,
    fallbackY: player.y,
    isCurrent: isCurrentAudioState,
  });
  state.nextWorldStingerAt = now + 18000 + Math.random() * 24000;
}

function updateSceneAudio(time, lightningStrength) {
  if (!audioState) return;

  updateAudioListener(audioState.context.listener, getGameplayCamera(performance.now()), audioState.context.currentTime);
  applySceneReverb(audioState, world.audio.reverb);
  syncAudioMasterVolumes(audioState, effects);
  ensureSceneAmbienceLoop(audioState, world.id, SCENE_AMBIENCE_URLS, { isCurrent: isCurrentSceneAudioState });
  ensurePlayerFootstepLoopSources(audioState, { isCurrent: isCurrentAudioState });
  ensureLowHealthBreathingLoopSource(audioState);
  ensurePlayerHeartbeatLoop(audioState, {
    getHeartbeatParams: getCurrentPlayerHeartbeatParams,
    isCurrent: isCurrentAudioState,
  });
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
  playAssetOneShot(audioState, LIGHTNING_SOUND_URL, audioState.lightningGain, { isCurrent: isCurrentAudioState });
}

function syncPlayerFootstepAudio(state) {
  const footstep = getPlayerFootstepGains();
  state.footstepWalkGain.gain.setTargetAtTime(footstep.walk, state.context.currentTime, 0.08);
  state.footstepSprintGain.gain.setTargetAtTime(footstep.sprint, state.context.currentTime, 0.08);
}

function getPlayerFootstepGains() {
  if (effects.debugFreeCam) return { walk: 0, sprint: 0 };

  const moving = keys.has('KeyW')
    || keys.has('KeyA')
    || keys.has('KeyS')
    || keys.has('KeyD')
    || Math.hypot(touchMovement.x, touchMovement.z) > 0.12
    || Math.hypot(gamepadInput.x, gamepadInput.z) > 0.12;
  return getPlayerFootstepTargetGains({
    titleActive,
    optionsOpen: optionsDialog.open,
    deathActive: deathState.active,
    grounded: player.grounded,
    moving,
    sprinting: keys.has('ShiftLeft') || gamepadInput.sprint,
  });
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

function ensureLowHealthBreathingLoopSource(state) {
  ensureLoopSource(state, {
    url: PLAYER_LOW_HEALTH_BREATHING_LOOP_URL,
    outputNode: state.lowHealthBreathingGain,
    sourceKey: 'lowHealthBreathingSource',
    loadingKey: 'lowHealthBreathingLoading',
    failedKey: 'lowHealthBreathingFailed',
    isCurrent: isCurrentAudioState,
  });
}

function syncLowHealthBreathingAudio(state) {
  const healthEffect = getHealthEffectStrength(performance.now());
  const targetGain = healthEffect.danger * PLAYER_LOW_HEALTH_BREATHING_GAIN;
  state.lowHealthBreathingGain.gain.setTargetAtTime(targetGain, state.context.currentTime, 0.18);
}

function syncPlayerHeartbeatAudio(state) {
  syncPlayerHeartbeatGain(state, getCurrentPlayerHeartbeatParams());
}

function getCurrentPlayerHeartbeatParams() {
  return getPlayerHeartbeatParams({
    titleActive,
    optionsOpen: optionsDialog.open,
    deathActive: deathState.active,
    nearestEnemyDistance: getNearestZombieDistance(),
  });
}

function getNearestZombieDistance() {
  if (!isEnemyGameplayEnabled() || !zombies.length) return null;

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
      const voice = getTorchCrackleVoice(state, id, torchLight, index, { isCurrent: isCurrentAudioState });
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

function syncRainWaterAudio(state) {
  const activeIds = new Set();
  const rainSources = getRainWaterSources();
  if (!titleActive && !optionsDialog.open && !deathState.active && rainSources.length) {
    for (const source of rainSources) {
      const id = `${world.id}:waterfall:${source.index}`;
      activeIds.add(id);
      const voice = getRainWaterVoice(state, id, source, { isCurrent: isCurrentAudioState });
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

function syncZombieSpatialAudio(state) {
  const buffer = state.audioBuffers.get(ZOMBIE_GRUNT_LOOP_URL);
  if (!buffer) {
    ensureZombieGruntLoop(state);
    stopZombieVoices(state);
    return;
  }

  const activeIds = new Set();
  if (!titleActive && !optionsDialog.open && !deathState.active && isEnemyGameplayEnabled()) {
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

function syncSpecialEnemyAudio(state) {
  const activeIds = new Set();
  if (!titleActive && !optionsDialog.open && !deathState.active && isEnemyGameplayEnabled()) {
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
        playEnemyAttackSound(state, enemy, profile, {
          playerY: player.y,
          volumeScale: 0.72,
          isCurrent: isCurrentAudioState,
        });
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

function getZombieGruntGain(zombie) {
  if (titleActive || optionsDialog.open || deathState.active || !isEnemyGameplayEnabled() || !zombie) return 0;

  const nearestDistance = Math.hypot(player.x - zombie.x, player.z - zombie.z);
  const occlusion = isZombieAudioOccluded(zombie) ? ZOMBIE_GRUNT_OCCLUDED_GAIN_MULTIPLIER : 1;

  if (nearestDistance >= ZOMBIE_GRUNT_MAX_DISTANCE) return 0;
  if (nearestDistance <= ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE) return ZOMBIE_GRUNT_MAX_GAIN * occlusion;

  const fadeRange = ZOMBIE_GRUNT_MAX_DISTANCE - ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE;
  const fade = 1 - (nearestDistance - ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE) / fadeRange;
  return Math.max(0, Math.min(ZOMBIE_GRUNT_MAX_GAIN, fade * fade * ZOMBIE_GRUNT_MAX_GAIN * occlusion));
}

function isZombieAudioOccluded(zombie) {
  return isAudioPathOccluded(
    { x: player.x, y: player.y, z: player.z },
    { x: zombie.x, y: zombie.y, z: zombie.z },
    colliders,
  );
}

function createViewProjection(now = performance.now()) {
  const projection = perspective(Math.PI / 3.2, PS1_RENDER_TARGET.aspect, 0.08, 80);
  const view = cameraView(getGameplayCamera(now));
  return multiplyMat4(projection, view);
}

function getActiveCamera(now) {
  if (deathState.active) return getDeathSceneCamera(deathState, player, now);
  return getBossImpactCamera(now);
}

function getGameplayCamera(now = performance.now()) {
  if (effects.debugFreeCam && !deathState.active) return debugFreeCamera;
  return getActiveCamera(now);
}

function getDebugPlayerMarker() {
  return {
    x: player.x,
    y: player.y,
    z: player.z,
    radius: 0.34,
    height: 1.72,
    texture: 'healthPotion',
  };
}

function getBossImpactCamera(now) {
  const progress = (now - bossImpactShakeStartedAt) / BOSS_IMPACT_SHAKE_DURATION_MS;
  if (progress < 0 || progress > 1 || bossImpactShakeStrength <= 0) return player;

  const fade = 1 - progress;
  const shake = Math.sin(now * 0.11) * bossImpactShakeStrength * fade;
  const sideShake = Math.cos(now * 0.083) * bossImpactShakeStrength * fade * 0.62;
  return {
    ...player,
    x: player.x + sideShake,
    y: player.y + Math.abs(shake) * 0.55,
    z: player.z + shake,
  };
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
    if (bootWarningActive) {
      event.preventDefault();
      return;
    }

    if (titleActive) {
      ensureSceneAudio();
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        startRandomScene();
      } else if (event.code === 'KeyG') {
        event.preventDefault();
        startGeometryGardenMode();
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
    const lookTarget = getMouseLookTarget();
    const look = applyMouseLook(lookTarget, delta, { invertY: effects.invertY });
    lookTarget.yaw = look.yaw;
    lookTarget.pitch = look.pitch;
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
  const joystick = createTouchJoystickState({
    originX: touchMovement.originX,
    originY: touchMovement.originY,
    clientX: event.clientX,
    clientY: event.clientY,
  });

  touchMovement.x = joystick.x;
  touchMovement.z = joystick.z;
  touchMoveStick.style.transform = `translate(${joystick.stickX}px, ${joystick.stickY}px)`;
}

function updateTouchLook(event) {
  const delta = {
    movementX: event.clientX - touchLook.x,
    movementY: event.clientY - touchLook.y,
  };
  const lookTarget = getMouseLookTarget();
  const look = applyMouseLook(lookTarget, delta, {
    invertY: effects.invertY,
    yawSensitivity: 0.0042,
    pitchSensitivity: 0.0032,
  });

  lookTarget.yaw = look.yaw;
  lookTarget.pitch = look.pitch;
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

  const snapshot = createGamepadSnapshot(gamepad, gamepadInput.previousButtons);

  if (titleActive) {
    if (bootWarningActive) {
      gamepadInput.previousButtons = snapshot.pressedButtons;
      return;
    }
    if (snapshot.startPressed) startRandomScene();
    gamepadInput.previousButtons = snapshot.pressedButtons;
    return;
  }

  gamepadInput.x = snapshot.x;
  gamepadInput.z = snapshot.z;
  gamepadInput.lookX = snapshot.lookX;
  gamepadInput.lookY = snapshot.lookY;
  gamepadInput.jump = snapshot.jump;
  gamepadInput.sprint = snapshot.sprint;

  if (snapshot.menuPressed) {
    ensureSceneAudio();
    toggleOptions();
  }

  gamepadInput.previousButtons = snapshot.pressedButtons;
}

function applyGamepadLook(dt) {
  if (titleActive || optionsDialog.open || deathState.active) return;
  if (Math.abs(gamepadInput.lookX) <= 0 && Math.abs(gamepadInput.lookY) <= 0) return;

  const lookTarget = getMouseLookTarget();
  const look = applyMouseLook(lookTarget, {
    movementX: gamepadInput.lookX * dt * 920,
    movementY: gamepadInput.lookY * dt * 760,
  }, { invertY: effects.invertY });

  lookTarget.yaw = look.yaw;
  lookTarget.pitch = look.pitch;
}

function getPrimaryGamepad() {
  const pads = navigator.getGamepads?.() ?? [];
  return [...pads].find((pad) => pad?.connected) ?? null;
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

  softMouseEdgeTurn = createSoftMouseEdgeTurn({
    clientX: event.clientX,
    clientY: event.clientY,
    width: window.innerWidth,
    height: window.innerHeight,
  });
}

function updateContinuousMouseLook(dt) {
  if (!softMouseLockActive || optionsDialog.open) return;

  const lookTarget = getMouseLookTarget();
  lookTarget.yaw += softMouseEdgeTurn.yaw * dt;
  lookTarget.pitch = clamp(lookTarget.pitch + softMouseEdgeTurn.pitch * dt, -0.92, 0.92);
}

function getMouseLookTarget() {
  return effects.debugFreeCam ? debugFreeCamera : player;
}

function isEnemyGameplayEnabled() {
  return effects.zombies && gameState.mode !== 'geometry-garden';
}

function syncDebugFreeCameraToPlayer() {
  debugFreeCamera.x = player.x;
  debugFreeCamera.y = player.y;
  debugFreeCamera.z = player.z;
  debugFreeCamera.yaw = player.yaw;
  debugFreeCamera.pitch = player.pitch;
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
  bindTitleButton(startButton, titleButtonState, () => startRandomScene());
  bindTitleButton(geometryGardenButton, geometryGardenButtonState, () => startGeometryGardenMode());
  bindTitleButton(cutUpButton, cutUpButtonState, () => startCutUpMode());
  bindTitleButton(rogueButton, rogueButtonState, () => startRogueMode());
  bindTitleButton(titleOptionsButton, titleOptionsButtonState, () => {
    openOptions({ releasePointerLock: false });
  });
  quitGameButton.addEventListener('click', () => {
    playUiSelectSound();
    quitToTitleScreen();
  });
  rogueReturnButton.addEventListener('click', () => {
    playUiSelectSound();
    quitToTitleScreen();
  });

  for (const [id, key] of OPTION_CHECKBOX_BINDINGS) {
    const input = document.querySelector(`#${id}`);
    input.checked = Boolean(effects[key]);
    input.addEventListener('change', () => {
      playUiToggleSound();
      effects[key] = input.checked;
      if (key === 'showReticule') syncReticule();
      if (key === 'radarMap') updateRadarHud();
      if (key === 'debugHud') updateDebugHud(0);
      if (key === 'debugFreeCam' && input.checked) syncDebugFreeCameraToPlayer();
      saveOptions(effects);
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
    saveOptions(effects);
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
    saveOptions(effects);
  });

  const pixelScale = document.querySelector('#pixelScale');
  pixelScale.value = String(effects.pixelScale);
  pixelScale.addEventListener('input', () => {
    playUiToggleSound();
    effects.pixelScale = normalizePixelScale(pixelScale.value);
    pixelScale.value = String(effects.pixelScale);
    canvas.style.imageRendering = effects.pixelScale <= 1 ? 'auto' : 'pixelated';
    saveOptions(effects);
  });

  const musicVolume = document.querySelector('#musicVolume');
  musicVolume.value = String(effects.musicVolume);
  musicVolume.addEventListener('input', () => {
    effects.musicVolume = clamp(Number(musicVolume.value), 0, 1);
    syncAudioMasterVolumes(audioState, effects);
    saveOptions(effects);
  });

  const sfxVolume = document.querySelector('#sfxVolume');
  sfxVolume.value = String(effects.sfxVolume);
  sfxVolume.addEventListener('input', () => {
    effects.sfxVolume = clamp(Number(sfxVolume.value), 0, 1);
    syncAudioMasterVolumes(audioState, effects);
    saveOptions(effects);
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

function bindTitleButton(button, buttonState, onClick) {
  button.addEventListener('click', onClick);
  button.addEventListener('pointerenter', () => {
    buttonState.active = true;
    playUiHoverSound();
  });
  button.addEventListener('pointerleave', () => {
    buttonState.active = false;
  });
  button.addEventListener('focus', () => {
    buttonState.active = true;
    playUiHoverSound();
  });
  button.addEventListener('blur', () => {
    buttonState.active = false;
  });
}

function syncOptionsControls() {
  for (const [id, key] of OPTION_CHECKBOX_BINDINGS) {
    const input = document.querySelector(`#${id}`);
    if (input) input.checked = Boolean(effects[key]);
  }

  const preset = document.querySelector('#preset');
  if (preset) preset.value = effects.preset;

  const resolution = document.querySelector('#resolution');
  if (resolution) resolution.value = effects.resolutionId;

  const pixelScale = document.querySelector('#pixelScale');
  if (pixelScale) pixelScale.value = String(effects.pixelScale);

  const musicVolume = document.querySelector('#musicVolume');
  if (musicVolume) musicVolume.value = String(effects.musicVolume);

  const sfxVolume = document.querySelector('#sfxVolume');
  if (sfxVolume) sfxVolume.value = String(effects.sfxVolume);

  canvas.style.imageRendering = effects.pixelScale <= 1 ? 'auto' : 'pixelated';
  syncAudioMasterVolumes(audioState, effects);
  syncReticule();
  updateRadarHud();
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

async function startGeometryGardenMode() {
  if (!titleActive) return;

  gameState.mode = 'geometry-garden';
  cutUpState.active = false;
  cutUpHud.hidden = true;
  rogueRun = null;
  rogueTransitionPending = false;
  rogueWinScreen.hidden = true;
  ensureSceneAudio();
  playMenuStartConfirmSound();
  playTransitionOneShot(FREE_ROAM_START_SOUND_URL);
  const sceneLoaded = await setScene(GEOMETRY_GARDEN_SCENE_ID);
  if (!sceneLoaded) return;
  zombies = [];
  bloodBursts = [];
  hordeState = createHordeState(world);
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
  hordeState = createHordeState(world);
  bloodBursts = [];
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

function renderTitleScreen(time) {
  drawTitleScreen(titleContext, time, {
    buttons: {
      freeRoam: titleButtonState.active,
      geometryGarden: geometryGardenButtonState.active,
      cutUp: cutUpButtonState.active,
      rogue: rogueButtonState.active,
      options: titleOptionsButtonState.active,
    },
  });
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
  const zombieCount = zombies.length;
  const snapshot = createDebugHudSnapshot({
    previousFps: debugHud.fps,
    dt,
    debugEnabled: effects.debugHud,
    sceneLabel: world.label,
    zombieCount,
    zombiesEnabled: isEnemyGameplayEnabled(),
  });
  debugHud.fps = snapshot.fps;
  applyDebugHudSnapshot({
    panel: debugHudPanel,
    fps: debugFps,
    scene: debugScene,
    zombies: debugZombies,
    enemies: debugEnemies,
  }, snapshot);
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
  if (state && enemy) {
    playEnemyAttackSound(state, enemy, getEnemyAudioProfile(enemy), {
      playerY: player.y,
      isCurrent: isCurrentAudioState,
    });
  }
  playPlayerOneShot(PLAYER_DAMAGE_SOUND_URL, PLAYER_DAMAGE_SOUND_GAIN);
  if (playerHealth.dead) {
    startDeathSequence(now, { damage: false });
  }
}

function getEnemyDamage(enemy) {
  return enemy?.damage ?? getEnemyDefinition(enemy?.enemyType).base.attackDamage ?? ZOMBIE_BITE_DAMAGE;
}

function createEnemyBloodBursts(previousEnemies, currentEnemies, now) {
  const previousById = new Map(previousEnemies.map((enemy) => [enemy.id, enemy]));
  return currentEnemies
    .filter((enemy) => (
      enemy.state === 'dying' && previousById.get(enemy.id)?.state !== 'dying'
    ) || (
      enemy.hitByEnemyType === 'molten-sentinel'
      && enemy.lastHitAt === now
      && previousById.get(enemy.id)?.lastHitAt !== enemy.lastHitAt
    ))
    .map((enemy) => createBloodBurst(enemy, now));
}

function triggerBossImpactFeedback(previousEnemies, currentEnemies, now) {
  const previousById = new Map(previousEnemies.map((enemy) => [enemy.id, enemy]));
  const victim = currentEnemies.find((enemy) => (
    enemy.hitByEnemyType === 'molten-sentinel'
    && enemy.lastHitAt === now
    && previousById.get(enemy.id)?.lastHitAt !== enemy.lastHitAt
  ));
  if (!victim) return;

  const boss = currentEnemies.find((enemy) => enemy.id === victim.hitById);
  if (boss) {
    const state = ensureAudioState();
    if (state) {
      playEnemyAttackSound(state, boss, getEnemyAudioProfile(boss), {
        playerY: player.y,
        volumeScale: 1.18,
        isCurrent: isCurrentAudioState,
      });
    }
  }

  const distance = Math.hypot(player.x - victim.x, player.z - victim.z);
  if (distance <= BOSS_IMPACT_SHAKE_DISTANCE) {
    const distanceFade = 1 - distance / BOSS_IMPACT_SHAKE_DISTANCE;
    bossImpactShakeStartedAt = now;
    bossImpactShakeStrength = BOSS_IMPACT_SHAKE_STRENGTH * (0.35 + distanceFade * 0.65);
  }
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

function updateSceneCollectibles(now) {
  const result = updateCollectibles(world, collectibles, player);
  if (!result.picked.length) return;

  collectibles = result.remaining;
  for (const id of result.collectedIds) {
    collectedCollectibleIds.add(id);
  }
  if (result.noticeText) showGameplayNotice(result.noticeText, now);
  healthPickupFlashStartedAt = now;
  playPlayerOneShot(HEALTH_PICKUP_SOUND_URL, HEALTH_PICKUP_SOUND_GAIN * 0.85);
  rebuildWarehouseMesh();
}

function getHealthEffectStrength(now) {
  return getHealthEffectStrengthAmount({
    playerHealth,
    now,
    titleActive,
    optionsOpen: optionsDialog.open,
    deathActive: deathState.active,
  });
}

function getHealthPickupFlash(now) {
  return getHealthPickupFlashAmount({
    now,
    startedAt: healthPickupFlashStartedAt,
  });
}

function getDamageFlash(now) {
  return getDamageFlashAmount({
    now,
    startedAt: lastDamageFlashStartedAt,
    titleActive,
    optionsOpen: optionsDialog.open,
    deathActive: deathState.active,
  });
}

function updateLowHealthNotice(now) {
  if (!lowHealthNotice) return;

  const gameplayElapsed = now - gameplayNoticeStartedAt;
  const gameplayVisible = !titleActive
    && !optionsDialog.open
    && !deathState.active
    && gameplayElapsed >= 0
    && gameplayElapsed <= LOW_HEALTH_NOTICE_DURATION_MS;
  const elapsed = now - lowHealthNoticeStartedAt;
  const lowHealthVisible = !titleActive
    && !optionsDialog.open
    && !deathState.active
    && elapsed >= 0
    && elapsed <= LOW_HEALTH_NOTICE_DURATION_MS;
  lowHealthNotice.hidden = !gameplayVisible && !lowHealthVisible;
  if (gameplayVisible) {
    lowHealthNotice.textContent = gameplayNoticeText;
  } else if (lowHealthVisible) {
    lowHealthNotice.textContent = 'Low health';
  }
}

function updateRadarHud(now = performance.now()) {
  const visible = effects.radarMap
    && !titleActive
    && !optionsDialog.open
    && !deathState.active
    && rogueWinScreen.hidden;
  radarHudCanvas.hidden = !visible;
  if (!visible) {
    radarHudContext.clearRect(0, 0, radarHudCanvas.width, radarHudCanvas.height);
    return;
  }

  drawRadarHud(radarHudContext, {
    player: getGameplayCamera(now),
    enemies: isEnemyGameplayEnabled() ? zombies : [],
    portal: world.warpGate,
  });
}

function showGameplayNotice(text, now) {
  gameplayNoticeText = text;
  gameplayNoticeStartedAt = now;
}

function startDeathSequence(now, options = {}) {
  if (deathState.active) return;

  const scene = createDeathScene({
    now,
    player,
    world,
    profileId: options.profile,
  });
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

function getDeathSceneProgress(now) {
  return getDeathSceneProgressAmount(deathState, now);
}

function getDeathSceneFinalProgress(now) {
  return getDeathSceneFinalProgressAmount(deathState, now);
}

function playFinalDeathRattle() {
  const state = ensureAudioState();
  if (!state) return;

  const now = state.context.currentTime;
  playHeartbeatThump(state, now, 54, 0.12);
  playHeartbeatThump(state, now + 0.11, 41, 0.09);
}

function getDeathTint(now) {
  return getDeathTintAmount(deathState, now);
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
    collectibles: collectibles.map((item) => ({ ...item })),
    collectedCollectibleIds: [...collectedCollectibleIds],
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
  collectibles = state.collectibles.map((item) => ({ ...item }));
  collectedCollectibleIds = new Set(state.collectedCollectibleIds);
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
  collectibles = createSceneCollectibles(world);
  collectedCollectibleIds = new Set();
  damageZones = createSceneDamageZones(world);
  resetPlayerToSpawn();

  deleteMeshBuffers(gl, warehouseMesh);
  deleteMeshBuffers(gl, zombieMesh);
  gl.deleteTexture(atlasTexture);
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions, collectedCollectibleIds }, textureIndices);
  zombieMesh = createZombieMesh(gl);
  atlasTexture = await createSceneTextureAtlas(gl, world, characterTextureImages);
  if (audioState) ensureSceneAudio();
  syncSceneSelect();
  return true;
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
  syncDebugFreeCameraToPlayer();
  playerHealth = createPlayerHealth();
  healthPickupFlashStartedAt = -Infinity;
  lastDamageFlashStartedAt = -Infinity;
  damageScratchOffset = { x: 0, y: 0 };
  damageScratchRotation = 0;
  lowHealthNoticeStartedAt = -Infinity;
  gameplayNoticeStartedAt = -Infinity;
  gameplayNoticeText = '';
  lastDamageZoneSoundAt = -Infinity;
  if (lowHealthNotice) lowHealthNotice.hidden = true;
  lastZombieBiteAt = -Infinity;
  zombies = createZombieEnemies(world);
}

function rebuildWarehouseMesh() {
  deleteMeshBuffers(gl, warehouseMesh);
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions, collectedCollectibleIds }, textureIndices);
}

function drawSkyDome(time, now) {
  drawSkyDomeMesh(gl, {
    skyDome: world.skyDome,
    program: skyProgram,
    mesh: skyDomeMesh,
    time,
    camera: getGameplayCamera(now),
    viewProjection: createViewProjection(now),
  });
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
  collectibles = createSceneCollectibles(world);
  collectedCollectibleIds = new Set();
  damageZones = createSceneDamageZones(world);
  resetPlayerToSpawn();
  warehouseMesh = createSceneMesh(gl, { ...world, healthPotions, collectedCollectibleIds }, textureIndices);
  skyDomeMesh = createSkyDomeMesh(gl);
  zombieMesh = createZombieMesh(gl);
  quad = createPostQuad(gl);
  atlasTexture = await createSceneTextureAtlas(gl, world, characterTextureImages);
  renderTarget = createRenderTarget(gl, renderResolution.width, renderResolution.height);

  setupOptions();
  setupInput();
  resize();
  renderTitleScreen(0);
  startBootWarningTimer();
  loadAllCharacterModels().then(async () => {
    if (characterTextureImages.size > 0) {
      gl.deleteTexture(atlasTexture);
      atlasTexture = await createSceneTextureAtlas(gl, world, characterTextureImages);
    }
  });
  requestAnimationFrame(frame);
}

function startBootWarningTimer() {
  if (!bootWarning) {
    bootWarningActive = false;
    document.body.classList.remove('boot-warning-active');
    return;
  }
  window.setTimeout(() => {
    bootWarningActive = false;
    bootWarning.hidden = true;
    document.body.classList.remove('boot-warning-active');
  }, BOOT_WARNING_DURATION_MS);
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
