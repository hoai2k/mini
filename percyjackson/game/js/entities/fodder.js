// The open world's fodder (concept sheets design/concept/vox-ow-fodder.png,
// -2, -3 and -fix, which replaces the earlier ants and king crab): the
// monsters you plow through in the Minecraft
// Dungeons way, in hordes, each region with a few kinds that play
// differently (short and long range, small and large) and a tough rare one.
//
//   fields     karpos (swarm melee), karpos slinger (seed pods from range),
//              Colchis bull calf (larger: charges, a short jet of fire)
//   woods      myrmex (swarm melee), myrmex spitter (lobs acid),
//              Calydonian boarlet (larger: charges)
//   shore      crab (scuttles sideways), king crab (rare tank: crusher claw)
//   canyon     (myrmekes and spitters, as in the woods), Earthborn (rare: a
//              six-armed clay giant lobbing mud)
//   labyrinth  Daedalus drone (a bronze clockwork bird firing bolts)
//   othrys     basilisk (the books' arm-long snake, in threes: fast, a puff
//              of fire, a poison touch), Laistrygonian (rare: a huge giant
//              lobbing flaming balls)
//   asphodel   shade (slow, drifts in crowds), keres (fast swooping fliers)
//
// Every model is seen by the hundred, so each has a strong silhouette and a
// bold accent that reads in a crowd (glowing eyes, a fire glow, a gold crown,
// a red claw), and costs little: rounded voxel masses (blob below: only the
// cells' open faces) and boxes merged into one mesh per moving part
// (monsters.js's voxel kit), geometry built once per kind and shared by every
// spawn (kitOf), skins shared per kind (no shaders built per spawn; painted
// without a read-back pass), no ambient aura, and small parts cast no shadow. Each bursts into its own bits as it goes (on
// top of the golden dust every monster leaves) with its own small sound
// (audio.js fodderVoice / fodderDie).
//
// Behaviour rides on the existing AIs (entities/enemy.js) through rig.onTick
// (monsters.js calls it every frame): the chargers' bite becomes a dash with
// dust (and for the calf a jet of fire), the keres drop out of the air to
// strike, and the shooters' shots are restyled (seed pods, mud, bolts,
// flaming balls).
//
// monsters.js wires these in (fodderModels below takes its voxel kit, so this
// module never imports monsters.js and there is no import cycle).
import * as THREE from 'three/webgpu';
import { Rig, PX, markHeld } from './character.js';
import { QuadRig, paintQuad } from './quad.js';
import { SerpentRig } from './serpent.js';
import { paintPerson } from './mortals.js';
import { t as txt } from '../text_config.js';
import { HS, skinMat, group, sway, BUILD, voxDensity, keepAbove } from './parts.js';
import { addFlames } from './flames.js';
import { shapeX, unshapeX, shapeK, legScale, reshape, applyShape, markHeadCore, markHeadwear } from './proportions.js';

// The new kinds (world/roamZones.js counts the small ones as fodder).
export const FODDER_IDS = ['karpos', 'karpos_slinger', 'colchis_calf', 'myrmex', 'myrmex_spitter', 'boarlet', 'crab', 'king_crab', 'basilisk', 'earthborn', 'daedalus_drone', 'laistrygonian', 'shade', 'keres'];

// Stat blocks (as monsters.js MONSTERS). The swarm kinds sit with the other
// minors (rat 14 HP, spider 20, pup 32); the larger chargers are minor
// bruisers; the king crab, the Earthborn and the Laistrygonian are elites.
export const FODDER_MONSTERS = {
  // fields
  karpos: { name: txt('monsters.karpos.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 5.4, dmg: 4, radius: 0.48, height: 1.9, ai: 'melee', range: 1.2, windup: 0.35, cd: 1.1, xp: 2, coins: [0, 2], model: 'karpos', pitch: 1.6, voice: 'rustle', knockResist: 0 },
  karpos_slinger: { name: txt('monsters.karpos_slinger.name'), tier: 'minor', role: 'ranged', hp: 12, speed: 4.2, dmg: 5, radius: 0.48, height: 1.9, ai: 'ranged', range: 11, keep: 7, windup: 0.8, cd: 3.2, xp: 2, coins: [0, 2], model: 'karpos_slinger', pitch: 1.4, voice: 'rustle', projectile: 'feather', knockResist: 0 },
  colchis_calf: { name: txt('monsters.colchis_calf.name'), tier: 'minor', role: 'bruiser', hp: 55, speed: 4.4, dmg: 10, radius: 0.85, height: 1.5, ai: 'melee', range: 3.2, windup: 0.75, cd: 2.2, xp: 5, coins: [2, 4], model: 'colchis_calf', pitch: 0.8, voice: 'snort', armor: 0.15, knockResist: 0.5, slashColor: 0xff7a1a },
  // woods
  myrmex: { name: txt('monsters.myrmex.name'), tier: 'minor', role: 'rusher', hp: 22, speed: 4.8, dmg: 6, radius: 0.55, height: 0.9, ai: 'melee', range: 1.4, windup: 0.4, cd: 1.2, xp: 2, coins: [0, 2], model: 'myrmex', pitch: 1.3, voice: 'chitter', knockResist: 0.1 },
  myrmex_spitter: { name: txt('monsters.myrmex_spitter.name'), tier: 'minor', role: 'lobber', hp: 18, speed: 4, dmg: 6, radius: 0.6, height: 1, ai: 'ranged', range: 9, keep: 6, windup: 0.9, cd: 3.6, xp: 3, coins: [1, 2], model: 'myrmex_spitter', pitch: 1.1, voice: 'chitter', projectile: 'acid', lob: true, knockResist: 0.1 },
  boarlet: { name: txt('monsters.boarlet.name'), tier: 'minor', role: 'bruiser', hp: 50, speed: 5, dmg: 9, radius: 0.85, height: 1.9, ai: 'melee', range: 3.4, windup: 0.65, cd: 2, xp: 5, coins: [2, 4], model: 'boarlet', pitch: 0.9, voice: 'snort', knockResist: 0.5, slashColor: 0xf0e0c0 },
  // shore
  crab: { name: txt('monsters.crab.name'), tier: 'minor', role: 'fodder', hp: 28, speed: 4, dmg: 6, radius: 0.7, height: 0.9, ai: 'melee', range: 1.6, windup: 0.45, cd: 1.3, xp: 3, coins: [1, 3], model: 'crab', pitch: 1, voice: 'clack', armor: 0.1, knockResist: 0.3 },
  king_crab: { name: txt('monsters.king_crab.name'), tier: 'elite', role: 'tank', hp: 160, speed: 2.2, dmg: 16, radius: 1.8, height: 3.6, ai: 'tank', range: 2.4, windup: 0.9, cd: 2.4, xp: 10, coins: [4, 8], model: 'king_crab', pitch: 0.6, voice: 'clack', armor: 0.3, knockResist: 0.8, superArmor: true, slamR: 2.4 },
  // canyon
  basilisk: { name: txt('monsters.basilisk.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 6, dmg: 5, radius: 0.35, height: 0.6, ai: 'melee', range: 1.6, windup: 0.5, cd: 1.6, xp: 2, coins: [0, 2], model: 'basilisk', pitch: 1.9, voice: 'hiss', knockResist: 0, poison: { dps: 2, dur: 3 }, slashColor: 0xff7a1a,
    // (the books' arm-long snake: it rears and puffs a short burst of fire at the spot just ahead, its touch poisons; no projectile)
    moves: [{ kind: 'sting', trigger: 1.9, at: 1.1, radius: 0.8, windup: 0.5, recover: 0.5, dmg: 1 }] },
  earthborn: { name: txt('monsters.earthborn.name'), tier: 'elite', role: 'lobber', hp: 170, speed: 2.4, dmg: 14, radius: 1, height: 3, ai: 'ranged', range: 13, keep: 8, windup: 1.1, cd: 4.9, xp: 12, coins: [5, 9], model: 'earthborn', pitch: 0.55, voice: 'grind', projectile: 'acid', lob: true, armor: 0.15, knockResist: 0.75, superArmor: true,
    // up close: a barrage of all six fists, one after another down the body (every second blow lands: about one lob's damage in all)
    pummel: { trigger: 3.4, range: 3, windup: 0.6, recover: 0.6, hits: 6, gap: 0.2, every: 2, dmg: 0.36 } },
  // labyrinth
  daedalus_drone: { name: txt('monsters.daedalus_drone.name'), tier: 'minor', role: 'ranged', hp: 18, speed: 4.6, dmg: 6, radius: 0.5, height: 1.8, ai: 'ranged', range: 11, keep: 7, windup: 0.8, cd: 3.2, xp: 3, coins: [1, 3], model: 'daedalus_drone', pitch: 1.6, voice: 'whir', projectile: 'bullet', knockResist: 0.1 },
  // othrys
  laistrygonian: { name: txt('monsters.laistrygonian.name'), tier: 'elite', role: 'lobber', hp: 220, speed: 2.4, dmg: 18, radius: 1.1, height: 4.4, ai: 'ranged', range: 14, keep: 9, windup: 1.2, cd: 5, xp: 16, coins: [7, 12], model: 'laistrygonian', pitch: 0.45, voice: 'roar', projectile: 'fire', lob: true, armor: 0.1, knockResist: 0.85, superArmor: true },
  // asphodel
  shade: { name: txt('monsters.shade.name'), tier: 'minor', role: 'fodder', hp: 16, speed: 2.4, dmg: 5, radius: 0.4, height: 1.8, ai: 'melee', range: 1.5, windup: 0.6, cd: 1.6, xp: 2, coins: [0, 2], model: 'shade', pitch: 0.9, voice: 'wail', knockResist: 0 },
  keres: { name: txt('monsters.keres.name'), tier: 'minor', role: 'rusher', hp: 16, speed: 6.6, dmg: 6, radius: 0.45, height: 1.8, ai: 'melee', range: 1.5, windup: 0.35, cd: 1.2, xp: 2, coins: [0, 2], model: 'keres', pitch: 1.2, voice: 'shriek', knockResist: 0, slashColor: 0xff2a2a },
};

// ---- behaviour (rig.onTick, every frame while alive) --------------------------
const C = (c) => new THREE.Color(c);
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
function finish(rig, kind) {
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

// ---- helpers ------------------------------------------------------------------
// a rig's skin boxes in a group, gone: the kit draws cheaper ones
function dropAll(rig, g) { for (const m of [...g.children]) if (m.isMesh) { g.remove(m); rig.meshes.splice(rig.meshes.indexOf(m), 1); } }
function dropOne(rig, m) { if (!m) return; m.parent?.remove(m); const i = rig.meshes.indexOf(m); if (i >= 0) rig.meshes.splice(i, 1); }
const hatOf = (rig) => rig.head.children.find((m) => m.isMesh && m !== rig.headMesh);
// small parts cast no shadow (a horde of forty is a lot of shadow casters)
function noShadow(rig, ...groups) { for (const g of groups) for (const m of g.children) if (m.isMesh) m.castShadow = false; }
// plain skins for models the kit draws almost entirely
const flatQuad = (base, dark, belly, eye) => (S) => paintQuad(S, { base, dark, belly, eye, teeth: false, nose: dark, noise: 0.1, speckles: 10 });
// Simple flapping wings: a root (the arm) and an elbow (the hand) per side,
// a few boxes each; monsters.js animateExtras flaps rig.extras.wings.
function wings(rig, K, { y, z = -2, span, chord, cols, flap = 1, ragged = 0 }) {
  const W = [];
  for (const side of [-1, 1]) {
    const root = group(rig.torso, side * 2, y, z), elbow = group(root, side * span * 0.5, 0, 0), X = (v) => side * v, inL = span * 0.5, outL = span * 0.55;
    K.box(root, X(inL / 2), 0, 0, inL, 1.2, 1.2, cols.bone);
    K.box(root, X(inL / 2), -chord * 0.35, 0, inL, chord * 0.7, 0.5, cols.main);
    K.box(elbow, X(outL / 2), 0.2, 0, outL, 1, 1, cols.bone, 0, 0, side * 0.15);
    K.box(elbow, X(outL * 0.45), -chord * 0.3, 0, outL * 0.9, chord * 0.6, 0.45, cols.tip, 0, 0, side * 0.15);
    for (let i = 0; i < ragged; i++) { const h = 1.5 + K.r() * 2.5; K.box(elbow, X(outL * (0.15 + i * 0.8 / ragged)), -chord * 0.6 - h / 2, 0, 0.9, h, 0.35, cols.tip); }
    root.rotation.y = side * 0.3;
    W.push({ root, elbow, side });
  }
  rig.extras.wings = W; rig.wingFlap = flap;
  return W;
}

// ---- the detail kit on top of monsters.js's -----------------------------------------
// Geometry is built once per kind: the first spawn merges its boxes (one mesh
// per moving part, as the kit does) and shades them; every later spawn of the
// kind shares those geometries and skips the box work (a horde of forty
// builds one model's worth). The builds are seeded, so every spawn of a kind
// lays down the same parts in the same order.
// opts.density (default the champion's BUILD.k): the kit's and blobs' density
// (monsters.js VoxKit); the cache is kept per kind and density.
const GEO = new Map(), NOBOX = { order: 'XYZ' };
function kitOf(K0, kind, rig, mat, opts) {
  const K = K0.kit(rig, mat, opts), key = `${kind}@${K.density.toFixed(3)}`, hit = GEO.get(key), done = K.done.bind(K);
  K.nocache = true; K.ao = 0; K.cached = !!hit;   // (shaded below, once per kind)
  if (hit) K.box = function (p) { let L = this.lists.get(p); if (!L) this.lists.set(p, L = []); L.push(NOBOX); return this; };
  K.done = () => {
    const parts = [...K.lists.keys()];
    if (hit && hit.length === parts.length) {
      parts.forEach((p, i) => { const m = new THREE.Mesh(hit[i], K.mat); m.castShadow = true; m.receiveShadow = true; m.userData.baseMat = K.mat; rig.meshes.push(m); p.add(m); });
      K.lists.clear(); return rig;
    }
    if (hit) throw new Error(`fodder ${kind}: parts changed between builds`);
    const n = rig.meshes.length; done();
    const geos = rig.meshes.slice(n).map((m) => m.geometry);
    for (const g of geos) paintShade(g, opts.ao ?? 0.3);
    GEO.set(key, geos);
    return rig;
  };
  return K;
}
// Painted shading on the merged boxes: each part darkens toward its
// underside (the sheets' soft occlusion), and no lit colour is left bright
// enough to pass for a glowing one (only colours with a channel at full
// strength glow).
export function paintShade(g, ao) {
  const P = g.attributes.position.array, Cc = g.attributes.color.array;
  let lo = Infinity, hi = -Infinity;
  for (let i = 1; i < P.length; i += 3) { lo = Math.min(lo, P[i]); hi = Math.max(hi, P[i]); }
  const span = Math.max(1e-4, hi - lo);
  for (let i = 0; i < Cc.length; i += 3) {
    const m = Math.max(Cc[i], Cc[i + 1], Cc[i + 2]);
    if (Math.abs(m - 1) < 1e-6) continue;   // a glowing cell
    const t = (P[i + 1] - lo) / span, k = (1 - ao) + ao * Math.sqrt(t), top = Math.min(1, 0.97 / Math.max(1e-4, m * k));
    for (let c = 0; c < 3; c++) Cc[i + c] *= k * top;
  }
  g.attributes.color.needsUpdate = true;
}
// A rounded voxel mass, stepped like the sheets: an ellipsoid (centre c,
// radii r, in skin pixels) filled with cells, only the faces open to the air
// drawn (and merged along x where neighbours share a colour), added to the
// part's merged mesh. col(x, y, z) (each -1..1 across the radii) paints a run
// of a few cells along x, so bands, mottling and patches show as pixels.
// lo/hi keep a slice of it (lo 0 is a dome), pw squares it off (2 is round,
// 3 boxier), rx tilts it about x (rear up, nose down), keep(x, y, z) carves.
const FACE6 = [[1, 0, 0, 0.9], [-1, 0, 0, 0.9], [0, 1, 0, 1.1], [0, -1, 0, 0.62], [0, 0, 1, 1], [0, 0, -1, 0.84]];
// The cell shrinks with the kit's density (K.density), so a big model's
// masses are made of hero-sized cells. Untilted blobs of one part share one
// grid of cells (K.vgrid): a later blob paints over an earlier one where
// they overlap, and only the faces of the whole sculpted mass that are open
// to the air are drawn (flushBlobs, when the kit is done), so masses can be
// stacked and carved freely without paying for the faces between them.
export function blob(K, p, c, r, cell, col, { lo = -1, hi = 1, pw = 2, rx = 0, run = [2, 4], keep = null } = {}) {
  if (!K.lists.has(p)) K.lists.set(p, []);
  if (K.cached) return;
  cell /= K.density ?? 1;
  // (a part its builder reshaped, proportions.js: the mass lands through its
  // shape, sculpted afresh from cells of the same size)
  const S = !K._raw && K.rig?.shape?.get(p);
  if (S) { r = r.map((v, a) => v * shapeK(S, c[1], a)); c = c.map((v, a) => shapeX(S, v, a)); }
  if (rx) return blobTilted(K, p, c, r, cell, col, { lo, hi, pw, rx, run, keep });
  K.vgrid ??= new Map();
  const gk = `${cell.toFixed(4)}`;
  let parts = K.vgrid.get(p); if (!parts) K.vgrid.set(p, parts = new Map());
  let G = parts.get(gk); if (!G) parts.set(gk, G = { cell, cells: new Map(), lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9] });
  const I0 = Math.floor((c[0] - r[0]) / cell), I1 = Math.ceil((c[0] + r[0]) / cell), J0 = Math.floor((c[1] - r[1]) / cell), J1 = Math.ceil((c[1] + r[1]) / cell), K0 = Math.floor((c[2] - r[2]) / cell), K1 = Math.ceil((c[2] + r[2]) / cell);
  for (let k = K0; k < K1; k++) for (let j = J0; j < J1; j++) {
    let colr = null, left = 0;
    for (let i = I0; i < I1; i++) {
      const x = ((i + 0.5) * cell - c[0]) / r[0], y = ((j + 0.5) * cell - c[1]) / r[1], z = ((k + 0.5) * cell - c[2]) / r[2];
      if (y < lo || y > hi || Math.abs(x) ** pw + Math.abs(y) ** pw + Math.abs(z) ** pw >= 1 || (keep && !keep(x, y, z))) { left = 0; continue; }
      if (left <= 0) { colr = toC(col(x, y, z)); left = run[0] + Math.floor(K.r() * (run[1] - run[0] + 1)); }
      G.cells.set(gkey(i, j, k), colr); left--;
      if (i < G.lo[0]) G.lo[0] = i; if (j < G.lo[1]) G.lo[1] = j; if (k < G.lo[2]) G.lo[2] = k;
      if (i > G.hi[0]) G.hi[0] = i; if (j > G.hi[1]) G.hi[1] = j; if (k > G.hi[2]) G.hi[2] = k;
    }
  }
}
const GW = 4096, GO = 2048;
const gkey = (i, j, k) => (i + GO) + GW * ((j + GO) + GW * (k + GO));
// Carve cells out of a part's shared blob grid: every cell whose centre
// passes cut(x, y, z) (in skin pixels) is removed (a mouth, a gap).
export function carve(K, p, cut) {
  const S = K.rig?.shape?.get(p);
  if (S) { const c0 = cut; cut = (x, y, z) => c0(unshapeX(S, x, 0), unshapeX(S, y, 1), unshapeX(S, z, 2)); }
  for (const G of K.vgrid?.get(p)?.values() ?? []) for (const key of [...G.cells.keys()]) {
    const i = key % GW - GO, j = Math.floor(key / GW) % GW - GO, k = Math.floor(key / (GW * GW)) - GO;
    if (cut((i + 0.5) * G.cell, (j + 0.5) * G.cell, (k + 0.5) * G.cell)) G.cells.delete(key);
  }
}
// Draw the shared blob grids: the open faces of every part's cells, merged
// along x where neighbours share a colour (monsters.js VoxKit.done calls it).
export function flushBlobs(K) {
  if (!K.vgrid) return;
  for (const [p, parts] of K.vgrid) for (const G of parts.values()) {
    if (!G.cells.size) continue;
    let F = K.vfaces.get(p); if (!F) K.vfaces.set(p, F = { P: [], N: [], C: [] });
    const { cell, cells } = G, h = cell / 2;
    const put = (x, y, z) => F.P.push(x * PX, y * PX, z * PX);
    const quad = (Q, fx, fy, fz, cc, sh) => {
      const hot = Math.max(cc.r, cc.g, cc.b) >= 0.999, g = hot ? 1 : sh;
      for (const q of [0, 1, 2, 0, 2, 3]) { put(...Q[q]); F.N.push(fx, fy, fz); F.C.push(cc.r * g, cc.g * g, cc.b * g); }
    };
    for (const [fx, fy, fz, sh] of FACE6) {
      if (fx) {
        // faces along x: strips merged along z
        for (let i = G.lo[0]; i <= G.hi[0]; i++) for (let j = G.lo[1]; j <= G.hi[1]; j++) {
          let k = G.lo[2];
          while (k <= G.hi[2]) {
            const cc = cells.get(gkey(i, j, k));
            if (!cc || cells.has(gkey(i + fx, j, k))) { k++; continue; }
            let e = k + 1;
            while (e <= G.hi[2] && cells.get(gkey(i, j, e)) === cc && !cells.has(gkey(i + fx, j, e))) e++;
            const x = (i + 0.5) * cell + fx * h, y = (j + 0.5) * cell, z0 = k * cell, z1 = e * cell;
            quad(fx > 0 ? [[x, y - h, z1], [x, y - h, z0], [x, y + h, z0], [x, y + h, z1]] : [[x, y - h, z0], [x, y - h, z1], [x, y + h, z1], [x, y + h, z0]], fx, 0, 0, cc, sh);
            k = e;
          }
        }
        continue;
      }
      // faces along y and z: strips merged along x
      for (let k = G.lo[2]; k <= G.hi[2]; k++) for (let j = G.lo[1]; j <= G.hi[1]; j++) {
        let i = G.lo[0];
        while (i <= G.hi[0]) {
          const cc = cells.get(gkey(i, j, k));
          if (!cc || cells.has(gkey(i, j + fy, k + fz))) { i++; continue; }
          let e = i + 1;
          while (e <= G.hi[0] && cells.get(gkey(e, j, k)) === cc && !cells.has(gkey(e, j + fy, k + fz))) e++;
          const x0 = i * cell, x1 = e * cell, y = (j + 0.5) * cell, z = (k + 0.5) * cell;
          let Q;
          if (fy) { const yy = y + fy * h; Q = fy > 0 ? [[x0, yy, z + h], [x1, yy, z + h], [x1, yy, z - h], [x0, yy, z - h]] : [[x0, yy, z - h], [x1, yy, z - h], [x1, yy, z + h], [x0, yy, z + h]]; }
          else { const zz = z + fz * h; Q = fz > 0 ? [[x0, y - h, zz], [x1, y - h, zz], [x1, y + h, zz], [x0, y + h, zz]] : [[x1, y - h, zz], [x0, y - h, zz], [x0, y + h, zz], [x1, y + h, zz]]; }
          quad(Q, 0, fy, fz, cc, sh);
          i = e;
        }
      }
    }
  }
  K.vgrid = null;
}
// (a blob tilted about x: drawn on its own, its open faces only)
function blobTilted(K, p, c, r, cell, col, { lo = -1, hi = 1, pw = 2, rx = 0, run = [2, 4], keep = null } = {}) {
  const nx = Math.ceil(r[0] / cell), ny = Math.ceil(r[1] / cell), nz = Math.ceil(r[2] / cell), DX = 2 * nx + 2, DY = 2 * ny + 2;
  const key = (i, j, k) => (i + nx + 1) + DX * ((j + ny + 1) + DY * (k + nz + 1));
  const cells = new Map();
  for (let k = -nz; k < nz; k++) for (let j = -ny; j < ny; j++) {
    let colr = null, left = 0;
    for (let i = -nx; i < nx; i++) {
      const x = (i + 0.5) * cell / r[0], y = (j + 0.5) * cell / r[1], z = (k + 0.5) * cell / r[2];
      if (y < lo || y > hi || Math.abs(x) ** pw + Math.abs(y) ** pw + Math.abs(z) ** pw >= 1 || (keep && !keep(x, y, z))) { left = 0; continue; }
      if (left <= 0) { colr = toC(col(x, y, z)); left = run[0] + Math.floor(K.r() * (run[1] - run[0] + 1)); }
      cells.set(key(i, j, k), colr); left--;
    }
  }
  let F = K.vfaces.get(p); if (!F) K.vfaces.set(p, F = { P: [], N: [], C: [] });
  const cs = Math.cos(rx), sn = Math.sin(rx), h = cell / 2;
  const put = (x, y, z) => F.P.push((c[0] + x) * PX, (c[1] + y * cs - z * sn) * PX, (c[2] + y * sn + z * cs) * PX);
  for (const [fx, fy, fz, sh] of FACE6) {
    for (let k = -nz; k < nz; k++) for (let j = -ny; j < ny; j++) {
      let i = -nx;
      while (i < nx) {
        const cc = cells.get(key(i, j, k));
        if (!cc || cells.has(key(i + fx, j + fy, k + fz))) { i++; continue; }
        // merge a strip along x of open faces of one colour (not for the x-facing ends)
        let e = i + 1;
        if (!fx) while (e < nx && cells.get(key(e, j, k)) === cc && !cells.has(key(e + fx, j + fy, k + fz))) e++;
        const hot = Math.max(cc.r, cc.g, cc.b) >= 0.999, g = hot ? 1 : sh;
        const x0 = i * cell, x1 = e * cell, y = (j + 0.5) * cell, z = (k + 0.5) * cell;
        // the quad's corners, wound to face out
        let Q;
        if (fx) { const x = (i + 0.5) * cell + fx * h; Q = fx > 0 ? [[x, y - h, z + h], [x, y - h, z - h], [x, y + h, z - h], [x, y + h, z + h]] : [[x, y - h, z - h], [x, y - h, z + h], [x, y + h, z + h], [x, y + h, z - h]]; }
        else if (fy) { const yy = y + fy * h; Q = fy > 0 ? [[x0, yy, z + h], [x1, yy, z + h], [x1, yy, z - h], [x0, yy, z - h]] : [[x0, yy, z - h], [x1, yy, z - h], [x1, yy, z + h], [x0, yy, z + h]]; }
        else { const zz = z + fz * h; Q = fz > 0 ? [[x0, y - h, zz], [x1, y - h, zz], [x1, y + h, zz], [x0, y + h, zz]] : [[x1, y - h, zz], [x0, y - h, zz], [x0, y + h, zz], [x1, y + h, zz]]; }
        const ny2 = fy * cs - fz * sn, nz2 = fy * sn + fz * cs;
        for (const q of [0, 1, 2, 0, 2, 3]) { put(...Q[q]); F.N.push(fx, ny2, nz2); F.C.push(cc.r * g, cc.g * g, cc.b * g); }
        i = e;
      }
    }
  }
}
const _cols = new Map();
const toC = (c) => { if (c instanceof THREE.Color) return c; if (!_cols.has(c)) _cols.set(c, new THREE.Color(c)); return _cols.get(c); };
// a colour from a list with a little jitter, picked at random (a pixel mosaic)
const mix = (K, cols, j = 0.14) => K.tone(cols, j);

// ---- karpos and karpos slinger -----------------------------------------------------
// (vox-ow-fodder, top left; vox-ow-fodder-2, top left) A gangly spirit of the
// grain, about 0.8 of a hero's height (round 9), its plume over his head: a straw hood over a dark face with two
// glowing green eyes, a great spray of ripe wheat ears and green blades
// fanning up behind the head (its silhouette in a crowd), a body of bound
// stalks with green leaves woven in, long straw arms bound with twine at the
// wrists ending in four long clawed fingers, and legs of bundled stalks with
// root toes. The slinger swings a twine sling with a glowing golden seed pod
// and carries a string of more at its belt.
const KG = { gold: 0xe0b050, goldL: 0xf8d878, goldD: 0xa8782a, straw: 0xd0a048, leaf: 0x3a8a2a, leafD: 0x1e5a1a, twine: 0x7a4a22, eye: 0x8aff3a, pod: 0xffc030 };
function karposSkin() {
  const { goldD, eye } = KG;
  return skinMat('karpos', (S) => paintPerson(S, { skin: 0x2a1c0c, eye: 0x140c04, eyeWhite: 0x140c04, brow: 0x2a1c0c, mouth: false, top: KG.gold, sleeve: KG.gold, hand: KG.gold, pants: goldD, shoes: false,
    face: (s, ey) => { s.rect(8, ey - 3, 8, 8, 0x1e1408, 0.1); for (const x of [9, 13]) { s.rect(x, ey - 0.5, 2, 2, eye, 0); s.dot(x + 0.5, ey, 0xe8ffb0, 1, 1); } s.rect(10, ey + 3, 4, 1, 0x0e0804, 0); } }), { emit: 1.6, scale: 1.05 });
}
function buildKarpos(K0, slinger = false) {
  const kind = slinger ? 'karpos_slinger' : 'karpos';
  const { gold, goldL, goldD, straw, leaf, leafD, twine, pod } = KG, STRAW = [gold, goldL, goldD, straw, 0xc89038], LEAF = [leaf, leafD, 0x5aa03a, 0x2a7a2a];
  const mat = karposSkin();
  // (round 9: the owner found them tiny. Measured without the wheat spray
  // (headwear, its own kit: perf/bodysize.cjs had counted the plume as body,
  // 0.68x Percy, where the body under it was 0.44x) a karpos now stands about
  // 0.8x Percy, a gangly fodder that reads at a distance in a swarm: rig scale
  // 0.74 → 1.27, the legs 8 → 10 pixels over the same root toes, its straw
  // and leaves in cells of a hero's voxel size (voxDensity), so a bigger
  // karpos is more cells, not bigger ones)
  const rig = new Rig({ material: mat, scale: 1.27, legH: 8, bodyH: 9, bodyW: 8, bodyD: 5.4, armW: 2.8, headS: 8, jacket: false });
  const L1 = 10, ANK = -6.9;
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1, legScale(8, L1, ANK), 1], [0, 0, 0], { ankle: ANK });
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  const D = voxDensity(rig), K = kitOf(K0, kind, rig, mat, { seed: slinger ? 131 : 101, rough: 0.85, emit: 0.9, ao: 0.3, density: D });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  // body: a sheaf of bound stalks, leaves woven in, a straw fringe hanging over the hips
  K.vox(T, 0, 5, 0, 7.2, 8, 4.6, [goldD, goldD, 0x98682a], { j: 0.1 });
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, L = 9 + K.r() * 4; K.flare(T, Math.sin(a) * 3.9, 9 - L / 2, Math.cos(a) * 2.7, 1.5, L, 0.8, K.tone(STRAW, 0.14), a, 0.12 + K.r() * 0.1); }
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, L = 5 + K.r() * 4; K.flare(T, Math.sin(a) * 4.3, 3.4 - L / 2, Math.cos(a) * 3, 1.2, L, 0.5, K.tone(LEAF, 0.1), a, 0.3); }
  for (const y of [3.4, 7.6]) K.box(T, 0, y, 0, 8.4, 0.9, 6, twine);
  K.box(T, 0, 3.4, 3.05, 1.4, 1.6, 0.6, 0x5a3418);
  // the hood: a rounded straw cowl round a dark face, streaked in stalks, a fringe over the brow
  blob(K, Hd, [0, H8 * 0.52, -0.4], [H8 / 2 + 1.6, H8 / 2 + 1.5, H8 / 2 + 1.6], 0.9, (x) => mix(K, [STRAW[(Math.floor((x + 1) * 6) + 8) % 5]], 0.1),
    { lo: -0.78, run: [1, 1], keep: (x, y, z) => !(z > -0.1 && Math.abs(x) < 0.66 && y < 0.5) });
  for (let x = -H8 / 2 + 0.4; x <= H8 / 2; x += 1.1) K.box(Hd, x, H8 - 0.3 - Math.abs(x) * 0.2, H8 / 2 + 0.6, 1.2, 2.2 + K.r() * 1.4, 0.9, K.tone(STRAW, 0.12));
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) K.box(Hd, sx * (H8 / 2 + 0.4 - i * 0.3), 2 - i * 1.2, H8 / 2 + 0.3 - i * 0.3, 1.2, 2.6, 1, K.tone(STRAW, 0.12));
  // the face: big glowing green eyes and a grin in the dark
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.7, H8 * 0.52, H8 / 2 + 0.1, 2, 1.8, 0.3, KG.eye); K.box(Hd, sx * 1.5, H8 * 0.56, H8 / 2 + 0.25, 0.8, 0.7, 0.2, 0xe8ffb0); }
  K.box(Hd, 0, H8 * 0.24, H8 / 2 + 0.1, 4, 1, 0.3, 0x0e0804); for (const x of [-1.4, -0.4, 0.6, 1.5]) K.box(Hd, x, H8 * 0.24 + 0.25, H8 / 2 + 0.2, 0.5, 0.5, 0.2, 0xe8d8a0);
  // the spray of wheat ears fanning up behind the head: stalks, ears of zigzag grains with awns, green blades
  const KP = kitOf(K0, kind + ':plume', rig, mat, { seed: slinger ? 132 : 102, rough: 0.85, emit: 0.9, ao: 0.3, density: D });   // (the plume: headwear, drawn apart so perf/bodysize.cjs can leave it out)
  KP.box(Hd, 0, H8 + 2.2, -0.4, 2.4, 1.4, 2.4, goldL); KP.box(Hd, 0, H8 + 3, -0.6, 1.2, 1.2, 1.2, gold);
  const ears = slinger ? 9 : 11;
  for (let i = 0; i < ears; i++) {
    const tilt = (i - (ears - 1) / 2) * (slinger ? 0.26 : 0.23), L = 6 + (1 - Math.abs(tilt)) * 4 + KP.r() * 2, z = -1.8 - (i % 3) * 1.6;
    const sx = Math.sin(tilt), cy = Math.cos(tilt), bx = sx * 2.6;
    KP.box(Hd, bx + sx * L / 2, H8 * 0.7 + cy * L / 2, z, 0.7, L, 0.7, goldD, 0, 0, -tilt);
    for (let k = 0; k < 5; k++) { const d = L + 0.8 + k * 1.3, w = k === 4 ? 1.2 : 1.5; for (const o of [-0.6, 0.6]) KP.box(Hd, bx + sx * (d + (o > 0 ? 0.6 : 0)) + o * cy, H8 * 0.7 + cy * (d + (o > 0 ? 0.6 : 0)) - o * sx, z, w, 1.6, 1.5, KP.tone(k > 2 ? [goldL, gold] : [gold, straw], 0.1), 0, 0, -tilt); }
    KP.box(Hd, bx + sx * (L + 8.2), H8 * 0.7 + cy * (L + 8.2), z, 0.4, 2.4, 0.4, goldL, 0, 0, -tilt);   // (the awn sunk into the last grain, round 9: it hung off it by a corner)
  }
  for (const [x, rz, L] of [[-5, 1.2, 8], [5, -1.2, 8], [-3.4, 0.7, 9], [3.6, -0.7, 9], [-1.4, 0.3, 10], [1.6, -0.3, 9], [0, 0, 7]]) KP.box(Hd, x - Math.sin(rz) * L * 0.3, H8 * 0.6 + Math.cos(rz) * L * 0.45, -1.4, 1.5, L, 0.5, KP.tone(LEAF, 0.1), 0, 0, rz);
  // long straw arms in bundles, bound at the wrist, big hands of four long clawed fingers
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -0.6, 0, 3.4, 3, 3.4, goldD);
    for (const [dx, dz] of [[-0.6, -0.5], [0.6, -0.5], [0, 0.6]]) K.box(arm, dx, -5.4, dz, 1.4, 8.4, 1.4, K.tone(STRAW, 0.12));
    K.box(arm, 0, -4, 0, 3, 0.7, 3, twine); K.box(arm, 0, -9.4, 0, 3.2, 1.1, 3.2, twine);
    K.box(arm, 0, -11, 0.2, 3, 2.2, 2.4, gold);
    for (const [dx, rz] of [[-1.2, 0.3], [-0.4, 0.1], [0.4, -0.1], [1.2, -0.3]]) { K.box(arm, dx, -13.4, 0.4, 0.7, 3.2, 0.7, straw, 0.15, 0, rz); K.box(arm, dx * 1.25, -15.4, 1.2, 0.6, 2, 0.6, gold, 0.7, 0, rz); K.box(arm, dx * 1.3, -16.2, 2.2, 0.45, 1, 0.45, 0x8a5a20, 1.2, 0, rz); }
    K.box(arm, -1.6, -11.6, 1, 0.6, 2.4, 0.6, straw, 0.4, 0, 0.6);
  }
  if (slinger) {
    // the sling: two cords from the right hand to a glowing pod; a string of pods at the belt
    // (a sling hangs: no point to aim; short enough that its swing clears the ground)
    const s = markHeld(group(rig.handR, 0, -1.4, 0));
    K.box(s, -0.4, -1.8, 0, 0.35, 3.6, 0.35, twine, 0, 0, 0.12); K.box(s, 0.4, -1.8, 0, 0.35, 3.6, 0.35, twine, 0, 0, -0.12);
    K.box(s, 0, -3.8, 0, 2.6, 1, 1.8, twine); K.box(s, 0, -3, 0, 2, 2, 2, pod); K.box(s, 0, -3, 0, 1.2, 2.6, 1.2, 0xfff0a0);
    sway(rig, s, 'x', 0.6, 7);
    for (const [x, y] of [[-2.6, 2.6], [-0.9, 2], [0.9, 2], [2.6, 2.6]]) { K.box(T, x, y, 3.1, 0.3, 1.2, 0.3, twine); K.box(T, x, y - 1.3, 3.2, 1.3, 1.3, 1.3, pod); }
    K.box(T, -2.6, 6, 0, 0.6, 9, 6.4, twine, 0, 0, 0.7);   // the sling's strap
  }
  // legs: bundled stalks bound at the knee, splaying into root toes
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    for (const [dx, dz] of [[-0.6, -0.4], [0.6, -0.4], [0, 0.6]]) K.box(leg, dx, -3.6, dz, 1.6, 7.4, 1.6, K.tone(STRAW, 0.12));
    K.box(leg, 0, -3.8, 0, 3.4, 0.9, 3.4, twine);
    for (const [dx, ry] of [[-1.1, 0.5], [0, 0], [1.1, -0.5]]) { K.box(leg, dx, -7.5, 1.4, 1, 0.9, 3.2, goldD, 0, ry, 0); K.box(leg, dx * 1.4, -7.7, 3, 0.7, 0.6, 1.2, 0x8a5a20, 0, ry, 0); }
    K.box(leg, 0, -7.6, -1.4, 0.9, 0.8, 2, goldD);
  }
  applyShape(rig);
  K.done(); markHeadwear(rig, () => KP.done());
  noShadow(rig, rig.armR, rig.armL, rig.legR, rig.legL);
  rig.hunch = 0.12; rig.armSpread = 0.45;
  return finish(rig, kind);
}

// ---- Colchis bull calf -----------------------------------------------------------
// (vox-ow-fodder-2, top right) A boxy bronze automaton bull calf, about a
// hero's height at the horns: big riveted bronze plates over a dark iron
// frame, round iron joints at shoulder and knee, two smoking vents on its
// back, a jointed iron tail with a bronze knob; a broad brown head with cream
// horns from bronze sockets, glowing orange eyes, a cream muzzle plate with
// glowing nostrils. It paws, then charges with a jet of fire.
// a riveted plate: a bronze slab with a lighter face, a dark lower lip and
// four gold rivets, facing out along x (side 1/-1), up (side 0) or forward
function plate(K, p, x, y, z, w, h, d, face, C) {
  // (the slab's outer face in hammered cells of the model's density, so a broad plate keeps a fine grain)
  K.vox(p, x, y, z, w, h, d, C.brz, { j: 0.06, faces: face === 'y' ? 't' : face === 'z' ? 'f' : face > 0 ? 'r' : 'l', relief: 0.08, out: 0.2 });
  if (face === 'y') { K.box(p, x, y + h / 2 + 0.1, z + 0.2, w - 0.8, 0.2, d - 1, C.brzL); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(p, x + a * (w / 2 - 0.5), y + h / 2 + 0.15, z + b * (d / 2 - 0.5), 0.5, 0.3, 0.5, C.gold); K.box(p, x, y - h / 2 + 0.1, z - d / 2 - 0.1, w, 0.5, 0.3, C.brzD); return; }
  if (face === 'z') { K.box(p, x, y + 0.2, z + d / 2 + 0.1, w - 0.8, h - 1, 0.2, C.brzL); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(p, x + a * (w / 2 - 0.5), y + b * (h / 2 - 0.5), z + d / 2 + 0.15, 0.5, 0.5, 0.3, C.gold); K.box(p, x, y - h / 2 + 0.25, z + d / 2 + 0.05, w, 0.5, 0.3, C.brzD); return; }
  const sx = face, fx = x + sx * (w / 2 + 0.1);
  K.box(p, fx, y + 0.2, z, 0.2, h - 1, d - 0.8, C.brzL);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(p, fx + sx * 0.05, y + a * (h / 2 - 0.5), z + b * (d / 2 - 0.5), 0.3, 0.5, 0.5, C.gold);
  K.box(p, fx - sx * 0.05, y - h / 2 + 0.25, z, 0.3, 0.5, d, C.brzD);
}
function buildCalf(K0) {
  // (darker than the old build: bronze-brown, copper and dark-iron plates in a
  // patchwork, dull brass rivets, nothing yellow)
  const C = { brz: [0x8a5a26, 0x6e4620, 0x94562c, 0x5e3c1c, 0x3a2e28], brzD: 0x34200e, brzL: 0xa0703a, gold: 0xb88840 };
  const iron = 0x2c221e, ironD = 0x1a120e, ironL = 0x3c3028, glow = 0xff8a1a, hot = 0xffd860, horn = 0xe8dcc0, hornD = 0xbcaa88, head = 0x5a3a22, headD = 0x3e2816, snout = 0xb8987a;
  const mat = skinMat('colchis_calf', flatQuad(0x7a5024, 0x3a2410, iron, glow), { rough: 0.4, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 2, bodyL: 12, bodyW: 8, bodyH: 7, legH: 7, legW: 3.2, headS: 5, snout: false, neckUp: -1.3, headZ: 2, gait: 1.2, ears: false, tail: 2, tailLen: 5, tailW: 1 });
  const K = kitOf(K0, 'colchis_calf', rig, mat, { seed: 137, rough: 0.4, metal: 0.25, emit: 0.9, ao: 0.35, density: voxDensity(rig) / 1.25 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 5;
  dropAll(rig, T); dropAll(rig, Hd);
  // the iron frame, then overlapping riveted plates: a high shoulder, banded back, side panels
  K.box(T, 0, 0, 0, 7.4, 6.4, 11.4, iron); K.box(T, 0, -3.4, 0, 6, 0.8, 9.4, ironD);
  for (const sx of [-1, 1]) {
    plate(K, T, sx * 4.1, 1.4, 3.8, 1, 6, 3.6, sx, C); plate(K, T, sx * 4.4, 0.2, 0.2, 1, 5, 3, sx, C); plate(K, T, sx * 4, 0.8, -3.6, 1, 5.4, 3.6, sx, C);
    for (const z of [1.9, -1.6]) K.box(T, sx * 3.9, 0.6, z, 0.6, 6, 0.6, ironD); K.box(T, sx * 3.9, 3.6, 0, 0.6, 0.6, 11, ironD);
    K.box(T, sx * 4.2, -2.6, 1.8, 0.8, 1.4, 9, ironL); for (let z = -4; z <= 4.5; z += 1.6) K.box(T, sx * 4.6, -2.6, z, 0.3, 0.6, 0.6, C.gold);
  }
  for (const [y, z, w, d] of [[4.6, 3.8, 7.8, 3.2], [4.2, 0.9, 7.4, 2.8], [3.8, -1.9, 7, 2.8], [3.4, -4.6, 6.6, 2.6]]) { plate(K, T, 0, y, z, w, 1.4, d, 'y', C); K.box(T, 0, y - 0.3, z - d / 2 - 0.2, w - 0.4, 1, 0.6, ironD); }
  // the great rounded shoulder hump, rising above the head: rows of plates (bronze,
  // copper, dark iron) split by dark seams, studded with rivets
  const HUMP = [0x9a6a2e, 0x7a4e22, 0xa0602e, 0x8a5a26, 0x3e322a, 0x946a34];
  blob(K, T, [0, 3.4, 2.4], [5.3, 6, 5], 0.9, (x, y, z) => {
    const band = Math.floor((z + 1) * 2.2), row = Math.floor((y + 1) * 2.4);
    if ((z + 1) * 2.2 - band < 0.14) return ironD;
    if ((y + 1) * 2.4 - row < 0.12) return iron;
    if (K.r() < 0.06) return C.gold;
    return HUMP[(band * 3 + row * 2 + (x > 0 ? 1 : 0)) % HUMP.length];
  }, { lo: 0.02, pw: 2.3, run: [1, 3] });
  plate(K, T, 0, 0.6, 5.9, 7, 6, 0.8, 'z', C);
  K.box(T, 0, 0.2, 6.5, 3.6, 3, 0.4, ironD); for (const y of [-0.8, 0.2, 1.2]) K.box(T, 0, y, 6.7, 3, 0.5, 0.3, y > 0.5 ? hot : glow);   // the furnace grille
  K.box(T, 0, 1.4, -5.8, 6.8, 5, 0.6, mix(K, C.brz)); K.box(T, 0, 1.4, -6.1, 2.4, 2.4, 0.4, ironD);
  // two smoking vents on the back
  const vents = group(T, 0, 4.8, -2.9);
  for (const sx of [-1, 1]) { K.box(vents, sx * 1.8, 0.8, 0, 1.4, 2.4, 1.4, iron); K.box(vents, sx * 1.8, 2.1, 0, 1.8, 0.4, 1.8, C.brzD); K.box(vents, sx * 1.8, 2.25, 0, 0.9, 0.2, 0.9, 0x1a1210); K.box(vents, sx * 1.8, 0.2, 0, 2, 0.5, 2, C.gold); }
  rig.extras.vents = vents;
  // head: a broad brown head under a bronze brow plate, glowing eyes, a cream muzzle, curving horns from bronze sockets
  const hz = hs * 0.35, fz = hz + hs / 2;
  blob(K, Hd, [0, 0, hz], [hs / 2 + 0.8, hs / 2 + 0.2, hs / 2 + 0.2], 0.8, () => [head, headD, 0x5a3a20][Math.floor(K.r() * 3)], { pw: 3, run: [1, 2] }); for (const sx of [-1, 1]) plate(K, Hd, sx * (hs / 2 + 0.6), -0.4, hz + 0.6, 0.8, 2.6, 2.8, sx, C);
  K.box(Hd, 0, hs * 0.44, hz + 0.2, hs + 1.4, 1.4, hs + 0.4, mix(K, C.brz)); K.box(Hd, 0, hs * 0.44 + 0.3, fz + 0.4, hs - 1, 1, 0.4, C.brzL);
  for (const x of [-2.4, -0.8, 0.8, 2.4]) K.box(Hd, x, hs * 0.44 + 0.75, hz + 0.2, 0.4, 0.3, 0.4, C.gold);
  K.box(Hd, 0, -1.4, fz + 0.9, hs - 1, 3.4, 1.8, snout); K.box(Hd, 0, -2.9, fz + 0.7, hs - 2, 1, 1.4, 0x8a6a50); K.box(Hd, 0, 0.4, fz + 0.5, hs - 2.4, 0.8, 1, 0x8a6a50);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 1.1, -1.4, fz + 1.85, 1, 1.2, 0.3, ironD); K.box(Hd, sx * 1.1, -1.6, fz + 1.95, 0.6, 0.6, 0.3, glow);
    K.box(Hd, sx * 2.3, 1, fz + 0.05, 1.8, 1.3, 0.4, ironD); K.box(Hd, sx * 2.3, 1, fz + 0.2, 1.4, 0.9, 0.3, glow); K.box(Hd, sx * 2.1, 1.15, fz + 0.3, 0.6, 0.5, 0.2, hot);
    K.box(Hd, sx * (hs / 2 + 0.9), hs * 0.4, hz, 1.8, 2.2, 2.2, C.brzD); K.box(Hd, sx * (hs / 2 + 1.5), hs * 0.4, hz, 0.6, 1.6, 1.6, C.gold);
    for (const [x, y, z, w, h, d, col, rz] of [[2.4, 0.3, 0.2, 2.6, 1.7, 1.7, horn, 0.15], [4.3, 0.9, 0.4, 1.8, 1.5, 1.5, horn, 0.35], [5.2, 2.2, 0.6, 1.4, 1.8, 1.3, hornD, -0.1], [5.4, 3.7, 0.8, 1.1, 1.6, 1.1, horn, -0.25], [5.3, 4.9, 1, 0.8, 1, 0.8, 0xf4ecdc, -0.4]]) K.box(Hd, sx * (hs / 2 + x), hs * 0.4 + y, hz + z, w, h, d, col, 0, 0, sx * rz);
    K.box(Hd, sx * (hs / 2 + 0.3), hs * 0.1, hz - 1.4, 0.6, 2.2, 1.6, mix(K, C.brz));
  }
  rig.extras.nose = group(Hd, 0, -1.8, fz + 2.2);
  K.box(M, 0, -1, 1.6, hs - 2, 1.2, 2.2, head); K.box(M, 0, -1.6, 1.8, hs - 2.4, 0.4, 1.8, C.brzD);
  // legs: bronze thigh plates with rivets, round iron knees, shin guards, banded dark hooves
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    const sd = leg.userData.side;
    K.box(leg, 0, -1.4, 0, 3.6, 3.8, 3.8, mix(K, C.brz)); K.box(leg, sd * 1.9, -1.4, 0, 0.4, 3, 3, C.brzL); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(leg, sd * 2.1, -1.4 + a * 1.2, b * 1.2, 0.3, 0.5, 0.5, C.gold);
    K.box(leg, 0, -3.7, 0, 3, 1.6, 3, ironD); K.box(leg, 0, -3.7, 0, 3.4, 1, 2, ironL); K.box(leg, sd * 1.75, -3.7, 0, 0.3, 0.9, 0.9, C.gold);
    K.box(leg, 0, -5.2, 0, 2.5, 2, 2.5, iron); K.box(leg, 0, -5, 1.3, 2.2, 1.8, 0.5, mix(K, C.brz));
    K.box(leg, 0, -6.4, 0.2, 3.4, 0.6, 3.6, C.gold); K.box(leg, 0, -7, 0.2, 3.2, 0.8, 3.4, ironD); K.box(leg, 0, -7, 1.9, 0.5, 0.8, 0.3, 0x120c08);
  }
  for (const s of rig.tail) dropAll(rig, s);
  K.box(rig.tail[0], 0, 0, -1.4, 0.9, 0.9, 2.8, iron); K.box(rig.tail[0], 0, 0, -2.8, 1.3, 1.3, 0.8, C.gold); K.box(rig.tailTip, 0, 0, -1.6, 0.8, 0.8, 2.6, iron); K.box(rig.tailTip, 0, 0, -3.2, 1.8, 1.8, 1.4, C.brzL); K.box(rig.tailTip, 0, 0, -3.2, 1.2, 2.2, 0.8, C.gold);
  K.done();
  rig.head.scale.setScalar(1.18);   // a heavy head, held low under the hump
  noShadow(rig, M, rig.tailTip, rig.tail[0], ...rig.legs);
  return finish(rig, 'colchis_calf');
}

// ---- myrmex and myrmex spitter -----------------------------------------------------
// (vox-ow-fodder-fix, top two rows) A giant ant (six legs, though the
// sheet's front views show about eight): a big round head with an orange
// band round the face and glowing orange eyes, big curved bronze mandibles,
// elbowed antennae banded and tipped in orange, a small thorax, a narrow
// waist and a huge round abdomen banded black and orange-bronze; six legs,
// dark with orange bands at every joint. The spitter's abdomen is a huge
// glowing green sac striped in dark and pale green, its eyes burn green and
// green drips from its jaws; it sprays an arc of acid that splashes.
function buildMyrmex(K0, spitter = false) {
  const kind = spitter ? 'myrmex_spitter' : 'myrmex';
  const blk = 0x1e1614, blkL = 0x3a2a24, blkD = 0x120e0c, org = 0xe08a1a, orgD = 0xa85a12, orgL = 0xffb040, eye = spitter ? 0x8aff3a : 0xff8a10, eyeL = spitter ? 0xe0ffb0 : 0xffe0a0;
  const ACID = 0x5aff2a, ACIDD = 0x1e7a1a, ACIDM = 0x34b82a, ACIDL = 0xc8ff70;
  const DARK = [blk, blkL, blkD, 0x2a1e1c, 0x261a22], ORG = [org, orgD, 0xc87818], SAC = [ACID, ACIDM, 0x48e030, ACIDL];
  const mat = skinMat('myrmex', flatQuad(blk, 0x0e0a08, 0x2a2018, 0xff8a10), { rough: 0.3, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.14, bodyL: 4.6, bodyW: 4, bodyH: 3.6, legH: 6.6, legW: 1.7, headS: 7, legs: 6, splay: 1.15, footL: 7.4, kneeOut: 0.3, legY: 0.4, snout: false, neckUp: 1, headZ: 1.8, gait: 1.8, ears: false });
  const K = kitOf(K0, kind, rig, mat, { seed: spitter ? 107 : 103, rough: 0.3, metal: 0.15, emit: 0.9, ao: 0.4 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, { hs, legW } = rig.dims;
  dropAll(rig, T); dropAll(rig, Hd);
  // the thorax: a rounded hump, orange collar and a ring at the middle
  blob(K, T, [0, 0.6, 0.8], [2.7, 2.7, 3.6], 0.9, (x, y, z) => (z > 0.62 || Math.abs(z + 0.1) < 0.14 ? mix(K, ORG, 0.1) : mix(K, DARK)), { run: [1, 3] });
  // the waist: two little knots, orange-ringed
  blob(K, T, [0, 0.8, -3.3], [1.3, 1.3, 1.1], 0.8, () => mix(K, DARK), { run: [1, 2] });
  K.box(T, 0, 1, -4.4, 2, 2, 0.6, org);
  // the abdomen: a huge round ball, banded across (the spitter's a glowing acid sac)
  const S = spitter ? 1.15 : 1, ac = [0, 2.4 * S, -4.6 - 6.8 * S];
  blob(K, T, ac, [5.9 * S, 5.5 * S, 7 * S], 0.95, (x, y, z) => {
    const band = Math.abs(z - 0.45) < 0.12 || Math.abs(z + 0.05) < 0.12 || Math.abs(z + 0.56) < 0.1;
    if (spitter) return band ? mix(K, [ACIDD, 0x16601a], 0.1) : y > 0.55 && K.r() < 0.4 ? ACIDL : mix(K, SAC, 0.08);
    return band ? mix(K, ORG, 0.12) : y > 0.5 && K.r() < 0.35 ? mix(K, [blkL, 0x4a3a30], 0.1) : mix(K, DARK);
  }, { rx: -0.32, run: [1, 3] });
  if (spitter) for (const [x, z] of [[-2.4, -1], [2.2, 0.6], [0, -2.4]]) K.box(T, ac[0] + x * S, ac[1] - 4.6 * S, ac[2] + z * S, 0.7, 1.4, 0.7, ACID);   // drips under the sac
  // head: big and round, an orange ring round the face, big glowing eyes
  const hz = hs * 0.35, fz = hz + 3.3;
  blob(K, Hd, [0, 0.2, hz], [4, 3.6, 3.5], 0.8, (x, y, z) => (y > 0.55 ? mix(K, [blkL, blk], 0.1) : mix(K, DARK)), { run: [1, 2] });
  // the orange ring round the face: a stepped frame proud of the front
  for (const [x, y, w, h] of [[0, 2.9, 4.4, 0.9], [0, -2.1, 3.2, 0.9], [-3, 0.4, 0.9, 3.6], [3, 0.4, 0.9, 3.6], [-2.4, 2.3, 1.2, 1], [2.4, 2.3, 1.2, 1], [-2.2, -1.5, 1.2, 1], [2.2, -1.5, 1.2, 1]]) K.box(Hd, x, y, fz - 0.5 - Math.abs(x) * 0.25, w, h, 1, mix(K, ORG, 0.1));
  K.box(Hd, 0, 0.3, fz - 0.2, 0.8, 2.4, 0.6, blkL);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 1.55, 0.7, fz - 0.3, 2.2, 1.8, 0.8, 0x2a1408); K.box(Hd, sx * 1.55, 0.7, fz, 1.8, 1.4, 0.6, eye); K.box(Hd, sx * 1.35, 0.95, fz + 0.25, 0.7, 0.6, 0.3, eyeL);
  }
  // elbowed antennae: a dark stalk up and out, an orange elbow, a banded whip forward, an orange club
  for (const sx of [-1, 1]) {
    const bx = sx * 1.3, by = 3.2, bz = fz - 1.4;
    K.box(Hd, bx, by, bz, 1.4, 1, 1.4, org);
    K.box(Hd, bx + sx * 0.7, by + 2.4, bz - 0.4, 0.8, 4.4, 0.8, blkL, -0.15, 0, sx * -0.3);
    K.box(Hd, bx + sx * 1.4, by + 4.6, bz - 0.7, 1.2, 1.2, 1.2, org);
    for (let i = 0; i < 4; i++) K.box(Hd, bx + sx * (1.7 + i * 0.35), by + 5 + i * 0.25, bz + 0.5 + i * 1.5, 0.75, 0.75, 1.5, i % 2 ? orgD : blk, -0.18, sx * 0.22, 0);
    K.box(Hd, bx + sx * 3.2, by + 6.1, bz + 6.8, 1.1, 1.1, 1.6, orgL, -0.18, sx * 0.22, 0);
  }
  // mandibles: big curved orange pincers, stepped, with dark tips and cream teeth inside
  for (const sx of [-1, 1]) {
    // a hook: out and forward from the jaw, then curling in to a dark point
    const seg = [[2, 0.4, 0.6, 1.6, 1.5, 1.8, -0.3], [2.7, 0.2, 2, 1.3, 1.3, 1.9, -0.15], [2.9, 0, 3.6, 1.2, 1.2, 1.8, 0.2], [2.5, -0.1, 5, 1.1, 1.1, 1.6, 0.65], [1.6, -0.2, 5.9, 1, 1, 1.4, 1.1], [0.8, -0.2, 6.2, 0.8, 0.9, 1, 1.4]];
    seg.forEach(([x, y, z, w, h, d, a], i) => K.box(M, sx * x, y, z, w, h, d, i === 5 ? 0x3a1a08 : i === 4 ? orgL : i % 2 ? orgD : org, 0, sx * a, 0));
    for (const [x, z] of [[2.2, 2.4], [2.3, 3.8], [1.9, 5]]) K.box(M, sx * x, -0.1, z, 0.6, 0.7, 0.5, 0xfff0d0);
    if (spitter) { K.box(M, sx * 1.4, -1.2, 3, 0.5, 1.8, 0.5, ACID); K.box(M, sx * 1.4, -2.4, 3, 0.7, 0.7, 0.7, ACIDL); }
  }
  if (spitter) K.box(M, 0, -0.6, 2.4, 1.4, 0.6, 1.4, ACID);
  // six legs fanned fore and aft, thick and dark, orange bands at every joint
  for (const leg of rig.legs) {
    const u = leg.userData; leg.rotation.y = -u.side * (0.7 - u.row * 0.7);
    const k = u.knee; dropAll(rig, leg); dropAll(rig, k);
    K.box(leg, 0, -0.2, 0, legW + 0.8, 1.4, legW + 0.8, org);
    K.box(leg, 0, -2, 0, legW + 0.3, 2.6, legW + 0.3, blkL); K.box(leg, 0, -3.5, 0, legW + 0.5, 0.6, legW + 0.5, orgD); K.box(leg, 0, -4.9, 0, legW + 0.1, 2.4, legW + 0.1, blk);
    K.boxZ(k, 0, 0, 0, 2.3, 2.3, 2.3, org); K.boxZ(k, 0, 0.3, 0, 1.6, 1.6, 2.5, orgL);
    K.boxZ(k, 0, -2.2, 0, legW, 2.8, legW, blk); K.boxZ(k, 0, -3.7, 0, legW + 0.4, 0.7, legW + 0.4, org);
    K.boxZ(k, 0, -5, 0, legW * 0.85, 2.2, legW * 0.85, blkL); K.boxZ(k, 0, -6.2, 0, legW + 0.2, 0.6, legW + 0.2, orgD);
    K.boxZ(k, 0, -6.75, 0, legW * 0.7, 0.9, legW * 0.7, blkD); K.boxZ(k, 0, -7.2, 0, legW * 0.36, 0.5, legW * 0.36, blkD);   // (a pointed tip: a wide end's corner dipped through the floor as the leaning shin swung)
  }
  K.done();
  noShadow(rig, Hd, M, ...rig.legs);
  return finish(rig, kind);
}

// ---- Calydonian boarlet ---------------------------------------------------------
// (vox-ow-fodder-2, bottom left) A big shaggy brown boar, a hero's height at
// the shoulder hump: a heavy forequarter in clumps of rust-brown fur, a
// bristling mane of cream-tipped spines over the shoulders and back (its
// silhouette), great curved cream tusks, glowing orange eyes, a pink-brown
// snout, dark hooves banded in brass; it lowers its head and charges.
function buildBoarlet(K0) {
  const fur = 0x6a3a1e, furD = 0x3a2010, furL = 0x8a5a30, bone = 0xf0e0b8, boneD = 0xd0b88a, spineB = 0x7a4a26, snout = 0x9a5a4a, eye = 0xffa020, hoof = 0x2a1a10, band = 0xc89a5a;
  const FUR = [fur, furD, furL, 0x5a3018, 0x7a4424], DARK = [furD, 0x2a180c, 0x4a2a16];
  const mat = skinMat('boarlet', flatQuad(fur, furD, 0x4a2a16, eye), { rough: 0.9, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 2.35, bodyL: 12, bodyW: 8, bodyH: 7, legH: 5.6, legW: 2.6, headS: 7, snout: false, neckUp: -0.4, headZ: 0.6, gait: 1.4, ears: false, tail: 2, tailLen: 3, tailW: 0.8 });
  const K = kitOf(K0, 'boarlet', rig, mat, { seed: 139, rough: 0.9, emit: 0.9, ao: 0.4, density: voxDensity(rig) / 1.25 });   // (a horde lead: cells 1.25 hero pixels across)
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 7;
  const pick = (A) => A[Math.floor(K.r() * A.length)];   // (flat tones, so runs of cells merge)
  dropAll(rig, T); dropAll(rig, Hd);
  // body: a hunched forequarter sloping to the haunches, in clumps of shaggy fur
  blob(K, T, [0, 1.2, 2.4], [4.6, 5, 4.4], 1, () => pick(FUR), { run: [1, 3] });
  blob(K, T, [0, 0, -2.8], [4, 3.8, 4.4], 1, () => pick(FUR), { run: [1, 3] });
  K.shag(T, [0, 0.8, 0.4], [8.4, 7, 11], { cols: FUR, step: 1.7, len: [1.6, 2.8], w: 1.1, low: 0.62, top: false, sweep: 0.3 });
  K.clumps(T, [0, -3.6, 0], [7, 1, 9], { n: 6, size: [1.2, 2], cols: DARK, faces: 'b', out: -0.2 });
  // the mane of spines: tall over the shoulders, falling away along the back, dark at the root and cream at the tip
  const SPB = [spineB, furD, 0x8a4a22, 0x5a3018];
  for (let i = 0; i < 70; i++) {
    const f = i / 70, z = 5.6 - f * 11, sx = i % 2 ? 1 : -1, wide = 0.3 + K.r() * (i % 3 ? 2.6 : 4), h = Math.max(2, 6.4 - f * 4.4 + K.r() * 1.6) * (wide > 2.6 ? 0.7 : 1), x = sx * wide, yb = (z > 0 ? 5.6 : 4.4 + z * 0.12) - (wide > 2.6 ? 1.2 : 0), tz = sx * (0.2 + wide * 0.1);
    K.box(T, x, yb + h * 0.25, z, 0.95, h * 0.55, 0.95, mix(K, SPB, 0.1), -0.5, 0, tz);
    if (K.r() < 0.7) K.box(T, x + sx * Math.sin(tz * sx) * h * 0.45, yb + h * 0.66, z - h * 0.26, 0.65, h * 0.4, 0.65, i % 4 ? bone : boneD, -0.5, 0, tz);
  }
  K.clumps(T, [0, 1, 0.4], [9, 6, 11], { n: 12, size: [1, 1.8], cols: FUR, faces: 'lrk', out: 0.2, stretch: [0.7, 0.7, 1.8] });
  // head: a big shaggy wedge, dark ears, glowing eyes under heavy brows, a pig's snout, great curling tusks
  const hz = hs * 0.35, fz = hz + hs / 2;
  blob(K, Hd, [0, 0.4, hz], [3.9, 3.8, 3.7], 0.9, (x, y) => pick(y > 0.3 ? FUR : [fur, furL, 0x7a4a2a]), { run: [1, 2] });
  K.box(Hd, 0, -0.9, fz + 1.4, hs - 1.6, hs - 2.6, 3, fur); K.box(Hd, 0, 0.4, fz + 1, hs - 2.6, 1.6, 2.6, furL);
  K.box(Hd, 0, -1.2, fz + 3, 4.2, 3.4, 0.8, snout); K.box(Hd, 0, -1.2, fz + 3.3, 3.4, 2.6, 0.3, 0xb87060); for (const sx of [-1, 1]) K.box(Hd, sx * 0.85, -1.2, fz + 3.5, 0.9, 1.2, 0.2, 0x2a1410);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * (hs / 2 - 0.7), 1.5, fz + 0.15, 1.6, 1.1, 0.3, eye); K.box(Hd, sx * (hs / 2 - 0.9), 1.6, fz + 0.3, 0.6, 0.5, 0.2, 0xffe0a0); K.box(Hd, sx * (hs / 2 - 0.6), 2.4, fz + 0.2, 2.2, 0.8, 0.8, furD, 0, 0, sx * -0.2);
    K.box(Hd, sx * (hs / 2 - 0.2), hs / 2 + 1.6, hz - 0.8, 2, 3.2, 1.2, furD, -0.3, 0, sx * 0.45); K.box(Hd, sx * (hs / 2 + 0.3), hs / 2 + 3, hz - 1.2, 1.2, 1.6, 0.9, 0x2a180c, -0.3, 0, sx * 0.45);
    // the tusks, from the jaw: out, then curling up and back
    for (const [x, y, z, w, h, d, col, rz] of [[2.4, 0.6, 2.8, 1.3, 1.3, 2.4, boneD, 0], [3.2, 1.2, 4.2, 1.2, 1.6, 1.2, bone, 0.4], [3.8, 2.6, 4.4, 1.1, 1.8, 1.1, bone, 0.15], [3.9, 4, 4, 0.9, 1.4, 0.9, 0xfff8e0, -0.2], [3.7, 4.9, 3.6, 0.6, 0.9, 0.6, 0xfffcf0, -0.4]]) K.box(M, sx * x, y, z, w, h, d, col, 0, 0, sx * rz);
  }
  K.box(M, 0, -0.4, 1.8, hs - 2.4, 1, 2.8, snout); K.box(M, 0, 0.3, 2.6, hs - 3, 0.5, 1.4, 0x8a1a1a); K.box(M, 0, -1, 1.6, hs - 2, 0.8, 2.4, furD);
  // legs: shaggy thighs, dark shins, banded split hooves
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    K.box(leg, 0, -1.4, 0, 3.2, 3.4, 3.2, furD); K.clumps(leg, [0, -1, 0], [3.2, 2.6, 3.2], { n: 3, size: [1, 1.6], cols: FUR, faces: 'lrfk', out: -0.2 });
    K.box(leg, 0, -3.8, 0.1, 2.6, 1.6, 2.6, DARK[1]); K.box(leg, 0, -4.4, 0.1, 2.8, 0.7, 3, band); K.box(leg, 0, -5.1, 0.2, 2.8, 1, 3, hoof); K.box(leg, 0, -5.1, 1.75, 0.4, 1, 0.3, 0x0a0604);
  }
  for (const s of rig.tail) dropAll(rig, s);
  K.box(rig.tailTip, 0, 0, -1, 0.7, 0.7, 2.4, furD); K.box(rig.tailTip, 0, -0.4, -2.4, 1.2, 1.6, 1, furL);
  K.done();
  noShadow(rig, M, rig.tailTip, ...rig.legs);
  return finish(rig, 'boarlet');
}

// ---- crab -----------------------------------------------------------------------------
// (vox-ow-fodder, bottom left) A shore crab a little wider than a hero is
// tall: a domed red shell with an orange rim, crusted with white barnacles
// and hung with green weed, a cream face, two eyes on stalks with glowing
// orange tips, two big orange claws with cream teeth held out in front (the
// lower fingers are the rig's jaw: the bite snaps them), and eight jointed
// legs. It scuttles sideways and turns to face you to pinch.
function buildCrab(K0) {
  const P = { red: 0xd04020, redM: 0xb83218, redD: 0x8a1e10, org: 0xf08a3a, orgL: 0xffa860, pale: 0xf8d0a8, tip: 0x2a1410, barn: 0xf0ece0, barnL: 0xfffaf0, barnD: 0x9a9284 };
  const cream = 0xf8e4c0, eyeT = 0xffa020, SHELL = [0xd04020, 0xc03418, 0xe0502a, 0xa82a14], RIM = [0xf08a3a, 0xe8702a, 0xffa050], BEIGE = [0xf0d8b0, 0xe0c498, 0xd0b088];
  const CLAW = [0xe04a24, 0xd0381c], CLAWM = [0xf06a30, 0xff7a3a], CLAWL = [0xff9a50, 0xffb070], WEED = [0x2a8a4a, 0x1a5a2a, 0x3a9a5a];
  const mat = skinMat('crab', flatQuad(P.red, P.redD, cream, 0x0a0a0a), { rough: 0.45, emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: 1.65, bodyL: 8, bodyW: 12, bodyH: 5, legH: 5, legW: 1.5, headS: 4, legs: 8, splay: 0.01, legSpread: -2.4, snout: false, neckUp: -1.6, headZ: -0.4, gait: 2.4, ears: false, jawOpen: 0.15 });
  const K = kitOf(K0, 'crab', rig, mat, { seed: 109, rough: 0.45, emit: 0.85, ao: 0.3 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth;
  dropAll(rig, T); dropAll(rig, Hd);
  const clawCol = (y) => mix(K, y > 0.3 ? CLAW : y > -0.35 ? CLAWM : CLAWL, 0.1);
  // a pale underside, an orange rim and a domed red shell, mottled darker on top
  blob(K, T, [0, -0.4, 0.4], [5, 2.8, 3.8], 1, () => mix(K, BEIGE, 0.1), { hi: 0.4, run: [1, 3] });
  blob(K, T, [0, 0.4, 0], [6.8, 1, 4.8], 1, () => mix(K, RIM, 0.1), { run: [1, 3] });
  blob(K, T, [0, 0.8, 0], [6.4, 4.8, 4.6], 0.9, (x, y) => (y < 0.2 ? mix(K, RIM, 0.1) : K.r() < 0.15 ? P.redD : mix(K, SHELL, 0.12)), { lo: 0, run: [1, 2] });
  const dome = (a, e) => [6.4 * Math.cos(e) * Math.sin(a), 0.8 + 4.8 * Math.sin(e), 4.6 * Math.cos(e) * Math.cos(a)];
  for (const [a, e, sz] of [[0.6, 0.6, 1.2], [-0.9, 0.7, 1.1], [2.2, 0.6, 1.2], [-2.4, 0.5, 1.1], [0, 1.1, 1], [1.5, 0.9, 0.9]]) { const [x, y, z] = dome(a, e); barnacle(K, T, x, y, z, sz, P); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.2, L = 1.6 + K.r() * 2.6; K.box(T, Math.sin(a) * 6.6, 0.2 - L / 2, Math.cos(a) * 4.7, 0.8, L, 0.5, mix(K, WEED, 0.1)); }
  // the face under the front edge: a dark mouth and pale mouth parts
  K.box(T, 0, -0.6, 4.1, 3, 1, 0.4, P.tip); for (const sx of [-1, 1]) K.box(T, sx * 1.3, -1.4, 4, 1, 1.2, 0.5, cream);
  // eyes on stalks with glowing tips
  for (const sx of [-1, 1]) { K.box(T, sx * 1.6, 5, 3, 0.8, 3.4, 0.8, P.redD, 0.15); K.box(T, sx * 1.6, 7, 3.3, 1.4, 1.4, 1.4, P.tip); K.box(T, sx * 1.6, 7.1, 3.75, 1, 1, 0.6, eyeT); }
  // the claws, held out in front: an arm, a round palm and a fixed upper finger; the jaw carries the lower fingers
  M.position.set(0, -1.6 * PX, 4.2 * PX);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 4.4, 0, 0.2, 2.2, 2.2, 3.4, P.redM, 0, sx * -0.3, 0); K.box(Hd, sx * 5.2, 0.2, 1.8, 2.6, 2.6, 1, P.org);
    blob(K, Hd, [sx * 5.8, 0.4, 4.4], [3, 3.4, 3.6], 0.9, (x, y) => clawCol(y), { run: [1, 2] });
    for (const [y, z, w, h, d, col] of [[1.2, 8, 2.4, 2.2, 2.4, CLAWM], [0.6, 9.8, 1.8, 1.8, 1.8, CLAWL], [-0.3, 11, 1.2, 1.4, 1.2, [cream]]]) K.box(Hd, sx * 5.8, y, z, w, h, d, mix(K, col, 0.08));
    for (const z of [7.6, 9.2]) K.box(Hd, sx * 5.8, -0.1, z, 0.9, 0.9, 0.7, cream);
    barnacle(K, Hd, sx * 6.8, 2.6, 4, 1, P);
    for (const [y, z, w, h, d, col] of [[-0.3, 5.6, 2, 1.6, 2.4, CLAWM], [0, 7.4, 1.4, 1.3, 1.6, CLAWL], [0.6, 8.4, 1, 1.1, 1, [cream]]]) K.box(M, sx * 5.8, y, z, w, h, d, mix(K, col, 0.08));
    K.box(M, sx * 5.8, 0.8, 6.6, 0.8, 0.8, 0.6, cream);
  }
  crabLegs(K, rig, P);
  K.done();
  noShadow(rig, M, ...rig.legs);
  rig.sideways = true;
  finish(rig, 'crab');
  keepAbove(rig, rig.head);   // (the claws ride the head: it pitches up rather than drive them into the floor)
  return rig;
}
// eight legs at the sides: up and out to a knee, then down in tapering
// segments to a pointed tip, red over orange with a pale underside
function crabLegs(K, rig, P, spikes = 0) {
  // each leg arches out from the shell to a high knee, then reaches down and
  // out to a dark pointed tip on the ground (the sheets' spider-like stance),
  // in segments with pale joints and a pale stripe along the top
  const seg = (p, a, b, w, col, stripe = true) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), rz = Math.atan2(dy, dx);
    K.box(p, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, L + w * 0.3, w, w, col, 0, 0, rz);
    if (stripe) K.box(p, (a[0] + b[0]) / 2 - Math.sin(rz) * w * 0.45, (a[1] + b[1]) / 2 + Math.cos(rz) * w * 0.45, 0, L * 0.7, w * 0.25, w * 0.55, P.pale, 0, 0, rz);
  };
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    const s = leg.userData.side, row = leg.userData.row, L = rig.dims.legH, w = rig.dims.legW;
    leg.rotation.y = -s * (0.75 - row * 0.5);
    const X = (v) => s * v, knee = [X(L * 0.62), L * 0.42], ank = [X(L * 0.98), -L * 0.42], tip = [X(L * 1.06), -L + 0.2];
    seg(leg, [X(0.6), 0.4], knee, w + 0.3, row % 2 ? P.red : P.redM);
    K.box(leg, knee[0], knee[1], 0, w + 0.7, w + 0.7, w + 0.7, P.org);
    seg(leg, knee, ank, w, row % 2 ? P.redM : P.red);
    K.box(leg, ank[0], ank[1], 0, w + 0.3, w + 0.3, w + 0.3, P.org);
    seg(leg, ank, [tip[0] - X(0.1), tip[1] + 1.2], w * 0.7, P.org, false);
    K.box(leg, tip[0], tip[1] + 0.9, 0, w * 0.4, 1.2, w * 0.4, P.tip);   // (a pointed tip clear of the floor: a wide end's corner dipped through it in the walk)
    for (let k = 0; k < spikes; k++) K.box(leg, knee[0] + X(0.4 + k * 1.2), knee[1] + 0.9 - k * 0.6, 0, 0.5, 0.8, 0.5, P.pale, 0, 0, -s * 0.5);
  }
}
// a barnacle: a pale knobbed cone with a dark mouth on top
function barnacle(K, p, x, y, z, sz, P) {
  K.box(p, x, y, z, sz, sz * 0.8, sz, mix(K, [P.barn, P.barnL], 0.08)); K.box(p, x, y + sz * 0.45, z, sz * 0.62, sz * 0.25, sz * 0.62, P.barnD); K.box(p, x, y + sz * 0.5, z, sz * 0.3, sz * 0.2, sz * 0.3, 0x2a2420);
  K.box(p, x, y - sz * 0.1, z, sz * 1.3, sz * 0.35, sz * 0.5, P.barn); K.box(p, x, y - sz * 0.1, z, sz * 0.5, sz * 0.35, sz * 1.3, P.barnL);
}

// ---- king crab ------------------------------------------------------------------------------
// (vox-ow-fodder-fix, bottom row) A hulking crab twice a hero's height: a
// shell like a mossy hill, crusted with barnacles, sprouting red coral and
// hung all round with kelp, over a round pale underside; eyestalks with
// glowing orange tips, red-and-orange legs; one giant crusher claw, red
// fading to orange with cream teeth, held out low in front and raised high
// when it attacks (then slammed down), and a smaller second claw.
function buildKingCrab(K0) {
  const P = { red: 0xc8341a, redM: 0xb02a16, redD: 0x7a1e10, org: 0xf06a30, orgL: 0xff9a50, pale: 0xf8c8a0, tip: 0x3a1a10, barn: 0xe8e0d0, barnL: 0xfff8ec, barnD: 0x9a9080 };
  const cream = 0xf8e4c0, creamD = 0xe0c098, eyeT = 0xffa020;
  const MOSS = [0x4a7a2a, 0x6a8a3a, 0x3a6a2a, 0x5a8a3a, 0x7a9a4a, 0x2e5a26], DIRT = [0x8a7a5a, 0x6a5a40, 0x9a8a6a], KELP = [0x2a8a5a, 0x1a5a3a, 0x3a9a7a, 0x2a7a2a, 0x1e6a5a];
  const BEIGE = [0xe0c8a0, 0xd0b088, 0xc8a070, 0xf0dcb8, 0xb89060], CLAW = [0xd0381c, 0xb82a14, 0xe04a24], CLAWM = [0xf06a30, 0xe85a28, 0xff7a3a], CLAWL = [0xff9a50, 0xffb070, 0xf8c090];
  const mat = skinMat('king_crab', flatQuad(P.red, P.redD, cream, eyeT), { rough: 0.5, emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: 4.5, bodyL: 9, bodyW: 12, bodyH: 6, legH: 6.4, legW: 1.5, headS: 4, legs: 8, splay: 0.01, legSpread: -3, snout: false, neckUp: -1, headZ: -0.6, gait: 1.3, ears: false, jawOpen: 0.1 });
  const K = kitOf(K0, 'king_crab', rig, mat, { seed: 149, rough: 0.5, emit: 0.85, ao: 0.35, density: voxDensity(rig) / 1.25 });   // (size audit: built 1.5× bigger, at 1.25 hero pixels a cell to keep its triangle budget)
  const T = rig.torso, Hd = rig.head, M = rig.mouth;
  const mix = (K, cols) => cols[Math.floor(K.r() * cols.length)];   // (flat tones, so runs of the hero-sized cells merge)
  dropAll(rig, T); dropAll(rig, Hd);
  const clawCol = (y) => mix(K, y > 0.35 ? CLAW : y > -0.3 ? CLAWM : CLAWL, 0.1);
  // the round pale underside, a red rim, and the hill of a shell: moss over red, with patches of bare dirt
  blob(K, T, [0, 0, 0.6], [6.6, 4.8, 5.4], 1.1, () => mix(K, BEIGE, 0.1), { hi: 0.3, run: [1, 3] });
  blob(K, T, [0, 1.2, -0.2], [8.6, 1.4, 7], 1, () => mix(K, [P.red, P.redM, P.org], 0.1), { run: [1, 3] });
  blob(K, T, [0, 1.6, -0.3], [8.2, 6, 6.8], 0.9, (x, y) => (y < 0.22 ? mix(K, K.r() < 0.5 ? [P.red, P.redM] : MOSS, 0.1) : K.r() < 0.12 ? mix(K, DIRT) : K.r() < 0.03 ? (K.r() < 0.5 ? 0xffd040 : 0xff5a3a) : mix(K, MOSS, 0.16)), { lo: 0, run: [1, 2] });
  const dome = (a, e) => [8.2 * Math.cos(e) * Math.sin(a), 1.6 + 6 * Math.sin(e), -0.3 + 6.8 * Math.cos(e) * Math.cos(a)];
  K.clumps(T, [0, 5.4, -0.3], [11, 4, 9.4], { n: 7, size: [1, 1.8], cols: [...MOSS, ...DIRT], faces: 't', out: -0.3, keep: (x, y, z) => (x / 8) ** 2 + (z / 6.6) ** 2 < 0.55 });
  for (const [a, e, sz] of [[0.3, 0.5, 1.8], [-0.6, 0.35, 1.6], [1.2, 0.3, 1.7], [-1.4, 0.4, 1.8], [2.2, 0.45, 1.5], [-2.4, 0.3, 1.6], [3, 0.5, 1.4], [0.9, 0.95, 1.6], [-1, 1, 1.5], [2.6, 0.95, 1.4], [-0.1, 1.25, 1.3], [1.7, 0.7, 1.3], [-1.9, 0.75, 1.4], [0.5, 0.2, 1.4], [-0.3, 0.75, 1.2]]) { const [x, y, z] = dome(a, e); barnacle(K, T, x, y, z, sz, P); }
  for (const [a, e] of [[1.9, 0.9], [-2.1, 1], [0.2, 1.1]]) { const [x, y, z] = dome(a, e); K.box(T, x, y + 1.2, z, 0.6, 2.6, 0.6, 0xe8503a); K.box(T, x + 0.8, y + 2.2, z, 0.5, 1.6, 0.5, 0xff6a4a, 0, 0, -0.6); K.box(T, x - 0.7, y + 2, z + 0.2, 0.5, 1.4, 0.5, 0xe8503a, 0, 0, 0.6); K.box(T, x + 1.3, y + 3, z, 0.4, 0.4, 0.4, 0xff8a6a); }
  // kelp hanging all round the rim
  for (let i = 0; i < 56; i++) { const a = i / 56 * Math.PI * 2 + K.r() * 0.08, L = 3 + K.r() * 6, x = Math.sin(a) * 8.5, z = -0.2 + Math.cos(a) * 6.9, col = mix(K, KELP); K.box(T, x, 1.4 - L * 0.3, z, 0.55, L * 0.6, 0.45, col); K.box(T, x + (K.r() - 0.5) * 0.6, 1.4 - L * 0.75, z, 0.5, L * 0.5, 0.45, col); if (K.r() < 0.4) K.box(T, x, 1.4 - L, z, 0.7, 0.7, 0.5, mix(K, KELP)); }   // (kelp strands a hero pixel wide)
  // the face: a dark mouth slot and mouth parts under the rim
  K.box(T, 0, -0.2, 5.7, 3.6, 1.2, 0.6, 0x3a1a10); for (const sx of [-1, 1]) K.box(T, sx * 1.6, -1.2, 5.6, 1.2, 1.6, 0.8, creamD);
  // eyestalks with glowing tips
  for (const sx of [-1, 1]) { K.box(T, sx * 2, 7.6, 3.6, 1, 5, 1, P.redD, 0.15); K.box(T, sx * 2, 8, 3.7, 1.3, 0.5, 1.3, P.red, 0.15); K.box(T, sx * 2, 10.4, 4, 1.6, 1.6, 1.6, P.tip); K.box(T, sx * 2, 10.5, 4.45, 1.1, 1.1, 0.8, eyeT); }
  // the crusher, on a jointed arm: held out low in front, raised high to attack
  const arm = group(Hd, -5.4, -1.6, 0.4);
  K.box(arm, 0.6, 0.4, 0.6, 3, 3, 3.6, P.red); K.box(arm, 0.2, 0, 2.6, 3.4, 3.4, 1.2, P.org);
  blob(K, arm, [0, -1, 7], [3.8, 4.4, 5.6], 1, (x, y) => (K.r() < 0.04 ? cream : clawCol(y)), { run: [1, 2] });
  for (const [y, z] of [[2.6, 5.4], [2, 8.4], [0.2, 3.8]]) barnacle(K, arm, -3.4, y, z, 1.6, P);
  // the fixed upper finger, curving down to a point, with cream teeth
  for (const [y, z, w, h, d, col] of [[0.6, 12.2, 3.6, 3.4, 3, CLAWM], [-0.2, 14.4, 3, 3, 2.6, CLAWM], [-1.4, 16.2, 2.4, 2.6, 2.2, CLAWL], [-2.9, 17.3, 1.8, 2.2, 1.8, [cream]], [-4.2, 17.6, 1.2, 1.6, 1.2, [cream]]]) K.box(arm, 0, y, z, w, h, d, mix(K, col, 0.08));
  for (const z of [11, 12.8, 14.6]) K.box(arm, 0, -1.4 - (z - 11) * 0.1, z, 1.4, 1.4, 1, cream);
  // the movable lower finger
  const lo = group(arm, 0, -4.4, 10.4);
  for (const [y, z, w, h, d, col] of [[-0.6, 1, 3.2, 2.4, 3, CLAWM], [-0.4, 3.4, 2.6, 2.2, 2.4, CLAWL], [0.2, 5.4, 2, 2, 2, CLAWL], [1.2, 6.8, 1.4, 1.8, 1.4, [cream]]]) K.box(lo, 0, y, z, w, h, d, mix(K, col, 0.08));
  for (const z of [1.2, 3, 4.8]) K.box(lo, 0, 0.9, z, 1.1, 1.2, 0.9, cream);
  arm.scale.setScalar(0.9);
  rig.extras.crusherArm = arm; rig.extras.crusher = lo;
  // the smaller claw; its lower finger rides the jaw
  K.box(Hd, 4.6, -0.6, 0.4, 2.4, 2.4, 3, P.red, 0, -0.3, 0);
  blob(K, Hd, [6, -1.6, 3.8], [2.6, 3, 3.4], 1, (x, y) => clawCol(y), { run: [1, 2] });
  for (const [y, z, w, h, d, col] of [[-0.6, 7.4, 2.4, 2.2, 2.2, CLAWM], [-1.2, 9, 1.8, 1.8, 1.8, CLAWL], [-2.1, 10, 1.2, 1.4, 1.2, [cream]]]) K.box(Hd, 6, y, z, w, h, d, mix(K, col, 0.08));
  barnacle(K, Hd, 6.6, 1.4, 3.4, 1.3, P);
  M.position.set(0, -2.6 * PX, 3.8 * PX);
  for (const [y, z, w, h, d, col] of [[-0.8, 3.6, 2, 1.6, 2.4, CLAWM], [-0.4, 5.4, 1.4, 1.4, 1.6, CLAWL], [0.3, 6.4, 1, 1.2, 1, [cream]]]) K.box(M, 6, y, z, w, h, d, mix(K, col, 0.08));
  crabLegs(K, rig, P, 2);
  K.done();
  noShadow(rig, M, ...rig.legs);
  finish(rig, 'king_crab');
  keepAbove(rig, rig.head);   // (the claws ride the head: it pitches up rather than drive them into the floor)
  return rig;
}

// ---- basilisk ----------------------------------------------------------------------
// The books' basilisk (The Son of Neptune, The Blood of Olympus): a little
// green snake about as long as a man's arm, with an expandable collar of
// white spikes, pale yellow eyes, fiery breath and a poisonous touch; the
// "little king", so a small white crown. Built on the Mist Serpent's spine
// (entities/serpent.js SerpentRig: it slithers, rears and strikes) at under
// half its size, about 1.5 blocks long (a man's arm, stretched a little so a
// trio reads at the game's distance), at the heroes' voxel size. What reads
// in a crowd: the white spiked collar (the rig's hood: it flares in the
// wind-up), the crown, glowing pale yellow eyes, an ember-hot mouth and a
// flickering tongue of flame. The fire puff itself is behave() below.
function buildBasilisk(K0) {
  const GRN = [0x3a9a3a, 0x2e8a32, 0x48aa42, 0x2a7a2e], DARK = 0x16401a, BELLY = 0xd8e0a0, BELLYD = 0xb8c480;
  const SPIKE = 0xeef0e6, SPIKED = 0xc0c4b8, TIP = 0xffffff, EYE = 0xfff09a, SLIT = 0x1a1406, EMBER = 0xff5a10, FIRE = 0xff8a1a, FIREH = 0xffd040, FANG = 0xf6f0e0;
  const mat = skinMat('basilisk', (S) => paintQuad(S, { base: GRN[0], dark: DARK, belly: BELLY, back: GRN[1], eye: EYE, eyeLow: FIREH, nose: DARK, teeth: FANG, speckles: 20 }), { emit: 1 });
  const rig = new SerpentRig({ material: mat, scale: 0.5 });
  const K = kitOf(K0, 'basilisk', rig, mat, { seed: 151, rough: 0.5, emit: 0.95, ao: 0.2, density: voxDensity(rig) });
  const NN = rig.segs.indexOf(rig.neck) + 1, L = 3.6;
  // ---- the body: chunky green segments over a pale belly, a dark saddle on every other one
  rig.segs.forEach((g, j) => {
    const w = g.userData.w, h = w * 0.86, ov = Math.min(1.6, w * 0.3);
    g.userData.len = L;
    K.box(g, 0, 0.1, L / 2, w, h - 0.2, L + ov, K.tone(GRN, 0.08));
    K.box(g, 0, -h / 2 + 0.3, L / 2, w * 0.8, 0.6, L + ov, j % 2 ? BELLY : BELLYD);
    if (w > 2 && j % 2) K.box(g, 0, h / 2 - 0.05, L / 2, w * 0.6, 0.4, L * 0.6, DARK);
    if (j === rig.segs.length - 1) K.box(g, 0, -0.1, -0.9, w * 0.7, h * 0.7, 1.6, GRN[1]);
  });
  // ---- the collar: white spikes radiating round the neck on the two hood
  // groups (rig.hoods: animate() spreads them sideways as it rears to strike)
  const nw = rig.segs[1].userData.w / 2;
  rig.hoods.forEach((Hg, i) => {
    const z = i ? 2.4 : 1.2, len = i ? 4.2 : 3.4;
    for (const a of [-1.9, -1.35, -0.8, -0.27, 0.27, 0.8, 1.35, 1.9]) {
      const r = nw + len / 2 - 0.3, x = Math.sin(a) * r, y = Math.cos(a) * r * 0.9;
      K.box(Hg, x, y, z, 1.2, len, 1.2, i ? SPIKE : SPIKED, 0, 0, -a);
      K.box(Hg, Math.sin(a) * (nw + len), Math.cos(a) * (nw + len) * 0.9, z, 0.7, 0.9, 0.7, TIP, 0, 0, -a);
    }
  });
  // ---- the head: a broad blunt wedge (bigger than the body's taper would
  // give it, so its face reads), ember-hot inside the mouth
  const H = rig.head, J = rig.mouth;
  const hw = (z) => 8.4 - 0.5 * Math.max(0, z - 1), top = (z) => 3 - 0.16 * Math.max(0, z - 2);
  for (let z = -1.2; z < 8.6; z += 1.2) {
    const w = hw(z), t = top(z);
    K.box(H, 0, (t + 0.3) / 2, z, w, t - 0.3, 1.25, K.tone(GRN, 0.06));
    K.box(H, 0, 0.15, z, w - 1.2, 0.3, 1.25, z > 7.8 ? GRN[0] : EMBER);
    if (z > -0.6) {
      const jw = w - 0.6, jh = 1.6 - 0.06 * z;
      K.box(J, 0, -(jh + 0.3) / 2, z, jw, jh - 0.3, 1.25, K.tone(GRN, 0.06));
      K.box(J, 0, -jh + 0.1, z, jw * 0.7, 0.3, 1.25, BELLY);
      K.box(J, 0, -0.15, z, jw - 1.2, 0.3, 1.25, z > 7.8 ? GRN[0] : EMBER);
    }
  }
  // eyes: big glowing pale yellow, a dark slit
  for (const sx of [-1, 1]) {
    const z = 4.2, w = hw(z), y = top(z);
    K.box(H, sx * (w / 2 - 0.3), y + 0.1, z, 1.6, 0.6, 2.4, DARK);
    K.box(H, sx * (w / 2 + 0.1), y - 1, z, 0.5, 1.6, 2, EYE);
    K.box(H, sx * (w / 2 + 0.25), y - 1, z + 0.2, 0.3, 1.5, 0.45, SLIT);
  }
  // the little crown: three white spikes on the crown of the head, the middle tallest, tips aglow
  for (const [x, hgt] of [[-1.8, 2.2], [0, 3.2], [1.8, 2.2]]) {
    const y = top(1.6) + hgt / 2 - 0.2;
    K.box(H, x, y, 1.6, 1.1, hgt, 1.1, SPIKE, -0.35, 0, -x * 0.12);
    K.box(H, x * 1.1, y + hgt / 2 + 0.2, 1.4, 0.6, 0.8, 0.6, TIP, -0.35, 0, -x * 0.12);
  }
  K.box(H, 0, top(1.6) + 0.1, 1.6, 4.6, 0.6, 1.4, SPIKED);   // (the crown's band)
  // fangs (rig.fangs swing down as the jaw opens)
  for (const sx of [-1, 1]) K.box(rig.fangs, sx * 1.4, -0.8, 0, 0.6, 1.6, 0.6, FANG, 0.2);
  // the tongue: a flicker of flame, forked (the rig flicks it in and out)
  K.box(rig.tongue, 0, 0, 1.3, 0.9, 0.6, 2.8, FIRE);
  for (const sx of [-1, 1]) K.box(rig.tongue, sx * 0.45, 0.1, 3.1, 0.5, 0.5, 1.6, FIREH, 0, sx * 0.4, 0);
  K.done();
  // live flame (flames.js): flickers off the forked tip while the tongue is out, and embers at the lips as it rears
  addFlames(rig, { cap: 18, palette: 'fire', rise: 20, turb: 24, drag: 2.5 })
    .source(rig.tongue, { at: [0, 0.1, 3.6], r: 0.5, rate: 34, life: [0.15, 0.32], size: [0.5, 0.9], up: 4, spread: 2, when: () => (rig.tongue.scale.z > 0.6 ? 1 : 0) })
    .source(rig.mouth, { at: [0, 0, 6], r: 1.2, rate: 22, life: [0.2, 0.4], size: [0.5, 0.9], up: 5, spread: 2, when: (e) => (e?.state === 'windup' ? 1 : 0) });
  noShadow(rig, rig.tongue, rig.fangs, ...rig.hoods);
  rig.animate({ dt: 0, speed: 0, action: null });
  return finish(rig, 'basilisk');
}

// ---- Earthborn ---------------------------------------------------------------------------
// (vox-ow-fodder-3, top right) A hulking six-armed giant of earth and stone,
// twice a hero's height: blocky brown stone in lumps and slabs mottled with
// green moss, glowing orange eyes under a heavy brow, a leather belt, and six
// arms with huge block fists, the top pair raised; it hurls balls of mud.
function buildEarthborn(K0) {
  const st = 0x8a6a4a, stD = 0x5e4630, stL = 0xa8865e, moss = 0x6a7a2a, mossL = 0x8a9a3a, glow = 0xffa030, lea = 0x4a3020, brz = 0xc08a2c;
  const STONE = [st, stD, stL, 0x7a5a3c, 0x9a7a54, 0x6a4e36], MOSS = [moss, mossL, 0x5a6a22, 0x7a8a30];
  const mat = skinMat('earthborn', (S) => paintPerson(S, { skin: st, eye: 0x2a1408, eyeWhite: 0x2a1408, brow: stD, mouth: false, top: st, sleeve: st, hand: stD, pants: stD, shoes: false,
    face: (s, ey) => { s.rect(8, ey - 2, 8, 2, stD, 0.1); for (const x of [9, 13]) s.rect(x, ey, 2, 1.5, glow, 0); s.rect(9, ey + 3, 6, 1.5, 0x2a1408, 0); for (const x of [9.5, 11.5, 13.5]) s.dot(x, ey + 3, 0xe8dcc0, 1, 1); },
    body: (s) => { for (let i = 0; i < 60; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, STONE[i % 4], 2, 2); } }), { emit: 1.2, scale: 2.3 });
  const rig = new Rig({ material: mat, scale: 2.3, legH: 9, bodyH: 13, bodyW: 12, bodyD: 7, armW: 4.4, headS: 7, jacket: false });
  const K = kitOf(K0, 'earthborn', rig, mat, { seed: 157, rough: 0.95, emit: 0.9, ao: 0.35, density: voxDensity(rig) });
  const T = rig.torso, Hd = rig.head, H7 = 8 * HS * 7 / 8;
  dropAll(rig, T); dropAll(rig, Hd);
  rig.neck.position.y = 11.8 * PX;   // (the head sunk between the boulder shoulders)
  // (round 7, head and leg proportions, proportions.js: the craggy head 0.88
  // of its old size, sculpted afresh from the same stones, on legs grown from
  // 9 to 10 pixels over the same feet)
  const L1 = 10, ANK = -7.2;
  reshape(rig, Hd, 0.88);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1, legScale(9, L1, ANK), 1], [0, 0, 0], { ankle: ANK });
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  // stone in rounded lumps, mossy on top
  // (flat tones picked per run of cells, so runs merge; at the heroes' voxel size the lumps read as many small stones)
  const pick = (A) => A[Math.floor(K.r() * A.length)];
  // stones: patches a few cells across in one tone, dark seams between them, moss on the tops
  const hsh = (i, j, k) => { let h = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
  const stone = (m = 0.5) => (x, y, z) => {
    const u = x * 2.2 + 9, v = y * 2.2 + 9, w = z * 2.2 + 9, i = Math.floor(u), j = Math.floor(v), k = Math.floor(w);
    if (v - j < 0.13 || (u - i < 0.1 && K.r() < 0.7)) return stD;
    const h = hsh(i, j, k);
    if (y > m && h < 0.55) return MOSS[Math.floor(h * 7) % MOSS.length];
    return STONE[Math.floor(h * STONE.length) % STONE.length];
  };
  // the body: a barrel chest of boulders over a leather belt, a hunched mossy back, boulder shoulders
  blob(K, T, [0, 8, 0.2], [6, 5.4, 3.8], 1.1, stone(0.45), { pw: 2.4, run: [1, 2] });
  blob(K, T, [0, 3, 0], [4.8, 3.2, 3.3], 1.1, stone(0.9), { pw: 2.4, run: [1, 2] });
  blob(K, T, [0, 10.4, -2.6], [5, 3.4, 3], 1.1, stone(0.1), { run: [1, 2] });
  for (const sx of [-1, 1]) blob(K, T, [sx * 6.2, 11.6, 0], [2.8, 2.6, 3], 1.1, stone(0.2), { pw: 2.4, run: [1, 2] });
  for (const [x, y] of [[-2.2, 9.6], [2.2, 9.6], [0, 6.8]]) K.vox(T, x, y, 4.1, x ? 3.6 : 4.4, 2.6, 0.8, STONE, { faces: 'f', relief: 0.2 });   // the slabs of a stone chest
  K.box(T, 0, 1.6, 0, 12.4, 1.8, 7.8, lea); K.box(T, 0, 1.6, 4, 2.6, 2.4, 0.5, brz); K.box(T, 0, 1.6, 4.25, 1.2, 1, 0.3, 0x6a4a1a);
  for (const x of [-4.4, 4.4]) K.box(T, x, 1.6, 4, 0.8, 1.8, 0.4, 0x2a1a10);
  // the two lower pairs of arms: lumpy stone arms with block fists, swinging
  // (rig.extras.fists: all six, top to bottom, right then left, for the pummel)
  const fists = [{ arm: rig.armR, fist: rig.handR }, { arm: rig.armL, fist: rig.handL }];
  for (const [y, z, sx, ph, rz] of [[8.6, 1.6, -1, 0, 1.15], [8.6, 1.6, 1, 2, 1.15], [4.6, 1, -1, 1, 0.7], [4.6, 1, 1, 3, 0.7]]) {
    const a = group(T, sx * 6.6, y, z, 0, 0, sx * rz);
    blob(K, a, [0, -3.2, 0], [1.8, 3.4, 1.8], 1.1, stone(0.6), { pw: 2.6, run: [1, 2] });
    blob(K, a, [0, -8, 0.4], [2.5, 2.4, 2.5], 1.1, stone(0.7), { pw: 3, run: [1, 2] });
    K.box(a, sx * 1.9, -2.4, 0.6, 0.4, 2.4, 2, moss);
    sway(rig, a, 'x', 0.4, 2.2, ph);
    fists.push({ arm: a, fist: group(a, 0, -8, 0.4) });
  }
  // the top pair (the rig's own arms): a boulder shoulder, an arm in two stones, a huge knuckled fist
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    blob(K, arm, [0, -1.2, 0], [2.8, 2.8, 2.8], 1.1, stone(0.2), { run: [1, 2] });
    blob(K, arm, [0, -5.6, 0], [2.1, 2.6, 2.1], 1.1, stone(0.6), { pw: 2.6, run: [1, 2] });
    K.box(arm, 0, -7.8, 0, 4.2, 0.9, 4.2, lea);
    blob(K, arm, [0, -10.4, 0.4], [3.1, 2.6, 3.1], 1.1, stone(0.8), { pw: 3, run: [1, 2] });
    for (const x of [-1.6, -0.5, 0.6, 1.7]) K.box(arm, x, -12.6, 2, 1.1, 1.2, 1.4, pick(STONE));
  }
  // stone legs in stacked blocks, mossy feet
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    blob(K, leg, [0, -2.6, 0], [2.8, 3, 2.8], 1.1, stone(0.5), { pw: 2.6, run: [1, 2] });
    blob(K, leg, [0, -6.6, 0.2], [2.6, 2, 2.8], 1.1, stone(0.6), { pw: 3, run: [1, 2] });
    K.vox(leg, 0, -8.1, 0.6, 6.2, 1.5, 6.4, [stD, 0x6a4e36, stD], { faces: 'tfklr', relief: 0.15 }); K.clumps(leg, [0, -8.1, 0.6], [6.4, 1.5, 6.6], { n: 3, size: [1, 1.6], cols: MOSS, faces: 'tf', out: -0.3 });   // (the sole just above the leg's end, -9, and short of a long toe: at -9.4 the feet stood in the ground, and a long foot's tip dipped through it as the leg swung in the run)
  }
  rig.legR.position.x = -3.2 * PX; rig.legL.position.x = 3.2 * PX;
  // head: a small craggy stone head under a jutting brow, glowing eyes, a
  // grimace of stone teeth, moss on top
  blob(K, Hd, [0, 3.4, 0.3], [3.5, 3.6, 3.4], 1, stone(0.45), { pw: 2.6, run: [1, 2] });
  markHeadCore(rig, [0, 3.4, 0.3], [7, 7.2, 6.8]);   // (the stone skull; the moss aside)
  K.vox(Hd, 0, 5.3, 3.4, 7.6, 1.6, 1.8, [stD, 0x6a4e36], { relief: 0.25 });
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.5, 4.2, 3.55, 1.8, 1.1, 0.4, 0x2a1408); K.box(Hd, sx * 1.5, 4.2, 3.7, 1.3, 0.8, 0.3, glow); K.box(Hd, sx * 1.3, 4.3, 3.82, 0.5, 0.4, 0.2, 0xffe080); }
  K.box(Hd, 0, 3.2, 3.8, 1.4, 1.4, 0.8, stL);
  K.box(Hd, 0, 1.7, 3.5, 3.6, 1.2, 0.6, 0x2a1408); for (const x of [-1.2, -0.4, 0.4, 1.2]) K.box(Hd, x, 1.9, 3.75, 0.6, 0.6, 0.3, 0xe8dcc0);
  K.clumps(Hd, [0, 6.8, 0], [6.4, 1, 6], { n: 4, size: [1.4, 2.2], cols: [...MOSS, stL], faces: 't', out: -0.3, on: [[0, 3.4, 0.3], [3.5, 3.6, 3.4], 2.6] });   // (the moss seated on the rounded crown: monsters.js clumps on)
  applyShape(rig);
  K.done();
  noShadow(rig, Hd);
  rig.extras.fists = fists;
  for (const f of fists) { f.pz0 = f.arm.position.z; f.rz0 = f.arm === rig.armR || f.arm === rig.armL ? null : f.arm.rotation.z; }   // (the pummel's rest places)
  rig.hunch = 0.15; rig.armSpread = 0.45; rig.held = [-2.3, -2.3];
  return finish(rig, 'earthborn');
}

// ---- Daedalus drone ---------------------------------------------------------------------------
// (vox-ow-fodder-3, middle left) A bronze clockwork eagle as tall as a hero,
// on great spread wings of bronze and dark-steel feather plates with round
// joints at the wrists: a riveted bronze body, a glowing blue core ringed in
// steel on its breast (the accent), a crested eagle's head with a hooked gold
// beak and blue lens eyes, gold talons. It hovers and fires blue bolts.
function buildDrone(K0) {
  const brz = 0xc8902e, brzD = 0x6a4618, brzL = 0xf0c048, brzM = 0xa87424, steel = 0x6a6a74, steelD = 0x2e2e36, steelL = 0x9a9aa4, blue = 0x5ad8ff, blueL = 0xd0f8ff, gold = 0xf8d060;
  const BRZ = [brz, brzM, 0xb88028], FEATH = [brz, brzM, brzL, 0x8a6a3a], FDARK = [brzD, 0x4a3a2e, 0x5a4a3a];
  const mat = skinMat('daedalus_drone', (S) => paintPerson(S, { skin: brz, eye: blue, eyeWhite: blue, brow: brzD, mouth: false, top: brz, sleeve: brz, hand: brz, pants: brzD, shoes: false }), { rough: 0.35, emit: 1 });
  const rig = new Rig({ material: mat, scale: 1.55, legH: 7, bodyH: 11, bodyW: 9, bodyD: 7, armW: 2, headS: 7, jacket: false });
  const K = kitOf(K0, 'daedalus_drone', rig, mat, { seed: 163, rough: 0.35, metal: 0.3, emit: 0.9, ao: 0.3 });
  const T = rig.torso, Hd = rig.head, H7 = 8 * HS * 7 / 8;
  dropAll(rig, T); dropAll(rig, Hd); dropAll(rig, rig.armR); dropAll(rig, rig.armL);
  // the body: a rounded barrel of bronze plates in bands, a steel-ringed blue core in the breast
  blob(K, T, [0, 5.6, 0], [4.6, 5.8, 3.8], 0.9, (x, y) => (Math.floor((y + 1) * 4.5) % 2 ? mix(K, BRZ, 0.1) : mix(K, [brzD, brzM], 0.1)), { pw: 2.4, run: [2, 4] });
  for (const [x, y, w, h] of [[0, 8.4, 5.6, 1], [0, 3.4, 5.6, 1], [-2.6, 5.9, 1, 4], [2.6, 5.9, 1, 4], [-2, 7.8, 1.2, 1.2], [2, 7.8, 1.2, 1.2], [-2, 4, 1.2, 1.2], [2, 4, 1.2, 1.2]]) K.box(T, x, y, 3.9, w, h, 0.8, steel);
  K.box(T, 0, 5.9, 3.8, 4.4, 4, 0.6, steelD); K.box(T, 0, 5.9, 4.1, 3, 3, 0.5, blue); K.box(T, 0, 5.9, 4.3, 1.8, 1.8, 0.4, blueL); for (const [x, y] of [[-2.6, 8.4], [2.6, 8.4], [-2.6, 3.4], [2.6, 3.4]]) K.box(T, x, y, 4.35, 0.5, 0.5, 0.3, gold);
  for (const sx of [-1, 1]) { K.box(T, sx * 4.2, 9, 0, 2.6, 2.6, 2.6, steel); K.box(T, sx * 5.4, 9, 0, 0.5, 1.6, 1.6, steelD); K.box(T, sx * 5.6, 9, 0, 0.4, 0.7, 0.7, blue); }
  // tail: a fan of stepped bronze plates
  for (let i = -3; i <= 3; i++) { K.box(T, i * 1.3, 0.6, -4.8, 1.3, 0.7, 6.4 - Math.abs(i) * 0.5, i % 2 ? brzD : brzL, 0.6, i * 0.16, 0); K.box(T, i * 1.3 + Math.sin(i * 0.16) * -3.4, -1.6, -7.8 + Math.abs(i) * 0.3, 1.3, 0.7, 1.4, steelD, 0.6, i * 0.16, 0); }
  // head: a crested eagle's head, blue lens eyes ringed in steel, a hooked gold beak
  blob(K, Hd, [0, H7 / 2, 0.2], [H7 / 2, H7 / 2, H7 / 2], 0.8, (x, y) => (y > 0.5 ? mix(K, [brzL, brz], 0.1) : mix(K, BRZ, 0.1)), { pw: 2.4, run: [1, 3] });
  K.box(Hd, 0, H7 * 0.68, H7 / 2 + 0.3, H7 + 0.4, 1.2, 1, brzD);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.9, H7 * 0.5, H7 / 2 + 0.3, 2.2, 2, 0.6, steel); K.box(Hd, sx * 1.9, H7 * 0.5, H7 / 2 + 0.55, 1.4, 1.2, 0.4, blue); K.box(Hd, sx * 1.7, H7 * 0.55, H7 / 2 + 0.75, 0.6, 0.5, 0.2, blueL); }
  for (const [y, z, w, h, d, rx] of [[H7 * 0.36, H7 / 2 + 1.4, 2.6, 2.2, 2.4, 0], [H7 * 0.24, H7 / 2 + 2.9, 2, 2, 1.6, 0.35], [H7 * 0.06, H7 / 2 + 3.6, 1.4, 1.8, 1.2, 0.7], [-0.4, H7 / 2 + 3.6, 0.8, 1.2, 0.8, 0.9]]) K.box(Hd, 0, y, z, w, h, d, z > H7 / 2 + 3.4 ? brzD : gold, rx);
  for (let i = 0; i < 5; i++) K.box(Hd, (i - 2) * 1.1, H7 + 0.8 + (2 - Math.abs(i - 2)) * 0.7, -0.6 - Math.abs(i - 2) * 0.3, 0.8, 3, 1.6, i % 2 ? brzL : brz, -0.4, 0, (i - 2) * -0.25);
  for (let i = 0; i < 3; i++) K.box(Hd, 0, H7 * 0.6 - i * 1.4, -H7 / 2 - 0.6 - i * 0.4, H7 - 1 - i, 1.2, 1.6, mix(K, FEATH, 0.1), 0.5);
  rig.extras.muzzle = group(T, 0, 6, 5);
  // legs: steel thighs, round knee joints, bronze shins, gold talons with dark points
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    K.box(leg, 0, -1.6, 0, 2.8, 3.4, 2.8, brzD); K.box(leg, 0, -3.6, 0, 2.6, 2, 2.6, steel); K.box(leg, 0, -3.6, 0, 3, 1.2, 1.2, steelD);
    K.box(leg, 0, -5.2, 0, 1.6, 2.4, 1.6, brz);
    for (const [dz, ry] of [[1.4, -0.35], [1.6, 0], [1.4, 0.35], [-1.2, Math.PI]]) { const cz = Math.cos(ry), sz = Math.sin(ry); K.box(leg, sz * 1.2, -6.6, cz * 1.2 * (dz > 0 ? 1 : 1), 0.7, 0.8, 2, gold, 0, ry, 0); K.box(leg, sz * 2.3, -6.9, cz * 2.3, 0.5, 0.7, 0.7, 0x3a2a10, 0.5, ry, 0); }
  }
  // wings: raised and spread; a jointed bone, covert plates in two layers, long stepped primaries
  const W = [];
  for (const side of [-1, 1]) {
    const root = group(T, side * 4.2, 9.4, -1.4), elbow = group(root, side * 9, 0, 0), X = (v) => side * v;
    K.box(root, X(4.5), 0, 0, 9, 1.8, 1.8, brzD); K.box(root, X(4.5), 0.9, 0.2, 8, 0.5, 1.4, gold);
    K.box(root, X(9), 0, 0, 2.8, 2.8, 2.8, steel); K.box(root, X(9), 0, 1.5, 1.6, 1.6, 0.4, steelD); K.box(root, X(9), 0, 1.7, 0.7, 0.7, 0.3, steelL);
    for (let i = 0; i < 6; i++) { const L = 7 + i * 0.9, x = X(1.4 + i * 1.4); K.box(root, x, -L / 2, -0.5, 1.5, L, 0.6, mix(K, FDARK, 0.1)); K.box(root, x, -L * 0.3, 0.1, 1.5, L * 0.6, 0.6, mix(K, FEATH, 0.1)); }
    K.box(elbow, X(3.6), 0.3, 0, 7.2, 1.5, 1.5, brzD);
    for (let i = 0; i < 9; i++) {
      const a = -0.05 - i * 0.11, L = 17 - Math.abs(i - 2) * 0.8, ux = Math.cos(a), uy = Math.sin(a), bx = 1 + i * 0.85;
      K.box(elbow, X(bx + ux * L * 0.32), uy * L * 0.32 - 0.6, -0.2 - i * 0.05, L * 0.64, 2.1, 0.6, mix(K, FEATH, 0.1), 0, 0, side * a);
      K.box(elbow, X(bx + ux * L * 0.8), uy * L * 0.8 - 0.6, -0.25 - i * 0.05, L * 0.36, 1.9, 0.55, mix(K, i % 2 ? FDARK : [brzL, brz], 0.1), 0, 0, side * a);
    }
    W.push({ root, elbow, side });
  }
  // a strong, even beat: wings raised in a V, the down-stroke driving, the hand trailing on the way up
  rig.extras.wings = W; rig.wingFlap = 1.5; rig.wingStroke = { base: 0.55, amp: 0.38, hand: 0.4, down: 0.4 };
  for (const w of W) w.root.rotation.y = w.side * 0.22;
  K.done();
  noShadow(rig, rig.legR, rig.legL, ...W.flatMap((w) => [w.root, w.elbow]));
  rig.float = 1.2;
  return finish(rig, 'daedalus_drone');
}

// ---- Laistrygonian ----------------------------------------------------------------------------
// (vox-ow-fodder-3, middle right) A huge cannibal giant, over twice a hero's
// height: tan skin covered in grey-blue spiral tattoos, a wild black beard
// and hair, bracers and shin wraps of leather, a shaggy fur kilt under a
// belt with a big skull buckle and more skulls; in its raised hand a ball of
// dark bronze cracked with fire, flames streaming off it.
// Built at the heroes' voxel size (parts.js voxDensity): a hulking upper
// body sculpted from cells one hero pixel across (the head low between
// heavy shoulders, long arms with fists at the thigh, short thick legs), the
// tattoos inked into the cells; no stretched skin boxes.
function buildLaistrygonian(K0) {
  const skin = 0xc87840, skinD = 0x9a5a2c, tat = 0x46587a, hair = 0x1a1410, furC = [0x6a4428, 0x4a2e1a, 0x8a5a34, 0x3a2414], bone = 0xece0c8, lea = 0x5a3a20, leaD = 0x3a2414, fire = [0xff6a10, 0xffa020, 0xffe060], ballC = 0x4a2a14;
  const mat = skinMat('laistrygonian', (S) => paintPerson(S, { skin, hair, mouth: false, top: skin, sleeve: skin, hand: skin, pants: lea, shoes: false }), { emit: 1 });
  const rig = new Rig({ material: mat, scale: 2.35, legH: 10, bodyH: 13, bodyW: 11, bodyD: 6.4, armW: 4.4, headS: 8, jacket: false });
  for (const g of [rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL]) dropAll(rig, g);
  rig.neck.position.y = 11.6 * PX;                        // the head sits low between the shoulders
  rig.handR.position.y = rig.handL.position.y = -12.4 * PX;
  rig.legR.position.x = -3 * PX; rig.legL.position.x = 3 * PX;
  // (round 7, head and leg proportions, proportions.js: a giant's head, 0.86
  // of the old one sculpted afresh from the same cells (round 8: 0.78 went too
  // far; his sheets draw the head 0.18-0.2 of his height, design/sizes.json
  // "headSheet"), on legs grown from 10
  // to 12.2 pixels over the same feet, the kilt with them; he stands as tall)
  const L1 = 12.2, ANK = -8;
  reshape(rig, rig.head, 0.86);
  reshape(rig, rig.torso, [1.05, 1, 1.03]);
  reshape(rig, rig.hips, [1.05, L1 / 10, 1.03]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1.03, legScale(10, L1, ANK), 1.03], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [1.03, 1.1, 1.03]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  const K = kitOf(K0, 'laistrygonian', rig, mat, { seed: 167, rough: 0.85, emit: 0.9, ao: 0.3, density: voxDensity(rig) * 0.92 });   // (cells a touch coarser than a hero's, round 7: an elite stays under 20k triangles)
  const T = rig.torso, Hd = rig.head, gold = 0xe8b440, SK = [skin, 0xbc6c36, 0xd4844a], HAIR = [hair, 0x2a2018, 0x141010];
  const sk = () => SK[Math.floor(K.r() * 3)];
  // skin inked with spiral tattoos: rings round a centre (cx, cy in the mass's -1..1)
  const inked = (cx, cy, r = 0.5, side = 0) => (x, y, z) => { if (side && x * side < 0.15) return sk(); const d = Math.hypot(x - cx, y - cy) / r; return d < 1 && Math.floor(d * 3.6) % 2 === 0 ? tat : sk(); };
  // ---- the bulk: a broad inked chest, a hard belly, traps round a short neck
  blob(K, T, [0, 8.6, 0.4], [7, 4.6, 3.6], 1, (x, y, z) => (z < 0.2 ? sk() : inked(x < 0 ? -0.5 : 0.5, 0.15, 0.4)(x, y, z)), { pw: 2.5, run: [1, 2] });
  blob(K, T, [0, 3.6, 0.6], [5.6, 3.6, 3.4], 1, (x, y, z) => (z > 0.6 && Math.abs(x) < 0.06 ? skinD : sk()), { pw: 2.4, run: [2, 4] });
  blob(K, T, [0, 11.6, -0.8], [5.6, 2.2, 3], 1, sk, { pw: 2.2, run: [2, 4] });
  // a fur mantle over the shoulders and down the back
  blob(K, T, [0, 11.4, -2.4], [6.6, 2.4, 2.2], 1, () => furC[Math.floor(K.r() * 4)], { run: [1, 2], keep: (x, y, z) => z < 0.3 });
  K.shag(T, [0, 11.8, -1.6], [12.6, 1.6, 4.6], { cols: furC, step: 1.6, len: [2.4, 4], w: 1.2, low: 1, top: true, sweep: 0.2, bristle: 0.3 });
  for (let x = -6; x <= 6.1; x += 0.8) { const L = 6 + K.r() * 6; K.box(T, x, 11.4 - L / 2, -4.2 - K.r() * 0.4, 0.9, L, 0.8, K.tone(furC, 0.1)); }
  // a bandolier across the chest with gold buckles
  for (let i = 0; i < 10; i++) { const t = i / 9; K.box(T, -5 + t * 10, 13 - t * 10.4, 3.4 + Math.sin(t * Math.PI) * 0.6, 1.3, 1.5, 0.6, i % 2 ? lea : leaD, 0, 0, 0.8); }
  for (const t of [0.25, 0.7]) { K.box(T, -5 + t * 10, 13 - t * 10.4, 4.1 + Math.sin(t * Math.PI) * 0.6, 1.4, 1.4, 0.4, gold); K.box(T, -5 + t * 10, 13 - t * 10.4, 4.3 + Math.sin(t * Math.PI) * 0.6, 0.6, 0.6, 0.3, 0x6a4a1a); }
  // the belt with a skull buckle, bones and little skulls
  K.box(T, 0, 0.8, 0.4, 11, 2, 7.6, lea); K.box(T, 0, 0.8, 0.4, 11.2, 0.4, 7.8, leaD); for (const x of [-3, 3]) K.box(T, x, 0.8, 4.25, 1, 1.4, 0.3, gold);
  K.box(T, 0, 0.6, 4.4, 3.2, 3.2, 1.6, bone); K.box(T, 0, -0.9, 4.5, 2.2, 1, 1.2, 0xd8ccb4); for (const sx of [-1, 1]) K.box(T, sx * 0.7, 1, 5.25, 0.9, 0.9, 0.2, 0x1a1410); K.box(T, 0, -0.1, 5.25, 0.4, 0.5, 0.2, 0x1a1410); for (const x of [-0.6, 0, 0.6]) K.box(T, x, -1.2, 5.15, 0.3, 0.5, 0.2, 0x1a1410);
  for (const [x, s2] of [[-4.4, 1.8], [4.2, 1.6]]) { K.box(T, x, 0, 4.2, s2, s2, 1.2, bone); for (const sx of [-1, 1]) K.box(T, x + sx * s2 * 0.22, s2 * 0.1, 4.85, s2 * 0.25, s2 * 0.25, 0.2, 0x1a1410); }
  for (const x of [-2.6, 2.4, -6]) { K.box(T, x, -1.6, 4.2, 0.6, 3, 0.6, bone); K.box(T, x, -3.2, 4.2, 1.2, 0.6, 0.7, bone); }
  // ---- a shaggy fur kilt to the knee
  for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2, L = 5.4 + K.r() * 2.2; K.flare(rig.hips, Math.sin(a) * 5.4, 1 - L / 2, Math.cos(a) * 3.8 + 0.3, 1.2, L, 0.9, K.tone(furC, 0.12), a, 0.15); }
  // ---- head: a heavy brow over dark eyes, a broad nose, a grin full of teeth
  // in a big black beard, wild black hair, a gold earring
  blob(K, Hd, [0, 4.2, 0.3], [3.6, 4.2, 3.6], 1, sk, { pw: 2.7, run: [2, 4] });
  const fz = 3.9;
  markHeadCore(rig, [0, 4.2, 0.3], [7.2, 8.4, 7.2]);   // (the skull and face: hair and beard aside)
  K.box(Hd, 0, 6, fz - 0.1, 6.4, 1.2, 1.2, hair, -0.15);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.4, 5, fz - 0.05, 1.6, 1.1, 0.4, 0xf0e0c0); K.box(Hd, sx * 1.2, 5, fz + 0.1, 0.8, 0.9, 0.3, 0x1a0a00); }
  K.box(Hd, 0, 3.8, fz + 0.3, 1.6, 2, 1.1, SK[1]); K.box(Hd, 0, 3.1, fz + 0.6, 2.2, 0.7, 0.8, skinD);
  blob(K, Hd, [0, 6.4, -0.6], [4.3, 3.6, 4.3], 1, () => HAIR[Math.floor(K.r() * 3)], { run: [1, 2], keep: (x, y, z) => !(z > 0.25 && y < 0.55 && Math.abs(x) < 0.8) });
  K.clumps(Hd, [0, 7.2, -0.8], [8.4, 5.6, 8.4], { n: 12, size: [1, 1.8], cols: HAIR, faces: 'tklr', out: 0.1, on: [[0, 6.4, -0.6], [4.3, 3.6, 4.3]] });   // (seated on the hair: monsters.js clumps on)
  blob(K, Hd, [0, 1.2, 2.3], [3.9, 3.2, 2.2], 1, () => HAIR[Math.floor(K.r() * 3)], { run: [1, 2], keep: (x, y, z) => !(z > 0.3 && y > 0.1 && y < 0.75 && Math.abs(x) < 0.55) && !(y > 0.75 && Math.abs(x) < 0.7) });
  blob(K, Hd, [0, -1.6, 2.4], [2.6, 2.4, 1.6], 1, () => HAIR[Math.floor(K.r() * 3)], { run: [1, 2] });
  K.box(Hd, 0, 2.1, fz - 0.6, 3.4, 1.2, 1, 0x5a1a10); for (const x of [-1.2, -0.4, 0.4, 1.2]) K.box(Hd, x, 2.3, fz - 0.1, 0.6, 0.6, 0.3, 0xf8f0e0);
  K.box(Hd, -3.9, 3.6, 0.6, 0.4, 1.2, 1.2, gold);
  // ---- arms: huge inked shoulders, thick forearms in leather bracers with gold studs, big fists
  for (const [arm, sd] of [[rig.armR, -1], [rig.armL, 1]]) {
    blob(K, arm, [sd * 0.3, 0.2, 0], [3.8, 3.4, 3.6], 1, inked(sd * 0.4, 0, 0.6, sd), { pw: 2.3, run: [1, 2] });
    blob(K, arm, [0, -3.6, 0], [3, 3.4, 3], 1, inked(sd * 0.3, -0.2, 0.55, sd), { pw: 2.4, run: [1, 2] });
    blob(K, arm, [0, -8.2, 0.2], [3.2, 3.2, 3.2], 1, sk, { pw: 2.4, run: [2, 4] });
    K.vox(arm, 0, -9, 0.2, 6.8, 3.6, 6.8, [lea, 0x6a4628, leaD], { relief: 0.12 }); K.box(arm, 0, -7.1, 0.2, 7, 0.6, 7, leaD); K.box(arm, 0, -10.9, 0.2, 7, 0.6, 7, leaD);
    for (const [x, z] of [[0, 3.65], [sd * 3.45, 0.2], [-1.6, 3.65], [1.6, 3.65]]) K.box(arm, x, -9, z, 0.6, 0.6, 0.6, gold);
    blob(K, arm, [0, -13, 0.4], [3.1, 2.6, 3.1], 1, sk, { pw: 3, run: [2, 4] });
    for (let i = 0; i < 4; i++) K.box(arm, -1.8 + i * 1.2, -14, 3.1, 1.1, 1.3, 1, SK[i % 3]);
  }
  // ---- legs: thick thighs, shins in fur wraps, bare broad feet with toes
  for (const leg of [rig.legR, rig.legL]) {
    blob(K, leg, [0, -2.4, 0], [3.3, 3, 3.3], 1, sk, { pw: 2.4, run: [2, 4] });
    blob(K, leg, [0, -6.6, -0.1], [3.1, 2.6, 3.1], 1, () => (K.r() < 0.5 ? lea : furC[Math.floor(K.r() * 4)]), { pw: 2.5, run: [1, 2] });
    K.clumps(leg, [0, -4.6, 0], [5.8, 1.6, 5.8], { n: 4, size: [1, 1.6], cols: furC, faces: 'lrfk', out: 0.1 }); K.box(leg, 0, -8.3, 0, 6.2, 0.6, 6.2, leaD);
    blob(K, leg, [0, -9.2, 1], [2.9, 0.9, 3.6], 1, sk, { pw: 3, run: [2, 4] });
    for (const x of [-1.8, -0.6, 0.6, 1.8]) K.box(leg, x, -9.4, 4.5, 1.1, 1, 1, SK[1]);
  }
  // the flaming ball in the right hand
  const ball = markHeld(group(rig.handR, 0, -3.6, 0.6, 2.7));   // (turned so its flames stream up while the arm holds it high)
  blob(K, ball, [0, 0, 0], [3.4, 3.4, 3.4], 1, () => (K.r() < 0.16 ? fire[K.r() < 0.5 ? 0 : 1] : [ballC, 0x3a2010, 0x5a3418][Math.floor(K.r() * 3)]), { run: [1, 2] });
  // (a few low tongues of fire on it; the blaze streaming off it is live flame, flames.js)
  for (let i = 0; i < 6; i++) { const a = K.r() * Math.PI * 2, t = K.r() * 0.3, r = 2.6 * (1 - t * 0.6); K.box(ball, Math.cos(a) * r, 2.6 + t * 5, Math.sin(a) * r, 2 - t * 1.3, 2.4 - t * 1.3, 2 - t * 1.3, fire[Math.min(2, Math.floor(t * 3))]); }
  rig.extras.ball = ball;
  applyShape(rig);
  K.done();
  addFlames(rig, { cap: 40, palette: 'fire', rise: 24, turb: 28 }).source(ball, { at: [0, 1.6, 0], r: 2.4, rate: 50, life: [0.35, 0.7], size: [1.1, 2], up: 7, spread: 2.5 });
  noShadow(rig, Hd);
  rig.held = [-2.7, 0];
  finish(rig, 'laistrygonian');
  keepAbove(rig, rig.armR, { watch: [ball] });   // (the arm lifts the ball clear of the floor when a hit drops it)
  return rig;
}

// ---- shade -------------------------------------------------------------------------------
// (vox-ow-fodder, bottom right) A tall wraith of the dead: a pointed hood
// and a robe of dark slate-blue tatters that thin into cold cyan motes at
// the hem, a dark face with glowing cyan eyes and a gaping mouth, bony white
// hands reaching out. Drifts slowly, a little see-through, in crowds.
function buildShade(K0) {
  const SH = [0x3a4458, 0x2a3242, 0x4a5670, 0x5a6a84], dark = 0x0a0e16, cyan = 0x7ae8ff, cyanL = 0xd8ffff, bone = 0xe8e4dc, boneD = 0xb8b4ac;
  const mat = skinMat('shade', (S) => {
    paintPerson(S, { skin: 0x1a2030, eye: dark, eyeWhite: dark, brow: 0x1a2230, mouth: false, top: SH[0], sleeve: SH[0], hand: bone, pants: SH[1], shoes: false,
      face: (s, ey) => { s.rect(8, ey - 3, 8, 8, 0x0e1420, 0.1); for (const x of [9, 13]) { s.rect(x, ey - 0.5, 2, 1.5, cyan, 0); s.dot(x + 0.5, ey, cyanL, 1, 1); } s.rect(10, ey + 2.5, 4, 2.5, 0x04060a, 0); s.rect(10.5, ey + 2.5, 3, 0.5, 0xc8d0d8, 0); } });
  }, { emit: 2, fill: 0.4, dissolve: 0.18, scale: 1.15 });
  const rig = new Rig({ material: mat, scale: 1.15, armW: 2.6, bodyW: 8, bodyH: 13, jacket: false });
  const K = kitOf(K0, 'shade', rig, mat, { seed: 113, fill: 0.4, emit: 0.9, ao: 0.35 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS, FADE = [0x4a6a88, 0x5a7a98, 0x3a5a78], MOTE = [cyan, 0x9af0ff, cyanL];
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // the robe: a rounded body of slate tatters hanging in long strips that pale into cold cyan motes
  blob(K, T, [0, 7, 0], [4.6, 7, 2.8], 0.9, (x, y) => (K.r() < 0.05 ? cyan : mix(K, y > 0.6 ? [SH[1], SH[0]] : SH, 0.14)), { pw: 2.4, run: [1, 2] });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, L = 7 + K.r() * 5, x = Math.sin(a) * 4.2, z = Math.cos(a) * 2.6, col = K.tone(SH, 0.15);
    K.flare(T, x, 2 - L / 2, z, 1.8, L, 0.6, col, a, 0.12);
    K.flare(T, x * 1.12, 2 - L - 1.6, z * 1.12, 1.3, 3.4, 0.5, K.tone(FADE, 0.1), a, 0.2);
    if (i % 2) K.box(T, x * 1.25, 2 - L - 4.2 - K.r() * 1.5, z * 1.25, 0.9, 0.9, 0.9, MOTE[i % 3]);
  }
  for (let i = 0; i < 16; i++) { const a = K.r() * Math.PI * 2, r = 3.4 + K.r() * 3.4; K.box(T, Math.sin(a) * r, -5 - K.r() * 8 + (i < 5 ? 14 : 0), Math.cos(a) * r * 0.8, 0.8, 0.8, 0.8, MOTE[i % 3]); }
  // the pointed hood, leaning forward round the dark face
  blob(K, Hd, [0, H8 * 0.5, -0.4], [H8 / 2 + 1.4, H8 / 2 + 1.2, H8 / 2 + 1.4], 0.9, () => mix(K, [SH[2], SH[0], SH[3]], 0.12), { lo: -0.85, run: [1, 2], keep: (x, y, z) => !(z > -0.1 && Math.abs(x) < 0.66 && y < 0.55) });
  for (const [y, w, z] of [[H8 + 1.4, H8 - 1.4, -1.4], [H8 + 2.6, H8 - 3.6, -2.6], [H8 + 3.6, 2.6, -3.8], [H8 + 4.4, 1.4, -4.8]]) K.box(Hd, 0, y, z, w, 1.4, w, mix(K, [SH[2], SH[3]], 0.1), -0.35);
  for (let x = -H8 / 2; x <= H8 / 2; x += 1.2) K.box(Hd, x, H8 - 0.2 - Math.abs(x) * 0.15, H8 / 2 + 0.7, 1.3, 1.8 + K.r() * 1.2, 1, K.tone(SH, 0.12));
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.9, H8 * 0.5, H8 / 2 + 0.1, 1.9, 1.4, 0.3, cyan); K.box(Hd, sx * 1.7, H8 * 0.53, H8 / 2 + 0.25, 0.7, 0.6, 0.2, cyanL); }
  K.box(Hd, 0, H8 * 0.2, H8 / 2 + 0.1, 3.2, 2.4, 0.3, 0x04060a); for (const x of [-1.1, -0.35, 0.35, 1.1]) { K.box(Hd, x, H8 * 0.2 + 1, H8 / 2 + 0.2, 0.45, 0.6, 0.2, 0xc8d0d8); K.box(Hd, x, H8 * 0.2 - 1, H8 / 2 + 0.2, 0.45, 0.5, 0.2, 0xa8b0b8); }
  // ragged sleeves, bare bone forearms, long bony fingers reaching out
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -2.6, 0, 3.6, 6.4, 3.6, SH[2]);
    for (let i = 0; i < 4; i++) K.box(arm, -1.2 + i * 0.8, -6.4 - K.r() * 1.6, -0.4 + (i % 2) * 0.8, 1, 2.6 + K.r() * 2.4, 1, K.tone([...SH, FADE[0]], 0.12));
    K.box(arm, -0.45, -8.4, 0.3, 0.7, 3.6, 0.7, bone); K.box(arm, 0.45, -8.4, 0.3, 0.6, 3.6, 0.6, boneD); K.box(arm, 0, -6.8, 0.3, 1.4, 0.8, 1.2, boneD);
    K.box(arm, 0, -10.6, 0.5, 2.2, 1.2, 1.6, bone);
    for (const dx of [-0.8, -0.27, 0.27, 0.8]) { K.box(arm, dx, -12.2, 0.8, 0.35, 2.2, 0.35, bone, 0.25, 0, dx * -0.3); K.box(arm, dx * 1.1, -13.8, 1.6, 0.3, 1.6, 0.3, boneD, 0.8, 0, dx * -0.3); }
    K.box(arm, -1.2, -11, 1, 0.35, 1.8, 0.35, bone, 0.6, 0, 0.7);
  }
  // wisps trailing from the hem, one swaying group
  const w = group(rig.hips, 0, -7, -0.6);
  for (let i = 0; i < 5; i++) { const x = -3 + i * 1.5; for (let k = 0; k < 3; k++) K.box(w, x + (K.r() - 0.5) * 0.6, -1.4 - k * 2 - (i % 2), 0, 1.8 - k * 0.45, 2.2, 1.8 - k * 0.45, k === 2 ? MOTE[i % 3] : K.tone(k ? FADE : SH, 0.12)); }
  sway(rig, w, 'x', 0.3, 2.4);
  K.done();
  noShadow(rig, rig.armR, rig.armL, w);
  rig.float = 0.35; rig.hunch = 0.3; rig.held = [-1.25, -1.1];
  return finish(rig, 'shade');
}

// ---- keres ------------------------------------------------------------------------------------
// (vox-ow-fodder-3, bottom) Death spirits of the battlefield: a mane of wild
// white hair, a pale skull-like face with glowing red eyes and bared fangs,
// a ragged black dress hanging in long strips with no feet, a red sash,
// long bony arms ending in long glowing red talons (the accent), and great
// black bat wings veined in glowing red. They hang in the air and drop to
// strike, trailing red.
function buildKeres(K0) {
  const blk = 0x1a1216, blkL = 0x3a2a30, hairC = [0xe8e4e0, 0xc8c4c0, 0xffffff], pale = 0xe0d8d0, red = 0xff2a2a, redD = 0xa81a1a, RAG = [blk, blkL, 0x2a1e24];
  const mat = skinMat('keres', (S) => paintPerson(S, { skin: pale, hair: 0xe8e4e0, fringe: 2, hairSide: 4, hairBack: 8, eye: 0x0a0406, eyeWhite: 0x0a0406, brow: 0x8a8070, mouth: false, top: blk, sleeve: blk, hand: pale, pants: blk, shoes: false,
    face: (s, ey) => { for (const x of [9, 13]) { s.rect(x, ey - 1, 2, 2, 0x2a0408, 0); s.rect(x + 0.5, ey - 0.5, 1, 1, red, 0); } s.rect(11, ey + 1.5, 2, 1, 0x6a5a5a, 0); s.rect(9.5, ey + 3, 5, 1.5, 0x2a0408, 0); for (let x = 9.5; x < 14.5; x += 1) s.dot(x, ey + 3, 0xfff8f0, 0.6, 1); } }), { emit: 1.6, scale: 1.3 });
  const rig = new Rig({ material: mat, scale: 1.3, armW: 2.6, bodyW: 7, jacket: false });
  const K = kitOf(K0, 'keres', rig, mat, { seed: 173, rough: 0.9, emit: 0.9, ao: 0.3 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // a ragged black dress hanging in long strips tipped with red, a red sash, a bone collar
  blob(K, T, [0, 6.4, 0], [3.8, 6, 2.2], 0.8, (x, y) => (Math.abs(y + 0.3) < 0.1 ? redD : mix(K, RAG, 0.12)), { pw: 2.4, run: [1, 2] });
  K.box(T, 0, 11.2, 1.85, 3.2, 1.2, 0.5, pale); for (const x of [-1, 0, 1]) K.box(T, x, 10.4, 2.1, 0.5, 0.9, 0.3, pale);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, L = 9 + K.r() * 8, x = Math.sin(a) * 3.4, z = Math.cos(a) * 2;
    K.flare(T, x, 2 - L / 2, z, 1.6, L, 0.5, K.tone(RAG, 0.12), a, 0.18);
    if (i % 3 === 0) K.flare(T, x * (1 + L * 0.03), 2 - L - 0.6, z * (1 + L * 0.03), 0.8, 1.6, 0.4, i % 2 ? red : redD, a, 0.18);
  }
  // the mane of wild white hair, spilling down the back
  K.clumps(Hd, [0, H8 * 0.7, -0.8], [H8 + 2, H8 * 0.8, H8 + 1], { n: 34, size: [1.6, 2.8], cols: hairC, faces: 'tlrk', out: 0.15 });
  for (let i = 0; i < 10; i++) K.box(Hd, -4.6 + i * 1.02, H8 * 0.3 - (i % 3) * 1.2, -H8 / 2 - 1.2, 1.5, 5 + K.r() * 5, 1.5, K.tone(hairC, 0.08), 0.3, 0, (i - 4.5) * 0.12);
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) K.box(Hd, sx * (H8 / 2 + 1 + k * 0.8), H8 * 0.4 - k * 2, 0.4 - k, 1.5, 5, 2.6, K.tone(hairC, 0.08), 0, 0, sx * (0.2 + k * 0.25));
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.9 * HS, 4.4 * HS, 4 * HS + 0.2, 1.4, 1.2, 0.3, red); K.box(Hd, sx * 1.9 * HS, 4.4 * HS + 0.7, 4 * HS + 0.15, 1.8, 0.5, 0.4, 0x6a5a5a); }
  for (const x of [-1.2, -0.4, 0.4, 1.2]) K.box(Hd, x, 1.5, 4 * HS + 0.2, 0.4, 0.9, 0.2, 0xfff8f0);
  // long bony arms in ragged sleeves, long glowing red talons
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -2.4, 0, 2.8, 5, 2.8, blk); for (let i = 0; i < 3; i++) K.box(arm, -0.9 + i * 0.9, -5.6 - K.r() * 1.4, -0.3, 1, 2.6 + K.r() * 2, 1.4, K.tone(RAG, 0.1));
    K.box(arm, 0, -7.4, 0, 1.4, 5.4, 1.4, pale); K.box(arm, 0, -10.2, 0.2, 2.2, 1.2, 1.6, pale);
    for (const dx of [-0.9, -0.3, 0.3, 0.9]) { K.box(arm, dx, -12, 0.6, 0.5, 2.6, 0.5, redD, 0.25, 0, dx * -0.2); K.box(arm, dx * 1.1, -14, 1.5, 0.45, 2.2, 0.45, red, 0.6, 0, dx * -0.2); K.box(arm, dx * 1.15, -15.4, 2.8, 0.3, 1.4, 0.3, 0xff8a8a, 1, 0, dx * -0.2); }
  }
  rig.extras.claws = [rig.handR, rig.handL];
  // great bat wings: black membrane between bony fingers veined in glowing red, ragged at the trailing edge
  const W = [];
  for (const side of [-1, 1]) {
    const root = group(T, side * 2, 10.4, -2, 0, 0, side * -0.5), elbow = group(root, side * 10, 0, 0, 0, 0, side * -0.4), X = (v) => side * v;
    K.box(root, X(5), 0, 0, 10, 1.4, 1.4, blkL); K.box(root, X(5), -3.2, -0.2, 10, 5.4, 0.45, blk); K.box(root, X(5), -1.6, 0.1, 9, 0.4, 0.4, red);
    for (let i = 0; i < 5; i++) { const h = 4 + K.r() * 5; K.box(root, X(1 + i * 2), -5.6 - h / 2, -0.2, 1.6, h, 0.4, K.tone(RAG, 0.1)); }
    K.box(elbow, 0, 0, 0, 2.2, 2.2, 2.2, blkL); K.box(elbow, X(0.4), 1.4, 0, 0.8, 1.6, 0.8, pale);
    for (let i = 0; i < 7; i++) {
      const a = 0.32 - i * 0.2, L = 17 - Math.abs(i - 1) * 1.1 + K.r() * 2, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
      K.box(elbow, X(ux * L / 2), uy * L / 2, 0.1, L, 0.9, 0.5, blkL, 0, 0, side * a);   // the finger
      K.box(elbow, X(ux * L * 0.3 - px * 1.4), uy * L * 0.3 - py * 1.4, -0.15, L * 0.6, 2.8, 0.35, K.tone(RAG, 0.12), 0, 0, side * a);   // the membrane behind it, widening outward
      K.box(elbow, X(ux * L * 0.68 - px * 2.4), uy * L * 0.68 - py * 2.4, -0.17, L * 0.55, 4.8, 0.35, K.tone(RAG, 0.12), 0, 0, side * a);
      K.box(elbow, X(ux * L * 0.4 - px * 1), uy * L * 0.4 - py * 1, 0.05, L * 0.6, 0.35, 0.3, i % 2 ? redD : red, 0, 0, side * a);   // a red vein
      if (i > 2) K.box(elbow, X(ux * L * 0.7 - px * 3.6), uy * L * 0.7 - py * 3.6 - 1.5, -0.15, 0.9, 3 + K.r() * 3, 0.3, K.tone(RAG, 0.1));   // ragged strands at the trailing edge
    }
    W.push({ root, elbow, side });
  }
  // slow heavy beats with the wings held high in a V, the ragged membrane hanging off the fingers
  rig.extras.wings = W; rig.wingFlap = 1.1; rig.wingStroke = { base: 0.52, amp: 0.33, hand: 0.4, down: 0.38 };
  for (const w of W) w.root.rotation.y = w.side * 0.25;
  K.done();
  noShadow(rig, rig.armR, rig.armL, ...W.flatMap((w) => [w.root, w.elbow]));
  rig.float = 1.25; rig.hunch = 0.3;
  return finish(rig, 'keres');
}

// The model builders, keyed by model id: monsters.js passes its voxel kit in.
export function fodderModels(K0) {
  return {
    karpos: () => buildKarpos(K0),
    karpos_slinger: () => buildKarpos(K0, true),
    colchis_calf: () => buildCalf(K0),
    myrmex: () => buildMyrmex(K0),
    myrmex_spitter: () => buildMyrmex(K0, true),
    boarlet: () => buildBoarlet(K0),
    crab: () => buildCrab(K0),
    king_crab: () => buildKingCrab(K0),
    basilisk: () => buildBasilisk(K0),
    earthborn: () => buildEarthborn(K0),
    daedalus_drone: () => buildDrone(K0),
    laistrygonian: () => buildLaistrygonian(K0),
    shade: () => buildShade(K0),
    keres: () => buildKeres(K0),
  };
}
