// The voxel kit: one module for every way a monster, fodder, champion or boss
// model is sculpted from blocks (it replaces the three kits that lived in
// monsters.js, fodder.js and bossmodels.js). Units are skin pixels in the
// frame of the rig group a block is drawn into (PX world units each).
//
//   const K = kit(rig, look, opts)    loose blocks, merged into ONE
//       vertex-coloured mesh per rig part when K.done() is called:
//     K.box / flare / boxY / boxZ     a box (turned, a skirt strip, in a local
//                                     frame, in a child group's frame)
//     K.clumps(p, c, s, { on })       clumps scattered over a box's faces, half
//                                     sunk; on: [centre, radii, pw] of the mass
//                                     they grow from, so none float
//     K.shag / K.cracks               a shaggy coat; glowing cracks (rim: decals)
//     K.vox / K.voxZ                  a box drawn as a shell of cells (grain)
//     K.blob(p, c, r, cell, col, o)   a rounded mass of cells; untilted masses
//                                     of one part share a grid and only the
//                                     faces open to the air are drawn
//     K.carve(p, cut)                 cut cells out of a part's masses
//     K.tone(cols, j), K.r()          a jittered colour; the kit's seeded random
//     K.done()                        build the meshes (rig.meshes, the part)
//   opts: seed (K.r), density, ao (shading toward the underside), rough /
//     metal / emit / fill (voxMat), share (a name whose geometry every build
//     shares, per name and density: the fodder hordes).
//
//   sculpt(rig, parent, shapes, opts, boxes)   the bosses' sculpted cells
//       (ellipsoids, boxes and capsules filled on a grid with noise, bump and
//       fuzz) plus loose boxes, as ONE mesh with matte, metal, glow and lit
//       material groups. rig.vd: the grid's density; rig.merge: greedy-mesh
//       the cells (tones in three steps); rig.hg: the jitter's grain in cells.
//       along() makes shapes along a curve, hideSkin() hides skin boxes.
//
// What every way shares:
//   - density: a big model is made of more blocks, not bigger ones (the
//     owner's rule). BUILD / withBuild / voxDensity / rigDensity / densityFor
//     below; the box kit takes it as opts.density (default BUILD.k), the
//     sculpt as rig.vd.
//   - shapes (proportions.js reshape): a part its builder reshaped is drawn
//     through its shape, re-voxelised at the model's own cell size (box, blob,
//     carve, clumps, shag, cracks, vox and sculpt all read rig.shape).
//   - the rig contract (rigContract.js): markHeadCore, markHeadwear (a second
//     kit drawn inside markHeadwear for a helmet), markTip, markHeld.
//   - determinism: every kit draws from its own seeded random (K.r), so a
//     build lays down the same blocks in the same order every time; the
//     geometry caches (per build, BUILD.key; per shared name, opts.share)
//     rely on it.
import * as THREE from 'three/webgpu';
import { vertexColor, vec3, mix, step, screenCoordinate, interleavedGradientNoise, uniform } from 'three/tsl';
import { PX } from './character.js';
import { mulberry32 } from '../util.js';
import { shapeX, unshapeX, shapeK } from './proportions.js';

// (the shape helpers, from one place with the kit)
export { reshape, applyShape, shapeOf, shapeX, unshapeX, shapeK, legScale } from './proportions.js';
const rng = (seed = 1) => mulberry32(seed);

// ---- voxel density ----------------------------------------------------------------
// A hero is drawn at rig scale 1.18 (root 0.944 = 1.18 x CHAR_SCALE): one skin
// pixel is about 0.055 m, and its 128 x 128 skin (res 2) has two texels per
// skin pixel. A model made big with its rig scale should keep those sizes, so
// a big model is made of more blocks rather than bigger ones (the owner's rule).
// density = how many hero pixels fit in one of the model's own skin pixels.
export const HERO_SCALE = 1.18;
// The build in progress: k is the extra scale a champion is built at (its
// look.scale, champions.js buildChampionRig); key names the build for the
// voxel kit's geometry cache (VoxKit below); n counts the kits it made.
export const BUILD = { k: 1, key: null, n: 0 };
export function withBuild(opts, fn) {
  const prev = { k: BUILD.k, key: BUILD.key, n: BUILD.n };
  BUILD.k = opts.k ?? prev.k; BUILD.key = opts.key ?? null; BUILD.n = 0;
  try { return fn(); } finally { Object.assign(BUILD, prev); }
}
// density of a model built at rig scale s (the champion factor included)
export const densityFor = (s = HERO_SCALE) => (s / HERO_SCALE) * BUILD.k;
export const rigDensity = (rig) => (rig.baseScale / (HERO_SCALE * 0.8)) * BUILD.k;
// the same for loose cubes and cells: a hero's voxel hair and outfit cubes
// are 1.12 of its skin pixels (the measured hero cube, 0.0615 m)
export const HERO_CUBE = 1.12;
export const voxDensity = (rig) => rigDensity(rig) / HERO_CUBE;

// ---- voxel detail kit -----------------------------------------------------------
// Loose boxes (in skin pixels, optionally rotated) collected per parent group
// and merged into ONE vertex-coloured mesh per parent, so a model can carry
// hundreds of fur clumps, plates, rivets and feathers for a handful of draw
// calls. The material is cached per look and shares the skin material's
// flash, glow and dissolve uniforms, so hit flashes, elite glows and the
// ghost's see-through dissolve cover the detail too. Any colour with a
// channel at full strength (0xff) glows: eyes, lava cracks, fire.
const voxMats = new Map();
export function voxMat(look, { rough = 0.75, metal = 0, emit = 0.7, fill = 0.12 } = {}) {
  const key = `${look.uuid}:${rough}:${metal}:${emit}:${fill}`;
  if (voxMats.has(key)) return voxMats.get(key);
  const u = look.userData;
  const m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: rough, metalness: metal });
  const vc = vertexColor();
  const hot = step(0.985, vc.r.max(vc.g).max(vc.b));
  m.colorNode = vec3(1, 1, 1).mul(hot.oneMinus());   // glowing cells are pure light
  // (emit and fill as uniforms, not constants: every kind's detail material
  // then has the same shader code and shares one program, where constants
  // made a program per kind, compiled when the kind first drew)
  m.emissiveNode = mix(vc.mul(hot).mul(uniform(emit)).add(vc.mul(uniform(fill))).add(u.glow), vec3(2.2, 2.2, 2.2), u.flash);
  m.maskNode = interleavedGradientNoise(screenCoordinate.xy).greaterThan(u.dissolve);
  m.userData = u;
  m.voxParams = { rough, metal, emit, fill };   // (charmat.js: a bone's skin and detail drawn as one part)
  voxMats.set(key, m);
  return m;
}
const KFACES = [
  [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], 0.9],
  [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], 0.9],
  [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], 1.1],
  [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], 0.62],
  [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], 1],
  [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], 0.84],
];
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
const _qi = new THREE.Quaternion(), _w = new THREE.Vector3();
// Hidden faces: a box face that lies wholly inside another box of the same
// part (boxes that touch or overlap) is never seen, so it is not drawn. A
// box is convex, so a face is inside another box exactly when its four
// corners are (pushed a hair out along the face's normal, so faces that only
// meet a coplanar face stay). Boxes are found through a coarse grid.
const HID_EPS = 0.02, HID_TOL = 0.002, GRID = 4;
const UNION = true;
function hiddenFaces(list) {
  const n = list.length, hidden = new Uint8Array(n * 6);
  if (n < 2) return hidden;
  const Q = new Array(n), grid = new Map();
  const cellKey = (i, j, k) => (i + 512) + 1024 * ((j + 512) + 1024 * (k + 512));
  for (let b = 0; b < n; b++) {
    const B = list[b], rot = B.rx || B.ry || B.rz;
    Q[b] = rot ? new THREE.Quaternion().setFromEuler(_e.set(B.rx, B.ry, B.rz, B.order ?? 'XYZ')) : null;
    // a bounding box (the circumscribed sphere for a turned box)
    const ex = rot ? Math.hypot(B.w, B.h, B.d) / 2 : B.w / 2, ey = rot ? ex : B.h / 2, ez = rot ? ex : B.d / 2;
    const i0 = Math.floor((B.x - ex) / GRID), i1 = Math.floor((B.x + ex) / GRID), j0 = Math.floor((B.y - ey) / GRID), j1 = Math.floor((B.y + ey) / GRID), k0 = Math.floor((B.z - ez) / GRID), k1 = Math.floor((B.z + ez) / GRID);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > 4000) continue;   // (a huge slab covers nothing worth the cells)
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) { const key = cellKey(i, j, k); let L = grid.get(key); if (!L) grid.set(key, L = []); L.push(b); }
  }
  const inside = (b, x, y, z) => {
    const B = list[b]; _w.set(x - B.x, y - B.y, z - B.z);
    if (Q[b]) _w.applyQuaternion(_qi.copy(Q[b]).invert());
    return Math.abs(_w.x) <= B.w / 2 + HID_TOL && Math.abs(_w.y) <= B.h / 2 + HID_TOL && Math.abs(_w.z) <= B.d / 2 + HID_TOL;
  };
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], ctr = [0, 0, 0];
  for (let b = 0; b < n; b++) {
    const B = list[b];
    for (let f = 0; f < 6; f++) {
      const [nn, vs] = KFACES[f];
      _n.set(nn[0], nn[1], nn[2]); if (Q[b]) _n.applyQuaternion(Q[b]);
      ctr[0] = ctr[1] = ctr[2] = 0;
      for (let q = 0; q < 4; q++) {
        const v = vs[q];
        _v.set(v[0] * B.w / 2, v[1] * B.h / 2, v[2] * B.d / 2); if (Q[b]) _v.applyQuaternion(Q[b]);
        C[q][0] = B.x + _v.x + _n.x * HID_EPS; C[q][1] = B.y + _v.y + _n.y * HID_EPS; C[q][2] = B.z + _v.z + _n.z * HID_EPS;
        ctr[0] += C[q][0] / 4; ctr[1] += C[q][1] / 4; ctr[2] += C[q][2] / 4;
      }
      const L = grid.get(cellKey(Math.floor(ctr[0] / GRID), Math.floor(ctr[1] / GRID), Math.floor(ctr[2] / GRID)));
      if (!L) continue;
      let one = false;
      for (const o of L) {
        if (o === b) continue;
        if (inside(o, ...C[0]) && inside(o, ...C[1]) && inside(o, ...C[2]) && inside(o, ...C[3])) { hidden[b * 6 + f] = 1; one = true; break; }
      }
      // (or covered by several boxes together: a 4 x 4 grid of points over
      // the face, each inside some other box)
      if (one || !UNION) continue;
      let all = true;
      for (let u = 0; u < 4 && all; u++) for (let v = 0; v < 4 && all; v++) {
        const fu = (u + 0.5) / 4, fv = (v + 0.5) / 4;
        const x = C[0][0] + (C[1][0] - C[0][0]) * fu + (C[3][0] - C[0][0]) * fv, y = C[0][1] + (C[1][1] - C[0][1]) * fu + (C[3][1] - C[0][1]) * fv, z = C[0][2] + (C[1][2] - C[0][2]) * fu + (C[3][2] - C[0][2]) * fv;
        let hit = false; for (const o of L) if (o !== b && inside(o, x, y, z)) { hit = true; break; }
        all = hit;
      }
      if (all) hidden[b * 6 + f] = 1;
    }
  }
  return hidden;
}
function boxesGeometry(list, extra = null) {
  const P = [], N = [], C = [];
  const hidden = hiddenFaces(list);
  for (let bi = 0; bi < list.length; bi++) {
    const b = list[bi];
    const c = b.col, hot = Math.max(c.r, c.g, c.b) >= 0.999;
    const rot = b.rx || b.ry || b.rz;
    if (rot) { _q.setFromEuler(_e.set(b.rx, b.ry, b.rz, b.order ?? 'XYZ')); _m4.compose(_p.set(b.x, b.y, b.z), _q, _one); }
    for (let f = 0; f < 6; f++) {
      if (hidden[bi * 6 + f] || (b.only != null && f !== b.only)) continue;   // (b.only: a flat decal, its one outward face)
      const [n, vs, sh] = KFACES[f];
      _n.set(n[0], n[1], n[2]); if (rot) _n.applyQuaternion(_q);
      const k = hot ? 1 : sh;
      for (const q of [0, 1, 2, 0, 2, 3]) {
        const v = vs[q];
        _v.set(v[0] * b.w / 2, v[1] * b.h / 2, v[2] * b.d / 2);
        if (rot) _v.applyMatrix4(_m4); else _v.add(_p.set(b.x, b.y, b.z));
        // sides fade a little toward their bottom edge
        const g = hot ? 1 : k * (n[1] === 0 ? 0.95 + v[1] * 0.05 : 1);
        P.push(_v.x * PX, _v.y * PX, _v.z * PX); N.push(_n.x, _n.y, _n.z); C.push(c.r * g, c.g * g, c.b * g);
      }
    }
  }
  // rounded masses (blob below) add their open cell faces as they are
  if (extra) { for (const v of extra.P) P.push(v); for (const v of extra.N) N.push(v); for (const v of extra.C) C.push(v); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
// Built geometry, per model build (BUILD.key, withBuild above) and kit:
// every spawn of a kind shares the first spawn's geometry, so a crowd costs
// no geometry work. The builds are seeded, so the parts come in the same order.
const KIT_GEO = new Map();
// (opts.share: geometry per shared name and density; NOBOX stands in for a box once it is made)
const SHARED = new Map(), NOBOX = { order: 'XYZ' };
const colCache = new Map();
const toCol = (c) => { if (c instanceof THREE.Color) return c; if (!colCache.has(c)) colCache.set(c, new THREE.Color(c)); return colCache.get(c); };
// Usage: const K = kit(rig, look); K.box(parent, x, y, z, w, h, d, col, rx, ry, rz) ... K.done().
export class VoxKit {
  // opts.density: how many hero pixels make one of this model's skin pixels
  // (rigDensity(rig) for a model made big with its rig scale; a champion's
  // build multiplies it, BUILD.k above). clumps, shag, cracks, vox and
  // blobs scale their block size down and their count up with it.
  // opts.share: a name (a fodder kind) whose geometry every build shares,
  // per name and density (SHARED below), shaded once with opts.ao (default
  // 0.3) instead of the per-build cache.
  constructor(rig, look, opts = {}) {
    this.rig = rig; this.mat = voxMat(look, opts); this.lists = new Map(); this.vfaces = new Map(); this.r = rng(opts.seed ?? 7);
    this.density = opts.density ?? BUILD.k; this.ao = opts.ao ?? 0;
    this.cacheKey = BUILD.key ? `${BUILD.key}@${BUILD.k.toFixed(3)}#${BUILD.n++}` : null;
    this.cached = !!(this.cacheKey && KIT_GEO.has(this.cacheKey));   // (blobs skip their cell work)
    if (opts.share != null) {
      this.share = { key: `${opts.share}@${this.density.toFixed(3)}`, name: opts.share, ao: opts.ao ?? 0.3 };
      this.share.hit = SHARED.get(this.share.key);
      this.nocache = true; this.ao = 0; this.cached = !!this.share.hit;   // (shaded in done, once per name)
    }
  }
  // A part reshaped by its builder (proportions.js reshape): what is drawn
  // into it lands through its shape. Clumps, shag, cracks and vox() cells
  // keep their own size (only their layout moves), so they draw raw.
  _sh(p) { return this._raw ? null : this.rig.shape?.get(p) ?? null; }
  _rawDo(fn) { this._raw = (this._raw ?? 0) + 1; try { return fn(); } finally { this._raw--; } }
  box(p, x, y, z, w, h, d, col, rx = 0, ry = 0, rz = 0) {
    // (a shared build already made: only the part's place in the list counts)
    if (this.share?.hit) { let L = this.lists.get(p); if (!L) this.lists.set(p, L = []); L.push(NOBOX); return this; }
    const S = this._sh(p);
    if (S) { h *= shapeK(S, y, 1); x = shapeX(S, x, 0); y = shapeX(S, y, 1); z = shapeX(S, z, 2); w *= S.f[0]; d *= S.f[2]; }
    if (!this.lists.has(p)) this.lists.set(p, []);
    this.lists.get(p).push({ x, y, z, w, h, d, col: toCol(col), rx, ry, rz });
    return this;
  }
  // a skirt strip: turned to face outward (yaw about y), then its hem tilted
  // out by tilt (rad)
  flare(p, x, y, z, w, h, d, col, yaw, tilt) { this.box(p, x, y, z, w, h, d, col, -tilt, yaw, 0); this.lists.get(p).at(-1).order = 'YXZ'; return this; }
  // a box in a local frame at o turned by ry about y (no extra group or mesh)
  boxY(p, o, ry, x, y, z, w, h, d, col, rx = 0) {
    const c = Math.cos(ry), sn = Math.sin(ry);
    return this.box(p, o[0] + x * c + z * sn, o[1] + y, o[2] - x * sn + z * c, w, h, d, col, rx, ry, 0);
  }
  // a box in the frame of a child group g (offset and turned about z only,
  // like a QuadRig knee), drawn into g's parent so it costs no extra mesh
  boxZ(g, x, y, z, w, h, d, col, rx = 0) {
    const rz = g.rotation.z, c = Math.cos(rz), sn = Math.sin(rz), P = g.position;
    return this.box(g.parent, P.x / PX + x * c - y * sn, P.y / PX + x * sn + y * c, P.z / PX + z, w, h, d, col, rx, 0, rz);
  }
  // a colour picked from cols with a little brightness jitter
  tone(cols, j = 0.12) { const c = toCol(cols[Math.floor(this.r() * cols.length)]); if (Math.max(c.r, c.g, c.b) >= 0.999) return c; return c.clone().multiplyScalar(1 + (this.r() - 0.5) * j); }
  // Clumps scattered over the faces of a box (centre c, size s), each half
  // sunk into the surface: fur, scales, rubble. faces: any of 'tbfklr'
  // (top, bottom, front +z, back -z, left -x, right +x).
  // on: [centre, radii, pw] of the rounded mass (a blob) they grow from: a
  // clump the box face leaves in the air beyond it (a corner of the box
  // round a round mane) is drawn in toward its centre until it sits half
  // sunk on its surface, so no clump floats (perf/islands.cjs).
  clumps(p, c, s, { n = 20, size = [1, 1.8], cols, faces = 'tfklr', out = 0.1, stretch = [1, 1, 1], j = 0.14, keep = null, on = null } = {}) {
    const S = this._sh(p);
    if (S) {   // (as many clumps a face area as before: fewer on a part drawn smaller)
      const f = S.f, k = (f[0] * f[1] + f[1] * f[2] + f[0] * f[2]) / 3, kp = keep && ((x, y, z, ff) => keep(unshapeX(S, x, 0), unshapeX(S, y, 1), unshapeX(S, z, 2), ff));
      const on2 = on && [on[0].map((v, a) => shapeX(S, v, a)), on[1].map((v, a) => v * shapeK(S, on[0][1], a)), on[2]];
      return this._rawDo(() => this.clumps(p, c.map((v, a) => shapeX(S, v, a)), s.map((v, a) => v * shapeK(S, c[1], a)), { n: Math.max(1, Math.round(n * k)), size, cols, faces, out, stretch, j, keep: kp, on: on2 }));
    }
    const D = this.density; if (D !== 1) { n = Math.round(n * D * D); size = [size[0] / D, size[1] / D]; }
    const F = [...faces].map((f) => ({ f, a: f === 't' || f === 'b' ? s[0] * s[2] : f === 'f' || f === 'k' ? s[0] * s[1] : s[1] * s[2] }));
    const tot = F.reduce((a, b) => a + b.a, 0);
    for (let i = 0; i < n; i++) {
      let r = this.r() * tot, f = F[0].f; for (const q of F) { r -= q.a; if (r <= 0) { f = q.f; break; } }
      const z = size[0] + this.r() * (size[1] - size[0]);
      let x = c[0] + (this.r() - 0.5) * s[0], y = c[1] + (this.r() - 0.5) * s[1], zz = c[2] + (this.r() - 0.5) * s[2];
      const o = z * out;
      if (f === 't') y = c[1] + s[1] / 2 + o; else if (f === 'b') y = c[1] - s[1] / 2 - o;
      else if (f === 'f') zz = c[2] + s[2] / 2 + o; else if (f === 'k') zz = c[2] - s[2] / 2 - o;
      else if (f === 'l') x = c[0] - s[0] / 2 - o; else x = c[0] + s[0] / 2 + o;
      if (keep && !keep(x, y, zz, f)) continue;
      if (on) {
        const [oc, or, pw = 2] = on, d = (Math.abs((x - oc[0]) / or[0]) ** pw + Math.abs((y - oc[1]) / or[1]) ** pw + Math.abs((zz - oc[2]) / or[2]) ** pw) ** (1 / pw);
        if (d > 1) { x = oc[0] + (x - oc[0]) / d; y = oc[1] + (y - oc[1]) / d; zz = oc[2] + (zz - oc[2]) / d; }
      }
      this.box(p, x, y, zz, z * stretch[0], z * stretch[1], z * stretch[2], this.tone(cols, j));
    }
    return this;
  }
  // Shaggy coat on a box (centre c, size s): rows of hanging tufts down the
  // sides that sweep back, and tufts along the top that bristle up and back.
  // rows: side rows from the top edge; low: how far down the sides they reach (0..1).
  shag(p, c, s, { cols, step = 1.6, len = [1.8, 3], w = 1, low = 0.8, top = true, sides = true, sweep = 0.35, bristle = 0.55, j = 0.1, ember = 0, embers = [0xff3a00, 0xff8a00] } = {}) {
    const S = this._sh(p);
    if (S) return this._rawDo(() => this.shag(p, c.map((v, a) => shapeX(S, v, a)), s.map((v, a) => v * shapeK(S, c[1], a)), { cols, step, len, w, low, top, sides, sweep, bristle, j, ember, embers }));
    const D = this.density; if (D !== 1) { step /= D; w /= D; }
    const [cx, cy, cz] = c, [sw, sh, sd] = s;
    if (sides) for (const sx of [-1, 1]) for (let y = cy + sh / 2; y > cy + sh / 2 - sh * low; y -= step * 0.9) for (let z = cz + sd / 2 - step / 2; z > cz - sd / 2; z -= step) {
      const L = len[0] + this.r() * (len[1] - len[0]), zz = z + (this.r() - 0.5) * step * 0.5;
      this.box(p, cx + sx * (sw / 2 + w * 0.3), y - L * 0.4, zz, w, L, step * 1.05, this.tone(cols, j), sweep, 0, sx * 0.12);
      // embers: a glowing seam showing between the tufts
      if (ember && this.r() < ember) this.box(p, cx + sx * (sw / 2 + w * 0.75), y - L * 0.75, zz - step * 0.45, 0.25, L * 0.6, 0.5, embers[this.r() < 0.3 ? 1 : 0], sweep, 0, sx * 0.12);
    }
    if (top) for (let x = cx - sw / 2 + step / 2; x < cx + sw / 2; x += step) for (let z = cz + sd / 2 - step / 2; z > cz - sd / 2; z -= step) {
      const L = len[0] + this.r() * (len[1] - len[0]);
      this.box(p, x + (this.r() - 0.5) * 0.4, cy + sh / 2 + w * 0.3, z, step * 1.05, w, L, this.tone(cols, j), bristle, 0, 0);
    }
    return this;
  }
  // Glowing cracks: short random walks of thin cells on the faces of a box.
  // rim: a colour for a wider glowing edge under each cell (magma: a bright
  // core in a deep red rim); then each cell is drawn as two flat decals, only
  // their outward faces, which costs less than one plain crack cell. rimKit:
  // another kit to draw the rims with (one with a lower emit, so the rim
  // glows deep red under the tone mapping where the core glows bright).
  cracks(p, c, s, { n = 4, len = [3, 6], cols = [0xff4a00, 0xff7a10], faces = 'tfklr', cell = 0.6, rim = null, rimKit = this } = {}) {
    const S = this._sh(p);
    if (S) { const c2 = c.map((v, a) => shapeX(S, v, a)), s2 = s.map((v, a) => v * shapeK(S, c[1], a)); return this._rawDo(() => (rimKit === this ? this.cracks(p, c2, s2, { n, len, cols, faces, cell, rim, rimKit }) : rimKit._rawDo(() => this.cracks(p, c2, s2, { n, len, cols, faces, cell, rim, rimKit })))); }
    const D = this.density; if (D !== 1) { cell /= D; len = [Math.round(len[0] * D), Math.round(len[1] * D)]; }
    const rimC = rim != null ? toCol(rim) : null, FI = { r: 0, l: 1, t: 2, f: 4, k: 5 };
    for (let i = 0; i < n; i++) {
      const f = faces[Math.floor(this.r() * faces.length)];
      const L = len[0] + Math.floor(this.r() * (len[1] - len[0] + 1));
      // face axes: u, v in the face plane, fixed coordinate on the normal
      let u = (this.r() - 0.5) * 0.9, v = (this.r() - 0.5) * 0.9;
      for (let k = 0; k < L; k++) {
        const col = toCol(cols[this.r() < 0.3 ? 1 : 0]);
        const t = 0.15;
        if (rimC) {
          // the rim, wide and flush; the core, narrow and a hair proud of it
          const at = (K, o, w, cc) => {
            if (f === 't') K.box(p, c[0] + u * s[0], c[1] + s[1] / 2 + o, c[2] + v * s[2], w, t * 0.5, w, cc);
            else if (f === 'f' || f === 'k') K.box(p, c[0] + u * s[0], c[1] + v * s[1], c[2] + (f === 'f' ? 1 : -1) * (s[2] / 2 + o), w, w, t * 0.5, cc);
            else K.box(p, c[0] + (f === 'r' ? 1 : -1) * (s[0] / 2 + o), c[1] + v * s[1], c[2] + u * s[2], t * 0.5, w, w, cc);
            K.lists.get(p).at(-1).only = FI[f];
          };
          at(rimKit, t * 0.25, cell * 2, rimC); at(this, t * 0.75, cell * 1.1, col);
        } else if (f === 't') this.box(p, c[0] + u * s[0], c[1] + s[1] / 2 + t / 2, c[2] + v * s[2], cell, t, cell, col);
        else if (f === 'f' || f === 'k') this.box(p, c[0] + u * s[0], c[1] + v * s[1], c[2] + (f === 'f' ? 1 : -1) * (s[2] / 2 + t / 2), cell, cell, t, col);
        else this.box(p, c[0] + (f === 'r' ? 1 : -1) * (s[0] / 2 + t / 2), c[1] + v * s[1], c[2] + u * s[2], t, cell, cell, col);
        if (this.r() < 0.55) u += (this.r() < 0.5 ? 1 : -1) * cell / Math.max(1, f === 'l' || f === 'r' ? s[2] : s[0]); else v -= cell / Math.max(1, f === 't' ? s[2] : s[1]);
        if (Math.abs(u) > 0.5 || Math.abs(v) > 0.5) break;
      }
    }
    return this;
  }
  // A box drawn as a shell of cells (centre, size and turn as box()), each
  // cell a tone from cols: a big slab gains the grain of the model's density
  // instead of reading as one flat block. cell: the cell size (default one
  // hero pixel, 1 / density); relief: a share of cells that stand out a
  // little; faces: which sides get cells (others stay one flat face).
  vox(p, x, y, z, w, h, d, cols, { cell = 1 / this.density, j = 0.12, relief = 0, out = 0.35, rx = 0, ry = 0, rz = 0, faces = 'tbfklr' } = {}) {
    const S = this._sh(p);
    if (S) return this._rawDo(() => this.vox(p, shapeX(S, x, 0), shapeX(S, y, 1), shapeX(S, z, 2), w * S.f[0], h * shapeK(S, y, 1), d * S.f[2], cols, { cell, j, relief, out, rx, ry, rz, faces }));
    const nx = Math.max(1, Math.round(w / cell)), ny = Math.max(1, Math.round(h / cell)), nz = Math.max(1, Math.round(d / cell));
    const cx = w / nx, cy = h / ny, cz = d / nz, rot = rx || ry || rz;
    if (rot) _q.setFromEuler(_e.set(rx, ry, rz));
    const put = (lx, ly, lz, sw, sh, sd, col) => {
      _v.set(lx, ly, lz); if (rot) _v.applyQuaternion(_q);
      this.box(p, x + _v.x, y + _v.y, z + _v.z, sw, sh, sd, col, rx, ry, rz);
    };
    // the core, so the shell's inner faces are hidden
    if (nx > 2 && ny > 2 && nz > 2) put(0, 0, 0, w - 2 * cx + 0.02, h - 2 * cy + 0.02, d - 2 * cz + 0.02, this.tone(cols, 0));
    else if (faces !== 'tbfklr') put(0, 0, 0, w * 0.98, h * 0.98, d * 0.98, this.tone(cols, 0));
    for (let i = 0; i < nx; i++) for (let jy = 0; jy < ny; jy++) for (let k = 0; k < nz; k++) {
      const sx = i === 0 ? -1 : i === nx - 1 ? 1 : 0, sy = jy === 0 ? -1 : jy === ny - 1 ? 1 : 0, sz = k === 0 ? -1 : k === nz - 1 ? 1 : 0;
      if (!sx && !sy && !sz) continue;
      const on = (sx < 0 && faces.includes('l')) || (sx > 0 && faces.includes('r')) || (sy > 0 && faces.includes('t')) || (sy < 0 && faces.includes('b')) || (sz > 0 && faces.includes('f')) || (sz < 0 && faces.includes('k'));
      if (!on) continue;
      let lx = -w / 2 + (i + 0.5) * cx, ly = -h / 2 + (jy + 0.5) * cy, lz = -d / 2 + (k + 0.5) * cz;
      if (relief && this.r() < relief) { const o = cell * out * (0.5 + this.r()); lx += sx * o; ly += sy * o; lz += sz * o; }
      put(lx, ly, lz, cx, cy, cz, this.tone(cols, j));
    }
    return this;
  }
  // vox() in the frame of a child group g (as boxZ)
  voxZ(g, x, y, z, w, h, d, cols, o = {}) {
    const rz = g.rotation.z, c = Math.cos(rz), sn = Math.sin(rz), P = g.position;
    return this.vox(g.parent, P.x / PX + x * c - y * sn, P.y / PX + x * sn + y * c, P.z / PX + z, w, h, d, cols, { ...o, rz });
  }
  // A rounded voxel mass and a carve through the part's masses (blob, carve below).
  blob(p, c, r, cell, col, o) { blob(this, p, c, r, cell, col, o); return this; }
  carve(p, cut) { carve(this, p, cut); return this; }
  done() { return this.share ? this._doneShared() : this._doneOwn(); }
  _doneOwn() {
    flushBlobs(this);
    const hit = this.cacheKey && !this.nocache ? KIT_GEO.get(this.cacheKey) : null, parts = [...this.lists.keys()];
    const geos = hit && hit.length === parts.length ? hit : parts.map((p) => boxesGeometry(this.lists.get(p), this.vfaces.get(p)));
    if (geos !== hit && this.ao) for (const g of geos) paintShade(g, this.ao);   // (opts.ao: each part darkens toward its underside)
    if (this.cacheKey && !this.nocache && !hit) KIT_GEO.set(this.cacheKey, geos);
    parts.forEach((p, i) => {
      const m = new THREE.Mesh(geos[i], this.mat); m.castShadow = true; m.receiveShadow = true; m.userData.baseMat = this.mat;
      this.rig.meshes.push(m); p.add(m); this.rig.shapeDone?.add(m);
    });
    this.lists.clear(); this.vfaces.clear();
    return this.rig;
  }
  _doneShared() {
    const { hit, key, name, ao } = this.share, rig = this.rig, parts = [...this.lists.keys()];
    if (hit && hit.length === parts.length) {
      parts.forEach((p, i) => { const m = new THREE.Mesh(hit[i], this.mat); m.castShadow = true; m.receiveShadow = true; m.userData.baseMat = this.mat; rig.meshes.push(m); p.add(m); });
      this.lists.clear(); return rig;
    }
    if (hit) throw new Error(`voxkit ${name}: parts changed between builds`);
    const n = rig.meshes.length; this._doneOwn();
    const geos = rig.meshes.slice(n).map((m) => m.geometry);
    for (const g of geos) paintShade(g, ao);
    SHARED.set(key, geos);
    return rig;
  }
}
export const kit = (rig, look = rig.material, opts) => new VoxKit(rig, look, opts);
// Drop the skin boxes of a rig part (the kit draws a better one in its place).
export function dropMeshes(rig, g) { for (const m of [...g.children]) if (m.isMesh) { g.remove(m); rig.meshes.splice(rig.meshes.indexOf(m), 1); } }

// ---- shading and rounded masses (blob, carve) ------------------------------------------
// Painted shading on the merged boxes: each part darkens toward its
// underside (the sheets' soft occlusion), and no lit colour is left bright
// enough to pass for a glowing one (only colours with a channel at full
// strength glow).
export function paintShade(g, ao) {
  const P = g.attributes.position.array, Cc = g.attributes.color.array;
  let lo = Infinity, hi = -Infinity;
  for (let i = 1; i < P.length; i += 3) { lo = Math.min(lo, P[i]); hi = Math.max(hi, P[i]); }
  const span = Math.max(1e-4, hi - lo);
  for (let i = 0; i < Cc.length; i += 3) {
    const m = Math.max(Cc[i], Cc[i + 1], Cc[i + 2]);
    if (Math.abs(m - 1) < 1e-6) continue;   // a glowing cell
    const t = (P[i + 1] - lo) / span, k = (1 - ao) + ao * Math.sqrt(t), top = Math.min(1, 0.97 / Math.max(1e-4, m * k));
    for (let c = 0; c < 3; c++) Cc[i + c] *= k * top;
  }
  g.attributes.color.needsUpdate = true;
}
// A rounded voxel mass, stepped like the sheets: an ellipsoid (centre c,
// radii r, in skin pixels) filled with cells, only the faces open to the air
// drawn (and merged along x where neighbours share a colour), added to the
// part's merged mesh. col(x, y, z) (each -1..1 across the radii) paints a run
// of a few cells along x, so bands, mottling and patches show as pixels.
// lo/hi keep a slice of it (lo 0 is a dome), pw squares it off (2 is round,
// 3 boxier), rx tilts it about x (rear up, nose down), keep(x, y, z) carves.
const FACE6 = [[1, 0, 0, 0.9], [-1, 0, 0, 0.9], [0, 1, 0, 1.1], [0, -1, 0, 0.62], [0, 0, 1, 1], [0, 0, -1, 0.84]];
// The cell shrinks with the kit's density (K.density), so a big model's
// masses are made of hero-sized cells. Untilted blobs of one part share one
// grid of cells (K.vgrid): a later blob paints over an earlier one where
// they overlap, and only the faces of the whole sculpted mass that are open
// to the air are drawn (flushBlobs, when the kit is done), so masses can be
// stacked and carved freely without paying for the faces between them.
function blob(K, p, c, r, cell, col, { lo = -1, hi = 1, pw = 2, rx = 0, run = [2, 4], keep = null } = {}) {
  if (!K.lists.has(p)) K.lists.set(p, []);
  if (K.cached) return;
  cell /= K.density ?? 1;
  // (a part its builder reshaped, proportions.js: the mass lands through its
  // shape, sculpted afresh from cells of the same size)
  const S = !K._raw && K.rig?.shape?.get(p);
  if (S) { r = r.map((v, a) => v * shapeK(S, c[1], a)); c = c.map((v, a) => shapeX(S, v, a)); }
  if (rx) return blobTilted(K, p, c, r, cell, col, { lo, hi, pw, rx, run, keep });
  K.vgrid ??= new Map();
  const gk = `${cell.toFixed(4)}`;
  let parts = K.vgrid.get(p); if (!parts) K.vgrid.set(p, parts = new Map());
  let G = parts.get(gk); if (!G) parts.set(gk, G = { cell, cells: new Map(), lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9] });
  const I0 = Math.floor((c[0] - r[0]) / cell), I1 = Math.ceil((c[0] + r[0]) / cell), J0 = Math.floor((c[1] - r[1]) / cell), J1 = Math.ceil((c[1] + r[1]) / cell), K0 = Math.floor((c[2] - r[2]) / cell), K1 = Math.ceil((c[2] + r[2]) / cell);
  for (let k = K0; k < K1; k++) for (let j = J0; j < J1; j++) {
    let colr = null, left = 0;
    for (let i = I0; i < I1; i++) {
      const x = ((i + 0.5) * cell - c[0]) / r[0], y = ((j + 0.5) * cell - c[1]) / r[1], z = ((k + 0.5) * cell - c[2]) / r[2];
      if (y < lo || y > hi || Math.abs(x) ** pw + Math.abs(y) ** pw + Math.abs(z) ** pw >= 1 || (keep && !keep(x, y, z))) { left = 0; continue; }
      if (left <= 0) { colr = toC(col(x, y, z)); left = run[0] + Math.floor(K.r() * (run[1] - run[0] + 1)); }
      G.cells.set(gkey(i, j, k), colr); left--;
      if (i < G.lo[0]) G.lo[0] = i; if (j < G.lo[1]) G.lo[1] = j; if (k < G.lo[2]) G.lo[2] = k;
      if (i > G.hi[0]) G.hi[0] = i; if (j > G.hi[1]) G.hi[1] = j; if (k > G.hi[2]) G.hi[2] = k;
    }
  }
}
const GW = 4096, GO = 2048;
const gkey = (i, j, k) => (i + GO) + GW * ((j + GO) + GW * (k + GO));
// Carve cells out of a part's shared blob grid: every cell whose centre
// passes cut(x, y, z) (in skin pixels) is removed (a mouth, a gap).
function carve(K, p, cut) {
  const S = K.rig?.shape?.get(p);
  if (S) { const c0 = cut; cut = (x, y, z) => c0(unshapeX(S, x, 0), unshapeX(S, y, 1), unshapeX(S, z, 2)); }
  for (const G of K.vgrid?.get(p)?.values() ?? []) for (const key of [...G.cells.keys()]) {
    const i = key % GW - GO, j = Math.floor(key / GW) % GW - GO, k = Math.floor(key / (GW * GW)) - GO;
    if (cut((i + 0.5) * G.cell, (j + 0.5) * G.cell, (k + 0.5) * G.cell)) G.cells.delete(key);
  }
}
// Draw the shared blob grids: the open faces of every part's cells, merged
// along x where neighbours share a colour (VoxKit.done calls it).
function flushBlobs(K) {
  if (!K.vgrid) return;
  for (const [p, parts] of K.vgrid) for (const G of parts.values()) {
    if (!G.cells.size) continue;
    let F = K.vfaces.get(p); if (!F) K.vfaces.set(p, F = { P: [], N: [], C: [] });
    const { cell, cells } = G, h = cell / 2;
    const put = (x, y, z) => F.P.push(x * PX, y * PX, z * PX);
    const quad = (Q, fx, fy, fz, cc, sh) => {
      const hot = Math.max(cc.r, cc.g, cc.b) >= 0.999, g = hot ? 1 : sh;
      for (const q of [0, 1, 2, 0, 2, 3]) { put(...Q[q]); F.N.push(fx, fy, fz); F.C.push(cc.r * g, cc.g * g, cc.b * g); }
    };
    for (const [fx, fy, fz, sh] of FACE6) {
      if (fx) {
        // faces along x: strips merged along z
        for (let i = G.lo[0]; i <= G.hi[0]; i++) for (let j = G.lo[1]; j <= G.hi[1]; j++) {
          let k = G.lo[2];
          while (k <= G.hi[2]) {
            const cc = cells.get(gkey(i, j, k));
            if (!cc || cells.has(gkey(i + fx, j, k))) { k++; continue; }
            let e = k + 1;
            while (e <= G.hi[2] && cells.get(gkey(i, j, e)) === cc && !cells.has(gkey(i + fx, j, e))) e++;
            const x = (i + 0.5) * cell + fx * h, y = (j + 0.5) * cell, z0 = k * cell, z1 = e * cell;
            quad(fx > 0 ? [[x, y - h, z1], [x, y - h, z0], [x, y + h, z0], [x, y + h, z1]] : [[x, y - h, z0], [x, y - h, z1], [x, y + h, z1], [x, y + h, z0]], fx, 0, 0, cc, sh);
            k = e;
          }
        }
        continue;
      }
      // faces along y and z: strips merged along x
      for (let k = G.lo[2]; k <= G.hi[2]; k++) for (let j = G.lo[1]; j <= G.hi[1]; j++) {
        let i = G.lo[0];
        while (i <= G.hi[0]) {
          const cc = cells.get(gkey(i, j, k));
          if (!cc || cells.has(gkey(i, j + fy, k + fz))) { i++; continue; }
          let e = i + 1;
          while (e <= G.hi[0] && cells.get(gkey(e, j, k)) === cc && !cells.has(gkey(e, j + fy, k + fz))) e++;
          const x0 = i * cell, x1 = e * cell, y = (j + 0.5) * cell, z = (k + 0.5) * cell;
          let Q;
          if (fy) { const yy = y + fy * h; Q = fy > 0 ? [[x0, yy, z + h], [x1, yy, z + h], [x1, yy, z - h], [x0, yy, z - h]] : [[x0, yy, z - h], [x1, yy, z - h], [x1, yy, z + h], [x0, yy, z + h]]; }
          else { const zz = z + fz * h; Q = fz > 0 ? [[x0, y - h, zz], [x1, y - h, zz], [x1, y + h, zz], [x0, y + h, zz]] : [[x1, y - h, zz], [x0, y - h, zz], [x0, y + h, zz], [x1, y + h, zz]]; }
          quad(Q, 0, fy, fz, cc, sh);
          i = e;
        }
      }
    }
  }
  K.vgrid = null;
}
// (a blob tilted about x: drawn on its own, its open faces only)
function blobTilted(K, p, c, r, cell, col, { lo = -1, hi = 1, pw = 2, rx = 0, run = [2, 4], keep = null } = {}) {
  const nx = Math.ceil(r[0] / cell), ny = Math.ceil(r[1] / cell), nz = Math.ceil(r[2] / cell), DX = 2 * nx + 2, DY = 2 * ny + 2;
  const key = (i, j, k) => (i + nx + 1) + DX * ((j + ny + 1) + DY * (k + nz + 1));
  const cells = new Map();
  for (let k = -nz; k < nz; k++) for (let j = -ny; j < ny; j++) {
    let colr = null, left = 0;
    for (let i = -nx; i < nx; i++) {
      const x = (i + 0.5) * cell / r[0], y = (j + 0.5) * cell / r[1], z = (k + 0.5) * cell / r[2];
      if (y < lo || y > hi || Math.abs(x) ** pw + Math.abs(y) ** pw + Math.abs(z) ** pw >= 1 || (keep && !keep(x, y, z))) { left = 0; continue; }
      if (left <= 0) { colr = toC(col(x, y, z)); left = run[0] + Math.floor(K.r() * (run[1] - run[0] + 1)); }
      cells.set(key(i, j, k), colr); left--;
    }
  }
  let F = K.vfaces.get(p); if (!F) K.vfaces.set(p, F = { P: [], N: [], C: [] });
  const cs = Math.cos(rx), sn = Math.sin(rx), h = cell / 2;
  const put = (x, y, z) => F.P.push((c[0] + x) * PX, (c[1] + y * cs - z * sn) * PX, (c[2] + y * sn + z * cs) * PX);
  for (const [fx, fy, fz, sh] of FACE6) {
    for (let k = -nz; k < nz; k++) for (let j = -ny; j < ny; j++) {
      let i = -nx;
      while (i < nx) {
        const cc = cells.get(key(i, j, k));
        if (!cc || cells.has(key(i + fx, j + fy, k + fz))) { i++; continue; }
        // merge a strip along x of open faces of one colour (not for the x-facing ends)
        let e = i + 1;
        if (!fx) while (e < nx && cells.get(key(e, j, k)) === cc && !cells.has(key(e + fx, j + fy, k + fz))) e++;
        const hot = Math.max(cc.r, cc.g, cc.b) >= 0.999, g = hot ? 1 : sh;
        const x0 = i * cell, x1 = e * cell, y = (j + 0.5) * cell, z = (k + 0.5) * cell;
        // the quad's corners, wound to face out
        let Q;
        if (fx) { const x = (i + 0.5) * cell + fx * h; Q = fx > 0 ? [[x, y - h, z + h], [x, y - h, z - h], [x, y + h, z - h], [x, y + h, z + h]] : [[x, y - h, z - h], [x, y - h, z + h], [x, y + h, z + h], [x, y + h, z - h]]; }
        else if (fy) { const yy = y + fy * h; Q = fy > 0 ? [[x0, yy, z + h], [x1, yy, z + h], [x1, yy, z - h], [x0, yy, z - h]] : [[x0, yy, z - h], [x1, yy, z - h], [x1, yy, z + h], [x0, yy, z + h]]; }
        else { const zz = z + fz * h; Q = fz > 0 ? [[x0, y - h, zz], [x1, y - h, zz], [x1, y + h, zz], [x0, y + h, zz]] : [[x1, y - h, zz], [x0, y - h, zz], [x0, y + h, zz], [x1, y + h, zz]]; }
        const ny2 = fy * cs - fz * sn, nz2 = fy * sn + fz * cs;
        for (const q of [0, 1, 2, 0, 2, 3]) { put(...Q[q]); F.N.push(fx, ny2, nz2); F.C.push(cc.r * g, cc.g * g, cc.b * g); }
        i = e;
      }
    }
  }
}
// (the masses' own colour cache: a cell run merges only with cells holding the
// very same Color object, and a glowing colour from K.tone is the box kit's
// cached one, so the two caches stay apart to keep the merges as they were)
const _cols = new Map();
const toC = (c) => { if (c instanceof THREE.Color) return c; if (!_cols.has(c)) _cols.set(c, new THREE.Color(c)); return _cols.get(c); };

// ---- sculpted cells (sculpt) -----------------------------------------------------
// The bosses are sculpted from voxels like the concept sheets (bossmodels.js): each rig part
// (torso, head, an arm, a leg, a jaw) gets ONE mesh holding sculpted cells
// (ellipsoids and boxes filled on a grid, faces between cells culled) and
// loose boxes (straps, studs, horns), with three material groups: matte,
// metal and glowing. Units are skin pixels relative to the parent group.
let KIT = null;
export function sculptMats() {
  if (KIT) return KIT;
  const matte = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  const metal = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.65 });
  metal.emissiveNode = vertexColor().mul(0.22);
  const glow = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 });
  glow.colorNode = vertexColor().mul(0.15);
  glow.emissiveNode = vertexColor().mul(0.8);
  const fill = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
  fill.emissiveNode = vertexColor().mul(0.12);
  KIT = [matte, metal, glow, fill];
  return KIT;
}
const MI = { m: 1, e: 2, f: 3 };
export const hash3 = (x, y, z, s) => { let n = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const smooth = (t) => t * t * (3 - 2 * t);
export function noise(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const l = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, s);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf), l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}
// face table: normal, corners of the unit cube, light
const CF = [
  [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], 0.88],
  [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], 0.88],
  [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], 1.12],
  [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], 0.6],
  [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], 1],
  [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], 0.82],
];
const tmpC = new THREE.Color();
const tmpCol = (c) => (c instanceof THREE.Color ? c : tmpC.set(c));
// A palette pick: cols[] by smooth noise (clumps of tone), or a plain colour.
const pick = (cols, x, y, z, seed = 0, f = 0.45) => { if (!Array.isArray(cols)) return cols; const t = Math.max(0, Math.min(0.999, (noise(x * f, y * f, z * f, seed) - 0.5) * 1.9 + 0.5)); return cols[Math.floor(t * cols.length)]; };

// a cell's key in the cells map: i, j, k packed into one number (|i| < 1024)
const ckey = (i, j, k) => ((i + 1024) * 2048 + (j + 1024)) * 2048 + (k + 1024);
// Sculpt cells. shapes, in priority order:
//   { e: [cx, cy, cz, rx, ry, rz] }   ellipsoid      { b: [x0, y0, z0, x1, y1, z1] }   box
//   { cap: [x0, y0, z0, x1, y1, z1, r0, r1] }   a tapered capsule between two points
//   col: hex | [hex, ...] (noise clumps) | (x, y, z, n) => hex | null (null leaves the cell to later shapes)
//   m: 'm' metal, 'e' glow, 'f' lit;  cut: true carves instead;  bump: lumpiness;  fuzz: ragged edge
// hg: the grain of the per-cell jitter (the ragged edge and, with q, the three tones) in cells,
// so a fine grid can keep blocks of 2-3 cells in step and greedy merging joins them (0 or 1: every cell)
// Returns a Map "i,j,k" -> [Color, materialIndex] on a grid of size v.
export function sculptCells(shapes, { v = 1, seed = 1, bump = 0.18, fuzz = 0.12, cellsIn = new Map(), q = false, hg = 0 } = {}) {
  const C = cellsIn;
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const ext = (sh) => {
    if (sh.e) { const [x, y, z, a, b, c] = sh.e; return [[x - a, y - b, z - c], [x + a, y + b, z + c]]; }
    if (sh.b) { const b = sh.b; return [[Math.min(b[0], b[3]), Math.min(b[1], b[4]), Math.min(b[2], b[5])], [Math.max(b[0], b[3]), Math.max(b[1], b[4]), Math.max(b[2], b[5])]]; }
    const q = sh.cap, r = Math.max(q[6], q[7]);
    return [[Math.min(q[0], q[3]) - r, Math.min(q[1], q[4]) - r, Math.min(q[2], q[5]) - r], [Math.max(q[0], q[3]) + r, Math.max(q[1], q[4]) + r, Math.max(q[2], q[5]) + r]];
  };
  for (const sh of shapes) { if (sh.cut) continue; const [a, b] = ext(sh); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a[k]); hi[k] = Math.max(hi[k], b[k]); } }
  const inside = (sh, x, y, z, n, h) => {
    const bp = sh.bump ?? bump, fz = sh.fuzz ?? fuzz;
    const slack = bp * (n - 0.5) * 2 + fz * (h - 0.5) * 2;
    if (sh.e) { const [cx, cy, cz, a, b, c] = sh.e; return ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 + ((z - cz) / c) ** 2 < 1 + slack; }
    if (sh.b) { const b = sh.b; const t = (sh.bump ?? 0) * (n - 0.5); return x >= Math.min(b[0], b[3]) - t && x <= Math.max(b[0], b[3]) + t && y >= Math.min(b[1], b[4]) - t && y <= Math.max(b[1], b[4]) + t && z >= Math.min(b[2], b[5]) - t && z <= Math.max(b[2], b[5]) + t; }
    const q = sh.cap, dx = q[3] - q[0], dy = q[4] - q[1], dz = q[5] - q[2], L2 = dx * dx + dy * dy + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - q[0]) * dx + (y - q[1]) * dy + (z - q[2]) * dz) / L2));
    const r = q[6] + (q[7] - q[6]) * t, d = Math.hypot(x - q[0] - dx * t, y - q[1] - dy * t, z - q[2] - dz * t);
    return d < r * (1 + slack * 0.5);
  };
  // each shape's reach (its bounds grown by the most its bump and fuzz can
  // push it), so a cell only tests the shapes that can hold it and the
  // empty corners of the grid cost no noise (a fine grid stays quick)
  const reach = shapes.map((sh) => {
    const sl = Math.max(0, (sh.bump ?? bump) + (sh.fuzz ?? fuzz)), [a, b] = ext(sh);
    let g = 0.01;
    if (sh.e) g = Math.max(sh.e[3], sh.e[4], sh.e[5]) * (Math.sqrt(1 + sl) - 1) + 0.01;
    else if (sh.b) g = Math.abs(sh.bump ?? 0) / 2 + 0.01;
    else g = Math.max(sh.cap[6], sh.cap[7]) * sl * 0.5 + 0.01;
    return [a[0] - g, a[1] - g, a[2] - g, b[0] + g, b[1] + g, b[2] + g];
  });
  const I0 = Math.floor(lo[0] / v) - 1, I1 = Math.ceil(hi[0] / v) + 1, J0 = Math.floor(lo[1] / v) - 1, J1 = Math.ceil(hi[1] / v) + 1, K0 = Math.floor(lo[2] / v) - 1, K1 = Math.ceil(hi[2] / v) + 1;
  for (let i = I0; i < I1; i++) {
    const x = (i + 0.5) * v, SX = shapes.filter((sh, q) => x >= reach[q][0] && x <= reach[q][3]);
    if (!SX.length) continue;
    const RX = SX.map((sh) => reach[shapes.indexOf(sh)]);
    for (let j = J0; j < J1; j++) {
      const y = (j + 0.5) * v, SY = [], RY = [];
      SX.forEach((sh, q) => { if (y >= RX[q][1] && y <= RX[q][4]) { SY.push(sh); RY.push(RX[q]); } });
      if (!SY.length) continue;
      for (let k = K0; k < K1; k++) {
    const z = (k + 0.5) * v;
    let any = false; for (let q = 0; q < SY.length; q++) if (z >= RY[q][2] && z <= RY[q][5]) { any = true; break; }
    if (!any) continue;
    const n = noise(x * 0.42, y * 0.42, z * 0.42, seed), h = hg > 1 ? hash3(Math.floor(i / hg), Math.floor(j / hg), Math.floor(k / hg), seed) : hash3(i, j, k, seed);
    let cut = false, hit = null;
    for (let q = 0; q < SY.length; q++) {
      const sh = SY[q];
      if (z < RY[q][2] || z > RY[q][5] || !inside(sh, x, y, z, n, h)) continue;
      if (sh.cut) { cut = true; break; }
      let c = sh.col;
      let mi = MI[sh.m] ?? 0;
      if (typeof c === 'function') { c = c(x, y, z, n, h); if (c == null) continue; if (Array.isArray(c)) { mi = MI[c[1]] ?? 0; c = c[0]; } }
      else c = pick(c, x, y, z, seed + 3, sh.f ?? 0.28);
      hit = [new THREE.Color(c).multiplyScalar(q ? 0.93 + Math.floor(h * 3) * 0.07 : 0.93 + h * 0.14), mi]; break;   // (q: three tones, so faces can merge)
    }
    if (!cut && hit) C.set(ckey(i, j, k), hit);
      }
    }
  }
  return C;
}
// One mesh from cells (grid v) and loose boxes ({ p: [x,y,z], s: [w,h,d], c, m?, r?: [rx,ry,rz] }),
// with material groups. Hung on parent and registered with the rig.
function sculptMesh(rig, parent, opts = {}) {
  const mesh = rig.mesh(sculptGeometry(opts, PX), sculptMats()); parent.add(mesh);
  return mesh;
}
export function sculptGeometry({ cells: C = null, v = 1, boxes = [], merge = false } = {}, unit = PX) {
  const buf = [[], [], [], []].map(() => ({ P: [], N: [], Cc: [] }));
  const Q6 = [0, 1, 2, 0, 2, 3];
  if (C && merge) mergedFaces(C, v, buf);
  else if (C) for (const [key, [col, mi]] of C) {
    const k = (key % 2048) - 1024, j = (Math.floor(key / 2048) % 2048) - 1024, i = Math.floor(key / 4194304) - 1024, B = buf[mi];
    for (const [n, vs, sh] of CF) {
      if (C.has(ckey(i + n[0], j + n[1], k + n[2]))) continue;
      const crev = n[1] === 0 && C.has(ckey(i + n[0], j + 1, k + n[2])) ? 0.8 : 1;
      const g = sh * crev, r = col.r * g, gg = col.g * g, b = col.b * g;
      for (const q of Q6) { const a = vs[q]; B.P.push((i + a[0]) * v, (j + a[1]) * v, (k + a[2]) * v); B.N.push(n[0], n[1], n[2]); B.Cc.push(r, gg, b); }
    }
  }
  const e = new THREE.Euler(), M = new THREE.Matrix4(), V = new THREE.Vector3();
  for (const b of boxes) {
    const B = buf[MI[b.m] ?? 0], col = tmpCol(b.c).clone(), [w, h, d] = b.s;
    M.makeRotationFromEuler(e.set(...(b.r ?? [0, 0, 0]))); M.setPosition(...b.p);
    for (const [n, vs, sh] of CF) {
      V.set(...n).transformDirection(M); const nn = [V.x, V.y, V.z];
      for (const q of [0, 1, 2, 0, 2, 3]) {
        const a = vs[q]; V.set((a[0] - 0.5) * w, (a[1] - 0.5) * h, (a[2] - 0.5) * d).applyMatrix4(M);
        B.P.push(V.x, V.y, V.z); B.N.push(...nn);
        const g = sh * (n[1] === 0 ? 0.94 + a[1] * 0.1 : 1); B.Cc.push(col.r * g, col.g * g, col.b * g);
      }
    }
  }
  const tot = buf.reduce((a, B) => a + B.P.length, 0), P = new Float32Array(tot), N = new Float32Array(tot), Cc = new Float32Array(tot), g = new THREE.BufferGeometry();
  let start = 0;
  buf.forEach((B, mi) => { const n = B.P.length / 3; if (!n) return; P.set(B.P, start * 3); N.set(B.N, start * 3); Cc.set(B.Cc, start * 3); g.addGroup(start, n, mi); start += n; });
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  g.scale(unit, unit, unit);
  return g;
}
// Greedy meshing (pass 3, for Cerberus's budget): the open faces of the
// cells, grouped by direction and plane, with runs of the same colour, light
// and material merged into one quad, grown along one axis and then the
// other. The look is the same (each quad keeps its cells' flat colour); the
// triangles drop by half or more where tones run in clumps. Each quad is
// pushed out a hair in its own plane to close the hairline cracks at
// T-junctions.
function mergedFaces(C, v, buf) {
  const ax = [[1, 2], [0, 2], [0, 1]], groups = new Map();
  for (const [key, [col, mi]] of C) {
    const k = (key % 2048) - 1024, j = (Math.floor(key / 2048) % 2048) - 1024, i = Math.floor(key / 4194304) - 1024, c = [i, j, k];
    CF.forEach(([n, , sh], f) => {
      if (C.has(ckey(i + n[0], j + n[1], k + n[2]))) return;
      const crev = n[1] === 0 && C.has(ckey(i + n[0], j + 1, k + n[2])) ? 0.8 : 1;
      const a = n[0] ? 0 : n[1] ? 1 : 2, [ua, va] = ax[a], gk = f * 4096 + c[a] + 2048;
      let g = groups.get(gk); if (!g) groups.set(gk, g = new Map());
      g.set((c[ua] + 1024) * 2048 + c[va] + 1024, { u: c[ua], w: c[va], id: `${col.getHex()}|${mi}|${crev}`, col, mi, g: sh * crev });
    });
  }
  const E = 0.004;
  for (const [gk, g] of groups) {
    const f = Math.floor(gk / 4096), plane = (gk % 4096) - 2048, [n, vs] = CF[f], a = n[0] ? 0 : n[1] ? 1 : 2, [ua, va] = ax[a];
    const at = (u, w) => g.get((u + 1024) * 2048 + w + 1024);
    const order = [...g.values()].sort((p, q) => p.w - q.w || p.u - q.u);
    for (const c0 of order) {
      if (c0.done) continue;
      let u1 = c0.u; while (true) { const x = at(u1 + 1, c0.w); if (!x || x.done || x.id !== c0.id) break; u1++; }
      let w1 = c0.w;
      grow: while (true) { for (let u = c0.u; u <= u1; u++) { const x = at(u, w1 + 1); if (!x || x.done || x.id !== c0.id) break grow; } w1++; }
      for (let w = c0.w; w <= w1; w++) for (let u = c0.u; u <= u1; u++) at(u, w).done = true;
      const B = buf[c0.mi], lo = [0, 0, 0], hi = [0, 0, 0];
      lo[a] = hi[a] = plane; lo[ua] = c0.u - E; hi[ua] = u1 + 1 + E; lo[va] = c0.w - E; hi[va] = w1 + 1 + E;
      const r = c0.col.r * c0.g, gg = c0.col.g * c0.g, b = c0.col.b * c0.g;
      for (const q of Q6) { const p = vs[q]; for (let d = 0; d < 3; d++) B.P.push((d === a ? plane + p[d] : p[d] ? hi[d] : lo[d]) * v); B.N.push(n[0], n[1], n[2]); B.Cc.push(r, gg, b); }
    }
  }
}
const Q6 = [0, 1, 2, 0, 2, 3];
// Sculpt + boxes in one call: one mesh on parent (the skin pixels of parent's frame).
// rig.vd (voxel density): the sculpt grid is made that much finer, so a
// boss made big with its rig scale is carved from more, smaller cells (the
// shapes stay in skin pixels). Set per boss against its triangle budget.
// rig.merge: greedy-mesh the cells (mergedFaces), with the tone jitter in three steps
// rig.hg: the jitter's grain in cells (cells hg above), for a fine merged grid
export function sculpt(rig, parent, shapes, opts = {}, boxes = []) {
  const v = (opts.v ?? 1) / (rig.vd ?? 1), S = rig.shape?.get(parent);
  if (S) [shapes, boxes] = shaped(S, shapes, boxes);
  const mesh = sculptMesh(rig, parent, { cells: shapes.length ? sculptCells(shapes, { hg: rig.hg ?? 0, ...opts, v, q: !!rig.merge }) : null, v, boxes, merge: !!rig.merge });
  rig.shapeDone?.add(mesh);
  return mesh;
}
// A part its builder reshaped (proportions.js): every shape and box through
// the part's shape, sculpted afresh on the same grid; a colour function is
// still asked about the place as the builder drew it.
function shaped(S, shapes, boxes) {
  const X = (x, y, z) => [shapeX(S, x, 0), shapeX(S, y, 1), shapeX(S, z, 2)], f = S.f, fr = Math.cbrt(f[0] * f[1] * f[2]);
  const out = shapes.map((sh) => {
    const o = { ...sh };
    if (sh.e) { const e = sh.e; o.e = [...X(e[0], e[1], e[2]), e[3] * f[0], e[4] * shapeK(S, e[1], 1), e[5] * f[2]]; }
    else if (sh.b) { const b = sh.b; o.b = [...X(b[0], b[1], b[2]), ...X(b[3], b[4], b[5])]; }
    else if (sh.cap) { const q = sh.cap; o.cap = [...X(q[0], q[1], q[2]), ...X(q[3], q[4], q[5]), q[6] * fr, q[7] * fr]; }
    if (typeof sh.col === 'function') { const c0 = sh.col; o.col = (x, y, z, n, h) => c0(unshapeX(S, x, 0), unshapeX(S, y, 1), unshapeX(S, z, 2), n, h); }
    return o;
  });
  return [out, boxes.map((b) => ({ ...b, p: X(...b.p), s: b.s.map((v, a) => v * shapeK(S, b.p[1], a)) }))];
}
// hide the rig's own skin boxes on a part (the sculpt replaces them)
export const hideSkin = (...parts) => { for (const p of parts) for (const c of p.children) if (c.isMesh) c.visible = false; };
// points along a curve (for horns, tails, tentacles): f(t) -> [x, y, z]
export const along = (f, n, r0, r1, col, extra = {}) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), [x, y, z] = f(t); const r = r0 + (r1 - r0) * t; return { e: [x, y, z, r, r, r], col: typeof col === 'function' ? col(t) : col, bump: 0.05, fuzz: 0.05, ...extra }; });
