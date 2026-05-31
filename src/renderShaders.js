import { MOTION_CODES } from './generatedTextures.js';

const shaderFloat = (value) => value.toFixed(1);

export const skyVertexShader = `
attribute vec3 aPosition;

uniform mat4 uViewProjection;
uniform vec3 uCameraPosition;

varying vec3 vSkyDirection;
varying float vSkyHeight;

void main() {
  vSkyDirection = normalize(aPosition);
  vSkyHeight = clamp(aPosition.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 worldPosition = uCameraPosition + aPosition * 72.0;
  gl_Position = uViewProjection * vec4(worldPosition, 1.0);
}
`;

export const skyFragmentShader = `
precision mediump float;

uniform float uTime;
uniform float uSkyMode;
uniform float uSkyPalette;

varying vec3 vSkyDirection;
varying float vSkyHeight;

float hashSky(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hashSky(i + vec2(0.0, 0.0)), hashSky(i + vec2(1.0, 0.0)), u.x),
    mix(hashSky(i + vec2(0.0, 1.0)), hashSky(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float starField(vec3 direction) {
  vec2 p = vec2(atan(direction.z, direction.x) * 18.0, direction.y * 24.0);
  float tiny = step(0.985, hashSky(floor(p * 4.0)));
  float bright = step(0.996, hashSky(floor(p * 9.0) + 41.0));
  float horizonFade = smoothstep(0.08, 0.44, direction.y);
  return clamp(tiny * 0.48 + bright, 0.0, 1.0) * horizonFade;
}

vec3 starrySky(vec3 direction) {
  vec3 horizon = vec3(0.055, 0.040, 0.075);
  vec3 zenith = vec3(0.005, 0.006, 0.025);
  if (uSkyPalette > 1.5) {
    horizon = vec3(0.12, 0.10, 0.075);
    zenith = vec3(0.025, 0.020, 0.015);
  }
  float swirl = valueNoise(direction.xz * 2.6 + vec2(uTime * 0.015, 0.0));
  vec3 color = mix(horizon, zenith, smoothstep(0.0, 0.92, vSkyHeight));
  color += vec3(0.08, 0.05, 0.13) * smoothstep(0.46, 0.86, swirl) * smoothstep(0.1, 0.9, vSkyHeight);
  color += vec3(1.0, 0.92, 0.68) * starField(direction);
  return color;
}

vec3 cloudSky(vec3 direction) {
  vec3 horizon = vec3(0.22, 0.55, 0.88);
  vec3 zenith = vec3(0.05, 0.18, 0.72);
  vec3 cloudColor = vec3(0.72, 0.88, 0.98);
  vec3 weirdGlow = vec3(0.22, 0.04, 0.32);
  float cloudStrength = 0.72;
  float weirdStrength = 0.18;
  if (uSkyPalette > 3.5) {
    horizon = vec3(0.68, 0.84, 0.96);
    zenith = vec3(0.22, 0.54, 0.86);
    cloudColor = vec3(0.93, 0.97, 1.0);
    weirdGlow = vec3(0.72, 0.88, 1.0);
    cloudStrength = 0.38;
    weirdStrength = 0.08;
  } else if (uSkyPalette > 2.5) {
    horizon = vec3(0.18, 0.025, 0.28);
    zenith = vec3(0.015, 0.002, 0.075);
    cloudColor = vec3(0.95, 0.13, 0.86);
    weirdGlow = vec3(0.08, 0.95, 0.62);
    cloudStrength = 0.84;
    weirdStrength = 0.42;
  }
  vec3 color = mix(horizon, zenith, smoothstep(0.02, 0.95, vSkyHeight));
  vec2 p = vec2(atan(direction.z, direction.x) * 2.4, direction.y * 3.2);
  float clouds = valueNoise(p * 2.0 + vec2(uTime * 0.018, 0.0));
  clouds += valueNoise(p * 4.6 + vec2(4.0, uTime * 0.01)) * 0.5;
  float cloudBand = smoothstep(0.54, 1.04, clouds) * smoothstep(-0.05, 0.36, direction.y) * (1.0 - smoothstep(0.82, 1.0, direction.y));
  color = mix(color, cloudColor, cloudBand * cloudStrength);
  color += weirdGlow * smoothstep(0.62, 0.94, valueNoise(p * 1.2 + 8.0)) * weirdStrength;
  if (uSkyPalette > 2.5) {
    float spiral = sin(atan(direction.z, direction.x) * 7.0 + direction.y * 18.0 + uTime * 0.32) * 0.5 + 0.5;
    vec3 spiralA = uSkyPalette > 3.5 ? vec3(0.62, 0.78, 1.0) : vec3(0.42, 0.02, 0.95);
    vec3 spiralB = uSkyPalette > 3.5 ? vec3(0.92, 0.98, 1.0) : vec3(0.0, 0.85, 0.58);
    float spiralStrength = uSkyPalette > 3.5 ? 0.055 : 0.22;
    color += mix(spiralA, spiralB, spiral) * smoothstep(0.08, 0.78, vSkyHeight) * spiralStrength;
  }
  return color;
}

void main() {
  vec3 direction = normalize(vSkyDirection);
  vec3 color = uSkyMode > 0.5 ? cloudSky(direction) : starrySky(direction);
  gl_FragColor = vec4(color, 1.0);
}
`;

export const sceneVertexShader = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute float aTextureId;
attribute float aShade;
attribute float aMotion;

uniform mat4 uViewProjection;
uniform float uTime;
uniform float uWarping;
uniform highp float uShootingStarTextureId;

varying vec2 vUv;
varying float vTextureId;
varying float vShade;
varying float vMotion;
varying vec3 vWorldPosition;

void main() {
  vec3 warped = aPosition;
  float shootingStarMask = 1.0 - step(0.5, abs(aTextureId - uShootingStarTextureId));
  float shootingStarPhase = mod(uTime, 9.0);
  float shootingStarTravel = clamp((shootingStarPhase - 1.25) / 2.4, 0.0, 1.0);
  warped += vec3(shootingStarTravel * 52.0, -shootingStarTravel * 9.0, 0.0) * shootingStarMask;
  float swayMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES.sway)}));
  float fireflyMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES.firefly)}));
  float leafMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES['falling-leaf'])}));
  float moonMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES['moon-slide'])}));
  float bobMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES.bob)}));
  float orbitMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES.orbit)}));
  float cometMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES['flicker-comet'])}));
  float palmMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES['palm-snap'])}));
  float waterMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES['water-shimmer'])}));
  float zombieMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES['zombie-walk'])}));
  float torchFlameMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES['torch-flame'])}));
  float pickupMask = 1.0 - step(0.5, abs(aMotion - ${shaderFloat(MOTION_CODES['pickup-bob'])}));
  warped.x += sin(uTime * 1.5 + aPosition.z * 1.8) * 0.24 * swayMask;
  warped.x += sin(uTime * 2.8 + aPosition.y * 3.0) * 0.7 * fireflyMask;
  warped.y += sin(uTime * 3.2 + aPosition.x * 2.0) * 0.36 * fireflyMask;
  float leafGust = floor(mod(uTime * 4.4 + aPosition.x * 0.41 + aPosition.z * 0.23, 6.0));
  warped.y -= leafGust * 0.42 * leafMask;
  warped.x += (leafGust * 0.34 + sin(uTime * 5.6 + aPosition.z * 1.7) * 0.46) * leafMask;
  warped.z += sin(uTime * 3.8 + aPosition.x * 1.2) * 0.32 * leafMask;
  warped.x += floor(mod(uTime * 0.8, 5.0)) * 0.22 * moonMask;
  warped.y += sin(uTime * 1.3 + aPosition.x) * 0.55 * bobMask;
  vec2 orbitCenter = vec2(0.0, -7.0);
  vec2 localOrbit = warped.xz - orbitCenter;
  float orbitAngle = uTime * 0.75;
  vec2 rotatedOrbit = vec2(
    localOrbit.x * cos(orbitAngle) - localOrbit.y * sin(orbitAngle),
    localOrbit.x * sin(orbitAngle) + localOrbit.y * cos(orbitAngle)
  ) + orbitCenter;
  warped.xz = mix(warped.xz, rotatedOrbit, orbitMask);
  warped.x += floor(mod(uTime * 2.0 + aPosition.y, 2.0)) * 1.1 * cometMask;
  warped.x += floor(mod(uTime * 2.0 + aPosition.x, 3.0)) * 0.22 * palmMask;
  warped.y += sin(uTime * 5.0 + aPosition.x) * 0.04 * waterMask;
  warped.x += sin(uTime * 6.5 + aPosition.y * 7.0) * 0.08 * zombieMask;
  warped.y += abs(sin(uTime * 5.5 + aPosition.x)) * 0.08 * zombieMask;
  warped.x += sin(uTime * 17.0 + aPosition.y * 11.0) * 0.06 * torchFlameMask;
  warped.y += floor(mod(uTime * 14.0 + aPosition.x * 3.0, 2.0)) * 0.08 * torchFlameMask;
  warped.y += (sin(uTime * 3.6 + aPosition.x * 1.7) * 0.12 + 0.12) * pickupMask;
  float wobble = sin((aPosition.x + aPosition.z) * 8.0 + uTime * 6.0) * 0.006;
  warped.xz += vec2(wobble, -wobble) * uWarping;

  vec4 clip = uViewProjection * vec4(warped, 1.0);
  vec2 snapped = floor((clip.xy / clip.w) * vec2(160.0, 120.0)) / vec2(160.0, 120.0);
  clip.xy = mix(clip.xy, snapped * clip.w, uWarping);

  gl_Position = clip;
  vUv = aUv;
  vTextureId = aTextureId;
  vShade = aShade;
  vMotion = aMotion;
  vWorldPosition = warped;
}
`;

export const sceneFragmentShader = `
precision mediump float;

uniform sampler2D uAtlas;
uniform float uTextureCount;
uniform highp float uTime;
uniform float uOneBit;
uniform float uLightningTextureId;
uniform float uLightningStrength;
uniform float uRainTextureId;
uniform highp float uShootingStarTextureId;
uniform vec3 uTorchPosition;
uniform vec3 uTorchColor;
uniform float uTorchRadius;
uniform float uTorchIntensity;
uniform float uTorchEnabled;
uniform float uStaticTorchCount;
uniform vec3 uStaticTorchPosition0;
uniform vec3 uStaticTorchColor0;
uniform float uStaticTorchRadius0;
uniform float uStaticTorchIntensity0;
uniform vec3 uStaticTorchPosition1;
uniform vec3 uStaticTorchColor1;
uniform float uStaticTorchRadius1;
uniform float uStaticTorchIntensity1;
uniform vec3 uStaticTorchPosition2;
uniform vec3 uStaticTorchColor2;
uniform float uStaticTorchRadius2;
uniform float uStaticTorchIntensity2;

varying vec2 vUv;
varying float vTextureId;
varying float vShade;
varying float vMotion;
varying vec3 vWorldPosition;

float orderedDither(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float x = q.x;
  float y = q.y;
  if (y < 0.5) {
    if (x < 0.5) return 0.0 / 16.0;
    if (x < 1.5) return 8.0 / 16.0;
    if (x < 2.5) return 2.0 / 16.0;
    return 10.0 / 16.0;
  }
  if (y < 1.5) {
    if (x < 0.5) return 12.0 / 16.0;
    if (x < 1.5) return 4.0 / 16.0;
    if (x < 2.5) return 14.0 / 16.0;
    return 6.0 / 16.0;
  }
  if (y < 2.5) {
    if (x < 0.5) return 3.0 / 16.0;
    if (x < 1.5) return 11.0 / 16.0;
    if (x < 2.5) return 1.0 / 16.0;
    return 9.0 / 16.0;
  }
  if (x < 0.5) return 15.0 / 16.0;
  if (x < 1.5) return 7.0 / 16.0;
  if (x < 2.5) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

void main() {
  float id = floor(vTextureId + 0.5);
  float signMask = 1.0 - step(0.5, abs(vMotion - ${shaderFloat(MOTION_CODES['sign-flicker'])}));
  float windowMask = 1.0 - step(0.5, abs(vMotion - ${shaderFloat(MOTION_CODES['window-pulse'])}));
  float cometMask = 1.0 - step(0.5, abs(vMotion - ${shaderFloat(MOTION_CODES['flicker-comet'])}));
  float torchFlameMask = 1.0 - step(0.5, abs(vMotion - ${shaderFloat(MOTION_CODES['torch-flame'])}));
  if (signMask > 0.5 && sin(uTime * 18.0) < -0.58) {
    discard;
  }
  if (cometMask > 0.5 && floor(mod(uTime * 3.0, 2.0)) < 0.5) {
    discard;
  }
  float shootingStarMask = 1.0 - step(0.5, abs(id - uShootingStarTextureId));
  float shootingStarPhase = mod(uTime, 9.0);
  if (shootingStarMask > 0.5 && (shootingStarPhase < 1.25 || shootingStarPhase > 3.65)) {
    discard;
  }

  vec2 tiled = fract(vUv);
  float rainMask = 1.0 - step(0.5, abs(id - uRainTextureId));
  tiled.y = fract(tiled.y + uTime * 2.4 * rainMask);
  vec2 atlasUv = vec2((id + tiled.x) / uTextureCount, tiled.y);
  vec4 texel = texture2D(uAtlas, atlasUv);
  if (texel.a < 0.1) {
    discard;
  }

  float posterize = floor(vShade * 5.0) / 5.0;
  vec3 color = texel.rgb * posterize;
  float torchDistance = distance(vWorldPosition, uTorchPosition);
  float torchFalloff = clamp(1.0 - torchDistance / max(uTorchRadius, 0.001), 0.0, 1.0);
  torchFalloff *= torchFalloff * uTorchEnabled;
  color *= 1.0 + torchFalloff * 0.38;
  color += uTorchColor * torchFalloff * uTorchIntensity * 0.34;
  float staticTorch0 = clamp(1.0 - distance(vWorldPosition, uStaticTorchPosition0) / max(uStaticTorchRadius0, 0.001), 0.0, 1.0);
  float staticTorch1 = clamp(1.0 - distance(vWorldPosition, uStaticTorchPosition1) / max(uStaticTorchRadius1, 0.001), 0.0, 1.0);
  float staticTorch2 = clamp(1.0 - distance(vWorldPosition, uStaticTorchPosition2) / max(uStaticTorchRadius2, 0.001), 0.0, 1.0);
  staticTorch0 *= staticTorch0 * step(0.5, uStaticTorchCount);
  staticTorch1 *= staticTorch1 * step(1.5, uStaticTorchCount);
  staticTorch2 *= staticTorch2 * step(2.5, uStaticTorchCount);
  float flameFlicker = 0.82 + step(0.0, sin(uTime * 18.0 + gl_FragCoord.x * 0.19)) * 0.18;
  color *= 1.0 + (staticTorch0 * uStaticTorchIntensity0 + staticTorch1 * uStaticTorchIntensity1 + staticTorch2 * uStaticTorchIntensity2) * 0.28 * flameFlicker;
  color += uStaticTorchColor0 * staticTorch0 * uStaticTorchIntensity0 * 0.34 * flameFlicker;
  color += uStaticTorchColor1 * staticTorch1 * uStaticTorchIntensity1 * 0.34 * flameFlicker;
  color += uStaticTorchColor2 * staticTorch2 * uStaticTorchIntensity2 * 0.34 * flameFlicker;
  color = mix(color, color * (1.05 + flameFlicker * 0.55) + vec3(0.42, 0.14, 0.01), torchFlameMask);
  color *= mix(1.0, step(0.0, sin(uTime * 2.5 + gl_FragCoord.x * 0.03)) * 0.85 + 0.15, windowMask);
  float lightningMask = 1.0 - step(0.5, abs(id - uLightningTextureId));
  color = mix(color, vec3(0.15 + uLightningStrength * 1.7), lightningMask);
  color = mix(color, color + vec3(0.18, 0.32, 0.34), rainMask);
  float oneBitTone = dot(color, vec3(0.299, 0.587, 0.114));
  float oneBitDepth = floor(clamp(oneBitTone + orderedDither(gl_FragCoord.xy) * 0.18, 0.0, 1.0) * 4.0) / 3.0;
  vec3 oneBitInk = vec3(0.09, 0.075, 0.055);
  vec3 oneBitMid = vec3(0.36, 0.30, 0.20);
  vec3 oneBitPaper = vec3(0.86, 0.82, 0.67);
  vec3 oneBitAccent = vec3(0.18, 0.42, 0.48);
  vec3 oneBitTonal = mix(oneBitInk, oneBitMid, smoothstep(0.05, 0.62, oneBitDepth));
  oneBitTonal = mix(oneBitTonal, oneBitPaper, smoothstep(0.48, 1.0, oneBitDepth));
  float oneBitChromatic = clamp((color.b - color.r) * 0.28 + (staticTorch0 + staticTorch1 + staticTorch2) * 0.035, 0.0, 0.18);
  oneBitTonal = mix(oneBitTonal, oneBitAccent, oneBitChromatic);
  color = mix(color, oneBitTonal, uOneBit);
  gl_FragColor = vec4(color, 1.0);
}
`;

export const postVertexShader = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const postFragmentShader = `
precision mediump float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScanlines;
uniform float uDistortion;
uniform float uDither;
uniform float uNoise;
uniform float uColorBleed;
uniform float uScanlineStrength;
uniform float uVignette;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uPixelScale;
uniform vec2 uSourceResolution;
uniform float uFlipFramebufferY;
uniform float uOneBit;
uniform float uLightningStrength;
uniform float uHealthDanger;
uniform float uHealthPulse;
uniform float uHealthPickupFlash;
uniform float uDamageFlash;
uniform vec2 uDamageScratchOffset;
uniform float uDamageScratchRotation;
uniform float uDeathTint;
uniform float uDeathProgress;
uniform float uCutUpFlash;
uniform float uCutUpCountdown;

varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
}

float orderedDither(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float x = q.x;
  float y = q.y;
  if (y < 0.5) {
    if (x < 0.5) return 0.0 / 16.0;
    if (x < 1.5) return 8.0 / 16.0;
    if (x < 2.5) return 2.0 / 16.0;
    return 10.0 / 16.0;
  }
  if (y < 1.5) {
    if (x < 0.5) return 12.0 / 16.0;
    if (x < 1.5) return 4.0 / 16.0;
    if (x < 2.5) return 14.0 / 16.0;
    return 6.0 / 16.0;
  }
  if (y < 2.5) {
    if (x < 0.5) return 3.0 / 16.0;
    if (x < 1.5) return 11.0 / 16.0;
    if (x < 2.5) return 1.0 / 16.0;
    return 9.0 / 16.0;
  }
  if (x < 0.5) return 15.0 / 16.0;
  if (x < 1.5) return 7.0 / 16.0;
  if (x < 2.5) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

float bloodParticle(vec2 uv, vec2 center, float radius, float seed) {
  vec2 stretched = vec2((uv.x - center.x) * 1.45, uv.y - center.y);
  float distanceToDrop = length(stretched);
  float splat = 1.0 - smoothstep(radius * 0.58, radius, distanceToDrop);
  float grain = step(0.34, rand(floor(uv * 180.0 + seed)));
  float dripY = smoothstep(center.y - 0.22, center.y, uv.y) * (1.0 - step(center.y, uv.y));
  float drip = dripY
    * (1.0 - smoothstep(radius * 0.18, radius * 0.56, abs(uv.x - center.x)));
  return max(splat * grain, drip * 0.42);
}

float clawScratch(vec2 uv, vec2 start, float angle, float length, float width) {
  vec2 direction = vec2(cos(angle), sin(angle));
  vec2 normal = vec2(-direction.y, direction.x);
  vec2 relative = uv - start;
  float along = dot(relative, direction);
  float across = abs(dot(relative, normal));
  float taper = smoothstep(0.0, 0.08, along) * (1.0 - smoothstep(length * 0.82, length, along));
  float groove = 1.0 - smoothstep(width * 0.45, width, across);
  return groove * taper;
}

float pixelBox(vec2 p, vec2 minCorner, vec2 size) {
  vec2 inside = step(minCorner, p) * step(p, minCorner + size);
  return inside.x * inside.y;
}

float pixelLetter(vec2 p, float code) {
  float mask = 0.0;
  if (code < 0.5) {
    mask += pixelBox(p, vec2(0.62, 0.08), vec2(0.22, 0.68));
    mask += pixelBox(p, vec2(0.18, 0.08), vec2(0.66, 0.18));
    mask += pixelBox(p, vec2(0.18, 0.08), vec2(0.18, 0.34));
  } else if (code < 1.5) {
    mask += pixelBox(p, vec2(0.14, 0.12), vec2(0.18, 0.76));
    mask += pixelBox(p, vec2(0.68, 0.12), vec2(0.18, 0.76));
    mask += pixelBox(p, vec2(0.14, 0.08), vec2(0.72, 0.18));
  } else if (code < 2.5) {
    mask += pixelBox(p, vec2(0.12, 0.08), vec2(0.18, 0.80));
    mask += pixelBox(p, vec2(0.70, 0.08), vec2(0.18, 0.80));
    mask += pixelBox(p, vec2(0.30, 0.36), vec2(0.16, 0.32));
    mask += pixelBox(p, vec2(0.54, 0.36), vec2(0.16, 0.32));
  } else {
    mask += pixelBox(p, vec2(0.14, 0.08), vec2(0.18, 0.80));
    mask += pixelBox(p, vec2(0.14, 0.70), vec2(0.52, 0.18));
    mask += pixelBox(p, vec2(0.66, 0.44), vec2(0.18, 0.26));
    mask += pixelBox(p, vec2(0.14, 0.36), vec2(0.52, 0.18));
  }
  return clamp(mask, 0.0, 1.0);
}

float pixelDigit(vec2 p, float digit) {
  float top = pixelBox(p, vec2(0.18, 0.74), vec2(0.64, 0.15));
  float middle = pixelBox(p, vec2(0.18, 0.43), vec2(0.64, 0.14));
  float bottom = pixelBox(p, vec2(0.18, 0.10), vec2(0.64, 0.15));
  float upperLeft = pixelBox(p, vec2(0.12, 0.48), vec2(0.16, 0.32));
  float upperRight = pixelBox(p, vec2(0.72, 0.48), vec2(0.16, 0.32));
  float lowerLeft = pixelBox(p, vec2(0.12, 0.16), vec2(0.16, 0.32));
  float lowerRight = pixelBox(p, vec2(0.72, 0.16), vec2(0.16, 0.32));
  if (digit < 1.5) return clamp(upperRight + lowerRight, 0.0, 1.0);
  if (digit < 2.5) return clamp(top + upperRight + middle + lowerLeft + bottom, 0.0, 1.0);
  return clamp(top + upperRight + middle + lowerRight + bottom, 0.0, 1.0);
}

float cutUpCountdownMask(vec2 uv) {
  if (uCutUpCountdown < 0.5) return 0.0;
  vec2 wordUv = (uv - vec2(0.39, 0.525)) / vec2(0.22, 0.07);
  vec2 numberUv = (uv - vec2(0.465, 0.395)) / vec2(0.07, 0.11);
  float wordMask = 0.0;
  if (wordUv.x >= 0.0 && wordUv.y >= 0.0 && wordUv.x <= 1.0 && wordUv.y <= 1.0) {
    vec2 wordCell = vec2(fract(wordUv.x * 4.0), wordUv.y);
    float wordIndex = floor(wordUv.x * 4.0);
    wordMask += pixelLetter(wordCell, 0.0) * (1.0 - step(0.5, abs(wordIndex - 0.0)));
    wordMask += pixelLetter(wordCell, 1.0) * (1.0 - step(0.5, abs(wordIndex - 1.0)));
    wordMask += pixelLetter(wordCell, 2.0) * (1.0 - step(0.5, abs(wordIndex - 2.0)));
    wordMask += pixelLetter(wordCell, 3.0) * (1.0 - step(0.5, abs(wordIndex - 3.0)));
  }
  float numberMask = 0.0;
  if (numberUv.x >= 0.0 && numberUv.y >= 0.0 && numberUv.x <= 1.0 && numberUv.y <= 1.0) {
    numberMask = pixelDigit(numberUv, uCutUpCountdown);
  }
  return clamp(max(wordMask, numberMask), 0.0, 1.0);
}

void main() {
  vec2 sourceUv = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, uFlipFramebufferY));
  vec2 centered = sourceUv * 2.0 - 1.0;
  float r2 = dot(centered, centered);
  vec2 uv = sourceUv + centered * r2 * uDistortion;

  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 chunkySize = uSourceResolution / max(uPixelScale, 1.0);
  uv = (floor(uv * chunkySize) + 0.5) / chunkySize;

  float bleed = uColorBleed;
  vec3 color;
  color.r = texture2D(uScene, uv + vec2(bleed, 0.0)).r;
  color.g = texture2D(uScene, uv).g;
  color.b = texture2D(uScene, uv - vec2(bleed, 0.0)).b;

  float scan = 1.0 - (sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5) * uScanlineStrength * uScanlines;
  color *= scan;

  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luminance), color, uSaturation);
  color = (color - 0.5) * uContrast + 0.5;
  color *= uBrightness;

  if (uDither > 0.5) {
    float threshold = rand(floor(gl_FragCoord.xy)) - 0.5;
    color += threshold / 32.0;
    color = floor(color * 32.0) / 32.0;
  }

  color += (rand(gl_FragCoord.xy + uTime) - 0.5) * uNoise;
  color *= 1.0 - r2 * uVignette;
  color += vec3(0.42, 0.62, 0.75) * uLightningStrength;
  float cutUpCountdown = cutUpCountdownMask(sourceUv);
  vec3 cutUpCountdownColor = vec3(1.0, 0.86, 0.34) * scan + vec3(0.35, 0.12, 0.02) * orderedDither(gl_FragCoord.xy);
  color = mix(color, cutUpCountdownColor, cutUpCountdown);
  float oneBitTone = dot(color, vec3(0.299, 0.587, 0.114));
  float oneBitDepth = floor(clamp(oneBitTone + orderedDither(gl_FragCoord.xy) * 0.16, 0.0, 1.0) * 5.0) / 4.0;
  vec3 oneBitInk = vec3(0.09, 0.075, 0.055);
  vec3 oneBitMid = vec3(0.34, 0.28, 0.19);
  vec3 oneBitPaper = vec3(0.86, 0.82, 0.67);
  vec3 oneBitAccent = vec3(0.20, 0.45, 0.52);
  vec3 oneBitGrade = mix(oneBitInk, oneBitMid, smoothstep(0.06, 0.58, oneBitDepth));
  oneBitGrade = mix(oneBitGrade, oneBitPaper, smoothstep(0.48, 1.0, oneBitDepth));
  oneBitGrade += oneBitAccent * smoothstep(0.42, 1.0, oneBitDepth) * 0.08;
  color = mix(color, oneBitGrade, uOneBit * 0.86);
  float damageScratch = 0.0;
  damageScratch += clawScratch(sourceUv, vec2(0.18, 0.22) + uDamageScratchOffset, 0.74 + uDamageScratchRotation, 0.62, 0.014);
  damageScratch += clawScratch(sourceUv, vec2(0.32, 0.18) + uDamageScratchOffset, 0.74 + uDamageScratchRotation, 0.58, 0.012);
  damageScratch += clawScratch(sourceUv, vec2(0.47, 0.17) + uDamageScratchOffset, 0.74 + uDamageScratchRotation, 0.54, 0.011);
  float damagePulse = clamp(uDamageFlash, 0.0, 1.0);
  color = mix(color, vec3(0.9, 0.0, 0.02), damagePulse * 0.38);
  color = mix(color, vec3(1.0, 0.02, 0.02), clamp(damageScratch * damagePulse * 1.1, 0.0, 0.88));
  color *= 1.0 - uHealthDanger * 0.28;
  color = mix(color, vec3(0.58, 0.015, 0.01), clamp(uHealthDanger * 0.2 + uHealthPulse * 0.18, 0.0, 0.42));
  color = mix(color, color + vec3(0.2, 0.95, 0.24), clamp(uHealthPickupFlash * 0.58, 0.0, 0.72));
  float blood = 0.0;
  blood += bloodParticle(sourceUv, vec2(0.20, 0.72), 0.18, 3.0);
  blood += bloodParticle(sourceUv, vec2(0.77, 0.63), 0.14, 11.0);
  blood += bloodParticle(sourceUv, vec2(0.48, 0.38), 0.24, 23.0);
  float finalBlood = smoothstep(0.80, 1.0, uDeathProgress);
  blood += bloodParticle(sourceUv, vec2(0.32, 0.54), 0.26, 31.0) * finalBlood;
  blood += bloodParticle(sourceUv, vec2(0.66, 0.78), 0.22, 41.0) * finalBlood;
  blood += bloodParticle(sourceUv, vec2(0.56, 0.24), 0.20, 53.0) * finalBlood;
  blood *= smoothstep(0.18, 0.62, uDeathProgress);
  color = mix(color, vec3(0.58, 0.0, 0.015), clamp(blood, 0.0, 0.94));
  color = mix(color, vec3(0.78, 0.02, 0.02), uDeathTint);
  color = mix(color, vec3(1.0), uCutUpFlash);

  gl_FragColor = vec4(color, 1.0);
}
`;
