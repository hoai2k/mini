// Micro Zoom: the game shell. Title (Press Start) → world select → world intro
// → play, with each world (a prototype page) hosted in a same-origin iframe
// and driven through the embed protocol (../shared/embed.js).
// Landmarks in a world play a zoom transition to the next world (forward) or
// back up to the previous one (the backdoor). See ../README.md.
import { WORLDS } from './worlds.js';
import { PROTO, cardArt, introArt, delivered, loadImage, readyImage, showArtwork } from './art.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createTitleBg } from './title-bg.js';
import { TITLE_ZOOM_PLATES, TITLE_ZOOM_START } from './title-art.js';
import { createTransitions, fmtField, fmtMag, unitSafe } from './transition.js';
import { playContinuous, validPose, moveOf } from './continuous.js';
import { loadRoster } from './players.js';
import { listen, send } from './bus.js';
import { glyph, glyphMode, refreshGlyphs, controlRows } from './glyphs.js';
import { t, tx, fillText, setGlyphRenderer } from '../shared/text.js';

// Every player-facing string is in micro/text_config.js (../../text_config.js)
// (keys under `shell.` and `worlds.`); index.html's static text is filled
// from its data-t attributes first.
fillText(document, { glyph: (b) => `<span class="g" data-btn="${b}"></span>` });
// Any other shell text naming a button ({btn:X}) draws its glyph too.
setGlyphRenderer((b) => glyph(b));

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// ---------------------------------------------------------------- state
// The controls card always shows and transitions are always continuous ('microscope' is the
// continuous path, falling back to the zoom where a world can't): the owner removed both settings.
const settings = { ...store.get('micro.game.settings', {}), controlsAtStart: true, transition: 'microscope' };
const saveSettings = () => store.set('micro.game.settings', settings);
let invertY = false;
try { invertY = localStorage.getItem('micro.invertY') === '1'; } catch { /* private mode */ }
// Free camera (single player): the worlds lock the camera's turn to their forward; on, a lone player may turn
// it freely where the world allows (shared/camlock.js). Default off.
let freeCamera = false;
try { freeCamera = localStorage.getItem('micro.freeCamera') === '1'; } catch { /* private mode */ }
const progress = { furthest: 0, visited: [], ...store.get('micro.game.progress', {}) };
const saveProgress = () => store.set('micro.game.progress', progress);

const S = {
  screen: 'title',
  modals: [],
  titleNav: false,
  sel: 0,
  menuFocus: 'cards', // 'cards' or 'corner'
  world: 0,
  board: 0,            // boards played since the intro (0: the first)
  paused: false,
  pauseReason: '',
  loading: false,
  transitioning: false,
  devPanel: false,
  frame: null,
  hud: null,           // the world's own controls rows (hud message)
  controlsShown: false,
  near: null,
  resumedAt: 0,
  cardBoard: -1,       // the board whose start-of-board controls card last showed
  cont: null,          // the continuous transition in progress: { phase, u, alpha }
  trSpeed: 1,          // the continuous transition's time multiplier (tests slow it down)
  trSeek: null,        // tests: hold the camera move at this progress (0..1)
  lastToggle: { menu: 0, view: 0 },
  confirmFn: null,
};

const input = createInput();
const sound = createSound();
const roster = await loadRoster(PROTO);
const transitions = createTransitions({ layer: $('#transition'), sound, protoBase: PROTO, reduced });

// ---------------------------------------------------------------- fullscreen
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
// Resolves once the switch has settled (the window at its new size), or at once
// when nothing was asked or the browser refused.
function enterFullscreen() {
  const el = document.documentElement;
  if (fsEl()) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(cap); settle(); };
    // After the change, wait until the size holds still for a moment.
    const settle = () => {
      let w = innerWidth, h = innerHeight;
      const check = () => {
        if (innerWidth === w && innerHeight === h) resolve();
        else { w = innerWidth; h = innerHeight; setTimeout(check, 120); }
      };
      setTimeout(check, 120);
    };
    const cap = setTimeout(finish, 1500);
    try {
      const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.();
      if (r?.then) r.then(finish, () => { done = true; clearTimeout(cap); resolve(); /* refused: carry on windowed */ });
      else document.addEventListener('webkitfullscreenchange', finish, { once: true });
    } catch { done = true; clearTimeout(cap); resolve(); /* not allowed here */ }
  });
}
function exitFullscreen() { try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {}); } catch { /* ignore */ } }
const toggleFullscreen = () => (fsEl() ? exitFullscreen() : enterFullscreen());

// ---------------------------------------------------------------- corner buttons
const ICONS = {
  instructions: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h9a5 5 0 0 1 5 5v11H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 9h6M9 13h6" stroke="currentColor" stroke-width="1.8"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></g></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M16 9l6 6M22 9l-6 6"/></g></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
};
function cornerButtons(el, which) {
  const b = (attr, icon, label, extra = '') => `<button class="icon-btn${extra}" data-nav ${attr} aria-label="${label}" title="${label}">${icon}<span class="btn-label">${label}</span></button>`;
  el.innerHTML = (which.includes('instructions') ? b('data-open="instructions"', ICONS.instructions, t('shell.corner.instructions')) : '')
    + b('data-open="settings"', ICONS.settings, t('shell.corner.settings'))
    + b('data-action="sound" aria-pressed="true"', ICONS.soundOn, t('shell.corner.soundOn'), ' sound-btn')
    + b('data-action="fullscreen"', ICONS.fullscreen, t('shell.corner.fullscreen'));
}
for (const el of $$('.corner-buttons')) cornerButtons(el, el.dataset.group === 'corner-pause' ? ['settings'] : ['instructions']);
function syncSoundButtons() {
  for (const b of $$('.sound-btn')) {
    b.setAttribute('aria-pressed', String(sound.on));
    const label = sound.on ? t('shell.corner.soundOn') : t('shell.corner.soundOff');
    b.setAttribute('aria-label', label); b.title = label;
    b.innerHTML = (sound.on ? ICONS.soundOn : ICONS.soundOff) + `<span class="btn-label">${label}</span>`;
  }
}
syncSoundButtons();

// ---------------------------------------------------------------- toasts
function toast(html, { color, ms = 2600 } = {}) {
  const t = document.createElement('div');
  t.className = 'toast';
  if (color) t.style.setProperty('--pc', color);
  t.innerHTML = html;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, ms);
}

// ---------------------------------------------------------------- players
function renderPlayers() {
  const list = roster.list;
  const html = list.map((p) => `<span class="pchip" style="--pc:${p.color}"><b>${p.index + 1}</b>${p.name || t('shell.players.chip', { n: p.index + 1 })}</span>`).join('')
    + (list.length < 4 && glyphMode() === 'controller' ? `<span class="pchip empty"><b style="--pc:transparent">+</b>${t('shell.players.joinHint', { n: list.length + 1, glyph: (b) => glyph(b) })}</span>` : '');
  for (const el of $$('.players-row')) if (el.innerHTML !== html) el.innerHTML = html;
}
function announceJoin(p) {
  sound.join();
  const n = (p.index ?? 0) + 1;
  toast(t('shell.toasts.joined', { n, where: S.screen === 'play' ? t('shell.toasts.joinedInWorld') : t('shell.toasts.joinedReady') }), { color: p.color });
  renderPlayers();
  if (S.controlsShown) renderControlsCard();
}
roster.onJoin(announceJoin);
const rosterLive = () => S.screen !== 'play' || S.paused;

// Artwork only the menu and intro show (seven cards, the menu background and
// the first intro plate, about 3.6 MB) starts loading once the title's own
// plates and logo have settled, or as soon as the title is left, whichever
// comes first, so on a slow connection the title art isn't sharing the line
// with pictures nobody can see yet. Nothing else about loading changes.
let openMenuArt = () => {};
const menuArtGate = new Promise((resolve) => { openMenuArt = resolve; });
const afterTitleArt = (fn) => menuArtGate.then(fn);

// ---------------------------------------------------------------- screens
function show(screen) {
  S.screen = screen;
  if (screen !== 'title') { openMenuArt(); revealTitle(); }
  host.inert = screen !== 'play';
  host.setAttribute('aria-hidden', String(screen !== 'play'));
  for (const id of ['title', 'menu', 'intro', 'play']) $(`#${id}`).hidden = id !== screen;
  sound.music(screen === 'title' ? 'chamber' : screen === 'menu' || screen === 'intro' ? 'lullaby' : null);
  if (screen === 'title') titleBg.start(); else titleBg.stop();
  input.lockHeld();
  clearFocus();
  refreshAllGlyphs();
  renderPlayers();
}

function openModal(id) {
  if (!S.modals.includes(id)) S.modals.push(id);
  const el = $(`#${id}`);
  el.hidden = false;
  if (id === 'settings') renderSettings();
  if (id === 'instructions') renderInstructions();
  if (id === 'credits') renderCredits();
  input.lockHeld();
  focusFirst(el);
}
function closeModal(id = S.modals[S.modals.length - 1]) {
  if (!id) return;
  $(`#${id}`).hidden = true;
  S.modals = S.modals.filter((m) => m !== id);
  input.lockHeld();
  const top = S.modals[S.modals.length - 1];
  if (top) focusFirst($(`#${top}`)); else restoreScreenFocus();
}
function closeAllModals() { for (const id of S.modals) $(`#${id}`).hidden = true; S.modals = []; }

// ---------------------------------------------------------------- focus and navigation
let focused = null;
function setFocus(el) {
  if (focused) focused.classList.remove('focus');
  focused = el || null;
  if (focused) { focused.classList.add('focus'); try { focused.focus({ preventScroll: true }); } catch { /* fine */ } }
}
function clearFocus() { setFocus(null); }
const visible = (el) => !!el && el.offsetParent !== null && !el.closest('[hidden]');
function navRoot() {
  const top = S.modals[S.modals.length - 1];
  return top ? $(`#${top}`) : $(`#${S.screen}`);
}
function focusables(root = navRoot()) { return $$('[data-nav]', root).filter(visible); }
function focusFirst(root) {
  const list = focusables(root);
  setFocus(list.find((e) => e.classList.contains('primary')) || list[0]);
}
function restoreScreenFocus() {
  if (S.screen === 'menu') focusCards();
  else if (S.screen === 'intro') setFocus($('#intro [data-action="begin"]'));
  else if (S.screen === 'title') setFocus(S.titleNav ? $('#press-start') : null);
  else clearFocus();
}
function moveFocus(dir) {
  const list = focusables();
  if (!list.length) return;
  if (!focused || !list.includes(focused)) { setFocus(list[0]); return; }
  const a = focused.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of list) {
    if (el === focused) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    const primary = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    if (primary <= 2) continue;
    const ortho = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = primary + ortho * 2.2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) { setFocus(best); sound.tick(); }
}

// ---------------------------------------------------------------- title
let revealTitle = () => {};
const titleBg = createTitleBg($('#title-bg'), { images: [], reduced: reduced(), startPlate: TITLE_ZOOM_START });
{
  const logo = delivered('MP-G01');
  const background = Promise.all(TITLE_ZOOM_PLATES.map(loadImage)).then((imgs) => {
    if (imgs.some((img) => !img)) return false;
    titleBg.setImages(imgs);
    return true;
  });
  const logoReady = logo ? loadImage(logo).then((img) => {
    if (img) { const el = $('#logo-img'); el.src = img.src; el.alt = t('shell.title.logoAlt'); el.hidden = false; }
    return !!img;
  }) : Promise.resolve().then(() => {
    $('#logo-text').classList.remove('visually-hidden'); $('.vernier').hidden = false; return true;
  });
  // The page opens black (#boot in index.html) and fades into the title once
  // the fonts, logo and title plates are in, so nothing jumps as they arrive;
  // a loading bar shows if that takes more than two seconds.
  const boot = $('#boot');
  let bootLeft = TITLE_ZOOM_PLATES.length + 2, bootDone = 0;
  const bootTick = () => {
    bootDone++;
    const pct = Math.round((bootDone / bootLeft) * 100);
    $('.bar i', boot).style.width = `${pct}%`;
    boot.setAttribute('aria-valuenow', String(pct));
  };
  TITLE_ZOOM_PLATES.forEach((src) => loadImage(src).then(bootTick));
  logoReady.then(bootTick);
  const fonts = (document.fonts?.ready ?? Promise.resolve()).then(bootTick);
  const slowTimer = setTimeout(() => boot.classList.add('slow'), 2000);
  revealTitle = () => {
    if (boot.classList.contains('done')) return;
    clearTimeout(slowTimer);
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 900);
  };
  Promise.race([
    Promise.all([background, logoReady, fonts]),
    new Promise((r) => setTimeout(r, 20000)),
  ]).then(() => requestAnimationFrame(() => requestAnimationFrame(revealTitle)));
  Promise.all([background, logoReady]).then((ok) => {
    openMenuArt();
    const loader = $('#title-art-loading');
    loader.classList.remove('art-loading');
    loader.hidden = ok.every(Boolean);
    if (!loader.hidden) { loader.classList.add('art-error'); loader.setAttribute('aria-label', t('shell.title.artUnavailable')); }
  });
  const menuBg = delivered('MP-G03');
  if (menuBg) { const el = $('.menu-bg'); el.classList.add('art'); afterTitleArt(() => showArtwork(el, menuBg)); }
  const paper = delivered('MP-G05');
  if (paper) loadImage(paper).then((img) => img && document.documentElement.style.setProperty('--paper', `url(${paper})`));
}

// Any input on the title that doesn't start the game starts its music:
// browsers allow sound only after a press, so this is the first chance.
function titleMusic() { sound.unlock(); }

function pressStart() {
  sound.setOn(true);
  syncSoundButtons();
  sound.unlock();
  sound.start();
  goMenuFromTitle(fsEl() ? null : enterFullscreen());
}

// ---------------------------------------------------------------- menu (world select)
const cardsEl = $('#cards');
function buildCards() {
  const frame = delivered('MP-G04');
  cardsEl.innerHTML = WORLDS.map((w, i) => `
    <div class="wcard${frame ? ' framed' : ''}" role="option" data-i="${i}" tabindex="-1" aria-label="${t('shell.menu.cardLabel', { name: w.name, creature: w.creature })}"><div class="lift">
      <div class="face">
        <div class="art"><span class="no">${t('shell.menu.cardNo', { roman: ROMAN[i] })}</span><span class="stamp"></span></div>
        <div class="body">
          <p class="look">${w.look}</p>
          <h3>${w.name}</h3>
          <p class="who">${w.creature} · <em>${w.latin}</em></p>
          <dl>
            <div><dt>${t('shell.menu.magnification')}</dt><dd>${w.mag}<small>${w.magNote}</small></dd></div>
            <div><dt>${t('shell.menu.field')}</dt><dd>${w.field}</dd></div>
            <div><dt>${t('shell.menu.body')}</dt><dd>${w.body}</dd></div>
            <div><dt>${t('shell.menu.world')}</dt><dd>${t('shell.menu.worldOf', { n: i + 1 })}</dd></div>
          </dl>
          <p class="line">${w.line}</p>
        </div>
      </div>
      ${frame ? `<div class="frame" style="border-image-source:url('${frame}')"></div>` : ''}
    </div></div>`).join('');
  for (const c of $$('.wcard', cardsEl)) {
    const art = $('.art', c), src = cardArt(WORLDS[+c.dataset.i]);
    afterTitleArt(() => { if (!art.dataset.artSrc) showArtwork(art, src); });
    c.addEventListener('click', () => {
      const i = +c.dataset.i;
      if (i === S.sel) openIntro(); else selectCard(i);
    });
  }
  buildScaleRule();
}
function updateStamps() {
  for (const c of $$('.wcard', cardsEl)) {
    const w = WORLDS[+c.dataset.i];
    const st = $('.stamp', c);
    const visited = progress.visited.includes(w.id);
    const far = visited && +c.dataset.i === progress.furthest;
    st.className = 'stamp' + (far ? ' far' : visited ? '' : ' new');
    st.textContent = far ? t('shell.menu.furthest') : visited ? t('shell.menu.visited') : t('shell.menu.unvisited');
  }
}
function layoutCards() {
  const wide = innerWidth;
  const cw = Math.min(300, Math.max(220, wide * 0.25));
  const spacing = Math.min(cw * 0.86, wide * 0.3);
  for (const c of $$('.wcard', cardsEl)) {
    const d = +c.dataset.i - S.sel;
    const ad = Math.abs(d);
    const x = d * spacing + Math.sign(d) * (ad ? cw * 0.18 : 0);
    const z = -ad * 170;
    const rot = -Math.sign(d) * Math.min(ad, 2) * 16;
    const sc = ad ? 0.86 : 1.04;
    c.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${rot}deg) scale(${sc})`;
    c.style.opacity = ad > 3 ? '0' : '1';
    c.style.filter = ad ? `brightness(${1 - ad * 0.14}) saturate(${1 - ad * 0.15})` : 'none';
    c.style.zIndex = String(10 - ad);
    c.classList.toggle('sel', ad === 0);
    c.setAttribute('aria-selected', String(ad === 0));
  }
  const w = WORLDS[S.sel];
  $('.menu-bg').style.transform = `translate3d(${(3 - S.sel) * 10}px, 0, 0) scale(1.02)`;
  $('#menu').style.setProperty('--world', w.accent);
  const cur = $('.scale-rule .cursor');
  if (cur) {
    const pos = scalePos(w.fieldMm);
    cur.style.left = `${pos}%`;
    const lab = cur.querySelector('span');
    lab.style.transform = pos < 15 ? 'translateX(-12px)' : pos > 85 ? 'translateX(calc(-100% + 12px))' : '';
    lab.innerHTML = t('shell.menu.ruleCursor', { name: w.name, field: unitSafe(fmtField(w.fieldMm)) });
  }
  $$('.scale-rule .wm').forEach((m, i) => m.classList.toggle('on', i === S.sel));
}
const LOG_MAX = Math.log10(60), LOG_MIN = Math.log10(0.0006);
const scalePos = (mm) => ((LOG_MAX - Math.log10(mm)) / (LOG_MAX - LOG_MIN)) * 100;
function buildScaleRule() {
  const el = $('#scale-rule');
  let html = '<div class="bar"></div>';
  const labels = { 1: '1 cm', 0: '1 mm', '-1': '100 <span class="u">µm</span>', '-2': '10 <span class="u">µm</span>', '-3': '1 <span class="u">µm</span>' };
  for (let e = 1; e >= -3; e--) {
    for (let k = 1; k < 10; k++) {
      const mm = k * 10 ** e;
      if (mm > 60) continue;
      const x = scalePos(mm);
      html += `<div class="tick ${k === 1 ? 'major' : 'minor'}" style="left:${x}%"></div>`;
      if (k === 1) html += `<div class="lab" style="left:${x}%">${labels[e]}</div>`;
    }
  }
  html += WORLDS.map((w) => `<div class="wm" style="left:${scalePos(w.fieldMm)}%"></div>`).join('');
  html += '<div class="cursor"><span></span></div>';
  el.innerHTML = html;
}
function selectCard(i, silent) {
  const n = Math.max(0, Math.min(WORLDS.length - 1, i));
  if (n === S.sel) return;
  S.sel = n;
  if (!silent) sound.card();
  loadImage(introArt(WORLDS[n]));
  layoutCards();
}
function focusCards() { S.menuFocus = 'cards'; setFocus($(`.wcard[data-i="${S.sel}"]`)); }
// Everything the world select shows: its background, the card frame, the
// seven card plates and the selected world's intro plate. They load while the
// title idles (after the title's own art); leaving the title before they are in
// holds the select screen black and fades it in once they are.
let menuArtIn = false;
const menuReady = menuArtGate.then(() => Promise.all(
  [delivered('MP-G03'), delivered('MP-G04'), ...WORLDS.map(cardArt), introArt(WORLDS[S.sel])].filter(Boolean).map(loadImage),
)).then(() => { menuArtIn = true; });
function goMenuFromTitle(fullscreen) {
  if (menuArtIn && !fullscreen) { goMenu(); return; }
  const veil = $('#menu-veil');
  veil.classList.remove('fade', 'slow');
  veil.hidden = false;
  S.veiled = true;
  goMenu();
  const slow = setTimeout(() => veil.classList.add('slow'), 2000);
  const srcs = [delivered('MP-G03'), delivered('MP-G04'), ...WORLDS.map(cardArt)].filter(Boolean);
  let n = 0;
  const bar = $('.bar i', veil);
  for (const src of srcs) loadImage(src).then(() => { n++; bar.style.width = `${Math.round((n / srcs.length) * 100)}%`; });
  Promise.race([
    Promise.all([menuReady, fullscreen || Promise.resolve()]),
    new Promise((r) => setTimeout(r, 20000)),
  ]).then(() => {
    clearTimeout(slow);
    layoutCards();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      S.veiled = false;
      veil.classList.add('fade');
      setTimeout(() => { if (veil.classList.contains('fade')) veil.hidden = true; }, 750);
    }));
  });
}
function goMenu() {
  clearPreload();
  closeAllModals();
  show('menu');
  updateStamps();
  layoutCards();
  focusCards();
}
addEventListener('resize', () => { if (S.screen === 'menu') layoutCards(); });
$('#menu').addEventListener('pointermove', (e) => {
  const dx = (e.clientX / innerWidth - 0.5) * -18, dy = (e.clientY / innerHeight - 0.5) * -12;
  $('.menu-bg').style.transform = `translate3d(${(3 - S.sel) * 10 + dx}px, ${dy}px, 0) scale(1.02)`;
});
$('#menu').addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) + Math.abs(e.deltaX) > 20) selectCard(S.sel + Math.sign(e.deltaY || e.deltaX)); }, { passive: true });

// ---------------------------------------------------------------- intro
function fillIntro(w) {
  const i = WORLDS.indexOf(w);
  $('#intro-no').textContent = t('shell.intro.worldNo', { roman: ROMAN[i] });
  $('#intro-look').textContent = w.look;
  $('#intro-name').textContent = w.name;
  $('#intro-creature').textContent = w.creature;
  $('#intro-latin').textContent = w.latin;
  $('#intro-plate').innerHTML = `<div><dt>${t('shell.intro.magnification')}</dt><dd>${w.mag}<small>${w.magNote}</small></dd></div><div><dt>${t('shell.intro.field')}</dt><dd>${w.field}</dd></div>`
    + `<div><dt>${t('shell.intro.body')}</dt><dd>${w.body}</dd></div><div><dt>${t('shell.intro.look')}</dt><dd style="font-size:.9rem">${w.look}</dd></div>`;
  $('#intro-goal').textContent = w.goal; // one line: the portal and the main threats (the owner, 2026-11-02)
  $('#intro-facts').innerHTML = w.facts.map((f) => `<li>${f}</li>`).join('');
  renderIntroControls();
  showArtwork($('.intro-art'), introArt(w));
}
function renderIntroControls() {
  const w = WORLDS[S.sel];
  // No portal / way-back (Y) or Menu rows: the world asks for Y when it is wanted, and Menu pauses (the owner, 2026-11-03).
  const rows = [...w.controls.filter(([b]) => b !== 'Menu' && b !== 'View'), ['View', t('shell.controls.showHide')]];
  $('#intro-controls').innerHTML = controlRows(rows);
}
// The screen being left stays on screen, untouchable, while the new one
// animates over or away from it; the returned function hides it again.
function ghost(id) {
  const el = $(`#${id}`);
  el.hidden = false;
  el.classList.add('ghost');
  return () => { el.classList.remove('ghost'); el.hidden = S.screen !== id; };
}
const SLIDE = { duration: 560, easing: 'cubic-bezier(.3,.15,.15,1)', fill: 'both' };
const SLIDE_OUT = { duration: 460, easing: 'cubic-bezier(.45,0,.6,1)', fill: 'both' };
const settle = (anims) => Promise.all(anims.map((a) => a.finished.catch(() => {})));
/** The intro's panel leaving to the left and its plate to the right (back to the tray, and into the world). */
function slideIntroOff(intro) {
  const art = $('.intro-art', intro), shade = $('.intro-shade', intro), panel = $('.intro-panel', intro);
  for (const a of art.getAnimations()) if (!(a instanceof CSSAnimation)) a.cancel(); // a late plate still sliding in
  return [
    panel.animate([{ opacity: 1, translate: '0 0' }, { opacity: 1, offset: 0.6 }, { opacity: 0, translate: 'calc(-100% - 48px) 0' }], SLIDE_OUT),
    art.animate([{ opacity: 1, translate: '0 0' }, { opacity: 1, offset: 0.45 }, { opacity: 0, translate: '38% 0' }], SLIDE_OUT),
    shade.animate([{ opacity: 1 }, { opacity: 0 }], { ...SLIDE_OUT, easing: 'ease-in' }),
  ];
}
async function openIntro() {
  if (S.zooming) return;
  const w = WORLDS[S.sel];
  sound.introIn();
  fillIntro(w);
  preloadWorld(S.sel);
  const card = $(`.wcard[data-i="${S.sel}"] .art`);
  const src = introArt(w);
  if (card && readyImage(src) && cardArt(w) === src && !reduced()) {
    // The card and the intro share one image, so the card grows into the
    // full-screen plate without stretching: a full-screen layer of the plate
    // (framed exactly as the intro shows it) is clipped to the card's
    // rectangle and the clip opens to the screen, while the card's own art
    // grows with it (always cropped, never squashed) and fades into the plate.
    const r = card.getBoundingClientRect();
    const W = innerWidth, H = innerHeight;
    const z = document.createElement('div');
    z.className = 'zoomer';
    const plate = document.createElement('div');
    plate.className = 'zoomer-plate';
    plate.style.backgroundImage = `url('${src}')`;
    const face = document.createElement('div');
    face.className = 'zoomer-face';
    face.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;background-image:url('${cardArt(w)}')`;
    z.append(plate, face);
    document.body.appendChild(z);
    const clip = (t, rad) => `inset(${t.top}px ${W - t.right}px ${H - t.bottom}px ${t.left}px round ${rad}px)`;
    const opts = { duration: 650, easing: 'cubic-bezier(.6,.05,.2,1)', fill: 'forwards' };
    const anim = z.animate([{ clipPath: clip(r, 10) }, { clipPath: clip({ top: 0, left: 0, right: W, bottom: H }, 0) }], opts);
    face.animate([
      { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, opacity: 1 },
      { opacity: 1, offset: 0.25 },
      { left: '0px', top: '0px', width: `${W}px`, height: `${H}px`, opacity: 0 },
    ], opts);
    S.zooming = true;
    await anim.finished.catch(() => {});
    show('intro');
    // the paper panel slides in over the plate rather than appearing at once
    $('#intro .intro-panel')?.animate([{ opacity: 0, transform: 'translateX(-18px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
    S.zooming = false;
    z.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).finished.then(() => z.remove(), () => z.remove());
    setFocus($('#intro [data-action="begin"]'));
    return;
  }
  // The card's art differs from the intro's plate (the usual case), so
  // nothing grows out of the card: it would turn into another picture on the
  // way. The paper panel slides in from the left and the plate from the right
  // while the tray fades out underneath. A plate not decoded yet keeps its
  // spinner and slides in when it arrives.
  show('intro');
  setFocus($('#intro [data-action="begin"]'));
  const intro = $('#intro'), menu = $('#menu');
  const art = $('.intro-art', intro), shade = $('.intro-shade', intro), panel = $('.intro-panel', intro);
  const unghost = ghost('menu');
  intro.classList.add('tx');
  S.zooming = true;
  let anims;
  if (reduced()) {
    anims = [intro.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'both' })];
  } else {
    const plateIn = () => art.animate([{ opacity: 0, translate: '38% 0' }, { opacity: 1, offset: 0.55 }, { opacity: 1, translate: '0 0' }], SLIDE);
    anims = [
      menu.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 440, easing: 'ease-in-out', fill: 'both' }),
      shade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'both' }),
      panel.animate([{ opacity: 0, translate: 'calc(-100% - 48px) 0' }, { opacity: 1, offset: 0.4 }, { opacity: 1, translate: '0 0' }], SLIDE),
    ];
    if (readyImage(src)) anims.push(plateIn());
    else {
      loadImage(src).then((img) => {
        if (img && S.screen === 'intro' && art.dataset.artSrc === src) { const a = plateIn(); a.finished.then(() => a.cancel(), () => {}); }
      });
    }
  }
  await settle(anims);
  for (const a of anims) a.cancel();
  unghost();
  intro.classList.remove('tx');
  S.zooming = false;
}
/** Back from the intro to the tray, selection kept: the panel leaves to the left, the plate to the right, then the tray fades in. */
async function closeIntro() {
  if (S.zooming) return;
  sound.introOut();
  goMenu();
  const intro = $('#intro'), menu = $('#menu');
  const unghost = ghost('intro');
  intro.classList.add('tx');
  S.zooming = true;
  const anims = reduced()
    ? [intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'both' }),
      menu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120, easing: 'ease-out', fill: 'both' })]
    : [...slideIntroOff(intro), menu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: 200, easing: 'ease-out', fill: 'both' })];
  await settle(anims);
  for (const a of anims) a.cancel();
  unghost();
  intro.classList.remove('tx');
  S.zooming = false;
}

// ---------------------------------------------------------------- play
const host = $('#frame-host');
let unlisten = () => {};
let preloaded = null;
function worldUrl(w) { return new URL(`${w.id}/?embed=1`, PROTO).href; }

function makeWorldFrame(w) {
  const f = document.createElement('iframe');
  f.title = `${w.name}: ${w.creature}`;
  f.allow = 'autoplay; fullscreen; gamepad';
  f.src = worldUrl(w);
  host.appendChild(f);
  return f;
}

function clearPreload() {
  if (!preloaded) return;
  preloaded.unlisten();
  preloaded.frame.remove();
  preloaded = null;
}

function preloadWorld(i) {
  if (preloaded?.i === i) return;
  clearPreload();
  const frame = makeWorldFrame(WORLDS[i]);
  // loading behind the world in play (or the intro): drawn, but not seen
  Object.assign(frame.style, { opacity: '0', zIndex: '0', pointerEvents: 'none' });
  const p = preloaded = { i, frame, ready: false, hud: null, provides: [], opening: null, onOpening: null };
  p.unlisten = listen(frame.contentWindow, (m) => {
    if (preloaded !== p) return;
    if (m.type === 'hud') p.hud = m;
    if (m.type === 'ready') {
      p.ready = true;
      p.provides = Array.isArray(m.provides) ? m.provides : [];
      send(frame, 'sound', { on: false, volume: 0 });
    }
    if (m.type === 'opening') { p.opening = m.pose; p.onOpening?.(m.pose); }
  });
  // embed=1 runs its first two frames, then holds until Begin sends resume.
  // The host stays viewport-sized behind the intro, so WebGL can initialise.
}

function loadWorld(i, { first }) {
  const w = WORLDS[i];
  S.world = i;
  S.hud = null;
  S.near = null;
  S.loading = true;
  S.paused = false;
  S.devPanel = false;
  showPrompt(null);
  hideControlsCard();
  $('#plaque .no').textContent = t('shell.play.plaqueNo', { roman: ROMAN[i] });
  $('#plaque .nm').textContent = w.name;
  $('#plaque .mg').textContent = t('shell.play.plaqueMag', { mag: w.mag, field: w.field });
  const veil = $('#veil');
  const warm = preloaded?.i === i ? preloaded : null;
  veil.hidden = !!warm?.ready; veil.classList.remove('fade');
  veil.querySelector('p').textContent = t('shell.play.preparing');
  unlisten();
  if (S.frame) S.frame.remove();
  let f;
  if (warm) {
    warm.unlisten();
    preloaded = null;
    f = warm.frame; // Keep the browsing context; moving/recreating it would reload the world.
    for (const k of ['opacity', 'zIndex', 'pointerEvents', 'transition', 'visibility']) f.style[k] = '';
  } else { clearPreload(); f = makeWorldFrame(w); }
  S.frame = f;
  unlisten = listen(f.contentWindow, (m) => onWorldMessage(m, f));
  if (warm?.hud) onWorldMessage(warm.hud, f);
  if (!progress.visited.includes(w.id)) progress.visited.push(w.id);
  progress.furthest = Math.max(progress.furthest, i);
  saveProgress();
  const showCard = !first && settings.controlsAtStart;
  S.pendingCard = showCard;
  clearTimeout(S.loadTimer);
  S.loadTimer = setTimeout(() => { if (S.loading && S.frame === f) veil.querySelector('p').textContent = t('shell.play.slowLoad'); }, 15000);
  const ready = new Promise((resolve) => { S.onReady = resolve; });
  if (warm?.ready) worldReady(f);
  return ready;
}

async function worldReady(f) {
  if (S.frame !== f || !S.loading) return;
  S.loading = false;
  clearTimeout(S.loadTimer);
  send(f, 'sound', { on: sound.on, volume: sound.volume, soundSet: sound.set });
  send(f, 'settings', { invertY, freeCamera });
  send(f, 'players', { roster: roster.toJSON() });
  const veil = $('#veil');
  if (!veil.hidden) {
    veil.classList.add('fade');
    setTimeout(() => { if (!S.loading && S.frame === f) veil.hidden = true; }, 520);
  }
  S.onReady?.();
  S.onReady = null;
  // (loaded behind a transition: the card waits until the transition ends)
  if (S.pendingCard && !S.transitioning) { showControlsCard(8); S.pendingCard = false; S.cardBoard = S.board; }
  if (!S.paused && !S.transitioning && S.modals.length === 0) await resumeFrame();
}

// Let the world run once every controller button is released (the A that
// began, or the Menu that resumed, must not reach the world).
async function resumeFrame() {
  const t0 = performance.now();
  while (input.anyHeld() && performance.now() - t0 < 1200) await sleep(30);
  if (S.screen !== 'play' || S.paused || S.transitioning || S.loading) return;
  send(S.frame, 'players', { roster: roster.toJSON() });
  send(S.frame, 'resume');
  S.resumedAt = performance.now();
  sound.setPaused(false);
  try { S.frame.focus(); S.frame.contentWindow.focus(); } catch { /* fine */ }
}

function onWorldMessage(m, f) {
  if (f !== S.frame) return;
  switch (m.type) {
    case 'ready': worldReady(f); break;
    case 'hud': S.hud = { title: m.title, sub: m.sub, rows: Array.isArray(m.controls) ? m.controls : null }; if (S.controlsShown) renderControlsCard(); break;
    case 'menu':
      if (S.devPanel) break;
      if (performance.now() - S.resumedAt < 400) break;
      if (dedupe('menu')) pause();
      break;
    case 'view': if (dedupe('view')) toggleControls(); break;
    case 'landmark': landmark(m.kind, m); break;
    case 'frozen': S.onFrozen?.(m.pose, m.move); break;
    case 'near':
      // no prompt for the way on: the portal itself says "go there" (the backdoor keeps its Y prompt)
      // the backdoor and a portal you are in (unguarded) get a Y prompt; nearing the way on only preloads
      showPrompt(m.on && (m.kind === 'back' || m.kind === 'portal') ? m : null);
      // nearing the way on (or back): start loading that world already
      if (m.on && !S.transitioning) { const n = S.world + (m.kind === 'back' ? -1 : 1); if (n >= 0 && n < WORLDS.length) preloadWorld(n); }
      break;
    case 'join': announceJoin({ index: m.index ?? roster.list.length, color: m.color || '#d8a440', name: m.name }); if (m.roster) roster.fromJSON(m.roster); break;
    case 'features':
      if (!m.open && S.devPanel) { S.devPanel = false; pause(t('shell.pause.fromFeatures')); }
      break;
    default: break;
  }
}
// One press can arrive twice (the shell polls the pad, and the world posts it).
function dedupe(kind) {
  const now = performance.now();
  if (now - S.lastToggle[kind] < 260) return false;
  S.lastToggle[kind] = now;
  return true;
}

/**
 * Begin: the intro's panel slides off to the left and its plate to the right
 * (as going back does) over a dark backdrop, and the world (preloaded behind
 * the intro, held on its first frames) fades in underneath; it runs once the
 * reveal ends. A world not ready yet is revealed as its loading veil, which
 * fades into the world when it is (worldReady). Reduced motion: a crossfade.
 * Input is ignored meanwhile, and the world never sees the Begin press
 * (resumeFrame waits for every button to be released).
 */
async function beginPlay() {
  if (S.zooming || S.screen !== 'intro') return;
  sound.begin();
  S.board = 0;
  closeAllModals();
  const intro = $('#intro');
  show('play');
  const unghost = ghost('intro');
  intro.classList.add('tx', 'begin');
  S.zooming = true;
  S.transitioning = true; // holds the world (and the controls card) until the reveal ends
  const ready = loadWorld(S.sel, { first: true });
  const f = S.frame, veil = $('#veil');
  f.style.transition = 'none'; // the reveal's own fade, not the frame's CSS one
  // the preloaded world drew only its first frames (maybe before its art arrived): let it draw a few more, still paused
  send(f, 'redraw', { frames: 4 });
  const rm = reduced();
  const fadeIn = rm ? { duration: 320, delay: 80, easing: 'ease-out', fill: 'both' } : { duration: 520, delay: 150, easing: 'ease-out', fill: 'both' };
  const anims = rm ? [intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'both' })] : slideIntroOff(intro);
  // The slide reveals the dark backdrop; the world fades in once it is running
  // (its held first frames show it before it starts, which can differ in colour
  // from the running world, so revealing those would snap). A world still
  // loading shows its veil instead.
  const fadeWorld = veil.hidden;
  if (fadeWorld) f.style.opacity = '0';
  anims.push($('#play .play-hud').animate([{ opacity: 0 }, { opacity: 1 }], fadeIn));
  await settle(anims);
  for (const a of anims) a.cancel();
  f.style.transition = '';
  unghost();
  intro.classList.remove('tx', 'begin');
  S.zooming = false;
  S.transitioning = false;
  if (document.hidden) pause(t('shell.pause.tabHidden'));
  if (S.frame === f && S.screen === 'play' && !S.loading) {
    if (S.pendingCard) { showControlsCard(8); S.pendingCard = false; S.cardBoard = S.board; }
    if (!S.paused && S.modals.length === 0) await resumeFrame();
  }
  if (fadeWorld && (S.frame !== f || S.paused || S.screen !== 'play')) f.style.opacity = ''; // not running (paused, left): just show it
  else if (fadeWorld) {
    // a frame or two of the running world first, then fade it in
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await sleep(rm ? 0 : 60);
    f.style.transition = 'none';
    const a = f.animate([{ opacity: 0 }, { opacity: 1 }], rm ? { duration: 260, easing: 'ease-out', fill: 'both' } : { duration: 480, easing: 'ease-out', fill: 'both' });
    await a.finished.catch(() => {});
    f.style.opacity = '';
    a.cancel();
    f.style.transition = '';
  }
  await ready;
}

// Paused, only the world's own drawing (its canvases) is blurred, not its info
// panels or the shell's UI (the owner, 2026-11-04): a style put into the world's
// page (same origin) while the pause menu is up.
function frameBlur(on) {
  try {
    const doc = S.frame?.contentDocument;
    if (!doc) return;
    let st = doc.getElementById('mz-pause-blur');
    if (on && !st) {
      st = doc.createElement('style');
      st.id = 'mz-pause-blur';
      st.textContent = 'canvas { filter: blur(5px) saturate(.8); transition: filter .25s; }';
      doc.head.appendChild(st);
    } else if (!on && st) st.remove();
  } catch { /* not reachable: leave it */ }
}
function pause(reason = '') {
  if (S.screen !== 'play' || S.paused || S.transitioning) return;
  S.paused = true;
  S.devPanel = false;
  send(S.frame, 'pause');
  sound.pause(); // (heard over the paused mute)
  sound.setPaused(true);
  showPrompt(S.near);
  $('#pause-world').textContent = t('shell.pause.world', { roman: ROMAN[S.world], name: WORLDS[S.world].name });
  $('#pause-reason').textContent = reason;
  renderPlayers();
  openModal('pause');
  frameBlur(true);
}
function resume() {
  if (!S.paused) return;
  sound.resume();
  frameBlur(false);
  closeAllModals();
  S.paused = false;
  restoreScreenFocus();
  if (!S.loading) resumeFrame();
}
function confirmThen(title, text, fn, { cancel = t('shell.confirm.stay'), ok = t('shell.confirm.leave') } = {}) {
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-text').hidden = !text;
  $('#confirm [data-action="cancel"]').textContent = cancel;
  $('#confirm [data-action="ok"]').textContent = ok;
  S.confirmFn = fn;
  openModal('confirm');
}
function restartWorld() {
  closeAllModals();
  frameBlur(false);
  S.paused = false;
  S.board++;
  loadWorld(S.world, { first: false });
}
function leavePlay(to) {
  clearPreload();
  clearTimeout(S.loadTimer);
  unlisten();
  if (S.frame) { S.frame.remove(); S.frame = null; }
  S.paused = false; S.loading = false;
  hideControlsCard();
  showPrompt(null);
  sound.setPaused(false);
  if (to === 'title') { closeAllModals(); show('title'); S.titleNav = false; }
  else { S.sel = S.world; goMenu(); }
}

async function landmark(kind, info = {}) {
  if (S.screen !== 'play' || S.transitioning || S.loading) return;
  const i = S.world;
  if (kind === 'back' && i === 0) { toast(t('shell.toasts.topOfChain')); return; }
  if (kind === 'forward' && i === WORLDS.length - 1) {
    send(S.frame, 'pause');
    S.paused = true;
    sound.setPaused(true);
    confirmThen(t('shell.confirm.endTitle'), '', () => leavePlay('menu'), { cancel: t('shell.confirm.endStay'), ok: t('shell.confirm.endLeave') });
    return;
  }
  const next = kind === 'forward' ? i + 1 : i - 1;
  // Load the next world behind the transition (it holds on its first frames
  // until Begin/resume), so it is ready when the animation ends.
  preloadWorld(next);
  S.transitioning = true;
  closeAllModals();
  hideControlsCard();
  showPrompt(null);
  try {
    // the continuous transition (embed.js), when the old world plays its outro and the setting allows it
    const continuous = kind === 'forward' && info.outro && settings.transition === 'microscope' && await continuousForward(next);
    if (!continuous) {
      send(S.frame, 'pause');
      const style = settings.transition === 'card' ? 'card' : 'microscope';
      await transitions.playTransition(WORLDS[i], WORLDS[next], kind === 'forward' ? 'in' : 'out', { style });
      S.board++;
      const ready = loadWorld(next, { first: false });
      await Promise.race([ready, sleep(12000)]);
    }
  } finally {
    S.cont = null;
    S.transitioning = false;
    if (S.pendingCard && !S.loading) { showControlsCard(8); S.pendingCard = false; S.cardBoard = S.board; }
    $('#transition').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' }).finished
      .then(() => { transitions.hide(); $('#transition').getAnimations().forEach((a) => a.cancel()); });
    if (!S.loading && !S.paused) resumeFrame();
  }
}

/** Wait for fn() to be truthy (polled), up to ms; resolves to its value or null. */
async function waitFor(fn, ms) {
  const t0 = performance.now();
  for (;;) { const v = fn(); if (v) return v; if (performance.now() - t0 > ms) return null; await sleep(60); }
}

/**
 * The continuous transition into world `next` (embed.js "Continuous
 * transitions"). The old world has posted `landmark {outro: true}` and is
 * playing its success and slow-down; this waits for its freeze (`frozen`),
 * for the preloaded next world to be ready and to provide 'intro', holds it
 * (`hold` → `opening`), then plays the camera move and crossfade
 * (continuous.js) and hands over (`begin`). Returns false, having changed
 * nothing on screen, if any of that does not come (the caller plays the
 * microscope zoom instead).
 */
async function continuousForward(next) {
  const old = S.frame;
  S.cont = { phase: 'outro', u: 0, alpha: 0 };
  let move = null; // the old world may ask for a longer move or a later crossfade (embed.js `frozen`)
  const frozen = await new Promise((resolve) => {
    // (the outro runs in the world's frame time: on a slow machine it takes longer)
    const timer = setTimeout(() => resolve(null), 20000);
    S.onFrozen = (pose, mv) => { clearTimeout(timer); move = mv || null; resolve(pose); };
  });
  S.onFrozen = null;
  if (!validPose(frozen) || S.frame !== old) return false;
  // the freeze holds while the next world finishes loading (it began when the player neared the portal)
  S.cont.phase = 'loading';
  const p = await waitFor(() => (preloaded?.i === next && preloaded.ready ? preloaded : null), 45000); // the freeze holds meanwhile; a slow machine waits rather than falling back
  if (!p || !p.provides.includes('intro') || S.frame !== old) return false;
  S.cont.phase = 'hold';
  p.opening = null;
  const opening = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    p.onOpening = (pose) => { clearTimeout(timer); resolve(pose); };
    send(p.frame, 'hold');
  });
  p.onOpening = null;
  if (!validPose(opening) || preloaded !== p) { send(p.frame, 'pause'); return false; }
  S.cont.phase = 'move';
  const { duration, fade, halo } = moveOf(move);
  sound.zoom('in', duration / Math.max(0.05, S.trSpeed));
  await playContinuous({ oldFrame: old, newFrame: p.frame, from: frozen, to: opening, send, speed: () => S.trSpeed, seek: () => S.trSeek, duration, fade, halo,
    onFrame: ({ u, alpha }) => { S.cont.u = u; S.cont.alpha = alpha; } });
  S.cont.phase = 'begin';
  S.board++;
  const ready = loadWorld(next, { first: false }); // the warm frame: the old one goes, this one stays as it is
  await Promise.race([ready, sleep(4000)]);
  send(S.frame, 'begin');
  return true;
}

function showPrompt(m) {
  S.near = m;
  const el = $('#prompt');
  if (!m || S.paused) { el.hidden = true; return; }
  const i = S.world;
  if (m.kind === 'portal') { el.innerHTML = `${glyph('Y')} ${m.label || t('shell.prompts.enterPortal')}`; el.hidden = false; return; }
  if (m.kind !== 'back') { el.hidden = true; return; } // nearing the way on has no text (the portal shows it)
  const label = m.label || (m.kind === 'back'
    ? (i > 0 ? t('shell.prompts.riseTo', { name: WORLDS[i - 1].name }) : t('shell.prompts.topOfChain'))
    : (i < WORLDS.length - 1 ? t('shell.prompts.zoomInTo', { name: WORLDS[i + 1].name }) : t('shell.prompts.workInProgress')));
  el.innerHTML = (m.kind === 'back' ? glyph('Y') + ' ' : '→ ') + label;
  el.hidden = false;
}

// ---------------------------------------------------------------- controls card
let cardTimer = 0;
function renderControlsCard() {
  const w = WORLDS[S.world];
  let rows = S.hud?.rows || w.controls;
  rows = rows.filter(([b]) => b !== 'Menu' && b !== 'View');
  rows = [...rows, ['View', t('shell.controls.showHide')]];
  const multi = roster.list.length > 1;
  $('#controls-card').innerHTML = `<p class="eyebrow small"><span>${t('shell.controls.cardEyebrow', { roman: ROMAN[S.world], look: w.look })}</span></p>
    <h3>${w.name}</h3><p class="sub">${w.goal}</p>
    <ul class="controls-list">${controlRows(rows)}</ul>
    ${multi ? '<div class="players-row"></div>' : ''}
    <div class="foot"><span>${glyphMode() === 'controller' ? t('shell.controls.controller') : t('shell.controls.keyboard')}</span><span>${t('shell.controls.hides', { glyph })}</span></div>
    <div class="timer"></div>`;
  if (multi) renderPlayers();
}
function showControlsCard(autoHide = 0) {
  S.controlsShown = true;
  renderControlsCard();
  const el = $('#controls-card');
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  $('[data-action="controls"]').setAttribute('aria-pressed', 'true');
  clearTimeout(cardTimer);
  const bar = $('.timer', el);
  if (autoHide > 0) {
    bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: autoHide * 1000, fill: 'forwards' });
    cardTimer = setTimeout(hideControlsCard, autoHide * 1000);
  } else bar.hidden = true;
}
function hideControlsCard() {
  S.controlsShown = false;
  clearTimeout(cardTimer);
  $('#controls-card').hidden = true;
  $('[data-action="controls"]')?.setAttribute('aria-pressed', 'false');
}
const toggleControls = () => (S.controlsShown ? hideControlsCard() : showControlsCard());

// ---------------------------------------------------------------- settings
// 'microscope' (the default): the continuous transition where both worlds
// support it (springtail → mite → tardigrade → amoeba → paramecium → bacterium → phage), the
// microscope zoom between the rest.
const TRANSITIONS = { microscope: 'Continuous', zoom: 'Microscope zoom', card: 'Specimen plates' };
// Read by every world (same origin) through shared/landmark.js.
const portalArrow = () => { try { return localStorage.getItem('micro.portalArrow') === '1'; } catch { return false; } };
function settingItems() {
  const items = [
    { id: 'sound', label: t('shell.settings.sound'), get: () => sound.on, toggle: () => setSound(!sound.on) },
    { id: 'volume', label: t('shell.settings.volume'), slider: true, get: () => sound.volume, step: (d) => { sound.setVolume(Math.round((sound.volume + d * 0.1) * 10) / 10); pushSound(); sound.tick(); } },
    { id: 'invertY', label: t('shell.settings.invertY'), get: () => invertY, toggle: () => {
      invertY = !invertY;
      try { localStorage.setItem('micro.invertY', invertY ? '1' : '0'); } catch { /* private mode */ }
      send(S.frame, 'settings', { invertY });
    } },
    { id: 'freeCamera', label: t('shell.settings.freeCamera'), about: t('shell.settings.freeCameraAbout'), get: () => freeCamera, toggle: () => {
      freeCamera = !freeCamera;
      try { localStorage.setItem('micro.freeCamera', freeCamera ? '1' : '0'); } catch { /* private mode */ }
      send(S.frame, 'settings', { freeCamera });
    } },
    { id: 'portalArrow', label: t('shell.settings.portalArrow'), about: t('shell.settings.portalArrowAbout'), get: () => portalArrow(), toggle: () => {
      const on = !portalArrow();
      try { localStorage.setItem('micro.portalArrow', on ? '1' : '0'); } catch { /* private mode */ }
    } },
    { id: 'fullscreen', label: t('shell.settings.fullscreen'), get: () => !!fsEl(), toggle: () => { toggleFullscreen(); setTimeout(renderSettings, 250); } },
    { id: 'credits', label: t('shell.credits.settingsItem'), action: '›', run: () => openModal('credits') },
  ];
  if (S.screen === 'play' && S.frame && !S.loading) {
    items.push({ id: 'dev', label: t('shell.settings.worldFeatures'), dev: true, about: t('shell.settings.worldFeaturesAbout'), action: t('shell.settings.open'), run: openDevPanel });
  }
  return items;
}
function renderSettings() {
  const list = $('#settings-list');
  const keep = focused?.dataset?.setting;
  list.innerHTML = '';
  for (const it of settingItems()) {
    const b = document.createElement('button');
    b.className = 'setting' + (it.dev ? ' dev' : '');
    b.dataset.nav = '';
    b.dataset.setting = it.id;
    let val;
    if (it.slider) val = `<span class="slider"><i style="width:${it.get() * 100}%"></i><b style="left:${it.get() * 100}%"></b></span><span class="val">${Math.round(it.get() * 100)}%</span>`;
    else if (it.choices) val = `<span class="val"><span class="arrow">‹</span>${it.show ? it.show(it.get()) : TRANSITIONS[it.get()]}<span class="arrow">›</span></span>`;
    else if (it.action) val = `<span class="val">${it.action}</span>`;
    else val = `<span class="val ${it.get() ? 'on' : 'off'}">${it.get() ? t('shell.settings.on') : t('shell.settings.off')}</span>`;
    b.innerHTML = `<span class="lab">${it.label}</span><span style="display:flex;gap:10px;align-items:center">${val}</span>${it.about ? `<span class="about">${it.about}</span>` : ''}`;
    b.addEventListener('click', (e) => {
      if (it.slider) {
        const s = $('.slider', b).getBoundingClientRect();
        if (e.clientX >= s.left - 10) { sound.setVolume(Math.max(0, Math.min(1, Math.round(((e.clientX - s.left) / s.width) * 10) / 10))); pushSound(); }
      } else activateSetting(it, 1);
      renderSettings();
    });
    list.appendChild(b);
  }
  // Only while Settings is on top: Credits opens over it and keeps the focus.
  if (S.modals[S.modals.length - 1] === 'settings') setFocus((keep && $(`[data-setting="${keep}"]`, list)) || list.firstChild);
}
function activateSetting(it, dir) {
  if (it.slider || it.choices) it.step(dir);
  else if (it.run) it.run();
  else it.toggle();
  sound.tick();
}
function adjustFocusedSetting(dir) {
  const id = focused?.dataset?.setting;
  if (!id) return false;
  const it = settingItems().find((x) => x.id === id);
  if (!it || !(it.slider || it.choices)) return false;
  it.step(dir);
  renderSettings();
  return true;
}
function setSound(on) {
  sound.setOn(on);
  syncSoundButtons();
  pushSound();
  if (S.modals.includes('settings')) renderSettings();
}
const pushSound = () => send(S.frame, 'sound', { on: sound.on, volume: sound.volume, soundSet: sound.set });
function openDevPanel() {
  closeAllModals();
  frameBlur(false);
  S.paused = false;
  S.devPanel = true;
  send(S.frame, 'resume');
  send(S.frame, 'features', { open: true });
  sound.setPaused(false);
  try { S.frame.contentWindow.focus(); } catch { /* fine */ }
}

// ---------------------------------------------------------------- instructions
// ---------------------------------------------------------------- credits
function renderCredits() {
  const rows = (list) => list.map(([a, b]) => `<li><span>${a}</span>${b ? `<span>${b}</span>` : ''}</li>`).join('');
  $('#credits-scroll').innerHTML = `
    <p class="credits-game">${t('shell.credits.game')}</p>
    <ul class="credits-list">${rows(tx('shell.credits.roles'))}</ul>
    <h3>${t('shell.credits.thanksTitle')}</h3>
    <ul class="credits-list">${rows(tx('shell.credits.thanks'))}</ul>
    <p class="credits-copy">${t('shell.credits.copyright')}</p>`;
}
function renderInstructions() {
  const mode = glyphMode();
  const shared = tx('shell.instructions.controls');
  const g = (b) => glyph(b, { mode });
  $('#ins-scroll').innerHTML = `
    <p>${t('shell.instructions.intro')}</p>
    <div class="two-col">
      <div><h3>${t('shell.instructions.deeperTitle')}</h3><p>${t('shell.instructions.deeper', { glyph: g })}</p></div>
      <div><h3>${t('shell.instructions.backTitle')}</h3><p>${t('shell.instructions.back', { glyph: g })}</p></div>
    </div>
    <h3>${t('shell.instructions.controlsTitle')}</h3>
    <p>${t('shell.instructions.controlsLead')}</p>
    <ul class="controls-list">${controlRows(shared, { mode })}</ul>
    <h3>${t('shell.instructions.playersTitle')}</h3>
    <p>${t('shell.instructions.players')}</p>
`;
}

// ---------------------------------------------------------------- actions
function activate(el) {
  if (!el || S.zooming) return;
  const open = el.dataset.open;
  if (open) { sound.select(); openModal(open); return; }
  const a = el.dataset.action;
  if (el.classList.contains('wcard')) { openIntro(); return; }
  switch (a) {
    case 'start': pressStart(); break;
    case 'sound': setSound(!sound.on); sound.unlock(); break;
    case 'fullscreen': toggleFullscreen(); break;
    case 'begin': beginPlay(); break;
    case 'back': back(); break;
    case 'resume': sound.resumeItem(); resume(); break;

    case 'restart': confirmThen(t('shell.confirm.restartTitle'), t('shell.confirm.restartText'), restartWorld); break;
    case 'choose': confirmThen(t('shell.confirm.chooseTitle'), t('shell.confirm.chooseText'), () => leavePlay('menu')); break;
    case 'title': confirmThen(t('shell.confirm.titleTitle'), t('shell.confirm.titleText'), () => leavePlay('title')); break;
    case 'close': closeModal(); break;
    case 'cancel': cancelConfirm(); break;
    case 'ok': { const fn = S.confirmFn; S.confirmFn = null; closeModal('confirm'); fn?.(); break; }
    case 'controls': toggleControls(); try { S.frame?.contentWindow.focus(); } catch { /* fine */ } break;
    case 'pause': pause(); break;
    default: break;
  }
}
function cancelConfirm() {
  closeModal('confirm');
  S.confirmFn = null;
  // The end-of-chain dialog paused the world without the pause menu.
  if (S.screen === 'play' && S.paused && !S.modals.length) { S.paused = false; resumeFrame(); }
}
function back() {
  const top = S.modals[S.modals.length - 1];
  if (top === 'pause') { resume(); return; }
  if (top === 'confirm') { cancelConfirm(); return; }
  if (top) { sound.back(); closeModal(); return; }
  if (S.screen === 'intro') { closeIntro(); return; }
  if (S.screen === 'menu') {
    if (S.menuFocus === 'corner') { focusCards(); return; }
    sound.back(); show('title'); S.titleNav = false; return;
  }
  if (S.screen === 'title' && S.titleNav) { S.titleNav = false; clearFocus(); }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('button[data-action], button[data-open]');
  if (!el || el.closest('[hidden]')) return;
  sound.unlock();
  activate(el);
});
// A click on the dimmed backdrop round a popup closes it like its own button:
// Resume, Done, Close; a confirmation takes its safe choice (Stay / Cancel).
for (const m of $$('.modal')) {
  m.addEventListener('click', (e) => {
    if (e.target !== m || m.hidden) return;
    const b = $('[data-action="resume"], [data-action="close"], [data-action="cancel"]', m);
    if (b) { sound.unlock(); activate(b); }
  });
}
// A click on the title away from its buttons only starts the title music
// (Press Start is a button, handled above, and starts the game).
$('#title').addEventListener('click', (e) => { if (!e.target.closest('button') && !S.modals.length) titleMusic(); });
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => sound.unlock(), { capture: true });

// ---------------------------------------------------------------- input loop
function handle(act) {
  if (S.veiled) return true; // the world select is still black: wait for it
  const top = S.modals[S.modals.length - 1];
  const a = act.act;
  // Title, idle: A or Start (Enter, Space or P) starts; the stick or d-pad
  // enters the corner buttons; every other button or key starts the music only.
  if (S.screen === 'title' && !top) {
    if (!S.titleNav) {
      if (a === 'a' || a === 'start') { pressStart(); return true; }
      if (['up', 'down', 'left', 'right'].includes(a)) { titleMusic(); S.titleNav = true; setFocus($('#press-start')); return true; }
      if (a === 'any') { if (act.button !== 0 && act.button !== 9) titleMusic(); return true; }
      titleMusic();
      return true;
    }
    if (a === 'start') { pressStart(); return true; }
  }
  if (a === 'any' || a === 'key') return false;
  if (S.zooming) return true;

  if (S.screen === 'play' && !top) {
    if (S.devPanel || S.loading || S.transitioning) return false;
    if ((a === 'start' || a === 'escape') && dedupe('menu')) { pause(); return true; }
    if (a === 'view' && dedupe('view')) { toggleControls(); return true; }
    return false;
  }
  if (top === 'pause' && a === 'start') { resume(); return true; }
  if (a === 'escape' || a === 'b') { back(); return true; }
  if ((top === 'instructions' || top === 'credits') && (a === 'up' || a === 'down')) {
    const sc = $(top === 'instructions' ? '#ins-scroll' : '#credits-scroll');
    const before = sc.scrollTop;
    sc.scrollBy({ top: a === 'down' ? 90 : -90, behavior: reduced() ? 'auto' : 'smooth' });
    if (a === 'down' && Math.ceil(before + sc.clientHeight) >= sc.scrollHeight - 2) setFocus($(`#${top} [data-action="close"]`));
    if (a === 'up') setFocus(sc);
    return true;
  }
  if (top === 'settings' && (a === 'left' || a === 'right') && adjustFocusedSetting(a === 'left' ? -1 : 1)) return true;
  if (!top && S.screen === 'menu') {
    if (S.menuFocus === 'cards') {
      if (a === 'left' || a === 'right') { selectCard(S.sel + (a === 'left' ? -1 : 1)); focusCards(); return true; }
      if (a === 'down') { S.menuFocus = 'corner'; setFocus($('#menu .corner-buttons .icon-btn')); sound.tick(); return true; }
      if (a === 'a') { openIntro(); return true; }
      if (a === 'start') { openIntro(); return true; }
      return true;
    }
    if (a === 'up') { focusCards(); sound.tick(); return true; }
  }
  if (!top && S.screen === 'intro' && a === 'start') { beginPlay(); return true; }
  if (['up', 'down', 'left', 'right'].includes(a)) { moveFocus(a); return true; }
  if (a === 'a') {
    if (focused && focused.dataset.setting) { const it = settingItems().find((x) => x.id === focused.dataset.setting); if (it) { activateSetting(it, 1); if (it.id !== 'dev') renderSettings(); } return true; }
    if (focused) activate(focused);
    return true;
  }
  return false;
}

let lastT = performance.now();
let lastMode = glyphMode();
function refreshAllGlyphs() {
  refreshGlyphs(document.body, 'menu');
  if (S.screen === 'intro') fillIntro(WORLDS[S.sel]);
  if (S.modals.includes('instructions')) renderInstructions();
  if (S.controlsShown) renderControlsCard();
  if (S.near) showPrompt(S.near);
}
function loop(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  if (rosterLive()) roster.poll();
  const acts = input.poll(dt);
  if (acts.some((x) => x.source === 'pad')) sound.unlock();
  for (const act of acts) {
    // Keyboard events reach the shell only while it has focus; in play the
    // world's frame has it, and the world posts menu and view itself.
    if (act.source === 'keyboard' && act.act !== 'key' && document.activeElement === S.frame) continue;
    handle(act);
  }
  const mode = glyphMode();
  if (mode !== lastMode) { lastMode = mode; refreshAllGlyphs(); renderPlayers(); }
  requestAnimationFrame(loop);
}

// Keyboard: let Space and Enter on a focused button be handled once, by the loop.
document.addEventListener('keydown', (e) => {
  if ((e.code === 'Space' || e.code === 'Enter') && e.target.tagName === 'BUTTON') e.preventDefault();
});

// ---------------------------------------------------------------- pause on focus loss, visibility, disconnect
addEventListener('blur', () => setTimeout(() => {
  if (!document.hasFocus() && S.screen === 'play' && !S.paused) pause(t('shell.pause.windowBackground'));
}, 80));
document.addEventListener('visibilitychange', () => { if (document.hidden && S.screen === 'play') pause(t('shell.pause.tabHidden')); });
input.on('disconnect', () => {
  if (S.screen === 'play' && !S.paused) pause(t('shell.pause.disconnected'));
  setTimeout(() => { refreshAllGlyphs(); renderPlayers(); }, 0);
});
input.on('connect', () => setTimeout(() => { refreshAllGlyphs(); renderPlayers(); }, 0));
document.addEventListener('fullscreenchange', () => { if (S.modals.includes('settings')) renderSettings(); if (S.screen === 'menu') layoutCards(); });

// ---------------------------------------------------------------- start
buildCards();
afterTitleArt(() => loadImage(introArt(WORLDS[S.sel])));
show('title');
// Some browsers let a site they know play sound before any press (Chrome, for
// a site the visitor uses often): try the title music straight away. Where it
// isn't allowed this does nothing, and the first press starts it.
sound.unlock();
renderPlayers();
requestAnimationFrame(loop);

// Test hooks (used by check.mjs; harmless in play).
window.__game = {
  state: () => ({ screen: S.screen, modals: [...S.modals], sel: S.sel, world: WORLDS[S.world].id, paused: S.paused, loading: S.loading,
    preloading: preloaded ? WORLDS[preloaded.i].id : null, preloadReady: !!preloaded?.ready,
    transitioning: S.transitioning, controlsShown: S.controlsShown, cardBoard: S.cardBoard, board: S.board, cont: S.cont && { ...S.cont }, sound: sound.on, music: sound.nowPlaying, players: roster.list.length, stubRoster: !!roster.stub,
    progress: { ...progress }, transitionProgress: $('#transition').dataset.progress }),
  pressStart,
  titleZoom: titleBg,
  select: (i) => selectCard(i, true),
  openIntro,
  begin: beginPlay,
  pause: (r) => pause(r),
  resume,
  openModal,
  closeModal,
  forceLandmark: (kind) => landmark(kind),
  previewTransition: (a, b, dir, p) => transitions.preview(WORLDS.find((w) => w.id === a), WORLDS.find((w) => w.id === b), dir, p),
  hideTransition: () => transitions.hide(),
  /** Slow the continuous transition's camera move (tests capture it frame by frame); 1 is real time. */
  setTransitionSpeed: (k) => { S.trSpeed = Math.max(0.01, +k || 1); },
  /** Tests: hold the continuous transition's camera move at progress u (0..1); null lets it run. */
  seekTransition: (u) => { S.trSeek = u == null ? null : +u; },
  /** The world frame in play (tests reach into it), and the one preloading. */
  frame: () => S.frame,
  preloadFrame: () => preloaded?.frame || null,
  near: (kind, on = true) => showPrompt(on ? { kind } : null),
  toggleControls,
  fmt: { fmtField, fmtMag },
};
