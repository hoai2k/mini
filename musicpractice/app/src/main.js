// Music Practice: the app around its screens. The theme and its art, moving
// between screens, the app settings and dialogs, the sound unlocking on a
// tap, the keys, the Practice Routine's hold on the tools, and starting up.
// Each tool's own screen is its own module: metronomeui.js, recorderui.js
// (the microphone, shared with the tuner), tunerui.js, droneui.js and
// timerui.js (the Practice Routine).

import { TEXT } from './text.js';

import { audio, existingAudio, unlock, setSession, heardNow, keepAwake, setExtraDelay, setContextSpeaker } from './audio.js';
import { primeFromTap, setSpeaker, setPlaybackVolume, element as playerElement } from './player.js';

import { dlog, debugState, startDebugLog, debugBeat, debugText, debugJson } from './debuglog.js';

import { openAudioCheck } from './audiocheck.js';
import { diag, micPermission } from './devices.js';

import { freesMicForPlayback, freeReason } from './recorder.js';
import { setupTuner } from './tunerui.js';
import { setupMetronome } from './metronomeui.js';
import { setupRecorder } from './recorderui.js';
import { $, chips, note, saveFile } from './ui.js';
import { Drone, preload as preloadDrone, wrap as wrapNote, spelling } from './drone.js';
import { noteName } from './tuning.js';
import { setupDrone } from './droneui.js';
import { isApp, platform, onBackButton, exitApp } from './native.js';
import { setupFeedback } from './feedback.js';
import { initPro, isPro, onProChange, requirePro, openPaywall } from './pro.js';
import { FREE_THEME } from './pro-config.js';
import { nativeAudio, NativeDrone, onNativeStopped } from './nativeaudio.js';
import { setupTimer } from './timerui.js';
import { playChime, playClips, loadClip } from './timer.js';
import { setupPager } from './pager.js';

// In the iOS and Android apps the metronome and the drone play through native
// code, so they keep going with the screen locked (nativeaudio.js).
const useNative = nativeAudio();

// "Record during playback" is parked: its setting is hidden and ignored, and
// its code is kept to fix and re-enable later. Recording and playback are
// separate: the recorder listens, records, plays the take back, listens again.
const RECORD_DURING_PLAYBACK = false;
const recordDuringPlayback = () => RECORD_DURING_PLAYBACK && settings.recordDuringPlayback;

import { load, save, THEMES, APPEARANCES, resolveMode, meterOf } from './settings.js';
import { applyArt, alignPendulum, alignBow } from './art.js';

// Opened from an iPhone's or iPad's home screen: the page keeps clear of the fade iOS draws at the top (styles.css --edge-fade).
if (navigator.standalone) document.documentElement.classList.add('ios-app');
const settings = load();
const persist = () => save(settings);

// The Practice Routine's button on the home screen (the routine itself is set up further down).
const timerTile = (() => {
  const a = document.createElement('a');
  a.className = 'choice';
  a.href = '#routine';
  a.id = 'go-timer';
  a.dataset.tool = 'routine';
  a.draggable = false;
  a.innerHTML = '<span class="art" data-asset="home-routine"></span><span class="label"></span>';
  a.querySelector('.label').textContent = TEXT.home.tools.timer;
  $('choices').append(a);
  return a;
})();

// ---------------------------------------------------------------- theme

/** A theme's fonts: from Google Fonts on the web, bundled in the apps (mobile/fonts/). */
const fontsHref = (theme) => (isApp() ? `fonts/${theme.id}.css` : `https://fonts.googleapis.com/css2?${theme.fonts}&display=swap`);

const systemDark = matchMedia('(prefers-color-scheme: dark)');
// 'System' follows the device as it switches between light and dark (at dusk, say).
systemDark.addEventListener?.('change', () => { if (settings.appearance === 'system') applyTheme(); });

/** Switch the whole app's look: colours and type (styles.css) and art. */
function applyTheme() {
  // Without Pro (in the apps), the free theme shows; the choice is kept for when Pro is on.
  const id = isPro() ? settings.theme : FREE_THEME;
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  const mode = resolveMode(theme.id, settings.appearance, systemDark.matches);
  document.documentElement.dataset.theme = theme.id;
  document.documentElement.dataset.mode = mode;
  for (const tile of document.querySelectorAll('.theme-tile')) tile.dataset.mode = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || theme.color);
  const fonts = fontsHref(theme);
  const link = $('theme-fonts');
  if (link && link.getAttribute('href') !== fonts) link.setAttribute('href', fonts);
  applyArt(theme.id, () => { alignPendulum($('metronome-case'), $('pendulum')); showWeight(); alignBow(document.querySelector('#dr-bow .art')); });
  // Waveform colours come from the theme.
  if (rec.wave) rec.wave.dirty = true;
  for (const c of document.querySelectorAll('.take canvas')) c.redraw?.();
}

// Browsers only allow sound to start from a tap or key press.
// WebKit only counts touchend, click and keydown as gestures that may start
// audio (not pointerdown or touchstart), so unlock and prime on those too.
//
// Coming back from another app (a call, Messenger, a video), iPhone can leave
// the audio engine 'interrupted' for good. A tap while listening is stuck
// like that starts listening again on a new engine.
const wake = (e) => {
  if (e.type !== 'pointerdown' && listeningActive() && engineStuck()) {
    restartListening();
    return;
  }
  unlock();
  primeFromTap();
  // A tap that doesn't get the engine going marks it stuck for the next tap.
  const ctx = existingAudio();
  if (e.type !== 'pointerdown' && listeningActive() && ctx && ctx.state !== 'running') {
    setTimeout(() => {
      if (listeningActive() && ctx === existingAudio() && ctx.state !== 'running') markNeedsTap();
    }, 700);
  }
};
for (const type of ['pointerdown', 'touchend', 'click', 'keydown']) {
  document.addEventListener(type, wake, { capture: true });
}

// ---------------------------------------------------------------- screens

const SCREENS = ['home', 'metronome', 'record', 'tuner', 'drone', 'routine'];
// The browser tab names the screen by its own title (the home tiles may be shorter).
const TITLES = { metronome: TEXT.metronome.title, record: TEXT.recorder.title, tuner: TEXT.tuner.title, drone: TEXT.drone.title, routine: TEXT.timer.title };
let screen = 'home';
function route() {
  const want = location.hash.replace('#', '') || 'home';
  let next = SCREENS.includes(want) ? want : 'home';
  // The Drone is part of Pro in the apps: without it, stay put and offer Pro.
  const paywall = next === 'drone' && !isPro();
  if (paywall) {
    next = screen;
    history.replaceState(null, '', next === 'home' ? location.pathname + location.search : `#${next}`);
  }
  if (next !== screen || document.getElementById(next).hidden !== false) {
    leave(screen);
    for (const id of SCREENS) $(id).hidden = id !== next;
    dlog('screen', { from: screen, to: next });
    screen = next;
    enter(next);
  }
  if (paywall) openPaywall('drone');
}

if (timerTile) $('choices').append(timerTile); // the newest button last

function leave(name) {
  if (name === 'metronome') { stopMetronome(); closeSync(); }
  if (name === 'record') stopRecorder();
  if (name === 'tuner') { stopTuner(); tuner.stopScale(); }
  if (name === 'drone') droneUI.stop();
  if (name === 'routine') timerUI?.leave();
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
}

function enter(name) {
  if (name === 'metronome') {
    // The metronome doesn't use the mic. A mic the recorder holds (switched
    // off, so permission isn't asked again) is kept; Safari's session is left
    // alone while it is held, since switching could cut it off.
    if (!rec.recorder?.holdsMic) setSession('playback');
    $('met-toggle').focus({ preventScroll: true });
    queueFit();
  }
  if (name === 'drone') droneUI.fit();
  if (name === 'record') checkRecorderMic(); // it starts off: the record button begins the cycle
  if (name === 'tuner') { startTuner(); tuner.fit(); }
  if (name === 'routine') { if (!rec.recorder?.holdsMic) setSession('playback'); timerUI?.enter(); }
  if (name === 'home') layoutHome();
  if (name === 'drone') {
    // Like the metronome, the drone doesn't use the mic.
    if (!rec.recorder?.holdsMic) setSession('playback');
    droneUI.refresh();
  }
  document.title = TITLES[name] ? TEXT.app.pageTitle(TITLES[name]) : TEXT.app.name;
}

window.addEventListener('hashchange', route);

// ---------------------------------------------------------------- app settings and dialogs

// Close a settings sheet by tapping outside it.
for (const d of document.querySelectorAll('dialog.sheet')) {
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
}

// Theme: preview tiles in the app settings on the home screen (the only place
// it is chosen). Each tile is drawn in its own theme.
const themeTiles = THEMES.map((t) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'theme-tile';
  b.dataset.theme = t.id;
  b.setAttribute('role', 'radio');
  b.innerHTML = `<span class="tile-name"></span><span class="tile-swatches" aria-hidden="true"><i></i><i></i><i></i></span><svg class="tile-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
  b.querySelector('.tile-name').textContent = t.label;
  b.addEventListener('click', () => setTheme(t.id));
  return b;
});
$('theme-tiles').replaceChildren(...themeTiles);
$('theme-tiles').addEventListener('keydown', (e) => {
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  const i = themeTiles.indexOf(document.activeElement);
  if (!d || i < 0) return;
  e.preventDefault();
  const next = themeTiles[(i + d + themeTiles.length) % themeTiles.length];
  setTheme(next.dataset.theme);
  next.focus();
});

function syncThemeControls() {
  const id = isPro() ? settings.theme : FREE_THEME;
  for (const b of themeTiles) {
    const on = b.dataset.theme === id;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
}

// Dark Mode, a dropdown: free in the apps too, since it is about being able to read the screen.
const appearance = $('appearance');
appearance.replaceChildren(...APPEARANCES.map((id) => new Option(TEXT.appSettings.appearances[id], id)));
appearance.value = settings.appearance;
appearance.addEventListener('change', () => {
  settings.appearance = appearance.value;
  settings.appearanceChosen = true;
  persist();
  applyTheme();
});
$('reload-page').addEventListener('click', () => location.reload());
// A browser's button: in the apps it reads as a website in a wrapper to App Review (Guideline 4.2).
$('reload-page').hidden = isApp();

function setTheme(id) {
  if (id !== FREE_THEME && !requirePro('themes')) {
    syncThemeControls();
    return;
  }
  settings.theme = id;
  settings.themeChosen = true;
  persist();
  applyTheme();
  syncThemeControls();
}

syncThemeControls();

const appSettings = $('app-settings');
$('app-settings-btn').addEventListener('click', () => {
  loadThemeFonts();
  appSettings.showModal();
});
/** Every theme's fonts, so the tiles show them (only once a theme choice opens). */
function loadThemeFonts() {
  if (!$('all-theme-fonts')) {
    const hrefs = isApp() ? THEMES.map(fontsHref) : [`https://fonts.googleapis.com/css2?${THEMES.map((t) => t.fonts).join('&')}&display=swap`];
    hrefs.forEach((href, i) => {
      const link = document.createElement('link');
      if (i === 0) link.id = 'all-theme-fonts';
      link.rel = 'stylesheet';
      link.href = href;
      document.head.append(link);
    });
  }
}

/*
 * Theme, from any mini app's settings (the button beside Audio check): the
 * main settings' own theme tiles and Dark Mode, moved into a sheet of their
 * own while it is open and back when it closes, so there is one of each.
 */
const themeSheet = $('theme-sheet');
function openThemeSheet(from) {
  from?.close();
  loadThemeFonts();
  $('theme-sheet-body').append($('theme-field'), $('appearance-field'));
  syncThemeControls();
  themeSheet.showModal();
  themeSheet.querySelector('.theme-tile[aria-checked="true"]')?.focus();
}
themeSheet.addEventListener('close', () => {
  $('app-settings').querySelector('form').insertBefore($('appearance-field'), $('app-links'));
  $('app-settings').querySelector('form').insertBefore($('theme-field'), $('appearance-field'));
});
for (const b of document.querySelectorAll('.open-theme')) {
  b.addEventListener('click', () => openThemeSheet(b.closest('dialog')));
}

// A dialog opening focuses its first control, the close X, which then wears a
// focus ring on a phone: the dialog takes the focus itself instead (Tab still
// moves into it). Code that focuses something particular after opening still does.
for (const d of document.querySelectorAll('dialog')) d.tabIndex = -1;
const showModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function () {
  showModal.call(this);
  if (document.activeElement?.closest('.sheet-head')) this.focus({ preventScroll: true });
};

/*
 * A drag on an open dialog never scrolls the page behind it. The stylesheet
 * stops the page scrolling while one is open; a phone can still pass a drag
 * on the sheet through to the page (where the sheet has nothing to scroll,
 * or is already at its end), so a touch move inside a dialog is let through
 * only where something under the finger can scroll that way, or is a control
 * that drags (a slider, a dropdown).
 */
let dragY = 0;
document.addEventListener('touchstart', (e) => { dragY = e.touches[0]?.clientY ?? 0; }, { passive: true });
document.addEventListener('touchmove', (e) => {
  const dialog = document.querySelector('dialog[open]');
  if (!dialog || e.touches.length !== 1) return;
  const t = e.target instanceof Element ? e.target : null;
  if (t?.closest('input, select, textarea, [role="slider"]')) return;
  const y = e.touches[0].clientY;
  const up = y < dragY; // finger moving up: the content would scroll down
  dragY = y;
  for (let el = t; el && dialog.contains(el); el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      const room = up ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
      if (room) return;
    }
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });

// ---------------------------------------------------------------- metronome

// The Metronome screen (metronomeui.js).
const met = setupMetronome({ settings, persist, useNative, mic: { listening: () => listeningActive(), playing: () => rec.playing } });
const {
  meterSelect, soundSelect, metVolume,
  setBpm, renderBeats, shownBeats, metronomeConfigured, startMetronome, stopMetronome, soundCtx, setSub,
  showWeight, queueFit, animateMetronome, visualsShown, setSync, openSync, closeSync,
} = met;

// ---------------------------------------------------------------- the microphone, the recorder and the tuner

// The Tuner's screen (tunerui.js), and the mic it shares with the Playback Recorder (recorderui.js).
const tuner = setupTuner({ settings, persist, chips });
const rec = setupRecorder({ settings, persist, tuner, screen: () => screen, routineRunning: () => !!timerUI?.running, recordDuringPlayback });
const {
  recVolume, listeningActive, engineStuck, restartListening, markNeedsTap,
  configureRecorder, startRecorder, stopRecorder, checkRecorderMic, renderTakes, loadTakes, animateRecorder,
  chooseMic, startTuner, stopTuner, animateTuner,
} = rec;

// ---------------------------------------------------------------- drone

let drone = null;
let nativeDrone = null;
/** The drone's sound engine, on a fresh audio context when started from a tap (as the metronome does). */
function droneEngine() {
  if (useNative) {
    if (!nativeDrone) {
      nativeDrone = new NativeDrone();
      nativeDrone.setVolume(settings.droneVolume);
    }
    return nativeDrone;
  }
  // While it sounds, keep its context (so note changes crossfade); from
  // silence, a fresh one if the output may have changed (a Bluetooth speaker).
  const ctx = drone?.playing && drone.ctx.state !== 'closed' ? drone.ctx : soundCtx();
  if (!drone || drone.ctx !== ctx) {
    drone = new Drone(ctx);
    drone.setVolume(settings.droneVolume);
    if (settings.speaker !== 'default') setContextSpeaker(settings.speaker);
  }
  unlock();
  preloadDrone(drone.ctx, settings.droneVoice); // every note of the voice ready to play
  return drone;
}
const droneUI = setupDrone({
  settings,
  persist,
  chips,
  engine: droneEngine,
  onPlaying: (on) => {
    if (on && !rec.recorder?.holdsMic) setSession('playback');
    dlog(on ? 'drone-start' : 'drone-stop', { native: useNative, volume: settings.droneVolume, voice: settings.droneVoice, midi: settings.droneMidi, ctx: drone?.ctx.state ?? null, micHeld: !!rec.recorder?.holdsMic });
    if (on) setTimeout(debugBeat, 3000); // past the fade-in
    keepAwake(on);
  },
});
// ---------------------------------------------------------------- practice timer

/*
 * The Practice Routine (inside the code, the timer). Running, it is a shell
 * around the tools: its cards turn the Metronome, the Drone and the Playback
 * Recorder on and off, each running with its own settings (timerui.js).
 */
let timerUI = null;
let pager = null;
let timerDrone = false; // the routine's Drone card started the drone
let timerPlayback = false; // the routine's Playback card turned the recorder on
// Chimes and the voice play on the context the metronome plays through, when it does (one context, one output).
const clipCtx = () => (!useNative && met.metronome?.running ? met.metronome.ctx : audio());
const droneNote = () => {
  const n = noteName(settings.droneMidi, { flats: spelling(settings.droneAccidentals, settings.droneSpelling) === 'flats' });
  return `${n.name}${n.octave}`;
};
/** The drone, as the routine's Drone card has it: the Drone's own note, instrument and fifth, untimed. */
function routineDrone() {
  timerDrone = true;
  const voice = TEXT.drone.voices[settings.droneVoice] || '';
  droneEngine().play({ midi: settings.droneMidi, voice: settings.droneVoice, a4: settings.a4, fifth: settings.droneFifth, schedule: null, label: `${TEXT.timer.title} · ${voice}` });
}
const droneChanged = () => { persist(); droneUI.refresh(); if (timerDrone) routineDrone(); };
const routineTools = {
  metronome: {
    start: startMetronome,
    stop: stopMetronome,
    on: () => !!met.metronome?.running,
    bpm: () => settings.bpm,
    setBpm: (n) => setBpm(n),
    /** Its settings as a routine item keeps them: tempo, time signature, click, extra notes, accent and volume. */
    config: () => ({ bpm: settings.bpm, meter: settings.meter, sound: settings.sound, sub: settings.subOn ? settings.subKind : 1, accent: settings.accent, volume: settings.volume }),
    setConfig: ({ bpm, meter, sound, sub, accent, volume }) => {
      if (bpm !== settings.bpm) setBpm(bpm);
      if (volume !== undefined && volume !== settings.volume) { settings.volume = volume; metVolume.show(); }
      const subNow = settings.subOn ? settings.subKind : 1;
      if (meter === settings.meter && sound === settings.sound && sub === subNow && (accent === undefined || accent === settings.accent)) {
        met.metronome?.configure(settings);
        persist();
        return;
      }
      if (meter !== settings.meter) { settings.meter = meter; settings.accentPattern = null; meterSelect.value = meter; }
      if (sound !== settings.sound) { settings.sound = sound; soundSelect.value = sound; }
      if (accent !== undefined && accent !== settings.accent) { settings.accent = accent; if (!accent) settings.accentPattern = null; $('accent').checked = accent; }
      if (sub !== subNow) setSub(sub > 1, sub > 1 ? sub : settings.subKind);
      else metronomeConfigured();
    },
    meter: () => (meterOf(settings.meter).beats === 1 ? TEXT.metronome.noBars : settings.meter),
    beat: () => {
      const strengths = shownBeats();
      if (!met.metronome?.running) return { idx: -1, strengths };
      const now = met.metronome.native ? met.metronome.heardNow(1 / 60) : heardNow(1 / 60);
      const b = met.metronome.beatAt(now);
      return { idx: !b ? -1 : meterOf(settings.meter).beats === 1 ? b.count % strengths.length : b.beat, strengths, at: b, now, period: met.metronome.period };
    },
  },
  drone: {
    start: routineDrone,
    stop: () => { if (timerDrone) { timerDrone = false; droneEngine().stop(); } },
    on: () => timerDrone,
    note: droneNote,
    midi: () => settings.droneMidi,
    volume: () => settings.droneVolume,
    /** An item's drone: its note, instrument, fifth and volume (playing on if it was). */
    set: ({ midi, voice, fifth, volume }) => {
      if (volume !== undefined && volume !== settings.droneVolume) droneUI.setVolume(volume);
      if (midi === settings.droneMidi && voice === settings.droneVoice && fifth === settings.droneFifth) return;
      Object.assign(settings, { droneMidi: wrapNote(midi), droneVoice: voice, droneFifth: fifth });
      droneChanged();
    },
    step: (d) => { settings.droneMidi = wrapNote(settings.droneMidi + d); droneChanged(); },
    voice: () => settings.droneVoice,
    setVoice: (v) => { settings.droneVoice = v; droneChanged(); },
    fifth: () => settings.droneFifth,
    setFifth: (on) => { settings.droneFifth = on; settings.droneFifthChosen = true; droneChanged(); },
    allowed: () => isPro(),
    ask: () => openPaywall('drone'),
  },
  playback: {
    start: () => { timerPlayback = true; startRecorder(); },
    stop: () => { if (timerPlayback) { timerPlayback = false; stopRecorder(); } },
    on: () => timerPlayback,
    status: () => {
      const state = rec.playing ? 'playing' : rec.recorder?.state ?? 'off';
      return {
        state: timerPlayback || state !== 'off' ? state : 'off',
        seconds: state === 'recording' ? (performance.now() - rec.recordingSince) / 1000 : 0,
        takes: rec.takes.length,
      };
    },
    busy: () => rec.recorder?.state === 'recording' || !!rec.playing,
    /** Its settings as a routine item keeps them: the silence it stops after, and whether it plays takes back. */
    config: () => ({ silenceSec: settings.silenceSec, autoPlay: settings.autoPlay, volume: settings.playVolume }),
    setConfig: ({ silenceSec, autoPlay, volume }) => {
      if (volume !== undefined && volume !== settings.playVolume) { settings.playVolume = volume; setPlaybackVolume(volume); recVolume.show(); persist(); }
      if (silenceSec === settings.silenceSec && autoPlay === settings.autoPlay) return;
      settings.silenceSec = silenceSec;
      settings.autoPlay = autoPlay;
      $('silence').value = silenceSec;
      $('autoplay').checked = autoPlay;
      configureRecorder();
    },
    ignoreFor: (sec) => rec.recorder?.ignoreFor(sec),
  },
};
const timerAudio = {
  // On the context the metronome plays through, when it does (one context, one output).
  chime(id) { return playChime(clipCtx(), id); },
  clips(urls, volume) { return playClips(clipCtx(), urls, volume == null ? {} : { volume }); },
  preload(urls) { const c = clipCtx(); for (const u of urls) loadClip(c, u); },
  running(on) {
    keepAwake(on);
    if (on && !rec.recorder?.holdsMic) setSession('playback');
  },
};
timerUI = setupTimer({ settings, tools: routineTools, audio: timerAudio });
pager = setupPager({
  home: $('home'),
  timer: $('routine'),
  current: () => screen,
  go: (name) => {
    history.pushState(null, '', name === 'routine' ? '#routine' : location.pathname + location.search);
    route();
  },
});
// The smaller Practice Routine button under the others slides the routine in.
$('go-routine-page').addEventListener('click', (e) => { if (pager.slide('home')) e.preventDefault(); });
// Back to the start slides when the timer is the second page.
$('timer-back').addEventListener('click', (e) => { if (pager.slide('routine')) e.preventDefault(); });
let homeQueued = 0;
addEventListener('resize', () => { cancelAnimationFrame(homeQueued); homeQueued = requestAnimationFrame(layoutHome); });
document.fonts?.ready.then(() => layoutHome());
document.addEventListener('art-applied', () => layoutHome()); // a theme's own art and fonts change what fits

/**
 * The home screen fits the window without scrolling. Wherever the window is
 * wider than tall (a desktop, a tablet or phone on its side) the five
 * buttons are one row, the Practice Routine among them. Upright, the Routine
 * is a fifth button only when all five fit; otherwise it is a second page,
 * reached by a smaller button under the others (its icon as large as the
 * room left allows, ROUTINE_ART) that slides it in, or by a swipe. Then the
 * buttons' art is made as large as fits (HOME_ART, largest first), and only
 * if even a small size doesn't fit are the spacing and labels tightened
 * (#home.compact) and the sizes tried again.
 *
 * Measured whatever screen is showing (home is laid out invisibly for it
 * when it isn't), so turning the phone on the Routine page decides whether
 * a swipe goes back as surely as turning it on the home screen.
 */
const ROUTINE_ART = [72, 64, 56, 48, 40, 32];
const HOME_ART = [200, 184, 168, 152, 140, 128, 116, 104, 94, 84, 76, 68, 60, 52, 44, 36];
const homeRow = matchMedia('(orientation: landscape)'); // the stylesheet's one row of five
function layoutHome() {
  if (!pager || document.documentElement.classList.contains('paging')) return; // not while a page is turning
  const home = $('home');
  const box = $('choices');
  const link = $('go-routine-page');
  const measuring = screen !== 'home';
  if (measuring) { home.hidden = false; home.classList.add('measuring'); }
  // Home is centred top to bottom, so too much spills off the top as well
  // as the bottom, and the top doesn't scroll: measure both ends. A label
  // wider than its button doesn't fit either.
  const overflows = () => {
    const h = measuring ? home.getBoundingClientRect().height : document.documentElement.scrollHeight;
    if (h > innerHeight + 1) return true;
    const pad = parseFloat(getComputedStyle(home).paddingTop) || 0;
    if ($('home-title').getBoundingClientRect().top < home.getBoundingClientRect().top + pad - 1) return true;
    return [...home.querySelectorAll('.choice:not([hidden])')].some((c) => {
      const b = c.getBoundingClientRect();
      const l = c.querySelector('.label').getBoundingClientRect();
      return l.left < b.left + 3 || l.right > b.right - 3; // and a little room either side
    });
  };
  const art = () => HOME_ART.some((px) => { box.style.setProperty('--art-max', `${px}px`); return !overflows(); });
  home.classList.remove('tight', 'compact');
  box.style.removeProperty('--art-max');
  link.hidden = true;
  timerTile.hidden = false;
  box.classList.add('five');
  const fits = homeRow.matches || !overflows();
  timerTile.hidden = !fits;
  box.classList.toggle('five', fits);
  pager.set(!fits); // html.paged: home and the routine are two pages
  if (!fits) {
    link.hidden = false;
    const size = () => ROUTINE_ART.some((px) => { link.style.setProperty('--routine-art', `${px}px`); return !overflows(); });
    if (!size()) { home.classList.add('tight'); size(); } // the spacing tightens before the icon goes below its smallest
  }
  if (!art()) { home.classList.add('compact'); art(); }
  if (measuring) { home.classList.remove('measuring'); home.hidden = true; }
}

// The apps: the native metronome and drone go on while the screen is locked
// (and can be stopped from the lock screen or the notification). Coming back,
// catch up with what they did.
function syncNative() {
  if (!useNative) return;
  if (met.metronome?.native && met.metronome.running) met.metronome.poll().then((on) => { if (!on) stopMetronome(); });
  droneUI.syncNative();
}
if (useNative) {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNative(); });
  onNativeStopped(syncNative);
}

const droneSettings = $('drone-settings');
$('drone-settings-btn').addEventListener('click', () => { droneUI.refresh(); droneSettings.showModal(); });

// ---------------------------------------------------------------- keys

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  const t = e.target;
  // Typing in a field (a take's name, the tempo) keeps its keys.
  const typing = (t instanceof HTMLInputElement && t.type !== 'checkbox') || t instanceof HTMLTextAreaElement || t?.isContentEditable;
  if (e.key === 'Escape' && screen !== 'home') { location.hash = ''; return; }
  if (screen === 'metronome') {
    if (e.key === ' ' && !typing && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); $('met-toggle').click(); }
    if (!typing && (e.key === 'ArrowUp' || e.key === 'ArrowRight')) { e.preventDefault(); setBpm(settings.bpm + (e.shiftKey ? 10 : 1)); }
    if (!typing && (e.key === 'ArrowDown' || e.key === 'ArrowLeft')) { e.preventDefault(); setBpm(settings.bpm - (e.shiftKey ? 10 : 1)); }
  }
  if (screen === 'record' && e.key === ' ' && !(e.target instanceof HTMLButtonElement) && !typing) {
    e.preventDefault();
    $('rec-toggle').click();
  }
  if (screen === 'drone' && !typing && !(e.target instanceof HTMLSelectElement)) {
    if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); droneUI.toggle(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); droneUI.step(1); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); droneUI.step(-1); }
  }
  if (screen === 'tuner' && e.key === ' ' && !typing && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLSelectElement)) {
    e.preventDefault();
    tuner.playReference();
  }
});

// ---------------------------------------------------------------- start

function frame() {
  if (screen === 'metronome') animateMetronome();
  if (screen === 'record') animateRecorder();
  if (screen === 'tuner') animateTuner();
  requestAnimationFrame(frame);
}

setBpm(settings.bpm);
renderBeats();
configureRecorder();
loadTakes();
// The saved pendulum delay; Audio check sets the speaker (where the browser allows).
setExtraDelay(settings.syncMs / 1000);
if (settings.speaker !== 'default') setSpeaker(settings.speaker);

for (const b of document.querySelectorAll('.open-audio-check')) {
  b.addEventListener('click', () => {
    b.closest('dialog')?.close();
    openAudioCheck({
      settings,
      save: persist,
      recorder: () => rec.recorder,
      // The metronome's section: open when Audio check came from the metronome.
      metronome: {
        open: screen === 'metronome',
        usable: visualsShown(),
        syncMs: () => settings.syncMs,
        setSync,
        openSync: () => {
          $('audio-check').close();
          if (screen !== 'metronome') location.hash = '#metronome';
          requestAnimationFrame(openSync);
        },
      },
      onMic: chooseMic,
      onSpeaker: async (id) => {
        settings.speaker = id;
        persist();
        const media = await setSpeaker(id);
        if (existingAudio()) await setContextSpeaker(id);
        return media;
      },
    });
  });
}

// ---------------------------------------------------------------- feedback

/**
 * What Send feedback can include (shown in the form, and left out if they
 * untick it): where it's running, and the Audio check's readings, which are
 * what make "the recording didn't work" fixable.
 */
function feedbackDetails() {
  const ctx = existingAudio();
  const p = diag.lastPlayback;
  const lines = [
    `Running: ${isApp() ? `${platform()} app, ${isPro() ? 'Pro' : 'free'}` : 'website'}; open on: ${screen}; theme: ${settings.theme}`,
    `Microphone: permission ${micPermission()}, recorder ${rec.recorder?.state ?? 'off'}, ${freesMicForPlayback() ? 'closed for playback' : 'kept open for playback'}`
      + (diag.firstRequestMs != null ? `, first request ${diag.firstRequestMs} ms` : ''),
    `Audio: ${ctx ? `${ctx.state}, ${ctx.sampleRate} Hz, output latency ${Math.round((ctx.outputLatency || 0) * 1000)} ms` : 'not started'}`
      + `${navigator.audioSession ? `; session ${navigator.audioSession.type}/${navigator.audioSession.state ?? '?'}` : ''}${useNative ? '; native metronome and drone' : ''}`,
    `Chosen: mic ${settings.mic === 'auto' ? 'automatic' : 'picked'}, speaker ${settings.speaker === 'default' ? 'default' : 'picked'}, sync ${settings.syncMs} ms`,
    `Metronome: ${settings.bpm} BPM, ${settings.meter}, ${settings.sound}; drone: ${settings.droneVoice}; tuner: ${settings.tuning}, A4 ${settings.a4}`,
  ];
  if (p) {
    lines.push(`Last playback: ${Math.round((Date.now() - p.at) / 1000)} s ago via ${p.via}, mic ${p.micFreed ? 'freed' : p.micHeld ? 'held' : 'off'}, waited ${p.waitedMs} ms, engine ${p.engine}`);
  }
  return lines.join('\n');
}
setupFeedback({ details: feedbackDetails, debug: (max) => debugText(max) });

// The debug log (debuglog.js): what the app is doing, each time it looks.
debugState('app', () => {
  const ctx = existingAudio();
  const track = rec.recorder?.stream?.getAudioTracks()[0];
  const el = playerElement();
  return {
    screen,
    ctx: ctx ? { state: ctx.state, rate: ctx.sampleRate, outputLatency: ctx.outputLatency ?? null, baseLatency: ctx.baseLatency ?? null, sink: ctx.sinkId === undefined ? null : ctx.sinkId ? 'picked' : 'default' } : null,
    mic: { recorder: rec.recorder?.state ?? 'off', held: !!rec.recorder?.holdsMic, open: !!rec.recorder?.micOpen, enabled: track ? track.enabled : null, muted: track ? track.muted : null, ready: track ? track.readyState : null, label: track?.label ?? null, ...freeReason() },
    playing: { metronome: !!met.metronome?.running, drone: !!droneUI.playing, take: !!rec.playing?.handle, element: el.src ? { paused: el.paused, volume: el.volume, muted: el.muted } : null },
    volumes: { metronome: settings.volume, drone: settings.droneVolume, takes: settings.playVolume },
    native: useNative,
  };
});
startDebugLog({ app: isApp() ? `${platform()} app` : 'website', settings: { mic: settings.mic === 'auto' ? 'auto' : 'picked', speaker: settings.speaker === 'default' ? 'default' : 'picked', recordDuringPlayback: recordDuringPlayback(), volume: settings.volume, droneVolume: settings.droneVolume, playVolume: settings.playVolume } });
// Audio check's Export debug data: the whole log as a JSON file, shared or downloaded like a take.
$('export-debug').addEventListener('click', async () => {
  dlog('export');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const file = new File([debugJson({ details: feedbackDetails() })], `musicpractice-debug-${stamp}.json`, { type: 'application/json' });
  const how = await saveFile(file, file.name);
  if (how === 'failed' || how === 'needsTap') note(TEXT.audioCheck.exportFailed);
});

// Pro (the apps only): features unlock or lock as it turns on or off.
function proChanged() {
  document.documentElement.classList.toggle('locked', !isPro());
  applyTheme();
  syncThemeControls();
  renderTakes();
  if (screen === 'drone' && !isPro()) location.hash = '';
}
onProChange(proChanged);
document.documentElement.classList.toggle('locked', !isPro());
initPro();

// Android's back button: close a sheet, then go back to the home screen, then leave.
onBackButton(() => {
  const open = [...document.querySelectorAll('dialog[open]')].pop();
  if (open) open.close();
  else if (screen !== 'home') location.hash = '';
  else exitApp();
});

applyTheme();
route();
requestAnimationFrame(frame);
