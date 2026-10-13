// Battleship: two players hide a fleet (5, 4, 3, 3 and 2 squares long) on a
// 10x10 grid and take turns firing at each other's waters. Anyone else in the
// session waits in line (js/seatqueue.js): the front of the line takes a seat
// when a player leaves, and after a game with someone waiting the winner stays
// on, the loser goes to the back of the line and the next in line sits down.
//
// Secrecy: a fleet only ever exists on its owner's device. It is never put in
// state or shared state. The shooter sends 'fire' { x, y, turn }; the defender
// checks its own fleet and answers with 'result' { x, y, hit, sunk, turn }
// (sunk is the length of the ship that just went down, or null). The owner,
// who sees both messages, appends the shot to shared state after checking that
// the answer comes from the defender and matches the shot in flight. A player
// whose last ship went down says 'lost'; the owner checks the hit count and
// ends the game. After the game each side reveals its fleet so the loser's
// survivors can be shown.
//
// Shared state: { game, phase: 'place' | 'battle' | 'over', seats: [id, id],
// q: [ids waiting], sat: [when each seat sat down], swap: { seat, out, in,
// game } | null, turn, turnNo, ready: [ids], shots: { id: [[x, y, hit, sunk]] }, winner }
// where shots[id] are the shots id has fired at the other seat. It holds
// everything the owner needs, so a new owner carries on from shared() alone.

import { readLineup, syncSeats, rotateSeats, queueLabel, swapText } from '../js/seatqueue.js';

const N = 10;
const SHIPS = [5, 4, 3, 3, 2];
const TOTAL = SHIPS.reduce((a, b) => a + b, 0);
const NAMES = { 5: 'carrier', 4: 'battleship', 3: 'cruiser', 2: 'destroyer' };
const FALL = 0.55;            // seconds a shell takes to land
const FONT = 'ui-rounded, system-ui, sans-serif';

const CSS = `
.bs { position: absolute; inset: 0; display: flex; flex-direction: column; }
.bs-head { padding: 8px 12px 0; text-align: center; font-weight: 900; font-size: 1.05rem; min-height: 2.6em; }
.bs-head small { display: block; font-weight: 700; font-size: 0.78rem; opacity: 0.8; margin-top: 2px; }
.bs-stage { position: relative; flex: 1 1 auto; min-height: 0; }
.bs-bar { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 6px 10px 10px; min-height: 54px; box-sizing: content-box; align-items: center; }
.bs-bar .btn { padding: 6px 16px; }
.bs-bar .btn[hidden] { display: none; }
.bs-bar .btn.on { outline: 2px solid var(--sun); }
`;

// --- fleet helpers -------------------------------------------------------

const key = (x, y) => y * N + x;
const inGrid = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < N && y < N;
const cellsOf = s => Array.from({ length: s.len }, (_, i) => [s.x + (s.v ? 0 : i), s.y + (s.v ? i : 0)]);

// True when ship s lies on the grid and overlaps none of the others.
function fits(s, ships) {
  const mine = cellsOf(s);
  if (!mine.every(([x, y]) => inGrid(x, y))) return false;
  const taken = new Set();
  for (const o of ships) if (o !== s) for (const [x, y] of cellsOf(o)) taken.add(key(x, y));
  return mine.every(([x, y]) => !taken.has(key(x, y)));
}

function randomFleet() {
  for (;;) {
    const ships = [];
    let ok = true;
    for (const len of SHIPS) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const v = Math.random() < 0.5;
        const s = { len, v, x: Math.floor(Math.random() * (N - (v ? 0 : len - 1))), y: Math.floor(Math.random() * (N - (v ? len - 1 : 0))), h: [] };
        if (fits(s, ships)) { ships.push(s); placed = true; }
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return ships;
  }
}

// A fleet revealed by the other player after the game: strict checks.
function validFleet(f) {
  if (!Array.isArray(f) || f.length !== SHIPS.length) return null;
  const ships = [];
  for (const s of f) {
    if (!s || !Number.isInteger(s.len) || !Number.isInteger(s.x) || !Number.isInteger(s.y)) return null;
    ships.push({ len: s.len, x: s.x, y: s.y, v: !!s.v, h: [] });
  }
  if (ships.map(s => s.len).sort().join() !== [...SHIPS].sort().join()) return null;
  return ships.every(s => fits(s, ships)) ? ships : null;
}

function validShared(s) {
  return s && typeof s === 'object' && Number.isFinite(s.game) && Array.isArray(s.seats) && s.seats.length === 2
    && typeof s.phase === 'string' && s.shots && typeof s.shots === 'object' && Array.isArray(s.ready);
}

function freshShared(a, b, q = [], sat = [0, 0], swap = null) {
  const game = Date.now();
  return { game, phase: 'place', seats: [a, b], q, sat, swap: swap && { ...swap, game }, turn: null, turnNo: 0, ready: [], shots: { [a]: [], [b]: [] }, winner: null };
}

// Which of my shots' cells formed a ship that was sunk? The sunk length is
// known but not the position, so look for a straight run of that many hit
// cells through the last shot that is not already part of another sunk ship.
function inferSunk(entries) {
  const hits = new Set(entries.filter(e => e[2]).map(e => key(e[0], e[1])));
  const used = new Set();
  const out = [];
  for (const [x, y, hit, sunk] of entries) {
    if (!hit || !sunk) continue;
    let found = null;
    for (const vertical of [false, true]) {
      for (let off = 0; off < sunk && !found; off++) {
        const cells = Array.from({ length: sunk }, (_, i) => (vertical ? [x, y - off + i] : [x - off + i, y]));
        if (cells.every(([cx, cy]) => inGrid(cx, cy) && hits.has(key(cx, cy)) && !used.has(key(cx, cy)))) found = cells;
      }
      if (found) break;
    }
    if (found) {
      const cells = found.map(([cx, cy]) => key(cx, cy));
      cells.forEach(c => used.add(c));
      out.push({ len: sunk, cells });
    }
  }
  return out;
}

// --- game ----------------------------------------------------------------

export default {
  id: 'battleship',
  name: 'Battleship',
  emoji: '🚢',
  blurb: 'Hide your fleet, sink theirs. Two play; the next in line plays the winner.',
  minPlayers: 2,
  maxPlayers: 2,
  needsFace: false,
  fullBleed: false,

  create(api) {
    const root = document.createElement('div');
    root.className = 'bs';
    const style = document.createElement('style');
    style.textContent = CSS;
    const head = document.createElement('div');
    head.className = 'bs-head';
    const headMain = document.createElement('span');
    const headSub = document.createElement('small');
    head.append(headMain, headSub);
    const stage = document.createElement('div');
    stage.className = 'bs-stage';
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    stage.append(canvas);
    const bar = document.createElement('div');
    bar.className = 'bs-bar';
    const mkBtn = (label, cls) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `btn ${cls}`.trim();
      b.textContent = label;
      bar.append(b);
      return b;
    };
    const btnMine = mkBtn('Your fleet', 'ghost');
    const btnEnemy = mkBtn('Enemy waters', 'ghost');
    const btnRandom = mkBtn('Random', 'ghost');
    const btnReady = mkBtn('Ready!', 'aqua');
    const btnFire = mkBtn('Fire!', '');
    const btnAgain = mkBtn('Play again', 'aqua');
    root.append(style, head, stage, bar);
    api.el.append(root);
    const ctx = canvas.getContext('2d');

    // --- my side of the game, kept on this device only -------------------
    let game = 0;                 // the shared.game this local state belongs to
    let ships = randomFleet();    // my fleet: { len, x, y, v, h: [hit cell keys] }
    let locked = false;           // fleet confirmed with Ready
    const incoming = new Map();   // key -> { hit, sunk }: shots at me I answered
    const answers = new Map();    // turn -> result I sent (resent if asked again)
    const outgoing = new Map();   // key -> { hit, sunk }: my shots, from results
    let outstanding = null;       // my shot awaiting its result { x, y, turn, at }
    let lostSent = 0;             // when I last said 'lost'
    let readySent = 0;
    let enemyFleet = null;        // revealed after the game
    let revealed = false;
    let pending = null;           // owner: the shot in flight { shooter, x, y, turn }
    let target = { x: 4, y: 4 };
    let view = 'mine';            // narrow screens: 'mine' | 'enemy'
    let viewSwitch = null;        // { at, to }
    let lastTurnSeen = '';
    let recordedGame = 0;
    const anims = [];             // shells and their explosions / splashes
    let drag = null, hover = null;
    let w = 0, h = 0, dpr = 1, wide = false, rects = {};
    let raf = 0, last = performance.now(), now = 0;

    const record = () => api.store.get('rec', {});

    // --- small accessors -------------------------------------------------
    const sh = () => { const s = api.shared(); return validShared(s) ? s : null; };
    const nameOf = id => api.players().find(p => p.id === id)?.name || 'Opponent';
    const seatOf = (s, id) => (s ? s.seats.indexOf(id) : -1);
    const oppOf = s => (s && seatOf(s, api.me.id) >= 0 ? s.seats[1 - seatOf(s, api.me.id)] : null);
    const isSeat = s => seatOf(s, api.me.id) >= 0;
    const myTurn = s => !!s && s.phase === 'battle' && s.turn === api.me.id;

    function resetLocal(g) {
      game = g;
      ships = randomFleet();
      locked = false;
      incoming.clear();
      answers.clear();
      outgoing.clear();
      outstanding = null;
      lostSent = 0;
      readySent = 0;
      enemyFleet = null;
      revealed = false;
      pending = null;
      anims.length = 0;
      view = 'mine';
      viewSwitch = null;
      lastTurnSeen = '';
      target = { x: 4, y: 4 };
    }

    // Everything one side has fired: the shared list plus results not yet in it.
    function shotsBy(s, id) {
      const list = (s?.shots?.[id] || []).filter(e => Array.isArray(e) && inGrid(e[0], e[1]));
      const known = new Set(list.map(e => key(e[0], e[1])));
      const extra = id === api.me.id ? outgoing : s && isSeat(s) ? incoming : null;
      if (extra) for (const [k, v] of extra) if (!known.has(k)) list.push([k % N, Math.floor(k / N), v.hit ? 1 : 0, v.sunk || 0]);
      return list;
    }

    // --- owner duties ----------------------------------------------------
    function ownerSync() {
      if (!api.isOwner() || !api.el.isConnected) return;
      const ps = api.players();
      const s = sh();
      if (ps.length < 2) { if (api.shared() != null) api.setShared(null); return; }
      const ids = ps.map(p => p.id);
      // The line-up: a seat whose player left goes to the front of the line
      // (a new game, since fleets are secret); newcomers join the back.
      const lu = syncSeats(s ? readLineup(s) : { seats: [null, null], q: [], sat: [0, 0] }, ids);
      if (!s || lu.seats[0] !== s.seats[0] || lu.seats[1] !== s.seats[1]) {
        if (s) api.toast('A player left: starting a new game.');
        api.setShared(freshShared(lu.seats[0], lu.seats[1], lu.q, lu.sat));
      } else if (lu.changed) {
        api.setShared({ ...JSON.parse(JSON.stringify(s)), q: lu.q, sat: lu.sat });
      }
    }

    function ownerFire(d, from) {
      const s = sh();
      if (!api.isOwner() || !s || s.phase !== 'battle' || d.game !== s.game) return;
      if (s.turn !== from || d.turn !== s.turnNo) return;
      if ((s.shots[from] || []).some(e => e[0] === d.x && e[1] === d.y)) return;
      pending = { shooter: from, x: d.x, y: d.y, turn: d.turn };
    }

    function ownerResult(d, from) {
      const s = sh();
      if (!api.isOwner() || !s || s.phase !== 'battle' || d.game !== s.game) return;
      const si = seatOf(s, from);
      if (si < 0) return;
      const shooter = s.seats[1 - si];
      if (s.turn !== shooter || d.turn !== s.turnNo) return;
      if ((s.shots[shooter] || []).some(e => e[0] === d.x && e[1] === d.y)) return;
      if (pending && (pending.shooter !== shooter || pending.x !== d.x || pending.y !== d.y || pending.turn !== d.turn)) return;
      const next = JSON.parse(JSON.stringify(s));
      next.shots[shooter] = [...(next.shots[shooter] || []), [d.x, d.y, d.hit ? 1 : 0, d.hit ? d.sunk || 0 : 0]];
      next.turn = from;
      next.turnNo = s.turnNo + 1;
      pending = null;
      api.setShared(next);
    }

    function ownerLost(d, from) {
      const s = sh();
      if (!api.isOwner() || !s || s.phase !== 'battle' || d.game !== s.game) return;
      const si = seatOf(s, from);
      if (si < 0) return;
      const shooter = s.seats[1 - si];
      if ((s.shots[shooter] || []).filter(e => e[2]).length < TOTAL) return;
      api.setShared({ ...JSON.parse(JSON.stringify(s)), phase: 'over', winner: shooter, turn: null });
    }

    function ownerReady(d, from) {
      const s = sh();
      if (!api.isOwner() || !s || s.phase !== 'place' || d.game !== s.game || seatOf(s, from) < 0) return;
      if (s.ready.includes(from)) return;
      const next = JSON.parse(JSON.stringify(s));
      next.ready.push(from);
      if (next.ready.length === 2) {
        next.phase = 'battle';
        next.turn = next.seats[Math.random() < 0.5 ? 0 : 1];
        next.turnNo = 0;
      }
      api.setShared(next);
    }

    // Rematch, asked for by a player or the next in line: with someone
    // waiting, the winner stays and the loser makes way.
    function ownerAgain(d, from) {
      const s = sh();
      if (!api.isOwner() || !s || s.phase !== 'over') return;
      const lu = readLineup(s);
      if (seatOf(s, from) < 0 && lu.q[0] !== from) return;
      const r = rotateSeats(lu, seatOf(s, s.winner));
      api.setShared(freshShared(r.seats[0], r.seats[1], r.q, r.sat, r.swap));
    }
    const placeOf = (s, id) => (s ? readLineup(s).q.indexOf(id) : -1);

    // --- messages --------------------------------------------------------
    // Everything I send is also handled locally, since the relay does not echo.
    function say(type, data) {
      api.send(type, data);
      handlers[type]?.(data, api.me.id);
    }

    const validResult = d => d && inGrid(d.x, d.y) && typeof d.hit === 'boolean' && Number.isInteger(d.turn)
      && (d.sunk === null || (Number.isInteger(d.sunk) && d.sunk >= 2 && d.sunk <= 5)) && (d.hit || d.sunk === null);

    // The defender answers a shot from the opponent.
    function onFire(d, from) {
      const s = sh();
      if (from !== api.me.id && d && inGrid(d.x, d.y) && Number.isInteger(d.turn) && s && isSeat(s) && from === oppOf(s) && d.game === game && locked && s.phase !== 'over') {
        const prev = answers.get(d.turn);
        if (prev) {
          if (prev.x === d.x && prev.y === d.y) api.send('result', prev);
        } else if (!incoming.has(key(d.x, d.y))) {
          let hit = false, sunk = null;
          for (const ship of ships) {
            if (cellsOf(ship).some(([x, y]) => x === d.x && y === d.y)) {
              hit = true;
              ship.h.push(key(d.x, d.y));
              if (ship.h.length === ship.len) sunk = ship.len;
            }
          }
          const r = { x: d.x, y: d.y, hit, sunk, turn: d.turn, game };
          answers.set(d.turn, r);
          incoming.set(key(d.x, d.y), { hit, sunk });
          anims.push({ board: 'mine', x: d.x, y: d.y, t: 0, hit, sunk, sounded: false });
          say('result', r);
          if (ships.every(sp => sp.h.length === sp.len)) { lostSent = performance.now(); say('lost', { game }); }
        }
      }
      if (d && inGrid(d.x, d.y) && Number.isInteger(d.turn) && Number.isFinite(d.game)) ownerFire(d, from);
    }

    function onResult(d, from) {
      if (!validResult(d) || !Number.isFinite(d.game)) return;
      const s = sh();
      // I fired this shot and the defender answered it.
      if (s && from !== api.me.id && from === oppOf(s) && outstanding && outstanding.x === d.x && outstanding.y === d.y && outstanding.turn === d.turn && d.game === game) {
        const k = key(d.x, d.y);
        if (!outgoing.has(k)) {
          outgoing.set(k, { hit: d.hit, sunk: d.sunk });
          const a = anims.find(an => an.board === 'enemy' && an.x === d.x && an.y === d.y && an.hit === null);
          if (a) { a.hit = d.hit; a.sunk = d.sunk; }
          else anims.push({ board: 'enemy', x: d.x, y: d.y, t: FALL, hit: d.hit, sunk: d.sunk, sounded: false });
          if (d.sunk) api.toast(`You sank their ${NAMES[d.sunk]}!`);
        }
      }
      ownerResult(d, from);
    }

    function onLost(d, from) {
      if (d && Number.isFinite(d.game)) ownerLost(d, from);
    }
    function onReady(d, from) {
      if (d && Number.isFinite(d.game)) ownerReady(d, from);
    }
    function onAgain(d, from) {
      ownerAgain(d, from);
    }
    function onReveal(d, from) {
      const s = sh();
      if (!s || from === api.me.id || from !== oppOf(s) || !d || d.game !== game || enemyFleet) return;
      enemyFleet = validFleet(d.ships);
    }
    const handlers = { fire: onFire, result: onResult, lost: onLost, ready: onReady, again: onAgain, reveal: onReveal };
    const offs = Object.entries(handlers).map(([type, fn]) => api.on(type, (d, from) => fn(d, from)));

    // --- my actions ------------------------------------------------------
    function shuffle() {
      if (locked) return;
      ships = randomFleet();
      api.sfx('click');
    }
    function confirmReady() {
      const s = sh();
      if (!s || !isSeat(s) || locked || s.phase !== 'place') return;
      locked = true;
      readySent = performance.now();
      api.sfx('click');
      say('ready', { game });
    }
    function fire() {
      const s = sh();
      if (!myTurn(s) || outstanding) return;
      if (outgoing.has(key(target.x, target.y)) || (s.shots[api.me.id] || []).some(e => e[0] === target.x && e[1] === target.y)) {
        api.toast('You already fired there.');
        return;
      }
      outstanding = { x: target.x, y: target.y, turn: s.turnNo, at: performance.now() };
      anims.push({ board: 'enemy', x: target.x, y: target.y, t: 0, hit: null, sunk: null, sounded: false });
      api.sfx('whoosh');
      say('fire', { x: target.x, y: target.y, turn: s.turnNo, game });
    }

    btnMine.addEventListener('click', () => { view = 'mine'; viewSwitch = null; });
    btnEnemy.addEventListener('click', () => { view = 'enemy'; viewSwitch = null; });
    btnRandom.addEventListener('click', shuffle);
    btnReady.addEventListener('click', confirmReady);
    btnFire.addEventListener('click', fire);
    btnAgain.addEventListener('click', () => { api.sfx('click'); say('again', { game }); });

    // --- layout ----------------------------------------------------------
    function resize() {
      const r = stage.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    // Which boards to show and where. Keys: 'mine' / 'enemy' (for a watcher,
    // 'mine' is the first seat's waters and 'enemy' the second's).
    function layout() {
      const titleH = 22, pad = 8, gap = 16;
      const sizeTwo = Math.min((w - pad * 2 - gap) / 2, h - titleH - pad * 2);
      const sizeOne = Math.min(w - pad * 2, h - titleH - pad * 2);
      wide = sizeTwo >= 190 && sizeTwo >= sizeOne * 0.6;
      rects = {};
      if (wide) {
        const total = sizeTwo * 2 + gap;
        const x0 = (w - total) / 2, y0 = titleH + Math.max(pad, (h - titleH - sizeTwo) / 2);
        rects.mine = { x: x0, y: y0, size: sizeTwo };
        rects.enemy = { x: x0 + sizeTwo + gap, y: y0, size: sizeTwo };
      } else {
        const s = Math.max(60, sizeOne);
        rects[view] = { x: (w - s) / 2, y: titleH + Math.max(pad, (h - titleH - s) / 2), size: s };
      }
      for (const r of Object.values(rects)) {
        r.lm = r.size / (N + 0.7) * 0.7;
        r.cell = (r.size - r.lm) / N;
        r.ox = r.x + r.lm;
        r.oy = r.y + r.lm;
      }
    }

    function cellAt(boardKey, px, py, clamp) {
      const r = rects[boardKey];
      if (!r) return null;
      let x = Math.floor((px - r.ox) / r.cell), y = Math.floor((py - r.oy) / r.cell);
      if (clamp) { x = Math.max(0, Math.min(N - 1, x)); y = Math.max(0, Math.min(N - 1, y)); }
      return inGrid(x, y) ? { x, y } : null;
    }
    function boardAt(px, py) {
      for (const k of Object.keys(rects)) {
        const r = rects[k];
        if (px >= r.x && py >= r.y && px <= r.x + r.size && py <= r.y + r.size) return k;
      }
      return null;
    }

    // --- input -----------------------------------------------------------
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onDown(e) {
      const s = sh();
      canvas.setPointerCapture?.(e.pointerId);
      const p = pos(e);
      if (s && isSeat(s) && s.phase === 'place' && !locked) {
        const c = cellAt('mine', p.x, p.y, false);
        const ship = c && ships.find(sp => cellsOf(sp).some(([x, y]) => x === c.x && y === c.y));
        if (ship) {
          drag = { ship, dx: c.x - ship.x, dy: c.y - ship.y, sx: p.x, sy: p.y, moved: false, orig: { x: ship.x, y: ship.y, v: ship.v }, pos: { x: ship.x, y: ship.y } };
        }
      }
    }
    function onMove(e) {
      const p = pos(e);
      hover = boardAt(p.x, p.y) === 'enemy' ? cellAt('enemy', p.x, p.y, false) : null;
      if (!drag) return;
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.moved = true;
      const c = cellAt('mine', p.x, p.y, true);
      if (c && drag.moved) drag.pos = { x: c.x - drag.dx, y: c.y - drag.dy };
    }
    function onUp(e) {
      const s = sh();
      const p = pos(e);
      if (drag) {
        const d = drag;
        drag = null;
        if (d.moved) {
          const test = { ...d.ship, x: d.pos.x, y: d.pos.y };
          if (fits(test, ships.map(sp => (sp === d.ship ? test : sp)))) { d.ship.x = test.x; d.ship.y = test.y; api.sfx('click'); }
        } else {
          rotate(d.ship);
        }
        return;
      }
      // A tap on the enemy board: aim; tap the same square again to fire.
      const b = boardAt(p.x, p.y);
      if (b === 'enemy' && s && isSeat(s) && s.phase === 'battle') {
        const c = cellAt('enemy', p.x, p.y, false);
        if (!c) return;
        const again = c.x === target.x && c.y === target.y;
        target = c;
        if (again && myTurn(s)) fire();
      }
    }
    function rotate(ship) {
      const turned = { ...ship, v: !ship.v };
      turned.x = Math.min(turned.x, N - (turned.v ? 1 : turned.len));
      turned.y = Math.min(turned.y, N - (turned.v ? turned.len : 1));
      if (fits(turned, ships.map(sp => (sp === ship ? turned : sp)))) {
        ship.v = turned.v;
        ship.x = turned.x;
        ship.y = turned.y;
        api.sfx('click');
      } else {
        api.toast('No room to turn it there.');
      }
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', () => { drag = null; });
    canvas.addEventListener('pointerleave', () => { hover = null; });

    function moveTarget(dx, dy) {
      const s = sh();
      if (!s || !isSeat(s) || s.phase !== 'battle') return;
      if (!wide) view = 'enemy';
      target = { x: Math.max(0, Math.min(N - 1, target.x + dx)), y: Math.max(0, Math.min(N - 1, target.y + dy)) };
    }
    function act() {
      const s = sh();
      if (!s || !isSeat(s)) return;
      if (s.phase === 'place') confirmReady();
      else if (s.phase === 'battle') fire();
      else if (s.phase === 'over') { say('again', { game }); }
    }
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };
      if (moves[e.code]) { e.preventDefault(); moveTarget(...moves[e.code]); }
      else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); act(); }
      else if (e.code === 'KeyR') shuffle();
      else if (e.code === 'Tab' && !wide) { e.preventDefault(); view = view === 'mine' ? 'enemy' : 'mine'; viewSwitch = null; }
    }
    window.addEventListener('keydown', onKey);

    let padPrev = { up: false, down: false, left: false, right: false };
    function onPad(pad) {
      const dirs = { up: pad.up || pad.y < -0.6, down: pad.down || pad.y > 0.6, left: pad.left || pad.x < -0.6, right: pad.right || pad.x > 0.6 };
      if (dirs.up && !padPrev.up) moveTarget(0, -1);
      if (dirs.down && !padPrev.down) moveTarget(0, 1);
      if (dirs.left && !padPrev.left) moveTarget(-1, 0);
      if (dirs.right && !padPrev.right) moveTarget(1, 0);
      padPrev = dirs;
      if (pad.a) act();
      if (pad.xBtn) shuffle();
      if (pad.yBtn && !wide) { view = view === 'mine' ? 'enemy' : 'mine'; viewSwitch = null; }
    }

    // --- housekeeping timer (resends guard against a lost message or owner) --
    const timer = setInterval(() => {
      if (!api.el.isConnected) return;
      ownerSync();
      const s = sh();
      if (!s || !isSeat(s) || s.game !== game) return;
      const t = performance.now();
      if (s.phase === 'place' && locked && !s.ready.includes(api.me.id) && t - readySent > 1500) { readySent = t; say('ready', { game }); }
      if (s.phase === 'battle') {
        if (outstanding && t - outstanding.at > 1500 && !(s.shots[api.me.id] || []).some(e => e[0] === outstanding.x && e[1] === outstanding.y)) {
          outstanding.at = t;
          say('fire', { x: outstanding.x, y: outstanding.y, turn: outstanding.turn, game });
        }
        if (lostSent && t - lostSent > 1500) { lostSent = t; say('lost', { game }); }
      }
      if (s.phase === 'over' && !revealed) { revealed = true; api.send('reveal', { game, ships: ships.map(({ len, x, y, v }) => ({ len, x, y, v })) }); }
    }, 400);
    ownerSync();

    // --- per-frame state ---------------------------------------------------
    function sync(dt) {
      const s = sh();
      if (s && s.game !== game) {
        const fresh = game !== 0;
        resetLocal(s.game);
        const sw = s.swap;
        if (fresh && sw && sw.game === s.game && typeof sw.in === 'string' && typeof sw.out === 'string') {
          api.toast(swapText(sw, api.me.id, nameOf));
          if (sw.in === api.me.id) api.sfx('win');
        }
      }
      if (!s) return;
      if (outstanding && (s.shots[api.me.id] || []).some(e => e[0] === outstanding.x && e[1] === outstanding.y)) outstanding = null;
      if (outstanding && s.turn !== api.me.id) outstanding = null;
      // Follow the turn on narrow screens.
      const turnKey = `${s.phase}:${s.turn}:${s.turnNo}`;
      if (turnKey !== lastTurnSeen) {
        lastTurnSeen = turnKey;
        if (s.phase === 'battle' && isSeat(s)) {
          if (s.turn === api.me.id) { viewSwitch = { at: now + (s.turnNo ? 1.1 : 0.2), to: 'enemy' }; api.sfx('tick'); }
          else viewSwitch = { at: now + 0.3, to: 'mine' };
        }
        if (s.phase === 'over') { viewSwitch = null; }
      }
      if (viewSwitch && now >= viewSwitch.at) { view = viewSwitch.to; viewSwitch = null; }
      if (s.phase === 'place') view = isSeat(s) ? 'mine' : view;
      // Win / loss: record it once and play the fanfare.
      if (s.phase === 'over' && recordedGame !== s.game) {
        recordedGame = s.game;
        if (isSeat(s)) {
          const won = s.winner === api.me.id;
          const rec = record();
          const nm = nameOf(oppOf(s)).slice(0, 24);
          const cur = rec[nm] || [0, 0];
          rec[nm] = [cur[0] + (won ? 1 : 0), cur[1] + (won ? 0 : 1)];
          const names = Object.keys(rec);
          if (names.length > 30) delete rec[names[0]];
          api.store.set('rec', rec);
          api.sfx(won ? 'win' : 'lose');
        }
      }
      // Anims advance; landing sounds play once the outcome is known.
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i];
        a.t += dt;
        if (a.t >= FALL && a.hit !== null && !a.sounded) {
          a.sounded = true;
          api.sfx(a.hit ? 'bang' : 'pop');
        }
        if (a.hit !== null && a.t > FALL + 1.0) anims.splice(i, 1);
        else if (a.hit === null && a.t > 8) anims.splice(i, 1);
      }
    }

    // --- DOM chrome ------------------------------------------------------
    function chrome() {
      const s = sh();
      const ps = api.players();
      const seat = s && isSeat(s);
      let main = '', sub = '';
      if (ps.length < 2 || !s) {
        main = 'Waiting for a friend to join…';
        sub = 'Battleship needs two players.';
      } else if (!seat) {
        main = `${nameOf(s.seats[0])} vs ${nameOf(s.seats[1])}`;
        sub = s.phase === 'place' ? 'Both captains are placing their fleets.' : s.phase === 'battle' ? `${nameOf(s.turn)} is firing.` : `${nameOf(s.winner)} wins!`;
        const place = placeOf(s, api.me.id);
        if (place === 0) sub += ` · ${queueLabel(0)}: you play the winner.`;
        else if (place > 0) sub += ` · ${queueLabel(place)} to play.`;
      } else {
        const opp = oppOf(s), on = nameOf(opp);
        if (s.phase === 'place') {
          main = locked ? `Waiting for ${on} to get ready…` : 'Place your fleet';
          sub = locked ? 'Your fleet is set.' : 'Drag ships to move them, tap one to turn it.';
        } else if (s.phase === 'battle') {
          main = myTurn(s) ? (outstanding ? 'Incoming…' : 'Your turn: take aim and fire!') : `${on} is taking aim…`;
        } else {
          main = s.winner === api.me.id ? 'You sank their whole fleet!' : `${on} sank your fleet.`;
        }
        if (s.phase !== 'place') {
          const left = ships.filter(sp => sp.h.length < sp.len).map(sp => sp.len).join(' ');
          const enemySunk = shotsBy(s, api.me.id).filter(e => e[3]).map(e => e[3]);
          const enemyLeft = [...SHIPS];
          for (const l of enemySunk) { const i = enemyLeft.indexOf(l); if (i >= 0) enemyLeft.splice(i, 1); }
          const rec = record()[on.slice(0, 24)] || [0, 0];
          sub = `Your ships afloat: ${left || 'none'} · Theirs: ${enemyLeft.join(' ') || 'none'} · Record vs ${on}: ${rec[0]}-${rec[1]}`;
        }
        const q = readLineup(s).q;
        if (q.length) sub += ` · Next up: ${nameOf(q[0])}`;
      }
      if (s && s.phase === 'place' && s.swap?.game === s.game && typeof s.swap.in === 'string' && typeof s.swap.out === 'string') {
        sub = `${swapText(s.swap, api.me.id, nameOf)} · ${sub}`;
      }
      headMain.textContent = main;
      headSub.textContent = sub;
      const place = seat && s.phase === 'place';
      btnRandom.hidden = !(place && !locked);
      btnReady.hidden = !(place && !locked);
      btnFire.hidden = !(seat && myTurn(s) && !outstanding);
      const next = !seat && !!s && placeOf(s, api.me.id) === 0;
      btnAgain.hidden = !((seat || next) && s.phase === 'over');
      btnAgain.textContent = seat ? 'Play again' : 'Play next';
      const tabs = !!s && ps.length >= 2 && !wide && !place;
      btnMine.hidden = btnEnemy.hidden = !tabs;
      if (tabs) {
        btnMine.textContent = seat ? 'Your fleet' : nameOf(s.seats[0]);
        btnEnemy.textContent = seat ? 'Enemy waters' : nameOf(s.seats[1]);
        btnMine.classList.toggle('on', view === 'mine');
        btnEnemy.classList.toggle('on', view === 'enemy');
      }
    }

    // --- drawing ---------------------------------------------------------
    function text(str, x, y, size, color, align = 'center', weight = 800) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }

    function drawShip(r, ship, opts = {}) {
      const c = r.cell;
      const px = r.ox + ship.x * c, py = r.oy + ship.y * c;
      ctx.save();
      ctx.globalAlpha = opts.alpha ?? 1;
      ctx.translate(px, py);
      if (ship.v) { ctx.translate(c, 0); ctx.rotate(Math.PI / 2); }
      const L = ship.len * c, hgt = c, m = c * 0.12;
      // Hull with a pointed bow.
      ctx.beginPath();
      ctx.moveTo(m, m + (hgt - 2 * m) * 0.2);
      ctx.quadraticCurveTo(m, m, m + c * 0.25, m);
      ctx.lineTo(L - c * 0.55, m);
      ctx.quadraticCurveTo(L - m, hgt * 0.5, L - c * 0.55, hgt - m);
      ctx.lineTo(m + c * 0.25, hgt - m);
      ctx.quadraticCurveTo(m, hgt - m, m, hgt - m - (hgt - 2 * m) * 0.2);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, hgt);
      g.addColorStop(0, opts.tint ? '#8d2f3c' : '#aab4c8');
      g.addColorStop(0.5, opts.tint ? '#6b1f2b' : '#7c8aa6');
      g.addColorStop(1, opts.tint ? '#4a1420' : '#55627f');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, c * 0.07);
      ctx.strokeStyle = opts.edge || '#2b3550';
      ctx.stroke();
      // Deck bits: bridge and funnel-like circles.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < ship.len; i++) {
        if (i === 0 || i === ship.len - 1) continue;
        ctx.beginPath();
        ctx.roundRect(i * c + c * 0.25, hgt * 0.33, c * 0.5, hgt * 0.34, c * 0.1);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(L * 0.45, hgt * 0.22, L * 0.35, hgt * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawHit(r, x, y, sunk, t = 1) {
      const c = r.cell, cx = r.ox + (x + 0.5) * c, cy = r.oy + (y + 0.5) * c;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, c * 0.5 * t);
      g.addColorStop(0, '#fff6a8');
      g.addColorStop(0.35, '#ffb02e');
      g.addColorStop(0.75, '#e8402a');
      g.addColorStop(1, 'rgba(160,30,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, c * 0.5 * t, 0, Math.PI * 2);
      ctx.fill();
      if (sunk) {
        ctx.strokeStyle = 'rgba(20,10,10,0.7)';
        ctx.lineWidth = Math.max(1.5, c * 0.08);
        ctx.beginPath();
        ctx.moveTo(cx - c * 0.22, cy - c * 0.22);
        ctx.lineTo(cx + c * 0.22, cy + c * 0.22);
        ctx.moveTo(cx + c * 0.22, cy - c * 0.22);
        ctx.lineTo(cx - c * 0.22, cy + c * 0.22);
        ctx.stroke();
      }
    }

    function drawMiss(r, x, y) {
      const c = r.cell, cx = r.ox + (x + 0.5) * c, cy = r.oy + (y + 0.5) * c;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1.5, c * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, c * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, c * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // One board: water, grid, ships (if shown), markers.
    // opts: { title, fleet, marks: Map, sunkCells: Set, live: bool (can aim here) }
    function drawBoard(boardKey, opts) {
      const r = rects[boardKey];
      if (!r) return;
      const c = r.cell;
      // Title.
      text(opts.title, r.x + r.size / 2, r.y - 6, 14, opts.active ? '#ffd43b' : '#fff', 'center', 900);
      // Coordinates.
      for (let i = 0; i < N; i++) {
        text('ABCDEFGHIJ'[i], r.ox + (i + 0.5) * c, r.oy - 3, Math.max(8, c * 0.4), 'rgba(255,255,255,0.65)');
        text(String(i + 1), r.ox - r.lm * 0.5, r.oy + (i + 0.5) * c + c * 0.14, Math.max(8, c * 0.4), 'rgba(255,255,255,0.65)');
      }
      // Water.
      const g = ctx.createLinearGradient(0, r.oy, 0, r.oy + c * N);
      g.addColorStop(0, '#1d86c8');
      g.addColorStop(1, '#0b4a8f');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(r.ox, r.oy, c * N, c * N, 8);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      for (let y = 0; y < N; y++) {
        ctx.beginPath();
        for (let x = 0; x <= c * N; x += 6) ctx.lineTo(r.ox + x, r.oy + (y + 0.5) * c + Math.sin(x / c * 2 + now * 1.5 + y) * c * 0.06);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= N; i++) {
        ctx.beginPath();
        ctx.moveTo(r.ox + i * c, r.oy);
        ctx.lineTo(r.ox + i * c, r.oy + N * c);
        ctx.moveTo(r.ox, r.oy + i * c);
        ctx.lineTo(r.ox + N * c, r.oy + i * c);
        ctx.stroke();
      }
      ctx.restore();

      // Ships: mine, the revealed enemy fleet, or sunk ones found by inference.
      for (const ship of opts.fleet || []) {
        const sunkShip = ship.h.length === ship.len;
        drawShip(r, ship, { tint: sunkShip, alpha: sunkShip ? 0.95 : 1 });
      }
      for (const s of opts.sunkShips || []) {
        const cells = s.cells.map(k => [k % N, Math.floor(k / N)]);
        drawShip(r, { len: s.len, v: cells[0][0] === cells[1][0], x: Math.min(...cells.map(p => p[0])), y: Math.min(...cells.map(p => p[1])), h: [] }, { tint: true });
      }

      // Markers, hidden while their shell is still falling or blowing up.
      const busy = new Set(anims.filter(a => a.board === boardKey && (a.hit === null || a.t < FALL + 0.4)).map(a => key(a.x, a.y)));
      for (const [k, v] of opts.marks) {
        if (busy.has(k)) continue;
        if (v.hit) drawHit(r, k % N, Math.floor(k / N), opts.sunkCells?.has(k) || !!v.sunk);
        else drawMiss(r, k % N, Math.floor(k / N));
      }

      // Aim cursor.
      if (opts.live) {
        const tx = r.ox + target.x * c, ty = r.oy + target.y * c;
        ctx.strokeStyle = myTurn(sh()) && !outstanding ? '#ffd43b' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = Math.max(2, c * 0.09);
        ctx.strokeRect(tx + 2, ty + 2, c - 4, c - 4);
        ctx.beginPath();
        ctx.moveTo(tx + c / 2, ty - 2);
        ctx.lineTo(tx + c / 2, ty + c + 2);
        ctx.moveTo(tx - 2, ty + c / 2);
        ctx.lineTo(tx + c + 2, ty + c / 2);
        ctx.stroke();
        if (hover) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(r.ox + hover.x * c, r.oy + hover.y * c, c, c);
        }
      }
    }

    // The ship being dragged, drawn over the board with a validity colour.
    function drawDrag() {
      if (!drag || !drag.moved || !rects.mine) return;
      const r = rects.mine;
      const test = { ...drag.ship, x: drag.pos.x, y: drag.pos.y };
      const ok = fits(test, ships.map(sp => (sp === drag.ship ? test : sp)));
      ctx.fillStyle = ok ? 'rgba(105,219,124,0.35)' : 'rgba(255,90,90,0.4)';
      for (const [x, y] of cellsOf(test)) if (inGrid(x, y)) ctx.fillRect(r.ox + x * r.cell, r.oy + y * r.cell, r.cell, r.cell);
      drawShip(r, test, { alpha: 0.85, edge: ok ? '#69db7c' : '#ff5a5a' });
    }

    function drawAnims() {
      for (const a of anims) {
        const r = rects[a.board];
        if (!r) continue;
        const c = r.cell, cx = r.ox + (a.x + 0.5) * c, cy = r.oy + (a.y + 0.5) * c;
        if (a.t < FALL || a.hit === null) {
          // Shell dropping out of the sky (hovering when the answer is late).
          const p = Math.min(1, a.t / FALL);
          const fall = a.hit === null && a.t >= FALL ? Math.sin(now * 8) * c * 0.04 : 0;
          const y = cy - (1 - p * p) * c * 7 + fall;
          const s = c * (0.55 - 0.3 * p);
          ctx.fillStyle = `rgba(0,0,40,${0.15 + 0.25 * p})`;
          ctx.beginPath();
          ctx.ellipse(cx, cy + c * 0.1, c * 0.12 + c * 0.3 * p, c * 0.07 + c * 0.14 * p, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = Math.max(1.5, c * 0.08);
          ctx.beginPath();
          ctx.moveTo(cx, y - s * 3);
          ctx.lineTo(cx, y);
          ctx.stroke();
          const sg = ctx.createRadialGradient(cx - s * 0.3, y - s * 0.3, 1, cx, y, s);
          sg.addColorStop(0, '#9aa3b8');
          sg.addColorStop(1, '#262c3d');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(cx, y, s, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const t = (a.t - FALL) / 1.0;
          if (a.hit) {
            // Fireball and smoke.
            const rad = c * (0.4 + 0.9 * Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.6));
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
            g.addColorStop(0, `rgba(255,250,190,${1 - t})`);
            g.addColorStop(0.4, `rgba(255,150,40,${0.9 * (1 - t)})`);
            g.addColorStop(1, 'rgba(220,50,30,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(40,30,30,${0.5 * (1 - t)})`;
            ctx.beginPath();
            ctx.arc(cx + c * 0.2 * t, cy - c * 0.8 * t, c * (0.2 + 0.3 * t), 0, Math.PI * 2);
            ctx.fill();
            if (a.sunk) text('SUNK!', cx, cy - c * (0.7 + t), Math.max(10, c * 0.5), `rgba(255,235,120,${1 - t})`, 'center', 900);
          } else {
            // Splash: rings and droplets.
            ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - t)})`;
            ctx.lineWidth = Math.max(1.5, c * 0.07);
            for (let i = 0; i < 2; i++) {
              ctx.beginPath();
              ctx.arc(cx, cy, c * (0.15 + 0.6 * Math.max(0, t - i * 0.2)), 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.fillStyle = `rgba(255,255,255,${1 - t})`;
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2;
              ctx.beginPath();
              ctx.arc(cx + Math.cos(ang) * c * 0.5 * t, cy + Math.sin(ang) * c * 0.35 * t - Math.sin(t * Math.PI) * c * 0.4, c * 0.07, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const s = sh();
      if (!s || api.players().length < 2) {
        text('⚓', w / 2, h / 2 - 8, Math.min(60, h * 0.3), '#fff');
        text('Waiting for a friend to join…', w / 2, h / 2 + 30, 16, '#fff');
        return;
      }
      layout();
      const seat = isSeat(s);
      if (seat) {
        const opp = oppOf(s);
        const sunkShips = inferSunk(shotsBy(s, api.me.id));
        const sunkCells = new Set(sunkShips.flatMap(x => x.cells));
        const myMarks = new Map(shotsBy(s, opp).map(e => [key(e[0], e[1]), { hit: !!e[2], sunk: e[3] }]));
        const enMarks = new Map(shotsBy(s, api.me.id).map(e => [key(e[0], e[1]), { hit: !!e[2], sunk: e[3] }]));
        const aimHere = s.phase === 'battle';
        drawBoard('mine', { title: 'Your fleet', fleet: ships, marks: myMarks, active: s.phase === 'place' && !locked });
        drawBoard('enemy', {
          title: 'Enemy waters',
          fleet: enemyFleet,
          sunkShips: enemyFleet ? null : sunkShips,
          sunkCells,
          marks: enMarks,
          live: aimHere,
          active: myTurn(s),
        });
        drawDrag();
      } else {
        for (const [k, i] of [['mine', 0], ['enemy', 1]]) {
          const owner = s.seats[i], shooter = s.seats[1 - i];
          const marks = new Map((s.shots[shooter] || []).filter(e => Array.isArray(e) && inGrid(e[0], e[1])).map(e => [key(e[0], e[1]), { hit: !!e[2], sunk: e[3] }]));
          drawBoard(k, { title: `${nameOf(owner)}'s waters`, marks, active: s.phase === 'battle' && s.turn === shooter });
        }
      }
      drawAnims();
      if (s.phase === 'over') {
        const msg = seat ? (s.winner === api.me.id ? 'Victory!' : 'Defeat') : `${nameOf(s.winner)} wins`;
        const y = h * 0.5;
        ctx.save();
        ctx.font = `900 ${Math.min(56, w * 0.14)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.lineJoin = 'round';
        ctx.strokeText(msg, w / 2, y);
        ctx.fillStyle = seat && s.winner !== api.me.id ? '#ff8fa3' : '#ffd43b';
        ctx.fillText(msg, w / 2, y);
        ctx.restore();
      }
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      now += dt;
      sync(dt);
      chrome();
      render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        clearInterval(timer);
        ro.disconnect();
        offs.forEach(off => off?.());
        window.removeEventListener('keydown', onKey);
      },
      onChange() { ownerSync(); },
      onPad,
    };
  },
};
