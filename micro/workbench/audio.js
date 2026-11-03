// The workbench's Audio tab: every sound trigger in Micro Zoom, playable in
// both sound sets (Default: the original sounds; Experimental: the sounds
// added on 2 November 2026, the game's Settings → Sound effects switch), the
// menu sounds and music, and every sound with its takes and its generation
// prompt. Marks and notes are kept in this browser and copied out as a list.
//
// The trigger list is generated: node micro/workbench/build_audio_triggers.mjs.
import { TRIGGERS, SOUNDS, DYNAMIC } from './audio-triggers.js';
import { createSound } from '../game/src/sound.js';

const GAME = new URL('../game/', import.meta.url);
const WORLDS = { game: 'Menus and music', springtail: 'Springtail', mite: 'Mite', tardigrade: 'Tardigrade', amoeba: 'Amoeba', paramecium: 'Paramecium', bacterium: 'Bacterium', phage: 'Phage' };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// ------------------------------------------------------------ the world sounds
// Played as shared/audio.js plays them: the list's volume times the call's,
// at the call's rate, through a 0.9 master (times the workbench volume).
let ctx = null, master = null;
const buffers = new Map();
const playing = new Set(); // { src, btn }
function ensure() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.9 * Number($('#vol').value);
  master.connect(ctx.destination);
  return ctx;
}
function load(id) {
  if (!buffers.has(id)) {
    const files = SOUNDS[id]?.files || [];
    buffers.set(id, Promise.all(files.map((f) => fetch(new URL(f, GAME)).then((r) => { if (!r.ok) throw new Error(`${r.status} ${f}`); return r.arrayBuffer(); })
      .then((b) => ctx.decodeAudioData(b)).catch((e) => { console.error(`[workbench] ${id}: ${e.message}`); return null; }))));
  }
  return buffers.get(id);
}
const numOr1 = (v) => (typeof v === 'number' ? v : 1);
/** Play `sound` ({id, volume, rate}); take: an index, or random. Loops toggle. */
async function play(sound, btn, { take = null, loop = false } = {}) {
  ensure();
  if (ctx.state === 'suspended') await ctx.resume();
  const was = [...playing].find((p) => p.btn === btn);
  if (was) { stopOne(was); return; }
  const list = await load(sound.id);
  const ok = list.filter(Boolean);
  if (!ok.length) { btn.classList.add('missing'); btn.title = 'This sound has no files yet'; return; }
  const buf = take != null ? (list[take] || ok[0]) : ok[(Math.random() * ok.length) | 0];
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  src.playbackRate.value = numOr1(sound.rate);
  const g = ctx.createGain();
  g.gain.value = (SOUNDS[sound.id]?.volume ?? 1) * numOr1(sound.volume);
  src.connect(g).connect(master);
  src.start();
  const p = { src, btn };
  playing.add(p);
  btn.classList.add('on');
  btn.querySelector('.icon').textContent = '■';
  src.onended = () => { playing.delete(p); btn.classList.remove('on'); btn.querySelector('.icon').textContent = '▶'; };
}
function stopOne(p) { try { p.src.stop(); } catch { /* already stopped */ } }
function stopAll() { for (const p of [...playing]) stopOne(p); shell.music(null); }

// ------------------------------------------------------------ the menus (the shell's own sound)
// The shell's real sound module, switched to each set for the one call. The
// switch is the game's own setting (localStorage micro.sfxSet): the workbench
// keeps it from being written, so the game's choice is unchanged.
const shell = createSound();
function inSet(set, fn) {
  const real = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { if (k !== 'micro.sfxSet') real.call(this, k, v); };
  try { shell.setSet(set); } finally { Storage.prototype.setItem = real; }
  shell.unlock();
  fn();
}
const MENU = [
  { event: 'Focus moves to another button', call: (s) => s.tick(), exp: 'ui/move', def: 'synthesised brass tick' },
  { event: 'Select (A on a button)', call: (s) => s.select(), exp: 'ui/select', def: 'synthesised click' },
  { event: 'Back (B)', call: (s) => s.back(), exp: 'ui/back', def: 'synthesised falling tone' },
  { event: 'Press Start on the title', call: (s) => s.start(), exp: 'ui/start', def: 'synthesised rising chord' },
  { event: 'Begin a world from its intro', call: (s) => s.begin(), exp: 'ui/start', def: 'the synthesised select' },
  { event: 'A world card zooms to its intro', call: (s) => s.introIn(), exp: 'ui/intro-in', def: 'the synthesised select' },
  { event: 'The intro closes back to the tray', call: (s) => s.introOut(), exp: 'ui/intro-out', def: 'the synthesised back' },
  { event: 'The world-select card changes', call: (s) => s.card(), exp: 'ui/card', def: 'the synthesised tick' },
  { event: 'Pause', call: (s) => s.pause(), exp: 'ui/pause', def: null },
  { event: 'Resume (unpausing)', call: (s) => s.resume(), exp: 'ui/resume', def: null },
  { event: 'The pause menu’s Resume item', call: (s) => s.resumeItem(), exp: null, def: 'the synthesised select' },
  { event: 'Zoom into the next world', call: (s) => s.zoom('in', 2.4), exp: 'ui/zoom-in', def: 'synthesised turret click and air' },
  { event: 'Zoom back out to the world above', call: (s) => s.zoom('out', 2.4), exp: 'ui/zoom-out', def: 'synthesised turret click and air' },
  { event: 'A player joins (menus)', call: (s) => s.join(), exp: 'synthesised two-note chime', def: 'synthesised two-note chime', same: true },
];
const SONGS = [
  { name: 'chamber', title: 'Clockwork Chamber Music', where: 'The title screen' },
  { name: 'lullaby', title: 'Clockwork Lullaby', where: 'World select and the world intros' },
];

// ------------------------------------------------------------ marks
const MARKS = { '': 'No mark', keep: 'Keep', integrate: 'Use in Default', regenerate: 'Regenerate', drop: 'Drop' };
let marks = store.get('micro.workbench.audioMarks', {});
const saveMarks = () => { store.set('micro.workbench.audioMarks', marks); countMarks(); };
function countMarks() {
  const n = Object.values(marks).filter((m) => m.mark || m.note).length;
  $('#mark-count').textContent = n ? `${n} marked` : 'Nothing marked yet';
}
function markUi(id) {
  const m = marks[id] || {};
  return `<div class="mark" data-mark="${esc(id)}"><select aria-label="Mark ${esc(id)}">${Object.entries(MARKS).map(([k, v]) => `<option value="${k}"${m.mark === k ? ' selected' : ''}>${v}</option>`).join('')}</select>`
    + `<input type="text" placeholder="Note" value="${esc(m.note || '')}" aria-label="Note for ${esc(id)}"></div>`;
}
document.addEventListener('change', (e) => {
  const box = e.target.closest('[data-mark]');
  if (!box) return;
  const id = box.dataset.mark;
  marks[id] = { ...marks[id], [e.target.tagName === 'SELECT' ? 'mark' : 'note']: e.target.value };
  if (!marks[id].mark && !marks[id].note) delete marks[id];
  saveMarks();
  for (const other of document.querySelectorAll(`[data-mark="${CSS.escape(id)}"]`)) {
    if (other === box) continue;
    other.querySelector('select').value = marks[id]?.mark || '';
    other.querySelector('input').value = marks[id]?.note || '';
  }
});
$('#export').addEventListener('click', async () => {
  const lines = ['Micro Zoom audio marks (from the workbench):', ''];
  for (const [id, m] of Object.entries(marks).sort()) {
    if (!m.mark && !m.note) continue;
    lines.push(`- \`${id}\`: ${MARKS[m.mark || ''] || 'No mark'}${m.note ? ` — ${m.note}` : ''}`);
  }
  const text = lines.join('\n');
  try { await navigator.clipboard.writeText(text); $('#export').textContent = 'Copied'; }
  catch { prompt('Copy the marks:', text); }
  setTimeout(() => { $('#export').textContent = 'Copy marks'; }, 1600);
});
$('#clear').addEventListener('click', () => { if (confirm('Clear every mark and note?')) { marks = {}; saveMarks(); render(); } });

// ------------------------------------------------------------ rendering
const state = { view: 'triggers', world: 'all', show: 'all', q: '' };
const opts = (s) => {
  const bits = [];
  if (s.volume != null && s.volume !== 1) bits.push(typeof s.volume === 'number' ? `volume ${s.volume}` : `volume ${s.volume} (played at 1)`);
  if (s.rate != null && s.rate !== 1) bits.push(typeof s.rate === 'number' ? `rate ${s.rate}` : `rate ${s.rate} (played at 1)`);
  return bits.join(', ');
};
let handlers = [];
function button(sound, { loop = false, take = null, label = null } = {}) {
  const i = handlers.push({ sound, loop, take }) - 1;
  return `<button class="play" data-h="${i}"><span class="icon" aria-hidden="true">▶</span><span><span class="id">${esc(label || sound.id)}</span>${label ? '' : `<br><span class="opts">${esc(opts(sound))}</span>`}</span></button>`;
}
const side = (cls, title, sound, loop) => `<div class="side ${cls}"><span class="label">${title}</span>${sound ? (sound.dynamic ? `<span class="silent">${esc(sound.dynamic)} (worked out in play)</span>` : button(sound, { loop })) : '<span class="silent">Silent in this set</span>'}</div>`;
const matches = (text) => !state.q || text.toLowerCase().includes(state.q);
const isMarked = (...ids) => ids.some((id) => id && marks[id] && (marks[id].mark || marks[id].note));

function triggerRows() {
  const out = [];
  if (state.world === 'all' || state.world === 'game') {
    const menu = MENU.filter((m) => matches(`${m.event} ${m.exp} ${m.def}`)
      && (state.show !== 'differs' || !m.same) && (state.show !== 'new' || (m.exp && m.exp.startsWith('ui/')))
      && (state.show !== 'marked' || isMarked(m.exp)));
    const songs = SONGS.filter((s) => matches(`${s.title} ${s.where} music`) && state.show === 'all');
    if (menu.length || songs.length) {
      out.push(`<h2 class="group">Menus and music <small>the shell’s own sound (game/src/sound.js), through the game’s sound switch and volume</small></h2>`);
      for (const s of songs) {
        out.push(`<div class="row"><div class="what"><div class="event">${esc(s.where)}</div><div class="where">game/music/ · the same in both sets</div></div>`
          + `<div class="side"><span class="label">Music</span><button class="play" data-song="${s.name}"><span class="icon" aria-hidden="true">▶</span><span><span class="id">${esc(s.title)}</span><br><span class="opts">loops; ▶ again to stop</span></span></button></div><div></div></div>`);
      }
      MENU.forEach((m, i) => {
        if (!menu.includes(m)) return;
        const exp = m.exp ? `<button class="play" data-menu="${i}" data-set="new"><span class="icon" aria-hidden="true">▶</span><span><span class="id">${esc(m.exp)}</span></span></button>${m.exp.startsWith('ui/') ? markUi(m.exp) : ''}` : '<span class="silent">Silent in this set</span>';
        const def = m.def ? `<button class="play" data-menu="${i}" data-set="old"><span class="icon" aria-hidden="true">▶</span><span><span class="id">${esc(m.def)}</span></span></button>` : '<span class="silent">Silent in this set</span>';
        out.push(`<div class="row"><div class="what"><div class="event">${esc(m.event)}</div><div class="where">game/src/sound.js</div></div>`
          + `<div class="side"><span class="label">Default</span>${def}</div><div class="side exp"><span class="label">Experimental</span>${exp}</div></div>`);
      });
    }
  }
  let world = null;
  for (const t of TRIGGERS) {
    if (state.world !== 'all' && state.world !== t.world) continue;
    const e = t.experimental, d = t.default;
    const differs = JSON.stringify(e) !== JSON.stringify(d);
    if (state.show === 'differs' && !differs) continue;
    if (state.show === 'new' && !(e && SOUNDS[e.id]?.added)) continue;
    if (state.show === 'marked' && !isMarked(e?.id, d?.id)) continue;
    if (!matches(`${t.event} ${e?.id || ''} ${d?.id || ''} ${t.sites.join(' ')}`)) continue;
    if (t.world !== world) {
      world = t.world;
      out.push(`<h2 class="group">${esc(WORLDS[world] || world)} <small>game/${esc(world)}/</small></h2>`);
    }
    const loop = t.kind === 'loop';
    out.push(`<div class="row"><div class="what"><div class="event">${esc(t.event)} ${loop ? '<span class="badge loop">loop</span>' : ''}</div><div class="where">${esc(t.sites.join(' · '))}</div></div>`
      + side('', 'Default', d, loop)
      + `<div class="side exp"><span class="label">Experimental</span>${e ? button(e, { loop }) + (SOUNDS[e.id]?.added ? markUi(e.id) : '') : '<span class="silent">Silent in this set</span>'}</div></div>`);
  }
  return out;
}

function soundRows() {
  const out = [];
  let world = null;
  for (const [id, s] of Object.entries(SOUNDS)) {
    const w = id.split('/')[0];
    const key = w === 'ui' ? 'game' : w;
    if (state.world !== 'all' && state.world !== key && !(state.world !== 'game' && w === 'shared')) continue;
    if (state.show === 'new' && !s.added) continue;
    if (state.show === 'marked' && !isMarked(id)) continue;
    if (state.show === 'differs' && !s.added) continue;
    if (!matches(`${id} ${s.used} ${s.event} ${s.prompt}`)) continue;
    if (w !== world) { world = w; out.push(`<h2 class="group">${esc(w === 'ui' ? 'Menus (ui/)' : WORLDS[w] || 'Shared (every world)')} <small>game/assets/audio/${esc(w)}/</small></h2>`); }
    const loop = s.kind === 'loop';
    const takes = s.files.length ? s.files.map((f, i) => button({ id }, { loop, take: i, label: s.files.length > 1 ? `take ${i + 1}` : f.split('/').pop() })).join('') : '<span class="silent">Not generated yet</span>';
    const cmd = `python3 micro/design/source/build_audio.py --force ${id}`;
    out.push(`<div class="row sound"><div class="what"><div class="event"><span class="id">${esc(id)}</span> ${s.added ? '<span class="badge exp">Experimental</span>' : '<span class="badge">Default</span>'} ${loop ? '<span class="badge loop">loop</span>' : ''}</div>`
      + `<div>${esc(s.event || s.used)}</div>`
      + (s.prompt ? `<details><summary>Prompt</summary><pre>${esc(s.prompt)}</pre></details>` : '')
      + `<div class="where">${esc(cmd)} <button class="copy" data-copy="${esc(cmd)}">Copy</button></div></div>`
      + `<div class="side"><span class="label">Takes${s.volume !== 1 ? ` · list volume ${s.volume}` : ''}</span><div class="takes">${takes}</div>${markUi(id)}</div></div>`);
  }
  return out;
}

function render() {
  handlers = [];
  const rows = state.view === 'triggers' ? triggerRows() : soundRows();
  $('#list').innerHTML = rows.length ? rows.join('') : '<p class="lede">Nothing matches.</p>';
  const nNew = Object.values(SOUNDS).filter((s) => s.added).length;
  $('#lede').innerHTML = state.view === 'triggers'
    ? `Each row is a moment in the game that plays a sound, with what it plays in each sound set. <b>Default</b> is the original soundscape; <b>Experimental</b> uses the ${nNew} sounds added on 2 November (in the game: Settings → Sound effects). Volume and speed are the game’s own for that moment.${DYNAMIC.length ? ` ${DYNAMIC.length} calls pick their sound while playing and are only in Sounds: ${esc(DYNAMIC.join(', '))}.` : ''}`
    : `Every sound file the game has, by folder, with each take, what it is for and the prompt it was generated from. To regenerate one, mark it (or run the command shown) and ask for it.`;
}

// ------------------------------------------------------------ events
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.h != null) { const h = handlers[b.dataset.h]; play(h.sound, b, { take: h.take, loop: h.loop }); return; }
  if (b.dataset.menu != null) { inSet(b.dataset.set, () => MENU[b.dataset.menu].call(shell)); return; }
  if (b.dataset.song) {
    shell.unlock();
    const on = b.classList.toggle('on');
    for (const other of document.querySelectorAll('[data-song]')) if (other !== b) { other.classList.remove('on'); other.querySelector('.icon').textContent = '▶'; }
    b.querySelector('.icon').textContent = on ? '■' : '▶';
    shell.music(on ? b.dataset.song : null);
    return;
  }
  if (b.dataset.copy) { navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1200); }); return; }
  if (b.dataset.view) {
    state.view = b.dataset.view;
    for (const v of document.querySelectorAll('[data-view]')) v.setAttribute('aria-pressed', String(v === b));
    store.set('micro.workbench.audioView', state.view);
    render();
  }
});
$('#world').innerHTML = `<option value="all">All</option>${Object.entries(WORLDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}`;
for (const [sel, key] of [['#world', 'world'], ['#show', 'show']]) $(sel).addEventListener('change', (e) => { state[key] = e.target.value; render(); });
$('#q').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });
$('#vol').addEventListener('input', (e) => { if (master) master.gain.value = 0.9 * Number(e.target.value); });
$('#stop').addEventListener('click', stopAll);

state.view = store.get('micro.workbench.audioView', 'triggers') === 'sounds' ? 'sounds' : 'triggers';
for (const v of document.querySelectorAll('[data-view]')) v.setAttribute('aria-pressed', String(v.dataset.view === state.view));
if (!shell.on) {
  const w = document.createElement('p');
  w.className = 'warn';
  w.textContent = 'The game’s sound is switched off in its settings, so the menu sounds and music here are silent too. Turn it on in the game (Settings → Sound) to hear them.';
  $('#lede').after(w);
}
countMarks();
render();
