// Shell: title, act cards, play, pause, dialogs, settings, fullscreen.
import { ACTS } from './acts/index.js';
import { loadSave, writeSave, carryInto, recordResult } from './save.js';
import { createRenderer, loadAssets, richText } from './art.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createTouch, isTouchDevice } from './touch.js';
import { createFit } from './fit.js';
import { createChrome, requestFullscreen, exitFullscreen, fullscreenElement } from './chrome.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const live = $('#live');
const audio = createAudio();
const input = createInput();
// Phones and tablets get the touch layer; desktop never sees it.
const TOUCH = isTouchDevice();
const touch = TOUCH ? createTouch($('#touch')) : null;
if (TOUCH) { document.documentElement.classList.add('touch'); input.attachTouch(touch); }
// Size the stage to the space that's really visible (see src/fit.js).
const fitter = createFit({ app: $('#app'), stage: canvas, touch: TOUCH });
// Browser bars: fullscreen on the first tap in landscape where possible;
// on iPhone Safari, a swipe-up to tuck the bars away (see src/chrome.js).
const chrome = createChrome({ touch: TOUCH, isPlaying: () => S.mode === 'play' && !S.paused, hintEl: $('#bars-hint') });

// ---------------------------------------------------------------- settings
const SETTINGS_KEY = 'widowsbay.settings.v1';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Touch devices start on the gentler film look (lighter on a phone's GPU and battery).
const settings = { period: true, music: 7, sfx: 8, film: reduced || matchMedia('(pointer: coarse)').matches ? 'gentle' : 'full', vibration: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* storage unavailable */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
const FILM = { full: 'Full', gentle: 'Gentle', off: 'Off' };
function syncSettingsUI() {
  for (const el of document.querySelectorAll('#settings [data-key]')) {
    const k = el.dataset.key;
    if (el.type === 'range') el.value = settings[k];
    else if (k === 'film') el.querySelector('span').textContent = FILM[settings.film];
    else if (k === 'vibration') el.querySelector('span').textContent = settings.vibration ? 'On' : 'Off';
    else if (k === 'period') el.querySelector('span').textContent = settings.period ? 'On' : 'Off';
  }
  audio.setVolumes(settings.music / 10, settings.sfx / 10);
}
for (const el of document.querySelectorAll('#settings [data-key]')) {
  const k = el.dataset.key;
  if (el.type === 'range') el.addEventListener('input', () => { settings[k] = +el.value; syncSettingsUI(); saveSettings(); });
  else el.addEventListener('click', () => {
    if (k === 'film') settings.film = { full: 'gentle', gentle: 'off', off: 'full' }[settings.film];
    if (k === 'vibration') settings.vibration = !settings.vibration;
    if (k === 'period') { settings.period = !settings.period; audio.setPeriodOn(settings.period); }
    syncSettingsUI(); saveSettings(); audio.play('ui');
  });
}
syncSettingsUI();

// ---------------------------------------------------------------- state
let assets = { slots: {}, images: {} };
let assetsLoaded = false;
// The song gates the curtain: 'ready', or given up on ('failed'/'none').
const songStatus = () => (assetsLoaded ? audio.trackStatus() : { state: 'loading', progress: 0 });
const songSettled = () => ['ready', 'failed', 'none'].includes(songStatus().state);
let renderer = createRenderer(canvas, assets);
const S = {
  mode: 'title', // title | intro | play | over | end
  board: null, curtain: 0, curtainTarget: 0,
  card: null, modeT: 0, t: 0,
  paused: false, titleNav: false,
};
const dialogs = []; // stack of open dialog elements

// Delivered art for the touch controls and the rotate card (image requests D).
function touchArt(a) {
  const url = (im) => im.src || im.toDataURL(); // ?testart placeholders are canvases
  const set = (sel, id) => { const im = a.images[id]; const el = document.querySelector(sel); if (im && el) { el.style.setProperty('--art', `url("${url(im)}")`); el.classList.add('has-art'); } };
  set('.stick-base', 'touch-stick-base'); set('.stick-knob', 'touch-stick-knob'); set('.tbtn-pause', 'touch-pause');
  for (const el of document.querySelectorAll('.tbtn-a, .tbtn-b')) if (a.images['touch-button']) { el.style.setProperty('--art', `url("${url(a.images['touch-button'])}")`); el.classList.add('has-art'); }
  if (a.images['rotate-card']) { const im = $('#rotate-img'); im.src = url(a.images['rotate-card']); im.hidden = false; }
}

// Act I and the title load first; the other acts' art follows in the background.
const FIRST_ART = ['logo', 'rotate-card', 'touch-stick-base', 'touch-stick-knob', 'touch-button', 'touch-pause', 'proscenium', 'sky-backdrop', 'moon-face', 'cloud', 'waves-back', 'waves-mid', 'waves-front',
  'ship', 'witch-moonboat', 'rock', 'pearl', 'tea-leaf', 'keepsake-tea', 'lighthouse', 'lighthouse-lit', 'band-trio',
  'deck-set', 'reveller-yellow', 'reveller-shaggy', 'reveller-jester', 'reveller-lady', 'lantern-string', 'sea-spirit',
  'ship-wreck-bow', 'ship-wreck-stern', 'guitar-sinking', 'waterspout'];
const showLogo = (logo) => { const el = $('#logo-img'); el.src = logo.src; el.alt = "Widow's Bay"; el.hidden = false; $('#logo').classList.add('has-img'); };
const TOUCH_ART = new Set(['touch-stick-base', 'touch-stick-knob', 'touch-button', 'touch-pause', 'rotate-card']);
loadAssets('assets/', { first: FIRST_ART, onImage: (id, im) => {
  if (id === 'logo') showLogo(im);
  // Images arrive after the manifest; apply the touch art as each one lands.
  if (TOUCH && TOUCH_ART.has(id)) touchArt({ images: { [id]: im } });
} }).then((a) => {
  assets = a;
  const song = a.audio?.song;
  if (song?.status === 'delivered' && song.file) audio.setTrack('assets/' + song.file, song.loopStart, song.loopEnd);
  const sfx = Object.fromEntries(Object.entries(a.sfx || {})
    .filter(([, v]) => v.status === 'delivered' && v.file).map(([k, v]) => [k, 'assets/' + v.file]));
  audio.setSfx(sfx);
  // Period accompaniment after the song (design/music.md).
  audio.setPeriod(Object.entries(a.audio?.period || {}).filter(([, v]) => v.status === 'delivered' && v.file)
    .map(([id, v]) => ({ id, url: 'assets/' + v.file, moods: v.moods || [] })));
  audio.setPeriodOn(settings.period);
  assetsLoaded = true;
  renderer = createRenderer(canvas, assets);
  if (assets.images.logo) showLogo(assets.images.logo);
  if (TOUCH) touchArt(assets);
});

// ---------------------------------------------------------------- flow
// Modes: title, playbill, intro (act card), play, over (retry card),
// curtaincall. One act module (src/acts/) is on stage at a time.
const save = loadSave();
const params = new URLSearchParams(location.search);
const QA = params.has('qa');

function startGame() {
  if (S.mode !== 'title' || dialogs.length) return;
  leaveTitle();
  const jump = QA && +params.get('act');
  if (jump >= 1 && jump <= ACTS.length) return beginAct(jump - 1, params.has('scene') ? { scene: +params.get('scene') } : null);
  if (save.unlocked > 1) showPlaybill(); else beginAct(0);
}

// Raise the title curtain: fullscreen, audio and the band's song.
function leaveTitle() {
  requestFullscreen();
  if (TOUCH) screen.orientation?.lock?.('landscape').catch(() => { /* not allowed here; the rotate card covers it */ });
  audio.unlock(); audio.startMusic(); audio.play('ui');
  $('#title').classList.add('opening');
  setTimeout(() => { $('#title').hidden = true; $('#title').classList.remove('opening'); }, 600);
}

function carryFor(i) {
  const carry = carryInto(save, i + 1);
  // ?qa&act=N&carry=all starts a later act as if every keepsake were held.
  if (QA && params.get('carry') === 'all') Object.assign(carry, { tea: 3, guitar: true, pearl: true, stone: true, sleepers: 6 });
  if (QA && params.get('carry') === 'rose') Object.assign(carry, { tea: 3, guitar: true, rose: true, pearl: true, stone: true, sleepers: 12 });
  return carry;
}

// Starts act i from the top, or `from` a scene ({ scene }) or a checkpoint
// the act made earlier (src/acts/CONTRACT.md, "Scenes and checkpoints").
function beginAct(i, from = null) {
  renderer.clearFx();
  S.actIndex = i; S.act = ACTS[i];
  S.state = S.act.create({ seed: (Math.random() * 2 ** 31) | 0, carry: carryFor(i), from: from ? { ...from } : null });
  S.checkpoint = S.state.checkpoint ? JSON.parse(JSON.stringify(S.state.checkpoint)) : null;
  S.cpRef = S.state.checkpoint;
  S.mode = 'intro'; S.modeT = 0;
  S.curtain = 0; S.curtainTarget = 0;
  const scene = from && S.act.scenes?.[from.scene | 0];
  S.card = { kicker: S.act.kicker, title: S.act.title, size: S.act.size || 120,
    sub: scene && (from.scene | 0) > 0 ? `${from.retry ? 'Carrying on from' : 'Scene'}: ${scene.name}` : S.act.sub,
    prompts: { touch: `Tap to begin · ${touchVerbHint(S.act)}`, other: 'Press [A] to begin' }, alpha: 0 };
  S.readyT = 0;
  S.skipIntertitle = !!from?.retry;
  announce(`${S.act.kicker}, ${S.act.title}.${scene && from.scene > 0 ? ' ' + scene.name + '.' : ''}`);
}

// The act sets state.checkpoint as the player passes a point worth resuming
// from. Keep the latest (a retry starts there) and note how far each act has
// been reached, for the scene select.
function trackCheckpoint() {
  const cp = S.state?.checkpoint;
  if (!cp || cp === S.cpRef) return;
  S.cpRef = cp;
  S.checkpoint = JSON.parse(JSON.stringify(cp));
  const id = S.act.id, k = cp.scene | 0;
  save.scenes = save.scenes || {};
  if (k > (save.scenes[id] ?? 0)) { save.scenes[id] = k; writeSave(save); }
}

function showPlaybill() {
  S.mode = 'playbill'; S.modeT = 0; S.act = null; S.state = null; S.card = null;
  S.curtainTarget = 1; // the playbill hangs on the stage, so open the curtains on it
  S.pb = Math.min(save.unlocked, ACTS.length) - 1;
  announce('The playbill. Choose an act.');
}

function toTitle() {
  closeAllDialogs();
  S.paused = false; S.mode = 'title'; S.act = null; S.state = null; S.card = null; S.curtainTarget = 0;
  $('#pause').hidden = true; $('#title').hidden = false; $('#touch').hidden = true;
  S.titleNav = false; clearNavFocus();
  audio.resume();
  $('#start').focus({ preventScroll: true });
}

function pause(note = '') {
  if (S.paused || S.mode === 'title') return;
  S.paused = true;
  $('#pause-note').textContent = note;
  openDialog($('#pause'));
  audio.play('ui');
}
function resume() {
  if (!S.paused) return;
  S.paused = false;
  closeAllDialogs();
}

// ---------------------------------------------------------------- dialogs
function openDialog(el, focusOn = null) {
  el.hidden = false;
  dialogs.push({ el, restore: document.activeElement });
  focusEl(focusOn || el.querySelector('[data-focus]'));
}

// ---------------------------------------------------------------- instructions
// One page per act; the dialog opens on the act being played (or chosen on
// the playbill, or the furthest reached from the title).
const insTabs = [...document.querySelectorAll('#instructions [role=tab]')];
function showInsPage(n) {
  for (const t of insTabs) t.setAttribute('aria-selected', String(+t.dataset.page === n));
  for (const p of document.querySelectorAll('#instructions .ins-page')) p.hidden = +p.dataset.page !== n;
  $('#ins-scroll').scrollTop = 0;
}
function openInstructions() {
  const n = S.act ? S.act.id : S.mode === 'playbill' ? S.pb + 1 : save.unlocked > 1 ? Math.min(save.unlocked, ACTS.length) : 1;
  showInsPage(n);
  openDialog($('#instructions'), insTabs[n]);
}
for (const t of insTabs) {
  t.addEventListener('click', () => showInsPage(+t.dataset.page));
  t.addEventListener('focus', () => showInsPage(+t.dataset.page));
}

// ---------------------------------------------------------------- scene select
// Every scene of a finished act, and the scenes reached so far in the next.
function scenesReached(a) {
  const last = (a.scenes?.length || 1) - 1;
  return save.results[a.id] ? last : Math.min(last, save.scenes?.[a.id] ?? 0);
}
function openScenes() {
  const list = $('#scene-list');
  list.textContent = '';
  let focus = null;
  ACTS.forEach((a, i) => {
    if (i >= save.unlocked) return;
    const h = document.createElement('h3');
    h.textContent = `${a.kicker} · ${a.title}`;
    const grid = document.createElement('div'); grid.className = 'scene-grid';
    const reached = scenesReached(a);
    (a.scenes || [{ name: a.title }]).forEach((sc, k) => {
      const b = document.createElement('button');
      const open = k <= reached;
      b.innerHTML = `<small>SCENE ${k + 1}</small>`;
      b.append(open ? sc.name : '· · ·');
      if (open) {
        b.dataset.focus = '';
        b.addEventListener('click', () => { audio.play('ui'); playScene(i, k); });
        if (S.act ? i === S.actIndex && k <= (S.checkpoint?.scene | 0) : i === save.unlocked - 1) focus = b;
      } else b.disabled = true;
      grid.append(b);
    });
    list.append(h, grid);
  });
  $('#scene-note').textContent = save.unlocked < ACTS.length ? 'Play on to open more scenes.' : '';
  openDialog($('#scenes'), focus);
}
function playScene(i, k) {
  closeAllDialogs();
  S.paused = false;
  if (S.mode === 'title') leaveTitle();
  beginAct(i, k > 0 ? { scene: k } : null);
}
function closeDialog() {
  const d = dialogs.pop();
  if (!d) return;
  d.el.hidden = true;
  if (d.el.id === 'pause') S.paused = false;
  const restore = d.restore && document.contains(d.restore) && !d.restore.closest('[hidden]') ? d.restore : null;
  if (restore) focusEl(restore, false);
  else clearNavFocus();
}
function closeAllDialogs() { while (dialogs.length) closeDialog(); }

document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
  const a = b.dataset.act;
  audio.play('ui');
  if (a === 'close') closeDialog();
  if (a === 'resume') resume();
  if (a === 'instructions') openInstructions();
  if (a === 'scenes') openScenes();
  if (a === 'settings') openDialog($('#settings'));
  if (a === 'credits') openDialog($('#credits'), $('#credits [data-act=close]'));
  if (a === 'restart') { closeAllDialogs(); S.paused = false; if (S.act) beginAct(S.actIndex); else showPlaybill(); }
  if (a === 'title') toTitle();
}));
$('#start').addEventListener('click', startGame);
$('#btn-instructions').addEventListener('click', () => { audio.play('ui'); openInstructions(); });
$('#btn-scenes').addEventListener('click', () => { audio.play('ui'); openScenes(); });
$('#btn-credits').addEventListener('click', () => { audio.play('ui'); openDialog($('#credits'), $('#credits [data-act=close]')); });
$('#btn-settings').addEventListener('click', () => { audio.play('ui'); openDialog($('#settings')); });
$('#btn-fullscreen').addEventListener('click', () => {
  audio.play('ui');
  // iPhone Safari can't go fullscreen: point at the ways it can lose its bars.
  if (chrome.scrollTrick) { const h = $('#bars-hint'); h.hidden = false; h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); announce(h.textContent); return; }
  toggleFullscreen();
});

// ---------------------------------------------------------------- focus nav
function focusables() {
  const layer = dialogs.length ? dialogs[dialogs.length - 1].el : (S.mode === 'title' ? $('#title') : null);
  return layer ? [...layer.querySelectorAll('[data-focus]')].filter((e) => !e.closest('[hidden]')) : [];
}
function clearNavFocus() { document.querySelectorAll('.nav-focus').forEach((e) => e.classList.remove('nav-focus')); }
function focusEl(el, mark = true) {
  if (!el) return;
  clearNavFocus();
  el.focus({ preventScroll: true });
  if (el.closest('.scroll') && !el.classList.contains('scroll')) el.scrollIntoView({ block: 'nearest' });
  if (mark) (el.closest('.slider') || el).classList.add('nav-focus');
}
function navMove(delta) {
  const list = focusables();
  if (!list.length) return;
  let i = list.indexOf(document.activeElement);
  i = i < 0 ? 0 : (i + delta + list.length) % list.length;
  focusEl(list[i]);
  audio.play('ui');
}
function navActivate() {
  const el = document.activeElement;
  if (!el || el === document.body) return;
  if (el.type === 'range') return;
  el.click();
}
function navAdjust(dir) {
  const el = document.activeElement;
  if (el?.type === 'range') { el.value = +el.value + dir; el.dispatchEvent(new Event('input')); return true; }
  if (el?.id === 'ins-scroll') return false;
  return false;
}

function menuInput(i) {
  const el = document.activeElement;
  // Instructions tabs: left and right turn the page, down reads it.
  if (el?.getAttribute('role') === 'tab') {
    const n = insTabs.indexOf(el);
    if (i.left || i.right) { focusEl(insTabs[(n + (i.left ? -1 : 1) + insTabs.length) % insTabs.length]); audio.play('ui'); return; }
    if (i.down) { focusEl($('#ins-scroll')); return; }
    if (i.up) return;
  }
  if (el?.id === 'ins-scroll' && i.up && el.scrollTop <= 0) { focusEl(insTabs.find((t) => t.getAttribute('aria-selected') === 'true')); return; }
  if (el?.id === 'ins-scroll' && (i.left || i.right)) {
    const n = insTabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    showInsPage((n + (i.left ? -1 : 1) + insTabs.length) % insTabs.length); audio.play('ui'); return;
  }
  if (el?.id === 'ins-scroll' && (i.up || i.down)) { el.scrollBy({ top: i.up ? -80 : 80 }); if (!(i.up && el.scrollTop <= 0) && !(i.down && el.scrollTop + el.clientHeight >= el.scrollHeight - 2)) return; }
  if (i.up) navMove(-1);
  if (i.down) navMove(1);
  if (i.left && !navAdjust(-1)) navMove(-1);
  if (i.right && !navAdjust(1)) navMove(1);
  if (i.padA) navActivate();
  if (i.padB) closeDialog();
  else if (i.back && dialogs.length) closeDialog();
  if (i.padStart && dialogs.length && dialogs[dialogs.length - 1].el.id === 'pause') resume();
}

// Keyboard on the title: Enter starts when nothing is focused; native
// buttons handle their own Enter/Space.
window.addEventListener('keydown', (e) => {
  if (S.mode === 'title' && !dialogs.length && e.code === 'Enter' && (document.activeElement === document.body || !document.activeElement)) startGame();
  if (e.code === 'Escape' && document.fullscreenElement) { /* browser exits fullscreen; resize is CSS-driven */ }
});

// ---------------------------------------------------------------- fullscreen
// Fullscreen helpers (with the webkit prefix iPad Safari needs) live in chrome.js.
function toggleFullscreen() {
  if (fullscreenElement()) exitFullscreen();
  else requestFullscreen();
}

// ---------------------------------------------------------------- pause triggers
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (S.mode === 'play') pause(); audio.suspend(); } else audio.resume();
});
input.on('disconnect', (pad, wasOwner) => {
  if (wasOwner && S.mode === 'play') pause('Controller disconnected — reconnect it, or carry on with keys or touch.');
});
input.on('connect', () => announce('Controller connected.'));

function announce(msg) { live.textContent = msg; }

// ---------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  S.t += dt;
  const i = input.poll(dt);
  update(dt, i);
  const view = currentView();
  renderer.tick(S.paused ? 0 : dt, view);
  renderer.render(view);
  requestAnimationFrame(frame);
}

function currentView() {
  return {
    act: S.act, state: S.state, curtain: S.curtain, card: S.card, film: settings.film, t: S.t,
    hud: S.mode === 'play' || S.mode === 'over',
    curtainCall: S.mode === 'curtaincall' ? Math.min(1, S.modeT / 1.4) : 0,
    scene: S.mode === 'playbill' ? drawPlaybill : S.mode === 'curtaincall' ? drawCurtainCall : null,
  };
}

function updateLoadbar() {
  const st = songStatus();
  // On the title the song can only download; decoding waits for Press Start.
  const done = ['downloaded', 'decoding', 'ready', 'failed', 'none'].includes(st.state);
  const pct = Math.round((done ? 1 : st.progress / 0.95) * 100);
  $('#loadbar-fill').style.width = pct + '%';
  $('#loadbar').setAttribute('aria-valuenow', pct);
  $('#loadbar').classList.toggle('done', done && st.state !== 'failed');
  $('#loadbar-label').textContent = st.state === 'failed' ? 'The song could not be loaded' : done ? 'Ready' : `Tuning up the band… ${pct}%`;
}

// The scene's musical mood (design/music.md): which period piece suits it once
// the band's song has played. The pageant and curtain call bring the song back.
function musicMood() {
  const id = S.act?.id, ph = S.state?.phase;
  if (S.mode === 'curtaincall') return 'song';
  if (!S.act || S.mode === 'title' || S.mode === 'playbill') return 'tender';
  if (id === 1) return ph === 'party' ? 'revel' : ['turn', 'wreck', 'sink', 'iris'].includes(ph) ? 'storm' : 'voyage';
  if (id === 2) return ph === 'ride' ? 'voyage' : 'deep';
  if (id === 3) return 'revel';
  if (id === 4) return 'deep';
  if (id === 5) return ph === 'pageant' || ph === 'iris' ? 'song' : ['storm', 'house', 'quay'].includes(ph) ? 'storm' : 'tender';
  return 'voyage';
}

// The input in use, for prompts: 'pad' (Xbox button glyphs), 'key' or 'touch'.
function trackInputMode(i) {
  if (i.keyAny) S.keySeen = true;
  const mode = i.source === 'pad' ? 'pad' : i.source === 'touch' || (TOUCH && !S.keySeen) ? 'touch' : 'key';
  if (mode !== S.inputMode) { S.inputMode = mode; syncTitleHint(); }
  renderer.kit.inputMode = mode; // acts draw button prompts for it (richText)
  if (S.card?.prompts) { S.card.mode = mode; S.card.prompt = mode === 'touch' ? S.card.prompts.touch : S.card.prompts.other; }
}

function update(dt, i) {
  trackInputMode(i);
  if (S.mode === 'title') updateLoadbar();
  const mood = musicMood();
  if (mood === 'song') audio.returnToSong(); else audio.setMood(mood);
  S.curtain += (S.curtainTarget - S.curtain) * Math.min(1, dt * 2.2);
  if (TOUCH) updateTouch();

  // Menus have the input while any dialog is open.
  if (dialogs.length) { menuInput(i); return; }

  if (S.mode === 'title') {
    if (!S.titleNav) {
      if (i.stickNav) { S.titleNav = true; focusEl($('#start')); syncTitleHint(); return; }
      if (i.anyPad) startGame();
    } else {
      if (i.padStart) return startGame();
      if (i.padB) { S.titleNav = false; clearNavFocus(); document.activeElement?.blur(); syncTitleHint(); return; }
      menuInput({ ...i, padB: false, back: false });
    }
    return;
  }

  S.modeT += dt;
  const go = i.padA || i.confirm || !!i.tap;

  if (S.mode === 'playbill') {
    const n = Math.min(save.unlocked, ACTS.length);
    if (i.up) { S.pb = (S.pb + n - 1) % n; audio.play('ui'); }
    if (i.down) { S.pb = (S.pb + 1) % n; audio.play('ui'); }
    if (i.tap) {
      // Tap a line of the playbill to begin that act; tap outside it for the title.
      const pb = playbillRows();
      let row = -1;
      pb.ys.forEach((y, r) => { if (r < n && Math.abs(i.tap.y - y) <= pb.half && (row < 0 || Math.abs(i.tap.y - y) < Math.abs(i.tap.y - pb.ys[row]))) row = r; });
      if (i.tap.x > pb.x0 && i.tap.x < pb.x1 && row >= 0) { S.pb = row; if (S.modeT > 0.3) beginAct(row); }
      else if (i.tap.y > 650 || i.tap.x < (pb.art ? pb.left - 10 : 330) || i.tap.x > (pb.art ? pb.left + PB.w + 10 : 950)) toTitle();
      return;
    }
    if (go && S.modeT > 0.3) beginAct(S.pb);
    else if (i.padB || i.back) toTitle();
    return;
  }

  if (S.mode === 'intro') {
    S.card.alpha = Math.min(1, S.modeT * 2.5);
    // Hold the card until the song can play, showing its progress.
    if (!songSettled()) { S.card.loading = songStatus().progress; S.readyT = 0; if (i.pause) pause(); return; }
    if (S.card.loading != null) { S.card.loading = null; announce('Ready.'); }
    S.readyT = (S.readyT || 0) + dt;
    if ((go && S.readyT > 0.4) || S.readyT > (S.card.body ? 12 : 6)) {
      // Some acts follow their card with a silent-film intertitle that
      // introduces how they play (not on a retry).
      if (S.act.intertitle && !S.card.body && !S.skipIntertitle) {
        S.card = { body: S.act.intertitle, size: 56, alpha: 0,
          prompts: { touch: 'Tap to begin', other: 'Press [A] to begin' } };
        S.modeT = 0; S.readyT = 0;
        announce(S.act.intertitle.replace(/\[A\]/g, 'A').replace(/\n+/g, ' '));
        return;
      }
      S.mode = 'play'; S.modeT = 0; S.card = null; S.curtainTarget = 1;
      audio.play('curtain');
    }
    if (i.pause) pause();
    return;
  }

  if (S.mode === 'play') {
    if (i.pause && !S.paused) { pause(); return; }
    if (S.paused) return;
    // Hold the player still until the curtains are mostly open.
    const ready = S.curtain > 0.9;
    const actInput = ready
      ? { moveX: i.moveX, moveY: i.moveY, up: i.up, down: i.down, left: i.left, right: i.right, a: i.leap, aHeld: i.aHeld, b: i.padB || i.bPress || i.touchB, beat: audio.beat() }
      : { moveX: 0, moveY: 0, beat: audio.beat() };
    S.act.step(S.state, dt, actInput);
    trackCheckpoint();
    for (const e of S.state.events) handleEvent(e);
    S.state.events.length = 0;
    if (S.state.status === 'lost' && S.state.statusT > 0.2) {
      S.mode = 'over'; S.modeT = 0;
      S.card = { bg: 'magenta', kicker: S.act.kicker, title: S.state.lostTitle || 'The Sea Keeps\nHer Own', size: 110,
        sub: S.state.lostSub || '', alpha: 0 };
      const at = S.checkpoint && (S.checkpoint.scene | 0) > 0 ? S.act.scenes?.[S.checkpoint.scene | 0]?.name : null;
      const again = at ? `try again from ${at}` : 'try again';
      S.card.prompts = { touch: `Tap right to ${again} · tap left for the playbill`, other: `[A] ${again[0].toUpperCase() + again.slice(1)} · [B] The playbill` };
      announce(`The act is lost. Press A to ${again}.`);
    }
    if (S.state.status === 'won' && S.state.statusT > 0.15) actWon();
    return;
  }

  if (S.mode === 'over') {
    S.card.alpha = Math.min(1, S.card.alpha + dt * 2);
    if (S.card.alpha > 0.6) {
      if (i.tap) { if (i.tap.x < 640) showPlaybill(); else retry(); }
      else if (go) retry();
      else if (i.padB || i.back) showPlaybill();
    }
    return;
  }

  if (S.mode === 'curtaincall') {
    if (S.modeT > 6 || (go && S.modeT > 2)) showPlaybill();
  }
}

// After a loss: back to the latest checkpoint, or the top of the act.
function retry() {
  beginAct(S.actIndex, S.checkpoint ? { ...S.checkpoint, retry: true } : null);
}

function actWon() {
  save.scenes = { ...(save.scenes || {}), [S.act.id]: (S.act.scenes?.length || 1) - 1 };
  recordResult(save, S.act.id, S.state.result || {}, ACTS.length);
  if (S.actIndex + 1 < ACTS.length) return beginAct(S.actIndex + 1);
  // The whole play is done: the band's curtain call, then the playbill.
  S.mode = 'curtaincall'; S.modeT = 0; S.act = null; S.state = null; S.curtainTarget = 1;
  audio.play('done');
  announce('Curtain call.');
}

function handleEvent(e) {
  audio.play(e.type);
  renderer.onEvent(e, currentView());
  const rumble = settings.vibration && input.owner() !== null;
  if (e.type === 'hit') { if (rumble) input.rumble(0.8, 0.5, 220); if (TOUCH && settings.vibration) navigator.vibrate?.(70); }
  if (e.type === 'wreck' && rumble) input.rumble(1, 1, 600);
  if ((e.type === 'strike' || e.type === 'shipBreak') && rumble) input.rumble(0.4, 0.7, 160);
  const msg = S.act?.announce?.(e);
  if (msg) announce(msg);
}

// ---------------------------------------------------------------- touch
// What the A button says, scene by scene, and when B is needed.
function touchVerb() {
  const st = S.state, id = S.act?.id;
  if (!st) return '';
  if (id === 1) return st.phase === 'voyage' ? 'Leap' : st.phase === 'party' ? 'On the beat' : '';
  if (id === 2) return st.phase === 'offer' ? 'Take' : st.phase === 'ride' ? 'Leap' : 'Kick';
  if (id === 3) return S.state?.canTake ? 'Take' : 'Hide';
  if (id === 4) return 'Leap';
  if (id === 5) return st.phase === 'house' && st.carry?.stone && !st.stoneThrown ? 'Leap / throw' : 'Leap';
  return '';
}
function touchVerbHint(act) {
  return { 1: 'drag to sail, swipe to change row, tap to leap', 2: 'drag to swim, A to kick; on the moon boat, drag to sail, swipe to change row, tap to leap', 3: 'drag to walk, swipe to change groove, tap to hide',
    4: 'drag to walk, swipe up or tap to leap', 5: 'drag to climb, A to leap' }[act.id] || 'drag to move';
}
// Which touch scheme a scene uses: swipes for rows and floors, the stick for
// free movement (swimming, climbing).
function touchScheme() {
  const id = S.act?.id, ph = S.state?.phase;
  if (id === 1) return { mode: 'swipe', hint: ph === 'party' ? 'Tap on the beat' : 'Drag ↔ to sail · swipe ↕ to change row · tap to leap' };
  if (id === 2) return ph === 'ride' ? { mode: 'swipe', hint: 'Drag ↔ to sail · swipe ↕ to change row · tap to leap' } : { mode: 'stick', hint: 'Drag to swim' };
  if (id === 3) return { mode: 'swipe', hint: 'Drag ↔ to walk · swipe ↕ to change groove · tap to hide' };
  if (id === 4) return { mode: 'swipe', hint: 'Drag ↔ to walk · swipe up or tap to leap', flickUpIsA: true };
  return { mode: 'stick', hint: 'Drag to climb' };
}
let lastPortrait = null;
function updateTouch() {
  const portrait = innerHeight > innerWidth;
  if (portrait !== lastPortrait) {
    lastPortrait = portrait;
    $('#rotate').hidden = !portrait;
    if (portrait && S.mode === 'play') pause('Turn the device sideways to carry on.');
  }
  const playing = S.mode === 'play' && !S.paused && !portrait;
  const sch = playing ? touchScheme() : { mode: 'stick', hint: '' };
  touch.show({ playing, mode: sch.mode, hintText: sch.hint, flickUpIsA: !!sch.flickUpIsA,
    verb: playing ? touchVerb() : '', needB: playing && S.act?.id === 2 && S.state?.phase === 'offer' });
  // The hint shows for the first few seconds of each act (and the party).
  if (playing) $('#touch').classList.toggle('stick-used', S.modeT > 7 && !(S.act?.id === 1 && S.state?.phase === 'party' && S.state.phaseT < 4));
}

// ---------------------------------------------------------------- shell scenes
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
// The delivered playbill (700x1000 art, drawn at 404x578 about the middle of
// the stage). Its title banner and five act panels were measured in the art:
// panels at art y 236-338, 363-470, 497-607, 634-756 and 783-876, x 128-571.
const PB = { w: 404, h: 578, cx: 640, cy: 360, panels: [287, 416.5, 552, 695, 829.5], panelH: 100, panelX: [128, 571] };
// Where each act's row sits, for drawing and for taps (stage px).
function playbillRows() {
  if (assets.images.playbill) {
    const s = PB.w / 700, x0 = PB.cx - PB.w / 2, y0 = PB.cy - PB.h / 2;
    return { art: true, s, x0: x0 + PB.panelX[0] * s, x1: x0 + PB.panelX[1] * s, half: PB.panelH * s / 2 + 6,
      ys: PB.panels.map((p) => y0 + p * s), left: x0, top: y0 };
  }
  return { art: false, x0: 360, x1: 920, half: 36, ys: ACTS.map((a, n) => 244 + n * 72) };
}
function drawPlaybill(k, t) {
  const c = k.c;
  k.sky(null);
  for (let r = 0; r < 3; r++) k.waves(r, t * 40);
  const rows = playbillRows();
  c.textAlign = 'center';
  const mode = S.inputMode;
  const hint = mode === 'touch' ? 'Tap an act to begin · tap outside for the title'
    : mode === 'pad' ? '[LS] Choose · [A] Begin · [B] The title' : '↑ ↓ to choose · [A] to begin · [B] for the title';
  if (rows.art && k.asset('playbill', PB.cx, PB.cy + PB.h / 2, PB.w, PB.h)) {
    const s = rows.s, ink = k.col('#2a1424');
    c.fillStyle = ink; c.textAlign = 'center';
    c.font = '38px Yesteryear, cursive'; c.fillText("Widow's Bay", 640, rows.top + 163 * s + 8);
    c.font = '700 9px "Josefin Sans", sans-serif'; c.fillText('A TOY THEATRE IN FIVE ACTS', 640, rows.top + 192 * s);
    const pw = (rows.x1 - rows.x0) - 28;
    ACTS.forEach((a, n) => {
      const y = rows.ys[n], open = n < save.unlocked, sel = n === S.pb;
      if (sel) { c.fillStyle = k.col('#e0127a'); c.globalAlpha = 0.2; c.fillRect(rows.x0 + 4, y - PB.panelH * s / 2 + 3, rows.x1 - rows.x0 - 8, PB.panelH * s - 6); c.globalAlpha = 1; }
      c.fillStyle = k.col(open ? '#2a1424' : '#a99a86');
      c.textAlign = 'left'; c.font = '700 11px "Josefin Sans", sans-serif'; c.fillText('ACT ' + ROMAN[n], rows.x0 + 14, y - 10);
      const best = save.best[a.id];
      if (open && best != null) { c.textAlign = 'right'; c.font = '11px "Josefin Sans", sans-serif'; c.fillText('best ' + best, rows.x1 - 14, y - 10); }
      let px = 27; c.font = `${px}px Yesteryear, cursive`;
      const label = open ? a.title : '· · ·';
      const w = c.measureText(label).width;
      if (w > pw) { px = Math.floor(px * pw / w); c.font = `${px}px Yesteryear, cursive`; }
      c.textAlign = 'center'; c.fillText(label, (rows.x0 + rows.x1) / 2, y + 17);
    });
    // The prompt rides on a small plum label over the foot of the bill.
    c.font = '700 12px "Josefin Sans", sans-serif';
    const tw = Math.min(380, c.measureText(hint.replace(/\[(\w+)\]/g, 'XX')).width + 56);
    c.fillStyle = k.col('#2a1424'); c.globalAlpha = 0.85; c.beginPath(); c.roundRect(640 - tw / 2, 624, tw, 22, 11); c.fill(); c.globalAlpha = 1;
    c.fillStyle = k.col('#f1e3c8'); c.textAlign = 'center';
    richText(c, hint, 640, 639, { px: 12, mode, col: k.col });
    return;
  }
  c.fillStyle = k.col('#f1e3c8'); c.fillRect(330, 70, 620, 580);
  c.strokeStyle = k.col('#2a1424'); c.lineWidth = 3; c.strokeRect(344, 84, 592, 552); c.lineWidth = 1; c.strokeRect(352, 92, 576, 536);
  c.textAlign = 'center'; c.fillStyle = k.col('#2a1424');
  c.font = '54px Yesteryear, cursive'; c.fillText("Widow's Bay", 640, 160);
  c.font = '700 15px "Josefin Sans", sans-serif'; c.fillText('A TOY THEATRE IN FIVE ACTS', 640, 188);
  ACTS.forEach((a, n) => {
    const y = 250 + n * 72, open = n < save.unlocked, sel = n === S.pb;
    if (sel) { c.fillStyle = k.col('#e0127a'); c.globalAlpha = 0.18; c.fillRect(372, y - 34, 536, 60); c.globalAlpha = 1; }
    c.fillStyle = k.col(open ? '#2a1424' : '#a99a86');
    c.font = '700 16px "Josefin Sans", sans-serif'; c.textAlign = 'left'; c.fillText('ACT ' + ROMAN[n], 392, y - 6);
    c.font = '34px Yesteryear, cursive'; c.fillText(open ? a.title : '· · ·', 470, y + 2);
    c.textAlign = 'right'; c.font = '15px "Josefin Sans", sans-serif';
    const best = save.best[a.id];
    if (open && best != null) c.fillText('best ' + best, 888, y - 6);
  });
  c.textAlign = 'center'; c.font = '18px "Josefin Sans", sans-serif'; c.fillStyle = k.col('#2a1424');
  richText(c, hint, 640, 612, { px: 18, mode, col: k.col });
}

function drawCurtainCall(k, t) {
  k.sky(null);
  for (let r = 0; r < 3; r++) k.waves(r, t * 40);
}

// The title's hint, in the buttons of the input in use (Xbox glyphs on a pad).
const glyph = (b) => `<span class="xb xb-${b.toLowerCase()}" aria-label="${b === 'LS' ? 'left stick' : b}">${b === 'MENU' ? '<i></i><i></i><i></i>' : b}</span>`;
function syncTitleHint() {
  const h = $('#title-hint');
  if (S.inputMode === 'touch' || (TOUCH && S.inputMode !== 'pad')) { h.textContent = chrome.scrollTrick ? '' : 'Tip: Add to Home Screen to play full screen'; return; }
  if (S.inputMode === 'pad') h.innerHTML = S.titleNav ? `${glyph('A')} Select · ${glyph('MENU')} Start` : `Move ${glyph('LS')} for options · ${glyph('A')} Start`;
  else h.textContent = 'Press Enter to start · Tab for options';
}
S.inputMode = TOUCH ? 'touch' : 'key';
syncTitleHint();
// Start focused on Press Start so keyboard users can begin immediately.
$('#start').focus({ preventScroll: true });
requestAnimationFrame(frame);

// QA hook: ?qa exposes the shell state to browser smoke tests.
if (new URLSearchParams(location.search).has('qa')) window.__widowsBay = { S, settings, audio };
