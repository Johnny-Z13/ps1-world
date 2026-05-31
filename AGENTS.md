# Agent Guide

This repository is the lead browser/WebGL project for PS1 World. A downstream Unity version may exist elsewhere, but agents working in this repo should not edit external Unity folders unless the user explicitly asks.

## First Checks

Run these before substantial edits:

```bash
git status --short --branch
npm test
```

The working tree may be shared by multiple agent chats. Do not stage, revert, commit, or push unrelated work. If the tree is mixed, stage explicit files only after confirming scope.

## Local Server

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

After CSS, JS, audio, image, or GLB changes, bump cache-busting query strings:

- `index.html` for `styles.css?v=N` and `src/app.js?v=N`.
- `src/levelGlb.js` for `assets/models/levels/<scene-id>.glb?v=N`.
- SFX/ambience URLs in `src/app.js` when replacing audio.

## Architecture Map

- `src/app.js`: main game loop, WebGL orchestration, UI, input, audio, gameplay flow.
- `src/world.js`: scene definitions and fallback metadata.
- `src/levelGlb.js`: runtime parser/adapter for Blender-authored GLB level packages.
- `src/ps1Display.js`: video presets, resolution modes, effect defaults.
- `src/playerPhysics.js`, `src/playerHealth.js`, `src/zombies.js`: gameplay helpers with direct tests.
- `assets/models/levels/`: Blender source file, seed data, exported GLBs.
- `assets/audio/`: generated audio assets used by the runtime.
- `docs/blender-level-pipeline.md`: art pipeline source of truth.
- `docs/audio-system.md`: Web Audio buses and generated audio workflow.
- `docs/test-harness.md`: smoke harness plan and extension guide.

## Blender Level Pipeline

Read `docs/blender-level-pipeline.md` before changing level authoring or GLB runtime code.

Important files:

- `assets/models/levels/ps1-world-levels.blend`
- `assets/models/levels/level-seed-data.json`
- `assets/models/levels/<scene-id>.glb`
- `scripts/export-level-seed-data.mjs`
- `scripts/build-level-glbs.py`
- `scripts/reexport-level-glbs.py`
- `src/levelGlb.js`

Role convention:

- `ART_*`: visible geometry.
- `COLLISION_*`: simplified blocker geometry.
- `WALKABLE_*`: ground/stair/platform surfaces.
- `MARKER_*`: gameplay markers such as player spawn, zombie spawn, health pickup, lights, torch lights, and kill plane.

Prefer `extras.level_role` when available. Prefixes are fallback compatibility.

## Testing

Run the full suite after code changes:

```bash
npm test
```

Useful focused checks:

```bash
node --test test/gameSmokeHarness.test.js
node --test test/levelGlb.test.js
node --test test/world.test.js
node --test test/uiMarkup.test.js
```

## Style Rules

- Keep changes scoped to the user request.
- Do not guess about paths, APIs, scene flow, or asset wiring. Read the source.
- Prefer existing patterns over new abstractions.
- Keep generated/static asset references cache-busted.
- Leave unrelated dirty files alone.
- Document new authoring conventions in `docs/blender-level-pipeline.md`.
