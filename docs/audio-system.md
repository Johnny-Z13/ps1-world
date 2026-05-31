# Audio System

The browser runtime uses Web Audio after the first user gesture. Audio is organized around buses rather than one-off element playback, so new sounds should be routed by intent:

- `musicGain`: title, Free Roam, Cut Up, and Rogue music beds.
- `ambienceGain`: current scene ambience, crossfaded through two ambience slots.
- `transitionSfxGain`: mode starts, Cut Up scene slices, countdown ticks, and Rogue win stingers.
- `uiSfxGain`: options/menu interface sounds.
- `playerSfxGain`: player damage, death, pickup, and similar diegetic player events.
- Spatial emitters: zombies and torches use panners and update from world positions.

The v1 cinematic layer lives in `src/app.js` to match the current runtime shape. Keep helper functions focused and named by responsibility: `ensureMusicLoop`, `syncCinematicMusicAudio`, `ensureSceneAmbienceLoop`, `playTransitionOneShot`, `playUiOneShot`, and `syncCutUpCountdownAudio`.

Rogue mode reuses the transition bus for the final congratulations confetti sound. Scene ambience is data-driven from `src/world.js`, including the Rotwood forest wind/storm leaf beds.

## Adding Or Replacing Audio

1. Put generated files under `assets/audio/music`, `assets/audio/ambience`, or `assets/audio/sfx`.
2. Add or update the URL constant in `src/app.js`.
3. Bump the `?v=N` cache string on the changed asset URL.
4. If `src/app.js` changed, bump its query string in `index.html`.
5. Run `npm test`. The audio asset test checks that every referenced app audio file exists and is non-empty.

For v1, some cinematic music and transition files are placeholders copied from existing generated 8-bit assets. Replace those files with final ElevenLabs generations without changing the runtime contract.
