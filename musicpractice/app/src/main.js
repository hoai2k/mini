// Music Practice: the home screen, the metronome, the practice recorder and the tuner.

import { audio, existingAudio, freshAudio, replaceAudio, audioWasAway, markStale, unlock, setSession, heardNow, keepAwake, setExtraDelay, setContextSpeaker } from './audio.js';
import { playSamples, primeFromTap, outputSettled, setSpeaker } from './player.js';
import { encodeMp3 } from './mp3.js';
import { openAudioCheck, renderMicTip } from './audiocheck.js';
import { diag, isWebKit, isIOS, micPermission } from './devices.js';
import { Metronome, pendulumAngle } from './metronome.js';
import { Recorder, freesMicForPlayback } from './recorder.js';
import { setupTuner } from './tunerui.js';
import { setupHomeOrder } from './homeorder.js';

// "Record during playback" is parked: its setting is hidden and ignored, and
// its code is kept to fix and re-enable later. Recording and playback are
// separate: the recorder listens, records, plays the take back, listens again.
const RECORD_DURING_PLAYBACK = false;
const recordDuringPlayback = () => RECORD_DURING_PLAYBACK && settings.recordDuringPlayback;
import { Waveform, drawThumb } from './waveform.js';
import * as store from './takes.js';
import { load, save, clampBpm, METERS, SOUNDS, THEMES, meterOf, beatStrengths, BPM_MIN, BPM_MAX } from './settings.js';
import { applyArt, alignPendulum, swingOf } from './art.js';

const $ = (id) => document.getElementById(id);
const settings = load();
const persist = () => save(settings);

// ---------------------------------------------------------------- theme

/** Switch the whole app's look: colours and type (styles.css) and art. */
function applyTheme() {
  const theme = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
  document.documentElement.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.color);
  const fonts = `https://fonts.googleapis.com/css2?${theme.fonts}&display=swap`;
  const link = $('theme-fonts');
  if (link && link.getAttribute('href') !== fonts) link.setAttribute('href', fonts);
  applyArt(theme.id, () => alignPendulum($('metronome-case'), $('pendulum')));
  // Waveform colours come from the theme.
  if (wave) wave.dirty = true;
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
      if (listeningActive() && ctx === existingAudio() && ctx.state !== 'running') { needsTap = true; showState(); showTunerState(); }
    }, 700);
  }
};
for (const type of ['pointerdown', 'touchend', 'click', 'keydown']) {
  document.addEventListener(type, wake, { capture: true });
}

// ---------------------------------------------------------------- screens

const SCREENS = ['home', 'metronome', 'record', 'tuner'];
const TITLES = { metronome: 'Metronome', record: 'Playback Recorder', tuner: 'Tuner' };
let screen = 'home';
function route() {
  const want = location.hash.replace('#', '') || 'home';
  const next = SCREENS.includes(want) ? want : 'home';
  if (next === screen && document.getElementById(next).hidden === false) return;
  leave(screen);
  for (const id of SCREENS) $(id).hidden = id !== next;
  screen = next;
  enter(next);
}

const homeOrder = setupHomeOrder({
  container: $('choices'),
  done: $('home-done'),
  order: settings.homeOrder,
  onChange: (order) => { settings.homeOrder = order; persist(); },
});

function leave(name) {
  if (name === 'home') homeOrder.stop();
  if (name === 'metronome') stopMetronome();
  if (name === 'record') stopRecorder();
  if (name === 'tuner') stopTuner();
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
}

function enter(name) {
  if (name === 'metronome') {
    // The metronome doesn't use the mic. A mic the recorder holds (switched
    // off, so permission isn't asked again) is kept; Safari's session is left
    // alone while it is held, since switching could cut it off.
    if (!recorder?.holdsMic) setSession('playback');
    $('met-toggle').focus({ preventScroll: true });
  }
  if (name === 'record') startRecorder();
  if (name === 'tuner') startTuner();
  document.title = TITLES[name] ? `${TITLES[name]} · Music Practice` : 'Music Practice';
}

window.addEventListener('hashchange', route);

// ---------------------------------------------------------------- shared UI

/** A row of single-choice chips bound to one setting. */
function chips(container, options, get, set) {
  container.setAttribute('role', 'radiogroup');
  const buttons = options.map((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.textContent = o.label || o.id;
    b.addEventListener('click', () => { set(o.id); sync(); });
    container.append(b);
    return [o.id, b];
  });
  const sync = () => {
    for (const [id, b] of buttons) {
      b.setAttribute('aria-checked', String(get() === id));
      b.tabIndex = get() === id ? 0 : -1;
    }
  };
  // Arrow keys move between chips, as in a radio group.
  container.addEventListener('keydown', (e) => {
    const i = buttons.findIndex(([, b]) => b === document.activeElement);
    if (i < 0) return;
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const [id, b] = buttons[(i + d + buttons.length) % buttons.length];
    set(id);
    sync();
    b.focus();
  });
  sync();
  return sync;
}

// Close a settings sheet by tapping outside it.
for (const d of document.querySelectorAll('dialog.sheet')) {
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
}

// ---------------------------------------------------------------- metronome

let metronome = null;
const pendulum = $('pendulum');
const bpmInput = $('bpm-input');
const bpmSlider = $('bpm-slider');

function marking(bpm) {
  if (bpm < 60) return 'Largo';
  if (bpm < 66) return 'Larghetto';
  if (bpm < 76) return 'Adagio';
  if (bpm < 108) return 'Andante';
  if (bpm < 120) return 'Moderato';
  if (bpm < 156) return 'Allegro';
  if (bpm < 176) return 'Vivace';
  if (bpm < 200) return 'Presto';
  return 'Prestissimo';
}

function setBpm(v, { fromInput = false } = {}) {
  settings.bpm = clampBpm(v);
  if (!fromInput || document.activeElement !== bpmInput) bpmInput.value = settings.bpm;
  bpmSlider.value = settings.bpm;
  $('marking').textContent = marking(settings.bpm);
  metronome?.configure(settings);
  persist();
}

function renderBeats() {
  const list = $('beats');
  const strengths = beatStrengths(settings.meter, settings.accent);
  list.replaceChildren(...strengths.map((s) => {
    const li = document.createElement('li');
    if (s === 2) li.className = 'strong';
    if (s === 1) li.className = 'mid';
    return li;
  }));
  const m = meterOf(settings.meter);
  const name = m.beats === 1 ? 'No bars' : m.id;
  $('meter-note').textContent = m.beats === 1 ? name : `${name} · ${settings.accent ? 'strong beat on 1' : 'all beats even'}`;
}

function metronomeConfigured() {
  renderBeats();
  metronome?.configure(settings);
  persist();
}

function startMetronome() {
  // A fresh context if the old one may be stuck on another output (this is a
  // tap, so the new one may start).
  const ctx = freshAudio();
  unlock();
  if (!metronome || metronome.ctx !== ctx) {
    metronome = new Metronome(ctx);
    if (settings.speaker !== 'default') setContextSpeaker(settings.speaker);
  }
  metronome.configure(settings);
  metronome.start();
  pendulum.classList.remove('resting');
  $('met-toggle').setAttribute('aria-pressed', 'true');
  $('met-toggle-label').textContent = 'Stop';
  keepAwake(true);
}

function stopMetronome() {
  if (metronome?.running) metronome.stop();
  pendulum.classList.add('resting');
  pendulum.style.transform = 'rotate(0deg)';
  for (const li of $('beats').children) li.classList.remove('on');
  $('met-toggle').setAttribute('aria-pressed', 'false');
  $('met-toggle-label').textContent = 'Start';
  keepAwake(false);
}

$('met-toggle').addEventListener('click', () => (metronome?.running ? stopMetronome() : startMetronome()));

bpmSlider.min = BPM_MIN;
bpmSlider.max = BPM_MAX;
bpmSlider.addEventListener('input', () => setBpm(bpmSlider.value));
bpmInput.addEventListener('input', () => {
  const n = Number(bpmInput.value);
  if (bpmInput.value !== '' && n >= BPM_MIN && n <= BPM_MAX) setBpm(n, { fromInput: true });
});
bpmInput.addEventListener('change', () => setBpm(bpmInput.value === '' ? settings.bpm : bpmInput.value));
bpmInput.addEventListener('blur', () => setBpm(bpmInput.value === '' ? settings.bpm : bpmInput.value));
bpmInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { setBpm(bpmInput.value || settings.bpm); bpmInput.blur(); }
  if (e.key === 'Escape') { bpmInput.value = settings.bpm; bpmInput.blur(); e.stopPropagation(); }
});
bpmInput.addEventListener('focus', () => bpmInput.select());

// − and +: one beat per tap, faster while held.
for (const [id, d] of [['bpm-down', -1], ['bpm-up', 1]]) {
  const b = $(id);
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  const repeat = (delay, n) => {
    timer = setTimeout(() => { setBpm(settings.bpm + d * (n > 12 ? 5 : 1)); repeat(n > 4 ? 60 : 120, n + 1); }, delay);
  };
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); setBpm(settings.bpm + d); repeat(450, 0); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
  b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBpm(settings.bpm + d); } });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Theme: a dropdown in each settings sheet, and preview tiles in the app
// settings on the home screen. Each tile is drawn in its own theme.
const themeSelects = [...document.querySelectorAll('.theme-select')];
const themeTiles = THEMES.map((t) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'theme-tile';
  b.dataset.theme = t.id;
  b.setAttribute('role', 'radio');
  b.innerHTML = `<span class="tile-name"></span><span class="tile-swatches" aria-hidden="true"><i></i><i></i><i></i></span>`;
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
  for (const sel of themeSelects) sel.value = settings.theme;
  for (const b of themeTiles) {
    const on = b.dataset.theme === settings.theme;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
}

function setTheme(id) {
  settings.theme = id;
  settings.themeChosen = true;
  persist();
  applyTheme();
  syncThemeControls();
}

for (const sel of themeSelects) {
  sel.replaceChildren(...THEMES.map((t) => new Option(t.label, t.id)));
  sel.addEventListener('change', () => setTheme(sel.value));
}
syncThemeControls();

const appSettings = $('app-settings');
$('app-settings-btn').addEventListener('click', () => {
  // Load every theme's fonts so the tiles show them (only when this opens).
  if (!$('all-theme-fonts')) {
    const link = document.createElement('link');
    link.id = 'all-theme-fonts';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${THEMES.map((t) => t.fonts).join('&')}&display=swap`;
    document.head.append(link);
  }
  appSettings.showModal();
});

const metSettings = $('met-settings');
$('met-settings-btn').addEventListener('click', () => metSettings.showModal());
const meterSelect = $('meter');
meterSelect.replaceChildren(...METERS.map((m) => new Option(m.beats === 1 ? 'No bars' : m.id, m.id)));
meterSelect.value = settings.meter;
meterSelect.addEventListener('change', () => { settings.meter = meterSelect.value; metronomeConfigured(); });
chips($('sound-chips'), SOUNDS, () => settings.sound, (v) => {
  settings.sound = v;
  metronomeConfigured();
  // Let them hear it.
  if (!metronome?.running) {
    const ctx = audio();
    unlock();
    if (!metronome || metronome.ctx !== ctx) metronome = new Metronome(ctx);
    metronome.configure(settings);
    metronome.voice(ctx.currentTime + 0.02, 2);
  }
});
$('accent').checked = settings.accent;
$('accent').addEventListener('change', () => { settings.accent = $('accent').checked; metronomeConfigured(); });
$('met-volume').value = settings.volume;
$('met-volume').addEventListener('input', () => { settings.volume = Number($('met-volume').value); metronomeConfigured(); });

function animateMetronome() {
  if (!metronome?.running) return;
  const now = heardNow();
  const beat = metronome.beatAt(now);
  pendulum.style.transform = `rotate(${pendulumAngle(beat, now, metronome.period, swingOf(pendulum)).toFixed(2)}deg)`;
  const dots = $('beats').children;
  for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('on', !!beat && beat.beat === i);
}

// ---------------------------------------------------------------- recorder

let recorder = null;
let wave = null;
let takes = []; // newest first
let playing = null; // { take, auto, handle: { ended, progress(), stop() } once sound starts }
let recError = '';

const STATUS = {
  off: ['Off', () => recError || 'Tap the button to start listening.'],
  waiting: ['Listening…', () => 'Start playing whenever you\'re ready.'],
  recording: ['Recording', () => `Stop playing for ${fmtSec(settings.silenceSec)} s to finish.`],
  playing: ['Playing back', () => 'Listening starts again when it ends.'],
  paused: ['Paused', () => 'Listening starts again when you\'re done here.'],
  tuning: ['Off', () => ''], // the tuner has the mic (never shown: the screens are separate)
};

const fmtSec = (s) => (Number.isInteger(s) ? String(s) : s.toFixed(1));
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function fmtWhen(ms) {
  const d = new Date(ms);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return time;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

function showState() {
  const state = recorder?.state || 'off';
  const btn = $('rec-toggle');
  btn.dataset.state = state;
  btn.setAttribute('aria-pressed', String(state !== 'off'));
  $('rec-toggle-label').textContent = state === 'off' ? 'Turn recording on' : 'Turn recording off';
  const [title, hint] = STATUS[state];
  $('rec-state').textContent = state === 'recording' ? `${title} ${fmtDur(recorder.recordingSec)}` : title;
  let h = hint();
  if (state === 'waiting' && needsTap) h = 'Tap anywhere to start listening again.';
  else if (state === 'waiting' && audio().state !== 'running') h = 'Tap anywhere to let the app hear you.';
  $('rec-hint').textContent = h;
  $('rec-hint').classList.toggle('error', state === 'off' && !!recError);
  // Recording during playback: the take plays while the mic keeps listening.
  if (playing?.auto && state === 'waiting') {
    $('rec-state').textContent = 'Playing back';
    $('rec-hint').textContent = 'Start playing any time to begin a new take.';
  }
  $('rec-skip').hidden = !(playing && playing.auto);
}

function configureRecorder() {
  if (recorder) {
    recorder.configure(settings);
    recorder.echoCancel = recordDuringPlayback();
  }
  for (const el of document.querySelectorAll('.silence-sec')) el.textContent = fmtSec(settings.silenceSec);
  persist();
  showState();
}

/**
 * The one Recorder, shared by the recorder and the tuner, so the mic one
 * grants is the mic the other uses and permission is never asked twice.
 */
function ensureRecorder() {
  const ctx = audio();
  if (!wave) wave = new Waveform($('wave'));
  // A new recorder when the context was replaced (the old one is off by then).
  if (!recorder || recorder.ctx !== ctx) {
    const old = recorder;
    recorder = new Recorder(ctx);
    // Hand over a mic the old recorder still holds, so there is no new prompt.
    if (old?.stream) { recorder.keepStream(old.stream); old.stream = null; }
    recorder.addEventListener('state', () => {
      interruptPlayback();
      showState();
      showTunerState();
      keepAwake(recorder.state !== 'off');
    });
    recorder.addEventListener('chunk', (e) => {
      recoverTries = 0;
      if (needsTap && existingAudio()?.state === 'running') { needsTap = false; showState(); showTunerState(); }
      if (e.detail.state === 'tuning') tuner.receive(e.detail.data, recorder.ctx.sampleRate);
      else wave.push(e.detail.data, recorder.ctx.sampleRate, e.detail.state);
    });
    recorder.addEventListener('take', (e) => onTake(e.detail));
    recorder.addEventListener('miclost', () => { if (document.visibilityState === 'visible') recoverMic(); });
  }
  recorder.micChoice = settings.mic;
  return recorder;
}

async function startRecorder() {
  setSession('auto');
  unlock();
  ensureRecorder();
  recorder.configure(settings);
  recorder.echoCancel = recordDuringPlayback();
  recorder.micChoice = settings.mic;
  recError = '';
  try {
    await recorder.on();
  } catch (err) {
    recError = micError(err);
  }
  if (recorder.micOpen) markStale();
  showMicTip();
  showState();
}

/**
 * iPhone only: once the recorder has the mic, if it isn't set to Allow (so the
 * app has to keep it open and takes stay off Bluetooth), say so and how to
 * fix it. Its title folds it to one line (remembered); it only goes away for
 * good once the mic is allowed.
 */
function showMicTip() {
  const tip = $('mic-tip');
  const show = isIOS() && !!recorder?.holdsMic && !freesMicForPlayback() && micPermission() !== 'denied';
  if (show && !tip.firstChild) {
    renderMicTip(tip, {
      collapsed: settings.micTipCollapsed,
      onToggle: (c) => { settings.micTipCollapsed = c; persist(); },
    });
  }
  tip.hidden = !show;
}

function micError(err) {
  return err?.name === 'NotAllowedError'
    ? 'Microphone access was refused. Allow it in your browser\'s site settings, then tap the button.'
    : err?.message === 'unsupported'
      ? 'This browser can\'t use the microphone here. Try Safari or Chrome over https.'
      : 'Couldn\'t open the microphone. Check that no other app is using it, then tap the button.';
}

/** Listen again after playback or a pause, reopening the mic if it was closed. */
async function resumeListening() {
  if (!recorder || recorder.state === 'off') return;
  setSession('auto');
  unlock(); // the audio engine may have been suspended for playback
  recError = '';
  try {
    await recorder.restore();
  } catch (err) {
    recError = micError(err);
  }
  showState();
}

/**
 * Reconnect the mic if it stopped delivering while listening or recording.
 * The held mic is reused; it is asked for again only if it is dead.
 */
let reopening = false;
let recoverTries = 0; // reset whenever the mic delivers
function recoverMic(force = false) {
  if (!recorder || reopening || !recorder.micOpen) return;
  if (!['waiting', 'recording', 'tuning'].includes(recorder.state)) return;
  if (!force && recorder.micAlive()) return;
  // First reconnect the mic we hold; if that stays silent, it is dead even
  // if the browser says it's fine: ask for it again. If even that gets
  // nothing, the engine is at fault, and the next tap replaces it.
  recoverTries++;
  if (recoverTries > 2) {
    if (!needsTap) { needsTap = true; showState(); showTunerState(); }
    return;
  }
  reopening = true;
  recorder.reopen({ fresh: recoverTries > 1 })
    .catch((err) => { recError = micError(err); tunerError = recError.replace('tap the button', 'tap Try again'); recorder.off(); })
    .finally(() => { reopening = false; showState(); showTunerState(); });
}

/** Is the mic in use (listening, recording or tuning)? */
function listeningActive() {
  return !!recorder && ['waiting', 'recording', 'tuning'].includes(recorder.state);
}

/** Does listening need a new audio engine (only a tap can start one)? */
let needsTap = false;
function engineStuck() {
  const c = existingAudio();
  if (!c) return false;
  return needsTap || (c.state !== 'running' && (c.state === 'interrupted' || audioWasAway()));
}

/** Is listening on but getting nothing (a stuck engine or a silent mic)? */
function listeningStuck() {
  if (!listeningActive()) return false;
  if (engineStuck() || existingAudio()?.state !== 'running') return true;
  return recorder.micOpen && recorder.silentFor > 1.5;
}

/**
 * Start listening (or tuning) again from scratch: a new audio engine, and the
 * mic reconnected (asked for again only if it turns out to be dead). Call it
 * from a tap, which a new engine needs on phones.
 */
let restartedAt = -1e9;
function restartListening() {
  restartedAt = performance.now();
  needsTap = false;
  recoverTries = 0;
  const tuning = recorder?.state === 'tuning';
  stopPlayback({ resume: false });
  recorder?.off();
  replaceAudio();
  primeFromTap();
  if (tuning) startTuner();
  else startRecorder();
}

// Coming back to the app: phones suspend sound, pause media and cut the mic
// while it is away. Pick everything up again where it was; if the engine
// won't start again by itself, the next tap starts a new one.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  markStale(); // the output may have changed while away; the next Start gets a fresh context
  const c = existingAudio();
  if (c && c.state !== 'running' && c.state !== 'closed') c.resume().catch(() => { /* the next tap resumes it */ });
  if (playing?.handle?.isPaused?.()) playing.handle.resume().catch(() => stopPlayback());
  recoverMic();
  showState();
  showTunerState();
});

// Starting a new take while a take plays back (record during playback) stops the playback.
function interruptPlayback() {
  if (playing?.auto && recorder?.state === 'recording') stopPlayback({ resume: false });
}

function stopRecorder() {
  stopPlayback({ resume: false });
  recorder?.off();
  hideToast(true);
  showState();
}

$('rec-toggle').addEventListener('click', () => {
  if (performance.now() - restartedAt < 1000) return; // this tap already started listening again
  if (!recorder || recorder.state === 'off') {
    // After a trip to another app, start on a new engine (this is a tap).
    if (audioWasAway() || existingAudio()?.state !== 'running') replaceAudio();
    startRecorder();
  } else if (listeningStuck()) {
    restartListening(); // it says it's listening but hears nothing: start again rather than stop
  } else {
    stopRecorder();
  }
});
$('rec-skip').addEventListener('click', () => stopPlayback());

async function onTake({ samples, sampleRate, playBack }) {
  const take = { id: 0, created: Date.now(), sampleRate, samples };
  takes.unshift(take);
  renderTakes();
  take.id = await store.add(samples, sampleRate, take.created);
  if (playBack && settings.autoPlay && recorder.state !== 'off' && recorder.state !== 'paused') {
    play(take, { auto: true });
  }
}

/**
 * Play a take. Playing from the list pauses listening. Unless "Record during
 * playback" is on, the mic is closed first and the take waits for the phone
 * to move sound back to its normal output (a Bluetooth speaker, say), since
 * an open mic puts phones in call mode, quieter and on the phone's own
 * speaker; listening resumes when the take ends. With "Record during
 * playback" on, the mic stays open and playing again starts the next take.
 */
let playToken = 0;
async function play(take, { auto = false } = {}) {
  stopPlayback({ resume: false });
  const token = ++playToken;
  const hadMic = !!recorder?.holdsMic;
  if (recorder && recorder.state !== 'off') {
    if (!auto) recorder.pause();
    else if (!recordDuringPlayback()) recorder.hold();
    if (!recordDuringPlayback() && recorder.micOpen) recorder.release();
  }
  const freed = hadMic && !recorder?.holdsMic; // the mic was just closed
  // Playback mode only when no mic is held: switching while Safari holds one
  // could cut it off and interrupt the record-play-record loop.
  if (!recorder?.holdsMic) setSession('playback');
  playing = { take, auto, handle: null };
  wave?.showTake(take.samples);
  renderTakes();
  showState();
  // With the mic freed, also suspend the audio engine: it ran the mic, and a
  // running one can keep iOS in call mode (WebKit bugs 198545, 218012); the
  // take plays through an audio element, not Web Audio. Then give the phone
  // a moment to move sound back to its normal output (a Bluetooth speaker).
  const engine = existingAudio();
  if (freed && engine?.state === 'running') {
    try { await engine.suspend(); } catch { /* keep going */ }
  }
  const waitStart = performance.now();
  // iOS stays in call mode for several hundred ms after the mic closes.
  if (freed) await outputSettled(isWebKit() ? 1000 : 700);
  if (token !== playToken) return; // stopped or replaced while waiting
  // What happened, for Audio check (to tell why a take didn't reach Bluetooth).
  const record = {
    at: Date.now(),
    micFreed: freed,
    micHeld: !!recorder?.holdsMic,
    waitedMs: Math.round(performance.now() - waitStart),
    session: navigator.audioSession?.type ?? null,
    sessionState: navigator.audioSession?.state ?? null,
    engine: existingAudio()?.state ?? 'none',
    via: 'audio element',
  };
  diag.lastPlayback = record;
  let handle;
  try {
    handle = await playSamples(take.samples, take.sampleRate);
  } catch {
    handle = playWithWebAudio(take); // the browser refused the media element
    record.via = 'Web Audio (the audio element was refused)';
  }
  if (token !== playToken) { handle.stop(); return; }
  playing.handle = handle;
  handle.ended.then(() => { if (token === playToken) stopPlayback(); });
}

/** The old way: Web Audio. Used only if the media element is refused. */
function playWithWebAudio(take) {
  const ctx = audio(); // not freshAudio(): the recorder may still be using it
  unlock();
  const buf = ctx.createBuffer(1, take.samples.length, take.sampleRate);
  buf.copyToChannel(take.samples, 0);
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.connect(ctx.destination);
  const startedAt = ctx.currentTime + 0.03;
  let finish;
  const ended = new Promise((resolve) => { finish = resolve; });
  source.onended = () => finish();
  source.start(startedAt);
  return {
    ended,
    progress: () => Math.min(1, Math.max(0, (ctx.currentTime - startedAt) / buf.duration)),
    stop: () => { source.onended = null; try { source.stop(); } catch { /* ended */ } finish(); },
  };
}

function stopPlayback({ resume = true } = {}) {
  if (!playing) return;
  const { handle } = playing;
  playing = null;
  playToken++;
  handle?.stop();
  wave?.showLive();
  if (resume && recorder && (recorder.state === 'playing' || recorder.state === 'paused') && toastTimer === null) resumeListening();
  renderTakes();
  showState();
}

/**
 * Rename a take: its title turns into a text field. Enter or leaving the
 * field keeps the name, Escape cancels, and an empty name goes back to the
 * default. Listening pauses while typing, like any use of the list.
 */
function renameTake(take, li) {
  const title = li.querySelector('.title');
  if (!title) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'title-input';
  input.maxLength = 60;
  input.value = take.name || '';
  input.placeholder = li.dataset.label;
  input.setAttribute('aria-label', 'Take name');
  input.enterKeyHint = 'done';
  const pausedHere = recorder && (recorder.state === 'waiting' || recorder.state === 'recording');
  if (pausedHere) recorder.pause();
  title.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = async (keep) => {
    if (done) return;
    done = true;
    const name = input.value.trim().slice(0, 60);
    input.replaceWith(title);
    if (keep && name !== (take.name || '')) {
      take.name = name;
      renderTakes();
      await store.rename(take.id, name);
    }
    if (pausedHere && !playing && toastTimer === null && recorder?.state === 'paused') resumeListening();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
}

/**
 * Save a take as an MP3. On phones it opens the share sheet (Save to Files,
 * AirDrop, Messages, Voice Memos…), the way iPhone saves files from the web;
 * elsewhere, or if sharing isn't offered, it downloads. The MP3 is made once
 * and kept with the take. iPhone only opens the share sheet straight from a
 * tap; if making a long take's MP3 used that up, the button says it's ready
 * and the next tap shares it at once.
 */
async function saveTake(take, label, button) {
  if (button.classList.contains('busy')) return;
  button.classList.remove('ready');
  const base = (label || 'Take').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Take';
  if (!take.mp3) {
    button.classList.add('busy');
    button.setAttribute('aria-label', 'Making the MP3…');
    try {
      take.mp3 = await encodeMp3(take.samples, take.sampleRate);
    } catch {
      note('Couldn\'t make the MP3. Try again.');
      return;
    } finally {
      button.classList.remove('busy');
      renderTakes();
    }
  }
  const file = new File([take.mp3], `${base}.mp3`, { type: 'audio/mpeg' });
  const phone = isIOS() || /Android/i.test(navigator.userAgent);
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: base });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // closed the share sheet
      if (err?.name === 'NotAllowedError') {
        button.classList.add('ready');
        button.setAttribute('aria-label', 'MP3 ready: tap to save');
        note('MP3 ready: tap save again.');
        return;
      }
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** A short message at the bottom of the screen. */
let noteTimer = 0;
function note(text) {
  const el = $('note');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

function renderTakes() {
  const list = $('takes');
  $('takes-empty').hidden = takes.length > 0;
  $('takes-count').textContent = takes.length ? `(${takes.length})` : '';
  const rows = takes.map((take, i) => {
    let li = list.querySelector(`[data-key="${take.created}"]`);
    if (!li) {
      li = document.createElement('li');
      li.className = 'take';
      li.dataset.key = take.created;
      li.innerHTML = `
        <button class="play" type="button"><svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
        <div class="meta"><div class="name"><button type="button" class="title"></button><span></span></div><canvas aria-hidden="true"></canvas></div>
        <button class="save" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg></button>
        <button class="del" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
        <span class="bar-progress" aria-hidden="true"></span>`;
      li.querySelector('.play').addEventListener('click', () => (playing?.take === take ? stopPlayback() : play(take)));
      li.querySelector('.del').addEventListener('click', () => removeTake(take));
      li.querySelector('.save').addEventListener('click', (e) => saveTake(take, li.dataset.label, e.currentTarget));
      li.querySelector('.title').addEventListener('click', () => renameTake(take, li));
      const canvas = li.querySelector('canvas');
      canvas.redraw = () => drawThumb(canvas, take.samples);
      requestAnimationFrame(canvas.redraw);
    }
    const n = takes.length - i;
    const dur = take.samples.length / take.sampleRate;
    const title = li.querySelector('.title');
    const len = li.querySelector('.name > span');
    const label = take.name || `Take ${n} · ${fmtWhen(take.created)}`;
    li.dataset.label = label;
    if (title) {
      title.textContent = label;
      title.setAttribute('aria-label', `${label}. Tap to rename`);
    }
    len.textContent = fmtDur(Math.max(1, Math.round(dur)));
    li.querySelector('.play').setAttribute('aria-label', `${playing?.take === take ? 'Stop' : 'Play'} take ${n}`);
    li.querySelector('.del').setAttribute('aria-label', `Delete take ${n}`);
    const save = li.querySelector('.save');
    if (!save.classList.contains('busy') && !save.classList.contains('ready')) save.setAttribute('aria-label', `Save take ${n} as an MP3`);
    li.classList.toggle('playing', playing?.take === take);
    if (playing?.take !== take) li.querySelector('.bar-progress').style.width = '0';
    return li;
  });
  list.replaceChildren(...rows);
}

// Deleting: the take goes at once, with a few seconds to undo. Listening is
// paused while the list is in use.
let toastTimer = null;
let lastDeleted = null;

function removeTake(take) {
  if (playing?.take === take) stopPlayback({ resume: false });
  if (recorder && recorder.state !== 'off') recorder.pause();
  const index = takes.indexOf(take);
  takes.splice(index, 1);
  if (lastDeleted) store.remove(lastDeleted.take.id);
  lastDeleted = { take, index };
  renderTakes();
  $('toast-text').textContent = 'Take deleted';
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hideToast(), 4000);
  showState();
}

function hideToast(final = false) {
  clearTimeout(toastTimer);
  toastTimer = null;
  $('toast').hidden = true;
  if (lastDeleted) store.remove(lastDeleted.take.id);
  lastDeleted = null;
  if (!final && !playing && recorder?.state === 'paused') resumeListening();
}

$('toast-undo').addEventListener('click', () => {
  if (lastDeleted) {
    takes.splice(Math.min(lastDeleted.index, takes.length), 0, lastDeleted.take);
    lastDeleted = null;
    renderTakes();
  }
  hideToast();
});

const recSettings = $('rec-settings');
$('rec-settings-btn').addEventListener('click', () => recSettings.showModal());
$('silence').value = settings.silenceSec;
$('silence').addEventListener('input', () => { settings.silenceSec = Number($('silence').value); configureRecorder(); });
chips($('starton-chips'), [{ id: 'music', label: 'Musical notes' }, { id: 'any', label: 'Any sound' }], () => settings.startOn, (v) => { settings.startOn = v; configureRecorder(); });
chips($('sens-chips'), [{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }], () => settings.sensitivity, (v) => { settings.sensitivity = v; configureRecorder(); });
$('autoplay').checked = settings.autoPlay;
$('autoplay').addEventListener('change', () => { settings.autoPlay = $('autoplay').checked; configureRecorder(); });
$('rec-during').checked = recordDuringPlayback();
$('rec-during').addEventListener('change', () => {
  settings.recordDuringPlayback = $('rec-during').checked;
  configureRecorder();
  // Reopen an idle mic so echo cancellation matches the new choice.
  if (recorder?.state === 'waiting' && recorder.micOpen && !playing) {
    recorder.release();
    resumeListening();
  }
});

function animateRecorder() {
  if (!wave) return;
  if (playing) {
    const p = playing.handle ? playing.handle.progress() : 0;
    wave.setProgress(p);
    const row = $('takes').querySelector(`[data-key="${playing.take.created}"] .bar-progress`);
    if (row) row.style.width = `${(p * 100).toFixed(1)}%`;
  }
  if (recorder?.state === 'recording') $('rec-state').textContent = `Recording ${fmtDur(recorder.recordingSec)}`;
  // A mic that has gone quiet while the sound is running was cut off: reopen it.
  if (recorder?.micOpen && (recorder.state === 'waiting' || recorder.state === 'recording')
      && audio().state === 'running' && recorder.silentFor > 2.5) recoverMic(true);
  wave.draw();
}

// ---------------------------------------------------------------- tuner

const tuner = setupTuner({ settings, persist, chips });
let tunerError = '';

/** Open the mic for the tuner: the same held mic as the recorder's, so no new prompt. */
async function startTuner() {
  setSession('auto');
  unlock();
  ensureRecorder();
  tunerError = '';
  tuner.reset();
  showTunerState();
  try {
    await recorder.tune();
  } catch (err) {
    tunerError = micError(err).replace('tap the button', 'tap Try again');
  }
  if (recorder.micOpen) markStale();
  showTunerState();
}

function stopTuner() {
  tuner.stop();
  if (recorder?.state === 'tuning') recorder.off();
  showTunerState();
}

function showTunerState() {
  if (screen !== 'tuner') return;
  const state = recorder?.state || 'off';
  const status = $('tuner-status');
  let text = '';
  if (state === 'off') text = tunerError || 'The microphone is off.';
  else if (needsTap) text = 'Tap anywhere to start listening again.';
  else if (audio().state !== 'running') text = 'Tap anywhere to let the tuner hear you.';
  status.textContent = text;
  status.hidden = !text;
  status.classList.toggle('error', state === 'off');
  $('tuner-retry').hidden = state !== 'off';
  if (state === 'off') tuner.reset();
}
$('tuner-retry').addEventListener('click', () => {
  if (performance.now() - restartedAt < 1000) return;
  if (audioWasAway() || existingAudio()?.state !== 'running') replaceAudio();
  startTuner();
});

const tunerSettings = $('tuner-settings');
$('tuner-settings-btn').addEventListener('click', () => tunerSettings.showModal());

let tunerHintShown = '';
function animateTuner() {
  tuner.animate();
  if (recorder?.micOpen && recorder.state === 'tuning' && audio().state === 'running' && recorder.silentFor > 2.5) recoverMic(true);
  // The "tap anywhere" note goes once the sound engine runs.
  const running = existingAudio()?.state === 'running';
  if (String(running) !== tunerHintShown) { tunerHintShown = String(running); showTunerState(); }
}

// ---------------------------------------------------------------- keys

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  const t = e.target;
  // Typing in a field (a take's name, the tempo) keeps its keys.
  const typing = (t instanceof HTMLInputElement && t.type !== 'checkbox') || t instanceof HTMLTextAreaElement || t?.isContentEditable;
  if (e.key === 'Escape' && screen === 'home') { homeOrder.stop(); return; }
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
store.list().then((saved) => {
  takes = [...takes, ...saved.filter((s) => !takes.some((t) => t.created === s.created))];
  renderTakes();
});
// Audio check choices: pendulum delay, speaker (where the browser allows).
setExtraDelay(settings.syncMs / 1000);
if (settings.speaker !== 'default') setSpeaker(settings.speaker);

for (const b of document.querySelectorAll('.open-audio-check')) {
  b.addEventListener('click', () => {
    b.closest('dialog')?.close();
    openAudioCheck({
      settings,
      save: persist,
      recorder: () => recorder,
      onMic: async (id) => {
        settings.mic = id;
        persist();
        if (recorder) {
          try { await recorder.chooseMic(id); } catch (err) { recError = micError(err); recorder.off(); }
          showState();
        }
      },
      onSpeaker: async (id) => {
        settings.speaker = id;
        persist();
        const media = await setSpeaker(id);
        if (existingAudio()) await setContextSpeaker(id);
        return media;
      },
      onSync: (ms) => {
        settings.syncMs = ms;
        persist();
        setExtraDelay(ms / 1000);
      },
    });
  });
}

applyTheme();
route();
requestAnimationFrame(frame);
