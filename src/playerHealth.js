export const MAX_PLAYER_HEALTH = 100;
export const ZOMBIE_BITE_DAMAGE = 20;
export const LOW_HEALTH_THRESHOLD = 45;
export const CRITICAL_HEALTH_THRESHOLD = 20;

export function createPlayerHealth(value = MAX_PLAYER_HEALTH) {
  const clamped = clampHealth(value);
  return {
    value: clamped,
    dead: clamped <= 0,
  };
}

export function applyPlayerDamage(health, amount) {
  return createPlayerHealth((health?.value ?? MAX_PLAYER_HEALTH) - Math.max(0, amount));
}

export function restorePlayerHealth() {
  return createPlayerHealth(MAX_PLAYER_HEALTH);
}

export function getHealthDanger(health) {
  const value = clampHealth(health?.value ?? MAX_PLAYER_HEALTH);
  if (value > LOW_HEALTH_THRESHOLD) return 0;
  if (value <= CRITICAL_HEALTH_THRESHOLD) return 1;
  return (LOW_HEALTH_THRESHOLD - value) / (LOW_HEALTH_THRESHOLD - CRITICAL_HEALTH_THRESHOLD);
}

function clampHealth(value) {
  return Math.max(0, Math.min(MAX_PLAYER_HEALTH, Number.isFinite(value) ? value : MAX_PLAYER_HEALTH));
}
