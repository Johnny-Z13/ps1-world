import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENEMY_FACTIONS,
  ENEMY_TYPES,
  applyEnemyDifficulty,
  createLevelEncounterConfig,
  getEnemyDefinition,
} from '../src/enemyCatalog.js';

test('defines enemies as data with factions, stats, and targeting rules', () => {
  assert.equal(ENEMY_TYPES.zombie.faction, ENEMY_FACTIONS.undead);
  assert.equal(ENEMY_TYPES['one-eye-alien'].faction, ENEMY_FACTIONS.alien);
  assert.equal(ENEMY_TYPES['molten-sentinel'].faction, ENEMY_FACTIONS.boss);

  assert.ok(ENEMY_TYPES.zombie.base.health > 0);
  assert.notEqual(ENEMY_TYPES['one-eye-alien'].base.speed, ENEMY_TYPES.zombie.base.speed);
  assert.ok(ENEMY_TYPES['molten-sentinel'].base.attackDamage > ENEMY_TYPES.zombie.base.attackDamage);
  assert.ok(ENEMY_TYPES.zombie.render.modelScale > 0);
  assert.ok(ENEMY_TYPES['molten-sentinel'].render.modelScale > ENEMY_TYPES.zombie.render.modelScale);
  assert.deepEqual(ENEMY_TYPES['molten-sentinel'].animation.locomotionNames, ['Running', 'Run', 'Walk', 'Locomotion']);
  assert.ok(ENEMY_TYPES['molten-sentinel'].animation.attackNames.includes('Attack'));
  assert.deepEqual(ENEMY_TYPES['molten-sentinel'].targeting.hostileFactions, [
    ENEMY_FACTIONS.player,
    ENEMY_FACTIONS.undead,
    ENEMY_FACTIONS.alien,
  ]);
});

test('difficulty scaling changes enemy stats without mutating catalog definitions', () => {
  const baseZombie = getEnemyDefinition('zombie');
  const easyZombie = applyEnemyDifficulty('zombie', 0);
  const hardZombie = applyEnemyDifficulty('zombie', 3);

  assert.ok(hardZombie.health > easyZombie.health);
  assert.ok(hardZombie.attackDamage > easyZombie.attackDamage);
  assert.ok(hardZombie.speed > easyZombie.speed);
  assert.equal(baseZombie.base.health, ENEMY_TYPES.zombie.base.health);
});

test('creates a level encounter config with defaults and world overrides', () => {
  const defaultConfig = createLevelEncounterConfig({ id: 'dungeon' });
  const hardConfig = createLevelEncounterConfig({
    id: 'boss-room',
    enemyEncounter: {
      difficulty: 3,
      allowedTypes: ['zombie', 'molten-sentinel'],
      boss: 'molten-sentinel',
    },
  });

  assert.equal(defaultConfig.difficulty, 1);
  assert.ok(defaultConfig.allowedTypes.includes('one-eye-alien'));
  assert.equal(hardConfig.difficulty, 3);
  assert.deepEqual(hardConfig.allowedTypes, ['zombie', 'molten-sentinel']);
  assert.equal(hardConfig.boss, 'molten-sentinel');
});
