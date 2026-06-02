import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseEnemyAnimation } from '../src/enemyAnimation.js';

const model = (...names) => ({
  animations: names.map((name) => ({ name })),
});

test('chooses state-based character animation clips from real GLB names', () => {
  const alienModel = model(
    'Angry_To_Tantrum_Sit',
    'Attack',
    'Checkout_Gesture',
    'Confused_Scratch',
    'Formal_Bow',
    'Listening_Gesture',
  );
  const sentinelModel = model('Confused_Scratch', 'Idle', 'Running');
  const zombieModel = model('Armature|NlaTrack');

  assert.equal(
    chooseEnemyAnimation({ enemyType: 'one-eye-alien', state: 'attack' }, alienModel, { time: 0 }),
    'Attack',
  );
  assert.equal(
    chooseEnemyAnimation({ enemyType: 'molten-sentinel', state: 'chase' }, sentinelModel, { time: 0 }),
    'Running',
  );
  assert.equal(
    chooseEnemyAnimation({ enemyType: 'molten-sentinel', state: 'attack' }, sentinelModel, { time: 0 }),
    'Confused_Scratch',
  );
  assert.equal(
    chooseEnemyAnimation({ enemyType: 'molten-sentinel', state: 'idle' }, sentinelModel, { time: 0 }),
    'Idle',
  );
  assert.equal(
    chooseEnemyAnimation({ enemyType: 'zombie', state: 'chase' }, zombieModel, { time: 0 }),
    'Armature|NlaTrack',
  );
});

test('rotates alien ambient clips while stalking instead of always using the first clip', () => {
  const alienModel = model(
    'Angry_To_Tantrum_Sit',
    'Attack',
    'Checkout_Gesture',
    'Confused_Scratch',
    'Formal_Bow',
    'Listening_Gesture',
  );
  const enemy = { enemyType: 'one-eye-alien', state: 'chase', animationSeed: 0 };

  assert.equal(chooseEnemyAnimation(enemy, alienModel, { time: 0 }), 'Angry_To_Tantrum_Sit');
  assert.equal(chooseEnemyAnimation(enemy, alienModel, { time: 5 }), 'Checkout_Gesture');
  assert.notEqual(chooseEnemyAnimation(enemy, alienModel, { time: 0 }), 'Attack');
  assert.notEqual(chooseEnemyAnimation(enemy, alienModel, { time: 5 }), 'Attack');
});
