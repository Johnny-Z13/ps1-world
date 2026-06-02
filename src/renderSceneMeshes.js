import { motionCode } from './generatedTextures.js';
import { createBuffer } from './webglResources.js';

export function createSceneMesh(glContext, scene, indices) {
  if (scene.levelAsset) {
    return createLevelMesh(glContext, scene, indices);
  }
  return createWarehouseMesh(glContext, scene, indices);
}

export function createLevelMesh(glContext, scene, indices) {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [], motions: [] };

  for (const mesh of scene.levelAsset.artMeshes) {
    const textureId = indices.get(mesh.textureId) ?? 0;
    const motion = motionCode(mesh.motion);
    for (let index = 0; index < mesh.vertices.length; index += 3) {
      const shade = levelTriangleShade(mesh, index);
      for (const vertex of mesh.vertices.slice(index, index + 3)) {
        geometry.positions.push(vertex.x, vertex.y, vertex.z);
        geometry.uvs.push(vertex.u, vertex.v);
        geometry.textureIds.push(textureId);
        geometry.shades.push(shade);
        geometry.motions.push(motion);
      }
    }
  }

  if (scene.healthPotions) {
    for (const item of scene.healthPotions) {
      addHealthPotionFlask(geometry, item, indices);
    }
  }

  if (scene.warpGate) {
    addWarpGate(geometry, scene.warpGate, indices);
  }

  return createStaticMeshBuffers(glContext, geometry);
}

export function levelTriangleShade(mesh, vertexIndex) {
  if (isBrightLevelTexture(mesh.textureId)) {
    return mesh.textureId === 'lightning' ? 1.3 : 1.18;
  }

  const a = mesh.vertices[vertexIndex];
  const b = mesh.vertices[vertexIndex + 1];
  const c = mesh.vertices[vertexIndex + 2];
  if (!a || !b || !c) return 0.86;

  const normal = triangleNormal(a, b, c);
  if (normal.y > 0.68) return 0.82;
  if (normal.y < -0.68) return 0.42;
  if (Math.abs(normal.x) > Math.abs(normal.z)) return normal.x > 0 ? 0.9 : 0.72;
  return normal.z > 0 ? 0.84 : 0.64;
}

function isBrightLevelTexture(textureId) {
  return textureId === 'star'
    || textureId === 'sun'
    || textureId === 'paleMoon'
    || textureId === 'shootingStar'
    || textureId === 'flickerComet'
    || textureId === 'comet'
    || textureId === 'firefly'
    || textureId === 'moonbeam'
    || textureId === 'torchFlame'
    || textureId === 'lightning'
    || textureId === 'rain';
}

function triangleNormal(a, b, c) {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const normal = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  return {
    x: normal.x / length,
    y: normal.y / length,
    z: normal.z / length,
  };
}

export function createWarehouseMesh(glContext, scene, indices) {
  const geometry = { positions: [], uvs: [], textureIds: [], shades: [], motions: [] };
  const floorPieces = scene.floorPieces ?? [scene.floor];
  for (const floorPiece of floorPieces) {
    addBox(geometry, floorPiece, indices, { floor: true, shade: 0.72, uvScale: 2.5, motion: motionCode(floorPiece.motion) });
  }
  if (scene.ceiling) {
    addBox(geometry, scene.ceiling, indices, { ceiling: true, shade: 0.42, uvScale: 2.0 });
  }

  for (const wall of scene.walls) {
    addBox(geometry, wall, indices, { shade: wall.height < 2 ? 0.72 : 0.88, uvScale: 1.0, motion: motionCode(wall.motion) });
  }

  for (const platform of scene.platforms ?? []) {
    addBox(geometry, platform, indices, { shade: 0.76, uvScale: 1.0, motion: motionCode(platform.motion) });
  }

  for (const crateItem of scene.crates) {
    addBox(geometry, crateItem, indices, { shade: 0.8, uvScale: 1.0, motion: motionCode(crateItem.motion) });
  }

  for (const prop of scene.props ?? []) {
    addBox(geometry, prop, indices, { shade: 0.82, uvScale: 1.0, motion: motionCode(prop.motion) });
  }

  for (const mountainItem of scene.mountains) {
    addMountain(geometry, mountainItem, indices);
  }

  if (scene.cards) {
    for (const item of scene.cards) {
      addCard(geometry, item, indices);
    }
  }

  if (scene.healthPotions) {
    for (const item of scene.healthPotions) {
      addHealthPotionFlask(geometry, item, indices);
    }
  }

  if (scene.warpGate) {
    addWarpGate(geometry, scene.warpGate, indices);
  }

  if (scene.movingBillboards) {
    for (const item of scene.movingBillboards) {
      addCard(geometry, item, indices);
    }
  }

  if (scene.skyDome) {
    // Sky domes replace flat star cards for distant sky.
  } else if (scene.stars) {
    addStars(geometry, scene.stars, indices);
  }

  if (scene.shootingStar) {
    addShootingStar(geometry, scene.shootingStar, indices);
  }

  if (scene.lightning) {
    addLightningBolts(geometry, scene.lightning, indices);
  }

  if (scene.rain) {
    addRain(geometry, scene.rain, indices);
  }

  if (scene.sun) {
    addSun(geometry, scene.sun, indices);
  }

  return createStaticMeshBuffers(glContext, geometry);
}

function createStaticMeshBuffers(glContext, geometry) {
  return {
    count: geometry.positions.length / 3,
    position: createBuffer(glContext, new Float32Array(geometry.positions)),
    uv: createBuffer(glContext, new Float32Array(geometry.uvs)),
    textureId: createBuffer(glContext, new Float32Array(geometry.textureIds)),
    shade: createBuffer(glContext, new Float32Array(geometry.shades)),
    motion: createBuffer(glContext, new Float32Array(geometry.motions)),
  };
}

function addBox(geometry, item, indices, options = {}) {
  const minX = item.x - item.width / 2;
  const maxX = item.x + item.width / 2;
  const minZ = item.z - item.depth / 2;
  const maxZ = item.z + item.depth / 2;
  const minY = item.y;
  const maxY = item.y + item.height;
  const textureId = indices.get(item.texture) ?? 0;
  const shade = options.shade ?? 0.85;
  const uvScale = options.uvScale ?? 1;
  const motion = options.motion ?? 0;

  face(geometry, textureId, shade * 0.92, [
    [minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ],
  ], item.width / uvScale, item.height / uvScale, motion);
  face(geometry, textureId, shade * 0.72, [
    [maxX, minY, minZ], [minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ],
  ], item.width / uvScale, item.height / uvScale, motion);
  face(geometry, textureId, shade * 0.82, [
    [minX, minY, minZ], [minX, minY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ],
  ], item.depth / uvScale, item.height / uvScale, motion);
  face(geometry, textureId, shade, [
    [maxX, minY, maxZ], [maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ],
  ], item.depth / uvScale, item.height / uvScale, motion);
  face(geometry, textureId, shade * 1.08, [
    [minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ], [minX, maxY, minZ],
  ], item.width / uvScale, item.depth / uvScale, motion);
}

function addMountain(geometry, item, indices) {
  const minX = item.x - item.width / 2;
  const maxX = item.x + item.width / 2;
  const minZ = item.z - item.depth / 2;
  const maxZ = item.z + item.depth / 2;
  const baseY = item.y;
  const apex = [item.x, item.y + item.height, item.z - item.depth * 0.08];
  const textureId = indices.get(item.texture) ?? 0;

  triangle(geometry, textureId, 0.82, [minX, baseY, maxZ], [maxX, baseY, maxZ], apex, item.width / 4, item.height / 4);
  triangle(geometry, textureId, 0.62, [maxX, baseY, maxZ], [maxX, baseY, minZ], apex, item.depth / 4, item.height / 4);
  triangle(geometry, textureId, 0.48, [maxX, baseY, minZ], [minX, baseY, minZ], apex, item.width / 4, item.height / 4);
  triangle(geometry, textureId, 0.7, [minX, baseY, minZ], [minX, baseY, maxZ], apex, item.depth / 4, item.height / 4);
}

function addSun(geometry, item, indices) {
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const textureId = indices.get(item.texture) ?? 0;

  face(geometry, textureId, 1.35, [
    [item.x - halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y + halfHeight, item.z],
    [item.x - halfWidth, item.y + halfHeight, item.z],
  ], 1, 1);
}

function addCard(geometry, item, indices) {
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const textureId = indices.get(item.texture) ?? 0;
  face(geometry, textureId, 1.18, [
    [item.x - halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y + halfHeight, item.z],
    [item.x - halfWidth, item.y + halfHeight, item.z],
  ], 1, 1, motionCode(item.motion));
}

function addWarpGate(geometry, item, indices) {
  const textureId = indices.get(item.texture) ?? 0;
  const motion = motionCode(item.motion);
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const y0 = item.y - halfHeight;
  const y1 = item.y + halfHeight;

  face(geometry, textureId, 1.42, [
    [item.x - halfWidth, y0, item.z],
    [item.x + halfWidth, y0, item.z],
    [item.x + halfWidth, y1, item.z],
    [item.x - halfWidth, y1, item.z],
  ], 1, 1, motion);
  face(geometry, textureId, 1.25, [
    [item.x, y0, item.z - halfWidth],
    [item.x, y0, item.z + halfWidth],
    [item.x, y1, item.z + halfWidth],
    [item.x, y1, item.z - halfWidth],
  ], 1, 1, motion);
}

function addHealthPotionFlask(geometry, item, indices) {
  const motion = motionCode(item.motion);
  const baseY = item.y - item.height / 2;
  const depth = item.depth ?? item.width * 0.62;
  const bodyHeight = item.height * 0.62;
  const neckHeight = item.height * 0.22;
  const capHeight = item.height * 0.1;
  const frontZ = item.z - depth / 2 - 0.018;

  addBox(geometry, {
    name: `${item.name} body`,
    x: item.x,
    y: baseY,
    z: item.z,
    width: item.width,
    depth,
    height: bodyHeight,
    texture: item.texture,
  }, indices, { shade: 1.08, uvScale: 1, motion });
  addBox(geometry, {
    name: `${item.name} neck`,
    x: item.x,
    y: baseY + bodyHeight,
    z: item.z,
    width: item.width * 0.42,
    depth: depth * 0.62,
    height: neckHeight,
    texture: item.texture,
  }, indices, { shade: 1.18, uvScale: 1, motion });
  addBox(geometry, {
    name: `${item.name} cap`,
    x: item.x,
    y: baseY + bodyHeight + neckHeight,
    z: item.z,
    width: item.width * 0.56,
    depth: depth * 0.72,
    height: capHeight,
    texture: item.texture,
  }, indices, { shade: 0.72, uvScale: 1, motion });
  addBox(geometry, {
    name: `${item.name} front cross vertical`,
    x: item.x,
    y: baseY + bodyHeight * 0.31,
    z: frontZ,
    width: item.width * 0.13,
    depth: 0.035,
    height: bodyHeight * 0.45,
    texture: item.texture,
  }, indices, { shade: 1.45, uvScale: 1, motion });
  addBox(geometry, {
    name: `${item.name} front cross horizontal`,
    x: item.x,
    y: baseY + bodyHeight * 0.45,
    z: frontZ - 0.002,
    width: item.width * 0.36,
    depth: 0.038,
    height: bodyHeight * 0.12,
    texture: item.texture,
  }, indices, { shade: 1.5, uvScale: 1, motion });
}

function addStars(geometry, stars, indices) {
  const textureId = indices.get('star') ?? 0;

  for (const star of stars) {
    const halfWidth = star.width / 2;
    const halfHeight = star.height / 2;
    face(geometry, textureId, 1.4, [
      [star.x - halfWidth, star.y - halfHeight, star.z],
      [star.x + halfWidth, star.y - halfHeight, star.z],
      [star.x + halfWidth, star.y + halfHeight, star.z],
      [star.x - halfWidth, star.y + halfHeight, star.z],
    ], 1, 1);
  }
}

function addShootingStar(geometry, item, indices) {
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const textureId = indices.get(item.texture) ?? 0;

  face(geometry, textureId, 1.6, [
    [item.x - halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y - halfHeight, item.z],
    [item.x + halfWidth, item.y + halfHeight, item.z],
    [item.x - halfWidth, item.y + halfHeight, item.z],
  ], 1, 1);
}

function addLightningBolts(geometry, lightning, indices) {
  const textureId = indices.get(lightning.texture) ?? 0;

  for (const bolt of lightning.bolts) {
    for (let i = 0; i < bolt.points.length - 1; i += 1) {
      addLightningSegment(geometry, textureId, bolt.points[i], bolt.points[i + 1], bolt.width ?? 0.14);
    }
  }
}

function addLightningSegment(geometry, textureId, start, end, width) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ox = -dy / length * width;
  const oy = dx / length * width;

  face(geometry, textureId, 1.3, [
    [start.x - ox, start.y - oy, start.z],
    [start.x + ox, start.y + oy, start.z],
    [end.x + ox, end.y + oy, end.z],
    [end.x - ox, end.y - oy, end.z],
  ], 1, length / 3);
}

function addRain(geometry, rain, indices) {
  const textureId = indices.get(rain.texture) ?? 0;

  for (const drop of rain.drops) {
    const halfWidth = drop.width / 2;
    const height = drop.height;
    face(geometry, textureId, 1.25, [
      [drop.x - halfWidth, drop.y - height, drop.z],
      [drop.x + halfWidth, drop.y - height, drop.z],
      [drop.x + halfWidth, drop.y, drop.z],
      [drop.x - halfWidth, drop.y, drop.z],
    ], 1, 4);
  }
}

export function face(geometry, textureId, shade, corners, uRepeat, vRepeat, motion = 0) {
  const uv = [[0, vRepeat], [uRepeat, vRepeat], [uRepeat, 0], [0, 0]];
  const order = [0, 1, 2, 0, 2, 3];

  for (const index of order) {
    geometry.positions.push(...corners[index]);
    geometry.uvs.push(...uv[index]);
    geometry.textureIds.push(textureId);
    geometry.shades.push(shade);
    geometry.motions.push(motion);
  }
}

function triangle(geometry, textureId, shade, a, b, c, uRepeat, vRepeat, motion = 0) {
  const corners = [a, b, c];
  const uv = [[0, vRepeat], [uRepeat, vRepeat], [uRepeat * 0.5, 0]];

  for (let index = 0; index < 3; index += 1) {
    geometry.positions.push(...corners[index]);
    geometry.uvs.push(...uv[index]);
    geometry.textureIds.push(textureId);
    geometry.shades.push(shade);
    geometry.motions.push(motion);
  }
}
