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
  radarMap: true,
  musicVolume: 0.72,
  sfxVolume: 0.82,
  debugHud: false,
  debugFreeCam: false,
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
  'clean-test-view': Object.freeze({
    scanlineStrength: 0,
    distortion: 0,
    noise: 0,
    colorBleed: 0,
    vignette: 0.08,
  }),
});

const PORTABLE_TV_EFFECTS = Object.freeze({
  preset: 'portable',
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
  radarMap: true,
  musicVolume: 0.72,
  sfxVolume: 0.82,
  debugHud: false,
  debugFreeCam: false,
  brightness: 1.05,
  contrast: 1.08,
  saturation: 0.82,
});

const CLEAN_RGB_EFFECTS = Object.freeze({
  preset: 'clean',
  resolutionId: '512x480',
  pixelScale: 2,
  invertY: false,
  flipFramebufferY: false,
  showReticule: true,
  scanlines: true,
  crtDistortion: false,
  dither: true,
  warping: false,
  colorBleed: false,
  noise: false,
  wobble: false,
  playerTorch: true,
  zombies: true,
  radarMap: true,
  musicVolume: 0.72,
  sfxVolume: 0.82,
  debugHud: false,
  debugFreeCam: false,
  brightness: 1.04,
  contrast: 1.02,
  saturation: 0.92,
});

const CLEAN_TEST_VIEW_EFFECTS = Object.freeze({
  preset: 'clean-test-view',
  resolutionId: '1024x768',
  pixelScale: 3,
  invertY: false,
  flipFramebufferY: false,
  showReticule: true,
  scanlines: false,
  crtDistortion: false,
  dither: false,
  warping: false,
  colorBleed: false,
  noise: false,
  wobble: false,
  playerTorch: true,
  zombies: true,
  radarMap: true,
  musicVolume: 0.72,
  sfxVolume: 0.82,
  debugHud: false,
  debugFreeCam: false,
  brightness: 1,
  contrast: 1,
  saturation: 1,
});

export const VIDEO_PRESETS = Object.freeze([
  Object.freeze({
    id: 'portable',
    label: 'Portable TV',
    effects: PORTABLE_TV_EFFECTS,
  }),
  Object.freeze({
    id: 'clean',
    label: 'Cleaner RGB',
    effects: CLEAN_RGB_EFFECTS,
  }),
  Object.freeze({
    id: 'clean-test-view',
    label: 'Clean test view',
    effects: CLEAN_TEST_VIEW_EFFECTS,
  }),
]);

export function createEffectState(overrides = {}) {
  return {
    ...PORTABLE_TV_EFFECTS,
    ...overrides,
  };
}

export function getPresetValues(effectState) {
  return CRT_PRESETS[effectState.preset] ?? CRT_PRESETS.portable;
}

export function applyVideoPreset(effectState, presetId) {
  const preset = VIDEO_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) return effectState;

  return {
    ...effectState,
    ...preset.effects,
  };
}

export function getResolutionMode(id) {
  return PS1_RESOLUTION_MODES.find((mode) => mode.id === id) ?? getResolutionMode(DEFAULT_EFFECTS.resolutionId);
}

export function normalizePixelScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_EFFECTS.pixelScale;

  return Math.min(6, Math.max(1, Math.round(parsed)));
}
