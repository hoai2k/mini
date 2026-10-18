// Strawberry Fields (open world, east of camp): rolling patchwork farmland,
// the camp's strawberry beds, a windmill on its hill (with a root cellar under
// it, down the old well), the Big Red Barn and the burnt one the monsters
// moved into, Mill Pond Farm with its water wheel, the pumpkin patch and its
// scarecrow, the orchard and its beehives, Demeter's shrine in the wheat and
// Bronzebeak's Roost. Levels 1-3. Katie Gardner and Travis Stoll give the
// side quests.
import { B } from '../blocks.js';
import { gable } from '../rooms.js';

const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const rectD = (x, z, [x0, z0, x1, z1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));

// The windmill hill.
const HX = 180, HZ = 141;
// Footprints the terrain levels out for (x0, z0, x1, z1, height above FY).
const FLAT = [
  [120, 124, 158, 156, 1],   // the strawberry beds
  [186, 172, 210, 189, 1],   // the Big Red Barn
  [186, 191, 230, 212, 1],   // Mill Pond Farm
  [126, 189, 150, 209, 1],   // the burnt barn
  [146, 174, 167, 191, 1],   // the pumpkin patch
  [172, 198, 194, 217, 1],   // Demeter's wheat field
  [231, 146, 248, 162, 1],   // the hives
  [228, 196, 248, 216, 1],   // Bronzebeak's Roost
];

export const terrain = {
  height: (x, z, n) => {
    let h = 1 + (n.fbm(x, z, 40) - 0.45) * 7 + Math.sin(x * 0.05 + z * 0.03) * 0.8;
    h = Math.max(0.6, h);
    h += 7 * sm(1 - Math.hypot(x - HX, z - HZ) / 17);
    let m = 0, th = 1;
    for (const f of FLAT) { const k = sm(1 - rectD(x, z, f) / 7); if (k > m) { m = k; th = f[4]; } }
    return h + (th - h) * m;
  },
  surface: (x, z, h, n) => (n.value(x * 0.09, z * 0.09) > 0.82 ? B.dirt : B.grass),
};

export function build(c) {
  const { W, k, deco, add, top, rand, inRegion, FY } = c;
  const set = (x, y, z, id) => W.set(x, y, z, id);
  const fill = (x0, y0, z0, x1, y1, z1, id) => W.fill(x0, y0, z0, x1, y1, z1, id);
  const ground = (x, z) => top(x, z);
  const setTop = (x, z, id) => { const y = top(x, z); if (isFinite(y)) set(x, y - 1, z, id); };
  const light = (x, y, z, col = 0xffb050, i = 3, d = 8) => W.addLight(x + 0.5, y, z + 0.5, col, i, d);
  // a footprint flattened to the ground height at its middle
  const site = (x0, z0, x1, z1, id = null) => { const y = ground((x0 + x1) >> 1, (z0 + z1) >> 1); c.flatten(x0, z0, x1, z1, y, id); return y; };
  const solid = (x, z, h = 2) => { const y = ground(x, z); for (let i = 0; i < h; i++) set(x, y + i, z, B.barrier); };
  const keep = [];   // places the trees and the scatter leave alone: [x0, z0, x1, z1]
  const no = (x0, z0, x1, z1) => keep.push([x0, z0, x1, z1]);

  // a crop plot in rows: strawberries, wheat, greens or bare
  const plot = (x0, z0, x1, z1, kind) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!inRegion(x, z)) continue;
      const row = (z - z0) % 3 === 2;
      const y = ground(x, z);
      if (kind === 'berry') { set(x, y - 1, z, row ? B.farm_soil : B.strawberry_bed); if (!row && k.chance(0.5)) deco.add('strawberry', x + 0.5, y, z + 0.5, { scale: 0.9, sway: 0.5 }); }
      else if (kind === 'wheat') { set(x, y - 1, z, B.farm_soil); if (!row && k.chance(0.8)) deco.add('dry_grass', x + 0.5, y, z + 0.5, { scale: 1.2, sway: 1 }); }
      else if (kind === 'fallow') set(x, y - 1, z, row ? B.mud : B.farm_soil);
      else { set(x, y - 1, z, row ? B.farm_soil : B.grass); if (!row && k.chance(0.6)) deco.add('fern', x + 0.5, y, z + 0.5, { scale: 0.7, sway: 0.4 }); }
    }
  };

  // ---------------------------------------------------------------- waystones
  add.waystone('fields_crossroads', 172, 166);
  add.waystone('fields_orchard', 225, 142);
  add.waystone('fields_millpond', 208, 189);
  no(169, 163, 175, 169); no(222, 139, 228, 145); no(205, 186, 211, 192);

  // ---------------------------------------------------------------- the strawberry beds (north-west)
  {
    plot(122, 126, 135, 139, 'berry'); plot(140, 126, 156, 139, 'wheat');
    plot(122, 143, 135, 155, 'greens'); plot(140, 143, 156, 155, 'berry');
    for (let z = 124; z <= 157; z++) for (let x = 137; x <= 138; x++) setTop(x, z, B.dirt_path);
    for (let x = 120; x <= 158; x++) for (let z = 140; z <= 141; z++) setTop(x, z, B.dirt_path);
    // fences round the beds (gaps where the paths come out)
    const fy = (x, z) => ground(x, z);
    deco.prop('fence', 128.5, fy(128, 124), 124.5, { len: 15 }); deco.prop('fence', 148, fy(148, 124), 124.5, { len: 18 });
    deco.prop('fence', 157.5, fy(157, 132), 132.5, { len: 14, rot: Math.PI / 2 }); deco.prop('fence', 157.5, fy(157, 150), 149.5, { len: 14, rot: Math.PI / 2 });
    // baskets of picked berries, a farm stand and Argus's delivery van by the lane
    for (const [x, z] of [[136, 133], [139, 150], [134, 142], [151, 141], [129, 141]]) { const y = ground(x, z); set(x, y, z, B.crate); deco.add('strawberry', x + 0.5, y + 1, z + 0.5, { scale: 1.1 }); deco.add('strawberry', x + 0.3, y + 1, z + 0.7, { scale: 0.9 }); }
    deco.prop('van', 147.5, ground(147, 156), 156, { rot: 0 });
    for (let x = 145; x <= 150; x++) for (const z of [155, 156]) solid(x, z, 2);
    deco.prop('table', 153.5, ground(153, 157), 157.5, { len: 3 });
    for (const x of [152, 153, 154]) deco.add('strawberry', x + 0.5, ground(x, 157) + 0.95, 157.5, { scale: 1 });
    deco.prop('signpost', 141.5, ground(141, 157), 157.5, { rot: 0.3 }); solid(141, 157, 1);
    add.landmark({ id: 'fields_berry_beds', x: 138, z: 136 });
    no(119, 123, 159, 158);
  }

  // more of the patchwork, round the farm
  plot(119, 164, 133, 184, 'wheat'); no(118, 163, 134, 185);
  plot(214, 175, 230, 188, 'greens'); no(213, 174, 231, 189);
  plot(234, 181, 246, 193, 'fallow'); no(233, 180, 247, 194);
  plot(196, 213, 226, 218, 'wheat'); no(195, 212, 227, 219);
  for (const [x, z, len, rot] of [[126, 163.5, 14, 0], [126, 185.5, 14, 0], [222, 174.5, 16, 0], [240, 180.5, 12, 0]]) deco.prop('fence', x + 0.5, ground(Math.floor(x), Math.floor(z)), z, { len, rot });

  // ---------------------------------------------------------------- the windmill, its hill, the old well and the root cellar
  {
    const yw = site(HX - 3, HZ - 3, HX + 3, HZ + 3);
    for (let L = 0; L < 10; L++) {
      const r = L < 6 ? 2 : 1, y = yw + L;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        set(HX + dx, y, HZ + dz, L < 2 ? B.cobble : (Math.abs(dx) === r && Math.abs(dz) === r) ? B.dark_planks : B.plaster);
      }
    }
    fill(HX - 1, yw + 10, HZ - 1, HX + 1, yw + 10, HZ + 1, B.roof); set(HX, yw + 11, HZ, B.roof);
    deco.prop('weathervane', HX + 0.5, yw + 12, HZ + 0.5);
    fill(HX - 1, yw - 1, HZ - 1, HX + 1, yw - 1, HZ + 1, B.floor_boards);
    for (let y = yw; y < yw + 2; y++) set(HX, y, HZ + 2, 0);   // the door, south
    set(HX - 1, yw, HZ - 1, B.hay); set(HX + 1, yw, HZ - 1, B.crate);
    for (const [y, r] of [[yw + 4, 2], [yw + 7, 1]]) { set(HX - r, y, HZ, B.window_day); set(HX + r, y, HZ, B.window_day); }
    // the sails: four diagonal arms on a hub in front of the south face
    const hy = yw + 8, hz = HZ + 3;
    set(HX, hy, HZ + 2, B.dark_planks); set(HX, hy, hz, B.dark_planks);
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let t = 1; t <= 6; t++) {
      set(HX + sx * t, hy + sy * t, hz, B.dark_planks);
      if (t >= 2) set(HX + sx * (t + 1), hy + sy * t, hz, B.white_trim);
      if (t >= 3) set(HX + sx * (t + 2), hy + sy * t, hz, B.white_trim);
    }
    add.landmark({ id: 'fields_windmill', x: HX, z: HZ + 4 });
    no(HX - 8, HZ - 4, HX + 8, HZ + 5); no(176, 146, 184, 161);
    // the root cellar: a room in the hill, a tunnel out to the south, and the old well above it
    const yb = FY + 1, rx0 = 176, rz0 = 144, rx1 = 182, rz1 = 148;
    fill(rx0 - 1, yb - 1, rz0 - 1, rx1 + 1, yb + 3, rz1 + 1, B.stone_brick);
    fill(rx0, yb - 1, rz0, rx1, yb - 1, rz1, B.floor_boards);
    fill(rx0, yb, rz0, rx1, yb + 2, rz1, 0);
    for (let z = rz1 + 1; z <= 160; z++) {
      const roofed = ground(179, z) > yb + 3;
      for (let x = 179; x <= 180; x++) { set(x, yb - 1, z, B.cobble); for (let y = yb; y <= yb + 2; y++) set(x, y, z, 0); if (roofed) set(x, yb + 3, z, B.old_plank); }
      if (roofed) for (let y = yb; y <= yb + 2; y++) { set(178, y, z, B.stone_brick); set(181, y, z, B.stone_brick); }
    }
    for (let y = yb; y <= yb + 2; y++) { set(178, y, rz1 + 1, B.log); set(181, y, rz1 + 1, B.log); }
    for (const [x, z] of [[176, 144], [177, 144], [182, 144], [182, 145]]) set(x, yb, z, B.barrel);
    set(176, yb, 148, B.crate); set(176, yb + 1, 148, B.crate);
    deco.add('cobweb', rx0 + 0.5, yb + 2, rz0 + 0.5, { mode: 'hang', scale: 1.1 }); deco.add('cobweb', rx1 + 0.5, yb + 2, rz0 + 0.5, { mode: 'hang', scale: 1.1 });
    deco.prop('candle_cluster', 181.5, yb, 147.5); light(181, yb + 0.8, 147, 0xffa040, 3, 7);
    // the well: a shaft from the hilltop straight down into the cellar
    const wx = 178, wz = 146, wy = ground(wx, wz);
    for (let y = yb + 3; y < wy + 2; y++) set(wx, y, wz, 0);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const y = ground(wx + dx, wz + dz);
      for (let yy = yb + 3; yy < y; yy++) set(wx + dx, yy, wz + dz, B.cobble);
      set(wx + dx, y, wz + dz, B.cobble);
    }
    add.chest({ id: 'fields_cellar', x: wx, z: wz, rarity: 'epic', hidden: true });
    // bronze spiders have taken the hilltop
    add.camp({ id: 'fields_windmill_spiders', x: HX + 5, z: HZ - 5, kinds: ['spider', 'spider', 'rat'], count: 5, chest: 'common' });
    campDressing(HX + 5, HZ - 5, { tents: 0, bones: 6, webs: true });
  }

  // ---------------------------------------------------------------- the Big Red Barn
  {
    const x0 = 192, z0 = 177, x1 = 204, z1 = 185, y = site(x0 - 1, z0 - 2, x1 + 1, z1 + 1);
    fill(x0, y - 1, z0, x1, y - 1, z1, B.floor_boards);
    k.room(x0, z0, x1, z1, y, 5, B.barn_red, { trim: B.white_trim, doors: [{ side: 'n', at: 198, width: 3, height: 4 }, { side: 's', at: 198, width: 3, height: 4 }] });
    for (const yy of [y + 2]) for (const x of [194, 202]) { set(x, yy, z0, B.window_day); set(x, yy, z1, B.window_day); }
    // white X braces on the doors' sides
    for (let i = 0; i < 3; i++) { set(196 - i, y + i, z0, B.white_trim); set(200 + i, y + i, z0, B.white_trim); }
    const rt = gable(k, x0, z0, x1, z1, y + 5, B.roof_slate, { axis: 'x', end: B.barn_red });
    W.addRoof([x0 - 1, y + 5, z0 - 1], [x1 + 1, rt, z1 + 1], [[x0, y, z0], [x1, y + 4, z1]]);
    // a hay loft inside, and hay bales stacked up the north wall to the eave (the way onto the roof)
    fill(x0 + 1, y, z0 + 1, x0 + 3, y + 1, z1 - 1, B.hay); fill(x1 - 2, y, z1 - 2, x1 - 1, y, z1 - 1, B.hay);
    set(x1 - 1, y, z0 + 1, B.crate); set(x1 - 1, y + 1, z0 + 1, B.crate); set(x1 - 2, y, z0 + 1, B.barrel);
    light(198, y + 3.5, 181, 0xffc070, 2.5, 9);
    for (let i = 0; i < 5; i++) for (let h = 0; h <= i; h++) { set(200 + i, y + h, z0 - 2, B.hay); set(200 + i, y + h, z0 - 1, B.hay); }
    add.chest({ id: 'fields_barn_roof', x: 198, z: 181, rarity: 'rare', hidden: true });
    deco.prop('weathervane', 201.5, rt + 1, 181.5);
    // a cart and hay out front
    for (const [x, z] of [[189, 175], [189, 176], [190, 175], [207, 184], [207, 183]]) set(x, ground(x, z), z, B.hay);
    add.landmark({ id: 'fields_red_barn', x: 198, z: 176 });
    no(186, 172, 210, 189);
  }

  // ---------------------------------------------------------------- Mill Pond Farm: the farmhouse, the pond, the water mill, the garden
  {
    const y = site(186, 191, 229, 211);
    // the farmhouse: white clapboard, a green roof and a porch
    const x0 = 210, z0 = 195, x1 = 219, z1 = 202;
    fill(x0, y - 1, z0, x1, y - 1, z1, B.floor_boards);
    k.room(x0, z0, x1, z1, y, 4, B.clapboard, { trim: B.white_trim, doors: [{ side: 'n', at: 214, width: 1, height: 3 }] });
    for (const x of [212, 217]) { set(x, y + 1, z0, B.window_day); set(x, y + 2, z0, B.window_day); set(x, y + 1, z1, B.window_day); }
    for (const z of [198, 199]) { set(x0, y + 1, z, B.window_day); set(x1, y + 1, z, B.window_day); }
    const rt = gable(k, x0, z0, x1, z1, y + 4, B.shingle_green, { axis: 'x', end: B.clapboard });
    W.addRoof([x0 - 1, y + 4, z0 - 1], [x1 + 1, rt, z1 + 1], [[x0, y, z0], [x1, y + 3, z1]]);
    set(217, rt + 1, 198, B.red_brick); set(217, rt + 2, 198, B.red_brick);   // chimney
    fill(x0, y - 1, z0 - 2, x1, y - 1, z0 - 1, B.floor_boards);
    for (const x of [x0, x1]) { set(x, y, z0 - 2, B.white_trim); set(x, y + 1, z0 - 2, B.white_trim); set(x, y + 2, z0 - 2, B.white_trim); }
    deco.prop('bench', 212.5, y, 193.8, { rot: 0 });
    deco.prop('table', 215.5, y, 199, { len: 3 }); light(214, y + 2.5, 198, 0xffc070, 2.5, 8);
    // the garden: a white picket fence, gnomes, a birdbath, flowers (and something buried among them)
    deco.prop('fence', 225, y, 193.5, { len: 8, white: true }); deco.prop('fence', 225, y, 203.5, { len: 8, white: true }); deco.prop('fence', 229, y, 198.5, { len: 10, white: true, rot: Math.PI / 2 });
    for (let z = 194; z <= 203; z++) for (let x = 221; x <= 228; x++) if (k.chance(0.5)) deco.add(['flower_red', 'flower_yellow', 'flower_blue'][Math.floor(k.r() * 3)], x + 0.5, y, z + 0.5, { scale: 0.9, sway: 1 });
    for (const [x, z, col] of [[222, 195, 0xd8322a], [227, 201, 0x2a6ad8], [224, 202, 0xffd84a]]) deco.prop('gnome', x + 0.5, y, z + 0.5, { rot: k.r() * 6, color: col });
    deco.prop('birdbath', 225.5, y, 198.5); solid(225, 198, 1);
    add.chest({ id: 'fields_garden', x: 227, z: 196, rarity: 'common' });
    // the mill pond, the mill house and its water wheel
    k.pond(196, 195, 205, 205, y, B.water, 3, B.cobble);
    for (let z = 194; z <= 206; z++) for (let x = 195; x <= 206; x++) if ((x === 195 || x === 206 || z === 194 || z === 206) && k.chance(0.35)) deco.add('reeds', x + 0.5, y, z + 0.5, { scale: 1.1, sway: 1 });
    add.chest({ id: 'fields_pond', x: 203, z: 203, rarity: 'rare', hidden: true });
    fill(188, y - 1, 196, 193, y - 1, 202, B.floor_boards);
    k.room(188, 196, 193, 202, y, 4, B.stone_brick, { alt: B.mossy_brick, altP: 0.25, doors: [{ side: 'n', at: 190, width: 1, height: 3 }] });
    const mt = gable(k, 188, 196, 193, 202, y + 4, B.roof, { axis: 'z', end: B.old_plank });
    W.addRoof([187, y + 4, 195], [194, mt, 203], [[188, y, 196], [193, y + 3, 202]]);
    set(190, y, 200, B.crate); set(191, y, 200, B.barrel); deco.prop('anvil', 191.5, y, 197.8);
    // the wheel: a ring of planks in the water, on an axle from the mill house
    const wy = y + 1, wz = 199;
    for (let x = 194; x <= 196; x++) set(x, wy, wz, B.log);
    for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) {
      const d = Math.hypot(dy, dz);
      if (Math.abs(d - 3) < 0.55 || ((dy === 0 || dz === 0) && d < 3)) set(196, wy + dy, wz + dz, (dy + dz) % 2 ? B.dark_planks : B.planks);
    }
    // the farmyard: a well bucket, a tractor-ish cart of hay, hay bales
    for (const [x, z] of [[220, 207], [221, 207], [220, 208], [186, 208], [187, 208], [212, 209]]) set(x, ground(x, z), z, B.hay);
    deco.prop('canoe', 201, y, 208.5, { rot: 0.2 });
    add.landmark({ id: 'fields_mill_pond', x: 207, z: 200 });
    no(185, 190, 231, 212);
  }

  // ---------------------------------------------------------------- the burnt barn (monster camp)
  {
    const x0 = 130, z0 = 192, x1 = 146, z1 = 205, y = site(x0 - 2, z0 - 2, x1 + 2, z1 + 2, B.dirt);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y - 1, z, k.chance(0.3) ? B.hay : k.chance(0.4) ? B.mud : B.dirt);
    // walls: whole at the west end, falling away to stumps at the east, a big hole in the north
    for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) {
      const hgt = Math.max(0, Math.round(5 - (x - x0) * 0.35 + (k.r() - 0.5) * 2));
      if (z === z0 && x >= 135 && x <= 141) continue;
      for (let h = 0; h < hgt; h++) set(x, y + h, z, k.chance(0.25) ? B.bark_dark : B.barn_red);
    }
    for (let z = z0 + 1; z < z1; z++) { for (let h = 0; h < 5; h++) if (!(z >= 197 && z <= 199 && h < 3)) set(x0, y + h, z, k.chance(0.2) ? B.bark_dark : B.barn_red); if (k.chance(0.5)) set(x1, y, z, B.bark_dark); }
    // what is left of the roof, over the west end: charred, full of holes
    for (let i = 0; i < 4; i++) for (let x = x0 - 1; x <= x0 + 5; x++) for (const z of [z0 - 1 + i, z1 + 1 - i]) if (k.chance(0.8)) set(x, y + 5 + i, z, k.chance(0.5) ? B.bark_dark : B.old_plank);
    // fallen beams, a campfire, hide tents, a bone totem
    for (let x = 140; x <= 145; x++) set(x, y, 202 - ((x - 140) >> 2), B.bark_dark);
    campDressing(139, 198, { tents: 2, bones: 10, totem: true });
    deco.prop('fire', 145.5, y, 194.5, { smoke: true }); light(145, y + 1, 194, 0xff7a2a, 3, 8);
    add.camp({ id: 'fields_burnt_barn', x: 139, z: 198, kinds: ['pup', 'pup', 'spider'], count: 6, chest: 'rare', radius: 8 });
    add.landmark({ id: 'fields_ruined_barn', x: 138, z: 190 });
    no(126, 188, 150, 209);
  }

  // ---------------------------------------------------------------- the pumpkin patch and its scarecrow (rats)
  {
    const y = site(147, 175, 166, 190, B.farm_soil);
    for (let z = 175; z <= 190; z++) for (let x = 147; x <= 166; x++) {
      set(x, y - 1, z, (x + z) % 4 ? B.farm_soil : B.mud);
      if (k.chance(0.12) && Math.hypot(x - 157, z - 182) > 2.5) { set(x, y, z, B.roof_terracotta); deco.add('fern', x + 0.5, y + 1, z + 0.5, { scale: 0.5 }); }
      else if (k.chance(0.25)) deco.add('vine', x + 0.5, y, z + 0.5, { mode: 'flat', scale: 0.9 });
    }
    // the giant pumpkin
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let h = 0; h < 2; h++) set(157 + dx, y + h, 182 + dz, B.roof_terracotta);
    set(157, y + 2, 182, B.log); set(156, y + 1, 181, 0);   // a stalk, and a rat-gnawed hole
    // the scarecrow
    { const sx = 162, sz = 178; for (let h = 0; h < 3; h++) set(sx, y + h, sz, B.log); set(sx - 1, y + 2, sz, B.old_plank); set(sx + 1, y + 2, sz, B.old_plank); set(sx, y + 3, sz, B.hay); deco.add('gnome_hat', sx + 0.5, y + 4, sz + 0.5, { scale: 1.2 }); deco.add('dry_grass', sx - 1.2, y + 2, sz + 0.5, { scale: 0.8 }); deco.add('dry_grass', sx + 2.2, y + 2, sz + 0.5, { scale: 0.8 }); }
    deco.prop('fence', 156.5, y, 174.5, { len: 18 }); deco.prop('fence', 156.5, y, 190.5, { len: 18 });
    campDressing(153, 186, { tents: 0, bones: 6, totem: true });
    add.camp({ id: 'fields_pumpkins', x: 153, z: 185, kinds: ['rat', 'rat', 'pup'], count: 7, chest: 'common', radius: 8 });
    add.chest({ id: 'fields_scarecrow', x: 164, z: 178, rarity: 'common' });
    add.landmark({ id: 'fields_pumpkins', x: 157, z: 182 });
    no(145, 173, 168, 192);
  }

  // ---------------------------------------------------------------- Demeter's shrine, in the wheat
  {
    const cx = 183, cz = 206, y = site(cx - 5, cz - 5, cx + 5, cz + 5);
    for (let z = 198; z <= 216; z++) for (let x = 172; x <= 194; x++) {
      if (Math.abs(x - cx) <= 5 && Math.abs(z - cz) <= 5) continue;
      if (!inRegion(x, z)) continue;
      setTop(x, z, B.farm_soil);
      if (k.chance(0.75)) deco.add('dry_grass', x + 0.5, ground(x, z), z + 0.5, { scale: 1.3, sway: 1.2 });
    }
    for (let z = cz - 4; z <= cz + 4; z++) for (let x = cx - 4; x <= cx + 4; x++) set(x, y - 1, z, (x + z) % 2 ? B.marble_floor : B.marble_white);
    for (const [x, z] of [[cx - 4, cz - 4], [cx + 4, cz - 4], [cx - 4, cz + 4], [cx + 4, cz + 4]]) {
      set(x, y, z, B.marble_white); for (let h = 1; h < 4; h++) set(x, y + h, z, B.column); set(x, y + 4, z, B.gold_plate);
      // sheaves of golden wheat at each column
      deco.add('dry_grass', x + 0.5 + (x < cx ? 1 : -1), y, z + 0.5, { scale: 1.6 });
    }
    for (const [x, z] of [[cx - 2, cz - 4], [cx + 2, cz - 4], [cx - 2, cz + 4], [cx + 2, cz + 4]]) { set(x, y, z, B.hay); }
    deco.add('em_demeter', cx + 0.5, y + 2.2, cz - 3.9, { mode: 'wall', facing: [0, 1], scale: 1.6 });
    deco.prop('brazier', cx - 2.5, y, cz + 2.5); deco.prop('brazier', cx + 3.5, y, cz + 2.5);
    light(cx - 3, y + 1.4, cz + 2, 0xffb050, 3, 7); light(cx + 3, y + 1.4, cz + 2, 0xffb050, 3, 7);
    add.shrine({ id: 'fields_demeter', x: cx, z: cz, waves: [['pup', 'pup', 'rat', 'rat'], ['spider', 'spider', 'pup', 'stymphalian'], ['stymphalian', 'stymphalian', 'pup', 'pup', 'spider']] });
    add.chest({ id: 'fields_wheat', x: 191, z: 214, rarity: 'common', hidden: true });
    no(170, 197, 195, 217);
  }

  // ---------------------------------------------------------------- the orchard and the beehives (Stymphalian birds)
  {
    // the hives: white boxes in rows, some knocked over, bronze feathers stuck in the ground
    const y = site(233, 148, 247, 160);
    for (let z = 126; z <= 158; z += 6) for (let x = 215 + ((z / 6) % 2 ? 3 : 0); x <= 245; x += 6) {
      if (Math.hypot(x - 225, z - 142) < 4 || Math.hypot(x - 240, z - 154) < 7) continue;
      if (!inRegion(x, z)) continue;
      const y = ground(x, z);
      if (W.get(x, y, z)) continue;
      c.trees.oak(x, z, { h: 3, R: 2.3 });
      for (let i = 0; i < 4; i++) { const a = k.r() * 6.28; deco.add('flower_red', x + 0.5 + Math.cos(a) * 1.6, y + 3, z + 0.5 + Math.sin(a) * 1.6, { mode: 'hang', scale: 0.7 }); }
      if (k.chance(0.5)) deco.add('flower_red', x + 0.5 + k.rnd(-2, 2), y, z + 0.5 + k.rnd(-2, 2), { mode: 'flat', scale: 0.5 });
    }
    // an apple cart and barrels at the north-east corner
    { const y = ground(243, 128); fill(242, y, 127, 245, y, 128, B.old_plank); for (let x = 242; x <= 245; x++) deco.add('flower_red', x + 0.5, y + 1, 127.8, { scale: 0.7 }); set(241, y, 129, B.barrel); set(246, y, 129, B.barrel); }
    add.chest({ id: 'fields_orchard_cart', x: 244, z: 130, rarity: 'common' });
    for (const [x, z] of [[235, 150], [238, 150], [241, 150], [244, 150], [235, 158], [238, 158], [244, 158]]) { set(x, y, z, B.white_trim); set(x, y + 1, z, B.plaster); set(x, y + 2, z, B.gold_plate); }
    set(241, y, 158, B.plaster); set(242, y, 158, B.white_trim);
    for (let i = 0; i < 8; i++) { const x = 234 + Math.floor(k.r() * 12), z = 151 + Math.floor(k.r() * 6); if (!W.get(x, y, z)) set(x, y, z, B.bronze); }
    campDressing(240, 154, { tents: 1, bones: 5, totem: true });
    add.camp({ id: 'fields_hives', x: 240, z: 154, kinds: ['stymphalian', 'stymphalian', 'spider'], count: 5, chest: 'common', radius: 8 });
    no(212, 124, 249, 162);
  }

  // ---------------------------------------------------------------- Bronzebeak's Roost: a rock knoll terraced up to a nest of logs
  {
    const cx = 238, cz = 206, g = ground(cx, cz);
    for (let L = 0; L < 5; L++) {
      const R = 6.5 - L;
      for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) {
        const d = Math.hypot(dx, dz) + (k.r() - 0.5) * 0.4;
        if (d > R) continue;
        for (let y = g - 1; y <= g + L; y++) set(cx + dx, y, cz + dz, L === 4 && d < 2.2 ? (k.chance(0.6) ? B.hay : B.dirt) : B.rock);
      }
    }
    const ny = g + 5;
    for (let a = 0; a < 26; a++) { const t = a / 26 * Math.PI * 2; if (t > 1.2 && t < 1.9) continue; const x = Math.round(cx + Math.cos(t) * 2.6), z = Math.round(cz + Math.sin(t) * 2.6); set(x, ny, z, a % 3 ? B.log : B.bark_dark); }
    for (const [dx, dz] of [[-3, -1], [2, -3], [3, 2], [-2, 3]]) { set(cx + dx, ny, cz + dz, B.bronze); set(cx + dx, ny + 1, cz + dz, B.bronze); }
    for (let i = 0; i < 6; i++) deco.add('bone', cx + 0.5 + k.rnd(-1.5, 1.5), ny, cz + 0.5 + k.rnd(-1.5, 1.5), { mode: 'flat', scale: 0.7 });
    for (let i = 0; i < 10; i++) { const a = k.r() * 6.28, r = 7 + k.r() * 4; deco.add('shard', cx + 0.5 + Math.cos(a) * r, ground(Math.floor(cx + Math.cos(a) * r), Math.floor(cz + Math.sin(a) * r)), cz + 0.5 + Math.sin(a) * r, { scale: 0.8 }); }
    add.champion({ id: 'fields_bronzebeak', x: cx, z: cz, kind: 'stymphalian', elite: 'swift' });
    add.chest({ id: 'fields_roost', x: 245, z: 213, rarity: 'common' });
    add.landmark({ id: 'fields_roost', x: cx, z: cz });
    no(229, 197, 248, 216);
  }

  // ---------------------------------------------------------------- people and the things they want found
  add.npc({ id: 'fields_katie', x: 138, z: 147, model: 'mortal:tourist', yaw: Math.PI / 2 });
  add.npc({ id: 'fields_travis', x: 189, z: 182, model: 'mortal:student', yaw: -Math.PI / 2 });
  // Katie's seed packets, blown all over the farm
  for (const [i, x, z] of [[1, 163, 185], [2, 147, 200], [3, 186, 150], [4, 207, 208], [5, 230, 133]]) add.item({ id: 'fields_seed_' + i, quest: 'fields_seed_packets', x, z });
  // the Stolls' stash, hidden in odd places
  for (const [i, x, z] of [[1, 162, 179], [2, 201, 179], [3, 181, 145], [4, 248, 140]]) add.item({ id: 'fields_stash_' + i, quest: 'fields_stoll_stash', x, z });
  add.chest({ id: 'fields_van', x: 151, z: 154, rarity: 'common' });

  // ---------------------------------------------------------------- lanes
  c.road([[170, 170], [185, 171], [200, 170]], B.dirt_road, 3);
  c.road([[185, 171], [187, 158], [190, 140]], B.dirt_road, 3);
  c.road([[172, 172], [170, 186], [168, 196], [164, 219]], B.dirt_path, 2);
  c.road([[205, 171], [207, 180], [209, 190]], B.dirt_path, 2);
  c.road([[200, 170], [214, 160], [224, 147]], B.dirt_path, 2);
  c.road([[138, 158], [138, 168], [150, 178]], B.dirt_path, 2);
  c.road([[178, 160], [180, 168]], B.dirt_path, 2);

  // ---------------------------------------------------------------- hedgerow trees, haystacks, ground cover
  const kept = (x, z, m = 2) => keep.some(([x0, z0, x1, z1]) => x >= x0 - m && x <= x1 + m && z >= z0 - m && z <= z1 + m);
  const bx0 = 118, bz0 = 122, bx1 = 248, bz1 = 218;
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(bx0 + rand() * (bx1 - bx0)), z = Math.floor(bz0 + rand() * (bz1 - bz0));
    if (kept(x, z, 3) || !c.level(x, z, 3, 3, 1)) continue;
    const id = W.get(x, ground(x, z) - 1, z); if (id !== B.grass && id !== B.dirt) continue;
    if (rand() < 0.75) c.trees.oak(x, z); else c.trees.pine(x, z, { h: 7 + Math.floor(rand() * 4) });
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(bx0 + rand() * (bx1 - bx0)), z = Math.floor(bz0 + rand() * (bz1 - bz0));
    if (kept(x, z, 1)) continue;
    const y = ground(x, z); if (W.get(x, y, z) || W.get(x, y - 1, z) !== B.grass) continue;
    set(x, y, z, B.hay); if (rand() < 0.5 && !W.get(x + 1, y, z)) set(x + 1, y, z, B.hay); if (rand() < 0.3) set(x, y + 1, z, B.hay);
  }
  for (let z = bz0; z <= bz1; z++) for (let x = bx0; x <= bx1; x++) {
    if (!k.chance(0.13) || kept(x, z, 0)) continue;
    const y = ground(x, z); if (!isFinite(y) || W.get(x, y, z) || W.get(x, y - 1, z) !== B.grass) continue;
    const t = ['grass', 'tall_grass', 'flower_yellow', 'flower_red', 'grass', 'flower_blue', 'tall_grass'][Math.floor(k.r() * 7)];
    deco.add(t, x + 0.5 + k.rnd(-0.3, 0.3), y, z + 0.5 + k.rnd(-0.3, 0.3), { scale: t === 'tall_grass' ? 1.1 : 0.8, sway: 1 });
  }

  // A monster camp's dressing: a campfire, hide tents, a bone totem with a
  // skull and banners, bones lying about (and webs for spiders).
  function campDressing(x, z, { tents = 2, bones = 6, totem = false, webs = false } = {}) {
    const y = ground(x, z);
    deco.prop('campfire', x + 0.5, y, z + 0.5); set(x, y, z, B.barrier); light(x, y + 1.2, z, 0xff8a3a, 3.5, 9);
    for (let i = 0; i < tents; i++) {
      const a = i * 2.4 + 0.6, tx = Math.round(x + Math.cos(a) * 5), tz = Math.round(z + Math.sin(a) * 5), ty = ground(tx, tz);
      for (let dz = 0; dz < 3; dz++) for (let s = 0; s < 3; s++) { set(tx - 2 + s, ty + s, tz + dz, s === 2 ? B.bark_dark : B.hay); set(tx + 2 - s, ty + s, tz + dz, s === 2 ? B.bark_dark : B.hay); }
      deco.add('bone', tx + 0.5, ty, tz + 1.5, { mode: 'flat', scale: 0.8 });
    }
    if (totem) {
      const tx = x + 2, tz = z - 2, ty = ground(tx, tz);
      for (let h = 0; h < 3; h++) set(tx, ty + h, tz, B.bone_block);
      deco.add('skull', tx + 0.5, ty + 3, tz + 0.5, { scale: 1.1 });
      deco.add('banner', tx + 0.5, ty + 2.6, tz + 1.03, { mode: 'wall', facing: [0, 1], scale: 1.4, sway: 0.3 });
    }
    for (let i = 0; i < bones; i++) deco.add(k.chance(0.25) ? 'skull' : 'bone', x + 0.5 + k.rnd(-4, 4), y, z + 0.5 + k.rnd(-4, 4), { mode: 'flat', scale: 0.7 + k.r() * 0.3 });
    if (webs) for (let i = 0; i < 6; i++) deco.add('cobweb', x + 0.5 + k.rnd(-5, 5), y + 0.2, z + 0.5 + k.rnd(-5, 5), { scale: 1.4 });
  }
}

// Katie Gardner (Demeter) and Travis Stoll (Hermes). Rewards for levels 1-3.
export const QUESTS = [
  { id: 'fields_berry_thieves', giver: 'fields_katie',
    steps: [{ type: 'kill', kind: 'rat', count: 6, region: 'fields' }, { type: 'return' }],
    reward: { xp: 120, coins: 40, item: 'common' } },
  { id: 'fields_seed_packets', giver: 'fields_katie', requires: ['fields_berry_thieves'],
    steps: [{ type: 'collect', count: 5 }, { type: 'return' }],
    reward: { xp: 160, coins: 50, item: 'common' } },
  { id: 'fields_demeter_blessing', giver: 'fields_katie', requires: ['fields_seed_packets'],
    steps: [{ type: 'camp', id: 'fields_burnt_barn' }, { type: 'shrine', id: 'fields_demeter' }, { type: 'return' }],
    reward: { xp: 240, coins: 80, item: 'rare' } },
  { id: 'fields_stoll_stash', giver: 'fields_travis',
    steps: [{ type: 'collect', count: 4 }, { type: 'chest', id: 'fields_barn_roof' }, { type: 'return' }],
    reward: { xp: 140, coins: 70, item: 'common' } },
  { id: 'fields_bird_trouble', giver: 'fields_travis', requires: ['fields_stoll_stash'],
    steps: [{ type: 'camp', id: 'fields_hives' }, { type: 'kill', kind: 'stymphalian', count: 4, region: 'fields' }, { type: 'return' }],
    reward: { xp: 180, coins: 60, item: 'common' } },
  { id: 'fields_bronzebeak', giver: 'fields_travis', requires: ['fields_bird_trouble'],
    steps: [{ type: 'reach', x: 238, z: 212, radius: 7 }, { type: 'champion', id: 'fields_bronzebeak' }, { type: 'return' }],
    reward: { xp: 300, coins: 120, item: 'unique' } },
];
