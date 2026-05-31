import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isEnemySpawnBlocked, normalizeEnemySpawns } from '../src/enemySpawnValidation.js';
import { parseLevelGlb } from '../src/levelGlb.js';
import { SCENE_DEFINITIONS } from '../src/world.js';

test('normalizes Blender-authored enemy markers onto open walkable space', () => {
  for (const definition of SCENE_DEFINITIONS) {
    const level = readLevel(definition.id);
    const colliders = level.collision.map((collider) => ({ ...collider }));
    const walkableSurfaces = level.walkableSurfaces.map((surface) => ({ ...surface }));
    const spawns = [
      ...level.zombieSpawns.map((spawn) => ({ ...spawn, enemyType: 'zombie', radius: spawn.radius ?? 0.38 })),
      ...level.enemySpawns,
    ];
    const normalized = normalizeEnemySpawns(spawns, {
      colliders,
      walkableSurfaces,
      defaultRadius: 0.38,
    });

    for (const spawn of normalized) {
      assert.equal(
        isEnemySpawnBlocked(spawn, colliders, spawn.radius ?? 0.38),
        false,
        `${definition.id} ${spawn.enemyType ?? 'zombie'} ${spawn.name}`,
      );
    }
  }
});

function readLevel(id) {
  const file = readFileSync(new URL(`../assets/models/levels/${id}.glb`, import.meta.url));
  return parseLevelGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), id);
}
