import { SCENE_DEFINITIONS, createSceneWorld } from '../src/world.js';
import { writeFileSync } from 'node:fs';

const outputPath = process.argv[2];

if (!outputPath) {
  throw new Error('Usage: node scripts/export-level-seed-data.mjs <output-path>');
}

const scenes = SCENE_DEFINITIONS.map((definition) => {
  const world = createSceneWorld(definition.id);
  return {
    id: world.id,
    label: world.label,
    clearColor: world.clearColor,
    playerSpawn: world.playerSpawn,
    killY: world.killY,
    textures: world.textures,
    floor: world.floor,
    floorPieces: world.floorPieces,
    ceiling: world.ceiling,
    walls: world.walls,
    crates: world.crates,
    platforms: world.platforms,
    mountains: world.mountains,
    props: world.props,
    cards: world.cards,
    movingBillboards: world.movingBillboards,
    stars: world.stars,
    sun: world.sun,
    shootingStar: world.shootingStar,
    rain: world.rain,
    lightning: world.lightning,
    lights: world.lights,
    torchLights: world.torchLights,
    zombieSpawns: world.zombieSpawns,
    healthPotions: world.healthPotions,
    damageZones: world.damageZones,
    playerTorch: world.playerTorch,
    skyMode: world.skyMode,
    oneBit: world.oneBit,
    oneBitStyle: world.oneBitStyle,
    audio: world.audio,
  };
});

writeFileSync(outputPath, `${JSON.stringify({ scenes }, null, 2)}\n`);
