// Leaf cell patterns, written twice: in JavaScript for the gameplay (where the
// claws can hook, which cell the stylets pierce) and in GLSL for the picture,
// so a foothold is always on a wall you can see.
//
// Units throughout the prototype: 1 unit = 100 µm.
//
// 'lamina'   a typical moss leaf blade, one cell thick: long fusiform cells in
//            rows (about 20 × 100 µm, lax-celled like Bryum), a midrib (costa)
//            of narrow cells, raised cell walls. Chloroplasts line each cell.
// 'sphagnum' a Sphagnum branch leaf: big empty hyaline cells (water stores,
//            with pores and spiral fibrils) framed by a net of narrow green
//            chlorophyllose cells. The net is what the claws hook.

export const LAMINA = { cellW: 0.2, cellL: 1.0, slant: 0.9, costaW: 0.22, costaCellW: 0.075, costaCellL: 1.8 };
export const SPHAG = { a: 1.25, b: 0.34 };

const fract = (x) => x - Math.floor(x);
export const hash1 = (n) => fract(Math.sin(n * 127.1 + 11.7) * 43758.5453);
const hash2 = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);

/**
 * Lamina cell under (u, v): distance to the nearest wall (units), the cell's
 * row/col, and which way that wall runs ('long' along the leaf or 'cross').
 */
export function laminaCell(u, v) {
  const costa = Math.abs(v) < LAMINA.costaW;
  const w = costa ? LAMINA.costaCellW : LAMINA.cellW;
  const L = costa ? LAMINA.costaCellL : LAMINA.cellL;
  const r = Math.floor(v / w);
  const lv = v - r * w;
  const o = hash1(r + (costa ? 517 : 0)) * L;
  // Pointed (fusiform) cell ends: the cross wall is a chevron.
  const s = LAMINA.slant;
  const uu = u + o - s * Math.abs(lv - w / 2);
  const c = Math.floor(uu / L);
  const lu = uu - c * L;
  const dv = Math.min(lv, w - lv);
  const du = Math.min(lu, L - lu) / Math.sqrt(1 + s * s);
  let dist = Math.min(dv, du);
  // The costa margin is a wall too.
  const dc = Math.abs(Math.abs(v) - LAMINA.costaW);
  dist = Math.min(dist, dc);
  return { dist, kind: du < dv ? 'cross' : 'long', row: r, col: c, costa, junction: Math.hypot(du, dv) };
}

function sphagNearest(u, v) {
  const { a, b } = SPHAG;
  const j0 = Math.floor(v / b);
  let m1 = 9, m2 = 9, ci = 0, cj = 0;
  for (let j = j0 - 1; j <= j0 + 2; j++) {
    const off = (j & 1) ? a / 2 : 0;
    const i0 = Math.floor((u - off) / a);
    for (let i = i0 - 1; i <= i0 + 2; i++) {
      const cx = i * a + off + a / 2, cy = j * b;
      // Rhombic-elliptic metric: hyaline cells are long, pointed rhombs.
      const du = (u - cx) / (a * 0.5), dv = (v - cy) / (b * 0.5);
      const m = Math.pow(Math.pow(Math.abs(du), 1.4) + Math.pow(Math.abs(dv), 1.4), 1 / 1.4);
      if (m < m1) { m2 = m1; m1 = m; ci = i; cj = j; } else if (m < m2) m2 = m;
    }
  }
  return { m1, m2, ci, cj };
}

export function sphagCell(u, v) {
  const n = sphagNearest(u, v);
  const dist = (n.m2 - n.m1) * SPHAG.b * 0.25;
  return { dist, kind: 'net', row: n.cj, col: n.ci, costa: false, junction: dist };
}

export const cellAt = (kind, u, v) => (kind === 'sphagnum' ? sphagCell(u, v) : laminaCell(u, v));

/**
 * Find a wall for a claw near (u, v) within radius R: a coarse search, then a
 * few Newton steps onto the wall line. Returns { u, v, dist, quality } or null.
 * quality 0..1: junctions and walls across the pull direction hold best.
 */
export function snapToWall(kind, u, v, R, pullU = 1, pullV = 0) {
  let best = null, bestScore = Infinity;
  const N = 6;
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
    const su = u + (i / N) * R, sv = v + (j / N) * R;
    const d0 = Math.hypot(su - u, sv - v);
    if (d0 > R) continue;
    const c = cellAt(kind, su, sv);
    const score = c.dist * 6 + d0 * 0.6;
    if (score < bestScore) { bestScore = score; best = [su, sv]; }
  }
  if (!best) return null;
  let [pu, pv] = best;
  const e = 0.004;
  for (let k = 0; k < 4; k++) {
    const f = cellAt(kind, pu, pv).dist;
    if (f < 0.003) break;
    const gu = (cellAt(kind, pu + e, pv).dist - cellAt(kind, pu - e, pv).dist) / (2 * e);
    const gv = (cellAt(kind, pu, pv + e).dist - cellAt(kind, pu, pv - e).dist) / (2 * e);
    const g2 = gu * gu + gv * gv;
    if (g2 < 1e-6) break;
    pu -= (f * gu) / g2; pv -= (f * gv) / g2;
  }
  const c = cellAt(kind, pu, pv);
  if (c.dist > 0.02 || Math.hypot(pu - u, pv - v) > R * 1.15) return null;
  // Wall direction from the gradient: claws hook best across their pull.
  const gu = cellAt(kind, pu + 0.03, pv).dist - cellAt(kind, pu - 0.03, pv).dist;
  const gv = cellAt(kind, pu, pv + 0.03).dist - cellAt(kind, pu, pv - 0.03).dist;
  const gl = Math.hypot(gu, gv) || 1, pl = Math.hypot(pullU, pullV) || 1;
  const across = Math.abs((gu * pullU + gv * pullV) / (gl * pl));
  const junction = c.junction < 0.05 ? 0.25 : 0;
  return { u: pu, v: pv, dist: c.dist, quality: Math.min(1, 0.55 + 0.35 * across + junction) };
}

// ---------------------------------------------------------------- GLSL
// Same functions for the shaders. Returns vec4(dist, row, col, isCosta).
export const PATTERN_GLSL = /* glsl */ `
float hash1(float n) { return fract(sin(n * 127.1 + 11.7) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
const float CELL_W = ${LAMINA.cellW.toFixed(4)};
const float CELL_L = ${LAMINA.cellL.toFixed(4)};
const float SLANT = ${LAMINA.slant.toFixed(4)};
const float COSTA_W = ${LAMINA.costaW.toFixed(4)};
const float COSTA_CW = ${LAMINA.costaCellW.toFixed(4)};
const float COSTA_CL = ${LAMINA.costaCellL.toFixed(4)};
const float SPH_A = ${SPHAG.a.toFixed(4)};
const float SPH_B = ${SPHAG.b.toFixed(4)};

// xy: local position within the cell (along, across, both 0..size); z,w size.
vec4 laminaCell(vec2 p, out vec4 local) {
  bool costa = abs(p.y) < COSTA_W;
  float w = costa ? COSTA_CW : CELL_W;
  float L = costa ? COSTA_CL : CELL_L;
  float r = floor(p.y / w);
  float lv = p.y - r * w;
  float o = hash1(r + (costa ? 517.0 : 0.0)) * L;
  float uu = p.x + o - SLANT * abs(lv - w * 0.5);
  float c = floor(uu / L);
  float lu = uu - c * L;
  float dv = min(lv, w - lv);
  float du = min(lu, L - lu) / sqrt(1.0 + SLANT * SLANT);
  float d = min(min(dv, du), abs(abs(p.y) - COSTA_W));
  local = vec4(lu, lv, L, w);
  return vec4(d, r, c, costa ? 1.0 : 0.0);
}

// Sphagnum: x = wall distance, y,z = cell id, w = metric distance from cell centre (0 centre .. ~1 wall).
vec4 sphagCell(vec2 p, out vec2 rel) {
  float j0 = floor(p.y / SPH_B);
  float m1 = 9.0, m2 = 9.0; vec2 id = vec2(0.0); rel = vec2(0.0);
  for (int dj = -1; dj <= 2; dj++) {
    float j = j0 + float(dj);
    float off = mod(j, 2.0) > 0.5 ? SPH_A * 0.5 : 0.0;
    float i0 = floor((p.x - off) / SPH_A);
    for (int di = -1; di <= 2; di++) {
      float i = i0 + float(di);
      vec2 c = vec2(i * SPH_A + off + SPH_A * 0.5, j * SPH_B);
      vec2 d = (p - c) / vec2(SPH_A * 0.5, SPH_B * 0.5);
      float m = pow(pow(abs(d.x), 1.4) + pow(abs(d.y), 1.4), 1.0 / 1.4);
      if (m < m1) { m2 = m1; m1 = m; id = vec2(i, j); rel = p - c; } else if (m < m2) { m2 = m; }
    }
  }
  return vec4((m2 - m1) * SPH_B * 0.25, id, m1);
}
`;
