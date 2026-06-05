import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getActiveEmitterDecisions,
  getActiveSoundZoneDecision,
} from '../src/soundZoneRuntime.js';

test('selects the strongest active sound zone and ignores disabled zones', () => {
  const world = {
    soundZones: [
      { id: 'silent', soundZoneType: 'silence', gain: 0.1, x: 0, y: 0, z: 0, width: 5, depth: 5, height: 3 },
      { id: 'disabled', enabled: false, soundZoneType: 'radio_bleed', x: 0, y: 0, z: 0, width: 20, depth: 20, height: 3 },
    ],
  };

  assert.deepEqual(getActiveSoundZoneDecision(world, { x: 0, y: 0, z: 0 }), {
    id: 'silent',
    type: 'silence',
    soundId: undefined,
    targetBus: 'ambience',
    gain: 0.1,
  });
});

test('prefers nearest active sound zone when priorities match', () => {
  const world = {
    soundZones: [
      { id: 'far-radio', soundZoneType: 'radio_bleed', x: 4, y: 0, z: 0, width: 10, depth: 10, height: 3 },
      { id: 'near-radio', soundZoneType: 'radio_bleed', x: 1, y: 0, z: 0, width: 10, depth: 10, height: 3 },
    ],
  };

  assert.equal(getActiveSoundZoneDecision(world, { x: 0, y: 0, z: 0 }).id, 'near-radio');
});

test('returns nearby emitter decisions ordered by distance', () => {
  const world = {
    emitters: [
      { emitterId: 'spark', emitterType: 'spark', soundId: 'stinger', x: 2, y: 0, z: 0, radius: 6, gain: 0.4 },
      { emitterId: 'far', emitterType: 'hum', x: 20, y: 0, z: 0, radius: 3 },
    ],
  };

  const decisions = getActiveEmitterDecisions(world, { x: 0, y: 0, z: 0 });

  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].id, 'spark');
  assert.equal(decisions[0].distance, 2);
  assert.equal(decisions[0].gain, 0.4);
});

test('ignores visual-only emitters that do not declare a sound id', () => {
  const world = {
    emitters: [
      { emitterId: 'smoke', emitterType: 'black_smoke', x: 0, y: 0, z: 0, radius: 8, gain: 0.5 },
    ],
  };

  assert.deepEqual(getActiveEmitterDecisions(world, { x: 0, y: 0, z: 0 }), []);
});
