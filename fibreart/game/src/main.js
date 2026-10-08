// Fibre Art: the shell around the collage. Loading, the title screen (with
// the first picture turning slowly behind it), menus by controller, keyboard
// or pointer, players joining and leaving, the pointer as a hand, sound, the
// card of controls found, settings and pause. See design/design.md.

import { createGame, step, addPlayer, removePlayer, shift, describe, setupPower, AWAKE, INPUTS, W, H, radius } from './collage.js';
import { createRenderer } from './render.js';
import { createOverlay } from './overlay.js';
import { createInput, BTN, KEYMAP } from './input.js';
import { createAudio } from './audio.js';
import { updateLife } from './life.js';

const $ = (s) => document.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const SETTINGS_KEY = 'fibreart.settings';
const DEFAULTS = {
  volume: 80, music: 60, sfx: 80, hints: true, vibration: true,
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
  if (id === 'settings') fillSettings();
  if (id === 'pause') $('#pause-reason').textContent = ui.pauseReason || '';
  el.hidden = false;
  ui.modals = ui.modals.filter((m) => m !== id);
  ui.modals.push(id);
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
      : 'Drag the pieces · double-tap one to make it bloom';
  $('#title-hint').textContent = k === 'controller' ? 'Move left stick for options' : 'Press Enter or click Press Start';
}

function playerLabel(pl) {
  return pl.id === 'kb' ? 'Keyboard' : `Player ${Number(pl.id.slice(3)) + 1}`;
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

function fillCard() {
  const body = $('#card-body');
  body.innerHTML = '';
  for (const pl of game.players) {
    const sec = document.createElement('section');
    sec.className = 'card-player';
    sec.style.setProperty('--c', pl.colour);
    const items = INPUTS.map((inp) => {
      const b = pl.bindings[inp];
      const key = pl.id === 'kb' ? KEY_NAMES[inp] : inp;
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
  if (overlay) overlay.hints = settings.hints;
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
      if (!quiet) toast(`${playerLabel({ id })} joined`);
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

function setupPointer() {
  const cv = $('#overlay');
  let lastTap = 0;
  cv.addEventListener('pointerdown', (e) => {
    if (ui.screen !== 'play' || ui.modals.length) return;
    audio.unlock();
    const pt = toWorld(e);
    const p = pieceAt(pt);
    if (!p) return;
    ui.drag = { p, id: e.pointerId, x: pt.x, y: pt.y, ox: pt.x - p.x, oy: pt.y - p.y };
    try { cv.setPointerCapture(e.pointerId); } catch { /* fine */ }
    const now = performance.now();
    if (now - lastTap < 320) {
      p.vbloom += 2.6;
      audio.pluck(p.i + 2, 1);
    }
    lastTap = now;
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ui.drag || ui.drag.id !== e.pointerId) return;
    const pt = toWorld(e);
    ui.drag.x = pt.x;
    ui.drag.y = pt.y;
  });
  const up = (e) => {
    if (ui.drag && ui.drag.id === e.pointerId) ui.drag = null;
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
      const p = ui.drag.p;
      p.vx = (ui.drag.x - ui.drag.ox - p.x) * 10;
      p.vy = (ui.drag.y - ui.drag.oy - p.y) * 10;
    }
    step(game, dt, inputs);
    updateLife(game, dt, settings.reduceMotion ? 0.3 : 1);
    feedback(inputs);
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
        toast(`${playerLabel(pl)} found a big one: ${e.input === 'LS' || e.input === 'RS' ? 'a stick' : e.input === 'LT' || e.input === 'RT' ? 'a trigger' : 'a button'} that ${describe(game, pl.bindings[e.input])}`);
      }
    } else if (e.type === 'link') audio.link();
    else if (e.type === 'morph') audio.pluck(e.stage + 4, 1);
    else if (e.type === 'rearrange') {
      audio.woke();
      for (const pl of game.players) vibrate(pl.id, 0.7, 300);
      chipsDirty = true;
      toast('The picture rearranges itself. New controls to find.');
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
  let dir = 0;
  if (nav.up || nav.left && !isRange(items[ui.focus])) dir = -1;
  if (nav.down || nav.right && !isRange(items[ui.focus])) dir = 1;
  if (!dir && Math.abs(sy) > 0.6 && now > ui.repeatAt) {
    dir = Math.sign(sy);
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
      case 'resume': return closeAllAndResume();
      case 'close': return closeModal();
      case 'card': return openModal('card');
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause('Paused while the page was hidden.');
  });
  addEventListener('blur', () => pause('Paused while the window was in the background.'));
  input.onKind(() => {
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
    applySettings();
    await renderer.loadScene(game.scene, data.chains, data.drift);
    renderer.loadScene(data.scenes[(game.index + 1) % data.scenes.length], data.chains, data.drift);
  } catch (err) {
    console.error(err);
    $('.loading-text').textContent = 'This browser cannot show the collage: it needs WebGL 2.';
    return;
  }
  setupPointer();
  show('title');
  hint();
  window.fibreart = { game: () => game, ui, input, start, shift: (how) => shift(game, how), W, H, radius };
  requestAnimationFrame(frame);
}

boot();
