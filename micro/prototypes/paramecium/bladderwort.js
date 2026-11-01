// The boss of the pool: a bladderwort trap (Utricularia) across the way to the
// biofilm (the forward landmark), three quarters of the way along the route.
// A rounded bladder about half a millimetre long on its stalk, just off the
// slide, its door (in a raised collar, with two branched antennae of long
// beaded bristles and short trigger hairs) facing the way you come. Shaped
// after the delivered sheet, assets/reference-sheets/boss-bladderwort.webp.
//
// The real trap: glands pump water out of the bladder so its walls draw in
// (it is "set"); trigger hairs by the door, when touched, release the door,
// the walls spring out and the bladder sucks in water and anything near the
// door in about half a millisecond; then it closes and slowly resets. Traps
// also fire on their own every so often. (Vincent et al. 2011; Poppinga et al.
// 2016; atlas S30.)
//
// The game (main.js runs it with shared/predation.js createFight, as a boss:
// more resolve, several patterns):
//   dormant  until a player comes near its door (always beyond halfway)
//   stalk    set and waiting: walls drawn in, door still
//   windup   the tell: the door quivers and the walls draw in further
//   strike   the suction pulse: walls spring out, the door swings in, and
//            everything near the door is pulled toward it (main.js)
//   recover  the reset: it pumps the water back out, walls slowly drawing in;
//            the door is shut, so this is the moment to dash past
//   retreat  spent: after enough wasted pulses it sits full and slack and
//            cannot fire for a while (the boss fails: you can pass)
// Departure (labelled in the README): a pulse is drawn over a third of a
// second (really half a millisecond) and pulls from a few hundred µm (really
// a millimetre or so in front of the door) so it can be read and dodged.
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd } from '../shared/sdf.js';
import { volumeMaterial, pointsMaterial } from './optics.js';
import { closedTube, rng } from './geom.js';
import { DIR, SIDE, routePoint } from './landmarks.js';

// On the route, well beyond halfway (landmarks.js), door toward the start.
const TOWARD = DIR.clone().negate();
const CENTRE = routePoint(3420, 0, 190);
export const TRAP = {
  centre: CENTRE,
  half: new THREE.Vector3(250, 215, 215), // the bladder: along the door axis, up, across
  dir: TOWARD.clone(),
  doorR: 78,
  doorAt: new THREE.Vector3(272, 120, 0), // the door's centre in the bladder's frame (+x toward the door)
  pullR: 400, // the suction reaches this far from the door (game value)
  wakeR: 650, // a player this close to the door wakes it (always beyond halfway)
};
TRAP.door = CENTRE.clone().addScaledVector(TRAP.dir, TRAP.doorAt.x).setY(CENTRE.y + TRAP.doorAt.y);

function quads(n, iPos, iP) {
  const quad = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.attributes.position = quad.attributes.position;
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 4));
  g.setAttribute('iP', new THREE.InstancedBufferAttribute(iP, 4));
  g.instanceCount = n;
  return g;
}

/**
 * The bladder as in the reference sheet (boss-bladderwort.webp): a rounded,
 * slightly pear-shaped sac, its upper front drawn out into a collar (the
 * "beak") that holds the door; the stalk joins at the back.
 */
function bladderGeometry() {
  const parts = [
    { id: 0, sdf: sd.ellipsoid([-10, -10, 0], [240, 205, 210]) },
    { id: 1, blend: 60, sdf: sd.roundCone([90, 60, 0], [262, TRAP.doorAt.y, 0], 120, 84) },
  ];
  return buildSdfMesh(parts, { min: [-262, -228, -224], max: [300, 232, 224], cell: 9 });
}

export function createBladderwort(scene, world) {
  const rand = rng(91);
  const root = new THREE.Group();
  root.name = 'bladderwort';
  scene.add(root);
  // the bladder, in its own frame: +x toward the door
  const body = new THREE.Group();
  body.position.copy(TRAP.centre);
  body.rotation.y = Math.atan2(-TRAP.dir.z, TRAP.dir.x);
  root.add(body);
  // translucent green: a thin wall of cells (the mottled, reticulate pattern), chlorophyll green
  const wall = new THREE.Mesh(bladderGeometry(), volumeMaterial({ dn: 0.011, scatter: 1.35, absorb: [0.0034, 0.0007, 0.0044], centred: true, pattern: 3, rimPow: 3.2 }));
  wall.frustumCulled = false;
  body.add(wall);
  // the quadrifid glands lining the inside (they pump the water out): fine dots all over
  {
    const n = 1400, iPos = new Float32Array(n * 4), iP = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1, a = rand() * Math.PI * 2, k = 0.93;
      const r = Math.sqrt(1 - u * u);
      iPos.set([u * 235 * k - 10, r * Math.cos(a) * 200 * k - 10, r * Math.sin(a) * 205 * k, 0], i * 4);
      iP.set([1.2 + rand() * 1.6, 0.05, 1.4, rand()], i * 4);
    }
    const glands = new THREE.Mesh(quads(n, iPos, iP), pointsMaterial({ absorb: [0.016, 0.012, 0.01] }));
    glands.frustumCulled = false;
    body.add(glands);
  }
  // earlier catches: a brown mass of digested remains low in the back, and a round prey still whole
  {
    const remains = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), volumeMaterial({ dn: 0.016, scatter: 1.1, absorb: [0.0035, 0.0062, 0.011], centred: true, pattern: 3, rimPow: 1.6 }));
    remains.scale.set(130, 105, 120); remains.position.set(-70, -60, 10); remains.rotation.z = 0.5;
    remains.frustumCulled = false;
    body.add(remains);
    const prey = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), volumeMaterial({ dn: 0.02, scatter: 1.5, absorb: [0.0008, 0.0009, 0.0012], centred: true, pattern: 3, rimPow: 2.4 }));
    prey.scale.setScalar(78); prey.position.set(55, 25, -30);
    prey.frustumCulled = false;
    body.add(prey);
    const m = 40, cPos = new Float32Array(m * 4), cP = new Float32Array(m * 4);
    for (let i = 0; i < m; i++) { cPos.set([(rand() - 0.6) * 260, -60 + (rand() - 0.5) * 140, (rand() - 0.5) * 220, 0], i * 4); cP.set([5 + rand() * 9, 0.05, 2, rand()], i * 4); }
    const caught = new THREE.Mesh(quads(m, cPos, cP), pointsMaterial({ absorb: [0.04, 0.05, 0.05] }));
    caught.frustumCulled = false;
    body.add(caught);
  }
  // the door: a translucent oval flap in the collar's mouth, hinged at its top
  const hinge = new THREE.Group();
  hinge.position.set(TRAP.doorAt.x, TRAP.doorAt.y + TRAP.doorR, 0);
  body.add(hinge);
  const door = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16), volumeMaterial({ dn: 0.018, scatter: 1.5, absorb: [0.0035, 0.0009, 0.0045], centred: true, pattern: 3, rimPow: 2 }));
  door.scale.set(8, TRAP.doorR, TRAP.doorR * 0.78);
  door.position.set(0, -TRAP.doorR, 0);
  door.frustumCulled = false;
  hinge.add(door);
  // the threshold: a thicker rim round the door
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 10, 40), volumeMaterial({ dn: 0.03, scatter: 1.6, absorb: [0.005, 0.0012, 0.006], centred: true }));
  rim.scale.set(TRAP.doorR * 0.82, TRAP.doorR * 1.05, TRAP.doorR); rim.rotation.y = Math.PI / 2;
  rim.position.set(TRAP.doorAt.x + 4, TRAP.doorAt.y, 0);
  rim.frustumCulled = false;
  body.add(rim);
  // the antennae: two branched antennae above the door, each fanning into long,
  // jointed bristles with dark beads along them, and the short trigger hairs
  // round the door's lower edge (touch one and the trap fires)
  const hairMat = volumeMaterial({ dn: 0.032, scatter: 1.4, absorb: [0.0045, 0.0035, 0.004], centred: true });
  const beads = [];
  const hair = (parent, from, to, r) => {
    const len = from.distanceTo(to);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r, len, 7), hairMat);
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    m.frustumCulled = false;
    parent.add(m);
    for (let d = 18; d < len; d += 20 + rand() * 6) beads.push({ parent, p: from.clone().lerp(to, d / len) });
    return m;
  };
  const antennae = new THREE.Group();
  body.add(antennae);
  const hairs = [];
  const D = TRAP.doorAt;
  for (const z of [1, -1]) {
    const a0 = new THREE.Vector3(D.x - 6, D.y + TRAP.doorR * 0.95, z * TRAP.doorR * 0.45);
    const a1 = new THREE.Vector3(D.x + 40, D.y + TRAP.doorR * 1.55, z * TRAP.doorR * 0.95);
    hair(antennae, a0, a1, 6);
    // the bristles: fanning forward, up and out
    for (let k = 0; k < 6; k++) {
      const up = -0.35 + k * 0.28, out = 0.25 + 0.55 * rand();
      const L = 240 + rand() * 170;
      const dir = new THREE.Vector3(1, up, z * out).normalize();
      const b0 = a0.clone().lerp(a1, 0.5 + k * 0.1);
      hairs.push(hair(antennae, b0, b0.clone().addScaledVector(dir, L), 2.4));
    }
  }
  for (const [y, z] of [[-0.55, 0.65], [-0.55, -0.65], [-0.9, 0.3], [-0.9, -0.3]]) {
    const f = new THREE.Vector3(D.x + 2, D.y + y * TRAP.doorR, z * TRAP.doorR * 0.8);
    hairs.push(hair(body, f, f.clone().add(new THREE.Vector3(85, y * 40, z * 50)), 2.6));
  }
  {
    const n = beads.length, iPos = new Float32Array(n * 4), iP = new Float32Array(n * 4);
    beads.forEach((b, i) => { iPos.set([b.p.x, b.p.y, b.p.z, 0], i * 4); iP.set([2.4 + rand(), 0.06, 2.2, rand()], i * 4); });
    const beadMesh = new THREE.Mesh(quads(n, iPos, iP), pointsMaterial({ absorb: [0.035, 0.05, 0.075] }));
    beadMesh.frustumCulled = false;
    antennae.add(beadMesh); // (the trigger hairs' few beads ride with the antennae; close enough)
  }
  // the stalk: from the back of the bladder, then the stem it hangs from, up to the coverslip
  const stemMat = volumeMaterial({ dn: 0.01, scatter: 1.2, absorb: [0.0045, 0.0012, 0.0055], rimPow: 3 });
  {
    const w = (lx, ly, lz) => body.localToWorld(new THREE.Vector3(lx, ly, lz));
    body.updateMatrixWorld(true);
    const curve = new THREE.CatmullRomCurve3([w(-200, -20, 0), w(-330, -10, 0), w(-470, 40, 40), w(-560, 200, 260), w(-700, 380, 700), w(-900, 450, 1400)]);
    curve.points.forEach((p) => { p.y = Math.min(p.y, 640); });
    const { geo } = closedTube(curve, 70, 30, 16);
    root.add(Object.assign(new THREE.Mesh(geo, stemMat), { frustumCulled: false, name: 'bladderwort stem' }));
  }
  void SIDE;
  // solid: you glance off the bladder
  world.obstacles.push({ kind: 'sphere', c: TRAP.centre.clone(), r: TRAP.half.z * 0.95, what: 'the bladderwort trap' });

  const trap = {
    kind: 'bladder', label: 'Bladderwort trap', group: root, pos: TRAP.centre, tip: TRAP.door, reach: 0, holdFor: 1.4,
    door: TRAP.door, dir: TRAP.dir, pullR: TRAP.pullR, wakeR: TRAP.wakeR, centre: TRAP.centre, half: TRAP.half,
    awake: false, state: 'dormant', set: 1, open: 0, quiver: 0, stun: 0, sated: 0, hungry: true, phase2: false,
    /** Show the state: `fs` the fight state, `k` 0..1 within it. */
    update(dt, fs, k, t) {
      const st = !trap.awake ? 'dormant' : fs;
      trap.state = st;
      // set: walls drawn in (1 = fully set); open: the door swung in
      let set = 1, open = 0, quiver = 0;
      if (st === 'windup') { set = 1 + 0.35 * k; quiver = k; }
      else if (st === 'strike') { set = -0.4; open = 1 - Math.max(0, k - 0.6) / 0.4; }
      else if (st === 'recover' || st === 'repelled') { set = -0.4 + 1.4 * k; }
      else if (st === 'retreat') { set = -0.45; }
      trap.set += (set - trap.set) * Math.min(1, dt * (st === 'strike' ? 40 : 4));
      trap.open += (open - trap.open) * Math.min(1, dt * (st === 'strike' ? 40 : 6));
      trap.quiver = quiver;
      // walls drawn in: the sides concave (narrower across, a little lower); sprung: round and full
      wall.scale.set(1, 1 - 0.08 * trap.set, 1 - 0.16 * trap.set);
      hinge.rotation.z = -1.25 * trap.open + (quiver ? Math.sin(t * 55) * 0.07 * quiver : 0);
      hinge.rotation.x = quiver ? Math.sin(t * 41) * 0.05 * quiver : 0;
      antennae.rotation.x = quiver ? Math.sin(t * 30) * 0.03 * quiver : 0;
      for (const h of hairs) h.rotation.x = quiver ? Math.sin(t * 30 + h.position.z) * 0.08 * quiver : 0;
    },
  };
  return trap;
}
