// The fodder's behaviour and death: what rig.onTick does every frame on top
// of the shared AIs (entities/enemy.js), and the burst of each kind's own
// bits as it falls (finish wires both into a built rig).
import * as THREE from 'three/webgpu';
import { PX } from '../../character.js';
import { C } from './parts.js';

// ---- behaviour (rig.onTick, every frame while alive) --------------------------
const _c = new THREE.Vector3(), _f = new THREE.Vector3();
const dustCol = C(0xb89a70), fireCol = C(0xff7a1a), fireHot = C(0xffd040), smokeCol = C(0x9a9a9a), redCol = C(0xff2a2a);
// a shot restyled as it leaves: colour, shape, size, trail and what it leaves where it lands
const SHOTS = {
  karpos_slinger: { color: 0xffc030, scale: 0.75, trail: C(0xffc030), splat: 0xffc030 },
  basilisk: { color: 0xe8ff20, scale: 0.7, trail: C(0xe8ff20) },
  earthborn: { color: 0x7a4a24, emissive: 0.25, shape: 'cube', scale: 1.6, trail: C(0x6a4a2a), trailSmoke: true, splat: 0x6a4a2a, noHazard: true, light: false },
  daedalus_drone: { color: 0x5ad8ff, shape: 'arrow', scale: 0.7, trail: C(0x5ad8ff) },
  laistrygonian: { scale: 1.9 },
  myrmex_spitter: { color: 0x7aff2a, scale: 1.4, trail: C(0x9aff3a), splat: 0x9aff3a, burst: true },
};
function restyleShots(e, s) {
  const g = e.game, P = g.projectiles, L = P?.list; if (!L) return;
  for (let i = L.length - 1; i >= 0 && i >= L.length - 4; i--) {
    const p = L[i]; if (p.fod || p.team !== 'enemy' || p.pos.distanceTo(e.pos) > e.height + 2.5) continue;
    p.fod = true;
    if (s.color != null) { p.color = s.color; p.mesh.material = P.mat(s.color, s.emissive ?? 3); }
    if (s.shape) { p.shape = s.shape; p.mesh.geometry = P.geos[s.shape]; }
    if (s.scale) p.mesh.scale.setScalar(s.scale);
    if (s.light === false && p.lightH) { g.lights.remove(p.lightH); p.lightH = null; }
    if (s.trail) { const col = s.trail, add = !s.trailSmoke; p.trail = (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: col, additive: add, speed: 0.3, life: 0.4, size: add ? 0.2 : 0.3, sizeEnd: 0.08, drag: 3 }); }; }
    if (s.splat || s.noHazard) { const prev = p.onExpire; p.onExpire = (q, why) => { if (s.noHazard) { if (why !== 'hit') { g.fx.splat(q.pos, s.splat); g.particles.burst(q.pos, { count: 8, color: dustCol, additive: false, speed: 2.4, life: 0.6, size: 0.35, sizeEnd: 0.9, drag: 3, up: 0.6 }); } } else { prev?.(q, why); if (why !== 'hit') { g.fx.splat(q.pos, s.splat); if (s.burst) g.particles.burst(q.pos, { count: 16, color: s.trail, speed: 3.6, life: 0.6, size: 0.22, sizeEnd: 0.06, drag: 2, up: 1.6, gravity: 6, shape: 1 }); } } }; }
  }
}
function behave(kind) {
  const shot = SHOTS[kind];
  const charger = kind === 'colchis_calf' || kind === 'boarlet', swoop = kind === 'keres';
  return (rig, dt, e) => {
    if (!e?.game) return;   // (the model workbench ticks rigs with no game)
    rig.enemy = e;
    const st = e.state, prev = rig.st; rig.st = st;
    const g = e.game;
    if (charger) {
      // pawing the ground in the wind-up, then a dash through the hero
      if (st === 'windup' && Math.random() < dt * 14) g.particles?.burst(_c.set(e.pos.x, e.pos.y + 0.1, e.pos.z), { count: 2, color: dustCol, additive: false, speed: 1.6, life: 0.5, size: 0.3, sizeEnd: 0.7, drag: 3, up: 0.8 });
      if (kind === 'colchis_calf' && Math.random() < dt * (st === 'windup' ? 10 : 1.2)) { rig.extras.nose?.getWorldPosition(_c); g.particles?.burst(_c, { count: 1, color: st === 'windup' ? fireCol : C(0x8a8a8a), additive: st === 'windup', speed: 0.6, life: 0.6, size: 0.18, sizeEnd: 0.4, drag: 2, up: 1 }); }
      if (prev === 'windup' && st === 'recover' && e.action?.kind === 'bite' && e.lunge) {
        e.lunge.multiplyScalar(2.7);
        _f.set(Math.sin(e.facing), 0, Math.cos(e.facing));
        g.particles?.burst(_c.set(e.pos.x, e.pos.y + 0.2, e.pos.z), { count: 10, color: dustCol, additive: false, speed: 3, life: 0.6, size: 0.35, sizeEnd: 0.9, drag: 3, up: 0.6 });
        if (kind === 'colchis_calf') {
          // the jet of fire: a short cone of flame ahead, and a patch that burns a moment
          rig.extras.nose?.getWorldPosition(_c);
          g.particles?.burst(_c, { count: 18, color: fireCol, speed: 6, spread: 0.35, dir: _f, life: 0.4, size: 0.3, sizeEnd: 0.1, drag: 4 });
          g.particles?.burst(_c, { count: 8, color: fireHot, speed: 4, spread: 0.25, dir: _f, life: 0.3, size: 0.2, sizeEnd: 0.05, drag: 4 });
          g.hazards?.fire(_c.set(e.pos.x + _f.x * 2.2, e.pos.y, e.pos.z + _f.z * 2.2), e.dmg * 0.3, 1);
          g.audio?.energy?.('fire');
        }
      }
    }
    // the crab scuttles sideways, and turns to face you to pinch
    if (rig.sideways) { const run = Math.hypot(e.vel.x, e.vel.z) > 1.2 && st !== 'windup' && st !== 'recover'; const want = run ? Math.PI / 2 : 0; rig.hips.rotation.y += (want - rig.hips.rotation.y) * Math.min(1, dt * 8); }
    // the king crab raises its crusher high in the wind-up, slams it down, opens and shuts it
    // (down to level: the head's own pitch in the slam brings it to the ground; pitched 0.35 further it sank 0.6 m into it)
    if (rig.extras.crusherArm) {
      const A = rig.extras.crusherArm, want = st === 'windup' ? -1.3 : 0, open = st === 'windup' ? 0.55 : 0.05;
      rig.stT = st === prev ? (rig.stT ?? 0) + dt : 0;
      A.rotation.x += (want - A.rotation.x) * Math.min(1, dt * (want > A.rotation.x ? 14 : 5));
      rig.extras.crusher.rotation.x += (open - rig.extras.crusher.rotation.x) * Math.min(1, dt * 10);
    }
    // the calf's vents smoke; the Laistrygonian's ball burns
    if (kind === 'colchis_calf' && rig.extras.vents && Math.random() < dt * 2.2) { rig.extras.vents.getWorldPosition(_c); _c.y += 0.25; g.particles?.burst(_c, { count: 1, color: smokeCol, additive: false, speed: 0.4, life: 1.2, size: 0.25, sizeEnd: 0.6, drag: 1.5, up: 1.6, gravity: -1.2 }); }
    if (kind === 'laistrygonian' && rig.extras.ball && Math.random() < dt * 8) { rig.extras.ball.getWorldPosition(_c); _c.y += 0.4; g.particles?.burst(_c, { count: 1, color: Math.random() < 0.5 ? fireCol : fireHot, speed: 0.6, life: 0.5, size: 0.3, sizeEnd: 0.05, drag: 2, up: 2, gravity: -2 }); }
    // the keres hang in the air and drop to strike, their claws trailing red
    if (swoop && (st === 'windup' || st === 'recover') && Math.random() < dt * 24) { (Math.random() < 0.5 ? rig.handR : rig.handL).getWorldPosition(_c); g.particles?.burst(_c, { count: 1, color: redCol, speed: 0.2, life: 0.45, size: 0.18, sizeEnd: 0.04, drag: 3 }); }
    if (swoop) { const want = st === 'windup' || st === 'recover' ? 0.25 : 1.25; rig.float += (want - rig.float) * Math.min(1, dt * (want < rig.float ? 9 : 3)); }
    if (shot && prev === 'windup' && st === 'recover' && e.action?.kind === 'spit') restyleShots(e, shot);
    if (rig.extras.fists) pummel(rig, dt, e, g);
    // the basilisk: sparks at its lips as it rears, then a short puff of fire at the marked spot as it strikes
    if (kind === 'basilisk' && (st === 'windup' || (prev === 'windup' && st === 'recover' && e.action?.kind === 'sting'))) {
      rig.mouth.getWorldPosition(_c);
      if (st === 'windup') { if (Math.random() < dt * 12) g.particles?.burst(_c, { count: 1, color: fireHot, speed: 0.6, life: 0.3, size: 0.1, sizeEnd: 0.03, up: 0.6 }); }
      else {
        _f.set(Math.sin(e.facing), 0.15, Math.cos(e.facing));
        g.particles?.burst(_c, { count: 14, color: fireCol, speed: 4, spread: 0.4, dir: _f, life: 0.35, size: 0.22, sizeEnd: 0.06, drag: 4 });
        g.particles?.burst(_c, { count: 6, color: fireHot, speed: 3, spread: 0.3, dir: _f, life: 0.25, size: 0.14, sizeEnd: 0.04, drag: 4 });
      }
    }
  };
}

// The Earthborn's barrage (enemy.js punch): six straight punches, one arm at
// a time, top pair to bottom, right then left. In the wind-up the body rears
// back with all six fists up on guard; then each arm in turn draws back (its
// shoulder turning away), drives its fist straight out in front of the chest
// as its blow lands (the torso twisting and leaning into it, the shoulder
// thrown forward), and pulls back to guard while the next arm, on the other
// side, is already drawing back. The clock is the action's own (wind-up,
// then recover), and each arm's punch is timed from the blows enemy.js
// actually lands (a.hit), so the fist arrives with the damage. A puff of
// dust kicks up where each lands.
// Arm poses: { x: pitch (- forward), z: splay (x out, mirrored per side), pz: shoulder forward (px) }
const PUM_TOP = { guard: { x: -0.8, z: 0.22, pz: 0 }, back: { x: 0.45, z: 0.42, pz: -2.2 }, fwd: { x: -1.6, z: -0.1, pz: 3.2 } };
const PUM_LOW = { guard: { x: -0.45, z: 0.55, pz: 0 }, back: { x: 0.55, z: 0.72, pz: -1.6 }, fwd: { x: -1.5, z: 0.06, pz: 2.6 } };
const PUM_BACK = 0.26, PUM_DRIVE = 0.08, PUM_HOLD = 0.06, PUM_RET = 0.22;   // (seconds: draw back, drive, hold, pull back)
const smooth = (k) => k * k * (3 - 2 * k);
// weights of the guard, back and forward poses u seconds after an arm's blow
function punchPhase(u, out) {
  let b = 0, f = 0;
  if (u < -PUM_BACK) { /* on guard */ } else if (u < -PUM_DRIVE) b = 1 - (1 - (u + PUM_BACK) / (PUM_BACK - PUM_DRIVE)) ** 3;
  else if (u < 0) { const k = ((u + PUM_DRIVE) / PUM_DRIVE) ** 2; f = k; b = 1 - k; }
  else if (u < PUM_HOLD) f = 1;
  else if (u < PUM_HOLD + PUM_RET) f = 1 - smooth((u - PUM_HOLD) / PUM_RET);
  out.b = b; out.f = f; return out;
}
const _ph = { b: 0, f: 0 };
function pummel(rig, dt, e, g) {
  const a = e.action, on = a?.kind === 'pummel' && (e.state === 'windup' || e.state === 'recover'), F = rig.extras.fists;
  const S = rig.pumS ??= { W: 0, n: 0, at: 0, top: { W: 0, x0: 0, z0: 0, x1: 0, z1: 0, lean: 0, twist: 0 } };
  S.W += ((on ? 1 : 0) - S.W) * Math.min(1, dt * (on ? 14 : 6));
  if (S.W < 0.005 && !on) {
    if (rig.pum) { for (const f of F) { f.arm.position.z = f.pz0; if (f.rz0 != null) f.arm.rotation.z = f.rz0; } rig.pum = null; }
    S.n = 0; return;
  }
  const n = on ? a.hit ?? 0 : S.n, wu = on ? a.windup : 0.55, gap = on ? a.gap : 0.2;
  const tau = !on ? S.tau ?? 0 : e.state === 'windup' ? e.stateT : wu + e.stateT;
  if (on && n !== S.n) {
    S.n = n; S.at = tau;
    if (n > 0) { F[n - 1].fist.getWorldPosition(_c); _f.set(Math.sin(e.facing), 0, Math.cos(e.facing)); g.particles?.burst(_c, { count: n % 2 ? 4 : 8, color: dustCol, additive: false, speed: 2.2, spread: 0.8, dir: _f, life: 0.5, size: 0.3, sizeEnd: 0.8, drag: 3, up: 0.6 }); }
  }
  if (on) S.tau = tau;
  const W = S.W, T = S.top;
  let twist = 0, lean = 0, active = 0;
  for (let i = 0; i < 6; i++) {
    const at = n > 0 ? S.at + (i - (n - 1)) * gap : wu + i * gap;
    const { b, f } = punchPhase(tau - at, _ph), gd = 1 - b - f, side = i % 2 ? -1 : 1, o = -side, Pp = i < 2 ? PUM_TOP : PUM_LOW;
    const x = Pp.guard.x * gd + Pp.back.x * b + Pp.fwd.x * f, z = o * (Pp.guard.z * gd + Pp.back.z * b + Pp.fwd.z * f), pz = Pp.back.pz * b + Pp.fwd.pz * f;
    twist += side * (0.3 * f - 0.14 * b) * (i < 2 ? 1 : 0.8); lean += 0.13 * f - 0.04 * b; active += b + f;
    const A = F[i];
    A.arm.position.z = A.pz0 + W * pz * PX;
    if (i < 2) { if (i === 0) { T.x0 = x; T.z0 = z; } else { T.x1 = x; T.z1 = z; } }
    else { A.arm.rotation.x += W * (x - A.arm.rotation.x); A.arm.rotation.z = A.rz0 + W * (z - A.rz0); }
  }
  // the wind-up: the body rears back over the raised fists before the first blow
  if (n === 0 && on) lean -= 0.16 * smooth(Math.min(1, tau / (wu * 0.6))) * (1 - Math.min(1, active));
  T.lean = lean; T.twist = twist; T.W = W;
  rig.pum = T;
}

// ---- death bits: a burst of the kind's own stuff as it falls (Enemy.die
// already throws the golden dust). The rig hears of its death through
// animate's 'death' action.
// [colour, count, additive, speed, size, gravity]
const BITS = {
  karpos: [[C(0xe8c860), 16, false, 3.6, 0.13, 8], [C(0x9ab04a), 8, false, 2.6, 0.16, 6], [C(0x8aff3a), 5, true, 2, 0.12, -1]],
  karpos_slinger: [[C(0xe8c860), 14, false, 3.4, 0.13, 8], [C(0x3a8a2a), 8, false, 2.6, 0.16, 6], [C(0xffc030), 10, true, 3, 0.14, 4]],
  colchis_calf: [[C(0x8a5a26), 14, false, 4, 0.18, 12], [C(0x5a3a1a), 8, false, 3, 0.16, 12], [C(0xff7a1a), 14, true, 3.5, 0.22, -1], [C(0x6a6a6a), 6, false, 1.4, 0.5, -2]],
  myrmex: [[C(0x241c16), 12, false, 3.2, 0.15, 11], [C(0xd8801a), 8, false, 3, 0.12, 11], [C(0xff8a10), 4, true, 2, 0.1, 2]],
  myrmex_spitter: [[C(0x241c16), 10, false, 3.2, 0.15, 11], [C(0x7aff2a), 18, true, 3.4, 0.16, 9]],
  boarlet: [[C(0x4a3424), 14, false, 3.4, 0.18, 10], [C(0xe8dcc0), 8, false, 3, 0.12, 12], [C(0x8a6a4a), 8, false, 2, 0.45, -0.5]],
  crab: [[C(0xd04020), 14, false, 3.6, 0.15, 12], [C(0xf0ece0), 6, false, 3, 0.12, 12], [C(0x2a8a4a), 5, false, 2.4, 0.12, 10], [C(0x9ad8ff), 8, false, 2.4, 0.1, 9]],
  king_crab: [[C(0xa83418), 22, false, 4.4, 0.22, 12], [C(0x8a8478), 14, false, 3.6, 0.24, 14], [C(0x9ad8ff), 14, false, 3, 0.12, 9]],
  basilisk: [[C(0x3a8a3a), 12, false, 3, 0.13, 10], [C(0xffd020), 6, true, 2.4, 0.12, 4], [C(0xe8ff20), 6, true, 2, 0.12, 2]],
  earthborn: [[C(0x8a6a4a), 26, false, 4.6, 0.3, 14], [C(0x6a7a2a), 10, false, 3.6, 0.22, 14], [C(0x5e4630), 14, false, 3, 0.6, -0.4], [C(0xffa040), 8, true, 3, 0.18, 2]],
  daedalus_drone: [[C(0xc08a2c), 14, false, 4, 0.12, 12], [C(0x5ad8ff), 12, true, 4, 0.14, 2], [C(0xe8b448), 6, true, 5, 0.08, 6]],
  laistrygonian: [[C(0xd8a070), 18, false, 4, 0.3, 12], [C(0x6a4428), 14, false, 3.4, 0.3, 12], [C(0xff7a1a), 22, true, 4.4, 0.3, -1], [C(0x4a5a7a), 8, false, 2, 0.2, 8]],
  shade: [[C(0x7ae8ff), 16, true, 1.4, 0.2, -1.2], [C(0x3a4458), 10, false, 1.2, 0.3, -0.6], [C(0xd8ffff), 6, true, 0.8, 0.14, -2]],
  keres: [[C(0x1a1218), 16, false, 3, 0.2, 6], [C(0xff2a2a), 16, true, 3.4, 0.14, 2], [C(0xe8e4e0), 8, false, 2.4, 0.14, 8]],
};
export function finish(rig, kind) {
  const anim = rig.animate.bind(rig), act = behave(kind);
  rig.onTick = (dt, e) => act(rig, dt, e);
  rig.animate = (p) => {
    if (p.action?.type === 'death' && !rig.burst && rig.enemy) {
      rig.burst = true;
      const e = rig.enemy, g = e.game, big = e.def.tier !== 'minor' || e.height > 1.9;
      _c.set(e.pos.x, e.pos.y + Math.min(1.6, e.height * 0.45), e.pos.z);
      for (const [color, count, additive, speed, size, gravity] of BITS[kind]) {
        g.particles?.burst(_c, { count, color, additive, speed, size, gravity, life: additive ? 0.9 : 0.7, drag: additive ? 2.5 : 1.2, up: additive ? 1.6 : 1, sizeEnd: additive ? 0.04 : size * 0.7, shape: additive ? 0 : 1, intensity: additive ? 1.6 : 1 });
      }
      if (kind === 'myrmex_spitter') g.fx?.splat?.(_c, 0x9aff3a);
      if (big) g.shake?.(0.25);
      g.audio?.fodderDie?.(kind);
    }
    // a held pose on top of the walk (the Laistrygonian's ball, the Earthborn's raised fists)
    // (and the Earthborn's top fists in a pummel, rig.pum)
    // (offsets added after the pose: [armR x, armL x, armR z, armL z, torso x, torso y], taken off again before the next)
    const P = rig.held, U = rig.posed, aR = rig.armR.rotation, aL = rig.armL.rotation, tR = rig.torso.rotation;
    if (U) { aR.x -= U[0]; aL.x -= U[1]; aR.z -= U[2]; aL.z -= U[3]; tR.x -= U[4]; tR.y -= U[5]; rig.posed = null; }
    anim(p);
    const D = rig.posedArr ??= new Float32Array(6); D.fill(0);
    let on = false;
    if (P && !p.action) { D[0] = P[0]; D[1] = P[1]; on = true; }
    const Q = rig.pum;
    if (Q) {
      // the top pair's punch (the arm's own pitch and splay; the spread rigOffsets adds after is allowed for) and the body's twist and lean
      const W = Q.W, sp = rig.armSpread ?? 0;
      D[0] += W * (Q.x0 - aR.x - D[0]); D[1] += W * (Q.x1 - aL.x - D[1]);
      D[2] = W * (Q.z0 + sp - aR.z); D[3] = W * (Q.z1 - sp - aL.z);
      D[4] = W * (Q.lean - tR.x); D[5] = W * (Q.twist - tR.y);
      on = true;
    }
    if (on) { aR.x += D[0]; aL.x += D[1]; aR.z += D[2]; aL.z += D[3]; tR.x += D[4]; tR.y += D[5]; rig.posed = D; }
  };
  return rig;
}
