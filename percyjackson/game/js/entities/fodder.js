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
  karpos: { name: txt('monsters.karpos.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 5.4, dmg: 4, radius: 0.36, height: 0.95, ai: 'melee', range: 1.2, windup: 0.35, cd: 1.1, xp: 2, coins: [0, 2], model: 'karpos', pitch: 1.6, voice: 'rustle', knockResist: 0 },
  karpos_slinger: { name: txt('monsters.karpos_slinger.name'), tier: 'minor', role: 'ranged', hp: 12, speed: 4.2, dmg: 4, radius: 0.36, height: 1.05, ai: 'ranged', range: 11, keep: 7, windup: 0.6, cd: 2.4, xp: 2, coins: [0, 2], model: 'karpos_slinger', pitch: 1.4, voice: 'rustle', projectile: 'feather', knockResist: 0 },
  colchis_calf: { name: txt('monsters.colchis_calf.name'), tier: 'minor', role: 'bruiser', hp: 55, speed: 4.4, dmg: 10, radius: 0.7, height: 1.3, ai: 'melee', range: 3.2, windup: 0.75, cd: 2.2, xp: 5, coins: [2, 4], model: 'colchis_calf', pitch: 0.8, voice: 'snort', armor: 0.15, knockResist: 0.5, slashColor: 0xff7a1a },
  // woods
  myrmex: { name: txt('monsters.myrmex.name'), tier: 'minor', role: 'rusher', hp: 22, speed: 4.8, dmg: 6, radius: 0.45, height: 0.8, ai: 'melee', range: 1.4, windup: 0.4, cd: 1.2, xp: 2, coins: [0, 2], model: 'myrmex', pitch: 1.3, voice: 'chitter', knockResist: 0.1 },
  myrmex_spitter: { name: txt('monsters.myrmex_spitter.name'), tier: 'minor', role: 'lobber', hp: 18, speed: 4, dmg: 6, radius: 0.45, height: 0.9, ai: 'ranged', range: 9, keep: 6, windup: 0.7, cd: 2.8, xp: 3, coins: [1, 2], model: 'myrmex_spitter', pitch: 1.1, voice: 'chitter', projectile: 'acid', lob: true, knockResist: 0.1 },
  boarlet: { name: txt('monsters.boarlet.name'), tier: 'minor', role: 'bruiser', hp: 50, speed: 5, dmg: 9, radius: 0.7, height: 1.2, ai: 'melee', range: 3.4, windup: 0.65, cd: 2, xp: 5, coins: [2, 4], model: 'boarlet', pitch: 0.9, voice: 'snort', knockResist: 0.5, slashColor: 0xf0e0c0 },
  // shore
  crab: { name: txt('monsters.crab.name'), tier: 'minor', role: 'fodder', hp: 28, speed: 4, dmg: 6, radius: 0.55, height: 0.9, ai: 'melee', range: 1.6, windup: 0.45, cd: 1.3, xp: 3, coins: [1, 3], model: 'crab', pitch: 1, voice: 'clack', armor: 0.1, knockResist: 0.3 },
  king_crab: { name: txt('monsters.king_crab.name'), tier: 'elite', role: 'tank', hp: 160, speed: 2.2, dmg: 16, radius: 1.05, height: 1.7, ai: 'tank', range: 2.4, windup: 0.9, cd: 2.4, xp: 10, coins: [4, 8], model: 'king_crab', pitch: 0.6, voice: 'clack', armor: 0.3, knockResist: 0.8, superArmor: true, slamR: 2.4 },
  // canyon
  basilisk: { name: txt('monsters.basilisk.name'), tier: 'minor', role: 'ranged', hp: 16, speed: 5.6, dmg: 5, radius: 0.4, height: 0.6, ai: 'ranged', range: 8, keep: 5, windup: 0.45, cd: 2.2, xp: 2, coins: [0, 2], model: 'basilisk', pitch: 1.5, voice: 'hiss', projectile: 'acid', knockResist: 0, poison: { dps: 2, dur: 3 } },
  earthborn: { name: txt('monsters.earthborn.name'), tier: 'elite', role: 'lobber', hp: 170, speed: 2.4, dmg: 14, radius: 0.95, height: 3.2, ai: 'ranged', range: 13, keep: 8, windup: 1, cd: 3, xp: 12, coins: [5, 9], model: 'earthborn', pitch: 0.55, voice: 'grind', projectile: 'acid', lob: true, armor: 0.15, knockResist: 0.75, superArmor: true },
  // labyrinth
  daedalus_drone: { name: txt('monsters.daedalus_drone.name'), tier: 'minor', role: 'ranged', hp: 18, speed: 4.6, dmg: 6, radius: 0.4, height: 1, ai: 'ranged', range: 11, keep: 7, windup: 0.55, cd: 2.4, xp: 3, coins: [1, 3], model: 'daedalus_drone', pitch: 1.6, voice: 'whir', projectile: 'bullet', knockResist: 0.1 },
  // othrys
  laistrygonian: { name: txt('monsters.laistrygonian.name'), tier: 'elite', role: 'lobber', hp: 220, speed: 2.4, dmg: 18, radius: 1.1, height: 4, ai: 'ranged', range: 14, keep: 9, windup: 1.1, cd: 3.2, xp: 16, coins: [7, 12], model: 'laistrygonian', pitch: 0.45, voice: 'roar', projectile: 'fire', lob: true, armor: 0.1, knockResist: 0.85, superArmor: true },
  // asphodel
  shade: { name: txt('monsters.shade.name'), tier: 'minor', role: 'fodder', hp: 16, speed: 2.4, dmg: 5, radius: 0.4, height: 1.8, ai: 'melee', range: 1.5, windup: 0.6, cd: 1.6, xp: 2, coins: [0, 2], model: 'shade', pitch: 0.9, voice: 'wail', knockResist: 0 },
  keres: { name: txt('monsters.keres.name'), tier: 'minor', role: 'rusher', hp: 16, speed: 6.6, dmg: 6, radius: 0.4, height: 1.6, ai: 'melee', range: 1.5, windup: 0.35, cd: 1.2, xp: 2, coins: [0, 2], model: 'keres', pitch: 1.2, voice: 'shriek', knockResist: 0, slashColor: 0xff2a2a },
};

// ---- behaviour (rig.onTick, every frame while alive) --------------------------
const C = (c) => new THREE.Color(c);
const _c = new THREE.Vector3(), _f = new THREE.Vector3();
const dustCol = C(0xb89a70), fireCol = C(0xff7a1a), fireHot = C(0xffd040);
// a shot restyled as it leaves: colour, shape, size, trail and what it leaves where it lands
const SHOTS = {
  karpos_slinger: { color: 0xd8ff40, shape: 'cube', scale: 0.55, trail: C(0xc8ff40), splat: 0xd8ff40 },
  basilisk: { color: 0xe8ff20, scale: 0.7, trail: C(0xe8ff20) },
  earthborn: { color: 0x7a4a24, emissive: 0.25, shape: 'cube', scale: 1.6, trail: C(0x6a4a2a), trailSmoke: true, splat: 0x6a4a2a, noHazard: true, light: false },
  daedalus_drone: { color: 0x5ad8ff, scale: 1.2 },
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
    // the keres hang in the air and drop to strike
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
  karpos_slinger: [[C(0xe8c860), 14, false, 3.4, 0.13, 8], [C(0x6a8a3a), 8, false, 2.6, 0.16, 6], [C(0xd8ff40), 8, true, 3, 0.12, 4]],
  colchis_calf: [[C(0xc08a2c), 14, false, 4, 0.18, 12], [C(0x5a3a1a), 8, false, 3, 0.16, 12], [C(0xff7a1a), 14, true, 3.5, 0.22, -1], [C(0x6a6a6a), 6, false, 1.4, 0.5, -2]],
  myrmex: [[C(0x241c16), 12, false, 3.2, 0.15, 11], [C(0xc08a2c), 7, false, 3, 0.11, 11]],
  myrmex_spitter: [[C(0x241c16), 10, false, 3.2, 0.15, 11], [C(0x9aff3a), 14, true, 3, 0.15, 9]],
  boarlet: [[C(0x4a3424), 14, false, 3.4, 0.18, 10], [C(0xe8dcc0), 8, false, 3, 0.12, 12], [C(0x8a6a4a), 8, false, 2, 0.45, -0.5]],
  crab: [[C(0xd04a20), 14, false, 3.6, 0.15, 12], [C(0xf0e0c8), 5, false, 3, 0.1, 12], [C(0x9ad8ff), 8, false, 2.4, 0.1, 9]],
  king_crab: [[C(0xa83418), 22, false, 4.4, 0.22, 12], [C(0x8a8478), 14, false, 3.6, 0.24, 14], [C(0x9ad8ff), 14, false, 3, 0.12, 9]],
  basilisk: [[C(0x3a8a3a), 12, false, 3, 0.13, 10], [C(0xffd020), 6, true, 2.4, 0.12, 4], [C(0xe8ff20), 6, true, 2, 0.12, 2]],
  earthborn: [[C(0x8a5a34), 26, false, 4.6, 0.3, 14], [C(0x5a3a22), 14, false, 3, 0.6, -0.4], [C(0xffa040), 8, true, 3, 0.18, 2]],
  daedalus_drone: [[C(0xc08a2c), 14, false, 4, 0.12, 12], [C(0x5ad8ff), 12, true, 4, 0.14, 2], [C(0xe8b448), 6, true, 5, 0.08, 6]],
  laistrygonian: [[C(0xc89a6a), 18, false, 4, 0.3, 12], [C(0x5a3a22), 14, false, 3.4, 0.3, 12], [C(0xff7a1a), 20, true, 4, 0.3, -1], [C(0x3a6ad8), 8, true, 2, 0.2, 0]],
  shade: [[C(0x9ab8d8), 14, true, 1.2, 0.34, -1.2], [C(0xd8f0ff), 6, true, 0.8, 0.2, -2]],
  keres: [[C(0x1a1218), 14, false, 3, 0.2, 6], [C(0xff2a2a), 10, true, 3, 0.14, 2], [C(0xe8e0d0), 5, false, 2.4, 0.12, 10]],
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
    anim(p);
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
// Knee-high: a sheaf of wheat stalks bound into a body by twine, a skirt of
// corn husks, a head of plaited straw with hollow glowing green eyes and a
// tall crown of wheat ears, thin straw arms with grabby fingers. The slinger
// pulls a green husk hood up into a point, swings a sling with a glowing seed
// pod and carries a pouch of more.
const KG = { gold: 0xe0b850, goldL: 0xf4d878, goldD: 0xa87a2a, husk: 0xc8c27a, huskG: 0x8ab040, huskD: 0x5a7a2a, twine: 0x6a4a22, eye: 0x8aff3a, pod: 0xd8ff40 };
function karposSkin() {
  const { gold, goldL, goldD, husk, twine, eye } = KG, STRAW = [gold, goldL, goldD, 0xd0a040];
  return skinMat('karpos', (S) => paintPerson(S, { skin: gold, eye: 0x1a1406, eyeWhite: 0x1a1406, brow: goldD, mouth: false, top: husk, sleeve: gold, hand: gold, pants: goldD, shoes: false,
    face: (s, ey) => {
      for (let i = 0; i < 40; i++) s.dot(s.r() * 32, s.r() * 16, STRAW[i % 4], 1, 2);
      for (const x of [9, 13]) { s.rect(x, ey - 1, 2, 2, 0x1a1406, 0); s.rect(x, ey, 2, 1, eye, 0); }
      s.rect(10, ey + 3, 4, 1, twine, 0); for (const x of [10.5, 12, 13.5]) s.dot(x, ey + 2.5, twine, 1, 2);
    } }), { emit: 1.4 });
}
function buildKarpos(K0, slinger = false) {
  const { gold, goldL, goldD, husk, huskG, huskD, twine, pod } = KG, STRAW = [gold, goldL, goldD, 0xd0a040], HUSK = [husk, huskG, huskD, 0xd8d08a];
  const mat = karposSkin();
  const rig = new Rig({ material: mat, scale: slinger ? 0.6 : 0.55, legH: 7, bodyH: 9, bodyW: 7, bodyD: 5, armW: 2.4, headS: 8, jacket: false });
  const K = K0.kit(rig, mat, { seed: slinger ? 131 : 101, rough: 0.85, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  // body: a sheaf of stalks bound with twine, a husk skirt and husk shoulders
  K.box(T, 0, 4.6, 0, 7, 9.2, 5, gold);
  for (let x = -3; x <= 3; x += 1.5) K.box(T, x, 4.6, 2.6, 1, 9.4, 0.4, K.tone(STRAW, 0.1));
  for (const y of [2.2, 7]) K.box(T, 0, y, 0, 7.4, 0.8, 5.4, twine);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.flare(T, Math.sin(a) * 3.4, -0.6, Math.cos(a) * 2.4, 2.6, 5, 0.5, K.tone(HUSK, 0.12), a, 0.45); }
  for (const sx of [-1, 1]) K.box(T, sx * 3.6, 8.6, 0, 2.8, 1.2, 4.6, huskG, 0, 0, sx * 0.4);
  if (slinger) {
    // a pouch of glowing seed pods on the hip, a husk hood pulled up to a point
    K.box(T, 3.6, 2.4, 1.4, 2.2, 2.6, 2.2, twine); for (const [x, z] of [[3.2, 1], [4, 1.8], [3.6, 2.2]]) K.box(T, x, 4, z, 0.9, 0.9, 0.9, pod);
    K.box(Hd, 0, H8 / 2 + 0.6, -0.8, H8 + 1.4, H8 + 1.4, H8 + 0.2, huskG);
    for (const [y, w] of [[H8 + 2, 6.4], [H8 + 3.6, 4.2], [H8 + 5, 2.4], [H8 + 6.2, 1]]) K.box(Hd, 0, y, -1.6 - (H8 + 6 - y) * 0.1, w, 1.8, w, y > H8 + 4 ? huskD : huskG, -0.3);
    for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 + 0.6), H8 * 0.3, 1.6, 0.6, 4, 3, huskD, 0, 0, sx * 0.3);
  } else {
    // a crown of wheat ears and husk leaves at the sides of the head
    K.box(Hd, 0, H8 + 0.4, 0, H8 - 0.6, 0.8, H8 - 0.6, goldL);
    for (const sx of [-1, 1]) { K.box(Hd, sx * (H8 / 2 + 0.4), H8 * 0.6, -0.5, 0.6, 5, 4, huskG, 0, 0, sx * 0.5); K.box(Hd, sx * (H8 / 2 + 0.2), H8 * 0.35, 1.2, 0.5, 3.5, 2.6, husk, 0, 0, sx * 0.7); }
    for (let i = 0; i < 7; i++) {
      const x = -3.6 + i * 1.2, tilt = (i - 3) * 0.2, L = 4 + K.r() * 2.5;
      K.box(Hd, x, H8 + 0.8 + L / 2, -0.4 + (i % 2), 0.5, L, 0.5, huskD, 0, 0, -tilt);
      K.box(Hd, x - Math.sin(tilt) * L, H8 + 1.6 + L + 1.2, -0.4 + (i % 2), 1.4, 3.2, 1.4, K.tone([goldL, gold], 0.1), 0, 0, -tilt);
    }
  }
  // straw arms with three grabby fingers
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -3.6, 0, 1.6, 9, 1.6, gold); K.box(arm, 0, -1, 0, 2.2, 1, 2.2, twine);
    for (const [dx, rz] of [[-0.7, 0.35], [0, 0], [0.7, -0.35]]) K.box(arm, dx, -9.4, 0.4, 0.5, 2.8, 0.5, goldD, 0.3, 0, rz);
  }
  if (slinger) {
    // the sling: two cords from the right hand to a glowing pod
    const s = group(rig.handR, 0, -0.6, 0);
    K.box(s, -0.4, -2.6, 0, 0.3, 5, 0.3, twine, 0, 0, 0.12); K.box(s, 0.4, -2.6, 0, 0.3, 5, 0.3, twine, 0, 0, -0.12);
    K.box(s, 0, -5.4, 0, 2, 1, 1.4, twine); K.box(s, 0, -4.6, 0, 1.4, 1.4, 1.4, pod);
    sway(rig, s, 'x', 0.5, 7);
  }
  // legs: bundled stalks splaying into root feet
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    K.box(leg, 0, -3.4, 0, 2.6, 6.8, 2.6, goldD); K.box(leg, 0, -6.6, 0.6, 3.2, 1, 4, huskD);
  }
  K.done();
  noShadow(rig, rig.armR, rig.armL, rig.legR, rig.legL, Hd);
  return finish(rig, slinger ? 'karpos_slinger' : 'karpos');
}

// ---- Colchis bull calf -----------------------------------------------------------
// A stocky bronze automaton calf: riveted bronze plates over a dark iron
// frame, a broad head lowered behind short gold horns, a furnace grille in
// its chest and glowing nostrils and eyes (the bold orange accent), smoke
// curling from the nose; it paws, then charges with a jet of fire.
function buildCalf(K0) {
  const brz = 0xc0802a, brzD = 0x7a4a14, brzL = 0xe8b048, iron = 0x2a2624, gold = 0xf0c040, glow = 0xff7a1a, hot = 0xffd040;
  const mat = skinMat('colchis_calf', flatQuad(brz, brzD, iron, glow), { rough: 0.4, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.45, bodyL: 10, bodyW: 7.4, bodyH: 6.4, legH: 5, legW: 2.6, headS: 6, snout: false, neckUp: 0.6, headZ: 0.4, gait: 1.25, ears: false, tail: 2, tailLen: 4, tailW: 1 });
  const K = K0.kit(rig, mat, { seed: 137, rough: 0.4, metal: 0.25, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 6;
  dropAll(rig, T); dropAll(rig, Hd);
  // body: a deep chest, a bronze saddle of plates with rivet rows, a furnace grille
  K.box(T, 0, 0, 0, 7.4, 6.4, 10, brz); K.box(T, 0, 0.6, 3.6, 8, 6.4, 3.4, brz);
  K.box(T, 0, 3.4, -0.4, 6.6, 0.8, 9, brzL);
  for (const z of [-3, 0, 3]) { K.box(T, 0, 0.4, z, 7.9, 5.2, 0.4, brzD); for (const sx of [-1, 1]) K.box(T, sx * 3.95, 2.2, z + 1, 0.3, 0.6, 0.6, gold); }
  K.box(T, 0, 0.6, 5.35, 4.2, 3.6, 0.4, iron); for (const y of [-0.4, 0.6, 1.6]) K.box(T, 0, y, 5.5, 3.6, 0.5, 0.3, glow);
  K.box(T, 0, -3.3, 0, 5, 0.6, 8, iron);
  K.box(T, 0, 4.2, 2.6, 2.8, 1.4, 2, brzD);   // the hump
  // head: a broad plated head, a heavy brow, glowing eyes, a square muzzle with glowing nostrils, short gold horns
  const hz = hs * 0.35;
  K.box(Hd, 0, 0, hz, hs + 0.6, hs, hs, brz); K.box(Hd, 0, hs * 0.42, hz + 0.4, hs + 1, 1.2, hs - 1, brzD);
  K.box(Hd, 0, -1.2, hz + hs / 2 + 1, hs - 0.6, 3.4, 2.4, brzL);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 1.2, -1, hz + hs / 2 + 2.25, 1, 1, 0.3, hot); K.box(Hd, sx * 2.2, 1.2, hz + hs / 2 + 0.05, 1.4, 1, 0.3, glow);
    K.box(Hd, sx * (hs / 2 + 1.2), hs * 0.4, hz, 2.6, 1.4, 1.4, gold, 0, 0, sx * 0.25); K.box(Hd, sx * (hs / 2 + 2.6), hs * 0.4 + 1.2, hz + 0.6, 1, 2.2, 1, gold, 0.4, 0, sx * -0.3);
    K.box(Hd, sx * (hs / 2 + 0.6), hs * 0.1, hz - 1, 0.6, 1.8, 1.4, brzD);
  }
  rig.extras.nose = group(Hd, 0, -1, hz + hs / 2 + 2.6);
  K.box(M, 0, -0.6, 1.6, hs - 1.4, 1.2, 2.4, brzD);
  // legs: plated thighs, iron shins, gold hooves
  for (const leg of rig.legs) { dropAll(rig, leg); K.box(leg, 0, -1.6, 0, 3, 3.6, 3, brz); K.box(leg, 0, -3.8, 0, 2.2, 2.4, 2.2, iron); K.box(leg, 0, -4.7, 0.2, 2.8, 1, 3, gold); }
  for (const s of rig.tail) dropAll(rig, s);
  K.box(rig.tailTip, 0, 0, -1, 0.8, 0.8, 2, iron); K.box(rig.tailTip, 0, 0, -2.4, 1.4, 1.4, 1.2, glow);
  K.done();
  noShadow(rig, M, rig.tailTip, ...rig.legs);
  return finish(rig, 'colchis_calf');
}

// ---- myrmex and myrmex spitter -----------------------------------------------------
// A dog-sized ant: glossy black chitin banded in bronze, a round head with
// amber eyes, elbowed antennae and big bronze pincers, a narrow waist and a
// banded abdomen; six thin bent legs. The spitter carries a swollen glowing
// green abdomen raised over its back (the silhouette and accent of the kind)
// and drips green from its pincers.
function buildMyrmex(K0, spitter = false) {
  const blk = 0x1e1a18, blkL = 0x3a3430, brz = 0xc08a2c, brzD = 0x7a4e14, brzL = 0xe8b448, amber = 0xffa020, ACID = 0x9aff3a, ACIDD = 0x3a8a1a;
  const mat = skinMat('myrmex', flatQuad(blk, 0x0e0c0a, 0x2a2420, amber), { rough: 0.3, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.0, bodyL: 6, bodyW: 5, bodyH: 4, legH: 4.5, legW: 1.1, headS: 5, legs: 6, splay: 1.15, footL: 5, kneeOut: 0.35, legY: 1, snout: false, neckUp: 0.6, headZ: 0.6, gait: 1.9, ears: false });
  const K = K0.kit(rig, mat, { seed: spitter ? 107 : 103, rough: 0.3, metal: 0.15, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, { hs, legW } = rig.dims;
  dropAll(rig, T); dropAll(rig, Hd);
  // thorax with a bronze saddle plate, a narrow waist
  K.box(T, 0, 0, 0, 5, 4, 6, blk); K.box(T, 0, 2.2, 0, 3.6, 0.6, 4.6, brz); K.box(T, 0, 2.6, 0.4, 1.4, 0.4, 2.6, brzL);
  K.box(T, 0, 0.4, -3.8, 2, 2, 2, blkL);
  const ab = group(T, 0, 1.2, -4.6, spitter ? -0.55 : 0);
  if (spitter) {
    // a swollen, glowing acid sac raised over the back
    K.box(ab, 0, 0.4, -5, 8, 7.4, 9, ACIDD); K.box(ab, 0, 0.4, -5, 8.6, 6, 7.6, ACID); K.box(ab, 0, 0.4, -5, 6.6, 8.2, 7.8, ACID);
    for (const dz of [-7.4, -2.6]) K.box(ab, 0, 0.4, dz, 9, 6.8, 0.8, blk);
    K.box(ab, 0, 0.4, -9.8, 3, 3, 0.8, blk); K.box(ab, 0, 4.6, -5, 2.4, 0.4, 5, 0xe0ff9a);
    for (const sx of [-1, 1]) K.box(M, sx * 0.4, -0.9, 2.6, 0.4, 1.4, 0.4, ACID);
  } else {
    K.box(ab, 0, 0, -4.4, 7, 6, 9, blk); K.box(ab, 0, 0.2, -4.4, 7.8, 4.6, 7, blk); K.box(ab, 0, 0, -4.4, 5.4, 7.2, 7.4, blk);
    for (const dz of [-2, -4.4, -6.8]) K.box(ab, 0, 0.2, dz, 8, 5, 0.7, dz === -4.4 ? brzD : brz);
    K.box(ab, 0, 3.7, -3.4, 2.4, 0.3, 3, blkL);
  }
  // head: round black head, bronze brow, amber eyes, elbowed antennae
  const hz = hs * 0.35;
  K.box(Hd, 0, 0, hz, hs, hs * 0.9, hs, blk); K.box(Hd, 0, hs * 0.48, hz - 0.2, hs * 0.8, 0.6, hs * 0.7, brz);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * hs * 0.5, hs * 0.1, hz + 0.8, 0.6, 1.6, 1.8, amber); K.box(Hd, sx * hs * 0.52, hs * 0.22, hz + 1.1, 0.4, 0.6, 0.6, 0xfff0a0);
    K.box(Hd, sx * 1.1, hs * 0.5 + 1.6, hz + 1.6, 0.5, 3.4, 0.5, blkL, 0.5, 0, sx * -0.3);
    K.box(Hd, sx * 1.9, hs * 0.5 + 3.2, hz + 4, 0.45, 0.45, 3.4, blkL, -0.3, sx * 0.25, 0);
  }
  // pincers: two big curved bronze mandibles
  for (const sx of [-1, 1]) { K.box(M, sx * 1.3, 0, 1.6, 1.2, 1, 3.4, brz, 0, -sx * 0.35, 0); K.box(M, sx * 0.5, 0, 3.4, 1, 0.9, 1.8, brzL, 0, sx * 0.8, 0); }
  // six thin bent legs: a black thigh, a bronze knee, a black shin
  for (const leg of rig.legs) {
    const u = leg.userData; leg.rotation.y = -u.side * (0.55 - u.row * 0.55);
    const k = u.knee; dropAll(rig, leg); dropAll(rig, k);
    K.box(leg, 0, -2.2, 0, legW, 4.5, legW, blk); K.boxZ(k, 0, 0, 0, 1.6, 1.6, 1.6, brzD);
    K.boxZ(k, 0, -2.6, 0, legW * 0.8, 5.2, legW * 0.8, blkL); K.boxZ(k, 0, -5, 0, 0.6, 0.8, 0.6, brz);
  }
  K.done();
  noShadow(rig, Hd, M, ...rig.legs);
  return finish(rig, spitter ? 'myrmex_spitter' : 'myrmex');
}

// ---- Calydonian boarlet ---------------------------------------------------------
// A big bristly boar: a heavy dark-brown hunched forequarter, a ridge of pale
// bone spines down its back (its silhouette), long curved white tusks, small
// red eyes, a pink-brown snout and a tufted tail; it lowers its head and charges.
function buildBoarlet(K0) {
  const fur = 0x4a3424, furD = 0x2e2018, furL = 0x6a4a30, bone = 0xe8dcc0, boneD = 0xb8a888, snout = 0x8a5a4a, eye = 0xff2a1a;
  const FUR = [fur, furD, furL];
  const mat = skinMat('boarlet', flatQuad(fur, furD, 0x3a2a1e, eye), { rough: 0.9, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.45, bodyL: 11, bodyW: 7, bodyH: 6.4, legH: 4, legW: 2.2, headS: 6, snout: false, neckUp: -0.6, headZ: 0.6, gait: 1.5, ears: false, tail: 2, tailLen: 3, tailW: 0.8 });
  const K = K0.kit(rig, mat, { seed: 139, rough: 0.9, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 6;
  dropAll(rig, T); dropAll(rig, Hd);
  // body: hunched shoulders sloping to the haunches, shaggy flanks
  K.box(T, 0, 0, -1, 7, 6, 9, fur); K.box(T, 0, 0.8, 3.2, 8, 7.4, 4.6, furD);
  K.clumps(T, [0, 0.4, 0.6], [7.8, 6.6, 10], { n: 18, size: [1, 1.8], cols: FUR, faces: 'lr', out: -0.2 });
  // the ridge of spines: tall at the shoulders, falling away to the tail
  for (let i = 0; i < 8; i++) { const z = 4.6 - i * 1.35, h = 4.2 - i * 0.4; K.box(T, 0, 3.6 + h / 2, z, 1, h, 1, i % 2 ? boneD : bone, -0.45); }
  // head: a long wedge, a pink-brown disc snout, red eyes, ears, curved tusks
  const hz = hs * 0.35;
  K.box(Hd, 0, 0.2, hz, hs, hs, hs, furD); K.box(Hd, 0, -0.8, hz + hs / 2 + 1.4, hs - 1.4, hs - 1.6, 3, fur);
  K.box(Hd, 0, -1, hz + hs / 2 + 3, 3.6, 3, 0.8, snout); for (const sx of [-1, 1]) K.box(Hd, sx * 0.8, -1, hz + hs / 2 + 3.45, 0.7, 0.9, 0.2, 0x2a1410);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * (hs / 2 - 0.2), 1.2, hz + hs / 2 + 0.05, 1, 0.9, 0.3, eye);
    K.box(Hd, sx * (hs / 2 - 0.6), hs / 2 + 1, hz - 1.2, 1.6, 2.4, 1, furL, -0.4, 0, sx * 0.4);
    K.box(M, sx * 2.2, 1.2, 2.6, 0.9, 0.9, 3, bone, -0.5, 0, 0); K.box(M, sx * 2.4, 2.9, 3.8, 0.8, 2.2, 0.8, bone, 0.25, 0, sx * 0.25);
  }
  K.box(M, 0, -0.4, 1.8, hs - 2, 1, 2.6, snout);
  // legs: shaggy thighs, dark hocks, cloven hooves
  for (const leg of rig.legs) { dropAll(rig, leg); K.box(leg, 0, -1.4, 0, 2.8, 3, 2.8, furD); K.box(leg, 0, -3.5, 0.2, 2.2, 1.2, 2.4, 0x1a120c); }
  for (const s of rig.tail) dropAll(rig, s);
  K.box(rig.tailTip, 0, 0, -1, 0.7, 0.7, 2.4, furD); K.box(rig.tailTip, 0, -0.4, -2.4, 1.2, 1.6, 1, furL);
  K.done();
  noShadow(rig, M, rig.tailTip, ...rig.legs);
  return finish(rig, 'boarlet');
}

// ---- crab and king crab --------------------------------------------------------------
// A waist-high red shore crab, broadside on to the way it walks: the rig's
// long axis is the crab's width, so it scuttles sideways with the big claw
// leading. Orange-red shell with barnacles, eyes on stalks, eight legs, one
// huge raised claw (its lower finger is the rig's jaw: it snaps) and a small
// one. The king crab is twice the size, slow, its back a crust of grey rock
// and barnacles, its crusher claw enormous with a pale knuckle.
function buildCrab(K0, king = false) {
  const red = king ? 0xa83418 : 0xd04a20, redD = king ? 0x5a1a0c : 0x8a2410, redL = king ? 0xd05a28 : 0xf07a3a, cream = 0xf0d8b0, tip = 0x2a1410, barn = 0xe8e0cc, barnD = 0xa8a090;
  const rock = [0x8a8478, 0x6a645a, 0x9a9488], SHELL = [red, redD, redL];
  const mat = skinMat('crab', flatQuad(0xd04a20, 0x8a2410, 0xf0d8b0, 0x0a0a0a), { rough: 0.45, emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: king ? 2.6 : 1.4, bodyL: 11, bodyW: 7, bodyH: 3.6, legH: 4, legW: 1.2, headS: 4, legs: 4, splay: 0, snout: false, neckUp: 0.4, headZ: -1.5, gait: king ? 1.4 : 2.4, ears: false, jawOpen: 0.15 });
  const K = K0.kit(rig, mat, { seed: king ? 149 : 109, rough: 0.45, emit: 0.8 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth;
  dropAll(rig, T); dropAll(rig, Hd);
  // the shell: a wide low carapace with a raised dome, a rim, barnacles
  K.box(T, 0, 0, 0, 7, 3.4, 11, red); K.box(T, 0, 1.9, 0, 5.4, 1, 8.6, redL); K.box(T, -0.4, 2.5, 0, 3.4, 0.5, 5.6, red);
  K.box(T, 0, -1.9, 0, 6.4, 0.6, 9.6, cream);
  for (let i = 0; i < 5; i++) K.box(T, 3.6, 0.6, -3.6 + i * 1.8, 0.4, 1, 1, K.tone(SHELL, 0.1));
  if (king) {
    // a crust of rock and barnacles on the back
    for (let i = 0; i < 9; i++) { const x = -2.4 + (i % 3) * 1.8, z = -3.6 + Math.floor(i / 3) * 3.4 + (K.r() - 0.5); K.box(T, x, 2.9 + K.r() * 0.6, z, 2 + K.r(), 1.4 + K.r(), 2.4 + K.r(), K.tone(rock, 0.1)); }
    for (const [x, z] of [[-1, -4.6], [1.4, 0.6], [-2, 3], [0.6, 4.8]]) { K.box(T, x, 4.4, z, 1, 1, 1, barn); K.box(T, x, 5, z, 0.4, 0.3, 0.4, barnD); }
    for (let i = 0; i < 6; i++) K.box(T, -3.6, 0.8, -4.4 + i * 1.8, 0.4, 1.4, 1, K.tone(rock, 0.1));
  } else for (const [x, z, s] of [[-1.4, 2.4, 1.3], [-2.2, -2.8, 1], [0.6, -1.4, 0.9], [-0.6, 3.8, 0.8]]) { K.box(T, x, 2.3 + s * 0.3, z, s, s * 0.8, s, barn); K.box(T, x, 2.4 + s * 0.6, z, s * 0.4, 0.3, s * 0.4, barnD); }
  // face on the +x side: eyes on stalks, mouth parts, a small claw at the back end
  for (const dz of [-1.2, 1.2]) { K.box(T, 2.8, 3, dz, 0.6, 2.4, 0.6, redD); K.box(T, 2.9, 4.4, dz, 1.1, 1.1, 1.1, 0x0a0a0a); K.box(T, 3.3, 4.7, dz + 0.3, 0.3, 0.3, 0.3, 0xffffff); }
  K.box(T, 3.7, -0.6, 0, 0.6, 1.4, 2.6, redD);
  K.box(T, 3.2, -0.2, -5.4, 1.8, 1.6, 3, red, 0, 0.5, 0); K.box(T, 3.8, -0.1, -7, 2, 1.8, 2.4, redL, 0, 0.5, 0); K.box(T, 4.4, -0.1, -8.2, 0.8, 0.8, 1.4, tip, 0, 0.5, 0);
  // the big claw, raised at the leading end: an arm, a fat palm and a fixed
  // upper finger; the jaw carries the lower finger, so the bite snaps it
  const cx = 2.6, k = king ? 1.3 : 1;
  K.box(Hd, cx, 1.2, 0.6, 2, 2, 3.6, red, -0.6); K.box(Hd, cx, 3.6, 2.4, 2.2, 3.6, 2, redD, -0.2);
  K.box(Hd, cx, 6.2, 3.6, 3.6 * k, 3.8 * k, 4.6 * k, red); K.box(Hd, cx + 0.2, 6.2 + 1.2 * k, 3.6, 3 * k, 1, 4 * k, redL);
  if (king) { K.box(Hd, cx, 6.2, 6.4, 4.2, 4, 1.4, cream); for (const y of [4.6, 7.6]) K.box(Hd, cx + 2.4, y, 3.4, 0.8, 0.8, 0.8, barn); }
  K.box(Hd, cx, 7.2 * (king ? 1.05 : 1), 7.4 * k, 2.4 * k, 1.8 * k, 3.6 * k, red); K.box(Hd, cx, 6.6 * (king ? 1.05 : 1), 7.4 * k + 1.8 * k, 1.6 * k, 1.2 * k, 1.4 * k, tip);
  for (const z of [6.6, 8]) K.box(Hd, cx, 6.2, z * k, 0.8, 0.5, 0.6, cream);
  M.position.set(cx * PX, 4.6 * PX, (king ? 6.6 : 5.6) * PX);
  K.box(M, 0, 0, 2 * k, 2.2 * k, 1.6 * k, 4 * k, redL); K.box(M, 0, 0.2, 4.4 * k, 1.4 * k, 1.1 * k, 1.4 * k, tip); K.box(M, 0, 0.9, 2.4 * k, 0.7, 0.5, 0.6, cream);
  // eight legs: two to each of the rig's legs, reaching out from the crab's
  // sides (the rig's front and back) and down to pointed tips
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    const u = leg.userData, zs = u.row === 0 ? 1 : -1;
    for (const dx of [-1.4, 1.4]) {
      K.box(leg, dx, 0.9, zs * 2, 1.2, 1.2, 4.4, dx > 0 ? red : redD, zs * -0.45);
      K.box(leg, dx, -1.4, zs * 4.4, 1, 4.6, 1, red, zs * 0.25); K.box(leg, dx, -3.7, zs * 5, 0.6, 1, 0.6, tip);
    }
  }
  K.done();
  noShadow(rig, M, ...rig.legs);
  return finish(rig, king ? 'king_crab' : 'crab');
}

// ---- basilisk ----------------------------------------------------------------------
// A small quick crowned lizard, low to the ground on splayed legs: green
// scales banded darker, a pale belly, a tall frilled crest down the neck and a
// gold crown of spikes on its head (the accent), glowing yellow eyes, a long
// whipping tail; it spits venom.
function buildBasilisk(K0) {
  const grn = 0x3a8a3a, grnD = 0x1e4e22, grnL = 0x6ab04a, belly = 0xd8d08a, gold = 0xffc020, eye = 0xffe020, frill = 0xd83a1a;
  const mat = skinMat('basilisk', (S) => paintQuad(S, { base: grn, dark: grnD, belly, back: grnD, stripes: grnD, eye, teeth: false, nose: grnD, noise: 0.14, speckles: 30 }), { rough: 0.5, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.0, bodyL: 8, bodyW: 4.4, bodyH: 3, legH: 3, legW: 1.4, headS: 4, splay: 0.9, snout: false, neckUp: 1, headZ: 0.4, gait: 2.4, ears: false, tail: 4, tailLen: 12, tailW: 2.2, tailCurl: 0.05 });
  const K = K0.kit(rig, mat, { seed: 151, rough: 0.5, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 4;
  dropAll(rig, Hd);
  // a frilled crest down the back, red-edged
  for (let i = 0; i < 6; i++) { const z = 3.4 - i * 1.4, h = 2.6 - i * 0.3; K.box(T, 0, 1.5 + h / 2, z, 0.5, h, 1.3, grnL, -0.3); K.box(T, 0, 1.5 + h, z - 0.3, 0.6, 0.5, 1.3, frill, -0.3); }
  for (let z = -3; z <= 3; z += 2) K.box(T, 0, 0, z, 4.6, 3.1, 0.5, grnD);
  // head: a long wedge with a gold crown of spikes and glowing eyes
  const hz = hs * 0.35;
  K.box(Hd, 0, 0, hz + 0.6, hs, hs * 0.8, hs + 1.6, grn); K.box(Hd, 0, -0.4, hz + hs / 2 + 1.6, hs - 1, hs * 0.5, 1.8, grnL);
  for (const sx of [-1, 1]) { K.box(Hd, sx * (hs / 2), 0.6, hz + 1.2, 0.3, 1, 1.2, eye); K.box(Hd, sx * (hs / 2 + 0.05), 0.7, hz + 1.4, 0.2, 0.5, 0.5, 0x2a2000); }
  K.box(Hd, 0, hs * 0.4 + 0.2, hz, hs + 0.4, 0.6, hs - 0.4, gold);
  for (const [x, h] of [[-1.6, 1.6], [-0.8, 2.2], [0, 2.8], [0.8, 2.2], [1.6, 1.6]]) K.box(Hd, x, hs * 0.4 + 0.4 + h / 2, hz - 0.2, 0.6, h, 0.6, gold);
  K.box(Hd, 0, hs * 0.4 + 2, hz - 0.2, 0.7, 0.7, 0.7, 0xff3a1a);
  for (const sx of [-1, 1]) K.box(Hd, sx * (hs / 2 + 0.5), 0, hz - 1, 0.4, 2.4, 2.2, frill, 0, sx * 0.4, 0);
  K.box(M, 0, -0.3, 1.8, hs - 1.2, 0.6, 3, grnL); K.box(M, 0, 0, 1.4, 1.2, 0.3, 2, 0xd83a5a);
  K.done();
  noShadow(rig, Hd, M, ...rig.legs, ...rig.tail);
  return finish(rig, 'basilisk');
}

// ---- Earthborn ---------------------------------------------------------------------------
// A big lumpy clay giant with six arms: red-brown clay in rounded lumps, a
// small head sunk in its shoulders with glowing amber eyes and a gash of a
// mouth, cracks of ember glow, the upper hands holding a boulder of mud over
// its head and two more pairs of arms swinging at its sides.
function buildEarthborn(K0) {
  const clay = 0x9a5a34, clayD = 0x6a3a22, clayL = 0xb87a4a, mud = 0x5a3a22, glow = 0xffa040, CLAY = [clay, clayD, clayL, 0x8a5030];
  const mat = skinMat('earthborn', (S) => paintPerson(S, { skin: clay, eye: 0x2a1408, eyeWhite: 0x2a1408, brow: clayD, mouth: false, top: clay, sleeve: clay, hand: clayD, pants: clayD, shoes: false,
    face: (s, ey) => { s.rect(8, ey - 2, 8, 2, clayD, 0.1); for (const x of [9, 13]) s.rect(x, ey, 2, 1, glow, 0); s.rect(9, ey + 3, 6, 1, 0x2a1408, 0); s.rect(10, ey + 3, 4, 0.5, glow, 0); },
    body: (s) => { for (let i = 0; i < 60; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, CLAY[i % 4], 2, 2); } }), { emit: 1.2 });
  const rig = new Rig({ material: mat, scale: 1.7, legH: 9, bodyH: 13, bodyW: 12, bodyD: 7, armW: 4.4, headS: 7, jacket: false });
  const K = K0.kit(rig, mat, { seed: 157, rough: 0.95, emit: 0.9 });
  const T = rig.torso, Hd = rig.head;
  dropOne(rig, hatOf(rig));
  // lumps all over the body, a hunched back, ember cracks
  K.clumps(T, [0, 6.5, 0], [12, 13, 7], { n: 26, size: [2, 3.4], cols: CLAY, faces: 'tfklr', out: -0.25 });
  K.box(T, 0, 11, -2.6, 10, 5, 4, clayD);
  K.cracks(T, [0, 6, 0], [12, 12, 7], { n: 5, len: [3, 5], cols: [glow, 0xff6a10], faces: 'fk' });
  for (const sx of [-1, 1]) K.box(T, sx * 7, 12, 0, 4, 3.4, 5, clayL);   // shoulders up round the head
  // the two lower pairs of arms: lumpy stubs with knobbly fists, swinging
  for (const [y, z, sx, ph] of [[7, 1.4, -1, 0], [7, 1.4, 1, 2], [3.4, 0.8, -1, 1], [3.4, 0.8, 1, 3]]) {
    const a = group(T, sx * 7.2, y, z, 0, 0, sx * 0.5);
    K.box(a, 0, -3, 0, 3.4, 6.4, 3.4, K.tone(CLAY, 0.1)); K.box(a, 0, -6.8, 0.4, 4, 3, 4, clayD);
    sway(rig, a, 'x', 0.35, 2.2, ph);
  }
  // the upper arms (the rig's own) heave a boulder of mud overhead
  for (const arm of [rig.armR, rig.armL]) { dropAll(rig, arm); K.box(arm, 0, -3.4, 0, 4.6, 10, 4.6, clay); K.box(arm, 0, -9.6, 0, 5.4, 3.6, 5.4, clayD); K.clumps(arm, [0, -4, 0], [4.6, 9, 4.6], { n: 5, size: [1.6, 2.4], cols: CLAY, out: -0.3 }); }
  const rockG = group(rig.handR, 0, -2, 2);
  K.box(rockG, 0, -1, 0, 6, 5, 6, mud); K.box(rockG, 1, 0.4, 1, 4, 4, 4, 0x6a4a2a); K.box(rockG, -1.4, -2.6, -1, 3, 3, 3, 0x4a3018);
  rig.extras.rock = rockG;
  // stumpy legs
  for (const leg of [rig.legR, rig.legL]) { dropAll(rig, leg); K.box(leg, 0, -4.4, 0, 5.4, 9, 5.4, clayD); K.box(leg, 0, -8.6, 1, 6, 1.6, 7, mud); }
  rig.legR.position.x = -3.2 * PX; rig.legL.position.x = 3.2 * PX;
  // head: a lump with a heavy brow
  K.box(Hd, 0, 8 * HS * 7 / 8 + 0.6, -0.4, 8, 1.6, 8, clayD);
  K.done();
  noShadow(rig, Hd);
  rig.hunch = 0.15;
  return finish(rig, 'earthborn');
}

// ---- Daedalus drone ---------------------------------------------------------------------------
// A bronze clockwork bird the size of a goose: a round riveted body with a
// glowing blue core in its breast (the accent), a crested head with a hooked
// beak and blue lens eyes, a fan of bronze tail plates, a wind-up key, and
// two blades of wing that whir; it hovers and fires bolts.
function buildDrone(K0) {
  const brz = 0xc08a2c, brzD = 0x7a4e14, brzL = 0xe8b448, blue = 0x5ad8ff, iron = 0x2a2a30;
  const mat = skinMat('daedalus_drone', (S) => paintPerson(S, { skin: brz, eye: blue, eyeWhite: blue, brow: brzD, mouth: false, top: brz, sleeve: brz, hand: brz, pants: brzD, shoes: false }), { rough: 0.35, emit: 1 });
  const rig = new Rig({ material: mat, scale: 0.7, legH: 6, bodyH: 9, bodyW: 9, bodyD: 9, armW: 2, headS: 6, jacket: false });
  const K = K0.kit(rig, mat, { seed: 163, rough: 0.35, metal: 0.3, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H6 = 6 * HS * 6 / 8;
  dropAll(rig, T); dropAll(rig, Hd); dropAll(rig, rig.armR); dropAll(rig, rig.armL);
  // the body: a rounded drum of bronze with rivet bands and a blue core
  K.box(T, 0, 4.5, 0, 8, 8, 9, brz); K.box(T, 0, 4.5, 0, 9, 6.4, 7.6, brz); K.box(T, 0, 4.5, 0, 6.6, 9.2, 7.4, brzL);
  for (const z of [-2.4, 2.4]) K.box(T, 0, 4.5, z, 9.4, 6.8, 0.5, brzD);
  K.box(T, 0, 4.6, 4.75, 3.6, 3.6, 0.5, iron); K.box(T, 0, 4.6, 5, 2.4, 2.4, 0.4, blue); K.box(T, 0, 4.6, 5.15, 1, 1, 0.3, 0xe0ffff);
  // a wind-up key on the back and a fan of tail plates
  K.box(T, 0, 6, -5, 0.8, 0.8, 2, brzD); K.box(T, 0, 6, -6.2, 4, 2, 0.6, brzL);
  for (let i = -2; i <= 2; i++) K.box(T, i * 1.3, 2.4, -6.6, 1.2, 0.5, 5, i % 2 ? brzD : brz, 0.3, i * 0.18, 0);
  // head: a dome with a crest, blue lens eyes and a hooked beak
  K.box(Hd, 0, H6 / 2, 0.6, H6 + 0.6, H6, H6 + 0.6, brz);
  for (const sx of [-1, 1]) { K.box(Hd, sx * (H6 / 2 + 0.3), H6 * 0.55, 1.2, 0.5, 2, 2, iron); K.box(Hd, sx * (H6 / 2 + 0.5), H6 * 0.55, 1.2, 0.3, 1.2, 1.2, blue); }
  K.box(Hd, 0, H6 * 0.4, H6 / 2 + 1.8, 2, 2, 3, brzL); K.box(Hd, 0, H6 * 0.2, H6 / 2 + 3.2, 1.2, 1.6, 1.2, brzD);
  for (let i = 0; i < 3; i++) K.box(Hd, 0, H6 + 0.8 + i * 0.4, 0.8 - i * 1.6, 0.6, 2.2 - i * 0.3, 1.4, brzL, -0.4);
  rig.extras.muzzle = group(Hd, 0, H6 * 0.3, H6 / 2 + 4);
  // claw feet tucked under
  for (const leg of [rig.legR, rig.legL]) { dropAll(rig, leg); K.box(leg, 0, -1.6, 0, 1, 3.2, 1, iron); for (const dz of [-0.6, 0.8]) K.box(leg, 0, -3.4, dz, 0.6, 0.6, 1.4, brzD); }
  // wings: bronze blades on struts
  wings(rig, K, { y: 7.4, z: -0.6, span: 18, chord: 6, cols: { bone: brzD, main: brz, tip: brzL }, flap: 2.6 });
  K.done();
  noShadow(rig, rig.legR, rig.legL, ...rig.extras.wings.flatMap((w) => [w.root, w.elbow]));
  rig.float = 1.5;
  return finish(rig, 'daedalus_drone');
}

// ---- Laistrygonian ----------------------------------------------------------------------------
// A huge cannibal giant from the north, as tall as a house: weathered tan
// skin with blue woad tattoos in bands, a wild black beard and topknot, a
// cloak of shaggy brown furs on the shoulders with a bone clasp, a belt of
// skulls, leather wraps on the shins; in its right hand a flaming bronze
// ball (the accent) ready to lob.
function buildLaistrygonian(K0) {
  const skin = 0xc89a6a, skinD = 0xa07a4e, woad = 0x3a6ad8, hair = 0x1a1410, furC = [0x5a3a22, 0x4a2e1a, 0x6a4a2a, 0x3a2414], bone = 0xe8dcc0, lea = 0x5a3a20, brz = 0xc08a2c, fire = [0xff7a1a, 0xffb030, 0xffe060];
  const mat = skinMat('laistrygonian', (S) => paintPerson(S, { skin, hair, fringe: 1, hairSide: 2, hairBack: 7, eye: 0x1a0a00, eyeWhite: 0xf0e0c0, scowl: true, brow: hair, beard: hair, mouth: false, top: skin, sleeve: skin, hand: skin, shortSleeve: true, pants: lea, shoes: false,
    face: (s, ey) => { s.rect(8, ey + 1, 1, 3, woad, 0); s.rect(15, ey + 1, 1, 3, woad, 0); s.rect(10, ey - 3, 4, 1, woad, 0); },
    body: (s) => { for (let x = 16; x < 40; x += 3) { s.rect(x, 22, 2, 1, woad, 0); s.rect(x + 1, 26, 1, 3, woad, 0); } s.rect(16, 29, 24, 1, woad, 0); } }), { emit: 1, res: 1 });
  const rig = new Rig({ material: mat, scale: 2.0, legH: 12, bodyH: 13, bodyW: 10, bodyD: 6, armW: 4, headS: 8, jacket: false });
  const K = K0.kit(rig, mat, { seed: 167, rough: 0.85, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropOne(rig, hatOf(rig));
  // the fur cloak on the shoulders and down the back, a bone clasp
  K.box(T, 0, 12.4, -0.4, 12.4, 2.6, 7.6, furC[0]);
  K.clumps(T, [0, 12.4, -0.4], [12.4, 2.6, 7.6], { n: 18, size: [1.6, 2.6], cols: furC, faces: 'tlrk' });
  for (let x = -5.4; x <= 5.4; x += 1.8) { const L = 10 + K.r() * 4; K.box(T, x, 12 - L / 2, -3.6, 2, L, 1, K.tone(furC, 0.1)); }
  K.box(T, 2.6, 11.6, 3.4, 2, 2, 1, bone);
  // a belt of skulls over a fur kilt
  K.box(T, 0, 0.8, 0, 10.8, 1.8, 6.8, lea);
  for (const x of [-3.6, 0, 3.6]) { K.box(T, x, 0.8, 3.6, 2, 2, 1.2, bone); K.box(T, x - 0.4, 1, 4.25, 0.5, 0.5, 0.2, 0x1a1410); K.box(T, x + 0.4, 1, 4.25, 0.5, 0.5, 0.2, 0x1a1410); }
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.flare(rig.hips, Math.sin(a) * 5, -2.4, Math.cos(a) * 3, 3, 5.4, 0.8, K.tone(furC, 0.1), a, 0.15); }
  // head: a topknot, a wild beard in clumps, a heavy brow
  K.box(Hd, 0, H8 + 1.6, -1, 3, 3, 3, hair); K.box(Hd, 0, H8 + 3.4, -1.6, 2, 2.4, 2, hair, -0.3); K.box(Hd, 0, H8 + 0.6, -1, 3.4, 0.6, 3.4, brz);
  K.clumps(Hd, [0, 1.4, H8 / 2], [H8, 3.4, 1.2], { n: 14, size: [1.4, 2.2], cols: [hair, 0x2a2018], faces: 'fb' });
  K.box(Hd, 0, -1.6, H8 / 2 - 0.4, 4, 3, 2, hair);
  // arms: woad bands, leather wraps, bronze armbands
  for (const arm of [rig.armR, rig.armL]) { K.box(arm, 0, 0.6, 0, 4.6, 1, 4.6, brz); K.box(arm, 0, -7.6, 0, 4.6, 3.4, 4.6, lea); }
  // the flaming bronze ball in the right hand
  const ball = group(rig.handR, 0, -2.6, 0.6);
  K.box(ball, 0, 0, 0, 4.4, 4.4, 4.4, brz); K.box(ball, 0, 0, 0, 5, 3, 3, brz); K.box(ball, 0, 0, 0, 3, 5, 3, brz);
  for (let i = 0; i < 9; i++) { const a = K.r() * Math.PI * 2, t = K.r(); K.box(ball, Math.cos(a) * 1.8, 2 + t * 3, Math.sin(a) * 1.8, 1.6 - t, 1.8 - t, 1.6 - t, fire[Math.min(2, Math.floor(t * 3))]); }
  rig.extras.ball = ball;
  // shins wrapped in leather and furs
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 0, -8, 0, 4.8, 5, 4.8, lea); K.box(leg, 0, -5.6, 0, 5.2, 1.2, 5.2, furC[1]); }
  K.done();
  noShadow(rig, Hd);
  return finish(rig, 'laistrygonian');
}

// ---- shade -------------------------------------------------------------------------------
// A wispy grey-blue ghost of the dead: a hooded, tattered robe, a hollow
// dark face with two pale points for eyes, thin pale hands, no legs, the
// hem trailing off into swaying wisps. See-through (the ghost's dissolve).
function buildShade(K0) {
  const SH = [0x8aa0b8, 0x6a809a, 0xa8bcd0, 0x5a6c84], hood = 0x5a6c84, dark = 0x0e141c, pale = 0xd8f0ff;
  const mat = skinMat('shade', (S) => {
    paintPerson(S, { skin: 0x2a3444, eye: dark, eyeWhite: dark, brow: 0x1a2230, mouth: false, top: SH[0], sleeve: SH[0], hand: 0xb8d0e0, pants: SH[1], shoes: false,
      face: (s, ey) => { s.rect(8, ey - 3, 8, 8, 0x141c28, 0.1); for (const x of [9.5, 13.5]) s.dot(x, ey, pale, 1, 1); s.rect(10.5, ey + 3, 3, 1.5, dark, 0); } });
  }, { emit: 2.2, fill: 0.5, dissolve: 0.28 });
  const rig = new Rig({ material: mat, scale: 0.9, armW: 3, jacket: false });
  const K = K0.kit(rig, mat, { seed: 113, fill: 0.5, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // the robe: a body, a ragged hem hanging down past where legs would be
  K.box(T, 0, 6, 0, 8.4, 12, 4.6, SH[0]); K.box(T, 0, 11.2, 0, 9.6, 1.8, 5.4, SH[3]);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, L = 5 + K.r() * 4; K.flare(T, Math.sin(a) * 4, -L / 2 + 0.6, Math.cos(a) * 2.4, 2.8, L, 0.6, K.tone(SH, 0.12), a, 0.12); }
  // hood: a cowl round the hollow face, the eyes two pale points (the accent)
  K.box(Hd, 0, H8 + 0.5, -0.4, H8 + 1, 1.2, H8 + 0.4, hood);
  for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 + 0.5), H8 / 2, -0.2, 1, H8 + 1, H8 + 0.8, SH[1]);
  K.box(Hd, 0, H8 / 2, -H8 / 2 - 0.8, H8 + 2, H8 + 1, 1, hood);
  K.box(Hd, 0, H8 + 0.1, H8 / 2 + 0.5, H8 + 1, 1.6, 1, SH[3]);
  for (const sx of [-1, 1]) K.box(Hd, sx * 1.9 * HS, 4.4 * HS, 4 * HS + 0.2, 1.2, 1, 0.3, pale);
  // tattered sleeves and thin pale hands
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -3.6, 0, 3.4, 9, 3.4, SH[2]);
    for (let i = 0; i < 3; i++) K.box(arm, -1 + i, -8.6 - K.r() * 1.4, 0, 1.2, 2.4 + K.r() * 1.6, 3.2, K.tone(SH, 0.1));
    K.box(arm, 0, -10.6, 0.8, 1.4, 1.8, 1.4, 0xb8d0e0);
  }
  // wisps trailing from the hem, one swaying group
  const w = group(rig.hips, 0, -6, -0.6);
  for (let i = 0; i < 4; i++) { const x = -2.4 + i * 1.6; for (let k = 0; k < 3; k++) K.box(w, x + (K.r() - 0.5) * 0.6, -1.4 - k * 2 - (i % 2), 0, 2 - k * 0.5, 2.2, 2 - k * 0.5, K.tone(SH, 0.12)); }
  sway(rig, w, 'x', 0.3, 2.4);
  K.done();
  noShadow(rig, rig.armR, rig.armL, w);
  rig.float = 0.3; rig.hunch = 0.25;
  return finish(rig, 'shade');
}

// ---- keres ------------------------------------------------------------------------------------
// Ragged black death spirits: a skull face with burning red eyes, wild black
// hair, a body of tattered black rags with no legs, long arms ending in red
// talons (the accent), bat wings; they hang in the air and drop to strike.
function buildKeres(K0) {
  const blk = 0x1a1218, blkL = 0x3a2a34, bone = 0xe8e0d0, red = 0xff2a2a, redD = 0xa81a1a, RAG = [blk, blkL, 0x2a1e26];
  const mat = skinMat('keres', (S) => paintPerson(S, { skin: bone, hair: blk, fringe: 1, hairSide: 3, hairBack: 8, eye: 0x0a0406, eyeWhite: 0x0a0406, brow: 0x8a8070, mouth: false, top: blk, sleeve: blk, hand: blk, pants: blk, shoes: false,
    face: (s, ey) => { for (const x of [9, 13]) { s.rect(x, ey - 1, 2, 2, 0x0a0406, 0); s.rect(x + 0.5, ey - 0.5, 1, 1, red, 0); } s.rect(11, ey + 1.5, 2, 1, 0x2a2020, 0); for (let x = 9.5; x < 15; x += 1) s.dot(x, ey + 3, 0x2a2020, 0.6, 1.5); } }), { emit: 1.6 });
  const rig = new Rig({ material: mat, scale: 0.85, armW: 3, bodyW: 7, jacket: false });
  const K = K0.kit(rig, mat, { seed: 173, rough: 0.9, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, hatOf(rig));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // rags: a thin body and long torn strips hanging below
  K.box(T, 0, 6, 0, 6.6, 12, 3.6, blk);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, L = 6 + K.r() * 6; K.flare(T, Math.sin(a) * 3.2, -L / 2 + 1, Math.cos(a) * 2, 1.8, L, 0.5, K.tone(RAG, 0.1), a, 0.2); }
  // wild hair flying back from the skull
  for (let i = 0; i < 7; i++) K.box(Hd, -3.6 + i * 1.2, H8 - 0.4 - (i % 2), -H8 / 2 - 1.6, 1.4, 1.4, 4 + K.r() * 3, K.tone(RAG, 0.1), 0.6);
  for (const sx of [-1, 1]) K.box(Hd, sx * 1.9 * HS, 4.4 * HS, 4 * HS + 0.2, 1.1, 1.1, 0.3, red);
  // long thin arms ending in red talons
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -4, 0, 2, 11, 2, blkL); K.box(arm, 0, -1, 0, 3, 3, 3, blk);
    for (const dx of [-0.7, 0, 0.7]) { K.box(arm, dx, -10.4, 0.6, 0.5, 2.4, 0.5, redD, 0.25); K.box(arm, dx, -12, 1.2, 0.4, 1.4, 0.4, red, 0.7); }
  }
  wings(rig, K, { y: 10, z: -2, span: 16, chord: 7, cols: { bone: 0x2a1e26, main: blkL, tip: blk }, flap: 1.6, ragged: 4 });
  K.done();
  noShadow(rig, rig.armR, rig.armL, ...rig.extras.wings.flatMap((w) => [w.root, w.elbow]));
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
