// Standing the small springtails on the moss (the owner, 2026-11-04: "are
// the springtails and similar ambient creatures clipping through the ground?
// I feel like they are"). They were: the grazing groups (life.js) set the
// body's centre 4 µm above the floor at one point, and the body is ~60 µm
// tall below its centre (legs to -54, the belly to -30), so every one stood
// sunk to its back in the moss (52 µm on average, 68-87 µm at worst); the
// thickets' crowd (shared/crowd.js) sat its members level on a slope, so the
// downhill feet went up to 19 µm in. Neither looked at the grains and litter
// on the floor, which they walked through.
//
// - standSpringtail: the six feet sample the ground (floorH, or `ground`
//   with the grains and litter), a plane is fitted to them, the body stands
//   square to it at its legs' height, and whatever still dips (a foot, the
//   belly, the head, the nose at a hop's landing) lifts the body clear.
// - createGround: the floor plus the rigid things on it (grains, litter; not
//   the moss, which bends), cast once per 24 µm lattice point and kept: the
//   tile never changes, so each point is cast once, ever.
// - createKeepOut: the big grains and the moss stems are walked round, not
//   through (a push out of each disc; continuous, so the groups stay a pure
//   function of their place and the clock).
import * as THREE from '../shared/vendor/three.module.min.js';
import { floorH } from './world.js';

/**
 * The springtail's anatomy as springtailGeometry (thicket.js) builds it, in its
 * own frame (head at +x, up +y, µm at scale 1): the foot tips (x, z), how far
 * below the origin they reach (the leg rods end at -54, their rims to -55.5), and points on the
 * underside (x, y) that must stay out of the ground (the ventral tube, the
 * furcula, the belly and its flanks, the head; x, y, z).
 */
export const SPRINGTAIL = {
  feet: [[58, 52], [58, -52], [20, 52], [20, -52], [-18, 52], [-18, -52]],
  stand: 55.5,
  under: [[14, -39, 0], [-45, -37, 0], [-20, -31, 0], [50, -29, 0], [78, -24, 0], [-80, -16, 0], [104, -12, 0], [-94, 0, 0],
    [-30, -24, 26], [-30, -24, -26], [36, -22, 26], [36, -22, -26], [-70, -12, 20], [-70, -12, -20]],
};

const _up = new THREE.Vector3(0, 1, 0), _n = new THREE.Vector3(), _qy = new THREE.Quaternion(), _qp = new THREE.Quaternion();
const _ax = new THREE.Vector3(), _v = new THREE.Vector3();
const FX = SPRINGTAIL.feet.map((f) => f[0]), FZ = SPRINGTAIL.feet.map((f) => f[1]);
const UBAR = FX.reduce((a, b) => a + b, 0) / FX.length;
const SUU = FX.reduce((a, u) => a + (u - UBAR) ** 2, 0), SWW = FZ.reduce((a, w) => a + w * w, 0);
const G = new Float64Array(6);

/**
 * Stand a springtail at (x, z) facing `yaw` (about up: its head toward
 * (cos yaw, -sin yaw)), scaled (sx along, sy up, sz across), on `ground(x, z)`.
 * pitch: nose up (radians, after standing square to the ground); lift: µm
 * above where it stands (a hop). Writes out.y (the body origin's height) and
 * out.q (its rotation), and returns out; out.pen is how far the lowest point
 * would have dipped had nothing lifted it (for the checks).
 */
export function standSpringtail(ground, x, z, yaw, sx, sy, sz, pitch = 0, lift = 0, out = { y: 0, q: new THREE.Quaternion(), pen: 0, n: new THREE.Vector3() }) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // head direction f = (c, -s), left side l = (s, c) (local +z), both in xz
  let a = 0, b = 0, w = 0;
  for (let i = 0; i < 6; i++) {
    const u = FX[i] * sx, v = FZ[i] * sz;
    const g = ground(x + c * u + s * v, z - s * u + c * v);
    G[i] = g; a += g;
  }
  a /= 6;
  for (let i = 0; i < 6; i++) { b += (FX[i] - UBAR) * G[i]; w += FZ[i] * G[i]; }
  b /= SUU * sx; w /= SWW * sz; // slopes (height per µm) along the head and across
  // a springtail stands on what is under it, but never tips past ~40°
  const sl = Math.hypot(b, w), mx = 0.85;
  if (sl > mx) { b *= mx / sl; w *= mx / sl; }
  _n.set(-b * c - w * s, 1, b * s - w * c).normalize();
  out.n.copy(_n);
  const q = out.q.setFromUnitVectors(_up, _n);
  q.multiply(_qy.setFromAxisAngle(_ax.set(0, 1, 0), yaw));
  if (pitch) q.multiply(_qp.setFromAxisAngle(_ax.set(0, 0, 1), pitch));
  // the plane under the origin, and the legs' height along its normal
  const h0 = a - b * UBAR * sx;
  let y = h0 + (SPRINGTAIL.stand * sy) / _n.y;
  // anything still in the ground (the feet over a hump, the belly over a grain,
  // the nose pitched down) lifts the body clear
  let need = -Infinity;
  for (const [u, v] of SPRINGTAIL.feet) {
    _v.set(u * sx, -SPRINGTAIL.stand * sy, v * sz).applyQuaternion(q);
    need = Math.max(need, ground(x + _v.x, z + _v.z) - (y + _v.y));
  }
  for (const [u, v, w] of SPRINGTAIL.under) {
    _v.set(u * sx, v * sy, w * sz).applyQuaternion(q);
    need = Math.max(need, ground(x + _v.x, z + _v.z) - (y + _v.y));
  }
  out.pen = need;
  if (need > 0) y += need;
  out.y = y + lift;
  return out;
}

/**
 * The floor plus the rigid things lying on it, as a height: cast(origin, dir,
 * far, skipFloor, skip) is the world's colliders' cast (world.js); skip: the
 * kinds walked through (the moss: it bends). Each 24 µm lattice point is cast
 * once, from `band` µm above the floor (what stands higher is overhead: a
 * springtail walks under it), and kept; between points the extra height is
 * interpolated (held up near the highest corner), so a grain is a dome and a
 * flake's edge a short ramp.
 */
export function createGround(cast, { cell = 16, band = 200, skip = new Set(['stem', 'blade']), maxChunks = 400 } = {}) {
  // the lattice in chunks of 64 x 64 points (a typed array each, NaN: not cast yet)
  const CH = 64, chunks = new Map();
  const o = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  const stats = { casts: 0, chunks: 0 };
  let lastK = NaN, lastA = null;
  function extra(i, j) {
    const ci = i >> 6, cj = j >> 6, k = (ci + 32768) * 65536 + (cj + 32768);
    let a;
    if (k === lastK) a = lastA;
    else {
      a = chunks.get(k);
      if (!a) {
        if (chunks.size >= maxChunks) chunks.clear();
        chunks.set(k, (a = new Float32Array(CH * CH).fill(NaN)));
        stats.chunks++;
      }
      lastK = k; lastA = a;
    }
    const q = (i & 63) * CH + (j & 63);
    let e = a[q];
    if (e !== e) {
      const x = i * cell, z = j * cell, f = floorH(x, z);
      o.set(x, f + band, z);
      const h = cast(o, down, band + 20, true, skip);
      stats.casts++;
      e = a[q] = h ? Math.max(0, h.point.y - f) : 0;
    }
    return e;
  }
  function ground(x, z) {
    const px = x / cell, pz = z / cell, i = Math.floor(px), j = Math.floor(pz), fx = px - i, fz = pz - j;
    const e00 = extra(i, j), e10 = extra(i + 1, j), e01 = extra(i, j + 1), e11 = extra(i + 1, j + 1);
    const f = floorH(x, z);
    if (e00 === 0 && e10 === 0 && e01 === 0 && e11 === 0) return f;
    // (the higher of the interpolation and most of the highest corner: a grain's
    // faceted flank is steeper than a lattice cell, and interpolating alone left
    // the belly up to ~17 µm inside one; this errs a few µm high, never low)
    const bil = e00 + (e10 - e00) * fx + (e01 - e00) * fz + (e00 - e10 - e01 + e11) * fx * fz;
    return f + Math.max(bil, Math.max(e00, e10, e01, e11) - 6);
  }
  ground.stats = stats;
  return ground;
}

/**
 * Discs walked round: discs [{ x, z, r }] in the tile's coordinates (repeated
 * every `tile` µm). push(x, z, out) moves the point out of any disc it is in
 * (to its edge, the nearest way) and returns out ({ x, z }).
 */
export function createKeepOut(discs, tile, cell = 400) {
  const n = Math.max(1, Math.round(tile / cell)), C = tile / n;
  const grid = Array.from({ length: n * n }, () => []);
  const wrapI = (i) => ((i % n) + n) % n;
  for (const d of discs) {
    const i0 = Math.floor((d.x - d.r) / C), i1 = Math.floor((d.x + d.r) / C);
    const j0 = Math.floor((d.z - d.r) / C), j1 = Math.floor((d.z + d.r) / C);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) grid[wrapI(i) * n + wrapI(j)].push(d);
  }
  const wrapD = (v) => v - tile * Math.round(v / tile);
  return {
    discs,
    push(x, z, out = { x: 0, z: 0 }) {
      out.x = x; out.z = z;
      for (let pass = 0; pass < 6; pass++) {
        const tx = wrapD(out.x), tz = wrapD(out.z);
        const list = grid[wrapI(Math.floor(tx / C)) * n + wrapI(Math.floor(tz / C))];
        let moved = false;
        for (const d of list) {
          const dx = wrapD(tx - d.x), dz = wrapD(tz - d.z), l = Math.hypot(dx, dz);
          if (l >= d.r) continue;
          const k = l > 1e-6 ? (d.r - l) / l : 0;
          if (k) { out.x += dx * k; out.z += dz * k; } else out.x += d.r;
          moved = true;
        }
        if (!moved) break;
      }
      return out;
    },
  };
}
