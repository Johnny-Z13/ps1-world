# Blender Level Pipeline

This project is moving toward Blender-authored levels. The browser game should treat each exported GLB as a compiled level package, while Blender remains the design/editing tool. `src/world.js` is fallback metadata and procedural resilience, not the primary place to grow new layout or art.

This browser repo is the lead project. A downstream Unity version may consume or mirror concepts from this repo, but agents working here should not modify downstream Unity folders unless the user explicitly asks.

## Source and Runtime Files

- Source authoring file: `assets/models/levels/ps1-world-levels.blend`
- Runtime exports: `assets/models/levels/<scene-id>.glb`
- Current seed metadata: `assets/models/levels/level-seed-data.json`
- Rebuild helper: `scripts/build-level-glbs.py`

The seed GLBs were generated from the current `src/world.js` scene definitions so the first Blender-authored pass starts from the existing game layout.

## Commands

Generate seed data from the fallback JS scene definitions:

```bash
node scripts/export-level-seed-data.mjs assets/models/levels/level-seed-data.json
```

Build a new Blender source file and export GLBs from seed data:

```bash
blender --factory-startup -b --python scripts/build-level-glbs.py -- assets/models/levels
```

Re-export GLBs from the current Blender source file after editing:

```bash
blender -b assets/models/levels/ps1-world-levels.blend --python scripts/reexport-level-glbs.py -- assets/models/levels
```

After any exported GLB changes, bump `LEVEL_GLB_URLS` cache busting in `src/levelGlb.js`.

To regenerate the authoring file and all runtime GLBs from the seed data:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.3\blender.exe' --factory-startup -b --python scripts\build-level-glbs.py -- assets\models\levels
```

## Node Naming Convention

Each `LEVEL_<scene-id>` collection is an artist-facing container with named child collections:

- `01_ART_render_meshes__<scene-id>`: visible level geometry.
- `02_COLLISION_blockers__<scene-id>`: simplified blocker volumes.
- `03_WALKABLE_surfaces__<scene-id>`: ground/platform top surfaces.
- `04_MARKERS_spawns_lights__<scene-id>`: spawn, enemy spawner, pickup, light, and kill-plane markers.
- `05_TRIGGERS_damage_zones__<scene-id>`: gameplay trigger volumes.

- `ART_<scene-id>_<name>`: visible level geometry rendered by the game.
- `COLLISION_<scene-id>_<name>`: simplified blocker geometry used for horizontal collision. This should be hidden in Blender while editing art.
- `WALKABLE_<scene-id>_<name>`: simplified surfaces used for ground height, stairs, platforms, and ledges.
- `MARKER_<scene-id>_PLAYER_SPAWN_<name>`: player spawn with `yaw` metadata.
- `MARKER_<scene-id>_ZOMBIE_SPAWN_<name>`: standard zombie spawn points.
- `MARKER_<scene-id>_ENEMY_SPAWN_<name>`: typed enemy spawners. The runtime reads custom properties such as `role: enemy`, `spawnerType: enemy`, `enemyType`, `mesh`, `radius`, `speed`, and `damage`. This is the portable metadata contract for browser and Unity importers.
- `MARKER_<scene-id>_PICKUP_HEALTH_<name>`: health pickup spawn points.
- `MARKER_<scene-id>_OBJECTIVE_<name>`: objective ritual marker for strange per-scene goals such as impossible-object collection, TV activation, torch extinguishing, alien beacon tuning, or gate feeding. The runtime reads `objectiveId`, `objectiveType`, `label`, `targetId`, `countRequired`, `requiredInRogue`, and `enabled` from custom properties. `objectiveType` defaults to `ritual`, and `requiredInRogue` defaults to `true`.
- `MARKER_<scene-id>_EMITTER_<index>_<name>`: visual or audio emitter anchor for authored drips, sparks, radio hiss, lure noises, particles, and one-off weirdness. The runtime reads `emitterId`, `emitterType`, `targetId`, `textureId`, `soundId`, `targetBus`, `gain`, `radius`, `rate`, and `enabled` from custom properties. `emitterType` defaults to `ambient`.
- `MARKER_<scene-id>_LIGHT_<name>` and `MARKER_<scene-id>_TORCH_LIGHT_<name>`: gameplay/render light markers.
- `MARKER_<scene-id>_KILL_PLANE_<name>`: kill-plane metadata.
- `TRIGGER_<scene-id>_DAMAGE_ZONE_<index>_<name>`: damage trigger volume. The runtime reads `surfaceType`, `damagePerSecond`, `width`, `depth`, and `height` from custom properties.
- `TRIGGER_<scene-id>_HORDE_TRIGGER_<index>_<name>`: encounter trigger volume for authored horde beats. The runtime reads `triggerType`, `width`, `depth`, `height`, `maxAlive`, `pulseIntervalMs`, and `enabled` from custom properties. `triggerType` defaults to `awaken_horde`.
- `TRIGGER_<scene-id>_ENCOUNTER_TRIGGER_<index>_<name>`: generic authored set-piece trigger volume for ambush closets, jump scares, monster wake volumes, radio/noise emitters, and warp-door traps. The runtime reads `encounterType`, `targetId`, `soundId`, `width`, `depth`, `height`, `oneShot`, and `enabled` from custom properties. `encounterType` defaults to `set_piece`.
- `TRIGGER_<scene-id>_SOUND_ZONE_<index>_<name>`: spatial audio zone volume for humming walls, wet tunnels, hostile silence, radio bleed, and monster lure areas. The runtime reads `soundZoneType`, `soundId`, `targetBus`, `gain`, `width`, `depth`, `height`, and `enabled` from custom properties. `soundZoneType` defaults to `ambience`.
- `TRIGGER_<scene-id>_OBJECTIVE_TRIGGER_<index>_<name>`: objective ritual volume for proximity or area-based objective steps. It uses the same objective metadata as `MARKER_*_OBJECTIVE_*`, plus optional trigger dimensions.
- `SURFACE_<type>_<name>` or `LEVELMAT_<name>` material with custom properties: surface metadata for future footsteps, splashes, damage feedback, and friction. The runtime reads `surfaceType` or `level_surface`, plus optional `footstepSoundId`, `splashSoundId`, `damagePerSecond`, `friction`, and `wet` from material custom properties. `SURFACE_METAL_grate` defaults `surfaceType` to `metal` and `textureId` to `metal_grate`.

The GLB exporter writes Blender custom properties as glTF `extras`. The runtime loader should prefer `extras.level_role` when available and fall back to the name prefixes above.

Enemy and zombie markers should be placed in open playable space, outside walls, crates, decorative collision, and other blockers. The browser runtime runs `src/enemySpawnValidation.js` as a safety net: it snaps GLB-authored enemy markers to the highest walkable surface at their X/Z and offsets blocked capsules into nearby open space. Do not rely on this to hide sloppy authoring; clean marker placement keeps browser and downstream Unity behavior easier to reason about.

The dungeon contains a named example: `ART_dungeon_example_lava_damage_floor` using `LEVELMAT_lava`, plus `TRIGGER_dungeon_DAMAGE_ZONE_1_example_lava_damage_trigger` in the trigger collection. That is the pattern for Doom-style damaging floor materials: the visible floor has `surfaceType: lava`, and the trigger volume supplies the actual gameplay damage.

Horde, encounter, sound-zone, objective, and emitter authoring follows the same explicit metadata pattern. Use `extras.level_role: HORDE_TRIGGER`, `extras.level_role: ENCOUNTER_TRIGGER`, `extras.level_role: SOUND_ZONE`, `extras.level_role: OBJECTIVE`, `extras.level_role: OBJECTIVE_TRIGGER`, or `extras.level_role: EMITTER` when possible, with the matching prefix as a compatibility fallback. Keep trigger volumes broad and legible, and keep emitters as clear point anchors: they should describe an encounter beat, spatial audio area, ritual interaction, or local effect such as a lobby alarm, boss-feeding arena, gate lock, monster-closet release, jump scare, radio burst, warp-door trap, hostile silence pocket, TV activation, alien beacon tune point, dripping pipe, spark shower, or lure noise. The browser parser stores authored horde triggers as `world.hordeTriggers`, generic authored set pieces as `world.encounterTriggers`, spatial audio zones as `world.soundZones`, ritual goals as `world.objectives`, and point emitters as `world.emitters` so gameplay systems can opt into them without changing fallback scenes.

## Runtime Status

The game now loads the exported level GLBs at runtime through `src/levelGlb.js`.

Implemented:

1. A general GLB parser for static level packages. It supports multiple meshes, nodes, materials, embedded textures, transforms, and extras.
2. A scene-id to GLB URL map:
   - `dungeon` -> `./assets/models/levels/dungeon.glb`
   - `alien-landscape` -> `./assets/models/levels/alien-landscape.glb`
   - all nine scenes are registered with cache-busting.
3. Visible render buffers are built from `ART_*` nodes.
4. Collision arrays are built from `COLLISION_*` nodes.
5. Walkable-surface queries are built from `WALKABLE_*` nodes.
6. Gameplay state comes from markers: player spawn, zombie spawns, typed enemy spawns, pickups, objectives, emitters, lights, torch lights, kill planes, damage zones, horde triggers, encounter triggers, and sound zones.
7. Runtime enemy spawn validation normalizes GLB-authored zombie and typed enemy markers before `src/zombies.js` creates live enemies.
8. `src/world.js` remains as fallback metadata for scene labels, audio, generated support textures, and fallback scene data if a GLB fails to load.

Next expansions:

- Bind parsed surface metadata to footsteps, splashes, damage feedback, and friction behavior when those gameplay systems are ready.
- Add a Blender export helper that bumps the level GLB cache-busting version after asset changes.

## Runtime Contract

`src/levelGlb.js` is intentionally small and explicit. It currently supports:

- GLB binary container parsing.
- Multiple mesh primitives.
- Embedded materials/textures.
- Node transforms.
- `extras.level_role` metadata.
- Prefix fallback for role detection.
- Marker extras parsed from strings when Blender stores structured values as JSON text.

The runtime expects GLB coordinates to be converted into the browser game's positive-Y-up world convention. Keep tests in `test/levelGlb.test.js` passing when changing export or parser behavior.

If a GLB fails to load, `src/world.js` remains the fallback source for scene layout and metadata. Do not delete fallback data until runtime behavior and downstream consumers are ready.

## Authoring Rules

- Edit art freely in `ART_*` objects.
- Keep tiling level surfaces box-projected to match the original procedural renderer: floors repeat every 2.5 world units, ceilings every 2 world units, walls/platforms/crates/props every 1 world unit, and mountain faces every 4 world units. Large floors, walls, stairs, and platforms should have UV coordinates greater than 1 when they span multiple world units; billboard sprites such as stars, suns, rain cards, and signs stay 0-1 with alpha masks. Generated texture materials must explicitly feed the UV output from a Texture Coordinate node into the Image Texture node so Blender's viewport and exported GLBs use the same UV mapping on thin wall end caps.
- Keep `COLLISION_*` and `WALKABLE_*` simple. Collision should serve gameplay, not match every visual bevel or prop.
- Use `TRIGGER_*_DAMAGE_ZONE_*` objects for harmful surfaces instead of relying on render material names alone. The trigger volume is cheap and explicit, while the art material remains editable.
- Use `TRIGGER_*_HORDE_TRIGGER_*` objects for authored horde beats. Put encounter tuning in custom properties, not in object names beyond the stable role prefix.
- Use scene `enemyEncounter.ecology` data for monster relationship tuning. It can override an enemy type's `hostileFactions` and `secondaryTargetRange` while keeping the shared enemy catalog intact.
- Use `TRIGGER_*_ENCOUNTER_TRIGGER_*` objects for generic authored set pieces. Put behavior identifiers such as `encounterType`, `targetId`, and `soundId` in custom properties so browser and downstream importers share one contract.
- Use `TRIGGER_*_SOUND_ZONE_*` objects for spatial audio beats. Put sound IDs, gain, target bus, and zone type in custom properties.
- Use `MARKER_*_OBJECTIVE_*` or `TRIGGER_*_OBJECTIVE_TRIGGER_*` objects for per-scene ritual goals. Put `objectiveId`, `objectiveType`, `label`, `targetId`, `countRequired`, and `requiredInRogue` in custom properties rather than hard-coding objective behavior into scene ids.
- Use `MARKER_*_EMITTER_*` objects for point-based audio or visual emitters. Put `emitterId`, `emitterType`, `targetId`, `textureId`, `soundId`, `targetBus`, `gain`, `radius`, and `rate` in custom properties rather than encoding behavior in object names.
- Use material custom properties for surface metadata. Prefer `surfaceType` for the canonical type, or `level_surface` when matching Blender-side naming; put sound and physics hints in `footstepSoundId`, `splashSoundId`, `damagePerSecond`, `friction`, and `wet`.
- To add new gameplay concepts, use explicit prefixes and metadata rather than relying on material names alone:
  - `TRIGGER_*`
  - `HAZARD_LAVA_*`
  - `HAZARD_TOXIC_*`
  - `EMITTER_*`
  - `SOUND_ZONE_*`
  - `SURFACE_METAL_*`, `SURFACE_WATER_*`, `SURFACE_STONE_*`
- Runtime behavior should be driven by `extras.level_role` plus small, documented metadata fields.

## Performance Position

The runtime should load one GLB per active scene, create static WebGL buffers once, and reuse the current low-resolution post pipeline. Collision should use simplified authored objects, not visual triangle soup. That gives the artist a one-to-one Blender workflow without making physics expensive or fragile.

## Agent Checklist

Before changing the art pipeline:

1. Read this file, `README.md`, `AGENTS.md`, and `CLAUDE.md`.
2. Inspect `src/levelGlb.js`, `scripts/build-level-glbs.py`, and `scripts/reexport-level-glbs.py`.
3. Run `npm test` before and after changes.
4. If changing static assets, update cache-busting query strings.
5. Keep Blender roles explicit. Prefer metadata and documented prefixes over inference.
