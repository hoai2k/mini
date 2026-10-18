// Shared building blocks for the monster and boss models: a cached skin
// material per look (so spawning never compiles a shader), box props, voxel
// hair with one shared vertex-colour material, snake chains, lava-crack and
// fur painters, spiked collars and swaying parts that animateExtras moves.
import * as THREE from 'three/webgpu';
import { Skin, makeCharMaterial, PX } from './character.js';
import { solidMat } from './mortals.js';
import { buildVoxelHair, voxelMesh } from './voxhair.js';
import { mulberry32 } from '../util.js';

export const HS = 1.12;           // the Rig's head scale: one head pixel is PX * HS
export const solid = solidMat;

// ---- voxel density ----------------------------------------------------------------
// A hero is drawn at rig scale 1.18 (root 0.944 = 1.18 x CHAR_SCALE): one skin
// pixel is about 0.055 m, and its 128 x 128 skin (res 2) has two texels per
// skin pixel. A model made big with its rig scale should keep those sizes, so
// a big model is made of more blocks rather than bigger ones (the owner's rule).
// density = how many hero pixels fit in one of the model's own skin pixels.
export const HERO_SCALE = 1.18;
// The build in progress: k is the extra scale a champion is built at (its
// look.scale, champions.js buildChampionRig); key names the build for the
// voxel kit's geometry cache (monsters.js); n counts the kits it made.
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
// skin resolution (1, 2 or 4) whose texels match a hero's at rig scale s
export const resFor = (s) => Math.max(1, Math.min(4, 2 ** Math.round(Math.log2(2 * densityFor(s)))));

// One material per skin id and resolution, painted once. opts.res paints a
// finer skin (2 = 128 x 128); opts.scale (the rig scale the builder is about
// to pass) works the resolution out so the texels match a hero's (resFor).
const skins = new Map();
export function skinMat(id, painter, opts = {}) {
  const res = opts.scale ? Math.max(opts.res ?? 1, resFor(opts.scale)) : (opts.res ?? 1);
  const key = `${id}@${res}`;
  if (skins.has(key)) return skins.get(key);
  let seed = 7; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const S = new Skin(seed, res);
  painter(S);
  const m = makeCharMaterial(S.texture(), { emitStrength: opts.emit ?? 3.2, roughness: opts.rough ?? 0.7, fill: opts.fill ?? 0.16 });
  m.alphaTest = 0.5;
  if (opts.dissolve) m.userData.dissolve.value = opts.dissolve;
  skins.set(key, m);
  return m;
}

// A box prop of (w,h,d) skin pixels hung on a rig group.
export function prop(rig, parent, w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = rig.mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mat);
  m.position.set(x * PX, y * PX, z * PX); m.rotation.set(rx, ry, rz); parent.add(m); return m;
}
export function group(parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.Group(); g.position.set(x * PX, y * PX, z * PX); g.rotation.set(rx, ry, rz); parent.add(g); return g;
}

// Voxel hair on a Rig head, from the hero hair styles (voxhair.js).
let hairM = null;
export function voxHair(rig, vox, scale = 1) {
  hairM ??= new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  const hs = ((rig.dims.headS ?? 8) / 8) * HS;
  const mesh = voxelMesh(buildVoxelHair({ ...vox, scale }), PX * hs, hairM);
  mesh.userData.baseMat = hairM; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.hair = mesh;
  return mesh;
}
// Glowing flame hair (empousa): loose voxel cubes in fire colours.
let flameM = null;
export function flameHair(rig, { seed = 3, n = 70, height = 9 } = {}) {
  flameM ??= new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.6, emissive: 0xff5a0a, emissiveIntensity: 1.3 });
  const r = mulberry32(seed);
  const cols = [0xff4a0a, 0xff7a1a, 0xffa02a, 0xffd04a].map((c) => new THREE.Color(c));
  const cubes = [];
  for (let i = 0; i < n; i++) {
    const t = r(), a = r() * Math.PI * 2, rad = 4.2 + r() * 1.6 - t * 2.5;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad * 0.9 - 0.8;
    if (z > 2.5 && t < 0.25) continue;            // keep the face clear
    const y = 6 + t * height + (z < 0 ? 0 : -1);
    const sz = 2.2 - t * 1.2 + r() * 0.6;
    cubes.push({ x, y, z, w: sz, h: sz * 1.2, d: sz, col: cols[Math.min(3, Math.floor(t * 3.2 + r()))] });
  }
  // hair falling down the back
  for (let i = 0; i < 24; i++) cubes.push({ x: (r() - 0.5) * 8, y: 4 - r() * 7, z: -4.4 - r(), w: 1.8, col: cols[Math.floor(r() * 3)] });
  const hs = ((rig.dims.headS ?? 8) / 8) * HS;
  const mesh = voxelMesh(cubes, PX * hs, flameM);
  mesh.userData.baseMat = flameM; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.flameHair = mesh;
  return mesh;
}

// A snake: a chain of segments ending in a head with eyes and a forked
// tongue. Returns { root, segs } and registers the chain to writhe.
export function snake(rig, parent, { len = 6, seg = 2.4, w = 1.4, body, belly = null, eye = solid(0xffe04a, 2.4), tongue = solid(0xd8202a, 0.6), at = [0, 0, 0], rot = [0, 0, 0], amp = 0.35, speed = 3, headW = null } = {}) {
  const root = group(parent, ...at, ...rot);
  const segs = [];
  let p = root;
  for (let i = 0; i < len; i++) {
    const g = group(p, 0, i ? seg : 0, 0);
    const k = 1 - i / len * 0.35;
    prop(rig, g, w * k, seg + 0.2, w * k, body, 0, seg / 2, 0);
    if (belly && i % 2) prop(rig, g, w * k * 0.7, seg * 0.6, 0.3, belly, 0, seg / 2, w * k / 2 + 0.1);
    segs.push(g); p = g;
  }
  const hw = headW ?? w * 1.6;
  const head = group(p, 0, seg, 0, 0.15, 0, 0);
  prop(rig, head, hw, hw * 0.7, hw * 1.4, body, 0, 0, hw * 0.4);
  prop(rig, head, 0.5, 0.5, 0.3, eye, -hw * 0.35, hw * 0.3, hw * 0.9); prop(rig, head, 0.5, 0.5, 0.3, eye, hw * 0.35, hw * 0.3, hw * 0.9);
  prop(rig, head, 0.3, 0.2, 1.6, tongue, 0, -hw * 0.2, hw * 1.4);
  (rig.extras.snakes ??= []).push({ segs, ph: Math.random() * 6, amp, speed, head });
  return { root, segs, head };
}

// Paint glowing lava cracks: short jagged lines inside a rect of the skin.
export function lavaCracks(S, x0, y0, w, h, n, cols = [0xff5a14, 0xffa02a]) {
  for (let i = 0; i < n; i++) {
    let x = x0 + Math.floor(S.r() * w), y = y0 + Math.floor(S.r() * h);
    const len = 2 + Math.floor(S.r() * 4);
    for (let k = 0; k < len; k++) {
      if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) S.px(x, y, cols[S.r() < 0.3 ? 1 : 0]);
      if (S.r() < 0.5) x += S.r() < 0.5 ? 1 : -1; else y += 1;
    }
  }
}
// Fur noise: darker and lighter flecks.
export function fur(S, x0, y0, w, h, n, dark, light) {
  for (let i = 0; i < n; i++) S.px(x0 + Math.floor(S.r() * w), y0 + Math.floor(S.r() * h), S.r() < 0.5 ? dark : light);
}
// A spiked gold collar: a ring of slabs with spikes pointing outward.
// axis 'z' rings a neck that points forward (dogs); 'y' an upright neck.
export function spikedCollar(rig, parent, { r = 4, h = 2, x = 0, y = 0, z = 0, gold = solid(0xc9963a, 0.2, 0.35, 0.7), spike = solid(0xe8d8a8, 0, 0.4, 0.5), n = 8, axis = 'z', rx = 0 } = {}) {
  const g = group(parent, x, y, z, rx, 0, 0);
  const seg = 2 * Math.PI * r / n + 0.4;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    if (axis === 'z') {
      const s = group(g, Math.sin(a) * r, Math.cos(a) * r, 0, 0, 0, -a);
      prop(rig, s, seg, 1, h, gold, 0, 0, 0);
      prop(rig, s, 0.9, 1.8, 0.9, spike, 0, 1.2, 0);
    } else {
      const s = group(g, Math.sin(a) * r, 0, Math.cos(a) * r, 0, a, 0);
      prop(rig, s, seg, h, 1, gold, 0, 0, 0);
      prop(rig, s, 0.9, 0.9, 1.8, spike, 0, 0, 1.2);
    }
  }
  return g;
}
// Generic sway: rig.extras.sway = [{ g, ax: 'x'|'y'|'z', amp, f, ph, base }]
export function sway(rig, g, ax, amp, f = 2, ph = Math.random() * 6) {
  (rig.extras.sway ??= []).push({ g, ax, amp, f, ph, base: g.rotation[ax] });
}
// Loose voxel cubes (manes, fur clumps, flames) merged into one mesh with
// the shared vertex-colour material. cubes: [{ x, y, z, w, h?, d?, col }] in
// skin pixels relative to parent.
export function voxCubes(rig, parent, cubes, unit = PX) {
  hairM ??= new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  const mesh = voxelMesh(cubes.map((c) => ({ ...c, col: c.col instanceof THREE.Color ? c.col : new THREE.Color(c.col) })), unit, hairM);
  mesh.userData.baseMat = hairM; rig.meshes.push(mesh); parent.add(mesh);
  return mesh;
}
// A small seeded random for building shapes.
export const rng = (seed = 1) => mulberry32(seed);
// Brute proportions for the big humanoid bosses: longer, thicker arms (the
// hands move down with them) and legs set wider apart and thickened.
export function bruteLimbs(rig, { armLen = 1.4, armThick = 1, legThick = 1.4, legX = 3 } = {}) {
  for (const arm of [rig.armR, rig.armL]) for (const m of arm.children) if (m.isMesh) m.scale.set(armThick, armLen, armThick);
  rig.handR.position.y *= armLen; rig.handL.position.y *= armLen;
  for (const [leg, s] of [[rig.legR, -1], [rig.legL, 1]]) { leg.position.x = s * legX * PX; for (const m of leg.children) if (m.isMesh) m.scale.set(legThick, 1, legThick); }
}
// Static pose offsets a model keeps on top of its animation: a hunched back
// (rig.hunch, rad) and arms held out from the body (rig.armSpread, rad).
// Call with k = -1 before rig.animate and k = +1 after it.
export function rigOffsets(rig, k) {
  if (rig.hunch) rig.torso.rotation.x += k * rig.hunch;
  if (rig.armSpread && rig.armR) { rig.armR.rotation.z -= k * rig.armSpread; rig.armL.rotation.z += k * rig.armSpread; }
}

// Keep a part off the floor: after the pose is set (rig.onTick, which
// enemy.js and the workbench run right after animate), turn group g back
// about its x axis (rotation.x down) just as far as it takes for the meshes
// under watch (default g; they must hang below g) to clear the ground under
// the rig. A long club turns back toward the forearm, an arm lifts forward,
// a head pitches up. Each watched mesh is tested at its 14 extreme vertices
// (along the axes and the diagonals), found once, so a frame costs a few
// dozen transforms. reset: start from the group's rest pitch every frame (a
// held weapon); otherwise from where the animation left it (a limb, a head).
const _ka = new THREE.Vector3(), _kb = new THREE.Vector3();
const DIRS14 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]];
function extremes(watch) {
  const out = [];
  for (const w of watch) w.traverse((m) => {
    if (!m.isMesh || !m.geometry?.attributes?.position) return;
    const P = m.geometry.attributes.position, seen = new Set();
    for (const [dx, dy, dz] of DIRS14) {
      let best = -Infinity, bi = 0;
      for (let i = 0; i < P.count; i++) { const d = P.getX(i) * dx + P.getY(i) * dy + P.getZ(i) * dz; if (d > best) { best = d; bi = i; } }
      if (!seen.has(bi)) { seen.add(bi); out.push({ m, v: new THREE.Vector3(P.getX(bi), P.getY(bi), P.getZ(bi)) }); }
    }
  });
  return out;
}
export function keepAbove(rig, g, { watch = [g], reset = false, step = 0.1, max = 16, clear = 0.03 } = {}) {
  const base = g.rotation.x, prev = rig.onTick;
  let pts = null;
  const low = () => { let y = Infinity; for (const p of pts) { const v = _kb.copy(p.v).applyMatrix4(p.m.matrixWorld).y; if (v < y) y = v; } return y; };
  rig.onTick = (dt, e) => {
    prev?.(dt, e);
    if (reset) g.rotation.x = base;
    if (e?.dead) return;
    pts ??= extremes(watch);
    const floor = rig.root.getWorldPosition(_ka).y + clear;
    for (let i = 0; i < max; i++) {
      g.updateWorldMatrix(true, true);
      if (low() >= floor) break;
      g.rotation.x -= step;
    }
  };
}
