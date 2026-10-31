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
import { volumeMaterial } from './optics.js';

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
  /** Fire trichocysts from the patch facing `toward`; `amount` 0..1 (1: a full discharge of up to 240 threads). */
  function discharge(state, toward, t, flow, amount = 1) {
    const samples = cell.surfaceSamples;
    const A = threads.attrs;
    let n = 0;
    const max = Math.round(240 * amount);
    for (let tries = 0; tries < 6000 && n < max; tries++) {
      const sm = samples[(Math.random() * samples.length) | 0];
      nrmW.fromArray(sm.n).applyQuaternion(state.quat);
      if (nrmW.dot(toward) < (amount < 1 ? 0.75 : 0.3)) continue;
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

  /** Toxicysts: a spray of short threads from the proboscis tip toward the prey (the strike). */
  function toxicysts(tip, toward, t) {
    const A = threads.attrs;
    for (let k = 0; k < 60; k++) {
      const i = head; head = (head + 1) % CAP;
      nrmW.set(toward.x + (Math.random() - 0.5) * 1.2, toward.y + (Math.random() - 0.5) * 1.2, toward.z + (Math.random() - 0.5) * 1.2).normalize();
      A.iBase.array.set([tip.x, tip.y, tip.z], i * 3);
      A.iNorm.array.set([nrmW.x, nrmW.y, nrmW.z], i * 3);
      A.iDir.array.set([0, 0, 0], i * 3);
      // toxicysts are ≈8–10 µm extrusomes; drawn 1.4 µm wide so they read
      A.iP.array.set([8 + Math.random() * 14, 1.4, t + Math.random() * 0.15, KIND.THREAD], i * 4);
    }
    for (const a of Object.values(A)) a.needsUpdate = true;
  }

  // --- Didinium ---
  // fight: main.js runs each Didinium's shared/predation.js createFight() and sets
  // d.fightState / d.fightT; this module turns that into motion and a posture:
  //   stalk   closes in fast, cilia girdles beating hard
  //   windup  slows almost to a stop, swings its proboscis onto you, the toxicyst
  //           tip swells and reddens, the body rears back (a clear attack posture)
  //   strike  a lunge, body stretched
  //   repelled / recover  backs off, tip fading
  //   retreat swims away from you, calm
  // A calm (not hungry) Didinium cruises with slow cilia and no tip.
  // With opts.fight off it homes and harpoons on contact, as before.
  const opts = { didinium: true, homing: true, fight: true };
  const tipGeo = new THREE.SphereGeometry(1, 14, 10);
  for (const d of world.didinia) {
    // the toxicyst battery at the proboscis tip: dense, scattering, reddish; shown in the wind-up
    const tipM = new THREE.Mesh(tipGeo, volumeMaterial({ dn: 0.07, scatter: 3.6, absorb: [0.0004, 0.022, 0.03], centred: true, rimPow: 1.3 }));
    tipM.position.set(64, 0, 0); tipM.visible = false; tipM.frustumCulled = false;
    d.group.add(tipM);
    d.tipFx = tipM;
    d.posture = 0;
  }
  // `who` is the player's swimmer, or (local multiplayer) a function d => swimmer
  // that picks the player each Didinium goes for (main.js: the one it holds, else the nearest).
  function updateDidinia(dt, t, who, ev) {
    for (const d of world.didinia) {
      const swimmer = typeof who === 'function' ? who(d) : who;
      const s = swimmer.state;
      d.group.visible = opts.didinium;
      if (!opts.didinium) { if (s.captor === d) swimmer.release(); continue; }
      d.stun = Math.max(0, (d.stun || 0) - dt);
      d.sated = Math.max(0, (d.sated || 0) - dt);
      const toP = tmp.subVectors(s.center, d.pos);
      const dist = toP.length();
      // only a hungry Didinium hunts (main.js runs its hunger: shared/predation.js)
      const canHunt = s.mode !== 'dead' && d.stun <= 0 && d.sated <= 0 && s.safeT <= 0 && d.hungry !== false;
      let desired = null, speed = 450;
      if (s.captor === d && (s.mode === 'captured' || s.mode === 'dead')) {
        d.state = s.mode === 'dead' ? (d.followSpeed ? 'swimming off with you' : 'swallowing you') : 'feeding'; speed = s.mode === 'dead' ? d.followSpeed || 0 : 0;
        desired = s.mode === 'dead' || dist < 1 ? d.dir : toP.clone().normalize();
      } else if (opts.fight && d.fightState === 'retreat') {
        // lost interest: it turns and swims off
        d.state = 'retreating'; speed = 950;
        desired = toP.clone().normalize().negate().setY(0).normalize();
      } else if (opts.fight && canHunt && dist < (opts.homing ? 480 : 0)) {
        const fs = d.fightState || 'stalk';
        desired = toP.clone().normalize();
        if (fs === 'windup') { d.state = 'winding up'; speed = 40; }
        else if (fs === 'strike') { d.state = 'striking'; speed = Math.min(2600, Math.max(0, dist - 70) / 0.1); }
        else if (fs === 'repelled') { d.state = 'repelled'; speed = -520; }
        else if (fs === 'recover') { d.state = 'recovering'; speed = 120; }
        else { d.state = 'hunting'; speed = dist > 210 ? 1050 : 260; }
      } else if (canHunt && dist < (opts.homing ? 480 : 0)) {
        // fast and nearly straight: a dash sideways makes it overshoot
        d.state = dist < 200 ? 'striking' : 'hunting'; speed = dist < 200 ? 1250 : 1050;
        desired = toP.clone().normalize();
      } else {
        d.state = d.stun > 0 ? 'stunned' : d.sated > 0 ? 'sated' : d.hungry === false ? 'not hungry' : 'wandering';
        if (d.stun > 0) speed = 200;
        d.turnT -= dt;
        if (d.turnT <= 0) {
          d.turnT = 1.5 + Math.random() * 2.5;
          d.wander = new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.4, Math.random() - 0.5).normalize();
        }
        desired = d.wander || d.dir;
        // patrol: drift back toward the player's part of the drop so encounters keep coming
        // (only while hungry: a calm or resting Didinium leaves you be)
        if (dist > 900 && d.state === 'wandering') desired = desired.clone().addScaledVector(tmp2.copy(toP).setY(0).normalize(), 0.8).normalize();
        if (d.stun > 0) desired = tmp2.subVectors(d.pos, s.center).normalize();
      }
      // keep inside the drop
      const r = Math.hypot(d.pos.x, d.pos.z);
      if (r > DROP_R - 250) desired = desired.clone().add(tmp2.set(-d.pos.x, 0, -d.pos.z).normalize().multiplyScalar(1.5)).normalize();
      if (d.pos.y < 60) desired = desired.clone().setY(Math.abs(desired.y) + 0.5).normalize();
      if (d.pos.y > DEPTH - 60) desired = desired.clone().setY(-Math.abs(desired.y) - 0.5).normalize();
      // turn toward desired
      const turnRate = d.state === 'winding up' ? 5 : d.state === 'repelled' ? 3 : d.state === 'striking' ? (opts.fight ? 3 : 1.6) : d.state === 'hunting' ? 2.2 : 1.2;
      const ang = d.dir.angleTo(desired);
      if (ang > 1e-4) {
        qa.setFromUnitVectors(d.dir, desired);
        qb.identity().slerp(qa, Math.min(1, (turnRate * dt) / ang));
        d.dir.applyQuaternion(qb).normalize();
      }
      d.speed += (speed - d.speed) * (1 - Math.exp(-dt / 0.05));
      d.pos.addScaledVector(d.dir, d.speed * dt).addScaledVector(world.flowAt(d.pos, t), dt);
      d.pos.y = Math.max(45, Math.min(DEPTH - 45, d.pos.y));
      { const rr = Math.hypot(d.pos.x, d.pos.z); if (rr > DROP_R - 60) { d.pos.x *= (DROP_R - 60) / rr; d.pos.z *= (DROP_R - 60) / rr; } }
      // obstacles push it round
      const a = tmp2.copy(d.pos).addScaledVector(d.dir, -25);
      const b = new THREE.Vector3().copy(d.pos).addScaledVector(d.dir, 30);
      const hit = world.collide(a, b, 38);
      if (hit && hit.ob.what !== 'Vorticella') d.pos.addScaledVector(hit.n, hit.depth);
      // rotate about its long axis as it swims
      d.roll += dt * (d.state === 'hunting' || d.state === 'striking' ? 10 : 6);
      d.group.position.copy(d.pos);
      d.group.quaternion.setFromUnitVectors(X, d.dir);
      d.group.quaternion.multiply(qa.setFromAxisAngle(X, d.roll));
      // the posture: calm cruising, or the attack (cilia beat hard, the proboscis aims and its tip swells)
      const atk = d.state === 'winding up' ? 1 : d.state === 'striking' ? 1 : d.state === 'hunting' ? 0.45 : d.state === 'repelled' || d.state === 'recovering' ? 0.25 : 0;
      d.posture += (atk - d.posture) * Math.min(1, dt * 8);
      d.ring.mat.uniforms.uPhase.value += dt * (d.state === 'winding up' ? 2.5 : d.state === 'hunting' || d.state === 'striking' ? 9 : 3.5);
      d.ring.mat.uniforms.uAmp.value = 0.75 + 0.5 * d.posture;
      if (d.tipFx) {
        const w = d.state === 'winding up' ? (d.fightT || 0) : d.state === 'striking' ? 1 : 0;
        const pulse = w > 0 ? 1 + 0.25 * Math.sin(t * 22) : 1;
        d.tipFx.visible = d.posture > 0.3 && w + d.posture * 0.4 > 0.25;
        d.tipFx.scale.setScalar((7 + 15 * w) * pulse * Math.max(0.3, d.posture));
        // rear back while winding up, stretch in the lunge
        if (!d.gape) {
          const sx = d.state === 'winding up' ? 1 - 0.12 * w : d.state === 'striking' ? 1.14 : 1;
          const sr = d.state === 'winding up' ? 1 + 0.08 * w : d.state === 'striking' ? 0.94 : 1;
          d.group.scale.set(sx, sr, sr);
        }
      }
      d.tip = d.tip || new THREE.Vector3();
      d.tip.copy(d.pos).addScaledVector(d.dir, 66);
      // the proboscis touches the Paramecium: toxicysts fire, it holds on
      if (!opts.fight && canHunt && s.mode !== 'captured') {
        const c = tmp.copy(d.tip);
        const seg = new THREE.Vector3();
        const ab = tmp2.subVectors(s.axisB, s.axisA);
        const k = Math.max(0, Math.min(1, c.clone().sub(s.axisA).dot(ab) / ab.lengthSq()));
        seg.copy(s.axisA).addScaledVector(ab, k);
        if (seg.distanceTo(c) < 30) {
          if (swimmer.capture(d)) { ev.captured = true; (ev.captures || (ev.captures = [])).push(swimmer); }
        }
      }
    }
  }

  return {
    opts,
    threads,
    discharge,
    toxicysts,
    update(dt, t, swimmer, ev) { updateDidinia(dt, t, swimmer, ev); },
    nearestThreat(p, within = 420) {
      let best = null, bd = within;
      for (const d of world.didinia) { if (!opts.didinium) break; const dd = d.pos.distanceTo(p); if (dd < bd) { bd = dd; best = d; } }
      return best;
    },
  };
}
