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
    maxHp: 3,
    invulnTime: 1.2, // seconds of invulnerability after being hit
  },
  camera: {
    edgeSize: 24, // px from screen edge that triggers panning
    panSpeed: 900, // px per second
  },
  // Fixed simulation step keeps movement and projectile hitboxes deterministic.
  fixedDt: 1 / 120,

  projectiles: {
    bullet: { speed: 300, radius: 8 },
    spread: { speed: 240, count: 5, arc: 0.7 }, // arc in radians
    arrow: { speed: 520, length: 36, radius: 3 },
    boulder: { speed: 150, radius: 38 },
    homing: { speed: 190, radius: 10, turnRate: 1.6, life: 6 },
    laser: { length: 5000, width: 22, warnTime: 1.1, activeTime: 0.35 },
  },
  spawner: {
    firstDelay: 2.5, // seconds before the first shot
    baseInterval: 1.6, // seconds between spawns at the start
    minInterval: 0.3,
    rampSeconds: 40, // spawn rate doubles after this long, triples after 2x, ...
    aimJitter: 0.25, // radians of random aim error
    // unlockAt: survival seconds before this type can appear
    types: {
      bullet: { weight: 5, unlockAt: 0 },
      arrow: { weight: 3, unlockAt: 8 },
      spread: { weight: 2, unlockAt: 18 },
      boulder: { weight: 2, unlockAt: 28 },
      homing: { weight: 2, unlockAt: 40 },
      laser: { weight: 1.5, unlockAt: 55 },
    },
  },

  rhythm: {
    approachTime: 1.4, // seconds a tile takes to fall to the hit line
    leadIn: 3, // seconds before the song starts
    loopGap: 1.5, // seconds of silence before the song repeats
    // Timing windows (ms either side of the note) and their accuracy weight.
    windows: [
      { name: 'Perfect', ms: 45, weight: 1, color: '#80deea' },
      { name: 'Great', ms: 90, weight: 0.8, color: '#a5d6a7' },
      { name: 'Good', ms: 135, weight: 0.5, color: '#fff59d' },
    ],
    ghostTapIsMiss: false, // count key presses with no tile nearby as misses
  },
  scoring: {
    accuracyThreshold: 0.8, // points are only earned at or above this accuracy
    pointsPerSecond: 10,
    // 0 = gate on whole-run accuracy; N = gate on the last N notes only.
    accuracyWindow: 0,
  },
  audio: {
    volume: 0.7,
  },
};
