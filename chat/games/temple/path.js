// Temple Dash: the seeded temple and the rules of a run. No DOM here, so the
// unit tests can run it in Node.
//
// The temple is a raised stone walkway made of straight segments joined by
// square corners where it turns 90 degrees left or right. A runner's place
// is `s`, metres run along the walkway's centre line from the start (it keeps
// counting across corners), `x`, metres right of the centre line (the lanes
// are at -LANE, 0 and +LANE), and `y`, height above the stones. Everyone in a
// session gets the same temple from the owner's seed: segments, obstacles and
// coins are generated lazily, in order, from one seeded random stream.
//
// Segment k: { k, S, L, D, dir, yaw, px, pz, cx, cz, obs, coins }
//   S        distance where it starts (the previous corner's centre)
//   D = S+L  distance of its corner's centre; the walkway goes on HW past it
//   dir      the corner turns +1 right or -1 left
//   yaw      heading index 0..3 (angle yaw * 90 degrees; forward = (cos, sin))
//   px, pz   start point in the world; cx, cz the corner centre
//   obs      [{ id, type, s, len, mask }] sorted by s; type root | fire | arch | gap
//   coins    [{ id, s, lane, y }] lane -1..1, y the coin's centre height

export const LANE = 1.6;              // metres between lane centres
export const HW = 2.7;                // half the walkway's width
export const V0 = 10;                 // starting speed, m/s
export const VMAX = 21;
export const RAMP = 2400;             // metres for the speed to rise most of the way
export const JUMP_T = 0.68;           // seconds in the air
export const JUMP_H = 1.35;           // metres at the top of a jump
export const SLIDE_T = 0.78;          // seconds low
export const LANE_T = 0.14;           // seconds to cross one lane
export const CHASE_T = 7;             // seconds the monkeys stay close after a stumble
export const STUMBLE_T = 0.55;        // seconds staggering after a stumble
export const COIN_Y = 0.75;           // coins on the ground float at this height
export const LATE = HW - 0.5;         // metres past a corner's centre a turn still counts
export const ROOT_H = 0.5;            // clear a root above this height
export const FIRE_H = 0.85;           // and the flames above this
export const RUNNER_R = 0.35;         // half the runner's depth along the path
export const START_BACK = 60;         // walkway drawn behind the start
const GRAV = (8 * JUMP_H) / (JUMP_T * JUMP_T);
const JUMP_V = (4 * JUMP_H) / JUMP_T;
const SLAM_V = 11;

export const CAUSES = ['', 'edge', 'gap', 'crash', 'caught'];
export const ACTS = ['run', 'air', 'slide', 'stumble', 'dead', 'ready'];   // ready: waiting for the countdown

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Small seeded PRNG (mulberry32).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Speed after running d metres (the same for everyone at the same distance,
// so other runners can be extrapolated from their distance alone).
export const speedAt = d => V0 + (VMAX - V0) * (1 - Math.exp(-Math.max(0, d) / RAMP));
// How far before a corner's centre a turn swipe counts (more at speed).
export const early = v => 5 + v * 0.5;
// A segment's turn window: [from, to] in distance.
export const turnWindow = (seg, v = speedAt(seg.D)) => [seg.D - early(v), seg.D + LATE];
export const laneX = lane => lane * LANE;
// Is a runner at x in any lane of the mask (bit 0 = left lane, 1 centre, 2 right)?
export function inMask(x, mask) {
  for (let l = 0; l < 3; l++) if (mask & (1 << l) && Math.abs(x - laneX(l - 1)) < LANE / 2 + 0.05) return true;
  return false;
}
export const FULL = 7;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export const heading = yaw => DIRS[((yaw % 4) + 4) % 4];

// A world point on segment `seg` at distance s, x metres right of centre.
export function pointAt(seg, s, x = 0) {
  const [hx, hz] = heading(seg.yaw);
  const a = s - seg.S;
  return { x: seg.px + hx * a - hz * x, z: seg.pz + hz * a + hx * x };
}

export function createTemple(seed) {
  const rnd = mulberry32(seed || 1);
  const segs = [];
  function gen() {
    const k = segs.length;
    const prev = segs[k - 1];
    const S = prev ? prev.D : 0;
    const yaw = prev ? (prev.yaw + prev.dir + 4) % 4 : 0;
    const px = prev ? prev.cx : 0, pz = prev ? prev.cz : 0;
    const L = k === 0 ? 130 : Math.round(78 + rnd() * 72);
    let dir = rnd() < 0.5 ? -1 : 1;
    // Never three turns the same way in a row (the walkway would loop back on itself).
    if (k >= 2 && segs[k - 1].dir === segs[k - 2].dir && dir === segs[k - 1].dir) dir = -dir;
    const [hx, hz] = heading(yaw);
    const seg = { k, S, L, D: S + L, dir, yaw, px, pz, cx: px + hx * L, cz: pz + hz * L, obs: [], coins: [] };
    // Obstacles, spaced by the time a runner needs between them, and none
    // near a corner (a clear run-up to the turn and a clear run-out).
    const end = seg.D - early(speedAt(seg.D)) - 12;
    let pos = k === 0 ? 40 : S + HW + 12;
    pos += rnd() * speedAt(pos) * 0.5;
    let i = 0;
    while (true) {
      const v = speedAt(pos);
      const f = clamp(pos / 3000, 0, 1);
      const weights = { root: 30, fire: 28, arch: 22, gap: pos < 160 ? 0 : 10 + 14 * f };
      let r = rnd() * (weights.root + weights.fire + weights.arch + weights.gap);
      let type = 'root';
      for (const t of ['root', 'fire', 'arch', 'gap']) { if ((r -= weights[t]) < 0) { type = t; break; } }
      if (k === 0 && i === 0) type = 'root';   // a gentle first one
      let len = 0.9, mask = FULL;
      if (type === 'fire') {
        len = 1.2;
        mask = rnd() < 0.6 - 0.25 * f ? 1 << Math.floor(rnd() * 3) : [3, 6, 5][Math.floor(rnd() * 3)];
      } else if (type === 'arch') len = 1.0;
      else if (type === 'gap') len = Math.round((2.2 + rnd() * 0.7 + f * 0.4) * 10) / 10;
      const at = Math.round(pos * 10) / 10;
      if (at + len > end) break;
      seg.obs.push({ id: `${k}.${i++}`, type, s: at, len, mask });
      pos += len + v * (1.2 + rnd() * 0.9) + (type === 'gap' ? 2 : 0);
    }
    // Coins: lines along a lane between obstacles, and arcs over some roots and gaps.
    let c = 0;
    const addCoin = (s, lane, y) => seg.coins.push({ id: `${k}.${c++}`, s: Math.round(s * 100) / 100, lane, y: Math.round(y * 100) / 100 });
    const half = o => (speedAt(o.s) * JUMP_T) / 2;
    const spans = [];
    let from = k === 0 ? 12 : S + HW + 4;
    for (const o of seg.obs) {
      spans.push([from, o.s - Math.max(2.5, half(o) * 0.7)]);
      from = o.s + o.len + Math.max(2.5, half(o) * 0.7);
    }
    spans.push([from, seg.D - HW - 2]);
    for (const [a, b] of spans) {
      if (b - a < 8 || rnd() > 0.62) continue;
      const lane = Math.floor(rnd() * 3) - 1;
      const n = Math.min(10, Math.floor((b - a) / 2.2) + 1);
      const s0 = a + rnd() * (b - a - (n - 1) * 2.2);
      for (let j = 0; j < n; j++) addCoin(s0 + j * 2.2, lane, COIN_Y);
    }
    for (const o of seg.obs) {
      if ((o.type !== 'root' && o.type !== 'gap') || rnd() > 0.45) continue;
      const lane = Math.floor(rnd() * 3) - 1, hf = half(o), mid = o.s + o.len / 2;
      for (const u of [-0.6, -0.3, 0, 0.3, 0.6]) addCoin(mid + u * hf, lane, COIN_Y + JUMP_H * (1 - u * u));
    }
    seg.coins.sort((p, q) => p.s - q.s);
    segs.push(seg);
  }
  return {
    seed,
    segs,
    seg(k) {
      while (segs.length <= k) gen();
      return segs[k];
    },
    // The segment a runner who has made every turn is on at distance d.
    segAt(d) {
      let k = 0;
      while (this.seg(k).D <= d && k < 100000) k++;
      return this.seg(k);
    },
  };
}

// What an obstacle does to a runner at (s, x, y), sliding or not:
// null, 'stumble' (a small trip), 'crash' or 'fall'.
export function collide(o, s, x, y, sliding) {
  if (o.type === 'gap') {
    const a = o.s + 0.3, b = o.s + o.len - 0.3;
    return s > a && s < b && y <= 0.02 ? 'fall' : null;
  }
  if (s + RUNNER_R < o.s || s - RUNNER_R > o.s + o.len) return null;
  if (o.type === 'root') return y < ROOT_H ? 'stumble' : null;
  if (o.type === 'fire') return inMask(x, o.mask) && y < FIRE_H ? 'stumble' : null;
  if (o.type === 'arch') return sliding && y < 0.1 ? null : 'crash';
  return null;
}

export function newRun(n = 0) {
  return {
    n, s: 0, x: 0, lane: 0, y: 0, vy: 0, air: false, slide: 0, g: 0, turned: -1,
    coins: 0, got: new Set(), hit: new Set(), chase: 0, stumble: 0, stumbles: 0,
    alive: true, cause: '', t: 0, deadT: 0, jumpBuf: 0, slideBuf: 0, maxY: 0, timeScale: 1,
  };
}
export const scoreOf = run => Math.floor(Math.max(0, run.s)) + run.coins * 10;
export const actOf = run => (!run.alive ? 4 : run.stumble > 0 ? 3 : run.air ? 1 : run.slide > 0 ? 2 : 0);

function die(run, cause, ev) {
  if (!run.alive) return;
  run.alive = false;
  run.cause = cause;
  run.deadT = 0;
  run.deadS = run.s;
  run.slide = 0;
  if (cause === 'edge' || cause === 'gap') run.vy = Math.min(run.vy, 0);
  if (cause === 'crash') { run.vy = 4; run.air = true; }
  ev.push({ type: 'dead', cause });
}

// A swipe or key left (-1) or right (+1): a turn inside the corner's window,
// otherwise a lane change.
export function side(run, temple, dir, ev = []) {
  if (!run.alive) return ev;
  const seg = temple.seg(run.g);
  const [a, b] = turnWindow(seg, speedAt(run.s));
  if (run.turned !== run.g && dir === seg.dir && run.s >= a && run.s <= b) {
    run.turned = run.g;
    ev.push({ type: 'turn', dir });
    if (run.s >= seg.D) finishTurn(run, temple, ev);
    return ev;
  }
  const lane = clamp(run.lane + dir, -1, 1);
  if (lane === run.lane) ev.push({ type: 'bump', dir });
  else { run.lane = lane; ev.push({ type: 'lane', lane }); }
  return ev;
}
function finishTurn(run, temple, ev) {
  const from = temple.seg(run.g);
  const a = pointAt(from, run.s, run.x);
  run.g++;
  run.turned = -1;
  const b = pointAt(temple.seg(run.g), run.s, run.x);
  ev.push({ type: 'turned', g: run.g, ox: a.x - b.x, oz: a.z - b.z });
}

// One step of a run. act: { side: -1 | 0 | 1, jump, slide } (presses this step).
// Returns the events: lane, bump, turn, turned, jump, slide, land, coin,
// stumble, dead.
export function stepRun(run, temple, act, dt) {
  const ev = [];
  if (!run.alive) {
    run.deadT += dt;
    if (run.cause === 'edge' || run.cause === 'gap') {
      run.vy -= GRAV * 0.8 * dt;
      run.y = Math.max(-40, run.y + run.vy * dt);
      if (run.cause === 'edge' && run.deadT < 0.5) run.s += speedAt(run.s) * 0.5 * dt * (1 - run.deadT * 2);
    } else if (run.cause === 'crash' && run.air) {
      run.vy -= GRAV * dt;
      run.y += run.vy * dt;
      run.s -= 2.5 * dt * Math.max(0, 1 - run.deadT);
      if (run.y <= 0) { run.y = 0; run.air = false; }
    }
    return ev;
  }
  run.t += dt;
  if (act?.side) side(run, temple, act.side, ev);
  if (act?.jump) { run.jumpBuf = 0.15; run.slideBuf = 0; }
  if (act?.slide) { run.slideBuf = 0.15; run.jumpBuf = 0; }
  if (run.jumpBuf > 0 && !run.air) {
    run.air = true;
    run.vy = JUMP_V;
    run.slide = 0;
    run.jumpBuf = 0;
    ev.push({ type: 'jump' });
  }
  if (run.slideBuf > 0) {
    if (run.air) {
      run.vy = Math.min(run.vy, -SLAM_V);  // down fast, then slide on landing
      run.slideBuf = Math.max(run.slideBuf, 0.05);
    } else {
      run.slide = SLIDE_T;
      run.slideBuf = 0;
      ev.push({ type: 'slide' });
    }
  }
  run.jumpBuf = Math.max(0, run.jumpBuf - dt);
  if (!run.air) run.slideBuf = Math.max(0, run.slideBuf - dt);
  // Moving.
  const v = speedAt(run.s) * (run.stumble > 0 ? 0.8 : 1);
  const prevS = run.s;
  run.s += v * dt;
  const tx = laneX(run.lane), step = (LANE / LANE_T) * dt;
  run.x = Math.abs(tx - run.x) <= step ? tx : run.x + Math.sign(tx - run.x) * step;
  if (run.air) {
    run.vy -= GRAV * dt;
    run.y += run.vy * dt;
    if (run.y <= 0) {
      run.y = 0;
      run.vy = 0;
      run.air = false;
      ev.push({ type: 'land' });
      if (run.slideBuf > 0) { run.slide = SLIDE_T; run.slideBuf = 0; ev.push({ type: 'slide' }); }
    }
  }
  run.maxY = Math.max(run.maxY, run.y);
  run.slide = Math.max(0, run.slide - dt);
  run.stumble = Math.max(0, run.stumble - dt);
  run.chase = Math.max(0, run.chase - dt / CHASE_T);
  // The corner.
  let seg = temple.seg(run.g);
  if (run.turned === run.g && run.s >= seg.D) {
    finishTurn(run, temple, ev);
    seg = temple.seg(run.g);
  } else if (run.turned !== run.g && run.s > seg.D + HW - 0.1 && run.y < 0.4) {
    die(run, 'edge', ev);
    return ev;
  }
  // Obstacles on this segment (and the end of the last one, just after a turn).
  for (const sg of run.g > 0 ? [temple.seg(run.g - 1), seg] : [seg]) {
    for (const o of sg.obs) {
      if (o.s > run.s + 1) break;
      if (run.hit.has(o.id) || o.s + o.len < prevS - 1) continue;
      if (sg !== seg && o.type === 'gap') continue;
      const r = collide(o, run.s, run.x, run.y, run.slide > 0);
      if (!r) continue;
      run.hit.add(o.id);
      if (r === 'fall') { die(run, 'gap', ev); return ev; }
      if (r === 'crash') { die(run, 'crash', ev); return ev; }
      run.stumbles++;
      if (run.chase > 0) {
        ev.push({ type: 'stumble', kind: o.type });
        die(run, 'caught', ev);
        return ev;
      }
      run.chase = 1;
      run.stumble = STUMBLE_T;
      ev.push({ type: 'stumble', kind: o.type });
    }
  }
  // Coins.
  const top = run.y + (run.slide > 0 ? 1.0 : 1.9);
  for (const c of seg.coins) {
    if (c.s > run.s + 0.9) break;
    if (c.s < run.s - 0.9 || run.got.has(c.id)) continue;
    if (Math.abs(laneX(c.lane) - run.x) < 0.8 && c.y > run.y - 0.3 && c.y < top) {
      run.got.add(c.id);
      run.coins++;
      ev.push({ type: 'coin', id: c.id });
    }
  }
  return ev;
}

// --- autopilot ---------------------------------------------------------------
// Reads the obstacles and corner ahead and presses what a player would, with
// a reaction delay and the occasional fumble. With react 0 and mistakes 0 it
// plays perfectly (the unit tests use that to show every temple is passable).
export function newBrain({ react = 0.3, mistakes = 0.04, rnd = Math.random, coins = true } = {}) {
  return { react, mistakes, rnd, coins, plans: new Map(), turnPlan: null, sideCd: 0 };
}

export function autopilot(run, temple, brain, dt) {
  const act = { side: 0, jump: false, slide: false };
  if (!run.alive) return act;
  brain.sideCd = Math.max(0, brain.sideCd - dt);
  const v = speedAt(run.s);
  const look = v * 1.6 + 8;
  const seg = temple.seg(run.g);
  const ahead = [];
  for (const sg of [seg, temple.seg(run.g + 1)]) {
    for (const o of sg.obs) {
      if (o.s + o.len < run.s - 0.5) continue;
      if (o.s > run.s + look) break;
      ahead.push(o);
    }
  }
  // Forget plans for obstacles behind.
  for (const [id, p] of brain.plans) if (p.o.s + p.o.len < run.s - 2) brain.plans.delete(id);
  const half = (v * JUMP_T) / 2;
  for (const o of ahead) {
    let p = brain.plans.get(o.id);
    if (!p) {
      p = { o, seen: run.t, fumble: brain.rnd() < brain.mistakes, done: false, kind: null, at: 0 };
      if (o.type === 'root' || o.type === 'gap') { p.kind = 'jump'; p.at = o.s + o.len / 2 - half; }
      else if (o.type === 'arch') { p.kind = 'slide'; p.at = o.s - v * SLIDE_T * 0.3; }
      else p.kind = 'fire';
      if (p.fumble) p.late = v * (0.3 + brain.rnd() * 0.25);
      brain.plans.set(o.id, p);
    }
    if (p.done || run.t < p.seen + brain.react) continue;
    if (p.kind === 'fire') {
      // Decide shortly before it: step aside to a free neighbouring lane, else jump.
      if (o.s - run.s > v * 0.5 + 2.5) continue;
      if (!inMask(laneX(run.lane), o.mask)) { p.done = true; continue; }
      const free = [run.lane - 1, run.lane + 1].filter(l => l >= -1 && l <= 1 && !(o.mask & (1 << (l + 1))));
      if (free.length && !p.fumble) {
        act.side = free[0] - run.lane;
        brain.sideCd = 0.4;
        p.done = true;
      } else {
        p.kind = 'jump';
        p.at = o.s + o.len / 2 - half;
      }
      continue;
    }
    const at = p.at + (p.late || 0);
    if (run.s >= at) {
      p.done = true;
      if (p.fumble && brain.rnd() < 0.4) continue;   // froze
      if (p.kind === 'jump') act.jump = true;
      else act.slide = true;
    }
  }
  // The corner.
  if (run.turned !== run.g) {
    const [a] = turnWindow(seg, v);
    if (!brain.turnPlan || brain.turnPlan.g !== run.g) {
      if (run.s > a - v * 2) brain.turnPlan = { g: run.g, seen: run.t, miss: brain.rnd() < brain.mistakes * 0.5, at: a + (brain.rnd() * 0.5 + 0.2) * (seg.D - a) };
    }
    const tp = brain.turnPlan;
    if (tp && tp.g === run.g && !tp.miss && run.t >= tp.seen + brain.react && run.s >= tp.at) act.side = seg.dir;
  }
  // Coins: drift towards a coin lane when nothing is close ahead.
  if (brain.coins && !act.side && brain.sideCd <= 0 && !run.air && run.slide <= 0 && !ahead.some(o => o.s - run.s < v * 1.3 + 8)) {
    const [a] = turnWindow(seg, v);
    if (run.s < a - 6) {
      const c = seg.coins.find(q => q.s > run.s + 4 && q.s < run.s + 22 && q.y < 1.2 && !run.got.has(q.id));
      if (c && c.lane !== run.lane) {
        act.side = Math.sign(c.lane - run.lane);
        brain.sideCd = 0.5;
      }
    }
  }
  return act;
}

// --- network state -------------------------------------------------------------
// Shared (from the owner): { seed, at } — the temple everyone runs and when
// the first run starts. Anything else is rejected.
export function parseShared(S) {
  if (!S || typeof S !== 'object') return null;
  if (!Number.isInteger(S.seed) || S.seed < 1 || S.seed > 0xffffffff) return null;
  if (!Number.isFinite(S.at) || S.at < 0) return null;
  return { seed: S.seed, at: S.at };
}

// My run as published (about ten times a second); waiting: still in the countdown.
export function packRun(run, seed, best, waiting = false) {
  return {
    sd: seed, n: run.n, g: run.g,
    d: Math.round(run.s * 10) / 10, x: Math.round(run.x * 100) / 100, y: Math.round(run.y * 100) / 100,
    a: waiting && run.alive ? 5 : actOf(run), c: run.coins, b: Math.round(best), k: CAUSES.indexOf(run.cause), ch: run.chase > 0 ? 1 : 0,
  };
}

// Another player's published run, checked. Returns null for anything malformed
// or for a different temple (seed), or a run on a segment that doesn't match
// its distance.
export function parseRunner(st, seed, temple = null) {
  if (!st || typeof st !== 'object') return null;
  const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  if (!int(st.sd, 1, 0xffffffff) || (seed != null && st.sd !== seed)) return null;
  if (!int(st.n, 0, 1e6) || !int(st.g, 0, 20000) || !num(st.d, -START_BACK, 2e5)) return null;
  if (!num(st.x, -LANE - 0.01, LANE + 0.01) || !num(st.y, -45, 5) || !int(st.a, 0, 5)) return null;
  if (!int(st.c, 0, 1e6) || !num(st.b, 0, 2e5) || !int(st.k, 0, 4) || !(st.ch === 0 || st.ch === 1)) return null;
  if (temple) {
    const seg = temple.seg(st.g);
    if (st.d < seg.S - 3 || st.d > seg.D + HW + 40) return null;
  }
  return { sd: st.sd, n: st.n, g: st.g, d: st.d, x: st.x, y: st.y, a: st.a, c: st.c, b: st.b, k: st.k, ch: st.ch };
}

// The 'fell' message: { n, d, k }.
export function parseFell(m) {
  if (!m || typeof m !== 'object') return null;
  if (!Number.isInteger(m.n) || m.n < 0 || m.n > 1e6) return null;
  if (typeof m.d !== 'number' || !Number.isFinite(m.d) || m.d < -START_BACK || m.d > 2e5) return null;
  if (!Number.isInteger(m.k) || m.k < 1 || m.k > 4) return null;
  return { n: m.n, d: m.d, k: m.k };
}
