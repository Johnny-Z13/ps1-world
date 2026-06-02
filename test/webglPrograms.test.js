import assert from 'node:assert/strict';
import test from 'node:test';

import { createProgram } from '../src/webglPrograms.js';

function createFakeProgramGl({
  shaderCompileStatus = true,
  programLinkStatus = true,
  activeAttributes = [{ name: 'aPosition' }, { name: 'aUv' }],
  activeUniforms = [{ name: 'uLights[0]' }, { name: 'uTime' }],
} = {}) {
  const calls = [];
  let nextId = 1;
  const makeResource = (type) => ({ type, id: nextId++ });
  const gl = {
    VERTEX_SHADER: 'VERTEX_SHADER',
    FRAGMENT_SHADER: 'FRAGMENT_SHADER',
    COMPILE_STATUS: 'COMPILE_STATUS',
    LINK_STATUS: 'LINK_STATUS',
    ACTIVE_ATTRIBUTES: 'ACTIVE_ATTRIBUTES',
    ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
    createShader(type) {
      const shader = makeResource(type);
      calls.push(['createShader', type, shader]);
      return shader;
    },
    shaderSource(...args) {
      calls.push(['shaderSource', ...args]);
    },
    compileShader(...args) {
      calls.push(['compileShader', ...args]);
    },
    getShaderParameter(shader, name) {
      calls.push(['getShaderParameter', shader, name]);
      return shaderCompileStatus;
    },
    getShaderInfoLog(shader) {
      calls.push(['getShaderInfoLog', shader]);
      return 'shader failed';
    },
    createProgram() {
      const program = makeResource('program');
      calls.push(['createProgram', program]);
      return program;
    },
    attachShader(...args) {
      calls.push(['attachShader', ...args]);
    },
    linkProgram(...args) {
      calls.push(['linkProgram', ...args]);
    },
    getProgramParameter(program, name) {
      calls.push(['getProgramParameter', program, name]);
      if (name === 'LINK_STATUS') return programLinkStatus;
      if (name === 'ACTIVE_ATTRIBUTES') return activeAttributes.length;
      if (name === 'ACTIVE_UNIFORMS') return activeUniforms.length;
      return 0;
    },
    getProgramInfoLog(program) {
      calls.push(['getProgramInfoLog', program]);
      return 'program failed';
    },
    getActiveAttrib(program, index) {
      calls.push(['getActiveAttrib', program, index, this === gl]);
      return activeAttributes[index];
    },
    getActiveUniform(program, index) {
      calls.push(['getActiveUniform', program, index, this === gl]);
      return activeUniforms[index];
    },
    getAttribLocation(program, name) {
      calls.push(['getAttribLocation', program, name, this === gl]);
      return `attrib:${name}`;
    },
    getUniformLocation(program, name) {
      calls.push(['getUniformLocation', program, name, this === gl]);
      return `uniform:${name}`;
    },
  };
  return { gl, calls };
}

test('compiles shaders, links a program, and collects attribute and uniform locations', () => {
  const { gl, calls } = createFakeProgramGl();

  const result = createProgram(gl, 'vertex source', 'fragment source');

  assert.equal(result.program.type, 'program');
  assert.deepEqual(result.attributes, {
    aPosition: 'attrib:aPosition',
    aUv: 'attrib:aUv',
  });
  assert.deepEqual(result.uniforms, {
    uLights: 'uniform:uLights',
    uTime: 'uniform:uTime',
  });
  assert.deepEqual(calls.filter(([name]) => name === 'shaderSource').map(([, , source]) => source), [
    'vertex source',
    'fragment source',
  ]);
  assert.equal(calls.filter(([name]) => name === 'attachShader').length, 2);
  assert.ok(calls.some(([name]) => name === 'linkProgram'));
  assert.ok(calls.every((call) => call[0] !== 'getProgramInfoLog'));
});

test('throws shader info log when compilation fails', () => {
  const { gl } = createFakeProgramGl({ shaderCompileStatus: false });

  assert.throws(
    () => createProgram(gl, 'bad vertex', 'fragment source'),
    /shader failed/,
  );
});

test('throws program info log when linking fails', () => {
  const { gl } = createFakeProgramGl({ programLinkStatus: false });

  assert.throws(
    () => createProgram(gl, 'vertex source', 'bad fragment'),
    /program failed/,
  );
});
