import { getHealthDanger } from './playerHealth.js';

export const HEALTH_PICKUP_FLASH_DURATION_MS = 520;
export const DAMAGE_FLASH_DURATION_MS = 420;
export const DEATH_RESPAWN_DELAY_MS = 2500;

export const DEATH_SCENE_PROFILES = Object.freeze({
  collapseSplat: Object.freeze({
    id: 'collapseSplat',
    impactAt: 0.5,
    finalJiggleStart: 0.8,
    finalJiggleStrength: 0.028,
    dropDistance: 1.15,
    pitchDrop: 0.92,
    bounceHeight: 0.24,
    bounceCount: 2.5,
  }),
});

export function getHealthEffectStrength({
  playerHealth,
  now,
  titleActive = false,
  optionsOpen = false,
  deathActive = false,
}) {
  if (titleActive || optionsOpen || deathActive) return { danger: 0, pulse: 0 };

  const danger = getHealthDanger(playerHealth);
  if (danger <= 0) return { danger: 0, pulse: 0 };

  const pulse = (Math.sin(now * 0.012) * 0.5 + 0.5) * danger;
  return {
    danger,
    pulse: danger >= 1 ? pulse : pulse * 0.48,
  };
}

export function getHealthPickupFlash({
  now,
  startedAt,
  durationMs = HEALTH_PICKUP_FLASH_DURATION_MS,
}) {
  return getTimedFlash(now, startedAt, durationMs);
}

export function getDamageFlash({
  now,
  startedAt,
  titleActive = false,
  optionsOpen = false,
  deathActive = false,
  durationMs = DAMAGE_FLASH_DURATION_MS,
}) {
  if (titleActive || optionsOpen || deathActive) return 0;
  return getTimedFlash(now, startedAt, durationMs);
}

export function createDeathScene({ now, player, world, profileId = 'collapseSplat' }) {
  const profile = DEATH_SCENE_PROFILES[profileId] ?? DEATH_SCENE_PROFILES.collapseSplat;
  const startY = player.y;
  const floorY = (player.groundY ?? world.playerSpawn.y) + 0.22;
  const cameraImpactY = Math.min(floorY, startY - profile.dropDistance);
  return {
    startedAt: now,
    profile,
    cameraStart: {
      x: player.x,
      y: startY,
      z: player.z,
      yaw: player.yaw,
      pitch: player.pitch,
    },
    cameraImpactY,
  };
}

export function getDeathSceneCamera(deathState, fallbackCamera, now) {
  if (!deathState.cameraStart || !deathState.profile) return fallbackCamera;

  const progress = getDeathSceneProgress(deathState, now);
  const profile = deathState.profile;
  const impactProgress = Math.min(1, progress / profile.impactAt);
  const fall = easeInCubic(impactProgress);
  const afterImpact = Math.max(0, (progress - profile.impactAt) / (1 - profile.impactAt));
  const impactBounce = Math.sin(afterImpact * Math.PI * profile.bounceCount)
    * (1 - afterImpact)
    * profile.bounceHeight;
  const finalJiggle = getDeathSceneFinalProgress(deathState, now);
  const finalJiggleStrength = finalJiggle * profile.finalJiggleStrength;
  const cameraJiggleYaw = Math.sin(progress * 122.0) * finalJiggleStrength;
  const cameraJigglePitch = Math.cos(progress * 147.0) * finalJiggleStrength * 0.7;

  return {
    ...deathState.cameraStart,
    y: deathState.cameraStart.y + (deathState.cameraImpactY - deathState.cameraStart.y) * fall + impactBounce,
    yaw: deathState.cameraStart.yaw + cameraJiggleYaw,
    pitch: Math.min(1.28, deathState.cameraStart.pitch + profile.pitchDrop * smoothStep(progress) + cameraJigglePitch),
  };
}

export function getDeathSceneProgress(deathState, now) {
  if (!deathState.active) return 0;
  return clamp((now - deathState.startedAt) / DEATH_RESPAWN_DELAY_MS, 0, 1);
}

export function getDeathSceneFinalProgress(deathState, now) {
  if (!deathState.active || !deathState.profile) return 0;

  const progress = getDeathSceneProgress(deathState, now);
  const start = deathState.profile.finalJiggleStart;
  return smoothStep(clamp((progress - start) / (1 - start), 0, 1));
}

export function getDeathTint(deathState, now) {
  if (!deathState.active) return 0;

  const elapsed = now - deathState.startedAt;
  const progress = getDeathSceneProgress(deathState, now);
  const finalProgress = getDeathSceneFinalProgress(deathState, now);
  const pulse = Math.sin(elapsed * 0.018) * 0.08;
  return clamp(0.32 + smoothStep(progress) * 0.42 + finalProgress * 0.16 + pulse, 0, 0.93);
}

function getTimedFlash(now, startedAt, durationMs) {
  const elapsed = now - startedAt;
  if (elapsed < 0 || elapsed > durationMs) return 0;

  const progress = elapsed / durationMs;
  return (1 - progress) * (1 - progress);
}

function easeInCubic(value) {
  return value * value * value;
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
