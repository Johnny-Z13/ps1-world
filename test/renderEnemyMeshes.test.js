import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createZombieMesh,
  updateZombieMesh,
} from '../src/renderEnemyMeshes.js';

function createFakeGl() {
  const calls = [];
  let nextBuffer = 1;
  const gl = {
    ARRAY_BUFFER: 'ARRAY_BUFFER',
    DYNAMIC_DRAW: 'DYNAMIC_DRAW',
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
  };
  return { gl, calls };
}

function getDynamicPayloads(calls) {
  return calls
    .filter(([name, , data]) => name === 'bufferData' && data instanceof Float32Array)
    .map(([, , data]) => Array.from(data));
}

test('createZombieMesh creates six empty dynamic vertex streams', () => {
  const { gl, calls } = createFakeGl();

  const mesh = createZombieMesh(gl);

  assert.equal(mesh.count, 0);
  assert.equal(calls.filter(([name]) => name === 'createBuffer').length, 6);
  assert.deepEqual(calls.filter(([name]) => name === 'bufferData'), [
    ['bufferData', 'ARRAY_BUFFER', 0, 'DYNAMIC_DRAW'],
    ['bufferData', 'ARRAY_BUFFER', 0, 'DYNAMIC_DRAW'],
    ['bufferData', 'ARRAY_BUFFER', 0, 'DYNAMIC_DRAW'],
    ['bufferData', 'ARRAY_BUFFER', 0, 'DYNAMIC_DRAW'],
    ['bufferData', 'ARRAY_BUFFER', 0, 'DYNAMIC_DRAW'],
    ['bufferData', 'ARRAY_BUFFER', 0, 'DYNAMIC_DRAW'],
  ]);
});

test('updateZombieMesh builds fallback zombie card geometry when no model is available', () => {
  const { gl, calls } = createFakeGl();
  const mesh = createZombieMesh(gl);
  const indices = new Map([['zombie', 7]]);
  calls.length = 0;

  updateZombieMesh(gl, mesh, [{
    id: 'z1',
    enemyType: 'zombie',
    x: 1,
    y: 1.62,
    z: 2,
    yaw: 0,
  }], indices, new Map(), 0, 1000, [], null);

  const [positions, uvs, textureIds, shades, motions, warpings] = getDynamicPayloads(calls);
  assert.equal(mesh.count, 12);
  assert.equal(positions.length, mesh.count * 3);
  assert.equal(uvs.length, mesh.count * 2);
  assert.deepEqual(new Set(textureIds), new Set([7]));
  assert.equal(shades.length, mesh.count);
  assert.equal(motions.length, mesh.count);
  assert.equal(warpings.length, mesh.count);
  assert.ok(warpings.every((value) => value === 1));
});

test('updateZombieMesh uses animated model vertices when a matching model exists', () => {
  const { gl, calls } = createFakeGl();
  const mesh = createZombieMesh(gl);
  const indices = new Map([['one-eye-alien', 8], ['zombie', 7]]);
  const model = {
    animations: [{ name: 'Attack' }],
    vertices: [
      { x: 0, y: 0, z: 0, u: 0, v: 0 },
      { x: 1, y: 0, z: 0, u: 1, v: 0 },
      { x: 0, y: 1, z: 0, u: 0, v: 1 },
    ],
  };
  calls.length = 0;

  updateZombieMesh(gl, mesh, [{
    id: 'alien1',
    enemyType: 'one-eye-alien',
    state: 'attack',
    x: 0,
    y: 1.62,
    z: 0,
    yaw: 0,
    animationSeed: 0,
  }], indices, new Map([['one-eye-alien', model]]), 0, 1000);

  const [positions, , textureIds] = getDynamicPayloads(calls);
  assert.equal(mesh.count, 3);
  assert.equal(positions.length, 9);
  assert.deepEqual(textureIds, [8, 8, 8]);
});

test('updateZombieMesh appends blood burst cards after enemies', () => {
  const { gl, calls } = createFakeGl();
  const mesh = createZombieMesh(gl);
  const indices = new Map([['zombie', 7], ['bloodBurst', 9]]);
  calls.length = 0;

  updateZombieMesh(gl, mesh, [], indices, new Map(), 0, 500, [{
    texture: 'bloodBurst',
    startedAt: 0,
    durationMs: 1000,
    x: 1,
    y: 1,
    z: 1,
    shards: [{ angle: 0, distance: 1, lift: 0.5, size: 0.2 }],
  }]);

  const [positions, , textureIds, shades] = getDynamicPayloads(calls);
  assert.equal(mesh.count, 12);
  assert.equal(positions.length, mesh.count * 3);
  assert.deepEqual(new Set(textureIds), new Set([9]));
  assert.ok(shades.every((shade) => shade > 0));
});
