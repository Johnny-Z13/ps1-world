export function getLightningStrength(time, lightning) {
  if (!lightning) return 0;

  const interval = lightning.interval ?? 8;
  const duration = lightning.duration ?? 0.4;
  const phase = time % interval;
  if (phase > duration) return 0;

  const envelope = 1 - phase / duration;
  const strobe = Math.sin(phase * 95) > -0.15 ? 1 : 0.35;
  return clamp(envelope * strobe, 0, 1);
}

export function getTorchFlicker(torchLight, index, time) {
  const seed = (torchLight.x ?? 0) * 3.7 + (torchLight.z ?? 0) * 5.1 + index * 9.3;
  const quick = Math.sin(time * 17.0 + seed) * 0.5 + 0.5;
  const slow = Math.sin(time * 5.4 + seed * 1.7) * 0.5 + 0.5;
  const dart = Math.sin(time * 31.0 + seed * 2.3) > 0.86 ? 1 : 0;
  return clamp(quick * 0.55 + slow * 0.3 + dart * 0.25, 0, 1);
}

export function getStaticTorchLightRenderState(torchLight = {}, index = 0, time = 0, active = true) {
  const flicker = getTorchFlicker(torchLight, index, time);
  return {
    position: [torchLight.x ?? 0, torchLight.y ?? 0, torchLight.z ?? 0],
    color: torchLight.color ?? [1, 0.43, 0.12],
    radius: active ? (torchLight.radius ?? 0) * (0.96 + flicker * 0.08) : 0,
    intensity: active ? (torchLight.intensity ?? 0) * (0.72 + flicker * 0.42) : 0,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
