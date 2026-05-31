import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inflateSync } from 'node:zlib';

import { LEVEL_GLB_URLS, parseLevelGlb } from '../src/levelGlb.js';
import { SCENE_DEFINITIONS, createSceneWorld } from '../src/world.js';

function readLevel(id) {
  const file = readFileSync(new URL(`../assets/models/levels/${id}.glb`, import.meta.url));
  return parseLevelGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
}

test('maps every selectable scene to a Blender-authored GLB', () => {
  assert.deepEqual(
    Object.keys(LEVEL_GLB_URLS),
    SCENE_DEFINITIONS.map((scene) => scene.id),
  );
  assert.equal(LEVEL_GLB_URLS.dungeon, './assets/models/levels/dungeon.glb?v=4');
});

test('parses level GLB art, collision, walkable, and marker roles', () => {
  const level = readLevel('dungeon');

  assert.equal(level.id, 'dungeon');
  assert.ok(level.artMeshes.length >= 40);
  assert.ok(level.collision.length >= 30);
  assert.ok(level.walkableSurfaces.length >= 30);
  assert.equal(level.zombieSpawns.length, 3);
  assert.equal(level.healthPotions.length, 3);
  assert.equal(level.damageZones.length, 1);
  assert.equal(level.lights.length, 4);
  assert.equal(level.torchLights.length, 3);
  assert.equal(level.killY, -8);
});

test('converts Blender GLB coordinates back to game coordinates', () => {
  const level = readLevel('dungeon');
  const playerSpawn = level.playerSpawn;
  const northWall = level.collision.find((collider) => collider.name.includes('north_wall_a'));
  const floor = level.walkableSurfaces.find((surface) => surface.name === 'WALKABLE_dungeon_floor');

  assert.deepEqual(playerSpawn, { x: -9.5, y: 1.45, z: 9.5, yaw: 2.35 });
  assert.equal(round(northWall.minZ), -12);
  assert.equal(round(northWall.maxZ), -11.6);
  assert.equal(round(floor.topY), 0);
});

test('all exported level GLBs contain game-authoring roles', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const level = readLevel(definition.id);

    assert.equal(level.id, definition.id);
    assert.ok(level.artMeshes.length > 0, `${definition.id} has art meshes`);
    assert.ok(level.collision.length > 0, `${definition.id} has collision meshes`);
    assert.ok(level.walkableSurfaces.length > 0, `${definition.id} has walkable meshes`);
    assert.ok(level.playerSpawn, `${definition.id} has a player spawn`);
  }
});

test('exported gameplay collision and walkable roles match procedural scene rules', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const scene = createSceneWorld(definition.id);
    const level = readLevel(definition.id);
    const expectedCollisionCount = scene.walls.length + scene.crates.length + (scene.platforms ?? []).length;
    const expectedWalkableCount = (scene.floorPieces ?? [scene.floor]).length
      + scene.walls.length
      + scene.crates.length
      + (scene.platforms ?? []).length;

    assert.equal(level.collision.length, expectedCollisionCount, `${definition.id} collision count`);
    assert.equal(level.walkableSurfaces.length, expectedWalkableCount, `${definition.id} walkable count`);
    assert.ok(!level.collision.some((mesh) => mesh.name.includes('_ceiling')), `${definition.id} ceiling is not collision`);
    assert.ok(!level.walkableSurfaces.some((mesh) => mesh.name.includes('_ceiling')), `${definition.id} ceiling is not walkable`);
  }
});

test('exported level GLBs keep procedural special-effect art meshes', () => {
  const neon = readLevel('neon-backstreets');
  const temple = readLevel('sunken-temple');
  const rotwood = readLevel('rotwood-forest');

  assert.ok(hasMaterialMesh(neon, 'LEVELMAT_lightning'), 'neon-backstreets exports lightning bolt geometry');
  assert.ok(hasMaterialMesh(temple, 'LEVELMAT_rain'), 'sunken-temple exports rain drop geometry');
  assert.ok(hasMaterialMesh(rotwood, 'LEVELMAT_paleMoon'), 'rotwood-forest exports the moving moon billboard');
});

test('health pickup markers keep render dimensions and pickup motion', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const level = readLevel(definition.id);

    for (const potion of level.healthPotions) {
      assert.equal(potion.texture, 'healthPotion', `${definition.id} health potion texture`);
      assert.equal(potion.mesh, 'health-flask', `${definition.id} health potion mesh`);
      assert.equal(potion.motion, 'pickup-bob', `${definition.id} health potion motion`);
      assert.ok(potion.width > 0, `${definition.id} health potion width`);
      assert.ok(potion.depth > 0, `${definition.id} health potion depth`);
      assert.ok(potion.height > 0, `${definition.id} health potion height`);
      assert.ok(potion.radius > 0, `${definition.id} health potion radius`);
    }
  }
});

test('damage zone markers keep lava material gameplay metadata', () => {
  const dungeon = readLevel('dungeon');
  const lavaZone = dungeon.damageZones.find((zone) => zone.surfaceType === 'lava');

  assert.ok(lavaZone, 'dungeon exports a lava damage zone');
  assert.match(lavaZone.name, /lava/);
  assert.ok(lavaZone.width > 0);
  assert.ok(lavaZone.depth > 0);
  assert.ok(lavaZone.height > 0);
  assert.ok(lavaZone.damagePerSecond > 0);
});

test('art mesh metadata preserves texture ids and animation motion', () => {
  const dungeon = readLevel('dungeon');
  const rotwood = readLevel('rotwood-forest');
  const motel = readLevel('motel-mirage');

  assert.ok(dungeon.artMeshes.some((mesh) => mesh.textureId === 'torchFlame' && mesh.motion === 'torch-flame'));
  assert.ok(rotwood.artMeshes.some((mesh) => mesh.textureId === 'fallingLeaf' && mesh.motion === 'falling-leaf'));
  assert.ok(motel.artMeshes.some((mesh) => mesh.textureId === 'motelWindow' && mesh.motion === 'window-pulse'));
});

test('large exported level surfaces keep world-scale texture repeats', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const level = readLevel(definition.id);
    const largeMeshes = level.artMeshes.filter((mesh) => {
      const bounds = meshBounds(mesh);
      const spans = [
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY,
        bounds.maxZ - bounds.minZ,
      ].sort((a, b) => a - b);
      const horizontalSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
      return horizontalSpan >= 8 && spans[0] > 0.02 && spans[1] > 0.02;
    });

    assert.ok(largeMeshes.length > 0, `${definition.id} has large level surfaces`);
    for (const mesh of largeMeshes) {
      const bounds = meshBounds(mesh);
      const uv = uvBounds(mesh);
      const horizontalSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
      const uvSpan = Math.max(uv.maxU - uv.minU, uv.maxV - uv.minV);

      assert.ok(
        uvSpan >= horizontalSpan / 4,
        `${definition.id} ${mesh.name} UV span ${uvSpan} is too small for ${horizontalSpan} world units`,
      );
    }
  }
});

test('exported box UV density matches the pre-GLB procedural renderer', () => {
  const dungeon = readLevel('dungeon');

  assert.ok(
    Math.abs(medianUvWorldRatio(findArtMesh(dungeon, 'ART_dungeon_floor')) - 0.4) < 0.02,
    'floor UV density matches old floor uvScale 2.5',
  );
  assert.ok(
    Math.abs(medianUvWorldRatio(findArtMesh(dungeon, 'ART_dungeon_north_wall_a')) - 1) < 0.02,
    'wall UV density matches old wall uvScale 1.0',
  );
  assert.ok(
    Math.abs(medianUvWorldRatio(findArtMesh(dungeon, 'ART_dungeon_crate_8_8_8_5')) - 1) < 0.02,
    'crate UV density matches old crate uvScale 1.0',
  );
  assert.ok(
    Math.abs(medianUvWorldRatio(findArtMesh(dungeon, 'ART_dungeon_ceiling')) - 0.5) < 0.02,
    'ceiling UV density matches old ceiling uvScale 2.0',
  );
});

function hasMaterialMesh(level, materialName) {
  const materialIndex = level.materials.findIndex((material) => material.name === materialName);
  assert.notEqual(materialIndex, -1, `${level.id} has ${materialName}`);
  return level.artMeshes.some((mesh) => mesh.material === materialIndex);
}

function findArtMesh(level, name) {
  const mesh = level.artMeshes.find((item) => item.name === name);
  assert.ok(mesh, `${level.id} has ${name}`);
  return mesh;
}

function medianUvWorldRatio(mesh) {
  const ratios = [];
  for (let index = 0; index < mesh.vertices.length; index += 3) {
    const tri = mesh.vertices.slice(index, index + 3);
    for (const [a, b] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]]) {
      const worldDistance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      const uvDistance = Math.hypot(a.u - b.u, a.v - b.v);
      if (worldDistance > 0.2 && uvDistance > 0.01) {
        ratios.push(uvDistance / worldDistance);
      }
    }
  }
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length / 2)];
}

test('sprite textures preserve alpha masks for stars and suns', () => {
  const level = readLevel('alien-landscape');
  const sun = decodePngTexture(findMaterial(level, 'LEVELMAT_sun'));
  const star = decodePngTexture(findMaterial(level, 'LEVELMAT_star'));
  const shootingStar = decodePngTexture(findMaterial(level, 'LEVELMAT_shootingStar'));

  assert.equal(alphaAt(sun, 0, 0), 0, 'sun corner is transparent');
  assert.ok(alphaAt(sun, 32, 32) > 220, 'sun center is opaque');
  assert.equal(alphaAt(star, 0, 0), 0, 'star corner is transparent');
  assert.ok(alphaAt(star, 32, 32) > 220, 'star center is opaque');
  assert.equal(alphaAt(shootingStar, 0, 0), 0, 'shooting star corner is transparent');
  assert.ok(alphaAt(shootingStar, 50, 32) > 180, 'shooting star head is visible');
});

function findMaterial(level, name) {
  const material = level.materials.find((item) => item.name === name);
  assert.ok(material?.texture?.bytes, `${name} has embedded texture bytes`);
  return material;
}

function decodePngTexture(material) {
  const bytes = material.texture.bytes;
  assert.equal(material.texture.mimeType, 'image/png');
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes[1], 0x50);

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (offset < bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'IHDR') {
      width = readUint32(bytes, dataStart);
      height = readUint32(bytes, dataStart + 4);
      colorType = bytes[dataStart + 9];
    } else if (type === 'IDAT') {
      idat.push(...bytes.slice(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  assert.equal(colorType, 6, `${material.name} uses RGBA PNG data`);
  const inflated = inflateSync(Buffer.from(idat));
  const stride = width * 4;
  const pixels = new Uint8Array(width * height * 4);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[sourceOffset + x];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      pixels[y * stride + x] = unfilterByte(filter, raw, left, up, upLeft);
    }
    sourceOffset += stride;
  }

  return { width, height, pixels };
}

function unfilterByte(filter, raw, left, up, upLeft) {
  if (filter === 0) return raw;
  if (filter === 1) return (raw + left) & 0xff;
  if (filter === 2) return (raw + up) & 0xff;
  if (filter === 3) return (raw + Math.floor((left + up) / 2)) & 0xff;
  if (filter === 4) return (raw + paeth(left, up, upLeft)) & 0xff;
  throw new Error(`Unsupported PNG filter: ${filter}`);
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function alphaAt(image, x, y) {
  return image.pixels[(y * image.width + x) * 4 + 3];
}

function readUint32(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function meshBounds(mesh) {
  return mesh.vertices.reduce((bounds, vertex) => ({
    minX: Math.min(bounds.minX, vertex.x),
    maxX: Math.max(bounds.maxX, vertex.x),
    minY: Math.min(bounds.minY, vertex.y),
    maxY: Math.max(bounds.maxY, vertex.y),
    minZ: Math.min(bounds.minZ, vertex.z),
    maxZ: Math.max(bounds.maxZ, vertex.z),
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  });
}

function uvBounds(mesh) {
  return mesh.vertices.reduce((bounds, vertex) => ({
    minU: Math.min(bounds.minU, vertex.u),
    maxU: Math.max(bounds.maxU, vertex.u),
    minV: Math.min(bounds.minV, vertex.v),
    maxV: Math.max(bounds.maxV, vertex.v),
  }), {
    minU: Infinity,
    maxU: -Infinity,
    minV: Infinity,
    maxV: -Infinity,
  });
}

function round(value) {
  return Math.round(value * 10) / 10;
}
