// Central tuning values. Adjust here rather than in individual systems.
export const CONFIG = {
  world: {
    width: 3000,
    height: 2000,
    gridSize: 100,
  },
  player: {
    radius: 18,
    speed: 320, // world units per second
  },
  camera: {
    edgeSize: 24, // px from screen edge that triggers panning
    panSpeed: 900, // px per second
  },
  // Fixed simulation step keeps movement (and future projectile hitboxes) deterministic.
  fixedDt: 1 / 120,
};
