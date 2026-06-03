import assert from 'node:assert/strict';
import test from 'node:test';

import { drawScenePass, setStaticTorchUniforms } from '../src/renderScenePass.js';

function createFakeGl() {
  const calls = [];
  const gl = {
    TEXTURE0: 'TEXTURE0',
    TEXTURE_2D: 'TEXTURE_2D',
    ARRAY_BUFFER: 'ARRAY_BUFFER',
    FLOAT: 'FLOAT',
    TRIANGLES: 'TRIANGLES',
    useProgram(...args) {
      calls.push(['useProgram', ...args]);
    },
    activeTexture(...args) {
      calls.push(['activeTexture', ...args]);
    },
    bindTexture(...args) {
      calls.push(['bindTexture', ...args]);
    },
    uniform1i(...args) {
      calls.push(['uniform1i', ...args]);
    },
    uniform1f(...args) {
      calls.push(['uniform1f', ...args]);
    },
    uniform3f(...args) {
      calls.push(['uniform3f', ...args]);
    },
    uniformMatrix4fv(...args) {
      calls.push(['uniformMatrix4fv', ...args]);
    },
    bindBuffer(...args) {
      calls.push(['bindBuffer', ...args]);
    },
    enableVertexAttribArray(...args) {
      calls.push(['enableVertexAttribArray', ...args]);
    },
    vertexAttribPointer(...args) {
      calls.push(['vertexAttribPointer', ...args]);
    },
    drawArrays(...args) {
      calls.push(['drawArrays', ...args]);
    },
  };
  return { gl, calls };
}

function createSceneProgram() {
  const uniformNames = [
    'uAtlas',
    'uTextureCount',
    'uTime',
    'uLightningTextureId',
    'uLightningStrength',
    'uRainTextureId',
    'uShootingStarTextureId',
    'uWarping',
    'uTorchPosition',
    'uTorchColor',
    'uTorchRadius',
    'uTorchIntensity',
    'uTorchEnabled',
    'uStaticTorchCount',
    'uViewProjection',
  ];
  for (let i = 0; i < 3; i += 1) {
    uniformNames.push(
      `uStaticTorchPosition${i}`,
      `uStaticTorchColor${i}`,
      `uStaticTorchRadius${i}`,
      `uStaticTorchIntensity${i}`,
    );
  }
  return {
    program: { id: 'scene-program' },
    attributes: {
      aPosition: 1,
      aUv: 2,
      aTextureId: 3,
      aShade: 4,
      aMotion: 5,
    },
    uniforms: Object.fromEntries(uniformNames.map((name) => [name, name])),
  };
}

function createMesh(id, count) {
  return {
    count,
    position: `${id}-position`,
    uv: `${id}-uv`,
    textureId: `${id}-texture`,
    shade: `${id}-shade`,
    motion: `${id}-motion`,
  };
}

test('setStaticTorchUniforms writes a capped torch count and disables unused slots', () => {
  const { gl, calls } = createFakeGl();
  const program = createSceneProgram();

  setStaticTorchUniforms(gl, program, [
    { x: 1, y: 2, z: 3, color: [1, 0, 0], radius: 2, intensity: 1 },
    { x: 4, y: 5, z: 6, color: [0, 1, 0], radius: 3, intensity: 2 },
    { x: 7, y: 8, z: 9, color: [0, 0, 1], radius: 4, intensity: 3 },
    { x: 10, y: 11, z: 12, color: [1, 1, 1], radius: 5, intensity: 4 },
  ], 0);

  assert.deepEqual(calls.find((call) => call[1] === 'uStaticTorchCount'), ['uniform1f', 'uStaticTorchCount', 3]);
  assert.deepEqual(calls.find((call) => call[1] === 'uStaticTorchPosition0'), ['uniform3f', 'uStaticTorchPosition0', 1, 2, 3]);
  assert.deepEqual(calls.find((call) => call[1] === 'uStaticTorchColor2'), ['uniform3f', 'uStaticTorchColor2', 0, 0, 1]);
  assert.equal(calls.some((call) => call[1] === 'uStaticTorchPosition3'), false);
});

test('drawScenePass binds atlas texture, writes scene uniforms, and draws static then dynamic meshes', () => {
  const { gl, calls } = createFakeGl();
  const program = createSceneProgram();
  const atlasTexture = { id: 'atlas' };
  const viewProjection = new Float32Array(16).fill(3);
  const staticMesh = createMesh('static', 12);
  const dynamicMesh = createMesh('dynamic', 6);

  drawScenePass(gl, {
    program,
    atlasTexture,
    textureCount: 9,
    textureIndices: new Map([
      ['bolt', 4],
      ['rain', 5],
      ['star', 6],
    ]),
    time: 22,
    lightningTexture: 'bolt',
    lightningStrength: 0.7,
    rainTexture: 'rain',
    shootingStarTexture: 'star',
    warping: true,
    player: { x: 1, y: 2, z: 3 },
    playerTorch: { color: [0.8, 0.5, 0.2], radius: 4, intensity: 1.5 },
    playerTorchEnabled: true,
    torchLights: [],
    viewProjection,
    staticMesh,
    dynamicMesh,
  });

  assert.deepEqual(calls.slice(0, 4), [
    ['useProgram', program.program],
    ['activeTexture', 'TEXTURE0'],
    ['bindTexture', 'TEXTURE_2D', atlasTexture],
    ['uniform1i', 'uAtlas', 0],
  ]);
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uTextureCount' && call[2] === 9));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uLightningTextureId' && call[2] === 4));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uRainTextureId' && call[2] === 5));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uShootingStarTextureId' && call[2] === 6));
  assert.equal(calls.some((call) => call[1] === 'uOneBit'), false);
  assert.ok(calls.some((call) => call[0] === 'uniform3f' && call[1] === 'uTorchPosition' && call[2] === 1 && call[3] === 2.25 && call[4] === 3));
  assert.deepEqual(calls.find((call) => call[0] === 'uniformMatrix4fv'), ['uniformMatrix4fv', 'uViewProjection', false, viewProjection]);

  const drawCalls = calls.filter((call) => call[0] === 'drawArrays');
  assert.deepEqual(drawCalls, [
    ['drawArrays', 'TRIANGLES', 0, 12],
    ['drawArrays', 'TRIANGLES', 0, 6],
  ]);
});
