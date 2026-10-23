// Hero voxel detail, after the 3D hero sheets (design/concept/vox-*.png).
//
// Hair: a grid of one-pixel cubes (head pixels) filling a lumpy shell around
// the head, with curls pushed out of the outline, a jagged fringe and tones
// that come in clumps (shade, base, highlight), so it reads as the chunky
// curly hair of the sheets. Faces hidden against another cube or inside the
// head are dropped, so a full head of hair costs a few thousand triangles.
//
// Outfit: chunky shoes and boots, rolled cuffs, socks, bead necklaces, belt
// buckles, wristbands, torn flannel edges and goat fur, as small boxes with
// vertex colours hung on the rig's limbs (units: skin pixels).
import * as THREE from 'three/webgpu';
import { mulberry32 } from '../util.js';
import { PX } from './character.js';

// ---------------------------------------------------------------- noise
const h3 = (x, y, z, s) => { let n = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const sm = (t) => t * t * (3 - 2 * t);
// smooth value noise in [0, 1]
function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz, s);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf), l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}

// ---------------------------------------------------------------- cell mesh
const FACES = [
  [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], 0.9],
  [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], 0.9],
  [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], 1.1],
  [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], 0.62],
  [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], 1],
  [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], 0.84],
];
// cells: Map key "i,j,k" -> THREE.Color (cube from (i,j,k) to (i+1,j+1,k+1)).
// solid(i,j,k): a neighbour that hides a face without being drawn (the head).
export function cellMesh(cells, unit, material, solid = () => false) {
  const P = [], N = [], C = [];
  for (const [key, col] of cells) {
    const [i, j, k] = key.split(',').map(Number);
    for (const [n, vs, sh] of FACES) {
      const a = i + n[0], b = j + n[1], c = k + n[2];
      if (cells.has(`${a},${b},${c}`) || solid(a, b, c)) continue;
      // a cube with a neighbour above-and-out is in a crevice: darker
      const crevice = n[1] === 0 && cells.has(`${a},${b + 1},${c}`) ? 0.86 : 1;
      for (const q of [0, 1, 2, 0, 2, 3]) { const v = vs[q]; P.push(i + v[0], j + v[1], k + v[2]); N.push(...n); C.push(col.r * sh * crevice, col.g * sh * crevice, col.b * sh * crevice); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.scale(unit, unit, unit);
  const m = new THREE.Mesh(g, material); m.castShadow = true; m.receiveShadow = true;
  return m;
}
// the head box (head pixels): x -4..4, y 0..8, z -4..4
const inHead = (i, j, k) => i >= -4 && i < 4 && j >= 0 && j < 8 && k >= -4 && k < 4;

// ---------------------------------------------------------------- hair styles
// c, r: ellipsoid centre and radii (head pixels). bump: lumpiness. fringe: the
// lowest row of the fringe over the forehead (jag adds up to that many rows
// per column). side / back: the lowest row at the sides and the nape. top:
// cut above this row (under a cap or helmet). tuft: share of surface curls
// pushed out of the outline; spike: share pushed out two cubes.
export const HAIR = {
  mop: { c: [0, 7.4, -0.7], r: [6.4, 5.4, 6.5], bump: 0.32, fringe: 5.6, jag: 1.6, side: 3, back: 1, tuft: 0.14, spike: 0.02 },
  // pulled back off the face into a mass of curls behind, a lock in front of each ear
  curls: { c: [0, 4.6, -2.4], r: [6.4, 7, 6], bump: 0.4, fringe: 6, jag: 1.2, side: -1, back: -4, top: 8, shell: 2, tuft: 0.2, spike: 0.05, pulled: 0.2, locks: [-1, 1] },
  afro: { c: [0, 7.3, -0.7], r: [6.2, 5.3, 6.1], bump: 0.26, fringe: 6, jag: 1, side: 3.4, back: 1, tuft: 0.12, spike: 0.02 },
  shaggy: { c: [0, 7.4, -0.7], r: [6.6, 5.6, 6.6], bump: 0.3, fringe: 6.6, jag: 1, side: 2, back: 0, tuft: 0.14, spike: 0.03 },
  long: { c: [0, 4.6, -1.2], r: [5.6, 6.6, 5.6], bump: 0.32, fringe: 5.6, jag: 1.4, side: -2, back: -2, top: 7, helmetFront: true, tuft: 0.14, spike: 0.02 },
  spiky: { c: [0, 7.4, -0.6], r: [5.9, 5.1, 6.1], bump: 0.4, fringe: 5.2, jag: 2, side: 3, back: 1, tuft: 0.2, spike: 0.07 },
  messy: { c: [0, 7.3, -0.5], r: [6.2, 5.4, 6.3], bump: 0.34, fringe: 5, jag: 1.6, side: 2.6, back: 0.6, tuft: 0.16, spike: 0.04 },
};

// opts: { style, base, shade, light, warm?, seed, cap?, helmet?, hood? }
// (cap, helmet, hood: the hair cut to fit under it; a hood leaves only the fringe)
// shape: overrides for the style's numbers (e.g. { fringe: 7.6 } to lift a fringe).
// beard: { length, mouth } adds a full voxel beard (head pixels below the chin, the mouth's row).
// res: cells per head pixel (1 for a hero; a character drawn bigger than a
// hero takes res > 1, so its hair is made of more, smaller cubes, parts.js
// voxel density). The cells come back on that finer grid: draw them with
// cellMesh(cells, unit / res, ..., solid).
export function heroHair({ style, base, shade, light, warm = null, seed = 1, cap = false, helmet = false, hood = false, shape = null, beard = null, res = 1 }) {
  const S = { ...(HAIR[style] ?? HAIR.mop), ...shape };
  if (cap && S.top == null) S.top = 8;
  if (hood) S.hood = true;
  if (helmet && S.top == null) { S.top = 7; S.helmetFront = true; }
  const r = mulberry32(seed);
  const tones = [new THREE.Color(shade), new THREE.Color(base), new THREE.Color(light)];
  const warmC = warm != null ? new THREE.Color(warm) : null;
  const [cx, cy, cz] = S.c, [rx, ry, rz] = S.r;
  // the lowest fringe row of each column across the forehead
  const fringe = new Map();
  for (let i = -5; i < 5; i++) fringe.set(i, S.fringe + Math.floor(r() * (S.jag + 1)));
  const fr = (x) => fringe.get(Math.max(-5, Math.min(4, Math.floor(x))));
  // (x, y, z: the centre of a cell, in head pixels)
  const inHeadC = (x, y, z) => x >= -4 && x < 4 && y >= 0 && y < 8 && z >= -4 && z < 4;
  const blocked = (x, y, z) => {
    if (inHeadC(x, y, z)) return true;
    if (S.hood && (z < 3 || z > 5.2 || Math.abs(x) > 3.8 || y > 7.6)) return true;   // under a hood (gear/armour.js): only the fringe in the face's opening
    if (S.top != null && y > S.top + (z < -2 ? 0.6 : 0)) return true;
    if (S.helmetFront && z > 1.5 && y > 4.6) return true;               // the helmet's cheek guards
    if (Math.abs(x) < 4 && z > 3.6 && y < fr(x)) return true;            // keep the face clear
    if (S.front != null && z > S.front && y < fr(x) + 2.5) return true;   // no fringe jutting out over the eyes
    if (S.pulled != null && z > S.pulled) {
      // hair pulled back from the face: only a lock or two in front of the ears
      const lock = Math.abs(x) > 4 && Math.abs(x) < 5.2 && z < 3.4 && y > S.side && y < 7.5 && (S.locks ?? []).includes(Math.sign(x));
      if (!lock) return true;
    }
    if (y < (z < -1.5 ? S.back : S.side)) return true;
    if (Math.abs(x) < 4.2 && z > 0 && y < 1.5) return true;               // never under the chin
    return false;
  };
  // inside the lumpy ellipsoid, or within a shell hugging the skull (so the
  // hair always covers the back and sides of the head down to its hairline)
  const shell = S.shell ?? 1.6;
  const inside = (x, y, z) => {
    const n = noise3(x * 0.42, y * 0.42, z * 0.42, seed) - 0.5;
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
    if (d < 1 + S.bump * n * 2) return true;
    const ox = Math.max(0, Math.abs(x) - 4), oy = Math.max(0, y - 8), oz = Math.max(0, Math.abs(z) - 4) * (z > 0 ? 1 : 1);
    return Math.hypot(ox, oy, oz) < shell + n * 1.4;
  };
  const cells = new Map();
  const tone = (x, y, z) => {
    const n = noise3(x * 0.55 + 31, y * 0.55, z * 0.55, seed + 7);
    const c = (n < 0.36 ? tones[0] : n < 0.72 ? tones[1] : tones[2]).clone();
    if (y > cy + ry * 0.45) c.lerp(tones[2], 0.25);
    if (warmC && r() < 0.035) c.copy(warmC);
    return c.multiplyScalar(0.9 + r() * 0.2);
  };
  // a fine cell (i, j, k) and its centre in head pixels
  const at = (i, j, k) => [(i + 0.5) / res, (j + 0.5) / res, (k + 0.5) / res];
  const R = 11;
  const F = (v) => Math.floor(v * res);
  for (let i = F(-R); i < F(R); i++) for (let j = F(-14); j < F(16); j++) for (let k = F(-R); k < F(R); k++) {
    const [x, y, z] = at(i, j, k);
    if (blocked(x, y, z) || !inside(x, y, z)) continue;
    cells.set(`${i},${j},${k}`, tone(x, y, z));
  }
  // curls: push surface cubes out of the outline, a few by two (a curl is
  // most of a head pixel long at any res)
  const out = [], cl = Math.max(1, Math.round(res * 0.7));
  for (const key of cells.keys()) {
    const [i, j, k] = key.split(',').map(Number);
    const [x, y, z] = at(i, j, k), dx = x - cx, dy = y - cy, dz = z - cz;
    const ax = Math.abs(dx), ay = Math.abs(dy), az = Math.abs(dz);
    const step = ax >= ay && ax >= az ? [Math.sign(dx), 0, 0] : ay >= az ? [0, Math.sign(dy), 0] : [0, 0, Math.sign(dz)];
    if (step[1] < 0) continue;   // curls don't grow downwards
    const a = [i + step[0], j + step[1], k + step[2]];
    if (cells.has(a.join(','))) continue;
    const roll = r();
    if (roll < S.tuft) out.push([a, cl, step]);
    else if (roll < S.tuft + S.spike) out.push([a, 2 * cl, step]);
  }
  for (const [a, n, s] of out) {
    for (let m = 0; m < n; m++) {
      const p = [a[0] + s[0] * m, a[1] + s[1] * m, a[2] + s[2] * m], q = at(...p);
      if (blocked(...q)) break;
      cells.set(p.join(','), tone(...q));
    }
  }
  // pits: a few surface cubes taken out so the curls separate
  for (const key of [...cells.keys()]) {
    const [i, j, k] = key.split(',').map(Number);
    if (j / res < cy && r() < 0.05 && !cells.has(`${i},${j + 1},${k}`)) cells.delete(key);
  }
  // a full beard: the jaw, cheeks and chin, leaving the mouth clear
  if (beard) {
    const len = beard.length ?? 2, mouthY = beard.mouth ?? 0.5;
    for (let i = F(-5); i < F(5); i++) for (let j = F(-len); j < F(5); j++) for (let k = F(-1); k < F(6); k++) {
      const [x, y, z] = at(i, j, k);
      if (inHeadC(x, y, z) || cells.has(`${i},${j},${k}`)) continue;
      const side = Math.abs(x) > 4 && Math.abs(x) < 5.2 && z > -0.5 && z < 4.2 && y < 4.5 - (z > 2.5 ? 0.5 : 0);
      const front = Math.abs(x) < 4.2 && z > 4 && z < 5.1 + (y < 0.5 ? 0.6 : 0) && y < 2.6 - Math.abs(x) * 0.15 && !(Math.abs(x) < 1.6 && y > mouthY - 0.5 && y < mouthY + 0.6);
      const under = Math.abs(x) < 4.6 && y < 0 && z > -0.5 && z < 5.4 && y > -len + Math.abs(x) * 0.35 + Math.max(0, 2 - z) * 0.4;
      if (side || front || under) cells.set(`${i},${j},${k}`, tone(x, y - 6, z));
    }
  }
  return { cells, solid: res === 1 ? inHead : (i, j, k) => inHeadC(...at(i, j, k)), res };
}

// A ponytail of curls hanging from a pivot: cells relative to the pivot.
export function heroTail({ base, shade, light, seed = 2, length = 12, width = 3.4, back = 1.4 }) {
  const r = mulberry32(seed);
  const tones = [new THREE.Color(shade), new THREE.Color(base), new THREE.Color(light)];
  const cells = new Map();
  for (let j = 1; j > -length; j--) {
    const t = (1 - j) / length;
    const w = width * (0.75 + Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.3) * (1 - t * 0.35);
    const zc = -back - t * 1.4;
    for (let i = -6; i < 6; i++) for (let k = -8; k < 4; k++) {
      const x = i + 0.5, z = k + 0.5;
      const d = (x / w) ** 2 + ((z - zc) / (w * 0.8)) ** 2;
      if (d > 1 + 0.5 * (noise3(x * 0.5, j * 0.5, z * 0.5, seed) - 0.5) * 2) continue;
      const n = noise3(x * 0.6, j * 0.6, z * 0.6, seed + 3);
      cells.set(`${i},${j},${k}`, (n < 0.36 ? tones[0] : n < 0.72 ? tones[1] : tones[2]).clone().multiplyScalar(0.9 + r() * 0.2));
    }
  }
  return cells;
}

// ---------------------------------------------------------------- outfit boxes
const col = (c, k = 1) => new THREE.Color(c).multiplyScalar(k);
function boxes(list, material, unit = PX) {
  const P = [], N = [], C = [];
  for (const b of list) {
    const [x, y, z] = b.at, [w, h, d] = b.size, c = b.col;
    const hw = w / 2, hh = h / 2, hd = d / 2;
    for (const [n, vs, sh] of FACES) {
      for (const q of [0, 1, 2, 0, 2, 3]) {
        const v = vs[q];
        P.push(x + (v[0] * 2 - 1) * hw, y + (v[1] * 2 - 1) * hh, z + (v[2] * 2 - 1) * hd); N.push(...n);
        // top faces a bit lighter, bottoms darker; a gentle top-to-bottom gradient on the sides
        const g = sh * (n[1] === 0 ? 0.94 + v[1] * 0.1 : 1);
        C.push(c.r * g, c.g * g, c.b * g);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.scale(unit, unit, unit);
  const m = new THREE.Mesh(g, material); m.castShadow = true; m.receiveShadow = true;
  return m;
}
const B = (at, size, c) => ({ at, size, col: c instanceof THREE.Color ? c : col(c) });

// Footwear on a leg (the leg runs from y 0 at the hip to y -12).
// kind: 'hitop' (canvas high-tops: dark upper, white toe cap, sole, laces),
// 'boot' (laced work or combat boot), 'hoof' (split goat hoof with fur),
// 'sandal' (bare foot on a sole with straps; trim is the foot's skin).
export function footwear(kind, { upper, sole, lace = 0xf0ece0, trim = null, seed = 1 }) {
  const L = [];
  if (kind === 'hoof') {
    const r = mulberry32(seed), fur = [0x5a3418, 0x7a4a24, 0x8e5a2c, 0x4a2a12];
    // shaggy fur down the shin
    for (let y = -4.5; y > -10.5; y -= 1) for (const [x, z] of [[-2.2, 0], [2.2, 0], [0, 2.2], [0, -2.2], [-1.8, 1.8], [1.8, 1.8], [-1.8, -1.8], [1.8, -1.8]]) {
      if (r() < 0.25) continue;
      const s = 1 + r() * 0.7, k = 1 + (r() - 0.5) * 0.4;
      L.push(B([x * k, y - r() * 0.5, z * k], [s, s * 1.2, s], fur[Math.floor(r() * fur.length)]));
    }
    L.push(B([0, -9, 0], [4.8, 2.6, 4.8], 0x6a4020));
    L.push(B([-1.25, -11.2, 0.5], [2.2, 1.6, 5.2], upper)); L.push(B([1.25, -11.2, 0.5], [2.2, 1.6, 5.2], upper));
    return L;
  }
  const s = col(sole), u = col(upper), lc = col(lace);
  if (kind === 'sandal') {
    // bare feet on a thick sole, two straps over the toes and one round the ankle
    L.push(B([0, -11.6, 0.6], [4.9, 0.8, 5.8], s));
    L.push(B([0, -10.9, 1.2], [4.5, 0.7, 4.4], col(trim ?? 0xd89060)));
    L.push(B([0, -10.6, 2.2], [4.7, 0.5, 0.8], u)); L.push(B([0, -10.6, 0.4], [4.7, 0.5, 0.8], u));
    L.push(B([0, -9.4, -0.4], [4.6, 0.6, 4.6], u));
    return L;
  }
  if (kind === 'boot') {
    L.push(B([0, -11.55, 0.5], [5, 0.9, 5.8], s));
    L.push(B([0, -9.6, 0.4], [4.7, 3.2, 5.2], u));
    L.push(B([0, -7.4, 0], [4.6, 1.6, 4.6], u));
    L.push(B([0, -6.5, 0], [4.7, 0.5, 4.7], col(upper, 0.75)));                       // top band
    for (let i = 0; i < 4; i++) L.push(B([0, -7 - i * 0.95, 2.4 + (i > 1 ? 0.25 : 0)], [2.2, 0.35, 0.3], lc));
    if (trim != null) L.push(B([0, -10.9, 0.5], [4.9, 0.4, 5.6], col(trim)));
    return L;
  }
  // high-tops
  L.push(B([0, -11.5, 0.5], [5, 1, 5.8], s));
  L.push(B([0, -9.9, 0.4], [4.7, 2.3, 5.2], u));
  L.push(B([0, -8.1, 0], [4.6, 1.5, 4.6], u));
  L.push(B([0, -10.4, 2.55], [4.72, 1.3, 1.2], s));                                    // toe cap
  for (let i = 0; i < 3; i++) L.push(B([0, -8.1 - i * 0.75, 2.35 + i * 0.12], [2.3, 0.35, 0.3], lc));
  L.push(B([2.38, -9.6, -0.4], [0.2, 1.1, 1.1], s)); L.push(B([-2.38, -9.6, -0.4], [0.2, 1.1, 1.1], s));   // ankle patch
  return L;
}
// A band round a limb at height y (cuffs, socks, wristbands).
export const band = (y, h, c, w = 4.5) => B([0, y, 0], [w, h, w], c);
// Bead necklace across the chest of a torso (runs from y 0 to 12, front at z 2).
export function beads(colors, { y = 11.2, z = 2.35, n = 7 } = {}) {
  const L = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.95;
    L.push(B([x, y - (((n - 1) / 2) ** 2 - ((i - (n - 1) / 2) ** 2)) * 0.09, z], [0.75, 0.75, 0.6], colors[i % colors.length]));
  }
  return L;
}
// Torn hem: ragged strips hanging from a box edge. Front and back strips at
// z = ±d, side strips at x = ±w, all from y down.
export function tatters(y, w, d, colors, seed = 1, { front = true, gapX = 0 } = {}) {
  const r = mulberry32(seed), L = [];
  for (let x = -w + 0.5; x < w; x += 1) {
    for (const z of front ? [d, -d] : [-d]) {
      if (z > 0 && Math.abs(x) < gapX) continue;
      const h = 0.6 + r() * 1.3; L.push(B([x, y - h / 2, z], [1, h, 0.45], colors[Math.floor(r() * colors.length)]));
    }
  }
  for (let z = -d + 0.5; z < d; z += 1) for (const x of [w, -w]) { const h = 0.5 + r() * 1.2; L.push(B([x, y - h / 2, z], [0.45, h, 1], colors[Math.floor(r() * colors.length)])); }
  return L;
}
// Ragged ring of strips round a sleeve end at height y.
export function sleeveTatters(y, colors, seed = 1, w = 2.3) {
  const r = mulberry32(seed), L = [];
  for (let t = -w + 0.5; t < w; t += 1) {
    for (const [x, z, sx, sz] of [[t, w, 1, 0.45], [t, -w, 1, 0.45], [w, t, 0.45, 1], [-w, t, 0.45, 1]]) {
      const h = 0.5 + r() * 1.3; L.push(B([x, y - h / 2, z], [sx, h, sz], colors[Math.floor(r() * colors.length)]));
    }
  }
  return L;
}

export function partsMesh(list, material) { return boxes(list, material); }
export function partMaterial() { return new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 }); }
