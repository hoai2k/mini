// Amoeba proteus: a slow giant on the slide (S29: 160–760 µm). It creeps
// toward the Paramecium and, when the cell swims low and close, throws two
// pseudopods round it into a food cup (S05). Stay between the arms too long
// and the cup closes: you are engulfed. A dash (A) out of the cup, or
// trichocysts (X), get you clear.
//
// The body is a flattened sphere deformed every frame by pseudopod lobes
// (bumps in direction space), drawn with the microscope's closed-body
// material, so its optical path is the real chord through it.
// [Stretch, labelled in the README: it creeps ≈10× faster than a real
// amoeba (0.5–5 µm/s) and its pseudopods extend ≈5× faster, so it can be a
// threat within a minute of play.]
import * as THREE from '../shared/vendor/three.module.min.js';
import { volumeMaterial, pointsMaterial } from './optics.js';
import { DROP_R, DEPTH } from './world.js';

const R0 = 150; // µm, body radius at rest (≈300 µm across; with pseudopods 450–600)
const H0 = 42; // µm, half-height of the flattened body
const CREEP = 38; // µm/s [stretch ×10]
const REACH_V = 140; // µm/s pseudopod extension [stretch]
const SENSE = 650; // µm: notices the cell within this
const angleWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createProteus(scene, start = new THREE.Vector3(-760, 0, -520)) {
  const group = new THREE.Group();
  scene.add(group);
  const geo = new THREE.SphereGeometry(1, 72, 28);
  const base = geo.attributes.position.array.slice();
  const body = new THREE.Mesh(geo, volumeMaterial({ dn: 0.018, scatter: 1.15, absorb: [0.0016, 0.002, 0.0028], centred: true, rimPow: 2.2 }));
  body.frustumCulled = false;
  group.add(body);

  // granules and crystals (repositioned each frame inside the current outline)
  const NG = 700;
  const gDir = new Float32Array(NG * 3), gIn = new Float32Array(NG);
  const gPos = new Float32Array(NG * 4), gP = new Float32Array(NG * 4);
  for (let i = 0; i < NG; i++) {
    const a = Math.random() * Math.PI * 2;
    gDir.set([Math.cos(a), (Math.random() - 0.5) * 1.2, Math.sin(a)], i * 3);
    gIn[i] = Math.sqrt(Math.random()) * 0.85;
    const crystal = i < 90;
    gP.set([crystal ? 1.4 : 0.6 + Math.random() * 0.8, crystal ? 0.12 : 0.06, crystal ? 1.3 : 0.4, Math.random()], i * 4);
  }
  const quad = new THREE.PlaneGeometry(2, 2);
  const gGeo = new THREE.InstancedBufferGeometry();
  gGeo.index = quad.index; gGeo.attributes.position = quad.attributes.position;
  const gAttr = new THREE.InstancedBufferAttribute(gPos, 4);
  gGeo.setAttribute('iPos', gAttr);
  gGeo.setAttribute('iP', new THREE.InstancedBufferAttribute(gP, 4));
  gGeo.instanceCount = NG;
  const granules = new THREE.Mesh(gGeo, pointsMaterial({ absorb: [0.004, 0.005, 0.007] }));
  granules.frustumCulled = false;
  group.add(granules);
  // nucleus (a disc), contractile vacuole, food vacuoles with green algae
  const sph = new THREE.SphereGeometry(1, 20, 12);
  const nucleus = new THREE.Mesh(sph, volumeMaterial({ dn: 0.014, scatter: 0.5, absorb: [0.002, 0.002, 0.0026], centred: true }));
  nucleus.scale.set(24, 9, 24);
  group.add(nucleus);
  const cv = new THREE.Mesh(sph, volumeMaterial({ dn: -0.02, scatter: 0.8, centred: true, rimPow: 1.5 }));
  group.add(cv);
  const fv = new THREE.InstancedMesh(sph, volumeMaterial({ dn: 0.02, scatter: 0.6, absorb: [0.03, 0.008, 0.032], centred: true }), 5);
  fv.frustumCulled = false;
  group.add(fv);
  const fvAt = [[0.35, 0.2], [-0.4, 0.5], [0.1, -0.45], [-0.2, -0.1], [0.5, -0.3]];

  // pseudopods: bearing (world, around +y), length, half-width (rad)
  const pods = [0, 1, 2, 3].map((i) => ({ a: i * 1.6 + 0.3, len: 40 + Math.random() * 60, target: 60, w: 0.42, role: 'free' }));
  const a = {
    group, pos: start.clone(), heading: 0.6, kind: 'amoeba', holdFor: 3, reach: 20,
    state: 'creeping', cup: 0, sated: 0, stun: 0, tip: new THREE.Vector3(), H: H0, R: R0,
    pods, label: 'Amoeba proteus',
  };
  const opts = { on: true };
  const m4 = new THREE.Matrix4();

  function radius(ux, uz) {
    const b = Math.atan2(uz, ux);
    let ext = 0;
    for (const p of pods) {
      const d = angleWrap(b - p.a);
      ext += p.len * Math.exp(-(d * d) / (2 * p.w * p.w));
    }
    return ext;
  }

  function reshape(t) {
    const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = base[i], y = base[i + 1], z = base[i + 2];
      const hz = Math.hypot(x, z) || 1e-6;
      const ext = radius(x / hz, z / hz);
      const wob = 1 + 0.04 * Math.sin(t * 0.7 + Math.atan2(z, x) * 5);
      const rr = (R0 * wob + ext * hz * hz) * hz; // pseudopods mostly at the equator
      const thin = 1 - 0.45 * Math.min(1, ext / 200);
      pos[i] = (x / hz) * rr;
      pos[i + 1] = y * H0 * thin;
      pos[i + 2] = (z / hz) * rr;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    // granules stream into the advancing pseudopods
    for (let i = 0; i < NG; i++) {
      const dx = gDir[i * 3], dz = gDir[i * 3 + 2];
      const r = (R0 + radius(dx, dz)) * gIn[i] * (0.97 + 0.03 * Math.sin(t * 1.3 + i));
      gPos[i * 4] = dx * r; gPos[i * 4 + 1] = gDir[i * 3 + 1] * H0 * 0.55 * (1 - gIn[i] * 0.4); gPos[i * 4 + 2] = dz * r; gPos[i * 4 + 3] = 0;
    }
    gAttr.needsUpdate = true;
    const p = (t / 9) % 1;
    const vr = 4 + 14 * Math.min(1, p / 0.85) * (p > 0.92 ? 0 : 1);
    cv.scale.set(vr, vr * 0.7, vr);
    cv.position.set(-Math.cos(a.heading) * R0 * 0.6, 4, Math.sin(a.heading) * R0 * 0.6);
    fvAt.forEach(([u, v], k) => { m4.makeScale(9, 7, 9).setPosition(u * R0, -3, v * R0); fv.setMatrixAt(k, m4); });
    fv.instanceMatrix.needsUpdate = true;
  }

  const tmp = new THREE.Vector3();
  a.opts = opts;
  /**
   * @returns {number} cup progress 0..1 round the player (for the HUD)
   */
  a.update = (dt, t, swimmer, ev, flowAt) => {
    const s = swimmer.state;
    group.visible = opts.on;
    a.sated = Math.max(0, a.sated - dt);
    a.stun = Math.max(0, a.stun - dt);
    const dx = s.center.x - a.pos.x, dz = s.center.z - a.pos.z;
    const dist = Math.hypot(dx, dz);
    const bear = Math.atan2(dz, dx);
    const alive = s.mode !== 'dead' && opts.on;
    const low = s.center.y < H0 * 2 + 150; // the arms reach about 150 µm up into the water
    const hunting = alive && a.sated <= 0 && a.stun <= 0 && dist < SENSE;
    const close = hunting && dist < R0 + 330 && low;
    a.state = !opts.on ? 'off' : a.stun > 0 ? 'recoiling' : a.sated > 0 ? 'digesting' : close ? 'cupping' : hunting ? 'creeping toward you' : 'creeping';

    // creep: toward the player when it senses it, otherwise wander
    if (hunting) a.heading += angleWrap(bear - a.heading) * Math.min(1, dt * 0.6);
    else a.heading += Math.sin(t * 0.13) * dt * 0.15;
    const v = a.stun > 0 ? -25 : a.sated > 0 ? 6 : CREEP;
    a.pos.x += Math.cos(a.heading) * v * dt; a.pos.z += Math.sin(a.heading) * v * dt;
    const rr = Math.hypot(a.pos.x, a.pos.z);
    if (rr > DROP_R - R0 - 200) { a.pos.x *= (DROP_R - R0 - 200) / rr; a.pos.z *= (DROP_R - R0 - 200) / rr; a.heading += Math.PI * dt; }

    // pseudopods: two arms flank the cell when cupping; otherwise a leading lobe and side lobes
    if (close) {
      const reachTo = Math.min(330, dist - R0 + 60);
      pods[0].role = pods[1].role = 'arm';
      pods[0].a += angleWrap(bear + 0.5 - a.cup * 0.32 - pods[0].a) * Math.min(1, dt * 2.5);
      pods[1].a += angleWrap(bear - 0.5 + a.cup * 0.32 - pods[1].a) * Math.min(1, dt * 2.5);
      pods[0].target = pods[1].target = reachTo;
      pods[0].w = pods[1].w = 0.3;
      pods[2].target = 20; pods[3].target = 20;
    } else {
      pods[0].role = pods[1].role = 'free';
      pods[0].a += angleWrap(a.heading - pods[0].a) * Math.min(1, dt); pods[0].target = a.sated > 0 ? 30 : 110;
      pods[1].a += angleWrap(a.heading + 1.9 - pods[1].a) * Math.min(1, dt * 0.5); pods[1].target = 50 + 30 * Math.sin(t * 0.3);
      pods[2].a += angleWrap(a.heading - 1.7 - pods[2].a) * Math.min(1, dt * 0.5); pods[2].target = 60 + 30 * Math.sin(t * 0.21 + 2);
      pods[3].a += angleWrap(a.heading + Math.PI - pods[3].a) * Math.min(1, dt * 0.5); pods[3].target = 10;
      for (const p of pods) p.w += (0.45 - p.w) * Math.min(1, dt);
    }
    for (const p of pods) p.len += Math.max(-REACH_V * dt, Math.min(REACH_V * dt, p.target - p.len));

    // the cup: between the arms, inside their reach, low enough
    let inside = false;
    if (close && s.mode === 'swim') {
      const armR = R0 + Math.min(pods[0].len, pods[1].len) * 0.95;
      const between = Math.abs(angleWrap(bear - (pods[0].a + pods[1].a) / 2)) < Math.abs(angleWrap(pods[0].a - pods[1].a)) / 2 + 0.08;
      inside = (between && dist < armR + 25) || dist < R0 * 0.9;
    }
    if (inside) a.cup = Math.min(1, a.cup + dt / (dist < R0 ? 0.7 : 1.6));
    else a.cup = Math.max(0, a.cup - dt * 0.7);
    s.slow = Math.max(s.slow * Math.exp(-dt * 4), inside ? 0.5 * a.cup : 0);
    if (a.cup >= 1 && s.mode === 'swim') {
      a.tip.set(a.pos.x, H0, a.pos.z);
      if (swimmer.capture(a)) { ev.captured = 'amoeba'; a.cup = 0; }
    }
    if (s.captor === a && s.mode === 'captured') a.tip.set(a.pos.x, H0, a.pos.z);
    void flowAt;

    group.position.set(a.pos.x, H0 * 0.92, a.pos.z);
    nucleus.position.set(Math.cos(a.heading) * -20, 0, Math.sin(a.heading) * -20);
    reshape(t);
    return a.cup;
  };
  /** Distance from p to the amoeba's edge (0 inside), for markers and defence. */
  a.edgeDist = (p) => {
    const dx = p.x - a.pos.x, dz = p.z - a.pos.z, d = Math.hypot(dx, dz);
    const r = R0 + radius(dx / (d || 1), dz / (d || 1));
    tmp.set(0, Math.max(0, p.y - H0 * 2), Math.max(0, d - r));
    return tmp.length();
  };
  a.recoil = () => { a.stun = 4; a.cup = 0; for (const p of pods) p.target = 0; };
  void DEPTH;
  return a;
}
