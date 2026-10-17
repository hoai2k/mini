// Manhattan on the morning of the field trip (the prologue, a training
// board): a hand-shaped city corner. On screen the walk goes up-right, then
// up-left, then up-right again: you start at the south end of a short side
// avenue (x 147-165) and walk north up it to a long cross street, west along
// the cross street's north sidewalk to the main avenue, and north up the
// avenue to Yancy Academy, where the yellow school bus waits at the curb.
// The walk teaches the game in three beats (`beats`):
//   walk    (the first dozen metres up the side avenue) a very short quiet
//           stretch to learn moving, ending at a dug-up sidewalk to jump;
//   melee   (from there to x 84) a fight the rest of the way: sewer rats
//           round trash cans at the corner, an alley dumpster, the hot-dog
//           cart and bin bags; they eat and sniff and notice you up close (or
//           when hit), and every few seconds one a fair way off dashes;
//   ranged  (x < 84 and the avenue) rats where shooting first is the obvious
//           move: behind the chain-link fence of a construction lot (they
//           must run round to its gate), up on a dumpster lid and on the
//           sidewalk scaffolding ahead, and single rats out of the drains.
// Brownstones with stoops, a deli, hot-dog carts, taxis (two drive along the
// cross street), a newsstand, a little park and a subway entrance.
//
// Axes as everywhere: +x east, +z south; the camera looks from the
// south-east, so Yancy (north-west) is up the screen. The buildings south and
// east of the walk are kept low so they never hide the heroes.
// Returns the shape loadWorld() takes plus named spots:
//   spawn, bus { pos, yaw, door }, goal (where to stand to board),
//   rats: [{ at, out, beat }] (rat holes and the way out of them),
//   nests: [{ at, n, beat, perch?, notice?, alert?, r?, face? }] (where rats
//   hang around from the start), beats: [{ id, x0, z0, x1, z1 }],
//   trench (the dug-up sidewalk), movers (driving taxis), npcs, route.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { oak } from './rooms.js';
import { t as txt } from '../text_config.js';

export const CITY = { SX: 192, SY: 34, SZ: 104, FY: 4 };
// the avenue (north-south) and the cross street (east-west)
const AV = { x0: 38, x1: 49 }, ST = { z0: 62, z1: 71 };
// the side avenue where you start (north-south, south of the cross street): its west sidewalk, the road, its east sidewalk
const EA = { w0: 147, w1: 151, x0: 152, x1: 160, e0: 161, e1: 165 };
const SWW = { x0: 33, x1: 37 }, SWE = { x0: 50, x1: 54 };   // avenue sidewalks, west and east
const SWN = { z0: 57, z1: 61 }, SWS = { z0: 72, z1: 76 };   // cross street sidewalks, north and south

export function buildManhattan(seed = 1717) {
  const { SX, SY, SZ, FY } = CITY;
  const world = new World(SX, SY, SZ);
  const deco = new Decorations();
  const shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, seed);
  const W = world;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rats = [], npcs = [], nests = [];
  const QUIET = 84;   // the quiet start: south of this line on the side avenue (about 12 m of walking, then the dug-up sidewalk)
  const beatOf = (x, z) => (x > 140 && z > QUIET ? 'walk' : x > 84 && z > 40 ? 'melee' : 'ranged');

  // ------------------------------------------------------------ ground: asphalt, sidewalks
  k.floor(0, 0, SX - 1, SZ - 1, FY, B.sidewalk, 4);
  for (let z = 0; z < SZ; z++) for (let x = AV.x0; x <= AV.x1; x++) W.set(x, FY - 1, z, (x === 43 || x === 44) && z % 6 < 3 && (z < ST.z0 - 2 || z > ST.z1 + 2) ? B.asphalt_line : B.asphalt);
  for (let x = 0; x < SX; x++) for (let z = ST.z0; z <= ST.z1; z++) if (x < AV.x0 || x > AV.x1) W.set(x, FY - 1, z, z === 66 && x % 6 < 3 && (x < AV.x0 - 3 || x > AV.x1 + 3) ? B.asphalt_line : B.asphalt);
  for (let x = AV.x0; x <= AV.x1; x++) for (let z = ST.z0; z <= ST.z1; z++) W.set(x, FY - 1, z, B.asphalt);
  // the side avenue, south from the cross street to the edge of the map, with a crossing over the cross street
  for (let z = ST.z1 + 1; z < SZ - 1; z++) for (let x = EA.x0; x <= EA.x1; x++) W.set(x, FY - 1, z, x === 156 && z % 6 < 3 && z > ST.z1 + 3 ? B.asphalt_line : B.asphalt);
  for (let i = 0; i < 5; i++) for (let x = EA.w0; x <= EA.w1; x++) W.set(x, FY - 1, ST.z0 + i * 2, B.white_trim);
  // zebra crossings at the four sides of the crossroads
  for (let i = 0; i < 6; i++) {
    for (let z = ST.z0 - 3; z <= ST.z0 - 1; z++) W.set(AV.x0 + 1 + i * 2, FY - 1, z, B.white_trim);
    for (let z = ST.z1 + 1; z <= ST.z1 + 3; z++) W.set(AV.x0 + 1 + i * 2, FY - 1, z, B.white_trim);
  }
  for (let i = 0; i < 5; i++) for (const x of [AV.x0 - 3, AV.x0 - 2, AV.x1 + 2, AV.x1 + 3]) W.set(x, FY - 1, ST.z0 + i * 2, B.white_trim);
  // storm drains at the curbs (rats)
  const grate = (x, z, ox, oz) => { W.set(x, FY - 1, z, B.metal_grate); rats.push({ at: V(x + 0.5, FY, z + 0.5), out: V(x + 0.5 + ox, FY, z + 0.5 + oz), kind: 'drain', beat: beatOf(x, z) }); };
  grate(AV.x0, 44, 2, 0); grate(AV.x1, 30, -2, 0); grate(AV.x0, 8, 2, 0); grate(26, ST.z0, 0, 2); grate(AV.x1, 86, -2, 0);
  grate(104, ST.z0, 0, 2); grate(118, ST.z1, 0, -2); grate(90, ST.z0, 0, 2); grate(AV.x1, 52, -2, 0);
  grate(EA.x0, 78, 2, 0); grate(140, ST.z1, 0, -2); grate(132, ST.z0, 0, 2);
  // world edges
  for (let x = 0; x < SX; x++) { W.fill(x, FY, 0, x, FY + 8, 0, B.barrier); W.fill(x, FY, SZ - 1, x, FY + 8, SZ - 1, B.barrier); }
  for (let z = 0; z < SZ; z++) { W.fill(0, FY, z, 0, FY + 8, z, B.barrier); W.fill(SX - 1, FY, z, SX - 1, FY + 8, z, B.barrier); }

  // ------------------------------------------------------------ buildings
  const WIN = [B.window_day, B.window_day, B.window_dark];
  // A row building: a solid block, its front (side f) dressed with windows,
  // a cornice and (stoop) steps up to the door at `door` along the front.
  const building = (x0, z0, x1, z1, f, h, { mat = B.brownstone, door = null, stoop = true, shop = false, tower = false, sign = null } = {}) => {
    W.fill(x0, FY, z0, x1, FY + h - 1, z1, mat);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) W.set(x, FY + h, z, (x === x0 || x === x1 || z === z0 || z === z1) ? B.cornice : B.concrete);
    const along = f === 'n' || f === 's';
    const lo = along ? x0 : z0, hi = along ? x1 : z1;
    const at = (t, y) => (f === 'n' ? [t, y, z0] : f === 's' ? [t, y, z1] : f === 'w' ? [x0, y, t] : [x1, y, t]);
    const out = f === 'n' ? [0, -1] : f === 's' ? [0, 1] : f === 'w' ? [-1, 0] : [1, 0];
    // windows: two tall, in columns, every storey (4 blocks)
    for (let y = FY + (shop ? 4 : 3); y < FY + h - 1; y += 4) for (let t = lo + 1; t < hi; t += 2) {
      const id = WIN[Math.floor(k.r() * WIN.length)];
      W.set(...at(t, y), id); W.set(...at(t, y + 1), id);
    }
    // cornice band and a protruding cornice
    for (let t = lo; t <= hi; t++) { W.set(...at(t, FY + h - 1), B.cornice); const [cx, cy, cz] = at(t, FY + h); W.set(cx + out[0], cy - 1, cz + out[1], B.cornice); }
    if (shop) {
      for (let t = lo + 1; t < hi; t++) { W.set(...at(t, FY), B.shop_window); W.set(...at(t, FY + 1), B.shop_window); W.set(...at(t, FY + 2), B.awning); const [ax, ay, az] = at(t, FY + 3); W.set(ax + out[0], ay - 1, az + out[1], B.awning); }
      W.addLight(...(() => { const [ax, ay, az] = at((lo + hi) / 2, FY + 1); return [ax + 0.5 + out[0] * 1.5, ay + 0.5, az + 0.5 + out[1] * 1.5]; })(), 0xffd090, 3, 8);
    }
    if (door != null) {
      const [dx, dy, dz] = at(door, FY);
      const up = stoop ? 2 : 0;
      for (let y = 0; y < 3; y++) W.set(dx, dy + up + y, dz, y < 2 ? B.dark_planks : B.window_day);
      W.set(dx, dy, dz, mat);
      if (stoop) {
        // steps down from the door to the sidewalk, rails either side
        for (let s = 0; s < 3; s++) {
          const sx = dx + out[0] * (s + 1), sz = dz + out[1] * (s + 1);
          for (let yy = FY; yy < FY + 2 - s; yy++) W.set(sx, yy, sz, B.brownstone);
          for (const side of [-1, 1]) { const rx = sx + (along ? side : 0), rz = sz + (along ? 0 : side); for (let yy = FY; yy < FY + 2 - s; yy++) W.set(rx, yy, rz, B.brownstone); }
        }
        const rail = along ? 0 : Math.PI / 2;
        for (const side of [-1, 1]) deco.prop('stoop_rail', dx + 0.5 + out[0] * 2 + (along ? side * 1.0 : 0), FY + 1, dz + 0.5 + out[1] * 2 + (along ? 0 : side * 1.0), { len: 3, rot: rail });
      }
    }
    if (sign) {
      const [sx, sy, sz] = at((lo + hi) / 2 + 0.5, FY + Math.min(h - 3, 8));
      deco.prop('text_sign', sx + 0.5 + out[0] * 0.56, sy, sz + 0.5 + out[1] * 0.56, { text: sign.text, w: sign.w ?? 6, h: sign.h ?? 1.1, rot: Math.atan2(out[0], out[1]), bg: sign.bg ?? '#1e2a50', fg: sign.fg ?? '#f6e7c0', border: sign.border ?? '#c9963a', oneSided: true });
    }
    if (tower) deco.prop('water_tower', (x0 + x1) / 2 + 0.5, FY + h + 1, (z0 + z1) / 2 + 0.5, { scale: 0.7 });
  };
  // a row of buildings along a front, with a gap (alley) where asked
  const row = (from, to, fixed, f, depth, { hmin, hmax, gaps = [], tall = false, shopAt = [] }) => {
    let t = from;
    while (t <= to) {
      const gap = gaps.find((g) => t >= g[0] && t <= g[1]);
      if (gap) { t = gap[1] + 1; continue; }
      let w = 6 + Math.floor(k.r() * 3);
      const nextGap = gaps.filter((g) => g[0] > t).sort((a, b) => a[0] - b[0])[0];
      const end = Math.min(to, nextGap ? nextGap[0] - 1 : to, t + w - 1);
      w = end - t + 1;
      if (w < 3) { t = end + 1; continue; }
      const h = hmin + Math.floor(k.r() * (hmax - hmin + 1));
      const mat = [B.brownstone, B.brownstone, B.red_brick, B.brownstone, B.plaster][Math.floor(k.r() * 5)];
      const shop = shopAt.some((s) => s >= t && s <= end);
      const [x0, z0, x1, z1] = f === 'e' ? [fixed - depth + 1, t, fixed, end] : f === 'w' ? [fixed, t, fixed + depth - 1, end] : f === 'n' ? [t, fixed, end, fixed + depth - 1] : [t, fixed - depth + 1, end, fixed];
      building(x0, z0, x1, z1, f, h, { mat, door: shop ? null : t + Math.floor(w / 2), stoop: !shop, shop, tower: tall && k.r() < 0.35 });
      t = end + 1;
    }
  };

  // Yancy Academy: red brick and white trim, four storeys, facing the avenue
  const YX0 = 14, YX1 = 32, YZ0 = 5, YZ1 = 34, YH = 16;
  W.fill(YX0, FY, YZ0, YX1, FY + YH - 1, YZ1, B.red_brick);
  for (let z = YZ0; z <= YZ1; z++) for (let x = YX0; x <= YX1; x++) W.set(x, FY + YH, z, x === YX1 || z === YZ0 || z === YZ1 ? B.white_trim : B.roof_slate);
  for (let y = FY; y < FY + YH; y += 4) for (let z = YZ0; z <= YZ1; z++) W.set(YX1, y + 3, z, B.white_trim);
  for (let y = FY + 1; y < FY + YH - 1; y += 4) for (let z = YZ0 + 2; z < YZ1 - 1; z += 3) { if (Math.abs(z - 20) < 3 && y < FY + 4) continue; W.set(YX1, y, z, B.window_day); W.set(YX1, y + 1, z, B.window_day); }
  for (const z of [YZ0, YZ1]) for (let y = FY; y < FY + YH; y++) W.set(YX1, y, z, B.white_trim);
  // the front steps and the double door with columns
  for (let y = FY; y < FY + 3; y++) for (const z of [19, 20, 21]) W.set(YX1, y, z, y < FY + 2 ? B.dark_planks : B.window_day);
  for (const z of [17, 23]) for (let y = FY; y < FY + 6; y++) W.set(YX1 + 1, y, z, B.column);
  for (let z = 17; z <= 23; z++) W.set(YX1 + 1, FY + 6, z, B.white_trim);
  deco.prop('text_sign', YX1 + 1.56, FY + 7.4, 20.5, { text: txt('signs.yancyAcademy'), w: 7, h: 1.2, rot: Math.PI / 2, bg: '#7a1a1a', fg: '#f6e7c0', border: '#e8e0d0', oneSided: true });
  deco.prop('flagpole', YX1 + 2.5, FY, 15.5, { h: 7, color: 0x2a4a9a }); W.set(YX1 + 2, FY, 15, B.barrier);
  for (const z of [16.5, 24.5]) { deco.prop('planter', YX1 + 1.5, FY, z); W.set(YX1 + 1, FY, Math.floor(z), B.barrier); }
  // north of Yancy and the block behind: brownstones
  row(0, 4, YX1, 'e', 18, { hmin: 13, hmax: 16, tall: true });
  W.fill(0, FY, 0, YX0 - 1, FY + 14, SZ > 56 ? 56 : SZ, B.brownstone);   // the backs of the buildings: out of reach
  for (let z = 0; z <= 56; z++) for (let x = 0; x < YX0; x++) W.set(x, FY + 15, z, (x + z) % 9 === 0 ? B.cornice : B.concrete);
  // west side of the avenue below Yancy: brownstones, an alley at z 42-44
  row(36, 56, YX1, 'e', 19, { hmin: 12, hmax: 15, gaps: [[42, 44]], tall: true });
  // the alley: a dead end with bins and a fire escape (rats live here)
  for (let x = YX0; x <= YX1; x++) for (let z = 42; z <= 44; z++) { W.fill(x, FY, z, x, FY + 14, z, 0); W.set(x, FY - 1, z, x % 4 === 0 ? B.cobble : B.concrete); }
  W.fill(YX0 - 1, FY, 41, YX0 - 1, FY + 10, 45, B.red_brick);
  for (const [x, z] of [[17, 42], [21, 44]]) { W.set(x, FY, z, B.crate); deco.prop('trash_can', x + 0.5 + 1, FY, z + 0.5); W.set(x + 1, FY, z, B.barrier); }
  deco.add('road_crack', 24.5, FY + 0.01, 43.5, { mode: 'flat', scale: 1.4 });
  rats.push({ at: V(YX0 + 1.5, FY, 43.5), out: V(SWW.x0 + 1.5, FY, 43.5), kind: 'alley', beat: 'ranged' });
  W.addLight(28.5, FY + 3, 43.5, 0xffc080, 2, 7);

  // east side of the avenue: lower brownstones (they stand between the camera and the walk), a deli on the corner, an alley at z 28-30
  row(0, 41, SWE.x1 + 1, 'w', 16, { hmin: 7, hmax: 9, gaps: [[28, 30]] });
  // the corner: a deli facing the avenue, then a row facing the cross street (where you start)
  building(SWE.x1 + 1, 42, SWE.x1 + 8, 56, 'w', 8, { mat: B.red_brick, shop: true });
  row(SWE.x1 + 9, SX - 6, SWN.z0 - 1, 's', 15, { hmin: 9, hmax: 12, tall: true, gaps: [[66, 82], [125, 130]] });
  // the melee beat's alley on the north side (x 125-130): a dead end with a dumpster and bin bags
  for (let x = 125; x <= 130; x++) for (let z = 42; z < SWN.z0; z++) W.set(x, FY - 1, z, x % 3 === 0 ? B.cobble : B.concrete);
  W.fill(124, FY, 42, 124, FY + 9, SWN.z0 - 1, B.red_brick); W.fill(131, FY, 42, 131, FY + 9, SWN.z0 - 1, B.red_brick);
  deco.prop('dumpster', 127.5, FY, 49.5, { scale: 0.8 }); W.set(127, FY, 49, B.barrier); W.set(128, FY, 49, B.barrier);
  deco.prop('trash_bags', 129.2, FY, 53.4, { n: 6 }); deco.prop('trash_bags', 125.8, FY, 51.5, { n: 4 }); deco.prop('trash_can', 125.6, FY, 54.6);
  W.addLight(127.5, FY + 3.5, 47.5, 0xffc080, 2.2, 7);
  rats.push({ at: V(127.5, FY, 43.5), out: V(127.5, FY, 56.5), kind: 'alley', beat: 'melee' });
  for (let x = SWE.x1 + 1; x <= SWE.x1 + 16; x++) for (let z = 28; z <= 30; z++) { W.fill(x, FY, z, x, FY + 12, z, 0); W.set(x, FY - 1, z, x % 3 === 0 ? B.cobble : B.concrete); }
  W.fill(SWE.x1 + 17, FY, 27, SWE.x1 + 17, FY + 8, 31, B.red_brick);
  deco.prop('trash_can', 62.5, FY, 28.5); W.set(62, FY, 28, B.barrier); W.set(66, FY, 30, B.crate);
  rats.push({ at: V(SWE.x1 + 15.5, FY, 29.5), out: V(SWE.x0 + 1.5, FY, 29.5), kind: 'alley', beat: 'ranged' });
  W.fill(SWE.x1 + 17, FY, 0, SX - 1, FY + 8, 41, B.brownstone);   // behind the east row
  // a deli sign on the corner shop
  deco.prop('text_sign', SWE.x1 + 0.4, FY + 4.4, 49.5, { text: txt('signs.deli'), w: 5, h: 0.9, rot: -Math.PI / 2, bg: '#1a5a2a', fg: '#ffe8a0', oneSided: true });

  // south of the cross street: low brownstones and shops facing it
  row(SWE.x1 + 1, SX - 6, SWS.z1 + 1, 'n', 14, { hmin: 4, hmax: 5, shopAt: [58, 74, 92, 108, 140, 174], gaps: [[EA.w0, EA.e1]] });
  W.fill(SWE.x1 + 1, FY, SWS.z1 + 15, EA.w0 - 1, FY + 5, SZ - 1, B.brownstone); W.fill(EA.e1 + 1, FY, SWS.z1 + 15, SX - 1, FY + 5, SZ - 1, B.brownstone);
  // the side avenue's buildings, low (they stand between the camera and the walk), fronts to the street
  row(SWS.z1 + 1, SZ - 2, EA.w0 - 1, 'e', 12, { hmin: 4, hmax: 5, shopAt: Array.from({ length: SZ }, (_, z) => z) });   // (shopfronts: no stoops on the sidewalk you walk)
  row(SWS.z1 + 1, SZ - 2, EA.e1 + 1, 'w', 12, { hmin: 4, hmax: 5 });
  // the side avenue's south end: closed for roadworks (where you start)
  for (let x = EA.w0; x <= EA.e1; x++) { W.set(x, FY, SZ - 2, B.barrier); if (x % 3 === 0) deco.prop('cone', x + 0.5, FY, SZ - 2.5); }
  for (let x = EA.x0 + 1; x <= EA.x1; x += 3) deco.prop('sawhorse', x + 0.5, FY, SZ - 3.3);
  // the east end of the street: closed for roadworks (low, so it never hides the heroes from the camera)
  for (let z = SWN.z0 - 1; z <= SWS.z1 + 1; z++) { W.set(SX - 4, FY, z, B.barrier); if (z % 3 === 0) deco.prop('cone', SX - 4.5, FY, z + 0.5); }
  for (let z = SWN.z0 + 1; z <= SWS.z1; z += 3) deco.prop('sawhorse', SX - 3.5, FY, z + 0.5, { rot: Math.PI / 2 });
  W.fill(SX - 3, FY, SWN.z0 - 15, SX - 2, FY + 1, SWS.z1 + 14, B.brownstone);
  // The construction lot on the north side (x 66-82, the ranged beat): a chain-link
  // fence along the sidewalk (shots fly through it, rats don't) with its gate at
  // the west end. Rats sniff round the dumpster and the pallets inside: they see
  // you through the fence, up the screen, and have to run round to the gate.
  { const x0 = 66, x1 = 82, z0 = 44, z1 = SWN.z0 - 1;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { W.fill(x, FY, z, x, FY + 14, z, 0); W.set(x, FY - 1, z, (x * 7 + z * 3) % 5 ? B.dirt : B.cobble); }
    W.fill(x0, FY, z0 - 1, x1, FY + 6, z0 - 1, B.red_brick);
    for (let x = x0 + 3; x <= x1; x++) { W.set(x, FY, z1, B.fence_barrier); W.set(x, FY + 1, z1, B.fence_barrier); }
    for (let x = x0 + 3; x < x1; x += 4) deco.prop('chain_fence', x + 2, FY, z1 + 0.5, { len: 4 });
    deco.prop('sawhorse', x0 + 1.5, FY, z1 + 1.4, { rot: 0.2 }); deco.prop('cone', x0 + 0.5, FY, z1 + 0.5); deco.prop('cone', x0 + 2.6, FY, z1 + 0.6);
    deco.prop('text_sign', x0 + 9, FY + 2.3, z1 + 0.58, { text: txt('signs.hardHat'), w: 3.4, h: 0.6, bg: '#f2efe6', fg: '#c4302a', border: '#c4302a', greek: true, near: 12 });
    // inside: a dumpster (a rat sits on the lid), pallets, a sand pile, bin bags
    deco.prop('dumpster', 72, FY, 50.5, { scale: 0.8 }); W.set(71, FY, 50, B.barrier); W.set(72, FY, 50, B.barrier);
    for (const [x, z] of [[78, 52], [79, 52], [78, 53]]) W.set(x, FY, z, B.crate);
    for (let x = 76; x <= 80; x++) for (let z = 45; z <= 47; z++) W.set(x, FY, z, B.sand);
    W.set(77, FY + 1, 46, B.sand); W.set(78, FY + 1, 46, B.sand);
    deco.prop('trash_bags', 69.5, FY, 53.2, { n: 5 }); deco.prop('cone', 74.5, FY, 47.5); deco.prop('cone', 68.5, FY, 46.5);
    W.addLight(74.5, FY + 4, 50.5, 0xffd890, 2.5, 10);
    nests.push({ at: V(70, FY, 52.4), n: 2, beat: 'ranged', notice: 12, alert: 1.2, r: 1.4, face: V(69.5, FY, 53.2) });
    nests.push({ at: V(76.5, FY, 51.5), n: 1, beat: 'ranged', notice: 12, alert: 1.2, r: 1.2 });
    nests.push({ at: V(71.9, FY + 1, 50.5), n: 1, beat: 'ranged', perch: true, notice: 13, alert: 1.3, r: 0.3 });
  }

  // south-west: a little park with a subway entrance
  for (let z = SWS.z1 + 1; z < SZ - 1; z++) for (let x = 1; x < SWW.x0; x++) W.set(x, FY - 1, z, B.grass);
  for (let x = 2; x < SWW.x0 - 1; x += 2) deco.prop('fence', x + 0.5, FY, SWS.z1 + 1.5, { len: 2, scale: 0.7 });
  for (const [x, z] of [[8, 84], [16, 92], [24, 86], [6, 98], [20, 100], [12, 78]]) oak(k, x, z, FY, { h: 4 + Math.floor(k.r() * 2), R: 2.2 });
  for (const [x, z, r] of [[14, 84.5, 0], [22, 95.5, 0], [10, 92.5, Math.PI / 2]]) { deco.prop('bench', x + 0.5, FY, z, { rot: r }); }
  k.scatter(1, SWS.z1 + 2, SWW.x0 - 2, SZ - 2, { density: 0.25, types: ['grass', 'grass', 'tall_grass', 'flower_red', 'flower_yellow'] });
  // the subway entrance (86 St): stairs down into the dark, green railings and globes
  { const x0 = 28, x1 = 31, z0 = 79, z1 = 86;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let y = FY - 4; y < FY + 1; y++) W.set(x, y, z, 0);
    for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) if (x === x0 - 1 || x === x1 + 1 || z === z1 + 1) { for (let y = FY - 5; y < FY; y++) W.set(x, y, z, B.subway_tile); W.set(x, FY, z, z === z0 - 1 ? 0 : B.barrier); }
    for (let i = 0; i < 4; i++) for (let x = x0; x <= x1; x++) for (let z = z0 + i * 2; z <= z1; z++) W.set(x, FY - 2 - i, z, B.subway_floor);
    for (let x = x0; x <= x1; x++) for (let y = FY - 5; y < FY - 2; y++) W.set(x, y, z1 + 1, B.metal_grate);
    for (const x of [x0 - 1, x1 + 1]) deco.prop('stoop_rail', x + 0.5, FY, (z0 + z1) / 2 + 0.5, { len: z1 - z0 + 1 });
    deco.prop('subway_globe', x0 - 0.5, FY, z0 - 0.5); deco.prop('subway_globe', x1 + 1.5, FY, z0 - 0.5);
    for (const [x, z] of [[x0 - 1, z0 - 1], [x1 + 1, z0 - 1]]) W.set(x, FY, z, B.barrier);
    deco.prop('text_sign', (x0 + x1) / 2 + 1, FY + 1.6, z0 - 0.7, { text: txt('signs.subway86'), w: 4, h: 0.7, post: 0, bg: '#1a1a1e', fg: '#ffffff', border: '#3e7a4e', oneSided: true, rot: Math.PI });
    W.addLight((x0 + x1) / 2 + 0.5, FY - 2, z1 - 1, 0x9adfff, 2.5, 7);
    rats.push({ at: V((x0 + x1) / 2 + 0.5, FY - 4, z1 - 0.5), out: V((x0 + x1) / 2 + 0.5, FY, z0 - 2), kind: 'subway' });
  }
  // the north side of the cross street west of the avenue: the corner of the alley block already fills it (rows above)

  // ------------------------------------------------------------ street furniture
  const streetlight = (x, z, rot) => { deco.prop('streetlight', x + 0.5, FY, z + 0.5, { rot }); W.set(x, FY, z, B.barrier); };
  for (let z = 6; z < 56; z += 12) { if (z < 26 || z > 40) streetlight(SWW.x1, z, 0); streetlight(SWE.x0, z + 6, Math.PI); }
  for (let x = 58; x < SX - 8; x += 12) { if (x > 84 && (x < EA.w0 || x > EA.e1)) streetlight(x, SWS.z0, Math.PI / 2); streetlight(x + 6, SWN.z1, -Math.PI / 2); }
  for (let z = 80; z < SZ - 4; z += 10) { streetlight(EA.w1, z, 0); streetlight(EA.e0, z + 5, Math.PI); }
  for (const [x, z] of [[SWW.x0 + 1, 10], [SWE.x1 - 1, 14], [SWE.x1 - 1, 40], [100, SWS.z1 - 1], [124, SWS.z1 - 1], [174, SWS.z1 - 1], [158, SWN.z0 + 1], [178, SWN.z0 + 1], [EA.e1 - 1, 92], [EA.e1 - 1, 81]]) {
    oak(k, x, z, FY, { h: 4, R: 1.7 });
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (W.get(x + dx, FY - 1, z + dz) === B.sidewalk) W.set(x + dx, FY - 1, z + dz, B.dirt);
  }
  const prop = (kind, x, z, o = {}, solid = true) => { deco.prop(kind, x + 0.5, FY, z + 0.5, o); if (solid) W.set(x, FY, z, B.barrier); };
  prop('hydrant', SWW.x1, 27); prop('hydrant', 98, SWS.z0); prop('mailbox', SWE.x0, 58); prop('trash_can', SWW.x1, 56);
  prop('trash_can', 88, SWS.z0 + 2); prop('bike_rack', 96, SWS.z1 - 1, { rot: 0 }); prop('newsstand', SWW.x0 + 1, 60, { rot: Math.PI / 2 });
  W.set(SWW.x0 + 1, FY, 59, B.barrier); W.set(SWW.x0 + 1, FY, 61, B.barrier);
  // the hot-dog cart on the corner, with its vendor
  prop('hotdog_cart', SWE.x0 + 2, SWS.z0 + 1, { rot: Math.PI }); W.set(SWE.x0 + 1, FY, SWS.z0 + 1, B.barrier); W.set(SWE.x0 + 3, FY, SWS.z0 + 1, B.barrier);
  npcs.push({ id: 'tourist', pos: V(SWE.x0 + 2.5, FY, SWS.z0 + 2.6), yaw: Math.PI, idle: 'vendor' });
  deco.prop('traffic_light', SWW.x1 + 0.5, FY, ST.z0 - 1.5, { rot: 0 }); W.set(SWW.x1, FY, ST.z0 - 2, B.barrier);
  deco.prop('traffic_light', SWE.x0 + 0.5, FY, ST.z1 + 1.5, { rot: Math.PI }); W.set(SWE.x0, FY, ST.z1 + 1, B.barrier);
  deco.add('road_crack', 45.5, FY + 0.01, 38.5, { mode: 'flat', scale: 2 }); deco.add('road_crack', 70.5, FY + 0.01, 66.5, { mode: 'flat', scale: 1.6 });
  for (let i = 0; i < 26; i++) { const x = 2 + k.r() * (SX - 4), z = 2 + k.r() * (SZ - 4); const id = W.get(Math.floor(x), FY - 1, Math.floor(z)); if ((id === B.sidewalk || id === B.asphalt) && !W.get(Math.floor(x), FY, Math.floor(z))) deco.add('paper', x, FY, z, { mode: 'flat', scale: 0.5 }); }

  // ------------------------------------------------------------ the walk to the bus, beat by beat
  // walk: the dug-up sidewalk across the side avenue's west sidewalk (z 81-83): a step down, a deeper trench, a step up. Jump it.
  const TZ = 82, trench = V(EA.w0 + 2.5, FY, TZ + 0.5);
  for (let x = EA.w0; x <= EA.w1; x++) { W.set(x, FY - 1, TZ - 1, 0); W.set(x, FY - 1, TZ, 0); W.set(x, FY - 2, TZ, 0); W.set(x, FY - 1, TZ + 1, 0); W.set(x, FY - 3, TZ, B.dirt); W.set(x, FY - 2, TZ - 1, B.dirt); W.set(x, FY - 2, TZ + 1, B.dirt); }
  deco.prop('sawhorse', EA.w1 + 0.7, FY, TZ + 0.5, { rot: Math.PI / 2 }); deco.prop('cone', EA.w1 + 0.6, FY, TZ + 2.7); deco.prop('cone', EA.w1 + 0.6, FY, TZ - 1.7); deco.prop('cone', EA.w0 + 0.2, FY, TZ + 0.5);
  for (let i = 0; i < 4; i++) deco.add('paper', EA.w0 + 1 + (i % 2) * 2, FY, TZ - 2.5 + i * 1.6, { mode: 'flat', scale: 0.4 });
  // melee, from just past the trench: rats round the trash up the side avenue, at the corner and along the north sidewalk
  const can = (x, z) => { deco.prop('trash_can', x + 0.5, FY, z + 0.5); W.set(x, FY, z, B.barrier); };
  can(EA.w0, 78); deco.prop('trash_bags', EA.w0 + 0.3, FY, 76.6, { n: 4 }); W.set(EA.w0, FY, 76, B.barrier);
  nests.push({ at: V(EA.w0 + 1.6, FY, 77.2), n: 2, beat: 'melee', face: V(EA.w0 + 0.5, FY, 77) });
  nests.push({ at: V(EA.e0 + 1.5, FY, 73.6), n: 1, beat: 'melee', r: 1.4 });
  can(EA.w0 - 3, SWN.z1); can(EA.w0 - 1, SWN.z1);
  nests.push({ at: V(EA.w0 - 2, FY, SWN.z1 - 1.2), n: 2, beat: 'melee', face: V(EA.w0 - 2, FY, SWN.z1 + 0.5) });
  deco.prop('trash_bags', 135.5, FY, SWN.z1 + 0.3, { n: 4 }); W.set(135, FY, SWN.z1, B.barrier);
  nests.push({ at: V(135.5, FY, SWN.z1 - 1.3), n: 1, beat: 'melee', face: V(135.5, FY, SWN.z1 + 0.3) });
  nests.push({ at: V(127.5, FY, 52.5), n: 2, beat: 'melee', r: 2, face: V(129.2, FY, 53.4) });
  nests.push({ at: V(127.5, FY, SWN.z0 + 0.8), n: 1, beat: 'melee', r: 1.8 });
  // a second hot-dog cart, its vendor, and rats after the dropped buns
  prop('hotdog_cart', 112, SWN.z0 + 2, { rot: 0 }); W.set(111, FY, SWN.z0 + 2, B.barrier); W.set(113, FY, SWN.z0 + 2, B.barrier);
  npcs.push({ id: 'tourist', pos: V(112.5, FY, SWN.z0 + 1.1), yaw: 0, idle: 'vendor' });
  for (let i = 0; i < 3; i++) deco.add('paper', 111 + i * 1.1, FY, SWN.z0 + 3.6 + (i % 2) * 0.5, { mode: 'flat', scale: 0.35 });
  nests.push({ at: V(112.5, FY, SWN.z1 - 0.4), n: 2, beat: 'melee', r: 1.4, face: V(112.5, FY, SWN.z0 + 2.5) });
  deco.prop('trash_bags', 98.5, FY, SWN.z1 + 0.3, { n: 6 }); W.set(98, FY, SWN.z1, B.barrier);
  nests.push({ at: V(98.5, FY, SWN.z1 - 1.4), n: 2, beat: 'melee', face: V(98.5, FY, SWN.z1 + 0.3) });
  nests.push({ at: V(88.5, FY, SWS.z0 + 3.2), n: 2, beat: 'melee', face: V(88.5, FY, SWS.z0 + 2.5) });
  // ranged, up the avenue: dumpsters ahead on the west sidewalk (a rat on each lid) ...
  const dumpsterZ = (x, z) => { deco.prop('dumpster', x + 0.5, FY, z + 1, { rot: Math.PI / 2, scale: 0.8 }); W.set(x, FY, z, B.barrier); W.set(x, FY, z + 1, B.barrier); };
  dumpsterZ(SWW.x0, 49);
  nests.push({ at: V(SWW.x0 + 0.5, FY + 1, 50), n: 1, beat: 'ranged', perch: true, notice: 11, alert: 1.2, r: 0.2 });
  // ... and sidewalk scaffolding ahead over the west sidewalk (z 28-39): rats up on the deck, three
  // blocks up, see you coming up the avenue; you walk underneath it to the bus
  for (let x = SWW.x0; x <= SWW.x1; x++) for (let z = 28; z <= 39; z++) W.set(x, FY + 2, z, B.metal_grate);
  for (const z of [28, 32, 36, 39]) deco.prop('scaffold_post', SWW.x1 + 0.9, FY, z + 0.5, { h: 2 });   // (thin posts at the curb: nothing to snag on)
  for (let z = 28; z <= 37; z += 3) deco.prop('fence', SWW.x1 + 0.9, FY + 3, z + 1.5, { len: 3, rot: Math.PI / 2, scale: 0.7 });
  nests.push({ at: V(SWW.x0 + 2, FY + 3, 37), n: 2, beat: 'ranged', perch: true, notice: 14, alert: 1.3, r: 0.8 });
  nests.push({ at: V(SWW.x0 + 2, FY + 3, 34.5), n: 1, beat: 'ranged', perch: true, notice: 15, alert: 1.3, r: 0.6 });
  nests.push({ at: V(SWW.x1 - 0.6, FY, 55.2), n: 1, beat: 'ranged', face: V(SWW.x1 + 0.5, FY, 56.5) });
  const beats = [
    { id: 'walk', x0: 140, z0: QUIET, x1: SX, z1: SZ },
    { id: 'melee', x0: 84, z0: 40, x1: SX, z1: SZ },
    { id: 'ranged', x0: 0, z0: 0, x1: 84, z1: SZ },
  ];

  // ------------------------------------------------------------ vehicles (groups, see world/vehicles.js) and their footprints
  // The bus: on the west curb in front of Yancy, heading south (its door on the curb side).
  const bus = { pos: V(39.9, FY, 19.5), yaw: -Math.PI / 2 };
  const parked = [   // (parked with the traffic: westbound on the north curb, eastbound on the south)
    { kind: 'taxi', pos: V(48.2, FY, 10), yaw: Math.PI / 2 }, { kind: 'taxi', pos: V(48.2, FY, 38), yaw: Math.PI / 2 },
    { kind: 'car', color: 0x6a2a2a, pos: V(39.9, FY, 50), yaw: -Math.PI / 2 }, { kind: 'taxi', pos: V(39.9, FY, 34), yaw: -Math.PI / 2 },
    { kind: 'car', color: 0x2a5a6a, pos: V(134, FY, ST.z1 - 1.2), yaw: 0 }, { kind: 'taxi', pos: V(78, FY, ST.z0 + 1.2), yaw: Math.PI },
    { kind: 'taxi', pos: V(20, FY, ST.z1 - 1.2), yaw: 0 },
    { kind: 'car', color: 0x7a6a2a, pos: V(172.5, FY, ST.z0 + 1.2), yaw: Math.PI }, { kind: 'taxi', pos: V(EA.x1 - 0.9, FY, 90), yaw: Math.PI / 2 },
    { kind: 'car', color: 0x3a3a6a, pos: V(120, FY, ST.z0 + 1.2), yaw: Math.PI },
  ];
  // taxis that drive along the cross street (east of the avenue), stopping for anyone in front
  const movers = [
    { kind: 'taxi', lane: 65.4, dir: -1, x: 150, from: SX - 8, to: 58, speed: 7 },
    { kind: 'car', color: 0x2a6a4a, lane: 67.9, dir: 1, x: 96, from: 58, to: SX - 8, speed: 6.5 },
  ];
  const footprint = (pos, yaw, len, wid) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let u = -len / 2 + 0.3; u <= len / 2 - 0.3; u += 0.5) for (let v = -wid / 2 + 0.2; v <= wid / 2 - 0.2; v += 0.5) {
      const x = Math.floor(pos.x + u * c + v * s), z = Math.floor(pos.z - u * s + v * c);
      W.set(x, FY, z, B.barrier); W.set(x, FY + 1, z, B.barrier);
    }
  };
  footprint(bus.pos, bus.yaw, 9.8, 2.6);
  for (const p of parked) footprint(p.pos, p.yaw, 4.4, 1.9);
  // where to stand to board: the door is on the bus's right (+z local) near the front
  const c = Math.cos(bus.yaw), s = Math.sin(bus.yaw);
  const door = V(bus.pos.x + 2.3 * c + 1.9 * s, FY, bus.pos.z - 2.3 * s + 1.9 * c);
  door.x = Math.min(door.x, SWW.x1 + 0.6);

  // people on the way: the class heading for the bus, Mrs. Dodds at the door
  npcs.push({ id: 'teacher', pos: V(door.x - 1.2, FY, door.z + 1.4), yaw: Math.PI / 2, idle: 'stare' });
  npcs.push({ id: 'student', pos: V(SWW.x0 + 2, FY, 24), yaw: 0, idle: 'wait' });
  npcs.push({ id: 'student', pos: V(SWW.x0 + 1.2, FY, 26.5), yaw: Math.PI * 0.8, idle: 'wait' });
  npcs.push({ id: 'student', pos: V(SWW.x0 + 3, FY, 52), yaw: Math.PI, walk: V(SWW.x0 + 3, FY, 25), idle: 'walk' });
  npcs.push({ id: 'student', pos: V(door.x - 0.4, FY, door.z + 3.2), yaw: Math.PI, idle: 'wait' });
  npcs.push({ id: 'old_lady', pos: V(100, FY, SWS.z0 + 2), yaw: -Math.PI / 2, walk: V(150, FY, SWS.z0 + 2), idle: 'walk' });
  npcs.push({ id: 'student', pos: V(78, FY, SWN.z0 + 1.5), yaw: -Math.PI / 2, walk: V(56, FY, SWN.z0 + 1.5), idle: 'walk' });
  npcs.push({ id: 'tourist', pos: V(SWE.x0 + 2, FY, 52), yaw: 0, idle: 'photo' });
  // the quiet start up the side avenue: a late student hurrying north, people on the far sidewalk
  npcs.push({ id: 'student', pos: V(EA.w0 + 3.5, FY, 95), yaw: Math.PI, walk: V(EA.w0 + 3.5, FY, 86), idle: 'walk' });
  npcs.push({ id: 'salesman', pos: V(EA.e0 + 2, FY, 76), yaw: 0, walk: V(EA.e0 + 2, FY, 98), idle: 'walk' });
  npcs.push({ id: 'old_lady', pos: V(EA.e1 - 0.8, FY, 94), yaw: -Math.PI / 2, idle: 'wait' });
  npcs.push({ id: 'farmer', pos: V(136, FY, SWS.z0 + 2), yaw: Math.PI / 2, walk: V(116, FY, SWS.z0 + 2), idle: 'walk' });
  npcs.push({ id: 'tourist', pos: V(172, FY, SWS.z1 - 1), yaw: -Math.PI / 2, idle: 'photo' });

  world.collectBlockLights();
  // you start at the south end of the side avenue, on its west sidewalk, late for the bus
  const spawn = V(EA.w0 + 2.5, FY, SZ - 7.5);
  const route = [spawn.clone(), V(EA.w0 + 2.5, FY, SWN.z0 + 2.5), V(56, FY, SWN.z0 + 2.5), V(SWW.x0 + 2.5, FY, SWN.z1 - 1), V(SWW.x0 + 2.5, FY, 30), door.clone()];
  return { world, deco, shafts, kit: k, spawn, stage: spawn.clone(), bus, parked, movers, door, goal: door.clone(), rats, nests, beats, trench, npcs, route, city: true };
}
