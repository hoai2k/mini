// Encounters: Didinium hunting, and the trichocyst threads left in the water
// after a discharge.
//
// Didinium nasutum finds prey by bumping into it while swimming fast and
// rotating; its proboscis fires toxicysts on contact and the Paramecium is
// reeled in and swallowed whole (S28, S56). Here it also homes on the player
// within about two body lengths [Departure: chemosensing is not established;
// it makes the encounter readable]. Trichocyst discharge breaks the hold
// [S09 shows this against Dileptus; against Didinium it is unverified].
import * as THREE from '../shared/vendor/three.module.min.js';
import { createStrands, KIND } from './strands.js';
import { DROP_R, DEPTH } from './world.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();

export function createEncounters(scene, world, cell) {
  // --- trichocyst threads: a ring buffer of world-space ribbons ---
  const CAP = 1600;
  const items = [];
  for (let i = 0; i < CAP; i++) items.push({ base: [0, -1e5, 0], normal: [0, 1, 0], dir: [0, 0, 0], length: 1, width: 0.7, phase: -100, kind: KIND.THREAD });
  const threads = createStrands(items, { segs: 2, dn: 0.06, scatter: 3.0 });
  scene.add(threads.mesh);
  let head = 0;

  const surfW = new THREE.Vector3(), nrmW = new THREE.Vector3();
  /** Fire ≈240 threads from the patch of pellicle facing `toward` (world dir). */
  function discharge(state, toward, t, flow) {
    const samples = cell.surfaceSamples;
    const A = threads.attrs;
    let n = 0;
    for (let tries = 0; tries < 6000 && n < 240; tries++) {
      const sm = samples[(Math.random() * samples.length) | 0];
      nrmW.fromArray(sm.n).applyQuaternion(state.quat);
      if (nrmW.dot(toward) < 0.3) continue;
      surfW.fromArray(sm.p).applyQuaternion(state.quat).add(state.center);
      const i = head; head = (head + 1) % CAP;
      A.iBase.array.set([surfW.x, surfW.y, surfW.z], i * 3);
      A.iNorm.array.set([nrmW.x, nrmW.y, nrmW.z], i * 3);
      A.iDir.array.set([flow.x / 6, flow.y / 6, flow.z / 6], i * 3);
      // extruded shafts are ≈20–40 µm; drawn 1.2 µm wide (really ≈0.1–0.2 µm)
      A.iP.array.set([20 + Math.random() * 20, 1.2, t + Math.random() * 0.02, KIND.THREAD], i * 4);
      n++;
    }
    for (const a of Object.values(A)) a.needsUpdate = true;
    return n;
  }

  // --- Didinium ---
  const opts = { didinium: true, homing: true };
  function updateDidinia(dt, t, swimmer, ev) {
    const s = swimmer.state;
    for (const d of world.didinia) {
      d.group.visible = opts.didinium;
      if (!opts.didinium) { if (s.captor === d) swimmer.release(); continue; }
      d.stun = Math.max(0, (d.stun || 0) - dt);
      d.sated = Math.max(0, (d.sated || 0) - dt);
      const toP = tmp.subVectors(s.center, d.pos);
      const dist = toP.length();
      const canHunt = s.mode !== 'dead' && d.stun <= 0 && d.sated <= 0 && s.safeT <= 0;
      let desired = null, speed = 450;
      if (s.captor === d && s.mode === 'captured') {
        d.state = 'feeding'; speed = 0;
        desired = toP.clone().normalize();
      } else if (canHunt && dist < (opts.homing ? 560 : 0)) {
        d.state = 'hunting'; speed = 1050;
        desired = toP.clone().normalize();
      } else {
        d.state = d.stun > 0 ? 'stunned' : d.sated > 0 ? 'sated' : 'wandering';
        if (d.stun > 0) speed = 200;
        d.turnT -= dt;
        if (d.turnT <= 0) {
          d.turnT = 1.5 + Math.random() * 2.5;
          d.wander = new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.4, Math.random() - 0.5).normalize();
        }
        desired = d.wander || d.dir;
        if (d.stun > 0) desired = tmp2.subVectors(d.pos, s.center).normalize();
      }
      // keep inside the drop
      const r = Math.hypot(d.pos.x, d.pos.z);
      if (r > DROP_R - 250) desired = desired.clone().add(tmp2.set(-d.pos.x, 0, -d.pos.z).normalize().multiplyScalar(1.5)).normalize();
      if (d.pos.y < 90) desired = desired.clone().setY(Math.abs(desired.y) + 0.5).normalize();
      if (d.pos.y > DEPTH - 90) desired = desired.clone().setY(-Math.abs(desired.y) - 0.5).normalize();
      // turn toward desired
      const turnRate = d.state === 'hunting' ? 2.4 : 1.2;
      const ang = d.dir.angleTo(desired);
      if (ang > 1e-4) {
        qa.setFromUnitVectors(d.dir, desired);
        qb.identity().slerp(qa, Math.min(1, (turnRate * dt) / ang));
        d.dir.applyQuaternion(qb).normalize();
      }
      d.speed += (speed - d.speed) * (1 - Math.exp(-dt / 0.05));
      d.pos.addScaledVector(d.dir, d.speed * dt).addScaledVector(world.flowAt(d.pos, t), dt);
      d.pos.y = Math.max(50, Math.min(DEPTH - 50, d.pos.y));
      { const rr = Math.hypot(d.pos.x, d.pos.z); if (rr > DROP_R - 60) { d.pos.x *= (DROP_R - 60) / rr; d.pos.z *= (DROP_R - 60) / rr; } }
      // obstacles push it round
      const a = tmp2.copy(d.pos).addScaledVector(d.dir, -25);
      const b = new THREE.Vector3().copy(d.pos).addScaledVector(d.dir, 30);
      const hit = world.collide(a, b, 38);
      if (hit && hit.ob.what !== 'Vorticella') d.pos.addScaledVector(hit.n, hit.depth);
      // rotate about its long axis as it swims
      d.roll += dt * (d.state === 'hunting' ? 10 : 6);
      d.group.position.copy(d.pos);
      d.group.quaternion.setFromUnitVectors(X, d.dir);
      d.group.quaternion.multiply(qa.setFromAxisAngle(X, d.roll));
      d.ring.mat.uniforms.uPhase.value += dt * (d.state === 'hunting' ? 7 : 4);
      d.ring.mat.uniforms.uAmp.value = 0.9;
      d.tip = d.tip || new THREE.Vector3();
      d.tip.copy(d.pos).addScaledVector(d.dir, 66);
      // the proboscis touches the Paramecium: toxicysts fire, it holds on
      if (canHunt && s.mode !== 'captured') {
        const c = tmp.copy(d.tip);
        const seg = new THREE.Vector3();
        const ab = tmp2.subVectors(s.axisB, s.axisA);
        const k = Math.max(0, Math.min(1, c.clone().sub(s.axisA).dot(ab) / ab.lengthSq()));
        seg.copy(s.axisA).addScaledVector(ab, k);
        if (seg.distanceTo(c) < 30) {
          if (swimmer.capture(d)) ev.captured = true;
        }
      }
    }
  }

  return {
    opts,
    threads,
    discharge,
    update(dt, t, swimmer, ev) { updateDidinia(dt, t, swimmer, ev); },
    nearestThreat(p, within = 420) {
      let best = null, bd = within;
      for (const d of world.didinia) { if (!opts.didinium) break; const dd = d.pos.distanceTo(p); if (dd < bd) { bd = dd; best = d; } }
      return best;
    },
  };
}
