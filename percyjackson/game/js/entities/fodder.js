// The open world's fodder (design request vox-ow-fodder in
// design/source/build_requests.py; art not delivered yet, so these follow its
// description): the weak swarm monsters you plow through in the Minecraft
// Dungeons way, in hordes of five to ten with a few tougher ones mixed in.
//   karpos   a knee-high grain spirit of wheat stalks and corn husks with
//            glowing green eyes and grabby straw hands; rushes in mobs
//   myrmex   a dog-sized giant ant in shiny black-and-bronze armour with
//            pincers; the acid myrmex spits a green blob at short range
//   crab     a waist-high red shore crab with barnacles and one big claw,
//            scuttling sideways
//   shade    a wispy grey-blue ghost of the dead in a tattered robe with a
//            hollow face; slow, drifts in crowds
// Cheap on purpose: few boxes, one merged mesh per moving part, the skin
// shared per kind (no new shaders per spawn) and no ambient particle aura.
// Each bursts into its own bits (straw, chitin, shell, wisps) on top of the
// golden dust every monster leaves, with its own small sound.
//
// monsters.js wires these in (fodderModels below takes its voxel kit, so this
// module never imports monsters.js and there is no import cycle).
import * as THREE from 'three/webgpu';
import { Rig, PX } from './character.js';
import { QuadRig, paintQuad } from './quad.js';
import { paintPerson } from './mortals.js';
import { t as txt } from '../text_config.js';
import { HS, skinMat, group, sway } from './parts.js';

// The swarm kinds (also what world/roamZones.js counts as fodder).
export const FODDER_IDS = ['karpos', 'myrmex', 'myrmex_acid', 'crab', 'shade'];

// Stat blocks, in line with the other minors (rat 14 HP, spider 20, pup 32).
// tier/role/ai as in monsters.js MONSTERS.
export const FODDER_MONSTERS = {
  // a karpos: a grain spirit out of the fields; fast, frail, always in a mob
  karpos: { name: txt('monsters.karpos.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 5.4, dmg: 4, radius: 0.36, height: 0.95, ai: 'melee', range: 1.2, windup: 0.35, cd: 1.1, xp: 2, coins: [0, 2], model: 'karpos', pitch: 1.6, voice: 'rustle', knockResist: 0 },
  // a myrmex: a giant ant, nips and swarms
  myrmex: { name: txt('monsters.myrmex.name'), tier: 'minor', role: 'rusher', hp: 22, speed: 4.8, dmg: 6, radius: 0.45, height: 0.8, ai: 'melee', range: 1.4, windup: 0.4, cd: 1.2, xp: 2, coins: [0, 2], model: 'myrmex', pitch: 1.3, voice: 'chitter', knockResist: 0.1 },
  // an acid myrmex: hangs back a little and spits acid at short range (a puddle that burns a moment)
  myrmex_acid: { name: txt('monsters.myrmex_acid.name'), tier: 'minor', role: 'ranged', hp: 18, speed: 4.2, dmg: 6, radius: 0.45, height: 0.8, ai: 'ranged', range: 6.5, keep: 4, windup: 0.6, cd: 2.6, xp: 3, coins: [1, 2], model: 'myrmex_acid', pitch: 1.1, voice: 'chitter', projectile: 'acid', knockResist: 0.1 },
  // a giant crab: a little armour, a pinch that hurts; scuttles sideways
  crab: { name: txt('monsters.crab.name'), tier: 'minor', role: 'fodder', hp: 28, speed: 4, dmg: 6, radius: 0.55, height: 0.9, ai: 'melee', range: 1.6, windup: 0.45, cd: 1.3, xp: 3, coins: [1, 3], model: 'crab', pitch: 1, voice: 'clack', armor: 0.1, knockResist: 0.3 },
  // a shade: slow, frail, but many of them
  shade: { name: txt('monsters.shade.name'), tier: 'minor', role: 'fodder', hp: 16, speed: 2.4, dmg: 5, radius: 0.4, height: 1.8, ai: 'melee', range: 1.5, windup: 0.6, cd: 1.6, xp: 2, coins: [0, 2], model: 'shade', pitch: 0.9, voice: 'wail', knockResist: 0 },
};

// ---- death bits: a burst of the kind's own stuff as it falls (Enemy.die
// already throws the golden dust). The rig hears of its death through
// animate's 'death' action; rig.onTick (monsters.js) keeps its enemy.
const C = (c) => new THREE.Color(c);
const BITS = {
  karpos: [[C(0xe8c860), 16, false, 3.6, 0.13, 8], [C(0x9ab04a), 8, false, 2.6, 0.16, 6], [C(0x8aff3a), 5, true, 2, 0.12, -1]],
  myrmex: [[C(0x241c16), 12, false, 3.2, 0.15, 11], [C(0xc08a2c), 7, false, 3, 0.11, 11]],
  myrmex_acid: [[C(0x241c16), 10, false, 3.2, 0.15, 11], [C(0x9aff3a), 10, true, 3, 0.13, 9]],
  crab: [[C(0xd04a20), 14, false, 3.6, 0.15, 12], [C(0xf0e0c8), 5, false, 3, 0.1, 12], [C(0x9ad8ff), 8, false, 2.4, 0.1, 9]],
  shade: [[C(0x9ab8d8), 14, true, 1.2, 0.34, -1.2], [C(0xd8f0ff), 6, true, 0.8, 0.2, -2]],
};
const _c = new THREE.Vector3();
function deathBits(rig, kind) {
  const anim = rig.animate.bind(rig);
  rig.onTick = (dt, e) => { rig.enemy = e; };
  rig.animate = (p) => {
    if (p.action?.type === 'death' && !rig.burst && rig.enemy) {
      rig.burst = true;
      const e = rig.enemy, g = e.game;
      _c.set(e.pos.x, e.pos.y + e.height * 0.45, e.pos.z);
      for (const [color, count, additive, speed, size, gravity] of BITS[kind]) {
        g.particles?.burst(_c, { count, color, additive, speed, size, gravity, life: additive ? 0.9 : 0.7, drag: additive ? 2.5 : 1.2, up: additive ? 1.6 : 1, sizeEnd: additive ? 0.04 : size * 0.7, shape: additive ? 0 : 1, intensity: additive ? 1.6 : 1 });
      }
      if (kind === 'myrmex_acid') g.fx?.splat?.(_c, 0x9aff3a);
      g.audio?.fodderDie?.(kind);
    }
    anim(p);
  };
  return rig;
}
// a rig's skin box (or boxes) in a group, gone: the kit draws a cheaper one
function dropAll(rig, g) { for (const m of [...g.children]) if (m.isMesh) { g.remove(m); rig.meshes.splice(rig.meshes.indexOf(m), 1); } }
function dropOne(rig, m) { m.parent?.remove(m); const i = rig.meshes.indexOf(m); if (i >= 0) rig.meshes.splice(i, 1); }
// small parts cast no shadow (a horde of forty is a lot of shadow casters)
function noShadow(rig, ...groups) { for (const g of groups) for (const m of g.children) if (m.isMesh) m.castShadow = false; }

// ---- karpos ---------------------------------------------------------------------
// Knee-high: a bundle of wheat stalks bound into a body by twine, a skirt of
// corn husks, a head of plaited straw with hollow glowing green eyes and a
// crown of wheat ears, thin straw arms ending in grabby fingers.
function buildKarpos(K0) {
  const gold = 0xe0b850, goldL = 0xf4d878, goldD = 0xa87a2a, husk = 0xc8c27a, huskG = 0x9ab04a, huskD = 0x7a8a3a, twine = 0x6a4a22, eye = 0x8aff3a;
  const STRAW = [gold, goldL, goldD, 0xd0a040], HUSK = [husk, huskG, huskD, 0xd8d08a];
  const mat = skinMat('karpos', (S) => {
    paintPerson(S, { skin: gold, eye: 0x1a1406, eyeWhite: 0x1a1406, brow: goldD, mouth: false, top: husk, sleeve: gold, hand: gold, pants: goldD, shoes: false,
      face: (s, ey) => {
        for (let i = 0; i < 40; i++) s.dot(s.r() * 32, s.r() * 16, STRAW[i % 4], 1, 2);
        for (const x of [9, 13]) { s.rect(x, ey - 1, 2, 2, 0x1a1406, 0); s.rect(x, ey, 2, 1, eye, 0); }
        s.rect(10, ey + 3, 4, 1, twine, 0); for (const x of [10.5, 12, 13.5]) s.dot(x, ey + 2.5, twine, 1, 2);
      } });
    S.saturate(1.15);
  }, { emit: 1.4 });
  const rig = new Rig({ material: mat, scale: 0.55, legH: 7, bodyH: 9, bodyW: 7, bodyD: 5, armW: 2.4, headS: 8, jacket: false });
  const K = K0.kit(rig, mat, { seed: 101, rough: 0.85, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, H8 = 8 * HS;
  dropAll(rig, T); dropOne(rig, Hd.children.find((m) => m.isMesh && m !== rig.headMesh));   // (the hat layer)
  // body: a sheaf of stalks bound with twine, a husk skirt and husk shoulders
  K.box(T, 0, 4.6, 0, 7, 9.2, 5, gold);
  for (let x = -3; x <= 3; x += 1.5) K.box(T, x, 4.6, 2.6, 1, 9.4, 0.4, K.tone(STRAW, 0.1));
  for (const y of [2.2, 7]) K.box(T, 0, y, 0, 7.4, 0.8, 5.4, twine);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.flare(T, Math.sin(a) * 3.4, -0.6, Math.cos(a) * 2.4, 2.6, 5, 0.5, K.tone(HUSK, 0.12), a, 0.45); }
  for (const sx of [-1, 1]) K.box(T, sx * 3.6, 8.6, 0, 2.8, 1.2, 4.6, huskG, 0, 0, sx * 0.4);
  // head: straw plaits on top, husk leaves at the sides, a crown of wheat ears
  K.box(Hd, 0, H8 + 0.4, 0, H8 - 0.6, 0.8, H8 - 0.6, goldL);
  for (const sx of [-1, 1]) { K.box(Hd, sx * (H8 / 2 + 0.4), H8 * 0.6, -0.5, 0.6, 5, 4, huskG, 0, 0, sx * 0.5); K.box(Hd, sx * (H8 / 2 + 0.2), H8 * 0.35, 1.2, 0.5, 3.5, 2.6, husk, 0, 0, sx * 0.7); }
  for (let i = 0; i < 6; i++) {
    const x = -3 + i * 1.2, tilt = (i - 2.5) * 0.16, L = 3 + K.r() * 2;
    K.box(Hd, x, H8 + 0.8 + L / 2, -0.4 + (i % 2), 0.5, L, 0.5, huskD, 0, 0, -tilt);
    K.box(Hd, x - Math.sin(tilt) * L, H8 + 1.2 + L + 1.2, -0.4 + (i % 2), 1.3, 2.8, 1.3, K.tone([goldL, gold], 0.1), 0, 0, -tilt);
  }
  // straw arms with three grabby fingers
  for (const arm of [rig.armR, rig.armL]) {
    dropAll(rig, arm);
    K.box(arm, 0, -3.6, 0, 1.6, 9, 1.6, gold); K.box(arm, 0, -1, 0, 2.2, 1, 2.2, twine);
    for (const [dx, rz] of [[-0.7, 0.35], [0, 0], [0.7, -0.35]]) K.box(arm, dx, -9.4, 0.4, 0.5, 2.8, 0.5, goldD, 0.3, 0, rz);
  }
  // legs: bundled stalks splaying into root feet
  for (const leg of [rig.legR, rig.legL]) {
    dropAll(rig, leg);
    K.box(leg, 0, -3.4, 0, 2.6, 6.8, 2.6, goldD); K.box(leg, 0, -6.6, 0.6, 3.2, 1, 4, huskD);
  }
  K.done();
  noShadow(rig, rig.armR, rig.armL, rig.legR, rig.legL, Hd);
  return deathBits(rig, 'karpos');
}

// ---- myrmex ---------------------------------------------------------------------
// A dog-sized ant: glossy black chitin banded in bronze, a round head with
// amber eyes, elbowed antennae and bronze pincers, a narrow waist and a big
// banded abdomen; six thin bent legs. acid: a glowing green acid sac in the
// abdomen and green dripping from the pincers.
function buildMyrmex(K0, acid = false) {
  const blk = 0x1e1a18, blkL = 0x3a3430, brz = 0xc08a2c, brzD = 0x7a4e14, brzL = 0xe8b448, amber = 0xffa020, ACID = 0x9aff3a;
  const mat = skinMat('myrmex', (S) => { paintQuad(S, { base: blk, dark: 0x0e0c0a, belly: 0x2a2420, back: blkL, eye: amber, eyeLow: 0xff6a10, plates: brz, teeth: false, nose: blk, noise: 0.12, speckles: 10 }); S.saturate(1.1); }, { rough: 0.3, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.0, bodyL: 6, bodyW: 5, bodyH: 4, legH: 4.5, legW: 1.1, headS: 5, legs: 6, splay: 1.15, footL: 5, kneeOut: 0.35, legY: 1, snout: false, neckUp: 0.6, headZ: 0.6, gait: 1.9, ears: false });
  const K = K0.kit(rig, mat, { seed: acid ? 107 : 103, rough: 0.3, metal: 0.15, emit: 0.9 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, { hs, legW } = rig.dims;
  dropAll(rig, T); dropAll(rig, Hd);
  // thorax with a bronze saddle plate, a narrow waist, the banded abdomen
  K.box(T, 0, 0, 0, 5, 4, 6, blk); K.box(T, 0, 2.2, 0, 3.6, 0.6, 4.6, brz); K.box(T, 0, 2.6, 0.4, 1.4, 0.4, 2.6, brzL);
  K.box(T, 0, 0.4, -3.8, 2, 2, 2, blkL);
  const ab = [0, 1.2, -9];
  K.box(T, ab[0], ab[1], ab[2], 7, 6, 9, blk); K.box(T, ab[0], ab[1] + 0.2, ab[2], 7.8, 4.6, 7, blk); K.box(T, ab[0], ab[1], ab[2], 5.4, 7.2, 7.4, blk);
  for (const dz of [-2.4, 0, 2.4]) K.box(T, 0, ab[1] + 0.2, ab[2] + dz, 8, 5, 0.7, dz ? brz : brzD);
  K.box(T, 0, ab[1] + 3.7, ab[2] + 1, 2.4, 0.3, 3, blkL);
  if (acid) { K.box(T, 0, ab[1] - 0.4, ab[2] - 4.7, 3.2, 3.2, 0.6, ACID); K.box(T, 0, ab[1] + 3.65, ab[2] - 1.6, 3, 0.4, 2.4, ACID); }
  // head: round black head, bronze brow, amber eyes, elbowed antennae
  const hz = hs * 0.35;
  K.box(Hd, 0, 0, hz, hs, hs * 0.9, hs, blk); K.box(Hd, 0, hs * 0.48, hz - 0.2, hs * 0.8, 0.6, hs * 0.7, brz);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * hs * 0.5, hs * 0.1, hz + 0.8, 0.6, 1.6, 1.8, amber); K.box(Hd, sx * hs * 0.52, hs * 0.22, hz + 1.1, 0.4, 0.6, 0.6, 0xfff0a0);
    K.box(Hd, sx * 1.1, hs * 0.5 + 1.6, hz + 1.6, 0.5, 3.4, 0.5, blkL, 0.5, 0, sx * -0.3);
    K.box(Hd, sx * 1.9, hs * 0.5 + 3.2, hz + 4, 0.45, 0.45, 3.4, blkL, -0.3, sx * 0.25, 0);
  }
  // pincers: two curved bronze mandibles
  for (const sx of [-1, 1]) {
    K.box(M, sx * 1.2, 0, 1.4, 1, 0.9, 2.8, brz, 0, -sx * 0.35, 0); K.box(M, sx * 0.5, 0, 2.8, 0.8, 0.8, 1.4, brzL, 0, sx * 0.7, 0);
    if (acid) K.box(M, sx * 0.4, -0.9, 2.6, 0.4, 1.4, 0.4, ACID);
  }
  // six thin bent legs: a black thigh, a bronze knee, a black shin
  for (const leg of rig.legs) {
    const u = leg.userData; leg.rotation.y = -u.side * (0.55 - u.row * 0.55);
    const k = u.knee; dropAll(rig, leg); dropAll(rig, k);
    K.box(leg, 0, -2.2, 0, legW, 4.5, legW, blk); K.boxZ(k, 0, 0, 0, 1.6, 1.6, 1.6, brzD);
    K.boxZ(k, 0, -2.6, 0, legW * 0.8, 5.2, legW * 0.8, blkL); K.boxZ(k, 0, -5, 0, 0.6, 0.8, 0.6, brz);
  }
  K.done();
  noShadow(rig, Hd, M, ...rig.legs);
  return deathBits(rig, acid ? 'myrmex_acid' : 'myrmex');
}

// ---- crab -----------------------------------------------------------------------
// A waist-high red shore crab, broadside on to the way it walks: the rig's
// long axis is the crab's width, so it scuttles sideways with the big claw
// leading. Orange-red shell with barnacles, eyes on stalks, eight legs, one
// huge raised claw (its lower finger is the rig's jaw: it snaps) and a small one.
function buildCrab(K0) {
  const red = 0xd04a20, redD = 0x8a2410, redL = 0xf07a3a, cream = 0xf0d8b0, tip = 0x2a1410, barn = 0xe8e0cc, barnD = 0xa8a090;
  const SHELL = [red, 0xc04018, 0xe05a28];
  const mat = skinMat('crab', (S) => { paintQuad(S, { base: red, dark: redD, belly: cream, back: redL, eye: 0x0a0a0a, eyeLow: 0x0a0a0a, teeth: false, nose: redD, noise: 0.15, speckles: 30 }); S.saturate(1.15); }, { rough: 0.45, emit: 0.9 });
  const rig = new QuadRig({ material: mat, scale: 1.4, bodyL: 11, bodyW: 7, bodyH: 3.6, legH: 4, legW: 1.2, headS: 4, legs: 4, splay: 0, snout: false, neckUp: 0.4, headZ: -1.5, gait: 2.4, ears: false, jawOpen: 0.15 });
  const K = K0.kit(rig, mat, { seed: 109, rough: 0.45, emit: 0.8 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth;
  dropAll(rig, T); dropAll(rig, Hd);
  // the shell: a wide low carapace with a raised dome, a rim and barnacles
  K.box(T, 0, 0, 0, 7, 3.4, 11, red); K.box(T, 0, 1.9, 0, 5.4, 1, 8.6, redL); K.box(T, -0.4, 2.5, 0, 3.4, 0.5, 5.6, red);
  K.box(T, 0, -1.9, 0, 6.4, 0.6, 9.6, cream);
  for (const [x, z, s] of [[-1.4, 2.4, 1.3], [-2.2, -2.8, 1], [0.6, -1.4, 0.9], [-0.6, 3.8, 0.8]]) { K.box(T, x, 2.3 + s * 0.3, z, s, s * 0.8, s, barn); K.box(T, x, 2.4 + s * 0.6, z, s * 0.4, 0.3, s * 0.4, barnD); }
  for (let i = 0; i < 5; i++) K.box(T, 3.6, 0.6, -3.6 + i * 1.8, 0.4, 1, 1, K.tone(SHELL, 0.1));
  // face on the +x side: eyes on stalks, mouth parts, a small claw at the back end
  for (const dz of [-1.2, 1.2]) { K.box(T, 2.8, 3, dz, 0.6, 2.4, 0.6, redD); K.box(T, 2.9, 4.4, dz, 1.1, 1.1, 1.1, 0x0a0a0a); K.box(T, 3.3, 4.7, dz + 0.3, 0.3, 0.3, 0.3, 0xffffff); }
  K.box(T, 3.7, -0.6, 0, 0.6, 1.4, 2.6, redD);
  K.box(T, 3.2, -0.2, -5.4, 1.8, 1.6, 3, red, 0, 0.5, 0); K.box(T, 3.8, -0.1, -7, 2, 1.8, 2.4, redL, 0, 0.5, 0); K.box(T, 4.4, -0.1, -8.2, 0.8, 0.8, 1.4, tip, 0, 0.5, 0);
  // the big claw, raised at the leading end: an arm, a fat palm and a fixed
  // upper finger; the jaw carries the lower finger, so the bite snaps it
  const cx = 2.6;
  K.box(Hd, cx, 1.2, 0.6, 2, 2, 3.6, red, -0.6); K.box(Hd, cx, 3.6, 2.4, 2.2, 3.6, 2, redD, -0.2);
  K.box(Hd, cx, 6.2, 3.6, 3.6, 3.8, 4.6, red); K.box(Hd, cx + 0.2, 7.4, 3.6, 3, 1, 4, redL);
  K.box(Hd, cx, 7.2, 7.4, 2.4, 1.8, 3.6, red); K.box(Hd, cx, 6.6, 9.2, 1.6, 1.2, 1.4, tip);
  for (const z of [6.6, 8]) K.box(Hd, cx, 6.2, z, 0.8, 0.5, 0.6, cream);
  M.position.set(cx * PX, 4.6 * PX, 5.6 * PX);
  K.box(M, 0, 0, 2, 2.2, 1.6, 4, redL); K.box(M, 0, 0.2, 4.4, 1.4, 1.1, 1.4, tip); K.box(M, 0, 0.9, 2.4, 0.7, 0.5, 0.6, cream);
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
  return deathBits(rig, 'crab');
}

// ---- shade ----------------------------------------------------------------------
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
  dropAll(rig, T); dropOne(rig, Hd.children.find((m) => m.isMesh && m !== rig.headMesh));
  for (const leg of [rig.legR, rig.legL]) dropAll(rig, leg);
  // the robe: a body, a ragged hem hanging down past where legs would be
  K.box(T, 0, 6, 0, 8.4, 12, 4.6, SH[0]); K.box(T, 0, 11.2, 0, 9.6, 1.8, 5.4, SH[3]);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, L = 5 + K.r() * 4; K.flare(T, Math.sin(a) * 4, -L / 2 + 0.6, Math.cos(a) * 2.4, 2.8, L, 0.6, K.tone(SH, 0.12), a, 0.12); }
  // hood: a cowl round the hollow face
  K.box(Hd, 0, H8 + 0.5, -0.4, H8 + 1, 1.2, H8 + 0.4, hood);
  for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 + 0.5), H8 / 2, -0.2, 1, H8 + 1, H8 + 0.8, SH[1]);
  K.box(Hd, 0, H8 / 2, -H8 / 2 - 0.8, H8 + 2, H8 + 1, 1, hood);
  K.box(Hd, 0, H8 + 0.1, H8 / 2 + 0.5, H8 + 1, 1.6, 1, SH[3]);
  for (const sx of [-1, 1]) K.box(Hd, sx * 1.9 * HS, 4.4 * HS, 4 * HS + 0.2, 1, 0.9, 0.3, pale);
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
  return deathBits(rig, 'shade');
}

// The model builders, keyed by model id: monsters.js passes its voxel kit in.
export function fodderModels(K0) {
  return {
    karpos: () => buildKarpos(K0),
    myrmex: () => buildMyrmex(K0),
    myrmex_acid: () => buildMyrmex(K0, true),
    crab: () => buildCrab(K0),
    shade: () => buildShade(K0),
  };
}
