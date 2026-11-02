// Everything in the pond drop but the player's cell, drawn into the shape
// renderer (shapes.js) as the card shows it: glowing outlines on black,
// golden granules, green chloroplasts. Darkfield colours are the light each
// structure scatters; the other looks derive from the same shapes.
import { DILEPTUS, DIDINIUM, GIANT, TRAP, dileptusTrunk, trapDoor } from './foes.js';
import { DEPTH } from './route.js';
import { rng } from './world.js';
import { clumpLayout, placeInFrame } from '../shared/kin-clump.js';

export const COL = {
  edge: [0.8, 0.92, 1.0], white: [0.95, 0.97, 1.0], gold: [1.0, 0.78, 0.36], brown: [0.62, 0.42, 0.17], amber: [0.95, 0.62, 0.25],
  green: [0.4, 0.9, 0.22], leaf: [0.3, 0.62, 0.16], wall: [0.72, 0.95, 0.82], red: [1.0, 0.32, 0.2], blue: [0.6, 0.78, 1.0], pale: [0.75, 0.8, 0.7],
};
const TAU = Math.PI * 2;
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** A hash of two integers to 0..1 (the procedural glitter and specks). */
function hash(i, j, k = 0) {
  let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Clip the segment a-b to the rect (Liang-Barsky): the parameter range inside, or null. */
function clipSeg(ax, ay, bx, by, x0, y0, x1, y1) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [t0, t1];
}

// ---------------------------------------------------------------- the scenery
export function drawScenery(G, W, rect, t, opts = {}) {
  const [x0, y0, x1, y1] = rect;
  W.eachIn(W.filaments, x0, y0, x1, y1, (f, ox, oy) => drawSpirogyra(G, f, ox, oy, rect, t));
  W.eachIn(W.clumps, x0, y0, x1, y1, (c, ox, oy) => drawClump(G, c, ox, oy, t));
  W.eachIn(W.vorticella, x0, y0, x1, y1, (v, ox, oy) => drawVorticella(G, v, W.vortPose(v, ox, oy, t), t));
  W.eachIn(W.diatoms, x0, y0, x1, y1, (d, ox, oy) => drawDiatom(G, d, ox, oy, t));
  W.eachIn(W.flocs, x0, y0, x1, y1, (f, ox, oy) => { for (const g of f.g) G.disc(f.x + ox + g.dx, f.y + oy + g.dy, g.r, f.z, mix(COL.brown, COL.gold, g.gold), 0.32 + 0.3 * g.gold, 0.3, g.gold > 0.6 ? 0.4 : 0, 2); });
  drawGlitter(G, rect, t, opts.glitter ?? 1);
}
/** The fine glitter: specks hashed per 80 µm cell (the same every visit), twinkling. */
function drawGlitter(G, [x0, y0, x1, y1], t, k) {
  const C = 80;
  for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) {
    const n = 7 + Math.floor(hash(i, j, 9) * 6);
    for (let s = 0; s < n; s++) {
      const h1 = hash(i, j, s * 4 + 1), h2 = hash(i, j, s * 4 + 2), h3 = hash(i, j, s * 4 + 3), h4 = hash(i, j, s * 4 + 4);
      const x = (i + h1) * C, y = (j + h2) * C, z = DEPTH.min + h3 * (DEPTH.max - DEPTH.min);
      const tw = Math.max(0, Math.sin(t * (0.7 + h4 * 2.2) + h1 * 40));
      const c = h4 < 0.45 ? COL.gold : h4 < 0.8 ? COL.white : COL.blue;
      const I = (0.18 + 0.9 * tw ** 6) * k * (h3 > 0.5 ? 1 : 0.8);
      G.disc(x, y, 0.5 + h2 * 0.9, z, c, I, 0.2, 0.5 + tw * 0.6, 2.2);
    }
  }
}
function drawSpirogyra(G, f, ox, oy, rect, t) {
  const m = 30;
  const ax = f.x0 + ox, ay = f.y0 + oy, bx = f.x1 + ox, by = f.y1 + oy;
  const cl = clipSeg(ax, ay, bx, by, rect[0] - m, rect[1] - m, rect[2] + m, rect[3] + m);
  if (!cl) return;
  const L = f.L, dx = (bx - ax) / L, dy = (by - ay) / L, px = -dy, py = dx;
  const u0 = cl[0] * L, u1 = cl[1] * L;
  const zAt = (u) => f.z0 + (f.z1 - f.z0) * (u / L);
  const P = (u, v) => [ax + dx * u + px * v, ay + dy * u + py * v];
  const r = f.r;
  // the body's faint green and the walls, in pieces (its depth changes along it)
  const STEP = 120;
  for (let u = u0; u < u1; u += STEP) {
    const ue = Math.min(u1, u + STEP), z = zAt((u + ue) / 2);
    const [a1, a2] = P(u, 0), [b1, b2] = P(ue, 0);
    G.line(a1, a2, b1, b2, r * 0.9, z, COL.leaf, 0.055 * f.shade, 4);
    for (const s of [-1, 1]) { const [c1, c2] = P(u, s * r), [d1, d2] = P(ue, s * r); G.line(c1, c2, d1, d2, 0.8, z, COL.wall, 0.7, 0, 0.3, 4); }
  }
  // the cross walls between cells
  for (let k = Math.ceil(u0 / f.cell); k * f.cell <= u1; k++) {
    const u = k * f.cell, [a1, a2] = P(u, -r), [b1, b2] = P(u, r);
    G.line(a1, a2, b1, b2, 0.7, zAt(u), COL.wall, 0.55, 0, 0.2, 3);
  }
  // the chloroplast ribbon: a helix seen from above, brighter on the near side (it runs through the depth)
  const step = 4.5;
  for (let rb = 0; rb < f.turns; rb++) {
    let prev = null;
    for (let u = Math.max(0, u0 - step); u <= u1 + step; u += step) {
      const ph = (u / f.pitch) * TAU + f.phase + rb * Math.PI;
      const front = Math.sin(ph), v = Math.cos(ph) * r * 0.8;
      // the ribbon breaks at each cross wall (one chloroplast per cell)
      const inCell = (u % f.cell) / f.cell;
      const [x, y] = P(u, v);
      const z = zAt(u) + front * r * 0.7;
      if (prev && inCell > 0.04 && inCell < 0.96) {
        const I = (0.42 + 0.48 * Math.max(0, front)) * f.shade;
        G.line(prev[0], prev[1], x, y, 2.1 + 0.6 * front, z, COL.green, I, 0.4, 0.2, 3);
        // pyrenoids: bright beads on the ribbon
        if (front > 0.6 && (Math.floor(u / (f.pitch * 0.5)) !== Math.floor((u - step) / (f.pitch * 0.5)))) G.disc(x, y, 2.4, z, [0.8, 1.0, 0.45], 0.8, 0.3, 0.6, 3);
      }
      prev = [x, y];
    }
  }
}
function drawClump(G, c, ox, oy, t) {
  const x = c.x + ox, y = c.y + oy;
  G.disc(x, y, c.r * 0.85, c.z, COL.brown, 0.07, c.r * 0.45);
  for (const g of c.g) {
    const tw = g.gold > 0.85 ? 0.5 + 0.5 * Math.sin(t * 1.7 + g.tw) : 1;
    G.disc(x + g.dx, y + g.dy, g.r, c.z + g.dz, mix(COL.brown, COL.gold, g.gold), (0.32 + 0.55 * g.gold) * tw, 0.6, g.gold > 0.55 ? 0.45 : 0.1, 2.5);
  }
}
function drawVorticella(G, v, p, t) {
  // the stalk: a coiled spring (its spasmoneme), tighter and wider coils as it contracts
  const L = Math.hypot(p.x1 - p.x0, p.y1 - p.y0) || 1, ux = (p.x1 - p.x0) / L, uy = (p.y1 - p.y0) / L, nx = -uy, ny = ux;
  const coils = 4 + 12 * p.c, amp = 1.2 + 5.5 * p.c, n = 36;
  let prev = [p.x0, p.y0];
  for (let i = 1; i <= n; i++) {
    const s = i / n, w = Math.sin(s * coils * TAU) * amp * Math.min(1, s * 6);
    const x = p.x0 + (p.x1 - p.x0) * s + nx * w, y = p.y0 + (p.y1 - p.y0) * s + ny * w, z = p.z0 + (p.z1 - p.z0) * s;
    G.line(prev[0], prev[1], x, y, 0.55, z, COL.edge, 0.65, 0, 0.25, 3);
    prev = [x, y];
  }
  // the bell: an inverted bell opening away from the stalk; contracted, it balls up and closes
  const b = v.bell, Lb = b * (2.2 - 0.9 * p.c), z = p.z1;
  const prof = [[0, 1.5], [Lb * 0.18, b * 0.25], [Lb * 0.45, b * 0.58], [Lb * 0.75, b * (0.9 - 0.25 * p.c)], [Lb, b * (1.08 - 0.5 * p.c)]];
  const P = (u, w) => [p.x1 + ux * u + nx * w, p.y1 + uy * u + ny * w];
  for (const s of [-1, 1]) for (let i = 1; i < prof.length; i++) {
    const [a1, a2] = P(prof[i - 1][0], s * prof[i - 1][1]), [b1, b2] = P(prof[i][0], s * prof[i][1]);
    G.line(a1, a2, b1, b2, 0.85, z, COL.white, 0.95, 0, 0.35, 3.5);
  }
  // the peristome (its rim) and the crown of cilia beating round it
  const rimW = prof[4][1];
  const [r1, r2] = P(Lb, -rimW), [s1, s2] = P(Lb, rimW), [m1, m2] = P(Lb + 3 * (1 - p.c), 0);
  G.line(r1, r2, m1, m2, 0.7, z, COL.white, 0.75, 0, 0.2, 3); G.line(m1, m2, s1, s2, 0.7, z, COL.white, 0.75, 0, 0.2, 3);
  if (p.c < 0.4) {
    for (let k = 0; k < 18; k++) {
      const w = (k / 17 - 0.5) * 2 * rimW, ang = (k / 17 - 0.5) * 2.2 + Math.sin(t * 14 + k * 0.7) * 0.25;
      const [c1, c2] = P(Lb + 1, w), len = 8 + 2 * Math.sin(t * 9 + k);
      G.line(c1, c2, c1 + (ux * Math.cos(ang) + nx * Math.sin(ang)) * len, c2 + (uy * Math.cos(ang) + ny * Math.sin(ang)) * len, 0.3, z, COL.edge, 0.55 * (1 - p.c * 2), 0, 0.15, 2);
    }
  }
  G.ell(...P(Lb * 0.55, 0), Math.atan2(uy, ux), Lb * 0.45, b * 0.6, z, COL.pale, 0.05, 3);
  for (const g of v.g) {
    const [gx, gy] = P(Lb * g.u, g.v * b * (0.3 + 0.6 * g.u));
    G.disc(gx, gy, g.r, z, g.gold > 0.4 ? COL.gold : COL.green, 0.55, 0.3, 0.3, 2);
  }
}
function drawDiatom(G, d, ox, oy, t) {
  const x = d.x + ox + Math.cos(d.a) * Math.sin(t * 0.2 + d.drift) * d.drift, y = d.y + oy + Math.sin(d.a) * Math.sin(t * 0.2 + d.drift) * d.drift;
  const ca = Math.cos(d.a), sa = Math.sin(d.a);
  const P = (u, v) => [x + ca * u - sa * v, y + sa * u + ca * v];
  if (d.rect) {
    // a Fragilaria ribbon: frustules side by side, each with a golden chloroplast band
    const hu = d.L / 2, hv = d.W / 2;
    const c = [P(-hu, -hv), P(hu, -hv), P(hu, hv), P(-hu, hv)];
    for (let i = 0; i < 4; i++) G.line(c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], 0.75, d.z, COL.edge, 0.85, 0, 0.3, 3);
    for (let k = 1; k < d.n; k++) { const u = -hu + (k / d.n) * d.L, [a1, a2] = P(u, -hv), [b1, b2] = P(u, hv); G.line(a1, a2, b1, b2, 0.45, d.z, COL.edge, 0.45); }
    for (let k = 0; k < d.n; k++) { const u = -hu + ((k + 0.5) / d.n) * d.L; G.ell(...P(u, 0), d.a + Math.PI / 2, hv * 0.8, d.L / d.n * 0.18, d.z, COL.gold, 0.45, 0.4, 0.3, 2); }
  } else {
    // a pennate diatom: a glassy boat, its raphe down the middle, two golden chloroplast plates
    G.ellRing(x, y, d.a, d.L / 2, d.W / 2, 0.85, d.z, COL.edge, 0.95, 0, 0.35, 3.5);
    G.ell(x, y, d.a, d.L / 2, d.W / 2, d.z, COL.pale, 0.04, 2);
    const [a1, a2] = P(-d.L * 0.42, 0), [b1, b2] = P(d.L * 0.42, 0);
    G.line(a1, a2, b1, b2, 0.4, d.z, COL.edge, 0.5);
    for (const s of [-1, 1]) G.ell(...P(0, s * d.W * 0.2), d.a, d.L * 0.36, d.W * 0.13, d.z, COL.gold, 0.55, 0.5, 0.3, 2.5);
    G.disc(x, y, 1.6, d.z, COL.white, 0.6, 0.3, 0.4, 2);
  }
}

// ---------------------------------------------------------------- the hunters
/** A soft red rim: the tell of an attack to come (a game marker over the image). */
const tell = (G, x, y, r, z, k) => { if (k > 0.01) G.ring(x, y, r, 1.6, z, COL.red, 0.75 * k, 1, 0.6 * k, 6); };
export function drawDileptus(G, D, t) {
  if (!D.placed || D.mode === 'parked') return;
  const ca = Math.cos(D.a), sa = Math.sin(D.a), z = D.z;
  const P = (u, v) => [D.x + ca * u - sa * v, D.y + sa * u + ca * v];
  // the flask: a body tapering into the neck, its outline luminous, a fringe of cilia
  const prof = [];
  for (let i = 0; i <= 16; i++) { const u = -140 + (i / 16) * 195, s = (u + 140) / 195; prof.push([u, DILEPTUS.R * Math.sin(Math.PI * Math.min(1, s * 1.15)) ** 0.7 * (1 - 0.55 * Math.max(0, s - 0.55) / 0.45)]); }
  for (const side of [-1, 1]) for (let i = 1; i < prof.length; i++) {
    const [a1, a2] = P(prof[i - 1][0], side * prof[i - 1][1]), [b1, b2] = P(prof[i][0], side * prof[i][1]);
    G.line(a1, a2, b1, b2, 0.9, z, COL.edge, 0.95, 0, 0.3, 3.5);
    if (i % 1 === 0) { const nx = -(b2 - a2), ny = b1 - a1, l = Math.hypot(nx, ny) || 1; const w = Math.sin(t * 16 + i * 0.9) * 2; G.line(b1, b2, b1 + (nx / l) * 7 * side + w, b2 + (ny / l) * 7 * side, 0.3, z, COL.edge, 0.4, 0, 0.1, 2); }
  }
  G.ell(...P(-50, 0), D.a, 85, DILEPTUS.R * 0.8, z, COL.pale, 0.05, 4);
  // its bead-chain macronucleus and golden food granules
  for (let k = 0; k < 9; k++) G.disc(...P(-110 + k * 13, Math.sin(k * 1.3) * 6), 4, z, COL.pale, 0.35, 0.6, 0.15, 2);
  for (let k = 0; k < 14; k++) G.disc(...P(-125 + ((k * 37) % 120), ((k * 23) % 40) - 20), 1.4 + (k % 3) * 0.6, z, COL.gold, 0.7, 0.2, 0.5, 2.5);
  // the trunk: long and supple, a row of toxicysts along its edge; its tip reddens in the wind-up
  const T = dileptusTrunk(D);
  const n = 18, [u0, u1] = DILEPTUS.trunk;
  const [bx, by] = P(u0, 0);
  let prev = [bx, by];
  const windK = D.mode === 'windup' ? Math.min(1, D.t / DILEPTUS.windup) : D.mode === 'strike' ? 1 : 0;
  for (let i = 1; i <= n; i++) {
    const s = i / n, ang = D.a + D.swing * s * s + Math.sin(t * 3 + s * 4) * 0.05;
    const L = (u1 - u0) / n;
    const x = prev[0] + Math.cos(ang) * L, y = prev[1] + Math.sin(ang) * L;
    const w = 9 * (1 - s) + 1.5;
    G.line(prev[0], prev[1], x, y, w * 0.35, z, COL.pale, 0.12, 1.5);
    for (const side of [-1, 1]) { const nx = -Math.sin(ang) * w * side, ny = Math.cos(ang) * w * side; G.line(prev[0] + nx, prev[1] + ny, x + nx, y + ny, 0.7, z, mix(COL.edge, COL.red, windK * s), 0.85, 0, 0.25 + windK * 0.5 * s, 3); }
    if (i % 2 === 0) G.disc(x - Math.sin(ang) * w * 0.4, y + Math.cos(ang) * w * 0.4, 1.1, z, mix(COL.white, COL.red, windK), 0.8, 0.2, 0.4, 2);
    prev = [x, y];
  }
  tell(G, T.tx, T.ty, 14 + 4 * Math.sin(t * 20), z, windK);
  if (D.mode === 'stunned') G.ring(D.x, D.y, 70 + D.t * 40, 1, z, COL.white, 0.4 * Math.max(0, 1 - D.t), 2);
}
export function drawDidinium(G, D, t) {
  if (!D.placed || D.mode === 'parked') return;
  const crouch = D.mode === 'crouch' ? Math.min(1, D.t / DIDINIUM.crouch) : 0;
  const ra = DIDINIUM.L / 2 * (1 - 0.14 * crouch), rb = DIDINIUM.R * (1 + 0.1 * crouch), z = D.z;
  const ca = Math.cos(D.a), sa = Math.sin(D.a);
  const P = (u, v) => [D.x + ca * u - sa * v, D.y + sa * u + ca * v];
  // a lunge leaves a streak
  if (D.mode === 'lunge') for (let k = 1; k <= 4; k++) G.ellRing(...P(-k * 22, 0), D.a, ra, rb, 0.8, z, COL.edge, 0.25 / k, 1.5);
  G.ellRing(D.x, D.y, D.a, ra, rb, 1.0, z, COL.edge, 1.0, 0, 0.35, 4);
  G.ell(D.x, D.y, D.a, ra * 0.92, rb * 0.9, z, COL.pale, 0.07, 4);
  // the two girdles of cilia (pectinelles): fringes at the sides, beating
  for (const [gu, k] of [[ra * 0.42, 0], [-ra * 0.08, 1]]) {
    const hv = rb * Math.sqrt(Math.max(0, 1 - (gu / ra) ** 2));
    const [a1, a2] = P(gu, -hv), [b1, b2] = P(gu, hv);
    G.line(a1, a2, b1, b2, 0.8, z, COL.edge, 0.3, 1, 0.1, 3);
    for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
      const v = side * (hv - 1 + i * 0.4), sw = Math.sin(t * 22 + i * 0.8 + k * 2) * 0.6;
      const [c1, c2] = P(gu + (i - 4) * 1.6, v);
      const dirx = -sa * side * Math.cos(sw) - ca * Math.sin(sw) * 0.8, diry = ca * side * Math.cos(sw) - sa * Math.sin(sw) * 0.8;
      G.line(c1, c2, c1 + dirx * 12, c2 + diry * 12, 0.35, z, COL.edge, 0.55, 0, 0.15, 2);
    }
  }
  // the horseshoe macronucleus and granules
  for (let k = 0; k < 9; k++) { const ang = -1.2 + k * 0.3; G.disc(...P(-8 + Math.cos(ang) * 16, Math.sin(ang) * 18), 3.2, z, COL.pale, 0.3, 0.8, 0.1, 2); }
  for (let k = 0; k < 12; k++) G.disc(...P(-ra * 0.7 + ((k * 31) % 60), ((k * 17) % 50) - 25), 1.3, z, COL.gold, 0.65, 0.2, 0.45, 2.2);
  // the snout (proboscis): a short cone with the mouth at its tip; it reddens as it crouches
  const [s1, s2] = P(ra, -7), [s3, s4] = P(ra, 7), [tx, ty] = P(ra + 16 + 8 * crouch, 0);
  const sc = mix(COL.white, COL.red, crouch);
  G.line(s1, s2, tx, ty, 0.9, z, sc, 1, 0, 0.4, 3); G.line(s3, s4, tx, ty, 0.9, z, sc, 1, 0, 0.4, 3);
  G.disc(tx, ty, 2.4, z, sc, 1, 0.3, 0.8 + crouch, 4);
  tell(G, tx, ty, 10 + 3 * Math.sin(t * 24), z, crouch);
  if (D.mode === 'stagger') G.ring(D.x, D.y, 50 + D.t * 50, 1, z, COL.white, 0.4 * (1 - D.t / 0.8), 2);
}
const GIANT_G = Array.from({ length: 300 }, (_, i) => { const r = rng(900 + i); return { a: r() * TAU, rho: Math.sqrt(r()), r: 1.2 + r() * 3.2, c: r(), sp: 0.02 + r() * 0.06 }; });
export function drawGiant(G, A, t, focusZ = 0) {
  if (!A.placed || A.mode === 'parked') return;
  const N = GIANT.N, zMid = (GIANT.zBottom + GIANT.top) / 2;
  const pts = [];
  for (let i = 0; i < N; i++) { const th = (i / N) * TAU, r = A.out[i]; pts.push([A.x + Math.cos(th) * r, A.y + Math.sin(th) * r, th]); }
  const pod = A.pods[0];
  const raiseAt = (th) => { if (!pod || !pod.hunt) return 0; const d = Math.atan2(Math.sin(th - pod.a), Math.cos(th - pod.a)); return pod.raise * Math.exp(-(d * d) / (pod.w * pod.w)) * Math.min(1, pod.len / 120); };
  // the outline: a granular bright edge; the clear hyaline cap of a reaching pseudopod glows (its tell)
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[(i + 1) % N], rz = raiseAt(p[2]);
    const z = zMid + rz * (GIANT.podTop - zMid) * 0.9;
    G.line(p[0], p[1], q[0], q[1], 1.3, z, mix([0.95, 0.9, 0.75], COL.amber, rz), 0.85 + rz * 0.4, 0, 0.35 + rz * 0.6, 4 + rz * 6);
    const k = 0.93, cx = A.x + (p[0] - A.x) * k, cy = A.y + (p[1] - A.y) * k, dx = A.x + (q[0] - A.x) * k, dy = A.y + (q[1] - A.y) * k;
    G.line(cx, cy, dx, dy, 0.6, z, COL.pale, 0.2);
  }
  // the body's haze through its depth, and the granules streaming inside
  G.disc(A.x, A.y, GIANT.R * 0.95, zMid, [0.55, 0.5, 0.4], 0.06, GIANT.R * 0.3);
  for (const g of GIANT_G) {
    const th = g.a + t * g.sp, i = Math.floor(((th % TAU + TAU) % TAU) / TAU * N) % N;
    const r = A.out[i] * g.rho * 0.88;
    const z = GIANT.zBottom + 20 + g.c * (GIANT.top - GIANT.zBottom - 20);
    G.disc(A.x + Math.cos(th) * r, A.y + Math.sin(th) * r, g.r, z, g.c < 0.6 ? COL.gold : g.c < 0.85 ? COL.white : COL.brown, 0.42 + 0.3 * g.c, 0.5, g.c < 0.4 ? 0.35 : 0.1, 2.5);
  }
  // the nucleus and food vacuoles
  const nx = A.x + Math.cos(A.t * 0.05) * 60, ny = A.y + Math.sin(A.t * 0.05) * 60;
  G.disc(nx, ny, 26, zMid, COL.pale, 0.08, 4); G.ring(nx, ny, 26, 1.3, zMid, COL.pale, 0.45, 1, 0.15, 3);
  for (let k = 0; k < 5; k++) { const a = k * 1.3 + A.t * 0.03, r = 90 + (k * 37) % 70; G.ring(A.x + Math.cos(a) * r, A.y + Math.sin(a) * r, 9 + k * 2, 1, zMid, COL.gold, 0.4, 0.8, 0.15, 3); G.disc(A.x + Math.cos(a) * r, A.y + Math.sin(a) * r, 5, zMid, COL.green, 0.3, 2); }
  if (pod && pod.hunt && pod.raise > 0.3) { const r = A.out[Math.round(((pod.a % TAU + TAU) % TAU) / TAU * N) % N]; tell(G, A.x + Math.cos(pod.a) * r, A.y + Math.sin(pod.a) * r, 24, GIANT.podTop * 0.6, (pod.raise - 0.3) * 0.8); }
}
export function drawTrap(G, T, t) {
  if (!T.placed) return;
  const ca = Math.cos(T.a), sa = Math.sin(T.a), z = TRAP.z;
  const P = (u, v) => [T.x + ca * u - sa * v, T.y + sa * u + ca * v];
  const ra = TRAP.a * (1 + 0.05 * T.flex), rb = TRAP.b * (1 + 0.1 * T.flex);
  const spent = T.state === 'spent';
  // the stalk to the stem, behind
  const [s1, s2] = P(-ra, 0), [s3, s4] = P(-ra - 260, 60);
  for (const off of [-5, 5]) G.line(s1, s2 + off, s3, s4 + off, 0.9, z - 20, COL.wall, 0.5, 0, 0.2, 3);
  // the sac: a translucent green bladder, mottled wall, glands inside, a brown mass of old catches
  G.ell(T.x, T.y, T.a, ra, rb, z, COL.leaf, 0.12, 12);
  G.ellRing(T.x, T.y, T.a, ra, rb, 1.6, z, COL.wall, spent ? 0.6 : 0.95, 0, 0.4, 5);
  G.ellRing(T.x, T.y, T.a, ra * 0.95, rb * 0.93, 0.7, z, COL.wall, 0.3);
  for (let k = 0; k < 46; k++) { const a = k * 2.399, rr = Math.sqrt((k + 0.5) / 46) * 0.88; G.ring(...P(Math.cos(a) * ra * rr, Math.sin(a) * rb * rr), 7 + (k % 4) * 2, 0.6, z, COL.wall, 0.16, 0.5); }
  for (let k = 0; k < 16; k++) { const a = k * 1.7, rr = 0.25 + (k % 5) * 0.12; const [gx, gy] = P(Math.cos(a) * ra * rr, Math.sin(a) * rb * rr); for (let q = 0; q < 4; q++) { const b = q * 1.571 + 0.4; G.line(gx, gy, gx + Math.cos(b) * 5, gy + Math.sin(b) * 5, 0.5, z, COL.gold, 0.5, 0, 0.2, 2); } }
  for (let k = 0; k < 18; k++) G.disc(...P(-ra * 0.5 + ((k * 17) % 50) - 25, ((k * 29) % 70) - 35), 4 + (k % 3) * 2, z, COL.brown, 0.4, 1.5, 0.15, 3);
  // the door: an oval at the front with its thick threshold; it quivers (and reddens) in the tell, swings in for the pulse
  const quiver = T.state === 'tell' ? Math.min(1, T.t / TRAP.tell) : 0;
  const open = T.state === 'pulse' ? 1 : 0;
  const [dx, dy] = P(ra * 0.96, 0);
  const dc = spent ? COL.pale : mix(COL.white, COL.red, quiver * 0.8);
  G.ellRing(dx, dy, T.a + Math.PI / 2, TRAP.door * (1 + 0.05 * Math.sin(t * 50) * quiver), TRAP.door * 0.45 * (1 - 0.7 * open), 2, z + 10, dc, 1, 0, 0.5 + quiver * 0.6, 5);
  G.line(...P(ra * 0.9, -TRAP.door), ...P(ra * 0.9, TRAP.door), 2.6, z + 10, COL.wall, 0.6, 0.5, 0.2, 3);
  tell(G, dx, dy, TRAP.door * 1.3 + 6 * Math.sin(t * 22), z + 10, quiver);
  // the antennae (branched, bristled, beaded) fanning forward, and the trigger hairs below the door
  for (const side of [-1, 1]) {
    let [px, py] = P(ra * 0.85, side * TRAP.door * 0.9);
    for (let k = 0; k < 6; k++) {
      const ang = T.a + side * (0.5 + k * 0.12) + Math.sin(t * 0.8 + k) * 0.03, L = 26;
      const nx = px + Math.cos(ang) * L, ny = py + Math.sin(ang) * L;
      G.line(px, py, nx, ny, 0.9, z + 20, COL.wall, 0.75, 0, 0.25, 3);
      for (const b of [-1, 1]) { const ba = ang + b * 0.9; G.line(nx, ny, nx + Math.cos(ba) * 18, ny + Math.sin(ba) * 18, 0.4, z + 20, COL.wall, 0.4); G.disc(nx + Math.cos(ba) * 18, ny + Math.sin(ba) * 18, 1.6, z + 20, COL.gold, 0.6, 0.3, 0.4, 2); }
      px = nx; py = ny;
    }
  }
  for (let k = 0; k < 6; k++) { const [hx, hy] = P(ra * 1.02, (k - 2.5) * 12), ang = T.a + (k - 2.5) * 0.12 + Math.sin(t * 30 + k) * 0.15 * quiver; G.line(hx, hy, hx + Math.cos(ang) * 16, hy + Math.sin(ang) * 16, 0.45, z + 10, COL.edge, 0.65, 0, 0.2, 2); }
  // the inflow you can see: streaks rushing into the door (faint over its reach while it quivers, strong in the pulse)
  const k = T.state === 'pulse' ? 1 : quiver * 0.35;
  if (k > 0.02) {
    const door = trapDoor(T);
    for (let i = 0; i < 70; i++) {
      const h = (i * 0.618) % 1, ang = T.a + (h - 0.5) * 2.6, ph = (t * (T.state === 'pulse' ? 2.6 : 0.8) + i * 0.137) % 1;
      const d = TRAP.reach * (1 - ph) + 20, L = 10 + 40 * k;
      const x = door.x + Math.cos(ang) * d, y = door.y + Math.sin(ang) * d;
      G.line(x, y, x - Math.cos(ang) * L, y - Math.sin(ang) * L, 0.5, door.z + ((i * 37) % 120) - 50, COL.white, 0.45 * k * (1 - ph * 0.5));
    }
  }
}

// ---------------------------------------------------------------- the crowd and the prey
export function drawBloom(G, B, rect, t) {
  if (!B.placed) return;
  const [x0, y0, x1, y1] = rect;
  for (const c of B.cells) {
    if (c.gone > 0 || c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
    G.ell(c.x, c.y, c.a, 5.2, 4, c.z, [0.35, 0.95, 0.25], 0.7, 0.4, 0.35, 2.5);
    G.ellRing(c.x, c.y, c.a, 5.6, 4.4, 0.5, c.z, COL.edge, 0.35);
    G.disc(c.x + Math.cos(c.a) * 3, c.y + Math.sin(c.a) * 3, 0.9, c.z, COL.red, 0.7, 0.2, 0.3, 1.5);
  }
}
export function drawPrey(G, R, rect, t) {
  const [x0, y0, x1, y1] = rect;
  for (const p of R.list) {
    if (p.x < x0 - 30 || p.x > x1 + 30 || p.y < y0 - 30 || p.y > y1 + 30) continue;
    const k = p.dying > 0 ? Math.max(0, 1 - p.dying / 0.5) : 1;
    if (p.kind === 'clump') {
      for (let i = 0; i < 9; i++) { const a = i * 2.4 + p.ph, r = (i % 3) * 2.6 * k + 1; G.line(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.x + Math.cos(a) * r + Math.cos(a + 1) * 2.2, p.y + Math.sin(a) * r + Math.sin(a + 1) * 2.2, 0.55, p.z, COL.gold, 0.8 * k, 0, 0.5, 2); }
      G.disc(p.x, p.y, p.r * k, p.z, COL.amber, 0.12 * k, 3);
    } else {
      G.ellRing(p.x, p.y, p.a, 13 * k, 6 * k, 0.8, p.z, COL.edge, 0.9 * k, 0, 0.3, 3);
      G.ell(p.x, p.y, p.a, 12 * k, 5 * k, p.z, COL.pale, 0.08 * k, 2);
      for (let i = 0; i < 4; i++) G.disc(p.x + Math.cos(p.a) * (i * 5 - 7), p.y + Math.sin(p.a) * (i * 5 - 7), 1.3, p.z, COL.gold, 0.6 * k, 0.2, 0.3, 2);
      // two flagella at the front
      for (const s of [-1, 1]) { const a = p.a + s * 0.4 + Math.sin(t * 20 + s) * 0.3; G.line(p.x + Math.cos(p.a) * 12, p.y + Math.sin(p.a) * 12, p.x + Math.cos(p.a) * 12 + Math.cos(a) * 14, p.y + Math.sin(p.a) * 12 + Math.sin(a) * 14, 0.3, p.z, COL.edge, 0.55 * k); }
    }
  }
}

// ---------------------------------------------------------------- the landmarks
/** The leaf fragment on the slide with its biofilm (the portal). sealed: the way on is not open yet. */
export function drawLeaf(G, L, t, { lawn = 1 } = {}) {
  if (!L.placed) return;
  const z = DEPTH.min + 8;
  const n = L.edge.length;
  G.disc(L.x, L.y, L.r * 0.9, z, COL.brown, 0.09, L.r * 0.4);
  for (let i = 0; i < n; i++) { const p = L.edge[i], q = L.edge[(i + 1) % n]; G.line(L.x + p[0], L.y + p[1], L.x + q[0], L.y + q[1], 1.3, z, COL.amber, 0.65, 0, 0.3, 4); }
  for (const v of L.veins) G.line(L.x + v[0], L.y + v[1], L.x + v[2], L.y + v[3], v[4], z, COL.gold, 0.28, 0.6);
  // the biofilm: rods and dots in microcolonies under a faint slime sheen (texture at 20x)
  if (lawn > 0.01) for (const b of L.lawn) G.line(L.x + b[0], L.y + b[1], L.x + b[0] + b[2], L.y + b[1] + b[3], 0.55, z + 3, b[4] ? COL.blue : COL.white, 0.35 * lawn, 0.1, 0.25, 1.5);
}
/** Lay a leaf fragment out (its edge, veins and lawn) round (x, y). */
export function makeLeaf(x, y, seed = 3) {
  const r = rng(seed), R = 270;
  const edge = [];
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, rr = R * (0.82 + 0.25 * r()); edge.push([Math.cos(a) * rr * 1.15, Math.sin(a) * rr * 0.85]); }
  const veins = [[-R * 0.9, 0, R * 0.95, 0, 2.2]];
  for (let k = -3; k <= 3; k++) if (k) { const u = k * R * 0.25; veins.push([u, 0, u + R * 0.25, (k % 2 ? 1 : -1) * R * 0.55, 1.2]); }
  const lawn = [];
  for (let i = 0; i < 520; i++) {
    const col = Math.floor(r() * 9), ca = col * 0.7, cr = R * 0.6 * Math.sqrt((col + 0.5) / 9);
    const a = r() * TAU, d = 30 * Math.sqrt(r());
    const x0 = Math.cos(ca) * cr * 1.1 + Math.cos(a) * d, y0 = Math.sin(ca) * cr * 0.8 + Math.sin(a) * d;
    const b = r() * TAU, L = r() < 0.3 ? 0.1 : 2 + r() * 2;
    lawn.push([x0, y0, Math.cos(b) * L, Math.sin(b) * L, r() < 0.3 ? 1 : 0]);
  }
  return { x, y, r: R, edge, veins, lawn, placed: true };
}
/** The way back: the giant amoeba's ... no: the amoeba's patch of slide (its slime trail and egested vacuoles). */
export function drawBack(G, B, t) {
  const z = DEPTH.min + 6;
  let prev = null;
  for (let i = 0; i <= 30; i++) {
    const s = i / 30, x = B.x - 260 + s * 520, y = B.y + Math.sin(s * 5 + 1) * 70;
    if (prev) G.line(prev[0], prev[1], x, y, 18, z, COL.pale, 0.05, 8);
    prev = [x, y];
  }
  for (let k = 0; k < 9; k++) { const x = B.x - 220 + k * 55, y = B.y + Math.sin(k * 0.55 * 5 / 9 * 9 + 1) * 70 + ((k * 13) % 30) - 15; G.ring(x, y, 6 + (k % 3) * 3, 1, z, COL.gold, 0.45, 0.6, 0.2, 3); }
}
/** The next world's creature at the portal: a magnetotactic spirillum (3 µm, two helical turns), a gold glint on the film. */
export const SPIRILLUM = { L: 3.0, amp: 0.32, turns: 1.9 };
export function drawSpirillum(G, s, t, k = 1) {
  const n = 12, ca = Math.cos(s.a), sa = Math.sin(s.a);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const u = i / n, ph = u * SPIRILLUM.turns * TAU + s.roll, v = Math.cos(ph) * SPIRILLUM.amp * Math.sin(Math.PI * u) ** 0.3;
    const x = s.x + ca * (u - 0.5) * SPIRILLUM.L - sa * v, y = s.y + sa * (u - 0.5) * SPIRILLUM.L + ca * v;
    if (prev) G.line(prev[0], prev[1], x, y, 0.27, s.z, [1, 0.92, 0.7], 1.2 * k, 0, 0.6 * k, 0.8);
    prev = [x, y];
  }
}
/** The spirillum's kin clump (shared/kin-clump.js), round it: k its presence, slime how much slime still hides it. */
export function drawKinClump(G, s, k, slime) {
  if (k <= 0.002) return;
  const z = s.z;
  for (const c of clumpLayout()) {
    const q = placeInFrame(c, s.x, s.y, s.a);
    if (c.kind === 'coccus') G.disc(q.x, q.y, c.r, z, COL.white, 0.9 * k, 0.05, 0.3 * k, 0.4);
    else if (c.kind === 'kin') {
      const ca = Math.cos(q.a), sa = Math.sin(q.a);
      let prev = null;
      for (let i = 0; i <= 6; i++) { const u = i / 6, v = Math.cos(u * 1.9 * TAU) * 0.3, x = q.x + ca * (u - 0.5) * c.L - sa * v, y = q.y + sa * (u - 0.5) * c.L + ca * v; if (prev) G.line(prev[0], prev[1], x, y, 0.27, z, COL.white, 0.9 * k); prev = [x, y]; }
    } else {
      const hx = Math.cos(q.a) * c.L / 2, hy = Math.sin(q.a) * c.L / 2;
      G.line(q.x - hx, q.y - hy, q.x + hx, q.y + hy, c.r, z, COL.white, 0.9 * k, 0.05);
    }
  }
  // the slime they sit in: soft lumpy lenses (a dark mass in phase contrast)
  for (const [u, v, r] of [[0, 0, 16], [9, 7, 10], [-7, 10, 9], [-10, -7, 10], [7, -10, 8], [-14, 2, 6], [14, -1, 6]]) {
    const q = placeInFrame({ u, v, da: 0 }, s.x, s.y, s.a);
    G.disc(q.x, q.y, r, z, COL.white, 0.5 * k * slime, r * 0.4);
  }
}
