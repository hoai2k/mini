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
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd, combine } from '../shared/sdf.js';
import { gMaterial } from './sem.js';
import { HALF, floorH } from './world.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export const ANAT = {
  noto: { c: [-70, 0, 0], r: [215, 172, 136] },
  hinge: [126, 64, 0],
  aspisOpen: -0.34,     // radians about the hinge (rostrum tipped down)
  aspisClosed: -2.12,   // folded down over the leg cavity
  stand: 196,           // body origin above the ground while walking
  stride: 118,
  duty: 0.64,
  // L legs are at -z, R legs at +z. seg: tr, fe, ge, ti, ta; rad likewise.
  legs: [
    { hip: [168, -96, 36], rest: [322, -196, 132], seg: [24, 82, 30, 56, 74], rad: [13, 14.5, 12, 11, 9.5] },
    { hip: [140, -114, 52], rest: [212, -196, 196], seg: [22, 68, 26, 46, 62], rad: [12.5, 14, 11.5, 10.5, 9] },
    { hip: [104, -126, 58], rest: [64, -196, 210], seg: [22, 64, 24, 46, 60], rad: [12.5, 14, 11.5, 10.5, 9] },
    { hip: [64, -134, 54], rest: [-58, -196, 176], seg: [26, 74, 26, 50, 66], rad: [13, 14.5, 11.5, 10.5, 9] },
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
  const x0 = 92, k = Math.sqrt(1 - ((x0 - cx) / rx) ** 2);
  const ring = (a) => [x0, ry * k * Math.cos(a), rz * k * Math.sin(a)];
  for (let a = -2.1; a < 2.1; a += 0.35) parts.push({ id: 0, op: 'sub', blend: 3, sdf: groove(ring(a), ring(a + 0.35), 4.5) });
  return parts;
}

function aspisParts() {
  const parts = [
    { id: 2, sdf: sd.ellipsoid([92, -46, 0], [128, 80, 82]) },
    { id: 2, sdf: sd.roundCone([150, -64, 0], [226, -102, 0], 50, 19), blend: 30 },
    // lateral carinae along the hood
    { id: 2, sdf: sd.mirrorZ(sd.capsule([10, -10, 74], [178, -78, 40], 5)), blend: 9 },
    // hollow underneath, where the chelicerae and leg I tuck in
    { id: 2, op: 'sub', sdf: sd.ellipsoid([64, -140, 0], [124, 52, 60]), blend: 12 },
  ];
  const hood = combine(parts);
  const both = surfacePoint(hood, V3(92, -46, 40), V3(-0.62, 0.62, 0.55));
  const b = both.p, bn = both.n;
  parts.push({ id: 2, sdf: sd.mirrorZ(sd.sphere([b.x, b.y, b.z], 15)), blend: 8 });
  const cup = b.clone().addScaledVector(bn, 9);
  parts.push({ id: 2, op: 'sub', sdf: sd.mirrorZ(sd.sphere([cup.x, cup.y, cup.z], 8.5)), blend: 2 });
  // chelicerae: stout, chelate, under the rostrum
  parts.push({ id: 3, sdf: sd.mirrorZ(sd.roundCone([116, -98, 16], [206, -124, 12], 15, 9)), blend: 6 });
  parts.push({ id: 3, sdf: sd.mirrorZ(sd.roundCone([206, -124, 12], [230, -126, 10], 7, 2.6)), blend: 3 });
  parts.push({ id: 3, sdf: sd.mirrorZ(sd.roundCone([200, -132, 12], [226, -138, 10], 5.5, 2.2)), blend: 3 });
  // palps
  parts.push({ id: 4, sdf: sd.mirrorZ(sd.roundCone([98, -112, 40], [150, -140, 46], 9, 7)), blend: 5 });
  parts.push({ id: 4, sdf: sd.mirrorZ(sd.roundCone([150, -140, 46], [182, -152, 42], 7, 4.5)), blend: 3 });
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
  const noto = buildSdfMesh(np, { min: [-292, -180, -144], max: [152, 178, 144], cell: 5 });
  const ap = aspisParts();
  const aspis = buildSdfMesh(ap.parts, { min: [-44, -164, -98], max: [252, 52, 98], cell: 4 });
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
    const d = sp.n.clone().multiplyScalar(0.5).add(V3(-0.8, 0.05, 0)).normalize();
    bodySetae.push({ p: sp.p.addScaledVector(sp.n, -1.5), d, len: 38 + ((fx * 31 + a * 7) % 1 + 1) % 1 * 14, rad: 3 });
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
  aspSeta([196, -84, 0], [0.4, 0.6, 0.45], [1, 0.25, 0, 0.5], 40, 3);   // rostral
  aspSeta([132, -52, 0], [0.1, 1, 0.42], [1, 0.25, 0, 0.6], 48, 3);     // lamellar
  aspSeta([58, -40, 0], [-0.1, 1, 0.3], [0.2, 0.7, 0.1, 1], 60, 3.2);   // interlamellar
  aspSeta([30, -62, 0], [-0.25, 0.05, 1], [-0.3, 0, 0.2, 1], 18, 2.6);   // exobothridial
  const bp = ap.bothridium;
  const sens = [];
  for (const s of [-1, 1]) {
    const p = V3(bp.p.x, bp.p.y, bp.p.z * s), n = V3(bp.n.x, bp.n.y, bp.n.z * s);
    sens.push({ p, d: n.clone().add(V3(-0.55, 0.75, 0.25 * s)).normalize(), len: 86, rad: 3.4 });
  }
  console.info(`[mite] anatomy meshed in ${(performance.now() - t0).toFixed(0)} ms: notogaster ${noto.index.count / 3} tris, aspis ${aspis.index.count / 3} tris`);
  GEO = { noto, aspis, bodySetae, aspSetae, sens, seta: setaGeo(), sensillus: sensillusGeo(), seg: segGeo(false), tars: segGeo(true), claw: clawGeo() };
  return GEO;
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
export function createMite(scene, colliders, { cls, tex }) {
  const G = geometry();
  const cut = gMaterial({ cls, tex: tex.cuticle, map: 'tri', scale: 150, bump: 1.6, objSpace: true });
  const legMat = gMaterial({ cls });
  const thinMat = gMaterial({ cls, thin: 1 });

  const body = new THREE.Group();
  const noto = new THREE.Mesh(G.noto, cut);
  body.add(noto);
  const aspis = new THREE.Group();
  aspis.position.set(...ANAT.hinge);
  aspis.add(new THREE.Mesh(G.aspis, cut));
  aspis.add(staticSetae(G.seta, G.aspSetae, thinMat));
  aspis.add(staticSetae(G.sensillus, G.sens, thinMat));
  body.add(aspis);
  body.add(staticSetae(G.seta, G.bodySetae, thinMat));
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
    const A = ANAT.legs[k];
    const sideIdx = side < 0 ? 0 : 1;
    legs.push({
      k, side,
      group: (k + sideIdx) % 2, // tetrapod: {L1 R2 L3 R4} and {R1 L2 R3 L4}
      off: ((k + sideIdx) % 2) * 0.5 + (3 - k) * 0.035, // metachronal wave, back to front
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
    mode: 'walk', // walk | closing | closed | opening
    pos: V3(0, 0, 0), up: V3(0, 1, 0), fwd: V3(1, 0, 0),
    speed: 0, omega: 0, phase: 0, t: 0, retract: 0, aspis: 0,
    center: V3(0, ANAT.stand, 0), q: new THREE.Quaternion(),
    vel: V3(), angVel: V3(), airborne: false,
    q0: new THREE.Quaternion(), c0: V3(), h0: 0, lastLand: 0,
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

  function plantAll() {
    for (const L of legs) {
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
    st.mode = 'walk'; st.retract = 0; st.aspis = 0; st.speed = 0;
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

  function walk(dt, input) {
    const r = right();
    let want = 0, turn = 0;
    if (input.mag > 0.01) {
      const d = input.dir.clone().addScaledVector(st.up, -input.dir.dot(st.up));
      if (d.lengthSq() < 0.05) d.addScaledVector(V3(0, 1, 0).addScaledVector(st.up, -st.up.y), 1); // on a wall: push = climb
      if (d.lengthSq() > 1e-6) {
        d.normalize();
        const ang = Math.atan2(new THREE.Vector3().crossVectors(st.fwd, d).dot(st.up), st.fwd.dot(d));
        const rate = 2.4;
        turn = clamp(ang, -rate * dt, rate * dt);
        want = input.maxSpeed * input.mag * sstep(-0.15, 0.75, Math.cos(ang));
      }
    }
    st.speed += (want - st.speed) * (1 - Math.exp(-dt / 0.18));
    st.omega = turn / dt;
    st.fwd.applyAxisAngle(st.up, turn).normalize();

    // wall ahead (taller than a step)?
    let step = st.speed * dt;
    const wall = colliders.cast(st.pos.clone().addScaledVector(st.up, 130), st.fwd, 300 + step);
    if (wall && wall.normal.dot(st.up) < 0.55) {
      const tgt = st.up.clone().lerp(wall.normal, 0.7).normalize();
      if (tgt.y > -0.2) st.up.lerp(tgt, 1 - Math.exp(-dt / 0.25)).normalize();
      st.fwd.addScaledVector(st.up, -st.fwd.dot(st.up)).normalize();
      if (wall.dist < 250) step = 0;
    }
    const prev = st.pos.clone();
    st.pos.addScaledVector(st.fwd, step);
    st.pos.x = clamp(st.pos.x, -HALF + 150, HALF - 150);
    st.pos.z = clamp(st.pos.z, -HALF + 150, HALF - 150);
    if (!settleBody(dt)) { st.pos.copy(prev); st.speed *= 0.5; }
    const fy = floorH(st.pos.x, st.pos.z);
    if (st.pos.y < fy) st.pos.y = fy;
    const moved = st.pos.distanceTo(prev);

    // gait phase advances with distance travelled (and turning), so stride matches speed
    let err = 0;
    for (const L of legs) if (!L.swing) err = Math.max(err, L.foot.distanceTo(restWorld(L, _x)));
    let dphi = (moved + Math.abs(turn) * 190) / ANAT.stride;
    if (dphi < 0.25 * dt && err > 22) dphi = 1.4 * dt; // shuffle feet back under the body when stopped
    const vBody = st.fwd.clone().multiplyScalar(moved / dt);
    for (const L of legs) {
      const before = st.phase + L.off;
      const after = before + dphi;
      if (!L.swing && (Math.floor(after) > Math.floor(before) || L.foot.distanceTo(restWorld(L, _x)) > ANAT.stride * 1.25)) {
        L.swing = true; L.s = 0; L.from.copy(L.foot);
        const sp = Math.max(st.speed, 50);
        L.dur = clamp(((1 - ANAT.duty) * ANAT.stride) / sp, 0.08, 0.26);
      }
    }
    st.phase += dphi;

    for (const L of legs) {
      if (!L.swing) continue;
      L.s = Math.min(1, L.s + dt / L.dur);
      // where the rest point will be at touchdown, plus half a stance ahead
      const rw = restWorld(L, new THREE.Vector3());
      const rel = rw.clone().sub(st.pos);
      const vFoot = vBody.clone().add(new THREE.Vector3().crossVectors(st.up, rel).multiplyScalar(st.omega));
      const tau = (1 - L.s) * L.dur;
      const ahead = (ANAT.duty * ANAT.stride * 0.5) / Math.max(vBody.length(), 45);
      const tgt = rw.addScaledVector(vFoot, tau + ahead);
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

  // the closed capsule: a rigid egg rolling, tipping and falling
  const GRAV = 2600;
  function physics(dt) {
    const { c, r } = ANAT.noto;
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

  // place every part for the current state
  function pose(dt) {
    let q, center;
    if (st.mode === 'walk' || st.mode === 'closing') {
      const bob = st.mode === 'walk' ? 2.5 * Math.sin(st.phase * Math.PI * 4) : 0;
      const sway = st.mode === 'walk' ? 0.02 * Math.sin(st.phase * Math.PI * 2) * Math.min(1, st.speed / 120) : 0;
      q = basisQ(st.fwd, st.up);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), sway));
      let h = ANAT.stand + bob;
      if (st.mode === 'closing') h = ANAT.stand + (st.h0 - ANAT.stand) * sstep(0.2, 1, st.t);
      center = st.pos.clone().addScaledVector(st.up, h);
      st.center.copy(center); st.q.copy(q);
    } else if (st.mode === 'opening') {
      const e = sstep(0, 0.75, st.t);
      q = st.q0.clone().slerp(basisQ(st.fwd, st.up), e);
      center = st.c0.clone().lerp(st.pos.clone().addScaledVector(st.up, ANAT.stand), sstep(0.15, 0.9, st.t));
      st.center.copy(center); st.q.copy(q);
    } else { q = st.q; center = st.center; }

    body.position.copy(center);
    body.quaternion.copy(q);
    aspis.rotation.z = ANAT.aspisOpen + (ANAT.aspisClosed - ANAT.aspisOpen) * st.aspis;

    // legs
    const rc = st.retract;
    const hide = rc > 0.97;
    segIM.count = hide ? 0 : 32; tarIM.count = clawIM.count = hide ? 0 : 8; setIM.count = hide ? 0 : setIM.instanceMatrix.count;
    if (!hide) {
      const U = V3(0, 1, 0).applyQuaternion(q);
      const shrink = 1 - 0.72 * rc;
      let si = 0;
      legs.forEach((L, i) => {
        const hipL = L.hip.clone().add(V3(-24 * rc, 46 * rc, -L.side * 18 * rc));
        const H = toWorld(hipL, center, q);
        let F = L.foot;
        if (rc > 0) F = L.foot.clone().lerp(toWorld(V3(L.hip.x - 30, L.hip.y + 20, L.hip.z * 0.4), center, q), sstep(0, 1, rc));
        const seg = L.seg.map((s) => s * shrink), rad = L.rad.map((s) => s * (1 - 0.3 * rc));
        const L1 = seg[1] + seg[2], L2 = seg[3] + seg[4];
        // trochanter: out from the hip, toward the foot, tilted up
        const tf = F.clone().sub(H); tf.addScaledVector(U, -tf.dot(U));
        if (tf.lengthSq() < 1) tf.copy(L.rest).applyQuaternion(q);
        const dirT = tf.normalize().addScaledVector(U, 0.55).normalize();
        const T = H.clone().addScaledVector(dirT, seg[0]);
        // two-bone IK, the knee (femur-genu) bent upward
        const D = F.clone().sub(T);
        const d = clamp(D.length(), Math.abs(L1 - L2) + 2, (L1 + L2) * 0.995);
        const Dn = D.normalize();
        const Fe = T.clone().addScaledVector(Dn, d);
        const b = U.clone().addScaledVector(Dn, -Dn.dot(U));
        if (b.lengthSq() < 1e-4) b.copy(dirT);
        b.normalize();
        const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
        const hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
        const K = T.clone().addScaledVector(Dn, a).addScaledVector(b, hh);
        const u1 = K.clone().sub(T).normalize();
        const Fm = T.clone().addScaledVector(u1, seg[1]);
        // tibia a little above the straight line, tarsus angled down to the foot
        const w2 = Fe.clone().sub(K).normalize();
        const bend = b.clone().addScaledVector(w2, -w2.dot(b)).normalize();
        const tib = w2.clone().multiplyScalar(Math.cos(0.2)).addScaledVector(bend, Math.sin(0.2)).normalize();
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
      setIM.count = si;
      for (const im of [segIM, tarIM, clawIM, setIM]) im.instanceMatrix.needsUpdate = true;
    }
  }

  function update(dt, input) {
    events.length = 0;
    const hold = input.hold;
    if (st.mode === 'walk') {
      if (hold) {
        st.mode = 'closing'; st.t = 0; st.speed = 0;
        const q = basisQ(st.fwd, st.up);
        const dl = st.up.clone().negate().applyQuaternion(q.clone().invert());
        st.h0 = -support(ANAT.noto.c, ANAT.noto.r, dl, new THREE.Vector3()).dot(dl) + 0;
        st.h0 = Math.abs(support(ANAT.noto.c, ANAT.noto.r, dl, new THREE.Vector3()).dot(dl));
      } else walk(dt, input);
    }
    if (st.mode === 'closing') {
      // a real phthiracaroid seals itself in about 0.1-0.15 s
      st.t = Math.min(1, st.t + dt / 0.16);
      st.retract = sstep(0, 0.7, st.t);
      st.aspis = sstep(0.25, 1, st.t);
      if (st.t >= 1) {
        st.mode = 'closed'; st.vel.set(0, 0, 0); st.angVel.set(0, 0, 0);
        pose(0);
        events.push('closed');
      }
    } else if (st.mode === 'closed') {
      physics(dt);
      if (!hold && !st.airborne && st.angVel.length() < 2.5) {
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
          for (const L of legs) { restWorld(L, L.to); const h = ground(L.to, st.up); if (h) L.to.copy(h.point); L.foot.copy(L.to); L.swing = false; }
          events.push('opening');
        }
      }
    } else if (st.mode === 'opening') {
      // reopening is slow and careful
      st.t = Math.min(1, st.t + dt / 0.9);
      st.aspis = 1 - sstep(0, 0.45, st.t);
      st.retract = 1 - sstep(0.3, 1, st.t);
      if (hold) { st.mode = 'closing'; st.t = 1 - st.retract; st.h0 = ANAT.stand; }
      else if (st.t >= 1) { st.mode = 'walk'; st.retract = 0; st.aspis = 0; plantAll(); events.push('opened'); }
    }
    pose(dt);
    return events;
  }

  return {
    body, update, place, legs, st,
    get center() { return st.center; },
    get mode() { return st.mode; },
    get speed() { return st.speed; },
    meshes: [body, segIM, tarIM, clawIM, setIM],
    setVisible(v) { for (const m of [body, segIM, tarIM, clawIM, setIM]) m.visible = v; },
  };
}
