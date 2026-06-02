export const TITLE_WIDTH = 512;
export const TITLE_HEIGHT = 480;
export const TITLE_LAST_COMMIT_MESSAGE = 'last commit polish scenes and gameplay feedback';

const TITLE_FONT = Object.freeze({
  ' ': ['0', '0', '0', '0', '0', '0', '0'],
  '-': ['00000', '00000', '00000', '11110', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '[': ['111', '100', '100', '100', '100', '100', '111'],
  ']': ['111', '001', '001', '001', '001', '001', '111'],
  '1': ['01100', '11100', '01100', '01100', '01100', '01100', '11110'],
  '2': ['11110', '00010', '00010', '11110', '10000', '10000', '11110'],
  '5': ['11110', '10000', '10000', '11110', '00010', '00010', '11110'],
  a: ['01100', '10010', '10010', '11110', '10010', '10010', '10010'],
  b: ['11100', '10010', '10010', '11100', '10010', '10010', '11100'],
  c: ['01110', '10000', '10000', '10000', '10000', '10000', '01110'],
  d: ['11100', '10010', '10010', '10010', '10010', '10010', '11100'],
  e: ['11110', '10000', '10000', '11100', '10000', '10000', '11110'],
  f: ['11110', '10000', '10000', '11100', '10000', '10000', '10000'],
  g: ['01110', '10000', '10000', '10110', '10010', '10010', '01110'],
  h: ['10010', '10010', '10010', '11110', '10010', '10010', '10010'],
  i: ['11100', '01000', '01000', '01000', '01000', '01000', '11100'],
  k: ['10010', '10100', '11000', '10100', '10010', '10010', '10010'],
  l: ['10000', '10000', '10000', '10000', '10000', '10000', '11110'],
  m: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  n: ['10010', '11010', '10110', '10010', '10010', '10010', '10010'],
  o: ['01100', '10010', '10010', '10010', '10010', '10010', '01100'],
  p: ['11100', '10010', '10010', '11100', '10000', '10000', '10000'],
  r: ['11100', '10010', '10010', '11100', '10100', '10010', '10010'],
  s: ['01110', '10000', '10000', '01100', '00010', '00010', '11100'],
  t: ['11110', '00100', '00100', '00100', '00100', '00100', '00100'],
  u: ['10010', '10010', '10010', '10010', '10010', '10010', '01100'],
  w: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  y: ['10010', '10010', '10010', '01110', '00100', '00100', '00100'],
  z: ['11110', '00010', '00100', '01000', '10000', '10000', '11110'],
});

export function renderTitleScreen(context, time, options = {}) {
  const buttons = options.buttons ?? {};
  const footerMessage = options.footerMessage ?? TITLE_LAST_COMMIT_MESSAGE;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, TITLE_WIDTH, TITLE_HEIGHT);
  drawTitleBackdrop(context, time);
  drawCenteredBitmapText(context, 'ps1-world', 146, 7, '#17100b', time, { x: 6, y: 6 });
  drawCenteredBitmapText(context, 'ps1-world', 146, 7, '#1ca6a5', time, { x: -2, y: 1 });
  drawCenteredBitmapText(context, 'ps1-world', 146, 7, '#b42638', time, { x: 2, y: 0 });
  drawCenteredBitmapText(context, 'ps1-world', 146, 7, '#f3dc92', time);
  drawBloodWarningText(context, time);
  const titleButtonBlink = getTitleButtonBlink(time);
  drawBitmapButton(context, time, { y: 264, label: 'free roam', active: buttons.freeRoam, blink: titleButtonBlink });
  drawBitmapButton(context, time, { y: 310, label: 'cut-up mode', active: buttons.cutUp, blink: titleButtonBlink });
  drawBitmapButton(context, time, { y: 356, label: 'rogue', active: buttons.rogue, blink: titleButtonBlink });
  drawCenteredBitmapText(context, 'wasd+mouse or gamepad', 416, 1.25, '#cfc7aa', time);
  drawCenteredBitmapText(context, footerMessage, 462, 1, '#8f8a77', time);
}

export function getTitleButtonBlink(time) {
  return Math.sin(time * 5) > 0.74;
}

function drawBloodWarningText(context, time) {
  const text = 'watch out for the zombies';
  const y = 234;
  const scale = 1.5;
  drawCenteredBitmapText(context, text, y + 2, scale, '#280205', time, { x: 1, y: 1 });
  drawCenteredBitmapText(context, text, y + 1, scale, '#5e0b16', time, { x: Math.sin(time * 9) > 0.72 ? 1 : 0, y: 0 });
  drawCenteredBitmapText(context, text, y, scale, '#b42638', time);
  drawBloodDrips(context, text, y, scale, time);
}

function drawBloodDrips(context, text, y, scale, time) {
  const width = measureBitmapText(text, scale);
  const x = Math.floor((TITLE_WIDTH - width) / 2);
  const dripColumns = [20, 82, 142, 198];
  context.fillStyle = '#5e0b16';
  for (const column of dripColumns) {
    const length = 4 + Math.floor(Math.abs(Math.sin(time * 3.2 + column)) * 6);
    context.fillRect(x + column * 0.75, y + 12, scale, length);
  }
}

function drawTitleBackdrop(context, time) {
  const pulse = Math.sin(time * 1.7) * 10;
  const gradient = context.createRadialGradient(256, 218, 12, 256, 218, 260);
  gradient.addColorStop(0, '#321316');
  gradient.addColorStop(0.34, '#180b0c');
  gradient.addColorStop(1, '#050505');
  context.fillStyle = gradient;
  context.fillRect(0, 0, TITLE_WIDTH, TITLE_HEIGHT);

  context.fillStyle = 'rgba(242, 213, 138, 0.035)';
  for (let y = 0; y < TITLE_HEIGHT; y += 4) {
    context.fillRect(0, y, TITLE_WIDTH, 1);
  }

  context.fillStyle = 'rgba(42, 176, 181, 0.07)';
  for (let x = 0; x < TITLE_WIDTH; x += 32) {
    const jitter = Math.floor(Math.sin(time * 2 + x) * 2);
    context.fillRect(x + jitter, 0, 1, TITLE_HEIGHT);
  }

  context.fillStyle = 'rgba(190, 38, 54, 0.12)';
  context.fillRect(132, 174 + Math.floor(pulse / 8), 248, 86);
}

function drawBitmapButton(context, time, options) {
  const width = 150;
  const height = 32;
  const textScale = 1.5;
  const x = Math.floor((TITLE_WIDTH - width) / 2);
  const y = options.y;
  const active = options.active || options.blink;
  context.fillStyle = active ? '#f0d38a' : '#17110d';
  context.fillRect(x, y, width, height);
  context.fillStyle = active ? '#17110d' : '#f0d38a';
  context.fillRect(x, y, width, 3);
  context.fillRect(x, y + height - 3, width, 3);
  context.fillRect(x, y, 3, height);
  context.fillRect(x + width - 3, y, 3, height);
  drawCenteredBitmapText(context, options.label, y + 10, textScale, active ? '#17110d' : '#f7e9b7', time);
}

function drawCenteredBitmapText(context, text, y, scale, color, time, offset = { x: 0, y: 0 }) {
  const width = measureBitmapText(text, scale);
  const snap = Math.sin(time * 24 + y) > 0.92 ? 1 : 0;
  drawBitmapText(context, text, Math.floor((TITLE_WIDTH - width) / 2 + offset.x + snap), y + offset.y, scale, color);
}

function drawBitmapText(context, text, x, y, scale, color) {
  let cursor = x;
  context.fillStyle = color;

  for (const character of text) {
    const glyph = TITLE_FONT[character] ?? TITLE_FONT[' '];
    drawBitmapGlyph(context, glyph, cursor, y, scale);
    cursor += (glyph[0].length + 1) * scale;
  }
}

function drawBitmapGlyph(context, glyph, x, y, scale) {
  for (let row = 0; row < glyph.length; row += 1) {
    for (let column = 0; column < glyph[row].length; column += 1) {
      if (glyph[row][column] === '1') {
        context.fillRect(x + column * scale, y + row * scale, scale, scale);
      }
    }
  }
}

export function measureBitmapText(text, scale) {
  return [...text].reduce((width, character, index) => {
    const glyph = TITLE_FONT[character] ?? TITLE_FONT[' '];
    return width + glyph[0].length * scale + (index === text.length - 1 ? 0 : scale);
  }, 0);
}
