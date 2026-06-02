import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPostQuad,
  createSkyDomeMesh,
  drawMesh,
  drawQuad,
} from '../src/renderMeshes.js';

function createFakeGl() {
  const calls = [];
  let nextBuffer = 1;
  const gl = {
    ARRAY_BUFFER: 'ARRAY_BUFFER',
    STATIC_DRAW: 'STATIC_DRAW',
    FLOAT: 'FLOAT',
    TRIANGLES: 'TRIANGLES',
    createBuffer() {
      const buffer = { id: nextBuffer++ };
      calls.push(['createBuffer', buffer]);
      return buffer;
    },
    bindBuffer(...args) {
      calls.push(['bindBuffer', ...args]);
    },
    bufferData(...args) {
      calls.push(['bufferData', ...args]);
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

test('drawMesh binds all scene mesh attributes before drawing triangles', () => {
  const { gl, calls } = createFakeGl();
  const program = {
    attributes: {
      aPosition: 0,
      aUv: 1,
      aTextureId: 2,
      aShade: 3,
      aMotion: 4,
    },
  };
  const mesh = {
    count: 12,
    position: { id: 'position' },
    uv: { id: 'uv' },
    textureId: { id: 'textureId' },
    shade: { id: 'shade' },
    motion: { id: 'motion' },
  };

  drawMesh(gl, program, mesh);

  assert.deepEqual(calls.filter(([name]) => name === 'vertexAttribPointer'), [
    ['vertexAttribPointer', 0, 3, 'FLOAT', false, 0, 0],
    ['vertexAttribPointer', 1, 2, 'FLOAT', false, 0, 0],
    ['vertexAttribPointer', 2, 1, 'FLOAT', false, 0, 0],
    ['vertexAttribPointer', 3, 1, 'FLOAT', false, 0, 0],
    ['vertexAttribPointer', 4, 1, 'FLOAT', false, 0, 0],
  ]);
  assert.deepEqual(calls.at(-1), ['drawArrays', 'TRIANGLES', 0, 12]);
});

test('drawMesh skips missing and empty meshes', () => {
  const { gl, calls } = createFakeGl();

  drawMesh(gl, { attributes: {} }, null);
  drawMesh(gl, { attributes: {} }, { count: 0 });

  assert.deepEqual(calls, []);
});

test('createSkyDomeMesh builds the expected static dome vertex buffer', () => {
  const { gl, calls } = createFakeGl();

  const mesh = createSkyDomeMesh(gl);

  assert.equal(mesh.count, 9 * 32 * 6);
  const bufferDataCall = calls.find(([name]) => name === 'bufferData');
  assert.equal(bufferDataCall[1], 'ARRAY_BUFFER');
  assert.equal(bufferDataCall[2].length, mesh.count * 3);
  assert.equal(bufferDataCall[3], 'STATIC_DRAW');
});

test('createPostQuad and drawQuad use a six-vertex fullscreen triangle pair', () => {
  const { gl, calls } = createFakeGl();
  const program = { attributes: { aPosition: 5 } };

  const quad = createPostQuad(gl);
  drawQuad(gl, program, quad);

  const bufferDataCall = calls.find(([name]) => name === 'bufferData');
  assert.deepEqual(Array.from(bufferDataCall[2]), [
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ]);
  assert.deepEqual(calls.at(-1), ['drawArrays', 'TRIANGLES', 0, 6]);
});
