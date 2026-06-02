import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clamp,
  multiplyMat4,
  perspective,
} from '../src/renderMath.js';

test('clamps values into an inclusive range', () => {
  assert.equal(clamp(-2, 0, 1), 0);
  assert.equal(clamp(0.5, 0, 1), 0.5);
  assert.equal(clamp(2, 0, 1), 1);
});

test('creates a perspective projection matrix in column-major order', () => {
  const matrix = perspective(Math.PI / 2, 2, 0.5, 50);

  assert.ok(matrix instanceof Float32Array);
  assert.equal(matrix.length, 16);
  assert.equal(round(matrix[0]), 0.5);
  assert.equal(round(matrix[5]), 1);
  assert.equal(matrix[11], -1);
  assert.equal(matrix[15], 0);
});

test('multiplies two 4x4 matrices in the renderer layout', () => {
  const identity = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
  const transform = new Float32Array([
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, 4, 0,
    5, 6, 7, 1,
  ]);

  assert.deepEqual([...multiplyMat4(identity, transform)], [...transform]);
  assert.deepEqual([...multiplyMat4(transform, identity)], [...transform]);
});

function round(value) {
  return Math.round(value * 1000000) / 1000000;
}
