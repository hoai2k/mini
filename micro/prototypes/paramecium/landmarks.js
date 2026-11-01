// The Micro Zoom landmarks of the pond drop, drawn into the scene with the
// microscope's own materials (they are things in the drop, not markers):
//
//  - Forward (into the bacterium level): a fragment of a dead leaf lying on the
//    slide at the far side of the drop, coated in biofilm. At 20× its bacteria
//    are rods and dots that read only as texture, with a faint slime (EPS) sheen
//    over them: the zoom target into bacteria (spec §3.6 / §4.6). Swim down and
//    touch it.
//  - Backdoor (back up to the amoeba level): the patch of slide floor near the
//    rim where the Amoeba proteus crawls (main.js keeps the amoeba's home here):
//    its slime trail, egested food vacuoles and the sediment it has swept. Swim
//    down to it and press Y.
//
// Positions in µm (slide at y = 0). The challenges lie on rings round the
// start, the same in every direction (micro/design/encounter-pattern.md); the
// biofilm (the portal) is placed once a game on its ring, in the direction the
// first player heads far enough (main.js), and starts hidden.
import * as THREE from '../shared/vendor/three.module.min.js';
import { volumeMaterial, pointsMaterial } from './optics.js';
import { rng } from './geom.js';

// The rings round the start (µm from START, in the plane): a short calm
// warm-up, then one challenge after another with a calm stretch between, the
// same whichever way you head (micro/design/encounter-pattern.md).
//   0–750      calm: prey, Vorticella, diatoms, Spirogyra, the sunlit patch
//   750–1450   Dileptus's water (one Dileptus at 1000, moved round its ring to meet you)
//   1600–2100  the Chlamydomonas bloom (one band at 1850, moved round its ring)
//   2150–3050  two Didinium (at 2600, moved round their ring together)
//   3150       the bladderwort trap's door (bladder at 3420), guarding
//   3850       the portal: the biofilm on a leaf
// At full speed (1.4 mm/s) the portal is a few seconds' swim; the challenges
// are what take the time.
export const START = new THREE.Vector3(-150, 0, 60);
export const RINGS = { warm: 750, dileptus: 1000, bloom: 1850, didinium: 2600, trap: 3420, portal: 3850 };
/** The direction everything starts in (up and to the right of the opening view), until moved. */
export const DIR = new THREE.Vector3(0.553, 0, 0.833).normalize();
export const SIDE = new THREE.Vector3(-DIR.z, 0, DIR.x); // to the right of DIR (as the opening view sees it)
export const A0 = Math.atan2(DIR.z, DIR.x); // its bearing
export const ROUTE_LEN = RINGS.portal; // start to portal
export const HALF = RINGS.warm; // where the calm warm-up ends and the first challenge's water begins
/** A point `u` µm out from the start along DIR, `side` µm to its right, at height y (scenery). */
export const routePoint = (u, side = 0, y = 0, out = new THREE.Vector3()) => out.copy(START).addScaledVector(DIR, u).addScaledVector(SIDE, side).setY(y);
/** A point on the ring of radius r at bearing a (radians, from +x toward +z), height y. */
export const ringPoint = (r, a, y = 0, out = new THREE.Vector3()) => out.set(START.x + Math.cos(a) * r, y, START.z + Math.sin(a) * r);
/** Distance from the start in the plane (µm): how far out a point is. */
export const distFromStart = (p) => Math.hypot(p.x - START.x, p.z - START.z);
/** Bearing of a point from the start (radians). */
export const bearingOf = (p) => Math.atan2(p.z - START.z, p.x - START.x);
/** How far out a point is (µm from the start; the rings are the same in every direction). */
export const progress = distFromStart;
/** Lateral offset from the DIR line (µm, + to the right); scenery only. */
export const lateral = (p) => (p.x - START.x) * SIDE.x + (p.z - START.z) * SIDE.z;

export const LANDMARKS = {
  // the portal: placed on its ring once a game (main.js placePortal); `placed` until then false
  forward: { pos: ringPoint(RINGS.portal, A0), r: 230, reachY: 120, label: 'Biofilm', placed: false, bearing: A0 },
  // the way back: the amoeba's floor, behind the start (a fixed place, between the Dileptus and bloom rings)
  back: { pos: routePoint(-1500, -250), r: 240, reachY: 170, label: 'Amoeba' },
};

function quads(n, iPos, iP) {
  const quad = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.attributes.position = quad.attributes.position;
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 4));
  g.setAttribute('iP', new THREE.InstancedBufferAttribute(iP, 4));
  g.instanceCount = n;
  return g;
}

/** A dead-leaf fragment: an irregular flat blade with a midrib and veins. */
function leafGeometry(rand) {
  const g = new THREE.SphereGeometry(1, 64, 20);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    // a torn, lobed outline
    const lobe = 1 + 0.12 * Math.sin(a * 3 + 0.7) + 0.07 * Math.sin(a * 7 + 2.1) + 0.04 * Math.sin(a * 13);
    x *= 250 * lobe; z *= 165 * lobe; y *= 9 + 3 * Math.cos(a * 2);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  void rand;
  return g;
}

export function createLandmarks(scene) {
  const rand = rng(77);
  const group = new THREE.Group();
  scene.add(group);
  // one group per landmark, so main.js can cull each per view
  const fwdGroup = new THREE.Group(), backGroup = new THREE.Group();
  group.add(fwdGroup, backGroup);

  // --- forward: the biofilm on a leaf fragment ---
  const F = LANDMARKS.forward;
  const leafRot = 0.6;
  const leaf = new THREE.Mesh(leafGeometry(rand), volumeMaterial({ dn: 0.022, scatter: 1.3, absorb: [0.007, 0.006, 0.012], centred: true, pattern: 3, rimPow: 2.4 }));
  leaf.position.set(F.pos.x, 10, F.pos.z);
  leaf.rotation.y = leafRot;
  leaf.frustumCulled = false;
  fwdGroup.add(leaf);
  // veins: thin dense ridges along the blade
  const veinMat = volumeMaterial({ dn: 0.03, scatter: 1.6, absorb: [0.009, 0.008, 0.014], centred: true });
  const vein = (x0, z0, x1, z1, r) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.6, len, 10), veinMat);
    m.rotation.z = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(m);
    holder.position.set((x0 + x1) / 2, 18, (z0 + z1) / 2);
    holder.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    leaf.add(holder);
    m.frustumCulled = false;
  };
  vein(-230, 0, 230, 0, 6);
  for (let i = -3; i <= 3; i++) if (i) { const x = i * 55; vein(x, 0, x + 70, 120 * Math.sign(i) * (i % 2 ? 1 : -1), 2.4); }
  // the biofilm: a dense lawn of rods and cocci on top of the blade, thickest in the middle
  const n = 5200, iPos = new Float32Array(n * 4), iP = new Float32Array(n * 4);
  const c = Math.cos(leafRot), s = Math.sin(leafRot);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand());
    const lx = Math.cos(a) * rr * 235, lz = Math.sin(a) * rr * 155;
    // clusters (microcolonies) make it read as a lawn rather than noise
    const cl = Math.sin(lx * 0.045) * Math.sin(lz * 0.06) > 0.2 ? 1 : 0.55;
    if (rand() > cl) continue;
    const wx = F.pos.x + lx * c + lz * s, wz = F.pos.z - lx * s + lz * c;
    const rod = rand() < 0.68;
    iPos.set([wx, 19 + rand() * 6 * (1 - rr), wz, 0], i * 4);
    iP.set([rod ? 0.6 : 0.75, 0.08, 6.5, rand()], i * 4);
  }
  const film = new THREE.Mesh(quads(n, iPos, iP), pointsMaterial({ rod: true, absorb: [0.035, 0.04, 0.06] }));
  film.frustumCulled = false;
  fwdGroup.add(film);
  // the slime (EPS) over it: a faint, slightly scattering skin
  const eps = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 12), volumeMaterial({ dn: 0.004, scatter: 0.9, absorb: [0.0006, 0.0006, 0.0008], centred: true, rimPow: 1.4 }));
  eps.scale.set(240, 12, 160);
  eps.position.set(F.pos.x, 22, F.pos.z);
  eps.rotation.y = leafRot;
  eps.frustumCulled = false;
  fwdGroup.add(eps);

  // --- backdoor: where the amoeba crawls on the slide ---
  const B = LANDMARKS.back;
  {
    // the slime trail: a winding band of fine, cleared specks where the amoeba has crawled
    const m = 1600, tPos = new Float32Array(m * 4), tP = new Float32Array(m * 4);
    for (let i = 0; i < m; i++) {
      const u = rand();
      const ang = -0.4 + u * 4.2;
      const R = 70 + u * 150;
      const x = B.pos.x + Math.cos(ang) * R + (rand() - 0.5) * 70, z = B.pos.z + Math.sin(ang) * R + (rand() - 0.5) * 70;
      tPos.set([x, 1.5 + rand() * 2, z, 0], i * 4);
      tP.set([2 + rand() ** 2 * 4, 0.02, 1.4 + rand() * 1.5, rand()], i * 4);
    }
    const trail = new THREE.Mesh(quads(m, tPos, tP), pointsMaterial({ absorb: [0.002, 0.003, 0.004] }));
    trail.frustumCulled = false;
    backGroup.add(trail);
    // egested food vacuoles and digested remains, dark and granular
    const k = 26, dPos = new Float32Array(k * 4), dP = new Float32Array(k * 4);
    for (let i = 0; i < k; i++) {
      const a = rand() * Math.PI * 2, r = 40 + rand() * 180;
      dPos.set([B.pos.x + Math.cos(a) * r, 4, B.pos.z + Math.sin(a) * r, 0], i * 4);
      dP.set([6 + rand() * 7, 0.05, 2.5, rand()], i * 4);
    }
    const remains = new THREE.Mesh(quads(k, dPos, dP), pointsMaterial({ absorb: [0.05, 0.05, 0.035] }));
    remains.frustumCulled = false;
    backGroup.add(remains);
  }

  // The biofilm is built at its first spot; placing it rotates the group about
  // the start and moves it out to its ring at the new bearing.
  const F0 = F.pos.clone();
  fwdGroup.visible = false;
  return {
    group, fwdGroup, backGroup, forward: F, back: B,
    /** Put the biofilm on its ring at bearing a and show it. */
    place(a) {
      const d = a - A0;
      fwdGroup.rotation.y = -d; // three.js yaw: +y rotation turns +x toward −z
      const c = Math.cos(d), s = Math.sin(d);
      const rx = F0.x - START.x, rz = F0.z - START.z;
      F.pos.set(START.x + rx * c - rz * s, F0.y, START.z + rx * s + rz * c);
      // the group's origin is the world origin: rotate about it, then shift so F0 lands on F.pos
      const ox = F0.x * c - F0.z * s, oz = F0.x * s + F0.z * c;
      fwdGroup.position.set(F.pos.x - ox, 0, F.pos.z - oz);
      fwdGroup.updateMatrixWorld(true);
      F.placed = true; F.bearing = a;
      fwdGroup.visible = true;
    },
    unplace() { F.placed = false; fwdGroup.visible = false; },
  };
}
