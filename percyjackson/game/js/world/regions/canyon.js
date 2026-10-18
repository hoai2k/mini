// The Red Canyon (open world, east): a desert that has no business being on
// Long Island. Sheer red mesas over sandy flats, a dry river wash winding
// west to east, hoodoo spires, a slot canyon through Split Rock, a ghost
// town (Tumbleweed Gulch), Aunty Em's Garden of Stone, the Hunters of
// Artemis camped on a mesa top, a shrine to Apollo on its butte, and the Red
// King, a crimson scorpion with a golden stinger, in his den under a mesa.
// Levels 5-7.
//
// Map (x east, z south):
//   north-west  the Red King's Den (a mesa with a cave and a fallen-in roof)
//   north-east  Hunters' Mesa (silver tents, the High Mesa waystone on top)
//   middle      the Dry Wash, west to east; the road from the fields comes in at its west end
//   south-west  Apollo's Butte; Tumbleweed Gulch along its main street
//   south-east  Split Rock and its slot canyon; the Garden of Stone below it
//
// The mesas are real walls: the world builder softens every slope to
// one-block steps, and build() raises the mesa columns back to their full
// height (`unlip`), banded like layered rock; each mesa you can climb keeps
// one ramp cut into its side (the softened slope left as it was).
import { B } from '../blocks.js';
import { WORLD } from '../owLayout.js';

const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export const washZ = (x) => 208 + 8 * Math.sin((x - 250) / 24) + 4 * Math.sin((x - 250) / 9 + 1);
const slotZ = (x) => 237 + 3.5 * Math.sin((x - 342) / 5.5);
// mesas, buttes and spires: centre, radii, flat top (blocks above the ground plane);
// ramp: the corridor [outer x, z, inner x, z] left as a climbable slope
export const MESAS = [
  { id: 'den', x: 300, z: 166, rx: 15, rz: 15, top: 14, ramp: [280, 172, 299, 172] },
  { id: 'hunters', x: 367, z: 169, rx: 16, rz: 15, top: 14, ramp: [346, 170, 365, 170] },
  { id: 'split', x: 364, z: 237, rx: 22, rz: 11, top: 12, slot: true },
  { id: 'butte', x: 284, z: 250, rx: 11, rz: 11, top: 7, ramp: [298, 251, 289, 251] },
  { id: 'rim', rim: true, top: 15, box: [384, 130, 399, 289] },                  // the canyon wall along the east edge
  { id: 'spire1', x: 330, z: 157, rx: 3.5, rz: 3.5, top: 16, spire: true },
  { id: 'spire2', x: 339, z: 185, rx: 3, rz: 3, top: 12, spire: true },
  { id: 'spire3', x: 352, z: 152, rx: 3, rz: 3, top: 13, spire: true },
  { id: 'spire4', x: 323, z: 226, rx: 2.6, rz: 2.6, top: 11, spire: true },
  { id: 'spire5', x: 277, z: 186, rx: 3, rz: 3, top: 10, spire: true },
  { id: 'spire6', x: 312, z: 232, rx: 2.5, rz: 2.5, top: 9, spire: true },
  // low rocky buttes on the flats (nothing on top)
  { id: 'rock1', x: 322, z: 172, rx: 5, rz: 4, top: 5 },
  { id: 'rock2', x: 284, z: 229, rx: 5, rz: 5, top: 5 },
  { id: 'rock3', x: 378, z: 268, rx: 4, rz: 5, top: 6 },
  { id: 'rock4', x: 326, z: 240, rx: 3.5, rz: 3.5, top: 6 },
  { id: 'rock5', x: 352, z: 186, rx: 3.5, rz: 3, top: 4 },
];
// the Snake Slot: a winding crack through Split Rock into the canyon wall, ending in a hidden pocket
export const SLOT_POCKET = [393, 237];
const inSlot = (x, z) => (x >= 336 && x <= 392 && Math.abs(z - slotZ(x)) < 1.3) || Math.hypot(x - SLOT_POCKET[0], z - SLOT_POCKET[1]) < 3.2;
const mesaAt = (x, z, n) => {
  for (const m of MESAS) {
    if (m.rim) {
      if (x >= 390 + n.fbm(x, z, 11) * 6 - 2) return inSlot(x, z) ? null : m;
      continue;
    }
    const e = Math.hypot((x - m.x) / m.rx, (z - m.z) / m.rz);
    if (e > 1.25) continue;
    if (e < 1 + (n.fbm(x, z, 9) - 0.5) * (m.spire ? 0.2 : 0.38)) {
      if (m.slot && inSlot(x, z)) return null;
      return m;
    }
  }
  return null;
};

export const terrain = {
  height: (x, z, n) => {
    const base = 3 + (n.fbm(x, z, 40) - 0.5) * 3.6 + (n.fbm(x + 90, z, 13) - 0.5) * 1.4;
    const dw = Math.abs(z - washZ(x));
    const h = dw < 9 ? Math.max(0.3, base - 3.2 * sm(1 - dw / 9)) : base;
    const m = mesaAt(x, z, n);
    return m ? Math.max(h, m.top) : h;
  },
  surface: (x, z, h, n) => {
    const dw = Math.abs(z - washZ(x));
    if (dw < 2.6 && h < 3) return B.gravel_path;
    if (h >= 5) return B.red_rock;
    return h >= 3 && n.value(x * 0.17, z * 0.17) > 0.62 ? B.red_rock : B.desert_sand;
  },
};

// The quests (openworld/quests.js): Coach Hedge in Tumbleweed Gulch, Phoebe on Hunters' Mesa.
export const QUESTS = [
  { id: 'canyon_cardio', giver: 'canyon_hedge', steps: [{ type: 'kill', kind: 'scorpion', count: 10, region: 'canyon' }, { type: 'return' }], reward: { xp: 340, coins: 110 } },
  { id: 'canyon_cans', giver: 'canyon_hedge', requires: ['canyon_cardio'], steps: [{ type: 'camp', id: 'canyon_town_camp' }, { type: 'collect', count: 5 }, { type: 'return' }], reward: { xp: 440, coins: 150, item: 'rare' } },
  { id: 'canyon_king', giver: 'canyon_hedge', requires: ['canyon_cans'], steps: [{ type: 'camp', id: 'canyon_den_camp' }, { type: 'champion', id: 'canyon_red_king' }, { type: 'return' }], reward: { xp: 620, coins: 220, item: 'unique' } },
  { id: 'canyon_arrows', giver: 'canyon_phoebe', steps: [{ type: 'collect', count: 5 }, { type: 'return' }], reward: { xp: 340, coins: 110 } },
  { id: 'canyon_garden', giver: 'canyon_phoebe', requires: ['canyon_arrows'], steps: [{ type: 'camp', id: 'canyon_garden_camp' }, { type: 'chest', id: 'canyon_c_garden' }, { type: 'return' }], reward: { xp: 440, coins: 150, item: 'rare' } },
  { id: 'canyon_sun', giver: 'canyon_phoebe', requires: ['canyon_garden'], steps: [{ type: 'shrine', id: 'canyon_apollo' }, { type: 'chest', id: 'canyon_c_slot' }, { type: 'return' }], reward: { xp: 620, coins: 220, item: 'unique' } },
];

export function build(c) {
  const t0 = performance.now();
  const { W, k, deco, add, rand, top, n, FY } = c;
  const put = (x, y, z, id) => W.set(x, y, z, id);
  const fill = (x0, y0, z0, x1, y1, z1, id) => W.fill(x0, y0, z0, x1, y1, z1, id);
  const disc = (cx, cz, r0, r1, fn) => { const R = Math.ceil(r1); for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const d = Math.hypot(dx, dz); if (d > r0 && d <= r1) fn(cx + dx, cz + dz, d, Math.atan2(dz, dx)); } };
  const prop = (kind, x, y, z, o) => deco.prop(kind, x + 0.5, y, z + 0.5, o);
  const sprite = (type, x, y, z, o = {}) => deco.add(type, x + 0.5, y, z + 0.5, { scale: 0.9, sway: 1, ...o });
  const under = (x, z, y, fn) => { const keep = []; for (let yy = y; yy < WORLD.sy; yy++) { keep.push(W.get(x, yy, z)); W.set(x, yy, z, 0); } fn(); keep.forEach((id, i) => W.set(x, y + i, z, id)); };

  // ------------------------------------------------------------ the mesas: stand the walls up again
  const rawH = (x, z) => Math.max(FY - 4, Math.min(WORLD.sy - 10, Math.round(FY + terrain.height(x, z, n) * sm(Math.min(x - 250, z - 130, 289 - z, 26) / 22))));
  const segD = (x, z, [ax, az, bx, bz]) => { const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - ax - vx * t, z - az - vz * t); };
  const D = W.data;   // (the restore writes straight into the world, before any chunk is meshed)
  const strata = [B.red_rock, B.red_rock, B.roof_terracotta, B.red_rock, B.desert_sand, B.red_rock, B.red_brick];
  for (const m of MESAS) {
    const R = m.rim ? 0 : Math.ceil(Math.max(m.rx, m.rz) * 1.25);
    const [x0, z0, x1, z1] = m.box ?? [Math.floor(m.x - R), Math.floor(m.z - R), Math.ceil(m.x + R), Math.ceil(m.z + R)];
    for (let z = Math.max(130, z0); z <= Math.min(289, z1); z++) for (let x = Math.max(250, x0); x <= Math.min(399, x1); x++) {
      if (m.ramp && segD(x, z, m.ramp) < 1.8) continue;
      const want = rawH(x, z), g = top(x, z);
      if (want - g < 2) continue;
      const wob = Math.floor(n.value(x * 0.08, z * 0.08) * 3);
      for (let y = Math.max(1, g - 5); y < want; y++) D[W.idx(x, y, z)] = ( y === want - 1 ? (n.value(x * 0.3, z * 0.3) > 0.7 ? B.desert_sand : B.red_rock) : strata[(y + wob) % strata.length]);
    }
    if (m.spire) {   // a balanced cap on each hoodoo
      const y = rawH(Math.round(m.x), Math.round(m.z)) - 1;
      disc(Math.round(m.x), Math.round(m.z), -1, m.rx + 0.9, (x, z) => put(x, y, z, B.red_brick));
    }
  }

  // ------------------------------------------------------------ waystones and paths
  add.waystone('canyon_wash', 282, 212);
  add.waystone('canyon_mesa', 370, 165);
  add.waystone('canyon_town', 341, 258);
  c.road([[262, 190], [272, 202], [281, 210]], B.dirt_road, 3);
  c.road([[284, 214], [296, 236], [300, 258]], B.dirt_path, 2);
  c.road([[296, 258], [344, 258]], B.dirt_road, 3);                                 // Tumbleweed Gulch's main street
  c.road([[344, 258], [356, 266]], B.dirt_path, 2);
  c.road([[290, 210], [318, 196], [340, 192], [349, 188]], B.dirt_path, 2);        // to the Hunters' ramp

  // ------------------------------------------------------------ the Red King's Den
  {
    const cx = 300, cz = 166, fy = top(300, 190);
    // the tunnel in from the south face, and the round den
    for (let z = cz + 6; z <= 186; z++) { fill(cx - 1, fy, z, cx + 1, fy + 4, z, 0); fill(cx - 1, fy - 1, z, cx + 1, fy - 1, z, B.desert_sand); }
    for (let z = cz - 8; z <= cz + 8; z++) for (let x = cx - 9; x <= cx + 9; x++) {
      const e = ((x - cx) / 9) ** 2 + ((z - cz) / 7.5) ** 2;
      if (e > 1) continue;
      fill(x, fy, z, x, fy + (e < 0.7 ? 6 : 5), z, 0); put(x, fy - 1, z, rand() < 0.15 ? B.bone_block : B.desert_sand);
    }
    // the fallen-in roof: a hole to the sky over the middle, rubble below it
    disc(cx, cz, -1, 2.3, (x, z) => fill(x, fy + 6, z, x, WORLD.sy - 1, z, 0));
    add.champion({ id: 'canyon_red_king', x: cx, z: cz, kind: 'scorpion' });
    for (const [x, z] of [[cx - 5, cz - 3], [cx + 6, cz + 2], [cx - 3, cz + 5]]) { put(x, fy, z, B.red_rock); put(x + 1, fy, z, B.red_rock); }
    for (let i = 0; i < 14; i++) sprite(rand() < 0.4 ? 'skull' : 'bone', cx - 7 + Math.floor(rand() * 15), fy, cz - 5 + Math.floor(rand() * 11), { scale: 0.8, sway: 0 });
    W.addLight(cx + 0.5, fy + 2, cz + 0.5, 0xff7a3a, 3, 14);
    under(cx + 5, cz - 4, fy, () => add.chest({ id: 'canyon_c_den', x: cx + 5, z: cz - 4, rarity: 'rare' }));
    add.landmark({ id: 'canyon_den', x: cx, z: 189 });
    // on top, up the western ramp
    add.chest({ id: 'canyon_c_dentop', x: 304, z: 157, rarity: 'common' });
    // the scorpions' diggings outside
    const dx = 318, dz = 196, y = top(dx, dz);
    for (let i = 0; i < 6; i++) { const a = i * 1.05, x = Math.round(dx + Math.cos(a) * 5), z = Math.round(dz + Math.sin(a) * 4); put(x, top(x, z), z, B.desert_sand); put(x, top(x, z) - 2, z, 0); }
    for (let i = 0; i < 8; i++) sprite(rand() < 0.3 ? 'skull' : 'bone', dx - 5 + Math.floor(rand() * 11), y, dz - 4 + Math.floor(rand() * 9), { scale: 0.8 });
    fill(dx - 6, y, dz + 4, dx - 6, y + 2, dz + 4, B.bone_block); sprite('skull', dx - 6, y + 3, dz + 4, { sway: 0 });
    c.campDressing(dx, dz, { tents: 1, bones: 4, ground: null, stakes: 5, totem: false });
    add.camp({ id: 'canyon_den_camp', x: dx, z: dz, kinds: ['scorpion', 'scorpion', 'scorpion', 'dracaena'], count: 6, chest: 'rare', radius: 9 });
  }

  // ------------------------------------------------------------ Hunters' Mesa: the silver tents of Artemis
  {
    const y = top(367, 169);
    const tent = (x, z, along = 'z') => {
      for (let i = 0; i < 4; i++) {
        const [ax, az] = along === 'z' ? [x, z + i] : [x + i, z];
        const [px, pz] = along === 'z' ? [1, 0] : [0, 1];
        put(ax - px, y, az - pz, B.silver_plate); put(ax + px, y, az + pz, B.silver_plate); put(ax, y + 1, az, B.silver_plate);
      }
    };
    tent(360, 162); tent(373, 160, 'x'); tent(376, 172); tent(362, 175, 'x');
    prop('campfire', 368, y, 170); W.addLight(368.5, y + 1, 170.5, 0xc8d8ff, 3.5, 11);
    prop('archery_target', 356, y, 170, { rot: Math.PI / 2 }); prop('archery_target', 356, y, 166, { rot: Math.PI / 2 });
    prop('flagpole', 366, y, 158, { h: 5, color: 0xd8e0f0 });
    prop('table', 371, y, 176, { len: 3 });
    sprite('em_artemis', 366, y + 3.5, 158, { scale: 1.3, sway: 0.3 });
    add.npc({ id: 'canyon_phoebe', x: 363, z: 170, model: 'hero:thalia', yaw: Math.PI / 2 });
    add.chest({ id: 'canyon_c_hunters', x: 380, z: 167, rarity: 'rare' });
    add.landmark({ id: 'canyon_hunters', x: 366, z: 169 });
  }

  // ------------------------------------------------------------ the Dry Wash: bones, driftwood, a camp of snake-women
  {
    const wx = 338, wz = Math.round(washZ(338)), y = top(wx, wz);
    c.campDressing(wx, wz, { tents: 2, bones: 8, ground: null });
    add.camp({ id: 'canyon_wash_camp', x: wx, z: wz, kinds: ['dracaena', 'dracaena', 'empousa', 'stymphalian'], count: 5, chest: 'common', radius: 8 });
    // a cow's skeleton half buried in the gravel, with a chest under its ribs
    const bx = 306, bz = Math.round(washZ(306)) + 1, by = top(bx, bz);
    for (let i = 0; i < 4; i++) { put(bx + i, by, bz - 1, B.bone_block); put(bx + i, by, bz + 1, B.bone_block); }
    put(bx + 4, by, bz, B.bone_block); sprite('skull', bx + 5, by, bz, { sway: 0, scale: 1.2 });
    add.chest({ id: 'canyon_c_wash', x: bx + 1, z: bz, rarity: 'common', hidden: true });
    for (let i = 0; i < 18; i++) { const x = 262 + Math.floor(rand() * 134), z = Math.round(washZ(x)) - 3 + Math.floor(rand() * 7), yy = top(x, z); if (W.get(x, yy - 1, z) === B.gravel_path && !W.get(x, yy, z)) { if (rand() < 0.35) { put(x, yy, z, B.log); put(x + 1, yy, z, B.log); } else sprite(rand() < 0.5 ? 'bone' : 'dry_grass', x, yy, z); } }
  }

  // ------------------------------------------------------------ Apollo's Butte
  {
    const sx = 284, sz = 251, y = top(sx, sz);
    disc(sx, sz, -1, 6.5, (x, z, d) => put(x, top(x, z) - 1, z, d < 2.5 ? B.gold_marble : (Math.round(d * 2) % 3 ? B.marble_floor : B.marble_white)));
    // the golden sun disc on its pillar, behind the altar
    const dz = sz - 4;
    fill(sx, y, dz, sx, y + 2, dz, B.marble_white);
    disc(0, 0, -1, 2.6, (dx, dy) => put(sx + dx, y + 5 + dy, dz, B.gold_plate));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; put(sx + Math.round(Math.cos(a) * 3.6), y + 5 + Math.round(Math.sin(a) * 3.6), dz, B.gold_trim); }
    W.addLight(sx + 0.5, y + 5, dz + 1.5, 0xffd060, 4, 12);
    for (const [x, z] of [[sx - 4, sz - 3], [sx + 4, sz - 3], [sx - 4, sz + 4], [sx + 4, sz + 4]]) { prop('brazier', x, y, z); W.addLight(x + 0.5, y + 1.6, z + 0.5, 0xffb040, 2.5, 7); }
    sprite('em_apollo', sx, y + 3, dz + 1, { mode: 'wall', facing: [0, 1], scale: 1.2, sway: 0 });
    add.shrine({ id: 'canyon_apollo', x: sx, z: sz, waves: [['scorpion', 'stymphalian', 'scorpion'], ['empousa', 'scorpion', 'stymphalian', 'scorpion'], ['dracaena', 'scorpion', 'empousa', 'stymphalian', 'scorpion'], ['gorgon_statue', 'scorpion', 'scorpion', 'empousa', 'stymphalian']] });
    add.chest({ id: 'canyon_c_butte', x: sx - 5, z: sz - 5, rarity: 'common' });
  }

  // ------------------------------------------------------------ Tumbleweed Gulch
  {
    const y = top(320, 258);
    const flat = (x0, z0, x1, z1) => c.flatten(x0, z0, x1, z1, y, B.desert_sand);
    flat(298, 247, 344, 269);
    for (let x = 296; x <= 344; x++) for (let z = 257; z <= 259; z++) put(x, y - 1, z, B.dirt_road);
    const sign = (text, x, yy, z, w = 4) => prop('text_sign', x, yy, z, { text, w, h: 0.9, bg: '#5a3a22', fg: '#f2dca8' });
    // the saloon: two storeys, a false front, a balcony over the porch (stairs up its east end)
    {
      const x0 = 304, x1 = 314, z0 = 248, z1 = 254;
      k.floor(x0, z0, x1, z1, y, B.floor_boards, 1);
      k.room(x0, z0, x1, z1, y, 8, B.red_plank, { alt: B.old_plank, altP: 0.3, doors: [{ side: 's', at: 309, width: 3, height: 3 }] });
      for (const x of [306, 312]) { put(x, y + 1, z1, B.window_dark); put(x, y + 5, z1, B.window_dark); }
      for (const z of [250, 252]) { put(x0, y + 5, z, B.window_dark); put(x1, y + 5, z, B.window_dark); }
      fill(x0, y + 8, z0, x1, y + 8, z1, B.old_plank);
      fill(x0 + 1, y + 8, z1, x1 - 1, y + 9, z1, B.red_plank); fill(x0 + 3, y + 10, z1, x1 - 3, y + 10, z1, B.red_plank);
      W.addRoof([x0, y + 8, z0], [x1, y + 10, z1], [[x0, y, z0], [x1, y + 7, z1]]);
      fill(x0, y + 4, z1 + 1, x1, y + 4, z1 + 2, B.planks);                                   // the balcony
      for (const x of [x0, 309, x1]) fill(x, y, z1 + 2, x, y + 3, z1 + 2, B.log);
      for (let x = x0; x <= x1; x += 2) put(x, y + 5, z1 + 2, B.old_plank);
      k.stairs(x1 + 5, z1 + 2, y, 5, [-1, 0], 1, B.planks);
      sign('SALOON', 309, y + 9, z1 + 0.6, 4);
      prop('table', 307, y, 250, { len: 2 }); prop('table', 311, y, 251, { len: 2 }); put(305, y, 249, B.barrel); put(313, y, 249, B.barrel);
      add.chest({ id: 'canyon_c_saloon', x: 305, z: z1 + 2, rarity: 'common' });
      add.landmark({ id: 'canyon_town', x: 309, z: 258 });
    }
    // the general store, its awning over the boardwalk
    {
      const x0 = 305, x1 = 314, z0 = 262, z1 = 267;
      k.floor(x0, z0, x1, z1, y, B.floor_boards, 1);
      k.room(x0, z0, x1, z1, y, 5, B.old_plank, { doors: [{ side: 'n', at: 309, width: 1, height: 3 }] });
      put(307, y + 1, z0, B.shop_window); put(312, y + 1, z0, B.shop_window);
      fill(x0, y + 3, z0 - 1, x1, y + 3, z0 - 1, B.awning);
      fill(x0, y + 5, z0, x1, y + 5, z1, B.old_plank); fill(x0 + 1, y + 6, z0, x1 - 1, y + 6, z0, B.old_plank);
      W.addRoof([x0, y + 5, z0], [x1, y + 6, z1], [[x0, y, z0], [x1, y + 4, z1]]);
      sign('GENERAL STORE', 309, y + 4.2, z0 - 1.2, 5);
      for (const [x, z] of [[306, 266], [307, 266], [313, 263], [313, 264]]) put(x, y, z, rand() < 0.5 ? B.barrel : B.crate);
      under(311, 265, y, () => add.chest({ id: 'canyon_c_store', x: 311, z: 265, rarity: 'common' }));
      under(306, 263, y, () => add.item({ id: 'canyon_can_store', quest: 'canyon_cans', x: 306, z: 263 }));
    }
    // the sheriff's office, its roof fallen in
    {
      const x0 = 320, x1 = 326, z0 = 249, z1 = 254;
      k.floor(x0, z0, x1, z1, y, B.floor_boards, 1);
      k.room(x0, z0, x1, z1, y, 4, B.old_plank, { alt: B.dark_planks, altP: 0.3, doors: [{ side: 's', at: 323, width: 1, height: 3 }] });
      put(321, y + 1, z1, B.window_dark); put(325, y + 1, z1, B.window_dark);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x < 323 || z < 251) put(x, y + 4, z, B.old_plank);
      put(324, y, 252, B.old_plank); put(325, y, 251, B.old_plank); prop('rubble', 324, y, 252);
      sign('SHERIFF', 323, y + 4.4, z1 + 0.6, 3);
    }
    // a little chapel with a bell frame, a dry well, the water tower, hitching rails, a broken wagon
    {
      const x0 = 330, x1 = 336, z0 = 262, z1 = 268;
      k.floor(x0, z0, x1, z1, y, B.floor_boards, 1);
      k.room(x0, z0, x1, z1, y, 4, B.white_trim, { doors: [{ side: 'n', at: 333, width: 1, height: 3 }] });
      for (let i = 0; i < 3; i++) fill(x0 - 1 + i, y + 4 + i, z0 - 1, x1 + 1 - i, y + 4 + i, z1 + 1, B.dark_planks);
      fill(333, y + 7, z0, 333, y + 9, z0, B.log); put(333, y + 10, z0, B.dark_planks);
      W.addRoof([x0 - 1, y + 4, z0 - 1], [x1 + 1, y + 7, z1 + 1], [[x0, y, z0], [x1, y + 3, z1]]);
      prop('table', 333, y, 266, { len: 3 });
    }
    k.pond(339, 249, 340, 250, y, B.desert_sand, 1, B.stone_brick);
    for (const [x, z] of [[338, 248], [341, 248]]) fill(x, y, z, x, y + 2, z, B.log); fill(338, y + 3, 248, 341, y + 3, 248, B.log);
    prop('water_tower', 330, y, 251, { color: 0x8a5a3a });
    for (const [x, rot] of [[302, 0], [318, 0], [328, 0]]) prop('fence', x, y, 256, { len: 3, rot });
    fill(296, y, 263, 299, y, 264, B.planks); put(296, y, 262, B.log); put(299, y, 262, B.log); put(296, y, 265, B.log);
    for (let i = 0; i < 12; i++) sprite('dry_grass', 298 + Math.floor(rand() * 44), y, 256 + Math.floor(rand() * 5), { scale: 1.1 });
    add.camp({ id: 'canyon_town_camp', x: 313, z: 258, kinds: ['skeleton', 'empousa', 'skeleton'], count: 5, chest: 'common', radius: 8 });
    add.npc({ id: 'canyon_hedge', x: 327, z: 257, model: 'hero:grover', yaw: 0 });
    for (const [i, x, z] of [[0, 302, 252], [1, 318, 266], [2, 328, 262], [3, 296, Math.round(washZ(296))], [4, 352, Math.round(washZ(352))]]) add.item({ id: 'canyon_can_' + i, quest: 'canyon_cans', x, z });
  }

  // ------------------------------------------------------------ Split Rock and the slot canyon
  {
    const mx = 365, mz = Math.round(slotZ(365)), y = top(mx, mz);
    const [px, pz] = SLOT_POCKET;
    add.chest({ id: 'canyon_c_slot', x: px + 1, z: pz, rarity: 'epic', hidden: true });
    for (const [x, z] of [[px - 1, pz - 2], [px + 2, pz + 2]]) sprite('skull', x, top(x, z), z, { sway: 0 });
    W.addLight(px + 0.5, top(px, pz) + 1.5, pz + 0.5, 0xffd080, 2.5, 8);
    for (let x = 344; x <= 388; x += 3) { const z = Math.round(slotZ(x)), yy = top(x, z); if (rand() < 0.6) sprite(rand() < 0.5 ? 'bone' : 'dry_grass', x, yy, z, { scale: 0.8 }); }
    sprite('skull', mx + 2, y, mz, { sway: 0 });
    W.addLight(mx + 0.5, y + 1.5, mz + 0.5, 0xffc070, 2, 7);
    add.landmark({ id: 'canyon_slot', x: 343, z: Math.round(slotZ(343)) });
  }

  // ------------------------------------------------------------ Aunty Em's Garden of Stone
  {
    const gx = 364, gz = 270, y = top(gx, gz);
    c.flatten(352, 260, 376, 280, y, B.gravel_path);
    for (let z = 261; z <= 279; z++) for (let x = 353; x <= 375; x++) if (x === gx || z === gz || Math.abs(x - gx) === Math.abs(z - gz)) put(x, y - 1, z, B.marble_floor);
    // low walls with gaps, broken here and there
    for (let x = 352; x <= 376; x++) for (const z of [260, 280]) if (Math.abs(x - gx) > 2 && rand() > 0.15) fill(x, y, z, x, y + (rand() < 0.5 ? 1 : 0), z, B.stone_brick);
    for (let z = 260; z <= 280; z++) for (const x of [352, 376]) if (Math.abs(z - gz) > 2 && rand() > 0.15) fill(x, y, z, x, y + (rand() < 0.5 ? 1 : 0), z, B.stone_brick);
    // the dry fountain, a statue in it
    for (let z = gz - 2; z <= gz + 2; z++) for (let x = gx - 2; x <= gx + 2; x++) if (Math.abs(x - gx) === 2 || Math.abs(z - gz) === 2) put(x, y, z, B.marble_white);
    prop('statue', gx, y - 0.5, gz, { pose: 1 });
    // broken columns and the poor people Medusa caught
    for (const [x, z, h] of [[356, 264, 4], [372, 264, 2], [356, 276, 3], [372, 276, 5], [360, 262, 2], [369, 278, 3]]) { put(x, y, z, B.marble_white); fill(x, y + 1, z, x, y + h - 1, z, B.column); }
    for (let i = 0; i < 12; i++) { const x = 354 + Math.floor(rand() * 21), z = 262 + Math.floor(rand() * 17); if (Math.abs(x - gx) < 4 && Math.abs(z - gz) < 4) continue; if (!W.get(x, y, z)) prop('stone_person', x, y, z, { pose: Math.floor(rand() * 5), rot: rand() * 6.28 }); }
    for (let i = 0; i < 7; i++) { const x = 354 + Math.floor(rand() * 21), z = 262 + Math.floor(rand() * 17); if (!W.get(x, y, z)) prop('gnome', x, y, z, { rot: rand() * 6.28 }); }
    prop('text_sign', 351, y, 270, { text: 'AUNTY EM’S GARDEN GNOME EMPORIUM', w: 5, h: 1.1, post: 1.4, bg: '#e8dcc0', fg: '#6a3a1a', rot: -Math.PI / 2 });
    add.camp({ id: 'canyon_garden_camp', x: gx, z: gz + 4, kinds: ['gorgon_statue', 'gorgon_statue', 'dracaena', 'gorgon_statue', 'dracaena'], count: 5, chest: 'rare', radius: 9 });
    add.chest({ id: 'canyon_c_garden', x: gx + 1, z: gz - 1, rarity: 'rare' });
    add.landmark({ id: 'canyon_garden', x: gx, z: gz });
  }

  // ------------------------------------------------------------ the Sun Arch: a bridge of red rock over the flats
  {
    const ax = 285, az = 277, g = top(ax, az);
    for (let x = ax - 8; x <= ax + 8; x++) {
      const dx = Math.abs(x - ax), under = dx <= 5 ? g + Math.round(6 * Math.sqrt(1 - (dx / 5.6) ** 2)) : -1;
      const topY = g + (dx <= 6 ? 8 : dx === 7 ? 7 : 5);
      for (let z = az - 1; z <= az + 1; z++) for (let y = Math.max(under, top(x, z) - 1); y <= topY - (z === az ? 0 : 1); y++) put(x, y, z, strata[(y + (x & 1)) % strata.length]);
    }
    add.landmark({ id: 'canyon_arch', x: ax, z: az + 3 });
  }

  // ------------------------------------------------------------ the hoodoos: arrows lost round their feet, a niche with a chest
  {
    const sx = 330, sz = 157 + 4, y = top(sx, sz + 2);
    for (let z = sz - 1; z <= sz; z++) fill(sx, y, z, sx, y + 2, z, 0);
    under(sx, sz - 1, y, () => add.chest({ id: 'canyon_c_spire', x: sx, z: sz - 1, rarity: 'rare', hidden: true }));
    add.landmark({ id: 'canyon_spires', x: 334, z: 170 });
  }
  for (const [i, x, z] of [[0, 335, 160], [1, 343, 187], [2, 381, 205], [3, 297, 253], [4, 336, 234]]) add.item({ id: 'canyon_arrow_' + i, quest: 'canyon_arrows', x, z });

  // ------------------------------------------------------------ cactus, bones, dry grass
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(256 + rand() * 140), z = Math.floor(136 + rand() * 150), y = top(x, z);
    if (W.get(x, y - 1, z) !== B.desert_sand || W.get(x, y, z)) continue;
    if ((x > 294 && x < 346 && z > 244 && z < 272) || (x > 289 && x < 311 && z > 157 && z < 175)) continue;
    prop('cactus', x, y, z, { h: 1.4 + rand() * 1.8, rot: rand() * 6.28 });
  }
  for (let i = 0; i < 26; i++) { const x = Math.floor(256 + rand() * 140), z = Math.floor(136 + rand() * 150), y = top(x, z); if (W.get(x, y - 1, z) === B.desert_sand && !W.get(x, y, z)) prop('boulder', x, y, z, { rot: rand() * 6.28, scale: 0.7 + rand() * 0.6 }); }
  c.scatter([B.desert_sand], ['dry_grass', 'dry_grass', 'bone', 'dry_grass', 'skull'], 0.045);
  c.scatter([B.red_rock], ['dry_grass'], 0.03);
  console.log('openworld canyon build ms', Math.round(performance.now() - t0));
}
