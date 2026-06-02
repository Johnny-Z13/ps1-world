import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSurfaceProfile,
  getSurfaceAtPlayer,
} from '../src/surfaceRuntime.js';

test('creates surface profiles from GLB material metadata', () => {
  const world = {
    levelAsset: {
      materials: [
        { textureId: 'metal-grate', surfaceType: 'metal', footstepSoundId: 'metal_step', wet: false },
        { textureId: 'water-floor', level_surface: 'water', splashSoundId: 'water_splash', wet: true },
      ],
    },
  };

  const profile = createSurfaceProfile(world);

  assert.equal(profile.byType.get('metal').footstepSoundId, 'metal_step');
  assert.equal(profile.byType.get('water').splashSoundId, 'water_splash');
  assert.equal(profile.byTextureId.get('water-floor').wet, true);
});

test('falls back to default surface when no walkable material match exists', () => {
  const surface = getSurfaceAtPlayer({ byType: new Map(), byTextureId: new Map() }, { x: 0, y: 0, z: 0 }, []);

  assert.deepEqual(surface, {
    surfaceType: 'default',
    wet: false,
    friction: 1,
    damagePerSecond: 0,
  });
});

test('uses walkable surface metadata under the player when present', () => {
  const profile = createSurfaceProfile({
    levelAsset: {
      materials: [
        { textureId: 'metal-grate', surfaceType: 'metal', footstepSoundId: 'metal_step', wet: false },
      ],
    },
  });
  const walkableSurfaces = [
    { minX: -2, maxX: 2, minZ: -2, maxZ: 2, topY: 0, surfaceType: 'metal' },
  ];

  const surface = getSurfaceAtPlayer(profile, { x: 0, y: 0, z: 0 }, walkableSurfaces);

  assert.equal(surface.surfaceType, 'metal');
  assert.equal(surface.footstepSoundId, 'metal_step');
});
