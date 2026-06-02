import { drawGeneratedTexture as drawGeneratedTextureTile } from './generatedTextures.js';

const ATLAS_TILE_SIZE = 128;

export async function createSceneTextureAtlas(glContext, scene, characterImages = new Map(), options = {}) {
  if (!scene.levelAsset) return createTextureAtlas(glContext, scene.textures, characterImages, options);
  return createLevelTextureAtlas(glContext, scene, characterImages, options);
}

export async function createLevelTextureAtlas(glContext, scene, characterImages = new Map(), options = {}) {
  const loadImage = options.loadTextureBytesImage ?? loadTextureBytesImage;
  const textures = await Promise.all(scene.textures.map(async (texture) => {
    if (!texture.material?.texture?.bytes) return texture;
    return {
      ...texture,
      image: await loadImage(texture.material.texture),
    };
  }));

  return createTextureAtlas(glContext, textures, characterImages, options);
}

export function createTextureAtlas(glContext, textures, characterImages = new Map(), options = {}) {
  const tile = options.tileSize ?? ATLAS_TILE_SIZE;
  const createCanvas = options.createCanvas ?? (() => document.createElement('canvas'));
  const drawGenerated = options.drawGeneratedTexture ?? drawGeneratedTextureTile;
  const atlasCanvas = createCanvas();
  atlasCanvas.width = tile * textures.length;
  atlasCanvas.height = tile;
  const ctx = atlasCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  textures.forEach((texture, index) => {
    const x = index * tile;
    const characterImage = characterImages?.get?.(texture.id) ?? null;
    if (characterImage) {
      drawZombieModelTexture(ctx, characterImage, x, 0, tile);
    } else if (texture.image) {
      ctx.drawImage(texture.image, x, 0, tile, tile);
    } else if (texture.material) {
      drawMaterialColorTexture(ctx, texture.material.baseColor, x, 0, tile);
    } else {
      drawGenerated(ctx, texture.id, x, 0, tile, texture.size);
    }
  });

  const texture = glContext.createTexture();
  glContext.bindTexture(glContext.TEXTURE_2D, texture);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.NEAREST);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.NEAREST);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
  glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
  glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, atlasCanvas);
  return texture;
}

export async function loadTextureBytesImage(texture, options = {}) {
  const BlobCtor = options.BlobCtor ?? Blob;
  const ImageCtor = options.ImageCtor ?? Image;
  const URLApi = options.URLApi ?? URL;
  const blob = new BlobCtor([texture.bytes], { type: texture.mimeType });
  const image = new ImageCtor();
  const url = URLApi.createObjectURL(blob);
  try {
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URLApi.revokeObjectURL(url);
  }
}

export function drawMaterialColorTexture(ctx, baseColor, x, y, tile) {
  const [r, g, b, a = 1] = baseColor ?? [1, 1, 1, 1];
  ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  ctx.fillRect(x, y, tile, tile);
}

export function drawZombieModelTexture(ctx, image, x, y, tile) {
  ctx.drawImage(image, x, y, tile, tile);
}
