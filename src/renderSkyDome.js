import { bindAttribute } from './webglResources.js';

export function drawSkyDome(glContext, options) {
  const {
    skyDome,
    program,
    mesh,
    time,
    camera,
    viewProjection,
  } = options;
  if (!skyDome || !program || !mesh) return;

  glContext.depthMask(false);
  glContext.disable(glContext.DEPTH_TEST);
  glContext.useProgram(program.program);
  bindAttribute(glContext, program.attributes.aPosition, mesh.position, 3);
  glContext.uniformMatrix4fv(program.uniforms.uViewProjection, false, viewProjection);
  glContext.uniform3f(program.uniforms.uCameraPosition, camera.x, camera.y, camera.z);
  glContext.uniform1f(program.uniforms.uTime, time);
  glContext.uniform1f(program.uniforms.uSkyMode, getSkyDomeMode(skyDome));
  glContext.uniform1f(program.uniforms.uSkyPalette, getSkyDomePalette(skyDome));
  glContext.drawArrays(glContext.TRIANGLES, 0, mesh.count);
  glContext.enable(glContext.DEPTH_TEST);
  glContext.depthMask(true);
}

export function getSkyDomeMode(skyDome) {
  return skyDome.mode === 'clouds' ? 1 : 0;
}

export function getSkyDomePalette(skyDome) {
  if (skyDome.palette === 'electric-blue') return 1;
  if (skyDome.palette === 'psychedelic-purple') return 3;
  if (skyDome.palette === 'liminal-blue') return 4;
  return 0;
}
