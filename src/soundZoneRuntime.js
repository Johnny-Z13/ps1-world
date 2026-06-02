const DEFAULT_ZONE_BUS = 'ambience';
const DEFAULT_EMITTER_RADIUS = 8;

export function getActiveSoundZoneDecision(world = {}, player = {}) {
  const candidates = (world.soundZones ?? [])
    .filter((zone) => zone?.enabled !== false)
    .map((zone) => ({ zone, distance: getDistance2D(zone, player) }))
    .filter(({ zone }) => isInsideZone(player, zone))
    .sort((a, b) => getZonePriority(b.zone) - getZonePriority(a.zone) || a.distance - b.distance);

  if (!candidates.length) return null;

  const { zone } = candidates[0];
  return {
    id: getZoneId(zone),
    type: zone.soundZoneType ?? 'ambience',
    soundId: zone.soundId,
    targetBus: zone.targetBus ?? DEFAULT_ZONE_BUS,
    gain: Number(zone.gain ?? 1),
  };
}

export function getActiveEmitterDecisions(world = {}, player = {}) {
  return (world.emitters ?? [])
    .filter((emitter) => emitter?.enabled !== false)
    .filter((emitter) => emitter.soundId)
    .map((emitter) => ({
      id: getEmitterId(emitter),
      type: emitter.emitterType ?? 'ambient',
      soundId: emitter.soundId,
      targetBus: emitter.targetBus ?? DEFAULT_ZONE_BUS,
      gain: Number(emitter.gain ?? 1),
      x: emitter.x,
      y: emitter.y,
      z: emitter.z,
      distance: roundDecisionValue(getDistance2D(emitter, player)),
      radius: Number(emitter.radius ?? DEFAULT_EMITTER_RADIUS),
    }))
    .filter((decision) => Number.isFinite(decision.x) && Number.isFinite(decision.z))
    .filter((decision) => decision.distance <= decision.radius)
    .sort((a, b) => a.distance - b.distance);
}

function isInsideZone(player, zone) {
  if (!Number.isFinite(zone.x) || !Number.isFinite(zone.z)) return false;

  const width = Number(zone.width ?? zone.radius ?? 0);
  const depth = Number(zone.depth ?? zone.radius ?? 0);
  const height = Number(zone.height ?? 2);
  const halfWidth = width > 0 ? width / 2 : 1;
  const halfDepth = depth > 0 ? depth / 2 : 1;
  const halfHeight = height > 0 ? height / 2 : 1;

  return Math.abs((player.x ?? 0) - zone.x) <= halfWidth
    && Math.abs((player.z ?? 0) - zone.z) <= halfDepth
    && Math.abs((player.y ?? zone.y ?? 0) - (zone.y ?? player.y ?? 0)) <= halfHeight;
}

function getZonePriority(zone) {
  if (Number.isFinite(zone.priority)) return Number(zone.priority);
  if (zone.soundZoneType === 'silence') return 3;
  if (zone.soundZoneType === 'radio_bleed') return 2;
  return 1;
}

function getDistance2D(item, player) {
  if (!Number.isFinite(item.x) || !Number.isFinite(item.z)) return Infinity;
  return Math.hypot((player.x ?? 0) - item.x, (player.z ?? 0) - item.z);
}

function getZoneId(zone) {
  return String(zone.id ?? zone.soundZoneId ?? zone.targetId ?? zone.soundZoneType ?? 'sound-zone');
}

function getEmitterId(emitter) {
  return String(emitter.id ?? emitter.emitterId ?? emitter.targetId ?? emitter.emitterType ?? 'emitter');
}

function roundDecisionValue(value) {
  return Math.round(value * 1000) / 1000;
}
