// The mite's moss cushion, in µm: humus with mineral grains (20-300 µm),
// flakes of leaf litter, moss shoots with spiralling lanceolate leaves (the
// lowest ones arch down to the floor and work as ramps), fungal hyphae strung
// between surfaces, and scattered spores and pollen.
//
// The moss is one scenery tile TILE µm square, repeated in every direction
// (the encounter pattern's rings reach ~31 mm out: micro/design/
// encounter-pattern.md, layout.js). Nothing is built twice:
// - the floor's height is periodic (its value-noise lattices wrap), so copies
//   meet seamlessly, and the triplanar textures repeat a whole number of times
//   across a tile;
// - walking queries go through a periodic broadphase (each collider is binned
//   in wrapped cells, and a ray meets each copy it reaches at that copy's
//   shift), plus a set of fixed colliders (the giant springtail) at their real
//   place;
// - every view draws the tile's copies round its target (setView): the
//   originals and proxies of each mesh that share its geometry, culled copy by
//   copy and, inside the BatchedMeshes, object by object.
// Exclusion discs (exclude.set) take moss shoots (stem and leaves) out where
// something stands in their place (the thickets, the portal's arena, the giant
// springtail): they are not drawn there and cannot be walked on there.
// The grains, litter, stems and leaves are one BatchedMesh per material
// (batched()): one draw per view and copy, culled object by object. The hyphae
// are merged per material and per spatial chunk (CHUNK µm).
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS, createObjectCut } from './sem.js';
import { rng, hash } from './textures.js';
import { createFoliage } from '../shared/techniques/mite-foliage.js';
import { BOUNDS, HALF } from './layout.js';

export { BOUNDS, HALF };
/** The scenery tile (µm): a whole number of floor-texture repeats (320 and 160 µm). */
export const TILE = 9600;
const HT = TILE / 2;
/** The copy (tile index) a coordinate lies in, and a difference wrapped into (-TILE/2, TILE/2]. */
export const tileOf = (v) => Math.round(v / TILE);
export const wrapD = (d) => d - TILE * Math.round(d / TILE);
/** The copy of tile point p nearest `ref` (both {x, z}; y kept): p shifted by whole tiles. */
export function nearImage(p, ref, out = new THREE.Vector3()) {
  return out.set(p.x + TILE * Math.round((ref.x - p.x) / TILE), p.y, p.z + TILE * Math.round((ref.z - p.z) / TILE));
}
const CHUNK = 1600; // µm: render chunks (frustum culled one by one): six to a tile's side
// How far from a view's target the grains, litter and moss are drawn (µm): as
// far as the old bounded patch reached at the start; past it the SEM backdrop
// (silhouetted shoots) and the floor carry on to the horizon.
const DRAW_R = 8000;
const view = { x: 0, z: 0 }; // the current view's target (setView)
const chunkKey = (x, z) => `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(2.5, Math.max(0.4, v));
function vnoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const fx = smooth(x - xi), fz = smooth(z - zi);
  const a = hash(xi, zi, seed), b = hash(xi + 1, zi, seed), c = hash(xi, zi + 1, seed), d = hash(xi + 1, zi + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

// The floor's height runs thousands of times a frame (every ray's floor
// march), so its three value-noise octaves are computed in one loop with the
// corner hashes written out in place (textures.js hash(x, z, seed)'s
// arithmetic): no call returns a boxed number. Each octave's lattice wraps
// every OCT_N cells (its cell is TILE / OCT_N: ~690, 259 and 90 µm), so the
// floor repeats with the tile and its copies meet without a seam.
const OCT_N = [14, 37, 107], OCT_AMP = [70, 22, 6], OCT_SEED = [3, 4, 5];
const OCT_DIV = OCT_N.map((n) => TILE / n);
/** Floor height (µm) at x, z: a gently rolling humus surface, periodic with the tile. */
export function floorH(x, z) {
  let sum = 0;
  for (let o = 0; o < 3; o++) {
    const n = OCT_N[o];
    const px = x / OCT_DIV[o], pz = z / OCT_DIV[o], sd = OCT_SEED[o];
    const xi = Math.floor(px), zi = Math.floor(pz);
    const fx = smooth(px - xi), fz = smooth(pz - zi);
    let x0 = xi % n; if (x0 < 0) x0 += n;
    let z0 = zi % n; if (z0 < 0) z0 += n;
    const x1 = x0 + 1 === n ? 0 : x0 + 1, z1 = z0 + 1 === n ? 0 : z0 + 1;
    let h, ha, hb;
    h = Math.imul(2166136261 ^ x0, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; ha = h;
    h = Math.imul(2166136261 ^ x1, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; hb = h;
    h = Math.imul(ha ^ z0, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    h = Math.imul(h ^ sd, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    const a = (h >>> 0) / 4294967296;
    h = Math.imul(hb ^ z0, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    h = Math.imul(h ^ sd, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    const b = (h >>> 0) / 4294967296;
    h = Math.imul(ha ^ z1, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    h = Math.imul(h ^ sd, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    const c = (h >>> 0) / 4294967296;
    h = Math.imul(hb ^ z1, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    h = Math.imul(h ^ sd, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    const d = (h >>> 0) / 4294967296;
    sum += OCT_AMP[o] * (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz - 0.5);
  }
  return sum;
}
export function floorN(x, z, out = new THREE.Vector3()) {
  const e = 4;
  return out.set(floorH(x - e, z) - floorH(x + e, z), 2 * e, floorH(x, z - e) - floorH(x, z + e)).normalize();
}

/** Tag every vertex of a geometry with a per-object cutaway id (see createObjectCut). */
function tagCut(geo, id) {
  geo.setAttribute('cutId', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(id), 1));
  return geo;
}

/** Merge geometries (position, normal, uv, and cutId when they all have it) into one indexed geometry. */
export function mergeGeos(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    nrm.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo;
    else for (let i = 0; i < c; i++) idx[io++] = vo + i;
    vo += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (geos.every((g) => g.attributes.cutId)) {
    const cid = new Float32Array(nv);
    let o = 0;
    for (const g of geos) { cid.set(g.attributes.cutId.array, o); o += g.attributes.position.count; }
    m.setAttribute('cutId', new THREE.BufferAttribute(cid, 1));
  }
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  m.computeBoundingSphere();
  return m;
}

/**
 * A thin sheet with real thickness (top, bottom and a rim), from a surface
 * function f(u, v) -> {p, n} over u, v in [0, 1]. Returns the render
 * geometry and a low-res top-surface collider geometry.
 */
function sheet(f, nu, nv, thick, uvOf, cu = 10, cv = 4) {
  const pos = [], nrm = [], uv = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  const grid = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const s = f(i / nu, j / nv); grid.push(s);
  }
  const at = (i, j) => grid[i * (nv + 1) + j];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const s = at(i, j);
      P.copy(s.p).addScaledVector(s.n, side * thick * 0.5);
      N.copy(s.n).multiplyScalar(side);
      pos.push(P.x, P.y, P.z); nrm.push(N.x, N.y, N.z);
      const t = uvOf(i / nu, j / nv); uv.push(t[0], t[1]);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = base + i * (nv + 1) + j, b = a + nv + 1;
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  // rim: walk the boundary of the (u, v) square
  const ring = [];
  for (let i = 0; i <= nu; i++) ring.push([i, 0]);
  for (let j = 1; j <= nv; j++) ring.push([nu, j]);
  for (let i = nu - 1; i >= 0; i--) ring.push([i, nv]);
  for (let j = nv - 1; j >= 1; j--) ring.push([0, j]);
  const rb = pos.length / 3;
  for (let k = 0; k < ring.length; k++) {
    const [i, j] = ring[k];
    const s = at(i, j);
    const [i2, j2] = ring[(k + 1) % ring.length];
    const s2 = at(i2, j2);
    let out = new THREE.Vector3().subVectors(s2.p, s.p).cross(s.n);
    if (out.lengthSq() < 1e-8) { const [i0, j0] = ring[(k + ring.length - 1) % ring.length]; out.subVectors(s.p, at(i0, j0).p).cross(s.n); }
    if (out.lengthSq() < 1e-8) out.copy(s.n);
    out.normalize();
    for (const side of [1, -1]) {
      P.copy(s.p).addScaledVector(s.n, side * thick * 0.5);
      pos.push(P.x, P.y, P.z); nrm.push(out.x, out.y, out.z);
      const t = uvOf(i / nu, j / nv); uv.push(t[0], t[1]);
    }
  }
  for (let k = 0; k < ring.length; k++) {
    const a = rb + k * 2, b = rb + ((k + 1) % ring.length) * 2;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // collider: the mid-surface at low resolution
  const cp = [], ci = [];
  for (let i = 0; i <= cu; i++) for (let j = 0; j <= cv; j++) { const s = f(i / cu, j / cv); cp.push(s.p.x, s.p.y, s.p.z); }
  for (let i = 0; i < cu; i++) for (let j = 0; j < cv; j++) { const a = i * (cv + 1) + j, b = a + cv + 1; ci.push(a, b, a + 1, b, b + 1, a + 1); }
  const c = new THREE.BufferGeometry();
  c.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  c.setIndex(ci);
  c.computeBoundingSphere();
  return { geo: g, col: c };
}

/**
 * Walkable surfaces: an analytic floor plus low-poly collider meshes, in world
 * space (no transforms). Casts are accelerated two ways:
 * - a broadphase hash of entries by their xz footprint (BROAD µm cells), so a
 *   ray only looks at the colliders near it. The tile's set is periodic: its
 *   cells wrap every TILE, each entry is binned with the copy offset of every
 *   wrapped cell it covers, and a ray meets an entry in each copy it reaches,
 *   cast against it at that copy's shift (so its hits are in world space);
 * - a uniform grid of triangle indices inside every big static mesh (the giant
 *   springtail, stems, flakes), walked cell by cell along the ray (3D DDA), so
 *   only the triangles in the cells it crosses are tested.
 * Blades (moving: mite-foliage.js rewrites their vertices) are small and tested
 * whole. Hits come from a ring of reused objects: read them (or copy them)
 * before ~200 more casts, never keep one across frames.
 */
const BROAD = 480; // a whole number of cells to the tile
const NB = TILE / BROAD;
const GRID_MIN_TRIS = 48;
const RING = 256;
class Colliders {
  /** periodic: the tile's set (cells wrap every TILE); excl(x, z): an excluded point (entries with an anchor). */
  constructor({ periodic = false, excl = null } = {}) {
    this.periodic = periodic;
    this.excl = excl;
    this.list = [];
    this.off = new Set(); // collider kinds switched off
    this.cells = new Map(); // broadphase: xz cell key -> entries (periodic: and their copy offsets)
    this.stamp = 0;
    this.stats = { casts: 0, tris: 0 };
  }
  // A small-integer key (cells within ±4 m, far beyond the world): a key past
  // 2^30 is a boxed number on every lookup. Outside that range keys may share a
  // bucket, which only adds candidates to test, never loses one.
  _key(ix, iz) { return ((ix + 8192) & 16383) * 16384 + ((iz + 8192) & 16383); }
  _bin(e) {
    // by the rest footprint (xz box); a moving blade's grown by how far it can bend (mite-foliage maxBend 0.55 x length)
    const P = e.pos;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) { if (P[i] < x0) x0 = P[i]; if (P[i] > x1) x1 = P[i]; if (P[i + 2] < z0) z0 = P[i + 2]; if (P[i + 2] > z1) z1 = P[i + 2]; }
    const m = (e.kind === 'blade' ? 1.2 * e.r : 0) + 2;
    x0 = Math.floor((x0 - m) / BROAD); x1 = Math.floor((x1 + m) / BROAD);
    z0 = Math.floor((z0 - m) / BROAD); z1 = Math.floor((z1 + m) / BROAD);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      let k, qx = 0, qz = 0;
      if (this.periodic) {
        const wx = ((ix % NB) + NB) % NB, wz = ((iz % NB) + NB) % NB;
        qx = (ix - wx) / NB; qz = (iz - wz) / NB;
        k = wx * NB + wz;
      } else k = this._key(ix, iz);
      let a = this.cells.get(k);
      if (!a) this.cells.set(k, (a = { e: [], qx: [], qz: [] }));
      a.e.push(e); a.qx.push(qx); a.qz.push(qz);
    }
  }
  add(geo, kind, anchor = null) {
    geo.computeBoundingSphere();
    const pos = geo.attributes.position.array;
    const idx = geo.index ? geo.index.array : null;
    const ntri = (idx ? idx.length : pos.length / 3) / 3;
    // Every field an entry ever gets is declared here (cutId and a blade's rod
    // are set by the world builder, tmark by castGrid), so all entries share one shape: the
    // broadphase reads e.r, e.c and e.seen of dozens of entries per ray, and
    // with several shapes those reads went megamorphic and boxed a number
    // each time (~1.3 KB of garbage per cast, 2.5x slower).
    // mesh: a handle for code that reads entry.mesh.geometry; ax, az: its anchor
    // (a moss shoot's foot) for the exclusion discs (NaN: never excluded)
    const e = { geo, c: geo.boundingSphere.center.clone(), r: geo.boundingSphere.radius, kind, pos, idx, ntri, grid: null, mark: 0, seen: 0, seenS: 0, tmark: null, cutId: 0, rod: null, mesh: { geometry: geo },
      ax: anchor ? anchor.x : NaN, az: anchor ? anchor.z : NaN };
    if (kind !== 'blade' && ntri >= GRID_MIN_TRIS) e.grid = buildTriGrid(pos, idx, ntri);
    this.list.push(e);
    this._bin(e);
    return e;
  }
  /** Test every entry near the ray into best (shared with other sets); the stamp dedupes per cast. */
  _cast(ox, oy, oz, dx, dy, dz, far, skip, best) {
    this.stats.casts++;
    const stamp = ++this.stamp;
    const ex = ox + dx * far, ez = oz + dz * far;
    const x0 = Math.floor(Math.min(ox, ex) / BROAD), x1 = Math.floor(Math.max(ox, ex) / BROAD);
    const z0 = Math.floor(Math.min(oz, ez) / BROAD), z1 = Math.floor(Math.max(oz, ez) / BROAD);
    const off = this.off.size ? this.off : null;
    const per = this.periodic, excl = this.excl;
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      let a, rx = 0, rz = 0;
      if (per) {
        const wx = ((ix % NB) + NB) % NB, wz = ((iz % NB) + NB) % NB;
        rx = (ix - wx) / NB; rz = (iz - wz) / NB;
        a = this.cells.get(wx * NB + wz);
      } else a = this.cells.get(this._key(ix, iz));
      if (!a) continue;
      const E = a.e;
      for (let i = 0; i < E.length; i++) {
        const e = E[i];
        // this copy of it: shifted by sx, sz tiles from where it is stored
        const sx = rx - a.qx[i], sz = rz - a.qz[i], sk = sx * 1024 + sz;
        if (e.seen === stamp && e.seenS === sk) continue;
        e.seen = stamp; e.seenS = sk;
        if ((off && off.has(e.kind)) || (skip && skip.has(e.kind))) continue;
        const tx = sx * TILE, tz = sz * TILE;
        if (excl && e.ax === e.ax && excl(e.ax + tx, e.az + tz)) continue;
        const lx = ox - tx, lz = oz - tz;
        const c = e.c, vx = c.x - lx, vy = c.y - oy, vz = c.z - lz;
        let t = vx * dx + vy * dy + vz * dz;
        t = t < 0 ? 0 : t > best.t ? best.t : t;
        const px = vx - dx * t, py = vy - dy * t, pz = vz - dz * t;
        if (px * px + py * py + pz * pz > e.r * e.r) continue;
        const t0 = best.t;
        if (e.grid) castGrid(e, lx, oy, lz, dx, dy, dz, best, this.stats);
        else castTris(e, 0, e.ntri, null, lx, oy, lz, dx, dy, dz, best, this.stats);
        if (best.t < t0) { best.sx = sx; best.sz = sz; }
      }
    }
  }
}
const BEST = { t: 0, e: null, nx: 0, ny: 0, nz: 0, sx: 0, sz: 0 };

/**
 * The world's colliders: the tile's (periodic) and the fixed ones (at their
 * real place: add() goes there), plus the analytic floor.
 * cast(origin, dir, far, skipFloor, skip): nearest hit within `far`:
 * {point, normal (facing the ray's origin), dist, kind, entry, sx, sz (the
 * tile copy the entry was met in)} or null. skip: a Set of kinds to ignore.
 */
function createColliders(excl) {
  const tile = new Colliders({ periodic: true, excl });
  const fixed = new Colliders();
  fixed.off = tile.off; // one set of switched-off kinds
  const ring = Array.from({ length: RING }, () => ({ point: new THREE.Vector3(), normal: new THREE.Vector3(), dist: 0, kind: '', entry: null, sx: 0, sz: 0 }));
  let ri = 0;
  const hit = () => { const h = ring[ri]; ri = (ri + 1) % RING; return h; };
  const stats = { casts: 0, tris: 0 };
  return {
    tile, fixed, off: tile.off, stats,
    get list() { return [...tile.list, ...fixed.list]; },
    /** A fixed collider (at its real place). */
    add(geo, kind, anchor) { return fixed.add(geo, kind, anchor); },
    /** A collider of the tile (repeated with it). */
    addTile(geo, kind, anchor) { return tile.add(geo, kind, anchor); },
    cast(origin, dir, far, skipFloor = false, skip = null) {
      stats.casts++;
      const best = BEST;
      best.t = far; best.e = null; best.sx = 0; best.sz = 0;
      const ox = origin.x, oy = origin.y, oz = origin.z, dx = dir.x, dy = dir.y, dz = dir.z;
      tile._cast(ox, oy, oz, dx, dy, dz, far, skip, best);
      const tb = best.e;
      if (fixed.list.length) fixed._cast(ox, oy, oz, dx, dy, dz, far, skip, best);
      if (best.e !== tb) { best.sx = 0; best.sz = 0; }
      stats.tris = tile.stats.tris + fixed.stats.tris;
      let out = null;
      if (best.e) {
        out = hit();
        out.dist = best.t;
        out.point.set(ox + dx * best.t, oy + dy * best.t, oz + dz * best.t);
        out.normal.set(best.nx, best.ny, best.nz);
        if (best.nx * dx + best.ny * dy + best.nz * dz > 0) out.normal.negate();
        out.kind = best.e.kind; out.entry = best.e; out.sx = best.sx; out.sz = best.sz;
      }
      if (!skipFloor) {
        const lim = out ? out.dist : far;
        let tf = -1;
        if (dx === 0 && dz === 0) {
          // straight down or up: the floor is right there
          const d = oy - floorH(ox, oz);
          if (d > 0 && dy < 0 && d <= lim) tf = d;
        } else {
          // march the analytic floor: steps as long as the gap allows (its slopes
          // stay under ~0.7), down to 6 µm, then bisect the crossing
          const close = Math.max(0, -dy) + 0.7 * Math.hypot(dx, dz) + 1e-3;
          let prev = oy - floorH(ox, oz), tp = 0;
          for (let t = Math.max(6, prev / close); tp < lim; t = tp + Math.max(6, prev / close)) {
            const tt = Math.min(t, lim);
            const d = oy + dy * tt - floorH(ox + dx * tt, oz + dz * tt);
            if (d <= 0 && prev > 0) {
              let a = tp, b = tt;
              for (let k = 0; k < 12; k++) {
                const m = (a + b) / 2;
                const dd = oy + dy * m - floorH(ox + dx * m, oz + dz * m);
                if (dd > 0) a = m; else b = m;
              }
              tf = b;
              break;
            }
            prev = d; tp = tt;
          }
        }
        if (tf >= 0) {
          out = out || hit();
          out.point.set(ox + dx * tf, oy + dy * tf, oz + dz * tf);
          floorN(out.point.x, out.point.z, out.normal);
          out.dist = tf; out.kind = 'floor'; out.entry = null; out.sx = 0; out.sz = 0;
        }
      }
      return out;
    },
  };
}

/**
 * Exclusion discs in world space ({ x, z, r }): moss shoots whose foot lies
 * within r + SHOOT_REACH of one are neither drawn nor walked on there. A grid
 * of 2 mm cells finds the discs near a point.
 */
const SHOOT_REACH = 900;
const EX_CELL = 2048;
function createExclusion() {
  const sets = new Map(); // name -> discs
  let grid = new Map();
  const key = (ix, iz) => ((ix + 8192) & 16383) * 16384 + ((iz + 8192) & 16383);
  function rebuild() {
    grid = new Map();
    for (const discs of sets.values()) for (const d of discs) {
      const R = d.r + SHOOT_REACH;
      for (let ix = Math.floor((d.x - R) / EX_CELL); ix <= Math.floor((d.x + R) / EX_CELL); ix++) for (let iz = Math.floor((d.z - R) / EX_CELL); iz <= Math.floor((d.z + R) / EX_CELL); iz++) {
        const k = key(ix, iz);
        let a = grid.get(k);
        if (!a) grid.set(k, (a = []));
        a.push({ x: d.x, z: d.z, r2: R * R });
      }
    }
  }
  const test = (x, z) => {
    if (!grid.size) return false;
    const a = grid.get(key(Math.floor(x / EX_CELL), Math.floor(z / EX_CELL)));
    if (!a) return false;
    for (let i = 0; i < a.length; i++) { const d = a[i], dx = x - d.x, dz = z - d.z; if (dx * dx + dz * dz < d.r2) return true; }
    return false;
  };
  let count = 0;
  return {
    test,
    /** Replace the named set of discs ([{ x, z, r }]). */
    set(name, discs) { sets.set(name, discs.map((d) => ({ x: d.x, z: d.z, r: d.r }))); count = 0; for (const v of sets.values()) count += v.length; rebuild(); },
    get discs() { return [...sets.values()].flat(); },
    /** How many discs there are (no allocation). */
    get count() { return count; },
  };
}

/** Möller-Trumbore over triangles [a, b) (or the listed ones), double-sided; keeps the nearest in best. */
function castTris(e, a, b, list, ox, oy, oz, dx, dy, dz, best, stats) {
  const P = e.pos, I = e.idx;
  for (let k = a; k < b; k++) {
    const tri = list ? list[k] : k;
    if (list) { if (e.tmark[tri] === e.mark) continue; e.tmark[tri] = e.mark; }
    stats.tris++;
    let i0, i1, i2;
    if (I) { i0 = I[tri * 3] * 3; i1 = I[tri * 3 + 1] * 3; i2 = I[tri * 3 + 2] * 3; } else { i0 = tri * 9; i1 = i0 + 3; i2 = i0 + 6; }
    const ax = P[i0], ay = P[i0 + 1], az = P[i0 + 2];
    const e1x = P[i1] - ax, e1y = P[i1 + 1] - ay, e1z = P[i1 + 2] - az;
    const e2x = P[i2] - ax, e2y = P[i2 + 1] - ay, e2z = P[i2 + 2] - az;
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (det > -1e-9 && det < 1e-9) continue;
    const inv = 1 / det;
    const tx = ox - ax, ty = oy - ay, tz = oz - az;
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (dx * qx + dy * qy + dz * qz) * inv;
    if (v < 0 || u + v > 1) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (t < 0 || t > best.t) continue;
    // face normal, as three.js computes it: (c - b) x (a - b)
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz) || 1;
    best.t = t; best.e = e; best.nx = nx / l; best.ny = ny / l; best.nz = nz / l;
  }
}

/** A uniform grid of triangle indices over a static mesh (built once). */
function buildTriGrid(P, I, ntri) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) { const v = P[i + a]; if (v < min[a]) min[a] = v; if (v > max[a]) max[a] = v; }
  for (let a = 0; a < 3; a++) { min[a] -= 0.5; max[a] += 0.5; }
  const ext = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  // about two triangles per cell, cells as cubic as the shape allows
  const vol = Math.max(1, ext[0] * ext[1] * ext[2]);
  let cs = Math.cbrt(vol / Math.max(1, ntri / 2));
  cs = Math.max(cs, Math.max(...ext) / 48);
  const n = ext.map((x) => Math.max(1, Math.min(48, Math.ceil(x / cs))));
  const cell = ext.map((x, a) => x / n[a]);
  const count = new Uint32Array(n[0] * n[1] * n[2] + 1);
  const triBox = (tri, f) => {
    let i0, i1, i2;
    if (I) { i0 = I[tri * 3] * 3; i1 = I[tri * 3 + 1] * 3; i2 = I[tri * 3 + 2] * 3; } else { i0 = tri * 9; i1 = i0 + 3; i2 = i0 + 6; }
    const lo = [], hi = [];
    for (let a = 0; a < 3; a++) {
      const v0 = P[i0 + a], v1 = P[i1 + a], v2 = P[i2 + a];
      lo[a] = Math.max(0, Math.min(n[a] - 1, Math.floor((Math.min(v0, v1, v2) - min[a]) / cell[a])));
      hi[a] = Math.max(0, Math.min(n[a] - 1, Math.floor((Math.max(v0, v1, v2) - min[a]) / cell[a])));
    }
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) f((x * n[1] + y) * n[2] + z);
  };
  for (let t = 0; t < ntri; t++) triBox(t, (c) => count[c + 1]++);
  for (let c = 1; c < count.length; c++) count[c] += count[c - 1];
  const fill = count.slice(0, -1);
  const tris = new Uint32Array(count[count.length - 1]);
  for (let t = 0; t < ntri; t++) triBox(t, (c) => { tris[fill[c]++] = t; });
  return { min, max, n, cell, start: count, tris };
}

// castGrid's per-ray state: module scratch (casts never nest), Float64 like JS numbers
const _go = new Float64Array(3), _gd = new Float64Array(3), _gc = new Float64Array(3), _gs = new Float64Array(3), _gm = new Float64Array(3), _gt = new Float64Array(3);
/** Walk the ray through the mesh's grid (Amanatides-Woo), testing each cell's triangles. */
function castGrid(e, ox, oy, oz, dx, dy, dz, best, stats) {
  const g = e.grid;
  if (!e.tmark) e.tmark = new Uint32Array(e.ntri);
  e.mark = (e.mark + 1) >>> 0;
  if (e.mark === 0) { e.tmark.fill(0); e.mark = 1; }
  const o = _go, d = _gd;
  o[0] = ox; o[1] = oy; o[2] = oz; d[0] = dx; d[1] = dy; d[2] = dz;
  // clip to the grid's box
  let t0 = 0, t1 = best.t;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-12) { if (o[a] < g.min[a] || o[a] > g.max[a]) return; continue; }
    let ta = (g.min[a] - o[a]) / d[a], tb = (g.max[a] - o[a]) / d[a];
    if (ta > tb) { const s = ta; ta = tb; tb = s; }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return;
  }
  const c = _gc, step = _gs, tMax = _gm, tDelta = _gt;
  for (let a = 0; a < 3; a++) {
    const p = o[a] + d[a] * t0;
    c[a] = Math.max(0, Math.min(g.n[a] - 1, Math.floor((p - g.min[a]) / g.cell[a])));
    if (d[a] > 0) { step[a] = 1; tMax[a] = (g.min[a] + (c[a] + 1) * g.cell[a] - o[a]) / d[a]; tDelta[a] = g.cell[a] / d[a]; }
    else if (d[a] < 0) { step[a] = -1; tMax[a] = (g.min[a] + c[a] * g.cell[a] - o[a]) / d[a]; tDelta[a] = -g.cell[a] / d[a]; }
    else { step[a] = 0; tMax[a] = Infinity; tDelta[a] = Infinity; }
  }
  const N1 = g.n[1], N2 = g.n[2];
  for (let guard = 0; guard < 200; guard++) {
    const ci = (c[0] * N1 + c[1]) * N2 + c[2];
    const s = g.start[ci], f = g.start[ci + 1];
    if (f > s) castTris(e, s, f, g.tris, ox, oy, oz, dx, dy, dz, best, stats);
    // the next cell boundary
    const a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
    const exitT = tMax[a];
    if (best.t <= exitT) return; // the nearest hit lies in a cell already visited
    if (exitT > t1) return;
    c[a] += step[a];
    if (c[a] < 0 || c[a] >= g.n[a]) return;
    tMax[a] += tDelta[a];
  }
}

/** Random point on a hemisphere-ish angular grain: a jittered icosahedron. */
function grainGeo(r, seed) {
  const R = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, r > 60 ? 1 : 0);
  const p = g.attributes.position;
  const sx = 0.75 + R() * 0.45, sy = 0.5 + R() * 0.35, sz = 0.75 + R() * 0.4;
  // displace shared corners consistently so the facets stay closed
  const key = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!key.has(k)) key.set(k, 0.72 + R() * 0.5);
    const f = key.get(k);
    p.setXYZ(i, p.getX(i) * f * sx * r, p.getY(i) * f * sy * r, p.getZ(i) * f * sz * r);
  }
  g.computeVertexNormals(); // non-indexed icosahedron -> flat facets
  return g;
}

/**
 * The scenery tile and its colliders. Coordinates of everything built here
 * lie in the tile round the origin ([-TILE/2, TILE/2] and a little beyond);
 * every copy of it is drawn by setView and walked on through the periodic
 * colliders. The start (the origin) is kept open (START_CLEAR).
 */
const START_CLEAR = 300;
export function buildWorld(tex) {
  const group = new THREE.Group();
  const exclude = createExclusion();
  const col = createColliders(exclude.test);
  const R = rng(1234);
  const mats = {
    floor: gMaterial({ cls: CLS.LITTER, tex: tex.litter, map: 'tri', scale: 320, bump: 9 }),
    grain: gMaterial({ cls: CLS.GRAIN, tex: tex.litter, map: 'tri', scale: 160, bump: 2.5 }),
    litter: gMaterial({ cls: CLS.LITTER, tex: tex.litter, map: 'uv', scale: 1, bump: 5, cut: true, side: THREE.DoubleSide }),
    leaf: gMaterial({ cls: CLS.LEAF, tex: tex.leaf, map: 'uv', scale: 1, bump: 2.5, cut: true, side: THREE.DoubleSide }),
    stem: gMaterial({ cls: CLS.STEM, tex: tex.leaf, map: 'uv', scale: 1, bump: 3, cut: true }),
    hypha: gMaterial({ cls: CLS.HYPHA, thin: 1 }),
    spore: gMaterial({ cls: CLS.SPORE, thin: 0 }),
  };
  // The tile's copies: copy 0 holds the meshes, the other eight hold proxies
  // that share their geometry (setView places them round each view's target).
  // Their world matrices are set here only when a copy moves (setView), for the
  // copy and every mesh in it (the meshes never move within it): three.js would
  // otherwise multiply ~1900 matrices a frame for the nine copies.
  const copies = Array.from({ length: 9 }, () => { const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrixWorldAutoUpdate = false; group.add(g); return g; });
  group.matrixAutoUpdate = false; // (at the origin, unrotated)
  const base = copies[0];
  const proxies = []; // [original, [8 proxies]]
  const proxyOf = (m) => {
    let p;
    if (m.isBatchedMesh) p = m.userData.proxy();
    else if (m.isInstancedMesh) {
      p = new THREE.InstancedMesh(m.geometry, m.material, m.count);
      p.instanceMatrix = m.instanceMatrix;
      p.boundingSphere = m.boundingSphere;
    } else p = new THREE.Mesh(m.geometry, m.material);
    p.frustumCulled = m.frustumCulled;
    return p;
  };
  const addCopies = (m) => {
    const list = [];
    for (let i = 1; i < 9; i++) { const p = proxyOf(m); copies[i].add(p); list.push(p); }
    proxies.push([m, list]);
    return list;
  };
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); base.add(m); return m; };
  /** Merge geometries into one mesh per spatial chunk; returns the meshes and, per input, its chunk geometry and first vertex. */
  const chunked = (geos, mat) => {
    const byKey = new Map();
    geos.forEach((g, i) => {
      if (!g.boundingSphere) g.computeBoundingSphere();
      const c = g.boundingSphere.center, k = chunkKey(c.x, c.z);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(i);
    });
    const meshes = [], where = new Array(geos.length);
    for (const list of byKey.values()) {
      const merged = mergeGeos(list.map((i) => geos[i]));
      let o = 0;
      for (const i of list) { where[i] = { geo: merged, start: o }; o += geos[i].attributes.position.count; }
      meshes.push(mesh(merged, mat));
    }
    return { meshes, where };
  };
  /**
   * One BatchedMesh for all of a layer's objects: one draw per view and tile
   * copy (a multi-draw), and only the objects whose bounds meet that view are
   * drawn. Each object keeps the vertices mergeGeos would give it (position,
   * normal, uv or zeros, cutId) and an identity matrix (the copies are placed
   * by their group). anchors: per object its foot (x, z) for the exclusion
   * discs, or null. Returns the mesh and, per input, its geometry, first vertex
   * and geometry id. dirty(id): the object's vertices moved (a bent blade);
   * its bounds are recomputed before the next cull.
   */
  const batched = (geos, mat, anchors = null) => {
    const norm = geos.map((g) => {
      const n = g.attributes.position.count;
      const o = new THREE.BufferGeometry();
      o.setAttribute('position', new THREE.BufferAttribute(new Float32Array(g.attributes.position.array), 3));
      o.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(g.attributes.normal.array), 3));
      o.setAttribute('uv', new THREE.BufferAttribute(g.attributes.uv ? new Float32Array(g.attributes.uv.array) : new Float32Array(n * 2), 2));
      if (geos.every((q) => q.attributes.cutId)) o.setAttribute('cutId', new THREE.BufferAttribute(new Float32Array(g.attributes.cutId.array), 1));
      const idx = new Uint32Array(g.index ? g.index.count : n);
      if (g.index) idx.set(g.index.array); else for (let i = 0; i < n; i++) idx[i] = i;
      o.setIndex(new THREE.BufferAttribute(idx, 1));
      return o;
    });
    const nv = norm.reduce((s, g) => s + g.attributes.position.count, 0), ni = norm.reduce((s, g) => s + g.index.count, 0);
    // every object keeps an identity matrix, so the shader looks none up (BATCH_IDENTITY, mite-sem.js)
    mat.defines = { ...(mat.defines || {}), BATCH_IDENTITY: '' };
    const bm = new THREE.BatchedMesh(norm.length, nv, ni, mat);
    bm.sortObjects = false; // draw in the order given (sorting buys nothing for an opaque G-buffer)
    bm.frustumCulled = false; // its objects are culled one by one (perObjectFrustumCulled)
    const where = [], range = {};
    for (const g of norm) {
      const id = bm.addGeometry(g);
      bm.addInstance(id);
      bm.getGeometryRangeAt(id, range);
      where.push({ geo: bm.geometry, start: range.vertexStart, id });
    }
    base.add(bm);
    // The per-view cull. three.js's own (BatchedMesh.onBeforeRender in r186)
    // reads every object's matrix back from its texture; these are all
    // identity, so this one tests cached bounding spheres against the view
    // (the same sphere-against-planes test) and writes the same draw list:
    // about 0.6 ms less per view for the ~1200 objects. Uses r186's fields.
    // Objects whose anchor, in this copy, lies in an exclusion disc are skipped.
    const N = norm.length, sph = new Float32Array(N * 4), stale = new Uint8Array(N).fill(1);
    const info = bm._geometryInfo, bpe = bm.geometry.index.array.BYTES_PER_ELEMENT;
    const fm = new THREE.Matrix4(), fr = new THREE.Frustum(), s = new THREE.Sphere();
    const AX = anchors ? Float32Array.from(anchors) : null;
    function cull(obj, camera) {
      const starts = obj._multiDrawStarts, counts = obj._multiDrawCounts, ids = obj._indirectTexture.image.data;
      const doCull = obj.perObjectFrustumCulled;
      if (doCull) {
        fm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(obj.matrixWorld);
        fr.setFromProjectionMatrix(fm, camera.coordinateSystem, camera.reversedDepth);
      }
      const P = fr.planes;
      const W = obj.matrixWorld.elements, tx = W[12], tz = W[14];
      const ex = AX && exclude.count ? exclude.test : null;
      const vx = view.x - tx, vz = view.z - tz; // the view's target in this copy's frame
      let m = 0;
      for (let i = 0; i < N; i++) {
        if (doCull) {
          const o = i * 4;
          if (stale[i]) { bm.getBoundingSphereAt(i, s); sph[o] = s.center.x; sph[o + 1] = s.center.y; sph[o + 2] = s.center.z; sph[o + 3] = s.radius; stale[i] = 0; }
          const x = sph[o], y = sph[o + 1], z = sph[o + 2], nr = -sph[o + 3];
          const dx = x - vx, dz = z - vz, rr = DRAW_R - nr;
          if (dx * dx + dz * dz > rr * rr) continue;
          let out = false;
          for (let k = 0; k < 6; k++) { const n = P[k].normal; if (n.x * x + n.y * y + n.z * z + P[k].constant < nr) { out = true; break; } }
          if (out) continue;
        }
        if (ex && ex(AX[2 * i] + tx, AX[2 * i + 1] + tz)) continue;
        const g = info[i];
        starts[m] = g.start * bpe; counts[m] = g.count; ids[m] = i; m++;
      }
      // (ids: the draw-to-object list three.js keeps; with BATCH_IDENTITY no
      // shader reads it, so it is not uploaded: a texture upload per view cost ~0.4 ms)
      obj._multiDrawCount = m;
      obj._multiDrawBytesPerElement = bpe;
    }
    bm.onBeforeRender = function (renderer, scene, camera) { cull(this, camera); };
    // A copy of it for another tile: a BatchedMesh that draws this one's
    // geometry (its buffers, info and textures; its own draw list).
    bm.userData.proxy = () => {
      const p = new THREE.BatchedMesh(1, 3, 3, mat);
      p.geometry.dispose();
      p.geometry = bm.geometry;
      p._geometryInfo = bm._geometryInfo; p._instanceInfo = bm._instanceInfo; p._geometryCount = bm._geometryCount;
      // (the renderer reads a bounding sphere to sort by depth: the original's, moved with the copy, is near enough)
      if (!bm.boundingSphere) bm.computeBoundingSphere();
      p.boundingSphere = bm.boundingSphere.clone();
      p._matricesTexture = bm._matricesTexture; p._indirectTexture = bm._indirectTexture;
      p._multiDrawStarts = new Int32Array(N); p._multiDrawCounts = new Int32Array(N);
      p.sortObjects = false;
      p.onBeforeRender = function (renderer, scene, camera) { cull(this, camera); };
      return p;
    };
    // a bent object: its bounds (three caches them in _geometryInfo, and so do we) are measured again
    const dirty = (id) => { const gi = info[id]; gi.boundingBox = null; gi.boundingSphere = null; stale[id] = 1; };
    return { meshes: [bm], where, dirty };
  };
  // The cutaway works per object (a flake, a stem, a leaf), never slicing one:
  // cut.update() in the camera code dissolves only what is in front of the mite.
  const cut = createObjectCut(2048);
  /** Tile coordinates, uniform over the tile. */
  const rx = () => (R() * 2 - 1) * HT, rz = () => (R() * 2 - 1) * HT;
  /** Distance between tile points across the tile's wrap. */
  const pd = (ax, az, bx, bz) => Math.hypot(wrapD(ax - bx), wrapD(az - bz));

  // Floor: tiles over exactly one scenery tile, so a view draws only the ones
  // it sees; its copies meet the next tile's seamlessly (floorH is periodic).
  // 2.4 mm tiles of 46 µm cells (as fine as before; four to a side, for few objects)
  const TILES = 8, NT = 26;
  const T = TILE / TILES;
  const tmpN = new THREE.Vector3();
  const floorTiles = [];
  for (let ti = 0; ti < TILES; ti++) for (let tj = 0; tj < TILES; tj++) {
    const fg = new THREE.PlaneGeometry(T, T, NT, NT);
    fg.rotateX(-Math.PI / 2);
    fg.translate(-HT + (ti + 0.5) * T, 0, -HT + (tj + 0.5) * T);
    const fp = fg.attributes.position, fn = fg.attributes.normal;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i), z = fp.getZ(i);
      fp.setY(i, floorH(x, z));
      floorN(x, z, tmpN); fn.setXYZ(i, tmpN.x, tmpN.y, tmpN.z);
    }
    fg.computeBoundingSphere();
    floorTiles.push(mesh(fg, mats.floor));
  }

  // Keep-out round the start so the mite begins on open floor (in every copy: a small clearing)
  const clearOf = (x, z, r) => pd(x, z, 0, 0) > r;

  // Mineral grains
  const grains = [];
  const gGeos = [];
  for (let i = 0; i < 600; i++) {
    const r = 10 + 140 * Math.pow(R(), 2.6);
    const x = rx(), z = rz();
    if (!clearOf(x, z, START_CLEAR + r)) continue;
    const g = grainGeo(r, 900 + i);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 0.5, R() * 6.28, R() * 0.5));
    const m4 = new THREE.Matrix4().compose(new THREE.Vector3(x, floorH(x, z) + r * 0.15, z), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m4);
    gGeos.push(g);
    grains.push({ x, z, r });
    if (r > 22) col.addTile(g, 'grain');
  }
  const layers = {};
  layers.grains = batched(gGeos, mats.grain).meshes;

  // Litter flakes: decayed leaf fragments, curled, some propped on grains
  const lGeos = [];
  for (let i = 0; i < 42; i++) {
    const L = 450 + R() * 550, W = L * (0.35 + R() * 0.3);
    const x0 = rx(), z0 = rz();
    if (!clearOf(x0, z0, START_CLEAR + 150 + L * 0.5)) continue;
    const yaw = R() * 6.28, curl = (R() - 0.3) * 0.0012, tilt = (R() - 0.5) * 0.35;
    const seed = 400 + i;
    const ca = Math.cos(yaw), sa = Math.sin(yaw);
    const f = (u, v) => {
      const a = (u - 0.5) * L, b = (v - 0.5) * W;
      // ragged outline: shrink toward the middle by a noisy margin
      const edge = 0.82 + 0.18 * vnoise(u * 7, v * 7, seed);
      const aa = a * edge, bb = b * (0.6 + 0.4 * Math.sin(Math.PI * u)) * edge;
      const lx = x0 + aa * ca - bb * sa, lz = z0 + aa * sa + bb * ca;
      const y = Math.max(floorH(lx, lz), floorH(x0, z0)) + 8 + curl * bb * bb + tilt * aa * 0.2 + 18 * vnoise(u * 3, v * 3, seed + 1);
      return { p: new THREE.Vector3(lx, y, lz), n: new THREE.Vector3(0, 1, 0) };
    };
    // normals by finite differences
    const fn2 = (u, v) => {
      const s = f(u, v), e = 0.01;
      const du = f(Math.min(1, u + e), v).p.sub(f(Math.max(0, u - e), v).p);
      const dv = f(u, Math.min(1, v + e)).p.sub(f(u, Math.max(0, v - e)).p);
      s.n.crossVectors(dv, du).normalize();
      if (s.n.y < 0) s.n.negate();
      return s;
    };
    const sh = sheet(fn2, 22, 10, 12, (u, v) => [(v - 0.5) * W / 300, u * L / 300], 8, 4);
    const cid = cut.register([0, 0.25, 0.5, 0.75, 1].map((u) => f(u, 0.5).p).concat([f(0.5, 0), f(0.5, 1)].map((q) => q.p)));
    lGeos.push(tagCut(sh.geo, cid));
    col.addTile(sh.col, 'litter').cutId = cid;
  }
  layers.litter = batched(lGeos, mats.litter).meshes;

  // Moss shoots: stems with leaves on a 2/5 spiral (137.5 deg divergence).
  // The first ten stand where they always have round the start (two short
  // ones close by); the rest are scattered over the tile, at least 1.3 mm
  // apart across its wrap.
  const stems = [];
  const leafGeos = [], stemGeos = [], stemAnchor = [], leafAnchor = [];
  const bladeInfo = []; // upper leaves: bendable blades (see shared/techniques/mite-foliage.js)
  const spots = [[900, 400], [-700, 900], [-1200, -500], [500, -1200], [1500, 1300], [-200, 1700], [1600, -300], [-1600, 1500], [100, -400], [-500, 300]];
  const SR = rng(77);
  for (let k = 0; spots.length < 28 && k < 600; k++) {
    const x = (SR() * 2 - 1) * HT, z = (SR() * 2 - 1) * HT;
    if (spots.some(([a, b]) => pd(a, b, x, z) < 1300)) continue;
    if (pd(x, z, 0, 0) < 900) continue;
    spots.push([x, z]);
  }
  for (let s = 0; s < spots.length; s++) {
    const [sx, sz] = spots[s];
    const x = sx + (R() - 0.5) * 200, z = sz + (R() - 0.5) * 200;
    const near = s >= 8 && s < 10; // two short shoots near the start
    const H = near ? 700 + R() * 300 : 1400 + R() * 1400;
    const rad = 55 + R() * 30;
    const lean = new THREE.Vector3((R() - 0.5) * 0.5, 1, (R() - 0.5) * 0.5).normalize();
    const base = new THREE.Vector3(x, floorH(x, z) - 30, z);
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      pts.push(base.clone().addScaledVector(lean, H * t).add(new THREE.Vector3(Math.sin(t * 3 + s) * 60 * t, 0, Math.cos(t * 2 + s) * 60 * t)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tg = new THREE.TubeGeometry(curve, 40, rad, 12, false);
    // tile the stem's leaf-cell texture along its length
    const tuv = tg.attributes.uv;
    for (let i = 0; i < tuv.count; i++) tuv.setXY(i, tuv.getX(i) * H / 140, tuv.getY(i) * rad * 6.28 / 140);
    const shoot = s + 1;
    const stemId = cut.register(pts, shoot);
    cut.leader(stemId);
    stemGeos.push(tagCut(tg, stemId));
    stemAnchor.push(x, z);
    col.addTile(new THREE.TubeGeometry(curve, 10, rad, 6, false), 'stem', { x, z }).cutId = stemId;
    stems.push({ x, z, H });

    const nLeaves = Math.floor(H / 62);
    for (let k = 0; k < nLeaves; k++) {
      const t = 0.03 + (k / nLeaves) * 0.95;
      const P0 = curve.getPointAt(t);
      const T = curve.getTangentAt(t);
      const ang = k * 2.39996 + s;
      const side = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      side.addScaledVector(T, -side.dot(T)).normalize();
      const young = t; // leaves near the tip are shorter and held closer to the stem
      const lowest = k < 3;
      const L = lowest ? 950 + R() * 300 : (480 + R() * 320) * (1 - 0.4 * young * young) * (near ? 0.85 : 1);
      const Wd = L * (0.085 + R() * 0.035);
      const start = P0.clone().addScaledVector(side, rad * 0.8);
      let tip;
      if (lowest) {
        // old leaves arch out and rest their tips on the floor: ramps
        const tx = start.x + side.x * L * 0.78, tz = start.z + side.z * L * 0.78;
        tip = new THREE.Vector3(tx, floorH(tx, tz) + 4, tz);
      } else {
        const spread = 0.65 + 0.6 * (1 - young); // radians from the stem axis
        const dir = T.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread)).normalize();
        tip = start.clone().addScaledVector(dir, L);
        tip.y -= L * 0.25 * (1 - young); // recurved: tips droop
      }
      const ctrl = start.clone().lerp(tip, 0.45).addScaledVector(T, L * (lowest ? 0.32 : 0.12));
      const bez = (u, out) => {
        const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        return out.set(0, 0, 0).addScaledVector(start, a).addScaledVector(ctrl, b).addScaledVector(tip, c);
      };
      const len = start.distanceTo(tip);
      const halfW = (u) => {
        // lanceolate: widest about a quarter of the way out, acuminate tip,
        // serrate near the apex
        let w = Wd * Math.pow(u + 0.04, 0.35) * Math.pow(1 - u, 0.9) / 0.48;
        if (u > 0.55) w *= 1 + 0.06 * ((u * 38) % 1);
        return w;
      };
      const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
      const f = (u, v) => {
        const c = bez(u, new THREE.Vector3());
        const d = bez(Math.min(1, u + 0.01), tmpA).sub(bez(Math.max(0, u - 0.01), tmpB)).normalize();
        const across = new THREE.Vector3().crossVectors(d, T).normalize();
        if (across.lengthSq() < 0.1) across.copy(side).cross(d).normalize();
        const up = new THREE.Vector3().crossVectors(across, d).normalize();
        if (up.y < 0) { up.negate(); across.negate(); }
        const vv = v * 2 - 1, w = halfW(u);
        // channelled blade with the costa (midrib) as a raised ridge
        const cup = w * 0.22 * vv * vv;
        const costa = 9 * Math.exp(-Math.pow(vv * w / 14, 2)) * (1 - u);
        const p = c.addScaledVector(across, vv * w).addScaledVector(up, cup + costa);
        return { p, n: up.clone().addScaledVector(across, -vv * 0.35).normalize() };
      };
      const sh = sheet(f, 14, 5, 12, (u, v) => [(v * 2 - 1) * halfW(u) / 140 + 0.5, u * len / 140], lowest ? 10 : 6, 3);
      // its midrib as it is now (the tip offset bends it as d·u²)
      const US = [0, 0.2, 0.4, 0.55, 0.7, 0.85, 1], rest = US.map((u) => bez(u, new THREE.Vector3())), now = rest.map((p) => p.clone());
      const info = {};
      const leafId = cut.register(() => { const d = info.rod && info.rod.d; for (let i = 0; i < US.length; i++) { now[i].copy(rest[i]); if (d) now[i].addScaledVector(d, US[i] * US[i]); } return now; }, shoot);
      leafGeos.push(tagCut(sh.geo, leafId));
      leafAnchor.push(x, z);
      // Every leaf is a thin blade (one cell layer) that bends. The lowest,
      // old leaves that arch out and rest their tips on the floor are much
      // stiffer (they are ramps: they give a little under a mite, no more).
      const e = col.addTile(sh.col, 'blade', { x, z });
      e.cutId = leafId;
      const samples = [0.2, 0.4, 0.55, 0.7, 0.85, 1].map((u) => bez(u, new THREE.Vector3()));
      bladeInfo.push({ geoIndex: leafGeos.length - 1, base: start.clone(), tip: tip.clone(), samples, entry: e, L, stiff: lowest ? 3.2 : clamp01((560 / L) ** 2 * 1.1), info });
    }
  }
  const stemCh = batched(stemGeos, mats.stem, stemAnchor), leafCh = batched(leafGeos, mats.leaf, leafAnchor);
  layers.moss = [...stemCh.meshes, ...leafCh.meshes];
  // a bent blade's bounds are measured again before the next cull (see batched)
  const bladeId = new Map();
  const foliage = createFoliage({ near: 650, onWrite: (rod) => { const id = bladeId.get(rod); if (id !== undefined) leafCh.dirty(id); } });
  for (const b of bladeInfo) {
    const w = leafCh.where[b.geoIndex];
    const rod = foliage.add({ geo: w.geo, start: w.start, count: leafGeos[b.geoIndex].attributes.position.count,
      base: b.base, tip: b.tip, samples: b.samples, kind: 'cantilever', stiff: b.stiff,
      col: { geo: b.entry.mesh.geometry, onMove: (c, r) => { b.entry.c.copy(c); b.entry.r = r; } } });
    b.entry.rod = rod;
    b.info.rod = rod;
    bladeId.set(rod, w.id);
  }

  // Ground probe from above, for placing things on the topmost surface
  // (spores and hyphae rest on the floor, grains and litter, never on the moss,
  // so a shoot taken out by an exclusion disc leaves nothing hanging)
  const down = new THREE.Vector3(0, -1, 0);
  const NOT_MOSS = new Set(['stem', 'blade']);
  const topAt = (x, z, skip = NOT_MOSS) => keep(col.cast(new THREE.Vector3(x, 4000, z), down, 6000, false, skip));
  const keep = (h) => h && { point: h.point.clone(), normal: h.normal.clone(), dist: h.dist, kind: h.kind, entry: h.entry };

  // Fungal hyphae: 3-5 µm threads strung between surfaces, with side branches
  const hGeos = [];
  const hyphaInfo = [];
  for (let i = 0; i < 170; i++) {
    // more of them (and their tips, food) round the start: the warm-up is for grazing
    const nearStart = i < 40;
    const x = nearStart ? (R() * 2 - 1) * 1700 : rx(), z = nearStart ? (R() * 2 - 1) * 1700 : rz();
    if (!clearOf(x, z, 0)) { R(); R(); continue; }
    const a = topAt(x, z);
    const ang = R() * 6.28, span = 200 + R() * 600;
    const b = topAt(x + Math.cos(ang) * span, z + Math.sin(ang) * span);
    if (!a || !b) continue;
    const r = 1.6 + R() * 0.9;
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const p = a.point.clone().lerp(b.point, t);
      p.y -= Math.sin(Math.PI * t) * span * 0.08; // sag
      p.x += Math.sin(t * 9 + i) * 10; p.z += Math.cos(t * 7 + i) * 10;
      p.y = Math.max(p.y, floorH(p.x, p.z) + r);
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    hGeos.push(new THREE.TubeGeometry(curve, 28, r, 4, false));
    const main = { geoIndex: hGeos.length - 1, a: pts[0].clone(), b: pts[12].clone(), samples: pts.slice(1, 12), branches: [] };
    hyphaInfo.push(main);
    for (let k = 0; k < 2; k++) {
      const t = 0.2 + R() * 0.6;
      const p = curve.getPointAt(t);
      const d = new THREE.Vector3(R() - 0.5, R() * 0.4 - 0.3, R() - 0.5).normalize();
      const l = 50 + R() * 140;
      const q = p.clone().addScaledVector(d, l);
      q.y = Math.max(q.y, floorH(q.x, q.z) + r);
      const bc = new THREE.CatmullRomCurve3([p, p.clone().lerp(q, 0.5).add(new THREE.Vector3(0, -l * 0.1, 0)), q]);
      hGeos.push(new THREE.TubeGeometry(bc, 8, r * 0.85, 4, false));
      main.branches.push({ geoIndex: hGeos.length - 1, t, tip: q });
    }
  }
  const hCh = chunked(hGeos, mats.hypha);
  layers.hyphae = [...hCh.meshes];
  // Hyphae: slack threads fixed at both ends; bodies push them aside. Their
  // branch tips are food for the mite (X grazes them).
  const food = [];
  for (const h of hyphaInfo) {
    const w = hCh.where[h.geoIndex];
    const rod = foliage.add({ geo: w.geo, start: w.start, count: hGeos[h.geoIndex].attributes.position.count,
      base: h.a, tip: h.b, samples: h.samples, kind: 'string', stiff: 0.35 });
    for (const br of h.branches) {
      const wb = hCh.where[br.geoIndex];
      foliage.add({ geo: wb.geo, start: wb.start, count: hGeos[br.geoIndex].attributes.position.count,
        base: h.a, tip: h.b, kind: 'string', follow: { rod, u: br.t } });
      food.push({ kind: 'hypha', p: br.tip.clone(), rod, u: br.t, left: 1, t: 0 });
    }
  }

  // Spores and pollen, instanced, resting on the floor, grains and litter; more
  // spores round the start (grazing while you warm up)
  const placeInst = (geo, count, size, mat, near = 0) => {
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    const byKey = new Map();
    let n = 0;
    for (let i = 0; i < count * 3 && n < count; i++) {
      let hx, hz;
      if (i < near) { const s = Math.sqrt(R()) * 2600, a = R() * 6.2832; hx = Math.cos(a) * s; hz = Math.sin(a) * s; } else { hx = rx(); hz = rz(); }
      if (!clearOf(hx, hz, 0)) continue;
      const hit = topAt(hx, hz);
      if (!hit) continue;
      const s = size * (0.8 + R() * 0.4);
      q.setFromEuler(e.set(R() * 6, R() * 6, R() * 6));
      const at = hit.point.clone().addScaledVector(hit.normal, s * 0.4);
      const k = chunkKey(at.x, at.z);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push({ at, m: new THREE.Matrix4().compose(at, q, new THREE.Vector3(s, s, s)) });
      n++;
    }
    // one InstancedMesh per chunk (an InstancedMesh is frustum culled as one)
    const ims = [];
    for (const list of byKey.values()) {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((it, i) => {
        im.setMatrixAt(i, it.m);
        if (geo === spore) food.push({ kind: 'spore', p: it.at, im, i, left: 1 });
      });
      im.computeBoundingSphere();
      base.add(im);
      ims.push(im);
    }
    return ims;
  };
  // fungal conidia: smooth ellipsoids, ~6 x 10 µm
  const spore = new THREE.SphereGeometry(1, 10, 8); spore.scale(0.6, 1, 0.6);
  layers.spores = placeInst(spore, 540, 5, mats.spore, 300);
  // echinate pollen (aster type): a ~25 µm ball covered in spines
  const ech = [new THREE.SphereGeometry(1, 16, 12)];
  const dirs = new THREE.IcosahedronGeometry(1, 1).attributes.position;
  const seen = new Set();
  for (let i = 0; i < dirs.count; i++) {
    const d = new THREE.Vector3().fromBufferAttribute(dirs, i).normalize();
    const k = d.toArray().map((v) => v.toFixed(2)).join();
    if (seen.has(k)) continue; seen.add(k);
    const c = new THREE.ConeGeometry(0.11, 0.38, 5);
    c.translate(0, 1.12, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
    ech.push(c);
  }
  layers.spores.push(...placeInst(mergeGeos(ech), 80, 12, mats.spore));
  // bisaccate conifer pollen: a corpus with two air sacs, ~70 µm
  const corp = new THREE.SphereGeometry(1, 16, 12); corp.scale(0.9, 0.62, 0.62);
  const sac1 = new THREE.SphereGeometry(0.62, 14, 10); sac1.translate(0.55, -0.22, 0);
  const sac2 = new THREE.SphereGeometry(0.62, 14, 10); sac2.translate(-0.55, -0.22, 0);
  layers.spores.push(...placeInst(mergeGeos([corp, sac1, sac2]), 22, 34, mats.spore));

  // the copies of every mesh (each layer's list holds its originals and proxies, so a switch hides both)
  for (const m of floorTiles) addCopies(m);
  for (const name of Object.keys(layers)) layers[name] = layers[name].flatMap((m) => [m, ...addCopies(m)]);
  for (const g of copies) for (const m of g.children) { m.matrixAutoUpdate = false; m.matrixWorldAutoUpdate = false; m.updateMatrix(); }
  /** Move copy g to (ox, oz): its matrix and its meshes' (each at identity within it). */
  const moveCopy = (g, ox, oz) => {
    g.position.set(ox, 0, oz); g.updateMatrix(); g.matrixWorld.copy(g.matrix);
    for (const m of g.children) m.matrixWorld.copy(g.matrix);
  };

  const kinds = { grains: ['grain'], litter: ['litter'], moss: ['stem', 'blade'], hyphae: [], spores: [] };
  /** Show or hide a layer; hidden layers can't be walked on either. */
  const setLayer = (name, on) => {
    for (const m of layers[name]) m.visible = on;
    for (const k of kinds[name]) { if (on) col.off.delete(k); else col.off.add(k); }
  };
  /** Eat one spore instance (hide it). */
  const eatSpore = (f) => {
    const m4 = new THREE.Matrix4();
    f.im.getMatrixAt(f.i, m4);
    m4.scale(new THREE.Vector3(0, 0, 0));
    f.im.setMatrixAt(f.i, m4);
    f.im.instanceMatrix.needsUpdate = true;
  };

  // Each view draws the copies of the tile round its target (the 3 x 3 nearest,
  // each culled whole when its box is outside the view): at least 9.6 mm of moss
  // on every side of the target, beyond the far plane of any view.
  const box = new THREE.Box3(), fr = new THREE.Frustum(), pm = new THREE.Matrix4();
  const lastView = { ix: 0, iz: 0, seen: 0 };
  /** Place the copies for a view looking at (x, z) (call before rendering each view). */
  function setView(camera, x, z) {
    const ix = tileOf(x), iz = tileOf(z);
    view.x = x; view.z = z;
    camera.updateMatrixWorld();
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    fr.setFromProjectionMatrix(pm, camera.coordinateSystem, camera.reversedDepth);
    let k = 0, seenN = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      // copy 0 (the originals) takes the target's own tile
      const g = copies[i === 0 && j === 0 ? 0 : ++k];
      const ox = (ix + i) * TILE, oz = (iz + j) * TILE;
      if (g.position.x !== ox || g.position.z !== oz || !g.userData.placed) { moveCopy(g, ox, oz); g.userData.placed = true; }
      box.min.set(ox - HT - 1600, -300, oz - HT - 1600); box.max.set(ox + HT + 1600, 3400, oz + HT + 1600);
      // (in view, and within reach of what is drawn round the target: the floor reaches DRAW_R + a floor tile)
      const bx = Math.max(box.min.x - x, 0, x - box.max.x), bz = Math.max(box.min.z - z, 0, z - box.max.z);
      g.visible = fr.intersectsBox(box) && bx * bx + bz * bz < (DRAW_R + 2000) ** 2;
      if (g.visible) seenN++;
    }
    lastView.ix = ix; lastView.iz = iz; lastView.seen = seenN;
  }
  setView(new THREE.PerspectiveCamera(), 0, 0);

  /**
   * Tile bodies for the foliage: each body (world space) and its copies within
   * reach of the tile's rods, in tile coordinates. A body's load (the blade it
   * stands on) goes with the copy nearest that blade.
   */
  const imgPool = [];
  const bodies = [];
  function tileBodies(list) {
    bodies.length = 0;
    let n = 0;
    for (const b of list) {
      const kx0 = Math.ceil((b.center.x - HT - 2200) / TILE), kx1 = Math.floor((b.center.x + HT + 2200) / TILE);
      const kz0 = Math.ceil((b.center.z - HT - 2200) / TILE), kz1 = Math.floor((b.center.z + HT + 2200) / TILE);
      let lk = null;
      if (b.load) lk = { x: Math.round((b.center.x - b.load.mid.x) / TILE), z: Math.round((b.center.z - b.load.mid.z) / TILE) };
      for (let kx = kx0; kx <= kx1; kx++) for (let kz = kz0; kz <= kz1; kz++) {
        const o = imgPool[n] || (imgPool[n] = { center: new THREE.Vector3(), quat: null, radii: null, load: null, weight: 0, loadU: 0.7 });
        n++;
        o.center.set(b.center.x - kx * TILE, b.center.y, b.center.z - kz * TILE);
        o.quat = b.quat; o.radii = b.radii; o.weight = b.weight; o.loadU = b.loadU;
        o.load = lk && lk.x === kx && lk.z === kz ? b.load : null;
        bodies.push(o);
      }
    }
    return bodies;
  }

  return { group, copies, colliders: col, exclude, grains, stems, mats, topAt, layers, setLayer, foliage, food, eatSpore, cut, floorTiles,
    setView, lastView, tileBodies, proxies };
}
