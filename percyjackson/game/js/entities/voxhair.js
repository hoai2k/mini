// Voxel hair: hundreds of small shaded cubes around the head, merged into a
// single mesh with per-vertex colour, like the hair on the 3D hero sheets
// (design/concept/vox-*.png). A style is a shape: for every direction around
// the head it says how far the hair reaches and where it may not grow (the
// face). Cubes are placed on that shell with jittered sizes and three tones
// (shade, base, highlight) so curls read as curls.
//
// Units are head pixels (the head is 8 × 8 × 8, front +z, from y 0 to 8).
import * as THREE from 'three/webgpu';
import { mulberry32 } from '../util.js';

const tmpC = new THREE.Color();

// Add one box (centre x,y,z, size w,h,d, colour) to the arrays.
function pushBox(P, N, C, x, y, z, w, h, d, col, shadeTop = 1.08, shadeSide = 0.92, shadeBottom = 0.7) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const faces = [
    [[1, 0, 0], [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], shadeSide],
    [[-1, 0, 0], [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], shadeSide],
    [[0, 1, 0], [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], shadeTop],
    [[0, -1, 0], [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], shadeBottom],
    [[0, 0, 1], [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], 1],
    [[0, 0, -1], [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], 0.85],
  ];
  for (const [n, vs, sh] of faces) {
    const idx = [0, 1, 2, 0, 2, 3];
    for (const i of idx) { const v = vs[i]; P.push(x + v[0], y + v[1], z + v[2]); N.push(...n); C.push(col.r * sh, col.g * sh, col.b * sh); }
  }
}

// Build a merged mesh from a list of cubes [{x,y,z,w,h,d,col}] in head pixels.
export function voxelMesh(cubes, unit, material) {
  const P = [], N = [], C = [];
  for (const c of cubes) pushBox(P, N, C, c.x, c.y, c.z, c.w, c.h ?? c.w, c.d ?? c.w, c.col);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.scale(unit, unit, unit);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function hairMaterial() {
  return new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
}

// Shapes. reach(dx, dy, dz) → distance from the head centre (4 px = the
// skull) the hair reaches in that direction, or 0 for no hair there.
// The head centre is (0, 4, 0); dy is up.
// Hair never grows over the face: the front, below the brow, inside the cheeks.
const onFace = (x, y, z) => z > 0.25 && y < 0.34 && Math.abs(x) < 0.84;
const STYLES = {
  // Percy: a messy black mop, fringe falling forward in points, short at the nape
  mop: { cube: [1.4, 2.2], reach: (x, y, z) => (y < -0.35 ? (z < 0 ? 4.4 : 0) : 4.7 + Math.max(0, y) * 0.7), lift: 0.5, jag: 1.0, tufts: 9 },
  // Annabeth: a mass of blonde curls down to the shoulders, and a ponytail
  curls: { cube: [1.7, 2.6], reach: (x, y, z) => 5.2 + (y < 0 ? 1.2 : 0.4), lift: 0.3, drop: 8, jag: 1.4, tufts: 16 },
  // Grover: a round brown afro, lighter on top
  afro: { cube: [1.6, 2.3], reach: (x, y, z) => (y < -0.45 ? 0 : 5.3 + y * 0.4), lift: 0.7, jag: 0.8, tufts: 6 },
  // Tyson: shaggy curls to the jaw, the fringe kept above the big eye
  shaggy: { cube: [1.6, 2.4], reach: (x, y, z) => 4.9 + (y < 0 ? 0.6 : 0.2), lift: 0.3, drop: 2, jag: 1.2, tufts: 9, browHigh: true },
  // Clarisse: long brown hair falling from under her helmet
  long: { cube: [1.4, 2.1], reach: (x, y, z) => 4.6 + (y < 0 ? 0.7 : 0), lift: 0, drop: 8, jag: 1.0, tufts: 4 },
  // Thalia: black punk spikes
  spiky: { cube: [1.3, 2.0], reach: (x, y, z) => (y < -0.3 ? 4.4 : 4.6 + Math.max(0, y) * 0.5), lift: 0.3, jag: 0.6, spikes: 14 },
  // Nico: shaggy black, a fringe low over his eyes
  messy: { cube: [1.4, 2.1], reach: (x, y, z) => (y < -0.4 ? (z < 0 ? 4.5 : 0) : 4.7 + Math.max(0, y) * 0.5), lift: 0.3, jag: 0.9, tufts: 7, fringeLow: true },
};

// Build voxel hair. opts: { style, base, shade, light, seed, cap (bool: keep the top flat under a cap) }
export function buildVoxelHair({ style, base, shade, light, seed = 1, cap = false, helmet = false, scale = 1 }) {
  const S = STYLES[style] ?? STYLES.mop;
  const r = mulberry32(seed);
  const cols = [new THREE.Color(shade), new THREE.Color(base), new THREE.Color(base), new THREE.Color(light)];
  const cubes = [];
  const cy = 4;   // head centre
  const N = 260;
  for (let i = 0; i < N; i++) {
    // directions spread evenly over the sphere (Fibonacci)
    const t = (i + 0.5) / N, phi = Math.acos(1 - 2 * t), th = Math.PI * (1 + Math.sqrt(5)) * i;
    const dx = Math.sin(phi) * Math.cos(th), dy = Math.cos(phi), dz = Math.sin(phi) * Math.sin(th);
    if (onFace(dx, dy, dz)) continue;
    let reach = S.reach(dx, dy, dz);
    if (!reach) continue;
    if ((cap || helmet) && dy > 0.35) reach = Math.min(reach, 4.6);      // flattened under a cap / helmet crown
    if (helmet && dy > -0.05 && dz > -0.2) continue;                      // the helmet covers the top and front
    reach += (r() - 0.5) * S.jag;
    const sz = S.cube[0] + r() * (S.cube[1] - S.cube[0]);
    // squash the sphere into the head's box so hair hugs it
    const k = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
    const x = dx / k * Math.min(reach, 4 + sz * 0.4) * (0.85 + 0.15 * k) * scale;
    const y = cy + dy / k * Math.min(reach, 4 + sz * 0.45) * (0.85 + 0.15 * k) * scale + (dy > 0 ? (reach - 4.4) * (S.lift ?? 0.5) : 0);
    const z = dz / k * Math.min(reach, 4 + sz * 0.4) * (0.85 + 0.15 * k) * scale;
    const c = cols[Math.floor(r() * cols.length)].clone().multiplyScalar(0.92 + r() * 0.16);
    if (dy > 0.6) c.lerp(cols[3], 0.35);
    cubes.push({ x, y, z, w: sz, h: sz * (0.85 + r() * 0.3), d: sz, col: c });
  }
  // loose tufts sticking out of the outline
  for (let i = 0; i < (S.tufts ?? 0); i++) {
    const a = r() * Math.PI * 2, up = r();
    if (cap && up > 0.55) continue;
    const front = Math.sin(a) > 0.6 && up < 0.6;
    const R = 4.4 + r() * 1.0;
    const x = Math.cos(a) * R, z = Math.sin(a) * R * (front ? 0.9 : 1), y = cy + 1.2 + up * 4.2 - (front ? 0.8 : 0);
    if (Math.sin(a) > 0.3 && Math.abs(x) < 3.6 && y < 8) continue;
    const sz = 1.2 + r() * 1.3;
    cubes.push({ x, y, z, w: sz, h: sz, d: sz, col: cols[1 + Math.floor(r() * 3)].clone() });
  }
  // fringe: a row of points along the brow
  const fringeY = S.fringeLow ? 6.8 : S.browHigh ? 8.2 : 7.6;
  for (let fx = -3.5; fx <= 3.5; fx += 1.4) {
    if ((cap || helmet) && Math.abs(fx) < 2.6 && !S.fringeLow) { if (helmet) continue; }
    const len = (S.browHigh ? 0.8 : 1.0) + r() * 1.2;
    cubes.push({ x: fx + (r() - 0.5) * 0.6, y: fringeY + 0.6 - len / 2, z: 4.25, w: 1.4, h: len, d: 1.0, col: cols[1 + Math.floor(r() * 2)].clone() });
  }
  // spikes
  for (let i = 0; i < (S.spikes ?? 0); i++) {
    const a = r() * Math.PI * 2, up = 0.35 + r() * 0.65;
    const len = 2.4 + r() * 2.2;
    const dx = Math.cos(a) * Math.sqrt(1 - up * up), dz = Math.sin(a) * Math.sqrt(1 - up * up);
    if (dz > 0.6 && up < 0.5) continue;
    for (let k = 0; k < 3; k++) {
      const d = 4.4 + k * len / 3, s = 1.8 - k * 0.45;
      cubes.push({ x: dx * d, y: cy + up * d + 0.5, z: dz * d, w: s, h: s, d: s, col: cols[k === 2 ? 3 : 1].clone() });
    }
  }
  // hair that falls below the head (curls, long hair)
  if (S.drop) {
    for (let i = 0; i < S.drop * 9; i++) {
      const side = r();
      let x, z;
      if (side < 0.4) { x = (r() < 0.5 ? -1 : 1) * (4.3 + r() * 1.2); z = -3 + r() * 4; }
      else { x = (r() - 0.5) * 9; z = -4.3 - r() * 1.4; }
      const y = 2 - r() * S.drop;
      const sz = S.cube[0] + r() * (S.cube[1] - S.cube[0]);
      const c = cols[Math.floor(r() * cols.length)].clone().multiplyScalar(0.9 + r() * 0.15);
      cubes.push({ x, y, z, w: sz, h: sz, d: sz, col: c });
    }
  }
  return cubes;
}

// A ponytail: a hanging chain of curl clusters. Returns { pivot, cubes } with
// cubes relative to the pivot (top of the tail); the rig swings the pivot.
export function ponytailCubes({ base, shade, light, seed = 2, length = 10, width = 4 }) {
  const r = mulberry32(seed);
  const cols = [new THREE.Color(shade), new THREE.Color(base), new THREE.Color(light)];
  const cubes = [];
  for (let i = 0; i < length * 6; i++) {
    const t = r(), y = -t * length, w = width * (1 - t * 0.45);
    cubes.push({ x: (r() - 0.5) * w, y, z: -(r() * w * 0.7), w: 1.6 + r() * 1.2, col: cols[Math.floor(r() * 3)].clone().multiplyScalar(0.9 + r() * 0.15) });
  }
  cubes.push({ x: 0, y: 0.4, z: 0, w: 2.4, h: 1.6, d: 2.4, col: new THREE.Color(0x8a2a1a) });   // hair tie
  return cubes;
}
export { tmpC };
