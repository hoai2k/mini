// Shell and game loop: title, chapter select, play, pause, results.

import { DrumReader, COMMANDS, SPIRIT_COMBO, TIER_POWER, commandById, parsePattern } from './rhythm.js';
import { createBattle, orderFor, spawnEnemy, issueOrder, addFlourish, stepArmy, stepEnemies, resolveIncoming, commandPower, tempoFactor, blocker, guard, shieldsUp, aboutToAttack } from './battle.js';
import { STAGES } from './stages.js';
import { EchoSession, CastingSession, callPattern, dueWaves } from './modes.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { Art } from './art.js';
import { PALETTE as P } from './palette.js';
import { createFit } from './fit.js';
import { createChrome, requestFullscreen, exitFullscreen, fullscreenElement, canFullscreen } from './chrome.js';

const $ = (s) => document.querySelector(s);
const STORE = 'bronzedrum.prototype';

// ---------------------------------------------------------------- storage

function load(key, fallback) {
  try {
    const v = localStorage.getItem(`${STORE}.${key}`);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(`${STORE}.${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep going */
  }
}

const settings = load('settings', { volume: 80, echo: 60, music: 60, ambience: 60, offset: 0, hints: true, vibration: true, reduceMotion: false });
// The prototype opens every chapter for review; winning still records progress.
const progress = load('progress', { unlocked: STAGES.length });
progress.unlocked = Math.max(progress.unlocked, STAGES.length);

// ---------------------------------------------------------------- systems

const art = new Art();
const sound = new Sound();
const canvas = $('#stage');
const renderer = new Renderer(canvas, art);
const input = new Input(canvas);

function applySettings() {
  sound.setVolume(settings.volume / 100);
  sound.setAmbience(settings.ambience / 100);
  sound.setMusic(settings.music / 100);
  input.vibration = settings.vibration;
  renderer.reduceMotion = settings.reduceMotion;
  document.body.classList.toggle('reduce-motion', settings.reduceMotion);
  for (const el of document.querySelectorAll('[data-setting]')) {
    const k = el.dataset.setting;
    if (el.type === 'checkbox') el.checked = settings[k];
    else {
      el.value = settings[k];
      el.nextElementSibling.textContent = settings[k];
    }
  }
  save('settings', settings);
}

// ---------------------------------------------------------------- screens

let screen = 'title';
let titleNav = false; // utility navigation on the title screen
const dialogs = []; // open dialog ids, top last
const focusMemory = new Map();

function show(id) {
  for (const s of ['title', 'select', 'pause', 'result']) $(`#${s}`).hidden = s !== id;
  // Menu music: the title theme, and the two sisters' theme on the chapter select.
  if (id === 'title') sound.playMusic('mu-title');
  if (id === 'select') sound.playMusic('mu-select');
  screen = id;
  input.mode = id === 'play' ? 'play' : 'menu';
  canvas.style.visibility = id === 'title' || id === 'select' ? 'hidden' : 'visible';
  document.body.classList.toggle('playing', id === 'play');
  chrome.update();
  if (id !== 'play') focusFirst(activeRoot());
  // The browser may drop the canvas once a menu goes over it and the game stops drawing.
  if (id !== 'play') requestAnimationFrame(redrawPaused);
}

function activeRoot() {
  if (dialogs.length) return $(`#${dialogs[dialogs.length - 1]}`);
  return screen === 'play' ? null : $(`#${screen}`);
}

function navItems(root) {
  if (!root) return [];
  return [...root.querySelectorAll('[data-nav]')].filter((el) => !el.disabled && el.offsetParent !== null);
}

function setFocus(el) {
  for (const n of document.querySelectorAll('.nav-focus')) n.classList.remove('nav-focus');
  if (!el) return;
  el.focus({ preventScroll: false });
  if (input.device === 'gamepad') el.classList.add('nav-focus');
}

function focusFirst(root) {
  const items = navItems(root);
  const first = items.find((el) => !el.closest('.corner-buttons')) || items[0];
  setFocus(first);
}

function openDialog(id) {
  focusMemory.set(id, document.activeElement);
  dialogs.push(id);
  $(`#${id}`).hidden = false;
  input.mode = 'menu';
  focusFirst($(`#${id}`));
  // Open at the top, even when focus landed on a button further down.
  $(`#${id} .panel`).scrollTop = 0;
  requestAnimationFrame(redrawPaused);
}

function closeDialog() {
  const id = dialogs.pop();
  if (!id) return;
  sound.play('ui-back');
  $(`#${id}`).hidden = true;
  const back = focusMemory.get(id);
  if (back && back.offsetParent !== null) setFocus(back);
  else focusFirst(activeRoot());
}

/** Spatial navigation: the nearest item in the pressed direction. */
function move(dir) {
  const root = activeRoot();
  const items = navItems(root);
  if (!items.length) return;
  const cur = document.activeElement;
  if (cur && cur.type === 'range' && (dir === 'left' || dir === 'right')) {
    if (dir === 'left') cur.stepDown();
    else cur.stepUp();
    cur.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  if (dir === 'down' || dir === 'up') {
    const scroller = root.querySelector('.scroll');
    if (scroller && cur && cur.dataset.action === 'close' && dir === 'up' && scroller.scrollTop > 0) {
      scroller.scrollBy({ top: -120 });
      return;
    }
    if (scroller && cur && cur.dataset.action === 'close' && dir === 'down' && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2) {
      scroller.scrollBy({ top: 120 });
      return;
    }
  }
  if (!items.includes(cur)) return setFocus(items[0]);
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best = null;
  let bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax;
    const dy = b.top + b.height / 2 - ay;
    const along = { left: -dx, right: dx, up: -dy, down: dy }[dir];
    if (along <= 4) continue;
    const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  sound.play('ui-move');
  if (best) setFocus(best);
  else {
    // Wrap within a vertical menu.
    const i = items.indexOf(cur);
    if (dir === 'down') setFocus(items[(i + 1) % items.length]);
    if (dir === 'up') setFocus(items[(i - 1 + items.length) % items.length]);
  }
}

function activate(el) {
  if (!el) return;
  if (el.type === 'checkbox') {
    el.checked = !el.checked;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else el.click();
}

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------------------------------------------------------------- fullscreen

const coarsePointer = window.matchMedia('(pointer: coarse)');
// Browser bars: fullscreen on the first tap in landscape where possible; on
// iPhone Safari, a swipe up tucks the bars away (see src/chrome.js).
const chrome = createChrome({ isPlaying: () => screen === 'play', hintEl: $('#bars-hint') });
function enterFullscreen() {
  if (coarsePointer.matches || !chrome.scrollTrick) requestFullscreen();
}
async function toggleFullscreen() {
  // iPhone Safari can't go fullscreen: point at the ways it can lose its bars.
  if (chrome.scrollTrick) {
    const h = $('#bars-hint');
    h.hidden = false;
    h.classList.remove('flash');
    void h.offsetWidth;
    h.classList.add('flash');
    return;
  }
  if (!canFullscreen()) return toast('Fullscreen is not available here');
  if (fullscreenElement()) await exitFullscreen();
  else await requestFullscreen();
}
// Resizing clears the canvas; while paused nothing else redraws it, so draw
// the frozen scene again (Esc leaves fullscreen as it pauses, phones rotate).
function redrawPaused() {
  if (game && screen !== 'play' && screen !== 'title' && screen !== 'select') renderer.draw(view(), 0);
}


// ---------------------------------------------------------------- chapter select

function buildCards() {
  const box = $('#stage-cards');
  box.innerHTML = '';
  const intro = $('#stage-intro');
  STAGES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.nav = '';
    b.disabled = i >= progress.unlocked;
    const img = art.get(`card-${s.id}`);
    b.innerHTML = `<span class="card-art${img ? '' : ' plain'}" aria-hidden="true"></span><span class="num">Chapter ${i + 1}</span><span class="name"></span><span class="sub"></span>`;
    if (img) b.querySelector('.card-art').style.backgroundImage = `url(${img.src})`;
    b.querySelector('.name').textContent = s.title;
    b.querySelector('.sub').textContent = s.subtitle;
    b.setAttribute('aria-description', s.intro);
    const describe = () => {
      intro.textContent = i < progress.unlocked ? s.intro : 'Win the chapter before to unlock.';
    };
    b.addEventListener('focus', describe);
    b.addEventListener('mouseenter', describe);
    b.addEventListener('click', () => startStage(i));
    box.appendChild(b);
  });
  intro.textContent = STAGES[0].intro;
}

function buildCommandTable() {
  const t = $('#cmd-table');
  t.innerHTML = '<tr><th>Command</th><th>I</th><th>II · ×1.4</th><th>III · ×1.96</th></tr>';
  const effects = {
    march: 'Advance (stops at the enemy line).',
    strike: 'Spears hit the front enemy; archers shoot. At Luy Lâu, with the drum awake, the war elephant charges instead: it tramples everything near it and spends the drum’s spirit.',
  };
  const cell = (text) =>
    text
      .split(' ')
      .map((beat) => {
        const dots = [...beat].map((d) => `<span class="${d === 'L' ? 'g-l' : 'g-r'}${beat.length > 1 ? ' sub' : ''}"></span>`).join('');
        return beat.length > 1 ? `<span class="group g${beat.length}">${dots}</span>` : dots;
      })
      .join(' ');
  for (const c of COMMANDS) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${c.name}</strong> · ${c.gloss}<br><small>${effects[c.id]}</small></td>${c.tiers.map((x) => `<td class="pat">${cell(x)}</td>`).join('')}`;
    t.appendChild(tr);
  }
}

// ---------------------------------------------------------------- play

let game = null;

// The army keeps a march or a strike going in the player's
// groove for up to this many extra four-beat cycles, at reduced power, until
// the next phrase starts. The elephant charge happens once.
const SUSTAIN = { march: 0.6, strike: 0.5 };
const SUSTAIN_CYCLES = 2;

function startStage(i) {
  const stage = STAGES[i];
  sound.start();
  game = {
    index: i,
    stage,
    hanBeat: 60 / stage.bpm, // the Han war drum keeps the chapter's tempo
    mode: stage.mode || 'battle',
    reader: new DrumReader({ unlocked: stage.unlocked || [], maxTier: stage.maxTier || 3 }),
    session: null, // echo or casting session (modes.js)
    spawned: new Set(), // hold-the-line waves already on the field
    crackAt: -9,
    battle: createBattle(stage),
    clockStart: sound.now + 0.6,
    nextHan: 1,
    armyBeats: [], // { t, order? } on the player's beats
    cycle: null, // the army's current four-beat cycle
    echoes: [], // scheduled echo-drum sources, cancelled when a new phrase starts
    feedback: null,
    ended: false,
    introUntil: 7,
    commandsDone: 0,
    tiersUsed: new Set(),
    flourishTaught: false,
    guards: 0,
    blocks: 0,
  };
  if (game.mode === 'echo') {
    game.session = new EchoSession({ calls: stage.calls, matchTempo: stage.matchTempo, tolerance: stage.tolerance });
    game.reader.patterns = [];
    game.session.nextCallAt = 2.2;
  } else if (game.mode === 'casting') {
    game.session = new CastingSession({ drums: stage.drums, pours: stage.pours, tolerance: stage.tolerance });
    game.reader.patterns = [callPattern(stage.rhythm, 'cast')];
  }
  renderer.setStage(stage);
  sound.loadSamples().then(() => {
    if (game && game.stage === stage) {
      sound.startAmbience(stage.ambience);
      // A beatless bed under the chapter, quieter than the menus.
      if (stage.music) sound.playMusic(stage.music, { level: 0.55 });
    }
  });
  if (document.activeElement) document.activeElement.blur();
  show('play');
}

function songTime() {
  return sound.now - game.clockStart;
}

/** Map an input timestamp (performance clock) onto the heard game clock. */
function hitTime(perfMs) {
  const ctx = sound.ctx;
  let heard;
  const ts = ctx && ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
  if (ts && ts.performanceTime > 0) heard = ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  else heard = sound.now - (performance.now() - perfMs) / 1000 - sound.latency;
  return heard - game.clockStart - settings.offset / 1000;
}

function feedback(text, color) {
  game.feedback = { text, color, t: songTime() };
}

/** A short confirmation under the drum for the reset and guard buttons. */
function confirm(text, color) {
  game.confirm = { text, color, t: songTime() };
}

input.on('drum', ({ drum, time }) => strike(drum, time));
input.on('action', ({ action, time }) => act(action, time));

// Touch: the renderer's layout says what was tapped (the drum's centre or
// rim, the shield, reset or pause button), then it is handled like a key.
input.on('touch', ({ x, y, time }) => {
  if (screen !== 'play' || dialogs.length || !game || game.ended) return;
  const target = renderer.touchTarget(x, y, game.mode);
  renderer.touched(x, y, target, songTime());
  if (target === 'L' || target === 'R') strike(target, time);
  else if (target === 'pause') pause();
  else if (target !== 'none') act(target, time);
});
// A swipe across the drum or the dots resets the rhythm, like the mõ.
input.on('swipe', ({ x0, y0, x, y, time }) => {
  if (screen !== 'play' || dialogs.length || !game || game.ended) return;
  if (!renderer.swipeResets(x0, y0)) return;
  renderer.swiped(x0, y0, x, y, songTime());
  act('reset', time);
});

function strike(drum, time) {
  if (screen !== 'play' || dialogs.length || !game || game.ended) return;
  const t = hitTime(time);
  if (drum === 'L') sound.tung();
  else sound.cac(undefined, game.reader.busy(t));
  renderer.hit(drum, songTime());
  input.rumble(drum === 'L' ? 50 : 30, drum === 'L' ? 0.6 : 0.3);
  if (game.mode === 'echo' && game.session.listening(t)) {
    feedback('Listen first — then answer', P.paperShade);
    return;
  }
  for (const ev of game.reader.hit(drum, t)) handleRhythm(ev);
}

function act(action, time) {
  if (screen !== 'play' || dialogs.length || !game || game.ended) return;
  if (action === 'reset') {
    // Clear the phrase: a knock on the wooden slit drum (mõ), the dots tumble
    // away and "Cleared" shows under the drum.
    sound.play('drum-mo', sound.now, 0.8);
    renderer.kick('mo', songTime());
    input.rumble(25, 0.3);
    const shown = view().phraseView;
    const events = game.reader.reset();
    if (events.length && shown && !shown.done) renderer.clearDots(shown, songTime());
    for (const ev of events) handleRhythm(ev);
  } else if (action === 'guard') {
    // The shield wall: separate from the drum, timed to attacks in flight.
    const t = hitTime(time);
    if (guard(game.battle, Math.max(t, game.battle.time))) {
      // A stroke on the big hide barrel drum (trống chầu) calls the shields up.
      sound.play('drum-chau', sound.now, 0.9);
      renderer.kick('chau', songTime());
      sound.play('cmd-shield', sound.now + 0.04, 0.6);
      input.rumble(40, 0.3);
      game.guards += 1;
    }
  }
}

/**
 * Start one of the army's four-beat cycles at the player's tempo: four army
 * beats, the command's sound, two shouts, and the echo drums replaying the
 * pattern. Later cycles of a sustained order are quieter and weaker.
 */
function startCycle(c) {
  const g = game;
  g.cycle = c;
  for (let k = 0; k < 4; k++) g.armyBeats.push({ t: c.start + k * c.u, order: k === 0 ? c : null });
  const at = g.clockStart + c.start;
  if (c.index === 0) {
    if (sound.has('call')) {
      sound.play(`cmd-${c.command}`, at);
      sound.call(at);
      sound.call(at + 2 * c.u);
    } else {
      for (let k = 0; k < 4; k++) sound.call(at + k * c.u, 1 + k * 0.06 + (c.spirit ? 0.2 : 0));
    }
  }
  // The army's drums answer with the same pattern, at the same speed.
  const level = (settings.echo / 100) * (c.index === 0 ? 0.55 : 0.4);
  for (const s of c.pattern.strokes) {
    const src = sound.echo(s.drum, at + s.pos * c.u, level);
    if (src) g.echoes.push(src);
  }
}

/** The player has started a new phrase: the army stops keeping the old groove. */
function endSustain() {
  const g = game;
  const t = songTime();
  g.armyBeats = g.armyBeats.filter((b) => b.t <= t);
  for (const src of g.echoes) {
    try {
      src.stop();
    } catch {
      /* already finished */
    }
  }
  g.echoes = [];
  if (g.cycle && g.cycle.index > 0) g.battle.order = null;
  g.cycle = null;
}

function handleRhythm(ev) {
  const g = game;
  if (ev.type === 'phraseStart') {
    endSustain();
  } else if (ev.type === 'command' && g.mode === 'echo') {
    for (const e of g.session.answer(ev, songTime())) handleMode(e);
  } else if (ev.type === 'command' && g.mode === 'casting') {
    for (const e of g.session.pour(ev)) handleMode(e);
  } else if (ev.type === 'command') {
    const c = commandById(ev.command);
    // With the elephant, a strike on a waking drum is the charge; it spends the drum.
    const order = orderFor(g.battle, ev.command, ev.spirit);
    if (order === 'charge') g.reader.combo = 0;
    const power = commandPower(ev.accuracy, ev.spirit, TIER_POWER[ev.tier - 1]) * tempoFactor(ev.u);
    startCycle({ command: order, pattern: ev.pattern, tier: ev.tier, u: ev.u, start: ev.start, power, index: 0, spirit: ev.spirit });
    const bpm = Math.round(60 / ev.u);
    const name = order === 'charge' ? 'Voi! The elephant charges' : `${c.name} ${['', 'I', 'II', 'III'][ev.tier]}`;
    feedback(`${ev.even ? 'Even!' : 'Good'}  ${name} · ${bpm} BPM`, ev.even ? P.bronzeLight : P.paper);
    if (ev.spirit && ev.combo === SPIRIT_COMBO) {
      toast('Trống thức — the drum wakes!');
      sound.play('drum-wake');
      sound.play('cmd-rally', sound.now + 0.3, 0.7);
      sound.musicOverlay('mu-wake');
    }
    g.commandsDone += 1;
    g.tiersUsed.add(ev.tier);
  } else if (ev.type === 'flourish') {
    addFlourish(g.battle);
    feedback(`Nhị’s flourish ×${ev.count}`, P.lacquer);
    g.flourishTaught = true;
  } else if (ev.type === 'reset') {
    if (ev.reason === 'manual') confirm('Cleared', P.paperShade);
    else if (ev.reason !== 'no-pattern' && ev.strokes >= 2) feedback(ev.reason === 'timeout' ? 'The rhythm fades' : 'Uneven — start again', P.paperShade);
    if (ev.reason === 'no-pattern') sound.miss();
  } else if (ev.type === 'comboLost') {
    if (ev.combo > 1 && g.mode === 'battle') feedback('Chain broken', P.paperShade);
  }
}

/** Echo and casting events: sounds, confirmations, the end of the chapter. */
function handleMode(e) {
  const g = game;
  const t = songTime();
  const stage = g.stage;
  switch (e.type) {
    case 'call': {
      // The caller's drum plays the rhythm; the reader will only accept that rhythm.
      g.reader.patterns = [e.call.pattern];
      g.reader.phrase = [];
      const voice = { mourning: 0.72, village: 1.08, festival: 1.18, elegy: 0.8 }[stage.caller] || 1;
      for (const s of e.call.strokes) sound.echo(s.drum, g.clockStart + s.t, 0.75, voice);
      if (e.call.label) feedback(`${e.call.label} calls`, P.paperShade);
      break;
    }
    case 'yourTurn':
      feedback('Your turn', P.paper);
      break;
    case 'repeat':
      feedback('Again — listen', P.paperShade);
      break;
    case 'offTempo':
      feedback(e.faster ? 'Too fast — match their speed' : 'Too slow — match their speed', P.lacquer);
      g.reader.action = null;
      g.reader.shown = null;
      break;
    case 'answered': {
      const words = { mourning: 'An incense stick is lit', village: `${e.call.label || 'The village'} answers`, festival: 'The crowd roars', elegy: 'A drum falls silent' };
      confirm(words[stage.caller] || 'Answered', P.bronzeLight);
      if (stage.caller === 'festival') sound.play('crowd-cheer', sound.now + 0.2, 0.8);
      else if (stage.caller !== 'elegy') sound.play('lantern', sound.now + 0.1, 0.8);
      break;
    }
    case 'pour':
      confirm(`Steady — pour ${e.level} of ${e.of}`, P.bronzeLight);
      sound.play('pour', sound.now, 0.8);
      break;
    case 'crack':
      confirm(e.faster ? 'Too fast — the mould cracks' : 'Too slow — the mould cracks', P.lacquer);
      sound.play('crack');
      g.crackAt = t;
      break;
    case 'cast':
      toast(`Drum ${e.drum + 1} is cast`);
      sound.play('drum-wake', sound.now + 0.3, 0.6);
      break;
    case 'complete':
      g.evenness = e.evenness;
      finish('won');
      break;
  }
}

function hint(view) {
  const g = game;
  const t = view.songTime;
  if (t < g.introUntil && g.stage.id !== 'garden') return g.stage.intro.split('. ')[0] + '.';
  if (!settings.hints) return null;
  const keys = {
    keyboard: { L: 'F', R: 'J' },
    gamepad: { L: 'LB', R: 'RB' },
    pointer: { L: 'left', R: 'right' },
    touch: { L: '●', R: '○' },
  }[input.device] || { L: 'F', R: 'J' };
  const touch = input.device === 'touch';
  const say = (id, tier = 1) => {
    const c = commandById(id);
    const text = c.tiers[tier - 1].split(' ').map((beat) => [...beat].map((d) => keys[d]).join(input.device === 'pointer' ? '-' : '')).join(' ');
    return `${c.name}${tier > 1 ? ' ' + ['', 'I', 'II', 'III'][tier] : ''}: ${text}`;
  };
  const b = g.battle;
  const front = blocker(b);
  const near = front && front.x - b.army.x <= 4.6;
  if (g.mode === 'echo') {
    const sess = g.session;
    if (sess.phase === 'calling') return 'Listen to the call…';
    if (sess.phase === 'answer' && sess.index === 0) {
      return touch ? 'Now answer it: the same rhythm, evenly (● centre = tùng, ○ rim = cắc)' : `Now answer it: the same rhythm, evenly (${keys.L} = tùng, ${keys.R} = cắc)`;
    }
    return null;
  }
  if (g.mode === 'casting') {
    const sess = g.session;
    if (sess.u === null) return `Drum the hammer rhythm at a speed you can hold: ${g.stage.rhythm.split(' ').map((b) => [...b].map((d) => keys[d]).join('')).join(' ')}`;
    return `Hold ${Math.round(60 / sess.u)} BPM — every phrase the same speed`;
  }
  if (g.stage.id === 'mavien' && view.songTime < 20) return 'Hold the ford — strike the columns, shield every volley';
  if (g.stage.id === 'garden') {
    if (g.commandsDone === 0) return touch ? `Tap the drum evenly (● centre, ○ rim) — ${say('march')}` : `Drum evenly, at any speed — ${say('march')}`;
    if (near) return g.tiersUsed.has(2) ? `In reach — ${say('strike')}  or  ${say('strike', 2)}` : `In reach — ${say('strike')}`;
    if (!g.tiersUsed.has(2)) return `Stronger: two quick strokes share a beat — ${say('march', 2)}`;
    if (g.commandsDone >= 3 && !g.flourishTaught) return `While they answer, tap ${touch ? 'the rim' : keys.R} between their beats for Nhị’s flourish`;
    return null;
  }
  const guardKey = { keyboard: 'Space', gamepad: 'A', pointer: 'tap the drum', touch: 'the Shield button' }[input.device] || 'Space';
  if (g.index > 0 && (view.threats.length || view.incoming) && g.blocks < 3 && !view.shieldsUp) return `Attack coming — shield (${guardKey}) while it is in the air`;
  if (g.stage.id === 'outpost' && b.enemies.some((e) => e.alive && e.type === 'crossbow' && e.x - b.army.x <= 14) && g.commandsDone < 12) {
    return `Triplets hit hardest — ${say('strike', 3)}`;
  }
  if (g.stage.id === 'luylau' && near && g.reader.spirit) return `The drum is awake — strike and the elephant charges: ${say('strike')}`;
  if (g.stage.id === 'luylau' && !g.reader.spirit && g.commandsDone < 6) return 'Chain four commands to wake the drum — then a strike becomes the elephant charge';
  return null;
}

function updatePlay(dt) {
  const g = game;
  const t = songTime();
  for (const ev of g.reader.update(t)) handleRhythm(ev);
  if (g.mode === 'echo' && !g.ended) for (const e of g.session.update(t)) handleMode(e);
  if (g.mode !== 'battle') {
    // No battle in echo and casting chapters: just the scene.
    renderer.draw(view(), dt);
    return;
  }
  // Hold the line: new columns arrive.
  if (g.stage.waves) {
    for (const w of dueWaves(g.stage.waves, t, g.spawned)) {
      for (const e of w.enemies) spawnEnemy(g.battle, e.type, e.dx);
      sound.play('han-horn');
    }
  }
  // A sustained order rolls into its next cycle unless a new phrase began.
  const c = g.cycle;
  if (c && t >= c.start + 4 * c.u - 0.15 && !g.reader.phrase.length) {
    const keep = SUSTAIN[c.command];
    if (keep && c.index < SUSTAIN_CYCLES && !g.ended) {
      startCycle({ ...c, start: c.start + 4 * c.u, power: (c.index === 0 ? c.power * keep : c.power), index: c.index + 1 });
    } else if (t >= c.start + 4 * c.u) g.cycle = null;
  }
  const events = [];
  // The army on the player's beats.
  while (g.armyBeats.length && g.armyBeats[0].t <= t && !g.ended) {
    const beat = g.armyBeats.shift();
    if (beat.order) issueOrder(g.battle, beat.order.command, beat.order.power, beat.order.u);
    events.push(...stepArmy(g.battle, beat.t));
  }
  // The Han on their war drum.
  while (g.nextHan * g.hanBeat <= t && !g.ended && !g.battle.outcome) {
    events.push(...stepEnemies(g.battle, g.nextHan * g.hanBeat));
    g.nextHan += 1;
  }
  // Their blows land: deflected if the shield wall is up when they arrive.
  if (!g.ended) events.push(...resolveIncoming(g.battle, t));
  if (events.length) renderer.spawn(events, view());
  for (const ev of events) {
    battleSound(ev);
    if (ev.type === 'trample') input.rumble(300, 1);
    if (ev.type === 'wound') input.rumble(80, 0.4);
    if (ev.type === 'deflect') {
      g.blocks += 1;
      confirm('Defended', P.bronzeLight);
    }
    if (ev.type === 'outcome') finish(ev.outcome);
  }
  renderer.draw(view(), dt);
}

/** Effects for battle events: samples where loaded, synth otherwise. */
function battleSound(ev) {
  const b = game.battle;
  const enemy = (id) => b.enemies.find((e) => e.id === id);
  switch (ev.type) {
    case 'damage': {
      const straw = enemy(ev.target)?.type === 'target';
      if (!sound.play(straw ? 'hit-straw' : 'hit-paper', sound.now, ev.source === 'arrow' ? 0.6 : 1) && ev.source !== 'arrow') sound.clash();
      break;
    }
    case 'defeated':
      if (ev.enemy === 'fort') sound.play('fort-break');
      else if (ev.enemy !== 'target') sound.play('defeat-han');
      break;
    case 'volley':
      sound.play('volley');
      break;
    case 'launch':
      if (ev.kind !== 'spear') sound.play('volley', sound.now, 0.6);
      break;
    case 'deflect':
      sound.play('blocked');
      break;
    case 'wound':
      sound.play(ev.kind === 'spear' ? 'hit-paper' : 'bolts', sound.now, 0.8);
      sound.play('wound', sound.now, 0.6);
      break;
    case 'trample':
      if (!sound.play('trample')) sound.thud();
      break;
    case 'outcome':
      sound.stopAmbience();
      sound.play(ev.outcome === 'won' ? 'victory' : 'defeat');
      break;
  }
}

function view() {
  const g = game;
  const t = songTime();
  const r = g.reader;
  const c = g.cycle;
  // The army's beat when it is answering; otherwise a slow idle sway.
  const beatFloat = c ? (t - c.start) / c.u : t / 0.8;
  let phraseView = null;
  let heron = -1;
  if (r.shown) {
    phraseView = { pattern: r.shown.pattern, filled: Infinity, done: true, sustain: false };
  } else if (r.phrase.length) {
    const best = r.progress();
    if (best) {
      phraseView = { pattern: best.pattern, filled: r.phrase.length, done: false };
      heron = Math.floor(best.pattern.strokes[r.phrase.length - 1].pos);
    }
  }
  if (c && t >= c.start) heron = Math.floor(beatFloat) % 4;
  // Echo chapters: show the caller's rhythm as it is played, then wait for the answer.
  if (g.mode === 'echo' && g.session.call) {
    const call = g.session.call;
    if (g.session.phase === 'calling') {
      const played = call.strokes.filter((st) => st.t <= t).length;
      phraseView = { pattern: call.pattern, filled: played, done: false, caller: true };
      heron = played ? Math.floor(call.pattern.strokes[played - 1].pos) : -1;
    } else if (g.session.phase === 'answer' && !phraseView) {
      phraseView = { pattern: call.pattern, filled: 0, done: false };
    }
  }
  if (g.mode === 'casting' && !phraseView) phraseView = { pattern: g.reader.patterns[0], filled: 0, done: false };
  const v = {
    battle: g.battle,
    songTime: t,
    beatFloat,
    heron,
    phraseView,
    ready: !r.action && !r.phrase.length,
    shieldsUp: shieldsUp(g.battle, t),
    // The army's current cycle, so the animation can follow the drummed strokes.
    cycle: c && t >= c.start - 0.05 ? { start: c.start, u: c.u, command: c.command, strokes: c.pattern.strokes } : null,
    threats: aboutToAttack(g.battle),
    incoming: g.battle.incoming.length,
    guardAt: g.battle.guardAt,
    guardUntil: g.battle.guardUntil,
    confirm: g.confirm,
    sustaining: !!(c && c.index > 0 && !r.phrase.length),
    inResponse: !!g.battle.order,
    responseCommand: g.battle.order ? g.battle.order.command : null,
    combo: r.combo,
    spirit: r.spirit,
    feedback: g.feedback,
    unlocked: g.stage.unlocked || [],
    maxTier: g.stage.maxTier || 3,
    mode: g.mode,
    stage: g.stage,
    session: g.session,
    crackAt: g.crackAt,
    pouring: g.mode === 'casting' && !!r.action && t >= r.action.start,
    touch: input.device === 'touch',
  };
  v.hint = hint(v);
  return v;
}

const RESULTS = {
  garden: 'The straw targets are down. The women know the drum.',
  oath: 'The incense burns for your father. The sisters swear to drive out the Han.',
  casting: 'Three bronze drums, cast true. They will carry across the delta.',
  villages: 'Lanterns burn along the river from Phong Châu to Giao Chỉ. The villages will fight.',
  outpost: 'The drum carries across the water. The ford is yours.',
  luylau: 'Luy Lâu falls and the governor flees north. Sixty-five citadels are free.',
  coronation: 'Trưng Trắc and Trưng Nhị are queens of the Lạc Việt.',
  mavien: 'The ford held until Mê Linh was empty. The sisters’ army withdraws, still unbroken.',
  elegy: 'The last drum falls silent. They will be cast into a bronze horse — but the rhythm is remembered. (End of the prototype.)',
};

function finish(outcome) {
  game.ended = true;
  const won = outcome === 'won';
  if (won && progress.unlocked < Math.min(STAGES.length, game.index + 2)) {
    progress.unlocked = Math.min(STAGES.length, game.index + 2);
    save('progress', progress);
  }
  setTimeout(() => {
    if (!game || screen !== 'play') return;
    const peaceful = game.mode !== 'battle';
    sound.playMusic(!won ? 'mu-defeat' : game.stage.id === 'elegy' ? 'mu-ending' : peaceful ? 'mu-complete' : 'mu-victory', { fade: 0.3 });
    $('#result-title').textContent = won ? (peaceful ? 'Chapter complete' : 'Victory') : 'The line breaks';
    const even = game.evenness !== undefined ? ` Evenness: ${Math.round(game.evenness * 100)}%.` : '';
    $('#result-text').textContent = won
      ? RESULTS[game.stage.id] + even
      : 'The women fall back to regroup. Raise the shields while the bolts are in the air.';
    $('#result-next').hidden = !won || game.index >= STAGES.length - 1;
    show('result');
  }, 1600);
}

function pause(reason = '') {
  if (screen !== 'play' || !game || game.ended) return;
  if (sound.ctx) sound.ctx.suspend();
  sound.pauseMusic(true);
  $('#pause-reason').textContent = reason;
  show('pause');
}

function resume() {
  if (sound.ctx) sound.ctx.resume();
  sound.pauseMusic(false);
  show('play');
}

// ---------------------------------------------------------------- actions

function action(name) {
  switch (name) {
    case 'resume':
      return resume();
    case 'restart':
      if (sound.ctx) sound.ctx.resume();
      return startStage(game.index);
    case 'next':
      return startStage(game.index + 1);
    case 'select':
      sound.stopAmbience();
      game = null;
      buildCards();
      return show('select');
    case 'title':
      if (sound.ctx) sound.ctx.resume();
      sound.stopAmbience();
      game = null;
      titleNav = false;
      return show('title');
    case 'fullscreen':
      return toggleFullscreen();
    case 'close':
      return closeDialog();
  }
}

function pressStart() {
  sound.start();
  sound.loadSamples().then(() => {
    sound.play('ui-start');
    if (screen === 'select') sound.playMusic('mu-select');
  });
  enterFullscreen();
  buildCards();
  show('select');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn && btn.id !== 'press-start' && btn.dataset.action !== 'close') sound.play('ui-confirm');
  const el = e.target.closest('[data-action],[data-open]');
  if (!el) return;
  if (el.dataset.open) openDialog(el.dataset.open);
  else action(el.dataset.action);
});
$('#press-start').addEventListener('click', pressStart);
for (const el of document.querySelectorAll('[data-setting]')) {
  const ev = el.type === 'checkbox' ? 'change' : 'input';
  el.addEventListener(ev, () => {
    settings[el.dataset.setting] = el.type === 'checkbox' ? el.checked : Number(el.value);
    applySettings();
  });
}

input.on('nav', (dir) => {
  if (dialogs.length) {
    if (dir === 'back') return closeDialog();
    if (dir === 'confirm') return activate(document.activeElement);
    if (dir === 'menu') return;
    return move(dir);
  }
  if (screen === 'play') {
    if (dir === 'menu') pause();
    return;
  }
  if (screen === 'pause' && (dir === 'menu' || dir === 'back')) return resume();
  if (screen === 'title') {
    if (input.device === 'gamepad' && !titleNav) return; // handled by padButton: any button starts
    if (dir === 'menu') return pressStart();
    if (dir === 'confirm') return activate(document.activeElement || $('#press-start'));
    return move(dir);
  }
  if (screen === 'select' && dir === 'back') return action('title');
  if (dir === 'confirm') return activate(document.activeElement);
  if (dir === 'menu') return;
  move(dir);
});

input.on('padButton', () => {
  if (screen === 'title' && !titleNav && !dialogs.length) pressStart();
});
input.on('stick', () => {
  if (screen === 'title' && !titleNav && !dialogs.length) {
    titleNav = true;
    $('#title-hint').textContent = 'A select · Menu start';
  }
});
input.on('device', (d) => {
  if (d.type === 'disconnected' && screen === 'play') pause('Controller disconnected — reconnect it or use the keyboard.');
  if (d.type === 'connected') toast('Controller connected');
  if (d.type === 'switch') {
    const f = document.activeElement;
    if (d.device === 'gamepad' && f && f !== document.body) f.classList.add('nav-focus');
    if (d.device !== 'gamepad') for (const n of document.querySelectorAll('.nav-focus')) n.classList.remove('nav-focus');
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// ---------------------------------------------------------------- loop

const portraitTouch = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.poll();
  // A phone or tablet held upright: the drum and the field need the width.
  if (screen === 'play' && !dialogs.length && portraitTouch.matches) pause('Turn your device sideways to play.');
  if (game && screen === 'play') updatePlay(dt);
  requestAnimationFrame(frame);
}

async function boot() {
  // The canvas follows the visible viewport, not 100vh (src/fit.js); the
  // renderer matches its pixels to the new size, then the paused scene redraws.
  createFit({
    app: $('#app'),
    stage: canvas,
    onChange: () => {
      renderer.resize();
      redrawPaused();
    },
  });
  applySettings();
  if (coarsePointer.matches) {
    $('#title-hint').textContent = chrome.scrollTrick || window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches
      ? 'Best played with the device sideways'
      : 'Best played sideways · tip: Add to Home Screen to play full screen';
  }
  buildCommandTable();
  // The title is usable at once: on a slow connection the player may press
  // start before the art has arrived, so loading must not send them back.
  show('title');
  requestAnimationFrame(frame);
  await art.load();
  const logo = art.get('logo');
  if (logo) {
    $('#logo-img').src = logo.src;
    $('#logo-img').alt = 'Bronze Drum';
    $('#logo-img').hidden = false;
    $('#logo-text').classList.add('visually-hidden');
  }
  // Dialogs are cut from the delivered paper sheet (BD-U04) when it is here.
  const sheet = art.get('ui-panel');
  if (sheet) {
    document.documentElement.style.setProperty('--panel-art', `url("${sheet.src}")`);
    document.body.classList.add('paper-panels');
  }
  // Cards built before the art arrived get their pictures now.
  document.querySelectorAll('#stage-cards .card-art').forEach((el, i) => {
    const img = art.get(`card-${STAGES[i].id}`);
    if (!img) return;
    el.classList.remove('plain');
    el.style.backgroundImage = `url(${img.src})`;
  });
}

// Debug hooks for automated checks.
window.__bronzeDrum = { get game() { return game; }, renderer, sound, startStage, STAGES, songTime: () => (game ? songTime() : null), threats: () => (game ? aboutToAttack(game.battle) : []) };

boot();
