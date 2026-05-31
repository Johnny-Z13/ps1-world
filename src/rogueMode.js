export function createRogueRun(scenes, now = 0) {
  return {
    mode: 'rogue',
    active: true,
    complete: false,
    stageIndex: 0,
    stageStartedAt: now,
  };
}

export function getRogueSceneId(run, scenes) {
  if (!run?.active || run.complete) return null;
  return scenes[run.stageIndex]?.id ?? null;
}

export function getRogueStageLabel(run, scenes) {
  const total = scenes.length;
  const current = Math.min(run.stageIndex + 1, total);
  return `ROGUE ${current}/${total}`;
}

export function isRogueComplete(run, scenes) {
  return Boolean(run?.complete || run?.stageIndex >= scenes.length);
}

export function stepRogueRun(run, scenes, now = 0) {
  const nextIndex = run.stageIndex + 1;
  return {
    ...run,
    stageIndex: nextIndex,
    stageStartedAt: now,
    complete: nextIndex >= scenes.length,
  };
}
