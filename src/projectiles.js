import { CONFIG } from './config.js';
import { circleHitsCapsule } from './collision.js';

// All projectiles share this shape:
//   update(dt, player)  move one fixed step
//   hits(player)        exact hit test against the player's circle
//   draw(ctx)           draws exactly the hitbox shape (plus cosmetic trim)
//   done                true once it should be removed
//   x, y                position, used for off-screen warning arrows
//
// Moving projectiles are tested as a "swept" shape: the capsule from where they
// were at the start of the step to where they are now. That way a fast shot
// can never skip over the player between two steps.

class Projectile {
  constructor(x, y, angle, speed, maxDist) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.traveled = 0;
    this.maxDist = maxDist;
    this.done = false;
    this.warn = true; // show an off-screen arrow while it's incoming
  }

  get angle() {
    return Math.atan2(this.vy, this.vx);
  }

  move(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.traveled += Math.hypot(this.vx, this.vy) * dt;
    if (this.traveled > this.maxDist) this.done = true;
  }

  update(dt) {
    this.move(dt);
  }
}

// Small round shot flying straight at where the player was.
export class Bullet extends Projectile {
  constructor(x, y, angle, maxDist, opts = {}) {
    const c = CONFIG.projectiles.bullet;
    super(x, y, angle, opts.speed ?? c.speed, maxDist);
    this.radius = opts.radius ?? c.radius;
    this.color = opts.color ?? '#ffb74d';
  }

  hits(p) {
    return circleHitsCapsule(p.x, p.y, p.radius, this.prevX, this.prevY, this.x, this.y, this.radius);
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// Large, slow rock. Same circle hitbox, just big.
export class Boulder extends Bullet {
  constructor(x, y, angle, maxDist) {
    const c = CONFIG.projectiles.boulder;
    super(x, y, angle, maxDist, { speed: c.speed, radius: c.radius, color: '#8d6e63' });
    this.spin = 0;
  }

  update(dt) {
    super.update(dt);
    this.spin += dt * 2;
  }

  draw(ctx) {
    super.draw(ctx);
    // Cosmetic cracks, drawn inside the hitbox circle.
    ctx.strokeStyle = 'rgba(62,39,35,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = this.spin + (i * Math.PI * 2) / 3;
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(a) * this.radius * 0.7, this.y + Math.sin(a) * this.radius * 0.7);
    }
    ctx.stroke();
  }
}

// Fast, thin arrow. Hitbox is a capsule along its shaft, not a circle,
// so it's only dangerous where it is actually drawn.
export class Arrow extends Projectile {
  constructor(x, y, angle, maxDist) {
    const c = CONFIG.projectiles.arrow;
    super(x, y, angle, c.speed, maxDist);
    this.length = c.length;
    this.radius = c.radius;
  }

  // Tail end of the shaft (x, y is the tip).
  tail(x, y) {
    const a = this.angle;
    return { x: x - Math.cos(a) * this.length, y: y - Math.sin(a) * this.length };
  }

  hits(p) {
    // The arrow moves along its own axis, so the swept area is one longer
    // capsule from the previous tail to the current tip.
    const t = this.tail(this.prevX, this.prevY);
    return circleHitsCapsule(p.x, p.y, p.radius, t.x, t.y, this.x, this.y, this.radius);
  }

  draw(ctx) {
    const t = this.tail(this.x, this.y);
    ctx.strokeStyle = '#eeeeee';
    ctx.lineCap = 'round';
    ctx.lineWidth = this.radius * 2;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Fletching at the tail (cosmetic, inside the capsule's length).
    const a = this.angle;
    ctx.strokeStyle = '#e57373';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(t.x + Math.cos(a) * 8, t.y + Math.sin(a) * 8);
      ctx.lineTo(t.x + Math.cos(a + s * 0.5) * 2, t.y + Math.sin(a + s * 0.5) * 2);
    }
    ctx.stroke();
  }
}

// Slow orb that steers toward the player for a while, then fizzles out.
export class Homing extends Projectile {
  constructor(x, y, angle, maxDist) {
    const c = CONFIG.projectiles.homing;
    super(x, y, angle, c.speed, maxDist);
    this.radius = c.radius;
    this.turnRate = c.turnRate;
    this.life = c.life;
    this.age = 0;
  }

  update(dt, player) {
    this.age += dt;
    if (this.age < this.life) {
      const want = Math.atan2(player.y - this.y, player.x - this.x);
      let diff = want - this.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const turn = Math.max(-this.turnRate * dt, Math.min(this.turnRate * dt, diff));
      const a = this.angle + turn;
      const speed = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(a) * speed;
      this.vy = Math.sin(a) * speed;
    }
    this.move(dt);
    if (this.age > this.life + 2) this.done = true;
  }

  hits(p) {
    return circleHitsCapsule(p.x, p.y, p.radius, this.prevX, this.prevY, this.x, this.y, this.radius);
  }

  draw(ctx) {
    const pulse = 0.5 + 0.5 * Math.sin(this.age * 10);
    ctx.fillStyle = this.age < this.life ? '#ce93d8' : '#9575cd';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// A line across the arena: first a harmless warning, then a short burst that
// hurts anywhere along the beam. Hitbox is a capsule with the beam's width.
export class Laser {
  constructor(cx, cy, angle) {
    const c = CONFIG.projectiles.laser;
    const half = c.length / 2;
    this.ax = cx - Math.cos(angle) * half;
    this.ay = cy - Math.sin(angle) * half;
    this.bx = cx + Math.cos(angle) * half;
    this.by = cy + Math.sin(angle) * half;
    this.x = cx;
    this.y = cy;
    this.radius = c.width / 2;
    this.warnTime = c.warnTime;
    this.activeTime = c.activeTime;
    this.age = 0;
    this.done = false;
    this.warn = false; // it's drawn through the player's area, no arrow needed
  }

  get active() {
    return this.age >= this.warnTime && this.age < this.warnTime + this.activeTime;
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.warnTime + this.activeTime) this.done = true;
  }

  hits(p) {
    return this.active && circleHitsCapsule(p.x, p.y, p.radius, this.ax, this.ay, this.bx, this.by, this.radius);
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.ax, this.ay);
    ctx.lineTo(this.bx, this.by);
    if (this.active) {
      ctx.strokeStyle = 'rgba(255, 82, 82, 0.95)';
      ctx.lineWidth = this.radius * 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = this.radius * 0.6;
      ctx.stroke();
    } else {
      // Warning: thin line plus a faint outline of the exact danger zone.
      const t = this.age / this.warnTime;
      ctx.strokeStyle = `rgba(255, 82, 82, ${0.12 + 0.12 * t})`;
      ctx.lineWidth = this.radius * 2;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 82, 82, ${0.5 + 0.5 * t})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.lineCap = 'butt';
  }
}

// Decides what to fire and when. Shots come from a ring around the player,
// just outside the visible screen, from any direction.
export class Spawner {
  constructor() {
    this.reset();
  }

  reset() {
    this.time = 0;
    this.cooldown = CONFIG.spawner.firstDelay;
  }

  // Difficulty multiplier grows with survival time.
  get intensity() {
    return 1 + this.time / CONFIG.spawner.rampSeconds;
  }

  update(dt, player, camera, out) {
    this.time += dt;
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const { baseInterval, minInterval } = CONFIG.spawner;
    this.cooldown = Math.max(minInterval, baseInterval / this.intensity) * (0.7 + Math.random() * 0.6);
    this.spawn(this.pickType(), player, camera, out);
  }

  pickType() {
    const options = Object.entries(CONFIG.spawner.types).filter(([, t]) => this.time >= t.unlockAt);
    const total = options.reduce((s, [, t]) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const [name, t] of options) {
      r -= t.weight;
      if (r <= 0) return name;
    }
    return options[0][0];
  }

  spawn(type, player, camera, out) {
    const ringR = Math.hypot(camera.viewWidth, camera.viewHeight) / 2 + 80;
    const from = Math.random() * Math.PI * 2;
    const sx = player.x + Math.cos(from) * ringR;
    const sy = player.y + Math.sin(from) * ringR;
    const aim = Math.atan2(player.y - sy, player.x - sx);
    const jitter = (Math.random() - 0.5) * CONFIG.spawner.aimJitter;
    const maxDist = ringR * 2.5;

    switch (type) {
      case 'bullet':
        out.push(new Bullet(sx, sy, aim + jitter, maxDist));
        break;
      case 'spread': {
        const { count, arc } = CONFIG.projectiles.spread;
        for (let i = 0; i < count; i++) {
          const a = aim - arc / 2 + (arc * i) / (count - 1);
          out.push(new Bullet(sx, sy, a, maxDist, { speed: CONFIG.projectiles.spread.speed, color: '#fff176' }));
        }
        break;
      }
      case 'arrow':
        out.push(new Arrow(sx, sy, aim + jitter * 0.5, maxDist));
        break;
      case 'boulder':
        out.push(new Boulder(sx, sy, aim + jitter, maxDist));
        break;
      case 'homing':
        out.push(new Homing(sx, sy, aim, maxDist * 2));
        break;
      case 'laser': {
        // Through a point near the player at a random angle.
        const off = (Math.random() - 0.5) * 120;
        const ang = Math.random() * Math.PI;
        out.push(new Laser(player.x + Math.cos(ang + Math.PI / 2) * off, player.y + Math.sin(ang + Math.PI / 2) * off, ang));
        break;
      }
    }
  }
}
