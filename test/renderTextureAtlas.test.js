import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSceneTextureAtlas,
  createTextureAtlas,
  drawMaterialColorTexture,
  drawZombieModelTexture,
  loadTextureBytesImage,
} from '../src/renderTextureAtlas.js';

function createFakeGl() {
  const calls = [];
  const texture = { id: 'texture' };
  const gl = {
    TEXTURE_2D: 'TEXTURE_2D',
    TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
    TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
    TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
    TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
    NEAREST: 'NEAREST',
    CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
    RGBA: 'RGBA',
    UNSIGNED_BYTE: 'UNSIGNED_BYTE',
    createTexture() {
      calls.push(['createTexture', texture]);
      return texture;
    },
    bindTexture(...args) {
      calls.push(['bindTexture', ...args]);
    },
    texParameteri(...args) {
      calls.push(['texParameteri', ...args]);
    },
    texImage2D(...args) {
      calls.push(['texImage2D', ...args]);
    },
  };
  return { gl, calls, texture };
}

function createFakeCanvasFactory() {
  const contextCalls = [];
  const canvases = [];
  return {
    contextCalls,
    canvases,
    createCanvas() {
      const canvas = {
        width: 0,
        height: 0,
        getContext(type) {
          contextCalls.push(['getContext', type]);
          return {
            imageSmoothingEnabled: true,
            set fillStyle(value) {
              contextCalls.push(['fillStyle', value]);
            },
            fillRect(...args) {
              contextCalls.push(['fillRect', ...args]);
            },
            drawImage(...args) {
              contextCalls.push(['drawImage', ...args]);
            },
          };
        },
      };
      canvases.push(canvas);
      return canvas;
    },
  };
}

test('createTextureAtlas draws character, image, material, and generated tiles into a GL texture', () => {
  const { gl, calls, texture } = createFakeGl();
  const canvasFactory = createFakeCanvasFactory();
  const generatedCalls = [];
  const characterImage = { id: 'character-image' };
  const materialImage = { id: 'material-image' };
  const textures = [
    { id: 'zombie' },
    { id: 'level-stone', image: materialImage },
    { id: 'material-color', material: { baseColor: [0.25, 0.5, 0.75, 0.8] } },
    { id: 'generated', size: 32 },
  ];

  const result = createTextureAtlas(gl, textures, new Map([['zombie', characterImage]]), {
    createCanvas: canvasFactory.createCanvas,
    drawGeneratedTexture: (...args) => generatedCalls.push(args),
  });

  assert.equal(result, texture);
  assert.equal(canvasFactory.canvases[0].width, 128 * textures.length);
  assert.equal(canvasFactory.canvases[0].height, 128);
  assert.ok(canvasFactory.contextCalls.some((call) => call[0] === 'drawImage' && call[1] === characterImage));
  assert.ok(canvasFactory.contextCalls.some((call) => call[0] === 'drawImage' && call[1] === materialImage));
  assert.ok(canvasFactory.contextCalls.some((call) => call[0] === 'fillStyle' && call[1] === 'rgba(64, 128, 191, 0.8)'));
  assert.deepEqual(generatedCalls[0].slice(1), ['generated', 384, 0, 128, 32]);
  assert.deepEqual(calls.at(-1), ['texImage2D', 'TEXTURE_2D', 0, 'RGBA', 'RGBA', 'UNSIGNED_BYTE', canvasFactory.canvases[0]]);
});

test('createSceneTextureAtlas decodes embedded level texture bytes before uploading', async () => {
  const { gl } = createFakeGl();
  const canvasFactory = createFakeCanvasFactory();
  const decodedImage = { id: 'decoded-image' };
  const scene = {
    levelAsset: {},
    textures: [{
      id: 'embedded',
      material: {
        texture: { bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' },
        baseColor: [1, 0, 0, 1],
      },
    }],
  };

  await createSceneTextureAtlas(gl, scene, new Map(), {
    createCanvas: canvasFactory.createCanvas,
    loadTextureBytesImage: async (texture) => {
      assert.equal(texture.mimeType, 'image/png');
      return decodedImage;
    },
  });

  assert.ok(canvasFactory.contextCalls.some((call) => call[0] === 'drawImage' && call[1] === decodedImage));
});

test('loadTextureBytesImage decodes bytes and revokes the object URL', async () => {
  const events = [];
  const image = {
    decode: async () => events.push(['decode']),
  };
  const result = await loadTextureBytesImage({
    bytes: new Uint8Array([1, 2]),
    mimeType: 'image/png',
  }, {
    BlobCtor: class FakeBlob {
      constructor(parts, options) {
        events.push(['blob', parts[0], options.type]);
      }
    },
    ImageCtor: class FakeImage {
      constructor() {
        return image;
      }
    },
    URLApi: {
      createObjectURL(blob) {
        events.push(['createObjectURL', blob]);
        return 'blob:test';
      },
      revokeObjectURL(url) {
        events.push(['revokeObjectURL', url]);
      },
    },
  });

  assert.equal(result, image);
  assert.deepEqual(events.map(([name]) => name), ['blob', 'createObjectURL', 'decode', 'revokeObjectURL']);
  assert.equal(image.src, 'blob:test');
});

test('draw helpers write material color and character image tiles', () => {
  const calls = [];
  const ctx = {
    set fillStyle(value) {
      calls.push(['fillStyle', value]);
    },
    fillRect(...args) {
      calls.push(['fillRect', ...args]);
    },
    drawImage(...args) {
      calls.push(['drawImage', ...args]);
    },
  };
  const image = { id: 'image' };

  drawMaterialColorTexture(ctx, [0.1, 0.2, 0.3, 0.4], 5, 6, 7);
  drawZombieModelTexture(ctx, image, 8, 9, 10);

  assert.deepEqual(calls, [
    ['fillStyle', 'rgba(26, 51, 77, 0.4)'],
    ['fillRect', 5, 6, 7, 7],
    ['drawImage', image, 8, 9, 10, 10],
  ]);
});
