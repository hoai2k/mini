// The empousa: a flaming-haired cheerleader demon.
import { Rig } from '../character.js';
import { paintPerson } from '../mortals.js';
import { HS, skinMat, group } from '../parts.js';
import { addFlames } from '../flames.js';
import { kit, dropMeshes } from '../voxkit.js';
import { markHeld } from '../rigContract.js';

// Empousa (vox-enemies, bottom middle): a cheerleader with a blazing mane of
// voxel flame, a white crop top with an orange V and emblem, a pleated orange
// skirt with a white stripe, one bronze automaton leg and one shaggy donkey
// leg with a hoof, and big orange and black pom-poms.
export function buildEmpousa() {
  const skin = 0xe2a884, orange = 0xe85a08, white = 0xdcd8d0;
  const mat = skinMat('empousa', (S) => {
    paintPerson(S, { skin, hair: 0xd8401a, fringe: 2, hairSide: 3, eye: 0xc82a0a, eyeWhite: 0xffffff, grin: true, lipstick: 0xc8203a, top: white, collar: orange, sleeve: skin, hand: skin, shortSleeve: true, skirt: orange, skirtLen: 5, legR: skin, legL: skin, shoes: false,
      face: (s, ey) => { s.dot(9, ey - 1, 0x3a1a0a, 2, 1); s.dot(14, ey - 1, 0x3a1a0a, 2, 1); s.rect(10, ey + 2, 4, 1, 0x8a0a1a, 0); s.dot(10, ey + 2, 0xf4f0e0, 1, 1); s.dot(13.5, ey + 2, 0xf4f0e0, 1, 1); s.dot(9, ey + 1.5, 0xf08a8a, 2, 1); s.dot(14, ey + 1.5, 0xf08a8a, 2, 1); },
      body: (s) => {
        for (let i = 0; i < 4; i++) { s.rect(20 + i * 0.5, 20 + i, 1, 1, orange, 0); s.rect(27 - i * 0.5, 20 + i, 1, 1, orange, 0); }
        s.rect(22, 25, 4, 3, orange, 0.05); s.dot(23, 25.5, white, 4, 2);
        s.rect(16, 29, 24, 3, skin, 0.04); s.rect(16, 28, 24, 1, orange, 0);
        for (const [u, v] of [[40, 16], [32, 48]]) s.rect(u, v + 9, 16, 1, orange, 0);
      } });
    S.shadeLimbs(); S.saturate(1.2);
  }, { emit: 0.7, res: 2 });
  // (long-legged and as tall as Percy: the sheet's cheerleader is half legs: legs 16 px, a shorter torso,
  // and Percy's height from her soles to the crown of her hair, flames aside)
  const LEG = 16, f = LEG / 12;
  const rig = new Rig({ material: mat, scale: 1.25, bodyW: 7, bodyH: 10, armW: 3, legH: LEG });
  const K = kit(rig, mat, { seed: 29, emit: 0.7 });
  // flaming hair: red locks under a mane of glowing flame cubes that licks upward
  const flame = group(rig.head, 0, 0, 0);
  // (a champion built bigger, BUILD.k = K.density, gets more and
  // smaller flame and tassel cubes, so they stay near a hero's voxel size)
  const hk = HS, FL = [0xff5000, 0xff7800, 0xffa000, 0xffc840], D = K.density ?? 1;
  for (let i = 0; i < Math.round(90 * D * D); i++) {
    const t = K.r(), a = K.r() * Math.PI * 2, rad = 4.6 + K.r() * 1.6 - t * 2.8;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad * 0.9 - 0.9;
    if (z > 2.6 && t < 0.3) continue;
    const y = 6.2 + t * 9 + (z < 0 ? 0 : -1), sz = (2.3 - t * 1.4 + K.r() * 0.6) / D;
    if (t > 0.6) continue;   // (the mane's base: its licking top is live flame, below)
    K.box(flame, x * hk, y * hk, z * hk, sz, sz * 1.3, sz, FL[Math.min(3, Math.floor(t * 3.3 + K.r() * 0.8))]);
  }
  for (let i = 0; i < Math.round(34 * D * D); i++) K.box(flame, (K.r() - 0.5) * 9, 5 - K.r() * 9, -4.6 - K.r() * 1.2, 1.9 / D, 2.2 / D, 1.6 / D, i % 3 ? FL[Math.floor(K.r() * 3)] : 0xc8301a);
  K.clumps(rig.head, [0, 4 * hk + 1, -0.5], [8.6 * hk, 8 * hk, 8 * hk], { n: 40, size: [1.2, 2], cols: [0xb82a14, 0xd8401a, 0x9a200e], faces: 'tlrk' });
  for (let x = -3.5; x <= 3.5; x += 1.4) K.box(rig.head, x * hk, 7.6 * hk, 4.3 * hk, 1.6, 1.6 + (Math.abs(x) < 1 ? 0 : 1), 0.8, 0xd8401a);
  rig.extras.flameHair = flame;
  addFlames(rig, { cap: 48, palette: 'fire', rise: 24, turb: 30 }).source(rig.head, { at: [0, 10.6 * hk, -0.9 * hk], r: 4.2, rate: 56, life: [0.35, 0.7], size: [1.2, 2.2], up: 8, spread: 2.5 });
  // pleated skirt: alternating orange and darker pleats with a white stripe
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, x = Math.sin(a) * 4.2, z = Math.cos(a) * 2.7;
    K.flare(rig.hips, x * 1.06, -1.8, z * 1.08, 1.8, 4.4, 0.7, i % 2 ? orange : 0xc85008, a, 0.3);
    K.flare(rig.hips, x * 1.06 + Math.sin(a) * 0.55, -3.3, z * 1.08 + Math.cos(a) * 0.55, 1.9, 0.6, 0.75, white, a, 0.3);
  }
  // the bronze leg: thigh plates, a riveted knee, a jointed shin and a pointed foot
  const bronze = [0xd08a20, 0xb06a14, 0xe8a830];
  dropMeshes(rig, rig.legR);
  // (the leg's parts are laid out on a 12 px leg and stretched by f; the
  // knee, bands and feet keep their size)
  K.box(rig.legR, 0, -2.5 * f, 0, 4.2, 5 * f, 4.2, skin);
  K.box(rig.legR, 0, -5.3 * f, 0, 4.4, 1.2, 4.4, bronze[1]);
  K.box(rig.legR, 0, -6.6 * f, 0.2, 3.2, 2.2, 3.4, bronze[2]); for (const sx of [-1, 1]) K.box(rig.legR, sx * 1.7, -6.6 * f, 0.2, 0.4, 1.2, 1.2, 0x5a3a10);
  K.box(rig.legR, 0, -9.2 * f, 0, 2.8, 4.2 * f, 2.8, bronze[0]); K.box(rig.legR, 0, -9.2 * f, 1.45, 1.2, 3.6 * f, 0.3, bronze[1]);
  K.box(rig.legR, 0, -LEG + 0.6, 0.9, 3.4, 1.2, 4.6, bronze[1]); K.box(rig.legR, 0, -LEG + 0.3, 3.4, 1.6, 0.6, 1.2, bronze[2]);
  // the donkey leg: grey-brown shaggy fur from the knee and a dark split hoof
  dropMeshes(rig, rig.legL);
  K.box(rig.legL, 0, -2.5 * f, 0, 4.2, 5 * f, 4.2, skin);
  const donk = [0x8a7a6a, 0x6a5a4c, 0x9a8a78, 0x5a4a3e];
  K.box(rig.legL, 0, -7.5 * f, 0, 3.6, 6 * f, 3.6, donk[0]);
  K.clumps(rig.legL, [0, -7 * f, 0], [3.6, 6 * f, 3.6], { n: 26, size: [1, 1.6], cols: donk, faces: 'lrfk', stretch: [1, 1.4, 1] });
  K.box(rig.legL, 0, -LEG + 0.9, 0.4, 3.4, 1.8, 3.8, 0x1e1612); K.box(rig.legL, 0, -LEG + 0.9, 2.35, 0.5, 1.6, 0.2, 0x3a2a20);
  // pom-poms: a ball of orange and black tassel cubes in each hand
  for (const hand of [rig.handR, rig.handL]) {
    const pp = markHeld(group(hand, 0, -2.6, 0));
    K.box(pp, 0, 0, 0, 5.4, 5.4, 5.4, orange);
    for (let i = 0; i < Math.round(64 * D * D); i++) {
      const u = K.r() * 2 - 1, th = K.r() * Math.PI * 2, r = Math.sqrt(1 - u * u), R = 3.4 + K.r() * 1.2;
      const z = (1.1 + K.r() * 0.8) / D;
      K.box(pp, Math.cos(th) * r * R, u * R, Math.sin(th) * r * R, z, z, z, i % 3 === 0 ? 0x1a1418 : K.r() < 0.5 ? orange : 0xd85008);
    }
  }
  K.done();
  rig.extras.flame = true;
  return rig;
}
