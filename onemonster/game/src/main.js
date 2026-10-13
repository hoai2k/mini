// The shell: screens and menus, the journey (solo, turn-taking or Snatch &
// Keep), story pages, and running a chapter (the card, the count-in, the HUD,
// pause, the snatch, the celebration and the postmarks). Chapters only play;
// see chapters/index.js for the contract.

import { createInput, BTN } from './engine/input.js';
import * as audio from './engine/audio.js';
import { loadSettings, saveSettings, loadProgress, saveProgress, resetProgress } from './engine/store.js';
import { CHAPTERS, loadChapterModule, makeRng } from './chapters/index.js';
import { BOARDS, loadBoardModule, boardArt } from './adventure/index.js';
import { MONSTERS } from './monsters.js';
import * as art from './art.js';

const W = 1920;
const H = 1080;
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
  modals: [],
  titleUtil: false,
  mode: { kind: 'journey', players: 1 }, // kind: 'adventure' | 'journey' | 'versus' | 'one' (list: 'adv' | 'mini')
  ci: 0, // chapter index 0..8
  factory: null,
  chapter: null,
  phase: 'idle', // 'count' | 'play' | 'over'
  count: 0,
  overT: 0,
  paused: false,
  t: 0,
  tally: [0],
  log: [], // per chapter: { ci, marks, outcome, snatcher, holder }
  story: null, // { pages: [{ image, text }], i, then }
  join: [null, null], // versus: each player's device sources
  confirmFn: null,
  tableau: null, // creatures drawn behind the card and the celebration
  lastMarks: [0, 0],
};

const STORY = {
  prologue: [{ image: 'story/prologue', text: 'One day Sally Ann wrote a letter to her best friend, Lucy Jane. She folded it into an envelope, put the envelope in her mailbox, and went back indoors to wait for the mailman. But the mailman was not the only one who had seen it go in.' }],
  epilogue: [
    { image: 'story/mailman', text: 'Then up roared an official mailman on an official-looking motorcycle. “Stand back from that mailbox!” he cried. He took out every letter and rode away, leaving the Yalapappus and the Trollusk wailing at the Grithix, who didn’t care a snickle.' },
    { image: 'story/lucyjane', text: 'And that afternoon, when Lucy Jane opened her mailbox, there was the letter: a little nibbled, a little gooey, and covered all over in postmarks. Nothing much ever happens around here, it said.' },
  ],
};

// ---------- canvas sizing ----------

let view = { s: 1, ox: 0, oy: 0, cw: 0, ch: 0, dpr: 1, ui: 1 };
const safeProbe = document.createElement('div');
safeProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
document.body.append(safeProbe);
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  const s = Math.min(cw / W, ch / H);
  // The touch controls keep one size, set by the short side of the screen, so
  // they sit the same under the thumbs in portrait and landscape.
  const ui = Math.min(cw, ch) / H;
  view = { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, cw, ch, dpr, ui };
  const cs = getComputedStyle(safeProbe);
  input.setControlSpace(cw / ui, ch / ui, parseFloat(cs.paddingRight) / ui || 0, parseFloat(cs.paddingBottom) / ui || 0);
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
document.addEventListener('fullscreenchange', resize);
// Touches are read in control space (screen pixels / view.ui), not in the
// scene, so a held stick does not drift while the camera moves.
input.setPointerMap((cx, cy) => {
  const r = canvas.getBoundingClientRect();
  return [(cx - r.left) / view.ui, (cy - r.top) / view.ui];
});

// ---------- the play camera ----------
// On a wide screen the whole 1920 x 1080 scene fits. On a narrow one (a phone
// held upright) fitting it would shrink the monsters to specks, so the scene
// keeps its full height and at least MIN_VIEW_W of its width, and the camera
// follows the player's monster across it, clamped to the scene's edges. In
// Snatch & Keep it frames both players, pulling back as far as it must.
const MIN_VIEW_W = 1000;
const cam = { x: W / 2, y: H / 2, s: 0, snap: true };
function playView(dt) {
  const { cw, ch } = view;
  const fit = view.s;
  const pts = (S.chapter.focus?.() || []).filter((p) => p && Number.isFinite(p.x));
  const use = S.mode.kind === 'versus' ? pts : pts.slice(0, 1);
  let wantW = MIN_VIEW_W;
  if (use.length > 1) wantW = Math.max(wantW, Math.max(...use.map((p) => p.x)) - Math.min(...use.map((p) => p.x)) + 560);
  let s = Math.max(fit, Math.min(ch / H, cw / wantW));
  if (s < fit * 1.1) s = fit; // nearly fits: show it all
  const fx = use.length ? use.reduce((a, p) => a + p.x, 0) / use.length : W / 2;
  const fy = use.length ? use.reduce((a, p) => a + (p.y ?? H / 2), 0) / use.length : H / 2;
  const k = cam.snap ? 1 : 1 - Math.exp(-5 * dt);
  cam.snap = false;
  cam.s += (s - cam.s) * k;
  cam.x += (fx - cam.x) * k;
  cam.y += (fy - cam.y) * k;
  const vw = cw / cam.s;
  const vh = ch / cam.s;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ox = vw >= W ? (cw - W * cam.s) / 2 : -clamp(cam.x - vw / 2, 0, W - vw) * cam.s;
  const oy = vh >= H ? (ch - H * cam.s) / 2 : -clamp(cam.y - vh / 2, 0, H - vh) * cam.s;
  return { ...view, s: cam.s, ox, oy };
}

function paperFill() {
  g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  g.fillStyle = '#2a1f19';
  g.fillRect(0, 0, view.cw, view.ch);
}
function logical(v = view) {
  paperFill();
  g.setTransform(v.dpr * v.s, 0, 0, v.dpr * v.s, v.dpr * v.ox, v.dpr * v.oy);
}
// Cover the whole window with an image (title, story pages).
function cover(img) {
  g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const s = Math.max(view.cw / img.width, view.ch / img.height);
  g.drawImage(img, (view.cw - img.width * s) / 2, (view.ch - img.height * s) / 2, img.width * s, img.height * s);
}

// ---------- screens and modals ----------

const SCREENS = ['title', 'modes', 'join', 'chapters', 'story', 'card', 'howto', 'celebrate', 'final'];

function show(screen) {
  S.screen = screen;
  for (const id of SCREENS) $('#' + id).hidden = id !== screen;
  $('#hud').hidden = screen !== 'play';
  if (screen !== 'play') {
    $('#pause').hidden = true;
    S.phase = 'idle';
    S.paused = false;
  }
  input.lockHeld();
  if (screen === 'title') {
    S.titleUtil = false;
    $('#title-hint').hidden = false;
    audio.playMusic('menu');
    $('#press-start').focus();
  } else if (screen === 'chapters') {
    buildChapters();
    audio.playMusic('menu');
  } else if (screen === 'join') {
    S.join = [null, null];
    input.setTouchZones(1);
    syncJoin();
    $('#join .menu-col').setAttribute('tabindex', '-1');
    $('#join .menu-col').focus();
  } else if (['modes', 'final'].includes(screen)) {
    audio.playMusic('menu');
    focusFirst();
  } else focusFirst();
}

function openModal(id) {
  S.modals.push(id);
  const el = $('#' + id);
  el.hidden = false;
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
  if (S.screen === 'play') return $('#pause').hidden ? null : $('#pause');
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
  if (primary) primary.focus({ preventScroll: true });
}
function moveFocus(dx, dy) {
  const items = navItems();
  if (!items.length) return;
  const cur = document.activeElement;
  if (!items.includes(cur)) { focusFirst(); return; }
  const r0 = cur.getBoundingClientRect();
  const c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
  let bestEl = null;
  let bestScore = Infinity;
  for (const e of items) {
    if (e === cur) continue;
    const r = e.getBoundingClientRect();
    const vx = r.left + r.width / 2 - c0[0];
    const vy = r.top + r.height / 2 - c0[1];
    const along = vx * dx + vy * dy;
    if (along <= 4) continue;
    const score = along + Math.abs(vx * dy - vy * dx) * 2.2;
    if (score < bestScore) { bestScore = score; bestEl = e; }
  }
  if (!bestEl) {
    const i = items.indexOf(cur);
    bestEl = items[(i + (dx + dy > 0 ? 1 : -1) + items.length) % items.length];
  }
  bestEl.focus();
  bestEl.scrollIntoView?.({ block: 'nearest' });
  audio.sfx('move');
}

// ---------- who plays what ----------

// The Adventure plays the side-scrolling boards; everything else the minigames.
const isAdv = () => S.mode.kind === 'adventure' || (S.mode.kind === 'one' && S.mode.list === 'adv');
const list = () => (isAdv() ? BOARDS : CHAPTERS);
const chapterOf = (ci) => list()[ci];
function snatcherPlayer(ci) {
  if (S.mode.kind === 'versus') return ci % 2;
  if (S.mode.kind === 'journey' || S.mode.kind === 'adventure') return ci % S.mode.players;
  return 0;
}
const holderPlayer = (ci) => (S.mode.kind === 'versus' ? 1 - snatcherPlayer(ci) : -1);
const pName = (p) => `Player ${p + 1}`;

// ---------- the chapters list (One Monster) ----------

// Progress is kept apart for the Adventure (advReached, advBest) and the minigames.
const reachedIn = (adv, ci) => ALL_OPEN || ci + 1 <= (adv ? progress.advReached || 1 : progress.reached);
const bestIn = (adv) => (adv ? (progress.advBest ||= {}) : progress.best);

function buildChapters() {
  const wrap = $('#chapter-cards');
  wrap.textContent = '';
  for (const adv of [true, false]) {
    const h = document.createElement('h3');
    h.className = 'cards-shelf';
    h.textContent = adv ? 'The Adventure' : 'The minigames';
    wrap.append(h);
    (adv ? BOARDS : CHAPTERS).forEach((c, ci) => wrap.append(chapterButton(adv, c, ci)));
  }
  wrap.querySelector('button')?.focus();
}

function chapterButton(adv, c, ci) {
    const open = reachedIn(adv, ci);
    const b = document.createElement('button');
    b.className = 'chapter-card' + (open ? '' : ' locked');
    b.dataset.nav = '';
    const M = MONSTERS[c.snatcher];
    if (open) b.style.backgroundImage = `url(${art.imageSrc('portraits/' + c.snatcher)})`;
    const word = adv ? 'Board' : 'Chapter';
    b.setAttribute('aria-label', open ? `${word} ${c.n}: ${c.title}, as ${M.name}` : `${word} ${c.n}, not yet reached`);
    const best = bestIn(adv)[c.n] || 0;
    b.innerHTML = `<span class="cc-n">${c.n}</span><span class="cc-title">${open ? c.title : 'Not yet reached'}</span><span class="cc-marks">${open ? `${M.short} · ${'✉'.repeat(best)}${'·'.repeat(3 - best)}` : ''}</span>`;
    b.addEventListener('click', () => {
      audio.unlock();
      if (!open) { toast(adv ? 'Play the Adventure to reach this board.' : 'Play the journey to reach this chapter.'); audio.sfx('back'); return; }
      audio.sfx('select');
      S.mode = { kind: 'one', players: 1, list: adv ? 'adv' : 'mini' };
      S.tally = [0];
      showCard(ci);
    });
    return b;
}

// ---------- story pages ----------

function showStory(pages, then) {
  S.story = { pages, i: 0, then };
  art.preload(pages.map((p) => p.image));
  $('#story-text').textContent = pages[0].text;
  show('story');
  audio.playMusic('menu');
  audio.sfx('page');
}
function storyNext() {
  const st = S.story;
  if (!st) return;
  st.i++;
  if (st.i >= st.pages.length) { S.story = null; st.then(); return; }
  $('#story-text').textContent = st.pages[st.i].text;
  audio.sfx('page');
  focusFirst();
}

// ---------- the journey ----------

function startJourney(players) {
  S.mode = { kind: 'journey', players };
  S.tally = Array(players).fill(0);
  S.log = [];
  input.assign(0, ['all']);
  input.setTouchZones(1);
  showStory(STORY.prologue, () => showCard(0));
}

function startAdventure(players) {
  S.mode = { kind: 'adventure', players };
  S.tally = Array(players).fill(0);
  S.log = [];
  input.assign(0, ['all']);
  input.setTouchZones(1);
  showStory(STORY.prologue, () => showCard(0));
}

function startVersus() {
  S.mode = { kind: 'versus', players: 2 };
  S.tally = [0, 0];
  S.log = [];
  showStory(STORY.prologue, () => showCard(0));
}

async function showCard(ci) {
  S.ci = ci;
  const c = chapterOf(ci);
  const M = MONSTERS[c.snatcher];
  S.factory = null;
  const adv = isAdv();
  const keys = [`${c.snatcher}.poses`, c.scene, `${c.scene}-front`, 'portraits/' + c.snatcher, 'cast', 'ui/letter', 'ui/postmark', 'yalapappus.swaps',
    ...['trollusk', 'bombanat', 'grumley', 'iceferg', 'typhoonigator', 'yalapappus', 'grithix'].map((p) => `props.${p}`)];
  if (MONSTERS[c.holder]) keys.push(`${c.holder}.poses`);
  // A board shows the others on the way too: load every monster's poses.
  if (adv) keys.push(...boardArt(c), ...Object.keys(MONSTERS).flatMap((m) => [`${m}.poses`, `${m}.moves`]));
  art.preload(keys);
  S.howto = null;
  (adv ? loadBoardModule : loadChapterModule)(c.file).then((m) => {
    if (S.ci !== ci || chapterOf(ci) !== c || !m) return;
    S.factory = m.default || null;
    S.howto = m.HOWTO || null;
    const nn = String(c.n).padStart(2, '0');
    if (S.howto) art.preload(S.howto.map((_, k) => `howto/${adv ? 'b' : 'ch'}${nn}-${k + 1}`));
  });
  // DOM
  $('#card-eyeing').textContent = c.eyeing;
  $('#card-portrait').src = art.imageSrc('portraits/' + c.snatcher) || '';
  $('#card-portrait').alt = M.name;
  $('#card-chapter').textContent = `${adv ? 'Board' : 'Chapter'} ${c.n} of ${list().length} · ${c.title}`;
  $('#card-name').textContent = M.name;
  $('#card-wants').textContent = `What it wants: ${M.wants}.`;
  let turn = '';
  if (S.mode.kind === 'journey' && S.mode.players > 1) turn = `${pName(snatcherPlayer(ci))}, you are the ${M.short}! Pass the controller.`;
  if (S.mode.kind === 'versus') turn = `${pName(snatcherPlayer(ci))} snatches as the ${M.short}. ${pName(holderPlayer(ci))} keeps it as ${c.holderName}.`;
  $('#card-turn').textContent = turn;
  $('#card-turn').hidden = !turn;
  $('#card-goal').textContent = c.goal;
  $('#card-go').textContent = input.kind === 'controller' ? 'How to play ▸ (A)' : 'How to play ▸';
  buildTableau(c, 'eye');
  show('card');
  audio.playMusic('menu');
}

// ---------- how to play ----------
// A page of the book before each chapter: three numbered pictures of what to
// do (the chapter's HOWTO, chapters/index.js), then each side's goal and
// controls, shown as the buttons of the device in use.

function showHowto() {
  const c = chapterOf(S.ci);
  const adv = isAdv();
  const versus = S.mode.kind === 'versus';
  const steps = S.howto || [];
  $('#howto-title').textContent = `How to play: ${c.title}`;
  $('#howto-steps').hidden = !steps.length;
  document.querySelectorAll('#howto-steps .howto-step').forEach((fig, k) => {
    fig.hidden = !steps[k];
    fig.querySelector('.howto-text').textContent = steps[k]?.text || '';
  });
  const M = MONSTERS[c.snatcher];
  const sides = [{ who: versus ? `${pName(snatcherPlayer(S.ci))}: the ${M.short}` : `You are the ${M.short}`, goal: c.goal, lines: c.controlsS, keys: versus ? 'kb1' : 'kb' }];
  if (versus) sides.push({ who: `${pName(holderPlayer(S.ci))}: ${c.holderName}`, goal: c.holderGoal, lines: c.controlsH, keys: 'kb2' });
  for (let i = 0; i < 2; i++) {
    const el = $('#howto-side-' + i);
    el.hidden = !sides[i];
    if (!sides[i]) continue;
    el.querySelector('.howto-who').textContent = sides[i].who;
    el.querySelector('.howto-goal').textContent = steps.length && !versus ? '' : sides[i].goal;
    const ul = el.querySelector('.howto-keys');
    ul.textContent = '';
    for (const line of sides[i].lines) ul.append(controlItem(line, sides[i].keys));
  }
  $('#howto-marks').textContent = adv
    ? `Postmarks: one for the snatch, one for gathering ${c.collect}, one for this: ${c.feat.toLowerCase()}.`
    : 'Postmarks: the faster the snatch, the more you get (up to three).';
  const go = adv ? 'Off we go!' : versus ? 'Ready!' : 'Snatch it!';
  $('#howto-go').textContent = input.kind === 'controller' ? `${go} (A)` : go;
  S.howtoT = 0;
  S.howtoCreatures = steps.map((st) => (st.items || []).map((it) => {
    if (!it.creature) return null;
    const cr = art.makeCreature(it.creature, 0, 0);
    if (it.anim) art.setAnim(cr, it.anim);
    return cr;
  }));
  show('howto');
}

// One control line ("Action: hop; at a ledge, grab it") with the glyph of the
// button it names on the device in use.
const GLYPHS = {
  controller: { Move: '<span class="chip">Left stick</span>', Action: '<span class="xb xb-a">A</span>', Sprint: '<span class="xb xb-b">B</span>', Down: '<span class="chip">Stick ↓</span>', Up: '<span class="chip">Stick ↑</span>' },
  kb: { Move: '<kbd>WASD</kbd><kbd>←↑↓→</kbd>', Action: '<kbd>Space</kbd>', Sprint: '<kbd>Shift</kbd>', Down: '<kbd>S</kbd><kbd>↓</kbd>', Up: '<kbd>W</kbd><kbd>↑</kbd>' },
  kb1: { Move: '<kbd>WASD</kbd>', Action: '<kbd>Space</kbd>', Sprint: '<kbd>Left Shift</kbd>', Down: '<kbd>S</kbd>', Up: '<kbd>W</kbd>' },
  kb2: { Move: '<kbd>←↑↓→</kbd>', Action: '<kbd>Enter</kbd>', Sprint: '<kbd>Right Shift</kbd>', Down: '<kbd>↓</kbd>', Up: '<kbd>↑</kbd>' },
  touch: { Move: '<span class="chip">Drag</span>', Action: '<span class="chip">Action</span>', Sprint: '<span class="chip">Sprint</span>', Down: '<span class="chip">Drag ↓</span>', Up: '<span class="chip">Drag ↑</span>' },
};
function controlItem(line, keys) {
  const li = document.createElement('li');
  const m = /^([^:]+):\s*(.*)$/.exec(line);
  const name = m ? m[1].trim() : '';
  const set = input.kind === 'controller' ? GLYPHS.controller : input.kind === 'touch' ? GLYPHS.touch : GLYPHS[keys] || GLYPHS.kb;
  const key = Object.keys(set).find((k) => name === k || name.startsWith(k + ' ') || name.endsWith(' ' + k));
  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  if (key) glyph.innerHTML = set[key];
  const text = document.createElement('span');
  text.textContent = key && name === key ? m[2] : line;
  li.append(glyph, text);
  return li;
}

// Draw the three step pictures (each frame while the page is up).
function drawHowto(dt) {
  const steps = S.howto || [];
  S.howtoT += dt;
  const adv = isAdv();
  const nn = String(chapterOf(S.ci).n).padStart(2, '0');
  document.querySelectorAll('#howto-steps canvas').forEach((cv, k) => {
    const st = steps[k];
    if (!st) return;
    const cg = cv.getContext('2d');
    cg.setTransform(1, 0, 0, 1, 0, 0);
    const pic = art.image(`howto/${adv ? 'b' : 'ch'}${nn}-${k + 1}`);
    if (pic) { cg.drawImage(pic, 0, 0, 640, 480); return; }
    drawStep(cg, st, S.howtoCreatures[k] || [], S.howtoT + k * 0.7, dt);
  });
}

function drawStep(cg, st, creatures, t, dt) {
  cg.fillStyle = '#f3e9d2';
  cg.fillRect(0, 0, 640, 480);
  const bg = st.scene ? art.image(st.scene) : null;
  if (bg) {
    const [x, y, w, h] = st.crop || [0, 0, 1920, 1080];
    const k = Math.max(640 / w, 480 / h);
    cg.drawImage(bg, x, y, w, h, (640 - w * k) / 2, (480 - h * k) / 2, w * k, h * k);
  }
  (st.items || []).forEach((it, i) => {
    cg.save();
    if (it.creature) {
      const cr = creatures[i];
      cr.x = it.x; cr.y = it.y; cr.facing = it.flip ? -1 : 1;
      cr.sizeK = (it.h || cr.M.height) / cr.M.height;
      art.animate(cr, dt);
      art.drawCreature(cg, cr, t, { reduceMotion: settings.reduceMotion, shadow: it.shadow !== false });
    } else if (it.sprite || it.cast) {
      const sp = it.cast ? art.cast(it.cast) : art.sprite(it.sprite[0], it.sprite[1]);
      art.drawSprite(cg, sp, it.x, it.y, { height: it.h, ax: it.ax ?? 0.5, ay: it.ay ?? 1, rot: it.rot || 0, flip: !!it.flip });
    } else if (it.path) {
      cg.strokeStyle = '#33241a'; cg.lineWidth = 4; cg.lineCap = 'round'; cg.setLineDash([2, 12]);
      cg.beginPath();
      it.path.forEach(([x, y], j) => (j ? cg.lineTo(x, y) : cg.moveTo(x, y)));
      cg.stroke();
      cg.setLineDash([]);
      if (it.arrow !== false && it.path.length > 1) {
        const [x1, y1] = it.path[it.path.length - 1];
        const [x0, y0] = it.path[it.path.length - 2];
        const a = Math.atan2(y1 - y0, x1 - x0);
        cg.lineWidth = 5;
        cg.beginPath();
        cg.moveTo(x1 - Math.cos(a - 0.5) * 22, y1 - Math.sin(a - 0.5) * 22); cg.lineTo(x1, y1);
        cg.lineTo(x1 - Math.cos(a + 0.5) * 22, y1 - Math.sin(a + 0.5) * 22);
        cg.stroke();
      }
    } else if (it.ring) {
      const [x, y, r] = it.ring;
      cg.strokeStyle = '#b5463a'; cg.lineWidth = 4; cg.setLineDash([10, 8]);
      cg.beginPath(); cg.arc(x, y, r * (1 + Math.sin(t * 4) * 0.04), 0, Math.PI * 2); cg.stroke();
    } else if (it.word) {
      cg.font = `800 ${it.size || 46}px Fraunces, Georgia, serif`;
      cg.textAlign = 'center';
      cg.translate(it.x, it.y); cg.rotate(it.rot ?? -0.08);
      cg.lineWidth = 9; cg.strokeStyle = '#fbf6e8'; cg.strokeText(it.word, 0, 0);
      cg.fillStyle = '#b5463a'; cg.fillText(it.word, 0, 0);
    } else if (it.draw) it.draw(cg, t);
    cg.restore();
  });
  // Fade the picture into the paper at its edges, like a spot illustration.
  const gr = cg.createRadialGradient(320, 240, 170, 320, 240, 420);
  gr.addColorStop(0, 'rgba(251,246,232,0)');
  gr.addColorStop(1, 'rgba(251,246,232,0.85)');
  cg.fillStyle = gr;
  cg.fillRect(0, 0, 640, 480);
}

function fillList(sel, lines) {
  const ul = $(sel);
  ul.textContent = '';
  for (const l of lines) {
    const li = document.createElement('li');
    li.textContent = l;
    ul.append(li);
  }
}

// The picture behind the card and the celebration: the holder with the
// letter, and the snatcher eyeing it (or celebrating).
function buildTableau(c, mood) {
  // The card and the celebration panels sit low: the creatures stand above them.
  const sn = art.makeCreature(c.snatcher, 600, 840);
  sn.facing = -1;
  art.setAnim(sn, mood === 'eye' ? 'eye' : 'celebrate');
  sn.sizeK = 1.2;
  let ho = null;
  if (MONSTERS[c.holder]) {
    ho = art.makeCreature(c.holder, 230, 880);
    const first = Object.keys(MONSTERS[c.holder].anims)[0];
    art.setAnim(ho, mood === 'kept' ? 'celebrate' : first);
    ho.sizeK = 1.1;
  }
  if (mood === 'celebrate') { sn.x = 440; sn.y = 900; sn.facing = 1; sn.sizeK = 1.6; ho = null; }
  if (mood === 'kept') { sn.alpha = 0.0; if (ho) { ho.x = 440; ho.y = 900; ho.sizeK = 1.6; } }
  S.tableau = { c, sn, ho, mood };
}

function drawTableau(t, dt) {
  const tb = S.tableau;
  if (!tb) return;
  art.drawScene(g, tb.c.scene, W, H, { dim: 0.1 });
  const { sn, ho, c, mood } = tb;
  if (ho) { art.animate(ho, dt); art.drawCreature(g, ho, t, { reduceMotion: settings.reduceMotion }); }
  if (!ho && mood === 'eye') drawHolderThing(c, t);
  if (mood === 'eye' || mood === 'celebrate') { art.animate(sn, dt); art.drawCreature(g, sn, t, { reduceMotion: settings.reduceMotion }); }
  // The letter, floating where it is.
  const lt = art.image('ui/letter');
  if (lt) {
    const lx = mood === 'eye' ? 260 : 700;
    const ly = (mood === 'eye' ? 420 : 360) + (settings.reduceMotion ? 0 : Math.sin(t * 2) * 10);
    g.save(); g.translate(lx, ly); g.rotate(Math.sin(t * 1.3) * 0.1); g.drawImage(lt, -60, -60, 120, 120); g.restore();
  }
}

function drawHolderThing(c, t) {
  if (c.holder === 'lookouts') {
    art.drawSprite(g, art.prop('trollusk', 7), 230, 880, { height: 380 });
  } else if (c.holder === 'peg') {
    art.drawSprite(g, art.prop('iceferg', 1), 240, 640 + Math.sin(t * 1.5) * 8, { height: 380, ay: 0.5 });
  } else if (c.holder === 'bottle') {
    art.drawSprite(g, art.prop('typhoonigator', 1), 240, 700 + Math.sin(t * 1.8) * 12, { height: 200, ay: 0.5, rot: Math.sin(t) * 0.2 });
  }
}

// ---------- playing a chapter ----------

function begin() {
  if (!S.factory) { toast('One moment, turning the page…'); return; }
  const c = chapterOf(S.ci);
  const sp = snatcherPlayer(S.ci);
  const hp = holderPlayer(S.ci);
  const versus = S.mode.kind === 'versus';
  if (versus) {
    input.assign(0, S.join[sp]);
    input.assign(1, S.join[hp]);
  } else {
    input.assign(0, ['all']);
    input.assign(1, []);
  }
  const gentle = [!!settings.gentle[versus ? sp : 0], versus ? !!settings.gentle[hp] : false];
  let skill = S.mode.kind === 'journey' || S.mode.kind === 'adventure' ? Math.min(0.8, 0.35 + S.ci * 0.05) : 0.55;
  if (gentle[0]) skill -= 0.2;
  S.chapter = S.factory({
    W, H,
    rng: makeRng((Date.now() & 0xffff) + 1),
    sfx: audio.sfx,
    vibrate,
    reduceMotion: settings.reduceMotion,
    versus,
    gentle,
    skill: Math.max(0.1, skill),
    inputKind: input.kind, // for in-world button prompts (prompt.js)
  });
  $('#hud-chapter').textContent = `${isAdv() ? 'Board ' : ''}${c.n} · ${c.title}`;
  show('play');
  S.phase = 'count';
  S.count = 3.2;
  S.paused = false;
  cam.snap = true;
  audio.playMusic(S.ci % 3 === 2 ? 'tense' : 'play');
  audio.sfx('count');
}

function retry() {
  $('#pause').hidden = true;
  begin();
}

function pause(reason = '') {
  if (S.screen !== 'play' || !['count', 'play', 'over'].includes(S.phase) || S.paused) return;
  S.paused = true;
  $('#pause-reason').textContent = reason;
  $('#pause').hidden = false;
  input.lockHeld();
  focusFirst();
}
function resume() {
  if (S.modals.length) return;
  S.paused = false;
  $('#pause').hidden = true;
  input.lockHeld();
}

function finishChapter() {
  const c = chapterOf(S.ci);
  const ch = S.chapter;
  const marks = ch.marks();
  S.lastMarks = marks;
  const sp = snatcherPlayer(S.ci);
  const hp = holderPlayer(S.ci);
  if (S.mode.kind === 'versus') { S.tally[sp] += marks[0]; S.tally[hp] += marks[1]; } else S.tally[sp] += marks[0];
  S.log.push({ ci: S.ci, marks, outcome: ch.outcome, snatcher: sp, holder: hp });
  // Progress: reaching the next chapter, and the best postmarks here.
  const adv = isAdv();
  if (adv) progress.advReached = Math.max(progress.advReached || 1, Math.min(BOARDS.length, S.ci + 2));
  else progress.reached = Math.max(progress.reached, Math.min(CHAPTERS.length, S.ci + 2));
  const best = bestIn(adv);
  best[c.n] = Math.max(best[c.n] || 0, marks[0]);
  saveProgress(progress);

  const snatched = ch.outcome === 'snatched';
  const M = MONSTERS[c.snatcher];
  buildTableau(c, snatched ? 'celebrate' : 'kept');
  if (snatched) $('#cel-title').textContent = `The ${M.short} got it!`;
  else $('#cel-title').textContent = S.mode.kind === 'versus' ? `${pName(hp)} kept it!` : 'It got away… almost!';
  $('#cel-line').textContent = snatched ? c.win : `Time ran out, but the letter went on all the same, as letters in this story do. ${c.win}`;
  stampMarks('#marks', S.mode.kind === 'versus' ? marks[0] + marks[1] : marks[0]);
  $('#cel-marks').textContent = S.mode.kind === 'versus'
    ? `${pName(sp)} (snatching): ${marks[0]} ✉ · ${pName(hp)} (keeping): ${marks[1]} ✉`
    : `${marks[0]} postmark${marks[0] === 1 ? '' : 's'}`;
  $('#cel-tally').textContent = tallyLine();
  const last = S.ci + 1 >= list().length;
  $('#cel-next').textContent = S.mode.kind === 'one' ? 'Back to the chapters' : last ? 'The end of the story ▸' : 'Turn the page ▸';
  $('#cel-retry').hidden = S.mode.kind === 'versus';
  show('celebrate');
  audio.playMusic('menu');
  audio.sfx(snatched ? 'cheer' : 'aww');
}

function tallyLine() {
  if (S.mode.kind === 'one') return `Best here: ${bestIn(isAdv())[chapterOf(S.ci).n] || 0} ✉`;
  if (S.mode.players === 1) return `Postmarks so far: ${S.tally[0]}`;
  return S.tally.map((v, i) => `${pName(i)}: ${v}`).join(' · ');
}

function stampMarks(sel, n) {
  const box = $(sel);
  box.textContent = '';
  const src = art.imageSrc('ui/postmark');
  const spots = [[8, 6, -14], [40, 22, 9], [18, 46, -4], [52, 50, 16], [30, 10, 22], [60, 4, -20]];
  for (let i = 0; i < n; i++) {
    const im = document.createElement('img');
    im.src = src;
    im.alt = '';
    const [x, y, r] = spots[i % spots.length];
    im.style.left = x + '%';
    im.style.top = y + '%';
    im.style.setProperty('--r', r + 'deg');
    im.style.animationDelay = 0.35 + i * 0.35 + 's';
    box.append(im);
    setTimeout(() => audio.sfx('thunk'), 350 + i * 350);
  }
}

function next() {
  if (S.mode.kind === 'one') { show('chapters'); return; }
  if (S.ci + 1 < list().length) { showCard(S.ci + 1); return; }
  showStory(STORY.epilogue, showFinal);
}

function showFinal() {
  const total = S.tally.reduce((a, b) => a + b, 0);
  const bestKey = S.mode.kind === 'adventure' ? 'adventureBest' : 'journeyBest';
  if (S.mode.players === 1) progress[bestKey] = Math.max(progress[bestKey] || 0, total);
  saveProgress(progress);
  stampMarks('#final-marks', Math.min(6, total));
  const box = $('#final-tally');
  box.textContent = '';
  const best = Math.max(...S.tally);
  if (S.mode.players === 1) {
    box.innerHTML = `<p>${total} postmarks on the letter${total >= 20 ? ' — a well-travelled letter!' : '.'}</p><p class="muted">Best ${S.mode.kind === 'adventure' ? 'adventure' : 'journey'}: ${progress[bestKey]}</p>`;
  } else {
    const winners = S.tally.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < S.tally.length; i++) {
      const p = document.createElement('p');
      p.textContent = `${pName(i)}: ${S.tally[i]} postmarks`;
      if (winners.includes(i)) p.className = 'win';
      box.append(p);
    }
    const w = document.createElement('p');
    w.textContent = winners.length > 1 ? 'A tie! Everybody shares the letter.' : `${pName(winners[0])} wins!`;
    w.className = 'win';
    box.append(w);
  }
  show('final');
  audio.sfx('cheer');
}

function vibrate(ms = 80) {
  if (!settings.vibration) return;
  for (const gp of navigator.getGamepads?.() || []) {
    try { gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: 0.5, weakMagnitude: 0.5 }); } catch { /* not supported */ }
  }
}

// ---------- versus: joining ----------

const DEV_NAME = (src) => {
  if (!src) return '';
  const s = src[0];
  if (s.startsWith('pad:')) return `Controller ${Number(s.slice(4)) + 1}`;
  if (s === 'kb1') return 'Keyboard: WASD, Space, left Shift';
  if (s === 'kb2') return 'Keyboard: arrows, Enter, right Shift';
  if (s.startsWith('touch:')) return s === 'touch:0' ? 'Touch: left half' : 'Touch: right half';
  return s;
};

function joinWith(sources) {
  const key = sources[0];
  if (S.join.some((j) => j && j[0] === key)) return;
  const slot = key === 'kb2' && !S.join[1] ? 1 : key === 'kb1' && !S.join[0] ? 0 : S.join[0] ? 1 : 0;
  if (S.join[slot]) return;
  S.join[slot] = sources;
  audio.sfx('select');
  syncJoin();
}

function syncJoin() {
  for (let i = 0; i < 2; i++) {
    $('#join-' + i).classList.toggle('ready', !!S.join[i]);
    $('#join-' + i + ' .join-how').textContent = S.join[i] ? DEV_NAME(S.join[i]) : 'Waiting…';
  }
  for (const el of document.querySelectorAll('[data-gentle]')) el.checked = !!settings.gentle[Number(el.dataset.gentle)];
  const ready = S.join[0] && S.join[1];
  $('#versus-go').disabled = !ready;
  if (ready) $('#versus-go').focus();
}

function joinInput() {
  for (const i of input.pads()) if (input.padPressed(BTN.A, i)) joinWith(['pad:' + i]);
  if (input.keyPressed('Space') || input.keyPressed('KeyF')) joinWith(['kb1']);
  if ((input.keyPressed('Enter') || input.keyPressed('NumpadEnter')) && !(S.join[0] && S.join[1])) joinWith(['kb2']);
}

// ---------- actions ----------

function act(action) {
  audio.unlock();
  switch (action) {
    case 'start': requestFullscreen(); audio.sfx('go'); show('modes'); break;
    case 'fullscreen': toggleFullscreen(); break;
    case 'sound': settings.sound = !settings.sound; saveSettings(settings); applySettings(); syncSettingsUi(); break;
    case 'title': show('title'); break;
    case 'modes': show('modes'); break;
    case 'adventure-1': startAdventure(1); break;
    case 'adventure-2': startAdventure(2); break;
    case 'adventure-3': startAdventure(3); break;
    case 'adventure-4': startAdventure(4); break;
    case 'journey-1': startJourney(1); break;
    case 'journey-2': startJourney(2); break;
    case 'journey-3': startJourney(3); break;
    case 'journey-4': startJourney(4); break;
    case 'versus': show('join'); break;
    case 'touch-versus':
      S.join = [['touch:0'], ['touch:1']];
      input.setTouchZones(2);
      syncJoin();
      break;
    case 'versus-go': if (S.join[0] && S.join[1]) startVersus(); break;
    case 'chapters': show('chapters'); break;
    case 'story-next': storyNext(); break;
    case 'begin': begin(); break;
    case 'howto': showHowto(); break;
    case 'howto-back': show('card'); break;
    case 'pause': pause(); break;
    case 'resume': resume(); break;
    case 'retry': retry(); break;
    case 'next': next(); break;
    case 'quit-ask':
      if (S.mode.kind === 'one' && S.screen !== 'play') { show('chapters'); break; }
      confirm('Leave the story?', S.mode.kind === 'one' ? 'This snatch will not count.' : 'The journey so far, and its postmarks, will be lost.', () => show('title'));
      break;
    case 'close': closeModal(); break;
    case 'confirm-yes': {
      const fn = S.confirmFn;
      S.confirmFn = null;
      closeModal();
      if (S.screen === 'play') { $('#pause').hidden = true; S.paused = false; }
      fn?.();
      break;
    }
    case 'reset-progress':
      confirm('Forget how far you got?', 'Only the first chapter stays open, and the best postmarks are cleared.', () => {
        resetProgress();
        progress = loadProgress();
        toast('Forgotten.');
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
  audio.unlock();
  if (el.dataset.open) { audio.sfx('select'); openModal(el.dataset.open); }
  else { if (el.dataset.action !== 'pause') audio.sfx('select'); act(el.dataset.action); }
});

function back() {
  if (S.modals.length) { audio.sfx('back'); closeModal(); return; }
  if (S.screen === 'play') { if (!$('#pause').hidden) resume(); else pause(); return; }
  audio.sfx('back');
  if (S.screen === 'modes' || S.screen === 'final') show('title');
  else if (S.screen === 'join' || S.screen === 'chapters') show('modes');
  else if (S.screen === 'howto') show('card');
  else if (S.screen === 'card' || S.screen === 'celebrate' || S.screen === 'story') act('quit-ask');
  else if (S.screen === 'title' && S.titleUtil) { S.titleUtil = false; $('#press-start').focus(); }
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

const SOUND_ICON = {
  on: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></g>',
  off: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></g>',
};
function syncSoundButton() {
  const on = settings.sound !== false;
  const label = on ? 'Sound on' : 'Sound off';
  for (const b of document.querySelectorAll('[data-action="sound"]')) {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', label);
    b.title = label;
    b.classList.toggle('is-off', !on);
    b.querySelector('svg').innerHTML = on ? SOUND_ICON.on : SOUND_ICON.off;
    b.querySelector('.btn-label').textContent = label;
  }
}

function syncSettingsUi() {
  syncSoundButton();
  for (const el of document.querySelectorAll('[data-setting]')) {
    const k = el.dataset.setting;
    if (k === 'gentle0') { el.checked = !!settings.gentle[0]; continue; }
    if (el.type === 'checkbox') el.checked = !!settings[k];
    else {
      el.value = settings[k];
      const out = el.parentElement.querySelector('output');
      if (out) out.textContent = settings[k];
    }
  }
}
function applySettings() {
  audio.setLevels(settings);
  syncSoundButton();
  document.body.classList.toggle('reduce-motion', settings.reduceMotion);
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset?.gentle !== undefined) {
    settings.gentle[Number(el.dataset.gentle)] = el.checked;
    saveSettings(settings);
    return;
  }
  if (!el.dataset?.setting) return;
  const k = el.dataset.setting;
  if (k === 'gentle0') settings.gentle[0] = el.checked;
  else settings[k] = el.type === 'checkbox' ? el.checked : Number(el.value);
  saveSettings(settings);
  applySettings();
  syncSettingsUi();
});

let toastTimer = 0;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// Keys that scroll the page, and keys pressed in play, stay with the game.
addEventListener('keydown', (e) => {
  audio.unlock();
  const el = document.activeElement;
  const playing = S.screen === 'play' && S.phase !== 'idle' && !S.paused && !S.modals.length;
  if (playing && !['Escape', 'KeyP'].includes(e.code)) { e.preventDefault(); return; }
  if (S.screen === 'join' && ['Space', 'Enter', 'KeyF'].includes(e.code) && !(S.join[0] && S.join[1])) { e.preventDefault(); return; }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    if (el?.type === 'range' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;
    e.preventDefault();
  }
});

// ---------- the frame loop ----------

let last = performance.now();
let repeat = { dir: null, t: 0 };

function menuInput(dt) {
  const n = input.nav();
  if (S.screen === 'title' && !S.modals.length) {
    const [sx, sy] = n.stick;
    if (!S.titleUtil && (Math.abs(sx) > 0.5 || Math.abs(sy) > 0.5)) {
      S.titleUtil = true;
      $('#title-hint').hidden = true;
      $('#press-start').focus();
      repeat = { dir: 'x', t: 0.35 };
      return;
    }
    if (!S.titleUtil && input.padAnyPressed()) { act('start'); return; }
    if (S.titleUtil && input.padPressed(BTN.MENU)) { act('start'); return; }
  }
  if (S.screen === 'join' && !S.modals.length) {
    joinInput();
    if (!(S.join[0] && S.join[1])) { if (n.back) back(); return; }
  }
  if (!layer()) return;
  let dx = 0, dy = 0;
  if (n.left) dx = -1; else if (n.right) dx = 1; else if (n.up) dy = -1; else if (n.down) dy = 1;
  else {
    const [sx, sy] = n.stick;
    const dir = Math.abs(sx) > 0.55 ? (sx > 0 ? 'r' : 'l') : Math.abs(sy) > 0.55 ? (sy > 0 ? 'd' : 'u') : null;
    if (!dir) repeat = { dir: null, t: 0 };
    else if (dir !== repeat.dir) { repeat = { dir, t: 0.38 }; [dx, dy] = { r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1] }[dir]; }
    else { repeat.t -= dt; if (repeat.t <= 0) { repeat.t = 0.14; [dx, dy] = { r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1] }[dir]; } }
  }
  const el = document.activeElement;
  const padNow = input.kind === 'controller';
  if ((dx || dy) && el?.type === 'range' && dx && padNow) {
    el.value = Number(el.value) + dx * Number(el.step || 1);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (dx || dy) {
    if (!(el?.type === 'range' && dx && !padNow)) moveFocus(dx, dy);
  }
  if (input.padPressed(BTN.A)) {
    const f = document.activeElement;
    if (navItems().includes(f)) f.click(); else focusFirst();
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

  const live = S.screen === 'play' && ['count', 'play', 'over'].includes(S.phase);
  const running = live && !S.paused && !S.modals.length;
  if (running && S.phase === 'count') {
    const before = Math.ceil(S.count);
    S.count -= dt;
    const after = Math.ceil(S.count);
    const cd = $('#countdown');
    cd.hidden = false;
    cd.textContent = S.count > 0.4 ? String(Math.max(1, after)) : 'Go!';
    if (after !== before && after > 0) audio.sfx('count');
    if (S.count <= 0.4 && S.count + dt > 0.4) audio.sfx('go');
    if (S.count <= 0) { cd.hidden = true; S.phase = 'play'; input.lockHeld(); }
  } else if (running && S.phase === 'play') {
    const versus = S.mode.kind === 'versus';
    S.chapter.update(dt, input.player(0).state(), versus ? input.player(1).state() : null);
    if (S.chapter.done) {
      S.phase = 'over';
      S.overT = S.chapter.outroTime ?? 1.4;
      const b = $('#banner');
      b.hidden = false;
      b.textContent = S.chapter.outcome === 'snatched' ? S.chapter.banner || 'SNATCH!' : versus ? 'KEPT IT!' : 'TIME!';
      audio.sfx(S.chapter.outcome === 'snatched' ? 'snatch' : 'aww');
      vibrate(160);
    }
  } else if (running && S.phase === 'over') {
    S.chapter.update(dt, {}, S.mode.kind === 'versus' ? {} : null);
    S.overT -= dt;
    if (S.overT <= 0) { $('#banner').hidden = true; finishChapter(); }
  }
  if (running) {
    const n = input.nav();
    if (n.pause) pause();
  } else menuInput(dt);

  render(dt);
  input.endFrame();
  requestAnimationFrame(frame);
}

// ---------- rendering ----------

function render(dt) {
  const t = S.t;
  if (S.screen === 'play' && S.chapter) {
    const pv = playView(dt);
    logical(pv);
    g.save();
    g.beginPath(); g.rect(0, 0, W, H); g.clip();
    drawChapter(pv, t);
    g.restore();
    drawTouchControls();
    updateHud();
    return;
  }
  if (S.screen === 'title') {
    const bg = art.image('ui/title-bg');
    if (bg) cover(bg); else paperFill();
    return;
  }
  if (S.screen === 'story' && S.story) {
    const img = art.image(S.story.pages[S.story.i].image);
    if (img) cover(img); else paperFill();
    return;
  }
  logical();
  if (['card', 'howto', 'celebrate'].includes(S.screen)) drawTableau(t, dt);
  if (S.screen === 'howto') drawHowto(dt);
  else if (S.screen === 'final') art.drawScene(g, 'story/lucyjane', W, H, { dim: 0.15 });
  else {
    const bg = art.image('ui/title-bg');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    g.fillStyle = 'rgba(243,233,210,0.35)';
    g.fillRect(0, 0, W, H);
  }
}

// The chapters write their hint lines centred on the 1920-wide frame. When the
// camera shows only part of it, those lines are moved to the middle of what is
// on screen and shrunk to fit, so no chapter has to know about the camera.
function drawChapter(v, t) {
  const x0 = -v.ox / v.s;
  const x1 = (v.cw - v.ox) / v.s;
  if (x1 - x0 >= W - 1) { S.chapter.draw(g, t); return; }
  const room = x1 - x0 - 60;
  const fit = (fn) => function (text, x, y, maxW) {
    if (x !== W / 2 || this.textAlign !== 'center') return fn.call(this, text, x, y, maxW);
    const k = Math.min(1, room / Math.max(1, this.measureText(text).width));
    this.save();
    this.translate((x0 + x1) / 2, y);
    this.scale(k, k);
    fn.call(this, text, 0, 0);
    this.restore();
  };
  g.fillText = fit(CanvasRenderingContext2D.prototype.fillText);
  g.strokeText = fit(CanvasRenderingContext2D.prototype.strokeText);
  try { S.chapter.draw(g, t); } finally { delete g.fillText; delete g.strokeText; }
}

function drawTouchControls() {
  if (input.kind !== 'touch') return;
  g.setTransform(view.dpr * view.ui, 0, 0, view.dpr * view.ui, 0, 0);
  const zones = input.touchZones();
  const sticks = input.touchSticks();
  for (let z = 0; z < zones; z++) {
    const b = input.touchButtons(z);
    g.save();
    g.globalAlpha = 0.55;
    g.lineWidth = 5;
    g.strokeStyle = '#33241a';
    g.fillStyle = '#f2c53d';
    g.beginPath(); g.arc(b.action.x, b.action.y, b.action.r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#c9b8d4';
    g.beginPath(); g.arc(b.sprint.x, b.sprint.y, b.sprint.r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.globalAlpha = 0.9;
    g.fillStyle = '#33241a';
    g.font = '700 34px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.fillText('Action', b.action.x, b.action.y + 12);
    g.font = '700 26px Fraunces, Georgia, serif';
    g.fillText('Sprint', b.sprint.x, b.sprint.y + 9);
    const st = sticks[z];
    if (st) {
      g.globalAlpha = 0.4;
      g.beginPath(); g.arc(st.x0, st.y0, 110, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(st.x0 + Math.max(-110, Math.min(110, st.x - st.x0)), st.y0 + Math.max(-110, Math.min(110, st.y - st.y0)), 46, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
}

function updateHud() {
  const ch = S.chapter;
  let status = ch.hud ? ch.hud() : '';
  if (S.mode.kind === 'versus') status = `${pName(snatcherPlayer(S.ci))} snatching · ${pName(holderPlayer(S.ci))} keeping${status ? ' · ' + status : ''}`;
  else if (S.mode.players > 1) status = `${pName(snatcherPlayer(S.ci))}${status ? ' · ' + status : ''}`;
  $('#hud-status').textContent = status;
  const tm = $('#hud-timer');
  const s = Math.max(0, Math.ceil(ch.time));
  tm.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  tm.classList.toggle('low', s <= 5);
}

// ---------- pausing on focus loss and controller loss ----------

// Hidden or unfocused: pause play and silence every sound; back again: the
// sound comes back (play stays paused until resumed).
let blurred = false;
function syncAway() {
  const away = document.hidden || blurred;
  if (away) pause('The game paused while you were away.');
  audio.suspend(away);
}
document.addEventListener('visibilitychange', syncAway);
addEventListener('blur', () => { blurred = true; syncAway(); });
addEventListener('focus', () => { blurred = false; syncAway(); });
addEventListener('pageshow', () => { blurred = false; syncAway(); });
addEventListener('pagehide', () => { blurred = true; syncAway(); });
addEventListener('pointerdown', () => { if (blurred && !document.hidden) { blurred = false; syncAway(); } }, true);
input.onPads(() => {
  if (S.screen !== 'play') return;
  const versus = S.mode.kind === 'versus';
  if (versus ? !(input.slotConnected(0) && input.slotConnected(1)) : input.kind === 'controller' && !input.pads().length) {
    pause('A controller disconnected. Reconnect it to carry on (or use the keyboard).');
  }
});
addEventListener('gamepadconnected', () => toast('Controller connected.'));

// ---------- boot ----------

applySettings();
resize();
art.preload(['ui/title-bg', 'ui/logo', 'ui/letter', 'ui/postmark', 'story/prologue']);
show('title');
requestAnimationFrame((n) => { last = n; frame(n); });

// For automated checks.
globalThis.__onemonster = {
  S, act, show, showCard, begin, CHAPTERS, input,
  get progress() { return progress; },
  jump(ci, kind = 'one') {
    // kind: 'one' (a minigame), 'adv' (a board), 'adventure' or 'journey' (from there on), 'versus'.
    S.mode = kind === 'adv' ? { kind: 'one', players: 1, list: 'adv' } : { kind, players: kind === 'versus' ? 2 : 1 };
    S.tally = kind === 'versus' ? [0, 0] : [0];
    if (kind === 'versus') S.join = [['kb1'], ['kb2']];
    return showCard(ci);
  },
  BOARDS,
};
