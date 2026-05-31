import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const buildScript = readFileSync(new URL('../scripts/build-level-glbs.py', import.meta.url), 'utf8');
const reexportScript = readFileSync(new URL('../scripts/reexport-level-glbs.py', import.meta.url), 'utf8');

test('Blender master file groups level objects into artist-friendly sub-collections', () => {
  assert.match(buildScript, /"01_ART_render_meshes"/);
  assert.match(buildScript, /"02_COLLISION_blockers"/);
  assert.match(buildScript, /"03_WALKABLE_surfaces"/);
  assert.match(buildScript, /"04_MARKERS_spawns_lights"/);
  assert.match(buildScript, /"05_TRIGGERS_damage_zones"/);
});

test('GLB re-export selects objects recursively from Blender level sub-collections', () => {
  assert.match(buildScript, /def objects_recursive\(collection\):/);
  assert.match(buildScript, /for child in collection\.children:/);
  assert.match(reexportScript, /def objects_recursive\(collection\):/);
  assert.match(reexportScript, /for child in collection\.children:/);
});

test('generated Blender texture materials explicitly use UV coordinates', () => {
  assert.match(buildScript, /ShaderNodeTexCoord/);
  assert.match(buildScript, /texture_coordinate_node\.outputs\["UV"\]/);
  assert.match(buildScript, /texture_node\.inputs\["Vector"\]/);
});
