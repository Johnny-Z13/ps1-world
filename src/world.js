const WALL_HEIGHT = 3.0;

export const SCENE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'dungeon', label: 'Dungeon' }),
  Object.freeze({ id: 'alien-landscape', label: 'Alien landscape' }),
]);

export function createSceneWorld(id) {
  if (id === 'alien-landscape') return createAlienLandscapeWorld();
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

function box(name, x, z, width, depth, height, texture, y = 0) {
  return {
    name,
    x,
    y,
    z,
    width,
    depth,
    height,
    texture,
    collider: {
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    },
  };
}
