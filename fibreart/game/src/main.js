// Fibre Art: the shell around the collage. Loading, the title screen (with
// the first picture turning slowly behind it), menus by controller, keyboard
// or pointer, players joining and leaving, the pointer as a hand, sound, the
// card of controls found, settings and pause. See design/design.md.

import { createGame, step, addPlayer, removePlayer, shift, describe, setupPower, AWAKE, INPUTS, W, H, radius, pieceName, inputKind } from './collage.js';
import { createRenderer } from './render.js';
import { createOverlay } from './overlay.js';
import { createInput, BTN, KEYMAP } from './input.js';
import { createAudio } from './audio.js';
import { updateLife } from './life.js';

const $ = (s) => document.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const SETTINGS_KEY = 'fibreart.settings';
const DEFAULTS = {
  volume: 80, music: 60, sfx: 80, playHints: false, vibration: true,
  reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
};
function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* storage unavailable: settings last for this visit */ }
}

const settings = loadSettings();
const input = createInput();
const audio = createAudio();
let renderer;
let overlay;
let data;
let game;

const ui = {
  screen: 'loading', // 'loading' | 'title' | 'play'
  modals: [], // open dialogs, top last
  titleNav: false,
  focus: 0,
  repeatAt: 0,
  paused: false,
  missingPads: [],
  drag: null,
  lastPower: new Map(),
  captionTimer: 0,
};

const coarse = matchMedia('(pointer: coarse)').matches;

const KEY_NAMES = { LS: 'W A S D', RS: 'Arrows', LT: 'Q', RT: 'E', A: 'K', B: 'L', X: 'J', Y: 'I', LB: 'Z', RB: 'C' };

// ---- Screens, dialogs and focus ----------------------------------------

function show(screen) {
  ui.screen = screen;
  $('#loading').hidden = screen !== 'loading';
  $('#title').hidden = screen !== 'title';
  $('#hud').hidden = screen !== 'play';
  ui.focus = 0;
  refreshFocus();
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === 'card') fillCard();
  if (id === 'hint') fillHint();
  if (id === 'settings') fillSettings();
  if (id === 'pause') $('#pause-reason').textContent = ui.pauseReason || '';
  el.hidden = false;
  ui.modals = ui.modals.filter((m) => m !== id);
  ui.modals.push(id);
  // Each panel opened sits over the ones beneath it.
  el.style.zIndex = String(20 + ui.modals.length);
  ui.focus = 0;
  input.lockHeld();
  refreshFocus(true);
}

function closeModal() {
  const id = ui.modals.pop();
  if (id) document.getElementById(id).hidden = true;
  ui.focus = 0;
  input.lockHeld();
  if (!ui.modals.length && ui.screen === 'play') resume();
  refreshFocus(true);
}

function container() {
  if (ui.modals.length) return document.getElementById(ui.modals.at(-1));
  if (ui.screen === 'title') return $('#title');
  return null;
}

function navItems() {
  const c = container();
  return c ? $$('[data-nav]', c).filter((el) => el.offsetParent !== null) : [];
}

function refreshFocus(moveDom = false) {
  const items = navItems();
  for (const el of $$('.focused')) el.classList.remove('focused');
  const usingPad = input.kind === 'controller';
  if (!items.length) return;
  ui.focus = Math.max(0, Math.min(ui.focus, items.length - 1));
  const el = items[ui.focus];
  const titleIdle = ui.screen === 'title' && !ui.modals.length && !ui.titleNav;
  if (usingPad && !titleIdle) el.classList.add('focused');
  if (moveDom || usingPad) {
    if (!titleIdle || ui.modals.length) el.focus({ preventScroll: false });
  }
}

function activate(el) {
  if (!el) return;
  if (el.matches('input[type="checkbox"]')) {
    el.checked = !el.checked;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  el.click();
}

// ---- Actions -------------------------------------------------------------

async function requestFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch { /* refused: carry on in the window */ }
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else requestFullscreen();
}

function start() {
  if (ui.screen !== 'title') return;
  audio.unlock();
  applySettings();
  requestFullscreen();
  show('play');
  input.lockHeld();
  syncPlayers(true);
  if (!game.players.length) addPlayer(game, 'kb');
  // On a touch screen with no controller, start with the on-screen controls.
  if (ui.touchPad === undefined) ui.touchPad = coarse && !input.pads().length;
  showTouchPad(ui.touchPad);
  audio.scene(game.index);
  caption();
  hint();
}

function pause(reason = '') {
  if (ui.screen !== 'play' || ui.paused) return;
  ui.paused = true;
  ui.pauseReason = reason;
  openModal('pause');
}

function resume() {
  ui.paused = false;
  ui.pauseReason = '';
  for (const id of ui.missingPads) removePlayer(game, `pad${id}`);
  ui.missingPads = [];
  if (!game.players.length && !input.pads().length) addPlayer(game, 'kb');
  input.lockHeld();
  for (const id of [...ui.modals]) document.getElementById(id).hidden = true;
  ui.modals = [];
  chips();
}

function quitToTitle() {
  for (const id of ui.modals) document.getElementById(id).hidden = true;
  ui.modals = [];
  ui.paused = false;
  for (const p of [...game.players]) removePlayer(game, p.id);
  show('title');
  input.lockHeld();
}

// Messages during play are hints too: shown only with hints on.
function playToast(text, ms) {
  if (settings.playHints) toast(text, ms);
}

function toast(text, ms = 2600) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), ms);
}

function caption() {
  const c = $('#caption');
  c.innerHTML = `${game.scene.name}<small>after Hanneke de Neve</small>`;
  c.classList.add('show');
  clearTimeout(ui.captionTimer);
  ui.captionTimer = setTimeout(() => c.classList.remove('show'), 6000);
}

function hint() {
  const k = input.kind;
  $('#play-hint').textContent = k === 'controller'
    ? 'Try every stick, trigger and button · View: controls found · Menu: pause'
    : k === 'keyboard'
      ? 'W A S D, arrows, Q E, I J K L, Z C · Tab: controls found · Esc: pause'
      : k === 'touch'
        ? 'Drag the pieces · double-tap one to make it bloom · pinch one to stretch it'
        : 'Drag the pieces · double-click one to make it bloom · wheel to stretch it';
}

// The pause and on-screen controls switches stay out of sight while playing
// and come up for a moment when the mouse moves or the screen is touched.
function revealHud() {
  if (ui.screen !== 'play' || ui.modals.length) return;
  const hud = $('#hud');
  hud.classList.add('reveal');
  clearTimeout(ui.revealTimer);
  const hide = () => {
    if (hud.querySelector('.icon-btn:hover, .icon-btn:focus-visible')) ui.revealTimer = setTimeout(hide, 1000);
    else hud.classList.remove('reveal');
  };
  ui.revealTimer = setTimeout(hide, 2500);
}

function playerLabel(pl) {
  if (pl.id === 'kb') return input.kind === 'touch' || ui.touchPad ? 'You' : 'Keyboard';
  return `Player ${Number(pl.id.slice(3)) + 1}`;
}

function chips() {
  const box = $('#players');
  box.innerHTML = '';
  for (const pl of game.players) {
    const found = Object.values(pl.bindings).filter((b) => b.found).length;
    const ready = Object.values(pl.bindings).some((b) => b.scale === 'large' && setupPower(game, b) >= AWAKE);
    const el = document.createElement('div');
    el.className = 'chip';
    el.style.setProperty('--c', pl.colour);
    el.innerHTML = `<i></i><span>${playerLabel(pl)} · <b>${found}</b> of ${INPUTS.length} found${ready ? ' · something big is ready' : ''}</span>`;
    box.append(el);
  }
}

// The hint: for each player, the big control that carries the picture on,
// the piece it is centred on, and what wakes it, mostly as pictures.
const CONTROL_DRAWING = { stick: 'stick', trigger: 'trigger', button: 'button' };
const SETUP_PICTURE = {
  centre: '<svg viewBox="0 0 64 40" aria-hidden="true"><rect x="2" y="2" width="60" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="32" cy="20" r="7" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/><path d="M9 33 L24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M20 23h5v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 64 40" aria-hidden="true"><circle cx="12" cy="22" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="32" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="52" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 20 Q22 12 26 14 M38 15 Q44 14 46 22" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.5"/></svg>',
  meet: '<svg viewBox="0 0 64 40" aria-hidden="true"><circle cx="16" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="48" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M27 20h10M33 16l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function fillHint() {
  const body = $('#hint-body');
  body.innerHTML = '';
  const lines = data.ui.lines || [];
  const drawing = (name) => lines.find((l) => l.name === name)?.file;
  const pieceFile = (p) => (p.stage >= 0 ? game.chains[p.chain]?.[p.stage]?.file : null) || p.file;
  for (const pl of game.players) {
    const key = (inp) => (pl.id === 'kb' && !ui.touchPad ? KEY_NAMES[inp] : inp);
    for (const b of Object.values(pl.bindings)) {
      if (b.scale !== 'large' || !b.setup) continue;
      const anchor = game.pieces[b.setup.anchor];
      if (!anchor) continue;
      const kind = inputKind(b.input);
      const lean = kind === 'stick' ? 'push' : kind === 'trigger' ? 'hold' : 'press';
      const helper = Object.values(pl.bindings).find((h) => h.setsUp === b.input);
      const awake = setupPower(game, b) >= AWAKE;
      const what = pieceName(anchor);
      const goal = b.setup.type === 'centre' ? `Bring ${what} to the middle`
        : b.setup.type === 'link' ? `Sew ${b.setup.need} pieces to ${what}`
          : `Bring ${what} to ${pieceName(game.pieces[b.setup.other])}`;
      const text = awake ? `Ready: ${lean} ${key(b.input)}.`
        : `${goal}${helper ? ` (${key(helper.input)})` : ''}, then ${lean} ${key(b.input)}.`;
      const other = b.setup.type === 'meet' ? game.pieces[b.setup.other] : null;
      const row = document.createElement('div');
      row.className = 'hint-row';
      row.style.setProperty('--c', pl.colour);
      row.innerHTML = `
        <span class="hint-dot" aria-hidden="true"></span>
        <figure class="hint-pic"><img src="web/${drawing(CONTROL_DRAWING[kind]) || ''}" alt=""><figcaption>${key(b.input)}</figcaption></figure>
        <img class="hint-piece" src="web/${pieceFile(anchor)}" alt="">
        <span class="hint-setup">${awake ? '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 21l8 8 16-18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : SETUP_PICTURE[b.setup.type]}</span>
        ${other ? `<img class="hint-piece" src="web/${pieceFile(other)}" alt="">` : ''}
        <p class="hint-text">${text}</p>`;
      body.append(row);
    }
  }
  if (!body.children.length) body.innerHTML = '<p class="hint-text">Try every stick, trigger and button.</p>';
}

function fillCard() {
  const body = $('#card-body');
  body.innerHTML = '';
  for (const pl of game.players) {
    const sec = document.createElement('section');
    sec.className = 'card-player';
    sec.style.setProperty('--c', pl.colour);
    const items = INPUTS.map((inp) => {
      const b = pl.bindings[inp];
      const key = pl.id === 'kb' && !ui.touchPad ? KEY_NAMES[inp] : inp;
      if (!b?.found) return `<li class="unfound"><kbd>${key}</kbd> not found yet</li>`;
      const big = b.scale === 'large';
      let text = describe(game, b);
      if (big && b.setup) {
        const pw = setupPower(game, b);
        const how = b.setup.type === 'centre' ? 'bring it to the middle' : b.setup.type === 'link' ? `sew ${b.setup.need} pieces to it` : 'bring it to its partner';
        text += pw >= AWAKE ? ' — awake' : ` — to wake it, ${how}`;
      }
      return `<li class="${big ? 'large' : ''}"><kbd>${key}</kbd> ${text}</li>`;
    });
    sec.innerHTML = `<h3><span class="chip" style="--c:${pl.colour}"><i></i>${playerLabel(pl)}</span></h3><ul>${items.join('')}</ul>`;
    body.append(sec);
  }
}

function fillSettings() {
  for (const el of $$('[data-setting]')) {
    const k = el.dataset.setting;
    if (el.type === 'checkbox') el.checked = !!settings[k];
    else {
      el.value = settings[k];
      el.nextElementSibling.textContent = settings[k];
    }
  }
}

function applySettings() {
  audio.set({ volume: settings.volume / 100, music: settings.music / 100, sfx: settings.sfx / 100 });
  // No interface over the picture unless the player asks for hints.
  if (overlay) overlay.hints = settings.playHints;
  $('#hud').classList.toggle('hints', !!settings.playHints);
  if (game) game.reduceMotion = settings.reduceMotion;
}

function vibrate(id, strength = 0.5, ms = 180) {
  if (!settings.vibration || !id?.startsWith('pad')) return;
  const gp = navigator.getGamepads?.()[Number(id.slice(3))];
  gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }).catch?.(() => {});
}

// ---- Players -------------------------------------------------------------

function syncPlayers(quiet = false) {
  const pads = input.pads();
  for (const i of pads) {
    const id = `pad${i}`;
    if (!game.players.some((p) => p.id === id) && game.players.length < 5) {
      addPlayer(game, id);
      if (!quiet) playToast(`${playerLabel({ id })} joined`);
      chips();
    }
  }
  for (const pl of game.players) {
    if (pl.id.startsWith('pad') && !pads.includes(Number(pl.id.slice(3))) && !ui.missingPads.includes(Number(pl.id.slice(3)))) {
      ui.missingPads.push(Number(pl.id.slice(3)));
      pause(`${playerLabel(pl)}'s controller was disconnected. Reconnect it, or resume to play on without it.`);
    }
  }
  // A reconnected pad is no longer missing.
  ui.missingPads = ui.missingPads.filter((i) => !pads.includes(i));
  if (ui.paused && !ui.missingPads.length && ui.pauseReason.includes('disconnected')) {
    ui.pauseReason = 'The controller is back.';
    $('#pause-reason').textContent = ui.pauseReason;
  }
}

// ---- Pointer as a hand ---------------------------------------------------

function toWorld(e) {
  const f = renderer.frame;
  return { x: (e.clientX - f.x) / f.scale, y: (e.clientY - f.y) / f.scale };
}

function pieceAt(pt) {
  for (let i = game.pieces.length - 1; i >= 0; i--) {
    const p = game.pieces[i];
    if (p.alpha < 0.3) continue;
    const dx = pt.x - p.x;
    const dy = pt.y - p.y;
    const c = Math.cos(-p.rot);
    const s = Math.sin(-p.rot);
    const lx = (c * dx - s * dy) / ((p.w * p.sx) / 2);
    const ly = (s * dx + c * dy) / ((p.h * p.sy) / 2);
    if (lx * lx + ly * ly < 1) return p;
  }
  return null;
}

// One finger on a piece drags it; a second finger pinches it (stretch) and
// twists it (turn). A finger on the cloth around the pieces pans the view when
// the picture is larger than the screen.
function setupPointer() {
  const cv = $('#overlay');
  let lastTap = 0;
  const touches = new Map(); // pointerId -> { x, y } in CSS pixels
  const spread = () => {
    const [a, b] = [...touches.values()];
    return { d: Math.hypot(b.x - a.x, b.y - a.y) || 1, a: Math.atan2(b.y - a.y, b.x - a.x) };
  };
  cv.addEventListener('pointerdown', (e) => {
    if (ui.screen !== 'play' || ui.modals.length) return;
    audio.unlock();
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { cv.setPointerCapture(e.pointerId); } catch { /* fine */ }
    if (ui.drag && touches.size === 2) {
      // Second finger: pinch and twist the piece being held.
      const { d, a } = spread();
      const p = ui.drag.p;
      ui.drag.pinch = { d, a, sx: p.sx, sy: p.sy, rot: p.rot, tsx: p.sx, tsy: p.sy, trot: p.rot };
      return;
    }
    if (touches.size > 1) return;
    const pt = toWorld(e);
    const p = pieceAt(pt);
    if (!p) {
      ui.pan = { id: e.pointerId, x: e.clientX, y: e.clientY };
      return;
    }
    ui.drag = { p, id: e.pointerId, cx: e.clientX, cy: e.clientY, ox: pt.x - p.x, oy: pt.y - p.y };
    const now = performance.now();
    if (now - lastTap < 320) {
      p.vbloom += 2.6;
      audio.pluck(p.i + 2, 1);
    }
    lastTap = now;
  });
  cv.addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ui.pan && ui.pan.id === e.pointerId) {
      const s = renderer.frame.scale;
      renderer.centre.x -= (e.clientX - ui.pan.x) / s;
      renderer.centre.y -= (e.clientY - ui.pan.y) / s;
      ui.pan.x = e.clientX;
      ui.pan.y = e.clientY;
      ui.panAt = performance.now();
      return;
    }
    if (!ui.drag) return;
    const pin = ui.drag.pinch;
    if (pin && touches.size >= 2) {
      const { d, a } = spread();
      pin.tsx = pin.sx * (d / pin.d);
      pin.tsy = pin.sy * (d / pin.d);
      pin.trot = pin.rot + a - pin.a;
    }
    if (ui.drag.id === e.pointerId) {
      ui.drag.cx = e.clientX;
      ui.drag.cy = e.clientY;
    }
  });
  const up = (e) => {
    touches.delete(e.pointerId);
    if (ui.pan && ui.pan.id === e.pointerId) ui.pan = null;
    if (!ui.drag) return;
    if (ui.drag.id === e.pointerId) ui.drag = null;
    else ui.drag.pinch = null;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => {
    if (ui.screen !== 'play' || ui.modals.length) return;
    e.preventDefault();
    const p = pieceAt(toWorld(e));
    if (!p) return;
    const d = Math.max(-1, Math.min(1, -e.deltaY / 120));
    if (e.shiftKey) p.vrot += d * 1.2;
    else { p.vsx += d * 0.9; p.vsy += d * 0.9; }
  }, { passive: false });
}

// When the picture is larger than the screen, the view follows what is being
// moved: a dragged piece near the screen's edge pulls the view along, and
// otherwise the view drifts towards the pieces that are moving fastest.
function followView(dt) {
  const f = renderer.frame;
  if (!f.pans || ui.screen !== 'play') return;
  const c = renderer.centre;
  if (ui.drag) {
    const edge = (v, size) => {
      const m = size * 0.18;
      return v < m ? (v - m) / m : v > size - m ? (v - (size - m)) / m : 0;
    };
    c.x += edge(ui.drag.cx, innerWidth) * 7 * dt;
    c.y += edge(ui.drag.cy, innerHeight) * 5 * dt;
    return;
  }
  if (ui.pan || performance.now() - (ui.panAt || 0) < 2500) return;
  let wx = 0;
  let wy = 0;
  let wsum = 0;
  for (const p of game.pieces) {
    const v = Math.hypot(p.vx, p.vy);
    if (v < 0.6 || p.alpha < 0.3) continue;
    wx += p.x * v;
    wy += p.y * v;
    wsum += v;
  }
  if (wsum < 1) return;
  const k = 1 - Math.exp(-dt * 1.5);
  c.x += (wx / wsum - c.x) * k;
  c.y += (wy / wsum - c.y) * k;
}

// ---- On-screen controls (touch) ------------------------------------------

function showTouchPad(on) {
  ui.touchPad = on;
  $('#touchpad').hidden = !on;
  $('#hud').classList.toggle('pad-on', on);
  $('.hud-pad').setAttribute('aria-pressed', String(on));
  if (!on) releaseTouchPad();
}

function releaseTouchPad() {
  const tp = input.touchPad;
  tp.LS = [0, 0];
  tp.RS = [0, 0];
  tp.LT = 0;
  tp.RT = 0;
  for (const el of $$('#touchpad .down')) el.classList.remove('down');
  for (const k of $$('#touchpad .tp-stick i')) k.style.transform = '';
}

function setupTouchPad() {
  const tp = input.touchPad;
  for (const el of $$('#touchpad .tp-stick')) {
    const name = el.dataset.stick;
    const knob = el.querySelector('i');
    let id = null;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const rad = r.width / 2;
      let x = (e.clientX - r.left - rad) / rad;
      let y = (e.clientY - r.top - rad) / rad;
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      tp[name] = [x, y];
      knob.style.transform = `translate(${x * rad * 0.6}px, ${y * rad * 0.6}px)`;
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      audio.unlock();
      id = e.pointerId;
      try { el.setPointerCapture(id); } catch { /* fine */ }
      move(e);
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      tp[name] = [0, 0];
      knob.style.transform = '';
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
  for (const el of $$('#touchpad [data-tp]')) {
    const name = el.dataset.tp;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      audio.unlock();
      try { el.setPointerCapture(e.pointerId); } catch { /* fine */ }
      el.classList.add('down');
      if (name === 'LT' || name === 'RT') tp[name] = 1;
      else tp.pressed.add(name);
    });
    const up = () => {
      el.classList.remove('down');
      if (name === 'LT' || name === 'RT') tp[name] = 0;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}

// ---- The frame -------------------------------------------------------------

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.poll();
  const nav = input.nav();
  handleMenus(nav, now);

  if (ui.screen === 'title' && !ui.modals.length) {
    // The first picture turns slowly behind the title.
    step(game, dt, new Map());
    updateLife(game, dt, settings.reduceMotion ? 0.3 : 1);
    const sun = game.pieces[0];
    game.field.swirls = [{ owner: 'title', x: sun.x, y: sun.y, r: 9, a: 0.22 * Math.sin(game.time * 0.32), va: 0 }];
    game.field.ripple = settings.reduceMotion ? 0 : 0.25;
  } else if (ui.screen === 'play' && !ui.paused && !ui.modals.length) {
    syncPlayers();
    const inputs = input.players();
    if (inputs.has('kb') && !game.players.some((p) => p.id === 'kb')) {
      addPlayer(game, 'kb');
      chips();
    }
    if (ui.drag) {
      // Re-read the finger each frame: the view may have panned under it.
      const pt = toWorld({ clientX: ui.drag.cx, clientY: ui.drag.cy });
      const p = ui.drag.p;
      p.vx = (pt.x - ui.drag.ox - p.x) * 10;
      p.vy = (pt.y - ui.drag.oy - p.y) * 10;
      const pin = ui.drag.pinch;
      if (pin) {
        p.vsx = (pin.tsx - p.sx) * 10;
        p.vsy = (pin.tsy - p.sy) * 10;
        p.vrot = (pin.trot - p.rot) * 10;
      }
    }
    step(game, dt, inputs);
    updateLife(game, dt, settings.reduceMotion ? 0.3 : 1);
    feedback(inputs);
    followView(dt);
  }
  for (const e of game.events) overlay.event(e, game);
  game.events.length = 0;

  renderer.render(game);
  overlay.draw(game, renderer.frame, dt);
  input.endFrame();
  requestAnimationFrame(frame);
}

function feedback(inputs) {
  let chipsDirty = false;
  for (const e of game.events) {
    if (e.type === 'found') {
      audio.found(e.scale);
      chipsDirty = true;
      if (e.scale === 'large') {
        const pl = game.players.find((p) => p.id === e.player);
        playToast(`${playerLabel(pl)} found a big one: ${e.input === 'LS' || e.input === 'RS' ? 'a stick' : e.input === 'LT' || e.input === 'RT' ? 'a trigger' : 'a button'} that ${describe(game, pl.bindings[e.input])}`);
      }
    } else if (e.type === 'link') audio.link();
    else if (e.type === 'morph') audio.pluck(e.stage + 4, 1);
    else if (e.type === 'rearrange') {
      audio.woke();
      for (const pl of game.players) vibrate(pl.id, 0.7, 300);
      chipsDirty = true;
      playToast('The picture rearranges itself. New controls to find.');
    } else if (e.type === 'shift') {
      audio.shift();
      audio.scene(game.index);
      for (const pl of game.players) vibrate(pl.id, 0.9, 500);
      caption();
      chipsDirty = true;
      renderer.loadScene(game.scenes[(game.index + 1) % game.scenes.length], data.chains, data.drift);
    }
  }
  // Button presses pluck a note; bigger bindings, lower notes.
  for (const pl of game.players) {
    const inp = inputs.get(pl.id);
    if (!inp) continue;
    for (const name of inp.pressed) {
      const b = pl.bindings[name];
      if (b) audio.pluck(INPUTS.indexOf(name) + (b.target || 0), b.scale === 'large' ? 2 : b.scale === 'medium' ? 1 : 0);
    }
    // A large control waking: a chime and a rumble for its player.
    for (const b of Object.values(pl.bindings)) {
      if (b.scale !== 'large') continue;
      const key = pl.id + b.input;
      const pw = setupPower(game, b);
      const was = ui.lastPower.get(key) ?? pw;
      if (was < AWAKE && pw >= AWAKE) {
        audio.woke();
        vibrate(pl.id, 0.5, 200);
        chipsDirty = true;
      }
      if (was >= AWAKE && pw < AWAKE) chipsDirty = true;
      ui.lastPower.set(key, pw);
    }
  }
  const f = game.field;
  audio.rush(f.swirls.reduce((s, q) => s + Math.abs(q.va) * 0.6 + Math.abs(q.a) * 0.15, 0) + Math.abs(f.tideV) * 0.5 + f.pour * 0.6 + f.unravel * 0.6);
  if (chipsDirty) chips();
}

function handleMenus(nav, now) {
  const items = navItems();
  const top = ui.modals.at(-1);
  // Title: any fresh controller button starts, until the stick opens the options.
  if (ui.screen === 'title' && !ui.modals.length) {
    const [sx, sy] = nav.stick;
    if (!ui.titleNav && Math.hypot(sx, sy) > 0.5) {
      ui.titleNav = true;
      ui.focus = 0;
      ui.repeatAt = now + 300;
      refreshFocus(true);
      return;
    }
    if (!ui.titleNav && input.padAnyPressed()) {
      input.lockHeld();
      start();
      return;
    }
    if (ui.titleNav && input.padPressed(BTN.MENU)) {
      start();
      return;
    }
  }
  if (ui.screen === 'play' && !ui.modals.length) {
    if (nav.pause) pause();
    else if (nav.view) {
      ui.paused = true;
      openModal('card');
    }
    return;
  }
  if (!items.length && !top) return;
  // Directional focus with a dead zone and a repeat delay.
  const [sx, sy] = nav.stick;
  // In a grid of pictures (the pause menu), up and down move a whole row.
  const grid = items[ui.focus]?.closest('[data-cols]');
  const row = grid ? Number(grid.dataset.cols) : 1;
  let dir = 0;
  if (nav.up) dir = -row;
  else if (nav.left && !isRange(items[ui.focus])) dir = -1;
  if (nav.down) dir = row;
  else if (nav.right && !isRange(items[ui.focus])) dir = 1;
  if (!dir && Math.abs(sy) > 0.6 && now > ui.repeatAt) {
    dir = Math.sign(sy) * row;
    ui.repeatAt = now + 260;
  }
  if (!dir && grid && Math.abs(sx) > 0.6 && now > ui.repeatAt) {
    dir = Math.sign(sx);
    ui.repeatAt = now + 260;
  }
  if (Math.abs(sy) < 0.3) ui.repeatAt = Math.min(ui.repeatAt, now);
  const cur = items[ui.focus];
  if (isRange(cur) && (nav.left || nav.right || (Math.abs(sx) > 0.6 && now > ui.repeatAt))) {
    const d = nav.left || sx < -0.6 ? -1 : 1;
    cur.value = Number(cur.value) + d * Number(cur.step || 1);
    cur.dispatchEvent(new Event('input', { bubbles: true }));
    if (Math.abs(sx) > 0.6) ui.repeatAt = now + 160;
  }
  if (dir && items.length) {
    ui.focus = (ui.focus + dir + items.length) % items.length;
    refreshFocus(true);
  }
  // Scroll long dialogs with the right stick or with the left stick's vertical.
  const scroller = top && document.getElementById(top).querySelector('.scroll');
  if (scroller) {
    const gp = navigator.getGamepads?.() || [];
    let ry = 0;
    for (const g of gp) if (g && Math.abs(g.axes[3] || 0) > 0.2) ry = g.axes[3];
    if (ry) scroller.scrollTop += ry * 14;
  }
  if (nav.confirm && input.kind === 'controller') activate(items[ui.focus]);
  if (nav.back || (top === 'pause' && nav.pause) || (top === 'card' && nav.view)) {
    if (top) closeModal();
    else if (ui.screen === 'title' && ui.titleNav) {
      ui.titleNav = false;
      refreshFocus();
    }
  }
}

const isRange = (el) => el?.matches?.('input[type="range"]');

// ---- Wiring --------------------------------------------------------------

function wire() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action], [data-open]');
    if (!el) return;
    audio.unlock();
    if (el.dataset.open) return openModal(el.dataset.open);
    switch (el.dataset.action) {
      case 'start': return start();
      case 'fullscreen': return toggleFullscreen();
      case 'pause': return pause();
      case 'touchpad': return showTouchPad(!ui.touchPad);
      case 'resume': return closeAllAndResume();
      case 'close': return closeModal();
      case 'card': return openModal('card');
      case 'hint': return openModal('hint');
      case 'next-scene':
        closeAllAndResume();
        return shift(game, 'pour');
      case 'quit-title': return quitToTitle();
      default:
    }
  });
  // Keyboard on the title: Enter starts when nothing else has focus.
  addEventListener('keydown', (e) => {
    if (ui.screen === 'title' && !ui.modals.length && (e.code === 'Enter' || e.code === 'Space')) {
      const a = document.activeElement;
      if (!a || a === document.body || a.id === 'press-start') {
        e.preventDefault();
        start();
      }
    }
  });
  for (const el of $$('[data-setting]')) {
    const k = el.dataset.setting;
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      settings[k] = el.type === 'checkbox' ? el.checked : Number(el.value);
      if (el.type !== 'checkbox') el.nextElementSibling.textContent = el.value;
      saveSettings();
      applySettings();
    });
  }
  // Sound only while the page is visible and focused.
  const syncAudio = () => audio.setActive(!document.hidden && document.hasFocus());
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) revealHud();
  });
  addEventListener('pointerdown', revealHud);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause('Paused while the page was hidden.');
    syncAudio();
  });
  addEventListener('blur', () => {
    pause('Paused while the window was in the background.');
    audio.setActive(false);
    releaseTouchPad();
  });
  addEventListener('focus', () => audio.setActive(!document.hidden));
  addEventListener('pageshow', syncAudio);
  input.onKind((k) => {
    $('#hud').classList.toggle('touch', k === 'touch');
    hint();
    refreshFocus();
  });
}

function closeAllAndResume() {
  for (const id of ui.modals) document.getElementById(id).hidden = true;
  ui.modals = [];
  resume();
}

async function boot() {
  wire();
  try {
    data = await (await fetch('web/scenes.json')).json();
    renderer = createRenderer($('#gl'));
    overlay = createOverlay($('#overlay'));
    overlay.loadLines(data.ui.lines);
    const seed = Math.floor(Math.random() * 1e9);
    const first = new URLSearchParams(location.search).get('scene');
    const at = Math.max(0, data.scenes.findIndex((s) => s.key === first));
    game = createGame(data.scenes, { chains: data.chains, seed, scene: at });
    game.driftFiles = data.drift || [];
    // Delivered pause menu pictures (HK-U06) replace the icons drawn in code.
    for (const [name, file] of Object.entries(data.ui.pause || {})) {
      for (const el of $$(`[data-icon="${name}"]`)) {
        const img = document.createElement('img');
        img.src = `web/${file}`;
        img.alt = '';
        img.className = 'badge';
        el.querySelector('svg, img')?.replaceWith(img);
      }
    }
    if (data.music) audio.setSong(`web/${data.music.file}`, data.music.root);
    applySettings();
    await renderer.loadScene(game.scene, data.chains, data.drift);
    renderer.loadScene(data.scenes[(game.index + 1) % data.scenes.length], data.chains, data.drift);
  } catch (err) {
    console.error(err);
    $('.loading-text').textContent = 'This browser cannot show the collage: it needs WebGL 2.';
    return;
  }
  setupPointer();
  setupTouchPad();
  show('title');
  hint();
  window.fibreart = { game: () => game, frame: () => renderer.frame, ui, input, start, shift: (how) => shift(game, how), W, H, radius, audio };
  requestAnimationFrame(frame);
}

boot();
