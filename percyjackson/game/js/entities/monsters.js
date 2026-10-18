// The Greek monster bestiary: blocky models (procedurally painted skins,
// shared per kind so spawning never compiles shaders) and stat blocks.
// Tiers: minor (swarms, two or three hits), elite (a threat with a tell),
// champion (mini-boss), boss (see bosses.js). Monsters never bleed: they
// burst into golden dust (goldDust below).
// The looks follow the 3D sheets in design/concept/vox-enemies.png and
// vox-bosses-*.png: soot-black hellhounds with lava cracks and gold spiked
// collars, boxy bronze spiders with glowing eyes, snake-haired dracaenae in
// gold armour, flaming-haired cheerleader empousai, white-haired Furies in
// ragged black with leather wings, skeletons in combat gear.
import * as THREE from 'three/webgpu';
import { vertexColor, vec3, mix, step, screenCoordinate, interleavedGradientNoise } from 'three/tsl';
import { Rig, PX, HOLD_PITCH, markTip, markHeld } from './character.js';
import { QuadRig, paintQuad } from './quad.js';
import { paintPerson } from './mortals.js';
import { t as txt } from '../text_config.js';
import { HS, solid, skinMat, prop, group, lavaCracks, fur, sway, rng, bruteLimbs, BUILD, withBuild, rigDensity, voxDensity, densityFor, keepAbove } from './parts.js';
import { heroHair, cellMesh, footwear } from './herovox.js';
import { FODDER_MONSTERS, fodderModels, blob, carve, flushBlobs, paintShade } from './fodder.js';
import { buildSerpent } from './serpent.js';

export { skinMat, blob, carve, paintShade, rigDensity, voxDensity };

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
  m.emissiveNode = mix(vc.mul(hot).mul(emit).add(vc.mul(fill)).add(u.glow), vec3(2.2, 2.2, 2.2), u.flash);
  m.maskNode = interleavedGradientNoise(screenCoordinate.xy).greaterThan(u.dissolve);
  m.userData = u;
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
function kitGeometry(list, extra = null) {
  const P = [], N = [], C = [];
  const hidden = hiddenFaces(list);
  for (let bi = 0; bi < list.length; bi++) {
    const b = list[bi];
    const c = b.col, hot = Math.max(c.r, c.g, c.b) >= 0.999;
    const rot = b.rx || b.ry || b.rz;
    if (rot) { _q.setFromEuler(_e.set(b.rx, b.ry, b.rz, b.order ?? 'XYZ')); _m4.compose(_p.set(b.x, b.y, b.z), _q, _one); }
    for (let f = 0; f < 6; f++) {
      if (hidden[bi * 6 + f]) continue;
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
  // rounded masses (fodder.js blob) add their open cell faces as they are
  if (extra) { for (const v of extra.P) P.push(v); for (const v of extra.N) N.push(v); for (const v of extra.C) C.push(v); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
// Built geometry, per model build (BUILD.key, parts.js withBuild) and kit:
// every spawn of a kind shares the first spawn's geometry, so a crowd costs
// no geometry work. The builds are seeded, so the parts come in the same order.
const KIT_GEO = new Map();
const colCache = new Map();
const toCol = (c) => { if (c instanceof THREE.Color) return c; if (!colCache.has(c)) colCache.set(c, new THREE.Color(c)); return colCache.get(c); };
// Usage: const K = kit(rig, look); K.box(parent, x, y, z, w, h, d, col, rx, ry, rz) ... K.done().
export class VoxKit {
  // opts.density: how many hero pixels make one of this model's skin pixels
  // (rigDensity(rig) for a model made big with its rig scale; a champion's
  // build multiplies it, parts.js BUILD.k). clumps, shag, cracks, vox and
  // blobs scale their block size down and their count up with it.
  constructor(rig, look, opts = {}) {
    this.rig = rig; this.mat = voxMat(look, opts); this.lists = new Map(); this.vfaces = new Map(); this.r = rng(opts.seed ?? 7);
    this.density = opts.density ?? BUILD.k; this.ao = opts.ao ?? 0;
    this.cacheKey = BUILD.key ? `${BUILD.key}@${BUILD.k.toFixed(3)}#${BUILD.n++}` : null;
    this.cached = !!(this.cacheKey && KIT_GEO.has(this.cacheKey));   // (blobs skip their cell work)
  }
  box(p, x, y, z, w, h, d, col, rx = 0, ry = 0, rz = 0) {
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
  clumps(p, c, s, { n = 20, size = [1, 1.8], cols, faces = 'tfklr', out = 0.1, stretch = [1, 1, 1], j = 0.14, keep = null } = {}) {
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
      this.box(p, x, y, zz, z * stretch[0], z * stretch[1], z * stretch[2], this.tone(cols, j));
    }
    return this;
  }
  // Shaggy coat on a box (centre c, size s): rows of hanging tufts down the
  // sides that sweep back, and tufts along the top that bristle up and back.
  // rows: side rows from the top edge; low: how far down the sides they reach (0..1).
  shag(p, c, s, { cols, step = 1.6, len = [1.8, 3], w = 1, low = 0.8, top = true, sides = true, sweep = 0.35, bristle = 0.55, j = 0.1, ember = 0, embers = [0xff3a00, 0xff8a00] } = {}) {
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
  cracks(p, c, s, { n = 4, len = [3, 6], cols = [0xff4a00, 0xff7a10], faces = 'tfklr', cell = 0.6 } = {}) {
    const D = this.density; if (D !== 1) { cell /= D; len = [Math.round(len[0] * D), Math.round(len[1] * D)]; }
    for (let i = 0; i < n; i++) {
      const f = faces[Math.floor(this.r() * faces.length)];
      const L = len[0] + Math.floor(this.r() * (len[1] - len[0] + 1));
      // face axes: u, v in the face plane, fixed coordinate on the normal
      let u = (this.r() - 0.5) * 0.9, v = (this.r() - 0.5) * 0.9;
      for (let k = 0; k < L; k++) {
        const col = toCol(cols[this.r() < 0.3 ? 1 : 0]);
        const t = 0.15;
        if (f === 't') this.box(p, c[0] + u * s[0], c[1] + s[1] / 2 + t / 2, c[2] + v * s[2], cell, t, cell, col);
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
  done() {
    flushBlobs(this);
    const hit = this.cacheKey && !this.nocache ? KIT_GEO.get(this.cacheKey) : null, parts = [...this.lists.keys()];
    const geos = hit && hit.length === parts.length ? hit : parts.map((p) => kitGeometry(this.lists.get(p), this.vfaces.get(p)));
    if (geos !== hit && this.ao) for (const g of geos) paintShade(g, this.ao);   // (opts.ao: each part darkens toward its underside)
    if (this.cacheKey && !this.nocache && !hit) KIT_GEO.set(this.cacheKey, geos);
    parts.forEach((p, i) => {
      const m = new THREE.Mesh(geos[i], this.mat); m.castShadow = true; m.receiveShadow = true; m.userData.baseMat = this.mat;
      this.rig.meshes.push(m); p.add(m);
    });
    this.lists.clear(); this.vfaces.clear();
    return this.rig;
  }
}
export const kit = (rig, look = rig.material, opts) => new VoxKit(rig, look, opts);
// Drop the skin boxes of a rig part (the kit draws a better one in its place).
export function dropMeshes(rig, g) { for (const m of [...g.children]) if (m.isMesh) { g.remove(m); rig.meshes.splice(rig.meshes.indexOf(m), 1); } }

// ---- shared parts -----------------------------------------------------------
// Wings on the upper back: two segments per side (root = the arm, elbow =
// the hand) that flap in rig.tick. kind 'feather' (harpy, Stymphalian bird)
// or 'bat' (Fury). Drawn with the voxel kit: one mesh per segment. Colours
// come from cols { main, tip, bone, edge, dark } or from the given materials.
export function addWings(rig, { span = 14, chord = 9, mat, tip, kind = 'bat', y = 10, flap = 1, bone = solid(0x2a1a14), cols = null, seed = 3, look = rig.material, fine = 1 } = {}) {
  const hex = (m, d) => (m?.color ? m.color.getHex() : d);
  const C = { main: hex(mat, 0x5a3a26), tip: hex(tip ?? mat, 0x3a2418), bone: hex(bone, 0x2a1a14), ...cols };
  C.edge ??= C.bone; C.dark ??= C.tip;
  const K = kit(rig, look, { seed });
  const wings = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group(); root.position.set(side * 2 * PX, y * PX, -2.6 * PX); rig.torso.add(root);
    const elbow = new THREE.Group(); root.add(elbow);
    const X = (v) => side * v;
    if (kind === 'bat') {
      // leathery membrane in stepped rows under the arm bone, then a raised
      // hand of fanned finger bones with membrane between them, and a ragged
      // trailing edge of torn strips
      const inL = span * 0.55, outL = span * 0.62;
      elbow.position.set(X(inL) * PX, 0, 0);
      K.box(root, X(inL / 2), 0.4, 0.2, inL, 1.4, 1.4, C.bone);
      for (let r = 0; r < 3; r++) K.box(root, X(inL * (1 - r * 0.15) / 2 + 0.3), -chord * (0.17 + r * 0.3), 0, inL * (1 - r * 0.15), chord * 0.32, 0.5, r % 2 ? C.tip : C.main);
      // a wing drawn bigger (fine > 1): the membrane shows its grain, long
      // ragged strips of leather layered over it, as the Fury sheet draws them
      if (fine > 1) for (let r = 0; r < 3; r++) for (let x = 0.5; x < inL * (1 - r * 0.15); x += 1.1 / fine) {
        const h = chord * (0.22 + K.r() * 0.16), sk = (K.r() - 0.5) * 0.1;
        K.box(root, X(x + 0.3), -chord * (0.17 + r * 0.3) - (K.r() - 0.3) * 0.8, side * 0 + 0.35, 0.9 / fine, h, 0.3, K.tone([C.main, C.tip, C.dark], 0.18), 0, 0, sk);
      }
      // (fine: a wing drawn bigger tears into more, narrower strips)
      for (let x = 0.6; x < inL * 0.85; x += 0.9 / fine) { const h = 1.2 + K.r() * chord * 0.45; K.box(root, X(x), -chord * 0.95 - h / 2 + 0.6, 0, 0.8 / fine, h, 0.4, K.r() < 0.5 ? C.tip : C.dark); }
      const hand = group(elbow, 0, 0, 0, 0, 0, side * 0.55);
      K.box(hand, X(outL * 0.25), 0.3, 0.2, outL * 0.5, 1.2, 1.2, C.bone);
      K.box(hand, X(outL * 0.5), 1.2, 0.2, 1.4, 2.6, 1.4, C.bone);       // the thumb claw
      const fan = [0.05, 0.45, 0.85, 1.25, 1.6];
      for (const [i, th] of fan.entries()) {
        const L = outL * (1 - i * 0.1), ux = side * Math.cos(th), uy = -Math.sin(th), px = -side * Math.sin(th), py = -Math.cos(th), rz = -side * th;
        K.box(hand, ux * L / 2, uy * L / 2, 0.25, L, 0.8, 0.8, C.bone, 0, 0, rz);
        if (i === fan.length - 1) break;
        // membrane to the next finger, and torn strips off its edge
        const mh = L * 0.36;
        K.box(hand, ux * L * 0.48 + px * mh / 2, uy * L * 0.48 + py * mh / 2, 0, L * 0.92, mh, 0.45, i % 2 ? C.tip : C.main, 0, 0, rz);
        if (fine > 1) for (let t = 0.12; t < 0.9; t += 1.1 / fine / L) {
          const h = mh * (0.7 + K.r() * 0.35);
          K.box(hand, ux * L * t + px * h / 2, uy * L * t + py * h / 2, 0.3, 0.9 / fine, h, 0.3, K.tone([C.main, C.tip, C.dark], 0.18), 0, 0, rz + side * Math.PI / 2);
        }
      }
      // the ragged trailing edge hangs from the lowest finger
      const th = fan[fan.length - 1], L = outL * (1 - (fan.length - 1) * 0.1);
      for (let k = 0, n = Math.round(7 * fine); k < n; k++) { const t = 0.2 + k * 0.84 / n, h = 1.2 + K.r() * 3.4; K.box(hand, side * Math.cos(th) * L * t - side * 0.6, -Math.sin(th) * L * t - h / 2, 0, 0.8 / fine, h, 0.35, K.r() < 0.5 ? C.dark : C.tip); }
    } else {
      // feathered: a golden leading edge, a band of coverts and a row of long
      // secondaries along the arm, then a hand of long primaries fanned out,
      // each with a pale tip (vox-enemies eagles)
      const inL = span * 0.5, outL = span * 0.6, n = 5;
      elbow.position.set(X(inL) * PX, 0, 0);
      K.box(root, X(inL / 2), chord * 0.06, 0.3, inL, 1.6, 1.6, C.edge);
      for (let i = 0; i < n; i++) {
        const x = X(inL * (i + 0.5) / n), w = inL / n + 0.35;
        K.box(root, x, -chord * 0.18, 0.4, w, chord * 0.4, 0.9, K.tone([C.main, C.edge], 0.1));
        const h = chord * 0.8 + (i % 2) * 0.8;
        K.box(root, x, -chord * 0.2 - h / 2, 0, w - 0.15, h, 0.6, K.tone([C.main], 0.12));
        K.box(root, x, -chord * 0.2 - h + 0.6, -0.05, w - 0.2, 1.4, 0.65, C.tip);
      }
      const hand = group(elbow, 0, 0, 0, 0, 0, side * 0.25);
      K.box(hand, X(outL * 0.22), chord * 0.06, 0.3, outL * 0.45, 1.4, 1.4, C.edge);
      K.box(hand, X(outL * 0.22), -chord * 0.16, 0.35, outL * 0.45, chord * 0.42, 0.9, C.main);
      for (let i = 0; i < 7; i++) {
        const a = -side * (-0.15 + i * 0.13), L = outL * (1.05 - i * 0.06), px = X(outL * 0.25), py = -chord * 0.08;
        const cx = Math.cos(a) * L / 2, cy = Math.sin(a) * L / 2;
        K.box(hand, px + side * cx, py + cy, -0.05 * i, L, chord * 0.2, 0.55, K.tone([C.dark, C.main], 0.1), 0, 0, a);
        K.box(hand, px + side * Math.cos(a) * L * 0.92, py + Math.sin(a) * L * 0.92, -0.05 * i - 0.02, L * 0.18, chord * 0.21, 0.6, C.tip, 0, 0, a);
      }
    }
    root.rotation.y = side * 0.35;
    wings.push({ root, elbow, side });
  }
  K.done();
  rig.extras.wings = wings; rig.wingFlap = flap;
  return wings;
}
// Fiery whip from the right hand: a gold-capped handle and a chain of
// segments of voxel flame (a hot core with flickering cubes round it).
export function addWhip(rig, { segs = 7, len = 3.2, color = 0xff7a1a, hand = rig.handR, look = rig.material } = {}) {
  const chain = [];
  const K = kit(rig, look, { seed: 19, emit: 0.8 });
  let parent = markHeld(new THREE.Group()); parent.position.set(0, -1 * PX, 0); hand.add(parent);   // (a whip trails: no point to aim)
  rig.wrist = false;   // (the whip hangs from the fist: no wrist cock in the attacks, see character.js)
  K.box(parent, 0, -1, 0, 1.6, 4, 1.6, 0x3a2414); K.box(parent, 0, -3, 0, 2, 0.8, 2, 0xd8a028); K.box(parent, 0, 1.2, 0, 1.8, 0.7, 1.8, 0xd8a028);
  const c = new THREE.Color(color), hot = [c.clone(), new THREE.Color(0xff5a00), new THREE.Color(0xffb020)];
  for (const h of hot) { const m = Math.max(h.r, h.g, h.b); h.multiplyScalar(1 / m); }
  for (let i = 0; i < segs; i++) {
    const g = new THREE.Group(); g.position.y = (i === 0 ? -3 : -len) * PX; parent.add(g);
    const w = 1.1 - i * 0.06;
    K.box(g, 0, -len / 2, 0, w, len + 0.1, w, hot[i % 3 === 1 ? 2 : 0]);
    for (let k = 0; k < 3; k++) { const z = 0.4 + K.r() * 0.6; K.box(g, (K.r() - 0.5) * 2, -K.r() * len, (K.r() - 0.5) * 2, z, z, z, hot[Math.floor(K.r() * 3)]); }
    chain.push(g); parent = g;
  }
  K.done();
  rig.extras.whip = chain; rig.extras.whipTip = parent;
  rig.whip = { hand, base: chain[0].parent, chain, len, phi0: 0.25, bend: new Float32Array(segs).fill(-0.5) };   // (posed by whipPose)
  return chain;
}
// Grid-voxel hair (herovox.heroHair) in the look's voxel material, so it
// flashes and dissolves with the body. Keep colours below 0xe8 per channel
// or the brightest cubes glow.
function gridHair(rig, vox, look = rig.material) {
  const hs = ((rig.dims.headS ?? 8) / 8) * HS;
  const { cells, solid: inside, res } = heroHair(vox);   // (vox.res: finer curls on a bigger model)
  const mat = voxMat(look);
  const mesh = cellMesh(cells, PX * hs / res, mat, inside);
  mesh.userData.baseMat = mat; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.hair = mesh;
  return mesh;
}
// The whip's shape, worked out in the rig's own space so it no longer hangs
// from the fist wherever the arm points (it used to dangle straight down and
// trail up to 2 m through the floor). The handle is turned against the hand's
// own turn, so the chain lies in the body's upright plane (following the
// torso's twist), and each segment's angle there (0 straight down, + toward
// the front, -PI/2 straight back) eases toward one of four shapes:
//   coil    at rest: down from the fist, then curling back and up in a loop
//   trail   moving fast or swooping: streaming out behind and rising
//   windup  thrown back over the shoulder, the lash drooping behind
//   crack   lashed forward over the top in an arc and snapped out straight
// Then, segment by segment from the fist, any that would end below the floor
// (the entity's ground, e.visY, or else the rig's own soles) is bent up to
// lie along it, so no pose takes the whip through the ground.
const _wm = new THREE.Matrix4(), _wq = new THREE.Quaternion(), _wq2 = new THREE.Quaternion(), _wv = new THREE.Vector3(), _wE = new THREE.Euler();
const wrapA = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
function worldY(o) { let y = 0, s = 1; for (let p = o; p; p = p.parent) { y = p.position.y + p.scale.y * y; } for (let p = o; p; p = p.parent) s *= p.scale.y; return [y, s]; }
function whipPose(rig, dt, e) {
  const W = rig.whip, t = rig.t ?? 0, root = rig.root, n = W.chain.length, L = W.len * PX;
  const anim = e?.anim, atk = anim?.type === 'attack';
  const mode = e?.whipCrack > 0 || e?.state === 'recover' || (atk && !e?.swooping && anim.t >= (anim.windup ?? 0.25)) ? 'crack'
    : e?.state === 'windup' || (atk && anim.t < (anim.windup ?? 0.25)) ? 'windup'
    : e?.swooping || (e?.vel && Math.hypot(e.vel.x, e.vel.z) > 1.5) ? 'trail' : 'coil';
  let p0, kb, kp;
  if (mode === 'crack') { p0 = 1.45; kp = 22; kb = 16; }
  else if (mode === 'windup') { p0 = -2.5; kp = 9; kb = 8; }
  else if (mode === 'trail') { p0 = -1.0 + Math.sin(t * 6) * 0.1; kp = 6; kb = 7; }
  else { p0 = 0.25 + Math.sin(t * 1.3) * 0.08; kp = 5; kb = 5; }
  W.phi0 = wrapA(W.phi0 + wrapA(p0 - W.phi0) * (1 - Math.exp(-kp * dt)));
  for (let i = 0; i < n; i++) {
    const b = mode === 'crack' ? 0.03 + Math.sin(t * 14 - i) * 0.05 : mode === 'windup' ? 0.12 + Math.sin(t * 5 - i * 0.8) * 0.08
      : mode === 'trail' ? -0.1 + Math.sin(t * 7 - i * 0.9) * 0.2 : -0.55 + Math.sin(t * 2.6 - i * 0.7) * 0.1;
    W.bend[i] += (b - W.bend[i]) * (1 - Math.exp(-kb / (1 + i * 0.12) * dt));   // (the tip lags the handle: the lash travels down the chain)
  }
  // the fist in the rig's own space
  _wm.identity(); _wq.identity();
  for (let o = W.hand; o && o !== root; o = o.parent) { o.updateMatrix(); _wm.premultiply(o.matrix); _wq.premultiply(o.quaternion); }
  _wv.set(0, -PX, 0).applyMatrix4(_wm);
  // the handle: upright plane of the body, turned with the torso
  _wE.set(-W.phi0, mode === 'crack' || mode === 'windup' ? (anim?.style === 'spin' ? rig.torso.rotation.y : 0) : rig.torso?.rotation.y ?? 0, 0, 'YXZ');   // (a lash aims where she faces; a spin sweeps it round)
  _wq2.setFromEuler(_wE);
  W.base.quaternion.copy(_wq.invert()).multiply(_wq2);
  // the floor in the rig's own space
  const [ry, rs] = worldY(root), floor = typeof e?.visY === 'number' ? e.visY : root.parent ? worldY(root.parent)[0] : 0;
  const minY = (floor - ry) / rs + 1.8 * PX;
  let y = _wv.y - 3 * PX * Math.cos(W.phi0), prev = W.phi0;
  for (let i = 0; i < n; i++) {
    let a = prev + W.bend[i], ny = y - L * Math.cos(a);
    if (ny < minY) { const c = Math.max(-1, Math.min(1, (y - minY) / L)); a = (Math.sin(a) >= 0 ? 1 : -1) * Math.acos(c); a += Math.PI * 2 * Math.round((prev - a) / (Math.PI * 2)); ny = y - L * Math.cos(a); }
    W.chain[i].rotation.set(-(a - prev), 0, Math.sin(t * 3.3 - i * 0.9) * 0.05);
    prev = a; y = ny;
  }
}
export function animateExtras(rig, dt, e) {
  const t = rig.t ?? 0;
  const W = rig.extras.wings;
  if (W) {
    const fast = e?.state === 'windup' || e?.swooping ? 2 : 1;
    const S = rig.wingStroke;
    if (S) {
      // A natural stroke (rig.wingStroke { base, amp, hand, down }): a quick
      // powered down-stroke with the hand spread, then a slower up-stroke with
      // the hand trailing low and swept back, so the wings read as a V or W
      // from above and never fold up into a fan over the back.
      rig.wingPh = ((rig.wingPh ?? (t * 0.37) % 1) + (dt || 0) * 9 * fast * (rig.wingFlap ?? 1) / (2 * Math.PI)) % 1;
      const p = rig.wingPh, d = S.down ?? 0.4, dn = p < d, q = dn ? p / d : (p - d) / (1 - d);
      const s = dn ? Math.cos(Math.PI * q) : -Math.cos(Math.PI * q), v = dn ? -Math.sin(Math.PI * q) : Math.sin(Math.PI * q);
      const hand = dn ? -v * 0.12 : -v * (S.hand ?? 0.45);
      for (const w of W) {
        w.ry ??= w.root.rotation.y;
        w.root.rotation.z = w.side * ((S.base ?? 0.45) + s * (S.amp ?? 0.4));
        w.root.rotation.y = w.ry + w.side * Math.max(0, v) * 0.18;
        w.elbow.rotation.z = w.side * ((S.h0 ?? 0) + hand);
      }
    } else {
      const f = Math.sin(t * 9 * fast * (rig.wingFlap ?? 1));
      for (const w of W) { w.root.rotation.z = w.side * (0.25 + f * 0.55); w.elbow.rotation.z = w.side * (0.1 + Math.max(0, f) * 0.5); }
    }
  }
  if (rig.whip) whipPose(rig, dt, e);
  const T = rig.extras.tails;
  if (T) for (const tail of T) for (let i = 0; i < tail.segs.length; i++) tail.segs[i].rotation.y = Math.sin(t * 3 + i * 0.8 + tail.ph) * 0.35;
  const S = rig.extras.snakes;
  if (S) {
    const rear = e?.gazeT > 0 || e?.state === 'windup' ? 1 : 0;
    for (const s of S) for (let i = 0; i < s.segs.length; i++) {
      s.segs[i].rotation.x = Math.sin(t * s.speed + i * 0.9 + s.ph) * s.amp - rear * 0.12;
      s.segs[i].rotation.z = Math.cos(t * s.speed * 0.8 + i * 0.7 + s.ph) * s.amp * 0.8;
    }
  }
  const Y = rig.extras.sway;
  if (Y) for (const s of Y) s.g.rotation[s.ax] = s.base + Math.sin(t * s.f + s.ph) * s.amp;
  if (rig.extras.flameHair) { const k = 1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 7.3) * 0.03; rig.extras.flameHair.scale.set(1, k, 1); }
  if (rig.extras.key) rig.extras.key.rotation.y += dt * 4;
  if (rig.extras.tongue) rig.extras.tongue.scale.z = Math.sin(t * 7) > 0.55 ? 1 : 0.15;   // the serpent tastes the air
  const B = rig.extras.breath;   // the hellhound's smoking breath: puffs roll out of the jaws, swell and rise
  if (B) for (let i = 0; i < B.length; i++) {
    const p = B[i], k = (t * 0.45 + i / B.length) % 1, s = Math.sin(k * Math.PI), o = p.userData.base;
    p.position.set(o.x + Math.sin(t * 1.3 + i * 2) * 0.05, o.y + k * 0.55, o.z + k * 0.6);
    p.scale.setScalar(0.3 + s * (0.5 + k)); p.visible = s > 0.1;
  }
}

// ---- skins --------------------------------------------------------------------
// soot-black dog with lava cracks; the glowing jaw shows when it snarls
const lavaDog = (o) => (S) => paintQuad(S, { base: o.base ?? 0x221d20, dark: 0x0e0c0e, belly: 0x2c2428, back: 0x161214, eye: 0xff2a0a, eyeLow: 0xffa040, nose: 0x050505, speckles: 40, brow: 0x0a0808, teeth: 0xfff0d0,
  custom: (s) => {
    fur(s, 0, 16, 40, 20, 60, 0x0a0808, 0x3a3034);
    lavaCracks(s, 0, 16, 40, 20, o.cracks ?? 8, [0xd83a0a, 0xff6a1a]); lavaCracks(s, 40, 16, 12, 11, Math.round((o.cracks ?? 8) / 6), [0xd83a0a, 0xff6a1a]);
    s.box(48, 0, 4, 2, 4, 0x3a0c08, 0.2); s.rect(52, 4, 4, 1, 0xff6a1a, 0); s.rect(36, 7, 4, 1, 0xff6a1a, 0);
    s.box(52, 16, 2, 3, 1, 0x0e0c0e, 0.1); s.rect(53, 18, 1, 2, 0x3a0c0a, 0.1);
  } });

// ---- model builders ----------------------------------------------------------
// The full hellhound (bigHound below): built at rig scale 1.18, the heroes'
// own voxel size (Percy's root scale is 0.944 = 1.18 x CHAR_SCALE), its dims
// in skin pixels (Percy stands about 40 of them tall).
// (pass 4, after the owner's review against vox-enemies: a powerful
// crouching dog, not a lean column. The trunk is wider than the head and
// longer, with a deep chest; shorter, thicker legs planted wide, leaning a
// little outward at rest (stance); the leg roots sit deep in the body
// (legY) and hang from the torso (legsOnTorso), so a hind leg never parts
// from the haunch however the body pitches in a walk, a run or a bite)
export const HELLHOUND = { big: true, scale: 1.18, bodyL: 60, bodyW: 34, bodyH: 36, legH: 34, legW: 10, legY: 10, legSpread: 2.5, stance: 0.12, legsOnTorso: true, headS: 19, snoutS: 14, ears: true, tail: 6, tailLen: 36, tailW: 4.8, tailCurl: 0.8, gait: 0.5, neckUp: 12, headZ: -3, jawOpen: 0.42 };
const MODELS = {
  pup: () => hound('pup', { scale: 0.95, bodyL: 10, bodyW: 6, bodyH: 6, legH: 5.5, legW: 2.8, headS: 7, ears: true, tail: 3, tailLen: 6, tailW: 1.8, tailCurl: 0.55, neckUp: 2, jawOpen: 0.25 }, { fur: 60, cracks: 6, collar: false, pup: true }),
  // A New York sewer rat (the prologue): grey-brown fur, a pink nose, ears
  // and tail, and eyes a little too red. The Mist says "just rats".
  rat: () => {
    const rig = new QuadRig({ material: skinMat('rat', (S) => paintQuad(S, { base: 0x6a5e54, dark: 0x3e352e, belly: 0xa89a8a, back: 0x564a40, eye: 0xff2a1a, eyeLow: 0xff8a6a, nose: 0xe88a9a, teeth: 0xfff4d8, speckles: 50,
      custom: (s) => { fur(s, 0, 16, 40, 20, 40, 0x4a4038, 0x847466); s.rect(36, 4, 4, 2, 0xe88a9a, 0); } })), scale: 0.95, bodyL: 10, bodyW: 5.5, bodyH: 5, legH: 3.2, legW: 1.8, headS: 5, snoutS: 3.4, ears: true, tail: 4, tailLen: 8, tailW: 0.9, tailCurl: 0.12, gait: 1.7 });
    const pink = solid(0xe8a0a8);
    for (const e of rig.head.children.filter((m) => m.isMesh && m !== rig.headMesh && Math.abs(m.position.x) > 0.01)) prop(rig, rig.head, 2.6, 2.6, 0.6, pink, e.position.x / PX * 1.1, e.position.y / PX + 1.6, e.position.z / PX + 0.4);
    if (rig.tailTip) prop(rig, rig.tailTip, 0.9, 0.9, 3, pink, 0, 0, -1.4);
    for (const sx of [-1, 1]) prop(rig, rig.head, 0.2, 0.2, 3, solid(0xd8d0c8), sx * 2.2, -1.2, 5.4, 0, sx * 0.5, 0);   // whiskers
    return rig;
  },
  hellhound: () => hound('hellhound', HELLHOUND, { fur: 170, cracks: 14, collar: true }),
  spider: () => bronzeSpider('spider', { scale: 0.85 }),
  // A serpent out of the Mist (what a "person" in the museum may really be,
  // entities/mistPeople.js): a long green snake banded in gold, rearing its
  // head and hood, with a flickering forked tongue. Nothing like a person.
  // (entities/serpent.js: a legless spine that slithers, rears and strikes)
  serpent: () => buildSerpent({ kit }),
  automaton: () => buildAutomaton(),
  harpy: () => eagle('harpy', { scale: 1.2 }),   // (size audit: ×1.2, nearer a bird-woman's height)
  // Stymphalian bird: a level bronze bird of prey in knife feathers (bronzeHunter)
  stymphalian: () => eagle('stymphalian', { scale: 1.1, metal: true, form: 'hunter' }),
  fury: () => buildFury('fury', { scale: 1.0 }),
  dracaena: () => buildDracaena(),
  empousa: () => buildEmpousa(),
  scorpion: () => buildScorpion(),
  skeleton: () => buildSkeleton(),
  spartoi: () => buildSpartoi(),
  // Telekhine (design/concept/vox-telekhine.png; the sea-demon smiths of
  // Rhodes, Hephaestus's old forge hands): half dog, half seal, sitting up
  // like a sea lion on wide front flippers, the body tapering back to a
  // fluked tail. Grey-blue hide speckled teal, a cream throat and muzzle, a
  // dog's head with a blunt seal snout, fangs and glowing orange eyes; a
  // leather smith's apron, a harness with brass buckles and tools, and an
  // iron cauldron of green-orange Greek fire on its back that it lobs at you.
  telekhine: () => buildTelekhine(),
  cyclops: () => buildCyclops(),
  gorgon_statue: () => buildStatue(),
  ghost: () => buildGhost(),
  // the open world's and the Road West's fodder and their larger kin (entities/fodder.js)
  ...fodderModels({ kit }),
};
// Hellhounds (vox-enemies, left): soot-black shaggy fur in chunky clumps,
// a hump of hackles over heavy shoulders, glowing lava cracks, a furnace in
// the open jaws with long fangs, burning eyes under a heavy brow, big paws
// with gold claws, a gold spiked collar and a smouldering tail tip.
const FUR = [0x2a2226, 0x352b30, 0x43363c, 0x1e181b, 0x50404a];
const LAVA = [0xff7000, 0xffa800];
export function hound(id, spec, opts = {}) {
  if (spec.big) return bigHound(id, spec, opts);
  const { fur: nFur = 80, cracks = 8, collar = true, pup = false } = opts;
  const mat = skinMat(id, (S) => { lavaDog({ cracks, base: 0x2e2529 })(S); S.saturate(1.3); }, { emit: 0.5 });
  const rig = new QuadRig({ material: mat, ...spec });
  const K = kit(rig, mat, { seed: pup ? 5 : 9, emit: 0.55 });
  const { L, W, H, legH, legW, hs } = rig.dims;
  const T = rig.torso;
  // coat: clumps all over, a shoulder hump and a ruff round the neck
  const st = pup ? 1.4 : 1.6;
  K.shag(T, [0, 0, -0.5], [W, H, L - 1], { cols: FUR, step: st, len: pup ? [1.4, 2.4] : [1.8, 3.2], low: 0.75, ember: pup ? 0.2 : 0.25, embers: LAVA });
  // a hump of longer hackles over the shoulders and a ruff round the neck
  K.shag(T, [0, H / 2 + 0.8, L * 0.2], [W * 0.85, 1.6, L * 0.45], { cols: FUR, step: st, len: pup ? [1.8, 3] : [2.4, 4], low: 1, bristle: 0.7 });
  K.shag(T, [0, H * 0.05, L / 2 - 1.2], [W + 1.4, H + 1.2, 2.4], { cols: FUR, step: st, len: [2.2, 3.6], low: 1, w: 1.3, top: false });
  K.clumps(T, [0, -H * 0.15, L / 2 + 0.2], [W + 0.6, H * 0.7, 1], { n: Math.round(nFur * 0.12), size: [1.2, 2], cols: FUR, faces: 'f' });
  K.cracks(T, [0, -H * 0.15, 0], [W + 0.2, H * 0.6, L - 1], { n: cracks, cols: LAVA, faces: 'lr', len: [4, 9], cell: 0.6 });
  // hackles: a crest of angled spikes down the spine, ember-tipped
  const nh = pup ? 4 : 6;
  for (let i = 0; i < nh; i++) {
    const z = L / 2 - 2 - i * (L - 3) / nh, h = (pup ? 2 : 3.2) * (1 - i * 0.1);
    K.box(T, 0, H / 2 + 1 + h / 2, z, 1.4, h, 1.6, FUR[i % 3], -0.5);
    if (i % 2 === 0) K.box(T, 0, H / 2 + 1.2 + h, z - h * 0.5, 0.8, 0.8, 0.8, LAVA[1], -0.5);
    for (const sx of [-1, 1]) K.box(T, sx * 1.4, H / 2 + 0.6 + h * 0.3, z + 0.4, 1, h * 0.7, 1.2, FUR[(i + 1) % 4], -0.6, 0, sx * 0.35);
  }
  // head: heavy brow, burning eyes, cheek tufts, fangs and a glowing maw
  const Hd = rig.head, hz = hs * 0.35, front = hz + hs / 2;
  const sn = spec.snoutS ?? hs * 0.5, sy = -hs * 0.18, sz = hs * 0.85 + sn * 0.5;
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * hs * 0.24, hs * 0.2, front + 0.4, hs * 0.42, 1.1, 1, 0x0a0708, 0, 0, sx * 0.3);
    K.box(Hd, sx * hs * 0.24, hs * 0.04, front + 0.05, 1.5, 0.9, 0.3, 0xff3000);
    K.box(Hd, sx * hs * 0.2, hs * 0.04, front + 0.12, 0.6, 0.6, 0.3, 0xffb000);
  }
  K.clumps(Hd, [0, 0, hz - 0.5], [hs, hs, hs - 1], { n: pup ? 18 : 30, size: [1, 1.8], cols: FUR, faces: 'lrtk' });
  K.clumps(Hd, [0, -hs * 0.2, hz + 0.5], [hs + 1.5, hs * 0.5, 2], { n: pup ? 8 : 14, size: [1.2, 2], cols: FUR, faces: 'lrb' });
  K.box(Hd, 0, sy + sn * 0.375 + 0.2, sz + sn / 2 - 0.6, sn * 0.6, 0.6, 1.3, 0x050404);       // nose
  K.box(Hd, 0, sy + sn * 0.375 + 0.3, sz - 0.8, sn * 0.5, 0.6, sn * 0.9, FUR[0]);            // muzzle bridge
  for (const sx of [-1, 1]) K.box(Hd, sx * (sn / 2 + 0.2), sy - sn * 0.1, sz - 0.4, 0.4, 0.5, sn * 0.8, LAVA[0]);   // the furnace glows through the lips
  const pal = sy - sn * 0.375;
  K.box(Hd, 0, pal - 0.1, sz, sn * 0.8, 0.3, sn * 0.9, 0xff5000);                            // the furnace inside
  const fang = 0xe6dcc0;
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * (sn / 2 - 0.45), pal - 0.9, sz + sn / 2 - 0.5, 0.7, pup ? 1.4 : 2, 0.7, fang);
    for (let i = 1; i < 3; i++) K.box(Hd, sx * (sn / 2 - 0.4), pal - 0.4, sz + sn / 2 - 0.5 - i * 1.1, 0.5, 0.9, 0.5, fang);
  }
  const M = rig.mouth;
  K.box(M, 0, -sn * 0.17 + sn * 0.175 + 0.12, sn * 0.5, sn * 0.75, 0.3, sn * 0.85, 0xff6a00);
  for (const sx of [-1, 1]) { K.box(M, sx * (sn * 0.45 - 0.45), sn * 0.1 + 0.7, sn - 0.5, 0.6, pup ? 1.2 : 1.6, 0.6, fang); K.box(M, sx * (sn * 0.45 - 0.4), sn * 0.1 + 0.4, sn - 1.6, 0.5, 0.8, 0.5, fang); }
  K.clumps(M, [0, -sn * 0.17, sn * 0.45], [sn * 0.9, sn * 0.35, sn * 0.8], { n: pup ? 4 : 8, size: [0.9, 1.5], cols: FUR, faces: 'blr' });
  // legs: shaggy tops, cracked shins, big paws with gold claws
  for (const leg of rig.legs) {
    K.shag(leg, [0, -legH * 0.15, 0], [legW, legH * 0.5, legW], { cols: FUR, step: 1.4, len: [1.4, 2.4], low: 0.9, top: false, sweep: 0.2 });
    K.cracks(leg, [0, -legH * 0.55, 0], [legW + 0.2, legH * 0.7, legW + 0.2], { n: pup ? 2 : 3, cols: LAVA, faces: 'lrf', len: [2, 4] });
    K.box(leg, 0, -legH + 0.9, 0.2, legW + 0.4, 1.8, legW + 0.4, FUR[1]);
    for (const dx of [-1, 0, 1]) K.box(leg, dx * (legW + 0.4) * 0.34, -legH + 0.6, legW / 2 + 0.6, (legW + 0.4) * 0.3, 1.2, 1.4, FUR[0]);
    for (const dx of [-1, 0, 1]) K.box(leg, dx * (legW + 0.4) * 0.34, -legH + 0.4, legW / 2 + 1.2, 0.55, 0.8, pup ? 0.8 : 1.1, 0xe0a428);
  }
  // tail: shaggy, with a smouldering tip
  for (const [i, seg] of rig.tail.entries()) K.clumps(seg, [0, 0, -(spec.tailLen / spec.tail) / 2], [spec.tailW, spec.tailW, spec.tailLen / spec.tail], { n: pup ? 5 : 8, size: [0.9, 1.6 - i * 0.1], cols: FUR, faces: 'tlrb' });
  const tip = rig.tailTip, tl = spec.tailLen / spec.tail;
  K.box(tip, 0, 0, -tl - 0.6, 1.6, 1.6, 1.6, LAVA[0]); K.box(tip, 0, 0.6, -tl - 1.4, 1, 1.2, 1, LAVA[1]); K.box(tip, 0.4, 1.4, -tl - 1.2, 0.6, 1, 0.6, 0xffc040);
  // gold spiked collar round the neck
  if (collar) {
    const r = hs * 0.72, n = 14, g = group(rig.neck, 0, -1.2, 0.6, -0.3);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, x = Math.sin(a) * r, y = Math.cos(a) * r;
      K.box(g, x, y, 0, 2 * Math.PI * r / n + 0.5, 1.4, 1.8, i % 2 ? 0xd09418 : 0xf0b428, 0, 0, -a);
      if (y < r * 0.6) K.box(g, Math.sin(a) * (r + 1.2), Math.cos(a) * (r + 1.2), 0, 0.9, 2, 0.9, 0xf8d870, 0, 0, -a);
    }
  }
  K.done();
  return rig;
}
// The full-size hellhound (vox-enemies, middle row: "as big as a truck",
// well over twice Percy's height). Not the pup scaled up: built at
// the heroes' voxel size (rig scale 1.18, so one block is one hero skin pixel)
// from many small blocks, so its size buys detail. A powerful crouching dog
// with a deep, broad chest and heavy shoulders, ribs showing down the flank, a
// hackled mane of black fur breaking into smoke along the spine, a big head
// with a massive furnace jaw and long fangs, molten eyes under a scowling
// brow, ember cracks all over, thick clawed paws with glowing amber claws,
// a smouldering tail. (pass 4: no smoke puffs at the jaws any more: they read
// as a nose sticking out and wiggling; the smoke aura, enemy.js, stays.)
// spec: HELLHOUND (big: true); opts as hound(). rig.dims match the QuadRig,
// so the champions' add-ons (Shadowfang's collar, scars, eyes) still land.
const DEEP = [0x1a1518, 0x231d21, 0x2c252a], SMOKE = [0x3a3438, 0x4e474c, 0x645c62];
function bigHound(id, spec, { fur: nFur = 170, cracks = 14, collar = true, alpha = false } = {}) {
  const mat = skinMat(id, (S) => { lavaDog({ cracks, base: 0x2e2529 })(S); S.saturate(1.3); }, { emit: 0.5 });
  const rig = new QuadRig({ material: mat, ...spec });
  const K = kit(rig, mat, { seed: 9 + (id.length % 7), emit: 1 });
  const { legH, legW, hs } = rig.dims, T = rig.torso, Hd = rig.head, M = rig.mouth, N = rig.neck;
  for (const g of [T, Hd, M, ...rig.legs, ...rig.tail]) dropMeshes(rig, g);
  // the coat's budget: a hound built bigger (a champion or the alpha, parts.js
  // BUILD.k) has its tufts and clumps made finer by the kit, which alone
  // would cost k squared in blocks; here the count grows with k only, so an
  // elite stays near 19k triangles and a champion under 25k
  const D = BUILD.k, fe = nFur / 170 * 0.6 / D, ss = 1.3 * Math.sqrt(D), fang = 0xe6dcc0, claw = 0xe0a428;
  // a limb segment from a to b ([y, z] in the part's frame), tilted about x
  // coat a limb segment with short blocky fur, so no face is left flat
  const FURL = [...FUR, 0x5a4a54];
  const seg = (p, a, b, w, d, col, coat = 1) => {
    const y = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, l = Math.hypot(a[0] - b[0], a[1] - b[1]) + w * 0.3, rx = Math.atan2(a[1] - b[1], a[0] - b[0]);
    K.box(p, 0, y, z, w, l, d, col, rx);
    const n = Math.round(l * (w + d) * 0.13 * coat * D), c = Math.cos(rx), sn = Math.sin(rx);
    for (let i = 0; i < n; i++) {
      const f = K.r(), u = (K.r() - 0.5) * l, sz = (1 + K.r() * 1.1) / Math.sqrt(D);
      let x = (K.r() - 0.5) * w, zz = (K.r() - 0.5) * d;
      if (f < 0.35) x = Math.sign(x || 1) * (w / 2 + 0.15); else if (f < 0.65) zz = Math.sign(zz || 1) * (d / 2 + 0.15); else if (f < 0.85) x = -w / 2 - 0.15; else x = w / 2 + 0.15;
      K.box(p, x, y + u * c - zz * sn, z + u * sn + zz * c, sz, sz * 1.4, sz, K.tone(FUR, 0.16), rx);
    }
  };
  // ---- trunk (body 34 x 36 x 60): a deep, broad chest over the front
  // legs, ribs down the flank, a waist only a little tucked and heavy
  // haunches round the hind legs' roots
  // (pass 4: wider than the head, a fifth longer and deeper in the chest, as
  // vox-enemies draws it; the haunch reaches well below the hind legs' roots,
  // QuadRig legY, so the thigh always enters the body)
  K.box(T, 0, 1, 14, 34, 34, 30, DEEP[1]);           // chest and shoulders
  K.box(T, 0, -14.5, 22, 25, 9, 12, DEEP[0]);        // the brisket
  K.box(T, 0, 3, -6, 31, 29, 14, DEEP[1]);           // ribcage
  K.box(T, 0, 5, -14, 27, 25, 6, DEEP[2]);           // waist
  K.box(T, 0, 3, -23, 31, 30, 14, DEEP[1]);          // haunches
  rig.extras.trunk = { chest: [-17, -16, -1, 17, 18, 29], haunch: [-15.5, -12, -30, 15.5, 18, -16] };   // (skin px, torso space: perf/houndlegs.cjs checks the legs stay rooted in them)
  for (const sx of [-1, 1]) {
    K.clumps(T, [sx * 17.2, 7, 15], [2, 18, 16], { n: Math.round(26 * fe), size: [2, 3.2], cols: FURL, faces: sx < 0 ? 'l' : 'r', out: 0.3, stretch: [1, 1.2, 1] });   // shoulder blade
    K.clumps(T, [sx * 17.2, -7, 21], [2.4, 14, 11], { n: Math.round(18 * fe), size: [2, 3.2], cols: FURL, faces: sx < 0 ? 'l' : 'r', out: 0.3 });              // upper-arm muscle
    for (let i = 0; i < 5; i++) {                     // ribs, with embers glowing between them
      K.box(T, sx * 15.9, 3 - i * 0.3, 0 - i * 2.3, 1, 18 - i * 1.6, 1.4, FUR[4]);
      if (i % 2 === 0) K.box(T, sx * 15.65, 1.6 - i * 0.2, -1.1 - i * 2.3, 0.4, 8 - i, 0.6, LAVA[i % 4 ? 1 : 0]);
    }
    K.clumps(T, [sx * 15.6, 2, -23], [1.6, 20, 12], { n: Math.round(22 * fe), size: [1.8, 3], cols: FURL, faces: sx < 0 ? 'l' : 'r', out: 0.3 });     // haunch muscle
  }
  K.shag(T, [0, 1, 14], [34, 34, 30], { cols: FUR, step: 2.9 * ss, len: [2.4, 4.2], w: 1.3, low: 0.8, ember: 0.08, embers: LAVA, top: false });
  K.shag(T, [0, 3, -6], [31, 29, 14], { cols: FUR, step: 2.5 * ss, len: [1.4, 2.4], low: 0.3, top: false, sweep: 0.5 });
  K.clumps(T, [0, 3, -6], [31, 29, 14], { n: Math.round(20 * fe), size: [1, 1.8], cols: FURL, faces: 'lrb', out: 0.2 });
  K.shag(T, [0, 3, -23], [31, 30, 14], { cols: FUR, step: 2.5 * ss, len: [1.8, 3], low: 0.75, sweep: 0.4, bristle: 0.9 });
  K.clumps(T, [0, -2, 29], [30, 28, 1], { n: Math.round(46 * fe), size: [1.8, 3], cols: FUR, faces: 'f', stretch: [1, 1.5, 1] });   // chest ruff
  for (let z = 2; z < 28; z += 3.4) for (let x = -14; x <= 14; x += 5.6) {                                 // fringe hanging under the chest
    const l = 2.5 + K.r() * 3.5, y0 = z > 15.5 && Math.abs(x) < 12.5 ? -19 : -16; K.box(T, x + (K.r() - 0.5), y0 - l / 2 + 1.2, z, 2.2, l, 2.2, K.tone(FUR), 0.3);
  }
  // lava veins drawn over the fur (the source sheet's cracks read from afar)
  K.cracks(T, [0, -1, 14], [35, 32, 31], { n: Math.round(cracks * 1.6), cols: LAVA, faces: 'lrf', len: [7, 14], cell: 1 });
  K.cracks(T, [0, 3, -6], [32, 24, 14], { n: Math.round(cracks * 0.6), cols: LAVA, faces: 'lr', len: [5, 9], cell: 0.9 });
  K.cracks(T, [0, 3, -23], [32.5, 26, 14.5], { n: Math.round(cracks * 0.9), cols: LAVA, faces: 'lrk', len: [5, 10], cell: 0.9 });
  for (let z = 4; z < 27; z += 3) K.box(T, (K.r() - 0.5) * 8, z > 15.5 ? -19.2 : -16.2, z, 4 + K.r() * 7, 0.4, 0.8, LAVA[K.r() < 0.3 ? 1 : 0]);   // the furnace glows under the chest
  // ---- the mane: hackles down the spine, tallest over the shoulders, breaking into smoke
  const topAt = (z) => (z > -1 ? 18 : 17.5);
  for (let z = 29; z > -28; z -= 2.2) {
    const k = Math.max(0.35, 1 - Math.abs(z - 14) / 36), top = topAt(z);
    for (const sx of [-1, 0, 1]) {
      const h = (sx ? 5 : 8.5) * k + K.r() * 2.5, x = sx * 2.4 + (K.r() - 0.5) * 0.8, lean = -0.6 - K.r() * 0.2;
      K.box(T, x, top + h / 2 - 0.8, z, 1.7, h, 1.9, K.tone([DEEP[0], DEEP[1], FUR[3]]), lean, 0, sx * 0.45);
      const tx = x + sx * h * 0.4, ty = top + h * 0.95, tz = z - h * 0.55;
      if (K.r() < 0.45) K.box(T, tx, ty, tz, 1.3, 1.3, 1.3, K.tone(SMOKE));
      else if (K.r() < 0.25) K.box(T, tx, ty - 0.4, tz, 0.8, 0.9, 0.8, LAVA[K.r() < 0.4 ? 1 : 0]);
    }
    if (K.r() < 0.4) { const s = 1.2 + K.r() * 1.4; K.box(T, (K.r() - 0.5) * 4, top + 9 * k + 2 + K.r() * 5, z - 3, s, s, s, K.tone(SMOKE)); }   // smoke rising off it
  }
  // the alpha (the boss, bossmodels.js): a burning ridge of horn spikes down
  // its back, each split by a seam of fire and tipped with flame
  if (alpha) for (let i = 0; i < 9; i++) {
    const z = 26 - i * 5.8, h = (9 - Math.abs(i - 2) * 0.9) * (1 - i * 0.04), top = topAt(z) + 1;
    K.box(T, 0, top + h / 2, z, 2.6, h, 3, DEEP[0], -0.55);
    K.box(T, 0, top + h / 2 + 0.4, z + 0.2, 2.7, h * 0.7, 0.5, LAVA[0], -0.55);
    K.box(T, 0, top + h * 0.98, z - h * 0.52, 1.4, 1.8, 1.4, LAVA[1], -0.55);
    K.box(T, 0, top + h * 1.12, z - h * 0.66, 0.8, 1.2, 0.8, 0xffd040, -0.55);
  }
  // ---- neck: thick and short, rising from the chest, with a shaggy ruff;
  // the head is carried high over the chest, as the sheet draws it
  K.box(N, 0, -7, -4, 18, 22, 16, DEEP[1], 0.2);
  K.clumps(N, [0, -7, -4], [19, 22, 16], { n: Math.round(70 * fe), size: [1.8, 3.4], cols: FUR, faces: 'lrtb', stretch: [1, 1.4, 1.2] });
  if (collar) {
    // (pass 4: a heavier ring standing proud of the neck's ruff, so the gold
    // spikes read all round as on the sheet)
    const r = 13.2, n = 22, g = group(N, 0, -4.5, 2.5, -0.6);   // (tipped forward, so its lower arc lies on the chest in front of the neck)
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, x = Math.sin(a) * r, y = Math.cos(a) * r;
      K.box(g, x, y, 0, 2 * Math.PI * r / n + 0.5, 3, 4, i % 2 ? 0xd09418 : 0xf0b428, 0, 0, -a);
      if (y < r * 0.8) { K.box(g, Math.sin(a) * (r + 2.4), Math.cos(a) * (r + 2.4), 0, 2.2, 3.6, 2.2, 0xf8d870, 0, 0, -a); K.box(g, Math.sin(a) * (r + 4.6), Math.cos(a) * (r + 4.6), 0, 1.2, 1.6, 1.2, 0xfff0b0, 0, 0, -a); }
    }
  }
  // ---- head: a heavy skull, a scowling brow over molten eyes, jaw muscles,
  // a long muzzle and a furnace mouth full of fangs (QuadRig head frame: the
  // skull centred on z = hs * 0.35, the face at z = hs * 0.85)
  // drawn at headS 20 and scaled up to the spec's head; only the structure
  // grows, the fur and teeth detail stays at the body's voxel size
  const k = hs / 20, fz = 17, sc = (v) => v.map((q) => q * k);
  const HB = (p, x, y, z, w, h, d, col, rx = 0, ry = 0, rz = 0) => K.box(p, x * k, y * k, z * k, w * k, h * k, d * k, col, rx, ry, rz);
  HB(Hd, 0, 1, 7.5, 19, 16, 19, DEEP[1]);
  HB(Hd, 0, 8.6, 6, 15, 2.4, 15, DEEP[0]);
  for (const sx of [-1, 1]) {
    HB(Hd, sx * 9.6, -3, 9, 2.6, 10, 11, DEEP[1]);                                 // jaw muscles, shaggy
    K.clumps(Hd, sc([sx * 9.6, -3, 9]), sc([2.6, 10, 11]), { n: Math.round(22 * fe), size: [1.2, 2.2], cols: FURL, faces: sx < 0 ? 'lt' : 'rt', out: 0.25 });
    for (let j = 0; j < 4; j++) HB(Hd, sx * (1.4 + j * 2), 6.6 + j * 0.6, fz + 1.1 - j * 0.2, 2.3, 2.2, 2.8, K.tone([0x0e0b0d, 0x161215]));   // the scowling brow
    HB(Hd, sx * 5, 4.2, fz + 0.3, 6.4, 4, 0.6, 0x050304);                          // eye socket
    HB(Hd, sx * 5, 4.3, fz + 0.6, 5.2, 2.8, 0.4, 0xff3000);                        // molten eye
    HB(Hd, sx * 4.4, 4.5, fz + 0.85, 2.4, 1.4, 0.3, 0xffd040);
    HB(Hd, sx * 7, 2.2, fz + 0.6, 0.9, 2.4, 0.4, 0xff6a00);                        // a drip of fire
    // ears laid back, ember-lined
    HB(Hd, sx * 6.6, 11, 1.5, 5, 6, 2.6, DEEP[0], -0.4, 0, -sx * 0.22);
    HB(Hd, sx * 7.3, 14.6, 0.2, 3.2, 4, 2.2, DEEP[0], -0.4, 0, -sx * 0.22);
    HB(Hd, sx * 7.7, 17.2, -0.8, 1.4, 2.4, 1.6, DEEP[1], -0.4, 0, -sx * 0.22);
    HB(Hd, sx * 6.7, 11.6, 2.9, 2.2, 5, 0.4, 0xd83a0a, -0.4, 0, -sx * 0.22);
  }
  K.shag(Hd, sc([0, 1, 7.5]), sc([19, 16, 19]), { cols: FUR, step: 1.8 * ss, len: [1.6, 2.8], low: 0.55, bristle: 0.9, sweep: 0.5 });
  K.clumps(Hd, sc([0, 1, 7.5]), sc([19, 16, 19]), { n: Math.round(40 * fe), size: [1, 1.8], cols: FURL, faces: 'lr', out: 0.2 });
  K.clumps(Hd, sc([0, -2.3, 23.5]), sc([11.4, 9, 13]), { n: Math.round(44 * fe), size: [0.8, 1.5], cols: [DEEP[0], DEEP[2], FUR[0], FUR[1]], faces: 'lrt', out: 0.2, keep: (x, y) => y / k > -5.2 });
  K.clumps(Hd, sc([0, 1, 7.5]), sc([19, 16, 19]), { n: Math.round(36 * fe), size: [1, 1.8], cols: FURL, faces: 'f', out: 0.2, keep: (x, y) => y / k > 8 || (y / k > -1.5 && Math.abs(Math.abs(x / k) - 5) > 3.6) });
  K.clumps(Hd, sc([0, -4, 5]), sc([21, 9, 11]), { n: Math.round(34 * fe), size: [1.6, 2.8], cols: FUR, faces: 'lrbk', stretch: [1, 1.3, 1.2] });   // cheek ruff
  K.cracks(Hd, sc([0, 0, 7.5]), sc([21.5, 13, 19]), { n: Math.max(4, Math.round(cracks / 2.5)), cols: LAVA, faces: 'lr', len: [4, 8], cell: 0.9 });
  K.cracks(N, [0, -4, -3.5], [18.5, 16, 15], { n: Math.max(3, Math.round(cracks / 3)), cols: LAVA, faces: 'lr', len: [4, 8], cell: 0.9 });
  // the muzzle
  HB(Hd, 0, -2.3, 23.5, 11.4, 9, 13, DEEP[1]);
  HB(Hd, 0, 2.4, 21, 8, 1.6, 7, DEEP[2], 0.12);
  for (let i = 0; i < 4; i++) HB(Hd, 0, 2.8 - i * 0.2, 18 + i * 1.8, 8.6, 0.6, 0.8, 0x0a0708);       // snarl wrinkles
  HB(Hd, 0, 0.6, 29.6, 6.4, 3.8, 1.2, 0x050404);                                                    // nose, flush with the muzzle's tip
  HB(Hd, 0, 1.8, 30.05, 4, 1, 0.3, 0x2a2428);
  // the mouth (pass 4, the owner's note): a dark mouth, pink gums only
  // along the top and bottom jaws, and the teeth standing out of them
  const GUM = 0xb8344a, MAW = 0x1a0909;
  for (const sx of [-1, 1]) {
    HB(Hd, sx * 5.8, -6.1, 23.5, 0.5, 1, 12, LAVA[0]);                                               // the furnace glows through the lips
    HB(Hd, sx * 4.4, -9.8, 28, 2, 7, 2, fang, 0.12);                                                 // upper canines
    for (let i = 0; i < 4; i++) HB(Hd, sx * 5, -7.9, 25.6 - i * 2.1, 1, 2.5 - i * 0.25, 1, fang);
  }
  for (let x = -2.4; x <= 2.41; x += 1.2) HB(Hd, x, -7.7, 29.4, 0.9, 2.2, 0.9, fang);
  HB(Hd, 0, -6.9, 23, 9, 0.5, 12, MAW);                                                              // the roof of the mouth, dark
  for (const sx of [-1, 1]) {
    HB(Hd, sx * 4.9, -8.6, 21, 0.4, 3, 10, MAW);                                                     // the cheeks inside
    HB(Hd, sx * 4.9, -7.15, 24, 1.9, 0.6, 11.6, GUM);                                                // the upper gums, along each side
  }
  HB(Hd, 0, -7.15, 29.3, 8.6, 0.6, 1.4, GUM);                                                       // and behind the front teeth
  // the jaw (QuadRig's mouth hinge): massive, its own row of fangs over pink gums, a dark tongue
  HB(M, 0, -2.4, 7.5, 10.4, 4.6, 15, DEEP[1]);
  HB(M, 0, -5.2, 10, 8.4, 2, 8, DEEP[0]);
  HB(M, 0, 0.2, 7.5, 7.6, 0.5, 12.5, MAW);
  HB(M, 0, 0.5, 6, 4.2, 0.6, 8, 0x5a1620);                                                           // the tongue
  HB(M, 0, 0.45, 14.2, 8.2, 0.6, 1.4, GUM);
  for (const sx of [-1, 1]) {
    HB(M, sx * 3.9, 2.9, 13.6, 1.8, 5.4, 1.8, fang, -0.1);
    for (let i = 0; i < 4; i++) HB(M, sx * 4.2, 1.1, 11.4 - i * 2, 1, 2.1, 1, fang);
    HB(M, sx * 4.3, 0.45, 8, 1.9, 0.6, 12.6, GUM);
    HB(M, sx * 5.3, -0.3, 7.5, 0.4, 0.8, 13, LAVA[0]);
    HB(M, sx * 4.9, 1.6, 7, 0.4, 2.6, 9, MAW);
  }
  K.clumps(M, sc([0, -3, 7]), sc([10, 5, 15]), { n: Math.round(14 * fe), size: [1.3, 2.2], cols: FUR, faces: 'blr' });
  // ---- legs: thick and powerful, heavy at the shoulder and thigh, their
  // roots buried in the body (QuadRig legY: the top 10 of each is inside
  // it); the hind legs bend back at the hock; big paws spread on four toes
  // with amber claws, set flat on the ground though the leg leans out (stance)
  for (const leg of rig.legs) {
    const front = leg.userData.row === 0, b = -legH - legW * 0.2;
    if (front) {
      seg(leg, [7, 0], [-12, 0.5], 11, 12, DEEP[1], 1.2);
      seg(leg, [-11, 0.5], [-24, -0.5], 8.6, 9.2, DEEP[1]);
      seg(leg, [-24, -0.5], [-31, 0.8], 7.2, 7.8, DEEP[0], 0.7);
      for (let y = -12; y > -26; y -= 2.2) K.box(leg, (K.r() - 0.5) * 3, y, -5, 2, 3.4, 1.6, K.tone(FURL), 0.35);   // feathering down the back
    } else {
      seg(leg, [8, -1], [-12, 1], 12, 14, DEEP[1], 1.1);   // (the thigh reaches up into the haunch: it never leaves the body)
      seg(leg, [-11, 1], [-19, 4], 9, 10, DEEP[1]);
      seg(leg, [-19, 4], [-28, -3], 7.2, 7.8, DEEP[0], 0.7);
      seg(leg, [-28, -3], [-33, -0.5], 6.6, 7.2, DEEP[1], 0.6);
      K.box(leg, 0, -28, -5.6, 3.6, 3.6, 2.8, FUR[2]);
    }
    K.cracks(leg, [0, -17, 0], [10, 22, 10.5], { n: 5, cols: LAVA, faces: 'lrf', len: [4, 9], cell: 0.9 });
    const paw = group(leg, 0, b, 0, 0, 0, -(rig.spec.stance ?? 0) * leg.userData.side);   // (level, though the leg leans out)
    K.box(paw, 0, 2.2, 1.6, 10.6, 4.4, 11.4, DEEP[1]);
    K.box(paw, 0, 5, 0.6, 7.6, 2.4, 8, DEEP[0]);
    for (const dx of [-3.9, -1.3, 1.3, 3.9]) {
      K.box(paw, dx, 1.9, 7.6, 2.4, 3.8, 3.8, K.tone([FUR[0], DEEP[1]]));
      K.box(paw, dx, 1.3, 10, 1.5, 2.4, 3.2, claw, 0.45);
      K.box(paw, dx, 0.5, 11.4, 0.9, 1.2, 1.4, 0xffb000);
    }
    K.box(paw, 0, 1.5, -4.6, 3, 2.8, 2.4, DEEP[1]);   // the heel pad
  }
  // ---- tail: a shaggy rope with a smouldering, smoking tip
  const tl = spec.tailLen / spec.tail;
  for (const [i, sg] of rig.tail.entries()) {
    const w = spec.tailW * (1 - i * 0.12);
    K.box(sg, 0, 0, -tl / 2, w, w, tl + 0.6, DEEP[1]);
    K.clumps(sg, [0, 0, -tl / 2], [w, w, tl], { n: Math.round(12 * fe), size: [1.4, 2.4 - i * 0.15], cols: FUR, faces: 'tlrb', stretch: [1, 1, 1.4] });
  }
  const tip = rig.tailTip;
  K.box(tip, 0, 0, -tl - 1.2, 3, 3, 3, LAVA[0]); K.box(tip, 0, 1.6, -tl - 2.6, 2, 2.6, 2, LAVA[1]); K.box(tip, 0.6, 3.4, -tl - 2.2, 1.2, 2, 1.2, 0xffd040);
  K.box(tip, 0, 6, -tl - 3, 2.2, 2.2, 2.2, SMOKE[0]); K.box(tip, 0.6, 8.6, -tl - 3.6, 1.6, 1.6, 1.6, SMOKE[1]); K.box(tip, -0.3, 10.6, -tl - 4, 1.1, 1.1, 1.1, SMOKE[2]);
  K.done();
  return rig;
}
// A harpy as the 3D sheet draws it (vox-enemies, top row): an upright eagle
// in layered golden-brown feathers with a pale scalloped breast, a hooked
// gold beak under a heavy brow, glowing yellow eyes, feathered trousers, gold
// scaly legs with black talons, a fan tail and wide fingered wings raised
// high. metal: bronze feathers sharp as knives (the Stymphalian birds).
// pal: colour overrides (a champion's plumage), any of main, light, dark,
// breast, tip, edge, gold, goldD, talon, eye.
// form: 'eagle' (this upright eagle; Bronzebeak), 'woman' (the harpy as a
// bird-woman; the default without metal, so Queen Gale too) or 'hunter' (the
// level bronze Stymphalian bird); the last two are built below.
export function eagle(id, { scale = 1, metal = false, pal = null, form = metal ? 'eagle' : 'woman' } = {}) {
  if (form === 'woman') return harpyWoman(id, { scale, pal });
  if (form === 'hunter') return bronzeHunter(id, { scale, pal });
  const P = { ...(metal
    ? { main: 0x9a5a18, light: 0xe0a030, dark: 0x5a2e0c, breast: 0xd8962a, tip: 0xf8c850, edge: 0xc8802a }
    : { main: 0x7a4818, light: 0xc88a38, dark: 0x3e220a, breast: 0xc89a5e, tip: 0xe0b060, edge: 0xb07a30 }), gold: 0xe8a820, goldD: 0xb87a10, talon: 0x1a120a, eye: 0xffd000, ...pal };
  const gold = P.gold, goldD = P.goldD, talon = P.talon;
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin: P.main, hair: P.main, fringe: 1, hairSide: 2, hairBack: 8, eye: 0x1a0a00, eyeWhite: 0xffd81a, scowl: true, brow: P.dark, mouth: false, top: P.main, sleeve: P.main, hand: P.main, legR: gold, legL: gold, shoes: gold,
      face: (s, ey) => { s.rect(8, ey - 2, 8, 1, P.dark, 0.1); for (const x of [9, 13]) { s.rect(x, ey - 1, 2, 2, 0xffe020, 0); s.px(x === 9 ? 10 : 13, ey, 0x1a0a00); } },
      body: (s) => {
        // feather scallops all over the body, a pale breast with dark chevrons
        for (let y = 20; y < 32; y += 2) for (let x = 16 + (y % 4 ? 1 : 0); x < 40; x += 2) { s.px(x, y, P.dark); s.dot(x + 0.5, y, P.light); }
        s.rect(20, 21, 8, 11, P.breast, 0.12);
        for (let y = 22; y < 32; y += 2) for (let x = 20 + (y % 4 ? 1 : 0); x < 28; x += 2) s.dot(x + 0.5, y + 0.5, P.main, 1, 1);
      } });
    S.shadeLimbs(); S.saturate(1.25);
  }, { emit: 1, rough: metal ? 0.4 : 0.85, res: 2 });
  const rig = new Rig({ material: mat, scale, armW: 3, legH: 6, bodyD: 7, bodyW: 8, bodyH: 11, headS: 7 });
  rig.armR.visible = rig.armL.visible = false;
  const K = kit(rig, mat, { seed: metal ? 41 : 43, rough: metal ? 0.45 : 0.85, metal: metal ? 0.2 : 0, emit: 0.7 });
  const T = rig.torso, hk = HS * 7 / 8, fz = 4 * hk;
  // breast: overlapping rows of pale feathers with dark tips; mantle and back feathers
  for (let r = 0; r < 5; r++) for (let i = 0; i < 4; i++) {
    const x = -2.7 + i * 1.8 + (r % 2) * 0.9; if (Math.abs(x) > 3.2) continue;
    K.box(T, x, 9.5 - r * 2, 3.7, 1.9, 2.2, 0.8, K.tone([P.breast], 0.12), -0.15);
    K.box(T, x, 8.6 - r * 2, 4.05, 1, 0.5, 0.3, P.main);
  }
  for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) K.box(T, -3.6 + i * 1.8, 10 - r * 2.6, -3.7, 2, 3, 0.8, K.tone([P.main, P.dark, P.light], 0.1), 0.2);
  for (const sx of [-1, 1]) for (let r = 0; r < 4; r++) K.box(T, sx * 4.2, 9.5 - r * 2.4, 0.5 - (r % 2), 0.8, 2.8, 5.5, K.tone([P.main, P.light], 0.1), 0, 0, sx * 0.1);
  // a ruff of neck feathers
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.box(T, Math.sin(a) * 4.2, 11.2 + (i % 2) * 0.5, Math.cos(a) * 3.6, 2.4, 2.6, 2.4, K.tone([P.light, P.main], 0.1), Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3); }
  // head: brow ridge, glowing eyes, crest feathers at the back, hooked beak
  const Hd = rig.head;
  K.box(Hd, 0, 5.2 * hk, fz + 0.5, 8.2 * hk, 1.3, 1.4, P.dark);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 2.4 * hk, 4.1 * hk, fz + 0.15, 1.8, 1.4, 0.3, P.eye); K.box(Hd, sx * 2.2 * hk, 4.1 * hk, fz + 0.3, 0.7, 0.8, 0.2, 0x140800); }
  for (let i = 0; i < 6; i++) K.box(Hd, -2.5 + i, 7 * hk + (i % 2) * 0.6, -fz - 0.6 - (i % 3) * 0.5, 1.4, 1.6, 3, K.tone([P.main, P.light, P.dark], 0.1), 0.5);
  K.clumps(Hd, [0, 4 * hk, 0], [8 * hk, 8 * hk, 8 * hk], { n: 26, size: [1, 1.6], cols: [P.main, P.light, P.dark], faces: 'tlrk' });
  const beak = group(Hd, 0, 2.8 * hk, fz, 0.1);
  K.box(beak, 0, 0.6, 1.2, 3.4, 2.6, 2.6, gold); K.box(beak, 0, 1.2, 2.8, 2.6, 1.8, 1.8, gold);
  K.box(beak, 0, 0.2, 3.9, 2, 2, 1.2, goldD); K.box(beak, 0, -1, 4.2, 1.4, 1.4, 1, goldD); K.box(beak, 0, -2, 4, 0.9, 1, 0.8, 0x7a4a08);
  K.box(beak, 0, -0.9, 1.6, 2.6, 1, 2.2, goldD);
  for (const sx of [-1, 1]) K.box(beak, sx * 1.75, 1.4, 1.2, 0.2, 0.6, 0.6, 0x2a1a08);
  // legs: feathered trousers, gold scaly shanks, three toes forward, one back, black talons
  for (const leg of [rig.legR, rig.legL]) {
    dropMeshes(rig, leg);
    K.box(leg, 0, -0.5, 0, 4.4, 3.6, 4.6, P.main);
    for (let i = 0; i < 6; i++) K.box(leg, -1.8 + (i % 3) * 1.8, -2.4 - Math.floor(i / 3) * 0.8, (i < 3 ? 1 : -1) * 2, 1.6, 2.4, 1, K.tone([P.main, P.light, P.dark], 0.1), (i < 3 ? 0.2 : -0.2));
    K.box(leg, 0, -4.3, 0, 1.8, 3.8, 1.8, gold);
    for (let y = -3.2; y > -6; y -= 1.1) K.box(leg, 0, y, 0, 2.1, 0.35, 2.1, goldD);
    for (const dx of [-1.3, 0, 1.3]) { K.box(leg, dx, -5.6, 1.5, 1, 0.8, 2.8, gold, 0, dx * 0.2, 0); K.box(leg, dx * 1.2, -5.8, 3.1, 0.7, 0.8, 1.2, talon, 0.4, 0, 0); }
    K.box(leg, 0, -5.6, -1.3, 1, 0.8, 1.8, gold); K.box(leg, 0, -5.8, -2.4, 0.7, 0.8, 1, talon);
  }
  addWings(rig, { span: 28, chord: 12, kind: 'feather', y: 10, flap: 1.1, seed: metal ? 45 : 47, cols: { main: P.main, tip: P.tip, edge: P.edge, dark: P.dark }, look: mat });
  // a fan of tail feathers
  const tail = group(rig.hips, 0, 2, -3.4, 0.9);
  for (let i = -3; i <= 3; i++) { K.box(tail, i * 1.4, 0, -4.5, 1.6, 0.8, 9 - Math.abs(i) * 0.5, K.tone([P.main, P.dark], 0.1), 0, i * 0.14, 0); K.box(tail, i * 1.4 + Math.sin(i * 0.14) * -4.2, 0.1, -8.6 + Math.abs(i) * 0.3, 1.7, 0.85, 1.6, P.tip, 0, i * 0.14, 0); }
  if (metal) for (let i = 0; i < 8; i++) K.box(T, -3.5 + i, 11.8 + (i % 2), -2.5, 0.5, 2.4, 0.5, P.tip, -0.5, 0, (i - 3.5) * 0.12);   // knife-quills
  K.done();
  rig.hunch = 0.3;
  rig.float = metal ? 1.1 : 0.9;
  return rig;
}
const toneHex = (c, k) => { const x = new THREE.Color(c); x.r = Math.min(0.9, x.r * k); x.g = Math.min(0.9, x.g * k); x.b = Math.min(0.9, x.b * k); return x.getHex(); };
// A harpy as the books tell it (design brief vox-harpy; Queen Gale on
// vox-ow-champions, top right): a bird-woman. A pale grey-green woman's face
// with burning yellow eyes and a screeching fanged mouth under wild
// storm-grey hair; ragged dark feathered wings where her arms should be, a
// clawed thumb at each wrist; a body of ragged dark feathers that hangs in
// torn strips past the hips; scaly yellow bird legs and black talons. She
// stands upright, so from above she reads as a pale face and grey mane
// between two dark wings: nothing like the level bronze Stymphalian.
// pal: colour overrides (a champion's plumage), any of main, light, dark,
// breast, tip, edge, skin, hair, gold, goldD, talon, eye.
function harpyWoman(id, { scale = 1, pal = null } = {}) {
  const P = { main: 0x3a3236, light: 0x5a5056, dark: 0x1c181c, breast: 0x4a4048, tip: 0x6a6270, edge: 0x2c2628, skin: 0xa8b8a0, hair: 0x747a84, gold: 0xe0b428, goldD: 0xa07a14, talon: 0x141010, eye: 0xffd000, ...pal };
  const mouth = 0x2a0a0c, fang = 0xe8e0d0;
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin: P.skin, hair: P.hair, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x1a1000, eyeWhite: P.eye, scowl: true, brow: P.dark, mouth: false, top: P.main, sleeve: P.main, hand: P.skin, pants: P.main, shoes: false,
      face: (s, ey) => {
        s.rect(8, ey - 1.5, 8, 1, P.dark, 0.1);
        for (const x of [9, 13]) { s.rect(x, ey - 0.5, 2, 1.5, P.eye, 0); s.px(x === 9 ? 10 : 13, ey, 0x1a1000); }
        s.rect(10, ey + 4.5, 4, 0.5, toneHex(P.skin, 0.7), 0);
      },
      body: (s) => { for (let i = 0; i < 80; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, s.r() < 0.5 ? P.dark : P.light); } });
    S.shadeLimbs(); S.saturate(1.1);
  }, { emit: 1, rough: 0.9, res: 2 });
  const bodyH = 11.5, bodyW = 7;
  const rig = new Rig({ material: mat, scale, armW: 3, legH: 8, bodyD: 5, bodyW, bodyH, headS: 7 });
  rig.armR.visible = rig.armL.visible = false;
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  dropMeshes(rig, rig.torso);
  const K = kit(rig, mat, { seed: 53, rough: 0.9, emit: 0.7 });
  const T = rig.torso, Hd = rig.head, hk = HS * 7 / 8, fz = 4 * hk, FE = [P.main, P.dark, P.light], RAG = [P.main, P.dark, P.edge];
  // a lean grey-green body under a coat of ragged feathers: a bare throat and collarbone
  K.box(T, 0, bodyH / 2, 0, bodyW - 1, bodyH, 4, P.dark);
  K.box(T, 0, bodyH - 1.2, 1.6, 3.4, 2.4, 1.4, P.skin); K.box(T, 0, bodyH - 0.2, 0.2, 2.6, 1.6, 2.6, P.skin);
  for (let r = 0; r < 5; r++) for (let i = 0; i < 4; i++) {
    const x = -2.7 + i * 1.8 + (r % 2) * 0.9; if (Math.abs(x) > 3.3) continue;
    K.box(T, x, bodyH - 3 - r * 1.8, 2.3, 1.9, 2.4, 0.9, K.tone(r < 2 ? [P.breast, P.main] : FE, 0.12), -0.2);
  }
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) K.box(T, -2.7 + i * 1.8, bodyH - 1.5 - r * 2.4, -2.3, 2, 3, 0.8, K.tone(FE, 0.1), 0.2);
  for (const sx of [-1, 1]) {
    for (let r = 0; r < 4; r++) K.box(T, sx * 3.5, bodyH - 1.8 - r * 2.3, 0, 0.8, 2.8, 4.4, K.tone(FE, 0.1), 0, 0, sx * 0.12);
    // the shoulder where the wing meets the body: a mantle of long ragged feathers
    for (let k = 0; k < 3; k++) K.box(T, sx * (2.6 + k * 0.8), bodyH - 0.4 - k * 0.5, 0.4 - k * 0.6, 2.2, 1.4, 3, K.tone(RAG, 0.1), 0, 0, sx * (0.35 + k * 0.1));
  }
  // the ragged feather skirt: long dark strips round the hips, torn at the ends
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, L = 4 + K.r() * 5, x = Math.sin(a) * 3.3, z = Math.cos(a) * 2.2;
    if (Math.abs(a - Math.PI * 0.5) < 0.2 || Math.abs(a - Math.PI * 1.5) < 0.2) continue;
    K.flare(rig.hips, x, 1 - L / 2, z, 1.7, L, 0.6, K.tone(RAG, 0.14), a, 0.22);
    if (i % 3 === 0) K.flare(rig.hips, x * (1 + L * 0.04), 0.4 - L, z * (1 + L * 0.04), 0.8, 1.6, 0.5, K.tone([P.tip, P.dark], 0.1), a, 0.22);
  }
  // a short ragged tail
  for (let i = -2; i <= 2; i++) K.box(rig.hips, i * 1.1, 0.5, -3.6 - (2 - Math.abs(i)) * 0.6, 1.2, 0.6, 5 - Math.abs(i) * 0.7, K.tone(FE, 0.1), 0.6, i * 0.2, 0);
  // the head: wild storm-grey hair standing out on every side and spilling down the back
  const hairC = [P.hair, toneHex(P.hair, 1.22), toneHex(P.hair, 0.72)];
  K.clumps(Hd, [0, 6.6 * hk, -0.8], [8 * hk + 1, 2.6 * hk, 8 * hk + 0.6], { n: 18, size: [1.2, 2], cols: hairC, faces: 'tlrk', out: 0.1 });
  // wild locks standing out all round the crown (shorter over the face)
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + K.r() * 0.2, front = Math.cos(a) > 0.75, t = front ? 0.5 + K.r() * 0.3 : 0.75 + K.r() * 0.7, L = front ? 2 + K.r() : 3.4 + K.r() * 3.4, r = 3.2 * hk;
    const ux = Math.sin(a) * Math.sin(t), uy = Math.cos(t), uz = Math.cos(a) * Math.sin(t), bx = Math.sin(a) * r, by = 7.4 * hk - (front ? 0.4 : 0), bz = Math.cos(a) * r - 0.6;
    K.flare(Hd, bx + ux * L / 2, by + uy * L / 2, bz + uz * L / 2, 1 + K.r() * 0.5, L, 1 + K.r() * 0.5, K.tone(hairC, 0.1), a + Math.PI, t);
  }
  for (let i = 0; i < 9; i++) K.box(Hd, -4 + i, 3 * hk - (i % 3) * 1.1, -fz - 0.9, 1.5, 6 + K.r() * 4, 1.4, K.tone(hairC, 0.08), 0.35, 0, (i - 4) * 0.13);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) K.box(Hd, sx * (fz + 0.5 + k * 0.3), 3.8 * hk - k * 0.8, 0.8 - k * 1.6, 1.2, 5 + K.r() * 3, 1.5, K.tone(hairC, 0.08), 0, 0, sx * (0.12 + k * 0.12));
  // a heavy brow over burning yellow eyes, a gaping screech of fangs
  K.box(Hd, 0, 5 * hk, fz + 0.25, 7 * hk, 0.9, 0.5, toneHex(P.skin, 0.62));
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.9 * hk, 4.25 * hk, fz + 0.15, 1.9, 1.1, 0.3, P.eye); K.box(Hd, sx * 1.75 * hk, 4.25 * hk, fz + 0.3, 0.6, 0.7, 0.2, 0x140800); }
  K.box(Hd, 0, 1.9 * hk, fz + 0.15, 2.4, 1.7, 0.3, mouth);
  for (const x of [-0.75, 0.75]) { K.box(Hd, x, 2.5 * hk, fz + 0.3, 0.4, 0.6, 0.2, fang); K.box(Hd, x * 0.9, 1.35 * hk, fz + 0.3, 0.35, 0.5, 0.2, fang); }
  // legs: ragged feathered thighs, then thin yellow scaly bird legs, three toes forward and one back, black talons
  for (const leg of [rig.legR, rig.legL]) {
    K.box(leg, 0, -1.4, 0, 3.4, 3.2, 3.4, P.main);
    for (let i = 0; i < 5; i++) K.box(leg, -1.4 + (i % 3) * 1.4, -3.4 - (i > 2 ? 0.6 : 0), (i > 2 ? -1 : 1) * 1.2, 1.3, 2.2 + K.r(), 1, K.tone(RAG, 0.1), i > 2 ? -0.2 : 0.2);
    K.box(leg, 0, -5.3, 0.2, 1.4, 4, 1.4, P.gold);
    for (let y = -4; y > -7.2; y -= 0.9) K.box(leg, 0, y, 0.2, 1.7, 0.3, 1.7, P.goldD);
    for (const dx of [-1.1, 0, 1.1]) { K.box(leg, dx, -7.6, 1.6, 0.9, 0.8, 2.6, P.gold, 0, dx * 0.25, 0); K.box(leg, dx * 1.25, -7.8, 3.2, 0.6, 0.9, 1.2, P.talon, 0.45, 0, 0); }
    K.box(leg, 0, -7.6, -1.1, 0.9, 0.8, 1.6, P.gold); K.box(leg, 0, -7.8, -2.1, 0.6, 0.8, 0.9, P.talon);
  }
  // wings for arms, from the shoulders: dark ragged feathers, pale-tipped primaries
  const W = addWings(rig, { span: 25, chord: 11, kind: 'feather', y: bodyH - 1.4, flap: 1, seed: 57, cols: { main: P.main, tip: P.tip, edge: P.edge, dark: P.dark }, look: mat });
  for (const w of W) {
    const sd = w.side;
    w.root.position.set(sd * (bodyW / 2 + 0.4) * PX, (bodyH - 1.2) * PX, -0.2 * PX);
    // torn feathers hanging off the arm, and the clawed thumb at the wrist
    for (let k = 0; k < 6; k++) { const h = 2 + K.r() * 4.5; K.box(w.root, sd * (1.4 + k * 1.9), -9 - h / 2, -0.2, 1, h, 0.4, K.tone([P.dark, P.tip], 0.1)); }
    for (const dz of [-0.5, 0.5]) K.box(w.elbow, sd * 0.2, 1.2, 0.9 + dz, 0.5, 2.4, 0.5, P.talon, 0.6, 0, 0);
  }
  K.done();
  rig.wingStroke = { base: 0.42, amp: 0.42, hand: 0.45, down: 0.4 };
  rig.hunch = 0.18;
  rig.float = 0.9;
  return rig;
}
// A Stymphalian bird (vox-enemies; the brief: "bronze feathers sharp as
// knives"): a sleek bronze bird of prey held level as it hunts, a long sharp
// bronze beak thrust forward, a narrow head with burning red-orange eyes,
// a back of overlapping metal knife-feathers, long narrow falcon wings and a
// long tail of blades. From above: a bright bronze arrowhead, never upright.
function bronzeHunter(id, { scale = 0.9, pal = null } = {}) {
  const P = { main: 0xa86a26, light: 0xd8a040, dark: 0x5a3210, edge: 0xe0b048, tip: 0xe8d088, beak: 0xc89838, beakD: 0x6a4210, steel: 0x6a6460, talon: 0x1a120a, eye: 0xff5a10, ...pal };
  const mat = skinMat(id, (S) => { paintPerson(S, { skin: P.main, hair: P.main, eye: P.eye, eyeWhite: P.eye, brow: P.dark, mouth: false, top: P.main, sleeve: P.main, hand: P.main, pants: P.dark, shoes: false }); S.saturate(1.2); }, { emit: 1, rough: 0.4 });
  const rig = new Rig({ material: mat, scale, armW: 2, legH: 5, bodyH: 6, bodyW: 6, bodyD: 6, headS: 5, jacket: false });
  rig.armR.visible = rig.armL.visible = false;
  for (const g of [rig.torso, rig.head, rig.legR, rig.legL]) dropMeshes(rig, g);
  const K = kit(rig, mat, { seed: 59, rough: 0.4, metal: 0.3, emit: 0.8 });
  const T = rig.torso, Hd = rig.head, BR = [P.main, P.light, P.edge];
  // a level, tapering body: a deep breast forward, the back narrowing to the tail
  K.box(T, 0, 3, 0, 5.4, 4.6, 9, P.main); K.box(T, 0, 2.6, 4.4, 4.6, 4.2, 2.4, P.light); K.box(T, 0, 3.4, -5, 4, 3.4, 2.4, P.dark);
  K.box(T, 0, 1, 1, 4.2, 1, 7, P.dark);
  // knife-feathers in overlapping rows down the back and flanks, each a thin bright blade
  for (let r = 0; r < 5; r++) for (let i = -1; i <= 1; i++) K.box(T, i * 1.7, 5.5 + (1 - Math.abs(i)) * 0.2, 3.6 - r * 2, 1.5, 0.5, 3.4, K.tone(BR, 0.1), -0.12, i * 0.1, 0);
  for (const sx of [-1, 1]) for (let r = 0; r < 4; r++) { K.box(T, sx * 2.9, 3.4 - (r % 2) * 1.2, 3 - r * 2.2, 0.5, 1.2, 3.8, K.tone(BR, 0.1), 0, sx * 0.1, 0); K.box(T, sx * 3, 3.4 - (r % 2) * 1.2, 0.8 - r * 2.2, 0.4, 0.6, 1.2, P.tip, 0, sx * 0.1, 0); }
  // the neck reaches forward, the head thrust ahead of the body
  K.box(T, 0, 4.6, 6, 3.2, 3, 2.6, P.main, -0.4);
  rig.neck.position.set(0, 4.4 * PX, 7 * PX);
  K.box(Hd, 0, 1.4, 0.6, 3.4, 3, 4.2, P.main); K.box(Hd, 0, 2.9, 0.2, 2.6, 0.6, 3.6, P.light);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.75, 1.9, 1.5, 0.3, 1, 1.6, P.eye); K.box(Hd, sx * 1.85, 1.9, 1.7, 0.2, 0.5, 0.6, 0x1a0800); K.box(Hd, sx * 1.6, 2.6, 1.4, 0.5, 0.5, 2.4, P.dark, 0, 0, sx * 0.2); }
  for (let i = 0; i < 4; i++) K.box(Hd, (i - 1.5) * 0.7, 2.9, -1.6 - i * 0.3, 0.5, 0.5, 3, K.tone([P.edge, P.tip], 0.1), 0.25, (i - 1.5) * 0.12, 0);   // swept-back crest blades
  // the long sharp bronze beak, darker at its hooked point
  K.box(Hd, 0, 1.5, 3.4, 2.2, 1.8, 2, P.beak); K.box(Hd, 0, 1.4, 5.2, 1.5, 1.3, 2, P.beak); K.box(Hd, 0, 1.25, 6.8, 0.9, 0.9, 1.6, P.beakD); K.box(Hd, 0, 0.8, 7.6, 0.5, 0.9, 0.5, P.beakD);
  K.box(Hd, 0, 0.5, 4.4, 1.3, 0.5, 3.4, P.beakD);
  // a long tail of blades, flat and slightly spread
  for (let i = -2; i <= 2; i++) { K.box(T, i * 0.9, 3.6, -9.6, 0.9, 0.4, 8.6 - Math.abs(i) * 0.8, K.tone(BR, 0.08), 0.08, i * 0.1, 0); K.box(T, i * 0.9 + i * 0.1 * -4.6, 3.6 - 0.4, -13.8 + Math.abs(i) * 0.4, 0.8, 0.45, 1.2, P.tip, 0.08, i * 0.1, 0); }
  // short legs tucked under: dark feathered thighs, steel shanks, gripping toes and talons
  for (const leg of [rig.legR, rig.legL]) {
    K.box(leg, 0, -0.6, 0.6, 2, 2.2, 2.4, P.dark);
    K.box(leg, 0, -3, 1, 1, 2.8, 1, P.steel);
    for (const dx of [-0.8, 0, 0.8]) { K.box(leg, dx, -4.6, 2, 0.7, 0.7, 2, P.beak, 0, dx * 0.3, 0); K.box(leg, dx * 1.2, -4.8, 3.1, 0.5, 0.8, 0.8, P.talon, 0.5, 0, 0); }
    K.box(leg, 0, -4.6, 0.1, 0.6, 0.7, 1.4, P.beak);
  }
  // long narrow falcon wings of bronze blades
  const W = addWings(rig, { span: 26, chord: 8, kind: 'feather', y: 5, flap: 1.4, seed: 61, cols: { main: P.main, tip: P.tip, edge: P.edge, dark: P.dark }, look: mat });
  for (const w of W) w.root.position.set(w.side * 2.4 * PX, 5.2 * PX, 1.4 * PX);
  K.done();
  rig.wingStroke = { base: 0.22, amp: 0.4, hand: 0.35, down: 0.42 };
  rig.float = 1.2;
  rig.dims.headS = 2.6;   // the small low head (a champion's crown sits on it, not a hand above it)
  return rig;
}
// Hephaestus's bronze spider (vox-enemies, top row): a boxy riveted body
// in bronze and dark-bronze bands, a big chequered abdomen, two furnace eyes
// over a row of small ones, cream fangs, and eight thick jointed legs that
// arch above the back on bolted knuckles and plant wide. queen: the boss.
const BRZ = [0xa85a08, 0x8c4606, 0xc87010], BRZ_D = [0x3a2008, 0x4a2a0c, 0x2a1606], BRZ_L = 0xe8a020;
export function bronzeSpider(id, { scale = 1, queen = false } = {}) {
  const base = 0x9a5208, dark = 0x3a2008, plate = 0xd08a18;
  const mat = skinMat(id, (S) => { paintQuad(S, { base, dark, belly: 0x3a220e, eye: 0xffa020, eyeLow: 0xff6a10, eyes: [[9, 11], [13, 11]], plates: plate, extra: 0x9a6428, teeth: false, nose: dark, noise: 0.16, speckles: 14,
    custom: (s) => {
      for (let x = 0; x < 40; x += 4) s.rect(x, 24, 1, 8, dark, 0);          // riveted seams on the body
      for (let i = 0; i < 18; i++) s.px(Math.floor(s.r() * 40), 16 + Math.floor(s.r() * 20), plate);
      s.rect(40, 18, 12, 1, plate, 0); s.rect(40, 22, 12, 1, dark, 0); s.rect(40, 25, 12, 1, dark, 0);
    } }); S.saturate(1.25); }, { rough: 0.4, emit: 1.2, scale });
  const rig = new QuadRig({ material: mat, scale, bodyL: 8, bodyW: 7, bodyH: 5, legH: 9, legW: 2.3, headS: 6.4, legs: 8, splay: 2.15, footL: 13, kneeOut: 0.5, legY: 2.4, snout: false, neckUp: -1.6, headZ: -0.6, gait: 1.6 });
  // The queen is the spider at boss size (scale 2.6): built from cells near a
  // hero's size (kit density, VoxKit.vox), not the small spider's slabs made
  // big. Her plates show their grain and rivets, her legs are jointed, banded
  // and spurred, and her abdomen is a fine chequer of bronze blocks.
  // (pass 3: a spider built big, the Road West champion at 1.7, takes the
  // queen's fine build too, without her crown and gears: fine)
  const fine = queen || BUILD.k >= 1.5;
  const DQ = fine ? densityFor(scale) / 1.25 : 1;
  const K = kit(rig, mat, { seed: queen ? 31 : 13, rough: 0.5, metal: 0.1, emit: 0.7, density: fine ? DQ : undefined });
  const { legW, hs } = rig.dims;
  // a plate: grained cells on the queen, one box on the small spiders
  const PL = (p, x, y, z, w, h, d, cols, o = {}) => (fine ? K.vox(p, x, y, z, w, h, d, cols, { relief: 0.1, j: 0.14, ...o }) : K.box(p, x, y, z, w, h, d, cols[0], o.rx ?? 0, o.ry ?? 0, o.rz ?? 0));
  // the same in a knee's frame (K.boxZ)
  const PZ = (g, x, y, z, w, h, d, cols) => {
    if (!fine) return K.boxZ(g, x, y, z, w, h, d, cols[0]);
    const rz = g.rotation.z, c = Math.cos(rz), sn = Math.sin(rz), P = g.position;
    return K.vox(g.parent, P.x / PX + x * c - y * sn, P.y / PX + x * sn + y * c, P.z / PX + z, w, h, d, cols, { relief: 0.1, j: 0.14, rz });
  };
  // legs fan fore and aft: plated upper legs, bolted knuckles, banded shins and dark pointed feet
  for (const leg of rig.legs) {
    const u = leg.userData; leg.rotation.y = -u.side * (0.75 - u.row * 0.5);
    dropMeshes(rig, leg);
    if (fine) {
      PL(leg, 0, 0, 0, 2.8, 2.8, 2.8, [BRZ_D[0], BRZ_D[2]]);
      for (const sx of [-1, 1]) { K.box(leg, sx * 1.5, 0, 0, 0.4, 1.8, 1.8, BRZ_D[1]); K.box(leg, sx * 1.75, 0, 0, 0.3, 0.7, 0.7, BRZ_L); }   // the hip's bolt
      // a slimmer thigh: a dark strut inside, a bronze plate over its top and outer face
      PL(leg, 0, -4.5, 0, legW - 0.4, 9, legW - 0.4, [BRZ_D[1], BRZ_D[0]]);
      PL(leg, 0, -3.6, 0.5, legW + 0.2, 6.4, legW - 0.6, [BRZ[u.row % 2], BRZ[2]], { faces: 'tfklr' });
      for (const y of [-1.2, -7.4]) K.box(leg, 0, y, 0, legW + 0.6, 0.6, legW + 0.6, BRZ_D[1]);
      for (const y of [-2.4, -4.6]) for (const sx of [-1, 1]) K.box(leg, sx * (legW / 2 + 0.2), y, 0.5, 0.4, 0.5, 0.5, BRZ_L);   // rivets
    } else {
      K.box(leg, 0, 0, 0, 3, 3, 3, BRZ_D[0]);
      K.box(leg, 0, -4.5, 0, legW + 0.2, 9, legW + 0.2, BRZ[u.row % 2]);
      K.box(leg, 0, -6, 0, legW + 0.6, 4, legW + 0.6, BRZ[(u.row + 1) % 3]);
      K.box(leg, 0, -4.5, 0, legW + 0.9, 1, legW + 0.9, BRZ_D[1]);
    }
    const k = u.knee; dropMeshes(rig, k);
    K.boxZ(k, 0, 0, 0, 3.4, 3.4, 3.4, BRZ_D[2]);
    for (const sx of [-1, 1]) { K.boxZ(k, sx * 1.8, 0, 0, 0.5, 2.2, 2.2, BRZ_D[0]); K.boxZ(k, sx * 2.1, 0, 0, 0.4, 0.9, 0.9, BRZ_L); }
    if (fine) {
      // the shin: a tapering strut in three plated sections, a spur at each
      // joint and a hooked, dark claw for a foot
      PZ(k, 0, -6.5, 0, legW * 0.6, 13, legW * 0.6, [BRZ_D[1], BRZ_D[2]]);
      PZ(k, 0, -3.6, 0, legW * 0.8 + 0.5, 4.2, legW * 0.8 + 0.5, [BRZ[(u.row + 1) % 3], BRZ[0]]);
      PZ(k, 0, -8.2, 0, legW * 0.8 + 0.1, 3, legW * 0.8 + 0.1, [BRZ[u.row % 2], BRZ[2]]);
      for (const y of [-1.4, -5.9, -9.9]) K.boxZ(k, 0, y, 0, legW * 0.8 + 0.8, 0.5, legW * 0.8 + 0.8, BRZ_D[1]);
      K.boxZ(k, 0, -5.9, legW * 0.4 + 0.5, 0.6, 1.6, 0.8, BRZ_L, -0.6); K.boxZ(k, 0, -10, legW * 0.3 + 0.4, 0.5, 1.2, 0.6, BRZ_L, -0.6);
      PZ(k, 0, -11.6, 0, 1.3, 2.4, 1.3, [BRZ_D[0], BRZ_D[2]]);
      K.boxZ(k, 0, -13, 0.4, 0.8, 1.2, 1.3, 0x1a0e04);
    } else {
      K.boxZ(k, 0, -6.5, 0, legW * 0.8, 13, legW * 0.8, BRZ_D[1]);
      K.boxZ(k, 0, -4.2, 0, legW * 0.8 + 0.8, 5, legW * 0.8 + 0.8, BRZ[(u.row + 1) % 3]);
      K.boxZ(k, 0, -6.9, 0, legW * 0.8 + 1, 0.8, legW * 0.8 + 1, BRZ_D[1]);
      K.boxZ(k, 0, -9.4, 0, legW * 0.8 + 0.4, 3.6, legW * 0.8 + 0.4, BRZ_D[0]);
      K.boxZ(k, 0, -12.4, 0, 1.2, 2.2, 1.2, BRZ_D[2]);
    }
  }
  // the abdomen: a big chequered dome of bronze blocks
  const ab = group(rig.torso, 0, 1.6, -8.6);
  // (the queen's is the same chequer at three blocks to each of the
  // spider's, rounded off into a dome: the blocks near its corners drop)
  const AW = 11, AH = 9, AD = 12, f = queen ? 3 : fine ? 2 : 1, NX = 6 * f, NY = 5 * f, NZ = 7 * f, c = 1.83 / f;
  for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy < NY; iy++) for (let iz = 0; iz < NZ; iz++) {
    const edge = ix === 0 || ix === NX - 1 || iy === 0 || iy === NY - 1 || iz === 0 || iz === NZ - 1; if (!edge) continue;
    const x = -AW / 2 + c / 2 + ix * (AW - c) / (NX - 1), y = -AH / 2 + c / 2 + iy * (AH - c) / (NY - 1), z = -AD / 2 + c / 2 + iz * (AD - c) / (NZ - 1);
    if (fine) { if ((x / (AW * 0.62)) ** 2 + ((y + 1) / (AH * 0.66)) ** 2 + (z / (AD * 0.6)) ** 2 > 1.06 + K.r() * 0.08) continue; }
    else { const corners = (ix === 0 || ix === 5) + (iy === 4 || iy === 0) + (iz === 0 || iz === 6); if (corners >= 3 || (corners === 2 && iy === 0)) continue; }
    const jx = Math.floor(ix / f), jy = Math.floor(iy / f), jz = Math.floor(iz / f);
    const band = jz % 3 === 1, chk = (jx + jy + jz) % 2;
    const col = band ? BRZ_D[(jx + jy) % 3] : chk ? BRZ[0] : BRZ[(jx + jz) % 2 ? 2 : 1];
    K.box(ab, x, y, z, c + 0.15 / f, c + 0.15 / f, c + 0.15 / f, fine ? K.tone([col], 0.12) : col);
  }
  // the queen: a seam of rivets down each band and a ridge of spines along the dome's top
  if (queen) for (let i = 0; i < 7; i++) {
    const z = -AD / 2 + 1 + i * (AD - 2) / 6, top = AH * 0.66 - 1 - Math.abs(z) * 0.2;
    K.box(ab, 0, top + 1.6, z, 0.8, 2.4 - Math.abs(i - 3) * 0.3, 0.9, BRZ_L, -0.4);
    for (const sx of [-1, 1]) K.box(ab, sx * 2.6, top + 0.5, z, 0.5, 0.5, 0.5, BRZ_L);
  }
  K.box(ab, 0, 0, 0, AW - 1, AH - 1, AD - 1, BRZ_D[0]);
  // a plated back with rivets and a dark mid-band
  const T = rig.torso;
  PL(T, 0, 2.9, 0, 7.8, 1, 7.4, [BRZ[2], BRZ[0]], { faces: 'tfklr' }); K.box(T, 0, 3.5, 0, 2.4, 0.4, 7.6, BRZ_D[1]);
  for (const [x, z] of [[-2.8, 2.8], [2.8, 2.8], [-2.8, -2.8], [2.8, -2.8], [-2.8, 0], [2.8, 0]]) K.box(T, x, 3.55, z, 0.8, 0.5, 0.8, BRZ_L);
  for (const sx of [-1, 1]) PL(T, sx * 3.7, 0, 0, 0.6, 3.4, 7.6, [BRZ_D[2], BRZ_D[1]], { faces: sx < 0 ? 'l' : 'r' });
  // face: brow plate, two furnace eyes and four small ones, mandibles and cream fangs
  const Hd = rig.head, fz = hs * 0.35 + hs / 2;
  PL(Hd, 0, hs * 0.42, hs * 0.35, hs + 0.6, 1, hs + 0.4, [BRZ[2], BRZ[0]], { faces: 'tfklr' });
  K.box(Hd, 0, hs * 0.26, fz + 0.3, hs + 0.4, 0.9, 0.6, BRZ_D[0]);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * hs * 0.24, 0, fz + 0.15, 1.8, 1.6, 0.4, 0xff6a00); K.box(Hd, sx * hs * 0.24, 0, fz + 0.3, 0.8, 0.7, 0.3, 0xffd040);
    K.box(Hd, sx * hs * 0.12, hs * 0.18 + 0.6, fz + 0.15, 0.7, 0.6, 0.3, 0xff8000); K.box(Hd, sx * hs * 0.38, hs * 0.18 + 0.4, fz + 0.15, 0.6, 0.6, 0.3, 0xff8000);
  }
  const M = rig.mouth;
  for (const sx of [-1, 1]) {
    K.box(M, sx * 1.4, 0.2, 1.1, 1.5, 1.5, 2.4, BRZ[0], 0, -sx * 0.25, 0);
    K.box(M, sx * 1.6, -1.3, 2.1, 0.9, 2.4, 0.9, 0xeedcb0, 0.2, 0, 0); K.box(M, sx * 1.6, -2.7, 2.4, 0.6, 1, 0.6, 0xd8c498);
  }
  rig.extras.abdomen = ab;
  if (queen) {
    // the queen: a crown of spikes, gears turning in her sides, a furnace glow
    // a crown of nine fine spikes on a riveted band
    K.box(Hd, 0, 3.4, 1, hs + 0.2, 0.8, 1.4, BRZ_D[1], -0.3);
    for (let i = -4; i <= 4; i++) { const h = 1.6 + (4 - Math.abs(i)) * 0.7; K.box(Hd, i * 0.62, 3.6 + h / 2, 1 - h * 0.15, 0.45, h, 0.5, BRZ_L, -0.3, 0, -i * 0.09); if (i % 2 === 0) K.box(Hd, i * 0.62, 3.4, 1.75, 0.35, 0.35, 0.3, 0xffd040); }
    const gears = [];
    for (const sx of [-1, 1]) { const gg = group(ab, sx * 5.9, 0.5, 0); for (let i = 0; i < 6; i++) K.box(gg, 0, 0, 0, 0.8, 1.4, 6.4, BRZ_L, i / 6 * Math.PI, 0, 0); K.box(gg, 0, 0, 0, 1, 2.6, 2.6, BRZ_D[0]); gears.push(gg); }
    rig.extras.gears = gears;
    K.box(ab, 0, -1, -6.2, 3, 3, 0.6, 0xff7a10); K.box(ab, 0, -1, -6.4, 1.6, 1.6, 0.4, 0xffd040);
    K.box(T, 0, 0, 4.2, 3, 2, 0.6, 0xff7a10);
  } else {
    // a wind-up key on the abdomen
    const key = group(ab, 0, 4.6, 0);
    K.box(key, 0, 1.3, 0, 0.8, 2.6, 0.8, BRZ_L); K.box(key, 0, 3, 0, 4, 1.6, 0.7, BRZ_L); K.box(key, 0, 3, 0, 1.8, 0.8, 0.8, BRZ_D[0]);
    rig.extras.key = key;
  }
  return K.done();
}
// A Fury (vox-enemies, bottom right): a grey hag with a mass of wild white
// curls, burning yellow eyes and a fanged grin, in a long ragged black dress
// that flares into torn strips, gold straps, belt and bracelets, clawed grey
// feet, huge tattered leather wings and a whip of fire.
export function buildFury(id, { scale = 1, skin = 0xb0a898, hair = 0xdcdcd8, wing = 0x5a3a26, dress = 0x1a1416, mouthGrin = true, seed = 61 } = {}) {
  const gold = 0xd89a28;
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin, eye: 0xffd84a, eyeWhite: 0xffd84a, scowl: true, brow: 0x5a5a56, wrinkles: 0x7a7266, fangs: 0xf4f0e0, grin: mouthGrin, frown: !mouthGrin, top: dress, sleeve: skin, hand: skin, shortSleeve: true, pants: dress, skirt: dress, skirtLen: 12, shoes: false, collar: dress,
      face: (s, ey) => { s.rect(8, ey - 1, 8, 3, skin, 0.06); for (const x of [9, 13]) { s.rect(x, ey, 2, 1, 0xffe040, 0); s.dot(x + (x === 9 ? 1 : 0), ey, 0xffffff); } s.rect(9, ey - 1, 2, 0.5, 0x3a3836, 0); s.rect(13, ey - 1, 2, 0.5, 0x3a3836, 0); for (const x of [8.5, 14.5]) s.dot(x, ey + 1.5, 0x8a8278, 1, 2); s.dot(11.5, ey + 1, 0x6a645c, 2, 1); },
      body: (s) => {
        for (let i = 0; i < 60; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, s.r() < 0.5 ? 0x0a0808 : 0x2e262a);
        s.rect(16, 29, 24, 2, gold, 0.05); s.rect(23, 29, 2, 2, 0xffd84a, 0);
        for (let y = 20; y < 29; y++) { s.dot(20 + (y - 20) * 0.5, y, gold, 1, 2); s.dot(27 - (y - 20) * 0.5, y, gold, 1, 2); }
        for (const [u, v] of [[40, 16], [32, 48]]) { s.rect(u, v + 13, 16, 1, gold, 0); for (let i = 0; i < 12; i++) s.dot(u + s.r() * 16, v + 4 + s.r() * 12, 0x8a8278); }
      } });
    S.shadeLimbs(); S.saturate(1.15);
  }, { emit: 1, res: 2, scale });
  const rig = new Rig({ material: mat, scale, bodyW: 7, armW: 3, legH: 10 });
  // a Fury drawn bigger than a hero (the boss sisters, scale 1.6 to 1.75) is
  // made of more, finer strips, curls and claws, not bigger ones
  const D = Math.max(1, densityFor(scale));
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  const K = kit(rig, mat, { seed, rough: 0.9 });
  const RAG = [dress, 0x241c20, 0x120e10, 0x2e2428, 0x1e1418];
  // the dress: four swaying panels of ragged strips that flare toward the hem
  const panels = [];
  for (let q = 0; q < 4; q++) {
    const g = group(rig.hips, 0, 0.5, 0); panels.push(g);
    const nS = Math.round(10 * D);
    for (let i = 0; i < nS; i++) {
      const a = (q + i / nS) * Math.PI / 2 - Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
      if (Math.abs(a) < 0.25 && i % 2 === 0) continue;                  // the slit up the front
      // an upper strip hanging close to the hips, then a lower one flaring out, then torn ends
      const L1 = 5.5, L2 = 6.5 + K.r() * 3.5, l3 = 1.5 + K.r() * 3.5;
      const x = sa * 3.7, z = ca * 2.5, f2 = 0.22, f3 = 0.4, col = K.tone(RAG, 0.15);
      K.box(g, x, -L1 / 2 + 0.6, z, 1.7 / D, L1, 1, col, -ca * 0.08, 0, sa * 0.08);
      const y2 = -L1 + 0.6, ox2 = sa * (0.4 + L2 * Math.sin(f2) / 2), oz2 = ca * (0.4 + L2 * Math.sin(f2) / 2);
      K.box(g, x + ox2, y2 - L2 * Math.cos(f2) / 2, z + oz2, 1.9 / D, L2, 1, col, -ca * f2, 0, sa * f2);
      const y3 = y2 - L2 * Math.cos(f2), o3 = 0.4 + L2 * Math.sin(f2) + l3 * Math.sin(f3) / 2;
      K.box(g, x + sa * o3, y3 - l3 * Math.cos(f3) / 2, z + ca * o3, (0.7 + K.r() * 0.7) / D, l3, 0.6 / D, K.tone(RAG, 0.1), -ca * f3, 0, sa * f3);
    }
    sway(rig, g, q % 2 ? 'z' : 'x', 0.06, 2.3, q * 1.3);
  }
  // a grey shin in the slit, and bare clawed feet under the hem
  K.box(rig.hips, -1.2, -6.5, 1.6, 2.2, 7, 2.2, skin);
  for (const sx of [-1.6, 1.6]) { K.box(rig.hips, sx, -10.7, 0.9, 2.2, 1.4, 3.6, skin); for (const dx of [-0.7, 0, 0.7]) K.box(rig.hips, sx + dx, -11, 3.1, 0.5, 0.7, 1.2, 0x2a2420); }
  // gold straps and belt, a dark ragged collar
  const T = rig.torso;
  K.box(T, 0, 3.6, 0, 7.6, 1.4, 4.6, gold); K.box(T, 0, 3.6, 2.4, 1.8, 1.8, 0.4, 0xf0c040);
  for (const sx of [-1, 1]) K.box(T, sx * 1.6, 8.5, 2.35, 0.7, 7.5, 0.3, gold, 0, 0, sx * 0.42);
  for (let i = 0, n = Math.round(8 * D); i < n; i++) K.box(T, -3.5 + i * 7 / (n - 1), 11.8, (i % 2 ? 2.2 : -2.2), 1.2 / D, 1.6, 0.6, K.tone(RAG, 0.1));
  // arms: gold bracelets, bony knuckles and long dark claws
  for (const arm of [rig.armR, rig.armL]) {
    K.box(arm, 0, -7.3, 0, 3.6, 1.2, 4.6, gold); K.box(arm, 0, -5.9, 0, 3.5, 0.6, 4.5, 0xa87418);
    for (const dz of [-1.2, 0, 1.2]) K.box(arm, 0, -10.6, dz, 0.6, 1.6, 0.6, 0x2a2420);
  }
  gridHair(rig, { style: 'curls', base: hair, shade: 0x8a8a86, light: 0xe8e8e4, seed, shape: { r: [6.9, 7.8, 6.6], bump: 0.5, tuft: 0.28, spike: 0.1, side: -1.5, back: -5 }, res: D }, mat);
  K.done();
  const ws = Math.min(1.2, scale + 0.1);
  addWings(rig, { span: 27 * ws, chord: 15, mat: solid(wing, 0, 0.9), tip: solid(0x3a2418, 0, 0.9), kind: 'bat', y: 10.5, bone: solid(0x2a1a10), cols: { dark: 0x24160e }, seed: seed + 5, look: mat, fine: D });
  addWhip(rig, { segs: 10, len: 3.6, look: mat });
  rig.tick = (dt, e) => animateExtras(rig, dt, e);   // (the bosses built on her get the whip's pose too, even outside a fight)
  rig.hunch = 0.35;
  rig.float = 0.8;
  rig.hoverMin = 11 * PX * rig.baseScale + 0.22;   // (the ragged hem hangs 11 px under the soles: a boss's swoop flies no lower, bob included)
  return rig;
}

// A writhing snake drawn with the kit: a chain of segment groups (one mesh
// each) ending in a head with yellow eyes and a forked tongue, registered in
// rig.extras.snakes for animateExtras.
function kitSnake(K, rig, parent, { len = 2, seg = 2, w = 1.3, cols, belly, at = [0, 0, 0], rot = [0, 0, 0], amp = 0.3, speed = 3.5 } = {}) {
  const root = group(parent, ...at, ...rot);
  const segs = [];
  let p = root;
  for (let i = 0; i < len; i++) {
    const g = group(p, 0, i ? seg : 0, 0);
    const k = 1 - i / len * 0.25;
    K.box(g, 0, seg / 2, 0, w * k, seg + 0.3, w * k, K.tone(cols, 0.12));
    if (belly) K.box(g, 0, seg / 2, w * k / 2, w * k * 0.6, seg * 0.7, 0.25, belly);
    segs.push(g); p = g;
  }
  // the head sits on the last segment (no extra mesh)
  const hw = w * 1.5, y = seg + hw * 0.3;
  K.box(p, 0, y, hw * 0.35, hw, hw * 0.7, hw * 1.5, cols[0], 0.5);
  for (const sx of [-1, 1]) K.box(p, sx * hw * 0.42, y + hw * 0.15, hw * 0.75, 0.4, 0.4, 0.4, 0xffd000);
  K.box(p, 0, y - hw * 0.4, hw * 1.25, 0.25, 0.15, 1.2, 0xc8102a, 0.5);
  (rig.extras.snakes ??= []).push({ segs, ph: K.r() * 6, amp, speed, head: p });
  return { root, segs };
}
// Footwear from herovox as kit boxes on a leg.
function kitFootwear(K, leg, kind, opts, dy = 0) {
  for (const b of footwear(kind, opts)) K.box(leg, b.at[0], b.at[1] + dy, b.at[2], b.size[0], b.size[1], b.size[2], b.col);
}

// Dracaena (vox-enemies, middle row): a snake-haired woman in a black and
// gold top with gold arm rings and a skirt of dark leather strips, over one
// long serpent tail in dark green scales with a gold belly stripe, coiling on
// the ground and curling up at the tip; a long gold-tipped spear and a
// small bronze buckler.
function buildDracaena() {
  const skin = 0xd49a70, gold = 0xe0a426, goldD = 0xa87010, blk = 0x161214;
  const G = [0x0e4a26, 0x146030, 0x0a3a1c, 0x1c7038];
  const mat = skinMat('dracaena', (S) => {
    paintPerson(S, { skin, hair: 0x0e4a26, fringe: 1, hairSide: 3, hairBack: 6, eye: 0x0a6a3a, eyeWhite: 0xf0f0e0, scowl: true, brow: 0x0a2a14, fangs: 0xf4f0e0, mouth: false, top: skin, sleeve: skin, hand: skin, pants: 0x0e4a26, skirt: 0x1a2a1a, skirtLen: 7,
      face: (s, ey) => { s.rect(11, ey + 2, 2, 1, 0xa8483a, 0); s.dot(9, ey - 0.5, 0x0a2a14, 2, 1); s.dot(14, ey - 0.5, 0x0a2a14, 2, 1); },
      body: (s) => {
        for (const [u, w] of [[16, 4], [20, 8], [28, 4], [32, 8]]) { s.rect(u, 20, w, 5, blk, 0.05); s.rect(u, 20, w, 1, gold, 0); s.rect(u, 24, w, 1, gold, 0); }
        s.rect(23.5, 22, 1, 2, gold, 0); s.rect(23, 25, 2, 2, gold, 0);
        s.rect(16, 29, 24, 3, 0x1a2a1a, 0.1); s.rect(16, 29, 24, 1, gold, 0); for (let x = 16; x < 40; x += 2) s.dot(x + 0.5, 30.5, 0x2e7a3a);
      } });
    S.shadeLimbs(); S.saturate(1.2);
  }, { emit: 1, rough: 0.55, res: 2 });
  const rig = new Rig({ material: mat, scale: 1.2, bodyW: 8, bodyD: 4, armW: 3, legH: 12 });
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  const K = kit(rig, mat, { seed: 23, rough: 0.55 });
  // the serpent tail: down from the hips, coiling forward and round on the
  // ground and curling up at the tip; dark green scales, gold belly and stripe
  const base = group(rig.hips, 0, 0, 0);
  K.box(base, 0, -5, -0.3, 7, 10, 5, G[0]); K.box(base, 0, -9.6, -0.8, 6.6, 3, 6, G[2]);
  K.clumps(base, [0, -5, -0.3], [7, 10, 5], { n: 44, size: [1, 1.4], cols: G, faces: 'lrfk', out: -0.2 });
  K.box(base, 0, -5.5, 2.3, 4.4, 9, 0.6, gold);
  for (let y = -1.5; y > -10; y -= 1.6) K.box(base, 0, y, 2.6, 4.6, 0.3, 0.4, goldD);
  const segs = [];
  let parent = group(base, 0, -9.7, -0.5);
  const shape = [[6.4, 4.6, 5.4], [6, 4.4, 5.4], [5.4, 4, 5.2], [4.8, 3.6, 5], [4, 3.2, 4.8], [3.2, 2.6, 4.4], [2.4, 2, 4], [1.6, 1.5, 3.4]];
  const bend = [0.05, 0, 0, 0.05, 0.1, 0.35, 0.6, 0.6], yaw = [0.9, 0.85, 0.85, 0.8, 0.75, 0.4, 0.2, 0.2];   // (bend +: up; the tip curls up off the ground)
  for (let i = 0; i < shape.length; i++) {
    const [w, h, d] = shape[i];
    const g = group(parent, 0, 0, i ? -shape[i - 1][2] + 0.4 : 0, bend[i], yaw[i], 0);
    if (i > 1) sway(rig, g, 'y', 0.1, 2.2, i * 0.8);
    K.box(g, 0, 0, -d / 2, w, h, d + 0.4, G[i % 2]);
    // scales: a chequer of raised cells on the back and sides
    for (let z = 0.6; z < d; z += 1.2) for (const [x, y, sw, sh, sd] of [[0, h / 2, w * 0.6, 0.35, 1.1], [-w / 2, h * 0.1, 0.35, h * 0.6, 1.1], [w / 2, h * 0.1, 0.35, h * 0.6, 1.1]]) if (K.r() < 0.7) K.box(g, x, y, -z, sw, sh, sd, K.tone(G, 0.15));
    // gold belly and a zigzag side stripe
    K.box(g, 0, -h / 2 - 0.1, -d / 2, w * 0.75, 0.4, d + 0.2, gold);
    for (const sx of [-1, 1]) { K.box(g, sx * (w / 2 + 0.1), -h * 0.2, -d * 0.3, 0.4, h * 0.35, d * 0.5, gold); K.box(g, sx * (w / 2 + 0.12), h * 0.05, -d * 0.75, 0.35, h * 0.3, d * 0.4, goldD); }
    segs.push(g); parent = g;
  }
  K.box(parent, 0, 0.6, -4, 1, 2.2, 1, G[2], -0.6);
  // skirt of leather strips with gold studs, and a gold belt
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, x = Math.sin(a) * 4.3, z = Math.cos(a) * 2.8, L = 4.5 + (i % 3);
    K.flare(rig.hips, x, -L / 2 + 0.5, z, 2.1, L, 0.7, i % 2 ? 0x1a2a1a : blk, a, 0.18);
    K.box(rig.hips, x * 1.05, 0, z * 1.08, 0.6, 0.6, 0.4, gold, 0, a, 0);
  }
  K.box(rig.torso, 0, 0.6, 0, 8.8, 1.4, 4.8, gold); K.box(rig.torso, 0, 0.6, 2.5, 2, 2, 0.4, 0xf0c040);
  // gold arm rings and cuffs
  for (const arm of [rig.armR, rig.armL]) { K.box(arm, 0, -7, 0, 3.6, 1.6, 4.6, gold); K.box(arm, 0, -7, 0, 3.7, 0.4, 4.7, goldD); K.box(arm, 0, 0.6, 0, 3.5, 1, 4.5, gold); }
  // snake hair: a mass of green curls, snake heads poking out and four that writhe
  gridHair(rig, { style: 'curls', base: 0x146030, shade: 0x0a3a1c, light: 0x2a8a44, seed: 17, shape: { r: [6.8, 7.4, 6.6], bump: 0.55, tuft: 0.3, spike: 0.1, side: 0, back: -3 } }, mat);
  const Hd = rig.head, hk = HS;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.3, x = Math.sin(a) * 7.2, z = Math.cos(a) * 6.6 - 0.8, y = 4 + (i % 3) * 2.2;
    if (z > 3 && y < 7) continue;
    const o = [x * hk, y * hk, z * hk];
    K.boxY(Hd, o, a, 0, 0, 0.6, 1.6, 1.2, 2.4, G[i % 4]); K.boxY(Hd, o, a, 0, -0.2, 2, 1.2, 0.8, 1, G[1]);
    for (const sx of [-1, 1]) K.boxY(Hd, o, a, sx * 0.62, 0.3, 1.2, 0.35, 0.35, 0.35, 0xffd000);
  }
  for (const [x, z, rx, rz] of [[-3, 1.5, 0.5, 0.8], [3, 1.5, 0.5, -0.8], [-1.5, -1, -0.3, 0.3], [1.8, -0.5, 0.2, -0.4]])
    kitSnake(K, rig, Hd, { len: 2, seg: 1.8, w: 1.3, cols: G, belly: gold, at: [x * hk, 8.6 * hk, z * hk], rot: [rx, 0, rz], amp: 0.28, speed: 4 });
  // the long spear and a small buckler
  const spear = new THREE.Group(); rig.handR.add(spear); spear.rotation.x = HOLD_PITCH;   // (along +y, levelled forward: see the hand-axis convention in character.js)
  K.box(spear, 0, 6, 1.5, 1, 44, 1, 0x4a2e1a);
  for (const y of [-10, 18, 24]) K.box(spear, 0, y, 1.5, 1.4, 0.8, 1.4, gold);
  K.box(spear, 0, 27, 1.5, 1.8, 1.2, 1.8, goldD);
  K.box(spear, 0, 29.5, 1.5, 2.6, 4, 0.8, gold); K.box(spear, 0, 32.5, 1.5, 1.8, 2.4, 0.7, gold); K.box(spear, 0, 34.5, 1.5, 0.9, 2, 0.6, 0xf0c040);
  markTip(spear, 0, 35.5, 1.5, 'spear');
  const shield = markHeld(new THREE.Group()); shield.position.set(1.6 * PX, -5 * PX, 1 * PX); rig.handL.add(shield); shield.rotation.y = Math.PI / 2;
  K.box(shield, 0, 0, 0, 7.6, 7.6, 1, gold); K.box(shield, 0, 0, 0.4, 5.6, 5.6, 0.6, G[0]); K.box(shield, 0, 0, 0.8, 2, 2, 0.8, gold);
  for (const [x, y] of [[-2.8, 0], [2.8, 0], [0, 2.8], [0, -2.8]]) K.box(shield, x, y, 0.6, 0.8, 0.8, 0.6, 0xf0c040);
  rig.extras.shield = shield;
  K.done();
  rig.hunch = 0.15;
  keepAbove(rig, spear, { reset: true });   // (a slam that ends low grounds the spear point rather than driving it through the floor)
  return rig;
}

// Empousa (vox-enemies, bottom middle): a cheerleader with a blazing mane of
// voxel flame, a white crop top with an orange V and emblem, a pleated orange
// skirt with a white stripe, one bronze automaton leg and one shaggy donkey
// leg with a hoof, and big orange and black pom-poms.
function buildEmpousa() {
  const skin = 0xe2a884, orange = 0xe85a08, white = 0xdcd8d0;
  const mat = skinMat('empousa', (S) => {
    paintPerson(S, { skin, hair: 0xd8401a, fringe: 2, hairSide: 3, eye: 0xc82a0a, eyeWhite: 0xffffff, grin: true, lipstick: 0xc8203a, top: white, collar: orange, sleeve: skin, hand: skin, shortSleeve: true, skirt: orange, skirtLen: 5, legR: skin, legL: skin, shoes: false,
      face: (s, ey) => { s.dot(9, ey - 1, 0x3a1a0a, 2, 1); s.dot(14, ey - 1, 0x3a1a0a, 2, 1); s.rect(10, ey + 2, 4, 1, 0x8a0a1a, 0); s.dot(10, ey + 2, 0xf4f0e0, 1, 1); s.dot(13.5, ey + 2, 0xf4f0e0, 1, 1); s.dot(9, ey + 1.5, 0xf08a8a, 2, 1); s.dot(14, ey + 1.5, 0xf08a8a, 2, 1); },
      body: (s) => {
        for (let i = 0; i < 4; i++) { s.rect(20 + i * 0.5, 20 + i, 1, 1, orange, 0); s.rect(27 - i * 0.5, 20 + i, 1, 1, orange, 0); }
        s.rect(22, 25, 4, 3, orange, 0.05); s.dot(23, 25.5, white, 4, 2);
        s.rect(16, 29, 24, 3, skin, 0.04); s.rect(16, 28, 24, 1, orange, 0);
        for (const [u, v] of [[40, 16], [32, 48]]) s.rect(u, v + 9, 16, 1, orange, 0);
      } });
    S.shadeLimbs(); S.saturate(1.2);
  }, { emit: 0.7, res: 2 });
  const rig = new Rig({ material: mat, scale: 1.1, bodyW: 7, armW: 3 });
  const K = kit(rig, mat, { seed: 29, emit: 0.7 });
  // flaming hair: red locks under a mane of glowing flame cubes that licks upward
  const flame = group(rig.head, 0, 0, 0);
  // (pass 3: a champion built bigger, BUILD.k = K.density, gets more and
  // smaller flame and tassel cubes, so they stay near a hero's voxel size)
  const hk = HS, FL = [0xff5000, 0xff7800, 0xffa000, 0xffc840], D = K.density ?? 1;
  for (let i = 0; i < Math.round(90 * D * D); i++) {
    const t = K.r(), a = K.r() * Math.PI * 2, rad = 4.6 + K.r() * 1.6 - t * 2.8;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad * 0.9 - 0.9;
    if (z > 2.6 && t < 0.3) continue;
    const y = 6.2 + t * 9 + (z < 0 ? 0 : -1), sz = (2.3 - t * 1.4 + K.r() * 0.6) / D;
    K.box(flame, x * hk, y * hk, z * hk, sz, sz * 1.3, sz, FL[Math.min(3, Math.floor(t * 3.3 + K.r() * 0.8))]);
  }
  for (let i = 0; i < Math.round(34 * D * D); i++) K.box(flame, (K.r() - 0.5) * 9, 5 - K.r() * 9, -4.6 - K.r() * 1.2, 1.9 / D, 2.2 / D, 1.6 / D, i % 3 ? FL[Math.floor(K.r() * 3)] : 0xc8301a);
  K.clumps(rig.head, [0, 4 * hk + 1, -0.5], [8.6 * hk, 8 * hk, 8 * hk], { n: 40, size: [1.2, 2], cols: [0xb82a14, 0xd8401a, 0x9a200e], faces: 'tlrk' });
  for (let x = -3.5; x <= 3.5; x += 1.4) K.box(rig.head, x * hk, 7.6 * hk, 4.3 * hk, 1.6, 1.6 + (Math.abs(x) < 1 ? 0 : 1), 0.8, 0xd8401a);
  rig.extras.flameHair = flame;
  // pleated skirt: alternating orange and darker pleats with a white stripe
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, x = Math.sin(a) * 4.2, z = Math.cos(a) * 2.7;
    K.flare(rig.hips, x * 1.06, -1.8, z * 1.08, 1.8, 4.4, 0.7, i % 2 ? orange : 0xc85008, a, 0.3);
    K.flare(rig.hips, x * 1.06 + Math.sin(a) * 0.55, -3.3, z * 1.08 + Math.cos(a) * 0.55, 1.9, 0.6, 0.75, white, a, 0.3);
  }
  // the bronze leg: thigh plates, a riveted knee, a jointed shin and a pointed foot
  const bronze = [0xd08a20, 0xb06a14, 0xe8a830];
  dropMeshes(rig, rig.legR);
  K.box(rig.legR, 0, -2.5, 0, 4.2, 5, 4.2, skin);
  K.box(rig.legR, 0, -5.3, 0, 4.4, 1.2, 4.4, bronze[1]);
  K.box(rig.legR, 0, -6.6, 0.2, 3.2, 2.2, 3.4, bronze[2]); for (const sx of [-1, 1]) K.box(rig.legR, sx * 1.7, -6.6, 0.2, 0.4, 1.2, 1.2, 0x5a3a10);
  K.box(rig.legR, 0, -9.2, 0, 2.8, 4.2, 2.8, bronze[0]); K.box(rig.legR, 0, -9.2, 1.45, 1.2, 3.6, 0.3, bronze[1]);
  K.box(rig.legR, 0, -11.4, 0.9, 3.4, 1.2, 4.6, bronze[1]); K.box(rig.legR, 0, -11.7, 3.4, 1.6, 0.6, 1.2, bronze[2]);
  // the donkey leg: grey-brown shaggy fur from the knee and a dark split hoof
  dropMeshes(rig, rig.legL);
  K.box(rig.legL, 0, -2.5, 0, 4.2, 5, 4.2, skin);
  const donk = [0x8a7a6a, 0x6a5a4c, 0x9a8a78, 0x5a4a3e];
  K.box(rig.legL, 0, -7.5, 0, 3.6, 6, 3.6, donk[0]);
  K.clumps(rig.legL, [0, -7, 0], [3.6, 6, 3.6], { n: 26, size: [1, 1.6], cols: donk, faces: 'lrfk', stretch: [1, 1.4, 1] });
  K.box(rig.legL, 0, -11.1, 0.4, 3.4, 1.8, 3.8, 0x1e1612); K.box(rig.legL, 0, -11.1, 2.35, 0.5, 1.6, 0.2, 0x3a2a20);
  // pom-poms: a ball of orange and black tassel cubes in each hand
  for (const hand of [rig.handR, rig.handL]) {
    const pp = markHeld(group(hand, 0, -2.6, 0));
    K.box(pp, 0, 0, 0, 5.4, 5.4, 5.4, orange);
    for (let i = 0; i < Math.round(64 * D * D); i++) {
      const u = K.r() * 2 - 1, th = K.r() * Math.PI * 2, r = Math.sqrt(1 - u * u), R = 3.4 + K.r() * 1.2;
      const z = (1.1 + K.r() * 0.8) / D;
      K.box(pp, Math.cos(th) * r * R, u * R, Math.sin(th) * r * R, z, z, z, i % 3 === 0 ? 0x1a1418 : K.r() < 0.5 ? orange : 0xd85008);
    }
  }
  K.done();
  rig.extras.flame = true;
  return rig;
}

// Skeleton warrior (vox-enemies, bottom left): a grinning skull under an
// olive combat helmet with ear pads and goggles, a camo plate carrier with
// pouches, camo shorts, bare bone arms and shins with knobby joints, tan
// combat boots and a rifle held across the body.
// Options for a champion (entities/champions.js): id (its own skin), pal
// { bone, boneD, olive, oliveD, khaki, camo, boot }, helmet: false (bare
// skull), gear: false (no rifle; the champion arms it).
const skullFace = (boneD) => (s, ey) => {
  s.rect(9, ey - 1, 2, 2, 0x0a0806, 0); s.rect(13, ey - 1, 2, 2, 0x0a0806, 0); s.dot(9.5, ey - 0.5, 0x2a1a10); s.dot(13.5, ey - 0.5, 0x2a1a10);
  s.dot(11.5, ey + 1, 0x1a1410, 1, 2); s.dot(12, ey + 1, 0x1a1410, 1, 2);
  s.rect(9, ey + 3, 6, 1, 0xf0e8d0, 0); for (let x = 9; x < 15; x += 1) s.dot(x + 0.5, ey + 3, 0x4a4030, 1, 2);
  s.rect(10, ey + 4, 4, 1, boneD, 0); s.dot(8.5, ey + 1.5, boneD, 1, 3); s.dot(15, ey + 1.5, boneD, 1, 3);
};
export function buildSkeleton({ id = 'skeleton', pal = {}, helmet = true, gear = true } = {}) {
  const bone = pal.bone ?? 0xe0d6bc, boneD = pal.boneD ?? 0xb0a688, olive = pal.olive ?? 0x4a5a2a, oliveD = pal.oliveD ?? 0x2e3a1a, khaki = pal.khaki ?? 0x8a7a50;
  const CAMO = pal.camo ?? [olive, oliveD, 0x6a6a3a, 0x3a3020];
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin: bone, eye: 0x0a0806, eyeWhite: 0x0a0806, brow: boneD, mouth: false, top: olive, sleeve: olive, shortSleeve: true, hand: bone, pants: olive, shoes: khaki,
      face: skullFace(boneD),
      body: (s) => {
        for (const [x0, y0, w, h] of [[16, 16, 24, 16], [40, 16, 16, 9], [32, 48, 16, 9], [0, 16, 16, 9], [16, 48, 16, 9]]) for (let i = 0; i < w * h / 4; i++) s.rect(x0 + s.r() * w, y0 + s.r() * h, 1.5, 1, CAMO[Math.floor(s.r() * 4)], 0);
        for (const [u, v] of [[0, 16], [16, 48], [40, 16], [32, 48]]) { s.rect(u, v + 9, 16, 7, bone, 0.05); for (let i = 0; i < 8; i++) s.dot(u + s.r() * 16, v + 9 + s.r() * 7, boneD); }
      } });
    S.shadeLimbs(); S.saturate(1.15);
  }, { emit: 0.8, res: 2 });
  const rig = new Rig({ material: mat, scale: 1.15, armW: 3 });   // (size audit: a grown man, as tall as the spartoi)
  const K = kit(rig, mat, { seed: 37, rough: 0.8 });
  const hk = HS;
  // arms: camo short sleeves, then bare bones with a knobby elbow and bony hands
  for (const arm of [rig.armR, rig.armL]) {
    dropMeshes(rig, arm);
    K.box(arm, 0, -0.5, 0, 3.6, 5, 4, olive); K.clumps(arm, [0, -0.5, 0], [3.6, 5, 4], { n: 8, size: [0.8, 1.2], cols: CAMO, faces: 'lrfk', out: -0.3 });
    K.box(arm, 0, -4.5, 0, 1.4, 3.6, 1.4, bone); K.box(arm, 0, -6.4, 0, 2.2, 1.6, 2.2, boneD);
    K.box(arm, -0.45, -8.4, 0, 0.8, 3.2, 0.8, bone); K.box(arm, 0.45, -8.4, 0, 0.8, 3.2, 0.8, bone);
    K.box(arm, 0, -10.4, 0, 2.2, 1.6, 2.2, bone); for (const dz of [-0.7, 0, 0.7]) K.box(arm, 0, -11.6, dz, 0.5, 1.2, 0.5, boneD);
  }
  // legs: camo shorts with cargo pockets, bone shins, knee knobs, tan boots
  for (const leg of [rig.legR, rig.legL]) {
    dropMeshes(rig, leg);
    K.box(leg, 0, -2.6, 0, 4.4, 5.6, 4.4, olive); K.clumps(leg, [0, -2.6, 0], [4.4, 5.6, 4.4], { n: 12, size: [0.9, 1.3], cols: CAMO, faces: 'lrfk', out: -0.3 });
    K.box(leg, leg === rig.legR ? -2.3 : 2.3, -3.6, 0, 0.8, 2.4, 2.4, oliveD);
    K.box(leg, 0, -6.4, 0.2, 2.4, 1.8, 2.4, boneD);
    K.box(leg, -0.5, -8.4, 0, 1, 3.4, 1, bone); K.box(leg, 0.6, -8.4, 0, 0.8, 3.4, 0.8, boneD);
    kitFootwear(K, leg, 'boot', pal.boot ?? { upper: 0xa08a5a, sole: 0x3a3026, lace: 0x5a4a30 });
  }
  // helmet: olive dome with a rim, ear pads, a goggles band and a strap
  const Hd = rig.head;
  if (helmet) {
    K.box(Hd, 0, 8.5 * hk, 0, 9.6 * hk, 3, 9.6 * hk, olive); K.box(Hd, 0, 10.2 * hk, -0.2, 8 * hk, 1.4, 8 * hk, olive);
    K.box(Hd, 0, 7.1 * hk, 0.3, 10.6 * hk, 1, 10.8 * hk, oliveD);
    K.clumps(Hd, [0, 9 * hk, 0], [9.6 * hk, 3, 9.6 * hk], { n: 18, size: [1, 1.6], cols: CAMO, faces: 'tlrfk', out: -0.35 });
    for (const sx of [-1, 1]) { K.box(Hd, sx * 5 * hk, 4.6 * hk, 0, 1.6, 4, 3.6, oliveD); K.box(Hd, sx * 5.4 * hk, 4.6 * hk, 0, 0.6, 2.8, 2.6, 0x1e2414); }
    K.box(Hd, 0, 8.4 * hk, 5 * hk, 7 * hk, 1.6, 1, 0x1e1a14); for (const sx of [-1, 1]) K.box(Hd, sx * 1.8 * hk, 8.4 * hk, 5.2 * hk + 0.5, 2.6, 1.8, 1.2, 0x5a6a5a);
    K.box(Hd, 0, 0.3 * hk, 2.6, 8.4 * hk, 0.5, 0.5, oliveD);
  }
  // the plate carrier: plates front and back, a row of pouches, shoulder straps
  const T = rig.torso;
  K.box(T, 0, 7.4, 0, 8.8, 7.4, 5.4, oliveD); K.clumps(T, [0, 7.4, 0], [8.8, 7.4, 5.4], { n: 30, size: [1, 1.6], cols: CAMO, faces: 'fklr', out: -0.35 });
  for (const x of [-2.8, 0, 2.8]) { K.box(T, x, 5.2, 3, 2.4, 2.8, 1.2, olive); K.box(T, x, 6.5, 3.2, 2.5, 0.6, 1.2, oliveD); }
  for (const sx of [-1, 1]) K.box(T, sx * 2.8, 11.6, 0, 1.8, 0.8, 5.6, oliveD);
  K.box(T, 0, 1.2, 0, 8.6, 1.2, 4.6, 0x3a3020); K.box(T, 0, 1.2, 2.35, 1.4, 1, 0.3, 0x8a8a7a);
  if (gear) {
    // the rifle, levelled forward from the hip (built along +z: see the hand-axis convention in character.js)
    const gun = group(rig.handR, 0, -1, 2, HOLD_PITCH - Math.PI / 2, 0, 0);
    const metal = 0x2a2a2c, wood = 0x5a3e24;
    K.box(gun, 0, 0, 2, 1.6, 2.2, 13, metal); K.box(gun, 0, -2.6, 1.6, 1.2, 4, 1.6, metal); K.box(gun, 0, -2.4, 4.8, 1.3, 3.6, 1.4, 0x3a3a3c);
    K.box(gun, 0, -0.6, -6.6, 1.6, 2.6, 4.4, wood); K.box(gun, 0, 0.3, 9, 1.8, 1.8, 3.4, wood);
    K.box(gun, 0, 0.4, 12.5, 0.8, 0.8, 5, metal); K.box(gun, 0, 1.6, 2, 1, 0.8, 3, 0x1a1a1c);
    rig.extras.gun = gun;
    rig.extras.muzzle = group(gun, 0, 0.4, 15); markTip(gun, 0, 0.4, 15, 'rifle');
  }
  K.done();
  return rig;
}

// Spartoi (design/concept/vox-spartoi.png): the sown men, skeletons grown
// from dragon's teeth. Old ivory bones with dark sockets inside a bronze
// Corinthian helmet with cheek guards and a tall teal horsehair crest; a
// rust-orange scarf, a tattered desert-tan tunic hanging in rags with teal
// strips and a ragged cloak down the back, crossed leather belts, stepped
// bronze shoulder plates, leather-and-bronze bracers, bronze greaves over
// heavy brown boots; a curved bronze kopis in the right hand and a big round
// bronze hoplite shield with a black dragon on the left arm.
function buildSpartoi() {
  const bone = 0xe6dcc0, boneD = 0xb8ac8c, tan = 0xc8a46a, tanD = 0x9a7a48, tanL = 0xe2c48e, teal = 0x2a8080, tealD = 0x1a5a5e;
  const rust = 0xe06a28, rustD = 0xb04a1c, brz = 0xc08a2c, brzD = 0x80541a, brzL = 0xe8b448, lea = 0x5e3a20, leaD = 0x3a2414;
  const CREST = [0x1a6a72, 0x125660, 0x2a8a8a, 0x0e4450], RAG = [tan, tanD, tanL, tan, teal, tealD], CAPE = [rust, rustD, tan, tanL, rust, teal];
  const mat = skinMat('spartoi', (S) => {
    paintPerson(S, { skin: bone, eye: 0x0a0806, eyeWhite: 0x0a0806, brow: boneD, mouth: false, top: tan, sleeve: bone, shortSleeve: true, hand: bone, pants: tanD, shoes: lea,
      face: skullFace(boneD),
      body: (s) => { for (const [x0, y0, w, h] of [[16, 16, 24, 16], [16, 32, 24, 16]]) for (let i = 0; i < w * h / 5; i++) s.rect(x0 + s.r() * w, y0 + s.r() * h, 1, 1.5, RAG[Math.floor(s.r() * RAG.length)], 0); } });
    S.shadeLimbs(); S.saturate(1.15);
  }, { emit: 0.8, res: 2 });
  const rig = new Rig({ material: mat, scale: 1.0, armW: 3 });
  const K = kit(rig, mat, { seed: 83, rough: 0.7, metal: 0.05 });
  const T = rig.torso, Hd = rig.head;
  // arms: stepped bronze shoulder plates, bare bones, a knobby elbow, a
  // leather bracer with bronze bands, bony hands
  for (const arm of [rig.armR, rig.armL]) {
    dropMeshes(rig, arm);
    K.box(arm, 0, 0.9, 0, 4.6, 2, 5, brz); K.box(arm, 0, -0.6, 0, 4.9, 1.3, 5.2, brzD); K.box(arm, 0, -1.7, 0, 4.4, 1.1, 4.6, brz);
    K.box(arm, 0, 1.9, 0, 3.6, 0.5, 4.2, brzL);
    K.box(arm, 0, -4.2, 0, 1.5, 4, 1.5, bone); K.box(arm, 0, -6.4, 0, 2.2, 1.6, 2.2, boneD);
    K.box(arm, 0, -8.6, 0, 2.7, 3.2, 2.7, lea); for (const y of [-7.3, -9.9]) K.box(arm, 0, y, 0, 2.9, 0.6, 2.9, brzL);
    K.box(arm, 0, -10.6, 0, 2.2, 1.6, 2.2, bone); for (const dz of [-0.7, 0, 0.7]) K.box(arm, 0, -11.8, dz, 0.5, 1.2, 0.5, boneD);
  }
  // legs: bone thighs under the rags, knee knobs, bronze greaves, big boots
  for (const leg of [rig.legR, rig.legL]) {
    dropMeshes(rig, leg);
    K.box(leg, 0, -2, 0, 3.4, 3.6, 3.4, tanD);
    K.box(leg, -0.4, -4.8, 0, 1.3, 3.4, 1.3, bone); K.box(leg, 0.5, -4.8, 0, 0.9, 3.4, 0.9, boneD);
    K.box(leg, 0, -6.6, 0.3, 2.4, 1.6, 2.4, boneD);
    K.box(leg, 0, -8.4, 0.3, 3.4, 2.8, 3.2, brz); K.box(leg, 0, -8.4, 1.95, 1.2, 2.6, 0.3, brzL); K.box(leg, 0, -7, 0.3, 3.6, 0.6, 3.4, brzD);
    K.box(leg, 0, -10.6, 0.5, 4.4, 2.4, 5, lea); K.box(leg, 0, -9.5, 0.3, 4.6, 0.8, 4.4, leaD);
    K.box(leg, 0, -11.7, 0.8, 4.8, 0.7, 6, leaD); K.box(leg, 0, -10.8, 3, 3.6, 1.6, 0.6, lea);
  }
  // the tunic: rags over the ribs, hanging in a ragged skirt; crossed belts
  K.box(T, 0, 6.6, 0, 8.4, 8.4, 4.6, tan);
  K.clumps(T, [0, 6.6, 0], [8.4, 8.4, 4.6], { n: 34, size: [1, 1.7], cols: RAG, faces: 'fklr', out: -0.3 });
  for (const y of [8.4, 6.8]) for (const sx of [-1, 1]) K.box(T, sx * 2.4, y, 2.45, 2.6, 0.7, 0.4, bone);    // ribs showing through the rags
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, x = Math.sin(a) * 4.4, z = Math.cos(a) * 2.6, L = 4 + K.r() * 4.5;
    K.flare(rig.hips, x, -L / 2 + 0.8, z, 1.9, L, 0.6, RAG[i % RAG.length], a, 0.1);
  }
  K.box(T, 0, 1.5, 0, 9, 1.6, 5, lea); K.box(T, 0, 1.5, 2.6, 2, 1.6, 0.4, brzL); K.box(T, 0, 1.5, 2.8, 0.8, 0.6, 0.2, leaD);
  K.box(T, 0, 6.5, 2.55, 1.2, 12, 0.5, lea, 0, 0, 0.62); K.box(T, 0, 6.5, -2.55, 1.2, 12, 0.5, lea, 0, 0, -0.62);
  K.box(T, -1.2, 7.8, 2.85, 1, 1, 0.3, brzL);
  // the scarf: wound round the neck and draped over the chest and shoulders
  K.box(T, 0, 11.8, 0, 9.2, 1.8, 5.6, rust);
  for (const [y, w] of [[10.6, 8.4], [9.4, 6.6], [8.2, 4.8], [7.1, 3]]) K.box(T, 0.4, y, 2.75, w, 1.3, 0.7, y > 9 ? rust : rustD);
  K.clumps(T, [0, 11.6, 0], [9.2, 1.6, 5.6], { n: 14, size: [0.9, 1.4], cols: [rust, rustD, 0xf08a40], faces: 'tlrfk' });
  for (let i = 0; i < 3; i++) K.box(T, -4.4 + i * 0.4, 9.4 - i * 1.4, 2.2 - i * 0.3, 1.2, 2.6, 1, i % 2 ? rustD : rust, 0, 0, 0.2);
  // a ragged cloak down the back, rust and tan with a teal strip
  for (let x = -4.2; x <= 4.3; x += 1.2) { const L = 9 + K.r() * 7; K.box(T, x, 12 - L / 2, -2.75 - K.r() * 0.3, 1.3, L, 0.6, K.tone(CAPE, 0.1)); }
  // helmet: a bronze Corinthian helmet with a brow band, cheek guards and a
  // nose guard round a T-shaped opening, and a tall horsehair crest
  const hk = HS, H8 = 8 * hk;
  K.box(Hd, 0, H8 + 1.1, -0.2, H8 - 2.4, 1, H8 - 2.4, brzL);
  K.box(Hd, 0, H8 + 0.3, -0.2, H8 - 0.4, 1, H8 - 0.4, brz);
  K.box(Hd, 0, H8 - 1, 0, H8 + 1, 1.8, H8 + 1, brzD);
  K.box(Hd, 0, H8 - 1.2, H8 / 2 + 0.5, H8 + 0.6, 1.6, 0.5, brzL);
  K.box(Hd, 0, H8 / 2 - 0.6, -H8 / 2 - 0.35, H8 + 0.4, H8 - 0.2, 0.7, brz);
  K.box(Hd, 0, -0.2, -H8 / 2 - 0.6, H8 - 1, 1, 0.8, brzD, -0.3);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * (H8 / 2 + 0.3), H8 / 2 - 0.6, 0, 0.7, H8 - 0.2, H8 + 0.4, brz);
    K.box(Hd, sx * (H8 / 2 + 0.2), H8 - 0.2, -H8 / 2 + 0.2, 0.7, 1.6, 1.6, brzD);
    K.box(Hd, sx * 3.75, 1.5, H8 / 2 + 0.45, 1.8, 3.6, 0.9, brz); K.box(Hd, sx * 3.9, 0.1, H8 / 2 + 0.6, 1.6, 0.6, 0.6, brzL);
    K.box(Hd, sx * (H8 / 2 + 1.15), 1.4, 2.2, 0.3, 2.4, 3, brzD);
  }
  K.box(Hd, 0, 5.4, H8 / 2 + 0.55, 1.1, 2.6, 0.8, brz);
  K.box(Hd, 0, H8 + 1.8, -0.2, 1.6, 1, H8 + 0.6, brzD);
  for (let z = -5.6; z <= 4.8; z += 1.05) {
    const t = (z + 5.6) / 10.4, h = 3.6 + Math.sin(t * Math.PI) * 2.4 + (K.r() - 0.5) * 0.8;
    K.box(Hd, 0, H8 + 2.2 + h / 2, z, 2 + K.r() * 0.4, h, 1.2, K.tone(CREST, 0.1), -0.25 + t * 0.2);
  }
  for (let i = 0; i < 5; i++) K.box(Hd, (K.r() - 0.5) * 0.8, H8 + 1 - i * 1.6, -H8 / 2 - 1.6 - i * 0.25, 1.8, 2, 1.2, K.tone(CREST, 0.1), 0.2);
  // the kopis: a forward-curved bronze blade, widening toward the tip
  const blade = group(rig.handR, 0, -1, 1, HOLD_PITCH - Math.PI / 2, 0, 0);   // (built along +z: see the hand-axis convention in character.js)
  K.box(blade, 0, 0, -0.4, 1.2, 1.2, 3, leaD); K.box(blade, 0, 0, -1.9, 1.5, 1.5, 0.8, brzL); K.box(blade, 0, 0, 1.4, 1, 2.6, 0.7, brzL);
  for (let i = 0; i < 6; i++) {
    const z = 2.6 + i * 1.5, y = -0.1 * i * i + 0.2 * i, h = 1.5 + i * 0.22;
    K.box(blade, 0, y, z, 0.5, h, 1.6, i % 2 ? brz : 0xd09838, 0.08 * i - 0.1);
    K.box(blade, 0, y - h / 2 + 0.2, z, 0.55, 0.4, 1.6, brzL, 0.08 * i - 0.1);
  }
  K.box(blade, 0, -1.6, 11.5, 0.5, 1.6, 1.4, 0xd09838, 0.7); K.box(blade, 0, -2.4, 12.1, 0.45, 1, 0.8, brzL, 0.9);
  markTip(blade, 0, -2.4, 12.6, 'kopis'); rig.extras.blade = blade;
  // the shield: a big round bronze aspis with a raised rim, a mottled
  // bronze and teal face and a black dragon on it
  const sh = group(rig.armL, -0.4, -5.4, 2.8, 0, -0.3, 0), R = 6.6;
  for (let y = -R + 0.5; y < R; y += 1) {
    const hw = Math.sqrt(R * R - y * y);
    K.box(sh, 0, y, 0, hw * 2, 1.05, 1, brzD);
    if (hw > 1.4) K.box(sh, 0, y, 0.45, hw * 2 - 1.8, 1.05, 0.5, K.tone([brz, 0xb07a24, 0xc89434], 0.08));
  }
  for (let y = 1.5; y < R - 0.5; y += 1) { const hw = Math.sqrt(R * R - y * y); K.box(sh, 0, y, 0.55, 0.9, 1.02, 0.5, brzL); for (const sx of [-1, 1]) K.box(sh, sx * (hw - 0.45), y, 0.55, 0.9, 1.02, 0.5, brzL); }
  for (let i = 0; i < 9; i++) { const a = K.r() * Math.PI * 2, r = 1.5 + K.r() * 3.2; K.box(sh, Math.cos(a) * r, Math.sin(a) * r, 0.72, 1 + K.r(), 1 + K.r(), 0.2, K.r() < 0.5 ? teal : tealD); }
  const ink = 0x16100c;
  for (const [x, y, w, h, rz] of [[1.7, -2.1, 1.9, 4.2, 0.5], [0.4, 0.6, 3.2, 1.9, 0.2], [-2, 0.95, 2.2, 1.1, 0.1], [-1.7, -0.45, 2.5, 0.7, -0.35], [-3.1, 0.4, 0.5, 0.9, 0],
    [1.3, 2, 0.7, 2.2, -0.7], [2.2, 1.4, 0.7, 2, -1], [2.9, -0.5, 0.6, 1.6, -1.2], [3.1, -2.2, 0.6, 1.4, -1.3], [2.4, -4.2, 2.2, 1, 0.4]]) K.box(sh, x, y, 0.85, w, h, 0.25, ink, 0, 0, rz);
  K.box(sh, -0.2, 1.1, 0.98, 0.6, 0.5, 0.15, 0xf0b040);
  rig.extras.shield = sh;
  K.done();
  return rig;
}

function buildTelekhine() {
  const hide = 0x4a5a7c, hideD = 0x2c3654, hideL = 0x6a7a9a, sp = 0x3a9a98, cream = 0xe8dcc0, creamD = 0xc8bca0;
  const HIDE = [hide, hideD, hideL, 0x3e4e70, sp, 0x2a7a84];
  const lea = 0x8a4a22, leaD = 0x5a2e14, brass = 0xd8a030, brassD = 0x8a5a14, iron = 0x2a2624, ironL = 0x46403a;
  const mat = skinMat('telekhine', (S) => paintQuad(S, { base: hide, dark: hideD, belly: cream, back: 0x3a4866, eye: 0xffa01a, eyeLow: 0xff5a10, nose: 0x14161c, teeth: 0xf4ecd8, speckles: 70, stripes: null,
    custom: (s) => { for (let i = 0; i < 50; i++) s.px(Math.floor(s.r() * 40), 16 + Math.floor(s.r() * 20), i % 2 ? sp : hideL); s.rect(32, 0, 16, 8, cream, 0.1); } }), { emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: 1.1, bodyL: 10, bodyW: 7, bodyH: 5, legH: 3.5, legW: 2.4, headS: 6, snoutS: 3.8, ears: false, tail: 2, tailLen: 3, tailW: 2.2, tailCurl: 0.1, neckUp: 8.4, headZ: -1.6, gait: 1.3, jawOpen: 0.3 });
  const K = kit(rig, mat, { seed: 89, rough: 0.7, emit: 0.8 });
  const T = rig.torso;
  dropMeshes(rig, T);
  // the body: an upright chest, a sloping middle and a tapering hind end
  K.box(T, 0, 0.8, 3.4, 7.6, 9.4, 5.6, hide, -0.15);
  K.box(T, 0, 1, 6.1, 5, 8.4, 0.8, cream, -0.15);
  K.box(T, 0, 6.2, 2.8, 5.4, 3, 4.4, hide, -0.15); K.box(T, 0, 6, 4.9, 3.6, 2.6, 0.6, cream, -0.15);
  K.box(T, 0, -1.8, -1.4, 7.2, 5.6, 6.2, hide);
  K.box(T, 0, -3.3, -5.6, 5.8, 4.2, 4.6, hideD);
  K.box(T, 0, -4.4, -8.6, 4.2, 2.6, 3, hide);
  K.box(T, 0, -4.6, -1.5, 6.4, 1.4, 12, creamD);
  K.clumps(T, [0, 0.8, 3.2], [7.6, 9, 5], { n: 34, size: [0.8, 1.4], cols: HIDE, faces: 'lrk', out: -0.25 });
  K.clumps(T, [0, -1.8, -1.4], [7.2, 5.6, 6.2], { n: 30, size: [0.8, 1.4], cols: HIDE, faces: 'tlr', out: -0.25 });
  K.clumps(T, [0, -3.3, -5.6], [5.8, 4.2, 4.6], { n: 18, size: [0.8, 1.3], cols: HIDE, faces: 'tlr', out: -0.25 });
  // tail and hind flippers: a fan of two flukes splayed on the ground
  const t0 = rig.tail[0].parent; t0.position.set(0, -4.6 * PX, -9.8 * PX);
  for (const sx of [-1, 1]) {
    K.box(rig.tailTip, sx * 1.8, -0.2, -2.8, 2.4, 0.8, 5.2, hideD, 0, sx * 0.55, 0);
    K.box(rig.tailTip, sx * 3, -0.2, -4.6, 2, 0.85, 1.4, hide, 0, sx * 0.55, 0);
  }
  // front flippers: a short arm, then a wide flat flipper splayed outward
  for (const [i, leg] of rig.legs.entries()) {
    if (i > 1) { leg.visible = false; continue; }
    dropMeshes(rig, leg);
    const sx = leg.userData.side;
    K.box(leg, 0, -1.6, 0.4, 2.8, 3.8, 3, hide); K.box(leg, 0, -1.4, 1.95, 2, 3, 0.3, creamD);
    K.box(leg, sx * 1.4, -3.4, 1.6, 3.6, 0.8, 5.6, hideD, 0, sx * 0.55, 0);
    for (let k = 0; k < 4; k++) K.boxY(leg, [sx * 1.4, -3.4, 1.6], sx * 0.55, -1.35 + k * 0.9, 0, 3.1, 0.7, 0.85, 0.9, k % 2 ? hide : 0x384868);
  }
  // head: brow, glowing eyes, a blunt cream muzzle with a broad nose and fangs, small ears
  const Hd = rig.head, hs = rig.dims.hs, hz = hs * 0.35, front = hz + hs / 2, sn = 3.8, sy = -hs * 0.18, sz = hs * 0.85 + sn * 0.5;
  K.clumps(Hd, [0, 0, hz], [hs, hs, hs], { n: 26, size: [0.8, 1.3], cols: HIDE, faces: 'tlrk', out: -0.25 });
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * hs * 0.24, hs * 0.28, front + 0.3, hs * 0.4, 1, 0.8, hideD, 0, 0, sx * 0.25);
    K.box(Hd, sx * hs * 0.24, hs * 0.08, front + 0.1, 1.6, 1.2, 0.3, 0xff7a10); K.box(Hd, sx * hs * 0.2, hs * 0.08, front + 0.2, 0.7, 0.7, 0.3, 0xffd040);
    K.box(Hd, sx * hs * 0.36, hs * 0.5, -0.2, 1.6, 1.4, 1.2, hideD);
  }
  K.box(Hd, 0, sy - 0.1, sz - 0.2, sn + 1.4, sn * 0.8, sn + 0.4, 0xb8bccc);
  K.box(Hd, 0, sy - sn * 0.3, sz, sn + 1.5, sn * 0.35, sn + 0.5, cream);
  for (const sx of [-1, 1]) K.box(Hd, sx * hs * 0.42, -hs * 0.22, hz + 1.2, 1.2, hs * 0.5, hs * 0.5, hideL);
  K.box(Hd, 0, sy + sn * 0.45, sz + sn / 2 - 0.1, sn * 0.8, 1.2, 1.1, 0x101218);
  K.box(Hd, 0, sy + sn * 0.45, sz - 1, sn * 0.5, 0.8, sn * 0.9, hideL);
  for (const sx of [-1, 1]) {
    for (const [dy, dz] of [[0, 0], [-0.7, 0.6], [0.2, 1]]) K.box(Hd, sx * (sn / 2 + 0.75), sy + dy, sz + dz, 0.2, 0.35, 0.35, 0x3a3a44);
    K.box(Hd, sx * (sn / 2 - 0.1), sy - sn * 0.4 - 0.6, sz + sn / 2 - 0.4, 0.7, 1.4, 0.6, 0xf4ecd8);
    K.box(Hd, sx * (sn / 2 - 0.3), sy - sn * 0.4 - 0.3, sz + sn / 2 - 1.5, 0.5, 0.9, 0.5, 0xf4ecd8);
  }
  K.box(Hd, 0, sy - sn * 0.4, sz - 0.2, sn * 0.9, 0.4, sn * 0.8, 0xa82a2a);
  const M = rig.mouth;
  K.box(M, 0, -0.5, sn * 0.5, sn + 0.8, 1.2, sn, creamD);
  for (const sx of [-1, 1]) K.box(M, sx * (sn * 0.4), 0.6, sn - 0.3, 0.55, 1.1, 0.55, 0xf4ecd8);
  K.box(M, 0, 0.15, sn * 0.45, sn * 0.7, 0.3, sn * 0.7, 0xc84040);
  // the smith's apron on the chest, hung from a neck strap with brass buckles
  K.box(T, 0, -0.6, 6.75, 5.8, 6.4, 0.6, lea, -0.15);
  K.clumps(T, [0, -0.6, 6.8], [5.8, 6.4, 0.6], { n: 12, size: [0.8, 1.3], cols: [lea, leaD, 0x9a5a2a], faces: 'f', out: -0.3 });
  for (const sx of [-1, 1]) { K.box(T, sx * 2.5, 2.7, 6.45, 1.6, 1.6, 0.7, brass, -0.15); K.box(T, sx * 2.5, 2.7, 6.85, 0.7, 0.7, 0.3, brassD, -0.15); K.box(T, sx * 2.6, 5, 5.8, 0.9, 4.6, 0.5, leaD, -0.4); }
  // the harness: two bands round the body with brass rings, tools at the side
  for (const z of [0.6, -3.6]) {
    K.box(T, 0, z > 0 ? 2.4 : 1.2, z, 7.4, 0.9, 1.3, leaD);
    for (const sx of [-1, 1]) { K.box(T, sx * 3.75, z > 0 ? -0.6 : -1.6, z, 0.6, 5.8, 1.3, leaD); K.box(T, sx * 3.95, z > 0 ? 1.6 : 0.6, z, 0.5, 1.5, 1.5, brass); K.box(T, sx * 4.1, z > 0 ? 1.6 : 0.6, z, 0.3, 0.7, 0.7, brassD); }
  }
  for (const sx of [-1, 1]) K.box(T, sx * 3.6, 0.6, -1.5, 0.5, 0.9, 5, leaD);
  K.box(T, 4.4, -1.2, -1.6, 0.6, 4, 0.7, 0x6a3a1c); K.box(T, 4.4, 0.8, -1.6, 1.2, 1.6, 2.6, brass);        // hammer
  K.box(T, -4.3, -1, -1.2, 0.5, 4.4, 0.5, 0x9a9aa4, 0, 0, 0.12); K.box(T, -4.3, -1, -2, 0.5, 4.4, 0.5, 0x8a8a94, 0, 0, -0.12);   // tongs
  // the cauldron of Greek fire: iron with a bronze key-pattern band
  const pot = group(T, 0, 1.4, -2.4);
  K.box(pot, 0, 0.5, 0, 4.6, 1, 4.6, iron); K.box(pot, 0, 2, 0, 6.6, 2.2, 6.6, iron); K.box(pot, 0, 3.8, 0, 7.4, 1.6, 7.4, ironL);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; K.boxY(pot, [0, 3.8, 0], a, 0, 0, 3.75, 1.3, 1, 0.2, i % 2 ? brass : brassD); K.boxY(pot, [0, 3.8, 0], a, 0, i % 2 ? 0.3 : -0.3, 3.9, 0.5, 0.4, 0.15, iron); }
  K.box(pot, 0, 4.8, 0, 7.8, 0.6, 7.8, iron);
  for (const sx of [-1, 1]) { K.box(pot, sx * 4.3, 4, 0, 0.6, 1.8, 1.8, brass); K.box(pot, sx * 3.4, 0.5, 0, 0.6, 4, 1.2, leaD); }
  K.box(pot, 0, 4.9, 0, 6.4, 0.4, 6.4, 0xff6a00);
  const fire = group(pot, 0, 5, 0);
  const GF = [0xff5a00, 0xff9a10, 0xffd040, 0x7aff2a, 0x3aff1a];
  for (let i = 0; i < 30; i++) { const t = K.r(), a = K.r() * Math.PI * 2, r = (1 - t) * 2.6; const z = 1.6 - t * 0.9; K.box(fire, Math.cos(a) * r, t * 6, Math.sin(a) * r, z, z * 1.3, z, GF[Math.min(4, Math.floor(t * 3 + K.r() * 2))]); }
  fire.scale.set(1, 0.65, 1);
  rig.extras.pot = pot; rig.extras.fire = fire;
  K.done();
  return rig;
}

// Cyclops (vox-bosses-2, top left): a hulking giant with one huge blue eye
// under a single heavy brow, a curly black mane and a bushy beard, a mouth
// open in a roar, a white wool fleece over the left shoulder belted with gold
// into a ragged knee-length kilt, a ram's skull on that shoulder, leather
// bracers banded in gold, sandals and a studded wooden club.
// Built at the heroes' voxel size (parts.js density): the Rig keeps its
// scale (so the champions' add-ons and the animations still land) but every
// part is sculpted from cells one hero pixel across: rounded muscle masses,
// curls, wool and leather, no stretched skin. Skin boxes are dropped.
// pal: { wool: [fleece tones], iris, ram (false: no ram's skull) } for a champion
export const cycDensity = (rig) => voxDensity(rig) * 0.88 / Math.sqrt(BUILD.k);
export function buildCyclops({ id = 'cyclops', pal = {} } = {}) {
  const SK = [0xcc7a46, 0xc2703e, 0xd6884f], skinD = 0xa05a30, wool = pal.wool ?? [0xece4d0, 0xd8cfb8, 0xf4ecdc, 0xc8bea4];
  const gold = 0xd8a026, goldL = 0xf0c650, goldD = 0x9a6a14, leather = 0x6a4224, leatherD = 0x4a2c16, iris = pal.iris ?? 0x2a6ad0;
  const HAIR = [0x1e140c, 0x2a1c10, 0x140c06, 0x34241a];
  const mat = skinMat(id, (S) => paintPerson(S, { skin: SK[0], hair: HAIR[0], mouth: false, top: SK[0], sleeve: SK[0], hand: SK[0], pants: SK[0], shoes: false }), { emit: 0.6 });
  const rig = new Rig({ material: mat, scale: 2.55, bodyW: 11, bodyD: 6, armW: 5, headS: 9, legH: 10 });
  for (const g of [rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL]) dropMeshes(rig, g);
  rig.handR.position.y = rig.handL.position.y = -11 * PX;
  rig.legR.position.x = -3 * PX; rig.legL.position.x = 3 * PX;
  // (its triangle budget: cells 0.88 of a hero pixel's density, and a champion
  // built bigger, BUILD.k, gains density with the square root of its size,
  // so the cyclops stays near 20k triangles and Gorgos under 25k)
  const K = kit(rig, mat, { seed: 53, density: cycDensity(rig) * (pal.dk ?? 1), ao: 0.22 });   // (pal.dk: a champion's trim to its budget)
  const T = rig.torso, Hd = rig.head, H = rig.hips;
  const skin = () => () => SK[Math.floor(K.r() * 3)];   // (a few flat tones, so runs of cells merge)
  // ---- trunk: a deep barrel chest, heavy pecs, a hard belly, traps rising
  // round a short neck (the head sits low between the shoulders)
  // (pass 3: rounder masses, pw nearer 2, so the chest tapers to the waist as on the sheet)
  blob(K, T, [0, 7.6, 0.2], [5.4, 4.8, 3.3], 1, (x, y, z) => (z > 0.55 && y < -0.05 && y > -0.32 ? skinD : z > 0.7 && Math.abs(x) < 0.08 ? skinD : SK[Math.floor(K.r() * 3)]), { pw: 2.2, run: [2, 5] });
  blob(K, T, [0, 3, 0.4], [4, 3.4, 2.9], 1, (x, y, z) => (z > 0.6 && (Math.abs(x) < 0.07 || Math.abs(y - 0.2) < 0.08) ? skinD : SK[Math.floor(K.r() * 3)]), { pw: 2.2 });
  blob(K, T, [0, 11.2, -0.7], [4.6, 1.9, 2.6], 1, skin(), { pw: 2.2 });
  // the fleece: wool over the left shoulder and chest, falling across the
  // belly to the right hip (the right breast bare), curls standing out
  blob(K, T, [0.3, 6.6, 0.25], [5.7, 5.4, 3.7], 1, () => wool[Math.floor(K.r() * wool.length)], { pw: 2.2, run: [1, 2], keep: (x, y) => x * 0.95 - y * 0.75 > -0.25 });
  blob(K, T, [3.6, 11, -0.4], [3.3, 2.4, 3.3], 1, () => wool[Math.floor(K.r() * wool.length)], { run: [1, 2] });
  K.clumps(T, [2.6, 9.5, 0], [6, 5, 7.6], { n: 9, size: [1, 1.6], cols: wool, faces: 'tfkr', out: 0.3 });
  K.clumps(T, [0, 4.5, 3.7], [8, 5, 1], { n: 4, size: [0.9, 1.4], cols: wool, faces: 'f', out: 0.2, keep: (x, y) => x * 0.95 - (y - 6.6) * 0.75 * 6 / 5.4 > -1.4 });
  // a gold strap over the right shoulder, the belt with its round bosses
  for (let i = 0; i < 7; i++) { const t = i / 6; K.box(T, -3.4 + t * 1.2, 12 - t * 9.6, 3.2 + Math.sin(t * Math.PI) * 0.6, 1.3, 1.7, 0.5, i % 2 ? gold : goldL, 0.15, 0, 0.12); }
  K.box(T, -3.4, 12.1, -0.5, 1.3, 0.6, 7, gold);
  K.box(T, 0, 1.6, 0.4, 9.4, 1.6, 6.8, gold); K.box(T, 0, 1.6, 0.4, 9.6, 0.4, 7, goldD);
  for (const x of [-3.4, 0, 3.4]) { const r = x ? 1.3 : 1.8; K.box(T, x, 1.6, 3.95, r * 2, r * 1.6, 0.5, goldL); K.box(T, x, 1.6, 4.05, r * 1.6, r * 2, 0.5, goldL); K.box(T, x, 1.6, 4.2, r, r, 0.4, goldD); }
  // ---- the kilt: ragged wool strips from the belt to the knee, a gold
  // tongue hanging down the front
  const NS = 34;
  for (let i = 0; i < NS; i++) {
    const a = i / NS * Math.PI * 2, x = Math.sin(a) * 4.9, z = Math.cos(a) * 3.5 + 0.4, L = 5.4 + K.r() * 1.8 - (Math.abs(Math.cos(a)) > 0.8 ? 0 : 0.5);
    K.flare(H, x, 1.6 - L / 2, z, 1.15, L, 0.9, K.tone(wool, 0.1), a, 0.16);
    if (K.r() < 0.5) K.flare(H, x * 1.04, 1.6 - L - 0.3, z * 1.04, 0.6, 0.8, 0.6, K.tone(wool, 0.1), a, 0.16);   // a tattered end
  }
  for (let i = 0; i < 4; i++) K.box(H, 0, 0.6 - i * 1.3, 4.35 + i * 0.2, 1.5, 1.4, 0.4, i % 2 ? gold : goldL, -0.14);
  // ---- head: a big jaw under one huge eye, a heavy brow, a broad nose, a
  // roaring mouth; a curly mane and a beard down onto the chest
  const fz = 4.3;
  blob(K, Hd, [0, 4.4, 0.4], [3.9, 4.5, 3.9], 1, (x, y, z) => (z > 0.6 && y > 0.25 && y < 0.62 && Math.abs(x) > 0.55 ? skinD : SK[Math.floor(K.r() * 3)]), { pw: 2.5 });
  K.box(Hd, 0, 7.9, fz - 0.4, 6.8, 1.3, 1.6, HAIR[0], -0.1); K.box(Hd, 0, 7.4, fz - 0.1, 5.6, 0.6, 1.2, skinD);                 // the single brow
  K.box(Hd, 0, 6.1, fz - 0.15, 4.6, 3.4, 0.8, 0x3a1a0e);                                                                            // socket
  K.box(Hd, 0, 6.1, fz + 0.1, 4, 2.8, 0.6, 0xf4f0e6); K.box(Hd, 0, 6, fz + 0.3, 2.4, 2.4, 0.5, iris);
  K.box(Hd, 0, 6, fz + 0.45, 1.2, 1.4, 0.4, 0x0a0a14); K.box(Hd, -0.6, 6.6, fz + 0.6, 0.5, 0.5, 0.2, 0xffffff);
  K.box(Hd, 0, 4.2, fz + 0.3, 1.7, 2, 1.2, SK[1]); K.box(Hd, 0, 3.5, fz + 0.65, 2.3, 0.8, 0.8, skinD);                              // the nose
  K.box(Hd, 0, 2.1, fz - 0.1, 3.6, 2.1, 1, 0x4a0e0c); K.box(Hd, 0, 1.8, fz - 0.15, 2.2, 1, 0.8, 0xc0303a);                          // the roaring mouth
  for (let x = -1.35; x <= 1.36; x += 0.9) { K.box(Hd, x, 2.95, fz + 0.2, 0.75, 0.6, 0.5, 0xf4f0e0); K.box(Hd, x, 1.2, fz + 0.2, 0.75, 0.45, 0.5, 0xe8e0d0); }
  for (const sx of [-1, 1]) { K.box(Hd, sx * 4, 4.8, 0.4, 0.9, 2.2, 1.6, SK[1]); K.box(Hd, sx * 4.3, 4.6, 0.5, 0.3, 1, 0.8, skinD); }      // ears
  // (pal.hood: a champion's hood covers the crown, so only the mane below it is built)
  blob(K, Hd, [0, 6.2, -0.6], [4.9, 4.7, 4.7], 1, () => HAIR[Math.floor(K.r() * 4)], { run: [1, 2], keep: (x, y, z) => !(z > 0.15 && y < 0.72 && Math.abs(x) < 0.8) && !(pal.hood && y > -0.1) });
  if (!pal.hood) blob(K, Hd, [0, 3.4, 0.6], [4.9, 2.6, 3.4], 1, () => HAIR[Math.floor(K.r() * 4)], { run: [1, 2], keep: (x, y, z) => Math.abs(x) > 0.82 });   // side locks down to the jaw (a hood's flaps cover them)
  if (!pal.hood) K.clumps(Hd, [0, 6.6, -0.6], [9.4, 8.6, 9], { n: 14, size: [1, 1.8], cols: HAIR, faces: 'tklr', out: 0.1 });
  if (!pal.hood) K.clumps(Hd, [0, 9.4, 2], [8.4, 1.6, 4.4], { n: 5, size: [1, 1.6], cols: HAIR, faces: 'tf', out: 0.1 });
  blob(K, Hd, [0, 0.9, 2.3], [4.3, 3.3, 2.5], 1, () => HAIR[Math.floor(K.r() * 4)], { run: [1, 2], keep: (x, y, z) => !(z > 0.3 && y > 0.05 && Math.abs(x) < 0.5) });
  blob(K, Hd, [0, -1.4, 2.8], [3, 2.4, 1.9], 1, () => HAIR[Math.floor(K.r() * 4)], { run: [1, 2] });
  K.clumps(Hd, [0, 0, 3.4], [8, 6, 2], { n: 9, size: [0.9, 1.6], cols: HAIR, faces: 'flrb', out: 0.25, keep: (x, y) => !(y > 1.1 && Math.abs(x) < 2.2) });
  // ---- the ram's skull with curled horns on the left shoulder
  const ram = group(T, 6.6, 12.4, 0.6, 0, -0.35, 0); ram.visible = pal.ram !== false;
  const bone = [0xe8e0c8, 0xd8d0b8, 0xf0ead8];
  blob(K, ram, [0, 0, 0.8], [1.8, 1.7, 2], 1, () => K.tone(bone, 0.06));
  K.box(ram, 0, -0.7, 2.9, 1.8, 1.6, 1.8, bone[1]); K.box(ram, 0, -1.2, 3.7, 1.2, 0.8, 0.5, 0x2a2014);
  for (const sx of [-1, 1]) {
    K.box(ram, sx * 0.75, 0.3, 2.6, 0.8, 0.8, 0.3, 0x1a1410);
    for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 1.7, r = 1.9 - k * 0.07; K.box(ram, sx * (1.7 + Math.sin(a) * 0.25 + k * 0.08), 0.6 + Math.cos(a) * r, 0.2 - Math.sin(a) * r, 1.1 - k * 0.04, 1.1 - k * 0.04, 1.1 - k * 0.04, k % 2 ? 0xb8a888 : 0xc8b898); }
  }
  // ---- arms: a round shoulder, a thick upper arm, a heavier forearm in a
  // gold-banded leather bracer, a big blocky fist
  for (const arm of [rig.armR, rig.armL]) {
    // (pass 3: a round deltoid, a bicep bulging forward over a slimmer arm,
    // a narrow elbow, then the forearm swelling into the bracer: defined, not a column)
    blob(K, arm, [0, 0.5, 0], [3.3, 3.1, 3], 1, skin(), { pw: 2 });
    blob(K, arm, [0, -3.4, 0], [2.1, 3.4, 2.1], 1, skin(), { pw: 2.1 });
    blob(K, arm, [0, -3, 0.8], [1.8, 2.4, 1.6], 1, skin(), { pw: 2 });
    blob(K, arm, [0, -7.8, 0.2], [2.6, 3, 2.5], 1, skin(), { pw: 2.2 });
    K.vox(arm, 0, -8.6, 0.2, 5.6, 2.6, 5.4, [leather, leatherD, 0x7a4c2a], { relief: 0.15 });
    K.box(arm, 0, -7.3, 0.2, 5.8, 0.5, 5.6, gold); K.box(arm, 0, -9.9, 0.2, 5.8, 0.5, 5.6, gold);
    blob(K, arm, [0, -11.5, 0.4], [2.7, 2.2, 2.7], 1, skin(), { pw: 3 });
    for (let i = 0; i < 4; i++) K.box(arm, -1.8 + i * 1.2, -12.4, 2.6, 1.1, 1.3, 1, i % 2 ? SK[1] : SK[2]);   // knuckles
    K.box(arm, (arm === rig.armR ? 1 : -1) * 2.4, -11, 1.4, 1, 2, 1.6, SK[1]);                                   // the thumb
  }
  // ---- legs: thick thighs under the kilt, heavy calves bound with leather,
  // broad feet on strapped sandals
  for (const leg of [rig.legR, rig.legL]) {
    blob(K, leg, [0, -2.6, 0], [2.8, 3.4, 2.8], 1, skin(), { pw: 2.2 });
    blob(K, leg, [0, -6.6, -0.2], [2.4, 3, 2.5], 1, skin(), { pw: 2.2 });
    for (const y of [-5.6, -7.6]) K.vox(leg, 0, y, -0.2, 5.4, 1, 5.6, [leather, leatherD], {});
    // (the foot stops a hair above the leg's end and short of a long toe: a long foot's tip dipped through the floor as the leg swung in the run)
    blob(K, leg, [0, -9, 0.6], [2.5, 0.85, 3.1], 1, skin(), { pw: 3 });
    K.box(leg, 0, -9.6, 0.6, 5.4, 0.5, 6.4, leatherD);
    for (let i = 0; i < 4; i++) K.box(leg, -1.65 + i * 1.1, -9.15, 3.6, 1, 0.9, 0.9, i % 2 ? SK[1] : SK[2]);         // toes
    for (const z of [-1, 1.6]) K.box(leg, 0, -8.7, z, 5.4, 0.5, 0.6, leather);
    K.box(leg, 0, -8.8, 0.3, 0.6, 1.6, 5.4, leather);
  }
  // ---- the club: a knotted log thickening to a studded head
  const club = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);   // (along +y, angled forward at the foe: see the hand-axis convention in character.js)
  const WOOD = [0x5a3418, 0x6a3e1e, 0x7a4a24, 0x4a2a12];
  blob(K, club, [0, 5, 0], [1.3, 7, 1.3], 1, () => K.tone(WOOD, 0.1), { pw: 2.6 });
  blob(K, club, [0, 15.6, 0], [2.6, 5.4, 2.6], 1, () => K.tone(WOOD, 0.1), { pw: 2.4 });
  for (const [x, y, z] of [[1.6, 9, 0.6], [-1.5, 6.6, -0.4], [0.2, 11.6, 1.6]]) K.box(club, x, y, z, 1, 1.4, 1, WOOD[3]);   // knots
  for (const [x, y, z] of [[2.6, 15, 0], [-2.6, 17.5, 0], [0, 16.5, 2.6], [0, 14, -2.6], [2.2, 19, 0.8], [-1.4, 13.5, 2.3], [0.6, 19, -2.2], [-1.9, 15.2, -1.8]]) { K.box(club, x, y, z, 1.3, 1.3, 1.3, 0x8a8a94); K.box(club, x * 1.08, y + 0.3, z * 1.08, 0.6, 0.6, 0.6, 0xb8b8c4); }
  K.vox(club, 0, -1.6, 0, 3, 2.2, 3, [leather, leatherD], {});
  markTip(club, 0, 20.8, 0, 'club'); rig.extras.club = club;
  K.done();
  rig.hunch = 0.3;
  keepAbove(rig, club, { reset: true });   // (a slam that ends low strikes the floor with the club instead of driving it through)
  return rig;
}

// Living statue: a hoplite Medusa turned to stone and woken again: crested
// Corinthian helmet, cuirass, a pleated kilt, greaves, a round shield with a
// gorgon face, a raised spear arm, chips, cracks and moss, on a broken plinth.
function buildStatue() {
  const ST = [0xa8a49a, 0x9a968c, 0xb8b4aa, 0x8a867c], dark = 0x5a5650, moss = [0x5a7a3a, 0x4a6a2e, 0x6a8a44];
  const mat = skinMat('gorgon_statue', (S) => {
    paintPerson(S, { skin: ST[0], hair: ST[3], fringe: 2, hairSide: 3, eye: 0x6a665e, eyeWhite: 0xb8b4aa, frown: true, lipstick: 0x7a766e, top: ST[1], sleeve: ST[0], hand: ST[0], pants: ST[3], shoes: 0x7a766e, collar: ST[2], shortSleeve: true });
    for (let i = 0; i < 40; i++) { let x = S.r() * 64, y = S.r() * 64; for (let k = 0; k < 5; k++) { S.dot(x, y, 0x4a4640); x += S.r() < 0.5 ? 0.5 : 0; y += 0.5; } }
    for (let i = 0; i < 70; i++) S.dot(S.r() * 64, S.r() * 64, moss[i % 3], 2, 1);
    S.shadeLimbs(undefined, 1.1, 0.8);
  }, { emit: 0, rough: 0.95, fill: 0.08, res: 2 });
  const rig = new Rig({ material: mat, scale: 1.05 });
  const K = kit(rig, mat, { seed: 59, rough: 0.95, fill: 0.05 });
  const hk = HS, Hd = rig.head;
  // Corinthian helmet with cheek guards and a tall crest
  K.box(Hd, 0, 6.6 * hk, -0.2, 9.4 * hk, 3.6 * hk, 9.4 * hk, ST[1]);
  for (const sx of [-1, 1]) K.box(Hd, sx * 3.4 * hk, 3.4 * hk, 4.4 * hk, 2 * hk, 4 * hk, 1, ST[1]);
  K.box(Hd, 0, 4.8 * hk, 4.5 * hk, 1.2, 2.6 * hk, 1, ST[2]);
  for (let z = -5; z <= 4; z += 1.1) K.box(Hd, 0, 9.4 * hk + 1.6 - Math.abs(z + 0.5) * 0.25, z * hk, 1.6, 3.4, 1.3, K.tone(ST, 0.06));
  K.clumps(Hd, [0, 9.4 * hk + 2, -0.5 * hk], [1.6, 2, 9 * hk], { n: 6, size: [0.8, 1.2], cols: moss, faces: 'tlr' });
  // cuirass with sculpted chest, a pleated stone kilt and greaves
  const T = rig.torso;
  K.box(T, 0, 7.5, 0, 9, 9, 5, ST[1]); K.box(T, -1.6, 9.2, 2.6, 3, 2.4, 0.5, ST[2]); K.box(T, 1.6, 9.2, 2.6, 3, 2.4, 0.5, ST[2]);
  for (const y of [5, 3.6]) K.box(T, 0, y, 2.6, 5, 0.8, 0.5, ST[3]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, L = 4; K.flare(rig.hips, Math.sin(a) * 4.4, -L / 2 + 0.8, Math.cos(a) * 2.6, 1.9, L, 0.7, ST[i % 2 ? 1 : 3], a, 0.12); }
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 0, -8.2, 0.3, 4.6, 5, 4.6, ST[2]); K.box(leg, 0, -6, 0.3, 4.7, 0.6, 4.7, ST[3]); }
  for (const arm of [rig.armR, rig.armL]) K.box(arm, 0, 1, 0, 4.8, 3, 4.8, ST[1]);
  // chips and moss over everything, and cracks that glow faintly green (Medusa's curse)
  K.clumps(T, [0, 6, 0], [9, 12, 5], { n: 26, size: [0.8, 1.3], cols: [...moss, dark], faces: 'tfklr', out: -0.3 });
  // round shield with a gorgon face, held up on the left arm
  const sh = markHeld(group(rig.handL, 1, -4, 2));
  K.box(sh, 0, 0, 0, 10, 10, 1.2, ST[1]); K.box(sh, 0, 0, 0.3, 11, 7, 1, ST[1]); K.box(sh, 0, 0, 0.3, 7, 11, 1, ST[1]);
  K.box(sh, 0, 0, 0.8, 4, 4.4, 0.6, ST[2]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.box(sh, Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0.9, 1, 1, 0.5, ST[3]); }
  for (const sx of [-1, 1]) K.box(sh, sx * 0.9, 0.6, 1.15, 0.6, 0.6, 0.3, dark);
  K.box(sh, 3.5, -3.5, 0.7, 2.4, 2.4, 0.4, moss[0]);
  // a stone spear in the raised right hand, snapped short
  const sp = group(rig.handR, 0, -1, 0, HOLD_PITCH);
  K.box(sp, 0, 4, 0, 1.2, 18, 1.2, ST[3]); K.box(sp, 0, 14, 0, 2.2, 4, 0.8, ST[2]); K.box(sp, 0, -6, 0, 1.2, 2, 1.2, ST[1]);
  markTip(sp, 0, 16, 0, 'stone spear');
  // a cracked plinth stuck to its feet
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 0, -11.4, 0.5, 5.4, 2, 6.4, ST[3]); K.box(leg, 0.8, -12, 1.8, 3, 1, 3, 0x7a766e); K.clumps(leg, [0, -11.4, 0.5], [5.4, 2, 6.4], { n: 6, size: [0.6, 1], cols: moss, faces: 'tf', out: -0.3 }); }
  K.done();
  rig.statuePose = (r) => { r.armR.rotation.set(-2.3, 0, 0.3); r.handR.rotation.x = 1.5; r.armL.rotation.set(-1.3, 0.5, -0.2); r.head.rotation.set(0.25, 0.5, 0); r.torso.rotation.set(0.12, -0.3, 0); r.legR.rotation.x = 0.3; r.legL.rotation.x = -0.25; };
  rig.statuePose(rig);
  return rig;
}

// Restless spirit: a drowned-pale ghost with long drifting hair, hollow
// glowing eyes and a gaping mouth, in a tattered shroud that thins into wisps
// instead of legs, broken shackles still on its wrists.
function buildGhost() {
  const mat = skinMat('ghost', (S) => {
    paintPerson(S, { skin: 0xa8e0ec, hair: 0x7ab0c4, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x0a1a2a, eyeWhite: 0x0a1a2a, brow: 0x5a8898, mouth: false, top: 0x8ac0d4, sleeve: 0x8ac0d4, hand: 0xc0eef8, skirt: 0x7ab0c4, skirtLen: 12, pants: 0x7ab0c4,
      face: (s, ey) => { s.rect(9, ey - 1, 2, 2, 0x0a1a2a, 0); s.rect(13, ey - 1, 2, 2, 0x0a1a2a, 0); s.dot(9.5, ey - 0.5, 0xffffff); s.dot(13.5, ey - 0.5, 0xffffff); s.rect(11, ey + 2, 2, 2.5, 0x0a1a2a, 0); s.dot(9, ey + 1, 0x6a98a8, 2, 1); s.dot(13, ey + 1, 0x6a98a8, 2, 1); },
      body: (s) => { for (let i = 0; i < 50; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, s.r() < 0.5 ? 0x6aa0b4 : 0xb0e0ec, 1, 2); } });
    S.saturate(1.1);
  }, { emit: 3, fill: 0.7, dissolve: 0.3, res: 2 });
  const rig = new Rig({ material: mat, scale: 1.2, armW: 3 });   // (size audit: ×1.2, a spirit keeps the size it had alive)
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  const K = kit(rig, mat, { seed: 67, fill: 0.6, emit: 0.9 });
  const SH = [0x8ac0d4, 0x6aa0b4, 0xa8d8e8, 0x5a90a8], hk = HS;
  // a ragged hood of shroud over lank hair
  const Hd = rig.head, H8 = 8 * hk;
  K.box(Hd, 0, H8 + 0.5, -0.6, H8 + 1, 1, H8, SH[0]);
  for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 + 0.5), H8 / 2, -0.6, 1, H8 + 1, H8, SH[1]);
  K.box(Hd, 0, H8 / 2, -H8 / 2 - 0.9, H8 + 2, H8 + 1, 1, SH[0]);
  K.clumps(Hd, [0, H8 / 2 + 0.3, -0.6], [H8 + 1.6, H8 + 1, H8 + 0.6], { n: 46, size: [1, 1.8], cols: SH, faces: 'tlrk', out: -0.15 });
  for (let x = -H8 / 2; x <= H8 / 2; x += 1.3) K.box(Hd, x, H8 + 0.1 - (Math.abs(x) > H8 / 3 ? 0.8 : 0), H8 / 2 + 0.4, 1.4, 1.4 + K.r(), 1, K.tone(SH, 0.1));
  for (let i = 0; i < 9; i++) { const L = 2 + K.r() * 4, x = -H8 / 2 - 0.8 + i * (H8 + 1.6) / 8; K.box(Hd, x, -L / 2 - 0.2, -H8 / 2 - 1.1, 1.3, L, 1.2, K.tone(SH, 0.12)); }
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const L = 2 + K.r() * 3; K.box(Hd, sx * (H8 / 2 + 0.7), -L / 2 - 0.2, -3.5 + i * 2, 1.2, L, 1.3, K.tone(SH, 0.12)); }
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) K.box(Hd, sx * (H8 / 2 - 0.6 - i * 0.9), H8 / 2 - 1 - i * 0.4, H8 / 2 + 0.3, 0.9, H8 * 0.7 - i, 0.6, 0x6a98ac);
  // hollow eyes glow
  for (const sx of [-1, 1]) K.box(Hd, sx * 2 * hk, 4.4 * hk, 4 * hk + 0.15, 1.4, 1.2, 0.3, 0xd0ffff);
  // shroud: a ragged cowl on the shoulders and torn sleeves
  K.clumps(rig.torso, [0, 11, 0], [9, 2, 5], { n: 22, size: [1, 1.8], cols: SH, faces: 'tlrfk' });
  for (const arm of [rig.armR, rig.armL]) {
    for (let i = 0; i < 6; i++) { const L = 2 + K.r() * 3.5, a = i / 6 * Math.PI * 2; K.box(arm, Math.sin(a) * 2, -6 - L / 2, Math.cos(a) * 2, 1.2, L, 1.2, K.tone(SH, 0.1)); }
    K.box(arm, 0, -8.4, 0, 3.8, 1.4, 4.8, 0x3a4a54); K.box(arm, 0, -9.6, 2.2, 0.8, 1.6, 0.8, 0x2a3a44); K.box(arm, 0, -10.8, 2.4, 0.8, 1, 0.8, 0x3a4a54);
  }
  // trailing wisps instead of legs: five swaying tails of shroud that thin out
  for (let i = 0; i < 5; i++) {
    const g = group(rig.hips, -3.2 + i * 1.6, 0.5, (i % 2) * -1);
    for (let k = 0; k < 5; k++) { const w = 2.6 - k * 0.4, y = -1.5 - k * 2.2 - (i % 2); K.box(g, (K.r() - 0.5) * 0.6, y, 0, w, 2.4, w, K.tone(SH, 0.12)); }
    K.box(g, 0, -12.5 - (i % 2), 0, 0.8, 1.2, 0.8, 0xb0f0ff);
    sway(rig, g, 'x', 0.35, 3, i);
  }
  K.done();
  rig.float = 1.3; rig.hunch = 0.2;
  return rig;
}

// Greek-fire automaton: a squat six-legged bronze walker in riveted plates
// gone green with verdigris (after the bronze Talos of vox-bosses-2), one
// glowing green eye in a crested head, pincers, and on its back a black-
// figure amphora of Greek fire with green flames licking out of the neck.
function buildAutomaton() {
  const B = [0xa05a0c, 0x884a08, 0xbc7014], BD = [0x3a2008, 0x2a1606], VG = [0x2a8a6a, 0x1a6a50, 0x4aa880];
  const mat = skinMat('automaton', (S) => {
    paintQuad(S, { base: 0x985208, dark: 0x3a2008, belly: 0x2a1606, eye: 0x8aff5a, eyes: [[9, 11], [13, 11]], plates: 0xe0a030, teeth: false, nose: 0x3a2a10, noise: 0.22,
      custom: (s) => { for (let i = 0; i < 40; i++) s.dot(s.r() * 56, s.r() * 40, VG[i % 3], 2, 2); } });
    S.saturate(1.2);
  }, { rough: 0.4, emit: 1.2 });
  const rig = new QuadRig({ material: mat, scale: 1.05, bodyL: 10, bodyW: 9, bodyH: 5, legH: 4, legW: 1.8, headS: 5, legs: 6, splay: 0.7, snout: false, neckUp: -1.5, gait: 1.4 });
  const K = kit(rig, mat, { seed: 73, rough: 0.45, metal: 0.15, emit: 0.8 });
  const T = rig.torso;
  // riveted plates and a skirt of armour round the body, patches of verdigris
  K.box(T, 0, 2.8, 0, 9.6, 1, 10.4, B[2]);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) K.box(T, sx * 4.9, -0.6, -3.6 + i * 2.4, 0.8, 4, 2.2, B[i % 2], 0, 0, sx * 0.15);
  for (const sz of [-1, 1]) K.box(T, 0, -0.6, sz * 5.3, 8.6, 4, 0.8, B[1], -sz * 0.15, 0, 0);
  for (const [x, z] of [[-3.8, 4.4], [3.8, 4.4], [-3.8, -4.4], [3.8, -4.4], [0, 4.4], [0, -4.4], [-3.8, 0], [3.8, 0]]) K.box(T, x, 3.4, z, 0.7, 0.4, 0.7, BD[0]);
  K.clumps(T, [0, 0.5, 0], [9.6, 5, 10.4], { n: 14, size: [0.8, 1.5], cols: VG, faces: 'tlrfk', out: -0.35 });
  // legs: thigh plates and claw feet
  for (const leg of rig.legs) { K.box(leg, 0, -1.2, 0, 2.6, 2.4, 2.6, B[2]); K.box(leg, 0, -4, 0.6, 2.4, 0.8, 3.2, BD[0]); }
  // head: a crested bronze helm with a single green eye and mandible pincers
  const Hd = rig.head, hz = 5 * 0.35;
  K.box(Hd, 0, 2.8, hz, 1, 2.2, 6, B[2]); K.box(Hd, 0, 2.9, hz - 2.6, 1, 2.6, 1.6, 0xb02a10);
  K.box(Hd, 0, 0.3, hz + 2.6, 2.2, 1.6, 0.4, 0x8aff3a); K.box(Hd, 0, 0.3, hz + 2.8, 0.9, 0.7, 0.3, 0xe0ffa0);
  K.box(Hd, 0, 1.4, hz + 2.6, 5.4, 0.8, 0.6, BD[0]);
  for (const sx of [-1, 1]) { K.box(rig.mouth, sx * 1.6, 0, 1.6, 1, 1, 4, B[2], 0, -sx * 0.4, 0); K.box(rig.mouth, sx * 0.9, 0, 3.4, 0.8, 0.8, 1.4, BD[0], 0, sx * 0.6, 0); }
  // the amphora of Greek fire: stepped rings with a black-figure band
  const pot = new THREE.Group(); pot.position.set(0, 3.5 * PX, -1 * PX); rig.torso.add(pot);
  const ter = 0xc8641e, blk = 0x1a1210;
  K.box(pot, 0, 0.6, 0, 4.4, 1.2, 4.4, ter);
  K.box(pot, 0, 2.2, 0, 6.2, 2, 6.2, ter); K.box(pot, 0, 3.9, 0, 6.6, 1.6, 6.6, ter); K.box(pot, 0, 3.9, 0, 6.8, 0.9, 6.8, blk);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.boxY(pot, [0, 3.9, 0], a, 0, 0, 3.42, 0.7, 0.7, 0.2, i % 2 ? ter : 0xe0a040); }
  K.box(pot, 0, 5.4, 0, 6.2, 1.6, 6.2, ter); K.box(pot, 0, 6.5, 0, 4.6, 0.8, 4.6, blk);
  K.box(pot, 0, 7.3, 0, 3, 1.2, 3, ter); K.box(pot, 0, 8.1, 0, 3.8, 0.6, 3.8, blk);
  for (const sx of [-1, 1]) { K.box(pot, sx * 3.6, 6.2, 0, 0.8, 3.4, 0.8, ter); K.box(pot, sx * 2.8, 7.6, 0, 1.8, 0.8, 0.8, ter); }
  K.box(pot, 0, 0, 0, 7, 0.6, 7, B[1]); for (const sx of [-1, 1]) K.box(pot, sx * 3.3, 3, 0, 0.4, 6, 0.8, B[2]);
  const fire = group(pot, 0, 8.2, 0);
  const GF = [0x3aff1a, 0x8aff3a, 0xd8ff8a];
  for (let i = 0; i < 24; i++) { const t = K.r(), a = K.r() * Math.PI * 2, r = (1 - t) * 1.6; const z = 1.4 - t * 0.8; K.box(fire, Math.cos(a) * r, t * 5.5, Math.sin(a) * r, z, z * 1.4, z, GF[Math.min(2, Math.floor(t * 2.4 + K.r() * 0.6))]); }
  fire.scale.set(1.02, 0.6, 1.02);
  rig.extras.pot = pot; rig.extras.fire = fire;
  K.done();
  return rig;
}

// Pit scorpion: a low armoured scorpion in dark red-brown chitin, banded
// back plates, eight jointed legs, heavy serrated pincers on jointed arms,
// four glowing eyes and a long segmented tail arcing high over the back to a
// big bulbous stinger with a hooked barb dripping green venom.
// It fights two ways, alternating (MONSTERS.scorpion.moves, enemy.js):
//   pinch  the claws spread wide and open (the tell), then lunge one after
//          the other and snap shut: a one-two at short range;
//   sting  the tail coils back high and trembles (the tell), then whips
//          forward over the body to stab the ground in front, and recoils.
// Idle, the tail sways poised and the claws snap nervously. The rig reads
// the attack from animate()'s action (style 'pinch' or 'sting'; any other
// attack style reads as a pinch), so champion looks built on it, online
// puppets and the workbench all move the same.
// pal: { C: [three chitin tones], CD: dark, CL: light plates, VEN: venom, belly, sting: [bulb, inner, barb] }
export function buildScorpion({ id = 'scorpion', pal = {} } = {}) {
  const C = pal.C ?? [0x4a2214, 0x5a2a16, 0x3a1a0e], CD = pal.CD ?? 0x1a0c06, CL = pal.CL ?? 0x7a3a1c, VEN = pal.VEN ?? 0x7aff1a;
  const ST = pal.sting ?? [C[1], 0x6aa018, CD];
  const mat = skinMat(id, (S) => {
    paintQuad(S, { base: C[0], dark: CD, belly: pal.belly ?? 0x6a3418, back: C[2], eye: 0xff3a1a, eyes: [[9, 12], [13, 12], [11, 10], [12, 10]], plates: CL, teeth: false, nose: CD, noise: 0.15, speckles: 20,
      custom: (s) => { s.box(40, 32, 2, 2, 6, C[1], 0.15); for (let x = 40; x < 56; x += 3) s.rect(x, 32, 1, 8, CD, 0); } });
    S.saturate(1.2);
  }, { rough: 0.35, emit: 1 });
  const TN = 9, TL = 27;   // tail segments and length (skin px)
  const rig = new QuadRig({ material: mat, scale: 1.25, bodyL: 10, bodyW: 7, bodyH: 3.4, legH: 4, legW: 1.4, headS: 4.5, legs: 8, splay: 1.6, footL: 5, snout: false, neckUp: -1.2, gait: 1.5, tail: TN, tailLen: TL, tailW: 2.8, tailCurl: 0.3 });
  const K = kit(rig, mat, { seed: 79, rough: 0.35, metal: 0.1, emit: 0.8 });
  const T = rig.torso, { legW } = rig.dims;
  // A champion built at twice the size and more (the Pit Scorpion, the Red
  // King: parts.js BUILD.k) has its plates and segments drawn as shells of
  // hero-sized cells, so its armour shows grain instead of plain slabs.
  // (cells no finer than half a pixel: the Red King, at 2.4, stays under 25k triangles)
  const fine = BUILD.k > 1.3, cell = 1 / Math.min(2.2, BUILD.k);
  const V = (p, x, y, z, w, h, d, col, rx = 0) => (fine ? K.vox(p, x, y, z, w, h, d, [col], { cell, j: 0.16, relief: 0.08, rx }) : K.box(p, x, y, z, w, h, d, col, rx));
  const VZ = (g, x, y, z, w, h, d, col) => (fine ? K.voxZ(g, x, y, z, w, h, d, [col], { cell, j: 0.16, relief: 0.08 }) : K.boxZ(g, x, y, z, w, h, d, col));
  // banded back plates with a ridge, and side armour
  for (let i = 0; i < 5; i++) { const z = 4 - i * 2.1; V(T, 0, 1.9, z, 7.6 - i * 0.3, 0.8, 2, C[i % 2], -0.08); K.box(T, 0, 2.4, z + 0.3, 1.2, 0.5, 1.4, CL); K.box(T, 0, 1.6, z - 0.9, 7.8 - i * 0.3, 0.4, 0.3, CD); }
  for (const sx of [-1, 1]) V(T, sx * 3.7, 0, 0, 0.6, 2.6, 9.4, C[2]);
  // legs: plated knees and dark pointed feet
  for (const leg of rig.legs) {
    const k = leg.userData.knee; if (!k) continue;
    dropMeshes(rig, leg); dropMeshes(rig, k);
    K.box(leg, 0, -2, 0, legW, 4, legW, C[0]); VZ(k, 0, -2.5, 0, legW * 0.8, 5, legW * 0.8, C[2]);
    V(leg, 0, -2, 0, legW + 0.6, 3, legW + 0.6, C[1]);
    K.boxZ(k, 0, 0, 0, legW * 1.4, 1.6, legW * 1.4, CL); K.boxZ(k, 0, -3, 0, legW, 2, legW, C[0]); K.boxZ(k, 0, -5.2, 0, legW * 0.5, 1.4, legW * 0.5, CD);
  }
  // head: four glowing eyes and small chelicerae
  const Hd = rig.head, fz = 4.5 * 0.35 + 2.25;
  for (const [x, y, s] of [[-1, 0.6, 0.8], [1, 0.6, 0.8], [-1.8, 0, 0.5], [1.8, 0, 0.5]]) K.box(Hd, x, y, fz + 0.1, s, s, 0.3, 0xff3010);
  K.box(Hd, 0, 1.6, 1.6, 4.8, 0.8, 4.6, C[1]);
  for (const sx of [-1, 1]) K.box(rig.mouth, sx * 0.7, 0, 0.8, 0.8, 0.8, 1.6, CL);
  // pincers on jointed arms: a heavy hand and two serrated fingers that open
  // and close (jawA, jawB: groups of their own)
  rig.extras.claws = [];
  for (const sx of [-1, 1]) {
    const arm = group(T, sx * 3, 0, 4.5, 0, sx * 0.5, 0);
    V(arm, 0, 0, 3, 2, 2, 6, C[0]); K.box(arm, 0, 0.9, 3, 1.2, 0.5, 5, CL);
    const fore = group(arm, 0, 0, 6, 0, -sx * 0.9, 0);
    V(fore, 0, 0, 2.5, 1.8, 1.8, 5, C[1]); K.box(fore, 0, 0, 0, 2.4, 2.4, 1.4, CD);
    const pin = group(fore, 0, 0, 5);
    V(pin, 0, 0, 1.8, 3.8, 2.8, 4.4, C[0]); K.box(pin, 0, 1.5, 1.8, 2.6, 0.5, 3.6, CL); K.box(pin, 0, 0, 3.8, 3.2, 2.2, 0.6, CD);
    const jawA = group(pin, -1.1, 0, 4, 0, 0.25, 0), jawB = group(pin, 1.1, 0, 4, 0, -0.25, 0);
    for (const [j, s] of [[jawA, 1], [jawB, -1]]) {
      V(j, 0, 0, 2, 1.3, 1.6, 4.2, CD);
      for (let t = 0; t < 3; t++) K.box(j, s * 0.75, 0, 0.8 + t * 1.2, 0.4, 0.6, 0.5, CL);
      K.boxY(j, [0, 0, 0], s * 0.4, s * 0.2, 0, 4.4, 0.8, 1, 0.8, CD);
    }
    rig.extras.claws.push({ arm, fore, jawA, jawB, side: sx, ph: sx > 0 ? 0 : 2.3 });
  }
  // the tail: thick banded rings tapering to the tip, a dark joint between
  // each and a spike down the outside of the curl (local -y)
  const sl = TL / TN;
  for (const [i, seg] of rig.tail.entries()) {
    const w = 2.9 * (1 - i * 0.055); dropMeshes(rig, seg);
    K.box(seg, 0, 0, -sl / 2, w, w, sl + 0.1, C[2]); V(seg, 0, 0, -sl / 2, w + 0.5, w + 0.4, sl * 0.7, C[i % 2]);
    K.box(seg, 0, -w / 2 - 0.4, -sl / 2, 0.6, 0.8, 0.6, CL); K.box(seg, 0, 0, -0.1, w + 0.2, w + 0.2, 0.3, CD);
  }
  // the stinger: a big bulb, then a barb hooking in under the curl (+y),
  // a bead of venom at its point
  const sting = group(rig.tailTip, 0, 0, -sl, 0.4);
  V(sting, 0, 0.3, -2.6, 4.2, 4.2, 4.4, ST[0]); V(sting, 0, 0.3, -2.6, 5, 3, 3.4, ST[0]); V(sting, 0, 0.3, -2.6, 3, 5, 3.4, ST[0]);
  K.box(sting, 0, 0.3, -2.6, 3.4, 3.4, 5.2, ST[1]); K.box(sting, 0, 0, -0.2, 3, 3, 0.6, CD); K.box(sting, 0, -2.1, -2.8, 0.8, 1, 2.4, CL);
  K.box(sting, 0, 1.4, -5.4, 2.4, 2.4, 2, ST[2], -0.5); K.box(sting, 0, 2.6, -6.6, 1.7, 1.7, 2, ST[2], -0.9); K.box(sting, 0, 4, -7.3, 1.1, 1.1, 1.9, ST[2], -1.3); K.box(sting, 0, 5.2, -7.5, 0.6, 0.6, 1.2, ST[2], -1.6);
  const venom = group(sting, 0, 5.9, -7.5);
  K.box(venom, 0, 0, 0, 0.7, 0.9, 0.7, VEN);
  rig.extras.sting = sting; rig.extras.venom = venom;
  K.done();
  rig.extras.s0 = rig.baseScale;
  // QuadRig.animate poses everything else (body, legs, head); the tail is
  // hidden from it for the call so only scorpionPose moves it
  const base = rig.animate.bind(rig), noTail = [], act = { type: 'attack', t: 0, style: 'bite', windup: 0.3, strike: 0.5 }, prm = { dt: 0, speed: 0, vel: null, action: null };
  rig.animate = (p) => {
    const a = p.action, atk = a?.type === 'attack' ? (a.style === 'sting' ? 'sting' : 'pinch') : null;
    const tail = rig.tail; rig.tail = noTail;
    if (atk) { act.t = a.t; act.windup = a.windup ?? 0.3; act.strike = a.strike ?? 0.5; prm.dt = p.dt; prm.speed = p.speed; prm.vel = p.vel; prm.action = act; base(prm); }
    else base(p);
    rig.tail = tail;
    scorpionPose(rig, p.dt, p.speed ?? 0, a, atk);
  };
  return rig;
}
// ---- the scorpion's tail and claws, posed from the attack's progress ----------
// Tail poses: [root pitch, curl at the first joint, curl at the last joint,
// stinger bend] (radians; the curl lifts each segment toward the back).
const SC_IDLE = [0.95, 0.14, 0.42, 0.4], SC_COCK = [0.75, -0.02, 0.45, 0.95], SC_STRIKE = [2.4, 0.04, 0.27, 0.15], SC_RECOIL = [0.75, 0.16, 0.5, 0.6], SC_DROOP = [0.15, 0.06, 0.12, 0.2];
const scTail = [0, 0, 0, 0], scK = (v) => (v < 0 ? 0 : v > 1 ? 1 : v), scOut = (v) => 1 - (1 - v) ** 3, scIn = (v) => v * v * v;
function scBlend(A, B, k) { for (let i = 0; i < 4; i++) scTail[i] = A[i] + (B[i] - A[i]) * k; return scTail; }
// claw poses: [arm yaw (outward), arm pitch (- raises), elbow (outward), fingers open]
const CL_IDLE = [0.5, 0, 0.9, 0.08], CL_SPREAD = [1.05, -0.4, 1.35, 0.8], CL_LUNGE = [0.1, 0.12, 0.2, -0.05], CL_BRACE = [0.75, 0.15, 1.1, 0.35];
const scClaw = [0, 0, 0, 0];
function clawBlend(A, B, k) { for (let i = 0; i < 4; i++) scClaw[i] = A[i] + (B[i] - A[i]) * k; return scClaw; }
// u runs 0..1 through the windup and 1..2 through the recovery
function scorpionPose(rig, dt, speed, a, atk) {
  const t = rig.t, k = scK(a?.t ?? 0), w = a?.windup ?? 0.3;
  const u = !atk ? 0 : k < w ? scK(k / (w * 0.84)) : 1 + (k - w) / (1 - w);
  const rate = atk ? 46 : 18, f = 1 - Math.exp(-rate * dt);
  const D = (o, ax, v) => { o.rotation[ax] += (v - o.rotation[ax]) * f; };
  // the tail
  let P, shake = 0, lunge = 0;
  if (a?.type === 'death' || a?.type === 'down') P = SC_DROOP;
  else if (atk === 'sting') {
    if (u < 0.72) { P = scBlend(SC_IDLE, SC_COCK, scOut(u / 0.72)); shake = u / 0.72; lunge = -0.08 * scOut(u / 0.72); }
    else if (u < 0.95) { const e = scIn((u - 0.72) / 0.23); P = scBlend(SC_COCK, SC_STRIKE, e); lunge = -0.08 + 0.26 * e; }
    else if (u < 1.3) { P = SC_STRIKE; lunge = 0.18 + Math.sin((u - 0.95) * 18) * 0.02; }
    else if (u < 1.6) { const e = scOut((u - 1.3) / 0.3); P = scBlend(SC_STRIKE, SC_RECOIL, e); lunge = 0.18 * (1 - e); }
    else P = scBlend(SC_RECOIL, SC_IDLE, scOut((u - 1.6) / 0.4));
  } else if (atk === 'pinch') {
    const e = u < 1 ? scOut(u) : 1 - scK((u - 1.4) / 0.6);
    P = scBlend(SC_IDLE, SC_RECOIL, e * 0.5);
  } else P = SC_IDLE;
  const sway = atk === 'sting' ? 0.05 : 1;
  const yaw = (Math.sin(t * 1.3) * 0.12 + Math.sin(t * 0.47) * 0.08) * sway, bob = Math.sin(t * 2.1) * 0.05 * sway - speed * 0.1;
  const tr = shake * shake * Math.sin(t * 47) * 0.05;
  const n = rig.tail.length;
  for (let i = 0; i < n; i++) {
    const g = rig.tail[i];
    D(g, 'x', i === 0 ? P[0] + bob + tr : P[1] + (P[2] - P[1]) * (i - 1) / (n - 2) + tr * 0.5);
    D(g, 'y', yaw * (i === 0 ? 1 : 0.35) + Math.sin(t * 2.6 - i * 0.6) * 0.03 * sway);
  }
  const S = rig.extras.sting; D(S, 'x', P[3]);
  rig.extras.venom.scale.setScalar(1 + (atk === 'sting' && u < 0.95 ? shake * 0.9 : 0) + Math.max(0, Math.sin(t * 1.7)) * 0.25);
  // the claws: each strikes at its own moment (the left at the release,
  // the right a beat later)
  for (const c of rig.extras.claws) {
    let Q;
    if (atk === 'pinch') {
      const L = c.side < 0 ? 0.97 : 1.32;
      if (u < 0.75) Q = clawBlend(CL_IDLE, CL_SPREAD, scOut(u / 0.75));
      else if (u < L - 0.14) { Q = clawBlend(CL_SPREAD, CL_SPREAD, 0); Q[3] += Math.sin(t * 40 + c.ph) * 0.06; Q[0] += Math.sin(t * 31 + c.ph) * 0.03; }
      else if (u < L) { const e = scIn((u - L + 0.14) / 0.14); Q = clawBlend(CL_SPREAD, CL_LUNGE, e); Q[3] = e < 0.7 ? CL_SPREAD[3] : CL_LUNGE[3]; }
      else if (u < L + 0.22) { Q = clawBlend(CL_LUNGE, CL_LUNGE, 0); Q[3] = CL_LUNGE[3] + Math.max(0, Math.sin((u - L) * 60)) * 0.12; }
      else Q = clawBlend(CL_LUNGE, CL_IDLE, scOut(scK((u - L - 0.22) / (2 - L - 0.22))));
      if (u >= L - 0.14 && u < L + 0.3) lunge = Math.max(lunge, 0.12 * Math.sin(scK((u - L + 0.14) / 0.44) * Math.PI));
    } else if (atk === 'sting') {
      const e = u < 1 ? scOut(u) : 1 - scK((u - 1.3) / 0.7);
      Q = clawBlend(CL_IDLE, CL_BRACE, e);
    } else {
      // nervous snapping: now and then a quick open-and-shut
      Q = clawBlend(CL_IDLE, CL_IDLE, 0);
      const s = (t * (0.9 + c.side * 0.13) + c.ph) % 1.7;
      Q[3] = s < 0.16 ? 0.08 + Math.sin(s / 0.16 * Math.PI) * 0.6 : s > 0.5 && s < 0.6 ? 0.08 + Math.sin((s - 0.5) / 0.1 * Math.PI) * 0.35 : 0.08;
      Q[0] += Math.sin(t * 2.4 + c.ph) * 0.12; Q[1] += Math.sin(t * 1.9 + c.ph) * 0.06;
    }
    D(c.arm, 'y', c.side * Q[0]); D(c.arm, 'x', Q[1]); D(c.fore, 'y', -c.side * Q[2]);
    D(c.jawA, 'y', 0.25 - Q[3] * 0.7); D(c.jawB, 'y', -0.25 + Q[3] * 0.7);
  }
  // the body rocks back on the windup and lunges in on the strike
  // (lunge in metres at the plain scorpion's size: a champion's grows with it)
  rig.hips.position.z += (lunge / rig.extras.s0 - rig.hips.position.z) * f;
}

// ---- stat blocks -------------------------------------------------------------
// ai: melee | ranged | tank | teleport | summon | blob | statue
// role (what it does in a fight; world/encounters.js mixes groups by it):
//   rusher (fast melee) | fodder (steady melee) | ranged | caster (homing) |
//   lobber (arcing shots) | exploder | tank | bruiser | trickster | summoner | ambusher
// tier: minor | elite | champion | boss
// aura: 'smoke' | 'fire' | 'greekfire' | 'spark' | 'wisp' | null  (ambient particles)
// projectile (ranged): 'feather' | 'fire' | 'acid' | 'bullet' | 'wisp'
// shots: projectiles a shot (a fan of feathers, a burst of bullets), fired only
//   from monster level MULTI_SHOT_LEVEL on and never in an early chapter
//   (entities/rangedRules.js shotCount); below that, one. Ranged wind-ups and
//   cooldowns are long: one shot every ~4-5 s (rangedRules.js)
// poison: { dps, dur }  a hit leaves the hero poisoned (green numbers)
// regrow: true   falls to bones and gets back up unless hit again while down
// wake: metres   'statue' monsters stand frozen until a hero comes this close
export const MONSTERS = {
  pup: { name: txt('monsters.pup.name'), tier: 'minor', role: 'rusher', hp: 32, speed: 5, dmg: 7, radius: 0.45, height: 1.1, ai: 'melee', range: 1.5, windup: 0.4, cd: 1.1, xp: 3, coins: [1, 3], model: 'pup', pitch: 1.5, voice: 'bark' },
  rat: { name: txt('monsters.rat.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 6.4, dmg: 5, radius: 0.42, height: 0.85, ai: 'melee', range: 1.1, windup: 0.3, cd: 1.1, xp: 2, coins: [0, 2], model: 'rat', pitch: 2.4, voice: 'squeak', knockResist: 0, idle: 'loiter', notice: 4.5, drop: 3.4 },   // idle 'loiter': hangs around trash until a hero is close (entities/ratRules.js)
  serpent: { name: txt('monsters.serpent.name'), tier: 'minor', role: 'fodder', hp: 40, speed: 4.4, dmg: 8, radius: 0.55, height: 1.3, ai: 'melee', range: 1.9, windup: 0.5, cd: 1.3, xp: 4, coins: [1, 3], model: 'serpent', pitch: 0.9, voice: 'hiss', knockResist: 0.2, poison: { dps: 2, dur: 3 } },
  // a real mortal in the Mist (entities/mistPeople.js): always looks like a person, never fights, can't be hurt
  mortal: { name: txt('monsters.mortal.name'), tier: 'minor', role: 'none', hp: 100, speed: 1.4, dmg: 0, radius: 0.38, height: 1.9, ai: 'none', range: 0, windup: 1, cd: 1, xp: 0, coins: [0, 0], model: 'pup', mortal: true },
  spider: { name: txt('monsters.spider.name'), tier: 'minor', role: 'rusher', hp: 20, speed: 5.8, dmg: 5, radius: 0.38, height: 0.8, ai: 'melee', range: 1.3, windup: 0.35, cd: 1, xp: 2, coins: [0, 2], model: 'spider', pitch: 2.2, voice: 'click', aura: 'spark' },
  harpy: { name: txt('monsters.harpy.name'), tier: 'minor', role: 'ranged', hp: 40, speed: 3.8, dmg: 9, radius: 0.4, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.85, cd: 3.4, xp: 5, coins: [2, 4], model: 'harpy', pitch: 1.3, projectile: 'feather', shots: 3, voice: 'screech' },
  stymphalian: { name: txt('monsters.stymphalian.name'), tier: 'minor', role: 'ranged', hp: 34, speed: 4.4, dmg: 8, radius: 0.45, height: 1.7, ai: 'ranged', range: 11, keep: 7, windup: 0.8, cd: 3.4, xp: 4, coins: [1, 4], model: 'stymphalian', pitch: 1.7, projectile: 'feather', shots: 3, voice: 'screech' },
  automaton: { name: txt('monsters.automaton.name'), tier: 'minor', role: 'exploder', hp: 30, speed: 3.9, dmg: 16, radius: 0.55, height: 1.1, ai: 'blob', range: 1.8, windup: 0.9, cd: 0, xp: 4, coins: [1, 4], model: 'automaton', pitch: 1.8, aura: 'greekfire', blast: 0x6aff3a },
  ghost: { name: txt('monsters.ghost.name'), tier: 'minor', role: 'caster', hp: 38, speed: 3.2, dmg: 8, radius: 0.45, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.9, cd: 3.6, xp: 4, coins: [1, 3], model: 'ghost', pitch: 0.9, projectile: 'wisp', voice: 'moan', aura: 'wisp', knockResist: 0.2 },
  fury: { name: txt('monsters.fury.name'), tier: 'elite', role: 'trickster', hp: 95, speed: 3.8, dmg: 13, radius: 0.45, height: 2.1, ai: 'teleport', range: 2.2, windup: 0.45, cd: 1.6, xp: 10, coins: [4, 7], model: 'fury', pitch: 1.1, puff: 0x3a2a24, slashColor: 0xff8a2a, voice: 'screech' },
  dracaena: { name: txt('monsters.dracaena.name'), tier: 'elite', role: 'tank', hp: 190, speed: 2.4, dmg: 18, radius: 0.8, height: 2.6, ai: 'tank', range: 2.6, windup: 0.85, cd: 2.2, xp: 12, coins: [5, 9], model: 'dracaena', armor: 0.25, shield: true, knockResist: 0.75, pitch: 0.8, voice: 'hiss' },
  hellhound: { name: txt('monsters.hellhound.name'), tier: 'elite', role: 'bruiser', hp: 220, speed: 3.6, dmg: 20, radius: 1.6, height: 5, ai: 'melee', range: 3.7, windup: 0.7, cd: 1.8, xp: 14, coins: [6, 10], model: 'hellhound', knockResist: 0.7, superArmor: true, pitch: 0.5, aura: 'smoke', voice: 'bark' },
  empousa: { name: txt('monsters.empousa.name'), tier: 'elite', role: 'summoner', hp: 160, speed: 2.6, dmg: 10, radius: 0.5, height: 2.3, ai: 'summon', range: 9, keep: 8, windup: 1.0, cd: 5, xp: 16, coins: [8, 14], model: 'empousa', knockResist: 0.4, pitch: 1.2, summons: 'pup', aura: 'fire', projectile: 'fire', voice: 'screech' },
  scorpion: { name: txt('monsters.scorpion.name'), tier: 'elite', role: 'bruiser', hp: 140, speed: 3.4, dmg: 12, radius: 0.8, height: 1.3, ai: 'melee', range: 2.2, windup: 0.55, cd: 1.5, xp: 10, coins: [4, 8], model: 'scorpion', armor: 0.2, knockResist: 0.5, pitch: 1.4, voice: 'click', poison: { dps: 4, dur: 4 }, slashColor: 0x9aff3a,
    // alternates a one-two pinch of the claws with a slower, harder sting over its back (only the sting poisons; enemy.js startAttack)
    moves: [{ kind: 'pinch', trigger: 1.9, range: 2, windup: 0.5, recover: 0.55, dmg: 0.6, twin: 0.18 }, { kind: 'sting', trigger: 2.5, at: 1.5, radius: 0.9, windup: 0.85, recover: 0.65, dmg: 1.4 }] },
  skeleton: { name: txt('monsters.skeleton.name'), tier: 'elite', role: 'ranged', hp: 110, speed: 3, dmg: 15, radius: 0.45, height: 2, ai: 'ranged', range: 12, keep: 7, windup: 0.8, cd: 3, xp: 9, coins: [3, 7], model: 'skeleton', pitch: 1.1, projectile: 'bullet', shots: 2, voice: 'rattle', regrow: true },
  // a spartoi: the steady melee fodder of the sown skeleton army (beach, underworld, desert)
  spartoi: { name: txt('monsters.spartoi.name'), tier: 'minor', role: 'fodder', hp: 52, speed: 3.3, dmg: 9, radius: 0.45, height: 2, ai: 'melee', range: 1.8, windup: 0.5, cd: 1.4, xp: 4, coins: [1, 3], model: 'spartoi', pitch: 1.2, voice: 'rattle', knockResist: 0.2 },
  // a telekhine: lobs Greek fire in an arc (a marked spot that burns a moment): keep moving
  telekhine: { name: txt('monsters.telekhine.name'), tier: 'minor', role: 'lobber', hp: 38, speed: 3, dmg: 11, radius: 0.55, height: 1.3, ai: 'ranged', range: 12, keep: 8, windup: 1, cd: 4.4, xp: 5, coins: [1, 4], model: 'telekhine', pitch: 0.9, projectile: 'fire', lob: true, voice: 'bark', aura: 'greekfire' },
  gorgon_statue: { name: txt('monsters.gorgon_statue.name'), tier: 'elite', role: 'ambusher', hp: 150, speed: 2.6, dmg: 16, radius: 0.5, height: 2.1, ai: 'statue', range: 2.2, windup: 0.7, cd: 1.6, xp: 9, coins: [3, 6], model: 'gorgon_statue', armor: 0.35, knockResist: 0.6, pitch: 0.7, voice: 'grind', wake: 5 },
  cyclops: { name: txt('monsters.cyclops.name'), tier: 'champion', role: 'bruiser', hp: 620, speed: 2.3, dmg: 28, radius: 1.2, height: 4.2, ai: 'tank', range: 3.2, windup: 1.0, cd: 2.4, xp: 40, coins: [15, 25], model: 'cyclops', knockResist: 0.9, superArmor: true, pitch: 0.45, voice: 'roar', slamR: 3.6 },
};
// Old Cursed Dungeons kinds still requested by shared code (wave spawner,
// level tables) map onto the Greek bestiary.
export const LEGACY_KINDS = { swarmer: 'pup', imp: 'pup', spitter: 'harpy', blob: 'automaton', tank: 'dracaena', teleporter: 'fury', summoner: 'empousa' };
// the open world's swarm fodder (entities/fodder.js)
Object.assign(MONSTERS, FODDER_MONSTERS);
for (const [old, now] of Object.entries(LEGACY_KINDS)) Object.defineProperty(MONSTERS, old, { value: MONSTERS[now], enumerable: false });
export const MONSTER_IDS = Object.keys(MONSTERS);
export const CURSES = MONSTERS;
export const resolveKind = (kind) => (MONSTERS[kind] ? (LEGACY_KINDS[kind] ?? kind) : 'pup');

// opts.k: build it this much bigger (a champion, parts.js withBuild): its skin,
// kit and blobs are made finer to match, so it is not just the kind enlarged.
export function buildMonsterModel(model, { k } = {}) { const id = MODELS[model] ? model : 'pup'; const rig = withBuild({ k, key: `m:${id}` }, () => MODELS[id]()); rig.tick = (dt, e) => { animateExtras(rig, dt, e); rig.onTick?.(dt, e); }; return rig; }
export const buildCurseModel = buildMonsterModel;
// Build one of each model and throw it away, filling the skin and geometry
// caches, so the first spawn of a big kind (the hellhound's first build is
// several hundred ms) happens at a load screen instead of mid-fight.
export function prewarmModels(models) { for (const m of models) buildMonsterModel(m); }

// Golden dust: how every monster leaves the world.
export function goldDust(g, pos, h = 1.5, { color = 0xffd84a, big = false } = {}) {
  const n = big ? 2 : 1;
  g.particles.burst(pos, { count: 34 * n, color, speed: 3.2 * n, life: 1.0, size: 0.16, drag: 2.5, up: 0.9, gravity: -0.6, sizeEnd: 0.05, shape: 1 });
  g.particles.burst(pos, { count: 18 * n, color: 0xc9963a, additive: false, speed: 2 * n, life: 1.2, size: 0.45 * h, sizeEnd: 1.8, drag: 3, up: 0.5, intensity: 1.2 });
  g.particles.burst(pos, { count: 1, color: 0xfff2a0, speed: 0, life: 0.2, size: 2.4 * h, drag: 0, sizeEnd: 1.4, intensity: 1.4 });
  g.fx.rings.spawn(new THREE.Vector3(pos.x, g.fx.groundY(pos) + 0.06, pos.z), { color, r1: 2 * n, dur: 0.45, thick: 0.2 });
  g.lights.flash(pos, color, 5 * n, 6 * n, 0.3);
}
// Golden puff of Mist when a disguise falls away.
export function mistPuff(g, pos, h = 1.8) {
  const c = new THREE.Vector3(pos.x, pos.y + h * 0.5, pos.z);
  g.particles.burst(c, { count: 30, color: 0xf4ead5, additive: false, speed: 2.6, life: 0.9, size: 0.6, sizeEnd: 2.2, drag: 3, up: 0.6, intensity: 1 });
  g.particles.burst(c, { count: 26, color: 0xffd84a, speed: 4, life: 0.7, size: 0.14, drag: 3, up: 0.8, shape: 1 });
  g.fx.rings.spawn(new THREE.Vector3(pos.x, g.fx.groundY(pos) + 0.06, pos.z), { color: 0xffd84a, r0: 0.3, r1: 2.4, dur: 0.5, thick: 0.25 });
  g.lights.flash(c, 0xffd84a, 6, 7, 0.35);
}

// Elite outline: an inverted-hull shell per mesh with a shared glow material.
const eliteMats = new Map();
export function eliteMaterial(color) {
  if (!eliteMats.has(color)) {
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.8, depthWrite: false });
    m.color = new THREE.Color(color).multiplyScalar(3);
    eliteMats.set(color, m);
  }
  return eliteMats.get(color);
}
export function addEliteShell(rig, color) {
  const mat = eliteMaterial(color);
  for (const m of [...rig.meshes]) {
    const shell = new THREE.Mesh(m.geometry, mat);
    shell.scale.copy(m.scale).multiplyScalar(1.14);
    shell.castShadow = false; shell.userData.shell = true;
    shell.position.copy(m.position); shell.rotation.copy(m.rotation);
    m.parent.add(shell);
  }
}
