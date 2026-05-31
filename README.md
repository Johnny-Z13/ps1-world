# PS1 World

Browser-based PS1-style first-person world prototype: low-res WebGL rendering, CRT/post effects, authored levels, roaming zombies, health pickups, spatial audio, and a Cut-Up scene-jump mode.

This repository is the lead project. A downstream Unity version may be scaffolded from it, but agents should not edit that downstream folder from this repo unless the user explicitly asks.

## Quick Start

```bash
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

Run tests:

```bash
npm test
```

The app uses vanilla ES modules and WebGL. There is no frontend build step.

## Controls

- WASD: move
- Mouse: look with pointer lock
- Space: jump
- Shift: sprint
- Gamepad: left stick move, right stick look, south button jump, shoulder/trigger sprint, Start/Menu options
- 1-9 / numpad 1-9: switch scenes
- Esc: video/options menu

On touch devices, press the left side to spawn a floating movement joystick, drag the right side to look, and use the jump button for platforming.

## Current Gameplay

- Title screen with Free Roam and Cut-Up Mode.
- Cut-Up Mode cycles through all nine worlds, warns with `jump in 3/2/1`, flashes white, then jumps to the next world.
- CRT/video presets, resolution modes, reticule toggle, debug HUD, player torch, and zombie toggle.
- Player health, low-health screen/audio pressure, zombie bite damage, death sequence, health flasks, and pickup flash.
- Generated MP3 ambience/SFX assets, spatial zombie grunts, torch crackle, footsteps, heartbeat, menu confirm, damage, death, and pickup sounds.
- Scene 2 (`alien-landscape`) is currently a 20-zombie stress scene.

## Project Map

- `index.html`: app shell, title controls, HUDs, options dialog, cache-busted JS/CSS references.
- `styles.css`: fixed UI, title hitboxes, HUDs, touch controls, options dialog.
- `src/app.js`: main runtime orchestration, WebGL render path, input, audio, gameplay, title/Cut-Up flow.
- `src/world.js`: scene registry and fallback/generated scene metadata.
- `src/levelGlb.js`: runtime GLB parser for Blender-authored level packages.
- `src/ps1Display.js`: video presets, resolution modes, effect defaults.
- `src/playerPhysics.js`, `src/playerHealth.js`, `src/zombies.js`, `src/zombieModel.js`: focused gameplay/model helpers.
- `assets/audio/`: generated ambience and SFX.
- `assets/models/levels/`: Blender source and exported per-scene GLBs.
- `docs/blender-level-pipeline.md`: authoritative art pipeline notes.
- `docs/audio-system.md`: Web Audio buses, generated asset workflow, and cache-busting rules.
- `docs/test-harness.md`: smoke harness structure and future testing plan.
- `test/`: Node test suite for runtime math, gameplay, GLB parsing, UI contract checks, and scene data.

## Blender Level Pipeline

The game is moving toward Blender-authored levels.

Primary files:

- `assets/models/levels/ps1-world-levels.blend`: source authoring file.
- `assets/models/levels/<scene-id>.glb`: runtime level exports.
- `assets/models/levels/level-seed-data.json`: seed data generated from `src/world.js`.

Pipeline scripts:

```bash
node scripts/export-level-seed-data.mjs assets/models/levels/level-seed-data.json
blender --factory-startup -b --python scripts/build-level-glbs.py -- assets/models/levels
blender -b assets/models/levels/ps1-world-levels.blend --python scripts/reexport-level-glbs.py -- assets/models/levels
```

The runtime loads GLBs through `src/levelGlb.js`. GLB nodes are classified by `extras.level_role` first, then by documented name prefixes such as `ART_`, `COLLISION_`, `WALKABLE_`, and `MARKER_`.

Read [docs/blender-level-pipeline.md](docs/blender-level-pipeline.md) before changing level authoring, GLB export, or runtime GLB parsing.

## Agent Notes

- Read `AGENTS.md` and `CLAUDE.md` before making code or asset changes.
- Read `docs/test-harness.md` before adding broad smoke or automation coverage.
- Read `docs/audio-system.md` before adding, replacing, or routing audio assets.
- Do not guess about runtime behavior. Trace the code and run tests.
- The working tree is often shared by multiple agent chats. Inspect `git status --short --branch` before staging or editing.
- Do not commit or push mixed work unless the user explicitly confirms the scope.
- After JS/CSS/audio/model changes, bump the relevant cache-busting query strings in `index.html` or `src/levelGlb.js`.
