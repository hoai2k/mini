// The player's Paramecium bursaria on the 2D slide, drawn as the card shows
// it (assets/cards/paramecium.webp): a luminous slipper outline (the
// pellicle), a bright fringe of beating cilia round it (metachronal waves
// running from front to back, faster as it swims, reversed as it backs up),
// the oral groove running in from the front to the mouth at mid-length,
// golden granules and green Chlorella streaming round inside (cyclosis), the
// pale macronucleus, two star-shaped contractile vacuoles that fill and
// empty, food vacuoles for what it has eaten. Its trichocyst burst (B) is a
// spray of threads all round; the jab (X) a spray from the front. Eaten, it
// dissolves: the outline breaks and drifts apart and its contents scatter.
//
// Telling players apart (README "Telling players apart"): each player's cell
// carries its own shade of Chlorella (VARIETIES).
//
// The body art (MP-P06, a darkfield P. bursaria seen from above, delivered):
// with C.sprite on (darkfield, once loaded), the inside of the cell is that
// image (its Chlorella turned to the player's shade by the renderer), under
// the procedural pellicle, cilia, oral groove, streaming granules and food
// vacuoles; the procedural Chlorella, macronucleus and contractile vacuoles
// are left to it. Dissolving, the image fades and the procedural contents
// scatter as before.
import { LENGTH, WIDTH, VMAX } from './swim.js';

/** Per player: the Chlorella's colour in darkfield (scattered light), and its cast on the body. */
export const VARIETIES = [
  { name: 'green', chl: [0.42, 0.84, 0.22] },
  { name: 'blue-green', chl: [0.18, 0.78, 0.66] },
  { name: 'olive', chl: [0.78, 0.74, 0.3] },
  { name: 'light yellow-green', chl: [0.66, 0.96, 0.34] },
];
const PELL = [0.86, 0.94, 1.0], CIL = [0.78, 0.9, 1.0], GOLD = [1.0, 0.8, 0.42], NUC = [0.85, 0.85, 0.72], CV = [0.9, 0.97, 1.0];
const HL = LENGTH / 2, HW = WIDTH / 2;
const N = 56, NC = 170;

/** The body's half-width at s = u / HL (−1 rear .. +1 front): broad, with a blunt rear. */
export function halfWidth(s) {
  const q = Math.max(0, 1 - Math.pow(Math.abs(s), 2.6));
  return HW * Math.pow(q, 0.42) * (1 - 0.14 * Math.max(0, s) ** 2);
}
/** The oral groove's depth at s on the oral side (v < 0): from the front in to the mouth at mid-length. */
const groove = (s) => (s > 0.02 && s < 0.88 ? Math.sin(((s - 0.02) / 0.86) * Math.PI) * 0.13 : 0);

function rng(seed) { let a = seed >>> 0; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); }
const r0 = rng(77);
const CHL = Array.from({ length: 130 }, () => { const rho = 0.3 + 0.68 * Math.sqrt(r0()); return { rho, l: r0() * 6.283, w: 0.05 + r0() * 0.08, r: 1.6 + r0() * 0.7, k: r0() }; });
const GRAN = Array.from({ length: 90 }, () => { const rho = 0.1 + 0.85 * r0(); return { rho, l: r0() * 6.283, w: 0.03 + r0() * 0.05, r: 0.6 + r0() * r0() * 2.4, k: r0() }; });
const BURST = Array.from({ length: 70 }, (_, i) => ({ th: (i / 70) * 6.283 + r0() * 0.05, L: 26 + r0() * 18, k: r0() }));

/** The outline in the cell's frame (u ahead, v to its left), with a bend and a squash. */
export function outlineLocal(bend = 0, squash = 0, out = []) {
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const s = Math.cos(th), side = Math.sin(th);
    let v = (side >= 0 ? 1 : -1) * halfWidth(s);
    if (side < 0) v *= 1 - groove(s);
    const u = s * HL * (1 + 0.07 * squash);
    v *= 1 - 0.07 * squash;
    v += bend * 9 * s * s;
    (out[i] ||= [0, 0])[0] = u; out[i][1] = v;
  }
  out.length = N;
  return out;
}
const _loc = [];

/**
 * Draw one player's cell. `C` holds what changes: { x, y, z, a (heading), v (speed), bend,
 * squash, t, beat (the cilia's phase), variety, burst (s since a burst, or −1), jab, dead (0..1 dissolve),
 * spawn (0..1 materialise), vacuoles: [{ u, v, r, age }], ring (player colour [r,g,b] or null), alpha }.
 */
export function drawCell(G, C) {
  const ca = Math.cos(C.a), sa = Math.sin(C.a);
  const X = (u, v) => C.x + ca * u - sa * v, Y = (u, v) => C.y + sa * u + ca * v;
  const z = C.z;
  const dead = C.dead || 0, life = (1 - dead) * (C.spawn ?? 1) * (C.alpha ?? 1);
  const V = C.variety || VARIETIES[0];
  const loc = outlineLocal(C.bend || 0, C.squash || 0, _loc);
  // dissolving: everything drifts out from the middle and fades
  const spread = dead * dead * 46;
  const fade = (1 - dead) * (C.spawn ?? 1) * (C.alpha ?? 1);
  const I0 = Math.max(0, fade);
  if (I0 <= 0.003) return;
  // the body art, under everything (it fades fast as the cell dissolves)
  const art = !!C.sprite;
  if (art) G.sprite(C.x, C.y, C.a, (C.spriteW || LENGTH * 1.04) * (1 + 0.07 * (C.squash || 0)), (C.spriteH || LENGTH * 0.52) * (1 - 0.07 * (C.squash || 0)), z, I0 * Math.max(0, 1 - dead * 2.5), V.chl);
  // the glassy body and the green cast
  if (dead < 0.5 && !art) {
    G.ell(C.x, C.y, C.a, HL * 0.95, HW * 0.88, z, [0.6, 0.7, 0.8], 0.05 * I0, 6);
    G.ell(C.x, C.y, C.a, HL * 0.8, HW * 0.7, z, V.chl, 0.035 * I0, 9);
  }
  // the pellicle: a crisp luminous outline (it breaks apart as it dissolves)
  for (let i = 0; i < N; i++) {
    const p = loc[i], q = loc[(i + 1) % N];
    let du = 0, dv = 0;
    if (spread > 0) { const m = Math.hypot((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) || 1; du = ((p[0] + q[0]) / 2 / m) * spread * (0.6 + ((i * 37) % 11) / 11); dv = ((p[1] + q[1]) / 2 / m) * spread * (0.6 + ((i * 53) % 7) / 7); }
    const gap = spread > 0 ? 0.25 * dead : 0;
    const u0 = p[0] + (q[0] - p[0]) * gap + du, v0 = p[1] + (q[1] - p[1]) * gap + dv, u1 = q[0] - (q[0] - p[0]) * gap + du, v1 = q[1] - (q[1] - p[1]) * gap + dv;
    G.line(X(u0, v0), Y(u0, v0), X(u1, v1), Y(u1, v1), 0.62, z, PELL, 0.95 * I0, 0, 0.2, 2.6);
    // the cortex just inside: a faint second line
    if (dead === 0) { const k = 0.9; G.line(X(p[0] * k, p[1] * k), Y(p[0] * k, p[1] * k), X(q[0] * k, q[1] * k), Y(q[0] * k, q[1] * k), 0.45, z, PELL, 0.14 * I0); }
  }
  // the cilia: a fringe round the edge, beating in waves (metachrony) from front to back
  if (dead < 0.35) {
    const ci = (1 - dead / 0.35) * I0;
    for (let i = 0; i < NC; i++) {
      const f = i / NC * N, j = Math.floor(f), w = f - j;
      const p = loc[j], q = loc[(j + 1) % N], pp = loc[(j + 2) % N];
      const u = p[0] + (q[0] - p[0]) * w, v = p[1] + (q[1] - p[1]) * w;
      // the outward normal from the local tangent
      let tu = pp[0] - p[0], tv = pp[1] - p[1]; const tl = Math.hypot(tu, tv) || 1; tu /= tl; tv /= tl;
      const nu = tv, nv = -tu;
      const arc = (i / NC) * 6.283;
      const ph = C.beat - Math.abs(Math.sin(arc * 0.5)) * 9; // waves running from the front back along both sides
      const sw = Math.sin(ph);
      const len = (u > HL * 0.6 ? 10 : u < -HL * 0.75 ? 9 : 8) * (1 + 0.15 * Math.cos(ph));
      const tilt = 0.75 * sw;
      // the stroke bends the cilium toward the rear (−u) through its power stroke
      const du = nu * Math.cos(tilt) - tu * Math.sin(tilt) * Math.sign(nv || 1), dv = nv * Math.cos(tilt) - tv * Math.sin(tilt) * Math.sign(nv || 1);
      const bu = u + nu * 0.8, bv = v + nv * 0.8;
      const mu = bu + du * len * 0.55, mv = bv + dv * len * 0.55;
      const eu = mu + (du * 0.8 + tu * 0.3 * sw) * len * 0.45, ev = mv + (dv * 0.8 + tv * 0.3 * sw) * len * 0.45;
      const b = 0.5 + 0.25 * Math.cos(ph);
      G.line(X(bu, bv), Y(bu, bv), X(mu, mv), Y(mu, mv), 0.3, z, CIL, b * 0.75 * ci, 0, 0.06, 2);
      G.line(X(mu, mv), Y(mu, mv), X(eu, ev), Y(eu, ev), 0.26, z, CIL, b * 0.45 * ci, 0, 0.04, 2);
    }
  }
  // the oral groove and the mouth (cytostome) at mid-length on the oral side
  if (dead < 0.6) {
    let pu = 0, pv = 0;
    for (let k = 0; k <= 10; k++) {
      const s = 0.86 - k * 0.08, v = -halfWidth(s) * (1 - groove(s) - 0.1), u = s * HL;
      if (k) G.line(X(pu, pv), Y(pu, pv), X(u, v), Y(u, v), 0.7, z, PELL, 0.32 * I0, 0.4);
      pu = u; pv = v;
    }
    G.ring(X(HL * 0.08, -HW * 0.42), Y(HL * 0.08, -HW * 0.42), 3.2, 1, z, PELL, 0.4 * I0, 0.4);
  }
  // inside: cyclosis carries the Chlorella and the granules round a loop
  const cyc = C.t * 0.22;
  const inner = (d, l, k = 0.84) => { const u = Math.cos(l) * Math.sqrt(d.rho) * HL * k; return [u, Math.sin(l) * Math.min(1, d.rho * 1.25) * halfWidth(u / HL) * 0.8]; };
  for (const d of art && dead === 0 ? [] : CHL) {
    const [u, v] = inner(d, d.l + cyc * (0.6 + d.w * 4));
    const m = Math.hypot(u, v) || 1;
    const su = u + (u / m) * spread * (1.4 + d.k), sv = v + (v / m) * spread * (1.4 + d.k);
    G.disc(X(su, sv), Y(su, sv), d.r, z, V.chl, (0.22 + 0.16 * d.k) * I0, 0.5, 0.06, 2);
  }
  for (const d of GRAN) {
    const [u, v] = inner(d, d.l - cyc * (0.4 + d.w * 3), 0.78);
    const m = Math.hypot(u, v) || 1;
    const su = u + (u / m) * spread * (2 + d.k), sv = v + (v / m) * spread * (2 + d.k);
    G.disc(X(su, sv), Y(su, sv), d.r, z, GOLD, (0.6 + 0.3 * Math.sin(C.t * 3 + d.l * 5)) * I0 * (art && dead === 0 ? 0.45 : 1), 0.2, 0.3, 2);
  }
  if (dead < 0.5 && !art) {
    // the macronucleus
    G.ell(X(-6, 2), Y(-6, 2), C.a + 0.2, 19, 12, z, NUC, 0.05 * I0, 2);
    G.ellRing(X(-6, 2), Y(-6, 2), C.a + 0.2, 19, 12, 1.1, z, NUC, 0.26 * I0, 0.8);
    // two contractile vacuoles: stars that fill (diastole) and empty (systole) in turn
    for (const [k, cu] of [[0, HL * 0.55], [1, -HL * 0.58]]) {
      const cyc2 = ((C.t / 5.5 + k * 0.5) % 1);
      const full = cyc2 < 0.85 ? cyc2 / 0.85 : 1 - (cyc2 - 0.85) / 0.15;
      const rr = 2.2 + 5 * full, cx = X(cu, 7), cy = Y(cu, 7);
      G.ring(cx, cy, rr, 0.8, z, CV, 0.6 * I0, 0.3, 0.3, 2.5);
      G.disc(cx, cy, rr * 0.6, z, CV, 0.18 * full * I0, 1.2);
      for (let c = 0; c < 7; c++) {
        const ang = C.a + c * 0.898 + 0.3, l0 = rr + 1, l1 = rr + 6 + 7 * (1 - full);
        G.line(cx + Math.cos(ang) * l0, cy + Math.sin(ang) * l0, cx + Math.cos(ang) * l1, cy + Math.sin(ang) * l1, 0.45, z, CV, 0.32 * I0, 0.3, 0.12, 2);
      }
    }
  }
  if (dead < 0.5) {
    // food vacuoles: what it has eaten, carried round (they shrink as they digest)
    for (const fv of C.vacuoles || []) {
      const l = fv.l + cyc * 0.7, rho = fv.rho;
      const u = Math.cos(l) * rho * HL * 0.7, v = Math.sin(l) * rho * halfWidth(u / HL) * 0.6;
      const r = fv.r * Math.max(0.4, 1 - fv.age / 40);
      G.ring(X(u, v), Y(u, v), r, 0.9, z, GOLD, 0.45 * I0, 0.4, 0.2, 2);
      G.disc(X(u, v), Y(u, v), r * 0.6, z, [0.9, 0.6, 0.3], 0.25 * I0, 1);
    }
  }
  // the trichocyst burst (B): threads shot out all round; the jab (X): from the front
  if (C.burst >= 0 && C.burst < 0.45) {
    const e = C.burst / 0.45, len = Math.sqrt(Math.min(1, e * 3)), I = (1 - e) * 1.2;
    for (const b of BURST) {
      const s = Math.cos(b.th), u0 = s * HL * 0.95, v0 = Math.sin(b.th) * halfWidth(s) * 0.95;
      const n = Math.hypot(u0 / HL / HL, v0 / HW / HW) || 1, nu = u0 / HL / HL / n, nv = v0 / HW / HW / n;
      G.line(X(u0, v0), Y(u0, v0), X(u0 + nu * b.L * len, v0 + nv * b.L * len), Y(u0 + nu * b.L * len, v0 + nv * b.L * len), 0.45, z, [1, 0.97, 0.88], I * (0.6 + 0.4 * b.k), 0, 0.3, 2.5);
    }
  }
  if (C.jab >= 0 && C.jab < 0.35) {
    const e = C.jab / 0.35, len = Math.sqrt(Math.min(1, e * 3)), I = (1 - e) * 1.3;
    for (let i = 0; i < 18; i++) {
      const th = (i / 17 - 0.5) * 1.1, s = Math.cos(th * 0.5), u0 = HL * 0.9 * s, v0 = Math.sin(th) * HW * 0.6;
      const L = (50 + ((i * 29) % 13) * 2.5) * len;
      G.line(X(u0, v0), Y(u0, v0), X(u0 + Math.cos(th * 0.6) * L, v0 + Math.sin(th * 0.6) * L), Y(u0 + Math.cos(th * 0.6) * L, v0 + Math.sin(th * 0.6) * L), 0.5, z, [1, 0.96, 0.85], I, 0, 0.35, 2.5);
    }
  }
  // together: a faint broken ring in the player's colour
  if (C.ring && dead < 0.2) {
    const R = HL + 18;
    G.marker = true; // (legible out of focus)
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * 6.283 + C.t * 0.3, a1 = a0 + 0.3;
      G.line(C.x + Math.cos(a0) * R, C.y + Math.sin(a0) * R, C.x + Math.cos(a1) * R, C.y + Math.sin(a1) * R, 1.1, z, C.ring, 0.55 * I0, 0.4, 0.2, 3);
    }
    G.marker = false;
  }
}
/**
 * Out of focus (defocus: µm between the cell and the focal plane), the cell
 * keeps a readable silhouette, as a darkfield halo does: a soft glowing
 * outline about as wide as the blur, so you can always tell where you are.
 */
export function drawCellHalo(G, C, defocus) {
  const k = Math.min(1, Math.max(0, (defocus - 12) / 80)) * (1 - (C.dead || 0)) * (C.spawn ?? 1) * (C.alpha ?? 1);
  if (k <= 0.01) return;
  const w = 2 + defocus * 0.05;
  G.marker = true;
  G.ellRing(C.x, C.y, C.a, HL + 1, HW + 1, w, C.z, PELL, 0.42 * k, w * 0.9, 0.25 * k, 6 + w);
  G.marker = false;
}
/** The cilia's beat rate (rad/s) at a speed: faster as it swims, reversed as it backs up. */
export const beatRate = (v) => (v < -50 ? -1 : 1) * (13 + 26 * Math.min(1.6, Math.abs(v) / VMAX));
