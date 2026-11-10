// Checks the beat detector against the demo song, whose real note times are known.
import { generateDemoSong } from '../src/demoSong.js';
import { generateBeatmap } from '../src/beatmap.js';

let failed = false;
for (const d of ['easy', 'normal', 'hard']) {
  const song = generateDemoSong(44100, d);
  const map = generateBeatmap([song.samples], 44100, d);
  const found = map.notes.map((n) => n.t);
  let matched = 0;
  let errSum = 0;
  for (const n of song.chart.notes) {
    const best = found.reduce((b, t) => (Math.abs(t - n.t) < Math.abs(b - n.t) ? t : b), Infinity);
    if (Math.abs(best - n.t) <= 0.045) {
      matched++;
      errSum += Math.abs(best - n.t);
    }
  }
  const recall = matched / song.chart.notes.length;
  const meanErrMs = (errSum / Math.max(1, matched)) * 1000;
  const ok = recall >= 0.75 && meanErrMs < 20;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok' : 'FAIL'} ${d}: ${matched}/${song.chart.notes.length} melody notes found within 45ms (mean error ${meanErrMs.toFixed(1)}ms), ${found.length} tiles total`);
}
if (failed) process.exitCode = 1;
