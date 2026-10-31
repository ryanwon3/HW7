import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { MoveMarker } from './effects.js';
import { drawWorld } from './world.js';
import { Spawner } from './projectiles.js';
import { RhythmGame, LANE_KEYS } from './rhythm.js';
import { AudioEngine } from './audio.js';
import { drawHud, drawOffscreenWarnings } from './hud.js';

// States: 'menu' -> 'playing' <-> 'paused' -> 'gameover' -> 'playing' | 'menu'
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.camera = new Camera();
    this.audio = new AudioEngine();
    this.spawner = new Spawner();
    this.player = new Player(CONFIG.world.width / 2, CONFIG.world.height / 2);
    this.effects = [];
    this.projectiles = [];
    this.rhythm = null;
    this.song = null; // { buffer, chart, title }
    this.state = 'menu';
    this.score = 0;
    this.survived = 0;
    this.hurtFlash = 0;
    this.showHitboxes = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.best = Number(localStorage.getItem('hw7-best') || 0);
    // UI hooks, set by ui.js
    this.onStateChange = () => {};

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
    this.resize();
    this.camera.centerOn(this.player.x, this.player.y);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    // Size from the canvas's real on-screen box so drawing and mouse
    // coordinates always agree (100vh can differ from the visible height).
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.camera.resize(w, h);
  }

  setState(s) {
    this.state = s;
    this.onStateChange(s);
  }

  // song: { buffer: AudioBuffer, chart: { notes, duration }, title }
  startRun(song) {
    this.song = song;
    this.songTitle = song.title;
    this.player = new Player(CONFIG.world.width / 2, CONFIG.world.height / 2);
    this.camera.centerOn(this.player.x, this.player.y);
    this.projectiles = [];
    this.effects = [];
    this.spawner.reset();
    this.score = 0;
    this.survived = 0;
    this.hurtFlash = 0;
    this.rhythm = new RhythmGame(song.chart);
    this.audio.start(song.buffer, this.rhythm.period, CONFIG.rhythm.leadIn);
    this.input.drainEvents();
    this.accumulator = 0;
    this.setState('playing');
  }

  restart() {
    if (this.song) this.startRun(this.song);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.audio.pause();
    this.setState('paused');
  }

  async resume() {
    if (this.state !== 'paused') return;
    await this.audio.resume();
    this.input.drainEvents();
    this.accumulator = 0;
    this.setState('playing');
  }

  quitToMenu() {
    this.audio.stop();
    this.rhythm = null;
    this.projectiles = [];
    this.setState('menu');
  }

  gameOver() {
    this.audio.stop();
    if (this.score > this.best) {
      this.best = Math.floor(this.score);
      localStorage.setItem('hw7-best', String(this.best));
    }
    this.setState('gameover');
  }

  start() {
    requestAnimationFrame((t) => {
      this.lastTime = t;
      requestAnimationFrame((t2) => this.frame(t2));
    });
  }

  frame(now) {
    // Clamp large gaps (e.g. tab switched) so we don't simulate a huge jump.
    const elapsed = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - elapsed);
    if (this.state === 'playing') this.audio.sync();
    this.handleInput();

    if (this.state === 'playing') {
      this.accumulator += elapsed;
      while (this.accumulator >= CONFIG.fixedDt && this.state === 'playing') {
        this.update(CONFIG.fixedDt);
        this.accumulator -= CONFIG.fixedDt;
      }
      if (this.rhythm) {
        const songTime = this.audio.songTime();
        this.audio.scheduleAhead(songTime);
        this.rhythm.update(songTime);
      }
    }

    if (this.state === 'playing' || this.state === 'menu') this.updateCamera(elapsed);
    this.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  handleInput() {
    const { input, camera, player } = this;
    const events = input.drainEvents();
    if (this.state !== 'playing') {
      for (const ev of events) {
        if (ev.type !== 'keydown') continue;
        if (this.state === 'paused' && (ev.key === 'escape' || ev.key === 'p')) this.resume();
        if (this.state === 'gameover' && ev.key === 'enter') this.restart();
      }
      return;
    }

    for (const ev of events) {
      if (ev.type === 'rightclick') {
        const w = camera.screenToWorld(ev.x, ev.y);
        player.moveTo(w.x, w.y);
        this.effects.push(new MoveMarker(player.target.x, player.target.y));
      } else if (ev.type === 'keydown') {
        const lane = LANE_KEYS.indexOf(ev.key);
        if (lane >= 0 && this.rhythm) {
          // Judge using the key event's own timestamp, mapped onto the song clock.
          this.rhythm.press(lane, this.audio.songTime(ev.time));
        }
        if (ev.key === 'y') camera.locked = !camera.locked;
        if (ev.key === 's') player.stop();
        if (ev.key === 'h') this.showHitboxes = !this.showHitboxes;
        if (ev.key === 'escape' || ev.key === 'p') this.pause();
      }
    }

    // Holding right click keeps steering toward the cursor, like in MOBAs.
    if (input.rightDown && input.mouse.inside) {
      const w = camera.screenToWorld(input.mouse.x, input.mouse.y);
      player.moveTo(w.x, w.y);
    }
  }

  update(dt) {
    const { player } = this;
    this.survived += dt;
    player.update(dt);
    if (player.invuln > 0) player.invuln -= dt;

    this.spawner.update(dt, player, this.camera, this.projectiles);
    for (const p of this.projectiles) {
      p.update(dt, player);
      if (!p.done && player.invuln <= 0 && p.hits(player)) this.hurt(p);
      if (this.state !== 'playing') return;
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);

    for (const e of this.effects) e.update(dt);
    this.effects = this.effects.filter((e) => !e.done);

    // Points only start once the first tile has been judged, and only while
    // accuracy is at or above the threshold (80%).
    const r = this.rhythm;
    if (r && r.stats.judged > 0 && r.gateAccuracy >= CONFIG.scoring.accuracyThreshold) {
      this.score += CONFIG.scoring.pointsPerSecond * dt;
    }
  }

  hurt(projectile) {
    const { player } = this;
    player.hp--;
    player.invuln = CONFIG.player.invulnTime;
    this.hurtFlash = 0.3;
    if (!projectile.active) projectile.done = true; // lasers keep burning
    if (player.hp <= 0) this.gameOver();
  }

  updateCamera(dt) {
    const { camera, input, player } = this;
    if (camera.locked || input.isDown(' ')) {
      camera.centerOn(player.x, player.y);
    } else {
      camera.edgePan(input.mouse, dt);
    }
  }

  render() {
    const { ctx, camera, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight);

    // World space
    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
    drawWorld(ctx, camera);
    this.drawPath();
    for (const e of this.effects) e.draw(ctx);
    // Lasers under everything else so bullets on top stay readable.
    for (const p of this.projectiles) if (p.ax !== undefined) p.draw(ctx);
    const blink = this.player.invuln > 0 && Math.floor(this.player.invuln * 12) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    this.player.draw(ctx);
    ctx.globalAlpha = 1;
    for (const p of this.projectiles) if (p.ax === undefined) p.draw(ctx);
    if (this.showHitboxes) this.drawHitboxes();
    ctx.restore();

    // Screen space
    if (this.state !== 'menu') {
      drawOffscreenWarnings(ctx, camera, this.projectiles, this.player);
      if (this.rhythm) {
        const keysDown = LANE_KEYS.map((k) => this.input.isDown(k));
        const w = Math.min(280, camera.viewWidth * 0.3);
        this.rhythm.draw(ctx, 12, 12, w, camera.viewHeight - 24, this.audio.songTime(), keysDown);
        this.drawCountdown(12 + w / 2);
      }
      drawHud(ctx, this);
    }
    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${this.hurtFlash})`;
      ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight);
    }
  }

  drawCountdown(cx) {
    if (this.state !== 'playing') return;
    const t = this.audio.songTime();
    if (t >= 0) return;
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 48px system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(String(Math.ceil(-t)), cx, this.camera.viewHeight * 0.3);
    this.ctx.textAlign = 'left';
  }

  // Debug view (H): outlines of the exact shapes used for hit tests.
  drawHitboxes() {
    const { ctx, player } = this;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff1744';
    for (const p of this.projectiles) {
      ctx.beginPath();
      if (p.ax !== undefined) {
        capsulePath(ctx, p.ax, p.ay, p.bx, p.by, p.radius);
      } else if (p.length) {
        const t = p.tail(p.x, p.y);
        capsulePath(ctx, t.x, t.y, p.x, p.y, p.radius);
      } else {
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  }

  drawPath() {
    const { player, ctx } = this;
    if (!player.target) return;
    ctx.strokeStyle = 'rgba(102, 255, 140, 0.35)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.target.x, player.target.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function capsulePath(ctx, ax, ay, bx, by, r) {
  const a = Math.atan2(by - ay, bx - ax);
  ctx.arc(bx, by, r, a - Math.PI / 2, a + Math.PI / 2);
  ctx.arc(ax, ay, r, a + Math.PI / 2, a + (3 * Math.PI) / 2);
  ctx.closePath();
}
