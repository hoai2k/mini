// The boss of the pool: a bladderwort trap (Utricularia), guarding the biofilm
// (the forward landmark). A bladder about 0.56 mm long on its stem, lying just
// off the slide, its door facing the way you come.
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
//   dormant  until a player comes near its post after the calm opening
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
import { volumeMaterial, pointsMaterial } from './optics.js';
import { closedTube, rng } from './geom.js';
import { LANDMARKS } from './landmarks.js';

const F = LANDMARKS.forward.pos;
// from the biofilm toward where you come from (the drop's middle and the start)
const TOWARD = new THREE.Vector3(-0.553, 0, -0.833);
export const TRAP = {
  centre: new THREE.Vector3(F.x + TOWARD.x * 360, 200, F.z + TOWARD.z * 360),
  half: new THREE.Vector3(280, 160, 200), // along the door axis, up, across
  dir: TOWARD.clone(),
  doorR: 82,
  pullR: 400, // the suction reaches this far from the door (game value)
  wakeR: 900, // a player this close (to the door) wakes it after the calm opening
};
TRAP.door = TRAP.centre.clone().addScaledVector(TRAP.dir, TRAP.half.x - 10);

function quads(n, iPos, iP) {
  const quad = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.attributes.position = quad.attributes.position;
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 4));
  g.setAttribute('iP', new THREE.InstancedBufferAttribute(iP, 4));
  g.instanceCount = n;
  return g;
}

export function createBladderwort(scene, world) {
  const rand = rng(91);
  const root = new THREE.Group();
  scene.add(root);
  // the bladder, in its own frame: +x toward the door
  const body = new THREE.Group();
  body.position.copy(TRAP.centre);
  body.rotation.y = Math.atan2(-TRAP.dir.z, TRAP.dir.x);
  root.add(body);
  const wallGeo = new THREE.SphereGeometry(1, 64, 32);
  // a flattened front where the door sits
  { const p = wallGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x > 0.8) p.setX(i, 0.8 + (x - 0.8) * 0.35); } wallGeo.computeVertexNormals(); }
  const wall = new THREE.Mesh(wallGeo, volumeMaterial({ dn: 0.011, scatter: 1.3, absorb: [0.004, 0.0013, 0.0045], centred: true, rimPow: 3.6 }));
  wall.scale.set(TRAP.half.x, TRAP.half.y, TRAP.half.z);
  wall.frustumCulled = false;
  body.add(wall);
  // the quadrifid glands lining the inside (they pump the water out), and a few earlier catches
  {
    const n = 900, iPos = new Float32Array(n * 4), iP = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1, a = rand() * Math.PI * 2, k = 0.9;
      const r = Math.sqrt(1 - u * u);
      iPos.set([u * TRAP.half.x * k * 0.8, r * Math.cos(a) * TRAP.half.y * k, r * Math.sin(a) * TRAP.half.z * k, 0], i * 4);
      iP.set([1.5 + rand() * 2, 0.04, 1.6, rand()], i * 4);
    }
    const glands = new THREE.Mesh(quads(n, iPos, iP), pointsMaterial({ absorb: [0.01, 0.005, 0.012] }));
    glands.frustumCulled = false;
    body.add(glands);
    const m = 40, cPos = new Float32Array(m * 4), cP = new Float32Array(m * 4);
    for (let i = 0; i < m; i++) { cPos.set([(rand() - 0.6) * 300, (rand() - 0.8) * 120, (rand() - 0.5) * 220, 0], i * 4); cP.set([6 + rand() * 12, 0.05, 2, rand()], i * 4); }
    const caught = new THREE.Mesh(quads(m, cPos, cP), pointsMaterial({ absorb: [0.04, 0.04, 0.03] }));
    caught.frustumCulled = false;
    body.add(caught);
  }
  // the door: a flap at the front, hinged at its top
  const hinge = new THREE.Group();
  hinge.position.set(TRAP.half.x * 0.84, TRAP.doorR, 0);
  body.add(hinge);
  const door = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16), volumeMaterial({ dn: 0.022, scatter: 1.6, absorb: [0.005, 0.002, 0.006], centred: true, rimPow: 2 }));
  door.scale.set(10, TRAP.doorR, TRAP.doorR);
  door.position.set(0, -TRAP.doorR, 0);
  door.frustumCulled = false;
  hinge.add(door);
  // the trigger hairs by the door and the two branched antennae
  const hairMat = volumeMaterial({ dn: 0.03, scatter: 1.4, absorb: [0.004, 0.002, 0.004], centred: true });
  const hair = (from, to, r) => {
    const len = from.distanceTo(to);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r, len, 8), hairMat);
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    m.frustumCulled = false;
    body.add(m);
    return m;
  };
  const front = TRAP.half.x * 0.86;
  const hairs = [];
  for (const [y, z] of [[-0.5, 0.6], [-0.5, -0.6], [-0.8, 0.25], [-0.8, -0.25]]) hairs.push(hair(new THREE.Vector3(front, y * TRAP.doorR, z * TRAP.doorR), new THREE.Vector3(front + 110, y * TRAP.doorR * 1.6, z * TRAP.doorR * 1.9), 3));
  for (const z of [1, -1]) {
    const a0 = new THREE.Vector3(front, TRAP.doorR * 0.9, z * TRAP.doorR * 0.6), a1 = new THREE.Vector3(front + 160, TRAP.doorR * 2.2, z * TRAP.doorR * 1.8);
    hair(a0, a1, 6);
    for (let k = 0; k < 3; k++) { const b = a0.clone().lerp(a1, 0.4 + k * 0.25); hair(b, b.clone().add(new THREE.Vector3(60, 30 + 20 * k, z * (40 + 20 * k))), 2.5); }
  }
  // the stem it hangs from, rising away to the coverslip
  {
    const back = TRAP.centre.clone().addScaledVector(TRAP.dir, -TRAP.half.x * 0.7).setY(TRAP.centre.y + TRAP.half.y * 0.7);
    const curve = new THREE.CatmullRomCurve3([back, back.clone().addScaledVector(TRAP.dir, -220).setY(380), back.clone().addScaledVector(TRAP.dir, -700).setY(560), back.clone().addScaledVector(TRAP.dir, -1600).setY(620)]);
    const { geo } = closedTube(curve, 60, 26, 16);
    root.add(Object.assign(new THREE.Mesh(geo, volumeMaterial({ dn: 0.008, scatter: 1.2, absorb: [0.003, 0.001, 0.0035], rimPow: 3 })), { frustumCulled: false }));
  }
  // solid: you glance off the bladder and its stalk
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
      wall.scale.set(TRAP.half.x, TRAP.half.y * (1 - 0.1 * trap.set), TRAP.half.z * (1 - 0.18 * trap.set));
      hinge.rotation.z = -1.25 * trap.open + (quiver ? Math.sin(t * 55) * 0.07 * quiver : 0);
      hinge.rotation.x = quiver ? Math.sin(t * 41) * 0.05 * quiver : 0;
      for (const h of hairs) h.rotation.x = quiver ? Math.sin(t * 30 + h.position.z) * 0.08 * quiver : 0;
    },
  };
  return trap;
}
