// The mite's two landmarks, built into the moss as real things (drawn by the
// SEM like everything else). Units: µm.
//
// Forward (design §1.6): a wet leaf axil. A moss stem rises from the floor,
// its lowest leaf arches out and down, and in the angle between them water
// has gathered in a smooth film; a tardigrade tun, a dry wrinkled barrel,
// lies in it. It swells a little as a mite comes near (rehydration). Reach
// the water and the microscope zooms in to the tardigrade's world.
//
// Backdoor: a giant water springtail resting on the moss, the creature of the
// stage above, ~1.5 mm long (four box mites). Dwell beside its head and press
// Y to rise back to the bog surface. It is solid: mites can climb it.
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS } from '../shared/techniques/mite-sem.js';
import { floorH, mergeGeos } from './world.js';

/** The opening camera places the forward landmark up and right; the backdoor is behind. */
export const FORWARD = { x: -1500, z: 1030, reach: 330 };
export const BACKDOOR = { x: 1450, z: -1000, dwell: 380 };

export function createLandmarkProps(world, tex) {
  const group = new THREE.Group();
  const leafMat = gMaterial({ cls: CLS.LEAF, tex: tex.leaf, map: 'uv', scale: 1, bump: 2.5, cut: true, side: THREE.DoubleSide });
  const stemMat = gMaterial({ cls: CLS.STEM, tex: tex.leaf, map: 'uv', scale: 1, bump: 3, cut: true });
  const waterMat = gMaterial({ cls: CLS.SPORE, cut: true });
  const tunMat = gMaterial({ cls: CLS.NPC, tex: tex.cuticle, map: 'tri', scale: 90, bump: 1.2 });
  const tailMat = gMaterial({ cls: CLS.NPC, tex: tex.cuticle, map: 'tri', scale: 160, bump: 1.8, cut: true });
  const thinMat = gMaterial({ cls: CLS.NPC, thin: 1, cut: true });

  // ---------------------------------------------------------- forward: the wet leaf axil
  const F = FORWARD;
  const toStart = new THREE.Vector2(-F.x, -F.z).normalize(); // the leaf reaches out toward where you come from
  const side = new THREE.Vector2(-toStart.y, toStart.x);
  const sx = F.x - toStart.x * 170, sz = F.z - toStart.y * 170; // the stem stands just behind the water
  const fy = floorH(sx, sz);
  {
    // the stem: leaning back a little, 90 µm thick, 1.5 mm tall
    const pts = [], n = 8;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push(new THREE.Vector3(sx - toStart.x * 160 * u * u, fy - 20 + 1500 * u, sz - toStart.y * 160 * u * u));
    }
    const stem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 46, 10, false);
    group.add(new THREE.Mesh(stem, stemMat));
    // its upper leaves: short lanceolate blades on a spiral, held up and out
    const geos = [];
    for (let i = 0; i < 7; i++) {
      const u = 0.38 + i * 0.09, a = i * 2.4;
      const base = new THREE.Vector3(sx - toStart.x * 160 * u * u, fy + 1500 * u, sz - toStart.y * 160 * u * u);
      geos.push(blade(base, new THREE.Vector3(Math.cos(a), 0.9, Math.sin(a)).normalize(), 420 - i * 25, 110, 0.0007));
    }
    // the lowest leaf: from the stem ~240 µm up, arching out and down to the floor
    // toward you; the axil is the angle between it and the stem
    const b = new THREE.Vector3(sx, fy + 240, sz);
    geos.push(blade(b, new THREE.Vector3(toStart.x, 0.55, toStart.y).normalize(), 900, 210, 0.0021));
    group.add(new THREE.Mesh(mergeGeos(geos), leafMat));
  }
  // the water film in the axil: a flattened, smooth lens of water hugging the floor
  const wx = F.x, wz = F.z, wy = floorH(wx, wz);
  const water = new THREE.SphereGeometry(1, 40, 20);
  {
    const p = water.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // a sessile drop: flat underneath, a low dome, longer along the leaf
      p.setXYZ(i, x * 330, y > 0 ? y * 120 : y * 30, z * 250);
    }
    water.computeVertexNormals();
    const yaw = Math.atan2(toStart.y, toStart.x);
    water.rotateY(-yaw);
    water.translate(wx, wy + 10, wz);
  }
  group.add(new THREE.Mesh(water, waterMat));
  // the tun: a dry tardigrade, legs drawn in, a wrinkled barrel ~210 µm long,
  // lying half sunk in the film
  const tunGeo = new THREE.SphereGeometry(1, 36, 18);
  {
    const p = tunGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ring = 1 - 0.09 * Math.abs(Math.sin((x + 1) * Math.PI * 3.5)); // the segment furrows
      const wr = 1 + 0.035 * Math.sin(Math.atan2(z, y) * 9 + x * 6); // and fine wrinkles
      p.setXYZ(i, x * 105, y * 62 * ring * wr, z * 70 * ring * wr);
    }
    tunGeo.computeVertexNormals();
  }
  const tun = new THREE.Mesh(tunGeo, tunMat);
  tun.position.set(wx + side.x * 30, wy + 112, wz + side.y * 30);
  tun.rotation.set(0.08, -Math.atan2(side.y, side.x), 0.12);
  group.add(tun);

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
  const fwd = new THREE.Vector3(wx, wy + 110, wz);

  return {
    group, tun,
    forward: fwd,
    back: dwell,
    /** The tun swells (rehydrates) a little as the nearest mite comes close; d: that distance, µm. */
    update(t, d) {
      const k = Math.max(0, Math.min(1, 1 - (d - 250) / 900));
      const s = 1 + 0.12 * k + 0.015 * k * Math.sin(t * 2.2);
      tun.scale.set(s, 1 + 0.25 * k, 1 + 0.2 * k);
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
