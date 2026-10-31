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
    canvas.addEventListener('mouseleave', (e) => this.#onLeave(e));

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
      // Don't treat typing in the menu's text boxes as game input.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const key = e.key.toLowerCase();
      // e.timeStamp is on the performance.now() clock; the rhythm game uses it
      // to judge the exact moment of the press, independent of frame rate.
      if (!this.keys.has(key)) this.events.push({ type: 'keydown', key, time: e.timeStamp });
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

  // When the cursor leaves the page, pin it to the point where it left so that
  // edge panning keeps going. Without this, the camera stops as soon as the
  // cursor slips off the top (onto the browser's tab/address bar) or the bottom
  // (onto the taskbar or past the window edge), which made up/down panning
  // stutter while left/right (stopped by the screen edge) felt fine.
  // Panning stops when the cursor comes back or the window loses focus.
  #onLeave(e) {
    this.rightDown = false;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width - 1);
    this.mouse.y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height - 1);
    this.mouse.inside = true;
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
