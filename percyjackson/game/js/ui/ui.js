// Screen manager with spatial focus navigation so every menu works with a
// mouse, touch, keyboard (arrows/Enter/Esc) or gamepad (d-pad/stick/A/B).
import { demigodText, greekOn, GREEK } from './greekText.js';
import { showFor } from './greekTiming.js';
import { t as tx, applyText } from '../text_config.js';
import { pickTarget, cycleTab } from './navmath.js';

// The page's own text (index.html): fills the data-t elements, the tab title and the description.
export function applyPageText() {
  try {
    applyText(document);
    document.title = tx('page.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', tx('page.description'));
  } catch (e) { console.warn('page text', e); }
}

const DIRS = ['up', 'down', 'left', 'right'];
// A stack of screens with one focus, inside one root element: the shared
// screens (UI, below) and each player's own menu (playerMenu.js) are one each.
// Focus moves spatially (navmath.js pickTarget) and wraps: up on the top item
// is the bottom item, down on the bottom the top, and in a grid
// ([data-navgrid]) within its column or row. A screen's tab bar
// ([data-tabbar], tabs marked .on or aria-selected) switches with LB / RB
// (Q / E, Tab), round and round.
export class FocusNav {
  constructor(game, root, { idPrefix = 'scr-' } = {}) {
    this.game = game;
    this.root = root;
    this.idPrefix = idPrefix;
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
    el.id = this.idPrefix + id;
    this.root.appendChild(el);
    const s = { id, el, build, opts };
    this.stack.push(s);
    build(el, s);
    this.autoFocus(s);
    return s;
  }
  // The element of the open screen `id` (null when it isn't open).
  screen(id) { return this.stack.find((x) => x.id === id)?.el ?? null; }
  refresh(id) {
    const s = this.stack.find((x) => x.id === id); if (!s) return;
    const idx = this.focusables(s).indexOf(this.focusEl);
    const scroll = [...s.el.querySelectorAll('.panel, [data-scroll]')].map((p) => p.scrollTop);
    s.el.innerHTML = ''; s.build(s.el, s);
    [...s.el.querySelectorAll('.panel, [data-scroll]')].forEach((p, i) => { p.scrollTop = scroll[i] ?? 0; });
    const f = this.focusables(s);
    this.setFocus(f[Math.min(Math.max(0, idx), f.length - 1)], { scroll: false });   // (the scroll was put back as it was)
  }
  close(id) {
    const i = this.stack.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [s] = this.stack.splice(i, 1);
    s.el.remove(); s.opts.onClose?.();
    const top = this.top();
    if (top) { const f = top.savedFocus; top.savedFocus = null; if (f && f.isConnected && this.focusables(top).includes(f)) this.setFocus(f); else this.autoFocus(top); }
    else if (this.focusEl && !this.focusEl.isConnected) this.focusEl = null;
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
  // scroll: bring it into view inside whatever scrolls round it (false: leave the scroll alone)
  setFocus(el, { scroll = true } = {}) {
    if (this.focusEl) this.focusEl.classList.remove('focus'), this.focusEl.closest('.setting')?.classList.remove('focus');
    this.focusEl = el || null;
    if (el) {
      el.classList.add('focus');
      el.closest('.setting')?.classList.add('focus');
      if (scroll) el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      el.dispatchEvent(new CustomEvent('navfocus'));
    }
  }
  move(dx, dy) {
    const s = this.top(); if (!s) return;
    const f = this.focusables(s); if (!f.length) return;
    if (!this.focusEl || !f.includes(this.focusEl)) return this.setFocus(f[0]);
    const grids = new Map();
    const rects = f.map((e) => {
      const r = e.getBoundingClientRect(), g = e.closest('[data-navgrid]');
      if (g && !grids.has(g)) grids.set(g, grids.size);
      return { left: r.left, top: r.top, width: r.width, height: r.height, grid: g ? grids.get(g) : null };
    });
    const i = pickTarget(rects[f.indexOf(this.focusEl)], rects, dx, dy);
    if (i >= 0 && f[i] !== this.focusEl) { this.setFocus(f[i]); this.game.audio?.ui('move'); }
  }
  // The screen's tab bar: the next tab, round and round (dir +1 or -1).
  cycleTabs(s, dir) {
    const bar = s.el.querySelector('[data-tabbar]'); if (!bar) return false;
    const tabs = [...bar.querySelectorAll('[role=tab], .tab')].filter((b) => !b.disabled);
    const cur = tabs.find((b) => b.classList.contains('on') || b.getAttribute('aria-selected') === 'true');
    const next = cycleTab(tabs, cur, dir);
    if (!next || next === cur) return false;
    const k = next.dataset.k ?? null;
    next.click(); this.game.audio?.ui('move');
    // (the click rebuilt the screen: focus the new tab, as a press on it would)
    const again = k ? s.el.querySelector(`[data-tabbar] [data-k="${k}"]`) : null;
    if (again && this.focusables(s).includes(again)) this.setFocus(again);
    return true;
  }
  // A held direction repeats after a pause, so one push never skips items.
  repeat(m, held) {
    const now = performance.now();
    for (const dir of DIRS) {
      if (m[dir]) this.rep[dir] = now + 380;
      else if (held[dir]) { if (this.rep[dir] && now >= this.rep[dir]) { m[dir] = true; this.rep[dir] = now + 110; } }
      else delete this.rep[dir];
    }
  }
  // One frame of navigation: m the menu presses (input.js menu / menuFor),
  // held the directions held down (for auto-repeat).
  step(m, held) {
    const s = this.top(); if (!s || s.opts.passive) return;
    this.repeat(m, held);
    // A screen may claim device-specific input before it reaches shared focus.
    // Character select uses this so one controller cannot click another
    // player's focused button while joining or choosing a hero.
    s.opts.onNav?.(m);
    if (this.top() !== s) return;
    const el = this.focusEl;
    const isRange = el && el.tagName === 'INPUT' && el.type === 'range';
    const isSelect = el && el.tagName === 'SELECT';
    if ((m.tabL || m.tabR) && this.cycleTabs(s, m.tabR ? 1 : -1)) return;
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
    if (m.back && s.opts.onBack && this.top() === s) { this.game.audio?.ui('back'); s.opts.onBack(); }
  }
}

// The shared screens (title, pause, settings, results, camp stations, ...):
// every device drives them.
export class UI extends FocusNav {
  constructor(game) {
    applyPageText();
    super(game, document.getElementById('screens'));
  }
  // Directions currently held on any pad or the keyboard (for auto-repeat).
  heldDirs() { return this.game.input.heldDirs(); }
  // Called every frame while a screen is open.
  update() { this.step(this.game.input.menu(), this.heldDirs()); }
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

// A message over the play area. cls:
//   ''       a small message (plain English)
//   'hint'   a how-to-play hint: plain English, on screen a little longer
//   'big'    a big message (plain English: read it at once)
//   'title'  a chapter or place title: Greek letters, held, that settle into English
//   'boss'   a boss's name (with 'title'): the same, a little quicker
//   'domain' a godly power's name: a short Greek moment, then English
export function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  document.getElementById('toast-layer').appendChild(el);
  const timing = /boss/.test(cls) ? GREEK.boss : /title/.test(cls) ? GREEK.title : /domain/.test(cls) ? GREEK.power : null;
  let secs = /hint/.test(cls) ? 4.4 : 2.7;
  if (timing) {
    demigodText(el, text, { timing });
    secs = greekOn() ? showFor(timing) + 0.5 : Math.max(2.7, (timing.read ?? 2.4) + 1);
    el.style.animationDuration = secs + 's';
  } else {
    el.textContent = text;
    if (secs !== 2.7) el.style.animationDuration = secs + 's';
  }
  setTimeout(() => el.remove(), secs * 1000 + 100);
}

// A yes/no confirmation. Focus starts on "No" so a stray press never destroys progress.
export function confirmDialog(game, { title = tx('common.areYouSure'), text = '', yes = tx('common.yes'), no = tx('common.no'), danger = false, onYes, onNo, ui = game.ui } = {}) {   // ui: a player's own menu (playerMenu.js) opens it there
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
