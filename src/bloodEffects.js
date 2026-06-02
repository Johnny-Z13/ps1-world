export const BLOOD_BURST_TEXTURE_ID = 'bloodBurst';
export const BLOOD_BURST_DURATION_MS = 900;
const BLOOD_SHARD_COUNT = 7;

export function createBloodBurst(enemy, now) {
  const radius = enemy.radius ?? 0.4;
  return {
    id: `blood:${enemy.id ?? 'enemy'}:${now}`,
    texture: BLOOD_BURST_TEXTURE_ID,
    startedAt: now,
    durationMs: BLOOD_BURST_DURATION_MS,
    x: roundBurstValue(enemy.x ?? 0),
    y: roundBurstValue((enemy.y ?? 1.45) - 0.25),
    z: roundBurstValue(enemy.z ?? 0),
    shards: Array.from({ length: BLOOD_SHARD_COUNT }, (_, index) => createBloodShard(enemy, index, radius)),
  };
}

export function updateBloodBursts(bursts, now) {
  return bursts.filter((burst) => now - burst.startedAt <= (burst.durationMs ?? BLOOD_BURST_DURATION_MS));
}

function createBloodShard(enemy, index, radius) {
  const seed = hashBurst(`${enemy.id ?? 'enemy'}:${index}`);
  const angle = seed * Math.PI * 2;
  return {
    angle: roundBurstValue(angle),
    distance: roundBurstValue(radius * (0.75 + hashBurst(`${enemy.id}:distance:${index}`) * 1.4)),
    lift: roundBurstValue(0.18 + hashBurst(`${enemy.id}:lift:${index}`) * 0.72),
    size: roundBurstValue(0.16 + hashBurst(`${enemy.id}:size:${index}`) * 0.22),
  };
}

function hashBurst(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function roundBurstValue(value) {
  return Math.round(value * 10000) / 10000;
}
