// Turns any song into a QWER chart using onset detection.
//
// 1. Mix to mono and downsample to ~22 kHz.
// 2. Short-time FFT (1024 samples, hop 256 = ~11.6 ms).
// 3. Spectral flux: how much louder each frequency got since the last frame,
//    summed over 4 frequency bands (bass, low-mid, high-mid, treble).
// 4. Peaks in the total flux above an adaptive (local average) threshold are
//    onsets: drum hits, note starts, etc.
// 5. Keep onsets at least `minGap` apart (depends on difficulty), strongest
//    first, then assign each one to the lane whose band jumped the most
//    (bass = Q ... treble = R).
//
// Pure function (no browser APIs), so it runs in Node for testing.

const FRAME = 1024;
const HOP = 256;
const BAND_EDGES_HZ = [0, 200, 800, 3000, 11025];

export const DIFFICULTY = {
  easy: { minGap: 0.36, sensitivity: 1.6 },
  normal: { minGap: 0.22, sensitivity: 1.35 },
  hard: { minGap: 0.13, sensitivity: 1.15 },
};

// In-place iterative radix-2 FFT.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

function toMono(channels, sampleRate) {
  const factor = sampleRate >= 32000 ? 2 : 1;
  const len = Math.floor(channels[0].length / factor);
  const mono = new Float32Array(len);
  for (const ch of channels) {
    for (let i = 0; i < len; i++) {
      let s = 0;
      for (let k = 0; k < factor; k++) s += ch[i * factor + k];
      mono[i] += s / factor / channels.length;
    }
  }
  return { mono, rate: sampleRate / factor };
}

// channels: array of Float32Array (one per channel)
// returns { notes: [{ t, lane }], duration }
export function generateBeatmap(channels, sampleRate, difficulty = 'normal', onProgress) {
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const { mono, rate } = toMono(channels, sampleRate);
  const duration = channels[0].length / sampleRate;

  const nFrames = Math.max(0, Math.floor((mono.length - FRAME) / HOP) + 1);
  const window = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));

  const binHz = rate / FRAME;
  const bandOf = new Uint8Array(FRAME / 2);
  for (let k = 0; k < FRAME / 2; k++) {
    const hz = k * binHz;
    let b = 0;
    while (b < 3 && hz >= BAND_EDGES_HZ[b + 1]) b++;
    bandOf[k] = b;
  }

  const flux = new Float32Array(nFrames);
  const bandFlux = Array.from({ length: 4 }, () => new Float32Array(nFrames));
  const re = new Float32Array(FRAME);
  const im = new Float32Array(FRAME);
  let prevMag = new Float32Array(FRAME / 2);
  let mag = new Float32Array(FRAME / 2);

  for (let f = 0; f < nFrames; f++) {
    const off = f * HOP;
    for (let i = 0; i < FRAME; i++) {
      re[i] = mono[off + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);
    let total = 0;
    for (let k = 1; k < FRAME / 2; k++) {
      // Log compression makes quiet and loud parts count more evenly.
      mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = mag[k] - prevMag[k];
      if (d > 0) {
        total += d;
        bandFlux[bandOf[k]][f] += d;
      }
    }
    flux[f] = total;
    [prevMag, mag] = [mag, prevMag];
    if (onProgress && f % 2000 === 0) onProgress(f / nFrames);
  }

  // Adaptive threshold: local mean over ~0.5s around each frame.
  const frameSec = HOP / rate;
  const half = Math.round(0.25 / frameSec);
  const prefix = new Float64Array(nFrames + 1);
  for (let i = 0; i < nFrames; i++) prefix[i + 1] = prefix[i] + flux[i];
  const globalMean = prefix[nFrames] / Math.max(1, nFrames);

  const candidates = [];
  for (let f = 1; f < nFrames - 1; f++) {
    if (flux[f] <= flux[f - 1] || flux[f] < flux[f + 1]) continue; // local max
    const a = Math.max(0, f - half);
    const b = Math.min(nFrames, f + half + 1);
    const localMean = (prefix[b] - prefix[a]) / (b - a);
    const threshold = localMean * cfg.sensitivity + globalMean * 0.1;
    if (flux[f] > threshold) candidates.push({ f, strength: flux[f] - threshold });
  }

  // Strongest first, keep those not too close to an already-kept onset.
  candidates.sort((x, y) => y.strength - x.strength);
  const minFrames = cfg.minGap / frameSec;
  const kept = [];
  const taken = new Uint8Array(nFrames);
  for (const c of candidates) {
    const lo = Math.max(0, Math.ceil(c.f - minFrames + 1));
    const hi = Math.min(nFrames - 1, Math.floor(c.f + minFrames - 1));
    let clash = false;
    for (let i = lo; i <= hi; i++) {
      if (taken[i]) {
        clash = true;
        break;
      }
    }
    if (clash) continue;
    taken[c.f] = 1;
    kept.push(c.f);
  }
  kept.sort((a, b) => a - b);

  // Normalise each band by its average so treble doesn't always win.
  const bandMean = bandFlux.map((bf) => bf.reduce((s, v) => s + v, 0) / Math.max(1, nFrames) || 1);

  const notes = [];
  let prevLane = -1;
  let prevT = -1;
  for (const f of kept) {
    // Onset time: the frame's centre, where the flux jump is measured.
    const t = (f * HOP + FRAME / 2) / rate;
    const ranked = [0, 1, 2, 3].sort((x, y) => bandFlux[y][f] / bandMean[y] - bandFlux[x][f] / bandMean[x]);
    let lane = ranked[0];
    // Avoid fast repeated taps on one key: use the next best band instead.
    if (lane === prevLane && t - prevT < 0.3) lane = ranked[1];
    notes.push({ t, lane });
    prevLane = lane;
    prevT = t;
  }
  if (onProgress) onProgress(1);
  return { notes, duration };
}
