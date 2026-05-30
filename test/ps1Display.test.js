import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CRT_PRESETS,
  DEFAULT_EFFECTS,
  PS1_RENDER_TARGET,
  PS1_RESOLUTION_MODES,
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
});

test('includes a stronger portable CRT preset for 1999 TV feel', () => {
  assert.ok(CRT_PRESETS.portable.scanlineStrength > CRT_PRESETS.clean.scanlineStrength);
  assert.ok(CRT_PRESETS.portable.distortion > CRT_PRESETS.clean.distortion);
  assert.ok(CRT_PRESETS.portable.noise > CRT_PRESETS.clean.noise);
});

test('offers the requested PlayStation resolution modes', () => {
  assert.deepEqual(
    PS1_RESOLUTION_MODES.map((mode) => `${mode.width}x${mode.height}`),
    ['256x224', '320x240', '512x240', '640x240', '512x480', '640x480'],
  );
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
