// Small worlds built for the opening's cutscenes (story/cutscenes.js):
//   avenue    Central Park West: the park on one side, apartment houses on
//             the other, and the American Museum of Natural History, with
//             its steps, columns and banners. The school bus drives here.
//   montauk   the beach at Montauk in a storm: the sea, the dunes, the
//             little cabin, and a road inland toward a hill with a pine.
// Each returns the shape loadWorld() takes plus the spots the shots use.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { oak, pine, column, gable, boulder } from './rooms.js';
import { t as txt } from '../text_config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildAvenueSet() {
  const SX = 76, SY = 44, SZ = 200, FY = 4;
  const world = new World(SX, SY, SZ), deco = new Decorations(), shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, 9090), W = world;
  k.floor(0, 0, SX - 1, SZ - 1, FY, B.sidewalk, 4);
  // the avenue (x 28-43), four lanes
  for (let z = 0; z < SZ; z++) for (let x = 28; x <= 43; x++) W.set(x, FY - 1, z, (x === 35 || x === 36) && z % 6 < 3 ? B.asphalt_line : (x === 31 || x === 40) && z % 8 < 2 ? B.white_trim : B.asphalt);
  // the park on the east: a low stone wall, lawns and big trees
  for (let z = 0; z < SZ; z++) { for (let x = 49; x < SX; x++) W.set(x, FY - 1, z, B.grass); W.set(48, FY, z, B.stone_brick); if (z % 9 === 0) W.set(48, FY + 1, z, B.stone_brick); }
  for (let z = 3; z < SZ - 2; z += 7) for (const x of [53, 60, 67]) { const ox = x + Math.floor(k.r() * 3), oz = z + Math.floor(k.r() * 3); if (k.chance(0.85)) oak(k, ox, oz, FY, { h: 5 + Math.floor(k.r() * 3), R: 2.6 + k.r() }); }
  k.scatter(49, 0, SX - 1, SZ - 1, { density: 0.18, types: ['grass', 'tall_grass', 'flower_yellow', 'grass'] });
  for (let z = 6; z < SZ; z += 14) { deco.prop('streetlight', 45.5, FY, z + 0.5, { rot: Math.PI }); deco.prop('streetlight', 26.5, FY, z + 7.5, { rot: 0 }); }
  for (let z = 10; z < SZ; z += 22) deco.prop('bench', 46.6, FY, z + 0.5, { rot: Math.PI / 2 });
  // apartment houses on the west, north of the museum
  const block = (z0, z1, h, mat) => {
    W.fill(2, FY, z0, 21, FY + h - 1, z1, mat);
    for (let z = z0; z <= z1; z++) { W.set(21, FY + h - 1, z, B.cornice); W.set(22, FY + h - 2, z, B.cornice); }
    for (let y = FY + 2; y < FY + h - 2; y += 3) for (let z = z0 + 1; z < z1; z += 2) { const id = k.chance(0.3) ? B.window_dark : B.window_day; W.set(21, y, z, id); W.set(21, y + 1, z, id); }
    for (let z = z0 + 1; z < z1; z++) { W.set(21, FY, z, z % 5 === 0 ? B.dark_planks : B.shop_window); W.set(21, FY + 1, z, B.shop_window); }
  };
  let z = 0;
  while (z < 104) { const len = 10 + Math.floor(k.r() * 8); block(z, Math.min(103, z + len - 1), 16 + Math.floor(k.r() * 10), [B.brownstone, B.plaster, B.red_brick, B.stone_brick][Math.floor(k.r() * 4)]); z += len; }
  // ---- the museum (z 108-192): granite walls, broad steps, four great columns
  const MZ0 = 108, MZ1 = 192, MC = 150, top = FY + 4;
  W.fill(0, FY, MZ0, 9, FY + 24, MZ1, B.stone_brick);
  for (let zz = MZ0; zz <= MZ1; zz++) for (let y = FY; y < FY + 24; y += 6) W.set(9, y + 5, zz, B.white_trim);
  for (let y = FY + 7; y < FY + 22; y += 6) for (let zz = MZ0 + 2; zz < MZ1; zz += 4) if (Math.abs(zz - MC) > 16) { W.set(9, y, zz, B.window_day); W.set(9, y + 1, zz, B.window_day); W.set(9, y + 2, zz, B.window_day); }
  // the terrace and the steps down to the sidewalk
  W.fill(10, FY, MC - 22, 16, top - 1, MC + 22, B.marble_white);
  for (let s = 0; s < 4; s++) for (let zz = MC - 20 + s; zz <= MC + 20 - s; zz++) for (let y = FY; y < top - 1 - s; y++) W.set(17 + s, y, zz, B.marble_white);
  for (let s = 0; s < 4; s++) for (let zz = MC - 20 + s; zz <= MC + 20 - s; zz++) W.set(17 + s, top - 2 - s, zz, B.marble_floor);
  // the arch and its doors
  for (let zz = MC - 4; zz <= MC + 4; zz++) for (let y = top; y < top + 9; y++) W.set(9, y, zz, Math.abs(zz - MC) <= 3 && y < top + 7 ? (y < top + 4 ? B.dark_planks : B.window_day) : B.marble_white);
  // four columns, two blocks square, sixteen high, on the terrace
  for (const zc of [MC - 14, MC - 7, MC + 6, MC + 13]) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) column(k, 12 + dx, zc + dz, top, 16);
  // the entablature with a frieze, and the name
  W.fill(10, top + 16, MC - 18, 16, top + 19, MC + 18, B.marble_white);
  for (let zz = MC - 18; zz <= MC + 18; zz++) W.set(16, top + 17, zz, B.key_frieze);
  W.fill(10, top + 20, MC - 12, 15, top + 21, MC + 12, B.marble_white);
  deco.prop('text_sign', 16.6, top + 18.1, MC + 0.5, { text: txt('signs.museum'), w: 26, h: 1.2, rot: Math.PI / 2, bg: '#e8e0d0', fg: '#3a2a1a', border: null, oneSided: true, greek: true, near: 80, look: 0.8 });
  // banners between the columns
  for (const [zz, text, col] of [[MC - 10, txt('signs.greekRoman'), '#b8321e'], [MC + 10, txt('signs.mythsHeroes'), '#1e3a7a']]) deco.prop('text_sign', 12.6, top + 6, zz + 0.5, { text, w: 2.2, h: 6, rot: Math.PI / 2, bg: col, fg: '#ffd84a', border: '#ffd84a', oneSided: true, greek: true, near: 40, look: 1.2 });
  for (const zz of [MC - 21, MC + 21]) { deco.prop('brazier', 15.5, top, zz + 0.5); W.addLight(15.5, top + 1.6, zz + 0.5, 0xffc070, 3, 9); }
  // west sidewalk in front of the museum, a hot-dog cart and a newsstand
  deco.prop('hotdog_cart', 25.5, FY, MC - 26.5, { rot: Math.PI / 2 }); deco.prop('newsstand', 24.5, FY, MC + 30.5, { rot: Math.PI / 2 });
  for (let zz = MZ0 + 2; zz < MZ1; zz += 20) if (Math.abs(zz - MC) > 24) oak(k, 24, zz, FY, { h: 4, R: 1.8 });
  W.fill(0, FY, MZ1 + 1, 21, FY + 18, SZ - 1, B.brownstone);
  world.collectBlockLights();
  // the bus stops at the curb by the steps, heading south (+z), its door on the museum side
  const busStop = V(30.4, FY, MC + 2);
  return {
    world, deco, shafts, kit: k, spawn: busStop.clone().setX(24), stage: busStop.clone(),
    FY, MC, busStop, busFrom: V(30.4, FY, 6),
    steps: [V(24, FY, MC + 3), V(20.5, FY + 1, MC + 3), V(16, top, MC + 2), V(11.2, top, MC)],
    top, dodds: V(14.5, top, MC - 1.2),
  };
}

export function buildMontaukSet() {
  const SX = 96, SY = 40, SZ = 110, FY = 4;
  const world = new World(SX, SY, SZ), deco = new Decorations(), shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, 7171), W = world;
  k.floor(0, 0, SX - 1, SZ - 1, FY, B.grass, 4);
  const shore = (z) => 18 + Math.round(Math.sin(z * 0.15) * 2);
  for (let z = 0; z < SZ; z++) {
    const s = shore(z);
    for (let x = 0; x < s + 10; x++) {
      if (x < s) { for (let y = FY - 3; y < FY; y++) W.set(x, y, z, B.water); W.set(x, FY - 4, z, B.sand); }
      else { W.set(x, FY - 1, z, B.sand); if (x > s + 4 && k.chance(0.25)) deco.add('reeds', x + 0.5, FY, z + 0.5, { scale: 1 }); }
    }
    // dunes
    for (let x = s + 6; x < s + 10; x++) if (Math.sin(z * 0.4 + x) > 0.3) W.set(x, FY, z, B.sand);
  }
  // the cabin on the dunes: old planks, a porch, a light in the window
  const CX0 = 34, CX1 = 42, CZ0 = 52, CZ1 = 59;
  W.fill(CX0, FY - 1, CZ0, CX1, FY - 1, CZ1, B.floor_boards);
  k.room(CX0, CZ0, CX1, CZ1, FY, 4, B.old_plank, { trim: B.dark_planks, doors: [{ side: 'w', at: 55, width: 1, height: 3 }] });
  W.set(CX0, FY + 1, 53, B.window_day); W.set(CX0, FY + 1, 58, B.window_day); W.set(CX1, FY + 1, 55, B.window_day);
  gable(k, CX0, CZ0, CX1, CZ1, FY + 4, B.roof_slate, { axis: 'x', end: B.old_plank });
  for (let zz = 53; zz <= 58; zz++) for (let x = CX0 - 3; x < CX0; x++) W.set(x, FY - 1, zz, B.old_plank);
  W.addLight(CX0 + 2, FY + 2, 55.5, 0xffc070, 5, 10);
  W.addLight(CX0 - 1.5, FY + 2.5, 55.5, 0xffb060, 3, 8);
  // the road inland: from the cabin east, then north to the hill
  const lay = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2); for (let s = 0; s <= n; s++) { const px = ax + (bx - ax) * s / n, pz = az + (bz - az) * s / n; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.hypot(dx, dz) <= 2.2) W.set(Math.floor(px + dx), FY - 1, Math.floor(pz + dz), B.dirt_road); } } };
  const road = [[46, 62], [60, 64], [74, 60], [82, 48], [84, 32], [83, 25]];   // (ends a few metres short of the hill's foot, z ≈ 21: the car parks there)
  lay(road);
  for (let i = 0; i < 30; i++) { const x = 46 + Math.floor(k.r() * 48), zz = Math.floor(k.r() * SZ); if (W.get(x, FY - 1, zz) === B.grass) deco.add('tall_grass', x + 0.5, FY, zz + 0.5, { scale: 1.2 }); }
  for (let zz = 66; zz < 100; zz += 3) for (let x = 50; x < 92; x++) if (W.get(x, FY - 1, zz) === B.grass) W.set(x, FY - 1, zz, B.farm_soil);
  deco.prop('fence', 70, FY, 67.5, { len: 30 });
  for (const [x, zz] of [[52, 40], [90, 70], [58, 80], [72, 92], [88, 88]]) pine(k, x, zz, FY, { h: 8 + Math.floor(k.r() * 4) });
  // the hill and the great pine (where the drive ends)
  const HX = 78, HZ = 12;
  for (let zz = 0; zz < 26; zz++) for (let x = 64; x < 94; x++) { const d = Math.hypot(x - HX, (zz - HZ) * 1.2); const hh = Math.max(0, Math.min(5, Math.round(5.5 - d / 2.4))); for (let i = 0; i < hh; i++) W.set(x, FY + i, zz, i === hh - 1 ? B.grass : B.dirt); }
  pine(k, HX, HZ - 2, W.groundBelow(HX + 0.5, HZ - 1.5, SY - 1), { h: 14, wide: true, R: 4.6 });
  boulder(k, 70, 20, FY, 1.4);
  world.collectBlockLights();
  const pts = road.map(([x, zz]) => V(x, FY, zz));
  return { world, deco, shafts, kit: k, spawn: V(CX0 - 2, FY, 55.5), stage: V(CX0 - 2, FY, 55.5), FY, door: V(CX0 - 0.5, FY, 55.5), porch: V(CX0 - 2, FY, 55.5), cabin: V((CX0 + CX1) / 2, FY, (CZ0 + CZ1) / 2), road: pts, hill: V(HX, FY + 5, HZ) };
}
