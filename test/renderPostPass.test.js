import assert from 'node:assert/strict';
import test from 'node:test';

import { drawPostPass } from '../src/renderPostPass.js';

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
    uniform2f(...args) {
      calls.push(['uniform2f', ...args]);
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

function createPostProgram() {
  return {
    program: { id: 'post-program' },
    attributes: { aPosition: 7 },
    uniforms: Object.fromEntries([
      'uScene',
      'uResolution',
      'uTime',
      'uScanlines',
      'uDistortion',
      'uDither',
      'uNoise',
      'uColorBleed',
      'uScanlineStrength',
      'uVignette',
      'uBrightness',
      'uContrast',
      'uSaturation',
      'uPixelScale',
      'uSourceResolution',
      'uFlipFramebufferY',
      'uOneBit',
      'uLightningStrength',
      'uHealthDanger',
      'uHealthPulse',
      'uHealthPickupFlash',
      'uDamageFlash',
      'uDamageScratchOffset',
      'uDamageScratchRotation',
      'uDeathTint',
      'uDeathProgress',
      'uCutUpFlash',
      'uCutUpCountdown',
    ].map((name) => [name, name])),
  };
}

test('drawPostPass binds the low-resolution scene texture, writes post uniforms, and draws the quad', () => {
  const { gl, calls } = createFakeGl();
  const program = createPostProgram();
  const sceneTexture = { id: 'scene-texture' };
  const quad = { id: 'quad-buffer' };

  drawPostPass(gl, {
    program,
    sceneTexture,
    quad,
    viewport: { width: 640, height: 480 },
    renderResolution: { width: 320, height: 240 },
    time: 12.5,
    effects: {
      scanlines: true,
      crtDistortion: false,
      dither: true,
      noise: true,
      colorBleed: false,
      brightness: 1.1,
      contrast: 0.9,
      saturation: 0.8,
      pixelScale: 2,
      flipFramebufferY: true,
    },
    preset: {
      distortion: 0.2,
      noise: 0.3,
      colorBleed: 0.4,
      scanlineStrength: 0.5,
      vignette: 0.6,
    },
    oneBit: true,
    lightningStrength: 0.7,
    healthEffect: { danger: 0.8, pulse: 0.9 },
    healthPickupFlash: 0.1,
    damageFlash: 0.2,
    damageScratchOffset: { x: 0.3, y: 0.4 },
    damageScratchRotation: 0.5,
    deathTint: 0.6,
    deathProgress: 0.7,
    cutUpFlash: 0.8,
    cutUpCountdown: 3,
  });

  assert.deepEqual(calls.slice(0, 4), [
    ['useProgram', program.program],
    ['activeTexture', 'TEXTURE0'],
    ['bindTexture', 'TEXTURE_2D', sceneTexture],
    ['uniform1i', 'uScene', 0],
  ]);
  assert.ok(calls.some((call) => call[0] === 'uniform2f' && call[1] === 'uResolution' && call[2] === 640 && call[3] === 480));
  assert.ok(calls.some((call) => call[0] === 'uniform2f' && call[1] === 'uSourceResolution' && call[2] === 320 && call[3] === 240));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uScanlines' && call[2] === 1));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uDistortion' && call[2] === 0));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uNoise' && call[2] === 0.3));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uColorBleed' && call[2] === 0));
  assert.ok(calls.some((call) => call[0] === 'uniform2f' && call[1] === 'uDamageScratchOffset' && call[2] === 0.3 && call[3] === 0.4));
  assert.deepEqual(calls.slice(-4), [
    ['bindBuffer', 'ARRAY_BUFFER', quad],
    ['enableVertexAttribArray', 7],
    ['vertexAttribPointer', 7, 2, 'FLOAT', false, 0, 0],
    ['drawArrays', 'TRIANGLES', 0, 6],
  ]);
});
