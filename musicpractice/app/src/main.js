// Music Practice: the home screen, the metronome and the practice recorder.

import { audio, unlock, setSession, heardNow, keepAwake } from './audio.js';
import { Metronome, pendulumAngle } from './metronome.js';
import { Recorder } from './recorder.js';
import { Waveform, drawThumb } from './waveform.js';
import * as store from './takes.js';
import { load, save, clampBpm, METERS, SOUNDS, meterOf, beatStrengths, BPM_MIN, BPM_MAX } from './settings.js';

const $ = (id) => document.getElementById(id);
const settings = load();
const persist = () => save(settings);

// ---------------------------------------------------------------- art

/** Swap a stand-in for its delivered image (see design/image-requests.md). */
async function loadArt() {
  let list = [];
  try { list = await (await fetch('data/asset-list.json')).json(); } catch { return; }
  for (const a of list) {
    if (a.status === 'requested') continue;
    for (const el of document.querySelectorAll(`[data-asset="${a.id}"]`)) {
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.onload = () => el.replaceChildren(img);
      img.src = a.file;
    }
  }
}

// Browsers only allow sound to start from a tap or key press.
const wake = () => { unlock(); };
document.addEventListener('pointerdown', wake, { capture: true });
document.addEventListener('keydown', wake, { capture: true });

// ---------------------------------------------------------------- screens

let screen = 'home';
function route() {
  const want = location.hash.replace('#', '') || 'home';
  const next = ['home', 'metronome', 'record'].includes(want) ? want : 'home';
  if (next === screen && document.getElementById(next).hidden === false) return;
  leave(screen);
  for (const id of ['home', 'metronome', 'record']) $(id).hidden = id !== next;
  screen = next;
  enter(next);
}

function leave(name) {
  if (name === 'metronome') stopMetronome();
  if (name === 'record') stopRecorder();
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
}

function enter(name) {
  if (name === 'metronome') {
    setSession('playback');
    $('met-toggle').focus({ preventScroll: true });
  }
  if (name === 'record') startRecorder();
  if (name === 'home') document.title = 'Music Practice';
  else document.title = `${name === 'metronome' ? 'Metronome' : 'Playback Recorder'} · Music Practice`;
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
  const ctx = audio();
  unlock();
  if (!metronome) metronome = new Metronome(ctx);
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

const metSettings = $('met-settings');
$('met-settings-btn').addEventListener('click', () => metSettings.showModal());
chips($('meter-chips'), METERS.map((m) => ({ id: m.id, label: m.beats === 1 ? 'No bars' : m.id })), () => settings.meter, (v) => { settings.meter = v; metronomeConfigured(); });
chips($('sound-chips'), SOUNDS, () => settings.sound, (v) => {
  settings.sound = v;
  metronomeConfigured();
  // Let them hear it.
  if (!metronome?.running) {
    const ctx = audio();
    unlock();
    if (!metronome) metronome = new Metronome(ctx);
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
  pendulum.style.transform = `rotate(${pendulumAngle(beat, now, metronome.period, 24).toFixed(2)}deg)`;
  const dots = $('beats').children;
  for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('on', !!beat && beat.beat === i);
}

// ---------------------------------------------------------------- recorder

let recorder = null;
let wave = null;
let takes = []; // newest first
let playing = null; // { take, source, startedAt, auto }
let recError = '';

const STATUS = {
  off: ['Off', () => recError || 'Tap the button to start listening.'],
  waiting: ['Listening…', () => 'Start playing whenever you\'re ready.'],
  recording: ['Recording', () => `Stop playing for ${fmtSec(settings.silenceSec)} s to finish.`],
  playing: ['Playing back', () => 'Listening starts again when it ends.'],
  paused: ['Paused', () => 'Listening starts again when you\'re done here.'],
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
  if (state === 'waiting' && audio().state !== 'running') h = 'Tap anywhere to let the app hear you.';
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
    recorder.echoCancel = settings.recordDuringPlayback;
  }
  for (const el of document.querySelectorAll('.silence-sec')) el.textContent = fmtSec(settings.silenceSec);
  persist();
  showState();
}

async function startRecorder() {
  setSession('play-and-record');
  const ctx = audio();
  unlock();
  if (!recorder) {
    recorder = new Recorder(ctx);
    wave = new Waveform($('wave'));
    recorder.addEventListener('state', () => {
      interruptPlayback();
      showState();
      keepAwake(recorder.state !== 'off');
    });
    recorder.addEventListener('chunk', (e) => wave.push(e.detail.data, ctx.sampleRate, e.detail.state));
    recorder.addEventListener('take', (e) => onTake(e.detail));
  }
  recorder.configure(settings);
  recorder.echoCancel = settings.recordDuringPlayback;
  recError = '';
  try {
    await recorder.on();
  } catch (err) {
    recError = micError(err);
  }
  showState();
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
  setSession('play-and-record');
  recError = '';
  try {
    await recorder.restore();
  } catch (err) {
    recError = micError(err);
  }
  showState();
}

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
  if (!recorder || recorder.state === 'off') startRecorder();
  else stopRecorder();
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
 * Play a take. Playing from the list pauses listening. By default the mic is
 * also closed while a take plays, because an open mic puts a phone (iPhone
 * especially) into its quieter play-and-record mode; it reopens afterwards.
 * With "Record during playback" on, the mic stays open and an automatic
 * playback keeps listening, so playing again starts the next take.
 */
function play(take, { auto = false } = {}) {
  stopPlayback({ resume: false });
  const ctx = audio();
  unlock();
  const buf = ctx.createBuffer(1, take.samples.length, take.sampleRate);
  buf.copyToChannel(take.samples, 0);
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.connect(ctx.destination);
  let delay = 0.03;
  if (recorder && recorder.state !== 'off') {
    if (!auto) recorder.pause();
    else if (!settings.recordDuringPlayback) recorder.hold();
    if (!settings.recordDuringPlayback && recorder.micOpen) {
      recorder.release();
      setSession('playback');
      delay = 0.2; // give the phone a moment to switch its audio route back
    }
  }
  playing = { take, source, startedAt: ctx.currentTime + delay, auto };
  source.onended = () => { if (playing?.source === source) stopPlayback(); };
  source.start(playing.startedAt);
  wave?.showTake(take.samples);
  renderTakes();
  showState();
}

function stopPlayback({ resume = true } = {}) {
  if (!playing) return;
  const { source } = playing;
  playing = null;
  source.onended = null;
  try { source.stop(); } catch { /* already ended */ }
  wave?.showLive();
  if (resume && recorder && (recorder.state === 'playing' || recorder.state === 'paused') && toastTimer === null) resumeListening();
  renderTakes();
  showState();
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
        <div class="meta"><div class="name"><span></span><span></span></div><canvas aria-hidden="true"></canvas></div>
        <button class="del" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
        <span class="bar-progress" aria-hidden="true"></span>`;
      li.querySelector('.play').addEventListener('click', () => (playing?.take === take ? stopPlayback() : play(take)));
      li.querySelector('.del').addEventListener('click', () => removeTake(take));
      requestAnimationFrame(() => drawThumb(li.querySelector('canvas'), take.samples));
    }
    const n = takes.length - i;
    const dur = take.samples.length / take.sampleRate;
    const [name, len] = li.querySelectorAll('.name span');
    name.textContent = `Take ${n} · ${fmtWhen(take.created)}`;
    len.textContent = fmtDur(Math.max(1, Math.round(dur)));
    li.querySelector('.play').setAttribute('aria-label', `${playing?.take === take ? 'Stop' : 'Play'} take ${n}`);
    li.querySelector('.del').setAttribute('aria-label', `Delete take ${n}`);
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
$('rec-during').checked = settings.recordDuringPlayback;
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
    const ctx = audio();
    const dur = playing.take.samples.length / playing.take.sampleRate;
    const p = Math.min(1, Math.max(0, (ctx.currentTime - playing.startedAt) / dur));
    wave.setProgress(p);
    const row = $('takes').querySelector(`[data-key="${playing.take.created}"] .bar-progress`);
    if (row) row.style.width = `${(p * 100).toFixed(1)}%`;
  }
  if (recorder?.state === 'recording') $('rec-state').textContent = `Recording ${fmtDur(recorder.recordingSec)}`;
  wave.draw();
}

// ---------------------------------------------------------------- keys

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  const typing = e.target instanceof HTMLInputElement && (e.target.type === 'number' || e.target.type === 'range');
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
});

// ---------------------------------------------------------------- start

function frame() {
  if (screen === 'metronome') animateMetronome();
  if (screen === 'record') animateRecorder();
  requestAnimationFrame(frame);
}

setBpm(settings.bpm);
renderBeats();
configureRecorder();
store.list().then((saved) => {
  takes = [...takes, ...saved.filter((s) => !takes.some((t) => t.created === s.created))];
  renderTakes();
});
loadArt();
route();
requestAnimationFrame(frame);
