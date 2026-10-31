// A box mite (Phthiracaridae, Oribatida), about 0.6 mm long, in µm.
//
// Anatomy (built from parts, not traced):
// - Notogaster: one laterally compressed, egg-shaped dorsal shield with a
//   thickened anterior collar, 14 pairs of short notogastral setae lying back
//   along the shield, and the genitoanal plates set in a ventral slot.
// - Aspis (prodorsum): a hood hinged to the front of the notogaster, with a
//   rostrum, rostral, lamellar, interlamellar and exobothridial setae, and a
//   pair of sensilli standing out of cup-shaped bothridia.
// - Chelicerae (chelate) and palps under the rostrum.
// - Eight legs coming out of the soft podosomal region under the aspis, each
//   trochanter-femur-genu-tibia-tarsus with one claw (monodactyl). The coxae
//   are fused into the ventral plates, as in all oribatids. Leg I is the
//   longest and is lifted higher in swing (it is used to feel ahead).
// - Ptychoidy: the legs pull into the body and the aspis swings down over
//   them, sealing a smooth seed-like capsule.
//
// Thin parts are drawn thicker than life so they survive the screen: legs
// about 1.3x, setae about 1.6x (3 µm instead of ~2 µm), sensilli 1.5x.
//
// Jump (a game borrowing, see the README): jump() crouches for JUMP.crouch s,
// then launches the body on a ballistic arc (modes 'crouch' and 'air'); it
// lands on whatever is below, floor, grain or a blade (which takes a kick and
// bends), and can jump again after JUMP.cool s. Box mites do not do this;
// zetorchestid oribatids jump with enlarged hind legs.
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd, combine } from '../shared/sdf.js';
import { gMaterial } from './sem.js';
import { HALF, floorH, floorN } from './world.js';
import { GAITS, legOffset, gaitTriggers, swingTarget, twoBoneIK } from '../shared/techniques/mite-gait.js';

/** Live switches, shared by every mite (the feature panel edits it). */
export const CFG = { gait: 'tetrapod', ik: true, bob: true, roll: true, closeTime: 0.16, setae: true, climb: true, clear: true };

/** Collider kinds that bend out of the way instead of being climbed or blocking the body. */
const SOFT = new Set(['blade']);
// Directions (body frame) for the body-clearance rays: around the waist, and up.
const CLEAR_DIRS = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
  [1, 0.7, 0], [-1, 0.7, 0], [0, 0.7, 1], [0, 0.7, -1], [0, 1, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
const _dn = new THREE.Vector3(), _al = new THREE.Vector3();
const BELLY = [[0, -1, 0], [0.6, -1, 0], [-0.6, -1, 0], [0, -1, 0.6], [0, -1, -0.6]].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/** The hop: crouch time (s), launch speeds (µm/s, up and forward), cooldown after landing (s). */
export const JUMP = { crouch: 0.13, vy: 1250, vh: 700, cool: 0.45 };

export const ANAT = {
  noto: { c: [-70, 0, 0], r: [215, 172, 136] },
  hinge: [96, 40, 0],
  aspisOpen: -0.5,      // radians about the hinge (rostrum tipped down)
  aspisClosed: -2.3,    // folded down over the leg cavity
  stand: 196,           // body origin above the ground while walking
  stride: 118,
  duty: 0.64,
  // L legs are at -z, R legs at +z. seg: tr, fe, ge, ti, ta; rad likewise.
  legs: [
    { hip: [168, -96, 36], rest: [322, -196, 132], seg: [27, 92, 34, 63, 83], rad: [13, 14.5, 12, 11, 9.5] },
    { hip: [140, -114, 52], rest: [212, -196, 196], seg: [25, 76, 29, 52, 69], rad: [12.5, 14, 11.5, 10.5, 9] },
    { hip: [104, -126, 58], rest: [64, -196, 210], seg: [25, 72, 27, 52, 67], rad: [12.5, 14, 11.5, 10.5, 9] },
    { hip: [64, -134, 54], rest: [-58, -196, 176], seg: [29, 83, 29, 56, 74], rad: [13, 14.5, 11.5, 10.5, 9] },
  ],
};

// ---------- geometry ----------

function bounded(f, [cx, cy, cz], r) {
  return (x, y, z) => {
    const d = Math.hypot(x - cx, y - cy, z - cz) - r;
    return d > 24 ? d : f(x, y, z);
  };
}
function groove(a, b, r) { // a small capsule, bounded for speed
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const half = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2;
  return bounded(sd.capsule(a, b, r), c, half + r);
}

/** March from p along d to the zero of f; returns {p, n}. */
function surfacePoint(f, p, d) {
  d = d.clone().normalize();
  let t = 0;
  const q = new THREE.Vector3();
  while (t < 600 && f(...q.copy(p).addScaledVector(d, t).toArray()) < 0) t += 3;
  let a = Math.max(0, t - 3), b = t;
  for (let i = 0; i < 20; i++) { const m = (a + b) / 2; if (f(...q.copy(p).addScaledVector(d, m).toArray()) < 0) a = m; else b = m; }
  const P = p.clone().addScaledVector(d, b);
  const e = 1;
  const n = V3(f(P.x + e, P.y, P.z) - f(P.x - e, P.y, P.z), f(P.x, P.y + e, P.z) - f(P.x, P.y - e, P.z), f(P.x, P.y, P.z + e) - f(P.x, P.y, P.z - e)).normalize();
  return { p: P, n };
}

function notoParts() {
  const { c, r } = ANAT.noto;
  const [cx] = c, [rx, ry, rz] = r;
  const yv = (x, z) => -ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2 - (z / rz) ** 2));
  const parts = [
    { id: 0, sdf: sd.ellipsoid(c, r) },
    // the anterior opening the legs come out of, and the aspis folds into
    { id: 0, op: 'sub', sdf: sd.ellipsoid([160, -104, 0], [94, 92, 98]), blend: 14 },
    // soft podosoma (arthrodial membrane) filling the opening
    { id: 1, sdf: sd.ellipsoid([102, -70, 0], [66, 52, 70]), blend: 16 },
  ];
  // genitoanal plates: two longitudinal sutures, a transverse one and the midline
  for (const z0 of [-36, 36]) {
    for (let x = -262; x < 40; x += 50) parts.push({ id: 0, op: 'sub', blend: 3, sdf: groove([x, yv(x, z0) + 1, z0], [x + 50, yv(x + 50, z0) + 1, z0], 4.5) });
  }
  for (let x = -262; x < 40; x += 50) parts.push({ id: 0, op: 'sub', blend: 3, sdf: groove([x, yv(x, 0) + 1, 0], [x + 50, yv(x + 50, 0) + 1, 0], 3.2) });
  parts.push({ id: 0, op: 'sub', blend: 3, sdf: groove([-105, yv(-105, -36) + 1, -36], [-105, yv(-105, 0) + 1, 0], 4) });
  parts.push({ id: 0, op: 'sub', blend: 3, sdf: groove([-105, yv(-105, 0) + 1, 0], [-105, yv(-105, 36) + 1, 36], 4) });
  // anterior collar: a groove ringing the front of the shield
  const x0 = 104, k = Math.sqrt(1 - ((x0 - cx) / rx) ** 2);
  const ring = (a) => [x0, ry * k * Math.cos(a), rz * k * Math.sin(a)];
  for (let a = -2.1; a < 2.1; a += 0.35) parts.push({ id: 0, op: 'sub', blend: 3, sdf: groove(ring(a), ring(a + 0.35), 4.5) });
  return parts;
}

function aspisParts() {
  const parts = [
    { id: 2, sdf: sd.ellipsoid([80, -40, 0], [112, 66, 70]) },
    { id: 2, sdf: sd.roundCone([128, -54, 0], [200, -88, 0], 44, 17), blend: 28 },
    // lateral carinae along the hood
    { id: 2, sdf: sd.mirrorZ(sd.capsule([20, -6, 62], [160, -64, 34], 4.5)), blend: 8 },
    // hollow underneath, where the chelicerae and leg I tuck in
    { id: 2, op: 'sub', sdf: sd.ellipsoid([56, -122, 0], [110, 46, 52]), blend: 12 },
  ];
  const hood = combine(parts);
  const both = surfacePoint(hood, V3(80, -40, 30), V3(-0.3, 0.7, 0.62));
  const b = both.p, bn = both.n;
  parts.push({ id: 2, sdf: sd.mirrorZ(sd.sphere([b.x, b.y, b.z], 15)), blend: 8 });
  const cup = b.clone().addScaledVector(bn, 9);
  parts.push({ id: 2, op: 'sub', sdf: sd.mirrorZ(sd.sphere([cup.x, cup.y, cup.z], 8.5)), blend: 2 });
  // chelicerae: stout, chelate, under the rostrum
  parts.push({ id: 3, sdf: sd.mirrorZ(sd.roundCone([100, -86, 14], [186, -112, 10], 14, 8.5)), blend: 6 });
  parts.push({ id: 3, sdf: sd.mirrorZ(sd.roundCone([186, -112, 10], [210, -115, 9], 6.5, 2.4)), blend: 3 });
  parts.push({ id: 3, sdf: sd.mirrorZ(sd.roundCone([180, -120, 10], [205, -127, 9], 5, 2)), blend: 3 });
  // palps
  parts.push({ id: 4, sdf: sd.mirrorZ(sd.roundCone([86, -98, 36], [136, -124, 42], 8.5, 6.5)), blend: 5 });
  parts.push({ id: 4, sdf: sd.mirrorZ(sd.roundCone([136, -124, 42], [166, -134, 38], 6.5, 4.2)), blend: 3 });
  return { parts, bothridium: { p: b.clone().addScaledVector(bn, 3), n: bn } };
}

function setaGeo() {
  const g = new THREE.CylinderGeometry(0.22, 1, 1, 6, 1, false);
  g.translate(0, 0.5, 0);
  return g;
}
function sensillusGeo() {
  // a slender stalk with a fusiform head
  const pts = [[0, 0], [1, 0], [0.75, 0.35], [0.8, 0.55], [1.5, 0.74], [1.3, 0.9], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 8);
}
function segGeo(tarsus) {
  const prof = tarsus
    ? [[0, 0], [0.8, 0.02], [0.96, 0.18], [1, 0.4], [0.82, 0.7], [0.5, 0.94], [0, 1]]
    : [[0, 0], [0.7, 0.02], [0.86, 0.1], [1, 0.45], [0.98, 0.8], [0.8, 0.96], [0, 1]];
  return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 10);
}
function clawGeo() {
  // a curved hook along +y bending toward -z
  const pos = [], idx = [];
  const S = 8, RS = 6, A = 1.7, Rr = 0.62;
  for (let i = 0; i <= S; i++) {
    const t = i / S;
    const c = V3(0, Math.sin(t * A) * Rr, (Math.cos(t * A) - 1) * Rr);
    const T = V3(0, Math.cos(t * A), -Math.sin(t * A));
    const B = V3(1, 0, 0), N = new THREE.Vector3().crossVectors(T, B);
    const r = 0.24 * (1 - t) + 0.02;
    for (let j = 0; j < RS; j++) {
      const a = (j / RS) * Math.PI * 2;
      const p = c.clone().addScaledVector(B, Math.cos(a) * r).addScaledVector(N, Math.sin(a) * r);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < RS; j++) {
    const a = i * RS + j, b = i * RS + ((j + 1) % RS), c = a + RS, d = b + RS;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const t0 = performance.now();
  const np = notoParts();
  const noto = buildSdfMesh(np, { min: [-292, -180, -144], max: [152, 178, 144], cell: 6.5 });
  const ap = aspisParts();
  const aspis = buildSdfMesh(ap.parts, { min: [-44, -164, -98], max: [252, 52, 98], cell: 5 });
  for (const g of [noto, aspis]) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const fNoto = combine(np), fAsp = combine(ap.parts);

  // body setae in rows (c, d, e, h, ps), lying back along the shield
  const { c, r } = ANAT.noto;
  const bodySetae = [];
  const rows = [[0.58, [0.18, 0.62, 1.12]], [0.22, [0.3, 0.85, 1.4]], [-0.18, [0.45, 1.2]], [-0.52, [0.3, 0.9, 1.5]], [-0.8, [0.6, 1.2, 1.75]]];
  for (const [fx, angs] of rows) for (const a of angs) for (const s of [-1, 1]) {
    const k = Math.sqrt(1 - fx * fx);
    const dir = V3(fx * r[0], r[1] * k * Math.cos(a), s * r[2] * k * Math.sin(a));
    const sp = surfacePoint(fNoto, V3(...c), V3(dir.x / r[0], dir.y / r[1], dir.z / r[2]).normalize());
    const d = sp.n.clone().multiplyScalar(0.32).add(V3(-0.9, 0.05, 0)).normalize();
    bodySetae.push({ p: sp.p.addScaledVector(sp.n, -1.5), d, len: 36 + ((fx * 31 + a * 7) % 1 + 1) % 1 * 14, rad: 2.4 });
  }
  // prodorsal setae
  const aspSetae = [];
  const aspSeta = (from, dir, bend, len, rad) => {
    for (const s of [-1, 1]) {
      const sp = surfacePoint(fAsp, V3(from[0], from[1], from[2] * s), V3(dir[0], dir[1], dir[2] * s));
      const d = sp.n.clone().multiplyScalar(bend[3]).add(V3(bend[0], bend[1], bend[2] * s)).normalize();
      aspSetae.push({ p: sp.p.addScaledVector(sp.n, -1.5), d, len, rad });
    }
  };
  aspSeta([176, -76, 0], [0.4, 0.6, 0.45], [1, 0.25, 0, 0.5], 38, 2.4);   // rostral
  aspSeta([122, -46, 0], [0.1, 1, 0.42], [1, 0.25, 0, 0.6], 44, 2.4);     // lamellar
  aspSeta([70, -34, 0], [-0.1, 1, 0.3], [0.2, 0.7, 0.1, 1], 56, 2.6);    // interlamellar
  aspSeta([52, -52, 0], [-0.1, 0.05, 1], [0.2, 0, 0.2, 1], 18, 2.2);     // exobothridial
  const bp = ap.bothridium;
  const sens = [];
  for (const s of [-1, 1]) {
    const p = V3(bp.p.x, bp.p.y, bp.p.z * s), n = V3(bp.n.x, bp.n.y, bp.n.z * s);
    sens.push({ p, d: n.clone().add(V3(-0.2, 0.9, 0.35 * s)).normalize(), len: 80, rad: 3 });
  }
  console.info(`[mite] anatomy meshed in ${(performance.now() - t0).toFixed(0)} ms: notogaster ${noto.index.count / 3} tris, aspis ${aspis.index.count / 3} tris`);
  GEO = { noto, aspis, bodySetae, aspSetae, sens, seta: setaGeo(), sensillus: sensillusGeo(), seg: segGeo(false), tars: segGeo(true), claw: clawGeo() };
  return GEO;
}

// ---------- the predator: a parasitid (Mesostigmata, Parasitidae) ----------
// Pergamasus / Parasitus type: a flattened, pale oval about 0.8 mm long, one
// large dorsal shield with a transverse seam and rows of fine setae, a
// projecting gnathosoma with long chelate chelicerae and palps, long legs.
// Leg I is held up and forward as a feeler (gamasids hunt by touch) and does
// not walk; legs II-IV run a tetrapod-like gait.
export const PRED = {
  kind: 'pred',
  noto: { c: [-40, 0, 0], r: [320, 92, 200] },
  hinge: [262, -26, 0],
  aspisOpen: 0, aspisClosed: 0,
  stand: 215,
  stride: 190,
  feelers: true,
  legs: [
    { hip: [200, -50, 100], rest: [560, 70, 230], seg: [30, 176, 70, 150, 176], rad: [11, 12, 10, 9, 7] },
    { hip: [130, -62, 140], rest: [330, -215, 400], seg: [30, 150, 58, 128, 140], rad: [12, 13, 11, 10, 8] },
    { hip: [30, -66, 150], rest: [10, -215, 440], seg: [30, 150, 58, 128, 140], rad: [12, 13, 11, 10, 8] },
    { hip: [-80, -60, 132], rest: [-360, -215, 380], seg: [32, 168, 62, 146, 160], rad: [12, 13, 11, 10, 8] },
  ],
};

let PGEO = null;
function predGeometry() {
  if (PGEO) return PGEO;
  const { c, r } = PRED.noto;
  const yv = (x, z) => r[1] * Math.sqrt(Math.max(0, 1 - ((x - c[0]) / r[0]) ** 2 - (z / r[2]) ** 2));
  const np = [
    { id: 0, sdf: sd.ellipsoid(c, r) },
    // a slight dorsal ridge and a flatter rim (the shield overhangs the soft sides)
    { id: 0, sdf: sd.ellipsoid([-30, 18, 0], [270, 70, 150]), blend: 30 },
  ];
  // transverse seam between the podonotal and opisthonotal parts of the shield
  for (let a = -1.1; a < 1.1; a += 0.22) {
    const z0 = Math.sin(a) * 150, z1 = Math.sin(a + 0.22) * 150;
    np.push({ id: 0, op: 'sub', blend: 3, sdf: groove([60, yv(60, z0) + 17, z0], [60, yv(60, z1) + 17, z1], 4) });
  }
  // peritremes: the long breathing grooves along each side above legs II-IV
  for (const s of [-1, 1]) np.push({ id: 0, op: 'sub', blend: 3, sdf: groove([190, -20, s * 165], [20, -10, s * 192], 5) });
  const noto = buildSdfMesh(np, { min: [-372, -100, -212], max: [292, 160, 212], cell: 7 });
  const gp = [
    // basis capituli and tectum
    { id: 2, sdf: sd.ellipsoid([10, 0, 0], [46, 30, 40]) },
    // long chelate chelicerae projecting forward
    { id: 3, sdf: sd.mirrorZ(sd.roundCone([0, 8, 12], [118, -6, 11], 13, 8)), blend: 8 },
    { id: 3, sdf: sd.mirrorZ(sd.roundCone([118, -6, 11], [150, -10, 13], 7, 2.5)), blend: 3 },
    { id: 3, sdf: sd.mirrorZ(sd.roundCone([112, -14, 11], [146, -20, 10], 5.5, 2)), blend: 3 },
    // palps: five-segmented, held out to the sides
    { id: 4, sdf: sd.mirrorZ(sd.roundCone([10, -14, 32], [64, -26, 52], 10, 8)), blend: 6 },
    { id: 4, sdf: sd.mirrorZ(sd.roundCone([64, -26, 52], [112, -30, 48], 8, 5)), blend: 4 },
  ];
  const aspis = buildSdfMesh(gp, { min: [-40, -50, -70], max: [162, 44, 70], cell: 4 });
  for (const g of [noto, aspis]) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const fN = combine(np);
  const bodySetae = [];
  // j, z, s rows of fine dorsal setae lying back on the shield
  for (let x = 230; x > -340; x -= 52) for (const zf of [0.18, 0.45, 0.72, 0.92]) for (const s of [-1, 1]) {
    const zr = zf * r[2] * Math.sqrt(Math.max(0, 1 - ((x - c[0]) / r[0]) ** 2));
    if (zr < 8) continue;
    const sp = surfacePoint(fN, V3(x, 0, s * zr * 0.4), V3(0, 1, s * zf * 0.8).normalize());
    const d = sp.n.clone().multiplyScalar(0.35).add(V3(-0.9, 0, 0)).normalize();
    bodySetae.push({ p: sp.p.addScaledVector(sp.n, -1.5), d, len: 26 + ((x * 7 + zf * 31) % 1 + 1) % 1 * 16, rad: 2.2 });
  }
  console.info(`[mite] predator meshed: idiosoma ${noto.index.count / 3} tris, gnathosoma ${aspis.index.count / 3} tris`);
  const base = geometry();
  PGEO = { noto, aspis, bodySetae, aspSetae: [], sens: [], seta: base.seta, sensillus: base.sensillus, seg: base.seg, tars: base.tars, claw: base.claw };
  return PGEO;
}

// ---------- helpers ----------

const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
/** Instance matrix: local +y along dir (length len), radius rad, local +z toward ref. */
function setInst(im, i, p, dir, ref, rad, len) {
  _y.copy(dir).normalize();
  _x.crossVectors(_y, ref);
  if (_x.lengthSq() < 1e-6) _x.crossVectors(_y, Math.abs(_y.x) < 0.9 ? V3(1, 0, 0) : V3(0, 0, 1));
  _x.normalize();
  _z.crossVectors(_x, _y).normalize();
  _m.set(
    _x.x * rad, _y.x * len, _z.x * rad, p.x,
    _x.y * rad, _y.y * len, _z.y * rad, p.y,
    _x.z * rad, _y.z * len, _z.z * rad, p.z,
    0, 0, 0, 1,
  );
  im.setMatrixAt(i, _m);
}

function staticSetae(geo, list, mat) {
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((s, i) => setInst(im, i, s.p, s.d, V3(0, 1, 0), s.rad, s.len));
  im.instanceMatrix.needsUpdate = true;
  im.frustumCulled = false;
  return im;
}

/** Lowest point of an ellipsoid (centre c, radii r) along local direction d. */
function support(c, r, d, out) {
  const mx = r[0] * r[0] * d.x, my = r[1] * r[1] * d.y, mz = r[2] * r[2] * d.z;
  const k = Math.sqrt(mx * d.x + my * d.y + mz * d.z) || 1;
  return out.set(c[0] + mx / k, c[1] + my / k, c[2] + mz / k);
}

// ---------- the mite ----------

/**
 * @param {THREE.Scene} scene
 * @param {object} colliders world colliders (cast(origin, dir, far))
 * @param {{cls:number, tex:object, name?:string}} opts
 */
export function createMite(scene, colliders, { cls, tex, cfg = CFG, anat = ANAT }) {
  const AN = anat;
  const G = AN.kind === 'pred' ? predGeometry() : geometry();
  const cut = gMaterial({ cls, tex: tex.cuticle, map: 'tri', scale: 150, bump: 1.6, objSpace: true });
  const legMat = gMaterial({ cls });
  const thinMat = gMaterial({ cls, thin: 1 });

  const body = new THREE.Group();
  const noto = new THREE.Mesh(G.noto, cut);
  body.add(noto);
  const aspis = new THREE.Group();
  aspis.position.set(...AN.hinge);
  aspis.add(new THREE.Mesh(G.aspis, cut));
  const setaeMeshes = [staticSetae(G.seta, G.aspSetae, thinMat), staticSetae(G.sensillus, G.sens, thinMat), staticSetae(G.seta, G.bodySetae, thinMat)];
  aspis.add(setaeMeshes[0], setaeMeshes[1]);
  body.add(aspis);
  body.add(setaeMeshes[2]);
  scene.add(body);
  noto.frustumCulled = false;

  // legs: instanced in world space, 4 segments + tarsus + claw + setae per leg
  const segIM = new THREE.InstancedMesh(G.seg, legMat, 32);
  const tarIM = new THREE.InstancedMesh(G.tars, legMat, 8);
  const clawIM = new THREE.InstancedMesh(G.claw, thinMat, 8);
  // leg setae: [segment index (1 fe, 2 ge, 3 ti, 4 ta), position along, azimuth, length]
  const LS = [[1, 0.35, 0.5, 30], [1, 0.7, 2.6, 26], [2, 0.6, 1.4, 24], [3, 0.4, 0.3, 30], [3, 0.75, 2.9, 28], [4, 0.2, 0.8, 26], [4, 0.45, 2.2, 30], [4, 0.7, 1.2, 34], [4, 0.85, 3.6, 22]];
  const setIM = new THREE.InstancedMesh(G.seta, thinMat, 8 * LS.length + 1);
  for (const im of [segIM, tarIM, clawIM, setIM]) { im.frustumCulled = false; scene.add(im); }

  const legs = [];
  for (let k = 0; k < 4; k++) for (const side of [-1, 1]) {
    const A = AN.legs[k];
    const sideIdx = side < 0 ? 0 : 1;
    legs.push({
      k, side,
      sideIdx, off: legOffset(cfg.gait, k, sideIdx),
      hip: V3(A.hip[0], A.hip[1], A.hip[2] * side),
      rest: V3(A.rest[0], A.rest[1], A.rest[2] * side),
      seg: A.seg, rad: A.rad,
      L1: A.seg[1] + A.seg[2], L2: A.seg[3] + A.seg[4],
      foot: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(),
      swing: false, s: 0, dur: 0.2,
    });
  }

  // state
  const st = {
    mode: 'walk', // walk | closing | closed | opening | crouch | air
    pos: V3(0, 0, 0), up: V3(0, 1, 0), fwd: V3(1, 0, 0),
    speed: 0, omega: 0, phase: 0, t: 0, retract: 0, aspis: 0,
    center: V3(0, AN.stand, 0), q: new THREE.Quaternion(),
    vel: V3(), angVel: V3(), airborne: false,
    q0: new THREE.Quaternion(), c0: V3(), h0: 0, lastLand: 0,
    jumpCool: 0, crouch: 0, airT: 0, squash: 0,
    biteT: 0, time: 0, pen: 0, climbing: 0, groundHit: null, lift: 0, liftT: 0, stuck: 0, drop: 0,
  };
  const events = [];

  const right = () => new THREE.Vector3().crossVectors(st.fwd, st.up).normalize();
  const basisQ = (fwd, up, out = new THREE.Quaternion()) => {
    const r = new THREE.Vector3().crossVectors(fwd, up).normalize();
    return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, up, r));
  };
  const toWorld = (local, center, q, out = new THREE.Vector3()) => out.copy(local).applyQuaternion(q).add(center);
  const restWorld = (L, out = new THREE.Vector3()) => {
    const r = right();
    return out.copy(st.pos).addScaledVector(st.fwd, L.rest.x).addScaledVector(r, L.rest.z);
  };
  const down = new THREE.Vector3();
  const ground = (p, up, above = 140, far = 380) => colliders.cast(p.clone().addScaledVector(up, above), down.copy(up).negate(), far);

  const isFeeler = (L) => AN.feelers && L.k === 0;
  function plantAll() {
    for (const L of legs) {
      if (isFeeler(L)) continue;
      restWorld(L, L.to);
      const h = ground(L.to, st.up);
      if (h) L.to.copy(h.point);
      L.foot.copy(L.to); L.swing = false;
    }
  }

  function place(x, z, yaw = 0) {
    st.pos.set(x, floorH(x, z), z);
    st.up.set(0, 1, 0);
    st.fwd.set(Math.cos(yaw), 0, -Math.sin(yaw));
    st.mode = 'walk'; st.retract = 0; st.aspis = 0; st.speed = 0; st.crouch = 0; st.squash = 0; st.jumpCool = 0; st.vel.set(0, 0, 0);
    // settle onto whatever is there
    for (let i = 0; i < 4; i++) settleBody(1 / 30, true);
    plantAll();
    pose(0);
  }

  // probe the ground around the body: height and surface normal
  const PROBES = [[0, 0], [210, 0], [-220, 0], [0, -125], [0, 125]];
  function probe(at) {
    const r = right();
    const hits = PROBES.map(([a, b]) => ground(at.clone().addScaledVector(st.fwd, a).addScaledVector(r, b), st.up));
    if (!hits[0]) return null;
    st.groundHit = hits[0];
    const h0 = hits[0].point.clone().sub(at).dot(st.up);
    const ok = hits.map((h) => h && Math.abs(h.point.clone().sub(at).dot(st.up) - h0) < 120 ? h : null);
    const n = new THREE.Vector3();
    for (const h of ok) if (h) n.add(h.normal);
    if (ok[1] && ok[2] && ok[3] && ok[4]) {
      const a = ok[1].point.clone().sub(ok[2].point), b = ok[4].point.clone().sub(ok[3].point);
      const pn = new THREE.Vector3().crossVectors(b, a).normalize();
      if (pn.dot(st.up) < 0) pn.negate();
      n.normalize().add(pn.multiplyScalar(1.5));
    }
    return { point: hits[0].point, normal: n.normalize() };
  }

  function settleBody(dt, snap = false) {
    const pr = probe(st.pos);
    if (!pr) return false;
    const k = snap ? 1 : 1 - Math.exp(-dt / 0.06);
    const dh = pr.point.clone().sub(st.pos).dot(st.up);
    st.pos.addScaledVector(st.up, dh * k);
    const tgt = pr.normal;
    if (tgt.y < -0.2) { tgt.y = -0.2; tgt.normalize(); }
    st.up.lerp(tgt, snap ? 1 : 1 - Math.exp(-dt / 0.12)).normalize();
    st.fwd.addScaledVector(st.up, -st.fwd.dot(st.up)).normalize();
    return true;
  }

  let gaitNow = cfg.gait;
  function walk(dt, input) {
    if (gaitNow !== cfg.gait) { gaitNow = cfg.gait; for (const L of legs) L.off = legOffset(gaitNow, L.k, L.sideIdx); }
    const duty = GAITS[gaitNow].duty;
    let want = 0, turn = 0;
    if (input.mag > 0.01) {
      const d = input.dir.clone().addScaledVector(st.up, -input.dir.dot(st.up));
      if (d.lengthSq() < 0.05) d.addScaledVector(V3(0, 1, 0).addScaledVector(st.up, -st.up.y), 1); // on a wall: push = climb
      if (d.lengthSq() > 1e-6) {
        d.normalize();
        const ang = Math.atan2(new THREE.Vector3().crossVectors(st.fwd, d).dot(st.up), st.fwd.dot(d));
        const rate = 1.5 + 1.2 * clamp(1 - st.speed / 200, 0, 1); // turns tighter when slow
        turn = clamp(ang, -rate * dt, rate * dt);
        want = input.maxSpeed * input.mag * sstep(-0.15, 0.75, Math.cos(ang));
      }
    }
    st.speed += (want - st.speed) * (1 - Math.exp(-dt / (input.accel || 0.18)));
    st.omega = turn / dt;
    st.fwd.applyAxisAngle(st.up, turn).normalize();

    // wall ahead (taller than a step)?
    let step = st.speed * dt;
    const wall = colliders.cast(st.pos.clone().addScaledVector(st.up, 130), st.fwd, 300 + step, false, SOFT);
    const move = st.fwd.clone().multiplyScalar(step);
    st.climbing = Math.max(0, st.climbing - dt * 2);
    if (wall && wall.normal.dot(st.up) < 0.55) {
      const n = wall.normal.clone().addScaledVector(st.up, -wall.normal.dot(st.up)).normalize();
      const into = move.dot(n);
      if (cfg.climb && step > 0.01 && wall.normal.dot(st.up) > -0.35) {
        // Too steep to step onto (a grain face, a stem, a flake on edge): the
        // claws hold on any rigid surface, so tip the body up onto the face as
        // it comes within reach. The ground probes then find the face and the
        // body walks up it, its up turning toward the face normal.
        const k = clamp((320 - wall.dist) / 170, 0, 1);
        st.up.lerp(wall.normal, 1 - Math.exp(-dt * 9 * k)).normalize();
        st.fwd.addScaledVector(st.up, -st.fwd.dot(st.up)).normalize();
        st.climbing = Math.max(st.climbing, k);
        // never step into the face before the body has turned onto it
        if (into < 0) move.addScaledVector(n, -into * clamp((250 - wall.dist) / 60, 0, 1));
      } else if (into < 0) {
        // climbing off: slide along it instead (the old rule)
        move.addScaledVector(n, -into * clamp((330 - wall.dist) / 60, 0, 1));
      }
    }
    const prev = st.pos.clone();
    st.pos.add(move);
    st.pos.x = clamp(st.pos.x, -HALF + 150, HALF - 150);
    st.pos.z = clamp(st.pos.z, -HALF + 150, HALF - 150);
    if (!settleBody(dt)) {
      st.pos.copy(prev); st.speed *= 0.5;
      // Walked off the end or edge of something with nothing within reach:
      // after a moment the mite lets go, closes and drops (box mites do).
      if (step > 0.01 && (st.stuck += dt) > 0.5) { st.drop = 0.35; st.stuck = 0; }
    } else st.stuck = Math.max(0, st.stuck - dt);
    if (cfg.clear) clearance(true);
    const fy = floorH(st.pos.x, st.pos.z);
    if (st.pos.y < fy) st.pos.y = fy;
    const moved = st.pos.distanceTo(prev);

    // gait phase advances with distance travelled (and turning), so stride matches speed;
    // strides lengthen up to 1.5x at a run, so the legs don't flicker
    const stride = AN.stride * (1 + 0.5 * clamp((st.speed - 210) / 700, 0, 1));
    let err = 0;
    for (const L of legs) if (!L.swing && !isFeeler(L)) err = Math.max(err, L.foot.distanceTo(restWorld(L, _x)));
    // the front feet are ~330 µm from the centre, so turning sweeps them fast
    let dphi = (moved + Math.abs(turn) * 330) / stride;
    if (dphi < 0.25 * dt && err > 22) dphi = 1.4 * dt; // shuffle feet back under the body when stopped
    const vBody = st.fwd.clone().multiplyScalar(moved / dt);
    const trig = new Set(gaitTriggers(st.phase, dphi, legs));
    for (const L of legs) {
      if (isFeeler(L)) continue;
      if (!L.swing && (trig.has(L) || L.foot.distanceTo(restWorld(L, _x)) > stride * 1.25)) {
        L.swing = true; L.s = 0; L.from.copy(L.foot);
        const sp = Math.max(st.speed, 50);
        L.dur = clamp(((1 - duty) * stride) / sp, 0.08, 0.3);
      }
    }
    st.phase += dphi;

    for (const L of legs) {
      if (!L.swing) continue;
      // progress by time, or by gait phase when that is faster, so a swing
      // begun slowly never overlaps the other group's
      L.s = Math.min(1, L.s + Math.max(dt / L.dur, dphi / (1 - duty)));
      // where the rest point will be at touchdown, plus half a stance ahead
      const rw = restWorld(L, new THREE.Vector3());
      const rel = rw.clone().sub(st.pos);
      const vFoot = vBody.clone().add(new THREE.Vector3().crossVectors(st.up, rel).multiplyScalar(st.omega));
      const tgt = swingTarget(rw, vFoot, (1 - L.s) * L.dur, duty, stride, vBody.length());
      const h = ground(tgt, st.up, 120, 320);
      if (h) L.to.copy(h.point); else L.to.copy(tgt);
      const e = sstep(0, 1, L.s);
      const lift = (L.k === 0 ? 46 : 30) * Math.sin(Math.PI * L.s);
      L.foot.copy(L.from).lerp(L.to, e).addScaledVector(st.up, lift);
      if (L.s >= 1) {
        L.swing = false; L.foot.copy(L.to);
        if (L.k === 3) events.push('step');
      }
    }
  }

  // Body clearance: rays from the body's centre to its ellipsoid surface. A
  // rigid surface closer than the ellipsoid pushes the body back along the
  // ground (never through it), and the deepest overlap is kept as st.pen (µm)
  // for the checks. Soft blades are left to bend out of the way.
  const _cq = new THREE.Quaternion(), _cc = new THREE.Vector3(), _cd = new THREE.Vector3(), _cp = new THREE.Vector3();
  function ellipsoidR(d) {
    const r = AN.noto.r;
    return 1 / Math.sqrt((d.x / r[0]) ** 2 + (d.y / r[1]) ** 2 + (d.z / r[2]) ** 2);
  }
  const dt60 = 1 / 60;
  function clearance(apply, maxStep = 30) {
    basisQ(st.fwd, st.up, _cq);
    _cc.set(AN.noto.c[0], AN.noto.c[1], AN.noto.c[2]).applyQuaternion(_cq).add(st.pos).addScaledVector(st.up, AN.stand + st.lift);
    _cp.set(0, 0, 0);
    let pen = 0, belly = 0;
    for (const dirs of [CLEAR_DIRS, BELLY]) for (const d of dirs) {
      const rr = ellipsoidR(d);
      _cd.copy(d).applyQuaternion(_cq);
      const h = colliders.cast(_cc, _cd, rr + 4, false, SOFT);
      if (!h || h.dist >= rr) continue;
      const p = rr - h.dist;
      if (p > pen) { pen = p; st.penInfo = { dir: d.toArray(), kind: h.kind, belly: dirs === BELLY }; }
      if (dirs === CLEAR_DIRS) _cp.addScaledVector(_cd, -p);
      else belly = Math.max(belly, p * Math.max(0, -d.y));
    }
    st.pen = pen;
    if (apply) {
      // Something under the belly (a ledge, a grain the centre has not reached
      // yet): stand taller until the body clears it; the legs reach down.
      st.liftT = Math.min(140, belly > 0 ? st.lift + belly + 2 : st.liftT * Math.exp(-dt60 / 0.25));
      // Resolve at most ~1.8 mm/s, so a deep overlap (after reopening against
      // a stem, say) eases out instead of teleporting the body.
      const m = _cp.length();
      if (m > maxStep) _cp.multiplyScalar(maxStep / m);
      if (m > 0) st.pos.add(_cp);
    }
    return pen;
  }

  // the closed capsule: a rigid egg rolling, tipping and falling
  const GRAV = 2600;
  function physics(dt) {
    const { c, r } = AN.noto;
    const qi = st.q.clone().invert();
    const dLocal = V3(0, -1, 0).applyQuaternion(qi);
    const sup = support(c, r, dLocal, new THREE.Vector3());
    const contact = toWorld(sup, st.center, st.q);
    const g = colliders.cast(contact.clone().add(V3(0, 60, 0)), V3(0, -1, 0), 2000);
    const gap = g ? contact.y - g.point.y : 1e9;
    if (gap > 2 || st.vel.y > 1) {
      // falling
      st.vel.y -= GRAV * dt;
      st.center.addScaledVector(st.vel, dt);
      st.q.premultiply(new THREE.Quaternion().setFromAxisAngle(st.angVel.clone().normalize(), st.angVel.length() * dt)).normalize();
      st.airborne = true;
      const c2 = toWorld(support(c, r, V3(0, -1, 0).applyQuaternion(st.q.clone().invert()), new THREE.Vector3()), st.center, st.q);
      const g2 = colliders.cast(c2.clone().add(V3(0, 80, 0)), V3(0, -1, 0), 80 + Math.max(0, -st.vel.y * dt) + 4);
      if (g2 && c2.y <= g2.point.y + 0.5) {
        st.center.y += g2.point.y - c2.y;
        if (st.vel.y < -300) events.push('impact');
        const n = g2.normal;
        const vn = st.vel.dot(n);
        if (vn < 0) st.vel.addScaledVector(n, -vn * 1.25);
        st.angVel.crossVectors(n, st.vel).multiplyScalar(1 / 170);
        st.vel.multiplyScalar(0.4);
      }
    } else {
      st.airborne = false;
      const n = g.normal;
      // torque of gravity about the contact point; inertia of an egg about it
      const com = toWorld(V3(-40, 0, 0), st.center, st.q);
      const arm = com.clone().sub(contact);
      const tau = new THREE.Vector3().crossVectors(arm, V3(0, -GRAV, 0));
      const I = 0.2 * 170 * 170 + arm.lengthSq();
      const alpha = tau.multiplyScalar(1 / I);
      const slope = Math.acos(clamp(n.y, -1, 1));
      if (alpha.length() > 1.2 || st.angVel.length() > 0.08 || slope > 0.2) st.angVel.addScaledVector(alpha, dt);
      st.angVel.multiplyScalar(Math.exp(-dt * 2.2));
      st.angVel.addScaledVector(n, -st.angVel.dot(n) * (1 - Math.exp(-dt * 6))); // no spinning in place
      const w = st.angVel.length();
      if (w > 1e-5) st.q.premultiply(new THREE.Quaternion().setFromAxisAngle(st.angVel.clone().divideScalar(w), w * dt)).normalize();
      // roll without slipping: the centre moves with the contact point fixed
      const v = new THREE.Vector3().crossVectors(st.angVel, st.center.clone().sub(contact));
      const vd = v.length();
      if (vd > 1e-3) {
        const hit = colliders.cast(st.center, v.clone().divideScalar(vd), 175 + vd * dt);
        if (hit && hit.normal.y < 0.6) { st.angVel.multiplyScalar(-0.3); v.set(0, 0, 0); }
      }
      st.center.addScaledVector(v, dt);
      st.vel.copy(v);
      // re-seat on the ground
      const c3 = toWorld(support(c, r, V3(0, -1, 0).applyQuaternion(st.q.clone().invert()), new THREE.Vector3()), st.center, st.q);
      const g3 = colliders.cast(c3.clone().add(V3(0, 90, 0)), V3(0, -1, 0), 200);
      if (g3 && c3.y - g3.point.y < 30) st.center.y += g3.point.y - c3.y;
      else if (!g3 || c3.y - g3.point.y >= 30) st.vel.y = 0; // leaves the surface: falls next frame
    }
    st.center.x = clamp(st.center.x, -HALF + 150, HALF - 150);
    st.center.z = clamp(st.center.z, -HALF + 150, HALF - 150);
  }

  // The hop: a ballistic arc after the crouch, landing on whatever is below.
  const WUP = V3(0, 1, 0);
  function launch() {
    let h = st.fwd.clone(); h.y = 0;
    if (h.lengthSq() < 0.05) { h.copy(st.up); h.y = 0; }
    if (h.lengthSq() < 1e-4) h.set(1, 0, 0);
    h.normalize();
    st.vel.copy(h).multiplyScalar(JUMP.vh + 0.5 * st.speed0).addScaledVector(WUP, JUMP.vy).addScaledVector(st.up, 150);
    st.mode = 'air'; st.airT = 0; st.crouch = 0; st.speed = 0;
    events.push('jump');
  }
  function air(dt) {
    st.airT += dt;
    st.vel.y -= GRAV * dt;
    const hv = V3(st.vel.x, 0, st.vel.z), hl = hv.length();
    if (hl > 1) {
      // rigid things ahead (a stem, a grain): bounce off; blades bend away
      const hit = colliders.cast(st.center, hv.divideScalar(hl), 200 + hl * dt, true, SOFT);
      if (hit && hit.normal.y < 0.5) { const vn = st.vel.dot(hit.normal); if (vn < 0) st.vel.addScaledVector(hit.normal, -vn * 1.3); }
    }
    if (st.vel.y > 0) { const hit = colliders.cast(st.center, WUP, 180 + st.vel.y * dt, true, SOFT); if (hit) st.vel.y = 0; }
    st.center.addScaledVector(st.vel, dt);
    st.center.x = clamp(st.center.x, -HALF + 150, HALF - 150);
    st.center.z = clamp(st.center.z, -HALF + 150, HALF - 150);
    st.up.lerp(WUP, 1 - Math.exp(-dt / 0.15)).normalize();
    st.fwd.addScaledVector(st.up, -st.fwd.dot(st.up)).normalize();
    st.pos.copy(st.center).addScaledVector(st.up, -AN.stand);
    if (st.vel.y > 0) return;
    const reach = AN.stand + 8 - st.vel.y * dt;
    const g = colliders.cast(st.center, _dn.set(0, -1, 0), reach);
    const fy = floorH(st.center.x, st.center.z);
    if (!g && st.center.y - AN.stand > fy) return;
    // touch down
    st.pos.copy(g ? g.point : V3(st.center.x, fy, st.center.z));
    const n = g ? g.normal.clone() : floorN(st.center.x, st.center.z);
    if (n.y < -0.2) { n.y = -0.2; n.normalize(); }
    st.up.copy(n);
    st.fwd.addScaledVector(st.up, -st.fwd.dot(st.up)).normalize();
    if (g && g.entry && g.entry.rod) { g.entry.rod.vel.addScaledVector(WUP, st.vel.y * 0.5); g.entry.rod.awake = true; } // a blade takes the landing
    if (st.vel.y < -900) events.push('impact');
    st.squash = clamp(-st.vel.y / 1400, 0.3, 1);
    st.speed = Math.hypot(st.vel.x, st.vel.z) * 0.35;
    st.vel.set(0, 0, 0);
    st.mode = 'walk'; st.jumpCool = JUMP.cool; st.lift = 0; st.liftT = 0;
    settleBody(dt, true);
    if (cfg.clear) clearance(true, 60);
    plantAll();
    events.push('land');
  }

  // place every part for the current state
  function pose(dt) {
    let q, center;
    if (st.mode === 'walk' || st.mode === 'closing' || st.mode === 'crouch') {
      const bob = st.mode === 'walk' && cfg.bob ? 2.5 * Math.sin(st.phase * Math.PI * 4) : 0;
      const sway = st.mode === 'walk' && cfg.bob ? 0.02 * Math.sin(st.phase * Math.PI * 2) * Math.min(1, st.speed / 120) : 0;
      q = basisQ(st.fwd, st.up);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), sway));
      st.lift += (st.liftT - st.lift) * (st.liftT > st.lift ? 0.5 : 0.08);
      st.squash = Math.max(0, st.squash - dt * 4);
      let h = AN.stand + bob + st.lift - 75 * st.crouch - 55 * Math.sin(Math.PI * Math.min(1, 1 - st.squash)) * (st.squash > 0 ? 1 : 0);
      if (st.mode === 'closing') h = AN.stand + (st.h0 - AN.stand) * sstep(0.2, 1, st.t);
      center = st.pos.clone().addScaledVector(st.up, h);
      st.center.copy(center); st.q.copy(q);
    } else if (st.mode === 'opening') {
      const e = sstep(0, 0.75, st.t);
      q = st.q0.clone().slerp(basisQ(st.fwd, st.up), e);
      center = st.c0.clone().lerp(st.pos.clone().addScaledVector(st.up, AN.stand), sstep(0.15, 0.9, st.t));
      st.center.copy(center); st.q.copy(q);
    } else if (st.mode === 'air') {
      // nose up on the way up, down on the way down
      q = basisQ(st.fwd, st.up);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), clamp(st.vel.y / 3000, -0.3, 0.3)));
      center = st.center;
      st.q.copy(q);
      // legs: hind legs kicked back at take-off, then all reach down for the landing
      const kick = Math.exp(-st.airT / 0.12);
      for (const L of legs) {
        if (isFeeler(L)) continue;
        const back = L.k === 3 ? -90 * kick : 0;
        L.foot.copy(toWorld(_al.set(L.rest.x * 0.85 + back, -AN.stand * (0.62 + 0.25 * (1 - kick)), L.rest.z * 0.9), center, q));
      }
    } else { q = st.q; center = st.center; }

    body.position.copy(center);
    body.quaternion.copy(q);
    aspis.rotation.z = AN.aspisOpen + (AN.aspisClosed - AN.aspisOpen) * st.aspis;
    // X: a bite. The box mite dips its rostrum and works the chelicerae; the
    // predator thrusts its chelicerae forward.
    const bk = st.biteT > 0 ? Math.sin(Math.PI * (1 - st.biteT / 0.28)) : 0;
    if (AN.kind === 'pred') aspis.position.set(AN.hinge[0] + 26 * bk, AN.hinge[1], AN.hinge[2]);
    else aspis.rotation.z -= 0.2 * bk;

    // legs
    const rc = st.retract;
    const hide = rc > 0.97;
    for (const m of setaeMeshes) m.visible = cfg.setae;
    segIM.count = hide ? 0 : 32; tarIM.count = clawIM.count = hide ? 0 : 8; setIM.count = hide ? 0 : setIM.instanceMatrix.count;
    if (!hide) {
      const U = V3(0, 1, 0).applyQuaternion(q);
      const shrink = 1 - 0.72 * rc;
      let si = 0;
      legs.forEach((L, i) => {
        const hipL = L.hip.clone().add(V3(-24 * rc, 46 * rc, -L.side * 18 * rc));
        const H = toWorld(hipL, center, q);
        let F = L.foot;
        if (isFeeler(L)) {
          // leg I as a feeler: held up and forward, tapping ahead
          const s = L.side, t = st.time;
          F = toWorld(V3(L.rest.x + 40 * Math.sin(t * 6.1 + s) - 60 * (1 - Math.min(1, st.speed / 200)), L.rest.y + 40 * Math.sin(t * 4.3 + 2 * s) - 90, L.rest.z + 30 * Math.sin(t * 5.2 + s)), center, q);
        }
        if (rc > 0) F = L.foot.clone().lerp(toWorld(V3(L.hip.x - 30, L.hip.y + 20, L.hip.z * 0.4), center, q), sstep(0, 1, rc));
        const seg = L.seg.map((s) => s * shrink), rad = L.rad.map((s) => s * (1 - 0.3 * rc));
        const L1 = seg[1] + seg[2], L2 = seg[3] + seg[4];
        // trochanter: out from the hip, toward the foot, tilted up
        const tf = F.clone().sub(H); tf.addScaledVector(U, -tf.dot(U));
        if (tf.lengthSq() < 1) tf.copy(L.rest).applyQuaternion(q);
        const dirT = tf.normalize().addScaledVector(U, 0.55).normalize();
        const T = H.clone().addScaledVector(dirT, seg[0]);
        // two-bone IK, the knee (femur-genu) bent upward
        const K = new THREE.Vector3(), Fe = new THREE.Vector3();
        twoBoneIK(T, F, L1, L2, U, K, Fe, !cfg.ik);
        const u1 = K.clone().sub(T).normalize();
        const b = U.clone().addScaledVector(u1, -u1.dot(U)).normalize();
        const Fm = T.clone().addScaledVector(u1, seg[1]);
        // tibia a little above the straight line, tarsus angled down to the foot
        const w2 = Fe.clone().sub(K).normalize();
        const bend = b.clone().addScaledVector(w2, -w2.dot(b)).normalize();
        const tb = cfg.ik ? 0.2 : 0;
        const tib = bend.lengthSq() > 0.5 ? w2.clone().multiplyScalar(Math.cos(tb)).addScaledVector(bend, Math.sin(tb)).normalize() : w2.clone();
        const J = K.clone().addScaledVector(tib, seg[3]);
        const ta = Fe.clone().sub(J);
        const taLen = ta.length();
        const pts = [[H, dirT, seg[0], rad[0]], [T, u1, seg[1], rad[1]], [Fm, K.clone().sub(Fm).normalize(), seg[2], rad[2]], [K, tib, seg[3], rad[3]]];
        pts.forEach(([p, dir, len, r], j) => setInst(segIM, i * 4 + j, p, dir, U, r, len + r * 0.4));
        const taDir = ta.divideScalar(taLen || 1);
        setInst(tarIM, i, J, taDir, U, rad[4], taLen);
        setInst(clawIM, i, Fe.clone().addScaledVector(taDir, -4 * shrink), taDir, U, 24 * shrink, 24 * shrink);
        // leg setae
        const frames = [null, [T, u1, seg[1], rad[1]], [Fm, K.clone().sub(Fm).normalize(), seg[2], rad[2]], [K, tib, seg[3], rad[3]], [J, taDir, taLen, rad[4]]];
        for (const [sg, at, az, len] of LS) {
          const [p, dir, l, r] = frames[sg];
          const X = new THREE.Vector3().crossVectors(dir, U).normalize();
          const Z = new THREE.Vector3().crossVectors(X, dir).normalize();
          const radial = X.multiplyScalar(Math.cos(az + L.side)).addScaledVector(Z, Math.sin(az + L.side));
          const base = p.clone().addScaledVector(dir, at * l).addScaledVector(radial, r * 0.8);
          const sdir = dir.clone().multiplyScalar(0.8).addScaledVector(radial, 0.6).normalize();
          const long = L.k === 0 && sg === 3 && at < 0.5; // the long tactile seta on tibia I
          setInst(setIM, si++, base, sdir, U, 2.6 * shrink, (long ? 72 : len) * shrink);
        }
      });
      setIM.count = cfg.setae ? si : 0;
      for (const im of [segIM, tarIM, clawIM, setIM]) im.instanceMatrix.needsUpdate = true;
    }
  }

  function update(dt, input) {
    events.length = 0;
    if (!(dt > 0)) return events;
    st.time += dt;
    st.biteT = Math.max(0, st.biteT - dt);
    st.drop = Math.max(0, st.drop - dt);
    if (st.mode === 'walk') st.jumpCool = Math.max(0, st.jumpCool - dt);
    const hold = input.hold || st.drop > 0;
    if (st.mode === 'crouch') {
      st.t += dt;
      st.crouch = sstep(0, 1, st.t / JUMP.crouch);
      st.speed *= Math.exp(-dt / 0.05);
      if (st.t >= JUMP.crouch) launch();
    } else if (st.mode === 'air') air(dt);
    else if (st.mode === 'walk') {
      if (hold) {
        st.mode = 'closing'; st.t = 0; st.speed = 0;
        const q = basisQ(st.fwd, st.up);
        const dl = st.up.clone().negate().applyQuaternion(q.clone().invert());
        st.h0 = Math.abs(support(AN.noto.c, AN.noto.r, dl, new THREE.Vector3()).dot(dl));
      } else walk(dt, input);
    }
    if (st.mode === 'closing') {
      // a real phthiracaroid seals itself in about 0.1-0.15 s
      st.t = Math.min(1, st.t + dt / cfg.closeTime);
      st.retract = sstep(0, 0.7, st.t);
      st.aspis = sstep(0.25, 1, st.t);
      if (st.t >= 1) {
        st.mode = 'closed'; st.vel.set(0, 0, 0); st.angVel.set(0, 0, 0); st.closedT = 0;
        pose(0);
        events.push('closed');
      }
    } else if (st.mode === 'closed') {
      if (cfg.roll) physics(dt); else { st.angVel.set(0, 0, 0); st.airborne = false; }
      st.closedT = hold ? 0 : (st.closedT || 0) + dt;
      // Wedged against something (resting on a stem, say) it may never count
      // as settled: after a few seconds it opens on whatever is below anyway.
      if (!hold && ((!st.airborne && st.angVel.length() < 2.5) || st.closedT > 2.5)) {
        // stand up on whatever is underneath
        const g = colliders.cast(st.center.clone(), V3(0, -1, 0), 600);
        if (g) {
          st.mode = 'opening'; st.t = 0;
          st.q0.copy(st.q); st.c0.copy(st.center);
          st.pos.copy(g.point); st.up.copy(g.normal);
          const f = V3(1, 0, 0).applyQuaternion(st.q);
          f.addScaledVector(st.up, -f.dot(st.up));
          if (f.lengthSq() < 0.01) f.set(1, 0, 0).addScaledVector(st.up, -st.up.x);
          st.fwd.copy(f.normalize());
          settleBody(dt, true);
          // Stand up clear of whatever it rolled against (a stem, a grain).
          if (cfg.clear) for (let k = 0; k < 6; k++) { if (clearance(true, 1e9) < 1) break; settleBody(dt, true); }
          for (const L of legs) { restWorld(L, L.to); const h = ground(L.to, st.up); if (h) L.to.copy(h.point); L.foot.copy(L.to); L.swing = false; }
          events.push('opening');
        }
      }
    } else if (st.mode === 'opening') {
      // reopening is slow and careful
      st.t = Math.min(1, st.t + dt / (0.9 * cfg.closeTime / 0.16));
      st.aspis = 1 - sstep(0, 0.45, st.t);
      st.retract = 1 - sstep(0.3, 1, st.t);
      if (hold) { st.mode = 'closing'; st.t = 1 - st.retract; st.h0 = AN.stand; }
      else if (st.t >= 1) { st.mode = 'walk'; st.retract = 0; st.aspis = 0; plantAll(); events.push('opened'); }
    }
    pose(dt);
    return events;
  }

  const _mouth = new THREE.Vector3();
  return {
    body, update, place, legs, st, anat: AN, clearance,
    /** Where the chelicerae close, in world space. */
    mouth(out = _mouth) {
      body.updateMatrixWorld();
      return aspis.localToWorld(out.set(...(AN.kind === 'pred' ? [150, -12, 0] : [210, -115, 0])));
    },
    /** Start a hop (crouch, then launch). False if not walking or still recovering. */
    jump() {
      if (st.mode !== 'walk' || st.jumpCool > 0) return false;
      st.mode = 'crouch'; st.t = 0; st.speed0 = st.speed;
      return true;
    },
    /** Start a bite (the animation; the caller decides what it hits). */
    bite() { if (st.biteT > 0.05) return false; st.biteT = 0.28; return true; },
    get quat() { return st.q; },
    get radii() { return AN.noto.r; },
    /** The surface under the body (a collider hit with .kind and .entry), or null. */
    get ground() { return st.mode === 'walk' || st.mode === 'crouch' ? st.groundHit : null; },
    get center() { return st.center; },
    get mode() { return st.mode; },
    get speed() { return st.speed; },
    meshes: [body, segIM, tarIM, clawIM, setIM],
    setVisible(v) { for (const m of [body, segIM, tarIM, clawIM, setIM]) m.visible = v; },
  };
}
