import { createCutUpState, getCutUpHudText, getCutUpJumpFlash, getNextCutUpSceneIndex, shouldAdvanceCutUpScene } from '../../src/cutUpMode.js';
import { createPlayerHealth } from '../../src/playerHealth.js';
import { applyVideoPreset, createEffectState, getResolutionMode, VIDEO_PRESETS } from '../../src/ps1Display.js';
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
  };
}
