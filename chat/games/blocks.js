// Block Drop: a falling-block puzzle. Seven pieces of four squares fall into
// a 10 x 20 well; slide and turn them so they fill whole rows, which clear.
// Modern rules: a seeded 7-bag (every seven pieces hold one of each), SRS
// rotation with wall kicks, hold, a three-piece next queue, a ghost showing
// where the piece will land, soft and hard drops, half a second of lock
// delay (renewed by moving, up to 15 times), and a short flash as rows clear.
// Every ten lines is a level and the pieces fall faster.
//
// Scoring: 100 / 300 / 500 / 800 x level for one to four rows (a second
// 4-row clear in a row is worth half again), +50 x combo x level for each
// clear in an unbroken chain, 1 a row for soft drops and 2 for hard drops.
//
// Versus: everyone plays their own well, all from the owner's seed, so every
// player gets the same pieces in the same order. Each player publishes their
// well in their state (packed rows, the falling piece, score, lines, level,
// waiting garbage, out or not) about eight times a second, and everyone draws
// everyone else's well live beside or above their own, with their face. Two
// rows or more cleared at once send garbage: 2 -> 1 row, 3 -> 2, 4 -> 4, and
// a combo adds 1 to 4 more. Garbage first cancels rows waiting for you; the
// rest goes to your one opponent, or with more, to whoever leads on points.
// It waits beside the well (the red bar) and rises from the bottom, with one
// gap, the next time you lock a piece without clearing a row. Topping out
// puts you out for the round to watch; the last one standing wins. Alone it
// is an endless marathon with the best score kept on the device.
//
// The owner runs the round in shared state { v, r, seed, at, ph, pl, win, wn,
// next }: who has played it, whether it has ended, the winner, and when the
// next one starts. Anyone who joins mid-round starts at once with an empty
// well (same seed, from the first piece). Garbage travels as 'atk' messages
// { r, to, n, h } that every seat checks (sender in the round, sizes, rate)
// and draws as a streak from the sender's well to the target's.
//
// Artwork blocks-tile (a white glossy cell, tinted per piece) and blocks-bg
// (the backdrop) are drawn from api.img once delivered; until then both are
// drawn here.

const COLS = 10, ROWS = 20, HIDDEN = 2, TOTAL = ROWS + HIDDEN;
const NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const COLORS = ['#38e1ff', '#ffd43b', '#c15cff', '#5ee05e', '#ff4d5e', '#4d7cff', '#ff9f1c'];
const GARBAGE = 8;
const GARBAGE_COLOR = '#8a84a3';
const LOCK_DELAY = 0.5;          // s on the ground before a piece locks
const MAX_RESETS = 15;           // moves that renew the lock delay on one row
const CLEAR_T = 0.34;            // s rows flash before they clear
const SOFT_ROWS = 22;            // soft drop: at least this many rows a second
const LINE_POINTS = [0, 100, 300, 500, 800];
const LINE_ATTACK = [0, 0, 1, 2, 4];
const MAX_PENDING = 20;          // garbage rows that can wait for one player
const MAX_INSERT = 8;            // most garbage rows rising at one lock
const ATTACK_RATE = 18;          // most garbage rows one player may send in ATTACK_WINDOW
const ATTACK_WINDOW = 4000;
const MAX_PLAYERS = 8;
const PUBLISH_MS = 120;
const COUNTDOWN = 2600;          // ms before a fresh round's first piece
const NEXT_ROUND = 6500;         // ms the results stay before the next versus round
const DAS = 0.16, ARR = 0.045;   // key / stick auto-repeat for sideways moves
const COLOR = /^#[0-9a-f]{3,8}$/i;
const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;

// --- pure logic (exported for tests) --------------------------------------

// Small seeded PRNG (mulberry32).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The 7-bag for a seed: at(i) is the i-th piece dealt (0..6). Each run of
// seven holds every piece once, shuffled.
function makeBag(seed) {
  const rnd = mulberry32(seed);
  const list = [];
  return {
    seed,
    at(i) {
      while (list.length <= i) {
        const bag = [0, 1, 2, 3, 4, 5, 6];
        for (let k = 6; k > 0; k--) {
          const j = Math.floor(rnd() * (k + 1));
          [bag[k], bag[j]] = [bag[j], bag[k]];
        }
        list.push(...bag);
      }
      return list[i];
    },
  };
}

// Spawn shapes (state 0) in their SRS boxes, x right and y down.
const SPAWN = [
  { n: 4, c: [[0, 1], [1, 1], [2, 1], [3, 1]] },  // I
  { n: 4, c: [[1, 0], [2, 0], [1, 1], [2, 1]] },  // O (never turns)
  { n: 3, c: [[1, 0], [0, 1], [1, 1], [2, 1]] },  // T
  { n: 3, c: [[1, 0], [2, 0], [0, 1], [1, 1]] },  // S
  { n: 3, c: [[0, 0], [1, 0], [1, 1], [2, 1]] },  // Z
  { n: 3, c: [[0, 0], [0, 1], [1, 1], [2, 1]] },  // J
  { n: 3, c: [[2, 0], [0, 1], [1, 1], [2, 1]] },  // L
];
// SHAPES[t][r]: the cells of piece t in rotation r (0 spawn, 1 right, 2, 3 left).
const SHAPES = SPAWN.map(({ n, c }, t) => {
  const out = [c];
  for (let r = 1; r < 4; r++) out.push(t === 1 ? c : out[r - 1].map(([x, y]) => [n - 1 - y, x]));
  return out;
});
const cellsOf = (t, r) => SHAPES[t][((r % 4) + 4) % 4];

// SRS wall kicks, written with y UP as in the guideline tables; tried in order.
const KICKS = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};
function kicksFor(t, from, to) {
  if (t === 1) return [[0, 0]];
  return (t === 0 ? KICKS_I : KICKS)[`${from}>${to}`];
}

const emptyRow = () => new Array(COLS).fill(0);
const emptyBoard = () => Array.from({ length: TOTAL }, emptyRow);

// Does piece t in rotation r fit with its box at (x, y)?
function fits(board, t, r, x, y) {
  for (const [cx, cy] of cellsOf(t, r)) {
    const bx = x + cx, by = y + cy;
    if (bx < 0 || bx >= COLS || by >= TOTAL) return false;
    if (by >= 0 && board[by][bx]) return false;
  }
  return true;
}

// Seconds a piece takes to fall one row at a level (the guideline curve).
function gravity(level) {
  const l = clamp(level, 1, 20);
  return Math.max(1 / 60, Math.pow(0.8 - (l - 1) * 0.007, l - 1));
}

// Garbage rows a clear of `lines` sends, with the combo count (0 for the
// first clear of a chain, 1 for the next...).
function comboBonus(combo) {
  return combo <= 0 ? 0 : Math.min(4, Math.floor((combo + 1) / 2));
}
function attackFor(lines, combo) {
  if (!isInt(lines, 1, 4)) return 0;
  return LINE_ATTACK[lines] + comboBonus(combo);
}
// Points for a clear (before soft/hard drop points).
function pointsFor(lines, level, combo, b2b) {
  if (!isInt(lines, 1, 4)) return 0;
  let p = LINE_POINTS[lines] * level;
  if (lines === 4 && b2b) p = Math.floor(p * 1.5);
  return p + (combo > 0 ? 50 * combo * level : 0);
}

// Who my garbage goes to: the only other player, or with more, the one with
// the most points (ties: the lowest id), never me or anyone out.
function pickTarget(me, others) {
  const live = others.filter(o => o && o.id !== me && !o.ko);
  if (!live.length) return null;
  live.sort((a, b) => (b.sc || 0) - (a.sc || 0) || (a.id < b.id ? -1 : 1));
  return live[0].id;
}

// --- the well --------------------------------------------------------------

function newWell(seed) {
  const s = {
    seed, bag: makeBag(seed), n: 0, board: emptyBoard(), cur: null, hold: -1, held: false,
    score: 0, lines: 0, level: 1, combo: -1, b2b: false, over: false,
    fall: 0, lock: 0, resets: 0, low: 0, clear: null, incoming: [], events: [], placed: 0, dealt: [],
  };
  spawn(s, null);
  return s;
}
const nextPieces = (s, k = 3) => Array.from({ length: k }, (_, i) => s.bag.at(s.n + i));
const pending = s => s.incoming.reduce((a, g) => a + g.n, 0);

// Brings in the next piece (or `t` when swapping with hold). Tops out when it
// can't appear.
function spawn(s, t) {
  if (t == null) { t = s.bag.at(s.n++); s.dealt.push(t); }
  // In the top two visible rows, or higher up if they are taken.
  const x = 3;
  let y = HIDDEN - (t === 0 ? 1 : 0);
  while (y > 0 && !fits(s.board, t, 0, x, y)) y--;
  s.cur = { t, r: 0, x, y };
  s.fall = 0; s.lock = 0; s.resets = 0; s.low = y;
  if (!fits(s.board, t, 0, x, y)) {
    s.over = true;
    s.events.push({ type: 'over' });
  }
}

const grounded = s => !!s.cur && !fits(s.board, s.cur.t, s.cur.r, s.cur.x, s.cur.y + 1);

// A successful move or turn on the ground renews the lock delay (a limited
// number of times per row reached).
function touched(s) {
  if (grounded(s) && s.resets < MAX_RESETS) { s.lock = 0; s.resets++; }
}

function move(s, dx) {
  const c = s.cur;
  if (!c || s.over || s.clear || !fits(s.board, c.t, c.r, c.x + dx, c.y)) return false;
  c.x += dx;
  touched(s);
  return true;
}

// Turns the falling piece (dir 1 clockwise, -1 anticlockwise), trying the
// SRS kicks in order. Returns the kick used, or null.
function rotate(s, dir) {
  const c = s.cur;
  if (!c || s.over || s.clear) return null;
  if (c.t === 1) return null;
  const to = (c.r + (dir > 0 ? 1 : 3)) % 4;
  for (const [kx, ky] of kicksFor(c.t, c.r, to)) {
    if (fits(s.board, c.t, to, c.x + kx, c.y - ky)) {
      c.x += kx; c.y -= ky; c.r = to;
      if (c.y > s.low) { s.low = c.y; s.resets = 0; }
      touched(s);
      return [kx, ky];
    }
  }
  return null;
}

function stepDown(s) {
  const c = s.cur;
  if (!c || !fits(s.board, c.t, c.r, c.x, c.y + 1)) return false;
  c.y++;
  if (c.y > s.low) { s.low = c.y; s.resets = 0; s.lock = 0; }
  return true;
}

// The row the falling piece would land on.
function ghostY(s) {
  const c = s.cur;
  if (!c) return 0;
  let y = c.y;
  while (fits(s.board, c.t, c.r, c.x, y + 1)) y++;
  return y;
}

function hardDrop(s) {
  const c = s.cur;
  if (!c || s.over || s.clear) return 0;
  const from = c.y;
  c.y = ghostY(s);
  const dist = c.y - from;
  s.score += 2 * dist;
  s.events.push({ type: 'drop', t: c.t, r: c.r, x: c.x, from, to: c.y, dist });
  lockPiece(s);
  return dist;
}

function hold(s) {
  if (!s.cur || s.held || s.over || s.clear) return false;
  const t = s.cur.t;
  const swap = s.hold;
  s.hold = t;
  s.held = true;
  spawn(s, swap >= 0 ? swap : null);
  s.events.push({ type: 'hold' });
  return true;
}

// Full rows (board indices, top to bottom).
function fullRows(board) {
  const out = [];
  board.forEach((row, y) => { if (row.every(v => v)) out.push(y); });
  return out;
}
function removeRows(board, rows) {
  const keep = board.filter((_, y) => !rows.includes(y));
  while (keep.length < TOTAL) keep.unshift(emptyRow());
  return keep;
}
// Pushes n garbage rows (one gap at column `hole`) up from the bottom.
// Returns { board, top } where top says blocks were pushed out of the top.
function addGarbage(board, n, hole) {
  n = clamp(n | 0, 0, TOTAL);
  const top = board.slice(0, n).some(row => row.some(v => v));
  const rows = Array.from({ length: n }, () => { const r = new Array(COLS).fill(GARBAGE); r[clamp(hole | 0, 0, COLS - 1)] = 0; return r; });
  return { board: [...board.slice(n), ...rows], top };
}

// Locks the falling piece into the well: clears rows, scores, works out the
// garbage it sends, and lets waiting garbage rise when nothing cleared.
function lockPiece(s) {
  const c = s.cur;
  if (!c) return;
  let above = true;
  for (const [cx, cy] of cellsOf(c.t, c.r)) {
    const y = c.y + cy;
    if (y >= 0) s.board[y][c.x + cx] = c.t + 1;
    if (y >= HIDDEN) above = false;
  }
  s.cur = null;
  s.held = false;
  s.placed++;
  s.events.push({ type: 'lock', t: c.t, r: c.r, x: c.x, y: c.y });
  if (above) {
    // Locked entirely above the visible well: out.
    s.over = true;
    s.events.push({ type: 'over' });
    return;
  }
  const rows = fullRows(s.board);
  if (rows.length) {
    s.combo++;
    const n = rows.length;
    const b2b = n === 4 && s.b2b;
    const pts = pointsFor(n, s.level, s.combo, b2b);
    s.score += pts;
    s.b2b = n === 4 ? true : false;
    let attack = attackFor(n, s.combo);
    // Cancel garbage waiting for me first.
    let cancelled = 0;
    while (attack > 0 && s.incoming.length) {
      const g = s.incoming[0];
      const k = Math.min(g.n, attack);
      g.n -= k; attack -= k; cancelled += k;
      if (!g.n) s.incoming.shift();
    }
    s.lines += n;
    const level = 1 + Math.floor(s.lines / 10);
    const up = level > s.level;
    s.level = level;
    s.clear = { rows, t: CLEAR_T, cells: rows.map(y => s.board[y].slice()) };
    s.events.push({ type: 'clear', rows: rows.slice(), lines: n, combo: s.combo, b2b, pts, attack, cancelled, level: up ? level : 0 });
    return;
  }
  s.combo = -1;
  if (s.incoming.length) {
    let room = MAX_INSERT, total = 0, top = false;
    while (room > 0 && s.incoming.length) {
      const g = s.incoming[0];
      const k = Math.min(g.n, room);
      const res = addGarbage(s.board, k, g.h);
      s.board = res.board;
      top = top || res.top;
      g.n -= k; room -= k; total += k;
      if (!g.n) s.incoming.shift();
    }
    s.events.push({ type: 'garbage', n: total });
    if (top) {
      s.over = true;
      s.events.push({ type: 'over' });
      return;
    }
  }
  spawn(s, null);
}

// Queues garbage sent to me. Returns the rows accepted.
function receive(s, n, h) {
  if (!isInt(n, 1, 12) || !isInt(h, 0, COLS - 1) || s.over) return 0;
  const k = Math.min(n, MAX_PENDING - pending(s));
  if (k > 0) s.incoming.push({ n: k, h });
  return Math.max(0, k);
}

// Advances the well by dt seconds (soft: soft drop held).
function tick(s, dt, soft = false) {
  if (s.over) return;
  if (s.clear) {
    s.clear.t -= dt;
    if (s.clear.t <= 0) {
      s.board = removeRows(s.board, s.clear.rows);
      s.clear = null;
      spawn(s, null);
    }
    return;
  }
  if (!s.cur) return;
  const g = gravity(s.level);
  const every = soft ? Math.min(g, 1 / SOFT_ROWS) : g;
  s.fall += dt;
  while (s.fall >= every) {
    s.fall -= every;
    if (stepDown(s)) { if (soft) s.score += 1; } else { s.fall = 0; break; }
  }
  if (grounded(s)) {
    s.lock += dt;
    if (s.lock >= LOCK_DELAY) lockPiece(s);
  } else {
    s.lock = 0;
  }
}

// --- network state ---------------------------------------------------------

// My well for presence: the visible rows from the highest filled one down,
// one digit a cell ('' for an empty well).
function packBoard(board) {
  const vis = board.slice(HIDDEN);
  let first = vis.findIndex(row => row.some(v => v));
  if (first < 0) return '';
  return vis.slice(first).map(row => row.join('')).join('');
}
// Back to 20 rows of 10; null if it isn't a packed well.
function unpackBoard(str) {
  if (typeof str !== 'string' || str.length > COLS * ROWS || str.length % COLS || !/^[0-8]*$/.test(str)) return null;
  const n = str.length / COLS;
  const rows = Array.from({ length: ROWS - n }, emptyRow);
  for (let i = 0; i < n; i++) rows.push([...str.slice(i * COLS, (i + 1) * COLS)].map(Number));
  return rows;
}

// A player's published state, checked.
function readPlayer(st) {
  if (!st || typeof st !== 'object' || !isInt(st.r, 1, 1e6)) return null;
  const board = unpackBoard(st.b ?? '');
  if (!board) return null;
  let p = null;
  if (Array.isArray(st.p) && st.p.length === 4) {
    const [t, r, x, y] = st.p;
    if (isInt(t, 0, 6) && isInt(r, 0, 3) && isInt(x, -3, COLS) && isInt(y, -HIDDEN - 2, ROWS)) p = { t, r, x, y };
  }
  const num = (v, max) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : 0);
  return {
    r: st.r, board, p,
    sc: num(st.sc, 99999999), ln: num(st.ln, 99999), lv: clamp(num(st.lv, 999), 1, 999),
    ko: st.ko === 1 || st.ko === true, g: num(st.g, MAX_PENDING), hd: isInt(st.hd, 0, 6) ? st.hd : -1,
  };
}

// The owner's round, checked.
function readShared(sh) {
  if (!sh || typeof sh !== 'object' || sh.v !== 1) return null;
  if (!isInt(sh.r, 1, 1e6) || !isInt(sh.seed, 0, 4294967295) || !Number.isFinite(sh.at)) return null;
  if (sh.ph !== 'play' && sh.ph !== 'done') return null;
  const id = v => typeof v === 'string' && v.length > 0 && v.length <= 64;
  const pl = Array.isArray(sh.pl) ? [...new Set(sh.pl.filter(id))].slice(0, MAX_PLAYERS) : [];
  return {
    v: 1, r: sh.r, seed: sh.seed, at: sh.at, ph: sh.ph, pl,
    win: id(sh.win) ? sh.win : '', wn: typeof sh.wn === 'string' ? sh.wn.slice(0, 24) : '',
    next: Number.isFinite(sh.next) ? sh.next : 0,
  };
}

// A garbage message, checked.
function readAttack(d) {
  if (!d || typeof d !== 'object') return null;
  if (!isInt(d.r, 1, 1e6) || typeof d.to !== 'string' || !d.to || d.to.length > 64) return null;
  if (!isInt(d.n, 1, 12) || !isInt(d.h, 0, COLS - 1)) return null;
  return { r: d.r, to: d.to, n: d.n, h: d.h };
}

// Allows a sender at most ATTACK_RATE rows in any ATTACK_WINDOW ms.
function rateOk(log, n, now) {
  while (log.length && now - log[0][0] > ATTACK_WINDOW) log.shift();
  const sum = log.reduce((a, e) => a + e[1], 0);
  if (sum + n > ATTACK_RATE) return false;
  log.push([now, n]);
  return true;
}

// --- a simple bot ----------------------------------------------------------

// Scores a board for the bot: low, flat, few holes, rows cleared.
function evalBoard(board, lines) {
  const heights = new Array(COLS).fill(0);
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    let seen = false;
    for (let y = 0; y < TOTAL; y++) {
      if (board[y][x]) { if (!seen) { heights[x] = TOTAL - y; seen = true; } } else if (seen) holes++;
    }
  }
  let bump = 0;
  for (let x = 0; x < COLS - 1; x++) bump += Math.abs(heights[x] - heights[x + 1]);
  const agg = heights.reduce((a, b) => a + b, 0);
  return -0.51 * agg + 0.76 * lines - 0.36 * holes * 2 - 0.18 * bump - (Math.max(...heights) > 15 ? 5 : 0);
}
// Every place the current piece can drop straight down into, best first:
// [{ r, x, score }].
function placements(s) {
  const c = s.cur;
  if (!c) return [];
  const out = [];
  const rots = c.t === 1 ? [0] : [0, 1, 2, 3];
  for (const r of rots) {
    for (let x = -3; x < COLS; x++) {
      if (!fits(s.board, c.t, r, x, 0) && !fits(s.board, c.t, r, x, 1)) continue;
      let y = fits(s.board, c.t, r, x, 1) ? 1 : 0;
      while (fits(s.board, c.t, r, x, y + 1)) y++;
      const b = s.board.map(row => row.slice());
      for (const [cx, cy] of cellsOf(c.t, r)) if (y + cy >= 0) b[y + cy][x + cx] = 1;
      const full = fullRows(b);
      out.push({ r, x, score: evalBoard(removeRows(b, full), full.length) });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

// --- stand-in art ------------------------------------------------------------

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A glossy bevelled jelly block of `color`, `size` px square.
function drawStandInTile(ctx, size, color) {
  const s = size, r = Math.max(1.5, s * 0.16), b = Math.max(1, s * 0.12);
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.35));
  roundRect(ctx, 0.5, 0.5, s - 1, s - 1, r);
  ctx.fillStyle = g;
  ctx.fill();
  // Bevel: light top and left, dark bottom and right.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s, 0); ctx.lineTo(s - b, b); ctx.lineTo(b, b); ctx.lineTo(b, s - b); ctx.lineTo(0, s); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,20,0.28)';
  ctx.beginPath(); ctx.moveTo(s, s); ctx.lineTo(0, s); ctx.lineTo(b, s - b); ctx.lineTo(s - b, s - b); ctx.lineTo(s - b, b); ctx.lineTo(s, 0); ctx.fill();
  // Gloss.
  const gl = ctx.createRadialGradient(s * 0.3, s * 0.26, 0, s * 0.3, s * 0.26, s * 0.42);
  gl.addColorStop(0, 'rgba(255,255,255,0.85)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.ellipse(s * 0.32, s * 0.27, s * 0.24, s * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  roundRect(ctx, 0.5, 0.5, s - 1, s - 1, r);
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.strokeStyle = shade(color, -0.55);
  ctx.stroke();
}

// The night-sky stand-in backdrop with bokeh and drifting block outlines.
function drawStandInBackdrop(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, '#24104f');
  g.addColorStop(0.5, '#170b3a');
  g.addColorStop(1, '#0c0726');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(42);
  for (let i = 0; i < 38; i++) {
    const x = rnd() * w, y = rnd() * h, r = 6 + rnd() * Math.min(w, h) * 0.06;
    const hue = [280, 320, 190, 220, 40][Math.floor(rnd() * 5)];
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `hsla(${hue},90%,70%,${0.1 + rnd() * 0.16})`);
    gr.addColorStop(1, `hsla(${hue},90%,70%,0)`);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    const x = rnd() * w, y = rnd() * h, s = 12 + rnd() * 26, a = (rnd() - 0.5) * 0.8;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = `rgba(190,170,255,${0.06 + rnd() * 0.08})`;
    const shape = SPAWN[Math.floor(rnd() * 7)].c;
    for (const [cx, cy] of shape) ctx.strokeRect(cx * s, cy * s, s, s);
    ctx.restore();
  }
  // Darker in the middle, where the well sits.
  const v = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.5);
  v.addColorStop(0, 'rgba(5,2,20,0.35)');
  v.addColorStop(1, 'rgba(5,2,20,0)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

// --- layout ----------------------------------------------------------------

// Where everything goes for a w x h area with `nOpp` other players.
// Upright (a phone): hold, score and the next queue in a bar over a big well,
// with up to three friends' wells in a rail beside it (more go in a strip on
// top). Sideways: hold and score left of the well, the queue right of it, and
// friends' wells in a column on the right.
const HEAD = 22;
function gridSlots(box, n) {
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const mc = Math.min((box.w / cols - 10) / COLS, (box.h / rows - 34) / ROWS);
    if (!best || mc > best.mc) best = { cols, rows, mc };
  }
  const cw = box.w / best.cols, ch = box.h / best.rows;
  return Array.from({ length: n }, (_, i) => ({ x: box.x + (i % best.cols) * cw + 3, y: box.y + Math.floor(i / best.cols) * ch + 2, w: cw - 6, h: ch - 4 }));
}
function computeLayout(w, h, ins, nOpp) {
  const top = (ins.top || 0) + 8, bot = h - (ins.bottom || 0) - 8;
  const H = Math.max(100, bot - top), W = Math.max(100, w - 16);
  const portrait = H > W * 1.25;
  let area = { x: 8, y: top, w: W, h: H };
  let slots = [];
  if (portrait) {
    let strip = null;
    if (nOpp > 3) {
      const sh = clamp(H * 0.19, 90, 170);
      strip = { x: 8, y: top, w: W, h: sh };
      area = { x: 8, y: top + sh + 4, w: W, h: H - sh - 4 };
    }
    const railK = nOpp > 0 && !strip ? 2.9 : 0, gapK = railK ? 0.35 : 0;
    const BAR = 3.1, BARW = 13;
    const cell = Math.max(6, Math.floor(Math.min(area.w / Math.max(10 + railK + gapK, BARW), (area.h - HEAD) / (20 + BAR + 0.3))));
    const groupW = (10 + railK + gapK) * cell, barW = Math.max(groupW, BARW * cell);
    const extra = area.h - HEAD - (20 + BAR + 0.3) * cell;
    const ty = Math.round(area.y + extra * 0.45);
    const barX = Math.round(area.x + (area.w - barW) / 2);
    const wx = Math.round(area.x + (area.w - groupW) / 2), wy = Math.round(ty + (BAR + 0.3) * cell + HEAD);
    const hold = { x: barX, y: ty, w: 3 * cell, h: BAR * cell };
    const next = { x: barX + barW - 6.6 * cell, y: ty, w: 6.6 * cell, h: BAR * cell, dir: 'h' };
    const stats = { x: hold.x + hold.w + 0.2 * cell, y: ty, w: next.x - hold.x - hold.w - 0.4 * cell, h: BAR * cell };
    if (strip) slots = gridSlots(strip, nOpp);
    else if (railK) {
      const rail = { x: wx + (10 + gapK) * cell, y: wy - HEAD, w: railK * cell, h: 20 * cell + HEAD };
      const each = rail.h / Math.max(2, nOpp);
      slots = Array.from({ length: nOpp }, (_, i) => ({ x: rail.x, y: rail.y + i * each, w: rail.w, h: each - 4 }));
    }
    return { w, h, cell, portrait, wx, wy, wellW: COLS * cell, wellH: ROWS * cell, hold, next, stats, head: { x: wx, y: wy - HEAD, w: COLS * cell }, slots };
  }
  let column = null;
  if (nOpp > 0) {
    const ow = clamp(W * (nOpp > 2 ? 0.36 : 0.26), 110, 520);
    column = { x: 8 + W - ow, y: top, w: ow, h: H };
    area = { x: 8, y: top, w: W - ow - 10, h: H };
  }
  const side = 4.1;
  const cell = Math.max(6, Math.floor(Math.min(area.w / (10 + 2 * side + 0.9), (area.h - HEAD - 4) / 20)));
  const wellW = COLS * cell, wellH = ROWS * cell;
  const wx = Math.round(area.x + (area.w - wellW) / 2);
  const wy = Math.round(area.y + HEAD + (area.h - HEAD - 4 - wellH) / 2);
  const colW = side * cell;
  const leftX = Math.round(wx - 0.45 * cell - colW), rightX = Math.round(wx + wellW + 0.45 * cell);
  if (column) slots = gridSlots(column, nOpp);
  return {
    w, h, cell, portrait, wx, wy, wellW, wellH,
    hold: { x: leftX, y: wy, w: colW, h: 3.6 * cell },
    stats: { x: leftX, y: wy + 4.1 * cell, w: colW, h: 6 * cell },
    next: { x: rightX, y: wy, w: colW, h: 8.6 * cell, dir: 'v' },
    head: { x: wx, y: wy - HEAD, w: wellW },
    slots,
  };
}

// Inside a slot: the face bubble, the name line and a mini-well.
function miniLayout(slot) {
  const head = clamp(slot.h * 0.16, 22, 34);
  const mc = Math.max(2, Math.min(slot.w / COLS, (slot.h - head - 4) / ROWS));
  const ww = mc * COLS, wh = mc * ROWS;
  const x = slot.x + (slot.w - ww) / 2, y = slot.y + head + 2;
  return { mc, x, y, w: ww, h: wh, head, cx: slot.x + slot.w / 2, top: slot.y };
}

export default {
  id: 'blocks',
  name: 'Block Drop',
  emoji: '🧱',
  blurb: 'Stack falling blocks, clear rows, bury your friends in garbage.',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const style = document.createElement('style');
    style.textContent = `
      .bd-wrap { position: absolute; inset: 0; overflow: hidden; background: #140a33; touch-action: none; user-select: none; -webkit-user-select: none; }
      .bd-wrap canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
      .bd-hold { position: absolute; border-radius: 12px; border: 0; background: transparent; padding: 0; cursor: pointer; touch-action: none;
        -webkit-tap-highlight-color: transparent; color: transparent; font-size: 1px; }
      .bd-hold:focus-visible { outline: 3px solid var(--aqua, #3fe0d0); outline-offset: 2px; }
      .bd-hold:active { background: rgba(255,255,255,0.08); }
      .bd-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); min-width: 240px; max-width: calc(100% - 32px);
        background: rgba(26,12,62,0.94); border: 2px solid rgba(255,255,255,0.16); border-radius: 20px; padding: 16px 18px 18px; color: #fff;
        box-shadow: 0 14px 40px rgba(0,0,0,0.5); text-align: center; font-family: ${FONT}; }
      .bd-card h2 { margin: 0 0 4px; font: 900 26px ${FONT}; color: var(--sun, #ffd43b); letter-spacing: 0.5px; }
      .bd-card .sub { font: 700 14px ${FONT}; color: #d8ccff; margin-bottom: 10px; }
      .bd-card ol { list-style: none; margin: 0 0 12px; padding: 0; text-align: left; }
      .bd-card li { display: grid; grid-template-columns: 26px 12px 1fr auto; gap: 8px; align-items: center; padding: 5px 4px;
        font: 800 15px ${FONT}; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .bd-card li .dot { width: 12px; height: 12px; border-radius: 50%; }
      .bd-card li .pts { font-variant-numeric: tabular-nums; color: #d8ccff; font-size: 13px; }
      .bd-card li.me { color: var(--sun, #ffd43b); }
      .bd-card .wait { font: 700 13px ${FONT}; color: #c9bdf0; }
    `;
    const wrap = document.createElement('div');
    wrap.className = 'bd-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Block Drop well. Tap to turn the piece, drag sideways to move it, drag down to drop it softly, flick down to drop it at once, swipe up to hold.');
    const holdBtn = document.createElement('button');
    holdBtn.className = 'bd-hold';
    holdBtn.type = 'button';
    holdBtn.textContent = 'Hold';
    holdBtn.setAttribute('aria-label', 'Hold piece');
    const card = document.createElement('div');
    card.className = 'bd-card';
    card.hidden = true;
    const cardTitle = document.createElement('h2');
    const cardSub = document.createElement('div');
    cardSub.className = 'sub';
    const cardList = document.createElement('ol');
    const cardWait = document.createElement('div');
    cardWait.className = 'wait';
    const again = document.createElement('button');
    again.className = 'btn aqua';
    again.textContent = 'Play again';
    card.append(cardTitle, cardSub, cardList, cardWait, again);
    wrap.append(canvas, holdBtn, card);
    api.el.append(style, wrap);
    const ctx = canvas.getContext('2d');

    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const myId = api.me.id;
    let best = Number(api.store.get('best', 0)) || 0;
    let w = 1, h = 1, dpr = 1, L = null, nOppLaid = -1;
    let bgCanvas = null, bgArt = null;
    const tiles = new Map();         // `${color}:${size}:${art}` -> canvas
    let raf = 0, last = performance.now(), clock = 0, destroyed = false;

    // The round as I see it.
    let S = null;                    // readShared()
    let round = 0;
    let well = null;                 // my well (newWell) this round, or null: watching
    let goAt = 0;                    // ms: my first piece falls
    let koSent = false, bestShown = false;
    let lastPub = 0, dirty = true;
    const attackLog = new Map();     // sender id -> [[ms, rows]] (rate limit)
    // Others' wells: id -> { st (readPlayer), flash, lines }
    const others = new Map();
    // Effects.
    let parts = [], pops = [], streaks = [], shake = 0, bump = 0, flash = 0;
    let dropTrail = null;
    // Input.
    const keys = { left: false, right: false, down: false };
    let dasDir = 0, dasT = 0, arrT = 0;
    let padPrev = {}, padDas = { dir: 0, t: 0, arr: 0 };
    let padSoft = false;
    let rookieUntil = 0, botPlan = null;
    let lastCount = '';

    // --- layout ------------------------------------------------------------
    const opponents = () => api.players().filter(p => !p.me).slice(0, MAX_PLAYERS - 1);
    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      relayout();
      bgCanvas = null;
    }
    function relayout() {
      const n = opponents().length;
      nOppLaid = n;
      L = computeLayout(w, h, api.insets ? api.insets() : { top: 0, bottom: 0 }, n);
      Object.assign(holdBtn.style, { left: `${L.hold.x}px`, top: `${L.hold.y}px`, width: `${L.hold.w}px`, height: `${L.hold.h}px` });
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);

    function backdrop() {
      const art = api.img('blocks-bg');
      if (bgCanvas && bgArt === art) return bgCanvas;
      bgArt = art;
      bgCanvas = document.createElement('canvas');
      bgCanvas.width = Math.round(w * dpr);
      bgCanvas.height = Math.round(h * dpr);
      const b = bgCanvas.getContext('2d');
      b.scale(dpr, dpr);
      if (art) {
        const k = Math.max(w / art.width, h / art.height);
        b.drawImage(art, (w - art.width * k) / 2, (h - art.height * k) / 2, art.width * k, art.height * k);
      } else {
        drawStandInBackdrop(b, w, h);
      }
      return bgCanvas;
    }

    // A block sprite of `color`, `size` px, from the delivered tile tinted or the stand-in.
    function tile(color, size) {
      size = Math.max(2, Math.round(size));
      const art = api.img('blocks-tile');
      const key = `${color}:${size}:${art ? 1 : 0}`;
      let c = tiles.get(key);
      if (c) return c;
      if (tiles.size > 400) tiles.clear();
      c = document.createElement('canvas');
      const px = Math.round(size * dpr);
      c.width = c.height = px;
      const t = c.getContext('2d');
      if (art) {
        t.drawImage(art, 0, 0, px, px);
        t.globalCompositeOperation = 'multiply';
        t.fillStyle = color;
        t.fillRect(0, 0, px, px);
        t.globalCompositeOperation = 'destination-in';
        t.drawImage(art, 0, 0, px, px);
      } else {
        t.scale(dpr, dpr);
        drawStandInTile(t, size, color);
      }
      tiles.set(key, c);
      return c;
    }
    const colorOfCell = v => (v === GARBAGE ? GARBAGE_COLOR : COLORS[v - 1] || '#fff');

    // --- the round ---------------------------------------------------------
    const seated = () => api.players().slice(0, MAX_PLAYERS);
    const amSeated = () => seated().some(p => p.id === myId);

    function commit(next) {
      api.setShared(next);
      sync();
    }
    function newRound(r) {
      commit({ v: 1, r, seed: Math.floor(Math.random() * 4294967296), at: Date.now() + COUNTDOWN, ph: 'play', pl: [], win: '', wn: '', next: 0 });
    }
    const playerStates = () => {
      const out = new Map();
      for (const m of api.players()) {
        const st = m.me ? myPublished() : readPlayer(m.state);
        if (st) out.set(m.id, { ...st, id: m.id, name: m.name, color: COLOR.test(m.color || '') ? m.color : '#ffffff' });
      }
      return out;
    };

    // The owner starts rounds, notes who plays, and ends them.
    function ownerTick() {
      if (!api.isOwner() || destroyed) return;
      const s = readShared(api.shared());
      if (!s) return newRound(1);
      const now = Date.now();
      if (s.ph === 'done') {
        if (s.next && now >= s.next) newRound(s.r + 1);
        return;
      }
      const states = playerStates();
      const inRound = [...states.values()].filter(p => p.r === s.r);
      const ids = seated().map(p => p.id);
      const add = inRound.filter(p => ids.includes(p.id) && !s.pl.includes(p.id)).map(p => p.id);
      let pl = s.pl;
      if (add.length) pl = [...pl, ...add].slice(0, MAX_PLAYERS);
      // Everyone who has played this round and is still here counts as in it
      // until their own state says they topped out (a state that briefly
      // can't be read doesn't put anyone out).
      const here = new Map(seated().map(p => [p.id, p]));
      const present = pl.filter(id => here.has(id));
      const out = id => { const st = states.get(id); return !!st && st.r === s.r && st.ko; };
      const alive = present.filter(id => !out(id));
      const multi = pl.length >= 2;
      if (present.length && ((multi && alive.length <= 1) || alive.length === 0)) {
        let win = null;
        if (multi) {
          const scored = present.map(id => states.get(id)).filter(st => st && st.r === s.r).sort((a, b) => b.sc - a.sc);
          win = alive.length === 1 ? { id: alive[0], name: here.get(alive[0]).name } : scored[0] || null;
        }
        commit({ ...s, pl, ph: 'done', win: win ? win.id : '', wn: win ? String(win.name || '').slice(0, 24) : '', next: multi ? now + NEXT_ROUND : 0 });
        return;
      }
      if (pl !== s.pl) commit({ ...s, pl });
    }
    api.on('again', (d, from) => {
      const s = readShared(api.shared());
      if (!api.isOwner() || !s || s.ph !== 'done' || !d || d.r !== s.r) return;
      if (!seated().some(p => p.id === from)) return;
      newRound(s.r + 1);
    });
    function playAgain() {
      const s = S;
      if (!s || s.ph !== 'done') return;
      api.sfx('click');
      if (api.isOwner()) newRound(s.r + 1);
      else api.send('again', { r: s.r });
    }
    again.addEventListener('click', playAgain);

    // Follows the shared round: a new round starts my well.
    function sync() {
      S = readShared(api.shared());
      if (!S) return;
      if (S.r !== round) {
        round = S.r;
        well = null;
        koSent = false;
        bestShown = false;
        parts = []; pops = []; streaks = []; dropTrail = null;
        botPlan = null;
        if (S.ph === 'play' && amSeated()) startWell();
        dirty = true;
      } else if (!well && S.ph === 'play' && amSeated() && !koSent) {
        startWell();
      }
    }
    function startWell() {
      well = newWell(S.seed);
      well.events.length = 0;
      const now = Date.now();
      goAt = now < S.at ? S.at : now + 900;
      dirty = true;
      publish(true);
    }
    const playing = () => !!well && !well.over && Date.now() >= goAt && S?.ph === 'play';

    // My state as I publish it.
    function myPublished() {
      if (!well) return null;
      return readPlayer(packState());
    }
    function packState() {
      const c = well.cur;
      return {
        r: round, b: packBoard(well.board), p: c ? [c.t, c.r, c.x, c.y - HIDDEN] : null,
        sc: well.score, ln: well.lines, lv: well.level, ko: well.over ? 1 : 0, g: pending(well), hd: well.hold,
      };
    }
    function publish(force = false) {
      if (!well) return;
      const now = performance.now();
      if (!force && (!dirty || now - lastPub < PUBLISH_MS)) return;
      lastPub = now;
      dirty = false;
      api.setState(packState());
    }

    // --- garbage -----------------------------------------------------------
    api.on('atk', (d, from) => {
      const a = readAttack(d);
      if (!a || !S || a.r !== S.r || S.ph !== 'play') return;
      const sender = api.players().find(p => p.id === from);
      const st = sender && readPlayer(sender.state);
      if (!st || st.r !== a.r) return;
      const log = attackLog.get(from) || [];
      attackLog.set(from, log);
      if (!rateOk(log, a.n, Date.now())) return;
      streak(from, a.to, a.n, sender.color);
      if (a.to === myId && well && !well.over) {
        if (receive(well, a.n, a.h)) {
          dirty = true;
          api.sfx('zap');
          pops.push({ text: `+${a.n} garbage!`, x: L.wx + L.wellW / 2, y: L.wy + L.wellH * 0.75, t: 0, color: '#ff6b6b', size: 18 });
        }
      }
    });
    function sendAttack(n) {
      const states = [...playerStates().values()].filter(p => p.r === round && p.id !== myId);
      const to = pickTarget(myId, states);
      if (!to || n <= 0) return;
      const d = { r: round, to, n: Math.min(12, n), h: Math.floor(Math.random() * COLS) };
      api.send('atk', d);
      streak(myId, to, d.n, api.me.color);
      api.sfx('fire');
    }
    function wellRectOf(id) {
      if (id === myId) return { x: L.wx, y: L.wy, w: L.wellW, h: L.wellH };
      const i = opponents().findIndex(p => p.id === id);
      const slot = L.slots[i];
      if (!slot) return null;
      const m = miniLayout(slot);
      return { x: m.x, y: m.y, w: m.w, h: m.h };
    }
    function streak(from, to, n, color) {
      const a = wellRectOf(from), b = wellRectOf(to);
      if (!a || !b) return;
      streaks.push({ x0: a.x + a.w / 2, y0: a.y + a.h * 0.6, x1: b.x + b.w / 2, y1: b.y + b.h * 0.85, t: 0, n, color: COLOR.test(color || '') ? color : '#ff6b6b' });
    }

    // --- play ----------------------------------------------------------------
    function act(fn) {
      if (!playing()) return false;
      const ok = fn();
      if (ok) dirty = true;
      return ok;
    }
    const moveBy = dx => act(() => { const ok = move(well, dx); if (ok) api.sfx('tick'); return ok; });
    const turn = dir => act(() => { const ok = rotate(well, dir); if (ok) api.sfx('click'); return !!ok; });
    const softStep = () => act(() => { const ok = stepDown(well); if (ok) { well.score += 1; well.fall = 0; } return ok; });
    const drop = () => act(() => { hardDrop(well); return true; });
    const doHold = () => act(() => hold(well));

    // What my well's events look like and sound like.
    function handleEvents() {
      if (!well) return;
      const ev = well.events.splice(0);
      for (const e of ev) {
        if (e.type === 'drop') {
          if (e.dist > 0) {
            dropTrail = { t: e.t, r: e.r, x: e.x, from: e.from, to: e.to, age: 0 };
            bump = Math.min(1, 0.4 + e.dist / 20);
          }
          api.sfx('bounce');
        } else if (e.type === 'lock') {
          // (sound comes with the drop or the clear)
        } else if (e.type === 'hold') {
          api.sfx('whoosh');
        } else if (e.type === 'clear') {
          clearFx(e);
          if (e.attack > 0) sendAttack(e.attack);
        } else if (e.type === 'garbage') {
          bump = 0.8;
          api.sfx('bang');
        } else if (e.type === 'over') {
          api.sfx('lose');
          if (well.score > best) { best = well.score; api.store.set('best', best); bestShown = true; }
          if (!reduced) shake = 0.5;
        }
        dirty = true;
      }
    }
    function clearFx(e) {
      const c = L.cell;
      api.sfx(e.lines >= 4 ? 'win' : 'score');
      flash = e.lines >= 4 ? 1 : 0.5;
      if (e.lines >= 4 && !reduced) shake = 0.35;
      for (const y of e.rows) {
        const row = well.board[y];
        for (let x = 0; x < COLS; x++) {
          const color = colorOfCell(row[x]);
          for (let k = 0; k < 3; k++) {
            parts.push({
              x: L.wx + (x + 0.5) * c, y: L.wy + (y - HIDDEN + 0.5) * c, vx: (Math.random() - 0.5) * 340 + (x - 4.5) * 30,
              vy: -120 - Math.random() * 260, t: 0, life: 0.6 + Math.random() * 0.5, color, s: c * (0.18 + Math.random() * 0.22),
            });
          }
        }
      }
      const words = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'BLOCK BUSTER!'];
      const midY = L.wy + (e.rows.reduce((a, b) => a + b, 0) / e.rows.length - HIDDEN) * c;
      pops.push({ text: words[e.lines], x: L.wx + L.wellW / 2, y: midY - c * 0.4, t: 0, color: e.lines >= 4 ? '#ffd43b' : '#fff', size: e.lines >= 4 ? 30 : 24 });
      pops.push({ text: `+${e.pts}`, x: L.wx + L.wellW / 2, y: midY + c * 1.1, t: 0.05, color: '#3fe0d0', size: 18 });
      if (e.b2b) pops.push({ text: 'Back to back!', x: L.wx + L.wellW / 2, y: midY - c * 1.9, t: 0.1, color: '#ff5fa2', size: 16 });
      if (e.combo > 0) pops.push({ text: `Combo ×${e.combo}`, x: L.wx + L.wellW / 2, y: midY + c * 2.3, t: 0.1, color: '#ffd43b', size: 17 });
      if (e.level) pops.push({ text: `Level ${e.level}!`, x: L.wx + L.wellW / 2, y: L.wy + L.wellH * 0.3, t: 0.2, color: '#69db7c', size: 26 });
      if (e.attack > 0) pops.push({ text: `Sent ${e.attack} ▲`, x: L.wx + L.wellW / 2, y: midY + c * 3.4, t: 0.15, color: '#ff8c42', size: 16 });
    }

    // Keyboard and controller sideways auto-repeat.
    function repeat(dt, dir, st) {
      if (!dir) { st.dir = 0; return; }
      if (dir !== st.dir) { st.dir = dir; st.t = 0; st.arr = 0; moveBy(dir); return; }
      st.t += dt;
      if (st.t < DAS) return;
      st.arr += dt;
      while (st.arr >= ARR) { st.arr -= ARR; if (!moveBy(dir)) { st.arr = 0; break; } }
    }
    const keyDas = { dir: 0, t: 0, arr: 0 };

    function update(dt) {
      clock += dt;
      sync();
      ownerTick();
      if (well) {
        if (playing()) {
          repeat(dt, keys.right - keys.left, keyDas);
          const soft = keys.down || padSoft || touch.soft;
          const before = well.cur ? `${well.cur.x},${well.cur.y},${well.cur.r}` : '';
          tick(well, dt, soft);
          const after = well.cur ? `${well.cur.x},${well.cur.y},${well.cur.r}` : '';
          if (before !== after) dirty = true;
        }
        handleEvents();
        if (well.over && !koSent) { koSent = true; publish(true); }
        publish();
      }
      for (const [id, o] of others) if (!api.players().some(p => p.id === id)) others.delete(id);
      for (const m of opponents()) {
        const st = readPlayer(m.state);
        const o = others.get(m.id) || { st: null, flash: 0, lines: 0 };
        if (st && o.st && st.r === o.st.r && st.ln > o.st.ln) o.flash = 1;
        o.st = st;
        o.flash = Math.max(0, o.flash - dt * 2.5);
        others.set(m.id, o);
      }
      if (opponents().length !== nOppLaid) relayout();
      // Effects.
      for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; }
      parts = parts.filter(p => p.t < p.life);
      for (const p of pops) p.t += dt;
      pops = pops.filter(p => p.t < 1.2);
      for (const s of streaks) s.t += dt;
      streaks = streaks.filter(s => s.t < 0.6);
      if (dropTrail) { dropTrail.age += dt; if (dropTrail.age > 0.22) dropTrail = null; }
      shake = Math.max(0, shake - dt);
      bump = Math.max(0, bump - dt * 5);
      flash = Math.max(0, flash - dt * 3);
      // Countdown beeps.
      if (well && !well.over) {
        const left = goAt - Date.now();
        const label = left > 0 ? String(Math.ceil(left / 1000)) : '';
        if (label !== lastCount) {
          if (label) api.sfx('tick');
          else if (lastCount) api.sfx('pop');
          lastCount = label;
        }
      }
      updateCard();
    }

    // --- touch ---------------------------------------------------------------
    // One finger: tap turns, sideways drags move a cell at a time under the
    // finger, a drag down soft-drops row by row, a quick flick down hard-drops,
    // a quick swipe up holds. A second finger's tap turns the other way.
    const touch = { id: null, x0: 0, y0: 0, ax: 0, ay: 0, t0: 0, moved: false, axis: '', soft: false, hist: [], held: false, dropped: false };
    let extraTap = null, lastFlick = null;
    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (touch.id !== null) { extraTap = { id: e.pointerId, t: performance.now() }; return; }
      canvas.setPointerCapture?.(e.pointerId);
      Object.assign(touch, { id: e.pointerId, x0: e.clientX, y0: e.clientY, ax: e.clientX, ay: e.clientY, t0: performance.now(), moved: false, axis: '', soft: false, hist: [[performance.now(), e.clientX, e.clientY]], held: false, dropped: false });
    }
    function onMove(e) {
      if (e.pointerId !== touch.id || touch.held) return;
      const now = performance.now();
      touch.hist.push([now, e.clientX, e.clientY]);
      while (touch.hist.length > 2 && now - touch.hist[0][0] > 120) touch.hist.shift();
      const c = (L?.cell || 24) * 0.92;
      const dx = e.clientX - touch.ax, dy = e.clientY - touch.ay;
      const tx = e.clientX - touch.x0, ty = e.clientY - touch.y0;
      if (!touch.axis && Math.hypot(tx, ty) > Math.min(14, c * 0.6)) touch.axis = Math.abs(tx) >= Math.abs(ty) ? 'x' : 'y';
      if (Math.hypot(tx, ty) > 10) touch.moved = true;
      // A quick swipe up holds (once per touch).
      if (ty < -c * 2.2 && Math.abs(ty) > Math.abs(tx) * 1.5 && now - touch.t0 < 350) {
        touch.held = true;
        touch.soft = false;
        doHold();
        return;
      }
      if (touch.axis === 'x' || Math.abs(dx) >= c) {
        let steps = 0;
        while (Math.abs(e.clientX - touch.ax) >= c && steps < COLS) {
          const dir = Math.sign(e.clientX - touch.ax);
          touch.ax += dir * c;
          moveBy(dir);
          steps++;
        }
      }
      if (touch.axis === 'y' || (touch.axis === 'x' && dy > c * 1.5)) {
        while (e.clientY - touch.ay >= c) {
          touch.ay += c;
          softStep();
        }
        if (e.clientY < touch.ay - c) touch.ay = e.clientY + c * 0.5;
      }
    }
    function onUp(e) {
      if (extraTap && e.pointerId === extraTap.id) {
        if (performance.now() - extraTap.t < 300) turn(-1);
        extraTap = null;
        return;
      }
      if (e.pointerId !== touch.id) return;
      const now = performance.now();
      touch.id = null;
      touch.soft = false;
      if (touch.held) return;
      if (S?.ph === 'done') return;
      // Flick: fast and far enough downwards at the end. (A cancelled touch
      // can report no position, so the last move counts.)
      if (e.type === 'pointerup') touch.hist.push([now, e.clientX, e.clientY]);
      const end = touch.hist[touch.hist.length - 1];
      const h0 = touch.hist.find(p => end[0] - p[0] <= 110) || touch.hist[0];
      const span = Math.max(16, end[0] - h0[0]);
      const vy = (end[2] - h0[2]) / span, vx = (end[1] - h0[1]) / span;
      const ty = end[2] - touch.y0;
      const c = L?.cell || 24;
      lastFlick = { vy, vx, ty, type: e.type, n: touch.hist.length };
      if (vy > 0.7 && ty > c * 1.2 && vy > Math.abs(vx) * 1.4) { drop(); return; }
      if (!touch.moved && now - touch.t0 < 320) turn(1);
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    // A finger on the hold button holds at once; Enter or Space on it (a click
    // with no pointer) does too.
    holdBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); doHold(); });
    holdBtn.addEventListener('click', e => { e.preventDefault(); if (e.detail === 0) doHold(); });

    // --- keys ----------------------------------------------------------------
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || e.target?.isContentEditable;
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const down = e.type === 'keydown';
      const k = e.key, code = e.code;
      let used = true;
      // Sideways: one step at once on the press, then auto-repeat while held.
      const side = (k === 'ArrowLeft' || code === 'KeyA') ? -1 : (k === 'ArrowRight' || code === 'KeyD') ? 1 : 0;
      if (side) {
        if (side < 0) keys.left = down; else keys.right = down;
        if (down && !e.repeat) { Object.assign(keyDas, { dir: side, t: 0, arr: 0 }); moveBy(side); }
      } else if (k === 'ArrowDown' || code === 'KeyS') {
        if (down && !e.repeat && !keys.down) softStep();
        keys.down = down;
      }
      else if (!down) used = false;
      else if (e.repeat) used = ['ArrowUp', ' ', 'x', 'X', 'z', 'Z'].includes(k);
      else if (k === 'ArrowUp' || k === 'x' || k === 'X' || code === 'KeyW') turn(1);
      else if (k === 'z' || k === 'Z' || k === 'Control') turn(-1);
      else if (k === ' ') { if (S?.ph === 'done' && !again.hidden) playAgain(); else drop(); }
      else if (k === 'c' || k === 'C' || k === 'Shift') doHold();
      else if (k === 'Enter' && S?.ph === 'done' && !again.hidden) playAgain();
      else used = false;
      if (used) e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    const onBlur = () => { keys.left = keys.right = keys.down = false; touch.id = null; touch.soft = false; };
    window.addEventListener('blur', onBlur);

    // --- drawing -------------------------------------------------------------
    function text(str, x, y, size, color, align = 'center', weight = 900) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, size * 0.18);
      ctx.strokeStyle = 'rgba(10,0,40,0.8)';
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }
    function panel(x, y, pw, ph, r = 12, glow = null) {
      ctx.save();
      roundRect(ctx, x, y, pw, ph, r);
      ctx.fillStyle = 'rgba(14,6,40,0.72)';
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(200,180,255,0.22)';
      ctx.stroke();
      ctx.restore();
    }
    // A small piece centred in a box.
    function drawPreview(t, cx, cy, size, alpha = 1) {
      if (!isInt(t, 0, 6)) return;
      const cells = cellsOf(t, 0);
      const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const ox = cx - ((maxX - minX + 1) * size) / 2, oy = cy - ((maxY - minY + 1) * size) / 2;
      ctx.globalAlpha = alpha;
      const sp = tile(COLORS[t], size);
      for (const [x, y] of cells) ctx.drawImage(sp, ox + (x - minX) * size, oy + (y - minY) * size, size, size);
      ctx.globalAlpha = 1;
    }
    // A face bubble: the player's live video, or their initial.
    function faceBubble(id, name, color, x, y, r) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.clip();
      let drew = false;
      const media = api.mediaOf?.(id);
      const sw = media?.videoWidth || media?.width || 0, sh = media?.videoHeight || media?.height || 0;
      if (sw && sh && (media.readyState === undefined || media.readyState >= 2)) {
        const k = Math.max((r * 2) / sw, (r * 2) / sh) * 1.3;
        try { ctx.drawImage(media, x - (sw * k) / 2, y - (sh * k) / 2 + r * 0.12, sw * k, sh * k); drew = true; } catch { /* not ready */ }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${Math.round(r * 1.1)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((String(name || '?').trim()[0] || '?').toUpperCase(), x, y + r * 0.06);
      }
      ctx.restore();
      ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawWellFrame(x, y, ww, wh, c, color, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      roundRect(ctx, x - 5, y - 5, ww + 10, wh + 10, 10);
      ctx.fillStyle = 'rgba(8,3,26,0.82)';
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color;
      ctx.stroke();
      // Grid.
      ctx.strokeStyle = 'rgba(170,150,255,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < COLS; i++) { ctx.moveTo(x + i * c + 0.5, y); ctx.lineTo(x + i * c + 0.5, y + wh); }
      for (let j = 1; j < ROWS; j++) { ctx.moveTo(x, y + j * c + 0.5); ctx.lineTo(x + ww, y + j * c + 0.5); }
      ctx.stroke();
      ctx.restore();
    }

    function drawMyWell(now) {
      const c = L.cell, x0 = L.wx, y0 = L.wy + bump * c * 0.18;
      const me = api.players().find(p => p.me);
      const myColor = COLOR.test(me?.color || '') ? me.color : '#ff5fa2';
      drawWellFrame(x0, y0, L.wellW, L.wellH, c, myColor);
      if (!well) {
        text(S?.ph === 'done' ? 'Next round soon' : amSeated() ? 'Getting ready…' : 'Watching', x0 + L.wellW / 2, y0 + L.wellH / 2, clamp(c * 0.8, 14, 22), '#fff');
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 - 2, y0, L.wellW + 4, L.wellH + 2);
      ctx.clip();
      // Locked blocks (the two hidden rows peek in over the top a little).
      const clearing = well.clear;
      for (let y = 0; y < TOTAL; y++) {
        const row = well.board[y];
        const sy = y0 + (y - HIDDEN) * c;
        if (sy < y0 - c) continue;
        for (let x = 0; x < COLS; x++) {
          const v = row[x];
          if (!v) continue;
          ctx.globalAlpha = y < HIDDEN ? 0.5 : well.over ? 0.55 : 1;
          ctx.drawImage(tile(colorOfCell(v), c), x0 + x * c, sy, c, c);
        }
      }
      ctx.globalAlpha = 1;
      if (clearing) {
        const k = 1 - clearing.t / CLEAR_T;
        for (const y of clearing.rows) {
          const sy = y0 + (y - HIDDEN) * c;
          ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k * 0.6) * (0.75 + 0.25 * Math.sin(k * 30))})`;
          const shrink = L.wellW * 0.5 * k * k;
          ctx.fillRect(x0 + shrink, sy + c * 0.5 * k, L.wellW - shrink * 2, c * (1 - k));
        }
      }
      // Drop trail.
      if (dropTrail) {
        const a = 1 - dropTrail.age / 0.22;
        const cells = cellsOf(dropTrail.t, dropTrail.r);
        const xs = new Set(cells.map(q => q[0]));
        for (const cx of xs) {
          const ys = cells.filter(q => q[0] === cx).map(q => q[1]);
          const top = y0 + (dropTrail.from + Math.min(...ys) - HIDDEN) * c, bot = y0 + (dropTrail.to + Math.min(...ys) - HIDDEN) * c;
          const g = ctx.createLinearGradient(0, top, 0, bot);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(1, `rgba(255,255,255,${0.35 * a})`);
          ctx.fillStyle = g;
          ctx.fillRect(x0 + (dropTrail.x + cx) * c + c * 0.1, top, c * 0.8, bot - top);
        }
      }
      const cur = well.cur;
      if (cur && !well.over) {
        const color = COLORS[cur.t];
        // Ghost.
        const gy = ghostY(well);
        ctx.save();
        for (const [cx, cy] of cellsOf(cur.t, cur.r)) {
          const sx = x0 + (cur.x + cx) * c, sy = y0 + (gy + cy - HIDDEN) * c;
          roundRect(ctx, sx + 2, sy + 2, c - 4, c - 4, c * 0.15);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.16;
          ctx.fill();
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = Math.max(1.5, c * 0.08);
          ctx.strokeStyle = color;
          ctx.stroke();
        }
        ctx.restore();
        // The piece (blinking slightly while its lock delay runs out).
        const lockK = grounded(well) ? well.lock / LOCK_DELAY : 0;
        const sp = tile(color, c);
        for (const [cx, cy] of cellsOf(cur.t, cur.r)) {
          const sy = y0 + (cur.y + cy - HIDDEN) * c;
          if (sy < y0 - c) continue;
          ctx.drawImage(sp, x0 + (cur.x + cx) * c, sy, c, c);
          if (lockK > 0) {
            ctx.fillStyle = `rgba(255,255,255,${0.35 * lockK})`;
            ctx.fillRect(x0 + (cur.x + cx) * c, sy, c, c);
          }
        }
      }
      ctx.restore();
      // A soft white wash when rows clear.
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flash * 0.12})`;
        ctx.fillRect(x0, y0, L.wellW, L.wellH);
      }
      // Garbage waiting: a red bar beside the well, rising from the bottom.
      const g = pending(well);
      if (g > 0) {
        const bh = Math.min(ROWS, g) * c;
        const pulse = 0.65 + 0.35 * Math.sin(now / 90);
        ctx.fillStyle = `rgba(255,70,90,${pulse})`;
        roundRect(ctx, x0 - 5 - Math.max(5, c * 0.28), y0 + L.wellH - bh, Math.max(5, c * 0.28), bh, 3);
        ctx.fill();
        text(String(g), x0 - 5 - Math.max(5, c * 0.28) / 2, y0 + L.wellH - bh - 10, clamp(c * 0.55, 10, 16), '#ff6b6b');
      }
      if (well.over) {
        ctx.fillStyle = 'rgba(10,4,30,0.45)';
        ctx.fillRect(x0, y0, L.wellW, L.wellH);
        if (card.hidden) text('TOPPED OUT', x0 + L.wellW / 2, y0 + L.wellH * 0.42, clamp(c * 1.1, 18, 34), '#ff6b6b');
        if (S?.ph === 'play') text('Watching the others…', x0 + L.wellW / 2, y0 + L.wellH * 0.42 + clamp(c * 1.2, 20, 36), clamp(c * 0.6, 12, 17), '#fff', 'center', 700);
      }
      // Countdown.
      const left = goAt - Date.now();
      if (left > 0 && !well.over) {
        const n = Math.ceil(left / 1000);
        const k = 1 - (left / 1000 - Math.floor(left / 1000));
        ctx.globalAlpha = 1 - k * 0.3;
        text(String(n), x0 + L.wellW / 2, y0 + L.wellH * 0.4, clamp(c * (3 + (reduced ? 0 : 1 - k)), 40, 120), '#fff');
        ctx.globalAlpha = 1;
        text(api.players().length > 1 ? 'Last one standing wins!' : 'Clear rows, go for a high score!', x0 + L.wellW / 2, y0 + L.wellH * 0.4 + clamp(c * 2.6, 40, 90), clamp(c * 0.6, 12, 17), '#ffd43b', 'center', 800);
      } else if (left > -700 && !well.over) {
        ctx.globalAlpha = clamp((700 + left) / 700, 0, 1);
        text('GO!', x0 + L.wellW / 2, y0 + L.wellH * 0.4, clamp(c * 3, 40, 110), '#69db7c');
        ctx.globalAlpha = 1;
      }
    }

    function drawSide() {
      const c = L.cell;
      const lab = clamp(c * 0.5, 9, 14);
      // Hold.
      panel(L.hold.x, L.hold.y, L.hold.w, L.hold.h, 12);
      text('HOLD', L.hold.x + L.hold.w / 2, L.hold.y + lab * 0.95, lab, '#c9bdf0', 'center', 900);
      if (well && well.hold >= 0) drawPreview(well.hold, L.hold.x + L.hold.w / 2, L.hold.y + lab * 1.6 + (L.hold.h - lab * 1.6) / 2, c * 0.6, well.held ? 0.35 : 1);
      // Next.
      const N = L.next;
      panel(N.x, N.y, N.w, N.h, 12);
      text('NEXT', N.x + N.w / 2, N.y + lab * 0.95, lab, '#c9bdf0', 'center', 900);
      if (well) {
        const q = nextPieces(well, 3);
        if (N.dir === 'h') {
          const cy = N.y + lab * 1.6 + (N.h - lab * 1.6) / 2;
          q.forEach((t, i) => drawPreview(t, N.x + c * [1.55, 3.85, 5.65][i], cy, c * (i ? 0.42 : 0.6), i ? 0.85 : 1));
        } else {
          q.forEach((t, i) => drawPreview(t, N.x + N.w / 2, N.y + c * (2.9 + i * 2.3) - (i ? 0 : c * 0.2), c * (i ? 0.5 : 0.62)));
        }
      }
      // Score, level and lines.
      const St = L.stats;
      const rowH = St.h / 3;
      const lf = clamp(rowH * 0.28, 8, 13), vf = clamp(rowH * 0.46, 12, 26);
      [['SCORE', well ? well.score : 0, '#fff'], ['LEVEL', well ? well.level : 1, '#3fe0d0'], ['LINES', well ? well.lines : 0, '#ffd43b']].forEach(([label, value, color], i) => {
        const y = St.y + i * rowH;
        text(label, St.x + St.w / 2, y + rowH * 0.28, lf, '#a99ad8', 'center', 800);
        text(String(value), St.x + St.w / 2, y + rowH * 0.66, vf, color, 'center', 900);
      });
      // Header over my well: my face and name, best score, players left.
      const me = api.players().find(p => p.me) || { name: api.me.name, color: api.me.color };
      const color = COLOR.test(me.color || '') ? me.color : '#ff5fa2';
      const fr = 9;
      const hy = L.head.y + HEAD / 2 - 1;
      faceBubble(myId, me.name, color, L.head.x + fr + 1, hy, fr);
      text(String(me.name || 'Me').slice(0, 14), L.head.x + fr * 2 + 7, hy, 13, '#fff', 'left', 800);
      if (S?.ph === 'play' && S.pl.length >= 2) {
        const alive = [...others.values()].filter(o => o.st && o.st.r === round && !o.st.ko).length + (well && !well.over ? 1 : 0);
        text(`${alive} left`, L.head.x + L.wellW, hy, 12, '#ffd43b', 'right', 800);
      } else {
        text(`BEST ${best}`, L.head.x + L.wellW, hy, 11, '#ff8fc4', 'right', 800);
      }
    }

    function drawOpponents(now) {
      const opps = opponents();
      opps.forEach((m, i) => {
        const slot = L.slots[i];
        if (!slot) return;
        const o = others.get(m.id);
        const st = o?.st;
        const ml = miniLayout(slot);
        const color = COLOR.test(m.color || '') ? m.color : '#ffffff';
        const live = st && S && st.r === S.r;
        const won = S?.ph === 'done' && S.win === m.id;
        // Header: face, name, score.
        const fr = clamp(ml.head * 0.42, 9, 15);
        faceBubble(m.id, m.name, color, ml.x + fr, ml.top + ml.head / 2, fr);
        const fs = clamp(ml.mc * 1.15, 10, 13);
        ctx.save();
        ctx.beginPath();
        ctx.rect(ml.x + fr * 2 + 2, ml.top, Math.max(10, slot.x + slot.w - ml.x - fr * 2 - 2), ml.head);
        ctx.clip();
        text(`${won ? '👑 ' : ''}${String(m.name || '?').slice(0, 12)}`, ml.x + fr * 2 + 5, ml.top + ml.head / 2 - fs * 0.55, fs, '#fff', 'left', 800);
        text(live ? String(st.sc) : '–', ml.x + fr * 2 + 5, ml.top + ml.head / 2 + fs * 0.6, fs * 0.92, '#ffd43b', 'left', 800);
        ctx.restore();
        drawWellFrame(ml.x, ml.y, ml.w, ml.h, ml.mc, color, live ? 1 : 0.6);
        if (!live) {
          text('…', ml.x + ml.w / 2, ml.y + ml.h / 2, 14, '#c9bdf0');
          return;
        }
        const mc = ml.mc;
        for (let y = 0; y < ROWS; y++) {
          const row = st.board[y];
          for (let x = 0; x < COLS; x++) {
            const v = row[x];
            if (!v) continue;
            ctx.fillStyle = colorOfCell(v);
            ctx.fillRect(ml.x + x * mc, ml.y + y * mc, mc - 0.6, mc - 0.6);
          }
        }
        if (st.p && !st.ko) {
          ctx.fillStyle = COLORS[st.p.t];
          for (const [cx, cy] of cellsOf(st.p.t, st.p.r)) {
            const y = st.p.y + cy, x = st.p.x + cx;
            if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
            ctx.fillRect(ml.x + x * mc, ml.y + y * mc, mc - 0.6, mc - 0.6);
          }
        }
        if (o.flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${o.flash * 0.45})`;
          ctx.fillRect(ml.x, ml.y, ml.w, ml.h);
        }
        if (st.g > 0) {
          const bh = Math.min(ROWS, st.g) * mc;
          ctx.fillStyle = `rgba(255,70,90,${0.65 + 0.35 * Math.sin(now / 90)})`;
          ctx.fillRect(ml.x - 6, ml.y + ml.h - bh, 3.5, bh);
        }
        if (st.ko) {
          ctx.fillStyle = 'rgba(10,4,30,0.55)';
          ctx.fillRect(ml.x, ml.y, ml.w, ml.h);
          text('KO', ml.x + ml.w / 2, ml.y + ml.h / 2, clamp(ml.w * 0.3, 12, 30), '#ff6b6b');
        } else if (won) {
          text('👑', ml.x + ml.w / 2, ml.y + ml.h / 2, clamp(ml.w * 0.35, 14, 40), '#ffd43b');
        }
      });
    }

    function drawEffects() {
      for (const p of parts) {
        const a = 1 - p.t / p.life;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;
      for (const s of streaks) {
        const k = clamp(s.t / 0.45, 0, 1);
        const e = 1 - Math.pow(1 - k, 2);
        const mx = (s.x0 + s.x1) / 2, my = Math.min(s.y0, s.y1) - 60;
        const at = u => [(1 - u) * (1 - u) * s.x0 + 2 * (1 - u) * u * mx + u * u * s.x1, (1 - u) * (1 - u) * s.y0 + 2 * (1 - u) * u * my + u * u * s.y1];
        ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const u = clamp(e - i * 0.04, 0, 1);
          const [x, y] = at(u);
          ctx.globalAlpha = (1 - i / 8) * (s.t > 0.45 ? 1 - (s.t - 0.45) / 0.15 : 1);
          ctx.fillStyle = i ? s.color : '#fff';
          ctx.beginPath();
          ctx.arc(x, y, (6 + s.n * 1.5) * (1 - i / 10), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (const p of pops) {
        if (p.t < 0) continue;
        const a = clamp(1.2 - p.t, 0, 1);
        const sc = reduced ? 1 : 1 + 0.35 * Math.max(0, 1 - p.t * 6);
        ctx.globalAlpha = a;
        text(p.text, p.x, p.y - p.t * 26, p.size * sc, p.color);
      }
      ctx.globalAlpha = 1;
    }

    function render(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(backdrop(), 0, 0, w, h);
      if (!L) return;
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
      drawOpponents(now);
      drawSide();
      drawMyWell(now);
      drawEffects();
      ctx.restore();
    }

    // --- results card ----------------------------------------------------------
    let cardSig = '';
    function updateCard() {
      const done = S?.ph === 'done';
      if (!done) {
        if (!card.hidden) card.hidden = true;
        cardSig = '';
        return;
      }
      const multi = S.pl.length >= 2;
      const states = playerStates();
      const list = S.pl.map(id => states.get(id) || null).filter(Boolean).sort((a, b) => (a.id === S.win ? -1 : b.id === S.win ? 1 : b.sc - a.sc));
      const left = S.next ? Math.max(0, Math.ceil((S.next - Date.now()) / 1000)) : 0;
      const sig = JSON.stringify([S.r, S.win, list.map(p => [p.id, p.sc, p.ln]), left, best]);
      if (sig === cardSig) return;
      cardSig = sig;
      card.hidden = false;
      card.dataset.winner = S.win || '';
      if (multi) {
        const name = S.win === myId ? 'You' : (api.players().find(p => p.id === S.win)?.name || S.wn || 'Someone');
        cardTitle.textContent = S.win ? `🏆 ${name} ${S.win === myId ? 'win' : 'wins'}!` : 'Round over';
        cardSub.textContent = S.win === myId ? 'Last one standing.' : 'Last one standing wins.';
      } else {
        cardTitle.textContent = 'Game over';
        const mine = states.get(myId);
        cardSub.textContent = mine ? `${mine.sc} points · ${mine.ln} lines · level ${mine.lv}${bestShown ? ' · New best!' : ''}` : '';
      }
      cardList.replaceChildren(...list.map((p, i) => {
        const li = document.createElement('li');
        if (p.id === myId) li.className = 'me';
        const rank = document.createElement('span');
        rank.textContent = p.id === S.win ? '👑' : `${i + 1}.`;
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = p.color;
        const nm = document.createElement('span');
        nm.textContent = String(p.name || '?').slice(0, 20);
        const pts = document.createElement('span');
        pts.className = 'pts';
        pts.textContent = `${p.sc} · ${p.ln} lines`;
        li.append(rank, dot, nm, pts);
        return li;
      }));
      cardList.hidden = !multi;
      cardWait.textContent = multi ? `Next round in ${left}…` : `Best ${best}`;
      again.hidden = multi || !amSeated();
    }

    // --- loop ------------------------------------------------------------------
    function frame(t) {
      if (destroyed) return;
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      update(dt);
      render(Date.now());
      raf = requestAnimationFrame(frame);
    }
    resize();
    sync();
    ownerTick();
    raf = requestAnimationFrame(frame);
    // A hidden tab gets no frames: the owner still runs the round.
    const ownerTimer = setInterval(() => { if (document.hidden) { sync(); ownerTick(); } }, 250);

    // --- the bot ---------------------------------------------------------------
    // Debug bots (js/rookie.js) call this every 400 ms: pick a decent place for
    // the piece (sometimes a worse one), then turn, slide and drop it there with
    // the normal moves, a couple of moves a call.
    function rookie() {
      rookieUntil = performance.now() + 1500;
      if (S?.ph === 'done' && !again.hidden && Math.random() < 0.3) { playAgain(); return; }
      if (!playing() || !well.cur) return;
      const key = `${well.placed}:${well.n}:${well.cur.t}`;
      if (!botPlan || botPlan.key !== key) {
        const list = placements(well);
        if (!list.length) return;
        const pick = Math.random() < 0.2 && list.length > 2 ? list[1 + Math.floor(Math.random() * 2)] : list[0];
        botPlan = { key, r: pick.r, x: pick.x };
      }
      for (let k = 0; k < 3; k++) {
        const c = well.cur;
        if (!c) return;
        if (c.r !== botPlan.r) {
          const diff = (botPlan.r - c.r + 4) % 4;
          if (!turn(diff === 3 ? -1 : 1)) { botPlan.r = c.r; }
        } else if (c.x !== botPlan.x) {
          if (!moveBy(Math.sign(botPlan.x - c.x))) botPlan.x = c.x;
        } else {
          drop();
          return;
        }
      }
    }

    return {
      rookie,
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        clearInterval(ownerTimer);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        window.removeEventListener('blur', onBlur);
        tiles.clear();
      },
      onChange() {
        sync();
        ownerTick();
        if (opponents().length !== nOppLaid) relayout();
      },
      onPad(pad) {
        const edge = k => !!pad[k] && !padPrev[k];
        const now = { a: !!pad.a, xBtn: !!pad.xBtn, yBtn: !!pad.yBtn, up: !!pad.up || pad.y < -0.7, lb: !!pad.pressed?.[4], rb: !!pad.pressed?.[5] };
        if (S?.ph === 'done') {
          if (pad.a && !again.hidden) playAgain();
          padPrev = now;
          return;
        }
        if (pad.a) turn(1);
        if (pad.xBtn) turn(-1);
        if (pad.yBtn || edge('lb') || edge('rb')) doHold();
        if (edge('up')) drop();
        const dir = pad.right || pad.x > 0.5 ? 1 : pad.left || pad.x < -0.5 ? -1 : 0;
        repeat(1 / 60, dir, padDas);
        padSoft = !!pad.down || pad.y > 0.6;
        padPrev = now;
      },
      // For tests.
      _test: {
        view() {
          return {
            round, ph: S?.ph ?? '', win: S?.win ?? '', pl: S?.pl ?? [], seed: S?.seed ?? 0, playing: playing(), owner: api.isOwner(),
            dealt: well ? well.dealt.slice() : [], queue: well ? nextPieces(well, 3) : [], seq: well ? Array.from({ length: 14 }, (_, i) => well.bag.at(i)) : [],
            cur: well?.cur ? { ...well.cur } : null, hold: well ? well.hold : -1, over: !!well?.over, placed: well ? well.placed : 0,
            score: well ? well.score : 0, lines: well ? well.lines : 0, level: well ? well.level : 1, pending: well ? pending(well) : 0,
            board: well ? packBoard(well.board) : '', garbageRows: well ? well.board.filter(r => r.includes(GARBAGE)).length : 0,
            others: [...others.entries()].map(([id, o]) => ({ id, r: o.st?.r ?? 0, b: o.st ? packBoard([[], [], ...o.st.board]) : '', sc: o.st?.sc ?? 0, ko: !!o.st?.ko, g: o.st?.g ?? 0, p: o.st?.p ?? null })),
            card: !card.hidden, cardTitle: cardTitle.textContent, winner: card.dataset.winner || '',
            layout: L && { cell: L.cell, wx: L.wx, wy: L.wy, hold: L.hold, slots: L.slots.length, portrait: L.portrait },
          };
        },
        // Replaces my well's visible rows (bottom-up strings of 10 digits).
        setRows(rows) {
          if (!well) return;
          const b = emptyBoard();
          rows.forEach((s, i) => { b[TOTAL - 1 - i] = [...s].map(Number); });
          well.board = b;
          if (well.cur && !fits(well.board, well.cur.t, well.cur.r, well.cur.x, well.cur.y)) well.cur.y = 0;
          dirty = true;
        },
        rookieActive: () => performance.now() < rookieUntil,
        flick: () => lastFlick,
      },
    };
  },
};

// Exposed for tests.
export const _logic = {
  mulberry32, makeBag, SHAPES, cellsOf, kicksFor, fits, emptyBoard, newWell, spawn, move, rotate, stepDown, ghostY, hardDrop,
  hold, tick, lockPiece, fullRows, removeRows, addGarbage, receive, pending, nextPieces, gravity, comboBonus, attackFor,
  pointsFor, pickTarget, packBoard, unpackBoard, readPlayer, readShared, readAttack, rateOk, placements, evalBoard,
  computeLayout, COLS, ROWS, HIDDEN, TOTAL, GARBAGE, LOCK_DELAY, CLEAR_T, MAX_PENDING, ATTACK_RATE, ATTACK_WINDOW,
};
