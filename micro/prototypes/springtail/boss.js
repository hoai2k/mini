// The springtail's boss (micro/design/bosses.md): a pond wolf spider, Pirata,
// a juvenile ~5 mm long (a labelled departure: adults are ~6-9 mm, scaled
// down so the arena fits). It guards the moss tongue at the forward landmark,
// sitting on the moss; it runs out over the water to hunt. Units: mm, s.
//
// Readable states:
//   dormant   on the moss, still (a leg twitches); wakes when a player comes
//             within 30 mm after the calm opening
//   stalk     runs over the film toward its target, in bursts
//   tell      it crouches and raises its first two pairs of legs (0.8 s before
//             a lunge, 0.55 s before a pounce)
//   lunge     a fast run-and-grab, 7 mm (the fangs test the hit at its end)
//   pounce    a leap at a fresh landing ripple (it feels the film)
//   recover   overreached: front legs splayed out on the film, slow to turn
//             (its tarsi are the place to nip)
//   flinch    nipped: it jerks back
//   retreat   worn down: it goes back under the moss, and the bank is open
//   gone      passed
// Its resolve (createFight interest, shared/predation.js) falls with nips
// (double on an overreached tarsus, quadruple for a pounce-bite), dodged
// lunges and facing it; at 0 it retreats.
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';
import { createFight } from '../shared/predation.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (x) => x * x * (3 - 2 * x);
const UP = new THREE.Vector3(0, 1, 0);

export function createWolfSpider(scene, { post, home }) {
  const group = new THREE.Group();
  scene.add(group);
  const bodyMat = litMaterial({ surface: `
    float n = mNoise(vLocal.xz * 9.0);
    // brown, a pale band along each side of the carapace, a darker V on the abdomen
    vec3 c = mix(vec3(0.07, 0.045, 0.025), vec3(0.16, 0.11, 0.06), n);
    float band = smoothstep(0.62, 0.72, abs(vLocal.z)) * step(0.0, vLocal.x);
    c = mix(c, vec3(0.42, 0.36, 0.24), band * 0.8);
    s.albedo = c; s.rough = 0.55; s.sheen = 0.12; s.sheenCol = vec3(0.5, 0.42, 0.3);` });
  const eyeMat = litMaterial({ surface: 's.albedo = vec3(0.005); s.rough = 0.08; s.f0 = 0.06;' });
  const legMat = litMaterial({ surface: 's.albedo = vec3(0.12, 0.08, 0.045) * (0.8 + 0.4 * mNoise(vWorld.xz * 12.0)); s.rough = 0.5; s.sheen = 0.15; s.sheenCol = vec3(0.45, 0.38, 0.3);' });
  const ell = (mat, p, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), mat); m.scale.set(...r); m.position.set(...p); m.frustumCulled = false; group.add(m); return m; };
  const ceph = ell(bodyMat, [0.9, 0, 0], [1.25, 0.55, 0.92]);
  const abd = ell(bodyMat, [-1.65, 0.05, 0], [1.55, 0.72, 1.02]);
  const eyes = [[2.0, 0.35, 0.18], [2.0, 0.35, -0.18], [1.85, 0.5, 0.32], [1.85, 0.5, -0.32], [1.6, 0.6, 0.22], [1.6, 0.6, -0.22]].map((p, i) => ell(eyeMat, p, i < 2 ? [0.1, 0.1, 0.1] : [0.13, 0.13, 0.13]));
  const fangs = [-1, 1].map((s) => ell(bodyMat, [2.1, -0.25, s * 0.25], [0.28, 0.42, 0.2]));
  const parts = [ceph, abd, ...eyes, ...fangs];
  // legs: 8 x 3 segments (femur, tibia+patella, metatarsus+tarsus), instanced
  const segGeo = new THREE.CylinderGeometry(0.75, 1, 1, 7, 1).translate(0, 0.5, 0);
  const legs = new THREE.InstancedMesh(segGeo, legMat, 8 * 3 + 2 * 2);
  legs.frustumCulled = false;
  scene.add(legs);
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  let li = 0;
  const seg = (a, b, r) => {
    tmpV.subVectors(b, a);
    const L = tmpV.length();
    tmpQ.setFromUnitVectors(UP, tmpV.normalize());
    tmpM.compose(a, tmpQ, tmpS.set(r, Math.max(L, 1e-3), r));
    legs.setMatrixAt(li++, tmpM);
  };
  // hips round the carapace; feet at rest (local, body along +x)
  const LEGS = [0, 1, 2, 3].flatMap((k) => [-1, 1].map((s) => ({
    k, s,
    hip: new THREE.Vector3(1.5 - k * 0.42, 0, s * 0.62),
    foot: new THREE.Vector3([5.2, 2.2, -1.6, -4.6][k], 0, s * [3.2, 4.6, 4.6, 3.4][k]),
    w: [0.17, 0.16, 0.15, 0.16][k],
  })));
  const feetW = [];

  const st = { x: post.x, z: post.z, a: post.a, y: 1.3, v: 0, state: 'dormant', t: 0, crouch: 0, raise: 0, reach: 0, gait: 0,
    aimX: 0, aimZ: 0, from: null, target: null, burst: 0, chew: 0, lastAggr: null, aggrT: 0, cool: 1.5, hop: 0 };
  const fight = createFight({ biteHit: 0.09, facingRate: 0.012, regain: 0.01 });
  const fang = () => new THREE.Vector3(st.x + Math.cos(st.a) * 2.3, 0.4, st.z + Math.sin(st.a) * 2.3);
  const go = (s) => { st.state = s; st.t = 0; };

  function pose() {
    group.position.set(st.x, st.y - 0.55 * st.crouch + st.hop, st.z);
    group.rotation.set(0, -st.a, 0.25 * st.raise - 0.1 * st.reach);
    group.updateMatrixWorld(true);
    fangs.forEach((f, i) => { f.rotation.z = -0.5 * st.chew * (i ? 1 : -1) * 0.5; f.position.y = -0.25 - 0.08 * st.chew; });
    li = 0;
    feetW.length = 0;
    for (const L of LEGS) {
      const ph = (st.gait + (L.k + (L.s > 0 ? 1 : 0)) % 2 * 0.5) % 1;
      const swing = ph < 0.5;
      const stride = Math.min(1, Math.abs(st.v) / 8);
      const dx = (swing ? -0.7 + ph * 2.8 : 0.7 - (ph - 0.5) * 2.8) * stride;
      // the tell: legs I and II raised and spread; the overreach: legs I flat out ahead
      const up = L.k < 2 ? st.raise * (L.k === 0 ? 3.2 : 2.0) : 0;
      const fwd = L.k < 2 ? st.raise * 0.8 + st.reach * (L.k === 0 ? 2.6 : 1.0) : 0;
      const lift = swing ? Math.sin(ph * 2 * Math.PI) * 0.5 * stride : 0;
      const hipW = L.hip.clone().applyMatrix4(group.matrixWorld);
      const footL = new THREE.Vector3(L.foot.x + dx + fwd, 0, L.foot.z * (1 + 0.15 * st.reach));
      const footW = footL.applyMatrix4(group.matrixWorld);
      footW.y = lift + up + (st.state === 'pounce' ? st.hop * 0.4 : 0);
      if (st.state === 'dormant' || st.state === 'gone' || st.state === 'retreat') footW.y = Math.max(footW.y, st.y - 1.3);
      // knee: high above the line, spider-like
      const knee = hipW.clone().lerp(footW, 0.42);
      knee.y = Math.max(hipW.y, footW.y) + 1.6 - 0.6 * st.crouch;
      const ankle = knee.clone().lerp(footW, 0.6);
      ankle.y = (knee.y + footW.y) * 0.5 + 0.2;
      seg(hipW, knee, L.w);
      seg(knee, ankle, L.w * 0.8);
      seg(ankle, footW, L.w * 0.6);
      if (footW.y < 0.06) feetW.push(footW);
    }
    // pedipalps
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(1.9, -0.1, s * 0.4).applyMatrix4(group.matrixWorld);
      const b = new THREE.Vector3(2.7 + 0.3 * st.raise, 0.1 - 0.3 * st.crouch, s * 0.6).applyMatrix4(group.matrixWorld);
      const c = new THREE.Vector3(3.2 + 0.4 * st.raise, -0.3 + 0.6 * st.raise, s * 0.5).applyMatrix4(group.matrixWorld);
      seg(a, b, 0.11); seg(b, c, 0.09);
    }
    legs.count = li;
    legs.instanceMatrix.needsUpdate = true;
  }
  pose();

  function setVisible(v) { group.visible = v; legs.visible = v; }

  /**
   * ctx: { players: [{ slot, x, z, y, airborne, alive, landed (just landed on the film), heading }],
   *   awake (the calm opening is over), field, inPool }.
   * Events: { type: 'wake' | 'tell' | 'lunge' | 'pounce' | 'caught' | 'dodged' | 'retreat' | 'gone', slot? }
   */
  function update(dt, ctx) {
    const ev = [];
    st.t += dt;
    st.cool = Math.max(0, st.cool - dt);
    st.aggrT = Math.max(0, st.aggrT - dt);
    if (st.state === 'capture') { pose(); return ev; }
    const live = ctx.players.filter((p) => p.alive);
    // its target: whoever bit it last (for a while), else the nearest
    let tgt = null, bd = Infinity;
    for (const p of live) { const d = Math.hypot(p.x - st.x, p.z - st.z); if (d < bd) { bd = d; tgt = p; } }
    if (st.aggrT > 0) { const a = live.find((p) => p.slot === st.lastAggr); if (a) { tgt = a; bd = Math.hypot(a.x - st.x, a.z - st.z); } }
    let targetV = 0, targetA = st.a;
    const toT = tgt ? Math.atan2(tgt.z - st.z, tgt.x - st.x) : st.a;
    switch (st.state) {
      case 'dormant':
        targetA = post.a;
        if (ctx.awake && tgt && Math.hypot(tgt.x - post.x, tgt.z - post.z) < 30) { go('stalk'); ev.push({ type: 'wake' }); }
        break;
      case 'stalk': {
        if (!tgt) break;
        targetA = toT;
        // it feels a landing on the film: turn and pounce
        const landed = live.find((p) => p.landed && Math.hypot(p.x - st.x, p.z - st.z) < 20);
        if (landed && st.cool <= 0) { st.target = { x: landed.x, z: landed.z, slot: landed.slot }; st.pattern = 'pounce'; go('tell'); ev.push({ type: 'tell', pattern: 'pounce' }); break; }
        // bursts of running, pauses (wolf spiders hunt in dashes)
        st.burst += dt;
        targetV = st.burst % 1.6 < 1.0 ? 12 : 0;
        if (bd < 7.5 && st.cool <= 0 && !tgt.airborne) { st.target = { x: tgt.x, z: tgt.z, slot: tgt.slot }; st.pattern = 'lunge'; go('tell'); ev.push({ type: 'tell', pattern: 'lunge' }); }
        // too far from its post: it goes back to guard it
        if (Math.hypot(st.x - post.x, st.z - post.z) > 60) targetA = Math.atan2(post.z - st.z, post.x - st.x);
        break;
      }
      case 'tell': {
        const T = st.pattern === 'pounce' ? 0.55 : 0.8;
        targetA = Math.atan2(st.target.z - st.z, st.target.x - st.x);
        // keep tracking the target's position for a lunge (it is locked on)
        if (st.pattern === 'lunge' && tgt) st.target = { x: tgt.x, z: tgt.z, slot: tgt.slot };
        st.crouch = Math.min(1, st.t / (T * 0.5));
        st.raise = Math.min(1, st.t / (T * 0.6));
        if (st.t > T) {
          st.from = { x: st.x, z: st.z };
          const d = Math.hypot(st.target.x - st.x, st.target.z - st.z);
          const reach = Math.max(0, st.pattern === 'pounce' ? Math.min(20, d - 2.2) : Math.min(8, d - 2.0)); // the fangs end where the target was
          st.aimX = st.x + Math.cos(st.a) * reach; st.aimZ = st.z + Math.sin(st.a) * reach;
          go(st.pattern);
          ev.push({ type: st.pattern });
        }
        break;
      }
      case 'lunge':
      case 'pounce': {
        const T = st.state === 'pounce' ? 0.5 : 0.3;
        const u = Math.min(1, st.t / T);
        const e = ease(u);
        st.x = st.from.x + (st.aimX - st.from.x) * e; st.z = st.from.z + (st.aimZ - st.from.z) * e;
        st.hop = st.state === 'pounce' ? Math.sin(u * Math.PI) * 4 : 0;
        st.crouch = Math.max(0, 1 - u * 2); st.raise = 1 - 0.6 * u; st.reach = u;
        st.chew = u;
        if (u >= 1) {
          st.hop = 0;
          if (ctx.inPool(st.x, st.z)) { ctx.field.drop(st.x, st.z, 2.2, -0.12); ctx.field.drop(st.x + Math.cos(st.a) * 2, st.z + Math.sin(st.a) * 2, 1.2, -0.08); }
          const f = fang();
          const hit = live.find((p) => !p.airborne && Math.hypot(p.x - f.x, p.z - f.z) < 1.7);
          if (hit) { go('capture'); ev.push({ type: 'caught', slot: hit.slot }); break; }
          const near = live.find((p) => Math.hypot(p.x - f.x, p.z - f.z) < 7);
          if (near) { ev.push({ type: 'dodged', slot: near.slot }); fight.bitten(); }
          st.cool = 1.6;
          go('recover');
        }
        break;
      }
      case 'recover':
        // overreached: front legs out on the film, slow to turn
        st.reach = Math.max(0, 1 - Math.max(0, st.t - 0.6) / 0.5); st.raise = Math.max(0, st.raise - dt * 3); st.chew = Math.max(0, st.chew - dt * 2);
        targetA = st.t > 0.8 ? toT : st.a;
        if (st.t > 1.1) go('stalk');
        break;
      case 'flinch':
        targetV = -9 * Math.max(0, 1 - st.t * 1.5); targetA = toT;
        st.reach = Math.max(0, st.reach - dt * 4); st.raise = Math.max(0, st.raise - dt * 4); st.crouch = Math.max(0, st.crouch - dt * 4);
        if (st.t > 0.7) { if (fight.interest <= 0) { go('retreat'); ev.push({ type: 'retreat' }); } else go('stalk'); }
        break;
      case 'retreat': {
        // back under the moss: to its post, then into the bank
        const tx = home.x, tz = home.z;
        targetA = Math.atan2(tz - st.z, tx - st.x);
        targetV = 14;
        st.reach = 0; st.raise = 0; st.crouch = 0;
        if (Math.hypot(tx - st.x, tz - st.z) < 2.5 || st.t > 8) { go('gone'); setVisible(false); ev.push({ type: 'gone' }); }
        break;
      }
      case 'gone': return ev;
    }
    if (st.state !== 'tell') { st.crouch = Math.max(0, st.crouch - dt * 3); if (!['lunge', 'pounce', 'recover', 'flinch'].includes(st.state)) st.raise = Math.max(0, st.raise - dt * 3); }
    if (!['lunge', 'pounce'].includes(st.state)) {
      st.a += Math.max(-6 * dt, Math.min(6 * dt, wrap(targetA - st.a)));
      st.v += (targetV - st.v) * Math.min(1, dt * 6);
      const nx = st.x + Math.cos(st.a) * st.v * dt, nz = st.z + Math.sin(st.a) * st.v * dt;
      if (st.state === 'retreat' || ctx.inPool(nx, nz) || Math.hypot(nx - post.x, nz - post.z) < 12) { st.x = nx; st.z = nz; } else st.v *= 0.3;
      st.gait += (Math.abs(st.v) * dt) / 2.4;
    } else st.gait += dt * 3;
    // on the moss it stands higher
    st.y = 1.3 + (Math.hypot(st.x - post.x, st.z - post.z) < 8 ? 1.4 : 0);
    if (st.state !== 'dormant' && st.state !== 'gone') {
      const near = tgt && bd < 14;
      const f = fight.update(dt, { near, facing: near && tgt && Math.abs(wrap(Math.atan2(st.z - tgt.z, st.x - tgt.x) - tgt.heading)) < 0.95 });
      if (f.interest <= 0 && st.state !== 'retreat' && st.state !== 'flinch') { go('retreat'); ev.push({ type: 'retreat' }); }
    }
    if (st.v > 2 && ctx.inPool(st.x, st.z)) ctx.field.drop(st.x, st.z, 0.6, -0.006 * st.v);
    pose();
    return ev;
  }

  const api = {
    st, group, legs, fight, post, home, setVisible, update, fang,
    get name() { return 'Pond wolf spider'; },
    /** 1 at full resolve, 0 when it gives up. */
    get resolve() { return fight.interest; },
    /** True from waking until it retreats (the gauge shows). */
    get engaged() { return !['dormant', 'gone', 'retreat'].includes(st.state); },
    get attacking() { return ['tell', 'lunge', 'pounce'].includes(st.state); },
    /** Overreached after a lunge or pounce: its tarsi are out on the film. */
    get open() { return st.state === 'recover'; },
    /** Where a nip lands: the first tarsi (and, in reach, the palps). */
    nipPoints() {
      if (!group.visible || st.state === 'gone') return [];
      const pts = [];
      for (const L of LEGS) if (L.k === 0) { const f = new THREE.Vector3(L.foot.x + st.raise * 0.8 + st.reach * 2.6, 0, L.foot.z * (1 + 0.15 * st.reach)).applyMatrix4(group.matrixWorld); pts.push([f.x, f.z]); }
      const p = new THREE.Vector3(3.0, 0, 0).applyMatrix4(group.matrixWorld);
      pts.push([p.x, p.z]);
      return pts;
    },
    /** Body points a pounce-bite can land on (x, z, radius). */
    bodyPoints() { if (!group.visible || st.state === 'gone') return []; const c = new THREE.Vector3(0.9, 0, 0).applyMatrix4(group.matrixWorld), b = new THREE.Vector3(-1.6, 0, 0).applyMatrix4(group.matrixWorld); return [[c.x, c.z, 1.3], [b.x, b.z, 1.5]]; },
    /** A nip (power: 1 nip, 2 an overreached tarsus, 4 a pounce-bite) by player slot. Returns true when it gives up. */
    nipped(power = 1, slot = 0) {
      if (st.state === 'gone' || st.state === 'retreat' || st.state === 'capture') return false;
      if (st.state === 'dormant') { go('stalk'); }
      // a hit is worth at most two nips (so it takes about three good rounds)
      let gone = false;
      for (let i = 0; i < Math.min(2, power) * 2; i++) gone = fight.bitten() || gone;
      st.lastAggr = slot; st.aggrT = 8;
      st.cool = Math.max(st.cool, 1.2);
      go('flinch');
      if (gone || fight.interest <= 0) { st.state = 'flinch'; }
      return fight.interest <= 0;
    },
    /** The catch (createCapture phases): grabbed under the fangs, held, eaten; then it carries its meal under the moss. */
    captureStep(phase, u, dt, prey) {
      st.state = 'capture'; st.t += dt;
      const T = st.t, fx = Math.cos(st.a), fz = Math.sin(st.a);
      const out = { x: prey.x0, y: 0, z: prey.z0, heading: prey.h0, pitch: 0, roll: 0, scale: 1, flail: 1 };
      const m = fang();
      if (phase === 'strike') {
        const e = ease(Math.min(1, u * 2));
        st.reach = 1 - e * 0.5; st.raise = 0.4; st.chew = 1;
        out.x = prey.x0 + (m.x + fx * 0.3 - prey.x0) * e; out.z = prey.z0 + (m.z + fz * 0.3 - prey.z0) * e; out.y = 0.1 * e;
        out.roll = Math.sin(T * 20) * 0.5 * e;
      } else if (phase === 'hold') {
        st.reach = 0; st.raise = 0.3 + 0.1 * Math.sin(T * 5); st.chew = 0.6 + 0.4 * Math.sin(T * 12);
        out.x = m.x + fx * 0.2; out.z = m.z + fz * 0.2; out.y = 0.35 + 0.05 * Math.sin(T * 9);
        out.heading = st.a + Math.PI / 2 + Math.sin(T * 13) * 0.6; out.roll = Math.sin(T * 17) * 0.8;
      } else if (phase === 'eat') {
        const e = ease(u);
        st.raise = 0.2; st.chew = 0.5 + 0.5 * Math.sin(T * 14);
        out.x = m.x - fx * 0.3 * e; out.z = m.z - fz * 0.3 * e; out.y = 0.35;
        out.heading = st.a + Math.PI; out.scale = 1 - 0.95 * e; out.flail = 1 - u;
      } else {
        // fed: it carries off under the moss
        st.raise = 0; st.chew = 0.4 + 0.3 * Math.sin(T * 6);
        const ta = Math.atan2(home.z - st.z, home.x - st.x);
        st.a += wrap(ta - st.a) * Math.min(1, dt * 3);
        st.x += Math.cos(st.a) * 6 * dt; st.z += Math.sin(st.a) * 6 * dt; st.gait += 6 * dt / 2.4; st.v = 6;
        out.scale = 0; out.flail = 0;
      }
      pose();
      return out;
    },
    /** After a meal (or a respawn): back on guard at its post. */
    release() { Object.assign(st, { x: post.x, z: post.z, a: post.a, state: 'dormant', t: 0, crouch: 0, raise: 0, reach: 0, chew: 0, v: 0, hop: 0, cool: 3 }); fight.reset(); pose(); },
    /** Restart: on guard again, full resolve. */
    reset() { api.release(); setVisible(true); },
    contacts() { return feetW.map((f) => [f.x, f.z, 0.18, 0.12]); },
    mouthPos() { return fang(); },
  };
  return api;
}
