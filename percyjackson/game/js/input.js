// Unified input: keyboard+mouse, up to four gamepads and touch. Each local
// player is bound to one device; per-frame state gives a move vector, an aim
// (mouse point, right stick or auto-aim) and edge-triggered buttons.
import { isMobile } from './util.js';
import { padFrame, keyFrame } from './padmap.js';
import { settings } from './settings.js';

const ACTIONS = ['attack', 'ranged', 'dodge', 't1', 't2', 't3', 'domain', 'interact', 'heal', 'map', 'pause', 'rotL', 'rotR', 'art1', 'art2', 'inv', 'sight', 'swap', 'jump', 'trail', 'slam', 'root', 'quest', 'skills'];
// The keyboard-and-mouse layout is in padmap.js too (keyFrame).
// The Xbox controller layout (after Minecraft Dungeons II) is in padmap.js.

function blank() { const o = {}; for (const a of ACTIONS) o[a] = false; return o; }

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0, left: false, right: false, moved: false, down: new Set() };
    this.wheel = 0;
    this.pinch = 0;
    this.touch = { stick: null, stickVec: { x: 0, y: 0 }, buttons: blank(), active: isMobile };
    this.prev = new Map();         // device -> previous held map
    this.state = new Map();        // device -> current state
    this.lastDevice = isMobile ? 'touch' : 'kbm';
    this.onPadJoin = null;
    this.holds = new Map();       // device -> 'menu' | 'latch' (see hold)
    this.edges = new Map();       // device -> this frame's menu presses (menuFrame)
    this.bindKeyboard();
    this.bindTouchPinch();
  }
  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      this.keys.add(e.code); this.lastDevice = 'kbm'; this.kbmActivity = performance.now();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; this.mouse.down.clear(); });
    const c = this.canvas;
    c.addEventListener('mousemove', (e) => this.setMouse(e));
    window.addEventListener('mousemove', (e) => this.setMouse(e));
    c.addEventListener('mousedown', (e) => { this.setMouse(e); if (e.button === 0) this.mouse.left = true; if (e.button === 2) this.mouse.right = true; this.mouse.down.add(e.button); if (e.button === 1 || e.button > 2) e.preventDefault(); this.lastDevice = 'kbm'; this.kbmActivity = performance.now(); });
    c.addEventListener('auxclick', (e) => e.preventDefault());   // (Mouse 4 / 5 mustn't navigate back or forward)
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; this.mouse.down.delete(e.button); if (e.button > 2) e.preventDefault(); });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.wheel += Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60 + 0.5); }, { passive: false });
  }
  setMouse(e) {
    this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    this.mouse.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    this.mouse.moved = true;
  }
  bindTouchPinch() {
    let startD = 0;
    this.canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 2) startD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && startD) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.pinch += (startD - d) / 25; startD = d;
      }
    }, { passive: true });
  }
  pads() { return navigator.getGamepads ? [...navigator.getGamepads()].filter((p) => p && p.connected) : []; }
  padById(idx) { const all = navigator.getGamepads ? navigator.getGamepads() : []; return all[idx] || null; }

  // Poll once per frame.
  poll() {
    // keyboard + mouse
    const kf = keyFrame(this.keys, this.mouse.down, (this.kbSt ??= {}), performance.now() / 1000, { interact: this.nearInteract?.has('kbm') });
    const kb = blank(); Object.assign(kb, kf.held);
    this.setState('kbm', { move: kf.move, aimStick: null, mouse: true, held: kb, dodgeToAim: kf.dodgeToAim });
    // gamepads
    const connected = this.pads();
    const connectedIds = new Set(connected.map((p) => 'pad' + p.index));
    for (const [id] of this.state) {
      if (id.startsWith('pad') && !connectedIds.has(id)) {
        this.setState(id, { move: { x: 0, y: 0 }, aimStick: null, mouse: false, held: blank() });
        if (this._padPrev) delete this._padPrev[id];
      }
    }
    if (this.lastDevice.startsWith('pad') && !connectedIds.has(this.lastDevice)) this.lastDevice = 'kbm';
    for (const p of connected) {
      const id = 'pad' + p.index;
      const st = (this.padSt ??= {})[id] ??= {};
      const f = padFrame(p, st, performance.now() / 1000, { interact: this.nearInteract?.has(id), stick: settings.rightStick === 'aim' || this.aimOnly ? 'aim' : 'dodge' });
      const held = blank(); Object.assign(held, f.held);
      const move = f.move;
      this.setState(id, { move, aimStick: f.aimStick, dodgeDir: f.dodgeDir, mouse: false, held });
      if (Object.values(held).some(Boolean) || move.x || move.y) this.lastDevice = id;
    }
    // touch
    this.setState('touch', { move: { ...this.touch.stickVec }, aimStick: null, mouse: false, held: { ...this.touch.buttons }, auto: true });
    this.menuFrame();
  }
  // AI companions drive their hero through a virtual device with the same
  // shape as a controller: { move (world-space via worldMove), held }.
  setVirtual(dev, { worldMove = null, held = {} } = {}) {
    const full = blank(); for (const k in held) if (held[k]) full[k] = true;
    this.setState(dev, { move: { x: 0, y: 0 }, worldMove, aimStick: null, mouse: false, held: full, virtual: true });
  }
  setState(dev, s) {
    // a held device (its player's own menu is open, or was just closed with a
    // button still down): its hero gets nothing, so it stands still and
    // nothing fires when the menu closes (the B that closed it never dodges)
    const hold = this.holds.get(dev);
    if (hold && !s.virtual) {
      const busy = Object.values(s.held).some(Boolean) || s.move.x || s.move.y;
      if (hold === 'latch' && !busy) this.holds.delete(dev);
      else s = { move: { x: 0, y: 0 }, aimStick: null, mouse: false, held: blank(), menuHeld: true };
    }
    const prev = this.state.get(dev);
    const prevHeld = prev ? prev.held : blank();
    s.pressed = {}; s.released = {};
    for (const a of ACTIONS) { s.pressed[a] = s.held[a] && !prevHeld[a]; s.released[a] = !s.held[a] && prevHeld[a]; }
    this.state.set(dev, s);
  }
  // Hold a device's actions (on: its player's menu is open) or let go (off:
  // they come back once every button and the stick are let go).
  hold(dev, on) {
    if (on) this.holds.set(dev, 'menu');
    else if (this.holds.get(dev) === 'menu') this.holds.set(dev, 'latch');
  }
  get(dev) { return this.state.get(dev) || { move: { x: 0, y: 0 }, held: blank(), pressed: blank(), released: blank() }; }
  // consumes wheel/pinch zoom
  takeZoom() { const z = this.wheel + this.pinch; this.wheel = 0; this.pinch = 0; return z; }

  // Menu presses, per device, on the frame they go down (worked out once a
  // frame in poll, so a menu opened this frame never sees the press that
  // opened it as new: Esc pauses, and only the next Esc resumes).
  //   up down left right · confirm (A, Enter) · back (B, Esc, Backspace) ·
  //   start (Menu) · view (View) · tabL tabR (LB RB, Q E, Shift+Tab Tab) ·
  //   x (X, the keys X and Delete) · lt rt (LT RT, the keys Z C) · esc (the Esc key)
  menuFrame() {
    const edges = new Map();
    const k = this.keys, pk = this._menuPrevKeys || new Set();
    const edge = (code) => k.has(code) && !pk.has(code);
    const shift = k.has('ShiftLeft') || k.has('ShiftRight');
    edges.set('kbm', {
      up: edge('ArrowUp') || edge('KeyW'), down: edge('ArrowDown') || edge('KeyS'), left: edge('ArrowLeft') || edge('KeyA'), right: edge('ArrowRight') || edge('KeyD'),
      confirm: edge('Enter'), back: edge('Escape') || edge('Backspace'), esc: edge('Escape'), start: false, view: false,
      tabL: edge('KeyQ') || (edge('Tab') && shift), tabR: edge('KeyE') || (edge('Tab') && !shift),
      x: edge('KeyX') || edge('Delete'), lt: edge('KeyZ'), rt: edge('KeyC'),
      inv: edge('KeyI'), map: edge('KeyM'), skills: edge('KeyK'),   // (a player's own menu: these jump to a tab, or close it)
    });
    this._menuPrevKeys = new Set(k);
    this._padPrev = this._padPrev || {};
    const down = (b) => !!b && (b.pressed || b.value > 0.5);
    for (const p of this.pads()) {
      const id = 'pad' + p.index; const prev = this._padPrev[id] || {};
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0, B = p.buttons;
      const cur = {
        up: !!B[12]?.pressed || ay < -0.6, down: !!B[13]?.pressed || ay > 0.6, left: !!B[14]?.pressed || ax < -0.6, right: !!B[15]?.pressed || ax > 0.6,
        confirm: !!B[0]?.pressed, back: !!B[1]?.pressed, start: !!B[9]?.pressed, view: !!B[8]?.pressed,
        tabL: !!B[4]?.pressed, tabR: !!B[5]?.pressed, x: !!B[2]?.pressed, lt: down(B[6]), rt: down(B[7]), dup: !!B[12]?.pressed,
      };
      const e = { esc: false };
      for (const key in cur) e[key] = cur[key] && !prev[key];
      edges.set(id, e);
      this._padPrev[id] = cur;
    }
    this.edges = edges;
  }
  // This frame's menu presses of one device (a player's own menu reads only its own).
  menuFor(dev) { return this.edges.get(dev) ?? {}; }
  // Forget this frame's presses (a menu just opened: the press that opened it doesn't act in it).
  swallowMenu(dev = null) { if (dev) this.edges.delete(dev); else this.edges = new Map(); }
  // Menu navigation merged across every device (edge-triggered), but `skip`'s.
  menu(skip = null) {
    const out = { up: false, down: false, left: false, right: false, confirm: false, back: false, start: false, tabL: false, tabR: false, x: false, lt: false, rt: false, device: null };
    const kb = this.edges.get('kbm') ?? {};
    out.keyboard = { up: !!kb.up, down: !!kb.down, left: !!kb.left, right: !!kb.right, confirm: !!kb.confirm, back: !!kb.back };
    for (const [id, e] of this.edges) {
      if (skip?.has(id)) continue;
      for (const key in out) if (key !== 'device' && key !== 'keyboard' && e[key]) { out[key] = true; if (key === 'confirm' || key === 'start') out.device = id; }
    }
    return out;
  }
  // Directions held now (for auto-repeat) on the devices `use(dev)` accepts.
  heldDirs(use = () => true) {
    const d = { up: false, down: false, left: false, right: false };
    const k = this.keys;
    if (use('kbm')) {
      if (k.has('ArrowUp') || k.has('KeyW')) d.up = true; if (k.has('ArrowDown') || k.has('KeyS')) d.down = true;
      if (k.has('ArrowLeft') || k.has('KeyA')) d.left = true; if (k.has('ArrowRight') || k.has('KeyD')) d.right = true;
    }
    for (const p of this.pads()) {
      if (!use('pad' + p.index)) continue;
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      if (p.buttons[12]?.pressed || ay < -0.6) d.up = true; if (p.buttons[13]?.pressed || ay > 0.6) d.down = true;
      if (p.buttons[14]?.pressed || ax < -0.6) d.left = true; if (p.buttons[15]?.pressed || ax > 0.6) d.right = true;
    }
    return d;
  }
}
