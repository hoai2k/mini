// Some 80 square millimetres of moss-cushion floor, in µm: humus with mineral
// grains (20-300 µm), flakes of leaf litter, moss shoots with spiralling
// lanceolate leaves (the lowest ones arch down to the floor and work as
// ramps), fungal hyphae strung between surfaces, scattered spores and pollen,
// and a hyphal thicket (the crowd's terrain, layout.js THICKET). Render
// geometry is merged per material and per spatial chunk (CHUNK µm), so each
// view draws only the chunks it sees; walking queries go to a separate set of
// low-poly colliders plus an analytic floor.
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS, createObjectCut } from './sem.js';
import { rng, hash } from './textures.js';
import { createFoliage } from '../shared/techniques/mite-foliage.js';
import { BOUNDS, HALF, ROUTE } from './layout.js';

export { BOUNDS, HALF };
const CHUNK = 1500; // µm: render chunks (frustum culled one by one)
const chunkKey = (x, z) => `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(2.5, Math.max(0.4, v));
function vnoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const fx = smooth(x - xi), fz = smooth(z - zi);
  const a = hash(xi, zi, seed), b = hash(xi + 1, zi, seed), c = hash(xi, zi + 1, seed), d = hash(xi + 1, zi + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Floor height (µm) at x, z: a gently rolling humus surface. */
export function floorH(x, z) {
  return 70 * (vnoise(x / 700, z / 700, 3) - 0.5) + 22 * (vnoise(x / 260, z / 260, 4) - 0.5) + 6 * (vnoise(x / 90, z / 90, 5) - 0.5);
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
 *   ray only looks at the colliders near it;
 * - a uniform grid of triangle indices inside every big static mesh (the giant
 *   springtail, stems, flakes), walked cell by cell along the ray (3D DDA), so
 *   only the triangles in the cells it crosses are tested.
 * Blades (moving: mite-foliage.js rewrites their vertices) are small and tested
 * whole. Hits come from a ring of reused objects: read them (or copy them)
 * before ~200 more casts, never keep one across frames.
 */
const BROAD = 500;
const GRID_MIN_TRIS = 48;
const RING = 256;
class Colliders {
  constructor() {
    this.list = [];
    this.off = new Set(); // collider kinds switched off
    this.cells = new Map(); // broadphase: xz cell key -> entries
    this.stamp = 0;
    this.ring = Array.from({ length: RING }, () => ({ point: new THREE.Vector3(), normal: new THREE.Vector3(), dist: 0, kind: '', entry: null }));
    this.ri = 0;
    this.stats = { casts: 0, tris: 0 };
    this._mesh = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  }
  _key(ix, iz) { return (ix + 32768) * 65536 + (iz + 32768); }
  _bin(e) {
    // by the rest footprint (xz box); a moving blade's grown by how far it can bend (mite-foliage maxBend 0.55 x length)
    const P = e.pos;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) { if (P[i] < x0) x0 = P[i]; if (P[i] > x1) x1 = P[i]; if (P[i + 2] < z0) z0 = P[i + 2]; if (P[i + 2] > z1) z1 = P[i + 2]; }
    const m = (e.kind === 'blade' ? 1.2 * e.r : 0) + 2;
    x0 = Math.floor((x0 - m) / BROAD); x1 = Math.floor((x1 + m) / BROAD);
    z0 = Math.floor((z0 - m) / BROAD); z1 = Math.floor((z1 + m) / BROAD);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = this._key(ix, iz);
      let a = this.cells.get(k);
      if (!a) this.cells.set(k, (a = []));
      a.push(e);
    }
  }
  add(geo, kind) {
    geo.computeBoundingSphere();
    const pos = geo.attributes.position.array;
    const idx = geo.index ? geo.index.array : null;
    const ntri = (idx ? idx.length : pos.length / 3) / 3;
    const e = { geo, c: geo.boundingSphere.center.clone(), r: geo.boundingSphere.radius, kind, pos, idx, ntri, grid: null, mark: 0, seen: 0 };
    // keep a mesh handle for code that reads entry.mesh.geometry
    e.mesh = { geometry: geo };
    if (kind !== 'blade' && ntri >= GRID_MIN_TRIS) e.grid = buildTriGrid(pos, idx, ntri);
    this.list.push(e);
    this._bin(e);
    return e;
  }
  _hit() { const h = this.ring[this.ri]; this.ri = (this.ri + 1) % RING; return h; }
  /**
   * Nearest hit along a ray within `far`: {point, normal (facing the ray's
   * origin), dist, kind, entry} or null. skip: a Set of kinds to ignore.
   * The returned object is reused by later casts (see the class note).
   */
  cast(origin, dir, far, skipFloor = false, skip = null) {
    this.stats.casts++;
    const stamp = ++this.stamp;
    const best = BEST;
    best.t = far; best.e = null;
    const ox = origin.x, oy = origin.y, oz = origin.z, dx = dir.x, dy = dir.y, dz = dir.z;
    // broadphase: the cells under the ray's xz extent
    const ex = ox + dx * far, ez = oz + dz * far;
    const x0 = Math.floor(Math.min(ox, ex) / BROAD), x1 = Math.floor(Math.max(ox, ex) / BROAD);
    const z0 = Math.floor(Math.min(oz, ez) / BROAD), z1 = Math.floor(Math.max(oz, ez) / BROAD);
    const long = (x1 - x0 + 1) * (z1 - z0 + 1) > 64;
    const off = this.off.size ? this.off : null;
    for (let ix = long ? 0 : x0; ix <= (long ? 0 : x1); ix++) for (let iz = long ? 0 : z0; iz <= (long ? 0 : z1); iz++) {
      const a = long ? this.list : this.cells.get(this._key(ix, iz));
      if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const e = a[i];
        if (e.seen === stamp) continue;
        e.seen = stamp;
        if ((off && off.has(e.kind)) || (skip && skip.has(e.kind))) continue;
        const c = e.c, vx = c.x - ox, vy = c.y - oy, vz = c.z - oz;
        let t = vx * dx + vy * dy + vz * dz;
        t = t < 0 ? 0 : t > best.t ? best.t : t;
        const px = vx - dx * t, py = vy - dy * t, pz = vz - dz * t;
        if (px * px + py * py + pz * pz > e.r * e.r) continue;
        if (e.grid) castGrid(e, ox, oy, oz, dx, dy, dz, best, this.stats);
        else castTris(e, 0, e.ntri, null, ox, oy, oz, dx, dy, dz, best, this.stats);
      }
    }
    let out = null;
    if (best.e) {
      out = this._hit();
      out.dist = best.t;
      out.point.set(ox + dx * best.t, oy + dy * best.t, oz + dz * best.t);
      out.normal.set(best.nx, best.ny, best.nz);
      if (best.nx * dx + best.ny * dy + best.nz * dz > 0) out.normal.negate();
      out.kind = best.e.kind; out.entry = best.e;
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
        out = out || this._hit();
        out.point.set(ox + dx * tf, oy + dy * tf, oz + dz * tf);
        floorN(out.point.x, out.point.z, out.normal);
        out.dist = tf; out.kind = 'floor'; out.entry = null;
      }
    }
    return out;
  }
}
const BEST = { t: 0, e: null, nx: 0, ny: 0, nz: 0 };

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

/** Walk the ray through the mesh's grid (Amanatides-Woo), testing each cell's triangles. */
function castGrid(e, ox, oy, oz, dx, dy, dz, best, stats) {
  const g = e.grid;
  if (!e.tmark) e.tmark = new Uint32Array(e.ntri);
  e.mark = (e.mark + 1) >>> 0;
  if (e.mark === 0) { e.tmark.fill(0); e.mark = 1; }
  const o = [ox, oy, oz], d = [dx, dy, dz];
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
  const c = [0, 0, 0], step = [0, 0, 0], tMax = [0, 0, 0], tDelta = [0, 0, 0];
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
 * clear: [{ x, z, r }] discs kept open (bare litter: no grains, flakes,
 * shoots, hyphae or spores), e.g. the boss's arena so it stands out.
 * thicket: { x, z, r } a hyphal thicket: dense threads at body height between
 * fungal conidiophores (THICKET in layout.js).
 */
export function buildWorld(tex, { clear = [], thicket = null } = {}) {
  const group = new THREE.Group();
  const col = new Colliders();
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
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); group.add(m); return m; };
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
  // The cutaway works per object (a flake, a stem, a leaf), never slicing one:
  // cut.update() in the camera code dissolves only what is in front of the mite.
  const cut = createObjectCut(2048);
  const B = BOUNDS;
  const rx = (m = 0.97) => B.cx + (R() * 2 - 1) * B.half * m, rz = (m = 0.97) => B.cz + (R() * 2 - 1) * B.half * m;

  // Floor: tiles, so a view draws only the ones it sees; it reaches past the
  // walkable square so the view never runs off it
  const S = B.half * 2 + 4400, TILES = 8, NT = 26;
  const T = S / TILES;
  const tmpN = new THREE.Vector3();
  const floorTiles = [];
  for (let ti = 0; ti < TILES; ti++) for (let tj = 0; tj < TILES; tj++) {
    const fg = new THREE.PlaneGeometry(T, T, NT, NT);
    fg.rotateX(-Math.PI / 2);
    fg.translate(B.cx - S / 2 + (ti + 0.5) * T, 0, B.cz - S / 2 + (tj + 0.5) * T);
    const fp = fg.attributes.position, fn = fg.attributes.normal;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i), z = fp.getZ(i);
      fp.setY(i, floorH(x, z));
      floorN(x, z, tmpN); fn.setXYZ(i, tmpN.x, tmpN.y, tmpN.z);
    }
    fg.computeBoundingSphere();
    floorTiles.push(mesh(fg, mats.floor));
  }

  // Keep-out zone around the start so the mite begins on open floor
  const clearOf = (x, z, r) => Math.hypot(x, z) > r && clear.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + r * 0.5);
  const inThicket = (x, z, m = 0) => thicket && Math.hypot(x - thicket.x, z - thicket.z) < thicket.r + m;

  // Mineral grains
  const grains = [];
  const gGeos = [];
  for (let i = 0; i < 520; i++) {
    const r = 10 + 140 * Math.pow(R(), 2.6);
    const x = rx(), z = rz();
    if (!clearOf(x, z, 300 + r) || (r > 60 && inThicket(x, z))) continue;
    const g = grainGeo(r, 900 + i);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 0.5, R() * 6.28, R() * 0.5));
    const m4 = new THREE.Matrix4().compose(new THREE.Vector3(x, floorH(x, z) + r * 0.15, z), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m4);
    gGeos.push(g);
    grains.push({ x, z, r });
    if (r > 22) col.add(g, 'grain');
  }
  const layers = {};
  layers.grains = chunked(gGeos, mats.grain).meshes;

  // Litter flakes: decayed leaf fragments, curled, some propped on grains
  const lGeos = [];
  for (let i = 0; i < 36; i++) {
    const L = 450 + R() * 550, W = L * (0.35 + R() * 0.3);
    const x0 = rx(0.9), z0 = rz(0.9);
    if (!clearOf(x0, z0, 450 + L * 0.5) || inThicket(x0, z0, L * 0.5)) continue;
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
    col.add(sh.col, 'litter').cutId = cid;
  }
  layers.litter = chunked(lGeos, mats.litter).meshes;

  // Moss shoots: stems with leaves on a 2/5 spiral (137.5 deg divergence).
  // The first ten stand where they always have round the start (two short
  // ones close by); the rest are scattered over the larger patch, a few
  // along the way on and one either side of the thicket.
  const stems = [];
  const leafGeos = [], stemGeos = [];
  const bladeInfo = []; // upper leaves: bendable blades (see shared/techniques/mite-foliage.js)
  const spots = [[900, 400], [-700, 900], [-1200, -500], [500, -1200], [1500, 1300], [-200, 1700], [1600, -300], [-1600, 1500], [100, -400], [-500, 300]];
  const SR = rng(77);
  for (let k = 0; spots.length < 24 && k < 400; k++) {
    const x = B.cx + (SR() * 2 - 1) * B.half * 0.92, z = B.cz + (SR() * 2 - 1) * B.half * 0.92;
    if (spots.some(([a, b]) => Math.hypot(a - x, b - z) < 1300)) continue;
    if (inThicket(x, z, 150) || Math.hypot(x, z) < 900) continue;
    spots.push([x, z]);
  }
  for (let s = 0; s < spots.length; s++) {
    let [sx, sz] = spots[s];
    // a shoot standing in a cleared disc moves to just outside it
    for (const c of clear) { const d = Math.hypot(sx - c.x, sz - c.z); if (d < c.r + 250) { const k = (c.r + 250) / Math.max(1, d); sx = c.x + (sx - c.x) * k; sz = c.z + (sz - c.z) * k; } }
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
    col.add(new THREE.TubeGeometry(curve, 10, rad, 6, false), 'stem').cutId = stemId;
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
      // Every leaf is a thin blade (one cell layer) that bends. The lowest,
      // old leaves that arch out and rest their tips on the floor are much
      // stiffer (they are ramps: they give a little under a mite, no more).
      const e = col.add(sh.col, 'blade');
      e.cutId = leafId;
      const samples = [0.2, 0.4, 0.55, 0.7, 0.85, 1].map((u) => bez(u, new THREE.Vector3()));
      bladeInfo.push({ geoIndex: leafGeos.length - 1, base: start.clone(), tip: tip.clone(), samples, entry: e, L, stiff: lowest ? 3.2 : clamp01((560 / L) ** 2 * 1.1), info });
    }
  }
  const stemCh = chunked(stemGeos, mats.stem), leafCh = chunked(leafGeos, mats.leaf);
  layers.moss = [...stemCh.meshes, ...leafCh.meshes];
  const foliage = createFoliage({ near: 650 });
  for (const b of bladeInfo) {
    const w = leafCh.where[b.geoIndex];
    const rod = foliage.add({ geo: w.geo, start: w.start, count: leafGeos[b.geoIndex].attributes.position.count,
      base: b.base, tip: b.tip, samples: b.samples, kind: 'cantilever', stiff: b.stiff,
      col: { geo: b.entry.mesh.geometry, onMove: (c, r) => { b.entry.c.copy(c); b.entry.r = r; } } });
    b.entry.rod = rod;
    b.info.rod = rod;
  }

  // Ground probe from above, for placing things on the topmost surface
  const down = new THREE.Vector3(0, -1, 0);
  const topAt = (x, z) => keep(col.cast(new THREE.Vector3(x, 4000, z), down, 6000));
  const keep = (h) => h && { point: h.point.clone(), normal: h.normal.clone(), dist: h.dist, kind: h.kind, entry: h.entry };

  // Fungal hyphae: 3-5 µm threads strung between surfaces, with side branches
  const hGeos = [];
  const hyphaInfo = [];
  const thread = (pts, r, segs = 28) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs, r, 4, false);
  for (let i = 0; i < 150; i++) {
    // more of them (and their tips, food) round the start: the calm half is for grazing
    const nearStart = i < 40;
    const x = nearStart ? (R() * 2 - 1) * 1700 : rx(0.9), z = nearStart ? (R() * 2 - 1) * 1700 : rz(0.9);
    if (!clearOf(x, z, 0) || inThicket(x, z, 200)) { R(); R(); continue; }
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

  // The hyphal thicket: a fungal colony in the litter. Conidiophores (upright
  // spore-bearing stalks, 150-320 µm, a spore head on top) stand through it and
  // threads run between them at a mite's body height, criss-crossing the way
  // on. Bodies push the threads aside (they drag: main.js slows a mite by the
  // threads across it); a bite grazes a thread away for good, and it regrows
  // slowly once nobody is near (thicketCut / thicketRegrow).
  const strands = [];
  const thick = { strands, layer: [] };
  if (thicket) {
    const TR = rng(4242);
    const posts = [];
    for (let i = 0; i < 50; i++) {
      const a = TR() * Math.PI * 2, d = Math.sqrt(TR()) * thicket.r;
      const x = thicket.x + Math.cos(a) * d, z = thicket.z + Math.sin(a) * d;
      const h = 120 + TR() * 150;
      const p = new THREE.Vector3(x, floorH(x, z), z);
      p.h = h;
      posts.push(p);
    }
    const pGeos = [], sGeos = [], headGeos = [];
    for (const p of posts) {
      const top = p.clone(); top.y += p.h;
      const mid = p.clone().lerp(top, 0.5); mid.x += (TR() - 0.5) * 30; mid.z += (TR() - 0.5) * 30;
      pGeos.push(thread([p, mid, top], 3.2, 6));
      const head = new THREE.IcosahedronGeometry(14 + TR() * 8, 1); head.translate(top.x, top.y + 8, top.z);
      headGeos.push(head);
      food.push({ kind: 'head', p: top.clone().add(new THREE.Vector3(0, 8, 0)), geo: head, left: 1, t: 0, i: headGeos.length - 1 });
    }
    // threads: between pairs of nearby stalks, at 40-95% of their height, sagging
    const pairs = [];
    for (let i = 0; i < posts.length; i++) {
      const near = posts.map((q, j) => [j, q.distanceTo(posts[i])]).filter(([j, d]) => j !== i && d > 140 && d < 560).sort((a, b) => a[1] - b[1]).slice(0, 3);
      for (const [j] of near) if (i < j || !near.some(([k]) => k === j)) pairs.push([i, j]);
    }
    const seen = new Set();
    for (const [i, j] of pairs) {
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const A = posts[i], Bp = posts[j];
      const a = A.clone(); a.y += A.h * (0.35 + TR() * 0.6);
      const b = Bp.clone(); b.y += Bp.h * (0.35 + TR() * 0.6);
      const span = a.distanceTo(b);
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(Math.PI * t) * span * (0.12 + TR() * 0.1);
        p.x += Math.sin(t * 7 + i) * 6; p.z += Math.cos(t * 5 + j) * 6;
        p.y = Math.max(p.y, floorH(p.x, p.z) + 30);
        pts.push(p);
      }
      sGeos.push(thread(pts, 1.8 + TR() * 0.8, 20));
      strands.push({ pts, a: pts[0].clone(), b: pts[10].clone(), samples: pts.slice(1, 10), geoIndex: sGeos.length - 1, cut: 0, rod: null });
    }
    const sCh = chunked(sGeos, mats.hypha);
    const postsMesh = mesh(mergeGeos(pGeos), mats.hypha);
    const headsMesh = mesh(mergeGeos(headGeos), mats.spore);
    // each spore head: its own vertex range, so a grazed one can shrink away
    let o = 0;
    for (const f of food) if (f.kind === 'head') { f.start = o; f.count = headGeos[f.i].attributes.position.count; o += f.count; f.mesh = headsMesh; f.rest = headsMesh.geometry.attributes.position.array.slice(f.start * 3, (f.start + f.count) * 3); }
    for (const st of strands) {
      const w = sCh.where[st.geoIndex];
      st.geo = w.geo; st.start = w.start; st.count = sGeos[st.geoIndex].attributes.position.count;
      st.rest = w.geo.attributes.position.array.slice(st.start * 3, (st.start + st.count) * 3);
      st.rod = foliage.add({ geo: w.geo, start: st.start, count: st.count, base: st.a, tip: st.b, samples: st.samples, kind: 'string', stiff: 0.5 });
    }
    thick.layer = [...sCh.meshes, postsMesh, headsMesh];
    layers.hyphae.push(...thick.layer);
  }
  /** Graze a thicket thread away (it is gone until it regrows). */
  const thicketCut = (st) => {
    if (st.cut) return;
    st.cut = 1; st.t = 40;
    const i = foliage.rods.indexOf(st.rod);
    if (i >= 0) foliage.rods.splice(i, 1);
    const P = st.geo.attributes.position;
    for (let k = 0; k < st.count; k++) P.setXYZ(st.start + k, st.a.x, st.a.y, st.a.z);
    P.needsUpdate = true;
  };
  /** Regrow grazed threads after a while, once no body is within 600 µm. */
  const thicketRegrow = (dt, bodies) => {
    for (const st of strands) {
      if (!st.cut || (st.t -= dt) > 0) continue;
      if (bodies.some((c) => Math.hypot(c.x - (st.a.x + st.b.x) / 2, c.z - (st.a.z + st.b.z) / 2) < 600)) { st.t = 2; continue; }
      st.cut = 0;
      st.rod.d.set(0, 0, 0); st.rod.vel.set(0, 0, 0);
      foliage.rods.push(st.rod);
      st.geo.attributes.position.array.set(st.rest, st.start * 3);
      st.geo.attributes.position.needsUpdate = true;
    }
  };
  /** A grazed spore head shrinks (s 1 whole .. 0 gone) toward its centre. */
  const shrinkHead = (f, s) => {
    const P = f.mesh.geometry.attributes.position;
    for (let k = 0; k < f.count; k++) {
      const r = 3 * k;
      P.setXYZ(f.start + k, f.p.x + (f.rest[r] - f.p.x) * s, f.p.y + (f.rest[r + 1] - f.p.y) * s, f.p.z + (f.rest[r + 2] - f.p.z) * s);
    }
    P.needsUpdate = true;
  };

  // Spores and pollen, instanced, resting on surfaces; more spores in the calm
  // first half of the way (grazing while you explore)
  const placeInst = (geo, count, size, mat, near = 0) => {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const byKey = new Map();
    let n = 0;
    for (let i = 0; i < count * 3 && n < count; i++) {
      let hx, hz;
      if (i < near) { const s = R() * ROUTE.length * 0.5, w = (R() * 2 - 1) * 1300; hx = ROUTE.ux * s - ROUTE.uz * w; hz = ROUTE.uz * s + ROUTE.ux * w; } else { hx = rx(0.95); hz = rz(0.95); }
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
      group.add(im);
      ims.push(im);
    }
    return ims;
  };
  // fungal conidia: smooth ellipsoids, ~6 x 10 µm
  const spore = new THREE.SphereGeometry(1, 10, 8); spore.scale(0.6, 1, 0.6);
  layers.spores = placeInst(spore, 480, 5, mats.spore, 260);
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
  layers.spores.push(...placeInst(mergeGeos(ech), 70, 12, mats.spore));
  // bisaccate conifer pollen: a corpus with two air sacs, ~70 µm
  const corp = new THREE.SphereGeometry(1, 16, 12); corp.scale(0.9, 0.62, 0.62);
  const sac1 = new THREE.SphereGeometry(0.62, 14, 10); sac1.translate(0.55, -0.22, 0);
  const sac2 = new THREE.SphereGeometry(0.62, 14, 10); sac2.translate(-0.55, -0.22, 0);
  layers.spores.push(...placeInst(mergeGeos([corp, sac1, sac2]), 20, 34, mats.spore));

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
  return { group, colliders: col, grains, stems, mats, topAt, layers, setLayer, foliage, food, eatSpore, cut, floorTiles,
    thicket: thick, thicketCut, thicketRegrow, shrinkHead };
}
