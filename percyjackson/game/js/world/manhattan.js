// Manhattan on the morning of the field trip (the prologue): a hand-shaped
// city corner. You start on the south sidewalk of a cross street, walk west
// to the avenue and north up it to Yancy Academy, where the yellow school bus
// waits at the curb. Brownstones with stoops, a deli, a hot-dog cart, taxis,
// a newsstand, a little park and a subway entrance; sewer rats come out of
// the alleys, the subway stairs and the storm drains.
//
// Axes as everywhere: +x east, +z south; the camera looks from the
// south-east, so Yancy (north-west) is up the screen. The buildings south and
// east of the walk are kept low so they never hide the heroes.
// Returns the shape loadWorld() takes plus named spots:
//   spawn, bus { pos, yaw, door }, goal (where to stand to board),
//   rats: [{ at, out }] (rat holes and the way out of them), npcs, route.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { oak } from './rooms.js';

export const CITY = { SX: 96, SY: 34, SZ: 104, FY: 4 };
// the avenue (north-south) and the cross street (east-west)
const AV = { x0: 38, x1: 49 }, ST = { z0: 62, z1: 71 };
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
  const rats = [], npcs = [];

  // ------------------------------------------------------------ ground: asphalt, sidewalks
  k.floor(0, 0, SX - 1, SZ - 1, FY, B.sidewalk, 4);
  for (let z = 0; z < SZ; z++) for (let x = AV.x0; x <= AV.x1; x++) W.set(x, FY - 1, z, (x === 43 || x === 44) && z % 6 < 3 && (z < ST.z0 - 2 || z > ST.z1 + 2) ? B.asphalt_line : B.asphalt);
  for (let x = 0; x < SX; x++) for (let z = ST.z0; z <= ST.z1; z++) if (x < AV.x0 || x > AV.x1) W.set(x, FY - 1, z, z === 66 && x % 6 < 3 && (x < AV.x0 - 3 || x > AV.x1 + 3) ? B.asphalt_line : B.asphalt);
  for (let x = AV.x0; x <= AV.x1; x++) for (let z = ST.z0; z <= ST.z1; z++) W.set(x, FY - 1, z, B.asphalt);
  // zebra crossings at the four sides of the crossroads
  for (let i = 0; i < 6; i++) {
    for (let z = ST.z0 - 3; z <= ST.z0 - 1; z++) W.set(AV.x0 + 1 + i * 2, FY - 1, z, B.white_trim);
    for (let z = ST.z1 + 1; z <= ST.z1 + 3; z++) W.set(AV.x0 + 1 + i * 2, FY - 1, z, B.white_trim);
  }
  for (let i = 0; i < 5; i++) for (const x of [AV.x0 - 3, AV.x0 - 2, AV.x1 + 2, AV.x1 + 3]) W.set(x, FY - 1, ST.z0 + i * 2, B.white_trim);
  // storm drains at the curbs (rats)
  const grate = (x, z, ox, oz) => { W.set(x, FY - 1, z, B.metal_grate); rats.push({ at: V(x + 0.5, FY, z + 0.5), out: V(x + 0.5 + ox, FY, z + 0.5 + oz), kind: 'drain' }); };
  grate(AV.x0, 44, 2, 0); grate(AV.x1, 30, -2, 0); grate(AV.x0, 8, 2, 0); grate(64, ST.z1, 0, -2); grate(26, ST.z0, 0, 2); grate(AV.x1, 86, -2, 0);
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
  deco.prop('text_sign', YX1 + 1.56, FY + 7.4, 20.5, { text: 'YANCY ACADEMY', w: 7, h: 1.2, rot: Math.PI / 2, bg: '#7a1a1a', fg: '#f6e7c0', border: '#e8e0d0', oneSided: true });
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
  rats.push({ at: V(YX0 + 1.5, FY, 43.5), out: V(SWW.x0 + 1.5, FY, 43.5), kind: 'alley' });
  W.addLight(28.5, FY + 3, 43.5, 0xffc080, 2, 7);

  // east side of the avenue: lower brownstones (they stand between the camera and the walk), a deli on the corner, an alley at z 28-30
  row(0, 41, SWE.x1 + 1, 'w', 16, { hmin: 7, hmax: 9, gaps: [[28, 30]] });
  // the corner: a deli facing the avenue, then a row facing the cross street (where you start)
  building(SWE.x1 + 1, 42, SWE.x1 + 8, 56, 'w', 8, { mat: B.red_brick, shop: true });
  row(SWE.x1 + 9, SX - 2, SWN.z0 - 1, 's', 15, { hmin: 9, hmax: 12, tall: true });
  for (let x = SWE.x1 + 1; x <= SWE.x1 + 16; x++) for (let z = 28; z <= 30; z++) { W.fill(x, FY, z, x, FY + 12, z, 0); W.set(x, FY - 1, z, x % 3 === 0 ? B.cobble : B.concrete); }
  W.fill(SWE.x1 + 17, FY, 27, SWE.x1 + 17, FY + 8, 31, B.red_brick);
  deco.prop('trash_can', 62.5, FY, 28.5); W.set(62, FY, 28, B.barrier); W.set(66, FY, 30, B.crate);
  rats.push({ at: V(SWE.x1 + 15.5, FY, 29.5), out: V(SWE.x0 + 1.5, FY, 29.5), kind: 'alley' });
  W.fill(SWE.x1 + 17, FY, 0, SX - 1, FY + 8, 41, B.brownstone);   // behind the east row
  // a deli sign on the corner shop
  deco.prop('text_sign', SWE.x1 + 0.4, FY + 4.4, 49.5, { text: 'DELI · BAGELS', w: 5, h: 0.9, rot: -Math.PI / 2, bg: '#1a5a2a', fg: '#ffe8a0', oneSided: true });

  // south-east: where you start. Low brownstones facing the cross street, an alley at x 66-68
  row(SWE.x1 + 1, SX - 2, SWS.z1 + 1, 'n', 14, { hmin: 4, hmax: 5, gaps: [[66, 68]], shopAt: [58, 74, 88] });
  for (let x = 66; x <= 68; x++) for (let z = SWS.z1 + 1; z <= SWS.z1 + 13; z++) { W.fill(x, FY, z, x, FY + 10, z, 0); W.set(x, FY - 1, z, B.concrete); }
  W.fill(65, FY, SWS.z1 + 14, 69, FY + 5, SWS.z1 + 14, B.red_brick);
  rats.push({ at: V(67.5, FY, SWS.z1 + 12.5), out: V(67.5, FY, SWS.z0 + 1.5), kind: 'alley' });
  W.fill(SWE.x1 + 1, FY, SWS.z1 + 15, SX - 1, FY + 5, SZ - 1, B.brownstone);
  // the east end of the cross street: more of the city beyond the barrier
  // north side of the cross street east of the avenue: the row's backs already fill it

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
    deco.prop('text_sign', (x0 + x1) / 2 + 1, FY + 1.6, z0 - 0.7, { text: '86 St  ·  SUBWAY', w: 4, h: 0.7, post: 0, bg: '#1a1a1e', fg: '#ffffff', border: '#3e7a4e', oneSided: true, rot: Math.PI });
    W.addLight((x0 + x1) / 2 + 0.5, FY - 2, z1 - 1, 0x9adfff, 2.5, 7);
    rats.push({ at: V((x0 + x1) / 2 + 0.5, FY - 4, z1 - 0.5), out: V((x0 + x1) / 2 + 0.5, FY, z0 - 2), kind: 'subway' });
  }
  // the north side of the cross street west of the avenue: the corner of the alley block already fills it (rows above)

  // ------------------------------------------------------------ street furniture
  const streetlight = (x, z, rot) => { deco.prop('streetlight', x + 0.5, FY, z + 0.5, { rot }); W.set(x, FY, z, B.barrier); };
  for (let z = 6; z < 56; z += 12) { streetlight(SWW.x1, z, 0); streetlight(SWE.x0, z + 6, Math.PI); }
  for (let x = 58; x < 94; x += 12) { streetlight(x, SWS.z0, Math.PI / 2); streetlight(x + 6, SWN.z1, -Math.PI / 2); }
  for (const [x, z] of [[SWW.x0 + 1, 10], [SWW.x0 + 1, 31], [SWW.x0 + 1, 50], [SWE.x1 - 1, 14], [SWE.x1 - 1, 40], [60, SWS.z1 - 1], [74, SWS.z1 - 1], [88, SWS.z1 - 1]]) {
    oak(k, x, z, FY, { h: 4, R: 1.7 });
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (W.get(x + dx, FY - 1, z + dz) === B.sidewalk) W.set(x + dx, FY - 1, z + dz, B.dirt);
  }
  const prop = (kind, x, z, o = {}, solid = true) => { deco.prop(kind, x + 0.5, FY, z + 0.5, o); if (solid) W.set(x, FY, z, B.barrier); };
  prop('hydrant', SWW.x1, 27); prop('hydrant', 63, SWS.z0); prop('mailbox', SWE.x0, 58); prop('trash_can', SWW.x1, 56);
  prop('trash_can', 78, SWS.z0); prop('bike_rack', 84, SWS.z1 - 1, { rot: 0 }); prop('newsstand', SWW.x0 + 1, 60, { rot: Math.PI / 2 });
  W.set(SWW.x0 + 1, FY, 59, B.barrier); W.set(SWW.x0 + 1, FY, 61, B.barrier);
  // the hot-dog cart on the corner, with its vendor
  prop('hotdog_cart', SWE.x0 + 2, SWS.z0 + 1, { rot: Math.PI }); W.set(SWE.x0 + 1, FY, SWS.z0 + 1, B.barrier); W.set(SWE.x0 + 3, FY, SWS.z0 + 1, B.barrier);
  npcs.push({ id: 'tourist', pos: V(SWE.x0 + 2.5, FY, SWS.z0 + 2.6), yaw: Math.PI, idle: 'vendor' });
  deco.prop('traffic_light', SWW.x1 + 0.5, FY, ST.z0 - 1.5, { rot: 0 }); W.set(SWW.x1, FY, ST.z0 - 2, B.barrier);
  deco.prop('traffic_light', SWE.x0 + 0.5, FY, ST.z1 + 1.5, { rot: Math.PI }); W.set(SWE.x0, FY, ST.z1 + 1, B.barrier);
  deco.add('road_crack', 45.5, FY + 0.01, 38.5, { mode: 'flat', scale: 2 }); deco.add('road_crack', 70.5, FY + 0.01, 66.5, { mode: 'flat', scale: 1.6 });
  for (let i = 0; i < 26; i++) { const x = 2 + k.r() * (SX - 4), z = 2 + k.r() * (SZ - 4); const id = W.get(Math.floor(x), FY - 1, Math.floor(z)); if ((id === B.sidewalk || id === B.asphalt) && !W.get(Math.floor(x), FY, Math.floor(z))) deco.add('paper', x, FY, z, { mode: 'flat', scale: 0.5 }); }

  // ------------------------------------------------------------ vehicles (groups, see world/vehicles.js) and their footprints
  // The bus: on the west curb in front of Yancy, heading south (its door on the curb side).
  const bus = { pos: V(39.9, FY, 19.5), yaw: -Math.PI / 2 };
  const parked = [
    { kind: 'taxi', pos: V(48.2, FY, 10), yaw: Math.PI / 2 }, { kind: 'taxi', pos: V(48.2, FY, 38), yaw: Math.PI / 2 },
    { kind: 'car', color: 0x6a2a2a, pos: V(39.9, FY, 50), yaw: -Math.PI / 2 }, { kind: 'taxi', pos: V(39.9, FY, 34), yaw: -Math.PI / 2 },
    { kind: 'car', color: 0x2a5a6a, pos: V(82, FY, ST.z1 - 1.2), yaw: Math.PI }, { kind: 'taxi', pos: V(60, FY, ST.z0 + 1.2), yaw: 0 },
    { kind: 'taxi', pos: V(20, FY, ST.z1 - 1.2), yaw: Math.PI },
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
  npcs.push({ id: 'old_lady', pos: V(70, FY, SWS.z0 + 2), yaw: -Math.PI / 2, walk: V(90, FY, SWS.z0 + 2), idle: 'walk' });
  npcs.push({ id: 'student', pos: V(78, FY, SWN.z0 + 1.5), yaw: -Math.PI / 2, walk: V(56, FY, SWN.z0 + 1.5), idle: 'walk' });
  npcs.push({ id: 'tourist', pos: V(SWE.x0 + 2, FY, 44), yaw: 0, idle: 'photo' });

  world.collectBlockLights();
  // you start on the north sidewalk of the cross street, by a stoop, late for the bus
  const spawn = V(86.5, FY, SWN.z0 + 2.5);
  const route = [spawn.clone(), V(56, FY, SWN.z0 + 2.5), V(SWW.x0 + 2.5, FY, SWN.z1 - 1), V(SWW.x0 + 2.5, FY, 30), door.clone()];
  return { world, deco, shafts, kit: k, spawn, stage: spawn.clone(), bus, parked, door, goal: door.clone(), rats, npcs, route, city: true };
}
