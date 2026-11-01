// The pond: a shallow dish of pond water 0.65 mm deep (slide at y = 0,
// coverslip at y = DEPTH), all lengths in µm, wide enough for the rings of
// encounters round the start (landmarks.js RINGS: about a minute of rushing
// out to the portal). The boundaries are drawn: sediment on the slide, dust on
// the underside of the coverslip (ambient.js, everywhere) and the meniscus at
// the far rim. The set pieces (Spirogyra filaments, detritus flakes, Vorticella
// colonies on their flakes, diatoms) are laid out in a 7 mm scenery tile that
// repeats in every direction: each view shows every piece at its copy nearest
// to where it looks (viewAt), and collisions meet the copy nearest the cell.
// The water itself is full (ambient.js: flocs, specks, small flakes and
// sediment repeated round each view) and bacteria drift in a gentle flow.
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd } from '../shared/sdf.js';
import { volumeMaterial, sheetMaterial, pointsMaterial } from './optics.js';
import { createStrands, KIND } from './strands.js';
import { rng, closedTube, axisRef, yAxisRef, segSeg, closestOnSeg, noise3 } from './geom.js';
import { squirmerFlow, sink } from '../shared/techniques/paramecium-squirmer.js';
import { ringPoint, RINGS, A0, START } from './landmarks.js';
import { createAmbient, wrappedVolume } from './ambient.js';

// A dish of pond water about 14 cm across: room for the rings (the portal is
// RINGS.portal out from the start) with a margin to the meniscus. [Departure:
// a wet mount under a coverslip is a few mm across; the scale of everything in
// it is honest, the extent is a game value.]
export const DROP_R = RINGS.portal + 6000;
/** The scenery tile (µm): Spirogyra, flakes, Vorticella and diatoms repeat this far apart. */
export const TILE = 7000;
const wrapOff = (x, ref) => TILE * Math.round((ref - x) / TILE);
export const DEPTH = 650; // the pre-rework depth: room to swim in 3D (the 300 µm drop kept the cell on the glass)
const YS = DEPTH / 650; // the layout was drawn for a 650 µm drop

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3();

function instancedQuads(n, iPos, iP) {
  const quad = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.attributes.position = quad.attributes.position;
  const a = new THREE.InstancedBufferAttribute(iPos, 4);
  g.setAttribute('iPos', a);
  g.setAttribute('iP', new THREE.InstancedBufferAttribute(iP, 4));
  g.instanceCount = n;
  return { geo: g, posAttr: a };
}

// ---------------------------------------------------------------------------
// Spirogyra: a filament of cylindrical cells, each with a helical, serrated
// ribbon chloroplast studded with pyrenoids, a central nucleus, and cross walls.
function spirogyra(group, curve, rand, obstacles) {
  const parent = group;
  group = new THREE.Group();
  parent.add(group);
  const R = 21, CELL = 88, len = curve.getLength();
  const segs = Math.ceil(len / 20);
  const { geo, frames } = closedTube(curve, segs, R, 20);
  group.add(Object.assign(new THREE.Mesh(geo, volumeMaterial({ dn: 0.0055, scatter: 1.5, absorb: [0.0003, 0.0002, 0.0004], rimPow: 4 })), { frustumCulled: false }));

  const frameAt = (u) => {
    const i = Math.min(segs, Math.round(u * segs));
    return { p: curve.getPointAt(u), T: frames.tangents[i], N: frames.normals[i], B: frames.binormals[i] };
  };
  // Cross walls (thin discs) and the chloroplast ribbon, as one geometry each.
  const wPos = [], wRef = [], wN = [], wE = [], wIdx = [];
  const cPos = [], cRef = [], cN = [], cE = [], cIdx = [];
  const pyr = [], nuclei = [];
  const nCells = Math.floor(len / CELL);
  for (let c = 0; c <= nCells; c++) {
    const u = (c * CELL) / len;
    if (u > 1) break;
    const f = frameAt(u);
    const base = wPos.length / 3;
    wPos.push(f.p.x, f.p.y, f.p.z); wRef.push(f.p.x, f.p.y, f.p.z); wN.push(f.T.x, f.T.y, f.T.z); wE.push(0);
    for (let j = 0; j < 18; j++) {
      const a = (j / 18) * Math.PI * 2;
      const q = f.p.clone().addScaledVector(f.N, Math.cos(a) * (R - 0.8)).addScaledVector(f.B, Math.sin(a) * (R - 0.8));
      wPos.push(q.x, q.y, q.z); wRef.push(f.p.x, f.p.y, f.p.z); wN.push(f.T.x, f.T.y, f.T.z); wE.push(1);
      wIdx.push(base, base + 1 + j, base + 1 + ((j + 1) % 18));
    }
    if (c === nCells) break;
    // Chloroplast: one ribbon per cell, ≈3.5 turns, near the wall.
    const turns = 4.2 + rand() * 0.6, ph = rand() * 6.28;
    const steps = 90;
    const start = cPos.length / 3;
    for (let k = 0; k <= steps; k++) {
      const s = k / steps;
      const uu = (c * CELL + 3 + s * (CELL - 6)) / len;
      const g = frameAt(Math.min(1, uu));
      const a = ph + s * turns * Math.PI * 2;
      const radial = g.N.clone().multiplyScalar(Math.cos(a)).addScaledVector(g.B, Math.sin(a));
      const ctr = g.p.clone().addScaledVector(radial, R * 0.78);
      const w = 5.2 * (1 + 0.3 * Math.sin(s * 150 + c)); // serrated margins
      for (const sgn of [-1, 1]) {
        const q = ctr.clone().addScaledVector(g.T, sgn * w);
        cPos.push(q.x, q.y, q.z); cRef.push(g.p.x, g.p.y, g.p.z); cN.push(radial.x, radial.y, radial.z); cE.push(sgn);
      }
      if (k < steps) { const a0 = start + k * 2; cIdx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
      if (k % 7 === 3) pyr.push(ctr.clone().addScaledVector(radial, -1.2));
    }
    const mid = frameAt((c * CELL + CELL / 2) / len);
    nuclei.push(mid.p.clone());
  }
  const mk = (pos, ref, n, e, idx) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aRef', new THREE.Float32BufferAttribute(ref, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    g.setAttribute('aEdge', new THREE.Float32BufferAttribute(e, 1));
    g.setIndex(idx);
    return g;
  };
  group.add(Object.assign(new THREE.Mesh(mk(wPos, wRef, wN, wE, wIdx), sheetMaterial({ dn: 0.03, thick: 1.0, scatter: 0.9 })), { frustumCulled: false }));
  group.add(Object.assign(new THREE.Mesh(mk(cPos, cRef, cN, cE, cIdx), sheetMaterial({ dn: 0.045, thick: 2.2, scatter: 0.9, absorb: [0.085, 0.018, 0.1] })), { frustumCulled: false }));
  const sph = new THREE.SphereGeometry(1, 10, 8);
  // pyrenoids are 2–3 µm specks, a few pixels at most: a coarse sphere is enough (≈5000 of them in five filaments)
  const pm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), volumeMaterial({ dn: 0.05, scatter: 1.4, absorb: [0.03, 0.006, 0.03], centred: true }), pyr.length);
  pyr.forEach((p, i) => pm.setMatrixAt(i, new THREE.Matrix4().makeScale(2.3, 2.3, 2.3).setPosition(p)));
  pm.frustumCulled = false;
  group.add(pm);
  const nm = new THREE.InstancedMesh(sph, volumeMaterial({ dn: 0.02, scatter: 0.6, centred: true }), nuclei.length);
  nuclei.forEach((p, i) => nm.setMatrixAt(i, new THREE.Matrix4().makeScale(6, 5, 6).setPosition(p)));
  nm.frustumCulled = false;
  group.add(nm);
  // collision: a chain of capsules
  const n = 30;
  for (let i = 0; i < n; i++) obstacles.push({ kind: 'capsule', a: curve.getPointAt(i / n), b: curve.getPointAt((i + 1) / n), r: R, what: 'Spirogyra', wrap: true });
  return { group, c: curve.getPointAt(0.5) };
}

// ---------------------------------------------------------------------------
function flakeGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.62 + 0.75 * noise3(x * 1.8 + seed, y * 1.8, z * 1.8 + seed * 0.3) + 0.18 * noise3(x * 5 + seed, y * 5, z * 5);
    p.setXYZ(i, x * k, y * k * 0.28, z * k * 0.8);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Vorticella: an inverted bell on a contractile stalk, with a ring of oral
// cilia around the peristome. Touch it and the stalk coils in a few
// milliseconds (here: one frame); it re-extends over seconds (S10, S11).
function vorticellaGeometry() {
  const parts = [
    { id: 0, sdf: sd.roundCone([0, 2, 0], [0, 40, 0], 5, 19) },
    { id: 1, blend: 3, sdf: sd.torus([0, 43, 0], 18, 3.6) },
    { id: 2, blend: 4, sdf: sd.ellipsoid([0, 43, 0], [16, 4.5, 16]) },
  ];
  return yAxisRef(buildSdfMesh(parts, { min: [-25, -5, -25], max: [25, 50, 25], cell: 1.4 }), 6, 42);
}

// ---------------------------------------------------------------------------
// Didinium nasutum: a barrel ≈120 × 80 µm with two girdles of cilia
// (pectinelles) and an anterior proboscis that discharges toxicysts and
// swallows Paramecium whole (S28, S56).
function didiniumGeometry() {
  const ring = (x0, R, r) => (x, y, z) => Math.hypot(Math.hypot(y, z) - R, x - x0) - r;
  const parts = [
    { id: 0, sdf: sd.roundCone([-26, 0, 0], [18, 0, 0], 33, 38) },
    { id: 1, blend: 10, sdf: sd.roundCone([18, 0, 0], [46, 0, 0], 36, 13) },
    { id: 2, blend: 4, sdf: sd.roundCone([44, 0, 0], [66, 0, 0], 8.5, 5) },
    { id: 3, blend: 3, sdf: ring(24, 34.5, 2.6) },
    { id: 3, blend: 3, sdf: ring(-20, 33, 2.6) },
  ];
  return axisRef(buildSdfMesh(parts, { min: [-64, -44, -44], max: [74, 44, 44], cell: 2.0 }), 55);
}

// Dileptus: a flask-shaped body tapering into a long trunk (proboscis) in
// front and a short tail behind; +x forward.
function dileptusRadius(x) {
  if (x > 30) return Math.max(3, 24 - (x - 30) * 0.16); // the trunk
  if (x < -150) return Math.max(4, 22 - (-150 - x) * 0.6); // the tail
  return 24 + 14 * Math.sin(((x + 150) / 180) * Math.PI); // the flask
}
function dileptusGeometry() {
  const parts = [
    { id: 0, sdf: sd.ellipsoid([-60, 0, 0], [95, 36, 34]) },
    { id: 1, blend: 14, sdf: sd.roundCone([10, 0, 0], [160, 2, 0], 22, 3.5) },
    { id: 2, blend: 8, sdf: sd.roundCone([-140, 0, 0], [-180, 0, 0], 16, 4) },
  ];
  return axisRef(buildSdfMesh(parts, { min: [-188, -40, -40], max: [168, 40, 40], cell: 2.4 }), 150);
}

function pinnulariaGeometry() {
  const parts = [
    { id: 0, sdf: sd.roundBox([0, 0, 0], [44, 5.5, 9], 4.5) },
    { id: 0, blend: 3, sdf: sd.ellipsoid([-44, 0, 0], [8, 5.5, 9.5]) },
    { id: 0, blend: 3, sdf: sd.ellipsoid([44, 0, 0], [8, 5.5, 9.5]) },
  ];
  return axisRef(buildSdfMesh(parts, { min: [-56, -9, -13], max: [56, 9, 13], cell: 1.2 }), 46);
}
function fragilariaGeometry() {
  const parts = [];
  for (let i = 0; i < 13; i++) parts.push({ id: 0, blend: 0.5, sdf: sd.roundBox([-39 + i * 6.5, 0, 0], [2.8, 4, 22], 1.2) });
  return axisRef(buildSdfMesh(parts, { min: [-46, -7, -26], max: [46, 7, 26], cell: 0.9 }), 40);
}

// ---------------------------------------------------------------------------
export function createWorld(scene) {
  const rand = rng(1234);
  const group = new THREE.Group();
  scene.add(group);
  const obstacles = [];

  // ---- the scenery tile: each piece shows at its copy nearest the view (viewAt)
  // `items`: { obj, base (its position in the first copy), c (its centre there) }
  const items = [];
  const T2 = TILE / 2;
  const inTile = (x, z) => [START.x + x, START.z + z];

  // --- Spirogyra filaments: five in each tile, at different depths, each ≈2.4 mm long ---
  const FIL = [
    [[-1900, 300, -560], [-1100, 330, -470], [-300, 290, -400], [500, 260, -300]],
    [[-1200, 470, 800], [-400, 500, 660], [400, 460, 520], [1200, 430, 580]],
    [[1100, 90, -1700], [900, 110, -900], [1020, 120, -100], [800, 100, 700]],
    [[1600, 380, 1500], [2100, 360, 2200], [2600, 400, 2700], [3000, 380, 3300]],
    [[-2900, 160, -1000], [-2600, 200, -1900], [-2200, 260, -2700], [-1700, 300, -3300]],
  ];
  for (const pts of FIL) {
    const f = spirogyra(group, new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(START.x + x, y * YS, START.z + z))), rand, obstacles);
    items.push({ obj: f.group, base: new THREE.Vector3(), c: f.c });
  }

  // --- Detritus flakes (repeated by their material, round each view) ---
  const flakeGeos = [0, 1, 2, 3, 4].map((i) => flakeGeometry(i * 3.7 + 1));
  const flakeOpts = { dn: 0.024, scatter: 1.2, absorb: [0.004, 0.0065, 0.012], pattern: 3 };
  const flakeMat = wrappedVolume(flakeOpts, TILE, { value: new THREE.Vector2() });
  const flakeLists = flakeGeos.map(() => []);
  for (let i = 0; i < 70; i++) {
    const size = 15 + rand() ** 2 * 90;
    const [x, z] = inTile((rand() - 0.5) * (TILE - 200), (rand() - 0.5) * (TILE - 200));
    const onFloor = rand() < 0.55;
    const y = onFloor ? size * 0.15 + 2 : 30 + rand() * (DEPTH - 60);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(onFloor ? (rand() - 0.5) * 0.3 : rand() * 3, rand() * 6.3, onFloor ? (rand() - 0.5) * 0.3 : rand() * 3)),
      new THREE.Vector3(size, size, size));
    flakeLists[i % 5].push(m);
    if (size >= 30) obstacles.push({ kind: 'sphere', c: new THREE.Vector3(x, y, z), r: size * 0.42, what: 'detritus', wrap: true });
  }
  const flakeMeshes = flakeLists.map((list, k) => {
    const im = new THREE.InstancedMesh(flakeGeos[k], flakeMat, list.length);
    list.forEach((m, i) => im.setMatrixAt(i, m));
    im.frustumCulled = false;
    group.add(im);
    return im;
  });
  // the meniscus: the air-water edge of the dish, a bright refractile wall far out
  {
    const g = new THREE.CylinderGeometry(DROP_R, DROP_R, DEPTH, 720, 6, true);
    g.translate(0, DEPTH / 2, 0);
    const pos = g.attributes.position;
    g.setAttribute('aRef', new THREE.BufferAttribute(pos.array.slice(), 3));
    const e = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) e[i] = 0.4 + 0.6 * Math.abs(pos.getY(i) / DEPTH - 0.5) * 2; // brighter where it meets the glass
    g.setAttribute('aEdge', new THREE.BufferAttribute(e, 1));
    group.add(Object.assign(new THREE.Mesh(g, sheetMaterial({ dn: 0.33, thick: 0.6, scatter: 2.2, absorb: [0.004, 0.004, 0.005] })), { frustumCulled: false }));
  }

  // --- Diatoms: 24 in each tile, near and far in every direction ---
  const diatoms = [];
  const dMat = volumeMaterial({ dn: 0.034, scatter: 1.7, absorb: [0.0035, 0.0075, 0.02], pattern: 2, rimPow: 2.2 });
  const pinGeo = pinnulariaGeometry(), fraGeo = fragilariaGeometry();
  const diatomSpots = [[-220, 7, 260, 0.6, pinGeo], [140, 7, -340, 2.0, pinGeo], [-560, 7, -120, -0.4, pinGeo], [-90, 9, -60, 1.1, fraGeo], [560, 9, -380, 0.3, fraGeo]]
    .map(([x, y, z, r, g]) => [x + 150, y, z - 60, r, g]); // (laid out round the start)
  for (let k = 0; k < 19; k++) diatomSpots.push([(rand() - 0.5) * (TILE - 400), rand() < 0.5 ? 7 : 9, (rand() - 0.5) * (TILE - 400), rand() * 6.28, rand() < 0.65 ? pinGeo : fraGeo]);
  for (const [x, y, z, rot, g] of diatomSpots) {
    const m = new THREE.Mesh(g, dMat);
    m.rotation.y = rot;
    m.frustumCulled = false;
    group.add(m);
    const home = new THREE.Vector3(START.x + x, y, START.z + z);
    const d = { mesh: m, home, pos: home.clone(), rot, glide: g === pinGeo, phase: rand() * 6 };
    m.position.copy(d.pos);
    diatoms.push(d);
    items.push({ obj: m, base: d.pos, c: d.pos });
    obstacles.push({ kind: 'sphere', c: d.pos, r: 30, what: 'diatom', wrap: true });
  }

  // --- Vorticella colonies, each on its own flake: eight by the start, more round the tile ---
  const vGeo = vorticellaGeometry();
  const vMat = volumeMaterial({ dn: 0.024, scatter: 1.05, absorb: [0.0015, 0.002, 0.0028] });
  const vMacroGeo = new THREE.TorusGeometry(11, 2.6, 8, 24, 4.4);
  const vMacroMat = volumeMaterial({ dn: 0.018, scatter: 0.5, centred: true });
  const cFlakeMat = volumeMaterial({ ...flakeOpts, centred: true });
  const vorticellas = [], colonies = [];
  const COLONIES = [[710, 270, 8, 150], [-410, -470, 5, 130], [2600, -1800, 6, 140], [-2300, 1900, 6, 140], [-500, 2900, 5, 130], [2900, 900, 5, 130]];
  for (const [cx, cz, nv, fsize] of COLONIES) {
    const cg = new THREE.Group();
    const base = new THREE.Vector3(START.x + cx, 0, START.z + cz);
    cg.position.copy(base);
    group.add(cg);
    const flake = new THREE.Mesh(flakeGeos[colonies.length % 5], cFlakeMat);
    flake.position.set(0, 30, 0); flake.scale.setScalar(fsize); flake.rotation.set(0.1, 0.4 + colonies.length, -0.05);
    flake.frustumCulled = false;
    cg.add(flake);
    obstacles.push({ kind: 'sphere', c: base.clone().setY(30), r: fsize * 0.42, what: 'detritus', wrap: true });
    const stalkItems = [], list = [];
    const anchorC = new THREE.Vector3(0, 30 + 22 * fsize / 150, 0);
    for (let i = 0; i < nv; i++) {
      const a = (i / nv) * Math.PI * 2 + rand() * 0.5;
      const anchor = anchorC.clone().add(new THREE.Vector3(Math.cos(a) * (20 + rand() * 40), 0, Math.sin(a) * (20 + rand() * 40)));
      const dir = new THREE.Vector3(Math.cos(a) * 0.55, 1, Math.sin(a) * 0.55).add(new THREE.Vector3(rand() - 0.5, 0, rand() - 0.5).multiplyScalar(0.5)).normalize();
      const perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0.3, 0.1, 1).normalize()).normalize();
      const L = 90 + rand() * 50;
      stalkItems.push({ base: anchor.toArray(), normal: dir.toArray(), dir: perp.toArray(), length: L, width: 2.4, phase: 0, kind: KIND.STALK });
      const g = new THREE.Group();
      const body = new THREE.Mesh(vGeo, vMat); body.frustumCulled = false; g.add(body);
      const mac = new THREE.Mesh(vMacroGeo, vMacroMat); mac.position.set(0, 26, 0); mac.rotation.set(0.2, 0.3, 1.4); g.add(mac);
      const ring = [];
      for (let k = 0; k < 64; k++) {
        const t = (k / 64) * Math.PI * 2;
        const n = [Math.cos(t) * 0.6, 0.8, Math.sin(t) * 0.6];
        ring.push({ base: [Math.cos(t) * 19.5, 45, Math.sin(t) * 19.5], normal: n, dir: [-Math.sin(t), 0, Math.cos(t)], length: 11, width: 0.8, phase: k / 64 * 3, kind: KIND.CILIUM });
      }
      const rs = createStrands(ring, { segs: 5, dn: 0.07, scatter: 0.8 });
      g.add(rs.mesh);
      cg.add(g);
      // anchor: local to the colony; sphere.c: in the first copy of the tile (collisions wrap it)
      const v = { group: g, anchor, dir, L, coil: 0, hold: 0, ring: rs, phase: rand() * 10, colony: colonies.length, idx: i, perp,
        sphere: { kind: 'sphere', c: new THREE.Vector3(), r: 27, what: 'Vorticella', wrap: true } };
      v.sphere.ref = v;
      obstacles.push(v.sphere);
      vorticellas.push(v); list.push(v);
    }
    const stalks = createStrands(stalkItems, { segs: 72, dn: 0.05, scatter: 1.0 });
    cg.add(stalks.mesh);
    const col = { group: cg, base, stalks, list };
    colonies.push(col);
    items.push({ obj: cg, base, c: base });
  }

  // --- the ciliate hunters: two Didinium and a Dileptus ---
  // Each keeps to its own waters beyond the halfway point of the route
  // (`home`, `homeR`; main.js and encounters.js hold it there), so the first
  // half of the drop is calm. `tipLen`: how far ahead of its centre the
  // toxicyst tip is (the Didinium's short proboscis, the Dileptus's long trunk).
  const dGeo = didiniumGeometry();
  const didMat = volumeMaterial({ dn: 0.03, scatter: 1.1, absorb: [0.0022, 0.003, 0.0048] });
  const dMacroGeo = new THREE.TorusGeometry(21, 5, 10, 28, 4.3);
  const didinia = [];
  const granulesIn = (n, sx, sr, x0) => {
    const iPos = new Float32Array(n * 4), iP = new Float32Array(n * 4);
    for (let k = 0; k < n; k++) {
      let x, y, z;
      do { x = rand() * 2 - 1; y = rand() * 2 - 1; z = rand() * 2 - 1; } while (x * x + y * y + z * z > 1);
      iPos.set([x * sx + x0, y * sr, z * sr, 0], k * 4);
      iP.set([0.6 + rand() * 1.4, 0.07, 0.9, rand()], k * 4);
    }
    const { geo } = instancedQuads(n, iPos, iP);
    return Object.assign(new THREE.Mesh(geo, pointsMaterial({ absorb: [0.01, 0.012, 0.02] })), { frustumCulled: false });
  };
  // on their ring, a little either side of the bearing they are moved to (main.js placeRing)
  const HOMES = [ringPoint(RINGS.didinium, A0 - 0.12, DEPTH * 0.58), ringPoint(RINGS.didinium, A0 + 0.12, DEPTH * 0.5)];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    g.add(Object.assign(new THREE.Mesh(dGeo, didMat), { frustumCulled: false }));
    const mac = new THREE.Mesh(dMacroGeo, volumeMaterial({ dn: 0.016, scatter: 0.5, centred: true }));
    mac.rotation.set(0, Math.PI / 2, 0.6); mac.position.x = -6;
    g.add(mac);
    const ring = [];
    for (const [x0, R] of [[24, 36.5], [-20, 35]]) {
      for (let k = 0; k < 120; k++) {
        const t = (k / 120) * Math.PI * 2;
        ring.push({ base: [x0, Math.cos(t) * R, Math.sin(t) * R], normal: [0.15, Math.cos(t), Math.sin(t)], dir: [-1, 0, 0], length: 11, width: 0.8, phase: -k / 120 * 5, kind: KIND.CILIUM });
      }
    }
    const rs = createStrands(ring, { segs: 5, dn: 0.07, scatter: 0.8 });
    g.add(rs.mesh);
    g.add(granulesIn(380, 45, 30, -4));
    group.add(g);
    const start = HOMES[i].clone();
    g.position.copy(start);
    didinia.push({ kind: 'didinium', label: 'Didinium', group: g, ring: rs, pos: start.clone(), dir: new THREE.Vector3(rand() - 0.5, 0, rand() - 0.5).normalize(), roll: 0, phase: 0,
      state: 'wander', stun: 0, turnT: 0, speed: 0, vel: new THREE.Vector3(), home: HOMES[i].clone(), homeR: 250, tipLen: 66, speedK: 1, radius: 60, ringR: RINGS.didinium, offset: i ? 0.12 : -0.12 });
  }
  // Dileptus: a long, flask-shaped hunting ciliate (≈330 µm here) whose
  // trunk-like proboscis is lined with toxicysts. It slashes prey with the
  // trunk and engulfs it at the trunk's base. Paramecium's trichocysts really
  // do drive it off (C14).
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(dileptusGeometry(), volumeMaterial({ dn: 0.026, scatter: 1.05, absorb: [0.0016, 0.0022, 0.0034] }));
    body.frustumCulled = false;
    g.add(body);
    // the moniliform (bead-chain) macronucleus
    const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), volumeMaterial({ dn: 0.016, scatter: 0.5, absorb: [0.0015, 0.0015, 0.002], centred: true }), 9);
    for (let k = 0; k < 9; k++) beads.setMatrixAt(k, new THREE.Matrix4().makeScale(8, 7, 7).setPosition(-95 + k * 15, 3 * Math.sin(k * 1.7), 4 * Math.cos(k * 1.3)));
    beads.frustumCulled = false;
    g.add(beads);
    // cilia in rows along the body and a dense fringe along the trunk's ventral edge
    const cil = [];
    for (let row = 0; row < 8; row++) {
      const a0 = (row / 8) * Math.PI * 2;
      for (let k = 0; k < 26; k++) {
        const x = -150 + k * 9.5, r = dileptusRadius(x);
        const a = a0 + k * 0.05;
        cil.push({ base: [x, Math.cos(a) * r, Math.sin(a) * r], normal: [0.1, Math.cos(a), Math.sin(a)], dir: [-1, 0, 0], length: 9, width: 0.8, phase: -k / 26 * 4 + row * 0.3, kind: KIND.CILIUM });
      }
    }
    for (let k = 0; k < 40; k++) {
      const x = 40 + k * 3, r = dileptusRadius(x);
      cil.push({ base: [x, -r, 0], normal: [0, -1, 0], dir: [-1, 0, 0], length: 8, width: 0.8, phase: -k / 40 * 3, kind: KIND.CILIUM });
    }
    const rs = createStrands(cil, { segs: 5, dn: 0.07, scatter: 0.8 });
    g.add(rs.mesh);
    g.add(granulesIn(420, 95, 30, -40));
    group.add(g);
    const home = ringPoint(RINGS.dileptus, A0, DEPTH * 0.45);
    g.position.copy(home);
    didinia.push({ kind: 'dileptus', label: 'Dileptus', group: g, ring: rs, pos: home.clone(), dir: new THREE.Vector3(1, 0, 0), roll: 0, phase: 0,
      state: 'wander', stun: 0, turnT: 0, speed: 0, vel: new THREE.Vector3(), home: home.clone(), homeR: 250, tipLen: 160, speedK: 0.62, radius: 45, ringR: RINGS.dileptus, offset: 0 });
  }

  // --- the water's texture, repeated round every view ---
  const ambient = createAmbient(group, { tile: 1500, depth: DEPTH });

  // --- Bacteria ---
  const NB = 2400, BOX = 700;
  const bPos = new Float32Array(NB * 4), bP = new Float32Array(NB * 4), bVel = new Float32Array(NB * 3), bT = new Float32Array(NB);
  for (let i = 0; i < NB; i++) {
    bPos.set([(rand() - 0.5) * 2 * BOX, rand() * DEPTH, (rand() - 0.5) * 2 * BOX, 0], i * 4);
    const rod = rand() < 0.7;
    bP.set([rod ? 0.55 : 0.7, 0.07, 7.0, rand()], i * 4);
    const a = rand() * 6.28, e = rand() - 0.5;
    const sp = rand() < 0.5 ? 0 : 8 + rand() * 20; // half are motile
    bVel.set([Math.cos(a) * sp, e * sp, Math.sin(a) * sp], i * 3);
    bT[i] = rand() * 2;
  }
  const { geo: bGeo, posAttr: bAttr } = instancedQuads(NB, bPos, bP);
  const bacteria = new THREE.Mesh(bGeo, pointsMaterial({ rod: true }));
  bacteria.frustumCulled = false;
  group.add(bacteria);

  // ------------------------------------------------------------------------
  // switches (the feature panel)
  const opts = { squirmer: true, feeding: true, ambient: true, tumble: true, vortContract: true };
  const flow = new THREE.Vector3();
  /** Ambient flow (µm/s): a slow drift with gentle eddies. */
  function flowAt(p, t, out = flow) {
    if (!opts.ambient) return out.set(0, 0, 0);
    return out.set(
      18 + 10 * Math.sin(p.z / 320 + t * 0.05),
      2.5 * Math.sin(p.x / 270 + t * 0.07),
      5 + 9 * Math.cos(p.x / 380 - t * 0.04),
    );
  }

  /**
   * Collide a capsule (a–b, radius r) with everything solid. Returns the
   * deepest contact {n, depth, ob, p} or null (p: the contact point; ob.glass
   * for the slide, coverslip and meniscus).
   */
  const cA = new THREE.Vector3(), cB = new THREE.Vector3();
  const GLASS = { slide: { what: 'the slide', glass: true }, coverslip: { what: 'the coverslip', glass: true }, rim: { what: 'the edge of the drop', glass: true } };
  function collide(a, b, r) {
    let best = null;
    for (const ob of obstacles) {
      let d, n;
      if (ob.kind === 'sphere') {
        closestOnSeg(ob.c, a, b, cA);
        d = cA.distanceTo(ob.c) - ob.r - r;
        if (d < 0) n = v1.subVectors(cA, ob.c).normalize();
      } else {
        d = segSeg(a, b, ob.a, ob.b, cA, cB) - ob.r - r;
        if (d < 0) n = v1.subVectors(cA, cB).normalize();
      }
      if (d < 0 && (!best || d < -best.depth)) best = { n: n.clone(), depth: -d, ob, p: cA.clone().addScaledVector(n, -r) };
    }
    // the drop: slide, coverslip and its rim
    const mid = v2.addVectors(a, b).multiplyScalar(0.5);
    const lo = Math.min(a.y, b.y) - r, hi = Math.max(a.y, b.y) + r;
    const low = a.y < b.y ? a : b, high = a.y < b.y ? b : a;
    if (lo < 0 && (!best || -lo > best.depth)) best = { n: new THREE.Vector3(0, 1, 0), depth: -lo, ob: GLASS.slide, p: new THREE.Vector3(low.x, 0, low.z) };
    if (hi > DEPTH && (!best || hi - DEPTH > best.depth)) best = { n: new THREE.Vector3(0, -1, 0), depth: hi - DEPTH, ob: GLASS.coverslip, p: new THREE.Vector3(high.x, DEPTH, high.z) };
    const out = Math.hypot(a.x, a.z) > Math.hypot(b.x, b.z) ? a : b;
    const rr = Math.hypot(out.x, out.z) + r;
    if (rr > DROP_R) {
      const n = new THREE.Vector3(-mid.x, 0, -mid.z).normalize();
      if (!best || rr - DROP_R > best.depth) best = { n, depth: rr - DROP_R, ob: GLASS.rim, p: new THREE.Vector3(out.x, out.y, out.z).multiplyScalar(DROP_R / Math.max(1, rr - r)).setY(out.y) };
    }
    return best;
  }

  /** Touch a Vorticella: its stalk snaps into a coil; neighbours may follow. */
  function touchVorticella(v, t) {
    if (opts.vortContract && v.coil < 0.5) {
      v.coil = 1; v.hold = 0.5 + Math.random() * 0.4;
      for (const o of vorticellas) if (o !== v && o.coil < 0.5 && o.anchor.distanceTo(v.anchor) < 90 && Math.random() < 0.5) {
        o.pendingAt = t + 0.03 + Math.random() * 0.1;
      }
      return true;
    }
    return false;
  }

  const api = {
    group, obstacles, opts, vorticellas, ambient, didinia, diatoms, bacteria, flowAt, collide, touchVorticella, DEPTH, DROP_R,
    bacteriaCount: NB,
    /**
     * @param {number} dt
     * @param {number} t
     * @param {object} player { center, axisA, axisB, T, U (velocity), mouth, feed, alive }
     * @returns {{eaten:number}}
     */
    update(dt, t, who) {
      // one player, or (local multiplayer) a list of them: the bacteria box follows
      // their middle and each one's swimming and feeding currents act on it
      const list = Array.isArray(who) ? who.filter((p) => p) : [who];
      const player = list[0];
      let mx = 0, mz = 0;
      for (const p of list) { mx += p.center.x; mz += p.center.z; }
      mx /= list.length; mz /= list.length;
      const eatenBy = list.map(() => 0);
      ambient.update(t);
      // Vorticella
      const sp = stalks.attrs.iP.array;
      vorticellas.forEach((v, i) => {
        if (v.pendingAt && t >= v.pendingAt) { v.pendingAt = 0; v.coil = 1; v.hold = 0.4 + Math.random() * 0.4; }
        if (v.coil > 0) {
          if (v.hold > 0) v.hold -= dt;
          else v.coil = Math.max(0, v.coil - dt / 3.2); // slow re-extension
        }
        const c = v.coil;
        sp[i * 4 + 2] = c;
        const Lc = v.L * (1 - 0.78 * c);
        const sway = (1 - c) * 4 * Math.sin(t * 0.9 + v.anchor.x * 0.05);
        const perp = v3.fromArray(stalkItems[i].dir);
        v.group.position.copy(v.anchor).addScaledVector(v.dir, Lc).addScaledVector(perp, sway);
        v.group.quaternion.setFromUnitVectors(v4.set(0, 1, 0), v.dir);
        const sq = 1 - 0.3 * c;
        v.group.scale.set(1 - 0.12 * c, sq, 1 - 0.12 * c);
        v.ring.mat.uniforms.uPhase.value = t * 2.2 + v.phase;
        v.ring.mat.uniforms.uAmp.value = 1 - 0.8 * c;
        v.ring.mat.uniforms.uAlpha.value = 1 - 0.7 * c;
        v.sphere.c.copy(v.group.position).addScaledVector(v.dir, 22 * sq);
      });
      stalks.attrs.iP.needsUpdate = true;

      // Diatoms glide slowly back and forth along their raphe (a few µm/s).
      for (const d of diatoms) {
        if (!d.glide) continue;
        const s = Math.sin(t * 0.08 + d.phase) * 25;
        d.mesh.position.set(d.home.x + Math.cos(d.rot) * s, d.home.y, d.home.z - Math.sin(d.rot) * s);
      }

      // Bacteria: ambient flow + their own swimming + the flow the Paramecium
      // makes (a neutral squirmer's dipole: carried ahead at the poles, swept
      // back along the sides) + the feeding current into the oral groove.
      const px = mx, pz = mz;
      let eaten = 0;
      const arr = bAttr.array;
      const q = v1, f = v2;
      for (let i = 0; i < NB; i++) {
        const o = i * 4;
        q.set(arr[o], arr[o + 1], arr[o + 2]);
        flowAt(q, t, f);
        if (!opts.ambient) f.set(0, 0, 0);
        bT[i] -= dt;
        if (bT[i] < 0) { // tumble
          bT[i] = 0.6 + Math.random() * 1.8;
          const sp0 = Math.hypot(bVel[i * 3], bVel[i * 3 + 1], bVel[i * 3 + 2]);
          if (sp0 > 0) { const a = Math.random() * 6.28, e = Math.random() - 0.5; bVel[i * 3] = Math.cos(a) * sp0; bVel[i * 3 + 1] = e * sp0; bVel[i * 3 + 2] = Math.sin(a) * sp0; }
        }
        if (opts.tumble) { f.x += bVel[i * 3]; f.y += bVel[i * 3 + 1]; f.z += bVel[i * 3 + 2]; }
        for (let k = 0; k < list.length; k++) {
          const pl = list[k];
          const dx = q.x - pl.center.x, dy = q.y - pl.center.y, dz = q.z - pl.center.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (pl.alive && d2 < 300 * 300) {
            if (opts.squirmer) squirmerFlow(q, pl.axisA, pl.axisB, pl.U, 32, f);
            // feeding current toward the cytostome
            const md = opts.feeding ? sink(q, pl.mouth, 40 + 420 * pl.feed, 90 + 110 * pl.feed, f) : q.distanceTo(pl.mouth);
            if (md < 7 + 3 * pl.feed && arr[o + 1] > -1000) { eaten++; eatenBy[k]++; arr[o + 1] = -1e4; }
          }
        }
        // Vorticella feeding currents
        if (opts.feeding) for (const v of vorticellas) {
          if (v.coil > 0.2) continue;
          const vx = v.sphere.c.x - q.x, vy = v.sphere.c.y - q.y, vz = v.sphere.c.z - q.z;
          const vd2 = vx * vx + vy * vy + vz * vz;
          if (vd2 < 110 * 110) { const vd = Math.sqrt(vd2); const s = 70 * (1 - vd / 110) ** 2 / Math.max(vd, 1); f.x += vx * s; f.y += vy * s; f.z += vz * s; if (vd < 18) arr[o + 1] = -1e4; }
        }
        let nx = q.x + f.x * dt, ny = q.y + f.y * dt, nz = q.z + f.z * dt;
        // wrap in a box around the player so the density stays even
        if (arr[o + 1] < -1000) { // eaten: respawn at the far side of the box
          nx = px + (Math.random() - 0.5) * 2 * BOX; nz = pz + (Math.random() < 0.5 ? -BOX : BOX) * 0.98; ny = Math.random() * DEPTH;
        }
        if (nx < px - BOX) nx += 2 * BOX; else if (nx > px + BOX) nx -= 2 * BOX;
        if (nz < pz - BOX) nz += 2 * BOX; else if (nz > pz + BOX) nz -= 2 * BOX;
        if (ny < 1) ny = 1 + Math.random() * 2; else if (ny > DEPTH - 1) ny = DEPTH - 1 - Math.random() * 2;
        arr[o] = nx; arr[o + 1] = ny; arr[o + 2] = nz;
      }
      bAttr.needsUpdate = true;
      void player;
      return { eaten, eatenBy };
    },
  };
  return api;
}
