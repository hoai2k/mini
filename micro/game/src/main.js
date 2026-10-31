// Micro Zoom: the game shell. Title (Press Start) → world select → world intro
// → play, with each world (a prototype page) hosted in a same-origin iframe
// and driven through the embed protocol (../../prototypes/shared/embed.js).
// Landmarks in a world play a zoom transition to the next world (forward) or
// back up to the previous one (the backdoor). See ../README.md.
import { WORLDS } from './worlds.js';
import { PROTO, cardArt, introArt, delivered, loadImage } from './art.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createTitleBg } from './title-bg.js';
import { createTransitions, fmtField, fmtMag, unitSafe } from './transition.js';
import { loadRoster } from './players.js';
import { listen, send } from './bus.js';
import { glyph, glyphMode, refreshGlyphs, controlRows } from './glyphs.js';

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
const settings = { controlsAtStart: true, transition: 'microscope', ...store.get('micro.game.settings', {}) };
const saveSettings = () => store.set('micro.game.settings', settings);
let invertY = false;
try { invertY = localStorage.getItem('micro.invertY') === '1'; } catch { /* private mode */ }
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
  lastToggle: { menu: 0, view: 0 },
  confirmFn: null,
};

const input = createInput();
const sound = createSound();
const roster = await loadRoster(PROTO);
const transitions = createTransitions({ layer: $('#transition'), sound, protoBase: PROTO, reduced });

// ---------------------------------------------------------------- fullscreen
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function enterFullscreen() {
  const el = document.documentElement;
  if (fsEl()) return;
  try {
    const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.();
    r?.catch?.(() => { /* refused: carry on windowed */ });
  } catch { /* not allowed here */ }
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
  el.innerHTML = (which.includes('instructions') ? b('data-open="instructions"', ICONS.instructions, 'Instructions') : '')
    + b('data-open="settings"', ICONS.settings, 'Settings')
    + b('data-action="sound" aria-pressed="true"', ICONS.soundOn, 'Sound on', ' sound-btn')
    + b('data-action="fullscreen"', ICONS.fullscreen, 'Fullscreen');
}
for (const el of $$('.corner-buttons')) cornerButtons(el, el.dataset.group === 'corner-pause' ? ['settings'] : ['instructions']);
function syncSoundButtons() {
  for (const b of $$('.sound-btn')) {
    b.setAttribute('aria-pressed', String(sound.on));
    const label = sound.on ? 'Sound on' : 'Sound off';
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
  const html = list.map((p) => `<span class="pchip" style="--pc:${p.color}"><b>${p.index + 1}</b>${p.name || `Player ${p.index + 1}`}</span>`).join('')
    + (list.length < 4 && glyphMode() === 'controller' ? `<span class="pchip empty"><b style="--pc:transparent">+</b>Any button on another controller joins</span>` : '');
  for (const el of $$('.players-row')) if (el.innerHTML !== html) el.innerHTML = html;
}
function announceJoin(p) {
  sound.join();
  const n = (p.index ?? 0) + 1;
  toast(`<b>P${n}</b>Player ${n} joined<small>${S.screen === 'play' ? 'in this world' : 'ready to play'}</small>`, { color: p.color });
  renderPlayers();
  if (S.controlsShown) renderControlsCard();
}
roster.onJoin(announceJoin);
const rosterLive = () => S.screen !== 'play' || S.paused;

// ---------------------------------------------------------------- screens
function show(screen) {
  S.screen = screen;
  for (const id of ['title', 'menu', 'intro', 'play']) $(`#${id}`).hidden = id !== screen;
  if (screen === 'title' || screen === 'menu') sound.drone(true); else sound.drone(false);
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
const titleBg = createTitleBg($('#title-bg'), { images: [], reduced: reduced() });
Promise.all(WORLDS.map((w) => loadImage(cardArt(w)))).then((imgs) => {
  const fresh = createTitleBg($('#title-bg'), { images: imgs.filter(Boolean), reduced: reduced() });
  const wasOn = S.screen === 'title';
  titleBg.stop();
  Object.assign(titleBg, fresh);
  if (!wasOn) titleBg.stop();
  if (S.screen === 'title') titleBg.start();
});
{
  const logo = delivered('MP-G01');
  if (logo) { const img = $('#logo-img'); img.src = logo; img.alt = 'Micro Zoom'; img.hidden = false; $('#logo-text').classList.add('visually-hidden'); }
  const key = delivered('MP-G02');
  if (key) loadImage(key).then((img) => img && titleBg.setKeyArt?.(img));
  const menuBg = delivered('MP-G03');
  if (menuBg) { const el = $('.menu-bg'); el.style.backgroundImage = `url(${menuBg})`; el.classList.add('art'); }
  const paper = delivered('MP-G05');
  if (paper) document.documentElement.style.setProperty('--paper', `url(${paper})`);
  const icon = delivered('MP-G06');
  if (icon) $('link[rel="icon"]').href = icon;
}

function pressStart() {
  sound.setOn(true);
  syncSoundButtons();
  sound.unlock();
  sound.start();
  enterFullscreen();
  goMenu();
}

// ---------------------------------------------------------------- menu (world select)
const cardsEl = $('#cards');
function buildCards() {
  const frame = delivered('MP-G04');
  cardsEl.innerHTML = WORLDS.map((w, i) => `
    <div class="wcard${frame ? ' framed' : ''}" role="option" data-i="${i}" tabindex="-1" aria-label="${w.name}: ${w.creature}">
      <div class="face">
        <div class="art" style="background-image:url('${cardArt(w)}')"><span class="no">No. ${ROMAN[i]}</span><span class="stamp"></span></div>
        <div class="body">
          <p class="look">${w.look}</p>
          <h3>${w.name}</h3>
          <p class="who">${w.creature} · <em>${w.latin}</em></p>
          <dl>
            <div><dt>Magnification</dt><dd>${w.mag}<small>${w.magNote}</small></dd></div>
            <div><dt>Field</dt><dd>${w.field}</dd></div>
            <div><dt>Body</dt><dd>${w.body}</dd></div>
            <div><dt>World</dt><dd>${i + 1} of 7</dd></div>
          </dl>
          <p class="line">${w.line}</p>
        </div>
      </div>
      ${frame ? `<div class="frame" style="background-image:url('${frame}')"></div>` : ''}
    </div>`).join('');
  for (const c of $$('.wcard', cardsEl)) {
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
    st.textContent = far ? 'Furthest reached' : visited ? 'Visited' : 'Unvisited';
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
    c.style.opacity = ad > 3 ? '0' : String(1 - ad * 0.16);
    c.style.filter = ad ? `brightness(${1 - ad * 0.14}) saturate(${1 - ad * 0.15})` : 'none';
    c.style.zIndex = String(10 - ad);
    c.classList.toggle('sel', ad === 0);
    c.setAttribute('aria-selected', String(ad === 0));
  }
  const w = WORLDS[S.sel];
  $('.menu-bg').style.transform = `translate3d(${(3 - S.sel) * 10}px, 0, 0) scale(1.02)`;
  $('#menu').style.setProperty('--world', w.accent);
  const cur = $('.scale-rule .cursor');
  if (cur) { cur.style.left = `${scalePos(w.fieldMm)}%`; cur.querySelector('span').innerHTML = `${w.name} · field ${unitSafe(fmtField(w.fieldMm))}`; }
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
  if (!silent) sound.tick();
  layoutCards();
}
function focusCards() { S.menuFocus = 'cards'; setFocus($(`.wcard[data-i="${S.sel}"]`)); }
function goMenu() {
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
  $('#intro-no').textContent = `World ${ROMAN[i]} of VII`;
  $('#intro-look').textContent = w.look;
  $('#intro-name').textContent = w.name;
  $('#intro-creature').textContent = w.creature;
  $('#intro-latin').textContent = w.latin;
  $('#intro-plate').innerHTML = `<div><dt>Magnification</dt><dd>${w.mag}<small>${w.magNote}</small></dd></div><div><dt>Field</dt><dd>${w.field}</dd></div>`
    + `<div><dt>Body</dt><dd>${w.body}</dd></div><div><dt>Look</dt><dd style="font-size:.9rem">${w.look}</dd></div>`;
  $('#intro-goal').textContent = w.goal;
  $('#intro-fwd').textContent = w.forward ? `${w.forward} Reach it to zoom in to ${WORLDS[i + 1].name}.` : 'This is the end of the chain: nothing smaller is alive.';
  $('#intro-back').textContent = w.back || 'None: this is the top of the chain.';
  $('#intro-facts').innerHTML = w.facts.map((f) => `<li>${f}</li>`).join('');
  renderIntroControls();
  $('.intro-art').style.backgroundImage = `url('${introArt(w)}')`;
}
function renderIntroControls() {
  const w = WORLDS[S.sel];
  const rows = [...w.controls, ['Y', 'At the backdoor: rise a world'], ['Menu', 'Pause'], ['View', 'Controls card']];
  $('#intro-controls').innerHTML = controlRows(rows);
}
async function openIntro() {
  const w = WORLDS[S.sel];
  sound.select();
  fillIntro(w);
  const card = $(`.wcard[data-i="${S.sel}"] .art`);
  if (card && !reduced()) {
    const r = card.getBoundingClientRect();
    const z = document.createElement('div');
    z.className = 'zoomer';
    z.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;background-image:url('${introArt(w)}')`;
    document.body.appendChild(z);
    const sx = innerWidth / r.width, sy = innerHeight / r.height;
    const anim = z.animate([
      { transform: 'translate(0,0) scale(1,1)', borderRadius: '10px' },
      { transform: `translate(${-r.left}px, ${-r.top}px) scale(${sx}, ${sy})`, borderRadius: '0px' },
    ], { duration: 650, easing: 'cubic-bezier(.6,.05,.2,1)', fill: 'forwards' });
    S.zooming = true;
    await anim.finished.catch(() => {});
    show('intro');
    S.zooming = false;
    z.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).finished.then(() => z.remove(), () => z.remove());
  } else show('intro');
  setFocus($('#intro [data-action="begin"]'));
}

// ---------------------------------------------------------------- play
const host = $('#frame-host');
let unlisten = () => {};
function worldUrl(w) { return new URL(`${w.id}/?embed=1`, PROTO).href; }

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
  $('#plaque .no').textContent = `No. ${ROMAN[i]}`;
  $('#plaque .nm').textContent = w.name;
  $('#plaque .mg').textContent = `${w.mag} · ${w.field}`;
  const veil = $('#veil');
  veil.hidden = false; veil.classList.remove('fade');
  veil.querySelector('p').textContent = 'Preparing the slide…';
  unlisten();
  if (S.frame) S.frame.remove();
  const f = document.createElement('iframe');
  f.title = `${w.name}: ${w.creature}`;
  f.allow = 'autoplay; fullscreen; gamepad';
  f.src = worldUrl(w);
  host.appendChild(f);
  S.frame = f;
  unlisten = listen(f.contentWindow, (m) => onWorldMessage(m, f));
  if (!progress.visited.includes(w.id)) progress.visited.push(w.id);
  progress.furthest = Math.max(progress.furthest, i);
  saveProgress();
  const showCard = !first && settings.controlsAtStart;
  S.pendingCard = showCard;
  clearTimeout(S.loadTimer);
  S.loadTimer = setTimeout(() => { if (S.loading && S.frame === f) veil.querySelector('p').textContent = 'This slide is taking a while to load…'; }, 15000);
  return new Promise((resolve) => { S.onReady = resolve; });
}

async function worldReady(f) {
  if (S.frame !== f || !S.loading) return;
  S.loading = false;
  send(f, 'sound', { on: sound.on, volume: sound.volume });
  send(f, 'settings', { invertY });
  send(f, 'players', { roster: roster.toJSON() });
  const veil = $('#veil');
  veil.classList.add('fade');
  setTimeout(() => { if (!S.loading) veil.hidden = true; }, 520);
  S.onReady?.();
  S.onReady = null;
  if (S.pendingCard) showControlsCard(8);
  S.pendingCard = false;
  if (!S.paused && !S.transitioning && S.modals.length === 0) await resumeFrame();
}

// Let the world run once every controller button is released (the A that
// began, or the Menu that resumed, must not reach the world).
async function resumeFrame() {
  const t0 = performance.now();
  while (input.anyHeld() && performance.now() - t0 < 1200) await sleep(30);
  if (S.paused || S.transitioning || S.loading) return;
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
    case 'landmark': landmark(m.kind); break;
    case 'near': showPrompt(m.on ? m : null); break;
    case 'join': announceJoin({ index: m.index ?? roster.list.length, color: m.color || '#d8a440', name: m.name }); if (m.roster) roster.fromJSON(m.roster); break;
    case 'features':
      if (!m.open && S.devPanel) { S.devPanel = false; pause('Back from the world’s feature panel.'); }
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

async function beginPlay() {
  sound.select();
  S.board = 0;
  closeAllModals();
  show('play');
  await loadWorld(S.sel, { first: true });
}

function pause(reason = '') {
  if (S.screen !== 'play' || S.paused || S.transitioning) return;
  S.paused = true;
  S.devPanel = false;
  send(S.frame, 'pause');
  sound.setPaused(true);
  showPrompt(S.near);
  $('#pause-world').textContent = `World ${ROMAN[S.world]} · ${WORLDS[S.world].name}`;
  $('#pause-reason').textContent = reason;
  renderPlayers();
  openModal('pause');
}
function resume() {
  if (!S.paused) return;
  closeAllModals();
  S.paused = false;
  restoreScreenFocus();
  if (!S.loading) resumeFrame();
}
function confirmThen(title, text, fn) {
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  S.confirmFn = fn;
  openModal('confirm');
}
function restartWorld() {
  closeAllModals();
  S.paused = false;
  S.board++;
  loadWorld(S.world, { first: false });
}
function leavePlay(to) {
  unlisten();
  if (S.frame) { S.frame.remove(); S.frame = null; }
  S.paused = false; S.loading = false;
  hideControlsCard();
  showPrompt(null);
  sound.setPaused(false);
  if (to === 'title') { closeAllModals(); show('title'); S.titleNav = false; $('.title-hint').classList.remove('gone'); }
  else { S.sel = S.world; goMenu(); }
}

async function landmark(kind) {
  if (S.screen !== 'play' || S.transitioning || S.loading) return;
  const i = S.world;
  if (kind === 'back' && i === 0) { toast('Nothing above the bog surface: this is the top of the chain.'); return; }
  if (kind === 'forward' && i === WORLDS.length - 1) {
    send(S.frame, 'pause');
    S.paused = true;
    sound.setPaused(true);
    confirmThen('The end of the light', 'Below the phage nothing is alive to play. Choose another world to explore, or stay here.', () => leavePlay('menu'));
    return;
  }
  const next = kind === 'forward' ? i + 1 : i - 1;
  S.transitioning = true;
  send(S.frame, 'pause');
  closeAllModals();
  hideControlsCard();
  showPrompt(null);
  try {
    await transitions.playTransition(WORLDS[i], WORLDS[next], kind === 'forward' ? 'in' : 'out', { style: settings.transition });
    S.board++;
    const ready = loadWorld(next, { first: false });
    await Promise.race([ready, sleep(12000)]);
  } finally {
    S.transitioning = false;
    $('#transition').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' }).finished
      .then(() => { transitions.hide(); $('#transition').getAnimations().forEach((a) => a.cancel()); });
    if (!S.loading && !S.paused) resumeFrame();
  }
}

function showPrompt(m) {
  S.near = m;
  const el = $('#prompt');
  if (!m || S.paused) { el.hidden = true; return; }
  const i = S.world;
  const label = m.label || (m.kind === 'back'
    ? (i > 0 ? `Rise to the ${WORLDS[i - 1].name}` : 'The top of the chain')
    : (i < WORLDS.length - 1 ? `Zoom in to the ${WORLDS[i + 1].name}` : 'The end of the light'));
  el.innerHTML = (m.kind === 'back' ? glyph('Y') + ' ' : '→ ') + label;
  el.hidden = false;
}

// ---------------------------------------------------------------- controls card
let cardTimer = 0;
function renderControlsCard() {
  const w = WORLDS[S.world];
  let rows = S.hud?.rows || w.controls;
  rows = rows.filter(([b]) => b !== 'Menu' && b !== 'View');
  if (w.back && !rows.some(([b, t]) => b === 'Y' && /back|rise/i.test(t))) rows = [...rows, ['Y', 'At the backdoor: rise a world']];
  rows = [...rows, ['Menu', 'Pause'], ['View', 'Show or hide this card']];
  const multi = roster.list.length > 1;
  $('#controls-card').innerHTML = `<p class="eyebrow small"><span>World ${ROMAN[S.world]} · ${w.look}</span></p>
    <h3>${w.name}</h3><p class="sub">${w.goal}</p>
    <ul class="controls-list">${controlRows(rows)}</ul>
    ${multi ? '<div class="players-row"></div>' : ''}
    <div class="foot"><span>${glyphMode() === 'controller' ? 'Controller' : 'Keyboard (no controller connected)'}</span><span>${glyph('View')} hides this</span></div>
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
const TRANSITIONS = { microscope: 'Microscope zoom', card: 'Specimen plates' };
function settingItems() {
  const items = [
    { id: 'sound', label: 'Sound', about: 'Every world’s sound and the shell’s own.', get: () => sound.on, toggle: () => setSound(!sound.on) },
    { id: 'volume', label: 'Volume', slider: true, get: () => sound.volume, step: (d) => { sound.setVolume(Math.round((sound.volume + d * 0.1) * 10) / 10); pushSound(); sound.tick(); } },
    { id: 'invertY', label: 'Invert camera Y', about: 'Off: right stick up looks up. On: right stick up looks down. Shared by every world.', get: () => invertY, toggle: () => {
      invertY = !invertY;
      try { localStorage.setItem('micro.invertY', invertY ? '1' : '0'); } catch { /* private mode */ }
      send(S.frame, 'settings', { invertY });
    } },
    { id: 'controls', label: 'Controls card at the start of each world', about: 'Every world after the first shows its controls for 8 seconds; View brings them back.', get: () => settings.controlsAtStart, toggle: () => { settings.controlsAtStart = !settings.controlsAtStart; saveSettings(); } },
    { id: 'transition', label: 'Transition between worlds', about: 'Microscope zoom: the zoom-transitions prototype, falling back to the specimen plates until it can play embedded.', choices: Object.keys(TRANSITIONS), get: () => settings.transition,
      step: (d) => { const k = Object.keys(TRANSITIONS); settings.transition = k[(k.indexOf(settings.transition) + d + k.length) % k.length]; saveSettings(); } },
    { id: 'fullscreen', label: 'Fullscreen', get: () => !!fsEl(), toggle: () => { toggleFullscreen(); setTimeout(renderSettings, 250); } },
  ];
  if (S.screen === 'play' && S.frame && !S.loading) {
    items.push({ id: 'dev', label: 'World features', dev: true, about: 'The world’s own feature panel: what it is doing, with switches. Menu or B closes it.', action: 'Open', run: openDevPanel });
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
    else if (it.choices) val = `<span class="val"><span class="arrow">‹</span>${TRANSITIONS[it.get()]}<span class="arrow">›</span></span>`;
    else if (it.action) val = `<span class="val">${it.action}</span>`;
    else val = `<span class="val ${it.get() ? 'on' : 'off'}">${it.get() ? 'On' : 'Off'}</span>`;
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
  if (keep) setFocus($(`[data-setting="${keep}"]`, list)); else if (S.modals[S.modals.length - 1] === 'settings') setFocus(list.firstChild);
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
const pushSound = () => send(S.frame, 'sound', { on: sound.on, volume: sound.volume });
function openDevPanel() {
  closeAllModals();
  S.paused = false;
  S.devPanel = true;
  send(S.frame, 'resume');
  send(S.frame, 'features', { open: true });
  sound.setPaused(false);
  try { S.frame.contentWindow.focus(); } catch { /* fine */ }
}

// ---------------------------------------------------------------- instructions
const PAD_SVG = `<svg viewBox="0 0 720 300" role="img" aria-label="Xbox controller: the actions on each button">
  <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round">
    <path d="M250 92 Q360 70 470 92 Q540 100 566 196 Q584 268 532 270 Q498 270 474 228 L246 228 Q222 270 188 270 Q136 268 154 196 Q180 100 250 92 Z"/>
    <rect x="236" y="46" width="62" height="22" rx="7"/><rect x="422" y="46" width="62" height="22" rx="7"/>
    <rect x="232" y="74" width="74" height="14" rx="7"/><rect x="414" y="74" width="74" height="14" rx="7"/>
    <circle cx="266" cy="140" r="22"/><circle cx="420" cy="196" r="22"/>
    <path d="M300 184h14v-14h14v14h14v14h-14v14h-14v-14h-14z"/>
    <rect x="336" y="128" width="16" height="10" rx="4"/><rect x="368" y="128" width="16" height="10" rx="4"/>
  </g>
  <circle cx="468" cy="116" r="14" fill="#c49a22"/><text x="468" y="121" text-anchor="middle" font-size="14" font-weight="700" fill="#1c1406">Y</text>
  <circle cx="442" cy="142" r="14" fill="#2f63b0"/><text x="442" y="147" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">X</text>
  <circle cx="494" cy="142" r="14" fill="#b0362f"/><text x="494" y="147" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">B</text>
  <circle cx="468" cy="168" r="14" fill="#3f8a34"/><text x="468" y="173" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">A</text>
  <g stroke="#7d5f26" stroke-width="1.2" fill="none">
    <path d="M236 57H150"/><path d="M232 81H150"/><path d="M244 140H150"/><path d="M300 191H150"/><path d="M344 128 L330 30 H300"/>
    <path d="M484 57H570"/><path d="M488 81H570"/><path d="M482 116H570"/><path d="M508 142H570"/><path d="M482 168H570"/><path d="M442 196H570"/><path d="M376 128 L390 30 H420"/><path d="M442 142 L452 240 H570"/>
  </g>
  <g font-family="DM Sans, system-ui, sans-serif" font-size="13" fill="currentColor">
    <text x="146" y="61" text-anchor="end"><tspan font-weight="700">LT</tspan> focus or zoom (analog)</text>
    <text x="146" y="85" text-anchor="end"><tspan font-weight="700">LB</tspan> secondary</text>
    <text x="146" y="144" text-anchor="end"><tspan font-weight="700">LS</tspan> move</text>
    <text x="146" y="188" text-anchor="end"><tspan font-weight="700">D-pad ↑↓</tspan> zoom in / out</text>
    <text x="146" y="205" text-anchor="end"><tspan font-weight="700">D-pad ←→</tspan> the optical look</text>
    <text x="296" y="26" text-anchor="end"><tspan font-weight="700">View</tspan> controls card</text>
    <text x="424" y="26"><tspan font-weight="700">Menu</tspan> pause</text>
    <text x="574" y="61"><tspan font-weight="700">RT</tspan> focus or zoom (analog)</text>
    <text x="574" y="85"><tspan font-weight="700">RB</tspan> secondary</text>
    <text x="574" y="120"><tspan font-weight="700">Y</tspan> special · backdoor: rise</text>
    <text x="574" y="146"><tspan font-weight="700">B</tspan> defend</text>
    <text x="574" y="172"><tspan font-weight="700">A</tspan> dash</text>
    <text x="574" y="200"><tspan font-weight="700">RS</tspan> camera</text>
    <text x="574" y="244"><tspan font-weight="700">X</tspan> attack or eat</text>
  </g>
</svg>`;
function renderInstructions() {
  const mode = glyphMode();
  const shared = [['LS', 'Move'], ['RS', 'Camera, or move the stage'], ['A', 'Dash (each creature’s real fastest move)'], ['X', 'Attack or eat'], ['B', 'Defend'],
    ['Y', 'Special; on the backdoor: rise a world'], ['LT/RT', 'Focus or zoom'], ['LB/RB', 'Secondary'], ['D-pad ↑↓', 'Zoom in / out'], ['D-pad ←→', 'Optical look'], ['Menu', 'Pause'], ['View', 'Controls card']];
  $('#ins-scroll').innerHTML = `
    <p>Micro Zoom is seven worlds at seven magnifications, from a springtail on a bog pool’s surface film down to a virus no light microscope can see. Choose any world to start in; the springtail is the top of the chain.</p>
    <div class="two-col">
      <div><h3>Going deeper</h3><p>Every world has a <strong>forward landmark</strong> in the direction of play. Reach it and the microscope zooms in: the landmark becomes the next world and its creature.</p></div>
      <div><h3>Going back up</h3><p>In the opposite direction is an optional <strong>backdoor</strong>. Dwell on it and press ${glyph('Y', { mode })} to zoom back out to the world above.</p></div>
    </div>
    <h3>${mode === 'controller' ? 'Xbox controller' : 'Keyboard (connect a controller for the full layout)'}</h3>
    ${mode === 'controller' ? `<div class="pad-diagram">${PAD_SVG}</div>` : ''}
    <ul class="controls-list">${controlRows(shared, { mode })}</ul>
    <h3>Players</h3>
    <p>Up to four can play. Player 1 uses the first controller${mode === 'keyboard' ? ' or the keyboard' : ''}; a second, third or fourth player joins by pressing any button on another controller, in the menus or during play. Players start in the same view; when they move apart, the view splits, and it joins up again when they come back together.</p>
    <h3>Menus</h3>
    <ul class="controls-list">${controlRows([['LS', 'Move between items'], ['A', 'Choose'], ['B', 'Back'], ['Menu', 'Pause or resume']], { mode, ctx: 'menu' })}</ul>
    <p class="muted">Each world tells you its own controls on its intro screen and its controls card (View).</p>`;
}

// ---------------------------------------------------------------- actions
function activate(el) {
  if (!el) return;
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
    case 'resume': sound.select(); resume(); break;
    case 'restart': confirmThen('Restart this world?', 'Your place in this world is lost; the furthest world you reached is kept.', restartWorld); break;
    case 'choose': confirmThen('Choose another world?', 'You leave this world; the furthest world you reached is kept.', () => leavePlay('menu')); break;
    case 'title': confirmThen('Back to the title?', 'You leave this world; the furthest world you reached is kept.', () => leavePlay('title')); break;
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
  if (S.screen === 'intro') { sound.back(); goMenu(); return; }
  if (S.screen === 'menu') {
    if (S.menuFocus === 'corner') { focusCards(); return; }
    sound.back(); show('title'); S.titleNav = false; $('.title-hint').classList.remove('gone'); return;
  }
  if (S.screen === 'title' && S.titleNav) { S.titleNav = false; clearFocus(); $('.title-hint').classList.remove('gone'); }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('button[data-action], button[data-open]');
  if (!el || el.closest('[hidden]')) return;
  sound.unlock();
  activate(el);
});
$('#title').addEventListener('click', (e) => { if (!e.target.closest('button') && !S.modals.length) pressStart(); });
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => sound.unlock(), { capture: true });

// ---------------------------------------------------------------- input loop
function handle(act) {
  const top = S.modals[S.modals.length - 1];
  const a = act.act;
  // Title, idle: any controller button, or Enter/Space, starts.
  if (S.screen === 'title' && !top) {
    if (!S.titleNav) {
      if (a === 'any' || a === 'a' || (a === 'key' && act.code === 'Enter')) { pressStart(); return true; }
      if (['up', 'down', 'left', 'right'].includes(a)) { S.titleNav = true; $('.title-hint').classList.add('gone'); setFocus($('#press-start')); return true; }
      return false;
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
  if (top === 'instructions' && (a === 'up' || a === 'down')) {
    const sc = $('#ins-scroll');
    const before = sc.scrollTop;
    sc.scrollBy({ top: a === 'down' ? 90 : -90, behavior: reduced() ? 'auto' : 'smooth' });
    if (a === 'down' && Math.ceil(before + sc.clientHeight) >= sc.scrollHeight - 2) setFocus($('#instructions [data-action="close"]'));
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
  if (S.screen === 'intro') renderIntroControls();
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
  if (!document.hasFocus() && S.screen === 'play' && !S.paused) pause('Paused while the window was in the background.');
}, 80));
document.addEventListener('visibilitychange', () => { if (document.hidden && S.screen === 'play') pause('Paused while the tab was hidden.'); });
input.on('disconnect', () => {
  if (S.screen === 'play' && !S.paused) pause('A controller was disconnected. Reconnect it, or choose Resume to carry on.');
  setTimeout(() => { refreshAllGlyphs(); renderPlayers(); }, 0);
});
input.on('connect', () => setTimeout(() => { refreshAllGlyphs(); renderPlayers(); }, 0));
document.addEventListener('fullscreenchange', () => { if (S.modals.includes('settings')) renderSettings(); if (S.screen === 'menu') layoutCards(); });

// ---------------------------------------------------------------- start
buildCards();
show('title');
renderPlayers();
requestAnimationFrame(loop);

// Test hooks (used by check.mjs; harmless in play).
window.__game = {
  state: () => ({ screen: S.screen, modals: [...S.modals], sel: S.sel, world: WORLDS[S.world].id, paused: S.paused, loading: S.loading,
    transitioning: S.transitioning, controlsShown: S.controlsShown, board: S.board, sound: sound.on, players: roster.list.length, stubRoster: !!roster.stub,
    progress: { ...progress }, transitionProgress: $('#transition').dataset.progress }),
  pressStart,
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
  near: (kind, on = true) => showPrompt(on ? { kind } : null),
  toggleControls,
  fmt: { fmtField, fmtMag },
};
