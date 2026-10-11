// Shell: title, songbooks, the round (listen, answer, solve), dialogs, input.
import { createAudio, INSTRUMENTS } from './audio.js';
import { createKeyboard } from './keyboard.js';
import { createNavigator } from './navigator.js';
import { createStaff } from './staff.js';
import { noteName } from './music.js';
import { perform, secondsPerBeat, MAX_HOLD } from './perform.js';
import { createRound, press, redo, stars, points } from './round.js';
import { buildLibrary, inBook, transpose, randomShift, pickNext, rate, countAt, SONGBOOKS, LEVELS, LEVEL_ALIASES } from './library.js';
import { createChrome, requestFullscreen, wantFullscreen, exitFullscreen, fullscreenElement, preventZoom, onFullscreenFail } from './chrome.js';
import { createGamepads, BTN } from './gamepad.js';
import { createFx } from './fx.js';
import { loadState, saveState, DEFAULTS } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TOUCH = matchMedia('(pointer: coarse)').matches;
if (TOUCH) document.documentElement.classList.add('touch');

const state = loadState();
const { settings, progress } = state;
const save = () => saveState(state);
progress.level = LEVEL_ALIASES[progress.level] || progress.level;
const LIB = buildLibrary();

const S = {
  mode: 'title',
  utilityNav: false,
  melody: null,
  round: null,
  replay: false, // a solved melody played again: not scored
  practice: false,
  play: null, // { token, voices, timers }
  held: new Map(), // midi -> voice
  recent: [],
  solvedShown: false,
};

// ---------------------------------------------------------------- audio
const audio = createAudio();
let samplesReady = false;
function loadSound(name, announceLoad = true) {
  const status = $('#load-status');
  return audio.setInstrument(name, (done, total) => {
    if (announceLoad && S.mode === 'title') status.textContent = done < total ? `Tuning the piano… ${Math.round((done / total) * 100)}%` : '';
  }).then((ok) => {
    samplesReady = ok;
    if (S.mode === 'title') status.textContent = ok ? '' : 'The piano could not load. Check your connection and reload.';
  });
}
audio.setVolume(settings.volume);
audio.setMuted(settings.muted);
audio.setReverb(settings.reverb);
audio.setMelodyLevel(settings.melody);
loadSound(settings.sound);
const unlock = () => audio.unlock();
addEventListener('pointerdown', unlock, { capture: true });
addEventListener('touchend', unlock, { capture: true });
addEventListener('keydown', unlock, { capture: true });

// ---------------------------------------------------------------- keyboard and effects
// The whole piano, A0 to C8; the player chooses how many keys show (eleven white keys by default).
let nav = null;
const kbd = createKeyboard($('#kbd'), { lo: 21, hi: 108, whites: settings.whites, onDown: keyDown, onUp: keyUp, onView: (p, w) => nav?.sync(p, w) });
nav = createNavigator($('#kbd-nav'), kbd, { onWhites: (w) => { settings.whites = w; save(); } });
nav.sync(kbd.pos, kbd.whites);
kbd.setLabels(settings.labels);
kbd.showRange(60, 72, false); // middle C
const fx = createFx($('#fx'));
// Tapping a found note on the staff plays it on its own.
const staff = createStaff($('#staff'), { onTap: (midi) => { cancelAuto(); audio.unlock(); const v = audio.noteOn(midi, { velocity: 0.8 }); audio.noteOff(v, audio.now() + 0.7); } });
const pads = createGamepads({ onButton: padButton, onButtonUp: padButtonUp, onDirection: padDirection, onStick: padStick, onDisconnect: () => { if (S.mode === 'play' && !dialogs.length) openPause(); } });
preventZoom();
const chrome = createChrome({
  touch: TOUCH, isPlaying: () => S.mode === 'play' && !dialogs.length, hintEl: $('#bars-hint'),
  onUserLeft: () => toast('Full screen is off. Turn it back on from the menu, or the Fullscreen button on the title.'),
  onStuck: (why) => { if (why === 'swiped') toast('Safari keeps its bar here. For full screen: Share → Add to Home Screen'); },
});

function haptic(ms) {
  if (!settings.vibrate) return;
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
  pads.vibrate(typeof ms === 'number' ? ms : 40);
}

// ---------------------------------------------------------------- delivered art (see design/image-requests.md)
fetch('data/asset-list.json').then((r) => r.json()).then((list) => {
  const got = Object.fromEntries(list.filter((a) => a.status === 'delivered').map((a) => [a.id, a.file]));
  if (got.logo) { const im = $('#logo-img'); im.onload = () => { im.hidden = false; }; im.src = got.logo; im.alt = 'Ear Trainer'; }
  if (got['title-bg']) { const bg = $('#title-bg'); bg.style.backgroundImage = `url("${got['title-bg']}")`; bg.classList.add('art'); }
  if (got['rotate-card']) { const im = $('#rotate-img'); im.src = got['rotate-card']; im.hidden = false; }
  S.covers = got;
  if (S.mode === 'books') renderBooks();
}).catch(() => { /* stand-ins stay */ });

// ---------------------------------------------------------------- screens
function show(mode) {
  S.mode = mode;
  $('#title').hidden = mode !== 'title';
  $('#books').hidden = mode !== 'books';
  $('#play').hidden = mode !== 'play';
  chrome.update();
  if (mode === 'title') { S.utilityNav = false; clearPadFocus(); }
  if (mode === 'play') requestAnimationFrame(() => kbd.layout());
}

// If the browser keeps refusing fullscreen (some in-app browsers never allow
// it), say so once instead of failing silently.
let toldNoFullscreen = false;
onFullscreenFail((n) => {
  if (n < 2 || toldNoFullscreen || !TOUCH) return;
  toldNoFullscreen = true;
  toast('This browser won’t go full screen. Open the page in Chrome, or add it to your home screen.');
});

function start() {
  unlock();
  wantFullscreen({ lock: TOUCH });
  openBooks();
}

function openBooks() {
  stopPlayback();
  show('books');
  renderBooks();
  focusFirst($('#books'));
}

function renderBooks() {
  const lv = $('#levels');
  lv.innerHTML = '';
  for (const l of LEVELS) {
    const b = document.createElement('button');
    b.className = 'chip'; b.setAttribute('role', 'radio'); b.dataset.focus = '';
    b.setAttribute('aria-checked', String(progress.level === l.id));
    b.textContent = l.id === 'adaptive' ? `Adaptive · ${progress.rating.toFixed(1)}` : l.name;
    if (l.blurb) b.title = l.blurb;
    b.addEventListener('click', () => { progress.level = l.id; save(); renderBooks(); focusEl($(`#levels [data-level="${l.id}"]`)); });
    b.dataset.level = l.id;
    lv.append(b);
  }
  const grid = $('#book-grid');
  grid.innerHTML = '';
  let solvedAll = 0;
  for (const book of SONGBOOKS) {
    const pool = inBook(LIB, book.id);
    if (!pool.length) continue;
    const solved = pool.filter((m) => progress.best[m.id]).length;
    if (book.id === 'all') solvedAll = solved;
    const b = document.createElement('button');
    b.className = 'book'; b.dataset.focus = ''; b.dataset.book = book.id;
    const cover = S.covers?.[`book-${book.id}`];
    b.innerHTML = `<span class="glyph${cover ? ' art' : ''}" aria-hidden="true">${book.glyph}</span><span class="name"></span><span class="blurb"></span>
      <span class="meter"><i style="width:${(solved / pool.length) * 100}%"></i></span><span class="count">${solved}/${pool.length}</span><span class="at"></span>`;
    const at = countAt(pool, progress.level);
    const lvName = LEVELS.find((l) => l.id === progress.level);
    if (lvName?.range) b.querySelector('.at').textContent = at ? `${at} at ${lvName.short}` : `None at ${lvName.short}: nearest level instead`;
    if (cover) b.querySelector('.glyph').style.backgroundImage = `url("${cover}")`;
    b.querySelector('.name').textContent = book.name;
    b.querySelector('.blurb').textContent = book.blurb;
    b.setAttribute('aria-label', `${book.name}: ${book.blurb}. ${solved} of ${pool.length} solved.`);
    b.addEventListener('click', () => startBook(book.id));
    grid.append(b);
  }
  $('#books-total').textContent = `★ ${progress.score.toLocaleString()} · ${solvedAll}/${LIB.length}`;
}

function startBook(id) {
  progress.book = id; save();
  setFree(false);
  S.practice = false; syncPractice();
  show('play');
  $('#hud-book').textContent = SONGBOOKS.find((b) => b.id === id)?.name || '';
  syncHud();
  nextMelody();
}

// ---------------------------------------------------------------- free play
// The whole piano with no melody to find: the staff shows the last notes played.
function setFree(on) {
  S.free = on;
  $('#play').classList.toggle('free', on);
  if (on) { S.freeNotes = []; staff.clear('Play anything. Slide along the piano with the bar above the keys.'); }
}
function startFree() {
  stopPlayback();
  setFree(true);
  S.round = null; S.melody = null; S.solvedShown = false;
  S.practice = false; syncPractice();
  show('play');
  showSolved(false);
  kbd.setMarker(null);
  nav.setRange(null);
  $('#hud-book').textContent = 'Free play';
  $('#hud-level').textContent = `${kbd.total} white keys, A0 to C8`;
  setPrompt('Free play: the whole piano is yours');
}
function freeNote(midi) {
  const notes = S.freeNotes;
  notes.push({ midi, beats: 1, at: notes.length });
  if (notes.length > 16) notes.shift();
  notes.forEach((n, i) => { n.at = i; });
  staff.set(notes, true);
  staff.update({ pos: notes.length, done: true, practice: false });
  setPrompt(noteName(midi, { flats: false }));
}
$('#btn-free').addEventListener('click', startFree);
$('#btn-clear').addEventListener('click', () => { S.freeNotes = []; staff.clear('Cleared. Play on.'); });

function toTitle() { closeAllDialogs(); stopPlayback(); kbd.releaseAll(); show('title'); focusEl($('#start'), false); }

// ---------------------------------------------------------------- a round
function nextMelody() {
  cancelAuto();
  clearTimeout(retryT); retryT = 0;
  S.retry = false;
  stopPlayback();
  const pool = inBook(LIB, progress.book);
  const m = pickNext(pool, { level: progress.level, rating: progress.rating, best: progress.best, recent: S.recent });
  if (!m) return;
  S.recent = [m.id, ...S.recent.filter((x) => x !== m.id)].slice(0, Math.min(25, Math.floor(pool.length / 2)));
  S.melody = transpose(m, settings.key === 'random' ? randomShift() : 0);
  S.round = createRound(S.melody.notes);
  S.replay = false;
  S.solvedShown = false;
  showSolved(false);
  kbd.clearLights();
  kbd.showRange(S.melody.lo, S.melody.hi, true);
  nav.setRange(S.melody.lo, S.melody.hi);
  if (kbd.cursor != null && !kbd.visible(kbd.cursor)) kbd.setCursor(null);
  staff.set(S.melody.notes, S.melody.shift !== 0);
  syncStaff();
  syncMarker();
  syncHud();
  setPrompt('Listen…', true);
  setTimeout(() => { if (S.round && S.round.notes === S.melody.notes && !dialogs.length) playMelody(); }, 650);
}

function syncStaff() {
  const r = S.round;
  staff.update({ pos: r.pos, done: r.done, practice: S.practice });
}
function showSolved(on) {
  $('#solved').hidden = !on;
  $('#prompt').hidden = on;
  const skip = $('#btn-skip');
  skip.classList.toggle('next', on);
  $('#skip-label').textContent = on ? 'Next' : 'Skip';
  skip.dataset.tip = on ? 'Next melody' : 'Skip to another melody';
}
function syncMarker() {
  const r = S.round;
  kbd.setMarker(settings.first && r && !r.done && r.pos === 0 ? r.notes[0].midi : null);
}
function syncHud() {
  $('#hud-score').textContent = progress.score.toLocaleString();
  $('#hud-miss span').textContent = S.round ? S.round.mistakes : 0;
  const st = $('#hud-streak'); st.hidden = progress.streak < 2; st.querySelector('span').textContent = progress.streak;
  const lv = S.melody ? LEVELS.find((l) => l.range && l.range[0] === S.melody.level) : null;
  $('#hud-level').textContent = lv ? `Level ${lv.name}${progress.level === 'adaptive' ? ' · Adaptive' : ''}` : '';
}
function setPrompt(text, listening = false, wrong = false) {
  const p = $('#prompt');
  p.textContent = text;
  p.classList.toggle('listen', listening);
  p.classList.toggle('wrong', wrong);
}
function idlePrompt() {
  const r = S.round;
  if (!r || S.solvedShown) return;
  if (S.practice) setPrompt('Practice: play freely. Turn Practice off to carry on.');
  else if (r.done) setPrompt('Play it again, or move on.');
  else if (r.pos === 0 && S.retry) setPrompt('Once more, with no wrong notes');
  else if (r.pos === 0) setPrompt(settings.first ? 'Your turn: start on the glowing key' : 'Your turn: play it back');
  else if (S.retry) setPrompt(`Once more, cleanly: note ${r.pos + 1} of ${r.notes.length}`);
  else setPrompt(`Keep going: note ${r.pos + 1} of ${r.notes.length}`);
}

// ---------------------------------------------------------------- playback
function playMelody({ light = false } = {}) {
  if (!S.melody) return;
  stopPlayback();
  audio.unlock();
  const spb = secondsPerBeat(S.melody.bpm, settings.speed);
  const t0 = audio.now() + 0.12;
  const token = {};
  const voices = [], timers = [];
  const plan = perform(S.melody.notes, spb, { maxHold: MAX_HOLD / settings.speed });
  plan.forEach((p, i) => {
    const on = t0 + p.on;
    const v = audio.noteOn(p.midi, { when: on, velocity: p.velocity, melody: true });
    if (v) { audio.noteOff(v, t0 + p.off); voices.push(v); }
    const ms = (on - audio.now()) * 1000;
    const shown = Math.max(140, (p.off - p.on) * 850);
    timers.push(setTimeout(() => {
      staff.hear(i, shown);
      if (light) { kbd.light(p.midi, true); timers.push(setTimeout(() => kbd.light(p.midi, false), Math.max(140, shown))); }
    }, ms));
  });
  const last = plan[plan.length - 1];
  const total = (last.on + Math.min(S.melody.notes[S.melody.notes.length - 1].beats * spb, 1.2)) * 1000 + 150;
  timers.push(setTimeout(() => { if (S.play === token) { S.play = null; $('#btn-repeat').classList.remove('busy'); idlePrompt(); } }, total));
  token.voices = voices; token.timers = timers;
  S.play = token;
  $('#btn-repeat').classList.add('busy');
  if (!S.solvedShown) setPrompt(samplesReady ? 'Listen… (play along if you like)' : 'Tuning the piano…', true);
}

function stopPlayback() {
  const p = S.play;
  if (!p) return;
  S.play = null;
  for (const t of p.timers) clearTimeout(t);
  for (const v of p.voices) audio.noteOff(v);
  $$('#staff .slot.hear').forEach((d) => d.classList.remove('hear'));
  kbd.clearLights();
  $('#btn-repeat').classList.remove('busy');
}

// ---------------------------------------------------------------- answering
function keyDown(midi, source) {
  if (S.mode !== 'play' || dialogs.length) return;
  audio.unlock();
  // The melody keeps playing: the player can play along with it.
  const v = audio.noteOn(midi, { velocity: 0.92 });
  if (S.held.get(midi)) audio.noteOff(S.held.get(midi));
  S.held.set(midi, v);
  if (S.free) { freeNote(midi); return; }
  const r = S.round;
  if (!r || S.practice || r.done) {
    if (r?.done && S.solvedShown && $('#btn-skip').classList.contains('counting')) scheduleAuto(); // still playing: wait a little longer
    return;
  }
  const result = press(r, midi);
  if (result === 'wrong') {
    kbd.flash(midi, 'bad');
    staff.flash(r.pos, 'wrong', 420);
    const miss = $('#hud-miss'); miss.classList.remove('hit'); void miss.offsetWidth; miss.classList.add('hit');
    haptic([18, 40, 18]);
    if (!S.replay) syncHud();
    setPrompt(r.pos === 0 ? 'Not that one. Try Repeat, or keep looking.' : `Not that one: note ${r.pos + 1} of ${r.notes.length}`, false, true);
    return;
  }
  kbd.flash(midi, 'ok');
  sparkOn(midi);
  haptic(12);
  syncStaff();
  syncMarker();
  if (result === 'done') solved();
  else idlePrompt();
}
function keyUp(midi) {
  const v = S.held.get(midi);
  if (v) { audio.noteOff(v); S.held.delete(midi); }
}
function sparkOn(midi) {
  const el = $(`.key[data-midi="${midi}"]`);
  const box = $('#play').getBoundingClientRect();
  const k = el?.getBoundingClientRect();
  if (k) fx.spark(k.left + k.width / 2 - box.left, k.top + k.height * 0.7 - box.top);
}

function solved() {
  const r = S.round, m = S.melody;
  const n = r.notes.length;
  const st = stars(n, r.mistakes);
  let gain = 0;
  if (!S.replay) {
    gain = points(n, r.mistakes, progress.streak);
    progress.streak = r.mistakes === 0 ? progress.streak + 1 : 0;
    progress.bestStreak = Math.max(progress.bestStreak, progress.streak);
    progress.score += gain;
    progress.best[m.id] = Math.max(progress.best[m.id] || 0, st);
    progress.solved++;
    if (progress.level === 'adaptive') progress.rating = rate(progress.rating, st);
    save();
  }
  S.solvedShown = true;
  setTimeout(() => audio.chime(st), 220);
  const box = $('#play').getBoundingClientRect();
  const kb = $('#kbd').getBoundingClientRect();
  setTimeout(() => fx.burst(kb.left - box.left + kb.width / 2, kb.top - box.top + 10, 30 + st * 25, 0.7 + st * 0.15), 120);
  haptic([20, 50, 30]);
  // Reveal: every note on the staff, the title and stars in the bar; Skip becomes Next.
  showSolved(true);
  $$('#stars i').forEach((s, i) => { s.classList.remove('on'); void s.offsetWidth; s.classList.toggle('on', i < st); });
  $('#song-title').textContent = m.title;
  const key = m.shift ? ` · transposed ${m.shift > 0 ? 'up' : 'down'} ${Math.abs(m.shift)} semitone${Math.abs(m.shift) === 1 ? '' : 's'}` : '';
  $('#song-by').textContent = `${m.by}${key}`;
  $('#gain').textContent = S.replay ? '' : `+${gain}`;
  $('#solved').setAttribute('aria-label', `Solved: ${m.title}. ${st} star${st > 1 ? 's' : ''}.`);
  announce(`Solved: ${m.title}, ${st} star${st > 1 ? 's' : ''}${gain ? `, plus ${gain} points` : ''}.`);
  const sc = $('#hud-score'); sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump');
  syncHud();
  if (r.mistakes > 0 && settings.retry) {
    // Not clean yet: after the celebration it comes round again (unscored)
    // until it's played with no wrong notes. Next still moves on.
    retryT = setTimeout(startRetry, RETRY_MS);
    announce(`Solved: ${m.title}. Now once more, with no wrong notes.`);
  } else {
    if (S.retry) toast('Clean! On to the next one');
    S.retry = false;
    scheduleAuto();
  }
}

// ---------------------------------------------------------------- once more, cleanly
// A melody solved with wrong notes is played again: the staff hides its notes,
// the melody plays, and the player goes again until a clean run. Only a clean
// run moves on by itself; Next always moves on.
const RETRY_MS = 1800;
let retryT = 0;
const retryPending = () => retryT !== 0;
function startRetry() {
  clearTimeout(retryT);
  retryT = 0;
  if (S.mode !== 'play' || dialogs.length || !S.melody || S.free) return;
  stopPlayback();
  S.round = createRound(S.melody.notes);
  S.replay = true;
  S.retry = true;
  S.solvedShown = false;
  showSolved(false);
  const skip = $('#btn-skip');
  skip.classList.add('next');
  $('#skip-label').textContent = 'Next';
  skip.dataset.tip = 'Next melody';
  syncStaff(); syncMarker(); syncHud();
  playMelody();
}

// ---------------------------------------------------------------- moving on
// After a solved melody the chime rings and the next one follows straight on
// (the Next button fills up meanwhile). Playing a few more notes restarts the
// wait; Repeat, Redo, Practice, tapping the staff or the menu stays put.
const AUTO_MS = 1500;
let autoT = 0;
function scheduleAuto(ms = AUTO_MS) {
  clearTimeout(autoT);
  const btn = $('#btn-skip');
  btn.classList.remove('counting');
  if (!settings.auto || !S.solvedShown || S.free) return;
  btn.style.setProperty('--auto', `${ms}ms`);
  void btn.offsetWidth;
  btn.classList.add('counting');
  autoT = setTimeout(() => {
    btn.classList.remove('counting');
    if (S.solvedShown && S.mode === 'play' && !dialogs.length && !S.free) nextMelody();
  }, ms);
}
function cancelAuto() { clearTimeout(autoT); $('#btn-skip').classList.remove('counting'); }

function doRedo() {
  cancelAuto();
  if (retryPending()) { startRetry(); return; } // waiting to go again: go now
  if (!S.round) return;
  stopPlayback();
  if (S.round.done) {
    // Solved already: start a fresh, unscored go at it.
    S.round = createRound(S.melody.notes);
    S.replay = true;
    S.solvedShown = false;
    showSolved(false);
  } else redo(S.round);
  syncStaff(); syncMarker(); syncHud();
  setPrompt('From the top.');
  setTimeout(idlePrompt, 1200);
}
function doRepeat() { cancelAuto(); if (S.round && !S.free) playMelody({ light: !!(S.round.done && settings.light) }); }
function doPractice() {
  cancelAuto();
  S.practice = !S.practice;
  syncPractice();
  syncStaff();
  idlePrompt();
}
function syncPractice() {
  $('#play').classList.toggle('practicing', S.practice);
  $('#btn-practice').setAttribute('aria-pressed', String(S.practice));
}
function doNext() {
  if (!S.round) return;
  if (!S.round.done && !S.practice && !S.retry) {
    toast(`Skipped: ${S.melody.title}`);
    progress.streak = 0; save();
  }
  nextMelody();
}
function setSpeed(v) {
  settings.speed = Math.round(Math.min(1.5, Math.max(0.5, v)) * 10) / 10;
  $('#speed-out').textContent = `${settings.speed}×`;
  $('#speed-down').disabled = settings.speed <= 0.5;
  $('#speed-up').disabled = settings.speed >= 1.5;
  save();
}
setSpeed(settings.speed);

$('#btn-repeat').addEventListener('click', doRepeat);
$('#btn-redo').addEventListener('click', doRedo);
$('#btn-practice').addEventListener('click', doPractice);
$('#btn-skip').addEventListener('click', doNext);
$('#speed-down').addEventListener('click', () => setSpeed(settings.speed - 0.1));
$('#speed-up').addEventListener('click', () => setSpeed(settings.speed + 0.1));
$('#btn-pause').addEventListener('click', openPause);

// ---------------------------------------------------------------- title buttons
$('#start').addEventListener('click', start);
$('#btn-instructions').addEventListener('click', () => openDialog($('#instructions')));
$('#btn-settings').addEventListener('click', () => openDialog($('#settings')));
const SOUND_ICON = {
  on: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></g>',
  off: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></g>',
};
function syncSoundButton() {
  const on = !settings.muted;
  const label = on ? 'Sound on' : 'Sound off';
  const b = $('#btn-sound');
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', label);
  b.dataset.tip = label;
  b.classList.toggle('is-off', !on);
  b.querySelector('svg').innerHTML = on ? SOUND_ICON.on : SOUND_ICON.off;
  $('#set-sound-on').checked = on;
}
function setMuted(m) {
  settings.muted = m; audio.setMuted(m); if (m) audio.stopAll(); save(); syncSoundButton();
}
$('#btn-sound').addEventListener('click', () => { setMuted(!settings.muted); audio.unlock(); });
$('#set-sound-on').addEventListener('change', (e) => setMuted(!e.target.checked));
syncSoundButton();
$('#btn-fullscreen').addEventListener('click', () => {
  // iPhone Safari can't go fullscreen: point at the ways it can lose its bars.
  if (chrome.scrollTrick) { const h = $('#bars-hint'); h.hidden = false; h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); announce(h.textContent); return; }
  if (fullscreenElement()) exitFullscreen(); else wantFullscreen({ lock: TOUCH });
});
$('#books-back').addEventListener('click', toTitle);

// ---------------------------------------------------------------- dialogs
const dialogs = []; // { el, returnFocus }
function openDialog(el) {
  cancelAuto();
  clearTimeout(retryT); retryT = 0;
  stopPlayback();
  kbd.releaseAll();
  dialogs.push({ el, returnFocus: document.activeElement });
  el.hidden = false;
  if (el.id === 'settings') syncSettings();
  focusFirst(el);
  chrome.update();
}
function closeDialog() {
  const d = dialogs.pop();
  if (!d) return;
  // Back from the menu to a melody that still needs a clean run: go again.
  if (!dialogs.length && S.mode === 'play' && S.solvedShown && settings.retry && S.round?.mistakes > 0 && !S.free) {
    clearTimeout(retryT); retryT = setTimeout(startRetry, 900);
  }
  d.el.hidden = true;
  if (d.returnFocus?.isConnected && !d.returnFocus.closest('[hidden]')) focusEl(d.returnFocus, padMode);
  chrome.update();
}
function closeAllDialogs() { while (dialogs.length) closeDialog(); }
function openPause() {
  if (S.mode !== 'play' || dialogs.length) return;
  // Offer a way back into fullscreen if it was left (Android's back gesture, switching apps).
  $('#pause [data-act=fullscreen]').hidden = !!fullscreenElement() || chrome.scrollTrick || !document.documentElement.requestFullscreen && !document.documentElement.webkitRequestFullscreen;
  openDialog($('#pause'));
}
$$('[data-close]').forEach((b) => b.addEventListener('click', closeDialog));
// A tap on the dimmed backdrop closes a dialog (a click, so a swipe across it doesn't).
$$('.dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) closeDialog(); }));
$$('#pause [data-act]').forEach((b) => b.addEventListener('click', () => {
  const a = b.dataset.act;
  if (a === 'resume') closeDialog();
  if (a === 'instructions') openDialog($('#instructions'));
  if (a === 'settings') openDialog($('#settings'));
  if (a === 'books') { closeAllDialogs(); openBooks(); }
  if (a === 'title') toTitle();
  if (a === 'fullscreen') { closeDialog(); wantFullscreen({ lock: TOUCH }); }
}));
let confirmYes = null;
function confirmBox(text, yes) { $('#confirm-text').textContent = text; confirmYes = yes; openDialog($('#confirm')); focusEl($('#confirm [data-act=no]'), padMode); }
$('#confirm [data-act=no]').addEventListener('click', closeDialog);
$('#confirm [data-act=yes]').addEventListener('click', () => { closeDialog(); confirmYes?.(); });

// ---------------------------------------------------------------- settings
function chips(container, options, get, set) {
  container.innerHTML = '';
  for (const [value, label] of options) {
    const b = document.createElement('button');
    b.className = 'chip'; b.dataset.focus = ''; b.setAttribute('role', 'radio'); b.textContent = label;
    b.setAttribute('aria-checked', String(get() === value));
    b.addEventListener('click', () => { set(value); for (const c of container.children) c.setAttribute('aria-checked', String(c === b)); });
    container.append(b);
  }
}
function syncSettings() {
  chips($('#set-sound'), Object.entries(INSTRUMENTS).map(([k, v]) => [k, v.label]), () => settings.sound, (v) => {
    settings.sound = v; save();
    loadSound(v, false).then(() => { audio.unlock(); const now = audio.now(); [60, 64, 67, 72].forEach((m, i) => { const x = audio.noteOn(m, { when: now + 0.05 + i * 0.09, velocity: 0.75 }); audio.noteOff(x, now + 1.4); }); });
  });
  chips($('#set-labels'), [['none', 'None'], ['c', 'C only'], ['white', 'White keys'], ['all', 'All keys']], () => settings.labels, (v) => { settings.labels = v; kbd.setLabels(v); save(); });
  chips($('#set-key'), [['written', 'As written'], ['random', 'Any key']], () => settings.key, (v) => { settings.key = v; save(); });
  $('#set-volume').value = settings.volume; $('#set-volume-out').textContent = `${Math.round(settings.volume * 100)}%`;
  $('#set-melody').value = settings.melody; $('#set-melody-out').textContent = `${Math.round(settings.melody * 100)}%`;
  $('#set-reverb').value = settings.reverb; $('#set-reverb-out').textContent = `${Math.round(settings.reverb * 100)}%`;
  $('#set-first').checked = settings.first;
  $('#set-light').checked = settings.light;
  $('#set-staff').checked = settings.staff;
  $('#set-auto').checked = settings.auto;
  $('#set-retry').checked = settings.retry;
  $('#set-vibrate').checked = settings.vibrate;
}
$('#set-volume').addEventListener('input', (e) => { settings.volume = Number(e.target.value); audio.setVolume(settings.volume); $('#set-volume-out').textContent = `${Math.round(settings.volume * 100)}%`; save(); });
$('#set-melody').addEventListener('input', (e) => { settings.melody = Number(e.target.value); audio.setMelodyLevel(settings.melody); $('#set-melody-out').textContent = `${Math.round(settings.melody * 100)}%`; save(); });
$('#set-reverb').addEventListener('input', (e) => { settings.reverb = Number(e.target.value); audio.setReverb(settings.reverb); $('#set-reverb-out').textContent = `${Math.round(settings.reverb * 100)}%`; save(); });
$('#set-first').addEventListener('change', (e) => { settings.first = e.target.checked; save(); syncMarker(); });
$('#set-light').addEventListener('change', (e) => { settings.light = e.target.checked; save(); });
$('#set-auto').addEventListener('change', (e) => { settings.auto = e.target.checked; save(); });
$('#set-retry').addEventListener('change', (e) => { settings.retry = e.target.checked; save(); });
$('#set-staff').addEventListener('change', (e) => { settings.staff = e.target.checked; save(); syncStaffSetting(); });
function syncStaffSetting() { $('#play').classList.toggle('no-staff', !settings.staff); }
syncStaffSetting();
$('#set-vibrate').addEventListener('change', (e) => { settings.vibrate = e.target.checked; save(); });
$('#set-reset').addEventListener('click', () => confirmBox('Reset your score, stars and level? Settings stay.', () => {
  Object.assign(progress, structuredClone(DEFAULTS.progress), { book: progress.book, level: progress.level });
  save(); syncHud(); toast('Progress reset');
}));

// ---------------------------------------------------------------- focus (keyboard and controller menus)
let padMode = false;
function activeLayer() {
  if (dialogs.length) return dialogs[dialogs.length - 1].el;
  return { title: $('#title'), books: $('#books'), play: $('#solved') }[S.mode];
}
function focusables(layer = activeLayer()) {
  return layer ? $$('[data-focus], .dialog .chip, .dialog input', layer).filter((e) => !e.closest('[hidden]') && e.offsetParent !== null) : [];
}
function clearPadFocus() { $$('.pad-focus').forEach((e) => e.classList.remove('pad-focus')); }
function focusEl(el, visible = padMode) {
  if (!el) return;
  clearPadFocus();
  el.focus({ preventScroll: false });
  if (visible) el.classList.add('pad-focus');
  el.scrollIntoView?.({ block: 'nearest' });
}
function focusFirst(layer) {
  const f = focusables(layer);
  const pick = layer.id === 'books' ? f.find((e) => e.dataset.book === progress.book) || f[0] : f[0];
  if (padMode || !TOUCH) focusEl(pick); else document.activeElement?.blur?.();
}
function moveFocus(dir) {
  const f = focusables();
  if (!f.length) return;
  const cur = f.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) return focusEl(f[0], true);
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of f) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    const along = { left: -dx, right: dx, up: -dy, down: dy }[dir];
    if (along <= 4) continue;
    const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = along + across * 2.2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (!best) {
    // wrap through the list order for up/down
    const i = f.indexOf(cur);
    if (dir === 'down' || dir === 'right') best = f[(i + 1) % f.length];
    else best = f[(i - 1 + f.length) % f.length];
  }
  focusEl(best, true);
}
function adjustRange(el, dir) {
  const step = Number(el.step) || 0.05;
  el.value = Math.min(Number(el.max), Math.max(Number(el.min), Number(el.value) + step * (dir === 'right' ? 1 : -1)));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// ---------------------------------------------------------------- controller
function padStick() {
  if (S.mode === 'title' && !dialogs.length && !S.utilityNav) { S.utilityNav = true; padMode = true; focusEl($('#start'), true); }
}
function padDirection(dir) {
  padMode = true;
  if (S.mode === 'play' && !dialogs.length) {
    if (dir === 'left' || dir === 'right') {
      if (kbd.cursor == null && S.round && settings.first) kbd.setCursor(S.round.notes[S.round.pos]?.midi ?? null);
      kbd.moveCursor(dir === 'right' ? 1 : -1);
    } else nav.octave(dir === 'up' ? 1 : -1);
    return;
  }
  if (S.mode === 'title' && !dialogs.length && !S.utilityNav) { S.utilityNav = true; focusEl($('#start'), true); return; }
  const el = document.activeElement;
  if (el?.type === 'range' && (dir === 'left' || dir === 'right')) return adjustRange(el, dir);
  moveFocus(dir);
}
let padHeld = null;
function padButton(i) {
  padMode = true;
  $('#pad-hint').hidden = false;
  if (dialogs.length) {
    const top = dialogs[dialogs.length - 1].el;
    if (i === BTN.A) { const el = document.activeElement; if (el && top.contains(el)) { if (el.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change')); } else el.click(); } }
    else if (i === BTN.B || (i === BTN.MENU && top.id === 'pause')) closeDialog();
    return;
  }
  if (S.mode === 'title') {
    if (!S.utilityNav) { start(); return; }
    if (i === BTN.A) document.activeElement?.click();
    else if (i === BTN.MENU) start();
    else if (i === BTN.B) { S.utilityNav = false; clearPadFocus(); }
    return;
  }
  if (S.mode === 'books') {
    if (i === BTN.A) { const el = document.activeElement; if (el?.closest('#books')) el.click(); else focusFirst($('#books')); }
    else if (i === BTN.B) toTitle();
    return;
  }
  if (S.mode === 'play') {
    if (i === BTN.A) {
      if (S.solvedShown && $('#solved').contains(document.activeElement) && document.activeElement.classList.contains('pad-focus')) { document.activeElement.click(); return; }
      if (kbd.cursor == null) kbd.setCursor(S.round?.notes[S.round.pos]?.midi ?? kbd.start + 12);
      padHeld = kbd.pressCursor();
    } else if (i === BTN.X) doRepeat();
    else if (i === BTN.B) doRedo();
    else if (i === BTN.Y) doPractice();
    else if (i === BTN.LB) setSpeed(settings.speed - 0.1);
    else if (i === BTN.RB) setSpeed(settings.speed + 0.1);
    else if (i === BTN.VIEW || i === BTN.RT) { if (S.round?.done) nextMelody(); else doNext(); }
    else if (i === BTN.MENU) openPause();
  }
}
function padButtonUp(i) {
  if (i === BTN.A && padHeld != null) { kbd.releaseCursor(padHeld); padHeld = null; }
}

// ---------------------------------------------------------------- computer keyboard
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  padMode = false;
  if (dialogs.length) {
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
    return;
  }
  if (S.mode === 'title') {
    if (e.key === 'Enter' && document.activeElement === document.body) { e.preventDefault(); start(); }
    return;
  }
  if (S.mode === 'books') { if (e.key === 'Escape') toTitle(); return; }
  if (S.mode !== 'play') return;
  if (document.activeElement?.type === 'range' && e.key.startsWith('Arrow')) return;
  if (kbd.keydown(e)) { e.preventDefault(); return; }
  const k = e.key;
  if (k === ' ' || k === '1') { e.preventDefault(); if (!e.repeat) doRepeat(); }
  else if (k === 'Backspace' || k === '2') { e.preventDefault(); if (!e.repeat) doRedo(); }
  else if (k === '3') { if (!e.repeat) doPractice(); }
  else if (k === '-' || k === '_') setSpeed(settings.speed - 0.1);
  else if (k === '=' || k === '+') setSpeed(settings.speed + 0.1);
  else if (k === 'Enter') { e.preventDefault(); if (!e.repeat) { if (S.round?.done) nextMelody(); else doNext(); } }
  else if (k === ',' || k === '<') nav.octave(-1);
  else if (k === '.' || k === '>') nav.octave(1);
  else if (k === '9') nav.zoom(-1);
  else if (k === '0') nav.zoom(1);
  else if (k === 'Escape') openPause();
});
addEventListener('keyup', (e) => { if (S.mode === 'play') kbd.keyup(e); });
addEventListener('pointerdown', () => { if (padMode) { padMode = false; clearPadFocus(); } }, { capture: true });

// ---------------------------------------------------------------- orientation, focus loss
function checkRotate() {
  const portrait = TOUCH && innerHeight > innerWidth && Math.min(screen.width, screen.height) < 820;
  $('#rotate').hidden = !portrait;
  if (portrait) { stopPlayback(); kbd.releaseAll(); }
}
addEventListener('resize', checkRotate);
addEventListener('orientationchange', () => setTimeout(checkRotate, 120));
checkRotate();
// Silent while the page is hidden or the window is not focused.
const syncAway = () => audio.setAway(document.hidden || !document.hasFocus());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopPlayback(); kbd.releaseAll(); audio.stopAll(); }
  syncAway();
});
addEventListener('blur', () => { kbd.releaseAll(); audio.setAway(true); });
addEventListener('focus', syncAway);
addEventListener('pageshow', syncAway);
syncAway();

// ---------------------------------------------------------------- toasts and announcements
let toastT = 0;
function toast(text) {
  const t = $('#toast'); t.textContent = text; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, Math.max(2200, text.length * 60));
}
function announce(text) {
  const p = $('#prompt'); p.setAttribute('aria-label', text);
}

// Start on the title with Press Start ready for the keyboard.
show('title');
if (!TOUCH) focusEl($('#start'), false);
// For the browser checks.
window.__eartrainer = { S, LIB, progress, settings, audio, kbd };
