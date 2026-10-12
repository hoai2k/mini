// Unified input: keyboard+mouse, up to four gamepads and touch. Each local
// player is bound to one device; per-frame state gives a move vector, an aim
// (mouse point, right stick or auto-aim) and edge-triggered buttons.
import { isMobile } from './util.js';
import { padFrame, keyFrame } from './padmap.js';
import { settings } from './settings.js';

const ACTIONS = ['attack', 'ranged', 'dodge', 't1', 't2', 't3', 'domain', 'interact', 'heal', 'map', 'pause', 'rotL', 'rotR', 'art1', 'art2', 'inv', 'sight', 'swap', 'jump', 'trail', 'slam', 'root', 'quest'];
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
  }
  // AI companions drive their hero through a virtual device with the same
  // shape as a controller: { move (world-space via worldMove), held }.
  setVirtual(dev, { worldMove = null, held = {} } = {}) {
    const full = blank(); for (const k in held) if (held[k]) full[k] = true;
    this.setState(dev, { move: { x: 0, y: 0 }, worldMove, aimStick: null, mouse: false, held: full, virtual: true });
  }
  setState(dev, s) {
    const prev = this.state.get(dev);
    const prevHeld = prev ? prev.held : blank();
    s.pressed = {}; s.released = {};
    for (const a of ACTIONS) { s.pressed[a] = s.held[a] && !prevHeld[a]; s.released[a] = !s.held[a] && prevHeld[a]; }
    this.state.set(dev, s);
  }
  get(dev) { return this.state.get(dev) || { move: { x: 0, y: 0 }, held: blank(), pressed: blank(), released: blank() }; }
  // consumes wheel/pinch zoom
  takeZoom() { const z = this.wheel + this.pinch; this.wheel = 0; this.pinch = 0; return z; }

  // Menu navigation merged across every device (edge-triggered).
  menu() {
    const out = { up: false, down: false, left: false, right: false, confirm: false, back: false, start: false, device: null };
    const k = this.keys; const pk = this._menuPrevKeys || new Set();
    const edge = (code) => k.has(code) && !pk.has(code);
    if (edge('ArrowUp') || edge('KeyW')) out.up = true; if (edge('ArrowDown') || edge('KeyS')) out.down = true;
    if (edge('ArrowLeft') || edge('KeyA')) out.left = true; if (edge('ArrowRight') || edge('KeyD')) out.right = true;
    if (edge('Enter')) { out.confirm = true; out.device = 'kbm'; }
    if (edge('Escape') || edge('Backspace')) out.back = true;
    out.keyboard = { up: out.up, down: out.down, left: out.left, right: out.right, confirm: out.confirm, back: out.back };
    this._menuPrevKeys = new Set(k);
    this._padPrev = this._padPrev || {};
    for (const p of this.pads()) {
      const id = 'pad' + p.index; const prev = this._padPrev[id] || {};
      const cur = {
        up: p.buttons[12]?.pressed || (p.axes[1] ?? 0) < -0.6, down: p.buttons[13]?.pressed || (p.axes[1] ?? 0) > 0.6,
        left: p.buttons[14]?.pressed || (p.axes[0] ?? 0) < -0.6, right: p.buttons[15]?.pressed || (p.axes[0] ?? 0) > 0.6,
        confirm: p.buttons[0]?.pressed, back: p.buttons[1]?.pressed, start: p.buttons[9]?.pressed,
      };
      for (const key in cur) if (cur[key] && !prev[key]) { out[key] = true; if (key === 'confirm' || key === 'start') out.device = id; }
      this._padPrev[id] = cur;
    }
    return out;
  }
}
