export function createDebugHudSnapshot(options) {
  const {
    previousFps,
    dt,
    debugEnabled,
    sceneLabel,
    zombieCount,
    zombiesEnabled,
  } = options;
  const instantFps = dt > 0 ? 1 / dt : 0;
  const fps = previousFps ? previousFps * 0.9 + instantFps * 0.1 : instantFps;

  return {
    fps,
    hidden: !debugEnabled,
    scene: sceneLabel,
    zombies: String(zombieCount),
    enemies: String(zombiesEnabled ? zombieCount : 0),
  };
}

export function applyDebugHudSnapshot(elements, snapshot) {
  if (!elements.panel) return;

  elements.panel.hidden = snapshot.hidden;
  if (snapshot.hidden) return;

  if (elements.fps) elements.fps.textContent = String(Math.round(snapshot.fps));
  if (elements.scene) elements.scene.textContent = snapshot.scene;
  if (elements.zombies) elements.zombies.textContent = snapshot.zombies;
  if (elements.enemies) elements.enemies.textContent = snapshot.enemies;
}
