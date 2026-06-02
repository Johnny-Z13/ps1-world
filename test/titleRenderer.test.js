import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TITLE_HEIGHT,
  TITLE_LAST_COMMIT_MESSAGE,
  TITLE_WIDTH,
  getTitleButtonBlink,
  measureBitmapText,
  renderTitleScreen,
} from '../src/titleRenderer.js';

function createRecordingContext() {
  const calls = [];
  return {
    calls,
    imageSmoothingEnabled: true,
    fillStyle: null,
    clearRect(...args) {
      calls.push(['clearRect', ...args]);
    },
    fillRect(...args) {
      calls.push(['fillRect', this.fillStyle, ...args]);
    },
    createRadialGradient(...args) {
      calls.push(['createRadialGradient', ...args]);
      return {
        stops: [],
        addColorStop(offset, color) {
          this.stops.push([offset, color]);
        },
      };
    },
  };
}

test('measures bitmap title text using glyph width and spacing', () => {
  assert.equal(measureBitmapText('ps1-world', 7), 371);
  assert.equal(measureBitmapText('cut-up mode', 1.5), 91.5);
});

test('blinks title buttons only on the upper sine pulse', () => {
  assert.equal(getTitleButtonBlink(0), false);
  assert.equal(getTitleButtonBlink(Math.asin(0.8) / 5), true);
});

test('renders title backdrop, logo, buttons, controls, and footer into a canvas context', () => {
  const context = createRecordingContext();

  renderTitleScreen(context, 0.25, {
    buttons: {
      freeRoam: true,
      cutUp: false,
      rogue: false,
    },
  });

  assert.equal(context.imageSmoothingEnabled, false);
  assert.deepEqual(context.calls[0], ['clearRect', 0, 0, TITLE_WIDTH, TITLE_HEIGHT]);
  assert.ok(context.calls.some((call) => (
    call[0] === 'createRadialGradient'
    && call[1] === 256
    && call[2] === 218
    && call[6] === 260
  )));
  assert.ok(context.calls.some((call) => (
    call[0] === 'fillRect'
    && call[1] === '#f0d38a'
    && call[2] === 181
    && call[3] === 264
    && call[4] === 150
    && call[5] === 32
  )));
  const buttonBackplates = context.calls.filter((call) => (
    call[0] === 'fillRect'
    && call[2] === 181
    && call[4] === 150
    && call[5] === 32
  ));
  assert.deepEqual(buttonBackplates.map((call) => call[3]), [264, 310, 356]);
  assert.ok(context.calls.some((call) => call[0] === 'fillRect' && call[1] === '#b42638'));
  assert.ok(context.calls.some((call) => call[0] === 'fillRect' && call[1] === '#8f8a77'));
  assert.equal(TITLE_LAST_COMMIT_MESSAGE, 'last commit polish scenes and gameplay feedback');
});
