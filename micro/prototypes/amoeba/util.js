// Small shared helpers for the amoeba prototype: a seeded random source (so a
// run is repeatable), angle wrapping and point/segment geometry.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
export function rng(seed) {
  let s = seed >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

/** Squared distance from p to segment ab, and the parameter t of the closest point. */
export function segDist2(px, py, ax, ay, bx, by, out) {
  const ex = bx - ax, ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 1e-9 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + ex * t, cy = ay + ey * t;
  const dx = px - cx, dy = py - cy;
  if (out) { out.t = t; out.x = cx; out.y = cy; }
  return dx * dx + dy * dy;
}

export function pointInPolygon(px, py, xs, ys, n) {
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = ys[i], yj = ys[j];
    if ((yi > py) !== (yj > py) && px < ((xs[j] - xs[i]) * (py - yi)) / (yj - yi) + xs[i]) inside = !inside;
  }
  return inside;
}

export function polygonArea(xs, ys, n) {
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) a += xs[j] * ys[i] - xs[i] * ys[j];
  return a * 0.5;
}
