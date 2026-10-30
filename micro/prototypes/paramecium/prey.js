// Prey worth a gulp (X): bacterial clumps (zoogloea, drifting with the water)
// and Chilomonas, a 25 µm cryptomonad flagellate that swims off and, when the
// Paramecium comes close, jumps away by firing its ejectisomes. Both are
// classic Paramecium food. They live in a box that travels with the player,
// near its depth, and are replaced out of view when eaten or left behind.
//
// [Departures, labelled in the README: Chilomonas's flagella are not drawn;
// its jump (≈150 µm at up to 1.5 mm/s) is a game value for the ejectisome
// escape, which is real in cryptomonads.]
import * as THREE from '../shared/vendor/three.module.min.js';
import { volumeMaterial, pointsMaterial } from './optics.js';
import { DEPTH } from './world.js';

const N_CLUMP = 12, PER = 26, N_CHILO = 6;
const BOX = 900;
const quadGeo = new THREE.PlaneGeometry(2, 2);

function instancedQuads(n) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = quadGeo.index; g.attributes.position = quadGeo.attributes.position;
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  const p = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
  g.setAttribute('iPos', pos); g.setAttribute('iP', p);
  g.instanceCount = n;
  return { g, pos, p };
}

export function createPrey(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const items = [];

  // bacterial clumps: a ball of rods in a faint slime matrix
  const q = instancedQuads(N_CLUMP * (PER + 1));
  for (let i = 0; i < N_CLUMP * (PER + 1); i++) {
    const matrix = i % (PER + 1) === PER;
    q.p.array.set(matrix ? [9, 0.012, 0.25, Math.random()] : [0.75, 0.08, 6, Math.random()], i * 4);
  }
  const clumps = new THREE.Mesh(q.g, pointsMaterial({ absorb: [0.06, 0.07, 0.1], rod: true }));
  clumps.frustumCulled = false;
  group.add(clumps);
  for (let i = 0; i < N_CLUMP; i++) {
    const offs = [];
    for (let k = 0; k < PER; k++) {
      let x, y, z;
      do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1; } while (x * x + y * y + z * z > 1);
      offs.push([x * 8, y * 5, z * 8]);
    }
    items.push({ kind: 'clump', name: 'bacterial clump', i, pos: new THREE.Vector3(), vel: new THREE.Vector3(), offs, r: 9, alive: false, pull: 0 });
  }

  // Chilomonas: a slipper-shaped flagellate 25 × 10 µm
  const cGeo = new THREE.SphereGeometry(1, 18, 12);
  const chilo = new THREE.InstancedMesh(cGeo, volumeMaterial({ dn: 0.03, scatter: 1.3, absorb: [0.004, 0.006, 0.011], centred: true, rimPow: 2 }), N_CHILO);
  chilo.frustumCulled = false;
  group.add(chilo);
  for (let i = 0; i < N_CHILO; i++) {
    items.push({ kind: 'chilomonas', name: 'Chilomonas', i, pos: new THREE.Vector3(), vel: new THREE.Vector3(), dir: new THREE.Vector3(1, 0, 0), r: 12, alive: false, pull: 0, jumpCool: 0, turnT: 0, roll: Math.random() * 6 });
  }

  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), tmp = new THREE.Vector3();

  function place(it, c, far) {
    // anywhere in the box, or (respawn) out of view toward its edge
    const a = Math.random() * Math.PI * 2, r = far ? BOX * (0.75 + Math.random() * 0.25) : 140 + Math.random() * BOX * 0.9;
    it.pos.set(c.x + Math.cos(a) * r, Math.max(40, Math.min(DEPTH - 40, c.y + (Math.random() - 0.5) * 110)), c.z + Math.sin(a) * r);
    it.alive = true; it.pull = 0; it.jumpCool = 0;
    if (it.dir) it.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
  }

  let started = false;
  const api = {
    group, items,
    /** Items within `reach` µm of p, nearest first. */
    near(p, reach) { return items.filter((it) => it.alive && !it.pull && it.pos.distanceTo(p) < reach).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p)); },
    nearest(p) { let b = null, bd = Infinity; for (const it of items) if (it.alive && !it.pull) { const d = it.pos.distanceTo(p); if (d < bd) { bd = d; b = it; } } return b; },
    /** Start pulling an item toward the mouth (the gulp). */
    gulp(it) { it.pull = 0.0001; },
    /**
     * @returns {{eaten: object[]}} items swallowed this frame
     */
    update(dt, t, player, flowAt) {
      const c = player.center;
      if (!started) { for (const it of items) place(it, c, false); started = true; }
      const eaten = [];
      for (const it of items) {
        if (!it.alive) { place(it, c, true); continue; }
        if (Math.hypot(it.pos.x - c.x, it.pos.z - c.z) > BOX * 1.15) { place(it, c, true); continue; }
        const f = flowAt(it.pos, t, tmp).clone();
        if (it.pull > 0) {
          // drawn into the oral groove by the gulp
          it.pull += dt;
          it.pos.lerp(player.mouth, 1 - Math.exp(-dt * 9));
          if (it.pull > 0.4 || it.pos.distanceTo(player.mouth) < 6) { it.alive = false; eaten.push(it); }
          continue;
        }
        if (it.kind === 'chilomonas') {
          it.jumpCool = Math.max(0, it.jumpCool - dt);
          it.turnT -= dt;
          if (it.turnT <= 0) { it.turnT = 0.8 + Math.random() * 1.6; it.dir.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.3, Math.random() - 0.5).normalize(); }
          const away = tmp.subVectors(it.pos, c);
          const d = away.length();
          if (d < 95 && it.jumpCool <= 0 && player.alive) {
            // ejectisome jump: backwards, away from the threat
            it.vel.copy(away.normalize()).setY(away.y * 0.3).normalize().multiplyScalar(1500);
            it.dir.copy(away);
            it.jumpCool = 2.2;
            it.jumped = t;
          }
          f.addScaledVector(it.dir, 110);
          it.roll += dt * 8;
        }
        it.vel.multiplyScalar(Math.exp(-dt / 0.08));
        it.pos.addScaledVector(f, dt).addScaledVector(it.vel, dt);
        it.pos.y = Math.max(20, Math.min(DEPTH - 20, it.pos.y));
      }
      // draw
      const A = q.pos.array;
      for (const it of items) if (it.kind === 'clump') {
        for (let k = 0; k <= PER; k++) {
          const o = (it.i * (PER + 1) + k) * 4;
          if (!it.alive) { A[o + 1] = -1e5; continue; }
          const off = k < PER ? it.offs[k] : [0, 0, 0];
          const sq = it.pull > 0 ? 1 - it.pull * 1.5 : 1;
          A[o] = it.pos.x + off[0] * sq; A[o + 1] = it.pos.y + off[1] * sq; A[o + 2] = it.pos.z + off[2] * sq; A[o + 3] = 0;
        }
      } else {
        qt.setFromUnitVectors(X, tmp.copy(it.dir).normalize());
        qt.multiply(new THREE.Quaternion().setFromAxisAngle(X, it.roll));
        sc.set(12.5, it.alive ? 5 : 0, it.alive ? 6 : 0);
        m4.compose(it.pos, qt, sc);
        chilo.setMatrixAt(it.i, m4);
      }
      q.pos.needsUpdate = true;
      chilo.instanceMatrix.needsUpdate = true;
      return { eaten };
    },
  };
  return api;
}
