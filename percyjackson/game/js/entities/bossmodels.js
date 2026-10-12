// Boss models for The Lightning Thief, after design/concept/vox-bosses-1.png
// (and vox-enemies.png for the Furies and hellhounds, vox-npcs.png for Luke).
// Every skin and prop material is cached, so a boss arriving mid-fight never
// compiles a shader. Each builder returns a Rig or QuadRig; rig.extras holds
// the parts the boss patterns move (whips, heads, beds, the motorcycle).
import * as THREE from 'three/webgpu';
import { vertexColor } from 'three/tsl';
import { Rig, PX } from './character.js';
import { QuadRig, paintQuad, quadPart } from './quad.js';
import { paintPerson } from './mortals.js';
import { buildFury, bronzeSpider } from './monsters.js';
import { HS, solid, skinMat, prop, group, voxHair, voxCubes, snake, lavaCracks, fur, spikedCollar, sway, rng, bruteLimbs } from './parts.js';

const GOLD = () => solid(0xc9963a, 0.15, 0.35, 0.75);

// ---------------------------------------------------------------- voxel kit
// The bosses are sculpted from voxels like the concept sheets: each rig part
// (torso, head, an arm, a leg, a jaw) gets ONE mesh holding sculpted cells
// (ellipsoids and boxes filled on a grid, faces between cells culled) and
// loose boxes (straps, studs, horns), with three material groups: matte,
// metal and glowing. Units are skin pixels relative to the parent group.
let KIT = null;
function kitMats() {
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
const hash3 = (x, y, z, s) => { let n = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const smooth = (t) => t * t * (3 - 2 * t);
function noise(x, y, z, s = 0) {
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
const toCol = (c) => (c instanceof THREE.Color ? c : tmpC.set(c));
// A palette pick: cols[] by smooth noise (clumps of tone), or a plain colour.
const pick = (cols, x, y, z, seed = 0, f = 0.45) => { if (!Array.isArray(cols)) return cols; const t = Math.max(0, Math.min(0.999, (noise(x * f, y * f, z * f, seed) - 0.5) * 1.9 + 0.5)); return cols[Math.floor(t * cols.length)]; };

// Sculpt cells. shapes, in priority order:
//   { e: [cx, cy, cz, rx, ry, rz] }   ellipsoid      { b: [x0, y0, z0, x1, y1, z1] }   box
//   { cap: [x0, y0, z0, x1, y1, z1, r0, r1] }   a tapered capsule between two points
//   col: hex | [hex, ...] (noise clumps) | (x, y, z, n) => hex | null (null leaves the cell to later shapes)
//   m: 'm' metal, 'e' glow, 'f' lit;  cut: true carves instead;  bump: lumpiness;  fuzz: ragged edge
// Returns a Map "i,j,k" -> [Color, materialIndex] on a grid of size v.
function cells(shapes, { v = 1, seed = 1, bump = 0.18, fuzz = 0.12, cellsIn = new Map() } = {}) {
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
  const I0 = Math.floor(lo[0] / v) - 1, I1 = Math.ceil(hi[0] / v) + 1, J0 = Math.floor(lo[1] / v) - 1, J1 = Math.ceil(hi[1] / v) + 1, K0 = Math.floor(lo[2] / v) - 1, K1 = Math.ceil(hi[2] / v) + 1;
  for (let i = I0; i < I1; i++) for (let j = J0; j < J1; j++) for (let k = K0; k < K1; k++) {
    const x = (i + 0.5) * v, y = (j + 0.5) * v, z = (k + 0.5) * v;
    const n = noise(x * 0.42, y * 0.42, z * 0.42, seed), h = hash3(i, j, k, seed);
    let cut = false, hit = null;
    for (const sh of shapes) {
      if (!inside(sh, x, y, z, n, h)) continue;
      if (sh.cut) { cut = true; break; }
      let c = sh.col;
      let mi = MI[sh.m] ?? 0;
      if (typeof c === 'function') { c = c(x, y, z, n, h); if (c == null) continue; if (Array.isArray(c)) { mi = MI[c[1]] ?? 0; c = c[0]; } }
      else c = pick(c, x, y, z, seed + 3, sh.f ?? 0.28);
      hit = [new THREE.Color(c).multiplyScalar(0.93 + h * 0.14), mi]; break;
    }
    if (!cut && hit) C.set(`${i},${j},${k}`, hit);
  }
  return C;
}
// One mesh from cells (grid v) and loose boxes ({ p: [x,y,z], s: [w,h,d], c, m?, r?: [rx,ry,rz] }),
// with material groups. Hung on parent and registered with the rig.
function voxMesh(rig, parent, { cells: C = null, v = 1, boxes = [] } = {}) {
  const buf = [[], [], [], []].map(() => ({ P: [], N: [], Cc: [] }));
  if (C) for (const [key, [col, mi]] of C) {
    const [i, j, k] = key.split(',').map(Number), B = buf[mi];
    for (const [n, vs, sh] of CF) {
      if (C.has(`${i + n[0]},${j + n[1]},${k + n[2]}`)) continue;
      const crev = n[1] === 0 && C.has(`${i + n[0]},${j + 1},${k + n[2]}`) ? 0.8 : 1;
      const g = sh * crev;
      for (const q of [0, 1, 2, 0, 2, 3]) { const a = vs[q]; B.P.push((i + a[0]) * v, (j + a[1]) * v, (k + a[2]) * v); B.N.push(...n); B.Cc.push(col.r * g, col.g * g, col.b * g); }
    }
  }
  const e = new THREE.Euler(), M = new THREE.Matrix4(), V = new THREE.Vector3();
  for (const b of boxes) {
    const B = buf[MI[b.m] ?? 0], col = toCol(b.c).clone(), [w, h, d] = b.s;
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
  const P = [], N = [], Cc = [], g = new THREE.BufferGeometry();
  let start = 0;
  buf.forEach((B, mi) => { const n = B.P.length / 3; if (!n) return; P.push(...B.P); N.push(...B.N); Cc.push(...B.Cc); g.addGroup(start, n, mi); start += n; });
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  g.scale(PX, PX, PX);
  const mesh = rig.mesh(g, kitMats()); parent.add(mesh);
  return mesh;
}
// sculpt + boxes in one call
const vox = (rig, parent, shapes, opts = {}, boxes = []) => voxMesh(rig, parent, { cells: shapes.length ? cells(shapes, opts) : null, v: opts.v ?? 1, boxes });
// hide the rig's own skin boxes on a part (the sculpt replaces them)
const hideSkin = (...parts) => { for (const p of parts) for (const c of p.children) if (c.isMesh) c.visible = false; };
// points along a curve (for horns, tails, tentacles): f(t) -> [x, y, z]
const along = (f, n, r0, r1, col, extra = {}) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), [x, y, z] = f(t); const r = r0 + (r1 - r0) * t; return { e: [x, y, z, r, r, r], col: typeof col === 'function' ? col(t) : col, bump: 0.05, fuzz: 0.05, ...extra }; });
const BRONZE = () => solid(0xb8782e, 0.1, 0.35, 0.7);

// ---------------------------------------------------------------- shared bits
// A dog's head (head, snout, hinged jaw) built from the QuadRig skin regions,
// for Cerberus's extra heads.
function dogHead(rig, parent, hs) {
  const head = new THREE.Group(); parent.add(head);
  head.add(rig.mesh(quadPart('head', hs, hs, hs, [0, 0, hs * 0.35])));
  const sn = hs * 0.5;
  head.add(rig.mesh(quadPart('snout', sn, sn * 0.75, sn, [0, -hs * 0.18, hs * 0.85 + sn * 0.5])));
  const mouth = new THREE.Group(); mouth.position.set(0, -hs * 0.42 * PX, hs * 0.75 * PX); head.add(mouth);
  mouth.add(rig.mesh(quadPart('jaw', sn * 0.9, sn * 0.35, sn, [0, -sn * 0.17, sn * 0.5])));
  for (const sx of [-1, 1]) { const e = rig.mesh(quadPart('ear', 2, 3, 1, [0, 1.5, 0])); e.position.set(sx * hs * 0.32 * PX, hs * 0.5 * PX, hs * 0.2 * PX); e.rotation.z = -sx * 0.25; head.add(e); }
  return { head, mouth };
}
// A lion's mane: layered cubes around the back of a QuadRig head.
function mane(rig, head, hs, seed, cols, { thick = 1, chest = true } = {}) {
  const r = rng(seed), cubes = [];
  for (let i = 0; i < 150 * thick; i++) {
    const a = r() * Math.PI * 2, R = hs * (0.62 + r() * 0.42);
    const x = Math.cos(a) * R, y = Math.sin(a) * R * 0.95 - 0.3, z = hs * (-0.25 + r() * 0.45) - (R - hs * 0.6) * 0.5;
    const sz = 1.2 + r() * 1.4;
    cubes.push({ x, y, z, w: sz, h: sz * 1.2, d: sz, col: cols[Math.floor(r() * cols.length)] });
  }
  if (chest) for (let i = 0; i < 26; i++) cubes.push({ x: (r() - 0.5) * hs * 1.1, y: -hs * 0.55 - r() * hs * 0.7, z: hs * (-0.1 + r() * 0.35), w: 2.2, h: 2.6, d: 2.2, col: cols[Math.floor(r() * cols.length)] });
  return voxCubes(rig, head, cubes);
}
// A fur clump over a part (minotaur shoulders, hellhound hackles).
function furClump(rig, parent, seed, cols, { x = 0, y = 0, z = 0, sx = 8, sy = 4, sz = 6, n = 30, size = [1.6, 2.8] } = {}) {
  const r = rng(seed), cubes = [];
  for (let i = 0; i < n; i++) { const s = size[0] + r() * (size[1] - size[0]); cubes.push({ x: x + (r() - 0.5) * sx, y: y + (r() - 0.5) * sy, z: z + (r() - 0.5) * sz, w: s, h: s, d: s, col: cols[Math.floor(r() * cols.length)] }); }
  return voxCubes(rig, parent, cubes);
}

// A shaggy wolf-dog head sculpted on a QuadRig-style head group and its jaw
// (mouth) group: heavy brow, burning eyes, a long muzzle, fangs top and
// bottom, a red mouth that shows when the jaw drops, tall pointed ears.
// Designed at head size 8; k scales it. o: { fur: [..], eye, inner, drool, lava }
function wolfHead(rig, head, mouth, hs, o) {
  const k = hs / 8, S = (a) => a.map((q) => q * k);
  const fur = o.fur, lava = o.lava;
  const furCol = (x, y, z, n, h) => (lava && Math.abs(noise(x * 0.3 / k, y * 0.25 / k, z * 0.3 / k, 77) - 0.5) < 0.028 ? [h < 0.5 ? 0xff2a00 : 0xff5a08, 'e'] : fur[Math.min(fur.length - 1, Math.floor(n * fur.length))]);
  const tooth = 0xf4ecd4;
  vox(rig, head, [
    { b: S([-2.9, 0.7, 5.6, -1.1, 1.6, 7]), col: o.eye, m: 'e', bump: 0, fuzz: 0 }, { b: S([1.1, 0.7, 5.6, 2.9, 1.6, 7]), col: o.eye, m: 'e', bump: 0, fuzz: 0 },
    { e: S([-2.7, 5.2, 1.9, 0.9, 1.8, 0.5]), col: o.inner, bump: 0, fuzz: 0 }, { e: S([2.7, 5.2, 1.9, 0.9, 1.8, 0.5]), col: o.inner, bump: 0, fuzz: 0 },
    ...along((t) => [-2.6 - t * 0.8, 3.6 + t * 4.8, 1.2 - t * 0.8].map((q) => q * k), 6, 1.7 * k, 0.45 * k, fur[0]),
    ...along((t) => [2.6 + t * 0.8, 3.6 + t * 4.8, 1.2 - t * 0.8].map((q) => q * k), 6, 1.7 * k, 0.45 * k, fur[0]),
    { e: S([-2.1, 2.5, 5.4, 2, 0.9, 1.5]), col: fur[0], bump: 0.05 }, { e: S([2.1, 2.5, 5.4, 2, 0.9, 1.5]), col: fur[0], bump: 0.05 },
    { b: S([-1.1, -0.2, 10.6, 1.1, 1.3, 11.8]), col: 0x060506, bump: 0, fuzz: 0 },
    { b: S([-1.6, -2.6, 6.2, 1.6, -1.7, 10.6]), col: 0x9a1424, bump: 0, fuzz: 0 },
    { e: S([0, -0.5, 8.3, 2.2, 1.9, 3.6]), col: (x, y, z, n, h) => (y > 0.8 * k ? fur[2 + Math.floor(h * 2)] : furCol(x, y, z, n, h)), bump: 0.06, fuzz: 0.06 },
    { e: S([-3.3, -0.8, 2, 2.5, 3.1, 3.1]), col: furCol, fuzz: 0.4 }, { e: S([3.3, -0.8, 2, 2.5, 3.1, 3.1]), col: furCol, fuzz: 0.4 },
    { e: S([0, 0.9, 2.4, 4, 3.8, 4]), col: furCol },
    { e: S([0, 0.2, -1.2, 5.4, 5.2, 3.2]), col: furCol, fuzz: 0.5, bump: 0.25 },
  ], { v: 0.8 * k, seed: o.seed ?? 5, bump: 0.12, fuzz: 0.12 }, [
    ...[[1.3, 9.8, 1.9], [1.5, 7.9, 1.4], [1.6, 6.6, 1]].flatMap(([x, z, l]) => [-1, 1].map((sx) => ({ p: [sx * x * k, (-2.5 - l / 2) * k, z * k], s: [0.75 * k, l * k, 0.75 * k], c: tooth }))),
    { p: [0, -2.8 * k, 10.4 * k], s: [1.8 * k, 0.6 * k, 0.5 * k], c: tooth },
  ]);
  const jaw = group(mouth, 0, 0, 0, o.gape ?? 0.42);
  vox(rig, jaw, [
    { b: S([-1.2, -0.6, -0.6, 1.2, 0.2, 3.8]), col: 0xc8304a, bump: 0, fuzz: 0 },
    { e: S([0, -1, 1.8, 1.9, 1.1, 3]), col: (x, y, z, n) => (y > -0.5 * k ? 0x8a1222 : fur[Math.floor(n * 2)]), bump: 0.04, fuzz: 0.04 },
    { e: S([0, -2, 0.4, 2.6, 1.6, 2.6]), col: fur, fuzz: 0.45 },
  ], { v: 0.8 * k, seed: (o.seed ?? 5) + 1 }, [
    ...[[1.3, 3.8, 1.6], [1.5, 2.1, 1.2]].flatMap(([x, z, l]) => [-1, 1].map((sx) => ({ p: [sx * x * k, l / 2 * k, z * k], s: [0.75 * k, l * k, 0.75 * k], c: tooth }))),
    ...(o.drool ? [[1.1, 3.2, 2.6], [-1.2, 1.6, 1.8], [0.4, 4.2, 1.4]].map(([x, z, l]) => ({ p: [x * k, (-1.6 - l / 2) * k, z * k], s: [0.4 * k, l * k, 0.4 * k], c: 0xdce8f0, m: 'f' })) : []),
  ]);
}
// A gold collar of slabs and cream spikes round an axis pointing along +z, as boxes.
function collarBoxes(r, n, { x = 0, y = 0, z = 0, rx = 0, w = 2.2 } = {}) {
  const B = [], M = new THREE.Matrix4().makeRotationX(rx).setPosition(x, y, z), V = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, seg = 2 * Math.PI * r / n + 0.5;
    V.set(Math.sin(a) * r, Math.cos(a) * r, 0).applyMatrix4(M);
    B.push({ p: [V.x, V.y, V.z], s: [seg, 1.2, w], c: i % 2 ? 0xd8a032 : 0xc48a26, m: 'm', r: [rx, 0, -a] });
    V.set(Math.sin(a) * (r + 1.3), Math.cos(a) * (r + 1.3), 0).applyMatrix4(M);
    B.push({ p: [V.x, V.y, V.z], s: [1, 2, 1], c: 0xf0e2b8, m: 'm', r: [rx, 0, -a] });
  }
  return B;
}
// A shaggy quadruped body over a QuadRig: chest, haunches, hackles, legs with
// claws. o: { fur, lava, seed, chest, spikes }
function wolfBody(rig, o) {
  const { W, H, L, legH, legW } = rig.dims, fur = o.fur, lava = o.lava;
  const furCol = (x, y, z, n, h) => (lava && Math.abs(noise(x * 0.24, y * 0.2, z * 0.24, 78) - 0.5) < 0.028 ? [h < 0.5 ? 0xff2a00 : 0xff5a08, 'e'] : fur[Math.min(fur.length - 1, Math.floor(n * fur.length))]);
  hideSkin(rig.torso);
  vox(rig, rig.torso, [
    { e: [0, H * 0.1, L * 0.3, W * 0.66 * (o.chest ?? 1), H * 0.78, L * 0.36], col: furCol, fuzz: 0.4 },
    { e: [0, H * 0.45, L * 0.05, W * 0.45, H * 0.4, L * 0.45], col: furCol, fuzz: 0.35, bump: 0.3 },
    { e: [0, 0, -L * 0.22, W * 0.55, H * 0.62, L * 0.36], col: furCol, fuzz: 0.3 },
    { e: [0, H * 0.35, L * 0.48, W * 0.5, H * 0.55, L * 0.2], col: furCol, fuzz: 0.4 },
  ], { v: 1, seed: o.seed ?? 9, bump: 0.16, fuzz: 0.12 }, o.spikes ? Array.from({ length: o.spikes }, (_, i) => ({ p: [0, H * 0.85 + (i % 2) * 0.4, L * 0.38 - i * L * 0.8 / o.spikes], s: [1.6, 3.2 + (i % 2), 1.6], c: fur[1], r: [-0.5, 0, 0] })).concat(lava ? Array.from({ length: o.spikes }, (_, i) => ({ p: [0, H * 0.85 + 1.6 + (i % 2) * 0.4, L * 0.38 - i * L * 0.8 / o.spikes - 0.9], s: [1, 1.2, 1], c: 0xff3a00, m: 'e', r: [-0.5, 0, 0] })) : []) : []);
  for (const leg of rig.legs) {
    hideSkin(leg);
    const front = leg.userData.row === 0, t = front ? 1.15 : 1;
    vox(rig, leg, [
      { b: [-legW * 0.6, -legH - 0.2, -legW * 0.5, legW * 0.6, -legH + 1.6, legW * 0.85], col: furCol, bump: 0.05 },
      { e: [0, -legH * 0.62, 0.1, legW * 0.55 * t, legH * 0.38, legW * 0.6 * t], col: furCol, fuzz: 0.3 },
      { e: [0, -legH * 0.15, 0, legW * 0.85 * t, legH * 0.45, legW * 0.9 * t], col: furCol, fuzz: 0.35 },
    ], { v: 0.9, seed: (o.seed ?? 9) + 3 }, [-1, 0, 1].map((dx) => ({ p: [dx * legW * 0.36, -legH - 0.1, legW * 0.95], s: [0.8, 1.1, 1.6], c: 0xe8dcc0, r: [0.4, 0, 0] })));
  }
}

// ---------------------------------------------------------------- builders
export const BOSS_MODELS = {
  // Alecto: Mrs. Dodds as she really is (vox-enemies, bottom right)
  alecto: () => buildFury('alecto', { scale: 1.75, seed: 71 }),
  megaera: () => buildFury('megaera', { scale: 1.6, skin: 0xa8ae98, hair: 0xb8b8b0, wing: 0x4a3424, seed: 72 }),
  tisiphone: () => buildFury('tisiphone', { scale: 1.6, skin: 0xa8a2a8, hair: 0xf0f0ec, wing: 0x5a2a22, dress: 0x24141a, mouthGrin: false, seed: 73 }),

  // The Minotaur: a towering brown bull-man in white briefs with a gold belt
  // medallion, cream horns, a gold nose ring and red eyes.
  minotaur: () => {
    // the skin boxes are hidden under the sculpt; the material still carries the hit flash and glow
    const m = skinMat('boss_minotaur', (S) => paintPerson(S, { skin: 0x86391c, hair: 0x341810, top: 0x86391c, pants: 0x86391c, shoes: 0x2a2424 }), { emit: 3 });
    const rig = new Rig({ material: m, scale: 2.1, bodyW: 13, bodyH: 13, bodyD: 7, armW: 6, headS: 7.5, legH: 15 });
    for (const [a, s] of [[rig.armR, -1], [rig.armL, 1]]) a.position.x = s * 12.2 * PX;
    bruteLimbs(rig, { armLen: 1.45, armThick: 1.15, legThick: 1.5, legX: 4.4 });
    rig.neck.position.z = 1.4 * PX;   // the head thrust forward, low between the shoulders
    hideSkin(rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL);
    // deep red-brown hide, darker fur in the creases, lighter on the muscle tops
    const hide = [0x5e240c, 0x7a3010, 0x903c14, 0xa84a1a], hideL = [0x9a4416, 0xb0521e, 0xc06028], furD = [0x24100a, 0x341810, 0x4a2414];
    const muscle = (x, y, z, n) => (n > 0.6 ? 0xae5228 : null);
    const gold = [0xd8a032, 0xe8b444, 0xc48a26];
    // torso: a barrel chest, slabs of pecs, a hump of trapezius, ridged abs
    vox(rig, rig.torso, [
      { e: [0, 0.8, 0.4, 6.9, 1.1, 4.7], col: gold, m: 'm', bump: 0.04, fuzz: 0 },
      { e: [0, -0.6, 0.3, 7.1, 1.6, 4.9], col: [0xe8e0c8, 0xd8ccb0, 0xf4eedc], bump: 0.1 },
      { e: [-3.3, 9.2, 2.2, 4.3, 3.4, 2.7], col: hideL, f: 0.6 }, { e: [3.3, 9.2, 2.2, 4.3, 3.4, 2.7], col: hideL, f: 0.6 },
      { e: [0, 3.6, 1.2, 5.2, 4.6, 3.9], col: (x, y, z) => z > 3.6 && (Math.abs(x) < 0.7 || (y > 2 && y < 3) || (y > 4.4 && y < 5.4)) ? 0x5a240e : y > 5.6 ? 0x8e401e : 0x9a4622 },
      { e: [0, 12.4, -0.6, 9.4, 3.6, 4.8], col: (x, y, z) => (z < -2.5 && Math.abs(x) < 3 ? furD[(Math.floor(x + y) & 1) + 1] : hide[Math.floor(hash3(Math.floor(x), Math.floor(y), Math.floor(z), 4) * 4)]) },
      { e: [0, 14, 1.2, 4.6, 2.4, 3.6], col: furD, fuzz: 0.4 },
      { e: [-5.4, 8, -0.6, 2.8, 4.6, 3.4], col: hide }, { e: [5.4, 8, -0.6, 2.8, 4.6, 3.4], col: hide },
      { e: [0, 8, 0, 7.2, 5.2, 4.4], col: hide },
    ], { v: 1, seed: 11, bump: 0.12, fuzz: 0.1 }, [
      // the gold belt medallion
      { p: [0, 0.8, 5.2], s: [3.6, 3.6, 0.8], c: 0xe8b444, m: 'm' }, { p: [0, 0.8, 5.2], s: [3.6, 3.6, 0.8], c: 0xd8a032, m: 'm', r: [0, 0, Math.PI / 4] },
      { p: [0, 0.8, 5.7], s: [2, 2, 0.4], c: 0xffd860, m: 'm' }, { p: [0, 0.8, 5.9], s: [0.8, 0.8, 0.3], c: 0x9a6a1a, m: 'm' },
    ]);
    // the loincloth, hanging from the hips with a ragged hem
    vox(rig, rig.hips, [
      { e: [0, -1.6, 0.3, 6.6, 2.2, 4.8], col: [0xece4cc, 0xe0d6bc, 0xd4c8aa] },
      { b: [-4.4, -8.5, 3.4, 4.4, -0.6, 4.8], col: (x, y, z, n, h) => (y < -7 + Math.abs(x) * 0.45 - h * 1.6 ? null : y < -5.4 ? 0xcfc4a6 : [0xece4cc, 0xe0d6bc, 0xf6f0de][Math.floor(h * 3)]), bump: 0 },
      { b: [-3, -5.5, -4.6, 3, -0.6, -3.4], col: (x, y, z, n, h) => (y < -4.4 - h * 1.4 ? null : 0xe0d6bc), bump: 0 },
    ], { v: 1, seed: 12 });
    // arms: a ball of shoulder, a bulging bicep, a forearm like a tree trunk, a knuckled fist
    for (const [arm, s] of [[rig.armR, -1], [rig.armL, 1]]) {
      vox(rig, arm, [
        { e: [s * 0.2, 0.6, 0, 4.6, 4.6, 4.8], col: hide },
        { e: [0, -4.2, 0.6, 3.7, 4.6, 3.9], col: (x, y, z, n) => (z > 2 && n > 0.45 ? 0xa44c24 : hide[Math.floor(n * 3.99)]) },
        { e: [0, -10, 0.3, 4.4, 4.8, 4.4], col: (x, y, z, n) => (z < -2 ? furD[Math.floor(n * 2.99)] : hide[Math.floor(n * 3.99)]), fuzz: 0.2 },
        { e: [0, -16.4, 1, 4.6, 3.8, 4.8], col: (x, y, z, n) => (y < -18.4 && z > 2 ? 0x2a1610 : z > 3.6 && (Math.round(x) % 2 === 0) ? 0x9a4622 : 0x74301a), bump: 0.06 },
      ], { v: 1, seed: 20 + s, bump: 0.14 }, [-2.4, -0.8, 0.8, 2.4].map((dx) => ({ p: [dx * 1.1, -20.1, 3.6], s: [1.3, 1.5, 1.7], c: 0x1e1210, r: [0.5, 0, 0] })));
    }
    // legs: thick thighs, shaggy fetlocks and split dark hooves
    for (const [leg, s] of [[rig.legR, -1], [rig.legL, 1]]) {
      vox(rig, leg, [
        { b: [-0.4, -15, 1.2, 0.4, -13.2, 3.8], cut: true },
        { b: [-3.3, -15, -2.6, 3.3, -12.8, 3.6], col: [0x2a2424, 0x3a3232, 0x4a4040], bump: 0, fuzz: 0 },
        { e: [0, -12.2, 0.3, 4, 1.8, 4.2], col: furD, fuzz: 0.45, bump: 0.25 },
        { e: [0, -8.8, -0.4, 3.6, 4.2, 3.9], col: hide },
        { e: [s * 0.4, -3, 0, 4.6, 5.8, 5], col: (x, y, z, n) => (n > 0.62 ? 0xa44c24 : hide[Math.floor(n * 3.99)]) },
      ], { v: 1, seed: 30 + s, bump: 0.14 });
    }
    // the bull's head: shaggy forelock, heavy brow, burning eyes, a broad dark
    // muzzle with a gold ring, and great cream horns sweeping out and up
    const hornCol = (t) => (t > 0.82 ? [0xc8b48a, 0xb8a078] : [0xf2e8d0, 0xe6dac0, 0xd8c8a6]);
    const horn = (s) => along((t) => [s * (3.8 + 8.4 * Math.sin(Math.min(1, t * 1.3) * 1.5) - 2.2 * t * t * t), 6.4 + 1.6 * t + 8 * t * t, 0.6 - 2.2 * t], 18, 2.5, 1.05, hornCol);
    const muzzle = group(rig.head, 0, 2.2, 7.6);
    vox(rig, rig.head, [
      { b: [-3, 4.3, 3.6, -1.4, 5.1, 4.9], col: 0xff1a00, m: 'e', bump: 0, fuzz: 0 }, { b: [1.4, 4.3, 3.6, 3, 5.1, 4.9], col: 0xff1a00, m: 'e', bump: 0, fuzz: 0 },
      ...horn(-1), ...horn(1),
      { e: [0, 7.6, 0.6, 4.2, 1.8, 3.8], col: furD, fuzz: 0.5, bump: 0.3 },
      { b: [-3.8, 5.3, 3.6, 3.8, 6.2, 4.8], col: 0x341810, bump: 0 },
      { e: [0, 2.2, 5.2, 3.2, 2.3, 2.6], col: (x, y, z) => (z > 7.2 && y > 2.2 && Math.abs(Math.abs(x) - 1.4) < 0.6 ? 0x0e0806 : y < 1 ? 0x2e1a10 : [0x3e2214, 0x4a2a18][Math.floor(hash3(Math.floor(x * 2), Math.floor(y * 2), 3, 1) * 2)]), bump: 0.06, fuzz: 0.04 },
      { e: [-5.6, 5.6, -0.6, 2, 1, 1.3], col: 0x5a2812 }, { e: [5.6, 5.6, -0.6, 2, 1, 1.3], col: 0x5a2812 },
      { e: [-2.8, 3.2, 1.6, 2.4, 2.8, 2.8], col: hide }, { e: [2.8, 3.2, 1.6, 2.4, 2.8, 2.8], col: hide },
      { e: [0, 4.6, -0.6, 4.4, 4.2, 4.4], col: hide },
      { e: [0, 4.2, -3.6, 5, 4.6, 2.4], col: furD, fuzz: 0.45 },
    ], { v: 0.8, seed: 13, bump: 0.12 }, [
      { p: [0, -0.2, 7.9], s: [3.4, 0.8, 0.8], c: 0xe8b444, m: 'm' }, { p: [-1.5, 0.8, 7.9], s: [0.8, 2.4, 0.8], c: 0xd8a032, m: 'm' }, { p: [1.5, 0.8, 7.9], s: [0.8, 2.4, 0.8], c: 0xd8a032, m: 'm' },
    ]);
    rig.extras.muzzle = muzzle;
    rig.hunch = 0.22; rig.armSpread = 0.36;
    return rig;
  },

  // The Chimera: a lion's head and fiery mane, a goat's head rising from its
  // grey haunches, and a long rattlesnake for a tail.
  chimera: () => {
    const m = skinMat('boss_chimera', (S) => paintQuad(S, { base: 0xc8a878, dark: 0x8a7a66, belly: 0xd8c098, back: 0xb8986a, eye: 0xffc81a, eyeLow: 0xff7a1a, nose: 0x3a2214, teeth: 0xfff4e0, speckles: 40,
      custom: (s) => { s.box(0, 0, 8, 8, 8, 0xd89a40, 0.12); s.rect(9, 10, 2, 2, 0xffd84a, 0); s.rect(13, 10, 2, 2, 0xffd84a, 0); s.px(10, 11, 0x1a0a00); s.px(13, 11, 0x1a0a00); s.rect(9, 9, 6, 1, 0x8a5a20, 0); s.box(32, 0, 4, 4, 4, 0xe8b868, 0.1); s.rect(36, 4, 4, 1, 0x3a2214, 0); s.box(48, 0, 4, 2, 4, 0xa8282a, 0.1);
        s.box(40, 32, 2, 2, 6, 0x5a4a2a, 0.1); for (let y = 32; y < 40; y += 2) s.rect(40, y, 16, 1, 0xe0c060, 0); for (let x = 41; x < 56; x += 3) s.rect(x, 33, 1, 6, 0x2a2010, 0);
        fur(s, 0, 16, 40, 20, 60, 0x9a8466, 0xe0c8a0); for (const x of [0, 20]) s.rect(x, 28, 6, 8, 0x8a8478, 0.15); s.rect(12, 16, 8, 6, 0x8a8478, 0.15); } }), { emit: 2.6 });
    const rig = new QuadRig({ material: m, scale: 2.5, bodyL: 14, bodyW: 7.5, bodyH: 7, legH: 7, legW: 3.2, headS: 7.5, ears: true, tail: 8, tailLen: 26, tailW: 2.2, tailCurl: 0.3, gait: 0.7 });
    const { W, H, L, legH, legW } = rig.dims;
    hideSkin(rig.torso, rig.head, rig.mouth, ...rig.legs, ...rig.tail);
    const tan = [0x9a5e26, 0xb07030, 0xc0803a, 0xcc9048], greyF = [0x4e4448, 0x5e5256, 0x6e6264, 0x7e7270];
    const maneC = [0x7a2404, 0x9a3606, 0xb84a0a, 0xd06410, 0xe88a1c];
    // a lion's chest and forequarters, a goat's shaggy grey haunches
    vox(rig, rig.torso, [
      { e: [0, 1.6, L * 0.4, W * 0.82, H * 0.9, L * 0.2], col: maneC, fuzz: 0.5, bump: 0.3 },
      { e: [0, 0.2, L * 0.2, W * 0.6, H * 0.66, L * 0.34], col: tan },
      { e: [0, 0.4, -L * 0.24, W * 0.58, H * 0.64, L * 0.34], col: greyF, fuzz: 0.35, bump: 0.22 },
      { e: [0, -0.6, 0, W * 0.5, H * 0.52, L * 0.48], col: (x, y, z, n) => (y < -2 ? 0xd8b080 : z > 0 ? tan[Math.floor(n * 3.99)] : greyF[Math.floor(n * 3.99)]) },
    ], { v: 1, seed: 31, bump: 0.14, fuzz: 0.12 });
    for (const leg of rig.legs) {
      const front = leg.userData.row === 0, cols = front ? tan : greyF;
      vox(rig, leg, [
        { b: [-legW * 0.65, -legH - 0.2, -legW * 0.55, legW * 0.65, -legH + 1.6, legW * 0.9], col: front ? 0xc88a48 : 0x3a3034, bump: 0.05 },
        { e: [0, -legH * 0.58, 0.1, legW * 0.52, legH * 0.42, legW * 0.58], col: cols, fuzz: front ? 0.1 : 0.3 },
        { e: [0, -legH * 0.12, 0, legW * 0.85, legH * 0.45, legW * 0.9], col: cols, fuzz: front ? 0.1 : 0.35 },
      ], { v: 0.9, seed: 34 + leg.userData.row }, [-1, 0, 1].map((dx) => ({ p: [dx * legW * 0.38, -legH - 0.1, legW * 1.0], s: [0.8, 1.1, 1.7], c: 0xf0e4c8, r: [0.4, 0, 0] })));
    }
    // the lion's head: amber eyes, a pale muzzle, a roaring mouth with fire in it, a blazing mane
    {
      const k = 7.5 / 8, S = (a) => a.map((q) => q * k);
      vox(rig, rig.head, [
        { b: S([-2.8, 1, 5.6, -1.1, 1.9, 6.8]), col: 0xff9a10, m: 'e', bump: 0, fuzz: 0 }, { b: S([1.1, 1, 5.6, 2.8, 1.9, 6.8]), col: 0xff9a10, m: 'e', bump: 0, fuzz: 0 },
        { e: S([-2, 2.6, 5.4, 1.9, 0.8, 1.4]), col: 0x8a4a14 }, { e: S([2, 2.6, 5.4, 1.9, 0.8, 1.4]), col: 0x8a4a14 },
        { b: S([-1.2, 0.2, 9.4, 1.2, 1.4, 10.4]), col: 0x3a1a10, bump: 0, fuzz: 0 },
        { b: S([-1.8, -2.4, 6.2, 1.8, -1.6, 9.8]), col: 0xa01820, bump: 0, fuzz: 0 },
        { e: S([0, -0.4, 8, 2.6, 1.9, 2.6]), col: (x, y) => (y < -1 * k ? 0xf0d0a0 : [0xd8a060, 0xe0ac6c][Math.floor(hash3(Math.floor(x * 2), Math.floor(y * 2), 1, 1) * 2)]), bump: 0.05, fuzz: 0.05 },
        { e: S([0, 1, 2.6, 4.2, 4, 4]), col: tan },
        { e: S([0, 0.6, 0.6, 7.6, 7.6, 4.6]), col: (x, y, z, n) => (z > 3.6 * k && Math.abs(x) < 4.4 * k && y > -3.4 * k ? null : maneC[Math.min(4, Math.floor(n * 5))]), fuzz: 0.5, bump: 0.3 },
      ], { v: 0.8, seed: 36 }, [
        ...[[1.4, 9.2, 1.9], [1.6, 7.4, 1.2]].flatMap(([x, z, l]) => [-1, 1].map((sx) => ({ p: [sx * x * k, (-2.2 - l / 2) * k, z * k], s: [0.7 * k, l * k, 0.7 * k], c: 0xfff4e0 }))),
        { p: [0, -1.6 * k, 7.6 * k], s: [2.2 * k, 0.8 * k, 3 * k], c: 0xffc040, m: 'e' },
      ]);
      const jaw = group(rig.mouth, 0, 0, 0, 0.5);
      vox(rig, jaw, [
        { b: S([-1.3, -0.5, -0.4, 1.3, 0.2, 3.8]), col: 0xc8303a, bump: 0, fuzz: 0 },
        { e: S([0, -1, 1.8, 2, 1.1, 2.8]), col: (x, y) => (y > -0.4 * k ? 0x8a1420 : 0xe8c090), bump: 0.04, fuzz: 0.04 },
        { e: S([0, -1.8, 0.6, 2.6, 1.5, 2.4]), col: maneC, fuzz: 0.45 },
      ], { v: 0.8, seed: 37 }, [[1.3, 3.6, 1.6], [1.5, 2.2, 1.1]].flatMap(([x, z, l]) => [-1, 1].map((sx) => ({ p: [sx * x * k, l / 2 * k, z * k], s: [0.7 * k, l * k, 0.7 * k], c: 0xfff4e0 }))));
    }
    // the goat rising from the back on a shaggy neck: yellow eyes, a beard, great ridged horns
    const goat = group(rig.torso, 0, 3, -2.4, -0.2);
    vox(rig, goat, [{ cap: [0, 0, 0, 0, 10, 1.4, 3, 2.2], col: greyF, fuzz: 0.4 }], { v: 0.9, seed: 38 });
    const gh = group(goat, 0, 10.4, 1.8, 0.35);
    const hornA = (s) => along((t) => { const a = t * Math.PI * 1.35; return [s * (1.6 + 1.6 * t), 1.6 + 3.4 * Math.sin(a), -0.4 - 3.4 * (1 - Math.cos(a))]; }, 16, 1.25, 0.45, (t) => (Math.floor(t * 15) % 2 ? 0x2a221e : 0x3e342c));
    vox(rig, gh, [
      { b: [-1.9, 0.4, 2.6, -0.9, 1.2, 3.6], col: 0xffd020, m: 'e', bump: 0, fuzz: 0 }, { b: [0.9, 0.4, 2.6, 1.9, 1.2, 3.6], col: 0xffd020, m: 'e', bump: 0, fuzz: 0 },
      ...hornA(-1), ...hornA(1),
      { cap: [0, -0.6, 2, 0, -1.2, 5.6, 1.6, 1.1], col: [0x5a4e54, 0x6a5e62] },
      { cap: [0, -2.2, 3.6, 0, -4.6, 3, 0.9, 0.5], col: [0x8a8078, 0x6a6058] },
      { e: [-2.6, 1.4, 0.4, 1.6, 0.6, 0.8], col: greyF[1] }, { e: [2.6, 1.4, 0.4, 1.6, 0.6, 0.8], col: greyF[1] },
      { e: [0, 0.6, 1, 2.4, 2.4, 2.8], col: greyF },
    ], { v: 0.6, seed: 39, bump: 0.1, fuzz: 0.1 });
    rig.extras.goat = goat;
    // the tail is a thick serpent banded in brown and gold
    rig.tail.forEach((g, i) => {
      const w = 2.8 - i * 0.18, sl = 3;
      vox(rig, g, [], {}, [
        { p: [0, 0, -sl / 2], s: [w, w, sl + 0.2], c: i % 2 ? 0x4a2e14 : 0x5a3a1a }, { p: [0, 0, -sl / 2], s: [w + 0.4, w - 0.8, sl * 0.6], c: 0x3a2410 },
        { p: [0, w / 2, -sl / 2], s: [w * 0.6, 0.3, sl * 0.5], c: 0xd8a840 }, { p: [w / 2, 0, -sl * 0.3], s: [0.3, w * 0.5, sl * 0.4], c: 0xc89838 }, { p: [-w / 2, 0, -sl * 0.7], s: [0.3, w * 0.5, sl * 0.4], c: 0xc89838 },
        { p: [0, -w / 2, -sl / 2], s: [w * 0.7, 0.3, sl * 0.8], c: 0xe0c070 },
      ]);
    });
    // the snake's head at the tip: yellow eyes, fangs, a forked red tongue
    const sn = group(rig.tailTip, 0, 0, -3, 0.9);
    vox(rig, sn, [], {}, [
      { p: [0, 0.4, -2.2], s: [3.8, 2.4, 4.6], c: 0x4a2e14 }, { p: [0, 1.7, -2.2], s: [2.6, 0.5, 3.6], c: 0xd8a840 }, { p: [0, -0.6, -2.6], s: [3.2, 1, 3.8], c: 0xe0c070 },
      { p: [0, 0.2, -4.9], s: [2.6, 1.6, 1.4], c: 0x5a3a1a },
      { p: [-1.2, 1.3, -4.1], s: [0.8, 0.8, 0.8], c: 0xffd020, m: 'e' }, { p: [1.2, 1.3, -4.1], s: [0.8, 0.8, 0.8], c: 0xffd020, m: 'e' },
      { p: [-0.8, -1.2, -4.6], s: [0.4, 1.6, 0.4], c: 0xffffff }, { p: [0.8, -1.2, -4.6], s: [0.4, 1.6, 0.4], c: 0xffffff },
      { p: [0, -0.5, -6.6], s: [0.4, 0.3, 2.4], c: 0xd8202a }, { p: [-0.35, -0.8, -7.9], s: [0.3, 0.9, 0.3], c: 0xd8202a }, { p: [0.35, -0.8, -7.9], s: [0.3, 0.9, 0.3], c: 0xd8202a },
    ]);
    rig.extras.snake = sn;
    return rig;
  },

  // A hellhound as big as a house: soot-black with lava running in its
  // cracks, a burning ridge, a gold spiked collar and a furnace for a mouth.
  hellhound_alpha: () => {
    const m = skinMat('boss_hellhound_alpha', (S) => paintQuad(S, { base: 0x1c181c, dark: 0x0c0a0c, belly: 0x2a2226, back: 0x141014, eye: 0xff2a0a, eyeLow: 0xffb04a, nose: 0x050505, speckles: 40, brow: 0x0a0808, teeth: 0xfff0d0,
      custom: (s) => { fur(s, 0, 16, 40, 20, 80, 0x0a0808, 0x3a3034); lavaCracks(s, 0, 16, 40, 20, 16, [0xd83a0a, 0xff6a1a]); lavaCracks(s, 40, 16, 12, 11, 2, [0xd83a0a, 0xff6a1a]); lavaCracks(s, 0, 0, 32, 8, 2, [0xd83a0a, 0xff6a1a]); s.box(48, 0, 4, 2, 4, 0x5a1008, 0.2); s.rect(52, 4, 4, 1, 0xff6a1a, 0); s.rect(36, 7, 4, 1, 0xff6a1a, 0); } }), { emit: 3.2 });
    const rig = new QuadRig({ material: m, scale: 3.4, bodyL: 14, bodyW: 8, bodyH: 7.5, legH: 7.5, legW: 3.4, headS: 7.5, ears: true, tail: 5, tailLen: 10, tailW: 2, tailCurl: 0.4, gait: 0.7 });
    // soot-black fur split by glowing lava veins, a burning ridge of spikes,
    // a gold spiked collar, claws like coals and a furnace for a mouth
    const furs = [0x0c0a0c, 0x151116, 0x1e181e, 0x2a2228, 0x3a2e34];
    wolfBody(rig, { fur: furs, lava: true, seed: 41, spikes: 7, chest: 1.1 });
    hideSkin(rig.head, rig.mouth);
    wolfHead(rig, rig.head, rig.mouth, 8.6, { fur: furs, eye: 0xf04a08, inner: 0x6a1a10, lava: true, seed: 44, gape: 0.5 });
    vox(rig, rig.neck, [{ e: [0, -1.2, -1.6, 4.6, 4.6, 4.4], col: (x, y, z, n, h) => (Math.abs(noise(x * 0.24, y * 0.2, z * 0.24, 79) - 0.5) < 0.028 ? [0xff3a00, 'e'] : furs[Math.floor(n * 4.99)]), fuzz: 0.45 }], { v: 1, seed: 45 }, collarBoxes(4.8, 12, { y: -1.8, z: 0, rx: -0.4 }));
    for (const g of rig.tail) hideSkin(g);
    rig.tail.forEach((g, i) => vox(rig, g, [{ e: [0, 0, -1.2, 1.6 - i * 0.15, 1.6 - i * 0.15, 1.6], col: (x, y, z, n, h) => (h < 0.12 ? [0xff5a10, 'e'] : furs[Math.floor(n * 3.99)]), fuzz: 0.4 }], { v: 0.9, seed: 46 + i }, i === rig.tail.length - 1 ? [{ p: [0, 0.6, -2.6], s: [1.8, 2.6, 1.8], c: 0xff3a00, m: 'e' }, { p: [0, 1.8, -3], s: [1, 1.6, 1], c: 0xff8a10, m: 'e' }] : []));
    // the glow inside the jaws
    vox(rig, rig.mouth, [], {}, [{ p: [0, 0.4, 2], s: [2.4, 0.6, 2.6], c: 0xff6a1a, m: 'e' }]);
    return rig;
  },

  // Medusa: veiled in black with gold trim; writhing green snakes rise from
  // under the hood; her face is never shown, only her eyes when she stares.
  medusa: () => {
    const robe = 0x1a1418;
    const m = skinMat('boss_medusa', (S) => paintPerson(S, { skin: 0x0a0808, eye: 0x0a0808, eyeWhite: 0x0a0808, brow: 0x0a0808, mouth: false, top: robe, collar: 0xc9963a, trim: 0xc9963a, sleeve: robe, hand: 0x9ab890, pants: robe, skirt: robe, skirtLen: 12, shoes: false,
      body: (s) => { s.rect(16, 29, 24, 2, 0xc9963a, 0); s.rect(23, 28, 2, 4, 0xffd84a, 0); for (const [u, v] of [[40, 16], [32, 48]]) s.rect(u, v + 12, 16, 1, 0xc9963a, 0); s.rect(32, 0, 32, 16, robe, 0.08); } }), { emit: 2 });
    const rig = new Rig({ material: m, scale: 1.9, bodyW: 8, bodyD: 5, armW: 4, legH: 12 });
    rig.legR.visible = rig.legL.visible = false;
    hideSkin(rig.torso, rig.head, rig.armR, rig.armL);
    const robes = [0x120c0e, 0x1c1316, 0x261a1e, 0x30222a], trimC = [0xe0901c, 0xf0a828, 0xc87814];
    // robe colour with soft vertical folds
    const fold = (x, z, n) => robes[Math.max(0, Math.min(3, Math.floor((Math.sin(Math.atan2(x, z) * 7) * 0.5 + 0.5) * 2.2 + n * 1.6)))];
    // the cloak over chest and shoulders, a gold belt and clasp, gold trim down the front
    vox(rig, rig.torso, [
      { b: [-1.6, 2.6, 2.4, 1.6, 4.8, 3.6], col: [0xf0b030, 0xd8962a], m: 'm', bump: 0, fuzz: 0 },
      { e: [0, 3.6, 0, 5, 1, 3.4], col: trimC, m: 'm', bump: 0, fuzz: 0 },
      { e: [0, 11, -0.6, 7.2, 3.4, 4.4], col: (x, y, z, n) => (z > 2.4 && Math.abs(x) < 1.6 + (12 - y) * 0.15 && Math.abs(x) > 0.6 + (12 - y) * 0.15 ? trimC[1] : fold(x, z, n)), fuzz: 0.1 },
      { e: [0, 6, 0, 5, 7, 3.2], col: (x, y, z, n) => (z > 2.2 && Math.abs(Math.abs(x) - 1.6) < 0.6 ? trimC[0] : fold(x, z, n)), fuzz: 0.05 },
    ], { v: 0.8, seed: 31 });
    // the robe falls from the hips and flares to a ragged hem on the ground
    const skirt = (y0, y1, r0, r1, opts = {}) => ({ b: [-r1 - 1, y1, -r1 - 1, r1 + 1, y0, r1 + 1], col: (x, y, z, n, h) => {
      const t = (y0 - y) / (y0 - y1), r = r0 + (r1 - r0) * t * t * 0.6 + (r1 - r0) * t * 0.4, d = Math.hypot(x * 1.0, z * 1.25);
      if (d > r + (n - 0.5) * 1.4) return null;
      if (y < y1 + 1.4 + h * 1.4 && hash3(Math.floor(Math.atan2(x, z) * 6), 0, 0, 3) < 0.4 && y < y1 + 0.8) return null;   // ragged hem
      if (y < y1 + 1.6) return trimC[Math.floor(h * 2)];
      if (z > 1 && Math.abs(x) < 1.2 + t * 2.6 && Math.abs(x) > 0.4 + t * 2.4) return trimC[0];
      return fold(x, z, n);
    }, bump: 0, ...opts });
    vox(rig, rig.hips, [skirt(2, -12.2, 4.4, 10.5)], { v: 1, seed: 32 });
    // wide bell sleeves, gold cuffs and bracelets, grey-green clawed hands
    for (const arm of [rig.armR, rig.armL]) {
      vox(rig, arm, [
        { b: [-2.2, -11, -2, 2.2, -8.4, 2.2], col: 0x8aa088, bump: 0 },
        { b: [-5, -9, -5, 5, 2.6, 5], col: (x, y, z, n, h) => { const r = 2.6 + (2 - y) * 0.2; if (Math.hypot(x, z) > r) return null; if (y < -7.6) return Math.hypot(x, z) > r - 1.1 ? trimC[Math.floor(h * 2)] : null; return fold(x, z, n); }, bump: 0 },
      ], { v: 0.8, seed: 33 }, [
        { p: [0, -7.9, 0], s: [4.6, 1.2, 4.6], c: 0xf0b030, m: 'm' },
        ...[-1.4, -0.45, 0.45, 1.4].map((dx) => ({ p: [dx, -12.4, 1.1], s: [0.6, 2.6, 0.7], c: 0x9ab098, r: [0.35, 0, 0] })),
        ...[-1.4, -0.45, 0.45, 1.4].map((dx) => ({ p: [dx, -13.9, 1.7], s: [0.45, 1, 0.5], c: 0x2a2420, r: [0.6, 0, 0] })),
      ]);
    }
    // the hood: a deep peaked cowl, gold-edged, with a void where her face should be
    const hoodIn = (x, y, z) => (x / 6.4) ** 2 + ((y - 4.8) / 6.6) ** 2 + ((z + 0.4) / 6.2) ** 2 < 1;
    const cutIn = (x, y, z, k = 1) => (x / (3.7 * k)) ** 2 + ((y - 3.4) / (4.6 * k)) ** 2 + ((z - 6.6) / (3.6 * k)) ** 2 < 1;
    vox(rig, rig.head, [
      { b: [-3.8, -1.4, 2.4, 3.8, 8.4, 3.2], col: 0x060405, bump: 0, fuzz: 0 },
      { e: [0, 3.4, 6.6, 3.7, 4.6, 3.6], cut: true, bump: 0, fuzz: 0 },
      { e: [0, 3.4, 6.6, 4.9, 5.9, 4.7], col: (x, y, z) => (hoodIn(x, y, z) && !cutIn(x, y, z) && z > 1.4 ? [trimC[1], 'm'] : null), bump: 0, fuzz: 0 },
      { e: [0, 4.8, -0.4, 6.4, 6.6, 6.2], col: (x, y, z, n) => fold(x, z, n), bump: 0.08, fuzz: 0.06 },
      ...along((t) => [0, 10 + t * 3.4, -1.8 - t * 3.6], 6, 3.4, 1, robes[2]),
      { e: [0, -1, -1.6, 7.4, 2.4, 5.4], col: (x, y, z, n) => fold(x, z, n) },
    ], { v: 0.8, seed: 34 });
    const veil = group(rig.head, 0, 8.6, 4.6);
    vox(rig, veil, [{ b: [-3.6, -9.6, -0.5, 3.6, 0, 0.3], col: (x, y, z, n, h) => (y < -8.8 && h < 0.4 ? null : [0x0a0709, 0x120c0f][Math.floor(h * 2)]), bump: 0, fuzz: 0 }], { v: 0.8, seed: 35 });
    rig.extras.veil = veil; sway(rig, veil, 'x', 0.06, 1.6);
    // eyes that light up behind the veil when she stares
    const eyes = group(rig.head, 0, 4.6, 3.6);
    vox(rig, eyes, [], {}, [{ p: [-1.8, 0, 0], s: [1.8, 0.9, 0.4], c: 0xb8ff40, m: 'e' }, { p: [1.8, 0, 0], s: [1.8, 0.9, 0.4], c: 0xb8ff40, m: 'e' }]);
    eyes.visible = false; rig.extras.eyes = eyes;
    // the snakes: thick green coils rising round the hood, heads reared outward
    const greens = [0x1e5a2a, 0x24703a, 0x2e8444], belly = 0xb8d070;
    const snakeAt = [[-4.2, 7, 1.2, 0.2, -0.5, 0.95], [4.2, 7, 1.2, 0.2, 0.5, -0.95], [-3.6, 9.4, -1.6, -0.35, -0.4, 0.6], [3.6, 9.4, -1.6, -0.35, 0.4, -0.6], [-1.6, 11, -2.2, -0.5, -0.2, 0.22], [1.6, 11, -2.2, -0.5, 0.2, -0.22], [-5, 3.4, -1, 0.1, -0.7, 1.35], [5, 3.4, -1, 0.1, 0.7, -1.35]];
    snakeAt.forEach(([x, y, z, rx, ry, rz], si) => {
      const root = group(rig.head, x, y, z, rx, ry, rz), segs = [];
      let p = root;
      const n = 4, seg = 3, bends = [0, -0.4, 0.45, 0.55];
      for (let i = 0; i < n; i++) {
        const g = group(i ? group(p, 0, seg, 0, bends[i] * (si % 3 === 2 ? 0.6 : 1)) : p), w = 2.8 - i * 0.25;
        vox(rig, g, [], {}, [
          { p: [0, seg / 2, 0], s: [w, seg + 0.3, w], c: greens[(i + si) % 3] }, { p: [0, seg / 2, 0], s: [w + 0.5, seg * 0.55, w - 0.6], c: greens[(i + si + 1) % 3] },
          { p: [0, seg / 2, w / 2], s: [w * 0.7, seg * 0.8, 0.3], c: belly }, { p: [0, seg * 0.7, -w / 2], s: [w * 0.5, 0.8, 0.3], c: 0x123a1c },
        ]);
        segs.push(g); p = g;
      }
      const head = group(p, 0, seg + 0.4, 0, 0.1, 0, 0);
      vox(rig, head, [], {}, [
        { p: [0, 0.4, 0.8], s: [3.4, 2.2, 4.2], c: greens[2] }, { p: [0, 1.4, 0.6], s: [2.6, 0.6, 3.6], c: greens[1] }, { p: [0, 0.2, 3.4], s: [2.4, 1.6, 1.8], c: greens[2] },
        { p: [0, -1, 1.6], s: [2.6, 0.7, 3.6], c: belly, r: [0.25, 0, 0] },
        { p: [-1.4, 1.1, 2.2], s: [0.8, 0.8, 0.8], c: 0xffd020, m: 'e' }, { p: [1.4, 1.1, 2.2], s: [0.8, 0.8, 0.8], c: 0xffd020, m: 'e' },
        { p: [0, -0.6, 4.6], s: [0.4, 0.3, 2.4], c: 0xd8202a }, { p: [-0.35, -0.9, 5.9], s: [0.3, 0.9, 0.3], c: 0xd8202a }, { p: [0.35, -0.9, 5.9], s: [0.3, 0.9, 0.3], c: 0xd8202a },
        { p: [-0.9, -0.6, 3.9], s: [0.35, 1, 0.35], c: 0xf4f0e0 }, { p: [0.9, -0.6, 3.9], s: [0.35, 1, 0.35], c: 0xf4f0e0 },
      ]);
      (rig.extras.snakes ??= []).push({ segs, ph: si * 1.7, amp: 0.26, speed: 2.4, head });
    });
    rig.hunch = 0.05;
    return rig;
  },

  // Hephaestus's mechanical queen: the bronze spider at boss size, with a
  // crown of spikes, gears turning in her abdomen and a furnace glow.
  spiders: () => bronzeSpider('boss_spider_queen', { scale: 2.6, queen: true }),

  // Crusty: a big smooth salesman in a white suit and red tie with a red
  // robe over his shoulders, a huge grin and a woodsman's axe.
  procrustes: () => {
    const m = skinMat('boss_procrustes', (S) => paintPerson(S, { skin: 0xd8a07a, hair: 0x141012, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a1a0a, brow: 0x141012, grin: true, top: 0xf8f4ec, jacket: 0xece4d4, lapel: 0xd8ccb8, collar: 0xffffff, trim: 0xb8232f, sleeve: 0xece4d4, hand: 0xd8a07a, pants: 0xece4d4, shoes: 0x2a1a12,
      body: (s) => { s.rect(23, 21, 2, 10, 0xb8232f, 0); s.rect(23, 37, 2, 10, 0xb8232f, 0); } }), { emit: 0, fill: 0.1 });
    const red = solid(0xb8232f, 0, 0.8), redD = solid(0x8a1a22, 0, 0.8);
    const rig = new Rig({ material: m, scale: 2.2, bodyW: 10, bodyD: 6, armW: 4.6, headS: 9, legH: 12, cape: { material: red, segments: 4, length: 26, width: 12 } });
    voxHair(rig, { style: 'mop', base: 0x1a1414, shade: 0x0a0808, light: 0x3a2e2a, seed: 81, cap: true }, 0.88);
    // the red robe panels down the front, with gold edging
    for (const sx of [-1, 1]) { prop(rig, rig.torso, 2.6, 13, 1, red, sx * 4, 6, 3.2); prop(rig, rig.torso, 0.6, 13, 1.1, solid(0xc9963a, 0, 0.4, 0.6), sx * 2.8, 6, 3.3); prop(rig, rig.torso, 3, 2, 7, redD, sx * 5, 12, 0); }
    prop(rig, rig.torso, 2.6, 2, 1, solid(0xffffff), -3, 10.4, 3.1);   // pocket square
    // the axe: long haft, a broad bronze head
    const axe = group(rig.handR, 0, -1, 1.5, -1.3, 0, 0);
    prop(rig, axe, 1.6, 30, 1.6, solid(0x6a4022), 0, 8, 0);
    prop(rig, axe, 1.2, 9, 7, solid(0xc8ccd4, 0.1, 0.3, 0.8), 0, 20, 3.4);
    prop(rig, axe, 1.4, 11, 1.2, solid(0xe8ecf4, 0.3, 0.25, 0.9), 0, 20, 7.2);
    prop(rig, axe, 2, 3, 3, GOLD(), 0, 20, -0.6);
    rig.extras.axe = axe;
    rig.hunch = 0.05;
    return rig;
  },

  // Cerberus: three huge black heads with burning eyes, red mouths, drool and
  // gold spiked collars on one enormous body.
  cerberus: () => {
    const m = skinMat('boss_cerberus', (S) => paintQuad(S, { base: 0x1e1c26, dark: 0x0e0d14, belly: 0x2a2834, back: 0x16141c, eye: 0xff4a0a, eyeLow: 0xffa02a, nose: 0x050505, speckles: 50, brow: 0x0a0a10, teeth: 0xfff4e0,
      custom: (s) => { fur(s, 0, 16, 40, 20, 90, 0x0a0a10, 0x3a3848); fur(s, 0, 0, 32, 16, 30, 0x0a0a10, 0x3a3848); s.box(48, 0, 4, 2, 4, 0xa82030, 0.1); s.rect(52, 4, 4, 1, 0xf4f0e0, 0); s.rect(36, 6, 4, 2, 0xc8283a, 0.1); s.box(52, 16, 2, 3, 1, 0x8a2a3a, 0.1); } }), { emit: 3 });
    const rig = new QuadRig({ material: m, scale: 3.3, bodyL: 14, bodyW: 11, bodyH: 8, legH: 8, legW: 3.8, headS: 7.5, ears: true, tail: 4, tailLen: 9, tailW: 2.2, tailCurl: 0.2, gait: 0.65, neckUp: 4, headZ: 1 });
    const furs = [0x0c0b12, 0x15131d, 0x1e1b28, 0x2a2636, 0x3a3448];
    wolfBody(rig, { fur: furs, seed: 51, chest: 1.05 });
    const heads = [];
    for (const side of [-1, 0, 1]) {
      let neck, head, mouth;
      const hs = side ? 8.4 : 9;
      if (side === 0) { neck = rig.neck; head = rig.head; mouth = rig.mouth; hideSkin(head, mouth); }
      else {
        neck = group(rig.torso, side * 6.6, 8 * 0.3 + 2.4, 14 / 2 - 1.6, 0, side * 0.42, side * -0.12);
        head = group(neck); mouth = group(head, 0, -hs * 0.42, hs * 0.75);
      }
      wolfHead(rig, head, mouth, hs, { fur: furs, eye: 0xe84a08, inner: 0xa0182a, drool: true, seed: 60 + side * 3 });
      // a thick shaggy neck and a gold spiked collar
      vox(rig, neck, side ? [{ e: [0, -1, -2, 4.2, 4.6, 4.6], col: furs, fuzz: 0.4 }] : [], { v: 1, seed: 70 + side }, collarBoxes(side ? 4.4 : 4.8, 12, { y: -1.6, z: 0.2, rx: -0.3 }));
      heads.push({ neck, head, mouth, side, act: 0 });
    }
    rig.extras.heads = heads;
    return rig;
  },

  // Ares: a huge biker in a spiked black leather jacket, a black T-shirt with
  // a red Spartan helmet, ripped trousers, boots, red-hot sunglasses and a
  // burning sword.
  ares: () => {
    const skin = 0xc88a62;
    const m = skinMat('boss_ares', (S) => paintPerson(S, { skin, hair: 0x1a1210, fringe: 1, hairSide: 2, hairBack: 4, eye: 0xff2a0a, eyeWhite: 0xff2a0a, brow: 0x1a1210, beard: 0x1e1612, top: 0x1a1618, jacket: 0x141214, lapel: 0x3a3438, sleeve: 0x141214, hand: skin, pants: 0x3a2c24, shoes: 0x141012,
      body: (s) => { s.rect(21, 22, 6, 2, 0xd8401a, 0); s.rect(22, 24, 4, 4, 0xd8401a, 0); s.px(23, 25, 0x1a1618); s.px(24, 25, 0x1a1618); s.rect(23, 26, 2, 2, 0x1a1618, 0); s.rect(22, 28, 1, 1, 0xd8401a, 0);
        for (let y = 36; y < 48; y += 2) { s.px(21, y, 0xc8c8d0); s.px(26, y, 0xc8c8d0); } s.rect(16, 46, 24, 2, 0x2a2428, 0);
        for (const [u, v] of [[0, 16], [16, 48]]) { s.rect(u + 4, v + 7, 3, 2, skin, 0); s.rect(u + 9, v + 9, 2, 1, skin, 0); s.rect(u, v + 12, 16, 4, 0x141012, 0); } } }), { emit: 1.6 });
    const rig = new Rig({ material: m, scale: 1.95, bodyW: 12, bodyH: 13, bodyD: 6, armW: 5, headS: 8, legH: 13 });
    bruteLimbs(rig, { armLen: 1.1, armThick: 1.2, legThick: 1.35, legX: 3 });
    rig.armSpread = 0.12;
    voxHair(rig, { style: 'spiky', base: 0x1a1210, shade: 0x0a0606, light: 0x3a2a22, seed: 91, cap: true }, 0.72);
    const hs = 8 / 8 * HS;
    // red-hot wraparound sunglasses across the eyes, and a heavy beard
    prop(rig, rig.head, 8.8 * hs, 1.8 * hs, 1, solid(0x1a0a08), 0, 4.5 * hs, 4.5 * hs);
    prop(rig, rig.head, 3.2 * hs, 1.3 * hs, 0.6, solid(0xff3a14, 4), -2.1 * hs, 4.5 * hs, 4.9 * hs);
    prop(rig, rig.head, 3.2 * hs, 1.3 * hs, 0.6, solid(0xff3a14, 4), 2.1 * hs, 4.5 * hs, 4.9 * hs);
    prop(rig, rig.head, 8.4 * hs, 3 * hs, 1.4, solid(0x1e1612, 0, 0.9), 0, 0.9 * hs, 4.3 * hs);
    prop(rig, rig.head, 4 * hs, 1.2 * hs, 1.2, solid(0x1e1612, 0, 0.9), 0, 2.6 * hs, 4.5 * hs);
    // studded spiky shoulders, wristbands, boot buckles
    const silver = solid(0xc8c8d0, 0.1, 0.3, 0.9), leather = solid(0x141214, 0, 0.5);
    for (const arm of [rig.armR, rig.armL]) {
      prop(rig, arm, 6.4, 3, 6.4, leather, 0, 1, 0);
      for (const [x, z] of [[0, 0], [-2, 2], [2, -2], [2, 2], [-2, -2]]) prop(rig, arm, 1, 2, 1, silver, x, 3.4, z);
      prop(rig, arm, 5.6, 2.4, 5.6, leather, 0, -8.5, 0); for (const z of [-1.4, 1.4]) prop(rig, arm, 0.8, 0.8, 0.8, silver, 2.8, -8.5, z);
    }
    prop(rig, rig.torso, 11, 2, 6, leather, 0, 12, 0);
    for (const leg of [rig.legR, rig.legL]) { prop(rig, leg, 5.4, 4, 6, solid(0x141012), 0, -10.6, 0.5); prop(rig, leg, 5.6, 0.8, 1, silver, 0, -9.4, 3.4); }
    prop(rig, rig.torso, 10.6, 1.4, 5.6, solid(0x2a2020), 0, 0.6, 0); prop(rig, rig.torso, 2, 1.6, 1, silver, 0, 0.6, 2.9);
    // the burning sword
    const sword = group(rig.handR, 0, -1, 1, -1.35, 0, 0);
    prop(rig, sword, 1.4, 5, 1.4, solid(0x2a1a10), 0, 0, 0); prop(rig, sword, 6, 1.2, 1.6, GOLD(), 0, 3, 0);
    prop(rig, sword, 2.6, 18, 0.9, solid(0xff6a1a, 3.2), 0, 12.6, 0); prop(rig, sword, 1, 17, 1.1, solid(0xffd84a, 4), 0, 12.4, 0);
    rig.extras.sword = sword;
    // a spear for the thrust, slung on his back until he needs it
    const spear = group(rig.handL, 0, -1, 1, -1.5, 0, 0);
    prop(rig, spear, 1.2, 40, 1.2, solid(0x3a2a1e), 0, 10, 0); prop(rig, spear, 2.6, 6, 0.8, solid(0xd8dce4, 0.4, 0.3, 0.9), 0, 32, 0);
    spear.visible = false; rig.extras.spear = spear;
    // the motorcycle, only out for a charge
    const bike = new THREE.Group(); rig.root.add(bike); bike.visible = false; rig.extras.bike = bike;
    const bm = (w, h, d, mat, x, y, z) => prop(rig, bike, w, h, d, mat, x, y, z);
    const black = solid(0x141214, 0, 0.4, 0.5), chrome = solid(0xd8dce4, 0.1, 0.2, 0.95), tire = solid(0x0a0a0a, 0, 0.9), flame = solid(0xff5a14, 2.6);
    for (const z of [-9, 10]) { bm(2.6, 8, 8, tire, 0, 4, z); bm(2.8, 3, 3, chrome, 0, 4, z); }
    bm(4.4, 4, 15, black, 0, 7.5, 0.5); bm(5, 3, 6, solid(0x8a1a14, 0.3, 0.4, 0.4), 0, 10, 4); bm(3.6, 1.4, 8, solid(0x2a1a14), 0, 10.2, -3);
    bm(9, 0.9, 0.9, chrome, 0, 14, 10); bm(0.9, 6, 0.9, chrome, 0, 11, 10); bm(2, 1.6, 6, chrome, 2.6, 4.4, -5); bm(2.4, 2.4, 1, solid(0xfff2c0, 3), 0, 11, 13);
    for (let i = 0; i < 4; i++) bm(1.2, 1.2, 3, flame, 2.6, 4.4 + (i % 2), -9 - i * 2);
    // the trail of fire behind the exhaust
    return rig;
  },

  // Luke Castellan: sandy curls, a scar down his cheek, the orange camp
  // shirt, and Backbiter, its blade half steel and half celestial bronze.
  luke: () => {
    const skin = 0xe8b890;
    const m = skinMat('boss_luke', (S) => paintPerson(S, { skin, hair: 0xd8a850, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a6ab8, brow: 0xa87a30, frown: true, top: 0xf28c28, sleeve: 0xf28c28, shortSleeve: true, pants: 0x3a5a8a, shoes: 0xf0f0f0,
      face: (s, ey) => { s.px(14, ey + 1, 0xb8402a); s.px(14, ey + 2, 0xb8402a); s.px(13, ey + 3, 0xb8402a); s.px(15, ey, 0xb8402a); },
      body: (s) => { const k = 0x17130f; s.rect(22, 23, 4, 2, k, 0); s.px(21, 22, k); s.px(26, 22, k); s.px(20, 21, k); s.px(27, 21, k); s.px(23, 25, k); s.px(24, 26, k); s.rect(16, 31, 24, 1, 0x5a3a22, 0); for (const [u, v] of [[0, 16], [16, 48]]) s.rect(u, v + 13, 16, 1, 0x2a3a5a, 0); } }), { emit: 0, fill: 0.1 });
    const rig = new Rig({ material: m, scale: 1.3 });
    voxHair(rig, { style: 'shaggy', base: 0xd8a850, shade: 0xa87a30, light: 0xf0d080, seed: 101 }, 1);
    // camp bead necklace
    for (let i = 0; i < 5; i++) prop(rig, rig.torso, 1, 1, 1, solid([0x2a6ab8, 0xc82a1a, 0xf4f0e8, 0x2a8a3a, 0xffd84a][i], 0.3), -2 + i, 11.4, 2.3);
    // Backbiter
    const sword = group(rig.handR, 0, -1, 1, -1.4, 0, 0);
    prop(rig, sword, 1.2, 4.4, 1.2, solid(0x3a2418), 0, 0, 0); prop(rig, sword, 5, 1, 1.4, solid(0x8a8a90, 0, 0.3, 0.9), 0, 2.6, 0);
    prop(rig, sword, 1.5, 17, 0.7, solid(0xc8ccd8, 0.4, 0.2, 0.95), -0.75, 11.5, 0);
    prop(rig, sword, 1.5, 17, 0.7, solid(0xe0a040, 1.2, 0.25, 0.85), 0.75, 11.5, 0);
    prop(rig, sword, 1.2, 1.6, 0.6, solid(0xe0a040, 1.2, 0.25, 0.85), 0, 19.6, 0);
    rig.extras.sword = sword;
    return rig;
  },
};

// Procrustes's "magic fingers" water bed: gilt posts, griffin panels, a red
// mattress. Built on demand when he straps a hero down. Unit: world metres.
let bedMats = null;
export function buildBed() {
  bedMats ??= { gold: solid(0xc9963a, 0.15, 0.35, 0.75), panel: solid(0x241a14, 0, 0.7), red: solid(0xb8232f, 0, 0.8), white: solid(0xf4f0e8, 0, 0.9), griffin: solid(0xd8a840, 0.3, 0.4, 0.7) };
  const M = bedMats, g = new THREE.Group();
  const b = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  b(1.5, 0.4, 2.6, M.panel, 0, 0.4, 0);
  b(1.4, 0.3, 2.4, M.red, 0, 0.75, 0.05); b(1.3, 0.2, 0.5, M.white, 0, 0.9, -1.0);
  for (const [x, z] of [[-0.75, -1.3], [0.75, -1.3], [-0.75, 1.3], [0.75, 1.3]]) { b(0.18, z < 0 ? 1.5 : 1.1, 0.18, M.gold, x, z < 0 ? 0.75 : 0.55, z); b(0.26, 0.2, 0.26, M.gold, x, z < 0 ? 1.55 : 1.15, z); }
  b(1.5, 0.9, 0.12, M.panel, 0, 0.95, -1.3); b(1.5, 0.6, 0.12, M.panel, 0, 0.7, 1.3);
  b(0.5, 0.4, 0.04, M.griffin, 0, 1.0, -1.23); b(0.4, 0.3, 0.04, M.griffin, 0, 0.7, 1.37);
  b(1.56, 0.08, 0.16, M.gold, 0, 1.42, -1.3); b(1.56, 0.08, 0.16, M.gold, 0, 1.02, 1.3);
  return g;
}
