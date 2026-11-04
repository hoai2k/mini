// The food trail (the owner, 2026-11-04: "Can we have little groups of food as
// frequent checkpoints on the way to the portal so that if you follow that and
// eat all the food you'll be getting closer and closer"). Pure: no three.js;
// main.js feeds it the players, the portal, and the director's seen and
// in-view tests, and puts each cluster's food among the prey when someone
// comes near; trail.test.mjs runs it in node.
//
// The rules:
//   - On the first step the default path's chain is laid from the start to the
//     portal: a cluster every TRAIL.step µm (route.js), the first in the
//     opening view, the last TRAIL.last short of the leaf. Nothing has been
//     seen yet, so this is the one time clusters go anywhere.
//   - Every other cluster is a rejoin: whenever a player has no unfinished
//     cluster near them that lies toward the portal (within TRAIL.ahead, closer
//     to the portal than they are, and roughly on the way), one is placed a
//     step ahead of them (or of the cluster they just finished), toward the
//     portal, in water nobody has seen and out of every view, clear of the
//     encounters (`blocked`). So the trail can always be rejoined, from
//     wherever you wander.
//   - Explored stays as it was: a cluster is never moved. One nobody has seen
//     may be dropped (the portal moved, or a rejoin left far behind); a seen one
//     stays until it is eaten.
//   - A cluster is finished when its food is gone; eaten to the last by a
//     player, it is `done` (main.js: a soft chime and a glint toward the next).
import { TRAIL, START } from './route.js';

const TAU = Math.PI * 2;
const hyp = Math.hypot;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A new trail. opts: from (the start, default START), target (the portal now, { x, y }: the chain is laid
 * toward it on the first step), seed.
 */
export function createTrail({ from = START, target = null, seed = TRAIL.seed } = {}) {
  return { from: { x: from.x, y: from.y }, target: target ? { x: target.x, y: target.y } : null, laid: false, clusters: [], rand: rng(seed), nextId: 0, t: 0, tryT: 0, log: [] };
}

/** A cluster at (x, y): its food laid out round it (each item a prey record, main.js puts it among the prey). */
function makeCluster(T, x, y, kind, k = -1) {
  const r = T.rand;
  const n = TRAIL.items[0] + Math.floor(r() * (TRAIL.items[1] - TRAIL.items[0] + 1));
  const z = (r() * 2 - 1) * TRAIL.z;
  const c = { id: T.nextId++, x, y, z, kind, k, n, items: [], seenT: null, active: false, done: false, gone: false, eaten: 0, t: T.t, dropped: false };
  for (let i = 0; i < n; i++) {
    // a ring of clumps round a middle one, a little irregular
    const a = (i / n) * TAU + r() * 0.8, d = i === 0 ? r() * 10 : TRAIL.r * (0.45 + 0.55 * r());
    c.items.push({ kind: 'clump', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: z + (r() * 2 - 1) * TRAIL.zr, a: r() * TAU, v: 0, cd: 0, ph: r() * TAU, gone: false, dying: 0, r: 9 + r() * 3, trail: c.id });
  }
  T.clusters.push(c);
  T.log.push({ type: 'placed', id: c.id, kind, x: Math.round(x), y: Math.round(y), t: +T.t.toFixed(2) });
  return c;
}

/** The default path's chain: from `from` toward `target`, one every TRAIL.step, stopping TRAIL.last short of it. */
function layChain(T) {
  const { from, target } = T;
  const D = hyp(target.x - from.x, target.y - from.y), ux = (target.x - from.x) / D, uy = (target.y - from.y) / D;
  for (let k = 0; ; k++) {
    const d = TRAIL.first + TRAIL.step * k;
    if (d > D - TRAIL.last + 1) break;
    makeCluster(T, from.x + ux * d, from.y + uy * d, 'path', k);
  }
  T.laid = true;
}

/** Is cluster c still to be eaten (some food left, not dropped)? */
export const live = (c) => !c.done && !c.gone && !c.dropped;

/**
 * Is (x, y) on the way for a player at (px, py) going to the portal at (tx, ty): nearer to it by a good margin,
 * within `ahead`, and within ~65° of the straight line to it?
 */
export function towardPortal(px, py, tx, ty, x, y, ahead = TRAIL.ahead) {
  const dP = hyp(tx - px, ty - py), d = hyp(x - px, y - py);
  if (d > ahead) return false;
  if (d < 260) return true; // (at it now)
  if (hyp(tx - x, ty - y) > dP - 200) return false;
  return Math.abs(wrap(Math.atan2(y - py, x - px) - Math.atan2(ty - py, tx - px))) < 1.15;
}

/** The unfinished clusters on the way for a player at (px, py), nearest first. */
export function aheadOf(T, px, py) {
  if (!T.target) return [];
  return T.clusters.filter((c) => live(c) && towardPortal(px, py, T.target.x, T.target.y, c.x, c.y)).sort((a, b) => hyp(a.x - px, a.y - py) - hyp(b.x - px, b.y - py));
}

/** The next cluster on from (x, y) (a cluster just finished): the nearest unfinished one on the way, or null. */
export function nextFrom(T, x, y) {
  const list = aheadOf(T, x, y).filter((c) => hyp(c.x - x, c.y - y) > 150);
  return list[0] || null;
}

/**
 * One step. w: { dt, players: [{ id, x, y, alive }], target: { x, y } | null (the portal now), seen(x, y) ->
 * bool (the director's explored grid), inView(x, y, r) -> bool (inside a view now), blocked(x, y) -> bool (an
 * encounter's spot within TRAIL.clear) }. Returns the clusters placed this step.
 */
export function stepTrail(T, w) {
  T.t += w.dt || 0;
  const out = [];
  if (w.target) {
    if (!T.target) T.target = { x: w.target.x, y: w.target.y };
    else if (hyp(w.target.x - T.target.x, w.target.y - T.target.y) > 400) {
      // the portal moved (placed as you go): the clusters nobody has seen are taken back; the rest stay
      T.target = { x: w.target.x, y: w.target.y };
      for (const c of T.clusters) if (live(c) && c.seenT === null && !c.active) { c.dropped = true; T.log.push({ type: 'dropped', id: c.id, t: +T.t.toFixed(2) }); }
    }
  }
  if (!T.target) return out;
  if (!T.laid) { layChain(T); out.push(...T.clusters); }
  const seenC = (c) => w.seen && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.seen(c.x + a * TRAIL.r, c.y + b * TRAIL.r));
  for (const c of T.clusters) if (c.seenT === null && !c.dropped && (seenC(c) || (w.inView && w.inView(c.x, c.y, TRAIL.r)))) c.seenT = T.t;
  // rejoins left far behind, unseen: taken back (they were never shown)
  for (const c of T.clusters) if (c.kind === 'rejoin' && live(c) && c.seenT === null && !c.active && w.players.every((p) => hyp(p.x - c.x, p.y - c.y) > 4000)) { c.dropped = true; T.log.push({ type: 'dropped', id: c.id, t: +T.t.toFixed(2) }); }
  if (T.t < T.tryT) return out;
  T.tryT = T.t + 0.2;
  const { x: tx, y: ty } = T.target;
  for (const p of w.players) {
    if (p.alive === false) continue;
    const dP = hyp(tx - p.x, ty - p.y);
    if (dP < TRAIL.endShort + TRAIL.step * 0.6) continue; // the leaf's glow is the way from here
    if (aheadOf(T, p.x, p.y).length) continue;
    // off the trail (or at its end): a cluster ahead of them, toward the portal, where nobody has looked
    const from = T.clusters.filter((c) => !c.dropped && hyp(c.x - p.x, c.y - p.y) < 450).sort((a, b) => hyp(a.x - tx, a.y - ty) - hyp(b.x - tx, b.y - ty))[0] || p;
    const c = place(T, w, from, p);
    if (c) out.push(c);
  }
  return out;
}
function place(T, w, from, p) {
  const { x: tx, y: ty } = T.target;
  const base = Math.atan2(ty - from.y, tx - from.x), dFrom = hyp(tx - from.x, ty - from.y);
  for (const m of [1, 0.85, 1.15, 0.7, 1.3, 1.5]) for (const off of [0, 0.2, -0.2, 0.4, -0.4, 0.6, -0.6]) {
    const d = TRAIL.step * m, a = base + off, x = from.x + Math.cos(a) * d, y = from.y + Math.sin(a) * d;
    const dT = hyp(tx - x, ty - y);
    if (dT < TRAIL.endShort * 0.8 || dT > dFrom - TRAIL.step * 0.45) continue; // (on toward it, not past it)
    if (!towardPortal(p.x, p.y, tx, ty, x, y, TRAIL.ahead + 400)) continue;
    if (w.inView && w.inView(x, y, TRAIL.r + 40)) continue;
    if (w.seen && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([u, v]) => w.seen(x + u * TRAIL.r, y + v * TRAIL.r))) continue;
    if (w.blocked && w.blocked(x, y)) continue;
    if (T.clusters.some((c) => live(c) && hyp(c.x - x, c.y - y) < TRAIL.step * 0.55)) continue;
    return makeCluster(T, x, y, 'rejoin');
  }
  return null;
}

/**
 * Which clusters have just lost their last food: eaten to the last by players (an item a player gulped carries
 * `by`, prey.js gulpPrey), they are `done` and returned (main.js: the chime and the glint); lost to the giant or
 * the trap with none eaten, they are just gone.
 */
export function settle(T) {
  const done = [];
  for (const c of T.clusters) {
    if (!c.active || !live(c)) continue;
    if (!c.items.every((i) => i.dying > 0 || i.gone)) continue;
    c.eaten = c.items.filter((i) => i.by).length;
    if (c.eaten > 0) { c.done = true; c.doneT = T.t; T.log.push({ type: 'done', id: c.id, t: +T.t.toFixed(2) }); done.push(c); }
    else c.gone = true;
  }
  return done;
}
/** Is (x, y) within TRAIL.clear (+ r) of a cluster still to be eaten (or, before the chain is laid, of the default path's line)? */
export function nearCluster(T, x, y, r = 0, line = null) {
  if (!T.laid && line) return line.some(([cx, cy]) => hyp(cx - x, cy - y) < TRAIL.clear + r);
  return T.clusters.some((c) => !c.dropped && !c.done && hyp(c.x - x, c.y - y) < TRAIL.clear + r);
}
