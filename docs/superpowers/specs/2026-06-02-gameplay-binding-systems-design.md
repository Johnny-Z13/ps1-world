# Gameplay Binding Systems Design

Date: 2026-06-02

## Intent

Turn the existing authored metadata contracts into playable systems for the next PS1 World pass. The direction is option C from the browser mockup: build a hybrid spine where Rogue mode has strange ritual gates, while Free Roam and Rogue both gain reactive encounter, sound, emitter, and surface behavior.

The game should stay ugly, haunted, readable, and fast. These systems should make Blender-authored spaces feel alive without turning the game into a clean quest tracker or modern objective shooter.

## Scope

This pass binds contracts that already exist at runtime:

- `world.objectives`
- `world.encounterTriggers`
- `world.hordeTriggers`
- `world.soundZones`
- `world.emitters`
- material surface metadata on GLB level assets

No new Blender naming convention is required for this slice. If a scene has no authored metadata, fallback behavior remains unchanged.

## Player Experience

Rogue mode becomes a weird dungeon-crawling run instead of a simple gate-to-gate tour. A scene can require one or more ritual objectives before the warp gate works. The feedback should be diegetic and terse: short corrupted text such as `FEED THE DOOR`, `SIGNAL NOT READY`, or `RITUAL 1/3`, not a clean quest log.

Encounter triggers should create small authored shocks: one-shot ambush pulses, jump-scare stingers, horde wake-ups, and boss-arena pressure. The existing horde director remains the source of extra zombie spawning; triggers should tune or wake it rather than create a second spawn system.

Sound zones and emitters should make spaces feel hostile. Zones can duck or boost ambience, play radio bleed, create silence pockets, or mark wet areas. Emitters can attach local dripping, sparking, humming, or lure sounds to authored points.

Surface metadata should affect moment-to-moment movement/audio lightly. The first slice should prioritize footstep and splash sound selection plus damage-zone feedback. Friction changes can be added only if they stay deterministic and do not destabilize player movement.

## Architecture

Add small importable runtime modules instead of growing `src/app.js`:

- `src/objectiveRuntime.js`: pure objective state creation, trigger completion, Rogue gate eligibility, and HUD text derivation.
- `src/encounterRuntime.js`: pure trigger activation, one-shot bookkeeping, and horde tuning decisions.
- `src/soundZoneRuntime.js`: pure zone containment and target audio mix decisions.
- `src/surfaceRuntime.js`: pure material/surface lookup helpers for player footsteps and simple surface feedback.

`src/app.js` remains the orchestration layer. It owns DOM text, audio one-shots, horde state mutation, scene changes, and player state. New modules should return decisions; `app.js` performs side effects.

## Data Flow

On scene load:

1. `src/sceneRuntime.js` builds `world` from GLB or fallback data.
2. `src/app.js` initializes objective, encounter, sound-zone, and surface runtime state from `world`.
3. Existing enemy, horde, audio, health, and render state resets continue to happen in `app.js`.

On each playable tick:

1. Player movement resolves as it does today.
2. Objective runtime checks player proximity/trigger volumes and marks completed steps.
3. Encounter runtime checks trigger volumes and returns actions such as horde wake, stinger, or one-shot notice.
4. Sound-zone runtime calculates the strongest current zone decision.
5. Existing zombie and horde update runs, using trigger-adjusted horde state/settings when active.
6. Rogue gate checks objective completion before advancing.

## Error Handling

Malformed or partial authored metadata must be ignored safely. Disabled triggers and objectives do nothing. Missing labels fall back to short generated text. Unknown trigger or zone types should return no action rather than throwing. The GLB parser already preserves the raw contracts; this pass should not make level loading more fragile.

## Testing

Add focused Node tests for each runtime module before wiring:

- Objectives: initial state, proximity completion, count progress, required-in-Rogue gate lock/unlock.
- Encounters: one-shot triggers fire once, disabled triggers stay idle, horde wake decisions carry authored caps/intervals.
- Sound zones: closest/highest-priority zone selection, silence/radio/ambience decisions, disabled zones ignored.
- Surfaces: surface metadata lookup from GLB material hints, fallback surface behavior when no match exists.

After wiring, extend smoke/UI source tests only where needed to confirm `app.js` uses the new runtime paths. Run `npm test` and `npm run cache:check` after code changes. Because `src/app.js` changes are static JS, bump the `src/app.js?v=N` cache string in `index.html`.

## Non-Goals

- No new GLB export pass.
- No edits to `assets/models/levels/ps1-world-levels.blend`.
- No clean minimap, modern quest UI, inventory screen, or upgrade economy.
- No broad rewrite of `src/app.js`.
- No new audio asset generation unless existing assets cannot cover a required one-shot or loop.

## First Implementation Slice

Build the systems in this order:

1. Objective runtime and Rogue gate lock.
2. Encounter trigger runtime that can wake/tune the existing horde director and play existing stingers.
3. Sound-zone and emitter decisions using existing ambience, rain drip, torch crackle, and stinger assets.
4. Surface lookup for footsteps/splashes and damage feedback.
5. Documentation updates for authoring behavior and recommendations.

This order makes Rogue mode meaningfully better first, then layers the psychedelic reactive behavior around it.
