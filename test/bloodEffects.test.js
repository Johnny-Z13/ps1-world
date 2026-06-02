import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLOOD_BURST_DURATION_MS,
  BLOOD_BURST_TEXTURE_ID,
  createBloodBurst,
  updateBloodBursts,
} from '../src/bloodEffects.js';
import { SCENE_DEFINITIONS, createSceneWorld } from '../src/world.js';

test('creates deterministic blood shard bursts from dying enemies', () => {
  const burst = createBloodBurst({
    id: 'arena-zombie-2',
    enemyType: 'zombie',
    x: 3,
    y: 1.45,
    z: -2,
    radius: 0.38,
  }, 1200);

  assert.equal(burst.id, 'blood:arena-zombie-2:1200');
  assert.equal(burst.texture, BLOOD_BURST_TEXTURE_ID);
  assert.equal(burst.startedAt, 1200);
  assert.equal(burst.x, 3);
  assert.equal(burst.y, 1.2);
  assert.equal(burst.z, -2);
  assert.equal(burst.shards.length, 7);
  assert.ok(burst.shards.every((shard) => shard.size > 0));
  assert.deepEqual(burst, createBloodBurst({ id: 'arena-zombie-2', x: 3, y: 1.45, z: -2, radius: 0.38 }, 1200));
});

test('expires blood bursts after their visible lifetime', () => {
  const burst = createBloodBurst({ id: 'enemy', x: 0, y: 1.45, z: 0, radius: 0.4 }, 100);

  assert.deepEqual(updateBloodBursts([burst], 100 + BLOOD_BURST_DURATION_MS), [burst]);
  assert.deepEqual(updateBloodBursts([burst], 101 + BLOOD_BURST_DURATION_MS), []);
});

test('all runtime scenes include the generated blood burst texture', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const world = createSceneWorld(definition.id);
    assert.ok(
      world.textures.some((texture) => texture.id === BLOOD_BURST_TEXTURE_ID),
      `${definition.id} includes ${BLOOD_BURST_TEXTURE_ID}`,
    );
  }
});
