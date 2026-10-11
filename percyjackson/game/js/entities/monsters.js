// The Greek monster bestiary: blocky models (procedurally painted skins,
// shared per kind so spawning never compiles shaders) and stat blocks.
// Tiers: minor (swarms, two or three hits), elite (a threat with a tell),
// champion (mini-boss), boss (see bosses.js). Monsters never bleed: they
// burst into golden dust (goldDust below).
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';
import { QuadRig, paintQuad } from './quad.js';
import { paintPerson, solidMat } from './mortals.js';

const solid = solidMat;
const HS = 1.12;

const cache = new Map();
function skinMat(id, painter, opts = {}) {
  if (cache.has(id)) return cache.get(id);
  const S = new Skin(id.length * 131 + 7);
  painter(S);
  const m = makeCharMaterial(S.texture(), { emitStrength: opts.emit ?? 3.2, roughness: opts.rough ?? 0.7, fill: opts.fill ?? 0.16 });
  m.alphaTest = 0.5;
  cache.set(id, m);
  return m;
}
function prop(rig, parent, w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = rig.mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mat);
  m.position.set(x * PX, y * PX, z * PX); m.rotation.set(rx, ry, rz); parent.add(m); return m;
}

// ---- shared parts -----------------------------------------------------------
// Wings on the upper back: two segments per side that flap in rig.tick.
// kind 'feather' (harpy) or 'bat' (Fury).
export function addWings(rig, { span = 14, chord = 9, mat, tip, kind = 'bat', y = 10, flap = 1 } = {}) {
  const wings = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group(); root.position.set(side * 2 * PX, y * PX, -2.6 * PX); rig.torso.add(root);
    const inner = prop(rig, root, span * 0.55, chord, 0.8, mat, side * span * 0.275, -chord * 0.3, 0);
    const elbow = new THREE.Group(); elbow.position.set(side * span * 0.55 * PX, 0, 0); root.add(elbow);
    prop(rig, elbow, span * 0.5, chord * 0.85, 0.6, tip ?? mat, side * span * 0.25, -chord * 0.4, 0);
    if (kind === 'bat') for (let i = 0; i < 3; i++) prop(rig, elbow, 0.8, chord * 0.5, 1, solid(0x2a1a14), side * (2 + i * 2.6), -chord * (0.75 + i * 0.05), 0);
    else for (let i = 0; i < 4; i++) prop(rig, elbow, 1.6, 3, 0.6, tip ?? mat, side * (span * 0.5 - i * 1.6), -chord * 0.85 - 1.5, 0);
    root.rotation.y = side * 0.35;
    wings.push({ root, elbow, side });
  }
  rig.extras.wings = wings; rig.wingFlap = flap;
  return wings;
}
// Fiery whip from the right hand: a chain of glowing segments.
export function addWhip(rig, { segs = 7, len = 3.2, color = 0xff7a1a, hand = rig.handR } = {}) {
  const chain = [];
  let parent = new THREE.Group(); parent.position.set(0, -1 * PX, 0); hand.add(parent);
  prop(rig, parent, 1.6, 4, 1.6, solid(0x3a2414), 0, -1, 0); // handle
  const fire = solid(color, 3.5);
  for (let i = 0; i < segs; i++) {
    const g = new THREE.Group(); g.position.y = (i === 0 ? -3 : -len) * PX; parent.add(g);
    prop(rig, g, 0.9 - i * 0.05, len, 0.9 - i * 0.05, fire, 0, -len / 2, 0);
    chain.push(g); parent = g;
  }
  rig.extras.whip = chain; rig.extras.whipTip = parent;
  return chain;
}
export function animateExtras(rig, dt, e) {
  const t = rig.t ?? 0;
  const W = rig.extras.wings;
  if (W) {
    const fast = e?.state === 'windup' || e?.swooping ? 2 : 1;
    const f = Math.sin(t * 9 * fast * (rig.wingFlap ?? 1));
    for (const w of W) { w.root.rotation.z = w.side * (0.25 + f * 0.55); w.elbow.rotation.z = w.side * (0.1 + Math.max(0, f) * 0.5); }
  }
  const C = rig.extras.whip;
  if (C) {
    const crack = e?.state === 'recover' || e?.whipCrack > 0 ? 1 : 0;
    for (let i = 0; i < C.length; i++) { C[i].rotation.x = Math.sin(t * 5 - i * 0.7) * 0.25 + (crack ? -0.35 : 0.12); C[i].rotation.z = Math.sin(t * 3.3 - i * 0.9) * 0.2; }
  }
  const T = rig.extras.tails;
  if (T) for (const tail of T) for (let i = 0; i < tail.segs.length; i++) tail.segs[i].rotation.y = Math.sin(t * 3 + i * 0.8 + tail.ph) * 0.35;
}

// ---- model builders ----------------------------------------------------------
const DOG = (S) => paintQuad(S, { base: 0x1e1c22, dark: 0x0e0d10, belly: 0x2a262c, eye: 0xff2a1a, eyeLow: 0xff8a3a, nose: 0x050505, speckles: 30 });
const MODELS = {
  pup: () => {
    const rig = new QuadRig({ material: skinMat('pup', DOG), scale: 0.95, bodyL: 11, bodyW: 6, bodyH: 6, legH: 6, legW: 2.6, headS: 6.5, ears: true, tail: 2, tailLen: 5, tailW: 1.6 });
    return rig;
  },
  hellhound: () => {
    const rig = new QuadRig({ material: skinMat('hellhound', (S) => paintQuad(S, { base: 0x1a181c, dark: 0x0a090b, belly: 0x26222a, eye: 0xff1a0a, eyeLow: 0xffb04a, back: 0x121014, speckles: 60, brow: 0x0a0a0a })), scale: 2.5, bodyL: 13, bodyW: 7, bodyH: 7, legH: 7, legW: 3, headS: 7, ears: true, tail: 3, tailLen: 6, tailW: 1.8, gait: 0.75 });
    // smouldering ridge along the back
    for (let i = 0; i < 4; i++) prop(rig, rig.torso, 1.2, 1.4, 1.2, solid(0xff4a1a, 1.6), 0, 3.8, 4 - i * 2.6);
    return rig;
  },
  spider: () => {
    const rig = new QuadRig({ material: skinMat('spider', (S) => paintQuad(S, { base: 0xb07a3a, dark: 0x6a4a22, belly: 0x5a3a1a, eye: 0x6ad8ff, eyeLow: 0x2a8aff, eyes: [[9, 11], [13, 11], [10, 9], [12, 9]], plates: 0xd8a85a, extra: 0xa06a2a, teeth: false, nose: 0x6a4a22, noise: 0.25 }), { rough: 0.35 }), scale: 0.72, bodyL: 7, bodyW: 6, bodyH: 4, legH: 8, legW: 1.4, headS: 5, legs: 8, splay: 0.95, snout: false, neckUp: -1, gait: 1.6 });
    // round clockwork abdomen with a wind-up key
    const ab = rig.mesh(new THREE.BoxGeometry(9 * PX, 7 * PX, 10 * PX), rig.material); ab.position.set(0, 1.5 * PX, -8 * PX); rig.torso.add(ab);
    prop(rig, ab, 1, 4, 1, solid(0xd8a85a, 0, 0.35, 0.35), 0, 5, 0);
    prop(rig, ab, 5, 2, 0.8, solid(0xd8a85a, 0, 0.35, 0.35), 0, 7, 0);
    rig.extras.key = ab.children[ab.children.length - 1];
    // fangs
    for (const sx of [-1, 1]) prop(rig, rig.mouth, 0.8, 2.2, 0.8, solid(0xe8d0a0, 0, 0.35, 0.3), sx * 1.2, -1, 0.4);
    return rig;
  },
  automaton: () => {
    const rig = new QuadRig({ material: skinMat('automaton', (S) => paintQuad(S, { base: 0xa8742e, dark: 0x5a3a14, belly: 0x4a2e10, eye: 0x8aff5a, eyes: [[9, 11], [13, 11]], plates: 0xe0b060, teeth: false, nose: 0x3a2a10, noise: 0.22 }), { rough: 0.35 }), scale: 1.05, bodyL: 10, bodyW: 9, bodyH: 5, legH: 4, legW: 1.6, headS: 5, legs: 6, splay: 0.7, snout: false, neckUp: -1.5, gait: 1.4 });
    // two mandibles and the Greek-fire pot strapped to its shell
    for (const sx of [-1, 1]) prop(rig, rig.mouth, 1, 1, 4, solid(0xd8a85a, 0, 0.35, 0.35), sx * 1.6, 0, 1.6, 0, -sx * 0.4, 0);
    const pot = new THREE.Group(); pot.position.set(0, 3.5 * PX, -1 * PX); rig.torso.add(pot);
    prop(rig, pot, 6, 5, 6, solid(0x6a4a2a, 0, 0.8), 0, 2.5, 0);
    prop(rig, pot, 4, 1, 4, solid(0x6a4a2a, 0, 0.8), 0, 5.5, 0);
    const fire = prop(rig, pot, 4.6, 4, 4.6, solid(0x6aff3a, 2.6), 0, 3, 0); fire.scale.set(1.02, 0.6, 1.02);
    prop(rig, pot, 3, 1.5, 3, solid(0xaaff6a, 3.5), 0, 6.4, 0);
    rig.extras.pot = pot; rig.extras.fire = fire;
    return rig;
  },
  harpy: () => {
    const mat = skinMat('harpy', (S) => paintPerson(S, { skin: 0xd8b48a, hair: 0x6a4a2a, hairVolume: true, fringe: 3, hairSide: 6, hairBack: 7, eye: 0xffc81a, eyeWhite: 0xfff2a0, scowl: true, grin: true, top: 0x8a6a4a, dots: 0x5a3e24, sleeve: 0x8a6a4a, hand: 0x8a6a4a, legR: 0xe0a830, legL: 0xe0a830, shoes: 0x3a2a1a, skirt: 0x7a5a3a, skirtLen: 6 }), { emit: 2.4 });
    const rig = new Rig({ material: mat, scale: 0.95, armW: 3, legH: 9 });
    rig.legR.scale.set(0.45, 1, 0.45); rig.legL.scale.set(0.45, 1, 0.45);
    const claw = solid(0x3a2a1a);
    for (const leg of [rig.legR, rig.legL]) for (const dx of [-1.6, 0, 1.6]) prop(rig, leg, 1.2 / 0.45, 1, 3 / 0.45, claw, dx / 0.45, -9, 1.5 / 0.45);
    rig.armR.visible = rig.armL.visible = false;
    addWings(rig, { span: 16, chord: 9, mat: solid(0x8a6a4a), tip: solid(0x5a4028), kind: 'feather', y: 11 });
    const hairM = solid(0x6a4a2a);
    for (const [x, z, rz] of [[-3, 1, 0.8], [3, 1, -0.8], [0, -3, 0], [-2, -2, 0.4], [2, -2, -0.4]]) prop(rig, rig.head, 2.4, 4, 2.4, hairM, x * HS, 8.4 * HS, z * HS, 0, 0, rz);
    rig.float = 0.9;
    return rig;
  },
  fury: () => {
    const mat = skinMat('fury', (S) => paintPerson(S, { skin: 0x8a7a6a, hair: 0xb8b8b0, hairVolume: true, fringe: 2, hairSide: 5, hairBack: 7, eye: 0xff2a0a, eyeWhite: 0xffd84a, scowl: true, wrinkles: 0x5a4a3a, fangs: 0xf4f0e0, grin: true, top: 0x1a1418, sleeve: 0x7a6a5a, hand: 0x7a6a5a, pants: 0x1a1418, skirt: 0x1a1418, skirtLen: 12, shoes: 0x5a4a3a }), { emit: 3 });
    const rig = new Rig({ material: mat, scale: 1.0, bodyW: 7, armW: 3, legH: 9 });
    rig.legR.visible = rig.legL.visible = false;
    const rag = solid(0x1a1418);
    for (let i = 0; i < 5; i++) prop(rig, rig.hips, 2, 7 + (i % 2) * 3, 2, rag, -3.2 + i * 1.6, -3.5 - (i % 2), (i % 2) - 0.5);
    addWings(rig, { span: 15, chord: 8, mat: solid(0x3a2a24), tip: solid(0x2a1c18), kind: 'bat', y: 10.5 });
    addWhip(rig, { segs: 6, len: 3 });
    rig.hunch = 0.12;
    rig.float = 0.8;
    return rig;
  },
  dracaena: () => {
    const mat = skinMat('dracaena', (S) => paintPerson(S, { skin: 0x5a9a5a, hair: 0x1e3a24, fringe: 1, hairSide: 2, eye: 0xffe04a, eyeWhite: 0x1a1a0a, fangs: 0xf4f0e0, mouth: false, top: 0xb88a3a, buttons: 0xe8c060, trim: 0x8a6420, sleeve: 0x5a9a5a, collar: 0xe8c060, pants: 0x3a7a3a }), { emit: 2.4, rough: 0.5 });
    const rig = new Rig({ material: mat, scale: 1.3, bodyW: 9, bodyD: 5, armW: 4, legH: 8 });
    rig.legR.visible = rig.legL.visible = false;
    // two snake tails instead of legs
    const scale = solid(0x3a7a3a, 0, 0.5), belly = solid(0xc8d08a, 0, 0.6);
    rig.extras.tails = [];
    for (const side of [-1, 1]) {
      let parent = new THREE.Group(); parent.position.set(side * 2 * PX, 0, 0); rig.hips.add(parent);
      const segs = [];
      const shape = [[4, 8, 4, 0, -4, 0, 0], [3.6, 3.6, 7, 0, -7, -2.8, 0], [3, 3, 7, 0, 0, -6.5, 0], [2.2, 2.2, 6, 0, 0, -6.5, 0]];
      for (let i = 0; i < shape.length; i++) {
        const [w, h, d, x, y, z] = shape[i];
        const g = new THREE.Group(); if (i) g.position.set(x * PX, (i === 1 ? -6.4 : 0) * PX, (i === 1 ? 0 : -6.5) * PX); parent.add(g);
        prop(rig, g, w, h, d, scale, 0, i === 0 ? -4 : 0, i === 0 ? 0 : -d / 2);
        if (i > 0) prop(rig, g, w * 0.7, 0.4, d * 0.9, belly, 0, -h / 2 - 0.2, -d / 2);
        segs.push(g); parent = g;
      }
      segs[0].rotation.z = side * 0.12;
      rig.extras.tails.push({ segs: segs.slice(1), ph: side });
    }
    // bronze spear and round shield
    const spear = new THREE.Group(); rig.handR.add(spear); spear.rotation.x = -1.2;
    prop(rig, spear, 1, 34, 1, solid(0x6a4a2a), 0, 6, 0);
    prop(rig, spear, 2.4, 5, 0.8, solid(0xd8a85a, 0, 0.35, 0.35), 0, 25, 0);
    const shield = new THREE.Group(); shield.position.set(1 * PX, -5 * PX, 3 * PX); rig.handL.add(shield);
    prop(rig, shield, 12, 12, 1.6, solid(0xc9963a, 0, 0.4, 0.35), 0, 0, 0);
    prop(rig, shield, 8, 8, 0.6, solid(0x0f6f73, 0, 0.5), 0, 0, 1);
    prop(rig, shield, 3, 3, 0.8, solid(0xc9963a, 0, 0.35, 0.35), 0, 0, 1.4);
    rig.extras.shield = shield;
    // helmet crest
    prop(rig, rig.head, 8.6 * HS, 2, 8.6 * HS, solid(0xc9963a, 0, 0.4, 0.35), 0, 8 * HS, 0);
    prop(rig, rig.head, 1.4, 4, 7 * HS, solid(0xb8232f), 0, 10.4 * HS, 0);
    rig.hunch = 0.1;
    return rig;
  },
  empousa: () => {
    const mat = skinMat('empousa', (S) => paintPerson(S, { skin: 0xe2ccbc, hair: 0xff7a1a, fringe: 2, hairSide: 3, eye: 0xff1a1a, eyeWhite: 0xffe0e0, fangs: 0xffffff, grin: true, lipstick: 0xc8203a, top: 0xc8203a, collar: 0xdcd0b8, trim: 0xdcd0b8, sleeve: 0xe2ccbc, skirt: 0xdcd0b8, skirtLen: 5, legR: 0xc9963a, legL: 0x6a5a4a, shoes: 0x2a2018 }), { emit: 2.8 });
    const rig = new Rig({ material: mat, scale: 1.1, bodyW: 7, armW: 3 });
    // flaming hair: glowing strands that sway (rig strand physics)
    const flame = solid(0xff7a1a, 3), flame2 = solid(0xffd84a, 3.5);
    const strands = [[-2.5, 8, 0, 3, 5, 3, 0.4], [0, 8.5, 0, 3, 6, 3, 0], [2.5, 8, 0, 3, 5, 3, -0.4], [0, 7.5, -3, 5, 6, 2, -0.6]];
    let i = 0;
    for (const [x, y, z, w, h, d, rz] of strands) {
      const piv = new THREE.Group(); piv.position.set(x * PX * HS, y * PX * HS, z * PX * HS);
      const hm = rig.mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX).translate(0, h * PX / 2, 0), i++ % 2 ? flame2 : flame);
      hm.rotation.z = rz; piv.add(hm); rig.head.add(piv);
      rig.strands.push({ g: piv, ax: 0, az: 0, vx: 0, vz: 0, stiff: 50, base: [0, 0] });
    }
    // bronze leg sheen and a donkey hoof
    prop(rig, rig.legR, 4.3, 6, 4.3, solid(0xc9963a, 0, 0.35, 0.35), 0, -8, 0);
    prop(rig, rig.legL, 4.4, 2.4, 4.4, solid(0x2a2018), 0, -11, 0.2);
    // pom-poms
    prop(rig, rig.handR, 4, 4, 4, solid(0xc8203a, 0.4), 0, -2, 0);
    prop(rig, rig.handL, 4, 4, 4, solid(0xf4ead5, 0.3), 0, -2, 0);
    rig.extras.flame = true;
    return rig;
  },
};

// ---- stat blocks -------------------------------------------------------------
// ai: melee | ranged | tank | teleport | summon | blob
// tier: minor | elite | champion | boss
// aura: 'smoke' | 'fire' | 'greekfire' | 'spark' | null  (ambient particles)
// dust: colour of the golden death burst
export const MONSTERS = {
  pup: { name: 'Hellhound Pup', tier: 'minor', hp: 32, speed: 5, dmg: 7, radius: 0.45, height: 1.1, ai: 'melee', range: 1.5, windup: 0.4, cd: 1.1, xp: 3, coins: [1, 3], model: 'pup', pitch: 1.5, voice: 'bark' },
  spider: { name: 'Bronze Spider', tier: 'minor', hp: 20, speed: 5.8, dmg: 5, radius: 0.38, height: 0.8, ai: 'melee', range: 1.3, windup: 0.35, cd: 1, xp: 2, coins: [0, 2], model: 'spider', pitch: 2.2, voice: 'click', aura: 'spark' },
  harpy: { name: 'Wild Harpy', tier: 'minor', hp: 40, speed: 3.8, dmg: 8, radius: 0.4, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.55, cd: 2.1, xp: 5, coins: [2, 4], model: 'harpy', pitch: 1.3, projectile: 'feather', voice: 'screech' },
  automaton: { name: 'Greek-Fire Automaton', tier: 'minor', hp: 30, speed: 3.9, dmg: 26, radius: 0.55, height: 1.1, ai: 'blob', range: 1.8, windup: 0.9, cd: 0, xp: 4, coins: [1, 4], model: 'automaton', pitch: 1.8, aura: 'greekfire', blast: 0x6aff3a },
  fury: { name: 'Fury', tier: 'elite', hp: 95, speed: 3.8, dmg: 13, radius: 0.45, height: 2.1, ai: 'teleport', range: 2.2, windup: 0.45, cd: 1.6, xp: 10, coins: [4, 7], model: 'fury', pitch: 1.1, puff: 0x3a2a24, slashColor: 0xff8a2a, voice: 'screech' },
  dracaena: { name: 'Dracaena', tier: 'elite', hp: 190, speed: 2.4, dmg: 18, radius: 0.8, height: 2.6, ai: 'tank', range: 2.6, windup: 0.85, cd: 2.2, xp: 12, coins: [5, 9], model: 'dracaena', armor: 0.25, shield: true, knockResist: 0.75, pitch: 0.8, voice: 'hiss' },
  hellhound: { name: 'Hellhound', tier: 'elite', hp: 220, speed: 3.6, dmg: 20, radius: 1.1, height: 2.6, ai: 'melee', range: 2.6, windup: 0.7, cd: 1.8, xp: 14, coins: [6, 10], model: 'hellhound', knockResist: 0.7, superArmor: true, pitch: 0.5, aura: 'smoke', voice: 'bark' },
  empousa: { name: 'Empousa', tier: 'elite', hp: 160, speed: 2.6, dmg: 10, radius: 0.5, height: 2.3, ai: 'summon', range: 9, keep: 8, windup: 1.0, cd: 5, xp: 16, coins: [8, 14], model: 'empousa', knockResist: 0.4, pitch: 1.2, summons: 'pup', aura: 'fire', projectile: 'fire', voice: 'screech' },
};
// Old Cursed Dungeons kinds still requested by shared code (wave spawner,
// level tables) map onto the Greek bestiary.
export const LEGACY_KINDS = { swarmer: 'pup', imp: 'pup', spitter: 'harpy', blob: 'automaton', tank: 'dracaena', teleporter: 'fury', summoner: 'empousa' };
for (const [old, now] of Object.entries(LEGACY_KINDS)) Object.defineProperty(MONSTERS, old, { value: MONSTERS[now], enumerable: false });
export const MONSTER_IDS = Object.keys(MONSTERS);
export const CURSES = MONSTERS;
export const resolveKind = (kind) => (MONSTERS[kind] ? (LEGACY_KINDS[kind] ?? kind) : 'pup');

export function buildMonsterModel(model) { const rig = MODELS[model](); rig.tick = (dt, e) => animateExtras(rig, dt, e); return rig; }
export const buildCurseModel = buildMonsterModel;

// Golden dust: how every monster leaves the world.
export function goldDust(g, pos, h = 1.5, { color = 0xffd84a, big = false } = {}) {
  const n = big ? 2 : 1;
  g.particles.burst(pos, { count: 34 * n, color, speed: 3.2 * n, life: 1.0, size: 0.16, drag: 2.5, up: 0.9, gravity: -0.6, sizeEnd: 0.05, shape: 1 });
  g.particles.burst(pos, { count: 18 * n, color: 0xc9963a, additive: false, speed: 2 * n, life: 1.2, size: 0.45 * h, sizeEnd: 1.8, drag: 3, up: 0.5, intensity: 1.2 });
  g.particles.burst(pos, { count: 1, color: 0xfff2a0, speed: 0, life: 0.2, size: 2.4 * h, drag: 0, sizeEnd: 1.4, intensity: 1.4 });
  g.fx.rings.spawn(new THREE.Vector3(pos.x, g.fx.groundY(pos) + 0.06, pos.z), { color, r1: 2 * n, dur: 0.45, thick: 0.2 });
  g.lights.flash(pos, color, 5 * n, 6 * n, 0.3);
}
// Golden puff of Mist when a disguise falls away.
export function mistPuff(g, pos, h = 1.8) {
  const c = new THREE.Vector3(pos.x, pos.y + h * 0.5, pos.z);
  g.particles.burst(c, { count: 30, color: 0xf4ead5, additive: false, speed: 2.6, life: 0.9, size: 0.6, sizeEnd: 2.2, drag: 3, up: 0.6, intensity: 1 });
  g.particles.burst(c, { count: 26, color: 0xffd84a, speed: 4, life: 0.7, size: 0.14, drag: 3, up: 0.8, shape: 1 });
  g.fx.rings.spawn(new THREE.Vector3(pos.x, g.fx.groundY(pos) + 0.06, pos.z), { color: 0xffd84a, r0: 0.3, r1: 2.4, dur: 0.5, thick: 0.25 });
  g.lights.flash(c, 0xffd84a, 6, 7, 0.35);
}

// Elite outline: an inverted-hull shell per mesh with a shared glow material.
const eliteMats = new Map();
export function eliteMaterial(color) {
  if (!eliteMats.has(color)) {
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.8, depthWrite: false });
    m.color = new THREE.Color(color).multiplyScalar(3);
    eliteMats.set(color, m);
  }
  return eliteMats.get(color);
}
export function addEliteShell(rig, color) {
  const mat = eliteMaterial(color);
  for (const m of [...rig.meshes]) {
    const shell = new THREE.Mesh(m.geometry, mat);
    shell.scale.copy(m.scale).multiplyScalar(1.14);
    shell.castShadow = false; shell.userData.shell = true;
    shell.position.copy(m.position); shell.rotation.copy(m.rotation);
    m.parent.add(shell);
  }
}
