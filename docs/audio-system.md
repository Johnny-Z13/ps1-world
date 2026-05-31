# Audio System

The browser runtime uses Web Audio after the first user gesture. Audio is organized around buses rather than one-off element playback, so new sounds should be routed by intent:

- `musicGain`: title, Free Roam, Cut Up, and Rogue music beds.
- `ambienceGain`: current scene ambience, crossfaded through two ambience slots.
- `transitionSfxGain`: mode starts, Cut Up scene slices, countdown ticks, and Rogue win stingers.
- `uiSfxGain`: options/menu interface sounds.
- `playerSfxGain`: player damage, death, pickup, and similar diegetic player events.
- Spatial emitters: zombies and torches use panners and update from world positions.

The v1 cinematic layer is orchestrated from `src/app.js`, with asset URLs, gain levels, enemy audio profiles, and reverb presets centralized in `src/audioConfig.js`. Keep helper functions focused and named by responsibility: `ensureMusicLoop`, `syncCinematicMusicAudio`, `ensureSceneAmbienceLoop`, `playTransitionOneShot`, `playUiOneShot`, `playSpatialOneShot`, and `syncCutUpCountdownAudio`.

Rogue mode reuses the transition bus for the final congratulations confetti sound. Scene ambience is data-driven from `src/world.js`, including the Rotwood forest wind/storm leaf beds.

Enemy audio is profile-driven through `ENEMY_AUDIO_PROFILES` in `src/audioConfig.js`. Each enemy type should have a unique locomotion/idle loop and attack one-shot. Zombies, the one-eyed alien, and the Molten Stone Sentinel currently use separate crunchy 8-bit assets, with distance rolloff and wall occlusion.

Player audio is split between continuous loops and spot events. Footsteps, low-health breathing, and heartbeat are loops/pulses; damage, death, health pickup, jump, and landing are one-shots. UI hover, toggle, select, Start, options open/close, and mode transitions are separate sounds so menu interaction has immediate feedback.

Rainy scenes combine the scene ambience loop with spatial rain beds and drip spot effects. Lightning uses a visual threshold to fire a one-shot strike only once per flash. Rare world stingers are subtle spatial one-shots scheduled per scene to keep exploration from going silent between enemy encounters.

## Adding Or Replacing Audio

1. Put generated files under `assets/audio/music`, `assets/audio/ambience`, or `assets/audio/sfx`.
2. Add or update the URL constant in `src/audioConfig.js`.
3. Bump the `?v=N` cache string on the changed asset URL.
4. If a referenced static JS module changed, bump the `src/app.js` query string in `index.html`.
5. Run `npm test`. The audio asset test checks that every referenced runtime audio file exists and is non-empty.

For v1, some cinematic music and transition files are placeholders copied from existing generated 8-bit assets. Replace those files with final ElevenLabs generations without changing the runtime contract.
