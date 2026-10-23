// The birds and bird-women: wings for any model (addWings), the harpy and
// the Stymphalian bird (eagle, in its woman and hunter forms).
import * as THREE from 'three/webgpu';
import { Rig, PX } from '../character.js';
import { paintPerson } from '../mortals.js';
import { HS, solid, skinMat, group } from '../parts.js';
import { kit, dropMeshes } from '../voxkit.js';

// Wings on the upper back: two segments per side (root = the arm, elbow =
// the hand) that flap in rig.tick. kind 'feather' (harpy, Stymphalian bird)
// or 'bat' (Fury). Drawn with the voxel kit: one mesh per segment. Colours
// come from cols { main, tip, bone, edge, dark } or from the given materials.
export function addWings(rig, { span = 14, chord = 9, mat, tip, kind = 'bat', y = 10, flap = 1, bone = solid(0x2a1a14), cols = null, seed = 3, look = rig.material, fine = 1 } = {}) {
  const hex = (m, d) => (m?.color ? m.color.getHex() : d);
  const C = { main: hex(mat, 0x5a3a26), tip: hex(tip ?? mat, 0x3a2418), bone: hex(bone, 0x2a1a14), ...cols };
  C.edge ??= C.bone; C.dark ??= C.tip;
  const K = kit(rig, look, { seed });
  const wings = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group(); root.position.set(side * 2 * PX, y * PX, -2.6 * PX); rig.torso.add(root);
    const elbow = new THREE.Group(); root.add(elbow);
    const X = (v) => side * v;
    if (kind === 'bat') {
      // leathery membrane in stepped rows under the arm bone, then a raised
      // hand of fanned finger bones with membrane between them, and a ragged
      // trailing edge of torn strips
      const inL = span * 0.55, outL = span * 0.62;
      elbow.position.set(X(inL) * PX, 0, 0);
      K.box(root, X(inL / 2), 0.4, 0.2, inL, 1.4, 1.4, C.bone);
      for (let r = 0; r < 3; r++) K.box(root, X(inL * (1 - r * 0.15) / 2 + 0.3), -chord * (0.17 + r * 0.3), 0, inL * (1 - r * 0.15), chord * 0.32, 0.5, r % 2 ? C.tip : C.main);
      // a wing drawn bigger (fine > 1): the membrane shows its grain, long
      // ragged strips of leather layered over it, as the Fury sheet draws them
      if (fine > 1) for (let r = 0; r < 3; r++) for (let x = 0.5; x < inL * (1 - r * 0.15); x += 1.1 / fine) {
        const h = chord * (0.22 + K.r() * 0.16), sk = (K.r() - 0.5) * 0.1;
        K.box(root, X(x + 0.3), -chord * (0.17 + r * 0.3) - (K.r() - 0.3) * 0.8, side * 0 + 0.35, 0.9 / fine, h, 0.3, K.tone([C.main, C.tip, C.dark], 0.18), 0, 0, sk);
      }
      // (fine: a wing drawn bigger tears into more, narrower strips)
      for (let x = 0.6; x < inL * 0.85; x += 0.9 / fine) { const h = 1.2 + K.r() * chord * 0.45; K.box(root, X(x), -chord * 0.95 - h / 2 + 0.6, 0, 0.8 / fine, h, 0.4, K.r() < 0.5 ? C.tip : C.dark); }
      const hand = group(elbow, 0, 0, 0, 0, 0, side * 0.55);
      K.box(hand, X(outL * 0.25), 0.3, 0.2, outL * 0.5, 1.2, 1.2, C.bone);
      K.box(hand, X(outL * 0.5), 1.2, 0.2, 1.4, 2.6, 1.4, C.bone);       // the thumb claw
      const fan = [0.05, 0.45, 0.85, 1.25, 1.6];
      for (const [i, th] of fan.entries()) {
        const L = outL * (1 - i * 0.1), ux = side * Math.cos(th), uy = -Math.sin(th), px = -side * Math.sin(th), py = -Math.cos(th), rz = -side * th;
        K.box(hand, ux * L / 2, uy * L / 2, 0.25, L, 0.8, 0.8, C.bone, 0, 0, rz);
        if (i === fan.length - 1) break;
        // membrane to the next finger, and torn strips off its edge
        const mh = L * 0.36;
        K.box(hand, ux * L * 0.48 + px * mh / 2, uy * L * 0.48 + py * mh / 2, 0, L * 0.92, mh, 0.45, i % 2 ? C.tip : C.main, 0, 0, rz);
        if (fine > 1) for (let t = 0.12; t < 0.9; t += 1.1 / fine / L) {
          const h = mh * (0.7 + K.r() * 0.35);
          K.box(hand, ux * L * t + px * h / 2, uy * L * t + py * h / 2, 0.3, 0.9 / fine, h, 0.3, K.tone([C.main, C.tip, C.dark], 0.18), 0, 0, rz + side * Math.PI / 2);
        }
      }
      // the ragged trailing edge hangs from the lowest finger
      const th = fan[fan.length - 1], L = outL * (1 - (fan.length - 1) * 0.1);
      for (let k = 0, n = Math.round(7 * fine); k < n; k++) { const t = 0.2 + k * 0.84 / n, h = 1.2 + K.r() * 3.4; K.box(hand, side * Math.cos(th) * L * t - side * 0.6, -Math.sin(th) * L * t - h / 2, 0, 0.8 / fine, h, 0.35, K.r() < 0.5 ? C.dark : C.tip); }
    } else {
      // feathered: a golden leading edge, a band of coverts and a row of long
      // secondaries along the arm, then a hand of long primaries fanned out,
      // each with a pale tip (vox-enemies eagles)
      const inL = span * 0.5, outL = span * 0.6, n = 5;
      elbow.position.set(X(inL) * PX, 0, 0);
      K.box(root, X(inL / 2), chord * 0.06, 0.3, inL, 1.6, 1.6, C.edge);
      for (let i = 0; i < n; i++) {
        const x = X(inL * (i + 0.5) / n), w = inL / n + 0.35;
        K.box(root, x, -chord * 0.18, 0.4, w, chord * 0.4, 0.9, K.tone([C.main, C.edge], 0.1));
        const h = chord * 0.8 + (i % 2) * 0.8;
        K.box(root, x, -chord * 0.2 - h / 2, 0, w - 0.15, h, 0.6, K.tone([C.main], 0.12));
        K.box(root, x, -chord * 0.2 - h + 0.6, -0.05, w - 0.2, 1.4, 0.65, C.tip);
      }
      const hand = group(elbow, 0, 0, 0, 0, 0, side * 0.25);
      K.box(hand, X(outL * 0.22), chord * 0.06, 0.3, outL * 0.45, 1.4, 1.4, C.edge);
      K.box(hand, X(outL * 0.22), -chord * 0.16, 0.35, outL * 0.45, chord * 0.42, 0.9, C.main);
      for (let i = 0; i < 7; i++) {
        const a = -side * (-0.15 + i * 0.13), L = outL * (1.05 - i * 0.06), px = X(outL * 0.25), py = -chord * 0.08;
        const cx = Math.cos(a) * L / 2, cy = Math.sin(a) * L / 2;
        K.box(hand, px + side * cx, py + cy, -0.05 * i, L, chord * 0.2, 0.55, K.tone([C.dark, C.main], 0.1), 0, 0, a);
        K.box(hand, px + side * Math.cos(a) * L * 0.92, py + Math.sin(a) * L * 0.92, -0.05 * i - 0.02, L * 0.18, chord * 0.21, 0.6, C.tip, 0, 0, a);
      }
    }
    root.rotation.y = side * 0.35;
    wings.push({ root, elbow, side });
  }
  K.done();
  rig.extras.wings = wings; rig.wingFlap = flap;
  return wings;
}
// A harpy as the 3D sheet draws it (vox-enemies, top row): an upright eagle
// in layered golden-brown feathers with a pale scalloped breast, a hooked
// gold beak under a heavy brow, glowing yellow eyes, feathered trousers, gold
// scaly legs with black talons, a fan tail and wide fingered wings raised
// high. metal: bronze feathers sharp as knives (the Stymphalian birds).
// pal: colour overrides (a champion's plumage), any of main, light, dark,
// breast, tip, edge, gold, goldD, talon, eye.
// form: 'eagle' (this upright eagle; Bronzebeak), 'woman' (the harpy as a
// bird-woman; the default without metal, so Queen Gale too) or 'hunter' (the
// level bronze Stymphalian bird); the last two are built below.
export function eagle(id, { scale = 1, metal = false, pal = null, form = metal ? 'eagle' : 'woman' } = {}) {
  if (form === 'woman') return harpyWoman(id, { scale, pal });
  if (form === 'hunter') return bronzeHunter(id, { scale, pal });
  const P = { ...(metal
    ? { main: 0x9a5a18, light: 0xe0a030, dark: 0x5a2e0c, breast: 0xd8962a, tip: 0xf8c850, edge: 0xc8802a }
    : { main: 0x7a4818, light: 0xc88a38, dark: 0x3e220a, breast: 0xc89a5e, tip: 0xe0b060, edge: 0xb07a30 }), gold: 0xe8a820, goldD: 0xb87a10, talon: 0x1a120a, eye: 0xffd000, ...pal };
  const gold = P.gold, goldD = P.goldD, talon = P.talon;
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin: P.main, hair: P.main, fringe: 1, hairSide: 2, hairBack: 8, eye: 0x1a0a00, eyeWhite: 0xffd81a, scowl: true, brow: P.dark, mouth: false, top: P.main, sleeve: P.main, hand: P.main, legR: gold, legL: gold, shoes: gold,
      face: (s, ey) => { s.rect(8, ey - 2, 8, 1, P.dark, 0.1); for (const x of [9, 13]) { s.rect(x, ey - 1, 2, 2, 0xffe020, 0); s.px(x === 9 ? 10 : 13, ey, 0x1a0a00); } },
      body: (s) => {
        // feather scallops all over the body, a pale breast with dark chevrons
        for (let y = 20; y < 32; y += 2) for (let x = 16 + (y % 4 ? 1 : 0); x < 40; x += 2) { s.px(x, y, P.dark); s.dot(x + 0.5, y, P.light); }
        s.rect(20, 21, 8, 11, P.breast, 0.12);
        for (let y = 22; y < 32; y += 2) for (let x = 20 + (y % 4 ? 1 : 0); x < 28; x += 2) s.dot(x + 0.5, y + 0.5, P.main, 1, 1);
      } });
    S.shadeLimbs(); S.saturate(1.25);
  }, { emit: 1, rough: metal ? 0.4 : 0.85, res: 2 });
  const rig = new Rig({ material: mat, scale, armW: 3, legH: 6, bodyD: 7, bodyW: 8, bodyH: 11, headS: 7 });
  rig.armR.visible = rig.armL.visible = false;
  const K = kit(rig, mat, { seed: metal ? 41 : 43, rough: metal ? 0.45 : 0.85, metal: metal ? 0.2 : 0, emit: 0.7 });
  const T = rig.torso, hk = HS * 7 / 8, fz = 4 * hk;
  // breast: overlapping rows of pale feathers with dark tips; mantle and back feathers
  for (let r = 0; r < 5; r++) for (let i = 0; i < 4; i++) {
    const x = -2.7 + i * 1.8 + (r % 2) * 0.9; if (Math.abs(x) > 3.2) continue;
    K.box(T, x, 9.5 - r * 2, 3.7, 1.9, 2.2, 0.8, K.tone([P.breast], 0.12), -0.15);
    K.box(T, x, 8.6 - r * 2, 4.05, 1, 0.5, 0.3, P.main);
  }
  for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) K.box(T, -3.6 + i * 1.8, 10 - r * 2.6, -3.7, 2, 3, 0.8, K.tone([P.main, P.dark, P.light], 0.1), 0.2);
  for (const sx of [-1, 1]) for (let r = 0; r < 4; r++) K.box(T, sx * 4.2, 9.5 - r * 2.4, 0.5 - (r % 2), 0.8, 2.8, 5.5, K.tone([P.main, P.light], 0.1), 0, 0, sx * 0.1);
  // a ruff of neck feathers
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.box(T, Math.sin(a) * 4.2, 11.2 + (i % 2) * 0.5, Math.cos(a) * 3.6, 2.4, 2.6, 2.4, K.tone([P.light, P.main], 0.1), Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3); }
  // head: brow ridge, glowing eyes, crest feathers at the back, hooked beak
  const Hd = rig.head;
  K.box(Hd, 0, 5.2 * hk, fz + 0.5, 8.2 * hk, 1.3, 1.4, P.dark);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 2.4 * hk, 4.1 * hk, fz + 0.15, 1.8, 1.4, 0.3, P.eye); K.box(Hd, sx * 2.2 * hk, 4.1 * hk, fz + 0.3, 0.7, 0.8, 0.2, 0x140800); }
  for (let i = 0; i < 6; i++) K.box(Hd, -2.5 + i, 7 * hk + (i % 2) * 0.6, -fz - 0.6 - (i % 3) * 0.5, 1.4, 1.6, 3, K.tone([P.main, P.light, P.dark], 0.1), 0.5);
  K.clumps(Hd, [0, 4 * hk, 0], [8 * hk, 8 * hk, 8 * hk], { n: 26, size: [1, 1.6], cols: [P.main, P.light, P.dark], faces: 'tlrk' });
  const beak = group(Hd, 0, 2.8 * hk, fz, 0.1);
  K.box(beak, 0, 0.6, 1.2, 3.4, 2.6, 2.6, gold); K.box(beak, 0, 1.2, 2.8, 2.6, 1.8, 1.8, gold);
  K.box(beak, 0, 0.2, 3.9, 2, 2, 1.2, goldD); K.box(beak, 0, -1, 4.2, 1.4, 1.4, 1, goldD); K.box(beak, 0, -2, 4, 0.9, 1, 0.8, 0x7a4a08);
  K.box(beak, 0, -0.9, 1.6, 2.6, 1, 2.2, goldD);
  for (const sx of [-1, 1]) K.box(beak, sx * 1.75, 1.4, 1.2, 0.2, 0.6, 0.6, 0x2a1a08);
  // legs: feathered trousers, gold scaly shanks, three toes forward, one back, black talons
  for (const leg of [rig.legR, rig.legL]) {
    dropMeshes(rig, leg);
    K.box(leg, 0, -0.5, 0, 4.4, 3.6, 4.6, P.main);
    for (let i = 0; i < 6; i++) K.box(leg, -1.8 + (i % 3) * 1.8, -2.4 - Math.floor(i / 3) * 0.8, (i < 3 ? 1 : -1) * 2, 1.6, 2.4, 1, K.tone([P.main, P.light, P.dark], 0.1), (i < 3 ? 0.2 : -0.2));
    K.box(leg, 0, -4.3, 0, 1.8, 3.8, 1.8, gold);
    for (let y = -3.2; y > -6; y -= 1.1) K.box(leg, 0, y, 0, 2.1, 0.35, 2.1, goldD);
    for (const dx of [-1.3, 0, 1.3]) { K.box(leg, dx, -5.6, 1.5, 1, 0.8, 2.8, gold, 0, dx * 0.2, 0); K.box(leg, dx * 1.2, -5.8, 3.1, 0.7, 0.8, 1.2, talon, 0.4, 0, 0); }
    K.box(leg, 0, -5.6, -1.3, 1, 0.8, 1.8, gold); K.box(leg, 0, -5.8, -2.4, 0.7, 0.8, 1, talon);
  }
  addWings(rig, { span: 28, chord: 12, kind: 'feather', y: 10, flap: 1.1, seed: metal ? 45 : 47, cols: { main: P.main, tip: P.tip, edge: P.edge, dark: P.dark }, look: mat });
  // a fan of tail feathers
  const tail = group(rig.hips, 0, 2, -3.4, 0.9);
  for (let i = -3; i <= 3; i++) { K.box(tail, i * 1.4, 0, -4.5, 1.6, 0.8, 9 - Math.abs(i) * 0.5, K.tone([P.main, P.dark], 0.1), 0, i * 0.14, 0); K.box(tail, i * 1.4 + Math.sin(i * 0.14) * -4.2, 0.1, -8.6 + Math.abs(i) * 0.3, 1.7, 0.85, 1.6, P.tip, 0, i * 0.14, 0); }
  if (metal) for (let i = 0; i < 8; i++) K.box(T, -3.5 + i, 11.8 + (i % 2), -2.5, 0.5, 2.4, 0.5, P.tip, -0.5, 0, (i - 3.5) * 0.12);   // knife-quills
  K.done();
  rig.hunch = 0.3;
  rig.float = metal ? 1.1 : 0.9;
  return rig;
}
const toneHex = (c, k) => { const x = new THREE.Color(c); x.r = Math.min(0.9, x.r * k); x.g = Math.min(0.9, x.g * k); x.b = Math.min(0.9, x.b * k); return x.getHex(); };
// A harpy as the books tell it (design brief vox-harpy; Queen Gale on
// vox-ow-champions, top right): a bird-woman. A pale grey-green woman's face
// with burning yellow eyes and a screeching fanged mouth under wild
// storm-grey hair; ragged dark feathered wings where her arms should be, a
// clawed thumb at each wrist; a body of ragged dark feathers that hangs in
// torn strips past the hips; scaly yellow bird legs and black talons. She
// stands upright, so from above she reads as a pale face and grey mane
// between two dark wings: nothing like the level bronze Stymphalian.
// pal: colour overrides (a champion's plumage), any of main, light, dark,
// breast, tip, edge, skin, hair, gold, goldD, talon, eye.
function harpyWoman(id, { scale = 1, pal = null } = {}) {
  const P = { main: 0x3a3236, light: 0x5a5056, dark: 0x1c181c, breast: 0x4a4048, tip: 0x6a6270, edge: 0x2c2628, skin: 0xa8b8a0, hair: 0x747a84, gold: 0xe0b428, goldD: 0xa07a14, talon: 0x141010, eye: 0xffd000, ...pal };
  const mouth = 0x2a0a0c, fang = 0xe8e0d0;
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin: P.skin, hair: P.hair, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x1a1000, eyeWhite: P.eye, scowl: true, brow: P.dark, mouth: false, top: P.main, sleeve: P.main, hand: P.skin, pants: P.main, shoes: false,
      face: (s, ey) => {
        s.rect(8, ey - 1.5, 8, 1, P.dark, 0.1);
        for (const x of [9, 13]) { s.rect(x, ey - 0.5, 2, 1.5, P.eye, 0); s.px(x === 9 ? 10 : 13, ey, 0x1a1000); }
        s.rect(10, ey + 4.5, 4, 0.5, toneHex(P.skin, 0.7), 0);
      },
      body: (s) => { for (let i = 0; i < 80; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, s.r() < 0.5 ? P.dark : P.light); } });
    S.shadeLimbs(); S.saturate(1.1);
  }, { emit: 1, rough: 0.9, res: 2 });
  // (the vox-enemies sheet's upright bird stands about 1.1x its Percy beside
  // its bird-like peers, and a harpy is at least Percy's size. She is grown by sculpting more cells at the heroes'
  // voxel size, not by scaling: a longer torso and long bird legs, the head
  // kept at 7 px, so a bigger body gets a less childlike head, size spec
  // design/sizes.json)
  const bodyH = 16, bodyW = 7.5, LEG = 15;
  const rig = new Rig({ material: mat, scale, armW: 3, legH: LEG, bodyD: 5, bodyW, bodyH, headS: 7 });
  rig.armR.visible = rig.armL.visible = false;
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  dropMeshes(rig, rig.torso);
  const K = kit(rig, mat, { seed: 53, rough: 0.9, emit: 0.7 });
  const T = rig.torso, Hd = rig.head, hk = HS * 7 / 8, fz = 4 * hk, FE = [P.main, P.dark, P.light], RAG = [P.main, P.dark, P.edge];
  // a lean grey-green body under a coat of ragged feathers: a scrawny bare
  // neck and collarbone, a narrow chest over a narrower, pinched waist
  K.box(T, 0, bodyH * 0.72, 0, bodyW - 1, bodyH * 0.56, 4.2, P.dark);
  K.box(T, 0, bodyH * 0.24, 0, bodyW - 2.2, bodyH * 0.5, 3.4, P.dark);
  K.box(T, 0, bodyH - 1.2, 1.6, 3.4, 2.4, 1.4, P.skin); K.box(T, 0, bodyH - 0.2, 0.2, 2.4, 1.8, 2.4, P.skin);
  for (const sx of [-1, 1]) { K.box(T, sx * 1.3, bodyH - 0.9, 2.3, 1.6, 0.4, 0.4, toneHex(P.skin, 0.8), 0, 0, sx * 0.25); K.box(T, sx * 0.5, bodyH + 0.3, 1.25, 0.4, 1.6, 0.3, toneHex(P.skin, 0.78)); }   // collarbones, the cords of the neck
  // breast feathers, row on row from the throat to the waist: each a pale
  // vane with a darker tip and a light shaft down its middle
  for (let r = 0, y = bodyH - 3; y > 1.5; r++, y -= 1.5) {
    const half = y > bodyH * 0.45 ? 3.2 : 2.2;
    for (let x = -half + (r % 2) * 0.75; x <= half + 0.01; x += 1.5) {
      const z = y > bodyH * 0.45 ? 2.35 : 1.95, col = r < 3 ? [P.breast, P.main] : FE;
      K.box(T, x, y, z, 1.5, 2.1, 0.8, K.tone(col, 0.12), -0.2);
      K.box(T, x, y - 0.85, z + 0.2, 1.2, 0.5, 0.5, K.tone([P.dark, P.edge], 0.1), -0.2);
      if ((r + Math.round(x * 2)) % 3 === 0) K.box(T, x, y + 0.2, z + 0.42, 0.25, 1.5, 0.2, P.tip, -0.2);
    }
  }
  // the back: long overlapping feathers, then the sides
  for (let y = bodyH - 1.5; y > 1; y -= 2.1) for (let x = -2.6; x <= 2.7; x += 1.3) { const z = y > bodyH * 0.45 ? -2.3 : -1.9; K.box(T, x, y, z, 1.5, 3, 0.8, K.tone(FE, 0.1), 0.2); if (K.r() < 0.4) K.box(T, x, y - 1.2, z - 0.35, 1, 0.8, 0.4, P.tip, 0.2); }
  for (const sx of [-1, 1]) {
    for (let y = bodyH - 1.8; y > 1.5; y -= 2) K.box(T, sx * (y > bodyH * 0.45 ? 3.5 : 2.9), y, 0, 0.8, 2.6, y > bodyH * 0.45 ? 4.4 : 3.6, K.tone(FE, 0.1), 0, 0, sx * 0.12);
    // the shoulder where the wing meets the body: a mantle of long ragged feathers
    for (let k = 0; k < 4; k++) K.box(T, sx * (2.4 + k * 0.7), bodyH - 0.3 - k * 0.45, 0.6 - k * 0.55, 2.2, 1.4, 3, K.tone(RAG, 0.1), 0, 0, sx * (0.35 + k * 0.1));
  }
  // the ragged feather skirt: two layers of long dark strips round the hips,
  // torn at the ends, the outer layer longer and paler-tipped
  for (const [n, rx, rz, Lmin, Lvar, w] of [[22, 3.5, 2.4, 5, 6, 1.4], [16, 3.1, 2.1, 3, 3, 1.6]]) for (let i = 0; i < n; i++) {
    const a = (i + (n === 16 ? 0.5 : 0)) / n * Math.PI * 2, L = Lmin + K.r() * Lvar, x = Math.sin(a) * rx, z = Math.cos(a) * rz;
    if (Math.abs(a - Math.PI * 0.5) < 0.22 || Math.abs(a - Math.PI * 1.5) < 0.22) continue;
    K.flare(rig.hips, x, 1 - L / 2, z, w, L, 0.55, K.tone(RAG, 0.14), a, 0.22);
    if (n === 22 && i % 2 === 0) K.flare(rig.hips, x * (1 + L * 0.04), 0.4 - L, z * (1 + L * 0.04), 0.7, 1.6, 0.45, K.tone([P.tip, P.dark], 0.1), a, 0.22);
  }
  // a ragged tail of long feathers, each with a shaft and a pale torn tip
  for (let i = -3; i <= 3; i++) {
    const L = 8 - Math.abs(i) * 0.9, ry = i * 0.16, c = [i * 0.95, 0.5, -1.4 - L / 2], u = [-Math.sin(ry), Math.cos(ry) * Math.sin(0.6), -Math.cos(ry) * Math.cos(0.6)];
    K.box(rig.hips, c[0], c[1], c[2], 1.1, 0.55, L, K.tone(FE, 0.1), 0.6, ry, 0);
    K.box(rig.hips, c[0] + u[0] * (L / 2 + 0.6), c[1] + u[1] * (L / 2 + 0.6), c[2] + u[2] * (L / 2 + 0.6), 1, 0.5, 1.4, P.tip, 0.6, ry, 0);
    if (i % 2 === 0) K.box(rig.hips, c[0], c[1] + 0.3, c[2], 0.25, 0.2, L * 0.9, P.tip, 0.6, ry, 0);
  }
  // the head: wild storm-grey hair standing out on every side and spilling down the back
  const hairC = [P.hair, toneHex(P.hair, 1.22), toneHex(P.hair, 0.72)];
  K.clumps(Hd, [0, 6.6 * hk, -0.8], [8 * hk + 1, 2.6 * hk, 8 * hk + 0.6], { n: 18, size: [1.2, 2], cols: hairC, faces: 'tlrk', out: 0.1 });
  // wild locks standing out all round the crown (shorter over the face)
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + K.r() * 0.2, front = Math.cos(a) > 0.75, t = front ? 0.5 + K.r() * 0.3 : 0.75 + K.r() * 0.7, L = front ? 2 + K.r() : 3.4 + K.r() * 3.4, r = 3.2 * hk;
    const ux = Math.sin(a) * Math.sin(t), uy = Math.cos(t), uz = Math.cos(a) * Math.sin(t), bx = Math.sin(a) * r, by = 7.4 * hk - (front ? 0.4 : 0), bz = Math.cos(a) * r - 0.6;
    K.flare(Hd, bx + ux * L / 2, by + uy * L / 2, bz + uz * L / 2, 1 + K.r() * 0.5, L, 1 + K.r() * 0.5, K.tone(hairC, 0.1), a + Math.PI, t);
  }
  for (let i = 0; i < 9; i++) K.box(Hd, -4 + i, 2.4 * hk - (i % 3) * 1.1, -fz - 1.1, 1.5, 8 + K.r() * 5, 1.4, K.tone(hairC, 0.08), 0.32, 0, (i - 4) * 0.13);
  for (let i = 0; i < 6; i++) K.box(Hd, -3 + i * 1.2 + K.r() * 0.4, 2 * hk - K.r() * 2, -fz - 2.2, 1, 7 + K.r() * 4, 1, K.tone(hairC, 0.1), 0.42, 0, (i - 2.5) * 0.2);   // tangled strands lifting off the mane
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) K.box(Hd, sx * (fz + 0.5 + k * 0.3), 3.8 * hk - k * 0.8, 0.8 - k * 1.6, 1.2, 5 + K.r() * 3, 1.5, K.tone(hairC, 0.08), 0, 0, sx * (0.12 + k * 0.12));
  // a heavy brow over burning yellow eyes, a gaping screech of fangs
  K.box(Hd, 0, 5 * hk, fz + 0.25, 7 * hk, 0.9, 0.5, toneHex(P.skin, 0.62));
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.9 * hk, 4.25 * hk, fz + 0.15, 1.9, 1.1, 0.3, P.eye); K.box(Hd, sx * 1.75 * hk, 4.25 * hk, fz + 0.3, 0.6, 0.7, 0.2, 0x140800); }
  K.box(Hd, 0, 1.9 * hk, fz + 0.15, 2.4, 1.7, 0.3, mouth);
  for (const x of [-0.75, 0.75]) { K.box(Hd, x, 2.5 * hk, fz + 0.3, 0.4, 0.6, 0.2, fang); K.box(Hd, x * 0.9, 1.35 * hk, fz + 0.3, 0.35, 0.5, 0.2, fang); }
  // legs: ragged feathered thighs, then thin yellow scaly bird legs, three toes forward and one back, black talons
  // (laid out on the 15 px leg: the thigh feathers to y -7, the scaly shank
  // to the foot, the toes on the sole at -LEG)
  for (const leg of [rig.legR, rig.legL]) {
    K.box(leg, 0, -2.6, 0, 3.4, 5.2, 3.4, P.main);
    // the feathered thigh: three rings of ragged feathers, each over the next
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + r * 0.5, x = Math.sin(a) * 1.75, z = Math.cos(a) * 1.75, h = 2.2 + K.r() * 1.2;
      K.flare(leg, x, -1.2 - r * 1.9 - h / 2, z, 1.4, h, 0.5, K.tone(r === 2 ? RAG : FE, 0.12), a, 0.18);
    }
    // the knee, then the shank: a thin yellow leg ringed with scales
    K.box(leg, 0, -7.4, 0.2, 1.8, 1.4, 1.8, P.goldD);
    K.box(leg, 0, -10.6, 0.2, 1.4, 6.6, 1.4, P.gold);
    for (let y = -8.2; y > -14; y -= 0.75) K.box(leg, 0, y, 0.2, 1.7, 0.3, 1.7, P.goldD);
    for (let y = -8.6; y > -13.6; y -= 1.5) K.box(leg, 0, y, 0.95, 1.1, 0.6, 0.2, toneHex(P.gold, 1.15));   // scutes down the front
    K.box(leg, 0, -LEG + 1.3, 0.3, 1.9, 1.1, 2, P.goldD);   // the ankle
    // three long jointed toes forward and one back, each ending in a black talon
    for (const dx of [-1.15, 0, 1.15]) {
      K.box(leg, dx, -LEG + 0.4, 1.4, 0.9, 0.8, 2.2, P.gold, 0, dx * 0.25, 0);
      K.box(leg, dx * 1.18, -LEG + 0.45, 2.75, 0.75, 0.75, 1.1, P.goldD, 0, dx * 0.25, 0);
      K.box(leg, dx * 1.28, -LEG + 0.2, 3.6, 0.6, 0.9, 1.2, P.talon, 0.45, 0, 0);
    }
    K.box(leg, 0, -LEG + 0.4, -1.1, 0.9, 0.8, 1.6, P.gold); K.box(leg, 0, -LEG + 0.2, -2.1, 0.6, 0.8, 0.9, P.talon);
  }
  // wings for arms, from the shoulders: dark ragged feathers, pale-tipped primaries
  // (wide, deep wings for her body, about 2.3x her height tip to tip, with
  // the feather structure drawn out: coverts in scalloped
  // rows over the arm, the alula at the wrist, shafts on the long feathers)
  const SPAN = 31, CH = 13.5;
  const W = addWings(rig, { span: SPAN, chord: CH, kind: 'feather', y: bodyH - 1.4, flap: 1, seed: 57, cols: { main: P.main, tip: P.tip, edge: P.edge, dark: P.dark }, look: mat });
  for (const w of W) {
    const sd = w.side, inL = SPAN * 0.5;
    w.root.position.set(sd * (bodyW / 2 + 0.4) * PX, (bodyH - 1.2) * PX, -0.2 * PX);
    // two rows of small covert feathers over the arm bone, front and back,
    // and the marginal coverts along the leading edge
    for (let r = 0; r < 2; r++) for (let x = 0.8 + r * 0.6; x < inL - 0.4; x += 1.25) for (const zz of [0.95, -0.35]) {
      K.box(w.root, sd * x, -CH * (0.08 + r * 0.17), zz + r * 0.1, 1.3, CH * 0.2, 0.4, K.tone(r ? [P.main, P.dark] : [P.light, P.main], 0.12));
      if (zz > 0) K.box(w.root, sd * x, -CH * (0.08 + r * 0.17) - CH * 0.09, zz + 0.12, 1, 0.5, 0.3, P.tip);
    }
    for (let x = 0.6; x < inL; x += 0.9) K.box(w.root, sd * x, CH * 0.06 + 0.9, 0.3, 0.9, 0.6, 1.4, K.tone([P.edge, P.light], 0.1));
    // pale shafts down the long secondaries
    for (let i = 0; i < 5; i++) K.box(w.root, sd * (inL * (i + 0.5) / 5), -CH * 0.55, 0.36, 0.22, CH * 0.6, 0.15, P.tip);
    // torn feathers hanging off the arm, and the clawed thumb at the wrist
    for (let k = 0; k < 8; k++) { const h = 2 + K.r() * 5; K.box(w.root, sd * (1.2 + k * 1.85), -CH * 0.9 - h / 2, -0.2, 1, h, 0.4, K.tone([P.dark, P.tip], 0.1)); }
    // the alula: a little tuft of stiff feathers at the wrist
    for (let k = 0; k < 3; k++) K.box(w.elbow, sd * (0.6 + k * 0.5), 0.9 + k * 0.3, 0.6, 2.4 - k * 0.4, 0.6, 0.5, K.tone([P.light, P.edge], 0.1), 0, 0, sd * (0.3 + k * 0.12));
    for (const dz of [-0.5, 0.5]) K.box(w.elbow, sd * 0.2, 1.2, 0.9 + dz, 0.5, 2.4, 0.5, P.talon, 0.6, 0, 0);
  }
  K.done();
  rig.wingStroke = { base: 0.42, amp: 0.42, hand: 0.45, down: 0.4 };
  rig.hunch = 0.18;
  rig.float = 0.9;
  return rig;
}
// A Stymphalian bird (vox-enemies; the brief: "bronze feathers sharp as
// knives"): a sleek bronze bird of prey held level as it hunts, a long sharp
// bronze beak thrust forward, a narrow head with burning red-orange eyes,
// a back of overlapping metal knife-feathers, long narrow falcon wings and a
// long tail of blades. From above: a bright bronze arrowhead, never upright.
function bronzeHunter(id, { scale = 0.9, pal = null } = {}) {
  const P = { main: 0xa86a26, light: 0xd8a040, dark: 0x5a3210, edge: 0xe0b048, tip: 0xe8d088, beak: 0xc89838, beakD: 0x6a4210, steel: 0x6a6460, talon: 0x1a120a, eye: 0xff5a10, ...pal };
  const mat = skinMat(id, (S) => { paintPerson(S, { skin: P.main, hair: P.main, eye: P.eye, eyeWhite: P.eye, brow: P.dark, mouth: false, top: P.main, sleeve: P.main, hand: P.main, pants: P.dark, shoes: false }); S.saturate(1.2); }, { emit: 1, rough: 0.4 });
  const rig = new Rig({ material: mat, scale, armW: 2, legH: 5, bodyH: 6, bodyW: 6, bodyD: 6, headS: 5, jacket: false });
  rig.armR.visible = rig.armL.visible = false;
  for (const g of [rig.torso, rig.head, rig.legR, rig.legL]) dropMeshes(rig, g);
  const K = kit(rig, mat, { seed: 59, rough: 0.4, metal: 0.3, emit: 0.8 });
  const T = rig.torso, Hd = rig.head, BR = [P.main, P.light, P.edge];
  // a level, tapering body: a deep breast forward, the back narrowing to the tail
  K.box(T, 0, 3, 0, 5.4, 4.6, 9, P.main); K.box(T, 0, 2.6, 4.4, 4.6, 4.2, 2.4, P.light); K.box(T, 0, 3.4, -5, 4, 3.4, 2.4, P.dark);
  K.box(T, 0, 1, 1, 4.2, 1, 7, P.dark);
  // knife-feathers in overlapping rows down the back and flanks, each a thin bright blade
  for (let r = 0; r < 5; r++) for (let i = -1; i <= 1; i++) K.box(T, i * 1.7, 5.5 + (1 - Math.abs(i)) * 0.2, 3.6 - r * 2, 1.5, 0.5, 3.4, K.tone(BR, 0.1), -0.12, i * 0.1, 0);
  for (const sx of [-1, 1]) for (let r = 0; r < 4; r++) { K.box(T, sx * 2.9, 3.4 - (r % 2) * 1.2, 3 - r * 2.2, 0.5, 1.2, 3.8, K.tone(BR, 0.1), 0, sx * 0.1, 0); K.box(T, sx * 3, 3.4 - (r % 2) * 1.2, 0.8 - r * 2.2, 0.4, 0.6, 1.2, P.tip, 0, sx * 0.1, 0); }
  // the neck reaches forward, the head thrust ahead of the body
  K.box(T, 0, 4.6, 6, 3.2, 3, 2.6, P.main, -0.4);
  rig.neck.position.set(0, 4.4 * PX, 7 * PX);
  K.box(Hd, 0, 1.4, 0.6, 3.4, 3, 4.2, P.main); K.box(Hd, 0, 2.9, 0.2, 2.6, 0.6, 3.6, P.light);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.75, 1.9, 1.5, 0.3, 1, 1.6, P.eye); K.box(Hd, sx * 1.85, 1.9, 1.7, 0.2, 0.5, 0.6, 0x1a0800); K.box(Hd, sx * 1.6, 2.6, 1.4, 0.5, 0.5, 2.4, P.dark, 0, 0, sx * 0.2); }
  for (let i = 0; i < 4; i++) K.box(Hd, (i - 1.5) * 0.7, 2.9, -1.6 - i * 0.3, 0.5, 0.5, 3, K.tone([P.edge, P.tip], 0.1), 0.25, (i - 1.5) * 0.12, 0);   // swept-back crest blades
  // the long sharp bronze beak, darker at its hooked point
  K.box(Hd, 0, 1.5, 3.4, 2.2, 1.8, 2, P.beak); K.box(Hd, 0, 1.4, 5.2, 1.5, 1.3, 2, P.beak); K.box(Hd, 0, 1.25, 6.8, 0.9, 0.9, 1.6, P.beakD); K.box(Hd, 0, 0.8, 7.6, 0.5, 0.9, 0.5, P.beakD);
  K.box(Hd, 0, 0.5, 4.4, 1.3, 0.5, 3.4, P.beakD);
  // a long tail of blades, flat and slightly spread
  for (let i = -2; i <= 2; i++) { K.box(T, i * 0.9, 3.6, -9.6, 0.9, 0.4, 8.6 - Math.abs(i) * 0.8, K.tone(BR, 0.08), 0.08, i * 0.1, 0); K.box(T, i * 0.9 + i * 0.1 * -4.6, 3.6 - 0.4, -13.8 + Math.abs(i) * 0.4, 0.8, 0.45, 1.2, P.tip, 0.08, i * 0.1, 0); }
  // short legs tucked under: dark feathered thighs, steel shanks, gripping toes and talons
  for (const leg of [rig.legR, rig.legL]) {
    K.box(leg, 0, -0.6, 0.6, 2, 2.2, 2.4, P.dark);
    K.box(leg, 0, -3, 1, 1, 2.8, 1, P.steel);
    for (const dx of [-0.8, 0, 0.8]) { K.box(leg, dx, -4.6, 2, 0.7, 0.7, 2, P.beak, 0, dx * 0.3, 0); K.box(leg, dx * 1.2, -4.8, 3.1, 0.5, 0.8, 0.8, P.talon, 0.5, 0, 0); }
    K.box(leg, 0, -4.6, 0.1, 0.6, 0.7, 1.4, P.beak);
  }
  // long narrow falcon wings of bronze blades
  const W = addWings(rig, { span: 26, chord: 8, kind: 'feather', y: 5, flap: 1.4, seed: 61, cols: { main: P.main, tip: P.tip, edge: P.edge, dark: P.dark }, look: mat });
  for (const w of W) w.root.position.set(w.side * 2.4 * PX, 5.2 * PX, 1.4 * PX);
  K.done();
  rig.wingStroke = { base: 0.22, amp: 0.4, hand: 0.35, down: 0.42 };
  rig.float = 1.2;
  rig.dims.headS = 2.6;   // the small low head (a champion's crown sits on it, not a hand above it)
  return rig;
}
