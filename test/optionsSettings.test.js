import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPTIONS_STORAGE_KEY,
  createSavedOptionsSnapshot,
  loadSavedOptions,
  saveOptions,
  syncAudioMasterVolumes,
} from '../src/optionsSettings.js';

test('loads only supported saved options and normalizes numeric ranges', () => {
  const storage = createMemoryStorage({
    [OPTIONS_STORAGE_KEY]: JSON.stringify({
      musicVolume: 2,
      sfxVolume: -1,
      pixelScale: 99,
      invertY: true,
      radarMap: false,
      unknown: 'ignored',
    }),
  });

  assert.deepEqual(loadSavedOptions(storage), {
    musicVolume: 1,
    sfxVolume: 0,
    pixelScale: 6,
    invertY: true,
    radarMap: false,
  });
});

test('saves only supported options', () => {
  const storage = createMemoryStorage();

  saveOptions({
    musicVolume: 0.4,
    sfxVolume: 0.7,
    showReticule: false,
    radarMap: false,
    sceneId: 'dungeon',
  }, storage);

  assert.deepEqual(JSON.parse(storage.getItem(OPTIONS_STORAGE_KEY)), {
    showReticule: false,
    radarMap: false,
    musicVolume: 0.4,
    sfxVolume: 0.7,
  });
});

test('creates saved option snapshots without runtime-only state', () => {
  assert.deepEqual(createSavedOptionsSnapshot({
    preset: 'portable',
    sceneId: 'dungeon',
    musicVolume: 0.72,
  }), {
    preset: 'portable',
    musicVolume: 0.72,
  });
});

test('syncs music and SFX master volume nodes', () => {
  const calls = [];
  const state = {
    context: { currentTime: 12 },
    musicGain: { gain: createParamRecorder('music', calls) },
    sfxGain: { gain: createParamRecorder('sfx', calls) },
  };

  syncAudioMasterVolumes(state, { musicVolume: 0.25, sfxVolume: 0.8 });

  assert.deepEqual(calls, [
    ['music', 0.25, 12, 0.08],
    ['sfx', 0.8, 12, 0.08],
  ]);
});

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

function createParamRecorder(id, calls) {
  return {
    setTargetAtTime(value, time, smoothing) {
      calls.push([id, value, time, smoothing]);
    },
  };
}
