import assert from 'node:assert/strict';
import test from 'node:test';

import { CUT_UP_INTERVAL_MS } from '../src/cutUpMode.js';
import { VIDEO_PRESETS } from '../src/ps1Display.js';
import { SCENE_DEFINITIONS } from '../src/world.js';
import { createGameSmokeHarness } from './harness/gameSmokeHarness.js';

test('smoke harness starts Free Roam with playable scene state', () => {
  const harness = createGameSmokeHarness();
  const run = harness.startFreeRoam('dungeon');

  assert.equal(run.mode, 'free-roam');
  assert.equal(run.world.id, 'dungeon');
  assert.ok(run.world.playerSpawn);
  assert.ok(run.playerHealth.value > 0);
  assert.ok(run.zombies.length > 0);
});

test('smoke harness applies every video preset to a valid resolution', () => {
  const harness = createGameSmokeHarness();
  const presets = harness.applyAllVideoPresets();

  assert.equal(presets.length, VIDEO_PRESETS.length);
  for (const preset of presets) {
    assert.ok(preset.id);
    assert.ok(preset.effects.preset);
    assert.equal(preset.resolution.id, preset.effects.resolutionId);
    assert.ok(preset.resolution.width > 0);
    assert.ok(preset.resolution.height > 0);
  }
});

test('smoke harness steps Cut-Up countdown and scene jump', () => {
  const harness = createGameSmokeHarness();
  const run = harness.startCutUp(1000);

  assert.equal(run.mode, 'cut-up');
  assert.equal(run.world.id, SCENE_DEFINITIONS[0].id);

  const countdown = harness.stepCutUp(run, 1000 + CUT_UP_INTERVAL_MS - 1900);
  assert.equal(countdown.world.id, SCENE_DEFINITIONS[0].id);
  assert.match(countdown.hud, /^CUT UP 1\/9 /);
  assert.equal(countdown.flash, 0);

  const jumped = harness.stepCutUp(run, 1000 + CUT_UP_INTERVAL_MS);
  assert.equal(jumped.world.id, SCENE_DEFINITIONS[1].id);
  assert.match(jumped.hud, /^CUT UP 2\/9 /);
  assert.equal(jumped.flash, 1);
});

test('smoke harness completes Rogue only after all nine warp advances', () => {
  const harness = createGameSmokeHarness();
  let run = harness.startRogue(2000);

  assert.equal(run.mode, 'rogue');
  assert.equal(run.world.id, SCENE_DEFINITIONS[0].id);
  assert.equal(run.label, 'ROGUE 1/9');
  assert.equal(run.complete, false);

  for (let index = 1; index < SCENE_DEFINITIONS.length; index += 1) {
    run = harness.stepRogue(run, 2000 + index * 1000);
    assert.equal(run.mode, 'rogue');
    assert.equal(run.complete, false);
    assert.equal(run.world.id, SCENE_DEFINITIONS[index].id);
    assert.equal(run.label, `ROGUE ${index + 1}/9`);
  }

  run = harness.stepRogue(run, 2000 + SCENE_DEFINITIONS.length * 1000);
  assert.equal(run.mode, 'rogue-complete');
  assert.equal(run.complete, true);
  assert.equal(run.world, null);
});
