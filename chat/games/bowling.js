// Bowling: ten frames, ten pins, taking turns. The lane is simulated from
// above in lane inches (circle physics, fixed 1/240 s step, no randomness and
// no trig inside the loop) and drawn in perspective from behind the bowler.
// The bowler sends the throw; every client runs the identical simulation, so
// everyone watches the same pins fall. The bowler then reports the pins that
// are still up and the owner applies the roll to the shared scoreboard:
//   shared = { round, order, turn, frame, scores: { id: [rolls] }, pinsUp,
//              seq, phase: 'aim' | 'roll' | 'settle' | 'over', readyAt, throw, last }

const LANE_HALF = 20.75;        // lane half width (inches)
const GUTTER_X = 25.5;          // where a ball in the gutter rolls
const HEAD = 480;               // head pin distance from the foul line
const DECK_END = 520;           // the pit starts here
const BALL_R = 4.25, PIN_R = 2.4;
const BALL_M = 4.6, PIN_M = 1;
const STEP = 1 / 240;
const MAX_PLAYERS = 6;
const FULL = 1023;
const SIM_LIMIT = 10;           // seconds before a sim is cut off
const SETTLE_MS = 1500;         // hold the fallen pins before advancing the lane
const SPIN_ACCEL = 85;         // sideways accel (in/s^2) at full hook, late in the lane

// Pin n (1..10) in lane inches. Bit n-1 of a mask is set while it stands.
const PIN_POS = [];
for (let row = 0; row < 4; row++) {
  for (let j = 0; j <= row; j++) PIN_POS.push([(j - row / 2) * 12, HEAD + row * 10.39]);
}

const popcount = m => { let n = 0; for (let i = 0; i < 10; i++) if (m & (1 << i)) n++; return n; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);

function swipeSpin(pts, height) {
  const a = pts[0], z = pts[pts.length - 1];
  const dx = z.x - a.x, dy = a.y - z.y;
  const len = Math.hypot(dx, dy) || 1;
  let bulge = 0;
  for (const p of pts) {
    const off = ((p.x - a.x) * dy + (p.y - a.y) * dx) / len;
    if (Math.abs(off) > Math.abs(bulge)) bulge = off;
  }
  // A swipe that bows right of its start-to-end line turns back to the
  // left as it travels upward. The hook must follow that turn, not the bow.
  return Math.abs(bulge) < 12 ? 0 : clamp(-bulge / (0.1 * height), -1, 1);
}

// --- scoring (pure) ----------------------------------------------------------

// Where a player stands, given the pins knocked by each of their rolls so far:
// { frame: 0..9 (frame in progress), ball: rolls made in it, fresh: the next
// throw faces ten pins, over: all ten frames are done }.
function progress(rolls) {
  let i = 0;
  for (let f = 0; f < 9; f++) {
    if (i >= rolls.length) return { frame: f, ball: 0, fresh: true, over: false };
    if (rolls[i] === 10) { i++; continue; }
    if (i + 1 >= rolls.length) return { frame: f, ball: 1, fresh: false, over: false };
    i += 2;
  }
  const r = rolls.slice(i);
  if (r.length === 0) return { frame: 9, ball: 0, fresh: true, over: false };
  if (r.length === 1) return { frame: 9, ball: 1, fresh: r[0] === 10, over: false };
  if (r.length === 2) {
    if (r[0] === 10) return { frame: 9, ball: 2, fresh: r[1] === 10, over: false };
    if (r[0] + r[1] === 10) return { frame: 9, ball: 2, fresh: true, over: false };
    return { frame: 9, ball: 2, fresh: false, over: true };
  }
  return { frame: 9, ball: 3, fresh: false, over: true };
}

// Ten frames of { marks: ['X'] | ['7','/'] | ..., score: running total or null }.
function scoreFrames(rolls) {
  const out = [];
  let i = 0, total = 0, known = true;
  const mark = (v, prev) => (v === 10 ? 'X' : prev != null && prev + v === 10 ? '/' : v === 0 ? '-' : String(v));
  for (let f = 0; f < 10; f++) {
    const fr = { marks: [], score: null };
    out.push(fr);
    if (f < 9) {
      if (i >= rolls.length) { known = false; continue; }
      if (rolls[i] === 10) {
        fr.marks = ['X'];
        const a = rolls[i + 1], b = rolls[i + 2];
        if (known && a != null && b != null) { total += 10 + a + b; fr.score = total; } else known = false;
        i += 1;
      } else {
        fr.marks = [mark(rolls[i])];
        if (i + 1 >= rolls.length) { known = false; i += 1; continue; }
        fr.marks.push(mark(rolls[i + 1], rolls[i]));
        const sum = rolls[i] + rolls[i + 1];
        if (sum === 10) {
          const a = rolls[i + 2];
          if (known && a != null) { total += 10 + a; fr.score = total; } else known = false;
        } else if (known) { total += sum; fr.score = total; }
        i += 2;
      }
    } else {
      const r = rolls.slice(i);
      if (r.length === 0) { known = false; continue; }
      const marks = [];
      let prev = null;
      for (let k = 0; k < r.length; k++) {
        const v = r[k];
        if (v === 10) marks.push('X');
        else if (prev != null && prev !== 10 && prev + v === 10 && (k === 1 || (k === 2 && r[0] === 10))) marks.push('/');
        else marks.push(v === 0 ? '-' : String(v));
        // After a strike or spare the pins reset, so the next roll starts a new "pair".
        prev = (v === 10 || (prev != null && prev + v === 10)) ? null : v;
      }
      fr.marks = marks;
      if (progress(rolls).over && known) { total += r.reduce((a, b) => a + b, 0); fr.score = total; }
    }
  }
  return { frames: out, total: out.reduce((m, fr) => (fr.score != null ? fr.score : m), 0) };
}

// Which player is due next, scanning the rest of the round, then later rounds.
function nextTurn(order, scores, frame, curId, present) {
  const n = order.length;
  let f = frame, from = order.indexOf(curId) + 1;
  while (f <= 10) {
    for (let i = from; i < n; i++) {
      const id = order[i];
      if (!present.has(id)) continue;
      const p = progress(scores[id] || []);
      const done = p.over ? 10 : p.frame;
      if (done < f) return { turn: id, frame: f };
    }
    f++;
    from = 0;
  }
  return null;
}

// Applies one finished roll to the shared state; returns the new shared state.
function applyRoll(sh, pinsAfter, present, now) {
  const id = sh.turn;
  const rolls = (sh.scores[id] || []).slice();
  const before = popcount(sh.pinsUp);
  const knocked = before - popcount(pinsAfter);
  const pBefore = progress(rolls);
  rolls.push(knocked);
  const pAfter = progress(rolls);
  const scores = { ...sh.scores, [id]: rolls };
  const strike = knocked === 10 && before === 10;
  const spare = !strike && knocked === before && before < 10;
  const last = { id, n: knocked, strike, spare, seq: sh.seq };
  const turnDone = pAfter.over || pAfter.frame > pBefore.frame;
  const pinsUp = turnDone || pAfter.fresh ? FULL : pinsAfter;
  let next = { turn: id, frame: sh.frame, pinsUp, phase: 'aim' };
  if (turnDone) {
    const nt = nextTurn(sh.order, scores, sh.frame, id, present);
    next = nt ? { ...next, ...nt } : { ...next, phase: 'over', turn: null };
  }
  // Keep the current bowler and fallen rack on screen during the pause.
  return { ...sh, scores, last, pinsUp: pinsAfter, phase: 'settle', readyAt: now + SETTLE_MS, next };
}

function advanceRoll(sh, now) {
  if (sh.phase !== 'settle' || !sh.next || now < sh.readyAt) return sh;
  const { next, ...rest } = sh;
  return { ...rest, ...next, throw: null, readyAt: now };
}

// --- lane physics (pure, deterministic) ---------------------------------------

function makeSim(mask, th) {
  const pins = [];
  for (let i = 0; i < 10; i++) {
    if (!(mask & (1 << i))) continue;
    pins.push({ i, x: PIN_POS[i][0], y: PIN_POS[i][1], vx: 0, vy: 0, down: false, out: false, ft: 0, fx: 0, fy: 1 });
  }
  // Direction from a slope (dx per dy) so no trig is needed.
  const k = 1 / Math.sqrt(1 + th.angle * th.angle);
  const ball = { x: th.x, y: 0, vx: th.speed * th.angle * k, vy: th.speed * k, spin: th.spin, gutter: false, gone: false };
  return { ball, pins, t: 0, done: false, hits: 0, falls: 0, gutter: false };
}

function hitPair(a, b, ma, mb, e) {
  let dx = b.x - a.x, dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  return { dx, dy, d2, ma, mb, e };
}

// Resolves a circle collision; returns the closing speed (0 if apart).
function collide(a, b, ra, rb, ma, mb, e) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const rr = ra + rb;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 === 0) return 0;
  const d = Math.sqrt(d2);
  const nx = dx / d, ny = dy / d;
  const over = rr - d;
  const im = 1 / ma + 1 / mb;
  a.x -= nx * over * (1 / ma) / im;
  a.y -= ny * over * (1 / ma) / im;
  b.x += nx * over * (1 / mb) / im;
  b.y += ny * over * (1 / mb) / im;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return 0;
  const j = (-(1 + e) * vn) / im;
  a.vx -= (j / ma) * nx;
  a.vy -= (j / ma) * ny;
  b.vx += (j / mb) * nx;
  b.vy += (j / mb) * ny;
  return -vn;
}

function topple(p, nx, ny) {
  if (p.down) return;
  p.down = true;
  p.ft = 0;
  let l = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (l < 1e-6) { p.fx = nx; p.fy = ny; return; }
  p.fx = p.vx / l;
  p.fy = p.vy / l;
}

function stepSim(s) {
  if (s.done) return;
  s.t += STEP;
  const b = s.ball;
  if (!b.gone) {
    if (!b.gutter) {
      const k = b.y > 0 ? b.y / HEAD : 0;
      b.vx += b.spin * SPIN_ACCEL * k * k * STEP;
    }
    b.x += b.vx * STEP;
    b.y += b.vy * STEP;
    if (!b.gutter && (b.x > LANE_HALF + 1 || b.x < -LANE_HALF - 1)) {
      b.gutter = true;
      s.gutter = true;
      b.x = b.x > 0 ? GUTTER_X : -GUTTER_X;
      b.vx = 0;
    }
    if (b.y > DECK_END + 6) b.gone = true;
  }
  const pins = s.pins;
  // Ball against pins.
  if (!b.gone) {
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (p.out) continue;
      const v = collide(b, p, BALL_R, PIN_R, BALL_M, PIN_M, 0.75);
      if (v > 0) {
        s.hits++;
        if (!p.down && v > 12) { topple(p, 0, 1); s.falls++; }
      }
    }
  }
  // Pins against pins.
  for (let i = 0; i < pins.length; i++) {
    const p = pins[i];
    if (p.out) continue;
    for (let j = i + 1; j < pins.length; j++) {
      const q = pins[j];
      if (q.out) continue;
      const pv = Math.abs(p.vx) + Math.abs(p.vy), qv = Math.abs(q.vx) + Math.abs(q.vy);
      const v = collide(p, q, PIN_R, PIN_R, PIN_M, PIN_M, 0.8);
      if (v > 0) {
        s.hits++;
        if (v > 18) {
          if (!p.down && qv > pv) { topple(p, 0, 1); s.falls++; }
          if (!q.down && pv >= qv) { topple(q, 0, 1); s.falls++; }
        }
      }
    }
  }
  // Move the pins, slow them down, drop the ones that leave the deck.
  let moving = false;
  for (const p of pins) {
    if (p.out) { if (p.down) p.ft += STEP; continue; }
    const sp2 = p.vx * p.vx + p.vy * p.vy;
    if (sp2 > 360000) { const f = 600 / Math.sqrt(sp2); p.vx *= f; p.vy *= f; }
    p.x += p.vx * STEP;
    p.y += p.vy * STEP;
    const damp = p.down ? 0.992 : 0.9955;
    p.vx *= damp;
    p.vy *= damp;
    if (p.down) p.ft += STEP;
    if (p.y > DECK_END) {
      if (!p.down) { topple(p, 0, 1); s.falls++; }
      p.y = DECK_END;
      p.out = true;
      continue;
    }
    if (p.x > LANE_HALF + 1 || p.x < -LANE_HALF - 1) {
      if (!p.down) { topple(p, p.x > 0 ? 1 : -1, 0); s.falls++; }
      p.x = clamp(p.x, -LANE_HALF - 1, LANE_HALF + 1);
      p.out = true;
      continue;
    }
    if (p.vx * p.vx + p.vy * p.vy > 4) moving = true;
  }
  const fallen = pins.every(p => !p.down || p.ft >= 0.35);
  if (fallen && (s.t > SIM_LIMIT || (b.gone && !moving && s.t > 0.5))) s.done = true;
}

function standing(s) {
  let m = 0;
  for (const p of s.pins) if (!p.down && !p.out) m |= 1 << p.i;
  return m;
}

function runSim(mask, th) {
  const s = makeSim(mask, th);
  while (!s.done) stepSim(s);
  return s;
}

function validThrow(d) {
  return d && typeof d === 'object' && isNum(d.x) && isNum(d.angle) && isNum(d.speed) && isNum(d.spin) &&
    Math.abs(d.x) <= 16 && Math.abs(d.angle) <= 0.12 && d.speed >= 190 && d.speed <= 500 && Math.abs(d.spin) <= 1.01;
}

// --- stand-in art ------------------------------------------------------------

let pinSprite = null;
function standInPin() {
  if (pinSprite) return pinSprite;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 192;
  const g = c.getContext('2d');
  const cx = 32;
  g.lineJoin = 'round';
  // Body outline: head, neck, belly, base (y runs top to bottom).
  g.beginPath();
  g.moveTo(cx, 6);
  g.bezierCurveTo(cx + 15, 6, cx + 15, 36, cx + 8, 52);
  g.bezierCurveTo(cx + 6, 62, cx + 24, 96, cx + 25, 134);
  g.bezierCurveTo(cx + 26, 168, cx + 18, 186, cx, 186);
  g.bezierCurveTo(cx - 18, 186, cx - 26, 168, cx - 25, 134);
  g.bezierCurveTo(cx - 24, 96, cx - 6, 62, cx - 8, 52);
  g.bezierCurveTo(cx - 15, 36, cx - 15, 6, cx, 6);
  g.closePath();
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, '#d9dfef');
  gr.addColorStop(0.35, '#ffffff');
  gr.addColorStop(1, '#bcc4dc');
  g.fillStyle = gr;
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = '#e8334f';
  g.fillRect(0, 40, 64, 7);
  g.fillRect(0, 54, 64, 7);
  g.restore();
  g.lineWidth = 3;
  g.strokeStyle = '#7a86a8';
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.ellipse(cx - 6, 24, 3, 8, 0.1, 0, Math.PI * 2);
  g.fill();
  pinSprite = c;
  return c;
}

// --- the game ------------------------------------------------------------------

export default {
  id: 'bowling',
  name: 'Bowling',
  emoji: '🎳',
  blurb: 'Swipe to throw, curve for hook. Ten frames, strikes and spares, taking turns.',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    const strip = document.createElement('div');
    strip.style.cssText = 'position:absolute;left:6px;right:6px;pointer-events:none;color:#fff;font-weight:800;';
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;padding:12px;';
    api.el.append(canvas, strip, overlay);
    const ctx = canvas.getContext('2d');

    let high = api.store.get('high', 0);
    let throws = api.store.get('throws', 0);
    let round = 0;
    let sim = null;               // the throw being played
    let reported = 0;             // seq whose result I've sent
    let seenThrow = 0;
    let bx = 0;                   // my ball's start position
    let aimTan = 0, spinSel = 0;  // keyboard / pad aim and hook
    let charge = null;
    let swipe = null;
    const keys = { left: false, right: false, shift: false };
    let banner = null;            // { text, color, t }
    let shownLast = -1, shownRound = 0;
    let lastHitSfx = 0, hitsHeard = 0, fallsHeard = 0;
    let viewId = null, viewTurn = null, stripSig = '', stripH = 60;
    let finalHandled = false;
    let w = 0, h = 0, dpr = 1, cam = null, inset = { top: 0, bottom: 0 };
    let raf = 0, last = performance.now(), acc = 0, clock = 0, lastOwnerTick = 0, lastPub = 0, pubSig = '';

    const members = () => api.players().slice(0, MAX_PLAYERS);
    const meId = api.me.id;
    const sh = () => api.shared();
    function validShared(s) {
      return s && Number.isInteger(s.round) && Array.isArray(s.order) && s.scores && typeof s.scores === 'object' && Number.isInteger(s.pinsUp);
    }
    const isMyTurn = () => { const s = sh(); return validShared(s) && s.phase !== 'over' && s.turn === meId; };

    // --- layout -----------------------------------------------------------------
    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      strip.style.top = `${inset.top + 4}px`;
      stripH = strip.offsetHeight || stripH;
      const top = inset.top + stripH + 100;
      const bottom = h - inset.bottom - 6;
      const availH = Math.max(120, bottom - top);
      const D0 = 400, near = -75;
      const F = Math.min(5.6 * w, 8.5 * availH);
      const K = availH / (1 / (D0 + near) - 1 / (D0 + DECK_END));
      const hy = top - K / (D0 + DECK_END);
      cam = { D0, F, K, hy, cx: w / 2, top, bottom };
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // Lane inches (x, y, height z) to screen.
    function proj(x, y, z) {
      const d = y + cam.D0;
      return { x: cam.cx + (x * cam.F) / d, y: cam.hy + (cam.K - (z || 0) * cam.F) / d, s: cam.F / d };
    }
    function laneX(px) { return ((px - cam.cx) * (cam.D0 + 0)) / cam.F; }

    // --- session -------------------------------------------------------------------
    function ownerInit(prevRound) {
      const ids = members().map(m => m.id);
      const scores = {};
      ids.forEach(id => { scores[id] = []; });
      api.setShared({
        round: (prevRound || 0) + 1, order: ids, turn: ids[0], frame: 1, scores, pinsUp: FULL,
        seq: 0, phase: 'aim', readyAt: Date.now() + 1500, throw: null, last: null,
      });
    }

    function sync() {
      const s = sh();
      if (!validShared(s)) {
        if (api.isOwner()) ownerInit(0);
        return;
      }
      if (s.round !== round) {
        round = s.round;
        sim = null;
        reported = 0;
        seenThrow = 0;
        banner = null;
        shownLast = -1;
        finalHandled = false;
        viewId = null;
        stripSig = '';
      }
      if (viewTurn !== s.turn) { viewTurn = s.turn; viewId = null; }
      // Presence also carries the throw: a delayed or missed message still
      // lets every spectator watch the same fall.
      if ((s.phase === 'roll' || s.phase === 'settle') && validThrow(s.throw) && s.seq > seenThrow) {
        startSim(s.throw, s.seq, s.throwPins ?? s.pinsUp, s.turn);
      }
      // A finished roll is on the board: show it and move on.
      if (s.last && s.last.seq > shownLast) {
        if (!sim || sim.done) {
          shownLast = s.last.seq;
          if (s.last.strike) { banner = { text: 'STRIKE!', color: '#ffd43b', t: 0 }; api.sfx('score'); }
          else if (s.last.spare) { banner = { text: 'SPARE!', color: '#3fe0d0', t: 0 }; api.sfx('score'); }
          else if (s.last.n === 0) { banner = { text: s.last.id === meId ? 'Gutter…' : 'Miss', color: '#cfd4e6', t: 0, small: true }; api.sfx('miss'); }
        }
      }
      if (sim?.done && clock - sim.finishedAt >= SETTLE_MS / 1000 && s.phase !== 'roll' && s.last?.seq >= sim.seq) sim = null;
      if (s.phase === 'over' && !finalHandled) {
        finalHandled = true;
        const mine = scoreFrames(s.scores[meId] || []).total;
        if (mine > high) { high = mine; api.store.set('high', high); }
        const best = standings(s)[0];
        if (best && best.id === meId) api.sfx('win');
      }
    }

    function standings(s) {
      const present = new Set(api.players().map(p => p.id));
      return s.order.filter(id => present.has(id) || (s.scores[id] || []).length)
        .map(id => ({ id, total: scoreFrames(s.scores[id] || []).total }))
        .sort((a, b) => b.total - a.total);
    }

    // The owner applies results and keeps the turn moving.
    function ownerApply(pinsAfter) {
      const s = sh();
      if (!validShared(s) || s.phase !== 'roll') return;
      const present = new Set(members().map(m => m.id));
      api.setShared(applyRoll(s, pinsAfter, present, Date.now()));
    }

    function ownerTick() {
      const s = sh();
      if (!api.isOwner() || !validShared(s) || s.phase === 'over') return;
      const now = Date.now();
      const present = new Set(members().map(m => m.id));
      if (s.phase === 'settle') {
        const next = advanceRoll(s, now);
        if (next !== s) api.setShared(next);
        return;
      }
      // New friends can join while the first frame is being bowled.
      if (s.frame === 1) {
        const fresh = members().filter(m => !s.order.includes(m.id) && s.order.length < MAX_PLAYERS);
        if (fresh.length && s.phase === 'aim') {
          const scores = { ...s.scores };
          fresh.forEach(m => { scores[m.id] = []; });
          api.setShared({ ...s, order: [...s.order, ...fresh.map(m => m.id)], scores });
          return;
        }
      }
      if (s.phase === 'aim') {
        if (!present.has(s.turn)) {
          // The bowler left: hand the turn on.
          const nt = nextTurn(s.order, s.scores, s.frame, s.turn, present);
          if (nt) api.setShared({ ...s, turn: nt.turn, frame: nt.frame, pinsUp: FULL, readyAt: now + 800 });
          else api.setShared({ ...s, phase: 'over', turn: null });
        } else if (now > s.readyAt + 60000) {
          // Asleep at the lane: a gentle straight roll.
          const th = { x: 0, angle: 0, speed: 300, spin: 0 };
          const seq = s.seq + 1;
          api.setShared({ ...s, phase: 'roll', seq, throw: { n: seq, ...th }, throwPins: s.pinsUp, throwAt: now });
        }
      } else if (s.phase === 'roll' && now > (s.throwAt || 0) + 12000 && validThrow(s.throw)) {
        // The bowler never reported: play the throw out here.
        ownerApply(standing(runSim(s.pinsUp, s.throw)));
      }
    }

    // --- throwing --------------------------------------------------------------------
    function canThrow() {
      const s = sh();
      return validShared(s) && s.phase === 'aim' && s.turn === meId && Date.now() >= s.readyAt && !sim;
    }

    function startSim(th, n, mask = sh().pinsUp, bowler = sh().turn) {
      sim = makeSim(mask, th);
      sim.seq = n;
      sim.bowler = bowler;
      seenThrow = Math.max(seenThrow, n);
      hitsHeard = 0;
      fallsHeard = 0;
      acc = 0;
    }

    function ownerAcceptThrow(from, d) {
      const s = sh();
      if (!api.isOwner() || !validShared(s) || s.phase !== 'aim' || Date.now() < s.readyAt || s.turn !== from || !validThrow(d)) return;
      if (!Number.isInteger(d.n) || d.n !== s.seq + 1) return;
      api.setShared({ ...s, phase: 'roll', seq: d.n, throw: { n: d.n, x: d.x, angle: d.angle, speed: d.speed, spin: d.spin }, throwPins: s.pinsUp, throwAt: Date.now() });
    }

    function doThrow(th) {
      if (!canThrow()) return;
      const s = sh();
      const msg = { n: s.seq + 1, x: clamp(th.x, -15, 15), angle: clamp(th.angle, -0.07, 0.07), speed: clamp(th.speed, 220, 470), spin: clamp(th.spin, -1, 1) };
      throws++;
      api.store.set('throws', throws);
      api.sfx('whoosh');
      startSim(msg, msg.n);
      api.send('throw', msg);
      ownerAcceptThrow(meId, msg);
      swipe = null;
      charge = null;
    }

    api.on('throw', (d, from) => {
      const s = sh();
      if (!validShared(s) || from !== s.turn || from === meId || !validThrow(d) || !Number.isInteger(d.n)) return;
      if (s.phase === 'aim' && (Date.now() < s.readyAt || d.n !== s.seq + 1)) return;
      if (s.phase !== 'aim' && !(s.phase === 'roll' && d.n === s.seq)) return;
      if (d.n > seenThrow) startSim(d, d.n);
      ownerAcceptThrow(from, d);
    });

    api.on('result', (d, from) => {
      const s = sh();
      if (!api.isOwner() || !validShared(s) || s.phase !== 'roll' || from !== s.turn || !d) return;
      if (d.n !== s.seq || !Number.isInteger(d.pins) || d.pins < 0 || d.pins > FULL || (d.pins & ~s.pinsUp) !== 0) return;
      ownerApply(d.pins);
    });

    api.on('again', () => {
      const s = sh();
      if (api.isOwner() && validShared(s) && s.phase === 'over') ownerInit(s.round);
    });

    // --- input ----------------------------------------------------------------------------
    function pt(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    }
    function ballScreen() { return proj(bx, 0, BALL_R * 1.3); }

    function onDown(e) {
      if (!canThrow()) return;
      canvas.setPointerCapture?.(e.pointerId);
      const p = pt(e);
      const b = ballScreen();
      swipe = { pts: [p], mode: 'unknown', nearBall: Math.hypot(p.x - b.x, p.y - b.y) < b.s * BALL_R * 2.6 + 30 };
    }
    function onMove(e) {
      if (!swipe) return;
      const p = pt(e);
      swipe.pts.push(p);
      const a = swipe.pts[0];
      const dx = p.x - a.x, dy = p.y - a.y;
      if (swipe.mode === 'unknown' && Math.hypot(dx, dy) > 12) {
        swipe.mode = swipe.nearBall && Math.abs(dx) > Math.abs(dy) * 1.4 ? 'slide' : 'swipe';
      }
      if (swipe.mode === 'slide') bx = clamp(laneX(p.x), -15, 15);
    }
    function onUp(e) {
      if (!swipe) return;
      onMove(e);
      const sw = swipe;
      swipe = null;
      if (sw.mode !== 'swipe') return;
      const pts = sw.pts;
      const a = pts[0], z = pts[pts.length - 1];
      const dx = z.x - a.x, dy = a.y - z.y;
      if (dy < 40) return;
      // Speed from the last stretch of the swipe.
      let k = pts.length - 1;
      while (k > 0 && z.t - pts[k].t < 110) k--;
      const q = pts[k];
      const dt = Math.max(16, z.t - q.t);
      const sp = Math.hypot(z.x - q.x, z.y - q.y) / dt * 1000 / h;   // screens per second
      const speed = clamp(200 + sp * 85, 220, 470);
      // Direction of the whole swipe; its bend gives hook.
      const tan = dx / dy;
      const spin = swipeSpin(pts, h);
      doThrow({ x: bx, angle: clamp(tan * 0.3, -0.07, 0.07), speed, spin });
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', () => { swipe = null; });

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const down = e.type === 'keydown';
      if (e.code === 'ArrowLeft') { keys.left = down; e.preventDefault(); }
      else if (e.code === 'ArrowRight') { keys.right = down; e.preventDefault(); }
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = down;
      else if (down && e.code === 'ArrowUp') { spinSel = clamp(spinSel + 0.25, -1, 1); e.preventDefault(); }
      else if (down && e.code === 'ArrowDown') { spinSel = clamp(spinSel - 0.25, -1, 1); e.preventDefault(); }
      else if (e.code === 'Space') {
        e.preventDefault();
        if (down && !charge && !e.repeat && canThrow()) charge = { p: 0.1, dir: 1 };
        if (!down && charge) {
          doThrow({ x: bx, angle: aimTan, speed: 220 + charge.p * 250, spin: spinSel });
          charge = null;
        }
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // --- loop ---------------------------------------------------------------------------------
    function update(dt) {
      if (keys.left || keys.right) {
        const d = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (keys.shift) bx = clamp(bx + d * dt * 14, -15, 15);
        else aimTan = clamp(aimTan + d * dt * 0.05, -0.07, 0.07);
      }
      if (charge) {
        charge.p += charge.dir * dt * 1.2;
        if (charge.p > 1) { charge.p = 1; charge.dir = -1; }
        if (charge.p < 0.1) { charge.p = 0.1; charge.dir = 1; }
      }
      if (sim && !sim.done) {
        acc += dt;
        let n = 0;
        while (acc >= STEP && !sim.done && n < 40) { acc -= STEP; stepSim(sim); n++; }
        if (sim.hits > hitsHeard && clock - lastHitSfx > 0.09) { api.sfx('bang'); lastHitSfx = clock; }
        hitsHeard = sim.hits;
        if (sim.done) onSimDone();
      }
      // The bowler's aim is visible to the others.
      if (isMyTurn() && !sim && clock - lastPub > 0.1) {
        const sig = `${Math.round(bx * 10)}`;
        if (sig !== pubSig) { pubSig = sig; lastPub = clock; api.setState({ bx: Math.round(bx * 10) / 10 }); }
      }
      if (banner) { banner.t += dt; if (banner.t > 2) banner = null; }
    }

    function onSimDone() {
      sim.finishedAt = clock;
      const s = sh();
      if (!validShared(s) || reported >= sim.seq) return;
      if (sim.bowler !== meId && !api.isOwner()) return;
      reported = sim.seq;
      const pins = standing(sim);
      if (api.isOwner()) {
        if (s.phase === 'roll' && s.seq === sim.seq) ownerApply(pins);
      } else {
        api.send('result', { n: sim.seq, pins });
      }
    }

    // --- drawing --------------------------------------------------------------------------------
    function quad(x0, y0, x1, y1, z) {
      // Lane-aligned rectangle [x0..x1] x [y0..y1].
      const a = proj(x0, y0, z), b = proj(x1, y0, z), c = proj(x1, y1, z), d = proj(x0, y1, z);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
    }

    function drawLane() {
      const art = api.img('bowling-lane');
      if (art) {
        const s = Math.max(w / art.width, h / art.height);
        ctx.drawImage(art, (w - art.width * s) / 2, (h - art.height * s) / 2, art.width * s, art.height * s);
        return;
      }
      // Alley walls with neon.
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#1b0f3a');
      bg.addColorStop(0.5, '#2b1458');
      bg.addColorStop(1, '#140a2a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const vp = proj(0, DECK_END + 120, 0);
      for (let i = -6; i <= 6; i++) {
        const col = i % 2 ? 'rgba(255,95,162,0.35)' : 'rgba(63,224,208,0.3)';
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(vp.x + i * 8, vp.y);
        ctx.lineTo(vp.x + i * w * 0.5, h * 1.1);
        ctx.stroke();
      }
      // Wood approach and lane.
      const p0 = proj(0, -140, 0), p1 = proj(0, DECK_END, 0);
      const wood = ctx.createLinearGradient(0, p1.y, 0, p0.y);
      wood.addColorStop(0, '#f2c27a');
      wood.addColorStop(0.5, '#e0a35a');
      wood.addColorStop(1, '#c98a46');
      ctx.fillStyle = wood;
      quad(-LANE_HALF, -140, LANE_HALF, DECK_END);
      ctx.fill();
      // Gutters.
      for (const sg of [-1, 1]) {
        const x0 = sg > 0 ? LANE_HALF : -30, x1 = sg > 0 ? 30 : -LANE_HALF;
        ctx.fillStyle = '#3b3f55';
        quad(x0, -140, x1, DECK_END);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        quad(sg > 0 ? LANE_HALF + 2 : -30 + 2, -140, sg > 0 ? 30 - 2 : -LANE_HALF - 2, DECK_END);
        ctx.fill();
        ctx.fillStyle = '#8a8fa8';
        quad(sg > 0 ? 30 : -33, -140, sg > 0 ? 33 : -30, DECK_END);
        ctx.fill();
      }
      // Boards.
      ctx.strokeStyle = 'rgba(120,70,20,0.25)';
      ctx.lineWidth = 1;
      for (let k = 0; k <= 13; k++) {
        const x = -LANE_HALF + (k * LANE_HALF * 2) / 13;
        const a = proj(x, -140, 0), b = proj(x, DECK_END, 0);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Arrows and dots.
      ctx.fillStyle = 'rgba(120,50,20,0.55)';
      for (let k = -3; k <= 3; k++) {
        const x = k * 5.4, y = 160 - Math.abs(k) * 5;
        const a = proj(x, y, 0), l = proj(x - 1.4, y - 9, 0), r = proj(x + 1.4, y - 9, 0);
        const tip = proj(x, y + 9, 0);
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(r.x, r.y);
        ctx.lineTo(l.x, l.y);
        ctx.closePath();
        ctx.fill();
        void a;
      }
      for (let k = -3; k <= 3; k++) {
        const c = proj(k * 5.4, 70, 0);
        ctx.beginPath();
        ctx.arc(c.x, c.y, Math.max(1.5, c.s * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      // Gloss.
      const gl = ctx.createLinearGradient(0, p1.y, 0, p0.y);
      gl.addColorStop(0, 'rgba(255,255,255,0.05)');
      gl.addColorStop(0.6, 'rgba(255,255,255,0.18)');
      gl.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.fillStyle = gl;
      quad(-8, -140, 8, DECK_END);
      ctx.fill();
      // Pin deck, pit and foul line.
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      quad(-LANE_HALF, HEAD - 14, LANE_HALF, DECK_END);
      ctx.fill();
      ctx.fillStyle = '#0c0818';
      quad(-33, DECK_END, 33, DECK_END + 60);
      ctx.fill();
      ctx.fillStyle = '#c92f4a';
      quad(-LANE_HALF, -0.8, LANE_HALF, 0.8);
      ctx.fill();
    }

    function drawBallAt(x, y, color, alpha) {
      const p = proj(x, y, BALL_R * 1.3);
      const r = BALL_R * 1.3 * p.s;
      const g0 = proj(x, y, 0);
      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(g0.x, g0.y, r * 0.95, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      const gr = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.35, color);
      gr.addColorStop(1, '#1a0d33');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      for (const [ox, oy] of [[-0.25, -0.15], [0.05, -0.28], [-0.05, 0.02]]) {
        ctx.beginPath();
        ctx.arc(p.x + ox * r, p.y + oy * r, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const PIN_H = 15 * 1.7, PIN_W = 4.75 * 1.35;
    function drawPin(p, alpha) {
      const art = api.img('bowling-pin');
      const spr = art || standInPin();
      const base = proj(p.x, p.y, 0);
      let head, th = 0;
      if (p.down) {
        th = Math.min(1, p.ft / 0.28) * (Math.PI / 2);
        const d = PIN_H * Math.sin(th);
        head = proj(p.x + p.fx * d, p.y + p.fy * d, PIN_H * Math.cos(th));
      } else {
        head = proj(p.x, p.y, PIN_H);
      }
      const len = Math.max(2, Math.hypot(head.x - base.x, head.y - base.y));
      const ang = Math.atan2(head.x - base.x, -(head.y - base.y));
      const wid = PIN_W * base.s;
      ctx.save();
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, wid * 0.6, wid * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.translate(base.x, base.y);
      ctx.rotate(ang);
      ctx.drawImage(spr, -wid / 2, -len, wid, len);
      ctx.restore();
    }

    function currentPins() {
      if (sim) return sim.pins;
      const s = sh();
      const mask = validShared(s) ? s.pinsUp : FULL;
      const pins = [];
      for (let i = 0; i < 10; i++) if (mask & (1 << i)) pins.push({ i, x: PIN_POS[i][0], y: PIN_POS[i][1], down: false, out: false, ft: 0, fx: 0, fy: 1 });
      return pins;
    }

    function colorOf(id) {
      if (id === meId) return api.me.color;
      return api.players().find(p => p.id === id)?.color || '#ffffff';
    }
    function nameOf(id) {
      if (id === meId) return 'You';
      return api.players().find(p => p.id === id)?.name || 'Someone';
    }

    function text(str, x, y, color, size, align) {
      ctx.font = `900 ${size}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = align || 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.fillStyle = color;
      ctx.strokeText(str, x, y);
      ctx.fillText(str, x, y);
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawLane();
      const s = sh();
      const ok = validShared(s);

      // Pins (far to near) and the ball between them by depth.
      const items = [];
      for (const p of currentPins()) {
        items.push({ y: p.y, draw: () => drawPin(p, 1) });
      }
      if (sim && !sim.ball.gone) {
        const bl = sim.ball;
        items.push({ y: bl.y, draw: () => drawBallAt(bl.x, bl.y, colorOf(sim.bowler), 1) });
      }
      items.sort((a, b) => b.y - a.y);
      items.forEach(i => i.draw());

      // The waiting ball and its aim.
      if (ok && s.phase === 'aim' && !sim) {
        const mine = s.turn === meId;
        const sx = mine ? bx : (typeof (api.players().find(p => p.id === s.turn)?.state?.bx) === 'number' ? clamp(api.players().find(p => p.id === s.turn).state.bx, -15, 15) : 0);
        drawBallAt(sx, -2, colorOf(s.turn), mine ? 1 : 0.85);
        if (mine && canThrow()) {
          const ready = !swipe || swipe.mode !== 'swipe';
          if (ready) {
            const a = proj(bx, 4, 0), b = proj(bx + aimTan * 420, 440, 0);
            ctx.save();
            ctx.setLineDash([5, 7]);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      // Swipe trail.
      if (swipe && swipe.mode === 'swipe') {
        ctx.save();
        ctx.setLineDash([2, 8]);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        swipe.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        ctx.restore();
      }

      // Power bar for keyboard / pad.
      if (charge) {
        const bw = Math.min(240, w - 40), bxp = (w - bw) / 2, byp = h - inset.bottom - 30;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(bxp, byp, bw, 14, 7);
        ctx.fill();
        ctx.fillStyle = '#ffd43b';
        ctx.beginPath();
        ctx.roundRect(bxp + 2, byp + 2, Math.max(8, (bw - 4) * charge.p), 10, 5);
        ctx.fill();
      }

      // Status line.
      const sy = inset.top + stripH + 22;
      if (ok) {
        let msg = '';
        if (s.phase === 'over') msg = 'Game over';
        else if (s.phase === 'settle' || sim?.done) msg = `${nameOf(sim?.bowler ?? s.turn)} · Pins settling…`;
        else if (!s.order.includes(meId)) msg = `Watching · ${nameOf(s.turn)} bowls (you join the next game)`;
        else {
          const pr = progress(s.scores[s.turn] || []);
          const who = s.turn === meId ? 'Your turn' : `${nameOf(s.turn)} is bowling`;
          msg = `${who} · Frame ${pr.frame + 1}${pr.ball ? ` · Ball ${pr.ball + 1}` : ''}`;
        }
        text(msg, w / 2, sy, '#fff', 15);
        if (s.turn === meId && canThrow() && throws < 4 && !swipe) {
          text('Swipe up on the ball · curve it for hook', w / 2, h - inset.bottom - 12, '#fff', 13);
        } else if (s.turn === meId && canThrow() && (spinSel !== 0)) {
          text(`Hook ${spinSel > 0 ? '→' : '←'} ${Math.abs(spinSel) * 100 | 0}%`, w / 2, h - inset.bottom - 12, '#fff', 13);
        }
      } else {
        text('Setting up the lane…', w / 2, sy, '#fff', 15);
      }

      // STRIKE / SPARE banners.
      if (banner) {
        const k = Math.min(1, banner.t / 0.25);
        const fade = banner.t > 1.5 ? 1 - (banner.t - 1.5) / 0.5 : 1;
        const size = (banner.small ? 30 : Math.min(w * 0.2, 96)) * (0.6 + 0.4 * k);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(w / 2, h * 0.42);
        ctx.rotate(-0.06);
        text(banner.text, 0, 0, banner.color, size);
        ctx.restore();
      }
    }

    // --- score strip and game-over card (DOM) ------------------------------------------------------
    function el(tag, css, txt) {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (txt != null) e.textContent = txt;
      return e;
    }

    function updateStrip() {
      const s = sh();
      if (!validShared(s)) return;
      const present = new Set(api.players().map(p => p.id));
      const vid = viewId && s.order.includes(viewId) ? viewId : (s.turn && s.order.includes(s.turn) ? s.turn : s.order[0]);
      const sig = JSON.stringify([s.order, s.scores, s.turn, s.phase, vid, [...present], api.players().map(p => p.name)]);
      if (sig !== stripSig) {
        stripSig = sig;
        strip.replaceChildren();
        const chips = el('div', 'display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin-bottom:3px;');
        for (const id of s.order) {
          const total = scoreFrames(s.scores[id] || []).total;
          const gone = !present.has(id);
          const chip = el('button', `pointer-events:auto;border:2px solid ${id === vid ? colorOf(id) : 'rgba(255,255,255,0.15)'};background:rgba(30,14,60,0.82);color:${gone ? '#889' : '#fff'};border-radius:12px;padding:1px 8px;font:inherit;font-size:12px;cursor:pointer;`);
          const dot = el('span', `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;background:${colorOf(id)};`);
          const nm = el('span', 'max-width:70px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;', (s.turn === id && s.phase !== 'over' ? '🎳 ' : '') + (id === meId ? 'You' : nameOf(id)));
          chip.append(dot, nm, el('span', 'margin-left:5px;opacity:0.85;', String(total)));
          chip.addEventListener('click', () => { viewId = viewId === id ? null : id; stripSig = ''; });
          chips.append(chip);
        }
        const card = el('div', 'display:grid;grid-template-columns:repeat(9,1fr) 1.55fr;gap:2px;background:rgba(30,14,60,0.82);border-radius:10px;padding:3px;');
        const sf = scoreFrames(s.scores[vid] || []);
        sf.frames.forEach((fr, i) => {
          const cell = el('div', 'background:rgba(255,255,255,0.1);border-radius:6px;text-align:center;line-height:1.15;min-width:0;');
          const top = el('div', 'display:flex;justify-content:flex-end;gap:1px;font-size:11px;padding:1px 3px 0;min-height:14px;');
          fr.marks.forEach(m => top.append(el('span', `min-width:11px;border:1px solid rgba(255,255,255,0.3);border-radius:3px;padding:0 1px;${m === 'X' ? 'color:#ffd43b;' : m === '/' ? 'color:#3fe0d0;' : ''}`, m)));
          if (!fr.marks.length) top.append(el('span', '', ' '));
          cell.append(el('div', 'font-size:9px;opacity:0.6;', String(i + 1)), top, el('div', 'font-size:13px;padding-bottom:1px;', fr.score != null ? String(fr.score) : ' '));
          card.append(cell);
        });
        strip.append(chips, card);
        stripH = strip.offsetHeight || stripH;
        resize();
      }
      // Game-over panel.
      if (s.phase === 'over' && !sim) {
        if (!overlay.firstChild || overlay.dataset.sig !== sig) {
          overlay.dataset.sig = sig;
          const panel = el('div', 'pointer-events:auto;background:rgba(36,16,66,0.94);border:1px solid rgba(255,255,255,0.18);border-radius:18px;padding:14px 18px;color:#fff;text-align:center;font-weight:800;box-shadow:0 8px 30px rgba(0,0,0,0.5);min-width:220px;');
          panel.append(el('div', 'font-size:1.2rem;font-weight:900;margin-bottom:6px;', 'Final scores'));
          const st = standings(s);
          const top = st[0] ? st[0].total : 0;
          st.forEach((r, i) => {
            const row = el('div', `display:flex;justify-content:space-between;gap:14px;padding:3px 4px;color:${colorOf(r.id)};${r.total === top && st.length > 1 ? 'font-size:1.1rem;' : ''}`);
            row.append(el('span', '', `${i === 0 && st.length > 1 ? '🏆 ' : ''}${nameOf(r.id)}`), el('span', '', String(r.total)));
            panel.append(row);
          });
          panel.append(el('div', 'margin-top:6px;font-size:12px;opacity:0.85;', `Your best game: ${high || '–'}`));
          const row = el('div', 'display:flex;gap:10px;justify-content:center;margin-top:10px;');
          const again = el('button', '', 'Play again');
          again.className = 'btn';
          again.addEventListener('click', () => {
            if (api.isOwner()) ownerInit(sh()?.round || 0); else api.send('again', {});
          });
          const leave = el('button', '', 'Leave');
          leave.className = 'btn ghost';
          leave.addEventListener('click', () => api.exit());
          row.append(again, leave);
          panel.append(row);
          overlay.replaceChildren(panel);
        }
      } else if (overlay.firstChild) {
        overlay.replaceChildren();
        delete overlay.dataset.sig;
      }
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      clock += dt;
      sync();
      if (clock - lastOwnerTick > 0.25) { lastOwnerTick = clock; ownerTick(); }
      update(dt);
      sync();
      updateStrip();
      render();
      raf = requestAnimationFrame(frame);
    }
    sync();
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
      },
      onChange() { sync(); },
      // A test bot's move (js/rookie.js): a roll down the lane on its turn.
      rookie() {
        if (!canThrow()) return;
        const r = () => Math.random() - 0.5;
        doThrow({ x: clamp(bx + r() * 6, -15, 15), angle: r() * 0.05, speed: 300 + r() * 120, spin: r() });
      },
      onPad(pad) {
        if (!canThrow()) { charge = null; return; }
        aimTan = clamp(pad.x * 0.07, -0.07, 0.07);
        spinSel = clamp((pad.rt || 0) - (pad.lt || 0), -1, 1);
        if (pad.left) bx = clamp(bx - 0.25, -15, 15);
        if (pad.right) bx = clamp(bx + 0.25, -15, 15);
        const a = !!(pad.pressed && pad.pressed[0]);
        if (a && !charge) charge = { p: 0.1, dir: 1 };
        if (!a && charge) {
          doThrow({ x: bx, angle: aimTan, speed: 220 + charge.p * 250, spin: spinSel });
          charge = null;
        }
      },
    };
  },
};

// Exposed for tests.
export const _bowling = { progress, scoreFrames, applyRoll, advanceRoll, nextTurn, makeSim, stepSim, runSim, standing, popcount, swipeSpin, PIN_POS, FULL, HEAD, SETTLE_MS };
