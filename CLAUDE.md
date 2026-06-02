# Claude Guide

This file gives Claude and other coding agents the project context needed to work safely in PS1 World.

## Project Role

This is the lead browser/WebGL implementation. A downstream Unity version may be generated or scaffolded from this project, but do not edit downstream Unity folders from this repo unless the user explicitly asks.

## Start Here

1. Read `README.md`.
2. Read `AGENTS.md`.
3. For level or art-pipeline work, read `docs/blender-level-pipeline.md`.
4. For broad smoke/automation work, read `docs/test-harness.md`.
5. For audio generation, routing, or replacement work, read `docs/audio-system.md`.
6. Check the worktree:

```bash
git status --short --branch
```

Multiple chats may be working in the same tree. Do not stage, revert, or commit files you did not intentionally change.

## Run and Test

```bash
npm run dev
npm test
npm run cache:check
npm run smoke:browser
```

Local app URL:

```text
http://127.0.0.1:4173
```

## Cache Busting

This app serves static files directly. After changing assets or runtime files, bump the relevant version string:

- `index.html`: `styles.css?v=N`, `src/app.js?v=N`
- `src/app.js`: audio asset URLs when replacing SFX/ambience
- `src/levelGlb.js`: GLB URLs when replacing level exports

Use `npm run cache:check` to verify known static references include `?v=N` and to list changed JS/CSS/audio/GLB files that need cache-bust review.

If behavior looks stale, hard-refresh the browser.

## Level Pipeline Summary

Blender is the authoring tool. The browser runtime loads one exported GLB per scene. Treat `src/world.js` as fallback metadata and procedural resilience. New layout/art changes should start in Blender or documented seed-generation paths, then flow through `src/levelGlb.js` and `src/sceneRuntime.js`.

Source and exports:

- `assets/models/levels/ps1-world-levels.blend`
- `assets/models/levels/<scene-id>.glb`
- `assets/models/levels/level-seed-data.json`

Scripts:

```bash
node scripts/export-level-seed-data.mjs assets/models/levels/level-seed-data.json
blender --factory-startup -b --python scripts/build-level-glbs.py -- assets/models/levels
blender -b assets/models/levels/ps1-world-levels.blend --python scripts/reexport-level-glbs.py -- assets/models/levels
```

Runtime parser:

- `src/levelGlb.js`
- `src/sceneRuntime.js` converts parsed level assets and fallback scene data into runtime worlds.
- `src/titleRenderer.js` owns the importable PS1 bitmap title canvas renderer.
- `src/playerFeedback.js` owns pure low-health, screen-flash, and death-camera/tint feedback calculations.
- `src/inputRuntime.js` owns pure gamepad, touch joystick, and soft mouse fallback input helpers.
- `src/sceneEffects.js` owns pure lightning strength and torch flicker/render-state helpers.
- `src/renderMath.js` owns projection, matrix multiplication, and clamp helpers used by the WebGL path.
- `src/webglResources.js` owns WebGL buffer, attribute, mesh-buffer deletion, and low-resolution render-target helpers.
- `src/webglPrograms.js` owns WebGL shader compilation, program linking, and attribute/uniform location collection helpers.
- `src/renderMeshes.js` owns primitive render mesh helpers for scene mesh attribute binding, sky dome buffers, and fullscreen post quads.
- `src/renderSceneMeshes.js` owns static level/fallback scene mesh construction for GLB art, boxes, cards, health flasks, warp gates, weather, and shared face primitives.
- `src/renderEnemyMeshes.js` owns dynamic zombie/special-enemy and blood burst mesh buffer construction.
- `src/renderTextureAtlas.js` owns generated/fallback, GLB material, embedded image, and character texture atlas construction.
- `src/renderSkyDome.js` owns sky dome mode/palette mapping and WebGL draw-state orchestration.
- `src/renderPostPass.js` owns post-processing texture binding, screen-effect uniforms, and fullscreen quad draw orchestration.
- `src/renderScenePass.js` owns main scene atlas binding, scene-light uniforms, static torch uniforms, and static/dynamic mesh draw ordering.
- `src/debugHud.js` owns debug HUD snapshot formatting and DOM text application helpers.
- `enemyEncounter.ecology` carries scene-specific hostile-faction and secondary-target-range tuning for monster relationships.
- `world.soundZones` carries Blender-authored spatial audio zone metadata for future audio behavior.
- `world.emitters` carries Blender-authored point-effect metadata for future visual/audio emitters.
- GLB material surface metadata carries future footstep, splash, damage-feedback, and friction hints through `surfaceType`, `footstepSoundId`, `splashSoundId`, `damagePerSecond`, `friction`, and `wet`.
- `world.diegeticMap` carries unreliable in-world navigation artifact metadata; do not replace it with a clean minimap.

Tests:

- `test/levelGlb.test.js`
- `test/blenderPipeline.test.js`

## Authoring Roles

Use explicit Blender object roles:

- `ART_*`: visible meshes.
- `COLLISION_*`: simplified colliders.
- `WALKABLE_*`: simple ground/platform surfaces.
- `MARKER_*`: gameplay markers.
- `TRIGGER_*_DAMAGE_ZONE_*`: gameplay damage volumes.

The runtime prefers `extras.level_role` and falls back to prefixes.

Each `LEVEL_<scene-id>` collection should keep child collections for render art, collision blockers, walkable surfaces, markers, and triggers. The dungeon contains the reference lava setup: visible `LEVELMAT_lava` art plus a `DAMAGE_ZONE` trigger with `surfaceType` and `damagePerSecond` custom properties.

## Current Gameplay Systems

- Free Roam, Cut-Up, and Rogue title modes.
- Cut-Up countdown and white flash before scene jumps.
- Rogue run progression through all nine scenes using per-scene warp gates, followed by an in-game pixel `GAME OVER` completion screen and return-to-title button.
- Nine selectable scenes.
- Scene 2 (`alien-landscape`) has 20 zombies for stress testing.
- Health, zombie bite damage, death sequence, health pickups.
- Authored lava floor damage zones.
- CRT/video presets and debug HUD.
- Generated ambience, per-enemy idle/attack SFX, player movement spots, UI SFX, Rogue win, rain/lightning, and scene-specific weather assets.
- Runtime enemy spawn validation snaps GLB-authored zombie and enemy markers to walkable surfaces and keeps capsules out of walls/cubes.

## Safe Change Rules

- Read the code before claiming how a system works.
- Keep edits scoped.
- Update docs when adding authoring roles, asset conventions, or pipeline steps.
- Update `docs/test-harness.md` when adding broad smoke coverage.
- Run tests before reporting completion.
- Do not commit/push mixed work without explicit scope confirmation.
