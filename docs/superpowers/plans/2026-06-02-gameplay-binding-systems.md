# Gameplay Binding Systems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind authored Blender runtime contracts to Rogue objectives, encounter reactions, sound zones, emitters, and surface feedback.

**Architecture:** Add small pure runtime modules and keep `src/app.js` as the side-effect orchestrator. Each module returns decisions that app wiring can apply to DOM notices, audio, horde state, and Rogue gate progression.

**Tech Stack:** Browser ES modules, WebGL runtime, Web Audio helper functions, Node `node:test`, existing GLB scene contracts.

---

## File Structure

- Create `src/objectiveRuntime.js`: objective state, progress, gate eligibility, and corrupted HUD text.
- Create `test/objectiveRuntime.test.js`: pure objective behavior coverage.
- Create `src/encounterRuntime.js`: trigger containment, one-shot activation, horde wake/tuning decisions.
- Create `test/encounterRuntime.test.js`: pure encounter trigger coverage.
- Create `src/soundZoneRuntime.js`: sound-zone and emitter decisions without Web Audio side effects.
- Create `test/soundZoneRuntime.test.js`: zone/emitter selection coverage.
- Create `src/surfaceRuntime.js`: material/surface lookup and footstep profile decisions.
- Create `test/surfaceRuntime.test.js`: surface fallback and metadata tests.
- Modify `src/app.js`: initialize runtime state on scene load, run decisions per tick, gate Rogue warps, and play existing audio/notice effects.
- Modify `index.html`: bump `src/app.js?v=148` to the next cache version.
- Modify `docs/blender-level-pipeline.md` and `docs/recommendations.md`: document the new behavior-binding status.
- Modify `.gitignore`: ignore `.superpowers/` mockup artifacts.

---

### Task 1: Objective Runtime

**Files:**
- Create: `src/objectiveRuntime.js`
- Create: `test/objectiveRuntime.test.js`

- [ ] **Step 1: Write failing objective tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createObjectiveState,
  getObjectiveHudText,
  isRogueGateUnlocked,
  updateObjectiveState,
} from '../src/objectiveRuntime.js';

test('locks Rogue gate until required objectives are complete', () => {
  const world = {
    objectives: [
      { objectiveId: 'sigil-a', label: 'Feed the door', requiredInRogue: true, x: 2, y: 0, z: 0, radius: 1 },
      { objectiveId: 'optional-noise', label: 'Optional noise', requiredInRogue: false, x: 8, y: 0, z: 0, radius: 1 },
    ],
  };
  const state = createObjectiveState(world);

  assert.equal(isRogueGateUnlocked(world, state), false);
  const updated = updateObjectiveState(world, state, { x: 2, y: 0, z: 0 }, 1000);
  assert.equal(isRogueGateUnlocked(world, updated.state), true);
  assert.deepEqual(updated.completed.map((item) => item.objectiveId), ['sigil-a']);
});

test('tracks count-required objectives and emits corrupted HUD text', () => {
  const world = {
    objectives: [
      { objectiveId: 'teeth', label: 'Collect teeth', requiredInRogue: true, countRequired: 2 },
    ],
  };
  const state = createObjectiveState(world);

  const first = updateObjectiveState(world, state, { x: 0, y: 0, z: 0 }, 1000, { objectiveId: 'teeth' });
  assert.equal(isRogueGateUnlocked(world, first.state), false);
  assert.match(getObjectiveHudText(world, first.state, 'rogue'), /COLLECT TEETH 1\/2/);

  const second = updateObjectiveState(world, first.state, { x: 0, y: 0, z: 0 }, 1200, { objectiveId: 'teeth' });
  assert.equal(isRogueGateUnlocked(world, second.state), true);
  assert.match(getObjectiveHudText(world, second.state, 'rogue'), /RITUAL COMPLETE/);
});
```

- [ ] **Step 2: Run the failing tests**

Run: `node --test test/objectiveRuntime.test.js`
Expected: fails because `src/objectiveRuntime.js` does not exist.

- [ ] **Step 3: Implement objective runtime**

Implement `createObjectiveState(world)`, `updateObjectiveState(world, state, player, now, event)`, `isRogueGateUnlocked(world, state)`, and `getObjectiveHudText(world, state, mode)`. Treat missing/disabled objectives as complete. Use `objectiveId` as the key, `radius` default `1.2`, `countRequired` default `1`, and uppercase labels for HUD text.

- [ ] **Step 4: Verify objective tests pass**

Run: `node --test test/objectiveRuntime.test.js`
Expected: both tests pass.

---

### Task 2: Encounter Runtime

**Files:**
- Create: `src/encounterRuntime.js`
- Create: `test/encounterRuntime.test.js`

- [ ] **Step 1: Write failing encounter tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEncounterState,
  updateEncounterState,
} from '../src/encounterRuntime.js';

test('fires enabled one-shot encounter triggers once', () => {
  const world = {
    encounterTriggers: [
      { id: 'closet-a', encounterType: 'jump_scare', soundId: 'stinger', x: 0, y: 0, z: 0, width: 4, depth: 4, height: 3, oneShot: true },
    ],
  };
  const state = createEncounterState(world);
  const first = updateEncounterState(world, state, { x: 0.5, y: 0, z: 0.5 }, 1000);
  const second = updateEncounterState(world, first.state, { x: 0.5, y: 0, z: 0.5 }, 1100);

  assert.deepEqual(first.actions.map((action) => action.type), ['jump_scare']);
  assert.deepEqual(second.actions, []);
});

test('returns horde wake decisions from authored trigger metadata', () => {
  const world = {
    encounterTriggers: [
      { id: 'wake-a', encounterType: 'awaken_horde', x: 0, y: 0, z: 0, width: 4, depth: 4, height: 3, maxAlive: 12, pulseIntervalMs: 1500 },
    ],
  };
  const result = updateEncounterState(world, createEncounterState(world), { x: 0, y: 0, z: 0 }, 1000);

  assert.deepEqual(result.actions[0], {
    type: 'awaken_horde',
    triggerId: 'wake-a',
    maxAlive: 12,
    pulseIntervalMs: 1500,
    soundId: undefined,
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `node --test test/encounterRuntime.test.js`
Expected: fails because `src/encounterRuntime.js` does not exist.

- [ ] **Step 3: Implement encounter runtime**

Implement `createEncounterState(world)` and `updateEncounterState(world, state, player, now)`. Support box containment using trigger center plus `width`, `depth`, and `height`. Ignore disabled triggers. Mark one-shot triggers as fired. Return action types from `encounterType`, defaulting to `set_piece`.

- [ ] **Step 4: Verify encounter tests pass**

Run: `node --test test/encounterRuntime.test.js`
Expected: tests pass.

---

### Task 3: Sound Zone And Emitter Runtime

**Files:**
- Create: `src/soundZoneRuntime.js`
- Create: `test/soundZoneRuntime.test.js`

- [ ] **Step 1: Write failing sound-zone tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getActiveEmitterDecisions,
  getActiveSoundZoneDecision,
} from '../src/soundZoneRuntime.js';

test('selects the strongest active sound zone and ignores disabled zones', () => {
  const world = {
    soundZones: [
      { id: 'silent', soundZoneType: 'silence', gain: 0.1, x: 0, y: 0, z: 0, width: 5, depth: 5, height: 3 },
      { id: 'disabled', enabled: false, soundZoneType: 'radio_bleed', x: 0, y: 0, z: 0, width: 20, depth: 20, height: 3 },
    ],
  };

  assert.deepEqual(getActiveSoundZoneDecision(world, { x: 0, y: 0, z: 0 }), {
    id: 'silent',
    type: 'silence',
    soundId: undefined,
    targetBus: 'ambience',
    gain: 0.1,
  });
});

test('returns nearby emitter decisions ordered by distance', () => {
  const world = {
    emitters: [
      { emitterId: 'spark', emitterType: 'spark', soundId: 'stinger', x: 2, y: 0, z: 0, radius: 6, gain: 0.4 },
      { emitterId: 'far', emitterType: 'hum', x: 20, y: 0, z: 0, radius: 3 },
    ],
  };

  const decisions = getActiveEmitterDecisions(world, { x: 0, y: 0, z: 0 });
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].id, 'spark');
  assert.equal(decisions[0].distance, 2);
});
```

- [ ] **Step 2: Run the failing tests**

Run: `node --test test/soundZoneRuntime.test.js`
Expected: fails because `src/soundZoneRuntime.js` does not exist.

- [ ] **Step 3: Implement sound-zone runtime**

Implement pure selection helpers. Use `targetBus` default `ambience`, `gain` default `1`, emitter `radius` default `8`, and stable ids from `id`, `soundZoneId`, `emitterId`, or `targetId`.

- [ ] **Step 4: Verify sound-zone tests pass**

Run: `node --test test/soundZoneRuntime.test.js`
Expected: tests pass.

---

### Task 4: Surface Runtime

**Files:**
- Create: `src/surfaceRuntime.js`
- Create: `test/surfaceRuntime.test.js`

- [ ] **Step 1: Write failing surface tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSurfaceProfile,
  getSurfaceAtPlayer,
} from '../src/surfaceRuntime.js';

test('creates surface profiles from GLB material metadata', () => {
  const world = {
    levelAsset: {
      materials: [
        { textureId: 'metal-grate', surfaceType: 'metal', footstepSoundId: 'metal_step', wet: false },
        { textureId: 'water-floor', level_surface: 'water', splashSoundId: 'water_splash', wet: true },
      ],
    },
  };

  const profile = createSurfaceProfile(world);
  assert.equal(profile.byType.get('metal').footstepSoundId, 'metal_step');
  assert.equal(profile.byType.get('water').splashSoundId, 'water_splash');
});

test('falls back to default surface when no walkable material match exists', () => {
  const surface = getSurfaceAtPlayer({ byType: new Map() }, { x: 0, y: 0, z: 0 }, []);
  assert.deepEqual(surface, {
    surfaceType: 'default',
    wet: false,
    friction: 1,
    damagePerSecond: 0,
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `node --test test/surfaceRuntime.test.js`
Expected: fails because `src/surfaceRuntime.js` does not exist.

- [ ] **Step 3: Implement surface runtime**

Implement `createSurfaceProfile(world)` and `getSurfaceAtPlayer(profile, player, walkableSurfaces)`. Preserve only metadata currently parsed by GLBs: `surfaceType`, `level_surface`, `footstepSoundId`, `splashSoundId`, `damagePerSecond`, `friction`, and `wet`. Use defaults for missing data.

- [ ] **Step 4: Verify surface tests pass**

Run: `node --test test/surfaceRuntime.test.js`
Expected: tests pass.

---

### Task 5: App Wiring, Cache, And Docs

**Files:**
- Modify: `src/app.js`
- Modify: `index.html`
- Modify: `.gitignore`
- Modify: `docs/blender-level-pipeline.md`
- Modify: `docs/recommendations.md`
- Test: focused runtime tests plus full suite

- [ ] **Step 1: Import and initialize runtime state**

Add imports from the new modules. Add local state variables near existing `hordeState`, `healthPotions`, and `damageZones`. Reset them in `setScene`, start-mode setup, restored state, and respawn paths that rebuild scene state.

- [ ] **Step 2: Wire objective and encounter updates in `updatePlayer`**

After damage/pickup updates and before horde spawning, update objective and encounter state. Show short objective/trigger text through `lowHealthNotice` for now to avoid adding a new HUD surface. Apply encounter horde decisions by updating `hordeState.nextPulseAt` and passing temporary horde tuning into the existing horde director.

- [ ] **Step 3: Gate Rogue warp progression**

In `updateRogueMode`, before `rogueTransitionPending = true`, call `isRogueGateUnlocked(world, objectiveState)`. If locked, show the objective HUD text and play an existing UI/transition one-shot at reduced gain, then return.

- [ ] **Step 4: Wire sound-zone and emitter decisions**

Use decisions in `updateSceneAudio` or nearby audio sync functions. Keep this first pass conservative: silence zones reduce ambience gain decisions, radio/ambience zones can trigger existing world stingers on cooldown, and nearby emitters can use existing rain drip or stinger assets where `soundId` is present.

- [ ] **Step 5: Wire surface decisions lightly**

Create the surface profile on scene load and query it around movement audio. Use the decision for future-facing metadata and a wet landing/splash gain adjustment without changing player movement physics in this pass.

- [ ] **Step 6: Update cache and docs**

Bump `index.html` from `./src/app.js?v=148` to `./src/app.js?v=149`. Add `.superpowers/` to `.gitignore`. Update docs to say the contracts now have behavior bindings.

- [ ] **Step 7: Verify**

Run:

```bash
node --test test/objectiveRuntime.test.js test/encounterRuntime.test.js test/soundZoneRuntime.test.js test/surfaceRuntime.test.js
npm test
npm run cache:check
```

Expected: focused tests pass, full suite passes, cache check passes.
