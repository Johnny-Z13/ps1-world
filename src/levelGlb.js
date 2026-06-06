import { SCENE_DEFINITIONS } from './world.js';

export const LEVEL_GLB_URLS = Object.freeze(Object.fromEntries(
  SCENE_DEFINITIONS.map((scene) => [
    scene.id,
    `./assets/models/levels/${scene.id}.glb?v=14`,
  ]),
));

const COMPONENT_FLOAT = 5126;
const COMPONENT_UNSIGNED_INT = 5125;
const COMPONENT_UNSIGNED_SHORT = 5123;
const COMPONENT_UNSIGNED_BYTE = 5121;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;

const COMPONENT_SIZE = Object.freeze({
  [COMPONENT_FLOAT]: 4,
  [COMPONENT_UNSIGNED_INT]: 4,
  [COMPONENT_UNSIGNED_SHORT]: 2,
  [COMPONENT_UNSIGNED_BYTE]: 1,
});

const TYPE_SIZE = Object.freeze({
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
});

export async function loadLevelGlb(id, url = LEVEL_GLB_URLS[id]) {
  if (!url) {
    throw new Error(`No level GLB registered for scene: ${id}`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load level GLB ${id}: ${response.status}`);
  }

  return parseLevelGlb(await response.arrayBuffer(), id);
}

export function parseLevelGlb(arrayBuffer, expectedId = null) {
  const { json, bin } = readGlb(arrayBuffer);
  const nodes = json.nodes ?? [];
  const roots = json.scenes?.[json.scene ?? 0]?.nodes ?? nodes.map((_, index) => index);
  const materials = readMaterials(json, bin);
  const level = {
    id: expectedId ?? readSceneId(nodes) ?? 'unknown',
    artMeshes: [],
    collision: [],
    walkableSurfaces: [],
    playerSpawn: null,
    zombieSpawns: [],
    enemySpawns: [],
    healthPotions: [],
    collectibles: [],
    damageZones: [],
    hordeTriggers: [],
    encounterTriggers: [],
    soundZones: [],
    objectives: [],
    emitters: [],
    lights: [],
    torchLights: [],
    killY: null,
    materials,
  };

  for (const root of roots) {
    collectNode(level, json, bin, root, identityMat4());
  }

  if (level.killY === null) level.killY = -8;
  return level;
}

function collectNode(level, json, bin, nodeIndex, parentMatrix) {
  const node = json.nodes[nodeIndex];
  if (!node) return;

  const matrix = multiplyMat4(parentMatrix, readNodeMatrix(node));
  const name = node.name ?? '';
  const role = getNodeRole(node);

  if (role === 'art' && node.mesh !== undefined) {
    level.artMeshes.push(...readMeshPrimitives(json, bin, node.mesh, matrix, name, node.extras ?? {}, level.materials));
  } else if (role === 'collision' && node.mesh !== undefined) {
    level.collision.push(readBoundsFromMesh(json, bin, node.mesh, matrix, name));
  } else if (role === 'walkable' && node.mesh !== undefined) {
    level.walkableSurfaces.push(readWalkableSurface(json, bin, node.mesh, matrix, name));
  } else if (role) {
    applyMarker(level, role, name, transformGltfPoint(matrix, [0, 0, 0]), node.extras ?? {});
  }

  for (const childIndex of node.children ?? []) {
    collectNode(level, json, bin, childIndex, matrix);
  }
}

function getNodeRole(node) {
  const extraRole = node.extras?.level_role;
  if (extraRole) return extraRole;

  const name = node.name ?? '';
  if (name.startsWith('ART_')) return 'art';
  if (name.startsWith('COLLISION_')) return 'collision';
  if (name.startsWith('WALKABLE_')) return 'walkable';
  if (name.startsWith('MARKER_')) return name.split('_').slice(2, -1).join('_');
  if (name.startsWith('TRIGGER_')) return getTriggerRoleFromName(name);
  if (name.includes('_EMITTER_')) return 'EMITTER';
  return null;
}

function getTriggerRoleFromName(name) {
  if (name.includes('_EMITTER_')) return 'EMITTER';
  if (name.includes('_OBJECTIVE_TRIGGER_') || name.includes('_OBJECTIVE_')) return 'OBJECTIVE_TRIGGER';
  if (name.includes('_SOUND_ZONE_')) return 'SOUND_ZONE';
  if (name.includes('_ENCOUNTER_TRIGGER_') || name.includes('_ENCOUNTER_')) return 'ENCOUNTER_TRIGGER';
  if (name.includes('_HORDE_TRIGGER_') || name.includes('_HORDE_')) return 'HORDE_TRIGGER';
  if (name.includes('_DAMAGE_ZONE_')) return 'DAMAGE_ZONE';
  return null;
}

function applyMarker(level, role, name, position, extras) {
  const marker = { name, ...position };
  if (role === 'PLAYER_SPAWN') {
    level.playerSpawn = {
      x: roundLevelValue(position.x),
      y: roundLevelValue(position.y),
      z: roundLevelValue(position.z),
      yaw: roundLevelValue(extras.yaw ?? 0),
    };
    return;
  }
  if (role === 'ZOMBIE_SPAWN') {
    level.zombieSpawns.push(marker);
    return;
  }
  if (role === 'ENEMY_SPAWN') {
    level.enemySpawns.push({ ...parseMarkerExtras(extras), ...marker });
    return;
  }
  if (role === 'PICKUP_HEALTH') {
    level.healthPotions.push({ ...parseMarkerExtras(extras), ...marker });
    return;
  }
  if (role === 'PICKUP_COLLECTIBLE' || role.startsWith('PICKUP_COLLECTIBLE_')) {
    level.collectibles.push({ ...parseMarkerExtras(extras), ...marker });
    return;
  }
  if (role === 'DAMAGE_ZONE') {
    level.damageZones.push({ ...marker, ...parseMarkerExtras(extras) });
    return;
  }
  if (role === 'HORDE_TRIGGER') {
    level.hordeTriggers.push({
      ...marker,
      triggerType: 'awaken_horde',
      ...parseMarkerExtras(extras),
    });
    return;
  }
  if (role === 'ENCOUNTER_TRIGGER') {
    level.encounterTriggers.push({
      ...marker,
      encounterType: 'set_piece',
      ...parseMarkerExtras(extras),
    });
    return;
  }
  if (role === 'SOUND_ZONE') {
    level.soundZones.push({
      ...marker,
      soundZoneType: 'ambience',
      ...parseMarkerExtras(extras),
    });
    return;
  }
  if (role === 'OBJECTIVE' || role.startsWith('OBJECTIVE_') || role === 'OBJECTIVE_TRIGGER') {
    level.objectives.push({
      ...marker,
      objectiveType: 'ritual',
      requiredInRogue: true,
      ...parseMarkerExtras(extras),
    });
    return;
  }
  if (role === 'EMITTER' || role.startsWith('EMITTER_')) {
    level.emitters.push({
      ...marker,
      emitterType: 'ambient',
      ...parseMarkerExtras(extras),
    });
    return;
  }
  if (role === 'LIGHT') {
    level.lights.push({ ...parseMarkerExtras(extras), ...marker });
    return;
  }
  if (role === 'TORCH_LIGHT') {
    level.torchLights.push({ ...parseMarkerExtras(extras), ...marker });
    return;
  }
  if (role === 'KILL_PLANE') {
    level.killY = Number(extras.killY ?? position.y);
  }
}

function parseMarkerExtras(extras) {
  const parsed = {};
  for (const [key, value] of Object.entries(extras)) {
    if (key === 'level_role' || key === 'scene_id') continue;
    parsed[key] = parseJsonString(value);
  }
  return parsed;
}

function parseJsonString(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseBoolean(value, fallback = true) {
  const parsed = parseJsonString(value);
  if (typeof parsed === 'boolean') return parsed;
  if (typeof parsed === 'number') return parsed !== 0;
  if (typeof parsed === 'string') {
    const normalized = parsed.trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  }
  return fallback;
}

function readMeshPrimitives(json, bin, meshIndex, matrix, nodeName, extras, materials) {
  const mesh = json.meshes[meshIndex];
  return (mesh?.primitives ?? []).map((primitive, primitiveIndex) => {
    const vertices = readPrimitiveVertices(json, bin, primitive, matrix);
    const material = materials[primitive.material ?? 0];
    return {
      name: primitiveIndex === 0 ? nodeName : `${nodeName}_${primitiveIndex + 1}`,
      material: primitive.material ?? 0,
      textureId: parseJsonString(extras.texture_id) ?? material?.textureId ?? null,
      motion: parseJsonString(extras.motion) ?? null,
      warping: parseBoolean(extras.warping ?? extras.wobble, true),
      collectibleId: parseJsonString(extras.collectibleId) ?? parseJsonString(extras.collectible_id) ?? null,
      vertices,
      vertexCount: vertices.length,
    };
  });
}

function readBoundsFromMesh(json, bin, meshIndex, matrix, name) {
  const points = readMeshPoints(json, bin, meshIndex, matrix);
  const bounds = boundsFromPoints(points);
  return { name, ...bounds };
}

function readWalkableSurface(json, bin, meshIndex, matrix, name) {
  const points = readMeshPoints(json, bin, meshIndex, matrix);
  const bounds = boundsFromPoints(points);
  return {
    name,
    minX: bounds.minX,
    maxX: bounds.maxX,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
    topY: bounds.maxY,
  };
}

function readPrimitiveVertices(json, bin, primitive, matrix) {
  const positionAccessor = primitive.attributes?.POSITION;
  if (positionAccessor === undefined) return [];

  const positions = readAccessor(json, bin, positionAccessor).values;
  const uvs = primitive.attributes.TEXCOORD_0 === undefined
    ? null
    : readAccessor(json, bin, primitive.attributes.TEXCOORD_0).values;
  const indices = primitive.indices === undefined
    ? positions.map((_, index) => index).filter((_, index) => index % 3 === 0).map((_, index) => index)
    : readAccessor(json, bin, primitive.indices).values;
  const vertices = [];

  for (const index of indices) {
    const position = transformGltfPoint(matrix, [
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2],
    ]);
    vertices.push({
      x: roundLevelValue(position.x),
      y: roundLevelValue(position.y),
      z: roundLevelValue(position.z),
      u: uvs ? uvs[index * 2] : 0,
      v: uvs ? uvs[index * 2 + 1] : 0,
    });
  }

  return vertices;
}

function readMeshPoints(json, bin, meshIndex, matrix) {
  const mesh = json.meshes[meshIndex];
  const points = [];

  for (const primitive of mesh?.primitives ?? []) {
    const positionAccessor = primitive.attributes?.POSITION;
    if (positionAccessor === undefined) continue;

    const positions = readAccessor(json, bin, positionAccessor).values;
    for (let i = 0; i < positions.length; i += 3) {
      points.push(transformGltfPoint(matrix, [positions[i], positions[i + 1], positions[i + 2]]));
    }
  }

  return points;
}

function boundsFromPoints(points) {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  for (const point of points) {
    bounds.minX = Math.min(bounds.minX, point.x);
    bounds.maxX = Math.max(bounds.maxX, point.x);
    bounds.minY = Math.min(bounds.minY, point.y);
    bounds.maxY = Math.max(bounds.maxY, point.y);
    bounds.minZ = Math.min(bounds.minZ, point.z);
    bounds.maxZ = Math.max(bounds.maxZ, point.z);
  }

  return Object.fromEntries(
    Object.entries(bounds).map(([key, value]) => [key, roundLevelValue(value)]),
  );
}

function readMaterials(json, bin) {
  return (json.materials ?? []).map((material, index) => {
    const pbr = material.pbrMetallicRoughness ?? {};
    const textureIndex = pbr.baseColorTexture?.index;
    const imageIndex = textureIndex === undefined ? undefined : json.textures?.[textureIndex]?.source;
    const image = imageIndex === undefined ? undefined : json.images?.[imageIndex];
    const surface = readMaterialSurface(material);
    return {
      name: material.name ?? `material_${index}`,
      textureId: readMaterialTextureId(material, index),
      baseColor: pbr.baseColorFactor ?? [1, 1, 1, 1],
      ...surface,
      texture: image?.bufferView === undefined ? null : {
        name: image.name ?? `material_${index}_texture`,
        mimeType: image.mimeType ?? 'application/octet-stream',
        bytes: readBufferViewBytes(json, bin, image.bufferView),
      },
    };
  });
}

function readMaterialTextureId(material, index) {
  const name = material.name ?? `material_${index}`;
  if (name.startsWith('LEVELMAT_')) return name.slice('LEVELMAT_'.length);
  if (name.startsWith('SURFACE_')) return name.slice('SURFACE_'.length).toLowerCase();
  return name;
}

function readMaterialSurface(material) {
  const extras = material.extras ?? {};
  const surfaceType = parseJsonString(extras.surfaceType ?? extras.level_surface) ?? readSurfaceTypeFromName(material.name);
  const surface = {};
  if (surfaceType !== null) surface.surfaceType = surfaceType;
  for (const key of ['footstepSoundId', 'splashSoundId', 'damagePerSecond', 'friction', 'wet']) {
    if (extras[key] !== undefined) surface[key] = parseJsonString(extras[key]);
  }
  return surface;
}

function readSurfaceTypeFromName(name = '') {
  if (!name.startsWith('SURFACE_')) return null;
  const type = name.slice('SURFACE_'.length).split('_')[0];
  return type ? type.toLowerCase() : null;
}

function readSceneId(nodes) {
  return nodes.find((node) => node.extras?.scene_id)?.extras.scene_id ?? null;
}

function readGlb(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (readAscii(view, 0, 4) !== 'glTF') {
    throw new Error('Level file is not a GLB.');
  }
  if (view.getUint32(4, true) !== 2) {
    throw new Error('Only GLB version 2 is supported.');
  }

  let offset = 12;
  let json = null;
  let bin = null;

  while (offset < view.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;

    if (chunkType === GLB_JSON_CHUNK) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, chunkStart, chunkLength)));
    } else if (chunkType === GLB_BIN_CHUNK) {
      bin = arrayBuffer.slice(chunkStart, chunkStart + chunkLength);
    }

    offset = chunkStart + chunkLength;
  }

  if (!json || !bin) {
    throw new Error('Level GLB is missing JSON or binary chunks.');
  }

  return { json, bin };
}

function readAccessor(json, bin, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const bufferView = json.bufferViews[accessor.bufferView];
  const componentSize = COMPONENT_SIZE[accessor.componentType];
  const componentCount = TYPE_SIZE[accessor.type];
  const stride = bufferView.byteStride ?? componentSize * componentCount;
  const offset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const view = new DataView(bin, offset, bufferView.byteLength - (accessor.byteOffset ?? 0));
  const values = [];

  for (let item = 0; item < accessor.count; item += 1) {
    const base = item * stride;
    for (let component = 0; component < componentCount; component += 1) {
      values.push(readComponent(view, base + component * componentSize, accessor.componentType));
    }
  }

  return { values };
}

function readBufferViewBytes(json, bin, bufferViewIndex) {
  const bufferView = json.bufferViews[bufferViewIndex];
  const offset = bufferView.byteOffset ?? 0;
  return new Uint8Array(bin.slice(offset, offset + bufferView.byteLength));
}

function readComponent(view, offset, componentType) {
  if (componentType === COMPONENT_FLOAT) return view.getFloat32(offset, true);
  if (componentType === COMPONENT_UNSIGNED_INT) return view.getUint32(offset, true);
  if (componentType === COMPONENT_UNSIGNED_SHORT) return view.getUint16(offset, true);
  if (componentType === COMPONENT_UNSIGNED_BYTE) return view.getUint8(offset);
  throw new Error(`Unsupported GLB component type: ${componentType}`);
}

function readNodeMatrix(node) {
  if (node.matrix) return node.matrix;
  return composeMat4(
    node.translation ?? [0, 0, 0],
    node.rotation ?? [0, 0, 0, 1],
    node.scale ?? [1, 1, 1],
  );
}

function composeMat4(translation, rotation, scale) {
  const [x, y, z, w] = normalizeQuat(rotation);
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  const sx = scale[0];
  const sy = scale[1];
  const sz = scale[2];

  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1,
  ];
}

function multiplyMat4(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0]
        + a[1 * 4 + row] * b[column * 4 + 1]
        + a[2 * 4 + row] * b[column * 4 + 2]
        + a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function transformGltfPoint(matrix, point) {
  const x = matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12];
  const y = matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13];
  const z = matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14];
  return { x, y, z: -z };
}

function identityMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function normalizeQuat(quat) {
  const length = Math.hypot(quat[0], quat[1], quat[2], quat[3]) || 1;
  return quat.map((value) => value / length);
}

function roundLevelValue(value) {
  return Math.round(value * 1000000) / 1000000;
}

function readAscii(view, offset, length) {
  let text = '';
  for (let i = 0; i < length; i += 1) {
    text += String.fromCharCode(view.getUint8(offset + i));
  }
  return text;
}
