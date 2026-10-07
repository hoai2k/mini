// The shell: screens, menus and navigation, the field guide, the bird pages,
// and running a minigame (count-in, HUD, pause, results and medals).

import { createInput, BTN } from './input.js';
import * as audio from './audio.js';
import { loadSettings, saveSettings, loadProgress, recordScore, resetProgress } from './store.js';
import { BIRDS, medalFor, MEDAL_NAMES } from './birds.js';
import { loadGame, makeRng } from './games/index.js';
import { drawBird, drawSilhouette, paper, band, label, setArt, setBoil, art, PAL, INK } from './draw.js';
import { ASSETS } from './asset-list.js';

const W = 1600;
const H = 900;
const params = new URLSearchParams(location.search);
const FIXED_DT = Number(params.get('dt')) || 0; // for automated checks
const ALL_OPEN = params.has('all');

const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const g = canvas.getContext('2d');
const input = createInput(canvas);
let settings = loadSettings();
let progress = loadProgress();

const S = {
  screen: 'title',
  modals: [], // stack of open modal ids
  titleUtil: false,
  bird: 0, // index into BIRDS
  game: null,
  gameId: null,
  phase: 'idle', // 'howto' | 'count' | 'play' | 'over' | 'result'
  count: 0,
  overT: 0,
  paused: false,
  t: 0,
  confirmFn: null,
  seed: 1,
};

// ---------- assets ----------

async function loadArt() {
  const map = new Map();
  await Promise.all(
    Object.entries(ASSETS)
      .filter(([, a]) => a.delivered)
      .map(
        ([key, a]) =>
          new Promise((res) => {
            const img = new Image();
            img.onload = () => {
              map.set(key, img);
              res();
            };
            img.onerror = () => res();
            img.src = a.file;
          }),
      ),
  );
  setArt(map);
  if (map.has('logo')) {
    $('#logo-img').src = ASSETS.logo.file;
    $('#logo-img').hidden = false;
    $('#logo-text').hidden = true;
  }
}

// ---------- canvas sizing ----------

let view = { s: 1, ox: 0, oy: 0, cw: 0, ch: 0, dpr: 1 };
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  const s = Math.min(cw / W, ch / H);
  view = { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, cw, ch, dpr };
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
    for (const m of ['howto', 'pause', 'result']) $('#' + m).hidden = true;
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
    const golds = BIRDS.filter((b) => medalFor(b, best(b.id)) === 3).length;
    $('#gathering-count').textContent = `${golds} of ${BIRDS.length} gold medals`;
    audio.playMusic('menu');
    focusFirst();
  }
}

function openModal(id) {
  S.modals.push(id);
  const el = $('#' + id);
  el.hidden = false;
  el.dataset.returnFocus = document.activeElement?.id || '';
  el._returnTo = document.activeElement;
  if (id === 'settings') syncSettingsUi();
  input.lockHeld();
  focusFirst();
}

function closeModal() {
  const id = S.modals.pop();
  if (!id) return;
  const el = $('#' + id);
  el.hidden = true;
  input.lockHeld();
  const back = el._returnTo;
  if (back && document.contains(back) && !back.closest('[hidden]')) back.focus();
  else focusFirst();
}

function layer() {
  if (S.modals.length) return $('#' + S.modals[S.modals.length - 1]);
  if (S.screen === 'play') {
    for (const m of ['result', 'pause', 'howto']) if (!$('#' + m).hidden) return $('#' + m);
    return null;
  }
  return $('#' + S.screen);
}

function navItems() {
  const l = layer();
  if (!l) return [];
  return [...l.querySelectorAll('[data-nav]')].filter((e) => !e.closest('[hidden]') && !e.disabled && e.offsetParent !== null);
}

function focusFirst() {
  const items = navItems();
  const primary = items.find((e) => e.classList.contains('primary')) || items[0];
  if (primary) primary.focus({ preventScroll: false });
}

function moveFocus(dx, dy) {
  const items = navItems();
  if (!items.length) return;
  const cur = document.activeElement;
  if (!items.includes(cur)) {
    focusFirst();
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
const medalOf = (i) => medalFor(BIRDS[i], best(BIRDS[i].id));
const unlocked = (i) => ALL_OPEN || i === 0 || medalOf(i - 1) >= 1;

function buildGuide() {
  const wrap = $('#cards');
  wrap.textContent = '';
  BIRDS.forEach((b, i) => {
    const open = unlocked(i);
    const m = medalOf(i);
    const card = document.createElement('button');
    card.className = 'card' + (open ? '' : ' locked');
    card.dataset.nav = '';
    card.dataset.bird = i;
    card.setAttribute('aria-label', open ? `${b.name}${m ? ', ' + MEDAL_NAMES[m] + ' medal' : ''}` : `Page ${i + 1}, not yet spotted`);
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = open ? b.name.replace(/^The /, '') : 'Not yet spotted';
    const sub = document.createElement('span');
    sub.className = 'card-sub';
    sub.textContent = open ? b.game : `Page ${i + 1}`;
    card.append(cv, name, sub);
    if (m) {
      const md = document.createElement('span');
      md.className = 'medal m' + m;
      md.textContent = ['', 'B', 'S', 'G'][m];
      md.setAttribute('aria-hidden', 'true');
      card.append(md);
    }
    card.addEventListener('click', () => {
      audio.unlock();
      if (!open) {
        toast(`Win a medal on page ${i} to open this one.`);
        audio.sfx('back');
        return;
      }
      audio.sfx('page');
      S.bird = i;
      show('page');
    });
    wrap.append(card);
  });
  const medals = BIRDS.filter((b, i) => medalOf(i) > 0).length;
  const golds = BIRDS.filter((b, i) => medalOf(i) === 3).length;
  $('#guide-count').textContent = `${medals} of ${BIRDS.length} birds spotted · ${golds} gold`;
  $('#gathering-btn').hidden = medals < BIRDS.length && !ALL_OPEN;
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
    const opts = { x: w / 2 + size * 0.08, y: h * 0.96, size, t: card === document.activeElement ? t : 0, pose: { growth: 0.9, light: 'green', fill: 0.6 } };
    if (unlocked(i)) drawBird(c, BIRDS[i].id, opts);
    else drawSilhouette(c, BIRDS[i].id, opts);
  }
}

// ---------- a bird's page ----------

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
  const m = medalOf(S.bird);
  $('#page-best').innerHTML = best(b.id)
    ? `Best: ${best(b.id)} ${b.score} · <span class="dot m${m}"></span>${MEDAL_NAMES[m]}`
    : `Bronze ${b.medals[0]} · Silver ${b.medals[1]} · Gold ${b.medals[2]}`;
  focusFirst();
  if (settings.readAloud) readAloud();
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
  showHowto();
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

function showHowto() {
  const b = BIRDS[S.bird];
  S.phase = 'howto';
  $('#howto-title').textContent = b.game;
  $('#howto-goal').textContent = b.goal;
  const ul = $('#howto-controls');
  ul.textContent = '';
  for (const l of controlLines(b)) {
    const li = document.createElement('li');
    li.textContent = l;
    ul.append(li);
  }
  const tips = $('#howto-tips');
  tips.textContent = '';
  for (const l of b.tips) {
    const li = document.createElement('li');
    li.textContent = l;
    tips.append(li);
  }
  $('#howto-medals').innerHTML = ['Bronze', 'Silver', 'Gold'].map((n, k) => `<span><span class="dot m${k + 1}"></span>${n} ${b.medals[k]}</span>`).join('');
  $('#howto-go').textContent = pad() ? 'Start (A)' : input.kind === 'pointer' ? 'Start' : 'Start (Space)';
  $('#howto').hidden = false;
  $('#pause').hidden = true;
  $('#result').hidden = true;
  input.lockHeld();
  focusFirst();
}

function begin() {
  $('#howto').hidden = true;
  $('#hud-game').textContent = BIRDS[S.bird].game;
  S.phase = 'count';
  S.count = 3.2;
  S.paused = false;
  input.lockHeld();
  audio.sfx('tick');
}

function restart() {
  if (!S.factory) return;
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
  audio.suspend(false);
  input.lockHeld();
  focusFirst();
}

function resume() {
  if (S.modals.length) return;
  S.paused = false;
  $('#pause').hidden = true;
  input.lockHeld();
}

function finish() {
  const b = BIRDS[S.bird];
  const score = Math.round(S.game.score);
  const before = medalOf(S.bird);
  const isBest = recordScore(progress, b.id, score);
  const m = medalFor(b, score);
  const now = medalOf(S.bird);
  S.phase = 'result';
  const md = $('#result-medal');
  md.className = 'result-medal m' + m;
  md.textContent = m ? MEDAL_NAMES[m] : 'Try again!';
  $('#result-title').textContent = m === 3 ? 'Gold!' : m ? 'Well done!' : 'Time!';
  $('#result-score').textContent = `${score} ${b.score}`;
  const next = b.medals[m];
  $('#result-best').textContent = (isBest && score > 0 ? 'A new best! ' : `Best: ${best(b.id)}. `) + (next !== undefined ? `${MEDAL_NAMES[m + 1]} at ${next}.` : 'The best there is.');
  const extra = $('#result-extra');
  extra.textContent = '';
  for (const line of S.game.summary?.() || []) {
    const p = document.createElement('p');
    p.textContent = line;
    extra.append(p);
  }
  if (before === 0 && now > 0 && S.bird + 1 < BIRDS.length) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>A new page is open: ${BIRDS[S.bird + 1].name}!</strong>`;
    extra.append(p);
  }
  const nextBtn = $('#result-next');
  const allDone = BIRDS.every((_, i) => medalOf(i) > 0);
  if (S.bird + 1 < BIRDS.length) {
    nextBtn.textContent = 'Next bird';
    nextBtn.disabled = !unlocked(S.bird + 1);
  } else {
    nextBtn.textContent = allDone ? 'All the birds together' : 'Next bird';
    nextBtn.disabled = !allDone;
  }
  $('#result').hidden = false;
  audio.sfx('medal', { level: m });
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
    case 'read':
      readAloud();
      break;
    case 'begin':
      begin();
      break;
    case 'page':
      show('page');
      break;
    case 'pause':
      pause();
      break;
    case 'resume':
      resume();
      break;
    case 'howto':
      S.paused = true;
      $('#pause').hidden = true;
      showHowto();
      break;
    case 'restart':
      restart();
      break;
    case 'quit-page':
      confirm('Leave this game?', 'Your score in this round will not count.', () => show('page'));
      break;
    case 'quit-title':
      confirm('Return to the title?', 'Your score in this round will not count.', () => show('title'));
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
      confirm('Forget all medals?', 'Every bird’s best score is cleared, and only the first page stays open.', () => {
        resetProgress();
        progress = loadProgress();
        if (S.screen === 'guide') buildGuide();
        toast('Medals forgotten.');
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
    else if (!$('#howto').hidden) show('page');
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

  if (input.padPressed(BTN.A)) {
    const f = document.activeElement;
    if (navItems().includes(f)) f.click();
    else focusFirst();
  }
  if (n.back) back();
  else if (n.pause && S.screen === 'play' && !S.modals.length && !$('#pause').hidden) resume();
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

  render(dt);
  input.endFrame();
  requestAnimationFrame(frame);
}

// ---------- rendering ----------

function render() {
  const t = S.t;
  if (S.screen === 'play' && S.game) {
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
  logical();
  if (S.screen === 'title') renderTitle(t);
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

function renderTitle(t) {
  const bg = art('titleBg');
  if (bg) {
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const s = Math.max(view.cw / bg.width, view.ch / bg.height);
    g.drawImage(bg, (view.cw - bg.width * s) / 2, (view.ch - bg.height * s) / 2, bg.width * s, bg.height * s);
    return;
  }
  band(g, -200, 760, W + 400, 300, PAL.sage, 0.45, 4);
  band(g, -200, 800, W + 400, 300, PAL.green, 0.3, 5);
  // a parade of birds walking across the bottom
  const speed = settings.reduceMotion ? 0 : 40;
  BIRDS.forEach((b, i) => {
    const span = W + 600;
    const x = ((i * 230 - t * speed) % span + span) % span - 300;
    const hop = settings.reduceMotion ? 0 : Math.abs(Math.sin(t * 3 + i)) * 6;
    drawBird(g, b.id, { x, y: 860 - hop, size: 200, t: t + i, pose: { growth: 0.85, light: ['red', 'amber', 'green'][Math.floor(t / 2) % 3], fill: 0.5, sing: 0.5 } });
  });
}

function renderPage(t) {
  const b = BIRDS[S.bird];
  const portrait = view.cw < view.ch;
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
  const size = portrait ? 520 : 640;
  const pose = { growth: (Math.sin(t * 0.5) + 1) / 2, light: ['green', 'amber', 'red'][Math.floor(t / 1.6) % 3], fill: (Math.sin(t * 0.8) + 1) / 2, sing: Math.abs(Math.sin(t * 2)), click: (t % 3) < 0.2 ? (t % 3) : 0, lift: Math.sin(t * 2) > 0.6 ? -1 : Math.sin(t * 2) < -0.6 ? 1 : 0, wind: 1 };
  drawBird(g, b.id, { x: cx + size * 0.06, y: cy + size * 0.55, size, t, pose });
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
      const m = medalOf(BIRDS.indexOf(b));
      if (m) {
        g.beginPath();
        g.arc(x + 70, y - (r ? 330 : 280) + 20, 18, 0, Math.PI * 2);
        g.fillStyle = ['', '#b77a4a', '#9aa0a8', '#d8a62a'][m];
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = INK;
        g.stroke();
      }
    });
  });
  label(g, '', W / 2, 60);
}

// ---------- pausing on focus loss and controller loss ----------

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause('The game paused while you were away.');
});
addEventListener('blur', () => pause('The game paused while you were away.'));
addEventListener('gamepaddisconnected', () => {
  if (input.kind === 'controller') pause('The controller disconnected. Reconnect it, or carry on with the keyboard or touch.');
});
addEventListener('gamepadconnected', () => toast('Controller connected.'));

// ---------- boot ----------

applySettings();
resize();
show('title');
loadArt();
requestAnimationFrame((n) => {
  last = n;
  frame(n);
});

// For automated checks.
globalThis.__coot = { S, act, BIRDS, startBird, show, get progress() { return progress; } };
