# PS1 World Recommendations

Last reviewed: 2026-05-31.

## Current Read

PS1 World is best framed as a PS1/PS2 sandbox horror FPS: liminal 3D maze exploration, weird zombies, monsters, aliens, trippy cut-up scene changes, and authored Blender spaces. Keep the game ugly, haunted, tactile, and playable. Avoid sanding it into a clean modern shooter.

Health snapshot from this review:

- `npm test` passes: 270 tests, 0 failures.
- Local dev server responds at `http://127.0.0.1:4173/`.
- Blender MCP can see the open scene: 1,364 objects and 67 materials.
- Working tree already had an unstaged `assets/models/levels/ps1-world-levels.blend` modification before this doc pass.

## Highest-Value Feature Requests

1. Add authored encounter set pieces. Status: initial authoring/runtime contract implemented.
   Blender-authored generic set-piece trigger volumes now have a runtime data path: `src/levelGlb.js` parses `ENCOUNTER_TRIGGER` roles from either `extras.level_role` or `TRIGGER_<scene-id>_ENCOUNTER_TRIGGER_*` names, preserving metadata such as `encounterType`, `targetId`, `soundId`, `width`, `depth`, `height`, `oneShot`, and `enabled`. `src/sceneRuntime.js` carries parsed triggers into `world.encounterTriggers`, fallback worlds expose an empty list, and the contract is documented in `docs/blender-level-pipeline.md`. Next behavior slices can bind these triggers to ambush closets, one-time jump scares, monster wake volumes, radio/noise emitters, and warp-door traps.

2. Add per-scene objective rituals. Status: initial authoring/runtime contract implemented.
   Blender-authored objective markers and trigger volumes now have a runtime data path: `src/levelGlb.js` parses `OBJECTIVE` and `OBJECTIVE_TRIGGER` roles from `extras.level_role`, `MARKER_<scene-id>_OBJECTIVE_*`, or `TRIGGER_<scene-id>_OBJECTIVE_TRIGGER_*` names, preserving metadata such as `objectiveId`, `objectiveType`, `label`, `targetId`, `countRequired`, `requiredInRogue`, and `enabled`. `src/sceneRuntime.js` carries parsed objectives into `world.objectives`, fallback worlds expose an empty list, and the contract is documented in `docs/blender-level-pipeline.md`. Next behavior slices can make objectives optional in Free Roam and required in Rogue.

3. Add monster ecology. Status: implemented initial targeting overrides.
   `src/enemyCatalog.js` now exposes `createEnemyTargeting`, and `enemyEncounter.ecology` lets scenes override hostile factions and secondary target range per enemy type without replacing the catalog. Spawned enemies carry that targeting profile, so `src/zombies.js` can make aliens, zombies, and sentinels pick different monster targets per scene. Alien Landscape now widens alien/zombie infighting range, and Neon Backstreets gives the molten sentinel a wider punishment radius. Future slices can layer on noise punishers, look-triggered enemies, and warp-gate followers using the same ecology data path.

4. Add diegetic map weirdness. Status: initial scene metadata implemented.
   Every fallback scene now exposes `world.diegeticMap` with an unreliable in-world navigation artifact: soot-scratched service plans, alien star-chart scars, starship bulkhead diagrams, corrupted transit adverts, waterlogged temple reliefs, cathedral stained-glass floor hints, bark compasses, demo-disc orbit maps, and motel fire-exit plans. The data includes `artifactType`, `title`, `clueText`, `reliable: false`, and `glitchIntensity`, giving the next UI/render pass a concrete target without adding a clean minimap.

5. Add authored sound zones. Status: initial authoring/runtime contract implemented.
   Blender-authored sound zones now have a runtime data path: `src/levelGlb.js` parses `SOUND_ZONE` roles from either `extras.level_role` or `TRIGGER_<scene-id>_SOUND_ZONE_*` names, preserving metadata such as `soundZoneType`, `soundId`, `targetBus`, `gain`, `width`, `depth`, `height`, and `enabled`. `src/sceneRuntime.js` carries parsed zones into `world.soundZones`, fallback worlds expose an empty list, and the contract is documented in `docs/blender-level-pipeline.md`. Next behavior slices can bind these zones to humming walls, wet tunnels, hostile silence, radio bleed, and monster lure areas.

6. Add authored point emitters. Status: initial authoring/runtime contract implemented.
   Blender-authored emitter markers now have a runtime data path: `src/levelGlb.js` parses `EMITTER` roles from either `extras.level_role`, `MARKER_<scene-id>_EMITTER_*`, or compatible emitter names, preserving metadata such as `emitterId`, `emitterType`, `targetId`, `textureId`, `soundId`, `targetBus`, `gain`, `radius`, `rate`, and `enabled`. `src/sceneRuntime.js` carries parsed emitters into `world.emitters`, fallback worlds expose an empty list, and the contract is documented in `docs/blender-level-pipeline.md`. Next behavior slices can bind these anchors to drips, sparks, radio hiss, lure noises, and localized particles.

## Ordered Horde And Monster Combat Backlog

This is the recommended order for the requested animation, boss-fight, gore, death, and horde work. It starts with low-risk data/model changes, then moves into visible combat behavior.

1. Expose real animation choices per enemy. Status: implemented.
   Verified GLB clips:
   - `zombie`: `Armature|NlaTrack`
   - `one-eye-alien`: `Angry_To_Tantrum_Sit`, `Attack`, `Checkout_Gesture`, `Confused_Scratch`, `Formal_Bow`, `Listening_Gesture`
   - `molten-sentinel`: `Confused_Scratch`, `Idle`, `Running`

   Implemented in `src/enemyAnimation.js` and covered by `test/enemyAnimation.test.js`. Enemy animation selection is now explicitly state-based instead of partly distance-based. The alien uses `Attack` while attacking and rotates through non-attack ambient clips while stalking. The sentinel uses `Running` while chasing, `Confused_Scratch` while attacking, and `Idle` for idle state. The zombie keeps its single `Armature|NlaTrack` clip.

2. Keep killed enemies around briefly. Status: implemented.
   `src/zombies.js` now keeps enemies killed by hostile damage in a short `dying` phase before removal. Dying enemies preserve `diedAt` and `killedById`, stay visible for the renderer, and no longer touch, target, or block the player. This gives the next blood/death-render slices a concrete entity lifecycle to draw from.

3. Add blood bursts for monster-on-monster hits. Status: implemented.
   `src/bloodEffects.js` now creates deterministic short-lived blood bursts from newly dying enemies, all scenes include a generated `bloodBurst` texture, and `src/app.js` renders cheap billboard shards through the existing dynamic enemy mesh. The effect is visual only and does not add collision or physics.

4. Add death visuals. Status: implemented.
   `src/enemyDeathVisuals.js` now computes a dying render state that collapses, widens, sinks, darkens, and disables walk motion for killed enemies. `src/app.js` applies that state to both skinned enemy models and fallback cards, so enemies visibly collapse/flicker during the `dying` phase without needing new GLB death clips.

5. Add horde spawning as a separate system. Status: implemented.
   `src/zombies.js` now includes a controlled horde director with per-scene state, pulse timing, alive caps, authored-marker selection, player-distance checks, and overlap checks. `src/world.js` gives every scene conservative horde settings through `enemyEncounter.horde`, and `src/app.js` runs the horde director each gameplay tick while resetting it on scene changes.

6. Tune horde behavior. Status: implemented.
   Horde-spawned zombies now get deterministic lane offsets and steer toward staggered target points around the player. Existing capsule separation remains in place, so packs keep collision spacing while avoiding a strict single-file line into the player.

7. Add boss infighting spectacle. Status: implemented.
   Boss infighting now records hit metadata on damaged enemies. `src/app.js` uses those hit markers to add blood bursts on sentinel monster hits, trigger the sentinel impact SFX at higher intensity, and apply a short close-range camera jolt. The sentinel already uses `Confused_Scratch` while in attack state through the state-based animation selector.

8. Add Blender-authored horde triggers. Status: implemented.
   `src/levelGlb.js` now parses `HORDE_TRIGGER` markers from either `extras.level_role` or `TRIGGER_<scene-id>_HORDE_TRIGGER_*` names and preserves custom properties such as `triggerType`, `maxAlive`, and `pulseIntervalMs`. GLB-authored triggers flow into runtime worlds as `world.hordeTriggers`, while fallback procedural scenes expose an empty trigger list. The authoring contract is documented in `docs/blender-level-pipeline.md` for future awaken-horde, gate-lock, boss-summon, and monster-closet beats.

## Refactor And Optimization Recommendations

1. Split `src/app.js` by responsibility.
   The file is now 4,163 lines and handles DOM wiring, game loop, WebGL setup, scene loading, audio graph management, title rendering, input, player health, death, Cut-Up/Rogue flow, mesh generation, texture atlas creation, and low-level GL calls. The cleanest first extraction is audio because the functions from `ensureAudioState` through the enemy/torch/rain sync helpers are already clustered and data-driven by `src/audioConfig.js`.

   Status: implemented initial responsibility split. The first low-risk audio extraction now lives in `src/audioRuntime.js`: WebAudio graph/state construction, deterministic water-noise generation, audio asset fetch/decode/cache loading, one-shot playback routing, gain-bus one-shot routing, spatial one-shot playback, music loop loading/bookkeeping, reusable loop-source loading for footsteps and low-health breathing, scene ambience slot crossfading, heartbeat pulse scheduling and thump generation, torch crackle voice lifecycle and pulse generation, rain/waterfall voice lifecycle and drip generation, zombie grunt loop loading and spatial voice lifecycle, special-enemy loop voice lifecycle, special-enemy attack cooldown/one-shot routing, scene bus connection, ambience slot creation, enemy audio URL flattening, Cut-Up ducking, ambience target-gain math, cinematic music target gains, footstep target gains, player heartbeat parameters, zombie-audio occlusion geometry, reverb impulse generation, scene reverb application, AudioParam smoothing, and listener pose updates. Follow-up low-risk extractions now live in `src/playerFeedback.js`, which owns pure low-health pulse, damage/pickup flash, death-scene camera, progress, and tint math; `src/inputRuntime.js`, which owns pure gamepad axis/button normalization, snapshot creation, touch joystick normalization, and soft mouse edge-turn math; `src/debugHud.js`, which owns debug HUD snapshot formatting and DOM text application helpers; `src/sceneEffects.js`, which owns pure lightning strength and static torch flicker/render-state calculations; `src/renderMath.js`, which owns projection, matrix multiplication, and clamp helpers; `src/webglResources.js`, which owns buffer creation/update/binding, mesh-buffer deletion, and low-resolution render-target lifecycle helpers; `src/webglPrograms.js`, which owns shader compilation, program linking, and attribute/uniform location collection; `src/renderMeshes.js`, which owns primitive scene-mesh attribute binding, sky dome buffer construction, fullscreen post-quad construction, and post-quad drawing; `src/renderSceneMeshes.js`, which owns static GLB/fallback scene mesh construction for level art, boxes, cards, health flasks, warp gates, weather, and shared face primitives; `src/renderEnemyMeshes.js`, which owns dynamic zombie/special-enemy model/card geometry plus blood burst mesh buffer updates; `src/renderTextureAtlas.js`, which owns generated/fallback, GLB material, embedded image, and character texture atlas construction; `src/renderSkyDome.js`, which owns sky dome mode/palette mapping and WebGL draw-state orchestration; `src/renderPostPass.js`, which owns post-processing texture binding, screen-effect uniform assignment, and fullscreen quad drawing; and `src/renderScenePass.js`, which owns main scene atlas binding, scene/world/player light uniforms, static torch uniforms, and static/dynamic mesh draw ordering. `src/app.js` keeps state mutation, DOM notices, audio side effects, respawn flow, listener wiring, camera/view-projection calculation, dynamic enemy mesh updates, character model loading, and render loop ordering. `test/audioRuntime.test.js`, `test/playerFeedback.test.js`, `test/inputRuntime.test.js`, `test/debugHud.test.js`, `test/sceneEffects.test.js`, `test/renderMath.test.js`, `test/webglResources.test.js`, `test/webglPrograms.test.js`, `test/renderMeshes.test.js`, `test/renderSceneMeshes.test.js`, `test/renderEnemyMeshes.test.js`, `test/renderTextureAtlas.test.js`, `test/renderSkyDome.test.js`, `test/renderPostPass.test.js`, and `test/renderScenePass.test.js` cover those helpers. Further extractions can continue opportunistically, but the concrete recommendation from this review is executed.

2. Extract scene runtime assembly. Status: implemented.
   `src/sceneRuntime.js` now owns GLB/procedural scene selection, loaded-level caching, `createWorldFromLevelAsset`, collider/walkable conversion, enemy spawn normalization, level/fallback health pickup merging, damage-zone and horde-trigger selection, and level texture descriptor merging. `src/app.js` still owns `setScene`, render-resource rebuilds, player reset, and runtime state mutation. `test/sceneRuntime.test.js` covers GLB fallback behavior and runtime scene conversion without importing browser/WebGL globals.

3. Extract title/menu rendering. Status: implemented.
   `src/titleRenderer.js` now owns the PS1 bitmap title canvas renderer: title dimensions, bitmap font metrics, backdrop, blood warning text, mode buttons, button blink timing, control hint, and footer message. `src/app.js` still owns DOM event wiring and game-mode transitions. `test/titleRenderer.test.js` covers text measurement, blink timing, and the canvas draw contract without importing the browser runtime.

4. Keep `src/world.js` as fallback data, but stop growing it as the primary authoring surface. Status: documented policy.
   `src/world.js` remains procedural fallback metadata for scene labels, audio/reverb defaults, encounter defaults, and resilience when a GLB fails to load. New layout/art work should start in Blender or documented seed-generation paths, with browser runtime assembly handled through `src/sceneRuntime.js`. This is reflected in `README.md`, `CLAUDE.md`, and `docs/blender-level-pipeline.md`, and backed by existing GLB coverage that maps every selectable scene to an exported Blender level.

5. Add asset/cache automation. Status: implemented.
   `scripts/check-cache-busting.mjs` now verifies that known static JS/CSS, GLB, and audio references include `?v=N`, and reports changed cache-sensitive files from `git status --porcelain` for cache-bust review. It is exposed as `npm run cache:check` and covered by `test/cacheBusting.test.js`.

6. Add a browser smoke layer after the next extraction. Status: implemented.
   `scripts/browser-smoke.mjs` defines the browser smoke checklist for app boot, title controls, GLB scene loading, Rogue start, and fatal console errors. It is exposed as `npm run smoke:browser`, skips gracefully when Playwright is not installed, and is covered by `test/browserSmoke.test.js`. Manual in-app Browser verification remains the current reliable end-to-end check in this workspace.

## Concrete Next Engineering Pass

Last completed implementation pass:

1. Extract main scene render pass uniform orchestration from `src/app.js`. Status: implemented.
2. Keep public calls narrow: bind the atlas texture, apply scene/world/player torch/lightning/rain uniforms, set static torch uniforms, and draw static/dynamic meshes through existing render helpers.
3. Move no shader strings, texture atlas code, gameplay state, or enemy update logic in the same pass; keep `src/renderShaders.js`, `src/renderTextureAtlas.js`, and `src/renderEnemyMeshes.js` stable.
4. Add focused fake-GL tests around scene uniform assignment, static torch uniform caps, atlas binding, and static/dynamic mesh draw ordering, then keep current smoke tests passing.

Why this pass: it removed another cohesive rendering block from the riskiest file without changing scene data, Blender exports, audio, or gameplay balance.

## Blender Pipeline Notes

The open Blender scene is large enough that authoring discipline matters now. Continue using explicit collections and roles:

- `ART_*` for visible art.
- `COLLISION_*` for cheap blockers.
- `WALKABLE_*` for ground/platform height.
- `MARKER_*` for spawns, pickups, lights, kill planes, and future authored beats.
- `TRIGGER_*` for damage and future encounter/objective volumes.

`SOUND_ZONE_*`, `EMITTER_*`, and `OBJECTIVE_*` markers now have parser support and tests. `SURFACE_*` material metadata also has parser support and tests for future material-driven footsteps, splashes, damage feedback, and friction. The next behavior slice can bind these parsed contracts to audio/render/player systems without changing Blender naming again.

## Testing Priorities

1. Add an asset cache test that asserts GLB/audio/static references include a cache version. Status: implemented.
2. Add scene-runtime tests after extracting scene assembly from `app.js`. Status: implemented.
3. Replace source-text UI assertions gradually as menu/title logic becomes importable. Status: implemented initial migration.
   Title renderer layout assertions for button positions and footer behavior now live in `test/titleRenderer.test.js` against the importable renderer, and debug HUD formatting/visibility assertions now live in `test/debugHud.test.js` against `src/debugHud.js`. Duplicate source-text checks were removed from `test/uiMarkup.test.js`. Continue this pattern as more UI/runtime behavior moves behind importable helpers.
4. Add browser smoke tests only when they can run reliably and cheaply. Status: implemented.

## Watchouts

- Do not overwrite the open `ps1-world-levels.blend` change unless the user explicitly asks to re-export or rebuild from seed.
- Do not delete procedural fallback scene data yet; GLB failure fallback is still part of runtime resilience.
- Do not add new enemy or objective concepts as loose naming conventions. Add documented Blender roles, parser support, tests, and runtime behavior together.
