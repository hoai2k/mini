// The way on and the way back, as things in the moss patch (Micro Zoom
// landmarks, see ../shared/embed.js and ../shared/landmark.js).
//
// Forward (the portal, to the amoeba's pool floor): the tip of a rim leaf (a
// broad Sphagnum leaf at the end of a spoke, on the portal ring) dips into the
// hollow pool. The pool is a slab of open water beyond the tip: its meniscus
// is a bright relief line in DIC where the film meets open water, a few green
// Paramecium bursaria swim in it (§2.6 of ../../design/zoom-chain-levels.md),
// and the shared golden sparkle (../shared/portal.js) hangs over the tip,
// dim and restless while Prionchulus guards it, bright once it is open. It is
// placed once a game, on the spoke of whoever first gets near the portal ring
// (main.js placePortal): until then there is nothing at any rim.
//
// Backdoor (up to the mite): the drier leaf axil by the start, where leaf A
// and leaf D leave the stem. The stem is drawn as a chain of capsules (their
// overlaps read as nodes). Standing within ~200 µm of either leaf's base is
// the backdoor zone, where Y means "go back". From the start it is ~0.5 mm
// to the left along leaf A.
import * as THREE from '../shared/vendor/three.module.min.js';
import { opticalMaterial, litMaterial } from './materials.js';
import { LAYER_SUBSTRATE, LAYER_SPECIMEN } from './world.js';

import { createPortalGlow } from '../shared/portal.js';

export const PORTAL_IN = 2.6; // the portal: this far back from the rim leaf's tip (on the portal ring)
const REACH = 1.7;            // reaching within this (along the leaf) of it goes through
const AXIL_U = 2.1;           // the backdoor zone: u below this on leaf A or D

function optMesh(geo, opt, lit, layer) {
  const o = opticalMaterial(opt), l = litMaterial(lit);
  const m = new THREE.Mesh(geo, o);
  m.userData = { opt: o, lit: l };
  m.layers.set(layer);
  m.frustumCulled = false;
  return m;
}

export class Landmarks {
  constructor(scene, world, opts = {}) {
    this.world = world;
    const [A, , , , D] = world.leaves;
    this.A = A; this.D = D;
    this.S = null;
    this.group = new THREE.Group();
    scene.add(this.group);
    // the portal's things, moved and shown by placeForward
    this.portalGroup = new THREE.Group();
    this.portalGroup.visible = false;
    this.group.add(this.portalGroup);
    // Green Paramecium bursaria (~120 µm, Chlorella symbionts) swimming in the pool.
    const pb = new THREE.SphereGeometry(1, 20, 12);
    pb.scale(0.62, 0.27, 0.3);
    this.swimmers = [0, 1, 2].map((k) => {
      const m = optMesh(pb, { dn: 0.045, absorb: [2.4, 0.55, 2.7] }, { color: 0x5f9a40, roughness: 0.5 }, LAYER_SPECIMEN);
      this.portalGroup.add(m);
      return { m, a: k * 2.1, r: 2.2 + k * 0.9, w: (k % 2 ? -1 : 1) * (0.32 + 0.08 * k), c: [0, -1.2 + k * 1.3], ph: k, dc: 1.6 + k * 0.8 };
    });
    // The golden sparkle: drawn on top of the microscope's picture (main.js
    // renders `overlay` after each view), not through the optics.
    this.overlay = new THREE.Scene();
    this.glow = createPortalGlow({ THREE, size: 2.2, height: 2.4, intensity: 1.5, beam: 14, beamWidth: 0.9, count: 90, pixelHeight: opts.pixelHeight });
    this.overlay.add(this.glow.group);
    this.glow.group.visible = false;

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

    /** Where the edge arrows point (forward: the portal, once placed). */
    this.forward = new THREE.Vector3();
    this.back = A.toWorld(0.9, 0, 0.1).add(D.toWorld(0.9, 0, 0.1)).multiplyScalar(0.5);
    this.t = 0;
  }

  /** Put the portal at rim leaf S's tip: the pool beyond it, the sparkle over it. */
  placeForward(S) {
    this.S = S;
    if (this.pool) { this.portalGroup.remove(this.pool); this.pool.geometry.dispose(); }
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
    const pool = this.pool || optMesh(geo, { dn: 0.33, absorb: [0.02, 0.01, 0.0] }, { color: 0x9fb8b0, opacity: 0.35, roughness: 0.1 }, LAYER_SUBSTRATE);
    pool.geometry = geo;
    pool.matrixAutoUpdate = false;
    pool.matrix.copy(S.matrix);
    this.portalGroup.add(pool);
    this.pool = pool;
    for (const s of this.swimmers) s.c[0] = S.len + s.dc;
    this.portalGroup.visible = true;
    this.forward.copy(S.toWorld(S.len - PORTAL_IN, 0, S.thick / 2 + 0.05));
    // the sparkle: on the tip, upright off the leaf
    const g = this.glow.group;
    g.position.copy(this.forward);
    g.quaternion.setFromUnitVectors(_up.set(0, 1, 0), S.N);
    g.visible = true;
  }
  /** No portal (a restart): nothing at any rim. */
  clearForward() { this.S = null; this.portalGroup.visible = false; this.glow.group.visible = false; }
  get placed() { return !!this.S; }

  /** The walker is at the portal (on the rim leaf's tip, either face). */
  atForward(w) { return !!this.S && w.leaf === this.S && w.u > this.S.len - PORTAL_IN - REACH; }
  /** The walker is in the axil (the backdoor zone). */
  atBack(w) { return (w.leaf === this.A || w.leaf === this.D) && w.u < AXIL_U; }

  /** Testing: where to put a walker for each zone: [leaf, side, u, v, hu, hv]. */
  spot(kind) {
    if (kind === 'forward') { const S = this.S || this.world.spokes[0].leaves.at(-1); return [S, 1, S.len - PORTAL_IN - 0.8, 0.2, 1, 0]; }
    return [this.A, 1, AXIL_U - 0.7, 0.3, -1, 0];
  }

  /** dt; camera and open (the guard is off) for the sparkle. */
  update(dt, camera = null, open = false) {
    this.t += dt;
    const S = this.S;
    if (!S) return;
    this.glow.setOpen(open);
    this.glow.update(dt, this.t, camera);
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
const _up = new THREE.Vector3();
