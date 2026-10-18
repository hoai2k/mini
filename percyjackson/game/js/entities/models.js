// Appearance of every hero: procedurally painted 64x64 skins (Camp
// Half-Blood T-shirts, jeans, goat legs, a Cyclops eye), hair strands and
// caps, and signature props (Riptide, Annabeth's dagger, Grover's reed
// pipes, Tyson's watch shield, Clarisse's electric spear and boar shield),
// built on the shared Rig.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX } from './character.js';
import { hashStr, mulberry32 } from '../util.js';
import { heroHair, heroTail, cellMesh, partMaterial, partsMesh, footwear, band, beads, tatters, sleeveTatters } from './herovox.js';

export const CAMP_ORANGE = 0xf28c28;
const INK = 0x17130f;

// Skin layout (Minecraft-style): head (0,0) with hat layer (32,0); torso
// (16,16) with jacket layer (16,32); right arm (40,16)/(40,32); left arm
// (32,48)/(48,48); right leg (0,16); left leg (16,48). Each box's four side
// faces sit in one strip starting at (u, v + depth).
const ARMS = [[40, 16], [32, 48]], ARM_OVER = [[40, 32], [48, 48]];
const LEGS = [[0, 16], [16, 48]];

export function paintHumanoid(S, o) {
  const skin = o.skinTone ?? 0xf0c8a8;
  // ---- head
  S.box(0, 0, 8, 8, 8, skin, 0.05);
  S.rect(8, 0, 8, 8, o.hair, 0.18);                          // top
  S.rect(24, 8, 8, o.hairBack ?? 6, o.hair, 0.18);           // back
  S.rect(0, 8, 8, o.hairSide ?? 3, o.hair, 0.18);            // right side
  S.rect(16, 8, 8, o.hairSide ?? 3, o.hair, 0.18);           // left side
  S.rect(8, 8, 8, o.fringe ?? 2, o.hair, 0.18);              // fringe
  if (o.messy) { for (const x of [8, 10, 13, 15]) S.px(x, 8 + (o.fringe ?? 2), o.hair); }
  if (o.sideburn) { S.rect(8, 8 + (o.fringe ?? 2), 1, 3, o.hair, 0.1); S.rect(15, 8 + (o.fringe ?? 2), 1, 3, o.hair, 0.1); }
  const ey = 8 + (o.eyeRow ?? 4);
  const brow = o.brow ?? o.hair;
  if (o.cyclops) {
    // one big central eye under a single heavy brow
    S.rect(9, ey - 3, 6, 1, brow, 0.1);
    S.rect(10, ey - 2, 4, 1, 0x1a100c, 0.03);
    S.rect(10, ey - 1, 4, 2, o.eyeWhite ?? 0xffffff, 0.02);
    S.px(11, ey - 1, o.eye ?? 0x8a4a1a); S.px(12, ey - 1, shadeOf(o.eye ?? 0x8a4a1a, 1.25)); S.px(11, ey, 0x140c08); S.px(12, ey, o.eye ?? 0x8a4a1a);
    S.rect(11, ey + 1, 2, 1, shadeOf(skin, 0.86), 0.05);
    // a big open grin: dark mouth, a row of teeth, a red tongue
    S.rect(9, ey + 2, 6, 2, 0x3a1410, 0.03); S.rect(10, ey + 2, 4, 1, 0xf8f2e8, 0.02); S.rect(11, ey + 3, 2, 1, 0x9a2a20, 0.05);
  } else {
    // eyes two pixels tall: white + iris on top, iris + dark pupil below,
    // under a dark lash line and a heavy brow (as on the sheet close-ups)
    const iris = o.eye ?? 0x3a2a1a, pupil = o.pupil ?? 0x101014, lash = o.lash ?? 0x16100c;
    S.px(9, ey, o.eyeWhite ?? 0xffffff); S.px(10, ey, iris); S.px(9, ey + 1, o.eyeWhite ?? 0xf4f0ec); S.px(10, ey + 1, pupil);
    S.px(13, ey, iris); S.px(14, ey, o.eyeWhite ?? 0xffffff); S.px(13, ey + 1, pupil); S.px(14, ey + 1, o.eyeWhite ?? 0xf4f0ec);
    S.rect(9, ey - 1, 2, 1, lash, 0.04); S.rect(13, ey - 1, 2, 1, lash, 0.04);
    if (o.lashes) { S.px(8, ey, lash); S.px(15, ey, lash); }
    const bh = o.browRow ?? ey - 2;
    if (o.scowl) { S.px(8, bh, brow); S.px(9, bh, brow); S.px(10, bh + 1, brow); S.px(13, bh + 1, brow); S.px(14, bh, brow); S.px(15, bh, brow); }
    else { S.rect(8, bh, 3, 1, brow, 0.05); S.rect(13, bh, 3, 1, brow, 0.05); }
    S.px(11, ey + 2, shadeOf(skin, 0.86)); S.px(12, ey + 2, shadeOf(skin, 0.92));   // nose
    const lip = o.lip ?? 0x9a4a3a, teeth = 0xf8f2e8, dark = 0x4a1a14;
    switch (o.mouth ?? (o.smile ? 'smile' : 'small')) {
      case 'smirk': S.px(10, ey + 3, lip); S.px(11, ey + 3, teeth); S.px(12, ey + 3, teeth); S.px(13, ey + 2, lip); break;
      case 'grin': S.rect(10, ey + 3, 4, 1, teeth, 0.02); S.px(9, ey + 2, lip); S.px(14, ey + 2, lip); break;
      case 'smile': S.px(10, ey + 3, lip); S.px(11, ey + 3, shadeOf(lip, 1.2)); S.px(12, ey + 3, shadeOf(lip, 1.2)); S.px(13, ey + 3, lip); S.px(9, ey + 2, shadeOf(skin, 0.85)); S.px(14, ey + 2, shadeOf(skin, 0.85)); break;
      case 'frown': S.px(10, ey + 3, lip); S.px(11, ey + 3, lip); S.px(12, ey + 3, lip); S.px(13, ey + 3, lip); break;
      default: S.px(11, ey + 3, lip); S.px(12, ey + 3, lip);
    }
    if (o.cheeks) { S.px(8, ey + 2, o.cheeks); S.px(15, ey + 2, o.cheeks); }
  }
  if (o.blush) { S.px(9, ey + 1, 0xe8a0a0); S.px(14, ey + 1, 0xe8a0a0); }
  if (o.goatee) { S.px(11, ey + 3, o.goatee); S.px(12, ey + 3, o.goatee); S.px(11, 15, o.goatee); S.px(12, 15, o.goatee); }
  if (o.freckles) { S.px(9, ey + 2, o.freckles); S.px(14, ey + 2, o.freckles); }
  // hat layer: hair volume (transparent except painted cells)
  if (o.hairVolume) {
    S.rect(40, 0, 8, 8, o.hair, 0.2);
    S.rect(40, 8, 8, o.fringe ?? 2, o.hair, 0.2);
    S.rect(32, 8, 8, o.hairSide ?? 4, o.hair, 0.2); S.rect(48, 8, 8, o.hairSide ?? 4, o.hair, 0.2);
    S.rect(56, 8, 8, o.hairBack ?? 6, o.hair, 0.2);
    if (o.long) { S.rect(32, 8, 8, o.long, o.hair, 0.2); S.rect(48, 8, 8, o.long, o.hair, 0.2); S.rect(56, 8, 8, o.long, o.hair, 0.2); }
    if (o.curls) for (let i = 0; i < 14; i++) S.px(32 + Math.floor(S.r() * 32), 8 + (o.hairSide ?? 4) + Math.floor(S.r() * 2), o.curls);
  }
  // ---- torso: T-shirt / shirt
  S.box(16, 16, 8, 12, 4, o.top, 0.08);
  if (o.plaid) {
    const [a, b] = o.plaid;
    for (let y = 16; y < 32; y++) for (let x = 16; x < 40; x++) if (x % 3 === 0 || y % 3 === 0) S.px(x, y, (x % 3 === 0 && y % 3 === 0) ? b : a);
    S.rect(23, 20, 2, 12, b, 0.05);
    for (let y = 22; y < 32; y += 3) S.px(24, y, 0xd8c8a8);
  }
  if (o.hem) S.rect(16, 31, 24, 1, o.hem, 0.06);
  if (o.collar !== false) { S.rect(22, 20, 4, 1, o.collar ?? skin, 0.04); S.px(21, 20, shadeOf(o.top, 0.8)); S.px(26, 20, shadeOf(o.top, 0.8)); }   // crew neck
  if (o.pegasus && S.res === 1) {
    // small black pegasus mark on the chest (front face 20..27 × 20..31)
    // a winged horse, 8 × 7: wings up behind, head to the right, tail and legs below
    const c = o.pegasus;
    ['#.......', '##...##.', '.##.####', '..####..', '.#####..', '#.#..#..', '..#...#.'].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') S.px(20 + x, 22 + y, c); }));
  }
  if (o.beads) { for (let x = 21; x < 27; x++) S.px(x, 21, [0x8a2a1a, 0xe8e0c8, 0x2a5a8a, 0xe8e0c8][x % 4]); }
  if (o.belt) { S.rect(16, 30, 24, 2, o.belt, 0.1); S.px(23, 30, 0xc9963a); S.px(24, 30, 0xc9963a); }
  // jacket layer (open front so the camp shirt shows)
  if (o.jacket) {
    const j = o.jacket;
    S.rect(16, 36, 4, 12, j, 0.15); S.rect(28, 36, 4, 12, j, 0.15); S.rect(32, 36, 8, 12, j, 0.15);
    S.rect(20, 36, 2, 12, j, 0.15); S.rect(26, 36, 2, 12, j, 0.15); S.rect(20, 32, 8, 4, j, 0.15);
    if (o.jacketPlaid) {
      const [a, b] = o.jacketPlaid;
      for (let y = 32; y < 48; y++) for (let x = 16; x < 40; x++) { if (x >= 22 && x < 26 && y >= 36) continue; if (x % 3 === 0 || y % 3 === 0) S.px(x, y, (x % 3 === 0 && y % 3 === 0) ? b : a); }
      for (const [u, v] of ARM_OVER) for (let y = v + 4; y < v + 4 + (o.jacketSleeve ?? 9); y++) for (let x = u; x < u + 16; x++) if (x % 3 === 0 || y % 3 === 0) S.px(x, y, a);
    }
    if (o.studs) for (const [x, y] of [[21, 38], [21, 41], [26, 38], [26, 41], [21, 44], [26, 44]]) S.px(x, y, o.studs);
    if (o.camo) for (let i = 0; i < 70; i++) { const x = 16 + Math.floor(S.r() * 24), y = 36 + Math.floor(S.r() * 12); if (x >= 22 && x < 26) continue; S.rect(x, y, 2, 1, o.camo[i % o.camo.length], 0.1); }
    for (const [u, v] of ARM_OVER) {
      S.rect(u, v + 4, 16, o.jacketSleeve ?? 9, j, 0.15);
      if (o.camo) for (let i = 0; i < 18; i++) S.px(u + Math.floor(S.r() * 16), v + 4 + Math.floor(S.r() * (o.jacketSleeve ?? 9)), o.camo[i % o.camo.length]);
    }
  }
  // ---- arms: sleeves, skin, hands
  for (const [u, v] of ARMS) {
    S.box(u, v, 4, 12, 4, o.sleeve ?? o.top, 0.08);
    if (o.plaid) for (let y = v + 4; y < v + 16; y++) for (let x = u; x < u + 16; x++) if (x % 3 === 0 || y % 3 === 0) S.px(x, y, o.plaid[0]);
    const sl = o.shortSleeve ?? 12;
    if (sl < 12) { S.rect(u, v + 4 + sl - 1, 16, 1, shadeOf(o.sleeve ?? o.top, 0.82), 0.05); S.rect(u, v + 4 + sl, 16, 12 - sl, skin, 0.05); }
    S.rect(u, v + 4 + 9, 16, 3, skin, 0.04); S.rect(u + 8, v, 4, 4, skin, 0.04);
    if (o.wrist) S.rect(u, v + 4 + 8, 16, 1, o.wrist, 0.05);
  }
  // ---- legs: jeans / shorts / goat legs, then shoes or hooves
  for (const [u, v] of LEGS) {
    S.box(u, v, 4, 12, 4, o.pants, 0.12);
    if (o.legCamo) for (let i = 0; i < 26; i++) S.rect(u + Math.floor(S.r() * 16), v + 4 + Math.floor(S.r() * (o.shorts ?? 12)), 2, 1, o.legCamo[i % o.legCamo.length], 0.1);
    if (o.cargo) { S.rect(u, v + 4 + 2, 3, 2, shadeOf(o.pants, 0.82), 0.05); S.rect(u + 8, v + 4 + 2, 4, 1, shadeOf(o.pants, 0.82), 0.05); }
    if (o.shorts) { S.rect(u, v + 4 + o.shorts - 1, 16, 1, shadeOf(o.pants, 0.8), 0.05); S.rect(u, v + 4 + o.shorts, 16, 12 - o.shorts, o.legSkin ?? skin, 0.06); S.rect(u, v + 4 + o.shorts, 16, 1, shadeOf(o.legSkin ?? skin, 0.86), 0.04); }
    if (o.goat) {
      for (let y = v + 4 + (o.shorts ?? 4); y < v + 16; y++) for (let x = u; x < u + 16; x++) S.px(x, y, S.r() < 0.35 ? o.goat[1] : o.goat[0]);
      S.rect(u, v + 4 + 10, 16, 2, 0x2a1e18, 0.1); S.rect(u + 8, v, 4, 4, 0x2a1e18, 0.1);
      for (let x = u + 5; x < u + 16; x += 4) S.px(x, v + 4 + 11, 0x120c08);   // split hoof
      continue;
    }
    if (o.torn) { S.rect(u + 5, v + 4 + 5, 2, 1, o.legSkin ?? skin, 0.05); S.rect(u + 4, v + 4 + 6, 4, 1, 0xd8d0c0, 0.05); }
    if (o.socks) S.rect(u, v + 4 + 9, 16, 1, o.socks, 0.05);
    if (o.cuff) S.rect(u, v + 4 + 9, 16, 1, o.cuff, 0.05);
    S.rect(u, v + 4 + 10, 16, 2, o.shoes ?? 0x1a1a1a, 0.05); S.rect(u + 8, v, 4, 4, o.shoes ?? 0x1a1a1a, 0.05);
    if (o.sole) { S.rect(u, v + 4 + 11, 16, 1, o.sole, 0.03); S.px(u + 5, v + 4 + 10, o.sole); S.px(u + 6, v + 4 + 10, o.sole); }
  }
  if (S.res > 1) detailHumanoid(S, o);
  if (o.shade !== false) { S.shadeLimbs(); S.saturate(1.2); }
}

// Detail at half-pixel resolution (skins painted with res 2): eyes with
// lids, irises, pupils and a catch-light, shaped brows and mouths, a nose
// shadow, a crisp pegasus, seams, stitching, pockets, knuckles and buckles.
const PEGASUS = [
  '##............',
  '.##.......##..',
  '..###....####.',
  '...###..##.###',
  '....#######...',
  '...########...',
  '..#########...',
  '.#..######....',
  '#...#....#....',
  '....#....##...',
  '...##.....#...',
];
function detailHumanoid(S, o) {
  const d = 0.5, D = (x, y, c, n = 1, m = n) => S.dot(x, y, c, n, m);
  const skin = o.skinTone ?? 0xf0c8a8, ey = 8 + (o.eyeRow ?? 4), brow = o.brow ?? o.hair;
  // ---- face (front face: x 8..16, y 8..16)
  D(8, 8, shadeOf(skin, 0.93), 1, 16); D(15.5, 8, shadeOf(skin, 0.93), 1, 16);        // cheek sides
  D(8, 15.5, shadeOf(skin, 0.9), 16, 1);                                                // jaw
  D(8, 8 + (o.fringe ?? 2), shadeOf(skin, 0.78), 16, 1);                                // hairline shadow
  S.rect(8, ey - (o.cyclops ? 3 : 2), 8, o.cyclops ? 7 : 6, skin, 0.05);                 // clear the coarse features
  if (o.cyclops) {
    const iris = o.eye ?? 0x8a4a1a;
    D(9.5, ey - 3, brow, 10, 2); D(9, ey - 2.5, brow, 2, 1); D(14, ey - 2.5, brow, 2, 1);   // heavy brow
    D(10, ey - 2, 0x1a100c, 8, 1);                                                          // lid
    D(10, ey - 1.5, 0xfaf6f0, 8, 3); D(10, ey - 0.5 + d, shadeOf(skin, 0.85), 8, 1);
    D(11, ey - 1.5, iris, 4, 3); D(11.5, ey - 1, 0x120a06, 2, 2); D(11, ey - 1.5, 0xffffff, 1, 1);   // iris, pupil, light
    D(10.5, ey + 1, shadeOf(skin, 0.82), 6, 1); D(11, ey + 1.5, shadeOf(skin, 0.75), 1, 1); D(12.5, ey + 1.5, shadeOf(skin, 0.75), 1, 1);
    D(9.5, ey + 2, 0x3a1410, 10, 3); D(10, ey + 2, 0xfaf4ea, 8, 1); D(10.5, ey + 3, 0xa82a22, 6, 1);   // open grin, teeth, tongue
    D(9, ey + 2, shadeOf(skin, 0.8), 1, 2); D(14.5, ey + 2, shadeOf(skin, 0.8), 1, 2);
  } else {
    const iris = o.eye ?? 0x3a2a1a, pupil = o.pupil ?? 0x101014, lash = o.lash ?? 0x16100c, white = o.eyeWhite ?? 0xfaf6f0;
    for (const [x0, s] of [[9, 1], [13, -1]]) {
      const wx = s > 0 ? x0 : x0 + 1, ix = s > 0 ? x0 + 1 : x0;     // white on the outside, iris inside
      D(x0 - (s > 0 ? d : 0), ey, lash, 5, 1);                       // upper lid
      D(wx, ey + d, white, 2, 3); D(ix, ey + d, iris, 2, 3);
      D(ix + (s > 0 ? d : 0), ey + 1, pupil, 1, 2);
      D(ix + (s > 0 ? 0 : d), ey + d, 0xffffff, 1, 1);                // catch-light
      D(x0, ey + 2, shadeOf(skin, 0.88), 4, 1);                       // lower lid
      if (o.lashes) { D(s > 0 ? x0 - 1 : x0 + 2, ey - d, lash, 1, 1); D(s > 0 ? x0 - d : x0 + 2, ey, lash, 1, 1); }
    }
    // brows: thick, inner ends drawn down for a scowl, up for a cheerful face
    const by = ey - 1.5;
    if (o.scowl) { D(8.5, by - d, brow, 3, 1); D(10, by, brow, 2, 2); D(13, by, brow, 2, 2); D(14, by - d, brow, 3, 1); }
    else if (o.lashes) { D(8.5, by + d, brow, 5, 1); D(13, by + d, brow, 5, 1); D(9, by, brow, 3, 1); D(13.5, by, brow, 3, 1); }
    else { D(8.5, by, brow, 5, 2); D(13, by, brow, 5, 2); if (o.mouth === 'smile' || o.smile) { D(8.5, by - d, brow, 1, 1); D(15, by - d, brow, 1, 1); } }
    D(11.5, ey + 2.5, shadeOf(skin, 0.82), 2, 1); D(11, ey + 2, shadeOf(skin, 0.9), 1, 1);   // nose shadow
    const lip = o.lip ?? 0x9a4a3a, dark = 0x4a1812, teeth = 0xfaf4ea;
    const my = ey + 3.5;
    switch (o.mouth ?? (o.smile ? 'smile' : 'small')) {
      case 'smirk': D(10.5, my, dark, 5, 1); D(11, my - d, teeth, 3, 1); D(13, my - d, dark, 1, 1); D(13.5, my - 1, dark, 1, 1); break;
      case 'grin': D(10, my - d, dark, 8, 2); D(10.5, my - d, teeth, 6, 1); break;
      case 'smile': D(10, my - d, dark, 1, 1); D(10.5, my, dark, 6, 1); D(13.5, my - d, dark, 1, 1); D(11, my + d, lip, 4, 1); break;
      case 'frown': D(10.5, my, dark, 6, 1); D(10, my + d, dark, 1, 1); D(13.5, my + d, dark, 1, 1); break;
      default: D(11, my, shadeOf(lip, 0.8), 4, 1); D(11.5, my + d, lip, 2, 1);
    }
  }
  if (o.freckles) for (const [x, y] of [[9, 2.5], [10, 3], [9.5, 3], [14, 2.5], [13.5, 3], [14.5, 3], [11, 2.5], [12.5, 2.5]]) D(x, ey + y, o.freckles, 1, 1);
  if (o.goatee) { D(11, ey + 4, o.goatee, 4, 2); D(11.5, 15, o.goatee, 2, 2); D(10, ey + 3, o.goatee, 1, 1); D(13.5, ey + 3, o.goatee, 1, 1); }
  if (o.blush) { D(9, ey + 2.5, 0xe08878, 2, 1); D(14, ey + 2.5, 0xe08878, 2, 1); }
  if (o.cheeks) { D(8.5, ey + 2.5, o.cheeks, 2, 1); D(14.5, ey + 2.5, o.cheeks, 2, 1); }
  // ---- torso
  const top = o.top;
  D(16, 20, shadeOf(top, 0.85), 1, 24); D(27.5, 20, shadeOf(top, 0.85), 1, 24); D(19.5, 20, shadeOf(top, 0.85), 1, 24); D(28, 20, shadeOf(top, 0.85), 1, 24);   // side seams
  if (o.collar !== false) { D(21.5, 20, shadeOf(o.collar ?? top, 0.75), 10, 1); D(22, 20.5, shadeOf(o.collar ?? top, 0.9), 8, 1); D(22.5, 21, shadeOf(top, 0.85), 6, 1); }
  if (o.pegasus) {
    PEGASUS.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') D(20.5 + x * d, 22 + y * d, o.pegasus); }));
  }
  if (o.hem) D(16, 31.5, shadeOf(o.hem, 0.85), 48, 1);
  if (o.belt) { D(16, 30, shadeOf(o.belt, 1.25), 48, 1); D(22.5, 30, 0xd8a840, 6, 4); D(23, 30.5, shadeOf(o.belt, 0.8), 4, 2); }
  if (o.beads) for (let i = 0; i < 12; i++) D(21 + i * d, 21 + (Math.abs(i - 5.5) < 3 ? d : 0), [0x8a2a1a, 0xf0e8d0, 0x2a5a8a, 0xf0e8d0][i % 4], 1, 1);
  // jacket edges and stitching
  if (o.jacket) {
    const j = shadeOf(o.jacket, 0.7);
    D(21.5, 36, j, 1, 24); D(26, 36, j, 1, 24);                                          // front edges
    D(20, 36, shadeOf(o.jacket, 1.2), 1, 24); D(27.5, 36, shadeOf(o.jacket, 1.2), 1, 24);  // lapel light
    if (o.studs) for (const [x, y] of [[20.5, 37], [27, 37], [20.5, 39.5], [27, 39.5]]) D(x, y, o.studs, 1, 1);
  }
  // ---- arms: sleeve hem fold, knuckles on the fists
  for (const [u, v] of ARMS) {
    const sl = o.shortSleeve ?? 12;
    if (sl < 12) D(u, v + 4 + sl - d, shadeOf(o.sleeve ?? top, 1.15), 32, 1);
    D(u, v + 13, shadeOf(skin, 0.9), 32, 1);                                               // wrist crease
    for (const fx of [0.5, 1.5, 2.5]) D(u + 4 + fx, v + 14.5, shadeOf(skin, 0.78), 1, 3);   // fingers on the front
    D(u + 4, v + 15.5, shadeOf(skin, 0.82), 8, 1);
  }
  // ---- legs: stitching, pockets, knee creases, worn denim
  for (const [u, v] of LEGS) {
    if (o.goat) continue;
    const p = o.pants, end = o.shorts ? v + 4 + o.shorts : v + 14;
    D(u + 2, v + 4, shadeOf(p, 1.3), 1, (end - v - 4) * 2);                              // outer seam stitch
    D(u + 13.5, v + 4, shadeOf(p, 0.75), 1, (end - v - 4) * 2);                          // inner seam
    if (!o.shorts) {
      for (let i = 0; i < 18; i++) D(u + 4 + S.r() * 3.5, v + 9 + S.r() * 3, shadeOf(p, 1.25), 1, 1);   // faded knees
      D(u + 4, v + 10.5, shadeOf(p, 0.8), 6, 1); D(u + 4.5, v + 11, shadeOf(p, 0.85), 4, 1);           // knee crease
    }
    D(u + 12.5, v + 4.5, shadeOf(p, 0.7), 4, 4); D(u + 12.5, v + 4.5, shadeOf(p, 1.2), 4, 1);           // back pocket
    if (o.cargo) { D(u + 0.5, v + 6, shadeOf(p, 0.72), 5, 4); D(u + 0.5, v + 6, shadeOf(p, 1.15), 5, 1); }
  }
}

const shadeOf = (c, k) => { const x = new THREE.Color(c).multiplyScalar(k); return x.getHex(); };
const mat = (c, o = {}) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1 });
const BRONZE = () => mat(0xc9963a, { rough: 0.3, metal: 0.85, emissive: 0x5a3a08, ei: 0.6 });
const H = PX * 1.12;   // one head-skin pixel in head space

// Box helper for props (sizes/positions in skin pixels).
function bx(parent, w, h, d, x, y, z, m, unit = PX) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * unit, h * unit, d * unit), m);
  mesh.position.set(x * unit, y * unit, z * unit); mesh.castShadow = true; parent.add(mesh); return mesh;
}
// Baseball cap on the head (crown + brim pointing forward).
function cap(rig, color) {
  const m = mat(color, { rough: 0.85 }), dark = mat(new THREE.Color(color).multiplyScalar(0.7).getHex(), { rough: 0.85 });
  const g = new THREE.Group();
  bx(g, 10.2, 2.4, 10, 0, 9.2, -0.3, m, H);                  // crown, domed in three tiers
  bx(g, 9, 1.2, 8.8, 0, 11, -0.4, m, H);
  bx(g, 6.8, 0.8, 6.6, 0, 11.9, -0.5, m, H);
  bx(g, 0.9, 0.5, 0.9, 0, 12.4, -0.5, dark, H);               // button
  bx(g, 9, 0.7, 4.8, 0, 8.3, 6.9, dark, H);                   // brim
  bx(g, 10.3, 0.6, 10.1, 0, 8.1, -0.3, dark, H);              // band
  rig.head.add(g); return g;
}

// Riptide: celestial-bronze sword with a leaf-shaped blade, along +z of the hand.
export function buildRiptide() {
  const g = new THREE.Group();
  const bronze = BRONZE(), grip = mat(0x2a2a30, { rough: 0.6 }), gold = mat(0xe8c060, { rough: 0.3, metal: 0.9 });
  bx(g, 1.4, 1.4, 1.4, 0, 0, -3.4, gold);                // pommel
  bx(g, 1.1, 1.1, 4, 0, 0, -0.8, grip);                  // grip
  bx(g, 5.4, 1.2, 1.2, 0, 0, 1.6, gold);                 // crossguard
  // leaf blade: narrow at the guard, widest two-thirds up, tapering to a point
  [[1.4, 3, 3.6], [2.0, 3, 6.6], [2.5, 3.2, 9.6], [2.7, 3, 12.6], [2.2, 2.4, 15.3], [1.4, 2, 17.5], [0.6, 1.6, 19.2]]
    .forEach(([w, l, z]) => bx(g, w, 0.45, l, 0, 0, z, bronze));
  bx(g, 0.3, 0.55, 15, 0, 0, 10, gold);                  // fuller line
  g.position.set(0, -1 * PX, 1 * PX);
  return g;
}
function buildDagger() {
  const g = new THREE.Group();
  const bronze = BRONZE(), grip = mat(0x3a2a1a, { rough: 0.8 });
  bx(g, 1.1, 1.1, 3.2, 0, 0, -0.6, grip); bx(g, 3.4, 1, 1, 0, 0, 1.4, bronze);
  [[1.5, 3, 3.4], [1.2, 2.4, 6], [0.5, 1.6, 7.8]].forEach(([w, l, z]) => bx(g, w, 0.4, l, 0, 0, z, bronze));
  g.position.set(0, -1 * PX, 0.8 * PX);
  return g;
}
function buildPipes() {
  const g = new THREE.Group();
  const reed = mat(0xd8b860, { rough: 0.5 }), band = mat(0x6a3a1a);
  for (let i = 0; i < 6; i++) bx(g, 0.9, 7 - i * 0.8, 0.9, -2.5 + i, -(7 - i * 0.8) / 2 + 2, 0, reed);
  bx(g, 6.4, 0.8, 1.2, 0, 1, 0, band);
  g.position.set(0, -1.5 * PX, 1.6 * PX); g.rotation.y = 0.3;
  return g;
}
function buildSpear() {
  const g = new THREE.Group();
  const shaft = mat(0x2a2420, { rough: 0.6 }), bronze = BRONZE(), volt = mat(0xffe24a, { emissive: 0xffd84a, ei: 3 });
  bx(g, 0.9, 0.9, 40, 0, 0, 6, shaft);
  bx(g, 1.3, 1.3, 1.2, 0, 0, 25.5, bronze);
  [[2.2, 3, 27.5], [1.6, 2.4, 30], [0.7, 2, 32]].forEach(([w, l, z]) => bx(g, w, 0.6, l, 0, 0, z, bronze));
  // lightning zig-zag along the tip
  bx(g, 0.35, 0.35, 2.4, 0.6, 0.5, 28, volt).rotation.y = 0.5; bx(g, 0.35, 0.35, 2.4, -0.4, 0.5, 30.2, volt).rotation.y = -0.5;
  bx(g, 1.2, 1.2, 1.2, 0, 0, -14.5, bronze);
  g.position.set(0, -1 * PX, 0);
  g.userData.tip = new THREE.Vector3(0, -1 * PX, 32 * PX);
  return g;
}
function buildBoarShield() {
  const g = new THREE.Group();
  const wood = mat(0x6a3a22, { rough: 0.8 }), bronze = BRONZE(), dark = mat(0x2a1a14), tusk = mat(0xf0e8d0);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(7 * PX, 7 * PX, 1 * PX, 12), wood); disc.rotation.z = Math.PI / 2; disc.castShadow = true; g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(7 * PX, 0.7 * PX, 4, 12), bronze); rim.rotation.y = Math.PI / 2; g.add(rim);
  // boar head emblem
  bx(g, 0.6, 4, 5, -0.7, 0, 0, dark); bx(g, 0.6, 2, 2, -1, -1, 0, mat(0x8a5a4a));
  bx(g, 0.5, 2, 0.6, -1.1, -1.5, 1.6, tusk); bx(g, 0.5, 2, 0.6, -1.1, -1.5, -1.6, tusk);
  bx(g, 0.6, 1.4, 1, -0.9, 2.2, 2.2, dark); bx(g, 0.6, 1.4, 1, -0.9, 2.2, -2.2, dark);
  g.position.set(-1.6 * PX, -4 * PX, 0);
  return g;
}
function buildWatchShield() {
  const g = new THREE.Group();
  const bronze = BRONZE(), dark = mat(0x5a3a18, { rough: 0.4, metal: 0.8 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(11 * PX, 11 * PX, 1.2 * PX, 16), bronze); disc.rotation.x = Math.PI / 2; disc.castShadow = true; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8 * PX, 0.6 * PX, 4, 16), dark); g.add(ring);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * PX, 2.4 * PX, 2 * PX, 10), dark); boss.rotation.x = Math.PI / 2; g.add(boss);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; bx(g, 0.8, 3, 0.8, Math.cos(a) * 5, Math.sin(a) * 5, 0.6, dark).rotation.z = a + Math.PI / 2; }
  g.position.set(0, -2 * PX, 5 * PX);
  return g;
}
// Little white wings for Maia! (hidden until used).
function wings(parent, y) {
  const g = new THREE.Group(); const w = mat(0xffffff, { emissive: 0xffffff, ei: 0.4 });
  for (const s of [-1, 1]) { const f = new THREE.Group(); f.position.set(s * 2.2 * PX, y * PX, -1 * PX); bx(f, 4, 2.4, 0.4, s * 2, 1, 0, w); bx(f, 2.6, 1.6, 0.4, s * 2.6, 2.4, 0, w); f.userData.side = s; g.add(f); }
  g.visible = false; parent.add(g); return g;
}

const ORANGE = 0xd84a04, ORANGE_HEM = 0x9a3604;
const TEE = { top: ORANGE, shortSleeve: 4, pegasus: INK, collar: 0xb03e04, hem: ORANGE_HEM };
const JEANS = { pants: 0x263e6a, shoes: 0x1c1a20, sole: 0xf0ece0 };
const BEADS = [0x6a3a1e, 0xf0ead8, 0x6a3a1e, 0xf0ead8, 0xb04a2a];

// Looks follow the 3D hero sheets (design/concept/vox-*.png): voxel hair is
// the main silhouette (herovox.js), outfits are painted on the skin, and
// shoes, cuffs, beads, buckles, caps, helmets and props are small block models.
// outfit: footwear ({ kind, upper, sole, lace, trim }), cuffs (jeans rolled
// over the shoes), socks, beads, buckle, wrist (bands), tatters (torn flannel).
export const HERO_LOOKS = {
  percy: {
    paint: { skinTone: 0xde9060, hair: 0x1e1612, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x1fa89a, pupil: 0x0a3a34, brow: 0x1a120e, mouth: 'smirk', ...TEE, ...JEANS },
    vox: { style: 'mop', base: 0x241a16, shade: 0x100c0a, light: 0x3e2e24, warm: 0x6a4222, seed: 11 },
    outfit: { footwear: { kind: 'hitop', upper: 0x1c1a20, sole: 0xf0ece0 }, cuffs: 0x4a6a9a },
    accent: 0x2fd0d8,
  },
  annabeth: {
    paint: { skinTone: 0xde8c5c, hair: 0xc87a08, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x4a5a78, pupil: 0x1a2030, brow: 0xa86a1a, lashes: true, lip: 0xc8705a, belt: 0x4a2a16, ...TEE, pants: 0x6a6440, shorts: 5, cargo: true, socks: 0xf0ece0, shoes: 0x1e2648, sole: 0xf0ece0 },
    vox: { style: 'curls', base: 0xe07800, shade: 0x9a4400, light: 0xf8a810, seed: 23, cap: true },
    tail: { base: 0xe07800, shade: 0x9a4400, light: 0xf8a810, length: 15, width: 3.8 },
    outfit: { footwear: { kind: 'hitop', upper: 0x1e2648, sole: 0xf0ece0 }, socks: 0xf4f0e8, beads: BEADS, buckle: 0xc9963a },
    accent: 0xe0b04a, cap: 0x1e2648,
  },
  grover: {
    paint: { skinTone: 0xd68454, hair: 0x6a3a1c, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x3a2414, brow: 0x4a2814, goatee: 0x5a3018, mouth: 'smile', ...TEE, pants: 0x6a6440, shorts: 5, goat: [0x6a4020, 0x4a2a14], belt: 0x4a2a16 },
    vox: { style: 'afro', base: 0x5a2a10, shade: 0x341606, light: 0x84461c, seed: 37 },
    outfit: { footwear: { kind: 'hoof', upper: 0x2a1c16, seed: 5 }, beads: [0x8a5a2a, 0xe8d8b0, 0x5a3a1a], buckle: 0x8a6a3a },
    accent: 0x5fae4a, horns: true,
  },
  tyson: {
    paint: { skinTone: 0xd8824e, hair: 0x6a3418, fringe: 1, hairSide: 5, hairBack: 8, cyclops: true, eye: 0x8a4a1a, brow: 0x4a2414, ...TEE, jacket: 0xb42a1c, jacketPlaid: [0x4a120c, 0x1a0c0a], jacketSleeve: 5, pants: 0x4a6a92, torn: true, shoes: 0x5a3418, sole: 0x3a2414 },
    vox: { style: 'shaggy', base: 0x5e2a12, shade: 0x361606, light: 0x864020, seed: 41, shape: { fringe: 7.6, jag: 0, front: 4.2 } },
    outfit: { footwear: { kind: 'boot', upper: 0x5a3418, sole: 0x3a2414, lace: 0xc9963a, trim: 0xb08850 }, cuffs: 0x8a9ab0, tatters: [0xa8322a, 0x5a1610, 0x7a2018] },
    accent: 0xff8a2a, scale: 1.75, wide: 1.35,
  },
  clarisse: {
    paint: { skinTone: 0xcc7c4a, hair: 0x5a2c14, fringe: 2, hairSide: 5, hairBack: 8, eye: 0x3a2414, brow: 0x2a1408, scowl: true, lashes: true, mouth: 'frown', lip: 0xa85040, ...TEE, jacket: 0x4e5a30, camo: [0x2e3a1a, 0x6e7040, 0x2a2a18, 0x8a7a4a], jacketSleeve: 6, belt: 0x2a2018, pants: 0x4e5430, legCamo: [0x2e3a1a, 0x6e7040, 0x2a2a18], cargo: true, shorts: 5, socks: 0x1a1a1a, shoes: 0x141414 },
    vox: { style: 'long', base: 0x6a3418, shade: 0x40200c, light: 0x8e4a22, seed: 53, helmet: true },
    tail: { base: 0x6a3418, shade: 0x40200c, light: 0x8e4a22, length: 13, width: 3.4 },
    outfit: { footwear: { kind: 'boot', upper: 0x1a1816, sole: 0x2a2622, lace: 0x5a5048 }, wrist: 0x1a1a1a, sleeveCuff: 0x3e4a26, buckle: 0x6a6a5a },
    accent: 0xffd84a, helmet: 0xc9963a, crest: 0xc8281e,
  },
  thalia: {
    paint: { skinTone: 0xe29e74, hair: 0x101014, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x2a6ae8, pupil: 0x0a1a4a, brow: 0x0e0e12, freckles: 0xc88a60, top: 0x24222a, sleeve: 0x24222a, collar: false, jacket: 0x18161c, jacketSleeve: 6, studs: 0xc0c0c8, pants: 0x1e1c24, torn: true, legSkin: 0xe29e74, belt: 0x3a2a1e, shoes: 0x101010, sole: 0x3a3a3a },
    vox: { style: 'spiky', base: 0x18161c, shade: 0x08080a, light: 0x34323e, warm: 0x4a3422, seed: 61 },
    outfit: { footwear: { kind: 'boot', upper: 0x16141a, sole: 0x4a4648, lace: 0x8a8a90 }, sleeveCuff: 0x101014, buckle: 0x9a9aa0, studs: 0xc8c8d0 },
    accent: 0x4a8aff,
  },
  nico: {
    paint: { skinTone: 0xdea27a, hair: 0x0e0e12, fringe: 3, hairSide: 4, hairBack: 7, eye: 0x1a1210, brow: 0x0e0c0c, top: 0x1c1a20, collar: false, jacket: 0x4a2c18, jacketSleeve: 10, pants: 0x2a282c, cargo: true, shoes: 0x16141a, sole: 0xe8dcc0 },
    vox: { style: 'messy', base: 0x18161c, shade: 0x0a0a0c, light: 0x34303c, warm: 0x3a2a3a, seed: 73 },
    outfit: { footwear: { kind: 'hitop', upper: 0x16141a, sole: 0xe8dcc0, lace: 0xe8dcc0 }, cuffs: 0x2a282c, sleeveCuff: 0xd8c8a8, sleeveY: -6.4 },
    accent: 0x8a5aff, fleece: 0xd8c8a8,
  },
};

// Bronze Greek helmet with a red horsehair crest (Clarisse; Annabeth in battle).
function helmet(rig, color, crest) {
  const g = new THREE.Group();
  const m = mat(color, { rough: 0.35, metal: 0.8, emissive: 0x3a2408, ei: 0.4 });
  const c = mat(crest, { rough: 0.9 });
  const dark = mat(new THREE.Color(color).multiplyScalar(0.7).getHex(), { rough: 0.4, metal: 0.8 }), c2 = mat(new THREE.Color(crest).multiplyScalar(0.7).getHex(), { rough: 0.9 });
  bx(g, 10, 3, 10, 0, 9, -0.2, m, H);                       // domed crown
  bx(g, 8.8, 1.2, 8.8, 0, 11, -0.3, m, H);
  bx(g, 6.6, 0.8, 6.6, 0, 11.9, -0.3, m, H);
  bx(g, 10.2, 0.7, 10.2, 0, 7.8, -0.2, dark, H);            // brow rim
  bx(g, 10, 4.4, 1.4, 0, 6.2, -4.8, m, H);                  // neck guard
  for (const sx of [-1, 1]) { bx(g, 1.3, 5.4, 5.6, sx * 4.8, 5.6, 1.4, m, H); bx(g, 1.4, 1, 5.8, sx * 4.85, 3.2, 1.4, dark, H); }   // cheek guards
  bx(g, 1.4, 3, 1.1, 0, 6.6, 4.8, m, H);                    // nose guard
  // a tall horsehair crest from brow to nape, darker in stripes
  for (let i = 0; i < 11; i++) { const a = i / 10 * Math.PI, hgt = 2.4 + Math.sin(a) * 3.2; bx(g, 1.8, hgt, 1.1, 0, 12 + hgt / 2 - 0.6 - (i < 2 || i > 9 ? 0.8 : 0), 4.2 - i * 1.05, i % 3 === 1 ? c2 : c, H); }
  rig.head.add(g); return g;
}
// Fleece collar on an aviator jacket (Nico).
function fleeceCollar(rig, color) {
  const g = new THREE.Group(), m = mat(color, { rough: 1 });
  const y = (rig.dims.bodyH - 1) * PX;
  bx(g, 8.6, 1.6, 1.2, 0, 0, -2.3, m).position.y = y;
  for (const sx of [-1, 1]) { const b = bx(g, 1.6, 1.8, 3.6, sx * 3.4, 0, 0.2, m); b.position.y = y - 0.2 * PX; b.rotation.z = sx * 0.2; }
  rig.torso.add(g); return g;
}

// Add grid-voxel hair (and a swinging ponytail of curls) to a rig.
function addHair(rig, look) {
  const hm = partMaterial();
  const hs = (rig.dims.headS / 8) * 1.12;
  const { cells, solid } = heroHair(look.vox);
  const mesh = cellMesh(cells, PX * hs, hm, solid);
  mesh.userData.baseMat = hm; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.hair = mesh;
  if (look.tail) {
    const piv = new THREE.Group(); piv.position.set(0, 7.6 * PX * hs, -4.2 * PX * hs);
    const tail = cellMesh(heroTail({ ...look.tail, seed: look.vox.seed + 1 }), PX * hs, hm);
    tail.userData.baseMat = hm; rig.meshes.push(tail); piv.add(tail); rig.head.add(piv);
    rig.strands.push({ g: piv, ax: 0, az: 0, vx: 0, vz: 0, stiff: 26, base: [0, 0] });
  }
}
// Shoes, cuffs, beads and the rest of the outfit's block detail.
function addOutfit(rig, o) {
  const m = partMaterial();
  const put = (parent, list) => { if (!list.length) return; const mesh = partsMesh(list, m); mesh.userData.baseMat = m; rig.meshes.push(mesh); parent.add(mesh); };
  for (const [i, leg] of [rig.legR, rig.legL].entries()) {
    const L = [];
    if (o.footwear) L.push(...footwear(o.footwear.kind, { ...o.footwear, seed: (o.footwear.seed ?? 1) + i }));
    if (o.cuffs) L.push(band(-7.1, 1.3, o.cuffs, 4.6));
    if (o.socks) L.push(band(-7.4, 1.2, o.socks, 4.3));
    put(leg, L);
  }
  for (const arm of [rig.armR, rig.armL]) {
    const L = [];
    if (o.wrist) L.push(band(-6.6, 1.5, o.wrist, 4.5));
    if (o.sleeveCuff) L.push(band(o.sleeveY ?? -3.3, 1.1, o.sleeveCuff, 4.7));
    if (o.tatters) L.push(...sleeveTatters(-2.6, o.tatters, arm === rig.armR ? 3 : 4, 2.35));
    put(arm, L);
  }
  const T = [];
  if (o.beads) T.push(...beads(o.beads));
  if (o.buckle) T.push({ at: [0, 1, 2.45], size: [1.6, 1.3, 0.4], col: new THREE.Color(o.buckle) });
  if (o.tatters) T.push(...tatters(0.3, 4.3, 2.3, o.tatters, 7, { gapX: 1.5 }));
  if (o.studs) for (const [x, y] of [[-1.9, 10.6], [1.9, 10.6], [-2.2, 8.4], [2.2, 8.4], [-3.4, 11.2], [3.4, 11.2]]) T.push({ at: [x, y, 2.45], size: [0.5, 0.5, 0.4], col: new THREE.Color(o.studs) });
  put(rig.torso, T);
}

export function buildHeroModel(id) {
  const look = HERO_LOOKS[id] ?? HERO_LOOKS.percy;
  const S = new Skin(hashStr(id), 2);
  paintHumanoid(S, look.paint);
  const map = S.texture();
  const material = makeCharMaterial(map, { emitStrength: 0 });
  material.alphaTest = 0.5;
  const rig = new Rig({ material, scale: look.scale ?? 1.18 });
  if (look.outfit) addOutfit(rig, look.outfit);
  // a broad build: widen the torso and set the arms and legs further apart
  if (look.wide) {
    const w = look.wide;
    for (const m of rig.torso.children) if (m.isMesh) m.scale.set(w, 1, 1 + (w - 1) * 0.6);
    rig.armR.position.x *= w; rig.armL.position.x *= w;
    rig.legR.position.x *= 1 + (w - 1) * 0.6; rig.legL.position.x *= 1 + (w - 1) * 0.6;
    for (const arm of [rig.armR, rig.armL]) for (const m of arm.children) if (m.isMesh) m.scale.set(1.15, 1, 1.15);
  }
  if (look.vox) addHair(rig, look);
  if (look.cap) rig.extras.cap = cap(rig, look.cap);
  if (look.helmet) rig.extras.helmet = helmet(rig, look.helmet, look.crest);
  if (look.fleece) rig.extras.collar = fleeceCollar(rig, look.fleece);
  // signature props
  if (id === 'percy') { const s = buildRiptide(); rig.handR.add(s); rig.extras.weapon = s; }
  if (id === 'annabeth') { const d = buildDagger(); rig.handR.add(d); rig.extras.weapon = d; }
  if (id === 'grover') {
    const p = buildPipes(); rig.handL.add(p); rig.extras.pipes = p;
    // goat horns poking up out of the afro, curling back at the tips
    const horn = mat(0xe0c490, { rough: 0.55 }), ridge = mat(0xc4a46a, { rough: 0.6 }), tip = mat(0x9a7a4a, { rough: 0.55 });
    for (const s of [-1, 1]) {
      bx(rig.head, 2.6, 2.4, 2.6, s * 3.1, 11.6, 1.6, horn, H);
      bx(rig.head, 2.2, 0.5, 2.3, s * 3.2, 12.9, 1.4, ridge, H);
      bx(rig.head, 2.1, 2.2, 2.1, s * 3.4, 14.1, 1.1, horn, H);
      bx(rig.head, 1.8, 0.5, 1.9, s * 3.5, 15.3, 0.8, ridge, H);
      bx(rig.head, 1.5, 1.7, 1.6, s * 3.7, 16.2, 0.2, tip, H);
      bx(rig.head, 1.1, 1.1, 1.3, s * 3.9, 16.8, -1.0, tip, H);
    }
    rig.extras.wings = [wings(rig.legR, -10.5), wings(rig.legL, -10.5)];
  }
  if (id === 'tyson') {
    const watch = new THREE.Group(); bx(watch, 4.6, 1.6, 4.6, 0, -6.5, 0, BRONZE()); rig.armL.add(watch);
    const sh = buildWatchShield(); sh.visible = false; rig.handL.add(sh); rig.extras.shield = sh;
  }
  if (id === 'clarisse') {
    const s = buildSpear(); rig.handR.add(s); rig.extras.weapon = s;
    const b = buildBoarShield(); rig.armL.add(b); rig.extras.shield = b;
  }
  if (id === 'thalia') {
    const s = buildSpear(); rig.handR.add(s); rig.extras.weapon = s;
    const band = new THREE.Group(); bx(band, 4.6, 1.4, 4.6, 0, -6.5, 0, mat(0xc0c0c8, { rough: 0.3, metal: 0.9 })); rig.armL.add(band);
  }
  if (id === 'nico') {
    const g = new THREE.Group(), stygian = mat(0x1a1424, { rough: 0.3, metal: 0.7, emissive: 0x3a1a6a, ei: 0.8 });
    bx(g, 1.1, 1.1, 3.2, 0, 0, -0.6, mat(0x2a2020)); bx(g, 4, 1, 1, 0, 0, 1.4, stygian);
    [[1.8, 3, 3.6], [1.8, 3, 6.6], [1.5, 3, 9.6], [0.8, 2, 12]].forEach(([w, l, z]) => bx(g, w, 0.5, l, 0, 0, z, stygian));
    g.position.set(0, -1 * PX, 1 * PX); rig.handR.add(g); rig.extras.weapon = g;
  }
  rig.look = look;
  return rig;
}

// People of the camp: Chiron (a centaur) and Mr. D. Not playable. After the
// NPC sheet (design/concept/vox-npcs.png).
export function buildNpc(id) {
  const S = new Skin(hashStr(id), 2);
  if (id === 'chiron') {
    // a tweed jacket over a green sweater vest and white shirt, curly brown
    // hair and a full beard, a bow and quiver; below the waist a white horse
    paintHumanoid(S, { skinTone: 0xd88e5c, hair: 0x5a3218, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x2a8a5a, pupil: 0x0a2a1a, brow: 0x3a200e, mouth: 'smile', lip: 0x8a4030,
      top: 0x3e5a2e, collar: 0xf0ece0, jacket: 0x6e4a2a, jacketPlaid: [0x5a3a1e, 0x8a643a], jacketSleeve: 12, pants: 0xf0ece4, shoes: 0xf0ece4, shade: false });
    S.rect(22, 20, 4, 2, 0xf0ece0, 0.03); S.rect(23, 22, 2, 4, 0x2e4622, 0.06);       // shirt collar points, vest V
    S.rect(21, 24, 6, 1, 0x4a2a14, 0.05);                                             // quiver strap across the chest
    S.shadeLimbs(); S.saturate(1.1);
    const rig = new Rig({ material: Object.assign(makeCharMaterial(S.texture()), { alphaTest: 0.5 }), scale: 1.25 });
    addHair(rig, { vox: { style: 'shaggy', base: 0x5a3218, shade: 0x341a0a, light: 0x84522a, seed: 5, beard: { length: 2.4 } } });
    // the horse body: shaggy white coat, dark hooves, a swishing tail
    rig.legL.visible = rig.legR.visible = false;
    const m = partMaterial(), r = mulberry32(7), coat = [0xf4f0e6, 0xe8e0d0, 0xfaf8f2, 0xd8d0c0], hoof = 0x3a2a1e;
    const horse = new THREE.Group(); horse.position.set(0, -6 * PX, -8 * PX);
    const L = [{ at: [0, 2, 0], size: [11, 10, 22], col: new THREE.Color(0xf0ece2) }, { at: [0, 3.5, 11], size: [9.4, 7, 5], col: new THREE.Color(0xf0ece2) }];
    for (let i = 0; i < 70; i++) { const c = coat[Math.floor(r() * 4)]; L.push({ at: [(r() < 0.5 ? -1 : 1) * (5.2 + r() * 0.6), -1.5 + r() * 8, -10 + r() * 21], size: [1, 1.2 + r(), 1.2 + r()], col: new THREE.Color(c) }); }
    for (let i = 0; i < 30; i++) L.push({ at: [-5 + r() * 10, 7.2 + r() * 0.5, -10 + r() * 20], size: [1.2 + r(), 1, 1.2 + r()], col: new THREE.Color(coat[Math.floor(r() * 4)]) });
    for (const [x, z] of [[-3.5, 8], [3.5, 8], [-3.5, -8], [3.5, -8]]) {
      L.push({ at: [x, -10, z], size: [3.8, 15, 3.8], col: new THREE.Color(0xeee8dc) });
      for (let k = 0; k < 6; k++) L.push({ at: [x + (r() - 0.5) * 3.2, -15.6 + r() * 1.4, z + (r() - 0.5) * 3.2], size: [1.2, 1.6, 1.2], col: new THREE.Color(coat[Math.floor(r() * 4)]) });   // feathering
      L.push({ at: [x, -17.1, z + 0.2], size: [4.2, 1.8, 4.4], col: new THREE.Color(hoof) });
    }
    const body = partsMesh(L, m); body.userData.baseMat = m; rig.meshes.push(body); horse.add(body);
    const tail = new THREE.Group(); tail.position.set(0, 5 * PX, -11 * PX);
    const T = []; for (let i = 0; i < 26; i++) { const t = i / 26; T.push({ at: [(r() - 0.5) * 2.6, -t * 11, -1 - t * 2 + (r() - 0.5)], size: [1.4, 1.6, 1.4], col: new THREE.Color(coat[Math.floor(r() * 4)]).multiplyScalar(0.92) }); }
    const tm = partsMesh(T, m); tm.userData.baseMat = m; rig.meshes.push(tm); tail.add(tm); horse.add(tail);
    rig.hips.add(horse);
    rig.dims.legH += 12; rig.hips.position.y += 12 * PX;   // the man stands on the horse (animate keeps the hips at legH)
    rig.strands.push({ g: tail, ax: 0, az: 0, vx: 0, vz: 0, stiff: 18, base: [0, 0] });
    // bow and a quiver of arrows on the back
    const gear = new THREE.Group(); gear.position.set(0, 6 * PX, -2.6 * PX); gear.rotation.z = 0.45; rig.torso.add(gear);
    const wood = mat(0x7a4a22), leather = mat(0x4a2a14), fletch = mat(0xe8c060);
    bx(gear, 0.8, 18, 0.8, 2.5, 0, -0.6, wood); bx(gear, 0.6, 2, 0.6, 3, 9.5, -0.6, wood); bx(gear, 0.6, 2, 0.6, 3, -9.5, -0.6, wood);
    bx(gear, 3, 11, 3, -1.5, 1, -0.4, leather); for (const x of [-2.3, -1.4, -0.6]) bx(gear, 0.7, 2.4, 0.7, x, 7.6, -0.4, fletch);
    rig.look = { accent: 0xc9963a };
    return rig;
  }
  // Mr. D: short and round, curly black hair crowned with grapes and vine
  // leaves, an open leopard-print shirt over a white vest, olive shorts,
  // sandals and a can of Diet Coke
  paintHumanoid(S, { skinTone: 0xe0a07a, hair: 0x141012, fringe: 2, hairSide: 3, hairBack: 6, eye: 0x4a2a3a, brow: 0x141012, mouth: 'smile', cheeks: 0xd87a6a,
    top: 0xf0ece0, collar: false, shortSleeve: 4, sleeve: 0xe0a028, jacket: 0xe0a028, jacketSleeve: 5, pants: 0x5a5a2c, shorts: 8, cargo: true, shoes: 0x6a3a1a, shade: false });
  // leopard rosettes on the shirt and sleeves (fine dots)
  const r = mulberry32(19);
  for (const [x0, y0, w, h] of [[16, 36, 24, 12], [20, 32, 8, 4], [40, 36, 16, 5], [48, 52, 16, 5]]) for (let i = 0; i < w * h / 2.2; i++) {
    const x = x0 + Math.floor(r() * w * 2) / 2, y = y0 + Math.floor(r() * h * 2) / 2;
    if (x0 === 16 && x >= 21.5 && x < 26.5) continue;
    S.dot(x, y, 0x3a1e0c, 1, 1); S.dot(x + 0.5, y, 0x3a1e0c, 1, 1); S.dot(x, y + 0.5, 0x3a1e0c, 1, 1); S.dot(x + 0.5, y + 0.5, 0xa86010, 1, 1);
  }
  for (const [u, v] of ARMS) S.rect(u, v + 4 + 4, 16, 1, shadeOf(0xe0a028, 0.75), 0.05);
  S.shadeLimbs(); S.saturate(1.15);
  const rig = new Rig({ material: Object.assign(makeCharMaterial(S.texture()), { alphaTest: 0.5 }), scale: 1.05, bodyW: 10 });
  addHair(rig, { vox: { style: 'afro', base: 0x1a1416, shade: 0x080608, light: 0x3a2e34, seed: 9, shape: { r: [5.4, 4.6, 5.4], c: [0, 7.2, -0.6] } } });
  // the grape-vine wreath
  const w = [], rr = mulberry32(23), hs = (rig.dims.headS / 8) * 1.12;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, R = 5.6, x = Math.cos(a) * R, z = Math.sin(a) * R, y = 10.4 + Math.sin(a * 3) * 0.4;
    if (z > 3.5 && Math.abs(x) < 2) continue;
    w.push({ at: [x, y, z], size: [1.6, 0.8, 1.6], col: new THREE.Color([0x3a7a2a, 0x2a5a1e, 0x5a9a34][i % 3]) });
    if (i % 4 === 1) for (let k = 0; k < 5; k++) w.push({ at: [x + (rr() - 0.5) * 1.4, y + 0.6 + (k < 3 ? 0 : 0.9) + rr() * 0.3, z + (rr() - 0.5) * 1.4], size: [0.9, 0.9, 0.9], col: new THREE.Color([0x5a2a7a, 0x7a3a9a, 0x4a1a5a][k % 3]) });
  }
  const wm = partMaterial(), wreath = partsMesh(w, wm); wreath.scale.setScalar(hs); wreath.userData.baseMat = wm; rig.meshes.push(wreath); rig.head.add(wreath);
  addOutfit(rig, { footwear: { kind: 'sandal', upper: 0x6a3a1a, sole: 0x4a2a14, trim: 0xe0a07a }, cuffs: 0x4a4a24 });
  const can = new THREE.Group(), red = mat(0xc8202a, { rough: 0.4 }), silver = mat(0xd8d8e0, { metal: 0.8, rough: 0.3 });
  bx(can, 1.9, 2.4, 1.9, 0, -1.2, 1, silver); bx(can, 2, 1.2, 2, 0, -1.2, 1, red); bx(can, 1.5, 0.3, 1.5, 0, 0.15, 1, silver); rig.handR.add(can);
  rig.armR.rotation.x = -0.9;
  rig.look = { accent: 0x8a2a8a };
  return rig;
}

// Straw training dummy for the hub / test room.
export function buildDummy() {
  const S = new Skin(77);
  S.box(0, 0, 8, 8, 8, 0xd8c078, 0.2); S.rect(9, 12, 2, 2, 0x222222); S.rect(13, 12, 2, 2, 0x222222); S.rect(10, 14, 4, 1, 0x7a2a1a);
  S.box(16, 16, 8, 12, 4, 0xc9b070, 0.2); S.rect(20, 22, 8, 2, 0x9a3a2a);
  S.box(40, 16, 4, 12, 4, 0xc9b070, 0.2); S.box(32, 48, 4, 12, 4, 0xc9b070, 0.2);
  S.box(0, 16, 4, 12, 4, 0x6a4a2a, 0.1); S.box(16, 48, 4, 12, 4, 0x6a4a2a, 0.1);
  const material = makeCharMaterial(S.texture());
  material.alphaTest = 0.5;
  const rig = new Rig({ material, jacket: false });
  rig.armR.rotation.z = 1.4; rig.armL.rotation.z = -1.4;
  return rig;
}
