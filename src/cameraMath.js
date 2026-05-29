export function createCameraBasis(camera) {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const forward = [sinYaw * cosPitch, sinPitch, cosYaw * cosPitch];
  const right = [cosYaw, 0, -sinYaw];
  const up = cross(forward, right);

  return { forward, right, up };
}

export function cameraView(camera) {
  const { forward, right, up } = createCameraBasis(camera);
  const eye = [camera.x, camera.y, camera.z];

  return new Float32Array([
    right[0], up[0], -forward[0], 0,
    right[1], up[1], -forward[1], 0,
    right[2], up[2], -forward[2], 0,
    -dot(right, eye), -dot(up, eye), dot(forward, eye), 1,
  ]);
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
