import { bindAttribute, createBuffer } from './webglResources.js';

export function drawMesh(glContext, program, mesh) {
  if (!mesh || mesh.count <= 0) return;

  bindAttribute(glContext, program.attributes.aPosition, mesh.position, 3);
  bindAttribute(glContext, program.attributes.aUv, mesh.uv, 2);
  bindAttribute(glContext, program.attributes.aTextureId, mesh.textureId, 1);
  bindAttribute(glContext, program.attributes.aShade, mesh.shade, 1);
  bindAttribute(glContext, program.attributes.aMotion, mesh.motion, 1);
  bindAttribute(glContext, program.attributes.aWarping, mesh.warping, 1);
  glContext.drawArrays(glContext.TRIANGLES, 0, mesh.count);
}

export function createSkyDomeMesh(glContext) {
  const positions = [];
  const rings = 9;
  const segments = 32;
  const bottom = -0.18;

  for (let ring = 0; ring < rings; ring += 1) {
    const v0 = ring / rings;
    const v1 = (ring + 1) / rings;
    const y0 = bottom + (1 - bottom) * v0;
    const y1 = bottom + (1 - bottom) * v1;
    const r0 = Math.sqrt(Math.max(0, 1 - y0 * y0));
    const r1 = Math.sqrt(Math.max(0, 1 - y1 * y1));

    for (let segment = 0; segment < segments; segment += 1) {
      const a0 = segment / segments * Math.PI * 2;
      const a1 = (segment + 1) / segments * Math.PI * 2;
      const p00 = [Math.cos(a0) * r0, y0, Math.sin(a0) * r0];
      const p01 = [Math.cos(a1) * r0, y0, Math.sin(a1) * r0];
      const p10 = [Math.cos(a0) * r1, y1, Math.sin(a0) * r1];
      const p11 = [Math.cos(a1) * r1, y1, Math.sin(a1) * r1];
      positions.push(...p00, ...p10, ...p01, ...p01, ...p10, ...p11);
    }
  }

  return {
    count: positions.length / 3,
    position: createBuffer(glContext, new Float32Array(positions)),
  };
}

export function createPostQuad(glContext) {
  return createBuffer(glContext, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ]));
}

export function drawQuad(glContext, program, buffer) {
  bindAttribute(glContext, program.attributes.aPosition, buffer, 2);
  glContext.drawArrays(glContext.TRIANGLES, 0, 6);
}
