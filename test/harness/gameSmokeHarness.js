import { createCutUpState, getCutUpHudText, getCutUpJumpFlash, getNextCutUpSceneIndex, shouldAdvanceCutUpScene } from '../../src/cutUpMode.js';
import { createPlayerHealth } from '../../src/playerHealth.js';
import { applyVideoPreset, createEffectState, getResolutionMode, VIDEO_PRESETS } from '../../src/ps1Display.js';
import { createRogueRun, getRogueSceneId, getRogueStageLabel, isRogueComplete, stepRogueRun } from '../../src/rogueMode.js';
import { SCENE_DEFINITIONS, createSceneWorld } from '../../src/world.js';
import { createZombieEnemies } from '../../src/zombies.js';

export function createGameSmokeHarness() {
  return {
    startFreeRoam(sceneId = 'dungeon') {
      const world = createSceneWorld(sceneId);
      return {
        mode: 'free-roam',
        world,
        playerHealth: createPlayerHealth(),
        zombies: createZombieEnemies(world),
      };
    },

    applyAllVideoPresets() {
      return VIDEO_PRESETS.map((preset) => {
        const effects = applyVideoPreset(createEffectState(), preset.id);
        return {
          id: preset.id,
          effects,
          resolution: getResolutionMode(effects.resolutionId),
        };
      });
    },

    startCutUp(now = 0) {
      const state = createCutUpState(SCENE_DEFINITIONS.length, now);
      state.active = true;
      return {
        mode: 'cut-up',
        state,
        world: createSceneWorld(SCENE_DEFINITIONS[state.activeSceneIndex].id),
      };
    },

    stepCutUp(run, now) {
      if (!shouldAdvanceCutUpScene(run.state, now)) {
        return {
          ...run,
          hud: getCutUpHudText(run.state, SCENE_DEFINITIONS, now),
          flash: getCutUpJumpFlash(run.state, now),
        };
      }

      const nextIndex = getNextCutUpSceneIndex(run.state);
      const state = {
        ...run.state,
        activeSceneIndex: nextIndex,
        sceneStartedAt: now,
        flashStartedAt: now,
      };

      return {
        mode: 'cut-up',
        state,
        world: createSceneWorld(SCENE_DEFINITIONS[nextIndex].id),
        hud: getCutUpHudText(state, SCENE_DEFINITIONS, now),
        flash: getCutUpJumpFlash(state, now),
      };
    },

    startRogue(now = 0) {
      const state = createRogueRun(SCENE_DEFINITIONS, now);
      return {
        mode: 'rogue',
        complete: false,
        state,
        world: createSceneWorld(getRogueSceneId(state, SCENE_DEFINITIONS)),
        label: getRogueStageLabel(state, SCENE_DEFINITIONS),
      };
    },

    stepRogue(run, now = 0) {
      const state = stepRogueRun(run.state, SCENE_DEFINITIONS, now);
      const complete = isRogueComplete(state, SCENE_DEFINITIONS);
      const sceneId = getRogueSceneId(state, SCENE_DEFINITIONS);

      return {
        mode: complete ? 'rogue-complete' : 'rogue',
        complete,
        state,
        world: sceneId ? createSceneWorld(sceneId) : null,
        label: getRogueStageLabel(state, SCENE_DEFINITIONS),
      };
    },
  };
}
