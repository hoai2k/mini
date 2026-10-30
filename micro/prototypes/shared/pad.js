// One player's controls: the first connected Xbox controller (standard
// mapping), with a keyboard fallback so every prototype also works without
// one. Poll once per frame before reading.
//
// Keyboard: left stick WASD, right stick arrow keys, A Space, B Shift,
// X E, Y R, LB Q, RB F, LT Z, RT X, View Tab, Menu Esc, LS click C,
// RS click V, d-pad 1 2 3 4 (up, down, left, right).

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const KEYS = {
  [BTN.A]: ['Space'], [BTN.B]: ['ShiftLeft', 'ShiftRight'], [BTN.X]: ['KeyE'], [BTN.Y]: ['KeyR'],
  [BTN.LB]: ['KeyQ'], [BTN.RB]: ['KeyF'], [BTN.LT]: ['KeyZ'], [BTN.RT]: ['KeyX'],
  [BTN.VIEW]: ['Tab'], [BTN.MENU]: ['Escape'], [BTN.LS]: ['KeyC'], [BTN.RS]: ['KeyV'],
  [BTN.UP]: ['Digit1'], [BTN.DOWN]: ['Digit2'], [BTN.LEFT]: ['Digit3'], [BTN.RIGHT]: ['Digit4'],
};

const DEAD = 0.14;

// Radial deadzone, rescaled so the stick still reaches 1, clamped to the unit circle.
function stick(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEAD) return { x: 0, y: 0, m: 0 };
  const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
  return { x: x * k, y: y * k, m: Math.min(1, m * k) };
}

export function createPad() {
  const keys = new Set();
  addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  let gp = null;
  let now = new Array(17).fill(0);
  let prev = now.slice();
  let axes = [0, 0, 0, 0];
  let kind = 'keyboard';

  const key = (codes) => codes.some((c) => keys.has(c));
  const kAxis = (neg, pos) => (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);

  const api = {
    BTN,
    /** 'controller' once a pad has been used, otherwise 'keyboard'. */
    get kind() { return kind; },
    get connected() { return !!gp; },
    poll() {
      gp = null;
      for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected) { gp = g; break; }
      prev = now;
      now = new Array(17).fill(0);
      axes = [0, 0, 0, 0];
      if (gp) {
        gp.buttons.forEach((b, i) => { if (i < 17) now[i] = b.pressed ? Math.max(b.value, 0.5) : b.value; });
        axes = [gp.axes[0] || 0, gp.axes[1] || 0, gp.axes[2] || 0, gp.axes[3] || 0];
        if (now.some((v) => v > 0.5) || axes.some((a) => Math.abs(a) > 0.4)) kind = 'controller';
      }
      for (const [b, codes] of Object.entries(KEYS)) if (key(codes)) { now[b] = 1; kind = 'keyboard'; }
      const kl = [kAxis('KeyA', 'KeyD'), kAxis('KeyW', 'KeyS')];
      const kr = [kAxis('ArrowLeft', 'ArrowRight'), kAxis('ArrowUp', 'ArrowDown')];
      if (kl[0] || kl[1]) { axes[0] = kl[0]; axes[1] = kl[1]; kind = 'keyboard'; }
      if (kr[0] || kr[1]) { axes[2] = kr[0]; axes[3] = kr[1]; kind = 'keyboard'; }
    },
    /** Left stick, deadzoned; y is +1 when pushed down (towards the player). */
    ls() { return stick(axes[0], axes[1]); },
    rs() { return stick(axes[2], axes[3]); },
    /** Analog trigger value 0..1. */
    lt() { return now[BTN.LT]; },
    rt() { return now[BTN.RT]; },
    value(b) { return now[b]; },
    down(b) { return now[b] > 0.5; },
    pressed(b) { return now[b] > 0.5 && !(prev[b] > 0.5); },
    released(b) { return !(now[b] > 0.5) && prev[b] > 0.5; },
    /** Rumble, where the browser supports it. Strengths 0..1, duration in ms. */
    rumble(ms, weak = 0.3, strong = 0.3) {
      const a = gp && gp.vibrationActuator;
      if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, weakMagnitude: weak, strongMagnitude: strong }).catch(() => {});
    },
  };
  return api;
}
