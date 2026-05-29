import {
  createEffectState,
  getPresetValues,
  getResolutionMode,
  normalizePixelScale,
  PS1_RENDER_TARGET,
  PS1_RESOLUTION_MODES,
} from './ps1Display.js';
import { cameraView } from './cameraMath.js';
import {
  applyJumpPhysics,
  applyMouseLook,
  createMouseLookDelta,
  createMovementDelta,
  createInputVector,
  resolveMovement,
} from './playerPhysics.js';
import { SCENE_DEFINITIONS, createSceneWorld } from './world.js';

const canvas = document.querySelector('#screen');
const reticule = document.querySelector('#reticule');
const titleScreen = document.querySelector('#titleScreen');
const startButton = document.querySelector('#startButton');
const optionsDialog = document.querySelector('#options');
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
let world = createSceneWorld(effects.sceneId);
let renderResolution = getResolutionMode(effects.resolutionId);
let textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
let colliders = getSceneColliders(world);
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
let titleActive = true;
let mouseLookActive = false;
let gameModeRequested = false;
let lastPointerUnlockAt = 0;
let softMouseLockActive = false;
let softMouseEdgeTurn = { yaw: 0, pitch: 0 };
let lastMousePosition = null;
let sceneProgram;
let postProgram;
let warehouseMesh;
let quad;
let atlasTexture;
let renderTarget;
let audioState = null;

let lastTime = performance.now();
let viewport = { x: 0, y: 0, width: 1, height: 1 };

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updateContinuousMouseLook(dt);
  updatePlayer(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}

function updatePlayer(dt) {
  const local = createInputVector({
    forward: keys.has('KeyW'),
    back: keys.has('KeyS'),
    left: keys.has('KeyA'),
    right: keys.has('KeyD'),
  });
  const speed = keys.has('ShiftLeft') ? 4.4 : 2.8;
  const movement = createMovementDelta(local, player.yaw, speed, dt);
  const next = resolveMovement(
    { x: player.x, z: player.z },
    { x: player.x + movement.dx, z: player.z + movement.dz },
    colliders,
    0.32,
  );

  player.x = next.x;
  player.z = next.z;

  const jump = applyJumpPhysics(player, {
    jump: keys.has('Space'),
    dt,
    groundY: player.groundY,
  });
  player.y = jump.y;
  player.velocityY = jump.velocityY;
  player.grounded = jump.grounded;
}

function render(time) {
  const lightningStrength = getLightningStrength(time, world.lightning);
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
  gl.uniform1f(sceneProgram.uniforms.uWarping, effects.warping ? 1 : 0);
  gl.uniformMatrix4fv(sceneProgram.uniforms.uViewProjection, false, createViewProjection());
  drawMesh(gl, sceneProgram, warehouseMesh);

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
  drawQuad(gl, postProgram, quad);
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

function ensureSceneAudio() {
  if (!world.audio) return;

  if (!audioState) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const windGain = context.createGain();
    const windFilter = context.createBiquadFilter();
    const windSource = context.createBufferSource();

    windFilter.type = 'bandpass';
    windFilter.frequency.value = 760;
    windFilter.Q.value = 0.65;
    windGain.gain.value = 0;
    windSource.buffer = createNoiseBuffer(context, 2.0);
    windSource.loop = true;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(context.destination);
    windSource.start();

    audioState = {
      context,
      windGain,
      windSource,
      lastLightningIndex: -1,
    };
  }

  if (audioState.context.state === 'suspended') {
    audioState.context.resume();
  }
}

function createNoiseBuffer(context, seconds) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

function updateSceneAudio(time, lightningStrength) {
  if (!audioState) return;

  const targetWind = world.audio?.wind ? 0.018 : 0;
  audioState.windGain.gain.setTargetAtTime(targetWind, audioState.context.currentTime, 0.18);

  if (!world.audio?.lightning || !world.lightning || lightningStrength <= 0.6) return;

  const index = Math.floor(time / (world.lightning.interval ?? 8));
  if (index === audioState.lastLightningIndex) return;

  audioState.lastLightningIndex = index;
  playLightningSound(audioState.context);
}

function playLightningSound(context) {
  const now = context.currentTime;
  const noise = context.createBufferSource();
  const noiseGain = context.createGain();
  const filter = context.createBiquadFilter();
  const rumble = context.createOscillator();
  const rumbleGain = context.createGain();

  noise.buffer = createNoiseBuffer(context, 0.45);
  filter.type = 'highpass';
  filter.frequency.value = 900;
  noiseGain.gain.setValueAtTime(0.0, now);
  noiseGain.gain.linearRampToValueAtTime(0.24, now + 0.015);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(context.destination);
  noise.start(now);
  noise.stop(now + 0.45);

  rumble.type = 'triangle';
  rumble.frequency.setValueAtTime(58, now);
  rumble.frequency.exponentialRampToValueAtTime(31, now + 0.5);
  rumbleGain.gain.setValueAtTime(0.0, now);
  rumbleGain.gain.linearRampToValueAtTime(0.09, now + 0.04);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
  rumble.connect(rumbleGain);
  rumbleGain.connect(context.destination);
  rumble.start(now);
  rumble.stop(now + 0.8);
}

function createViewProjection() {
  const projection = perspective(Math.PI / 3.2, PS1_RENDER_TARGET.aspect, 0.08, 80);
  const view = cameraView(player);
  return multiplyMat4(projection, view);
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
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        startRandomScene();
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
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    keys.add(event.code);
  }, { capture: true });
  document.addEventListener('keyup', (event) => keys.delete(event.code), { capture: true });
  canvas.addEventListener('pointerdown', (event) => {
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

  const bindings = ['invertY', 'showReticule', 'scanlines', 'crtDistortion', 'dither', 'warping', 'colorBleed', 'noise'];
  for (const id of bindings) {
    const input = document.querySelector(`#${id}`);
    input.checked = Boolean(effects[id]);
    input.addEventListener('change', () => {
      effects[id] = input.checked;
      if (id === 'showReticule') syncReticule();
    });
  }
  syncReticule();

  const preset = document.querySelector('#preset');
  preset.value = effects.preset;
  preset.addEventListener('change', () => {
    effects.preset = preset.value;
  });

  const scene = document.querySelector('#scene');
  scene.replaceChildren(...SCENE_DEFINITIONS.map((definition) => {
    const option = document.createElement('option');
    option.value = definition.id;
    option.textContent = definition.label;
    return option;
  }));
  scene.value = effects.sceneId;
  scene.addEventListener('change', () => {
    setScene(scene.value);
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

function startRandomScene() {
  if (!titleActive) return;

  const randomScene = SCENE_DEFINITIONS[Math.floor(Math.random() * SCENE_DEFINITIONS.length)];
  setScene(randomScene.id);
  const scene = document.querySelector('#scene');
  scene.value = effects.sceneId;

  titleActive = false;
  titleScreen.hidden = true;
  document.body.classList.remove('title-active');
  ensureSceneAudio();
  enterGameMode({ requestLock: true });
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
  if (!optionsDialog.open) optionsDialog.showModal();
}

function closeOptions() {
  keys.clear();
  if (optionsDialog.open) {
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

function setRenderResolution(id) {
  const next = getResolutionMode(id);
  if (renderResolution.id === next.id) return;

  effects.resolutionId = next.id;
  renderResolution = next;
  deleteRenderTarget(gl, renderTarget);
  renderTarget = createRenderTarget(gl, renderResolution.width, renderResolution.height);
}

function setScene(id) {
  const nextWorld = createSceneWorld(id);
  if (world.id === nextWorld.id) return;

  effects.sceneId = nextWorld.id;
  world = nextWorld;
  textureIndices = new Map(world.textures.map((texture, index) => [texture.id, index]));
  colliders = getSceneColliders(world);
  resetPlayerToSpawn();

  deleteMeshBuffers(gl, warehouseMesh);
  gl.deleteTexture(atlasTexture);
  warehouseMesh = createWarehouseMesh(gl, world, textureIndices);
  atlasTexture = createTextureAtlas(gl, world.textures);
}

function resetPlayerToSpawn() {
  player.x = world.playerSpawn.x;
  player.y = world.playerSpawn.y;
  player.z = world.playerSpawn.z;
  player.yaw = world.playerSpawn.yaw;
  player.pitch = 0;
  player.velocityY = 0;
  player.grounded = true;
  player.groundY = world.playerSpawn.y;
}

function getSceneColliders(scene) {
  return [...scene.walls, ...scene.crates]
    .map((item) => item.collider)
    .filter(Boolean);
}

function createWarehouseMesh(glContext, scene, indices) {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [] };
  addBox(geometry, scene.floor, indices, { floor: true, shade: 0.72, uvScale: 2.5 });
  if (scene.ceiling) {
    addBox(geometry, scene.ceiling, indices, { ceiling: true, shade: 0.42, uvScale: 2.0 });
  }

  for (const wall of scene.walls) {
    addBox(geometry, wall, indices, { shade: wall.height < 2 ? 0.72 : 0.88, uvScale: 1.0 });
  }

  for (const crateItem of scene.crates) {
    addBox(geometry, crateItem, indices, { shade: 0.8, uvScale: 1.0 });
  }

  for (const mountainItem of scene.mountains) {
    addMountain(geometry, mountainItem, indices);
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
  };
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

  face(geometry, textureId, shade * 0.92, [
    [minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ],
  ], item.width / uvScale, item.height / uvScale);
  face(geometry, textureId, shade * 0.72, [
    [maxX, minY, minZ], [minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ],
  ], item.width / uvScale, item.height / uvScale);
  face(geometry, textureId, shade * 0.82, [
    [minX, minY, minZ], [minX, minY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ],
  ], item.depth / uvScale, item.height / uvScale);
  face(geometry, textureId, shade, [
    [maxX, minY, maxZ], [maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ],
  ], item.depth / uvScale, item.height / uvScale);
  face(geometry, textureId, shade * 1.08, [
    [minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ], [minX, maxY, minZ],
  ], item.width / uvScale, item.depth / uvScale);
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

function face(geometry, textureId, shade, corners, uRepeat, vRepeat) {
  const uv = [[0, vRepeat], [uRepeat, vRepeat], [uRepeat, 0], [0, 0]];
  const order = [0, 1, 2, 0, 2, 3];

  for (const index of order) {
    geometry.positions.push(...corners[index]);
    geometry.uvs.push(...uv[index]);
    geometry.textureIds.push(textureId);
    geometry.shades.push(shade);
  }
}

function triangle(geometry, textureId, shade, a, b, c, uRepeat, vRepeat) {
  const corners = [a, b, c];
  const uv = [[0, vRepeat], [uRepeat, vRepeat], [uRepeat * 0.5, 0]];

  for (let index = 0; index < 3; index += 1) {
    geometry.positions.push(...corners[index]);
    geometry.uvs.push(...uv[index]);
    geometry.textureIds.push(textureId);
    geometry.shades.push(shade);
  }
}

function drawMesh(glContext, program, mesh) {
  bindAttribute(glContext, program.attributes.aPosition, mesh.position, 3);
  bindAttribute(glContext, program.attributes.aUv, mesh.uv, 2);
  bindAttribute(glContext, program.attributes.aTextureId, mesh.textureId, 1);
  bindAttribute(glContext, program.attributes.aShade, mesh.shade, 1);
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

function createTextureAtlas(glContext, textures) {
  const tile = 128;
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = tile * textures.length;
  atlasCanvas.height = tile;
  const ctx = atlasCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  textures.forEach((texture, index) => {
    const x = index * tile;
    drawGeneratedTexture(ctx, texture.id, x, 0, tile, texture.size);
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

function deleteMeshBuffers(glContext, mesh) {
  if (!mesh) return;
  glContext.deleteBuffer(mesh.position);
  glContext.deleteBuffer(mesh.uv);
  glContext.deleteBuffer(mesh.textureId);
  glContext.deleteBuffer(mesh.shade);
}

function drawGeneratedTexture(ctx, id, x, y, tile, sourceSize) {
  if (id === 'rain') {
    drawRainTexture(ctx, x, y, tile);
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
    alienGround: ['#293f37', '#4a5541', '#5e3c5f', '#1e282c'],
    alienRock: ['#3a3048', '#5d526d', '#2b2435', '#74678b'],
    sun: ['#ffb044', '#d84a54', '#fff0a6', '#77284a'],
    starshipFloor: ['#1f2b32', '#34454a', '#162026', '#4f5f64'],
    panel: ['#263238', '#3f4b52', '#181f25', '#59656b'],
    wetAsphalt: ['#11151d', '#1e2430', '#262042', '#101016'],
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

function start() {
  sceneProgram = createProgram(gl, sceneVertexShader, sceneFragmentShader);
  postProgram = createProgram(gl, postVertexShader, postFragmentShader);
  warehouseMesh = createWarehouseMesh(gl, world, textureIndices);
  quad = createPostQuad(gl);
  atlasTexture = createTextureAtlas(gl, world.textures);
  renderTarget = createRenderTarget(gl, renderResolution.width, renderResolution.height);

  setupOptions();
  setupInput();
  resize();
  requestAnimationFrame(frame);
}

const sceneVertexShader = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute float aTextureId;
attribute float aShade;

uniform mat4 uViewProjection;
uniform float uTime;
uniform float uWarping;

varying vec2 vUv;
varying float vTextureId;
varying float vShade;

void main() {
  vec3 warped = aPosition;
  float wobble = sin((aPosition.x + aPosition.z) * 8.0 + uTime * 6.0) * 0.006;
  warped.xz += vec2(wobble, -wobble) * uWarping;

  vec4 clip = uViewProjection * vec4(warped, 1.0);
  vec2 snapped = floor((clip.xy / clip.w) * vec2(160.0, 120.0)) / vec2(160.0, 120.0);
  clip.xy = mix(clip.xy, snapped * clip.w, uWarping);

  gl_Position = clip;
  vUv = aUv;
  vTextureId = aTextureId;
  vShade = aShade;
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

varying vec2 vUv;
varying float vTextureId;
varying float vShade;

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
  vec2 tiled = fract(vUv);
  float rainMask = 1.0 - step(0.5, abs(id - uRainTextureId));
  tiled.y = fract(tiled.y + uTime * 2.4 * rainMask);
  vec2 atlasUv = vec2((id + tiled.x) / uTextureCount, tiled.y);
  vec4 texel = texture2D(uAtlas, atlasUv);
  float posterize = floor(vShade * 5.0) / 5.0;
  vec3 color = texel.rgb * posterize;
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

  gl_FragColor = vec4(color, 1.0);
}
`;

start();
