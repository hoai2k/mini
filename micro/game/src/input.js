// Menu input for the shell: every connected controller (any joined player
// can drive the menus), plus the keyboard and pointer. Directions repeat
// after a delay; buttons held when a pad appears, or when lockHeld() is
// called, count only once released, so a held button never fires twice.
//
// Actions: up down left right a b x y start view, and `any` (a fresh press
// of any controller button, for the title screen).

const DEAD = 0.5;
const REPEAT_DELAY = 0.38, REPEAT_RATE = 0.11;
const NAMES = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 8: 'view', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

export function createInput() {
  const pads = new Map(); // index -> { prev: bool[], locked: Set }
  const queue = [];
  const dirHold = { up: 0, down: 0, left: 0, right: 0 };
  let lastKind = 'keyboard';
  const listeners = { connect: [], disconnect: [] };

  addEventListener('gamepadconnected', (e) => { lastKind = 'controller'; listeners.connect.forEach((f) => f(e.gamepad)); });
  addEventListener('gamepaddisconnected', (e) => { pads.delete(e.gamepad.index); listeners.disconnect.forEach((f) => f(e.gamepad)); });

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Enter: 'a', NumpadEnter: 'a', Space: 'a', Backspace: 'b', Escape: 'escape', Tab: 'view', KeyP: 'start',
  };
  addEventListener('keydown', (e) => {
    const act = KEYMAP[e.code];
    lastKind = 'keyboard';
    if (!act) { queue.push({ act: 'key', code: e.code, source: 'keyboard' }); return; }
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Backspace') e.preventDefault();
    // Space and Enter on a focused <button> would click it as well: let the shell decide.
    if ((act === 'a') && document.activeElement && document.activeElement.tagName === 'BUTTON') e.preventDefault();
    queue.push({ act, source: 'keyboard', repeat: e.repeat });
  });

  function list() {
    const out = [];
    for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected) out.push(g);
    return out;
  }

  const api = {
    /** Call once a frame; returns this frame's actions [{act, source, pad}]. */
    poll(dt) {
      const acts = queue.splice(0);
      const dirs = { up: false, down: false, left: false, right: false };
      for (const g of list()) {
        let st = pads.get(g.index);
        const now = g.buttons.map((b) => b.pressed || b.value > 0.5);
        if (!st) { st = { prev: now.slice(), locked: new Set() }; pads.set(g.index, st); }
        now.forEach((on, i) => {
          if (!on) st.locked.delete(i);
          if (on && !st.prev[i] && !st.locked.has(i)) {
            lastKind = 'controller';
            acts.push({ act: 'any', button: i, source: 'pad', pad: g.index });
            const n = NAMES[i];
            if (n && !['up', 'down', 'left', 'right'].includes(n)) acts.push({ act: n, source: 'pad', pad: g.index });
          }
        });
        st.prev = now;
        const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        if (Math.abs(ax) > DEAD || Math.abs(ay) > DEAD) lastKind = 'controller';
        dirs.up ||= now[12] || ay < -DEAD;
        dirs.down ||= now[13] || ay > DEAD;
        dirs.left ||= now[14] || ax < -DEAD;
        dirs.right ||= now[15] || ax > DEAD;
      }
      for (const d of Object.keys(dirs)) {
        if (!dirs[d]) { dirHold[d] = 0; continue; }
        const t0 = dirHold[d];
        dirHold[d] += dt;
        if (t0 === 0) acts.push({ act: d, source: 'pad' });
        else if (t0 >= REPEAT_DELAY && Math.floor((t0 - REPEAT_DELAY) / REPEAT_RATE) !== Math.floor((dirHold[d] - REPEAT_DELAY) / REPEAT_RATE)) acts.push({ act: d, source: 'pad', repeat: true });
      }
      return acts;
    },
    /** Ignore every controller button held right now until it is released. */
    lockHeld() {
      for (const g of list()) {
        const st = pads.get(g.index) || { prev: [], locked: new Set() };
        g.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) st.locked.add(i); });
        st.prev = g.buttons.map((b) => b.pressed || b.value > 0.5);
        pads.set(g.index, st);
      }
      for (const d of Object.keys(dirHold)) dirHold[d] = 99;
    },
    /** True while any controller button is down. */
    anyHeld() { return list().some((g) => g.buttons.some((b) => b.pressed || b.value > 0.5)); },
    /** Connected controllers. */
    get pads() { return list(); },
    get controller() { return list().length > 0; },
    get lastKind() { return lastKind; },
    on(ev, fn) { listeners[ev].push(fn); },
  };
  return api;
}
