import { getEnemyDefinition } from './enemyCatalog.js';

export function chooseEnemyAnimation(enemy, model, options = {}) {
  if (!model?.animations?.length) return null;

  const enemyType = enemy?.enemyType ?? 'zombie';
  const definition = getEnemyDefinition(enemyType);
  const state = enemy?.state ?? 'chase';

  if (enemyType === 'molten-sentinel') {
    if (state === 'attack') {
      return findPreferredAnimationName(model, definition.animation.attackNames)
        ?? findNonPreferredAnimationName(model, definition.animation.locomotionNames)
        ?? model.animations[0].name;
    }
    if (state === 'idle') {
      return findPreferredAnimationName(model, ['Idle']) ?? model.animations[0].name;
    }
    return findPreferredAnimationName(model, definition.animation.locomotionNames) ?? model.animations[0].name;
  }

  if (enemyType === 'one-eye-alien') {
    const attackName = findPreferredAnimationName(model, definition.animation.attackNames);
    if (state === 'attack' && attackName) return attackName;

    const normalizedAttackNames = definition.animation.attackNames.map(normalizeAnimationName);
    const ambientClips = model.animations.filter((animation) => (
      !normalizedAttackNames.includes(normalizeAnimationName(animation.name))
    ));
    if (!ambientClips.length) return model.animations[0].name;

    const time = options.time ?? 0;
    const seed = enemy?.animationSeed ?? 0;
    const index = Math.floor((time + seed * 9) / 5) % ambientClips.length;
    return ambientClips[index].name;
  }

  return model.animations[0].name;
}

function findPreferredAnimationName(model, preferredNames) {
  const normalizedPreferred = preferredNames.map(normalizeAnimationName);
  const animation = model.animations.find((clip) => normalizedPreferred.includes(normalizeAnimationName(clip.name)));
  return animation?.name ?? null;
}

function findNonPreferredAnimationName(model, excludedNames) {
  const normalizedExcluded = excludedNames.map(normalizeAnimationName);
  const animation = model.animations.find((clip) => !normalizedExcluded.includes(normalizeAnimationName(clip.name)));
  return animation?.name ?? null;
}

function normalizeAnimationName(name) {
  return String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
