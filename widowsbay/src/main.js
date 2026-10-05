// Shell: title, act cards, play, pause, dialogs, settings, fullscreen.
import { ACTS } from './acts/index.js';
import { loadSave, carryInto, recordResult } from './save.js';
import { createRenderer, loadAssets } from './art.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const live = $('#live');
const audio = createAudio();
const input = createInput();
input.bindTouch($('#touch'));

// ---------------------------------------------------------------- settings
const SETTINGS_KEY = 'widowsbay.settings.v1';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = { music: 7, sfx: 8, film: reduced ? 'gentle' : 'full', vibration: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* storage unavailable */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
const FILM = { full: 'Full', gentle: 'Gentle', off: 'Off' };
function syncSettingsUI() {
  for (const el of document.querySelectorAll('#settings [data-key]')) {
    const k = el.dataset.key;
    if (el.type === 'range') el.value = settings[k];
    else if (k === 'film') el.querySelector('span').textContent = FILM[settings.film];
    else if (k === 'vibration') el.querySelector('span').textContent = settings.vibration ? 'On' : 'Off';
  }
  audio.setVolumes(settings.music / 10, settings.sfx / 10);
}
for (const el of document.querySelectorAll('#settings [data-key]')) {
  const k = el.dataset.key;
  if (el.type === 'range') el.addEventListener('input', () => { settings[k] = +el.value; syncSettingsUI(); saveSettings(); });
  else el.addEventListener('click', () => {
    if (k === 'film') settings.film = { full: 'gentle', gentle: 'off', off: 'full' }[settings.film];
    if (k === 'vibration') settings.vibration = !settings.vibration;
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

// Act I and the title load first; the other acts' art follows in the background.
const FIRST_ART = ['logo', 'proscenium', 'sky-backdrop', 'moon-face', 'cloud', 'waves-back', 'waves-mid', 'waves-front',
  'ship', 'witch-moonboat', 'rock', 'pearl', 'tea-leaf', 'keepsake-tea', 'lighthouse', 'lighthouse-lit', 'band-trio',
  'deck-set', 'reveller-yellow', 'reveller-shaggy', 'reveller-jester', 'reveller-lady', 'lantern-string', 'sea-spirit',
  'ship-wreck-bow', 'ship-wreck-stern', 'guitar-sinking', 'waterspout'];
const showLogo = (logo) => { const el = $('#logo-img'); el.src = logo.src; el.alt = "Widow's Bay"; el.hidden = false; $('#logo').classList.add('has-img'); };
loadAssets('assets/', { first: FIRST_ART, onImage: (id, im) => { if (id === 'logo') showLogo(im); } }).then((a) => {
  assets = a;
  const song = a.audio?.song;
  if (song?.status === 'delivered' && song.file) audio.setTrack('assets/' + song.file, song.loopStart, song.loopEnd);
  const sfx = Object.fromEntries(Object.entries(a.sfx || {})
    .filter(([, v]) => v.status === 'delivered' && v.file).map(([k, v]) => [k, 'assets/' + v.file]));
  audio.setSfx(sfx);
  assetsLoaded = true;
  renderer = createRenderer(canvas, assets);
  if (assets.images.logo) showLogo(assets.images.logo);
});

// ---------------------------------------------------------------- flow
// Modes: title, playbill, intro (act card), play, over (retry card),
// curtaincall. One act module (src/acts/) is on stage at a time.
const save = loadSave();
const params = new URLSearchParams(location.search);
const QA = params.has('qa');

function startGame() {
  if (S.mode !== 'title' || dialogs.length) return;
  requestFullscreen();
  audio.unlock(); audio.startMusic(); audio.play('ui');
  $('#title').classList.add('opening');
  setTimeout(() => { $('#title').hidden = true; $('#title').classList.remove('opening'); }, 600);
  const jump = QA && +params.get('act');
  if (jump >= 1 && jump <= ACTS.length) return beginAct(jump - 1);
  if (save.unlocked > 1) showPlaybill(); else beginAct(0);
}

function carryFor(i) {
  const carry = carryInto(save, i + 1);
  // ?qa&act=N&carry=all starts a later act as if every keepsake were held.
  if (QA && params.get('carry') === 'all') Object.assign(carry, { tea: 3, guitar: true, pearl: true, stone: true, sleepers: 6 });
  if (QA && params.get('carry') === 'rose') Object.assign(carry, { tea: 3, guitar: true, rose: true, pearl: true, stone: true, sleepers: 12 });
  return carry;
}

function beginAct(i) {
  renderer.clearFx();
  S.actIndex = i; S.act = ACTS[i];
  S.state = S.act.create({ seed: (Math.random() * 2 ** 31) | 0, carry: carryFor(i) });
  S.mode = 'intro'; S.modeT = 0;
  S.curtain = 0; S.curtainTarget = 0;
  S.card = { kicker: S.act.kicker, title: S.act.title, size: S.act.size || 120, sub: S.act.sub, prompt: 'Press A or Space', alpha: 0 };
  S.readyT = 0;
  announce(`${S.act.kicker}, ${S.act.title}.`);
}

function showPlaybill() {
  S.mode = 'playbill'; S.modeT = 0; S.act = null; S.state = null; S.card = null;
  S.curtainTarget = 0;
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
function openDialog(el) {
  el.hidden = false;
  dialogs.push({ el, restore: document.activeElement });
  const first = el.querySelector('[data-focus]');
  focusEl(first);
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
  if (a === 'instructions') openDialog($('#instructions'));
  if (a === 'settings') openDialog($('#settings'));
  if (a === 'restart') { closeAllDialogs(); S.paused = false; if (S.act) beginAct(S.actIndex); else showPlaybill(); }
  if (a === 'title') toTitle();
}));
$('#start').addEventListener('click', startGame);
$('#btn-instructions').addEventListener('click', () => { audio.play('ui'); openDialog($('#instructions')); });
$('#btn-settings').addEventListener('click', () => { audio.play('ui'); openDialog($('#settings')); });
$('#btn-fullscreen').addEventListener('click', () => { audio.play('ui'); toggleFullscreen(); });

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
function requestFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' }).catch(() => { /* rejected: keep playing */ });
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
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

function update(dt, i) {
  if (S.mode === 'title') updateLoadbar();
  S.curtain += (S.curtainTarget - S.curtain) * Math.min(1, dt * 2.2);
  const coarse = matchMedia('(pointer: coarse)').matches;
  $('#touch').hidden = !(coarse && S.mode === 'play' && !S.paused);

  // Menus have the input while any dialog is open.
  if (dialogs.length) { menuInput(i); return; }

  if (S.mode === 'title') {
    if (!S.titleNav) {
      if (i.stickNav) { S.titleNav = true; focusEl($('#start')); $('#title-hint').textContent = 'A: select · Menu: start'; return; }
      if (i.anyPad) startGame();
    } else {
      if (i.padStart) return startGame();
      if (i.padB) { S.titleNav = false; clearNavFocus(); document.activeElement?.blur(); $('#title-hint').textContent = 'Move left stick for options'; return; }
      menuInput({ ...i, padB: false, back: false });
    }
    return;
  }

  S.modeT += dt;
  const go = i.padA || i.confirm || (i.leap && i.source === 'touch');

  if (S.mode === 'playbill') {
    const n = Math.min(save.unlocked, ACTS.length);
    if (i.up) { S.pb = (S.pb + n - 1) % n; audio.play('ui'); }
    if (i.down) { S.pb = (S.pb + 1) % n; audio.play('ui'); }
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
    if ((go && S.readyT > 0.4) || S.readyT > 6) {
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
      ? { moveX: i.moveX, moveY: i.moveY, up: i.up, down: i.down, left: i.left, right: i.right, a: i.leap, aHeld: i.aHeld, b: i.padB || i.bPress, beat: audio.beat() }
      : { moveX: 0, moveY: 0, beat: audio.beat() };
    S.act.step(S.state, dt, actInput);
    for (const e of S.state.events) handleEvent(e);
    S.state.events.length = 0;
    if (S.state.status === 'lost' && S.state.statusT > 0.2) {
      S.mode = 'over'; S.modeT = 0;
      S.card = { bg: 'magenta', kicker: S.act.kicker, title: S.state.lostTitle || 'The Sea Keeps\nHer Own', size: 110,
        sub: S.state.lostSub || '', prompt: 'Press A to try again · B for the playbill', alpha: 0 };
      announce('The act is lost. Press A to try again.');
    }
    if (S.state.status === 'won' && S.state.statusT > 0.15) actWon();
    return;
  }

  if (S.mode === 'over') {
    S.card.alpha = Math.min(1, S.card.alpha + dt * 2);
    if (S.card.alpha > 0.6) {
      if (go) beginAct(S.actIndex);
      else if (i.padB || i.back) showPlaybill();
    }
    return;
  }

  if (S.mode === 'curtaincall') {
    if (S.modeT > 6 || (go && S.modeT > 2)) showPlaybill();
  }
}

function actWon() {
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
  if (e.type === 'hit') { if (rumble) input.rumble(0.8, 0.5, 220); }
  if (e.type === 'wreck' && rumble) input.rumble(1, 1, 600);
  if ((e.type === 'strike' || e.type === 'shipBreak') && rumble) input.rumble(0.4, 0.7, 160);
  const msg = S.act?.announce?.(e);
  if (msg) announce(msg);
}

// ---------------------------------------------------------------- shell scenes
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
function drawPlaybill(k, t) {
  const c = k.c;
  k.sky(null);
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
  c.textAlign = 'center'; c.font = '15px "Josefin Sans", sans-serif'; c.fillStyle = k.col('#2a1424');
  c.fillText('Up / down to choose · A to begin · B for the title', 640, 612);
}

function drawCurtainCall(k, t) {
  k.sky(null);
  for (let r = 0; r < 3; r++) k.waves(r, t * 40);
}

// Start focused on Press Start so keyboard users can begin immediately.
$('#start').focus({ preventScroll: true });
requestAnimationFrame(frame);

// QA hook: ?qa exposes the shell state to browser smoke tests.
if (new URLSearchParams(location.search).has('qa')) window.__widowsBay = { S, settings, audio };
