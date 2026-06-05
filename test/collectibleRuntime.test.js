import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSceneCollectibles,
  updateCollectibles,
} from '../src/collectibleRuntime.js';

test('createSceneCollectibles copies scene collectible state', () => {
  const scene = {
    collectibles: [
      {
        collectibleId: 'dungeon-golden-goblet',
        x: 1,
        y: 0.75,
        z: 2,
        radius: 0.7,
        label: 'You found the goblet.',
      },
    ],
  };

  const collectibles = createSceneCollectibles(scene);
  collectibles[0].x = 9;

  assert.equal(scene.collectibles[0].x, 1);
  assert.equal(collectibles[0].collectibleId, 'dungeon-golden-goblet');
});

test('updateCollectibles removes overlapped collectibles and returns pickup notices', () => {
  const world = {
    collectibles: [
      {
        collectibleId: 'dungeon-golden-goblet',
        x: 2,
        y: 0.6,
        z: -3,
        radius: 0.8,
        height: 1,
        label: 'You found the goblet.',
      },
      {
        collectibleId: 'dungeon-diamond',
        x: -4,
        y: 0.6,
        z: 1,
        radius: 0.8,
        height: 1,
        label: 'You found the diamond.',
      },
    ],
  };
  const player = { x: 2.1, y: 1.45, z: -2.95 };

  const result = updateCollectibles(world, createSceneCollectibles(world), player);

  assert.deepEqual(result.picked.map((item) => item.collectibleId), ['dungeon-golden-goblet']);
  assert.deepEqual(result.remaining.map((item) => item.collectibleId), ['dungeon-diamond']);
  assert.deepEqual(result.collectedIds, ['dungeon-golden-goblet']);
  assert.equal(result.noticeText, 'You found the goblet.');
});
