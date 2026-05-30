export const PS1_RENDER_TARGET = Object.freeze({
  width: 320,
  height: 240,
  aspect: 4 / 3,
});

export const PS1_RESOLUTION_MODES = Object.freeze([
  Object.freeze({ id: '256x224', width: 256, height: 224, label: '256x224 - Low-res 2D, early titles' }),
  Object.freeze({ id: '320x240', width: 320, height: 240, label: '320x240 - Most 3D games' }),
  Object.freeze({ id: '512x240', width: 512, height: 240, label: '512x240 - High-res 2D, RPGs, menus' }),
  Object.freeze({ id: '640x240', width: 640, height: 240, label: '640x240 - Rare' }),
  Object.freeze({ id: '512x480', width: 512, height: 480, label: '512x480 - Interlaced high-res' }),
  Object.freeze({ id: '640x480', width: 640, height: 480, label: '640x480 - Very rare' }),
  Object.freeze({ id: '1024x768', width: 1024, height: 768, label: '1024x768 - Year 2000 art check' }),
]);

export const DEFAULT_EFFECTS = Object.freeze({
  resolutionId: '512x480',
  pixelScale: 3,
  invertY: false,
  flipFramebufferY: false,
  showReticule: true,
  scanlines: true,
  crtDistortion: true,
  dither: true,
  warping: true,
  colorBleed: true,
  noise: true,
  wobble: true,
  playerTorch: true,
  zombies: true,
});

export const CRT_PRESETS = Object.freeze({
  clean: Object.freeze({
    scanlineStrength: 0.14,
    distortion: 0.035,
    noise: 0.015,
    colorBleed: 0.0015,
    vignette: 0.16,
  }),
  portable: Object.freeze({
    scanlineStrength: 0.32,
    distortion: 0.075,
    noise: 0.055,
    colorBleed: 0.0045,
    vignette: 0.28,
  }),
});

export function createEffectState(overrides = {}) {
  return {
    ...DEFAULT_EFFECTS,
    preset: 'portable',
    brightness: 1.05,
    contrast: 1.08,
    saturation: 0.82,
    ...overrides,
  };
}

export function getPresetValues(effectState) {
  return CRT_PRESETS[effectState.preset] ?? CRT_PRESETS.portable;
}

export function getResolutionMode(id) {
  return PS1_RESOLUTION_MODES.find((mode) => mode.id === id) ?? getResolutionMode(DEFAULT_EFFECTS.resolutionId);
}

export function normalizePixelScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_EFFECTS.pixelScale;

  return Math.min(6, Math.max(1, Math.round(parsed)));
}
