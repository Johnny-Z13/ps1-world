const DEFAULT_RADAR_RADIUS = 52;
const DEFAULT_RADAR_RANGE = 34;

export function projectRadarPoint(player, target, options = {}) {
  const radius = options.radius ?? DEFAULT_RADAR_RADIUS;
  const range = options.range ?? DEFAULT_RADAR_RANGE;
  const dx = (target.x ?? 0) - (player.x ?? 0);
  const dz = (target.z ?? 0) - (player.z ?? 0);
  const sin = Math.sin(player.yaw ?? 0);
  const cos = Math.cos(player.yaw ?? 0);
  const right = cos * dx - sin * dz;
  const forward = sin * dx + cos * dz;
  const scale = radius / range;
  let x = right * scale;
  let y = -forward * scale;
  const distance = Math.hypot(x, y);
  const clamped = distance > radius;

  if (clamped) {
    const clampScale = radius / distance;
    x *= clampScale;
    y *= clampScale;
  }

  return {
    x: roundRadarValue(x),
    y: roundRadarValue(y),
    clamped,
  };
}

export function createRadarBlips(options = {}) {
  const player = options.player ?? {};
  const radius = options.radius ?? DEFAULT_RADAR_RADIUS;
  const range = options.range ?? DEFAULT_RADAR_RANGE;
  const enemies = (options.enemies ?? [])
    .filter((enemy) => enemy?.state !== 'dying' && enemy?.state !== 'dead')
    .map((enemy) => ({
      type: enemy.enemyType && enemy.enemyType !== 'zombie' ? 'special-enemy' : 'enemy',
      ...projectRadarPoint(player, enemy, { radius, range }),
    }));
  const portal = options.portal
    ? [{
      type: 'portal',
      ...projectRadarPoint(player, options.portal, { radius, range }),
    }]
    : [];

  return [...enemies, ...portal];
}

export function drawRadarHud(context, options = {}) {
  const canvas = context.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const radius = options.radius ?? DEFAULT_RADAR_RADIUS;
  const range = options.range ?? DEFAULT_RADAR_RANGE;
  const player = options.player ?? {};
  const centerX = width / 2;
  const centerY = height / 2;
  const blips = createRadarBlips({
    player,
    enemies: options.enemies,
    portal: options.portal,
    radius,
    range,
  });

  context.clearRect(0, 0, width, height);
  drawRadarFrame(context, centerX, centerY, radius);
  drawCompass(context, player, centerX, centerY, radius, range);

  for (const blip of blips) {
    drawBlip(context, centerX + blip.x, centerY + blip.y, blip);
  }

  drawPlayerArrow(context, centerX, centerY);
}

function drawRadarFrame(context, centerX, centerY, radius) {
  context.fillStyle = 'rgba(5, 18, 10, 0.84)';
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(118, 255, 151, 0.56)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = 'rgba(108, 255, 145, 0.24)';
  context.lineWidth = 1;
  for (const ring of [0.38, 0.68]) {
    context.beginPath();
    context.arc(centerX, centerY, radius * ring, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = 'rgba(124, 255, 162, 0.16)';
  for (let offset = -32; offset <= 32; offset += 16) {
    context.fillRect(centerX + offset, centerY - radius, 1, radius * 2);
    context.fillRect(centerX - radius, centerY + offset, radius * 2, 1);
  }
}

function drawCompass(context, player, centerX, centerY, radius, range) {
  const north = projectRadarPoint(player, { x: (player.x ?? 0), z: (player.z ?? 0) + range }, { radius: radius - 8, range });
  const x = centerX + north.x;
  const y = centerY + north.y;

  context.fillStyle = 'rgba(235, 255, 218, 0.86)';
  context.font = '10px Courier New, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('N', x, y);
}

function drawBlip(context, x, y, blip) {
  if (blip.type === 'portal') {
    context.fillStyle = 'rgba(64, 255, 205, 0.9)';
    context.fillRect(x - 3, y - 3, 6, 6);
    return;
  }

  context.fillStyle = blip.type === 'special-enemy'
    ? 'rgba(255, 188, 46, 0.95)'
    : 'rgba(255, 64, 48, 0.92)';
  context.beginPath();
  context.arc(x, y, blip.type === 'special-enemy' ? 3.6 : 2.8, 0, Math.PI * 2);
  context.fill();
}

function drawPlayerArrow(context, centerX, centerY) {
  context.fillStyle = 'rgba(245, 240, 218, 0.96)';
  context.beginPath();
  context.moveTo(centerX, centerY - 7);
  context.lineTo(centerX + 5, centerY + 5);
  context.lineTo(centerX, centerY + 2);
  context.lineTo(centerX - 5, centerY + 5);
  context.closePath();
  context.fill();
}

function roundRadarValue(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}
