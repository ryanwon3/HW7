import { CONFIG } from './config.js';

// Plays the song (looping, for survival mode) and provides the song clock.
//
// The song clock is derived from the audio hardware clock, not from frame
// times: getOutputTimestamp() tells us which audio context time is coming out
// of the speakers at a given performance.now() time. With that mapping we can
// turn any event timestamp (e.g. a keydown's e.timeStamp) into exact song
// time, which is what makes the rhythm judgement accurate.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.sources = [];
    this.offset = null; // contextTime - performanceTime, in seconds
    this.userOffsetMs = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = CONFIG.audio.volume;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  async decode(arrayBuffer) {
    return this.ensureContext().decodeAudioData(arrayBuffer);
  }

  bufferFromSamples(samples, sampleRate) {
    const ctx = this.ensureContext();
    const buf = ctx.createBuffer(1, samples.length, sampleRate);
    buf.copyToChannel(samples, 0);
    return buf;
  }

  // Start playing `buffer` so that song time 0 is `leadIn` seconds from now,
  // repeating every `period` seconds.
  start(buffer, period, leadIn) {
    this.stop();
    const ctx = this.ensureContext();
    this.buffer = buffer;
    this.period = period;
    this.origin = ctx.currentTime + leadIn;
    this.scheduled = 0;
    this.offset = null;
    this.sync();
    this.scheduleAhead(-leadIn);
  }

  scheduleAhead(songTime) {
    if (!this.buffer) return;
    while (this.scheduled * this.period < songTime + 3) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffer;
      src.connect(this.gain);
      src.start(this.origin + this.scheduled * this.period);
      src.onended = () => {
        this.sources = this.sources.filter((s) => s !== src);
      };
      this.sources.push(src);
      this.scheduled++;
    }
  }

  // Call once per frame to refresh the audio-clock <-> performance-clock mapping.
  sync() {
    const ctx = this.ctx;
    if (!ctx) return;
    let off;
    const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    if (ts && ts.performanceTime > 0 && ts.contextTime > 0) {
      off = ts.contextTime - ts.performanceTime / 1000;
    } else {
      const latency = ctx.outputLatency || ctx.baseLatency || 0;
      off = ctx.currentTime - latency - performance.now() / 1000;
    }
    // Smooth out the audio clock's small block-size steps, but snap on big jumps.
    if (this.offset === null || Math.abs(off - this.offset) > 0.05) this.offset = off;
    else this.offset += (off - this.offset) * 0.1;
  }

  // Song time (seconds) at a performance.now()-based timestamp in ms.
  songTime(perfMs = performance.now()) {
    if (this.offset === null) return 0;
    return perfMs / 1000 + this.offset - this.origin - this.userOffsetMs / 1000;
  }

  pause() {
    if (this.ctx) return this.ctx.suspend();
    return Promise.resolve();
  }

  async resume() {
    if (!this.ctx) return;
    await this.ctx.resume();
    this.offset = null;
    this.sync();
  }

  stop() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    }
    this.sources = [];
    this.buffer = null;
  }
}
