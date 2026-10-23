import * as THREE from 'three/webgpu';
import { Rig, HOLD_PITCH } from '../../character.js';
import { animateExtras } from '../animate.js';
import { addFlames } from '../../flames.js';
import { HS, group, rng } from '../../parts.js';
import { sculpt, hideSkin } from '../../voxkit.js';
import { markTip } from '../../rigContract.js';
import { shadeOf, humanSkin, hairMesh, bulk, VD } from './parts.js';

// Ares: a huge biker in a spiked black leather jacket, a black T-shirt with
// a red Spartan helmet, ripped trousers, boots, red-hot sunglasses and a
// burning sword.
export function buildAres() {
  const skin = 0xb8683e, leather = 0x161416, ember = 0xe8501a;
  const HELMET = ['....##....', '...####...', '..######..', '.########.', '.########.', '.##....##.', '.##.##.##.', '.##.##.##.', '.###..###.', '..##..##..', '..##..##..'];
  const m = humanSkin('boss_ares', { skin, hair: 0x141010, fringe: 1, hairSide: 2, hairBack: 4, eye: 0x2a1a10, brow: 0x141010, scowl: true, mouth: 'set', stubble: 0x2a1c16, top: 0x1c181a, jacket: leather, lapel: 0x3a3438, sleeve: skin, hand: 0x1e1a1a, pants: 0x4a3626, shoes: 0x141214, sat: 1.25,
    detail: (S, D) => {
      HELMET.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') D(21.5 + x * 0.5, 22 + y * 0.5, ember); }));
      for (let y = 36; y < 47; y += 1) { D(21.5, y, 0xc8c8d0, 1, 1); D(26, y + 0.5, 0xc8c8d0, 1, 1); }
      // short leather sleeves: bare forearms below
      for (const [u, v] of [[40, 32], [48, 48]]) S.ctx.clearRect(u, v + 4 + 6, 16, 6);
      for (const [u, v] of [[40, 32], [48, 48]]) D(u, v + 4 + 5.5, 0x3a3438, 32, 1);
      for (const [u, v] of [[40, 16], [32, 48]]) { D(u + 4, v + 4 + 3, shadeOf(skin, 0.85), 4, 4); D(u + 4, v + 4 + 9, 0x2a2224, 32, 3); }
      // cargo pockets, rips at the knees, boot tops
      for (const [u, v] of [[0, 16], [16, 48]]) { D(u, v + 4 + 2, 0x3a2a1c, 8, 4); D(u + 4.5, v + 4 + 5, skin, 3, 2); D(u + 5, v + 4 + 4.5, 0xc8b8a0, 2, 1); D(u, v + 4 + 7, 0x141214, 32, 5); D(u + 1, v + 4 + 3, 0x5a4432, 2, 2); }
    } }, { scale: 1.95 });
  // (pass 3: as on vox-bosses-1, a smaller head, longer legs and an open
  // leather jacket over a narrower waist; the chest and arms stay huge)
  const rig = new Rig({ material: m, scale: 1.95, headS: 6.4, legH: 16 });
  rig.vd = VD.ares;
  // a huge biker, but a man's build: less of a box than he was
  const AT = 1.72, LT = 1.5, aw = 4 * AT, lw = 4 * LT;
  bulk(rig, { w: 1.3, d: 1.3, h: 1.08, armThick: AT, armLen: 1.12, legThick: LT, legX: 3.3 });
  rig.armSpread = 0.2;
  // (pass 3: a short crop and a trimmed beard, so his face shows as on the sheet)
  hairMesh(rig, { style: 'spiky', base: 0x1a1210, shade: 0x0a0606, light: 0x3a2a22, seed: 91, shape: { c: [0, 7.8, -0.4], r: [4.5, 1.8, 4.7], bump: 0.1, shell: 0.7, fringe: 7.6, jag: 0.4, side: 6, back: 3.6, tuft: 0.15, spike: 0.03 }, beard: { length: 2, mouth: 1 } });
  const hs = HS * rig.dims.headS / 8;
  // red-hot wraparound sunglasses
  sculpt(rig, rig.head, [], {}, [
    { p: [0, 4.6 * hs, 4.75 * hs], s: [9.4 * hs, 1.9 * hs, 0.6], c: 0x120808 },
    { p: [-2.1 * hs, 4.6 * hs, 4.95 * hs], s: [3.4 * hs, 1.4 * hs, 0.6], c: 0xff3a10, m: 'e' }, { p: [2.1 * hs, 4.6 * hs, 4.95 * hs], s: [3.4 * hs, 1.4 * hs, 0.6], c: 0xff3a10, m: 'e' },
    { p: [-4.7 * hs, 4.8 * hs, 2], s: [0.6, 0.8, 5], c: 0x120808 }, { p: [4.7 * hs, 4.8 * hs, 2], s: [0.6, 0.8, 5], c: 0x120808 },
  ]);
  // the jacket: a raised collar, studs, spikes along the shoulders, a studded belt
  const silver = 0xd0d0d8, spike = (x, y, z, r = [0, 0, 0], k = 1) => [{ p: [x, y, z], s: [1.6 * k, 1.4 * k, 1.6 * k], c: silver, m: 'm', r }, { p: [x, y + 1.2 * k, z], s: [0.9 * k, 1.4 * k, 0.9 * k], c: 0xf0f0f4, m: 'm', r }];
  // the open jacket, carved: each side swells from the waist to a deep
  // chest and broad shoulders; the front stays open on the T-shirt
  const gap = (y) => 1.7 + Math.max(0, y - 4) * 0.2;
  const jacketCol = (x, y, z, n) => (z > 0.6 && Math.abs(x) < gap(y) ? null : z > 0.6 && Math.abs(x) < gap(y) + 0.7 ? 0x3a3438 : [0x161416, 0x1e1a1c, 0x242022][Math.floor(n * 2.99)]);
  sculpt(rig, rig.torso, [-1, 1].map((sx) => ({ cap: [sx * 3, 1.6, 0, sx * 4.2, 11.4, -0.2, 3, 3.9], col: jacketCol, bump: 0.06, fuzz: 0.04 })), { v: 0.8, seed: 94 });
  sculpt(rig, rig.torso, [], {}, [
    { p: [-4.4, 13.6, -0.2], s: [3, 2.4, 7.4], c: leather, r: [0, 0, 0.35] }, { p: [4.4, 13.6, -0.2], s: [3, 2.4, 7.4], c: leather, r: [0, 0, -0.35] },
    { p: [0, 14, -3.6], s: [6.4, 2.6, 1], c: leather },
    { p: [-3.9, 9.4, 4.05], s: [2.6, 6.4, 0.7], c: 0x2a2628, r: [0, 0, -0.22] }, { p: [3.9, 9.4, 4.05], s: [2.6, 6.4, 0.7], c: 0x2a2628, r: [0, 0, 0.22] },
    { p: [-2.7, 3.8, 4], s: [0.5, 7.4, 0.5], c: silver, m: 'm' }, { p: [2.7, 3.8, 4], s: [0.5, 7.4, 0.5], c: silver, m: 'm' },
    ...spike(-3.6, 14.8, -3, [0, 0, 0.3]), ...spike(3.6, 14.8, -3, [0, 0, -0.3]), ...spike(0, 15.4, -3.6), ...spike(-6.6, 13.4, -1.6, [0, 0, 0.6]), ...spike(6.6, 13.4, -1.6, [0, 0, -0.6]),
    { p: [0, 0.6, 0], s: [16.6, 1.6, 7.8], c: 0x1e1a1a }, { p: [0, 0.6, 3.95], s: [2.6, 2, 0.6], c: silver, m: 'm' },
    ...[-6.4, -4.4, 4.4, 6.4].map((x) => ({ p: [x, 0.6, 3.95], s: [0.7, 0.7, 0.5], c: silver, m: 'm' })),
    ...[[-4.6, 10], [4.6, 10], [-4.8, 5.4], [4.8, 5.4]].map(([x, y]) => ({ p: [x, y, 3.85], s: [0.8, 0.8, 0.5], c: silver, m: 'm' })),
  ]).scale.set(0.74, 1, 0.8);   // (drawn for a broader build: fitted to his)
  hideSkin(rig.armR, rig.armL);
  const skinT = [shadeOf(skin, 0.86), skin, shadeOf(skin, 1.1)];
  for (const [arm, sx] of [[rig.armR, -1], [rig.armL, 1]]) {
    // rounded arms: a leather-sleeved bicep, a bare forearm like a ham, a gloved fist
    sculpt(rig, arm, [
      { e: [0, -11.6, 0.6, aw / 2 + 0.5, 2.2, aw / 2 + 0.7], col: [0x1e1a1a, 0x2a2424], bump: 0.05, fuzz: 0.04 },
      { e: [0, -6.4, 0.2, aw / 2 + 0.9, 3.6, aw / 2 + 0.9], col: skinT, bump: 0.1, fuzz: 0.06 },
      { e: [0, -1.6, 0, aw / 2 + 0.9, 3.2, aw / 2 + 0.9], col: [0x161416, 0x221e20], bump: 0.08, fuzz: 0.04 },
    ], { v: 0.8, seed: 93 + sx });
    sculpt(rig, arm, [], {}, [
      { p: [0, 1.4, 0], s: [aw + 1, 3.8, aw + 1], c: leather },
      ...spike(sx * 1.6, 3.8, 0, [0, 0, -sx * 0.3]), ...spike(sx * 1.8, 3.4, 2.4, [0.3, 0, -sx * 0.3]), ...spike(sx * 1.8, 3.4, -2.4, [-0.3, 0, -sx * 0.3]), ...spike(sx * (aw / 2 + 0.6), 1.4, 0, [0, 0, -sx * 1.2], 0.9),
      { p: [0, -9.4, 0], s: [aw + 0.6, 2.8, aw + 0.6], c: 0x1e1a1a }, ...[[-1.9, aw / 2 + 0.35], [1.9, aw / 2 + 0.35]].flatMap(([x, z]) => [{ p: [x, -9.4, z], s: [0.8, 0.8, 0.4], c: silver, m: 'm' }, { p: [x, -9.4, -z], s: [0.8, 0.8, 0.4], c: silver, m: 'm' }]),
    ]);
  }
  for (const leg of [rig.legR, rig.legL]) sculpt(rig, leg, [], {}, [
    { p: [0, -15.4, 1], s: [lw + 0.8, 1.4, lw + 2.2], c: 0x0e0c0e }, { p: [0, -13.2, 0.6], s: [lw + 0.6, 3, lw + 1.4], c: 0x1a1618 }, { p: [0, -10.2, 0], s: [lw + 0.4, 3.2, lw + 0.4], c: 0x1a1618 },
    { p: [0, -13.4, 0.6], s: [lw + 0.9, 0.7, lw + 1.7], c: 0x3a3436 }, { p: [0, -10.6, 0], s: [lw + 0.7, 0.7, lw + 0.7], c: 0x3a3436 },
    { p: [lw / 2 - 1, -13.4, lw / 2 + 1.4], s: [1.3, 1.1, 0.4], c: silver, m: 'm' }, { p: [lw / 2 - 1, -10.6, lw / 2 + 0.4], s: [1.3, 1.1, 0.4], c: silver, m: 'm' },
  ]);
  // the burning sword: gold guard, a blade of fire, flames licking off it
  const sword = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);   // (along +y: see the hand-axis convention in character.js)
  const fl = rng(92), flames = [];
  // (a few loose fire cubes hug the blade; the blaze itself is live fire, flames.js, below)
  for (let i = 0; i < 14; i++) { const t = fl(), y = 5 + t * 17, w = 0.7 + fl() * 1.1; flames.push({ p: [(fl() - 0.5) * 3.4 * (1 - t * 0.35), y + fl() * 1.6, (fl() - 0.5) * 1.2], s: [w, w * 1.3, w * 0.8], c: [0xff3a00, 0xff6a08, 0xffa020, 0xffd040][Math.floor(fl() * 4)], m: 'e' }); }
  sculpt(rig, sword, [], {}, [
    { p: [0, 0, 0], s: [1.4, 5, 1.4], c: 0x2a1a10 }, { p: [0, -2.8, 0], s: [2, 1.4, 2], c: 0xd8a032, m: 'm' }, { p: [0, 3, 0], s: [6.4, 1.4, 1.8], c: 0xd8a032, m: 'm' }, { p: [0, 3.2, 0], s: [2, 2, 2], c: 0xe8b444, m: 'm' },
    { p: [0, 12.6, 0], s: [2.6, 18, 0.9], c: 0xff6a10, m: 'e' }, { p: [0, 12.4, 0], s: [1, 17, 1.1], c: 0xffc040, m: 'e' }, { p: [0, 22.4, 0], s: [1.6, 1.8, 0.9], c: 0xff8a10, m: 'e' },
    ...flames,
  ]);
  markTip(sword, 0, 23.3, 0, 'burning sword'); rig.extras.sword = sword;
  // the blaze: live flames up the whole blade that trail behind a swing (and go out while the spear is drawn)
  addFlames(rig, { cap: 64, palette: 'fire', rise: 26, turb: 30 }).source(sword, { at: [0, 5, 0], to: [0, 22.5, 0], r: 1.6, rate: 110, life: [0.3, 0.6], size: [1.3, 2.5], up: 7, spread: 3 });
  rig.tick = (dt, e) => animateExtras(rig, dt, e);   // (the workbench ticks the rig itself; bosses.js keeps this one)
  // a spear for the thrust (a 'punch' with the right arm), in place of the sword while he needs it
  const spear = group(rig.handR, 0, -1, 1, HOLD_PITCH, 0, 0);
  sculpt(rig, spear, [], {}, [{ p: [0, 10, 0], s: [1.2, 40, 1.2], c: 0x3a2a1e }, { p: [0, 32, 0], s: [2.6, 6, 0.8], c: 0xd8dce4, m: 'm' }, { p: [0, 35.6, 0], s: [1.2, 2, 0.6], c: 0xd8dce4, m: 'm' }, { p: [0, 29, 0], s: [1.8, 1.2, 1.8], c: 0xd8a032, m: 'm' }]);
  markTip(spear, 0, 36.6, 0, 'spear'); spear.visible = false; rig.extras.spear = spear;
  // the motorcycle, only out for a charge
  const bike = new THREE.Group(); rig.root.add(bike); bike.visible = false; rig.extras.bike = bike;
  const blk = 0x141214, chrome = 0xd8dce4, tire = 0x0a0a0a;
  sculpt(rig, bike, [], {}, [
    ...[-9, 10].flatMap((z) => [{ p: [0, 4, z], s: [2.6, 8, 8], c: tire }, { p: [0, 4, z], s: [2.6, 6, 9], c: tire }, { p: [0, 4, z], s: [2.8, 3, 3], c: chrome, m: 'm' }]),
    { p: [0, 7.5, 0.5], s: [4.4, 4, 15], c: blk }, { p: [0, 10, 4], s: [5, 3, 6], c: 0x8a1a14, m: 'm' }, { p: [0, 10.2, -3], s: [3.6, 1.4, 8], c: 0x2a1a14 },
    { p: [0, 14, 10], s: [9, 0.9, 0.9], c: chrome, m: 'm' }, { p: [0, 11, 10], s: [0.9, 6, 0.9], c: chrome, m: 'm' }, { p: [2.6, 4.4, -5], s: [2, 1.6, 6], c: chrome, m: 'm' }, { p: [0, 11, 13], s: [2.4, 2.4, 1], c: 0xfff2c0, m: 'e' },
    ...Array.from({ length: 4 }, (_, i) => ({ p: [2.6, 4.4 + (i % 2), -9 - i * 2], s: [1.2, 1.2, 3], c: 0xff5a14, m: 'e' })),
  ]);
  return rig;
}
