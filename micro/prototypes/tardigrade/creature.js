// A eutardigrade (Macrobiotus/Hypsibius type), about 350 µm long, built from
// anatomical parts with the shared SDF mesher and rigged by part on the CPU.
//
// Body frame: x forward (mouth at +x), y dorsal, z to the animal's left.
// Units: 1 = 100 µm.
//
// Anatomy (see README for sources):
// - head and four trunk regions, smoothly joined, with faint transverse folds
//   in the cuticle (the "segmented look": tardigrades are not externally
//   segmented, the folds mark the leg-bearing regions);
// - four pairs of stubby unjointed lobopod legs: pairs I-III ventrolateral,
//   pair IV terminal and pointing backwards;
// - each leg ends in two double claws (a primary and a secondary branch on a
//   common base), Hypsibius-like, the outer claw larger. Drawn 1.6x longer
//   and about 3x thicker than true so they survive the mesh and the screen;
// - inside, seen through the cuticle: mouth ring, buccal tube, a pair of
//   stylets, the muscular pharyngeal bulb with its placoids, two eyespots,
//   the midgut (coloured by what was eaten), the gonad, and free-floating
//   storage cells in the body cavity.
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd } from '../shared/sdf.js';
import { opticalMaterial, litMaterial } from './materials.js';
import { LAYER_SPECIMEN } from './world.js';

// Leg pairs: hip (inside the body) and ground point (claw base) at rest.
export const PAIRS = [
  { hip: [0.86, -0.2, 0.36], ground: [1.02, -0.64, 0.62] },
  { hip: [0.22, -0.22, 0.42], ground: [0.26, -0.64, 0.7] },
  { hip: [-0.44, -0.22, 0.42], ground: [-0.48, -0.64, 0.7] },
  { hip: [-1.1, -0.16, 0.24], ground: [-1.66, -0.54, 0.36] },
];
export const LEGS = [];
for (let p = 0; p < 4; p++) for (let s = 0; s < 2; s++) {
  const m = s === 0 ? 1 : -1;
  const [hx, hy, hz] = PAIRS[p].hip, [gx, gy, gz] = PAIRS[p].ground;
  LEGS.push({ index: p * 2 + s, pair: p, side: m, hip: new THREE.Vector3(hx, hy, hz * m), ground: new THREE.Vector3(gx, gy, gz * m), name: `${['I', 'II', 'III', 'IV'][p]}${s === 0 ? 'L' : 'R'}` });
}
export const BODY_HEIGHT = 0.66; // body origin above the leaf surface
const LEG_ID = (i) => 10 + i;

/** Elliptic ring around the x axis: a fold groove in the cuticle. */
function ringX(cx, cy, ry, rz, r) {
  const rm = Math.min(ry, rz);
  // Only above the leg bases, so the folds never cut into the legs.
  return (x, y, z) => Math.max(Math.hypot((Math.hypot((y - cy) / ry, z / rz) - 1) * rm, x - cx) - r, -0.12 - y);
}

function bodyParts() {
  const P = [];
  P.push({ id: 0, sdf: sd.ellipsoid([1.18, 0.02, 0], [0.5, 0.44, 0.46]) });
  P.push({ id: 0, sdf: sd.roundCone([1.36, -0.02, 0], [1.72, -0.1, 0], 0.3, 0.13), blend: 0.12 });
  P.push({ id: 1, sdf: sd.ellipsoid([0.6, 0.07, 0], [0.56, 0.53, 0.57]), blend: 0.2 });
  P.push({ id: 2, sdf: sd.ellipsoid([-0.04, 0.09, 0], [0.56, 0.55, 0.6]), blend: 0.2 });
  P.push({ id: 3, sdf: sd.ellipsoid([-0.66, 0.06, 0], [0.52, 0.52, 0.56]), blend: 0.2 });
  P.push({ id: 4, sdf: sd.ellipsoid([-1.16, 0.0, 0], [0.44, 0.43, 0.44]), blend: 0.2 });
  for (const L of LEGS) {
    const foot = L.ground.clone().add(new THREE.Vector3(0, 0.12, 0));
    const r0 = L.pair === 3 ? 0.19 : 0.21;
    P.push({ id: LEG_ID(L.index), sdf: sd.roundCone(L.hip.toArray(), foot.toArray(), r0, 0.135), blend: 0.13 });
    // A slight bulge of the foot (the "sole" the claws sit on).
    P.push({ id: LEG_ID(L.index), sdf: sd.ellipsoid(foot.clone().add(new THREE.Vector3(0, -0.02, 0)).toArray(), [0.14, 0.11, 0.14]), blend: 0.06 });
  }
  // Cuticle folds between the leg-bearing regions.
  for (const [cx, ry, rz] of [[0.93, 0.47, 0.5], [0.3, 0.57, 0.6], [-0.36, 0.57, 0.6], [-0.93, 0.5, 0.52]]) {
    P.push({ id: 99, op: 'sub', sdf: ringX(cx, 0.07, ry, rz, 0.06), blend: 0.045 });
  }
  // Mouth opening.
  P.push({ id: 99, op: 'sub', sdf: sd.sphere([1.82, -0.11, 0], 0.075), blend: 0.03 });
  return P;
}

/** Double claw pair for one foot; claw frame: x distal, y away from the surface, z lateral (+ = outer). */
function clawParts(mirror) {
  const P = [];
  const m = mirror ? -1 : 1;
  const branch = (pts, r0, r1, id) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
      P.push({ id, sdf: sd.roundCone(pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1), blend: 0.004 });
    }
  };
  for (const [zc, k] of [[0.04, 1.0], [-0.04, 0.82]]) { // outer claw larger (Hypsibius-like asymmetry)
    const z = zc * m;
    const s = (x, y, dz = 0) => [x * k, y * k, z + dz * m];
    // common base
    branch([s(-0.01, 0.03), s(0.03, 0.0)], 0.024, 0.018, 0);
    // primary branch: long, arching distally, then hooking down to a point
    branch([s(0.03, 0.0), s(0.1, 0.02, 0.006), s(0.17, -0.01, 0.01), s(0.2, -0.07, 0.012), s(0.185, -0.11, 0.012)], 0.016, 0.0085, 0);
    // secondary branch: shorter, hooking more steeply
    branch([s(0.03, 0.0), s(0.08, -0.02, -0.01), s(0.11, -0.06, -0.014), s(0.1, -0.09, -0.014)], 0.014, 0.0085, 0);
  }
  return P;
}

function merge(geos) {
  let n = 0;
  const pos = [], idx = [];
  for (const g of geos) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    const ix = g.index ? g.index.array : [...Array(p.length / 3).keys()];
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + n);
    n += p.length / 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  return out;
}

const q = new THREE.Quaternion(), va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();

export class Creature {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    parent.add(this.group);
    this.meshes = [];
    this.pose = {
      phase: 0, sway: 0, bob: 0, surge: 0, tun: 0, stylet: 0, pump: 0, wrinkle: 0, breath: 0,
      feet: LEGS.map((L) => L.ground.clone()),
      footN: LEGS.map(() => new THREE.Vector3(0, 1, 0)),
      clawOpen: LEGS.map(() => 0),
    };
    this.gutAbs = new THREE.Vector3(0.5, 0.45, 0.7);

    // Body (with legs): the SDF mesh.
    const geo = buildSdfMesh(bodyParts(), { min: [-2.0, -0.92, -1.02], max: [2.0, 0.76, 1.02], cell: 0.03 });
    this.body = this.addPart('cuticle and body', geo, { dn: 0.04, absorb: [0.05, 0.08, 0.18] }, { color: 0xeadfc6, opacity: 0.55, roughness: 0.4 });
    this.restBody = geo.attributes.position.array.slice();

    // Internals, all deformed with the trunk.
    this.internals = [];
    const I = (name, g, opt, lit, extra = {}) => {
      const m = this.addPart(name, g, opt, lit);
      const rec = { mesh: m, rest: g.attributes.position.array.slice(), ...extra };
      this.internals.push(rec);
      return rec;
    };
    I('buccal tube', buildSdfMesh([
      { id: 0, sdf: sd.capsule([1.74, -0.1, 0], [1.1, -0.03, 0], 0.034) },
      { id: 1, op: 'sub', sdf: sd.capsule([1.8, -0.105, 0], [1.05, -0.025, 0], 0.016) },
    ], { min: [1.0, -0.18, -0.06], max: [1.84, 0.04, 0.06], cell: 0.008 }), { dn: 0.09, absorb: [0.3, 0.45, 0.8] }, { color: 0xd8c08a });
    // Mouth ring (peribuccal ring of cuticle).
    I('mouth ring', buildSdfMesh([{ id: 0, sdf: (x, y, z) => Math.hypot(Math.hypot(y + 0.105, z) - 0.07, (x - 1.76) * 1.0) - 0.02 }],
      { min: [1.68, -0.21, -0.11], max: [1.84, 0.0, 0.11], cell: 0.008 }), { dn: 0.07, absorb: [0.2, 0.3, 0.6] }, { color: 0xd8c08a });
    this.stylets = I('stylets', buildSdfMesh([
      { id: 0, sdf: sd.roundCone([1.62, -0.095, 0.022], [1.16, -0.05, 0.13], 0.011, 0.016) },
      { id: 0, sdf: sd.roundCone([1.62, -0.095, -0.022], [1.16, -0.05, -0.13], 0.011, 0.016) },
      // stylet supports
      { id: 0, sdf: sd.capsule([1.2, -0.05, 0.13], [1.14, -0.08, 0.06], 0.01) },
      { id: 0, sdf: sd.capsule([1.2, -0.05, -0.13], [1.14, -0.08, -0.06], 0.01) },
    ], { min: [1.08, -0.14, -0.17], max: [1.67, 0.0, 0.17], cell: 0.007 }), { dn: 0.11, absorb: [0.5, 0.7, 1.2] }, { color: 0xc9a46a }, { slide: true });
    this.bulb = I('pharyngeal bulb', buildSdfMesh([{ id: 0, sdf: sd.ellipsoid([0.98, -0.03, 0], [0.17, 0.14, 0.14]) }],
      { min: [0.76, -0.2, -0.17], max: [1.2, 0.14, 0.17], cell: 0.016 }), { dn: 0.035, absorb: [0.1, 0.12, 0.2] }, { color: 0xe6d0a6 }, { pump: [0.98, -0.03, 0] });
    const plac = [];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
      const y = -0.03 + Math.sin(a) * 0.045, z = Math.cos(a) * 0.045;
      plac.push({ id: 0, sdf: sd.capsule([0.9, y, z], [0.96, y, z], 0.014) });
      plac.push({ id: 0, sdf: sd.capsule([1.0, y, z], [1.05, y, z], 0.014) });
      plac.push({ id: 0, sdf: sd.sphere([1.09, y, z], 0.011) }); // microplacoid
    }
    this.placoids = I('placoids', buildSdfMesh(plac, { min: [0.85, -0.1, -0.08], max: [1.12, 0.04, 0.08], cell: 0.006 }),
      { dn: 0.1, absorb: [0.4, 0.6, 1.1] }, { color: 0xb08850 }, { pump: [0.98, -0.03, 0] });
    for (const s of [1, -1]) {
      const e = new THREE.SphereGeometry(0.036, 12, 9);
      e.translate(1.3, 0.15, 0.2 * s);
      I(`eyespot ${s > 0 ? 'L' : 'R'}`, e, { dn: 0.02, absorb: [9, 10, 11] }, { color: 0x1a1410 });
    }
    // Midgut: lobed, filling much of the body; colour comes from food.
    const gutParts = [];
    for (let k = 0; k < 6; k++) {
      const x = 0.68 - k * 0.32;
      gutParts.push({ id: 0, sdf: sd.ellipsoid([x, 0.0 + 0.04 * Math.sin(k * 2.1), 0.03 * Math.cos(k * 1.7)], [0.22, 0.27 - Math.abs(k - 2.5) * 0.02, 0.3 - Math.abs(k - 2.5) * 0.02]), blend: 0.14 });
    }
    this.gut = I('midgut', buildSdfMesh(gutParts, { min: [-1.1, -0.35, -0.38], max: [0.98, 0.35, 0.38], cell: 0.035 }),
      { dn: 0.02, absorb: [0.5, 0.45, 0.7] }, { color: 0x8d9a4a, opacity: 0.9 });
    I('gonad', buildSdfMesh([{ id: 0, sdf: sd.ellipsoid([-0.62, 0.3, 0], [0.36, 0.12, 0.2]) }],
      { min: [-1.02, 0.14, -0.24], max: [-0.22, 0.46, 0.24], cell: 0.03 }), { dn: 0.018, absorb: [0.08, 0.1, 0.16] }, { color: 0xe6d8b8 });
    // Storage cells (coelomocytes) floating in the body cavity.
    const cells = [];
    let s = 3;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    while (cells.length < 80) {
      const x = -1.4 + r() * 2.6, y = -0.45 + r() * 0.9, z = -0.55 + r() * 1.1;
      const bodyIn = (x / 1.42) ** 2 + ((y - 0.05) / 0.37) ** 2 + (z / 0.43) ** 2 < 1;
      const gutIn = ((x + 0.12) / 0.95) ** 2 + (y / 0.3) ** 2 + (z / 0.33) ** 2 < 1;
      if (!bodyIn || gutIn) continue;
      const g = new THREE.SphereGeometry(0.022 + r() * 0.018, 8, 6);
      g.translate(x, y, z);
      cells.push(g);
    }
    I('storage cells', merge(cells), { dn: 0.03, absorb: [0.15, 0.2, 0.35] }, { color: 0xf0e2c0 });

    // Claws: one mesh per foot, left and right mirrored at build time (a
    // mirrored matrix would flip the faces and so the sign of the thickness).
    const cg = [false, true].map((mir) => buildSdfMesh(clawParts(mir), { min: [-0.05, -0.14, -0.09], max: [0.24, 0.07, 0.09], cell: 0.0045 }));
    this.claws = LEGS.map((L) => {
      const g = cg[(L.side > 0) !== (L.pair === 3) ? 0 : 1]; // keep the larger claw outermost
      const m = this.addPart(`claws ${L.name}`, g, { dn: 0.12, absorb: [0.9, 1.4, 2.6] }, { color: 0xb8925a, roughness: 0.3 });
      m.matrixAutoUpdate = false;
      return m;
    });

    this.anchors = {
      'claws (double, enhanced)': { leg: 0 },
      'leg IV (terminal, backwards)': { leg: 7, offset: [0, 0.12, 0] },
      'buccal tube + stylets': { rest: [1.45, -0.07, 0] },
      'pharyngeal bulb': { rest: [0.98, -0.03, 0] },
      eyespot: { rest: [1.3, 0.15, 0.2] },
      'midgut (food colour)': { rest: [-0.2, 0.05, 0] },
      'storage cells': { rest: [-1.0, 0.25, 0.3] },
    };
    this.deformAll();
  }

  addPart(name, geo, opt, lit) {
    const optMat = opticalMaterial(opt);
    const litMat = litMaterial(lit);
    const mesh = new THREE.Mesh(geo, optMat);
    mesh.name = name;
    mesh.userData = { opt: optMat, lit: litMat };
    mesh.layers.set(LAYER_SPECIMEN);
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }

  setGut(abs) { this.gut.mesh.userData.opt.uniforms.uAbs.value.copy(abs); this.gut.mesh.userData.lit.color.setRGB(Math.exp(-abs.x * 0.8), Math.exp(-abs.y * 0.8), Math.exp(-abs.z * 0.8)); }

  /** Trunk deformation: tun contraction, cuticle wrinkles, lateral sway, bob. */
  bodyDeform(x, y, z, o) {
    const P = this.pose, T = P.tun;
    let X = x * (1 - 0.43 * T);
    let Y = y, Z = z;
    // Tun: shorter, rounder at the ends, a little smaller in section as water leaves.
    const sec = (1 - 0.16 * T) * (1 - 0.07 * T * (0.5 + 0.5 * Math.cos(x * 17))); // deepening folds
    Y = (Y - 0.05) * sec + 0.05;
    Z *= sec * (1 + 0.04 * T);
    Y -= 0.17 * T; // settle onto the leaf as the legs pull in
    // Soft body: lateral wave travelling back along the trunk, breathing, bob, surge.
    const w = 1 - T;
    Z += w * P.sway * Math.sin(P.phase * Math.PI * 2 - 1.4 * x) * (0.6 + 0.25 * Math.abs(x));
    Y += w * (P.bob + 0.012 * Math.sin(P.breath) * (y + 0.5));
    X += w * P.surge * (0.5 + 0.5 * Math.cos((x - 1.7) * 0.9));
    o.set(X, Y, Z);
    return o;
  }

  /** Per-leg transform this frame: hip moves with the trunk, the leg stretches/turns to the foot. */
  legFrames() {
    const P = this.pose;
    return LEGS.map((L, i) => {
      const H1 = this.bodyDeform(L.hip.x, L.hip.y, L.hip.z, new THREE.Vector3());
      const a0 = L.ground.clone().sub(L.hip);
      const l0 = a0.length();
      a0.normalize();
      // Tun: the leg is drawn into the body.
      const target = P.feet[i].clone().lerp(H1.clone().addScaledVector(a0, l0 * 0.12), P.tun);
      const a1 = target.sub(H1);
      const l1 = Math.max(0.02, a1.length());
      a1.normalize();
      const rot = new THREE.Quaternion().setFromUnitVectors(a0, a1);
      const s = l1 / l0;
      const ps = THREE.MathUtils.clamp(1 / Math.sqrt(s), 0.8, 1.15) * (1 - 0.25 * P.tun);
      return { H0: L.hip, H1, a0, rot, s, ps, foot: H1.clone().addScaledVector(a1, l1) };
    });
  }

  deformAll() {
    const frames = this.legFrames();
    this.frames = frames;
    const geo = this.body.geometry;
    const pos = geo.attributes.position.array, rest = this.restBody;
    const part = geo.attributes.part.array, part2 = geo.attributes.part2.array, w = geo.attributes.partW.array;
    const o1 = va, o2 = vb;
    const T = (id, x, y, z, o) => {
      if (id < 10) return this.bodyDeform(x, y, z, o);
      const F = frames[id - 10];
      o.set(x - F.H0.x, y - F.H0.y, z - F.H0.z);
      const a = o.dot(F.a0);
      o.addScaledVector(F.a0, -a).multiplyScalar(F.ps).addScaledVector(F.a0, a * F.s);
      return o.applyQuaternion(F.rot).add(F.H1);
    };
    for (let i = 0, n = pos.length / 3; i < n; i++) {
      const x = rest[3 * i], y = rest[3 * i + 1], z = rest[3 * i + 2];
      const p1 = part[i], p2 = part2[i], wt = w[i];
      T(p1, x, y, z, o1);
      if (p2 !== p1 && wt < 0.999 && (p1 >= 10 || p2 >= 10)) {
        T(p2, x, y, z, o2);
        o1.multiplyScalar(wt).addScaledVector(o2, 1 - wt);
      }
      pos[3 * i] = o1.x; pos[3 * i + 1] = o1.y; pos[3 * i + 2] = o1.z;
    }
    geo.attributes.position.needsUpdate = true;

    const P = this.pose;
    for (const rec of this.internals) {
      const g = rec.mesh.geometry, p = g.attributes.position.array, r = rec.rest;
      for (let i = 0, n = p.length / 3; i < n; i++) {
        let x = r[3 * i], y = r[3 * i + 1], z = r[3 * i + 2];
        if (rec.slide) x += P.stylet * 0.16;
        if (rec.pump) {
          const k = 1 + 0.14 * P.pump;
          y = rec.pump[1] + (y - rec.pump[1]) * k; z = rec.pump[2] + (z - rec.pump[2]) * k;
        }
        this.bodyDeform(x, y, z, o1);
        p[3 * i] = o1.x; p[3 * i + 1] = o1.y; p[3 * i + 2] = o1.z;
      }
      g.attributes.position.needsUpdate = true;
    }

    // Claws at each foot, hooking along the foot's distal direction.
    LEGS.forEach((L, i) => {
      const F = frames[i];
      const n = P.footN[i];
      const d = vc.copy(F.foot).sub(F.H1);
      d.addScaledVector(n, -d.dot(n));
      if (d.lengthSq() < 1e-6) d.set(L.pair === 3 ? -1 : 0.3, 0, L.side);
      d.normalize();
      // Legs I-III point their claws forward-out, leg IV backwards.
      const m = this.claws[i].matrix;
      m.makeBasis(d, n, new THREE.Vector3().crossVectors(d, n));
      const open = P.clawOpen[i];
      m.multiply(new THREE.Matrix4().makeRotationZ(open * 0.7));
      const sc = 1 - 0.55 * P.tun;
      m.multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
      m.setPosition(F.foot.x, F.foot.y + 0.015, F.foot.z);
      this.claws[i].matrixWorldNeedsUpdate = true;
    });
  }

  /** Recompute normals (only the lit look needs them). */
  refreshNormals() {
    for (const m of this.meshes) if (!this.claws.includes(m)) m.geometry.computeVertexNormals();
  }

  anchorWorld(name, out = new THREE.Vector3()) {
    const a = this.anchors[name];
    if (a.leg !== undefined) {
      out.copy(this.frames[a.leg].foot);
      if (a.offset) out.add(va.set(...a.offset));
    } else this.bodyDeform(a.rest[0], a.rest[1], a.rest[2], out);
    return out.applyMatrix4(this.group.matrixWorld);
  }
}
