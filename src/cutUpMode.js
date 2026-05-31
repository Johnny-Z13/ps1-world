export const CUT_UP_SCENE_SECONDS = 10;
export const CUT_UP_COUNTDOWN_SECONDS = 3;
export const CUT_UP_INTERVAL_MS = CUT_UP_SCENE_SECONDS * 1000;
export const CUT_UP_FLASH_DURATION_MS = 260;

export function createCutUpState(sceneCount, now = 0) {
  return {
    active: false,
    unlockedSceneCount: sceneCount,
    activeSceneIndex: 0,
    sceneStartedAt: now,
    flashStartedAt: -Infinity,
    sceneStates: new Map(),
  };
}

export function shouldAdvanceCutUpScene(state, now) {
  return state.active && now - state.sceneStartedAt >= CUT_UP_INTERVAL_MS;
}

export function getNextCutUpSceneIndex(state) {
  return (state.activeSceneIndex + 1) % state.unlockedSceneCount;
}

export function getCutUpHudText(state, sceneDefinitions, now) {
  const remaining = getCutUpRemainingSeconds(state, now);
  const scene = sceneDefinitions[state.activeSceneIndex];

  return `CUT UP ${state.activeSceneIndex + 1}/${state.unlockedSceneCount} ${scene.label} ${remaining.toFixed(1)}s`;
}

export function getCutUpJumpFlash(state, now) {
  if (!state.active) return 0;

  const elapsed = now - state.flashStartedAt;
  if (elapsed < 0 || elapsed > CUT_UP_FLASH_DURATION_MS) return 0;

  const progress = elapsed / CUT_UP_FLASH_DURATION_MS;
  return (1 - progress) * (1 - progress);
}

function getCutUpRemainingSeconds(state, now) {
  return Math.max(0, CUT_UP_INTERVAL_MS - (now - state.sceneStartedAt)) / 1000;
}
