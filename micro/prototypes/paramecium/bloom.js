// The crowd: a Chlamydomonas bloom lying across the way (pure: no three.js).
// A band of small green flagellates through the whole depth, densest toward
// the coverslip (bioconvection: they swim up to the light and sink in
// plumes). Swim and they part round you (you are slowed a little while you
// push through); X gulps a cone of them ahead (every few gulped count as a
// meal); a dash flings them aside. No clock: eaten cells come back after a
// while, away from every player.
import { BLOOM_BAND, DEPTH } from './route.js';
import { THICK, LENGTH } from './swim.js';

export const BLOOM = { n: 520, regrow: 8, perMeal: 6, r: 5 };

export function createBloom() {
  const cells = [];
  for (let i = 0; i < BLOOM.n; i++) cells.push({ u: 0, v: 0, x: 0, y: 0, z: 0, a: 0, ph: Math.random() * 6.283, gone: 0, k: Math.random() });
  return { placed: false, x: 0, y: 0, b: 0, cells, gulped: 0, t: 0 };
}
/** A point in the band, in its frame: u along the way (−half..half), v across. */
function spot(B, c, rand = Math.random) {
  c.u = (rand() * 2 - 1) * BLOOM_BAND.half * 1.1;
  c.v = (rand() * 2 - 1) * BLOOM_BAND.across;
  // densest near the coverslip: z skewed up
  c.z = DEPTH.min + 12 + (DEPTH.max - DEPTH.min - 24) * Math.pow(rand(), 0.6);
  const cb = Math.cos(B.b), sb = Math.sin(B.b);
  c.x = B.x + c.u * cb - c.v * sb; c.y = B.y + c.u * sb + c.v * cb;
  c.a = rand() * 6.283;
}
export function placeBloom(B, x, y, b) {
  B.x = x; B.y = y; B.b = b; B.placed = true;
  for (const c of B.cells) { spot(B, c); c.gone = 0; }
}
/** Step: the cells wander and part round each player. Returns per-player drag (1 = free). */
export function stepBloom(B, players, dt) {
  const drag = new Map();
  if (!B.placed) return drag;
  B.t += dt;
  const cb = Math.cos(B.b), sb = Math.sin(B.b);
  for (const c of B.cells) {
    if (c.gone > 0) { c.gone -= dt; if (c.gone <= 0) { for (let k = 0; k < 6; k++) { spot(B, c); if (players.every((P) => Math.hypot(P.S.x - c.x, P.S.y - c.y) > 260)) break; } } continue; }
    // a slow wander with a wobble; a plume pulls a little down, between them up
    c.a += Math.sin(B.t * 1.7 + c.ph) * dt * 1.5;
    c.x += Math.cos(c.a) * 22 * dt; c.y += Math.sin(c.a) * 22 * dt;
    const plume = Math.sin(c.v * 0.012 + c.k);
    c.z += (plume > 0.6 ? -40 : 12) * dt;
    if (c.z < DEPTH.min + 10) c.z = DEPTH.max - 12; else if (c.z > DEPTH.max - 8) c.z = DEPTH.max - 8;
    // stay in the band (it is where the bloom is)
    const ox = c.x - B.x, oy = c.y - B.y, u = ox * cb + oy * sb, v = -ox * sb + oy * cb;
    if (Math.abs(u) > BLOOM_BAND.half * 1.3 || Math.abs(v) > BLOOM_BAND.across * 1.05) c.a = Math.atan2(B.y - c.y, B.x - c.x) + (Math.random() - 0.5);
  }
  for (const P of players) {
    if (!P.live) continue;
    const S = P.S, ca = Math.cos(S.a), sa = Math.sin(S.a);
    let n = 0;
    for (const c of B.cells) {
      if (c.gone > 0 || Math.abs(c.z - S.z) > THICK + 8) continue;
      // the body as an ellipse: in its frame
      const dx = c.x - S.x, dy = c.y - S.y;
      const lu = dx * ca + dy * sa, lv = -dx * sa + dy * ca;
      const e = (lu / (LENGTH / 2 + 6)) ** 2 + (lv / 32) ** 2;
      if (e < 1) {
        // pushed aside: out along the nearer side
        const s = lv >= 0 ? 1 : -1, out = (1 - e) * 22 + 2;
        c.x += -sa * s * out; c.y += ca * s * out;
        n++;
      }
    }
    if (n >= 3) drag.set(P, 0.72);
  }
  return drag;
}
/** X in the bloom: gulp the cells in a cone ahead. Returns how many. */
export function gulpBloom(B, S) {
  if (!B.placed) return 0;
  let n = 0;
  const fx = S.x + Math.cos(S.a) * LENGTH * 0.45, fy = S.y + Math.sin(S.a) * LENGTH * 0.45;
  for (const c of B.cells) {
    if (c.gone > 0 || Math.abs(c.z - S.z) > 50) continue;
    const dx = c.x - fx, dy = c.y - fy, d = Math.hypot(dx, dy);
    if (d > 80) continue;
    if (d > 20 && Math.cos(Math.atan2(dy, dx) - S.a) < 0.55) continue;
    c.gone = BLOOM.regrow; n++;
  }
  B.gulped += n;
  return n;
}
/** A dash through the bloom flings the cells near you aside. */
export function flingBloom(B, S) {
  if (!B.placed) return;
  for (const c of B.cells) {
    if (c.gone > 0 || Math.abs(c.z - S.z) > 60) continue;
    const dx = c.x - S.x, dy = c.y - S.y, d = Math.hypot(dx, dy);
    if (d < 110 && d > 1e-3) { const k = (110 - d) * 0.8; c.x += (dx / d) * k; c.y += (dy / d) * k; }
  }
}
