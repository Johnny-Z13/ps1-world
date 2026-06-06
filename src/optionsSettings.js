import { normalizePixelScale } from './ps1Display.js';
import { clamp } from './renderMath.js';

export const OPTIONS_STORAGE_KEY = 'ps1-world-options';

export const SAVED_OPTION_KEYS = Object.freeze([
  'preset',
  'resolutionId',
  'pixelScale',
  'invertY',
  'showReticule',
  'scanlines',
  'crtDistortion',
  'dither',
  'warping',
  'colorBleed',
  'noise',
  'playerTorch',
  'zombies',
  'radarMap',
  'debugHud',
  'musicVolume',
  'sfxVolume',
]);

export function loadSavedOptions(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(OPTIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const saved = {};
    for (const key of SAVED_OPTION_KEYS) {
      if (!Object.hasOwn(parsed, key)) continue;
      const value = normalizeSavedOption(key, parsed[key]);
      if (value !== undefined) saved[key] = value;
    }
    return saved;
  } catch {
    return {};
  }
}

export function saveOptions(effects, storage = globalThis.localStorage) {
  try {
    storage?.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(createSavedOptionsSnapshot(effects)));
  } catch {
  }
}

export function createSavedOptionsSnapshot(effects) {
  const saved = {};
  for (const key of SAVED_OPTION_KEYS) {
    if (Object.hasOwn(effects, key)) saved[key] = effects[key];
  }
  return saved;
}

export function syncAudioMasterVolumes(state, effects) {
  if (!state) return;
  const musicVolume = clamp(Number(effects.musicVolume ?? 1), 0, 1);
  const sfxVolume = clamp(Number(effects.sfxVolume ?? 1), 0, 1);
  state.musicGain.gain.setTargetAtTime(musicVolume, state.context.currentTime, 0.08);
  state.sfxGain.gain.setTargetAtTime(sfxVolume, state.context.currentTime, 0.08);
}

function normalizeSavedOption(key, value) {
  if (key === 'musicVolume' || key === 'sfxVolume') {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? clamp(numberValue, 0, 1) : undefined;
  }
  if (key === 'pixelScale') return normalizePixelScale(value);
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  return undefined;
}
