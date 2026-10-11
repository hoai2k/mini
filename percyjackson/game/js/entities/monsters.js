// The Greek monster bestiary: blocky models (procedurally painted skins,
// shared per kind so spawning never compiles shaders) and stat blocks.
// Tiers: minor (swarms, two or three hits), elite (a threat with a tell),
// champion (mini-boss), boss (see bosses.js). Monsters never bleed: they
// burst into golden dust (goldDust below).
// The looks follow the 3D sheets in design/concept/vox-enemies.png and
// vox-bosses-*.png: soot-black hellhounds with lava cracks and gold spiked
// collars, boxy bronze spiders with glowing eyes, snake-haired dracaenae in
// gold armour, flaming-haired cheerleader empousai, white-haired Furies in
// ragged black with leather wings, skeletons in combat gear.
import * as THREE from 'three/webgpu';
import { Rig, PX } from './character.js';
import { QuadRig, paintQuad, quadPart } from './quad.js';
import { paintPerson } from './mortals.js';
import { HS, solid, skinMat, prop, group, voxHair, flameHair, snake, lavaCracks, fur, spikedCollar, sway } from './parts.js';

export { skinMat };

// ---- shared parts -----------------------------------------------------------
// Wings on the upper back: two segments per side that flap in rig.tick.
// kind 'feather' (harpy, Stymphalian bird) or 'bat' (Fury).
export function addWings(rig, { span = 14, chord = 9, mat, tip, kind = 'bat', y = 10, flap = 1, bone = solid(0x2a1a14) } = {}) {
  const wings = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group(); root.position.set(side * 2 * PX, y * PX, -2.6 * PX); rig.torso.add(root);
    const elbow = new THREE.Group(); elbow.position.set(side * span * 0.55 * PX, 0, 0); root.add(elbow);
    if (kind === 'bat') {
      // leathery membrane in stepped rows (longest along the top bone), a
      // raised outer hand with fanned finger bones, tattered trailing edge
      const inL = span * 0.55, outL = span * 0.55;
      for (let r = 0; r < 3; r++) prop(rig, root, inL * (1 - r * 0.2), chord * 0.36, 0.6, r % 2 ? (tip ?? mat) : mat, side * inL * (1 - r * 0.2) / 2, -chord * (0.18 + r * 0.33), 0);
      prop(rig, root, inL, 1.3, 1.3, bone, side * inL / 2, 0.4, 0.2);
      const hand = group(elbow, 0, 0, 0, 0, 0, side * 0.55);
      for (let r = 0; r < 4; r++) { const L = outL * (1 - r * 0.24); prop(rig, hand, L, chord * 0.3, 0.5, r % 2 ? mat : (tip ?? mat), side * L / 2, -chord * (0.15 + r * 0.28), 0); }
      prop(rig, hand, outL, 1.1, 1.1, bone, side * outL / 2, 0.3, 0.2);
      prop(rig, hand, 1.4, 2.4, 1.4, bone, side * outL, 1, 0.2);
      for (let i = 0; i < 3; i++) { const f = group(hand, 0, 0, 0.3, 0, 0, -side * (0.45 + i * 0.4)); prop(rig, f, outL * (0.95 - i * 0.12), 0.8, 0.8, bone, side * outL * (0.95 - i * 0.12) / 2, 0, 0); }
      for (let i = 0; i < 6; i++) prop(rig, root, inL * 0.12, 1.5 + (i % 3), 0.5, tip ?? mat, side * (1 + i * inL * 0.13), -chord * 1.0 - (i % 3) * 0.6, 0);
      for (let i = 0; i < 4; i++) prop(rig, hand, outL * 0.12, 1.5 + (i % 2) * 1.5, 0.4, tip ?? mat, side * (1 + i * outL * 0.13), -chord * 1.0 - (i % 2), 0);
    } else {
      prop(rig, root, span * 0.55, chord, 0.8, mat, side * span * 0.275, -chord * 0.3, 0);
      prop(rig, elbow, span * 0.5, chord * 0.85, 0.6, tip ?? mat, side * span * 0.25, -chord * 0.4, 0);
      for (let i = 0; i < 5; i++) prop(rig, elbow, 1.8, 4 + (i % 2), 0.6, tip ?? mat, side * (span * 0.5 - i * 1.7), -chord * 0.85 - 1.8, 0);
      for (let i = 0; i < 4; i++) prop(rig, root, 2, 3, 0.7, tip ?? mat, side * (2 + i * span * 0.12), -chord * 0.8 - 1.5, 0);
    }
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
  prop(rig, parent, 2, 0.8, 2, solid(0xc9963a, 0.3, 0.35, 0.7), 0, -3, 0);
  const fire = solid(color, 3.5), core = solid(0xffd84a, 4);
  for (let i = 0; i < segs; i++) {
    const g = new THREE.Group(); g.position.y = (i === 0 ? -3 : -len) * PX; parent.add(g);
    prop(rig, g, 1.1 - i * 0.06, len, 1.1 - i * 0.06, i % 3 === 1 ? core : fire, 0, -len / 2, 0);
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
  const S = rig.extras.snakes;
  if (S) {
    const rear = e?.gazeT > 0 || e?.state === 'windup' ? 1 : 0;
    for (const s of S) for (let i = 0; i < s.segs.length; i++) {
      s.segs[i].rotation.x = Math.sin(t * s.speed + i * 0.9 + s.ph) * s.amp - rear * 0.12;
      s.segs[i].rotation.z = Math.cos(t * s.speed * 0.8 + i * 0.7 + s.ph) * s.amp * 0.8;
    }
  }
  const Y = rig.extras.sway;
  if (Y) for (const s of Y) s.g.rotation[s.ax] = s.base + Math.sin(t * s.f + s.ph) * s.amp;
  if (rig.extras.flameHair) { const k = 1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 7.3) * 0.03; rig.extras.flameHair.scale.set(1, k, 1); }
  if (rig.extras.key) rig.extras.key.rotation.y += dt * 4;
}

// ---- skins --------------------------------------------------------------------
// soot-black dog with lava cracks; the glowing jaw shows when it snarls
const lavaDog = (o) => (S) => paintQuad(S, { base: o.base ?? 0x221d20, dark: 0x0e0c0e, belly: 0x2c2428, back: 0x161214, eye: 0xff2a0a, eyeLow: 0xffa040, nose: 0x050505, speckles: 40, brow: 0x0a0808, teeth: 0xfff0d0,
  custom: (s) => {
    fur(s, 0, 16, 40, 20, 60, 0x0a0808, 0x3a3034);
    lavaCracks(s, 0, 16, 40, 20, o.cracks ?? 8, [0xd83a0a, 0xff6a1a]); lavaCracks(s, 40, 16, 12, 11, Math.round((o.cracks ?? 8) / 6), [0xd83a0a, 0xff6a1a]);
    s.box(48, 0, 4, 2, 4, 0x3a0c08, 0.2); s.rect(52, 4, 4, 1, 0xff6a1a, 0); s.rect(36, 7, 4, 1, 0xff6a1a, 0);
    s.rect(52, 16, 2, 4, 0x3a1010, 0.1);
  } });

// ---- model builders ----------------------------------------------------------
const MODELS = {
  pup: () => {
    const rig = new QuadRig({ material: skinMat('pup', lavaDog({ cracks: 5 })), scale: 0.95, bodyL: 11, bodyW: 6, bodyH: 6, legH: 6, legW: 2.6, headS: 6.5, ears: true, tail: 3, tailLen: 6, tailW: 1.6, tailCurl: 0.3 });
    // bristling back fur
    const bristle = solid(0x141012);
    for (let i = 0; i < 4; i++) prop(rig, rig.torso, 2 - i * 0.2, 1.6, 2, bristle, 0, 3.4, 4 - i * 2.4, -0.4);
    prop(rig, rig.tailTip, 1.4, 1.4, 1.4, solid(0xff6a1a, 2.2), 0, 0, -1.6);
    return rig;
  },
  hellhound: () => {
    const rig = new QuadRig({ material: skinMat('hellhound', lavaDog({ cracks: 12 })), scale: 2.5, bodyL: 13, bodyW: 7, bodyH: 7, legH: 7, legW: 3, headS: 7, ears: true, tail: 4, tailLen: 8, tailW: 1.8, tailCurl: 0.35, gait: 0.75 });
    // shaggy hackles, a smouldering ridge and a gold spiked collar
    const bristle = solid(0x141012), ember = solid(0xff4a1a, 2);
    for (let i = 0; i < 5; i++) { prop(rig, rig.torso, 3 - i * 0.3, 2.2, 2.2, bristle, 0, 4, 5 - i * 2.4, -0.5); if (i % 2) prop(rig, rig.torso, 1, 1, 1, ember, 0, 4.6, 5 - i * 2.4); }
    for (const sx of [-1, 1]) prop(rig, rig.torso, 1.6, 4, 6, bristle, sx * 3.6, 1.5, 4.5, 0, 0, sx * 0.2);
    spikedCollar(rig, rig.neck, { r: 4.2, h: 2.2, y: -0.6, z: 0.6, rx: -0.25, n: 10 });
    prop(rig, rig.tailTip, 1.4, 1.4, 2, ember, 0, 0, -1.6);
    for (const leg of rig.legs) for (const dx of [-0.8, 0.8]) prop(rig, leg, 0.6, 0.8, 1, solid(0xd8c8a0), dx, -7.2, 1.6);
    return rig;
  },
  spider: () => {
    const rig = new QuadRig({ material: skinMat('spider', (S) => paintQuad(S, { base: 0xb47a30, dark: 0x5a3a18, belly: 0x4a2e12, eye: 0xffb02a, eyeLow: 0xff6a1a, eyes: [[9, 11], [13, 11], [10, 9], [12, 9]], plates: 0xe0b060, extra: 0x8a5a24, teeth: false, nose: 0x5a3a18, noise: 0.22, speckles: 10,
      custom: (s) => { for (let x = 0; x < 32; x += 4) s.rect(x, 44, 1, 10, 0x5a3a18, 0); s.rect(40, 18, 12, 1, 0xe0b060, 0); s.rect(40, 22, 12, 1, 0x5a3a18, 0); } }), { rough: 0.35, emit: 3.6 }),
      scale: 0.72, bodyL: 7, bodyW: 7, bodyH: 4, legH: 5, legW: 1.6, headS: 5, legs: 8, splay: 1.9, footL: 9, snout: false, neckUp: -1, gait: 1.6 });
    bronzeLegs(rig, 6, solid(0x8a5a24, 0, 0.35, 0.6), solid(0xe0b060, 0, 0.3, 0.7));
    // round clockwork abdomen banded in bronze, with a wind-up key
    const ab = rig.mesh(quadPart('extra', 9, 7, 10), rig.material); ab.position.set(0, 1.5 * PX, -8 * PX); rig.torso.add(ab);
    for (const z of [-3, 0, 3]) prop(rig, ab, 9.4, 7.4, 0.8, solid(0xe0b060, 0, 0.3, 0.7), 0, 0, z);
    const key = group(ab, 0, 4, 0);
    prop(rig, key, 1, 3, 1, solid(0xe0b060, 0, 0.3, 0.7), 0, 1.5, 0);
    prop(rig, key, 5, 2, 0.8, solid(0xe0b060, 0, 0.3, 0.7), 0, 3.4, 0);
    rig.extras.key = key;
    for (const sx of [-1, 1]) prop(rig, rig.mouth, 0.9, 2.4, 0.9, solid(0xf0e0b0, 0, 0.3, 0.6), sx * 1.2, -1, 0.4, 0.3, 0, 0);
    return rig;
  },
  automaton: () => {
    const rig = new QuadRig({ material: skinMat('automaton', (S) => paintQuad(S, { base: 0xa8742e, dark: 0x5a3a14, belly: 0x4a2e10, eye: 0x8aff5a, eyes: [[9, 11], [13, 11]], plates: 0xe0b060, teeth: false, nose: 0x3a2a10, noise: 0.22 }), { rough: 0.35 }), scale: 1.05, bodyL: 10, bodyW: 9, bodyH: 5, legH: 4, legW: 1.6, headS: 5, legs: 6, splay: 0.7, snout: false, neckUp: -1.5, gait: 1.4 });
    for (const sx of [-1, 1]) prop(rig, rig.mouth, 1, 1, 4, solid(0xd8a85a, 0, 0.35, 0.35), sx * 1.6, 0, 1.6, 0, -sx * 0.4, 0);
    const pot = new THREE.Group(); pot.position.set(0, 3.5 * PX, -1 * PX); rig.torso.add(pot);
    prop(rig, pot, 6, 5, 6, solid(0x2a2018, 0, 0.8), 0, 2.5, 0);
    prop(rig, pot, 6.4, 1, 6.4, solid(0xc9963a, 0, 0.35, 0.6), 0, 1.5, 0);
    prop(rig, pot, 4, 1, 4, solid(0x2a2018, 0, 0.8), 0, 5.5, 0);
    const fire = prop(rig, pot, 4.6, 4, 4.6, solid(0x6aff3a, 2.6), 0, 3, 0); fire.scale.set(1.02, 0.6, 1.02);
    prop(rig, pot, 3, 1.5, 3, solid(0xaaff6a, 3.5), 0, 6.4, 0);
    rig.extras.pot = pot; rig.extras.fire = fire;
    return rig;
  },
  harpy: () => {
    const mat = skinMat('harpy', (S) => paintPerson(S, { skin: 0xd8b48a, hair: 0x5a3a1e, fringe: 2, hairSide: 5, hairBack: 7, eye: 0xffc81a, eyeWhite: 0xfff2a0, scowl: true, grin: true, top: 0x8a5a2a, dots: 0xc9963a, sleeve: 0x8a5a2a, hand: 0x8a5a2a, legR: 0xe0a830, legL: 0xe0a830, shoes: 0x3a2a1a, skirt: 0x6a4a24, skirtLen: 6 }), { emit: 2.4 });
    const rig = new Rig({ material: mat, scale: 0.95, armW: 3, legH: 9 });
    rig.legR.scale.set(0.45, 1, 0.45); rig.legL.scale.set(0.45, 1, 0.45);
    const claw = solid(0x3a2a1a);
    for (const leg of [rig.legR, rig.legL]) for (const dx of [-1.6, 0, 1.6]) prop(rig, leg, 1.2 / 0.45, 1, 3 / 0.45, claw, dx / 0.45, -9, 1.5 / 0.45);
    rig.armR.visible = rig.armL.visible = false;
    addWings(rig, { span: 18, chord: 9, mat: solid(0x8a5a2a), tip: solid(0xc9963a, 0, 0.5, 0.3), kind: 'feather', y: 11 });
    voxHair(rig, { style: 'long', base: 0x5a3a1e, shade: 0x3a2412, light: 0x8a6a3a, seed: 41 }, 1.05);
    // feather ruff over the shoulders
    for (let i = 0; i < 5; i++) prop(rig, rig.torso, 2.2, 3, 5, solid(i % 2 ? 0xc9963a : 0x8a5a2a), -4 + i * 2, 11, 0, 0, 0, (i - 2) * 0.2);
    rig.float = 0.9;
    return rig;
  },
  // Stymphalian bird: an eagle in bronze-tipped feathers with a gold beak
  stymphalian: () => {
    const mat = skinMat('stymphalian', (S) => paintPerson(S, { skin: 0x7a4a22, hair: 0x5a3416, fringe: 1, hairSide: 2, hairBack: 8, eye: 0x1a0a00, eyeWhite: 0xffc81a, scowl: true, brow: 0x3a2010, mouth: false, top: 0x8a5a2a, sleeve: 0x8a5a2a, hand: 0x8a5a2a, legR: 0xe0a830, legL: 0xe0a830, shoes: 0xe0a830,
      body: (s) => { for (let i = 0; i < 70; i++) s.px(16 + Math.floor(s.r() * 24), 20 + Math.floor(s.r() * 12), s.r() < 0.5 ? 0xc9963a : 0x5a3416); s.rect(20, 26, 8, 6, 0xb08a5a, 0.15); } }), { emit: 2.6 });
    const rig = new Rig({ material: mat, scale: 0.9, armW: 3, legH: 6, bodyD: 6, headS: 7 });
    rig.legR.scale.set(0.4, 1, 0.4); rig.legL.scale.set(0.4, 1, 0.4);
    const gold = solid(0xe0a830, 0.2, 0.4, 0.5);
    for (const leg of [rig.legR, rig.legL]) for (const dx of [-1.4, 0, 1.4]) prop(rig, leg, 1.1 / 0.4, 1, 3 / 0.4, solid(0x2a1a0a), dx / 0.4, -6, 1.4 / 0.4);
    rig.armR.visible = rig.armL.visible = false;
    // hooked gold beak and feather crest
    const beak = group(rig.head, 0, 3.6 * HS, 4.2 * HS, 0.2);
    prop(rig, beak, 3, 2.6, 3, gold, 0, 0, 1.4); prop(rig, beak, 2.2, 2, 1.6, gold, 0, -1.4, 3);
    for (let i = 0; i < 3; i++) prop(rig, rig.head, 1.6, 3, 4, solid(0x5a3416), 0, (8 + i * 0.4) * HS, (-1 - i * 2) * HS, -0.5 - i * 0.2);
    addWings(rig, { span: 24, chord: 10, mat: solid(0x7a4a1e), tip: solid(0xc9963a, 0, 0.45, 0.5), kind: 'feather', y: 10, flap: 1.2 });
    const tail = group(rig.hips, 0, 2, -3, 0.9);
    for (let i = -2; i <= 2; i++) prop(rig, tail, 1.8, 1, 8, solid(i % 2 ? 0xc9963a : 0x6a4018), i * 1.6, 0, -4, 0, i * 0.15, 0);
    rig.hunch = 0.55;
    rig.float = 1.1;
    return rig;
  },
  fury: () => buildFury('fury', { scale: 1.0 }),
  dracaena: () => {
    const mat = skinMat('dracaena', (S) => paintPerson(S, { skin: 0xd8ac84, hair: 0x1e5a32, fringe: 1, hairSide: 3, hairBack: 6, eye: 0x1a1a0a, eyeWhite: 0xffd84a, fangs: 0xf4f0e0, mouth: false, top: 0xd8ac84, sleeve: 0xd8ac84, hand: 0xd8ac84, pants: 0x1e5a32, skirt: 0x1e4a2a, skirtLen: 7,
      body: (s) => { s.rect(20, 21, 8, 3, 0xc9963a, 0.05); s.rect(16, 21, 4, 3, 0xc9963a, 0.05); s.rect(28, 21, 4, 3, 0xc9963a, 0.05); s.rect(32, 21, 8, 3, 0xc9963a, 0.05); s.rect(20, 29, 8, 2, 0xc9963a, 0.05); s.rect(16, 29, 24, 2, 0xc9963a, 0.05); s.rect(44, 23, 4, 2, 0xc9963a, 0.05); s.rect(36, 55, 4, 2, 0xc9963a, 0.05); } }), { emit: 2.4, rough: 0.5 });
    const rig = new Rig({ material: mat, scale: 1.3, bodyW: 8, bodyD: 4, armW: 3, legH: 8 });
    rig.legR.visible = rig.legL.visible = false;
    // twin snake tails, dark green with gold belly scutes, coiling behind
    const scale = solid(0x1e5a32, 0, 0.5), belly = solid(0xc9a03a, 0, 0.5, 0.3);
    rig.extras.tails = [];
    for (const side of [-1, 1]) {
      let parent = new THREE.Group(); parent.position.set(side * 2 * PX, 0, 0); rig.hips.add(parent);
      const segs = [];
      const shape = [[4, 8, 4], [3.6, 3.6, 7], [3, 3, 7], [2.4, 2.4, 6], [1.6, 1.6, 5]];
      for (let i = 0; i < shape.length; i++) {
        const [w, h, d] = shape[i];
        const g = new THREE.Group(); if (i) g.position.set(0, (i === 1 ? -6.4 : 0) * PX, (i === 1 ? 0 : -shape[i - 1][2]) * PX); parent.add(g);
        prop(rig, g, w, h, d, scale, 0, i === 0 ? -4 : 0, i === 0 ? 0 : -d / 2);
        if (i > 0) { prop(rig, g, w * 0.75, 0.5, d * 0.9, belly, 0, -h / 2 - 0.2, -d / 2); prop(rig, g, w * 0.4, 0.4, d * 0.6, belly, 0, h / 2 + 0.1, -d / 2); }
        segs.push(g); parent = g;
      }
      segs[0].rotation.z = side * 0.12;
      rig.extras.tails.push({ segs: segs.slice(1), ph: side });
    }
    // snake hair
    const hairS = solid(0x2e8b4a, 0, 0.6);
    for (const [x, z, rx, rz] of [[-3, 1, 0.3, 0.6], [3, 1, 0.3, -0.6], [-2, -2, -0.5, 0.4], [2, -2, -0.5, -0.4], [0, -3, -0.7, 0], [0, 1, 0.1, 0], [-3.5, -1, -0.2, 0.9], [3.5, -1, -0.2, -0.9]])
      snake(rig, rig.head, { len: 3, seg: 1.7, w: 1.1, body: hairS, at: [x * HS, 7.6 * HS, z * HS], rot: [rx, 0, rz], amp: 0.25, speed: 4 });
    // bronze spear and round shield
    const spear = new THREE.Group(); rig.handR.add(spear); spear.rotation.x = -1.2;
    prop(rig, spear, 1, 34, 1, solid(0x4a2e1a), 0, 6, 0);
    prop(rig, spear, 2.4, 5, 0.8, solid(0xd8a85a, 0.2, 0.3, 0.7), 0, 25, 0);
    prop(rig, spear, 1.6, 1, 1.6, solid(0xd8a85a, 0, 0.3, 0.7), 0, 22, 0);
    const shield = new THREE.Group(); shield.position.set(1 * PX, -5 * PX, 3 * PX); rig.handL.add(shield);
    prop(rig, shield, 12, 12, 1.6, solid(0xc9963a, 0, 0.4, 0.6), 0, 0, 0);
    prop(rig, shield, 8, 8, 0.6, solid(0x1e5a32, 0, 0.5), 0, 0, 1);
    prop(rig, shield, 3, 3, 0.8, solid(0xc9963a, 0, 0.35, 0.6), 0, 0, 1.4);
    rig.extras.shield = shield;
    for (const arm of [rig.armR, rig.armL]) prop(rig, arm, 3.6, 1.4, 4.6, solid(0xc9963a, 0, 0.35, 0.6), 0, -6, 0);
    rig.hunch = 0.2;
    return rig;
  },
  empousa: () => {
    const mat = skinMat('empousa', (S) => paintPerson(S, { skin: 0xf0c8a8, hair: 0xff6a1a, fringe: 2, hairSide: 3, eye: 0x6a1a0a, eyeWhite: 0xffffff, grin: true, lipstick: 0xc8203a, top: 0xf4f0e8, collar: 0xf28c28, trim: 0xf28c28, sleeve: 0xf0c8a8, hand: 0xf0c8a8, shortSleeve: true, skirt: 0xf28c28, skirtLen: 5, legR: 0xc9963a, legL: 0x8a7a6a, shoes: 0x2a2018,
      body: (s) => { s.rect(22, 24, 4, 3, 0xf28c28, 0.05); s.px(23, 23, 0xf28c28); s.px(24, 23, 0xf28c28); for (const [u, v] of [[0, 16], [16, 48]]) { for (let x = 0; x < 16; x += 2) s.rect(u + x, v + 4, 1, 5, 0xc85a10, 0.05); s.rect(u, v + 8, 16, 1, 0xf4f0e8, 0); } for (let i = 0; i < 20; i++) s.px(16 + Math.floor(s.r() * 16), 52 + Math.floor(s.r() * 12), 0x5a4a3a); } }), { emit: 2.8 });
    const rig = new Rig({ material: mat, scale: 1.1, bodyW: 7, armW: 3 });
    flameHair(rig, { seed: 11, n: 80, height: 8 });
    // bronze leg (right) and a donkey leg with a hoof (left)
    const bronze = solid(0xc9963a, 0.15, 0.3, 0.8);
    prop(rig, rig.legR, 4.3, 7, 4.3, bronze, 0, -8, 0); prop(rig, rig.legR, 4.6, 1.4, 4.6, bronze, 0, -4, 0);
    prop(rig, rig.legL, 4.4, 5, 4.4, solid(0x9a8a7a), 0, -7, 0);
    prop(rig, rig.legL, 4.6, 2.4, 5, solid(0x1a1410), 0, -11, 0.3);
    // pom-poms: clusters of orange and black tassels
    for (const hand of [rig.handR, rig.handL]) {
      const pp = group(hand, 0, -2, 0);
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; prop(rig, pp, 2.2, 2.2, 2.2, solid(i % 3 ? 0xf28c28 : 0x1a1418, 0.3), Math.cos(a) * 1.8, Math.sin(a * 2) * 1.2, Math.sin(a) * 1.8); }
      prop(rig, pp, 3, 3, 3, solid(0xf28c28, 0.3), 0, 0, 0);
    }
    rig.extras.flame = true;
    return rig;
  },
  scorpion: () => {
    const rig = new QuadRig({ material: skinMat('scorpion', (S) => paintQuad(S, { base: 0x3a2214, dark: 0x1a0e08, belly: 0x5a3018, back: 0x2a160c, eye: 0xff3a1a, eyes: [[9, 12], [13, 12], [11, 10], [12, 10]], plates: 0x6a3a1c, teeth: false, nose: 0x1a0e08, noise: 0.15, speckles: 20,
      custom: (s) => { s.box(40, 32, 2, 2, 6, 0x4a2a16, 0.15); for (let x = 40; x < 56; x += 3) s.rect(x, 32, 1, 8, 0x1a0e08, 0); } }), { rough: 0.35, emit: 3 }),
      scale: 1.1, bodyL: 10, bodyW: 7, bodyH: 3.4, legH: 4, legW: 1.4, headS: 4.5, legs: 8, splay: 1.6, footL: 5, snout: false, neckUp: -1.2, gait: 1.5, tail: 6, tailLen: 15, tailW: 2.4, tailCurl: 0.62 });
    bronzeLegs(rig, 4, solid(0x2a160c, 0, 0.35), solid(0x6a3a1c, 0, 0.35));
    // pincers on jointed arms
    const chit = solid(0x4a2a16, 0, 0.35), dark = solid(0x1a0e08, 0, 0.35);
    rig.extras.claws = [];
    for (const sx of [-1, 1]) {
      const arm = group(rig.torso, sx * 3, 0, 4.5, 0, sx * 0.5, 0);
      prop(rig, arm, 1.8, 1.8, 6, chit, 0, 0, 3);
      const fore = group(arm, 0, 0, 6, 0, -sx * 0.9, 0);
      prop(rig, fore, 1.6, 1.6, 5, chit, 0, 0, 2.5);
      const pin = group(fore, 0, 0, 5);
      prop(rig, pin, 3.4, 2.4, 4, chit, 0, 0, 1.6);
      const jawA = prop(rig, pin, 1.2, 1.4, 4, dark, -1, 0, 4.6, 0, 0.25, 0); const jawB = prop(rig, pin, 1.2, 1.4, 4, dark, 1, 0, 4.6, 0, -0.25, 0);
      rig.extras.claws.push({ arm, jawA, jawB, side: sx });
      sway(rig, arm, 'y', 0.15, 2.4);
    }
    // stinger at the tail tip, dripping venom
    const sting = group(rig.tailTip, 0, 0, -2.6, -0.9);
    prop(rig, sting, 2.4, 2.4, 3, chit, 0, 0, -1.2);
    prop(rig, sting, 0.9, 0.9, 3, solid(0x9aff3a, 2.6), 0, -0.8, -3.4, 0.6);
    rig.extras.sting = sting;
    return rig;
  },
  skeleton: () => {
    const mat = skinMat('skeleton', (S) => paintPerson(S, { skin: 0xe8e0c8, eye: 0x0a0806, eyeWhite: 0x0a0806, brow: 0xc8c0a8, mouth: false, top: 0x5a6a34, sleeve: 0x5a6a34, shortSleeve: true, hand: 0xe8e0c8, pants: 0x4a5a2c, shoes: 0x8a7a5a,
      face: (s, ey) => { for (const x of [9, 10, 13, 14]) { s.px(x, ey, 0x0a0806); s.px(x, ey - 1, 0x0a0806); } s.px(11, ey + 1, 0x2a2420); s.px(12, ey + 1, 0x2a2420); s.rect(9, ey + 3, 6, 1, 0xf4ecd8, 0); for (let x = 9; x < 15; x += 1) if (x % 2) s.px(x, ey + 3, 0x5a5040); s.rect(10, ey + 4, 4, 1, 0xd8d0b8, 0); },
      body: (s) => { for (const [x0, y0, w, h] of [[16, 16, 24, 16], [40, 16, 16, 9], [32, 48, 16, 9], [0, 16, 16, 16], [16, 48, 16, 16]]) for (let i = 0; i < w * h / 6; i++) { const c = [0x3a4a24, 0x7a7a4a, 0x2a3018][Math.floor(s.r() * 3)]; const x = x0 + Math.floor(s.r() * w), y = y0 + Math.floor(s.r() * h); s.rect(x, y, 2, 1, c, 0); }
        for (const [u, v] of [[0, 16], [16, 48]]) s.rect(u, v + 12, 16, 4, 0x8a7a5a, 0.1); } }), { emit: 1.2 });
    const rig = new Rig({ material: mat, scale: 1.0, armW: 3 });
    for (const arm of [rig.armR, rig.armL]) for (const m of arm.children) m.scale.set(0.8, 1, 0.8);
    const olive = solid(0x4a5a2c, 0, 0.8), dark = solid(0x2a3018, 0, 0.8);
    // helmet with chin strap and goggles band
    prop(rig, rig.head, 9.6 * HS, 4, 9.6 * HS, olive, 0, 8.2 * HS, 0);
    prop(rig, rig.head, 10.4 * HS, 1, 10.4 * HS, olive, 0, 6.6 * HS, 0);
    prop(rig, rig.head, 9.8 * HS, 1, 9.8 * HS, dark, 0, 7.4 * HS, 0);
    // tactical vest with pouches
    prop(rig, rig.torso, 9, 7, 5.4, dark, 0, 7.5, 0);
    for (const x of [-2.5, 0, 2.5]) prop(rig, rig.torso, 2, 2.4, 1, olive, x, 5.4, 3);
    // rifle held across the body
    const gun = group(rig.handR, 0, -1, 2, -1.45, 0, 0);
    const metal = solid(0x2a2a2c, 0, 0.45, 0.5);
    prop(rig, gun, 1.6, 2, 14, metal, 0, 0, 2); prop(rig, gun, 1.2, 4, 1.6, metal, 0, -2.6, 1.6); prop(rig, gun, 1.6, 2.4, 4, solid(0x5a4030), 0, -0.6, -6.6); prop(rig, gun, 0.8, 0.8, 5, metal, 0, 0.4, 10.5);
    rig.extras.gun = gun;
    rig.extras.muzzle = group(gun, 0, 0.4, 13);
    return rig;
  },
  cyclops: () => {
    const mat = skinMat('cyclops', (S) => paintPerson(S, { skin: 0xd89a6a, hair: 0x2a1a10, fringe: 1, hairSide: 3, hairBack: 7, eye: 0xd89a6a, eyeWhite: 0xd89a6a, scowl: false, brow: 0x2a1a10, mouth: false, beard: 0x2a1a10, top: 0xf0e8d8, sleeve: 0xd89a6a, hand: 0xc88a5a, pants: 0xd89a6a, skirt: 0xf0e8d8, skirtLen: 8, shoes: 0x6a4a2a,
      face: (s, ey) => { s.rect(10, ey - 1, 4, 3, 0xffffff, 0); s.rect(11, ey - 1, 2, 2, 0x2a6ab8, 0); s.px(11, ey - 1, 0x0a0a1a); s.rect(9, ey - 2, 6, 1, 0x2a1a10, 0); s.rect(10, ey + 3, 4, 1, 0x7a1a14, 0); s.px(10, ey + 3, 0xf4f0e0); s.px(13, ey + 3, 0xf4f0e0); },
      body: (s) => { s.rect(16, 20, 4, 12, 0xd89a6a, 0.05); s.rect(20, 20, 3, 6, 0xd89a6a, 0.05); for (let i = 0; i < 30; i++) s.px(23 + Math.floor(s.r() * 17), 20 + Math.floor(s.r() * 12), 0xd8ccb8); s.rect(16, 29, 24, 2, 0xc9963a, 0.05); } }), { emit: 2 });
    const rig = new Rig({ material: mat, scale: 2.3, bodyW: 11, bodyD: 6, armW: 5, headS: 9, legH: 10 });
    voxHair(rig, { style: 'shaggy', base: 0x2a1a10, shade: 0x140a06, light: 0x4a3020, seed: 23 }, 1);
    // fleece over the shoulder and a studded club
    prop(rig, rig.torso, 6, 4, 7, solid(0xf4ecdc), -3, 11, 0, 0, 0, 0.3);
    const club = group(rig.handR, 0, -1, 1, -1.2, 0, 0);
    prop(rig, club, 2.6, 18, 2.6, solid(0x6a4022), 0, 6, 0); prop(rig, club, 4.6, 8, 4.6, solid(0x7a4a28), 0, 16, 0);
    for (const [x, y, z] of [[2.4, 15, 0], [-2.4, 18, 0], [0, 17, 2.4], [0, 14, -2.4]]) prop(rig, club, 1.4, 1.4, 1.4, solid(0x8a8a90, 0, 0.4, 0.6), x, y, z);
    for (const arm of [rig.armR, rig.armL]) prop(rig, arm, 5.6, 2, 4.6, solid(0x6a4a2a), 0, -8, 0);
    rig.hunch = 0.3;
    return rig;
  },
  gorgon_statue: () => {
    const mat = skinMat('gorgon_statue', (S) => {
      paintPerson(S, { skin: 0xa8a49a, hair: 0x8a867c, fringe: 2, hairSide: 3, eye: 0x6a665e, eyeWhite: 0xb8b4aa, frown: true, lipstick: 0x7a766e, top: 0x9a968c, sleeve: 0x9a968c, hand: 0xa8a49a, pants: 0x8a867c, shoes: 0x7a766e, collar: 0xb0aca2 });
      for (let i = 0; i < 26; i++) { let x = Math.floor(S.r() * 64), y = Math.floor(S.r() * 64); for (let k = 0; k < 4; k++) { S.px(x, y, 0x5a5650); x += S.r() < 0.5 ? 1 : 0; y += 1; } }
      for (let i = 0; i < 40; i++) S.px(Math.floor(S.r() * 64), Math.floor(S.r() * 64), 0x6a8a5a);   // moss
    }, { emit: 0, rough: 0.95, fill: 0.08 });
    const rig = new Rig({ material: mat, scale: 1.05 });
    voxHair(rig, { style: 'messy', base: 0x8a867c, shade: 0x6a665e, light: 0xa8a49a, seed: 29 }, 1);
    // a frozen shield arm and a cracked plinth stuck to its feet
    const sh = group(rig.handL, 1, -4, 2);
    prop(rig, sh, 9, 9, 1.2, solid(0x8a867c, 0, 0.95), 0, 0, 0);
    prop(rig, sh, 4, 4, 0.6, solid(0x9a968c, 0, 0.95), 0, 0, 0.8);
    for (const leg of [rig.legR, rig.legL]) prop(rig, leg, 5, 2, 6, solid(0x7a766e, 0, 0.95), 0, -11.4, 0.5);
    rig.statuePose = (r) => { r.armR.rotation.set(-2.3, 0, 0.3); r.armL.rotation.set(-1.3, 0.5, -0.2); r.head.rotation.set(0.25, 0.5, 0); r.torso.rotation.set(0.12, -0.3, 0); r.legR.rotation.x = 0.3; r.legL.rotation.x = -0.25; };
    rig.statuePose(rig);
    return rig;
  },
  ghost: () => {
    const mat = skinMat('ghost', (S) => paintPerson(S, { skin: 0xb8e8f0, hair: 0x8ab8c8, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x0a1a2a, eyeWhite: 0x0a1a2a, brow: 0x6a98a8, mouth: false, top: 0x9ac8d8, sleeve: 0x9ac8d8, hand: 0xc8f0f8, skirt: 0x8ab8c8, skirtLen: 12, pants: 0x8ab8c8,
      face: (s, ey) => { s.rect(9, ey - 1, 2, 2, 0x0a1a2a, 0); s.rect(13, ey - 1, 2, 2, 0x0a1a2a, 0); s.px(10, ey, 0xffffff); s.px(14, ey, 0xffffff); s.rect(11, ey + 2, 2, 2, 0x1a2a3a, 0); } }), { emit: 3, fill: 0.7, dissolve: 0.3 });
    const rig = new Rig({ material: mat, scale: 1.0, armW: 3 });
    rig.legR.visible = rig.legL.visible = false;
    // trailing wisps instead of legs
    const wisp = solid(0x9ad8e8, 1.4);
    for (let i = 0; i < 5; i++) { const g = group(rig.hips, -3 + i * 1.5, 0, 0); prop(rig, g, 1.8, 8 - (i % 2) * 3, 2, wisp, 0, -4 + (i % 2), 0); sway(rig, g, 'x', 0.35, 3, i); }
    rig.float = 1.3; rig.hunch = 0.2;
    return rig;
  },
};
// Knee caps and foot tips on the jointed legs of a QuadRig (spec.footL).
function bronzeLegs(rig, footL, mat, tip) {
  for (const leg of rig.legs) {
    const knee = leg.userData.knee; if (!knee) continue;
    const w = rig.dims.legW;
    prop(rig, knee, w * 1.25, 1.6, w * 1.25, tip, 0, 0, 0);
    prop(rig, knee, w * 0.55, 1.2, w * 0.55, mat, 0, -footL - 0.3, 0);
  }
}
// A Fury: pale grey hag in a ragged black dress with a gold belt, wild white
// hair, glowing yellow eyes, leathery brown wings and a whip of fire.
export function buildFury(id, { scale = 1, skin = 0xb0a898, hair = 0xdcdcd8, wing = 0x5a3a26, dress = 0x1a1416, mouthGrin = true, seed = 61 } = {}) {
  const mat = skinMat(id, (S) => paintPerson(S, { skin, eye: 0xffd84a, eyeWhite: 0xffd84a, scowl: true, brow: 0x6a6a66, wrinkles: 0x7a7266, fangs: 0xf4f0e0, grin: mouthGrin, frown: !mouthGrin, top: dress, sleeve: skin, hand: skin, shortSleeve: true, pants: dress, skirt: dress, skirtLen: 12, shoes: false, collar: dress,
    body: (s) => { s.rect(16, 29, 24, 2, 0xc9963a, 0.05); s.rect(23, 29, 2, 2, 0xffd84a, 0); s.rect(22, 20, 1, 9, 0xc9963a, 0); s.rect(25, 20, 1, 9, 0xc9963a, 0); } }), { emit: 3 });
  const rig = new Rig({ material: mat, scale, bodyW: 7, armW: 3, legH: 10 });
  rig.legR.visible = rig.legL.visible = false;
  // tattered dress hanging to bare clawed feet
  const rag = solid(dress, 0, 0.9), rag2 = solid(0x2a2024, 0, 0.9);
  for (let i = 0; i < 7; i++) { const g = group(rig.hips, -3.6 + i * 1.2, 0.5, ((i % 3) - 1) * 1.2); prop(rig, g, 1.8, 8 + (i % 3) * 2.4, 1.8 + (i % 2), i % 2 ? rag : rag2, 0, -4 - (i % 3) * 1.2, 0); sway(rig, g, 'x', 0.12, 2.5, i); }
  for (const z of [-2.2, 2.2]) for (let i = 0; i < 4; i++) prop(rig, rig.hips, 2, 7 + (i % 2) * 3, 0.8, rag, -3 + i * 2, -3.5 - (i % 2), z);
  for (const sx of [-1.4, 1.4]) { prop(rig, rig.hips, 2, 1.2, 3.4, solid(skin), sx, -10.6, 0.8); for (const dx of [-0.6, 0.6]) prop(rig, rig.hips, 0.5, 0.6, 1.2, solid(0x2a2420), sx + dx, -10.8, 2.8); }
  voxHair(rig, { style: 'curls', base: hair, shade: 0x8a8a88, light: 0xffffff, seed }, 1.0);
  for (const arm of [rig.armR, rig.armL]) prop(rig, arm, 3.4, 1.2, 4.4, solid(0xc9963a, 0.2, 0.35, 0.7), 0, -7.5, 0);
  addWings(rig, { span: 20 * Math.min(1.2, scale + 0.1), chord: 11, mat: solid(wing, 0, 0.9), tip: solid(0x3a2418, 0, 0.9), kind: 'bat', y: 10.5, bone: solid(0x2a1a10) });
  addWhip(rig, { segs: 7, len: 3 });
  rig.hunch = 0.35;
  rig.float = 0.8;
  return rig;
}

// ---- stat blocks -------------------------------------------------------------
// ai: melee | ranged | tank | teleport | summon | blob | statue
// tier: minor | elite | champion | boss
// aura: 'smoke' | 'fire' | 'greekfire' | 'spark' | 'wisp' | null  (ambient particles)
// projectile (ranged): 'feather' | 'fire' | 'acid' | 'bullet' | 'wisp'
// poison: { dps, dur }  a hit leaves the hero poisoned (green numbers)
// regrow: true   falls to bones and gets back up unless hit again while down
// wake: metres   'statue' monsters stand frozen until a hero comes this close
export const MONSTERS = {
  pup: { name: 'Hellhound Pup', tier: 'minor', hp: 32, speed: 5, dmg: 7, radius: 0.45, height: 1.1, ai: 'melee', range: 1.5, windup: 0.4, cd: 1.1, xp: 3, coins: [1, 3], model: 'pup', pitch: 1.5, voice: 'bark' },
  spider: { name: 'Bronze Spider', tier: 'minor', hp: 20, speed: 5.8, dmg: 5, radius: 0.38, height: 0.8, ai: 'melee', range: 1.3, windup: 0.35, cd: 1, xp: 2, coins: [0, 2], model: 'spider', pitch: 2.2, voice: 'click', aura: 'spark' },
  harpy: { name: 'Wild Harpy', tier: 'minor', hp: 40, speed: 3.8, dmg: 8, radius: 0.4, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.55, cd: 2.1, xp: 5, coins: [2, 4], model: 'harpy', pitch: 1.3, projectile: 'feather', voice: 'screech' },
  stymphalian: { name: 'Stymphalian Bird', tier: 'minor', hp: 34, speed: 4.4, dmg: 7, radius: 0.45, height: 1.7, ai: 'ranged', range: 11, keep: 7, windup: 0.5, cd: 2.3, xp: 4, coins: [1, 4], model: 'stymphalian', pitch: 1.7, projectile: 'feather', voice: 'screech' },
  automaton: { name: 'Greek-Fire Automaton', tier: 'minor', hp: 30, speed: 3.9, dmg: 26, radius: 0.55, height: 1.1, ai: 'blob', range: 1.8, windup: 0.9, cd: 0, xp: 4, coins: [1, 4], model: 'automaton', pitch: 1.8, aura: 'greekfire', blast: 0x6aff3a },
  ghost: { name: 'Restless Spirit', tier: 'minor', hp: 38, speed: 3.2, dmg: 8, radius: 0.45, height: 2, ai: 'ranged', range: 10, keep: 6.5, windup: 0.6, cd: 2.2, xp: 4, coins: [1, 3], model: 'ghost', pitch: 0.9, projectile: 'wisp', voice: 'moan', aura: 'wisp', knockResist: 0.2 },
  fury: { name: 'Fury', tier: 'elite', hp: 95, speed: 3.8, dmg: 13, radius: 0.45, height: 2.1, ai: 'teleport', range: 2.2, windup: 0.45, cd: 1.6, xp: 10, coins: [4, 7], model: 'fury', pitch: 1.1, puff: 0x3a2a24, slashColor: 0xff8a2a, voice: 'screech' },
  dracaena: { name: 'Dracaena', tier: 'elite', hp: 190, speed: 2.4, dmg: 18, radius: 0.8, height: 2.6, ai: 'tank', range: 2.6, windup: 0.85, cd: 2.2, xp: 12, coins: [5, 9], model: 'dracaena', armor: 0.25, shield: true, knockResist: 0.75, pitch: 0.8, voice: 'hiss' },
  hellhound: { name: 'Hellhound', tier: 'elite', hp: 220, speed: 3.6, dmg: 20, radius: 1.1, height: 2.6, ai: 'melee', range: 2.6, windup: 0.7, cd: 1.8, xp: 14, coins: [6, 10], model: 'hellhound', knockResist: 0.7, superArmor: true, pitch: 0.5, aura: 'smoke', voice: 'bark' },
  empousa: { name: 'Empousa', tier: 'elite', hp: 160, speed: 2.6, dmg: 10, radius: 0.5, height: 2.3, ai: 'summon', range: 9, keep: 8, windup: 1.0, cd: 5, xp: 16, coins: [8, 14], model: 'empousa', knockResist: 0.4, pitch: 1.2, summons: 'pup', aura: 'fire', projectile: 'fire', voice: 'screech' },
  scorpion: { name: 'Pit Scorpion', tier: 'elite', hp: 140, speed: 3.4, dmg: 12, radius: 0.8, height: 1.3, ai: 'melee', range: 2.2, windup: 0.55, cd: 1.5, xp: 10, coins: [4, 8], model: 'scorpion', armor: 0.2, knockResist: 0.5, pitch: 1.4, voice: 'click', poison: { dps: 4, dur: 4 }, slashColor: 0x9aff3a },
  skeleton: { name: 'Skeleton Warrior', tier: 'elite', hp: 110, speed: 3, dmg: 9, radius: 0.45, height: 2, ai: 'ranged', range: 12, keep: 7, windup: 0.6, cd: 1.9, xp: 9, coins: [3, 7], model: 'skeleton', pitch: 1.1, projectile: 'bullet', voice: 'rattle', regrow: true },
  gorgon_statue: { name: 'Living Statue', tier: 'elite', hp: 150, speed: 2.6, dmg: 16, radius: 0.5, height: 2.1, ai: 'statue', range: 2.2, windup: 0.7, cd: 1.6, xp: 9, coins: [3, 6], model: 'gorgon_statue', armor: 0.35, knockResist: 0.6, pitch: 0.7, voice: 'grind', wake: 5 },
  cyclops: { name: 'Cyclops', tier: 'champion', hp: 620, speed: 2.3, dmg: 28, radius: 1.2, height: 4.2, ai: 'tank', range: 3.2, windup: 1.0, cd: 2.4, xp: 40, coins: [15, 25], model: 'cyclops', knockResist: 0.9, superArmor: true, pitch: 0.45, voice: 'roar', slamR: 3.6 },
};
// Old Cursed Dungeons kinds still requested by shared code (wave spawner,
// level tables) map onto the Greek bestiary.
export const LEGACY_KINDS = { swarmer: 'pup', imp: 'pup', spitter: 'harpy', blob: 'automaton', tank: 'dracaena', teleporter: 'fury', summoner: 'empousa' };
for (const [old, now] of Object.entries(LEGACY_KINDS)) Object.defineProperty(MONSTERS, old, { value: MONSTERS[now], enumerable: false });
export const MONSTER_IDS = Object.keys(MONSTERS);
export const CURSES = MONSTERS;
export const resolveKind = (kind) => (MONSTERS[kind] ? (LEGACY_KINDS[kind] ?? kind) : 'pup');

export function buildMonsterModel(model) { const rig = (MODELS[model] ?? MODELS.pup)(); rig.tick = (dt, e) => animateExtras(rig, dt, e); return rig; }
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
