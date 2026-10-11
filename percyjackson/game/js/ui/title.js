// Title screen (GAME_GUIDELINES.md): generated logo (magenta keyed out) or a
// text logo, "Press Start", and Instructions / Settings / Fullscreen at the
// bottom right. Idle: any fresh controller button starts. Moving the left
// stick (or arrows) enters utility navigation: A activates, B backs out,
// Menu/Start starts.
import { h, padSnap } from './ui.js';
import { openSettings } from './settingsScreen.js';
import { openInstructions } from './instructions.js';
import { openSelect } from './partySelect.js';
import { isMobile } from '../util.js';

const ICONS = {
  instructions: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 11h8M8 15h8M8 7h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  exitfs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// Logo: assets/logo.png is generated on flat magenta (#FF00FF); key it out at
// load time and trim the empty margin. Falls back to a drawn text logo.
function textLogo() {
  return h('div', { class: 'logo-text', 'aria-hidden': 'true' },
    h('span', { class: 'l1' }, 'HALF-BLOOD'), h('span', { class: 'key' }), h('span', { class: 'l2' }, 'QUESTS'));
}
export function keyMagenta(img, maxW = 1400) {
  const k = Math.min(1, maxW / img.naturalWidth);
  const w = Math.round(img.naturalWidth * k), hh = Math.round(img.naturalHeight * k);
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, hh);
  const id = ctx.getImageData(0, 0, w, hh), d = id.data;
  let x0 = w, y0 = hh, x1 = 0, y1 = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const m = Math.min(r, b) - g;                       // how magenta the pixel is
    let a = 1 - Math.min(1, Math.max(0, (m - 60) / 110));
    if (a < 1) {                                        // remove magenta spill from soft edges
      if (a <= 0.02) { d[i + 3] = 0; continue; }
      d[i] = Math.max(0, Math.min(255, (r - (1 - a) * 255) / a));
      d[i + 2] = Math.max(0, Math.min(255, (b - (1 - a) * 255) / a));
      d[i + 3] = Math.round(d[i + 3] * a);
    }
    if (d[i + 3] > 20) { const p = i / 4, x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  ctx.putImageData(id, 0, 0);
  if (x1 <= x0 || y1 <= y0) return c;
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
function makeLogo() {
  const wrap = h('h1', { class: 'logo-wrap', 'aria-label': 'Half-Blood Quests' });
  const fallback = () => wrap.replaceChildren(textLogo());
  const img = new Image();
  img.onload = () => { try { const c = keyMagenta(img); c.className = 'logo-img'; c.setAttribute('aria-hidden', 'true'); wrap.replaceChildren(c); } catch (e) { fallback(); } };
  img.onerror = fallback;
  img.src = 'assets/logo-web.png';
  return wrap;
}

export function openTitle(game) {
  const ui = game.ui;
  let mode = 'idle';                 // 'idle' (any button starts) | 'nav' (utility navigation)
  let prev = padSnap(game);          // buttons held while the screen appears must not start the game
  let lastTick = performance.now();
  let starting = false;
  let root = null;

  const setMode = (m) => { mode = m; root?.classList.toggle('nav', m === 'nav'); const hint = root?.querySelector('.title-hint'); if (hint) hint.textContent = hintText(); };
  const hintText = () => (mode === 'nav' ? 'A select · B back · Menu start' : (isMobile ? 'Tap Press Start' : 'Move left stick for options'));
  const start = (device) => {
    if (starting) return; starting = true;
    if (device) game.input.lastDevice = device;
    try { const p = document.documentElement.requestFullscreen?.(); p?.catch?.(() => { /* rejected: carry on */ }); } catch (e) { /* ignore */ }
    game.audio?.ui('buy');
    cleanup(); ui.close('title'); openSelect(game);
  };
  const toggleFs = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => { });
      else document.documentElement.requestFullscreen?.().catch?.(() => { });
    } catch (e) { /* ignore */ }
  };
  const resync = () => { prev = padSnap(game); lastTick = performance.now(); };
  const open = (fn) => fn(game, resync);

  const onKey = (e) => {
    if (e.code !== 'Space' || ui.top()?.id !== 'title' || e.repeat) return;
    e.preventDefault();
    const f = ui.focusEl; if (f && root?.contains(f)) f.click(); else start('kbm');
  };
  const onFs = () => {
    const b = root?.querySelector('[data-act=fullscreen]'); if (!b) return;
    const on = !!document.fullscreenElement;
    b.setAttribute('aria-pressed', String(on)); b.querySelector('.ic').innerHTML = on ? ICONS.exitfs : ICONS.fullscreen;
    b.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Fullscreen'); b.querySelector('.lbl').textContent = on ? 'Exit fullscreen' : 'Fullscreen';
  };
  const cleanup = () => { window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };

  const util = (act, label, icon, fn) => h('button', { class: 'util-btn', 'data-act': act, 'aria-label': label, title: label, onclick: fn },
    h('span', { class: 'ic', html: icon }), h('span', { class: 'lbl', 'aria-hidden': 'true' }, label));

  ui.open('title', (el) => {
    const save = game.save.data;
    root = el; el.classList.add('title-screen');
    el.append(
      h('div', { class: 'title-backdrop', 'aria-hidden': 'true' }),
      h('div', { class: 'title-vignette', 'aria-hidden': 'true' }),
      h('div', { class: 'title-center' },
        makeLogo(),
        h('button', { class: 'press-start', 'data-autofocus': true, onclick: () => start() }, h('span', {}, 'Press Start')),
        h('div', { class: 'title-hint', 'aria-live': 'polite' }, hintText())),
      h('div', { class: 'title-foot' }, `Level ${save.level} · ${save.coins} drachmas`),
      h('div', { class: 'title-utils', role: 'group', 'aria-label': 'Options' },
        util('instructions', 'Instructions', ICONS.instructions, () => open(openInstructions)),
        util('settings', 'Settings', ICONS.settings, () => open(openSettings)),
        util('fullscreen', 'Fullscreen', ICONS.fullscreen, toggleFs)));
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    onFs();
  }, {
    onClose: cleanup,
    onNav: (m) => {
      const now = performance.now();
      if (now - lastTick > 150) prev = padSnap(game);    // a dialog was on top: forget what was held
      lastTick = now;
      const cur = padSnap(game);
      let fresh = null, stick = false;
      const freshBtn = (i) => { for (const [id, c] of cur) if (c.b[i] && !(prev.get(id)?.b[i] ?? c.b[i])) return id; return null; };
      for (const [id, c] of cur) {
        const p = prev.get(id);
        if (c.stick > 0.6) stick = true;
        if (p) for (let i = 0; i < c.b.length; i++) if (c.b[i] && !p.b[i]) { fresh = id; }
      }
      const padBack = freshBtn(1);
      prev = cur;
      const kb = m.keyboard;
      if (mode === 'idle') {
        if (stick || kb.up || kb.down || kb.left || kb.right) setMode('nav');
        else if (fresh) { start(fresh); return; }
        // pads do nothing else while idle; the keyboard keeps normal navigation
        Object.assign(m, kb, { start: false, device: kb.confirm ? 'kbm' : null });
      } else {
        if (m.start) { start(m.device); return; }
        if (padBack) { setMode('idle'); ui.setFocus(root.querySelector('.press-start')); m.back = false; }
      }
    },
  });
}
