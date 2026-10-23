// The dracaena: a snake-haired woman on twin serpent tails.
import * as THREE from 'three/webgpu';
import { Rig, PX, HOLD_PITCH } from '../character.js';
import { paintPerson } from '../mortals.js';
import { HS, skinMat, group, sway } from '../parts.js';
import { kit, dropMeshes, densityFor } from '../voxkit.js';
import { markTip, markHeld, keepAbove } from '../rigContract.js';
import { gridHair } from './furies.js';

// A writhing snake drawn with the kit: a chain of segment groups (one mesh
// each) ending in a head with yellow eyes and a forked tongue, registered in
// rig.extras.snakes for animateExtras.
function kitSnake(K, rig, parent, { len = 2, seg = 2, w = 1.3, cols, belly, at = [0, 0, 0], rot = [0, 0, 0], amp = 0.3, speed = 3.5 } = {}) {
  const root = group(parent, ...at, ...rot);
  const segs = [];
  let p = root;
  for (let i = 0; i < len; i++) {
    const g = group(p, 0, i ? seg : 0, 0);
    const k = 1 - i / len * 0.25;
    K.box(g, 0, seg / 2, 0, w * k, seg + 0.3, w * k, K.tone(cols, 0.12));
    if (belly) K.box(g, 0, seg / 2, w * k / 2, w * k * 0.6, seg * 0.7, 0.25, belly);
    segs.push(g); p = g;
  }
  // the head sits on the last segment (no extra mesh)
  const hw = w * 1.5, y = seg + hw * 0.3;
  K.box(p, 0, y, hw * 0.35, hw, hw * 0.7, hw * 1.5, cols[0], 0.5);
  for (const sx of [-1, 1]) K.box(p, sx * hw * 0.42, y + hw * 0.15, hw * 0.75, 0.4, 0.4, 0.4, 0xffd000);
  K.box(p, 0, y - hw * 0.4, hw * 1.25, 0.25, 0.15, 1.2, 0xc8102a, 0.5);
  (rig.extras.snakes ??= []).push({ segs, ph: K.r() * 6, amp, speed, head: p });
  return { root, segs };
}

// Dracaena (vox-enemies, middle row): a snake-haired woman in a black and
// gold top with gold arm rings and a skirt of dark leather strips, over one
// long serpent tail in dark green scales with a gold belly stripe, coiling on
// the ground and curling up at the tip; a long gold-tipped spear and a
// small bronze buckler.
// (The sheet draws her about 2.7x its Percy, as tall as the hellhound beside
// her; the size spec, design/sizes.json, makes her "bigger", an imposing
// elite about 1.8x Percy. She stands reared up on a
// long serpent trunk (the rig's legH) at rig scale 1.7, her skin painted
// finer (skinMat scale) and her scales, belly plates, hair snakes and
// armour drawn in cells of a hero's voxel size (densityFor), so the bigger
// body is made of more cells, not bigger ones. Her head stays small for her
// size (headS 6.2): a big body keeps a less childlike head.)
export function buildDracaena() {
  const skin = 0xd49a70, gold = 0xe0a426, goldD = 0xa87010, goldL = 0xf0c040, blk = 0x161214;
  const G = [0x0e4a26, 0x146030, 0x0a3a1c, 0x1c7038];
  const SC = 1.85, LEG = 25, HSZ = 6.2, D = densityFor(SC), c = 1 / D;   // (c: one hero pixel in her own skin pixels)
  const mat = skinMat('dracaena', (S) => {
    paintPerson(S, { skin, hair: 0x0e4a26, fringe: 1, hairSide: 3, hairBack: 6, eye: 0x0a6a3a, eyeWhite: 0xf0f0e0, scowl: true, brow: 0x0a2a14, fangs: 0xf4f0e0, mouth: false, top: skin, sleeve: skin, hand: skin, pants: 0x0e4a26, skirt: 0x1a2a1a, skirtLen: 7,
      face: (s, ey) => { s.rect(11, ey + 2, 2, 1, 0xa8483a, 0); s.dot(9, ey - 0.5, 0x0a2a14, 2, 1); s.dot(14, ey - 0.5, 0x0a2a14, 2, 1); },
      body: (s) => {
        for (const [u, w] of [[16, 4], [20, 8], [28, 4], [32, 8]]) { s.rect(u, 20, w, 5, blk, 0.05); s.rect(u, 20, w, 1, gold, 0); s.rect(u, 24, w, 1, gold, 0); }
        s.rect(23.5, 22, 1, 2, gold, 0); s.rect(23, 25, 2, 2, gold, 0);
        s.rect(16, 29, 24, 3, 0x1a2a1a, 0.1); s.rect(16, 29, 24, 1, gold, 0); for (let x = 16; x < 40; x += 2) s.dot(x + 0.5, 30.5, 0x2e7a3a);
      } });
    S.shadeLimbs(); S.saturate(1.2);
  }, { emit: 1, rough: 0.55, res: 2, scale: SC });
  const rig = new Rig({ material: mat, scale: SC, bodyW: 8, bodyD: 4.4, bodyH: 13, armW: 3, legH: LEG, headS: HSZ });
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  const K = kit(rig, mat, { seed: 23, rough: 0.55, density: D });
  // Scales in hero-sized cells over a box face: a staggered chequer of raised
  // plates, darker at their lower edge, on the faces named (l, r, k = back, f)
  const scales = (p, cx, cy, cz, w, h, d, faces, cols = G) => {
    const st = 1.9 * c, sz = 1.75 * c;   // (two hero pixels a scale, as chunky as the sheet's)
    for (const f of faces) {
      const across = f === 'l' || f === 'r' ? d : w;
      for (let j = 0, y = cy + h / 2 - st / 2; y > cy - h / 2; j++, y -= st * 0.8) for (let u = -across / 2 + (j % 2 ? st / 2 : st / 4); u < across / 2 - st / 4; u += st) {
        if (K.r() < 0.25) continue;
        const col = K.tone(cols, 0.16);
        if (f === 'l' || f === 'r') { const x = cx + (f === 'r' ? 1 : -1) * (w / 2 + 0.1 * c); K.box(p, x, y, cz + u, 0.3 * c, sz, sz, col); }
        else { const z = cz + (f === 'f' ? 1 : -1) * (d / 2 + 0.1 * c); K.box(p, cx + u, y, z, sz, sz, 0.3 * c, col); }
      }
    }
  };
  // the serpent trunk she rears up on: from the hips down to the ground in
  // a gentle S, tapering a little; a broad band of gold belly plates down the
  // front, a zigzag gold stripe down each side, scales all over
  const base = group(rig.hips, 0, 0, 0);
  const TL = LEG - 2.4, trunk = [[0, -TL * 0.25, -0.2, 7.6, 5.4], [-TL * 0.25, -TL * 0.5, -0.7, 7.4, 5.8], [-TL * 0.5, -TL * 0.75, -0.5, 7.2, 6], [-TL * 0.75, -TL, 0.1, 7.2, 6.2]];
  for (const [y0, y1, z, w, d] of trunk) {
    const h = y0 - y1, cy = (y0 + y1) / 2;
    K.box(base, 0, cy, z, w, h + 0.2, d, G[0]);
    scales(base, 0, cy, z, w, h, d, 'lrk');
    // the belly: overlapping gold plates (ventral scutes) with dark seams
    for (let y = y0 - 0.5 * c; y > y1; y -= 1.1 * c * 1.6) { K.box(base, 0, y, z + d / 2 + 0.25, w * 0.6, 1.4 * c * 1.4, 0.5, gold); K.box(base, 0, y - 0.95 * c * 1.4, z + d / 2 + 0.32, w * 0.62, 0.35 * c, 0.4, goldD); }
    // the zigzag side stripe
    for (const sx of [-1, 1]) for (let y = y0 - 0.8, k = 0; y > y1 + 0.6; y -= 1.3, k++) K.box(base, sx * (w / 2 + 0.22 * c), y, z + (k % 2 ? 0.9 : -0.9), 0.35 * c, 1.5, 1.9, k % 2 ? gold : goldD);
  }
  const segs = [];
  // the coil on the ground, built bigger with her (×1.25), in finer scales
  const shape = [[8, 5.8, 6.8], [7.5, 5.5, 6.8], [6.8, 5, 6.5], [6, 4.5, 6.2], [5, 4, 6], [4, 3.2, 5.5], [3, 2.5, 5], [2, 1.9, 4.2]];
  let parent = group(base, 0, -LEG + shape[0][1] / 2, -0.4);
  const bend = [0.05, 0, 0, 0.05, 0.1, 0.35, 0.6, 0.6], yaw = [0.9, 0.85, 0.85, 0.8, 0.75, 0.4, 0.2, 0.2];   // (bend +: up; the tip curls up off the ground)
  for (let i = 0; i < shape.length; i++) {
    const [w, h, d] = shape[i];
    const g = group(parent, 0, 0, i ? -shape[i - 1][2] + 0.5 : 0, bend[i], yaw[i], 0);
    if (i > 1) sway(rig, g, 'y', 0.1, 2.2, i * 0.8);
    K.box(g, 0, 0, -d / 2, w, h, d + 0.5, G[i % 2]);
    // scales: a chequer of raised cells on the back and sides, a hero pixel each
    for (let z = 0.9 * c, j = 0; z < d; z += 1.9 * c, j++) for (let u = -w / 2 + 0.9 * c + (j % 2) * 0.95 * c; u < w / 2 - 0.5 * c; u += 1.9 * c) if (K.r() < 0.6) K.box(g, u, h / 2 + 0.1 * c, -z, 1.75 * c, 0.3 * c, 1.75 * c, K.tone(G, 0.16));
    for (const sx of [-1, 1]) for (let z = 0.9 * c, j = 0; z < d; z += 1.9 * c, j++) for (let y = h / 2 - 1 * c; y > -h / 2 + 1.2 * c; y -= 1.9 * c) if (K.r() < 0.55) K.box(g, sx * (w / 2 + 0.1 * c), y - (j % 2) * 0.95 * c, -z, 0.3 * c, 1.75 * c, 1.75 * c, K.tone(G, 0.16));
    // gold belly plates and a zigzag side stripe
    for (let z = 0.4; z < d; z += 1.6 * c * 1.4) K.box(g, 0, -h / 2 - 0.1, -z, w * 0.75, 0.4, 1.4 * c * 1.4, z % 2 > 1 ? gold : goldD);
    for (const sx of [-1, 1]) { K.box(g, sx * (w / 2 + 0.2 * c), -h * 0.2, -d * 0.3, 0.35 * c, h * 0.35, d * 0.5, gold); K.box(g, sx * (w / 2 + 0.22 * c), h * 0.05, -d * 0.75, 0.35 * c, h * 0.3, d * 0.4, goldD); }
    segs.push(g); parent = g;
  }
  K.box(parent, 0, 0.6, -4.6, 1.2, 2.6, 1.2, G[2], -0.6); K.box(parent, 0, 2, -4.9, 0.8, 1.2, 0.8, goldD, -0.6);   // the curled tip
  // the skirt: two layers of dark leather strips hung from the belt, each
  // with a gold stud at the top and a pale worn hem
  for (const [n, L0, rx, rz, tilt] of [[18, 5.5, 4.4, 2.9, 0.2], [14, 3.6, 4.2, 2.7, 0.24]]) for (let i = 0; i < n; i++) {
    const a = (i + (n === 14 ? 0.5 : 0)) / n * Math.PI * 2, x = Math.sin(a) * rx, z = Math.cos(a) * rz, L = L0 + (i % 3) * 0.8;
    K.flare(rig.hips, x, -L / 2 + 0.5, z, 1.7, L, 0.6, i % 2 ? 0x1a2a1a : blk, a, tilt);
    if (n === 18) { K.box(rig.hips, x * 1.06, -0.1, z * 1.08, 0.7 * c, 0.7 * c, 0.4, goldL, 0, a, 0); K.flare(rig.hips, x * (1 + L * 0.045), 0.6 - L, z * (1 + L * 0.045), 1.6, 0.4 * c, 0.6, 0x3a3a2a, a, tilt); }
  }
  // the gold belt, banded, with a square buckle and a hanging gold tongue
  K.box(rig.torso, 0, 0.6, 0, 8.8, 1.4, 5.2, gold); K.box(rig.torso, 0, 0.6, 0, 8.9, 0.3 * c, 5.3, goldD);
  K.box(rig.torso, 0, 0.6, 2.7, 2.4, 2.2, 0.4, goldL); K.box(rig.torso, 0, 0.6, 2.85, 1.3, 1.1, 0.3, blk);
  for (let i = 0; i < 3; i++) K.box(rig.hips, 0, -0.8 - i * 1.3 * c * 1.2, 2.95 + i * 0.12, 1.6 - i * 0.25, 1.3 * c * 1.2, 0.35, i % 2 ? goldD : gold, -0.12);
  // the bodice: a black top in two cups rimmed in gold, a gold rib between
  // them, a gold collar with a pendant, and studs down the sides
  const T = rig.torso, bH = 13, fzT = 2.2 + 0.25;
  for (const sx of [-1, 1]) {
    K.box(T, sx * 1.8, bH - 4.2, fzT, 3.2, 2.8, 0.5, blk, 0, 0, -sx * 0.1);
    K.box(T, sx * 1.8, bH - 2.7, fzT + 0.1, 3.3, 0.35 * c, 0.4, gold, 0, 0, -sx * 0.1); K.box(T, sx * 1.8, bH - 5.65, fzT + 0.1, 3.3, 0.35 * c, 0.4, gold, 0, 0, -sx * 0.1);
    K.box(T, sx * 2.2, bH - 1.6, fzT - 0.1, 0.4 * c, 2.2, 0.35, gold, 0, 0, sx * 0.35);   // the straps
    for (let y = bH - 3.4; y > 2.4; y -= 1.6) K.box(T, sx * 4.05, y, 0.6, 0.3, 0.6 * c, 0.6 * c, goldL);
  }
  K.box(T, 0, bH - 4.2, fzT + 0.15, 0.8 * c, 2.4, 0.4, goldL);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; K.box(T, Math.sin(a) * 2.1, bH + 0.15 - (Math.cos(a) > 0 ? 0.35 : 0), Math.cos(a) * 1.6, 0.8 * c, 0.6 * c, 0.8 * c, i % 2 ? gold : goldL); }
  K.box(T, 0, bH - 1.2, fzT + 0.05, 0.9 * c, 1.2 * c, 0.3, goldL); K.box(T, 0, bH - 1.2, fzT + 0.15, 0.4 * c, 0.5 * c, 0.2, 0x2ad870);
  // gold armlets high on the arm, and wide banded bracers at the wrist
  for (const arm of [rig.armR, rig.armL]) {
    K.box(arm, 0, 0.4, 0, 3.4, 1.4, 4.4, gold); K.box(arm, 0, 0.4, 0, 3.5, 0.3 * c, 4.5, goldD); K.box(arm, 0, -0.9, 0, 3.4, 0.5 * c, 4.4, gold);
    K.box(arm, 0, -7, 0, 3.6, 2.4, 4.6, gold);
    for (const y of [-6, -7, -8]) K.box(arm, 0, y, 0, 3.7, 0.3 * c, 4.7, goldD);
    K.box(arm, 0, -7, 2.36, 1, 1, 0.2, 0x2ad870);   // a green stone set in each bracer
  }
  // snake hair: a mass of green curls, snake heads poking out all round, and
  // six that writhe (the sheet draws a crown of them)
  gridHair(rig, { style: 'curls', base: 0x146030, shade: 0x0a3a1c, light: 0x2a8a44, seed: 17, shape: { r: [6.8, 7.4, 6.6], bump: 0.55, tuft: 0.3, spike: 0.1, side: 0, back: -3 } }, mat);
  const Hd = rig.head, hk = HS * HSZ / 8;
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2 + 0.3, x = Math.sin(a) * 7.3, z = Math.cos(a) * 6.7 - 0.8, y = 3.6 + (i % 3) * 2.3;
    if (z > 3 && y < 7) continue;
    const o = [x * hk, y * hk, z * hk];
    // a snake head: the skull, a paler jaw, two gold eyes, a flicked red tongue on some
    K.boxY(Hd, o, a, 0, 0, 0.5, 1.4, 1.05, 2.1, G[i % 4]); K.boxY(Hd, o, a, 0, -0.45, 1.25, 1.1, 0.4, 1.2, G[3]); K.boxY(Hd, o, a, 0, 0.1, -1.1, 1.05, 0.95, 1.4, G[(i + 1) % 4]);
    for (const sx of [-1, 1]) K.boxY(Hd, o, a, sx * 0.56, 0.3, 1.05, 0.3 * c * 1.4, 0.3 * c * 1.4, 0.3 * c * 1.4, 0xffd000);
    if (i % 3 === 1) K.boxY(Hd, o, a, 0, -0.3, 2.1, 0.25, 0.15, 0.9, 0xd8202a);
  }
  for (const [x, z, rx, rz] of [[-3, 1.5, 0.5, 0.8], [3, 1.5, 0.5, -0.8], [-1.5, -1, -0.3, 0.3], [1.8, -0.5, 0.2, -0.4], [-4.2, -1.5, -0.2, 1.1], [4.2, -1.8, -0.2, -1.1]])
    kitSnake(K, rig, Hd, { len: 2, seg: 1.6, w: 1.15, cols: G, belly: gold, at: [x * hk, 8.6 * hk, z * hk], rot: [rx, 0, rz], amp: 0.28, speed: 4 });
  for (const sx of [-1, 1]) { K.box(Hd, sx * 4.1 * hk, 3.4 * hk, 0.6, 0.5 * c, 0.5 * c, 0.5 * c, goldL); K.box(Hd, sx * 4.1 * hk, 3.4 * hk - 0.9 * c, 0.6, 0.7 * c, 0.9 * c, 0.7 * c, gold); }   // earrings
  // the long spear (as tall as she is, as the sheet draws it) and a small buckler
  const spear = new THREE.Group(); rig.handR.add(spear); spear.rotation.x = HOLD_PITCH;   // (along +y, levelled forward: see the hand-axis convention in character.js)
  K.box(spear, 0, 6, 1.5, 1, 44, 1, 0x4a2e1a);
  for (let y = -3; y < 4; y += 1.1 * c * 1.4) K.box(spear, 0, y, 1.5, 1.25, 0.6 * c * 1.4, 1.25, 0x2a1a10, 0, 0.4, 0);   // the leather grip wrap
  for (const y of [-10, 18, 24]) { K.box(spear, 0, y, 1.5, 1.4, 0.8, 1.4, gold); K.box(spear, 0, y + 0.55, 1.5, 1.2, 0.3 * c, 1.2, goldD); }
  K.box(spear, 0, -15.6, 1.5, 1.3, 1.2, 1.3, goldD);   // the butt cap
  K.box(spear, 0, 27, 1.5, 1.8, 1.2, 1.8, goldD);
  K.box(spear, 0, 29.5, 1.5, 2.6, 4, 0.8, gold); K.box(spear, 0, 32.5, 1.5, 1.8, 2.4, 0.7, gold); K.box(spear, 0, 34.5, 1.5, 0.9, 2, 0.6, goldL);
  K.box(spear, 0, 30.5, 1.5, 0.35 * c, 6, 0.95, goldD);   // the blade's raised midrib
  for (const sx of [-1, 1]) K.box(spear, sx * 1.55, 28.3, 1.5, 0.8, 1.6, 0.6, goldD, 0, 0, sx * 0.5);   // its barbs
  markTip(spear, 0, 35.5, 1.5, 'spear');
  const shield = markHeld(new THREE.Group()); shield.position.set(1.6 * PX, -5 * PX, 1 * PX); rig.handL.add(shield); shield.rotation.y = Math.PI / 2;
  K.box(shield, 0, 0, 0, 7.6, 7.6, 1, gold); K.box(shield, 0, 0, 0.4, 5.6, 5.6, 0.6, G[0]); K.box(shield, 0, 0, 0.8, 2, 2, 0.8, gold);
  for (const [x, y] of [[-2.8, 0], [2.8, 0], [0, 2.8], [0, -2.8]]) K.box(shield, x, y, 0.6, 0.8, 0.8, 0.6, 0xf0c040);
  rig.extras.shield = shield;
  K.done();
  rig.hunch = 0.15;
  keepAbove(rig, spear, { reset: true });   // (a slam that ends low grounds the spear point rather than driving it through the floor)
  return rig;
}
