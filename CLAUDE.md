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

If behavior looks stale, hard-refresh the browser.

## Level Pipeline Summary

Blender is the authoring tool. The browser runtime loads one exported GLB per scene.

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

- Free Roam and Cut-Up title modes.
- Cut-Up countdown and white flash before scene jumps.
- Nine selectable scenes.
- Scene 2 (`alien-landscape`) has 20 zombies for stress testing.
- Health, zombie bite damage, death sequence, health pickups.
- Authored lava floor damage zones.
- CRT/video presets and debug HUD.
- Generated ambience and SFX assets.

## Safe Change Rules

- Read the code before claiming how a system works.
- Keep edits scoped.
- Update docs when adding authoring roles, asset conventions, or pipeline steps.
- Run tests before reporting completion.
- Do not commit/push mixed work without explicit scope confirmation.
