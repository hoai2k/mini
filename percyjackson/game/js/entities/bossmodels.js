// Boss models for The Lightning Thief, after design/concept/vox-bosses-1.png
// (and vox-enemies.png for the Furies and hellhounds, vox-npcs.png for Luke).
// Every skin and prop material is cached, so a boss arriving mid-fight never
// compiles a shader. Each builder returns a Rig or QuadRig; rig.extras holds
// the parts the boss patterns move (whips, heads, beds, the motorcycle).
import * as THREE from 'three/webgpu';
import { vertexColor } from 'three/tsl';
import { Rig, PX, HOLD_PITCH, markTip } from './character.js';
import { QuadRig, paintQuad } from './quad.js';
import { paintPerson } from './mortals.js';
import { buildFury, bronzeSpider, hound, HELLHOUND } from './monsters.js';
import { heroHair, cellMesh, footwear } from './herovox.js';
import { HS, solid, skinMat, group, lavaCracks, fur, sway, rng, bruteLimbs, withBuild } from './parts.js';


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

// a cell's key in the cells map: i, j, k packed into one number (|i| < 1024)
const ckey = (i, j, k) => ((i + 1024) * 2048 + (j + 1024)) * 2048 + (k + 1024);
// Sculpt cells. shapes, in priority order:
//   { e: [cx, cy, cz, rx, ry, rz] }   ellipsoid      { b: [x0, y0, z0, x1, y1, z1] }   box
//   { cap: [x0, y0, z0, x1, y1, z1, r0, r1] }   a tapered capsule between two points
//   col: hex | [hex, ...] (noise clumps) | (x, y, z, n) => hex | null (null leaves the cell to later shapes)
//   m: 'm' metal, 'e' glow, 'f' lit;  cut: true carves instead;  bump: lumpiness;  fuzz: ragged edge
// Returns a Map "i,j,k" -> [Color, materialIndex] on a grid of size v.
function cells(shapes, { v = 1, seed = 1, bump = 0.18, fuzz = 0.12, cellsIn = new Map(), q = false } = {}) {
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
    const n = noise(x * 0.42, y * 0.42, z * 0.42, seed), h = hash3(i, j, k, seed);
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
function voxMesh(rig, parent, opts = {}) {
  const mesh = rig.mesh(kitGeometry(opts, PX), kitMats()); parent.add(mesh);
  return mesh;
}
function kitGeometry({ cells: C = null, v = 1, boxes = [], merge = false } = {}, unit = PX) {
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
// sculpt + boxes in one call
// rig.vd (voxel density): the sculpt grid is made that much finer, so a
// boss made big with its rig scale is carved from more, smaller cells (the
// shapes stay in skin pixels). Set per boss against its triangle budget.
// rig.merge: greedy-mesh the cells (mergedFaces), with the tone jitter in three steps
const vox = (rig, parent, shapes, opts = {}, boxes = []) => { const v = (opts.v ?? 1) / (rig.vd ?? 1); return voxMesh(rig, parent, { cells: shapes.length ? cells(shapes, { ...opts, v, q: !!rig.merge }) : null, v, boxes, merge: !!rig.merge }); };
// hide the rig's own skin boxes on a part (the sculpt replaces them)
const hideSkin = (...parts) => { for (const p of parts) for (const c of p.children) if (c.isMesh) c.visible = false; };
// points along a curve (for horns, tails, tentacles): f(t) -> [x, y, z]
const along = (f, n, r0, r1, col, extra = {}) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), [x, y, z] = f(t); const r = r0 + (r1 - r0) * t; return { e: [x, y, z, r, r, r], col: typeof col === 'function' ? col(t) : col, bump: 0.05, fuzz: 0.05, ...extra }; });

// ---------------------------------------------------------------- shared bits
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
// (spike: the spikes' size; Cerberus at his pass-4 size wears them smaller)
function collarBoxes(r, n, { x = 0, y = 0, z = 0, rx = 0, w = 2.2, spike = 1 } = {}) {
  const B = [], M = new THREE.Matrix4().makeRotationX(rx).setPosition(x, y, z), V = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, seg = 2 * Math.PI * r / n + 0.5;
    V.set(Math.sin(a) * r, Math.cos(a) * r, 0).applyMatrix4(M);
    B.push({ p: [V.x, V.y, V.z], s: [seg, 1.2 * spike, w], c: i % 2 ? 0xd8a032 : 0xc48a26, m: 'm', r: [rx, 0, -a] });
    V.set(Math.sin(a) * (r + 1.3 * spike), Math.cos(a) * (r + 1.3 * spike), 0).applyMatrix4(M);
    B.push({ p: [V.x, V.y, V.z], s: [spike, 2 * spike, spike], c: 0xf0e2b8, m: 'm', r: [rx, 0, -a] });
  }
  return B;
}
// A serpent for a QuadRig's tail (Cerberus): each tail segment sculpted as
// a scaled snake's body, dark green scales in a lattice over a pale belly,
// tapering to a snake's head on the tip with burning eyes, two fangs and a
// forked tongue. The QuadRig curls the chain up over the back (tailCurl),
// so the head rides high and looks forward.
function serpentTail(rig) {
  const segs = rig.tail; if (!segs.length) return;
  const n = segs.length, seg = (rig.spec.tailLen ?? 6) / n, tw = rig.spec.tailW ?? 2;
  const SC = [0x1e3a22, 0x284a2a, 0x335a30], BELLY = [0x9aa070, 0x8a9060];
  const scale = (r) => (x, y, z, nn, h) => {
    if (y < -r * 0.45) return BELLY[Math.floor(h * 2)];                           // belly plates
    const u = Math.floor(z * 1.6), w = Math.floor((Math.atan2(y, x) + Math.PI) * 2.2);
    return (u + w) % 2 ? SC[Math.floor(h * 3)] : 0x14261a;                        // a lattice of scales
  };
  segs.forEach((g, i) => {
    hideSkin(g);
    const r = tw * 0.62 * (1 - i * 0.07);
    vox(rig, g, [{ cap: [0, 0, 0.4, 0, 0, -seg - 0.4, r, r * 0.93], col: scale(r), bump: 0.04, fuzz: 0.04 }], { v: 0.9, seed: 120 + i });
  });
  // the snake's neck rears up and over from the tip, so its head looks
  // forward over Cerberus's back, the way a cobra rears
  const r = tw * 0.62 * (1 - (n - 1) * 0.07), nk = group(rig.tailTip, 0, 0, -seg, 1.1);
  vox(rig, nk, [{ cap: [0, 0, 0.4, 0, 0, -3.2, r * 0.95, r * 0.9], col: scale(r), bump: 0.04, fuzz: 0.04 }], { v: 0.9, seed: 129 });
  const hd = group(nk, 0, 0, -3.2, 1.1);
  vox(rig, hd, [
    { e: [0, 0.2, -1.6, r * 1.25, r * 0.85, 2.4], col: scale(r * 1.1), bump: 0.04, fuzz: 0.04 },
    { e: [0, -0.5, -2.2, r * 1.05, r * 0.45, 2.1], col: BELLY, bump: 0.02, fuzz: 0.02 },
  ], { v: 0.6, seed: 131 }, [
    ...[-1, 1].flatMap((sx) => [
      { p: [sx * r * 0.85, 0.7, -2.1], s: [0.5, 0.55, 0.8], c: 0xffc020, m: 'e' },   // burning eyes
      { p: [sx * r * 0.92, 0.7, -2.2], s: [0.2, 0.5, 0.25], c: 0x140808 },
      { p: [sx * r * 0.45, -0.9, -3.4], s: [0.22, 0.9, 0.22], c: 0xf4ecd4 },         // fangs
      { p: [sx * 0.14, -0.35, -4.6 - 0.35], s: [0.12, 0.1, 0.7], c: 0xd8203a, r: [0, sx * 0.35, 0] },   // the forked tongue
    ]),
    { p: [0, -0.35, -4.2], s: [0.16, 0.12, 0.9], c: 0xd8203a },
    { p: [0, 1, -3.2], s: [r * 1.6, 0.25, 1.4], c: 0x14261a },                         // a dark brow ridge
  ]);
  rig.extras.serpent = hd;
}
// Cerberus's body (pass 4, after vox-bosses-1 and the owner's review: a
// giant's body that dominates its three heads), sculpted muscle by muscle on
// a QuadRig of body 19 x 12 x 22: a deep, broad chest with two pectorals
// over the front legs, heavy shoulder blades and triceps, a shaggy ridge of
// hackles over the withers, a barrel of ribs, a waist tucked up, round
// haunches and a rump; thick legs, the front ones straight and columnar, the
// hind ones bent at the stifle and hock, on great splayed paws with long
// cream claws. Each mass is shaded from dark underneath to lighter on top,
// so the muscles read against each other. o: { fur: [5 tones dark to light], seed }
function cerberusBody(rig, o) {
  const { legH, legW } = rig.dims, F = o.fur, seed = o.seed ?? 9;
  // a mass shaded by height within it, with noise: muscle against muscle
  const mass = (cy, ry, base = 2) => (x, y, z, n) => F[Math.max(0, Math.min(F.length - 1, Math.round(base + 1 + (y - cy) / ry * 1.7 + (n - 0.5) * 1.6)))];
  const E = (cx, cy, cz, rx, ry, rz, extra = {}) => ({ e: [cx, cy, cz, rx, ry, rz], col: mass(cy, ry, extra.base), ...extra });
  hideSkin(rig.torso);
  const both = (f) => [-1, 1].flatMap(f);
  vox(rig, rig.torso, [
    E(0, 6.2, 4, 4.4, 2.6, 7.4, { base: 1.6, fuzz: 0.55, bump: 0.35 }),                 // hackles over the withers
    ...both((s) => [E(s * 6.2, 3.2, 6.5, 4.2, 5.2, 5.2, { base: 2.4 })]),                 // shoulder blades
    ...both((s) => [E(s * 7.2, -2.4, 7.4, 3.4, 4.6, 4.2, { base: 2 })]),                  // triceps
    ...both((s) => [E(s * 3.4, -2.6, 10, 3.6, 5, 3.4, { base: 2.2 })]),                   // pectorals
    E(0, 0.5, 6, 8.2, 7.2, 6.5, { base: 2, fuzz: 0.3 }),                                 // the deep chest
    E(0, 1, -1.5, 7.6, 6.2, 6, { base: 2, fuzz: 0.25 }),                                 // the barrel of ribs
    E(0, 1.8, -6, 6.2, 5, 4, { base: 1.8 }),                                             // the waist, tucked up
    ...both((s) => [E(s * 5.2, 1.4, -8.2, 4.4, 5.6, 4.8, { base: 2.3 })]),                // haunches
    E(0, 2.6, -9.4, 6.4, 4.6, 3.6, { base: 2.2 }),                                       // the rump
    E(0, -4.6, 6, 6, 3, 6, { base: 0.6, fuzz: 0.5 }),                                    // shag under the chest
  ], { v: 1, seed, bump: 0.14, fuzz: 0.14 });
  const claw = 0xe8dcc0;
  for (const leg of rig.legs) {
    hideSkin(leg);
    const front = leg.userData.row === 0, s = leg.userData.side;
    vox(rig, leg, front ? [
      { cap: [0, 2.4, 0.4, 0, -4.4, -0.6, 3.3, 2.7], col: mass(-1, 4.5, 2), fuzz: 0.25 },   // upper arm
      { cap: [0, -4.2, -0.5, 0, -8.6, 0.3, 2.5, 2.1], col: mass(-6.5, 3, 1.6), fuzz: 0.2 },   // forearm
      { e: [0, -6, -2.1, 1.6, 2.6, 1], col: F, fuzz: 0.6, bump: 0.3 },                         // feathering at the back
    ] : [
      { e: [0, -0.4, 0.6, 2.9, 4.6, 3.8], col: mass(-0.4, 4.6, 2.2), fuzz: 0.25 },            // thigh
      { cap: [0, -3.6, -0.4, 0, -6.4, -2.4, 2.4, 1.8], col: mass(-5, 2.5, 1.7), fuzz: 0.2 },  // gaskin
      { cap: [0, -6.4, -2.4, 0, -9, -0.6, 1.8, 1.7], col: mass(-7.7, 2, 1.4), fuzz: 0.15 },   // hock and cannon
    ], { v: 1.05, seed: seed + 3 + leg.userData.row });
    // the paw, level though the leg leans out (QuadRig stance)
    const paw = group(leg, 0, -legH - legW * 0.2, 0, 0, 0, -(rig.spec.stance ?? 0) * s);
    vox(rig, paw, [
      { e: [0, 1.4, front ? 1 : 0.7, 3.3, 1.6, 3.3], col: mass(1.4, 1.6, 2.2), bump: 0.1, fuzz: 0.1 },
      ...[-1.6, -0.55, 0.55, 1.6].map((dx) => ({ e: [dx * 1.3, 0.95, (front ? 3.7 : 3.4) - Math.abs(dx) * 0.35, 0.85, 1, 1.2], col: mass(0.95, 1, 2.6), bump: 0.05, fuzz: 0.05 })),
    ], { v: 0.7, seed: seed + 7 }, [-1.6, -0.55, 0.55, 1.6].map((dx) => ({ p: [dx * 1.3, 0.55, (front ? 5.2 : 4.9) - Math.abs(dx) * 0.35], s: [0.5, 1, 1.9], c: claw, r: [0.55, 0, 0] })));
  }
}

// ---------------------------------------------------------------- people
const shadeOf = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
// Fine features at half-pixel resolution on a res-2 skin (face front x 8..16,
// y 8..16): lidded eyes with irises and catch-lights, shaped brows, a nose
// shadow and a mouth. o: { skin, eye, brow, mouth: 'grin'|'smirk'|'frown'|'set', scowl, scar, stubble }
function fineFace(S, o) {
  const D = (x, y, c, n = 1, m = n) => S.dot(x, y, c, n, m), d = 0.5, ey = 12, skin = o.skin;
  S.rect(8, ey - 2, 8, 6, skin, 0.04);
  D(8, 8, shadeOf(skin, 0.92), 1, 16); D(15.5, 8, shadeOf(skin, 0.92), 1, 16); D(8, 15.5, shadeOf(skin, 0.86), 16, 1);
  if (o.stubble) for (let i = 0; i < 40; i++) D(8.5 + Math.floor(S.r() * 14) / 2, 14 + Math.floor(S.r() * 4) / 2, o.stubble);
  for (const [x0, sg] of [[9, 1], [13, -1]]) {
    const wx = sg > 0 ? x0 : x0 + 1, ix = sg > 0 ? x0 + 1 : x0;
    D(x0 - (sg > 0 ? d : 0), ey, 0x16100c, 5, 1);
    D(wx, ey + d, 0xfaf6f0, 2, 3); D(ix, ey + d, o.eye, 2, 3); D(ix + (sg > 0 ? d : 0), ey + 1, 0x0c0a10, 1, 2); D(ix + (sg > 0 ? 0 : d), ey + d, 0xffffff, 1, 1);
    D(x0, ey + 2, shadeOf(skin, 0.86), 4, 1);
  }
  const by = ey - 1.5, b = o.brow;
  if (o.scowl) { D(8.5, by - d, b, 3, 1); D(9.5, by, b, 3, 2); D(13, by, b, 3, 2); D(14, by - d, b, 3, 1); D(10.5, by + d, b, 2, 1); D(13, by + d, b, 2, 1); }
  else { D(8.5, by, b, 5, 2); D(13, by, b, 5, 2); }
  D(11.5, ey + 2.5, shadeOf(skin, 0.78), 2, 1); D(11, ey + 2, shadeOf(skin, 0.88), 1, 1);
  const my = ey + 3.5, dark = 0x3a1210, teeth = 0xfaf4ea;
  if (o.mouth === 'grin') { D(9.5, my - 1, dark, 10, 3); D(10, my - 1, teeth, 8, 1); D(10.5, my, 0x8a2a22, 6, 1); D(9, my - 1.5, dark, 1, 1); D(14.5, my - 1.5, dark, 1, 1); }
  else if (o.mouth === 'smirk') { D(10.5, my, dark, 5, 1); D(13, my - d, dark, 1, 1); D(13.5, my - 1, dark, 1, 1); D(11, my + d, shadeOf(skin, 0.8), 3, 1); }
  else if (o.mouth === 'frown') { D(10.5, my, dark, 6, 1); D(10, my + d, dark, 1, 1); D(13.5, my + d, dark, 1, 1); }
  else { D(10.5, my, shadeOf(skin, 0.6), 6, 1); }
  // the scar (Luke's): down the right cheek (the face's left, x 8..12) from just under the eye socket
  // to the jaw, as in the books, never across the eye (it starts below the shadow under it, ey + 2)
  if (o.scar) {
    for (const [x, y] of [[10.5, ey + 2.5], [10, ey + 3], [9.5, ey + 3.5], [9, ey + 3.5]]) D(x, y, o.scar, 1, 1);
  }
}
// A res-2 humanoid skin: paintPerson's layout, fine features, then o.detail, shading and colour.
const humanSkin = (id, o, opts = {}) => skinMat(id, (S) => { paintPerson(S, o); fineFace(S, o); o.detail?.(S, (x, y, c, n = 1, m = n) => S.dot(x, y, c, n, m)); S.shadeLimbs(); S.saturate(o.sat ?? 1.2); }, { res: 2, emit: 0, fill: 0.1, ...opts });
// Grid-voxel hair (and beard) from the hero hair styles on a Rig head.
function hairMesh(rig, vox) {
  const hs = (rig.dims.headS / 8) * HS;
  // (the hair cells are as fine as the sculpt: rig.vd)
  const { cells: C, solid: inHead, res } = heroHair({ ...vox, res: rig.vd ?? 1 });
  const mat = kitMats()[0], mesh = cellMesh(C, PX * hs / res, mat, inHead);
  mesh.userData.baseMat = mat; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.hair = mesh;
  return mesh;
}
// Bulk up a standard-layout Rig without breaking its skin: scale the torso
// boxes (w across, d deep) and move the shoulders out to match.
function bulk(rig, { w = 1, d = 1, h = 1, armThick = 1, armLen = 1, legThick = 1, legX = 2 }) {
  for (const c of rig.torso.children) if (c.isMesh) c.scale.set(w, h, d);
  bruteLimbs(rig, { armLen, armThick, legThick, legX });
  const { bodyW, bodyH, armW } = rig.dims;
  for (const [a, s] of [[rig.armR, -1], [rig.armL, 1]]) a.position.set(s * (bodyW * w / 2 + armW * armThick / 2) * PX, (bodyH * h - 2) * PX, 0);
  rig.neck.position.y = bodyH * h * PX;
}
// herovox outfit boxes ({ at, size, col }) as kit boxes, shifted by dy
const kitBoxes = (list, dy = 0) => list.map((b) => ({ p: [b.at[0], b.at[1] + dy, b.at[2]], s: b.size, c: b.col }));

// ---------------------------------------------------------------- builders
// Sculpt grid density per boss (rig.vd, vox above): a hero's cube is about
// 1.32 / (rig scale) of a boss's skin pixels, so the full hero density would
// be vd = 1.32 / (scale * v). Each is set as close to that as its triangle
// budget (about 40k for a boss) allows.
// (cerberus: a coarser body and finer heads, pass 3; its cells are greedy-meshed, rig.merge;
// pass 4: re-sculpted at his new size, the heads smaller, both grids finer)
const VD = { minotaur: 1.5, chimera: 1.55, cerberus: 1.25, cerberusHead: 1.15, procrustes: 1.5, ares: 1.5 };
export const BOSS_MODELS = {
  // Alecto: Mrs. Dodds as she really is (vox-enemies, bottom right)
  alecto: () => withBuild({ key: 'b:alecto' }, () => buildFury('alecto', { scale: 1.75, seed: 71 })),
  megaera: () => withBuild({ key: 'b:megaera' }, () => buildFury('megaera', { scale: 1.6, skin: 0xa8ae98, hair: 0xb8b8b0, wing: 0x4a3424, seed: 72 })),
  tisiphone: () => withBuild({ key: 'b:tisiphone' }, () => buildFury('tisiphone', { scale: 1.6, skin: 0xa8a2a8, hair: 0xf0f0ec, wing: 0x5a2a22, dress: 0x24141a, mouthGrin: false, seed: 73 })),

  // The Minotaur: a towering brown bull-man in white briefs with a gold belt
  // medallion, cream horns, a gold nose ring and red eyes.
  minotaur: () => {
    // the skin boxes are hidden under the sculpt; the material still carries the hit flash and glow
    const m = skinMat('boss_minotaur', (S) => paintPerson(S, { skin: 0x86391c, hair: 0x341810, top: 0x86391c, pants: 0x86391c, shoes: 0x2a2424 }), { emit: 3 });
    const rig = new Rig({ material: m, scale: 2.1, bodyW: 13, bodyH: 13, bodyD: 7, armW: 6, headS: 7.5, legH: 15 });
    rig.vd = VD.minotaur;
    for (const [a, s] of [[rig.armR, -1], [rig.armL, 1]]) a.position.x = s * 11.2 * PX;
    bruteLimbs(rig, { armLen: 1.6, armThick: 1.15, legThick: 1.5, legX: 4 });
    rig.neck.position.z = 1.8 * PX;   // the head thrust forward, low between the shoulders
    rig.neck.position.y = 11.6 * PX;
    hideSkin(rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL);
    // deep red-brown hide, darker fur in the creases, lighter on the muscle tops
    const hide = [0x5e240c, 0x7a3010, 0x903c14, 0xa84a1a], hideL = [0x9a4416, 0xb0521e, 0xc06028], furD = [0x24100a, 0x341810, 0x4a2414];
    const muscle = (x, y, z, n) => (n > 0.6 ? 0xae5228 : null);
    const gold = [0xd8a032, 0xe8b444, 0xc48a26];
    // torso: a barrel chest, slabs of pecs, a hump of trapezius, ridged abs
    vox(rig, rig.torso, [
      // (pass 3: a V from broad shoulders to a narrow waist, two defined pecs
      // with a cleft and a shadow under them, a slimmer gut, as on vox-bosses-1)
      { e: [0, 0.8, 0.4, 5.5, 1.1, 3.9], col: gold, m: 'm', bump: 0.04, fuzz: 0 },
      { e: [0, -0.6, 0.3, 5.7, 1.5, 4.1], col: [0xe8e0c8, 0xd8ccb0, 0xf4eedc], bump: 0.1 },
      { b: [-0.45, 7, 3.2, 0.45, 11.6, 6], col: 0x5a240e, bump: 0 },
      { e: [-2.9, 9.6, 2.4, 3.6, 2.9, 2.5], col: (x, y) => (y < 7.6 ? 0x6a2a10 : hideL[Math.floor(hash3(Math.floor(x), Math.floor(y), 2, 6) * 3)]) }, { e: [2.9, 9.6, 2.4, 3.6, 2.9, 2.5], col: (x, y) => (y < 7.6 ? 0x6a2a10 : hideL[Math.floor(hash3(Math.floor(x), Math.floor(y), 2, 6) * 3)]) },
      { e: [0, 3.6, 1, 4.1, 4.2, 3.3], col: (x, y, z) => z > 3 && (Math.abs(x) < 0.6 || (y > 2 && y < 3) || (y > 4.4 && y < 5.4)) ? 0x5a240e : y > 5.6 ? 0x8e401e : 0x9a4622 },
      { e: [0, 12.2, -0.8, 8.4, 3.2, 4.2], col: (x, y, z) => (z < -2.5 && Math.abs(x) < 3 ? furD[(Math.floor(x + y) & 1) + 1] : hide[Math.floor(hash3(Math.floor(x), Math.floor(y), Math.floor(z), 4) * 4)]) },
      { e: [0, 14, 1, 4, 2.2, 3.2], col: furD, fuzz: 0.4 },
      { e: [-4.6, 8.4, -0.8, 2.4, 4.2, 3], col: hide }, { e: [4.6, 8.4, -0.8, 2.4, 4.2, 3], col: hide },
      { e: [0, 8.6, -0.2, 5.6, 5, 3.6], col: hide },
      { e: [0, 4, 0, 4.3, 4, 3.2], col: hide },
    ], { v: 1, seed: 11, bump: 0.12, fuzz: 0.1 }, [
      // the gold belt medallion
      { p: [0, 0.8, 4.4], s: [3, 3, 0.8], c: 0xe8b444, m: 'm' }, { p: [0, 0.8, 4.4], s: [3, 3, 0.8], c: 0xd8a032, m: 'm', r: [0, 0, Math.PI / 4] },
      { p: [0, 0.8, 4.9], s: [1.7, 1.7, 0.4], c: 0xffd860, m: 'm' }, { p: [0, 0.8, 5.1], s: [0.7, 0.7, 0.3], c: 0x9a6a1a, m: 'm' },
    ]);
    // the loincloth, hanging from the hips with a ragged hem
    vox(rig, rig.hips, [
      { e: [0, -1.4, 0.3, 5.4, 1.9, 4.1], col: [0xece4cc, 0xe0d6bc, 0xd4c8aa] },
      { b: [-3.2, -6.6, 2.8, 3.2, -0.6, 4], col: (x, y, z, n, h) => (y < -5.4 + Math.abs(x) * 0.5 - h * 1.4 ? null : y < -4.4 ? 0xcfc4a6 : [0xece4cc, 0xe0d6bc, 0xf6f0de][Math.floor(h * 3)]), bump: 0 },
      { b: [-2.6, -4.6, -4, 2.6, -0.6, -2.9], col: (x, y, z, n, h) => (y < -3.8 - h * 1.2 ? null : 0xe0d6bc), bump: 0 },
    ], { v: 1, seed: 12 });
    // arms: a ball of shoulder, a bulging bicep, a forearm like a tree trunk, a knuckled fist
    for (const [arm, s] of [[rig.armR, -1], [rig.armL, 1]]) {
      vox(rig, arm, [
        // (pass 3: a rounder deltoid, a slimmer upper arm and elbow, the
        // forearm swelling to the fist, all longer so the fists hang low)
        { e: [s * 0.2, 0.6, 0, 4, 4.2, 4.1], col: hide },
        { e: [0, -4.4, 0.8, 2.5, 4.4, 2.8], col: (x, y, z, n) => (z > 1.8 && n > 0.45 ? 0xa44c24 : hide[Math.floor(n * 3.99)]) },
        { cap: [0, -9, 0.3, 0, -15, 0.7, 2.3, 3.3], col: (x, y, z, n) => (z < -2 ? furD[Math.floor(n * 2.99)] : hide[Math.floor(n * 3.99)]), fuzz: 0.2 },
        { e: [0, -18.2, 1, 3.7, 3.3, 3.9], col: (x, y, z, n) => (y < -20 && z > 2 ? 0x2a1610 : z > 3.2 && (Math.round(x) % 2 === 0) ? 0x9a4622 : 0x74301a), bump: 0.06 },
      ], { v: 1, seed: 20 + s, bump: 0.14 }, [-2.1, -0.7, 0.7, 2.1].map((dx) => ({ p: [dx * 1.1, -21.6, 3.2], s: [1.2, 1.4, 1.6], c: 0x1e1210, r: [0.5, 0, 0] })));
    }
    // legs: thick thighs, shaggy fetlocks and split dark hooves
    for (const [leg, s] of [[rig.legR, -1], [rig.legL, 1]]) {
      vox(rig, leg, [
        { b: [-0.4, -15, 1.2, 0.4, -13.2, 3.8], cut: true },
        { b: [-3.3, -15, -2.6, 3.3, -12.8, 3.6], col: [0x2a2424, 0x3a3232, 0x4a4040], bump: 0, fuzz: 0 },
        { e: [0, -12.2, 0.3, 3.7, 1.7, 3.9], col: furD, fuzz: 0.45, bump: 0.25 },
        { e: [0, -8.8, -0.6, 3, 4.2, 3.3], col: hide },
        { e: [s * 0.4, -3, 0.2, 3.9, 5.8, 4.3], col: (x, y, z, n) => (n > 0.62 ? 0xa44c24 : hide[Math.floor(n * 3.99)]) },
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
    rig.hunch = 0.32; rig.armSpread = 0.3;
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
    rig.vd = VD.chimera;
    const { W, H, L, legH, legW } = rig.dims;
    hideSkin(rig.torso, rig.head, rig.mouth, ...rig.legs, ...rig.tail);
    const tan = [0x9a5e26, 0xb07030, 0xc0803a, 0xcc9048], greyF = [0x4e4448, 0x5e5256, 0x6e6264, 0x7e7270];
    const maneC = [0x7a2404, 0x9a3606, 0xb84a0a, 0xd06410, 0xe88a1c];
    // a lion's chest and forequarters, a goat's shaggy grey haunches
    vox(rig, rig.torso, [
      { e: [0, 1.6, L * 0.4, W * 0.72, H * 0.84, L * 0.18], col: maneC, fuzz: 0.5, bump: 0.3 },
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
        { e: S([0, 0.6, 0.8, 6.8, 7, 4]), col: (x, y, z, n) => (z > 3.4 * k && Math.abs(x) < 4.2 * k && y > -3.4 * k ? null : maneC[Math.min(4, Math.floor(n * 5))]), fuzz: 0.5, bump: 0.3 },
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
    const goat = group(rig.torso, 0, 3, -2.8, 0.25);
    vox(rig, goat, [{ cap: [0, 0, 0, 0, 9, 1.6, 3.2, 2.2], col: greyF, fuzz: 0.4 }], { v: 0.9, seed: 38 });
    const gh = group(goat, 0, 9.4, 2, 0.05);
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
    // Built like the elite hellhound (monsters.js bigHound, after
    // vox-enemies) and never smaller than it: 15% bigger, with the coat, the
    // cracks and the claws worked at that size (parts.js withBuild), so the
    // pack leader is made of more blocks, not bigger ones; a burning ridge of
    // spikes and more fire in its veins set it apart.
    const k = 1.15;
    const rig = withBuild({ k, key: 'b:hellhound_alpha' }, () => hound('boss_hellhound_alpha', HELLHOUND, { fur: 220, cracks: 24, collar: true, alpha: true }));
    rig.baseScale *= k; rig.root.scale.setScalar(rig.baseScale);
    return rig;
  },

  // Medusa: veiled in black with gold trim; writhing green snakes rise from
  // under the hood; her face is never shown, only her eyes when she stares.
  medusa: () => {
    const robe = 0x1a1418;
    const m = skinMat('boss_medusa', (S) => paintPerson(S, { skin: 0x0a0808, eye: 0x0a0808, eyeWhite: 0x0a0808, brow: 0x0a0808, mouth: false, top: robe, collar: 0xc9963a, trim: 0xc9963a, sleeve: robe, hand: 0x9ab890, pants: robe, skirt: robe, skirtLen: 12, shoes: false,
      body: (s) => { s.rect(16, 29, 24, 2, 0xc9963a, 0); s.rect(23, 28, 2, 4, 0xffd84a, 0); for (const [u, v] of [[40, 16], [32, 48]]) s.rect(u, v + 12, 16, 1, 0xc9963a, 0); s.rect(32, 0, 32, 16, robe, 0.08); } }), { emit: 2 });
    const rig = new Rig({ material: m, scale: 1.9, bodyW: 8, bodyD: 5, armW: 4, legH: 12 });
    rig.vd = 1.1;   // (pass 3: a finer grid, the snakes above all, within her budget)
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
    // the snakes: green coils rising round the hood, heads reared outward.
    // (pass 3: as on vox-bosses-1, slimmer and longer, carved from small
    // cells: round scaled bodies with a pale belly and dark bands, curving
    // in an S over six joints, and wedge heads with a snout, glowing eyes,
    // fangs and a forked tongue; no longer chunky boxes)
    const greens = [0x1e5a2a, 0x24703a, 0x2e8444], belly = 0xb8d070;
    const snakeAt = [[-4.2, 7, 1.2, 0.2, -0.5, 0.95], [4.2, 7, 1.2, 0.2, 0.5, -0.95], [-3.6, 9.4, -1.6, -0.35, -0.4, 0.6], [3.6, 9.4, -1.6, -0.35, 0.4, -0.6], [-1.6, 11, -2.2, -0.5, -0.2, 0.22], [1.6, 11, -2.2, -0.5, 0.2, -0.22], [-5, 3.4, -1, 0.1, -0.7, 1.35], [5, 3.4, -1, 0.1, 0.7, -1.35]];
    snakeAt.forEach(([x, y, z, rx, ry, rz], si) => {
      const root = group(rig.head, x, y, z, rx, ry, rz), segs = [];
      let p = root;
      const n = 6, seg = 2.2, bends = [0, -0.32, -0.2, 0.42, 0.4, 0.3];
      for (let i = 0; i < n; i++) {
        const g = group(i ? group(p, 0, seg, 0, bends[i] * (si % 3 === 2 ? 0.6 : 1)) : p), r = 1.4 - i * 0.08;
        const scales = (x, y, z, nn, h) => (z > r * 0.5 ? belly : Math.abs(y - seg * 0.5) < 0.3 && z < 0 ? 0x123a1c : greens[(Math.floor(h * 2.99) + si) % 3]);
        vox(rig, g, [{ cap: [0, -0.2, 0, 0, seg + 0.2, 0, r, r * 0.95], col: scales, bump: 0.04, fuzz: 0.04 }], { v: 0.6, seed: 40 + si * 7 + i });
        segs.push(g); p = g;
      }
      const head = group(p, 0, seg + 0.4, 0, 0.1, 0, 0);
      vox(rig, head, [
        { e: [0, 0.5, 2.5, 1.2, 0.85, 2.1], col: greens[1], bump: 0.04, fuzz: 0.03 },
        { e: [0, -0.4, 1.8, 1.4, 0.6, 2.1], col: belly, bump: 0.03, fuzz: 0.02 },
        { e: [0, 0.45, 0.8, 1.85, 1.2, 1.75], col: (x, y) => (y > 1.1 ? greens[2] : greens[0]), bump: 0.05, fuzz: 0.04 },
      ], { v: 0.6, seed: 60 + si }, [
        { p: [-1.15, 1.05, 1.7], s: [0.7, 0.7, 0.7], c: 0xffd020, m: 'e' }, { p: [1.15, 1.05, 1.7], s: [0.7, 0.7, 0.7], c: 0xffd020, m: 'e' },
        { p: [0, -0.5, 4], s: [0.3, 0.25, 1.8], c: 0xd8202a }, { p: [-0.25, -0.7, 5], s: [0.25, 0.7, 0.25], c: 0xd8202a }, { p: [0.25, -0.7, 5], s: [0.25, 0.7, 0.25], c: 0xd8202a },
        { p: [-0.6, -0.6, 3.1], s: [0.3, 0.8, 0.3], c: 0xf4f0e0 }, { p: [0.6, -0.6, 3.1], s: [0.3, 0.8, 0.3], c: 0xf4f0e0 },
      ]);
      (rig.extras.snakes ??= []).push({ segs, ph: si * 1.7, amp: 0.26, speed: 2.4, head });
    });
    rig.hunch = 0.05;
    return rig;
  },

  // Hephaestus's mechanical queen: the bronze spider at boss size, with a
  // crown of spikes, gears turning in her abdomen and a furnace glow.
  // (each boss built through the kit keeps its geometry for the next build: withBuild key)
  spiders: () => withBuild({ key: 'b:spiders' }, () => bronzeSpider('boss_spider_queen', { scale: 2.6, queen: true })),

  // Crusty: a big smooth salesman in a white suit and red tie with a red
  // robe over his shoulders, a huge grin and a woodsman's axe.
  procrustes: () => {
    const skin = 0xc87c50, cream = 0xe6d6b8, creamD = 0xc8b494, red = 0xb01c24;
    const m = humanSkin('boss_procrustes', { skin, hair: 0x141012, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a1a0a, brow: 0x141012, scowl: true, mouth: 'grin', stubble: shadeOf(skin, 0.8), top: cream, sleeve: cream, hand: skin, pants: cream, shoes: 0x3a2216,
      detail: (S, D) => {
        // the open jacket: lapels, a white shirt, a red tie, waistcoat buttons, a pocket square
        D(22, 20, 0xfaf8f2, 8, 2); D(22.5, 21, 0xfaf8f2, 6, 3); D(23, 22.5, 0xfaf8f2, 4, 3); D(23.5, 24, 0xfaf8f2, 2, 2);
        D(23.5, 20.5, red, 2, 1); D(23.25, 21, red, 3, 2); D(23.5, 22, red, 2, 9); D(23.75, 26.5, 0x7a1018, 1, 1); D(23.5, 26.5, red, 2, 2);
        for (const sx of [-1, 1]) for (let y = 0; y < 5; y++) D(24 + sx * (1.5 + y * 0.5) - (sx < 0 ? 0.5 : 0), 20 + y, creamD, 1, 2);
        for (const y of [27, 28.5, 30]) D(23.75, y, 0x6a4a2a, 1, 1);
        D(16, 31, creamD, 48, 1); D(19.5, 20, shadeOf(cream, 0.9), 1, 12); D(28, 20, shadeOf(cream, 0.9), 1, 12);
        D(25.5, 22, 0xfaf8f2, 2, 1); D(26, 21.5, red, 1, 1);
        for (const [u, v] of [[40, 16], [32, 48]]) { D(u, v + 4 + 8.5, 0xfaf8f2, 32, 1); D(u, v + 4 + 9, skin, 32, 6); }
        for (const [u, v] of [[0, 16], [16, 48]]) { D(u + 5.5, v + 4, creamD, 1, 10); D(u, v + 4 + 9.5, creamD, 32, 1); }
      } }, { scale: 1.95 });
    const redM = solid(0x9a1820, 0, 0.8);
    // (pass 3: a tall, lean man as on vox-bosses-1, not a wide box: a
    // smaller head, longer legs, a slim suit; about the same height)
    const rig = new Rig({ material: m, scale: 1.95, headS: 6.6, bodyH: 13, legH: 16, cape: { material: redM, segments: 4, length: 26, width: 12 } });   // (a cape much longer hangs through the floor)
    rig.vd = VD.procrustes;
    // big and smooth, as the sheet draws him: broad, not boxy
    bulk(rig, { w: 1.18, d: 1.15, armThick: 1.05, armLen: 1.15, legThick: 1.1, legX: 2.3 });
    rig.cape[0].g.parent.position.z = -3.4 * PX;
    hairMesh(rig, { style: 'mop', base: 0x1a1414, shade: 0x0a0808, light: 0x3a2e2a, seed: 81, shape: { c: [0, 7.8, -0.6], r: [4.9, 3, 5.1], bump: 0.15, shell: 1.2, fringe: 7, jag: 1, side: 5, back: 3, tuft: 0.25, spike: 0.03 } });
    // the red robe over his shoulders: a draped yoke and two long gold-edged panels down the front
    const reds = [0x8a1218, 0xa01820, 0xb4222a], gold = [0xd8a032, 0xe8b444];
    const panel = (x, y, z, n, h) => { const ax = Math.abs(x); if (ax < 2.9) return [gold[Math.floor(h * 2)], 'm']; return reds[Math.floor((Math.sin(ax * 2.4) * 0.5 + 0.5) * 1.6 + n * 1.4)]; };
    vox(rig, rig.torso, [
      { e: [0, 13.6, 0.2, 2.6, 2.4, 2.2], cut: true, bump: 0, fuzz: 0 },
      { b: [-2.6, -8.5, 3.5, -6.4, 12.4, 4.7], col: (x, y, z, n, h) => (y < -7.4 + h * 1.4 ? null : panel(x, y, z, n, h)), bump: 0 },
      { b: [2.6, -8.5, 3.5, 6.4, 12.4, 4.7], col: (x, y, z, n, h) => (y < -7.4 + h * 1.4 ? null : panel(x, y, z, n, h)), bump: 0 },
      { e: [0, 12.6, -0.2, 8.6, 2.4, 4.8], col: reds, bump: 0.1, fuzz: 0.05 },
      { b: [-2.4, 4, 3.3, -0.6, 11.6, 3.9], col: (x, y) => (Math.abs(x) > 2.3 - (11.6 - y) * 0.05 - 0.6 || y > 10 ? 0xd8c8a8 : null), bump: 0 }, { b: [0.6, 4, 3.3, 2.4, 11.6, 3.9], col: (x, y) => (Math.abs(x) > 2.3 - (11.6 - y) * 0.05 - 0.6 || y > 10 ? 0xd8c8a8 : null), bump: 0 },
    ], { v: 0.8, seed: 82 }, [
      { p: [0, 13.8, 3.6], s: [3.4, 1, 1], c: 0xfaf8f2 },
    ]).scale.set(0.68, 1, 0.66);   // (drawn for a broader build: fitted to his)
    // shoe shine and trouser cuffs
    for (const leg of [rig.legR, rig.legL]) vox(rig, leg, [], {}, [{ p: [0, -15.4, 0.8], s: [7.2, 1.4, 8.2], c: 0x2a1810 }, { p: [0, -14.2, 0.5], s: [7, 1.2, 7.6], c: 0x4a2c1a }, { p: [0, -13.3, 0], s: [7, 0.7, 7], c: creamD }]).scale.set(0.68, 1, 0.68);
    // the axe: long haft, a broad steel head, a gold collar
    const axe = group(rig.handR, 0, -1, 1.5, HOLD_PITCH, 0, 0);   // (along +y: see the hand-axis convention in character.js)
    vox(rig, axe, [], {}, [
      { p: [0, 8, 0], s: [1.6, 30, 1.6], c: 0x6a4022 }, { p: [0, -6, 0], s: [2, 2, 2], c: 0x4a2c16 },
      { p: [0, 20, 3.4], s: [1.2, 9, 7], c: 0xb8bcc4, m: 'm' }, { p: [0, 20, 7.2], s: [1.4, 11, 1.2], c: 0xe8ecf4, m: 'm' }, { p: [0, 20, -0.6], s: [2, 3, 3], c: 0xd8a032, m: 'm' },
    ]);
    markTip(axe, 0, 23, 0, 'axe'); rig.extras.axe = axe;
    rig.hunch = 0.05; rig.armSpread = 0.3;
    return rig;
  },

  // Cerberus: three huge black heads with burning eyes, red mouths, drool and
  // gold spiked collars on one enormous body, and a serpent for a tail.
  // (pass 4, the owner's review against vox-bosses-1: the body is far bigger
  // for its heads, broad and deep, crouched on thick legs planted wide;
  // and then the whole of him made far bigger, at the owner's asking and
  // after the book ("twice the size of a woolly mammoth"), so he towers over
  // every hellhound, the alpha and Shadowfang too: about 7.75 blocks tall at
  // rest (3.5 Percys, 1.2 Shadowfangs), 8.6 wide and 13 long, tail included; bosses.js
  // and bosses-book1.js size his stats and attacks to match)
  cerberus: () => {
    const m = skinMat('boss_cerberus', (S) => paintQuad(S, { base: 0x1e1c26, dark: 0x0e0d14, belly: 0x2a2834, back: 0x16141c, eye: 0xff4a0a, eyeLow: 0xffa02a, nose: 0x050505, speckles: 50, brow: 0x0a0a10, teeth: 0xfff4e0,
      custom: (s) => { fur(s, 0, 16, 40, 20, 90, 0x0a0a10, 0x3a3848); fur(s, 0, 0, 32, 16, 30, 0x0a0a10, 0x3a3848); s.box(48, 0, 4, 2, 4, 0xa82030, 0.1); s.rect(52, 4, 4, 1, 0xf4f0e0, 0); s.rect(36, 6, 4, 2, 0xc8283a, 0.1); s.box(52, 16, 2, 3, 1, 0x8a2a3a, 0.1); } }), { emit: 3 });
    const rig = new QuadRig({ material: m, scale: 6.1, bodyL: 22, bodyW: 19, bodyH: 12, legH: 9, legW: 5.6, legY: 1, legSpread: 1.6, stance: 0.2, legsOnTorso: true, headS: 6, ears: true, tail: 6, tailLen: 22, tailW: 2.6, tailCurl: 0.3, gait: 0.6, neckUp: 2.4, headZ: 1.4 });
    const { W, H, L } = rig.dims;
    rig.vd = VD.cerberus; rig.merge = true;
    const furs = [0x0c0b12, 0x15131d, 0x1e1b28, 0x2a2636, 0x3a3448];
    cerberusBody(rig, { fur: [0x08070c, ...furs, 0x4c4660], seed: 51 });   // (two more tones, so the muscles read)
    const heads = [];
    for (const side of [-1, 0, 1]) {
      let neck, head, mouth;
      const hs = side ? 5.6 : 6;   // (pass 4: heads in a giant dog's proportion, the body dominating)
      if (side === 0) { neck = rig.neck; head = rig.head; mouth = rig.mouth; hideSkin(head, mouth); }
      else {
        neck = group(rig.torso, side * W * 0.36, H * 0.3 + 1.4, L / 2 - 0.4, 0, side * 0.5, side * -0.15);
        head = group(neck); mouth = group(head, 0, -hs * 0.42, hs * 0.75);
      }
      rig.vd = VD.cerberusHead;   // (the heads, where the eye goes, at a finer grid than the body)
      wolfHead(rig, head, mouth, hs, { fur: furs, eye: 0xe84a08, inner: 0xa0182a, drool: true, seed: 60 + side * 3 });
      rig.vd = VD.cerberus;
      // a thick shaggy neck rising out of the chest, and a gold spiked collar
      const nr = side ? 3.3 : 3.6;
      vox(rig, neck, [{ cap: [0, -4.4, -5, 0, -0.4, 0.6, nr * 1.2, nr], col: furs, fuzz: 0.4, bump: 0.2 }], { v: 1, seed: 70 + side }, collarBoxes(nr + 0.7, 14, { y: -1.4, z: -0.6, rx: -0.6, w: 1.4, spike: 0.6 }));
      heads.push({ neck, head, mouth, side, act: 0 });
    }
    rig.extras.heads = heads;
    serpentTail(rig);
    return rig;
  },

  // Ares: a huge biker in a spiked black leather jacket, a black T-shirt with
  // a red Spartan helmet, ripped trousers, boots, red-hot sunglasses and a
  // burning sword.
  ares: () => {
    const skin = 0xb8683e, leather = 0x161416, ember = 0xe8501a;
    const HELMET = ['....##....', '...####...', '..######..', '.########.', '.########.', '.##....##.', '.##.##.##.', '.##.##.##.', '.###..###.', '..##..##..', '..##..##..'];
    const m = humanSkin('boss_ares', { skin, hair: 0x141010, fringe: 1, hairSide: 2, hairBack: 4, eye: 0x2a1a10, brow: 0x141010, scowl: true, mouth: 'set', stubble: 0x2a1c16, top: 0x1c181a, jacket: leather, lapel: 0x3a3438, sleeve: skin, hand: 0x1e1a1a, pants: 0x4a3626, shoes: 0x141214, sat: 1.25,
      detail: (S, D) => {
        HELMET.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') D(21.5 + x * 0.5, 22 + y * 0.5, ember); }));
        for (let y = 36; y < 47; y += 1) { D(21.5, y, 0xc8c8d0, 1, 1); D(26, y + 0.5, 0xc8c8d0, 1, 1); }
        // short leather sleeves: bare forearms below
        for (const [u, v] of [[40, 32], [48, 48]]) S.ctx.clearRect(u, v + 4 + 6, 16, 6);
        for (const [u, v] of [[40, 32], [48, 48]]) D(u, v + 4 + 5.5, 0x3a3438, 32, 1);
        for (const [u, v] of [[40, 16], [32, 48]]) { D(u + 4, v + 4 + 3, shadeOf(skin, 0.85), 4, 4); D(u + 4, v + 4 + 9, 0x2a2224, 32, 3); }
        // cargo pockets, rips at the knees, boot tops
        for (const [u, v] of [[0, 16], [16, 48]]) { D(u, v + 4 + 2, 0x3a2a1c, 8, 4); D(u + 4.5, v + 4 + 5, skin, 3, 2); D(u + 5, v + 4 + 4.5, 0xc8b8a0, 2, 1); D(u, v + 4 + 7, 0x141214, 32, 5); D(u + 1, v + 4 + 3, 0x5a4432, 2, 2); }
      } }, { scale: 1.95 });
    // (pass 3: as on vox-bosses-1, a smaller head, longer legs and an open
    // leather jacket over a narrower waist; the chest and arms stay huge)
    const rig = new Rig({ material: m, scale: 1.95, headS: 6.4, legH: 16 });
    rig.vd = VD.ares;
    // a huge biker, but a man's build: less of a box than he was
    const AT = 1.72, LT = 1.5, aw = 4 * AT, lw = 4 * LT;
    bulk(rig, { w: 1.3, d: 1.3, h: 1.08, armThick: AT, armLen: 1.12, legThick: LT, legX: 3.3 });
    rig.armSpread = 0.2;
    // (pass 3: a short crop and a trimmed beard, so his face shows as on the sheet)
    hairMesh(rig, { style: 'spiky', base: 0x1a1210, shade: 0x0a0606, light: 0x3a2a22, seed: 91, shape: { c: [0, 7.8, -0.4], r: [4.5, 1.8, 4.7], bump: 0.1, shell: 0.7, fringe: 7.6, jag: 0.4, side: 6, back: 3.6, tuft: 0.15, spike: 0.03 }, beard: { length: 2, mouth: 1 } });
    const hs = HS * rig.dims.headS / 8;
    // red-hot wraparound sunglasses
    vox(rig, rig.head, [], {}, [
      { p: [0, 4.6 * hs, 4.75 * hs], s: [9.4 * hs, 1.9 * hs, 0.6], c: 0x120808 },
      { p: [-2.1 * hs, 4.6 * hs, 4.95 * hs], s: [3.4 * hs, 1.4 * hs, 0.6], c: 0xff3a10, m: 'e' }, { p: [2.1 * hs, 4.6 * hs, 4.95 * hs], s: [3.4 * hs, 1.4 * hs, 0.6], c: 0xff3a10, m: 'e' },
      { p: [-4.7 * hs, 4.8 * hs, 2], s: [0.6, 0.8, 5], c: 0x120808 }, { p: [4.7 * hs, 4.8 * hs, 2], s: [0.6, 0.8, 5], c: 0x120808 },
    ]);
    // the jacket: a raised collar, studs, spikes along the shoulders, a studded belt
    const silver = 0xd0d0d8, spike = (x, y, z, r = [0, 0, 0], k = 1) => [{ p: [x, y, z], s: [1.6 * k, 1.4 * k, 1.6 * k], c: silver, m: 'm', r }, { p: [x, y + 1.2 * k, z], s: [0.9 * k, 1.4 * k, 0.9 * k], c: 0xf0f0f4, m: 'm', r }];
    // the open jacket, carved: each side swells from the waist to a deep
    // chest and broad shoulders; the front stays open on the T-shirt
    const gap = (y) => 1.7 + Math.max(0, y - 4) * 0.2;
    const jacketCol = (x, y, z, n) => (z > 0.6 && Math.abs(x) < gap(y) ? null : z > 0.6 && Math.abs(x) < gap(y) + 0.7 ? 0x3a3438 : [0x161416, 0x1e1a1c, 0x242022][Math.floor(n * 2.99)]);
    vox(rig, rig.torso, [-1, 1].map((sx) => ({ cap: [sx * 3, 1.6, 0, sx * 4.2, 11.4, -0.2, 3, 3.9], col: jacketCol, bump: 0.06, fuzz: 0.04 })), { v: 0.8, seed: 94 });
    vox(rig, rig.torso, [], {}, [
      { p: [-4.4, 13.6, -0.2], s: [3, 2.4, 7.4], c: leather, r: [0, 0, 0.35] }, { p: [4.4, 13.6, -0.2], s: [3, 2.4, 7.4], c: leather, r: [0, 0, -0.35] },
      { p: [0, 14, -3.6], s: [6.4, 2.6, 1], c: leather },
      { p: [-3.9, 9.4, 4.05], s: [2.6, 6.4, 0.7], c: 0x2a2628, r: [0, 0, -0.22] }, { p: [3.9, 9.4, 4.05], s: [2.6, 6.4, 0.7], c: 0x2a2628, r: [0, 0, 0.22] },
      { p: [-2.7, 3.8, 4], s: [0.5, 7.4, 0.5], c: silver, m: 'm' }, { p: [2.7, 3.8, 4], s: [0.5, 7.4, 0.5], c: silver, m: 'm' },
      ...spike(-3.6, 14.8, -3, [0, 0, 0.3]), ...spike(3.6, 14.8, -3, [0, 0, -0.3]), ...spike(0, 15.4, -3.6), ...spike(-6.6, 13.4, -1.6, [0, 0, 0.6]), ...spike(6.6, 13.4, -1.6, [0, 0, -0.6]),
      { p: [0, 0.6, 0], s: [16.6, 1.6, 7.8], c: 0x1e1a1a }, { p: [0, 0.6, 3.95], s: [2.6, 2, 0.6], c: silver, m: 'm' },
      ...[-6.4, -4.4, 4.4, 6.4].map((x) => ({ p: [x, 0.6, 3.95], s: [0.7, 0.7, 0.5], c: silver, m: 'm' })),
      ...[[-4.6, 10], [4.6, 10], [-4.8, 5.4], [4.8, 5.4]].map(([x, y]) => ({ p: [x, y, 3.85], s: [0.8, 0.8, 0.5], c: silver, m: 'm' })),
    ]).scale.set(0.74, 1, 0.8);   // (drawn for a broader build: fitted to his)
    hideSkin(rig.armR, rig.armL);
    const skinT = [shadeOf(skin, 0.86), skin, shadeOf(skin, 1.1)];
    for (const [arm, sx] of [[rig.armR, -1], [rig.armL, 1]]) {
      // rounded arms: a leather-sleeved bicep, a bare forearm like a ham, a gloved fist
      vox(rig, arm, [
        { e: [0, -11.6, 0.6, aw / 2 + 0.5, 2.2, aw / 2 + 0.7], col: [0x1e1a1a, 0x2a2424], bump: 0.05, fuzz: 0.04 },
        { e: [0, -6.4, 0.2, aw / 2 + 0.9, 3.6, aw / 2 + 0.9], col: skinT, bump: 0.1, fuzz: 0.06 },
        { e: [0, -1.6, 0, aw / 2 + 0.9, 3.2, aw / 2 + 0.9], col: [0x161416, 0x221e20], bump: 0.08, fuzz: 0.04 },
      ], { v: 0.8, seed: 93 + sx });
      vox(rig, arm, [], {}, [
        { p: [0, 1.4, 0], s: [aw + 1, 3.8, aw + 1], c: leather },
        ...spike(sx * 1.6, 3.8, 0, [0, 0, -sx * 0.3]), ...spike(sx * 1.8, 3.4, 2.4, [0.3, 0, -sx * 0.3]), ...spike(sx * 1.8, 3.4, -2.4, [-0.3, 0, -sx * 0.3]), ...spike(sx * (aw / 2 + 0.6), 1.4, 0, [0, 0, -sx * 1.2], 0.9),
        { p: [0, -9.4, 0], s: [aw + 0.6, 2.8, aw + 0.6], c: 0x1e1a1a }, ...[[-1.9, aw / 2 + 0.35], [1.9, aw / 2 + 0.35]].flatMap(([x, z]) => [{ p: [x, -9.4, z], s: [0.8, 0.8, 0.4], c: silver, m: 'm' }, { p: [x, -9.4, -z], s: [0.8, 0.8, 0.4], c: silver, m: 'm' }]),
      ]);
    }
    for (const leg of [rig.legR, rig.legL]) vox(rig, leg, [], {}, [
      { p: [0, -15.4, 1], s: [lw + 0.8, 1.4, lw + 2.2], c: 0x0e0c0e }, { p: [0, -13.2, 0.6], s: [lw + 0.6, 3, lw + 1.4], c: 0x1a1618 }, { p: [0, -10.2, 0], s: [lw + 0.4, 3.2, lw + 0.4], c: 0x1a1618 },
      { p: [0, -13.4, 0.6], s: [lw + 0.9, 0.7, lw + 1.7], c: 0x3a3436 }, { p: [0, -10.6, 0], s: [lw + 0.7, 0.7, lw + 0.7], c: 0x3a3436 },
      { p: [lw / 2 - 1, -13.4, lw / 2 + 1.4], s: [1.3, 1.1, 0.4], c: silver, m: 'm' }, { p: [lw / 2 - 1, -10.6, lw / 2 + 0.4], s: [1.3, 1.1, 0.4], c: silver, m: 'm' },
    ]);
    // the burning sword: gold guard, a blade of fire, flames licking off it
    const sword = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);   // (along +y: see the hand-axis convention in character.js)
    const fl = rng(92), flames = [];
    // (pass 3: a bigger blaze of loose fire cubes round the blade, as on the sheet)
    for (let i = 0; i < 44; i++) { const t = fl(), y = 5 + t * 18, w = 0.8 + fl() * 1.8; flames.push({ p: [(fl() - 0.5) * 5.6 * (1 - t * 0.35), y + fl() * 2.4, (fl() - 0.5) * 1.6], s: [w, w * 1.3, w * 0.8], c: [0xff3a00, 0xff6a08, 0xffa020, 0xffd040][Math.floor(fl() * 4)], m: 'e' }); }
    vox(rig, sword, [], {}, [
      { p: [0, 0, 0], s: [1.4, 5, 1.4], c: 0x2a1a10 }, { p: [0, -2.8, 0], s: [2, 1.4, 2], c: 0xd8a032, m: 'm' }, { p: [0, 3, 0], s: [6.4, 1.4, 1.8], c: 0xd8a032, m: 'm' }, { p: [0, 3.2, 0], s: [2, 2, 2], c: 0xe8b444, m: 'm' },
      { p: [0, 12.6, 0], s: [2.6, 18, 0.9], c: 0xff6a10, m: 'e' }, { p: [0, 12.4, 0], s: [1, 17, 1.1], c: 0xffc040, m: 'e' }, { p: [0, 22.4, 0], s: [1.6, 1.8, 0.9], c: 0xff8a10, m: 'e' },
      ...flames,
    ]);
    markTip(sword, 0, 23.3, 0, 'burning sword'); rig.extras.sword = sword;
    // a spear for the thrust (a 'punch' with the right arm), in place of the sword while he needs it
    const spear = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);
    vox(rig, spear, [], {}, [{ p: [0, 10, 0], s: [1.2, 40, 1.2], c: 0x3a2a1e }, { p: [0, 32, 0], s: [2.6, 6, 0.8], c: 0xd8dce4, m: 'm' }, { p: [0, 35.6, 0], s: [1.2, 2, 0.6], c: 0xd8dce4, m: 'm' }, { p: [0, 29, 0], s: [1.8, 1.2, 1.8], c: 0xd8a032, m: 'm' }]);
    markTip(spear, 0, 36.6, 0, 'spear'); spear.visible = false; rig.extras.spear = spear;
    // the motorcycle, only out for a charge
    const bike = new THREE.Group(); rig.root.add(bike); bike.visible = false; rig.extras.bike = bike;
    const blk = 0x141214, chrome = 0xd8dce4, tire = 0x0a0a0a;
    vox(rig, bike, [], {}, [
      ...[-9, 10].flatMap((z) => [{ p: [0, 4, z], s: [2.6, 8, 8], c: tire }, { p: [0, 4, z], s: [2.6, 6, 9], c: tire }, { p: [0, 4, z], s: [2.8, 3, 3], c: chrome, m: 'm' }]),
      { p: [0, 7.5, 0.5], s: [4.4, 4, 15], c: blk }, { p: [0, 10, 4], s: [5, 3, 6], c: 0x8a1a14, m: 'm' }, { p: [0, 10.2, -3], s: [3.6, 1.4, 8], c: 0x2a1a14 },
      { p: [0, 14, 10], s: [9, 0.9, 0.9], c: chrome, m: 'm' }, { p: [0, 11, 10], s: [0.9, 6, 0.9], c: chrome, m: 'm' }, { p: [2.6, 4.4, -5], s: [2, 1.6, 6], c: chrome, m: 'm' }, { p: [0, 11, 13], s: [2.4, 2.4, 1], c: 0xfff2c0, m: 'e' },
      ...Array.from({ length: 4 }, (_, i) => ({ p: [2.6, 4.4 + (i % 2), -9 - i * 2], s: [1.2, 1.2, 3], c: 0xff5a14, m: 'e' })),
    ]);
    return rig;
  },

  // Luke Castellan: sandy curls, a scar down his cheek, the orange camp
  // shirt, and Backbiter, its blade half steel and half celestial bronze.
  luke: () => {
    const skin = 0xe0a074, orange = 0xe05200;
    const PEG = ['.......##.', '..#....###', '.###..###.', '#####.##..', '.#########', '..#######.', '..##..##..', '..#....#..'];
    const m = humanSkin('boss_luke', { skin, hair: 0xd8a040, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a7ad8, brow: 0xa87020, mouth: 'smirk', scar: 0xb02a1e, top: orange, sleeve: orange, shortSleeve: true, pants: 0x2a4a80, shoes: 0x18161c, sat: 1.4,
      detail: (S, D) => {
        PEG.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') D(21.5 + x * 0.5, 22.5 + y * 0.5, 0x17130f); }));
        D(21.5, 20, shadeOf(orange, 0.75), 10, 1); D(16, 31.5, shadeOf(orange, 0.8), 48, 1);
        D(16, 30, 0x5a3418, 48, 1); D(23, 29.75, 0xd8a840, 4, 2);   // belt and buckle peeking under the hem
        for (const [u, v] of [[40, 16], [32, 48]]) D(u, v + 4 + 4.5, shadeOf(orange, 0.8), 32, 1);
        for (const [u, v] of [[0, 16], [16, 48]]) { D(u + 5.5, v + 4, 0x1e3a68, 1, 10); D(u + 4.5, v + 4 + 1, 0x3a5a90, 2, 2); D(u, v + 4 + 8.5, 0x3a5a90, 32, 1.5); D(u + 4, v + 4 + 5, 0x22406e, 4, 1); }
      } });
    const rig = new Rig({ material: m, scale: 1.3 });
    hairMesh(rig, { style: 'mop', base: 0xe09a28, shade: 0xa86410, light: 0xf8c850, warm: 0xc87a18, seed: 101, shape: { c: [0, 7.4, -0.6], r: [5.6, 4.4, 5.8], bump: 0.4, fringe: 6.4, jag: 1.4, side: 3, back: 1, tuft: 0.24, spike: 0.05 } });
    // hi-top sneakers, rolled jean cuffs, a camp bead necklace
    for (const leg of [rig.legR, rig.legL]) vox(rig, leg, [], {}, [...kitBoxes(footwear('hitop', { upper: 0x18161c, sole: 0xf0ece0, lace: 0xf0ece0 })), { p: [0, -7.6, 0], s: [4.6, 1, 4.6], c: 0x3a5a90 }]);
    vox(rig, rig.torso, [], {}, [
      ...[0x2a6ab8, 0xc82a1a, 0xf4f0e8, 0x2a8a3a, 0xffd84a].map((c, i) => ({ p: [-2 + i, 11.3 - (i === 2 ? 0.4 : Math.abs(i - 2) === 1 ? 0.2 : 0), 2.3], s: [0.8, 0.8, 0.6], c })),
      // the scabbard at his hip
      { p: [-4.6, 0, 1], s: [1.4, 13, 1.8], c: 0x5a3018, r: [0.25, 0, -0.12] }, { p: [-5.4, -6.2, 2.6], s: [1.6, 1.6, 2], c: 0xd8a032, m: 'm', r: [0.25, 0, -0.12] }, { p: [-3.8, 6.4, -0.6], s: [1.8, 1.2, 2.2], c: 0xd8a032, m: 'm', r: [0.25, 0, -0.12] },
    ]);
    // Backbiter: half steel, half celestial bronze
    const sword = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);   // (along +y: see the hand-axis convention in character.js)
    vox(rig, sword, [], {}, [
      { p: [0, 0, 0], s: [1.2, 4.4, 1.2], c: 0x3a2418 }, { p: [0, -2.4, 0], s: [1.6, 1, 1.6], c: 0xd8a032, m: 'm' }, { p: [0, 2.6, 0], s: [5, 1, 1.4], c: 0x8a8a90, m: 'm' },
      { p: [-0.75, 11.5, 0], s: [1.5, 17, 0.7], c: 0xc8ccd8, m: 'm' }, { p: [0.75, 11.5, 0], s: [1.5, 17, 0.7], c: 0xe0a040, m: 'm' }, { p: [0, 20.4, 0], s: [1.6, 1.4, 0.6], c: 0xe0a040, m: 'm' },
    ]);
    markTip(sword, 0, 21.1, 0, 'Backbiter'); rig.extras.sword = sword;
    return rig;
  },
};

// Procrustes's "magic fingers" water bed: gilt posts with knobbed finials,
// black panels framed in gold with gold griffins, a quilted red mattress and
// white pillows, after vox-bosses-1. Built on demand when he straps a hero
// down. One merged mesh; unit: world metres.
const GRIFFIN = ['.##.......', '####...##.', '.#####.###', '..########', '..#######.', '.###..###.', '.#.#...#.#', '.#.#...#.#'];
let bedGeo = null;
export function buildBed() {
  if (!bedGeo) {
    const B = [], gold = 0xd8a032, goldL = 0xf0c050, goldD = 0xa87420, black = 0x1a1414, red = 0xb01c24, redD = 0x8a141a, white = 0xf4f0e8;
    const b = (x, y, z, w, h, d, c, m) => B.push({ p: [x, y, z], s: [w, h, d], c, m });
    // a black panel with a gold frame and a pair of griffins; n = outward normal axis
    const panel = (x, y, z, w, h, axis, sgn) => {
      const t = 0.06, f = 0.05;
      if (axis === 'z') { b(x, y, z, w, h, t, black); b(x, y + h / 2, z, w, f, t + 0.02, gold, 'm'); b(x, y - h / 2, z, w, f, t + 0.02, gold, 'm'); }
      else { b(x, y, z, t, h, w, black); b(x, y + h / 2, z, t + 0.02, f, w, gold, 'm'); b(x, y - h / 2, z, t + 0.02, f, w, gold, 'm'); }
      const px = Math.min(0.035, h * 0.6 / 8), n = Math.max(1, Math.floor(w / (px * 14)));
      for (let k = 0; k < n; k++) {
        const cx = (k - (n - 1) / 2) * (w / n), flip = k % 2 ? -1 : 1;
        GRIFFIN.forEach((row, j) => [...row].forEach((ch, i) => {
          if (ch !== '#') return;
          const u = cx + flip * (i - 4.5) * px, vv = y + (3.5 - j) * px;
          if (axis === 'z') b(x + u, vv, z + sgn * (t / 2 + 0.008), px, px, 0.016, goldL, 'm');
          else b(x + sgn * (t / 2 + 0.008), vv, z + u, 0.016, px, px, goldL, 'm');
        }));
      }
    };
    // posts: base block, shaft, collar, cap and a knob
    for (const [x, z, top] of [[-0.75, -1.3, 1.5], [0.75, -1.3, 1.5], [-0.75, 1.3, 1.1], [0.75, 1.3, 1.1]]) {
      b(x, 0.12, z, 0.26, 0.24, 0.26, goldD, 'm'); b(x, top / 2, z, 0.18, top, 0.18, gold, 'm');
      b(x, top * 0.62, z, 0.24, 0.08, 0.24, goldD, 'm'); b(x, top + 0.04, z, 0.26, 0.08, 0.26, goldL, 'm'); b(x, top + 0.14, z, 0.16, 0.12, 0.16, gold, 'm'); b(x, top + 0.24, z, 0.08, 0.08, 0.08, goldL, 'm');
    }
    // frame, panels, rails
    b(0, 0.32, 0, 1.4, 0.16, 2.5, 0x2a1e18);
    panel(0, 1.02, -1.3, 1.32, 0.66, 'z', 1); panel(0, 0.62, 1.3, 1.32, 0.46, 'z', 1);
    panel(-0.75, 0.52, 0, 2.42, 0.36, 'x', -1); panel(0.75, 0.52, 0, 2.42, 0.36, 'x', 1);
    b(0, 1.4, -1.3, 1.5, 0.07, 0.14, goldL, 'm'); b(0, 0.9, 1.3, 1.5, 0.07, 0.14, goldL, 'm');
    // quilted red mattress, a turned-down white sheet, a pillow
    b(0, 0.8, 0.08, 1.34, 0.22, 2.36, red);
    for (let i = 0; i < 6; i++) b(0, 0.915, 0.95 - i * 0.3, 1.36, 0.02, 0.04, redD);
    b(0, 0.92, -0.62, 1.36, 0.06, 0.3, white); b(0, 0.98, -1.02, 1.1, 0.14, 0.4, white); b(0, 1.06, -1.02, 0.9, 0.05, 0.3, 0xffffff);
    bedGeo = kitGeometry({ boxes: B }, 1);
  }
  const g = new THREE.Group(), m = new THREE.Mesh(bedGeo, kitMats());
  m.castShadow = true; m.receiveShadow = true; g.add(m);
  return g;
}
