const DEFAULT_SURFACE = Object.freeze({
  surfaceType: 'default',
  wet: false,
  friction: 1,
  damagePerSecond: 0,
});

export function createSurfaceProfile(world = {}) {
  const byType = new Map();
  const byTextureId = new Map();

  for (const material of world.levelAsset?.materials ?? []) {
    const surface = normalizeSurface(material);
    if (surface.surfaceType !== DEFAULT_SURFACE.surfaceType) byType.set(surface.surfaceType, surface);
    if (material.textureId) byTextureId.set(material.textureId, surface);
  }

  return { byType, byTextureId };
}

export function getSurfaceAtPlayer(profile = createSurfaceProfile(), player = {}, walkableSurfaces = []) {
  const walkable = getWalkableUnderPlayer(player, walkableSurfaces);
  if (!walkable) return { ...DEFAULT_SURFACE };

  const surfaceType = walkable.surfaceType ?? walkable.level_surface;
  const textureId = walkable.textureId;
  if (textureId && profile.byTextureId?.has(textureId)) return { ...profile.byTextureId.get(textureId) };
  if (surfaceType && profile.byType?.has(surfaceType)) return { ...profile.byType.get(surfaceType) };
  if (surfaceType) return { ...DEFAULT_SURFACE, surfaceType };
  return { ...DEFAULT_SURFACE };
}

function getWalkableUnderPlayer(player, walkableSurfaces) {
  return walkableSurfaces
    .filter((surface) => (
      (player.x ?? 0) >= surface.minX
      && (player.x ?? 0) <= surface.maxX
      && (player.z ?? 0) >= surface.minZ
      && (player.z ?? 0) <= surface.maxZ
    ))
    .sort((a, b) => (b.topY ?? -Infinity) - (a.topY ?? -Infinity))[0] ?? null;
}

function normalizeSurface(source) {
  return {
    ...DEFAULT_SURFACE,
    surfaceType: source.surfaceType ?? source.level_surface ?? DEFAULT_SURFACE.surfaceType,
    footstepSoundId: source.footstepSoundId,
    splashSoundId: source.splashSoundId,
    damagePerSecond: Number(source.damagePerSecond ?? DEFAULT_SURFACE.damagePerSecond),
    friction: Number(source.friction ?? DEFAULT_SURFACE.friction),
    wet: Boolean(source.wet ?? DEFAULT_SURFACE.wet),
  };
}
