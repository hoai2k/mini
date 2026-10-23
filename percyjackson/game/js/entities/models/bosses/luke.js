import { Rig, HOLD_PITCH } from '../../character.js';
import { footwear } from '../../herovox.js';
import { group } from '../../parts.js';
import { sculpt } from '../../voxkit.js';
import { markTip } from '../../rigContract.js';
import { shadeOf, humanSkin, hairMesh, kitBoxes } from './parts.js';

// Luke Castellan: sandy curls, a scar down his cheek, the orange camp
// shirt, and Backbiter, its blade half steel and half celestial bronze.
export function buildLuke() {
  const skin = 0xe0a074, orange = 0xe05200;
  const PEG = ['.......##.', '..#....###', '.###..###.', '#####.##..', '.#########', '..#######.', '..##..##..', '..#....#..'];
  const m = humanSkin('boss_luke', { skin, hair: 0xd8a040, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a7ad8, brow: 0xa87020, mouth: 'smirk', scar: 0xb02a1e, top: orange, sleeve: orange, shortSleeve: true, pants: 0x2a4a80, shoes: 0x18161c, sat: 1.4,
    detail: (S, D) => {
      PEG.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') D(21.5 + x * 0.5, 22.5 + y * 0.5, 0x17130f); }));
      D(21.5, 20, shadeOf(orange, 0.75), 10, 1); D(16, 31.5, shadeOf(orange, 0.8), 48, 1);
      D(16, 30, 0x5a3418, 48, 1); D(23, 29.75, 0xd8a840, 4, 2);   // belt and buckle peeking under the hem
      for (const [u, v] of [[40, 16], [32, 48]]) D(u, v + 4 + 4.5, shadeOf(orange, 0.8), 32, 1);
      for (const [u, v] of [[0, 16], [16, 48]]) { D(u + 5.5, v + 4, 0x1e3a68, 1, 10); D(u + 4.5, v + 4 + 1, 0x3a5a90, 2, 2); D(u, v + 4 + 8.5, 0x3a5a90, 32, 1.5); D(u + 4, v + 4 + 5, 0x22406e, 4, 1); }
    } });
  const rig = new Rig({ material: m, scale: 1.3 });
  hairMesh(rig, { style: 'mop', base: 0xe09a28, shade: 0xa86410, light: 0xf8c850, warm: 0xc87a18, seed: 101, shape: { c: [0, 7.4, -0.6], r: [5.6, 4.4, 5.8], bump: 0.4, fringe: 6.4, jag: 1.4, side: 3, back: 1, tuft: 0.24, spike: 0.05 } });
  // hi-top sneakers, rolled jean cuffs, a camp bead necklace
  for (const leg of [rig.legR, rig.legL]) sculpt(rig, leg, [], {}, [...kitBoxes(footwear('hitop', { upper: 0x18161c, sole: 0xf0ece0, lace: 0xf0ece0 })), { p: [0, -7.6, 0], s: [4.6, 1, 4.6], c: 0x3a5a90 }]);
  sculpt(rig, rig.torso, [], {}, [
    ...[0x2a6ab8, 0xc82a1a, 0xf4f0e8, 0x2a8a3a, 0xffd84a].map((c, i) => ({ p: [-2 + i, 11.3 - (i === 2 ? 0.4 : Math.abs(i - 2) === 1 ? 0.2 : 0), 2.3], s: [0.8, 0.8, 0.6], c })),
    // the scabbard at his hip, its mouth up and forward, a gold chape on its tip and a gold throat at its mouth
    // (the two were set at each other's depth, so the chape floated in front of his thigh: perf/islands.cjs)
    { p: [-4.6, 0, 1], s: [1.4, 13, 1.8], c: 0x5a3018, r: [0.25, 0, -0.12] }, { p: [-5.4, -6.2, -0.6], s: [1.6, 1.6, 2], c: 0xd8a032, m: 'm', r: [0.25, 0, -0.12] }, { p: [-3.8, 6.4, 2.6], s: [1.8, 1.2, 2.2], c: 0xd8a032, m: 'm', r: [0.25, 0, -0.12] },
  ]);
  // Backbiter: half steel, half celestial bronze
  const sword = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);   // (along +y: see the hand-axis convention in character.js)
  sculpt(rig, sword, [], {}, [
    { p: [0, 0, 0], s: [1.2, 4.4, 1.2], c: 0x3a2418 }, { p: [0, -2.4, 0], s: [1.6, 1, 1.6], c: 0xd8a032, m: 'm' }, { p: [0, 2.6, 0], s: [5, 1, 1.4], c: 0x8a8a90, m: 'm' },
    { p: [-0.75, 11.5, 0], s: [1.5, 17, 0.7], c: 0xc8ccd8, m: 'm' }, { p: [0.75, 11.5, 0], s: [1.5, 17, 0.7], c: 0xe0a040, m: 'm' }, { p: [0, 20.4, 0], s: [1.6, 1.4, 0.6], c: 0xe0a040, m: 'm' },
  ]);
  markTip(sword, 0, 21.1, 0, 'Backbiter'); rig.extras.sword = sword;
  return rig;
}
