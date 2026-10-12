// Word Blitz: a Boggle-style word race. Everyone gets the same 4x4 board
// (made from the classic Boggle dice with a seeded shuffle, "Qu" as one tile)
// and has 90 seconds to find words by dragging through neighbouring tiles
// (tap-tap works too, and so does typing on a keyboard). Scores update live
// but words stay hidden until time is up; then everyone's words are shown,
// words found by more than one player are struck out for those players, and
// the best words nobody found are listed. The shared state only holds the
// round number, board seed and start time, so any player can take over as
// owner; each player publishes their own score and, at the end, their words.

import WORDS from './data/words.js';

const SIZE = 4;
const DURATION = 90000;   // ms a round lasts
const READY = 3000;       // ms countdown before a round starts
const MAX_PLAYERS = 8;
const MAX_WORDS = 400;
const POINTS = [0, 0, 0, 1, 1, 2, 3, 5];   // by word length; 8 and longer: 11

// The sixteen classic Boggle dice.
const DICE = [
  'AAEEGN', 'ABBJOO', 'ACHOPS', 'AFFKPS', 'AOOTTW', 'CIMOTU', 'DEILRX', 'DELRVY',
  'DISTTY', 'EEGHNW', 'EEINSU', 'EHRTVW', 'EIOSST', 'ELRTTY', 'HIMNQU', 'HLNNRZ',
];

const CSS = `
.wb { position: absolute; inset: 0; display: flex; flex-direction: column; --fs: 1; font-size: calc(1rem * var(--fs)); user-select: none; -webkit-user-select: none; }
.wb.tight { --fs: 0.8; }
.wb-top { display: flex; align-items: center; gap: 10px; padding: 6px 12px 2px; font-weight: 900; }
.wb-time { min-width: 2.6em; font-variant-numeric: tabular-nums; }
.wb-bar { flex: 1; height: 12px; border-radius: 999px; background: rgba(0,0,0,0.35); overflow: hidden; position: relative; }
.wb-bar i { position: absolute; inset: 0; border-radius: 999px; background: linear-gradient(90deg, var(--aqua), var(--sun)); transform-origin: left; }
.wb-bar.low i { background: linear-gradient(90deg, var(--danger), var(--sun)); }
.wb-score { color: var(--sun); white-space: nowrap; }
.wb-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 6px; padding: 2px 12px; }
.wb-chip { display: inline-flex; gap: 6px; align-items: center; padding: 1px 10px; border-radius: 999px; background: rgba(0,0,0,0.28); font-weight: 800; font-size: 0.8em; max-width: 46%; }
.wb-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wb-chip b { color: var(--sun); }
.wb-body { position: relative; flex: 1; min-height: 0; display: flex; gap: 12px; padding: 4px 12px 10px; align-items: center; justify-content: center; }
.wb-body.portrait { flex-direction: column; gap: 6px; justify-content: flex-start; }
.wb-left { flex: none; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.wb-cur { height: 1.9em; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.35em; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.wb-cur.ok { color: #5bdc6f; }
.wb-cur.bad { color: var(--danger); }
.wb-cur.dup { color: var(--sun); }
.wb-grid { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 6%; padding: 3.5%; border-radius: 18px; background: linear-gradient(160deg, #4b2f86, #2a1f4d); box-shadow: 0 6px 0 rgba(0,0,0,0.35), 0 10px 20px rgba(0,0,0,0.3); border: 3px solid rgba(200,184,255,0.35); touch-action: none; cursor: pointer; }
.wb-grid.veil .wb-t { color: transparent; }
.wb-t { position: relative; display: grid; place-items: center; border-radius: 22%; background: linear-gradient(180deg, #fffdf2, #ffe9a8); color: #2a1f4d; font-weight: 900; font-size: var(--tf, 1.8rem); box-shadow: 0 3px 0 rgba(0,0,0,0.3); transition: transform 0.1s, background 0.12s; z-index: 1; }
.wb-t small { font-size: 0.6em; }
.wb-t.sel { background: linear-gradient(180deg, #ffc2de, var(--pink)); transform: scale(1.06); box-shadow: 0 0 14px 3px rgba(255,95,162,0.75); }
.wb-t.head { background: linear-gradient(180deg, #fff, #ff9ccb); }
.wb-t.ok { background: linear-gradient(180deg, #b9f5c3, #5bdc6f); box-shadow: 0 0 16px 4px rgba(91,220,111,0.8); animation: wb-pop 0.45s ease-out; }
.wb-t.bad { background: linear-gradient(180deg, #ffb3bb, var(--danger)); animation: wb-shake 0.35s; }
.wb-t.dup { background: linear-gradient(180deg, #fff3a8, var(--sun)); }
.wb-t.cursor { outline: 4px solid var(--focus); outline-offset: 1px; }
@keyframes wb-pop { 0% { transform: scale(1.06); } 40% { transform: scale(1.28); } 100% { transform: scale(1); } }
@keyframes wb-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
.wb-line { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; overflow: visible; }
.wb-line polyline { fill: none; stroke: rgba(255,255,255,0.8); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.wb-line.ok polyline { stroke: #2fbf4a; }
.wb-line.bad polyline { stroke: var(--danger); }
.wb-line.dup polyline { stroke: #e0a800; }
.wb-count { position: absolute; inset: 0; display: grid; place-items: center; z-index: 3; font-size: 4em; font-weight: 900; color: #fff; text-shadow: 0 3px 10px rgba(0,0,0,0.7); pointer-events: none; }
.wb-right { flex: 1; min-width: 0; min-height: 0; align-self: stretch; display: flex; flex-direction: column; gap: 6px; }
.wb-found-h { color: var(--muted); font-weight: 800; font-size: 0.85em; text-align: left; }
.wb-found { flex: 1; min-height: 0; overflow: auto; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 4px; }
.wb-w { padding: 1px 9px; border-radius: 999px; background: rgba(255,255,255,0.14); font-weight: 800; text-transform: uppercase; font-size: 0.85em; }
.wb-w b { color: var(--sun); margin-left: 4px; font-size: 0.85em; }
.wb-w.fresh { animation: wb-pop 0.5s ease-out; background: rgba(91,220,111,0.4); }
.wb-res { position: absolute; inset: 0; overflow: auto; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 6px 12px 14px; }
.wb-res h2 { margin: 2px 0 0; }
.wb-cards { width: 100%; max-width: 52em; display: flex; flex-direction: column; gap: 8px; }
.wb-card { padding: 8px 12px; border-radius: 14px; background: rgba(0,0,0,0.28); border: 2px solid transparent; }
.wb-card.me { border-color: var(--sun); }
.wb-card-h { display: flex; align-items: center; gap: 8px; font-weight: 900; margin-bottom: 4px; }
.wb-card-h .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wb-card-h .pts { color: var(--sun); }
.wb-card-h .rk { color: var(--muted); }
.wb-words { display: flex; flex-wrap: wrap; gap: 3px 5px; }
.wb-words span { text-transform: uppercase; font-weight: 800; font-size: 0.85em; padding: 0 7px; border-radius: 999px; background: rgba(255,255,255,0.14); }
.wb-words span.hit { background: rgba(91,220,111,0.3); }
.wb-words span.dupe { text-decoration: line-through; opacity: 0.55; background: rgba(255,92,108,0.25); }
.wb-words em { color: var(--muted); font-style: normal; }
.wb-miss { width: 100%; max-width: 52em; padding: 8px 12px; border-radius: 14px; background: rgba(63,224,208,0.12); border: 2px dashed rgba(63,224,208,0.5); }
.wb-miss h3 { margin: 0 0 4px; color: var(--aqua); font-size: 1em; }
.wb-mini { display: grid; grid-template-columns: repeat(4, 1.6em); gap: 2px; font-weight: 900; color: #2a1f4d; }
.wb-mini span { display: grid; place-items: center; height: 1.6em; border-radius: 6px; background: #ffe9a8; font-size: 0.9em; }
`;

// --- board -------------------------------------------------------------------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 16 tile strings (lowercase; 'qu' is one tile) for a seed: shuffle the dice,
// then roll each one.
function makeBoard(seed) {
  const rand = rng(seed);
  const dice = DICE.slice();
  for (let i = dice.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [dice[i], dice[j]] = [dice[j], dice[i]];
  }
  return dice.map(d => {
    const c = d[Math.floor(rand() * 6)].toLowerCase();
    return c === 'q' ? 'qu' : c;
  });
}

const neighbours = [];
for (let i = 0; i < SIZE * SIZE; i++) {
  const r = Math.floor(i / SIZE), c = i % SIZE, list = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) list.push(rr * SIZE + cc);
    }
  }
  neighbours.push(list);
}
const adjacent = (a, b) => neighbours[a].includes(b);

// A path (tile indices) spelling `word` on the board, or null.
function findPath(board, word) {
  const used = new Array(board.length).fill(false);
  const path = [];
  function go(at, pos) {
    if (pos === word.length) return true;
    const cands = at < 0 ? board.map((_, i) => i) : neighbours[at];
    for (const i of cands) {
      const t = board[i];
      if (used[i] || !word.startsWith(t, pos)) continue;
      used[i] = true;
      path.push(i);
      if (go(i, pos + t.length)) return true;
      path.pop();
      used[i] = false;
    }
    return false;
  }
  return word.length >= 1 && go(-1, 0) ? path.slice() : null;
}

// Every dictionary word on the board (for "best words nobody found").
let prefixes = null;
function allWords(board) {
  if (!prefixes) {
    prefixes = new Set();
    for (const w of WORDS) for (let i = 1; i < w.length; i++) prefixes.add(w.slice(0, i));
  }
  const found = new Set();
  const used = new Array(board.length).fill(false);
  function go(at, str) {
    if (str.length >= 3 && WORDS.has(str)) found.add(str);
    if (!prefixes.has(str) && str.length > 0 && !WORDS.has(str)) return;
    for (const n of neighbours[at]) {
      if (used[n]) continue;
      const next = str + board[n];
      if (next.length > 9 || (!prefixes.has(next) && !WORDS.has(next))) continue;
      used[n] = true;
      go(n, next);
      used[n] = false;
    }
  }
  for (let i = 0; i < board.length; i++) {
    used[i] = true;
    go(i, board[i]);
    used[i] = false;
  }
  return found;
}

const pointsFor = w => (w.length >= 8 ? 11 : POINTS[w.length] || 0);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function validShared(s) {
  return s && typeof s === 'object' && Number.isInteger(s.round) && Number.isFinite(s.seed) && Number.isFinite(s.startedAt);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const fmtTime = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default {
  id: 'wordblitz',
  name: 'Word Blitz',
  emoji: '🔤',
  blurb: 'Swipe through the letter grid and find more words than your friends.',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: false,
  fullBleed: false,

  create(api) {
    // --- dom -------------------------------------------------------------
    const root = el('div', 'wb');
    const style = el('style');
    style.textContent = CSS;
    const top = el('div', 'wb-top');
    const timeEl = el('span', 'wb-time', '1:30');
    const bar = el('div', 'wb-bar');
    const barFill = el('i');
    bar.append(barFill);
    const scoreEl = el('span', 'wb-score', '0');
    top.append(timeEl, bar, scoreEl);
    const chips = el('div', 'wb-chips');
    const body = el('div', 'wb-body');
    const leftCol = el('div', 'wb-left');
    const cur = el('div', 'wb-cur');
    const grid = el('div', 'wb-grid');
    const tiles = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const t = el('div', 'wb-t');
      grid.append(t);
      tiles.push(t);
    }
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'wb-line');
    svg.setAttribute('viewBox', '0 0 100 100');
    const poly = document.createElementNS(NS, 'polyline');
    svg.append(poly);
    grid.append(svg);
    const countEl = el('div', 'wb-count');
    countEl.hidden = true;
    grid.append(countEl);
    leftCol.append(cur, grid);
    const right = el('div', 'wb-right');
    const foundHead = el('div', 'wb-found-h');
    const foundEl = el('div', 'wb-found');
    right.append(foundHead, foundEl);
    body.append(leftCol, right);
    const resEl = el('div', 'wb-res');
    resEl.hidden = true;
    body.append(resEl);
    root.append(style, top, chips, body);
    api.el.append(root);

    // --- state -----------------------------------------------------------
    let best = api.store.get('best', 0);
    let destroyed = false;
    let timer = 0, flashTimer = 0;
    let boardKey = '';        // `${round}:${seed}` of the drawn board
    let board = makeBoard(0);
    let found = [];           // my words this round, in order
    let foundSet = new Set();
    let score = 0;
    let path = [];            // tile indices being traced
    let tapMode = false;      // path built by taps, waiting for more taps or a final tap to submit
    let dragging = false, moved = false, pointerId = -1;
    let typed = '';
    let cursor = -1;          // pad cursor tile
    let padPrev = {};
    let flash = '';           // 'ok' | 'bad' | 'dup' while feedback shows
    let curText = '';
    let publishedFor = '';    // round whose final words were already published
    let endedFor = '';        // round whose end was already celebrated
    let lastSec = -1;
    let lastResSig = '';
    let cellPx = 60;
    let results = null;       // cached results for the round

    const sharedNow = () => {
      const s = api.shared();
      return validShared(s) ? s : null;
    };
    const seated = () => api.players().slice(0, MAX_PLAYERS);
    const isSeated = id => seated().some(p => p.id === id);
    const nameOf = p => (p.me ? 'You' : p.name);

    // --- owner logic -----------------------------------------------------
    function newRound(round) {
      api.setShared({ round, seed: Math.floor(Math.random() * 4294967296), startedAt: Date.now() + READY });
    }

    function ownerTick() {
      if (api.isOwner() && !sharedNow()) newRound(1);
    }

    api.on('again', (d, from) => {
      const s = sharedNow();
      if (!api.isOwner() || !s || !d || d.round !== s.round || !isSeated(from)) return;
      if (Date.now() >= s.startedAt + DURATION) newRound(s.round + 1);
    });

    function playAgain() {
      const s = sharedNow();
      if (!s || Date.now() < s.startedAt + DURATION || !isSeated(api.me.id)) return;
      if (api.isOwner()) newRound(s.round + 1);
      else api.send('again', { round: s.round });
    }

    // --- round bookkeeping --------------------------------------------------
    function resetRound(s) {
      boardKey = `${s.round}:${s.seed}`;
      board = makeBoard(s.seed);
      found = [];
      foundSet = new Set();
      score = 0;
      clearPath();
      typed = '';
      results = null;
      lastResSig = '';
      lastSec = -1;
      cursor = -1;
      tiles.forEach((t, i) => {
        t.replaceChildren();
        const b = board[i];
        const letter = el('span');
        if (b === 'qu') letter.append(document.createTextNode('Q'), el('small', '', 'u'));
        else letter.textContent = b.toUpperCase();
        t.append(letter);
      });
      foundEl.replaceChildren();
      api.setState({ round: s.round, score: 0, count: 0, words: '', fin: false });
      updateHud();
    }

    // --- tracing ------------------------------------------------------------
    function wordOf(p) {
      return p.map(i => board[i]).join('');
    }

    function paint() {
      const live = path.length ? path : typed ? findPath(board, typed) || [] : [];
      tiles.forEach((t, i) => {
        const at = live.indexOf(i);
        t.classList.toggle('sel', at >= 0 && !flash);
        t.classList.toggle('head', at >= 0 && at === live.length - 1 && !flash && live.length > 1);
        for (const k of ['ok', 'bad', 'dup']) t.classList.toggle(k, at >= 0 && flash === k);
        t.classList.toggle('cursor', i === cursor);
      });
      const pts = live.map(i => {
        const r = Math.floor(i / SIZE), c = i % SIZE;
        return `${(c + 0.5) * 25},${(r + 0.5) * 25}`;
      });
      poly.setAttribute('points', pts.join(' '));
      svg.setAttribute('class', 'wb-line' + (flash ? ` ${flash}` : ''));
      if (!flash) {
        cur.className = 'wb-cur';
        cur.textContent = path.length ? wordOf(path).toUpperCase() : typed.toUpperCase() || curText;
      }
    }

    function clearPath() {
      path = [];
      tapMode = false;
      dragging = false;
      moved = false;
      flash = '';
      clearTimeout(flashTimer);
      flashTimer = 0;
    }

    function showFeedback(kind, text) {
      flash = kind;
      cur.className = `wb-cur ${kind}`;
      cur.textContent = text;
      paint();
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => {
        flashTimer = 0;
        flash = '';
        path = [];
        tapMode = false;
        typed = '';
        cur.className = 'wb-cur';
        cur.textContent = '';
        paint();
      }, kind === 'ok' ? 550 : 650);
    }

    function playing() {
      const s = sharedNow();
      const now = Date.now();
      return !!s && now >= s.startedAt && now < s.startedAt + DURATION;
    }

    // Checks a word and scores it. `p` is its path (or null to search for one).
    function submit(word, p) {
      if (!playing()) return;
      if (word.length < 3) return showFeedback('bad', 'Too short'), api.sfx('miss');
      if (foundSet.has(word)) return showFeedback('dup', 'Already found'), api.sfx('click');
      if (!WORDS.has(word)) return showFeedback('bad', 'Not a word'), api.sfx('miss');
      if (!p) p = findPath(board, word);
      if (!p) return showFeedback('bad', 'Not on the board'), api.sfx('miss');
      path = p;
      const pts = pointsFor(word);
      found.push(word);
      foundSet.add(word);
      score += pts;
      api.sfx(word.length >= 6 ? 'win' : 'score');
      api.setState({ round: sharedNow().round, score, count: found.length });
      addFoundChip(word, pts);
      updateHud();
      showFeedback('ok', `+${pts}  ${word.toUpperCase()}`);
    }

    function submitPath() {
      if (!path.length) return;
      const word = wordOf(path);
      submit(word, path.slice());
    }

    function addFoundChip(word, pts) {
      const c = el('span', 'wb-w fresh', word);
      c.append(el('b', '', `+${pts}`));
      foundEl.prepend(c);
      setTimeout(() => c.classList.remove('fresh'), 600);
      foundHead.textContent = `${found.length} word${found.length === 1 ? '' : 's'} · ${score} points`;
    }

    // Which tile (if any) is under the pointer; only the middle of a tile counts,
    // so diagonal swipes do not clip neighbours by accident.
    function tileAt(e) {
      const r = grid.getBoundingClientRect();
      const pad = r.width * 0.035;
      const cell = (r.width - pad * 2) / SIZE;
      const x = e.clientX - r.left - pad, y = e.clientY - r.top - pad;
      const c = Math.floor(x / cell), rr = Math.floor(y / cell);
      if (c < 0 || c >= SIZE || rr < 0 || rr >= SIZE) return -1;
      const dx = x - (c + 0.5) * cell, dy = y - (rr + 0.5) * cell;
      return Math.hypot(dx, dy) < cell * 0.42 ? rr * SIZE + c : -2;   // -2: in the gap
    }

    function extend(i) {
      if (i < 0) return;
      const at = path.indexOf(i);
      if (at >= 0 && at === path.length - 2) {
        path.pop();           // sliding back undoes the last tile
        moved = true;
        api.sfx('click');
      } else if (at < 0 && (!path.length || adjacent(path[path.length - 1], i))) {
        path.push(i);
        moved = true;
        api.sfx('click');
      } else return;
      paint();
    }

    function onDown(e) {
      if (!playing() || (e.button !== undefined && e.button > 0)) return;
      const i = tileAt(e);
      if (i < 0) { if (i === -1) { clearPath(); typed = ''; paint(); } return; }
      e.preventDefault();
      if (flash) clearPath();
      typed = '';
      if (path.length && tapMode) {
        if (i === path[path.length - 1]) { submitPath(); return; }
        if (!path.includes(i) && adjacent(path[path.length - 1], i)) {
          path.push(i);
          api.sfx('click');
        } else path = [i], api.sfx('click');
      } else {
        path = [i];
        api.sfx('click');
      }
      dragging = true;
      moved = false;
      tapMode = false;
      pointerId = e.pointerId;
      try { grid.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      paint();
    }

    function onMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      const i = tileAt(e);
      if (i >= 0 && i !== path[path.length - 1]) extend(i);
    }

    function onUp(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      try { grid.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (moved && path.length >= 2) submitPath();
      else if (path.length === 1 && !moved) tapMode = true;
      else if (!moved) tapMode = true;
      paint();
    }
    grid.addEventListener('pointerdown', onDown);
    grid.addEventListener('pointermove', onMove);
    grid.addEventListener('pointerup', onUp);
    grid.addEventListener('pointercancel', onUp);
    grid.addEventListener('contextmenu', e => e.preventDefault());

    // --- keyboard ---------------------------------------------------------------
    function onKey(e) {
      if (!api.el.isConnected || e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!playing()) {
        if (e.key === 'Enter' && sharedNow() && Date.now() >= sharedNow().startedAt + DURATION) { playAgain(); e.preventDefault(); }
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        if (flash) clearPath();
        path = [];
        tapMode = false;
        if (typed.length < 16) typed += e.key.toLowerCase();
        paint();
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        typed = typed.slice(0, -1);
        paint();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        clearPath();
        typed = '';
        paint();
      } else if (e.key === 'Enter') {
        if (path.length) submitPath();
        else if (typed) submit(typed, null);
        e.preventDefault();
      }
    }
    document.addEventListener('keydown', onKey);

    // --- controller: D-pad moves a cursor, A adds the tile (A on the last tile submits)
    function onPad(pad) {
      if (!pad || !api.el.isConnected) return;
      const edge = k => pad[k] && !padPrev[k];
      let dr = 0, dc = 0;
      if (edge('up')) dr = -1;
      else if (edge('down')) dr = 1;
      else if (edge('left')) dc = -1;
      else if (edge('right')) dc = 1;
      const pressA = edge('a'), pressX = edge('xBtn') || edge('yBtn');
      padPrev = { up: !!pad.up, down: !!pad.down, left: !!pad.left, right: !!pad.right, a: !!pad.a, xBtn: !!pad.xBtn, yBtn: !!pad.yBtn };
      if (!playing()) {
        if (pressA && sharedNow() && Date.now() >= sharedNow().startedAt + DURATION) playAgain();
        return;
      }
      if (dr || dc) {
        if (cursor < 0) cursor = 0;
        else cursor = clamp(Math.floor(cursor / SIZE) + dr, 0, SIZE - 1) * SIZE + clamp((cursor % SIZE) + dc, 0, SIZE - 1);
        paint();
      } else if (pressX) {
        clearPath();
        typed = '';
        paint();
      } else if (pressA) {
        if (cursor < 0) { cursor = 0; paint(); return; }
        if (flash) clearPath();
        typed = '';
        if (path.length && cursor === path[path.length - 1]) submitPath();
        else if (!path.length || (!path.includes(cursor) && adjacent(path[path.length - 1], cursor))) {
          path.push(cursor);
          tapMode = true;
          api.sfx('click');
          paint();
        } else {
          path = [cursor];
          tapMode = true;
          api.sfx('click');
          paint();
        }
      }
    }

    // --- hud ------------------------------------------------------------------------
    function updateHud() {
      scoreEl.textContent = String(score);
      foundHead.textContent = `${found.length} word${found.length === 1 ? '' : 's'} · ${score} points`;
      const s = sharedNow();
      const list = seated();
      chips.replaceChildren();
      if (list.length > 1) {
        for (const p of list) {
          const st = p.me ? { score, count: found.length } : (s && p.state.round === s.round ? p.state : { score: 0, count: 0 });
          const c = el('div', 'wb-chip');
          c.style.color = p.color || '';
          c.append(el('span', '', nameOf(p)), el('b', '', String(Number.isFinite(st.score) ? st.score : 0)), el('span', '', `${Number.isFinite(st.count) ? st.count : 0}w`));
          chips.append(c);
        }
      }
    }

    // --- results ----------------------------------------------------------------------
    // Everyone's words for this round, checked against the dictionary and the board.
    function collect(s) {
      const players = seated().map(p => {
        let words = [];
        let done = false;
        if (p.me) { words = found.slice(); done = true; }
        else if (p.state.round === s.round && p.state.fin === true && typeof p.state.words === 'string') {
          words = [...new Set(p.state.words.split(' ').slice(0, MAX_WORDS))].filter(w => /^[a-z]{3,16}$/.test(w) && WORDS.has(w) && findPath(board, w));
          done = true;
        }
        return { p, words, done };
      });
      const counts = new Map();
      for (const r of players) for (const w of r.words) counts.set(w, (counts.get(w) || 0) + 1);
      const solo = players.length === 1;
      for (const r of players) {
        r.live = r.words.reduce((n, w) => n + pointsFor(w), 0);
        r.final = r.words.reduce((n, w) => n + (!solo && counts.get(w) > 1 ? 0 : pointsFor(w)), 0);
      }
      players.sort((a, b) => b.final - a.final || b.words.length - a.words.length);
      return { players, counts, solo };
    }

    function renderResults(s) {
      const res = collect(s);
      const sig = JSON.stringify([s.round, res.players.map(r => [r.p.id, r.done, r.words.length, r.p.name])]);
      if (sig === lastResSig) return;
      lastResSig = sig;
      resEl.replaceChildren();
      const top = Math.max(...res.players.map(r => r.final));
      const me = res.players.find(r => r.p.me);
      const win = me && me.done && me.final === top && (res.solo || res.players.filter(r => r.final === top).length === 1);
      resEl.append(el('h2', '', res.solo ? `Time! ${me ? me.final : 0} points` : win ? 'You win! 🎉' : 'Time!'));
      if (res.solo) resEl.append(el('div', 'muted', best ? `Best round: ${best}` : ''));
      const cards = el('div', 'wb-cards');
      res.players.forEach((r, i) => {
        const card = el('div', 'wb-card' + (r.p.me ? ' me' : ''));
        const h = el('div', 'wb-card-h');
        h.append(el('span', 'rk', `#${i + 1}`), el('span', 'nm', nameOf(r.p)), el('span', 'pts', r.done ? `${r.final} pts` : '…'));
        const wl = el('div', 'wb-words');
        if (!r.done) wl.append(el('em', '', 'Waiting for their words…'));
        else if (!r.words.length) wl.append(el('em', '', 'No words found'));
        for (const w of r.words.slice().sort((a, b) => b.length - a.length || (a < b ? -1 : 1))) {
          const dupe = !res.solo && res.counts.get(w) > 1;
          wl.append(el('span', dupe ? 'dupe' : 'hit', w));
        }
        card.append(h, wl);
        cards.append(card);
      });
      resEl.append(cards);
      if (!res.solo) resEl.append(el('div', 'muted', 'Struck-through words were found by more than one player and do not score.'));

      // Best words nobody found.
      const all = allWords(board);
      const missed = [...all].filter(w => !res.counts.has(w)).sort((a, b) => b.length - a.length || (a < b ? -1 : 1)).slice(0, 12);
      const box = el('div', 'wb-miss');
      box.append(el('h3', '', `${all.size} words were hiding here. Best ones nobody found:`));
      const ml = el('div', 'wb-words');
      if (!missed.length) ml.append(el('em', '', 'You found them all!'));
      for (const w of missed) ml.append(el('span', '', w));
      box.append(ml);
      resEl.append(box);

      if (isSeated(api.me.id)) {
        const again = el('button', 'btn aqua', 'Play again');
        again.type = 'button';
        again.addEventListener('click', playAgain);
        resEl.append(again);
      }
    }

    // --- layout ---------------------------------------------------------------------------
    function layout() {
      const r = api.el.getBoundingClientRect();
      const w = r.width, h = r.height;
      root.classList.toggle('tight', w < 360 || h < 380);
      const landscape = w > h * 1.1;
      body.classList.toggle('portrait', !landscape);
      const used = top.offsetHeight + chips.offsetHeight + 40;
      const availH = Math.max(100, h - used - 40);
      let size;
      if (landscape) size = Math.min(availH, w * 0.58);
      else size = Math.min(w - 24, availH - Math.min(90, availH * 0.28));
      size = Math.max(110, Math.floor(size));
      grid.style.width = grid.style.height = `${size}px`;
      cellPx = size / SIZE;
      grid.style.setProperty('--tf', `${Math.max(16, cellPx * 0.5)}px`);
      right.style.display = w < 300 ? 'none' : '';
    }
    const ro = new ResizeObserver(layout);
    ro.observe(api.el);
    layout();

    // --- main loop ----------------------------------------------------------------------------
    function frame() {
      const s = sharedNow();
      if (!s) {
        cur.textContent = 'Getting the board ready…';
        return;
      }
      if (`${s.round}:${s.seed}` !== boardKey) resetRound(s);
      const now = Date.now();
      const until = s.startedAt - now;
      const left = s.startedAt + DURATION - now;
      const started = until <= 0;
      const over = left <= 0;

      grid.classList.toggle('veil', !started);
      countEl.hidden = started;
      if (!started) countEl.textContent = String(Math.ceil(until / 1000));
      timeEl.textContent = started ? fmtTime(Math.max(0, left)) : '1:30';
      barFill.style.transform = `scaleX(${started ? clamp(left / DURATION, 0, 1) : 1})`;
      bar.classList.toggle('low', started && left < 15000);

      if (started && !over) {
        const sec = Math.ceil(left / 1000);
        if (sec <= 5 && sec !== lastSec) { lastSec = sec; api.sfx('tick'); }
      }

      resEl.hidden = !over;
      leftCol.hidden = over;
      right.hidden = over;
      if (!started) curText = 'Get ready…';
      else if (curText === 'Get ready…') { curText = ''; if (!path.length && !typed && !flash) cur.textContent = ''; }
      if (!started && !path.length) cur.textContent = curText;

      if (over) {
        if (publishedFor !== boardKey) {
          publishedFor = boardKey;
          clearPath();
          typed = '';
          api.setState({ round: s.round, score, count: found.length, words: found.join(' '), fin: true });
        }
        if (endedFor !== boardKey) {
          endedFor = boardKey;
          if (score > best) { best = score; api.store.set('best', score); }
          lastResSig = '';
        }
        renderResults(s);
      }
    }

    // The leaderboard chips and found counts follow other players' state.
    let lastChipSig = '';
    function refreshChips() {
      const s = sharedNow();
      const sig = JSON.stringify([seated().map(p => [p.id, p.name, p.state.round, p.state.score, p.state.count]), s?.round, score]);
      if (sig !== lastChipSig) { lastChipSig = sig; updateHud(); }
    }

    timer = setInterval(() => {
      if (destroyed) return;
      ownerTick();
      frame();
      refreshChips();
    }, 100);
    ownerTick();
    frame();
    refreshChips();
    paint();

    // A test bot's move (js/rookie.js): every few seconds, a word that is on
    // the board (the board's words are found once per round). Slow enough to
    // lose to a person, but it plays.
    let botWords = null, botKey = '';
    function rookie(step) {
      if (!playing() || step % 8 !== 0) return;
      if (botKey !== boardKey) {
        botKey = boardKey;
        botWords = [];
        for (const w of WORDS) if (w.length >= 3 && w.length <= 6 && findPath(board, w)) botWords.push(w);
      }
      const left = botWords.filter(w => !foundSet.has(w));
      if (left.length) submit(left[Math.floor(Math.random() * left.length)], null);
    }

    return {
      rookie,
      destroy() {
        destroyed = true;
        clearInterval(timer);
        clearTimeout(flashTimer);
        ro.disconnect();
        document.removeEventListener('keydown', onKey);
        root.remove();
      },
      onChange() {
        if (destroyed) return;
        ownerTick();
        frame();
        refreshChips();
      },
      onPad,
    };
  },
};
