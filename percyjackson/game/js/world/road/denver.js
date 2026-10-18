// Denver (the Road West, chapter 7): the Rockies rise to the north. East to
// west: the Amtrak station, the Roadside Diner where Ares waited (his
// motorcycle out front, his parking space reserved), the Mile High Motor
// Lodge, and across the road Waterland, closed for the season: a gate under
// a big sign, the wave pool, a rusty slide tower, the Tunnel of Love with its
// swan boats. At the west end, the rockslide across the pass (the roadblock)
// and the Mountain Pass Truck Stop, where the zoo truck waits for the tunnel.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';
import { roadside, padMask, clearOf } from './turnpike.js';

const PADS = [
  [598, 50, 662, 86],    // Waterland
  [560, 50, 585, 86],    // the truck stop
  [602, 22, 648, 37],    // the Mile High Motor Lodge
  [660, 23, 684, 37],    // the diner
];

export const terrain = {
  height: (x, z, n) => ((z < 30 ? 4 + (30 - z) * 0.5 : 0) + (n.fbm(x, z, 36, 3) - 0.35) * 8) * (1 - padMask(PADS, x, z, 6)),
  surface: (x, z, h) => (h > 10 ? B.rock : h > 6 ? B.forest_floor : B.grass),
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, trees, rand } = ctx;
  const R = roadside(ctx), S = (key) => t('rt.signs.' + key);
  add.waystone('rt_denver', 660, ROAD_Z - 8);
  add.waystone('rt_truckstop_west', 576, ROAD_Z + 9);

  // ---------------- Waterland: closed for the season
  ctx.flatten(598, ROAD_Z + 6, 662, 86, FY, B.pool_tile);
  R.fill(616, FY - 1, ROAD_Z + 6, 640, FY - 1, ROAD_Z + 15, B.gravel_path);   // the car park in front of the gate
  // the fence: chain link round the park (invisible walls behind it), the gate in the middle of the north side
  const fx0 = 598, fx1 = 661, fz0 = 60, fz1 = 86;
  for (let x = fx0; x <= fx1; x++) for (const z of [fz0, fz1]) if (z !== fz0 || x < 624 || x > 632) { W.set(x, FY, z, B.fence_barrier); W.set(x, FY + 1, z, B.fence_barrier); }
  for (let z = fz0; z <= fz1; z++) for (const x of [fx0, fx1]) { W.set(x, FY, z, B.fence_barrier); W.set(x, FY + 1, z, B.fence_barrier); }
  for (let x = fx0 + 2; x < fx1; x += 4) { if (x < 622 || x > 632) deco.prop('chain_fence', x + 0.5, FY, fz0 + 0.5, { len: 4 }); deco.prop('chain_fence', x + 0.5, FY, fz1 + 0.3, { len: 4 }); }
  for (let z = fz0 + 2; z < fz1; z += 4) for (const x of [fx0, fx1]) deco.prop('chain_fence', x + 0.5, FY, z + 0.5, { len: 4, rot: Math.PI / 2 });
  // the gate: two tiled towers, a beam, the big sign; a chain across with "closed"
  for (const x0 of [622, 633]) for (let x = x0; x <= x0 + 1; x++) for (let z = fz0 - 1; z <= fz0 + 1; z++) for (let y = FY; y < FY + 7; y++) W.set(x, y, z, y === FY + 6 ? B.white_trim : (y + z) % 2 ? B.teal_panel : B.pool_tile);
  R.fill(622, FY + 7, fz0, 634, FY + 7, fz0, B.teal_panel);
  deco.prop('text_sign', 628.5, FY + 8, fz0 + 0.5, { text: S('waterland'), w: 9, h: 2.2, post: 0, bg: '#2a8ac8', fg: '#ffffff', border: '#f2d040' });
  deco.prop('text_sign', 628.5, FY + 0.6, fz0 + 0.5, { text: S('dnClosedSeason'), w: 3.6, h: 0.9, post: 0, bg: '#f2efe6', fg: '#c4302a', border: '#c4302a' });
  // the ticket booth by the car park
  R.building(617, ROAD_Z + 10, 620, ROAD_Z + 13, { h: 3, wall: B.teal_panel, roof: B.white_trim, floor: B.pool_tile, light: false, windows: { id: B.glass, every: 1, sides: 'e' } });
  deco.prop('water_tower', 655.5, FY, ROAD_Z + 10.5, { color: 0x6ac0e0 });
  for (const x of [616, 640]) R.lamp(x, ROAD_Z + 7);
  add.landmark({ id: 'rt_waterland', x: 628, z: 70 });
  // the wave pool (its wave machine long since rusted shut), umbrellas, a lifeguard tower
  k.pond(609, 63, 625, 76, FY, B.water, 2, B.pool_tile);
  for (let x = 609; x <= 625; x++) for (let y = FY; y < FY + 3; y++) W.set(x, y, 78, y === FY + 2 ? B.white_trim : B.rust_metal);
  deco.prop('lifeguard_tower', 627.5, FY, 70.5, { rot: -Math.PI / 2 });
  for (const [x, z, c] of [[612, 61.6, 0xd8322a], [618, 61.6, 0xf2d040], [624, 61.6, 0x2aa8a0]]) deco.prop('umbrella', x + 0.5, FY, z, { color: c });
  for (const [x, r] of [[610, 0.2], [614, -0.3], [620, 1.4], [622, 0.1]]) deco.prop('deck_chair', x + 0.5, FY, 61.8, { rot: Math.PI + r, color: 0x2aa8a0 });
  // the slide tower: rusty legs, a platform, stairs up its side, two slides down into the splash pool
  const tx0 = 600, tx1 = 606, tz0 = 80, tz1 = 84, top = FY + 8;
  for (const [x, z] of [[tx0, tz0], [tx1, tz0], [tx0, tz1], [tx1, tz1]]) for (let y = FY; y < top; y++) W.set(x, y, z, B.rust_metal);
  R.fill(tx0, top, tz0, tx1, top, tz1, B.metal_grate);
  for (let x = tx0; x <= tx1; x++) W.set(x, top + 1, tz1, B.rust_metal);
  for (let z = tz0; z <= tz1; z++) W.set(tx0, top + 1, z, B.rust_metal);
  k.stairs(tx1, tz0 - 9, FY, 9, [0, 1], 2, B.rust_metal);
  k.pond(618, 79, 628, 84, FY, B.water, 2, B.pool_tile);
  for (const sz of [tz0 + 1, tz1 - 1]) for (let i = 0; i <= 11; i++) {
    const x = tx1 + 1 + i, y = top - Math.round(i * 7 / 11);
    W.set(x, y, sz, B.slide_glass);
    if (i % 4 === 2) for (let yy = FY; yy < y; yy++) W.set(x, yy, sz, B.rust_metal);
  }
  deco.prop('text_sign', tx0 + 3.5, top + 1.2, tz1 + 0.6, { text: S('dnSlide'), w: 4.2, h: 0.8, post: 0, bg: '#f2d040', fg: '#c4302a', border: '#c4302a' });
  add.chest({ id: 'rt_denver_slide', x: tx0 + 2, z: tz0 + 2, y: top + 1, rarity: 'rare' });
  // the Tunnel of Love: pink walls, a dark inside, a channel round an island, swan boats
  const lx0 = 636, lx1 = 656, lz0 = 64, lz1 = 82;
  R.building(lx0, lz0, lx1, lz1, { h: 6, wall: B.pink_plaster, trim: B.neon_pink, roof: B.roof_slate, eave: 1, floor: B.pool_tile, light: 0xff5fb0, doors: [{ side: 'w', at: 73, width: 3, height: 4 }] });
  for (let z = lz0 + 1; z < lz1; z++) for (let x = lx0 + 1; x < lx1; x++) {
    const inset = Math.min(x - lx0, lx1 - x, z - lz0, lz1 - z);
    if (inset === 2 || inset === 3) W.set(x, FY - 1, z, B.water);
  }
  for (const [x, z, r] of [[lx0 + 2.5, lz0 + 6, Math.PI / 2], [lx1 - 2.5, lz1 - 5, -Math.PI / 2], [lx0 + 9, lz1 - 2.5, 0], [lx0 + 11, lz0 + 2.5, Math.PI]]) deco.prop('swan_boat', x, FY - 0.75, z, { rot: r });
  for (const [x, z] of [[lx0 + 6, lz0], [lx0 + 14, lz0], [lx0 + 6, lz1], [lx0 + 14, lz1]]) for (const [dx, dy] of [[0, 2], [1, 3], [-1, 3], [0, 1]]) W.set(x + dx, FY + dy, z, B.neon_pink);
  deco.prop('text_sign', lx0 - 0.6, FY + 4.2, 73.5, { text: S('dnTunnelOfLove'), w: 5, h: 1.2, post: 0, glow: true, rot: Math.PI / 2, bg: '#2a0a1a', fg: '#ff5fb0', border: '#ff5fb0' });
  add.chest({ id: 'rt_denver_tunnel', x: 646, z: 73, y: FY, rarity: 'rare', hidden: true });
  add.landmark({ id: 'rt_tunneloflove', x: lx0 - 2, z: 73 });
  // left behind: bins, leaves, a flipped chair
  deco.prop('trash_bags', 632.5, FY, 84.5, { n: 4 }); deco.prop('deck_chair', 633.5, FY, 66.5, { rot: 2.4, color: 0xd8322a });
  ctx.scatter([B.pool_tile], ['leaf_litter', 'puddle'], 0.04);

  // ---------------- north side: the Roadside Diner (Ares's) and the Mile High Motor Lodge
  ctx.flatten(660, 23, 684, 37, FY, B.grass);
  R.fill(660, FY - 1, 34, 684, FY - 1, 37, B.asphalt);
  const dx0 = 663, dx1 = 681, dz0 = 24, dz1 = 32;
  R.building(dx0, dz0, dx1, dz1, {
    h: 4, wall: B.white_trim, trim: B.barn_red, roof: B.roof, eave: 1, floor: (x, z) => ((x + z) % 2 ? B.carpet_red : B.marble_white),
    windows: { id: B.glass, every: 2, sides: 'sew', h: 2 }, doors: [{ side: 's', at: 671, width: 3, height: 3 }],
  });
  for (let x = dx0 + 2; x <= dx1 - 2; x++) { W.set(x, FY, dz0 + 3, B.steel_panel); W.set(x, FY, dz0 + 1, B.iron_plate); }
  for (const x of [dx0 + 3, dx0 + 8, dx0 + 13]) deco.prop('table', x + 0.5, FY, dz1 - 2.5, { len: 2 });
  deco.prop('text_sign', 672.5, FY + 5, dz1 + 1.4, { text: S('dnRoadsideDiner'), w: 6, h: 1.3, post: 0.4, glow: true, bg: '#1a1a1e', fg: '#ff3a2a', border: '#f2d040' });
  add.chest({ id: 'rt_denver_diner', x: dx1 - 2, z: dz0 + 2, y: FY, rarity: 'common' });
  add.landmark({ id: 'rt_diner', x: 672, z: dz1 + 2 });
  // Ares's motorcycle, in his own parking space
  for (const x of [676, 679]) W.set(x, FY, 35, B.obsidian);
  for (let x = 676; x <= 679; x++) W.set(x, FY + 1, 35, x === 677 ? B.barn_red : B.obsidian);
  W.set(679, FY + 2, 35, B.iron_plate); W.set(676, FY + 2, 35, B.barn_red);
  deco.prop('fire', 675.6, FY + 1.2, 35.5, { scale: 0.5 });
  R.roadSign(681, 36, S('dnReservedAres'), { bg: '#c8282a', fg: '#ffffff', border: '#1a1a1e', w: 1.8, h: 1.2, post: 1.4, rot: 0 });
  R.car(666, 35, 0x2a4a8a, Math.PI / 2);
  for (const x of [664, 682]) R.lamp(x, ROAD_Z - 7);
  // the motel
  ctx.flatten(602, 22, 648, 37, FY, B.grass);
  R.fill(602, FY - 1, 33, 648, FY - 1, 37, B.asphalt);
  const motel = R.motel(604, 24, 7, { wall: B.red_brick, trim: B.white_trim, roof: B.roof_slate, face: 's', first: 1 });
  deco.prop('text_sign', 643.5, FY, 35.5, { text: S('dnMileHigh'), w: 4, h: 2.4, post: 4.6, glow: true, bg: '#14202e', fg: '#6ac0e0', border: '#f2d040' });
  W.addLight(643.5, FY + 5.5, 35.5, 0x6ac0e0, 3, 10);
  R.car(612, 35, 0xf2efe6, Math.PI / 2); R.car(631, 35, 0x6a2a2a, Math.PI / 2);
  const [mx, mz] = motel.door(4);
  add.chest({ id: 'rt_denver_motel', x: mx - 1, z: mz, y: FY, rarity: 'common' });
  add.landmark({ id: 'rt_milehigh', x: 622, z: 27 });

  // ---------------- the Mountain Pass Truck Stop (west end, by the tunnel)
  ctx.flatten(560, ROAD_Z + 6, 585, 86, FY, B.asphalt);
  R.canopy(561, ROAD_Z + 12, 571, ROAD_Z + 17, [564, 569], { stripe: B.navy_panel });
  R.building(574, ROAD_Z + 13, 584, ROAD_Z + 22, { h: 5, wall: B.corrugated, trim: B.navy_panel, roof: B.steel_panel, windows: { id: B.shop_window, sides: 'nw', every: 2 }, doors: [{ side: 'n', at: 579, width: 3, height: 3 }, { side: 'w', at: ROAD_Z + 17, width: 1, height: 3 }] });
  for (const z of [ROAD_Z + 15, ROAD_Z + 16]) W.set(583, FY, z, B.vending);
  deco.prop('text_sign', 579.5, FY + 6, ROAD_Z + 13.5, { text: S('truckStop'), w: 6, h: 1.2, post: 0.3, bg: '#2a2a30', fg: '#f2d040', border: '#f2d040' });
  for (const x of [562, 572, 584]) R.lamp(x, ROAD_Z + 7);
  R.semi(561, ROAD_Z + 26, { dir: -1, cab: B.navy_panel, trailer: B.white_trim, text: S('dnKindness'), fg: '#2a6a3a' });
  R.semi(561, ROAD_Z + 32, { dir: -1, cab: B.barn_red, trailer: B.corrugated, open: true });
  R.semi(569, ROAD_Z + 38, { dir: 1, cab: B.teal_panel, trailer: B.steel_panel, text: S('dnLotusTruck'), fg: '#3a8a5a' });
  add.chest({ id: 'rt_denver_truck', x: 571, z: ROAD_Z + 33, y: FY + 2, rarity: 'rare', hidden: true });
  add.landmark({ id: 'rt_mountainpass', x: 579, z: ROAD_Z + 18 });
  R.roadSign(568, ROAD_Z - 7, S('trucksOnly'), { bg: '#f2d040', fg: '#1a1a1e', border: '#1a1a1e', w: 2.6, h: 1.2 });

  // ---------------- billboards, the gantry, signs, mile markers
  R.gantry(600, S('dnGantryL'), S('dnGantryR'));
  R.roadSign(684, ROAD_Z - 7, S('dnCityLimits'), { w: 3.2, h: 1.4 });
  R.billboard(652, 30, S('dnBbLotus'), { bg: '#1a3a2a', fg: '#f2d040', border: '#ff5fb0', glow: true });
  R.billboard(684, 78, S('dnBbWaterland'), { bg: '#2a8ac8', fg: '#ffffff', border: '#f2d040' });
  R.billboard(580, 28, S('dnBbKindness'), { bg: '#f2efe6', fg: '#2a6a3a', border: '#2a6a3a' });
  [[680, 172], [640, 176], [570, 183]].forEach(([x, n]) => R.mile(x, n));

  // ---------------- the mountainside: pines up to the rock, grass
  const keep = clearOf([[584, 0, 596, 88], [596, 48, 664, 87], [558, 48, 587, 87], [600, 20, 650, 38], [658, 21, 686, 38], [648, 26, 656, 34], [576, 24, 584, 32], [668, 50, 686, 70], [680, 74, 688, 82]]);
  R.woods(110, 560, 686, 2, 40, keep, (x, z) => trees.pine(x, z));
  R.woods(25, 596, 686, 50, 86, keep, (x, z) => trees.pine(x, z));
  ctx.scatter([B.grass, B.forest_floor], ['grass', 'fern', 'flower_blue'], 0.07);

  // ---------------- monsters, treasure, Chad (Waterland's last lifeguard)
  add.camp({ id: 'rt_denver_slope', x: 622, z: 18, kinds: ['skeleton', 'hellhound', 'skeleton'], count: 6, chest: 'rare' });
  add.camp({ id: 'rt_denver_waterland', x: 631, z: 79, kinds: ['spider', 'spider', 'hellhound'], count: 6 });
  add.champion({ id: 'rt_denver_rigor', x: 630, z: 66, kind: 'skeleton', level: 7, elite: 'armored' });
  add.chest({ id: 'rt_denver_peak', x: 660, z: 6, rarity: 'rare', hidden: true });
  add.npc({ id: 'rt_denver_chad', x: 621, z: ROAD_Z + 9, model: 'mortal:student', yaw: Math.PI });
  for (const [i, x, z] of [[1, 612, 79], [2, 634, 82], [3, 603, 66], [4, 647, 62], [5, 659, 84]]) add.item({ id: 'rt_denver_floatie_' + i, quest: 'rt_denver_floaties', x, z });
}

export const QUESTS = [
  { id: 'rt_denver_floaties', giver: 'rt_denver_chad',
    steps: [{ type: 'collect', count: 5 }, { type: 'return' }],
    reward: { xp: 320, coins: 110, item: 'common' } },
  { id: 'rt_denver_hounds', giver: 'rt_denver_chad', requires: ['rt_denver_floaties'],
    steps: [{ type: 'camp', id: 'rt_denver_slope' }, { type: 'kill', kind: 'hellhound', count: 4, region: 'rt_denver' }, { type: 'return' }],
    reward: { xp: 380, coins: 130, item: 'rare' } },
  { id: 'rt_denver_rigor', giver: 'rt_denver_chad', requires: ['rt_denver_hounds'],
    steps: [{ type: 'reach', x: 617, z: 70, radius: 8 }, { type: 'champion', id: 'rt_denver_rigor' }, { type: 'return' }],
    reward: { xp: 500, coins: 180, item: 'unique' } },
];
