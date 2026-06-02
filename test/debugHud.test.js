import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyDebugHudSnapshot,
  createDebugHudSnapshot,
} from '../src/debugHud.js';

test('createDebugHudSnapshot smooths fps and derives visible enemy counts', () => {
  assert.deepEqual(createDebugHudSnapshot({
    previousFps: 50,
    dt: 0.02,
    debugEnabled: true,
    sceneLabel: 'Rotwood Forest',
    zombieCount: 7,
    zombiesEnabled: true,
  }), {
    fps: 50,
    hidden: false,
    scene: 'Rotwood Forest',
    zombies: '7',
    enemies: '7',
  });

  assert.deepEqual(createDebugHudSnapshot({
    previousFps: 0,
    dt: 0,
    debugEnabled: false,
    sceneLabel: 'Dungeon',
    zombieCount: 3,
    zombiesEnabled: false,
  }), {
    fps: 0,
    hidden: true,
    scene: 'Dungeon',
    zombies: '3',
    enemies: '0',
  });
});

test('applyDebugHudSnapshot hides panel early or writes text fields', () => {
  const elements = {
    panel: { hidden: false },
    fps: { textContent: '' },
    scene: { textContent: '' },
    zombies: { textContent: '' },
    enemies: { textContent: '' },
  };

  applyDebugHudSnapshot(elements, {
    hidden: true,
    fps: 61.4,
    scene: 'Dungeon',
    zombies: '2',
    enemies: '2',
  });

  assert.equal(elements.panel.hidden, true);
  assert.equal(elements.fps.textContent, '');

  applyDebugHudSnapshot(elements, {
    hidden: false,
    fps: 61.4,
    scene: 'Dungeon',
    zombies: '2',
    enemies: '2',
  });

  assert.equal(elements.panel.hidden, false);
  assert.equal(elements.fps.textContent, '61');
  assert.equal(elements.scene.textContent, 'Dungeon');
  assert.equal(elements.zombies.textContent, '2');
  assert.equal(elements.enemies.textContent, '2');
});
