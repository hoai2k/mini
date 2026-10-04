// Shell: title, act cards, play, pause, dialogs, settings, fullscreen.
import { createBoard, step, KEEPSAKES } from './board.js';
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

loadAssets().then((a) => {
  assets = a;
  const song = a.audio?.song;
  if (song?.status === 'delivered' && song.file) audio.setTrack('assets/' + song.file, song.loopStart, song.loopEnd);
  const sfx = Object.fromEntries(Object.entries(a.sfx || {})
    .filter(([, v]) => v.status === 'delivered' && v.file).map(([k, v]) => [k, 'assets/' + v.file]));
  audio.setSfx(sfx);
  assetsLoaded = true;
  renderer = createRenderer(canvas, assets);
  const logo = assets.images.logo;
  if (logo) { const el = $('#logo-img'); el.src = logo.src; el.alt = "Widow's Bay"; el.hidden = false; $('#logo').classList.add('has-img'); }
});

// ---------------------------------------------------------------- flow
const INTRO = {
  kicker: 'Act I', title: 'The Crossing', size: 130,
  sub: 'The witch will turn the wind.\nBring home the tea leaves, the pearl and the sea rose.',
  prompt: 'Press A or Space',
};

function startGame() {
  if (S.mode !== 'title' || dialogs.length) return;
  requestFullscreen();
  audio.unlock(); audio.startMusic(); audio.play('ui');
  $('#title').classList.add('opening');
  setTimeout(() => { $('#title').hidden = true; $('#title').classList.remove('opening'); }, 600);
  beginAct();
}

function beginAct() {
  renderer.clearFx();
  renderer.setLamp(false);
  S.board = createBoard((Math.random() * 2 ** 31) | 0);
  S.mode = 'intro'; S.modeT = 0;
  S.curtain = 0; S.curtainTarget = 0;
  S.card = { ...INTRO, alpha: 0 };
  S.readyT = 0;
  announce('Act One, The Crossing.');
}

function toTitle() {
  closeAllDialogs();
  S.paused = false; S.mode = 'title'; S.board = null; S.card = null; S.curtainTarget = 0;
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
  if (a === 'restart') { closeAllDialogs(); S.paused = false; beginAct(); }
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
  renderer.tick(S.paused ? 0 : dt, S.board);
  renderer.render({
    board: S.board, curtain: S.curtain, card: S.card, film: settings.film, t: S.t,
    hud: S.mode === 'play' || S.mode === 'over' || S.mode === 'end',
  });
  requestAnimationFrame(frame);
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
    // Hold the ship still until the curtains are mostly open.
    const ready = S.curtain > 0.7;
    step(S.board, dt, ready ? { moveX: i.moveX, rowUp: i.up, rowDown: i.down, leap: i.leap } : {});
    for (const e of S.board.events) handleEvent(e);
    S.board.events.length = 0;
    if (S.board.phase === 'wrecked' && S.board.phaseT > 2.2) {
      S.mode = 'over'; S.modeT = 0;
      S.card = { bg: 'magenta', kicker: 'Act I', title: 'The Sea Keeps\nHer Own', size: 110, sub: `${S.board.pearls} pearls · ${keepsakeCount()} of 3 keepsakes`, prompt: 'Press A to sail again · B for the title', alpha: 0 };
      announce('Shipwrecked. Press A to sail again.');
    }
    if (S.board.phase === 'done') {
      S.mode = 'end'; S.modeT = 0;
      const lamp = S.board.outcome === 'lamp';
      S.card = lamp
        ? { kicker: 'Act I — Curtain', title: 'A Lamp in\nthe Window', size: 110, sub: `Score ${S.board.score} · ${S.board.pearls} pearls · all three keepsakes\nAct II, The Grotto, is still in rehearsal.`, prompt: 'Press A to sail again · B for the title', alpha: 0 }
        : { kicker: 'Act I — Curtain', title: 'The Window\nis Dark', size: 110, sub: `Score ${S.board.score} · ${keepsakeCount()} of 3 keepsakes\nShe may not have waited. Bring all three next time.`, prompt: 'Press A to sail again · B for the title', alpha: 0 };
      announce(lamp ? 'Act one complete. A lamp is burning in the window.' : 'Act one complete, but the window is dark.');
    }
    return;
  }

  if (S.mode === 'over' || S.mode === 'end') {
    if (S.mode === 'end' && S.modeT < 1.5) { S.card.alpha = 0; return; } // let the bay be seen first
    S.card.alpha = Math.min(1, S.card.alpha + dt * 2);
    if (S.card.alpha > 0.6) {
      if (go) beginAct();
      else if (i.padB || i.back) toTitle();
    }
  }
}

const keepsakeCount = () => KEEPSAKES.filter((k) => S.board.keepsakes[k]).length;

function handleEvent(e) {
  audio.play(e.type);
  renderer.onEvent(e, S.board);
  const rumble = settings.vibration && input.owner() !== null;
  if (e.type === 'hit') { if (rumble) input.rumble(0.8, 0.5, 220); announce(`Hit. ${e.hull} lantern${e.hull === 1 ? '' : 's'} left.`); }
  if (e.type === 'wreck' && rumble) input.rumble(1, 1, 600);
  if (e.type === 'strike' && rumble) input.rumble(0.3, 0.6, 120);
  if (e.type === 'keepsake') announce(`Keepsake: ${{ tea: 'tea leaves', pearl: 'her pearl', rose: 'sea rose' }[e.kind]}.`);
  if (e.type === 'windWarn') announce(e.to > 0 ? 'The wind is turning behind you.' : 'The wind is turning against you.');
  if (e.type === 'arrive') {
    announce("Widow's Bay in sight.");
    renderer.setLamp(keepsakeCount() === KEEPSAKES.length);
  }
}

// Start focused on Press Start so keyboard users can begin immediately.
$('#start').focus({ preventScroll: true });
requestAnimationFrame(frame);

// QA hook: ?qa exposes the shell state to browser smoke tests.
if (new URLSearchParams(location.search).has('qa')) window.__widowsBay = { S, settings, audio };
