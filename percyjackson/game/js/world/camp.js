// Camp Half-Blood: the hub. A sunny Long Island valley with the sea along the
// west edge, Half-Blood Hill and Thalia's pine in the north-west, the blue
// Big House, twelve cabins in a U around the green, the dining pavilion, the
// amphitheatre, the arena, the archery range, the lava climbing wall, the
// forge, the camp store, the canoe lake, the strawberry fields and the woods
// with the creek. Returns the same shape as buildTestRoom() plus named spots.
//
// Axes: +x east, +z south. The camera looks from the south-east, so the far
// (top of screen) side is the north-west: the hill, the Big House, the sea.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { pine, oak, column, gable, scatterOn, boulder } from './rooms.js';

export const FY = 8;            // ground surface height
const SX = 116, SY = 40, SZ = 120;

// Cabin looks (simplified blocky versions of the books' cabins).
const CABINS = {
  zeus: { wall: B.marble_white, alt: B.lightning_stone, roof: B.marble_white, ridge: B.bronze, trim: B.bronze, h: 5, portico: B.bronze, emblem: 'em_zeus', run: 2 },
  hera: { wall: B.marble_white, roof: B.roof_terracotta, trim: B.gold_plate, h: 5, portico: B.column, emblem: 'em_hera', run: 2 },
  poseidon: { wall: B.sea_stone, roof: B.sea_stone, trim: B.teal_panel, h: 3, flat: true, emblem: 'em_poseidon', shells: true },
  demeter: { wall: B.planks, roof: B.grass_roof, trim: B.log, h: 4, emblem: 'em_demeter', flowers: true },
  ares: { wall: B.red_plank, roof: B.roof, trim: B.dark_planks, h: 4, emblem: 'em_ares', barbed: true },
  athena: { wall: B.owl_stone, roof: B.roof_slate, trim: B.white_trim, h: 4, emblem: 'em_athena' },
  apollo: { wall: B.gold_plate, roof: B.roof_terracotta, trim: B.white_trim, h: 4, emblem: 'em_apollo' },
  artemis: { wall: B.silver_plate, roof: B.navy_panel, trim: B.silver_plate, h: 4, emblem: 'em_artemis' },
  hephaestus: { wall: B.iron_plate, roof: B.iron_plate, trim: B.bronze, h: 4, emblem: 'em_hephaestus', chimney: true },
  aphrodite: { wall: B.pink_plaster, roof: B.roof_terracotta, trim: B.white_trim, h: 4, emblem: 'em_aphrodite', flowers: true },
  hermes: { wall: B.old_plank, roof: B.dark_planks, trim: B.old_plank, h: 4, emblem: 'em_hermes' },
  dionysus: { wall: B.vine_wall, roof: B.shingle_green, trim: B.log, h: 4, emblem: 'em_dionysus', vines: true },
};

export function buildCamp() {
  const world = new World(SX, SY, SZ);
  const deco = new Decorations();
  const shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, 4242);
  const W = world;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const top = (x, z) => W.groundBelow(x + 0.5, z + 0.5, SY - 1);   // surface height
  const setTop = (x, z, id) => { const y = top(x, z); if (isFinite(y)) W.set(x, y - 1, z, id); };
  const isGround = (id) => id === B.grass || id === B.dirt || id === B.forest_floor;

  // ------------------------------------------------------------ terrain
  k.floor(0, 0, SX - 1, SZ - 1, FY, B.grass, 6);
  const shore = (z) => 15 + Math.round(Math.sin(z * 0.13) * 1.6 + Math.sin(z * 0.37 + 1) * 0.8);
  // Long Island Sound along the west edge: beach, shallows, deeper water
  for (let z = 0; z < SZ; z++) {
    const s = shore(z);
    for (let x = 0; x < s + 5; x++) {
      const d = s - x;   // >0 = in the sea
      for (let y = FY - 6; y < FY; y++) W.set(x, y, z, B.sand);
      if (d > 0) {
        const floorTop = d <= 2 ? FY - 1 : d <= 5 ? FY - 2 : FY - 3;
        for (let y = floorTop; y < FY; y++) W.set(x, y, z, B.water);
      } else if (d > -2) W.set(x, FY - 1, z, B.sand);
    }
    // keep heroes out of the deep water
    W.fill(Math.max(0, s - 6), FY - 3, z, Math.max(0, s - 6), FY + 4, z, B.barrier);
  }
  // world edges: invisible walls
  for (let i = 0; i < SX; i++) { W.fill(i, FY - 3, 0, i, FY + 6, 0, B.barrier); W.fill(i, FY - 3, SZ - 1, i, FY + 6, SZ - 1, B.barrier); }
  for (let i = 0; i < SZ; i++) W.fill(SX - 1, FY - 3, i, SX - 1, FY + 6, i, B.barrier);

  // Half-Blood Hill (north-west) with Thalia's pine on top
  const HX = 30, HZ = 18;
  for (let z = 2; z < 36; z++) for (let x = 12; x < 48; x++) {
    const d = Math.hypot(x - HX, (z - HZ) * 1.1);
    const h = Math.max(0, Math.min(7, Math.round(7.4 - d / 1.85 + Math.sin(x * 0.5 + z * 0.3) * 0.4)));
    if (!h) continue;
    for (let i = 0; i < h; i++) W.set(x, FY + i, z, i === h - 1 ? B.grass : d > 9 && i < h - 1 ? B.rock : B.dirt);
  }
  for (const [x, z, r] of [[22, 12, 1.6], [37, 24, 1.3], [24, 26, 1.2], [34, 9, 1.4]]) boulder(k, x, z, top(x, z) - 1, r);
  const thaliaPine = V(HX, top(HX, HZ), HZ);
  pine(k, HX - 1, HZ - 1, thaliaPine.y, { h: 17, wide: true, R: 5.6 });

  // ------------------------------------------------------------ paths
  const pathLine = (pts, w = 3, id = B.gravel_path) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
      for (let s = 0; s <= n; s++) {
        const px = ax + (bx - ax) * s / n, pz = az + (bz - az) * s / n;
        for (let dz = -w; dz <= w; dz++) for (let dx = -w; dx <= w; dx++) {
          if (Math.hypot(dx, dz) > w / 2) continue;
          const x = Math.floor(px + dx), z = Math.floor(pz + dz);
          const y = top(x, z); if (!isFinite(y)) continue;
          if (isGround(W.get(x, y - 1, z))) W.set(x, y - 1, z, id);
        }
      }
    }
  };
  const rect = (x0, z0, x1, z1, id) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (isGround(W.get(x, FY - 1, z))) W.set(x, FY - 1, z, id); };

  // ------------------------------------------------------------ the Big House
  const BX0 = 46, BX1 = 62, BZ0 = 12, BZ1 = 22, BY = FY + 1;
  W.fill(BX0, FY, BZ0, BX1, FY, BZ1, B.stone_brick);
  // porch floor (wraps the south, west and east sides)
  const porch = [[43, 23, 65, 25], [43, 12, 45, 22], [63, 12, 65, 22]];
  for (const [a, b, c, d] of porch) W.fill(a, FY, b, c, FY, d, B.floor_boards);
  // walls: blue clapboard, white corner boards and storey bands
  W.walls(BX0, BY, BZ0, BX1, BY + 11, BZ1, B.clapboard);
  for (let y = BY; y <= BY + 11; y++) for (const [x, z] of [[BX0, BZ0], [BX1, BZ0], [BX0, BZ1], [BX1, BZ1]]) W.set(x, y, z, B.white_trim);
  for (const yb of [BY + 3, BY + 7, BY + 11]) {
    for (let x = BX0; x <= BX1; x++) { W.set(x, yb, BZ0, B.white_trim); W.set(x, yb, BZ1, B.white_trim); }
    for (let z = BZ0; z <= BZ1; z++) { W.set(BX0, yb, z, B.white_trim); W.set(BX1, yb, z, B.white_trim); }
  }
  for (let s = 0; s < 3; s++) {
    const y = BY + s * 4 + 1;
    for (const x of [48, 50, 58, 60]) for (const z of [BZ0, BZ1]) { W.set(x, y, z, B.window_day); W.set(x, y + 1, z, B.window_day); }
    if (s > 0) for (const x of [53, 55]) { W.set(x, y, BZ1, B.window_day); W.set(x, y + 1, BZ1, B.window_day); }
    for (const z of [14, 17, 20]) for (const x of [BX0, BX1]) { W.set(x, y, z, B.window_day); W.set(x, y + 1, z, B.window_day); }
  }
  // front door with a transom
  for (let y = BY; y < BY + 3; y++) { W.set(53, y, BZ1, B.white_trim); W.set(55, y, BZ1, B.white_trim); }
  W.set(54, BY, BZ1, B.dark_planks); W.set(54, BY + 1, BZ1, B.dark_planks); W.set(54, BY + 2, BZ1, B.window_day);
  // the attic door to the Oracle on the west porch
  W.set(BX0, BY, 15, B.dark_planks); W.set(BX0, BY + 1, 15, B.dark_planks); W.set(BX0, BY + 2, 15, B.white_trim);
  // roof, gable ends, attic windows, chimneys, weathervane
  const ridge = gable(k, BX0, BZ0, BX1, BZ1, BY + 12, B.roof_slate, { axis: 'x', end: B.clapboard });
  for (const x of [BX0, BX1]) for (let y = BY + 13; y <= BY + 14; y++) for (const z of [16, 17, 18]) W.set(x, y, z, z === 17 ? B.white_trim : B.window_day);
  for (const x of [49, 59]) for (let y = BY + 12; y <= ridge + 2; y++) W.set(x, y, 15, B.red_brick);
  deco.prop('weathervane', 54.5, ridge + 1, 17.5, { scale: 1.3 });
  // porch posts, roof and railings
  const postsS = [43, 46, 49, 52, 56, 59, 62, 65];
  for (const x of postsS) for (let y = FY + 1; y <= FY + 3; y++) W.set(x, y, 25, B.white_trim);
  for (const z of [12, 15, 18, 21]) for (let y = FY + 1; y <= FY + 3; y++) { W.set(43, y, z, B.white_trim); W.set(65, y, z, B.white_trim); }
  for (const [a, b, c, d] of porch) {
    for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) {
      const outer = (z === 25) || x === 43 || x === 65;
      W.set(x, FY + 4, z, outer ? B.white_trim : B.roof_slate);
    }
    W.addRoof([a, FY + 4, b], [c, FY + 4, d], [[a, FY, b], [c, FY + 3, d]]);
  }
  for (let i = 0; i < postsS.length - 1; i++) { const a = postsS[i], b = postsS[i + 1]; if (a === 52) continue; deco.prop('fence', (a + b) / 2 + 0.5, FY + 1, 25.5, { len: b - a - 1, white: true, scale: 0.8 }); }
  for (const x of [43.5, 65.5]) for (const z of [13.5, 16.5, 19.5, 22.5]) deco.prop('fence', x, FY + 1, z + 0.5, { len: 2, white: true, rot: Math.PI / 2, scale: 0.8 });
  // porch furniture: the chapter map table, Mr. D's pinochle table, rocking benches
  const mapTable = V(51, FY + 1, 24.4);
  deco.prop('table', 51, FY + 1, 23.9, { len: 2 });
  deco.add('paper', 50.7, FY + 1.95, 23.8, { mode: 'flat', scale: 1.5 }); deco.add('paper', 51.4, FY + 1.95, 24.0, { mode: 'flat', scale: 1.2 });
  W.set(50, FY + 1, 23, B.barrier); W.set(51, FY + 1, 23, B.barrier);
  deco.prop('table', 59.5, FY + 1, 23.9, { len: 2 }); W.set(59, FY + 1, 23, B.barrier); W.set(60, FY + 1, 23, B.barrier);
  for (let i = 0; i < 4; i++) deco.add('paper', 59 + i * 0.3, FY + 1.95, 23.7 + (i % 2) * 0.3, { mode: 'flat', scale: 0.5 });
  deco.prop('bench', 62.5, FY + 1, 24.5); deco.prop('bench', 44.5, FY + 1, 20.5, { rot: Math.PI / 2 });
  deco.prop('lyre', 58.2, FY + 1.9, 24.2, { scale: 0.6 });
  const chiron = V(46.5, FY + 1, 24.2);
  const oracle = V(44.5, FY + 1, 15.5);
  deco.prop('brazier', 44.5, FY + 1, 13.5, { green: true }); W.addLight(44.5, FY + 2.6, 13.5, 0x5aff8a, 3, 6);
  W.set(44, FY + 1, 13, B.barrier);

  // ------------------------------------------------------------ cabins
  const cabinSpots = {};
  const cabin = (god, x0, z0, x1, z1, door) => {
    const S = CABINS[god], h = S.h, y = FY + 1;
    W.fill(x0, FY, z0, x1, FY, z1, B.stone_brick);
    k.room(x0, z0, x1, z1, y, h, S.wall, { alt: S.alt ?? null, altP: 0.3, trim: S.trim });
    for (let yy = y; yy < y + h; yy++) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) W.set(x, yy, z, S.trim);
    const xc = (x0 + x1) >> 1, zc = (z0 + z1) >> 1;
    // windows on the long sides
    if (door === 's') { for (let z = z0 + 2; z < z1; z += 2) for (const x of [x0, x1]) W.set(x, y + 1, z, B.window_day); }
    else for (let x = x0 + 2; x < x1; x += 2) for (const z of [z0, z1]) W.set(x, y + 1, z, B.window_day);
    // door and emblem
    const [dx, dz, fx, fz] = door === 'e' ? [x1, zc, 1, 0] : door === 'w' ? [x0, zc, -1, 0] : [xc, z1, 0, 1];
    W.set(dx, y, dz, B.dark_planks); W.set(dx, y + 1, dz, B.dark_planks);
    if (h > 3) W.set(dx, y + 2, dz, S.trim);
    // roof
    let rz1 = z1, rx1 = x1, rx0 = x0;
    if (S.portico) { // a columned porch in front (Zeus, Hera)
      for (let x = x0; x <= x1; x++) for (let z = z1 + 1; z <= z1 + 2; z++) W.set(x, FY, z, B.marble_white);
      for (const x of [x0, x0 + 2, x1 - 2, x1]) column(k, x, z1 + 2, y, h, { shaft: S.portico });
      rz1 = z1 + 2;
    }
    let ridge;
    if (S.flat) {
      for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) W.set(x, y + h, z, (x === x0 - 1 || x === x1 + 1 || z === z0 - 1 || z === z1 + 1) ? S.trim : S.roof);
      for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 1; x < x1; x++) W.set(x, y + h + 1, z, S.roof);
      ridge = y + h + 1;
    } else ridge = gable(k, rx0, z0, rx1, rz1, y + h, S.roof, { axis: door === 's' ? 'z' : 'x', end: S.wall, run: S.run ?? 1, ridgeId: S.ridge ?? null, eave: S.portico ? 1 : 0 });
    const ey = door === 's' ? ridge - 1.4 : y + h - 1.3;
    const ex = door === 'e' ? x1 + 1.02 : door === 'w' ? x0 - 0.02 : xc + 0.5, ez = door === 's' ? (S.portico ? z1 + 1.02 : z1 + 1.02) : zc + 0.5;
    deco.add(S.emblem, ex, door === 's' ? (S.portico ? ey : y + h - 1.3) : ey, ez, { mode: 'wall', facing: [fx, fz], scale: S.portico ? 1.8 : 1.3, sway: 0 });
    // details
    if (S.chimney) for (let yy = y; yy <= ridge + 2; yy++) W.set(door === 'e' ? x0 + 1 : x1 - 1, yy, z0 + 1, B.red_brick);
    if (S.barbed) for (let t = (door === 's' ? x0 : x0) - 1; t <= x1 + 1; t++) for (const z of [z0 - 1, z1 + 1]) deco.add('barbed_wire', t + 0.5, y + h + 0.5, z + (z < z0 ? 0.0 : 1.0), { mode: 'wall', facing: [0, z < z0 ? -1 : 1], scale: 1, sway: 0 });
    if (S.vines) for (let t = x0 + 1; t < x1; t += 2) for (const z of [z0, z1]) deco.add('vine', t + 0.5, y + 2.5, z + (z === z0 ? -0.02 : 1.02), { mode: 'wall', facing: [0, z === z0 ? -1 : 1], scale: 1.6, sway: 0.2 });
    if (S.shells) for (let i = 0; i < 4; i++) deco.add('shell', dx + fx * 1.5 + (fz ? i - 1.5 : 0) + 0.5, FY, dz + fz * 1.5 + (fx ? i - 1.5 : 0) + 0.5, { mode: 'flat', scale: 0.5 });
    if (S.flowers) for (let i = 0; i < 6; i++) { const t = i - 2.5; deco.add(['flower_red', 'flower_yellow', 'flower_blue'][i % 3], (fx ? dx + fx * 1.3 : xc + t * 1.1) + 0.5, FY, (fz ? dz + fz * 1.3 : zc + t * 1.1) + 0.5, { scale: 0.8 }); }
    const out = S.portico ? 3.5 : 1.5;
    cabinSpots[god] = V(dx + 0.5 + fx * out, FY, dz + 0.5 + fz * out);
  };
  cabin('zeus', 41, 31, 48, 37, 's');
  cabin('hera', 60, 31, 67, 37, 's');
  const armZ = [42, 49, 56, 63, 70];
  ['poseidon', 'ares', 'apollo', 'hephaestus', 'hermes'].forEach((g, i) => cabin(g, 36, armZ[i], 42, armZ[i] + 4, 'e'));
  ['demeter', 'athena', 'artemis', 'aphrodite', 'dionysus'].forEach((g, i) => cabin(g, 66, armZ[i], 72, armZ[i] + 4, 'w'));

  // ------------------------------------------------------------ the green
  rect(41, 40, 67, 41, B.gravel_path); rect(43, 40, 44, 77, B.gravel_path); rect(64, 40, 65, 77, B.gravel_path); rect(43, 76, 65, 77, B.gravel_path);
  pathLine([[54, 26], [54, 82]], 3);
  pathLine([[43, 58], [65, 58]], 3);
    // Hestia's hearth in the middle of the green
  const HC = [54, 58];
  for (let z = HC[1] - 4; z <= HC[1] + 4; z++) for (let x = HC[0] - 4; x <= HC[0] + 4; x++) {
    const d = Math.hypot(x - HC[0], z - HC[1]);
    if (d <= 4.2) W.set(x, FY - 1, z, d > 3.3 ? B.stone_brick : B.cobble);
  }
  deco.prop('campfire', HC[0] + 0.5, FY, HC[1] + 0.5, { scale: 0.9 }); W.addLight(HC[0] + 0.5, FY + 1.3, HC[1] + 0.5, 0xffa040, 4, 9); W.set(HC[0], FY, HC[1], B.barrier);
  for (const [x, z] of [[47, 45], [61, 45], [47, 71]]) oak(k, x, z, FY, { h: 4, R: 2.8 });
  for (const [x, z] of [[49, 52], [59, 64], [49, 64], [59, 52]]) deco.prop('bench_marble', x + 0.5, FY, z + 0.5, { rot: Math.atan2(HC[0] - x, HC[1] - z) + Math.PI / 2 });

  // ------------------------------------------------------------ camp store (west of the cabins)
  {
    const x0 = 26, z0 = 32, x1 = 32, z1 = 38, y = FY + 1;
    W.fill(x0, FY, z0, x1, FY, z1, B.stone_brick);
    k.room(x0, z0, x1, z1, y, 4, B.planks, { trim: B.white_trim, doors: [{ side: 'e', at: 35, width: 3, height: 3 }] });
    for (let yy = y; yy < y + 4; yy++) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) W.set(x, yy, z, B.white_trim);
    for (const z of [33, 37]) W.set(x1, y + 1, z, B.window_day);
    gable(k, x0, z0, x1, z1, y + 4, B.roof_terracotta, { axis: 'x', end: B.planks });
    for (let z = z0; z <= z1; z++) { W.set(x1 + 1, y + 3, z, B.awning); W.set(x1 + 2, y + 2, z, B.awning); }
    k.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, y, B.floor_boards, 1);
    W.addRoof([x0 - 1, y + 4, z0 - 1], [x1 + 1, y + 8, z1 + 1], [[x0, FY, z0], [x1, y + 3, z1]]);
    for (const [x, z] of [[x0 + 1, z0 + 1], [x0 + 1, z0 + 2], [x0 + 1, z1 - 1], [x0 + 2, z1 - 1]]) W.set(x, y, z, B.crate);
    W.set(x0 + 1, y + 1, z0 + 1, B.barrel); W.set(x0 + 1, y, z1 - 2, B.barrel);
    deco.add('camp_banner', x1 + 1.02, y + 1.6, 33.5, { mode: 'wall', facing: [1, 0], scale: 1.6, sway: 0.3 });
    deco.add('camp_banner', x1 + 1.02, y + 1.6, 37.5, { mode: 'wall', facing: [1, 0], scale: 1.6, sway: 0.3 });
    for (const z of [32, 38]) { W.set(x1 + 2, FY, z, B.barrel); }
    deco.prop('signpost', x1 + 3.5, FY, 31.5, { rot: 0.6 });
  }
  const store = V(34.5, FY, 35.5);
  pathLine([[33, 35.5], [38, 37], [42, 40], [44, 40]], 3);
  pathLine([[43, 24], [38, 27], [33, 26], [30, 22]], 2);   // up Half-Blood Hill

  // ------------------------------------------------------------ the canoe lake and the beach
  const LX0 = 20, LX1 = 33, LZ0 = 46, LZ1 = 68;
  for (let z = LZ0 - 1; z <= LZ1 + 1; z++) for (let x = LX0 - 1; x <= LX1 + 1; x++) {
    const nx = (x - (LX0 + LX1) / 2) / ((LX1 - LX0) / 2 + 0.5), nz = (z - (LZ0 + LZ1) / 2) / ((LZ1 - LZ0) / 2 + 0.5);
    const d = Math.hypot(nx, nz) + Math.sin(x * 0.7 + z * 0.4) * 0.05;
    if (d > 1.08) continue;
    if (d > 0.95) { W.set(x, FY - 1, z, B.sand); continue; }
    const depth = d > 0.85 ? 1 : d > 0.6 ? 2 : 3;
    for (let y = FY - depth; y < FY; y++) W.set(x, y, z, B.water);
    W.set(x, FY - depth - 1, z, B.sand);
  }
  for (let x = 27; x <= 34; x++) for (const z of [55, 56]) { W.set(x, FY - 1, z, B.planks); }
  for (const x of [27, 30, 33]) for (const z of [54, 57]) { W.set(x, FY - 1, z, B.log); W.set(x, FY, z, B.log); W.set(x, FY - 2, z, B.log); }
  // the canoes on the water are boats you can stand on (world/boats.js)
  const boats = [
    { kind: 'canoe', x: 25.5, y: FY - 0.18, z: 52.5, rot: 0.4, color: 0xb8452a, paddle: true },
    { kind: 'canoe', x: 24.5, y: FY - 0.18, z: 59.5, rot: -0.3, color: 0x2e8b6e },
    { kind: 'canoe', x: 29.5, y: FY - 0.18, z: 63.5, rot: 1.4, color: 0xf28c28 },
  ];
  deco.prop('canoe', 35.5, FY, 59.5, { rot: Math.PI / 2 + 0.1, color: 0x2a6ad8 });   // pulled up on the shore
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const x = (LX0 + LX1) / 2 + Math.cos(a) * ((LX1 - LX0) / 2 + 0.4), z = (LZ0 + LZ1) / 2 + Math.sin(a) * ((LZ1 - LZ0) / 2 + 0.4); if (k.chance(0.6)) deco.add('reeds', x + 0.5, FY, z + 0.5, { scale: 1.1 }); }
  const canoe = V(35.5, FY, 55.5);
  pathLine([[43, 54.5], [35, 55.5]], 2);
  // beach dressing
  for (let i = 0; i < 40; i++) { const z = Math.floor(k.rnd(30, SZ - 6)), x = shore(z) + Math.floor(k.rnd(0, 4)); if (W.get(x, FY - 1, z) === B.sand && !W.get(x, FY, z)) deco.add('shell', x + 0.5, FY, z + 0.5, { mode: 'flat', scale: 0.45 }); }
  for (const z of [40, 74, 108]) boulder(k, shore(z) + 1, z, FY - 1, 1.3);

  // ------------------------------------------------------------ dining pavilion
  {
    const x0 = 44, z0 = 82, x1 = 64, z1 = 94, y = FY + 1;
    W.fill(x0, FY, z0, x1, FY, z1, B.marble_white);
    for (let x = x0; x <= x1; x++) { W.set(x, FY, z0, B.key_frieze); W.set(x, FY, z1, B.key_frieze); }
    for (let z = z0; z <= z1; z++) { W.set(x0, FY, z, B.key_frieze); W.set(x1, FY, z, B.key_frieze); }
    for (let x = 52; x <= 56; x++) W.set(x, FY, z0, B.marble_white);
    const cols = [];
    for (let x = x0; x <= x1; x += 4) { cols.push([x, z0]); cols.push([x, z1]); }
    for (let z = z0 + 4; z < z1; z += 4) { cols.push([x0, z]); cols.push([x1, z]); }
    for (const [x, z] of cols) column(k, x, z, y, 6);
    for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) { W.set(x, y + 6, z, B.marble_white); W.set(x, y + 5, z, B.vase_frieze); }
    for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) { W.set(x, y + 6, z, B.marble_white); W.set(x, y + 5, z, B.vase_frieze); }
    // pediment on the sea-facing (west) side
    for (let i = 1; i <= 3; i++) for (let z = z0 + 2 * i; z <= z1 - 2 * i; z++) W.set(x0, y + 6 + i, z, B.marble_white);
    // one table per cabin
    for (const tx of [48, 60]) for (const tz of [85, 88, 91]) { deco.prop('table', tx + 0.5, y, tz + 0.5, { len: 4, plates: true }); for (let i = -2; i < 2; i++) W.set(tx + i, y, tz, B.barrier); }
    for (const tz of [85, 91]) { deco.prop('table', 54.5, y, tz + 0.5, { len: 4, plates: true }); for (let i = -2; i < 2; i++) W.set(54 + i, y, tz, B.barrier); }
    deco.prop('brazier', 54.5, y, 88.5, { scale: 1.5 }); W.addLight(54.5, y + 2.6, 88.5, 0xffa040, 5, 11); W.set(54, y, 88, B.barrier);
    for (const [x, z] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) { deco.prop('brazier', x + 0.5, y, z + 0.5); W.addLight(x + 0.5, y + 1.8, z + 0.5, 0xffa040, 2.5, 7); W.set(x, y, z, B.barrier); }
  }

  // ------------------------------------------------------------ strawberry fields (south-west)
  {
    const x0 = 19, z0 = 81, x1 = 40, z1 = 102;
    for (let z = z0; z <= z1; z++) for (let x = Math.max(x0, shore(z) + 4); x <= x1; x++) {
      W.set(x, FY - 1, z, (z - z0) % 3 === 2 ? B.farm_soil : B.strawberry_bed);
      if ((z - z0) % 3 !== 2 && k.chance(0.45)) deco.add('strawberry', x + 0.5, FY, z + 0.5, { scale: 0.9, sway: 0.5 });
    }
    deco.prop('fence', 30, FY, z0 - 0.5, { len: 20 });
    deco.prop('fence', x1 + 1.5, FY, 95, { len: 14, rot: Math.PI / 2 });
    deco.prop('fence', x1 + 1.5, FY, 82.5, { len: 2, rot: Math.PI / 2 });
    for (const [x, z] of [[41, 88], [41, 89], [42, 88]]) W.set(x, FY, z, B.hay);
    deco.prop('signpost', 43.5, FY, 82.5, { rot: -0.4 });
  }
  pathLine([[43, 77], [42, 82], [42, 92], [43, 101]], 2);
  const grover = V(43.5, FY, 101.5);
  deco.prop('lyre', 44.6, FY, 102.2, { scale: 0.7 });

  // ------------------------------------------------------------ amphitheatre and campfire
  const AC = [78, 95];
  for (let z = AC[1] - 12; z <= AC[1] + 12; z++) for (let x = AC[0] - 12; x <= AC[0] + 12; x++) {
    const dx = x - AC[0], dz = z - AC[1], d = Math.hypot(dx, dz);
    if (d > 11.4) continue;
    if (d < 5.2) { W.set(x, FY - 1, z, d < 1.5 ? B.stone : B.cobble); continue; }
    if (dx + dz > 2) { if (d < 7) W.set(x, FY - 1, z, B.cobble); continue; }   // open toward the camera
    const h = d < 6.8 ? 1 : d < 8.3 ? 2 : d < 9.8 ? 3 : 4;
    for (let i = 0; i < h; i++) W.set(x, FY + i, z, i === h - 1 ? B.stone_brick : B.cobble);
  }
  deco.prop('campfire', AC[0] + 0.5, FY, AC[1] + 0.5, { scale: 1.4 });
  W.addLight(AC[0] + 0.5, FY + 1.6, AC[1] + 0.5, 0xff9030, 7, 14); W.set(AC[0], FY, AC[1], B.barrier);
  const campfire = V(AC[0] + 0.5, FY, AC[1] + 3.2);
  pathLine([[65, 77], [70, 84], [74, 92]], 2);

  // ------------------------------------------------------------ the arena (training dummy)
  {
    const x0 = 92, z0 = 66, x1 = 110, z1 = 86;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, FY - 1, z, B.sand);
    k.room(x0, z0, x1, z1, FY, 2, B.stone_brick, { alt: B.mossy_brick, altP: 0.1, trim: B.planks, doors: [{ side: 'w', at: 76, width: 5, height: 2 }] });
    for (const x of [96, 101, 106]) for (const z of [z0, z1]) deco.add('camp_banner', x + 0.5, FY + 2.6, z + (z === z0 ? 1.03 : -0.03), { mode: 'wall', facing: [0, z === z0 ? 1 : -1], scale: 1.8, sway: 0.3 });
    for (const z of [73, 79]) { deco.prop('brazier', x0 - 0.5, FY, z + 0.5); W.addLight(x0 - 0.5, FY + 1.8, z + 0.5, 0xffa040, 2.5, 7); W.set(x0 - 1, FY, z, B.barrier); }
    for (let i = 0; i < 3; i++) { deco.prop('fence', 108.5, FY, 70.5 + i * 2.5, { len: 2, rot: Math.PI / 2, scale: 0.8 }); }
    for (const [x, z] of [[108, 82], [109, 82], [109, 83]]) W.set(x, FY, z, B.barrel);
  }
  const dummy = V(101.5, FY, 76.5);
  pathLine([[65, 76.5], [92, 76.5]], 3);

  // ------------------------------------------------------------ archery range (east)
  {
    const x0 = 82, z0 = 30, x1 = 110, z1 = 46;
    deco.prop('fence', (x0 + x1) / 2 + 0.5, FY, z0 - 0.5, { len: x1 - x0 });
    deco.prop('fence', (x0 + x1) / 2 + 0.5, FY, z1 + 1.5, { len: x1 - x0 });
    for (let z = z0; z <= z1; z++) W.set(x0 + 3, FY - 1, z, B.white_trim);   // shooting line
    for (const z of [32, 36, 40, 44]) { deco.prop('archery_target', 105.5, FY, z + 0.5, { rot: -Math.PI / 2, arrows: z === 36 }); W.set(105, FY, z, B.barrier); W.set(105, FY + 1, z, B.barrier); }
    for (const [x, z] of [[x0 + 1, z0 + 1], [x0 + 1, z0 + 2], [x0 + 2, z0 + 1], [x0 + 1, z1 - 1], [x0 + 1, z1 - 2]]) W.set(x, FY, z, B.hay);
    deco.prop('flagpole', x1 - 1.5, FY, z0 + 1.5, { h: 4, color: 0xffd84a });
  }
  const archery = V(86.5, FY, 38.5);

  // ------------------------------------------------------------ the climbing wall (lava)
  {
    const x0 = 88, z0 = 8, x1 = 98, z1 = 14;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const edge = Math.min(x - x0, x1 - x, z - z0, z1 - z);
      const h = 13 + Math.round(Math.sin(x * 0.9) * 1.5 + Math.cos(z * 1.3) * 1) + (edge > 1 ? 2 : 0);
      W.fill(x, FY, z, x, FY + h, z, B.basalt);
    }
    // lava pours down the south face into a pool at the base
    for (const lx of [92, 93]) { const ht = top(lx, 12) - 1; for (let y = FY; y <= ht; y++) W.set(lx, y, z1 + 1, B.lava); W.set(lx, ht, z1, B.lava); W.set(lx, ht, z1 - 1, B.lava); }
    for (let y = FY + 2; y <= FY + 10; y++) W.set(96, y, z1 + 1, B.lava);
    for (let x = 90; x <= 97; x++) for (let z = z1 + 1; z <= z1 + 4; z++) {
      const rim = x === 90 || x === 97 || z === z1 + 4;
      if (rim) W.set(x, FY, z, B.basalt); else { W.set(x, FY - 1, z, B.lava); W.set(x, FY - 2, z, B.basalt); }
    }
    for (let x = 90; x <= 97; x++) W.set(x, FY - 1, z1 + 4, B.basalt);
    // the summit flag
    deco.prop('flagpole', 94.5, top(94, 11), 11.5, { h: 3, color: 0xf28c28 });
  }
  const climbingWall = V(87.5, FY, 17.5);

  // ------------------------------------------------------------ the forge
  {
    const x0 = 70, z0 = 10, x1 = 80, z1 = 19, y = FY;
    k.floor(x0, z0, x1, z1, y, B.cobble, 1);
    k.room(x0, z0, x1, z1, y, 5, B.red_brick, { trim: B.dark_planks, doors: [{ side: 's', at: 75, width: 5, height: 4 }] });
    for (let yy = y; yy < y + 5; yy++) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) W.set(x, yy, z, B.iron_plate);
    const rt = gable(k, x0, z0, x1, z1, y + 5, B.iron_plate, { axis: 'x', end: B.red_brick });
    for (let yy = y; yy <= rt + 3; yy++) for (const [x, z] of [[77, 11], [78, 11]]) W.set(x, yy, z, B.red_brick);
    W.addRoof([x0 - 1, y + 5, z0 - 1], [x1 + 1, rt, z1 + 1], [[x0, y, z0], [x1, y + 4, z1]]);
    // the hearth: a brick basin of glowing lava
    for (let x = 72; x <= 75; x++) for (let z = 11; z <= 12; z++) W.set(x, y, z, (x === 72 || x === 75) ? B.red_brick : B.lava);
    W.fill(72, y, 13, 75, y, 13, B.red_brick);
    deco.prop('anvil', 75.5, y, 16.5, { rot: 0.3 }); W.set(75, y, 16, B.barrier);
    deco.prop('anvil', 72.5, y, 16.5, { rot: -0.2, scale: 0.8 }); W.set(72, y, 16, B.barrier);
    for (const [x, z] of [[79, 13], [79, 14], [78, 13]]) W.set(x, y, z, B.bronze);
    W.set(79, y, 17, B.barrel); W.set(79, y + 1, 17, B.crate);
    deco.add('em_hephaestus', 75.5, y + 6.2, z1 + 1.04, { mode: 'wall', facing: [0, 1], scale: 1.6, sway: 0 });
  }
  const forge = V(76.5, FY, 15.5);
  pathLine([[65, 21], [70, 23], [75, 22]], 2);
  pathLine([[80, 22], [86, 19]], 2);
  pathLine([[80, 23], [84, 30], [86, 38]], 2);

  // ------------------------------------------------------------ woods, the creek and the hills behind
  // east woods hill (the creek's spring) and the creek down to a pond
  for (let z = 46; z <= 66; z++) for (let x = 104; x < SX - 1; x++) W.fill(x, FY, z, x, FY + 1, z, x === 104 || z === 46 || z === 66 ? B.rock : B.dirt), W.set(x, FY + 1, z, x === 104 ? B.rock : B.forest_floor);
  const creekZ = (x) => 56 + Math.round(Math.sin(x * 0.21) * 1.5);
  for (let x = 74; x < SX - 1; x++) {
    const cz = creekZ(x);
    for (let dz = -1; dz <= 1; dz++) {
      const z = cz + dz;
      if (x >= 104) { W.set(x, FY + 1, z, B.water); W.set(x, FY, z, B.sand); }
      else { W.set(x, FY - 1, z, B.water); W.set(x, FY - 2, z, dz === 0 ? B.water : B.sand); W.set(x, FY - 3, z, B.sand); }
    }
    if (x === 103) for (let dz = -1; dz <= 1; dz++) { W.set(x, FY, cz + dz, B.water); W.set(x, FY + 1, cz + dz, B.water); }
    if (x < 104) for (const dz of [-2, 2]) if (k.chance(0.4)) deco.add('reeds', x + 0.5, FY, cz + dz + 0.5, { scale: 0.9 });
  }
  // the creek pond by the east cabins
  for (let z = 52; z <= 60; z++) for (let x = 74; x <= 80; x++) { const d = Math.hypot((x - 77) / 3.6, (z - 56) / 4.6); if (d > 1) continue; W.set(x, FY - 1, z, d > 0.8 ? B.sand : B.water); if (d <= 0.8) { W.set(x, FY - 2, z, B.water); W.set(x, FY - 3, z, B.sand); } }
  // log bridge and stepping stones over the creek
  for (let dz = -2; dz <= 2; dz++) W.set(88, FY - 1, creekZ(88) + dz, B.pine_log);
  for (const x of [96, 99]) W.set(x, FY - 1, creekZ(x), B.rock);
  pathLine([[65, 54.5], [73, 50], [80, 48], [84, 46]], 2);
  pathLine([[86, 46], [88, 52], [88, 60], [92, 66]], 2, B.dirt);
  // forest floor and trees
  const woods = [[78, 47, 114, 65], [74, 0, 114, 7], [99, 8, 114, 29], [0, 106, 114, 119], [44, 0, 74, 6], [111, 0, 114, 119], [82, 87, 114, 105], [45, 96, 66, 105]];
  const inWoods = (x, z) => woods.some(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d);
  for (const [a, b, c, d] of woods) for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) { const y = top(x, z); if (isFinite(y) && W.get(x, y - 1, z) === B.grass && k.chance(0.8)) W.set(x, y - 1, z, B.forest_floor); }
  const clear = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const y = top(x + dx, z + dz); if (!isFinite(y) || ![B.forest_floor, B.grass, B.dirt].includes(W.get(x + dx, y - 1, z + dz)) || W.get(x + dx, y, z + dz)) return false; } return true; };
  for (let z = 1; z < SZ - 1; z += 4) for (let x = 1; x < SX - 1; x += 4) {
    const px = x + Math.floor(k.rnd(0, 3)), pz = z + Math.floor(k.rnd(0, 3));
    if (!inWoods(px, pz) || !k.chance(0.78) || !clear(px, pz)) continue;
    const y = top(px, pz);
    if (k.chance(0.8)) pine(k, px, pz, y, { h: 8 + Math.floor(k.rnd(0, 6)) }); else oak(k, px, pz, y);
  }
  // pines dotted on the hill and around the camp
  for (const [x, z] of [[20, 30], [38, 14], [24, 8], [16, 40], [17, 76], [43, 6], [68, 26], [83, 22], [66, 80], [90, 50], [36, 104], [27, 104], [70, 40], [76, 70], [86, 60]]) { const y = top(x, z); if (clear(x, z)) pine(k, x, z, y, { h: 7 + Math.floor(k.rnd(0, 5)) }); }
  for (const [x, z] of [[34, 78], [68, 76], [86, 28], [74, 46], [40, 112]]) if (clear(x, z)) oak(k, x, z, top(x, z));
  boulder(k, 94, 100, FY - 1, 1.8); boulder(k, 100, 58, FY + 1, 1.4);

  // ------------------------------------------------------------ ground cover
  scatterOn(k, 0, 0, SX - 1, SZ - 1, [B.grass], ['grass', 'grass', 'tall_grass', 'flower_red', 'flower_yellow', 'flower_blue', 'grass'], 0.12);
  scatterOn(k, 0, 0, SX - 1, SZ - 1, [B.forest_floor], ['fern', 'fern', 'grass', 'leaf_litter', 'mushroom'], 0.22);

  // ------------------------------------------------------------ the capture-the-flag spot
  // (chapter 3 starts at the edge of the camp woods, by the creek)
  const woodsEdge = V(83.5, FY, 50.5);
  deco.prop('flagpole', 86.5, FY, 48.5, { h: 4, color: 0x2a6ad8 }); W.set(86, FY, 48, B.barrier);
  deco.prop('flagpole', 80.5, FY, 46.5, { h: 4, color: 0xd8322a }); W.set(80, FY, 46, B.barrier);
  for (const [x, z] of [[85, 52], [81, 52]]) deco.add('camp_banner', x + 0.5, FY, z + 0.5, { scale: 1.4, sway: 0.4 });

  // ------------------------------------------------------------ the road west
  // The camp is moved NZ blocks south to make room for a strip of Long Island
  // beyond Half-Blood Hill, with the road west winding through it.
  const L = {
    spawn: V(54.5, FY, 29), stage: V(58.5, FY, 66.5), mapTable, chiron, oracle, store, forge, dummy,
    cabins: { percy: cabinSpots.poseidon, tyson: cabinSpots.poseidon, annabeth: cabinSpots.athena, clarisse: cabinSpots.ares, grover: grover.clone(), thalia: cabinSpots.zeus },
    godCabins: cabinSpots, archery, climbingWall, campfire, canoe, thaliaPine, woodsEdge,
  };
  const seen = new Set();
  const shiftV = (v) => { if (v && v.isVector3 && !seen.has(v)) { seen.add(v); v.z += NZ; } };
  for (const v of Object.values(L)) { if (v?.isVector3) shiftV(v); else if (v && typeof v === 'object') for (const u of Object.values(v)) shiftV(u); }
  const world2 = shiftNorth(world, deco, shafts);
  const k2 = new Kit(world2, deco, shafts, 4243);
  const road = buildRoadWest(k2, shore);

  // ------------------------------------------------------------ beyond the edges
  // The sea runs out to the horizon in the west; woods-green land elsewhere.
  const SZ2 = SZ + NZ;
  const plane = (x0, z0, x1, z1, y, color, rough = 0.9, metal = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color, roughness: rough, metalness: metal }));
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; world2.group.add(m);
  };
  plane(-400, -400, 0, SZ2 + 400, FY - 0.2, 0x1f5a74, 0.15, 0.3);
  plane(0, -400, SX + 400, 0, FY - 0.02, 0x3a5a2c);
  plane(SX, 0, SX + 400, SZ2 + 400, FY - 0.02, 0x2c4a26);
  plane(0, SZ2, SX, SZ2 + 400, FY - 0.02, 0x2c4a26);

  world2.collectBlockLights();
  for (const b of boats) b.z += NZ;
  return {
    boats,
    world: world2, deco, shafts, kit: k2, spawn: L.spawn, stage: L.stage,
    mapTable, chiron, oracle, shop: store, store, stash: forge, forge, skills: chiron.clone(), dummy,
    cabins: L.cabins, godCabins: cabinSpots, archery, climbingWall, campfire, canoe, thaliaPine,
    // chapter starts: the edge of the woods (ch3) and the waystones on the road west (ch4-12)
    woodsEdge, ...road.anchors,
  };
}

// The strip north of camp, where the road west runs (z < NZ after the shift).
export const NZ = 64;

// Copy the camp into a world NZ blocks longer, moved NZ blocks south.
function shiftNorth(world, deco, shafts) {
  const W2 = new World(world.sx, world.sy, world.sz + NZ);
  for (let y = 0; y < world.sy; y++) for (let z = 0; z < world.sz; z++) {
    const i = world.idx(0, y, z);
    W2.data.set(world.data.subarray(i, i + world.sx), W2.idx(0, y, z + NZ));
  }
  W2.staticLights = world.staticLights.map((L) => ({ ...L, z: L.z + NZ }));
  W2.roofs = world.roofs.map((r) => ({ ...r, min: [r.min[0], r.min[1], r.min[2] + NZ], max: [r.max[0], r.max[1], r.max[2] + NZ], interior: r.interior.map((q) => [q[0], q[1], q[2] + NZ]) }));
  for (const it of deco.items) it.z += NZ;
  for (const pr of deco.props) pr.z += NZ;
  for (const m of shafts.group.children) m.position.z += NZ;
  return W2;
}

// Beyond Half-Blood Hill: Long Island farmland and the road west, past a waystone
// for every chapter of the quest (New Jersey, St. Louis, Denver, Las Vegas, the
// desert, Los Angeles, Santa Monica and, at the far end, the way to Olympus).
// Returns { anchors: { road1..road9 } }, each a spot on the road.
function buildRoadWest(k, shoreOf) {
  const W = k.w, deco = k.d;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const top = (x, z) => W.groundBelow(x + 0.5, z + 0.5, W.sy - 1);
  const shore = (z) => shoreOf(z - NZ);
  // ---- terrain: grass, the sea and its beach down the west side
  k.floor(0, 0, SX - 1, NZ - 1, FY, B.grass, 6);
  for (let z = 0; z < NZ; z++) {
    const s = shore(z);
    for (let x = 0; x < s + 5; x++) {
      const d = s - x;
      for (let y = FY - 6; y < FY; y++) W.set(x, y, z, B.sand);
      if (d > 0) { const floorTop = d <= 2 ? FY - 1 : d <= 5 ? FY - 2 : FY - 3; for (let y = floorTop; y < FY; y++) W.set(x, y, z, B.water); }
    }
    W.fill(Math.max(0, s - 6), FY - 3, z, Math.max(0, s - 6), FY + 4, z, B.barrier);
  }
  // open the old north edge of camp; new edges round the strip
  const s0 = shore(NZ);
  for (let x = s0 - 3; x < SX - 1; x++) for (let y = FY - 3; y <= FY + 6; y++) if (W.get(x, y, NZ) === B.barrier) W.set(x, y, NZ, y >= FY ? 0 : y === FY - 1 ? (W.get(x, y, NZ + 1) || B.grass) : B.dirt);
  for (let x = 0; x < SX; x++) W.fill(x, FY - 3, 0, x, FY + 6, 0, B.barrier);
  for (let z = 0; z < NZ; z++) W.fill(SX - 1, FY - 3, z, SX - 1, FY + 6, z, B.barrier);
  // the Santa Monica end: a sandy shore in the north-west
  for (let z = 1; z < 22; z++) for (let x = shore(z) + 1; x < 46 - z * 0.6 + Math.sin(z * 0.7) * 1.5; x++) W.set(x, FY - 1, z, B.sand);
  // the Nevada patch: desert sand and red rock in the north-east
  for (let z = 8; z < 32; z++) for (let x = 80; x < SX - 1; x++) { const d = Math.hypot((x - 96) / 15, (z - 19) / 11) + Math.sin(x * 0.5 + z * 0.3) * 0.06; if (d < 1) W.set(x, FY - 1, z, d > 0.9 && (x + z) % 2 ? B.sand : B.desert_sand); }
  for (const [x, z, R, h] of [[106, 13, 2.6, 4], [84, 12, 2, 3], [110, 26, 2.2, 3]]) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const d = Math.hypot(dx, dz); if (d <= R) W.fill(x + dx, FY, z + dz, x + dx, FY + Math.max(0, Math.round(h * (1 - d / (R + 1)))), z + dz, B.red_rock); }

  // ---- the road
  const lay = (pts, w, id, onlyGround = true) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
      for (let s = 0; s <= n; s++) {
        const px = ax + (bx - ax) * s / n, pz = az + (bz - az) * s / n;
        for (let dz = -w; dz <= w; dz++) for (let dx = -w; dx <= w; dx++) {
          if (Math.hypot(dx, dz) > w / 2) continue;
          const x = Math.floor(px + dx), z = Math.floor(pz + dz);
          let y = top(x, z); if (!isFinite(y)) continue;
          while (y > 1 && [B.leaves, B.pine_leaves, 0].includes(W.get(x, y - 1, z))) y--;   // under the branches
          const cur = W.get(x, y - 1, z);
          if (!onlyGround || [B.grass, B.dirt, B.forest_floor, B.sand, B.desert_sand, B.gravel_path, B.rock].includes(cur)) W.set(x, y - 1, z, id);
          // trim low branches over the road
          for (let yy = y; yy < y + 4; yy++) { const b = W.get(x, yy, z); if (b === B.leaves || b === B.pine_leaves) W.set(x, yy, z, 0); }
        }
      }
    }
  };
  const legs = [
    // over the hill from Thalia's pine (around its west side) to the border
    { id: B.gravel_path, pts: [[31, NZ + 23], [26, NZ + 20], [26, NZ + 12], [28, NZ + 5], [31, NZ - 1], [35, 57]] },
    // New Jersey farmland: the bus stop, Aunty Em's, on to St. Louis
    { id: B.dirt_road, pts: [[35, 57], [44, 53], [52, 51], [61, 53], [70, 54], [79, 52], [88, 49]] },
    // the highway west: Denver, Las Vegas, the Nevada desert, Los Angeles
    { id: B.asphalt, pts: [[88, 49], [96, 44], [100, 37], [97, 29], [90, 23], [80, 16], [70, 12], [58, 10], [47, 10]] },
    // the boardwalk at Santa Monica, then the marble way to Olympus
    { id: B.planks, pts: [[47, 10], [37, 12], [30, 16]] },
    { id: B.marble_white, pts: [[30, 16], [26, 22], [24, 28], [24, 33]] },
  ];
  for (const leg of legs) lay(leg.pts, 4, leg.id);
  // telephone poles along the farm road and the highway
  const along = (pts, every, fn) => { let acc = 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const L = Math.hypot(bx - ax, bz - az); for (let t = 0; t < L; t += 1) { acc++; if (acc % every) continue; const px = ax + (bx - ax) * t / L, pz = az + (bz - az) * t / L; fn(px, pz, (bx - ax) / L, (bz - az) / L); } } };
  along(legs[1].pts.concat(legs[2].pts.slice(1, 6)), 9, (px, pz, ux, uz) => { const x = Math.floor(px - uz * 4), z = Math.floor(pz + ux * 4); const y = top(x, z); if (!isFinite(y) || W.get(x, y, z)) return; deco.prop('pole', x + 0.5, y, z + 0.5, { rot: Math.atan2(uz, ux) }); W.set(x, y, z, B.barrier); });

  // ---- farmland inside the loop: a barn, fields, fences, hay
  for (let z = 26; z <= 42; z++) for (let x = 48; x <= 74; x++) if ((z - 26) % 3 !== 2) W.set(x, FY - 1, z, B.farm_soil); else W.set(x, FY - 1, z, B.mud);
  for (let z = 26; z <= 42; z += 3) for (let x = 48; x <= 74; x++) if (k.chance(0.5)) deco.add('tall_grass', x + 0.5, FY, z + 0.5, { scale: 1.2 });
  deco.prop('fence', 61, FY, 24.5, { len: 28 }); deco.prop('fence', 61, FY, 44.5, { len: 28 });
  { const x0 = 78, z0 = 30, x1 = 86, z1 = 36, y = FY; W.fill(x0, FY - 1, z0, x1, FY - 1, z1, B.floor_boards);
    k.room(x0, z0, x1, z1, y, 4, B.barn_red, { trim: B.white_trim, doors: [{ side: 'w', at: 33, width: 3, height: 3 }] });
    const rt = gable(k, x0, z0, x1, z1, y + 4, B.roof_slate, { axis: 'x', end: B.barn_red });
    W.addRoof([x0 - 1, y + 4, z0 - 1], [x1 + 1, rt, z1 + 1], [[x0, y, z0], [x1, y + 3, z1]]);
    for (const [x, z] of [[80, 31], [81, 31], [80, 32], [84, 35], [76, 29], [76, 30], [75, 29]]) W.set(x, FY, z, B.hay); }
  for (const [x, z] of [[18, 44], [42, 40], [44, 28], [64, 18], [76, 60], [94, 58], [108, 52], [58, 62], [12 + 30, 62], [100, 4], [60, 2], [36, 24], [10 + 40, 44]]) { const y = top(x, z); if (isFinite(y) && !W.get(x, y, z) && W.get(x, y - 1, z) === B.grass) (k.chance(0.5) ? pine : oak)(k, x, z, y, { h: 6 + Math.floor(k.rnd(0, 4)) }); }
  scatterOn(k, 0, 0, SX - 1, NZ - 1, [B.grass], ['grass', 'tall_grass', 'flower_yellow', 'grass', 'flower_blue'], 0.1);
  scatterOn(k, 0, 0, SX - 1, NZ - 1, [B.desert_sand], ['dry_grass', 'bone'], 0.05);
  scatterOn(k, 0, 0, SX - 1, NZ - 1, [B.sand], ['shell', 'starfish'], 0.03, 0.5);

  // ---- signs: the border sign and a waystone at every stop
  const sign = (x, z, text, o = {}) => deco.prop('text_sign', x, o.y ?? top(Math.floor(x), Math.floor(z)), z, { text, ...o });
  sign(30.5, NZ - 3.5, 'CAMP HALF-BLOOD\nTHE ROAD WEST', { w: 3.6, h: 1.2, post: 2.2, bg: '#f28c28', fg: '#17130f', border: '#17130f', rot: 0.25 });
  W.set(29, top(29, NZ - 4), NZ - 4, B.barrier); W.set(31, top(31, NZ - 4), NZ - 4, B.barrier);
  // a waystone: a marble pillar with a gold cap, and a signpost with the place's name
  const waystone = (x, z, name, rot = 0, extra = {}) => {
    const y = top(x, z); if (!isFinite(y)) return;
    W.set(x, y, z, B.waystone); W.set(x, y + 1, z, B.waystone);
    W.addLight(x + 0.5, y + 2.4, z + 0.5, 0xffd890, 2.5, 6);
    sign(x + 0.5 + Math.cos(rot) * 2.1, z + 0.5 - Math.sin(rot) * 2.1, name, { w: 3.4, h: 0.95, post: 2.2, rot, ...extra });
    const bx = Math.floor(x + 0.5 + Math.cos(rot) * 2.1), bz = Math.floor(z + 0.5 - Math.sin(rot) * 2.1); W.set(bx, top(bx, bz), bz, B.barrier);
  };
  const solid = (x, z, h = 2) => { const y = top(x, z); for (let i = 0; i < h; i++) W.set(x, y + i, z, B.barrier); };
  const anchors = {};
  const stop = (key, x, z) => { anchors[key] = V(x + 0.5, top(x, z), z + 0.5); };

  // road1: the bus stop past the border, with Argus's van (chapter 4, the Greyhound)
  stop('road1', 37, 56);
  waystone(33, 51, 'NEW JERSEY');
  deco.prop('van', 42.5, top(42, 59), 60.5, { rot: 0.35 }); for (let dx = -2; dx <= 2; dx++) solid(42 + dx, 60, 2);
  sign(46.5, 57.5, 'GREYHOUND', { w: 2.2, h: 0.6, post: 2.2, bg: '#1d3a8a', fg: '#ffffff', border: '#c8ccd2', rot: 0.4 }); solid(46, 57, 1);
  deco.prop('bench', 44.5, top(44, 56), 56.0, { rot: 0.4 });
  // road2: Aunty Em's: gnomes and two stone figures by the verge (chapter 5)
  stop('road2', 52, 51);
  waystone(51, 46, 'AUNTY EM’S', 0, { bg: '#f2efe6', fg: '#c4302a', border: '#3f8a34' });
  for (let i = 0; i < 7; i++) deco.prop('gnome', 47.5 + i * 1.3, top(47 + i, 47), 47.6 + (i % 2) * 0.5, { rot: 0.2 * i, color: [0xd8322a, 0x2a6ad8, 0xffd84a][i % 3] });
  for (const [x, z, pose] of [[56, 46, 0], [58, 47, 4]]) { deco.prop('stone_person', x + 0.5, top(x, z), z + 0.5, { pose, rot: 2.6, scale: 1.1 }); solid(x, z); }
  // road3: a model of the Gateway Arch over a little river (chapter 6)
  stop('road3', 70, 54);
  waystone(66, 49, 'ST. LOUIS');
  deco.prop('arch_model', 72.5, top(72, 46), 46.5, { span: 8, h: 9 }); solid(68, 46); solid(76, 46);
  for (let x = 62; x <= 84; x++) for (let dz = 0; dz < 2; dz++) { const z = 42 + dz + Math.round(Math.sin(x * 0.4)); W.set(x, FY - 1, z, B.water); W.set(x, FY - 2, z, B.sand); }
  // road4: Denver: a water tower and a swan boat on a pond (chapter 7)
  stop('road4', 88, 49);
  waystone(92, 52, 'DENVER', Math.PI);
  deco.prop('water_tower', 96.5, top(96, 55), 56.5, { color: 0x6ac0e0 }); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) solid(96 + dx, 56 + dz, 5);
  k.pond(86, 57, 91, 60, FY, B.water, 1, B.white_trim); deco.prop('swan_boat', 88.5, FY - 0.75, 58.5, { rot: 0.4, scale: 0.8 });
  // road5: Las Vegas: a neon sign, palms and a slot machine (chapter 8)
  stop('road5', 100, 37);
  waystone(104, 40, 'LAS VEGAS', Math.PI, { bg: '#0a3a2a', fg: '#4affa0', border: '#d6aa4a', glow: true });
  sign(107.5, 34.5, 'LOTUS\nHOTEL & CASINO', { w: 3.6, h: 1.6, post: 2.6, bg: '#0a3a2a', fg: '#4affa0', border: '#d6aa4a', glow: true, rot: Math.PI / 2 + 0.3 }); solid(107, 34, 1);
  for (const [x, z] of [[105, 31], [108, 38]]) { deco.prop('palm', x + 0.5, top(x, z), z + 0.5, { h: 5 }); solid(x, z); }
  deco.prop('slot', 104.5, top(104, 34), 34.5, { rot: -Math.PI / 2 }); solid(104, 34, 2);
  W.addLight(106, FY + 3, 35, 0x4affa0, 4, 9);
  // road6: the Nevada desert and Crusty's (chapter 9)
  stop('road6', 90, 23);
  waystone(93, 19, 'NEVADA', 0, { bg: '#f2efe6', fg: '#c4302a', border: '#2ab0c8' });
  for (const [x, z, h] of [[86, 18, 2.2], [98, 24, 1.8], [95, 14, 2.6], [101, 20, 2]]) { deco.prop('cactus', x + 0.5, top(x, z), z + 0.5, { h, rot: x }); solid(x, z, 2); }
  deco.prop('waterbed', 98.5, top(98, 17), 16.5, { swan: true, rot: -0.3 }); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) solid(98 + dx, 16 + dz, 1);
  // road7: Los Angeles: palms and the black door of DOA Recording Studios (chapter 10)
  stop('road7', 70, 12);
  waystone(73, 7, 'LOS ANGELES');
  { const x0 = 64, z0 = 4, y = top(65, 5); for (let x = x0; x <= x0 + 4; x++) for (let yy = y; yy < y + 4; yy++) W.set(x, yy, z0, (x === x0 || x === x0 + 4 || yy === y + 3) ? B.black_marble : B.elevator_door);
    sign(x0 + 2.5, z0 + 1.08, 'DOA', { y: y + 3.1, w: 1.6, h: 0.6, bg: '#0a0a0e', fg: '#e8c870', border: '#c9963a', oneSided: true }); }
  for (const [x, z] of [[60, 6], [77, 14], [80, 9]]) { deco.prop('palm', x + 0.5, top(x, z), z + 0.5, { h: 6 }); solid(x, z); }
  // road8: Santa Monica: the boardwalk, a little Ferris wheel, umbrellas (chapter 11)
  stop('road8', 38, 12);
  waystone(41, 15, 'SANTA MONICA', Math.PI);
  deco.prop('ferris_wheel', 41.5, top(41, 5), 5.5, { r: 3.4 }); for (const dx of [-1, 0, 1]) solid(41 + dx, 5, 3);
  for (const [x, z, col] of [[30, 6, 0xd8322a], [26, 10, 0x2a6ad8], [33, 4, 0xffd84a]]) deco.prop('umbrella', x + 0.5, top(x, z), z + 0.5, { color: col });
  deco.prop('lifeguard_tower', 22.5, top(22, 8), 8.5, { rot: Math.PI / 2 }); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) solid(22 + dx, 8 + dz, 1);
  // road9: the far end: a model of the Empire State Building on clouds, the gate to Olympus (chapter 12)
  stop('road9', 24, 33);
  { const cx = 18, cz = 34, y = top(cx, cz);
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) { const d = Math.hypot(dx, dz); if (d < 4.6) { W.set(cx + dx, FY - 1, cz + dz, d > 3.5 ? B.key_frieze : B.gold_marble); } }
    deco.prop('empire_state', cx + 0.5, y, cz - 0.5, { h: 14, glow: true }); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) solid(cx + dx, cz - 1 + dz, 6);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const x = Math.round(cx + Math.cos(a) * 3.2), z = Math.round(cz + Math.sin(a) * 3.2); if (Math.abs(x - 22) + Math.abs(z - 34) < 3) continue; W.set(x, y, z, B.cloud); if (i % 2) W.set(x, y + 1, z, B.cloud); }
    column(k, 22, 31, y, 5); column(k, 22, 37, y, 5); for (let z = 31; z <= 37; z++) W.set(22, y + 5, z, B.key_frieze);
    W.addLight(cx + 0.5, y + 8, cz + 0.5, 0xffe8a0, 5, 14);
    waystone(27, 37, 'OLYMPUS', Math.PI / 2 + 0.3, { bg: '#f2efe6', fg: '#a8862a', border: '#c9963a' }); }
  return { anchors };
}
