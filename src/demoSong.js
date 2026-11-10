// A built-in song generated in code, so the game is playable without
// uploading anything. The chart is exact: every melody note is a tile, and the
// lane follows the note's pitch (low = Q, high = R).
// Pure function (no browser APIs) so it can be tested in Node.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 16-step rhythm patterns for one bar of melody, by difficulty.
const PATTERNS = {
  easy: [
    'x...x...x...x...',
    'x.......x...x...',
    'x...x.......x...',
  ],
  normal: [
    'x.x.x...x.x.x...',
    'x...x.x.x...x.x.',
    'x.x.x.x.x...x...',
    'x...x...x.x.x.x.',
  ],
  hard: [
    'x.x.x.xxx.x.x...',
    'x.xxx.x.x.xxx.x.',
    'x.x.x.x.x.x.xxxx',
    'xx.xx.x.x.x.x.x.',
  ],
};

const BPM = 128;
const BARS = 20; // 1 intro bar + 19 melody bars, ~37.5s
const A3 = 220;
// A minor pentatonic, two octaves: index 0..7
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17].map((s) => A3 * 2 ** (s / 12));
// Chord roots per bar (Am, F, C, G), as bass frequencies.
const ROOTS = [55, 43.65, 65.41, 49];

export function generateDemoSong(sampleRate = 44100, difficulty = 'normal') {
  const rand = mulberry32(7);
  const step = 60 / BPM / 4; // 16th note
  const barLen = step * 16;
  const duration = BARS * barLen + 1; // +1s of tail
  const out = new Float32Array(Math.ceil(duration * sampleRate));
  const notes = [];

  const add = (start, len, fn) => {
    const s0 = Math.floor(start * sampleRate);
    const n = Math.floor(len * sampleRate);
    for (let i = 0; i < n && s0 + i < out.length; i++) out[s0 + i] += fn(i / sampleRate);
  };

  const kick = (t0) => {
    let phase = 0;
    let last = 0;
    add(t0, 0.35, (t) => {
      const f = 45 + 110 * Math.exp(-t * 30);
      phase += 2 * Math.PI * f * (t - last);
      last = t;
      return Math.sin(phase) * Math.exp(-t * 9) * 0.9;
    });
  };
  const snare = (t0) => add(t0, 0.2, (t) => ((rand() * 2 - 1) * 0.35 + Math.sin(2 * Math.PI * 185 * t) * 0.25) * Math.exp(-t * 22));
  const hat = (t0) => {
    let prev = 0;
    add(t0, 0.05, (t) => {
      const n = rand() * 2 - 1;
      const hp = n - prev;
      prev = n;
      return hp * 0.08 * Math.exp(-t * 70);
    });
  };
  const bass = (t0, f) => add(t0, barLen / 2, (t) => (2 * ((t * f) % 1) - 1) * 0.22 * Math.exp(-t * 2.5));
  const lead = (t0, f) => add(t0, 0.22, (t) => Math.tanh(3 * Math.sin(2 * Math.PI * f * t)) * 0.18 * Math.min(1, t * 400) * Math.exp(-t * 9));

  const patterns = PATTERNS[difficulty] || PATTERNS.normal;
  let pitch = 3;
  for (let bar = 0; bar < BARS; bar++) {
    const t = bar * barLen;
    const root = ROOTS[bar % 4];
    for (let s = 0; s < 16; s++) {
      if (s % 2 === 0) hat(t + s * step);
    }
    kick(t);
    kick(t + 8 * step);
    if (bar % 2 === 1) kick(t + 10 * step);
    snare(t + 4 * step);
    snare(t + 12 * step);
    bass(t, root);
    bass(t + 8 * step, root);

    if (bar === 0) continue; // intro bar: drums only
    const pat = patterns[Math.floor(rand() * patterns.length)];
    for (let s = 0; s < 16; s++) {
      if (pat[s] !== 'x') continue;
      // Random walk over the scale, never repeating the same pitch.
      let next = pitch;
      while (next === pitch) next = Math.max(0, Math.min(7, pitch + Math.round((rand() - 0.5) * 5)));
      pitch = next;
      const nt = t + s * step;
      lead(nt, SCALE[pitch]);
      notes.push({ t: nt, lane: Math.floor(pitch / 2) });
    }
  }

  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.9 / peak;

  return { samples: out, sampleRate, chart: { notes, duration, title: `Demo track (${difficulty})` } };
}
