import assert from 'node:assert/strict';
import test from 'node:test';

import {
  drawSkyDome,
  getSkyDomeMode,
  getSkyDomePalette,
} from '../src/renderSkyDome.js';

function createFakeGl() {
  const calls = [];
  const gl = {
    DEPTH_TEST: 'DEPTH_TEST',
    FLOAT: 'FLOAT',
    ARRAY_BUFFER: 'ARRAY_BUFFER',
    TRIANGLES: 'TRIANGLES',
    depthMask(...args) {
      calls.push(['depthMask', ...args]);
    },
    disable(...args) {
      calls.push(['disable', ...args]);
    },
    enable(...args) {
      calls.push(['enable', ...args]);
    },
    useProgram(...args) {
      calls.push(['useProgram', ...args]);
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
    uniformMatrix4fv(...args) {
      calls.push(['uniformMatrix4fv', ...args]);
    },
    uniform3f(...args) {
      calls.push(['uniform3f', ...args]);
    },
    uniform1f(...args) {
      calls.push(['uniform1f', ...args]);
    },
    drawArrays(...args) {
      calls.push(['drawArrays', ...args]);
    },
  };
  return { gl, calls };
}

test('maps sky dome modes and palettes to shader numeric uniforms', () => {
  assert.equal(getSkyDomeMode({ mode: 'clouds' }), 1);
  assert.equal(getSkyDomeMode({ mode: 'stars' }), 0);
  assert.equal(getSkyDomePalette({ palette: 'electric-blue' }), 1);
  assert.equal(getSkyDomePalette({ palette: 'one-bit-night' }), 2);
  assert.equal(getSkyDomePalette({ palette: 'psychedelic-purple' }), 3);
  assert.equal(getSkyDomePalette({ palette: 'liminal-blue' }), 4);
  assert.equal(getSkyDomePalette({ palette: 'unknown' }), 0);
});

test('drawSkyDome skips missing sky, program, or mesh inputs', () => {
  const { gl, calls } = createFakeGl();

  drawSkyDome(gl, { skyDome: null, program: {}, mesh: {}, time: 1 });
  drawSkyDome(gl, { skyDome: {}, program: null, mesh: {}, time: 1 });
  drawSkyDome(gl, { skyDome: {}, program: {}, mesh: null, time: 1 });

  assert.deepEqual(calls, []);
});

test('drawSkyDome sets depth state, camera uniforms, sky uniforms, and restores depth testing', () => {
  const { gl, calls } = createFakeGl();
  const viewProjection = new Float32Array(16).fill(2);
  const camera = { x: 1, y: 2, z: 3 };
  const program = {
    program: { id: 'program' },
    attributes: { aPosition: 5 },
    uniforms: {
      uViewProjection: 'uViewProjection',
      uCameraPosition: 'uCameraPosition',
      uTime: 'uTime',
      uSkyMode: 'uSkyMode',
      uSkyPalette: 'uSkyPalette',
    },
  };
  const mesh = {
    count: 36,
    position: { id: 'position' },
  };

  drawSkyDome(gl, {
    skyDome: { mode: 'clouds', palette: 'liminal-blue' },
    program,
    mesh,
    time: 42,
    camera,
    viewProjection,
  });

  assert.deepEqual(calls.slice(0, 4), [
    ['depthMask', false],
    ['disable', 'DEPTH_TEST'],
    ['useProgram', program.program],
    ['bindBuffer', 'ARRAY_BUFFER', mesh.position],
  ]);
  assert.ok(calls.some((call) => call[0] === 'vertexAttribPointer' && call[1] === 5 && call[2] === 3));
  assert.deepEqual(calls.find((call) => call[0] === 'uniformMatrix4fv'), ['uniformMatrix4fv', 'uViewProjection', false, viewProjection]);
  assert.deepEqual(calls.find((call) => call[0] === 'uniform3f'), ['uniform3f', 'uCameraPosition', 1, 2, 3]);
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uTime' && call[2] === 42));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uSkyMode' && call[2] === 1));
  assert.ok(calls.some((call) => call[0] === 'uniform1f' && call[1] === 'uSkyPalette' && call[2] === 4));
  assert.deepEqual(calls.slice(-3), [
    ['drawArrays', 'TRIANGLES', 0, 36],
    ['enable', 'DEPTH_TEST'],
    ['depthMask', true],
  ]);
});
