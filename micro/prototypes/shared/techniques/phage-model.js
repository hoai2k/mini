// A T4-like tailed phage built from its anatomy, for the phage prototype
// (Level 6) and anyone who wants to borrow it. Units: 1 = 10 nm.
//
//  - Head: a prolate icosahedron ~120 × 86 nm (two icosahedral caps on an
//    elongated band of ten faces), studded with capsomer beads: gp23 hexamers
//    blue, the vertices green. Its DNA (~169 kbp) is a coaxial spool inside,
//    visible through a cutaway (a clipping plane facing the camera), a
//    translucent capsid, or not at all. The spool drains as the DNA leaves.
//  - Collar and six fibritin whiskers; a contractile sheath of 23 gp18 rings
//    that really contracts (98 → 42 nm long, 21 → 33 nm wide) and pulls the
//    head down, so the rigid inner tube (gp19) pokes out below the baseplate.
//  - A hexagonal baseplate of six wedges that opens into a star.
//  - Six long tail fibres (~160 nm, kinked at the knee), simulated in world
//    space as Verlet chains: they trail and sway in the water like weed, fold
//    back against the sheath with the knee at the whiskers, or reach out, and
//    their tips can be pinned to a surface for walking.
//  - Six short tail fibres folded under the plate that swing down on commit.
//
//   const t4 = createT4({ clip: true });
//   t4.addTo(scene);
//   each frame: t4.group.position/quaternion = ...; t4.set({ contract, star, fold, shortOut, dna });
//               t4.update(dt, t);
import * as THREE from '../vendor/three.module.min.js';
import { toonMaterial, inked, inkedInstanced } from './phage-goodsell.js';

export const T4 = {
  HEAD_LEN: 12, HEAD_W: 8.6, TAIL_EXT: 9.8, TAIL_CON: 4.2, SHEATH_R_EXT: 1.05, SHEATH_R_CON: 1.65,
  FIBRE_LEN: 16, FIBRE_NODES: 9, KNEE: 4, RINGS: 23, COLLAR: 0.7, PLATE: 1.0,
};
export const T4_COLORS = {
  capsid: '#6f9be0', capsidDeep: '#4f78c4', vertex: '#7fc79a', dna: '#a77ae0', collar: '#58b7d8', whisker: '#8fd6cf',
  sheath: '#e2bd55', sheath2: '#d3a843', tube: '#a7e0d6', plate: '#e98a3c', plate2: '#f0a649',
  fibre: '#ec8a3a', knee: '#f3c04a', tip: '#d8662c', short: '#f2b25a',
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => t * t * (3 - 2 * t);

/** The prolate icosahedron, vertex up (y). Flat faces. */
export function prolateIcosahedron(r = 4.8, e = 1.2) {
  const v = [[0, r + e, 0]];
  const ry = r / Math.sqrt(5), rr = (2 * r) / Math.sqrt(5);
  for (let k = 0; k < 5; k++) { const a = (k * 2 * Math.PI) / 5; v.push([rr * Math.cos(a), ry + e, rr * Math.sin(a)]); }
  for (let k = 0; k < 5; k++) { const a = ((k + 0.5) * 2 * Math.PI) / 5; v.push([rr * Math.cos(a), -ry - e, rr * Math.sin(a)]); }
  v.push([0, -r - e, 0]);
  const f = [];
  for (let k = 0; k < 5; k++) {
    const a = 1 + k, b = 1 + ((k + 1) % 5), c = 6 + k, d = 6 + ((k + 1) % 5);
    f.push([0, b, a], [a, b, c], [b, d, c], [11, c, d]);
  }
  return { verts: v, faces: f };
}

function polyGeometry({ verts, faces }) {
  const pos = [];
  for (const [a, b, c] of faces) pos.push(...verts[a], ...verts[b], ...verts[c]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  g.computeVertexNormals();
  return g;
}

/** Inner radius of the head at height y (head centred on 0), for the DNA spool. */
function headInnerRadius(y) {
  const ay = Math.abs(y);
  if (ay < 3.35) return 3.2;
  return Math.max(0.2, 3.2 * (6 - ay) / (6 - 3.35));
}

function dnaSpoolCurve() {
  const pts = [];
  let up = true;
  for (let layer = 0; layer < 5; layer++) {
    const R = 2.9 - layer * 0.55;
    const ys = up ? -4.9 : 4.9, ye = up ? 4.9 : -4.9;
    const turns = 10 - layer;
    const n = turns * 18;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const y = lerp(ys, ye, s);
      const a = s * turns * 2 * Math.PI + layer * 0.9;
      const r = Math.min(R, headInnerRadius(y) - 0.45);
      pts.push(new THREE.Vector3(Math.max(0.2, r) * Math.cos(a), y, Math.max(0.2, r) * Math.sin(a)));
    }
    up = !up;
  }
  return new THREE.CatmullRomCurve3(pts);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

export function createT4({ clip = true } = {}) {
  const group = new THREE.Group();
  group.name = 'T4';
  const headGroup = new THREE.Group();
  group.add(headGroup);
  const clipPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6)];

  // --- head ---
  const icos = prolateIcosahedron();
  const headMat = toonMaterial({ color: T4_COLORS.capsidDeep, clip, side: THREE.DoubleSide, mottle: 0.1 });
  const head = inked(polyGeometry(icos), headMat, { clip });
  const capsMat = toonMaterial({ color: '#ffffff', clip, mottle: 0.12 });
  const bumpGeo = new THREE.IcosahedronGeometry(0.7, 1);
  // capsomer beads on each face
  const capPts = [];
  const N = 5;
  const V = icos.verts.map((a) => new THREE.Vector3(...a));
  for (const [a, b, c] of icos.faces) {
    const A = V[a], B = V[b], C = V[c];
    const nrm = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N - i; j++) {
      const k = N - i - j;
      if ((i === N || j === N || k === N)) continue; // vertices: added once below
      const p = new THREE.Vector3().addScaledVector(A, i / N).addScaledVector(B, j / N).addScaledVector(C, k / N).addScaledVector(nrm, 0.12);
      capPts.push(p);
    }
  }
  for (const p of V) capPts.push(p.clone().multiplyScalar(1.01));
  const caps = inkedInstanced(bumpGeo, capsMat, capPts.length, { clip, width: 0.45, color: '#253a6a' });
  const cBlue = new THREE.Color(T4_COLORS.capsid), cGreen = new THREE.Color(T4_COLORS.vertex);
  capPts.forEach((p, i) => {
    let dmin = 1e9; for (const q of V) dmin = Math.min(dmin, p.distanceTo(q));
    const green = dmin < 1.35;
    _c.copy(green ? cGreen : cBlue).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.08);
    caps.setColorAt(i, _c);
    _m.compose(p, _q.identity(), _s.setScalar(green ? 0.95 : 0.8 + Math.random() * 0.2));
    caps.setMatrixAt(i, _m);
  });
  caps.instanceMatrix.needsUpdate = true;
  head.add(caps);
  // DNA spool
  const dnaGeo = new THREE.TubeGeometry(dnaSpoolCurve(), 1100, 0.33, 5, false);
  const dnaMat = toonMaterial({ color: T4_COLORS.dna, mottle: 0.08 });
  const dna = inked(dnaGeo, dnaMat, { width: 0.5 });
  const dnaIndexCount = dnaGeo.index.count;
  head.add(dna);
  // cracks (UV damage)
  const crackMat = toonMaterial({ color: '#1a0f0a', clip });
  const cracks = [];
  for (let k = 0; k < 5; k++) {
    const pts = [];
    let a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 6;
    for (let i = 0; i < 14; i++) {
      a += (Math.random() - 0.5) * 0.5; y += (Math.random() - 0.5) * 1.4 + (k % 2 ? 0.5 : -0.5);
      y = Math.max(-5.4, Math.min(5.4, y));
      const r = headInnerRadius(y) + 1.25;
      pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.16, 4, false);
    const m = new THREE.Mesh(g, crackMat);
    m.userData.count = g.index.count;
    g.setDrawRange(0, 0);
    head.add(m); cracks.push(m);
  }
  headGroup.add(head);
  // collar, portal, whiskers
  const collar = inked(new THREE.CylinderGeometry(1.95, 1.55, T4.COLLAR, 12), toonMaterial({ color: T4_COLORS.collar }));
  headGroup.add(collar);
  const tube = inked(new THREE.CylinderGeometry(0.45, 0.45, 10.8, 10), toonMaterial({ color: T4_COLORS.tube }), { width: 0.6 });
  headGroup.add(tube);
  const whiskGeo = new THREE.IcosahedronGeometry(0.24, 0);
  const whiskers = inkedInstanced(whiskGeo, toonMaterial({ color: T4_COLORS.whisker }), 6 * 9, { width: 0.6 });
  headGroup.add(whiskers);

  // --- sheath ---
  const ringGeo = new THREE.TorusGeometry(0.72, 0.4, 6, 12);
  ringGeo.rotateX(Math.PI / 2);
  const sheath = inkedInstanced(ringGeo, toonMaterial({ color: '#ffffff', mottle: 0.1 }), T4.RINGS, { width: 0.8 });
  for (let i = 0; i < T4.RINGS; i++) sheath.setColorAt(i, _c.set(i % 2 ? T4_COLORS.sheath : T4_COLORS.sheath2));
  group.add(sheath);

  // --- baseplate ---
  const plate = new THREE.Group();
  group.add(plate);
  const hub = inked(new THREE.CylinderGeometry(1.25, 1.5, 1.1, 6), toonMaterial({ color: T4_COLORS.plate }));
  hub.position.y = 0.55;
  plate.add(hub);
  const wedgeGeo = new THREE.BoxGeometry(1.5, 0.95, 1.25);
  const wedges = [];
  for (let k = 0; k < 6; k++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (k * Math.PI) / 3 + Math.PI / 6;
    const w = inked(wedgeGeo, toonMaterial({ color: k % 2 ? T4_COLORS.plate2 : T4_COLORS.plate }));
    pivot.add(w);
    plate.add(pivot);
    wedges.push(w);
  }
  // short tail fibres (gp12)
  const shortGeo = new THREE.IcosahedronGeometry(0.3, 0);
  const shorts = inkedInstanced(shortGeo, toonMaterial({ color: T4_COLORS.short }), 6 * 7, { width: 0.6 });
  group.add(shorts);

  // --- long tail fibres (world space) ---
  const NODES = T4.FIBRE_NODES, SEG = T4.FIBRE_LEN / (NODES - 1);
  const BPS = 4; // beads per segment
  const perFibre = (NODES - 1) * BPS + 1;
  const beadGeo = new THREE.IcosahedronGeometry(1, 1);
  const fibreMesh = inkedInstanced(beadGeo, toonMaterial({ color: '#ffffff', mottle: 0.1 }), 6 * perFibre, { width: 0.6 });
  const beadR = [], beadC = [];
  for (let f = 0; f < 6; f++) for (let i = 0; i < perFibre; i++) {
    const seg = Math.floor(i / BPS), sub = i % BPS;
    let r = seg < T4.KNEE ? 0.42 : 0.37, c = T4_COLORS.fibre;
    if (sub === 0 && seg > 0) { r += 0.12; c = T4_COLORS.plate2; }
    if (seg === T4.KNEE && sub === 0) { r = 0.66; c = T4_COLORS.knee; }
    if (i === perFibre - 1) { r = 0.78; c = T4_COLORS.tip; }
    beadR.push(r); beadC.push(c);
    fibreMesh.setColorAt(f * perFibre + i, _c.set(c));
  }
  const fibres = [];
  for (let f = 0; f < 6; f++) {
    fibres.push({
      angle: (f * Math.PI) / 3 + Math.PI / 6,
      nodes: Array.from({ length: NODES }, () => new THREE.Vector3()),
      prev: Array.from({ length: NODES }, () => new THREE.Vector3()),
      target: Array.from({ length: NODES }, () => new THREE.Vector3()),
      anchor: null, // world point the tip is bound to (walking, clay)
      phase: Math.random() * 100,
      reach: 0,
    });
  }

  const state = { contract: 0, star: 0, fold: 0, shortOut: 0, dna: 1, dark: 0, crack: 0, capsid: 'cutaway', sway: 1, reachDir: new THREE.Vector3() };
  const geom = { L: T4.TAIL_EXT, R: T4.SHEATH_R_EXT, headBottom: 0, headCenter: 0, plateR: 1.75 };

  function layout() {
    const c = ease(clamp01(state.contract));
    geom.L = lerp(T4.TAIL_EXT, T4.TAIL_CON, c);
    geom.R = lerp(T4.SHEATH_R_EXT, T4.SHEATH_R_CON, c);
    const top = T4.PLATE + geom.L;
    headGroup.position.y = top - (T4.PLATE + T4.TAIL_EXT); // the head moves down as the sheath shortens
    collar.position.y = T4.PLATE + T4.TAIL_EXT + T4.COLLAR / 2;
    geom.headBottom = T4.PLATE + T4.TAIL_EXT + T4.COLLAR;
    head.position.y = geom.headBottom + 6 - 0.3;
    geom.headCenter = head.position.y + headGroup.position.y;
    tube.position.y = geom.headBottom - T4.COLLAR - 10.8 / 2 + 0.4;
    // sheath rings
    for (let i = 0; i < T4.RINGS; i++) {
      const y = T4.PLATE + ((i + 0.5) / T4.RINGS) * geom.L;
      const s = geom.R / T4.SHEATH_R_EXT;
      _m.compose(_p.set(0, y, 0), _q.setFromAxisAngle(UP, i * 0.3 * (1 + c * 0.5)), _s.set(s, lerp(1.0, 0.62, c), s));
      sheath.setMatrixAt(i, _m);
    }
    sheath.instanceMatrix.needsUpdate = true;
    // baseplate: hexagon -> star
    const st = ease(clamp01(state.star));
    geom.plateR = lerp(1.75, 2.75, st);
    for (const w of wedges) {
      w.position.set(geom.plateR, lerp(0.5, 0.25, st), 0);
      w.scale.set(lerp(1, 1.45, st), lerp(1, 0.75, st), lerp(1, 0.6, st));
      w.rotation.z = lerp(0, -0.28, st);
    }
    // short fibres: folded under the plate, or down and out to bind
    const so = ease(clamp01(state.shortOut));
    for (let f = 0; f < 6; f++) {
      const a = (f * Math.PI) / 3;
      const d = _v.set(Math.cos(a), 0, -Math.sin(a));
      for (let i = 0; i < 7; i++) {
        const s = i / 6;
        const rf = lerp(1.7, 0.7, s) , yf = lerp(0.05, -0.35, s) - Math.sin(s * Math.PI) * 0.25;
        const ro = lerp(1.9, 3.0, s), yo = lerp(0.0, -3.1, s);
        _p.copy(d).multiplyScalar(lerp(rf, ro, so)); _p.y = lerp(yf, yo, so);
        _m.compose(_p, _q.identity(), _s.setScalar(i === 6 ? 1.35 : 1));
        shorts.setMatrixAt(f * 7 + i, _m);
      }
    }
    shorts.instanceMatrix.needsUpdate = true;
    // whiskers from the collar, out and down
    for (let f = 0; f < 6; f++) {
      const a = (f * Math.PI) / 3 + 0.3;
      for (let i = 0; i < 9; i++) {
        const s = i / 8;
        _p.set(Math.cos(a) * (1.9 + s * 2.4), geom.headBottom - 0.4 - s * 2.2 + Math.sin(s * 3) * 0.3, Math.sin(a) * (1.9 + s * 2.4));
        _m.compose(_p, _q.identity(), _s.setScalar(1));
        whiskers.setMatrixAt(f * 9 + i, _m);
      }
    }
    whiskers.instanceMatrix.needsUpdate = true;
    // DNA spool drains as the genome leaves; the head darkens and cracks under UV
    dnaGeo.setDrawRange(0, Math.floor((dnaIndexCount * clamp01(state.dna)) / 3) * 3);
    headMat.uniforms.uDark.value = state.dark * 0.85;
    capsMat.uniforms.uDark.value = state.dark * 0.85;
    for (const m of cracks) m.geometry.setDrawRange(0, Math.floor((m.userData.count * clamp01(state.crack)) / 3) * 3);
  }

  function setCapsid(mode) {
    state.capsid = mode;
    const translucent = mode === 'translucent';
    for (const m of [headMat, capsMat]) {
      m.uniforms.uOpacity.value = translucent ? 0.32 : 1;
      m.transparent = translucent; m.depthWrite = !translucent; m.needsUpdate = true;
    }
    head.ink.material.uniforms.uOpacity.value = translucent ? 0.35 : 1;
    head.ink.material.transparent = translucent; head.ink.material.needsUpdate = true;
    caps.ink.visible = !translucent;
    dna.visible = mode !== 'solid';
    const planes = mode === 'cutaway' ? clipPlanes : [];
    for (const m of [headMat, capsMat, head.ink.material, caps.ink.material, crackMat]) { m.clippingPlanes = planes; m.needsUpdate = true; }
  }
  setCapsid('cutaway');

  // fibre pose in the phage frame, by fibre index and node
  function poseLocal(f, i, t, out) {
    const fb = fibres[f];
    const a = fb.angle;
    const d = _w.set(Math.cos(a), 0, -Math.sin(a));
    const R = geom.plateR + 0.55;
    const fold = clamp01(state.fold * 1.25 - (i / NODES) * 0.25);
    // extended: out and a little up to the knee, then down to the tip
    const rx = d.x * R, rz = d.z * R, ry = 0.75;
    const reach = fb.reach;
    const kOut = 0.92 + reach * 0.1, kUp = 0.36 - reach * 0.3;
    const kx = rx + d.x * 8 * kOut, ky = ry + 8 * kUp, kz = rz + d.z * 8 * kOut;
    const tOut = 0.5 + reach * 0.45, tDown = -0.86 + reach * 0.5;
    const tx = kx + d.x * 8 * tOut, ty = ky + 8 * tDown, tz = kz + d.z * 8 * tOut;
    // folded: up along the sheath with the knee at the whiskers, the distal half back down
    const fy = T4.PLATE + geom.L * 0.92;
    const fkx = d.x * 2.6, fky = fy, fkz = d.z * 2.6;
    const ftx = d.x * 3.5, fty = fy - 7.2, ftz = d.z * 3.5;
    let ex, ey, ez, gx, gy, gz;
    if (i <= T4.KNEE) {
      const s = i / T4.KNEE, bow = Math.sin(s * Math.PI) * 0.8;
      ex = lerp(rx, kx, s) + d.x * bow; ey = lerp(ry, ky, s) + bow * 0.4; ez = lerp(rz, kz, s) + d.z * bow;
      gx = lerp(rx, fkx, s) + d.x * bow * 0.4; gy = lerp(ry, fky, s); gz = lerp(rz, fkz, s) + d.z * bow * 0.4;
    } else {
      const s = (i - T4.KNEE) / (NODES - 1 - T4.KNEE), bow = Math.sin(s * Math.PI) * 0.7;
      ex = lerp(kx, tx, s) + d.x * bow; ey = lerp(ky, ty, s); ez = lerp(kz, tz, s) + d.z * bow;
      gx = lerp(fkx, ftx, s) + d.x * bow * 0.6; gy = lerp(fky, fty, s); gz = lerp(fkz, ftz, s) + d.z * bow * 0.6;
    }
    out.set(lerp(ex, gx, fold), lerp(ey, gy, fold), lerp(ez, gz, fold));
    // seaweed sway, growing toward the tip
    const sw = state.sway * (i / (NODES - 1)) * (1 - fold * 0.7) * 0.9;
    const ph = fb.phase;
    out.x += Math.sin(t * 1.1 + ph + i * 0.6) * sw;
    out.y += Math.sin(t * 0.9 + ph * 1.3 + i * 0.5) * sw * 0.8;
    out.z += Math.sin(t * 1.3 + ph * 0.7 + i * 0.4) * sw;
    return out;
  }

  const rootWorld = (f, out) => { poseLocal(f, 0, 0, out); return out.applyMatrix4(group.matrixWorld); };

  function resetFibres(t = 0) {
    group.updateMatrixWorld(true);
    for (let f = 0; f < 6; f++) for (let i = 0; i < NODES; i++) {
      poseLocal(f, i, t, fibres[f].nodes[i]).applyMatrix4(group.matrixWorld);
      fibres[f].prev[i].copy(fibres[f].nodes[i]);
    }
  }

  function simulate(dt, t) {
    const damp = Math.exp(-dt * 7);
    for (let f = 0; f < 6; f++) {
      const fb = fibres[f];
      const n = fb.nodes, pv = fb.prev;
      for (let i = 0; i < NODES; i++) poseLocal(f, i, t, fb.target[i]).applyMatrix4(group.matrixWorld);
      n[0].copy(fb.target[0]); pv[0].copy(n[0]);
      for (let i = 1; i < NODES; i++) {
        const k = i <= T4.KNEE ? 16 : 7;
        _v.subVectors(n[i], pv[i]).multiplyScalar(damp);
        pv[i].copy(n[i]);
        n[i].add(_v).addScaledVector(_w.subVectors(fb.target[i], n[i]), 1 - Math.exp(-k * dt));
      }
      if (fb.anchor) n[NODES - 1].lerp(fb.anchor, 1 - Math.exp(-dt * 25));
      for (let it = 0; it < 4; it++) {
        for (let i = 0; i < NODES - 1; i++) {
          const a = n[i], b = n[i + 1];
          _v.subVectors(b, a);
          const len = _v.length() || 1e-6;
          const diff = (len - SEG) / len;
          const wa = i === 0 ? 0 : 0.5, wb = (fb.anchor && i + 1 === NODES - 1) ? 0.15 : (i === 0 ? 1 : 0.5);
          a.addScaledVector(_v, diff * wa);
          b.addScaledVector(_v, -diff * wb);
        }
      }
    }
  }

  function draw() {
    let k = 0;
    for (let f = 0; f < 6; f++) {
      const n = fibres[f].nodes;
      for (let s = 0; s < NODES - 1; s++) for (let j = 0; j < BPS; j++) {
        _p.lerpVectors(n[s], n[s + 1], j / BPS);
        _m.compose(_p, _q.identity(), _s.setScalar(beadR[k % perFibre]));
        fibreMesh.setMatrixAt(k++, _m);
      }
      _m.compose(n[NODES - 1], _q.identity(), _s.setScalar(beadR[perFibre - 1]));
      fibreMesh.setMatrixAt(k++, _m);
    }
    fibreMesh.instanceMatrix.needsUpdate = true;
  }

  const api = {
    group, fibres, fibreMesh, geom, state, head, headGroup, materials: { headMat, capsMat },
    NODES, SEG,
    addTo(scene) { scene.add(group); scene.add(fibreMesh); },
    removeFrom(scene) { scene.remove(group); scene.remove(fibreMesh); },
    set(o) { Object.assign(state, o); if (o.capsid && o.capsid !== api._capsid) { api._capsid = o.capsid; setCapsid(o.capsid); } },
    /** Clip the camera-facing half of the capsid (cutaway): pass the camera position. */
    setCutFrom(camPos) {
      head.getWorldPosition(_p);
      _v.subVectors(camPos, _p).normalize();
      clipPlanes[0].setFromNormalAndCoplanarPoint(_w.copy(_v).negate(), _p.addScaledVector(_v, 2.4));
    },
    /** Centre of the head in world space. */
    headWorld(out = new THREE.Vector3()) { return head.getWorldPosition(out); },
    /** The phage axis (baseplate -> head) in world space. */
    axisWorld(out = new THREE.Vector3()) { return out.copy(UP).applyQuaternion(group.quaternion); },
    tip(f) { return fibres[f].nodes[NODES - 1]; },
    /** Where the tip of fibre f wants to be (the extended pose), in world space. */
    footTarget(f, t, out = new THREE.Vector3()) { poseLocal(f, NODES - 1, t, out); return out.applyMatrix4(group.matrixWorld); },
    rootWorld,
    resetFibres,
    update(dt, t) {
      layout();
      group.updateMatrixWorld(true);
      simulate(dt, t);
      draw();
    },
  };
  api._capsid = 'cutaway';
  layout();
  resetFibres();
  draw();
  return api;
}

// --- a light T4 for crowds (progeny bursts): one merged geometry with vertex colours ---
function colored(g, color) {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return geo;
}
function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return m;
}

/** One merged T4 geometry (origin at the baseplate, +y to the head), legs out. */
export function t4LiteGeometry() {
  const parts = [];
  const head = polyGeometry(prolateIcosahedron());
  head.translate(0, 1 + 9.8 + 0.7 + 5.7, 0);
  parts.push(colored(head, T4_COLORS.capsid));
  const sh = new THREE.CylinderGeometry(1.15, 1.15, 9.8, 8, 6); sh.translate(0, 1 + 4.9, 0);
  parts.push(colored(sh, T4_COLORS.sheath));
  const co = new THREE.CylinderGeometry(1.9, 1.5, 0.7, 10); co.translate(0, 1 + 9.8 + 0.35, 0);
  parts.push(colored(co, T4_COLORS.collar));
  const bp = new THREE.CylinderGeometry(2.2, 2.4, 1.0, 6); bp.translate(0, 0.5, 0);
  parts.push(colored(bp, T4_COLORS.plate));
  for (let f = 0; f < 6; f++) {
    const a = (f * Math.PI) / 3 + Math.PI / 6;
    const d = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const root = d.clone().multiplyScalar(2.3).setY(0.7);
    const knee = root.clone().addScaledVector(d, 7.3).setY(3.6);
    const tip = knee.clone().addScaledVector(d, 4).setY(-3.2);
    for (const [p, q] of [[root, knee], [knee, tip]]) {
      const len = p.distanceTo(q);
      const c = new THREE.CylinderGeometry(0.42, 0.42, len, 5);
      c.translate(0, len / 2, 0);
      c.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, q.clone().sub(p).normalize())));
      c.translate(p.x, p.y, p.z);
      parts.push(colored(c, T4_COLORS.fibre));
    }
  }
  return merge(parts);
}
