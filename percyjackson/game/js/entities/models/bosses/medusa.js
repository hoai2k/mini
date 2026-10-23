// Medusa: veiled in black with gold trim; writhing green snakes rise from
// under the hood; her face is never shown, only her eyes when she stares.
import { Rig, PX } from '../../character.js';
import { paintPerson } from '../../mortals.js';
import { skinMat, group, sway } from '../../parts.js';
import { sculpt, along, hideSkin, hash3, reshape, applyShape } from '../../voxkit.js';
import { markHeadCore } from '../../rigContract.js';

export function buildMedusa() {
  const robe = 0x1a1418;
  const m = skinMat('boss_medusa', (S) => paintPerson(S, { skin: 0x0a0808, eye: 0x0a0808, eyeWhite: 0x0a0808, brow: 0x0a0808, mouth: false, top: robe, collar: 0xc9963a, trim: 0xc9963a, sleeve: robe, hand: 0x9ab890, pants: robe, skirt: robe, skirtLen: 12, shoes: false,
    body: (s) => { s.rect(16, 29, 24, 2, 0xc9963a, 0); s.rect(23, 28, 2, 4, 0xffd84a, 0); for (const [u, v] of [[40, 16], [32, 48]]) s.rect(u, v + 12, 16, 1, 0xc9963a, 0); s.rect(32, 0, 32, 16, robe, 0.08); } }), { emit: 2 });
  const rig = new Rig({ material: m, scale: 1.9, bodyW: 8, bodyD: 5, armW: 4, legH: 12 });
  rig.vd = 1.1;   // (a fine grid, for the snakes above all, within her budget)
  rig.legR.visible = rig.legL.visible = false;
  hideSkin(rig.torso, rig.head, rig.armR, rig.armL);
  // (head proportions, proportions.js: the cowl and the face in it reshaped
  // to 0.82, the veil and the staring eyes with them; the snakes are not, so
  // the hair writhes large round the smaller head; a longer trunk and robe
  // keep her height)
  const HF = 0.82, L1 = 13.4;
  reshape(rig, rig.head, HF);
  reshape(rig, rig.torso, [1.04, 1.1, 1.04]);
  reshape(rig, rig.hips, [1.04, L1 / 12, 1.04]);
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [1, 1.08, 1]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  const robes = [0x120c0e, 0x1c1316, 0x261a1e, 0x30222a], trimC = [0xe0901c, 0xf0a828, 0xc87814];
  // robe colour with soft vertical folds
  const fold = (x, z, n) => robes[Math.max(0, Math.min(3, Math.floor((Math.sin(Math.atan2(x, z) * 7) * 0.5 + 0.5) * 2.2 + n * 1.6)))];
  // the cloak over chest and shoulders, a gold belt and clasp, gold trim down the front
  sculpt(rig, rig.torso, [
    { b: [-1.6, 2.6, 2.4, 1.6, 4.8, 3.6], col: [0xf0b030, 0xd8962a], m: 'm', bump: 0, fuzz: 0 },
    { e: [0, 3.6, 0, 5, 1, 3.4], col: trimC, m: 'm', bump: 0, fuzz: 0 },
    { e: [0, 11, -0.6, 7.2, 3.4, 4.4], col: (x, y, z, n) => (z > 2.4 && Math.abs(x) < 1.6 + (12 - y) * 0.15 && Math.abs(x) > 0.6 + (12 - y) * 0.15 ? trimC[1] : fold(x, z, n)), fuzz: 0.1 },
    { e: [0, 6, 0, 5, 7, 3.2], col: (x, y, z, n) => (z > 2.2 && Math.abs(Math.abs(x) - 1.6) < 0.6 ? trimC[0] : fold(x, z, n)), fuzz: 0.05 },
  ], { v: 0.8, seed: 31 });
  // the robe falls from the hips and flares to a ragged hem on the ground
  const skirt = (y0, y1, r0, r1, opts = {}) => ({ b: [-r1 - 1, y1, -r1 - 1, r1 + 1, y0, r1 + 1], col: (x, y, z, n, h) => {
    const t = (y0 - y) / (y0 - y1), r = r0 + (r1 - r0) * t * t * 0.6 + (r1 - r0) * t * 0.4, d = Math.hypot(x * 1.0, z * 1.25);
    if (d > r + (n - 0.5) * 1.4) return null;
    if (y < y1 + 1.4 + h * 1.4 && hash3(Math.floor(Math.atan2(x, z) * 6), 0, 0, 3) < 0.4 && y < y1 + 0.8) return null;   // ragged hem
    if (y < y1 + 1.6) return trimC[Math.floor(h * 2)];
    if (z > 1 && Math.abs(x) < 1.2 + t * 2.6 && Math.abs(x) > 0.4 + t * 2.4) return trimC[0];
    return fold(x, z, n);
  }, bump: 0, ...opts });
  sculpt(rig, rig.hips, [skirt(2, -12.2, 4.4, 10.5)], { v: 1, seed: 32 });
  // wide bell sleeves, gold cuffs and bracelets, grey-green clawed hands
  for (const arm of [rig.armR, rig.armL]) {
    sculpt(rig, arm, [
      { b: [-2.2, -11, -2, 2.2, -8.4, 2.2], col: 0x8aa088, bump: 0 },
      { b: [-5, -9, -5, 5, 2.6, 5], col: (x, y, z, n, h) => { const r = 2.6 + (2 - y) * 0.2; if (Math.hypot(x, z) > r) return null; if (y < -7.6) return Math.hypot(x, z) > r - 1.1 ? trimC[Math.floor(h * 2)] : null; return fold(x, z, n); }, bump: 0 },
    ], { v: 0.8, seed: 33 }, [
      { p: [0, -7.9, 0], s: [4.6, 1.2, 4.6], c: 0xf0b030, m: 'm' },
      ...[-1.4, -0.45, 0.45, 1.4].map((dx) => ({ p: [dx, -12.4, 1.1], s: [0.6, 2.6, 0.7], c: 0x9ab098, r: [0.35, 0, 0] })),
      ...[-1.4, -0.45, 0.45, 1.4].map((dx) => ({ p: [dx, -13.9, 1.7], s: [0.45, 1, 0.5], c: 0x2a2420, r: [0.6, 0, 0] })),
    ]);
  }
  // the hood: a deep peaked cowl, gold-edged, with a void where her face should be
  const hoodIn = (x, y, z) => (x / 6.4) ** 2 + ((y - 4.8) / 6.6) ** 2 + ((z + 0.4) / 6.2) ** 2 < 1;
  const cutIn = (x, y, z, k = 1) => (x / (3.7 * k)) ** 2 + ((y - 3.4) / (4.6 * k)) ** 2 + ((z - 6.6) / (3.6 * k)) ** 2 < 1;
  sculpt(rig, rig.head, [
    { b: [-3.8, -1.4, 2.4, 3.8, 8.4, 3.2], col: 0x060405, bump: 0, fuzz: 0 },
    { e: [0, 3.4, 6.6, 3.7, 4.6, 3.6], cut: true, bump: 0, fuzz: 0 },
    { e: [0, 3.4, 6.6, 4.9, 5.9, 4.7], col: (x, y, z) => (hoodIn(x, y, z) && !cutIn(x, y, z) && z > 1.4 ? [trimC[1], 'm'] : null), bump: 0, fuzz: 0 },
    { e: [0, 4.8, -0.4, 6.4, 6.6, 6.2], col: (x, y, z, n) => fold(x, z, n), bump: 0.08, fuzz: 0.06 },
    ...along((t) => [0, 10 + t * 3.4, -1.8 - t * 3.6], 6, 3.4, 1, robes[2]),
    { e: [0, -1, -1.6, 7.4, 2.4, 5.4], col: (x, y, z, n) => fold(x, z, n) },
  ], { v: 0.8, seed: 34 });
  const veil = reshape(rig, group(rig.head, 0, 8.6, 4.6), HF);
  markHeadCore(rig, [0, 3.5, 3.6], [7.6, 9.8, 6]);   // (the face in the cowl: the hood, its peak and the snakes aside)
  sculpt(rig, veil, [{ b: [-3.6, -9.6, -0.5, 3.6, 0, 0.3], col: (x, y, z, n, h) => (y < -8.8 && h < 0.4 ? null : [0x0a0709, 0x120c0f][Math.floor(h * 2)]), bump: 0, fuzz: 0 }], { v: 0.8, seed: 35 });
  rig.extras.veil = veil; sway(rig, veil, 'x', 0.06, 1.6);
  // eyes that light up behind the veil when she stares
  const eyes = reshape(rig, group(rig.head, 0, 4.6, 3.6), HF);
  sculpt(rig, eyes, [], {}, [{ p: [-1.8, 0, 0], s: [1.8, 0.9, 0.4], c: 0xb8ff40, m: 'e' }, { p: [1.8, 0, 0], s: [1.8, 0.9, 0.4], c: 0xb8ff40, m: 'e' }]);
  eyes.visible = false; rig.extras.eyes = eyes;
  // the snakes: green coils rising round the hood, heads reared outward.
  // (as on vox-bosses-1: slim and long, carved from small cells: round
  // scaled bodies with a pale belly and dark bands, curving in an S over six
  // joints, and wedge heads with a snout, glowing eyes, fangs and a forked
  // tongue)
  const greens = [0x1e5a2a, 0x24703a, 0x2e8444], belly = 0xb8d070;
  const snakeAt = [[-4.2, 7, 1.2, 0.2, -0.5, 0.95], [4.2, 7, 1.2, 0.2, 0.5, -0.95], [-3.6, 9.4, -1.6, -0.35, -0.4, 0.6], [3.6, 9.4, -1.6, -0.35, 0.4, -0.6], [-1.6, 11, -2.2, -0.5, -0.2, 0.22], [1.6, 11, -2.2, -0.5, 0.2, -0.22], [-5, 3.4, -1, 0.1, -0.7, 1.35], [5, 3.4, -1, 0.1, 0.7, -1.35]];
  snakeAt.forEach(([x, y, z, rx, ry, rz], si) => {
    const root = group(rig.head, x, y, z, rx, ry, rz), segs = [];
    let p = root;
    const n = 6, seg = 2.2, bends = [0, -0.32, -0.2, 0.42, 0.4, 0.3];
    for (let i = 0; i < n; i++) {
      const g = group(i ? group(p, 0, seg, 0, bends[i] * (si % 3 === 2 ? 0.6 : 1)) : p), r = 1.4 - i * 0.08;
      const scales = (x, y, z, nn, h) => (z > r * 0.5 ? belly : Math.abs(y - seg * 0.5) < 0.3 && z < 0 ? 0x123a1c : greens[(Math.floor(h * 2.99) + si) % 3]);
      sculpt(rig, g, [{ cap: [0, -0.2, 0, 0, seg + 0.2, 0, r, r * 0.95], col: scales, bump: 0.04, fuzz: 0.04 }], { v: 0.6, seed: 40 + si * 7 + i });
      segs.push(g); p = g;
    }
    const head = group(p, 0, seg + 0.4, 0, 0.1, 0, 0);
    sculpt(rig, head, [
      { e: [0, 0.5, 2.5, 1.2, 0.85, 2.1], col: greens[1], bump: 0.04, fuzz: 0.03 },
      { e: [0, -0.4, 1.8, 1.4, 0.6, 2.1], col: belly, bump: 0.03, fuzz: 0.02 },
      { e: [0, 0.45, 0.8, 1.85, 1.2, 1.75], col: (x, y) => (y > 1.1 ? greens[2] : greens[0]), bump: 0.05, fuzz: 0.04 },
    ], { v: 0.6, seed: 60 + si }, [
      { p: [-1.15, 1.05, 1.7], s: [0.7, 0.7, 0.7], c: 0xffd020, m: 'e' }, { p: [1.15, 1.05, 1.7], s: [0.7, 0.7, 0.7], c: 0xffd020, m: 'e' },
      { p: [0, -0.5, 4], s: [0.3, 0.25, 1.8], c: 0xd8202a }, { p: [-0.25, -0.7, 5], s: [0.25, 0.7, 0.25], c: 0xd8202a }, { p: [0.25, -0.7, 5], s: [0.25, 0.7, 0.25], c: 0xd8202a },
      { p: [-0.6, -0.6, 3.1], s: [0.3, 0.8, 0.3], c: 0xf4f0e0 }, { p: [0.6, -0.6, 3.1], s: [0.3, 0.8, 0.3], c: 0xf4f0e0 },
    ]);
    (rig.extras.snakes ??= []).push({ segs, ph: si * 1.7, amp: 0.26, speed: 2.4, head });
  });
  applyShape(rig);
  rig.hunch = 0.05;
  return rig;
}
