import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSceneMesh,
  face,
  levelTriangleShade,
} from '../src/renderSceneMeshes.js';

function createFakeGl() {
  const calls = [];
  let nextBuffer = 1;
  const gl = {
    ARRAY_BUFFER: 'ARRAY_BUFFER',
    STATIC_DRAW: 'STATIC_DRAW',
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

function getBufferPayloads(calls) {
  return calls
    .filter(([name]) => name === 'bufferData')
    .map(([, , data]) => Array.from(data));
}

test('face writes two triangles with matching uv, texture, shade, and motion streams', () => {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [], motions: [] };

  face(geometry, 4, 0.75, [
    [0, 0, 0],
    [2, 0, 0],
    [2, 3, 0],
    [0, 3, 0],
  ], 2, 3, 9);

  assert.equal(geometry.positions.length, 18);
  assert.deepEqual(geometry.uvs, [0, 3, 2, 3, 2, 0, 0, 3, 2, 0, 0, 0]);
  assert.deepEqual(geometry.textureIds, [4, 4, 4, 4, 4, 4]);
  assert.deepEqual(geometry.shades, [0.75, 0.75, 0.75, 0.75, 0.75, 0.75]);
  assert.deepEqual(geometry.motions, [9, 9, 9, 9, 9, 9]);
});

test('levelTriangleShade keeps bright level textures emissive and shades triangles by normal', () => {
  assert.equal(levelTriangleShade({ textureId: 'lightning', vertices: [] }, 0), 1.3);
  assert.equal(levelTriangleShade({ textureId: 'sun', vertices: [] }, 0), 1.18);
  assert.equal(levelTriangleShade({
    textureId: 'stone',
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
  }, 0), 0.42);
});

test('createSceneMesh builds GLB level art plus health and warp geometry into static buffers', () => {
  const { gl, calls } = createFakeGl();
  const indices = new Map([
    ['stone', 2],
    ['healthPotion', 3],
    ['warpGate', 4],
  ]);
  const scene = {
    levelAsset: {
      artMeshes: [{
        textureId: 'stone',
        motion: 'none',
        vertices: [
          { x: 0, y: 0, z: 0, u: 0, v: 0 },
          { x: 1, y: 0, z: 0, u: 1, v: 0 },
          { x: 0, y: 0, z: 1, u: 0, v: 1 },
        ],
      }],
    },
    healthPotions: [{
      name: 'test potion',
      x: 0,
      y: 1,
      z: 2,
      width: 0.4,
      depth: 0.3,
      height: 0.8,
      texture: 'healthPotion',
      motion: 'pickup-bob',
    }],
    warpGate: {
      x: 2,
      y: 1.5,
      z: 3,
      width: 1.5,
      height: 2,
      texture: 'warpGate',
      motion: 'warp-pulse',
    },
  };

  const mesh = createSceneMesh(gl, scene, indices);
  const [positions, uvs, textureIds, shades, motions] = getBufferPayloads(calls);

  assert.equal(mesh.count, positions.length / 3);
  assert.equal(calls.filter(([name]) => name === 'bufferData').length, 5);
  assert.equal(uvs.length, mesh.count * 2);
  assert.equal(textureIds.length, mesh.count);
  assert.equal(shades.length, mesh.count);
  assert.equal(motions.length, mesh.count);
  assert.ok(textureIds.includes(2));
  assert.ok(textureIds.includes(3));
  assert.ok(textureIds.includes(4));
});

test('createSceneMesh skips collected GLB collectible art meshes', () => {
  const { gl, calls } = createFakeGl();
  const indices = new Map([
    ['stone', 2],
    ['gold', 5],
  ]);
  const scene = {
    levelAsset: {
      artMeshes: [
        {
          textureId: 'stone',
          vertices: [
            { x: 0, y: 0, z: 0, u: 0, v: 0 },
            { x: 1, y: 0, z: 0, u: 1, v: 0 },
            { x: 0, y: 0, z: 1, u: 0, v: 1 },
          ],
        },
        {
          collectibleId: 'dungeon-golden-goblet',
          textureId: 'gold',
          vertices: [
            { x: 2, y: 0, z: 0, u: 0, v: 0 },
            { x: 3, y: 0, z: 0, u: 1, v: 0 },
            { x: 2, y: 0, z: 1, u: 0, v: 1 },
          ],
        },
      ],
    },
    collectedCollectibleIds: new Set(['dungeon-golden-goblet']),
  };

  const mesh = createSceneMesh(gl, scene, indices);
  const [, , textureIds] = getBufferPayloads(calls);

  assert.equal(mesh.count, 3);
  assert.deepEqual(textureIds, [2, 2, 2]);
});

test('createSceneMesh builds fallback world boxes and billboards into static buffers', () => {
  const { gl, calls } = createFakeGl();
  const indices = new Map([
    ['floor', 1],
    ['wall', 2],
    ['crate', 3],
    ['star', 4],
    ['sun', 5],
    ['rain', 6],
  ]);
  const scene = {
    floor: { x: 0, y: 0, z: 0, width: 4, depth: 4, height: 0.2, texture: 'floor' },
    walls: [{ x: 0, y: 0, z: -2, width: 4, depth: 0.2, height: 2, texture: 'wall' }],
    crates: [{ x: 1, y: 0, z: 1, width: 1, depth: 1, height: 1, texture: 'crate' }],
    mountains: [],
    cards: [{ x: 0, y: 1, z: 2, width: 1, height: 1, texture: 'star' }],
    stars: [{ x: 2, y: 3, z: 4, width: 0.4, height: 0.4 }],
    sun: { x: 0, y: 4, z: 5, width: 1, height: 1, texture: 'sun' },
    rain: { texture: 'rain', drops: [{ x: 0, y: 3, z: 0, width: 0.05, height: 0.7 }] },
  };

  const mesh = createSceneMesh(gl, scene, indices);
  const [positions, uvs, textureIds] = getBufferPayloads(calls);

  assert.equal(mesh.count, positions.length / 3);
  assert.equal(uvs.length, mesh.count * 2);
  assert.ok(textureIds.includes(1));
  assert.ok(textureIds.includes(2));
  assert.ok(textureIds.includes(3));
  assert.ok(textureIds.includes(4));
  assert.ok(textureIds.includes(5));
  assert.ok(textureIds.includes(6));
});
