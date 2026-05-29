import {
  createEffectState,
  getPresetValues,
  getResolutionMode,
  normalizePixelScale,
  PS1_RENDER_TARGET,
  PS1_RESOLUTION_MODES,
} from './ps1Display.js';
import { applyMouseLook, createInputVector, resolveMovement } from './playerPhysics.js';
import { SCENE_DEFINITIONS, createSceneWorld } from './world.js';

const canvas = document.querySelector('#screen');
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
};

const keys = new Set();
let mouseLookActive = true;
let sceneProgram;
let postProgram;
let warehouseMesh;
let quad;
let atlasTexture;
let renderTarget;

let lastTime = performance.now();
let viewport = { x: 0, y: 0, width: 1, height: 1 };

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

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
  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  const dx = (cos * local.x + sin * local.z) * speed * dt;
  const dz = (cos * local.z - sin * local.x) * speed * dt;
  const next = resolveMovement(
    { x: player.x, z: player.z },
    { x: player.x + dx, z: player.z + dz },
    colliders,
    0.32,
  );

  player.x = next.x;
  player.z = next.z;
}

function render(time) {
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
  drawQuad(gl, postProgram, quad);
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
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      toggleOptions();
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].includes(event.code)) {
      event.preventDefault();
    }
    keys.add(event.code);
  }, { capture: true });
  document.addEventListener('keyup', (event) => keys.delete(event.code), { capture: true });
  canvas.addEventListener('pointerdown', () => {
    if (optionsDialog.open) return;
    mouseLookActive = true;
    requestPointerLockSafely();
  });
  document.addEventListener('mousemove', (event) => {
    if (optionsDialog.open) return;
    if (document.pointerLockElement !== canvas && !mouseLookActive) return;
    const look = applyMouseLook(player, event, { invertY: effects.invertY });
    player.yaw = look.yaw;
    player.pitch = look.pitch;
  });
}

function requestPointerLockSafely() {
  try {
    const request = canvas.requestPointerLock?.();
    if (request?.catch) request.catch(() => {});
  } catch {
    mouseLookActive = true;
  }
}

function setupOptions() {
  const bindings = ['invertY', 'scanlines', 'crtDistortion', 'dither', 'warping', 'colorBleed', 'noise'];
  for (const id of bindings) {
    const input = document.querySelector(`#${id}`);
    input.checked = Boolean(effects[id]);
    input.addEventListener('change', () => {
      effects[id] = input.checked;
    });
  }

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
    mouseLookActive = true;
  });
  optionsDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeOptions();
  });
}

function toggleOptions() {
  if (optionsDialog.open) {
    closeOptions();
  } else {
    openOptions();
  }
}

function openOptions() {
  keys.clear();
  mouseLookActive = false;
  if (document.pointerLockElement) document.exitPointerLock();
  if (!optionsDialog.open) optionsDialog.showModal();
}

function closeOptions() {
  keys.clear();
  if (optionsDialog.open) optionsDialog.close();
  mouseLookActive = true;
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

function cameraView(camera) {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const forward = [sinYaw * cosPitch, sinPitch, cosYaw * cosPitch];
  const right = [cosYaw, 0, -sinYaw];
  const up = cross(right, forward);
  const eye = [camera.x, camera.y, camera.z];

  return new Float32Array([
    right[0], up[0], -forward[0], 0,
    right[1], up[1], -forward[1], 0,
    right[2], up[2], -forward[2], 0,
    -dot(right, eye), -dot(up, eye), dot(forward, eye), 1,
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

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function hash(x, y, seed) {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453) % 1;
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

varying vec2 vUv;
varying float vTextureId;
varying float vShade;

void main() {
  float id = floor(vTextureId + 0.5);
  vec2 tiled = fract(vUv);
  vec2 atlasUv = vec2((id + tiled.x) / uTextureCount, tiled.y);
  vec4 texel = texture2D(uAtlas, atlasUv);
  float posterize = floor(vShade * 5.0) / 5.0;
  gl_FragColor = vec4(texel.rgb * posterize, 1.0);
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

varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
}

void main() {
  vec2 centered = vUv * 2.0 - 1.0;
  float r2 = dot(centered, centered);
  vec2 uv = vUv + centered * r2 * uDistortion;

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

  gl_FragColor = vec4(color, 1.0);
}
`;

start();
