import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRogueRun,
  getRogueSceneId,
  getRogueStageLabel,
  isRogueComplete,
  stepRogueRun,
} from '../src/rogueMode.js';
import { SCENE_DEFINITIONS } from '../src/world.js';

test('Rogue mode starts on level one and advances through all nine scenes', () => {
  let run = createRogueRun(SCENE_DEFINITIONS);

  assert.equal(run.mode, 'rogue');
  assert.equal(run.stageIndex, 0);
  assert.equal(getRogueSceneId(run, SCENE_DEFINITIONS), SCENE_DEFINITIONS[0].id);
  assert.equal(getRogueStageLabel(run, SCENE_DEFINITIONS), 'ROGUE 1/9');
  assert.equal(isRogueComplete(run, SCENE_DEFINITIONS), false);

  for (let index = 1; index < SCENE_DEFINITIONS.length; index += 1) {
    run = stepRogueRun(run, SCENE_DEFINITIONS);
    assert.equal(run.stageIndex, index);
    assert.equal(getRogueSceneId(run, SCENE_DEFINITIONS), SCENE_DEFINITIONS[index].id);
  }

  run = stepRogueRun(run, SCENE_DEFINITIONS);
  assert.equal(isRogueComplete(run, SCENE_DEFINITIONS), true);
  assert.equal(getRogueSceneId(run, SCENE_DEFINITIONS), null);
});
