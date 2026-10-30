// How the Paramecium moves. Low Reynolds number (S15): there is no coasting.
// Speed follows the ciliary beat within a few hundredths of a second, so the
// cell stops the moment the trigger is released, though the water around it
// still carries it. It swims along a left-handed helix while rolling about its
// long axis, oral groove toward the helix axis; the camera follows the axis.
//
// Avoidance reaction (S08): the cilia reverse, the cell backs up, pivots
// about its posterior end and swims off in a new direction. Trichocyst
// discharge (S09): a short, local burst that throws the cell away from the
// threat, with the discharged threads left behind in the water.
import * as THREE from '../shared/vendor/three.module.min.js';
import { LENGTH, MOUTH } from './cell.js';
import { DROP_R, DEPTH } from './world.js';
import { lowRe, helixPose } from '../shared/techniques/paramecium-squirmer.js';

export const VMAX = 1400; // µm/s at full beat (≈6 body lengths/s; measured cells 1–1.5 mm/s)
const TAU = 0.035; // s, beat-to-speed lag
const HELIX_PITCH = 850; // µm per turn (≈849 µm measured)
const HELIX_R = 29; // µm (≈29 µm measured)
const HL = LENGTH / 2;
const CAPSULE_R = 26, CAPSULE_HALF = HL - 28;

const fwdOf = (yaw, pitch, out = new THREE.Vector3()) => out.set(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw));
const angleWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (a, b, max) => a + Math.max(-max, Math.min(max, b - a));

export function createSwimmer(cell, world) {
  const s = {
    axis: new THREE.Vector3(-150, 320, 60),
    yaw: 0.25, pitch: 0,
    speed: 0, phi: 0, rh: 0, tilt: 0,
    beatPhase: 0, freq: 1, reverse: 1, amp: 0.6, oral: 0.3, feed: 0,
    mode: 'swim', // swim | avoid | captured | dead
    avoid: null, captor: null, captureT: 0, deadT: 0, safeT: 0,
    charges: 3, recharge: 0, burst: new THREE.Vector3(),
    center: new THREE.Vector3(), T: new THREE.Vector3(1, 0, 0), F: new THREE.Vector3(1, 0, 0),
    quat: new THREE.Quaternion(),
    U: new THREE.Vector3(), // body velocity, µm/s
    netSpeed: 0,
    axisA: new THREE.Vector3(), axisB: new THREE.Vector3(), mouth: new THREE.Vector3(),
    lastHit: '', hitCount: 0,
    inspect: false,
  };
  const prevCenter = new THREE.Vector3(), tmp = new THREE.Vector3();
  // switches (the feature panel): lowRe off = an inertial glide, for comparison
  const opts = { lowRe: true, helix: true, beatScale: 1 };

  function frame() {
    fwdOf(s.yaw, s.pitch, s.F);
    const T = helixPose(s.axis, s.F, s.phi, s.rh, s.tilt, s.center, s.quat);
    s.T.copy(T);
    s.axisA.copy(s.center).addScaledVector(s.T, -CAPSULE_HALF);
    s.axisB.copy(s.center).addScaledVector(s.T, CAPSULE_HALF);
    s.mouth.copy(MOUTH).applyQuaternion(s.quat).add(s.center);
  }

  function startAvoid(hint, stickDir) {
    if (s.mode !== 'swim') return false;
    let ty, tp;
    if (hint) {
      // bounce off the obstacle's normal, then the cell's own random-ish turn
      const r = tmp.copy(s.F).addScaledVector(hint, -2 * s.F.dot(hint)).addScaledVector(hint, 0.6).normalize();
      ty = Math.atan2(-r.z, r.x) + (Math.random() - 0.5) * 0.9;
      tp = Math.asin(Math.max(-1, Math.min(1, r.y))) * 0.8;
    } else if (stickDir) {
      ty = Math.atan2(-stickDir.z, stickDir.x); tp = s.pitch * 0.5;
    } else {
      ty = s.yaw + (Math.random() < 0.5 ? -1 : 1) * (1.1 + Math.random() * 0.9);
      tp = s.pitch * 0.4 + (Math.random() - 0.5) * 0.5;
    }
    s.avoid = { t: 0, y0: s.yaw, p0: s.pitch, y1: s.yaw + angleWrap(ty - s.yaw), p1: Math.max(-1.1, Math.min(1.1, tp)), anchor: null };
    s.mode = 'avoid';
    return true;
  }

  function respawn() {
    const a = Math.random() * Math.PI * 2, r = 300 + Math.random() * 500;
    s.axis.set(Math.cos(a) * r, 150 + Math.random() * 350, Math.sin(a) * r);
    s.mode = 'swim'; s.captor = null; s.captureT = 0; s.speed = 0; s.safeT = 3; s.charges = 3;
  }

  const api = {
    state: s, opts,
    startAvoid,
    respawn,
    /**
     * @param {number} dt
     * @param {number} t
     * @param {object} inp {thrust, hover, steer:{x,y,m}, rise, view:'scope'|'chase', avoid, burst}
     * @param {object} ev events out: {hit, burst, captured, escaped, eaten}
     */
    step(dt, t, inp, ev) {
      prevCenter.copy(s.center);
      s.safeT = Math.max(0, s.safeT - dt);
      // trichocyst recharge (an invented game rate; real re-docking takes hours)
      if (s.charges < 3) { s.recharge += dt; if (s.recharge > 7) { s.recharge = 0; s.charges++; } }

      if (s.mode === 'dead') {
        s.deadT += dt;
        if (s.deadT > 2.2) { respawn(); ev.respawned = true; }
        frame();
        return;
      }

      let targetSpeed = 0;
      let turn = 1.7 + 1.5 * inp.thrust;
      s.feed = approach(s.feed, inp.hover, dt * 4);
      if (s.mode === 'swim') {
        targetSpeed = inp.thrust * VMAX * (1 - 0.75 * inp.hover) + 35 * inp.hover;
        // steering
        const st = inp.steer;
        if (inp.view === 'scope') {
          if (st.m > 0.15) {
            const ty = Math.atan2(-st.y, st.x);
            s.yaw = approach(s.yaw, s.yaw + angleWrap(ty - s.yaw), turn * st.m * dt);
          }
          const tp = inp.rise * 0.75;
          s.pitch = approach(s.pitch, tp, (inp.rise ? 1.6 : 0.8) * dt);
        } else {
          s.yaw -= st.x * turn * dt;
          s.pitch = Math.max(-1.25, Math.min(1.25, s.pitch - st.y * turn * 0.8 * dt + inp.rise * 1.2 * dt));
        }
        if (inp.avoid) {
          const sd = inp.view === 'scope' && st.m > 0.3 ? new THREE.Vector3(st.x, 0, st.y) : null;
          if (startAvoid(null, sd)) ev.avoid = true;
        }
        s.reverse = approach(s.reverse, 1, dt * 6);
      } else if (s.mode === 'avoid') {
        const a = s.avoid;
        a.t += dt;
        if (a.t < 0.3) {
          // ciliary reversal: the stroke flips within tens of ms, the cell backs up
          s.reverse = approach(s.reverse, -1, dt * 30);
          targetSpeed = -650;
        } else if (a.t < 0.75) {
          // pivot about the posterior end
          if (!a.anchor) a.anchor = s.center.clone().addScaledVector(s.T, -HL * 0.85);
          const k = (a.t - 0.3) / 0.45, e = k * k * (3 - 2 * k);
          s.yaw = a.y0 + (a.y1 - a.y0) * e;
          s.pitch = a.p0 + (a.p1 - a.p0) * e;
          s.reverse = approach(s.reverse, 0.2, dt * 4);
          targetSpeed = 0;
        } else {
          s.mode = 'swim'; s.avoid = null;
        }
      } else if (s.mode === 'captured') {
        s.captureT += dt;
        s.reverse = Math.sin(t * 9) > 0 ? 1 : -1; // thrashing
        if (inp.avoid) s.captureT = Math.max(0, s.captureT - 0.45); // struggling buys a moment
        if (s.captureT > 4) { s.mode = 'dead'; s.deadT = 0; ev.eaten = true; if (s.captor) s.captor.sated = 14; }
      }

      // low Re: speed tracks the beat almost at once
      s.speed = lowRe(s.speed, targetSpeed, dt, opts.lowRe ? TAU : 1.4);

      // beat (displayed slower than the real 20–35 Hz so the waves can be followed)
      s.freq = s.mode === 'avoid' ? 7 : s.mode === 'captured' ? 9 : 1.3 + 5.2 * inp.thrust + 1.5 * inp.hover;
      s.beatPhase += s.freq * opts.beatScale * dt;
      s.amp = s.mode === 'swim' ? 0.55 + 0.45 * Math.max(inp.thrust, 0.3 * inp.hover) : 0.95;
      s.oral = Math.min(1, 0.35 + 0.65 * s.feed + 0.2 * inp.thrust);

      // helix and roll: one roll per helix turn (≈1.2 turns/s at 1 mm/s)
      const v = Math.abs(s.speed);
      const omega = 2 * Math.PI * (0.25 + v / HELIX_PITCH);
      s.phi -= omega * dt * (opts.helix ? 1 : 0.25);
      const rhT = s.mode === 'avoid' || s.inspect || !opts.helix ? 0 : HELIX_R * Math.min(1, 0.12 + v / 500);
      s.rh = approach(s.rh, rhT, dt * 80);
      s.tilt = approach(s.tilt, s.mode === 'avoid' || s.inspect || !opts.helix ? 0 : 0.21 * Math.min(1, v / 400), dt * 1.5);

      // move
      fwdOf(s.yaw, s.pitch, s.F);
      const flow = world.flowAt(s.axis, t);
      if (s.mode === 'avoid' && s.avoid.anchor) {
        s.axis.copy(s.avoid.anchor).addScaledVector(s.F, HL * 0.85);
        s.avoid.anchor.addScaledVector(flow, dt);
      } else if (s.mode === 'captured' && s.captor) {
        const tip = s.captor.tip;
        const dir = tmp.subVectors(s.axis, tip).normalize();
        const reel = HL * 0.95 * (1 - Math.min(1, s.captureT / 4) * 0.9);
        const goal = tip.clone().addScaledVector(dir, reel);
        s.axis.lerp(goal, 1 - Math.exp(-dt * 4));
      } else if (!s.inspect) {
        s.axis.addScaledVector(s.F, s.speed * dt).addScaledVector(flow, dt);
      }
      s.axis.addScaledVector(s.burst, dt);
      // never leave the drop, whatever pushed us
      s.axis.y = Math.max(30, Math.min(DEPTH - 30, s.axis.y));
      const rr = Math.hypot(s.axis.x, s.axis.z);
      if (rr > DROP_R - 40) s.axis.multiplyScalar(1).set(s.axis.x * (DROP_R - 40) / rr, s.axis.y, s.axis.z * (DROP_R - 40) / rr);
      if (s.inspect) s.safeT = 1;
      s.burst.multiplyScalar(Math.exp(-dt / 0.07));

      frame();

      // contact: push out, and every bump sets off the avoidance reaction
      const hit = world.collide(s.axisA, s.axisB, CAPSULE_R);
      if (hit) {
        s.axis.addScaledVector(hit.n, hit.depth);
        frame();
        if (hit.ob.ref) { if (world.touchVorticella(hit.ob.ref, t)) ev.vorticella = true; }
        if (s.mode === 'swim' && (v > 30 || hit.depth > 2)) {
          startAvoid(hit.n);
          ev.hit = hit.ob.what;
          s.lastHit = hit.ob.what; s.hitCount++;
        }
      }

      s.U.subVectors(s.center, prevCenter).divideScalar(Math.max(dt, 1e-4));
      if (s.U.length() > 4000) s.U.setLength(4000); // ignore teleports
      const net = tmp.copy(s.F).multiplyScalar(s.speed).add(flow).add(s.burst).length();
      s.netSpeed += (net - s.netSpeed) * (1 - Math.exp(-dt / 0.15));
    },
    /** Discharge trichocysts away from `threat` (a world point) or straight back. */
    burst(threat) {
      if (s.charges < 1 || s.mode === 'dead') return null;
      s.charges--; s.recharge = 0;
      const away = threat ? tmp.subVectors(s.center, threat).normalize().clone() : s.F.clone().negate();
      s.burst.addScaledVector(away, 1700);
      if (s.mode === 'captured') { s.mode = 'swim'; s.safeT = 2; if (s.captor) { s.captor.stun = 3; s.captor.released = true; } s.captor = null; s.captureT = 0; }
      return away;
    },
    release() { if (s.mode === 'captured') { s.mode = 'swim'; s.captor = null; s.captureT = 0; s.safeT = 1; } },
    capture(d) {
      if (s.mode === 'dead' || s.mode === 'captured' || s.safeT > 0) return false;
      s.mode = 'captured'; s.captor = d; s.captureT = 0; s.avoid = null;
      return true;
    },
  };
  frame();
  return api;
}
