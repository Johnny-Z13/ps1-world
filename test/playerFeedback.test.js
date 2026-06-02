import assert from 'node:assert/strict';
import test from 'node:test';

import { createPlayerHealth } from '../src/playerHealth.js';
import {
  DAMAGE_FLASH_DURATION_MS,
  DEATH_RESPAWN_DELAY_MS,
  createDeathScene,
  getDamageFlash,
  getDeathSceneCamera,
  getDeathSceneFinalProgress,
  getDeathSceneProgress,
  getDeathTint,
  getHealthEffectStrength,
  getHealthPickupFlash,
} from '../src/playerFeedback.js';

test('calculates low-health screen pressure only during playable state', () => {
  const safe = getHealthEffectStrength({
    playerHealth: createPlayerHealth(100),
    now: 1000,
  });
  const danger = getHealthEffectStrength({
    playerHealth: createPlayerHealth(20),
    now: 1000,
  });
  const paused = getHealthEffectStrength({
    playerHealth: createPlayerHealth(20),
    now: 1000,
    optionsOpen: true,
  });

  assert.deepEqual(safe, { danger: 0, pulse: 0 });
  assert.equal(danger.danger, 1);
  assert.ok(danger.pulse >= 0);
  assert.ok(danger.pulse <= 1);
  assert.deepEqual(paused, { danger: 0, pulse: 0 });
});

test('calculates damage and pickup flashes from elapsed time', () => {
  assert.equal(getDamageFlash({ now: 1000, startedAt: 1000 }), 1);
  assert.equal(getDamageFlash({ now: 1000 + DAMAGE_FLASH_DURATION_MS + 1, startedAt: 1000 }), 0);
  assert.equal(getDamageFlash({ now: 1000, startedAt: 1000, deathActive: true }), 0);

  assert.equal(getHealthPickupFlash({ now: 2000, startedAt: 2000 }), 1);
  assert.equal(getHealthPickupFlash({ now: 4000, startedAt: 2000 }), 0);
});

test('creates and advances death scene camera feedback deterministically', () => {
  const player = {
    x: 2,
    y: 1.45,
    z: -3,
    yaw: 0.25,
    pitch: -0.1,
    groundY: 0,
  };
  const world = {
    playerSpawn: { y: 1.45 },
  };
  const scene = createDeathScene({ now: 5000, player, world });
  const deathState = {
    active: true,
    startedAt: scene.startedAt,
    profile: scene.profile,
    cameraStart: scene.cameraStart,
    cameraImpactY: scene.cameraImpactY,
  };
  const halfCamera = getDeathSceneCamera(deathState, player, 5000 + DEATH_RESPAWN_DELAY_MS / 2);
  const finalCamera = getDeathSceneCamera(deathState, player, 5000 + DEATH_RESPAWN_DELAY_MS);

  assert.equal(scene.cameraStart.x, player.x);
  assert.equal(scene.cameraImpactY, 0.22);
  assert.equal(getDeathSceneProgress(deathState, 5000), 0);
  assert.equal(getDeathSceneProgress(deathState, 5000 + DEATH_RESPAWN_DELAY_MS), 1);
  assert.ok(halfCamera.y < player.y);
  assert.ok(finalCamera.pitch > player.pitch);
  assert.ok(getDeathSceneFinalProgress(deathState, 5000 + DEATH_RESPAWN_DELAY_MS) > 0.99);
  assert.ok(getDeathTint(deathState, 5000 + DEATH_RESPAWN_DELAY_MS) > getDeathTint(deathState, 5000));
});
