export const ZOMBIE_GLB_URL = './src/characters/Zombie/zombie_walk.glb';

const COMPONENT_FLOAT = 5126;
const COMPONENT_UNSIGNED_SHORT = 5123;
const COMPONENT_UNSIGNED_BYTE = 5121;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;

const COMPONENT_SIZE = Object.freeze({
  [COMPONENT_FLOAT]: 4,
  [COMPONENT_UNSIGNED_SHORT]: 2,
  [COMPONENT_UNSIGNED_BYTE]: 1,
});

const TYPE_SIZE = Object.freeze({
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
});

export async function loadZombieGlb(url = ZOMBIE_GLB_URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load zombie GLB: ${response.status}`);
  }

  return parseZombieGlb(await response.arrayBuffer());
}

export function parseZombieGlb(arrayBuffer) {
  const { json, bin } = readGlb(arrayBuffer);
  const primitive = json.meshes?.[0]?.primitives?.[0];
  if (primitive?.attributes?.POSITION === undefined || primitive.indices === undefined) {
    throw new Error('Zombie GLB does not contain the expected indexed mesh.');
  }

  const positions = readAccessor(json, bin, primitive.attributes.POSITION);
  const uvs = primitive.attributes.TEXCOORD_0 === undefined
    ? null
    : readAccessor(json, bin, primitive.attributes.TEXCOORD_0);
  const indices = readAccessor(json, bin, primitive.indices);
  const vertices = [];
  const sourcePositions = positions.values;
  const sourceUvs = uvs?.values ?? null;

  for (let i = 0; i < indices.values.length; i += 1) {
    const index = indices.values[i];
    vertices.push({
      x: sourcePositions[index * 3],
      y: sourcePositions[index * 3 + 1],
      z: sourcePositions[index * 3 + 2],
      u: sourceUvs ? sourceUvs[index * 2] : 0,
      v: sourceUvs ? sourceUvs[index * 2 + 1] : 0,
    });
  }

  return {
    name: json.meshes[0].name ?? 'zombie_walk',
    vertexCount: vertices.length,
    vertices,
    bounds: {
      min: positions.min,
      max: positions.max,
    },
  };
}

function readGlb(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (readAscii(view, 0, 4) !== 'glTF') {
    throw new Error('Zombie file is not a GLB.');
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
    throw new Error('Zombie GLB is missing JSON or binary chunks.');
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
      const componentOffset = base + component * componentSize;
      values.push(readComponent(view, componentOffset, accessor.componentType));
    }
  }

  return {
    values,
    min: accessor.min ?? null,
    max: accessor.max ?? null,
  };
}

function readComponent(view, offset, componentType) {
  if (componentType === COMPONENT_FLOAT) return view.getFloat32(offset, true);
  if (componentType === COMPONENT_UNSIGNED_SHORT) return view.getUint16(offset, true);
  if (componentType === COMPONENT_UNSIGNED_BYTE) return view.getUint8(offset);
  throw new Error(`Unsupported GLB component type: ${componentType}`);
}

function readAscii(view, offset, length) {
  let text = '';
  for (let i = 0; i < length; i += 1) {
    text += String.fromCharCode(view.getUint8(offset + i));
  }
  return text;
}
