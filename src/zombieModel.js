export const ZOMBIE_GLB_URL = './src/characters/Zombie/zombie_walk.glb';
export const CHARACTER_MODEL_URLS = Object.freeze({
  zombie: ZOMBIE_GLB_URL,
  'one-eye-alien': './src/characters/one-eye-alien/one-eye-alien.glb',
  'molten-sentinel': './src/characters/molten-stone-sentinel/moulten-stone-sentienel.glb',
});

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

export async function loadZombieGlb(url = ZOMBIE_GLB_URL) {
  return loadCharacterGlb('zombie', url);
}

export async function loadCharacterGlb(enemyType = 'zombie', url = CHARACTER_MODEL_URLS[enemyType]) {
  if (!url) {
    throw new Error(`No character GLB registered for enemy type: ${enemyType}`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load character GLB ${enemyType}: ${response.status}`);
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
  const joints = primitive.attributes.JOINTS_0 === undefined
    ? null
    : readAccessor(json, bin, primitive.attributes.JOINTS_0);
  const weights = primitive.attributes.WEIGHTS_0 === undefined
    ? null
    : readAccessor(json, bin, primitive.attributes.WEIGHTS_0);
  const indices = readAccessor(json, bin, primitive.indices);
  const texture = readMaterialTexture(json, bin, primitive.material);
  const meshNode = json.nodes?.findIndex((node) => node.mesh === 0) ?? -1;
  const skin = readSkin(json, bin, meshNode);
  const nodes = readNodes(json);
  const animations = readAnimations(json, bin);
  const vertices = [];
  const sourcePositions = positions.values;
  const sourceUvs = uvs?.values ?? null;
  const sourceJoints = joints?.values ?? null;
  const sourceWeights = weights?.values ?? null;

  for (let i = 0; i < indices.values.length; i += 1) {
    const index = indices.values[i];
    vertices.push({
      x: sourcePositions[index * 3],
      y: sourcePositions[index * 3 + 1],
      z: sourcePositions[index * 3 + 2],
      u: sourceUvs ? sourceUvs[index * 2] : 0,
      v: sourceUvs ? sourceUvs[index * 2 + 1] : 0,
      joints: sourceJoints ? sourceJoints.slice(index * 4, index * 4 + 4) : [0, 0, 0, 0],
      weights: sourceWeights ? sourceWeights.slice(index * 4, index * 4 + 4) : [1, 0, 0, 0],
    });
  }

  return {
    name: json.meshes[0].name ?? 'zombie_walk',
    vertexCount: vertices.length,
    vertices,
    texture,
    animations,
    nodes,
    sceneNodes: json.scenes?.[json.scene ?? 0]?.nodes ?? [],
    skin,
    bounds: {
      min: positions.min,
      max: positions.max,
    },
  };
}

export function animateZombieModel(model, time, animationName = null) {
  const animation = findAnimation(model, animationName);
  if (!model.skin || !animation) return model.vertices;

  const clipTime = animation.loopDuration > 0 ? positiveModulo(time, animation.loopDuration) : time;
  const localTransforms = model.nodes.map((node) => ({
    translation: [...node.translation],
    rotation: [...node.rotation],
    scale: [...node.scale],
  }));

  for (const channel of animation.tracks) {
    const sampled = sampleAnimationChannel(channel, clipTime);
    if (!sampled) continue;
    localTransforms[channel.node][channel.path] = sampled;
  }

  const localMatrices = localTransforms.map((transform) => composeMat4(
    transform.translation,
    transform.rotation,
    transform.scale,
  ));
  const globalMatrices = localMatrices.map(() => identityMat4());

  for (const root of model.sceneNodes) {
    updateGlobalMatrices(root, identityMat4(), model.nodes, localMatrices, globalMatrices);
  }

  const skinMatrices = model.skin.joints.map((jointNode, index) => (
    multiplyMat4(globalMatrices[jointNode], model.skin.inverseBindMatrices[index])
  ));

  return model.vertices.map((vertex) => {
    const skinned = skinVertex(vertex, skinMatrices);
    return {
      ...vertex,
      x: roundSkinValue(skinned.x),
      y: roundSkinValue(skinned.y),
      z: roundSkinValue(skinned.z),
    };
  });
}

function findAnimation(model, animationName) {
  if (!animationName) return model.animations[0];
  return model.animations.find((animation) => animation.name === animationName) ?? model.animations[0];
}

function readMaterialTexture(json, bin, materialIndex) {
  if (materialIndex === undefined) return null;
  const material = json.materials?.[materialIndex];
  const textureIndex = material?.pbrMetallicRoughness?.baseColorTexture?.index;
  const imageIndex = textureIndex === undefined ? undefined : json.textures?.[textureIndex]?.source;
  const image = imageIndex === undefined ? undefined : json.images?.[imageIndex];
  if (!image || image.bufferView === undefined) return null;

  return {
    name: image.name ?? 'zombie_basecolor',
    mimeType: image.mimeType ?? 'application/octet-stream',
    bytes: readBufferViewBytes(json, bin, image.bufferView),
  };
}

function readSkin(json, bin, meshNode) {
  const skinIndex = meshNode < 0 ? undefined : json.nodes?.[meshNode]?.skin;
  const skin = skinIndex === undefined ? undefined : json.skins?.[skinIndex];
  if (!skin) return null;

  const inverseBindValues = skin.inverseBindMatrices === undefined
    ? null
    : readAccessor(json, bin, skin.inverseBindMatrices).values;

  return {
    name: skin.name ?? 'Armature',
    joints: skin.joints ?? [],
    inverseBindMatrices: skin.joints.map((_, index) => (
      inverseBindValues
        ? inverseBindValues.slice(index * 16, index * 16 + 16)
        : identityMat4()
    )),
  };
}

function readNodes(json) {
  return (json.nodes ?? []).map((node) => ({
    name: node.name ?? '',
    children: node.children ?? [],
    translation: node.translation ?? [0, 0, 0],
    rotation: node.rotation ?? [0, 0, 0, 1],
    scale: node.scale ?? [1, 1, 1],
  }));
}

function readAnimations(json, bin) {
  return (json.animations ?? []).map((animation) => {
    const samplers = animation.samplers.map((sampler) => ({
      input: readAccessor(json, bin, sampler.input).values,
      output: readAccessor(json, bin, sampler.output).values,
      interpolation: sampler.interpolation ?? 'LINEAR',
    }));
    const loopDuration = Math.max(
      0,
      ...samplers.map((sampler) => sampler.input.at(-1) ?? 0),
    );

    return {
      name: animation.name ?? 'zombie_walk',
      channels: animation.channels?.length ?? 0,
      samplers: animation.samplers?.length ?? 0,
      loopDuration,
      tracks: (animation.channels ?? []).map((channel) => ({
        node: channel.target.node,
        path: channel.target.path,
        sampler: samplers[channel.sampler],
      })),
    };
  });
}

function readBufferViewBytes(json, bin, bufferViewIndex) {
  const bufferView = json.bufferViews[bufferViewIndex];
  const offset = bufferView.byteOffset ?? 0;
  return new Uint8Array(bin.slice(offset, offset + bufferView.byteLength));
}

function sampleAnimationChannel(channel, time) {
  const { input, output, interpolation } = channel.sampler;
  const size = channel.path === 'rotation' ? 4 : 3;
  if (input.length === 0) return null;
  if (time <= input[0]) return output.slice(0, size);

  for (let i = 0; i < input.length - 1; i += 1) {
    const start = input[i];
    const end = input[i + 1];
    if (time > end) continue;

    const from = output.slice(i * size, i * size + size);
    const to = output.slice((i + 1) * size, (i + 1) * size + size);
    if (interpolation === 'STEP' || end <= start) return from;

    const amount = (time - start) / (end - start);
    return channel.path === 'rotation'
      ? slerpQuat(from, to, amount)
      : lerpVector(from, to, amount);
  }

  return output.slice((input.length - 1) * size, input.length * size);
}

function updateGlobalMatrices(nodeIndex, parentMatrix, nodes, localMatrices, globalMatrices) {
  const global = multiplyMat4(parentMatrix, localMatrices[nodeIndex]);
  globalMatrices[nodeIndex] = global;

  for (const child of nodes[nodeIndex].children) {
    updateGlobalMatrices(child, global, nodes, localMatrices, globalMatrices);
  }
}

function skinVertex(vertex, skinMatrices) {
  const out = { x: 0, y: 0, z: 0 };
  let totalWeight = 0;

  for (let i = 0; i < 4; i += 1) {
    const weight = vertex.weights[i] ?? 0;
    if (weight <= 0) continue;

    const transformed = transformPoint(skinMatrices[vertex.joints[i]], vertex);
    out.x += transformed.x * weight;
    out.y += transformed.y * weight;
    out.z += transformed.z * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return { x: vertex.x, y: vertex.y, z: vertex.z };
  return {
    x: out.x / totalWeight,
    y: out.y / totalWeight,
    z: out.z / totalWeight,
  };
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

function transformPoint(matrix, point) {
  return {
    x: matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12],
    y: matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13],
    z: matrix[2] * point.x + matrix[6] * point.y + matrix[10] * point.z + matrix[14],
  };
}

function identityMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function lerpVector(from, to, amount) {
  return from.map((value, index) => value + (to[index] - value) * amount);
}

function slerpQuat(from, to, amount) {
  let target = to;
  let dot = from[0] * to[0] + from[1] * to[1] + from[2] * to[2] + from[3] * to[3];
  if (dot < 0) {
    target = to.map((value) => -value);
    dot = -dot;
  }

  if (dot > 0.9995) return normalizeQuat(lerpVector(from, target, amount));

  const theta = Math.acos(Math.min(1, Math.max(-1, dot)));
  const sinTheta = Math.sin(theta);
  const a = Math.sin((1 - amount) * theta) / sinTheta;
  const b = Math.sin(amount * theta) / sinTheta;
  return [
    from[0] * a + target[0] * b,
    from[1] * a + target[1] * b,
    from[2] * a + target[2] * b,
    from[3] * a + target[3] * b,
  ];
}

function normalizeQuat(quat) {
  const length = Math.hypot(quat[0], quat[1], quat[2], quat[3]) || 1;
  return quat.map((value) => value / length);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function roundSkinValue(value) {
  return Math.round(value * 1000000) / 1000000;
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
