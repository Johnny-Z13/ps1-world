import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindAttribute,
  createBuffer,
  createDynamicBuffer,
  createRenderTarget,
  deleteMeshBuffers,
  deleteRenderTarget,
  updateBuffer,
} from '../src/webglResources.js';

function createFakeGl({ framebufferStatus = 'FRAMEBUFFER_COMPLETE' } = {}) {
  const calls = [];
  let nextId = 1;
  const makeResource = (type) => ({ type, id: nextId++ });
  const gl = {
    ARRAY_BUFFER: 'ARRAY_BUFFER',
    STATIC_DRAW: 'STATIC_DRAW',
    DYNAMIC_DRAW: 'DYNAMIC_DRAW',
    FLOAT: 'FLOAT',
    TEXTURE_2D: 'TEXTURE_2D',
    TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
    TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
    TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
    TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
    NEAREST: 'NEAREST',
    CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
    RGBA: 'RGBA',
    UNSIGNED_BYTE: 'UNSIGNED_BYTE',
    RENDERBUFFER: 'RENDERBUFFER',
    DEPTH_COMPONENT16: 'DEPTH_COMPONENT16',
    FRAMEBUFFER: 'FRAMEBUFFER',
    COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
    DEPTH_ATTACHMENT: 'DEPTH_ATTACHMENT',
    FRAMEBUFFER_COMPLETE: 'FRAMEBUFFER_COMPLETE',
    createBuffer() {
      const buffer = makeResource('buffer');
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
    deleteBuffer(...args) {
      calls.push(['deleteBuffer', ...args]);
    },
    createTexture() {
      const texture = makeResource('texture');
      calls.push(['createTexture', texture]);
      return texture;
    },
    bindTexture(...args) {
      calls.push(['bindTexture', ...args]);
    },
    texParameteri(...args) {
      calls.push(['texParameteri', ...args]);
    },
    texImage2D(...args) {
      calls.push(['texImage2D', ...args]);
    },
    createRenderbuffer() {
      const renderbuffer = makeResource('renderbuffer');
      calls.push(['createRenderbuffer', renderbuffer]);
      return renderbuffer;
    },
    bindRenderbuffer(...args) {
      calls.push(['bindRenderbuffer', ...args]);
    },
    renderbufferStorage(...args) {
      calls.push(['renderbufferStorage', ...args]);
    },
    createFramebuffer() {
      const framebuffer = makeResource('framebuffer');
      calls.push(['createFramebuffer', framebuffer]);
      return framebuffer;
    },
    bindFramebuffer(...args) {
      calls.push(['bindFramebuffer', ...args]);
    },
    framebufferTexture2D(...args) {
      calls.push(['framebufferTexture2D', ...args]);
    },
    framebufferRenderbuffer(...args) {
      calls.push(['framebufferRenderbuffer', ...args]);
    },
    checkFramebufferStatus(...args) {
      calls.push(['checkFramebufferStatus', ...args]);
      return framebufferStatus;
    },
    deleteTexture(...args) {
      calls.push(['deleteTexture', ...args]);
    },
    deleteRenderbuffer(...args) {
      calls.push(['deleteRenderbuffer', ...args]);
    },
    deleteFramebuffer(...args) {
      calls.push(['deleteFramebuffer', ...args]);
    },
  };
  return { gl, calls };
}

test('creates static and dynamic array buffers with the expected draw usage', () => {
  const { gl, calls } = createFakeGl();
  const vertices = new Float32Array([1, 2, 3]);

  const staticBuffer = createBuffer(gl, vertices);
  const dynamicBuffer = createDynamicBuffer(gl);
  updateBuffer(gl, dynamicBuffer, vertices);
  bindAttribute(gl, 7, staticBuffer, 3);

  assert.deepEqual(calls.filter(([name]) => name === 'bufferData'), [
    ['bufferData', 'ARRAY_BUFFER', vertices, 'STATIC_DRAW'],
    ['bufferData', 'ARRAY_BUFFER', 0, 'DYNAMIC_DRAW'],
    ['bufferData', 'ARRAY_BUFFER', vertices, 'DYNAMIC_DRAW'],
  ]);
  assert.deepEqual(calls.at(-2), ['enableVertexAttribArray', 7]);
  assert.deepEqual(calls.at(-1), ['vertexAttribPointer', 7, 3, 'FLOAT', false, 0, 0]);
});

test('creates a complete low-resolution render target and can delete it', () => {
  const { gl, calls } = createFakeGl();

  const target = createRenderTarget(gl, 320, 240);
  deleteRenderTarget(gl, target);

  assert.equal(target.texture.type, 'texture');
  assert.equal(target.depth.type, 'renderbuffer');
  assert.equal(target.framebuffer.type, 'framebuffer');
  assert.deepEqual(calls.find(([name]) => name === 'texImage2D'), [
    'texImage2D',
    'TEXTURE_2D',
    0,
    'RGBA',
    320,
    240,
    0,
    'RGBA',
    'UNSIGNED_BYTE',
    null,
  ]);
  assert.deepEqual(calls.find(([name]) => name === 'renderbufferStorage'), [
    'renderbufferStorage',
    'RENDERBUFFER',
    'DEPTH_COMPONENT16',
    320,
    240,
  ]);
  assert.deepEqual(calls.slice(-3), [
    ['deleteTexture', target.texture],
    ['deleteRenderbuffer', target.depth],
    ['deleteFramebuffer', target.framebuffer],
  ]);
});

test('throws when the render target framebuffer is incomplete', () => {
  const { gl } = createFakeGl({ framebufferStatus: 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT' });

  assert.throws(
    () => createRenderTarget(gl, 160, 120),
    /Could not create the low-resolution render target/,
  );
});

test('deletes mesh buffers and ignores missing resources', () => {
  const { gl, calls } = createFakeGl();
  const mesh = {
    position: { id: 'position' },
    uv: { id: 'uv' },
    textureId: { id: 'textureId' },
    shade: { id: 'shade' },
    motion: { id: 'motion' },
  };

  deleteMeshBuffers(gl, null);
  deleteMeshBuffers(gl, mesh);

  assert.deepEqual(calls, [
    ['deleteBuffer', mesh.position],
    ['deleteBuffer', mesh.uv],
    ['deleteBuffer', mesh.textureId],
    ['deleteBuffer', mesh.shade],
    ['deleteBuffer', mesh.motion],
  ]);
});
