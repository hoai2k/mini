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
import { Rig, PX } from './character.js';
import { QuadRig, paintQuad } from './quad.js';
import { paintPerson } from './mortals.js';
import { t as txt } from '../text_config.js';
import { HS, solid, skinMat, prop, group, lavaCracks, fur, sway, rng, bruteLimbs } from './parts.js';
import { heroHair, cellMesh, footwear } from './herovox.js';
import { FODDER_MONSTERS, fodderModels } from './fodder.js';

export { skinMat };

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
function kitGeometry(list) {
  const P = [], N = [], C = [];
  for (const b of list) {
    const c = b.col, hot = Math.max(c.r, c.g, c.b) >= 0.999;
    const rot = b.rx || b.ry || b.rz;
    if (rot) { _q.setFromEuler(_e.set(b.rx, b.ry, b.rz, b.order ?? 'XYZ')); _m4.compose(_p.set(b.x, b.y, b.z), _q, _one); }
    for (const [n, vs, sh] of KFACES) {
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
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
const colCache = new Map();
const toCol = (c) => { if (c instanceof THREE.Color) return c; if (!colCache.has(c)) colCache.set(c, new THREE.Color(c)); return colCache.get(c); };
// Usage: const K = kit(rig, look); K.box(parent, x, y, z, w, h, d, col, rx, ry, rz) ... K.done().
export class VoxKit {
  constructor(rig, look, opts = {}) { this.rig = rig; this.mat = voxMat(look, opts); this.lists = new Map(); this.r = rng(opts.seed ?? 7); }
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
  done() {
    for (const [p, L] of this.lists) {
      const m = new THREE.Mesh(kitGeometry(L), this.mat); m.castShadow = true; m.receiveShadow = true; m.userData.baseMat = this.mat;
      this.rig.meshes.push(m); p.add(m);
    }
    this.lists.clear();
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
export function addWings(rig, { span = 14, chord = 9, mat, tip, kind = 'bat', y = 10, flap = 1, bone = solid(0x2a1a14), cols = null, seed = 3, look = rig.material } = {}) {
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
      for (let x = 0.6; x < inL * 0.85; x += 0.9) { const h = 1.2 + K.r() * chord * 0.45; K.box(root, X(x), -chord * 0.95 - h / 2 + 0.6, 0, 0.8, h, 0.4, K.r() < 0.5 ? C.tip : C.dark); }
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
      }
      // the ragged trailing edge hangs from the lowest finger
      const th = fan[fan.length - 1], L = outL * (1 - (fan.length - 1) * 0.1);
      for (let k = 0; k < 7; k++) { const t = 0.2 + k * 0.12, h = 1.2 + K.r() * 3.4; K.box(hand, side * Math.cos(th) * L * t - side * 0.6, -Math.sin(th) * L * t - h / 2, 0, 0.8, h, 0.35, K.r() < 0.5 ? C.dark : C.tip); }
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
  let parent = new THREE.Group(); parent.position.set(0, -1 * PX, 0); hand.add(parent);
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
  return chain;
}
// Grid-voxel hair (herovox.heroHair) in the look's voxel material, so it
// flashes and dissolves with the body. Keep colours below 0xe8 per channel
// or the brightest cubes glow.
function gridHair(rig, vox, look = rig.material) {
  const hs = ((rig.dims.headS ?? 8) / 8) * HS;
  const { cells, solid: inside } = heroHair(vox);
  const mat = voxMat(look);
  const mesh = cellMesh(cells, PX * hs, mat, inside);
  mesh.userData.baseMat = mat; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.hair = mesh;
  return mesh;
}
export function animateExtras(rig, dt, e) {
  const t = rig.t ?? 0;
  const W = rig.extras.wings;
  if (W) {
    const fast = e?.state === 'windup' || e?.swooping ? 2 : 1;
    const f = Math.sin(t * 9 * fast * (rig.wingFlap ?? 1));
    for (const w of W) { w.root.rotation.z = w.side * (0.25 + f * 0.55); w.elbow.rotation.z = w.side * (0.1 + Math.max(0, f) * 0.5); }
  }
  const C = rig.extras.whip;
  if (C) {
    const crack = e?.state === 'recover' || e?.whipCrack > 0 ? 1 : 0;
    for (let i = 0; i < C.length; i++) { C[i].rotation.x = Math.sin(t * 5 - i * 0.7) * 0.25 + (crack ? -0.35 : 0.12); C[i].rotation.z = Math.sin(t * 3.3 - i * 0.9) * 0.2; }
  }
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
export const HELLHOUND = { scale: 2.3, bodyL: 13, bodyW: 7.5, bodyH: 7.5, legH: 8.5, legW: 3.4, headS: 8.5, ears: true, tail: 4, tailLen: 9, tailW: 2, tailCurl: 0.6, gait: 0.75, neckUp: 2.2, jawOpen: 0.35 };
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
  serpent: () => {
    const rig = new QuadRig({ material: skinMat('serpent', (S) => paintQuad(S, { base: 0x3e7a2e, dark: 0x1e3e18, belly: 0xe0c870, back: 0x2e5a22, stripes: 0xd8b040, eye: 0xffd81a, eyeLow: 0xff8a10, nose: 0x1e3e18, teeth: 0xfff4d8, speckles: 30 })),
      scale: 1.15, bodyL: 9, bodyW: 5, bodyH: 4, legH: 0.4, legW: 1, headS: 5.5, snoutS: 3.2, ears: false, tail: 7, tailLen: 30, tailW: 4.8, tailCurl: 0, neckUp: 4.5, gait: 1 });
    for (const l of rig.legs) l.visible = false;
    const hood = solid(0x2e6a24), gold = solid(0xd8b040, 0.2);
    for (const sx of [-1, 1]) { prop(rig, rig.neck, 0.8, 6.5, 4.5, hood, sx * 3.4, -0.5, -1.2, 0, 0, sx * 0.35); prop(rig, rig.neck, 0.9, 1.2, 2.4, gold, sx * 3.5, 1.4, -0.4, 0, 0, sx * 0.35); }
    for (let i = 0; i < 4; i++) prop(rig, rig.torso, 5.4, 4.4, 0.8, gold, 0, 0, 3.4 - i * 2.4);
    rig.extras.tongue = prop(rig, rig.mouth, 0.5, 0.3, 3.2, solid(0xd8203a, 0.8), 0, 0.2, 2.4);
    return rig;
  },
  automaton: () => buildAutomaton(),
  harpy: () => eagle('harpy', { scale: 1.0 }),
  // Stymphalian bird: the same eagle in bronze feathers, sharp as knives
  stymphalian: () => eagle('stymphalian', { scale: 0.9, metal: true }),
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
export function hound(id, spec, { fur: nFur = 80, cracks = 8, collar = true, pup = false } = {}) {
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
// A harpy as the 3D sheet draws it (vox-enemies, top row): an upright eagle
// in layered golden-brown feathers with a pale scalloped breast, a hooked
// gold beak under a heavy brow, glowing yellow eyes, feathered trousers, gold
// scaly legs with black talons, a fan tail and wide fingered wings raised
// high. metal: bronze feathers sharp as knives (the Stymphalian birds).
// pal: colour overrides (a champion's plumage), any of main, light, dark,
// breast, tip, edge, gold, goldD, talon, eye.
export function eagle(id, { scale = 1, metal = false, pal = null } = {}) {
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
    } }); S.saturate(1.25); }, { rough: 0.4, emit: 1.2 });
  const rig = new QuadRig({ material: mat, scale, bodyL: 8, bodyW: 7, bodyH: 5, legH: 9, legW: 2.3, headS: 6.4, legs: 8, splay: 2.15, footL: 13, kneeOut: 0.5, legY: 2.4, snout: false, neckUp: -1.6, headZ: -0.6, gait: 1.6 });
  const K = kit(rig, mat, { seed: queen ? 31 : 13, rough: 0.5, metal: 0.1, emit: 0.7 });
  const { legW, hs } = rig.dims;
  // legs fan fore and aft: plated upper legs, bolted knuckles, banded shins and dark pointed feet
  for (const leg of rig.legs) {
    const u = leg.userData; leg.rotation.y = -u.side * (0.75 - u.row * 0.5);
    dropMeshes(rig, leg);
    K.box(leg, 0, 0, 0, 3, 3, 3, BRZ_D[0]);
    K.box(leg, 0, -4.5, 0, legW + 0.2, 9, legW + 0.2, BRZ[u.row % 2]);
    K.box(leg, 0, -6, 0, legW + 0.6, 4, legW + 0.6, BRZ[(u.row + 1) % 3]);
    K.box(leg, 0, -4.5, 0, legW + 0.9, 1, legW + 0.9, BRZ_D[1]);
    const k = u.knee; dropMeshes(rig, k);
    K.boxZ(k, 0, 0, 0, 3.4, 3.4, 3.4, BRZ_D[2]);
    K.boxZ(k, 0, -6.5, 0, legW * 0.8, 13, legW * 0.8, BRZ_D[1]);
    for (const sx of [-1, 1]) { K.boxZ(k, sx * 1.8, 0, 0, 0.5, 2.2, 2.2, BRZ_D[0]); K.boxZ(k, sx * 2.1, 0, 0, 0.4, 0.9, 0.9, BRZ_L); }
    K.boxZ(k, 0, -4.2, 0, legW * 0.8 + 0.8, 5, legW * 0.8 + 0.8, BRZ[(u.row + 1) % 3]);
    K.boxZ(k, 0, -6.9, 0, legW * 0.8 + 1, 0.8, legW * 0.8 + 1, BRZ_D[1]);
    K.boxZ(k, 0, -9.4, 0, legW * 0.8 + 0.4, 3.6, legW * 0.8 + 0.4, BRZ_D[0]);
    K.boxZ(k, 0, -12.4, 0, 1.2, 2.2, 1.2, BRZ_D[2]);
  }
  // the abdomen: a big chequered dome of bronze blocks
  const ab = group(rig.torso, 0, 1.6, -8.6);
  const AW = 11, AH = 9, AD = 12, c = 1.83;
  for (let ix = 0; ix < 6; ix++) for (let iy = 0; iy < 5; iy++) for (let iz = 0; iz < 7; iz++) {
    const edge = ix === 0 || ix === 5 || iy === 0 || iy === 4 || iz === 0 || iz === 6; if (!edge) continue;
    const corners = (ix === 0 || ix === 5) + (iy === 4 || iy === 0) + (iz === 0 || iz === 6); if (corners >= 3 || (corners === 2 && iy === 0)) continue;
    const x = -AW / 2 + c / 2 + ix * (AW - c) / 5, y = -AH / 2 + c / 2 + iy * (AH - c) / 4, z = -AD / 2 + c / 2 + iz * (AD - c) / 6;
    const band = iz % 3 === 1, chk = (ix + iy + iz) % 2;
    K.box(ab, x, y, z, c + 0.15, c + 0.15, c + 0.15, band ? BRZ_D[(ix + iy) % 3] : chk ? BRZ[0] : BRZ[(ix + iz) % 2 ? 2 : 1]);
  }
  K.box(ab, 0, 0, 0, AW - 1, AH - 1, AD - 1, BRZ_D[0]);
  // a plated back with rivets and a dark mid-band
  const T = rig.torso;
  K.box(T, 0, 2.9, 0, 7.8, 1, 7.4, BRZ[2]); K.box(T, 0, 3.5, 0, 2.4, 0.4, 7.6, BRZ_D[1]);
  for (const [x, z] of [[-2.8, 2.8], [2.8, 2.8], [-2.8, -2.8], [2.8, -2.8], [-2.8, 0], [2.8, 0]]) K.box(T, x, 3.55, z, 0.8, 0.5, 0.8, BRZ_L);
  for (const sx of [-1, 1]) K.box(T, sx * 3.7, 0, 0, 0.6, 3.4, 7.6, BRZ_D[2]);
  // face: brow plate, two furnace eyes and four small ones, mandibles and cream fangs
  const Hd = rig.head, fz = hs * 0.35 + hs / 2;
  K.box(Hd, 0, hs * 0.42, hs * 0.35, hs + 0.6, 1, hs + 0.4, BRZ[2]);
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
    for (let i = -2; i <= 2; i++) K.box(Hd, i * 1.1, 3.6 + (2 - Math.abs(i)) * 0.6, 1, 0.9, 3 + (2 - Math.abs(i)) * 1.2, 0.9, BRZ_L, -0.3, 0, -i * 0.18);
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
  }, { emit: 1, res: 2 });
  const rig = new Rig({ material: mat, scale, bodyW: 7, armW: 3, legH: 10 });
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  const K = kit(rig, mat, { seed, rough: 0.9 });
  const RAG = [dress, 0x241c20, 0x120e10, 0x2e2428, 0x1e1418];
  // the dress: four swaying panels of ragged strips that flare toward the hem
  const panels = [];
  for (let q = 0; q < 4; q++) {
    const g = group(rig.hips, 0, 0.5, 0); panels.push(g);
    for (let i = 0; i < 10; i++) {
      const a = (q + i / 10) * Math.PI / 2 - Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
      if (Math.abs(a) < 0.25 && i % 2 === 0) continue;                  // the slit up the front
      // an upper strip hanging close to the hips, then a lower one flaring out, then torn ends
      const L1 = 5.5, L2 = 6.5 + K.r() * 3.5, l3 = 1.5 + K.r() * 3.5;
      const x = sa * 3.7, z = ca * 2.5, f2 = 0.22, f3 = 0.4, col = K.tone(RAG, 0.15);
      K.box(g, x, -L1 / 2 + 0.6, z, 1.7, L1, 1, col, -ca * 0.08, 0, sa * 0.08);
      const y2 = -L1 + 0.6, ox2 = sa * (0.4 + L2 * Math.sin(f2) / 2), oz2 = ca * (0.4 + L2 * Math.sin(f2) / 2);
      K.box(g, x + ox2, y2 - L2 * Math.cos(f2) / 2, z + oz2, 1.9, L2, 1, col, -ca * f2, 0, sa * f2);
      const y3 = y2 - L2 * Math.cos(f2), o3 = 0.4 + L2 * Math.sin(f2) + l3 * Math.sin(f3) / 2;
      K.box(g, x + sa * o3, y3 - l3 * Math.cos(f3) / 2, z + ca * o3, 0.7 + K.r() * 0.7, l3, 0.6, K.tone(RAG, 0.1), -ca * f3, 0, sa * f3);
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
  for (let i = 0; i < 8; i++) K.box(T, -3.5 + i, 11.8, (i % 2 ? 2.2 : -2.2), 1.2, 1.6, 0.6, K.tone(RAG, 0.1));
  // arms: gold bracelets, bony knuckles and long dark claws
  for (const arm of [rig.armR, rig.armL]) {
    K.box(arm, 0, -7.3, 0, 3.6, 1.2, 4.6, gold); K.box(arm, 0, -5.9, 0, 3.5, 0.6, 4.5, 0xa87418);
    for (const dz of [-1.2, 0, 1.2]) K.box(arm, 0, -10.6, dz, 0.6, 1.6, 0.6, 0x2a2420);
  }
  gridHair(rig, { style: 'curls', base: hair, shade: 0x8a8a86, light: 0xe8e8e4, seed, shape: { r: [6.9, 7.8, 6.6], bump: 0.5, tuft: 0.28, spike: 0.1, side: -1.5, back: -5 } }, mat);
  K.done();
  const ws = Math.min(1.2, scale + 0.1);
  addWings(rig, { span: 27 * ws, chord: 15, mat: solid(wing, 0, 0.9), tip: solid(0x3a2418, 0, 0.9), kind: 'bat', y: 10.5, bone: solid(0x2a1a10), cols: { dark: 0x24160e }, seed: seed + 5, look: mat });
  addWhip(rig, { segs: 10, len: 3.6, look: mat });
  rig.hunch = 0.35;
  rig.float = 0.8;
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
  const bend = [0.05, 0, 0, 0.05, 0.1, -0.35, -0.6, -0.6], yaw = [0.9, 0.85, 0.85, 0.8, 0.75, 0.4, 0.2, 0.2];
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
  const spear = new THREE.Group(); rig.handR.add(spear); spear.rotation.x = -0.15;
  K.box(spear, 0, 6, 1.5, 1, 44, 1, 0x4a2e1a);
  for (const y of [-10, 18, 24]) K.box(spear, 0, y, 1.5, 1.4, 0.8, 1.4, gold);
  K.box(spear, 0, 27, 1.5, 1.8, 1.2, 1.8, goldD);
  K.box(spear, 0, 29.5, 1.5, 2.6, 4, 0.8, gold); K.box(spear, 0, 32.5, 1.5, 1.8, 2.4, 0.7, gold); K.box(spear, 0, 34.5, 1.5, 0.9, 2, 0.6, 0xf0c040);
  const shield = new THREE.Group(); shield.position.set(1.6 * PX, -5 * PX, 1 * PX); rig.handL.add(shield); shield.rotation.y = Math.PI / 2;
  K.box(shield, 0, 0, 0, 7.6, 7.6, 1, gold); K.box(shield, 0, 0, 0.4, 5.6, 5.6, 0.6, G[0]); K.box(shield, 0, 0, 0.8, 2, 2, 0.8, gold);
  for (const [x, y] of [[-2.8, 0], [2.8, 0], [0, 2.8], [0, -2.8]]) K.box(shield, x, y, 0.6, 0.8, 0.8, 0.6, 0xf0c040);
  rig.extras.shield = shield;
  K.done();
  rig.hunch = 0.15;
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
  const hk = HS, FL = [0xff5000, 0xff7800, 0xffa000, 0xffc840];
  for (let i = 0; i < 90; i++) {
    const t = K.r(), a = K.r() * Math.PI * 2, rad = 4.6 + K.r() * 1.6 - t * 2.8;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad * 0.9 - 0.9;
    if (z > 2.6 && t < 0.3) continue;
    const y = 6.2 + t * 9 + (z < 0 ? 0 : -1), sz = 2.3 - t * 1.4 + K.r() * 0.6;
    K.box(flame, x * hk, y * hk, z * hk, sz, sz * 1.3, sz, FL[Math.min(3, Math.floor(t * 3.3 + K.r() * 0.8))]);
  }
  for (let i = 0; i < 34; i++) K.box(flame, (K.r() - 0.5) * 9, 5 - K.r() * 9, -4.6 - K.r() * 1.2, 1.9, 2.2, 1.6, i % 3 ? FL[Math.floor(K.r() * 3)] : 0xc8301a);
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
    const pp = group(hand, 0, -2.6, 0);
    K.box(pp, 0, 0, 0, 5.4, 5.4, 5.4, orange);
    for (let i = 0; i < 64; i++) {
      const u = K.r() * 2 - 1, th = K.r() * Math.PI * 2, r = Math.sqrt(1 - u * u), R = 3.4 + K.r() * 1.2;
      const z = 1.1 + K.r() * 0.8;
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
  const rig = new Rig({ material: mat, scale: 1.0, armW: 3 });
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
    // rifle held across the body
    const gun = group(rig.handR, 0, -1, 2, -1.45, 0, 0);
    const metal = 0x2a2a2c, wood = 0x5a3e24;
    K.box(gun, 0, 0, 2, 1.6, 2.2, 13, metal); K.box(gun, 0, -2.6, 1.6, 1.2, 4, 1.6, metal); K.box(gun, 0, -2.4, 4.8, 1.3, 3.6, 1.4, 0x3a3a3c);
    K.box(gun, 0, -0.6, -6.6, 1.6, 2.6, 4.4, wood); K.box(gun, 0, 0.3, 9, 1.8, 1.8, 3.4, wood);
    K.box(gun, 0, 0.4, 12.5, 0.8, 0.8, 5, metal); K.box(gun, 0, 1.6, 2, 1, 0.8, 3, 0x1a1a1c);
    rig.extras.gun = gun;
    rig.extras.muzzle = group(gun, 0, 0.4, 15);
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
  const blade = group(rig.handR, 0, -1, 1, -1.2, 0, 0);
  K.box(blade, 0, 0, -0.4, 1.2, 1.2, 3, leaD); K.box(blade, 0, 0, -1.9, 1.5, 1.5, 0.8, brzL); K.box(blade, 0, 0, 1.4, 1, 2.6, 0.7, brzL);
  for (let i = 0; i < 6; i++) {
    const z = 2.6 + i * 1.5, y = -0.1 * i * i + 0.2 * i, h = 1.5 + i * 0.22;
    K.box(blade, 0, y, z, 0.5, h, 1.6, i % 2 ? brz : 0xd09838, 0.08 * i - 0.1);
    K.box(blade, 0, y - h / 2 + 0.2, z, 0.55, 0.4, 1.6, brzL, 0.08 * i - 0.1);
  }
  K.box(blade, 0, -1.6, 11.5, 0.5, 1.6, 1.4, 0xd09838, 0.7); K.box(blade, 0, -2.4, 12.1, 0.45, 1, 0.8, brzL, 0.9);
  rig.extras.blade = blade;
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
// under a single heavy brow, a shaggy black mane and beard, a white wool
// fleece over one shoulder belted with gold into a ragged kilt, a ram's skull
// on the shoulder, leather bracers, sandals and a studded wooden club.
// pal: { wool: [fleece tones], iris, ram (false: no ram's skull) } for a champion
export function buildCyclops({ id = 'cyclops', pal = {} } = {}) {
  const skin = 0xd88e5a, skinD = 0xb06a3a, wool = pal.wool ?? [0xece4d0, 0xd8cfb8, 0xf4ecdc, 0xc8bea4], gold = 0xd8a026, leather = 0x6a4224, iris = pal.iris ?? 0x2a6ad0;
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin, hair: 0x1e140c, fringe: 1, hairSide: 3, hairBack: 7, eye: skin, eyeWhite: skin, brow: 0x1e140c, mouth: false, top: skin, sleeve: skin, hand: skin, pants: skin, skirt: wool[1], skirtLen: 6, shoes: false,
      face: (s, ey) => {
        s.rect(9, ey - 2, 6, 4, 0xf4f0e8, 0); s.rect(10, ey - 1.5, 4, 3, pal.iris ?? 0x2a7ad8, 0); s.rect(11, ey - 1, 2, 2, 0x0a0a1a, 0); s.dot(11, ey - 1, 0xffffff, 1, 1);
        s.rect(8, ey - 3, 8, 1, 0x1e140c, 0); s.dot(8, ey - 2, skinD, 2, 4); s.dot(15, ey - 2, skinD, 2, 4);
        s.rect(10, ey + 3, 4, 1.5, 0x5a1010, 0); for (let x = 10; x < 14; x += 1) s.dot(x + 0.25, ey + 3, 0xf4f0e0, 1, 1);
      },
      body: (s) => {
        // chest and belly shading, a few scars
        s.rect(20, 21, 3.5, 3, skinD, 0.05); s.rect(24.5, 21, 3.5, 3, skinD, 0.05); for (let y = 25; y < 31; y += 2) { s.rect(22, y, 1.5, 1.5, skinD, 0.05); s.rect(24.5, y, 1.5, 1.5, skinD, 0.05); }
        for (let i = 0; i < 4; i++) s.dot(17 + s.r() * 20, 18 + s.r() * 12, 0xa85a3a, 3, 1);
      } });
    S.shadeLimbs(); S.saturate(1.2);
  }, { emit: 0.6, res: 2 });
  const rig = new Rig({ material: mat, scale: 2.3, bodyW: 11, bodyD: 6, armW: 5, headS: 9, legH: 10 });
  const K = kit(rig, mat, { seed: 53 });
  const hs = (9 / 8) * HS;
  // mane and beard (grid voxels), and a huge brow ridge
  bruteLimbs(rig, { armLen: 1.1, armThick: 1.25, legThick: 1.3, legX: 3 });
  gridHair(rig, { style: 'shaggy', base: 0x1a120a, shade: 0x0c0804, light: 0x302014, seed: 23, beard: { length: 3, mouth: 1.2 }, shape: { r: [6, 5.2, 6.2], tuft: 0.18, spike: 0.03 } }, mat);
  // one huge eye under a single heavy brow, a broad nose
  const fz = 4 * hs;
  K.box(rig.head, 0, 5 * hs, fz + 0.15, 4.6, 3.6, 0.4, 0xe8e4dc); K.box(rig.head, 0, 4.9 * hs, fz + 0.3, 2.8, 2.8, 0.3, iris);
  K.box(rig.head, 0, 4.9 * hs, fz + 0.42, 1.4, 1.6, 0.2, 0x08080e); K.box(rig.head, -0.5, 5.3 * hs, fz + 0.5, 0.5, 0.5, 0.1, 0xffffff);
  K.box(rig.head, 0, 6.8 * hs, fz + 0.5, 7 * hs, 1.4, 1.4, 0x1a120a, -0.15);
  K.box(rig.head, 0, 3.3 * hs, fz + 0.6, 1.8, 2, 1.4, skinD);
  // the fleece: a wool sash from the left shoulder across the chest, belted into a kilt
  const T = rig.torso;
  for (let i = 0; i < 9; i++) { const t = i / 8; K.box(T, 4.5 - t * 9, 12 - t * 10, 3.3, 3.2, 3.2, 1.6, K.tone(wool, 0.08), 0, 0, 0.75); K.box(T, 4.5 - t * 9, 12 - t * 10, -3.3, 3.2, 3.2, 1.6, K.tone(wool, 0.08), 0, 0, -0.75); }
  K.clumps(T, [3.4, 11.5, 0], [4.4, 3, 7], { n: 26, size: [1.2, 2], cols: wool, faces: 'tlrfk' });
  K.box(T, 0, 1.4, 0, 12, 2.4, 7, gold); K.box(T, 0, 1.4, 3.6, 3, 3, 0.6, 0xf0c040); K.box(T, 0, 1.4, 3.9, 1.4, 1.4, 0.4, 0x8a5a10);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2, x = Math.sin(a) * 6.2, z = Math.cos(a) * 3.8, L = 5 + K.r() * 3;
    K.flare(rig.hips, x, -L / 2 + 0.6, z, 2.1, L, 0.9, K.tone(wool, 0.1), a, 0.14);
  }
  // a ram's skull with curled horns on the right shoulder
  const ram = group(T, -6, 12.6, 0.5, 0, 0.3, 0); ram.visible = pal.ram !== false;
  K.box(ram, 0, 0, 1, 3, 3, 4, 0xe8e0c8); K.box(ram, 0, -0.6, 3.3, 2, 2, 1.6, 0xd8d0b8);
  for (const sx of [-1, 1]) { K.box(ram, sx * 0.8, 0.4, 3, 0.7, 0.7, 0.3, 0x1a1410); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 1.6; K.box(ram, sx * (1.9 + Math.sin(a) * 0.4), 0.8 + Math.cos(a) * 1.6, 0.6 - Math.sin(a) * 1.6, 1.3, 1.3, 1.3, k % 2 ? 0xb8a888 : 0xc8b898); } }
  // leather bracers and wrist bands, sandals with straps
  for (const arm of [rig.armR, rig.armL]) { K.box(arm, 0, -8.4, 0, 7, 3.6, 5.8, leather); K.box(arm, 0, -6.9, 0, 7.1, 0.5, 5.9, gold); K.box(arm, 0, -9.9, 0, 7.1, 0.5, 5.9, gold); K.box(arm, 0, 1.2, 0, 7, 3.4, 6, skin); }
  for (const sx of [-1, 1]) { K.box(T, sx * 2.7, 9.4, 3.2, 4.8, 3.4, 1, skinD); K.box(T, sx * 5.6, 11, 0, 3, 3, 6.4, skin); }
  K.box(T, 0, 5.5, 3.3, 4, 4, 0.8, skin);
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 0, -9.6, 0.6, 4.6, 0.8, 5.6, leather); for (const y of [-7.5, -8.6]) K.box(leg, 0, y, 0, 4.3, 0.5, 4.3, leather); }
  // the club: a knotted log thickening to a studded head
  const club = group(rig.handR, 0, -1, 1, 0.5, 0, 0);
  K.box(club, 0, 4, 0, 2.6, 12, 2.6, 0x5a3418); K.box(club, 0, 11, 0, 3.4, 4, 3.4, 0x6a3e1e); K.box(club, 0, 16, 0, 4.8, 7, 4.8, 0x7a4a24); K.box(club, 0, 20, 0, 3.8, 1.6, 3.8, 0x6a3e1e);
  for (const [x, y, z] of [[2.6, 15, 0], [-2.6, 17.5, 0], [0, 16.5, 2.6], [0, 14, -2.6], [2.6, 19, 0.8], [-1.4, 13.5, 2.6], [0.6, 19, -2.6]]) K.box(club, x, y, z, 1.4, 1.4, 1.4, 0x8a8a94);
  K.box(club, 0, -2, 0, 3, 1.4, 3, leather);
  rig.extras.club = club;
  K.done();
  rig.hunch = 0.3;
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
  const sh = group(rig.handL, 1, -4, 2);
  K.box(sh, 0, 0, 0, 10, 10, 1.2, ST[1]); K.box(sh, 0, 0, 0.3, 11, 7, 1, ST[1]); K.box(sh, 0, 0, 0.3, 7, 11, 1, ST[1]);
  K.box(sh, 0, 0, 0.8, 4, 4.4, 0.6, ST[2]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.box(sh, Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0.9, 1, 1, 0.5, ST[3]); }
  for (const sx of [-1, 1]) K.box(sh, sx * 0.9, 0.6, 1.15, 0.6, 0.6, 0.3, dark);
  K.box(sh, 3.5, -3.5, 0.7, 2.4, 2.4, 0.4, moss[0]);
  // a stone spear in the raised right hand, snapped short
  const sp = group(rig.handR, 0, -1, 0);
  K.box(sp, 0, 4, 0, 1.2, 18, 1.2, ST[3]); K.box(sp, 0, 14, 0, 2.2, 4, 0.8, ST[2]); K.box(sp, 0, -6, 0, 1.2, 2, 1.2, ST[1]);
  // a cracked plinth stuck to its feet
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 0, -11.4, 0.5, 5.4, 2, 6.4, ST[3]); K.box(leg, 0.8, -12, 1.8, 3, 1, 3, 0x7a766e); K.clumps(leg, [0, -11.4, 0.5], [5.4, 2, 6.4], { n: 6, size: [0.6, 1], cols: moss, faces: 'tf', out: -0.3 }); }
  K.done();
  rig.statuePose = (r) => { r.armR.rotation.set(-2.3, 0, 0.3); r.armL.rotation.set(-1.3, 0.5, -0.2); r.head.rotation.set(0.25, 0.5, 0); r.torso.rotation.set(0.12, -0.3, 0); r.legR.rotation.x = 0.3; r.legL.rotation.x = -0.25; };
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
  const rig = new Rig({ material: mat, scale: 1.0, armW: 3 });
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
// four glowing eyes and a segmented tail curling over the back to a barbed
// stinger dripping green venom.
// pal: { C: [three chitin tones], CD: dark, CL: light plates, VEN: venom, belly, sting: [bulb, inner, barb] }
export function buildScorpion({ id = 'scorpion', pal = {} } = {}) {
  const C = pal.C ?? [0x4a2214, 0x5a2a16, 0x3a1a0e], CD = pal.CD ?? 0x1a0c06, CL = pal.CL ?? 0x7a3a1c, VEN = pal.VEN ?? 0x7aff1a;
  const ST = pal.sting ?? [C[1], 0x6aa018, CD];
  const mat = skinMat(id, (S) => {
    paintQuad(S, { base: C[0], dark: CD, belly: pal.belly ?? 0x6a3418, back: C[2], eye: 0xff3a1a, eyes: [[9, 12], [13, 12], [11, 10], [12, 10]], plates: CL, teeth: false, nose: CD, noise: 0.15, speckles: 20,
      custom: (s) => { s.box(40, 32, 2, 2, 6, C[1], 0.15); for (let x = 40; x < 56; x += 3) s.rect(x, 32, 1, 8, CD, 0); } });
    S.saturate(1.2);
  }, { rough: 0.35, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.1, bodyL: 10, bodyW: 7, bodyH: 3.4, legH: 4, legW: 1.4, headS: 4.5, legs: 8, splay: 1.6, footL: 5, snout: false, neckUp: -1.2, gait: 1.5, tail: 6, tailLen: 15, tailW: 2.4, tailCurl: 0.62 });
  const K = kit(rig, mat, { seed: 79, rough: 0.35, metal: 0.1, emit: 0.8 });
  const T = rig.torso, { legW } = rig.dims;
  // banded back plates with a ridge, and side armour
  for (let i = 0; i < 5; i++) { const z = 4 - i * 2.1; K.box(T, 0, 1.9, z, 7.6 - i * 0.3, 0.8, 2, C[i % 2], -0.08); K.box(T, 0, 2.4, z + 0.3, 1.2, 0.5, 1.4, CL); K.box(T, 0, 1.6, z - 0.9, 7.8 - i * 0.3, 0.4, 0.3, CD); }
  for (const sx of [-1, 1]) K.box(T, sx * 3.7, 0, 0, 0.6, 2.6, 9.4, C[2]);
  // legs: plated knees and dark pointed feet
  for (const leg of rig.legs) {
    const k = leg.userData.knee; if (!k) continue;
    dropMeshes(rig, leg); dropMeshes(rig, k);
    K.box(leg, 0, -2, 0, legW, 4, legW, C[0]); K.boxZ(k, 0, -2.5, 0, legW * 0.8, 5, legW * 0.8, C[2]);
    K.box(leg, 0, -2, 0, legW + 0.6, 3, legW + 0.6, C[1]);
    K.boxZ(k, 0, 0, 0, legW * 1.4, 1.6, legW * 1.4, CL); K.boxZ(k, 0, -3, 0, legW, 2, legW, C[0]); K.boxZ(k, 0, -5.2, 0, legW * 0.5, 1.4, legW * 0.5, CD);
  }
  // head: four glowing eyes and small chelicerae
  const Hd = rig.head, fz = 4.5 * 0.35 + 2.25;
  for (const [x, y, s] of [[-1, 0.6, 0.8], [1, 0.6, 0.8], [-1.8, 0, 0.5], [1.8, 0, 0.5]]) K.box(Hd, x, y, fz + 0.1, s, s, 0.3, 0xff3010);
  K.box(Hd, 0, 1.6, 1.6, 4.8, 0.8, 4.6, C[1]);
  for (const sx of [-1, 1]) K.box(rig.mouth, sx * 0.7, 0, 0.8, 0.8, 0.8, 1.6, CL);
  // pincers on jointed arms: serrated jaws
  rig.extras.claws = [];
  for (const sx of [-1, 1]) {
    const arm = group(T, sx * 3, 0, 4.5, 0, sx * 0.5, 0);
    K.box(arm, 0, 0, 3, 2, 2, 6, C[0]); K.box(arm, 0, 0.9, 3, 1.2, 0.5, 5, CL);
    const fore = group(arm, 0, 0, 6, 0, -sx * 0.9, 0);
    K.box(fore, 0, 0, 2.5, 1.8, 1.8, 5, C[1]); K.box(fore, 0, 0, 0, 2.4, 2.4, 1.4, CD);
    const pin = group(fore, 0, 0, 5);
    K.box(pin, 0, 0, 1.8, 3.8, 2.8, 4.4, C[0]); K.box(pin, 0, 1.5, 1.8, 2.6, 0.5, 3.6, CL);
    const jawA = group(pin, -1.1, 0, 4, 0, 0.25, 0), jawB = group(pin, 1.1, 0, 4, 0, -0.25, 0);
    for (const [j, s] of [[jawA, 1], [jawB, -1]]) { const o = [j.position.x / PX, 0, j.position.z / PX], ry = j.rotation.y; K.boxY(pin, o, ry, 0, 0, 2, 1.3, 1.6, 4.2, CD); for (let t = 0; t < 3; t++) K.boxY(pin, o, ry, s * 0.75, 0, 0.8 + t * 1.2, 0.4, 0.6, 0.5, CL); K.boxY(pin, o, ry + s * 0.4, s * 0.2, 0, 4.4, 0.8, 1, 0.8, CD); }
    rig.extras.claws.push({ arm, jawA, jawB, side: sx });
    sway(rig, arm, 'y', 0.15, 2.4);
  }
  // tail segments: banded rings with a dorsal spike
  for (const [i, seg] of rig.tail.entries()) { const w = 2.4 * (1 - i * 0.12), l = 15 / 6; dropMeshes(rig, seg); K.box(seg, 0, 0, -l / 2, w, w, l + 0.1, C[2]); K.box(seg, 0, 0, -l / 2, w + 0.5, w + 0.4, l * 0.7, C[i % 2]); K.box(seg, 0, w / 2 + 0.4, -l / 2, 0.6, 0.8, 0.6, CL); K.box(seg, 0, 0, -0.1, w + 0.2, w + 0.2, 0.3, CD); }
  // stinger at the tail tip, dripping venom
  const sting = group(rig.tailTip, 0, 0, -2.6, -0.9);
  K.box(sting, 0, 0, -1.2, 2.8, 2.8, 3.2, ST[0]); K.box(sting, 0, 0, -1.2, 2, 2, 3.4, ST[1]);
  K.box(sting, 0, -0.6, -3.4, 1.1, 1.1, 2.2, ST[2], 0.5); K.box(sting, 0, -1.4, -4.6, 0.6, 0.6, 1.4, ST[2], 0.9);
  K.box(sting, 0, -2.2, -4.9, 0.5, 0.9, 0.5, VEN);
  rig.extras.sting = sting;
  K.done();
  return rig;
}

// ---- stat blocks -------------------------------------------------------------
// ai: melee | ranged | tank | teleport | summon | blob | statue
// role (what it does in a fight; world/encounters.js mixes groups by it):
//   rusher (fast melee) | fodder (steady melee) | ranged | caster (homing) |
//   lobber (arcing shots) | exploder | tank | bruiser | trickster | summoner | ambusher
// tier: minor | elite | champion | boss
// aura: 'smoke' | 'fire' | 'greekfire' | 'spark' | 'wisp' | null  (ambient particles)
// projectile (ranged): 'feather' | 'fire' | 'acid' | 'bullet' | 'wisp'
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
  harpy: { name: txt('monsters.harpy.name'), tier: 'minor', role: 'ranged', hp: 40, speed: 3.8, dmg: 8, radius: 0.4, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.55, cd: 2.1, xp: 5, coins: [2, 4], model: 'harpy', pitch: 1.3, projectile: 'feather', voice: 'screech' },
  stymphalian: { name: txt('monsters.stymphalian.name'), tier: 'minor', role: 'ranged', hp: 34, speed: 4.4, dmg: 7, radius: 0.45, height: 1.7, ai: 'ranged', range: 11, keep: 7, windup: 0.5, cd: 2.3, xp: 4, coins: [1, 4], model: 'stymphalian', pitch: 1.7, projectile: 'feather', voice: 'screech' },
  automaton: { name: txt('monsters.automaton.name'), tier: 'minor', role: 'exploder', hp: 30, speed: 3.9, dmg: 16, radius: 0.55, height: 1.1, ai: 'blob', range: 1.8, windup: 0.9, cd: 0, xp: 4, coins: [1, 4], model: 'automaton', pitch: 1.8, aura: 'greekfire', blast: 0x6aff3a },
  ghost: { name: txt('monsters.ghost.name'), tier: 'minor', role: 'caster', hp: 38, speed: 3.2, dmg: 8, radius: 0.45, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.6, cd: 2.2, xp: 4, coins: [1, 3], model: 'ghost', pitch: 0.9, projectile: 'wisp', voice: 'moan', aura: 'wisp', knockResist: 0.2 },
  fury: { name: txt('monsters.fury.name'), tier: 'elite', role: 'trickster', hp: 95, speed: 3.8, dmg: 13, radius: 0.45, height: 2.1, ai: 'teleport', range: 2.2, windup: 0.45, cd: 1.6, xp: 10, coins: [4, 7], model: 'fury', pitch: 1.1, puff: 0x3a2a24, slashColor: 0xff8a2a, voice: 'screech' },
  dracaena: { name: txt('monsters.dracaena.name'), tier: 'elite', role: 'tank', hp: 190, speed: 2.4, dmg: 18, radius: 0.8, height: 2.6, ai: 'tank', range: 2.6, windup: 0.85, cd: 2.2, xp: 12, coins: [5, 9], model: 'dracaena', armor: 0.25, shield: true, knockResist: 0.75, pitch: 0.8, voice: 'hiss' },
  hellhound: { name: txt('monsters.hellhound.name'), tier: 'elite', role: 'bruiser', hp: 220, speed: 3.6, dmg: 20, radius: 1.1, height: 2.6, ai: 'melee', range: 2.6, windup: 0.7, cd: 1.8, xp: 14, coins: [6, 10], model: 'hellhound', knockResist: 0.7, superArmor: true, pitch: 0.5, aura: 'smoke', voice: 'bark' },
  empousa: { name: txt('monsters.empousa.name'), tier: 'elite', role: 'summoner', hp: 160, speed: 2.6, dmg: 10, radius: 0.5, height: 2.3, ai: 'summon', range: 9, keep: 8, windup: 1.0, cd: 5, xp: 16, coins: [8, 14], model: 'empousa', knockResist: 0.4, pitch: 1.2, summons: 'pup', aura: 'fire', projectile: 'fire', voice: 'screech' },
  scorpion: { name: txt('monsters.scorpion.name'), tier: 'elite', role: 'bruiser', hp: 140, speed: 3.4, dmg: 12, radius: 0.8, height: 1.3, ai: 'melee', range: 2.2, windup: 0.55, cd: 1.5, xp: 10, coins: [4, 8], model: 'scorpion', armor: 0.2, knockResist: 0.5, pitch: 1.4, voice: 'click', poison: { dps: 4, dur: 4 }, slashColor: 0x9aff3a },
  skeleton: { name: txt('monsters.skeleton.name'), tier: 'elite', role: 'ranged', hp: 110, speed: 3, dmg: 15, radius: 0.45, height: 2, ai: 'ranged', range: 12, keep: 7, windup: 0.6, cd: 1.9, xp: 9, coins: [3, 7], model: 'skeleton', pitch: 1.1, projectile: 'bullet', voice: 'rattle', regrow: true },
  // a spartoi: the steady melee fodder of the sown skeleton army (beach, underworld, desert)
  spartoi: { name: txt('monsters.spartoi.name'), tier: 'minor', role: 'fodder', hp: 52, speed: 3.3, dmg: 9, radius: 0.45, height: 2, ai: 'melee', range: 1.8, windup: 0.5, cd: 1.4, xp: 4, coins: [1, 3], model: 'spartoi', pitch: 1.2, voice: 'rattle', knockResist: 0.2 },
  // a telekhine: lobs Greek fire in an arc (a marked spot that burns a moment): keep moving
  telekhine: { name: txt('monsters.telekhine.name'), tier: 'minor', role: 'lobber', hp: 38, speed: 3, dmg: 11, radius: 0.55, height: 1.3, ai: 'ranged', range: 12, keep: 8, windup: 0.9, cd: 3.2, xp: 5, coins: [1, 4], model: 'telekhine', pitch: 0.9, projectile: 'fire', lob: true, voice: 'bark', aura: 'greekfire' },
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

export function buildMonsterModel(model) { const rig = (MODELS[model] ?? MODELS.pup)(); rig.tick = (dt, e) => { animateExtras(rig, dt, e); rig.onTick?.(dt, e); }; return rig; }
export const buildCurseModel = buildMonsterModel;

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
