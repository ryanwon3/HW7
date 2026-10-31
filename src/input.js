// Tracks mouse and keyboard state. Systems read from it each frame.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouse = { x: 0, y: 0, inside: false };
    this.rightDown = false;
    this.keys = new Set();
    // Queue of one-shot events (e.g. "rightclick") consumed by the game each update.
    this.events = [];

    // Disable the browser context menu so right click is free for gameplay.
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousemove', (e) => this.#setMouse(e));
    canvas.addEventListener('mouseenter', (e) => this.#setMouse(e));
    canvas.addEventListener('mouseleave', () => {
      this.mouse.inside = false;
      this.rightDown = false;
    });

    canvas.addEventListener('mousedown', (e) => {
      this.#setMouse(e);
      if (e.button === 2) {
        this.rightDown = true;
        this.events.push({ type: 'rightclick', x: this.mouse.x, y: this.mouse.y });
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.rightDown = false;
    });

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (!this.keys.has(key)) this.events.push({ type: 'keydown', key });
      this.keys.add(key);
      if (key === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.rightDown = false;
      this.mouse.inside = false;
    });
  }

  #setMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.inside = true;
  }

  isDown(key) {
    return this.keys.has(key);
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }
}
