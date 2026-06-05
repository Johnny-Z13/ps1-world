import { PLAYER_EYE_HEIGHT } from './playerPhysics.js';

export function createSceneCollectibles(scene) {
  return (scene.collectibles ?? []).map((item) => ({ ...item }));
}

export function updateCollectibles(_world, collectibles, player) {
  const picked = [];
  const remaining = [];

  for (const item of collectibles) {
    if (isPlayerTouchingCollectible(player, item)) {
      picked.push(item);
    } else {
      remaining.push(item);
    }
  }

  return {
    picked,
    remaining,
    collectedIds: picked.map((item) => item.collectibleId).filter(Boolean),
    noticeText: picked.length ? getCollectibleNoticeText(picked[picked.length - 1]) : null,
  };
}

function isPlayerTouchingCollectible(player, item) {
  const radius = item.radius ?? 0.72;
  const height = item.height ?? 1;
  const centerY = item.y ?? height / 2;
  const feetY = player.y - PLAYER_EYE_HEIGHT;

  return Math.hypot(player.x - item.x, player.z - item.z) <= radius
    && Math.abs(feetY - (centerY - height / 2)) <= Math.max(1.2, height);
}

function getCollectibleNoticeText(item) {
  if (item.label) return item.label;
  const name = item.collectibleType ?? item.name ?? 'artifact';
  return `You found the ${name}.`;
}
