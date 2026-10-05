// Keyboard, mouse, touch and Xbox-controller input. Drum hits carry a timestamp
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
// Drum Practice: LB and RB take strokes away and add them, Y and the d-pad's
// up and down change the kit (they are drums elsewhere).
const PAD_PRACTICE = { [PAD.LB]: 'fewer', [PAD.RB]: 'more', [PAD.Y]: 'kit', [PAD.UP]: 'kitPrev', [PAD.DOWN]: 'kit' };
const KEY_PRACTICE = {
  Minus: 'fewer', NumpadSubtract: 'fewer', BracketLeft: 'fewer',
  Equal: 'more', NumpadAdd: 'more', BracketRight: 'more',
  ArrowUp: 'kitPrev', ArrowDown: 'kit',
};
const DEAD = 0.5;
const REPEAT_FIRST = 0.38;
const REPEAT_NEXT = 0.14;
const SWIPE = 110; // logical pixels a finger must travel sideways to swipe

export class Input {
  constructor(target) {
    this.handlers = { drum: [], nav: [], device: [], padButton: [], stick: [], action: [], touch: [], swipe: [] };
    this.mode = 'menu'; // 'menu' | 'play'
    this.practice = false; // Drum Practice: the extra controls above
    this.device = 'keyboard';
    this.padIndex = null;
    this.prev = [];
    this.stickDir = null;
    this.stickNext = 0;
    this.armed = false; // ignore buttons held when a gamepad first appears
    this.vibration = true;

    this.keysDown = new Set(); // for buttons that act while held (the Oath's wind)
    window.addEventListener('keydown', (e) => {
      this.keysDown.add(e.code);
      this.onKey(e);
    });
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
    window.addEventListener('blur', () => this.keysDown.clear());
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
    // Mouse: the left and right halves of the canvas are the two drummers, and
    // clicking the bronze drum raises the guard.
    target.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'play' || e.pointerType === 'touch' || e.pointerType === 'pen') return;
      const r = target.getBoundingClientRect();
      this.setDevice('pointer');
      const dx = ((e.clientX - r.left) / r.width - 0.5) * 1280;
      const dy = ((e.clientY - r.top) / r.height - 628 / 720) * 720;
      if (Math.hypot(dx, dy) < 72) {
        this.emit('action', { action: 'guard', time: e.timeStamp });
        e.preventDefault();
        return;
      }
      const drum = e.clientX - r.left < r.width / 2 ? 'L' : 'R';
      this.emit('drum', { drum, time: e.timeStamp });
      e.preventDefault();
    });
    // Touch and pen: the game lays out a big drum and on-screen buttons, so
    // pass the point on in the canvas's 1280 x 720 coordinates. Listening on
    // the whole app lets the letterbox beside the canvas take thumb taps too.
    const app = target.parentElement || target;
    const logical = (e) => {
      const r = target.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 1280, y: ((e.clientY - r.top) / r.height) * 720 };
    };
    const fingers = new Map(); // pointerId -> where and when it landed
    app.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'play' || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
      this.setDevice('touch');
      const p = logical(e);
      fingers.set(e.pointerId, { ...p, time: e.timeStamp, swiped: false });
      this.emit('touch', { ...p, time: e.timeStamp });
      e.preventDefault();
    });
    // A quick sideways stroke of one finger is a swipe (the game uses it to
    // reset the rhythm when it starts on the drum or the dots).
    app.addEventListener('pointermove', (e) => {
      const f = fingers.get(e.pointerId);
      if (!f || f.swiped || this.mode !== 'play') return;
      const p = logical(e);
      const dx = p.x - f.x;
      const dy = p.y - f.y;
      if (e.timeStamp - f.time < 700 && Math.abs(dx) > SWIPE && Math.abs(dx) > 1.5 * Math.abs(dy)) {
        f.swiped = true;
        this.emit('swipe', { x0: f.x, y0: f.y, x: p.x, y: p.y, time: e.timeStamp });
      }
    });
    for (const type of ['pointerup', 'pointercancel']) app.addEventListener(type, (e) => fingers.delete(e.pointerId));
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
      if (this.practice && KEY_PRACTICE[e.code]) {
        this.emit('action', { action: KEY_PRACTICE[e.code], time: e.timeStamp });
        e.preventDefault();
        return;
      }
      // Space is the one shield-and-clear button (Enter goes on from a success screen).
      const act = { Space: 'guard', Enter: 'confirm', NumpadEnter: 'confirm' }[e.code];
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

  /** Whether A (Space) or Y (R) is held now: the Oath's breeze, one way or the other. */
  held(action) {
    const keys = action === 'guard' ? ['Space'] : ['KeyR', 'Backspace'];
    const button = action === 'guard' ? PAD.A : PAD.Y;
    return keys.some((k) => this.keysDown.has(k)) || !!this.prev[button];
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
    if (this.device === 'touch') {
      // Phones buzz for a duration only; keep taps short so fast rhythms stay crisp.
      if (navigator.vibrate) navigator.vibrate(Math.round(Math.min(ms, 40) * (0.5 + strength / 2)));
      return;
    }
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
        if (this.practice && PAD_PRACTICE[i]) this.emit('action', { action: PAD_PRACTICE[i], time: now });
        else if (PAD_DRUM[i]) this.emit('drum', { drum: PAD_DRUM[i], time: now });
        else if (i === PAD.A) this.emit('action', { action: 'guard', time: now });
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
