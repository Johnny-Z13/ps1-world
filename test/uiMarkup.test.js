import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const cutUpMode = readFileSync(new URL('../src/cutUpMode.js', import.meta.url), 'utf8');

test('renders a center reticule with an options toggle', () => {
  assert.match(index, /id="reticule"/);
  assert.match(index, /id="showReticule"/);
  assert.match(styles, /\.reticule/);
});

test('offers a small debug HUD with frame and enemy counts', () => {
  assert.match(index, /id="debugHud"/);
  assert.match(index, /id="debugHudToggle"/);
  assert.match(index, /Debug HUD/);
  assert.match(styles, /\.debug-hud/);
  assert.match(app, /function updateDebugHud/);
  assert.match(app, /debugHud\.fps/);
  assert.match(app, /effects\.debugHud/);
  assert.match(app, /zombies\.length/);
});

test('offers a clean test view video preset in the options menu', () => {
  assert.match(app, /VIDEO_PRESETS/);
  assert.match(app, /applyVideoPreset/);
  assert.match(app, /syncOptionsControls/);
});

test('starts on a PS1-style title screen before random scene play', () => {
  assert.match(index, /id="titleScreen"/);
  assert.match(index, /id="titleCanvas"/);
  assert.match(index, /id="startButton"/);
  assert.match(index, /aria-label="Free Roam"/);
  assert.match(styles, /\.title-screen/);
  assert.match(styles, /\.title-canvas/);
  assert.match(styles, /image-rendering:\s*pixelated/);
  assert.match(app, /function startRandomScene/);
  assert.match(app, /const TITLE_WIDTH = 512/);
  assert.match(app, /drawBitmapGlyph/);
  assert.match(app, /wasd\+mouse or gamepad/);
  assert.match(app, /watch out for the zombies/);
  assert.match(app, /drawBloodWarningText/);
  assert.doesNotMatch(app, /512i signal/);
  assert.match(app, /'\+':/);
  assert.match(app, /z:/);
  assert.match(app, /Math\.random\(\) \* SCENE_DEFINITIONS\.length/);
  assert.match(app, /document\.body\.classList\.remove\('title-active'\)/);
});

test('offers a hard Cut Up title mode that cycles all nine worlds', () => {
  assert.match(index, /id="cutUpButton"/);
  assert.match(index, /aria-label="Cut Up Mode"/);
  assert.match(index, /id="cutUpHud"/);
  assert.match(styles, /\.title-cut-up-hitbox/);
  assert.match(styles, /\.cut-up-hud/);
  assert.match(cutUpMode, /export const CUT_UP_SCENE_SECONDS = 10/);
  assert.match(app, /const CUT_UP_SCENE_COUNT = SCENE_DEFINITIONS\.length/);
  assert.match(app, /mode: 'normal'/);
  assert.match(app, /function startCutUpMode/);
  assert.match(app, /function updateCutUpMode/);
  assert.match(app, /function captureCutUpSceneState/);
  assert.match(app, /function restoreCutUpSceneState/);
  assert.match(app, /cutUpState\.sceneStates/);
  assert.match(app, /cutUpState\.unlockedSceneCount = CUT_UP_SCENE_COUNT/);
  assert.match(cutUpMode, /CUT UP/);
});

test('warns and flashes before Cut Up jumps scenes', () => {
  assert.match(cutUpMode, /export const CUT_UP_COUNTDOWN_SECONDS = 3/);
  assert.match(cutUpMode, /export const CUT_UP_FLASH_DURATION_MS = 260/);
  assert.match(cutUpMode, /jump in \$\{Math\.ceil\(remaining\)\}/);
  assert.match(app, /cutUpState\.flashStartedAt = now/);
  assert.match(cutUpMode, /function getCutUpJumpFlash/);
  assert.match(app, /uCutUpFlash/);
  assert.match(app, /mix\(color,\s*vec3\(1\.0\),\s*uCutUpFlash\)/);
});

test('keeps title mode buttons compact and vertically separated', () => {
  assert.match(styles, /max-width:\s*184px/);
  assert.match(styles, /max-height:\s*46px/);
  assert.match(styles, /--title-button-width:\s*calc\(var\(--title-width\) \* 0\.36\)/);
  assert.match(styles, /--title-button-height:\s*calc\(var\(--title-height\) \* 0\.096\)/);
  assert.match(app, /const titleButtonBlink = getTitleButtonBlink\(time\)/);
  assert.match(app, /drawBitmapButton\(time,\s*\{ y: 286,\s*label: 'start',\s*detail: 'free roam'/);
  assert.match(app, /drawBitmapButton\(time,\s*\{ y: 346,\s*label: 'start',\s*detail: 'cut-up mode'/);
  assert.match(app, /const width = 184/);
  assert.match(app, /const height = 46/);
  assert.match(app, /const textScale = 2/);
});

test('plays a retro menu confirm sound when starting from the title screen', () => {
  assert.match(app, /MENU_START_CONFIRM_SOUND_URL/);
  assert.match(app, /menu-start-confirm-8bit\.mp3\?v=1/);
  assert.match(app, /function playMenuStartConfirmSound/);
  assert.match(app, /playPlayerOneShot\(MENU_START_CONFIRM_SOUND_URL,\s*MENU_START_CONFIRM_SOUND_GAIN\)/);
  assert.match(app, /playMenuStartConfirmSound\(\)/);
});

test('layers generated music beds for title, Free Roam, and Cut Up mode', () => {
  assert.match(app, /TITLE_MUSIC_LOOP_URL/);
  assert.match(app, /title-menu-psx-8bit-loop\.mp3\?v=1/);
  assert.match(app, /FREE_ROAM_MUSIC_LOOP_URL/);
  assert.match(app, /free-roam-dread-8bit-loop\.mp3\?v=1/);
  assert.match(app, /CUT_UP_MUSIC_LOOP_URL/);
  assert.match(app, /cut-up-clockwork-8bit-loop\.mp3\?v=1/);
  assert.match(app, /musicGain/);
  assert.match(app, /titleMusicGain/);
  assert.match(app, /freeRoamMusicGain/);
  assert.match(app, /cutUpMusicGain/);
  assert.match(app, /function ensureMusicLoop/);
  assert.match(app, /function syncCinematicMusicAudio/);
});

test('adds cinematic transition and UI sounds for game modes', () => {
  assert.match(app, /FREE_ROAM_START_SOUND_URL/);
  assert.match(app, /free-roam-start-warp-8bit\.mp3\?v=1/);
  assert.match(app, /CUT_UP_START_SOUND_URL/);
  assert.match(app, /cut-up-start-burst-8bit\.mp3\?v=1/);
  assert.match(app, /CUT_UP_SCENE_SLICE_SOUND_URL/);
  assert.match(app, /cut-up-scene-slice-8bit\.mp3\?v=1/);
  assert.match(app, /CUT_UP_COUNTDOWN_TICK_SOUND_URL/);
  assert.match(app, /cut-up-countdown-tick-8bit\.mp3\?v=1/);
  assert.match(app, /OPTIONS_OPEN_SOUND_URL/);
  assert.match(app, /options-open-static-8bit\.mp3\?v=1/);
  assert.match(app, /OPTIONS_CLOSE_SOUND_URL/);
  assert.match(app, /options-close-click-8bit\.mp3\?v=1/);
  assert.match(app, /uiSfxGain/);
  assert.match(app, /transitionSfxGain/);
  assert.match(app, /function playTransitionOneShot/);
  assert.match(app, /function playUiOneShot/);
  assert.match(app, /playTransitionOneShot\(FREE_ROAM_START_SOUND_URL/);
  assert.match(app, /playTransitionOneShot\(CUT_UP_START_SOUND_URL/);
  assert.match(app, /playTransitionOneShot\(CUT_UP_SCENE_SLICE_SOUND_URL/);
  assert.match(app, /playUiOneShot\(OPTIONS_OPEN_SOUND_URL/);
  assert.match(app, /playUiOneShot\(OPTIONS_CLOSE_SOUND_URL/);
});

test('crossfades world ambience and ticks down Cut Up scene jumps', () => {
  assert.match(app, /ambienceSlots/);
  assert.match(app, /function createAmbienceSlot/);
  assert.match(app, /function stopAmbienceSlotAfterFade/);
  assert.match(app, /CUT_UP_AUDIO_DUCK_DURATION_MS/);
  assert.match(app, /lastCutUpCountdownTick/);
  assert.match(app, /function syncCutUpCountdownAudio/);
  assert.match(app, /playTransitionOneShot\(CUT_UP_COUNTDOWN_TICK_SOUND_URL/);
  assert.match(app, /cutUpState\.lastCutUpCountdownTick = null/);
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

test('offers a quit action in the Escape menu that returns to the title screen', () => {
  assert.match(index, /id="quitGameButton"/);
  assert.match(index, />Quit game</);
  assert.match(app, /const quitGameButton = document\.querySelector\('#quitGameButton'\)/);
  assert.match(app, /quitGameButton\.addEventListener\('click',\s*\(\)\s*=>\s*\{/);
  assert.match(app, /function quitToTitleScreen/);
  assert.match(app, /document\.body\.classList\.add\('title-active'\)/);
  assert.match(app, /titleScreen\.hidden = false/);
});

test('renders one-bit scenes with ordered dithering instead of hard clipping', () => {
  assert.match(app, /orderedDither/);
  assert.match(app, /oneBitPaper/);
  assert.match(app, /oneBitInk/);
});

test('renders scene cards and motion flags for animated preset props', () => {
  assert.match(app, /scene\.floorPieces/);
  assert.match(app, /scene\.props/);
  assert.match(app, /scene\.cards/);
  assert.match(app, /scene\.movingBillboards/);
  assert.match(app, /function motionCode/);
  assert.match(app, /attribute float aMotion/);
});

test('renders low-poly animated torches with static orange light uniforms', () => {
  assert.match(app, /MAX_STATIC_TORCH_LIGHTS = 3/);
  assert.match(app, /torch-flame/);
  assert.match(app, /drawTorchFlameTexture/);
  assert.match(app, /setStaticTorchUniforms/);
  assert.match(app, /getTorchFlicker/);
  assert.match(app, /uStaticTorchPosition0/);
  assert.match(app, /uStaticTorchColor0/);
  assert.match(app, /uStaticTorchCount/);
  assert.match(app, /torchFlameMask/);
});

test('attaches spatial crackle audio emitters to animated torch lights', () => {
  assert.match(app, /torchCrackleVoices: new Map/);
  assert.match(app, /function syncTorchCrackleAudio/);
  assert.match(app, /function getTorchCrackleVoice/);
  assert.match(app, /function scheduleTorchCracklePulse/);
  assert.match(app, /world\.torchLights/);
  assert.match(app, /createPanner/);
  assert.match(app, /panner\.positionX\.setTargetAtTime\(torchLight\.x/);
  assert.match(app, /oscillator\.type = 'sawtooth'/);
  assert.match(app, /torch-crackle/);
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

test('plays a short death scene with camera impact, blood, and player death audio before respawn', () => {
  assert.match(app, /const DEATH_RESPAWN_DELAY_MS = 2500/);
  assert.match(app, /playerHealth/);
  assert.match(app, /DEATH_SCENE_PROFILES/);
  assert.match(app, /PLAYER_DEATH_SOUND_URL/);
  assert.match(app, /player-death-8bit\.mp3\?v=1/);
  assert.match(app, /deathState/);
  assert.match(app, /function startDeathSequence/);
  assert.match(app, /createDeathScene/);
  assert.match(app, /getDeathSceneCamera/);
  assert.match(app, /getDeathSceneProgress/);
  assert.match(app, /impactBounce/);
  assert.match(app, /playPlayerOneShot\(PLAYER_DEATH_SOUND_URL,\s*PLAYER_DEATH_SOUND_GAIN\)/);
  assert.match(app, /function updateDeathSequence/);
  assert.match(app, /function getDeathTint/);
  assert.match(app, /uDeathTint/);
  assert.match(app, /bloodParticle/);
  assert.match(app, /mix\(color,\s*vec3\(0\.78,\s*0\.02,\s*0\.02\),\s*uDeathTint\)/);
});

test('extends the death scene with final camera jitter, heavier blood, and a final death rattle', () => {
  assert.match(app, /const DEATH_RESPAWN_DELAY_MS = 2500/);
  assert.match(app, /finalJiggleStart/);
  assert.match(app, /finalJiggleStrength/);
  assert.match(app, /finalDeathRattlePlayed/);
  assert.match(app, /playFinalDeathRattle/);
  assert.match(app, /getDeathSceneFinalProgress/);
  assert.match(app, /finalBlood/);
  assert.match(app, /bloodParticle\(sourceUv,\s*vec2\(0\.32,\s*0\.54\)/);
}
);

test('tracks player health, low-health screen pressure, and breathing audio', () => {
  assert.match(app, /createPlayerHealth/);
  assert.match(app, /applyPlayerDamage/);
  assert.match(app, /restorePlayerHealth/);
  assert.match(app, /ZOMBIE_BITE_DAMAGE/);
  assert.match(app, /PLAYER_LOW_HEALTH_BREATHING_LOOP_URL/);
  assert.match(app, /player-low-health-breathing-8bit-loop\.mp3\?v=1/);
  assert.match(app, /function getHealthEffectStrength/);
  assert.match(app, /uHealthDanger/);
  assert.match(app, /uHealthPulse/);
  assert.match(app, /lowHealthBreathingGain/);
  assert.match(app, /function damagePlayer/);
  assert.match(app, /ZOMBIE_BITE_COOLDOWN_MS/);
});

test('flashes red claw damage and shows a low-health notice after zombie bites', () => {
  assert.match(index, /id="lowHealthNotice"/);
  assert.match(index, /Low health/);
  assert.match(styles, /\.low-health-notice/);
  assert.match(app, /const DAMAGE_FLASH_DURATION_MS/);
  assert.match(app, /const LOW_HEALTH_NOTICE_DURATION_MS/);
  assert.match(app, /lastDamageFlashStartedAt = now/);
  assert.match(app, /lowHealthNoticeStartedAt = now/);
  assert.match(app, /function getDamageFlash/);
  assert.match(app, /function updateLowHealthNotice/);
  assert.match(app, /uDamageFlash/);
  assert.match(app, /clawScratch/);
});

test('applies authored lava damage zones to the player', () => {
  assert.match(app, /damageZones/);
  assert.match(app, /function updateDamageZones/);
  assert.match(app, /function isPlayerInsideDamageZone/);
  assert.match(app, /damagePerSecond/);
  assert.match(app, /applyPlayerDamage\(playerHealth,\s*zone\.damagePerSecond \* dt\)/);
});

test('renders low-poly green health flasks and restores health on pickup', () => {
  assert.match(app, /scene\.healthPotions/);
  assert.match(app, /healthPotion/);
  assert.match(app, /pickup-bob/);
  assert.match(app, /function updateHealthPotions/);
  assert.match(app, /restorePlayerHealth/);
  assert.match(app, /function addHealthPotionFlask/);
  assert.match(app, /drawHealthPotionTexture/);
  assert.match(app, /HEALTH_PICKUP_SOUND_URL/);
  assert.match(app, /health-pickup-bing-8bit\.mp3\?v=1/);
  assert.match(app, /uHealthPickupFlash/);
  assert.match(app, /getHealthPickupFlash/);
  assert.match(app, /playPlayerOneShot\(HEALTH_PICKUP_SOUND_URL,\s*HEALTH_PICKUP_SOUND_GAIN\)/);
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

test('adds roaming zombie enemies that can kill the player', () => {
  assert.match(index, /id="zombies"/);
  assert.match(index, /Zombies/);
  assert.match(app, /animateZombieModel/);
  assert.match(app, /loadZombieGlb/);
  assert.match(app, /zombieModel/);
  assert.match(app, /addZombieModel/);
  assert.match(app, /const ZOMBIE_MODEL_FRONT_ROTATION = -Math\.PI \/ 2;/);
  assert.match(app, /const zombieMasterYaw = zombie\.yaw/);
  assert.match(app, /const zombieModelYaw = ZOMBIE_MODEL_FRONT_ROTATION/);
  assert.match(app, /rotateZombieLocalVertex/);
  assert.match(app, /rotateZombieMasterVertex/);
  assert.match(app, /drawZombieModelTexture/);
  assert.match(app, /createZombieEnemies/);
  assert.match(app, /updateZombieEnemies/);
  assert.match(app, /isPlayerTouchedByZombie/);
  assert.match(app, /createZombieMesh/);
  assert.match(app, /updateZombieMesh/);
  assert.match(app, /drawZombieTexture/);
  assert.match(app, /effects\.zombies/);
  assert.match(app, /damagePlayer\(now\)/);
  assert.match(app, /PLAYER_DAMAGE_SOUND_URL/);
  assert.match(app, /player-damage-grunt-8bit\.mp3\?v=1/);
});

test('loads Blender-authored GLB levels for scene art and collision', () => {
  assert.match(app, /loadLevelGlb/);
  assert.match(app, /LEVEL_GLB_URLS/);
  assert.match(app, /levelAsset/);
  assert.match(app, /createLevelMesh/);
  assert.match(app, /createLevelTextureAtlas/);
  assert.match(app, /sceneLoadRequest/);
  assert.match(app, /getSceneColliders\(world\)/);
  assert.match(app, /getSceneWalkableSurfaces\(world\)/);
});

test('loops zombie grunt audio when zombies are active near the player', () => {
  assert.match(app, /ZOMBIE_GRUNT_LOOP_URL/);
  assert.match(app, /zombie-idle-grunt-8bit-loop\.mp3\?v=1/);
  assert.match(app, /function ensureZombieGruntLoop/);
  assert.match(app, /function syncZombieSpatialAudio/);
  assert.match(app, /createPanner/);
  assert.match(app, /zombieVoices: new Map/);
  assert.match(app, /voice\.panner\.positionX\.setTargetAtTime/);
  assert.match(app, /updateAudioListener/);
  assert.match(app, /isZombieAudioOccluded/);
  assert.match(app, /lineIntersectsCollider2D/);
  assert.match(app, /ZOMBIE_GRUNT_OCCLUDED_GAIN_MULTIPLIER/);
  assert.match(app, /function getZombieGruntGain/);
  assert.match(app, /state\.zombieVoices/);
  assert.match(app, /source\.loop = true/);
  assert.match(app, /!effects\.zombies/);
  assert.match(app, /Math\.hypot\(player\.x - zombie\.x,\s*player\.z - zombie\.z\)/);
});

test('routes scene audio through cheap per-scene reverb settings', () => {
  assert.match(app, /SCENE_REVERB_PRESETS/);
  assert.match(app, /createConvolver/);
  assert.match(app, /createReverbImpulse/);
  assert.match(app, /applySceneReverb/);
  assert.match(app, /world\.audio\.reverb/);
  assert.match(app, /reverbWetGain\.gain\.setTargetAtTime/);
  assert.match(app, /dryGain/);
});

test('plays audio assets for lightning and scene ambience', () => {
  assert.match(app, /LIGHTNING_SOUND_URL/);
  assert.match(app, /lightning-bolt-strike\.mp3\?v=1/);
  assert.match(app, /SCENE_AMBIENCE_URLS/);
  for (const sceneId of [
    'dungeon',
    'alien-landscape',
    'derelict-starship',
    'neon-backstreets',
    'sunken-temple',
    'one-bit-cathedral',
    'rotwood-forest',
    'astral-geometry-garden',
    'motel-mirage',
  ]) {
    assert.match(app, new RegExp(`${sceneId}-8bit-loop\\.mp3\\?v=1`));
  }
  assert.match(app, /function loadAudioBuffer/);
  assert.match(app, /function ensureSceneAmbienceLoop/);
  assert.match(app, /function playAssetOneShot/);
  assert.match(app, /audioState\.ambienceGain\.gain\.setTargetAtTime/);
  assert.doesNotMatch(app, /createNoiseBuffer/);
});

test('crossfades walking and sprinting player footstep loops', () => {
  assert.match(app, /PLAYER_WALK_FOOTSTEP_LOOP_URL/);
  assert.match(app, /player-footsteps-walk-8bit-loop\.mp3\?v=1/);
  assert.match(app, /PLAYER_SPRINT_FOOTSTEP_LOOP_URL/);
  assert.match(app, /player-footsteps-sprint-8bit-loop\.mp3\?v=1/);
  assert.match(app, /function ensurePlayerFootstepLoops/);
  assert.match(app, /function syncPlayerFootstepAudio/);
  assert.match(app, /function getPlayerFootstepGains/);
  assert.match(app, /player\.grounded/);
  assert.match(app, /keys\.has\('ShiftLeft'\) \|\| gamepadInput\.sprint/);
  assert.match(app, /footstepWalkGain\.gain\.setTargetAtTime/);
  assert.match(app, /footstepSprintGain\.gain\.setTargetAtTime/);
});

test('loops a generated player heartbeat that speeds up near zombies', () => {
  assert.match(app, /PLAYER_HEARTBEAT_BASE_INTERVAL_MS/);
  assert.match(app, /PLAYER_HEARTBEAT_DANGER_INTERVAL_MS/);
  assert.match(app, /heartbeatGain/);
  assert.match(app, /function ensurePlayerHeartbeatLoop/);
  assert.match(app, /function scheduleHeartbeatPulse/);
  assert.match(app, /function getPlayerHeartbeatParams/);
  assert.match(app, /getNearestZombieDistance\(\)/);
  assert.match(app, /oscillator\.type = 'square'/);
  assert.match(app, /heartbeatLoopTimer/);
});
