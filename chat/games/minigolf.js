// Mini Golf: nine holes, everyone plays the same hole at the same time on
// their own copy. Friends' balls show as see-through ghosts in their colour;
// their putts are sent as (x, y, vx, vy) and simulated with the same physics,
// so a ghost rolls, bounces and sinks the way the real ball did. The owner
// keeps shared { round, hole, startedAt } and moves everyone to the next hole
// once all have holed out (or 90 s after the first finished). Strokes, per-hole
// scores and the ball position live in each player's own state.

const W = 100, H = 160;          // course units, portrait
const BALL_R = 1.9;
const RAIL = 1.2;                // half thickness of a wooden rail
const CUP_R = 3.5;
const STEP = 1 / 120;
const V_MIN = 18, V_MAX = 175;
const MAX_PULL = 34;             // drag distance (units) for full power
const MAX_STROKES = 8;
const MAX_PLAYERS = 8;
const INTERLUDE = 4500;          // ms the scorecard shows between holes
const FIRST_GRACE = 90000;       // ms after the first finisher before moving on
const COLORS = ['#ff5fa2', '#ffd43b', '#3fe0d0', '#9775fa'];

// --- courses -------------------------------------------------------------
// poly: the playing area (rails run along its edges). walls: extra rails
// (polylines). islands: closed polygons that are solid. Everything is in the
// 100 x 160 course box; the tee is near the bottom, the cup near the top.

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

const HOLES = [
  { name: 'Warm-Up', par: 2, poly: rect(30, 12, 70, 148), tee: { x: 50, y: 134 }, cup: { x: 50, y: 28 } },
  {
    name: 'The Bend', par: 3,
    poly: [[14, 148], [14, 34], [86, 34], [86, 66], [46, 66], [46, 148]],
    tee: { x: 30, y: 134 }, cup: { x: 74, y: 50 },
  },
  {
    name: 'Bumper Park', par: 3, poly: rect(14, 12, 86, 148), tee: { x: 50, y: 136 }, cup: { x: 50, y: 28 },
    bumpers: [{ x: 34, y: 104, r: 5 }, { x: 66, y: 104, r: 5 }, { x: 50, y: 82, r: 6 }, { x: 28, y: 58, r: 5 }, { x: 72, y: 58, r: 5 }],
  },
  {
    name: 'Windmill', par: 3, poly: rect(30, 12, 70, 148), tee: { x: 50, y: 136 }, cup: { x: 50, y: 26 },
    mill: { x: 50, y: 80, arm: 17, w: 1.7 },
  },
  {
    name: 'Sand Castle', par: 4, poly: rect(16, 14, 84, 148), tee: { x: 32, y: 136 }, cup: { x: 30, y: 28 },
    walls: [[[16, 100], [56, 100]], [[84, 62], [44, 62]]],
    sand: [{ x: 70, y: 86, rx: 13, ry: 8 }, { x: 28, y: 78, rx: 11, ry: 7 }, { x: 66, y: 124, rx: 14, ry: 9 }, { x: 62, y: 40, rx: 12, ry: 8 }],
  },
  {
    name: 'Slippery Slope', par: 3, poly: rect(18, 12, 82, 148), tee: { x: 64, y: 138 }, cup: { x: 34, y: 26 },
    slopes: [{ x: 18, y: 92, w: 64, h: 34, fx: -32, fy: 0 }, { x: 18, y: 44, w: 64, h: 34, fx: 32, fy: 0 }],
  },
  {
    name: 'Lily Pond', par: 4, poly: rect(14, 12, 86, 148), tee: { x: 26, y: 138 }, cup: { x: 74, y: 26 },
    water: [{ x: 14, y: 48, w: 46, h: 30 }, { x: 40, y: 96, w: 46, h: 30 }],
  },
  {
    name: 'Warp Tunnel', par: 3, poly: rect(14, 12, 86, 148), tee: { x: 68, y: 138 }, cup: { x: 28, y: 26 },
    walls: [[[14, 80], [86, 80]]],
    bumpers: [{ x: 48, y: 112, r: 4 }],
    tele: [{ a: { x: 28, y: 106 }, b: { x: 72, y: 50 }, r: 5 }],
  },
  {
    name: 'Bank Robber', par: 4,
    poly: [[22, 12], [78, 12], [90, 24], [90, 136], [78, 148], [22, 148], [10, 136], [10, 24]],
    tee: { x: 50, y: 136 }, cup: { x: 50, y: 28 },
    walls: [[[34, 52], [66, 52], [66, 108], [34, 108], [34, 52]]],
    islands: [rect(34, 52, 66, 108)],
  },
];

// Precompute the rail segments of every hole.
for (const hl of HOLES) {
  hl.segs = [];
  const add = (pts, closed) => {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      hl.segs.push([a[0], a[1], b[0], b[1]]);
    }
  };
  add(hl.poly, true);
  for (const wl of hl.walls || []) add(wl, false);
  hl.bumpers = hl.bumpers || [];
  hl.sand = hl.sand || [];
  hl.water = hl.water || [];
  hl.slopes = hl.slopes || [];
  hl.tele = hl.tele || [];
  hl.islands = hl.islands || [];
}

// --- physics -------------------------------------------------------------

function newBall(x, y) {
  return { x, y, vx: 0, vy: 0, moving: false, sink: false, lock: false };
}

function inPoly(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Pushes the ball out of a rail (segment) and bounces it. `mv` is a moving
// rail { cx, cy, w } (the windmill) whose surface speed is added in.
function collideSeg(b, x1, y1, x2, y2, rad, rest, mv) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1e-9;
  let t = ((b.x - x1) * dx + (b.y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t, py = y1 + dy * t;
  let nx = b.x - px, ny = b.y - py;
  const d = Math.hypot(nx, ny);
  if (d >= rad) return false;
  if (d > 1e-6) { nx /= d; ny /= d; } else { const l = Math.sqrt(len2); nx = -dy / l; ny = dx / l; }
  b.x = px + nx * rad;
  b.y = py + ny * rad;
  let wx = 0, wy = 0;
  if (mv) { wx = -mv.w * (py - mv.cy); wy = mv.w * (px - mv.cx); }
  const rvx = b.vx - wx, rvy = b.vy - wy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    b.vx = rvx - (1 + rest) * vn * nx + wx;
    b.vy = rvy - (1 + rest) * vn * ny + wy;
  }
  return vn < -6;
}

function collideCircle(b, cx, cy, rad, rest) {
  let nx = b.x - cx, ny = b.y - cy;
  const d = Math.hypot(nx, ny);
  if (d >= rad) return false;
  if (d > 1e-6) { nx /= d; ny /= d; } else { nx = 0; ny = 1; }
  b.x = cx + nx * rad;
  b.y = cy + ny * rad;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + rest) * vn * nx;
    b.vy -= (1 + rest) * vn * ny;
  }
  return vn < -6;
}

function millAngle(m, t) { return m.w * t; }

const RANK = { sink: 5, water: 4, out: 4, tele: 3, stop: 2, wall: 1 };

// One fixed step. `t` is the hole clock in seconds (drives the windmill).
// Returns the most important event: 'sink', 'water', 'out', 'tele', 'stop',
// 'wall' or null.
function stepBall(hl, b, t) {
  if (!b.moving || b.sink) return null;
  let ev = null;
  const note = e => { if (!ev || RANK[e] > RANK[ev]) ev = e; };

  // Slopes push, sand drags.
  let ax = 0, ay = 0;
  for (const z of hl.slopes) {
    if (b.x > z.x && b.x < z.x + z.w && b.y > z.y && b.y < z.y + z.h) { ax += z.fx; ay += z.fy; }
  }
  const slope = Math.hypot(ax, ay);
  b.vx += ax * STEP;
  b.vy += ay * STEP;
  let sand = false;
  for (const s of hl.sand) {
    const ex = (b.x - s.x) / s.rx, ey = (b.y - s.y) / s.ry;
    if (ex * ex + ey * ey < 1) { sand = true; break; }
  }
  let sp = Math.hypot(b.vx, b.vy);
  if (sp > 0) {
    const ns = Math.max(0, sp - ((sand ? 3.2 : 0.6) * sp + (sand ? 30 : 14)) * STEP);
    b.vx *= ns / sp;
    b.vy *= ns / sp;
  }

  // Pull toward a cup the ball is rolling over slowly.
  const cdx = hl.cup.x - b.x, cdy = hl.cup.y - b.y;
  const cd = Math.hypot(cdx, cdy);
  sp = Math.hypot(b.vx, b.vy);
  if (cd < 7 && sp < 70 && cd > 0.01) {
    b.vx += (cdx / cd) * 90 * STEP;
    b.vy += (cdy / cd) * 90 * STEP;
  }

  b.x += b.vx * STEP;
  b.y += b.vy * STEP;

  // Rails, posts and the windmill.
  let touched = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of hl.segs) {
      if (collideSeg(b, s[0], s[1], s[2], s[3], BALL_R + RAIL, 0.78)) { note('wall'); }
    }
    for (const p of hl.bumpers) {
      if (collideCircle(b, p.x, p.y, BALL_R + p.r, 1.05)) note('wall');
    }
    if (hl.mill) {
      const m = hl.mill, a = millAngle(m, t);
      const ux = Math.cos(a) * m.arm, uy = Math.sin(a) * m.arm;
      const mv = { cx: m.x, cy: m.y, w: m.w };
      if (collideSeg(b, m.x - ux, m.y - uy, m.x + ux, m.y + uy, BALL_R + RAIL, 0.6, mv)) note('wall');
      if (collideCircle(b, m.x, m.y, BALL_R + 2.6, 0.6)) note('wall');
    }
  }
  if (ev === 'wall') touched = true;

  sp = Math.hypot(b.vx, b.vy);
  if (sp > V_MAX) { b.vx *= V_MAX / sp; b.vy *= V_MAX / sp; sp = V_MAX; }

  // Cup.
  const d2 = Math.hypot(hl.cup.x - b.x, hl.cup.y - b.y);
  if (d2 < CUP_R && sp < 100) {
    b.sink = true;
    b.moving = false;
    b.vx = b.vy = 0;
    return 'sink';
  }

  // Water.
  for (const w of hl.water) {
    if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
      b.moving = false;
      b.vx = b.vy = 0;
      return 'water';
    }
  }

  // Teleports (both ends work). A ball that has just jumped, or rests on a
  // pad, stays locked until it rolls clear of every pad.
  if (hl.tele.length) {
    let on = false;
    for (const tp of hl.tele) {
      for (const [from, to] of [[tp.a, tp.b], [tp.b, tp.a]]) {
        if (on) break;
        if (Math.hypot(b.x - from.x, b.y - from.y) < tp.r) {
          on = true;
          if (!b.lock) {
            b.x = to.x;
            b.y = to.y;
            b.vx *= 0.7;
            b.vy *= 0.7;
            b.lock = true;
            note('tele');
          }
        }
      }
    }
    if (!on) b.lock = false;
  }

  // Safety net: outside the course or inside an island.
  if (!inPoly(hl.poly, b.x, b.y) || hl.islands.some(p => inPoly(p, b.x, b.y))) {
    b.moving = false;
    b.vx = b.vy = 0;
    return 'out';
  }

  // Come to rest (a slope that is steep enough keeps a slow ball rolling).
  sp = Math.hypot(b.vx, b.vy);
  if (sp < 4 && (slope < 21 || touched)) {
    b.vx = b.vy = 0;
    b.moving = false;
    note('stop');
  }
  return ev;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);

function scoreWord(strokes, par) {
  if (strokes === 1) return 'Hole in one!';
  const d = strokes - par;
  if (d <= -3) return 'Albatross!';
  if (d === -2) return 'Eagle!';
  if (d === -1) return 'Birdie!';
  if (d === 0) return 'Par';
  if (d === 1) return 'Bogey';
  if (d === 2) return 'Double bogey';
  return `+${d}`;
}

function cleanScores(v) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 9).map(n => (isNum(n) && n >= 1 && n <= 30 ? Math.round(n) : null));
}

// --- the game ------------------------------------------------------------

export default {
  id: 'minigolf',
  name: 'Mini Golf',
  emoji: '⛳',
  blurb: 'Nine holes, all playing together. Friends’ balls roll as ghosts. Fewest strokes wins.',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;padding:12px;';
    api.el.append(canvas, overlay);
    const ctx = canvas.getContext('2d');

    let best = api.store.get('best', 0);   // best total (lowest), 0 = none yet
    let round = 0, holeIdx = -1, hole = null, startedAt = 0;
    let ball = newBall(0, 0);
    let strokes = 0, done = false, doneAt = 0, lastPos = { x: 0, y: 0 };
    let sc = [];                           // my strokes per hole
    let sinkT = 0, resolveAt = 0;
    let aim = -Math.PI / 2, drag = null, charge = null;
    let totalPutts = api.store.get('putts', 0);
    const keys = { left: false, right: false, slow: false };
    const ghosts = new Map();
    const floaters = [];
    const splashes = [];
    let finalHandled = false, winPlayed = false;
    let lastBounce = 0, lastPub = 0, pubSig = '';
    let w = 0, h = 0, dpr = 1, lay = { sc: 1, ox: 0, oy: 0 }, inset = { top: 0, bottom: 0 };
    let layerCache = null;
    let raf = 0, last = performance.now(), acc = 0, clock = 0, lastOwnerTick = 0;
    let cardSig = '', statusEl = null, againBtn = null;

    function members() { return api.players().slice(0, MAX_PLAYERS); }
    function spectating() {
      const i = api.players().findIndex(p => p.me);
      return i >= MAX_PLAYERS;
    }

    // --- layout ---------------------------------------------------------
    // The current hole's box plus a margin, so small holes are drawn larger.
    function bounds() {
      if (!hole) return { x0: 0, y0: 0, x1: W, y1: H };
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (const [x, y] of hole.poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return { x0: x0 - 6, y0: y0 - 6, x1: x1 + 6, y1: y1 + 6 };
    }
    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      const top = inset.top + 46;
      const bottom = h - inset.bottom - 36;
      const availH = Math.max(80, bottom - top);
      const bd = bounds();
      const bw = bd.x1 - bd.x0, bh = bd.y1 - bd.y0;
      const s = Math.max(0.5, Math.min((w - 12) / bw, availH / bh));
      lay = { sc: s, ox: (w - bw * s) / 2 - bd.x0 * s, oy: top + (availH - bh * s) / 2 - bd.y0 * s };
      layerCache = null;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    const toWorld = (px, py) => ({ x: (px - lay.ox) / lay.sc, y: (py - lay.oy) / lay.sc });
    function useCourse(g, scale) {
      g.setTransform(dpr * lay.sc * scale, 0, 0, dpr * lay.sc * scale, dpr * lay.ox, dpr * lay.oy);
    }

    // --- session sync -----------------------------------------------------
    function validShared(sh) {
      return sh && Number.isInteger(sh.round) && sh.round >= 1 && Number.isInteger(sh.hole) && sh.hole >= 0 && sh.hole <= 9 && isNum(sh.startedAt);
    }

    function enterHole(sh) {
      if (sh.round !== round) { sc = []; finalHandled = false; winPlayed = false; }
      round = sh.round;
      // Holes I didn't finish (late join, or timed out) count as par + 3.
      for (let i = 0; i < Math.min(sh.hole, 9); i++) {
        if (!isNum(sc[i])) sc[i] = HOLES[i].par + 3;
      }
      holeIdx = sh.hole;
      startedAt = sh.startedAt;
      ghosts.clear();
      floaters.length = 0;
      splashes.length = 0;
      drag = null;
      charge = null;
      layerCache = null;
      if (holeIdx < 9) {
        hole = HOLES[holeIdx];
        resize();
        ball = newBall(hole.tee.x, hole.tee.y);
        lastPos = { x: hole.tee.x, y: hole.tee.y };
        strokes = 0;
        done = false;
        doneAt = 0;
        sinkT = 0;
        resolveAt = 0;
        aim = Math.atan2(hole.cup.y - hole.tee.y, hole.cup.x - hole.tee.x);
        api.setState({ r: round, h: holeIdx, x: hole.tee.x, y: hole.tee.y, s: 0, d: 0, sc: sc.slice() });
      } else {
        hole = null;
        api.setState({ r: round, h: 9, d: 0, sc: sc.slice() });
        if (!finalHandled) {
          finalHandled = true;
          const total = sc.reduce((a, v) => a + (isNum(v) ? v : 0), 0);
          if (total > 0 && (!best || total < best)) {
            best = total;
            api.store.set('best', best);
          }
        }
      }
      cardSig = '';
    }

    function sync() {
      const sh = api.shared();
      if (!validShared(sh)) {
        if (api.isOwner()) api.setShared({ round: 1, hole: 0, startedAt: Date.now() + 2800 });
        return;
      }
      if (sh.round !== round || sh.hole !== holeIdx) enterHole(sh);
      startedAt = sh.startedAt;
    }

    // The owner moves everyone on when the hole is over.
    function ownerTick() {
      const sh = api.shared();
      if (!api.isOwner() || !validShared(sh) || sh.hole >= 9) return;
      const now = Date.now();
      if (now < sh.startedAt) return;
      const mem = members();
      let allDone = true, first = 0, lastDone = 0;
      for (const m of mem) {
        const s = m.state || {};
        const ok = s.r === sh.round && s.h === sh.hole && isNum(s.d) && s.d > 0;
        if (ok) {
          first = first ? Math.min(first, s.d) : s.d;
          lastDone = Math.max(lastDone, s.d);
        } else {
          allDone = false;
        }
      }
      if ((allDone && now > lastDone + 1500) || (first && now > first + FIRST_GRACE)) {
        const next = sh.hole + 1;
        api.setShared({ round: sh.round, hole: next, startedAt: now + (next < 9 ? INTERLUDE : 0) });
      }
    }

    // --- my ball -----------------------------------------------------------
    function canPutt() {
      return holeIdx >= 0 && holeIdx < 9 && !ball.moving && !ball.sink && !done && Date.now() >= startedAt && !spectating();
    }

    function putt(angle, power) {
      if (!canPutt()) return;
      power = clamp(power, 0.04, 1);
      const v = V_MIN + power * (V_MAX - V_MIN);
      lastPos = { x: ball.x, y: ball.y };
      ball.vx = Math.cos(angle) * v;
      ball.vy = Math.sin(angle) * v;
      ball.moving = true;
      strokes++;
      totalPutts++;
      api.store.set('putts', totalPutts);
      api.sfx('pop');
      api.send('putt', { h: holeIdx, x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
      publish(true);
    }

    function publish(force) {
      const now = performance.now();
      if (!force && now - lastPub < 100) return;
      const sig = `${Math.round(ball.x * 10)},${Math.round(ball.y * 10)},${strokes}`;
      if (!force && sig === pubSig) return;
      lastPub = now;
      pubSig = sig;
      api.setState({ x: Math.round(ball.x * 10) / 10, y: Math.round(ball.y * 10) / 10, s: strokes });
    }

    function finishHole(count) {
      done = true;
      doneAt = Date.now();
      strokes = count;
      sc[holeIdx] = count;
      api.setState({ d: doneAt, s: count, sc: sc.slice(), x: hole.cup.x, y: hole.cup.y });
      cardSig = '';
    }

    function onEvent(ev) {
      if (ev === 'sink') {
        sinkT = 0;
        resolveAt = clock + 0.55;
        api.sfx('score');
        floaters.push({ text: scoreWord(strokes, hole.par), x: hole.cup.x, y: hole.cup.y - 8, t: 0, color: '#ffd43b' });
      } else if (ev === 'water') {
        api.sfx('miss');
        splashes.push({ x: ball.x, y: ball.y, t: 0 });
        strokes++;
        floaters.push({ text: 'Splash! +1', x: ball.x, y: ball.y - 6, t: 0, color: '#74c0fc' });
        ball.x = lastPos.x;
        ball.y = lastPos.y;
        publish(true);
        afterRest();
      } else if (ev === 'out') {
        ball.x = lastPos.x;
        ball.y = lastPos.y;
        publish(true);
        afterRest();
      } else if (ev === 'tele') {
        api.sfx('zap');
      } else if (ev === 'stop') {
        publish(true);
        afterRest();
      } else if (ev === 'wall') {
        if (clock - lastBounce > 0.07) { api.sfx('bounce'); lastBounce = clock; }
      }
    }

    function afterRest() {
      aim = Math.atan2(hole.cup.y - ball.y, hole.cup.x - ball.x);
      if (strokes >= MAX_STROKES && !ball.sink) {
        api.toast('Pick up! Too many strokes.');
        finishHole(strokes + 1);
      }
    }

    // --- input -------------------------------------------------------------
    function pt(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function onDown(e) {
      if (!canPutt()) return;
      canvas.setPointerCapture?.(e.pointerId);
      const p = pt(e);
      drag = { x: p.x, y: p.y, cx: p.x, cy: p.y };
    }
    function onMove(e) {
      if (!drag) return;
      const p = pt(e);
      drag.cx = p.x;
      drag.cy = p.y;
    }
    function onUp(e) {
      if (!drag) return;
      const p = pt(e);
      drag.cx = p.x;
      drag.cy = p.y;
      const d = dragVector();
      drag = null;
      if (d && d.power > 0.06) putt(d.angle, d.power);
    }
    // Pulling back from the start point: the ball goes the opposite way.
    function dragVector() {
      if (!drag) return null;
      const dx = drag.x - drag.cx, dy = drag.y - drag.cy;
      const len = Math.hypot(dx, dy) / lay.sc;
      if (len < 2) return null;
      return { angle: Math.atan2(dy, dx), power: Math.min(1, len / MAX_PULL) };
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', () => { drag = null; });

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const down = e.type === 'keydown';
      if (e.code === 'ArrowLeft') { keys.left = down; e.preventDefault(); }
      else if (e.code === 'ArrowRight') { keys.right = down; e.preventDefault(); }
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.slow = down;
      else if (e.code === 'Space') {
        e.preventDefault();
        if (down && !charge && !e.repeat && canPutt()) charge = { p: 0.08, dir: 1 };
        if (!down && charge) { putt(aim, charge.p); charge = null; }
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // --- ghosts --------------------------------------------------------------
    function ghostFor(p) {
      let g = ghosts.get(p.id);
      if (!g) {
        const s = p.state || {};
        const x = isNum(s.x) ? clamp(s.x, 0, W) : hole.tee.x;
        const y = isNum(s.y) ? clamp(s.y, 0, H) : hole.tee.y;
        g = { b: newBall(x, y), sim: false, tx: x, ty: y, name: p.name, color: p.color, s: 0, done: false, gone: false };
        ghosts.set(p.id, g);
      }
      return g;
    }

    function updateGhostTargets() {
      if (!hole) return;
      const seen = new Set();
      for (const p of members()) {
        if (p.me) continue;
        const s = p.state || {};
        if (s.r !== round || s.h !== holeIdx) continue;
        seen.add(p.id);
        const g = ghostFor(p);
        g.name = p.name;
        g.color = p.color;
        if (isNum(s.x) && isNum(s.y)) { g.tx = clamp(s.x, 0, W); g.ty = clamp(s.y, 0, H); }
        g.s = isNum(s.s) ? s.s : 0;
        g.done = isNum(s.d) && s.d > 0;
        if (g.done) { g.sim = false; g.b.moving = false; }
      }
      for (const id of [...ghosts.keys()]) if (!seen.has(id)) ghosts.delete(id);
    }

    api.on('putt', (d, from) => {
      if (!hole || !d || typeof d !== 'object') return;
      const p = members().find(m => m.id === from && !m.me);
      if (!p) return;
      if (d.h !== holeIdx || !isNum(d.x) || !isNum(d.y) || !isNum(d.vx) || !isNum(d.vy)) return;
      if (Math.abs(d.vx) > 220 || Math.abs(d.vy) > 220) return;
      const g = ghostFor(p);
      g.b = newBall(clamp(d.x, 0, W), clamp(d.y, 0, H));
      g.b.vx = d.vx;
      g.b.vy = d.vy;
      g.b.moving = true;
      g.sim = true;
      g.simT = 0;
      g.gone = false;
    });

    // --- loop --------------------------------------------------------------
    function holeClock() { return (Date.now() - startedAt) / 1000; }

    function update(dt) {
      if (keys.left || keys.right) {
        aim += ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * dt * (keys.slow ? 0.5 : 1.8);
      }
      if (charge) {
        charge.p += charge.dir * dt * 1.1;
        if (charge.p > 1) { charge.p = 1; charge.dir = -1; }
        if (charge.p < 0.08) { charge.p = 0.08; charge.dir = 1; }
      }
      if (hole) {
        updateGhostTargets();
        acc += dt;
        const t0 = holeClock() - acc;
        let k = 0;
        while (acc >= STEP) {
          acc -= STEP;
          k++;
          const t = t0 + k * STEP;
          if (ball.moving) onEvent(stepBall(hole, ball, t));
          for (const g of ghosts.values()) {
            if (!g.sim) continue;
            const ev = stepBall(hole, g.b, t);
            g.simT += STEP;
            if (ev === 'sink') { g.sim = false; g.gone = true; }
            else if (ev === 'water' || ev === 'out') { g.sim = false; g.b.x = g.tx; g.b.y = g.ty; }
            else if (ev === 'stop' || g.simT > 14) { g.sim = false; g.b.moving = false; }
          }
        }
        // Idle ghosts ease toward the position they last reported.
        for (const g of ghosts.values()) {
          if (g.sim) continue;
          const f = Math.min(1, dt * 10);
          g.b.x += (g.tx - g.b.x) * f;
          g.b.y += (g.ty - g.b.y) * f;
        }
        if (ball.sink) {
          sinkT += dt;
          if (resolveAt && clock >= resolveAt && !done) finishHole(strokes);
        } else if (ball.moving) {
          publish(false);
        }
      }
      for (let i = floaters.length - 1; i >= 0; i--) if ((floaters[i].t += dt) > 1.6) floaters.splice(i, 1);
      for (let i = splashes.length - 1; i >= 0; i--) if ((splashes[i].t += dt) > 0.8) splashes.splice(i, 1);
    }

    // --- static layer ----------------------------------------------------------
    function polyPath(g, pts) {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
    }
    function railPath(g, pts, closed) {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (closed) g.closePath();
    }
    function strokeRail(g, pts, closed) {
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.strokeStyle = '#4a2c12';
      g.lineWidth = RAIL * 2 + 0.8;
      railPath(g, pts, closed);
      g.stroke();
      g.strokeStyle = '#a8692f';
      g.lineWidth = RAIL * 2;
      railPath(g, pts, closed);
      g.stroke();
      g.strokeStyle = '#e0a561';
      g.lineWidth = RAIL * 1.1;
      railPath(g, pts, closed);
      g.stroke();
    }

    function buildLayer() {
      const c = document.createElement('canvas');
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext('2d');
      useCourse(g, 1);
      const hl = hole;

      // Ground around the hole.
      g.fillStyle = 'rgba(14,52,36,0.92)';
      const bd = bounds();
      g.beginPath();
      g.roundRect(bd.x0, bd.y0, bd.x1 - bd.x0, bd.y1 - bd.y0, 6);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.lineWidth = 0.6;
      g.stroke();

      // Turf.
      g.save();
      polyPath(g, hl.poly);
      g.clip();
      const art = api.img('golf-grass');
      let filled = false;
      if (art) {
        try {
          const pat = g.createPattern(art, 'repeat');
          pat.setTransform(new DOMMatrix().scale(28 / art.width));
          g.fillStyle = pat;
          g.fillRect(0, 0, W, H);
          filled = true;
        } catch { /* fall back to stripes */ }
      }
      if (!filled) {
        for (let x = 0; x < W; x += 8) {
          g.fillStyle = (x / 8) % 2 ? '#43c964' : '#37b957';
          g.fillRect(x, 0, 8.5, H);
        }
        g.fillStyle = 'rgba(255,255,255,0.05)';
        for (let y = 4; y < H; y += 12) g.fillRect(0, y, W, 0.6);
      }
      // Sand, water, slopes inside the clip.
      for (const s of hl.sand) {
        const gr = g.createRadialGradient(s.x - s.rx * 0.3, s.y - s.ry * 0.3, 1, s.x, s.y, s.rx);
        gr.addColorStop(0, '#fbe8a6');
        gr.addColorStop(1, '#e6c36a');
        g.fillStyle = gr;
        g.beginPath();
        g.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#c99a3c';
        g.lineWidth = 0.6;
        g.stroke();
        g.fillStyle = 'rgba(160,110,30,0.35)';
        for (let i = 0; i < 18; i++) {
          const a = i * 2.4, rr = (i % 5) / 5;
          g.fillRect(s.x + Math.cos(a) * s.rx * 0.8 * rr, s.y + Math.sin(a) * s.ry * 0.8 * rr, 0.7, 0.7);
        }
      }
      for (const z of hl.slopes) {
        g.fillStyle = 'rgba(255,214,59,0.16)';
        g.fillRect(z.x, z.y, z.w, z.h);
        g.strokeStyle = 'rgba(255,255,255,0.55)';
        g.lineWidth = 1.2;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        const dir = Math.sign(z.fx) || 1;
        for (let yy = z.y + 7; yy < z.y + z.h; yy += 13) {
          for (let xx = z.x + 12; xx < z.x + z.w - 6; xx += 18) {
            g.beginPath();
            g.moveTo(xx - dir * 4, yy - 3);
            g.lineTo(xx + dir * 3, yy);
            g.lineTo(xx - dir * 4, yy + 3);
            g.stroke();
          }
        }
      }
      for (const wt of hl.water) {
        const gr = g.createLinearGradient(wt.x, wt.y, wt.x, wt.y + wt.h);
        gr.addColorStop(0, '#5cc8ff');
        gr.addColorStop(1, '#2a86d8');
        g.fillStyle = gr;
        g.fillRect(wt.x, wt.y, wt.w, wt.h);
        g.strokeStyle = '#1b5fa8';
        g.lineWidth = 1;
        g.strokeRect(wt.x, wt.y, wt.w, wt.h);
      }
      g.restore();

      // Islands are solid ground.
      for (const isl of hl.islands) {
        polyPath(g, isl);
        g.fillStyle = 'rgba(14,52,36,0.98)';
        g.fill();
        g.fillStyle = '#e8c84a';
        g.font = '900 9px ui-rounded, system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillText('★', (isl[0][0] + isl[2][0]) / 2, (isl[0][1] + isl[2][1]) / 2 + 3);
      }

      // Tee mats.
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.beginPath();
      g.roundRect(hl.tee.x - 6, hl.tee.y - 5, 12, 10, 3);
      g.fill();

      // Cup.
      g.fillStyle = '#10261a';
      g.beginPath();
      g.arc(hl.cup.x, hl.cup.y, CUP_R, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 0.5;
      g.stroke();

      // Rails.
      for (const wl of hl.walls || []) {
        const closed = wl.length > 2 && wl[0][0] === wl[wl.length - 1][0] && wl[0][1] === wl[wl.length - 1][1];
        strokeRail(g, closed ? wl.slice(0, -1) : wl, closed);
      }
      strokeRail(g, hl.poly, true);

      // Bumpers.
      hl.bumpers.forEach((p, i) => {
        const col = COLORS[i % COLORS.length];
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.arc(p.x + 0.8, p.y + 1.2, p.r, 0, Math.PI * 2);
        g.fill();
        const gr = g.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.1, p.x, p.y, p.r);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(0.35, col);
        gr.addColorStop(1, '#5a2a6e');
        g.fillStyle = gr;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#fff';
        g.lineWidth = 0.9;
        g.beginPath();
        g.arc(p.x, p.y, p.r * 0.62, 0, Math.PI * 2);
        g.stroke();
      });
      return { canvas: c, hole: holeIdx, art, w, h };
    }

    // --- drawing -----------------------------------------------------------
    function drawBall(g, x, y, color, alpha, scale) {
      g.save();
      g.globalAlpha = alpha;
      const r = BALL_R * scale;
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.beginPath();
      g.ellipse(x + 0.6, y + 0.9, r, r * 0.8, 0, 0, Math.PI * 2);
      g.fill();
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.55, color);
      gr.addColorStop(1, '#222');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 0.4;
      g.stroke();
      g.restore();
    }

    function label(text, x, y, color, size, align) {
      ctx.font = `900 ${size}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = align || 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.fillStyle = color;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }

    function drawMill(t) {
      const m = hole.mill;
      const a = millAngle(m, t);
      const g = ctx;
      g.save();
      g.translate(m.x, m.y);
      g.rotate(a);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.roundRect(-m.arm - RAIL + 0.8, -RAIL + 1.2, (m.arm + RAIL) * 2, RAIL * 2, RAIL);
      g.fill();
      for (let i = 0; i < 2; i++) {
        g.save();
        g.scale(i ? -1 : 1, 1);
        const gr = g.createLinearGradient(0, -RAIL, 0, RAIL);
        gr.addColorStop(0, '#ff8fb8');
        gr.addColorStop(1, '#e02e72');
        g.fillStyle = gr;
        g.beginPath();
        g.roundRect(0, -RAIL, m.arm + RAIL, RAIL * 2, RAIL);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let x = 4; x < m.arm - 1; x += 6) g.fillRect(x, -RAIL, 2.4, RAIL * 2);
        g.restore();
      }
      g.restore();
      const gr = g.createRadialGradient(m.x - 1, m.y - 1, 0.4, m.x, m.y, 2.8);
      gr.addColorStop(0, '#fff3b0');
      gr.addColorStop(1, '#e8a317');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(m.x, m.y, 2.6, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#8a5a00';
      g.lineWidth = 0.5;
      g.stroke();
    }

    function drawTele(t) {
      hole.tele.forEach(tp => {
        [tp.a, tp.b].forEach((p, i) => {
          const col = i ? '#ff5fa2' : '#3fe0d0';
          const gr = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, tp.r);
          gr.addColorStop(0, '#1a0a33');
          gr.addColorStop(0.7, '#5a2a9e');
          gr.addColorStop(1, col);
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(p.x, p.y, tp.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 0.7;
          for (let k = 0; k < 3; k++) {
            const a0 = t * 3 + (k * Math.PI * 2) / 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, tp.r * 0.62, a0, a0 + 1.2);
            ctx.stroke();
          }
        });
      });
    }

    function drawFlag(nearBall) {
      const c = hole.cup;
      ctx.save();
      ctx.globalAlpha = nearBall ? 0.3 : 1;
      ctx.strokeStyle = '#f5f5f5';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x, c.y - 17);
      ctx.stroke();
      ctx.fillStyle = '#ff3d71';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 17);
      ctx.lineTo(c.x + 9, c.y - 13.5);
      ctx.lineTo(c.x, c.y - 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function playerRows() {
      return members().map(p => {
        const s = p.state || {};
        const arr = p.me ? sc : cleanScores(s.sc);
        return { p, arr, s };
      });
    }

    function drawHud() {
      const now = Date.now();
      const top = inset.top + 22;
      if (holeIdx >= 0 && holeIdx < 9) {
        label(`Hole ${holeIdx + 1}/9 · Par ${hole.par}`, 14, top, '#fff', 17, 'left');
        label(spectating() ? 'Watching' : `Strokes ${strokes}`, w - 14, top, '#ffd43b', 17, 'right');
        let x = 14;
        const y = top + 20;
        ctx.font = '800 12px ui-rounded, system-ui, sans-serif';
        for (const { p, s } of playerRows()) {
          if (p.me) continue;
          const here = s.r === round && s.h === holeIdx;
          const txt = `${p.name} ${here ? (s.d > 0 ? `${s.s}✓` : (s.s || 0)) : '…'}`;
          const tw = ctx.measureText(txt).width + 6;
          if (x + tw > w - 10) break;
          label(txt, x, y, p.color || '#fff', 12, 'left');
          x += tw + 8;
        }
        // Power bar while aiming.
        const d = dragVector();
        const power = charge ? charge.p : d ? d.power : null;
        const bw = Math.min(240, w - 40), bx = (w - bw) / 2, by = h - inset.bottom - 26;
        if (power != null) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, 14, 7);
          ctx.fill();
          const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
          gr.addColorStop(0, '#69db7c');
          gr.addColorStop(0.6, '#ffd43b');
          gr.addColorStop(1, '#ff4d6d');
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.roundRect(bx + 2, by + 2, Math.max(8, (bw - 4) * power), 10, 5);
          ctx.fill();
        } else if (canPutt() && strokes === 0 && holeIdx === 0) {
          label('Pull back to aim: the arrow follows your finger. Let go to putt', w / 2, by + 11, '#fff', 12, 'center');
        } else if (now < startedAt) {
          label('Get ready…', w / 2, by + 11, '#fff', 14, 'center');
        }
      }
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!hole) {
        const gr = ctx.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(20,10,40,0.85)');
        gr.addColorStop(1, 'rgba(10,50,40,0.85)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, w, h);
        return;
      }
      if (!layerCache || layerCache.hole !== holeIdx || layerCache.w !== w || layerCache.h !== h || layerCache.art !== api.img('golf-grass')) layerCache = buildLayer();
      ctx.fillStyle = 'rgba(12,28,30,0.55)';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(layerCache.canvas, 0, 0, w, h);

      const t = holeClock();
      useCourse(ctx, 1);
      // Water shimmer.
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 0.5;
      for (const wt of hole.water) {
        for (let i = 0; i < 6; i++) {
          const yy = wt.y + ((i + 0.5) * wt.h) / 6;
          const off = Math.sin(t * 1.6 + i * 1.7) * 3;
          ctx.beginPath();
          ctx.moveTo(wt.x + 4 + off + 6, yy);
          ctx.lineTo(Math.min(wt.x + wt.w - 4, wt.x + 18 + off + 6), yy);
          ctx.stroke();
        }
      }
      if (hole.tele.length) drawTele(t);
      if (hole.mill) drawMill(t);

      // Splashes.
      for (const s of splashes) {
        ctx.strokeStyle = `rgba(255,255,255,${1 - s.t / 0.8})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2 + s.t * 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Aim guide: an arrow from behind the ball pointing at it, like a cue.
      // Its tail is where the finger has pulled to (it follows the finger,
      // capped at full power) and its length is the power; the ball goes the
      // way it points. Before a pull it shows the aim, short and faint.
      const showAim = canPutt() && !ball.moving;
      if (showAim) {
        const d = dragVector();
        const ang = d ? d.angle : aim;
        const pw = charge ? charge.p : d ? d.power : null;
        const cx = Math.cos(ang), cy = Math.sin(ang);
        const head = 3.2;                      // stop just short of the ball
        // The tail sits exactly as far behind the ball as the finger has pulled.
        const back = Math.max(head + 6, pw == null ? 15 : pw * MAX_PULL);
        const tx = ball.x - cx * back, ty = ball.y - cy * back;
        const hx = ball.x - cx * head, hy = ball.y - cy * head;
        const col = pw == null ? 'rgba(255,255,255,0.5)' : '#fff';
        ctx.save();
        ctx.lineCap = 'round';
        // Shaft, thicker and warmer the harder the putt.
        ctx.strokeStyle = pw == null ? col : `hsl(${50 - pw * 50}, 100%, ${70 - pw * 15}%)`;
        ctx.lineWidth = pw == null ? 1.2 : 1.4 + pw * 1.4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx - cx * 2.5, hy - cy * 2.5);
        ctx.stroke();
        // Head, touching the ball.
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - cx * 4 + -cy * 2.6, hy - cy * 4 + cx * 2.6);
        ctx.lineTo(hx - cx * 4 - -cy * 2.6, hy - cy * 4 - cx * 2.6);
        ctx.closePath();
        ctx.fill();
        // A short, faint dotted line on from the ball shows where it will go.
        ctx.setLineDash([1.2, 2.4]);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(ball.x + cx * 4, ball.y + cy * 4);
        ctx.lineTo(ball.x + cx * 16, ball.y + cy * 16);
        ctx.stroke();
        ctx.restore();
      }

      // Ghosts.
      for (const g of ghosts.values()) {
        if (g.gone || g.done) continue;
        drawBall(ctx, g.b.x, g.b.y, g.color || '#fff', 0.5, 1);
      }
      // My ball (shrinks into the cup when sinking).
      const myColor = api.me.color || '#fff';
      if (ball.sink) {
        const k = Math.min(1, sinkT / 0.5);
        drawBall(ctx, ball.x + (hole.cup.x - ball.x) * k, ball.y + (hole.cup.y - ball.y) * k, myColor, 1 - k * 0.4, 1 - k * 0.85);
      } else if (!done) {
        drawBall(ctx, ball.x, ball.y, myColor, 1, 1);
      }
      drawFlag(!done && Math.hypot(ball.x - hole.cup.x, ball.y - hole.cup.y) < 10);

      // Names over ghosts (screen space for crisp text).
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const g of ghosts.values()) {
        if (g.gone || g.done) continue;
        ctx.globalAlpha = 0.85;
        label(g.name, lay.ox + g.b.x * lay.sc, lay.oy + (g.b.y - 5) * lay.sc - 4, g.color || '#fff', 11, 'center');
        ctx.globalAlpha = 1;
      }
      for (const f of floaters) {
        ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6);
        label(f.text, lay.ox + f.x * lay.sc, lay.oy + (f.y - f.t * 6) * lay.sc, f.color, 20, 'center');
        ctx.globalAlpha = 1;
      }
      drawHud();
    }

    // --- cards (DOM) ---------------------------------------------------------
    function el(tag, css, text) {
      const e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (text != null) e.textContent = text;
      return e;
    }

    function totalOf(arr) {
      let t = 0;
      for (let i = 0; i < 9; i++) t += isNum(arr[i]) ? arr[i] : HOLES[i].par + 3;
      return t;
    }

    function buildCard(mode) {
      const rows = playerRows();
      const finalMode = mode === 'final';
      const shown = finalMode ? 9 : mode.hole + 1;
      const panel = el('div', 'pointer-events:auto;background:rgba(36,16,66,0.92);border:1px solid rgba(255,255,255,0.18);border-radius:18px;padding:12px 10px;color:#fff;max-width:100%;box-shadow:0 8px 30px rgba(0,0,0,0.5);text-align:center;font-weight:800;');
      let title;
      if (finalMode) title = 'Final scorecard';
      else title = `Hole ${mode.hole + 1} · ${HOLES[mode.hole].name} · Par ${HOLES[mode.hole].par}`;
      panel.append(el('div', 'font-size:1.05rem;font-weight:900;margin-bottom:6px;', title));

      if (finalMode) {
        const scored = rows.map(r => ({ ...r, total: totalOf(r.arr) })).sort((a, b) => a.total - b.total);
        const topScore = scored[0] ? scored[0].total : 0;
        const winners = scored.filter(r => r.total === topScore);
        const names = winners.map(r => r.p.name).join(' & ');
        panel.append(el('div', 'font-size:1.2rem;font-weight:900;color:#ffd43b;margin-bottom:6px;', scored.length > 1 ? (winners.length > 1 ? `Tie: ${names} (${topScore})` : `🏆 ${names} wins with ${topScore}!`) : `You finished with ${topScore}`));
        if (!winPlayed && winners.some(r => r.p.me)) { winPlayed = true; api.sfx('win'); }
      }

      const table = el('table', 'border-collapse:collapse;margin:0 auto;font-size:12px;');
      const head = el('tr');
      head.append(el('th', 'padding:2px 4px;text-align:left;', ''));
      for (let i = 0; i < 9; i++) {
        const cur = !finalMode && i === mode.hole;
        head.append(el('th', `padding:2px 3px;min-width:20px;${cur ? 'background:rgba(255,212,59,0.25);border-radius:6px;' : ''}`, String(i + 1)));
      }
      head.append(el('th', 'padding:2px 4px;', 'Tot'));
      table.append(head);
      const parRow = el('tr', 'opacity:0.7;');
      parRow.append(el('td', 'padding:2px 4px;text-align:left;', 'Par'));
      let parSum = 0;
      for (let i = 0; i < 9; i++) { parRow.append(el('td', 'padding:2px 3px;', String(HOLES[i].par))); parSum += HOLES[i].par; }
      parRow.append(el('td', 'padding:2px 4px;', String(parSum)));
      table.append(parRow);
      for (const r of rows) {
        const tr = el('tr', r.p.me ? 'background:rgba(255,255,255,0.08);' : '');
        const nameCell = el('td', `padding:3px 4px;text-align:left;max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${r.p.color || '#fff'};`, r.p.name);
        tr.append(nameCell);
        let sum = 0, any = false;
        for (let i = 0; i < 9; i++) {
          const v = r.arr[i];
          const cur = !finalMode && i === mode.hole;
          let txt = '–';
          if (isNum(v)) { txt = String(v); sum += v; any = true; } else if (i < shown) txt = '…';
          const under = isNum(v) && v <= HOLES[i].par - 1;
          tr.append(el('td', `padding:3px 3px;${cur ? 'background:rgba(255,212,59,0.18);' : ''}${under ? 'color:#69db7c;' : ''}`, txt));
        }
        tr.append(el('td', 'padding:3px 4px;font-weight:900;', any ? String(sum) : '–'));
        table.append(tr);
      }
      panel.append(table);

      if (finalMode) {
        const me = rows.find(r => r.p.me);
        const mine = me ? totalOf(me.arr) : 0;
        panel.append(el('div', 'margin-top:8px;font-size:12px;opacity:0.85;', `Your best round: ${best || '–'}${mine && best === mine ? ' (new record!)' : ''}`));
        const row = el('div', 'display:flex;gap:10px;justify-content:center;margin-top:10px;');
        againBtn = el('button', '', 'Play again');
        againBtn.className = 'btn';
        againBtn.addEventListener('click', () => {
          if (api.isOwner()) restart(); else api.send('again', {});
        });
        const leave = el('button', '', 'Leave');
        leave.className = 'btn ghost';
        leave.addEventListener('click', () => api.exit());
        row.append(againBtn, leave);
        panel.append(row);
        statusEl = null;
      } else {
        statusEl = el('div', 'margin-top:8px;font-size:13px;opacity:0.9;', '');
        panel.append(statusEl);
        againBtn = null;
      }
      return panel;
    }

    function restart() {
      const sh = api.shared();
      if (!validShared(sh) || sh.hole < 9) return;
      api.setShared({ round: sh.round + 1, hole: 0, startedAt: Date.now() + 2800 });
    }
    api.on('again', () => {
      if (api.isOwner()) restart();
    });

    function updateCard() {
      const now = Date.now();
      let mode = null;
      if (holeIdx === 9) mode = 'final';
      else if (holeIdx >= 0 && now < startedAt) mode = holeIdx === 0 ? { intro: true, hole: 0 } : { hole: holeIdx - 1, next: true };
      else if (done) mode = { hole: holeIdx, wait: true };
      if (!mode) {
        if (cardSig !== '') { overlay.replaceChildren(); cardSig = ''; }
        return;
      }
      const rows = playerRows();
      const sig = JSON.stringify([mode, holeIdx, rows.map(r => [r.p.id, r.p.name, r.arr, r.s.d])]);
      if (sig !== cardSig) {
        cardSig = sig;
        if (mode.intro) {
          const panel = el('div', 'background:rgba(36,16,66,0.88);border:1px solid rgba(255,255,255,0.18);border-radius:18px;padding:14px 22px;color:#fff;text-align:center;font-weight:900;');
          panel.append(el('div', 'font-size:0.9rem;opacity:0.8;', 'Hole 1 of 9'), el('div', 'font-size:1.6rem;', HOLES[0].name), el('div', 'font-size:1rem;color:#ffd43b;', `Par ${HOLES[0].par}`));
          statusEl = el('div', 'margin-top:6px;font-size:13px;opacity:0.9;', '');
          panel.append(statusEl);
          overlay.replaceChildren(panel);
        } else {
          overlay.replaceChildren(buildCard(mode));
        }
      }
      if (statusEl) {
        let txt = '';
        if (mode.next || mode.intro) txt = `Hole ${holeIdx + 1} starts in ${Math.max(0, Math.ceil((startedAt - now) / 1000))}…`;
        else if (mode.wait) txt = `You holed out in ${strokes}. Waiting for friends…`;
        if (statusEl.textContent !== txt) statusEl.textContent = txt;
      }
    }

    // --- waiting screen / main loop -------------------------------------------
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      clock += dt;
      sync();
      if (clock - lastOwnerTick > 0.25) { lastOwnerTick = clock; ownerTick(); }
      update(dt);
      render();
      updateCard();
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
      onPad(pad) {
        if (!canPutt()) { if (charge) charge = null; return; }
        if (Math.hypot(pad.x, pad.y) > 0.4) aim = Math.atan2(pad.y, pad.x);
        else if (pad.left) aim -= 0.03;
        else if (pad.right) aim += 0.03;
        const a = !!(pad.pressed && pad.pressed[0]);
        if (a && !charge) charge = { p: 0.08, dir: 1 };
        if (!a && charge) {
          putt(aim, charge.p);
          charge = null;
        }
      },
    };
  },
};

// Exposed for tests.
export const _physics = { HOLES, newBall, stepBall, STEP, CUP_R, scoreWord };
