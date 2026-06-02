import { drawQuad } from './renderMeshes.js';

export function drawPostPass(glContext, options) {
  const {
    program,
    sceneTexture,
    quad,
    viewport,
    renderResolution,
    time,
    effects,
    preset,
    oneBit,
    lightningStrength,
    healthEffect,
    healthPickupFlash,
    damageFlash,
    damageScratchOffset,
    damageScratchRotation,
    deathTint,
    deathProgress,
    cutUpFlash,
    cutUpCountdown,
  } = options;

  glContext.useProgram(program.program);
  glContext.activeTexture(glContext.TEXTURE0);
  glContext.bindTexture(glContext.TEXTURE_2D, sceneTexture);
  glContext.uniform1i(program.uniforms.uScene, 0);
  glContext.uniform2f(program.uniforms.uResolution, viewport.width, viewport.height);
  glContext.uniform1f(program.uniforms.uTime, time);
  glContext.uniform1f(program.uniforms.uScanlines, effects.scanlines ? 1 : 0);
  glContext.uniform1f(program.uniforms.uDistortion, effects.crtDistortion ? preset.distortion : 0);
  glContext.uniform1f(program.uniforms.uDither, effects.dither ? 1 : 0);
  glContext.uniform1f(program.uniforms.uNoise, effects.noise ? preset.noise : 0);
  glContext.uniform1f(program.uniforms.uColorBleed, effects.colorBleed ? preset.colorBleed : 0);
  glContext.uniform1f(program.uniforms.uScanlineStrength, preset.scanlineStrength);
  glContext.uniform1f(program.uniforms.uVignette, preset.vignette);
  glContext.uniform1f(program.uniforms.uBrightness, effects.brightness);
  glContext.uniform1f(program.uniforms.uContrast, effects.contrast);
  glContext.uniform1f(program.uniforms.uSaturation, effects.saturation);
  glContext.uniform1f(program.uniforms.uPixelScale, effects.pixelScale);
  glContext.uniform2f(program.uniforms.uSourceResolution, renderResolution.width, renderResolution.height);
  glContext.uniform1f(program.uniforms.uFlipFramebufferY, effects.flipFramebufferY ? 1 : 0);
  glContext.uniform1f(program.uniforms.uOneBit, oneBit ? 1 : 0);
  glContext.uniform1f(program.uniforms.uLightningStrength, lightningStrength);
  glContext.uniform1f(program.uniforms.uHealthDanger, healthEffect.danger);
  glContext.uniform1f(program.uniforms.uHealthPulse, healthEffect.pulse);
  glContext.uniform1f(program.uniforms.uHealthPickupFlash, healthPickupFlash);
  glContext.uniform1f(program.uniforms.uDamageFlash, damageFlash);
  glContext.uniform2f(program.uniforms.uDamageScratchOffset, damageScratchOffset.x, damageScratchOffset.y);
  glContext.uniform1f(program.uniforms.uDamageScratchRotation, damageScratchRotation);
  glContext.uniform1f(program.uniforms.uDeathTint, deathTint);
  glContext.uniform1f(program.uniforms.uDeathProgress, deathProgress);
  glContext.uniform1f(program.uniforms.uCutUpFlash, cutUpFlash);
  glContext.uniform1f(program.uniforms.uCutUpCountdown, cutUpCountdown);
  drawQuad(glContext, program, quad);
}
