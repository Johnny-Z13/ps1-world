import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createObjectiveState,
  isRogueGateUnlocked,
  updateObjectiveState,
} from '../src/objectiveRuntime.js';
import { createRogueRun, stepRogueRun } from '../src/rogueMode.js';
import { createRogueStageWorld } from '../src/rogueWorld.js';
import { SCENE_DEFINITIONS, createSceneWorld } from '../src/world.js';

test('adds a required Rogue ritual objective when a scene has no authored objective', () => {
  const run = createRogueRun(SCENE_DEFINITIONS, 0);
  const world = createRogueStageWorld(createSceneWorld('dungeon'), run, SCENE_DEFINITIONS);
  const objective = world.objectives.find((item) => item.objectiveId === 'dungeon-rogue-ritual');
  const state = createObjectiveState(world);

  assert.ok(objective);
  assert.equal(objective.requiredInRogue, true);
  assert.equal(isRogueGateUnlocked(world, state), false);

  const updated = updateObjectiveState(world, state, objective, 1000);
  assert.equal(isRogueGateUnlocked(world, updated.state), true);
});

test('preserves authored objectives and still adds the Rogue ritual spine', () => {
  const run = createRogueRun(SCENE_DEFINITIONS, 0);
  const baseWorld = {
    ...createSceneWorld('dungeon'),
    objectives: [
      { objectiveId: 'authored-sigil', label: 'Authored Sigil', requiredInRogue: true, x: 1, y: 0, z: 1 },
    ],
  };

  const world = createRogueStageWorld(baseWorld, run, SCENE_DEFINITIONS);

  assert.ok(world.objectives.some((item) => item.objectiveId === 'authored-sigil'));
  assert.ok(world.objectives.some((item) => item.objectiveId === 'dungeon-rogue-ritual'));
});

test('raises horde pressure as the Rogue run advances', () => {
  let earlyRun = createRogueRun(SCENE_DEFINITIONS, 0);
  let lateRun = earlyRun;
  for (let index = 0; index < 5; index += 1) lateRun = stepRogueRun(lateRun, SCENE_DEFINITIONS, 1000 + index);

  const early = createRogueStageWorld(createSceneWorld('dungeon'), earlyRun, SCENE_DEFINITIONS);
  const late = createRogueStageWorld(createSceneWorld('rotwood-forest'), lateRun, SCENE_DEFINITIONS);

  assert.ok(late.enemyEncounter.horde.maxAlive > early.enemyEncounter.horde.maxAlive);
  assert.ok(late.enemyEncounter.horde.pulseIntervalMs < early.enemyEncounter.horde.pulseIntervalMs);
  assert.ok(late.encounterTriggers.some((trigger) => trigger.id === 'rotwood-forest-rogue-horde-wake'));
});

test('wraps every Rogue stage with a required objective and enabled horde config', () => {
  let run = createRogueRun(SCENE_DEFINITIONS, 0);

  for (const definition of SCENE_DEFINITIONS) {
    const world = createRogueStageWorld(createSceneWorld(definition.id), run, SCENE_DEFINITIONS);
    assert.ok(world.objectives.some((objective) => objective.requiredInRogue !== false), definition.id);
    assert.equal(world.enemyEncounter.horde.enabled, true, definition.id);
    assert.ok(world.enemyEncounter.horde.maxAlive >= world.zombieSpawns.length + 4, definition.id);
    run = stepRogueRun(run, SCENE_DEFINITIONS, 1000);
  }
});
