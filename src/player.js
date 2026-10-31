import { CONFIG } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.player.radius; // circular hitbox
    this.speed = CONFIG.player.speed;
    this.target = null; // {x, y} world point we're walking to
    this.facing = 0; // radians
  }

  moveTo(wx, wy) {
    const { width, height } = CONFIG.world;
    const r = this.radius;
    this.target = {
      x: Math.min(Math.max(wx, r), width - r),
      y: Math.min(Math.max(wy, r), height - r),
    };
  }

  stop() {
    this.target = null;
  }

  update(dt) {
    if (!this.target) return;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (dist <= step) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.target = null;
      return;
    }
    this.facing = Math.atan2(dy, dx);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  draw(ctx) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 0.7, this.radius, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#4fc3f7';
    ctx.strokeStyle = '#e1f5fe';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Facing indicator
    ctx.fillStyle = '#0d47a1';
    ctx.beginPath();
    ctx.arc(
      this.x + Math.cos(this.facing) * this.radius * 0.55,
      this.y + Math.sin(this.facing) * this.radius * 0.55,
      this.radius * 0.3, 0, Math.PI * 2,
    );
    ctx.fill();
  }
}
