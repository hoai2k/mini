// The amoeba's default control scheme, "Pseudopods and movement" (the owner,
// 2026-11-02, and the choosing on RT, 2026-11-03: "we won't auto select
// pseudopods after neutral but keep them defined. To change them we hold RT
// and then we see a glow at the base of the currently selected pseudopods. If
// any are currently moving they don't become editable until they rest at
// neutral first. When editable you can move their stick around and the glow
// will find a new base to use. The glow should move smoothly from its initial
// position and settle accurately, being easy to control.").
//
// Raw input here is main.js rawInput() after its trigger swap: `rt` is the
// physical LT (movement mode), `lt` the physical RT (choosing pseudopods).
//
//   Pseudopod mode: each stick keeps one pseudopod, RS "R" (key 'sel'), LS "L"
//     ('adj'). Pushed, the stick steers it; at neutral it rests (no longer
//     steered; it flows slowly back), still that stick's. Only when it is gone
//     (drawn in, eaten, merged) does the stick's next push take a default: the
//     pseudopod lying that way (within PICK_TOL), or a new one grown there.
//     LB thickens a steered pseudopod (broader and shorter: the thickness that
//     wins pushes, contact.js); with none steered it spreads the whole cell
//     (held on, it rounds up). RB pushes the steered one harder.
//   Movement mode (LT held): the sticks are movement intents (moveInput());
//     the pseudopods stay assigned and rest.
//   Choosing (RT held): the sticks steer nothing. A glow in the player's
//     colour, marked L and R, sits at the base of each stick's pseudopod. A
//     stick pushed when RT went down is busy: its glow is dim until the stick
//     rests at neutral, then it is editable. Pushed past GLOW_DEAD, it moves
//     its glow round the membrane toward the stick's direction: critically
//     damped (GLOW_W) from where it was, settling exactly; within SNAP of an
//     existing pseudopod's base it snaps to it (and lets go only past
//     SNAP_OUT: no flicker). L and R never take the same base: the other's is
//     skipped, the glow held SEP aside. Letting RT go commits: each moved glow
//     takes the pseudopod at its base, or grows a new one there (GROW_T s of
//     extension). A glow never moved keeps its pseudopod.
//
// Pure (no three.js, no DOM): select.test.mjs drives it with a soft body in node.
import { N } from '../shared/techniques/amoeba-softbody.js';
import { clamp } from './util.js';

export const DEG = Math.PI / 180;
export const MAX_STEERED = 8;
export const TRIG_ON = 0.5, TRIG_OFF = 0.3; // a trigger is on above 0.5, off below 0.3
export const STICK_ON = 0.3, STICK_OFF = 0.15; // a stick counts as pushed above 0.3, at rest below 0.15
export const PICK_TOL = 34 * DEG; // a default pick takes a pseudopod whose tip lies within this of the stick
export const GLOW = {
  dead: 0.25,      // stick deflection below this leaves the glow where it is aiming
  w: 13,           // rad/s: the glow's critically damped easing (settles in ~0.4 s)
  snap: 20 * DEG,  // an existing pseudopod's base within this of the stick: the glow snaps to it
  snapOut: 28 * DEG, // ... and lets go of it only when the stick is this far off (hysteresis)
  sep: 24 * DEG,   // L and R glows are kept at least this far apart
  growT: 0.8,      // s a pseudopod grown at a new base is pushed out on its own
};

const ringGap = (i, j) => { const d = Math.abs(i - j) % N; return Math.min(d, N - d); };
export const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const angOf = (b, pod) => Math.atan2(b.y[pod.tip] - b.cy, b.x[pod.tip] - b.cx);
export const KEYS = ['sel', 'adj'];
const otherKey = (k) => (k === 'sel' ? 'adj' : 'sel');
const stickOf = { sel: 'rs', adj: 'ls' };

/** The default scheme's per-player state (main.js merges it into its roles). */
export const selectRoles = () => ({
  sel: null, adj: null, rt: false, ltHeld: false, mode: 'pod', move: null,
  on: { sel: false, adj: false }, latch: new Set(),
  choose: false, chooseT: 0, glow: { sel: null, adj: null }, grow: { sel: 0, adj: 0 }, growDir: { sel: null, adj: null }, committed: 0,
});

/** Does pods[k] stand out as a pseudopod the sticks can take? */
export function podExists(b, k) {
  const pod = k == null ? null : b.pods[k];
  if (!pod) return false;
  const r = Math.hypot(b.x[pod.tip] - b.cx, b.y[pod.tip] - b.cy) - b.req;
  if (pod.idle) return pod.s > 0.3 && r > 10;
  return pod.active || pod.s > 0.1 || (pod.ret > 0.02 && r > 22);
}
/** The pseudopods round the outline: [{ k, a (angle of the tip about the centroid), y, idle }]. */
export function podList(b) {
  const out = [];
  b.pods.forEach((pod, k) => { if (podExists(b, k)) out.push({ k, a: angOf(b, pod), y: b.y[pod.tip], idle: pod.idle }); });
  // Two tips on the same lobe are one pseudopod: keep the steered one, or the stronger.
  const same = (c, o) => ringGap(b.pods[o.k].tip, b.pods[c.k].tip) < 12;
  const better = (o, c) => (o.idle !== c.idle ? !o.idle : b.pods[o.k].s > b.pods[c.k].s || (b.pods[o.k].s === b.pods[c.k].s && o.k < c.k));
  return out.filter((c) => !out.some((o) => o !== c && same(c, o) && better(o, c)));
}
const held = (R) => [R.sel, R.adj].filter((v) => v != null);
/** A steered slot for a new pseudopod (free, or a new one, or the one with least left). */
export function steeredSlot(b, avoid) {
  for (let k = 0; k < b.pods.length; k++) {
    const p = b.pods[k];
    if (p.idle || avoid.includes(k)) continue;
    if (!p.active && p.s < 0.05 && !(p.ret > 0.02)) return k;
  }
  if (b.pods.filter((p) => !p.idle).length < MAX_STEERED) return b.pods.indexOf(b.addPod());
  let best = -1, bv = Infinity;
  b.pods.forEach((p, k) => { if (!p.idle && !avoid.includes(k) && p.s + p.ret < bv) { bv = p.s + p.ret; best = k; } });
  return best;
}
/** Taking an idle pseudopod moves it into a steered slot (same tip, same reach). */
export function adopt(b, R, k) {
  const ip = b.pods[k];
  if (!ip.idle) return k;
  const j = steeredSlot(b, held(R));
  Object.assign(b.pods[j], { tip: ip.tip, dx: ip.dx, dy: ip.dy, s: ip.s, target: 0, rad: ip.rad, active: false, ret: 1, cut: undefined });
  ip.s = 0; ip.target = 0; ip.life = 0; ip.active = false; // it reappears somewhere else later
  return j;
}
/** Start a pseudopod towards (dx, dy) (from membrane node `tip` if given). Returns its index. */
export function newPod(b, R, dx, dy, tip = null) {
  // Where the membrane stands out furthest that way is often a pseudopod already: take that one.
  const t = tip != null && tip >= 0 ? tip : b.pickTip(dx, dy);
  const there = podList(b).find((c) => c.k !== R.sel && c.k !== R.adj && ringGap(b.pods[c.k].tip, t) < 12);
  if (there) return adopt(b, R, there.k);
  const k = steeredSlot(b, held(R));
  const p = b.pods[k];
  Object.assign(p, { tip: t, dx, dy, s: 0, target: 0, ret: 0, active: false, rad: undefined, cut: undefined });
  return k;
}
/**
 * The default for a stick whose pseudopod is gone, on its next push (key 'sel':
 * RS, R; 'adj': LS, L): the pseudopod whose tip lies nearest the stick's
 * direction within PICK_TOL (never the other stick's), or a new one grown at
 * the membrane furthest out that way (beside the other's, if that is its lobe).
 */
export function pickPod(b, R, key, st, env = {}) {
  const a = Math.atan2(st.dy, st.dx), theirs = R[otherKey(key)];
  let best = null, bd = PICK_TOL;
  for (const c of podList(b)) {
    if (c.k === theirs) continue;
    if (theirs != null && podExists(b, theirs) && ringGap(b.pods[c.k].tip, b.pods[theirs].tip) < 12) continue;
    const d = Math.abs(angDiff(c.a, a));
    if (d < bd) { bd = d; best = c; }
  }
  env.rumble?.(30, 0.12, 0);
  if (best) { R[key] = adopt(b, R, best.k); return 'picked'; }
  let t = 0, tv = -Infinity;
  for (let i = 0; i < N; i++) { const v = (b.x[i] - b.cx) * st.dx + (b.y[i] - b.cy) * st.dy; if (v > tv) { tv = v; t = i; } }
  if (theirs != null && podExists(b, theirs) && ringGap(t, b.pods[theirs].tip) < 14) t = b.branchTip(st.dx, st.dy, b.pods[theirs], 30, 60);
  R[key] = newPod(b, R, st.dx, st.dy, t);
  return 'grew';
}

/** Where a glow at angle a (about the centroid) sits: the membrane where a pseudopod there meets the body. */
export function basePoint(b, a, out = { x: 0, y: 0 }) {
  const dx = Math.cos(a), dy = Math.sin(a);
  // the ray's last crossing of the outline (a pseudopod's tip that way), held to the body's radius
  let far = 0;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, ex = b.x[j] - b.x[i], ey = b.y[j] - b.y[i];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const wx = b.x[i] - b.cx, wy = b.y[i] - b.cy;
    const t = (wx * ey - wy * ex) / den, s = (wx * dy - wy * dx) / den;
    if (t > 0 && s >= 0 && s <= 1 && t > far) far = t;
  }
  const r = Math.min(far || b.req, b.req * 0.95);
  out.x = b.cx + dx * r; out.y = b.cy + dy * r;
  return out;
}
/** The membrane node at angle a about the centroid (the outermost of those within a few degrees). */
export function nodeAt(b, a) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < N; i++) {
    const d = Math.abs(angDiff(Math.atan2(b.y[i] - b.cy, b.x[i] - b.cx), a));
    if (d < bd - 1e-6 || (d < bd + 0.03 && Math.hypot(b.x[i] - b.cx, b.y[i] - b.cy) > Math.hypot(b.x[best] - b.cx, b.y[best] - b.cy))) { if (d < bd) bd = d; best = i; }
  }
  return best;
}
/** One step of a glow's critically damped easing toward its target angle; settles exactly. */
export function easeGlow(g, dt) {
  const d = angDiff(g.target, g.a);
  if (Math.abs(d) < 0.002 && Math.abs(g.v) < 0.02) { g.a = g.target; g.v = 0; return g; }
  // semi-implicit critically damped spring
  const w = GLOW.w, acc = w * w * d - 2 * w * g.v;
  g.v += acc * dt;
  g.a = Math.atan2(Math.sin(g.a + g.v * dt), Math.cos(g.a + g.v * dt));
  return g;
}
/**
 * Where an editable glow aims for the stick angle sa: an existing pseudopod's
 * base within SNAP (kept until SNAP_OUT: hysteresis), else the stick's
 * angle; never within SEP of the other glow (held aside on the stick's side).
 */
export function aimGlow(b, R, key, g, sa) {
  const og = R.glow[otherKey(key)], theirs = R[otherKey(key)];
  const oa = og ? og.target : theirs != null && podExists(b, theirs) ? angOf(b, b.pods[theirs]) : null;
  const bases = podList(b).filter((c) => c.k !== theirs && !(og && og.snapK === c.k) && (oa == null || Math.abs(angDiff(c.a, oa)) >= GLOW.sep));
  let snap = g.snapK != null ? bases.find((c) => c.k === g.snapK) : null;
  if (snap && Math.abs(angDiff(snap.a, sa)) > GLOW.snapOut) snap = null;
  if (!snap) {
    let bd = GLOW.snap;
    for (const c of bases) { const d = Math.abs(angDiff(c.a, sa)); if (d < bd) { bd = d; snap = c; } }
  }
  let target = snap ? snap.a : sa;
  g.snapK = snap ? snap.k : null;
  if (oa != null && Math.abs(angDiff(target, oa)) < GLOW.sep) {
    // the other's base is taken: held just aside of it, on the side the stick points
    target = oa + (angDiff(sa, oa) >= 0 ? 1 : -1) * GLOW.sep;
    g.snapK = null;
  }
  g.target = Math.atan2(Math.sin(target), Math.cos(target));
  return g;
}

/** RT went down: a glow for each stick at its pseudopod's base (or, with none, beside the heading). */
function enterChoose(b, R, st) {
  R.choose = true; R.chooseT = 0;
  const head = Math.atan2(b.fy || 0, b.fx || 1);
  for (const key of KEYS) {
    const k = R[key];
    const a = k != null && podExists(b, k) ? angOf(b, b.pods[k]) : head + (key === 'sel' ? -0.6 : 0.6);
    R.glow[key] = { a, v: 0, target: a, snapK: k, busy: st[key].m >= STICK_OFF, moved: false };
  }
}
/** RT let go: each moved glow's base becomes its stick's pseudopod (taken, or grown there). */
function commitChoose(b, R, st, env) {
  let n = 0;
  for (const key of KEYS) {
    const g = R.glow[key];
    if (!g || !g.moved) continue;
    n++;
    if (g.snapK != null && podExists(b, g.snapK) && g.snapK !== R[otherKey(key)]) R[key] = adopt(b, R, g.snapK);
    else {
      // grown from the membrane at the glow's base, never on the other stick's, out along the membrane's
      // own normal there (so its tip stays put rather than sliding to wherever the cell bulges furthest)
      const node = nodeAt(b, g.target), i0 = (node + N - 1) % N, i1 = (node + 1) % N;
      let dx = b.y[i1] - b.y[i0], dy = -(b.x[i1] - b.x[i0]);
      const dl = Math.hypot(dx, dy) || 1;
      dx = dx / dl + 0.5 * Math.cos(g.target); dy = dy / dl + 0.5 * Math.sin(g.target);
      const dm = Math.hypot(dx, dy) || 1; dx /= dm; dy /= dm;
      R[key] = null;
      const k = newPod(b, R, dx, dy, node);
      R[key] = k;
      R.grow[key] = GLOW.growT; R.growDir[key] = { dx, dy };
    }
    // a stick still pushed as RT goes must come back to neutral before it steers
    if (st[key].m >= STICK_OFF) R.latch.add(stickOf[key]);
  }
  if (R.sel != null && R.sel === R.adj) R.adj = null;
  R.choose = false; R.glow = { sel: null, adj: null };
  R.committed = n;
  if (n) env.sound?.('commit');
  return n;
}

/**
 * Movement mode (LT held): a = LS, b = RS, each a movement intent. Split into
 *   travel  a + b (capped at 1): the cell crawls that way (one stick, or both
 *           the same way);
 *   d = (b̂ − â)/2 × min(|a|, |b|), weighted by how far apart the sticks
 *           point (OPP: 0 below 90°, 1 from 160°): its horizontal part
 *           stretches (d.x > 0: the sticks point apart, LS left, RS right) or
 *           squishes (d.x < 0: they point at each other) the cell along the
 *           line of the sticks, and its vertical part turns it like a tank
 *           (LS up + RS down: clockwise; LS down + RS up: anticlockwise);
 *   widen   the rest of the angle between them (15-75°, fading as OPP rises):
 *           the cell broadens across its travel ("kind of expand").
 * Magnitudes scale everything, so mixed inputs blend smoothly.
 */
const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function moveInput(ls, rs) {
  const am = ls.m >= STICK_OFF ? ls.m : 0, bm = rs.m >= STICK_OFF ? rs.m : 0;
  const ax = ls.dx * am, ay = ls.dy * am, bx = rs.dx * bm, by = rs.dy * bm;
  const tx = ax + bx, ty = ay + by;
  const tm = Math.hypot(tx, ty);
  const both = Math.min(am, bm);
  let ang = 0, opp = 0;
  if (both > 0) {
    ang = Math.acos(clamp(ls.dx * rs.dx + ls.dy * rs.dy, -1, 1));
    opp = smoothstep(90 * DEG, 160 * DEG, ang);
  }
  const dx = ((rs.dx - ls.dx) / 2) * both * opp, dy = ((rs.dy - ls.dy) / 2) * both * opp;
  const widen = both * smoothstep(15 * DEG, 75 * DEG, ang) * (1 - opp);
  const shape = [];
  const dl = Math.hypot(dx, dy);
  if (Math.abs(dx) > 0.02 && dl > 0) shape.push({ ux: dx / dl, uy: dy / dl, m: Math.sign(dx) * Math.min(1, Math.abs(dx) * 1.4) });
  const travel = tm > 0.06 ? { m: Math.min(1, tm), dx: tx / tm, dy: ty / tm } : null;
  if (widen > 0.03 && travel) shape.push({ ux: -travel.dy, uy: travel.dx, m: 0.8 * widen });
  const turn = Math.abs(dy) > 0.02 ? Math.min(1, Math.abs(dy) * 1.4) * Math.sign(dy) : 0;
  let what = 'free';
  const parts = [[travel ? travel.m * (1 - opp) : 0, 'crawling'], [widen, 'widening'], [dx > 0 ? dx : 0, 'stretching'], [dx < 0 ? -dx : 0, 'squishing'], [Math.abs(dy), dy < 0 ? 'turning clockwise' : 'turning anticlockwise']];
  const top = parts.filter((p) => p[0] > 0.08).sort((p, q) => q[0] - p[0]).slice(0, 2).map((p) => p[1]);
  if (top.length) what = top.join(' + ');
  return { body: travel, shape, turn, what };
}

/**
 * Movement mode, travelling (the owner, 2026-11-03: "if moving in the direction
 * of an extended pseudopod, if that stick is not pointing in the same
 * direction, the pseudopod should thicken into a stump as the body rolls
 * into/past it. If the pseudopod is actively reaching forward while moving
 * then it stays"). For each steered pseudopod whose tip lies within AHEAD of
 * the travel:
 *   reaching: its own stick is pushed within REACH_TOL of the travel: it
 *     keeps reaching that way (the cell travels behind it, lead and follow);
 *   otherwise: it is fed only a weak, fully spread push, so it shortens and
 *     its base broadens into a stump, and the cell is squished along the
 *     travel (input.shape) so the body flows into it; once it stands out
 *     less than STUMP_GONE beyond the body it is let go and merges (the area
 *     projection keeps the volume throughout).
 * Pseudopods to the side or behind are left as they are.
 */
export const ROLL = { ahead: 60 * DEG, reachTol: 35 * DEG, stumpM: 0.12, gone: 22, squish: 0.7 };
function rollInto(b, R, st, travel, pods) {
  const ta = Math.atan2(travel.dy, travel.dx);
  R.stumps = 0;
  for (let k = 0; k < b.pods.length; k++) {
    const pod = b.pods[k];
    if (pod.idle || !podExists(b, k)) continue;
    const a = angOf(b, pod);
    if (Math.abs(angDiff(a, ta)) > ROLL.ahead) continue;
    const key = R.sel === k ? 'sel' : R.adj === k ? 'adj' : null;
    const s = key ? st[key] : null;
    if (s && s.m >= STICK_ON && Math.abs(angDiff(Math.atan2(s.dy, s.dx), ta)) <= ROLL.reachTol) {
      pods[k] = { m: s.m, dx: s.dx, dy: s.dy, tip: pod.tip, push: 0, spread: 0 };
      continue;
    }
    if (b.podReach(pod) > ROLL.gone) {
      // a stump: short and broad, the body rolling into it
      pods[k] = { m: ROLL.stumpM, dx: Math.cos(a), dy: Math.sin(a), tip: pod.tip, push: 0, spread: 1 };
      R.stumps++;
    } else if (pod.active || pod.s > 0.05) { pod.ret = 1; } // passed: it merges
  }
  return R.stumps > 0;
}

/**
 * One frame of the default scheme for body b and roles R. r: raw input
 * ({ ls, rs: { m, dx, dy }, lt (choose), rt (move), lb, rb }). env: { dt,
 * surge (a surge is on), rumble(ms, weak, strong), sound('enter' | 'commit') }.
 * Returns the body input ({ pods, push, spread, round, body, shape, turn }).
 */
export function selectInput(b, R, r, env = {}) {
  const dt = env.dt ?? 1 / 60;
  const pods = [];
  for (const k of [...R.latch]) if (r[k].m < STICK_OFF) R.latch.delete(k);
  R.rt = r.rt >= (R.rt ? TRIG_OFF : TRIG_ON);
  R.ltHeld = r.lt >= (R.ltHeld ? TRIG_OFF : TRIG_ON);
  const st = { sel: R.latch.has('rs') ? { m: 0, dx: 1, dy: 0 } : r.rs, adj: R.latch.has('ls') ? { m: 0, dx: 1, dy: 0 } : r.ls };
  let bodyIn = null, shape = null, turn = 0;
  for (const key of KEYS) {
    if (R.grow[key] > 0) { R.grow[key] -= dt; continue; } // growing at its new base: it counts already
    if (!podExists(b, R[key])) R[key] = null;
  }
  if (R.adj != null && R.adj === R.sel) R.adj = null;
  const choosing = R.ltHeld && !R.rt;
  const raw = { sel: r.rs, adj: r.ls };
  if (choosing && !R.choose) { enterChoose(b, R, raw); env.sound?.('enter'); env.rumble?.(40, 0.15, 0); }
  if (!choosing && R.choose) commitChoose(b, R, raw, env);
  R.mode = R.rt ? 'move' : choosing ? 'choose' : 'pod';
  if (R.mode === 'choose') {
    R.chooseT += dt;
    for (const key of KEYS) {
      const g = R.glow[key], s = r[stickOf[key]];
      if (g.busy && s.m < STICK_OFF) g.busy = false; // rested at neutral: editable now
      if (!g.busy && s.m >= GLOW.dead) { aimGlow(b, R, key, g, Math.atan2(s.dy, s.dx)); g.moved = true; }
      easeGlow(g, dt);
    }
  } else if (R.mode === 'move') {
    // the sticks move the cell; the pseudopods stay theirs and rest
    const mv = moveInput(st.adj, st.sel);
    bodyIn = mv.body; shape = mv.shape; turn = mv.turn; R.move = mv.what;
    R.on.sel = R.on.adj = false;
    if (bodyIn && rollInto(b, R, st, bodyIn, pods)) {
      // the body rolls into the stump(s): drawn in along the travel (the sides take the volume), the cell still crawling on
      (shape ||= []).push({ ux: bodyIn.dx, uy: bodyIn.dy, m: -ROLL.squish * bodyIn.m });
    }
  } else {
    R.move = null;
    for (const key of KEYS) {
      const s = st[key];
      const on = s.m >= (R.on[key] ? STICK_OFF : STICK_ON);
      R.on[key] = on;
      if (on) {
        if (R[key] == null) pickPod(b, R, key, s, env);
        const k = R[key];
        if (k != null) pods[k] = { m: s.m, dx: s.dx, dy: s.dy, tip: b.pods[k].tip, push: r.rb, spread: r.lb };
      } else if (R.grow[key] > 0 && R[key] != null) {
        // just chosen at a new base: it pushes out a little on its own
        const g = R.growDir[key], k = R[key];
        pods[k] = { m: 0.7, dx: g.dx, dy: g.dy, tip: b.pods[k].tip, push: 0, spread: r.lb };
      }
    }
  }
  const steering = pods.some((p) => p && p.m > 0);
  // LB with nothing steered: the whole cell spreads (and, held on, rounds up)
  const spreadAll = r.lb && !steering ? 1 : 0;
  if (env.surge && !steering && !bodyIn) bodyIn = { m: 1, dx: b.fx || 1, dy: b.fy || 0 };
  return { pods, push: 0, spread: spreadAll, round: spreadAll, body: bodyIn, shape, turn };
}
