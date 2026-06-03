# Cinematic Audio Pass Design

## Goal

Make the audio feel deliberately scored across the title screen, Free Roam, and Cut Up Mode while keeping the existing PS1/8-bit identity.

## Current System

`src/app.js` already has a Web Audio system with scene ambience, reverb, lightning, player SFX, footsteps, low-health breathing, heartbeat, torch crackle, and spatial zombie grunts. The gaps are composition-level: no title music, no dedicated music bus, abrupt ambience swaps, thin menu feedback, and no Cut Up transition language.

## Audio Layers

The pass adds four layers:

- Music beds: title, Free Roam, and Cut Up loops.
- World ambience: the existing per-scene ambience loops, crossfaded during scene changes.
- Transition SFX: Free Roam start, Cut Up start, Cut Up scene slice, options open, options close.
- Reactive pressure: Cut Up countdown ticks, mode-based ducking, low-health and zombie tension continuing from the existing system.

## Generated Assets

Generate a tight MP3 set with ElevenLabs sound generation:

- `assets/audio/music/title-menu-psx-8bit-loop.mp3`
- `assets/audio/music/free-roam-dread-8bit-loop.mp3`
- `assets/audio/music/cut-up-clockwork-8bit-loop.mp3`
- `assets/audio/sfx/free-roam-start-warp-8bit.mp3`
- `assets/audio/sfx/cut-up-start-burst-8bit.mp3`
- `assets/audio/sfx/cut-up-scene-slice-8bit.mp3`
- `assets/audio/sfx/cut-up-countdown-tick-8bit.mp3`
- `assets/audio/sfx/options-open-static-8bit.mp3`
- `assets/audio/sfx/options-close-click-8bit.mp3`

Existing ambience loops remain in place for this pass.

## Runtime Behavior

The title loop starts after the first user gesture because browser autoplay rules prevent earlier playback. Free Roam starts with a warp hit, fades out title music, fades in the Free Roam bed, and brings in the current scene ambience. Cut Up starts with a harsher burst, fades in the Cut Up bed, plays a slice hit at each scene jump, briefly ducks ambience/music around each cut, and plays short ticks in the final three seconds of each 10-second world slice. Options open/close gets small UI sounds and ducks game audio while the dialog is open.

## Implementation Shape

Extend `audioState` with music, UI, and transition buses. Add loop-source helpers for music beds, a per-shot gain helper for one-shots, and a two-slot ambience crossfade. Keep the current single-file style in `src/app.js` for now rather than restructuring unrelated systems.

## Verification

Verify with `npm test`, asset existence checks, cache-busted script references, and an in-browser smoke test at `http://127.0.0.1:4173/`.
