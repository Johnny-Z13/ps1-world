const WALL_HEIGHT = 3.0;

export const SCENE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'dungeon', label: 'Dungeon' }),
  Object.freeze({ id: 'alien-landscape', label: 'Alien landscape' }),
  Object.freeze({ id: 'derelict-starship', label: 'Derelict starship' }),
  Object.freeze({ id: 'neon-backstreets', label: 'Neon backstreets' }),
  Object.freeze({ id: 'sunken-temple', label: 'Sunken temple' }),
  Object.freeze({ id: 'one-bit-cathedral', label: '1-bit cathedral' }),
  Object.freeze({ id: 'rotwood-forest', label: 'Polygonal Rotwood Forest' }),
  Object.freeze({ id: 'astral-geometry-garden', label: 'Astral Geometry Garden' }),
  Object.freeze({ id: 'motel-mirage', label: 'Liminal Motel Mirage' }),
]);

export function createSceneWorld(id) {
  if (id === 'alien-landscape') return createAlienLandscapeWorld();
  if (id === 'derelict-starship') return createDerelictStarshipWorld();
  if (id === 'neon-backstreets') return createNeonBackstreetsWorld();
  if (id === 'sunken-temple') return createSunkenTempleWorld();
  if (id === 'one-bit-cathedral') return createOneBitCathedralWorld();
  if (id === 'rotwood-forest') return createRotwoodForestWorld();
  if (id === 'astral-geometry-garden') return createAstralGeometryGardenWorld();
  if (id === 'motel-mirage') return createMotelMirageWorld();
  return createWarehouseWorld();
}

export function createWarehouseWorld() {
  const textures = [
    { id: 'concrete', size: 64 },
    { id: 'brick', size: 64 },
    { id: 'metal', size: 128 },
    { id: 'crate', size: 64 },
    { id: 'warning', size: 64 },
  ];

  const walls = [
    box('north wall a', -7.5, -11.8, 11, 0.4, WALL_HEIGHT, 'brick'),
    box('north wall b', 7.5, -11.8, 11, 0.4, WALL_HEIGHT, 'brick'),
    box('south wall a', -7.5, 11.8, 11, 0.4, WALL_HEIGHT, 'brick'),
    box('south wall b', 7.5, 11.8, 11, 0.4, WALL_HEIGHT, 'brick'),
    box('west wall a', -12.8, -7.5, 0.4, 8.5, WALL_HEIGHT, 'brick'),
    box('west wall b', -12.8, 7.5, 0.4, 8.5, WALL_HEIGHT, 'brick'),
    box('east wall a', 12.8, -7.5, 0.4, 8.5, WALL_HEIGHT, 'brick'),
    box('east wall b', 12.8, 7.5, 0.4, 8.5, WALL_HEIGHT, 'brick'),
    box('loading bay lip', 0, 11.8, 2.5, 0.4, 1.35, 'metal'),
    box('office divider west', -5.2, -4.5, 0.35, 7.2, WALL_HEIGHT, 'concrete'),
    box('office divider north', -8.6, -1.2, 6.5, 0.35, WALL_HEIGHT, 'concrete'),
    box('office divider short', -10.2, 2.4, 4.8, 0.35, WALL_HEIGHT, 'concrete'),
    box('corridor wall west', 2.2, -7.3, 0.35, 7.8, WALL_HEIGHT, 'concrete'),
    box('corridor wall east', 5.6, -5.2, 0.35, 6.8, WALL_HEIGHT, 'concrete'),
    box('corridor cap', 3.9, -1.8, 3.7, 0.35, WALL_HEIGHT, 'concrete'),
    box('storage divider', 6.7, 4.3, 8.2, 0.35, WALL_HEIGHT, 'metal'),
    box('storage left return', 2.8, 7.1, 0.35, 5.6, WALL_HEIGHT, 'metal'),
    box('storage right return', 10.5, 7.1, 0.35, 5.6, WALL_HEIGHT, 'metal'),
    box('short barricade 1', -2.2, 1.2, 3.2, 0.35, 1.3, 'warning'),
    box('short barricade 2', -2.2, 4.2, 3.2, 0.35, 1.3, 'warning'),
    box('machine block 1', 0.6, 6.2, 1.5, 2.0, 1.8, 'metal'),
    box('machine block 2', -7.2, 6.8, 2.2, 1.3, 1.7, 'metal'),
  ];

  const crates = [
    crate(-8.8, -8.5, 1.1, 1.1, 1.0),
    crate(-7.4, -8.2, 1.1, 1.1, 1.0),
    crate(-9.4, 6.4, 1.2, 1.2, 1.1),
    crate(-6.0, 8.2, 1.4, 1.0, 1.2),
    crate(-0.7, -8.5, 1.0, 1.0, 1.0),
    crate(0.9, -8.8, 1.0, 1.0, 1.0),
    crate(7.8, -8.4, 1.2, 1.2, 1.0),
    crate(9.5, -7.6, 1.2, 1.2, 1.0),
    crate(7.4, 7.7, 1.3, 1.3, 1.1),
    crate(9.1, 7.2, 1.3, 1.3, 1.1),
    crate(4.2, 9.2, 1.0, 1.0, 1.0),
    crate(-3.5, -2.2, 1.0, 1.4, 1.0),
  ];

  const platforms = [
    box('loading crate step low', -4.6, 7.2, 2.4, 2.0, 0.55, 'crate'),
    box('loading crate step high', -2.0, 7.2, 2.2, 2.0, 1.1, 'crate'),
    box('office roof jump ledge', -7.8, -4.5, 3.2, 2.2, 1.45, 'metal'),
  ];

  return withZombies({
    id: 'dungeon',
    label: 'Dungeon',
    clearColor: [0.035, 0.034, 0.03, 1],
    floor: box('floor', 0, 0, 25.6, 23.6, 0.08, 'concrete', -0.08),
    ceiling: box('ceiling', 0, 0, 25.6, 23.6, 0.08, 'metal', WALL_HEIGHT),
    walls,
    crates,
    platforms,
    mountains: [],
    sun: null,
    lights: [
      { x: -8, y: 2.8, z: -8, color: [1.0, 0.74, 0.42] },
      { x: 4, y: 2.8, z: -8, color: [0.55, 0.82, 1.0] },
      { x: -5, y: 2.8, z: 5, color: [1.0, 0.86, 0.58] },
      { x: 8, y: 2.8, z: 8, color: [0.85, 0.95, 1.0] },
    ],
    playerSpawn: { x: -9.5, y: 1.45, z: 9.5, yaw: 2.35 },
    killY: -8,
    textures,
  }, [
    { x: -10.2, z: -2.8 },
    { x: 8.4, z: 1.5 },
    { x: 4, z: -10 },
  ]);
}

function crate(x, z, width, depth, height) {
  return box(`crate ${x} ${z}`, x, z, width, depth, height, 'crate');
}

function createAlienLandscapeWorld() {
  const textures = [
    { id: 'alienGround', size: 128 },
    { id: 'alienRock', size: 64 },
    { id: 'sun', size: 64 },
    { id: 'star', size: 64 },
    { id: 'shootingStar', size: 128 },
    { id: 'metal', size: 128 },
  ];

  const mountains = [
    mountain('ridge far west', -34, -34, 18, 12, 8, 'alienRock'),
    mountain('ridge west', -20, -38, 22, 16, 10, 'alienRock'),
    mountain('ridge center', -4, -42, 28, 20, 14, 'alienRock'),
    mountain('ridge east', 14, -38, 24, 16, 11, 'alienRock'),
    mountain('ridge far east', 32, -35, 18, 12, 9, 'alienRock'),
    mountain('near shard', 18, -18, 8, 7, 5, 'alienRock'),
    mountain('left shard', -19, -16, 7, 6, 4.5, 'alienRock'),
  ];

  const crates = [
    box('probe wreck', -7, -5, 2.0, 1.1, 1.0, 'metal'),
    box('signal monolith', 8, -8, 1.1, 1.1, 3.4, 'alienRock'),
    box('broken pylon', 13, 4, 1.2, 1.2, 2.2, 'metal'),
  ];

  const platforms = [
    box('purple basalt stair low', -4, 8, 5.4, 3.0, 0.55, 'alienRock'),
    box('purple basalt stair high', -8, 5.2, 4.2, 3.0, 1.2, 'alienRock'),
    box('signal ridge lookout', 10, -13, 5.0, 4.0, 1.55, 'alienRock'),
  ];

  return withZombies({
    id: 'alien-landscape',
    label: 'Alien landscape',
    clearColor: [0.11, 0.065, 0.14, 1],
    floor: box('alien plain', 0, 0, 80, 80, 0.08, 'alienGround', -0.08),
    ceiling: null,
    walls: [
      box('west map edge', -40.5, 0, 0.6, 80, 1.2, 'alienRock'),
      box('east map edge', 40.5, 0, 0.6, 80, 1.2, 'alienRock'),
      box('north map edge', 0, -40.5, 80, 0.6, 1.2, 'alienRock'),
      box('south map edge', 0, 40.5, 80, 0.6, 1.2, 'alienRock'),
    ],
    crates,
    platforms,
    mountains,
    stars: createAlienStars(),
    sun: {
      name: 'small red sun',
      x: 16,
      y: 16,
      z: -37,
      width: 7,
      height: 7,
      texture: 'sun',
    },
    shootingStar: {
      texture: 'shootingStar',
      x: -31,
      y: 22,
      z: -38.5,
      width: 18,
      height: 2.0,
      interval: 9,
      delay: 1.25,
      duration: 2.4,
    },
    lights: [
      { x: 16, y: 18, z: -30, color: [1.0, 0.48, 0.22] },
      { x: -14, y: 6, z: -10, color: [0.38, 0.72, 1.0] },
      { x: 15, y: 4, z: 8, color: [0.8, 0.55, 1.0] },
      { x: 0, y: 5, z: 20, color: [0.55, 1.0, 0.78] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 15, yaw: 3.12 },
    killY: -10,
    textures,
  }, [
    { x: -14, z: 12 },
    { x: 12, z: 12 },
    { x: 0, z: -12 },
  ]);
}

function createAlienStars() {
  const stars = [];
  for (let i = 0; i < 42; i += 1) {
    const n = hash(i * 9.13, i * 2.71, 17);
    const x = -36 + (i % 14) * 5.45 + (n - 0.5) * 2.2;
    const y = 11.5 + Math.floor(i / 14) * 5.1 + hash(i, 5, 31) * 4.4;
    const z = -36.2 - hash(i, 11, 23) * 2.0;
    const size = 0.5 + hash(i, 19, 7) * 0.58;

    stars.push({
      name: `alien star ${i + 1}`,
      x,
      y,
      z,
      width: size,
      height: size,
      texture: 'star',
    });
  }
  return stars;
}

function mountain(name, x, z, width, depth, height, texture) {
  return { name, x, y: 0, z, width, depth, height, texture };
}

function hash(x, y, seed) {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453) % 1;
}

function createRotwoodForestWorld() {
  const textures = [
    { id: 'rotMud', size: 128 },
    { id: 'rotBark', size: 64 },
    { id: 'rotPine', size: 64 },
    { id: 'rotRoot', size: 64 },
    { id: 'mossStone', size: 64 },
    { id: 'blackWater', size: 64 },
    { id: 'deadWood', size: 64 },
    { id: 'paleMoon', size: 64 },
    { id: 'firefly', size: 64 },
    { id: 'fallingLeaf', size: 64 },
  ];

  const walls = [
    box('north fog wall', 0, -34, 68, 0.7, 2.2, 'rotBark'),
    box('south root wall', 0, 34, 68, 0.7, 2.2, 'rotRoot'),
    box('west bramble wall', -34, 0, 0.7, 68, 2.2, 'rotRoot'),
    box('east bramble wall', 34, 0, 0.7, 68, 2.2, 'rotRoot'),
  ];
  const crates = [
    box('dead hollow tree trunk', -9, -13, 3.4, 3.0, 7.6, 'rotBark'),
    box('dead hollow tree split crown', -9.5, -14.4, 4.8, 1.0, 2.4, 'deadWood', 6.3),
    box('crooked root arch left', -5.7, -6.2, 1.4, 5.8, 2.7, 'rotRoot'),
    box('crooked root arch right', -1.8, -6.1, 1.2, 5.3, 2.4, 'rotRoot'),
    box('crooked root arch cap', -3.7, -8.8, 4.8, 1.0, 1.2, 'rotRoot', 2.2),
    box('sunken footbridge plank a', 10, -4, 8.8, 1.0, 0.22, 'deadWood', 0.05, true),
    box('sunken footbridge plank b', 10, -2.5, 7.5, 1.0, 0.2, 'deadWood', 0.03, true),
    box('black pond mirror', 13.5, 7.4, 9.5, 6.4, 0.08, 'blackWater', -0.03, true),
  ];

  for (let i = 0; i < 18; i += 1) {
    const x = -27 + (i % 6) * 10.5 + (hash(i, 2, 1) - 0.5) * 3;
    const z = -25 + Math.floor(i / 6) * 14 + (hash(i, 3, 2) - 0.5) * 5;
    if (Math.abs(x) < 5 && z > 8) continue;
    crates.push(box(`black tree trunk ${i + 1}`, x, z, 1.2 + hash(i, 4, 3), 1.2 + hash(i, 5, 4), 5.5 + hash(i, 6, 5) * 2, 'rotBark'));
    crates.push(box(`root cluster ${i + 1}`, x + 1.4, z + 0.8, 3.2, 0.8, 0.65, 'rotRoot'));
  }

  for (let i = 0; i < 10; i += 1) {
    const angle = i / 10 * Math.PI * 2;
    crates.push(box(`stone circle marker ${i + 1}`, Math.cos(angle) * 5.5 + 4, Math.sin(angle) * 5.5 - 13, 0.7, 0.7, 1.2 + (i % 2) * 0.4, 'mossStone'));
  }

  const platforms = [
    box('mossy root stair low', -6, 15, 4.8, 2.2, 0.55, 'rotRoot'),
    box('mossy root stair high', -9, 12.5, 4.0, 2.2, 1.1, 'rotRoot'),
    box('fallen trunk overlook', 9.5, -4.5, 7.2, 2.1, 1.25, 'deadWood'),
  ];

  const cards = [];
  for (let i = 0; i < 28; i += 1) {
    const x = -28 + (i % 7) * 9.4 + (hash(i, 7, 8) - 0.5) * 2.5;
    const z = -27 + Math.floor(i / 7) * 12.4 + (hash(i, 8, 9) - 0.5) * 3.5;
    cards.push(card(`flat pine bough ${i + 1}`, x, 6.2 + hash(i, 9, 10) * 2.4, z, 4.8, 3.2, 'rotPine', 'sway'));
  }
  for (let i = 0; i < 16; i += 1) {
    cards.push(card(`firefly pixel ${i + 1}`, -17 + (i % 8) * 4.8, 1.7 + hash(i, 10, 11) * 2.0, -11 + Math.floor(i / 8) * 17, 0.42, 0.42, 'firefly', 'firefly'));
  }
  for (let i = 0; i < 12; i += 1) {
    cards.push(card(`falling leaf card ${i + 1}`, -22 + (i % 6) * 8.5, 6.8 + hash(i, 11, 12) * 2.6, -18 + Math.floor(i / 6) * 22, 0.55, 0.72, 'fallingLeaf', 'falling-leaf'));
  }

  return withZombies({
    id: 'rotwood-forest',
    label: 'Polygonal Rotwood Forest',
    clearColor: [0.025, 0.032, 0.023, 1],
    floor: box('muddy path clearing floor', 0, 0, 68, 68, 0.08, 'rotMud', -0.08),
    ceiling: null,
    walls,
    crates,
    platforms,
    mountains: [
      mountain('fogged treeline west', -24, -38, 16, 8, 8, 'rotBark'),
      mountain('fogged treeline center', -5, -40, 20, 8, 9, 'rotBark'),
      mountain('fogged treeline east', 17, -38, 18, 8, 8, 'rotBark'),
    ],
    cards,
    movingBillboards: [
      card('sliding pale moon behind treeline', -18, 15, -36, 5.8, 5.8, 'paleMoon', 'moon-slide'),
    ],
    sun: null,
    playerTorch: {
      radius: 12,
      intensity: 1.45,
      color: [1.0, 0.52, 0.22],
    },
    lights: [
      { x: -18, y: 10, z: -28, color: [0.55, 0.68, 0.85] },
      { x: 7, y: 3.4, z: -12, color: [0.48, 0.72, 0.42] },
      { x: 14, y: 2.4, z: 8, color: [0.36, 0.5, 0.28] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 20, yaw: 3.08 },
    killY: -9,
    textures,
  }, [
    { x: -18, z: 18 },
    { x: 16, z: 14 },
    { x: 2, z: -22 },
  ]);
}

function createAstralGeometryGardenWorld() {
  const textures = [
    { id: 'astralGrid', size: 128 },
    { id: 'astralCyan', size: 64 },
    { id: 'astralMagenta', size: 64 },
    { id: 'astralYellow', size: 64 },
    { id: 'astralBlack', size: 64 },
    { id: 'oneBitGrid', size: 128 },
    { id: 'shootingStar', size: 128 },
    { id: 'flickerComet', size: 64 },
  ];
  const floorPieces = [
    box('central checker platform', 0, 0, 18, 18, 0.45, 'astralGrid', -0.1),
    box('cyan bridge north', 0, -17, 5, 16, 0.35, 'astralCyan', -0.08),
    box('yellow left platform', -17, -19, 15, 13, 0.38, 'astralYellow', -0.06),
    box('magenta right platform', 18, -17, 15, 15, 0.38, 'astralMagenta', -0.06),
    box('one-bit rear dais', 0, -32, 18, 11, 0.4, 'oneBitGrid', -0.05),
    box('black bridge east', 11, 0, 12, 4.2, 0.33, 'astralBlack', -0.05),
  ];
  const walls = [
    box('west void lip', -28, -12, 0.6, 52, 1.5, 'astralBlack'),
    box('east void lip', 29, -12, 0.6, 52, 1.5, 'astralBlack'),
    box('north void lip', 0, -39, 58, 0.6, 1.5, 'astralBlack'),
    box('south void lip', 0, 11, 58, 0.6, 1.5, 'astralBlack'),
    box('left platform rail', -24.5, -19, 0.45, 13, 1.2, 'astralCyan'),
    box('right platform rail', 25.5, -17, 0.45, 15, 1.2, 'astralMagenta'),
  ];
  const platforms = [
    box('central ziggurat step one', -4.5, 4, 3.8, 3.2, 0.6, 'astralYellow'),
    box('central ziggurat step two', 0, 4, 3.8, 3.2, 1.2, 'astralMagenta'),
    box('central ziggurat step three', 4.5, 4, 3.8, 3.2, 1.8, 'astralCyan'),
  ];
  const crates = [
    box('central mirrored obelisk', 0, -7, 2.6, 2.6, 8.8, 'astralCyan'),
    box('cyan rotating diamond north', -7, -24, 2.8, 2.8, 3.8, 'astralCyan', 3.5, false, 'bob'),
    box('magenta rotating diamond east', 16, -11, 2.8, 2.8, 3.8, 'astralMagenta', 3.2, false, 'bob'),
    box('yellow rotating diamond west', -16, -11, 2.8, 2.8, 3.8, 'astralYellow', 3.0, false, 'bob'),
    box('black rotating diamond rear', 7, -31, 2.8, 2.8, 3.8, 'astralBlack', 3.7, false, 'bob'),
    box('mirrored monolith left', -20, -23, 2, 4, 6.5, 'oneBitGrid'),
    box('mirrored monolith right', 22, -20, 2, 4, 6.5, 'oneBitGrid'),
  ];
  for (let i = 0; i < 10; i += 1) {
    const angle = i / 10 * Math.PI * 2;
    crates.push(box(`orbit cube ${i + 1}`, Math.cos(angle) * 7.2, -7 + Math.sin(angle) * 7.2, 1.1, 1.1, 1.1, i % 2 ? 'astralMagenta' : 'astralCyan', 2.2, false, 'orbit'));
  }

  return withZombies({
    id: 'astral-geometry-garden',
    label: 'Astral Geometry Garden',
    clearColor: [0.01, 0.0, 0.035, 1],
    floor: floorPieces[0],
    floorPieces,
    ceiling: null,
    walls,
    crates,
    platforms,
    mountains: [
      mountain('cyan pyramid shard', -16, -31, 8, 7, 7, 'astralCyan'),
      mountain('magenta pyramid shard', 15, -30, 8, 7, 7, 'astralMagenta'),
      mountain('yellow pyramid shard', -11, -6, 7, 6, 5.5, 'astralYellow'),
      mountain('black pyramid shard', 18, -4, 7, 6, 5.5, 'astralBlack'),
    ],
    cards: [
      card('distant polygon comet 1', -24, 12, -35, 3.5, 1.0, 'flickerComet', 'flicker-comet'),
      card('distant polygon comet 2', -6, 15, -38, 3.5, 1.0, 'flickerComet', 'flicker-comet'),
      card('distant polygon comet 3', 18, 13, -36, 3.5, 1.0, 'flickerComet', 'flicker-comet'),
      card('distant polygon comet 4', 27, 10, -30, 3.5, 1.0, 'flickerComet', 'flicker-comet'),
    ],
    movingBillboards: [],
    sun: null,
    shootingStar: { texture: 'shootingStar', x: -26, y: 17, z: -37, width: 15, height: 1.5, interval: 10, delay: 1, duration: 2.0 },
    lights: [
      { x: 0, y: 9, z: -7, color: [0.45, 1.0, 1.0] },
      { x: -18, y: 6, z: -18, color: [1.0, 0.2, 0.9] },
      { x: 18, y: 6, z: -17, color: [1.0, 0.9, 0.18] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 8.5, yaw: 3.08 },
    killY: -12,
    textures,
  }, [
    { x: -10, z: -2 },
    { x: 12, z: -5 },
    { x: 0, z: -24 },
  ]);
}

function createMotelMirageWorld() {
  const textures = [
    { id: 'wetAsphalt', size: 128 },
    { id: 'motelWall', size: 128 },
    { id: 'motelDoor', size: 64 },
    { id: 'motelWindow', size: 64 },
    { id: 'poolWater', size: 64 },
    { id: 'vending', size: 64 },
    { id: 'palm', size: 64 },
    { id: 'motelSign', size: 128 },
    { id: 'car', size: 64 },
    { id: 'paleMoon', size: 64 },
    { id: 'shootingStar', size: 128 },
  ];
  const walls = [
    box('rear motel block', 0, -23, 46, 3.2, 5.2, 'motelWall'),
    box('left motel wing', -24, -6, 3.2, 34, 4.6, 'motelWall'),
    box('right covered walkway', 24, -5, 3.2, 34, 3.3, 'motelWall'),
    box('covered walkway roof', 8, -8, 35, 3.0, 0.45, 'motelWall', 3.2),
    box('north fence', 0, -38, 58, 0.55, 2.0, 'motelWall'),
    box('south parking curb', 0, 23, 58, 0.55, 1.0, 'wetAsphalt'),
    box('west parking curb', -30, -7, 0.55, 60, 1.0, 'wetAsphalt'),
    box('east parking curb', 30, -7, 0.55, 60, 1.0, 'wetAsphalt'),
  ];
  const crates = [
    box('empty pool north edge', 0, -5.9, 14.5, 0.65, 0.75, 'motelWall'),
    box('empty pool south edge', 0, 4.9, 14.5, 0.65, 0.75, 'motelWall'),
    box('empty pool west edge', -7.6, -0.5, 0.65, 11.3, 0.75, 'motelWall'),
    box('empty pool east edge', 7.6, -0.5, 0.65, 11.3, 0.75, 'motelWall'),
    box('mostly empty pool water shimmer', 0, -0.5, 12.6, 8.8, 0.08, 'poolWater', -0.04, true),
    box('flickering vending machine red', -18, 6, 1.4, 1.0, 2.4, 'vending'),
    box('flickering vending machine blue', -15.8, 6.2, 1.4, 1.0, 2.4, 'vending'),
    box('buzzing sign pole', -7.2, 16, 0.7, 0.7, 5.5, 'motelWall'),
    box('buzzing sign board', -7.2, 16, 5.8, 0.6, 2.2, 'motelSign', 5.0),
    box('parked car a', 13, 12, 4.2, 2.1, 1.25, 'car'),
    box('parked car b', 20, 9, 4.0, 2.1, 1.2, 'car'),
    box('warped rear room block', 13, -33, 10, 2.4, 5.8, 'motelWall'),
  ];
  const platforms = [
    box('pool basin step low', -4.5, -0.5, 3.6, 2.4, 0.5, 'motelWall'),
    box('pool basin step high', 0, -0.5, 3.6, 2.4, 1.0, 'motelWall'),
    box('parking curb jump pad', 15, 16, 5.2, 2.4, 0.75, 'wetAsphalt'),
  ];
  for (let i = 0; i < 8; i += 1) {
    crates.push(box(`palm trunk ${i + 1}`, -21 + (i % 4) * 14, 13 - Math.floor(i / 4) * 28, 0.8, 0.8, 4.4, 'palm'));
  }

  const cards = [
    card('oversized moon reflection billboard', 17, 10, -34, 8, 8, 'paleMoon', 'moon-slide'),
    card('buzzing sign letters', -7.2, 7.0, 15.6, 5.8, 1.4, 'motelSign', 'sign-flicker'),
    card('shallow pool water shimmer card', 0, 0.15, -0.5, 12, 8, 'poolWater', 'water-shimmer'),
  ];
  for (let i = 0; i < 12; i += 1) {
    cards.push(card(`palm frond snap ${i + 1}`, -21 + (i % 4) * 14 + (i % 3 - 1) * 0.7, 6.0, 13 - Math.floor(i / 4) * 14, 4.2, 1.6, 'palm', 'palm-snap'));
  }
  for (let i = 0; i < 10; i += 1) {
    cards.push(card(`pulsing motel room window ${i + 1}`, -18 + i * 4, 2.8, -21.3, 1.4, 1.0, 'motelWindow', 'window-pulse'));
    cards.push(card(`repeating motel door ${i + 1}`, -18 + i * 4, 1.55, -21.1, 1.1, 2.3, 'motelDoor', null));
  }

  return withZombies({
    id: 'motel-mirage',
    label: 'Liminal Motel Mirage',
    clearColor: [0.018, 0.018, 0.03, 1],
    floor: box('wet asphalt courtyard', 0, 0, 60, 60, 0.08, 'wetAsphalt', -0.08),
    ceiling: null,
    walls,
    crates,
    platforms,
    mountains: [
      mountain('strange rear roofline left', -17, -39, 10, 6, 5, 'motelWall'),
      mountain('strange rear roofline right', 18, -39, 10, 6, 5, 'motelWall'),
    ],
    cards,
    movingBillboards: [
      card('giant motel moon', 18, 15, -35, 7.8, 7.8, 'paleMoon', 'moon-slide'),
    ],
    sun: null,
    shootingStar: { texture: 'shootingStar', x: -25, y: 12, z: -36, width: 12, height: 1.2, interval: 11, delay: 2, duration: 2.1 },
    lights: [
      { x: -7, y: 6, z: 13, color: [1.0, 0.72, 0.28] },
      { x: -17, y: 3, z: 6, color: [0.38, 0.72, 1.0] },
      { x: 10, y: 5, z: -8, color: [1.0, 0.38, 0.28] },
    ],
    playerSpawn: { x: -7.5, y: 1.45, z: 18, yaw: 3.03 },
    killY: -9,
    textures,
  }, [
    { x: -18, z: 14 },
    { x: 18, z: 16 },
    { x: 0, z: -14 },
  ]);
}

function card(name, x, y, z, width, height, texture, motion = null) {
  return { name, x, y, z, width, height, texture, motion };
}

function createDerelictStarshipWorld() {
  const textures = [
    { id: 'starshipFloor', size: 128 },
    { id: 'panel', size: 64 },
    { id: 'warning', size: 64 },
    { id: 'metal', size: 128 },
  ];

  return withZombies({
    id: 'derelict-starship',
    label: 'Derelict starship',
    clearColor: [0.025, 0.035, 0.05, 1],
    floor: box('deck plating', 0, 0, 34, 34, 0.08, 'starshipFloor', -0.08),
    ceiling: box('low ship ceiling', 0, 0, 34, 34, 0.08, 'panel', 3.0),
    walls: [
      box('outer north', 0, -17.2, 34, 0.4, 3.1, 'panel'),
      box('outer south', 0, 17.2, 34, 0.4, 3.1, 'panel'),
      box('outer west', -17.2, 0, 0.4, 34, 3.1, 'panel'),
      box('outer east', 17.2, 0, 0.4, 34, 3.1, 'panel'),
      box('spine left', -3.2, -7, 0.35, 16, 2.8, 'metal'),
      box('spine right', 3.2, -7, 0.35, 16, 2.8, 'metal'),
      box('reactor wall', 0, 2.3, 12, 0.35, 2.8, 'panel'),
      box('med bay wall', -9, 6.8, 7.5, 0.35, 2.6, 'panel'),
      box('cargo wall', 9, 7.2, 7.5, 0.35, 2.6, 'panel'),
      box('broken bulkhead', 0, -13, 6, 0.4, 1.8, 'warning'),
    ],
    crates: [
      box('cryopod 1', -10, -9, 2.4, 1.2, 1.0, 'metal'),
      box('cryopod 2', -10, -6.6, 2.4, 1.2, 1.0, 'metal'),
      box('reactor core', 0, 6.8, 2.2, 2.2, 2.6, 'warning'),
      box('server rack', 11, -5.5, 1.2, 3.0, 2.2, 'panel'),
      box('cargo pallet', 9.8, 10.5, 3.2, 1.7, 1.2, 'metal'),
    ],
    platforms: [
      box('cargo stair low', 6.4, 10.5, 2.6, 1.7, 0.55, 'metal'),
      box('cargo stair high', 8.2, 10.5, 2.6, 1.7, 1.1, 'metal'),
      box('reactor service platform', -2.8, 6.8, 2.4, 2.2, 1.35, 'warning'),
    ],
    mountains: [],
    sun: null,
    lights: [
      { x: 0, y: 2.6, z: -10, color: [0.35, 0.8, 1.0] },
      { x: 0, y: 2.6, z: 7, color: [1.0, 0.24, 0.18] },
      { x: -10, y: 2.5, z: 6, color: [0.55, 0.9, 1.0] },
      { x: 10, y: 2.5, z: 10, color: [1.0, 0.68, 0.32] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 13, yaw: 3.14 },
    killY: -8,
    textures,
  }, [
    { x: -11, z: 12 },
    { x: 11, z: 12 },
    { x: 0, z: -10 },
  ]);
}

function createNeonBackstreetsWorld() {
  const textures = [
    { id: 'neonSky', size: 128 },
    { id: 'neonTile', size: 128 },
    { id: 'neonGlass', size: 128 },
    { id: 'neonCloud', size: 128 },
    { id: 'neonBark', size: 64 },
    { id: 'neonLeaf', size: 64 },
    { id: 'metal', size: 128 },
    { id: 'lightning', size: 64 },
  ];

  const walls = [
    box('psychedelic sky west wall', -42, 0, 0.5, 76, 16, 'neonSky', -1),
    box('psychedelic sky east wall', 42, 0, 0.5, 76, 16, 'neonSky', -1),
    box('psychedelic horizon north wall', 0, -38, 84, 0.5, 16, 'neonSky', -1),
    box('psychedelic horizon south wall', 0, 38, 84, 0.5, 16, 'neonSky', -1),
    box('floating platform entry', 0, 18, 18, 10, 0.7, 'neonTile', 0, true),
    box('floating platform tree island', 11, 1, 15, 11, 0.7, 'neonTile', 0.4, true),
    box('floating platform glass ledge', -12, 0, 13, 8, 0.7, 'neonTile', -0.15, true),
    box('floating platform far bridge', -2, -16, 28, 7, 0.65, 'neonTile', 0.2, true),
    box('floating platform high shard', 18, -17, 9, 7, 0.6, 'neonTile', 3.2, true),
    box('left glowing tower', -21, -13, 5, 18, 14, 'neonGlass'),
    box('rear glowing tower', 3, -27, 7, 7, 18, 'neonGlass'),
    box('right wave wall', 25, -3, 4, 34, 17, 'neonGlass'),
    box('black void trench', -2.5, 5.5, 3.0, 29, 0.22, 'metal', -0.16, true),
  ];

  const crates = [
    box('tree trunk base', 9.6, 1.2, 1.1, 1.1, 3.4, 'neonBark', 0.75),
    box('tree trunk twist lower', 9.1, -0.1, 0.9, 1.0, 3.2, 'neonBark', 2.8),
    box('tree trunk twist upper', 10.0, -1.0, 0.8, 0.9, 3.0, 'neonBark', 5.5),
    box('tree branch left', 7.5, -1.8, 4.4, 0.7, 0.7, 'neonBark', 7.2),
    box('tree branch right', 12.6, -1.7, 5.0, 0.7, 0.7, 'neonBark', 7.0),
    box('tree branch crown', 9.8, -3.4, 2.0, 4.0, 0.7, 'neonBark', 8.0),
    box('tree leaf crown center', 9.6, -3.2, 7.0, 4.8, 3.4, 'neonLeaf', 8.0),
    box('tree leaf crown left', 6.2, -1.2, 5.2, 4.0, 2.8, 'neonLeaf', 7.2),
    box('tree leaf crown right', 13.3, -1.5, 5.6, 4.4, 3.0, 'neonLeaf', 7.0),
    box('tree leaf crown rear', 10.7, -5.2, 4.8, 3.4, 2.8, 'neonLeaf', 7.8),
    box('glass platform railing left', -9.5, 17.5, 0.45, 9.5, 1.2, 'neonGlass', 0.8),
    box('glass platform railing right', 9.5, 17.5, 0.45, 9.5, 1.2, 'neonGlass', 0.8),
  ];

  const platforms = [
    box('neon stair low solid', -15.5, 8.0, 5.0, 3.0, 0.5, 'neonTile', 1.4),
    box('neon stair mid solid', -19.0, 2.4, 4.0, 3.0, 0.5, 'neonTile', 2.4),
    box('neon stair high solid', -23.0, -3.2, 3.5, 2.6, 0.5, 'neonTile', 3.4),
    box('neon right jump island solid', 22.0, 10.0, 5.5, 3.0, 0.5, 'neonTile', 2.2),
  ];

  const clouds = [
    mountain('cloud ember left', -22, -33, 18, 4, 3.0, 'neonCloud'),
    mountain('cloud ember center', -8, -35, 23, 4, 3.4, 'neonCloud'),
    mountain('cloud ember right', 12, -34, 19, 4, 2.8, 'neonCloud'),
    mountain('cloud low violet', -25, 23, 20, 5, 2.2, 'neonCloud'),
  ];

  return withZombies({
    id: 'neon-backstreets',
    label: 'Neon backstreets',
    skyMode: 'psychedelic',
    clearColor: [0.16, 0.08, 0.55, 1],
    floor: box('floating platform spawn deck', 0, 22, 16, 8, 0.7, 'neonTile', -0.08),
    ceiling: null,
    walls,
    crates,
    platforms,
    mountains: clouds,
    sun: null,
    lightning: {
      texture: 'lightning',
      interval: 8.5,
      duration: 0.42,
      bolts: [
        {
          name: 'fork lightning main',
          width: 0.18,
          points: [
            { x: -28, y: 13, z: -31 },
            { x: -25, y: 9.5, z: -30.5 },
            { x: -27, y: 6.2, z: -30 },
            { x: -22, y: 3.4, z: -29.8 },
            { x: -24, y: 1.2, z: -29.5 },
          ],
        },
        {
          name: 'fork lightning branch left',
          width: 0.13,
          points: [
            { x: -25, y: 9.5, z: -30.5 },
            { x: -31, y: 8.0, z: -30.2 },
            { x: -34, y: 6.8, z: -29.8 },
          ],
        },
        {
          name: 'fork lightning branch right',
          width: 0.12,
          points: [
            { x: -22, y: 3.4, z: -29.8 },
            { x: -17, y: 2.5, z: -29.4 },
            { x: -14, y: 3.2, z: -29.0 },
          ],
        },
      ],
    },
    audio: {
      wind: true,
      lightning: true,
    },
    lights: [
      { x: -23, y: 12, z: -26, color: [0.5, 0.9, 1.0] },
      { x: 22, y: 10, z: -4, color: [0.35, 1.0, 1.0] },
      { x: 8, y: 10, z: -2, color: [0.6, 1.0, 0.28] },
      { x: -10, y: 5, z: 18, color: [1.0, 0.25, 0.92] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 24, yaw: 3.12 },
    killY: -14,
    textures,
  }, [
    { x: -6, z: 21 },
    { x: 9, z: 3 },
    { x: -2, z: -16 },
  ]);
}

function createSunkenTempleWorld() {
  const textures = [
    { id: 'templeStone', size: 128 },
    { id: 'mossStone', size: 64 },
    { id: 'water', size: 64 },
    { id: 'sun', size: 64 },
    { id: 'rain', size: 64 },
  ];
  const rainDrops = [];

  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      rainDrops.push({
        x: -22 + col * 8.8 + (row % 2) * 2.1,
        y: 6.5 + ((row + col) % 3) * 0.6,
        z: -22 + row * 8.8,
        width: 0.08,
        height: 4.8 + ((row + col) % 2) * 1.2,
      });
    }
  }

  return withZombies({
    id: 'sunken-temple',
    label: 'Sunken temple',
    clearColor: [0.04, 0.08, 0.09, 1],
    floor: box('flooded temple floor', 0, 0, 54, 54, 0.08, 'water', -0.08),
    ceiling: null,
    walls: [
      box('north ruins', 0, -27, 54, 0.7, 4.0, 'templeStone'),
      box('south ruins', 0, 27, 54, 0.7, 4.0, 'templeStone'),
      box('west ruins', -27, 0, 0.7, 54, 4.0, 'templeStone'),
      box('east ruins', 27, 0, 0.7, 54, 4.0, 'templeStone'),
      box('raised walkway north', 0, -10, 24, 4, 0.45, 'templeStone', 0),
      box('raised walkway south', 0, 11, 24, 4, 0.45, 'templeStone', 0),
      box('left broken wall', -12, 0, 3, 18, 2.2, 'mossStone'),
      box('right broken wall', 12, 0, 3, 18, 2.2, 'mossStone'),
    ],
    crates: [
      box('obelisk a', -8, -7, 1.4, 1.4, 4.2, 'mossStone'),
      box('obelisk b', 8, -7, 1.4, 1.4, 4.2, 'mossStone'),
      box('obelisk c', -8, 8, 1.4, 1.4, 3.8, 'mossStone'),
      box('obelisk d', 8, 8, 1.4, 1.4, 3.8, 'mossStone'),
      box('altar', 0, 0, 4.0, 3.0, 1.2, 'templeStone'),
      box('fallen lintel', -1, 15, 9, 1.2, 0.8, 'mossStone'),
    ],
    platforms: [
      box('submerged stair low', -7, 14, 4.0, 2.6, 0.55, 'templeStone'),
      box('submerged stair high', -3, 14, 4.0, 2.6, 1.1, 'templeStone'),
      box('altar upper landing', 3.6, 0, 3.2, 3.0, 1.7, 'mossStone'),
    ],
    mountains: [
      mountain('distant jungle mound west', -22, -32, 14, 8, 5, 'mossStone'),
      mountain('distant jungle mound east', 21, -31, 16, 9, 6, 'mossStone'),
    ],
    sun: { name: 'foggy temple moon', x: -18, y: 14, z: -33, width: 5, height: 5, texture: 'sun' },
    rain: {
      texture: 'rain',
      drops: rainDrops,
    },
    lights: [
      { x: 0, y: 6, z: 0, color: [0.45, 1.0, 0.82] },
      { x: -8, y: 4, z: -7, color: [0.6, 0.9, 1.0] },
      { x: 8, y: 4, z: 8, color: [0.55, 1.0, 0.55] },
      { x: -18, y: 14, z: -28, color: [0.75, 0.85, 1.0] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 22, yaw: 3.14 },
    killY: -9,
    textures,
  }, [
    { x: -16, z: 18 },
    { x: 16, z: 18 },
    { x: 0, z: -16 },
  ]);
}

function createOneBitCathedralWorld() {
  const textures = [
    { id: 'oneBitVoid', size: 128 },
    { id: 'oneBitGrid', size: 128 },
    { id: 'oneBitCross', size: 64 },
    { id: 'oneBitStripe', size: 64 },
    { id: 'oneBitCircuit', size: 128 },
  ];
  const walls = [
    box('outer west raster wall', -22.5, 0, 0.7, 50, 5.4, 'oneBitCircuit'),
    box('outer east raster wall', 22.5, 0, 0.7, 50, 5.4, 'oneBitCircuit'),
    box('outer north lintel', 0, -25.2, 45, 0.7, 5.8, 'oneBitStripe'),
    box('outer south threshold', 0, 25.2, 45, 0.7, 2.2, 'oneBitGrid'),
    box('left central pier', -7.2, -5.2, 1.0, 26, 8.4, 'oneBitCross'),
    box('right central pier', 7.2, -5.2, 1.0, 26, 8.4, 'oneBitCross'),
    box('rear tower face', 0, -18.5, 13, 0.8, 9.2, 'oneBitCross'),
    box('altar back screen', 0, -8.2, 11, 0.6, 5.8, 'oneBitStripe'),
    box('left altar return', -5.8, -3.6, 0.6, 9, 5.0, 'oneBitGrid'),
    box('right altar return', 5.8, -3.6, 0.6, 9, 5.0, 'oneBitGrid'),
    box('low nave rail left', -4.2, 8, 0.5, 23, 1.1, 'oneBitStripe'),
    box('low nave rail right', 4.2, 8, 0.5, 23, 1.1, 'oneBitStripe'),
  ];

  for (let i = 0; i < 6; i += 1) {
    const z = -18 + i * 7.2;
    const height = 5.4 - i * 0.3;
    walls.push(box(`west horizontal band ${i + 1}`, -14.2, z, 11.2, 0.55, height, 'oneBitStripe'));
    walls.push(box(`east horizontal band ${i + 1}`, 14.2, z, 11.2, 0.55, height, 'oneBitStripe'));
    walls.push(box(`west side spine ${i + 1}`, -18.3 + i * 0.2, z + 2.6, 0.5, 4.2, 4.4, 'oneBitCircuit'));
    walls.push(box(`east side spine ${i + 1}`, 18.3 - i * 0.2, z + 2.6, 0.5, 4.2, 4.4, 'oneBitCircuit'));
  }

  for (let i = 0; i < 5; i += 1) {
    const offset = i * 1.3;
    walls.push(box(`left nested arch ${i + 1}`, -10.8 - offset, 6 + i * 2.4, 0.45, 14 - i, 3.4 + i * 0.45, 'oneBitGrid'));
    walls.push(box(`right nested arch ${i + 1}`, 10.8 + offset, 6 + i * 2.4, 0.45, 14 - i, 3.4 + i * 0.45, 'oneBitGrid'));
  }

  const crates = [
    box('black altar slab', 0, -2.6, 5.2, 3.1, 1.2, 'oneBitVoid'),
    box('white altar core', 0, -4.2, 2.2, 1.7, 3.8, 'oneBitCross'),
    box('tower crown base', 0, -16.2, 7.0, 2.2, 2.0, 'oneBitStripe', 5.8),
    box('tower crown spike', 0, -17.4, 2.0, 1.4, 3.7, 'oneBitCross', 7.8),
    box('center aisle dark strip', 0, 10.4, 2.1, 22.4, 0.18, 'oneBitVoid', 0, true),
  ];
  const platforms = [
    box('pixel stair low', -3.5, 14, 3.0, 2.2, 0.55, 'oneBitStripe'),
    box('pixel stair high', 0, 14, 3.0, 2.2, 1.1, 'oneBitCross'),
    box('altar side platform', 4.2, -2.6, 2.6, 3.1, 1.65, 'oneBitGrid'),
  ];

  for (let i = 0; i < 8; i += 1) {
    const z = -16 + i * 4.8;
    const width = 1.0 + (i % 3) * 0.35;
    crates.push(box(`west pixel rib ${i + 1}`, -6.0 - i * 0.55, z, width, 1.2, 2.2 + i * 0.18, 'oneBitCross'));
    crates.push(box(`east pixel rib ${i + 1}`, 6.0 + i * 0.55, z, width, 1.2, 2.2 + i * 0.18, 'oneBitCross'));
  }

  for (let i = 0; i < 7; i += 1) {
    const z = 16.5 - i * 3.0;
    crates.push(box(`left circuit plinth ${i + 1}`, -16.8 + i * 0.7, z, 2.8, 0.7, 1.1 + i * 0.18, 'oneBitCircuit'));
    crates.push(box(`right circuit plinth ${i + 1}`, 16.8 - i * 0.7, z, 2.8, 0.7, 1.1 + i * 0.18, 'oneBitCircuit'));
  }

  return withZombies({
    id: 'one-bit-cathedral',
    label: '1-bit cathedral',
    oneBit: true,
    oneBitStyle: 'dithered-gradient',
    clearColor: [0.075, 0.068, 0.052, 1],
    floor: box('one bit floor', 0, 0, 45, 50, 0.08, 'oneBitGrid', -0.08),
    ceiling: null,
    walls,
    crates,
    platforms,
    mountains: [
      mountain('left raster skyline', -18, -31, 14, 8, 7, 'oneBitCircuit'),
      mountain('center raster skyline', 0, -33, 18, 9, 9, 'oneBitCross'),
      mountain('right raster skyline', 18, -31, 14, 8, 7, 'oneBitCircuit'),
    ],
    sun: null,
    lights: [
      { x: 0, y: 8, z: -14, color: [1, 1, 1] },
      { x: -11, y: 6, z: 2, color: [1, 1, 1] },
      { x: 11, y: 6, z: 2, color: [1, 1, 1] },
      { x: 0, y: 4, z: 18, color: [1, 1, 1] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 21, yaw: 3.14 },
    killY: -8,
    textures,
  }, [
    { x: -18, z: 20 },
    { x: 18, z: 20 },
    { x: 0, z: 12 },
  ]);
}

function box(name, x, z, width, depth, height, texture, y = 0, noCollider = false, motion = null) {
  return {
    name,
    x,
    y,
    z,
    width,
    depth,
    height,
    texture,
    motion,
    collider: noCollider ? null : {
      minX: x - width / 2,
      maxX: x + width / 2,
      minY: y,
      maxY: y + height,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    },
  };
}

function withZombies(scene, zombieSpawns) {
  return {
    ...scene,
    zombieSpawns,
    textures: scene.textures.some((texture) => texture.id === 'zombie')
      ? scene.textures
      : [...scene.textures, { id: 'zombie', size: 64 }],
  };
}
