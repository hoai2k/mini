// Shell: title, songbooks, the round (listen, answer, solve), dialogs, input.
import { createAudio, INSTRUMENTS } from './audio.js';
import { createKeyboard } from './keyboard.js';
import { createRound, press, redo, stars, points } from './round.js';
import { buildLibrary, inBook, transpose, randomShift, pickNext, rate, SONGBOOKS, LEVELS, WHITES, LOWEST, HIGHEST } from './library.js';
import { noteName } from './music.js';
import { createChrome, requestFullscreen, exitFullscreen, fullscreenElement } from './chrome.js';
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
audio.setReverb(settings.reverb);
loadSound(settings.sound);
const unlock = () => audio.unlock();
addEventListener('pointerdown', unlock, { capture: true });
addEventListener('touchend', unlock, { capture: true });
addEventListener('keydown', unlock, { capture: true });

// ---------------------------------------------------------------- keyboard and effects
const kbd = createKeyboard($('#kbd'), { lo: LOWEST, hi: HIGHEST, whites: WHITES, onDown: keyDown, onUp: keyUp });
kbd.setLabels(settings.labels);
kbd.setWindow(60, false);
const fx = createFx($('#fx'));
const pads = createGamepads({ onButton: padButton, onButtonUp: padButtonUp, onDirection: padDirection, onStick: padStick, onDisconnect: () => { if (S.mode === 'play' && !dialogs.length) openPause(); } });
const chrome = createChrome({ touch: TOUCH, isPlaying: () => S.mode === 'play' && !dialogs.length, hintEl: $('#bars-hint') });

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

function start() {
  unlock();
  requestFullscreen();
  if (TOUCH) screen.orientation?.lock?.('landscape').catch(() => { /* the rotate card covers it */ });
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
      <span class="meter"><i style="width:${(solved / pool.length) * 100}%"></i></span><span class="count">${solved}/${pool.length}</span>`;
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
  S.practice = false; syncPractice();
  show('play');
  $('#hud-book').textContent = SONGBOOKS.find((b) => b.id === id)?.name || '';
  syncHud();
  nextMelody();
}

function toTitle() { closeAllDialogs(); stopPlayback(); kbd.releaseAll(); show('title'); focusEl($('#start'), false); }

// ---------------------------------------------------------------- a round
function nextMelody() {
  stopPlayback();
  const pool = inBook(LIB, progress.book);
  const m = pickNext(pool, { level: progress.level, rating: progress.rating, best: progress.best, recent: S.recent });
  if (!m) return;
  S.recent = [m.id, ...S.recent.filter((x) => x !== m.id)].slice(0, Math.min(25, Math.floor(pool.length / 2)));
  S.melody = transpose(m, settings.key === 'random' ? randomShift() : 0);
  S.round = createRound(S.melody.notes);
  S.replay = false;
  S.solvedShown = false;
  $('#solved').hidden = true;
  $('#prompt').hidden = false;
  kbd.clearLights();
  kbd.setWindow(S.melody.window, true);
  if (kbd.cursor != null && !kbd.visible(kbd.cursor)) kbd.setCursor(null);
  renderDots();
  syncMarker();
  syncHud();
  setPrompt('Listen…', true);
  setTimeout(() => { if (S.round && S.round.notes === S.melody.notes && !dialogs.length) playMelody(); }, 650);
}

function renderDots() {
  const dots = $('#dots');
  dots.innerHTML = '';
  S.melody.notes.forEach(() => { const d = document.createElement('span'); d.className = 'dot'; dots.append(d); });
  syncDots();
}
function syncDots() {
  const r = S.round;
  $$('#dots .dot').forEach((d, i) => {
    d.classList.toggle('done', r.done || i < r.pos);
    if (r.done || i < r.pos) d.classList.remove('miss');
    d.classList.toggle('now', !r.done && i === r.pos && !S.practice);
  });
}
function syncMarker() {
  const r = S.round;
  kbd.setMarker(settings.first && r && !r.done && r.pos === 0 ? r.notes[0].midi : null);
}
function syncHud() {
  $('#hud-score').textContent = progress.score.toLocaleString();
  $('#hud-miss span').textContent = S.round ? S.round.mistakes : 0;
  const st = $('#hud-streak'); st.hidden = progress.streak < 2; st.querySelector('span').textContent = progress.streak;
  const lvl = S.melody ? `Level ${S.melody.level}` : '';
  const mode = LEVELS.find((l) => l.id === progress.level)?.name;
  $('#hud-level').textContent = `${lvl} · ${mode}`;
}
function setPrompt(text, listening = false) {
  const p = $('#prompt');
  p.textContent = text;
  p.classList.toggle('listen', listening);
}
function idlePrompt() {
  const r = S.round;
  if (!r || S.solvedShown) return;
  if (S.practice) setPrompt('Practice: play freely. Turn Practice off to carry on.');
  else if (r.done) setPrompt('Play it again, or move on.');
  else if (r.pos === 0) setPrompt(settings.first ? 'Your turn: start on the glowing key' : 'Your turn: play it back');
  else setPrompt(`Keep going: note ${r.pos + 1} of ${r.notes.length}`);
}

// ---------------------------------------------------------------- playback
function playMelody({ light = false } = {}) {
  if (!S.melody) return;
  stopPlayback();
  audio.unlock();
  const spb = 60 / S.melody.bpm / settings.speed;
  const t0 = audio.now() + 0.12;
  const token = {};
  const voices = [], timers = [];
  const notes = S.melody.notes;
  notes.forEach((n, i) => {
    const on = t0 + n.at * spb;
    const dur = n.beats * spb;
    const last = i === notes.length - 1;
    const v = audio.noteOn(n.midi, { when: on, velocity: 0.78 + (n.at % 2 === 0 ? 0.06 : 0) });
    if (v) { audio.noteOff(v, on + (last ? Math.max(dur, 0.8) + 0.4 : dur * 0.94)); voices.push(v); }
    const ms = (on - audio.now()) * 1000;
    timers.push(setTimeout(() => {
      const dot = $$('#dots .dot')[i];
      dot?.classList.add('hear');
      timers.push(setTimeout(() => dot?.classList.remove('hear'), Math.max(120, dur * 800)));
      if (light) { kbd.light(n.midi, true); timers.push(setTimeout(() => kbd.light(n.midi, false), Math.max(140, dur * 900))); }
    }, ms));
  });
  const end = notes[notes.length - 1];
  const total = (end.at + end.beats) * spb * 1000 + 150;
  timers.push(setTimeout(() => { if (S.play === token) { S.play = null; $('#btn-repeat').classList.remove('busy'); idlePrompt(); } }, total));
  token.voices = voices; token.timers = timers;
  S.play = token;
  $('#btn-repeat').classList.add('busy');
  if (!S.solvedShown) setPrompt(samplesReady ? 'Listen…' : 'Tuning the piano…', true);
}

function stopPlayback() {
  const p = S.play;
  if (!p) return;
  S.play = null;
  for (const t of p.timers) clearTimeout(t);
  for (const v of p.voices) audio.noteOff(v);
  $$('#dots .dot.hear').forEach((d) => d.classList.remove('hear'));
  kbd.clearLights();
  $('#btn-repeat').classList.remove('busy');
}

// ---------------------------------------------------------------- answering
function keyDown(midi, source) {
  if (S.mode !== 'play' || dialogs.length) return;
  audio.unlock();
  if (S.play) { stopPlayback(); idlePrompt(); }
  const v = audio.noteOn(midi, { velocity: 0.9 });
  if (S.held.get(midi)) audio.noteOff(S.held.get(midi));
  S.held.set(midi, v);
  const r = S.round;
  if (!r || S.practice || r.done) return;
  const result = press(r, midi);
  if (result === 'wrong') {
    kbd.flash(midi, 'bad');
    const dot = $$('#dots .dot')[r.pos];
    if (dot) { dot.classList.remove('miss'); void dot.offsetWidth; dot.classList.add('miss'); }
    haptic([18, 40, 18]);
    if (!S.replay) syncHud();
    setPrompt(r.pos === 0 ? 'Not that one. Listen again with Repeat, or keep looking.' : `Not that one: note ${r.pos + 1} of ${r.notes.length}`);
    return;
  }
  kbd.flash(midi, 'ok');
  sparkOn(midi);
  haptic(12);
  syncDots();
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
  setTimeout(() => audio.chime(st), 380);
  const box = $('#play').getBoundingClientRect();
  const kb = $('#kbd').getBoundingClientRect();
  setTimeout(() => fx.burst(kb.left - box.left + kb.width / 2, kb.top - box.top + 10, 30 + st * 25, 0.7 + st * 0.15), 120);
  haptic([20, 50, 30]);
  // Reveal
  $('#prompt').hidden = true;
  $$('#stars i').forEach((s, i) => { s.classList.remove('on'); void s.offsetWidth; s.classList.toggle('on', i < st); });
  $('#song-title').textContent = m.title;
  const key = m.shift ? ` · transposed ${m.shift > 0 ? 'up' : 'down'} ${Math.abs(m.shift)} semitone${Math.abs(m.shift) === 1 ? '' : 's'}` : '';
  $('#song-by').textContent = `${m.by}${key} · starts on ${noteName(r.notes[0].midi, { flats: true })}`;
  $('#gain').textContent = S.replay ? '' : `+${gain}`;
  $('#solved').hidden = false;
  $('#solved').setAttribute('aria-label', `Solved: ${m.title}. ${st} star${st > 1 ? 's' : ''}.`);
  announce(`Solved: ${m.title}, ${st} star${st > 1 ? 's' : ''}${gain ? `, plus ${gain} points` : ''}.`);
  const sc = $('#hud-score'); sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump');
  syncHud();
}

function doRedo() {
  if (!S.round) return;
  stopPlayback();
  if (S.round.done) {
    // Solved already: start a fresh, unscored go at it.
    S.round = createRound(S.melody.notes);
    S.replay = true;
    S.solvedShown = false;
    $('#solved').hidden = true;
    $('#prompt').hidden = false;
  } else redo(S.round);
  syncDots(); syncMarker(); syncHud();
  setPrompt('From the top.');
  setTimeout(idlePrompt, 1200);
}
function doRepeat() { if (S.round) playMelody({ light: !!(S.round.done && settings.light) }); }
function doPractice() {
  S.practice = !S.practice;
  syncPractice();
  if (S.practice) stopPlayback();
  syncDots();
  idlePrompt();
}
function syncPractice() {
  $('#play').classList.toggle('practicing', S.practice);
  $('#btn-practice').setAttribute('aria-pressed', String(S.practice));
}
function doNext() {
  if (!S.round) return;
  if (!S.round.done) {
    toast(`Skipped: ${S.melody.title}`);
    progress.streak = 0; save();
  }
  nextMelody();
}
function setSpeed(v) {
  settings.speed = Math.round(Math.min(1.5, Math.max(0.5, v)) * 20) / 20;
  $('#speed').value = settings.speed;
  $('#speed-out').textContent = `${settings.speed.toFixed(2)}×`;
  save();
}
setSpeed(settings.speed);

$('#btn-repeat').addEventListener('click', doRepeat);
$('#btn-redo').addEventListener('click', doRedo);
$('#btn-practice').addEventListener('click', doPractice);
$('#btn-skip').addEventListener('click', doNext);
$('#btn-next-solved').addEventListener('click', nextMelody);
$('#btn-hear').addEventListener('click', () => playMelody({ light: settings.light }));
$('#speed').addEventListener('input', (e) => setSpeed(Number(e.target.value)));
$('#btn-pause').addEventListener('click', openPause);

// ---------------------------------------------------------------- title buttons
$('#start').addEventListener('click', start);
$('#btn-instructions').addEventListener('click', () => openDialog($('#instructions')));
$('#btn-settings').addEventListener('click', () => openDialog($('#settings')));
$('#btn-fullscreen').addEventListener('click', () => {
  // iPhone Safari can't go fullscreen: point at the ways it can lose its bars.
  if (chrome.scrollTrick) { const h = $('#bars-hint'); h.hidden = false; h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); announce(h.textContent); return; }
  if (fullscreenElement()) exitFullscreen(); else requestFullscreen();
});
$('#books-back').addEventListener('click', toTitle);

// ---------------------------------------------------------------- dialogs
const dialogs = []; // { el, returnFocus }
function openDialog(el) {
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
  d.el.hidden = true;
  if (d.returnFocus?.isConnected && !d.returnFocus.closest('[hidden]')) focusEl(d.returnFocus, padMode);
  chrome.update();
}
function closeAllDialogs() { while (dialogs.length) closeDialog(); }
function openPause() { if (S.mode === 'play' && !dialogs.length) openDialog($('#pause')); }
$$('[data-close]').forEach((b) => b.addEventListener('click', closeDialog));
$$('.dialog').forEach((d) => d.addEventListener('pointerdown', (e) => { if (e.target === d) closeDialog(); }));
$$('#pause [data-act]').forEach((b) => b.addEventListener('click', () => {
  const a = b.dataset.act;
  if (a === 'resume') closeDialog();
  if (a === 'instructions') openDialog($('#instructions'));
  if (a === 'settings') openDialog($('#settings'));
  if (a === 'books') { closeAllDialogs(); openBooks(); }
  if (a === 'title') toTitle();
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
  $('#set-reverb').value = settings.reverb; $('#set-reverb-out').textContent = `${Math.round(settings.reverb * 100)}%`;
  $('#set-first').checked = settings.first;
  $('#set-light').checked = settings.light;
  $('#set-vibrate').checked = settings.vibrate;
}
$('#set-volume').addEventListener('input', (e) => { settings.volume = Number(e.target.value); audio.setVolume(settings.volume); $('#set-volume-out').textContent = `${Math.round(settings.volume * 100)}%`; save(); });
$('#set-reverb').addEventListener('input', (e) => { settings.reverb = Number(e.target.value); audio.setReverb(settings.reverb); $('#set-reverb-out').textContent = `${Math.round(settings.reverb * 100)}%`; save(); });
$('#set-first').addEventListener('change', (e) => { settings.first = e.target.checked; save(); syncMarker(); });
$('#set-light').addEventListener('change', (e) => { settings.light = e.target.checked; save(); });
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
    } else if (S.solvedShown) moveFocus(dir);
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
    else if (i === BTN.LB) setSpeed(settings.speed - 0.05);
    else if (i === BTN.RB) setSpeed(settings.speed + 0.05);
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
  else if (k === '-' || k === '_') setSpeed(settings.speed - 0.05);
  else if (k === '=' || k === '+') setSpeed(settings.speed + 0.05);
  else if (k === 'Enter') { e.preventDefault(); if (!e.repeat) { if (S.round?.done) nextMelody(); else doNext(); } }
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopPlayback(); kbd.releaseAll(); audio.stopAll(); }
});
addEventListener('blur', () => kbd.releaseAll());

// ---------------------------------------------------------------- toasts and announcements
let toastT = 0;
function toast(text) {
  const t = $('#toast'); t.textContent = text; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200);
}
function announce(text) {
  const p = $('#prompt'); p.setAttribute('aria-label', text);
}

// Start on the title with Press Start ready for the keyboard.
show('title');
if (!TOUCH) focusEl($('#start'), false);
// For the browser checks.
window.__eartrainer = { S, LIB, progress, settings, audio, kbd };
