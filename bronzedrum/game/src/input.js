// Keyboard, pointer and Xbox-controller input. Drum hits carry a timestamp
// on the performance.now() clock so the game can map them onto the audio
// clock; menu actions are plain names.

const DRUM_KEYS = {
  KeyF: 'L', KeyD: 'L', KeyA: 'L', ArrowLeft: 'L',
  KeyJ: 'R', KeyK: 'R', KeyL: 'R', ArrowRight: 'R',
};
const NAV_KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'confirm', Space: 'confirm', Escape: 'back', Backspace: 'back',
};

// Standard gamepad mapping.
export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PAD_DRUM = { [PAD.X]: 'L', [PAD.LB]: 'L', [PAD.LT]: 'L', [PAD.LEFT]: 'L', [PAD.B]: 'R', [PAD.RB]: 'R', [PAD.RT]: 'R', [PAD.RIGHT]: 'R' };
const PAD_NAV = { [PAD.UP]: 'up', [PAD.DOWN]: 'down', [PAD.LEFT]: 'left', [PAD.RIGHT]: 'right', [PAD.A]: 'confirm', [PAD.B]: 'back', [PAD.MENU]: 'menu' };
const DEAD = 0.5;
const REPEAT_FIRST = 0.38;
const REPEAT_NEXT = 0.14;

export class Input {
  constructor(target) {
    this.handlers = { drum: [], nav: [], device: [], padButton: [], stick: [], action: [] };
    this.mode = 'menu'; // 'menu' | 'play'
    this.device = 'keyboard';
    this.padIndex = null;
    this.prev = [];
    this.stickDir = null;
    this.stickNext = 0;
    this.armed = false; // ignore buttons held when a gamepad first appears
    this.vibration = true;

    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('gamepadconnected', (e) => {
      if (this.padIndex === null) this.padIndex = e.gamepad.index;
      this.armed = false;
      this.emit('device', { type: 'connected' });
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.padIndex) {
        this.padIndex = null;
        this.emit('device', { type: 'disconnected' });
      }
    });
    target.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'play') return;
      const r = target.getBoundingClientRect();
      this.setDevice('pointer');
      // Tapping the bronze drum in the HUD raises the guard.
      const dx = ((e.clientX - r.left) / r.width - 0.5) * 1280;
      const dy = ((e.clientY - r.top) / r.height - 640 / 720) * 720;
      if (Math.hypot(dx, dy) < 80) {
        this.emit('action', { action: 'guard', time: e.timeStamp });
        e.preventDefault();
        return;
      }
      const drum = e.clientX - r.left < r.width / 2 ? 'L' : 'R';
      this.emit('drum', { drum, time: e.timeStamp });
      e.preventDefault();
    });
  }

  on(type, fn) {
    this.handlers[type].push(fn);
  }

  emit(type, data) {
    for (const fn of this.handlers[type]) fn(data);
  }

  setDevice(d) {
    if (d !== this.device) {
      this.device = d;
      this.emit('device', { type: 'switch', device: d });
    }
  }

  onKey(e) {
    if (e.repeat) {
      if (this.mode === 'menu' && NAV_KEYS[e.code] && e.code.startsWith('Arrow')) this.emit('nav', NAV_KEYS[e.code]);
      return;
    }
    this.setDevice('keyboard');
    if (this.mode === 'play') {
      if (DRUM_KEYS[e.code]) {
        this.emit('drum', { drum: DRUM_KEYS[e.code], time: e.timeStamp });
        e.preventDefault();
        return;
      }
      const act = { Space: 'guard', KeyR: 'reset', Backspace: 'reset' }[e.code];
      if (act) {
        this.emit('action', { action: act, time: e.timeStamp });
        e.preventDefault();
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.emit('nav', 'menu');
        e.preventDefault();
      }
      return;
    }
    const nav = NAV_KEYS[e.code];
    if (nav) {
      // Let native controls (sliders) keep their own arrow handling.
      const t = e.target;
      if (t && t.tagName === 'INPUT' && t.type === 'range' && (nav === 'left' || nav === 'right')) return;
      this.emit('nav', nav);
      e.preventDefault();
    }
  }

  pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.padIndex === null) {
      for (const p of pads) if (p) { this.padIndex = p.index; break; }
    }
    return this.padIndex === null ? null : pads[this.padIndex];
  }

  rumble(ms = 60, strength = 0.5) {
    if (!this.vibration) return;
    const p = this.pad();
    const act = p && p.vibrationActuator;
    if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength }).catch(() => {});
  }

  /** Poll the controller once per frame. */
  poll() {
    const p = this.pad();
    if (!p) return;
    const now = performance.now();
    const pressed = p.buttons.map((b) => b.pressed || b.value > 0.5);
    if (!this.armed) {
      // Wait until every button is released so a held press does not fire.
      if (!pressed.some(Boolean)) this.armed = true;
      this.prev = pressed;
      return;
    }
    pressed.forEach((down, i) => {
      if (!down || this.prev[i]) return;
      this.setDevice('gamepad');
      this.emit('padButton', i);
      if (this.mode === 'play') {
        if (PAD_DRUM[i]) this.emit('drum', { drum: PAD_DRUM[i], time: now });
        else if (i === PAD.A) this.emit('action', { action: 'guard', time: now });
        else if (i === PAD.Y) this.emit('action', { action: 'reset', time: now });
        else if (i === PAD.MENU || i === PAD.VIEW) this.emit('nav', 'menu');
      } else if (PAD_NAV[i]) {
        this.emit('nav', PAD_NAV[i]);
      }
    });
    this.prev = pressed;

    if (this.mode === 'menu') {
      const [x, y] = [p.axes[0] || 0, p.axes[1] || 0];
      let dir = null;
      if (Math.hypot(x, y) > DEAD) dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
      if (dir) {
        const t = now / 1000;
        if (dir !== this.stickDir) {
          this.stickDir = dir;
          this.stickNext = t + REPEAT_FIRST;
          this.setDevice('gamepad');
          this.emit('stick', dir);
          this.emit('nav', dir);
        } else if (t >= this.stickNext) {
          this.stickNext = t + REPEAT_NEXT;
          this.emit('nav', dir);
        }
      } else {
        this.stickDir = null;
      }
    }
  }
}
