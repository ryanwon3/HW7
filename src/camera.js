import { CONFIG } from './config.js';

// Camera position is the world coordinate shown at the top-left of the screen.
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.viewWidth = 0;
    this.viewHeight = 0;
    this.locked = false;
  }

  resize(w, h) {
    this.viewWidth = w;
    this.viewHeight = h;
    this.clamp();
  }

  centerOn(wx, wy) {
    this.x = wx - this.viewWidth / 2;
    this.y = wy - this.viewHeight / 2;
    this.clamp();
  }

  // Pan when the mouse is near a screen edge (MOBA style).
  edgePan(mouse, dt) {
    if (!mouse.inside) return;
    const { edgeSize, panSpeed } = CONFIG.camera;
    let dx = 0;
    let dy = 0;
    if (mouse.x <= edgeSize) dx -= 1;
    else if (mouse.x >= this.viewWidth - edgeSize) dx += 1;
    if (mouse.y <= edgeSize) dy -= 1;
    else if (mouse.y >= this.viewHeight - edgeSize) dy += 1;
    if (dx === 0 && dy === 0) return;
    const len = Math.hypot(dx, dy);
    this.x += (dx / len) * panSpeed * dt;
    this.y += (dy / len) * panSpeed * dt;
    this.clamp();
  }

  clamp() {
    const { width, height } = CONFIG.world;
    // If the view is larger than the world, center the world instead.
    this.x = this.viewWidth >= width ? (width - this.viewWidth) / 2
      : Math.min(Math.max(this.x, 0), width - this.viewWidth);
    this.y = this.viewHeight >= height ? (height - this.viewHeight) / 2
      : Math.min(Math.max(this.y, 0), height - this.viewHeight);
  }

  screenToWorld(sx, sy) {
    return { x: sx + this.x, y: sy + this.y };
  }
}
