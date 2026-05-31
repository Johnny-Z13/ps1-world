export const MOTION_CODES = Object.freeze({
    sway: 1,
    firefly: 2,
    'falling-leaf': 3,
    'moon-slide': 4,
    bob: 5,
    orbit: 6,
    'flicker-comet': 7,
    'palm-snap': 8,
    'window-pulse': 9,
    'sign-flicker': 10,
    'water-shimmer': 11,
    'zombie-walk': 12,
    'torch-flame': 13,
    'pickup-bob': 14,
    'warp-gate': 15,
});

export function motionCode(name) {
  return MOTION_CODES[name] ?? 0;
}

export function drawGeneratedTexture(ctx, id, x, y, tile, sourceSize) {
  if (id === 'zombie') {
    drawZombieTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'star') {
    drawStarTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'shootingStar') {
    drawShootingStarTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'paleMoon') {
    drawMoonTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'moonbeam') {
    drawMoonbeamTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'firefly') {
    drawFireflyTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'fallingLeaf') {
    drawLeafTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'flickerComet') {
    drawCometTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'blackWater' || id === 'poolWater') {
    drawWaterPlaneTexture(ctx, id, x, y, tile);
    return;
  }

  if (id === 'motelSign') {
    drawMotelSignTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'motelWindow') {
    drawMotelWindowTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'rain') {
    drawRainTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'torchFlame') {
    drawTorchFlameTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'healthPotion') {
    drawHealthPotionTexture(ctx, x, y, tile);
    return;
  }

  if (id === 'warpGate') {
    drawWarpGateTexture(ctx, x, y, tile);
    return;
  }

  if (id.startsWith('neon') || id === 'lightning') {
    drawNeonTexture(ctx, id, x, y, tile, sourceSize);
    return;
  }

  if (id.startsWith('oneBit')) {
    drawOneBitTexture(ctx, id, x, y, tile, sourceSize);
    return;
  }

  const cell = tile / (sourceSize === 64 ? 8 : 16);
  ctx.fillStyle = palette(id, 0);
  ctx.fillRect(x, y, tile, tile);

  for (let row = 0; row < tile / cell; row += 1) {
    for (let col = 0; col < tile / cell; col += 1) {
      const n = hash(col, row, id.length);
      ctx.fillStyle = palette(id, n);
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }

  if (id === 'brick') {
    ctx.strokeStyle = '#2d2926';
    ctx.lineWidth = 2;
    for (let row = 0; row < 8; row += 1) {
      const offset = row % 2 === 0 ? 0 : tile / 8;
      ctx.beginPath();
      ctx.moveTo(x, y + row * tile / 8);
      ctx.lineTo(x + tile, y + row * tile / 8);
      ctx.stroke();
      for (let col = -1; col < 8; col += 1) {
        ctx.beginPath();
        ctx.moveTo(x + offset + col * tile / 4, y + row * tile / 8);
        ctx.lineTo(x + offset + col * tile / 4, y + (row + 1) * tile / 8);
        ctx.stroke();
      }
    }
  }

  if (id === 'warning') {
    ctx.fillStyle = '#d7a526';
    for (let stripe = -tile; stripe < tile * 2; stripe += 24) {
      ctx.save();
      ctx.translate(x + stripe, y);
      ctx.rotate(Math.PI / 6);
      ctx.fillRect(0, 0, 12, tile * 2);
      ctx.restore();
    }
  }

  if (id === 'sun') {
    ctx.clearRect(x, y, tile, tile);
    const gradient = ctx.createRadialGradient(x + tile / 2, y + tile / 2, 4, x + tile / 2, y + tile / 2, tile / 2);
    gradient.addColorStop(0, '#fff2a0');
    gradient.addColorStop(0.35, '#ff9744');
    gradient.addColorStop(0.72, '#b63358');
    gradient.addColorStop(0.98, '#3b1434');
    gradient.addColorStop(1, 'rgba(59, 20, 52, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + tile / 2, y + tile / 2, tile * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawZombieTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#121612';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = '#6f8d5e';
  ctx.fillRect(x + tile * 0.32, y + tile * 0.08, tile * 0.36, tile * 0.22);
  ctx.fillStyle = '#273822';
  ctx.fillRect(x + tile * 0.28, y + tile * 0.3, tile * 0.44, tile * 0.32);
  ctx.fillStyle = '#4b3128';
  ctx.fillRect(x + tile * 0.2, y + tile * 0.32, tile * 0.16, tile * 0.42);
  ctx.fillRect(x + tile * 0.64, y + tile * 0.32, tile * 0.16, tile * 0.42);
  ctx.fillStyle = '#1c1a1a';
  ctx.fillRect(x + tile * 0.33, y + tile * 0.62, tile * 0.13, tile * 0.32);
  ctx.fillRect(x + tile * 0.55, y + tile * 0.62, tile * 0.13, tile * 0.32);
  ctx.fillStyle = '#f2e6a6';
  ctx.fillRect(x + tile * 0.39, y + tile * 0.16, tile * 0.07, tile * 0.05);
  ctx.fillRect(x + tile * 0.55, y + tile * 0.16, tile * 0.07, tile * 0.05);
  ctx.fillStyle = '#9b2d2d';
  ctx.fillRect(x + tile * 0.44, y + tile * 0.25, tile * 0.14, tile * 0.04);
  ctx.fillStyle = 'rgba(150, 185, 120, 0.28)';
  ctx.fillRect(x + tile * 0.24, y + tile * 0.04, tile * 0.52, tile * 0.9);
}

function drawStarTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#f9f0c4';
  const center = x + tile / 2;
  const middle = y + tile / 2;
  const size = Math.max(14, Math.floor(tile / 4.8));
  ctx.fillRect(center - size / 2, middle - size / 2, size, size);
  ctx.fillStyle = 'rgba(117, 233, 238, 0.65)';
  ctx.fillRect(center - size * 1.2, middle - size / 2, size, size);
  ctx.fillStyle = 'rgba(255, 98, 142, 0.58)';
  ctx.fillRect(center + size * 0.2, middle - size / 2, size, size);
}

function drawShootingStarTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  const middle = y + tile / 2;
  const head = x + tile * 0.78;
  const height = Math.max(8, Math.floor(tile / 10));

  const tail = ctx.createLinearGradient(x + tile * 0.08, middle, head, middle);
  tail.addColorStop(0, 'rgba(255, 255, 255, 0)');
  tail.addColorStop(0.45, 'rgba(88, 220, 232, 0.68)');
  tail.addColorStop(1, 'rgba(255, 245, 194, 1)');
  ctx.fillStyle = tail;
  ctx.fillRect(x + tile * 0.08, middle - height / 2, tile * 0.7, height);

  ctx.fillStyle = '#fff7c8';
  ctx.fillRect(head, middle - height, height * 2, height * 2);
}

function drawMoonTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#d9d1b5';
  ctx.fillRect(x + tile * 0.26, y + tile * 0.18, tile * 0.46, tile * 0.58);
  ctx.fillStyle = '#9f9a8d';
  ctx.fillRect(x + tile * 0.48, y + tile * 0.24, tile * 0.12, tile * 0.1);
  ctx.fillRect(x + tile * 0.38, y + tile * 0.52, tile * 0.16, tile * 0.12);
}

function drawFireflyTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#d8ff72';
  ctx.fillRect(x + tile * 0.36, y + tile * 0.36, tile * 0.28, tile * 0.28);
  ctx.fillStyle = 'rgba(105, 255, 170, 0.38)';
  ctx.fillRect(x + tile * 0.26, y + tile * 0.26, tile * 0.48, tile * 0.48);
}

function drawLeafTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#75602e';
  ctx.fillRect(x + tile * 0.34, y + tile * 0.18, tile * 0.26, tile * 0.54);
  ctx.fillStyle = '#2f3b1d';
  ctx.fillRect(x + tile * 0.46, y + tile * 0.2, tile * 0.12, tile * 0.48);
}

function drawCometTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = '#ffff4d';
  ctx.fillRect(x + tile * 0.62, y + tile * 0.42, tile * 0.18, tile * 0.18);
  ctx.fillStyle = '#15e8ff';
  ctx.fillRect(x + tile * 0.25, y + tile * 0.46, tile * 0.4, tile * 0.1);
}

function drawWaterPlaneTexture(ctx, id, x, y, tile) {
  ctx.fillStyle = id === 'blackWater' ? '#030506' : '#07131a';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = id === 'blackWater' ? 'rgba(61, 76, 58, 0.5)' : 'rgba(94, 214, 230, 0.5)';
  for (let row = 0; row < 8; row += 1) {
    ctx.fillRect(x + ((row % 2) * 12), y + row * tile / 8, tile * 0.75, 3);
  }
}

function drawMotelSignTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#160909';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = '#f2c25d';
  ctx.fillRect(x + 10, y + 18, tile - 20, 18);
  ctx.fillRect(x + 16, y + 48, tile - 32, 14);
  ctx.fillStyle = '#451818';
  ctx.fillRect(x + 24, y + 22, tile - 48, 6);
  ctx.fillRect(x + 30, y + 52, tile - 60, 4);
}

function drawMotelWindowTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#080808';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = '#ff9b43';
  ctx.fillRect(x + 12, y + 12, tile - 24, tile - 24);
  ctx.fillStyle = '#2a1309';
  ctx.fillRect(x + tile / 2 - 2, y + 12, 4, tile - 24);
}

function drawRainTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#0c2025';
  ctx.fillRect(x, y, tile, tile);
  ctx.strokeStyle = '#b9ffff';
  ctx.lineWidth = 2;

  for (let i = -2; i < 10; i += 1) {
    const sx = x + i * 14;
    ctx.beginPath();
    ctx.moveTo(sx, y + tile);
    ctx.lineTo(sx + 20, y);
    ctx.stroke();
  }
}

function drawNeonTexture(ctx, id, x, y, tile, sourceSize) {
  const cells = sourceSize === 64 ? 8 : 16;
  const cell = tile / cells;
  const base = palette(id, 0);
  ctx.fillStyle = base;
  ctx.fillRect(x, y, tile, tile);

  if (id === 'lightning') {
    ctx.fillStyle = '#f7ffff';
    ctx.fillRect(x, y, tile, tile);
    return;
  }

  if (id === 'neonSky') {
    const gradient = ctx.createLinearGradient(x, y, x, y + tile);
    gradient.addColorStop(0, '#2539ff');
    gradient.addColorStop(0.45, '#6841ff');
    gradient.addColorStop(0.7, '#e0207d');
    gradient.addColorStop(1, '#ff3b1f');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, tile, tile);
  }

  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const n = hash(col, row, id.length);
      let color = palette(id, n);

      if (id === 'neonTile') {
        color = row % 2 === 0 || col % 2 === 0 ? '#d9fff0' : palette(id, n);
      }
      if (id === 'neonGlass') {
        color = col % 3 === 0 ? '#d8ffff' : palette(id, n);
      }
      if (id === 'neonCloud') {
        color = n > 0.48 || row % 5 === 0 ? '#ff9a3d' : '#ff3f8f';
      }
      if (id === 'neonLeaf') {
        color = n > 0.42 ? '#a8ff6a' : '#071b14';
      }
      if (id === 'neonBark') {
        color = col % 3 === 0 ? '#43ff9d' : '#161019';
      }

      ctx.fillStyle = color;
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }

  if (id === 'neonTile' || id === 'neonGlass') {
    ctx.strokeStyle = '#baffff';
    ctx.lineWidth = 2;
    for (let i = 0; i <= cells; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * cell, y);
      ctx.lineTo(x + i * cell, y + tile);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + i * cell);
      ctx.lineTo(x + tile, y + i * cell);
      ctx.stroke();
    }
  }
}

function drawOneBitTexture(ctx, id, x, y, tile, sourceSize) {
  const oneBitPaper = '#d8d0aa';
  const oneBitInk = '#17130e';
  const cells = sourceSize === 64 ? 8 : 16;
  const cell = tile / cells;
  ctx.fillStyle = id === 'oneBitVoid' ? oneBitInk : oneBitPaper;
  ctx.fillRect(x, y, tile, tile);

  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const center = Math.abs(col - (cells - 1) / 2);
      const verticalShade = row / Math.max(cells - 1, 1);
      const n = hash(col, row, id.length);
      const stripe = row % 4 === 0 || col % 4 === 0;
      const checker = (row + col) % 2 === 0;
      const circuit = stripe || (row % 3 === 1 && col % 5 < 2) || (col % 6 === 3 && row % 5 > 1);
      const cross = center < 1 || Math.abs(row - (cells - 1) / 2) < 1 || checker;
      let density = 0.35 + verticalShade * 0.2;

      if (id === 'oneBitVoid') density = 0.82;
      if (id === 'oneBitGrid') density = checker ? 0.32 : 0.52;
      if (id === 'oneBitCross') density = cross ? 0.18 : 0.62;
      if (id === 'oneBitStripe') density = row % 3 === 1 ? 0.24 : 0.68;
      if (id === 'oneBitCircuit') density = circuit ? 0.2 : 0.58;

      ctx.fillStyle = n < density ? oneBitInk : oneBitPaper;
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }
}

function palette(id, n) {
  const palettes = {
    concrete: ['#585650', '#69655c', '#4c4b47', '#777062'],
    brick: ['#55413a', '#6a4d42', '#40332f', '#775547'],
    metal: ['#4c5555', '#67706e', '#394343', '#87908a'],
    crate: ['#79542f', '#94663a', '#5d432c', '#ad7844'],
    warning: ['#2d2b25', '#413b2d', '#1f1e1b', '#6b5523'],
    torchWood: ['#2a160b', '#4a2b14', '#6b3d1d', '#140b06'],
    torchMetal: ['#1a1714', '#433f3a', '#777068', '#2d2925'],
    alienGround: ['#293f37', '#4a5541', '#5e3c5f', '#1e282c'],
    alienRock: ['#3a3048', '#5d526d', '#2b2435', '#74678b'],
    rotMud: ['#1b2012', '#30301b', '#4a3d24', '#152012'],
    rotBark: ['#050505', '#11100c', '#1a1711', '#241d15'],
    rotPine: ['#07110a', '#102116', '#1f321e', '#26321b'],
    rotRoot: ['#16100b', '#2a1d13', '#3a2818', '#0b0906'],
    deadWood: ['#2b2116', '#47341e', '#17110d', '#5c442b'],
    blackWater: ['#030506', '#0c1511', '#111c17', '#030506'],
    sun: ['#ffb044', '#d84a54', '#fff0a6', '#77284a'],
    astralGrid: ['#05050a', '#23f6ff', '#ff2fd0', '#f8f14a'],
    astralCyan: ['#00e8ff', '#12243a', '#aaffff', '#008e9a'],
    astralMagenta: ['#ff2fd0', '#32102d', '#ffd1fb', '#9b197e'],
    astralYellow: ['#f8f14a', '#3a3512', '#fff6a3', '#a79d12'],
    astralBlack: ['#020208', '#101022', '#05050a', '#222244'],
    starshipFloor: ['#1f2b32', '#34454a', '#162026', '#4f5f64'],
    shipCeiling: ['#111820', '#22313c', '#060a0e', '#465965'],
    darkMetal: ['#11151a', '#252b32', '#07090d', '#4f5963'],
    hullPanel: ['#202932', '#3b4852', '#111820', '#69737c'],
    reactorGlow: ['#1a1f20', '#ff4d32', '#2a302e', '#ffad5f'],
    moonbeam: ['#8da5cf', '#31415f', '#d9e6ff', '#101827'],
    panel: ['#263238', '#3f4b52', '#181f25', '#59656b'],
    motelWall: ['#2c2b31', '#4b4851', '#17171d', '#6a6264'],
    motelDoor: ['#181012', '#39212a', '#5f3141', '#101010'],
    vending: ['#161624', '#e43f65', '#2ed6ff', '#f7e45a'],
    palm: ['#173019', '#2d5b2f', '#75602e', '#0d160b'],
    car: ['#101319', '#303b45', '#672b38', '#aeb1a4'],
    wetAsphalt: ['#11151d', '#1e2430', '#262042', '#101016'],
    poolWater: ['#07131a', '#0d2c35', '#3dbeca', '#13202a'],
    neon: ['#ff2bbd', '#27d8ff', '#f6e85f', '#5635ff'],
    neonSky: ['#2539ff', '#6841ff', '#e0207d', '#ff3b1f'],
    neonTile: ['#53fff2', '#f8fff2', '#2332ff', '#ff44d6'],
    neonGlass: ['#baffff', '#35dfff', '#3631ff', '#f9fff6'],
    neonCloud: ['#ff8a2a', '#ff3f8f', '#ffd15c', '#5d3cff'],
    neonBark: ['#43ff9d', '#161019', '#ff4fe1', '#0f2b25'],
    neonLeaf: ['#a8ff6a', '#071b14', '#46ffcb', '#1a0b30'],
    lightning: ['#f7ffff', '#ffffff', '#caffff', '#e8f7ff'],
    templeStone: ['#4b544b', '#677060', '#313930', '#7a816f'],
    mossStone: ['#36523e', '#4d6843', '#2d3a31', '#71805b'],
    water: ['#14383d', '#1d535a', '#243f58', '#0f272d'],
    rain: ['#0c2025', '#b9ffff', '#6ccdd5', '#183940'],
    oneBitVoid: ['#17130e', '#211b13', '#0e0b08', '#2a2218'],
    oneBitGrid: ['#d8d0aa', '#17130e', '#b8ad88', '#352a1b'],
    oneBitCross: ['#d8d0aa', '#211b13', '#c6bd98', '#17130e'],
    oneBitStripe: ['#d8d0aa', '#17130e', '#a79d78', '#2a2218'],
    oneBitCircuit: ['#d8d0aa', '#17130e', '#c0b890', '#302617'],
  };
  const list = palettes[id] ?? palettes.concrete;
  return list[Math.floor(n * list.length) % list.length];
}


function drawMoonbeamTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  const gradient = ctx.createLinearGradient(x, y, x + tile, y);
  gradient.addColorStop(0, 'rgba(64, 80, 116, 0)');
  gradient.addColorStop(0.32, 'rgba(124, 148, 196, 0.18)');
  gradient.addColorStop(0.5, 'rgba(220, 232, 255, 0.38)');
  gradient.addColorStop(0.68, 'rgba(124, 148, 196, 0.18)');
  gradient.addColorStop(1, 'rgba(64, 80, 116, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = 'rgba(230, 238, 255, 0.22)';
  for (let i = 0; i < 18; i += 1) {
    const px = x + hash(i, 2, 11) * tile;
    const py = y + hash(i, 3, 12) * tile;
    ctx.fillRect(px, py, 2, 2);
  }
}

function drawTorchFlameTexture(ctx, x, y, tile) {
  ctx.clearRect(x, y, tile, tile);
  ctx.fillStyle = 'rgba(255, 105, 18, 0.22)';
  ctx.fillRect(x + tile * 0.22, y + tile * 0.16, tile * 0.56, tile * 0.7);
  ctx.fillStyle = '#d22f16';
  ctx.fillRect(x + tile * 0.32, y + tile * 0.32, tile * 0.36, tile * 0.46);
  ctx.fillStyle = '#ff8a1f';
  ctx.fillRect(x + tile * 0.38, y + tile * 0.22, tile * 0.26, tile * 0.48);
  ctx.fillStyle = '#ffe36a';
  ctx.fillRect(x + tile * 0.44, y + tile * 0.28, tile * 0.14, tile * 0.3);
  ctx.fillStyle = '#fff5ad';
  ctx.fillRect(x + tile * 0.47, y + tile * 0.36, tile * 0.08, tile * 0.16);
}

function drawHealthPotionTexture(ctx, x, y, tile) {
  ctx.fillStyle = '#063015';
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = '#15933d';
  ctx.fillRect(x + tile * 0.08, y + tile * 0.08, tile * 0.84, tile * 0.84);
  ctx.fillStyle = '#36ff58';
  ctx.fillRect(x + tile * 0.18, y + tile * 0.18, tile * 0.52, tile * 0.56);
  ctx.fillStyle = '#b8ff8d';
  ctx.fillRect(x + tile * 0.3, y + tile * 0.24, tile * 0.16, tile * 0.34);
  ctx.fillStyle = '#0a4c21';
  ctx.fillRect(x + tile * 0.68, y + tile * 0.16, tile * 0.18, tile * 0.68);
  ctx.fillStyle = '#edffd9';
  ctx.fillRect(x + tile * 0.36, y + tile * 0.44, tile * 0.28, tile * 0.08);
  ctx.fillRect(x + tile * 0.46, y + tile * 0.34, tile * 0.08, tile * 0.28);
}

function drawWarpGateTexture(ctx, x, y, tile) {
  const scale = tile / 64;
  ctx.clearRect(x, y, tile, tile);
  ctx.strokeStyle = '#1ca6a5';
  ctx.lineWidth = Math.max(1, 3 * scale);
  ctx.beginPath();
  ctx.ellipse(x + 32 * scale, y + 32 * scale, 19 * scale, 27 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#f0d38a';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.ellipse(x + 32 * scale, y + 32 * scale, 11 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#b42638';
  for (let index = 0; index < 9; index += 1) {
    const angle = index * Math.PI * 2 / 9;
    const px = x + (32 + Math.cos(angle) * 18) * scale;
    const py = y + (32 + Math.sin(angle) * 26) * scale;
    ctx.fillRect(px - 2 * scale, py - 2 * scale, 4 * scale, 4 * scale);
  }
  ctx.fillStyle = 'rgba(28, 166, 165, 0.5)';
  ctx.fillRect(x + 28 * scale, y + 12 * scale, 8 * scale, 40 * scale);
  ctx.fillRect(x + 20 * scale, y + 29 * scale, 24 * scale, 6 * scale);
}


function hash(x, y, seed) {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453) % 1;
}
