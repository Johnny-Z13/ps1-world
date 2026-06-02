const ROGUE_RITUAL_LABELS = [
  'FEED THE DOOR',
  'TUNE THE WRONG SIGNAL',
  'COUNT THE DEAD CHANNELS',
  'BLEED THE MAP',
  'WAKE THE HOST',
  'BREAK THE EXIT SIGN',
  'DRINK THE STATIC',
  'OPEN THE BAD ROOM',
  'KILL THE LIGHT',
];

const HORDE_SCENE_BONUS = Object.freeze({
  'alien-landscape': 7,
  'neon-backstreets': 5,
  'rotwood-forest': 8,
  'one-bit-cathedral': 6,
});

export function createRogueStageWorld(world, run, scenes = []) {
  if (!world || !run?.active || run.complete) return world;

  const stageIndex = Math.max(0, run.stageIndex ?? 0);
  const ritual = createRogueRitualObjective(world, stageIndex);
  const horde = createRogueHordeConfig(world, stageIndex);
  const hordeWake = createRogueHordeTrigger(world, ritual, horde);

  return {
    ...world,
    rogueStage: {
      index: stageIndex,
      total: scenes.length,
      ritualObjectiveId: ritual.objectiveId,
    },
    objectives: [
      ...(world.objectives ?? []),
      ritual,
    ],
    encounterTriggers: [
      ...(world.encounterTriggers ?? []),
      hordeWake,
    ],
    enemyEncounter: {
      ...world.enemyEncounter,
      difficulty: Math.max(world.enemyEncounter?.difficulty ?? 1, 1 + Math.floor(stageIndex / 3)),
      horde,
    },
  };
}

function createRogueRitualObjective(world, stageIndex) {
  const anchor = chooseRitualAnchor(world);
  return {
    objectiveId: `${world.id}-rogue-ritual`,
    objectiveType: 'rogue_ritual',
    label: ROGUE_RITUAL_LABELS[stageIndex % ROGUE_RITUAL_LABELS.length],
    requiredInRogue: true,
    countRequired: 1,
    radius: 1.35,
    x: anchor.x,
    y: anchor.y,
    z: anchor.z,
  };
}

function createRogueHordeConfig(world, stageIndex) {
  const base = world.enemyEncounter?.horde ?? {};
  const sceneBonus = HORDE_SCENE_BONUS[world.id] ?? 0;
  const stageBonus = 4 + Math.floor(stageIndex * 1.8);
  const maxAlive = Math.max(
    base.maxAlive ?? 0,
    (world.zombieSpawns?.length ?? 0) + stageBonus + sceneBonus,
  );

  return {
    ...base,
    enabled: true,
    maxAlive,
    pulseIntervalMs: Math.max(2600, Math.min(base.pulseIntervalMs ?? 6200, 6200 - stageIndex * 420 - sceneBonus * 90)),
    minPlayerDistance: Math.max(5.5, (base.minPlayerDistance ?? 7.5) - stageIndex * 0.18),
  };
}

function createRogueHordeTrigger(world, ritual, horde) {
  return {
    id: `${world.id}-rogue-horde-wake`,
    encounterType: 'awaken_horde',
    soundId: 'rogue_horde_wake',
    x: ritual.x,
    y: ritual.y,
    z: ritual.z,
    width: 8,
    depth: 8,
    height: 4,
    oneShot: true,
    maxAlive: horde.maxAlive,
    pulseIntervalMs: horde.pulseIntervalMs,
  };
}

function chooseRitualAnchor(world) {
  const spawn = world.playerSpawn ?? { x: 0, y: 0, z: 0 };
  const gate = world.warpGate ?? spawn;
  const candidates = [
    ...(world.healthPotions ?? []),
    ...(world.enemySpawns ?? []),
    ...(world.zombieSpawns ?? []),
  ]
    .filter((candidate) => Number.isFinite(candidate.x) && Number.isFinite(candidate.z))
    .map((candidate) => ({
      x: candidate.x,
      y: candidate.y ?? spawn.y,
      z: candidate.z,
      score: getDistance2D(candidate, spawn) - getDistance2D(candidate, gate) * 0.18,
    }))
    .filter((candidate) => getDistance2D(candidate, spawn) >= 4);

  return candidates.sort((a, b) => b.score - a.score)[0] ?? {
    x: gate.x,
    y: gate.y ?? spawn.y,
    z: gate.z,
  };
}

function getDistance2D(a, b) {
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.z ?? 0) - (b.z ?? 0));
}
