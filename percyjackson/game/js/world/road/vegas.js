// Las Vegas (the Road West, chapter 8): the Strip at dusk. The zoo truck drops
// you at its east end by a parking lot; then the Lotus Hotel and Casino (a
// neon lotus on its tower, a casino floor with no clocks and no windows), the
// Olympus Palace, the black Pyramid, the Desert Rose Motel, a wedding chapel,
// the Lucky 7 gas station and, past the Lotus gates across the road (the
// roadblock), the taxi rank where the drive across the desert begins.
//
// roadside(ctx) is the road-trip kit the western stops share (billboards,
// highway signs, cars, semis, gas stations, motels, roofed buildings).
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

// ---------------------------------------------------------------- the roadside kit
export function roadside(ctx) {
  const { W, k, deco, top, FY, ROAD_Z } = ctx;
  const S = (key) => t(`rt.signs.${key}`);
  const P = (kind, x, z, o = {}, y = null) => deco.prop(kind, x + 0.5, y ?? top(x, z), z + 0.5, o);
  const bar = (x, z, h = 2, y = null) => { const y0 = y ?? top(x, z); for (let i = 0; i < h; i++) if (!W.get(x, y0 + i, z)) W.set(x, y0 + i, z, B.barrier); };
  const fill = (x0, y0, z0, x1, y1, z1, id) => W.fill(x0, y0, z0, x1, y1, z1, id);
  const board = (x, z, text, o = {}) => deco.prop('text_sign', x + 0.5, o.y ?? top(x, z), z + 0.5, { w: 3, h: 0.9, post: 2.2, ...o, text });
  const COL = {
    green: { bg: '#1f6a3a', fg: '#ffffff', border: '#ffffff' },
    neon: { bg: '#14081e', fg: '#ff6ad0', border: '#4affe0', glow: true },
    retro: { bg: '#f2e6c8', fg: '#c4302a', border: '#2a6ad8' },
    yellow: { bg: '#f2c21a', fg: '#1a1a1e', border: '#1a1a1e' },
    blue: { bg: '#2a6ad8', fg: '#ffffff', border: '#f2d040' },
    red: { bg: '#c4302a', fg: '#ffffff', border: '#f2efe6' },
    black: { bg: '#0a0a0e', fg: '#e8c870', border: '#c9963a' },
  };
  const api = {
    S, P, bar, fill, board, COL,
    // a big billboard on two tall posts. face: rot (0 faces the road from the north side)
    billboard(x, z, text, o = {}) {
      const w = o.w ?? 6, rot = o.rot ?? 0.3, y = o.y ?? top(x, z);
      board(x, z, text, { h: 2.4, post: 4, ...COL[o.style ?? 'retro'], ...o, w, rot, y });
      const d = w / 2 - 0.2;
      for (const s of [-1, 1]) bar(Math.floor(x + 0.5 + s * d * Math.cos(rot)), Math.floor(z + 0.5 - s * d * Math.sin(rot)), 4, y);
      if (o.glow || o.lit) W.addLight(x + 0.5 + Math.sin(rot) * 2, y + 6, z + 0.5 + Math.cos(rot) * 2, o.light ?? 0xffe0a0, 2, 8);
    },
    // a green highway sign on the shoulder
    hwy(x, z, text, o = {}) { board(x, z, text, { w: 3.4, h: 1.2, post: 2.6, rot: 0.25, ...COL.green, ...o }); bar(x, z, 3); },
    // a mile marker: a little green post with a number
    mile(x, z, n) { board(x, z, String(n), { w: 0.6, h: 0.8, post: 0.7, rot: 0, ...COL.green }); },
    // utility poles along the road
    poles(x0, x1, z, step = 12) { for (let x = x0; x <= x1; x += step) { P('pole', x, z, { rot: Math.PI / 2 }); bar(x, z, 3); } },
    // streetlights: arms out over the road from either side
    lights(x0, x1, step = 10, sides = [-1, 1]) {
      for (let x = x0; x <= x1; x += step) for (const s of sides) {
        const z = ROAD_Z + s * 6;
        P('streetlight', x, z, { rot: s < 0 ? -Math.PI / 2 : Math.PI / 2 }); bar(x, z, 3);
        W.addLight(x + 0.5, FY + 4.8, z + 0.5 - s, 0xffd890, 1.6, 9);
      }
    },
    palms(x0, x1, step, zs, h = 6, skip = () => false) {
      for (let x = x0; x <= x1; x += step) for (const z of zs) { if (skip(x, z)) continue; P('palm', x, z, { h: h + ((x * 7 + z) % 3) }); bar(x, z, 2); }
    },
    // a parked car (along x unless rot), solid
    car(x, z, color, rot = 0) {
      P('car', x, z, { color, rot });
      if (Math.abs(Math.sin(rot)) > 0.7) for (let d = -1; d <= 2; d++) bar(x, z + d, 2); else for (let d = -1; d <= 2; d++) bar(x + d, z, 2);
    },
    // a semi truck along x, cab at x0 (facing -x), trailer behind it
    semi(x0, z0, cab = B.barn_red, trailer = B.corrugated, y = FY) {
      fill(x0, y, z0, x0 + 2, y + 1, z0 + 2, cab); fill(x0 + 1, y + 2, z0, x0 + 2, y + 2, z0 + 2, cab);
      for (let z = z0; z <= z0 + 2; z++) W.set(x0, y + 1, z, B.steel_window);
      fill(x0 + 3, y, z0, x0 + 11, y + 3, z0 + 2, trailer);
      fill(x0 + 3, y, z0, x0 + 11, y, z0 + 2, B.iron_plate);
    },
    // a box building with a flat roof that fades when you go in
    building(x0, z0, x1, z1, h, wall, o = {}) {
      const y = o.y ?? FY;
      k.room(x0, z0, x1, z1, y, h, wall, { trim: o.trim ?? null, doors: o.doors ?? [] });
      if (o.floor) fill(x0 + 1, y - 1, z0 + 1, x1 - 1, y - 1, z1 - 1, o.floor);
      fill(x0, y + h, z0, x1, y + h, z1, o.roof ?? B.roof);
      if (o.windows) for (const side of o.windows) {
        const z = side === 'n' ? z0 : z1, xs = side === 'w' ? x0 : x1;
        if (side === 'n' || side === 's') { for (let x = x0 + 2; x < x1 - 1; x += 3) if (W.get(x, y + 1, z)) W.set(x, y + 1, z, o.win ?? B.shop_window); }
        else for (let zz = z0 + 2; zz < z1 - 1; zz += 3) if (W.get(xs, y + 1, zz)) W.set(xs, y + 1, zz, o.win ?? B.shop_window);
      }
      // (o.cut: tall buildings fade their upper walls too when you go in, so the camera sees over the front)
      W.addRoof([x0, y + (o.cut ?? h), z0], [x1, y + h, z1], [[x0 + 1, y, z0 + 1], [x1 - 1, y + Math.min(h, o.cut ?? h) - 1, z1 - 1]]);
    },
    // a gas station. road: which side the road is on ('s' = road to the south)
    gas(x0, z0, x1, z1, name, road = 's', o = {}) {
      ctx.flatten(x0, z0, x1, z1, FY, B.concrete);
      const front = road === 's' ? z1 : z0, back = road === 's' ? z0 : z1, dir = road === 's' ? 1 : -1;
      // the shop at the back
      const sz0 = Math.min(back, back + dir * 6), sz1 = Math.max(back, back + dir * 6);
      const sx1 = Math.min(x1, x0 + 10);
      api.building(x0, sz0, sx1, sz1, 4, o.wall ?? B.white_trim, { trim: o.trim ?? B.red_plank, floor: B.floor_boards, doors: [{ side: road, at: x0 + 4, width: 2, height: 3 }], windows: [road] });
      W.set(x0 + 1, FY, road === 's' ? sz0 + 1 : sz1 - 1, B.vending); W.set(sx1 - 1, FY, road === 's' ? sz0 + 1 : sz1 - 1, B.vending);
      board(x0 + 4, road === 's' ? sz1 + 1 : sz0 - 1, name, { y: FY + 3.6, post: 0.3, w: 5, h: 1, ...COL[o.style ?? 'red'] });
      // the canopy over the pumps
      const cz0 = Math.min(front - dir * 2, front - dir * 6), cz1 = Math.max(front - dir * 2, front - dir * 6);
      const cx0 = x0 + 1, cx1 = Math.min(x1 - 1, x0 + 13);
      for (const x of [cx0, cx1]) for (const z of [cz0, cz1]) fill(x, FY, z, x, FY + 3, z, B.concrete_pillar);
      fill(cx0 - 1, FY + 4, cz0 - 1, cx1 + 1, FY + 4, cz1 + 1, B.steel_panel);
      // the fascia all round: a teal top band over the stripe
      for (let x = cx0 - 1; x <= cx1 + 1; x++) for (let z = cz0 - 1; z <= cz1 + 1; z++) if (x === cx0 - 1 || x === cx1 + 1 || z === cz0 - 1 || z === cz1 + 1) { W.set(x, FY + 4, z, o.top ?? B.teal_panel); W.set(x, FY + 3, z, o.stripe ?? B.red_plank); }
      W.addRoof([cx0 - 1, FY + 4, cz0 - 1], [cx1 + 1, FY + 4, cz1 + 1], [[cx0 - 1, FY, cz0 - 1], [cx1 + 1, FY + 3, cz1 + 1]]);
      const pz = Math.floor((cz0 + cz1) / 2);
      for (let x = cx0 + 3; x < cx1 - 1; x += 4) { P('gas_pump', x, pz, { rot: 0 }, FY); bar(x, pz, 2, FY); }
      W.addLight((cx0 + cx1) / 2 + 0.5, FY + 3.5, pz + 0.5, 0xfff4d8, 3, 12);
      // the price pylon by the road
      const px = Math.min(x1, x0 + 15);
      board(px, front, o.price ?? S('gasPrice'), { w: 2.6, h: 1.8, post: 3.6, rot: 0.4, ...COL.yellow }); bar(px, front, 4);
    },
    // a one-storey motel: a row of rooms along the back, a pool in front, a tall sign
    motel(x0, z0, x1, z1, name, road = 'n', o = {}) {
      ctx.flatten(x0, z0, x1, z1, FY, B.concrete);
      const back = road === 'n' ? z1 : z0, dir = road === 'n' ? -1 : 1;
      const rz0 = Math.min(back, back + dir * 6), rz1 = Math.max(back, back + dir * 6);
      const doors = []; for (let x = x0 + 2; x < x1 - 1; x += 4) doors.push({ side: road, at: x, width: 1, height: 3 });
      api.building(x0, rz0, x1, rz1, 4, o.wall ?? B.pink_plaster, { trim: o.trim ?? B.teal_panel, doors, floor: B.carpet_red, roof: o.roof ?? B.roof_slate });
      for (let x = x0 + 4; x < x1 - 1; x += 4) W.set(x, FY + 1, road === 'n' ? rz0 : rz1, B.window);
      for (const d of doors) W.set(d.at, FY + 3, road === 'n' ? rz0 : rz1, B.teal_panel);   // teal over each door
      // walkway awning along the doors
      const az = road === 'n' ? rz0 - 1 : rz1 + 1;
      fill(x0, FY + 3, az, x1, FY + 3, az, B.awning);
      // the pool
      const pw = Math.min(14, x1 - x0 - 6), px0 = x0 + Math.floor((x1 - x0 - pw) / 2);
      const pz1 = road === 'n' ? rz0 - 3 : rz1 + 9, pz0 = pz1 - 6;
      k.pond(px0, pz0, px0 + pw, pz1, FY, B.water, 2, B.pool_tile);
      for (let x = px0; x <= px0 + pw; x += 3) P('deck_chair', x, road === 'n' ? pz0 - 1 : pz1 + 1, { color: [0x2aa8a0, 0xf2d040, 0xff6ad0][(x >> 1) % 3], rot: Math.PI / 2 }, FY);
      W.addLight(px0 + pw / 2, FY + 2, (pz0 + pz1) / 2, 0x6ae0ff, 2, 9);
      // the sign: tall, neon, VACANCY
      const sx = o.signX ?? x0, sz = road === 'n' ? z0 : z1;
      fill(sx, FY, sz, sx, FY + 5, sz, B.steel_panel);
      board(sx, sz, name, { y: FY + 5, post: 0.2, w: 4, h: 1.6, rot: 0.3, ...COL.neon });
      board(sx, sz, S('vacancy'), { y: FY + 3.5, post: 0.2, w: 2.4, h: 0.6, rot: 0.3, bg: '#14081e', fg: '#ff3a3a', border: '#ff3a3a', glow: true });
      W.addLight(sx + 0.5, FY + 6, sz + 0.5 - dir, 0xff6ad0, 2.5, 10);
      return { pool: [px0, pz0, px0 + pw, pz1], rooms: [x0, rz0, x1, rz1] };
    },
  };
  return api;
}

// ---------------------------------------------------------------- the Strip
export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 40, 2) - 0.4) * 3 + (z < 10 || z > 80 ? 2 : 0),
  surface: (x, z, h, n) => (n.value(x * 0.25, z * 0.25) > 0.7 ? B.sand : B.desert_sand),
};

// the neon lotus on the tower (P pink petals, G green leaves, Y gold heart)
const LOTUS = [
  '......P......',
  '.....PPP.....',
  '..P..PYP..P..',
  '..PP.PYP.PP..',
  '.PPPP.Y.PPPP.',
  '..PPPPPPPPP..',
  'G..PPPPPPP..G',
  'GGG.......GGG',
  '.GGGGGGGGGGG.',
];

const LOTUS_BIG = [
  '.......P.......',
  '......PPP......',
  '..P...PYP...P..',
  '.PPP.PPYPP.PPP.',
  '..PPPPPYPPPPP..',
  'P..PPPPPPPPP..P',
  '.PPPPPPPPPPPPP.',
  '..GGGGGGGGGGG..',
];

export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, rand } = ctx;
  const R = roadside(ctx), { S, P, bar, fill, board, COL } = R;
  // the Strip's sidewalks
  ctx.flatten(322, 34, 339, 38, FY, B.sidewalk);
  ctx.flatten(349, 34, 431, 38, FY, B.sidewalk);
  ctx.flatten(349, 50, 431, 53, FY, B.sidewalk);

  // ------------------------------------------------------------ the Lotus Hotel and Casino
  const x0 = 352, x1 = 392, z0 = 14, z1 = 34, hP = 8;
  ctx.flatten(x0 - 2, z0 - 2, x1 + 2, z1, FY, B.sidewalk);
  k.room(x0, z0, x1, z1, FY, hP, B.lotus_panel, { trim: B.gold_trim, doors: [{ side: 's', at: 372, width: 5, height: 4 }] });
  fill(x0 + 1, FY - 1, z0 + 1, x1 - 1, FY - 1, z1 - 1, B.casino_carpet);
  fill(x0, FY + hP, z0, x1, FY + hP, z1, B.roof);
  W.addRoof([x0, FY + 4, z0], [x1, FY + hP, z1], [[x0 + 1, FY - 2, z0 + 1], [x1 - 1, FY + 3, z1 - 1]]);
  for (let x = x0 + 1; x < x1; x++) { W.set(x, FY + 4, z1, B.neon_bulbs); W.set(x, FY + 7, z1, x % 2 ? B.neon_green : B.neon_pink); }
  for (let x = x0 + 2; x < x1 - 1; x += 3) if (Math.abs(x - 372) > 3) for (let y = FY + 1; y < FY + 4; y++) W.set(x, y, z1, B.gold_marble);
  // the hotel tower over it, and the neon lotus on its face
  const tx0 = 362, tx1 = 382, tz0 = 16, tz1 = 28, top = FY + 28;
  W.walls(tx0, FY + hP + 1, tz0, tx1, top - 1, tz1, B.lotus_panel);
  fill(tx0, top, tz0, tx1, top, tz1, B.gold_trim);
  for (let y = FY + hP + 2; y < top - 1; y += 2) {
    for (let x = tx0 + 2; x < tx1 - 1; x += 2) W.set(x, y, tz0, B.window);
    for (let z = tz0 + 2; z < tz1 - 1; z += 2) { W.set(tx0, y, z, B.window); W.set(tx1, y, z, B.window); }
  }
  for (const [x, z] of [[tx0, tz1], [tx1, tz1], [tx0, tz0], [tx1, tz0]]) fill(x, FY + hP + 1, z, x, top, z, B.gold_trim);
  for (let r = 0; r < LOTUS.length; r++) for (let c = 0; c < LOTUS[r].length; c++) {
    const ch = LOTUS[r][c]; if (ch === '.') continue;
    W.set(366 + c, top - 2 - r * 2, tz1, ch === 'P' ? B.neon_pink : ch === 'G' ? B.neon_green : B.neon_bulbs);
    W.set(366 + c, top - 3 - r * 2, tz1, ch === 'P' ? B.neon_pink : ch === 'G' ? B.neon_green : B.neon_bulbs);
  }
  W.addRoof([tx0, FY + hP + 1, tz0], [tx1, top, tz1], [[x0 + 1, FY - 2, z0 + 1], [x1 - 1, FY + 3, z1 - 1]]);   // (the tower fades too, so you can see the casino floor)
  W.addLight(372.5, top - 10, tz1 + 4, 0xff6ad0, 6, 22);
  W.addLight(372.5, top + 2, 22.5, 0x4affa0, 4, 16);
  // the porte-cochère over the doors (gold pillars, a canopy of bulbs)
  for (const x of [366, 378]) for (const z of [35, 37]) fill(x, FY, z, x, FY + 4, z, B.gold_trim);
  fill(365, FY + 5, 35, 379, FY + 5, 37, B.gold_marble);
  for (let x = 365; x <= 379; x++) W.set(x, FY + 5, 37, B.neon_bulbs);
  W.addRoof([365, FY + 5, 35], [379, FY + 5, 37], [[365, FY, 35], [379, FY + 4, 37]]);
  W.addLight(372.5, FY + 4, 36.5, 0xffd890, 3, 10);
  // and on top of it the great neon lotus, in the round, over the doors
  for (let r = 0; r < LOTUS_BIG.length; r++) for (let c = 0; c < LOTUS_BIG[r].length; c++) {
    const ch = LOTUS_BIG[r][c]; if (ch === '.') continue;
    const edge = ch === 'P' && [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => (LOTUS_BIG[r + dr]?.[c + dc] ?? '.') === '.');
    const id = ch === 'P' ? (edge ? B.neon_pink : B.satin_pink) : ch === 'G' ? B.gold_trim : B.neon_bulbs, y = FY + 6 + LOTUS_BIG.length - 1 - r;
    for (const z of Math.abs(c - 7) <= 3 || ch === 'G' ? [35, 36, 37] : [36]) W.set(365 + c, y, z, id);
  }
  W.addLight(372.5, FY + 10, 39.5, 0xff6ad0, 4, 14);
  board(358, 37, S('lotus'), { w: 6, h: 2.2, post: 4.6, rot: 0.25, bg: '#0a3a2a', fg: '#4affa0', border: '#d6aa4a', glow: true }); bar(356, 37, 5); bar(361, 36, 5);
  board(386, 37, S('lotusTag'), { w: 4.6, h: 1.2, post: 3.2, rot: 0.25, ...COL.neon }); bar(384, 37, 4); bar(388, 36, 4);
  // the casino floor: slots, card tables, the arcade, a lotus pool, a buffet; no clocks, no windows
  for (let x = x0 + 3; x <= x1 - 3; x += 3) { P('slot', x, z0 + 2, { rot: 0 }, FY); bar(x, z0 + 2, 2, FY); }
  for (let x = x0 + 3; x <= x0 + 12; x += 3) for (const z of [25, 29]) { P('slot', x, z, { rot: z === 25 ? Math.PI : 0 }, FY); bar(x, z, 2, FY); }
  for (const [x, z] of [[360, 20], [366, 20], [378, 20], [384, 20]]) { P('card_table', x, z, {}, FY); bar(x, z, 1, FY); }
  for (let i = 0; i < 5; i++) { P('arcade', 382 + i * 2, 30, { rot: Math.PI }, FY); bar(382 + i * 2, 30, 2, FY); }
  k.pond(369, 22, 375, 26, FY, B.water, 1, B.gold_trim);
  fill(x1 - 1, FY, z0 + 6, x1 - 1, FY, z0 + 12, B.steel_panel);   // the buffet counter
  for (const [x, z] of [[360, 24], [372, 19], [384, 24], [366, 30]]) P('chandelier', x, z, {}, FY + hP);
  for (const [x, z, c] of [[360, 22, 0xff6ad0], [372, 22, 0x4affa0], [384, 22, 0xffd890], [372, 30, 0xffd890], [358, 30, 0xff6ad0]]) W.addLight(x + 0.5, FY + 6, z + 0.5, c, 3, 12);
  add.landmark({ id: 'rt_lotus', x: 372, z: ROAD_Z - 9 });
  add.chest({ id: 'rt_vegas_lotus', x: x1 - 2, z: z0 + 2, y: FY, rarity: 'rare', hidden: true });

  // ------------------------------------------------------------ the parking lot (where the zoo truck stopped)
  ctx.flatten(396, 10, 429, 33, FY, B.asphalt);
  for (let x = 398; x <= 428; x += 3) for (const z of [14, 15, 16, 26, 27, 28]) W.set(x, FY - 1, z, B.asphalt_line);
  const cols = [0xc4302a, 0x2a6ad8, 0xf2efe6, 0x1a1a1e, 0x3ab05a, 0xf2c21a, 0x8a2a8a];
  for (let i = 0; i < 9; i++) { const x = 399 + i * 3, z = i % 2 ? 15 : 27; if (rand() < 0.3) continue; R.car(x, z, cols[i % cols.length], Math.PI / 2); }
  R.semi(400, 20, B.white_trim, B.corrugated);   // a delivery truck, abandoned
  for (const [x, z] of [[397, 21], [428, 21]]) { P('streetlight', x, z, { rot: x < 410 ? 0 : Math.PI }); bar(x, z, 3); W.addLight(x + 0.5, FY + 4.8, z + 0.5, 0xffd890, 2, 10); }
  add.camp({ id: 'rt_vegas_lot', x: 416, z: 22, kinds: ['empousa', 'skeleton', 'harpy'], count: 6, chest: 'rare' });
  R.billboard(425, 32, S('bbLotus'), { style: 'neon', glow: true, rot: 0.45, light: 0xff6ad0 });

  // ------------------------------------------------------------ the Lucky 7 gas station (west of the Lotus)
  R.gas(322, 18, 338, 33, S('lucky7'), 's', { style: 'red', price: S('gasPriceVegas') });
  add.landmark({ id: 'rt_lucky7', x: 330, z: 26 });
  add.chest({ id: 'rt_vegas_gas', x: 331, z: 19, y: FY, rarity: 'common', hidden: true });

  // ------------------------------------------------------------ south of the Strip
  // the taxi rank: a stand, parked cabs, the sign (the taxi you drive waits on the road)
  ctx.flatten(322, 51, 339, 60, FY, B.concrete);
  for (const x of [323, 328]) R.car(x, 57, 0xf4c21a, 0);
  board(330, 52, S('taxi'), { w: 3, h: 0.9, post: 2.6, rot: 0.2, ...COL.yellow }); bar(330, 52, 3);
  fill(336, FY, 57, 338, FY, 57, B.steel_panel);   // the dispatcher's kerb
  // the wedding chapel
  ctx.flatten(349, 54, 359, 64, FY, B.grass);
  R.building(350, 56, 358, 63, 4, B.marble_white, { trim: B.white_trim, roof: B.roof_slate, doors: [{ side: 'n', at: 354, width: 1, height: 3 }], windows: ['e', 'w'], win: B.window_day, floor: B.carpet_red });
  fill(353, FY + 5, 59, 355, FY + 7, 61, B.marble_white); W.set(354, FY + 8, 60, B.gold_plate);
  board(352, 53, S('chapel'), { w: 4.2, h: 1.4, post: 2.4, rot: 0.2, bg: '#ffffff', fg: '#d8327a', border: '#ff6ad0', glow: true });
  for (const x of [350, 358]) P('planter', x, 54, {}, FY);
  // the Desert Rose Motel
  R.motel(362, 54, 391, 76, S('desertRose'), 'n', { signX: 362 });
  add.landmark({ id: 'rt_desertrose', x: 376, z: 62 });
  add.chest({ id: 'rt_vegas_pool', x: 389, z: 66, y: FY, rarity: 'common' });
  // the Olympus Palace: marble columns, gold, neon
  ctx.flatten(394, 52, 412, 68, FY, B.marble_floor);
  R.building(396, 55, 411, 67, 10, B.marble_white, { trim: B.gold_trim, floor: B.casino_carpet, cut: 4, doors: [{ side: 'n', at: 403, width: 3, height: 4 }] });
  for (let x = 396; x <= 411; x += 3) fill(x, FY, 53, x, FY + 7, 53, B.column);
  fill(395, FY + 8, 53, 412, FY + 8, 54, B.marble_white); for (let x = 395; x <= 412; x++) W.set(x, FY + 8, 53, B.neon_bulbs);
  for (let z = 55; z <= 67; z += 2) { W.set(395, FY + 9, z, B.neon_pink); W.set(412, FY + 9, z, B.neon_pink); }
  for (let x = 398; x <= 409; x += 2) for (let z = 58; z <= 64; z += 3) { P('slot', x, z, { rot: 0 }, FY); bar(x, z, 2, FY); }
  P('statue', 400, 52, { pose: 1 }, FY); P('statue', 407, 52, { pose: 0 }, FY); bar(400, 52, 2, FY); bar(407, 52, 2, FY);
  board(403, 51, S('olympusPalace'), { w: 5, h: 1.4, post: 3.2, rot: 0.15, ...COL.black, glow: true }); bar(401, 51, 4); bar(405, 51, 4);
  W.addLight(403.5, FY + 8, 51.5, 0xffd890, 4, 14);
  add.landmark({ id: 'rt_olympuspalace', x: 403, z: 60 });
  // the Pyramid: black stone in steps, gold edges, a beam of light from the top
  const qx0 = 414, qx1 = 430, qz0 = 53, qz1 = 69;
  ctx.flatten(qx0, qz0, qx1, qz1, FY, B.desert_sand);
  for (let i = 0; i <= 8; i++) {
    const a0 = qx0 + i, a1 = qx1 - i, b0 = qz0 + i, b1 = qz1 - i;
    for (let x = a0; x <= a1; x++) for (const z of [b0, b1]) W.set(x, FY + i, z, x === a0 || x === a1 ? B.gold_trim : B.black_marble);
    for (let z = b0; z <= b1; z++) for (const x of [a0, a1]) W.set(x, FY + i, z, z === b0 || z === b1 ? B.gold_trim : B.black_marble);
  }
  for (let i = 0; i <= 2; i++) for (let x = 421; x <= 423; x++) W.set(x, FY + i, qz0 + i, 0);   // the way in
  W.set(422, FY + 9, 61, B.neon_bulbs);
  W.addLight(422.5, FY + 11, 61.5, 0xfff4d8, 6, 24);
  W.addLight(422.5, FY + 2, 61.5, 0xffc860, 2.5, 8);
  P('statue', 419, 51, { pose: 2 }, FY); P('statue', 425, 51, { pose: 2 }, FY); bar(419, 51, 2, FY); bar(425, 51, 2, FY);
  board(422, 50, S('pyramid'), { w: 3.6, h: 1, post: 2.6, rot: 0.2, ...COL.black, glow: true });
  add.landmark({ id: 'rt_pyramid', x: 422, z: 61 });
  add.chest({ id: 'rt_vegas_pyramid', x: 422, z: 63, y: FY, rarity: 'rare', hidden: true });

  // ------------------------------------------------------------ the Strip itself: palms, lights, neon
  R.palms(352, 430, 8, [37, 51], 6, (x, z) => (z === 37 && x >= 350 && x <= 392) || (z === 51 && (x >= 394 && x <= 430)) || (z === 51 && x < 362));
  R.lights(350, 430, 16, [1]);
  for (const x of [325, 333]) { P('palm', x, 37, { h: 5 }); bar(x, 37, 2); }
  R.hwy(322, 37, S('vegasExit'));
  // the back lots: dumpsters, the edge of the desert
  for (const [x, z] of [[394, 74], [398, 74], [412, 74]]) { P('dumpster', x, z, { rot: 0 }); bar(x, z, 2); bar(x + 1, z, 2); }
  add.chest({ id: 'rt_vegas_alley', x: 396, z: 76, rarity: 'common' });
  add.camp({ id: 'rt_vegas_backlot', x: 376, z: 81, kinds: ['empousa', 'scorpion', 'harpy'], count: 6, radius: 7, chest: 'common' });
  add.champion({ id: 'rt_vegas_pitboss', x: 420, z: 78, kind: 'empousa', level: 8, elite: 'vampiric' });
  for (let i = 0; i < 30; i++) {
    const x = 324 + Math.floor(rand() * 106), z = rand() < 0.5 ? 2 + Math.floor(rand() * 8) : 78 + Math.floor(rand() * 8);
    if (x >= 338 && x <= 350) continue;
    const y = ctx.top(x, z); if (!isFinite(y) || W.get(x, y, z) || W.get(x, y - 1, z) === B.asphalt) continue;
    P('cactus', x, z, { h: 1.2 + rand() * 1.4, rot: rand() * 6 }); W.set(x, y, z, B.barrier);
  }
  ctx.scatter([B.desert_sand], ['dry_grass'], 0.03);
  add.waystone('rt_vegas', 420, ROAD_Z - 8);
  add.waystone('rt_taxirank', 334, ROAD_Z + 9);

  // ------------------------------------------------------------ Sal the valet and his lost key tags
  add.npc({ id: 'rt_vegas_valet', x: 383, z: 36, model: 'npc:rt_vegas_valet', yaw: 0 });
  for (const [i, x, z, y] of [[1, 335, 24], [2, 356, 59, FY], [3, 388, 63], [4, 426, 12]]) add.item({ id: `rt_vegas_key${i}`, quest: 'rt_vegas_valet_keys', x, z, y });
}

export const QUESTS = [
  { id: 'rt_vegas_valet_keys', giver: 'rt_vegas_valet',
    steps: [{ type: 'collect', count: 4 }, { type: 'return' }], reward: { xp: 650, coins: 190, item: 'common' } },
  { id: 'rt_vegas_valet_lot', giver: 'rt_vegas_valet', requires: ['rt_vegas_valet_keys'],
    steps: [{ type: 'camp', id: 'rt_vegas_lot' }, { type: 'kill', kind: 'empousa', count: 5, region: 'rt_vegas' }, { type: 'return' }], reward: { xp: 850, coins: 250, item: 'rare' } },
  { id: 'rt_vegas_valet_boss', giver: 'rt_vegas_valet', requires: ['rt_vegas_valet_lot'],
    steps: [{ type: 'champion', id: 'rt_vegas_pitboss' }, { type: 'chest', id: 'rt_vegas_pyramid' }, { type: 'return' }], reward: { xp: 1100, coins: 330, item: 'unique' } },
];
