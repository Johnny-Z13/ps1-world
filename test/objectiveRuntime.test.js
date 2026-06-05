import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createObjectiveState,
  getObjectiveHudText,
  isRogueGateUnlocked,
  updateObjectiveState,
} from '../src/objectiveRuntime.js';

test('locks Rogue gate until required objectives are complete', () => {
  const world = {
    objectives: [
      { objectiveId: 'sigil-a', label: 'Feed the door', requiredInRogue: true, x: 2, y: 0, z: 0, radius: 1 },
      { objectiveId: 'optional-noise', label: 'Optional noise', requiredInRogue: false, x: 8, y: 0, z: 0, radius: 1 },
    ],
  };
  const state = createObjectiveState(world);

  assert.equal(isRogueGateUnlocked(world, state), false);

  const updated = updateObjectiveState(world, state, { x: 2, y: 0, z: 0 }, 1000);

  assert.equal(isRogueGateUnlocked(world, updated.state), true);
  assert.deepEqual(updated.completed.map((item) => item.objectiveId), ['sigil-a']);
});

test('tracks count-required objectives and emits corrupted HUD text', () => {
  const world = {
    objectives: [
      { objectiveId: 'teeth', label: 'Collect teeth', requiredInRogue: true, countRequired: 2 },
    ],
  };
  const state = createObjectiveState(world);

  const first = updateObjectiveState(world, state, { x: 0, y: 0, z: 0 }, 1000, { objectiveId: 'teeth' });
  assert.equal(isRogueGateUnlocked(world, first.state), false);
  assert.match(getObjectiveHudText(world, first.state, 'rogue'), /COLLECT TEETH 1\/2/);

  const second = updateObjectiveState(world, first.state, { x: 0, y: 0, z: 0 }, 1200, { objectiveId: 'teeth' });
  assert.equal(isRogueGateUnlocked(world, second.state), true);
  assert.match(getObjectiveHudText(world, second.state, 'rogue'), /RITUAL COMPLETE/);
});

test('ignores disabled objectives and safely handles empty scenes', () => {
  const disabledWorld = {
    objectives: [
      { objectiveId: 'off', enabled: false, requiredInRogue: true, label: 'Off' },
    ],
  };

  assert.equal(isRogueGateUnlocked({ objectives: [] }, createObjectiveState({ objectives: [] })), true);
  assert.equal(isRogueGateUnlocked(disabledWorld, createObjectiveState(disabledWorld)), true);
  assert.equal(getObjectiveHudText({ objectives: [] }, createObjectiveState({ objectives: [] }), 'rogue'), '');
});
