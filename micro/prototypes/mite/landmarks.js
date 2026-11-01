// The mite's two landmarks, built into the moss as real things (drawn by the
// SEM like everything else). Units: µm.
//
// Forward (design §1.6), the portal: a wet leaf axil. A moss stem rises from
// the floor, its lowest leaf arches out and down, and in the angle between
// them water has gathered in a smooth film; a tardigrade, the creature of the
// next world, walks slowly about in it (the glimpse the transition pushes in
// on). It is built where the portal is placed (place(): by the encounter
// director, the last of the mite's encounters, in moss nobody has seen yet,
// a short way ahead of whoever leads; layout.js portalAt), with the shared
// golden glow over it (shared/portal.js; main.js
// draws it after the SEM composite). Reach the water while the pseudoscorpion
// is off guard and the microscope goes on into the tardigrade's world.
//
// Backdoor: a giant water springtail resting on the moss, the creature of the
// stage above, ~1.5 mm long (four box mites). Dwell beside its head and press
// Y to rise back to the bog surface. It is solid: mites can climb it.
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS } from '../shared/techniques/mite-sem.js';
import { createPortalGlow } from '../shared/portal.js';
import { floorH, mergeGeos } from './world.js';
import { portalAt } from './layout.js';

/** The water's reach (µm from its centre: a player this close has reached it). */
export const FORWARD = { reach: 360 };
/** The giant springtail, behind the start view (its head toward the start). */
export const BACKDOOR = { x: 1450, z: -1000, dwell: 380, clear: 1000 };
/** The tardigrade in the water: its length (µm), the tardigrade world's creature's (350 µm; a pose's `len` in both). */
export const TARDI_LEN = 350;

export function createLandmarkProps(world, tex, { glowScene }) {
  const group = new THREE.Group();
  const leafMat = gMaterial({ cls: CLS.LEAF, tex: tex.leaf, map: 'uv', scale: 1, bump: 2.5, cut: true, side: THREE.DoubleSide });
  const stemMat = gMaterial({ cls: CLS.STEM, tex: tex.leaf, map: 'uv', scale: 1, bump: 3, cut: true });
  const waterMat = gMaterial({ cls: CLS.SPORE, cut: true });
  const tardiMat = gMaterial({ cls: CLS.NPC, tex: tex.cuticle, map: 'tri', scale: 90, bump: 1.2 });
  const tailMat = gMaterial({ cls: CLS.NPC, tex: tex.cuticle, map: 'tri', scale: 160, bump: 1.8, cut: true });
  const thinMat = gMaterial({ cls: CLS.NPC, thin: 1, cut: true });

  // ---------------------------------------------------------- forward: the wet leaf axil (built by place())
  const axil = new THREE.Group();
  axil.visible = false;
  group.add(axil);
  const tardi = createTardigrade(tardiMat, thinMat);
  axil.add(tardi.group);
  // the golden sparkle over it: dim and restless while guarded, bright once open
  const glow = createPortalGlow({ THREE, scene: glowScene, size: 620, count: 72, beam: 3200, beamWidth: 280, height: 900, intensity: 1.15 });
  glow.group.visible = false;
  const forward = { placed: false, a: 0, x: 0, z: 0, y: 0, ux: 0, uz: 0, at: new THREE.Vector3(), post: null, home: null };
  const water = { x: 0, z: 0, y: 0, rx: 520, rz: 380, yaw: 0 };
  /** Build the axil with its water at (x, z), met coming along bearing a (outward). */
  function place(a, x, z) {
    const P = portalAt(a, x, z);
    for (const m of [...axil.children]) if (m !== tardi.group) { axil.remove(m); m.geometry.dispose(); }
    const toStart = new THREE.Vector2(-P.ux, -P.uz); // the leaf reaches out toward where you come from
    const wx = P.x, wz = P.z, wy = floorH(wx, wz);
    const sx = wx - toStart.x * 230, sz = wz - toStart.y * 230; // the stem stands just behind the water
    const fy = floorH(sx, sz);
    {
      // the stem: leaning back a little, 90 µm thick, 1.5 mm tall
      const pts = [], n = 8;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        pts.push(new THREE.Vector3(sx - toStart.x * 160 * u * u, fy - 20 + 1500 * u, sz - toStart.y * 160 * u * u));
      }
      axil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 46, 10, false), stemMat));
      // its upper leaves: short lanceolate blades on a spiral, held up and out
      const geos = [];
      for (let i = 0; i < 7; i++) {
        const u = 0.38 + i * 0.09, ang = i * 2.4;
        const base = new THREE.Vector3(sx - toStart.x * 160 * u * u, fy + 1500 * u, sz - toStart.y * 160 * u * u);
        geos.push(blade(base, new THREE.Vector3(Math.cos(ang), 0.9, Math.sin(ang)).normalize(), 420 - i * 25, 110, 0.0007));
      }
      // the lowest leaf: from the stem ~240 µm up, arching out and down to the
      // floor beside the water (so the film lies open to view in the angle
      // between leaf and stem: the axil)
      const side = new THREE.Vector2(-toStart.y, toStart.x);
      const b = new THREE.Vector3(sx, fy + 240, sz);
      geos.push(blade(b, new THREE.Vector3(toStart.x * 0.35 + side.x * 0.94, 0.55, toStart.y * 0.35 + side.y * 0.94).normalize(), 950, 210, 0.0021));
      axil.add(new THREE.Mesh(mergeGeos(geos), leafMat));
    }
    // the water film in the axil: a flattened, smooth lens of water hugging the floor
    const wgeo = new THREE.SphereGeometry(1, 40, 20);
    {
      const p = wgeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        // a film: flat underneath, a very low dome (the tardigrade walks in it, its back out of it), longer across the way in
        p.setXYZ(i, x * water.rx, y > 0 ? y * 20 : y * 20, z * water.rz);
      }
      wgeo.computeVertexNormals();
      const yaw = Math.atan2(toStart.y, toStart.x) + Math.PI / 2;
      wgeo.rotateY(-yaw);
      wgeo.translate(wx, wy + 10, wz);
      water.yaw = yaw;
    }
    axil.add(new THREE.Mesh(wgeo, waterMat));
    Object.assign(water, { x: wx, z: wz, y: wy });
    Object.assign(forward, { placed: true, a, x: wx, z: wz, y: wy + 60, ux: P.ux, uz: P.uz, post: P.post, home: P.home });
    forward.at.set(wx, wy + 60, wz);
    tardi.reset(wx, floorH(wx, wz) + 22, wz, Math.atan2(toStart.y, toStart.x) + 1.1);
    axil.visible = true;
    glow.setPosition(wx, wy + 20, wz);
    glow.group.visible = true;
  }

  // ---------------------------------------------------------- backdoor: a giant springtail at rest
  const B = BACKDOOR;
  const facing = Math.atan2(-B.z, -B.x); // its head toward the start
  const dir = new THREE.Vector3(Math.cos(facing), 0, Math.sin(facing));
  const by = floorH(B.x, B.z);
  const parts = [];
  const ell = (x, y, z, rx, ry, rz, seg = 22) => { const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.6)); g.scale(rx, ry, rz); g.translate(x, y, z); parts.push(g); };
  const rod = (a, b, r0, r1 = r0 * 0.75) => {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
    const L = A.distanceTo(Bv);
    const g = new THREE.CylinderGeometry(r1, r0, L, 8, 1);
    g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()));
    g.translate(A.x, A.y, A.z);
    parts.push(g);
    ell(Bv.x, Bv.y, Bv.z, r1, r1, r1, 8);
  };
  // body along +x (head at +x): head, three thoracic and six abdominal rings
  ell(640, 230, 0, 170, 150, 160);
  const rings = [[450, 240, 175, 170], [300, 250, 185, 185], [150, 255, 190, 195], [0, 255, 190, 200], [-150, 250, 185, 195], [-300, 240, 175, 185], [-440, 225, 160, 170], [-560, 205, 135, 145], [-660, 185, 105, 115]];
  for (const [x, y, ry, rz] of rings) ell(x, y, 0, 95, ry, rz);
  // eye patches and the mouth cone
  ell(720, 300, 100, 40, 30, 22, 10); ell(720, 300, -100, 40, 30, 22, 10);
  ell(790, 150, 0, 60, 50, 60, 12);
  // antennae: four segments each, swept forward and up
  for (const s of [-1, 1]) {
    let a = [760, 330, s * 70];
    for (const [dx, dy, dz, r] of [[130, 70, 50, 26], [140, 40, 40, 21], [130, 10, 30, 17], [110, -20, 20, 13]]) {
      const b = [a[0] + dx, a[1] + dy, a[2] + s * dz];
      rod(a, b, r);
      a = b;
    }
  }
  // six short legs, folded at rest
  for (const [x, k] of [[420, 0], [270, 1], [120, 2]]) for (const s of [-1, 1]) {
    const hip = [x, 110, s * 150], knee = [x + 40 - k * 30, 90, s * 300], foot = [x + 70 - k * 50, 0, s * 360];
    rod(hip, knee, 40, 34); rod(knee, foot, 32, 18);
  }
  // the furcula, folded forward under the abdomen
  rod([-560, 70, -40], [-200, 25, -40], 34, 22); rod([-560, 70, 40], [-200, 25, 40], 34, 22);
  const tailGeo = mergeGeos(parts);
  tailGeo.rotateY(-facing);
  tailGeo.translate(B.x, by + 25, B.z);
  const giant = new THREE.Mesh(tailGeo, tailMat);
  group.add(giant);
  // its setae, as thin features (the SEM edge effect makes them glow)
  {
    const sg = [];
    let seed = 5;
    const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const x = -650 + R() * 1350, a = (R() - 0.5) * 2.6;
      const ring = rings.reduce((best, r) => (Math.abs(r[0] - x) < Math.abs(best[0] - x) ? r : best), rings[0]);
      const y0 = ring[1] + Math.cos(a) * ring[2] * 0.98, z0 = Math.sin(a) * ring[3] * 0.98;
      const g = new THREE.CylinderGeometry(3, 6, 120 + R() * 60, 4, 1);
      g.translate(0, 70, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.6, Math.cos(a), Math.sin(a)).normalize()));
      g.translate(x, y0, z0);
      sg.push(g);
    }
    const setae = mergeGeos(sg);
    setae.rotateY(-facing);
    setae.translate(B.x, by + 25, B.z);
    group.add(new THREE.Mesh(setae, thinMat));
  }
  // solid: a mite can climb onto it (and does not walk through it)
  const bodyOnly = tailGeo.clone();
  world.colliders.add(bodyOnly, 'grain');

  // where to dwell: beside its head (well clear of the start)
  const dwell = new THREE.Vector3(B.x + dir.x * 800 - dir.z * 430, 0, B.z + dir.z * 800 + dir.x * 430);
  dwell.y = floorH(dwell.x, dwell.z) + 120;

  return {
    group, glow, tardi, water,
    /** The portal (forward): { placed, a, x, z, y, at (Vector3), post, home }. */
    forward,
    place,
    /** No portal (a new game): nothing in the moss until the director places it again. */
    unplace() { forward.placed = false; axil.visible = false; glow.group.visible = false; },
    back: dwell,
    /** The tardigrade walks about in the film (its legs going); t: world time, dt: step. */
    update(t, dt) { if (forward.placed) tardi.update(t, dt, water); },
  };
}

/**
 * A small tardigrade, 350 µm (the next world's creature, walking in the
 * film): a plump, ringed barrel with a rounded head, four pairs of stubby
 * lobopod legs, each with its claws. Drawn by the SEM (CLS.NPC). Walks slowly
 * round inside the water lens, legs stepping in a wave.
 */
function createTardigrade(mat, thinMat) {
  const group = new THREE.Group();
  const L = TARDI_LEN;
  const body = new THREE.SphereGeometry(1, 40, 20);
  {
    const p = body.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ring = 1 - 0.07 * Math.pow(Math.abs(Math.sin((x + 1) * Math.PI * 2.5)), 3); // segment furrows
      const head = x > 0.62 ? 1 - 0.35 * (x - 0.62) / 0.38 : 1; // a narrower rounded head
      p.setXYZ(i, x * L * 0.5, y * L * 0.17 * ring * head, z * L * 0.2 * ring * head);
    }
    body.computeVertexNormals();
  }
  const bodyMesh = new THREE.Mesh(body, mat);
  bodyMesh.position.y = L * 0.2;
  group.add(bodyMesh);
  // the mouth cone and the eye spots
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8).scale(L * 0.05, L * 0.05, L * 0.06), mat);
  mouth.position.set(L * 0.5, L * 0.17, 0); group.add(mouth);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6).scale(L * 0.025, L * 0.02, L * 0.02), mat); e.position.set(L * 0.38, L * 0.3, s * L * 0.08); group.add(e); }
  // legs: a stubby lobopod (a tapered tube) with four claws at its foot
  const legGeo = (() => {
    const tube = new THREE.CylinderGeometry(L * 0.038, L * 0.055, L * 0.2, 10, 1);
    tube.translate(0, -L * 0.1, 0);
    const claws = [];
    for (let c = 0; c < 4; c++) {
      const g = new THREE.CylinderGeometry(L * 0.004, L * 0.009, L * 0.06, 4, 1);
      g.translate(0, -L * 0.03, 0);
      g.rotateZ(-0.6 + (c % 2) * 0.25); g.rotateY(-0.9 + c * 0.6);
      g.translate(0, -L * 0.2, 0);
      claws.push(g);
    }
    return { tube, claws: mergeGeos(claws.map((g) => g.toNonIndexed())) };
  })();
  const legs = [];
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(L * (0.3 - k * 0.2), L * 0.14, s * L * 0.15);
    const leg = new THREE.Mesh(legGeo.tube, mat);
    const cl = new THREE.Mesh(legGeo.claws, thinMat);
    hip.add(leg, cl);
    hip.rotation.x = s * 0.35;
    group.add(hip);
    legs.push({ hip, k, s, ph: k * 0.25 + (s > 0 ? 0.5 : 0) });
  }
  const st = { x: 0, z: 0, y: 0, h: 0, walk: 0, turn: 0 };
  return {
    group,
    get center() { return new THREE.Vector3(st.x, st.y + L * 0.2, st.z); },
    get heading() { return st.h; },
    /** Face heading h (the outro: it turns the way it faces in its own world). */
    setHeading(h) { st.h = h; this.update(0, 0, null); },
    reset(x, y, z, h) { Object.assign(st, { x, y, z, h, walk: 0, turn: 0 }); this.update(0, 0, null); },
    update(t, dt, water) {
      if (water && dt > 0) {
        // slow, wandering steps, turning back in from the lens's edge
        st.turn = 0.5 * Math.sin(t * 0.37) + 0.3 * Math.sin(t * 0.91 + 1);
        const dx = st.x - water.x, dz = st.z - water.z, r = Math.hypot(dx, dz);
        if (r > 140) { const back = Math.atan2(-dz, -dx); st.turn += 2.2 * Math.atan2(Math.sin(back - st.h), Math.cos(back - st.h)); }
        st.h += st.turn * dt;
        const v = 28;
        st.x += Math.cos(st.h) * v * dt; st.z += Math.sin(st.h) * v * dt;
        st.walk += v * dt / 40;
      }
      group.position.set(st.x, st.y + 4, st.z);
      group.rotation.set(0, -st.h, 0);
      for (const l of legs) {
        const ph = (st.walk + l.ph) * Math.PI * 2;
        l.hip.rotation.z = 0.45 * Math.sin(ph);
        l.hip.rotation.x = l.s * (0.35 + 0.12 * Math.max(0, Math.cos(ph)));
      }
      bodyMesh.position.y = L * 0.2 + 2 * Math.sin(st.walk * Math.PI * 4);
    },
  };
}

/** A lanceolate leaf blade from `base` along `dir`: tapered, keeled, arching down (curl µm⁻¹). */
function blade(base, dir, L, W, curl) {
  const nu = 18, nv = 6;
  const pos = [], uv = [], idx = [];
  const d = dir.clone().normalize();
  const side = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0));
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    const s = u * L;
    const w = W * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.02)) * (1 - 0.35 * u);
    for (let j = 0; j <= nv; j++) {
      const v = j / nv - 0.5;
      const p = base.clone().addScaledVector(d, s).addScaledVector(side, v * w);
      p.y -= curl * s * s; // arches down under its own weight
      p.y += Math.abs(v) * w * 0.25; // the keel: the leaf is a shallow V
      pos.push(p.x, p.y, p.z);
      uv.push(u, j / nv);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
