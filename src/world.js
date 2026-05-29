const WALL_HEIGHT = 3.0;

export const SCENE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'dungeon', label: 'Dungeon' }),
  Object.freeze({ id: 'alien-landscape', label: 'Alien landscape' }),
  Object.freeze({ id: 'derelict-starship', label: 'Derelict starship' }),
  Object.freeze({ id: 'neon-backstreets', label: 'Neon backstreets' }),
  Object.freeze({ id: 'sunken-temple', label: 'Sunken temple' }),
  Object.freeze({ id: 'one-bit-cathedral', label: '1-bit cathedral' }),
]);

export function createSceneWorld(id) {
  if (id === 'alien-landscape') return createAlienLandscapeWorld();
  if (id === 'derelict-starship') return createDerelictStarshipWorld();
  if (id === 'neon-backstreets') return createNeonBackstreetsWorld();
  if (id === 'sunken-temple') return createSunkenTempleWorld();
  if (id === 'one-bit-cathedral') return createOneBitCathedralWorld();
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

  return {
    id: 'dungeon',
    label: 'Dungeon',
    clearColor: [0.035, 0.034, 0.03, 1],
    floor: box('floor', 0, 0, 25.6, 23.6, 0.08, 'concrete', -0.08),
    ceiling: box('ceiling', 0, 0, 25.6, 23.6, 0.08, 'metal', WALL_HEIGHT),
    walls,
    crates,
    mountains: [],
    sun: null,
    lights: [
      { x: -8, y: 2.8, z: -8, color: [1.0, 0.74, 0.42] },
      { x: 4, y: 2.8, z: -8, color: [0.55, 0.82, 1.0] },
      { x: -5, y: 2.8, z: 5, color: [1.0, 0.86, 0.58] },
      { x: 8, y: 2.8, z: 8, color: [0.85, 0.95, 1.0] },
    ],
    playerSpawn: { x: -9.5, y: 1.45, z: 9.5, yaw: 2.35 },
    textures,
  };
}

function crate(x, z, width, depth, height) {
  return box(`crate ${x} ${z}`, x, z, width, depth, height, 'crate');
}

function createAlienLandscapeWorld() {
  const textures = [
    { id: 'alienGround', size: 128 },
    { id: 'alienRock', size: 64 },
    { id: 'sun', size: 64 },
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

  return {
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
    mountains,
    sun: {
      name: 'small red sun',
      x: 16,
      y: 16,
      z: -37,
      width: 7,
      height: 7,
      texture: 'sun',
    },
    lights: [
      { x: 16, y: 18, z: -30, color: [1.0, 0.48, 0.22] },
      { x: -14, y: 6, z: -10, color: [0.38, 0.72, 1.0] },
      { x: 15, y: 4, z: 8, color: [0.8, 0.55, 1.0] },
      { x: 0, y: 5, z: 20, color: [0.55, 1.0, 0.78] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 15, yaw: 3.12 },
    textures,
  };
}

function mountain(name, x, z, width, depth, height, texture) {
  return { name, x, y: 0, z, width, depth, height, texture };
}

function createDerelictStarshipWorld() {
  const textures = [
    { id: 'starshipFloor', size: 128 },
    { id: 'panel', size: 64 },
    { id: 'warning', size: 64 },
    { id: 'metal', size: 128 },
  ];

  return {
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
    mountains: [],
    sun: null,
    lights: [
      { x: 0, y: 2.6, z: -10, color: [0.35, 0.8, 1.0] },
      { x: 0, y: 2.6, z: 7, color: [1.0, 0.24, 0.18] },
      { x: -10, y: 2.5, z: 6, color: [0.55, 0.9, 1.0] },
      { x: 10, y: 2.5, z: 10, color: [1.0, 0.68, 0.32] },
    ],
    playerSpawn: { x: 0, y: 1.45, z: 13, yaw: 3.14 },
    textures,
  };
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
    box('floating platform step a', -15.5, 8.0, 5.0, 3.0, 0.5, 'neonTile', 1.4, true),
    box('floating platform step b', -19.0, 2.4, 4.0, 3.0, 0.5, 'neonTile', 2.4, true),
    box('floating platform step c', -23.0, -3.2, 3.5, 2.6, 0.5, 'neonTile', 3.4, true),
    box('floating platform step d', 22.0, 10.0, 5.5, 3.0, 0.5, 'neonTile', 2.2, true),
  ];

  const clouds = [
    mountain('cloud ember left', -22, -33, 18, 4, 3.0, 'neonCloud'),
    mountain('cloud ember center', -8, -35, 23, 4, 3.4, 'neonCloud'),
    mountain('cloud ember right', 12, -34, 19, 4, 2.8, 'neonCloud'),
    mountain('cloud low violet', -25, 23, 20, 5, 2.2, 'neonCloud'),
  ];

  return {
    id: 'neon-backstreets',
    label: 'Neon backstreets',
    skyMode: 'psychedelic',
    clearColor: [0.16, 0.08, 0.55, 1],
    floor: box('floating platform spawn deck', 0, 22, 16, 8, 0.7, 'neonTile', -0.08),
    ceiling: null,
    walls,
    crates,
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
    textures,
  };
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

  return {
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
    textures,
  };
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

  return {
    id: 'one-bit-cathedral',
    label: '1-bit cathedral',
    oneBit: true,
    oneBitStyle: 'dithered-gradient',
    clearColor: [0.075, 0.068, 0.052, 1],
    floor: box('one bit floor', 0, 0, 45, 50, 0.08, 'oneBitGrid', -0.08),
    ceiling: null,
    walls,
    crates,
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
    textures,
  };
}

function box(name, x, z, width, depth, height, texture, y = 0, noCollider = false) {
  return {
    name,
    x,
    y,
    z,
    width,
    depth,
    height,
    texture,
    collider: noCollider ? null : {
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    },
  };
}
