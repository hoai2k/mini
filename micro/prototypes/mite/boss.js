// The mite's boss (micro/design/bosses.md): a pseudoscorpion, Neobisium-like,
// ~2.5 mm long (seven box mites), a real hunter of mites in moss. It lies in
// wait in the leaf axil before the water film (the forward landmark).
// Built from anatomy (the MP-R15 reference sheet is requested, not yet
// delivered): a carapace with two eye spots, a flattened, segmented abdomen
// (no tail), eight walking legs, and the long pedipalps with their chelae
// (a hand and two fingers; the movable finger carries the venom tooth).
// Units: µm, s. Drawn by the SEM with the other mites (gMaterial, CLS.NPC).
//
// Readable states:
//   dormant  in the axil, pincers folded; wakes when a player comes within
//            2.3 mm after the calm opening
//   stalk    a slow, deliberate walk toward its target, pincers forward
//   tell     the pincers held open and dead still (0.9 s; 0.7 s for the sweep)
//   snap     a fast pincer strike straight ahead (0.16 s)
//   sweep    both pincers swing in from wide (a wider, shorter grab)
//   step     a quick step in, then a snap (when you hang back at the edge of reach)
//   recover  pincers lowered and slow (1.3 s): the joints are open to a bite
//   flinch   bitten: it jerks back
//   retreat  worn down: it backs into the moss, then it is gone (passed)
// Its resolve (createFight interest) falls with bites (double on a joint in
// its recovery, double again for a pounce-bite), grabs survived by closing up,
// and facing it.
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS } from '../shared/techniques/mite-sem.js';
import { createFight } from '../shared/predation.js';
import { floorH } from './world.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (x) => x * x * (3 - 2 * x);
const UP = new THREE.Vector3(0, 1, 0);
const REACH = 2500; // µm from its body centre to the pincer tips, at full stretch (~2.1 mm in the tell)

export function createPseudoscorpion(scene, tex, { post, home }) {
  const group = new THREE.Group();
  scene.add(group);
  const shell = gMaterial({ cls: CLS.NPC, tex: tex.cuticle, map: 'tri', scale: 220, bump: 2.2 });
  const smooth = gMaterial({ cls: CLS.NPC });
  const thin = gMaterial({ cls: CLS.NPC, thin: 1 });
  const ell = (mat, p, r, seg = 26) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.6)), mat); m.scale.set(...r); m.position.set(...p); m.frustumCulled = false; group.add(m); return m; };
  // body along +x, centre at the origin, ~140 µm off the floor
  ell(shell, [520, 40, 0], [360, 150, 330]);                       // carapace
  ell(smooth, [760, 150, 120], [40, 30, 40], 10); ell(smooth, [760, 150, -120], [40, 30, 40], 10); // eye spots
  for (let i = 0; i < 9; i++) {                                     // abdomen: flattened rings, widest in the middle
    const x = 120 - i * 150, w = 520 * Math.sin(Math.PI * (0.25 + 0.75 * (i + 0.5) / 9));
    ell(shell, [x, 10 - i * 4, 0], [95, 130 - i * 6, Math.max(160, w)]);
  }
  ell(smooth, [870, -20, 0], [90, 60, 110], 14);                    // chelicerae
  // legs and pedipalp segments: instanced rods; chelae: hand and fingers
  const rodGeo = new THREE.CylinderGeometry(0.8, 1, 1, 9, 1).translate(0, 0.5, 0);
  const rods = new THREE.InstancedMesh(rodGeo, shell, 8 * 3 + 2 * 3);
  rods.frustumCulled = false; scene.add(rods);
  const fingerGeo = new THREE.ConeGeometry(1, 1, 10, 1).translate(0, 0.5, 0);
  const fingers = new THREE.InstancedMesh(fingerGeo, smooth, 4);
  fingers.frustumCulled = false; scene.add(fingers);
  const hands = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), shell); m.frustumCulled = false; scene.add(m); return m; });
  const setae = new THREE.InstancedMesh(new THREE.CylinderGeometry(3, 6, 1, 4, 1).translate(0, 0.5, 0), thin, 24);
  setae.frustumCulled = false; scene.add(setae);
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  const rod = (im, i, a, b, r) => {
    tmpV.subVectors(b, a);
    const L = tmpV.length();
    tmpQ.setFromUnitVectors(UP, tmpV.normalize());
    tmpM.compose(a, tmpQ, tmpS.set(r, Math.max(L, 1e-3), r));
    im.setMatrixAt(i, tmpM);
  };
  const LEGS = [0, 1, 2, 3].flatMap((k) => [-1, 1].map((s) => ({ k, s, hip: new THREE.Vector3(560 - k * 150, -40, s * 230), foot: new THREE.Vector3([700, 330, -80, -560][k], 0, s * [700, 820, 800, 650][k]) })));

  const st = { x: post.x, z: post.z, a: post.a, state: 'dormant', t: 0, v: 0, gait: 0, open: 0, ext: 0, spread: 0, lower: 0, crouch: 0,
    target: null, pattern: 'snap', cool: 1.5, lastAggr: null, aggrT: 0, grabbed: null, hold: 0 };
  const fight = createFight({ biteHit: 0.09, facingRate: 0.012, regain: 0.01 });
  const go = (s) => { st.state = s; st.t = 0; };
  const W = (x, y, z, out = new THREE.Vector3()) => out.set(x, y, z).applyMatrix4(group.matrixWorld);
  const tips = [new THREE.Vector3(), new THREE.Vector3()], joints = [new THREE.Vector3(), new THREE.Vector3()];

  function pose() {
    const fy = floorH(st.x, st.z);
    group.position.set(st.x, fy + 150 - 60 * st.crouch, st.z);
    group.rotation.set(0, -st.a, 0.08 * st.open - 0.05 * st.lower);
    group.updateMatrixWorld(true);
    let ri = 0;
    // legs: a slow alternating gait, feet planted on the floor
    for (const L of LEGS) {
      const ph = (st.gait + ((L.k + (L.s > 0 ? 1 : 0)) % 2) * 0.5) % 1;
      const sw = ph < 0.5;
      const stride = Math.min(1, Math.abs(st.v) / 200);
      const dx = (sw ? -110 + ph * 440 : 110 - (ph - 0.5) * 440) * stride;
      const hip = W(L.hip.x, L.hip.y, L.hip.z);
      const foot = W(L.foot.x + dx, 0, L.foot.z);
      foot.y = floorH(foot.x, foot.z) + (sw ? Math.sin(ph * 2 * Math.PI) * 70 * stride : 0);
      const knee = hip.clone().lerp(foot, 0.45); knee.y = Math.max(hip.y, foot.y) + 260 - 80 * st.crouch;
      const ank = knee.clone().lerp(foot, 0.55); ank.y = (knee.y + foot.y) / 2 + 30;
      rod(rods, ri++, hip, knee, 48); rod(rods, ri++, knee, ank, 40); rod(rods, ri++, ank, foot, 28);
    }
    // pedipalps: folded at rest; forward and open in the tell; stretched in the snap; wide in the sweep
    let fi = 0;
    for (const s of [-1, 1]) {
      const sp = st.spread * 1;
      const base = W(840, 20, s * 200);
      const elbow = W(1000 + 120 * st.ext - 260 * (1 - Math.max(st.open, st.ext)) - 120 * st.lower, 220 - 120 * st.lower, s * (560 + 450 * sp - 160 * (1 - Math.max(st.open, st.ext))));
      const wrist = W(1350 + 480 * st.ext - 380 * (1 - Math.max(st.open, st.ext)) - 200 * st.lower, 160 - 140 * st.lower, s * (380 + 600 * sp - 120 * st.ext));
      rod(rods, ri++, base, elbow, 70); rod(rods, ri++, elbow, wrist, 62);
      const handC = W(1500 + 520 * st.ext - 380 * (1 - Math.max(st.open, st.ext)) - 220 * st.lower, 150 - 140 * st.lower, s * (330 + 560 * sp - 140 * st.ext));
      rod(rods, ri++, wrist, handC, 70);
      const h = hands[s < 0 ? 0 : 1];
      h.position.copy(handC);
      h.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), handC.clone().sub(wrist).normalize());
      h.scale.set(220, 120, 130);
      joints[s < 0 ? 0 : 1].copy(wrist);
      // fingers: the fixed one and the movable one (venom tooth), opening by `open`
      const dir = handC.clone().sub(wrist).normalize();
      const side = new THREE.Vector3().crossVectors(dir, UP).normalize().multiplyScalar(s);
      for (const f of [-1, 1]) {
        const ang = f * (0.08 + 0.55 * st.open);
        const fd = dir.clone().applyAxisAngle(UP, ang * s).normalize();
        const root = handC.clone().addScaledVector(dir, 180).addScaledVector(side, f * 30);
        tmpQ.setFromUnitVectors(UP, fd);
        tmpM.compose(root, tmpQ, tmpS.set(f > 0 ? 34 : 40, 420, f > 0 ? 34 : 40));
        fingers.setMatrixAt(fi++, tmpM);
        if (f > 0) tips[s < 0 ? 0 : 1].copy(root).addScaledVector(fd, 400);
      }
    }
    rods.count = ri; rods.instanceMatrix.needsUpdate = true;
    fingers.instanceMatrix.needsUpdate = true;
    // long tactile setae on the chelae (they glow in the SEM)
    let si = 0;
    for (const s of [0, 1]) for (let k = 0; k < 6; k++) {
      const h = hands[s].position;
      const d = new THREE.Vector3(Math.cos(k * 1.1 + st.a), 0.7, Math.sin(k * 1.1 + st.a)).normalize();
      tmpQ.setFromUnitVectors(UP, d); tmpM.compose(h.clone().addScaledVector(d, 110), tmpQ, tmpS.set(1, 220, 1)); setae.setMatrixAt(si++, tmpM);
    }
    setae.count = si; setae.instanceMatrix.needsUpdate = true;
  }
  pose();

  function setVisible(v) { group.visible = v; rods.visible = v; fingers.visible = v; setae.visible = v; hands.forEach((h) => (h.visible = v)); }

  /**
   * ctx: { players: [{ slot, x, z, center, alive, closed, airborne }], awake }.
   * Events: { type: 'wake' | 'tell' | 'snap' | 'sweep' | 'step' | 'grab' (slot: not closed) |
   *   'survived' (slot: closed, the venom cannot get through) | 'miss' | 'retreat' | 'gone' }
   */
  function update(dt, ctx) {
    const ev = [];
    st.t += dt;
    st.cool = Math.max(0, st.cool - dt);
    st.aggrT = Math.max(0, st.aggrT - dt);
    if (st.state === 'capture' || st.state === 'gone') { pose(); return ev; }
    const live = ctx.players.filter((p) => p.alive);
    let tgt = null, bd = Infinity;
    for (const p of live) { const d = Math.hypot(p.x - st.x, p.z - st.z); if (d < bd) { bd = d; tgt = p; } }
    if (st.aggrT > 0) { const a = live.find((p) => p.slot === st.lastAggr); if (a) { tgt = a; bd = Math.hypot(a.x - st.x, a.z - st.z); } }
    let targetV = 0, targetA = st.a;
    const toT = tgt ? Math.atan2(tgt.z - st.z, tgt.x - st.x) : st.a;
    const settle = (k) => { st.open += (0 - st.open) * k; st.ext += (0 - st.ext) * k; st.spread += (0 - st.spread) * k; };
    switch (st.state) {
      case 'dormant':
        targetA = post.a;
        if (ctx.awake && tgt && Math.hypot(tgt.x - post.x, tgt.z - post.z) < 2300) { go('stalk'); ev.push({ type: 'wake' }); }
        break;
      case 'stalk':
        if (!tgt) break;
        targetA = toT;
        // it keeps its distance: just inside pincer reach
        targetV = bd > REACH - 100 ? 240 : bd < 1900 ? -200 : 0;
        st.open += (0.25 - st.open) * Math.min(1, dt * 3);
        st.lower = Math.max(0, st.lower - dt * 2);
        if (Math.hypot(st.x - post.x, st.z - post.z) > 1700) targetA = Math.atan2(post.z - st.z, post.x - st.x);
        if (st.cool <= 0 && bd < REACH + 450 && bd > 1750) {
          st.pattern = bd > REACH - 50 ? 'step' : Math.random() < 0.4 ? 'sweep' : 'snap';
          st.extT = Math.max(0.1, Math.min(1, (bd - 1700) / 900));
          go('tell'); ev.push({ type: 'tell', pattern: st.pattern });
        }
        break;
      case 'tell': {
        // pincers open and dead still: the tell
        const T = st.pattern === 'sweep' ? 0.7 : 0.9;
        if (st.t < 0.25) targetA = toT; // then it holds still
        st.open += (1 - st.open) * Math.min(1, dt * 10);
        st.spread += ((st.pattern === 'sweep' ? 1 : 0.1) - st.spread) * Math.min(1, dt * 8);
        st.ext += (0.15 - st.ext) * Math.min(1, dt * 8);
        st.crouch = Math.min(1, st.t / 0.3);
        if (st.t > T) { go(st.pattern); ev.push({ type: st.pattern }); st.from = { x: st.x, z: st.z }; }
        break;
      }
      case 'step':
      case 'snap':
      case 'sweep': {
        const T = st.state === 'step' ? 0.42 : st.state === 'sweep' ? 0.24 : 0.16;
        const u = Math.min(1, st.t / T);
        if (st.state === 'step') {
          const d = Math.min(450, Math.max(0, bd - REACH + 100));
          const e = ease(Math.min(1, u * 1.6));
          st.x = st.from.x + Math.cos(st.a) * d * e; st.z = st.from.z + Math.sin(st.a) * d * e;
          st.ext = u > 0.6 ? 0.15 + ((u - 0.6) / 0.4) * (Math.max(0.1, Math.min(1, (bd - 1700) / 900)) - 0.15) : 0.15; st.open = u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1;
        } else if (st.state === 'sweep') {
          st.spread = 1 - u; st.ext = st.extT * u; st.open = 1 - u;
        } else { st.ext = st.extT * u; st.open = 1 - u; }
        st.crouch = Math.max(0, 1 - u * 2);
        pose();
        if (u >= 1) {
          // which mite do the fingers close on?
          let hit = null, hd = st.state === 'sweep' ? 300 : 230;
          for (const p of live) for (const t of tips) { const d = Math.hypot(p.center.x - t.x, p.center.z - t.z); if (d < hd && Math.abs(p.center.y - t.y) < 260) { hd = d; hit = p; } }
          if (hit && hit.closed) { ev.push({ type: 'survived', slot: hit.slot }); fight.bitten(); go('recover'); }
          else if (hit) { go('capture'); st.grabbed = hit.slot; ev.push({ type: 'grab', slot: hit.slot }); }
          else { ev.push({ type: 'miss' }); go('recover'); }
          st.cool = 1.4;
        }
        break;
      }
      case 'recover':
        // pincers lowered, slow: the joints are open
        st.lower = Math.min(1, st.t / 0.25) * (st.t < 1.0 ? 1 : Math.max(0, 1 - (st.t - 1.0) / 0.3));
        settle(Math.min(1, dt * 4));
        if (st.t > 1.3) go('stalk');
        break;
      case 'flinch':
        targetV = -380 * Math.max(0, 1 - st.t * 1.6); targetA = toT;
        settle(Math.min(1, dt * 6)); st.lower = Math.max(0, st.lower - dt * 3);
        if (st.t > 0.8) { if (fight.interest <= 0) { go('retreat'); ev.push({ type: 'retreat' }); } else go('stalk'); }
        break;
      case 'retreat': {
        // backs into the moss, pincers raised in front of it
        const ta = Math.atan2(st.z - home.z, st.x - home.x); // keep facing away from home: it reverses
        targetA = ta; targetV = -300;
        st.open = 0.4; st.ext = 0; st.spread = 0; st.lower = 0;
        if (Math.hypot(home.x - st.x, home.z - st.z) < 150 || st.t > 9) { go('gone'); setVisible(false); ev.push({ type: 'gone' }); }
        break;
      }
    }
    if (!['step', 'snap', 'sweep'].includes(st.state)) {
      st.a += Math.max(-2.2 * dt, Math.min(2.2 * dt, wrap(targetA - st.a)));
      st.v += (targetV - st.v) * Math.min(1, dt * 5);
      st.x += Math.cos(st.a) * st.v * dt; st.z += Math.sin(st.a) * st.v * dt;
      st.gait += Math.abs(st.v) * dt / 500;
      if (st.state !== 'tell') st.crouch = Math.max(0, st.crouch - dt * 3);
    } else st.gait += dt * 0.5;
    if (st.state !== 'dormant' && st.state !== 'gone' && st.state !== 'retreat') {
      const near = tgt && bd < 2600;
      const f = fight.update(dt, { near, facing: near && tgt.facing });
      if (f.interest <= 0 && st.state !== 'flinch') { go('retreat'); ev.push({ type: 'retreat' }); }
    }
    if (st.state === 'dormant') { st.open = 0; st.ext = 0; st.lower = 0.6; }
    pose();
    return ev;
  }

  const api = {
    st, group, fight, post, home, setVisible, update, tips, joints,
    get name() { return 'Pseudoscorpion'; },
    get center() { return new THREE.Vector3(st.x, floorH(st.x, st.z) + 150, st.z); },
    get resolve() { return fight.interest; },
    get engaged() { return !['dormant', 'gone', 'retreat'].includes(st.state); },
    get attacking() { return ['tell', 'snap', 'sweep', 'step'].includes(st.state); },
    /** In its recovery: the pincer joints are open to a bite. */
    get open() { return st.state === 'recover'; },
    /** Where a bite can land: the pincer joints (wrists) and the hands. */
    bitePoints() { if (!group.visible || st.state === 'gone') return []; return [joints[0].clone(), joints[1].clone(), hands[0].position.clone(), hands[1].position.clone()]; },
    /** A bite by player slot (power 1 a bite, 2 a pounce-bite; doubled on an open joint). True when it gives up. */
    bitten(power = 1, slot = 0) {
      if (['gone', 'retreat', 'capture'].includes(st.state)) return false;
      const p = Math.min(2, power * (api.open ? 2 : 1)); // at most two bites' worth: about three good rounds
      for (let i = 0; i < p * 2; i++) fight.bitten();
      st.lastAggr = slot; st.aggrT = 8;
      st.cool = Math.max(st.cool, 1.0);
      go('flinch');
      return fight.interest <= 0;
    },
    /** The grab: the mite in the pincer (strike), drawn to the chelicerae (hold), eaten (eat), then it backs off with its meal. Returns where the mite's body goes. */
    captureStep(phase, u, dt) {
      st.state = 'capture'; st.t += dt;
      const s = st.grabbedSide || 1;
      let at;
      if (phase === 'strike') { st.open = 0; st.ext = 1 - 0.2 * u; at = tips[s > 0 ? 1 : 0].clone(); }
      else if (phase === 'hold') { st.ext = 0.8 * (1 - ease(u)); st.spread = 0; at = tips[s > 0 ? 1 : 0].clone().lerp(W(980, 0, 0), ease(u)); }
      else if (phase === 'eat') { st.ext = 0; at = W(980 - 120 * u, -10, 0); }
      else {
        // fed: it reverses into the moss with its meal
        const ta = Math.atan2(st.z - home.z, st.x - home.x);
        st.a += wrap(ta - st.a) * Math.min(1, dt * 2);
        st.x -= Math.cos(st.a) * 220 * dt; st.z -= Math.sin(st.a) * 220 * dt; st.gait += 220 * dt / 500; st.v = -220;
        at = W(900, 0, 0);
      }
      pose();
      return at;
    },
    release() { Object.assign(st, { x: post.x, z: post.z, a: post.a, state: 'dormant', t: 0, v: 0, open: 0, ext: 0, spread: 0, lower: 0, crouch: 0, cool: 3, grabbed: null }); fight.reset(); pose(); },
    reset() { api.release(); setVisible(true); },
  };
  return api;
}
