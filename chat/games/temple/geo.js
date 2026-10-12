// Temple Dash: the walkway as triangles for the renderer (temple/gl.js).
// Built for a window of the temple around the runner the camera follows and
// rebuilt as they move on. Each batch is a flat list of vertices, six floats
// each: x, y, z, u, v, shade; three vertices per triangle.
//   path    the walkway's top (temple-path texture)
//   wall    its sides dropping into the jungle, kerbs, posts and corner pillars (temple-wall)
//   jungle  the canopy far below (drawn tile)
//   trees   tall trees rising from it, as crossed quads (drawn atlas, alpha-tested)

import { HW, START_BACK, pointAt, heading, mulberry32 } from './path.js';

export const DROP = 22;           // metres down to the jungle canopy
export const CURB_H = 0.32, CURB_W = 0.3;
const PATH_TILE = HW * 4;         // metres of walkway per path texture repeat
const WALL_TILE = 4;
const CHUNK = 6;
const LIGHT = (() => { const l = [0.55, 0.62, 0.56]; const n = Math.hypot(...l); return l.map(v => v / n); })();

function batch() {
  const a = [];
  return {
    a,
    tri(p, q, r) { a.push(...p, ...q, ...r); },
    // A quad from four corners, each [x, y, z, u, v, shade], in order round it.
    quad(p, q, r, s) { a.push(...p, ...q, ...r, ...p, ...r, ...s); },
  };
}
const lit = (nx, ny, nz) => 0.5 + 0.5 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);

// The solid stretches of a segment between a and b, skipping its gaps.
function solid(seg, a, b) {
  const out = [];
  let from = a;
  for (const o of seg.obs) {
    if (o.type !== 'gap') continue;
    if (o.s + o.len <= from || o.s >= b) continue;
    if (o.s > from) out.push([from, o.s]);
    from = o.s + o.len;
  }
  if (from < b) out.push([from, b]);
  return out;
}

export function buildGeometry(temple, focusS, focusG, opts = {}) {
  const back = opts.back ?? 40, ahead = opts.ahead ?? 330;
  const B = { path: batch(), wall: batch(), jungle: batch(), trees: batch() };
  const lo = focusS - back, hi = focusS + ahead;
  const k0 = Math.max(0, focusG - 1);
  for (let k = k0; k <= focusG + 4; k++) {
    const seg = temple.seg(k);
    if (seg.S > hi) break;
    const a0 = k === 0 ? -START_BACK : seg.S + HW, a1 = seg.D + HW;
    const A = Math.max(a0, lo), Bn = Math.min(a1, hi);
    if (Bn <= A) continue;
    const [hx, hz] = heading(seg.yaw);
    const rx = -hz, rz = hx;          // right
    const P = (s, x, y) => { const p = pointAt(seg, s, x); return [p.x, y, p.z]; };
    const pieces = solid(seg, A, Bn);
    for (const [p, q] of pieces) {
      for (let s = p; s < q - 1e-6; s += CHUNK) {
        const e = Math.min(q, s + CHUNK);
        const v0 = (s - seg.S) / PATH_TILE, v1 = (e - seg.S) / PATH_TILE;
        // Top.
        B.path.quad([...P(s, -HW, 0), 0, v0, 1], [...P(e, -HW, 0), 0, v1, 1], [...P(e, HW, 0), 1, v1, 1], [...P(s, HW, 0), 1, v0, 1]);
        // Sides, darker towards the depths.
        for (const sd of [-1, 1]) {
          const sh = lit(rx * sd, 0, rz * sd);
          const u0 = (s - seg.S) / WALL_TILE, u1 = (e - seg.S) / WALL_TILE;
          B.wall.quad(
            [...P(s, sd * HW, 0), u0, 0, sh], [...P(e, sd * HW, 0), u1, 0, sh],
            [...P(e, sd * HW, -DROP), u1, DROP / WALL_TILE, sh * 0.35], [...P(s, sd * HW, -DROP), u0, DROP / WALL_TILE, sh * 0.35],
          );
        }
      }
      // Faces across the ends of each solid stretch (gap edges, the far end, the start).
      for (const [at, dirn] of [[p, -1], [q, 1]]) {
        if ((at === A && A !== a0) || (at === Bn && Bn !== a1)) continue;   // cut by the window, not a real edge
        const sh = lit(hx * dirn, 0, hz * dirn);
        B.wall.quad(
          [...P(at, -HW, 0), 0, 0, sh], [...P(at, HW, 0), (2 * HW) / WALL_TILE, 0, sh],
          [...P(at, HW, -DROP), (2 * HW) / WALL_TILE, DROP / WALL_TILE, sh * 0.35], [...P(at, -HW, -DROP), 0, DROP / WALL_TILE, sh * 0.35],
        );
      }
    }
    // Kerbs along both edges; the one on the turn side stops where the next
    // segment leaves, and one runs across the far end.
    const box = (s0, s1, x0, x1, h, shade = 1, y0 = 0) => {
      const c = (s, x, y) => P(s, x, y);
      const l0 = (s0 - seg.S) / WALL_TILE, l1 = (s1 - seg.S) / WALL_TILE;
      const top = [c(s0, x0, h), c(s1, x0, h), c(s1, x1, h), c(s0, x1, h)];
      const uvTop = [[l0, x0 / WALL_TILE], [l1, x0 / WALL_TILE], [l1, x1 / WALL_TILE], [l0, x1 / WALL_TILE]];
      B.wall.quad(...top.map((p, i) => [...p, ...uvTop[i], 1.08 * shade]));
      const face = (sa, xa, sb, xb, nx, nz) => {
        const sh = lit(nx, 0, nz) * shade;
        const len = Math.hypot(sb - sa, xb - xa) / WALL_TILE, ht = (h - y0) / WALL_TILE;
        B.wall.quad([...c(sa, xa, h), 0, 0, sh], [...c(sb, xb, h), len, 0, sh], [...c(sb, xb, y0), len, ht, sh * (y0 < 0 ? 0.35 : 0.75)], [...c(sa, xa, y0), 0, ht, sh * (y0 < 0 ? 0.35 : 0.75)]);
      };
      face(s0, x0, s1, x0, -rx, -rz);
      face(s0, x1, s1, x1, rx, rz);
      face(s0, x0, s0, x1, -hx, -hz);
      face(s1, x0, s1, x1, hx, hz);
    };
    const turnSide = seg.dir;   // +1: the right edge opens at the corner
    for (const sd of [-1, 1]) {
      const end = sd === turnSide ? seg.D - HW : a1;
      for (const [p, q] of solid(seg, A, Math.min(Bn, end))) {
        const x0 = sd < 0 ? -HW : HW - CURB_W, x1 = sd < 0 ? -HW + CURB_W : HW;
        for (let s = p; s < q - 1e-6; s += CHUNK) box(s, Math.min(q, s + CHUNK), x0, x1, CURB_H);
        // Short posts on the kerb now and then.
        for (let s = Math.ceil(p / 18) * 18; s < q - 1; s += 18) box(s - 0.3, s + 0.3, x0 - 0.12, x1 + 0.12, 0.95, 0.95);
      }
    }
    if (a1 <= Bn) {
      box(a1 - CURB_W, a1, -HW, HW, CURB_H);
      // Towers rising from the jungle at the far corners of the corner.
      for (const sd of [-1, 1]) {
        const xc = sd * (HW + 0.45);
        box(a1 - 0.2, a1 + 1.1, xc - 0.65, xc + 0.65, 3.6, 0.95, -DROP);
        box(a1 - 0.35, a1 + 1.25, xc - 0.8, xc + 0.8, 3.9, 1.05, 3.6);
      }
    }
    if (k === 0 && A === a0) box(a0, a0 + CURB_W, -HW, HW, CURB_H);
    // Trees beside the walkway (none where the next segment leaves the corner)
    // and a few beyond its far end.
    const r = mulberry32((temple.seed * 31 + k * 977) >>> 0);
    const tree = (s, x) => {
      const top = -7 + r() * 12, ht = top + DROP, wd = ht * 0.5;
      const cell = Math.floor(r() * 3);
      const u0 = cell / 3 + 0.002, u1 = (cell + 1) / 3 - 0.002;
      const base = P(s, x, -DROP), sh = 0.85 + r() * 0.2;
      for (const [ax, az] of [[hx, hz], [rx, rz]]) {
        const l = [base[0] - (ax * wd) / 2, base[2] - (az * wd) / 2], rr = [base[0] + (ax * wd) / 2, base[2] + (az * wd) / 2];
        B.trees.quad([l[0], top, l[1], u0, 0, sh], [rr[0], top, rr[1], u1, 0, sh], [rr[0], -DROP, rr[1], u1, 1, sh * 0.6], [l[0], -DROP, l[1], u0, 1, sh * 0.6]);
      }
    };
    for (let s = Math.max(a0, seg.S) + r() * 4; s < a1; s += 5 + r() * 6) {
      for (const sd of [-1, 1]) {
        const x = sd * (HW + 3.5 + r() * 15);
        if (s < A - 10 || s > Bn + 10) continue;
        if (sd === turnSide && s > seg.D - HW - 14) continue;
        tree(s, x);
      }
    }
    if (a1 <= Bn + 10) for (let i = 0; i < 4; i++) tree(a1 + 4 + r() * 10, (r() - 0.5) * 22);
  }
  // The jungle canopy: one big quad under everything.
  const f = temple.segAt ? pointAt(temple.seg(focusG), focusS, 0) : { x: 0, z: 0 };
  const T = 24, R = 420;
  const ox = Math.round(f.x / T) * T, oz = Math.round(f.z / T) * T;
  const J = (dx, dz) => [ox + dx, -DROP - 0.4, oz + dz, dx / T, dz / T, 1];
  B.jungle.quad(J(-R, -R), J(R, -R), J(R, R), J(-R, R));
  return { path: new Float32Array(B.path.a), wall: new Float32Array(B.wall.a), jungle: new Float32Array(B.jungle.a), trees: new Float32Array(B.trees.a) };
}
