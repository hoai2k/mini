// The bronze spiders and the scorpion, with the scorpion's posed tail and
// claws (scorpionPose).
import { PX } from '../character.js';
import { QuadRig, paintQuad } from '../quad.js';
import { skinMat, group, sway } from '../parts.js';
import { kit, dropMeshes, BUILD, voxDensity, densityFor } from '../voxkit.js';

// Hephaestus's bronze spider (vox-enemies, top row): a boxy riveted body
// in bronze and dark-bronze bands, a big chequered abdomen, two furnace eyes
// over a row of small ones, cream fangs, and eight thick jointed legs that
// arch above the back on bolted knuckles and plant wide. queen: the boss.
const BRZ = [0xa85a08, 0x8c4606, 0xc87010], BRZ_D = [0x3a2008, 0x4a2a0c, 0x2a1606], BRZ_L = 0xe8a020;
export function bronzeSpider(id, { scale = 1, queen = false } = {}) {
  const base = 0x9a5208, dark = 0x3a2008, plate = 0xd08a18;
  const mat = skinMat(id, (S) => { paintQuad(S, { base, dark, belly: 0x3a220e, eye: 0xffa020, eyeLow: 0xff6a10, eyes: [[9, 11], [13, 11]], plates: plate, extra: 0x9a6428, teeth: false, nose: dark, noise: 0.16, speckles: 14,
    custom: (s) => {
      for (let x = 0; x < 40; x += 4) s.rect(x, 24, 1, 8, dark, 0);          // riveted seams on the body
      for (let i = 0; i < 18; i++) s.px(Math.floor(s.r() * 40), 16 + Math.floor(s.r() * 20), plate);
      s.rect(40, 18, 12, 1, plate, 0); s.rect(40, 22, 12, 1, dark, 0); s.rect(40, 25, 12, 1, dark, 0);
    } }); S.saturate(1.25); }, { rough: 0.4, emit: 1.2, scale });
  const rig = new QuadRig({ material: mat, scale, bodyL: 8, bodyW: 7, bodyH: 5, legH: 9, legW: 2.3, headS: 6.4, legs: 8, splay: 2.15, footL: 13, kneeOut: 0.5, legY: 2.4, snout: false, neckUp: -1.6, headZ: -0.6, gait: 1.6 });
  // The queen is the spider at boss size (scale 2.6): built from cells near a
  // hero's size (kit density, VoxKit.vox), not the small spider's slabs made
  // big. Her plates show their grain and rivets, her legs are jointed, banded
  // and spurred, and her abdomen is a fine chequer of bronze blocks.
  // (a spider built big, the Road West champion at 1.7, takes the queen's
  // fine build too, without her crown and gears: fine)
  const fine = queen || BUILD.k >= 1.5;
  const DQ = fine ? densityFor(scale) / 1.25 : 1;
  const K = kit(rig, mat, { seed: queen ? 31 : 13, rough: 0.5, metal: 0.1, emit: 0.7, density: fine ? DQ : undefined });
  const { legW, hs } = rig.dims;
  // a plate: grained cells on the queen, one box on the small spiders
  const PL = (p, x, y, z, w, h, d, cols, o = {}) => (fine ? K.vox(p, x, y, z, w, h, d, cols, { relief: 0.1, j: 0.14, ...o }) : K.box(p, x, y, z, w, h, d, cols[0], o.rx ?? 0, o.ry ?? 0, o.rz ?? 0));
  // the same in a knee's frame (K.boxZ)
  const PZ = (g, x, y, z, w, h, d, cols) => {
    if (!fine) return K.boxZ(g, x, y, z, w, h, d, cols[0]);
    const rz = g.rotation.z, c = Math.cos(rz), sn = Math.sin(rz), P = g.position;
    return K.vox(g.parent, P.x / PX + x * c - y * sn, P.y / PX + x * sn + y * c, P.z / PX + z, w, h, d, cols, { relief: 0.1, j: 0.14, rz });
  };
  // legs fan fore and aft: plated upper legs, bolted knuckles, banded shins and dark pointed feet
  for (const leg of rig.legs) {
    const u = leg.userData; leg.rotation.y = -u.side * (0.75 - u.row * 0.5);
    dropMeshes(rig, leg);
    if (fine) {
      PL(leg, 0, 0, 0, 2.8, 2.8, 2.8, [BRZ_D[0], BRZ_D[2]]);
      for (const sx of [-1, 1]) { K.box(leg, sx * 1.5, 0, 0, 0.4, 1.8, 1.8, BRZ_D[1]); K.box(leg, sx * 1.75, 0, 0, 0.3, 0.7, 0.7, BRZ_L); }   // the hip's bolt
      // a slimmer thigh: a dark strut inside, a bronze plate over its top and outer face
      PL(leg, 0, -4.5, 0, legW - 0.4, 9, legW - 0.4, [BRZ_D[1], BRZ_D[0]]);
      PL(leg, 0, -3.6, 0.5, legW + 0.2, 6.4, legW - 0.6, [BRZ[u.row % 2], BRZ[2]], { faces: 'tfklr' });
      for (const y of [-1.2, -7.4]) K.box(leg, 0, y, 0, legW + 0.6, 0.6, legW + 0.6, BRZ_D[1]);
      for (const y of [-2.4, -4.6]) for (const sx of [-1, 1]) K.box(leg, sx * (legW / 2 + 0.2), y, 0.5, 0.4, 0.5, 0.5, BRZ_L);   // rivets
    } else {
      K.box(leg, 0, 0, 0, 3, 3, 3, BRZ_D[0]);
      K.box(leg, 0, -4.5, 0, legW + 0.2, 9, legW + 0.2, BRZ[u.row % 2]);
      K.box(leg, 0, -6, 0, legW + 0.6, 4, legW + 0.6, BRZ[(u.row + 1) % 3]);
      K.box(leg, 0, -4.5, 0, legW + 0.9, 1, legW + 0.9, BRZ_D[1]);
    }
    const k = u.knee; dropMeshes(rig, k);
    K.boxZ(k, 0, 0, 0, 3.4, 3.4, 3.4, BRZ_D[2]);
    for (const sx of [-1, 1]) { K.boxZ(k, sx * 1.8, 0, 0, 0.5, 2.2, 2.2, BRZ_D[0]); K.boxZ(k, sx * 2.1, 0, 0, 0.4, 0.9, 0.9, BRZ_L); }
    if (fine) {
      // the shin: a tapering strut in three plated sections, a spur at each
      // joint and a hooked, dark claw for a foot
      PZ(k, 0, -6.5, 0, legW * 0.6, 13, legW * 0.6, [BRZ_D[1], BRZ_D[2]]);
      PZ(k, 0, -3.6, 0, legW * 0.8 + 0.5, 4.2, legW * 0.8 + 0.5, [BRZ[(u.row + 1) % 3], BRZ[0]]);
      PZ(k, 0, -8.2, 0, legW * 0.8 + 0.1, 3, legW * 0.8 + 0.1, [BRZ[u.row % 2], BRZ[2]]);
      for (const y of [-1.4, -5.9, -9.9]) K.boxZ(k, 0, y, 0, legW * 0.8 + 0.8, 0.5, legW * 0.8 + 0.8, BRZ_D[1]);
      K.boxZ(k, 0, -5.9, legW * 0.4 + 0.5, 0.6, 1.6, 0.8, BRZ_L, -0.6); K.boxZ(k, 0, -10, legW * 0.3 + 0.4, 0.5, 1.2, 0.6, BRZ_L, -0.6);
      PZ(k, 0, -11.6, 0, 1.3, 2.4, 1.3, [BRZ_D[0], BRZ_D[2]]);
      K.boxZ(k, 0, -13, 0.4, 0.8, 1.2, 1.3, 0x1a0e04);
    } else {
      K.boxZ(k, 0, -6.5, 0, legW * 0.8, 13, legW * 0.8, BRZ_D[1]);
      K.boxZ(k, 0, -4.2, 0, legW * 0.8 + 0.8, 5, legW * 0.8 + 0.8, BRZ[(u.row + 1) % 3]);
      K.boxZ(k, 0, -6.9, 0, legW * 0.8 + 1, 0.8, legW * 0.8 + 1, BRZ_D[1]);
      K.boxZ(k, 0, -9.4, 0, legW * 0.8 + 0.4, 3.6, legW * 0.8 + 0.4, BRZ_D[0]);
      K.boxZ(k, 0, -12.4, 0, 1.2, 2.2, 1.2, BRZ_D[2]);
    }
  }
  // the abdomen: a big chequered dome of bronze blocks
  const ab = group(rig.torso, 0, 1.6, -8.6);
  // (the queen's is the same chequer at three blocks to each of the
  // spider's, rounded off into a dome: the blocks near its corners drop)
  const AW = 11, AH = 9, AD = 12, f = queen ? 3 : fine ? 2 : 1, NX = 6 * f, NY = 5 * f, NZ = 7 * f, c = 1.83 / f;
  for (let ix = 0; ix < NX; ix++) for (let iy = 0; iy < NY; iy++) for (let iz = 0; iz < NZ; iz++) {
    const edge = ix === 0 || ix === NX - 1 || iy === 0 || iy === NY - 1 || iz === 0 || iz === NZ - 1; if (!edge) continue;
    const x = -AW / 2 + c / 2 + ix * (AW - c) / (NX - 1), y = -AH / 2 + c / 2 + iy * (AH - c) / (NY - 1), z = -AD / 2 + c / 2 + iz * (AD - c) / (NZ - 1);
    if (fine) { if ((x / (AW * 0.62)) ** 2 + ((y + 1) / (AH * 0.66)) ** 2 + (z / (AD * 0.6)) ** 2 > 1.06 + K.r() * 0.08) continue; }
    else { const corners = (ix === 0 || ix === 5) + (iy === 4 || iy === 0) + (iz === 0 || iz === 6); if (corners >= 3 || (corners === 2 && iy === 0)) continue; }
    const jx = Math.floor(ix / f), jy = Math.floor(iy / f), jz = Math.floor(iz / f);
    const band = jz % 3 === 1, chk = (jx + jy + jz) % 2;
    const col = band ? BRZ_D[(jx + jy) % 3] : chk ? BRZ[0] : BRZ[(jx + jz) % 2 ? 2 : 1];
    K.box(ab, x, y, z, c + 0.15 / f, c + 0.15 / f, c + 0.15 / f, fine ? K.tone([col], 0.12) : col);
  }
  // the queen: a seam of rivets down each band and a ridge of spines along the dome's top
  if (queen) for (let i = 0; i < 7; i++) {
    const z = -AD / 2 + 1 + i * (AD - 2) / 6, top = AH * 0.66 - 1 - Math.abs(z) * 0.2;
    K.box(ab, 0, top + 1.6, z, 0.8, 2.4 - Math.abs(i - 3) * 0.3, 0.9, BRZ_L, -0.4);
    for (const sx of [-1, 1]) K.box(ab, sx * 2.6, top + 0.5, z, 0.5, 0.5, 0.5, BRZ_L);
  }
  K.box(ab, 0, 0, 0, AW - 1, AH - 1, AD - 1, BRZ_D[0]);
  // a plated back with rivets and a dark mid-band
  const T = rig.torso;
  PL(T, 0, 2.9, 0, 7.8, 1, 7.4, [BRZ[2], BRZ[0]], { faces: 'tfklr' }); K.box(T, 0, 3.5, 0, 2.4, 0.4, 7.6, BRZ_D[1]);
  for (const [x, z] of [[-2.8, 2.8], [2.8, 2.8], [-2.8, -2.8], [2.8, -2.8], [-2.8, 0], [2.8, 0]]) K.box(T, x, 3.55, z, 0.8, 0.5, 0.8, BRZ_L);
  for (const sx of [-1, 1]) PL(T, sx * 3.7, 0, 0, 0.6, 3.4, 7.6, [BRZ_D[2], BRZ_D[1]], { faces: sx < 0 ? 'l' : 'r' });
  // face: brow plate, two furnace eyes and four small ones, mandibles and cream fangs
  const Hd = rig.head, fz = hs * 0.35 + hs / 2;
  PL(Hd, 0, hs * 0.42, hs * 0.35, hs + 0.6, 1, hs + 0.4, [BRZ[2], BRZ[0]], { faces: 'tfklr' });
  K.box(Hd, 0, hs * 0.26, fz + 0.3, hs + 0.4, 0.9, 0.6, BRZ_D[0]);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * hs * 0.24, 0, fz + 0.15, 1.8, 1.6, 0.4, 0xff6a00); K.box(Hd, sx * hs * 0.24, 0, fz + 0.3, 0.8, 0.7, 0.3, 0xffd040);
    K.box(Hd, sx * hs * 0.12, hs * 0.18 + 0.6, fz + 0.15, 0.7, 0.6, 0.3, 0xff8000); K.box(Hd, sx * hs * 0.38, hs * 0.18 + 0.4, fz + 0.15, 0.6, 0.6, 0.3, 0xff8000);
  }
  const M = rig.mouth;
  for (const sx of [-1, 1]) {
    K.box(M, sx * 1.4, 0.2, 1.1, 1.5, 1.5, 2.4, BRZ[0], 0, -sx * 0.25, 0);
    K.box(M, sx * 1.6, -1.3, 2.1, 0.9, 2.4, 0.9, 0xeedcb0, 0.2, 0, 0); K.box(M, sx * 1.6, -2.7, 2.4, 0.6, 1, 0.6, 0xd8c498);
  }
  rig.extras.abdomen = ab;
  if (queen) {
    // the queen: a crown of spikes, gears turning in her sides, a furnace glow
    // a crown of nine fine spikes on a riveted band
    K.box(Hd, 0, 3.4, 1, hs + 0.2, 0.8, 1.4, BRZ_D[1], -0.3);
    for (let i = -4; i <= 4; i++) { const h = 1.6 + (4 - Math.abs(i)) * 0.7; K.box(Hd, i * 0.62, 3.6 + h / 2, 1 - h * 0.15, 0.45, h, 0.5, BRZ_L, -0.3, 0, -i * 0.09); if (i % 2 === 0) K.box(Hd, i * 0.62, 3.4, 1.75, 0.35, 0.35, 0.3, 0xffd040); }
    const gears = [];
    for (const sx of [-1, 1]) { const gg = group(ab, sx * 5.9, 0.5, 0); for (let i = 0; i < 6; i++) K.box(gg, 0, 0, 0, 0.8, 1.4, 6.4, BRZ_L, i / 6 * Math.PI, 0, 0); K.box(gg, 0, 0, 0, 1, 2.6, 2.6, BRZ_D[0]); gears.push(gg); }
    rig.extras.gears = gears;
    K.box(ab, 0, -1, -6.2, 3, 3, 0.6, 0xff7a10); K.box(ab, 0, -1, -6.4, 1.6, 1.6, 0.4, 0xffd040);
    K.box(T, 0, 0, 4.2, 3, 2, 0.6, 0xff7a10);
  } else {
    // a wind-up key on the abdomen
    const key = group(ab, 0, 4.6, 0);
    K.box(key, 0, 1.3, 0, 0.8, 2.6, 0.8, BRZ_L); K.box(key, 0, 3, 0, 4, 1.6, 0.7, BRZ_L); K.box(key, 0, 3, 0, 1.8, 0.8, 0.8, BRZ_D[0]);
    rig.extras.key = key;
  }
  return K.done();
}

// Pit scorpion: a low armoured scorpion in dark red-brown chitin, banded
// back plates, eight jointed legs, heavy serrated pincers on jointed arms,
// four glowing eyes and a long segmented tail arcing high over the back to a
// big bulbous stinger with a hooked barb dripping green venom.
// It fights two ways, alternating (MONSTERS.scorpion.moves, enemy.js):
//   pinch  the claws spread wide and open (the tell), then lunge one after
//          the other and snap shut: a one-two at short range;
//   sting  the tail coils back high and trembles (the tell), then whips
//          forward over the body to stab the ground in front, and recoils.
// Idle, the tail sways poised and the claws snap nervously. The rig reads
// the attack from animate()'s action (style 'pinch' or 'sting'; any other
// attack style reads as a pinch), so champion looks built on it, online
// puppets and the workbench all move the same.
// pal: { C: [three chitin tones], CD: dark, CL: light plates, VEN: venom, belly, sting: [bulb, inner, barb] }
export function buildScorpion({ id = 'scorpion', pal = {} } = {}) {
  const C = pal.C ?? [0x4a2214, 0x5a2a16, 0x3a1a0e], CD = pal.CD ?? 0x1a0c06, CL = pal.CL ?? 0x7a3a1c, VEN = pal.VEN ?? 0x7aff1a;
  const ST = pal.sting ?? [C[1], 0x6aa018, CD];
  const mat = skinMat(id, (S) => {
    paintQuad(S, { base: C[0], dark: CD, belly: pal.belly ?? 0x6a3418, back: C[2], eye: 0xff3a1a, eyes: [[9, 12], [13, 12], [11, 10], [12, 10]], plates: CL, teeth: false, nose: CD, noise: 0.15, speckles: 20,
      custom: (s) => { s.box(40, 32, 2, 2, 6, C[1], 0.15); for (let x = 40; x < 56; x += 3) s.rect(x, 32, 1, 8, CD, 0); } });
    S.saturate(1.2);
  }, { rough: 0.35, emit: 1 });
  const TN = 9, TL = 27;   // tail segments and length (skin px)
  // (bigger than a person, an enemy that intimidates: rig scale 2.8, its back
  // well above Percy's waist and its sting, raised, over his head (the tail's
  // crown at rest is 3.95 blocks: under a dungeon door's 4). It keeps its build;
  // every plate and segment is a shell of hero-sized cells (voxDensity), so
  // the bigger scorpion is more cells, not bigger ones)
  const rig = new QuadRig({ material: mat, scale: 2.8, bodyL: 10, bodyW: 7, bodyH: 3.4, legH: 4, legW: 1.4, headS: 4.5, legs: 8, splay: 1.6, footL: 5, snout: false, neckUp: -1.2, gait: 1.5, tail: TN, tailLen: TL, tailW: 2.8, tailCurl: 0.3 });
  const K = kit(rig, mat, { seed: 79, rough: 0.35, metal: 0.1, emit: 0.8 });
  const T = rig.torso, { legW } = rig.dims;
  // Its plates and segments are drawn as shells of hero-sized cells, so the
  // armour shows grain instead of plain slabs. (Cells 0.8 of a hero pixel's
  // density, and a champion, built bigger (voxkit.js BUILD.k), gains density
  // only with the square root of its size: the plain scorpion stays near 15k
  // triangles and the Red King under 25k, as the cyclops does)
  const fine = true, cell = 1 / (voxDensity(rig) * 0.8 / Math.sqrt(BUILD.k));
  const V = (p, x, y, z, w, h, d, col, rx = 0) => (fine ? K.vox(p, x, y, z, w, h, d, [col], { cell, j: 0.16, relief: 0.08, rx }) : K.box(p, x, y, z, w, h, d, col, rx));
  const VZ = (g, x, y, z, w, h, d, col) => (fine ? K.voxZ(g, x, y, z, w, h, d, [col], { cell, j: 0.16, relief: 0.08 }) : K.boxZ(g, x, y, z, w, h, d, col));
  // banded back plates with a ridge, and side armour
  for (let i = 0; i < 5; i++) { const z = 4 - i * 2.1; V(T, 0, 1.9, z, 7.6 - i * 0.3, 0.8, 2, C[i % 2], -0.08); K.box(T, 0, 2.4, z + 0.3, 1.2, 0.5, 1.4, CL); K.box(T, 0, 1.6, z - 0.9, 7.8 - i * 0.3, 0.4, 0.3, CD); }
  for (const sx of [-1, 1]) V(T, sx * 3.7, 0, 0, 0.6, 2.6, 9.4, C[2]);
  // legs: plated knees and dark pointed feet
  for (const leg of rig.legs) {
    const k = leg.userData.knee; if (!k) continue;
    dropMeshes(rig, leg); dropMeshes(rig, k);
    K.box(leg, 0, -2, 0, legW, 4, legW, C[0]); VZ(k, 0, -2.5, 0, legW * 0.8, 5, legW * 0.8, C[2]);
    V(leg, 0, -2, 0, legW + 0.6, 3, legW + 0.6, C[1]);
    K.boxZ(k, 0, 0, 0, legW * 1.4, 1.6, legW * 1.4, CL); K.boxZ(k, 0, -3, 0, legW, 2, legW, C[0]); K.boxZ(k, 0, -5.2, 0, legW * 0.5, 1.4, legW * 0.5, CD);
  }
  // head: four glowing eyes and small chelicerae
  const Hd = rig.head, fz = 4.5 * 0.35 + 2.25;
  for (const [x, y, s] of [[-1, 0.6, 0.8], [1, 0.6, 0.8], [-1.8, 0, 0.5], [1.8, 0, 0.5]]) K.box(Hd, x, y, fz + 0.1, s, s, 0.3, 0xff3010);
  K.box(Hd, 0, 1.6, 1.6, 4.8, 0.8, 4.6, C[1]);
  for (const sx of [-1, 1]) K.box(rig.mouth, sx * 0.7, 0, 0.8, 0.8, 0.8, 1.6, CL);
  // pincers on jointed arms: a heavy hand and two serrated fingers that open
  // and close (jawA, jawB: groups of their own)
  rig.extras.claws = [];
  for (const sx of [-1, 1]) {
    const arm = group(T, sx * 3, 0, 4.5, 0, sx * 0.5, 0);
    V(arm, 0, 0, 3, 2, 2, 6, C[0]); K.box(arm, 0, 0.9, 3, 1.2, 0.5, 5, CL);
    const fore = group(arm, 0, 0, 6, 0, -sx * 0.9, 0);
    V(fore, 0, 0, 2.5, 1.8, 1.8, 5, C[1]); K.box(fore, 0, 0, 0, 2.4, 2.4, 1.4, CD);
    const pin = group(fore, 0, 0, 5);
    V(pin, 0, 0, 1.8, 3.8, 2.8, 4.4, C[0]); K.box(pin, 0, 1.5, 1.8, 2.6, 0.5, 3.6, CL); K.box(pin, 0, 0, 3.8, 3.2, 2.2, 0.6, CD);
    const jawA = group(pin, -1.1, 0, 4, 0, 0.25, 0), jawB = group(pin, 1.1, 0, 4, 0, -0.25, 0);
    for (const [j, s] of [[jawA, 1], [jawB, -1]]) {
      V(j, 0, 0, 2, 1.3, 1.6, 4.2, CD);
      for (let t = 0; t < 3; t++) K.box(j, s * 0.75, 0, 0.8 + t * 1.2, 0.4, 0.6, 0.5, CL);
      K.boxY(j, [0, 0, 0], s * 0.4, s * 0.2, 0, 4.4, 0.8, 1, 0.8, CD);
    }
    rig.extras.claws.push({ arm, fore, jawA, jawB, side: sx, ph: sx > 0 ? 0 : 2.3 });
  }
  // the tail: thick banded rings tapering to the tip, a dark joint between
  // each and a spike down the outside of the curl (local -y)
  const sl = TL / TN;
  for (const [i, seg] of rig.tail.entries()) {
    const w = 2.9 * (1 - i * 0.055); dropMeshes(rig, seg);
    K.box(seg, 0, 0, -sl / 2, w, w, sl + 0.1, C[2]); V(seg, 0, 0, -sl / 2, w + 0.5, w + 0.4, sl * 0.7, C[i % 2]);
    K.box(seg, 0, -w / 2 - 0.4, -sl / 2, 0.6, 0.8, 0.6, CL); K.box(seg, 0, 0, -0.1, w + 0.2, w + 0.2, 0.3, CD);
  }
  // the stinger: a big bulb, then a barb hooking in under the curl (+y),
  // a bead of venom at its point
  const sting = group(rig.tailTip, 0, 0, -sl, 0.4);
  V(sting, 0, 0.3, -2.6, 4.2, 4.2, 4.4, ST[0]); V(sting, 0, 0.3, -2.6, 5, 3, 3.4, ST[0]); V(sting, 0, 0.3, -2.6, 3, 5, 3.4, ST[0]);
  K.box(sting, 0, 0.3, -2.6, 3.4, 3.4, 5.2, ST[1]); K.box(sting, 0, 0, -0.2, 3, 3, 0.6, CD); K.box(sting, 0, -2.1, -2.8, 0.8, 1, 2.4, CL);
  K.box(sting, 0, 1.4, -5.4, 2.4, 2.4, 2, ST[2], -0.5); K.box(sting, 0, 2.6, -6.6, 1.7, 1.7, 2, ST[2], -0.9); K.box(sting, 0, 4, -7.3, 1.1, 1.1, 1.9, ST[2], -1.3); K.box(sting, 0, 5.2, -7.5, 0.6, 0.6, 1.2, ST[2], -1.6);
  const venom = group(sting, 0, 5.9, -7.5);
  K.box(venom, 0, 0, 0, 0.7, 0.9, 0.7, VEN);
  rig.extras.sting = sting; rig.extras.venom = venom;
  K.done();
  rig.extras.s0 = rig.baseScale;
  // QuadRig.animate poses everything else (body, legs, head); the tail is
  // hidden from it for the call so only scorpionPose moves it
  const base = rig.animate.bind(rig), noTail = [], act = { type: 'attack', t: 0, style: 'bite', windup: 0.3, strike: 0.5 }, prm = { dt: 0, speed: 0, vel: null, action: null };
  rig.animate = (p) => {
    const a = p.action, atk = a?.type === 'attack' ? (a.style === 'sting' ? 'sting' : 'pinch') : null;
    const tail = rig.tail; rig.tail = noTail;
    if (atk) { act.t = a.t; act.windup = a.windup ?? 0.3; act.strike = a.strike ?? 0.5; prm.dt = p.dt; prm.speed = p.speed; prm.vel = p.vel; prm.action = act; base(prm); }
    else base(p);
    rig.tail = tail;
    scorpionPose(rig, p.dt, p.speed ?? 0, a, atk);
  };
  return rig;
}
// ---- the scorpion's tail and claws, posed from the attack's progress ----------
// Tail poses: [root pitch, curl at the first joint, curl at the last joint,
// stinger bend] (radians; the curl lifts each segment toward the back).
const SC_IDLE = [0.95, 0.14, 0.42, 0.4], SC_COCK = [0.75, -0.02, 0.45, 0.95], SC_STRIKE = [2.4, 0.04, 0.27, 0.15], SC_RECOIL = [0.75, 0.16, 0.5, 0.6], SC_DROOP = [0.15, 0.06, 0.12, 0.2];
const scTail = [0, 0, 0, 0], scK = (v) => (v < 0 ? 0 : v > 1 ? 1 : v), scOut = (v) => 1 - (1 - v) ** 3, scIn = (v) => v * v * v;
function scBlend(A, B, k) { for (let i = 0; i < 4; i++) scTail[i] = A[i] + (B[i] - A[i]) * k; return scTail; }
// claw poses: [arm yaw (outward), arm pitch (- raises), elbow (outward), fingers open]
const CL_IDLE = [0.5, 0, 0.9, 0.08], CL_SPREAD = [1.05, -0.4, 1.35, 0.8], CL_LUNGE = [0.1, 0.12, 0.2, -0.05], CL_BRACE = [0.75, 0.15, 1.1, 0.35];
const scClaw = [0, 0, 0, 0];
function clawBlend(A, B, k) { for (let i = 0; i < 4; i++) scClaw[i] = A[i] + (B[i] - A[i]) * k; return scClaw; }
// u runs 0..1 through the windup and 1..2 through the recovery
function scorpionPose(rig, dt, speed, a, atk) {
  const t = rig.t, k = scK(a?.t ?? 0), w = a?.windup ?? 0.3;
  const u = !atk ? 0 : k < w ? scK(k / (w * 0.84)) : 1 + (k - w) / (1 - w);
  const rate = atk ? 46 : 18, f = 1 - Math.exp(-rate * dt);
  const D = (o, ax, v) => { o.rotation[ax] += (v - o.rotation[ax]) * f; };
  // the tail
  let P, shake = 0, lunge = 0;
  if (a?.type === 'death' || a?.type === 'down') P = SC_DROOP;
  else if (atk === 'sting') {
    if (u < 0.72) { P = scBlend(SC_IDLE, SC_COCK, scOut(u / 0.72)); shake = u / 0.72; lunge = -0.08 * scOut(u / 0.72); }
    else if (u < 0.95) { const e = scIn((u - 0.72) / 0.23); P = scBlend(SC_COCK, SC_STRIKE, e); lunge = -0.08 + 0.26 * e; }
    else if (u < 1.3) { P = SC_STRIKE; lunge = 0.18 + Math.sin((u - 0.95) * 18) * 0.02; }
    else if (u < 1.6) { const e = scOut((u - 1.3) / 0.3); P = scBlend(SC_STRIKE, SC_RECOIL, e); lunge = 0.18 * (1 - e); }
    else P = scBlend(SC_RECOIL, SC_IDLE, scOut((u - 1.6) / 0.4));
  } else if (atk === 'pinch') {
    const e = u < 1 ? scOut(u) : 1 - scK((u - 1.4) / 0.6);
    P = scBlend(SC_IDLE, SC_RECOIL, e * 0.5);
  } else P = SC_IDLE;
  const sway = atk === 'sting' ? 0.05 : 1;
  const yaw = (Math.sin(t * 1.3) * 0.12 + Math.sin(t * 0.47) * 0.08) * sway, bob = Math.sin(t * 2.1) * 0.05 * sway - speed * 0.1;
  const tr = shake * shake * Math.sin(t * 47) * 0.05;
  const n = rig.tail.length;
  for (let i = 0; i < n; i++) {
    const g = rig.tail[i];
    D(g, 'x', i === 0 ? P[0] + bob + tr : P[1] + (P[2] - P[1]) * (i - 1) / (n - 2) + tr * 0.5);
    D(g, 'y', yaw * (i === 0 ? 1 : 0.35) + Math.sin(t * 2.6 - i * 0.6) * 0.03 * sway);
  }
  const S = rig.extras.sting; D(S, 'x', P[3]);
  rig.extras.venom.scale.setScalar(1 + (atk === 'sting' && u < 0.95 ? shake * 0.9 : 0) + Math.max(0, Math.sin(t * 1.7)) * 0.25);
  // the claws: each strikes at its own moment (the left at the release,
  // the right a beat later)
  for (const c of rig.extras.claws) {
    let Q;
    if (atk === 'pinch') {
      const L = c.side < 0 ? 0.97 : 1.32;
      if (u < 0.75) Q = clawBlend(CL_IDLE, CL_SPREAD, scOut(u / 0.75));
      else if (u < L - 0.14) { Q = clawBlend(CL_SPREAD, CL_SPREAD, 0); Q[3] += Math.sin(t * 40 + c.ph) * 0.06; Q[0] += Math.sin(t * 31 + c.ph) * 0.03; }
      else if (u < L) { const e = scIn((u - L + 0.14) / 0.14); Q = clawBlend(CL_SPREAD, CL_LUNGE, e); Q[3] = e < 0.7 ? CL_SPREAD[3] : CL_LUNGE[3]; }
      else if (u < L + 0.22) { Q = clawBlend(CL_LUNGE, CL_LUNGE, 0); Q[3] = CL_LUNGE[3] + Math.max(0, Math.sin((u - L) * 60)) * 0.12; }
      else Q = clawBlend(CL_LUNGE, CL_IDLE, scOut(scK((u - L - 0.22) / (2 - L - 0.22))));
      if (u >= L - 0.14 && u < L + 0.3) lunge = Math.max(lunge, 0.12 * Math.sin(scK((u - L + 0.14) / 0.44) * Math.PI));
    } else if (atk === 'sting') {
      const e = u < 1 ? scOut(u) : 1 - scK((u - 1.3) / 0.7);
      Q = clawBlend(CL_IDLE, CL_BRACE, e);
    } else {
      // nervous snapping: now and then a quick open-and-shut
      Q = clawBlend(CL_IDLE, CL_IDLE, 0);
      const s = (t * (0.9 + c.side * 0.13) + c.ph) % 1.7;
      Q[3] = s < 0.16 ? 0.08 + Math.sin(s / 0.16 * Math.PI) * 0.6 : s > 0.5 && s < 0.6 ? 0.08 + Math.sin((s - 0.5) / 0.1 * Math.PI) * 0.35 : 0.08;
      Q[0] += Math.sin(t * 2.4 + c.ph) * 0.12; Q[1] += Math.sin(t * 1.9 + c.ph) * 0.06;
    }
    D(c.arm, 'y', c.side * Q[0]); D(c.arm, 'x', Q[1]); D(c.fore, 'y', -c.side * Q[2]);
    D(c.jawA, 'y', 0.25 - Q[3] * 0.7); D(c.jawB, 'y', -0.25 + Q[3] * 0.7);
  }
  // the body rocks back on the windup and lunges in on the strike
  // (lunge is in metres for a scorpion of rig scale 1.25, scaled to this one's 2.8; a champion's grows with the champion)
  rig.hips.position.z += (lunge * 2.24 / rig.extras.s0 - rig.hips.position.z) * f;   // (×2.24: rig scale 2.8 over 1.25)
}
