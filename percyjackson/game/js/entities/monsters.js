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
import { QuadRig, paintQuad, quadPart } from './quad.js';
import { paintPerson } from './mortals.js';
import { HS, solid, skinMat, prop, group, voxHair, flameHair, snake, lavaCracks, fur, sway, rng } from './parts.js';
import { heroHair, cellMesh, footwear } from './herovox.js';

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
export function voxMat(look, { rough = 0.75, metal = 0, emit = 1.5, fill = 0.12 } = {}) {
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
    if (rot) { _q.setFromEuler(_e.set(b.rx, b.ry, b.rz)); _m4.compose(_p.set(b.x, b.y, b.z), _q, _one); }
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
function dropMeshes(rig, g) { for (const m of [...g.children]) if (m.isMesh) { g.remove(m); rig.meshes.splice(rig.meshes.indexOf(m), 1); } }

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
        const a = -side * (-0.12 + i * 0.22), L = outL * (0.98 - i * 0.07), px = X(outL * 0.3), py = -chord * 0.08;
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
  const K = kit(rig, look, { seed: 19, emit: 1.8 });
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
const MODELS = {
  pup: () => hound('pup', { scale: 0.95, bodyL: 10, bodyW: 6, bodyH: 6, legH: 5.5, legW: 2.8, headS: 7, ears: true, tail: 3, tailLen: 6, tailW: 1.8, tailCurl: 0.55, neckUp: 2, jawOpen: 0.25 }, { fur: 60, cracks: 6, collar: false, pup: true }),
  hellhound: () => hound('hellhound', { scale: 2.5, bodyL: 13, bodyW: 7.5, bodyH: 7, legH: 7, legW: 3.2, headS: 7.5, ears: true, tail: 4, tailLen: 9, tailW: 2, tailCurl: 0.6, gait: 0.75, neckUp: 2.2, jawOpen: 0.35 }, { fur: 170, cracks: 14, collar: true }),
  spider: () => bronzeSpider('spider', { scale: 0.85 }),
  automaton: () => {
    const rig = new QuadRig({ material: skinMat('automaton', (S) => paintQuad(S, { base: 0xa8742e, dark: 0x5a3a14, belly: 0x4a2e10, eye: 0x8aff5a, eyes: [[9, 11], [13, 11]], plates: 0xe0b060, teeth: false, nose: 0x3a2a10, noise: 0.22 }), { rough: 0.35 }), scale: 1.05, bodyL: 10, bodyW: 9, bodyH: 5, legH: 4, legW: 1.6, headS: 5, legs: 6, splay: 0.7, snout: false, neckUp: -1.5, gait: 1.4 });
    for (const sx of [-1, 1]) prop(rig, rig.mouth, 1, 1, 4, solid(0xd8a85a, 0, 0.35, 0.35), sx * 1.6, 0, 1.6, 0, -sx * 0.4, 0);
    const pot = new THREE.Group(); pot.position.set(0, 3.5 * PX, -1 * PX); rig.torso.add(pot);
    prop(rig, pot, 6, 5, 6, solid(0x2a2018, 0, 0.8), 0, 2.5, 0);
    prop(rig, pot, 6.4, 1, 6.4, solid(0xc9963a, 0, 0.35, 0.6), 0, 1.5, 0);
    prop(rig, pot, 4, 1, 4, solid(0x2a2018, 0, 0.8), 0, 5.5, 0);
    const fire = prop(rig, pot, 4.6, 4, 4.6, solid(0x6aff3a, 2.6), 0, 3, 0); fire.scale.set(1.02, 0.6, 1.02);
    prop(rig, pot, 3, 1.5, 3, solid(0xaaff6a, 3.5), 0, 6.4, 0);
    rig.extras.pot = pot; rig.extras.fire = fire;
    return rig;
  },
  harpy: () => eagle('harpy', { scale: 1.0 }),
  // Stymphalian bird: the same eagle in bronze feathers, sharp as knives
  stymphalian: () => eagle('stymphalian', { scale: 0.9, metal: true }),
  fury: () => buildFury('fury', { scale: 1.0 }),
  // Dracaena (vox-enemies, middle row): a snake-haired woman in a black and
  // gold top with gold cuffs over one long green serpent tail striped in
  // gold, carrying a long gold-tipped spear and a small bronze buckler.
  dracaena: () => {
    const mat = skinMat('dracaena', (S) => paintPerson(S, { skin: 0xd8ac84, hair: 0x1e5a32, fringe: 1, hairSide: 3, hairBack: 6, eye: 0x1a1a0a, eyeWhite: 0xffd84a, scowl: true, fangs: 0xf4f0e0, mouth: false, top: 0xd8ac84, sleeve: 0xd8ac84, hand: 0xd8ac84, pants: 0x1e5a32, skirt: 0x24402a, skirtLen: 7,
      body: (s) => {
        const blk = 0x161214, gold = 0xc9963a;
        for (const [u, w] of [[16, 4], [20, 8], [28, 4], [32, 8]]) { s.rect(u, 21, w, 4, blk, 0.05); s.rect(u, 21, w, 1, gold, 0); s.rect(u, 24, w, 1, gold, 0); }
        s.rect(23, 25, 2, 2, gold, 0);
        s.rect(16, 29, 24, 3, 0x24402a, 0.1); s.rect(16, 29, 24, 1, gold, 0); for (let x = 16; x < 40; x += 2) s.px(x, 31, 0x2e7a3a);
      } }), { emit: 2.4, rough: 0.5 });
    const rig = new Rig({ material: mat, scale: 1.3, bodyW: 8, bodyD: 4, armW: 3, legH: 8 });
    rig.legR.visible = rig.legL.visible = false;
    // one long serpent tail: down from the hips, along the ground behind and
    // curling up at the tip, green with gold belly scutes and a gold side stripe
    const scale = solid(0x1e5a32, 0, 0.5), scale2 = solid(0x2a7040, 0, 0.5), belly = solid(0xc9a03a, 0, 0.5, 0.3);
    const base = group(rig.hips, 0, 0, 0);
    prop(rig, base, 7, 8, 5, scale, 0, -4, 0);
    prop(rig, base, 7.4, 1, 5.4, solid(0xc9963a, 0, 0.4, 0.6), 0, -0.4, 0);
    const segs = [];
    let parent = group(base, 0, -6, -1);
    const shape = [[6, 4.4, 6], [5.4, 4, 6], [4.6, 3.6, 6], [3.8, 3, 5.6], [3, 2.6, 5], [2.2, 2, 4.4], [1.6, 1.6, 3.6]];
    const bend = [0, 0, 0.04, 0.08, 0.2, 0.45, 0.6], yaw = [0.3, 0.55, 0.5, -0.45, -0.6, -0.5, 0.3];
    for (let i = 0; i < shape.length; i++) {
      const [w, h, d] = shape[i];
      const g = group(parent, 0, 0, i ? -shape[i - 1][2] : 0, bend[i], yaw[i], 0);
      if (i) sway(rig, g, 'y', 0.12, 2.2, i * 0.8);
      prop(rig, g, w, h, d, i % 2 ? scale2 : scale, 0, 0, -d / 2);
      prop(rig, g, w * 0.7, 0.5, d * 0.9, belly, 0, -h / 2 - 0.2, -d / 2);
      prop(rig, g, 0.5, h * 0.4, d * 0.8, belly, w / 2 + 0.1, 0, -d / 2); prop(rig, g, 0.5, h * 0.4, d * 0.8, belly, -w / 2 - 0.1, 0, -d / 2);
      segs.push(g); parent = g;
    }
    prop(rig, parent, 1, 1, 2, belly, 0, 0, -4.4);
    // snake hair
    const hairS = solid(0x2e8b4a, 0, 0.6);
    for (const [x, z, rx, rz] of [[-3, 1, 0.3, 0.6], [3, 1, 0.3, -0.6], [-2, -2, -0.5, 0.4], [2, -2, -0.5, -0.4], [0, -3, -0.7, 0], [0, 1, 0.1, 0], [-3.5, -1, -0.2, 0.9], [3.5, -1, -0.2, -0.9], [-1.5, 2.5, 0.5, 0.3], [1.5, 2.5, 0.5, -0.3]])
      snake(rig, rig.head, { len: 3, seg: 1.7, w: 1.2, body: hairS, at: [x * HS, 7.6 * HS, z * HS], rot: [rx, 0, rz], amp: 0.25, speed: 4 });
    // the long spear and a small buckler
    const spear = new THREE.Group(); rig.handR.add(spear); spear.rotation.x = -0.15;
    prop(rig, spear, 1, 44, 1, solid(0x4a2e1a), 0, 6, 1.5);
    prop(rig, spear, 2.4, 6, 0.8, solid(0xe0b050, 0.2, 0.3, 0.75), 0, 30, 1.5);
    prop(rig, spear, 1.6, 1, 1.6, solid(0xd8a85a, 0, 0.3, 0.7), 0, 26.6, 1.5);
    const shield = new THREE.Group(); shield.position.set(1.6 * PX, -5 * PX, 1 * PX); rig.handL.add(shield); shield.rotation.y = Math.PI / 2;
    prop(rig, shield, 8, 8, 1.2, solid(0xc9963a, 0, 0.4, 0.6), 0, 0, 0);
    prop(rig, shield, 5, 5, 0.6, solid(0x1e5a32, 0, 0.5), 0, 0, 0.8);
    prop(rig, shield, 2, 2, 0.8, solid(0xc9963a, 0, 0.35, 0.6), 0, 0, 1.1);
    rig.extras.shield = shield;
    for (const arm of [rig.armR, rig.armL]) { prop(rig, arm, 3.6, 1.4, 4.6, solid(0xc9963a, 0, 0.35, 0.6), 0, -6, 0); prop(rig, arm, 3.4, 1, 4.4, solid(0xc9963a, 0, 0.35, 0.6), 0, 1.5, 0); }
    rig.hunch = 0.15;
    return rig;
  },
  empousa: () => {
    const mat = skinMat('empousa', (S) => paintPerson(S, { skin: 0xf0c8a8, hair: 0xff6a1a, fringe: 2, hairSide: 3, eye: 0x6a1a0a, eyeWhite: 0xffffff, grin: true, lipstick: 0xc8203a, top: 0xf4f0e8, collar: 0xf28c28, trim: 0xf28c28, sleeve: 0xf0c8a8, hand: 0xf0c8a8, shortSleeve: true, skirt: 0xf28c28, skirtLen: 5, legR: 0xc9963a, legL: 0x8a7a6a, shoes: 0x2a2018,
      body: (s) => { s.rect(22, 24, 4, 3, 0xf28c28, 0.05); s.px(23, 23, 0xf28c28); s.px(24, 23, 0xf28c28); for (const [u, v] of [[0, 16], [16, 48]]) { for (let x = 0; x < 16; x += 2) s.rect(u + x, v + 4, 1, 5, 0xc85a10, 0.05); s.rect(u, v + 8, 16, 1, 0xf4f0e8, 0); } for (let i = 0; i < 20; i++) s.px(16 + Math.floor(s.r() * 16), 52 + Math.floor(s.r() * 12), 0x5a4a3a); } }), { emit: 2.8 });
    const rig = new Rig({ material: mat, scale: 1.1, bodyW: 7, armW: 3 });
    flameHair(rig, { seed: 11, n: 80, height: 8 });
    // bronze leg (right) and a donkey leg with a hoof (left)
    const bronze = solid(0xc9963a, 0.15, 0.3, 0.8);
    prop(rig, rig.legR, 4.3, 7, 4.3, bronze, 0, -8, 0); prop(rig, rig.legR, 4.6, 1.4, 4.6, bronze, 0, -4, 0);
    prop(rig, rig.legL, 4.4, 5, 4.4, solid(0x9a8a7a), 0, -7, 0);
    prop(rig, rig.legL, 4.6, 2.4, 5, solid(0x1a1410), 0, -11, 0.3);
    // pom-poms: clusters of orange and black tassels
    for (const hand of [rig.handR, rig.handL]) {
      const pp = group(hand, 0, -2, 0);
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; prop(rig, pp, 2.2, 2.2, 2.2, solid(i % 3 ? 0xf28c28 : 0x1a1418, 0.3), Math.cos(a) * 1.8, Math.sin(a * 2) * 1.2, Math.sin(a) * 1.8); }
      prop(rig, pp, 3, 3, 3, solid(0xf28c28, 0.3), 0, 0, 0);
    }
    rig.extras.flame = true;
    return rig;
  },
  scorpion: () => {
    const rig = new QuadRig({ material: skinMat('scorpion', (S) => paintQuad(S, { base: 0x3a2214, dark: 0x1a0e08, belly: 0x5a3018, back: 0x2a160c, eye: 0xff3a1a, eyes: [[9, 12], [13, 12], [11, 10], [12, 10]], plates: 0x6a3a1c, teeth: false, nose: 0x1a0e08, noise: 0.15, speckles: 20,
      custom: (s) => { s.box(40, 32, 2, 2, 6, 0x4a2a16, 0.15); for (let x = 40; x < 56; x += 3) s.rect(x, 32, 1, 8, 0x1a0e08, 0); } }), { rough: 0.35, emit: 3 }),
      scale: 1.1, bodyL: 10, bodyW: 7, bodyH: 3.4, legH: 4, legW: 1.4, headS: 4.5, legs: 8, splay: 1.6, footL: 5, snout: false, neckUp: -1.2, gait: 1.5, tail: 6, tailLen: 15, tailW: 2.4, tailCurl: 0.62 });
    bronzeLegs(rig, 4, solid(0x2a160c, 0, 0.35), solid(0x6a3a1c, 0, 0.35));
    // pincers on jointed arms
    const chit = solid(0x4a2a16, 0, 0.35), dark = solid(0x1a0e08, 0, 0.35);
    rig.extras.claws = [];
    for (const sx of [-1, 1]) {
      const arm = group(rig.torso, sx * 3, 0, 4.5, 0, sx * 0.5, 0);
      prop(rig, arm, 1.8, 1.8, 6, chit, 0, 0, 3);
      const fore = group(arm, 0, 0, 6, 0, -sx * 0.9, 0);
      prop(rig, fore, 1.6, 1.6, 5, chit, 0, 0, 2.5);
      const pin = group(fore, 0, 0, 5);
      prop(rig, pin, 3.4, 2.4, 4, chit, 0, 0, 1.6);
      const jawA = prop(rig, pin, 1.2, 1.4, 4, dark, -1, 0, 4.6, 0, 0.25, 0); const jawB = prop(rig, pin, 1.2, 1.4, 4, dark, 1, 0, 4.6, 0, -0.25, 0);
      rig.extras.claws.push({ arm, jawA, jawB, side: sx });
      sway(rig, arm, 'y', 0.15, 2.4);
    }
    // stinger at the tail tip, dripping venom
    const sting = group(rig.tailTip, 0, 0, -2.6, -0.9);
    prop(rig, sting, 2.4, 2.4, 3, chit, 0, 0, -1.2);
    prop(rig, sting, 0.9, 0.9, 3, solid(0x9aff3a, 2.6), 0, -0.8, -3.4, 0.6);
    rig.extras.sting = sting;
    return rig;
  },
  skeleton: () => {
    const mat = skinMat('skeleton', (S) => paintPerson(S, { skin: 0xe8e0c8, eye: 0x0a0806, eyeWhite: 0x0a0806, brow: 0xc8c0a8, mouth: false, top: 0x5a6a34, sleeve: 0x5a6a34, shortSleeve: true, hand: 0xe8e0c8, pants: 0x4a5a2c, shoes: 0x8a7a5a,
      face: (s, ey) => { for (const x of [9, 10, 13, 14]) { s.px(x, ey, 0x0a0806); s.px(x, ey - 1, 0x0a0806); } s.px(11, ey + 1, 0x2a2420); s.px(12, ey + 1, 0x2a2420); s.rect(9, ey + 3, 6, 1, 0xf4ecd8, 0); for (let x = 9; x < 15; x += 1) if (x % 2) s.px(x, ey + 3, 0x5a5040); s.rect(10, ey + 4, 4, 1, 0xd8d0b8, 0); },
      body: (s) => { for (const [x0, y0, w, h] of [[16, 16, 24, 16], [40, 16, 16, 9], [32, 48, 16, 9], [0, 16, 16, 16], [16, 48, 16, 16]]) for (let i = 0; i < w * h / 6; i++) { const c = [0x3a4a24, 0x7a7a4a, 0x2a3018][Math.floor(s.r() * 3)]; const x = x0 + Math.floor(s.r() * w), y = y0 + Math.floor(s.r() * h); s.rect(x, y, 2, 1, c, 0); }
        for (const [u, v] of [[0, 16], [16, 48]]) s.rect(u, v + 12, 16, 4, 0x8a7a5a, 0.1); } }), { emit: 1.2 });
    const rig = new Rig({ material: mat, scale: 1.0, armW: 3 });
    for (const arm of [rig.armR, rig.armL]) for (const m of arm.children) m.scale.set(0.8, 1, 0.8);
    const olive = solid(0x4a5a2c, 0, 0.8), dark = solid(0x2a3018, 0, 0.8);
    // helmet with chin strap and goggles band
    prop(rig, rig.head, 9.6 * HS, 4, 9.6 * HS, olive, 0, 8.2 * HS, 0);
    prop(rig, rig.head, 10.4 * HS, 1, 10.4 * HS, olive, 0, 6.6 * HS, 0);
    prop(rig, rig.head, 9.8 * HS, 1, 9.8 * HS, dark, 0, 7.4 * HS, 0);
    // tactical vest with pouches
    prop(rig, rig.torso, 9, 7, 5.4, dark, 0, 7.5, 0);
    for (const x of [-2.5, 0, 2.5]) prop(rig, rig.torso, 2, 2.4, 1, olive, x, 5.4, 3);
    // rifle held across the body
    const gun = group(rig.handR, 0, -1, 2, -1.45, 0, 0);
    const metal = solid(0x2a2a2c, 0, 0.45, 0.5);
    prop(rig, gun, 1.6, 2, 14, metal, 0, 0, 2); prop(rig, gun, 1.2, 4, 1.6, metal, 0, -2.6, 1.6); prop(rig, gun, 1.6, 2.4, 4, solid(0x5a4030), 0, -0.6, -6.6); prop(rig, gun, 0.8, 0.8, 5, metal, 0, 0.4, 10.5);
    rig.extras.gun = gun;
    rig.extras.muzzle = group(gun, 0, 0.4, 13);
    return rig;
  },
  cyclops: () => {
    const mat = skinMat('cyclops', (S) => paintPerson(S, { skin: 0xd89a6a, hair: 0x2a1a10, fringe: 1, hairSide: 3, hairBack: 7, eye: 0xd89a6a, eyeWhite: 0xd89a6a, scowl: false, brow: 0x2a1a10, mouth: false, beard: 0x2a1a10, top: 0xf0e8d8, sleeve: 0xd89a6a, hand: 0xc88a5a, pants: 0xd89a6a, skirt: 0xf0e8d8, skirtLen: 8, shoes: 0x6a4a2a,
      face: (s, ey) => { s.rect(10, ey - 1, 4, 3, 0xffffff, 0); s.rect(11, ey - 1, 2, 2, 0x2a6ab8, 0); s.px(11, ey - 1, 0x0a0a1a); s.rect(9, ey - 2, 6, 1, 0x2a1a10, 0); s.rect(10, ey + 3, 4, 1, 0x7a1a14, 0); s.px(10, ey + 3, 0xf4f0e0); s.px(13, ey + 3, 0xf4f0e0); },
      body: (s) => { s.rect(16, 20, 4, 12, 0xd89a6a, 0.05); s.rect(20, 20, 3, 6, 0xd89a6a, 0.05); for (let i = 0; i < 30; i++) s.px(23 + Math.floor(s.r() * 17), 20 + Math.floor(s.r() * 12), 0xd8ccb8); s.rect(16, 29, 24, 2, 0xc9963a, 0.05); } }), { emit: 2 });
    const rig = new Rig({ material: mat, scale: 2.3, bodyW: 11, bodyD: 6, armW: 5, headS: 9, legH: 10 });
    voxHair(rig, { style: 'shaggy', base: 0x2a1a10, shade: 0x140a06, light: 0x4a3020, seed: 23 }, 1);
    // fleece over the shoulder and a studded club
    prop(rig, rig.torso, 6, 4, 7, solid(0xf4ecdc), -3, 11, 0, 0, 0, 0.3);
    const club = group(rig.handR, 0, -1, 1, -1.2, 0, 0);
    prop(rig, club, 2.6, 18, 2.6, solid(0x6a4022), 0, 6, 0); prop(rig, club, 4.6, 8, 4.6, solid(0x7a4a28), 0, 16, 0);
    for (const [x, y, z] of [[2.4, 15, 0], [-2.4, 18, 0], [0, 17, 2.4], [0, 14, -2.4]]) prop(rig, club, 1.4, 1.4, 1.4, solid(0x8a8a90, 0, 0.4, 0.6), x, y, z);
    for (const arm of [rig.armR, rig.armL]) prop(rig, arm, 5.6, 2, 4.6, solid(0x6a4a2a), 0, -8, 0);
    rig.hunch = 0.3;
    return rig;
  },
  gorgon_statue: () => {
    const mat = skinMat('gorgon_statue', (S) => {
      paintPerson(S, { skin: 0xa8a49a, hair: 0x8a867c, fringe: 2, hairSide: 3, eye: 0x6a665e, eyeWhite: 0xb8b4aa, frown: true, lipstick: 0x7a766e, top: 0x9a968c, sleeve: 0x9a968c, hand: 0xa8a49a, pants: 0x8a867c, shoes: 0x7a766e, collar: 0xb0aca2 });
      for (let i = 0; i < 26; i++) { let x = Math.floor(S.r() * 64), y = Math.floor(S.r() * 64); for (let k = 0; k < 4; k++) { S.px(x, y, 0x5a5650); x += S.r() < 0.5 ? 1 : 0; y += 1; } }
      for (let i = 0; i < 40; i++) S.px(Math.floor(S.r() * 64), Math.floor(S.r() * 64), 0x6a8a5a);   // moss
    }, { emit: 0, rough: 0.95, fill: 0.08 });
    const rig = new Rig({ material: mat, scale: 1.05 });
    voxHair(rig, { style: 'messy', base: 0x8a867c, shade: 0x6a665e, light: 0xa8a49a, seed: 29 }, 1);
    // a frozen shield arm and a cracked plinth stuck to its feet
    const sh = group(rig.handL, 1, -4, 2);
    prop(rig, sh, 9, 9, 1.2, solid(0x8a867c, 0, 0.95), 0, 0, 0);
    prop(rig, sh, 4, 4, 0.6, solid(0x9a968c, 0, 0.95), 0, 0, 0.8);
    for (const leg of [rig.legR, rig.legL]) prop(rig, leg, 5, 2, 6, solid(0x7a766e, 0, 0.95), 0, -11.4, 0.5);
    rig.statuePose = (r) => { r.armR.rotation.set(-2.3, 0, 0.3); r.armL.rotation.set(-1.3, 0.5, -0.2); r.head.rotation.set(0.25, 0.5, 0); r.torso.rotation.set(0.12, -0.3, 0); r.legR.rotation.x = 0.3; r.legL.rotation.x = -0.25; };
    rig.statuePose(rig);
    return rig;
  },
  ghost: () => {
    const mat = skinMat('ghost', (S) => paintPerson(S, { skin: 0xb8e8f0, hair: 0x8ab8c8, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x0a1a2a, eyeWhite: 0x0a1a2a, brow: 0x6a98a8, mouth: false, top: 0x9ac8d8, sleeve: 0x9ac8d8, hand: 0xc8f0f8, skirt: 0x8ab8c8, skirtLen: 12, pants: 0x8ab8c8,
      face: (s, ey) => { s.rect(9, ey - 1, 2, 2, 0x0a1a2a, 0); s.rect(13, ey - 1, 2, 2, 0x0a1a2a, 0); s.px(10, ey, 0xffffff); s.px(14, ey, 0xffffff); s.rect(11, ey + 2, 2, 2, 0x1a2a3a, 0); } }), { emit: 3, fill: 0.7, dissolve: 0.3 });
    const rig = new Rig({ material: mat, scale: 1.0, armW: 3 });
    rig.legR.visible = rig.legL.visible = false;
    // trailing wisps instead of legs
    const wisp = solid(0x9ad8e8, 1.4);
    for (let i = 0; i < 5; i++) { const g = group(rig.hips, -3 + i * 1.5, 0, 0); prop(rig, g, 1.8, 8 - (i % 2) * 3, 2, wisp, 0, -4 + (i % 2), 0); sway(rig, g, 'x', 0.35, 3, i); }
    rig.float = 1.3; rig.hunch = 0.2;
    return rig;
  },
};
// Hellhounds (vox-enemies, left): soot-black shaggy fur in chunky clumps,
// a hump of hackles over heavy shoulders, glowing lava cracks, a furnace in
// the open jaws with long fangs, burning eyes under a heavy brow, big paws
// with gold claws, a gold spiked collar and a smouldering tail tip.
const FUR = [0x2a2226, 0x352b30, 0x43363c, 0x1e181b, 0x50404a];
const LAVA = [0xff4800, 0xff9a00];
function hound(id, spec, { fur: nFur = 80, cracks = 8, collar = true, pup = false } = {}) {
  const mat = skinMat(id, (S) => { lavaDog({ cracks, base: 0x2e2529 })(S); S.saturate(1.3); }, { emit: 0.5 });
  const rig = new QuadRig({ material: mat, ...spec });
  const K = kit(rig, mat, { seed: pup ? 5 : 9, emit: 1.6 });
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
// Knee caps and foot tips on the jointed legs of a QuadRig (spec.footL).
function bronzeLegs(rig, footL, mat, tip) {
  for (const leg of rig.legs) {
    const knee = leg.userData.knee; if (!knee) continue;
    const w = rig.dims.legW;
    prop(rig, knee, w * 1.25, 1.6, w * 1.25, tip, 0, 0, 0);
    prop(rig, knee, w * 0.55, 1.2, w * 0.55, mat, 0, -footL - 0.3, 0);
  }
}
// A harpy as the 3D sheet draws it (vox-enemies, top row): an upright eagle
// in layered golden-brown feathers with a pale scalloped breast, a hooked
// gold beak under a heavy brow, glowing yellow eyes, feathered trousers, gold
// scaly legs with black talons, a fan tail and wide fingered wings raised
// high. metal: bronze feathers sharp as knives (the Stymphalian birds).
function eagle(id, { scale = 1, metal = false } = {}) {
  const P = metal
    ? { main: 0x9a5a18, light: 0xe0a030, dark: 0x5a2e0c, breast: 0xd8962a, tip: 0xf8c850, edge: 0xc8802a }
    : { main: 0x7a4818, light: 0xc88a38, dark: 0x3e220a, breast: 0xe0c48e, tip: 0xe8c070, edge: 0xb07a30 };
  const gold = 0xe8a820, goldD = 0xb87a10, talon = 0x1a120a;
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
  }, { emit: 1.4, rough: metal ? 0.4 : 0.85, res: 2 });
  const rig = new Rig({ material: mat, scale, armW: 3, legH: 6, bodyD: 7, bodyW: 8, bodyH: 11, headS: 7 });
  rig.armR.visible = rig.armL.visible = false;
  const K = kit(rig, mat, { seed: metal ? 41 : 43, rough: metal ? 0.45 : 0.85, metal: metal ? 0.2 : 0, emit: 1.4 });
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
  for (const sx of [-1, 1]) { K.box(Hd, sx * 2.4 * hk, 4.1 * hk, fz + 0.15, 1.8, 1.4, 0.3, 0xffd000); K.box(Hd, sx * 2.2 * hk, 4.1 * hk, fz + 0.3, 0.7, 0.8, 0.2, 0x140800); }
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
const BRZ = [0xc8801a, 0xb06a10, 0xe09a26], BRZ_D = [0x3e260c, 0x523212, 0x2e1a08], BRZ_L = 0xf8c040;
export function bronzeSpider(id, { scale = 1, queen = false } = {}) {
  const base = 0xb87414, dark = 0x3e260c, plate = 0xe8a428;
  const mat = skinMat(id, (S) => { paintQuad(S, { base, dark, belly: 0x3a220e, eye: 0xffa020, eyeLow: 0xff6a10, eyes: [[9, 11], [13, 11]], plates: plate, extra: 0x9a6428, teeth: false, nose: dark, noise: 0.16, speckles: 14,
    custom: (s) => {
      for (let x = 0; x < 40; x += 4) s.rect(x, 24, 1, 8, dark, 0);          // riveted seams on the body
      for (let i = 0; i < 18; i++) s.px(Math.floor(s.r() * 40), 16 + Math.floor(s.r() * 20), plate);
      s.rect(40, 18, 12, 1, plate, 0); s.rect(40, 22, 12, 1, dark, 0); s.rect(40, 25, 12, 1, dark, 0);
    } }); S.saturate(1.25); }, { rough: 0.4, emit: 1.2 });
  const rig = new QuadRig({ material: mat, scale, bodyL: 8, bodyW: 7, bodyH: 5, legH: 9, legW: 2.3, headS: 6.4, legs: 8, splay: 2.15, footL: 13, kneeOut: 0.5, legY: 2.4, snout: false, neckUp: -1.6, headZ: -0.6, gait: 1.6 });
  const K = kit(rig, mat, { seed: queen ? 31 : 13, rough: 0.5, metal: 0.1, emit: 1.6 });
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
    K.box(k, 0, 0, 0, 3.4, 3.4, 3.4, BRZ_D[2]);
    K.box(k, 0, -6.5, 0, legW * 0.8, 13, legW * 0.8, BRZ_D[1]);
    for (const sx of [-1, 1]) { K.box(k, sx * 1.8, 0, 0, 0.5, 2.2, 2.2, BRZ_D[0]); K.box(k, sx * 2.1, 0, 0, 0.4, 0.9, 0.9, BRZ_L); }
    K.box(k, 0, -4.2, 0, legW * 0.8 + 0.8, 5, legW * 0.8 + 0.8, BRZ[(u.row + 1) % 3]);
    K.box(k, 0, -6.9, 0, legW * 0.8 + 1, 0.8, legW * 0.8 + 1, BRZ_D[1]);
    K.box(k, 0, -9.4, 0, legW * 0.8 + 0.4, 3.6, legW * 0.8 + 0.4, BRZ_D[0]);
    K.box(k, 0, -12.4, 0, 1.2, 2.2, 1.2, BRZ_D[2]);
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
  }, { emit: 1.6, res: 2 });
  const rig = new Rig({ material: mat, scale, bodyW: 7, armW: 3, legH: 10 });
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  const K = kit(rig, mat, { seed, rough: 0.9 });
  const RAG = [dress, 0x241c20, 0x120e10, 0x2e2428, 0x1e1418];
  // the dress: four swaying panels of ragged strips that flare toward the hem
  const panels = [];
  for (let q = 0; q < 4; q++) {
    const g = group(rig.hips, 0, 0.5, 0); panels.push(g);
    for (let i = 0; i < 11; i++) {
      const a = (q + i / 11) * Math.PI / 2 - Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
      if (Math.abs(a) < 0.2 && i % 2 === 0) continue;                   // the slit up the front
      const L = 9.5 + K.r() * 4, rx = 3.7, rz = 2.5, f = 0.34;
      const x = sa * rx, z = ca * rz;
      K.box(g, x + sa * L * f * 0.5, -L / 2 + 0.6, z + ca * L * f * 0.5, 1.7, L, 1, K.tone(RAG, 0.15), ca * f, 0, -sa * f);
      // torn ends trailing past the hem
      const l2 = 1.5 + K.r() * 3; K.box(g, x + sa * (L * f + 0.4), -L - l2 / 2 + 1.2, z + ca * (L * f + 0.3), 0.8 + K.r() * 0.6, l2, 0.6, K.tone(RAG, 0.1), ca * 0.45, 0, -sa * 0.45);
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

// ---- stat blocks -------------------------------------------------------------
// ai: melee | ranged | tank | teleport | summon | blob | statue
// tier: minor | elite | champion | boss
// aura: 'smoke' | 'fire' | 'greekfire' | 'spark' | 'wisp' | null  (ambient particles)
// projectile (ranged): 'feather' | 'fire' | 'acid' | 'bullet' | 'wisp'
// poison: { dps, dur }  a hit leaves the hero poisoned (green numbers)
// regrow: true   falls to bones and gets back up unless hit again while down
// wake: metres   'statue' monsters stand frozen until a hero comes this close
export const MONSTERS = {
  pup: { name: 'Hellhound Pup', tier: 'minor', hp: 32, speed: 5, dmg: 7, radius: 0.45, height: 1.1, ai: 'melee', range: 1.5, windup: 0.4, cd: 1.1, xp: 3, coins: [1, 3], model: 'pup', pitch: 1.5, voice: 'bark' },
  spider: { name: 'Bronze Spider', tier: 'minor', hp: 20, speed: 5.8, dmg: 5, radius: 0.38, height: 0.8, ai: 'melee', range: 1.3, windup: 0.35, cd: 1, xp: 2, coins: [0, 2], model: 'spider', pitch: 2.2, voice: 'click', aura: 'spark' },
  harpy: { name: 'Wild Harpy', tier: 'minor', hp: 40, speed: 3.8, dmg: 8, radius: 0.4, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.55, cd: 2.1, xp: 5, coins: [2, 4], model: 'harpy', pitch: 1.3, projectile: 'feather', voice: 'screech' },
  stymphalian: { name: 'Stymphalian Bird', tier: 'minor', hp: 34, speed: 4.4, dmg: 7, radius: 0.45, height: 1.7, ai: 'ranged', range: 11, keep: 7, windup: 0.5, cd: 2.3, xp: 4, coins: [1, 4], model: 'stymphalian', pitch: 1.7, projectile: 'feather', voice: 'screech' },
  automaton: { name: 'Greek-Fire Automaton', tier: 'minor', hp: 30, speed: 3.9, dmg: 26, radius: 0.55, height: 1.1, ai: 'blob', range: 1.8, windup: 0.9, cd: 0, xp: 4, coins: [1, 4], model: 'automaton', pitch: 1.8, aura: 'greekfire', blast: 0x6aff3a },
  ghost: { name: 'Restless Spirit', tier: 'minor', hp: 38, speed: 3.2, dmg: 8, radius: 0.45, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.6, cd: 2.2, xp: 4, coins: [1, 3], model: 'ghost', pitch: 0.9, projectile: 'wisp', voice: 'moan', aura: 'wisp', knockResist: 0.2 },
  fury: { name: 'Fury', tier: 'elite', hp: 95, speed: 3.8, dmg: 13, radius: 0.45, height: 2.1, ai: 'teleport', range: 2.2, windup: 0.45, cd: 1.6, xp: 10, coins: [4, 7], model: 'fury', pitch: 1.1, puff: 0x3a2a24, slashColor: 0xff8a2a, voice: 'screech' },
  dracaena: { name: 'Dracaena', tier: 'elite', hp: 190, speed: 2.4, dmg: 18, radius: 0.8, height: 2.6, ai: 'tank', range: 2.6, windup: 0.85, cd: 2.2, xp: 12, coins: [5, 9], model: 'dracaena', armor: 0.25, shield: true, knockResist: 0.75, pitch: 0.8, voice: 'hiss' },
  hellhound: { name: 'Hellhound', tier: 'elite', hp: 220, speed: 3.6, dmg: 20, radius: 1.1, height: 2.6, ai: 'melee', range: 2.6, windup: 0.7, cd: 1.8, xp: 14, coins: [6, 10], model: 'hellhound', knockResist: 0.7, superArmor: true, pitch: 0.5, aura: 'smoke', voice: 'bark' },
  empousa: { name: 'Empousa', tier: 'elite', hp: 160, speed: 2.6, dmg: 10, radius: 0.5, height: 2.3, ai: 'summon', range: 9, keep: 8, windup: 1.0, cd: 5, xp: 16, coins: [8, 14], model: 'empousa', knockResist: 0.4, pitch: 1.2, summons: 'pup', aura: 'fire', projectile: 'fire', voice: 'screech' },
  scorpion: { name: 'Pit Scorpion', tier: 'elite', hp: 140, speed: 3.4, dmg: 12, radius: 0.8, height: 1.3, ai: 'melee', range: 2.2, windup: 0.55, cd: 1.5, xp: 10, coins: [4, 8], model: 'scorpion', armor: 0.2, knockResist: 0.5, pitch: 1.4, voice: 'click', poison: { dps: 4, dur: 4 }, slashColor: 0x9aff3a },
  skeleton: { name: 'Skeleton Warrior', tier: 'elite', hp: 110, speed: 3, dmg: 9, radius: 0.45, height: 2, ai: 'ranged', range: 12, keep: 7, windup: 0.6, cd: 1.9, xp: 9, coins: [3, 7], model: 'skeleton', pitch: 1.1, projectile: 'bullet', voice: 'rattle', regrow: true },
  gorgon_statue: { name: 'Living Statue', tier: 'elite', hp: 150, speed: 2.6, dmg: 16, radius: 0.5, height: 2.1, ai: 'statue', range: 2.2, windup: 0.7, cd: 1.6, xp: 9, coins: [3, 6], model: 'gorgon_statue', armor: 0.35, knockResist: 0.6, pitch: 0.7, voice: 'grind', wake: 5 },
  cyclops: { name: 'Cyclops', tier: 'champion', hp: 620, speed: 2.3, dmg: 28, radius: 1.2, height: 4.2, ai: 'tank', range: 3.2, windup: 1.0, cd: 2.4, xp: 40, coins: [15, 25], model: 'cyclops', knockResist: 0.9, superArmor: true, pitch: 0.45, voice: 'roar', slamR: 3.6 },
};
// Old Cursed Dungeons kinds still requested by shared code (wave spawner,
// level tables) map onto the Greek bestiary.
export const LEGACY_KINDS = { swarmer: 'pup', imp: 'pup', spitter: 'harpy', blob: 'automaton', tank: 'dracaena', teleporter: 'fury', summoner: 'empousa' };
for (const [old, now] of Object.entries(LEGACY_KINDS)) Object.defineProperty(MONSTERS, old, { value: MONSTERS[now], enumerable: false });
export const MONSTER_IDS = Object.keys(MONSTERS);
export const CURSES = MONSTERS;
export const resolveKind = (kind) => (MONSTERS[kind] ? (LEGACY_KINDS[kind] ?? kind) : 'pup');

export function buildMonsterModel(model) { const rig = (MODELS[model] ?? MODELS.pup)(); rig.tick = (dt, e) => animateExtras(rig, dt, e); return rig; }
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
