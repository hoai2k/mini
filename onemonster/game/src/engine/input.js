// Input for one or two players from any device: Xbox controllers, the keyboard
// (whole, or split in two for versus), and touch (a virtual stick with Action
// and Sprint buttons, one set per player in versus). Polled once per frame.
//
// Menus read `nav()`: fresh presses from every device, so anyone can drive them.
// Play reads `player(slot).state()`: the small set of actions every chapter uses
// (move, action, sprint; see design.md, Controls), from the devices assigned to
// that slot. Solo assigns everything to slot 0; versus assigns a source to each.

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const DEAD = 0.22;
const dz = (v) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * ((Math.abs(v) - DEAD) / (1 - DEAD)));

// Keyboard sets. 'kb' is the whole keyboard (solo); 'kb1' and 'kb2' split it.
const KEYSETS = {
  kb1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], action: ['Space', 'KeyF'], sprint: ['ShiftLeft', 'KeyQ'] },
  kb2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], action: ['Enter', 'NumpadEnter', 'Slash'], sprint: ['ShiftRight', 'Period', 'Numpad0'] },
};
KEYSETS.kb = Object.fromEntries(Object.keys(KEYSETS.kb1).map((k) => [k, [...KEYSETS.kb1[k], ...KEYSETS.kb2[k]]]));

const NAV_KEYS = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  confirm: ['Space', 'Enter', 'NumpadEnter'], back: ['Escape', 'Backspace'], pause: ['Escape', 'KeyP'],
};

export function createInput(target) {
  const keys = new Set();
  const pressed = new Set();
  const released = new Set();
  const pads = new Map(); // gamepad index -> { prev, now, axes, held }
  let kind = 'keyboard';
  const kindListeners = [];
  const padListeners = [];

  // Touch: one virtual control set per zone. zone 0 = whole screen (solo) or
  // the left half (versus player 1); zone 1 = right half (versus player 2).
  let touchZones = 1;
  let mapPointer = (cx, cy) => [cx, cy];
  let viewW = 1920;
  const touches = new Map(); // pointerId -> { zone, role: 'stick'|'action'|'sprint', x0, y0, x, y }
  const touchState = [newTouch(), newTouch()];
  function newTouch() {
    return { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false, used: false, stick: null };
  }
  // Button places in logical units, per zone layout (read by the HUD to draw them).
  function buttonsFor(zone) {
    const W = viewW;
    const right = touchZones === 1 ? W : zone === 0 ? W / 2 : W;
    return {
      action: { x: right - 150, y: 900, r: 92 },
      sprint: { x: right - 330, y: 960, r: 70 },
    };
  }

  const setKind = (k) => {
    if (k === kind) return;
    kind = k;
    for (const fn of kindListeners) fn(k);
  };

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && e.target === document.body) e.preventDefault();
    keys.add(e.code);
    pressed.add(e.code);
    setKind('keyboard');
  });
  addEventListener('keyup', (e) => {
    keys.delete(e.code);
    released.add(e.code);
  });
  addEventListener('blur', () => {
    keys.clear();
    touches.clear();
  });

  if (target) {
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return; // the mouse drives the DOM menus only
      setKind('touch');
      const [x, y] = mapPointer(e.clientX, e.clientY);
      const zone = touchZones === 2 && x > viewW / 2 ? 1 : 0;
      const b = buttonsFor(zone);
      let role = 'stick';
      if (Math.hypot(x - b.action.x, y - b.action.y) < b.action.r * 1.25) role = 'action';
      else if (Math.hypot(x - b.sprint.x, y - b.sprint.y) < b.sprint.r * 1.3) role = 'sprint';
      touches.set(e.pointerId, { zone, role, x0: x, y0: y, x, y });
      const t = touchState[zone];
      t.used = true;
      if (role === 'action') { t.action = true; t.actionPressed = true; }
      try { target.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      e.preventDefault();
    });
    target.addEventListener('pointermove', (e) => {
      const tc = touches.get(e.pointerId);
      if (!tc) return;
      const [x, y] = mapPointer(e.clientX, e.clientY);
      tc.x = x;
      tc.y = y;
    });
    const up = (e) => {
      const tc = touches.get(e.pointerId);
      if (!tc) return;
      touches.delete(e.pointerId);
      if (tc.role === 'action') touchState[tc.zone].actionReleased = true;
    };
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  function refreshTouch() {
    for (let z = 0; z < 2; z++) {
      const t = touchState[z];
      t.x = 0; t.y = 0; t.sprint = false; t.stick = null;
      let action = false;
      for (const tc of touches.values()) {
        if (tc.zone !== z) continue;
        if (tc.role === 'action') action = true;
        else if (tc.role === 'sprint') t.sprint = true;
        else {
          const dx = tc.x - tc.x0;
          const dy = tc.y - tc.y0;
          const m = Math.hypot(dx, dy);
          const k = Math.min(1, m / 110);
          if (m > 12) { t.x = (dx / m) * k; t.y = (dy / m) * k; }
          t.stick = { x0: tc.x0, y0: tc.y0, x: tc.x, y: tc.y };
        }
      }
      t.action = action;
    }
  }

  const any = (codes, set) => codes.some((c) => set.has(c));
  const padPressed = (p, b) => !p.held.has(b) && p.now[b] > 0.5 && !(p.prev[b] > 0.5);
  const padDown = (p, b) => !p.held.has(b) && p.now[b] > 0.5;
  const padReleased = (p, b) => !(p.now[b] > 0.5) && p.prev[b] > 0.5;

  // A source is 'all' | 'kb' | 'kb1' | 'kb2' | 'pad:<index>' | 'touch:<zone>'.
  function stateOf(sources) {
    let x = 0, y = 0, action = false, actionPressed = false, actionReleased = false, sprint = false;
    let usedKind = null;
    const all = sources.includes('all');
    const kbSets = all ? ['kb'] : sources.filter((s) => s.startsWith('kb'));
    for (const name of kbSets) {
      const K = KEYSETS[name];
      const kx = (any(K.right, keys) ? 1 : 0) - (any(K.left, keys) ? 1 : 0);
      const ky = (any(K.down, keys) ? 1 : 0) - (any(K.up, keys) ? 1 : 0);
      if (kx || ky) { x = kx; y = ky; usedKind = 'keyboard'; }
      if (any(K.action, keys)) action = true;
      if (any(K.action, pressed)) actionPressed = true;
      if (any(K.action, released)) actionReleased = true;
      if (any(K.sprint, keys)) sprint = true;
    }
    for (const [i, p] of pads) {
      if (!all && !sources.includes('pad:' + i)) continue;
      let ax = dz(p.axes[0] || 0);
      let ay = dz(p.axes[1] || 0);
      if (padDown(p, BTN.LEFT)) ax = -1;
      if (padDown(p, BTN.RIGHT)) ax = 1;
      if (padDown(p, BTN.UP)) ay = -1;
      if (padDown(p, BTN.DOWN)) ay = 1;
      if (Math.hypot(ax, ay) > Math.hypot(x, y)) { x = ax; y = ay; usedKind = 'controller'; }
      if (padDown(p, BTN.A) || padDown(p, BTN.RT)) action = true;
      if (padPressed(p, BTN.A) || padPressed(p, BTN.RT)) actionPressed = true;
      if (padReleased(p, BTN.A) || padReleased(p, BTN.RT)) actionReleased = true;
      if (padDown(p, BTN.B) || padDown(p, BTN.LT) || padDown(p, BTN.RB) || padDown(p, BTN.LB)) sprint = true;
    }
    for (let z = 0; z < 2; z++) {
      if (!all && !sources.includes('touch:' + z)) continue;
      const t = touchState[z];
      if (Math.hypot(t.x, t.y) > Math.hypot(x, y)) { x = t.x; y = t.y; usedKind = 'touch'; }
      if (t.action) action = true;
      if (t.actionPressed) actionPressed = true;
      if (t.actionReleased) actionReleased = true;
      if (t.sprint) sprint = true;
    }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, action, actionPressed, actionReleased, sprint, kind: usedKind };
  }

  const slots = [['all'], []];

  const api = {
    get kind() { return kind; },
    onKind(fn) { kindListeners.push(fn); },
    onPads(fn) { padListeners.push(fn); },
    setPointerMap(fn, w) { mapPointer = fn; viewW = w || viewW; },
    setTouchZones(n) { touchZones = n; touches.clear(); },
    touchZones: () => touchZones,
    touchButtons: buttonsFor,
    touchSticks: () => touchState.map((t) => t.stick),
    touchUsed: (z) => touchState[z].used,
    pads: () => [...pads.keys()],
    // Assign the devices a player slot reads: ['all'] for solo.
    assign(slot, sources) { slots[slot] = sources; },
    sources: (slot) => slots[slot],
    // Is the device that owns this slot still connected? (controllers only)
    slotConnected(slot) {
      const p = slots[slot].find((s) => s.startsWith('pad:'));
      return !p || pads.has(Number(p.slice(4)));
    },
    poll() {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      const seen = new Set();
      let changed = false;
      for (const gp of list) {
        if (!gp || !gp.connected) continue;
        seen.add(gp.index);
        let p = pads.get(gp.index);
        if (!p) {
          p = { prev: [], now: [], axes: [], held: new Set() };
          gp.buttons.forEach((b, i) => b.pressed && p.held.add(i));
          pads.set(gp.index, p);
          changed = true;
        }
        p.prev = p.now;
        p.now = gp.buttons.map((b) => (b.pressed ? Math.max(b.value, 0.6) : b.value));
        p.axes = gp.axes.slice();
        for (const i of [...p.held]) if (!gp.buttons[i]?.pressed) p.held.delete(i);
        if (p.now.some((v, i) => v > 0.5 && !(p.prev[i] > 0.5)) || p.axes.slice(0, 2).some((a) => Math.abs(a) > 0.5)) setKind('controller');
      }
      for (const i of [...pads.keys()]) if (!seen.has(i)) { pads.delete(i); changed = true; }
      if (changed) for (const fn of padListeners) fn();
      refreshTouch();
    },
    endFrame() {
      pressed.clear();
      released.clear();
      for (const t of touchState) { t.actionPressed = false; t.actionReleased = false; }
    },
    // Everything held now is stale until released (after a screen change).
    lockHeld() {
      for (const p of pads.values()) p.now.forEach((v, i) => v > 0.5 && p.held.add(i));
      pressed.clear();
      for (const t of touchState) t.actionPressed = false;
    },
    padPressed(b, index) {
      for (const [i, p] of pads) if ((index === undefined || i === index) && padPressed(p, b)) return true;
      return false;
    },
    padAnyPressed() {
      for (const p of pads.values()) if (p.now.some((v, b) => v > 0.5 && !(p.prev[b] > 0.5) && !p.held.has(b))) return true;
      return false;
    },
    keyPressed: (code) => pressed.has(code),
    stick() {
      let x = 0, y = 0;
      for (const p of pads.values()) {
        const ax = dz(p.axes[0] || 0), ay = dz(p.axes[1] || 0);
        if (Math.abs(ax) > Math.abs(x)) x = ax;
        if (Math.abs(ay) > Math.abs(y)) y = ay;
      }
      return [x, y];
    },
    nav() {
      const pad = (b) => api.padPressed(b);
      return {
        up: any(NAV_KEYS.up, pressed) || pad(BTN.UP),
        down: any(NAV_KEYS.down, pressed) || pad(BTN.DOWN),
        left: any(NAV_KEYS.left, pressed) || pad(BTN.LEFT),
        right: any(NAV_KEYS.right, pressed) || pad(BTN.RIGHT),
        confirm: any(NAV_KEYS.confirm, pressed) || pad(BTN.A),
        back: any(NAV_KEYS.back, pressed) || pad(BTN.B),
        pause: any(NAV_KEYS.pause, pressed) || pad(BTN.MENU) || pad(BTN.VIEW),
        start: pad(BTN.MENU),
        stick: api.stick(),
      };
    },
    player(slot) {
      return { state: () => stateOf(slots[slot]) };
    },
  };
  return api;
}
