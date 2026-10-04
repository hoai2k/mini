// Shell and game loop: title, chapter select, play, pause, results.

import { DrumReader, COMMANDS, SPIRIT_COMBO } from './rhythm.js';
import { createBattle, issueOrder, addFlourish, stepBeat, commandPower, blocker } from './battle.js';
import { STAGES } from './stages.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { Art } from './art.js';
import { PALETTE as P } from './palette.js';

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

const settings = load('settings', { volume: 80, metronome: 50, offset: 0, hints: true, vibration: true, reduceMotion: false });
// The prototype opens every chapter for review; winning still records progress.
const progress = load('progress', { unlocked: STAGES.length });

// ---------------------------------------------------------------- systems

const art = new Art();
const sound = new Sound();
const canvas = $('#stage');
const renderer = new Renderer(canvas, art);
const input = new Input(canvas);

function applySettings() {
  sound.setVolume(settings.volume / 100);
  sound.metronome = settings.metronome / 100;
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
  screen = id;
  input.mode = id === 'play' ? 'play' : 'menu';
  canvas.style.visibility = id === 'title' || id === 'select' ? 'hidden' : 'visible';
  if (id !== 'play') focusFirst(activeRoot());
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
}

function closeDialog() {
  const id = dialogs.pop();
  if (!id) return;
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

async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    /* refused: carry on windowed */
  }
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    toast('Fullscreen is not available here');
  }
}
document.addEventListener('fullscreenchange', () => renderer.resize());

// ---------------------------------------------------------------- chapter select

function buildCards() {
  const box = $('#stage-cards');
  box.innerHTML = '';
  STAGES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.nav = '';
    b.disabled = i >= progress.unlocked;
    const img = art.get(`card-${s.id}`);
    if (img) b.style.backgroundImage = `linear-gradient(rgba(242,232,213,0.82), rgba(242,232,213,0.92)), url(${img.src})`;
    b.innerHTML = `<span class="num">Chapter ${i + 1}</span><span class="name"></span><span class="sub"></span><span class="intro"></span>`;
    b.querySelector('.name').textContent = s.title;
    b.querySelector('.sub').textContent = s.subtitle;
    b.querySelector('.intro').textContent = i < progress.unlocked ? s.intro : 'Win the chapter before to unlock.';
    b.addEventListener('click', () => startStage(i));
    box.appendChild(b);
  });
}

function buildCommandTable() {
  const t = $('#cmd-table');
  t.innerHTML = '<tr><th>Drum</th><th>Command</th><th>Effect</th></tr>';
  const effects = {
    march: 'Advance (stops at the enemy line).',
    strike: 'Spears hit the front enemy; archers shoot.',
    shield: 'Take a fifth of the damage for three measures.',
    rally: 'Restore the army’s strength.',
    charge: 'Only when the drum is awake: the elephant tramples everything near it. The charge spends the drum’s spirit.',
  };
  for (const c of COMMANDS) {
    const tr = document.createElement('tr');
    const glyphs = [...c.pattern].map((d) => `<span class="${d === 'L' ? 'g-l' : 'g-r'}"></span>`).join(' ');
    const words = [...c.pattern].map((d) => (d === 'L' ? 'tùng' : 'cắc')).join(' ');
    tr.innerHTML = `<td>${glyphs}<br><small>${words}</small></td><td><strong>${c.name}</strong> · ${c.gloss}</td><td>${effects[c.id]}</td>`;
    t.appendChild(tr);
  }
}

// ---------------------------------------------------------------- play

let game = null;

function startStage(i) {
  const stage = STAGES[i];
  sound.start();
  const beatDur = 60 / stage.bpm;
  game = {
    index: i,
    stage,
    beatDur,
    reader: new DrumReader({ beatDur, unlocked: stage.unlocked }),
    battle: createBattle(stage),
    songStart: sound.now + 0.6,
    nextTick: 0,
    nextStep: 0,
    pending: null,
    feedback: null,
    ended: false,
    introUntil: 7,
    commandsDone: 0,
    flourishTaught: false,
  };
  renderer.setStage(stage);
  if (document.activeElement) document.activeElement.blur();
  show('play');
}

function songTime() {
  return sound.now - game.songStart;
}

/** Map an input timestamp (performance clock) onto the heard song clock. */
function hitTime(perfMs) {
  const ctx = sound.ctx;
  let heard;
  const ts = ctx && ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
  if (ts && ts.performanceTime > 0) heard = ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  else heard = sound.now - (performance.now() - perfMs) / 1000 - sound.latency;
  return heard - game.songStart - settings.offset / 1000;
}

function feedback(text, color) {
  game.feedback = { text, color, t: songTime() };
}

input.on('drum', ({ drum, time }) => {
  if (screen !== 'play' || dialogs.length || !game || game.ended) return;
  const t = hitTime(time);
  if (drum === 'L') sound.tung();
  else sound.cac(undefined, game.reader.inResponse(t));
  renderer.hit(drum, songTime());
  input.rumble(drum === 'L' ? 50 : 30, drum === 'L' ? 0.6 : 0.3);
  for (const ev of game.reader.hit(drum, t)) handleRhythm(ev);
});

function handleRhythm(ev) {
  const g = game;
  if (ev.type === 'hit') {
    if (ev.grade === 'perfect') feedback('Perfect', P.bronzeLight);
    else if (ev.grade === 'good') feedback('Good', P.paper);
    else {
      feedback('Off the beat', P.lacquer);
      sound.miss();
    }
  } else if (ev.type === 'command') {
    if (ev.command === 'charge') {
      // The elephant answers only a waking drum, and the charge spends it.
      if (!ev.spirit) {
        feedback('The elephant waits for the drum to wake', P.paperShade);
        return;
      }
      g.reader.combo = 0;
    }
    const power = commandPower(ev.accuracy, ev.spirit);
    g.pending = { beat: ev.responseStart, command: ev.command, power };
    for (let k = 0; k < 4; k++) sound.call(g.songStart + (ev.responseStart + k) * g.beatDur, 1 + k * 0.06 + (ev.spirit ? 0.2 : 0));
    if (ev.spirit && ev.combo === SPIRIT_COMBO) toast('Trống thức — the drum wakes!');
    g.commandsDone += 1;
  } else if (ev.type === 'flourish') {
    addFlourish(g.battle);
    feedback(`Nhị’s flourish ×${ev.count}`, P.lacquer);
    g.flourishTaught = true;
  } else if (ev.type === 'stumble') {
    feedback('Stumble — the army is answering', P.lacquer);
    sound.miss();
  } else if (ev.type === 'comboLost') {
    if (ev.combo > 1) feedback('Chain broken', P.paperShade);
  }
}

function hint(view) {
  const g = game;
  const t = view.songTime;
  if (t < g.introUntil && g.index > 0) return g.stage.intro.split('. ')[0] + '.';
  if (!settings.hints) return null;
  const keys = {
    keyboard: { L: 'F', R: 'J' },
    gamepad: { L: 'LB', R: 'RB' },
    pointer: { L: 'left', R: 'right' },
  }[input.device] || { L: 'F', R: 'J' };
  const say = (id) => {
    const c = COMMANDS.find((k) => k.id === id);
    return `${c.name}: ${[...c.pattern].map((d) => keys[d]).join(' ')}`;
  };
  const b = g.battle;
  const front = blocker(b);
  const near = front && front.x - b.army.x <= 4.6;
  if (g.index === 0) {
    if (g.commandsDone === 0) return `Drum on the beat — ${say('march')} (tùng tùng tùng cắc)`;
    if (near) return `In reach — ${say('strike')}`;
    if (g.commandsDone >= 3 && !g.flourishTaught) return `While they answer, tap ${keys.R} between beats for Nhị’s flourish`;
    if (g.commandsDone < 4) return `Keep marching — ${say('march')}`;
    return null;
  }
  if (g.index === 1 && b.enemies.some((e) => e.alive && e.type === 'crossbow' && e.x - b.army.x <= 14) && g.commandsDone < 12) {
    return `Crossbows! ${say('shield')}`;
  }
  if (g.index === 2 && b.army.troops < b.army.maxTroops * 0.5) return `Wounded — ${say('rally')}`;
  if (g.index === 2 && near && g.reader.spirit) return `The drum is awake — ${say('charge')}`;
  return null;
}

function updatePlay(dt) {
  const g = game;
  const t = songTime();
  // Metronome, scheduled slightly ahead on the audio clock.
  while (g.nextTick * g.beatDur < t + 0.15) {
    sound.tick(g.songStart + g.nextTick * g.beatDur, g.nextTick % 4 === 0);
    g.nextTick += 1;
  }
  for (const ev of g.reader.update(t)) handleRhythm(ev);
  // Step the battle on each beat.
  while (g.nextStep * g.beatDur <= t && !g.ended) {
    const beat = g.nextStep++;
    if (g.pending && g.pending.beat === beat) {
      issueOrder(g.battle, g.pending.command, g.pending.power);
      g.pending = null;
    }
    const events = stepBeat(g.battle);
    renderer.spawn(events, view());
    for (const ev of events) {
      if (ev.type === 'damage' && ev.source !== 'arrow') sound.clash();
      if (ev.type === 'trample') {
        sound.thud();
        input.rumble(300, 1);
      }
      if (ev.type === 'wound' && !ev.shielded) input.rumble(80, 0.4);
      if (ev.type === 'outcome') finish(ev.outcome);
    }
  }
  renderer.draw(view(), dt);
}

function view() {
  const g = game;
  const t = songTime();
  const v = {
    battle: g.battle,
    songTime: t,
    beatFloat: t / g.beatDur,
    phrase: g.reader.phrase.map((h) => h.drum),
    inResponse: !!g.battle.order,
    responseCommand: g.battle.order ? g.battle.order.command : null,
    combo: g.reader.combo,
    spirit: g.reader.spirit,
    feedback: g.feedback,
    unlocked: g.stage.unlocked,
  };
  v.hint = hint(v);
  return v;
}

function finish(outcome) {
  game.ended = true;
  const won = outcome === 'won';
  if (won && progress.unlocked < Math.min(STAGES.length, game.index + 2)) {
    progress.unlocked = Math.min(STAGES.length, game.index + 2);
    save('progress', progress);
  }
  setTimeout(() => {
    if (!game || screen !== 'play') return;
    $('#result-title').textContent = won ? 'Victory' : 'The line breaks';
    $('#result-text').textContent = won
      ? game.index === STAGES.length - 1
        ? 'Luy Lâu falls and the governor flees north. The drum has spoken — for now. (End of the prototype.)'
        : 'The drum carries across the water. More villages will answer.'
      : 'The women fall back to regroup. Listen to the beat and raise shields when the crossbows aim.';
    $('#result-next').hidden = !won || game.index >= STAGES.length - 1;
    show('result');
  }, 1600);
}

function pause(reason = '') {
  if (screen !== 'play' || !game || game.ended) return;
  if (sound.ctx) sound.ctx.suspend();
  $('#pause-reason').textContent = reason;
  show('pause');
}

function resume() {
  if (sound.ctx) sound.ctx.resume();
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
      game = null;
      buildCards();
      return show('select');
    case 'title':
      if (sound.ctx) sound.ctx.resume();
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
  enterFullscreen();
  buildCards();
  show('select');
}

document.addEventListener('click', (e) => {
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

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.poll();
  if (game && screen === 'play') updatePlay(dt);
  requestAnimationFrame(frame);
}

async function boot() {
  applySettings();
  buildCommandTable();
  await art.load();
  const logo = art.get('logo');
  if (logo) {
    $('#logo-img').src = logo.src;
    $('#logo-img').alt = 'Bronze Drum';
    $('#logo-img').hidden = false;
    $('#logo-text').classList.add('visually-hidden');
  }
  show('title');
  requestAnimationFrame(frame);
}

// Debug hooks for automated checks.
window.__bronzeDrum = { get game() { return game; }, startStage, STAGES, songTime: () => (game ? songTime() : null) };

boot();
