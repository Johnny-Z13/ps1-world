# Test Harness Plan

The current test suite uses Node's built-in test runner. The first harness pass keeps that lightweight setup and adds reusable smoke helpers instead of introducing a browser automation dependency.

## Goals

- Give agents one obvious place to add high-level smoke coverage.
- Exercise real game modules, not copied fixture logic.
- Keep tests fast enough to run on every agent turn.
- Leave room for future browser/WebGL E2E checks when the runtime is split into smaller modules.

## Current Structure

- `test/harness/gameSmokeHarness.js`: reusable smoke harness helpers.
- `test/gameSmokeHarness.test.js`: first smoke suite.
- `src/cutUpMode.js`: pure Cut-Up timing/state helpers used by both the app and the harness.
- `src/rogueMode.js`: pure Rogue progression helpers for scene order, warp advancement, and completion state.

The harness currently covers:

- Free Roam startup state for a playable scene.
- Every video preset resolving to a valid render resolution.
- Cut-Up countdown behavior and jump from world 1 to world 2.
- Rogue advancement through all nine scene ids and completion after the final warp.

## How To Extend

Prefer adding reusable methods to `test/harness/gameSmokeHarness.js`, then write short intent-level tests in `test/gameSmokeHarness.test.js`.

Good next harness additions:

- Scene sweep: create every scene and assert player spawn, enemies, health pickups, audio metadata, and colliders.
- Damage loop: simulate repeated zombie hits and assert death threshold behavior.
- Pickup loop: simulate health restore and pickup removal.
- Audio asset manifest: assert every referenced MP3 exists and is non-empty.
- Asset cache checks: assert changed static asset URLs use bumped `?v=N` values.
- Rogue UI flow: click Rogue, reach a warp gate in each scene, assert the win screen and return button.

Browser/WebGL checks should come later as a separate layer. When added, keep them in a distinct `test/e2e/` or `test/browser/` folder so fast Node smoke tests remain cheap.

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
