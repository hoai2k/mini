// The Furies: Mrs. Dodds's kind, white-haired in ragged black on leather
// wings with a fiery whip (bossmodels.js builds Alecto and her sisters on
// buildFury), and the grid-voxel hair the snake-haired dracaena shares.
import { Rig, PX } from '../character.js';
import { paintPerson } from '../mortals.js';
import { HS, solid, skinMat, group, sway } from '../parts.js';
import { heroHair, cellMesh } from '../herovox.js';
import { kit, voxMat, dropMeshes, densityFor, reshape, applyShape } from '../voxkit.js';
import { markHeadCore } from '../rigContract.js';
import { addWings } from './birds.js';
import { addWhip } from './whip.js';
import { animateExtras } from './animate.js';

// Grid-voxel hair (herovox.heroHair) in the look's voxel material, so it
// flashes and dissolves with the body. Keep colours below 0xe8 per channel
// or the brightest cubes glow.
export function gridHair(rig, vox, look = rig.material) {
  const hs = ((rig.dims.headS ?? 8) / 8) * HS;
  const { cells, solid: inside, res } = heroHair(vox);   // (vox.res: finer curls on a bigger model)
  const mat = voxMat(look);
  const mesh = cellMesh(cells, PX * hs / res, mat, inside);
  mesh.userData.baseMat = mat; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.hair = mesh;
  return mesh;
}
// A Fury (vox-enemies, bottom right): a grey hag with a mass of wild white
// curls, burning yellow eyes and a fanged grin, in a long ragged black dress
// that flares into torn strips, gold straps, belt and bracelets, clawed grey
// feet, huge tattered leather wings and a whip of fire.
export function buildFury(id, { scale = 1, skin = 0xb0a898, hair = 0xdcdcd8, wing = 0x5a3a26, dress = 0x1a1416, mouthGrin = true, seed = 61, float = 0.8 } = {}) {
  const gold = 0xd89a28;
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin, eye: 0xffd84a, eyeWhite: 0xffd84a, scowl: true, brow: 0x5a5a56, wrinkles: 0x7a7266, fangs: 0xf4f0e0, grin: mouthGrin, frown: !mouthGrin, top: dress, sleeve: skin, hand: skin, shortSleeve: true, pants: dress, skirt: dress, skirtLen: 12, shoes: false, collar: dress,
      face: (s, ey) => { s.rect(8, ey - 1, 8, 3, skin, 0.06); for (const x of [9, 13]) { s.rect(x, ey, 2, 1, 0xffe040, 0); s.dot(x + (x === 9 ? 1 : 0), ey, 0xffffff); } s.rect(9, ey - 1, 2, 0.5, 0x3a3836, 0); s.rect(13, ey - 1, 2, 0.5, 0x3a3836, 0); for (const x of [8.5, 14.5]) s.dot(x, ey + 1.5, 0x8a8278, 1, 2); s.dot(11.5, ey + 1, 0x6a645c, 2, 1); },
      body: (s) => {
        for (let i = 0; i < 60; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, s.r() < 0.5 ? 0x0a0808 : 0x2e262a);
        s.rect(16, 29, 24, 2, gold, 0.05); s.rect(23, 29, 2, 2, 0xffd84a, 0);
        for (let y = 20; y < 29; y++) { s.dot(20 + (y - 20) * 0.5, y, gold, 1, 2); s.dot(27 - (y - 20) * 0.5, y, gold, 1, 2); }
        for (const [u, v] of [[40, 16], [32, 48]]) { s.rect(u, v + 13, 16, 1, gold, 0); for (let i = 0; i < 12; i++) s.dot(u + s.r() * 16, v + 4 + s.r() * 12, 0x8a8278); }
      } });
    S.shadeLimbs(); S.saturate(1.15);
  }, { emit: 1, res: 2, scale });
  // (head proportions, proportions.js: the plain Fury, 1.4x Percy, has a head
  // 0.82 of a hero's skin cube; her looming sisters and Alecto, 1.9x, 0.66 of
  // it (the Fury of vox-enemies has a head about 0.185 of her height,
  // design/sizes.json "headSheet"), their wild curls standing out round it.
  // Her trunk, arms and dress grow longer to keep her height; her legs are hidden by
  // the dress and she hovers, so the leg rule leaves her be.)
  const big = Math.max(0, Math.min(1, (scale - 2.1) / 0.4)), HF = 0.82 - 0.16 * big, TF = 1.1 + 0.08 * big, LF = 1.1 + 0.07 * big;
  const rig = new Rig({ material: mat, scale, bodyW: 7, armW: 3, legH: 10, headS: 8 * HF });
  reshape(rig, rig.torso, [1, TF, 1]); reshape(rig, rig.hips, [1, LF, 1]);
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [1, TF, 1]);
  rig.dims.legH = 10 * LF; rig.hips.position.y = rig.dims.legH * PX;
  // a Fury drawn bigger than a hero (the plain Fury 2.1, the boss sisters 2.5
  // and 2.8) is made of more, finer strips, curls and claws, not bigger ones;
  // past scale 1.75 the strips grow instead, which keeps the sisters within
  // their triangle budget
  const D = Math.max(1, densityFor(Math.min(scale, 1.75)));
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  const K = kit(rig, mat, { seed, rough: 0.9 });
  const RAG = [dress, 0x241c20, 0x120e10, 0x2e2428, 0x1e1418];
  // the dress: four swaying panels of ragged strips that flare toward the hem
  const panels = [];
  for (let q = 0; q < 4; q++) {
    const g = reshape(rig, group(rig.hips, 0, 0.5, 0), [1, LF, 1]); panels.push(g);
    const nS = Math.round(10 * D);
    for (let i = 0; i < nS; i++) {
      const a = (q + i / nS) * Math.PI / 2 - Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
      if (Math.abs(a) < 0.25 && i % 2 === 0) continue;                  // the slit up the front
      // an upper strip hanging close to the hips, then a lower one flaring out, then torn ends
      const L1 = 5.5, L2 = 6.5 + K.r() * 3.5, l3 = 1.5 + K.r() * 3.5;
      const x = sa * 3.7, z = ca * 2.5, f2 = 0.22, f3 = 0.4, col = K.tone(RAG, 0.15);
      K.box(g, x, -L1 / 2 + 0.6, z, 1.7 / D, L1, 1, col, -ca * 0.08, 0, sa * 0.08);
      const y2 = -L1 + 0.6, ox2 = sa * (0.4 + L2 * Math.sin(f2) / 2), oz2 = ca * (0.4 + L2 * Math.sin(f2) / 2);
      K.box(g, x + ox2, y2 - L2 * Math.cos(f2) / 2, z + oz2, 1.9 / D, L2, 1, col, -ca * f2, 0, sa * f2);
      const y3 = y2 - L2 * Math.cos(f2), o3 = 0.4 + L2 * Math.sin(f2) + l3 * Math.sin(f3) / 2;
      K.box(g, x + sa * o3, y3 - l3 * Math.cos(f3) / 2, z + ca * o3, (0.7 + K.r() * 0.7) / D, l3, 0.6 / D, K.tone(RAG, 0.1), -ca * f3, 0, sa * f3);
    }
    sway(rig, g, q % 2 ? 'z' : 'x', 0.06, 2.3, q * 1.3);
  }
  // a grey shin in the slit, and bare clawed feet under the hem
  K.box(rig.hips, -1.2, -6.5, 1.6, 2.2, 7, 2.2, skin);
  for (const sx of [-1.6, 1.6]) { K.box(rig.hips, sx, -10.7, 0.9, 2.2, 1.4, 3.6, skin); for (const dx of [-0.7, 0, 0.7]) K.box(rig.hips, sx + dx, -11, 3.1, 0.5, 0.7, 1.2, 0x2a2420); }
  // gold straps and belt, a dark ragged collar
  const T = rig.torso;
  K.box(T, 0, 3.6, 0, 7.6, 1.4, 4.6, gold); K.box(T, 0, 3.6, 2.4, 1.8, 1.8, 0.4, 0xf0c040);
  for (const sx of [-1, 1]) K.box(T, sx * 1.6, 8.5, 2.35, 0.7, 7.5, 0.3, gold, 0, 0, sx * 0.42);
  for (let i = 0, n = Math.round(8 * D); i < n; i++) K.box(T, -3.5 + i * 7 / (n - 1), 11.8, (i % 2 ? 2.2 : -2.2), 1.2 / D, 1.6, 0.6, K.tone(RAG, 0.1));
  // arms: gold bracelets, bony knuckles and long dark claws
  for (const arm of [rig.armR, rig.armL]) {
    K.box(arm, 0, -7.3, 0, 3.6, 1.2, 4.6, gold); K.box(arm, 0, -5.9, 0, 3.5, 0.6, 4.5, 0xa87418);
    for (const dz of [-1.2, 0, 1.2]) K.box(arm, 0, -10.6, dz, 0.6, 1.6, 0.6, 0x2a2420);
  }
  const wild = 1 + 0.45 * (1 - HF);   // (the curls stand out further round a smaller head)
  gridHair(rig, { style: 'curls', base: hair, shade: 0x8a8a86, light: 0xe8e8e4, seed, shape: { r: [6.9 * wild, 7.8 * wild, 6.6 * wild], bump: 0.5, tuft: 0.28, spike: 0.1, side: -1.5, back: -5 }, res: D }, mat);
  K.done();
  // (past scale 1.5 the wings grow as the square root of her size, so a
  // looming sister's span, 8.5 blocks for Alecto, stays about twice her height
  // instead of nearly three times, well inside a 30-block boss arena)
  const ws = Math.min(1.2, scale + 0.1) * Math.min(1, Math.sqrt(1.5 / scale));
  addWings(rig, { span: 27 * ws, chord: 15, mat: solid(wing, 0, 0.9), tip: solid(0x3a2418, 0, 0.9), kind: 'bat', y: 10.5, bone: solid(0x2a1a10), cols: { dark: 0x24160e }, seed: seed + 5, look: mat, fine: D });
  addWhip(rig, { segs: 10, len: 3.6, look: mat });
  rig.tick = (dt, e) => animateExtras(rig, dt, e);   // (the bosses built on her get the whip's pose too, even outside a fight)
  { const h = rig.dims.headS * HS; markHeadCore(rig, [0, h / 2, 0], [h, h, h]); }   // (the skin cube; the curls aside)
  applyShape(rig);   // (the neck, shoulders, wings and hands to the longer trunk and arms)
  rig.hunch = 0.35;
  rig.float = float;
  rig.hoverMin = 11 * LF * PX * rig.baseScale + 0.22;   // (the ragged hem hangs 11 px under the soles: a boss's swoop flies no lower, bob included)
  return rig;
}
