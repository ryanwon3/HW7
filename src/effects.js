// Short-lived visual feedback, e.g. the marker shown where you right-click.
export class MoveMarker {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.life = 0.45;
  }

  get done() {
    return this.age >= this.life;
  }

  update(dt) {
    this.age += dt;
  }

  draw(ctx) {
    const t = this.age / this.life;
    const r = 16 * (1 - t) + 4;
    ctx.strokeStyle = `rgba(102, 255, 140, ${1 - t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x - r * 0.5, this.y);
    ctx.lineTo(this.x + r * 0.5, this.y);
    ctx.moveTo(this.x, this.y - r * 0.5);
    ctx.lineTo(this.x, this.y + r * 0.5);
    ctx.stroke();
  }
}
