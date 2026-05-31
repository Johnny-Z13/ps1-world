import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { animateZombieModel, parseZombieGlb, ZOMBIE_GLB_URL } from '../src/zombieModel.js';

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

test('reports the embedded zombie texture and animation clip', () => {
  const file = readFileSync(new URL('../src/characters/Zombie/zombie_walk.glb', import.meta.url));
  const model = parseZombieGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

  assert.equal(model.texture.name, 'zombie3dmodel_basecolor');
  assert.equal(model.texture.mimeType, 'image/jpeg');
  assert.ok(model.texture.bytes.byteLength > 10000);
  assert.equal(model.animations.length, 1);
  assert.equal(model.animations[0].name, 'Armature|NlaTrack');
  assert.equal(model.animations[0].channels, 126);
  assert.ok(model.animations[0].loopDuration > 0.5);
});

test('skins the zombie walk animation so vertices leave bind pose and loop', () => {
  const file = readFileSync(new URL('../src/characters/Zombie/zombie_walk.glb', import.meta.url));
  const model = parseZombieGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const firstFrame = animateZombieModel(model, 0.25);
  const laterFrame = animateZombieModel(model, 0.75);
  const loopedFrame = animateZombieModel(model, 0.25 + model.animations[0].loopDuration);

  assert.equal(model.skin.joints.length, 41);
  assert.ok(model.vertices.some((vertex) => vertex.joints.some((joint) => joint > 0)));
  assert.notDeepEqual(firstFrame[0], model.vertices[0]);
  assert.notDeepEqual(firstFrame[0], laterFrame[0]);
  assert.deepEqual(firstFrame[0], loopedFrame[0]);
});

test('parses one-eyed alien and molten sentinel character GLBs with named clips', () => {
  const alienFile = readFileSync(new URL('../src/characters/one-eye-alien/one-eye-alien.glb', import.meta.url));
  const sentinelFile = readFileSync(new URL('../src/characters/molten-stone-sentinel/moulten-stone-sentienel.glb', import.meta.url));
  const alien = parseZombieGlb(alienFile.buffer.slice(alienFile.byteOffset, alienFile.byteOffset + alienFile.byteLength));
  const sentinel = parseZombieGlb(sentinelFile.buffer.slice(sentinelFile.byteOffset, sentinelFile.byteOffset + sentinelFile.byteLength));

  assert.ok(alien.vertexCount > 8000);
  assert.ok(sentinel.vertexCount > 25000);
  assert.ok(alien.animations.some((animation) => animation.name === 'Attack'));
  assert.ok(sentinel.animations.some((animation) => animation.name === 'Running'));
  assert.ok(sentinel.animations.some((animation) => animation.name === 'Idle'));
  assert.ok(sentinel.animations.some((animation) => animation.name === 'Confused_Scratch'));
  assert.ok(alien.texture.bytes.byteLength > 10000);
  assert.ok(sentinel.texture.bytes.byteLength > 10000);
});

test('can skin a specific named character animation clip', () => {
  const file = readFileSync(new URL('../src/characters/molten-stone-sentinel/moulten-stone-sentienel.glb', import.meta.url));
  const model = parseZombieGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const running = animateZombieModel(model, 0.35, 'Running');
  const idle = animateZombieModel(model, 0.35, 'Idle');

  assert.notDeepEqual(running[0], idle[0]);
});
