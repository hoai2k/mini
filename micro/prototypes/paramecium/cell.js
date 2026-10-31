// Paramecium, built from its anatomy (all lengths in µm). Two species:
// P. bursaria (the Level 3 protagonist: 85–150 µm, plump, green with
// symbiotic Chlorella, S27) and the larger, colourless P. caudatum (S07).
// The species is picked once at load (the Features choice reloads the page).
// Local frame: +x anterior, +y dorsal, −y ventral (oral side), +z the cell's
// left. The body is a slipper: blunt anterior, more pointed posterior,
// widest a little behind the middle; the oral groove runs obliquely from the
// anterior left down to the cytostome at mid-body.
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd, combine } from '../shared/sdf.js';
import { volumeMaterial, pointsMaterial } from './optics.js';
import { createStrands, KIND } from './strands.js';

export const SPECIES = {
  bursaria: { name: 'P. bursaria (green, 120 µm)', latin: 'Paramecium bursaria', L: 120, XM: -6, RMAX: 28, pA: 2.6, pP: 2.4, taper: 0.12, FLAT: 0.8, chlorella: 520 },
  caudatum: { name: 'P. caudatum (colourless, 230 µm)', latin: 'Paramecium caudatum', L: 230, XM: -20, RMAX: 31, pA: 3, pP: 1.8, taper: 0.22, FLAT: 0.86, chlorella: 0 },
};
export const FEATURE_KEY = 'paramecium.v3'; // v3: chase camera and the old speed by default again
/** The species chosen in the feature panel (or ?f=species:...), read once at load. */
function pickSpecies() {
  let v = null;
  try {
    const f = new URL(location.href).searchParams.get('f') || '';
    for (const part of f.split(',')) { const [k, x] = part.split(':'); if (k === 'species' && x) v = x; }
    if (!v) v = (JSON.parse(localStorage.getItem(`micro.features.${FEATURE_KEY}`) || '{}') || {}).species;
  } catch { /* private mode */ }
  return Object.keys(SPECIES).find((k) => SPECIES[k].name === v || k === v) || 'bursaria';
}
export const SPECIES_ID = pickSpecies();
const SP = SPECIES[SPECIES_ID];
export const LENGTH = SP.L; // bursaria 85–150 µm (S27); caudatum 200–260 µm (S07)
const HL = LENGTH / 2;
const K = LENGTH / 230; // scale of the caudatum-tuned anatomy
const FLAT = SP.FLAT; // dorsoventral flattening of the cross-section

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Outline: two superellipse halves joined at the widest point, 20 µm behind
// the middle. The anterior half (p = 3, tapering to about 0.78 of the width)
// ends bluntly; the posterior half (p = 1.8) is conical and narrowly rounded.
const XM = SP.XM, RMAX = SP.RMAX;
export const WIDTH = RMAX * 2;
/** Body radius (the z half-width) at axial position x. */
export function radiusAt(x) {
  if (x >= XM) {
    const s = Math.min(1, (x - XM) / (HL - XM));
    return RMAX * (1 - SP.taper * s * s) * Math.pow(Math.max(0, 1 - s ** SP.pA), 1 / SP.pA);
  }
  const s = Math.min(1, (XM - x) / (XM + HL));
  return RMAX * Math.pow(Math.max(0, 1 - s ** SP.pP), 1 / SP.pP);
}
const rawBody = (x, y, z) => Math.max(Math.hypot(y / FLAT, z) - radiusAt(x), Math.abs(x) - HL);

/** A point on the (uncarved) surface at axial x, angle a from ventral toward the left. */
function surf(x, a, inset = 0) {
  const r = radiusAt(x) + inset;
  return [x, -Math.cos(a) * r * FLAT, Math.sin(a) * r];
}

// The oral groove: from the anterior left (a ≈ 1.25 rad) to the ventral cytostome.
const GROOVE = [];
for (let i = 0; i <= 7; i++) {
  const k = i / 7;
  const x = (100 - k * 102) * K;
  const a = 1.25 * (1 - k) ** 1.3;
  const rad = (14 - 5.5 * k) * Math.sqrt(K) * (RMAX / 31);
  GROOVE.push({ x, a, rad, c: surf(x, a, rad * 0.12) });
}
export const MOUTH = new THREE.Vector3(...surf(-4 * K, 0, -6 * Math.sqrt(K))); // the cytostome, at the end of the buccal cavity

function bodyParts() {
  const parts = [{ id: 0, sdf: rawBody }];
  for (let i = 0; i < GROOVE.length - 1; i++) {
    const a = GROOVE[i], b = GROOVE[i + 1];
    parts.push({ id: 1, op: 'sub', blend: 5, sdf: sd.roundCone(a.c, b.c, a.rad, b.rad) });
  }
  // the buccal cavity, a deeper pocket where the groove ends
  const kb = Math.sqrt(K);
  parts.push({ id: 1, op: 'sub', blend: 4, sdf: sd.ellipsoid(surf(-2 * K, 0, 1), [17 * kb, 11 * kb, 9 * kb]) });
  return parts;
}

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function createCell() {
  const group = new THREE.Group();
  group.name = 'paramecium';
  const parts = bodyParts();
  const field = combine(parts);
  const geo = buildSdfMesh(parts, { min: [-HL - 6, -RMAX * FLAT - 4, -RMAX - 5], max: [HL + 6, RMAX * FLAT + 4, RMAX + 5], cell: Math.max(1.2, 1.8 * Math.sqrt(K)) });
  // aRef: the axis point under each vertex (for the chord trick); aUv: (t, angle/2π) for the pellicle.
  const pos = geo.attributes.position;
  const ref = new Float32Array(pos.count * 3), uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    ref[i * 3] = Math.max(-HL + 4, Math.min(HL - 4, x));
    uv[i * 2] = (x + HL) / LENGTH;
    uv[i * 2 + 1] = (Math.atan2(z, -y / FLAT) / (2 * Math.PI) + 1) % 1;
  }
  geo.setAttribute('aRef', new THREE.BufferAttribute(ref, 3));
  geo.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
  const bodyMat = volumeMaterial({ dn: 0.026, scatter: 1.0, absorb: SP.chlorella ? [0.0016, 0.0012, 0.0026] : [0.0011, 0.0016, 0.0032], pattern: 1, rimPow: 2.5 });
  bodyMat.uniforms.uLen.value = LENGTH;
  const body = new THREE.Mesh(geo, bodyMat);
  body.frustumCulled = false;
  group.add(body);

  // Project a point onto the real (carved) surface along the field gradient.
  const grad = (x, y, z) => {
    const e = 0.4;
    const g = [field(x + e, y, z) - field(x - e, y, z), field(x, y + e, z) - field(x, y - e, z), field(x, y, z + e) - field(x, y, z - e)];
    const l = Math.hypot(...g) || 1;
    return g.map((v) => v / l);
  };
  const toSurface = (p) => {
    for (let k = 0; k < 6; k++) {
      const d = field(...p), n = grad(...p);
      p = [p[0] - n[0] * d, p[1] - n[1] * d, p[2] - n[2] * d];
    }
    return { p, n: grad(...p) };
  };
  const tangentDir = (n, v) => { // project v onto the tangent plane
    const d = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
    const t = [v[0] - n[0] * d, v[1] - n[1] * d, v[2] - n[2] * d];
    const l = Math.hypot(...t) || 1;
    return t.map((c) => c / l);
  };
  const rotAbout = (v, n, ang) => { // rotate v about unit n
    const c = Math.cos(ang), s = Math.sin(ang);
    const cr = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
    const d = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
    return [0, 1, 2].map((i) => v[i] * c + cr[i] * s + n[i] * d * (1 - c));
  };

  // --- Cilia along kineties --------------------------------------------------
  // ≈100 kineties, 46 cilia each (≈4600; the real cell has ≈4000–5000, often
  // paired). 10 µm long (drawn 0.8 µm wide, really 0.25 µm). Kineties twist
  // slightly round the body; the stroke points posteriorly and obliquely to the
  // right, which rolls the cell to the left. The metachronal wave is a phase
  // offset along a diagonal, so waves sweep over the surface.
  const rand = rng(7);
  const cilia = [];
  const ROWS = SP.chlorella ? 90 : 100, PER = Math.round(46 * K);
  const surfaceSamples = [];
  for (let k = 0; k < ROWS; k++) {
    for (let j = 0; j < PER; j++) {
      const t = 0.015 + (j + 0.5 * (k % 2)) / PER * 0.97;
      const x = -HL + t * LENGTH;
      const a = (k / ROWS) * Math.PI * 2 + 0.45 * (t - 0.5);
      const { p, n } = toSurface(surf(x, a, 0));
      let D = tangentDir(n, [-1, 0, 0]);
      D = rotAbout(D, n, 0.32);
      const arc = a * 26;
      const phase = -(x / K * 0.85 + arc * 0.5) / 15 + rand() * 0.04;
      cilia.push({ base: p, normal: n, dir: D, length: 10 + rand() * 1.5, width: 0.8, phase, kind: KIND.CILIUM });
      surfaceSamples.push({ p, n });
    }
  }
  // Oral cilia: rows of longer, faster cilia lining the groove and the buccal cavity.
  for (let i = 0; i < GROOVE.length - 1; i++) {
    for (let q = 0; q < Math.round(14 * K + 4); q++) {
      const f = q / Math.round(14 * K + 4);
      const x = GROOVE[i].x + (GROOVE[i + 1].x - GROOVE[i].x) * f;
      const a = GROOVE[i].a + (GROOVE[i + 1].a - GROOVE[i].a) * f;
      for (const da of [-0.13, 0, 0.13]) {
        const { p, n } = toSurface(surf(x, a + da, -3));
        const D = tangentDir(n, [-1, 0, -0.3]);
        cilia.push({ base: p, normal: n, dir: D, length: 9, width: 0.9, phase: -x / 10 + da, kind: KIND.ORAL });
      }
    }
  }
  // Caudal tuft: about 20 longer cilia at the posterior pole, bent outward.
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2;
    const rr = 2 + rand() * 4;
    const { p, n } = toSurface([-HL + 1, Math.cos(ang) * rr * FLAT, Math.sin(ang) * rr]);
    const out = tangentDir([-1, 0, 0], [0, Math.cos(ang), Math.sin(ang)]);
    cilia.push({ base: p, normal: [-1, 0, 0].map((v, c) => v * 0.9 + n[c] * 0.1), dir: out, length: 17 + rand() * 5, width: 0.9, phase: rand(), kind: KIND.CAUDAL });
  }
  const ciliaS = createStrands(cilia, { segs: 6, dn: 0.03, scatter: 0.45 });
  group.add(ciliaS.mesh);

  // --- Trichocysts: a dense layer of spindles just below the pellicle -------
  const tri = [];
  for (let i = 0; i < Math.round(2600 * K); i++) {
    const t = 0.03 + rand() * 0.94;
    const x = -HL + t * LENGTH;
    const a = rand() * Math.PI * 2;
    const { p, n } = toSurface(surf(x, a, 0));
    const b = p.map((v, c) => v - n[c] * 4.8);
    tri.push({ base: b, normal: n, dir: [1, 0, 0], length: 3.6, width: 0.9, phase: 0, kind: KIND.DOCKED });
  }
  const triS = createStrands(tri, { segs: 1, dn: 0.05, scatter: 0.55 });
  group.add(triS.mesh);

  // --- Nuclei ---------------------------------------------------------------
  const sph = new THREE.SphereGeometry(1, 28, 18);
  const kn = SP.chlorella ? 0.62 : 1;
  const macroGeo = sph.clone().scale(24 * kn, 11.5 * kn, 13 * kn);
  const macro = new THREE.Mesh(macroGeo, volumeMaterial({ dn: 0.016, scatter: 0.45, absorb: [0.002, 0.002, 0.0025], centred: true }));
  macro.position.set(-6 * K, 4 * kn, -2);
  macro.rotation.z = 0.12;
  group.add(macro);
  const micro = new THREE.Mesh(sph, volumeMaterial({ dn: 0.022, scatter: 0.6, centred: true }));
  micro.scale.setScalar(SP.chlorella ? 3 : 4);
  micro.position.set(14 * K + 6 * kn, 11 * kn, -4);
  group.add(micro);

  // --- Contractile vacuoles, each with 8 radiating collecting canals --------
  const cvMat = volumeMaterial({ dn: -0.026, scatter: 0.9, centred: true, rimPow: 1.5 });
  const cvs = [60 * K, -62 * K].map((x, i) => {
    const r = radiusAt(x);
    const c = new THREE.Vector3(x, r * FLAT - 8 * Math.sqrt(K), i ? -3 : 3);
    const m = new THREE.Mesh(sph, cvMat);
    m.position.copy(c);
    group.add(m);
    return { c, mesh: m, offset: i * 0.5 };
  });
  const canalGeo = new THREE.SphereGeometry(1, 12, 8);
  const canals = new THREE.InstancedMesh(canalGeo, volumeMaterial({ dn: -0.022, scatter: 0.6, centred: true, rimPow: 1.5 }), 16);
  canals.frustumCulled = false;
  group.add(canals);

  const LOOP = [72 * K, 15 * (RMAX / 31) * (SP.chlorella ? 1.3 : 1), 30 * (RMAX / 31)];
  // --- Food vacuoles in cyclosis ---------------------------------------------
  const FV_MAX = 16;
  const fvMesh = new THREE.InstancedMesh(sph, volumeMaterial({ dn: 0.024, scatter: 0.9, absorb: [0.0025, 0.004, 0.008], centred: true }), FV_MAX);
  fvMesh.frustumCulled = false;
  group.add(fvMesh);
  const food = [];
  const loopPos = (u, rs, tilt, zoff, out) => {
    const a = LOOP[0] * rs, b = LOOP[1] * rs;
    const q = [Math.cos(u) * a, Math.sin(u) * b, zoff];
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    return out.set(q[0], q[1] * ct - q[2] * st, q[1] * st + q[2] * ct);
  };
  for (let i = 0; i < 6; i++) food.push({ u: -Math.PI / 2 - 1.1 * i, travelled: 1.1 * i, r: 4 + rand() * 3, rs: 0.6 + rand() * 0.25, tilt: rand() - 0.5, z: (rand() - 0.5) * 10, age: 10 });

  // --- Cytoplasmic granules and crystals, streaming ---------------------------
  const NG = Math.round(1500 * K * (SP.chlorella ? 0.6 : 1));
  const gPos = new Float32Array(NG * 4), gP = new Float32Array(NG * 4);
  for (let i = 0; i < NG; i++) {
    const crystal = i < 140;
    gPos.set([rand(), -(0.03 + rand() * 0.025), 0.15 + Math.sqrt(rand()) * 0.85, (rand() - 0.5) * 2.4], i * 4);
    gP.set([crystal ? 0.9 + rand() * 0.7 : 0.35 + rand() * 0.5, crystal ? 0.1 : 0.06, crystal ? 1.1 : 0.35, rand()], i * 4);
  }
  const quad = new THREE.PlaneGeometry(2, 2);
  const gGeo = new THREE.InstancedBufferGeometry();
  gGeo.index = quad.index; gGeo.attributes.position = quad.attributes.position;
  gGeo.setAttribute('iPos', new THREE.InstancedBufferAttribute(gPos, 4));
  gGeo.setAttribute('iP', new THREE.InstancedBufferAttribute(gP, 4));
  gGeo.instanceCount = NG;
  const gMat = pointsMaterial({ cyclosis: true, absorb: [0.0012, 0.0016, 0.0026], loop: LOOP });
  const granules = new THREE.Mesh(gGeo, gMat);
  granules.frustumCulled = false;
  group.add(granules);

  // --- Chlorella symbionts (P. bursaria): a few hundred green algae 5–6 µm
  // across filling the cytoplasm and riding the cyclosis (S27). Chlorophyll
  // absorbs red and blue, so the cell is green in brightfield.
  let chlorella = null, cMat = null;
  if (SP.chlorella) {
    const NC = SP.chlorella;
    const cPos = new Float32Array(NC * 4), cP = new Float32Array(NC * 4);
    for (let i = 0; i < NC; i++) {
      cPos.set([rand(), -(0.008 + rand() * 0.01), 0.3 + Math.sqrt(rand()) * 0.85, (rand() - 0.5) * 2.6], i * 4);
      cP.set([2.5 + rand() * 0.5, 0.045, 0.5, rand()], i * 4);
    }
    const cGeo = new THREE.InstancedBufferGeometry();
    cGeo.index = quad.index; cGeo.attributes.position = quad.attributes.position;
    cGeo.setAttribute('iPos', new THREE.InstancedBufferAttribute(cPos, 4));
    cGeo.setAttribute('iP', new THREE.InstancedBufferAttribute(cP, 4));
    cGeo.instanceCount = NC;
    cMat = pointsMaterial({ cyclosis: true, absorb: [0.11, 0.022, 0.12], loop: [LOOP[0] * 1.15, LOOP[1] * 1.25, LOOP[2] * 1.5] });
    chlorella = new THREE.Mesh(cGeo, cMat);
    chlorella.frustumCulled = false;
    group.add(chlorella);
  }

  // --------------------------------------------------------------------------
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), s3 = new THREE.Vector3();
  let cvClock = 0, cyc = 0;
  const cvState = [0, 0];
  const UP = new THREE.Vector3(0, 1, 0);

  const opts = { cyclosis: true, cv: true };
  const api = {
    opts, granules, chlorella, macro, micro, group, body, cilia: ciliaS, trichocysts: triS, surfaceSamples, food, species: SP,
    get foodCount() { return food.length; },
    /** A bacterium (or a few) reached the cytostome; every 10 makes a food vacuole. */
    ingested: 0,
    ingest(n = 10, size = 0) {
      api.ingested++;
      if (api.ingested % n === 0) {
        if (food.length >= FV_MAX) food.shift();
        // size: a prey item (a clump, a Chilomonas) makes a bigger vacuole that swells at the
        // cytostome, pinches off and rides the cyclosis round the cell, shrinking as it digests
        food.push({ u: -Math.PI / 2, travelled: 0, r: 1, rs: 0.55 + rand() * 0.3, tilt: rand() - 0.5, z: (rand() - 0.5) * 8, age: 0, max: size || 0 });
        return true;
      }
      return false;
    },
    /**
     * @param {number} dt
     * @param {{phase:number, amp:number, reverse:number, oral:number, hidden?:boolean}} s
     */
    update(dt, s) {
      const cu = ciliaS.mat.uniforms;
      cu.uPhase.value = s.phase; cu.uAmp.value = s.amp; cu.uReverse.value = s.reverse; cu.uOral.value = s.oral;
      // Cyclosis (sped up roughly fivefold so it reads in play).
      if (opts.cyclosis) cyc += dt;
      gMat.uniforms.uCyclosis.value = cyc;
      if (cMat) cMat.uniforms.uCyclosis.value = cyc;

      // Contractile vacuoles: canals swell, empty into the vacuole, the vacuole
      // swells and then empties through its pore (systole). Period 6 s, the two
      // vacuoles alternate half a cycle apart.
      if (opts.cv) cvClock += dt / 6;
      let ci = 0;
      cvs.forEach((cv, i) => {
        const p = (cvClock + cv.offset) % 1;
        const canalFill = smooth(0.0, 0.45, p) * (1 - smooth(0.5, 0.72, p));
        let vr = 1.2 + 6.8 * smooth(0.45, 0.88, p);
        if (p > 0.9) vr *= 1 - smooth(0.9, 0.95, p);
        cvState[i] = p;
        cv.mesh.scale.set(vr, vr * 0.85, vr);
        // 8 canals radiating in the plane under the dorsal pellicle
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2 + i * 0.2;
          const dir = v3.set(Math.cos(ang), 0, Math.sin(ang) * 1.1).normalize();
          const len = 9 + 3 * canalFill;
          const w = 0.9 + 2.0 * canalFill; // ampullae swell as they fill
          const c = dir.clone().multiplyScalar(len + vr * 0.6).add(cv.c);
          c.y -= 1.5;
          q4.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
          s3.set(len, w * 0.8, w);
          m4.compose(c, q4, s3);
          canals.setMatrixAt(ci++, m4);
        }
      });
      canals.instanceMatrix.needsUpdate = true;

      // Food vacuoles ride the cyclosis loop: posteriorly on the ventral side,
      // forward dorsally, and are egested at the cytoproct after ≈1.3 loops.
      for (let i = food.length - 1; i >= 0; i--) {
        const f = food[i];
        f.age += dt;
        const du = opts.cyclosis ? dt * (f.max && f.age < 0.6 ? 0.05 : 0.32) : 0;
        f.u -= du; f.travelled += du;
        if (f.max) f.r = f.age < 0.6 ? Math.min(f.max, f.r + dt * f.max * 2.5) : Math.max(4, f.max * (1 - 0.45 * Math.min(1, f.travelled / 6)));
        else f.r = Math.min(4 + (i % 3), f.r + dt * 3);
        if (f.travelled > Math.PI * 2 * 1.3) food.splice(i, 1);
      }
      for (let i = 0; i < FV_MAX; i++) {
        const f = food[i];
        if (!f) { m4.makeScale(0, 0, 0); fvMesh.setMatrixAt(i, m4); continue; }
        loopPos(f.u, f.rs, f.tilt, f.z, v3);
        m4.makeScale(f.r, f.r, f.r).setPosition(v3);
        fvMesh.setMatrixAt(i, m4);
      }
      fvMesh.instanceMatrix.needsUpdate = true;
      void UP;
    },
    get cvPhases() { return cvState.slice(); },
  };
  return api;
}
