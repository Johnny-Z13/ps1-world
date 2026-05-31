# Cinematic Audio Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a coherent layered audio pass for title, Free Roam, Cut Up Mode, options, and Cut Up scene transitions.

**Architecture:** Extend the existing `src/app.js` Web Audio system with dedicated music/UI/transition buses, loop-source helpers, per-shot one-shot gain nodes, ambience crossfades, and mode-specific event hooks. Generate a small MP3 asset set under `assets/audio/music` and `assets/audio/sfx`.

**Tech Stack:** Browser Web Audio API, vanilla JavaScript modules, Node test runner, ElevenLabs sound generation endpoint.

---

### Task 1: Tests

**Files:**
- Modify: `test/uiMarkup.test.js`

- [ ] Add tests that assert the new music/SFX asset constants, audio buses, crossfade helper, mode hooks, Cut Up tick state, and options sounds are present.
- [ ] Run `npm test` and confirm the new tests fail because the production code has not been implemented yet.

### Task 2: Assets

**Files:**
- Create: `assets/audio/music/title-menu-psx-8bit-loop.mp3`
- Create: `assets/audio/music/free-roam-dread-8bit-loop.mp3`
- Create: `assets/audio/music/cut-up-clockwork-8bit-loop.mp3`
- Create: `assets/audio/sfx/free-roam-start-warp-8bit.mp3`
- Create: `assets/audio/sfx/cut-up-start-burst-8bit.mp3`
- Create: `assets/audio/sfx/cut-up-scene-slice-8bit.mp3`
- Create: `assets/audio/sfx/cut-up-countdown-tick-8bit.mp3`
- Create: `assets/audio/sfx/options-open-static-8bit.mp3`
- Create: `assets/audio/sfx/options-close-click-8bit.mp3`

- [ ] Generate MP3s through ElevenLabs using `ELEVENLABS_API_KEY` from `.env`.
- [ ] Check each file exists and has non-zero size.

### Task 3: Runtime Wiring

**Files:**
- Modify: `src/app.js`

- [ ] Add constants for generated asset URLs and mix levels.
- [ ] Add music/UI/transition gains to `audioState`.
- [ ] Add `ensureMusicLoop`, `syncCinematicMusicAudio`, `playTransitionOneShot`, and `playUiOneShot`.
- [ ] Replace hard ambience switching with a crossfade slot helper.
- [ ] Preload new critical title/mode/transition assets after audio unlock.
- [ ] Hook Free Roam start, Cut Up start, Cut Up scene jumps, countdown ticks, and options open/close.

### Task 4: Cache and Verification

**Files:**
- Modify: `index.html`

- [ ] Bump the `src/app.js` cache query string.
- [ ] Run `npm test`.
- [ ] Smoke test `http://127.0.0.1:4173/` in the in-app browser for load errors and mode entry.
