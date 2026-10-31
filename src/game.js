import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { MoveMarker } from './effects.js';
import { drawWorld } from './world.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.camera = new Camera();
    this.player = new Player(CONFIG.world.width / 2, CONFIG.world.height / 2);
    // Generic list of things that update/draw in world space.
    // Projectiles will plug in alongside these later.
    this.effects = [];
    this.accumulator = 0;
    this.lastTime = 0;

    window.addEventListener('resize', () => this.resize());
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

    this.handleInput();

    this.accumulator += elapsed;
    while (this.accumulator >= CONFIG.fixedDt) {
      this.update(CONFIG.fixedDt);
      this.accumulator -= CONFIG.fixedDt;
    }

    this.updateCamera(elapsed);
    this.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  handleInput() {
    const { input, camera, player } = this;
    for (const ev of input.drainEvents()) {
      if (ev.type === 'rightclick') {
        const w = camera.screenToWorld(ev.x, ev.y);
        player.moveTo(w.x, w.y);
        this.effects.push(new MoveMarker(player.target.x, player.target.y));
      } else if (ev.type === 'keydown') {
        if (ev.key === 'y') camera.locked = !camera.locked;
        if (ev.key === 's') player.stop();
      }
    }

    // Holding right click keeps steering toward the cursor, like in MOBAs.
    if (input.rightDown && input.mouse.inside) {
      const w = camera.screenToWorld(input.mouse.x, input.mouse.y);
      player.moveTo(w.x, w.y);
    }
  }

  update(dt) {
    this.player.update(dt);
    for (const e of this.effects) e.update(dt);
    this.effects = this.effects.filter((e) => !e.done);
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
    this.player.draw(ctx);
    ctx.restore();
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
