import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CRT_PRESETS,
  DEFAULT_EFFECTS,
  PS1_RENDER_TARGET,
  PS1_RESOLUTION_MODES,
  VIDEO_PRESETS,
  applyVideoPreset,
  getResolutionMode,
  normalizePixelScale,
} from '../src/ps1Display.js';

test('uses a 4:3 NTSC-style low-resolution render target', () => {
  assert.equal(PS1_RENDER_TARGET.width, 320);
  assert.equal(PS1_RENDER_TARGET.height, 240);
  assert.equal(PS1_RENDER_TARGET.aspect, 4 / 3);
});

test('starts with PS1/CRT effects enabled and adjustable', () => {
  assert.equal(DEFAULT_EFFECTS.pixelScale, 3);
  assert.equal(DEFAULT_EFFECTS.invertY, false);
  assert.equal(DEFAULT_EFFECTS.flipFramebufferY, false);
  assert.equal(DEFAULT_EFFECTS.showReticule, true);
  assert.equal(DEFAULT_EFFECTS.scanlines, true);
  assert.equal(DEFAULT_EFFECTS.crtDistortion, true);
  assert.equal(DEFAULT_EFFECTS.dither, true);
  assert.equal(DEFAULT_EFFECTS.warping, true);
  assert.equal(DEFAULT_EFFECTS.colorBleed, true);
  assert.equal(DEFAULT_EFFECTS.playerTorch, true);
  assert.equal(DEFAULT_EFFECTS.zombies, true);
  assert.equal(DEFAULT_EFFECTS.radarMap, true);
  assert.equal(DEFAULT_EFFECTS.musicVolume, 0.72);
  assert.equal(DEFAULT_EFFECTS.sfxVolume, 0.82);
  assert.equal(DEFAULT_EFFECTS.debugHud, false);
  assert.equal(DEFAULT_EFFECTS.debugFreeCam, false);
});

test('includes a stronger portable CRT preset for 1999 TV feel', () => {
  assert.ok(CRT_PRESETS.portable.scanlineStrength > CRT_PRESETS.clean.scanlineStrength);
  assert.ok(CRT_PRESETS.portable.distortion > CRT_PRESETS.clean.distortion);
  assert.ok(CRT_PRESETS.portable.noise > CRT_PRESETS.clean.noise);
});

test('video presets are complete whole-option profiles', () => {
  const requiredEffectKeys = [
    'preset',
    'resolutionId',
    'pixelScale',
    'invertY',
    'flipFramebufferY',
    'showReticule',
    'scanlines',
    'crtDistortion',
    'dither',
    'warping',
    'colorBleed',
    'noise',
    'wobble',
    'playerTorch',
    'zombies',
    'radarMap',
    'musicVolume',
    'sfxVolume',
    'debugHud',
    'debugFreeCam',
    'brightness',
    'contrast',
    'saturation',
  ];

  for (const videoPreset of VIDEO_PRESETS) {
    for (const key of requiredEffectKeys) {
      assert.ok(Object.hasOwn(videoPreset.effects, key), `${videoPreset.id} missing ${key}`);
    }
  }
});

test('portable TV preset restores the full crunchy PS1 profile', () => {
  const clean = applyVideoPreset(DEFAULT_EFFECTS, 'clean-test-view');
  const portable = applyVideoPreset(clean, 'portable');

  assert.equal(portable.preset, 'portable');
  assert.equal(portable.resolutionId, '512x480');
  assert.equal(portable.pixelScale, 3);
  assert.equal(portable.showReticule, true);
  assert.equal(portable.scanlines, true);
  assert.equal(portable.crtDistortion, true);
  assert.equal(portable.dither, true);
  assert.equal(portable.warping, true);
  assert.equal(portable.colorBleed, true);
  assert.equal(portable.noise, true);
  assert.equal(portable.playerTorch, true);
  assert.equal(portable.zombies, true);
  assert.equal(portable.radarMap, true);
  assert.equal(portable.musicVolume, 0.72);
  assert.equal(portable.sfxVolume, 0.82);
  assert.equal(portable.debugHud, false);
  assert.equal(portable.debugFreeCam, false);
});

test('includes a clean test view preset matching the 1024 art-check settings', () => {
  assert.ok(VIDEO_PRESETS.some((preset) => preset.id === 'clean-test-view' && preset.label === 'Clean test view'));

  const effects = applyVideoPreset(DEFAULT_EFFECTS, 'clean-test-view');
  assert.equal(effects.preset, 'clean-test-view');
  assert.equal(effects.resolutionId, '1024x768');
  assert.equal(effects.pixelScale, 3);
  assert.equal(effects.scanlines, false);
  assert.equal(effects.crtDistortion, false);
  assert.equal(effects.dither, false);
  assert.equal(effects.warping, false);
  assert.equal(effects.colorBleed, false);
  assert.equal(effects.noise, false);
  assert.equal(effects.playerTorch, true);
  assert.equal(effects.zombies, true);
  assert.equal(effects.radarMap, true);
  assert.equal(effects.musicVolume, 0.72);
  assert.equal(effects.sfxVolume, 0.82);
  assert.equal(effects.showReticule, true);
  assert.equal(effects.debugHud, false);
  assert.equal(effects.debugFreeCam, false);
});

test('offers the requested PlayStation resolution modes', () => {
  assert.deepEqual(
    PS1_RESOLUTION_MODES.map((mode) => `${mode.width}x${mode.height}`),
    ['256x224', '320x240', '512x240', '640x240', '512x480', '640x480', '1024x768'],
  );
});

test('includes a 1024x768 art-check mode for higher-resolution previewing', () => {
  assert.deepEqual(getResolutionMode('1024x768'), {
    id: '1024x768',
    width: 1024,
    height: 768,
    label: '1024x768 - Year 2000 art check',
  });
});

test('defaults to the 512x480 interlaced high-res mode and falls back to it for invalid ids', () => {
  assert.equal(DEFAULT_EFFECTS.resolutionId, '512x480');
  assert.deepEqual(getResolutionMode('512x480'), {
    id: '512x480',
    width: 512,
    height: 480,
    label: '512x480 - Interlaced high-res',
  });
  assert.equal(getResolutionMode('missing').id, '512x480');
});

test('normalizes numeric pixel scale controls to the supported integer range', () => {
  assert.equal(normalizePixelScale('4'), 4);
  assert.equal(normalizePixelScale('2.7'), 3);
  assert.equal(normalizePixelScale('99'), 6);
  assert.equal(normalizePixelScale('not a number'), DEFAULT_EFFECTS.pixelScale);
});
