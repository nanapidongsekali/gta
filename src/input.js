// Keyboard + mouse: state tombol, tekan sekali (edge), delta gerak mouse.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.dx = 0;
    this.dy = 0;
    this.mouse0 = false;
    this.mouse0Pressed = false;
    this.locked = false;
    this.enabled = true;
    this.wheel = 0;
    this._canvas = canvas;
    this.onLockLost = null;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // Jangan tangkap tombol kalau sedang mengetik di elemen form
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse0 = false; });

    window.addEventListener('mousemove', (e) => {
      // Saat pointer lock, movementX selalu ada. Tanpa lock, pakai saat drag.
      if (this.locked || this.mouse0) {
        this.dx += e.movementX || 0;
        this.dy += e.movementY || 0;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse0 = true; this.mouse0Pressed = true; }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse0 = false; });
    window.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked && this.onLockLost) this.onLockLost();
    });
  }

  down(code) { return this.enabled && this.keys.has(code); }
  once(code) {
    if (this.enabled && this.pressed.has(code)) { this.pressed.delete(code); return true; }
    this.pressed.delete(code); // tetap buang supaya tidak numpuk saat overlay
    return false;
  }
  axis(neg, pos) { return (this.down(pos) ? 1 : 0) - (this.down(neg) ? 1 : 0); }

  requestLock() {
    if (!this.locked) {
      try { this._canvas.requestPointerLock(); } catch (e) { /* fallback: drag look */ }
    }
  }
  releaseLock() {
    if (this.locked && document.exitPointerLock) document.exitPointerLock();
  }

  endFrame() {
    this.pressed.clear();
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
    this.mouse0Pressed = false;
  }
}
