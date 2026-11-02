// Soft-body contact between two amoeboid cells (shared/techniques/amoeba-softbody.js
// rings): you and the giant amoeba Chaos, or two players. Cells never overlap;
// where their membranes meet it is a push-pull struggle. After every body has
// stepped, resolvePair() finds each membrane node of one cell that has got
// inside the other and moves both membranes apart at that spot, the weaker
// side yielding more: its membrane is dented in (and the area projection then
// bulges it out elsewhere, so the cell gives ground), and a share of the
// correction moves the whole cell (a shove).
//
// Push strength at a contact node (pushAt): the cell's cross-section there
// (thickness: an inward ray to the far membrane, capped at CONTACT.cap, so a
// broad pseudopod beats a thin one and a cell's body beats either) times how
// actively that membrane is advancing (b.Gp: a pseudopod's cap or the front of
// a flowing body pushes; resting membrane only resists) times b.pushK, which
// the game sets each step (the surge, A, raises it; spreading out, LT, lowers
// it; Chaos's lunge raises its own).
//
// encircle() measures how far one cell's membrane rings another: rays from the
// ringed cell's centre, each covered when the other's membrane lies within
// `reach` beyond its own edge. Chaos engulfs only when that ring is closed.
//
// Pure geometry, no three.js: contact.test.mjs runs it in node.
import { N } from '../shared/techniques/amoeba-softbody.js';

const hyp = (a, b) => Math.sqrt(a * a + b * b);
const ringDist = (i, j) => { const d = Math.abs(i - j); return d < N - d ? d : N - d; };

export const CONTACT = {
  cap: 250,   // µm: cross-sections thicker than this push no harder (a body, not an arm)
  skin: 1.5,  // µm left between two membranes after a correction
  shift: 0.4, // share of a cell's yield that moves the whole cell (a shove), for a player-sized cell
  rest: 0.5,  // push of membrane that is not advancing, relative to a fully advancing one (1.5)
};

/** The ring's bounding box into out [x0, y0, x1, y1]. */
function box(b, out) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const x = b.x, y = b.y;
  for (let i = 0; i < N; i++) { if (x[i] < x0) x0 = x[i]; if (x[i] > x1) x1 = x[i]; if (y[i] < y0) y0 = y[i]; if (y[i] > y1) y1 = y[i]; }
  out[0] = x0; out[1] = y0; out[2] = x1; out[3] = y1;
  return out;
}

/** Is (px, py) inside body b's ring (even-odd)? */
export function inside(b, px, py) {
  const x = b.x, y = b.y;
  let c = false;
  for (let i = 0, j = N - 1; i < N; j = i++) {
    if ((y[i] > py) !== (y[j] > py) && px < ((x[j] - x[i]) * (py - y[i])) / (y[j] - y[i]) + x[i]) c = !c;
  }
  return c;
}

/** The cell's thickness through node i: from it inward, along its inward normal, to the far membrane (µm, at most cap). */
export function thickness(b, i, cap = CONTACT.cap) {
  const x = b.x, y = b.y;
  const a = (i + N - 1) % N, c = (i + 1) % N;
  const tx = x[c] - x[a], ty = y[c] - y[a], m = hyp(tx, ty) || 1;
  // outward normal of a counter-clockwise ring is (ty, -tx); the ray goes inward
  const dx = -ty / m, dy = tx / m, ox = x[i], oy = y[i];
  let best = cap;
  for (let j = 0; j < N; j++) {
    const k = (j + 1) % N;
    if (ringDist(j, i) <= 2 || ringDist(k, i) <= 2) continue;
    const ex = x[k] - x[j], ey = y[k] - y[j];
    const den = dx * ey - dy * ex;
    if (den > -1e-9 && den < 1e-9) continue;
    const wx = x[j] - ox, wy = y[j] - oy;
    const t = (wx * ey - wy * ex) / den, s = (wx * dy - wy * dx) / den;
    if (t > 0.5 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return best;
}

/** How hard body b pushes at node i (thickness th): cross-section × advancing × b.pushK. */
export function pushAt(b, i, th = thickness(b, i)) {
  const g = b.Gp ? Math.min(1, b.Gp[i]) : 0;
  return th * (CONTACT.rest + (1.5 - CONTACT.rest) * g) * (b.pushK ?? 1);
}

const BA = [0, 0, 0, 0], BB = [0, 0, 0, 0];
const near = { j: 0, t: 0, x: 0, y: 0, d: 0 };
/** The nearest point of body q's ring to (px, py): segment j..j+1 at t. */
function nearestOn(q, px, py) {
  const x = q.x, y = q.y;
  let bd = Infinity;
  for (let j = 0; j < N; j++) {
    const k = (j + 1) % N;
    const ex = x[k] - x[j], ey = y[k] - y[j], l2 = ex * ex + ey * ey || 1e-9;
    let t = ((px - x[j]) * ex + (py - y[j]) * ey) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = x[j] + ex * t, qy = y[j] + ey * t, d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);
    if (d2 < bd) { bd = d2; near.j = j; near.t = t; near.x = qx; near.y = qy; }
  }
  near.d = Math.sqrt(bd);
  return near;
}

/**
 * Push bodies A and B apart where they overlap (both ways: A's nodes inside B,
 * then B's inside A). Moves membrane nodes of both; returns null when they do
 * not touch, else { n (nodes corrected), depth (deepest, µm), sA, sB (mean push
 * strengths at the contact), shiftA, shiftB ({x, y}: the shove each cell should
 * take as a whole, already scaled; the caller translates the cell, its
 * granules and organelles) }.
 */
export function resolvePair(A, B, out = { shiftA: { x: 0, y: 0 }, shiftB: { x: 0, y: 0 } }) {
  box(A, BA); box(B, BB);
  const pad = CONTACT.skin + 1;
  if (BA[0] > BB[2] + pad || BB[0] > BA[2] + pad || BA[1] > BB[3] + pad || BB[1] > BA[3] + pad) return null;
  let n = 0, depth = 0, sAsum = 0, sBsum = 0;
  let ax = 0, ay = 0, bx = 0, by = 0, na = 0, nb = 0;
  for (let pass = 0; pass < 2; pass++) {
    const P = pass ? B : A, Q = pass ? A : B, QB = pass ? BA : BB;
    const px = P.x, py = P.y, qx = Q.x, qy = Q.y;
    for (let i = 0; i < N; i++) {
      const x = px[i], y = py[i];
      if (x < QB[0] || x > QB[2] || y < QB[1] || y > QB[3]) continue;
      if (!inside(Q, x, y)) continue;
      const h = nearestOn(Q, x, y);
      const j = h.j, k = (j + 1) % N, t = h.t, d = h.d + CONTACT.skin;
      const ux = (h.x - x) / (h.d || 1e-3), uy = (h.y - y) / (h.d || 1e-3);
      const sP = pushAt(P, i), sQ = pushAt(Q, t < 0.5 ? j : k);
      const w = sQ / (sP + sQ || 1); // P's share of the correction: the weaker side yields more
      px[i] += ux * d * w; py[i] += uy * d * w;
      // Q's membrane at the contact point gives way (1 - w) of it, spread over the segment's two nodes
      const c = (1 - w) * d / ((1 - t) * (1 - t) + t * t);
      qx[j] -= ux * c * (1 - t); qy[j] -= uy * c * (1 - t);
      qx[k] -= ux * c * t; qy[k] -= uy * c * t;
      n++; if (d > depth) depth = d;
      if (pass === 0) { sAsum += sP; sBsum += sQ; ax += ux * d * w; ay += uy * d * w; bx -= ux * d * (1 - w); by -= uy * d * (1 - w); }
      else { sBsum += sP; sAsum += sQ; bx += ux * d * w; by += uy * d * w; ax -= ux * d * (1 - w); ay -= uy * d * (1 - w); }
      na++; nb++;
    }
  }
  if (!n) return null;
  // The shove: a share of the mean yield moves the whole cell, less for a bigger cell (more to move).
  const kA = CONTACT.shift * Math.min(1, 172 / A.req) / na, kB = CONTACT.shift * Math.min(1, 172 / B.req) / nb;
  out.n = n; out.depth = depth; out.sA = sAsum / n; out.sB = sBsum / n;
  out.shiftA.x = ax * kA; out.shiftA.y = ay * kA;
  out.shiftB.x = bx * kB; out.shiftB.y = by * kB;
  return out;
}

/** How much two rings overlap: { n (nodes of either inside the other), depth (the deepest, µm) }. For tests and checks. */
export function overlap(A, B) {
  box(A, BA); box(B, BB);
  const r = { n: 0, depth: 0 };
  if (BA[0] > BB[2] || BB[0] > BA[2] || BA[1] > BB[3] || BB[1] > BA[3]) return r;
  for (const [P, Q] of [[A, B], [B, A]]) {
    for (let i = 0; i < N; i++) if (inside(Q, P.x[i], P.y[i])) { r.n++; r.depth = Math.max(r.depth, nearestOn(Q, P.x[i], P.y[i]).d); }
  }
  return r;
}

/** Translate a ring (and its crossing-guard snapshot and uroid) by (dx, dy). */
export function shiftBody(b, dx, dy) {
  for (let i = 0; i < N; i++) { b.x[i] += dx; b.y[i] += dy; if (b.sx) { b.sx[i] += dx; b.sy[i] += dy; } }
  b.cx += dx; b.cy += dy; b.ux += dx; b.uy += dy;
}

/**
 * How far body Q's membrane rings body P: BINS rays from P's centre; a ray is
 * covered when Q's membrane crosses it within `reach` µm beyond P's own edge.
 * Returns { cover (0..1), gap (the widest open arc, rad), gapA (its centre
 * angle), bins (Uint8Array, 1 = covered), n }.
 */
export const BINS = 48;
export function encircle(P, Q, reach = 80, out = { bins: new Uint8Array(BINS) }) {
  const cx = P.cx, cy = P.cy, bins = out.bins;
  // Q's segments near P (within its box grown by reach)
  box(P, BA);
  const segs = (encircle.segs ||= new Int32Array(N));
  let ns = 0;
  const qx = Q.x, qy = Q.y;
  for (let j = 0; j < N; j++) {
    const k = (j + 1) % N;
    if (Math.max(qx[j], qx[k]) < BA[0] - reach || Math.min(qx[j], qx[k]) > BA[2] + reach || Math.max(qy[j], qy[k]) < BA[1] - reach || Math.min(qy[j], qy[k]) > BA[3] + reach) continue;
    segs[ns++] = j;
  }
  let covered = 0;
  for (let s = 0; s < BINS; s++) {
    const a = (s / BINS) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    // P's outermost crossing along the ray
    let rp = 0;
    for (let j = 0; j < N; j++) {
      const k = (j + 1) % N, t = rayHit(cx, cy, dx, dy, P.x[j], P.y[j], P.x[k], P.y[k]);
      if (t > rp) rp = t;
    }
    let rq = Infinity;
    for (let m = 0; m < ns; m++) {
      const j = segs[m], k = (j + 1) % N, t = rayHit(cx, cy, dx, dy, qx[j], qy[j], qx[k], qy[k]);
      if (t > rp - 4 && t < rq) rq = t;
    }
    bins[s] = rq - rp < reach ? 1 : 0;
    covered += bins[s];
  }
  // the widest run of open rays (round the circle)
  let best = 0, bestEnd = -1, run = 0;
  for (let s = 0; s < BINS * 2; s++) {
    if (!bins[s % BINS]) { run++; if (run > best) { best = Math.min(run, BINS); bestEnd = s; } } else run = 0;
  }
  out.n = covered;
  out.cover = covered / BINS;
  out.gap = (best / BINS) * Math.PI * 2;
  out.gapA = best ? (((bestEnd - (best - 1) / 2) % BINS) / BINS) * Math.PI * 2 : 0;
  return out;
}

/** Ray (ox, oy) + t (dx, dy), t > 0, against segment a-b: t, or -1. */
function rayHit(ox, oy, dx, dy, ax, ay, bx, by) {
  const ex = bx - ax, ey = by - ay;
  const den = dx * ey - dy * ex;
  if (den > -1e-9 && den < 1e-9) return -1;
  const wx = ax - ox, wy = ay - oy;
  const t = (wx * ey - wy * ex) / den, s = (wx * dy - wy * dx) / den;
  return t > 0 && s >= 0 && s <= 1 ? t : -1;
}
