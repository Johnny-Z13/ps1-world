import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseZombieGlb, ZOMBIE_GLB_URL } from '../src/zombieModel.js';

test('parses the zombie walk GLB into renderable triangle vertices', () => {
  const file = readFileSync(new URL('../src/characters/Zombie/zombie_walk.glb', import.meta.url));
  const model = parseZombieGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

  assert.equal(ZOMBIE_GLB_URL, './src/characters/Zombie/zombie_walk.glb');
  assert.equal(model.name, 'tripo_mesh_a40c6500');
  assert.equal(model.vertexCount, 1434);
  assert.ok(model.vertices.every((vertex) => Number.isFinite(vertex.x)));
  assert.ok(model.vertices.every((vertex) => Number.isFinite(vertex.y)));
  assert.ok(model.vertices.every((vertex) => Number.isFinite(vertex.z)));
  assert.ok(model.bounds.max[1] > 0.9);
});
