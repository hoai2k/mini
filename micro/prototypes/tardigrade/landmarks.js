// The way on and the way back, as things in the moss patch (Micro Zoom
// landmarks, see ../shared/embed.js and ../shared/landmark.js).
//
// Forward (to the amoeba's pool floor): the tip of the Sphagnum leaf below
// dips into the hollow pool. The pool is a slab of open water beyond the tip:
// its meniscus is a bright relief line in DIC where the film meets open
// water, and a few green Paramecium bursaria swim past in it (§2.6 of
// ../../design/zoom-chain-levels.md). Reaching the last ~250 µm of that leaf,
// on either face, is the landmark.
//
// Backdoor (up to the mite): the drier leaf axil above, where leaf A and
// leaf D leave the stem. The stem is drawn as a chain of capsules (their
// overlaps read as nodes). Standing within ~200 µm of either leaf's base is
// the backdoor zone, where Y means "go back".
//
// Placement: from the start (leaf A, 650 µm from its base) the backdoor is
// ~0.5 mm to the left along leaf A (about 30 s of walking), the pool tip
// ~1 mm to the right, down onto the Sphagnum leaf (15-40 s, more with the
// detours and the Milnesium). They lie in opposite directions.
import * as THREE from '../shared/vendor/three.module.min.js';
import { opticalMaterial, litMaterial } from './materials.js';
import { LAYER_SUBSTRATE, LAYER_SPECIMEN } from './world.js';

const TIP_U = 12.4;   // the forward zone: u beyond this on the Sphagnum leaf
const AXIL_U = 2.1;   // the backdoor zone: u below this on leaf A or D

function optMesh(geo, opt, lit, layer) {
  const o = opticalMaterial(opt), l = litMaterial(lit);
  const m = new THREE.Mesh(geo, o);
  m.userData = { opt: o, lit: l };
  m.layers.set(layer);
  m.frustumCulled = false;
  return m;
}

export class Landmarks {
  constructor(scene, world) {
    this.world = world;
    const [A, , , S, D] = world.leaves;
    this.S = S; this.A = A; this.D = D;
    this.group = new THREE.Group();
    scene.add(this.group);

    // --- the pool beyond the Sphagnum leaf's tip -------------------------------
    // In the leaf's own frame: a slab whose shore is a curve round the tip
    // (the tip dips in), with a rounded (bevelled) edge for the meniscus.
    const shape = new THREE.Shape();
    const u0 = S.len - 2.2, R = 26;
    shape.moveTo(u0 + 0.12 * 9 * 9, -9);
    for (let i = -9; i <= 9; i += 0.5) shape.lineTo(u0 + 0.12 * i * i, i);
    shape.lineTo(u0 + R, 9 + 6);
    shape.lineTo(u0 + R, -9 - 6);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.55, bevelSegments: 5, curveSegments: 1 });
    geo.translate(0, 0, -0.55 - 0.22 + S.thick / 2 + 0.12); // the surface just over the leaf's upper face
    const pool = optMesh(geo, { dn: 0.33, absorb: [0.02, 0.01, 0.0] }, { color: 0x9fb8b0, opacity: 0.35, roughness: 0.1 }, LAYER_SUBSTRATE);
    pool.matrixAutoUpdate = false;
    pool.matrix.copy(S.matrix);
    this.group.add(pool);
    this.pool = pool;

    // Green Paramecium bursaria (~120 µm, Chlorella symbionts) swimming in it.
    const pb = new THREE.SphereGeometry(1, 20, 12);
    pb.scale(0.62, 0.27, 0.3);
    this.swimmers = [0, 1, 2].map((k) => {
      const m = optMesh(pb, { dn: 0.045, absorb: [2.4, 0.55, 2.7] }, { color: 0x5f9a40, roughness: 0.5 }, LAYER_SPECIMEN);
      this.group.add(m);
      return { m, a: k * 2.1, r: 2.2 + k * 0.9, w: (k % 2 ? -1 : 1) * (0.32 + 0.08 * k), c: [S.len + 1.6 + k * 0.8, -1.2 + k * 1.3], ph: k };
    });

    // --- the stem and the leaf axil ---------------------------------------------
    const pts = [[-6.6, -3.3, 3.4], [-7.1, -1.6, 2.0], [-8.3, -0.05, 0.15], [-8.1, 1.3, -1.3], [-7.7, 3.2, -3.0]].map((p) => new THREE.Vector3(...p));
    const stemMats = { opt: { dn: 0.035, absorb: [0.55, 0.75, 1.15] }, lit: { color: 0x8a7a4a, roughness: 0.7 } };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
      const g = new THREE.CapsuleGeometry(0.42, len, 6, 16);
      const m = optMesh(g, stemMats.opt, stemMats.lit, LAYER_SUBSTRATE);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      this.group.add(m);
    }

    /** Where the edge arrows point. */
    this.forward = S.toWorld(S.len - 1.2, 0, 0.1);
    this.back = A.toWorld(0.9, 0, 0.1).add(D.toWorld(0.9, 0, 0.1)).multiplyScalar(0.5);
    this.t = 0;
  }

  /** The walker is at the pool tip. */
  atForward(w) { return w.leaf === this.S && w.u > TIP_U; }
  /** The walker is in the axil (the backdoor zone). */
  atBack(w) { return (w.leaf === this.A || w.leaf === this.D) && w.u < AXIL_U; }

  /** Testing: where to put a walker for each zone: [leaf, side, u, v, hu, hv]. */
  spot(kind) {
    return kind === 'forward' ? [this.S, 1, TIP_U + 0.9, 0.2, 1, 0] : [this.A, 1, AXIL_U - 0.7, 0.3, -1, 0];
  }

  update(dt) {
    this.t += dt;
    const S = this.S;
    for (const s of this.swimmers) {
      s.a += s.w * dt;
      const u = s.c[0] + Math.cos(s.a) * s.r, v = s.c[1] + Math.sin(s.a) * s.r * 0.8;
      S.toWorld(u, v, -0.05 + 0.04 * Math.sin(this.t * 0.7 + s.ph), s.m.position);
      // heading along the path, rolling slowly about the long axis
      const du = -Math.sin(s.a) * s.r * Math.sign(s.w), dv = Math.cos(s.a) * s.r * 0.8 * Math.sign(s.w);
      const f = S.dirWorld(du, dv).normalize();
      const z = new THREE.Vector3().crossVectors(f, S.N).normalize();
      s.m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, S.N, z));
      s.m.rotateX(this.t * 1.3 + s.ph);
    }
  }
}
