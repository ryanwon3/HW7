import { CONFIG } from './config.js';

export const LANE_KEYS = ['q', 'w', 'e', 'r'];
const LANE_COLORS = ['#ef5350', '#66bb6a', '#42a5f5', '#ffca28'];

// Falling-tiles rhythm game played with Q W E R.
//
// Timing: every time value here is in seconds on the song clock (see
// audio.js). Key presses are judged using the key event's own timestamp
// converted to song time, not the frame time, so judgement doesn't depend on
// frame rate.
//
// Accuracy = sum of judgement weights / number of judged notes.
// Perfect = 100%, Great = 80%, Good = 50%, Miss = 0% (windows in config.js).
// A note counts as a Miss once it is later than the widest window.
export class RhythmGame {
  // chart: { notes: [{ t, lane }], duration }
  // The chart repeats forever (survival mode), with a short gap between loops.
  constructor(chart) {
    this.chart = chart;
    this.period = chart.duration + CONFIG.rhythm.loopGap;
    this.notes = [];
    this.nextLoop = 0;
    this.stats = { counts: {}, judged: 0, weightSum: 0, combo: 0, maxCombo: 0, recent: [] };
    for (const w of CONFIG.rhythm.windows) this.stats.counts[w.name] = 0;
    this.stats.counts.Miss = 0;
    this.feedback = null; // { text, color, at, offsetMs }
    this.laneFlash = [-Infinity, -Infinity, -Infinity, -Infinity];
  }

  get maxWindow() {
    const w = CONFIG.rhythm.windows;
    return w[w.length - 1].ms / 1000;
  }

  // Overall accuracy (0..1). 1 before any notes are judged.
  get accuracy() {
    const s = this.stats;
    return s.judged === 0 ? 1 : s.weightSum / s.judged;
  }

  // Accuracy used for the scoring gate: whole run, or only the last N notes
  // if CONFIG.scoring.accuracyWindow > 0.
  get gateAccuracy() {
    const n = CONFIG.scoring.accuracyWindow;
    if (!n) return this.accuracy;
    const r = this.stats.recent;
    if (r.length === 0) return 1;
    return r.reduce((a, b) => a + b, 0) / r.length;
  }

  // Make sure notes exist up to `time + lookahead`.
  ensureNotes(time) {
    const lookahead = CONFIG.rhythm.approachTime + 1;
    while (this.nextLoop * this.period <= time + lookahead) {
      const base = this.nextLoop * this.period;
      for (const n of this.chart.notes) {
        this.notes.push({ t: base + n.t, lane: n.lane, judged: false });
      }
      this.nextLoop++;
    }
  }

  update(time) {
    this.ensureNotes(time);
    const late = this.maxWindow;
    for (const n of this.notes) {
      if (!n.judged && time - n.t > late) this.record(n, null, time);
    }
    // Drop notes that are judged and off the bottom of the lane.
    this.notes = this.notes.filter((n) => !(n.judged && time - n.t > 0.5) && !(n.hit && time - n.hitAt > 0.15));
  }

  // A lane key was pressed at song time `time`.
  press(lane, time) {
    this.laneFlash[lane] = time;
    const maxW = this.maxWindow;
    // The earliest unjudged note in this lane that's inside the widest window.
    let best = null;
    for (const n of this.notes) {
      if (n.judged || n.lane !== lane) continue;
      if (Math.abs(n.t - time) > maxW) continue;
      if (!best || n.t < best.t) best = n;
    }
    if (!best) {
      if (CONFIG.rhythm.ghostTapIsMiss) this.record(null, null, time);
      return null;
    }
    const offset = time - best.t; // negative = early
    const win = CONFIG.rhythm.windows.find((w) => Math.abs(offset) * 1000 <= w.ms);
    this.record(best, win, time, offset);
    return win.name;
  }

  record(note, win, time, offset = 0) {
    const s = this.stats;
    const weight = win ? win.weight : 0;
    if (note) {
      note.judged = true;
      if (win) {
        note.hit = true;
        note.hitAt = time;
      }
    }
    s.judged++;
    s.weightSum += weight;
    s.counts[win ? win.name : 'Miss']++;
    s.recent.push(weight);
    const n = CONFIG.scoring.accuracyWindow;
    if (n && s.recent.length > n) s.recent.shift();
    else if (!n && s.recent.length > 64) s.recent.shift();
    if (win) {
      s.combo++;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
    } else {
      s.combo = 0;
    }
    this.feedback = {
      text: win ? win.name : 'Miss',
      color: win ? win.color : '#ef5350',
      at: time,
      offsetMs: win ? Math.round(offset * 1000) : null,
    };
  }

  // Draw the lanes in screen space. keysDown: array of 4 booleans.
  draw(ctx, x, y, w, h, time, keysDown) {
    const { approachTime } = CONFIG.rhythm;
    const laneW = w / 4;
    const hitY = y + h - 70;
    const pxPerSec = (hitY - y) / approachTime;

    ctx.fillStyle = 'rgba(10, 10, 20, 0.78)';
    ctx.fillRect(x, y, w, h);

    for (let i = 0; i < 4; i++) {
      const lx = x + i * laneW;
      if (keysDown[i]) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(lx, y, laneW, h);
      }
      const since = time - this.laneFlash[i];
      if (since >= 0 && since < 0.12) {
        ctx.fillStyle = `rgba(255,255,255,${0.25 * (1 - since / 0.12)})`;
        ctx.fillRect(lx, hitY - 40, laneW, 80);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx + 0.5, y);
      ctx.lineTo(lx + 0.5, y + h);
      ctx.stroke();
    }

    // Hit line
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x, hitY - 1, w, 2);

    // Notes: the note's centre crosses the hit line exactly at its time.
    const noteH = 16;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (const n of this.notes) {
      if (n.hit) continue;
      const ny = hitY - (n.t - time) * pxPerSec;
      if (ny < y - noteH || ny > y + h + noteH) continue;
      ctx.fillStyle = n.judged ? 'rgba(120,120,120,0.5)' : LANE_COLORS[n.lane];
      ctx.fillRect(x + n.lane * laneW + 4, ny - noteH / 2, laneW - 8, noteH);
    }
    ctx.restore();

    // Key labels
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const cx = x + i * laneW + laneW / 2;
      ctx.fillStyle = keysDown[i] ? LANE_COLORS[i] : 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + i * laneW + 6, hitY + 14, laneW - 12, 36);
      ctx.fillStyle = keysDown[i] ? '#111' : '#eee';
      ctx.fillText(LANE_KEYS[i].toUpperCase(), cx, hitY + 32);
    }

    // Judgement feedback
    const f = this.feedback;
    if (f && time - f.at < 0.5) {
      const a = 1 - (time - f.at) / 0.5;
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(f.text, x + w / 2, y + h * 0.45);
      if (f.offsetMs !== null) {
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = '#ddd';
        const label = f.offsetMs === 0 ? 'on time' : `${Math.abs(f.offsetMs)}ms ${f.offsetMs < 0 ? 'early' : 'late'}`;
        ctx.fillText(label, x + w / 2, y + h * 0.45 + 24);
      }
      ctx.globalAlpha = 1;
    }
    if (this.stats.combo >= 5) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`${this.stats.combo} combo`, x + w / 2, y + h * 0.45 - 30);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
