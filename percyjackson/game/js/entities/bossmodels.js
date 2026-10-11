// Boss models for The Lightning Thief, after design/concept/vox-bosses-1.png
// (and vox-enemies.png for the Furies and hellhounds, vox-npcs.png for Luke).
// Every skin and prop material is cached, so a boss arriving mid-fight never
// compiles a shader. Each builder returns a Rig or QuadRig; rig.extras holds
// the parts the boss patterns move (whips, heads, beds, the motorcycle).
import * as THREE from 'three/webgpu';
import { Rig, PX } from './character.js';
import { QuadRig, paintQuad, quadPart } from './quad.js';
import { paintPerson } from './mortals.js';
import { buildFury, bronzeSpider } from './monsters.js';
import { HS, solid, skinMat, prop, group, voxHair, voxCubes, snake, lavaCracks, fur, spikedCollar, sway, rng, bruteLimbs } from './parts.js';

const GOLD = () => solid(0xc9963a, 0.15, 0.35, 0.75);
const BRONZE = () => solid(0xb8782e, 0.1, 0.35, 0.7);

// ---------------------------------------------------------------- shared bits
// A dog's head (head, snout, hinged jaw) built from the QuadRig skin regions,
// for Cerberus's extra heads.
function dogHead(rig, parent, hs) {
  const head = new THREE.Group(); parent.add(head);
  head.add(rig.mesh(quadPart('head', hs, hs, hs, [0, 0, hs * 0.35])));
  const sn = hs * 0.5;
  head.add(rig.mesh(quadPart('snout', sn, sn * 0.75, sn, [0, -hs * 0.18, hs * 0.85 + sn * 0.5])));
  const mouth = new THREE.Group(); mouth.position.set(0, -hs * 0.42 * PX, hs * 0.75 * PX); head.add(mouth);
  mouth.add(rig.mesh(quadPart('jaw', sn * 0.9, sn * 0.35, sn, [0, -sn * 0.17, sn * 0.5])));
  for (const sx of [-1, 1]) { const e = rig.mesh(quadPart('ear', 2, 3, 1, [0, 1.5, 0])); e.position.set(sx * hs * 0.32 * PX, hs * 0.5 * PX, hs * 0.2 * PX); e.rotation.z = -sx * 0.25; head.add(e); }
  return { head, mouth };
}
// A lion's mane: layered cubes around the back of a QuadRig head.
function mane(rig, head, hs, seed, cols, { thick = 1, chest = true } = {}) {
  const r = rng(seed), cubes = [];
  for (let i = 0; i < 150 * thick; i++) {
    const a = r() * Math.PI * 2, R = hs * (0.62 + r() * 0.42);
    const x = Math.cos(a) * R, y = Math.sin(a) * R * 0.95 - 0.3, z = hs * (-0.25 + r() * 0.45) - (R - hs * 0.6) * 0.5;
    const sz = 1.2 + r() * 1.4;
    cubes.push({ x, y, z, w: sz, h: sz * 1.2, d: sz, col: cols[Math.floor(r() * cols.length)] });
  }
  if (chest) for (let i = 0; i < 26; i++) cubes.push({ x: (r() - 0.5) * hs * 1.1, y: -hs * 0.55 - r() * hs * 0.7, z: hs * (-0.1 + r() * 0.35), w: 2.2, h: 2.6, d: 2.2, col: cols[Math.floor(r() * cols.length)] });
  return voxCubes(rig, head, cubes);
}
// A fur clump over a part (minotaur shoulders, hellhound hackles).
function furClump(rig, parent, seed, cols, { x = 0, y = 0, z = 0, sx = 8, sy = 4, sz = 6, n = 30, size = [1.6, 2.8] } = {}) {
  const r = rng(seed), cubes = [];
  for (let i = 0; i < n; i++) { const s = size[0] + r() * (size[1] - size[0]); cubes.push({ x: x + (r() - 0.5) * sx, y: y + (r() - 0.5) * sy, z: z + (r() - 0.5) * sz, w: s, h: s, d: s, col: cols[Math.floor(r() * cols.length)] }); }
  return voxCubes(rig, parent, cubes);
}

// ---------------------------------------------------------------- builders
export const BOSS_MODELS = {
  // Alecto: Mrs. Dodds as she really is (vox-enemies, bottom right)
  alecto: () => buildFury('alecto', { scale: 1.75, seed: 71 }),
  megaera: () => buildFury('megaera', { scale: 1.6, skin: 0xa8ae98, hair: 0xb8b8b0, wing: 0x4a3424, seed: 72 }),
  tisiphone: () => buildFury('tisiphone', { scale: 1.6, skin: 0xa8a2a8, hair: 0xf0f0ec, wing: 0x5a2a22, dress: 0x24141a, mouthGrin: false, seed: 73 }),

  // The Minotaur: a towering brown bull-man in white briefs with a gold belt
  // medallion, cream horns, a gold nose ring and red eyes.
  minotaur: () => {
    const fur0 = 0x7a4426, furD = 0x4e2a16;
    const m = skinMat('boss_minotaur', (S) => paintPerson(S, { skin: fur0, hair: 0x3a2214, fringe: 1, hairSide: 2, hairBack: 3, eye: 0xff2a1a, eyeWhite: 0xff8a3a, scowl: true, brow: 0x2a160c, mouth: false, top: fur0, sleeve: fur0, hand: furD, pants: fur0, skirt: 0xf0ece0, skirtLen: 4, shoes: 0x2a1a10,
      body: (s) => { s.rect(16, 29, 24, 3, 0xf0ece0, 0.04); s.rect(16, 28, 24, 1, 0xc9963a, 0); fur(s, 16, 16, 24, 13, 120, furD, 0x9a5a32); fur(s, 40, 16, 16, 16, 60, furD, 0x9a5a32); fur(s, 32, 48, 16, 16, 60, furD, 0x9a5a32); fur(s, 0, 16, 16, 16, 50, furD, 0x9a5a32); fur(s, 16, 48, 16, 16, 50, furD, 0x9a5a32); s.rect(20, 22, 3, 3, 0x8a5030, 0.1); s.rect(25, 22, 3, 3, 0x8a5030, 0.1); },
      face: (s, ey) => { fur(s, 8, 8, 8, 8, 14, furD, 0x9a5a32); s.px(9, ey, 0xff8a3a); s.px(10, ey, 0xff2a1a); s.px(13, ey, 0xff2a1a); s.px(14, ey, 0xff8a3a); } }), { emit: 3 });
    const rig = new Rig({ material: m, scale: 2.2, bodyW: 13, bodyH: 13, bodyD: 7, armW: 6, headS: 7.5, legH: 13 });
    bruteLimbs(rig, { armLen: 1.3, armThick: 1.15, legThick: 1.5, legX: 3.4 });
    rig.neck.position.z = 1.4 * PX;   // the head thrust forward, low between the shoulders
    const hs = 7.5 / 8 * HS;
    // bull muzzle, nostrils, gold ring
    const muzzle = prop(rig, rig.head, 6, 4.4, 3.6, solid(0x3e2414), 0, 2.2 * hs, 5.6 * hs);
    prop(rig, muzzle, 1.2, 1.2, 0.4, solid(0x120a06), -1.6, 0.6, 1.9); prop(rig, muzzle, 1.2, 1.2, 0.4, solid(0x120a06), 1.6, 0.6, 1.9);
    const ring = group(muzzle, 0, -1.8, 2.1);
    prop(rig, ring, 3.2, 0.7, 0.7, GOLD(), 0, -1, 0); prop(rig, ring, 0.7, 2, 0.7, GOLD(), -1.3, 0, 0); prop(rig, ring, 0.7, 2, 0.7, GOLD(), 1.3, 0, 0);
    // great cream horns curving out and up
    const horn = solid(0xeadfc4, 0, 0.6), hornTip = solid(0xb8a888, 0, 0.6);
    for (const s of [-1, 1]) {
      const h1 = group(rig.head, s * 4.2 * hs, 6.4 * hs, 0.5 * hs, 0, 0, s * 0.1);
      prop(rig, h1, 6, 2.8, 2.8, horn, s * 3, 0, 0);
      const h2 = group(h1, s * 6, 0, 0, 0, 0, -s * 0.85); prop(rig, h2, 4.4, 2.4, 2.4, horn, s * 2.2, 0, 0);
      const h3 = group(h2, s * 4.4, 0, 0, 0, 0, -s * 0.55); prop(rig, h3, 3, 1.8, 1.8, hornTip, s * 1.5, 0, 0);
      prop(rig, rig.head, 3, 1.6, 1.2, solid(0x4a2c18), s * 4.8 * hs, 4.8 * hs, -1 * hs, 0, 0, s * 0.5);   // ears
    }
    // a shaggy crest, a hump of fur over the shoulders, hairy forearms
    const furs = [0x5a3018, 0x7a4426, 0x6a3a20, 0x3e2414];
    furClump(rig, rig.head, 3, furs, { y: 8.4 * hs, z: -1 * hs, sx: 6 * hs, sy: 1.4, sz: 6 * hs, n: 14, size: [1.4, 2.2] });
    furClump(rig, rig.torso, 4, furs, { y: 12.6, z: -1.6, sx: 12, sy: 2, sz: 5, n: 34, size: [1.8, 2.8] });
    for (const arm of [rig.armR, rig.armL]) { prop(rig, arm, 7.6, 5, 6.6, solid(0x3e2414), 0, -10 * 1.3 - 0.5, 0); for (const dx of [-2, 0, 2]) prop(rig, arm, 1.4, 1.6, 1.4, solid(0x241410), dx, -10 * 1.3 - 3.4, 2.4); prop(rig, arm, 8.4, 6, 8.4, solid(0x7a4426, 0, 0.9), 0, 1.4, 0); }
    for (const leg of [rig.legR, rig.legL]) { prop(rig, leg, 6.4, 3.4, 7, solid(0x241410), 0, -11.8, 0.6); }
    // white loincloth with a gold belt and medallion
    prop(rig, rig.torso, 13.4, 1.6, 7.4, GOLD(), 0, 0.8, 0);
    prop(rig, rig.torso, 4.4, 4, 1, GOLD(), 0, 0.4, 3.9);
    prop(rig, rig.torso, 2.4, 2.4, 0.6, solid(0xffd84a, 0.6, 0.3, 0.8), 0, 0.4, 4.4);
    prop(rig, rig.hips, 7, 5, 1, solid(0xf0ece0, 0, 0.9), 0, -2.4, 3.4);
    rig.extras.muzzle = muzzle;
    rig.hunch = 0.22; rig.armSpread = 0.22;
    return rig;
  },

  // The Chimera: a lion's head and fiery mane, a goat's head rising from its
  // grey haunches, and a long rattlesnake for a tail.
  chimera: () => {
    const m = skinMat('boss_chimera', (S) => paintQuad(S, { base: 0xc8a878, dark: 0x8a7a66, belly: 0xd8c098, back: 0xb8986a, eye: 0xffc81a, eyeLow: 0xff7a1a, nose: 0x3a2214, teeth: 0xfff4e0, speckles: 40,
      custom: (s) => { s.box(0, 0, 8, 8, 8, 0xd89a40, 0.12); s.rect(9, 10, 2, 2, 0xffd84a, 0); s.rect(13, 10, 2, 2, 0xffd84a, 0); s.px(10, 11, 0x1a0a00); s.px(13, 11, 0x1a0a00); s.rect(9, 9, 6, 1, 0x8a5a20, 0); s.box(32, 0, 4, 4, 4, 0xe8b868, 0.1); s.rect(36, 4, 4, 1, 0x3a2214, 0); s.box(48, 0, 4, 2, 4, 0xa8282a, 0.1);
        s.box(40, 32, 2, 2, 6, 0x5a4a2a, 0.1); for (let y = 32; y < 40; y += 2) s.rect(40, y, 16, 1, 0xe0c060, 0); for (let x = 41; x < 56; x += 3) s.rect(x, 33, 1, 6, 0x2a2010, 0);
        fur(s, 0, 16, 40, 20, 60, 0x9a8466, 0xe0c8a0); for (const x of [0, 20]) s.rect(x, 28, 6, 8, 0x8a8478, 0.15); s.rect(12, 16, 8, 6, 0x8a8478, 0.15); } }), { emit: 2.6 });
    const rig = new QuadRig({ material: m, scale: 2.5, bodyL: 14, bodyW: 7.5, bodyH: 7, legH: 7, legW: 3.2, headS: 7.5, ears: true, tail: 8, tailLen: 24, tailW: 2.2, tailCurl: 0.42, gait: 0.7 });
    mane(rig, rig.head, 7.5, 31, [0xd8701a, 0xb85010, 0xf0a030, 0x9a4010, 0xe88a20]);
    // grey goat haunches over the back half
    furClump(rig, rig.torso, 32, [0x8a8478, 0x6a6458, 0x9a948a], { y: 1, z: -3.5, sx: 8, sy: 7, sz: 7, n: 40, size: [2, 3.2] });
    for (const leg of rig.legs.slice(2)) prop(rig, leg, 3.4, 2, 3.6, solid(0x3a3028), 0, -7.2, 0.3);
    for (const leg of rig.legs.slice(0, 2)) for (const dx of [-1, 0, 1]) prop(rig, leg, 0.7, 0.8, 1.4, solid(0xf0e8d0), dx, -7.2, 1.8);
    // goat head on a neck from the back, long curling horns
    const goat = group(rig.torso, 0, 3.5, -2, -0.15);
    const grey = solid(0x7a7468, 0, 0.9), greyD = solid(0x5a564e, 0, 0.9);
    prop(rig, goat, 4, 10, 4, grey, 0, 5, 0, 0.2);
    furClump(rig, goat, 33, [0x8a8478, 0x6a6458, 0x9a948a], { y: 4, z: -0.5, sx: 4, sy: 8, sz: 4, n: 18 });
    const gh = group(goat, 0, 10.5, 2, 0.3);
    prop(rig, gh, 5, 5, 6.4, grey, 0, 0, 1);
    prop(rig, gh, 3.2, 2.6, 3, greyD, 0, -0.8, 4.2);
    prop(rig, gh, 2, 2.6, 1.2, solid(0xd8d0c0), 0, -3, 3.4);   // beard
    prop(rig, gh, 0.9, 0.9, 0.4, solid(0xffd84a, 2.4), -1.5, 0.8, 3.8); prop(rig, gh, 0.9, 0.9, 0.4, solid(0xffd84a, 2.4), 1.5, 0.8, 3.8);
    const hornM = solid(0x3a342c, 0, 0.6);
    for (const s of [-1, 1]) {
      let p = group(gh, s * 1.4, 2.2, -0.5, -0.5, 0, s * 0.25);
      for (let i = 0; i < 5; i++) { prop(rig, p, 1.6 - i * 0.18, 2.6, 1.6 - i * 0.18, hornM, 0, 1.3, 0); p = group(p, 0, 2.4, 0, -0.55, 0, s * 0.12); }
    }
    rig.extras.goat = goat;
    // rattlesnake head and rattle at the tail tip
    const sn = group(rig.tailTip, 0, 0, -3, 0.9);
    prop(rig, sn, 3.4, 2.4, 4.4, solid(0x5a4a2a, 0, 0.6), 0, 0.6, -2.4);
    prop(rig, sn, 3, 1, 3.4, solid(0xe0c060, 0, 0.6), 0, -0.6, -2.4);
    prop(rig, sn, 0.7, 0.7, 0.4, solid(0xffe04a, 2.4), -1, 1.2, -4.4); prop(rig, sn, 0.7, 0.7, 0.4, solid(0xffe04a, 2.4), 1, 1.2, -4.4);
    prop(rig, sn, 0.4, 1.6, 0.4, solid(0xffffff), -0.7, -1.2, -4.2); prop(rig, sn, 0.4, 1.6, 0.4, solid(0xffffff), 0.7, -1.2, -4.2);
    prop(rig, sn, 0.4, 0.3, 2, solid(0xd8202a, 0.5), 0, -0.4, -5.4);
    rig.extras.snake = sn;
    return rig;
  },

  // A hellhound as big as a house: soot-black with lava running in its
  // cracks, a burning ridge, a gold spiked collar and a furnace for a mouth.
  hellhound_alpha: () => {
    const m = skinMat('boss_hellhound_alpha', (S) => paintQuad(S, { base: 0x1c181c, dark: 0x0c0a0c, belly: 0x2a2226, back: 0x141014, eye: 0xff2a0a, eyeLow: 0xffb04a, nose: 0x050505, speckles: 40, brow: 0x0a0808, teeth: 0xfff0d0,
      custom: (s) => { fur(s, 0, 16, 40, 20, 80, 0x0a0808, 0x3a3034); lavaCracks(s, 0, 16, 40, 20, 16, [0xd83a0a, 0xff6a1a]); lavaCracks(s, 40, 16, 12, 11, 2, [0xd83a0a, 0xff6a1a]); lavaCracks(s, 0, 0, 32, 8, 2, [0xd83a0a, 0xff6a1a]); s.box(48, 0, 4, 2, 4, 0x5a1008, 0.2); s.rect(52, 4, 4, 1, 0xff6a1a, 0); s.rect(36, 7, 4, 1, 0xff6a1a, 0); } }), { emit: 3.2 });
    const rig = new QuadRig({ material: m, scale: 3.4, bodyL: 14, bodyW: 8, bodyH: 7.5, legH: 7.5, legW: 3.4, headS: 7.5, ears: true, tail: 5, tailLen: 10, tailW: 2, tailCurl: 0.4, gait: 0.7 });
    const blacks = [0x141012, 0x1e181c, 0x0a0808, 0x2a2226];
    furClump(rig, rig.torso, 41, blacks, { y: 3.6, z: 3, sx: 8, sy: 3, sz: 9, n: 50, size: [1.8, 3] });
    const ember = solid(0xff4a14, 2.4);
    for (let i = 0; i < 6; i++) prop(rig, rig.torso, 1.4, 2.4 + (i % 2), 1.4, ember, (i % 2 ? 0.8 : -0.8), 4.8, 5 - i * 2.2, -0.3);
    spikedCollar(rig, rig.neck, { r: 3.4, h: 2.6, y: -2.2, z: -0.6, rx: -0.5, n: 12 });
    prop(rig, rig.tailTip, 1.8, 1.8, 2.4, ember, 0, 0, -1.8);
    for (const leg of rig.legs) for (const dx of [-1, 0, 1]) prop(rig, leg, 0.7, 0.9, 1.4, solid(0xe8d8b0), dx, -7.6, 1.9);
    prop(rig, rig.mouth, 2.6, 0.8, 2.6, solid(0xff6a1a, 3), 0, 0.4, 1.8);   // the glow inside the jaws
    return rig;
  },

  // Medusa: veiled in black with gold trim; writhing green snakes rise from
  // under the hood; her face is never shown, only her eyes when she stares.
  medusa: () => {
    const robe = 0x1a1418;
    const m = skinMat('boss_medusa', (S) => paintPerson(S, { skin: 0x0a0808, eye: 0x0a0808, eyeWhite: 0x0a0808, brow: 0x0a0808, mouth: false, top: robe, collar: 0xc9963a, trim: 0xc9963a, sleeve: robe, hand: 0x9ab890, pants: robe, skirt: robe, skirtLen: 12, shoes: false,
      body: (s) => { s.rect(16, 29, 24, 2, 0xc9963a, 0); s.rect(23, 28, 2, 4, 0xffd84a, 0); for (const [u, v] of [[40, 16], [32, 48]]) s.rect(u, v + 12, 16, 1, 0xc9963a, 0); s.rect(32, 0, 32, 16, robe, 0.08); } }), { emit: 2 });
    const rig = new Rig({ material: m, scale: 1.9, bodyW: 8, bodyD: 5, armW: 4, legH: 12 });
    rig.legR.visible = rig.legL.visible = false;
    const cloth = solid(robe, 0, 0.95), cloth2 = solid(0x241c22, 0, 0.95), gold = GOLD();
    // hood and veil
    const hood = group(rig.head, 0, 0, 0);
    prop(rig, hood, 11 * HS, 10 * HS, 11 * HS, cloth, 0, 4.6 * HS, -0.6 * HS);
    prop(rig, hood, 6 * HS, 3 * HS, 6 * HS, cloth, 0, 10.2 * HS, -2 * HS, 0.3);
    for (const sx of [-1, 1]) prop(rig, hood, 0.8, 10 * HS, 0.8, gold, sx * 5.2 * HS, 4.6 * HS, 4.9 * HS);
    prop(rig, rig.torso, 1, 12, 0.6, gold, 0, 6, 2.8);
    for (let i = 0; i < 6; i++) prop(rig, rig.torso, 1.8, 1.8, 1.4, cloth2, -4.4 + i * 1.8, 12, -0.5 + (i % 2));
    const veil = group(hood, 0, 9 * HS, 4.9 * HS);
    prop(rig, veil, 9.6 * HS, 13 * HS, 0.8, cloth2, 0, -6.5 * HS, 0);
    prop(rig, veil, 9.8 * HS, 0.8, 1, gold, 0, 0, 0);
    for (let i = 0; i < 5; i++) prop(rig, veil, 1.4, 2 + (i % 2) * 2, 0.6, cloth2, -3.6 + i * 1.8, -13.6 * HS, 0);
    rig.extras.veil = veil; sway(rig, veil, 'x', 0.06, 1.6);
    // eyes that light up behind the veil when she stares
    const eyes = group(rig.head, 0, 4.6 * HS, 5.6 * HS);
    prop(rig, eyes, 1.6, 0.9, 0.3, solid(0xc8ff6a, 4), -1.8, 0, 0); prop(rig, eyes, 1.6, 0.9, 0.3, solid(0xc8ff6a, 4), 1.8, 0, 0);
    eyes.visible = false; rig.extras.eyes = eyes;
    // the snakes
    const green = solid(0x2e7a3a, 0, 0.6), belly = solid(0x9ac86a, 0, 0.6);
    const spots = [[-4, 2, -0.2, 1.0], [4, 2, -0.2, -1.0], [-3, -2, -0.7, 0.7], [3, -2, -0.7, -0.7], [0, -4, -0.9, 0], [-2, 3, 0.2, 0.4], [2, 3, 0.2, -0.4], [-5, -1, -0.4, 1.4], [5, -1, -0.4, -1.4]];
    for (const [x, z, rx, rz] of spots) snake(rig, rig.head, { len: 5, seg: 2.6, w: 2.1, headW: 3.2, body: green, belly, at: [x * HS, 9 * HS, z * HS], rot: [rx, 0, rz], amp: 0.3, speed: 2.6 });
    // the robe falls to the ground in folds
    for (let i = 0; i < 9; i++) { const g = group(rig.hips, -4.4 + i * 1.1, 1, ((i % 3) - 1) * 1.4); prop(rig, g, 1.8, 13 + (i % 2), 3.6 + (i % 3), i % 2 ? cloth : cloth2, 0, -6.5, 0); sway(rig, g, 'x', 0.05, 1.5, i); }
    for (let i = 0; i < 9; i++) prop(rig, rig.hips, 1.2, 0.8, 1.2, gold, -4.4 + i * 1.1, -11.8, 2.6);
    // wide sleeves, gold bracelets, clawed grey-green hands
    for (const arm of [rig.armR, rig.armL]) { prop(rig, arm, 5.6, 7, 5.6, cloth, 0, -5.5, 0); prop(rig, arm, 4.6, 1.4, 4.6, gold, 0, -7.6, 0); for (const dx of [-1.2, 0, 1.2]) prop(rig, arm, 0.6, 1.8, 0.8, solid(0x2a2420), dx, -11, 1.6); }
    prop(rig, rig.torso, 3, 3, 1, gold, 0, 0.6, 2.8);
    rig.hunch = 0.05;
    return rig;
  },

  // Hephaestus's mechanical queen: the bronze spider at boss size, with a
  // crown of spikes, gears turning in her abdomen and a furnace glow.
  spiders: () => bronzeSpider('boss_spider_queen', { scale: 2.6, queen: true }),

  // Crusty: a big smooth salesman in a white suit and red tie with a red
  // robe over his shoulders, a huge grin and a woodsman's axe.
  procrustes: () => {
    const m = skinMat('boss_procrustes', (S) => paintPerson(S, { skin: 0xd8a07a, hair: 0x141012, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a1a0a, brow: 0x141012, grin: true, top: 0xf8f4ec, jacket: 0xece4d4, lapel: 0xd8ccb8, collar: 0xffffff, trim: 0xb8232f, sleeve: 0xece4d4, hand: 0xd8a07a, pants: 0xece4d4, shoes: 0x2a1a12,
      body: (s) => { s.rect(23, 21, 2, 10, 0xb8232f, 0); s.rect(23, 37, 2, 10, 0xb8232f, 0); } }), { emit: 0, fill: 0.1 });
    const red = solid(0xb8232f, 0, 0.8), redD = solid(0x8a1a22, 0, 0.8);
    const rig = new Rig({ material: m, scale: 2.2, bodyW: 10, bodyD: 6, armW: 4.6, headS: 9, legH: 12, cape: { material: red, segments: 4, length: 26, width: 12 } });
    voxHair(rig, { style: 'mop', base: 0x1a1414, shade: 0x0a0808, light: 0x3a2e2a, seed: 81, cap: true }, 0.88);
    // the red robe panels down the front, with gold edging
    for (const sx of [-1, 1]) { prop(rig, rig.torso, 2.6, 13, 1, red, sx * 4, 6, 3.2); prop(rig, rig.torso, 0.6, 13, 1.1, solid(0xc9963a, 0, 0.4, 0.6), sx * 2.8, 6, 3.3); prop(rig, rig.torso, 3, 2, 7, redD, sx * 5, 12, 0); }
    prop(rig, rig.torso, 2.6, 2, 1, solid(0xffffff), -3, 10.4, 3.1);   // pocket square
    // the axe: long haft, a broad bronze head
    const axe = group(rig.handR, 0, -1, 1.5, -1.3, 0, 0);
    prop(rig, axe, 1.6, 30, 1.6, solid(0x6a4022), 0, 8, 0);
    prop(rig, axe, 1.2, 9, 7, solid(0xc8ccd4, 0.1, 0.3, 0.8), 0, 20, 3.4);
    prop(rig, axe, 1.4, 11, 1.2, solid(0xe8ecf4, 0.3, 0.25, 0.9), 0, 20, 7.2);
    prop(rig, axe, 2, 3, 3, GOLD(), 0, 20, -0.6);
    rig.extras.axe = axe;
    rig.hunch = 0.05;
    return rig;
  },

  // Cerberus: three huge black heads with burning eyes, red mouths, drool and
  // gold spiked collars on one enormous body.
  cerberus: () => {
    const m = skinMat('boss_cerberus', (S) => paintQuad(S, { base: 0x1e1c26, dark: 0x0e0d14, belly: 0x2a2834, back: 0x16141c, eye: 0xff4a0a, eyeLow: 0xffa02a, nose: 0x050505, speckles: 50, brow: 0x0a0a10, teeth: 0xfff4e0,
      custom: (s) => { fur(s, 0, 16, 40, 20, 90, 0x0a0a10, 0x3a3848); fur(s, 0, 0, 32, 16, 30, 0x0a0a10, 0x3a3848); s.box(48, 0, 4, 2, 4, 0xa82030, 0.1); s.rect(52, 4, 4, 1, 0xf4f0e0, 0); s.rect(36, 6, 4, 2, 0xc8283a, 0.1); s.box(52, 16, 2, 3, 1, 0x8a2a3a, 0.1); } }), { emit: 3 });
    const rig = new QuadRig({ material: m, scale: 3.3, bodyL: 14, bodyW: 11, bodyH: 8, legH: 8, legW: 3.8, headS: 7.5, ears: true, tail: 4, tailLen: 9, tailW: 2.2, tailCurl: 0.2, gait: 0.65, neckUp: 4, headZ: 1 });
    const blacks = [0x16141c, 0x22202a, 0x0e0d14, 0x2e2c38];
    furClump(rig, rig.torso, 51, blacks, { y: 3.4, z: 2, sx: 10, sy: 4, sz: 10, n: 60, size: [2, 3.2] });
    const heads = [];
    const tongue = solid(0xd8304a, 0.3), drool = solid(0xe8f0f4, 0.4, 0.2);
    const dress = (h, mouth) => { prop(rig, mouth, 2.4, 0.5, 3.4, tongue, 0, 0.2, 2.6); prop(rig, mouth, 0.5, 2.6, 0.5, drool, 1.1, -1.5, 3.6); };
    for (const side of [-1, 0, 1]) {
      let neck, head, mouth;
      if (side === 0) { neck = rig.neck; head = rig.head; mouth = rig.mouth; }
      else {
        neck = new THREE.Group(); neck.position.set(side * 7.4 * PX, (8 * 0.3 + 1.2) * PX, (14 / 2 - 2) * PX); neck.rotation.y = side * 0.45; rig.torso.add(neck);
        prop(rig, neck, 5, 5, 5, rig.material, 0, -0.5, -1.5);
        ({ head, mouth } = dogHead(rig, neck, 7));
      }
      dress(head, mouth);
      spikedCollar(rig, neck, { r: side ? 4 : 4.4, h: 2.2, y: -0.8, z: 0.4, rx: -0.3, n: 10 });
      heads.push({ neck, head, mouth, side, act: 0 });
    }
    rig.extras.heads = heads;
    for (const leg of rig.legs) for (const dx of [-1.1, 0, 1.1]) prop(rig, leg, 0.8, 1, 1.6, solid(0xe8dcc0), dx, -8.2, 2.1);
    return rig;
  },

  // Ares: a huge biker in a spiked black leather jacket, a black T-shirt with
  // a red Spartan helmet, ripped trousers, boots, red-hot sunglasses and a
  // burning sword.
  ares: () => {
    const skin = 0xc88a62;
    const m = skinMat('boss_ares', (S) => paintPerson(S, { skin, hair: 0x1a1210, fringe: 1, hairSide: 2, hairBack: 4, eye: 0xff2a0a, eyeWhite: 0xff2a0a, brow: 0x1a1210, beard: 0x1e1612, top: 0x1a1618, jacket: 0x141214, lapel: 0x3a3438, sleeve: 0x141214, hand: skin, pants: 0x3a2c24, shoes: 0x141012,
      body: (s) => { s.rect(21, 22, 6, 2, 0xd8401a, 0); s.rect(22, 24, 4, 4, 0xd8401a, 0); s.px(23, 25, 0x1a1618); s.px(24, 25, 0x1a1618); s.rect(23, 26, 2, 2, 0x1a1618, 0); s.rect(22, 28, 1, 1, 0xd8401a, 0);
        for (let y = 36; y < 48; y += 2) { s.px(21, y, 0xc8c8d0); s.px(26, y, 0xc8c8d0); } s.rect(16, 46, 24, 2, 0x2a2428, 0);
        for (const [u, v] of [[0, 16], [16, 48]]) { s.rect(u + 4, v + 7, 3, 2, skin, 0); s.rect(u + 9, v + 9, 2, 1, skin, 0); s.rect(u, v + 12, 16, 4, 0x141012, 0); } } }), { emit: 1.6 });
    const rig = new Rig({ material: m, scale: 1.95, bodyW: 12, bodyH: 13, bodyD: 6, armW: 5, headS: 8, legH: 13 });
    bruteLimbs(rig, { armLen: 1.1, armThick: 1.2, legThick: 1.35, legX: 3 });
    rig.armSpread = 0.12;
    voxHair(rig, { style: 'spiky', base: 0x1a1210, shade: 0x0a0606, light: 0x3a2a22, seed: 91, cap: true }, 0.72);
    const hs = 8 / 8 * HS;
    // red-hot wraparound sunglasses across the eyes, and a heavy beard
    prop(rig, rig.head, 8.8 * hs, 1.8 * hs, 1, solid(0x1a0a08), 0, 4.5 * hs, 4.5 * hs);
    prop(rig, rig.head, 3.2 * hs, 1.3 * hs, 0.6, solid(0xff3a14, 4), -2.1 * hs, 4.5 * hs, 4.9 * hs);
    prop(rig, rig.head, 3.2 * hs, 1.3 * hs, 0.6, solid(0xff3a14, 4), 2.1 * hs, 4.5 * hs, 4.9 * hs);
    prop(rig, rig.head, 8.4 * hs, 3 * hs, 1.4, solid(0x1e1612, 0, 0.9), 0, 0.9 * hs, 4.3 * hs);
    prop(rig, rig.head, 4 * hs, 1.2 * hs, 1.2, solid(0x1e1612, 0, 0.9), 0, 2.6 * hs, 4.5 * hs);
    // studded spiky shoulders, wristbands, boot buckles
    const silver = solid(0xc8c8d0, 0.1, 0.3, 0.9), leather = solid(0x141214, 0, 0.5);
    for (const arm of [rig.armR, rig.armL]) {
      prop(rig, arm, 6.4, 3, 6.4, leather, 0, 1, 0);
      for (const [x, z] of [[0, 0], [-2, 2], [2, -2], [2, 2], [-2, -2]]) prop(rig, arm, 1, 2, 1, silver, x, 3.4, z);
      prop(rig, arm, 5.6, 2.4, 5.6, leather, 0, -8.5, 0); for (const z of [-1.4, 1.4]) prop(rig, arm, 0.8, 0.8, 0.8, silver, 2.8, -8.5, z);
    }
    prop(rig, rig.torso, 11, 2, 6, leather, 0, 12, 0);
    for (const leg of [rig.legR, rig.legL]) { prop(rig, leg, 5.4, 4, 6, solid(0x141012), 0, -10.6, 0.5); prop(rig, leg, 5.6, 0.8, 1, silver, 0, -9.4, 3.4); }
    prop(rig, rig.torso, 10.6, 1.4, 5.6, solid(0x2a2020), 0, 0.6, 0); prop(rig, rig.torso, 2, 1.6, 1, silver, 0, 0.6, 2.9);
    // the burning sword
    const sword = group(rig.handR, 0, -1, 1, -1.35, 0, 0);
    prop(rig, sword, 1.4, 5, 1.4, solid(0x2a1a10), 0, 0, 0); prop(rig, sword, 6, 1.2, 1.6, GOLD(), 0, 3, 0);
    prop(rig, sword, 2.6, 18, 0.9, solid(0xff6a1a, 3.2), 0, 12.6, 0); prop(rig, sword, 1, 17, 1.1, solid(0xffd84a, 4), 0, 12.4, 0);
    rig.extras.sword = sword;
    // a spear for the thrust, slung on his back until he needs it
    const spear = group(rig.handL, 0, -1, 1, -1.5, 0, 0);
    prop(rig, spear, 1.2, 40, 1.2, solid(0x3a2a1e), 0, 10, 0); prop(rig, spear, 2.6, 6, 0.8, solid(0xd8dce4, 0.4, 0.3, 0.9), 0, 32, 0);
    spear.visible = false; rig.extras.spear = spear;
    // the motorcycle, only out for a charge
    const bike = new THREE.Group(); rig.root.add(bike); bike.visible = false; rig.extras.bike = bike;
    const bm = (w, h, d, mat, x, y, z) => prop(rig, bike, w, h, d, mat, x, y, z);
    const black = solid(0x141214, 0, 0.4, 0.5), chrome = solid(0xd8dce4, 0.1, 0.2, 0.95), tire = solid(0x0a0a0a, 0, 0.9), flame = solid(0xff5a14, 2.6);
    for (const z of [-9, 10]) { bm(2.6, 8, 8, tire, 0, 4, z); bm(2.8, 3, 3, chrome, 0, 4, z); }
    bm(4.4, 4, 15, black, 0, 7.5, 0.5); bm(5, 3, 6, solid(0x8a1a14, 0.3, 0.4, 0.4), 0, 10, 4); bm(3.6, 1.4, 8, solid(0x2a1a14), 0, 10.2, -3);
    bm(9, 0.9, 0.9, chrome, 0, 14, 10); bm(0.9, 6, 0.9, chrome, 0, 11, 10); bm(2, 1.6, 6, chrome, 2.6, 4.4, -5); bm(2.4, 2.4, 1, solid(0xfff2c0, 3), 0, 11, 13);
    for (let i = 0; i < 4; i++) bm(1.2, 1.2, 3, flame, 2.6, 4.4 + (i % 2), -9 - i * 2);
    // the trail of fire behind the exhaust
    return rig;
  },

  // Luke Castellan: sandy curls, a scar down his cheek, the orange camp
  // shirt, and Backbiter, its blade half steel and half celestial bronze.
  luke: () => {
    const skin = 0xe8b890;
    const m = skinMat('boss_luke', (S) => paintPerson(S, { skin, hair: 0xd8a850, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a6ab8, brow: 0xa87a30, frown: true, top: 0xf28c28, sleeve: 0xf28c28, shortSleeve: true, pants: 0x3a5a8a, shoes: 0xf0f0f0,
      face: (s, ey) => { s.px(14, ey + 1, 0xb8402a); s.px(14, ey + 2, 0xb8402a); s.px(13, ey + 3, 0xb8402a); s.px(15, ey, 0xb8402a); },
      body: (s) => { const k = 0x17130f; s.rect(22, 23, 4, 2, k, 0); s.px(21, 22, k); s.px(26, 22, k); s.px(20, 21, k); s.px(27, 21, k); s.px(23, 25, k); s.px(24, 26, k); s.rect(16, 31, 24, 1, 0x5a3a22, 0); for (const [u, v] of [[0, 16], [16, 48]]) s.rect(u, v + 13, 16, 1, 0x2a3a5a, 0); } }), { emit: 0, fill: 0.1 });
    const rig = new Rig({ material: m, scale: 1.3 });
    voxHair(rig, { style: 'shaggy', base: 0xd8a850, shade: 0xa87a30, light: 0xf0d080, seed: 101 }, 1);
    // camp bead necklace
    for (let i = 0; i < 5; i++) prop(rig, rig.torso, 1, 1, 1, solid([0x2a6ab8, 0xc82a1a, 0xf4f0e8, 0x2a8a3a, 0xffd84a][i], 0.3), -2 + i, 11.4, 2.3);
    // Backbiter
    const sword = group(rig.handR, 0, -1, 1, -1.4, 0, 0);
    prop(rig, sword, 1.2, 4.4, 1.2, solid(0x3a2418), 0, 0, 0); prop(rig, sword, 5, 1, 1.4, solid(0x8a8a90, 0, 0.3, 0.9), 0, 2.6, 0);
    prop(rig, sword, 1.5, 17, 0.7, solid(0xc8ccd8, 0.4, 0.2, 0.95), -0.75, 11.5, 0);
    prop(rig, sword, 1.5, 17, 0.7, solid(0xe0a040, 1.2, 0.25, 0.85), 0.75, 11.5, 0);
    prop(rig, sword, 1.2, 1.6, 0.6, solid(0xe0a040, 1.2, 0.25, 0.85), 0, 19.6, 0);
    rig.extras.sword = sword;
    return rig;
  },
};

// Procrustes's "magic fingers" water bed: gilt posts, griffin panels, a red
// mattress. Built on demand when he straps a hero down. Unit: world metres.
let bedMats = null;
export function buildBed() {
  bedMats ??= { gold: solid(0xc9963a, 0.15, 0.35, 0.75), panel: solid(0x241a14, 0, 0.7), red: solid(0xb8232f, 0, 0.8), white: solid(0xf4f0e8, 0, 0.9), griffin: solid(0xd8a840, 0.3, 0.4, 0.7) };
  const M = bedMats, g = new THREE.Group();
  const b = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  b(1.5, 0.4, 2.6, M.panel, 0, 0.4, 0);
  b(1.4, 0.3, 2.4, M.red, 0, 0.75, 0.05); b(1.3, 0.2, 0.5, M.white, 0, 0.9, -1.0);
  for (const [x, z] of [[-0.75, -1.3], [0.75, -1.3], [-0.75, 1.3], [0.75, 1.3]]) { b(0.18, z < 0 ? 1.5 : 1.1, 0.18, M.gold, x, z < 0 ? 0.75 : 0.55, z); b(0.26, 0.2, 0.26, M.gold, x, z < 0 ? 1.55 : 1.15, z); }
  b(1.5, 0.9, 0.12, M.panel, 0, 0.95, -1.3); b(1.5, 0.6, 0.12, M.panel, 0, 0.7, 1.3);
  b(0.5, 0.4, 0.04, M.griffin, 0, 1.0, -1.23); b(0.4, 0.3, 0.04, M.griffin, 0, 0.7, 1.37);
  b(1.56, 0.08, 0.16, M.gold, 0, 1.42, -1.3); b(1.56, 0.08, 0.16, M.gold, 0, 1.02, 1.3);
  return g;
}
