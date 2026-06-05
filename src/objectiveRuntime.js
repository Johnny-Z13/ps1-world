const DEFAULT_OBJECTIVE_RADIUS = 1.2;

export function createObjectiveState(world = {}) {
  const progress = {};
  for (const objective of getEnabledObjectives(world)) {
    progress[getObjectiveKey(objective)] = {
      count: 0,
      completed: false,
      completedAt: null,
    };
  }
  return { progress };
}

export function updateObjectiveState(world = {}, state = createObjectiveState(world), player = {}, now = 0, event = null) {
  const progress = { ...(state.progress ?? {}) };
  const completed = [];

  for (const objective of getEnabledObjectives(world)) {
    const key = getObjectiveKey(objective);
    const current = progress[key] ?? { count: 0, completed: false, completedAt: null };
    if (current.completed) {
      progress[key] = current;
      continue;
    }

    const shouldAdvance = event?.objectiveId === key || isPlayerInsideObjective(player, objective);
    if (!shouldAdvance) {
      progress[key] = current;
      continue;
    }

    const countRequired = Math.max(1, Number(objective.countRequired ?? 1));
    const count = Math.min(countRequired, current.count + 1);
    const next = {
      count,
      completed: count >= countRequired,
      completedAt: count >= countRequired ? now : null,
    };
    progress[key] = next;
    if (next.completed) completed.push(objective);
  }

  return {
    state: { progress },
    completed,
  };
}

export function isRogueGateUnlocked(world = {}, state = createObjectiveState(world)) {
  return getRequiredRogueObjectives(world).every((objective) => {
    const progress = state.progress?.[getObjectiveKey(objective)];
    return progress?.completed === true;
  });
}

export function getObjectiveHudText(world = {}, state = createObjectiveState(world), mode = 'normal') {
  const objectives = mode === 'rogue' ? getRequiredRogueObjectives(world) : getEnabledObjectives(world);
  if (!objectives.length) return '';
  if (mode === 'rogue' && isRogueGateUnlocked(world, state)) return 'RITUAL COMPLETE';

  const objective = objectives.find((item) => !state.progress?.[getObjectiveKey(item)]?.completed) ?? objectives[0];
  const progress = state.progress?.[getObjectiveKey(objective)] ?? { count: 0 };
  const countRequired = Math.max(1, Number(objective.countRequired ?? 1));
  const label = String(objective.label ?? objective.objectiveType ?? objective.objectiveId ?? 'ritual').toUpperCase();
  if (countRequired > 1) return `${label} ${Math.min(progress.count ?? 0, countRequired)}/${countRequired}`;
  return label;
}

function getEnabledObjectives(world) {
  return (world.objectives ?? []).filter((objective) => objective?.enabled !== false);
}

function getRequiredRogueObjectives(world) {
  return getEnabledObjectives(world).filter((objective) => objective.requiredInRogue !== false);
}

function getObjectiveKey(objective) {
  return String(objective.objectiveId ?? objective.id ?? objective.targetId ?? objective.label ?? 'objective');
}

function isPlayerInsideObjective(player, objective) {
  if (!Number.isFinite(objective.x) || !Number.isFinite(objective.z)) return false;

  const radius = Number(objective.radius ?? DEFAULT_OBJECTIVE_RADIUS);
  const distance = Math.hypot((player.x ?? 0) - objective.x, (player.z ?? 0) - objective.z);
  if (distance > radius) return false;

  if (!Number.isFinite(objective.y)) return true;
  const height = Number(objective.height ?? radius * 2);
  return Math.abs((player.y ?? objective.y) - objective.y) <= height / 2;
}
