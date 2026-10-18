// The Nevada desert (the Road West): a hundred blocks of sand, red mesas and
// cacti either side of the highway. Too hot and too far to walk: you drive it
// in the taxi (openworld/roadtrip.js), steering round what's on the road.
//
// The drive, east to west (the way you go): "Leaving Las Vegas" and the
// mileage signs, the Last Gas station, a cut through red rock, a dry wash
// under a little bridge, a natural stone arch over the road, Dry Gulch (a
// ghost town up a dirt street), the Drakon (a roadside attraction: a concrete
// dragon humping out of the sand), billboards all the way, telephone poles,
// mile markers, Joshua trees and mesas. No monsters: it's too hot even for them.
// The highway itself (z 39..49) is left clear the whole way.
import { B } from '../blocks.js';
import { roadside } from './vegas.js';

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 60, 2) - 0.4) * 3 + (n.fbm(x, z, 14, 1) - 0.5) * 1.5,
  surface: (x, z, h, n) => (h > 3 ? B.red_rock : n.value(x * 0.2, z * 0.2) > 0.72 ? B.sand : B.desert_sand),
};

// the mesas: [x, z, rx, rz, height] (flat tops, sheer banded sides)
const MESAS = [
  [222, 9, 11, 7, 13], [298, 9, 10, 7, 15], [272, 5, 8, 4, 10], [248, 78, 9, 7, 12], [228, 84, 9, 4, 9], [276, 80, 7, 6, 14], [306, 82, 6, 5, 11],
];
const STRATA = [B.red_rock, B.red_rock, B.roof_terracotta, B.red_rock, B.desert_sand, B.red_rock, B.red_brick];

export function build(ctx) {
  const { W, deco, add, ROAD_Z, FY, top, rand, n } = ctx;
  const R = roadside(ctx), { S, P, bar, fill, board, COL } = R;
  const X0 = 210, X1 = 311;   // (clear of both gates)
  const band = (y) => STRATA[((y * 3) >> 1) % STRATA.length];
  const column = (x, z, h, cap = B.red_rock) => { const g = top(x, z); if (!isFinite(g)) return; for (let y = g - 1; y < h; y++) W.set(x, y, z, y === h - 1 ? cap : band(y)); };

  // ------------------------------------------------------------ mesas
  for (const [mx, mz, rx, rz, h] of MESAS) for (let z = mz - rz - 2; z <= mz + rz + 2; z++) for (let x = mx - rx - 2; x <= mx + rx + 2; x++) {
    if (x < X0 || x > X1 || z < 1 || z > 86) continue;
    const d = Math.hypot((x - mx) / rx, (z - mz) / rz) + (n.value(x * 0.4, z * 0.4) - 0.5) * 0.25;
    if (d > 1.12) continue;
    const hh = d < 0.9 ? h : Math.round(h * 0.45);   // a ledge round the foot
    column(x, z, FY + hh + (d < 0.5 && (x + z) % 5 === 0 ? 1 : 0));
  }

  // ------------------------------------------------------------ "Leaving Las Vegas", the mileage, the first billboards
  R.hwy(310, 36, S('laMiles'));
  board(306, 36, S('leavingVegas'), { w: 4.4, h: 1.4, post: 2.4, rot: 0.3, ...COL.neon }); bar(305, 36, 3); bar(308, 35, 3);
  R.billboard(300, 32, S('bbCrustys1'), { style: 'retro' });
  R.billboard(309, 58, S('bbHermes'), { rot: -0.25, style: 'blue', post: 2.8 });

  // ------------------------------------------------------------ the Last Gas station (south side, the taxi can pull in)
  R.gas(288, 52, 304, 66, S('lastGas'), 'n', { style: 'yellow', price: S('gasPriceDesert'), wall: B.clapboard, trim: B.old_plank, stripe: B.neon_pink });
  for (const [x, z] of [[302, 64], [303, 63]]) { P('trash_bags', x, z, {}, FY); }
  P('water_tower', 306, 62, { color: 0xc8b48a }); for (const dx of [-1, 1]) for (const dz of [-1, 1]) bar(306 + dx, 62 + dz, 5);
  P('car_flipped', 296, 69, { color: 0x6a5a3a, rot: 0.4 }); bar(295, 69, 2); bar(296, 69, 2); bar(297, 69, 2);
  add.landmark({ id: 'rt_lastgas', x: 296, z: 60 });

  // ------------------------------------------------------------ the rock cut: the road squeezes through red rock
  for (let x = 279; x <= 298; x++) {
    const k = Math.sin((x - 279) / 19 * Math.PI);
    for (let z = 26; z <= 37; z++) { const h = Math.round(k * 10 - (37 - z) * 0.2 + (n.value(x * 0.5, z * 0.5) - 0.5) * 2); if (h > 1) column(x, z, FY + h); }
    if (x <= 285) for (let z = 51; z <= 55; z++) { const h = Math.round(Math.sin((x - 279) / 6 * Math.PI) * 3 - (z - 51) * 0.3); if (h > 0) column(x, z, FY + h); }
  }

  // ------------------------------------------------------------ the dry wash, and the little bridge over it
  for (let x = 272; x <= 277; x++) {
    const edge = x === 272 || x === 277 ? 1 : 0;
    for (let z = 1; z <= 86; z++) {
      if (z >= 38 && z <= 50) continue;
      const g = top(x, z); if (!isFinite(g)) continue;
      const floor = FY - 3 + edge;
      for (let y = floor; y < g + 2; y++) W.set(x, y, z, 0);
      W.set(x, floor - 1, z, (x + z) % 4 ? B.sand : B.gravel_path);
    }
    for (let z = 39; z <= 49; z++) { W.set(x, FY - 2, z, 0); W.set(x, FY - 3, z, 0); W.set(x, FY - 4, z, (x + z) % 4 ? B.sand : B.gravel_path); }
    for (const z of [38, 50]) { W.set(x, FY - 1, z, B.concrete); W.set(x, FY, z, B.guardrail); W.set(x, FY - 2, z, 0); W.set(x, FY - 3, z, 0); W.set(x, FY - 4, z, B.sand); }
    if (x === 274 || x === 275) for (const z of [41, 47]) { W.set(x, FY - 2, z, B.concrete_pillar); W.set(x, FY - 3, z, B.concrete_pillar); }
  }
  // the banks: one step at a time, so the taxi can climb out
  for (const x of [271, 278]) for (let z = 1; z <= 86; z++) { if (z >= 38 && z <= 50) continue; const g = top(x, z); if (!isFinite(g)) continue; for (let y = FY - 1; y < g; y++) W.set(x, y, z, 0); W.set(x, FY - 2, z, B.sand); }
  board(279, 37, S('wash'), { w: 2.6, h: 0.8, post: 1.6, rot: 0.3, ...COL.yellow });

  // ------------------------------------------------------------ the stone arch over the road
  const ax0 = 262, ax1 = 268;
  for (let x = ax0; x <= ax1; x++) {
    const th = x === ax0 || x === ax1 ? 0 : 1;
    for (let z = 32; z <= 56; z++) {
      const leg = z <= 37 || z >= 51;
      if (leg) { const g = top(x, z), out = z <= 37 ? 37 - z : z - 51, h = FY + 11 + th - Math.round(out * 1.6); for (let y = Math.min(g, FY) - 1; y < h; y++) W.set(x, y, z, band(y)); }
      else { const lift = Math.round(Math.cos((z - 44) / 7 * Math.PI / 2) * 1.5); for (let y = FY + 7 + lift; y <= FY + 9 + th + lift; y++) W.set(x, y, z, band(y)); }
    }
  }
  W.addRoof([ax0, FY + 7, 38], [ax1, FY + 12, 50], [[ax0 - 3, FY - 1, 38], [ax1 + 3, FY + 6, 50]]);
  add.landmark({ id: 'rt_desert', x: 265, z: ROAD_Z });

  // ------------------------------------------------------------ Dry Gulch, a ghost town up a dirt street
  const gx = 246;
  ctx.flatten(236, 10, 258, 37, FY, B.desert_sand);
  for (let z = 12; z <= 38; z++) for (let x = gx - 2; x <= gx + 2; x++) W.set(x, FY - 1, z, (x + z) % 5 ? B.dirt_road : B.dirt);
  // false fronts along both sides: saloon, store, sheriff, the bank (fallen in), the hotel
  const front = (x0, x1, z0, z1, wall, name, side, o = {}) => {
    const h = o.h ?? 4, sx = side === 'e' ? x1 : x0;
    ctx.k.room(x0, z0, x1, z1, FY, h, wall, { doors: [{ side, at: Math.floor((z0 + z1) / 2), width: o.door ?? 1, height: 3 }] });
    if (!o.ruin) { fill(x0, FY + h, z0, x1, FY + h, z1, B.old_plank); W.addRoof([x0, FY + h, z0], [x1, FY + h, z1], [[x0, FY, z0], [x1, FY + h - 1, z1]]); }
    else for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let y = FY + 1; y < FY + h; y++) if (rand() < 0.45 && x !== sx) W.set(x, y, z, 0);
    for (let z = z0 - 1; z <= z1 + 1; z++) for (let y = FY + h; y <= FY + h + 2; y++) W.set(sx, y, z, wall);   // the false front, taller than the roof
    for (let z = z0 + 1; z < z1; z += 2) if (z !== Math.floor((z0 + z1) / 2)) W.set(sx, FY + 1, z, B.window_dark);
    const bx = sx + (side === 'e' ? 1 : -1);
    if (name) board(bx, Math.floor((z0 + z1) / 2), name, { y: FY + h + 0.4, post: 0, w: z1 - z0 + 0.5, h: 0.9, rot: side === 'e' ? Math.PI / 2 : -Math.PI / 2, bg: '#6a4a2a', fg: '#f2e6c8', border: '#3a2414' });
    for (let z = z0; z <= z1; z++) W.set(bx, FY - 1, z, B.old_plank);   // the boardwalk
  };
  front(236, 242, 14, 20, B.old_plank, S('saloon'), 'e', { h: 5, door: 3 });
  front(236, 242, 23, 28, B.planks, S('store'), 'e');
  front(237, 242, 31, 35, B.old_plank, null, 'e', { ruin: true });
  front(250, 256, 13, 18, B.planks, S('sheriff'), 'w');
  front(250, 257, 21, 27, B.clapboard, S('hotel'), 'w', { h: 6 });
  front(250, 255, 30, 34, B.old_plank, S('bank'), 'w', { ruin: true });
  P('water_tower', 258, 12, { color: 0x8a6a4a }); for (const dx of [-1, 1]) for (const dz of [-1, 1]) bar(258 + dx, 12 + dz, 5);
  for (const [x, z, len] of [[243, 17, 4], [249, 24, 4]]) P('fence', x, z, { len, rot: Math.PI / 2 }, FY);
  P('car_flipped', 244, 11, { color: 0x8a3a2a, rot: 1.2 }); bar(244, 11, 2); bar(244, 12, 2);
  for (const [x, z] of [[239, 37], [253, 37], [256, 30], [238, 11]]) deco.add('bone', x + 0.5, FY, z + 0.5, { scale: 0.9 });
  board(gx + 4, 37, S('dryGulch'), { w: 3.6, h: 1.2, post: 2, rot: 0.3, bg: '#6a4a2a', fg: '#f2e6c8', border: '#3a2414' }); bar(gx + 3, 37, 3); bar(gx + 5, 37, 3);
  W.addLight(gx + 0.5, FY + 3, 22.5, 0xffb060, 2, 10);
  add.landmark({ id: 'rt_drygulch', x: gx, z: 24 });

  // ------------------------------------------------------------ the Drakon: the roadside attraction
  ctx.flatten(212, 51, 236, 57, FY, B.gravel_path);
  // its body: humps of green out of the sand, a spine of plates, a head with gold eyes
  const dz0 = 68;
  for (let i = 0; i <= 60; i++) {
    const x = 236 - i * 0.33, hump = Math.sin(i / 60 * Math.PI * 3.2) * 3.2, cz = dz0 + Math.sin(i / 60 * Math.PI * 2) * 2;
    const r = 1.9 - i / 60 * 0.3, cy = FY + hump;
    for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (dx * dx * 0.5 + dy * dy + dz * dz > r * r) continue;
      const y = Math.round(cy + dy); if (y < FY) continue;
      W.set(Math.round(x + dx), y, Math.round(cz + dz), dy >= 1 && Math.abs(dz) < 1 ? B.mossy_brick : dy <= -1 ? B.teal_panel : B.shingle_green);
    }
    if (i % 4 === 0 && cy + r > FY + 1) W.set(Math.round(x), Math.round(cy + r + 1), Math.round(cz), B.gold_plate);
  }
  // the tail tapers off to the east, the neck rises at the west end
  for (let i = 0; i < 6; i++) W.set(237 + i, FY + (i < 3 ? 1 : 0), dz0, B.shingle_green);
  for (let y = FY; y <= FY + 6; y++) fill(214, y, dz0 - 1, 215, y, dz0 + 1, B.shingle_green);
  fill(210, FY + 6, dz0 - 2, 215, FY + 9, dz0 + 2, B.shingle_green);
  fill(210, FY + 6, dz0 - 2, 211, FY + 6, dz0 + 2, B.red_lacquer);   // the mouth
  for (const z of [dz0 - 2, dz0 + 2]) { W.set(212, FY + 8, z, B.gold_plate); W.set(214, FY + 10, z, B.bone_block); W.set(215, FY + 11, z, B.bone_block); }
  for (let x = 211; x <= 215; x++) W.set(x, FY + 10, dz0, B.shingle_green);
  W.addLight(212.5, FY + 8, dz0 + 3.5, 0xffe08a, 2, 8);
  // the ticket booth and the signs
  R.building(226, 58, 229, 61, 3, B.white_trim, { trim: B.red_plank, doors: [{ side: 'n', at: 227, width: 1, height: 2 }] });
  W.set(228, FY + 1, 58, B.shop_window);
  board(222, 56, S('drakonGate'), { w: 3.6, h: 1, post: 1.8, rot: 0.15, ...COL.red }); bar(221, 56, 2); bar(223, 56, 2);
  for (const x of [216, 232]) { P('fence', x, 62, { len: 6 }, FY); }
  deco.prop('van', 219.5, FY, 54.5, { rot: 0.1 }); for (let dx = -2; dx <= 2; dx++) bar(219 + dx, 54, 2);
  R.billboard(228, 33, S('bbDrakon'), { style: 'yellow', rot: 0.35 });
  add.landmark({ id: 'rt_drakon', x: 222, z: 66 });

  // ------------------------------------------------------------ more billboards, poles, markers
  R.billboard(258, 60, S('bbHercules'), { style: 'red', rot: -0.2, post: 2.8 });
  R.billboard(214, 32, S('bbCrustys2'), { style: 'retro', rot: 0.4 });
  R.billboard(284, 64, S('bbSoda'), { style: 'blue', rot: -0.2, post: 2.8 });
  for (let x = X0 + 2; x <= X1 - 2; x += 10) { if ((x >= 242 && x <= 250) || (x >= 260 && x <= 299)) continue; P('pole', x, 36, { rot: Math.PI / 2 }); bar(x, 36, 3); }
  for (let x = 216; x <= 308; x += 16) { if (x >= 270 && x <= 279) continue; R.mile(x, 50, Math.round(x * 0.42)); }

  // ------------------------------------------------------------ Joshua trees, cacti, rocks, bones
  const joshua = (x, z) => {
    const g = top(x, z); if (!isFinite(g) || W.get(x, g, z)) return;
    const h = 3 + Math.floor(rand() * 3);
    for (let y = g; y < g + h; y++) W.set(x, y, z, B.bark_dark);
    const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(() => rand() < 0.6);
    if (!arms.length) arms.push([1, 0]);
    for (const [ax, az] of arms) { const ay = g + h - 1 - Math.floor(rand() * 2); W.set(x + ax, ay, z + az, B.bark_dark); W.set(x + ax, ay + 1, z + az, B.bark_dark); W.set(x + ax, ay + 2, z + az, B.pine_leaves); }
    W.set(x, g + h, z, B.pine_leaves);
  };
  const free = (x, z) => {
    if (Math.abs(z - ROAD_Z) < 8) return false;
    if (x >= 210 && x <= 237 && z >= 50 && z <= 80) return false;   // the Drakon
    if (x >= 234 && x <= 260 && z >= 8 && z <= 38) return false;    // Dry Gulch
    if (x >= 286 && x <= 308 && z >= 50 && z <= 70) return false;   // Last Gas
    if (x >= 259 && x <= 280) return false;                         // the arch, the wash
    return true;
  };
  for (let i = 0; i < 26; i++) { const x = X0 + Math.floor(rand() * (X1 - X0)), z = 2 + Math.floor(rand() * 84); if (free(x, z)) joshua(x, z); }
  for (let i = 0; i < 90; i++) {
    const x = X0 + Math.floor(rand() * (X1 - X0)), z = Math.floor(2 + rand() * 84);
    if (!free(x, z)) continue;
    const y = top(x, z); if (!isFinite(y) || W.get(x, y, z) || y > FY + 2) continue;
    if (rand() < 0.75) { P('cactus', x, z, { h: 1.4 + rand() * 1.6, rot: rand() * 6 }, y); W.set(x, y, z, B.barrier); }
    else { P('boulder', x, z, { rot: rand() * 6 }, y); W.set(x, y, z, B.barrier); }
  }
  ctx.scatter([B.desert_sand, B.sand], ['dry_grass', 'dry_grass', 'bone'], 0.03);
}
export const QUESTS = [];
