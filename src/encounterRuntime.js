export function createEncounterState(world = {}) {
  return {
    fired: Object.fromEntries(
      getEnabledTriggers(world)
        .filter((trigger) => trigger.oneShot && trigger.fired)
        .map((trigger) => [getTriggerId(trigger), true]),
    ),
  };
}

export function updateEncounterState(world = {}, state = createEncounterState(world), player = {}, now = 0) {
  const fired = { ...(state.fired ?? {}) };
  const actions = [];

  for (const trigger of getEnabledTriggers(world)) {
    const triggerId = getTriggerId(trigger);
    if (trigger.oneShot && fired[triggerId]) continue;
    if (!isInsideTrigger(player, trigger)) continue;

    actions.push(createEncounterAction(trigger, triggerId));
    if (trigger.oneShot) fired[triggerId] = true;
  }

  return {
    state: { fired, lastCheckedAt: now },
    actions,
  };
}

function getEnabledTriggers(world) {
  return (world.encounterTriggers ?? []).filter((trigger) => trigger?.enabled !== false);
}

function createEncounterAction(trigger, triggerId) {
  return {
    type: trigger.encounterType ?? trigger.triggerType ?? 'set_piece',
    triggerId,
    maxAlive: trigger.maxAlive,
    pulseIntervalMs: trigger.pulseIntervalMs,
    soundId: trigger.soundId,
  };
}

function getTriggerId(trigger) {
  return String(trigger.id ?? trigger.triggerId ?? trigger.targetId ?? trigger.encounterType ?? 'encounter');
}

function isInsideTrigger(player, trigger) {
  if (!Number.isFinite(trigger.x) || !Number.isFinite(trigger.z)) return false;

  const width = Number(trigger.width ?? trigger.radius ?? 0);
  const depth = Number(trigger.depth ?? trigger.radius ?? 0);
  const height = Number(trigger.height ?? 2);
  const halfWidth = width > 0 ? width / 2 : 1;
  const halfDepth = depth > 0 ? depth / 2 : 1;
  const halfHeight = height > 0 ? height / 2 : 1;

  return Math.abs((player.x ?? 0) - trigger.x) <= halfWidth
    && Math.abs((player.z ?? 0) - trigger.z) <= halfDepth
    && Math.abs((player.y ?? trigger.y ?? 0) - (trigger.y ?? player.y ?? 0)) <= halfHeight;
}
