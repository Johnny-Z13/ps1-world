# PS1 World

Browser-based PS1-style 3D world prototype: low-res rendering, affine-style textures, and first-person movement in WebGL.

## Run locally

```bash
node scripts/dev-server.mjs
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Controls

- **WASD** — move
- **Mouse** — look (pointer lock)
- **Space** — jump
- **Shift** — sprint
- **Gamepad** — left stick move, right stick look, south button jump, shoulder/trigger sprint, Start/Menu options
- **1-9 / numpad 1-9** — switch scenes
- **Esc** — video options (preset, scene, resolution)

On touch devices, press the left side to spawn a floating movement joystick, drag the right side to look, and use the jump button for platforming.

Scenes include jumpable blocks, stepped platforms, and fall zones. Dropping deep below a scene's kill plane triggers a red death tint and impact sound, holds the fallen camera briefly, then respawns you at that scene's start.

The options menu also includes CRT/post effects, reticule visibility, pixel scale, inverted mouse Y, and the player torch toggle.

## Tests

```bash
npm test
```

## Stack

Vanilla ES modules, WebGL, no build step.
