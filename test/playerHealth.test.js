import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_PLAYER_HEALTH,
  ZOMBIE_BITE_DAMAGE,
  applyPlayerDamage,
  createPlayerHealth,
  getHealthDanger,
  restorePlayerHealth,
} from '../src/playerHealth.js';

test('zombie bites remove 20 health without killing a full-health player', () => {
  const health = createPlayerHealth();

  const damaged = applyPlayerDamage(health, ZOMBIE_BITE_DAMAGE);

  assert.equal(damaged.value, 80);
  assert.equal(damaged.dead, false);
});

test('player dies only after enough bite damage reaches zero health', () => {
  let health = createPlayerHealth();

  for (let i = 0; i < 5; i += 1) {
    health = applyPlayerDamage(health, ZOMBIE_BITE_DAMAGE);
  }

  assert.equal(health.value, 0);
  assert.equal(health.dead, true);
});

test('health potion restores the player to full health', () => {
  const damaged = applyPlayerDamage(createPlayerHealth(), ZOMBIE_BITE_DAMAGE * 3);

  const restored = restorePlayerHealth(damaged);

  assert.equal(restored.value, MAX_PLAYER_HEALTH);
  assert.equal(restored.dead, false);
});

test('health danger ramps up for low and critical health', () => {
  assert.equal(getHealthDanger(createPlayerHealth(100)), 0);
  assert.ok(getHealthDanger(createPlayerHealth(35)) > 0);
  assert.equal(getHealthDanger(createPlayerHealth(20)), 1);
});
