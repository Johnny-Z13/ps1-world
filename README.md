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
- **Esc** — video options (preset, scene, resolution)

## Tests

```bash
npm test
```

## Stack

Vanilla ES modules, WebGL, no build step.
