// The way on and the way back, as things in the moss patch (Micro Zoom
// landmarks, see ../shared/embed.js and ../shared/landmark.js).
//
// Forward (the portal, to the amoeba's pool floor): the tip of a rim leaf (a
// broad Sphagnum leaf at the end of a spoke, on the portal ring) dips into the
// hollow pool. The pool is a slab of open water beyond the tip: its meniscus
// is a bright relief line in DIC where the film meets open water, a few green
// Paramecium bursaria swim in it (§2.6 of ../../design/zoom-chain-levels.md),
// an Amoeba proteus crawls on its floor a little way out (the next world's
// creature: the glimpse the transition pushes in on), and the shared golden
// sparkle (../shared/portal.js) hangs over the tip, dim and restless while
// Prionchulus guards it, bright once it is open. It is placed by the
// encounter director at the rim of the spoke whoever leads is heading out
// along (main.js placePortal): until then there is nothing at any rim.
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
import { OPENING } from '../shared/amoeba-opening.js';

export const PORTAL_IN = 2.6; // the portal: this far back from the rim leaf's tip (on the portal ring)
/**
 * The amoeba in the pool: its length in a pose (units of 100 µm), the amoeba
 * world's creature's (its cell is a disc of 344 µm across at the start: a
 * pose's `len` there is 2 √(A0/π)), and where it crawls (leaf u past the tip, v).
 */
export const AMOEBA_LEN = 3.44;
const AMOEBA_AT = { du: 3.4, v: 1.4 };
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
    // Amoeba proteus on the pool floor (~340 µm): a flattened, granular cell
    // pushing out three blunt pseudopods, a nucleus and a contractile vacuole
    // inside (the glimpse of the next world; the amoeba world's own cell at the
    // same size). Its local +x is its heading; the group sits in the leaf plane.
    this.amoeba = this.buildAmoeba();
    this.portalGroup.add(this.amoeba.group);
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
    this.leave = 0;
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
    // the amoeba on the pool floor a little way out, heading back toward the tip
    const am = this.amoeba;
    am.leaf = S;
    S.toWorld(S.len + AMOEBA_AT.du, AMOEBA_AT.v, S.thick / 2 - 0.2, am.group.position);
    am.center.copy(am.group.position);
    am.setHeading(Math.atan2(-S.U.z, -S.U.x) + 0.6);
    this.portalGroup.visible = true;
    this.forward.copy(S.toWorld(S.len - PORTAL_IN, 0, S.thick / 2 + 0.05));
    // the sparkle: on the tip, upright off the leaf
    const g = this.glow.group;
    g.position.copy(this.forward);
    g.quaternion.setFromUnitVectors(_up.set(0, 1, 0), S.N);
    g.visible = true;
  }
  /**
   * The glimpsed amoeba: the amoeba world's own cell as it opens
   * (../shared/amoeba-opening.js, generated from that world's warm-up), so the
   * transition crossfades one cell into the same cell: its outline with the
   * long pseudopods, a flattened cell thickest in the middle and thin out
   * along the arms, the darker granular cortex round its edge, the nucleus
   * and the contractile vacuole where they are there. Local +x is its heading
   * (the slide's y there, up the screen), +z the slide's x, +y off the leaf.
   */
  buildAmoeba() {
    const group = new THREE.Group();
    const k = AMOEBA_LEN / (2 * Math.sqrt(OPENING.area / Math.PI)); // µm -> units (the pose's len is the starting disc's)
    const ol = OPENING.outline, n = ol.length / 2;
    const P = (i) => [ol[2 * (i % n) + 1] * k, ol[2 * (i % n)] * k]; // [local x, local z]
    // how far a point is inside the membrane (units): the cell is thickest where it is broad
    const inside = (x, z) => {
      let d = Infinity;
      for (let i = 0; i < n; i++) {
        const [ax, az] = P(i), [bx, bz] = P(i + 1), ex = bx - ax, ez = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
        d = Math.min(d, Math.hypot(x - ax - ex * t, z - az - ez * t));
      }
      return d;
    };
    // a fan of rings out to the membrane, an upper and a lower face, from a
    // point every bit of the membrane can be seen from (so no ring folds over:
    // the optics take the thickness between front and back faces)
    let F = null;
    for (let cx = -60; cx <= 60; cx += 4) for (let cy = -60; cy <= 60; cy += 4) {
      let mn = Infinity;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const d = Math.atan2(ol[2 * j + 1] - cy, ol[2 * j] - cx) - Math.atan2(ol[2 * i + 1] - cy, ol[2 * i] - cx);
        mn = Math.min(mn, Math.atan2(Math.sin(d), Math.cos(d)));
      }
      if (!F || mn > F.mn) F = { mn, x: cy * k, z: cx * k };
    }
    const RINGS = 14, H = 0.5, D = 1.1;
    const pos = [], idx = [];
    const rim = (t) => 1 - Math.pow(1 - t, 1.6);
    for (const side of [1, -1]) {
      const c0 = pos.length / 3;
      pos.push(F.x, side * H * Math.sqrt(Math.min(1, inside(F.x, F.z) / D)) * (side > 0 ? 1 : 0.55), F.z);
      for (let j = 1; j <= RINGS; j++) {
        const t = rim(j / RINGS);
        for (let i = 0; i < n; i++) {
          const [x, z] = P(i), px = F.x + (x - F.x) * t, pz = F.z + (z - F.z) * t;
          const h = j === RINGS ? 0 : H * Math.sqrt(Math.min(1, inside(px, pz) / D));
          pos.push(px, side * h * (side > 0 ? 1 : 0.55), pz);
        }
      }
      const at = (j, i) => (j === 0 ? c0 : c0 + 1 + (j - 1) * n + (i % n));
      for (let j = 0; j < RINGS; j++) for (let i = 0; i < n; i++) {
        const a = at(j, i), b = at(j, i + 1), c = at(j + 1, i), d = at(j + 1, i + 1);
        const tri = (p, q, r) => (side > 0 ? idx.push(p, q, r) : idx.push(p, r, q)); // outward: the optics take the thickness between front and back faces
        if (j === 0) tri(a, c, d); else { tri(a, c, d); tri(a, d, b); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // (in brightfield there the cell is an olive grey, its cortex darker with granules)
    group.add(optMesh(g, { dn: 0.03, absorb: [0.48, 0.52, 0.78] }, { color: 0xa9a283, roughness: 0.55 }, LAYER_SPECIMEN));
    // the granular cortex: a thin band just inside the membrane on the upper
    // face, a lens across (closed: its two faces meet at both edges)
    const band = [], bi = [], T0 = 0.86;
    for (const up of [true, false]) {
      const o = band.length / 3;
      for (let j = 0; j <= 4; j++) {
        const t = T0 + ((0.99 - T0) * j) / 4, lift = 0.01 + (up ? 0.05 * Math.sin((Math.PI * j) / 4) : 0);
        for (let i = 0; i < n; i++) {
          const [x, z] = P(i), px = F.x + (x - F.x) * t, pz = F.z + (z - F.z) * t;
          band.push(px, lift + H * Math.sqrt(Math.min(1, inside(px, pz) / D)), pz);
        }
      }
      for (let j = 0; j < 4; j++) for (let i = 0; i < n; i++) {
        const a = o + j * n + i, b = o + j * n + ((i + 1) % n), c = a + n, d = b + n;
        if (up) bi.push(a, c, d, a, d, b); else bi.push(a, d, c, a, b, d);
      }
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(band, 3));
    bg.setIndex(bi);
    bg.computeVertexNormals();
    group.add(optMesh(bg, { dn: 0.01, absorb: [5, 5.3, 6.2] }, { color: 0x6f6a55, roughness: 0.6 }, LAYER_SPECIMEN));
    const nu = OPENING.nucleus, cv = OPENING.vacuole;
    const nuc = new THREE.SphereGeometry(1, 20, 10); nuc.scale(nu.r * k * 1.1, 0.16, nu.r * k); nuc.translate(nu.y * k, 0.05, nu.x * k);
    group.add(optMesh(nuc, { dn: 0.05, absorb: [0.7, 0.75, 0.85] }, { color: 0x9c977f, roughness: 0.5 }, LAYER_SPECIMEN));
    const vac = new THREE.SphereGeometry(1, 16, 8); vac.scale(cv.r * k, 0.12, cv.r * k); vac.translate(cv.y * k, 0.06, cv.x * k);
    group.add(optMesh(vac, { dn: -0.03, absorb: [0.02, 0.02, 0.02] }, { color: 0xe4e8d8, roughness: 0.2 }, LAYER_SPECIMEN));
    const am = { group, center: new THREE.Vector3(), heading: 0, len: AMOEBA_LEN, leaf: null };
    /** Turn it to heading h (atan2(z, x) of its front, in the leaf's plane). */
    am.setHeading = (h) => {
      am.heading = h;
      const L = am.leaf;
      if (!L) return;
      const f = new THREE.Vector3(Math.cos(h), 0, Math.sin(h)).addScaledVector(L.N, -(Math.cos(h) * L.N.x + Math.sin(h) * L.N.z)).normalize();
      const zz = new THREE.Vector3().crossVectors(f, L.N).normalize();
      group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, L.N, zz));
    };
    return am;
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

  /** 0..1 through the portal's outro: the P. bursaria swim off out of the amoeba's frame (0: back in the pool). */
  swimOff(k) { this.leave = Math.max(0, Math.min(1, k)); }

  /** dt; camera and open (the guard is off) for the sparkle. */
  update(dt, camera = null, open = false) {
    this.t += dt;
    const S = this.S;
    if (!S) return;
    this.glow.setOpen(open);
    this.glow.update(dt, this.t, camera);
    for (const s of this.swimmers) {
      s.a += s.w * dt;
      let u = s.c[0] + Math.cos(s.a) * s.r, v = s.c[1] + Math.sin(s.a) * s.r * 0.8;
      if (this.leave > 0) {
        // through the portal: they swim off out of the view as it settles on the amoeba (the amoeba world opens with none round its cell)
        const du = u - (S.len + AMOEBA_AT.du), dv = v - AMOEBA_AT.v, l = Math.hypot(du, dv) || 1, e = this.leave * this.leave * (3 - 2 * this.leave);
        u += (du / l) * 11 * e; v += (dv / l) * 11 * e;
      }
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
