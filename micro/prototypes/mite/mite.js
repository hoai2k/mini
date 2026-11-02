// A box mite (Phthiracaridae, Oribatida), in µm. The anatomy below is drawn
// at about 0.6 mm; createMite's `scale` sizes a mite in the world (the player
// and the other box mite use ~0.58, about 0.35 mm long). Everything inside
// createMite (the body, legs, gait, stride, hop and the speeds passed in)
// runs in the anatomy's own units and is converted at the boundary: positions
// out are world µm, speeds in are world µm/s, and the moss is cast against at
// its true size, so a smaller mite meets a relatively bigger world.
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
// Jump (a game borrowing, see the README): jump() crouches (at least
// JUMP.crouch s; held longer, input.jumpHeld, it charges for up to JUMP.charge
// s, deeper), turning to the stick, then launches the body on a high ballistic
// arc under its own snappier gravity (modes 'crouch' and 'air'): a tap carries
// ~3 body lengths, a full charge ~6. In the air the legs tuck, then splay for
// the landing; it lands on whatever is below, floor, grain or a blade (which
// takes a kick and bends), squashes, and can jump again after JUMP.cool s.
// Box mites do not do this; zetorchestid oribatids jump with enlarged hind
// legs (the feel here is a flea's or a jumping spider's).
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd, combine } from '../shared/sdf.js';
import { gMaterial } from './sem.js';
import { BOUNDS, floorH as worldFloorH, floorN as worldFloorN } from './world.js';
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
/**
 * The jump (anatomy units: µm and µm/s at the 0.6 mm anatomy; the world mite is
 * scaled by createMite's `scale`). crouch: the least crouch (s, a tap); charge:
 * a held A charges for up to this long more (s); range0/range1: the distance
 * of a tap / a full charge from a standstill on level ground; angle: launch
 * elevation (rad); grav: gravity in the air (the walking world's 2600 is too
 * floaty for a flea's snap); carry: the share of the run-up speed kept; steer:
 * air control (µm/s² toward the stick); cool: after landing (s).
 */
export const JUMP = { crouch: 0.1, charge: 0.45, range0: 1720, range1: 3620, angle: 0.88, grav: 8000, carry: 0.45, steer: 900, cool: 0.3 };
/** Launch speeds (µm/s, anatomy) for a charge 0..1: { vh, vy }. */
export function jumpLaunch(charge) {
  const R = JUMP.range0 + (JUMP.range1 - JUMP.range0) * Math.max(0, Math.min(1, charge));
  const v = Math.sqrt((R * JUMP.grav) / Math.sin(2 * JUMP.angle));
  return { vh: v * Math.cos(JUMP.angle), vy: v * Math.sin(JUMP.angle) };
}

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
  noto: { c: [-40, 0, 0], r: [310, 88, 215] },
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
  const noto = buildSdfMesh(np, { min: [-372, -100, -228], max: [292, 160, 228], cell: 7 });
  const gp = [
    // basis capituli and tectum
    { id: 2, sdf: sd.ellipsoid([10, 0, 0], [46, 30, 40]) },
    // long, stout chelate chelicerae projecting forward (the reference sheet's
    // most prominent feature): a shaft, then an open chela, the fixed digit
    // above and the movable digit hooked below
    { id: 3, sdf: sd.mirrorZ(sd.roundCone([0, 8, 13], [112, -4, 13], 17, 12)), blend: 8 },
    { id: 3, sdf: sd.mirrorZ(sd.roundCone([110, -2, 13], [150, -4, 15], 10, 3)), blend: 3 },
    { id: 3, sdf: sd.mirrorZ(sd.roundCone([150, -4, 15], [160, -14, 14], 3, 1.8)), blend: 2 },
    { id: 3, sdf: sd.mirrorZ(sd.roundCone([106, -14, 13], [142, -26, 12], 8, 2.5)), blend: 3 },
    { id: 3, sdf: sd.mirrorZ(sd.roundCone([142, -26, 12], [150, -18, 12], 2.5, 1.5)), blend: 2 },
    // palps: five-segmented, held out to the sides
    { id: 4, sdf: sd.mirrorZ(sd.roundCone([10, -14, 32], [64, -26, 52], 10, 8)), blend: 6 },
    { id: 4, sdf: sd.mirrorZ(sd.roundCone([64, -26, 52], [112, -30, 48], 8, 5)), blend: 4 },
  ];
  const aspis = buildSdfMesh(gp, { min: [-40, -50, -70], max: [172, 44, 70], cell: 4 });
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
const _xr = new THREE.Vector3(1, 0, 0), _zr = new THREE.Vector3(0, 0, 1);
/** Instance matrix: local +y along dir (length len), radius rad, local +z toward ref. */
function setInst(im, i, p, dir, ref, rad, len) {
  _RL[0] = rad; _RL[1] = len;
  setInstRL(im, i, p, dir, ref);
}
// rad and len for setInstRL: the legs pose ~120 instances per mite per frame,
// and double arguments to a call that is not inlined are boxed (garbage)
const _RL = new Float64Array(2);
/** setInst with rad = _RL[0], len = _RL[1]. */
function setInstRL(im, i, p, dir, ref) {
  const rad = _RL[0], len = _RL[1];
  _y.copy(dir).normalize();
  _x.crossVectors(_y, ref);
  if (_x.lengthSq() < 1e-6) _x.crossVectors(_y, Math.abs(_y.x) < 0.9 ? _xr : _zr);
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
  // exact bounds of the instances (fixed on the body), so a view that cannot
  // see the mite skips it; culled objects draw no pixels, so nothing changes
  im.computeBoundingSphere();
  return im;
}

// ---------- fewer draws per mite ----------
// Parts that share a material are drawn together (5 draws a mite, 4 for the
// predator, instead of 9): the notogaster and the aspis are one mesh, the leg
// segments and tarsi one instanced mesh, and the body, prodorsal and leg
// setae another. gMaterial({ frames: true }) places each part with the
// matrices three.js would have used for its old mesh (set per draw by
// frameUniforms), so the image is bit-identical. Bounds stay conservative.

/** Grow sphere `s` to contain the sphere (c, r). */
function unionSphere(s, c, r) {
  if (s.isEmpty()) { s.center.copy(c); s.radius = r; return s; }
  const d = s.center.distanceTo(c);
  if (d + r <= s.radius) return s;
  if (d + s.radius <= r) { s.center.copy(c); s.radius = r; return s; }
  const R = (d + s.radius + r) / 2;
  s.center.lerp(c, (R - s.radius) / d);
  s.radius = R + 1e-3 * R + 0.01; // round-off margin: never too small
  return s;
}
/** Concatenate a and b (position, normal, uv, index) into one geometry; b's vertices follow a's. */
function concatGeo(a, b) {
  const nA = a.attributes.position.count, nB = b.attributes.position.count;
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const A = a.attributes[k], B = b.attributes[k];
    const arr = new Float32Array((nA + nB) * A.itemSize);
    arr.set(A.array, 0); arr.set(B.array, nA * A.itemSize);
    g.setAttribute(k, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const iA = a.index.array, iB = b.index.array;
  const idx = nA + nB > 65535 ? new Uint32Array(iA.length + iB.length) : new Uint16Array(iA.length + iB.length);
  idx.set(iA, 0);
  for (let i = 0; i < iB.length; i++) idx[iA.length + i] = iB[i] + nA;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
/** The notogaster and aspis as one geometry (aspis vertices from `split` on, in the aspis frame). */
function bodyGeometry(G) {
  if (G.body) return G.body;
  for (const g of [G.noto, G.aspis]) if (!g.boundingSphere) g.computeBoundingSphere();
  const geo = concatGeo(G.noto, G.aspis);
  G.body = { geo, split: G.noto.attributes.position.count, total: geo.attributes.position.count };
  return G.body;
}
/** A geometry of its own (for its own bounds) on the same buffers. */
function sharedGeo(g) {
  const o = new THREE.BufferGeometry();
  for (const k in g.attributes) o.setAttribute(k, g.attributes[k]);
  o.setIndex(g.index);
  return o;
}
const _is = new THREE.Sphere(), _im4 = new THREE.Matrix4();
/** Bounds of instances [from, to) of an InstancedMesh, in its own frame (as computeBoundingSphere does), into out. */
function instSphere(im, from, to, out) {
  const gs = im.geometry.boundingSphere || (im.geometry.computeBoundingSphere(), im.geometry.boundingSphere);
  out.makeEmpty();
  for (let i = from; i < to; i++) { im.getMatrixAt(i, _im4); unionSphere(out, _is.copy(gs).applyMatrix4(_im4).center, _is.radius); }
  return out;
}
/** Leg segment and tarsus lathes (same topology) as one geometry: the tarsus in positionB, normalB, uvB. */
function legGeometry(G) {
  if (G.legGeo) return G.legGeo;
  const s = G.seg, t = G.tars;
  const same = s.index.count === t.index.count && s.index.array.every((v, i) => v === t.index.array[i]) && s.attributes.position.count === t.attributes.position.count;
  if (!same) throw new Error('mite: segment and tarsus lathes differ in topology');
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', s.attributes.position);
  geo.setAttribute('normal', s.attributes.normal);
  geo.setAttribute('uv', s.attributes.uv);
  geo.setAttribute('positionB', t.attributes.position);
  geo.setAttribute('normalB', t.attributes.normal);
  geo.setAttribute('uvB', t.attributes.uv);
  geo.setIndex(s.index);
  for (const g of [s, t]) if (!g.boundingSphere) g.computeBoundingSphere();
  // instance bounds come from this sphere, so it holds both lathes
  geo.boundingSphere = unionSphere(s.boundingSphere.clone(), t.boundingSphere.center, t.boundingSphere.radius);
  G.legGeo = geo;
  return geo;
}
const _fmv = new THREE.Matrix4();
/**
 * Frame i (1 or 2) of a frames material: the matrices three.js computes for
 * an object at obj (its matrixWorld, and the normal matrix of its model-view
 * matrix for this camera), as it would have for the old separate mesh.
 */
function frameUniforms(mat, i, obj, camera) {
  const u = mat.uniforms;
  u[i === 1 ? 'uFrame1' : 'uFrame2'].value.copy(obj.matrixWorld);
  _fmv.multiplyMatrices(camera.matrixWorldInverse, obj.matrixWorld);
  u[i === 1 ? 'uNormal1' : 'uNormal2'].value.getNormalMatrix(_fmv);
  mat.uniformsNeedUpdate = true;
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
 * @param {{cls:number, tex:object, name?:string, player?:number}} opts  player: 0-3, the local player's look (shared/techniques/mite-sem.js)
 */
/** The world's colliders seen from a mite drawn `k` times its anatomy's size. */
function scaledColliders(c, k) {
  const o = new THREE.Vector3();
  // hits from a ring of reused objects, like the world's own (read them before ~200 more casts)
  const ring = Array.from({ length: 256 }, () => ({ point: new THREE.Vector3(), normal: null, dist: 0, kind: '', entry: null }));
  let ri = 0;
  return {
    cast(origin, dir, far, skipFloor, skip) {
      const h = c.cast(o.copy(origin).multiplyScalar(k), dir, far * k, skipFloor, skip);
      if (!h) return null;
      const r = ring[ri]; ri = (ri + 1) & 255;
      r.point.copy(h.point).divideScalar(k); r.normal = h.normal; r.dist = h.dist / k; r.kind = h.kind; r.entry = h.entry;
      return r;
    },
  };
}
/** Copy a collider hit into a kept object (hits themselves are reused). */
function keepHit(h, out) {
  if (!h) return null;
  out = out || { point: new THREE.Vector3(), normal: new THREE.Vector3(), dist: 0, kind: '', entry: null };
  out.point.copy(h.point); out.normal.copy(h.normal); out.dist = h.dist; out.kind = h.kind; out.entry = h.entry;
  return out;
}

export function createMite(scene, colliders, { cls, tex, cfg = CFG, anat = ANAT, scale = 1, player = 0 }) {
  const AN = anat;
  const k = scale;
  // the mite's own frame: 1 unit = k world µm
  const root = new THREE.Group();
  root.scale.setScalar(k);
  scene.add(root);
  root.updateMatrixWorld(true);
  if (k !== 1) colliders = scaledColliders(colliders, k);
  const floorH = (x, z) => worldFloorH(x * k, z * k) / k;
  const floorN = (x, z, out) => worldFloorN(x * k, z * k, out);
  // the walkable square (world.js BOUNDS), kept 150 µm inside, in this mite's units
  const BX0 = (BOUNDS.x0 + 150) / k, BX1 = (BOUNDS.x1 - 150) / k, BZ0 = (BOUNDS.z0 + 150) / k, BZ1 = (BOUNDS.z1 - 150) / k;
  const G = AN.kind === 'pred' ? predGeometry() : geometry();
  // frames materials: one draw for parts posed in different frames (see "fewer draws per mite")
  const cut = gMaterial({ cls, player, tex: tex.cuticle, map: 'tri', scale: 150, bump: 1.6, objSpace: true, frames: true });
  const legMat = gMaterial({ cls, player, frames: true });
  const thinMat = gMaterial({ cls, player, thin: 1 });
  const setaMat = gMaterial({ cls, player, thin: 1, frames: true });

  const body = new THREE.Group();
  // the notogaster and the aspis: one mesh; the aspis vertices are placed by
  // aspisFrame, an empty object where the aspis mesh used to be
  const BG = bodyGeometry(G);
  const noto = new THREE.Mesh(sharedGeo(BG.geo), cut);
  cut.uniforms.uRange1.value.set(BG.split, BG.total);
  body.add(noto);
  const aspis = new THREE.Group();
  aspis.position.set(...AN.hinge);
  const aspisFrame = new THREE.Object3D();
  aspis.add(aspisFrame);
  // where the body setae used to hang (their frame)
  const bodyFrame = new THREE.Object3D();
  noto.onBeforeRender = (r, s, camera) => frameUniforms(cut, 1, aspisFrame, camera);
  // sensilli: their own lathe, on the aspis (the predator has none)
  const setaeMeshes = G.sens.length ? [staticSetae(G.sensillus, G.sens, thinMat)] : [];
  if (setaeMeshes.length) aspis.add(...setaeMeshes);
  body.add(aspis);
  body.add(bodyFrame);
  root.add(body);
  // noto (with the aspis) is culled by bounds measured each pose (legBounds)

  // legs: instanced in world space, 4 segments + tarsus + claw + setae per leg;
  // the 32 segments and 8 tarsi are one instanced mesh (tarsi from instance 32: positionB)
  const legIM = new THREE.InstancedMesh(legGeometry(G), legMat, 40);
  legMat.uniforms.uRangeB.value.set(32, 40);
  const clawIM = new THREE.InstancedMesh(G.claw, thinMat, 8);
  // leg setae: [segment index (1 fe, 2 ge, 3 ti, 4 ta), position along, azimuth, length]
  const LS = [[1, 0.35, 0.5, 30], [1, 0.7, 2.6, 26], [2, 0.6, 1.4, 24], [3, 0.4, 0.3, 30], [3, 0.75, 2.9, 28], [4, 0.2, 0.8, 26], [4, 0.45, 2.2, 30], [4, 0.7, 1.2, 34], [4, 0.85, 3.6, 22]];
  // every seta in one instanced mesh: the body setae (body frame), the
  // prodorsal setae (aspis frame), then the leg setae (the mite's own frame)
  const nBody = G.bodySetae.length, nAsp = G.aspSetae.length, LEG0 = nBody + nAsp;
  const setIM = new THREE.InstancedMesh(G.seta, setaMat, LEG0 + 8 * LS.length + 1);
  G.bodySetae.forEach((s, i) => setInst(setIM, i, s.p, s.d, V3(0, 1, 0), s.rad, s.len));
  G.aspSetae.forEach((s, i) => setInst(setIM, nBody + i, s.p, s.d, V3(0, 1, 0), s.rad, s.len));
  setaMat.uniforms.uRange1.value.set(0, nBody);
  setaMat.uniforms.uRange2.value.set(nBody, LEG0);
  setIM.onBeforeRender = (r, s, camera) => { frameUniforms(setaMat, 1, bodyFrame, camera); frameUniforms(setaMat, 2, aspisFrame, camera); };
  // bounds of the body setae (body frame) and the prodorsal setae (aspis frame)
  const bodySetaeS = instSphere(setIM, 0, nBody, new THREE.Sphere()), aspSetaeS = instSphere(setIM, nBody, LEG0, new THREE.Sphere());
  for (const g of [G.noto, G.aspis]) if (!g.boundingSphere) g.computeBoundingSphere();
  const _bs = new THREE.Sphere(), _bm4 = new THREE.Matrix4();
  // The legs are instanced in the mite's own frame. Their bounds are
  // recomputed from the instances each pose (legBounds), so a split view
  // that cannot see this mite skips its legs instead of drawing them.
  for (const im of [legIM, clawIM, setIM]) root.add(im);
  // Bounds for this pose (pose() is the only place the body and aspis move):
  // the merged body in the body frame, the setae in the mite's own frame.
  const legBounds = () => {
    legIM.computeBoundingSphere(); clawIM.computeBoundingSphere();
    body.updateMatrix(); aspis.updateMatrix();
    const bs = noto.geometry.boundingSphere || (noto.geometry.boundingSphere = new THREE.Sphere());
    bs.copy(G.noto.boundingSphere);
    unionSphere(bs, _bs.copy(G.aspis.boundingSphere).applyMatrix4(aspis.matrix).center, _bs.radius);
    const ss = setIM.boundingSphere || (setIM.boundingSphere = new THREE.Sphere());
    instSphere(setIM, LEG0, setIM.count, ss);
    if (setIM.count > 0) {
      if (nBody) unionSphere(ss, _bs.copy(bodySetaeS).applyMatrix4(body.matrix).center, _bs.radius);
      if (nAsp) unionSphere(ss, _bs.copy(aspSetaeS).applyMatrix4(_bm4.multiplyMatrices(body.matrix, aspis.matrix)).center, _bs.radius);
    }
  };

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
    jumpCool: 0, crouch: 0, airT: 0, squash: 0, charge: 0, airVy0: 1, tuck: 0, splay: 0,
    biteT: 0, time: 0, pen: 0, climbing: 0, groundHit: null, lift: 0, liftT: 0, stuck: 0, drop: 0,
    // held by a predator (mode 'held'): legs flail, then go limp and fold; one leg may be gripped
    flail: 0, limp: 0, seizeLeg: -1, seize: V3(), chel: 0, canEscape: true,
    // acting (set each frame with act()): rear 0..1 (forebody up), lunge 0..1
    // (body thrust forward), hold: a point leg I reaches for (food held to the
    // mouth), holdK 0..1
    rear: 0, lunge: 0, hold: V3(), holdK: 0, lean: 0,
  };
  const events = [];

  const right = (out = new THREE.Vector3()) => out.crossVectors(st.fwd, st.up).normalize();
  const _br = new THREE.Vector3(), _bm = new THREE.Matrix4();
  const basisQ = (fwd, up, out = new THREE.Quaternion()) => {
    const r = _br.crossVectors(fwd, up).normalize();
    return out.setFromRotationMatrix(_bm.makeBasis(fwd, up, r));
  };
  const toWorld = (local, center, q, out = new THREE.Vector3()) => out.copy(local).applyQuaternion(q).add(center);
  const _rw = new THREE.Vector3();
  const restWorld = (L, out = new THREE.Vector3()) => {
    const r = right(_rw);
    return out.copy(st.pos).addScaledVector(st.fwd, L.rest.x).addScaledVector(r, L.rest.z);
  };
  const down = new THREE.Vector3(), _go = new THREE.Vector3();
  const ground = (p, up, above = 140, far = 380) => colliders.cast(_go.copy(p).addScaledVector(up, above), down.copy(up).negate(), far);

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
    st.flail = 0; st.limp = 0; st.seizeLeg = -1; st.chel = 0;
    // settle onto whatever is there
    for (let i = 0; i < 4; i++) settleBody(1 / 30, true);
    plantAll();
    pose(0);
  }

  // probe the ground around the body: height and surface normal
  const PROBES = [[0, 0], [210, 0], [-220, 0], [0, -125], [0, 125]];
  const _ph = [null, null, null, null, null], _pr = { point: new THREE.Vector3(), normal: new THREE.Vector3() };
  const _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), _pp = new THREE.Vector3(), _rt = new THREE.Vector3();
  function probe(at) {
    const r = right(_rt);
    for (let i = 0; i < 5; i++) _ph[i] = ground(_pp.copy(at).addScaledVector(st.fwd, PROBES[i][0]).addScaledVector(r, PROBES[i][1]), st.up);
    const hits = _ph;
    if (!hits[0]) return null;
    st.groundHit = keepHit(hits[0], st.groundHit);
    const h0 = _pa.copy(hits[0].point).sub(at).dot(st.up);
    for (let i = 0; i < 5; i++) if (hits[i] && Math.abs(_pa.copy(hits[i].point).sub(at).dot(st.up) - h0) >= 120) hits[i] = null;
    const ok = hits;
    const n = _pr.normal.set(0, 0, 0);
    for (const h of ok) if (h) n.add(h.normal);
    if (ok[1] && ok[2] && ok[3] && ok[4]) {
      const a = _pa.copy(ok[1].point).sub(ok[2].point), b = _pb.copy(ok[4].point).sub(ok[3].point);
      const pn = _pp.crossVectors(b, a).normalize();
      if (pn.dot(st.up) < 0) pn.negate();
      n.normalize().add(pn.multiplyScalar(1.5));
    }
    _pr.point.copy(hits[0].point);
    n.normalize();
    return _pr;
  }

  function settleBody(dt, snap = false) {
    const pr = probe(st.pos);
    if (!pr) return false;
    const k = snap ? 1 : 1 - Math.exp(-dt / 0.06);
    const dh = _pa.copy(pr.point).sub(st.pos).dot(st.up);
    st.pos.addScaledVector(st.up, dh * k);
    const tgt = pr.normal;
    if (tgt.y < -0.2) { tgt.y = -0.2; tgt.normalize(); }
    st.up.lerp(tgt, snap ? 1 : 1 - Math.exp(-dt / 0.12)).normalize();
    st.fwd.addScaledVector(st.up, -st.fwd.dot(st.up)).normalize();
    return true;
  }

  let gaitNow = cfg.gait;
  const _wd = new THREE.Vector3(), _wu = new THREE.Vector3(), _wo = new THREE.Vector3(), _wm = new THREE.Vector3(), _wn = new THREE.Vector3(), _wp = new THREE.Vector3();
  const _vb = new THREE.Vector3(), _sw = new THREE.Vector3(), _sr = new THREE.Vector3(), _sv = new THREE.Vector3();
  const _trig = new Set();
  function walk(dt, input) {
    if (gaitNow !== cfg.gait) { gaitNow = cfg.gait; for (const L of legs) L.off = legOffset(gaitNow, L.k, L.sideIdx); }
    const duty = GAITS[gaitNow].duty;
    let want = 0, turn = 0;
    if (input.mag > 0.01) {
      const d = _wd.copy(input.dir).addScaledVector(st.up, -input.dir.dot(st.up));
      if (d.lengthSq() < 0.05) d.addScaledVector(_wu.set(0, 1, 0).addScaledVector(st.up, -st.up.y), 1); // on a wall: push = climb
      if (d.lengthSq() > 1e-6) {
        d.normalize();
        const ang = Math.atan2(_wu.crossVectors(st.fwd, d).dot(st.up), st.fwd.dot(d));
        const rate = (1.5 + 1.2 * clamp(1 - st.speed / 200, 0, 1)) * (input.turnK || 1); // turns tighter when slow (and in a scramble)
        turn = clamp(ang, -rate * dt, rate * dt);
        want = input.maxSpeed * input.mag * sstep(-0.15, 0.75, Math.cos(ang));
      }
    }
    st.speed += (want - st.speed) * (1 - Math.exp(-dt / (input.accel || 0.18)));
    st.lean += ((input.lean || 0) - st.lean) * (1 - Math.exp(-dt / 0.1));
    st.omega = turn / dt;
    st.fwd.applyAxisAngle(st.up, turn).normalize();

    // wall ahead (taller than a step)?
    let step = st.speed * dt;
    const wall = colliders.cast(_wo.copy(st.pos).addScaledVector(st.up, 130), st.fwd, 300 + step, false, SOFT);
    const move = _wm.copy(st.fwd).multiplyScalar(step);
    st.climbing = Math.max(0, st.climbing - dt * 2);
    if (wall && wall.normal.dot(st.up) < 0.55) {
      const n = _wn.copy(wall.normal).addScaledVector(st.up, -wall.normal.dot(st.up)).normalize();
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
    const prev = _wp.copy(st.pos);
    st.pos.add(move);
    st.pos.x = clamp(st.pos.x, BX0, BX1);
    st.pos.z = clamp(st.pos.z, BZ0, BZ1);
    if (!settleBody(dt)) {
      st.pos.copy(prev); st.speed *= 0.5;
      // Walked off the end or edge of something with nothing within reach:
      // after a moment the mite lets go, closes and drops (box mites do).
      if (step > 0.01 && (st.stuck += dt) > 0.5) { st.drop = 0.35; st.stuck = 0; }
    } else st.stuck = Math.max(0, st.stuck - dt);
    // (the push-out keeps up with the scramble, ~43 µm a frame at 60 Hz: a larger step, and a second pass when fast)
    if (cfg.clear) { const cap = Math.max(30, 1.3 * st.speed * dt); clearance(true, cap); if (st.speed > 900) clearance(true, cap); }
    const fy = floorH(st.pos.x, st.pos.z);
    if (st.pos.y < fy) st.pos.y = fy;
    const moved = st.pos.distanceTo(prev);

    // gait phase advances with distance travelled (and turning), so stride matches speed;
    // strides lengthen with speed (1.5x at a walk's top, ~2.2x in the
    // scramble), so the legs don't flicker into a blur at the faster speeds
    const stride = AN.stride * (1 + 0.5 * clamp((st.speed - 210) / 700, 0, 1) + 0.7 * clamp((st.speed - 1000) / 1600, 0, 1));
    let err = 0;
    for (const L of legs) if (!L.swing && !isFeeler(L)) err = Math.max(err, L.foot.distanceTo(restWorld(L, _x)));
    // the front feet are ~330 µm from the centre, so turning sweeps them fast
    let dphi = (moved + Math.abs(turn) * 330) / stride;
    if (dphi < 0.25 * dt && err > 22) dphi = 1.4 * dt; // shuffle feet back under the body when stopped
    const vBody = _vb.copy(st.fwd).multiplyScalar(moved / dt);
    const trig = _trig; trig.clear();
    for (const L of gaitTriggers(st.phase, dphi, legs)) trig.add(L);
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
      const rw = restWorld(L, _sw);
      const rel = _sr.copy(rw).sub(st.pos);
      const vFoot = _sv.crossVectors(st.up, rel).multiplyScalar(st.omega).add(vBody);
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
      else {
        belly = Math.max(belly, p * Math.max(0, -d.y));
        // a grain too tall to stand over (the lift tops out at 140 µm): pushed back off it sideways
        if (st.lift + p > 135 && Math.abs(_cd.dot(st.up)) < 0.98) _cp.addScaledVector(_dn.copy(_cd).addScaledVector(st.up, -_cd.dot(st.up)).normalize(), -p);
      }
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
      } else {
        // never through the floor: a capsule that closed with its lowest point already under it (knocked
        // shut on a blade that sprang away, say) found no ground below and fell for ever
        const fl = floorH(c2.x, c2.z);
        if (c2.y < fl) { st.center.y += fl - c2.y; if (st.vel.y < 0) st.vel.y *= -0.3; st.vel.x *= 0.4; st.vel.z *= 0.4; }
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
    st.center.x = clamp(st.center.x, BX0, BX1);
    st.center.z = clamp(st.center.z, BZ0, BZ1);
  }

  // The hop: a ballistic arc after the crouch, landing on whatever is below.
  const WUP = V3(0, 1, 0);
  function launch() {
    let h = st.fwd.clone(); h.y = 0;
    if (h.lengthSq() < 0.05) { h.copy(st.up); h.y = 0; }
    if (h.lengthSq() < 1e-4) h.set(1, 0, 0);
    h.normalize();
    const { vh, vy } = jumpLaunch(st.charge);
    st.vel.copy(h).multiplyScalar(vh + JUMP.carry * st.speed0).addScaledVector(WUP, vy).addScaledVector(st.up, 150);
    st.airVy0 = Math.max(1, st.vel.y);
    st.mode = 'air'; st.airT = 0; st.crouch = 0; st.speed = 0;
    events.push('jump');
  }
  function air(dt, input) {
    st.airT += dt;
    st.vel.y -= JUMP.grav * dt;
    // a little air control: lean the arc toward the stick
    if (input && input.mag > 0.01 && !st.diving) {
      const ix = input.dir.x, iz = input.dir.z, il = Math.hypot(ix, iz);
      if (il > 1e-3) { st.vel.x += (ix / il) * JUMP.steer * dt; st.vel.z += (iz / il) * JUMP.steer * dt; }
    }
    const hv = V3(st.vel.x, 0, st.vel.z), hl = hv.length();
    if (hl > 1) {
      // rigid things ahead (a stem, a grain): bounce off; blades bend away
      const hit = colliders.cast(st.center, hv.divideScalar(hl), 200 + hl * dt, true, SOFT);
      if (hit && hit.normal.y < 0.5) { const vn = st.vel.dot(hit.normal); if (vn < 0) st.vel.addScaledVector(hit.normal, -vn * 1.3); }
    }
    if (st.vel.y > 0) { const hit = colliders.cast(st.center, WUP, 180 + st.vel.y * dt, true, SOFT); if (hit) st.vel.y = 0; }
    st.center.addScaledVector(st.vel, dt);
    st.center.x = clamp(st.center.x, BX0, BX1);
    st.center.z = clamp(st.center.z, BZ0, BZ1);
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
    if (st.vel.y < -2400) events.push('impact');
    st.squash = clamp(-st.vel.y / 3000, 0.35, 1);
    st.landV = -st.vel.y; st.diving = false;
    st.speed = Math.hypot(st.vel.x, st.vel.z) * 0.25;
    st.vel.set(0, 0, 0);
    st.mode = 'walk'; st.jumpCool = JUMP.cool; st.lift = 0; st.liftT = 0;
    settleBody(dt, true);
    if (cfg.clear) clearance(true, 60);
    plantAll();
    events.push('land');
  }

  // scratch for pose (no allocations per leg per frame)
  const _U = new THREE.Vector3(), _H = new THREE.Vector3(), _F = new THREE.Vector3(), _F2 = new THREE.Vector3(), _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
  const _tf = new THREE.Vector3(), _T = new THREE.Vector3(), _K = new THREE.Vector3(), _Fe = new THREE.Vector3(), _u1 = new THREE.Vector3(), _b = new THREE.Vector3();
  const _Fm = new THREE.Vector3(), _w2 = new THREE.Vector3(), _bend = new THREE.Vector3(), _tib = new THREE.Vector3(), _J = new THREE.Vector3(), _ta = new THREE.Vector3();
  const _kd = new THREE.Vector3(), _X = new THREE.Vector3(), _Z = new THREE.Vector3(), _seg = [0, 0, 0, 0, 0], _rad = [0, 0, 0, 0, 0];
  // per leg segment: [point, direction] and, apart, its length and radius
  // (doubles stored in a mixed array were boxed every frame)
  const _frames = [null, [null, null], [null, null], [null, null], [null, null]], _frL = new Float64Array(5), _frR = new Float64Array(5);
  const _pq = new THREE.Quaternion(), _pq2 = new THREE.Quaternion(), _pc = new THREE.Vector3(), _ax = new THREE.Vector3();
  // place every part for the current state
  function pose(dt) {
    let q, center;
    if (st.mode === 'walk' || st.mode === 'closing' || st.mode === 'crouch') {
      const bob = st.mode === 'walk' && cfg.bob ? 2.5 * Math.sin(st.phase * Math.PI * 4) : 0;
      const sway = st.mode === 'walk' && cfg.bob ? 0.02 * Math.sin(st.phase * Math.PI * 2) * Math.min(1, st.speed / 120) : 0;
      q = basisQ(st.fwd, st.up, _pq);
      q.multiply(_pq2.setFromAxisAngle(_ax.set(1, 0, 0), sway));
      if (st.rear > 0) q.multiply(_pq2.setFromAxisAngle(_ax.set(0, 0, 1), 0.42 * st.rear));
      if (st.lean > 0.01) q.multiply(_pq2.setFromAxisAngle(_ax.set(0, 0, 1), -0.14 * st.lean)); // the scramble: nose down, driving
      st.lift += (st.liftT - st.lift) * (st.liftT > st.lift ? 0.5 + 0.45 * clamp((st.speed - 700) / 1500, 0, 1) : 0.08); // (rises faster at a run: grains come quicker)
      st.squash = Math.max(0, st.squash - dt * 4);
      const quiver = st.mode === 'crouch' && st.charge > 0.9 ? 3 * Math.sin(st.time * 90) : 0;
      let h = AN.stand + bob + st.lift - 70 * st.crouch + quiver - 75 * Math.sin(Math.PI * Math.min(1, 1 - st.squash)) * (st.squash > 0 ? 1 : 0);
      if (st.mode === 'closing') h = AN.stand + (st.h0 - AN.stand) * sstep(0.2, 1, st.t);
      h += 28 * st.rear;
      center = _pc.copy(st.pos).addScaledVector(st.up, h).addScaledVector(st.fwd, 46 * st.lunge);
      st.center.copy(center); st.q.copy(q);
    } else if (st.mode === 'opening') {
      const e = sstep(0, 0.75, st.t);
      q = st.q0.clone().slerp(basisQ(st.fwd, st.up), e);
      center = st.c0.clone().lerp(st.pos.clone().addScaledVector(st.up, AN.stand), sstep(0.15, 0.9, st.t));
      st.center.copy(center); st.q.copy(q);
    } else if (st.mode === 'air') {
      // nose up on the way up, down on the way down
      q = basisQ(st.fwd, st.up, _pq);
      q.multiply(_pq2.setFromAxisAngle(_ax.set(0, 0, 1), clamp(st.vel.y / st.airVy0, -1, 1) * 0.32));
      center = st.center;
      st.q.copy(q);
      // legs: the hind pairs drive back and down at take-off (the push-off),
      // then every leg tucks in under the body; past the top they splay out
      // wide and reach down for the landing
      const kick = Math.exp(-st.airT / 0.07);
      st.tuck = sstep(0.03, 0.16, st.airT) * (1 - sstep(-0.05, -0.45, st.vel.y / st.airVy0));
      st.splay = sstep(-0.05, -0.55, st.vel.y / st.airVy0);
      for (const L of legs) {
        if (isFeeler(L)) continue;
        const back = L.k >= 2 ? -110 * kick : 0;
        const fx = L.rest.x * (0.85 - 0.3 * st.tuck + 0.3 * st.splay) + back;
        const fy = -AN.stand * (0.95 * kick + (1 - kick) * (0.62 - 0.22 * st.tuck + 0.4 * st.splay));
        const fz = L.rest.z * (0.9 - 0.2 * st.tuck + 0.35 * st.splay);
        toWorld(_al.set(fx, fy, fz), center, q, L.foot);
      }
    } else { q = st.q; center = st.center; }

    body.position.copy(center);
    body.quaternion.copy(q);
    aspis.rotation.z = AN.aspisOpen + (AN.aspisClosed - AN.aspisOpen) * st.aspis;
    // X: a bite. The box mite dips its rostrum and works the chelicerae; the
    // predator thrusts its chelicerae forward.
    const bk = st.biteT > 0 ? Math.sin(Math.PI * (1 - st.biteT / 0.28)) : 0;
    if (AN.kind === 'pred') aspis.position.set(AN.hinge[0] + 26 * Math.max(bk, st.chel), AN.hinge[1], AN.hinge[2]);
    else aspis.rotation.z -= 0.2 * bk;

    // held: the feet hang from the body, kicking (flail), then limp and folded;
    // a gripped leg is pulled out to the predator's chelicerae
    if (st.mode === 'held') {
      for (const L of legs) {
        const fl = st.flail, ph = st.time * 15 + L.k * 1.9 + L.side * 0.8;
        toWorld(_al.set(L.rest.x * 0.85 + 60 * fl * Math.sin(ph), -AN.stand * 0.7 + 80 * fl * Math.sin(ph * 1.3 + 1), L.rest.z * (0.9 + 0.15 * fl * Math.sin(ph * 0.7))), center, q, L.foot);
      }
      if (st.seizeLeg >= 0) legs[st.seizeLeg].foot.copy(st.seize);
      st.retract = 0.82 * st.limp;
    }
    // legs
    const rc = st.retract;
    const hide = rc > 0.97;
    for (const m of setaeMeshes) m.visible = cfg.setae;
    // the body and prodorsal setae (instances 0..LEG0) show whenever setae are on
    legIM.count = hide ? 0 : 40; clawIM.count = hide ? 0 : 8; setIM.count = cfg.setae ? LEG0 : 0;
    if (!hide) {
      const U = _U.set(0, 1, 0).applyQuaternion(q);
      const shrink = 1 - 0.72 * rc;
      let si = LEG0;
      _pk[0] = rc; _pk[1] = shrink;
      for (let i = 0; i < legs.length; i++) si = poseLeg(i, center, q, U, si);
      setIM.count = cfg.setae ? si : 0;
      legIM.instanceMatrix.needsUpdate = clawIM.instanceMatrix.needsUpdate = setIM.instanceMatrix.needsUpdate = true;
    }
    legBounds();
  }

  // pose() is long enough that V8 stops inlining the small vector calls in
  // it, and every one of them that returns a number then boxes it (~9 KB of
  // garbage per mite per frame). Each leg, and its setae, are posed in
  // functions of their own, with the same arithmetic in the same order.
  // rc and shrink travel in _pk (doubles passed as arguments are boxed).
  const _pk = new Float64Array(2);
  /** Pose leg i (segments, tarsus, claw, setae from instance si); returns the next seta index. */
  function poseLeg(i, center, q, U, si) {
    const rc = _pk[0], shrink = _pk[1];
    const L = legs[i];
    const H = toWorld(_t1.copy(L.hip).add(_t2.set(-24 * rc, 46 * rc, -L.side * 18 * rc)), center, q, _H);
    let F = L.foot;
    // leg I holds food to the mouth (or reaches up in a rear)
    if (L.k === 0 && st.holdK > 0 && !isFeeler(L)) F = _F.copy(L.foot).lerp(_t1.copy(st.hold).addScaledVector(_t2.set(0, 0, 1).applyQuaternion(q), L.side * 28), st.holdK);
    else if (L.k === 0 && st.rear > 0 && !isFeeler(L)) F = _F.copy(L.foot).lerp(toWorld(_t1.set(L.rest.x + 60, 70, L.rest.z * 0.8), center, q, _t2), st.rear);
    if (isFeeler(L)) {
      // leg I as a feeler: held up and forward, tapping ahead
      const s = L.side, t = st.time;
      F = toWorld(_t1.set(L.rest.x + 40 * Math.sin(t * 6.1 + s) - 60 * (1 - Math.min(1, st.speed / 200)) + 80 * st.rear, L.rest.y + 40 * Math.sin(t * 4.3 + 2 * s) - 90 + 170 * st.rear, L.rest.z + 30 * Math.sin(t * 5.2 + s) + s * 70 * st.rear), center, q, _F);
    }
    if (rc > 0 && i !== (st.mode === 'held' ? st.seizeLeg : -1)) F = _F2.copy(L.foot).lerp(toWorld(_t1.set(L.hip.x - 30, L.hip.y + 20, L.hip.z * 0.4), center, q, _t2), sstep(0, 1, rc));
    const seg = _seg, rad = _rad;
    for (let j = 0; j < 5; j++) { seg[j] = L.seg[j] * shrink; rad[j] = L.rad[j] * (1 - 0.3 * rc); }
    const L1 = seg[1] + seg[2], L2 = seg[3] + seg[4];
    // trochanter: out from the hip, toward the foot, tilted up
    const tf = _tf.copy(F).sub(H); tf.addScaledVector(U, -tf.dot(U));
    if (tf.lengthSq() < 1) tf.copy(L.rest).applyQuaternion(q);
    const dirT = tf.normalize().addScaledVector(U, 0.55).normalize();
    const T = _T.copy(H).addScaledVector(dirT, seg[0]);
    // two-bone IK, the knee (femur-genu) bent upward
    const K = _K, Fe = _Fe;
    twoBoneIK(T, F, L1, L2, U, K, Fe, !cfg.ik);
    const u1 = _u1.copy(K).sub(T).normalize();
    const b = _b.copy(U).addScaledVector(u1, -u1.dot(U)).normalize();
    const Fm = _Fm.copy(T).addScaledVector(u1, seg[1]);
    // tibia a little above the straight line, tarsus angled down to the foot
    const w2 = _w2.copy(Fe).sub(K).normalize();
    const bend = _bend.copy(b).addScaledVector(w2, -w2.dot(b)).normalize();
    const tb = cfg.ik ? 0.2 : 0;
    const tib = bend.lengthSq() > 0.5 ? _tib.copy(w2).multiplyScalar(Math.cos(tb)).addScaledVector(bend, Math.sin(tb)).normalize() : _tib.copy(w2);
    const J = _J.copy(K).addScaledVector(tib, seg[3]);
    const ta = _ta.copy(Fe).sub(J);
    const taLen = ta.length();
    const kneeDir = _kd.copy(K).sub(Fm).normalize();
    _RL[0] = rad[0]; _RL[1] = seg[0] + rad[0] * 0.4; setInstRL(legIM, i * 4, H, dirT, U);
    _RL[0] = rad[1]; _RL[1] = seg[1] + rad[1] * 0.4; setInstRL(legIM, i * 4 + 1, T, u1, U);
    _RL[0] = rad[2]; _RL[1] = seg[2] + rad[2] * 0.4; setInstRL(legIM, i * 4 + 2, Fm, kneeDir, U);
    _RL[0] = rad[3]; _RL[1] = seg[3] + rad[3] * 0.4; setInstRL(legIM, i * 4 + 3, K, tib, U);
    const taDir = ta.divideScalar(taLen || 1);
    _RL[0] = rad[4]; _RL[1] = taLen; setInstRL(legIM, 32 + i, J, taDir, U);
    _RL[0] = 24 * shrink; _RL[1] = 24 * shrink; setInstRL(clawIM, i, _t1.copy(Fe).addScaledVector(taDir, -4 * shrink), taDir, U);
    if (cfg.setae) {
      const FR = _frames;
      FR[1][0] = T; FR[1][1] = u1; _frL[1] = seg[1]; _frR[1] = rad[1];
      FR[2][0] = Fm; FR[2][1] = kneeDir; _frL[2] = seg[2]; _frR[2] = rad[2];
      FR[3][0] = K; FR[3][1] = tib; _frL[3] = seg[3]; _frR[3] = rad[3];
      FR[4][0] = J; FR[4][1] = taDir; _frL[4] = taLen; _frR[4] = rad[4];
      si = legSetae(L, U, si);
    }
    return si;
  }
  /** The leg's setae on the frames _frames/_frL/_frR (just written by poseLeg). */
  function legSetae(L, U, si) {
    const shrink = _pk[1];
    const FR = _frames;
    for (let li = 0; li < LS.length; li++) {
      // indexed, not destructured: array destructuring left iterator garbage here every frame
      const ls = LS[li], sg = ls[0], at = ls[1], az = ls[2], len = ls[3];
      const fr = FR[sg], p = fr[0], dir = fr[1], l = _frL[sg], r = _frR[sg];
      const X = _X.crossVectors(dir, U).normalize();
      const Z = _Z.crossVectors(X, dir).normalize();
      const radial = X.multiplyScalar(Math.cos(az + L.side)).addScaledVector(Z, Math.sin(az + L.side));
      const base = _t1.copy(p).addScaledVector(dir, at * l).addScaledVector(radial, r * 0.8);
      const sdir = _t2.copy(dir).multiplyScalar(0.8).addScaledVector(radial, 0.6).normalize();
      const long = L.k === 0 && sg === 3 && at < 0.5; // the long tactile seta on tibia I
      _RL[0] = 2.6 * shrink; _RL[1] = (long ? 72 : len) * shrink; setInstRL(setIM, si++, base, sdir, U);
    }
    return si;
  }

  function update(dt, input) {
    events.length = 0;
    if (k !== 1 && input.maxSpeed) input = { ...input, maxSpeed: input.maxSpeed / k };
    if (!(dt > 0)) return events;
    st.time += dt;
    st.biteT = Math.max(0, st.biteT - dt);
    st.drop = Math.max(0, st.drop - dt);
    if (st.mode === 'walk') st.jumpCool = Math.max(0, st.jumpCool - dt);
    const hold = input.hold || st.drop > 0;
    if (st.mode === 'crouch') {
      st.t += dt;
      // a held A charges (deeper, a quiver at the top); released (or full) it goes
      st.charge = clamp((st.t - JUMP.crouch) / JUMP.charge, 0, 1);
      st.crouch = sstep(0, 1, st.t / JUMP.crouch) * (1 + 0.6 * st.charge);
      st.speed *= Math.exp(-dt / 0.05);
      // aim: turn quickly toward the stick while crouched
      if (input.mag > 0.01) {
        const d = _wd.copy(input.dir).addScaledVector(st.up, -input.dir.dot(st.up));
        if (d.lengthSq() > 1e-6) {
          d.normalize();
          const ang = Math.atan2(_wu.crossVectors(st.fwd, d).dot(st.up), st.fwd.dot(d));
          st.fwd.applyAxisAngle(st.up, clamp(ang, -12 * dt, 12 * dt)).normalize();
        }
      }
      if (st.t >= JUMP.crouch && (!input.jumpHeld || st.charge >= 1)) launch();
    } else if (st.mode === 'air') air(dt, input);
    else if (st.mode === 'held') {
      // closing up (ptychoidy) while held: the grip slips off the capsule
      if (hold && st.canEscape) {
        st.mode = 'closing'; st.t = 0; st.speed = 0; st.seizeLeg = -1; st.flail = 0;
        const q = basisQ(st.fwd, st.up);
        const dl = st.up.clone().negate().applyQuaternion(q.clone().invert());
        st.h0 = Math.abs(support(AN.noto.c, AN.noto.r, dl, new THREE.Vector3()).dot(dl));
      }
    } else if (st.mode === 'walk') {
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

  const _mouth = new THREE.Vector3(), _cw = new THREE.Vector3(), _sz = new THREE.Vector3();
  const _gw = { point: new THREE.Vector3(), normal: null, dist: 0, kind: '', entry: null };
  return {
    body, update, legs, st, anat: AN, clearance, scale: k, root,
    /** Stand at (x, z) world µm, facing yaw. */
    place(x, z, yaw = 0) { place(x / k, z / k, yaw); },
    /**
     * Held by a predator: the body is placed by the caller (center in world µm,
     * quaternion), legs flail (0..1) or go limp and fold (limp 0..1), and leg
     * `seizeLeg` (or -1) is held at `seize` (world µm). Hold Y (input.hold in
     * update) while not yet limp to close up and drop out of the grip.
     */
    held(centerW, q, { flail = 1, limp = 0, seizeLeg = -1, seize = null, escape = true } = {}) {
      if (st.mode !== 'held' && st.mode !== 'walk' && st.mode !== 'crouch' && st.mode !== 'air') return false;
      st.mode = 'held';
      st.center.copy(centerW).divideScalar(k); st.q.copy(q);
      st.up.set(0, 1, 0);
      st.fwd.set(1, 0, 0).applyQuaternion(q).setY(0);
      if (st.fwd.lengthSq() < 1e-6) st.fwd.set(1, 0, 0);
      st.fwd.normalize();
      st.pos.copy(st.center).addScaledVector(st.up, -AN.stand);
      st.flail = flail; st.limp = limp; st.seizeLeg = seizeLeg; st.canEscape = escape;
      if (seize) st.seize.copy(seize).divideScalar(k);
      st.speed = 0; st.crouch = 0;
      return true;
    },
    /** World position of a leg's foot. */
    footW(i, out = new THREE.Vector3()) { return out.copy(legs[i].foot).multiplyScalar(k); },
    /** Size in world µm of this mite's body half-axes. */
    get size() { return _sz.set(...AN.noto.r).multiplyScalar(k); },
    /** Where the chelicerae close, in world space. */
    mouth(out = _mouth) {
      body.updateMatrixWorld();
      return aspis.localToWorld(out.set(...(AN.kind === 'pred' ? [150, -12, 0] : [210, -115, 0])));
    },
    /** Start a hop (crouch, then launch). False if not walking or still recovering. */
    jump() {
      if (st.mode !== 'walk' || st.jumpCool > 0) return false;
      st.mode = 'crouch'; st.t = 0; st.speed0 = st.speed; st.charge = 0;
      return true;
    },
    /** The acting layer, set each frame: { rear, lunge, hold: world point | null, holdK }. */
    act({ rear = 0, lunge = 0, hold = null, holdK = 0 } = {}) {
      st.rear = rear; st.lunge = lunge; st.holdK = hold ? holdK : 0;
      if (hold) st.hold.copy(hold).divideScalar(k);
    },
    /** In the air: dive at a world point (the pounce-bite), arriving in ~0.2 s. False if not airborne. */
    dive(targetW) {
      if (st.mode !== 'air') return false;
      const t = targetW.clone().divideScalar(k);
      const T = 0.2;
      st.vel.x = (t.x - st.center.x) / T; st.vel.z = (t.z - st.center.z) / T;
      st.vel.y = Math.min(st.vel.y, (t.y + AN.stand - st.center.y) / T + 0.5 * JUMP.grav * T);
      if (st.vel.y > -950) st.vel.y = -950;
      st.diving = true;
      return true;
    },
    get airborne() { return st.mode === 'air' || st.mode === 'crouch'; },
    /** Start a bite (the animation; the caller decides what it hits). */
    bite() { if (st.biteT > 0.05) return false; st.biteT = 0.28; return true; },
    get quat() { return st.q; },
    /** Body half-axes in world µm. */
    get radii() { return AN.noto.r.map((r) => r * k); },
    /** The surface under the body (a collider hit with .kind and .entry, point in world µm), or null. */
    get ground() {
      const g = st.mode === 'walk' || st.mode === 'crouch' ? st.groundHit : null;
      if (!g || k === 1) return g;
      _gw.point.copy(g.point).multiplyScalar(k); _gw.normal = g.normal; _gw.dist = g.dist * k; _gw.kind = g.kind; _gw.entry = g.entry;
      return _gw;
    },
    /** Body centre, world µm. */
    get center() { return k === 1 ? st.center : _cw.copy(st.center).multiplyScalar(k); },
    get mode() { return st.mode; },
    /** Speed, world µm/s. */
    get speed() { return st.speed * k; },
    meshes: [body, legIM, clawIM, setIM],
    setVisible(v) { for (const m of [body, legIM, clawIM, setIM]) m.visible = v; },
  };
}
