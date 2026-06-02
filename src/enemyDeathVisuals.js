const ENEMY_DEATH_RENDER_MS = 1600;

export function getEnemyDeathRenderState(enemy, now) {
  if (enemy?.state !== 'dying') {
    return {
      progress: 0,
      verticalScale: 1,
      horizontalScale: 1,
      yOffset: 0,
      shade: 0.98,
      motionScale: 1,
    };
  }

  const progress = clamp((now - (enemy.diedAt ?? now)) / ENEMY_DEATH_RENDER_MS, 0, 1);
  const flicker = (Math.floor(now / 90) % 2 === 0 ? 0.06 : -0.04) * (1 - progress);
  return {
    progress: roundDeathValue(progress),
    verticalScale: roundDeathValue(1 - progress * 0.78),
    horizontalScale: roundDeathValue(1 + progress * 0.22),
    yOffset: roundDeathValue(-progress * 0.42),
    shade: roundDeathValue(Math.max(0.16, 0.98 - progress * 0.62 + flicker)),
    motionScale: 0,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundDeathValue(value) {
  return Math.round(value * 10000) / 10000;
}
