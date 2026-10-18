// St. Louis (the Road West, chapter 6). East to west: the Amtrak station,
// downtown (the Gateway Grand Hotel, Tony's Toasted Ravioli, brownstones and
// an alley), the River City Ballpark and the rail yard south of the road,
// the Gateway Arch over its park to the north (630 feet of stainless steel,
// a museum pavilion under it) and the riverbank. Then the Mississippi with
// the lift bridge raised (the roadblock) and, across it, the westbound
// station with the Gateway Motel and a gas station, the last before the plains.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';
import { roadside, padMask, clearOf } from './turnpike.js';

const PADS = [
  [878, 4, 926, 38],     // the Arch park
  [878, 50, 954, 86],    // the ballpark, rail yard and brownstones
  [924, 8, 967, 38],     // downtown north
  [822, 14, 853, 38],    // the Gateway Motel
  [833, 50, 853, 59],    // the gas station
];

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 48, 2) - 0.4) * 4 * (1 - padMask(PADS, x, z)),
  surface: () => B.grass,
};

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, trees, rand } = ctx;
  const R = roadside(ctx), S = (key) => t('rt.signs.' + key);
  add.waystone('rt_stlouis', 948, ROAD_Z - 8);
  add.waystone('rt_arch', 912, ROAD_Z + 8);
  add.waystone('rt_stl_west', 840, ROAD_Z - 8);

  // ---------------- the Gateway Arch and its park
  ctx.flatten(878, 4, 926, 38, FY, B.grass);
  const cx = 902, cz = 22, span = 15, hgt = 30, A = 1.9;
  for (let s = -1; s <= 1.0001; s += 0.004) {
    const px = cx + s * span, py = FY + hgt * (1 - (Math.cosh(A * s) - 1) / (Math.cosh(A) - 1));
    const th = 3.3 - 1.5 * (py - FY) / hgt, r = th / 2;
    for (let x = Math.round(px - r); x <= Math.round(px + r); x++) for (let y = Math.round(py - r); y <= Math.round(py + r); y++) for (let z = Math.round(cz - r); z <= Math.round(cz + r); z++) {
      if (Math.abs(x + 0.5 - px) > r + 0.2 || Math.abs(y + 0.5 - py) > r + 0.2 || Math.abs(z + 0.5 - cz - 0.5) > r + 0.2) continue;
      if (y >= FY - 1 && y < W.sy - 1) W.set(x, y, z, B.silver_plate);
    }
  }
  // paths: up from the road to the pavilion, round to each leg; the reflecting ponds
  for (let z = cz + 2; z <= ROAD_Z - 6; z++) for (let x = cx - 1; x <= cx + 1; x++) W.set(x, FY - 1, z, B.sidewalk);
  for (let x = cx - span; x <= cx + span; x++) for (const z of [cz + 4, cz + 5]) W.set(x, FY - 1, z, B.sidewalk);
  k.pond(881, 7, 892, 13, FY, B.water, 2, B.marble_white);
  k.pond(912, 7, 923, 13, FY, B.water, 2, B.marble_white);
  // the museum pavilion under the Arch (the trams up the legs start here)
  R.building(cx - 3, cz - 2, cx + 3, cz + 2, { h: 3, wall: B.marble_white, roof: B.steel_panel, floor: B.marble_floor, windows: { id: B.glass, every: 1, sides: 's' }, doors: [{ side: 's', at: cx, width: 1, height: 2 }] });
  deco.prop('text_sign', cx + 0.5, FY + 3, cz + 3.1, { text: S('stlArchMuseum'), w: 4.6, h: 0.7, post: 0, bg: '#2a2a30', fg: '#e8e8f0', border: '#a0a8b0' });
  for (const x of [cx - 9, cx + 9]) deco.prop('tram_pod', x + 0.5, FY, cz + 2.5);
  add.chest({ id: 'rt_stlouis_arch', x: cx + 1, z: cz, y: FY, rarity: 'rare' });
  add.landmark({ id: 'rt_gatewayarch', x: cx, z: cz });
  deco.prop('text_sign', 894.5, FY, ROAD_Z - 6.5, { text: S('arch'), w: 3.6, h: 0.9, post: 2.0, bg: '#2a2a30', fg: '#e8e8f0', border: '#a0a8b0' });
  for (const x of [cx - 4, cx + 4]) deco.prop('flagpole', x + 0.5, FY, ROAD_Z - 6.5, { h: 6, color: x < cx ? 0xc8282a : 0x2a4a9a });
  for (let x = 880; x <= 918; x += 3) { if (Math.abs(x - cx) < 4) continue; for (const z of [35, 5]) trees.oak(x, z, { h: 4 }); }
  for (const x of [884, 890, 914, 920]) deco.prop('bench', x + 0.5, FY, cz + 6.5);
  // the riverbank: benches looking at the Mississippi, a warning for swimmers
  for (const z of [16, 26, 58, 76]) deco.prop('bench', 880.5, FY, z + 0.5, { rot: Math.PI / 2 });
  R.roadSign(880, ROAD_Z - 7, S('stlNoSwimming'), { bg: '#f2efe6', fg: '#1a1a1e', border: '#c4302a', w: 2.8, h: 1.3 });

  // ---------------- downtown, north side: the Gateway Grand Hotel and Tony's Toasted Ravioli
  ctx.flatten(924, 8, 967, 38, FY, B.grass);
  for (let x = 921; x <= 967; x++) for (const z of [36, 37, 38]) W.set(x, FY - 1, z, B.sidewalk);
  for (let x = 921; x <= 967; x++) for (const z of [50, 51]) W.set(x, FY - 1, z, B.sidewalk);
  // a cross street, its traffic lights
  for (let x = 921; x <= 924; x++) for (let z = 8; z <= 37; z++) W.set(x, FY - 1, z, x === 922 && z % 4 < 2 ? B.asphalt_line : B.asphalt);
  deco.prop('traffic_light', 925.5, FY, ROAD_Z - 6.5, { rot: -Math.PI / 2 });
  deco.prop('traffic_light', 920.5, FY, ROAD_Z + 6.5, { rot: Math.PI / 2 });
  const hx0 = 928, hx1 = 942, hz0 = 14, hz1 = 30, hh = 15;
  for (let y = FY; y < FY + hh; y++) for (let z = hz0; z <= hz1; z++) for (let x = hx0; x <= hx1; x++) {
    const edge = x === hx0 || x === hx1 || z === hz0 || z === hz1; if (!edge) continue;
    const corner = (x === hx0 || x === hx1) && (z === hz0 || z === hz1);
    const win = !corner && (y - FY) % 3 !== 0 && (x + z) % 2 === 0;
    W.set(x, y, z, win ? B.steel_window : y === FY + hh - 1 ? B.cornice : B.brownstone);
  }
  R.fill(hx0, FY + hh, hz0, hx1, FY + hh, hz1, B.roof);
  for (let x = 933; x <= 937; x++) for (let y = FY; y < FY + 3; y++) W.set(x, y, hz1, y === FY + 2 ? B.gold_trim : B.glass);
  R.fill(932, FY + 3, hz1 + 1, 938, FY + 3, hz1 + 2, B.awning);
  deco.prop('text_sign', 935.5, FY + hh + 1, hz1 - 0.2, { text: S('stlHotel'), w: 9, h: 1.6, post: 0.2, glow: true, bg: '#2a1a12', fg: '#f2d040', border: '#c9963a' });
  for (const x of [931, 939]) deco.prop('planter', x + 0.5, FY, hz1 + 1.5);
  add.landmark({ id: 'rt_grandhotel', x: 935, z: hz1 + 2 });
  // the diner
  const dx0 = 950, dx1 = 964, dz0 = 20, dz1 = 30;
  R.building(dx0, dz0, dx1, dz1, {
    h: 4, wall: B.teal_panel, roof: B.roof, eave: 1, floor: (x, z) => ((x + z) % 2 ? B.obsidian : B.marble_white),
    windows: { id: B.glass, every: 2, sides: 'sew', h: 2 }, doors: [{ side: 's', at: 957, width: 3, height: 3 }],
  });
  for (let x = dx0; x <= dx1; x++) W.set(x, FY + 3, dz1, B.neon_pink);
  for (let x = dx0 + 2; x <= dx1 - 2; x++) { W.set(x, FY, dz0 + 3, B.white_trim); W.set(x, FY, dz0 + 1, B.iron_plate); }
  for (const x of [dx0 + 3, dx0 + 8]) deco.prop('table', x + 0.5, FY, dz1 - 2.5, { len: 2 });
  deco.prop('text_sign', 957.5, FY + 5, dz1 + 1.4, { text: S('stlRavioli'), w: 6, h: 1.3, post: 0.4, glow: true, bg: '#1a1a2e', fg: '#ff9a3a', border: '#4affa0' });
  add.chest({ id: 'rt_stlouis_ravioli', x: dx1 - 2, z: dz0 + 2, y: FY, rarity: 'common' });
  add.landmark({ id: 'rt_ravioli', x: 957, z: dz1 + 2 });
  for (const x of [928, 936, 952, 960]) R.lamp(x, ROAD_Z - 7);
  R.car(945, 33, 0xf2d040, Math.PI / 2);

  // ---------------- south of the road: brownstones, an alley, the ballpark, the rail yard
  ctx.flatten(878, ROAD_Z + 6, 954, 86, FY, B.grass);
  const brown = (x0, x1, h) => {
    const z0 = ROAD_Z + 9, z1 = ROAD_Z + 16;
    R.building(x0, z0, x1, z1, { h, wall: B.brownstone, trim: B.cornice, roof: B.roof, light: 0xffe0b0, doors: [{ side: 'n', at: x0 + 2, width: 1, height: 3 }] });
    for (let x = x0 + 1; x < x1; x++) for (let y = FY + 1; y < FY + h - 1; y += 2) if (x !== x0 + 2 || y > FY + 2) W.set(x, y, z0, (x - x0) % 2 ? B.window_day : B.brownstone);
    deco.prop('stoop_rail', x0 + 1.4, FY, z0 - 0.6, { len: 1.2 }); deco.prop('stoop_rail', x0 + 3.6, FY, z0 - 0.6, { len: 1.2 });
  };
  brown(926, 930, 7); brown(933, 937, 9); brown(940, 944, 8); brown(947, 951, 10);
  deco.prop('dumpster', 939, FY, ROAD_Z + 11.5, { rot: Math.PI / 2 }); deco.prop('trash_bags', 946, FY, ROAD_Z + 15.5, { n: 6 });
  deco.prop('hydrant', 925.5, FY, ROAD_Z + 7.5); deco.prop('mailbox', 944.5, FY, ROAD_Z + 7.5);
  for (const x of [930, 938, 946, 954]) R.lamp(x, ROAD_Z + 7);
  add.chest({ id: 'rt_stlouis_alley', x: 938, z: ROAD_Z + 15, rarity: 'common', hidden: true });
  // River City Ballpark: a ring of stands round a diamond, light towers, the scoreboard
  const px0 = 898, px1 = 940, pz0 = 62, pz1 = 86, gx = 919;
  for (let i = 0; i <= 3; i++) {
    const h = i === 0 ? 5 : 4 - i;
    for (let z = pz0 + i; z <= pz1 - i; z++) for (let x = px0 + i; x <= px1 - i; x++) {
      if (x !== px0 + i && x !== px1 - i && z !== pz0 + i && z !== pz1 - i) continue;
      for (let y = FY; y < FY + h; y++) W.set(x, y, z, i === 0 ? (y === FY + h - 1 ? B.barn_red : B.concrete) : y === FY + h - 1 ? B.red_plank : B.concrete);
    }
  }
  for (let z = pz0; z <= pz0 + 3; z++) for (let x = gx - 2; x <= gx + 2; x++) for (let y = FY; y < FY + 4; y++) W.set(x, y, z, 0);
  R.fill(gx - 3, FY + 4, pz0, gx + 3, FY + 4, pz0, B.barn_red);
  deco.prop('text_sign', gx + 0.5, FY + 5, pz0 - 0.4, { text: S('stlBallpark'), w: 7.5, h: 1.5, post: 0.2, bg: '#c8282a', fg: '#ffffff', border: '#f2efe6' });
  // the field: grass, the dirt diamond, white bases
  const fz = 75;
  for (let z = pz0 + 4; z <= pz1 - 4; z++) for (let x = px0 + 4; x <= px1 - 4; x++) {
    const d = Math.abs(x - gx) + Math.abs(z - fz);
    W.set(x, FY - 1, z, (d >= 5 && d <= 7 && z >= fz - 7) || d <= 1 ? B.dirt : B.grass);
  }
  for (const [x, z] of [[gx, fz + 6], [gx + 6, fz], [gx, fz - 6], [gx - 6, fz]]) W.set(x, FY - 1, z, B.white_trim);
  deco.prop('text_sign', gx + 0.5, FY + 5, pz1 - 0.5, { text: S('stlScoreboard'), w: 10, h: 3, post: 0, glow: true, bg: '#14201a', fg: '#f2d040', border: '#2a2a30' });
  for (const [x, z] of [[px0, pz0], [px1, pz0], [px0, pz1], [px1, pz1]]) {
    for (let y = FY + 5; y < FY + 10; y++) W.set(x, y, z, B.iron_plate);
    W.set(x, FY + 10, z, B.neon_bulbs);
    W.addLight(x + (x === px0 ? 2 : -1), FY + 9, z + (z === pz0 ? 2 : -1), 0xfff4e0, 3, 16);
  }
  // the home dugout (something is hidden under the bench)
  for (let x = 905; x <= 910; x++) { W.set(x, FY + 2, pz1 - 5, B.steel_panel); W.set(x, FY + 2, pz1 - 4, B.steel_panel); }
  for (const x of [905, 910]) for (let y = FY; y < FY + 2; y++) W.set(x, y, pz1 - 5, B.concrete);
  deco.prop('bench', 907.5, FY, pz1 - 4.5);
  add.chest({ id: 'rt_stlouis_dugout', x: 909, z: pz1 - 4, y: FY, rarity: 'rare', hidden: true });
  add.landmark({ id: 'rt_ballpark', x: gx, z: fz });
  // the rail yard: sidings, boxcars (one of them open)
  for (const x of [883, 889, 893]) for (let z = pz0; z <= 86; z++) W.set(x, FY - 1, z, B.rail);
  const boxcar = (x, z0, len, id, open) => {
    for (let z = z0; z < z0 + len; z++) for (let dx = -1; dx <= 1; dx++) for (let y = FY; y < FY + 4; y++) {
      const shell = dx !== 0 || y === FY + 3 || z === z0 || z === z0 + len - 1;
      W.set(x + dx, y, z, shell ? (y === FY ? B.obsidian : id) : 0);
    }
    for (let z = z0 + 1; z < z0 + len - 1; z++) W.set(x, FY, z, open ? B.floor_boards : id);
    if (open) for (let z = z0 + 2; z <= z0 + 3; z++) for (let y = FY + 1; y < FY + 3; y++) W.set(x + 1, y, z, 0);
  };
  boxcar(883, 66, 9, B.rust_metal, false);
  boxcar(889, 70, 9, B.barn_red, true);
  boxcar(893, 62, 8, B.navy_panel, false);
  boxcar(883, 77, 8, B.teal_panel, false);
  add.chest({ id: 'rt_stlouis_boxcar', x: 889, z: 76, y: FY + 1, rarity: 'rare', hidden: true });
  add.landmark({ id: 'rt_railyard', x: 888, z: 80 });

  // ---------------- across the river: the westbound station's Gateway Motel and the last gas before the plains
  ctx.flatten(822, 14, 853, 38, FY, B.grass);
  R.fill(822, FY - 1, 31, 853, FY - 1, 38, B.asphalt);
  const motel = R.motel(824, 22, 5, { wall: B.clapboard, trim: B.white_trim, roof: B.roof, face: 's', first: 1 });
  deco.prop('text_sign', 851.5, FY, 33.5, { text: S('stlGatewayMotel'), w: 3.8, h: 2.2, post: 4.4, glow: true, bg: '#1a1a2e', fg: '#4affa0', border: '#ff5fb0' });
  W.addLight(851.5, FY + 5.4, 33.5, 0x4affa0, 3, 10);
  R.car(827, 34, 0x8a2a2a, Math.PI / 2); R.car(846, 34, 0x2a6a8a, Math.PI / 2);
  const [mx, mz] = motel.door(3);
  add.chest({ id: 'rt_stlouis_motel', x: mx - 1, z: mz, y: FY, rarity: 'common' });
  add.landmark({ id: 'rt_gatewaymotel', x: 836, z: 25 });
  ctx.flatten(834, ROAD_Z + 6, 853, ROAD_Z + 15, FY, B.asphalt);
  R.canopy(835, ROAD_Z + 7, 846, ROAD_Z + 12, [838, 843], { stripe: B.navy_panel });
  R.building(847, ROAD_Z + 7, 853, ROAD_Z + 14, { h: 4, wall: B.white_trim, trim: B.navy_panel, roof: B.steel_panel, windows: { id: B.shop_window, sides: 'w', every: 2 }, doors: [{ side: 'w', at: ROAD_Z + 10, width: 1, height: 3 }] });
  deco.prop('text_sign', 840.5, FY + 5.05, ROAD_Z + 13.1, { text: S('stlLastGasPlains'), w: 5, h: 0.9, post: 0, bg: '#2a4a9a', fg: '#ffffff', border: '#f2efe6' });

  // ---------------- billboards, the gantry, mile markers
  R.gantry(966, S('stlGantryL'), S('stlGantryR'));
  R.billboard(964, ROAD_Z + 32, S('stlBbArch'), { bg: '#2a2a30', fg: '#e8e8f0', border: '#a0a8b0' });
  R.billboard(842, ROAD_Z + 32, S('stlBbPlains'), { bg: '#f2d040', fg: '#2a2a1e', border: '#2a2a1e' });
  [[958, 151], [912, 156], [846, 162]].forEach(([x, n]) => R.mile(x, n));

  // ---------------- trees and grass on what's left
  const keep = clearOf([[852, 0, 880, 88], [962, 0, 972, 88], [876, 2, 968, 38], [876, 48, 968, 87], [820, 12, 855, 40], [820, 48, 855, 72]]);
  R.woods(40, 822, 968, 2, 86, keep, (x, z) => trees.oak(x, z, { h: 4 }));
  ctx.scatter([B.grass], ['grass', 'flower_red', 'flower_blue'], 0.06);

  // ---------------- monsters, treasure, the Arch's park ranger
  add.camp({ id: 'rt_stlouis_rail', x: 887, z: ROAD_Z + 22, kinds: ['spider', 'skeleton', 'spider'], count: 6, chest: 'rare' });
  add.camp({ id: 'rt_stlouis_ballpark', x: 924, z: 74, kinds: ['skeleton', 'empousa', 'skeleton'], count: 6 });
  add.champion({ id: 'rt_stlouis_widow', x: 887, z: 84, kind: 'spider', level: 6, elite: 'shadow' });
  add.npc({ id: 'rt_stlouis_mae', x: 904, z: ROAD_Z - 7, model: 'npc:rt_stlouis_mae', yaw: 0 });
  for (const [i, x, z] of [[1, 896, 84], [2, 930, 80], [3, 946, ROAD_Z + 12], [4, 896, 9]]) add.item({ id: 'rt_stlouis_ticket_' + i, quest: 'rt_stlouis_tickets', x, z });
}

export const QUESTS = [
  { id: 'rt_stlouis_birds', giver: 'rt_stlouis_mae',
    steps: [{ type: 'kill', kind: 'stymphalian', count: 6, region: 'rt_stlouis' }, { type: 'return' }],
    reward: { xp: 280, coins: 100, item: 'common' } },
  { id: 'rt_stlouis_tickets', giver: 'rt_stlouis_mae', requires: ['rt_stlouis_birds'],
    steps: [{ type: 'collect', count: 4 }, { type: 'return' }],
    reward: { xp: 320, coins: 110, item: 'common' } },
  { id: 'rt_stlouis_widow', giver: 'rt_stlouis_mae', requires: ['rt_stlouis_tickets'],
    steps: [{ type: 'camp', id: 'rt_stlouis_rail' }, { type: 'champion', id: 'rt_stlouis_widow' }, { type: 'return' }],
    reward: { xp: 440, coins: 160, item: 'unique' } },
];
