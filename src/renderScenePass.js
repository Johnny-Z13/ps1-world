import { drawMesh } from './renderMeshes.js';
import { getStaticTorchLightRenderState } from './sceneEffects.js';

const MAX_STATIC_TORCH_LIGHTS = 3;

export function drawScenePass(glContext, options) {
  const {
    program,
    atlasTexture,
    textureCount,
    textureIndices,
    time,
    oneBit,
    lightningTexture,
    lightningStrength,
    rainTexture,
    shootingStarTexture,
    warping,
    player,
    playerTorch,
    playerTorchEnabled,
    torchLights,
    viewProjection,
    staticMesh,
    lookAtMesh,
    dynamicMesh,
  } = options;

  glContext.useProgram(program.program);
  glContext.activeTexture(glContext.TEXTURE0);
  glContext.bindTexture(glContext.TEXTURE_2D, atlasTexture);
  glContext.uniform1i(program.uniforms.uAtlas, 0);
  glContext.uniform1f(program.uniforms.uTextureCount, textureCount);
  glContext.uniform1f(program.uniforms.uTime, time);
  glContext.uniform1f(program.uniforms.uOneBit, oneBit ? 1 : 0);
  glContext.uniform1f(program.uniforms.uLightningTextureId, getTextureIndex(textureIndices, lightningTexture));
  glContext.uniform1f(program.uniforms.uLightningStrength, lightningStrength);
  glContext.uniform1f(program.uniforms.uRainTextureId, getTextureIndex(textureIndices, rainTexture));
  glContext.uniform1f(program.uniforms.uShootingStarTextureId, getTextureIndex(textureIndices, shootingStarTexture));
  glContext.uniform1f(program.uniforms.uWarping, warping ? 1 : 0);
  glContext.uniform3f(program.uniforms.uTorchPosition, player.x, player.y + 0.25, player.z);
  glContext.uniform3f(program.uniforms.uTorchColor, ...(playerTorch?.color ?? [1, 0.55, 0.22]));
  glContext.uniform1f(program.uniforms.uTorchRadius, playerTorch?.radius ?? 0);
  glContext.uniform1f(program.uniforms.uTorchIntensity, playerTorch?.intensity ?? 0);
  glContext.uniform1f(program.uniforms.uTorchEnabled, playerTorchEnabled && playerTorch ? 1 : 0);
  setStaticTorchUniforms(glContext, program, torchLights ?? [], time);
  glContext.uniformMatrix4fv(program.uniforms.uViewProjection, false, viewProjection);
  drawMesh(glContext, program, staticMesh);
  drawMesh(glContext, program, lookAtMesh);
  drawMesh(glContext, program, dynamicMesh);
}

export function setStaticTorchUniforms(glContext, program, torchLights, time) {
  const count = Math.min(torchLights.length, MAX_STATIC_TORCH_LIGHTS);
  if (program.uniforms.uStaticTorchCount) {
    glContext.uniform1f(program.uniforms.uStaticTorchCount, count);
  }

  for (let i = 0; i < MAX_STATIC_TORCH_LIGHTS; i += 1) {
    const torchLight = torchLights[i] ?? {};
    const light = getStaticTorchLightRenderState(torchLight, i, time, i < count);
    const positionLocation = program.uniforms[`uStaticTorchPosition${i}`];
    const colorLocation = program.uniforms[`uStaticTorchColor${i}`];
    const radiusLocation = program.uniforms[`uStaticTorchRadius${i}`];
    const intensityLocation = program.uniforms[`uStaticTorchIntensity${i}`];

    if (positionLocation) glContext.uniform3f(positionLocation, ...light.position);
    if (colorLocation) glContext.uniform3f(colorLocation, ...light.color);
    if (radiusLocation) glContext.uniform1f(radiusLocation, light.radius);
    if (intensityLocation) glContext.uniform1f(intensityLocation, light.intensity);
  }
}

function getTextureIndex(textureIndices, id) {
  if (!id) return -1;
  return textureIndices.get(id) ?? -1;
}
