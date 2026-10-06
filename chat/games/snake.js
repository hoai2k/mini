// Snake: a shared arena where every player is a snake in their colour. Eat
// apples to grow, hit another snake's body and you are out for three seconds
// (a head-on crash takes both down), and the arena's walls wrap around. Rounds
// last two minutes; the scoreboard ranks the longest snake, then kills.
//
// The owner runs the whole simulation about eight times a second and publishes
// it in shared state; players only send their latest direction through
// setState({ dir, seq }). Everything the simulation needs (bodies, directions,
// respawn times, round clock) lives in shared state, so if the owner leaves,
// the next member carries on from shared() alone. Clients draw smoothly by
// sliding every body point from its old cell to its new one between ticks.

const W = 32;                 // arena columns
const H = 48;                 // arena rows
const TICK_MS = 125;          // simulation step
const ROUND_MS = 120000;      // one round
const OVER_MS = 9000;         // scoreboard time before the next round
const RESPAWN_MS = 3000;
const MAX_LEN = 60;           // keeps the shared payload small
const MAX_SNAKES = 8;
const START_LEN = 3;
const DX = [0, 1, 0, -1];     // 0 up, 1 right, 2 down, 3 left
const DY = [-1, 0, 1, 0];
const FONT = 'ui-rounded, system-ui, sans-serif';

// --- simulation (owner only) ---------------------------------------------

const clone = v => JSON.parse(JSON.stringify(v));
const wrap = (v, n) => (v + n) % n;

function blankSnake(now) {
  return { body: [], alive: false, len: 0, score: 0, kills: 0, best: 0, dir: 1, seq: 0, respawnAt: now };
}

function freshShared(now) {
  return { tick: 0, round: 1, phase: 'play', startedAt: now, overAt: 0, snakes: {}, apples: [] };
}

// Shared state is untrusted after an owner change; reject anything malformed.
function validShared(s) {
  if (!s || typeof s !== 'object' || !Number.isFinite(s.tick) || !Number.isFinite(s.startedAt)) return false;
  if (!s.snakes || typeof s.snakes !== 'object' || !Array.isArray(s.apples)) return false;
  for (const id of Object.keys(s.snakes)) {
    const sn = s.snakes[id];
    if (!sn || !Array.isArray(sn.body) || sn.body.length > MAX_LEN * 2 || sn.body.length % 2) return false;
    if (!sn.body.every(Number.isFinite)) return false;
  }
  return true;
}

// Cells (as y * W + x) occupied by any living snake.
function occupiedCells(S) {
  const set = new Set();
  for (const sn of Object.values(S.snakes)) {
    for (let i = 0; i < sn.body.length; i += 2) set.add(sn.body[i + 1] * W + sn.body[i]);
  }
  return set;
}

function freeCell(S, taken) {
  for (let tries = 0; tries < 60; tries++) {
    const x = Math.floor(Math.random() * W), y = Math.floor(Math.random() * H);
    const c = y * W + x;
    if (!taken.has(c)) return [x, y];
  }
  return null;
}

// Puts a fresh snake somewhere with room around it. Returns false when the
// arena is too crowded to find a spot (the caller retries shortly).
function spawn(S, sn, now) {
  const taken = occupiedCells(S);
  for (let tries = 0; tries < 40; tries++) {
    const x = 4 + Math.floor(Math.random() * (W - 8)), y = 4 + Math.floor(Math.random() * (H - 8));
    let clear = true;
    for (let dy = -3; dy <= 3 && clear; dy++) {
      for (let dx = -3; dx <= 3; dx++) if (taken.has((y + dy) * W + x + dx)) { clear = false; break; }
    }
    if (!clear) continue;
    const dir = Math.floor(Math.random() * 4);
    const body = [];
    for (let i = 0; i < START_LEN; i++) body.push(wrap(x - DX[dir] * i, W), wrap(y - DY[dir] * i, H));
    sn.body = body;
    sn.dir = dir;
    sn.alive = true;
    sn.len = START_LEN;
    sn.best = Math.max(sn.best, START_LEN);
    return true;
  }
  sn.respawnAt = now + 400;
  return false;
}

function newRound(S, now) {
  S.round++;
  S.phase = 'play';
  S.startedAt = now;
  S.overAt = 0;
  S.apples = [];
  for (const id of Object.keys(S.snakes)) S.snakes[id] = { ...blankSnake(now), seq: S.snakes[id].seq };
}

// Advances every snake one cell. Mutates S.
function step(S, members, now) {
  const alive = Object.entries(S.snakes).filter(([, sn]) => sn.alive);

  // Turn: apply each player's newest direction (never straight back on themselves).
  for (const [id, sn] of alive) {
    const st = members.find(m => m.id === id)?.state || {};
    if (Number.isFinite(st.seq) && st.seq !== sn.seq && Number.isInteger(st.dir) && st.dir >= 0 && st.dir < 4) {
      sn.seq = st.seq;
      if ((st.dir + 2) % 4 !== sn.dir) sn.dir = st.dir;
    }
  }

  // Move: new head in front, tail dropped unless the snake is growing.
  const apples = new Set();
  for (let i = 0; i < S.apples.length; i += 2) apples.add(S.apples[i + 1] * W + S.apples[i]);
  const old = {};
  for (const [id, sn] of alive) {
    old[id] = [sn.body[0], sn.body[1]];
    const nx = wrap(sn.body[0] + DX[sn.dir], W), ny = wrap(sn.body[1] + DY[sn.dir], H);
    const grows = apples.has(ny * W + nx) && sn.body.length / 2 < MAX_LEN;
    sn.body = [nx, ny, ...sn.body];
    if (!grows) sn.body.length -= 2;
  }

  // Collide: who sits on a cell with somebody else, or with their own body.
  const at = new Map(); // cell -> [{ id, idx }]
  for (const [id, sn] of alive) {
    for (let i = 0; i < sn.body.length; i += 2) {
      const c = sn.body[i + 1] * W + sn.body[i];
      if (!at.has(c)) at.set(c, []);
      at.get(c).push({ id, idx: i / 2 });
    }
  }
  const dead = new Map(); // id -> id of the snake that gets the kill, or null
  for (const [id, sn] of alive) {
    let headOn = false, killer = null, crashed = false;
    for (const o of at.get(sn.body[1] * W + sn.body[0])) {
      if (o.id === id && o.idx === 0) continue;
      crashed = true;
      if (o.id === id) continue;               // ran into itself: no credit
      if (o.idx === 0) headOn = true;          // head-on: both die, no credit
      else killer = o.id;
    }
    // Two heads swapping places pass through each other: count it as head-on.
    for (const [oid, osn] of alive) {
      if (oid !== id && osn.body[0] === old[id][0] && osn.body[1] === old[id][1] && sn.body[0] === old[oid][0] && sn.body[1] === old[oid][1]) {
        crashed = headOn = true;
      }
    }
    if (crashed) dead.set(id, headOn ? null : killer);
  }
  for (const [id, killer] of dead) {
    const sn = S.snakes[id];
    sn.body = [];
    sn.alive = false;
    sn.len = 0;
    sn.respawnAt = now + RESPAWN_MS;
    if (killer && S.snakes[killer]) S.snakes[killer].kills++;
  }

  // Eat: survivors standing on an apple score it.
  for (const sn of Object.values(S.snakes)) {
    if (!sn.alive) continue;
    const hx = sn.body[0], hy = sn.body[1];
    for (let i = 0; i < S.apples.length; i += 2) {
      if (S.apples[i] === hx && S.apples[i + 1] === hy) {
        S.apples.splice(i, 2);
        sn.score++;
        break;
      }
    }
    sn.len = sn.body.length / 2;
    sn.best = Math.max(sn.best, sn.len);
  }
}

// One owner tick: sync members, run the clock, step the world, publish.
function ownerTick(api) {
  if (!api.el.isConnected || !api.isOwner()) return;
  const now = Date.now();
  const shared = api.shared();
  const S = validShared(shared) ? clone(shared) : freshShared(now);
  const members = api.players().slice(0, MAX_SNAKES);

  for (const id of Object.keys(S.snakes)) if (!members.some(m => m.id === id)) delete S.snakes[id];
  for (const m of members) if (!S.snakes[m.id]) S.snakes[m.id] = blankSnake(now);
  S.tick++;

  if (S.phase === 'over') {
    if (now - S.overAt >= OVER_MS) newRound(S, now);
  } else if (now - S.startedAt >= ROUND_MS) {
    S.phase = 'over';
    S.overAt = now;
  } else {
    step(S, members, now);
    // Refill apples: a few per player.
    const want = Math.min(16, 3 + members.length * 2);
    const taken = occupiedCells(S);
    for (let i = 0; i < S.apples.length; i += 2) taken.add(S.apples[i + 1] * W + S.apples[i]);
    while (S.apples.length / 2 < want) {
      const c = freeCell(S, taken);
      if (!c) break;
      S.apples.push(c[0], c[1]);
      taken.add(c[1] * W + c[0]);
    }
    // Respawn the fallen.
    for (const sn of Object.values(S.snakes)) if (!sn.alive && now >= sn.respawnAt) spawn(S, sn, now);
  }
  api.setShared(S);
}

// --- game ----------------------------------------------------------------

const lerp = (a, b, t) => a + (b - a) * t;

export default {
  id: 'snake',
  name: 'Snake',
  emoji: '🐍',
  blurb: 'Eat apples, grow long, make friends crash into you. Swipe to steer.',
  minPlayers: 1,
  maxPlayers: MAX_SNAKES,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    // The "steer with your head" toggle sits under the arena.
    const headBtn = document.createElement('button');
    headBtn.type = 'button';
    headBtn.className = 'btn ghost';
    headBtn.textContent = 'Steer with your head';
    headBtn.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);font-size:13px;padding:4px 12px;';
    api.el.append(headBtn);
    let headMode = false;
    let headReady = true;      // roll came back to neutral since the last turn
    headBtn.addEventListener('click', () => {
      headMode = !headMode;
      headBtn.textContent = headMode ? 'Head steering: on' : 'Steer with your head';
      headBtn.classList.toggle('aqua', headMode);
      if (headMode && !api.face()) api.toast('No face tracked yet: turn on a face effect or step into view.');
    });

    let best = api.store.get('best', 0);
    let wins = api.store.get('wins', 0);
    let w = 0, h = 0, dpr = 1, inset = { top: 0, bottom: 0 };
    let lay = { cell: 10, bx: 0, by: 0, wide: false, sideX: 0 };
    let raf = 0;

    // What the screen is showing: per-snake old and new bodies for sliding.
    const vis = {};            // id -> { prev, cur, t0 }
    let seen = null;           // last ingested shared state
    let seenTick = -1;
    let tickDur = TICK_MS, lastIngest = performance.now();
    let prevApples = [];
    const bursts = [];         // crash puffs { cells, t, color }
    const rings = [];          // apple-eaten rings { x, y, t, color }
    let phaseSeen = 'play', roundSeen = 0;
    let mySeq = 0, myDir = null, myScore = 0, wasAlive = false;
    let drag = null;

    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      // Wide screens get a scoreboard column; phones a strip above the arena.
      const wide = w >= 640 && w > h * 1.1;
      const sideW = wide ? Math.min(240, w * 0.28) : 0;
      const hudH = wide ? 8 : 62;
      const footH = 34;
      const availW = w - sideW - 12;
      const availH = h - inset.top - inset.bottom - hudH - footH - 6;
      const cell = Math.max(2, Math.floor(Math.min(availW / W, availH / H) * 4) / 4);
      const bx = (w - sideW - cell * W) / 2;
      const by = inset.top + hudH + Math.max(0, (availH - cell * H) / 2);
      lay = { cell, bx, by, wide, sideX: bx + cell * W + 16, hudH };
      headBtn.style.bottom = `${inset.bottom + 4}px`;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // --- reading shared state ----------------------------------------------

    function mySnake() {
      return seen?.snakes?.[api.me.id] || null;
    }

    function ingest() {
      const sh = api.shared();
      if (!validShared(sh) || sh.tick === seenTick) return;
      const nowT = performance.now();
      if (seenTick >= 0 && sh.tick > seenTick) tickDur = Math.max(80, Math.min(260, lerp(tickDur, (nowT - lastIngest) / (sh.tick - seenTick), 0.3)));
      lastIngest = nowT;
      seenTick = sh.tick;
      const prevSeen = seen;
      seen = sh;

      if (sh.round !== roundSeen) { roundSeen = sh.round; for (const k of Object.keys(vis)) delete vis[k]; }
      const players = api.players();
      for (const id of Object.keys(vis)) if (!sh.snakes[id]) delete vis[id];
      for (const [id, sn] of Object.entries(sh.snakes)) {
        const color = players.find(p => p.id === id)?.color || '#fff';
        const cur = sn.body;
        let v = vis[id];
        if (!v) v = vis[id] = { prev: cur, cur, t0: nowT };
        else { v.prev = v.cur.length && cur.length ? v.cur : cur; v.cur = cur; v.t0 = nowT; }
        // A snake that just died: puff out where it was.
        const before = prevSeen?.snakes?.[id];
        if (before && before.alive && !sn.alive) {
          bursts.push({ cells: before.body.slice(), t: 0, color });
          if (id === api.me.id) { api.sfx('bang'); api.toast('Crash! Back in 3…'); }
        }
      }
      // Apples that vanished were eaten.
      const now = new Set();
      for (let i = 0; i < sh.apples.length; i += 2) now.add(sh.apples[i] + ',' + sh.apples[i + 1]);
      for (let i = 0; i < prevApples.length; i += 2) {
        if (!now.has(prevApples[i] + ',' + prevApples[i + 1])) rings.push({ x: prevApples[i], y: prevApples[i + 1], t: 0 });
      }
      prevApples = sh.apples.slice();

      // My own feedback and records.
      const me = sh.snakes[api.me.id];
      if (me) {
        if (me.score > myScore) api.sfx('pop');
        myScore = me.score;
        if (me.alive && !wasAlive) { myDir = null; }
        wasAlive = me.alive;
        if (me.best > best) { best = me.best; api.store.set('best', best); }
      }
      if (sh.phase !== phaseSeen) {
        phaseSeen = sh.phase;
        if (sh.phase === 'over') {
          const top = ranking()[0];
          if (top && top.id === api.me.id && top.sn.best > START_LEN) {
            wins++;
            api.store.set('wins', wins);
            api.sfx('win');
          } else {
            api.sfx('lose');
          }
        } else {
          myScore = 0;
        }
      }
    }

    // Players with a snake, best first: longest ever this round, then kills.
    function ranking() {
      if (!seen) return [];
      return api.players().slice(0, MAX_SNAKES)
        .map(p => ({ id: p.id, name: p.name, color: p.color, me: p.me, sn: seen.snakes[p.id] }))
        .filter(e => e.sn)
        .sort((a, b) => b.sn.best - a.sn.best || b.sn.kills - a.sn.kills || b.sn.score - a.sn.score);
    }

    // --- input -------------------------------------------------------------

    // Sends a new heading unless it would turn the snake straight back.
    function steer(d) {
      const sn = mySnake();
      if (!sn || !sn.alive || sn.seq === undefined) return;
      const ref = myDir !== null && sn.seq !== mySeq ? myDir : sn.dir;
      if (d === ref || (d + 2) % 4 === ref) return;
      mySeq++;
      myDir = d;
      api.setState({ dir: d, seq: mySeq });
    }
    // Turn left (-1) or right (+1) relative to the current heading.
    function turn(delta) {
      const sn = mySnake();
      if (!sn || !sn.alive) return;
      const ref = myDir !== null && sn.seq !== mySeq ? myDir : sn.dir;
      steer((ref + delta + 4) % 4);
    }

    const swipeMin = () => Math.max(16, Math.min(w, h) * 0.035);
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture?.(e.pointerId);
      drag = { x: e.offsetX, y: e.offsetY };
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
      if (Math.hypot(dx, dy) < swipeMin()) return;
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
      drag = { x: e.offsetX, y: e.offsetY }; // keep swiping for the next turn
    });
    const endDrag = () => { drag = null; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    const KEYS = {
      ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3,
    };
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected || !(e.code in KEYS)) return;
      e.preventDefault();
      steer(KEYS[e.code]);
    }
    window.addEventListener('keydown', onKey);

    let padDir = -1;
    function onPad(pad) {
      let d = -1;
      if (pad.up) d = 0; else if (pad.right) d = 1; else if (pad.down) d = 2; else if (pad.left) d = 3;
      else if (Math.hypot(pad.x, pad.y) > 0.6) d = Math.abs(pad.x) > Math.abs(pad.y) ? (pad.x > 0 ? 1 : 3) : (pad.y > 0 ? 2 : 0);
      if (d >= 0 && d !== padDir) steer(d);
      padDir = d;
    }

    // Head steering: tilt past a threshold to turn once, then come back upright.
    function headSteer() {
      if (!headMode) return;
      const f = api.face();
      if (!f || !Number.isFinite(f.roll)) return;
      if (Math.abs(f.roll) < 0.14) headReady = true;
      else if (headReady && Math.abs(f.roll) > 0.28) {
        headReady = false;
        turn(f.roll > 0 ? 1 : -1);
      }
    }

    // --- timers ------------------------------------------------------------
    const timer = setInterval(() => ownerTick(api), TICK_MS);
    ownerTick(api);

    // --- drawing -----------------------------------------------------------

    function text(str, x, y, size, color, align = 'left', weight = 800) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.lineWidth = Math.max(2, size * 0.25);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }

    // Interpolated body points in pixels for one snake.
    function bodyPoints(v, f) {
      const pts = [];
      const n = v.cur.length / 2, m = v.prev.length / 2;
      for (let i = 0; i < n; i++) {
        const cx = v.cur[i * 2], cy = v.cur[i * 2 + 1];
        const j = Math.min(i, m - 1);
        let px = m ? v.prev[j * 2] : cx, py = m ? v.prev[j * 2 + 1] : cy;
        // Wrapping around an edge (or a fresh spawn): jump instead of sliding across.
        if (Math.abs(px - cx) > 1.5 || Math.abs(py - cy) > 1.5) { px = cx; py = cy; }
        pts.push({ x: lay.bx + (lerp(px, cx, f) + 0.5) * lay.cell, y: lay.by + (lerp(py, cy, f) + 0.5) * lay.cell });
      }
      return pts;
    }

    function drawSnake(id, color, name, f, isMe) {
      const v = vis[id];
      const sn = seen.snakes[id];
      if (!v || !sn || !sn.alive || !v.cur.length) return;
      const pts = bodyPoints(v, f);
      const c = lay.cell;
      const path = () => {
        ctx.beginPath();
        pts.forEach((p, i) => {
          const q = pts[i - 1];
          if (!q || Math.hypot(p.x - q.x, p.y - q.y) > c * 1.6) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
      };
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = c * 0.92;
      path();
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = c * 0.74;
      path();
      ctx.stroke();
      // Belly shine.
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = c * 0.2;
      ctx.save();
      ctx.translate(-c * 0.12, -c * 0.12);
      path();
      ctx.stroke();
      ctx.restore();
      // Head with the player's initial.
      const hd = pts[0];
      const r = c * 0.62;
      if (isMe) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = Math.max(2, c * 0.14);
        ctx.beginPath();
        ctx.arc(hd.x, hd.y, r + c * 0.1, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = Math.max(1.5, c * 0.12);
      ctx.beginPath();
      ctx.arc(hd.x, hd.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(hd.x - r * 0.3, hd.y - r * 0.35, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      const initial = ([...(name || '?')][0] || '?').toUpperCase();
      ctx.font = `900 ${Math.max(6, c * 0.85)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = Math.max(1.5, c * 0.18);
      ctx.strokeText(initial, hd.x, hd.y + c * 0.04);
      ctx.fillText(initial, hd.x, hd.y + c * 0.04);
      ctx.textBaseline = 'alphabetic';
    }

    function drawArena(time) {
      const c = lay.cell;
      const { bx, by } = lay;
      // Board: a soft checker so movement reads clearly.
      const g = ctx.createLinearGradient(0, by, 0, by + c * H);
      g.addColorStop(0, '#2a1a52');
      g.addColorStop(1, '#1b1038');
      ctx.fillStyle = g;
      ctx.fillRect(bx, by, c * W, c * H);
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (let y = 0; y < H; y++) for (let x = (y & 1); x < W; x += 2) ctx.fillRect(bx + x * c, by + y * c, c, c);
      // The wrapping edge glows aqua.
      ctx.strokeStyle = 'rgba(63,224,208,0.75)';
      ctx.lineWidth = 3;
      ctx.setLineDash([c * 0.6, c * 0.6]);
      ctx.strokeRect(bx - 1.5, by - 1.5, c * W + 3, c * H + 3);
      ctx.setLineDash([]);

      // Apples.
      if (seen) {
        for (let i = 0; i < seen.apples.length; i += 2) {
          const ax = bx + (seen.apples[i] + 0.5) * c, ay = by + (seen.apples[i + 1] + 0.5) * c;
          const pulse = 1 + Math.sin(time * 5 + i) * 0.07;
          const r = c * 0.42 * pulse;
          const art = api.img('snake-apple');
          if (art) {
            ctx.drawImage(art, ax - r * 1.2, ay - r * 1.2, r * 2.4, r * 2.4);
            continue;
          }
          const ag = ctx.createRadialGradient(ax - r * 0.3, ay - r * 0.3, r * 0.1, ax, ay, r);
          ag.addColorStop(0, '#ff9aa8');
          ag.addColorStop(0.5, '#ff3b5c');
          ag.addColorStop(1, '#b3123a');
          ctx.fillStyle = ag;
          ctx.beginPath();
          ctx.arc(ax, ay + r * 0.08, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#69db7c';
          ctx.beginPath();
          ctx.ellipse(ax + r * 0.35, ay - r * 0.85, r * 0.4, r * 0.2, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawEffects(dt) {
      const c = lay.cell;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        if (r.t > 0.35) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - r.t / 0.35)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lay.bx + (r.x + 0.5) * c, lay.by + (r.y + 0.5) * c, c * (0.4 + r.t * 3), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.t += dt;
        if (b.t > 0.7) { bursts.splice(i, 1); continue; }
        const k = b.t / 0.7;
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 1 - k;
        for (let j = 0; j < b.cells.length; j += 2) {
          const px = lay.bx + (b.cells[j] + 0.5) * c, py = lay.by + (b.cells[j + 1] + 0.5) * c;
          ctx.beginPath();
          ctx.arc(px, py, c * (0.4 + k * 1.1), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    function clock() {
      if (!seen) return '2:00';
      const left = seen.phase === 'over' ? 0 : Math.max(0, ROUND_MS - (Date.now() - seen.startedAt));
      const s = Math.ceil(left / 1000);
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }

    // Scoreboard: a column on wide screens, a strip of chips on phones.
    function drawHud() {
      const rank = ranking();
      const me = mySnake();
      const len = me?.alive ? me.len : 0;
      if (lay.wide) {
        const x = lay.sideX, top = inset.top + 22;
        text(clock(), x, top, 30, '#fff', 'left', 900);
        text(`Length ${len}`, x, top + 30, 17, '#ffd43b');
        text(`Best ${best} · Rounds won ${wins}`, x, top + 52, 13, '#cdbfff');
        let y = top + 90;
        text('Scoreboard', x, y - 14, 13, '#cdbfff');
        rank.forEach((e, i) => {
          ctx.fillStyle = e.color || '#fff';
          ctx.beginPath();
          ctx.arc(x + 7, y - 5, 7, 0, Math.PI * 2);
          ctx.fill();
          let name = e.name || '?';
          if (name.length > 12) name = name.slice(0, 11) + '…';
          text(`${i + 1}. ${name}${e.me ? ' (you)' : ''}`, x + 20, y, 14, '#fff');
          text(`${e.sn.alive ? e.sn.len : '✕'} · ${e.sn.kills}k`, x + Math.min(240, w * 0.28) - 24, y, 14, e.sn.alive ? '#fff' : '#ff8fa3', 'right');
          y += 24;
        });
        return;
      }
      const y0 = inset.top + 16;
      text(`Length ${len}`, 12, y0, 15, '#ffd43b');
      text(clock(), w / 2, y0, 17, '#fff', 'center', 900);
      text(`Best ${best}`, w - 12, y0, 13, '#cdbfff', 'right');
      let x = 12, y = y0 + 20;
      ctx.font = `800 12px ${FONT}`;
      for (const e of rank) {
        let name = e.name || '?';
        if (name.length > 8) name = name.slice(0, 7) + '…';
        const label = `${name} ${e.sn.alive ? e.sn.len : '✕'}·${e.sn.kills}k`;
        const wd = ctx.measureText(label).width + 20;
        if (x + wd > w - 8) { x = 12; y += 17; }
        ctx.fillStyle = e.color || '#fff';
        ctx.beginPath();
        ctx.arc(x + 5, y - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        text(label, x + 14, y, 12, e.sn.alive ? '#fff' : '#ff8fa3');
        x += wd + 6;
      }
    }

    function panelText(lines, sub) {
      const cx = lay.bx + lay.cell * W / 2, cy = lay.by + lay.cell * H / 2;
      const ph = 50 + lines.length * 24 + (sub ? 24 : 0);
      const pw = Math.min(lay.cell * W - 16, 300);
      ctx.fillStyle = 'rgba(20,10,46,0.82)';
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, 16);
      ctx.fill();
      ctx.stroke();
      return { cx, top: cy - ph / 2 };
    }

    function drawOverlays() {
      if (!seen) {
        text('Starting…', lay.bx + lay.cell * W / 2, lay.by + lay.cell * H / 2, 20, '#fff', 'center', 900);
        return;
      }
      if (seen.phase === 'over') {
        const rank = ranking();
        const p = panelText(rank, true);
        text('Round over!', p.cx, p.top + 32, 22, '#ffd43b', 'center', 900);
        rank.forEach((e, i) => {
          const y = p.top + 62 + i * 24;
          ctx.fillStyle = e.color || '#fff';
          ctx.beginPath();
          ctx.arc(p.cx - 112, y - 5, 6, 0, Math.PI * 2);
          ctx.fill();
          let name = e.name || '?';
          if (name.length > 10) name = name.slice(0, 9) + '…';
          text(`${i + 1}. ${name}`, p.cx - 100, y, 14, '#fff');
          text(`len ${e.sn.best} · ${e.sn.kills} kills`, p.cx + 124, y, 13, '#cdbfff', 'right');
        });
        const left = Math.max(0, Math.ceil((OVER_MS - (Date.now() - seen.overAt)) / 1000));
        text(`Next round in ${left}`, p.cx, p.top + 62 + rank.length * 24 + 6, 13, '#fff', 'center');
        return;
      }
      const me = mySnake();
      const imWatching = !me;
      const cx = lay.bx + lay.cell * W / 2, cy = lay.by + lay.cell * H / 2;
      if (imWatching) text('Arena is full: you are watching', cx, cy, 16, '#fff', 'center', 900);
      else if (!me.alive) {
        const left = Math.max(0, Math.ceil((me.respawnAt - Date.now()) / 1000));
        text(left > 0 ? `Back in ${left}…` : 'Get ready…', cx, cy, 24, '#fff', 'center', 900);
      } else if (Date.now() - seen.startedAt < 6000 && me.len <= START_LEN + 1) {
        text('Swipe or use arrow keys', cx, lay.by + lay.cell * H * 0.82, 15, '#fff', 'center', 900);
      }
    }

    let last = performance.now();
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ingest();
      headSteer();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Backdrop.
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#14082c');
      bg.addColorStop(1, '#0c0420');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      drawArena(t / 1000);
      if (seen) {
        const f = Math.min(1, (t - lastIngest) / tickDur);
        for (const p of api.players()) drawSnake(p.id, p.color || '#fff', p.name, f, p.me);
      }
      drawEffects(dt);
      drawHud();
      drawOverlays();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        clearInterval(timer);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
      },
      onPad,
    };
  },
};
