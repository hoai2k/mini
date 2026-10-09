// The shell: screens, menus and navigation, the field guide, the bird pages,
// and running a minigame (count-in, HUD, pause, results and best scores).

import { createInput, BTN } from './input.js';
import * as audio from './audio.js';
import { loadSettings, saveSettings, loadProgress, recordScore, resetProgress } from './store.js';
import { BIRDS, passes } from './birds.js';
import { loadGame, makeRng } from './games/index.js';
import { drawBird, drawSilhouette, paper, band, label, setArt, setBoil, art, PAL, INK } from './draw.js';
import { ASSETS } from './asset-list.js';
import './subjects.js';
import { loadMoreBirds } from './more/index.js';

const W = 1600;
const H = 900;
const params = new URLSearchParams(location.search);
const FIXED_DT = Number(params.get('dt')) || 0; // for automated checks
const ALL_OPEN = params.has('all');
// Preview: the book's other birds whose games are built but not yet in the guide.
if (params.has('more')) BIRDS.push(...(await loadMoreBirds((params.get('more') || '').split(',').filter(Boolean))));

const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const g = canvas.getContext('2d');
const input = createInput(canvas);
let settings = loadSettings();
let progress = loadProgress();

const S = {
  screen: 'loading',
  modals: [], // stack of open modal ids
  titleUtil: false,
  bird: 0, // index into BIRDS
  game: null,
  gameId: null,
  phase: 'idle', // 'loading' | 'count' | 'play' | 'over' | 'result'
  count: 0,
  overT: 0,
  paused: false,
  t: 0,
  confirmFn: null,
  seed: 1,
};

// ---------- assets ----------

// Every delivered picture, loaded before the game shows anything, with a
// loading bar meanwhile: nothing drawn in code ever stands in for a picture
// that has been delivered.
async function loadArt() {
  const map = new Map();
  const todo = Object.entries(ASSETS).filter(([, a]) => a.delivered);
  let done = 0;
  const bar = $('#loading-fill');
  await Promise.all(
    todo.map(
      ([key, a]) =>
        new Promise((res) => {
          const img = new Image();
          img.onload = () => {
            map.set(key, img);
            res();
          };
          img.onerror = () => {
            console.warn('[art] could not load', a.file);
            res();
          };
          img.src = a.file;
        }).then(() => {
          done++;
          bar.style.width = `${Math.round((done / todo.length) * 100)}%`;
          bar.parentElement.setAttribute('aria-valuenow', Math.round((done / todo.length) * 100));
        }),
    ),
  );
  setArt(map);
}

// ---------- canvas sizing ----------

let view = { s: 1, ox: 0, oy: 0, cw: 0, ch: 0, dpr: 1 };
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  view = { cw, ch, dpr };
  fitView();
}

// The whole scene, letterboxed: for the menus, and for play on wide screens.
function fitView() {
  const { cw, ch, dpr } = view;
  const s = Math.min(cw / W, ch / H);
  view = { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, cw, ch, dpr };
}

// In play on a narrow (portrait) screen, fitting the whole 1600-wide scene
// would make it tiny. Instead the scene keeps a playable size, at least the
// game's `span` across, and the view follows the game's `focus` left and
// right, never past the scene's edges.
let camX = W / 2;
function playView(dt) {
  const { cw, ch, dpr } = view;
  const gm = S.game;
  const span = gm?.span || 760;
  const s = Math.min(ch / H, Math.max(cw / W, cw / span));
  const want = gm?.focus ? gm.focus() : W / 2;
  camX = Math.abs(want - camX) > W ? want : camX + (want - camX) * Math.min(1, dt * 6);
  const ox = Math.min(0, Math.max(cw - W * s, cw / 2 - camX * s));
  view = { s, ox: W * s <= cw ? (cw - W * s) / 2 : ox, oy: (ch - H * s) / 2, cw, ch, dpr };
}
addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
input.setPointerMap((cx, cy) => {
  const r = canvas.getBoundingClientRect();
  return [(cx - r.left - view.ox) / view.s, (cy - r.top - view.oy) / view.s];
});

// Draw in logical 1600 x 900 units, letterboxed on paper.
function logical() {
  g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  paper(g, view.cw, view.ch);
  g.setTransform(view.dpr * view.s, 0, 0, view.dpr * view.s, view.dpr * view.ox, view.dpr * view.oy);
}

// ---------- screens and modals ----------

const SCREENS = ['title', 'guide', 'page', 'gathering'];

function show(screen) {
  S.screen = screen;
  for (const id of SCREENS) $('#' + id).hidden = id !== screen;
  $('#hud').hidden = screen !== 'play';
  if (screen !== 'play') {
    closeAll();
    for (const m of ['pause', 'result']) $('#' + m).hidden = true;
    S.phase = 'idle';
    S.game = null;
  }
  input.lockHeld();
  if (screen === 'title') {
    S.titleUtil = false;
    $('#title-hint').hidden = false;
    focusFirst();
    audio.playMusic('menu');
  } else if (screen === 'guide') {
    buildGuide();
    audio.playMusic('menu');
  } else if (screen === 'page') {
    fillPage();
    audio.playMusic(BIRDS[S.bird].tune === 'night' ? 'night' : 'menu');
  } else if (screen === 'gathering') {
    $('#gathering-count').textContent = `Every one of the ${BIRDS.length} rare birds, spotted.`;
    audio.playMusic('menu');
    focusFirst();
  }
}

// Only the dialog on top shows; what it was opened from steps out of sight.
function underTop() {
  const top = S.modals.at(-1);
  for (const el of document.querySelectorAll('.modal')) el.classList.toggle('under', !!top && el.id !== top);
}

function openModal(id) {
  S.modals.push(id);
  const el = $('#' + id);
  el.hidden = false;
  el.dataset.returnFocus = document.activeElement?.id || '';
  el._returnTo = document.activeElement;
  if (id === 'settings') syncSettingsUi();
  if (id === 'howto') fillHowto();
  el.querySelector('.leaf-hint')?.replaceChildren(leafHint());
  underTop();
  input.lockHeld();
  focusFirst();
}

function closeModal() {
  const id = S.modals.pop();
  if (!id) return;
  const el = $('#' + id);
  el.hidden = true;
  underTop();
  input.lockHeld();
  const back = el._returnTo;
  if (back && document.contains(back) && !back.closest('[hidden]')) back.focus();
  else focusFirst();
}

// Close every dialog at once (leaving play, or straight back to the game).
function closeAll() {
  for (const id of S.modals.splice(0)) $('#' + id).hidden = true;
  underTop();
}

// A leaf page (How to play, Controls) has nothing to choose but its one
// button: A goes straight back to the game, B one step back.
function leafHint() {
  const inGame = S.screen === 'play';
  if (pad()) return inGame ? 'A: back to the game · B: back' : 'A or B: close';
  if (input.kind === 'keyboard') return inGame ? 'Enter: back to the game · Esc: back' : 'Enter or Esc: close';
  return inGame ? 'Tap outside to go back to the game' : 'Tap outside to close';
}

// Straight back to the game from anywhere in the pause menu.
function toGame() {
  closeAll();
  if (S.screen === 'play' && S.paused && $('#result').hidden) resume();
  else focusFirst();
}

function layer() {
  if (S.modals.length) return $('#' + S.modals[S.modals.length - 1]);
  if (S.screen === 'play') {
    for (const m of ['result', 'pause']) if (!$('#' + m).hidden) return $('#' + m);
    return null;
  }
  return $('#' + S.screen);
}

function navItems() {
  const l = layer();
  if (!l) return [];
  return [...l.querySelectorAll('[data-nav]')].filter((e) => !e.closest('[hidden]') && !e.disabled && e.offsetParent !== null);
}

function focusFirst(force = false) {
  // On a leaf page nothing is chosen until the stick moves, so A goes back.
  if (!force && layer()?.hasAttribute('data-leaf')) {
    document.activeElement?.blur?.();
    return;
  }
  const items = navItems();
  const primary = items.find((e) => e.classList.contains('primary')) || items[0];
  if (primary) primary.focus({ preventScroll: S.screen === 'page' });
}

function moveFocus(dx, dy) {
  const items = navItems();
  if (!items.length) return;
  const cur = document.activeElement;
  if (!items.includes(cur)) {
    focusFirst(true);
    return;
  }
  const r0 = cur.getBoundingClientRect();
  const c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
  let bestEl = null;
  let bestScore = Infinity;
  for (const e of items) {
    if (e === cur) continue;
    const r = e.getBoundingClientRect();
    const c = [r.left + r.width / 2, r.top + r.height / 2];
    const vx = c[0] - c0[0];
    const vy = c[1] - c0[1];
    const along = vx * dx + vy * dy;
    if (along <= 4) continue;
    const across = Math.abs(vx * dy - vy * dx);
    const score = along + across * 2.2;
    if (score < bestScore) {
      bestScore = score;
      bestEl = e;
    }
  }
  if (!bestEl) {
    // Nothing that way: step through the list in order instead.
    const i = items.indexOf(cur);
    const step = dx + dy > 0 ? 1 : -1;
    bestEl = items[(i + step + items.length) % items.length];
  }
  bestEl.focus();
  bestEl.scrollIntoView?.({ block: 'nearest' });
  audio.sfx('move');
}

// ---------- the guide ----------

const best = (id) => progress[id]?.best || 0;
const passed = (i) => passes(BIRDS[i], best(BIRDS[i].id));
const unlocked = (i) => ALL_OPEN || i === 0 || passed(i - 1);

function buildGuide() {
  const wrap = $('#cards');
  wrap.textContent = '';
  BIRDS.forEach((b, i) => {
    const open = unlocked(i);
    const hi = best(b.id);
    const card = document.createElement('button');
    card.className = 'card' + (open ? '' : ' locked');
    card.dataset.nav = '';
    card.dataset.bird = i;
    card.setAttribute('aria-label', open ? `${b.name}${hi ? ', best ' + hi : ''}` : `Page ${i + 1}, not yet spotted`);
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = open ? b.name.replace(/^The /, '') : 'Not yet spotted';
    const sub = document.createElement('span');
    sub.className = 'card-sub';
    sub.textContent = open ? (hi ? `${b.game} · best ${hi}` : b.game) : `Page ${i + 1}`;
    card.append(cv, name, sub);
    card.addEventListener('click', () => {
      audio.unlock();
      if (!open) {
        toast(`Score ${BIRDS[i - 1].pass} on page ${i} to open this one.`);
        audio.sfx('back');
        return;
      }
      audio.sfx('page');
      S.bird = i;
      show('page');
    });
    wrap.append(card);
  });
  const spotted = BIRDS.filter((b, i) => passed(i)).length;
  $('#guide-count').textContent = `${spotted} of ${BIRDS.length} birds spotted`;
  $('#gathering-btn').hidden = spotted < BIRDS.length && !ALL_OPEN;
  const target = wrap.children[Math.min(S.bird, BIRDS.length - 1)];
  target?.focus();
}

function drawCards(t) {
  for (const card of document.querySelectorAll('#cards .card')) {
    const cv = card.querySelector('canvas');
    const i = Number(card.dataset.bird);
    const dpr = view.dpr;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) continue;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = Math.min(h * 0.92, w * 1.0);
    const opts = { x: w / 2 + size * 0.08, y: h * 0.96, size, t: card === document.activeElement ? t : 0, pose: { growth: 0.2, light: 'green', fill: 0.6 } }; // the Plume as a sprout, so it fits its card
    if (unlocked(i)) drawBird(c, BIRDS[i].id, opts);
    else drawSilhouette(c, BIRDS[i].id, opts);
  }
}

// ---------- a bird's page ----------

// What it takes to open the next page (or, on the last page, to finish).
function goalLine(b) {
  const i = BIRDS.indexOf(b);
  return i + 1 < BIRDS.length ? `Score ${b.pass} to open the next page` : `Score ${b.pass} to spot every bird`;
}

function fillPage() {
  const b = BIRDS[S.bird];
  $('#page-number').textContent = `Page ${S.bird + 1} of ${BIRDS.length}`;
  $('#page-name').textContent = b.name;
  $('#page-object').textContent = `A rare bird that is ${b.object}.`;
  const r = $('#page-rhyme');
  r.textContent = '';
  for (const line of b.rhyme) {
    const p = document.createElement('p');
    p.textContent = line;
    r.append(p);
  }
  $('#page-game').textContent = b.game;
  $('#page-goal').textContent = b.goal;
  fillList($('#page-controls'), controlLines(b));
  fillList($('#page-tips'), b.tips);
  S.pageKind = input.kind;
  $('#page-best').textContent = [best(b.id) ? `Best: ${best(b.id)} ${b.score}` : '', passed(S.bird) ? '' : goalLine(b)].filter(Boolean).join(' · ');
  focusFirst();
  if (settings.readAloud) readAloud();
}

function fillList(ul, lines) {
  ul.textContent = '';
  for (const l of lines) {
    const li = document.createElement('li');
    li.textContent = l;
    ul.append(li);
  }
}

function readAloud() {
  const b = BIRDS[S.bird];
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${b.name}. ${b.rhyme.join(' ')}`);
    u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch {
    toast('Reading aloud is not available in this browser.');
  }
}

function turnPage(d) {
  let i = S.bird + d;
  if (i < 0 || i >= BIRDS.length) return;
  if (!unlocked(i)) {
    toast('That page is not open yet.');
    return;
  }
  S.bird = i;
  try { speechSynthesis.cancel(); } catch { /* no speech */ }
  audio.sfx('page');
  fillPage();
}

// ---------- playing a minigame ----------

const pad = () => input.kind === 'controller';

function controlLines(b) {
  const k = input.kind;
  const by = {
    move: { controller: 'Left stick or D-pad', keyboard: 'Arrow keys or WASD', pointer: 'Move the mouse or your finger' },
    action: { controller: 'A', keyboard: 'Space', pointer: 'Click or tap' },
    steps: { controller: 'LB / RB (or D-pad ◀ ▶)', keyboard: '← / →', pointer: 'Tap the left or right half' },
    wind: { controller: 'Spin the left stick', keyboard: 'Tap Space (or ← →) between notes', pointer: 'Drag in circles' },
  };
  const C = (key) => by[key][k] || by[key].keyboard;
  const lines = {
    coot: [`Move: ${C('move')}`],
    cupadee: [`Pour: hold ${C('action')}, and let go at the line`],
    shuttercluck: [`Aim: ${C('move')}`, `Take a picture: ${C('action')}`],
    gullfinch: [`Sing a note: ${C('action')}`, `Wind the spring: ${C('wind')}`],
    plume: [`Move the watering can: ${C('move')}`, `Water: hold ${C('action')}`],
    bobolinks: [`Step: ${C('steps')}`],
    peeper: [`Move: ${C('move')}`],
    piffle: [`Steer: ${C('move')}`, k === 'pointer' ? 'Sew faster: hold high up the quilt' : `Sew faster: hold ${C('action')}`],
    dodo: [`Choose a hat: ${C('move')}`, `Pick it: ${C('action')}`],
    crow: [`Switch the light: ${C('action')}`],
  };
  // A bird entry can list its own: [label, input] pairs (input one of the
  // keys above, or plain text), with an optional third item for touch.
  if (!lines[b.id] && b.controls) {
    return b.controls.map(([label, key, touch]) => (k === 'pointer' && touch ? touch : `${label}: ${by[key] ? C(key) : key}`));
  }
  return lines[b.id] || [];
}

async function startBird(i) {
  S.bird = i;
  const b = BIRDS[i];
  show('play');
  S.phase = 'loading';
  const factory = await loadGame(b.id);
  if (!factory) {
    toast('This bird’s game is still being built.');
    show('page');
    return;
  }
  S.factory = factory;
  newGame();
  begin();
  audio.playMusic(b.tune || 'play');
}

function newGame() {
  const b = BIRDS[S.bird];
  S.seed = (Date.now() & 0xffff) + 1;
  S.game = S.factory({
    W,
    H,
    rng: makeRng(S.seed),
    sfx: audio.sfx,
    vibrate,
    reduceMotion: settings.reduceMotion,
  });
  S.gameId = b.id;
}

// How to play, from the pause menu: the same card as the bird's page.
function fillHowto() {
  const b = BIRDS[S.bird];
  $('#howto-title').textContent = b.game;
  $('#howto-goal').textContent = b.goal;
  fillList($('#howto-controls'), controlLines(b));
  fillList($('#howto-tips'), b.tips);
  $('#howto-score').textContent = [passed(S.bird) ? '' : goalLine(b), best(b.id) ? `Your best: ${best(b.id)}` : ''].filter(Boolean).join(' · ');
}

function begin() {
  $('#hud-game').textContent = BIRDS[S.bird].game;
  S.phase = 'count';
  S.count = 3.2;
  S.paused = false;
  input.lockHeld();
  audio.sfx('tick');
}

function restart() {
  if (!S.factory) return;
  closeAll();
  $('#pause').hidden = true;
  $('#result').hidden = true;
  newGame();
  begin();
}

function pause(reason = '') {
  if (S.screen !== 'play' || (S.phase !== 'play' && S.phase !== 'count') || S.paused) return;
  S.paused = true;
  $('#pause-reason').textContent = reason;
  $('#pause').hidden = false;
  input.lockHeld();
  focusFirst();
}

function resume() {
  if (S.modals.length || !S.paused) return;
  S.paused = false;
  $('#pause').hidden = true;
  input.lockHeld();
}

// A score word for one: blooms, dishes, glasses → bloom, dish, glass.
const one = (word) => word.replace(/(ches|shes|sses|xes)$/, (m) => m.slice(0, -2)).replace(/s$/, '');

function finish() {
  const b = BIRDS[S.bird];
  const score = Math.round(S.game.score);
  const before = passed(S.bird);
  const record = recordScore(progress, b.id, score) && score > 0;
  const now = passed(S.bird);
  S.phase = 'result';
  // A best that still falls short of the next page is only a personal one.
  $('#result-title').textContent = !record ? 'Time!' : passes(b, score) ? 'New World Record!' : 'Personal Best!';
  $('#result-score').textContent = `${score} ${score === 1 ? one(b.score) : b.score}`;
  $('#result-best').textContent = [record ? '' : `Best: ${best(b.id)}.`, now ? '' : goalLine(b) + '.'].filter(Boolean).join(' ');
  const extra = $('#result-extra');
  extra.textContent = '';
  for (const line of S.game.summary?.() || []) {
    const p = document.createElement('p');
    p.textContent = line;
    extra.append(p);
  }
  if (!before && now && S.bird + 1 < BIRDS.length) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>A new page is open: ${BIRDS[S.bird + 1].name}!</strong>`;
    extra.append(p);
  }
  // Two choices: on to the next bird after a round that reaches the score,
  // or another go after one that doesn't; the first is the default.
  const go = $('#result-go');
  const won = passes(b, score);
  go.dataset.action = won ? 'next' : 'restart';
  go.textContent = !won ? 'Play Again' : S.bird + 1 < BIRDS.length ? 'Next Bird' : 'All the Birds Together';
  $('#result').hidden = false;
  audio.sfx('medal', { level: record ? 2 : now ? 1 : 0 });
  input.lockHeld();
  focusFirst();
}

function vibrate(ms = 80) {
  if (!settings.vibration) return;
  for (const gp of navigator.getGamepads?.() || []) {
    try {
      gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: 0.5, weakMagnitude: 0.5 });
    } catch { /* not supported */ }
  }
}

// ---------- actions ----------

function act(action, el) {
  audio.unlock();
  switch (action) {
    case 'start':
      requestFullscreen();
      audio.sfx('go');
      show('guide');
      break;
    case 'fullscreen':
      toggleFullscreen();
      break;
    case 'title':
      show('title');
      break;
    case 'guide':
      try { speechSynthesis.cancel(); } catch { /* no speech */ }
      show('guide');
      break;
    case 'gathering':
      show('gathering');
      break;
    case 'play':
      try { speechSynthesis.cancel(); } catch { /* no speech */ }
      startBird(S.bird);
      break;
    case 'pause':
      pause();
      break;
    case 'back':
      back();
      break;
    case 'restart':
      restart();
      break;
    case 'quit-guide':
      confirm('Leave this game?', 'Your score in this round will not count.', () => show('guide'));
      break;
    case 'next':
      if (S.bird + 1 < BIRDS.length) startBird(S.bird + 1);
      else show('gathering');
      break;
    case 'close':
      closeModal();
      break;
    case 'confirm-yes': {
      const fn = S.confirmFn;
      S.confirmFn = null;
      closeModal();
      fn?.();
      break;
    }
    case 'reset-progress':
      confirm('Forget all scores?', 'Every bird’s best score is cleared, and only the first page stays open.', () => {
        resetProgress();
        progress = loadProgress();
        if (S.screen === 'guide') buildGuide();
        toast('Scores forgotten.');
      });
      break;
  }
}

function confirm(title, text, fn) {
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  S.confirmFn = fn;
  openModal('confirm');
}

document.addEventListener('click', (e) => {
  // A click on the dim backdrop outside a dialog: back to the game (or, for
  // a question, No).
  if (e.target.classList?.contains('modal') && e.target.id !== 'result') {
    audio.sfx('back');
    if (S.modals.at(-1) === 'confirm') closeModal();
    else toGame();
    return;
  }
  const el = e.target.closest('[data-action], [data-open]');
  if (!el || el.disabled) return;
  if (el.dataset.open) {
    audio.unlock();
    audio.sfx('ui');
    openModal(el.dataset.open);
  } else {
    if (el.dataset.action !== 'pause') audio.sfx('ui');
    act(el.dataset.action, el);
  }
});

// The B / Escape key: back out of whatever is on top.
function back() {
  if (S.modals.length) {
    audio.sfx('back');
    closeModal();
    return;
  }
  if (S.screen === 'play') {
    if (!$('#result').hidden) act('guide');
    else if (!$('#pause').hidden) resume();
    else pause();
    return;
  }
  audio.sfx('back');
  if (S.screen === 'page') show('guide');
  else if (S.screen === 'guide' || S.screen === 'gathering') show(S.screen === 'gathering' ? 'guide' : 'title');
  else if (S.screen === 'title' && S.titleUtil) {
    S.titleUtil = false;
    $('#press-start').focus();
  }
}

// ---------- fullscreen ----------

function requestFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen().catch(() => { /* refused: carry on windowed */ });
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else requestFullscreen();
}

// ---------- settings ----------

function syncSettingsUi() {
  for (const el of document.querySelectorAll('[data-setting]')) {
    const k = el.dataset.setting;
    if (el.type === 'checkbox') el.checked = !!settings[k];
    else {
      el.value = settings[k];
      const out = el.parentElement.querySelector('output');
      if (out) out.textContent = settings[k];
    }
  }
}
function applySettings() {
  audio.setVolumes(settings);
  setBoil(!settings.reduceMotion);
  document.body.classList.toggle('reduce-motion', settings.reduceMotion);
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.dataset?.setting) return;
  const k = el.dataset.setting;
  settings[k] = el.type === 'checkbox' ? el.checked : Number(el.value);
  saveSettings(settings);
  applySettings();
  syncSettingsUi();
});

// ---------- toast ----------

let toastTimer = 0;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- keyboard specifics ----------

addEventListener('keydown', (e) => {
  audio.unlock();
  const el = document.activeElement;
  const isRange = el?.type === 'range';
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    if (S.screen === 'play' && S.phase === 'play' && !S.paused) {
      e.preventDefault();
      return;
    }
    if (isRange && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return; // the slider moves
    e.preventDefault();
  }
  if (e.code === 'Space' && S.screen === 'play' && S.phase === 'play') e.preventDefault();
});

// ---------- the frame loop ----------

let last = performance.now();
let repeat = { dir: null, t: 0 };

function menuInput(dt) {
  const n = input.nav();
  const l = layer();

  // Title: idle until the stick moves; any fresh controller button starts.
  if (S.screen === 'title' && !S.modals.length) {
    const [sx, sy] = n.stick;
    if (!S.titleUtil && (Math.abs(sx) > 0.5 || Math.abs(sy) > 0.5)) {
      S.titleUtil = true;
      $('#title-hint').hidden = true;
      $('#press-start').focus();
      repeat = { dir: 'x', t: 0.35 };
      return;
    }
    if (!S.titleUtil && input.padAnyPressed()) {
      act('start');
      return;
    }
    if (S.titleUtil && input.padPressed(BTN.MENU)) {
      act('start');
      return;
    }
  }

  if (!l) return;

  // Directions, from the D-pad / arrows (fresh) or the stick (with repeat).
  let dx = 0;
  let dy = 0;
  if (n.left) dx = -1;
  else if (n.right) dx = 1;
  else if (n.up) dy = -1;
  else if (n.down) dy = 1;
  else {
    const [sx, sy] = n.stick;
    const dir = Math.abs(sx) > 0.55 ? (sx > 0 ? 'r' : 'l') : Math.abs(sy) > 0.55 ? (sy > 0 ? 'd' : 'u') : null;
    if (!dir) repeat = { dir: null, t: 0 };
    else if (dir !== repeat.dir) {
      repeat = { dir, t: 0.38 };
      [dx, dy] = { r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1] }[dir];
    } else {
      repeat.t -= dt;
      if (repeat.t <= 0) {
        repeat.t = 0.14;
        [dx, dy] = { r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1] }[dir];
      }
    }
  }

  // Shoulder buttons and arrows turn the bird's pages.
  if (S.screen === 'page' && !S.modals.length) {
    if (input.padPressed(BTN.LB)) turnPage(-1);
    if (input.padPressed(BTN.RB)) turnPage(1);
    if (dx) {
      turnPage(dx);
      dx = 0;
    }
  }

  const el = document.activeElement;
  if ((dx || dy) && el?.type === 'range' && dx && pad()) {
    el.value = Number(el.value) + dx * Number(el.step || 1);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (dx || dy) {
    // A keyboard arrow on a slider moves the slider, not the focus.
    if (!(el?.type === 'range' && dx && !pad())) moveFocus(dx, dy);
  }

  const chosen = navItems().includes(document.activeElement);
  const leaf = l.hasAttribute('data-leaf');
  if (input.padPressed(BTN.A)) {
    if (chosen) document.activeElement.click();
    else if (leaf) toGame();
    else focusFirst();
  } else if (n.confirm && leaf && !chosen) toGame(); // Enter or Space; a focused button clicks itself
  if (n.back) back();
  else if (n.pause && S.screen === 'play' && S.paused) toGame();
}

function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (FIXED_DT) dt = FIXED_DT;
  S.t += dt;
  input.poll();

  const playing = S.screen === 'play' && !S.paused && !S.modals.length;
  if (playing && S.phase === 'count') {
    const before = Math.ceil(S.count);
    S.count -= dt;
    const after = Math.ceil(S.count);
    const cd = $('#countdown');
    cd.hidden = false;
    cd.textContent = S.count > 0.4 ? String(Math.max(1, after - 0)) : 'Go!';
    if (after !== before && after > 0) audio.sfx('tick');
    if (S.count <= 0.4 && before > 0 && S.count + dt > 0.4) audio.sfx('go');
    if (S.count <= 0) {
      cd.hidden = true;
      S.phase = 'play';
      input.lockHeld();
    }
  } else if (playing && S.phase === 'play') {
    const st = input.state();
    S.game.update(dt, st);
    if (S.game.done) {
      S.phase = 'over';
      S.overT = 1.1;
      const cd = $('#countdown');
      cd.hidden = false;
      cd.textContent = 'Time!';
      audio.sfx('time');
    }
  } else if (playing && S.phase === 'over') {
    S.overT -= dt;
    if (S.overT <= 0) {
      $('#countdown').hidden = true;
      finish();
    }
  }
  const live = S.screen === 'play' && ['count', 'play', 'over'].includes(S.phase);
  if (live && !S.paused && !S.modals.length) {
    // In play only pause is read here; the game reads the rest.
    const n = input.nav();
    if (n.pause || (n.back && input.kind !== 'keyboard')) pause();
  } else menuInput(dt);
  if (S.screen === 'page' && S.pageKind !== input.kind) {
    S.pageKind = input.kind;
    fillList($('#page-controls'), controlLines(BIRDS[S.bird]));
  }

  render(dt);
  input.endFrame();
  requestAnimationFrame(frame);
}

// ---------- rendering ----------

function render(dt = 0) {
  const t = S.t;
  if (S.screen === 'play' && S.game) {
    playView(dt);
    logical();
    g.save();
    g.beginPath();
    g.rect(0, 0, W, H);
    g.clip();
    S.game.draw(g, S.paused ? 0 : t);
    g.restore();
    // a thin ink frame around the play area
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.strokeRect(0, 0, W, H);
    updateHud();
    return;
  }
  fitView();
  logical();
  if (S.screen === 'title') renderTitle();
  else if (S.screen === 'page') renderPage(t);
  else if (S.screen === 'gathering') renderGathering(t);
  else if (S.screen === 'guide') drawCards(t);
}

function updateHud() {
  const gm = S.game;
  $('#hud-status').textContent = gm.hud ? gm.hud() : `Score ${Math.round(gm.score)}`;
  const tm = $('#hud-timer');
  if (typeof gm.time === 'number') {
    tm.hidden = false;
    const s = Math.ceil(gm.time);
    tm.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    tm.classList.toggle('low', s <= 5);
  } else tm.hidden = true;
}

function renderTitle() {
  const bg = art('titleBg');
  if (!bg) return;
  g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const s = Math.max(view.cw / bg.width, view.ch / bg.height);
  g.drawImage(bg, (view.cw - bg.width * s) / 2, (view.ch - bg.height * s) / 2, bg.width * s, bg.height * s);
}

// A bird on its own page, gently doing its thing.
function pagePose(t) {
  return { growth: (Math.sin(t * 0.5) + 1) / 2, light: ['green', 'amber', 'red'][Math.floor(t / 1.6) % 3], fill: (Math.sin(t * 0.8) + 1) / 2, sing: Math.abs(Math.sin(t * 2)), click: (t % 3) < 0.2 ? (t % 3) : 0, lift: Math.sin(t * 2) > 0.6 ? -1 : Math.sin(t * 2) < -0.6 ? 1 : 0, wind: 1 };
}

// Birds that grow taller than their portrait (the Plume's bloom) are drawn a
// little smaller on their page, so the whole of them fits.
const PAGE_FIT = { plume: 0.78 };

function renderPage(t) {
  const b = BIRDS[S.bird];
  const fit = PAGE_FIT[b.id] || 1;
  const portrait = view.cw < view.ch;
  if (portrait) {
    // Upright phone: the text fills the lower part of the page, so the bird
    // is drawn at a good size in the space above it, in screen pixels.
    const top = $('.page-text').getBoundingClientRect().top;
    const area = Math.max(80, top - 16);
    const size = Math.min(area * 0.92, view.cw * 0.9) * fit;
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    g.save();
    g.globalAlpha = 0.35;
    g.fillStyle = b.color;
    g.beginPath();
    g.ellipse(view.cw / 2, area * 0.5 + 8, Math.min(view.cw * 0.45, size * 0.7), area * 0.46, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    drawBird(g, b.id, { x: view.cw / 2 + size * 0.06, y: 8 + area * 0.97, size, t, pose: pagePose(t) });
    return;
  }
  g.save();
  // a soft wash behind the bird, like a page's colour
  const cx = portrait ? W / 2 : W * 0.29;
  const cy = portrait ? 330 : 470;
  g.globalAlpha = 0.35;
  g.fillStyle = b.color;
  g.beginPath();
  g.ellipse(cx, cy, portrait ? 420 : 380, portrait ? 300 : 360, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  const size = (portrait ? 520 : 640) * fit;
  const pose = pagePose(t);
  drawBird(g, b.id, { x: cx + size * 0.06, y: cy + 352 + (fit < 1 ? 20 : 0), size, t, pose });
}

function renderGathering(t) {
  const img = art('gathering');
  if (img) {
    g.drawImage(img, 0, 0, W, H);
    return;
  }
  g.fillStyle = 'rgba(239,217,106,0.45)';
  g.fillRect(0, 0, W, H);
  band(g, 0, 800, W, 100, PAL.green, 0.4, 2);
  const rows = [BIRDS.slice(0, 5), BIRDS.slice(5)];
  rows.forEach((row, r) => {
    row.forEach((b, i) => {
      const x = 180 + i * 310 + (r ? 140 : 0);
      const y = r ? 860 : 520;
      drawBird(g, b.id, { x, y, size: r ? 330 : 280, t: t + i * 0.7 + r, pose: { growth: 1, light: 'green', fill: 0.7, sing: 0.6 } });
    });
  });
  label(g, '', W / 2, 60);
}

// ---------- pausing on focus loss and controller loss ----------

// Away from the tab (hidden, or the window not focused): pause, and silence
// everything, music, effects and reading aloud. Back again: the sound
// returns (the game stays paused until you resume).
function away() {
  pause('The game paused while you were away.');
  audio.suspend(true);
  try { speechSynthesis.cancel(); } catch { /* no speech */ }
}
function returned() {
  if (!document.hidden && document.hasFocus()) audio.suspend(false);
}
document.addEventListener('visibilitychange', () => (document.hidden ? away() : returned()));
addEventListener('blur', away);
addEventListener('focus', returned);
addEventListener('pageshow', returned);
addEventListener('gamepaddisconnected', () => {
  if (input.kind === 'controller') pause('The controller disconnected. Reconnect it, or carry on with the keyboard or touch.');
});
addEventListener('gamepadconnected', () => toast('Controller connected.'));

// ---------- boot ----------

applySettings();
resize();
requestAnimationFrame((n) => {
  last = n;
  frame(n);
});
// For automated checks.
globalThis.__coot = { S, act, BIRDS, startBird, show, get progress() { return progress; } };

await loadArt();
$('#loading').remove();
show('title');
