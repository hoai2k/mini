// The New Jersey Turnpike (the Road West's first stop, world/roadtrip.js).
// East to west: the bus stop where the Greyhound from camp pulls in, the
// toll plaza (exact change, no drachmas), the Drachma Inn motel on the north
// side, Jersey Pike Plaza on the south (a chrome diner, the gas canopy and a
// lot full of big rigs), billboards all the way and, at the west end, the
// woods where the Greyhound burns across the road (chapter 4's roadblock,
// openworld/roadtrip.js).
//
// roadside(ctx) below is the roadside kit the eastern stops share (Aunty
// Em's, St. Louis and Denver import it): billboards, green highway gantries,
// mile markers, streetlights, semis, flat-roofed buildings, motels and gas
// canopies, all stamped into the voxels with a few props.
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

// How much of a flat pad (x0, z0, x1, z1) covers (x, z): 1 inside, fading to
// 0 over `edge` blocks. A stop's terrain multiplies its hills by (1 - pad) so
// its lots and buildings stand on level ground.
export function padMask(pads, x, z, edge = 7) {
  let m = 0;
  for (const [x0, z0, x1, z1] of pads) {
    const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1);
    if (!dx && !dz) return 1;
    m = Math.max(m, 1 - Math.hypot(dx, dz) / edge);
  }
  return m;
}

const PADS = [
  [1296, 50, 1366, 82],   // Jersey Pike Plaza
  [1340, 16, 1394, 37],   // the Drachma Inn
  [1386, 30, 1406, 58],   // the toll plaza
  [1406, 50, 1436, 62],   // the bus stop
  [1392, 10, 1414, 26],   // the clearing behind the toll plaza (Diesel's den)
];

export const terrain = {
  height: (x, z, n) => (n.fbm(x, z, 40, 3) - 0.3) * 10 * (1 - padMask(PADS, x, z)),
  surface: (x, z, h, n) => (n.value(x * 0.2, z * 0.2) > 0.75 ? B.forest_floor : B.grass),
};

// ------------------------------------------------------------ the roadside kit
export function roadside(ctx) {
  const { W, deco, k, top, FY, ROAD_Z } = ctx;
  const fill = (x0, y0, z0, x1, y1, z1, id) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, y, z, id);
  };
  const gy = (x, z) => { const y = top(x, z); return isFinite(y) ? y : FY; };
  const green = { bg: '#1d6b3c', fg: '#ffffff', border: '#f2f2ea' };
  const R = {
    fill, gy, green,
    // a billboard on two iron legs, its board along z so the traffic on the
    // highway reads it (painted both sides). o: w, h, post, bg, fg, border, glow
    billboard(x, z, text, o = {}) {
      const y = o.y ?? gy(x, z), w = o.w ?? 7, h = o.h ?? 2.6, post = o.post ?? 4;
      const half = Math.max(1, Math.floor(w / 2) - 1);
      for (const dz of [-half, half]) {
        for (let yy = y - 1; yy < y + post; yy++) W.set(x, yy, z + dz, B.iron_plate);
      }
      for (let dz = -half; dz <= half; dz++) W.set(x + 1, y + post - 1, z + dz, B.metal_grate);   // the catwalk
      deco.prop('text_sign', x + 0.5, y + post, z + 0.5, { text, w, h, post: 0, rot: Math.PI / 2, bg: o.bg ?? '#f2efe6', fg: o.fg ?? '#c4302a', border: o.border ?? '#2a2a30', glow: o.glow });
      W.addLight(x + 1.6, y + post - 0.2, z + 0.5, o.glow ? 0xffa0d0 : 0xfff0d0, 1.6, 6);
    },
    // a green sign gantry over the highway at x: two boards facing the traffic
    gantry(x, left, right) {
      for (const z of [ROAD_Z - 7, ROAD_Z + 7]) for (let y = gy(x, z) - 1; y <= FY + 6; y++) W.set(x, y, z, B.iron_plate);
      for (let z = ROAD_Z - 7; z <= ROAD_Z + 7; z++) W.set(x, FY + 6, z, B.iron_plate);
      for (const [dz, text] of [[-3, left], [3, right]]) if (text) {
        deco.prop('text_sign', x + 0.5, FY + 4.3, ROAD_Z + dz + 0.5, { text, w: 5.2, h: 1.5, post: 0, rot: Math.PI / 2, ...green });
      }
      W.addLight(x + 1.5, FY + 5, ROAD_Z + 0.5, 0xfff0d0, 2, 9);
    },
    // a small green sign on a post at the roadside
    roadSign(x, z, text, o = {}) {
      deco.prop('text_sign', x + 0.5, o.y ?? gy(x, z), z + 0.5, { text, w: o.w ?? 3.4, h: o.h ?? 1.2, post: o.post ?? 2.2, rot: o.rot ?? Math.PI / 2, ...green, ...o });
    },
    // a mile marker on the north verge
    mile(x, n) {
      const z = ROAD_Z - 6;
      deco.prop('text_sign', x + 0.5, gy(x, z), z + 0.5, { text: 'MILE\n' + n, w: 0.6, h: 0.9, post: 0.5, rot: Math.PI / 2, ...green });
    },
    lamp(x, z) {
      const y = gy(x, z);
      deco.prop('streetlight', x + 0.5, y, z + 0.5);
      W.addLight(x + 1.5, y + 4.7, z + 0.5, 0xffe0b0, 2.2, 10);
    },
    car(x, z, color, rot = 0) { deco.prop('car', x + 0.5, gy(x, z), z + 0.5, { color, rot }); },
    // a semi: a box trailer and its cab, 13 long (x .. x + 12) and 3 wide (z .. z + 2);
    // dir +1 puts the cab at the east end. o: cab, trailer (block ids), text, open (the back doors open: a hollow trailer)
    semi(x, z, o = {}) {
      const dir = o.dir ?? -1, y = o.y ?? FY;
      const tx0 = dir > 0 ? x : x + 3, tx1 = tx0 + 9, cx0 = dir > 0 ? x + 10 : x, cx1 = cx0 + 2;
      const tr = o.trailer ?? B.steel_panel, cab = o.cab ?? B.barn_red;
      // trailer: floor, walls and roof, y + 1 .. y + 4
      fill(tx0, y + 1, z, tx1, y + 4, z + 2, tr);
      if (o.open) {
        fill(tx0 + 1, y + 2, z + 1, tx1 - 1, y + 3, z + 1, 0);
        const back = dir > 0 ? tx0 : tx1;
        fill(back, y + 2, z + 1, back, y + 3, z + 1, 0);
        W.set(back - dir, y, z + 1, B.crate);   // a crate to climb in by
      }
      for (const u of [tx0 + 1, tx0 + 2, tx1 - 1]) for (const zz of [z, z + 2]) W.set(dir > 0 ? u : tx0 + tx1 - u, y, zz, B.obsidian);
      // the cab: wheels, body, windscreen, a sleeper roof and the exhaust stack
      const front = dir > 0 ? cx1 : cx0, rear = dir > 0 ? cx0 : cx1;
      for (const zz of [z, z + 2]) { W.set(front, y, zz, B.obsidian); W.set(rear, y, zz, B.obsidian); }
      fill(cx0, y + 1, z, cx1, y + 2, z + 2, cab);
      for (let zz = z; zz <= z + 2; zz++) W.set(front, y + 2, zz, B.glass);
      fill(rear, y + 3, z, rear, y + 3, z + 2, cab);
      W.set(rear, y + 3, z, B.iron_plate); W.set(rear, y + 4, z, B.iron_plate);
      W.set(front, y + 1, z, B.white_trim); W.set(front, y + 1, z + 2, B.white_trim);
      if (o.text) for (const [dz, rot] of [[-0.07, Math.PI], [3.07, 0]]) {
        deco.prop('text_sign', (tx0 + tx1 + 1) / 2, y + 1.7, z + dz, { text: o.text, w: 8.4, h: 1.7, post: 0, rot, oneSided: true, bg: o.bg ?? '#f2efe6', fg: o.fg ?? '#2a4a9a', border: o.border ?? null });
      }
    },
    // a flat-roofed building: walls, a floor, windows, a roof that lifts away when a hero is inside
    // o: h, wall, trim, roof, floor (id or (x, z) => id), doors [{ side, at, width, height }], windows { id, every, sides }, eave, light
    building(x0, z0, x1, z1, o = {}) {
      const h = o.h ?? 4, y = o.y ?? FY, e = o.eave ?? 0;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        W.set(x, y - 1, z, typeof o.floor === 'function' ? o.floor(x, z) : o.floor ?? B.floor_boards);
        for (let yy = y; yy < y + h; yy++) W.set(x, yy, z, 0);
      }
      k.room(x0, z0, x1, z1, y, h, o.wall ?? B.plaster, { trim: o.trim ?? null, doors: o.doors ?? [] });
      const win = o.windows;
      if (win) {
        const every = win.every ?? 3, sides = win.sides ?? 'nsew', wy = win.y ?? 1, wh = win.h ?? 1;
        const put = (x, z) => { for (let yy = y + wy; yy < y + wy + wh; yy++) if (W.get(x, yy, z) && W.get(x, y, z)) W.set(x, yy, z, win.id ?? B.window_day); };
        if (sides.includes('n')) for (let x = x0 + 2; x < x1 - 1; x += every) put(x, z0);
        if (sides.includes('s')) for (let x = x0 + 2; x < x1 - 1; x += every) put(x, z1);
        if (sides.includes('w')) for (let z = z0 + 2; z < z1 - 1; z += every) put(x0, z);
        if (sides.includes('e')) for (let z = z0 + 2; z < z1 - 1; z += every) put(x1, z);
      }
      fill(x0 - e, y + h, z0 - e, x1 + e, y + h, z1 + e, o.roof ?? B.roof);
      W.addRoof([x0 - e, y + h, z0 - e], [x1 + e, y + h + (o.roofH ?? 1), z1 + e], [[x0 + 1, y, z0 + 1], [x1 - 1, y + h - 1, z1 - 1]]);
      if (o.light !== false) W.addLight((x0 + x1 + 1) / 2, y + h - 1, (z0 + z1 + 1) / 2, o.light ?? 0xfff0d0, 2.5, Math.max(8, (x1 - x0) * 0.7));
    },
    // a one-storey motel: `rooms` rooms (5 wide) along x from x0, six deep from z0,
    // each with its door and window on the `face` side ('s': +z, 'n': -z), a covered walkway, a bed
    motel(x0, z0, rooms, o = {}) {
      const face = o.face ?? 's', x1 = x0 + rooms * 5, z1 = z0 + 6, y = FY, h = 4;
      const fz = face === 's' ? z1 : z0, out = face === 's' ? 1 : -1, back = face === 's' ? z0 + 1 : z1 - 1;
      R.building(x0, z0, x1, z1, { h, wall: o.wall ?? B.pink_plaster, trim: o.trim ?? B.white_trim, roof: o.roof ?? B.roof_slate, floor: B.carpet_red, light: false });
      for (let i = 0; i < rooms; i++) {
        const rx = x0 + i * 5;
        if (i) for (let yy = y; yy < y + h; yy++) for (let z = z0 + 1; z < z1; z++) W.set(rx, yy, z, o.wall ?? B.pink_plaster);
        const dx = rx + 2;
        for (let yy = y; yy < y + 3; yy++) W.set(dx, yy, fz, 0);   // the door
        W.set(rx + 4, y + 1, fz, B.window_day);
        // the bed against the back wall, a lamp
        W.set(rx + 2, y, back, B.white_trim); W.set(rx + 3, y, back, B.white_trim);
        W.set(rx + 2, y, back + out, B.navy_panel); W.set(rx + 3, y, back + out, B.navy_panel);
        W.addLight(rx + 2.5, y + 2.5, (z0 + z1 + 1) / 2, 0xffe0b0, 1.6, 5);
        deco.prop('text_sign', dx + 0.5, y + 3.08, fz + 0.5 + out * 0.56, { text: String(o.first ?? 1 + i), w: 0.6, h: 0.42, post: 0, rot: out > 0 ? 0 : Math.PI, oneSided: true, bg: '#f2efe6', fg: '#2a2a30', border: null });
      }
      // the walkway and its awning on posts
      const wz0 = fz + out, wz1 = fz + out * 2;
      for (let x = x0; x <= x1; x++) for (const z of [wz0, wz1]) { W.set(x, y - 1, z, B.concrete); for (let yy = y; yy < y + 3; yy++) W.set(x, yy, z, 0); W.set(x, y + 3, z, B.awning); }
      for (let x = x0; x <= x1; x += 5) for (let yy = y; yy < y + 3; yy++) W.set(x, yy, wz1, B.white_trim);
      for (let x = x0 + 2; x <= x1; x += 10) W.addLight(x + 0.5, y + 2.6, wz0 + 0.5, 0xffd8a0, 1.8, 7);
      return { x1, z1, door: (i) => [x0 + i * 5 + 2, back + out] };
    },
    // a gas-station canopy over x0..x1, z0..z1 (y + 5) with a pump island on each listed x down its middle
    canopy(x0, z0, x1, z1, pumps, o = {}) {
      const y = o.y ?? FY, zc = Math.floor((z0 + z1) / 2);
      fill(x0, y + 5, z0, x1, y + 5, z1, o.roof ?? B.steel_panel);
      for (let x = x0; x <= x1; x++) { W.set(x, y + 5, z0, o.stripe ?? B.barn_red); W.set(x, y + 5, z1, o.stripe ?? B.barn_red); }
      for (const px of pumps) {
        for (let x = px - 1; x <= px + 1; x++) W.set(x, y - 1, zc, B.concrete);
        deco.prop('gas_pump', px + 0.5, y, zc + 0.5, { rot: 0 });
        W.set(px, y, zc, B.barrier); W.set(px, y + 1, zc, B.barrier);
        for (let yy = y; yy < y + 5; yy++) W.set(px + 1, yy, zc, o.pillar ?? B.white_trim);
      }
      for (let x = x0 + 2; x <= x1 - 1; x += 5) W.addLight(x + 0.5, y + 4.5, zc + 0.5, 0xfff4e0, 2.6, 10);
    },
    // a picnic table, a dumpster, a trash can
    picnic(x, z, rot = 0) { deco.prop('table', x + 0.5, gy(x, z), z + 0.5, { len: 2, rot }); },
    // trees on free ground: count tries in [x0, x1] × [z0, z1], skipping wherever ok(x, z) says no
    woods(count, x0, x1, z0, z1, ok, pick) {
      for (let i = 0; i < count; i++) {
        const x = x0 + Math.floor(ctx.rand() * (x1 - x0)), z = z0 + Math.floor(ctx.rand() * (z1 - z0));
        if (Math.abs(z - ROAD_Z) < 10 || !ok(x, z)) continue;
        const y = top(x, z); if (!isFinite(y) || W.get(x, y, z) || W.get(x, y - 1, z) === B.water || W.get(x, y - 1, z) === B.asphalt) continue;
        pick(x, z);
      }
    },
  };
  return R;
}
// is (x, z) clear of all these rects (x0, z0, x1, z1), with a margin?
export const clearOf = (rects, m = 2) => (x, z) => rects.every(([x0, z0, x1, z1]) => x < x0 - m || x > x1 + m || z < z0 - m || z > z1 + m);

// ------------------------------------------------------------ the Turnpike
export function build(ctx) {
  const { k, deco, add, ROAD_Z, FY, W, trees, rand } = ctx;
  const R = roadside(ctx), S = (key) => t('rt.signs.' + key);

  // ---------------- the bus stop: a shelter, its sign and the first green gantry
  R.fill(1424, FY - 1, 53, 1430, FY - 1, 55, B.concrete);
  for (let x = 1424; x <= 1430; x++) { W.set(x, FY, 55, B.glass); W.set(x, FY + 1, 55, B.glass); W.set(x, FY + 2, 55, B.steel_panel); }
  for (const x of [1424, 1430]) for (let y = FY; y < FY + 3; y++) W.set(x, y, 54, B.steel_panel);
  R.fill(1423, FY + 3, 53, 1431, FY + 3, 55, B.steel_panel);
  deco.prop('bench', 1427.5, FY, 54.3, { rot: 0 });
  deco.prop('text_sign', 1427.5, FY + 3.6, 53.3, { text: S('greyhound'), w: 3.2, h: 0.8, post: 0, bg: '#2a5ab8', fg: '#ffffff', border: '#c8ccd2' });
  W.addLight(1427.5, FY + 2.6, 54, 0xfff0d0, 2, 7);
  R.roadSign(1432, 51, S('busStop'), { w: 1.8, h: 0.8, post: 2.2, bg: '#2a5ab8', border: '#ffffff', rot: 0 });
  deco.prop('trash_can', 1422.5, FY, 54.5);
  R.gantry(1408, S('tpGantryL'), S('tpGantryR'));

  // ---------------- the toll plaza: booths on the shoulders and the middle, a canopy overhead
  const TX = 1396;
  for (let z = ROAD_Z - 8; z <= ROAD_Z + 8; z++) for (let x = TX - 3; x <= TX + 3; x++) W.set(x, FY + 6, z, B.steel_panel);
  for (let x = TX - 3; x <= TX + 3; x++) for (const z of [ROAD_Z - 8, ROAD_Z + 8]) W.set(x, FY + 6, z, B.neon_green);
  for (const z of [ROAD_Z - 8, ROAD_Z + 8]) for (const x of [TX - 3, TX + 3]) for (let y = FY; y < FY + 6; y++) W.set(x, y, z, B.concrete_pillar);
  const booth = (z0, z1, open) => {
    for (let z = z0; z <= z1; z++) for (let x = TX - 1; x <= TX + 1; x++) {
      W.set(x, FY - 1, z, B.concrete);
      const wall = x !== TX || z === z0 || z === z1;
      for (let y = FY; y < FY + 3; y++) W.set(x, y, z, wall ? (y === FY + 1 ? B.glass : B.white_trim) : 0);
      W.set(x, FY + 3, z, B.navy_panel);
    }
    if (open) for (let y = FY; y < FY + 2; y++) W.set(TX - 1, y, open, 0);   // its door, west side
  };
  booth(ROAD_Z + 4, ROAD_Z + 6, ROAD_Z + 5);
  booth(ROAD_Z - 6, ROAD_Z - 4, ROAD_Z - 5);
  for (let y = FY; y < FY + 3; y++) W.set(TX, y, ROAD_Z, y === FY + 1 ? B.glass : B.white_trim);   // the little middle booth
  W.set(TX, FY + 3, ROAD_Z, B.navy_panel);
  for (const dz of [-2, 2]) deco.prop('cone', TX + 2.5, FY, ROAD_Z + dz + 0.5);
  for (const dz of [-3, 3]) deco.prop('text_sign', TX + 3.6, FY + 4.6, ROAD_Z + dz + 0.5, { text: S('tpToll'), w: 4.6, h: 1.2, post: 0, rot: Math.PI / 2, bg: '#f2d040', fg: '#1a1a1e', border: '#1a1a1e' });
  for (const z of [ROAD_Z - 9, ROAD_Z + 9]) R.lamp(TX + 5, z);
  add.chest({ id: 'rt_turnpike_toll', x: TX, z: ROAD_Z + 5, y: FY, rarity: 'common', hidden: true });
  add.landmark({ id: 'rt_tollplaza', x: TX, z: ROAD_Z });

  // ---------------- the Drachma Inn (north side): six rooms, the office, the pool, the big sign
  const MZ = 24;
  ctx.flatten(1340, 16, 1394, 37, FY, B.grass);
  R.fill(1340, FY - 1, 33, 1394, FY - 1, 37, B.asphalt);
  const motel = R.motel(1360, MZ, 6, { wall: B.pink_plaster, face: 's', first: 101 });
  R.building(1352, MZ + 1, 1358, MZ + 6, { h: 4, wall: B.white_trim, roof: B.roof_slate, windows: { id: B.window_day, sides: 's', every: 2 }, doors: [{ side: 's', at: 1355, width: 1, height: 3 }] });
  deco.prop('text_sign', 1355.5, FY + 3.1, MZ + 7.08, { text: S('tpOffice'), w: 1.8, h: 0.5, post: 0, oneSided: true, bg: '#f2efe6', fg: '#c4302a', border: null });
  W.set(1357, FY, MZ + 8, B.vending);
  deco.prop('text_sign', 1350.5, FY, 36.5, { text: S('tpDrachmaInn'), w: 4.2, h: 2.2, post: 4.6, glow: true, bg: '#1a1a2e', fg: '#ff5fb0', border: '#4affa0' });
  W.addLight(1350.5, FY + 5.5, 36.5, 0xff5fb0, 3, 10);
  // the pool, fenced
  k.pond(1342, 20, 1349, 28, FY, B.water, 2, B.pool_tile);
  R.fill(1341, FY - 1, 19, 1350, FY - 1, 19, B.pool_tile); R.fill(1341, FY - 1, 29, 1350, FY - 1, 30, B.pool_tile);
  deco.prop('fence', 1345.5, FY, 18.5, { len: 10, white: true });
  deco.prop('umbrella', 1340.5, FY, 30.5, { color: 0x2aa8a0 }); deco.prop('deck_chair', 1343.5, FY, 30.5, { rot: Math.PI / 2 }); deco.prop('deck_chair', 1347.5, FY, 30.5, { rot: Math.PI / 2, color: 0xd8322a });
  R.car(1366, 35, 0x2a6a4a, Math.PI / 2); R.car(1381, 35, 0xd8d8d0, Math.PI / 2);
  deco.prop('dumpster', 1391.5, FY, 22.5, { rot: Math.PI / 2 });
  const [mdx, mdz] = motel.door(5);
  add.chest({ id: 'rt_turnpike_motel', x: mdx - 1, z: mdz, y: FY, rarity: 'common' });
  add.landmark({ id: 'rt_drachmainn', x: 1372, z: MZ + 3 });

  // ---------------- Jersey Pike Plaza (south side): the diner, the gas canopy, the truck lot
  add.waystone('rt_truckstop', 1338, ROAD_Z - 8);
  ctx.flatten(1296, ROAD_Z + 6, 1366, ROAD_Z + 38, FY, B.asphalt);
  // parking lines
  for (let x = 1300; x <= 1364; x += 4) for (let z = ROAD_Z + 21; z <= ROAD_Z + 23; z++) W.set(x, FY - 1, z, B.asphalt_line);
  // the diner: chrome walls, a pink neon band, windows all round, a black-and-white floor
  const dx0 = 1314, dx1 = 1336, dz0 = ROAD_Z + 10, dz1 = ROAD_Z + 18;
  R.building(dx0, dz0, dx1, dz1, {
    h: 5, wall: B.steel_panel, roof: B.roof, eave: 1,
    floor: (x, z) => ((x + z) % 2 ? B.obsidian : B.marble_white),
    windows: { id: B.glass, every: 2, sides: 'nsew', h: 2 },
    doors: [{ side: 'n', at: 1325, width: 3, height: 3 }, { side: 's', at: 1332, width: 1, height: 3 }],
  });
  for (let x = dx0; x <= dx1; x++) for (const z of [dz0, dz1]) W.set(x, FY + 4, z, B.neon_pink);
  for (let z = dz0; z <= dz1; z++) for (const x of [dx0, dx1]) W.set(x, FY + 4, z, B.neon_pink);
  // inside: the counter, stools, booths along the windows, the grill at the back
  for (let x = dx0 + 4; x <= dx1 - 4; x++) { W.set(x, FY, dz1 - 3, B.white_trim); }
  for (let x = dx0 + 2; x <= dx1 - 8; x++) W.set(x, FY, dz1 - 1, B.iron_plate);
  for (const x of [dx0 + 3, dx0 + 8, dx1 - 8, dx1 - 3]) deco.prop('table', x + 0.5, FY, dz0 + 2.5, { len: 2 });
  deco.prop('text_sign', 1325.5, FY + 6, dz0 - 0.2, { text: S('tpDiner'), w: 6, h: 1.4, post: 0.6, glow: true, bg: '#1a1a2e', fg: '#ff5fb0', border: '#f2efe6', rot: Math.PI });
  deco.prop('text_sign', 1326.5, FY, ROAD_Z + 7.5, { text: S('pikePlaza'), w: 4.2, h: 1.6, post: 4.4, bg: '#c8282a', fg: '#ffffff', border: '#f2efe6' });
  add.chest({ id: 'rt_turnpike_diner', x: dx1 - 2, z: dz1 - 2, y: FY, rarity: 'common' });
  add.landmark({ id: 'rt_pikeplaza', x: 1325, z: dz0 + 3 });
  for (const [x, c] of [[1318, 0x8a2a2a], [1322, 0x2a4a8a], [1330, 0xd8d8d0], [1334, 0xf2d040]]) R.car(x, ROAD_Z + 21, c, Math.PI / 2);
  // the gas canopy and its little shop
  R.canopy(1340, ROAD_Z + 9, 1362, ROAD_Z + 15, [1343, 1349, 1355, 1361], { stripe: B.barn_red });
  R.building(1352, ROAD_Z + 17, 1362, ROAD_Z + 21, { h: 4, wall: B.white_trim, trim: B.barn_red, roof: B.steel_panel, windows: { id: B.shop_window, sides: 'n', every: 2 }, doors: [{ side: 'n', at: 1357, width: 1, height: 3 }] });
  W.set(1353, FY, ROAD_Z + 18, B.vending); W.set(1361, FY, ROAD_Z + 18, B.vending);
  deco.prop('text_sign', 1357.5, FY + 4.1, ROAD_Z + 16.8, { text: S('tpGas'), w: 4, h: 0.9, post: 0, bg: '#c8282a', fg: '#ffffff', border: '#f2efe6', rot: Math.PI });
  // the big rigs out back
  R.semi(1300, ROAD_Z + 26, { dir: 1, cab: B.barn_red, trailer: B.steel_panel, text: S('tpDelphi'), fg: '#c4302a' });
  R.semi(1316, ROAD_Z + 26, { dir: 1, cab: B.navy_panel, trailer: B.white_trim, text: S('tpHermesExpress'), fg: '#2a4a9a' });
  R.semi(1334, ROAD_Z + 32, { dir: -1, cab: B.teal_panel, trailer: B.corrugated, open: true });
  R.semi(1350, ROAD_Z + 32, { dir: -1, cab: B.red_plank, trailer: B.steel_panel, text: S('tpMonsterDonut'), fg: '#d8322a' });
  add.chest({ id: 'rt_turnpike_rig', x: 1344, z: ROAD_Z + 33, y: FY + 2, rarity: 'rare', hidden: true });
  // the picnic corner, bins
  for (const [x, z] of [[1300, ROAD_Z + 10], [1304, ROAD_Z + 14], [1300, ROAD_Z + 18]]) R.picnic(x, z);
  deco.prop('dumpster', 1312.5, FY, ROAD_Z + 19.5, { rot: Math.PI / 2 });
  deco.prop('trash_can', 1310.5, FY, ROAD_Z + 9.5); deco.prop('trash_can', 1338.5, FY, ROAD_Z + 9.5);
  for (const x of [1300, 1320, 1344, 1364]) R.lamp(x, ROAD_Z + 7);

  // ---------------- billboards, signs and mile markers along the way
  R.billboard(1432, ROAD_Z - 14, S('tpBbStrawberries'), { bg: '#f2efe6', fg: '#c4302a', border: '#3f8a34' });
  R.billboard(1378, ROAD_Z + 14, S('tpBbAuntyEm'), { bg: '#3f8a34', fg: '#f2efe6', border: '#f2d040' });
  R.billboard(1314, ROAD_Z - 16, S('tpBbHermes'), { bg: '#2a4a9a', fg: '#f2d040', border: '#f2efe6' });
  R.billboard(1288, ROAD_Z + 14, S('tpBbCrustys'), { bg: '#2ab0c8', fg: '#ffffff', border: '#e0506a' });
  R.roadSign(1412, ROAD_Z - 9, S('tpSpeed'), { bg: '#f2efe6', fg: '#1a1a1e', border: '#1a1a1e', w: 1.4, h: 1.6, post: 1.6 });
  R.roadSign(1290, ROAD_Z - 7, S('tpAccidentAhead'), { bg: '#f28c28', fg: '#1a1a1e', border: '#1a1a1e', w: 2.6, h: 1.2 });
  for (const x of [1286, 1284, 1282]) deco.prop('cone', x + 0.5, FY, ROAD_Z - 4.5);
  deco.prop('sawhorse', 1284.5, FY, ROAD_Z + 5.5, { rot: Math.PI / 2 });
  [[1436, 112], [1376, 118], [1306, 125]].forEach(([x, n]) => R.mile(x, n));

  // ---------------- the woods either side, thickest towards the bus wreck
  const keep = clearOf([[1258, 0, 1273, 88], [1296, 50, 1366, 82], [1338, 14, 1396, 38], [1386, 30, 1406, 58], [1404, 48, 1440, 62], [1426, 26, 1438, 34], [1312, 26, 1316, 33], [1286, 54, 1290, 61], [1376, 54, 1380, 61], [1270, 34, 1282, 42]]);
  R.woods(150, 1262, 1438, 2, 86, keep, (x, z) => (rand() < 0.6 ? trees.pine : trees.oak)(x, z));
  R.woods(60, 1272, 1300, 2, 86, keep, (x, z) => trees.pine(x, z));
  ctx.scatter([B.grass, B.forest_floor], ['grass', 'tall_grass', 'fern', 'flower_yellow'], 0.08);

  // ---------------- monsters, treasure, a trucker with troubles
  add.camp({ id: 'rt_turnpike_woods', x: 1290, z: ROAD_Z + 24, kinds: ['pup', 'hellhound', 'pup'], count: 5 });
  add.camp({ id: 'rt_turnpike_nest', x: 1318, z: ROAD_Z - 26, kinds: ['harpy', 'harpy', 'fury'], count: 5, chest: 'rare' });
  add.champion({ id: 'rt_turnpike_diesel', x: 1402, z: 17, kind: 'hellhound', level: 4, elite: 'armored' });
  add.chest({ id: 'rt_turnpike_woods', x: 1280, z: ROAD_Z - 30, rarity: 'rare' });
  add.chest({ id: 'rt_turnpike_billboard', x: 1313, z: ROAD_Z - 16, rarity: 'common', hidden: true });
  add.npc({ id: 'rt_turnpike_earl', x: 1322, z: ROAD_Z + 8, model: 'mortal:farmer', yaw: Math.PI });
  for (const [i, x, z] of [[1, 1347, 31], [2, 1398, ROAD_Z + 12], [3, 1292, ROAD_Z - 14], [4, 1362, ROAD_Z + 36], [5, 1430, 30]]) add.item({ id: 'rt_turnpike_chicken_' + i, quest: 'rt_turnpike_chickens', x, z });
}

export const QUESTS = [
  { id: 'rt_turnpike_chickens', giver: 'rt_turnpike_earl',
    steps: [{ type: 'collect', count: 5 }, { type: 'return' }],
    reward: { xp: 200, coins: 70, item: 'common' } },
  { id: 'rt_turnpike_nest', giver: 'rt_turnpike_earl', requires: ['rt_turnpike_chickens'],
    steps: [{ type: 'camp', id: 'rt_turnpike_nest' }, { type: 'kill', kind: 'pup', count: 4, region: 'rt_turnpike' }, { type: 'return' }],
    reward: { xp: 260, coins: 90, item: 'common' } },
  { id: 'rt_turnpike_diesel', giver: 'rt_turnpike_earl', requires: ['rt_turnpike_nest'],
    steps: [{ type: 'reach', x: 1396, z: 44, radius: 7 }, { type: 'champion', id: 'rt_turnpike_diesel' }, { type: 'return' }],
    reward: { xp: 360, coins: 140, item: 'unique' } },
];
