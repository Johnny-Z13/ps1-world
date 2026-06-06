import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRadarBlips,
  drawRadarHud,
  projectRadarPoint,
} from '../src/radarHud.js';

function createFakeContext() {
  const calls = [];
  const context = {
    canvas: { width: 128, height: 128 },
    set fillStyle(value) { calls.push(['fillStyle', value]); },
    set strokeStyle(value) { calls.push(['strokeStyle', value]); },
    set lineWidth(value) { calls.push(['lineWidth', value]); },
    set font(value) { calls.push(['font', value]); },
    set textAlign(value) { calls.push(['textAlign', value]); },
    set textBaseline(value) { calls.push(['textBaseline', value]); },
    clearRect(...args) { calls.push(['clearRect', ...args]); },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    beginPath() { calls.push(['beginPath']); },
    arc(...args) { calls.push(['arc', ...args]); },
    moveTo(...args) { calls.push(['moveTo', ...args]); },
    lineTo(...args) { calls.push(['lineTo', ...args]); },
    closePath() { calls.push(['closePath']); },
    fill() { calls.push(['fill']); },
    stroke() { calls.push(['stroke']); },
    fillText(...args) { calls.push(['fillText', ...args]); },
  };
  return { context, calls };
}

test('projectRadarPoint rotates world offsets into player-forward radar space', () => {
  assert.deepEqual(projectRadarPoint(
    { x: 0, z: 0, yaw: 0 },
    { x: 0, z: 10 },
    { radius: 50, range: 20 },
  ), { x: 0, y: -25, clamped: false });

  assert.deepEqual(projectRadarPoint(
    { x: 0, z: 0, yaw: 0 },
    { x: 10, z: 0 },
    { radius: 50, range: 20 },
  ), { x: 25, y: 0, clamped: false });

  assert.deepEqual(projectRadarPoint(
    { x: 0, z: 0, yaw: Math.PI / 2 },
    { x: 10, z: 0 },
    { radius: 50, range: 20 },
  ), { x: 0, y: -25, clamped: false });
});

test('projectRadarPoint clamps distant blips to the radar edge', () => {
  assert.deepEqual(projectRadarPoint(
    { x: 0, z: 0, yaw: 0 },
    { x: 0, z: 100 },
    { radius: 50, range: 20 },
  ), { x: 0, y: -50, clamped: true });
});

test('createRadarBlips returns live enemy dots and a portal blip', () => {
  const blips = createRadarBlips({
    player: { x: 0, z: 0, yaw: 0 },
    enemies: [
      { x: 0, z: 8, enemyType: 'zombie', state: 'chase' },
      { x: 6, z: 0, enemyType: 'molten-sentinel', state: 'attack' },
      { x: 12, z: 0, enemyType: 'zombie', state: 'dying' },
    ],
    portal: { x: -4, z: 0 },
    radius: 48,
    range: 24,
  });

  assert.deepEqual(blips.map((blip) => blip.type), ['enemy', 'special-enemy', 'portal']);
  assert.equal(blips[0].x, 0);
  assert.equal(blips[0].y, -16);
  assert.equal(blips[2].x, -8);
  assert.equal(blips[2].y, 0);
});

test('drawRadarHud clears and draws the radar frame, compass, player, and blips', () => {
  const { context, calls } = createFakeContext();

  drawRadarHud(context, {
    player: { x: 0, z: 0, yaw: 0 },
    enemies: [{ x: 0, z: 8, enemyType: 'zombie', state: 'chase' }],
    portal: { x: 4, z: 0 },
  });

  assert.deepEqual(calls[0], ['clearRect', 0, 0, 128, 128]);
  assert.ok(calls.some((call) => call[0] === 'fillText' && call[1] === 'N'));
  assert.ok(calls.some((call) => call[0] === 'fillStyle' && call[1] === 'rgba(255, 64, 48, 0.92)'));
  assert.ok(calls.some((call) => call[0] === 'fillStyle' && call[1] === 'rgba(64, 255, 205, 0.9)'));
});
