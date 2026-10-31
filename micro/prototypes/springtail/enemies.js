// The springtail's hazards on the bog pool: the rove beetle Stenus, a water
// strider, and raindrops. Units: mm, seconds (game time, see README for the
// labelled speed scalings).
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd } from '../shared/sdf.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';

const Y = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();

/** Instanced leg segments: set(i, a, b, r) draws a tapered rod from a to b. */
function segments(n, mat, rA = 1, rB = 0.75) {
  const geo = new THREE.CylinderGeometry(rB, rA, 1, 6, 1).translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.frustumCulled = false;
  return {
    im,
    set(i, a, b, r) {
      tmpV.subVectors(b, a);
      const L = tmpV.length();
      tmpQ.setFromUnitVectors(Y, tmpV.normalize());
      tmpM.compose(a, tmpQ, tmpS.set(r, Math.max(L, 1e-4), r));
      im.setMatrixAt(i, tmpM);
    },
    done() { im.instanceMatrix.needsUpdate = true; },
  };
}

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------------- Stenus
// Stenus comma: ~5 mm, black, densely punctured, with huge bulging eyes and a
// pale spot on each elytron. It walks on the film, and when it sees prey it
// can skim at speed by releasing a surfactant from its abdomen tip (Marangoni
// propulsion). It catches springtails with its labium, shot out by blood
// pressure, the tip covered in sticky pads.
const STENUS_SURFACE = /* glsl */ `
void surface(inout Surf s) {
  vec3 lp = vLocal;
  int pid = int(vPart + 0.5);
  float pun = mNoise(lp.xz * 34.0 + lp.y * 11.0);
  s.N = normalize(s.N + vec3(pun - 0.5, 0.0, mNoise(lp.zy * 34.0) - 0.5) * 0.35);
  vec3 c = vec3(0.012, 0.012, 0.014);
  // elytral spots (S. comma)
  vec2 sp = vec2(lp.x - 0.38, abs(lp.z) - 0.24);
  if (lp.y > 0.75 && dot(sp / vec2(0.13, 0.08), sp / vec2(0.13, 0.08)) < 1.0) c = vec3(0.55, 0.4, 0.12);
  // compound eyes: faceted, dark bronze
  vec2 e = vec2(lp.x - 1.98, abs(lp.z) - 0.4);
  float eye = length(vec3(e.x, lp.y - 0.62, e.y));
  if (eye < 0.22) { c = vec3(0.05, 0.035, 0.02) * (0.6 + 0.8 * step(0.5, mNoise(lp.yz * 90.0))); s.rough = 0.2; }
  s.albedo = c; s.rough = 0.32; s.f0 = 0.05; s.sheen = 0.3; s.sheenCol = vec3(0.5, 0.52, 0.55);
  if (pid == 1) s.ao = 0.9;
}`;

function stenusParts() {
  const P = [];
  P.push({ id: 0, sdf: sd.ellipsoid([1.95, 0.6, 0], [0.34, 0.28, 0.4]) });
  P.push({ id: 0, sdf: sd.mirrorZ(sd.sphere([1.98, 0.62, 0.38], 0.2)), blend: 0.06 });
  P.push({ id: 0, sdf: sd.mirrorZ(sd.roundCone([2.25, 0.5, 0.08], [2.4, 0.42, 0.04], 0.07, 0.04)), blend: 0.04 });
  P.push({ id: 0, sdf: sd.ellipsoid([1.62, 0.6, 0], [0.12, 0.14, 0.15]), blend: 0.05 });
  P.push({ id: 0, sdf: sd.roundCone([1.55, 0.62, 0], [0.95, 0.66, 0], 0.27, 0.29), blend: 0.06 });
  P.push({ id: 0, sdf: sd.roundBox([0.42, 0.66, 0], [0.42, 0.24, 0.42], 0.17), blend: 0.05 });
  for (const s of [-1, 1]) {
    P.push({ id: 0, sdf: sd.roundCone([2.2, 0.72, s * 0.17], [2.55, 0.95, s * 0.36], 0.035, 0.03), blend: 0.02 });
    P.push({ id: 0, sdf: sd.roundCone([2.55, 0.95, s * 0.36], [2.85, 1.0, s * 0.5], 0.03, 0.055), blend: 0.01 });
  }
  // abdomen: cylindrical, ringed, tapering, held slightly up (bone 1)
  const ab = [[-0.1, 0.36], [-0.5, 0.36], [-0.9, 0.34], [-1.3, 0.31], [-1.7, 0.27], [-2.05, 0.21], [-2.35, 0.13]];
  ab.forEach(([x, r]) => P.push({ id: 1, sdf: sd.ellipsoid([x, 0.62 + (-x) * 0.04, 0], [0.22, r * 0.86, r]), blend: 0.05 }));
  P.push({ id: 1, sdf: sd.mirrorZ(sd.roundCone([-2.4, 0.72, 0.05], [-2.62, 0.75, 0.08], 0.04, 0.025)), blend: 0.02 });
  return P;
}

export function createStenus(scene) {
  const group = new THREE.Group();
  const mat = litMaterial({ surface: STENUS_SURFACE, skin: 2 });
  const body = new THREE.Mesh(buildSdfMesh(stenusParts(), { min: [-2.8, 0.1, -0.7], max: [3.0, 1.2, 0.7], cell: 0.035 }), mat);
  body.frustumCulled = false;
  group.add(body);
  const legMat = litMaterial({ surface: 's.albedo = vec3(0.03, 0.022, 0.016); s.rough = 0.35; s.f0 = 0.05; s.sheen = 0.2;' });
  const legs = segments(12, legMat);
  scene.add(legs.im);
  // labium: a long rod with two sticky pads at the tip
  const labGeo = buildSdfMesh([
    { id: 0, sdf: sd.roundCone([0, 0, 0], [0.92, 0, 0], 0.06, 0.04) },
    { id: 0, sdf: sd.mirrorZ(sd.ellipsoid([0.98, 0, 0.05], [0.08, 0.06, 0.07])), blend: 0.04 },
  ], { min: [-0.1, -0.12, -0.17], max: [1.12, 0.12, 0.17], cell: 0.02 });
  const lab = new THREE.Mesh(labGeo, litMaterial({ surface: `s.albedo = mix(vec3(0.12, 0.06, 0.04), vec3(0.55, 0.35, 0.25), smoothstep(0.85, 0.95, vLocal.x)); s.rough = mix(0.4, 0.05, smoothstep(0.85, 0.95, vLocal.x)); s.f0 = 0.04;` }));
  lab.frustumCulled = false;
  group.add(lab);
  // mandibles: a pair of curved, toothed blades either side of the mouth that
  // open while the labium is out and work at the prey while it is eaten
  const mandMat = litMaterial({ surface: 's.albedo = vec3(0.09, 0.04, 0.02); s.rough = 0.25; s.f0 = 0.06; s.sheen = 0.2;' });
  const mands = [-1, 1].map((s) => {
    const m = new THREE.Mesh(buildSdfMesh([
      { id: 0, sdf: sd.roundCone([0, 0, 0], [0.3, -0.02, s * 0.04], 0.07, 0.045) },
      { id: 0, sdf: sd.roundCone([0.3, -0.02, s * 0.04], [0.42, -0.04, -s * 0.1], 0.045, 0.018), blend: 0.03 },
      { id: 0, sdf: sd.sphere([0.22, -0.03, -s * 0.02], 0.035), blend: 0.02 },
    ], { min: [-0.1, -0.14, -0.2], max: [0.5, 0.1, 0.2], cell: 0.012 }), mandMat);
    m.frustumCulled = false;
    m.position.set(2.2, 0.46, s * 0.15);
    group.add(m);
    return m;
  });
  scene.add(group);
  const bones = mat.uniforms.uBones.value;

  const st = {
    x: -18, z: 8, a: 0.3, v: 0, state: 'patrol', t: 0, reach: 2.2, ext: 0, skimCool: 0, gait: 0, wp: 0, seen: 0,
    alert: 0, hit: false, tailDown: 0, windup: 0, enabled: true, ox: 0, oz: 0, chew: 0, lift: 0,
  };
  const ROUTE = [[-18, 8], [-4, 14], [10, 14], [22, -2], [8, -18], [-12, -16], [-24, -2]];
  const hips = [[1.45, 0.48, 0.22], [1.1, 0.45, 0.28], [0.75, 0.45, 0.3]];
  const footRest = [[2.3, 0, 1.15], [0.9, 0, 1.5], [-0.7, 0, 1.4]];
  const feetW = [];

  function headPos() { return new THREE.Vector3(st.x + Math.cos(st.a) * 2.35, 0.45, st.z + Math.sin(st.a) * 2.35); }
  function labTip() { return new THREE.Vector3(st.x + Math.cos(st.a) * (2.1 + st.ext * st.reach), 0.25, st.z + Math.sin(st.a) * (2.1 + st.ext * st.reach)); }

  /**
   * ctx: { dt, player: {x, y, z, airborne, hunker, moving, alive}, field, inPool, hungry }
   * Only a hungry beetle (ctx.hungry, see shared/predation.js) notices prey;
   * a resting one patrols past you. Returns events: 'spotted', 'skim',
   * 'windup', 'strike', 'caught', 'miss' (a strike that found nothing), 'sated'
   * (hunger passed mid-stalk).
   */
  function update(dt, ctx) {
    const ev = [];
    st.t += dt;
    st.skimCool = Math.max(0, st.skimCool - dt);
    const P = ctx.player;
    const dx = P.x - st.x, dz = P.z - st.z;
    const dist = Math.hypot(dx, dz);
    const toP = Math.atan2(dz, dx);
    const ang = Math.abs(wrapAngle(toP - st.a));
    const headD = dist - 2.35;
    const hungry = ctx.hungry !== false;
    const canSee = hungry && st.enabled && P.alive && dist < 17 && ang < 1.3 && (P.moving || dist < 8) && P.y < 3;
    if (canSee) st.seen = 1.5; else st.seen = Math.max(0, st.seen - dt);
    let targetA = st.a, targetV = 0;
    switch (st.state) {
      case 'patrol': {
        const wx = ROUTE[st.wp][0] + st.ox, wz = ROUTE[st.wp][1] + st.oz;
        if (Math.hypot(wx - st.x, wz - st.z) < 2) st.wp = (st.wp + 1) % ROUTE.length;
        targetA = Math.atan2(wz - st.z, wx - st.x);
        targetV = 6;
        if (st.seen > 0) { st.state = 'stalk'; st.t = 0; ev.push('spotted'); }
        break;
      }
      case 'stalk': {
        targetA = toP; targetV = 7;
        if (!hungry) { st.state = 'patrol'; st.seen = 0; ev.push('sated'); break; }
        if (st.seen <= 0) { st.state = 'patrol'; break; }
        if (headD > 4.5 && st.skimCool <= 0 && ang < 0.35) { st.state = 'skim'; st.t = 0; ev.push('skim'); }
        else if (headD < st.reach * 0.85 && !P.airborne) { st.state = 'windup'; st.t = 0; ev.push('windup'); }
        break;
      }
      case 'skim': {
        // Marangoni propulsion: surfactant from the abdomen tip lowers the
        // surface tension behind, the film ahead pulls the beetle forward
        const lead = 0.25;
        targetA = Math.atan2(P.z + (P.vz || 0) * lead - st.z, P.x + (P.vx || 0) * lead - st.x);
        targetV = 55;
        const tx = st.x - Math.cos(st.a) * 2.6, tz = st.z - Math.sin(st.a) * 2.6;
        if (ctx.inPool(tx, tz)) { ctx.field.release(tx, tz, 0.9, 0.5 * dt * 60 * 0.2); ctx.field.drop(tx, tz, 0.5, -0.02); }
        if (st.t > 1.3 || headD < 3.0 || !ctx.inPool(st.x + Math.cos(st.a) * 3, st.z + Math.sin(st.a) * 3)) {
          st.state = 'stalk'; st.t = 0; st.skimCool = 3.5;
        }
        break;
      }
      case 'windup': {
        // head lowers, labium cocked: the telegraph (dodge now)
        targetA = toP; targetV = 0;
        st.windup = Math.min(1, st.t / 0.45);
        if (st.t > 0.45) { st.state = 'strike'; st.t = 0; st.hit = false; ev.push('strike'); }
        break;
      }
      case 'strike': {
        targetV = 0;
        // out in 0.06 s (real: a few ms), hold, retract
        st.ext = st.t < 0.06 ? st.t / 0.06 : st.t < 0.16 ? 1 : Math.max(0, 1 - (st.t - 0.16) / 0.25);
        if (!st.hit && st.ext > 0.6) {
          const tip = labTip();
          const d = Math.hypot(tip.x - P.x, tip.z - P.z);
          if (d < 0.55 && P.y < 0.9 && P.alive) { st.hit = true; ev.push('caught'); }
        }
        if (st.t > 0.42) { if (!st.hit) ev.push('miss'); st.state = 'recover'; st.t = 0; st.windup = 0; st.ext = 0; }
        break;
      }
      case 'recover': {
        targetA = st.a + 0.6; targetV = 4;
        if (st.t > 1.6) { st.state = st.seen > 0 ? 'stalk' : 'patrol'; st.t = 0; }
        break;
      }
      case 'capture': targetV = 0; st.v *= Math.exp(-dt * 10); break; // posed by captureStep
    }
    if (st.state === 'capture') { pose(); return ev; }
    if (st.state !== 'strike') st.ext = Math.max(0, st.ext - dt * 4);
    if (st.state !== 'windup' && st.state !== 'strike') st.windup = Math.max(0, st.windup - dt * 3);
    st.chew = Math.max(st.ext > 0.3 ? 0.8 : 0, st.chew - dt * 3);
    st.lift = Math.max(0, st.lift - dt * 2);
    // steer and move
    const turn = st.state === 'skim' ? 2.5 : 3.5;
    st.a += Math.max(-turn * dt, Math.min(turn * dt, wrapAngle(targetA - st.a)));
    st.v += (targetV - st.v) * Math.min(1, dt * (targetV > st.v ? 4 : 3));
    const nx = st.x + Math.cos(st.a) * st.v * dt, nz = st.z + Math.sin(st.a) * st.v * dt;
    if (ctx.inPool(nx, nz)) { st.x = nx; st.z = nz; } else { st.a += 2.0 * dt * 3; st.v *= 0.5; }
    if (st.state !== 'skim' && st.v > 1) ctx.field.drop(st.x + Math.cos(st.a) * 2.4, st.z + Math.sin(st.a) * 2.4, 0.3, -0.004 * st.v);
    st.tailDown += ((st.state === 'skim' ? 1 : 0) - st.tailDown) * Math.min(1, dt * 8);
    st.gait += (st.state === 'skim' ? 0 : st.v * dt) / 1.4;
    pose();
    return ev;
  }

  const pivot = new THREE.Vector3(-0.1, 0.62, 0);
  function pose() {
    group.position.set(st.x, 0, st.z);
    group.rotation.set(0, -st.a, 0);
    group.updateMatrixWorld(true);
    // head and thorax dip in the wind-up
    bones[0].makeRotationZ(-st.windup * 0.12 + st.lift * 0.1);
    // mandibles open (chew 1) and close (0) about their bases
    mands.forEach((m, k) => { const s = k ? 1 : -1; m.rotation.set(0, -s * (st.chew * 0.75 - 0.15), 0); m.position.y = 0.46 - st.windup * 0.06 + st.lift * 0.08; });
    // abdomen: tail down onto the film while skimming, raised otherwise
    tmpM.makeTranslation(pivot.x, pivot.y, pivot.z);
    tmpM.multiply(new THREE.Matrix4().makeRotationZ(0.12 - st.tailDown * 0.32)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
    bones[1].copy(tmpM);
    lab.position.set(2.0, 0.36 - st.windup * 0.05, 0);
    lab.scale.set(Math.max(0.12, st.ext * st.reach), 1, 1);
    lab.visible = st.ext > 0.01 || st.windup > 0.05;
    // legs: an alternating tripod while walking, held out while skimming
    feetW.length = 0;
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
      const i = k * 2 + (s > 0 ? 1 : 0);
      const ph = (st.gait + ((k + (s > 0 ? 1 : 0)) % 2) * 0.5) % 1;
      const sw = ph < 0.5 ? Math.sin(ph * 2 * Math.PI) : 0;
      const stride = Math.min(1, st.v / 6) * (st.state === 'skim' ? 0 : 1);
      const fx = footRest[k][0] + (ph < 0.5 ? -0.35 + ph * 1.4 : 0.35 - (ph - 0.5) * 1.4) * stride;
      const hip = new THREE.Vector3(hips[k][0], hips[k][1], s * hips[k][2]).applyMatrix4(group.matrixWorld);
      const foot = new THREE.Vector3(fx, sw * 0.25 * stride, s * footRest[k][2]).applyMatrix4(group.matrixWorld);
      const knee = hip.clone().lerp(foot, 0.55);
      knee.y += 0.28;
      tmpV.set(Math.cos(st.a + Math.PI / 2) * s * 0.0, 0, 0);
      legs.set(i * 2, hip, knee, 0.075);
      legs.set(i * 2 + 1, knee, foot, 0.055);
      if (foot.y < 0.05) feetW.push(foot);
    }
    legs.done();
  }
  pose();

  return {
    st, group, legs,
    update, headPos, labTip,
    /** Film contacts for the dimple shader: [x, z, r, depth]. */
    contacts() {
      const c = feetW.map((f) => [f.x, f.z, 0.09, 0.09]);
      if (st.tailDown > 0.5) c.push([st.x - Math.cos(st.a) * 2.55, st.z - Math.sin(st.a) * 2.55, 0.12, 0.08]);
      return c;
    },
    setVisible(v) { group.visible = v; legs.im.visible = v; },
    /**
     * Drive the catch (shared/predation.js createCapture phases) and return the
     * springtail's pose for it: { x, y, z, heading, pitch, roll, scale, flail }.
     * prey: { x0, z0, h0 } where it was caught. The labium shoots out and sticks
     * (strike), reels the struggling springtail in (hold), then the mandibles
     * work while it is drawn into the mouth (eat), and the beetle chews (eaten).
     */
    captureStep(phase, u, dt, prey) {
      st.state = 'capture'; st.v = 0; st.t += dt;
      const T = st.t, fx = Math.cos(st.a), fz = Math.sin(st.a);
      const ease = (x) => x * x * (3 - 2 * x);
      const d0 = Math.max(2.4, Math.hypot(prey.x0 - st.x, prey.z0 - st.z));
      const reach = d0 - 2.1 - 0.3; // labium length that puts the pads on the springtail's side
      // keep facing the prey while it is held out on the labium
      if (phase === 'strike' || phase === 'hold') st.a += wrapAngle(Math.atan2(prey.z0 - st.z, prey.x0 - st.x) - st.a) * Math.min(1, dt * 8);
      let len = 0;
      const out = { x: prey.x0, y: 0, z: prey.z0, heading: prey.h0, pitch: 0, roll: 0, scale: 1, flail: 1 };
      if (phase === 'strike') {
        const k = Math.min(1, u / 0.3);
        len = reach * ease(k);
        st.windup = 1 - 0.5 * k; st.chew = 0.4 + 0.6 * k; st.lift = 0;
        // the pads hit: a jolt along the strike
        const j = k >= 1 ? Math.sin(Math.min(1, (u - 0.3) / 0.3) * Math.PI) * 0.18 : 0;
        out.x += fx * j; out.z += fz * j;
        out.roll = Math.sin(T * 21) * 0.35 * (k >= 1 ? 1 : 0);
        out.heading = prey.h0 + Math.sin(T * 17) * 0.25 * (k >= 1 ? 1 : 0);
      } else if (phase === 'hold') {
        const e = ease(u);
        len = reach * (1 - e) + 0.15 * e;
        st.windup = 0.5 * (1 - e); st.lift = e; st.chew = 0.85 + 0.15 * Math.sin(T * 9);
        const tip = 2.1 + len;
        out.x = st.x + fx * (tip + 0.3); out.z = st.z + fz * (tip + 0.3);
        out.y = 0.05 + 0.28 * e;
        // struggling on the end of the labium: twisting, rolling, legs and antennae flailing
        out.heading = prey.h0 + Math.sin(T * 13) * 0.5 + wrapAngle(st.a + Math.PI - prey.h0) * e * 0.6;
        out.roll = Math.sin(T * 19) * 0.6;
        out.pitch = Math.sin(T * 11 + 1) * 0.25;
      } else if (phase === 'eat') {
        const e = ease(u);
        len = 0.15 * (1 - u);
        st.windup = 0; st.lift = 1;
        // the mandibles slice in a fast rhythm, the springtail shrinks into the mouth head first
        st.chew = 0.5 + 0.5 * Math.sin(T * 15);
        const s = 1 - 0.94 * e;
        const mx = st.x + fx * 2.55, mz = st.z + fz * 2.55;
        out.scale = s;
        out.heading = st.a + Math.PI;
        out.x = mx + fx * 0.72 * s; out.z = mz + fz * 0.72 * s;
        out.y = 0.33 + 0.05 * (1 - e) + Math.sin(T * 15) * 0.03 * s;
        out.pitch = 0.25 * (1 - e) + Math.sin(T * 15) * 0.08;
        out.roll = Math.sin(T * 9) * 0.3 * (1 - u);
        out.flail = 1 - 0.8 * u;
      } else {
        // eaten: a few slow chews, then still
        st.lift = Math.max(0, st.lift - dt * 0.5);
        st.chew = 0.5 + 0.5 * Math.sin(T * 6) * Math.max(0, 1 - u * 0.4);
        out.scale = 0; out.flail = 0;
      }
      st.ext = len / st.reach;
      pose();
      return out;
    },
    /** Where the beetle's mouth is (for the camera). */
    mouthPos() { return new THREE.Vector3(st.x + Math.cos(st.a) * 2.5, 0.4, st.z + Math.sin(st.a) * 2.5); },
    reset() { Object.assign(st, { x: -18, z: 8, a: 0.3, v: 0, state: 'patrol', t: 0, ext: 0, skimCool: 2, wp: 0, seen: 0, windup: 0, ox: 0, oz: 0, chew: 0, lift: 0 }); pose(); },
    /** Move the patrol route (and the beetle, unseen) so it centres on (x, z). */
    relocate(x, z) { Object.assign(st, { ox: x, oz: z, x: ROUTE[0][0] + x, z: ROUTE[0][1] + z, wp: 1, state: 'patrol', t: 0, skimCool: 2, seen: 0, windup: 0, ext: 0, chew: 0, lift: 0 }); pose(); },
    /** Where relocate(x, z) would put the beetle. */
    startFor(x, z) { return { x: ROUTE[0][0] + x, z: ROUTE[0][1] + z }; },
  };
}

// ---------------------------------------------------------------- water strider
// Gerris: ~9 mm, long middle legs that row and hind legs that steer, standing
// on six dimples. Striders find prey trapped on the film by the ripples it
// makes, and row toward them.
export function createStrider(scene) {
  const group = new THREE.Group();
  const mat = litMaterial({ surface: `
    float n = mNoise(vLocal.xz * 8.0);
    float ventral = smoothstep(0.75, 0.55, vLocal.y);
    s.albedo = mix(vec3(0.045, 0.035, 0.025), vec3(0.32, 0.33, 0.34), ventral) * (0.8 + 0.4 * n);
    if (vLocal.y > 0.95 && abs(vLocal.z) < 0.08 && vLocal.x > -1.0) s.albedo = vec3(0.2, 0.15, 0.08);
    s.rough = mix(0.45, 0.8, ventral); s.sheen = 0.6 * ventral + 0.2; s.sheenCol = vec3(0.6, 0.62, 0.66);` });
  const body = new THREE.Mesh(buildSdfMesh([
    { id: 0, sdf: sd.ellipsoid([3.55, 0.95, 0], [0.55, 0.3, 0.32]) },
    { id: 0, sdf: sd.mirrorZ(sd.sphere([3.7, 1.02, 0.3], 0.2)), blend: 0.08 },
    { id: 0, sdf: sd.roundCone([3.9, 0.85, 0], [4.4, 0.55, 0], 0.08, 0.04), blend: 0.08 },
    { id: 0, sdf: sd.ellipsoid([1.6, 0.85, 0], [1.6, 0.4, 0.55]), blend: 0.15 },
    { id: 0, sdf: sd.ellipsoid([-1.7, 0.78, 0], [2.0, 0.28, 0.42]), blend: 0.25 },
    { id: 0, sdf: sd.mirrorZ(sd.roundCone([3.9, 1.05, 0.12], [5.4, 1.35, 0.6], 0.06, 0.05)), blend: 0.04 },
  ], { min: [-4.0, 0.3, -1.0], max: [5.6, 1.6, 1.0], cell: 0.06 }), mat);
  body.frustumCulled = false;
  group.add(body);
  scene.add(group);
  const legMat = litMaterial({ surface: 's.albedo = vec3(0.07, 0.05, 0.035); s.rough = 0.5; s.sheen = 0.4; s.sheenCol = vec3(0.5);' });
  const legs = segments(18, legMat);
  scene.add(legs.im);
  const st = { x: 22, z: 12, a: Math.PI, v: 0, vx: 0, vz: 0, stroke: 1, strokeT: 0, state: 'idle', target: null, interest: 0, t: 0, enabled: true, grab: 0, grabL: [4.6, 0.25, 0.3], bob: 0, hx: 0, hz: 0 };
  const L = {
    fore: { hip: [2.9, 0.75, 0.35], knee: [3.9, 1.7, 1.3], foot: [5.0, 0.4, 1.4] },
    mid: { hip: [1.2, 0.7, 0.5], knee: [2.4, 3.2, 5.0], foot: [-0.5, 0, 10.0], tip: [-4.5, 0, 11.0] },
    hind: { hip: [0.7, 0.7, 0.45], knee: [-2.4, 2.3, 3.0], foot: [-7.5, 0, 5.0], tip: [-10.0, 0, 5.6] },
  };
  const contacts = [];
  const W = (p, s) => new THREE.Vector3(p[0], p[1], s * p[2]).applyMatrix4(group.matrixWorld);

  function pose() {
    group.position.set(st.x, st.bob, st.z);
    group.rotation.set(0, -st.a, 0);
    group.updateMatrixWorld(true);
    contacts.length = 0;
    let i = 0;
    // the row: mid legs sweep back (stroke 0 -> 1), then recover forward in the air
    const u = st.stroke;
    const sweep = u < 1 ? -0.5 + u : 0.5 - Math.min(1, st.strokeT * 3);
    const lifted = u >= 1 && st.strokeT < 0.33;
    for (const s of [-1, 1]) {
      for (const name of ['fore', 'mid', 'hind']) {
        const l = L[name];
        let foot = l.foot, tip = l.tip;
        // the forelegs (raptorial) close on prey
        if (name === 'fore' && st.grab > 0) foot = l.foot.map((v, j) => v + (st.grabL[j] - v) * st.grab);
        if (name === 'mid') {
          const up = lifted ? 0.6 : 0;
          foot = [l.foot[0] - sweep * 3, up, l.foot[2]];
          tip = [l.tip[0] - sweep * 3.5, up, l.tip[2]];
        }
        const h = W(l.hip, s), k = W(l.knee, s), f = W(foot, s);
        legs.set(i++, h, k, 0.13);
        legs.set(i++, k, f, 0.1);
        if (tip) {
          const t = W(tip, s);
          legs.set(i++, f, t, 0.07);
          if (f.y < 0.1) { contacts.push([f.x, f.z, 0.32, 0.28]); contacts.push([t.x, t.z, 0.28, 0.2]); contacts.push([(f.x + t.x) / 2, (f.z + t.z) / 2, 0.3, 0.24]); }
        } else legs.set(i++, f, f.clone().add(new THREE.Vector3(0.2, -0.1, 0)), 0.06);
      }
    }
    legs.done();
  }
  pose();

  /**
   * ctx: { dt, player, field, inPool, ripples: [{x, z, strength}], hungry }
   * Only a hungry strider (shared/predation.js) answers ripples or grabs;
   * a resting one rows idly about its home water. Events: 'heard', 'stroke',
   * 'caught', 'lost' (gave up a hunt).
   */
  function update(dt, ctx) {
    const ev = [];
    st.t += dt;
    if (!st.enabled) return ev;
    if (st.state === 'capture') { st.v = 0; pose(); return ev; }
    const hungry = ctx.hungry !== false;
    if (!hungry && st.state === 'hunt') { st.state = 'idle'; st.target = null; st.interest = 0; ev.push('lost'); }
    if (hungry) for (const r of ctx.ripples) {
      const d = Math.hypot(r.x - st.x, r.z - st.z);
      if (d < 22 * r.strength && ctx.player.alive) { st.target = { x: r.x, z: r.z }; st.interest = 4; st.state = 'hunt'; ev.push('heard'); }
    }
    st.interest -= dt;
    if (st.interest <= 0 && st.state === 'hunt') { st.state = 'idle'; st.target = null; ev.push('lost'); }
    const P = ctx.player;
    let goal = null;
    if (st.state === 'hunt') {
      // keep homing on the source while it keeps rippling; follow the player when close
      // it feels the prey's ripples: a moving springtail is tracked, a still one is not
      if (Math.hypot(P.x - st.x, P.z - st.z) < 10 && P.alive && P.moving && !P.hunker) st.target = { x: P.x, z: P.z };
      goal = st.target;
      if (Math.hypot(goal.x - st.x - Math.cos(st.a) * 4, goal.z - st.z - Math.sin(st.a) * 4) < 1.5) { st.state = 'idle'; st.target = null; goal = null; }
    } else if (st.state === 'idle' && st.t % 9 < dt) goal = { x: st.hx + (Math.random() - 0.5) * 40, z: st.hz + (Math.random() - 0.5) * 30 }, st.target = goal;
    else goal = st.target;
    if (goal) {
      const ta = Math.atan2(goal.z - st.z, goal.x - st.x);
      st.a += Math.max(-2 * dt, Math.min(2 * dt, wrapAngle(ta - st.a)));
      const d = Math.hypot(goal.x - st.x, goal.z - st.z);
      st.strokeT += dt;
      const period = st.state === 'hunt' ? 0.75 : 1.5;
      if (st.strokeT > period && d > 3 && Math.abs(wrapAngle(ta - st.a)) < 0.6) {
        st.strokeT = 0; st.stroke = 0;
        ev.push('stroke');
      }
    }
    if (st.stroke < 1) {
      st.stroke = Math.min(1, st.stroke + dt / 0.12);
      st.v += (st.state === 'hunt' ? 170 : 110) * dt;
      // the rowing legs push vortices and waves off the film
      for (const s of [-1, 1]) {
        const f = new THREE.Vector3(-0.5 - (st.stroke - 0.5) * 3, 0, s * 10).applyMatrix4(group.matrixWorld);
        if (ctx.inPool(f.x, f.z)) ctx.field.drop(f.x, f.z, 0.9, -0.09 * (st.state === 'hunt' ? 1.6 : 1));
      }
    }
    st.v *= Math.exp(-dt * 2.2);
    const nx = st.x + Math.cos(st.a) * st.v * dt, nz = st.z + Math.sin(st.a) * st.v * dt;
    if (ctx.inPool(nx, nz)) { st.x = nx; st.z = nz; } else { st.v *= 0.3; st.a += Math.PI * dt; }
    // grab with the forelegs
    const hx = st.x + Math.cos(st.a) * 4.6, hz = st.z + Math.sin(st.a) * 4.6;
    if (hungry && P.alive && !P.airborne && !(P.hunker && !P.moving) && Math.hypot(P.x - hx, P.z - hz) < 1.2) ev.push('caught');
    pose();
    return ev;
  }
  return {
    st, group, update, contacts: () => contacts,
    setVisible(v) { group.visible = v; legs.im.visible = v; },
    reset() { Object.assign(st, { x: 22, z: 12, a: Math.PI, v: 0, stroke: 1, strokeT: 0, state: 'idle', target: null, interest: 0, hx: 0, hz: 0, grab: 0, bob: 0 }); pose(); },
    /**
     * Drive the catch and return the springtail's pose (see Stenus.captureStep).
     * The raptorial forelegs snap shut on it (strike), lift it, kicking, to the
     * rostrum (hold), the rostrum pierces and sucks it dry while the strider
     * pumps (eat), and drops the empty husk (eaten).
     */
    captureStep(phase, u, dt, prey) {
      st.state = 'capture'; st.v = 0; st.t += dt;
      const T = st.t, ease = (x) => x * x * (3 - 2 * x);
      const L = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
      const ta = Math.atan2(prey.z0 - st.z, prey.x0 - st.x);
      if (phase === 'strike') st.a += wrapAngle(ta - st.a) * Math.min(1, dt * 10);
      const out = { x: prey.x0, y: 0, z: prey.z0, heading: prey.h0, pitch: 0, roll: 0, scale: 1, sy: 1, flail: 1 };
      let at = null;
      if (phase === 'strike') {
        const k = ease(Math.min(1, u / 0.5));
        st.grab = k; st.grabL = [4.6, 0.2, 0.3]; st.bob = 0;
        pose();
        const g = L(4.6, 0.12, 0);
        out.x = prey.x0 + (g.x - prey.x0) * k; out.z = prey.z0 + (g.z - prey.z0) * k; out.y = 0.1 * k;
        out.roll = Math.sin(T * 20) * 0.4 * k;
      } else if (phase === 'hold') {
        const e = ease(u);
        at = [4.6 - 0.1 * e, 0.12 + 0.18 * e, 0];
        st.grab = 1; st.grabL = [at[0], at[1] + 0.08, 0.28]; st.bob = 0.05 * e;
        out.heading = st.a + Math.PI / 2 + Math.sin(T * 12) * 0.5;
        out.roll = Math.sin(T * 18) * 0.7; out.pitch = Math.sin(T * 10) * 0.3;
      } else if (phase === 'eat') {
        // impaled on the rostrum tip and sucked dry: it shrivels and goes still
        const e = ease(u);
        at = [4.5, 0.3, 0];
        st.grab = 1; st.grabL = [4.5, 0.38, 0.26]; st.bob = 0.05 + Math.sin(T * 7) * 0.035;
        out.heading = st.a + Math.PI / 2; out.pitch = 0.2;
        out.scale = 1 - 0.45 * e; out.sy = 1 - 0.55 * e;
        out.roll = Math.sin(T * 14) * 0.25 * (1 - u);
        out.flail = 1 - u;
      } else {
        st.grab = Math.max(0, st.grab - dt * 1.5); st.bob *= Math.exp(-dt * 3);
        out.scale = 0; out.flail = 0;
      }
      pose();
      if (at) { const p = L(...at); out.x = p.x; out.y = p.y - 0.25 * out.scale; out.z = p.z; }
      return out;
    },
    mouthPos() { return new THREE.Vector3(st.x + Math.cos(st.a) * 4.3, 0.5, st.z + Math.sin(st.a) * 4.3); },
    /** Move the strider (unseen) to (x, z) and make that its home water. */
    relocate(x, z) { Object.assign(st, { x, z, hx: x, hz: z, v: 0, state: 'idle', target: null, interest: 0 }); pose(); },
  };
}

// ---------------------------------------------------------------- raindrops
const DROP_SURFACE = /* glsl */ `
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 T = refract(-V, s.N, 0.75);
  s.albedo = vec3(0.0); s.rough = 0.02; s.f0 = 0.02; s.ao = 1.0;
  s.emit = envSky(vec3(T.x, -T.y, T.z)) * 0.85;`;

/**
 * Raindrops: a growing shadow telegraphs where one will land; it falls
 * (shown slowed), blasts a crater, throws a crown of droplets and rings the
 * film. ~3 mm across: twice the springtail's length.
 */
export function createRain(scene) {
  const dropMat = litMaterial({ surface: DROP_SURFACE, shadow: false });
  const dropGeo = new THREE.SphereGeometry(1, 24, 16);
  const drops = [];
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), dropMat, 240);
  crown.frustumCulled = false;
  crown.count = 0;
  scene.add(crown);
  const beads = [];
  let spriteMat = null;
  const rings = [];
  // MP-S05 (raindrop/ripple sprites), once delivered: an expanding splash ring
  // drawn additively; its alpha leaves the depth channel untouched.
  const setSprite = (sprite) => {
    spriteMat = sprite ? new THREE.MeshBasicMaterial({ map: sprite, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }) : null;
  };
  const api = {
    drops, every: 7, timer: 4, enabled: true, R: 1.6, setSprite,
    /** During the calm opening drops land around you, not on you. */
    calm: false,
    /** Schedule a drop at x, z; it lands after `warn` seconds. */
    spawn(x, z, warn = 1.6) {
      const m = new THREE.Mesh(dropGeo, dropMat);
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      drops.push({ x, z, t: -warn, warn, mesh: m, r: api.R });
    },
    /** ctx: { dt, field, inPool, mossAt, player } → events [{type:'impact', x, z} ...] */
    update(dt, ctx) {
      const ev = [];
      if (api.enabled) {
        api.timer -= dt;
        if (api.timer <= 0) {
          api.timer = api.every * (0.6 + Math.random() * 0.8);
          const P = ctx.player;
          const a = Math.random() * Math.PI * 2, r = api.calm ? 9 + Math.random() * 10 : 1 + Math.random() * 6;
          api.spawn(P.x + Math.cos(a) * r + (P.vx || 0) * 0.8, P.z + Math.sin(a) * r + (P.vz || 0) * 0.8);
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.t += dt;
        const fall = 0.22;
        if (d.t > -fall && d.t < 0) {
          const u = (d.t + fall) / fall;
          d.mesh.visible = true;
          d.mesh.position.set(d.x, d.r + (1 - u) * 60, d.z);
          d.mesh.scale.set(d.r * 0.95, d.r * 1.05, d.r * 0.95);
        }
        if (d.t >= 0 && !d.hit) {
          d.hit = true;
          d.mesh.visible = false;
          if (ctx.inPool(d.x, d.z)) {
            ctx.field.drop(d.x, d.z, d.r * 1.25, -1.1);
            ctx.field.drop(d.x, d.z, d.r * 2.4, 0.25);
          }
          const surfY = ctx.mossAt(d.x, d.z);
          for (let k = 0; k < 22; k++) {
            const a = (k / 22) * Math.PI * 2 + Math.random() * 0.2, sp = 30 + Math.random() * 40;
            beads.push({ x: d.x + Math.cos(a) * d.r, y: surfY + 0.3, z: d.z + Math.sin(a) * d.r, vx: Math.cos(a) * sp, vy: 60 + Math.random() * 60, vz: Math.sin(a) * sp, r: 0.12 + Math.random() * 0.22, life: 1 });
          }
          if (spriteMat) {
            const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), spriteMat);
            ring.position.set(d.x, 0.02, d.z);
            ring.frustumCulled = false;
            scene.add(ring);
            rings.push({ m: ring, t: 0 });
          }
          ev.push({ type: 'impact', x: d.x, z: d.z, r: d.r });
        }
        if (d.t > 0.1) { scene.remove(d.mesh); drops.splice(i, 1); }
      }
      // crown droplets: ballistic (slowed like the jumps), gone when they fall back
      const g = 900;
      let n = 0;
      for (let i = beads.length - 1; i >= 0; i--) {
        const b = beads[i];
        b.vy -= g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        if (b.y < 0 && b.vy < 0) {
          if (ctx.inPool(b.x, b.z)) ctx.field.drop(b.x, b.z, 0.3, -0.05);
          beads.splice(i, 1);
          continue;
        }
      }
      for (const b of beads) {
        if (n >= 240) break;
        tmpM.compose(tmpV.set(b.x, b.y, b.z), tmpQ.identity(), tmpS.set(b.r, b.r * 1.2, b.r));
        crown.setMatrixAt(n++, tmpM);
      }
      crown.count = n;
      crown.instanceMatrix.needsUpdate = true;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        const s = 3 + r.t * 30;
        r.m.scale.set(s, 1, s);
        if (spriteMat) spriteMat.opacity = Math.max(0, 1 - r.t / 1.2);
        if (r.t > 1.2) { scene.remove(r.m); rings.splice(i, 1); }
      }
      return ev;
    },
    /** Shadow casters for the telegraph: [x, height, z, radius, strength]. */
    casters() {
      return drops.filter((d) => d.t < 0).map((d) => {
        const u = 1 + d.t / d.warn; // 0 -> 1 as it nears
        return [d.x, 0.6 + (1 - u) * 1.5, d.z, d.r * (1.9 - u * 0.9), 0.15 + u * 0.6];
      });
    },
    clear() { for (const d of drops) scene.remove(d.mesh); drops.length = 0; beads.length = 0; crown.count = 0; },
  };
  return api;
}
