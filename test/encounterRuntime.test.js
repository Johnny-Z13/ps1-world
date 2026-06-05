import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEncounterState,
  updateEncounterState,
} from '../src/encounterRuntime.js';

test('fires enabled one-shot encounter triggers once', () => {
  const world = {
    encounterTriggers: [
      {
        id: 'closet-a',
        encounterType: 'jump_scare',
        soundId: 'stinger',
        x: 0,
        y: 0,
        z: 0,
        width: 4,
        depth: 4,
        height: 3,
        oneShot: true,
      },
    ],
  };
  const state = createEncounterState(world);

  const first = updateEncounterState(world, state, { x: 0.5, y: 0, z: 0.5 }, 1000);
  const second = updateEncounterState(world, first.state, { x: 0.5, y: 0, z: 0.5 }, 1100);

  assert.deepEqual(first.actions.map((action) => action.type), ['jump_scare']);
  assert.equal(first.actions[0].triggerId, 'closet-a');
  assert.equal(first.actions[0].soundId, 'stinger');
  assert.deepEqual(second.actions, []);
});

test('returns horde wake decisions from authored trigger metadata', () => {
  const world = {
    encounterTriggers: [
      {
        id: 'wake-a',
        encounterType: 'awaken_horde',
        x: 0,
        y: 0,
        z: 0,
        width: 4,
        depth: 4,
        height: 3,
        maxAlive: 12,
        pulseIntervalMs: 1500,
      },
    ],
  };

  const result = updateEncounterState(world, createEncounterState(world), { x: 0, y: 0, z: 0 }, 1000);

  assert.deepEqual(result.actions[0], {
    type: 'awaken_horde',
    triggerId: 'wake-a',
    maxAlive: 12,
    pulseIntervalMs: 1500,
    soundId: undefined,
  });
});

test('ignores disabled and out-of-volume encounter triggers', () => {
  const world = {
    encounterTriggers: [
      { id: 'disabled', enabled: false, encounterType: 'jump_scare', x: 0, y: 0, z: 0, width: 10, depth: 10, height: 4 },
      { id: 'far', encounterType: 'jump_scare', x: 20, y: 0, z: 0, width: 2, depth: 2, height: 2 },
    ],
  };

  const result = updateEncounterState(world, createEncounterState(world), { x: 0, y: 0, z: 0 }, 1000);

  assert.deepEqual(result.actions, []);
});
