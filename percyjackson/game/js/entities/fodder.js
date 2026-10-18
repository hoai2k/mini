// The open world's fodder (design requests vox-ow-fodder, -2 and -3 in
// design/source/build_requests.py; the art isn't drawn yet, so these follow
// their descriptions): the monsters you plow through in the Minecraft
// Dungeons way, in hordes, each region with a few kinds that play
// differently (short and long range, small and large) and a tough rare one.
//
//   fields     karpos (swarm melee), karpos slinger (seed pods from range),
//              Colchis bull calf (larger: charges, a short jet of fire)
//   woods      myrmex (swarm melee), myrmex spitter (lobs acid),
//              Calydonian boarlet (larger: charges)
//   shore      crab (scuttles sideways), king crab (rare tank: crusher claw)
//   canyon     basilisk (small, quick, spits venom), Earthborn (rare: a
//              six-armed clay giant lobbing mud)
//   labyrinth  Daedalus drone (a bronze clockwork bird firing bolts)
//   othrys     Laistrygonian (rare: a huge giant lobbing flaming balls)
//   asphodel   shade (slow, drifts in crowds), keres (fast swooping fliers)
//
// Every model is seen by the hundred, so each has a strong silhouette and a
// bold accent that reads in a crowd (glowing eyes, a fire glow, a gold crown,
// a red claw), and costs little: a handful of boxes merged into one mesh per
// moving part (monsters.js's voxel kit), skins shared per kind (no shaders
// built per spawn; painted without a read-back pass), no ambient aura, and
// small parts cast no shadow. Each bursts into its own bits as it goes (on
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
import { Rig, PX } from './character.js';
import { QuadRig, paintQuad } from './quad.js';
import { paintPerson } from './mortals.js';
import { t as txt } from '../text_config.js';
import { HS, skinMat, group, sway } from './parts.js';

// The new kinds (world/roamZones.js counts the small ones as fodder).
export const FODDER_IDS = ['karpos', 'karpos_slinger', 'colchis_calf', 'myrmex', 'myrmex_spitter', 'boarlet', 'crab', 'king_crab', 'basilisk', 'earthborn', 'daedalus_drone', 'laistrygonian', 'shade', 'keres'];

// Stat blocks (as monsters.js MONSTERS). The swarm kinds sit with the other
// minors (rat 14 HP, spider 20, pup 32); the larger chargers are minor
// bruisers; the king crab, the Earthborn and the Laistrygonian are elites.
export const FODDER_MONSTERS = {
  // fields
  karpos: { name: txt('monsters.karpos.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 5.4, dmg: 4, radius: 0.4, height: 1.25, ai: 'melee', range: 1.2, windup: 0.35, cd: 1.1, xp: 2, coins: [0, 2], model: 'karpos', pitch: 1.6, voice: 'rustle', knockResist: 0 },
  karpos_slinger: { name: txt('monsters.karpos_slinger.name'), tier: 'minor', role: 'ranged', hp: 12, speed: 4.2, dmg: 4, radius: 0.4, height: 1.25, ai: 'ranged', range: 11, keep: 7, windup: 0.6, cd: 2.4, xp: 2, coins: [0, 2], model: 'karpos_slinger', pitch: 1.4, voice: 'rustle', projectile: 'feather', knockResist: 0 },
  colchis_calf: { name: txt('monsters.colchis_calf.name'), tier: 'minor', role: 'bruiser', hp: 55, speed: 4.4, dmg: 10, radius: 0.85, height: 1.5, ai: 'melee', range: 3.2, windup: 0.75, cd: 2.2, xp: 5, coins: [2, 4], model: 'colchis_calf', pitch: 0.8, voice: 'snort', armor: 0.15, knockResist: 0.5, slashColor: 0xff7a1a },
  // woods
  myrmex: { name: txt('monsters.myrmex.name'), tier: 'minor', role: 'rusher', hp: 22, speed: 4.8, dmg: 6, radius: 0.55, height: 0.9, ai: 'melee', range: 1.4, windup: 0.4, cd: 1.2, xp: 2, coins: [0, 2], model: 'myrmex', pitch: 1.3, voice: 'chitter', knockResist: 0.1 },
  myrmex_spitter: { name: txt('monsters.myrmex_spitter.name'), tier: 'minor', role: 'lobber', hp: 18, speed: 4, dmg: 6, radius: 0.6, height: 1, ai: 'ranged', range: 9, keep: 6, windup: 0.7, cd: 2.8, xp: 3, coins: [1, 2], model: 'myrmex_spitter', pitch: 1.1, voice: 'chitter', projectile: 'acid', lob: true, knockResist: 0.1 },
  boarlet: { name: txt('monsters.boarlet.name'), tier: 'minor', role: 'bruiser', hp: 50, speed: 5, dmg: 9, radius: 0.85, height: 1.4, ai: 'melee', range: 3.4, windup: 0.65, cd: 2, xp: 5, coins: [2, 4], model: 'boarlet', pitch: 0.9, voice: 'snort', knockResist: 0.5, slashColor: 0xf0e0c0 },
  // shore
  crab: { name: txt('monsters.crab.name'), tier: 'minor', role: 'fodder', hp: 28, speed: 4, dmg: 6, radius: 0.7, height: 0.9, ai: 'melee', range: 1.6, windup: 0.45, cd: 1.3, xp: 3, coins: [1, 3], model: 'crab', pitch: 1, voice: 'clack', armor: 0.1, knockResist: 0.3 },
  king_crab: { name: txt('monsters.king_crab.name'), tier: 'elite', role: 'tank', hp: 160, speed: 2.2, dmg: 16, radius: 1.5, height: 2.4, ai: 'tank', range: 2.4, windup: 0.9, cd: 2.4, xp: 10, coins: [4, 8], model: 'king_crab', pitch: 0.6, voice: 'clack', armor: 0.3, knockResist: 0.8, superArmor: true, slamR: 2.4 },
  // canyon
  basilisk: { name: txt('monsters.basilisk.name'), tier: 'minor', role: 'ranged', hp: 16, speed: 5.6, dmg: 5, radius: 0.5, height: 1.1, ai: 'ranged', range: 8, keep: 5, windup: 0.45, cd: 2.2, xp: 2, coins: [0, 2], model: 'basilisk', pitch: 1.5, voice: 'hiss', projectile: 'acid', knockResist: 0, poison: { dps: 2, dur: 3 } },
  earthborn: { name: txt('monsters.earthborn.name'), tier: 'elite', role: 'lobber', hp: 170, speed: 2.4, dmg: 14, radius: 1, height: 3, ai: 'ranged', range: 13, keep: 8, windup: 1, cd: 3, xp: 12, coins: [5, 9], model: 'earthborn', pitch: 0.55, voice: 'grind', projectile: 'acid', lob: true, armor: 0.15, knockResist: 0.75, superArmor: true },
  // labyrinth
  daedalus_drone: { name: txt('monsters.daedalus_drone.name'), tier: 'minor', role: 'ranged', hp: 18, speed: 4.6, dmg: 6, radius: 0.5, height: 1.4, ai: 'ranged', range: 11, keep: 7, windup: 0.55, cd: 2.4, xp: 3, coins: [1, 3], model: 'daedalus_drone', pitch: 1.6, voice: 'whir', projectile: 'bullet', knockResist: 0.1 },
  // othrys
  laistrygonian: { name: txt('monsters.laistrygonian.name'), tier: 'elite', role: 'lobber', hp: 220, speed: 2.4, dmg: 18, radius: 1.1, height: 3.6, ai: 'ranged', range: 14, keep: 9, windup: 1.1, cd: 3.2, xp: 16, coins: [7, 12], model: 'laistrygonian', pitch: 0.45, voice: 'roar', projectile: 'fire', lob: true, armor: 0.1, knockResist: 0.85, superArmor: true },
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
    if (s.splat || s.noHazard) { const prev = p.onExpire; p.onExpire = (q, why) => { if (s.noHazard) { if (why !== 'hit') { g.fx.splat(q.pos, s.splat); g.particles.burst(q.pos, { count: 8, color: dustCol, additive: false, speed: 2.4, life: 0.6, size: 0.35, sizeEnd: 0.9, drag: 3, up: 0.6 }); } } else { prev?.(q, why); if (why !== 'hit') g.fx.splat(q.pos, s.splat); } }; }
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
    // the calf's vents smoke; the Laistrygonian's ball burns
    if (kind === 'colchis_calf' && rig.extras.vents && Math.random() < dt * 2.2) { rig.extras.vents.getWorldPosition(_c); _c.y += 0.25; g.particles?.burst(_c, { count: 1, color: smokeCol, additive: false, speed: 0.4, life: 1.2, size: 0.25, sizeEnd: 0.6, drag: 1.5, up: 1.6, gravity: -1.2 }); }
    if (kind === 'laistrygonian' && rig.extras.ball && Math.random() < dt * 8) { rig.extras.ball.getWorldPosition(_c); _c.y += 0.4; g.particles?.burst(_c, { count: 1, color: Math.random() < 0.5 ? fireCol : fireHot, speed: 0.6, life: 0.5, size: 0.3, sizeEnd: 0.05, drag: 2, up: 2, gravity: -2 }); }
    // the keres hang in the air and drop to strike, their claws trailing red
    if (swoop && (st === 'windup' || st === 'recover') && Math.random() < dt * 24) { (Math.random() < 0.5 ? rig.handR : rig.handL).getWorldPosition(_c); g.particles?.burst(_c, { count: 1, color: redCol, speed: 0.2, life: 0.45, size: 0.18, sizeEnd: 0.04, drag: 3 }); }
    if (swoop) { const want = st === 'windup' || st === 'recover' ? 0.25 : 1.25; rig.float += (want - rig.float) * Math.min(1, dt * (want < rig.float ? 9 : 3)); }
    if (shot && prev === 'windup' && st === 'recover' && e.action?.kind === 'spit') restyleShots(e, shot);
  };
}

// ---- death bits: a burst of the kind's own stuff as it falls (Enemy.die
// already throws the golden dust). The rig hears of its death through
// animate's 'death' action.
// [colour, count, additive, speed, size, gravity]
const BITS = {
  karpos: [[C(0xe8c860), 16, false, 3.6, 0.13, 8], [C(0x9ab04a), 8, false, 2.6, 0.16, 6], [C(0x8aff3a), 5, true, 2, 0.12, -1]],
  karpos_slinger: [[C(0xe8c860), 14, false, 3.4, 0.13, 8], [C(0x3a8a2a), 8, false, 2.6, 0.16, 6], [C(0xffc030), 10, true, 3, 0.14, 4]],
  colchis_calf: [[C(0xc08a2c), 14, false, 4, 0.18, 12], [C(0x5a3a1a), 8, false, 3, 0.16, 12], [C(0xff7a1a), 14, true, 3.5, 0.22, -1], [C(0x6a6a6a), 6, false, 1.4, 0.5, -2]],
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
    const P = rig.held;
    if (rig.posed) { rig.armR.rotation.x -= rig.posed[0]; rig.armL.rotation.x -= rig.posed[1]; rig.posed = null; }
    anim(p);
    if (P && !p.action) { rig.armR.rotation.x += P[0]; rig.armL.rotation.x += P[1]; rig.posed = P; }
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

// ---- karpos and karpos slinger -----------------------------------------------------
// (vox-ow-fodder, top left; vox-ow-fodder-2, top left) A gangly spirit of the
// grain, about chest-high to a hero: a straw hood over a dark face with two
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
    face: (s, ey) => { s.rect(8, ey - 3, 8, 8, 0x1e1408, 0.1); for (const x of [9, 13]) { s.rect(x, ey - 0.5, 2, 2, eye, 0); s.dot(x + 0.5, ey, 0xe8ffb0, 1, 1); } s.rect(10, ey + 3, 4, 1, 0x0e0804, 0); } }), { emit: 1.6 });
}
function buildKarpos(K0, slinger = false) {
  const { gold, goldL, goldD, straw, leaf, leafD, twine, pod } = KG, STRAW = [gold, goldL, goldD, straw], LEAF = [leaf, leafD, 0x5aa03a];
  const mat = karposSkin();
  const rig = new Rig({ material: mat, scale: 0.85, legH: 9, bodyH: 10, bodyW: 7, bodyD: 5, armW: 2.4, headS: 8, jacket: false });
  const K = K0.kit(rig, mat, { seed: slinger ? 131 : 101, rough: 0.85, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  // body: a sheaf of stalks, narrower at the waist, leaves woven in, twine bands
  K.box(T, 0, 6, 0, 7.4, 8, 5, gold); K.box(T, 0, 1.4, 0, 5.6, 3, 4, goldD);
  for (let x = -3.2; x <= 3.3; x += 1.3) K.box(T, x, 5.6, 2.55, 1, 9.6, 0.5, K.tone(STRAW, 0.12));
  for (const y of [2.6, 8.4]) K.box(T, 0, y, 0, 7.8, 0.8, 5.4, twine);
  for (let i = 0; i < 5; i++) K.box(T, -2.6 + i * 1.3, 6 - (i % 2) * 2, 2.8, 0.8, 4, 0.4, K.tone(LEAF, 0.1), 0, 0, (i - 2) * 0.3);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, L = 4 + K.r() * 3; K.flare(T, Math.sin(a) * 3.2, -L / 2 + 0.6, Math.cos(a) * 2.2, 1.6, L, 0.6, i % 3 ? K.tone(STRAW, 0.1) : K.tone(LEAF, 0.1), a, 0.3); }
  // the hood: straw all round a dark face, a pointed fringe over the brow
  K.box(Hd, 0, H8 + 0.6, -0.4, H8 + 1.6, 1.4, H8 + 1.2, straw);
  for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 + 0.6), H8 / 2 - 0.6, -0.2, 1.2, H8 + 2, H8 + 1.6, goldD);
  K.box(Hd, 0, H8 / 2, -H8 / 2 - 0.7, H8 + 2.4, H8 + 1.6, 1.2, gold);
  for (let x = -H8 / 2; x <= H8 / 2; x += 1.2) K.box(Hd, x, H8 - 0.6 - Math.abs(x) * 0.25, H8 / 2 + 0.5, 1.3, 2.4 + K.r(), 0.8, K.tone(STRAW, 0.12));
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) K.box(Hd, sx * (H8 / 2 + 0.3 - i * 0.5), -1 - i * 0.8, H8 / 2 + 0.2, 1, 2.6, 0.8, K.tone(STRAW, 0.12));
  // the spray of wheat ears and green blades fanning up behind the head
  const ears = slinger ? 7 : 9;
  for (let i = 0; i < ears; i++) {
    const tilt = (i - (ears - 1) / 2) * (slinger ? 0.26 : 0.22), L = 7 + (1 - Math.abs(tilt)) * 4 + K.r() * 2, z = -2.6 - (i % 2) * 1.2;
    const sx = Math.sin(tilt), cy = Math.cos(tilt), bx = sx * 2;
    K.box(Hd, bx + sx * L / 2, H8 + cy * L / 2, z, 0.6, L, 0.6, goldD, 0, 0, -tilt);
    for (let k = 0; k < 4; k++) { const d = L + 1 + k * 1.6; K.box(Hd, bx + sx * d + (k % 2 ? 0.5 : -0.5) * cy, H8 + cy * d, z, 2, 2, 2, k === 3 ? goldL : K.tone([gold, goldL], 0.1), 0, 0, -tilt); }
    K.box(Hd, bx + sx * (L + 7.6), H8 + cy * (L + 7.6), z, 0.3, 2, 0.3, goldL, 0, 0, -tilt);
  }
  for (const [x, rz, L] of [[-4.6, 1.1, 8], [4.6, -1.1, 8], [-3, 0.6, 9], [3.2, -0.6, 8], [-1, 0.2, 10], [1.4, -0.25, 9]]) K.box(Hd, x - Math.sin(rz) * L * 0.3, H8 * 0.6 + Math.cos(rz) * L * 0.45, -1.6, 1.4, L, 0.5, K.tone(LEAF, 0.1), 0, 0, rz);
  // long straw arms bound at the wrist, four long clawed fingers
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -1, 0, 2.8, 3, 2.8, goldD); K.box(arm, 0, -5.6, 0, 1.8, 9, 1.8, gold); K.box(arm, 0, -9.8, 0, 2.4, 1, 2.4, twine);
    for (const [dx, rz] of [[-1, 0.3], [-0.35, 0.1], [0.35, -0.1], [1, -0.3]]) { K.box(arm, dx, -12, 0.3, 0.55, 3.6, 0.55, straw, 0.2, 0, rz); K.box(arm, dx * 1.25, -14, 1, 0.45, 1.8, 0.45, goldD, 0.9, 0, rz); }
  }
  if (slinger) {
    // the sling: two cords from the right hand to a glowing pod; a string of pods at the belt
    const s = group(rig.handR, 0, -3, 0);
    K.box(s, -0.4, -3, 0, 0.35, 6, 0.35, twine, 0, 0, 0.12); K.box(s, 0.4, -3, 0, 0.35, 6, 0.35, twine, 0, 0, -0.12);
    K.box(s, 0, -6.2, 0, 2.4, 1, 1.6, twine); K.box(s, 0, -5.4, 0, 1.8, 1.8, 1.8, pod); K.box(s, 0, -5.4, 0, 1, 2.4, 1, 0xfff0a0);
    sway(rig, s, 'x', 0.6, 7);
    for (const [x, y] of [[-2.4, 1.2], [-0.8, 0.6], [0.8, 0.6], [2.4, 1.2]]) { K.box(T, x, y, 2.9, 0.3, 1.2, 0.3, twine); K.box(T, x, y - 1.2, 3, 1.2, 1.2, 1.2, pod); }
  }
  // legs: bundled stalks bound at the knee, splaying into root toes
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    K.box(leg, 0, -4, 0, 2.8, 8, 2.8, goldD); K.box(leg, 0, -4.4, 0, 3.2, 0.8, 3.2, twine);
    for (const [dx, ry] of [[-0.9, 0.4], [0, 0], [0.9, -0.4]]) K.box(leg, dx, -8.6, 1.4, 0.8, 0.8, 3, straw, 0, ry, 0);
  }
  K.done();
  noShadow(rig, rig.armR, rig.armL, rig.legR, rig.legL);
  return finish(rig, slinger ? 'karpos_slinger' : 'karpos');
}

// ---- Colchis bull calf -----------------------------------------------------------
// (vox-ow-fodder-2, top right) A boxy bronze automaton bull calf, about a
// hero's height at the horns: big riveted bronze plates over a dark iron
// frame, round iron joints at shoulder and knee, two smoking vents on its
// back, a jointed iron tail with a bronze knob; a broad brown head with cream
// horns from bronze sockets, glowing orange eyes, a cream muzzle plate with
// glowing nostrils. It paws, then charges with a jet of fire.
function buildCalf(K0) {
  const brz = 0xc8902e, brzD = 0x7a5418, brzL = 0xe8b448, iron = 0x3a2a22, ironD = 0x241a14, gold = 0xf0c040, glow = 0xff8a1a, hot = 0xffd860, horn = 0xf0e0c0, head = 0x6a4428;
  const mat = skinMat('colchis_calf', flatQuad(brz, brzD, iron, glow), { rough: 0.4, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.7, bodyL: 12, bodyW: 8, bodyH: 7, legH: 7, legW: 3, headS: 5, snout: false, neckUp: -0.6, headZ: 1.6, gait: 1.2, ears: false, tail: 2, tailLen: 5, tailW: 1 });
  const K = K0.kit(rig, mat, { seed: 137, rough: 0.4, metal: 0.25, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 5;
  dropAll(rig, T); dropAll(rig, Hd);
  // the frame and the plates: a raised shoulder, side panels with rivets, a hump
  K.box(T, 0, 0, 0, 7.6, 6.6, 11, iron); K.box(T, 0, 1, 3.4, 8.8, 7.6, 4.4, brz); K.box(T, 0, 0.4, -2.6, 8.6, 6.4, 5.4, brz);
  for (const sx of [-1, 1]) {
    for (const [z, h] of [[3.4, 6], [-2.6, 5]]) { K.box(T, sx * 4.5, 0.6, z, 0.5, h, z > 0 ? 3.6 : 4.6, brzL); for (const [dy, dz] of [[h / 2 - 0.8, 1.4], [h / 2 - 0.8, -1.4], [-h / 2 + 0.8, 1.4], [-h / 2 + 0.8, -1.4]]) K.box(T, sx * 4.8, 0.6 + dy, z + dz, 0.3, 0.6, 0.6, gold); }
    K.box(T, sx * 4.4, 0.4, 0.6, 0.6, 5.4, 1.2, ironD);
  }
  K.box(T, 0, 4.6, 2.6, 6.4, 1.6, 5, brzD); K.box(T, 0, 4.2, -2.4, 7.4, 1.2, 4.6, brzL);
  K.box(T, 0, 1, 5.7, 4, 3.4, 0.4, ironD); for (const y of [0, 1, 2]) K.box(T, 0, y, 5.9, 3.4, 0.45, 0.3, glow);   // the furnace grille
  K.box(T, 0, -3.5, 0, 6, 0.6, 9, ironD);
  // two smoking vents on the back
  const vents = group(T, 0, 5, -1);
  for (const sx of [-1, 1]) { K.box(vents, sx * 1.8, 0.8, 0, 1.4, 2.4, 1.4, iron); K.box(vents, sx * 1.8, 2.1, 0, 1.8, 0.4, 1.8, brzD); K.box(vents, sx * 1.8, 2.25, 0, 0.9, 0.2, 0.9, 0x1a1210); }
  rig.extras.vents = vents;
  // head: broad brown head, bronze brow plate, glowing eyes, a cream muzzle plate, horns
  const hz = hs * 0.35;
  K.box(Hd, 0, 0, hz, hs + 0.6, hs, hs, head); K.box(Hd, 0, hs * 0.44, hz, hs + 1, 1.2, hs + 0.2, brz);
  K.box(Hd, 0, -1.6, hz + hs / 2 + 0.9, hs - 1.2, 3.6, 1.8, horn); K.box(Hd, 0, -3.2, hz + hs / 2 + 0.6, hs - 2.4, 1, 1.4, 0xd8c8a8);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 1.2, -1.6, hz + hs / 2 + 1.85, 1, 1.2, 0.3, ironD); K.box(Hd, sx * 1.2, -1.8, hz + hs / 2 + 1.95, 0.6, 0.6, 0.3, glow);
    K.box(Hd, sx * 2.2, 1.2, hz + hs / 2 + 0.05, 1.6, 1.2, 0.3, glow); K.box(Hd, sx * 2.2, 1.2, hz + hs / 2 + 0.15, 0.7, 0.6, 0.3, hot);
    K.box(Hd, sx * (hs / 2 + 0.8), hs * 0.42, hz, 1.8, 2, 2, brzD);
    K.box(Hd, sx * (hs / 2 + 2.4), hs * 0.42 + 0.4, hz + 0.2, 2.8, 1.6, 1.6, horn, 0, 0, sx * 0.2);
    K.box(Hd, sx * (hs / 2 + 4), hs * 0.42 + 2.2, hz + 0.8, 1.3, 3.4, 1.3, horn, 0.3, 0, sx * -0.15); K.box(Hd, sx * (hs / 2 + 4.1), hs * 0.42 + 4, hz + 1.6, 0.9, 1.6, 0.9, 0xfff8e8, 0.7, 0, 0);
    K.box(Hd, sx * (hs / 2 + 0.2), hs * 0.2, hz - 1.2, 0.6, 2.2, 1.6, head);
  }
  rig.extras.nose = group(Hd, 0, -1.8, hz + hs / 2 + 2.2);
  K.box(M, 0, -1, 1.6, hs - 2, 1.2, 2.2, head);
  // legs: bronze thigh plates, iron knee discs, banded dark hooves
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    K.box(leg, 0, -1.6, 0, 3.6, 3.6, 3.6, brz); K.box(leg, leg.userData.side * 1.9, -1.6, 0, 0.5, 2.4, 2.4, gold);
    K.box(leg, 0, -3.6, 0, 2.8, 1.4, 2.8, ironD); K.box(leg, 0, -4.8, 0, 2.6, 1.6, 2.6, iron);
    K.box(leg, 0, -6, 0, 2.4, 1.4, 2.4, iron); K.box(leg, 0, -6.6, 0.2, 3.4, 0.6, 3.6, gold); K.box(leg, 0, -7.1, 0.2, 3.2, 0.6, 3.4, ironD);
  }
  for (const s of rig.tail) dropAll(rig, s);
  K.box(rig.tail[0], 0, 0, -1.4, 0.9, 0.9, 2.8, iron); K.box(rig.tailTip, 0, 0, -1.6, 0.8, 0.8, 2.6, iron); K.box(rig.tailTip, 0, 0, -3.2, 1.8, 1.8, 1.4, brzL);
  K.done();
  noShadow(rig, M, rig.tailTip, rig.tail[0], ...rig.legs);
  return finish(rig, 'colchis_calf');
}

// ---- myrmex and myrmex spitter -----------------------------------------------------
// A giant ant (vox-ow-fodder-fix: an ant, not a spider): three body parts, a
// big head, a narrow waist and a big round abdomen; glossy black-brown chitin
// edged and banded in orange bronze, glowing orange eyes, elbowed antennae
// with orange tips, big bronze mandibles, and six long legs that arch high
// at bronze-banded knees. The spitter's abdomen is a swollen glowing green
// sac striped dark, and green drips from its jaws.
function buildMyrmex(K0, spitter = false) {
  const blk = 0x1e1614, blkL = 0x3e2e26, brz = 0xd8801a, brzD = 0x8a4a12, brzL = 0xf0b040, eye = 0xff8a10, ACID = 0x7aff2a, ACIDD = 0x2a7a1a;
  const mat = skinMat('myrmex', flatQuad(blk, 0x0e0a08, 0x2a2018, eye), { rough: 0.3, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.6, bodyL: 5, bodyW: 4.4, bodyH: 4, legH: 6, legW: 1.1, headS: 7, legs: 6, splay: 1.0, footL: 7, kneeOut: 0.45, legY: 0.6, snout: false, neckUp: 1.2, headZ: 1.4, gait: 1.8, ears: false });
  const K = K0.kit(rig, mat, { seed: spitter ? 107 : 103, rough: 0.3, metal: 0.15, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, { hs, legW } = rig.dims;
  dropAll(rig, T); dropAll(rig, Hd);
  // the thorax: a short humped block with a bronze-edged saddle
  K.box(T, 0, 0.2, 0.4, 4.4, 4, 5.4, blk); K.box(T, 0, 2.3, 0.8, 3.4, 0.6, 3.8, blkL); K.box(T, 0, 2.2, -1.4, 4.6, 0.5, 0.6, brz);
  // the waist: two little knots
  K.box(T, 0, 0.6, -2.8, 2, 2, 1.6, blkL); K.box(T, 0, 1, -4, 2.4, 2.6, 1.4, blk);
  // the abdomen: a big rounded egg, banded
  const ab = group(T, 0, 1.4, -4.4, spitter ? -0.25 : -0.15), S = spitter ? 1.25 : 1, c = -5.4 * S;
  const body = spitter ? ACID : blk, rim = spitter ? ACIDD : brz;
  // an egg built up from crossed boxes, tapering at both ends
  for (const [w, h, d] of [[7, 6, 9], [8.4, 5, 7], [5.6, 7.2, 7], [5, 4.6, 11.4], [6, 3.2, 10.4], [3.4, 3.4, 12]]) K.box(ab, 0, 0, c, w * S, h * S, d * S, body);
  for (const [dz, w, h] of [[-3.8, 6.4, 5], [-1.4, 8.4, 6.6], [1, 8.6, 6.8], [3.4, 7.4, 6]]) K.box(ab, 0, 0, c + dz * S, w * S, h * S, 1, rim);
  K.box(ab, 0, 3.95 * S, c + 1, 3 * S, 0.3, 4 * S, spitter ? 0xd8ffa0 : blkL);
  if (spitter) for (const sx of [-1, 1]) K.box(M, sx * 0.6, -1.2, 3.4, 0.5, 1.8, 0.5, ACID);
  // head: a big rounded head with a bronze brow, glowing eyes, elbowed antennae
  const hz = hs * 0.35;
  K.box(Hd, 0, 0, hz, hs, hs * 0.85, hs, blk); K.box(Hd, 0, 0, hz, hs + 0.8, hs * 0.6, hs - 1.2, blk);
  K.box(Hd, 0, hs * 0.45, hz - 0.2, hs * 0.7, 0.6, hs * 0.7, brz);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 1.6, hs * 0.12, hz + hs / 2 + 0.05, 1.8, 1.4, 0.4, eye); K.box(Hd, sx * 1.5, hs * 0.18, hz + hs / 2 + 0.2, 0.7, 0.6, 0.3, 0xffe0a0);
    K.box(Hd, sx * (hs / 2 + 0.1), hs * 0.1, hz + 1.2, 0.4, 1.4, 1.6, eye);
    K.box(Hd, sx * 1.2, hs * 0.45 + 2, hz + 1.4, 0.6, 4.2, 0.6, blkL, 0.35, 0, sx * -0.35);
    K.box(Hd, sx * 2.3, hs * 0.45 + 4.6, hz + 3.6, 0.55, 0.55, 4, blk, -0.55, sx * 0.25, 0);
    K.box(Hd, sx * 2.7, hs * 0.45 + 5.8, hz + 5.6, 0.8, 0.8, 1.4, brzL, -0.55, sx * 0.25, 0);
  }
  // mandibles: two big curved bronze pincers
  for (const sx of [-1, 1]) { K.box(M, sx * 1.6, 0, 1.8, 1.4, 1.2, 3.8, brz, 0, -sx * 0.4, 0); K.box(M, sx * 0.7, 0, 3.8, 1.2, 1, 2.2, brzL, 0, sx * 0.85, 0); K.box(M, sx * 1.2, -0.7, 2.4, 0.4, 0.6, 0.4, 0xfff0d0); }
  // six long legs arching high at the knee, fanned fore and aft
  for (const leg of rig.legs) {
    const u = leg.userData; leg.rotation.y = -u.side * (0.7 - u.row * 0.7);
    const k = u.knee; dropAll(rig, leg); dropAll(rig, k);
    K.box(leg, 0, -3, 0, legW + 0.2, 6, legW + 0.2, blk); K.box(leg, 0, -0.4, 0, 1.8, 1.4, 1.8, blkL);
    K.boxZ(k, 0, 0, 0, 1.8, 1.8, 1.8, brz); K.boxZ(k, 0, -3.4, 0, legW * 0.9, 6.8, legW * 0.9, blkL); K.boxZ(k, 0, -2, 0, legW + 0.5, 1.2, legW + 0.5, brz); K.boxZ(k, 0, -4.6, 0, legW + 0.4, 0.8, legW + 0.4, brzD); K.boxZ(k, 0, -6.8, 0, 0.7, 1, 0.7, brzL);
  }
  K.done();
  noShadow(rig, Hd, M, ...rig.legs);
  return finish(rig, spitter ? 'myrmex_spitter' : 'myrmex');
}

// ---- Calydonian boarlet ---------------------------------------------------------
// (vox-ow-fodder-2, bottom left) A big shaggy brown boar, a hero's height at
// the shoulder hump: a heavy forequarter in clumps of rust-brown fur, a
// bristling mane of cream-tipped spines over the shoulders and back (its
// silhouette), great curved cream tusks, glowing orange eyes, a pink-brown
// snout, dark hooves banded in brass; it lowers its head and charges.
function buildBoarlet(K0) {
  const fur = 0x6a3a1e, furD = 0x3a2010, furL = 0x8a5a30, bone = 0xf0e0b8, spineB = 0x8a5a30, snout = 0x9a5a4a, eye = 0xffa020, hoof = 0x2a1a10, brass = 0xc89a3a;
  const FUR = [fur, furD, furL, 0x5a3018];
  const mat = skinMat('boarlet', flatQuad(fur, furD, 0x4a2a16, eye), { rough: 0.9, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.85, bodyL: 12, bodyW: 8, bodyH: 7.5, legH: 4.5, legW: 2.6, headS: 7, snout: false, neckUp: -0.4, headZ: 0.6, gait: 1.4, ears: false, tail: 2, tailLen: 3, tailW: 0.8 });
  const K = K0.kit(rig, mat, { seed: 139, rough: 0.9, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 7;
  dropAll(rig, T); dropAll(rig, Hd);
  // body: a hunched forequarter sloping to the haunches, shaggy
  K.box(T, 0, 0, -1.4, 7.6, 6.6, 9.4, fur); K.box(T, 0, 0.9, 3.4, 8.6, 8, 5, furD);
  K.clumps(T, [0, 0.4, 0.6], [8.4, 7.4, 11], { n: 40, size: [1.4, 2.4], cols: FUR, faces: 'lrkbf', out: -0.15 });
  // the mane of spines: tall over the shoulders, falling away along the back
  for (let i = 0; i < 22; i++) {
    const z = 5.8 - (i >> 1) * 1, sx = i % 2 ? 1 : -1, h = 7 - (i >> 1) * 0.55 + K.r() * 1.4, x = sx * (0.6 + K.r() * 2.2);
    K.box(T, x, 3.4 + h * 0.3, z, 1.5, h * 0.62, 1.5, spineB, -0.5, 0, sx * 0.3);
    K.box(T, x + sx * Math.sin(0.3) * h * 0.5, 3.4 + h * 0.72, z - h * 0.3, 1, h * 0.42, 1, bone, -0.5, 0, sx * 0.3);
  }
  // head: a long wedge with clumps of fur, glowing eyes, ears, a snout disc, tusks
  const hz = hs * 0.35;
  K.box(Hd, 0, 0.4, hz, hs, hs, hs, furD); K.box(Hd, 0, -0.8, hz + hs / 2 + 1.6, hs - 1.4, hs - 2, 3.2, fur);
  K.clumps(Hd, [0, 0.4, hz - 0.6], [hs, hs, hs - 1], { n: 10, size: [1.2, 2], cols: FUR, faces: 'tlr', out: -0.2 });
  K.box(Hd, 0, -1.2, hz + hs / 2 + 3.4, 4, 3.2, 0.8, snout); for (const sx of [-1, 1]) K.box(Hd, sx * 0.9, -1.2, hz + hs / 2 + 3.85, 0.8, 1, 0.2, 0x2a1410);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * (hs / 2 - 0.4), 1.4, hz + hs / 2 + 0.05, 1.4, 1, 0.3, eye); K.box(Hd, sx * (hs / 2 - 0.4), 2.2, hz + hs / 2 + 0.1, 1.8, 0.6, 0.4, furD);
    K.box(Hd, sx * (hs / 2 - 0.4), hs / 2 + 1.4, hz - 1, 1.8, 2.8, 1, furL, -0.3, 0, sx * 0.5);
    K.box(M, sx * 2.6, 1, 2.8, 1.1, 1.1, 3.4, bone, -0.4, 0, 0); K.box(M, sx * 2.9, 3, 4.2, 1, 2.8, 1, bone, 0.3, 0, sx * 0.3); K.box(M, sx * 3.2, 4.6, 4, 0.7, 1.2, 0.7, 0xfff8e0, 0.8, 0, sx * 0.3);
  }
  K.box(M, 0, -0.4, 1.8, hs - 2.4, 1, 2.8, snout); K.box(M, 0, 0.3, 2.6, hs - 3, 0.5, 1.4, 0x8a1a1a);
  // legs: shaggy thighs, banded dark hooves
  for (const leg of rig.legs) { dropAll(rig, leg); K.box(leg, 0, -1.4, 0, 3.2, 3.4, 3.2, furD); K.box(leg, 0, -3.3, 0.1, 2.6, 0.6, 2.8, brass); K.box(leg, 0, -4, 0.2, 2.6, 1.2, 2.8, hoof); }
  for (const s of rig.tail) dropAll(rig, s);
  K.box(rig.tailTip, 0, 0, -1, 0.7, 0.7, 2.4, furD); K.box(rig.tailTip, 0, -0.4, -2.4, 1.2, 1.6, 1, furL);
  K.done();
  noShadow(rig, M, rig.tailTip, ...rig.legs);
  return finish(rig, 'boarlet');
}

// ---- crab and king crab --------------------------------------------------------------
// (vox-ow-fodder, bottom left; vox-ow-fodder-2, bottom right) A shore crab
// a little wider than a hero is tall: a domed red shell with an orange rim,
// crusted with white barnacles and hung with green weed, a cream face, two
// eyes on stalks with glowing orange tips, two big orange claws with cream
// teeth held out in front (the lower fingers are the rig's jaw: the bite
// snaps them), and eight jointed legs. It scuttles sideways and turns to
// face you to pinch. The king crab is twice as wide and twice a hero's
// height with its claw up: a shell of rock and barnacles hung thick with weed,
// one enormous crusher claw raised high and one small one.
function buildCrab(K0, king = false) {
  const red = king ? 0xb83a1e : 0xd04020, redD = king ? 0x6a1a0c : 0x8a1e10, redL = king ? 0xe0602a : 0xf06a30, rimC = 0xf09a3a, cream = 0xf0d8b0, claw = 0xf06a30, clawD = 0xc0401c;
  const tip = 0x2a1410, barn = 0xf0ece0, barnD = 0x8a8478, weed = 0x2a8a4a, weedD = 0x1a5a2a, rock = [0x8a8478, 0x6a645a, 0x9a9488], eyeT = 0xffa020;
  const mat = skinMat('crab', flatQuad(0xd04020, 0x8a1e10, 0xf0d8b0, 0x0a0a0a), { rough: 0.45, emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: king ? 2.6 : 1.4, bodyL: 8, bodyW: 12, bodyH: 5, legH: 5, legW: 1.4, headS: 4, legs: 8, splay: 0.01, snout: false, neckUp: -1.6, headZ: -0.4, gait: king ? 1.3 : 2.4, ears: false, jawOpen: 0.15 });
  const K = K0.kit(rig, mat, { seed: king ? 149 : 109, rough: 0.45, emit: 0.85 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth;
  dropAll(rig, T); dropAll(rig, Hd);
  // the shell: a wide dome with an orange rim, a cream face below the front edge
  K.box(T, 0, 0, 0, 12, 4.4, 8, red); K.box(T, 0, 2.6, -0.2, 10, 1.6, 7, redD); K.box(T, 0, 3.6, -0.4, 7, 1, 5, red);
  K.box(T, 0, 0.6, 0, 12.8, 0.9, 8.6, rimC);
  for (let i = 0; i < 8; i++) K.box(T, -5 + i * 1.45, 1.4, 4.2, 1.2, 0.8, 0.5, i % 2 ? rimC : 0xffc060);
  K.box(T, 0, -1.2, 4.1, 6, 2.6, 0.6, cream); K.box(T, 0, -1.6, 4.45, 3, 0.6, 0.3, tip);
  for (let i = 0; i < 6; i++) { const x = -4 + i * 1.6; K.box(T, x, -3.2 - (i % 2), 3.4, 0.8, 2.4 + (i % 3), 0.5, i % 2 ? weed : weedD); }
  if (king) {
    for (let i = 0; i < 12; i++) { const x = -4.4 + (i % 4) * 2.9, z = -2.6 + Math.floor(i / 4) * 2.4 + (K.r() - 0.5); K.box(T, x, 3.6 + K.r() * 0.8, z, 2.2 + K.r(), 1.6 + K.r(), 2.2 + K.r(), K.tone(rock, 0.1)); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, L = 3 + K.r() * 4; K.box(T, Math.sin(a) * 6.2, -0.6 - L / 2, Math.cos(a) * 4.2, 0.9, L, 0.6, i % 2 ? weed : weedD); }
  }
  for (const [x, z, s] of king ? [[-3, 1.4, 1.6], [2.4, 2.2, 1.4], [4.6, -0.6, 1.2], [-1.4, -2.4, 1.3], [0.6, 0.6, 1.1]] : [[-3.2, 1.6, 1.3], [-1.4, 2.6, 1.1], [2.8, 1.8, 1.2], [4.2, -0.4, 1], [-4.2, -1.4, 1.1], [0.8, -2.2, 1], [1.2, 3, 0.9]]) {
    K.box(T, x, 3.4 + (king ? 1.6 : 0) + s * 0.4, z, s, s, s, barn); K.box(T, x, 3.5 + (king ? 1.6 : 0) + s * 0.9, z, s * 0.45, 0.2, s * 0.45, barnD);
  }
  // eyes on stalks with glowing tips
  for (const sx of [-1, 1]) { K.box(T, sx * 1.4, 4.4, 3.2, 0.8, 3.6, 0.8, redD); K.box(T, sx * 1.4, 6.6, 3.2, 1.3, 1.3, 1.3, tip); K.box(T, sx * 1.4, 6.8, 3.5, 1, 1, 1, eyeT); }
  // the claws, held out in front: an arm, a fat palm and a fixed upper finger;
  // the jaw carries the lower fingers
  M.position.set(0, -1.4 * PX, 4.2 * PX);
  for (const sx of [-1, 1]) {
    const big = !king || sx < 0, k = king ? (big ? 1.9 : 0.7) : 1.3;
    if (king && big) {
      // the crusher: raised high on a long arm
      // the crusher: raised high on a jointed arm, a fat palm, a long curved upper finger
      K.box(Hd, sx * 4.8, 2.4, 1, 2.4, 6, 2.4, clawD, -0.35, 0, sx * -0.2); K.box(Hd, sx * 5.4, 5.6, 2.4, 3, 3, 3, rimC);
      K.box(Hd, sx * 5.6, 8.8, 4.6, 5.6, 6.4, 7.6, claw, -0.5); K.box(Hd, sx * 5.6, 10.6, 3.6, 4.6, 1, 5.6, redL, -0.5);
      for (const [y, z] of [[7.4, 3], [10.4, 5.6], [8, 7.6]]) K.box(Hd, sx * 8.5, y, z, 1.3, 1.3, 1.3, barn);
      const up = group(Hd, sx * 5.6, 12.4, 8, -0.9);
      K.box(up, 0, 0, 2.4, 4, 3, 5.6, claw); K.box(up, 0, -0.6, 5.6, 3, 2.4, 2.6, claw, 0.45); K.box(up, 0, -1.8, 7.2, 2, 1.8, 1.8, tip, 0.9);
      for (const z of [1.6, 3.4, 5]) K.box(up, 0, -1.6, z, 1.2, 1, 0.8, cream);
      const lo = group(Hd, sx * 5.6, 7.4, 9.2, -0.2); K.box(lo, 0, 0, 2.2, 3.2, 2.4, 4.8, clawD); K.box(lo, 0, 0.8, 4.8, 2, 1.6, 1.8, tip, -0.5); K.box(lo, 0, 1.3, 1.8, 1, 0.8, 0.8, cream);
      rig.extras.crusher = lo; continue;
    }
    K.box(Hd, sx * 4.4, 0, 0.4, 2 * k, 2 * k, 3.6 * k, clawD, 0, sx * -0.3, 0);
    K.box(Hd, sx * 5.2, 0.4 * k, 3.4 * k, 4 * k, 4.4 * k, 5 * k, claw); K.box(Hd, sx * 5.2, 2.6 * k, 3.4 * k, 3.4 * k, 0.8, 4.4 * k, redL);
    K.box(Hd, sx * 5.2, 1.6 * k, 7.2 * k, 3 * k, 1.6 * k, 3.6 * k, claw, -0.15); K.box(Hd, sx * 5.2, 1.2 * k, 9.2 * k, 2 * k, 1.2 * k, 1.4 * k, cream, -0.15);
    for (const z of [6.2, 7.6]) K.box(Hd, sx * 5.2, 0.7 * k, z * k, 0.8 * k, 0.6 * k, 0.6 * k, cream);
    K.box(Hd, sx * (5.2 + 2 * k), 1 * k, 3 * k, 1 * k, 1 * k, 1 * k, barn);
    K.box(M, sx * 5.2, -0.8 * k, 4.6 * k, 2.6 * k, 1.4 * k, 4.4 * k, clawD); K.box(M, sx * 5.2, -0.4 * k, 7 * k, 1.6 * k, 1 * k, 1.4 * k, cream);
  }
  // eight legs at the sides: up and out to a knee, then down to a pointed tip
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    const s = leg.userData.side, row = leg.userData.row, L = rig.dims.legH;
    leg.rotation.y = -s * (0.7 - row * 0.45);
    K.box(leg, s * 2.2, 1.4, 0, 4.6, 1.2, 1.2, row % 2 ? red : redD, 0, 0, s * 0.4);
    K.box(leg, s * 4.6, 2.6, 0, 1.4, 1.4, 1.4, rimC);
    K.box(leg, s * 5.4, (2.6 - L) / 2, 0, 1.3, L + 2.6, 1.3, red, 0, 0, s * -0.18);
    K.box(leg, s * 6.1, -L + 0.4, 0, 0.6, 1.4, 0.6, 0xe8a020, 0, 0, s * -0.18);
  }
  K.done();
  noShadow(rig, M, ...rig.legs);
  rig.sideways = !king;
  return finish(rig, king ? 'king_crab' : 'crab');
}

// ---- basilisk ----------------------------------------------------------------------
// (vox-ow-fodder-3, top left) A crowned serpent-lizard about a hero's chest
// height: deep green and teal scales, a cream belly, a crown of gold spikes
// fanning back from its head and gold spines down its back, glowing yellow
// eyes, fanged jaws, gold claws, and a long tail that curls up over its back.
// Quick on its feet; it spits venom.
function buildBasilisk(K0) {
  const grn = 0x1e7a4a, grnD = 0x124a2e, teal = 0x2a8a6a, belly = 0xe8d8a0, gold = 0xf0b020, goldD = 0xb87a10, eye = 0xffe020;
  const SC = [grn, grnD, teal];
  const mat = skinMat('basilisk', flatQuad(grn, grnD, belly, eye), { rough: 0.5, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.95, bodyL: 8, bodyW: 5, bodyH: 4.4, legH: 3.8, legW: 1.8, headS: 5, splay: 0.6, snout: false, neckUp: 4.2, headZ: 1, gait: 2, ears: false, tail: 6, tailLen: 18, tailW: 3, tailCurl: 0.55, jawOpen: 0.25 });
  const K = K0.kit(rig, mat, { seed: 151, rough: 0.5, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 5;
  dropAll(rig, T); dropAll(rig, Hd);
  // body: a deep chest rising to the neck, a cream belly, banded scales, gold spines
  K.box(T, 0, 0, 0, 5, 4.4, 8, grn); K.box(T, 0, 1.6, 3.4, 4.4, 5, 3, grn, -0.4); K.box(T, 0, -1.2, 1, 3.6, 2.4, 8.4, belly);
  K.box(T, 0, 1.4, 4.6, 2.6, 4, 1, belly, -0.4);
  for (let z = -3; z <= 2; z += 1.6) K.box(T, 0, 0.6, z, 5.3, 3, 0.6, grnD);
  for (let i = 0; i < 6; i++) { const z = 4 - i * 1.6, h = 3 - i * 0.25; K.box(T, 0, 2.4 + h / 2, z, 0.7, h, 1.1, i % 2 ? goldD : gold, -0.5); }
  // head: a long wedge, a crown of gold spikes fanning back, glowing eyes, fangs
  const hz = hs * 0.35;
  K.box(Hd, 0, 0.2, hz + 0.6, hs, hs * 0.8, hs + 1.4, grn); K.box(Hd, 0, -0.2, hz + hs / 2 + 1.8, hs - 1, hs * 0.5, 2.4, teal);
  for (const sx of [-1, 1]) { K.box(Hd, sx * (hs / 2 + 0.05), 1, hz + 1.6, 0.3, 1.2, 1.6, eye); K.box(Hd, sx * (hs / 2 + 0.15), 1.1, hz + 1.9, 0.2, 0.6, 0.5, 0xfffff0); K.box(Hd, sx * (hs / 2 - 0.2), 1.9, hz + 1.6, 1, 0.5, 2, grnD); }
  for (let i = 0; i < 9; i++) { const a = (i - 4) * 0.3, L = 5 - Math.abs(i - 4) * 0.35; K.box(Hd, Math.sin(a) * 2.2, hs * 0.4 + 0.6 + Math.cos(a) * L / 2, hz - 1.4, 0.8, L, 0.8, i % 2 ? goldD : gold, -0.6, 0, -a); }
  for (const sx of [-1, 1]) K.box(Hd, sx * (hs / 2 + 0.8), 0.2, hz - 1, 0.5, 2, 3, gold, 0, sx * 0.6, 0);
  K.box(M, 0, -0.5, 2, hs - 1.2, 0.8, 3.6, belly); for (const sx of [-1, 1]) K.box(M, sx * 1.2, 0.4, 3.2, 0.4, 1, 0.4, 0xfff8e0); K.box(M, 0, 0, 1.6, 1.6, 0.3, 2.2, 0xc83a3a);
  // legs: scaly thighs, gold claws
  for (const leg of rig.legs) { dropAll(rig, leg); K.box(leg, 0, -1.4, 0, 2.4, 3.4, 2.4, grnD); for (const dx of [-0.7, 0, 0.7]) K.box(leg, dx, -3.2, 1, 0.5, 0.6, 1.8, gold); }
  // the tail: tapering scaled segments with gold spines, curling up over the back
  for (const [i, seg] of rig.tail.entries()) {
    dropAll(rig, seg);
    const w = 3 * (1 - i * 0.12), l = 3;
    K.box(seg, 0, 0, -l / 2, w, w, l + 0.2, SC[i % 3]); K.box(seg, 0, -w / 2 + 0.3, -l / 2, w * 0.7, 0.5, l, belly);
    K.box(seg, 0, w / 2 + 0.7, -l / 2, 0.7, 2, 1, gold, -0.4);
  }
  K.box(rig.tailTip, 0, 0.8, -3.6, 0.8, 2, 1, gold, -0.6);
  K.done();
  noShadow(rig, M, ...rig.legs, ...rig.tail);
  return finish(rig, 'basilisk');
}

// ---- Earthborn ---------------------------------------------------------------------------
// (vox-ow-fodder-3, top right) A hulking six-armed giant of earth and stone,
// twice a hero's height: blocky brown stone in lumps and slabs mottled with
// green moss, glowing orange eyes under a heavy brow, a leather belt, and six
// arms with huge block fists, the top pair raised; it hurls balls of mud.
function buildEarthborn(K0) {
  const st = 0x8a6a4a, stD = 0x5e4630, stL = 0xa8865e, moss = 0x6a7a2a, mossL = 0x8a9a3a, glow = 0xffa030, lea = 0x4a3020, brz = 0xc08a2c;
  const STONE = [st, stD, stL, 0x7a5a3c];
  const mat = skinMat('earthborn', (S) => paintPerson(S, { skin: st, eye: 0x2a1408, eyeWhite: 0x2a1408, brow: stD, mouth: false, top: st, sleeve: st, hand: stD, pants: stD, shoes: false,
    face: (s, ey) => { s.rect(8, ey - 2, 8, 2, stD, 0.1); for (const x of [9, 13]) s.rect(x, ey, 2, 1.5, glow, 0); s.rect(9, ey + 3, 6, 1.5, 0x2a1408, 0); for (const x of [9.5, 11.5, 13.5]) s.dot(x, ey + 3, 0xe8dcc0, 1, 1); },
    body: (s) => { for (let i = 0; i < 60; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, STONE[i % 4], 2, 2); } }), { emit: 1.2 });
  const rig = new Rig({ material: mat, scale: 1.85, legH: 9, bodyH: 13, bodyW: 12, bodyD: 7, armW: 4.4, headS: 7, jacket: false });
  const K = K0.kit(rig, mat, { seed: 157, rough: 0.95, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H7 = 8 * HS * 7 / 8;
  dropOne(rig, hatOf(rig));
  // slabs of stone over the body, moss, a hunched back, a belt
  K.clumps(T, [0, 7, 0], [12, 12, 7], { n: 28, size: [2.2, 3.6], cols: STONE, faces: 'tfklr', out: -0.25 });
  K.clumps(T, [0, 9, 0], [12, 8, 7], { n: 10, size: [1.4, 2.4], cols: [moss, mossL], faces: 'tfk', out: -0.1 });
  K.box(T, 0, 11, -2.8, 10, 5, 4, stD);
  for (const sx of [-1, 1]) { K.box(T, sx * 6.8, 12, 0, 4.4, 3.6, 5.4, stL); K.box(T, sx * 6.8, 14, 0, 3, 1, 3.6, moss); }
  K.box(T, 0, 1.6, 0, 12.6, 1.8, 7.6, lea); K.box(T, 0, 1.6, 3.9, 2.2, 2.2, 0.5, brz);
  // the two lower pairs of arms: stone arms with block fists, swinging
  for (const [y, z, sx, ph, rz] of [[8.6, 1.6, -1, 0, 1.15], [8.6, 1.6, 1, 2, 1.15], [4.6, 1, -1, 1, 0.7], [4.6, 1, 1, 3, 0.7]]) {
    const a = group(T, sx * 6.6, y, z, 0, 0, sx * rz);
    K.box(a, 0, -3.4, 0, 3.8, 7.4, 3.8, K.tone(STONE, 0.1)); K.box(a, 0, -8, 0.4, 5, 4.4, 5, stD); K.box(a, 0, -6.4, 0.4, 5.2, 0.8, 5.2, stL);
    K.box(a, sx * 1.9, -2.4, 0.6, 0.4, 2.4, 2, moss);
    sway(rig, a, 'x', 0.4, 2.2, ph);
  }
  // the top pair (the rig's own arms): stone with mossy shoulders, huge fists
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -3.6, 0, 4.8, 10, 4.8, st); K.box(arm, 0, -10.2, 0.4, 6, 5, 6, stD); K.box(arm, 0, -8, 0.4, 6.2, 0.8, 6.2, stL);
    K.clumps(arm, [0, -3, 0], [4.8, 8, 4.8], { n: 5, size: [1.6, 2.4], cols: [moss, stL, st], out: -0.3 });
  }
  // stumpy stone legs
  for (const leg of [rig.legR, rig.legL]) { dropAll(rig, leg); K.box(leg, 0, -4.4, 0, 5.6, 9, 5.6, stD); K.box(leg, 0, -2, 0, 6, 1.2, 6, st); K.box(leg, 0, -8.6, 1, 6.4, 1.6, 7.4, stD); }
  rig.legR.position.x = -3.2 * PX; rig.legL.position.x = 3.2 * PX;
  // head: a lumpy stone head with a heavy brow and moss on top
  K.box(Hd, 0, H7 * 0.66, H7 / 2 + 0.6, H7 + 1, 1.6, 1.6, stD);
  K.clumps(Hd, [0, H7, -0.4], [H7, 1, H7], { n: 6, size: [1.6, 2.4], cols: [moss, mossL, stL], faces: 't', out: -0.4 });
  K.done();
  noShadow(rig, Hd);
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
  const brz = 0xc8902e, brzD = 0x6a4618, brzL = 0xf0c048, steel = 0x5a5a64, steelD = 0x2e2e36, blue = 0x5ad8ff, blueL = 0xd0f8ff, FEATH = [brz, brzD, brzL, 0x8a6a3a, steel];
  const mat = skinMat('daedalus_drone', (S) => paintPerson(S, { skin: brz, eye: blue, eyeWhite: blue, brow: brzD, mouth: false, top: brz, sleeve: brz, hand: brz, pants: brzD, shoes: false }), { rough: 0.35, emit: 1 });
  const rig = new Rig({ material: mat, scale: 1.25, legH: 7, bodyH: 11, bodyW: 9, bodyD: 7, armW: 2, headS: 7, jacket: false });
  const K = K0.kit(rig, mat, { seed: 163, rough: 0.35, metal: 0.3, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H7 = 8 * HS * 7 / 8;
  dropAll(rig, T); dropAll(rig, Hd); dropAll(rig, rig.armR); dropAll(rig, rig.armL);
  // the body: a barrel of bronze plates, a steel-ringed blue core in the breast
  K.box(T, 0, 5.5, 0, 8.4, 11, 6.6, brz); K.box(T, 0, 5.5, 0, 9.2, 8, 5.6, brzD); K.box(T, 0, 9.6, 0.4, 7, 2.4, 7, brzL);
  for (let y = 1.6; y < 10; y += 2.2) K.box(T, 0, y, 3.35, 7, 0.5, 0.3, brzD);
  K.box(T, 0, 6, 3.5, 5, 5, 0.6, steel); K.box(T, 0, 6, 3.8, 3.6, 3.6, 0.5, steelD); K.box(T, 0, 6, 4, 2.8, 2.8, 0.5, blue); K.box(T, 0, 6, 4.2, 1.2, 1.2, 0.4, blueL);
  for (const sx of [-1, 1]) { K.box(T, sx * 3.6, 2, 3.4, 1.4, 1.4, 0.6, steelD); K.box(T, sx * 3.6, 2, 3.6, 0.8, 0.8, 0.4, blue); }
  // tail: a fan of bronze plates
  for (let i = -2; i <= 2; i++) K.box(T, i * 1.4, 0.4, -4.6, 1.3, 0.6, 6, i % 2 ? brzD : brzL, 0.5, i * 0.2, 0);
  // head: a crested eagle head, blue lens eyes, a hooked gold beak
  K.box(Hd, 0, H7 / 2, 0.2, H7, H7, H7, brz); K.box(Hd, 0, H7 * 0.66, H7 / 2 + 0.2, H7 + 0.6, 1.2, 0.8, brzD);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.8, H7 * 0.5, H7 / 2 + 0.6, 1.8, 1.4, 0.4, steelD); K.box(Hd, sx * 1.8, H7 * 0.5, H7 / 2 + 0.8, 1.2, 0.9, 0.3, blue); }
  K.box(Hd, 0, H7 * 0.3, H7 / 2 + 1.6, 2.4, 2.2, 2.6, brzL); K.box(Hd, 0, H7 * 0.12, H7 / 2 + 3, 1.6, 2.4, 1.4, brzL, 0.4); K.box(Hd, 0, -0.8, H7 / 2 + 3.4, 1, 1.2, 0.8, brzD);
  for (let i = 0; i < 4; i++) K.box(Hd, (i - 1.5) * 1.2, H7 + 1 + (1.5 - Math.abs(i - 1.5)) * 0.6, -0.6, 0.8, 2.6, 1.6, i % 2 ? brzL : brz, -0.3, 0, (i - 1.5) * -0.25);
  rig.extras.muzzle = group(T, 0, 6, 5);
  // legs: steel shanks, gold talons
  for (const leg of [rig.legR, rig.legL]) { dropAll(rig, leg); K.box(leg, 0, -2, 0, 2.2, 4, 2.2, brzD); K.box(leg, 0, -5, 0, 1.2, 3, 1.2, steel); for (const [dz, rx] of [[1.2, 0.5], [-0.8, -0.5]]) for (const dx of [-0.8, 0.8]) K.box(leg, dx, -6.6, dz, 0.6, 0.6, 2.4, brzL, rx); }
  // wings: raised and spread, feather plates fanned off a jointed bone
  const W = [];
  for (const side of [-1, 1]) {
    const root = group(T, side * 3.6, 9.6, -1.6, 0, 0, side * -0.35), elbow = group(root, side * 9, 0, 0, 0, 0, side * -0.25), X = (v) => side * v;
    K.box(root, X(4.5), 0, 0, 9, 1.8, 1.8, brzD); K.box(root, X(9), 0, 0, 2.4, 2.4, 2.4, steel); K.box(root, X(9), 0, 0.6, 1.2, 1.2, 1.4, steelD);
    for (let i = 0; i < 6; i++) { const L = 9 + i * 0.8; K.box(root, X(1.4 + i * 1.4), -L / 2, -0.2, 1.5, L, 0.6, K.tone(FEATH, 0.1)); }
    K.box(elbow, X(4), 0.4, 0, 8, 1.4, 1.4, brzD);
    for (let i = 0; i < 8; i++) { const a = 1.2 - i * 0.2, L = 14 - i * 0.7, ux = Math.cos(a), uy = Math.sin(a); K.box(elbow, X(2 + i * 0.9 + ux * L / 2), uy * L / 2 - 1, -0.2 - i * 0.05, L, 1.5, 0.6, K.tone(FEATH, 0.1), 0, 0, side * a); }
    W.push({ root, elbow, side });
  }
  rig.extras.wings = W; rig.wingFlap = 2.2;
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
function buildLaistrygonian(K0) {
  const skin = 0xd8a070, skinD = 0xb07a4e, tat = 0x4a5a7a, hair = 0x1a1410, furC = [0x6a4428, 0x4a2e1a, 0x8a5a34, 0x3a2414], bone = 0xece0c8, lea = 0x5a3a20, leaD = 0x3a2414, fire = [0xff6a10, 0xffa020, 0xffe060], ballC = 0x4a2a14;
  const spiral = (s, cx, cy, r) => { for (let k = r; k > 0; k -= 2) { s.rect(cx - k, cy - k, k * 2, 0.6, tat, 0); s.rect(cx - k, cy + k - 0.6, k * 2, 0.6, tat, 0); s.rect(cx - k, cy - k, 0.6, k * 2, tat, 0); s.rect(cx + k - 0.6, cy - k, 0.6, k * 2 - 1, tat, 0); } };
  const mat = skinMat('laistrygonian', (S) => paintPerson(S, { skin, hair, fringe: 2, hairSide: 3, hairBack: 8, eye: 0x1a0a00, eyeWhite: 0xf0e0c0, scowl: true, brow: hair, beard: hair, mouth: false, top: skin, sleeve: skin, hand: skin, shortSleeve: true, pants: lea, shoes: false,
    face: (s, ey) => { s.rect(9, ey + 2, 6, 1, 0x6a1a10, 0); s.dot(9.5, ey + 2, 0xf8f0e0, 1, 1); s.dot(13.5, ey + 2, 0xf8f0e0, 1, 1); },
    body: (s) => { spiral(s, 22, 25, 3); spiral(s, 30, 25, 3); spiral(s, 34, 26, 2); for (const [x, y] of [[42, 22], [34, 52], [50, 52], [6, 22]]) spiral(s, x, y, 2); } }), { emit: 1 });
  const rig = new Rig({ material: mat, scale: 2.15, legH: 12, bodyH: 13, bodyW: 11, bodyD: 6.4, armW: 4.4, headS: 8, jacket: false });
  const K = K0.kit(rig, mat, { seed: 167, rough: 0.85, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropOne(rig, hatOf(rig));
  // the belt with a skull buckle and a shaggy fur kilt
  K.box(T, 0, 0.8, 0, 11.8, 1.8, 7.2, lea);
  K.box(T, 0, 0.8, 3.8, 2.8, 2.8, 1.4, bone); for (const sx of [-1, 1]) K.box(T, sx * 0.6, 1.2, 4.55, 0.8, 0.8, 0.2, 0x1a1410); K.box(T, 0, -0.1, 4.55, 1.4, 0.4, 0.2, 0x1a1410);
  for (const x of [-4.4, 4.4]) K.box(T, x, 0.4, 3.7, 1.6, 1.6, 1, bone);
  K.box(T, 0, 8, 3.3, 1, 12, 0.5, leaD, 0, 0, 0.6);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.flare(rig.hips, Math.sin(a) * 5.4, -2.6, Math.cos(a) * 3.2, 3, 6, 0.9, K.tone(furC, 0.1), a, 0.15); }
  // head: wild hair, a big black beard, a heavy brow
  K.clumps(Hd, [0, H8 * 0.6, -0.6], [H8 + 0.4, H8 * 0.7, H8], { n: 10, size: [1.6, 2.4], cols: [hair, 0x2a2018], faces: 'lrk', out: -0.3 });
  K.box(Hd, 0, H8 * 0.62, H8 / 2 + 0.3, H8, 1, 0.8, hair);
  K.box(Hd, 0, 0.8, H8 / 2 + 0.4, H8 - 1, 2, 1, hair); for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 - 0.2), 2.2, H8 / 2 - 0.6, 1.2, 4.4, 2, hair);
  K.box(Hd, 0, -1.6, H8 / 2 - 0.2, 7, 3.4, 2.6, hair); K.box(Hd, 0, -3.8, H8 / 2 - 0.6, 4.4, 2.4, 2.2, 0x2a2018);
  // bracers, a shoulder strap of fur, shin wraps, bare feet
  for (const arm of [rig.armR, rig.armL]) { K.box(arm, 0, -7.6, 0, 5, 3.6, 5, lea); K.box(arm, 0, -6, 0, 5.2, 0.6, 5.2, leaD); }
  K.box(T, -3.6, 12.6, 0, 4.4, 1.8, 7, furC[0]);
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 0, -8.4, 0, 5, 5, 5, lea); K.box(leg, 0, -6, 0, 5.4, 1.4, 5.4, furC[1]); K.box(leg, 0, -11.6, 0.6, 4.6, 1, 5.6, skinD); }
  // the flaming ball in the right hand
  const ball = group(rig.handR, 0, -3.4, 0.6, 2.7);   // (turned so its flames stream up while the arm holds it high)
  K.box(ball, 0, 0, 0, 5.4, 5.4, 5.4, ballC); K.box(ball, 0, 0, 0, 6.4, 4, 4, ballC); K.box(ball, 0, 0, 0, 4, 6.4, 4, ballC); K.box(ball, 0, 0, 0, 4, 4, 6.4, ballC);
  K.cracks(ball, [0, 0, 0], [6.4, 6.4, 6.4], { n: 8, len: [2, 4], cols: [fire[0], fire[1]], faces: 'tfklr', cell: 0.8 });
  for (let i = 0; i < 12; i++) { const a = K.r() * Math.PI * 2, t = K.r(), r = 2.6 * (1 - t * 0.6); K.box(ball, Math.cos(a) * r, 2.6 + t * 4.6, Math.sin(a) * r, 2 - t * 1.3, 2.4 - t * 1.3, 2 - t * 1.3, fire[Math.min(2, Math.floor(t * 3))]); }
  rig.extras.ball = ball;
  K.done();
  noShadow(rig, Hd);
  rig.held = [-2.7, 0];
  return finish(rig, 'laistrygonian');
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
  }, { emit: 2, fill: 0.4, dissolve: 0.18 });
  const rig = new Rig({ material: mat, scale: 1.05, armW: 2.6, bodyW: 8, bodyH: 13, jacket: false });
  const K = K0.kit(rig, mat, { seed: 113, fill: 0.4, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // the robe: a body of tatters hanging in long strips to cyan motes
  K.box(T, 0, 6.5, 0, 8.4, 13, 4.6, SH[0]); K.box(T, 0, 12, 0, 10, 2, 5.6, SH[1]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, L = 8 + K.r() * 6; K.flare(T, Math.sin(a) * 4, -L / 2 + 1.6, Math.cos(a) * 2.4, 2.2, L, 0.6, K.tone(SH, 0.15), a, 0.14); }
  for (let i = 0; i < 10; i++) { const a = K.r() * Math.PI * 2, r = 3 + K.r() * 2.6; K.box(T, Math.sin(a) * r, -6 - K.r() * 6, Math.cos(a) * r * 0.7, 0.9, 0.9, 0.9, i % 3 ? cyan : cyanL); }
  // the pointed hood round the dark face
  K.box(Hd, 0, H8 + 0.6, -0.4, H8 + 1.4, 1.4, H8 + 0.8, SH[2]);
  for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 + 0.6), H8 / 2, -0.2, 1.2, H8 + 1.6, H8 + 1.2, SH[1]);
  K.box(Hd, 0, H8 / 2, -H8 / 2 - 0.8, H8 + 2.4, H8 + 1.6, 1.2, SH[2]);
  for (const [y, w, z] of [[H8 + 1.8, H8 - 1, -1.4], [H8 + 3, H8 - 3.4, -2.6], [H8 + 4, 2.4, -3.8]]) K.box(Hd, 0, y, z, w, 1.4, w, SH[2], -0.35);
  for (let x = -H8 / 2; x <= H8 / 2; x += 1.3) K.box(Hd, x, H8 - 0.2, H8 / 2 + 0.6, 1.4, 1.6 + K.r(), 1, K.tone(SH, 0.12));
  // ragged sleeves and bony white hands with long fingers
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -3.4, 0, 3.4, 8.4, 3.4, SH[2]);
    for (let i = 0; i < 3; i++) K.box(arm, -1 + i, -8.2 - K.r() * 1.6, -0.6, 1.2, 3 + K.r() * 2, 2.4, K.tone(SH, 0.12));
    K.box(arm, 0, -9.4, 0.6, 1, 2.4, 1, bone); K.box(arm, 0, -10.8, 0.6, 2, 1, 1.6, boneD);
    for (const dx of [-0.75, -0.25, 0.25, 0.75]) K.box(arm, dx, -12.6, 1, 0.35, 2.8, 0.35, bone, 0.3, 0, dx * -0.3);
  }
  // wisps trailing from the hem, one swaying group
  const w = group(rig.hips, 0, -7, -0.6);
  for (let i = 0; i < 4; i++) { const x = -2.4 + i * 1.6; for (let k = 0; k < 3; k++) K.box(w, x + (K.r() - 0.5) * 0.6, -1.4 - k * 2 - (i % 2), 0, 2 - k * 0.5, 2.2, 2 - k * 0.5, k === 2 ? cyan : K.tone(SH, 0.12)); }
  sway(rig, w, 'x', 0.3, 2.4);
  K.done();
  noShadow(rig, rig.armR, rig.armL, w);
  rig.float = 0.35; rig.hunch = 0.3;
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
    face: (s, ey) => { for (const x of [9, 13]) { s.rect(x, ey - 1, 2, 2, 0x2a0408, 0); s.rect(x + 0.5, ey - 0.5, 1, 1, red, 0); } s.rect(11, ey + 1.5, 2, 1, 0x6a5a5a, 0); s.rect(9.5, ey + 3, 5, 1.5, 0x2a0408, 0); for (let x = 9.5; x < 14.5; x += 1) s.dot(x, ey + 3, 0xfff8f0, 0.6, 1); } }), { emit: 1.6 });
  const rig = new Rig({ material: mat, scale: 0.95, armW: 2.6, bodyW: 7, jacket: false });
  const K = K0.kit(rig, mat, { seed: 173, rough: 0.9, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // a ragged black dress hanging in long strips, a red sash, bone at the collar
  K.box(T, 0, 6, 0, 6.6, 12, 3.6, blk); K.box(T, 0, 4, 0, 7, 1, 4, redD); K.box(T, 0, 11, 1.85, 3, 1.2, 0.3, pale);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, L = 9 + K.r() * 8; K.flare(T, Math.sin(a) * 3.4, -L / 2 + 2, Math.cos(a) * 2, 1.6, L, 0.5, K.tone(RAG, 0.12), a, 0.18); }
  // the mane of wild white hair
  K.clumps(Hd, [0, H8 * 0.7, -0.8], [H8 + 2, H8 * 0.8, H8 + 1], { n: 24, size: [1.6, 2.6], cols: hairC, faces: 'tlrk', out: 0.1 });
  for (let i = 0; i < 8; i++) K.box(Hd, -4 + i * 1.15, H8 * 0.3 - (i % 3), -H8 / 2 - 1.2, 1.4, 4 + K.r() * 4, 1.4, K.tone(hairC, 0.08), 0.3, 0, (i - 3.5) * 0.12);
  for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 + 1), H8 * 0.35, 0.4, 1.4, 5, 2.6, K.tone(hairC, 0.08), 0, 0, sx * 0.2);
  for (const sx of [-1, 1]) K.box(Hd, sx * 1.9 * HS, 4.4 * HS, 4 * HS + 0.2, 1.2, 1.1, 0.3, red);
  // long bony arms in black sleeves, long glowing red talons
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -2.4, 0, 2.8, 5, 2.8, blk); K.box(arm, 0, -7, 0, 1.6, 6, 1.6, pale); K.box(arm, 0, -4.6, 0, 3.2, 1.4, 3.2, K.tone(RAG, 0.1));
    for (const dx of [-0.9, -0.3, 0.3, 0.9]) { K.box(arm, dx, -11.2, 0.6, 0.5, 3.6, 0.5, redD, 0.25, 0, dx * -0.2); K.box(arm, dx * 1.1, -13.6, 1.6, 0.4, 2.2, 0.4, red, 0.7, 0, dx * -0.2); }
  }
  rig.extras.claws = [rig.handR, rig.handL];
  // great bat wings, black membrane veined in red, ragged at the edge
  const W = [];
  for (const side of [-1, 1]) {
    const root = group(T, side * 2, 10.4, -2, 0, 0, side * -0.5), elbow = group(root, side * 10, 0, 0, 0, 0, side * -0.4), X = (v) => side * v;
    K.box(root, X(5), 0, 0, 10, 1.4, 1.4, blkL); K.box(root, X(5), -3, -0.2, 10, 5, 0.5, blk); K.box(root, X(5), -1.6, 0.1, 9, 0.4, 0.4, red);
    for (let i = 0; i < 5; i++) { const h = 5 + K.r() * 5; K.box(root, X(1 + i * 2), -5 - h / 2, -0.2, 1.6, h, 0.4, K.tone(RAG, 0.1)); }
    K.box(elbow, 0, 0, 0, 2, 2, 2, blkL);
    for (let i = 0; i < 9; i++) {
      const a = 1.35 - i * 0.24, L = 15 - Math.abs(i - 3) * 0.9 + K.r() * 2, ux = Math.cos(a), uy = Math.sin(a);
      K.box(elbow, X(ux * L / 2), uy * L / 2, -0.1 - i * 0.04, L, 1.8, 0.45, K.tone(RAG, 0.12), 0, 0, side * a);
      if (i % 2 === 0) K.box(elbow, X(ux * L * 0.4), uy * L * 0.4, 0.15, L * 0.6, 0.35, 0.3, i % 4 ? redD : red, 0, 0, side * a);
    }
    W.push({ root, elbow, side });
  }
  rig.extras.wings = W; rig.wingFlap = 1.4;
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
    king_crab: () => buildCrab(K0, true),
    basilisk: () => buildBasilisk(K0),
    earthborn: () => buildEarthborn(K0),
    daedalus_drone: () => buildDrone(K0),
    laistrygonian: () => buildLaistrygonian(K0),
    shade: () => buildShade(K0),
    keres: () => buildKeres(K0),
  };
}
