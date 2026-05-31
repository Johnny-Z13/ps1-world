export const ENEMY_FACTIONS = Object.freeze({
  player: 'player',
  undead: 'undead',
  alien: 'alien',
  boss: 'boss',
});

export const ENEMY_TYPES = Object.freeze({
  zombie: Object.freeze({
    id: 'zombie',
    faction: ENEMY_FACTIONS.undead,
    base: Object.freeze({
      health: 30,
      attackDamage: 20,
      speed: 1.15,
      radius: 0.38,
      attackRange: 0.78,
      attackCooldownMs: 1150,
    }),
    targeting: Object.freeze({
      hostileFactions: Object.freeze([ENEMY_FACTIONS.player, ENEMY_FACTIONS.alien]),
      secondaryTargetRange: 3.2,
    }),
    render: Object.freeze({
      modelScale: 1.75,
      frontRotation: -Math.PI / 2,
    }),
    animation: Object.freeze({
      locomotionNames: Object.freeze([]),
      attackNames: Object.freeze([]),
    }),
  }),
  'one-eye-alien': Object.freeze({
    id: 'one-eye-alien',
    faction: ENEMY_FACTIONS.alien,
    base: Object.freeze({
      health: 42,
      attackDamage: 18,
      speed: 0.95,
      radius: 0.45,
      attackRange: 1.1,
      attackCooldownMs: 1250,
    }),
    targeting: Object.freeze({
      hostileFactions: Object.freeze([ENEMY_FACTIONS.player, ENEMY_FACTIONS.undead]),
      secondaryTargetRange: 4.4,
    }),
    render: Object.freeze({
      modelScale: 1.45,
      frontRotation: -Math.PI / 2,
    }),
    animation: Object.freeze({
      locomotionNames: Object.freeze([]),
      attackNames: Object.freeze(['Attack']),
    }),
  }),
  'molten-sentinel': Object.freeze({
    id: 'molten-sentinel',
    faction: ENEMY_FACTIONS.boss,
    base: Object.freeze({
      health: 180,
      attackDamage: 45,
      speed: 0.82,
      radius: 0.58,
      attackRange: 2.25,
      attackCooldownMs: 1450,
    }),
    targeting: Object.freeze({
      hostileFactions: Object.freeze([
        ENEMY_FACTIONS.player,
        ENEMY_FACTIONS.undead,
        ENEMY_FACTIONS.alien,
      ]),
      secondaryTargetRange: 5.5,
    }),
    render: Object.freeze({
      modelScale: 2.05,
      frontRotation: -Math.PI / 2,
    }),
    animation: Object.freeze({
      locomotionNames: Object.freeze(['Running', 'Run', 'Walk', 'Locomotion']),
      attackNames: Object.freeze(['Attack', 'Attacking', 'Confused_Scratch', 'Scratch', 'Punch', 'Hit']),
    }),
  }),
});

export function getEnemyDefinition(enemyType = 'zombie') {
  return ENEMY_TYPES[enemyType] ?? ENEMY_TYPES.zombie;
}

export function applyEnemyDifficulty(enemyType = 'zombie', difficulty = 1) {
  const definition = getEnemyDefinition(enemyType);
  const tier = Math.max(0, Number.isFinite(difficulty) ? difficulty : 1);
  const healthScale = 1 + tier * 0.18;
  const damageScale = 1 + tier * 0.12;
  const speedScale = 1 + tier * 0.035;

  return {
    health: Math.round(definition.base.health * healthScale),
    attackDamage: Math.round(definition.base.attackDamage * damageScale),
    speed: roundStat(definition.base.speed * speedScale),
    radius: definition.base.radius,
    attackRange: definition.base.attackRange,
    attackCooldownMs: definition.base.attackCooldownMs,
  };
}

export function createLevelEncounterConfig(world) {
  const override = world.enemyEncounter ?? {};
  return {
    difficulty: override.difficulty ?? 1,
    allowedTypes: override.allowedTypes ?? Object.keys(ENEMY_TYPES),
    boss: override.boss ?? null,
  };
}

function roundStat(value) {
  return Math.round(value * 1000) / 1000;
}
