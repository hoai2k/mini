// Crusty: a big smooth salesman in a white suit and red tie with a red
// robe over his shoulders, a huge grin and a woodsman's axe.
import * as THREE from 'three/webgpu';
import { Rig, PX, HOLD_PITCH } from '../../character.js';
import { solid, group } from '../../parts.js';
import { sculpt, sculptMats, sculptGeometry } from '../../voxkit.js';
import { markTip } from '../../rigContract.js';
import { shadeOf, humanSkin, hairMesh, bulk, VD } from './parts.js';

export function buildProcrustes() {
  const skin = 0xc87c50, cream = 0xe6d6b8, creamD = 0xc8b494, red = 0xb01c24;
  const m = humanSkin('boss_procrustes', { skin, hair: 0x141012, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a1a0a, brow: 0x141012, scowl: true, mouth: 'grin', stubble: shadeOf(skin, 0.8), top: cream, sleeve: cream, hand: skin, pants: cream, shoes: 0x3a2216,
    detail: (S, D) => {
      // the open jacket: lapels, a white shirt, a red tie, waistcoat buttons, a pocket square
      D(22, 20, 0xfaf8f2, 8, 2); D(22.5, 21, 0xfaf8f2, 6, 3); D(23, 22.5, 0xfaf8f2, 4, 3); D(23.5, 24, 0xfaf8f2, 2, 2);
      D(23.5, 20.5, red, 2, 1); D(23.25, 21, red, 3, 2); D(23.5, 22, red, 2, 9); D(23.75, 26.5, 0x7a1018, 1, 1); D(23.5, 26.5, red, 2, 2);
      for (const sx of [-1, 1]) for (let y = 0; y < 5; y++) D(24 + sx * (1.5 + y * 0.5) - (sx < 0 ? 0.5 : 0), 20 + y, creamD, 1, 2);
      for (const y of [27, 28.5, 30]) D(23.75, y, 0x6a4a2a, 1, 1);
      D(16, 31, creamD, 48, 1); D(19.5, 20, shadeOf(cream, 0.9), 1, 12); D(28, 20, shadeOf(cream, 0.9), 1, 12);
      D(25.5, 22, 0xfaf8f2, 2, 1); D(26, 21.5, red, 1, 1);
      for (const [u, v] of [[40, 16], [32, 48]]) { D(u, v + 4 + 8.5, 0xfaf8f2, 32, 1); D(u, v + 4 + 9, skin, 32, 6); }
      for (const [u, v] of [[0, 16], [16, 48]]) { D(u + 5.5, v + 4, creamD, 1, 10); D(u, v + 4 + 9.5, creamD, 32, 1); }
    } }, { scale: 1.95 });
  const redM = solid(0x9a1820, 0, 0.8);
  // (a tall, lean man as on vox-bosses-1, not a wide box: a small head, long
  // legs, a slim suit)
  const rig = new Rig({ material: m, scale: 1.95, headS: 6.6, bodyH: 13, legH: 16, cape: { material: redM, segments: 4, length: 26, width: 12 } });   // (a cape much longer hangs through the floor)
  rig.vd = VD.procrustes;
  // big and smooth, as the sheet draws him: broad, not boxy
  bulk(rig, { w: 1.18, d: 1.15, armThick: 1.05, armLen: 1.15, legThick: 1.1, legX: 2.3 });
  rig.cape[0].g.parent.position.z = -3.4 * PX;
  hairMesh(rig, { style: 'mop', base: 0x1a1414, shade: 0x0a0808, light: 0x3a2e2a, seed: 81, shape: { c: [0, 7.8, -0.6], r: [4.9, 3, 5.1], bump: 0.15, shell: 1.2, fringe: 7, jag: 1, side: 5, back: 3, tuft: 0.25, spike: 0.03 } });
  // the red robe over his shoulders: a draped yoke and two long gold-edged panels down the front
  const reds = [0x8a1218, 0xa01820, 0xb4222a], gold = [0xd8a032, 0xe8b444];
  const panel = (x, y, z, n, h) => { const ax = Math.abs(x); if (ax < 2.9) return [gold[Math.floor(h * 2)], 'm']; return reds[Math.floor((Math.sin(ax * 2.4) * 0.5 + 0.5) * 1.6 + n * 1.4)]; };
  // (the panels below the waist hang on a flap that swings with the
  // striding leg, character.js swingSkirt: hung on the torso, they would
  // stand still over the thighs and the legs walk through them, perf/props.cjs)
  const panelCol = (x, y, z, n, h) => (y < -7.4 + h * 1.4 ? null : panel(x, y, z, n, h));
  const flap = { front: group(rig.hips), back: group(rig.hips) };
  sculpt(rig, flap.front, [-1, 1].map((sx) => ({ b: [sx * 2.6, -8.5, 3.5, sx * 6.4, 0, 4.7], col: panelCol, bump: 0 })), { v: 0.8, seed: 83 }).scale.set(0.68, 1, 0.66);
  rig.skirt = flap;
  sculpt(rig, rig.torso, [
    { e: [0, 13.6, 0.2, 2.6, 2.4, 2.2], cut: true, bump: 0, fuzz: 0 },
    { b: [-2.6, 0, 3.5, -6.4, 12.4, 4.7], col: panelCol, bump: 0 },
    { b: [2.6, 0, 3.5, 6.4, 12.4, 4.7], col: panelCol, bump: 0 },
    { e: [0, 12.6, -0.2, 8.6, 2.4, 4.8], col: reds, bump: 0.1, fuzz: 0.05 },
    { b: [-2.4, 4, 3.3, -0.6, 11.6, 3.9], col: (x, y) => (Math.abs(x) > 2.3 - (11.6 - y) * 0.05 - 0.6 || y > 10 ? 0xd8c8a8 : null), bump: 0 }, { b: [0.6, 4, 3.3, 2.4, 11.6, 3.9], col: (x, y) => (Math.abs(x) > 2.3 - (11.6 - y) * 0.05 - 0.6 || y > 10 ? 0xd8c8a8 : null), bump: 0 },
  ], { v: 0.8, seed: 82 }, [
    { p: [0, 13.8, 3.6], s: [3.4, 1, 1], c: 0xfaf8f2 },
  ]).scale.set(0.68, 1, 0.66);   // (drawn for a broader build: fitted to his)
  // shoe shine and trouser cuffs
  for (const leg of [rig.legR, rig.legL]) sculpt(rig, leg, [], {}, [{ p: [0, -15.4, 0.8], s: [7.2, 1.4, 8.2], c: 0x2a1810 }, { p: [0, -14.2, 0.5], s: [7, 1.2, 7.6], c: 0x4a2c1a }, { p: [0, -13.3, 0], s: [7, 0.7, 7], c: creamD }]).scale.set(0.68, 1, 0.68);
  // the axe: long haft, a broad steel head, a gold collar
  const axe = group(rig.handR, 0, -1, 1.5, HOLD_PITCH, 0, 0);   // (along +y: see the hand-axis convention in character.js)
  sculpt(rig, axe, [], {}, [
    { p: [0, 8, 0], s: [1.6, 30, 1.6], c: 0x6a4022 }, { p: [0, -6, 0], s: [2, 2, 2], c: 0x4a2c16 },
    { p: [0, 20, 3.4], s: [1.2, 9, 7], c: 0xb8bcc4, m: 'm' }, { p: [0, 20, 7.2], s: [1.4, 11, 1.2], c: 0xe8ecf4, m: 'm' }, { p: [0, 20, -0.6], s: [2, 3, 3], c: 0xd8a032, m: 'm' },
  ]);
  markTip(axe, 0, 23, 0, 'axe'); rig.extras.axe = axe;
  rig.hunch = 0.05; rig.armSpread = 0.3;
  return rig;
}

// Procrustes's "magic fingers" water bed: gilt posts with knobbed finials,
// black panels framed in gold with gold griffins, a quilted red mattress and
// white pillows, after vox-bosses-1. Built on demand when he straps a hero
// down. One merged mesh; unit: world metres.
const GRIFFIN = ['.##.......', '####...##.', '.#####.###', '..########', '..#######.', '.###..###.', '.#.#...#.#', '.#.#...#.#'];
let bedGeo = null;
export function buildBed() {
  if (!bedGeo) {
    const B = [], gold = 0xd8a032, goldL = 0xf0c050, goldD = 0xa87420, black = 0x1a1414, red = 0xb01c24, redD = 0x8a141a, white = 0xf4f0e8;
    const b = (x, y, z, w, h, d, c, m) => B.push({ p: [x, y, z], s: [w, h, d], c, m });
    // a black panel with a gold frame and a pair of griffins; n = outward normal axis
    const panel = (x, y, z, w, h, axis, sgn) => {
      const t = 0.06, f = 0.05;
      if (axis === 'z') { b(x, y, z, w, h, t, black); b(x, y + h / 2, z, w, f, t + 0.02, gold, 'm'); b(x, y - h / 2, z, w, f, t + 0.02, gold, 'm'); }
      else { b(x, y, z, t, h, w, black); b(x, y + h / 2, z, t + 0.02, f, w, gold, 'm'); b(x, y - h / 2, z, t + 0.02, f, w, gold, 'm'); }
      const px = Math.min(0.035, h * 0.6 / 8), n = Math.max(1, Math.floor(w / (px * 14)));
      for (let k = 0; k < n; k++) {
        const cx = (k - (n - 1) / 2) * (w / n), flip = k % 2 ? -1 : 1;
        GRIFFIN.forEach((row, j) => [...row].forEach((ch, i) => {
          if (ch !== '#') return;
          const u = cx + flip * (i - 4.5) * px, vv = y + (3.5 - j) * px;
          if (axis === 'z') b(x + u, vv, z + sgn * (t / 2 + 0.008), px, px, 0.016, goldL, 'm');
          else b(x + sgn * (t / 2 + 0.008), vv, z + u, 0.016, px, px, goldL, 'm');
        }));
      }
    };
    // posts: base block, shaft, collar, cap and a knob
    for (const [x, z, top] of [[-0.75, -1.3, 1.5], [0.75, -1.3, 1.5], [-0.75, 1.3, 1.1], [0.75, 1.3, 1.1]]) {
      b(x, 0.12, z, 0.26, 0.24, 0.26, goldD, 'm'); b(x, top / 2, z, 0.18, top, 0.18, gold, 'm');
      b(x, top * 0.62, z, 0.24, 0.08, 0.24, goldD, 'm'); b(x, top + 0.04, z, 0.26, 0.08, 0.26, goldL, 'm'); b(x, top + 0.14, z, 0.16, 0.12, 0.16, gold, 'm'); b(x, top + 0.24, z, 0.08, 0.08, 0.08, goldL, 'm');
    }
    // frame, panels, rails
    b(0, 0.32, 0, 1.4, 0.16, 2.5, 0x2a1e18);
    panel(0, 1.02, -1.3, 1.32, 0.66, 'z', 1); panel(0, 0.62, 1.3, 1.32, 0.46, 'z', 1);
    panel(-0.75, 0.52, 0, 2.42, 0.36, 'x', -1); panel(0.75, 0.52, 0, 2.42, 0.36, 'x', 1);
    b(0, 1.4, -1.3, 1.5, 0.07, 0.14, goldL, 'm'); b(0, 0.9, 1.3, 1.5, 0.07, 0.14, goldL, 'm');
    // quilted red mattress, a turned-down white sheet, a pillow
    b(0, 0.8, 0.08, 1.34, 0.22, 2.36, red);
    for (let i = 0; i < 6; i++) b(0, 0.915, 0.95 - i * 0.3, 1.36, 0.02, 0.04, redD);
    b(0, 0.92, -0.62, 1.36, 0.06, 0.3, white); b(0, 0.98, -1.02, 1.1, 0.14, 0.4, white); b(0, 1.06, -1.02, 0.9, 0.05, 0.3, 0xffffff);
    bedGeo = sculptGeometry({ boxes: B }, 1);
  }
  const g = new THREE.Group(), m = new THREE.Mesh(bedGeo, sculptMats());
  m.castShadow = true; m.receiveShadow = true; g.add(m);
  return g;
}
