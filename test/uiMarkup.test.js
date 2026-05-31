import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const audioConfig = readFileSync(new URL('../src/audioConfig.js', import.meta.url), 'utf8');
const enemyCatalog = readFileSync(new URL('../src/enemyCatalog.js', import.meta.url), 'utf8');
const generatedTextures = readFileSync(new URL('../src/generatedTextures.js', import.meta.url), 'utf8');
const renderShaders = readFileSync(new URL('../src/renderShaders.js', import.meta.url), 'utf8');
const runtimeSource = [app, audioConfig, enemyCatalog, generatedTextures, renderShaders].join('\n');
const zombieModel = readFileSync(new URL('../src/zombieModel.js', import.meta.url), 'utf8');
const cutUpMode = readFileSync(new URL('../src/cutUpMode.js', import.meta.url), 'utf8');

test('renders a center reticule with an options toggle', () => {
  assert.match(index, /id="reticule"/);
  assert.match(index, /id="showReticule"/);
  assert.match(styles, /\.reticule/);
});

test('offers a small debug HUD with frame and enemy counts', () => {
  assert.match(index, /id="debugHud"/);
  assert.match(index, /id="debugHudToggle"/);
  assert.match(index, /id="debugScene"/);
  assert.match(index, /Debug HUD/);
  assert.match(styles, /\.debug-hud/);
  assert.match(runtimeSource, /function updateDebugHud/);
  assert.match(runtimeSource, /debugHud\.fps/);
  assert.match(runtimeSource, /effects\.debugHud/);
  assert.match(runtimeSource, /debugScene/);
  assert.match(runtimeSource, /world\.label/);
  assert.match(runtimeSource, /zombies\.length/);
});

test('offers a clean test view video preset in the options menu', () => {
  assert.match(runtimeSource, /VIDEO_PRESETS/);
  assert.match(runtimeSource, /applyVideoPreset/);
  assert.match(runtimeSource, /syncOptionsControls/);
});

test('starts on a PS1-style title screen before random scene play', () => {
  assert.match(index, /id="titleScreen"/);
  assert.match(index, /id="titleCanvas"/);
  assert.match(index, /id="startButton"/);
  assert.match(index, /aria-label="Free Roam"/);
  assert.match(styles, /\.title-screen/);
  assert.match(styles, /\.title-canvas/);
  assert.match(styles, /image-rendering:\s*pixelated/);
  assert.match(runtimeSource, /function startRandomScene/);
  assert.match(runtimeSource, /const TITLE_WIDTH = 512/);
  assert.match(runtimeSource, /drawBitmapGlyph/);
  assert.match(runtimeSource, /TITLE_LAST_COMMIT_MESSAGE = 'last commit polish scenes and gameplay feedback'/);
  assert.match(runtimeSource, /drawCenteredBitmapText\(TITLE_LAST_COMMIT_MESSAGE,\s*462,\s*1,\s*'#8f8a77',\s*time/);
  assert.match(runtimeSource, /wasd\+mouse or gamepad/);
  assert.match(runtimeSource, /watch out for the zombies/);
  assert.match(runtimeSource, /drawBloodWarningText/);
  assert.doesNotMatch(runtimeSource, /512i signal/);
  assert.match(runtimeSource, /'\+':/);
  assert.match(runtimeSource, /z:/);
  assert.match(runtimeSource, /Math\.random\(\) \* SCENE_DEFINITIONS\.length/);
  assert.match(runtimeSource, /document\.body\.classList\.remove\('title-active'\)/);
});

test('offers a hard Cut Up title mode that cycles all nine worlds', () => {
  assert.match(index, /id="cutUpButton"/);
  assert.match(index, /aria-label="Cut Up Mode"/);
  assert.match(index, /id="cutUpHud"/);
  assert.match(styles, /\.title-cut-up-hitbox/);
  assert.match(styles, /\.cut-up-hud/);
  assert.match(cutUpMode, /export const CUT_UP_SCENE_SECONDS = 10/);
  assert.match(runtimeSource, /const CUT_UP_SCENE_COUNT = SCENE_DEFINITIONS\.length/);
  assert.match(runtimeSource, /mode: 'normal'/);
  assert.match(runtimeSource, /function startCutUpMode/);
  assert.match(runtimeSource, /function updateCutUpMode/);
  assert.match(runtimeSource, /function captureCutUpSceneState/);
  assert.match(runtimeSource, /function restoreCutUpSceneState/);
  assert.match(runtimeSource, /const sceneLoaded = await setScene\(sceneId\);\s*if \(!sceneLoaded\) return;\s*restoreCutUpSceneState\(sceneId\);/);
  assert.match(runtimeSource, /cutUpState\.sceneStates/);
  assert.match(runtimeSource, /cutUpState\.unlockedSceneCount = CUT_UP_SCENE_COUNT/);
  assert.match(cutUpMode, /CUT UP/);
});

test('offers Rogue title mode with warp progression and a victory screen', () => {
  assert.match(index, /id="rogueButton"/);
  assert.match(index, /aria-label="Rogue"/);
  assert.match(index, /id="rogueWinScreen"/);
  assert.match(index, /id="rogueReturnButton"/);
  assert.match(index, /GAME OVER/);
  assert.match(index, /ALL 9 WORLDS CLEARED/);
  assert.match(styles, /\.title-rogue-hitbox/);
  assert.match(styles, /\.rogue-win-screen/);
  assert.match(styles, /@keyframes rogueWinJitter/);
  assert.match(styles, /image-rendering:\s*pixelated/);
  assert.match(runtimeSource, /ROGUE_WIN_SOUND_URL/);
  assert.match(runtimeSource, /rogue-win-confetti\.wav\?v=1/);
  assert.match(runtimeSource, /function startRogueMode/);
  assert.match(runtimeSource, /function updateRogueMode/);
  assert.match(runtimeSource, /function completeRogueRun/);
  assert.match(runtimeSource, /gameState\.mode = 'rogue'/);
  assert.match(runtimeSource, /let rogueTransitionPending = false/);
  assert.match(runtimeSource, /if \(rogueTransitionPending\) return/);
  assert.match(runtimeSource, /world\.warpGate/);
  assert.match(runtimeSource, /addWarpGate/);
  assert.match(runtimeSource, /rogueReturnButton\.addEventListener\('click'/);
});

test('warns and flashes before Cut Up jumps scenes', () => {
  assert.match(cutUpMode, /export const CUT_UP_COUNTDOWN_SECONDS = 3/);
  assert.match(cutUpMode, /export const CUT_UP_FLASH_DURATION_MS = 260/);
  assert.doesNotMatch(cutUpMode, /jump in \$\{Math\.ceil\(remaining\)\}/);
  assert.match(runtimeSource, /cutUpState\.flashStartedAt = now/);
  assert.match(cutUpMode, /function getCutUpJumpFlash/);
  assert.match(runtimeSource, /uCutUpFlash/);
  assert.match(runtimeSource, /uCutUpCountdown/);
  assert.match(runtimeSource, /function getCutUpCountdownNumber/);
  assert.match(runtimeSource, /float cutUpCountdownMask/);
  assert.match(runtimeSource, /vec2 wordUv = \(uv - vec2\(0\.39, 0\.525\)\) \/ vec2\(0\.22, 0\.07\)/);
  assert.match(runtimeSource, /vec2 numberUv = \(uv - vec2\(0\.465, 0\.395\)\) \/ vec2\(0\.07, 0\.11\)/);
  assert.match(runtimeSource, /pixelDigit/);
  assert.match(runtimeSource, /pixelLetter/);
  assert.doesNotMatch(runtimeSource, /sin\(uTime \* 15\.0 \+ uv\.y \* 55\.0\)/);
  assert.doesNotMatch(runtimeSource, /rand\(floor\(gl_FragCoord\.xy \/ 3\.0\) \+ uTime\)/);
  assert.match(runtimeSource, /mix\(color,\s*vec3\(1\.0\),\s*uCutUpFlash\)/);
});

test('keeps title mode buttons compact and vertically separated', () => {
  assert.match(styles, /max-width:\s*150px/);
  assert.match(styles, /max-height:\s*32px/);
  assert.match(styles, /--title-button-width:\s*calc\(var\(--title-width\) \* 0\.29\)/);
  assert.match(styles, /--title-button-height:\s*calc\(var\(--title-height\) \* 0\.067\)/);
  assert.match(runtimeSource, /const titleButtonBlink = getTitleButtonBlink\(time\)/);
  assert.match(runtimeSource, /drawBitmapButton\(time,\s*\{ y: 264,\s*label: 'free roam'/);
  assert.match(runtimeSource, /drawBitmapButton\(time,\s*\{ y: 310,\s*label: 'cut-up mode'/);
  assert.match(runtimeSource, /drawBitmapButton\(time,\s*\{ y: 356,\s*label: 'rogue'/);
  assert.match(runtimeSource, /drawCenteredBitmapText\('wasd\+mouse or gamepad', 416, 1\.25/);
  assert.match(runtimeSource, /drawCenteredBitmapText\(TITLE_LAST_COMMIT_MESSAGE, 462, 1/);
  assert.match(runtimeSource, /const width = 150/);
  assert.match(runtimeSource, /const height = 32/);
  assert.match(runtimeSource, /const textScale = 1\.5/);
  assert.match(runtimeSource, /drawCenteredBitmapText\('ps1-world', 146, 7/);
  assert.match(styles, /font-size:\s*11px/);
});

test('plays a retro menu confirm sound when starting from the title screen', () => {
  assert.match(runtimeSource, /MENU_START_CONFIRM_SOUND_URL/);
  assert.match(runtimeSource, /menu-start-confirm-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /function playMenuStartConfirmSound/);
  assert.match(runtimeSource, /playPlayerOneShot\(MENU_START_CONFIRM_SOUND_URL,\s*MENU_START_CONFIRM_SOUND_GAIN\)/);
  assert.match(runtimeSource, /playMenuStartConfirmSound\(\)/);
});

test('layers generated music beds for title, Free Roam, and Cut Up mode', () => {
  assert.match(runtimeSource, /TITLE_MUSIC_LOOP_URL/);
  assert.match(runtimeSource, /title-menu-psx-8bit-loop\.mp3\?v=2/);
  assert.match(runtimeSource, /FREE_ROAM_MUSIC_LOOP_URL/);
  assert.match(runtimeSource, /free-roam-dread-8bit-loop\.mp3\?v=1/);
  assert.match(runtimeSource, /CUT_UP_MUSIC_LOOP_URL/);
  assert.match(runtimeSource, /cut-up-clockwork-8bit-loop\.mp3\?v=1/);
  assert.match(runtimeSource, /musicGain/);
  assert.match(runtimeSource, /titleMusicGain/);
  assert.match(runtimeSource, /freeRoamMusicGain/);
  assert.match(runtimeSource, /cutUpMusicGain/);
  assert.match(runtimeSource, /function ensureMusicLoop/);
  assert.match(runtimeSource, /function syncCinematicMusicAudio/);
});

test('adds cinematic transition and UI sounds for game modes', () => {
  assert.match(runtimeSource, /FREE_ROAM_START_SOUND_URL/);
  assert.match(runtimeSource, /free-roam-start-warp-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /CUT_UP_START_SOUND_URL/);
  assert.match(runtimeSource, /cut-up-start-burst-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /CUT_UP_SCENE_SLICE_SOUND_URL/);
  assert.match(runtimeSource, /cut-up-scene-slice-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /CUT_UP_COUNTDOWN_TICK_SOUND_URL/);
  assert.match(runtimeSource, /cut-up-countdown-tick-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /OPTIONS_OPEN_SOUND_URL/);
  assert.match(runtimeSource, /options-open-static-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /OPTIONS_CLOSE_SOUND_URL/);
  assert.match(runtimeSource, /options-close-click-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /uiSfxGain/);
  assert.match(runtimeSource, /transitionSfxGain/);
  assert.match(runtimeSource, /function playTransitionOneShot/);
  assert.match(runtimeSource, /function playUiOneShot/);
  assert.match(runtimeSource, /playTransitionOneShot\(FREE_ROAM_START_SOUND_URL/);
  assert.match(runtimeSource, /playTransitionOneShot\(CUT_UP_START_SOUND_URL/);
  assert.match(runtimeSource, /playTransitionOneShot\(CUT_UP_SCENE_SLICE_SOUND_URL/);
  assert.match(runtimeSource, /playUiOneShot\(OPTIONS_OPEN_SOUND_URL/);
  assert.match(runtimeSource, /playUiOneShot\(OPTIONS_CLOSE_SOUND_URL/);
});

test('crossfades world ambience and ticks down Cut Up scene jumps', () => {
  assert.match(runtimeSource, /ambienceSlots/);
  assert.match(runtimeSource, /function createAmbienceSlot/);
  assert.match(runtimeSource, /function stopAmbienceSlotAfterFade/);
  assert.match(runtimeSource, /CUT_UP_AUDIO_DUCK_DURATION_MS/);
  assert.match(runtimeSource, /lastCutUpCountdownTick/);
  assert.match(runtimeSource, /function syncCutUpCountdownAudio/);
  assert.match(runtimeSource, /playTransitionOneShot\(CUT_UP_COUNTDOWN_TICK_SOUND_URL/);
  assert.match(runtimeSource, /cutUpState\.lastCutUpCountdownTick = null/);
});

test('hides the game canvas cursor during play', () => {
  assert.match(styles, /cursor:\s*none/);
  assert.match(styles, /body\.options-open\s+#screen/);
});

test('keeps mouse look tied to pointer lock until Escape releases it', () => {
  assert.match(runtimeSource, /pointerlockchange/);
  assert.match(runtimeSource, /hasActiveMouseCapture/);
  assert.match(runtimeSource, /softMouseLockActive/);
  assert.match(runtimeSource, /openOptions\(\{ releasePointerLock: false \}\)/);
});

test('offers a quit action in the Escape menu that returns to the title screen', () => {
  assert.match(index, /id="quitGameButton"/);
  assert.match(index, />Quit game</);
  assert.match(runtimeSource, /const quitGameButton = document\.querySelector\('#quitGameButton'\)/);
  assert.match(runtimeSource, /quitGameButton\.addEventListener\('click',\s*\(\)\s*=>\s*\{/);
  assert.match(runtimeSource, /function quitToTitleScreen/);
  assert.match(runtimeSource, /document\.body\.classList\.add\('title-active'\)/);
  assert.match(runtimeSource, /titleScreen\.hidden = false/);
});

test('renders one-bit scenes with ordered dithering instead of hard clipping', () => {
  assert.match(runtimeSource, /orderedDither/);
  assert.match(runtimeSource, /oneBitPaper/);
  assert.match(runtimeSource, /oneBitInk/);
  assert.match(runtimeSource, /oneBitMid/);
  assert.match(runtimeSource, /oneBitAccent/);
  assert.match(runtimeSource, /oneBitDepth/);
});

test('renders scene cards and motion flags for animated preset props', () => {
  assert.match(runtimeSource, /scene\.floorPieces/);
  assert.match(runtimeSource, /scene\.props/);
  assert.match(runtimeSource, /scene\.cards/);
  assert.match(runtimeSource, /scene\.movingBillboards/);
  assert.match(runtimeSource, /function motionCode/);
  assert.match(runtimeSource, /attribute float aMotion/);
});

test('renders camera-centered sky domes instead of flat star planes', () => {
  assert.match(runtimeSource, /skyProgram/);
  assert.match(runtimeSource, /skyDomeMesh/);
  assert.match(runtimeSource, /function createSkyDomeMesh/);
  assert.match(runtimeSource, /function drawSkyDome/);
  assert.match(runtimeSource, /uSkyMode/);
  assert.match(runtimeSource, /uCameraPosition/);
  assert.match(runtimeSource, /starrySky/);
  assert.match(runtimeSource, /cloudSky/);
  assert.match(runtimeSource, /psychedelic-purple/);
  assert.match(runtimeSource, /liminal-blue/);
  assert.match(runtimeSource, /uSkyPalette > 3\.5/);
  assert.match(runtimeSource, /uSkyPalette > 2\.5/);
  assert.match(runtimeSource, /if \(scene\.skyDome\)/);
});

test('renders low-poly animated torches with static orange light uniforms', () => {
  assert.match(runtimeSource, /MAX_STATIC_TORCH_LIGHTS = 3/);
  assert.match(runtimeSource, /torch-flame/);
  assert.match(runtimeSource, /drawTorchFlameTexture/);
  assert.match(runtimeSource, /setStaticTorchUniforms/);
  assert.match(runtimeSource, /getTorchFlicker/);
  assert.match(runtimeSource, /uStaticTorchPosition0/);
  assert.match(runtimeSource, /uStaticTorchColor0/);
  assert.match(runtimeSource, /uStaticTorchCount/);
  assert.match(runtimeSource, /torchFlameMask/);
});

test('attaches spatial crackle audio emitters to animated torch lights', () => {
  assert.match(runtimeSource, /torchCrackleVoices: new Map/);
  assert.match(runtimeSource, /function syncTorchCrackleAudio/);
  assert.match(runtimeSource, /function getTorchCrackleVoice/);
  assert.match(runtimeSource, /function scheduleTorchCracklePulse/);
  assert.match(runtimeSource, /world\.torchLights/);
  assert.match(runtimeSource, /createPanner/);
  assert.match(runtimeSource, /panner\.positionX\.setTargetAtTime\(torchLight\.x/);
  assert.match(runtimeSource, /oscillator\.type = 'sawtooth'/);
  assert.match(runtimeSource, /torch-crackle/);
});

test('offers a player torch toggle and sends torch uniforms to the scene shader', () => {
  assert.match(index, /id="playerTorch"/);
  assert.match(index, /Player torch/);
  assert.match(runtimeSource, /playerTorch/);
  assert.match(runtimeSource, /uTorchPosition/);
  assert.match(runtimeSource, /uTorchEnabled/);
  assert.match(runtimeSource, /distance\(vWorldPosition,\s*uTorchPosition\)/);
});

test('maps number keys to selectable scene shortcuts', () => {
  assert.match(runtimeSource, /function getSceneShortcutIndex/);
  assert.match(runtimeSource, /Digit\(\[0-9\]\)/);
  assert.match(runtimeSource, /Numpad\(\[0-9\]\)/);
  assert.match(runtimeSource, /SCENE_DEFINITIONS\[shortcutIndex\]/);
  assert.match(runtimeSource, /syncSceneSelect\(\)/);
});

test('updates vertical ground collision and respawns after falling below the scene', () => {
  assert.match(runtimeSource, /getGroundYAt/);
  assert.match(runtimeSource, /getVoidDeathY/);
  assert.match(runtimeSource, /isBelowKillPlane/);
  assert.match(runtimeSource, /walkableSurfaces/);
  assert.match(runtimeSource, /getSceneWalkableSurfaces/);
  assert.match(runtimeSource, /world\.killY/);
  assert.match(runtimeSource, /resetPlayerToSpawn\(\)/);
});

test('plays a short death scene with camera impact, blood, and player death audio before respawn', () => {
  assert.match(runtimeSource, /const DEATH_RESPAWN_DELAY_MS = 2500/);
  assert.match(runtimeSource, /playerHealth/);
  assert.match(runtimeSource, /DEATH_SCENE_PROFILES/);
  assert.match(runtimeSource, /PLAYER_DEATH_SOUND_URL/);
  assert.match(runtimeSource, /player-death-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /deathState/);
  assert.match(runtimeSource, /function startDeathSequence/);
  assert.match(runtimeSource, /createDeathScene/);
  assert.match(runtimeSource, /getDeathSceneCamera/);
  assert.match(runtimeSource, /getDeathSceneProgress/);
  assert.match(runtimeSource, /impactBounce/);
  assert.match(runtimeSource, /playPlayerOneShot\(PLAYER_DEATH_SOUND_URL,\s*PLAYER_DEATH_SOUND_GAIN\)/);
  assert.match(runtimeSource, /function updateDeathSequence/);
  assert.match(runtimeSource, /function getDeathTint/);
  assert.match(runtimeSource, /uDeathTint/);
  assert.match(runtimeSource, /bloodParticle/);
  assert.match(runtimeSource, /mix\(color,\s*vec3\(0\.78,\s*0\.02,\s*0\.02\),\s*uDeathTint\)/);
});

test('extends the death scene with final camera jitter, heavier blood, and a final death rattle', () => {
  assert.match(runtimeSource, /const DEATH_RESPAWN_DELAY_MS = 2500/);
  assert.match(runtimeSource, /finalJiggleStart/);
  assert.match(runtimeSource, /finalJiggleStrength/);
  assert.match(runtimeSource, /finalDeathRattlePlayed/);
  assert.match(runtimeSource, /playFinalDeathRattle/);
  assert.match(runtimeSource, /getDeathSceneFinalProgress/);
  assert.match(runtimeSource, /finalBlood/);
  assert.match(runtimeSource, /bloodParticle\(sourceUv,\s*vec2\(0\.32,\s*0\.54\)/);
}
);

test('tracks player health, low-health screen pressure, and breathing audio', () => {
  assert.match(runtimeSource, /createPlayerHealth/);
  assert.match(runtimeSource, /applyPlayerDamage/);
  assert.match(runtimeSource, /restorePlayerHealth/);
  assert.match(runtimeSource, /ZOMBIE_BITE_DAMAGE/);
  assert.match(runtimeSource, /PLAYER_LOW_HEALTH_BREATHING_LOOP_URL/);
  assert.match(runtimeSource, /player-low-health-breathing-8bit-loop\.mp3\?v=1/);
  assert.match(runtimeSource, /function getHealthEffectStrength/);
  assert.match(runtimeSource, /uHealthDanger/);
  assert.match(runtimeSource, /uHealthPulse/);
  assert.match(runtimeSource, /lowHealthBreathingGain/);
  assert.match(runtimeSource, /function damagePlayer/);
  assert.match(runtimeSource, /ZOMBIE_BITE_COOLDOWN_MS/);
});

test('flashes red claw damage and shows a low-health notice after zombie bites', () => {
  assert.match(index, /id="lowHealthNotice"/);
  assert.match(index, /Low health/);
  assert.match(styles, /\.low-health-notice/);
  assert.match(runtimeSource, /const DAMAGE_FLASH_DURATION_MS/);
  assert.match(runtimeSource, /const LOW_HEALTH_NOTICE_DURATION_MS/);
  assert.match(runtimeSource, /lastDamageFlashStartedAt = now/);
  assert.match(runtimeSource, /lowHealthNoticeStartedAt = now/);
  assert.match(runtimeSource, /function randomizeDamageScratch/);
  assert.match(runtimeSource, /function getDamageFlash/);
  assert.match(runtimeSource, /function updateLowHealthNotice/);
  assert.match(runtimeSource, /uDamageFlash/);
  assert.match(runtimeSource, /uDamageScratchOffset/);
  assert.match(runtimeSource, /uDamageScratchRotation/);
  assert.match(runtimeSource, /clawScratch/);
});

test('applies authored lava damage zones to the player', () => {
  assert.match(runtimeSource, /damageZones/);
  assert.match(runtimeSource, /function updateDamageZones/);
  assert.match(runtimeSource, /function isPlayerInsideDamageZone/);
  assert.match(runtimeSource, /damagePerSecond/);
  assert.match(runtimeSource, /applyPlayerDamage\(playerHealth,\s*zone\.damagePerSecond \* dt\)/);
});

test('renders low-poly green health flasks and restores health on pickup', () => {
  assert.match(runtimeSource, /scene\.healthPotions/);
  assert.match(runtimeSource, /healthPotion/);
  assert.match(runtimeSource, /pickup-bob/);
  assert.match(runtimeSource, /function updateHealthPotions/);
  assert.match(runtimeSource, /restorePlayerHealth/);
  assert.match(runtimeSource, /function addHealthPotionFlask/);
  assert.match(runtimeSource, /drawHealthPotionTexture/);
  assert.match(runtimeSource, /HEALTH_PICKUP_SOUND_URL/);
  assert.match(runtimeSource, /health-pickup-bing-8bit\.mp3\?v=1/);
  assert.match(runtimeSource, /uHealthPickupFlash/);
  assert.match(runtimeSource, /getHealthPickupFlash/);
  assert.match(runtimeSource, /playPlayerOneShot\(HEALTH_PICKUP_SOUND_URL,\s*HEALTH_PICKUP_SOUND_GAIN\)/);
});

test('adds mobile floating joystick, look drag, and jump touch controls', () => {
  assert.match(index, /id="touchMove"/);
  assert.match(index, /id="touchMoveStick"/);
  assert.match(index, /id="touchJump"/);
  assert.match(styles, /\.touch-move/);
  assert.match(styles, /@media \(pointer: coarse\)/);
  assert.match(styles, /touch-action:\s*none/);
  assert.match(runtimeSource, /const touchMovement/);
  assert.match(runtimeSource, /function setupTouchControls/);
  assert.match(runtimeSource, /function updateTouchMovement/);
  assert.match(runtimeSource, /function updateTouchLook/);
  assert.match(runtimeSource, /touchJumpActive/);
});

test('adds gamepad movement, look, jump, sprint, and menu bindings', () => {
  assert.match(index, /Gamepad/);
  assert.match(runtimeSource, /navigator\.getGamepads/);
  assert.match(runtimeSource, /const gamepadInput/);
  assert.match(runtimeSource, /function updateGamepadInput/);
  assert.match(runtimeSource, /function applyGamepadLook/);
  assert.match(runtimeSource, /function normalizeGamepadAxis/);
  assert.match(runtimeSource, /buttonPressed\(gamepad,\s*0\)/);
  assert.match(runtimeSource, /buttonPressed\(gamepad,\s*9\)/);
  assert.match(runtimeSource, /gamepadInput\.sprint/);
});

test('adds roaming zombie enemies that can kill the player', () => {
  assert.match(index, /id="zombies"/);
  assert.match(index, /Zombies/);
  assert.match(runtimeSource, /animateZombieModel/);
  assert.match(runtimeSource, /loadZombieGlb/);
  assert.match(runtimeSource, /zombieModel/);
  assert.match(runtimeSource, /addZombieModel/);
  assert.match(runtimeSource, /frontRotation:\s*-Math\.PI \/ 2/);
  assert.match(runtimeSource, /const zombieMasterYaw = zombie\.yaw/);
  assert.match(runtimeSource, /const zombieModelYaw = enemyRender\.frontRotation/);
  assert.match(runtimeSource, /rotateZombieLocalVertex/);
  assert.match(runtimeSource, /rotateZombieMasterVertex/);
  assert.match(runtimeSource, /drawZombieModelTexture/);
  assert.match(runtimeSource, /createZombieEnemies/);
  assert.match(runtimeSource, /updateZombieEnemies/);
  assert.match(runtimeSource, /isPlayerTouchedByZombie/);
  assert.match(runtimeSource, /createZombieMesh/);
  assert.match(runtimeSource, /updateZombieMesh/);
  assert.match(runtimeSource, /drawZombieTexture/);
  assert.match(runtimeSource, /effects\.zombies/);
  assert.match(runtimeSource, /damagePlayer\(now,\s*touchingEnemy\)/);
  assert.match(runtimeSource, /PLAYER_DAMAGE_SOUND_URL/);
  assert.match(runtimeSource, /player-damage-grunt-8bit\.mp3\?v=1/);
});

test('loads Blender-authored GLB levels for scene art and collision', () => {
  assert.match(runtimeSource, /loadLevelGlb/);
  assert.match(runtimeSource, /LEVEL_GLB_URLS/);
  assert.match(runtimeSource, /levelAsset/);
  assert.match(runtimeSource, /createLevelMesh/);
  assert.match(runtimeSource, /createLevelTextureAtlas/);
  assert.match(runtimeSource, /sceneLoadRequest/);
  assert.match(runtimeSource, /getSceneColliders\(world\)/);
  assert.match(runtimeSource, /getSceneWalkableSurfaces\(world\)/);
});

test('loops zombie grunt audio when zombies are active near the player', () => {
  assert.match(runtimeSource, /ZOMBIE_GRUNT_LOOP_URL/);
  assert.match(runtimeSource, /zombie-idle-grunt-8bit-loop\.mp3\?v=1/);
  assert.match(runtimeSource, /function ensureZombieGruntLoop/);
  assert.match(runtimeSource, /function syncZombieSpatialAudio/);
  assert.match(runtimeSource, /createPanner/);
  assert.match(runtimeSource, /zombieVoices: new Map/);
  assert.match(runtimeSource, /voice\.panner\.positionX\.setTargetAtTime/);
  assert.match(runtimeSource, /updateAudioListener/);
  assert.match(runtimeSource, /isZombieAudioOccluded/);
  assert.match(runtimeSource, /lineIntersectsCollider2D/);
  assert.match(runtimeSource, /ZOMBIE_GRUNT_OCCLUDED_GAIN_MULTIPLIER/);
  assert.match(runtimeSource, /function getZombieGruntGain/);
  assert.match(runtimeSource, /state\.zombieVoices/);
  assert.match(runtimeSource, /source\.loop = true/);
  assert.match(runtimeSource, /!effects\.zombies/);
  assert.match(runtimeSource, /Math\.hypot\(player\.x - zombie\.x,\s*player\.z - zombie\.z\)/);
});

test('loads typed enemy models and gives special enemies unique audio hooks', () => {
  assert.match(runtimeSource, /CHARACTER_MODEL_URLS/);
  assert.match(zombieModel, /one-eye-alien\.glb/);
  assert.match(zombieModel, /moulten-stone-sentienel\.glb/);
  assert.match(runtimeSource, /loadCharacterGlb/);
  assert.match(runtimeSource, /characterModels/);
  assert.match(runtimeSource, /selectEnemyAnimation/);
  assert.match(runtimeSource, /molten-sentinel/);
  assert.match(runtimeSource, /one-eye-alien/);
  assert.match(runtimeSource, /locomotionNames:\s*Object\.freeze\(\['Running', 'Run', 'Walk', 'Locomotion'\]\)/);
  assert.match(runtimeSource, /attackNames:\s*Object\.freeze\(\['Attack', 'Attacking', 'Confused_Scratch', 'Scratch', 'Punch', 'Hit'\]\)/);
  assert.match(runtimeSource, /findPreferredAnimationName\(model,\s*enemyDefinition\.animation\.attackNames\)/);
  assert.match(runtimeSource, /findPreferredAnimationName\(model,\s*enemyDefinition\.animation\.locomotionNames\)/);
  assert.match(runtimeSource, /function getRuntimeEnemySpawns/);
  assert.match(runtimeSource, /spawn\.enemyType !== 'molten-sentinel'/);
  assert.match(runtimeSource, /getEnemyDefinition\(enemy\?\.enemyType\)\.base\.attackDamage/);
  assert.match(runtimeSource, /function syncSpecialEnemyAudio/);
  assert.match(runtimeSource, /function playEnemyAttackSound/);
  assert.match(runtimeSource, /ENEMY_AUDIO_PROFILES/);
  assert.match(runtimeSource, /enemy-zombie-attack-bite-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /enemy-alien-idle-warble-8bit-loop\.wav\?v=1/);
  assert.match(runtimeSource, /enemy-alien-attack-shriek-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /enemy-sentinel-idle-furnace-8bit-loop\.wav\?v=1/);
  assert.match(runtimeSource, /enemy-sentinel-attack-impact-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /specialEnemyVoices/);
});

test('routes scene audio through cheap per-scene reverb settings', () => {
  assert.match(runtimeSource, /SCENE_REVERB_PRESETS/);
  assert.match(runtimeSource, /createConvolver/);
  assert.match(runtimeSource, /createReverbImpulse/);
  assert.match(runtimeSource, /applySceneReverb/);
  assert.match(runtimeSource, /world\.audio\.reverb/);
  assert.match(runtimeSource, /reverbWetGain\.gain\.setTargetAtTime/);
  assert.match(runtimeSource, /dryGain/);
});

test('plays audio assets for lightning and scene ambience', () => {
  assert.match(runtimeSource, /LIGHTNING_SOUND_URL/);
  assert.match(runtimeSource, /lightning-bolt-strike\.mp3\?v=1/);
  assert.match(runtimeSource, /SCENE_AMBIENCE_URLS/);
  for (const sceneId of [
    'dungeon',
    'alien-landscape',
    'derelict-starship',
    'neon-backstreets',
    'sunken-temple',
    'one-bit-cathedral',
    'astral-geometry-garden',
    'motel-mirage',
  ]) {
    assert.match(runtimeSource, new RegExp(`${sceneId}-8bit-loop\\.mp3\\?v=1`));
  }
  assert.match(runtimeSource, /rotwood-forest-storm-wind-leaves-loop\.wav\?v=1/);
  assert.match(runtimeSource, /function loadAudioBuffer/);
  assert.match(runtimeSource, /function ensureSceneAmbienceLoop/);
  assert.match(runtimeSource, /function playAssetOneShot/);
  assert.match(runtimeSource, /WORLD_RARE_STINGER_SOUND_URL/);
  assert.match(runtimeSource, /function syncWorldStingerAudio/);
  assert.match(runtimeSource, /audioState\.ambienceGain\.gain\.setTargetAtTime/);
  assert.doesNotMatch(runtimeSource, /createNoiseBuffer/);
});

test('adds procedural water and drip audio for rainy scenes', () => {
  assert.match(runtimeSource, /waterfallVoices/);
  assert.match(runtimeSource, /function syncRainWaterAudio/);
  assert.match(runtimeSource, /function getRainWaterVoice/);
  assert.match(runtimeSource, /function scheduleRainDripPulse/);
  assert.match(runtimeSource, /function playRainDripPulse/);
  assert.match(runtimeSource, /RAIN_SPOT_DRIP_SOUND_URL/);
  assert.match(runtimeSource, /rain-spot-drip-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /world\.rain/);
  assert.match(runtimeSource, /connectSceneAudioNode\(panner,\s*state\.dryGain,\s*state\.reverbInput\)/);
});

test('crossfades walking and sprinting player footstep loops', () => {
  assert.match(runtimeSource, /PLAYER_WALK_FOOTSTEP_LOOP_URL/);
  assert.match(runtimeSource, /player-footsteps-walk-8bit-loop\.mp3\?v=1/);
  assert.match(runtimeSource, /PLAYER_SPRINT_FOOTSTEP_LOOP_URL/);
  assert.match(runtimeSource, /player-footsteps-sprint-8bit-loop\.mp3\?v=1/);
  assert.match(runtimeSource, /function ensurePlayerFootstepLoops/);
  assert.match(runtimeSource, /function syncPlayerFootstepAudio/);
  assert.match(runtimeSource, /function syncPlayerMovementSpotAudio/);
  assert.match(runtimeSource, /player-jump-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /player-land-thud-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /function getPlayerFootstepGains/);
  assert.match(runtimeSource, /player\.grounded/);
  assert.match(runtimeSource, /keys\.has\('ShiftLeft'\) \|\| gamepadInput\.sprint/);
  assert.match(runtimeSource, /footstepWalkGain\.gain\.setTargetAtTime/);
  assert.match(runtimeSource, /footstepSprintGain\.gain\.setTargetAtTime/);
});

test('adds responsive UI spot sounds across menu controls', () => {
  assert.match(runtimeSource, /UI_HOVER_SOUND_URL/);
  assert.match(runtimeSource, /UI_TOGGLE_SOUND_URL/);
  assert.match(runtimeSource, /UI_SELECT_SOUND_URL/);
  assert.match(runtimeSource, /ui-hover-blip-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /ui-toggle-tick-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /ui-select-change-8bit\.wav\?v=1/);
  assert.match(runtimeSource, /function playUiHoverSound/);
  assert.match(runtimeSource, /function playUiToggleSound/);
  assert.match(runtimeSource, /function playUiSelectSound/);
});

test('loops a generated player heartbeat that speeds up near zombies', () => {
  assert.match(runtimeSource, /PLAYER_HEARTBEAT_BASE_INTERVAL_MS/);
  assert.match(runtimeSource, /PLAYER_HEARTBEAT_DANGER_INTERVAL_MS/);
  assert.match(runtimeSource, /heartbeatGain/);
  assert.match(runtimeSource, /function ensurePlayerHeartbeatLoop/);
  assert.match(runtimeSource, /function scheduleHeartbeatPulse/);
  assert.match(runtimeSource, /function getPlayerHeartbeatParams/);
  assert.match(runtimeSource, /getNearestZombieDistance\(\)/);
  assert.match(runtimeSource, /oscillator\.type = 'square'/);
  assert.match(runtimeSource, /heartbeatLoopTimer/);
});
