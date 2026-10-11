// Screen manager with spatial focus navigation so every menu works with a
// mouse, touch, keyboard (arrows/Enter/Esc) or gamepad (d-pad/stick/A/B).
import { demigodText } from './greekText.js';

const DIRS = ['up', 'down', 'left', 'right'];
export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screens');
    this.stack = [];        // open screens (top = active)
    this.focusEl = null;
    this.rep = {};          // held-direction auto-repeat timers
  }
  // Create and show a screen. build(el) fills it; opts.onBack when B/Esc.
  open(id, build, opts = {}) {
    this.close(id);
    const below = this.top(); if (below) below.savedFocus = this.focusEl;
    const el = document.createElement('section');
    el.className = 'screen' + (opts.dim ? ' dim' : '');
    el.id = 'scr-' + id;
    this.root.appendChild(el);
    const s = { id, el, build, opts };
    this.stack.push(s);
    build(el, s);
    this.autoFocus(s);
    return s;
  }
  refresh(id) {
    const s = this.stack.find((x) => x.id === id); if (!s) return;
    const idx = this.focusables(s).indexOf(this.focusEl);
    const scroll = [...s.el.querySelectorAll('.panel')].map((p) => p.scrollTop);
    s.el.innerHTML = ''; s.build(s.el, s);
    [...s.el.querySelectorAll('.panel')].forEach((p, i) => { p.scrollTop = scroll[i] ?? 0; });
    const f = this.focusables(s);
    this.setFocus(f[Math.min(Math.max(0, idx), f.length - 1)]);
  }
  close(id) {
    const i = this.stack.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [s] = this.stack.splice(i, 1);
    s.el.remove(); s.opts.onClose?.();
    const top = this.top();
    if (top) { const f = top.savedFocus; top.savedFocus = null; if (f && f.isConnected && this.focusables(top).includes(f)) this.setFocus(f); else this.autoFocus(top); }
  }
  closeAll() { while (this.stack.length) this.close(this.stack[this.stack.length - 1].id); }
  top() { return this.stack[this.stack.length - 1]; }
  isOpen(id) { return this.stack.some((s) => s.id === id); }
  get active() { return this.stack.length > 0 && this.stack.some((s) => !s.opts.passive); }
  focusables(s) { return [...s.el.querySelectorAll('button:not([disabled]), [data-nav], select, input')].filter((e) => e.offsetParent !== null && !e.closest('[data-nonav]')); }
  autoFocus(s) {
    const f = this.focusables(s);
    const pref = s.el.querySelector('[data-autofocus]') || f[0];
    this.setFocus(pref);
  }
  setFocus(el) {
    if (this.focusEl) this.focusEl.classList.remove('focus'), this.focusEl.closest('.setting')?.classList.remove('focus');
    this.focusEl = el || null;
    if (el) {
      el.classList.add('focus');
      el.closest('.setting')?.classList.add('focus');
      el.scrollIntoView?.({ block: 'nearest' });
      el.dispatchEvent(new CustomEvent('navfocus'));
    }
  }
  move(dx, dy) {
    const s = this.top(); if (!s) return;
    const f = this.focusables(s); if (!f.length) return;
    if (!this.focusEl || !f.includes(this.focusEl)) return this.setFocus(f[0]);
    const cur = this.focusEl.getBoundingClientRect();
    const cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
    let best = null, bestD = Infinity;
    for (const e of f) {
      if (e === this.focusEl) continue;
      const r = e.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const ddx = ex - cx, ddy = ey - cy;
      const along = ddx * dx + ddy * dy;
      if (along <= 4) continue;
      const perp = Math.abs(ddx * dy) + Math.abs(ddy * dx);
      const d = along + perp * 2.5;
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) { this.setFocus(best); this.game.audio?.ui('move'); }
  }
  // Directions currently held on any pad or the keyboard (for auto-repeat).
  heldDirs() {
    const d = { up: false, down: false, left: false, right: false };
    const k = this.game.input.keys;
    if (k.has('ArrowUp') || k.has('KeyW')) d.up = true; if (k.has('ArrowDown') || k.has('KeyS')) d.down = true;
    if (k.has('ArrowLeft') || k.has('KeyA')) d.left = true; if (k.has('ArrowRight') || k.has('KeyD')) d.right = true;
    for (const p of this.game.input.pads()) {
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      if (p.buttons[12]?.pressed || ay < -0.6) d.up = true; if (p.buttons[13]?.pressed || ay > 0.6) d.down = true;
      if (p.buttons[14]?.pressed || ax < -0.6) d.left = true; if (p.buttons[15]?.pressed || ax > 0.6) d.right = true;
    }
    return d;
  }
  // A held direction repeats after a pause, so one push never skips items.
  repeat(m) {
    const now = performance.now(), held = this.heldDirs();
    for (const dir of DIRS) {
      if (m[dir]) this.rep[dir] = now + 380;
      else if (held[dir]) { if (this.rep[dir] && now >= this.rep[dir]) { m[dir] = true; this.rep[dir] = now + 110; } }
      else delete this.rep[dir];
    }
  }
  // Called every frame while a screen is open.
  update() {
    const s = this.top(); if (!s || s.opts.passive) return;
    const m = this.game.input.menu();
    this.repeat(m);
    // A screen may claim device-specific input before it reaches shared focus.
    // Character select uses this so one controller cannot click another
    // player's focused button while joining or choosing a hero.
    s.opts.onNav?.(m);
    if (this.top() !== s) return;
    const el = this.focusEl;
    const isRange = el && el.tagName === 'INPUT' && el.type === 'range';
    const isSelect = el && el.tagName === 'SELECT';
    if (m.up) this.move(0, -1);
    if (m.down) this.move(0, 1);
    if ((m.left || m.right) && (isRange || isSelect)) {
      const dir = m.right ? 1 : -1;
      if (isRange) { el.value = String(Number(el.value) + dir * Number(el.step || 1)); }
      else { el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + dir)); }
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (m.left) this.move(-1, 0);
    else if (m.right) this.move(1, 0);
    if (m.confirm && el) {
      if (el.tagName === 'INPUT' && el.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change', { bubbles: true })); }
      else if (!isRange && !isSelect) { el.click(); }
      this.lastConfirmDevice = m.device;
    }
    if (m.back && s.opts.onBack) { this.game.audio?.ui('back'); s.opts.onBack(); }
  }
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  return el;
}

export function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  document.getElementById('toast-layer').appendChild(el);
  if (/big|domain/.test(cls)) demigodText(el, text); else el.textContent = text;
  setTimeout(() => el.remove(), cls.includes('domain') ? 3300 : 2700);
}

// A yes/no confirmation. Focus starts on "No" so a stray press never destroys progress.
export function confirmDialog(game, { title = 'Are you sure?', text = '', yes = 'Yes', no = 'No', danger = false, onYes, onNo } = {}) {
  const ui = game.ui;
  const close = () => ui.close('confirm');
  ui.open('confirm', (el) => {
    el.appendChild(h('div', { class: 'panel menu-col confirm', role: 'alertdialog', 'aria-label': title, style: 'max-width:min(440px,94vw);text-align:center' },
      h('h2', {}, title), text ? h('p', { class: 'hint', style: 'font-size:16px;margin:0 0 10px' }, text) : null,
      h('button', { class: 'btn', 'data-autofocus': true, onclick: () => { close(); onNo?.(); } }, no),
      h('button', { class: 'btn' + (danger ? ' danger' : ' primary'), onclick: () => { close(); onYes?.(); } }, yes)));
  }, { dim: true, onBack: () => { close(); onNo?.(); } });
}

// Snapshot of every connected pad: id -> { b: [pressed...], l, r, u, d, stick } so a screen can
// detect fresh presses itself (edges against its own previous snapshot).
export function padSnap(game) {
  const out = new Map();
  for (const p of game.input.pads()) {
    const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
    out.set('pad' + p.index, {
      b: p.buttons.map((x) => !!(x.pressed || x.value > 0.5)),
      l: !!p.buttons[14]?.pressed || ax < -0.6, r: !!p.buttons[15]?.pressed || ax > 0.6,
      u: !!p.buttons[12]?.pressed || ay < -0.6, d: !!p.buttons[13]?.pressed || ay > 0.6,
      stick: Math.hypot(ax, ay),
    });
  }
  return out;
}
