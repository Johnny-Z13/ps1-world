# Test Harness Plan

The current test suite uses Node's built-in test runner. The first harness pass keeps that lightweight setup and adds reusable smoke helpers instead of introducing a browser automation dependency.

## Goals

- Give agents one obvious place to add high-level smoke coverage.
- Exercise real game modules, not copied fixture logic.
- Keep tests fast enough to run on every agent turn.
- Keep browser/WebGL checks as a distinct optional layer so fast Node smoke tests remain cheap.

## Current Structure

- `test/harness/gameSmokeHarness.js`: reusable smoke harness helpers.
- `test/gameSmokeHarness.test.js`: first smoke suite.
- `scripts/browser-smoke.mjs`: optional browser smoke checklist/runner.
- `src/cutUpMode.js`: pure Cut-Up timing/state helpers used by both the app and the harness.
- `src/rogueMode.js`: pure Rogue progression helpers for scene order, warp advancement, and completion state.
- `test/webglResources.test.js`: fake-GL coverage for buffer, attribute, mesh-buffer deletion, and low-resolution render-target helpers.
- `test/webglPrograms.test.js`: fake-GL coverage for shader compilation, program linking, and location collection.
- `test/renderMeshes.test.js`: fake-GL coverage for scene mesh attribute binding, sky dome buffers, and fullscreen post quads.
- `test/renderSceneMeshes.test.js`: fake-GL coverage for static GLB/fallback scene mesh construction and shared face primitives.
- `test/renderEnemyMeshes.test.js`: fake-GL coverage for dynamic zombie/special-enemy and blood burst mesh updates.
- `test/renderTextureAtlas.test.js`: fake canvas/WebGL coverage for generated, GLB material, embedded image, and character texture atlas construction.
- `test/renderSkyDome.test.js`: fake-GL coverage for sky dome mode/palette mapping and draw-state ordering.
- `test/renderPostPass.test.js`: fake-GL coverage for post-processing texture binding, effect uniforms, and fullscreen quad draw ordering.
- `test/renderScenePass.test.js`: fake-GL coverage for scene atlas binding, scene-light uniforms, static torch caps, and static/dynamic mesh draw ordering.
- `test/debugHud.test.js`: pure/DOM-shaped coverage for debug HUD FPS smoothing, visibility, and text-field updates.
- `test/levelGlb.test.js`: GLB parser coverage for authored markers, triggers, sound zones, objectives, emitters, surface material metadata, materials, collision, walkable surfaces, and exported level contracts.

The harness currently covers:

- Free Roam startup state for a playable scene.
- Every video preset resolving to a valid render resolution.
- Cut-Up countdown behavior and jump from world 1 to world 2.
- Rogue start state, every scene-to-scene warp advance, and completion only after the ninth warp.
- GLB-authored enemy marker normalization into open walkable space.

## How To Extend

Prefer adding reusable methods to `test/harness/gameSmokeHarness.js`, then write short intent-level tests in `test/gameSmokeHarness.test.js`.

Good next harness additions:

- Scene sweep: create every scene and assert player spawn, enemies, health pickups, audio metadata, and colliders.
- Damage loop: simulate repeated zombie hits and assert death threshold behavior.
- Pickup loop: simulate health restore and pickup removal.
- Audio asset manifest: assert every referenced MP3 exists and is non-empty.
- Asset cache checks: assert changed static asset URLs use bumped `?v=N` values.
- Browser Rogue UI flow: click Rogue, reach a warp gate in each scene, assert the in-game pixel `GAME OVER` completion screen and return button.

Browser/WebGL checks live in a separate optional layer. Run `npm run smoke:browser` to print the checklist, or to execute the automated boot check when Playwright is available. The current automated checklist covers app boot, title controls, GLB scene loading, Rogue start, and fatal console errors.

## Test Suite Notes

`test/uiMarkup.test.js` still contains source-text assertions. Treat those as a temporary guardrail around hard-to-import browser UI code. When app systems are extracted into modules, prefer behavior tests against exported functions and reduce source-regex tests.

Run:

```bash
npm test
```

Focused harness run:

```bash
node --test test/gameSmokeHarness.test.js
```

Optional browser smoke:

```bash
npm run smoke:browser
```
