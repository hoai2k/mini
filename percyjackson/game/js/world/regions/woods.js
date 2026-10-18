// The Camp Woods (open world, south-east of camp, and the strip south of it):
// deep pine and oak forest stocked with monsters for training. Bunker 9 dug
// into the cliff of its hill (a waterfall beside it, with a secret behind),
// the creek it feeds with a rope bridge and stepping stones, Zeus's Fist
// (with a hidden door at its base), Juniper's tree, a fairy ring of
// mushrooms, a monster den in hollow logs, Shadowfang's burnt hollow, a moonlit
// glade with Artemis's shrine and the old border post by the Labyrinth road.
// Levels 2-4. Juniper and Charles Beckendorf give the side quests.
import { B } from '../blocks.js';
import { pine } from '../rooms.js';

const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function lineD(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// The creek: from the pool under the waterfall by Bunker 9, under the rope
// bridge, down to the marsh in the south.
const CREEK = [[221, 249], [222, 256], [210, 262], [196, 268], [187, 273], [181, 276], [172, 279], [160, 289], [152, 302], [148, 313], [146, 321]];
// Bunker Hill (its south side is the cliff Bunker 9 is dug into).
const BH = { x: 210, z: 233, r: 25, h: 14, face: 245 };
// Places the ground levels out for: [x, z, radius, height above FY].
const FLAT = [
  [222, 291, 14, 1],   // Zeus's Fist
  [238, 308, 12, 1],   // Shadowfang's hollow
  [146, 246, 9, 2],    // Juniper's tree, on a low mound
  [136, 288, 11, 1],   // the moonlit glade
  [186, 302, 10, 1],   // the hollow logs
  [233, 270, 8, 1],    // the mushroom ring
  [240, 247, 7, 1],    // the spider thicket
];

export const terrain = {
  height: (x, z, n) => {
    let h = 1 + (n.fbm(x, z, 38) - 0.45) * 6 + (n.ridge(x, z, 60) - 0.5) * 2;
    h = Math.max(0.6, h);
    if (z <= BH.face) h += BH.h * sm(1 - Math.hypot(x - BH.x, z - BH.z) / BH.r);
    for (const [fx, fz, r, th] of FLAT) { const m = sm(1 - (Math.hypot(x - fx, z - fz) - r * 0.6) / (r * 0.4 + 4)); if (m > 0) h += (th - h) * m; }
    const c = lineD(x, z, CREEK);
    if (c < 4.5) h = Math.min(h, -2.2 + Math.max(0, c - 1.5) * 1.1);
    return h;
  },
  surface: (x, z, h, n) => { if (h >= 7) return B.grass; const v = n.value(x * 0.12, z * 0.12); return v > 0.48 ? B.grass : v > 0.36 ? B.moss_floor : B.forest_floor; },
};

export function build(c) {
  const t0 = performance.now();
  const { W, k, deco, add, top, rand, inRegion, FY } = c;
  const set = (x, y, z, id) => W.set(x, y, z, id);
  const fill = (x0, y0, z0, x1, y1, z1, id) => W.fill(x0, y0, z0, x1, y1, z1, id);
  const ground = (x, z) => top(x, z);
  const setTop = (x, z, id) => { const y = top(x, z); if (isFinite(y)) set(x, y - 1, z, id); };
  const light = (x, y, z, col = 0xffb050, i = 3, d = 8) => W.addLight(x + 0.5, y, z + 0.5, col, i, d);
  const site = (x0, z0, x1, z1, id = null) => { const y = ground((x0 + x1) >> 1, (z0 + z1) >> 1); c.flatten(x0, z0, x1, z1, y, id); return y; };
  const solid = (x, z, h = 2) => { const y = ground(x, z); for (let i = 0; i < h; i++) set(x, y + i, z, B.barrier); };
  const keep = [];   // [x, z, radius]: no trees here
  const no = (x, z, r) => keep.push([x, z, r]);
  const yb = FY + 1;   // the ground at the foot of the cliff

  // ---------------------------------------------------------------- waystones
  add.waystone('woods_creek', 178, 262);
  add.waystone('woods_bunker', 197, 250);
  add.waystone('woods_fist', 216, 304);
  add.waystone('woods_south', 67, 313);
  no(178, 262, 4); no(197, 250, 4); no(216, 304, 4); no(67, 313, 4);

  // ---------------------------------------------------------------- Bunker Hill's cliff, Bunker 9 and the waterfall
  {
    // square the hill's south side off into a cliff face
    const x0 = 192, x1 = 228, zA = 236, zF = BH.face;
    for (let x = x0; x <= x1; x++) {
      const hT = ground(x, zA);
      if (!isFinite(hT) || hT <= yb + 1) continue;
      for (let z = zA + 1; z <= zF; z++) {
        for (let y = FY - 2; y < hT; y++) set(x, y, z, y === hT - 1 ? B.grass : (y + x + z) % 5 ? B.rock : B.stone);
        for (let y = hT; y < hT + 6; y++) set(x, y, z, 0);
      }
    }
    // the hall
    const hx0 = 203, hx1 = 217, hz0 = 236, hz1 = 244;
    fill(hx0 - 1, yb - 1, hz0 - 1, hx1 + 1, yb + 5, hz1, B.dark_brick);
    fill(hx0, yb - 1, hz0, hx1, yb - 1, hz1, B.stone_brick);
    fill(hx0, yb, hz0, hx1, yb + 4, hz1, 0);
    for (const x of [hx0 + 4, hx1 - 4]) for (const z of [hz0 + 3, hz0 + 6]) for (let y = yb; y <= yb + 4; y++) set(x, y, z, B.iron_plate);
    // the vast door, swung open, in an iron frame
    for (let x = 206; x <= 214; x++) for (let y = yb - 1; y <= yb + 5; y++) set(x, y, hz1 + 1, (x === 206 || x === 214 || y === yb + 5) ? B.iron_plate : y === yb - 1 ? B.stone_brick : 0);
    for (const x of [205, 215]) for (let z = hz1 + 2; z <= hz1 + 4; z++) for (let y = yb; y <= yb + 4; y++) set(x, y, z, z === hz1 + 4 ? B.bronze : B.iron_plate);
    for (let z = hz1 + 2; z <= hz1 + 5; z++) for (let x = 206; x <= 214; x++) setTop(x, z, B.gravel_path);
    for (let x = 203; x <= 217; x++) set(x, yb + 6, hz1 + 1, B.log);                                   // the lintel beam over the door
    for (const x of [203, 217]) for (let y = yb; y <= yb + 5; y++) set(x, y, hz1 + 1, B.log);
    for (const [x, z] of [[201, hz1 + 3], [219, hz1 + 3]]) if (!W.get(x, ground(x, z), z)) k.lanternPost(x, z, ground(x, z));
    for (const x of [207, 213]) light(x, yb + 2, hz1 + 3, 0xff7a2a, 3, 8);                             // forge glow spilling out
    // the forge: a lava trough under a capped chimney
    for (let x = 207; x <= 213; x++) for (let z = hz0; z <= hz0 + 2; z++) set(x, yb, z, B.stone_brick);
    for (let x = 208; x <= 212; x++) { set(x, yb, hz0 + 1, 0); set(x, yb - 1, hz0 + 1, B.lava); }
    for (let y = yb + 5; y < ground(210, hz0 + 1) - 1; y++) set(210, y, hz0 + 1, 0);
    set(210, ground(210, hz0 + 1) - 1, hz0 + 1, B.metal_grate);
    light(210, yb + 1.5, hz0 + 2, 0xff7a2a, 6, 14);
    deco.prop('anvil', 209.5, yb, hz0 + 4.5); deco.prop('anvil', 212.5, yb, hz0 + 4.5);
    deco.prop('table', 214.5, yb, 242.5, { len: 4 }); deco.prop('table', 214.5, yb, 239, { len: 4 });
    for (const [x, z] of [[216, 237], [216, 238], [217, 237]]) { set(x, yb, z, B.crate); }
    set(217, yb + 1, 237, B.crate);
    // a half-built bronze dragon's head on the west side
    for (let x = 203; x <= 205; x++) for (let z = 239; z <= 243; z++) for (let y = yb; y <= yb + 2; y++) if (!(z === 243 && y === yb + 1)) set(x, y, z, B.bronze);
    set(203, yb + 2, 240, B.red_lacquer); set(205, yb + 2, 240, B.red_lacquer);
    for (const x of [203, 205]) set(x, yb + 3, 239, B.bronze);
    deco.add('chain', 204.5, yb + 4.9, 241.5, { mode: 'hang', scale: 1.4 });
    for (const [x, z, f] of [[hx0, 238, [1, 0]], [hx0, 242, [1, 0]], [hx1, 241, [-1, 0]]]) k.torch(x - f[0], yb + 1, z, f);
    deco.add('em_hephaestus', 210.5, yb + 3, hz0 + 0.03, { mode: 'wall', facing: [0, 1], scale: 1.6 });
    W.addRoof([hx0 - 1, yb + 5, hz0 - 1], [hx1 + 1, W.sy - 1, hz1], [[hx0, yb, hz0], [hx1, yb + 4, hz1]]);
    // a vent from the hilltop down into the hall (a way in, from above)
    const vx = 204, vz = 237;
    for (let y = yb + 5; y < ground(vx, vz) + 1; y++) set(vx, y, vz, 0);
    add.chest({ id: 'woods_bunker_vent', x: vx, z: vz, rarity: 'rare', hidden: true });
    add.landmark({ id: 'woods_bunker9', x: 210, z: 247 });
    // Beckendorf works outside, by the door
    deco.prop('anvil', 202.5, yb, 248.5);
    add.npc({ id: 'woods_beckendorf', x: 203, z: 250, model: 'npc:woods_beckendorf', yaw: Math.PI });
    // the waterfall: a spring on the hilltop spilling down the face into the creek's pool
    const fx0 = 219, fx1 = 220, hT = ground(219, 240);
    for (let x = fx0; x <= fx1; x++) {
      for (let z = 240; z <= 244; z++) set(x, hT - 1, z, B.water);
      for (let y = FY; y < hT; y++) set(x, y, BH.face, B.water);
      set(x, FY - 1, BH.face, B.rock);
    }
    // ...and behind it, an alcove (open to the spring above, so it stays wet)
    fill(fx0 - 1, yb, BH.face - 2, fx1, yb + 2, BH.face - 1, 0);
    for (let x = fx0 - 1; x <= fx1; x++) for (let z = BH.face - 2; z <= BH.face - 1; z++) set(x, yb - 1, z, B.mossy_brick);
    for (let y = yb + 3; y < hT - 1; y++) set(220, y, BH.face - 1, B.water);
    add.chest({ id: 'woods_waterfall', x: 220, z: BH.face - 1, rarity: 'rare', hidden: true });
    for (let i = 0; i < 10; i++) deco.add('reeds', 214.5 + k.r() * 12, FY, 247 + k.r() * 6, { scale: 1.1, sway: 1 });
    no(210, 240, 20);
  }

  // ---------------------------------------------------------------- the creek: rope bridge, stepping stones, the marsh
  {
    // a rope bridge where the trail crosses (x 180-182, along z)
    for (let z = 271; z <= 281; z++) for (let x = 180; x <= 182; x++) for (let y = yb; y < yb + 4; y++) set(x, y, z, 0);
    k.bridge(180, 271, 182, 281, yb, B.planks, B.dark_planks);
    for (const [x, z] of [[180, 270], [182, 270], [180, 282], [182, 282]]) { const y = ground(x, z); set(x, y, z, B.log); set(x, y + 1, z, B.log); }
    // stepping stones lower down
    const sx = 156, sz = 295, px = 13 / 15.3, pz = 8 / 15.3;
    for (let t = -4.5; t <= 4.5; t += 1.5) { const x = Math.round(sx + px * t), z = Math.round(sz + pz * t); set(x, FY - 2, z, B.rock); set(x, FY - 1, z, B.rock); }
    // the marsh at the bottom: reeds, mud, puddles and a dead tree
    for (let z = 306; z <= 326; z++) for (let x = 138; x <= 160; x++) {
      if (!inRegion(x, z)) continue;
      const y = ground(x, z), b = W.get(x, y - 1, z);
      if (b === B.forest_floor || b === B.grass) { if (k.chance(0.3)) set(x, y - 1, z, B.mud); if (k.chance(0.2)) deco.add('reeds', x + 0.5, y, z + 0.5, { scale: 1.2, sway: 1 }); else if (k.chance(0.05)) deco.add('puddle', x + 0.5, y, z + 0.5, { mode: 'flat' }); }
    }
    { const x = 156, z = 318, y = ground(x, z); for (let h = 0; h < 6; h++) set(x, y + h, z, B.bark_dark); set(x + 1, y + 4, z, B.bark_dark); set(x - 1, y + 3, z, B.bark_dark); set(x - 2, y + 4, z, B.bark_dark); }
    add.camp({ id: 'woods_marsh', x: 153, z: 312, kinds: ['serpent', 'serpent', 'pup'], count: 5, chest: 'common', radius: 8 });
    campDressing(153, 312, { tents: 0, bones: 8, totem: true });
    add.chest({ id: 'woods_marsh', x: 141, z: 323, rarity: 'common' });
    no(150, 316, 9);
  }

  // ---------------------------------------------------------------- Zeus's Fist
  {
    const cx = 222, cz = 290, g = ground(cx, cz);
    const blob = (x, y, z, ax, ay, az, R) => ((x - ax) / R[0]) ** 2 + ((y - ay) / R[1]) ** 2 + ((z - az) / R[2]) ** 2;
    const knuckles = [0, 1, 2, 3].map((i) => [cx - 5.4 + i * 3.6, g + 9, cz - 3]);
    for (let y = g - 1; y <= g + 12; y++) for (let z = cz - 8; z <= cz + 8; z++) for (let x = cx - 10; x <= cx + 10; x++) {
      const j = (k.r() - 0.5) * 0.18;
      let inside = blob(x, y, z, cx, g + 3, cz, [7.5, 7, 6]) < 1 + j;
      for (const [kx, ky, kz] of knuckles) if (blob(x, y, z, kx, ky, kz, [2, 2.2, 2.6]) < 1 + j) inside = true;
      if (blob(x, y, z, cx + 7.5, g + 5, cz + 1.5, [2.2, 3.6, 2.4]) < 1 + j) inside = true;   // the thumb
      if (!inside) continue;
      const crease = y > g + 6 && knuckles.some(([kx]) => Math.abs(x - (kx + 1.8)) < 0.5) && z < cz;
      if (crease) continue;
      set(x, y, z, (x * 3 + y * 7 + z) % 9 === 0 ? B.stone : (y < g + 2 && (x + z) % 4 === 0) ? B.mossy_brick : B.rock);
    }
    // the hidden door, on the south side, screened by a boulder
    const dz0 = cz + 1, dz1 = cz + 8;
    for (let z = dz0; z <= dz1; z++) for (let x = cx - 1; x <= cx; x++) { for (let y = g; y <= g + 2; y++) set(x, y, z, 0); set(x, g - 1, z, B.stone_brick); }
    c.trees.boulder(cx + 2, cz + 10, 1.8, B.rock);
    for (const x of [cx - 3, cx + 2]) { const z = cz + 9; if (!W.get(x, ground(x, z), z)) k.lanternPost(x, z, ground(x, z)); }
    // the chamber: a Labyrinth door marked with a glowing Delta, and a crack to the sky
    fill(cx - 3, g, cz - 3, cx + 3, g + 3, cz + 1, 0);
    fill(cx - 3, g - 1, cz - 3, cx + 3, g - 1, cz + 1, B.stone_brick);
    for (let x = cx - 3; x <= cx + 3; x++) for (let y = g; y <= g + 3; y++) set(x, y, cz - 4, B.stone_brick);
    for (let x = cx - 2; x <= cx + 2; x++) set(x, g + 1, cz - 4, B.blue_energy);
    set(cx - 1, g + 2, cz - 4, B.blue_energy); set(cx + 1, g + 2, cz - 4, B.blue_energy); set(cx, g + 3, cz - 4, B.blue_energy);
    light(cx, g + 2, cz - 2, 0x6ac8ff, 4, 9);
    const crack = [cx - 2, cz - 1];
    for (let y = g + 4; y < W.sy - 1; y++) set(crack[0], y, crack[1], 0);
    add.chest({ id: 'woods_fist_vault', x: crack[0], z: crack[1], rarity: 'epic', hidden: true });
    for (let i = 0; i < 14; i++) deco.add('ivy', cx - 7 + k.r() * 14, g + k.r() * 4, cz + 6.2, { mode: 'wall', facing: [0, 1], scale: 1.4, sway: 0.2 });
    add.landmark({ id: 'woods_fist', x: cx, z: cz + 9 });
    no(cx, cz, 13);
  }

  // ---------------------------------------------------------------- Shadowfang's hollow: burnt ground, dead trees, a broken iron collar
  {
    const cx = 238, cz = 308, g = ground(cx, cz);
    for (let z = cz - 10; z <= cz + 10; z++) for (let x = cx - 10; x <= cx + 10; x++) {
      const d = Math.hypot(x - cx, z - cz); if (d > 10 || !inRegion(x, z)) continue;
      if (d < 8 || k.chance(0.5)) setTop(x, z, k.chance(0.3) ? B.basalt : k.chance(0.5) ? B.dirt : B.mud);
      if (k.chance(0.06)) deco.add(k.chance(0.3) ? 'skull' : 'bone', x + 0.5, ground(x, z), z + 0.5, { mode: 'flat', scale: 0.8 });
    }
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3, x = Math.round(cx + Math.cos(a) * (6 + (i % 3))), z = Math.round(cz + Math.sin(a) * (6 + (i % 3))), y = ground(x, z), h = 5 + (i % 4);
      for (let j = 0; j < h; j++) set(x, y + j, z, B.bark_dark);
      set(x + (i % 2 ? 1 : -1), y + h - 2, z, B.bark_dark); set(x, y + h - 1, z + (i % 2 ? -1 : 1), B.bark_dark);
    }
    for (let a = 0; a < 20; a++) { if (a > 14) continue; const t = a / 20 * Math.PI * 2, x = Math.round(cx - 3 + Math.cos(t) * 2), z = Math.round(cz + 3 + Math.sin(t) * 2); set(x, ground(x, z), z, B.iron_plate); }
    for (let i = 0; i < 4; i++) deco.add('chain', cx - 0.5 + i * 0.6, g + 0.05, cz + 5.5, { mode: 'flat', scale: 1.2 });
    deco.prop('fire', cx + 3.5, g, cz - 2.5, { smoke: true }); light(cx + 3, g + 1, cz - 3, 0xff5a2a, 3, 9);
    deco.prop('fire', cx - 5.5, g, cz - 1.5, { smoke: true });
    {
      const ox = cx + 1, oz = cz - 9, gy = ground(ox, oz);
      for (let dz = -3; dz <= 0; dz++) for (let dx = -6; dx <= 6; dx++) {
        const x = ox + dx, z = oz + dz; if (!inRegion(x, z)) continue;
        const hgt = Math.round(7 - Math.abs(dx) * 0.6 + dz * 0.4 + (k.r() - 0.5) * 1.5); if (hgt <= 0) continue;
        for (let y = Math.min(gy, ground(x, z)) - 1; y < gy + hgt; y++) set(x, y, z, (x + y + z) % 4 ? B.basalt : B.rock);
      }
      // the cracks: lava set into the south face, two blocks up and more (glowing, out of reach)
      for (const [dx, h0, h1] of [[-3, 2, 3], [-2, 3, 4], [0, 2, 5], [1, 4, 4], [3, 2, 3], [4, 3, 3]]) for (let h = h0; h <= h1; h++) if (W.get(ox + dx, gy + h + 1, oz)) set(ox + dx, gy + h, oz, B.lava);
      light(ox, ground(ox, oz + 4) + 2, oz + 4, 0xff5a1a, 4, 12);
    }
    add.champion({ id: 'woods_shadowfang', x: cx, z: cz, kind: 'hellhound', elite: 'shadow' });
    add.landmark({ id: 'woods_hollow', x: cx, z: cz });
    no(cx, cz, 11);
  }

  // ---------------------------------------------------------------- Juniper's tree
  {
    const x = 146, z = 246, y = ground(x, z);
    // a 2x2 trunk, then a bushy, lumpy crown of juniper needles
    for (let h = 0; h < 11; h++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) set(x + a, y + h, z + b, B.log);
    for (const [ox, oy, oz, R] of [[0.5, 8, 0.5, 4.6], [-2.5, 10, 1.5, 3.4], [3, 11, -1, 3.4], [1, 13, 3, 3], [0.5, 15, 0.5, 2.8], [-1, 6, -2, 2.8]]) {
      const ccx = x + ox, ccy = y + oy, ccz = z + oz;
      for (let yy = Math.floor(ccy - R); yy <= ccy + R; yy++) for (let zz = Math.floor(ccz - R); zz <= ccz + R; zz++) for (let xx = Math.floor(ccx - R); xx <= ccx + R; xx++) {
        const d = Math.hypot(xx - ccx, (yy - ccy) * 1.15, zz - ccz);
        if (d > R || (d > R - 0.7 && k.chance(0.35)) || W.get(xx, yy, zz)) continue;
        set(xx, yy, zz, B.pine_leaves);
      }
    }
    for (const [dx, dz] of [[-1, 0], [2, 0], [0, -1], [0, 2], [-1, 1], [2, 1], [1, -1], [1, 2]]) {
      const len = 2 + (Math.abs(dx) + Math.abs(dz)) % 2;
      for (let s = 1; s <= len; s++) { const rx = x + (dx < 0 ? -s + 1 : dx > 1 ? s : dx), rz = z + (dz < 0 ? -s + 1 : dz > 1 ? s : dz); const gy = W.groundBelow(rx + 0.5, rz + 0.5, y + 1); if (s === 1 || !W.get(rx, gy, rz)) set(rx, gy - (s > 2 ? 1 : 0), rz, B.log); }
    }
    for (let i = 0; i < 40; i++) { const a = k.r() * 6.28, r = 2 + k.r() * 4.5, hy = y + 5 + k.r() * 9; deco.add('flower_blue', x + 1 + Math.cos(a) * r, hy, z + 1 + Math.sin(a) * r, { mode: 'hang', scale: 0.6 }); }
    for (let i = 0; i < 30; i++) { const a = k.r() * 6.28, r = 5 + k.r() * 3, fx = Math.floor(x + 1 + Math.cos(a) * r), fz = Math.floor(z + 1 + Math.sin(a) * r); if (!W.get(fx, ground(fx, fz), fz)) deco.add(['flower_blue', 'flower_yellow', 'flower_red'][i % 3], fx + 0.5, ground(fx, fz), fz + 0.5, { scale: 0.9, sway: 1 }); }
    add.npc({ id: 'woods_juniper', x: 153, z: 254, model: 'npc:woods_juniper', yaw: Math.PI * 0.75 });
    add.chest({ id: 'woods_juniper_roots', x: 139, z: 252, rarity: 'common' });
    add.landmark({ id: 'woods_juniper', x: 147, z: 247 });
    no(147, 247, 10);
  }

  // ---------------------------------------------------------------- the mushroom ring
  {
    const cx = 233, cz = 270, g = ground(cx, cz);
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; deco.add('mushroom', cx + 0.5 + Math.cos(a) * 4.2, g, cz + 0.5 + Math.sin(a) * 4.2, { scale: 1.5 }); }
    for (const [a, h, R] of [[0.4, 4, 2], [2.5, 3, 1], [4.4, 5, 2]]) {
      const x = Math.round(cx + Math.cos(a) * 7.5), z = Math.round(cz + Math.sin(a) * 7.5), y = ground(x, z);
      for (let j = 0; j < h; j++) set(x, y + j, z, B.plaster);
      for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (Math.abs(dx) + Math.abs(dz) <= R + 1) set(x + dx, y + h, z + dz, (dx * 3 + dz * 5) % 4 === 0 ? B.white_trim : B.barn_red);
      if (R > 1) set(x, y + h + 1, z, B.barn_red);
    }
    for (let i = 0; i < 18; i++) deco.add('mushroom', cx + 0.5 + k.rnd(-9, 9), g, cz + 0.5 + k.rnd(-9, 9), { scale: 0.8 + k.r() * 0.5 });
    light(cx, g + 1.5, cz, 0xc8a0ff, 2.5, 8);
    add.chest({ id: 'woods_fairy_ring', x: cx, z: cz, rarity: 'rare' });
    add.landmark({ id: 'woods_mushrooms', x: cx, z: cz });
    no(cx, cz, 10);
  }

  // ---------------------------------------------------------------- the hollow logs (monster den)
  {
    const g = site(178, 295, 196, 310);
    const log = (x0, z0, len, axis, R = 2.2) => {
      const cy = g + 1.6;
      for (let s = 0; s < len; s++) for (let a = -3; a <= 3; a++) for (let yy = g - 1; yy <= g + 4; yy++) {
        const d = Math.hypot(a, yy - cy + 0.5); if (d > R || d < R - 1.1) continue;
        const x = axis === 'x' ? x0 + s : x0 + a, z = axis === 'x' ? z0 + a : z0 + s;
        if (yy >= g) set(x, yy, z, (s + a) % 5 === 0 ? B.bark_dark : B.log);
      }
    };
    log(179, 298, 11, 'x'); log(193, 300, 9, 'z'); log(181, 309, 6, 'x', 1.7);
    for (let i = 0; i < 12; i++) deco.add('mushroom', 180 + k.r() * 10, g + 3.2, 298.5 + k.rnd(-1, 1), { scale: 0.7 });
    campDressing(186, 304, { tents: 1, bones: 10, totem: true });
    add.camp({ id: 'woods_hollow_logs', x: 186, z: 304, kinds: ['pup', 'pup', 'serpent'], count: 6, chest: 'common', radius: 8 });
    add.chest({ id: 'woods_logs', x: 184, z: 298, rarity: 'common' });
    add.landmark({ id: 'woods_logs', x: 186, z: 302 });
    no(186, 302, 11);
  }

  // ---------------------------------------------------------------- the spider thicket
  {
    const cx = 240, cz = 247, g = ground(cx, cz);
    for (let i = 0; i < 26; i++) deco.add('cobweb', cx + 0.5 + k.rnd(-7, 7), g + k.r() * 3, cz + 0.5 + k.rnd(-7, 7), { scale: 1.6 + k.r(), mode: k.chance(0.5) ? 'hang' : undefined });
    for (const [dx, dz] of [[-4, -3], [3, -5], [5, 3], [-2, 5], [-6, 2]]) { const x = cx + dx, z = cz + dz, y = ground(x, z); set(x, y, z, B.plaster); if ((dx + dz) % 2) set(x, y + 1, z, B.plaster); }
    for (let i = 0; i < 5; i++) { const a = i * 1.26, x = Math.round(cx + Math.cos(a) * 8), z = Math.round(cz + Math.sin(a) * 8); if (inRegion(x, z) && !W.get(x, ground(x, z), z)) { pine(k, x, z, ground(x, z), { h: 9 }); deco.add('cobweb', x + 0.5, ground(x, z) + 1, z + 0.5, { scale: 2.2, mode: 'hang' }); } }
    campDressing(cx, cz, { tents: 0, bones: 12, totem: true });
    add.camp({ id: 'woods_spider_thicket', x: cx, z: cz, kinds: ['spider'], count: 7, chest: 'common', radius: 8 });
    no(cx, cz, 8);
  }

  // ---------------------------------------------------------------- the moonlit glade: Artemis's shrine, standing stones, a silver bow
  {
    const cx = 136, cz = 288, g = site(cx - 4, cz - 4, cx + 4, cz + 4);
    for (let z = cz - 4; z <= cz + 4; z++) for (let x = cx - 4; x <= cx + 4; x++) { const d = Math.hypot(x - cx, z - cz); if (d <= 4.3) set(x, g - 1, z, d < 1.5 ? B.silver_plate : (x + z) % 2 ? B.marble_floor : B.marble_white); }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + 0.2, x = Math.round(cx + Math.cos(a) * 8.5), z = Math.round(cz + Math.sin(a) * 8.5), y = ground(x, z);
      for (let h = 0; h < 3; h++) set(x, y + h, z, B.marble_white); set(x, y + 3, z, B.silver_plate);
    }
    // the silver bow, standing behind the altar
    for (let dx = -4; dx <= 4; dx++) { const h = Math.round(Math.sqrt(Math.max(0, 20 - dx * dx)) * 0.9); set(cx + dx, g + 1 + h, cz - 5, B.silver_plate); }
    for (let y = g + 1; y <= g + 1; y++) for (const dx of [-4, 4]) set(cx + dx, y, cz - 5, B.marble_white);
    deco.add('em_artemis', cx + 0.5, g + 2.2, cz - 4.45, { mode: 'wall', facing: [0, 1], scale: 1.5 });
    deco.prop('archery_target', cx + 0.5 - 9, ground(cx - 9, cz + 5), cz + 5.5, { rot: 0.8, arrows: true }); deco.prop('archery_target', cx + 0.5 + 9, ground(cx + 9, cz + 5), cz + 5.5, { rot: -0.8, arrows: true });
    light(cx, g + 4, cz, 0xc8dcff, 3.5, 12);
    for (let i = 0; i < 30; i++) { const a = k.r() * 6.28, r = 5 + k.r() * 6; deco.add(k.chance(0.5) ? 'flower_blue' : 'grass', cx + 0.5 + Math.cos(a) * r, g, cz + 0.5 + Math.sin(a) * r, { scale: 0.9, sway: 1 }); }
    add.shrine({ id: 'woods_artemis', x: cx, z: cz, waves: [['pup', 'pup', 'spider', 'spider'], ['serpent', 'spider', 'pup', 'pup', 'spider'], ['hellhound', 'pup', 'pup', 'serpent']] });
    no(cx, cz, 11);
    // the Hunters' lookout: a platform on posts, stairs up the side, and something left behind on top
    const lx0 = 121, lz0 = 297, lx1 = 124, lz1 = 300, ly = ground(122, 302);
    for (const [x, z] of [[lx0, lz0], [lx1, lz0], [lx0, lz1], [lx1, lz1]]) for (let h = 0; h < 5; h++) set(x, ground(x, z) + h, z, B.log);
    fill(lx0, ly + 5, lz0, lx1, ly + 5, lz1, B.planks);
    k.stairs(122, 306, ly, 6, [0, -1], 2, B.planks);
    for (let z = 301; z <= 306; z++) for (let x = 122; x <= 123; x++) for (let y = ly + 6; y < ly + 9; y++) if (!W.get(x, y, z)) set(x, y, z, 0);
    deco.prop('fence', lx0 + 1.5, ly + 6, lz0 + 0.1, { len: 3 }); deco.prop('fence', lx0 + 0.1, ly + 6, lz0 + 2, { len: 3, rot: Math.PI / 2 });
    add.chest({ id: 'woods_lookout', x: lx1, z: lz0 + 1, rarity: 'rare' });
    no(122, 300, 6);
  }

  // ---------------------------------------------------------------- the old border post (the strip by the Labyrinth road)
  {
    const tx0 = 30, tz0 = 313, tx1 = 35, tz1 = 318, g = site(tx0 - 1, tz0 - 1, tx1 + 1, tz1 + 1);
    fill(tx0, g - 1, tz0, tx1, g - 1, tz1, B.cobble);
    for (let y = 0; y < 7; y++) for (let x = tx0; x <= tx1; x++) for (let z = tz0; z <= tz1; z++) {
      if (x !== tx0 && x !== tx1 && z !== tz0 && z !== tz1) continue;
      if (x === tx1 && z >= 315 && z <= 316 && y < 3) continue;           // the door, east
      if (y > 2 + ((x * 7 + z * 3) % 5)) continue;                         // the broken top
      set(x, g + y, z, (x + y + z) % 4 === 0 ? B.cracked_brick : B.stone_brick);
    }
    for (const [x, z] of [[37, 312], [38, 312], [28, 320]]) set(x, ground(x, z), z, B.stone_brick);
    deco.prop('flagpole', 27.5, ground(27, 314), 314.5, { h: 5, color: 0x6a2a2a });
    campDressing(40, 318, { tents: 2, bones: 8, totem: true });
    add.camp({ id: 'woods_border_post', x: 40, z: 318, kinds: ['dracaena', 'pup', 'pup'], count: 4, chest: 'rare', radius: 9 });
    add.chest({ id: 'woods_border_tower', x: 32, z: 315, rarity: 'common' });
    add.landmark({ id: 'woods_border_post', x: 34, z: 316 });
    no(36, 316, 11);
  }

  // ---------------------------------------------------------------- the creek's rocky banks, giant mushrooms round Juniper
  {
    // mossy rocks along both banks, reeds and cattails at the water's edge
    for (let i = 0; i < CREEK.length - 1; i++) {
      const [ax, az] = CREEK[i], [bx, bz] = CREEK[i + 1], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let t = 0; t < L; t += 1) for (const side of [-1, 1]) {
        const x = Math.round(ax + (bx - ax) * t / L + nx * side * (3.6 + k.r() * 1.2)), z = Math.round(az + (bz - az) * t / L + nz * side * (3.6 + k.r() * 1.2));
        if (!inRegion(x, z) || (x >= 179 && x <= 183 && z >= 268 && z <= 284)) continue;   // the rope bridge's ends stay open
        const y = ground(x, z); if (!isFinite(y) || W.get(x, y, z) || W.get(x, y - 1, z) === B.water || y > FY + 3) continue;
        const r = k.r();
        if (r < 0.32) { set(x, y, z, k.chance(0.5) ? B.mossy_brick : B.rock); if (k.chance(0.25)) set(x, y + 1, z, B.rock); }
        else if (r < 0.6) deco.add('reeds', x + 0.5, y, z + 0.5, { scale: 1.2, sway: 1 });
        else if (r < 0.7) deco.add('flower_blue', x + 0.5, y, z + 0.5, { scale: 0.9, sway: 1 });
      }
    }
    // lanterns at the rope bridge's ends
    for (const [x, z] of [[179, 269], [183, 283]]) { const y = ground(x, z); if (isFinite(y) && !W.get(x, y, z)) k.lanternPost(x, z, y); }
    // red-capped toadstools as tall as a camper round Juniper's tree
    for (const [x, z, h, R] of [[140, 241, 3, 1], [153, 243, 4, 2], [141, 254, 2, 1], [151, 239, 2, 1]]) {
      const y = ground(x, z); if (!isFinite(y) || W.get(x, y, z)) continue;
      for (let j = 0; j < h; j++) set(x, y + j, z, B.plaster);
      for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (Math.abs(dx) + Math.abs(dz) <= R + (R > 1 ? 1 : 0)) set(x + dx, y + h, z + dz, (dx * 3 + dz * 5) % 4 === 0 ? B.white_trim : B.barn_red);
      if (R > 1) set(x, y + h + 1, z, B.barn_red);
    }
    for (let i = 0; i < 14; i++) { const x = 146 + k.rnd(-8, 8), z = 247 + k.rnd(-8, 8), y = W.groundBelow(x, z, FY + 4); if (isFinite(y) && !W.get(Math.floor(x), y, Math.floor(z))) deco.add('mushroom', x, y, z, { scale: 0.9 + k.r() * 0.6 }); }
  }

  // ---------------------------------------------------------------- the things Juniper and Beckendorf want found
  for (const [i, x, z] of [[1, 230, 266], [2, 184, 283], [3, 176, 296], [4, 122, 299], [5, 145, 318]]) add.item({ id: 'woods_acorn_' + i, quest: 'woods_silver_acorns', x, z });
  for (const [i, x, z] of [[1, 223, 250], [2, 230, 296], [3, 245, 253], [4, 44, 312]]) add.item({ id: 'woods_scrap_' + i, quest: 'woods_bronze_scrap', x, z });

  // ---------------------------------------------------------------- trails
  c.road([[164, 220], [168, 240], [176, 258]], B.dirt_road, 2);
  c.road([[176, 258], [188, 252], [197, 252], [205, 249]], B.dirt_road, 2);
  c.road([[170, 268], [181, 270], [181, 282], [192, 292], [200, 300]], B.dirt_road, 2);
  c.road([[140, 262], [146, 254]], B.dirt_road, 2);
  c.road([[140, 262], [138, 276], [137, 282]], B.dirt_road, 2);
  c.road([[200, 300], [212, 301], [222, 300]], B.dirt_road, 2);
  c.road([[59, 316], [42, 317]], B.dirt_road, 2);
  // ---------------------------------------------------------------- lanterns along the trails
  for (const [x, z] of [[166, 232], [172, 250], [186, 255], [173, 266], [184, 289], [196, 296], [141, 270], [208, 302], [50, 314]]) {
    for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [-3, 0]]) {
      const px = x + dx, pz = z + dz, y = ground(px, pz);
      if (!inRegion(px, pz) || !isFinite(y) || W.get(px, y, pz) || [B.dirt_path, B.dirt_road, B.water].includes(W.get(px, y - 1, pz))) continue;
      k.lanternPost(px, pz, y); no(px, pz, 2); break;
    }
  }

  // the openworld roads come later; keep their lines clear of trees
  const ROADS = [[[110, 260], [140, 262], [170, 268]], [[200, 300], [235, 320], [262, 330]], [[60, 303], [62, 330]], [[164, 220], [168, 240], [176, 258]], [[176, 258], [188, 252], [205, 249]], [[170, 268], [181, 270], [181, 282], [192, 292], [200, 300]], [[59, 316], [42, 317]], [[140, 262], [138, 276], [137, 282]]];

  // ---------------------------------------------------------------- the forest
  const clear = (x, z, m = 0) => keep.some(([kx, kz, r]) => Math.hypot(x - kx, z - kz) < r + m) || ROADS.some((p) => lineD(x, z, p) < 3.5) || lineD(x, z, CREEK) < 4;
  const plant = (x, z) => {
    if (!inRegion(x, z) || clear(x, z, 3) || !c.level(x, z, 3, 3, 1)) return;
    const r = rand();
    if (r < 0.05) c.trees.pine(x, z, { h: 13 + Math.floor(rand() * 4), wide: true });
    else if (r < 0.62) c.trees.pine(x, z);
    else c.trees.oak(x, z, { h: 5 + Math.floor(rand() * 3) });
  };
  for (let i = 0; i < 520; i++) plant(Math.floor(118 + rand() * 130), Math.floor(222 + rand() * 106));
  for (let i = 0; i < 70; i++) plant(Math.floor(20 + rand() * 96), Math.floor(306 + rand() * 22));
  // fallen logs and mossy boulders
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(122 + rand() * 124), z = Math.floor(224 + rand() * 102);
    if (!inRegion(x, z) || clear(x, z, 2) || !c.level(x, z, 5, 3, 1)) continue;
    if (rand() < 0.5) { const y = ground(x, z); for (let s = -2; s <= 2; s++) set(x + s, y, z, B.log); deco.add('mushroom', x + 0.5, y + 1, z + 0.5, { scale: 0.7 }); }
    else c.trees.boulder(x, z, 1.3 + rand() * 0.6, B.rock);
  }
  // ground cover
  const cover = (x0, z0, x1, z1) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!k.chance(0.2) || !inRegion(x, z)) continue;
      const y = ground(x, z); if (!isFinite(y) || W.get(x, y, z)) continue;
      const b = W.get(x, y - 1, z);
      const types = b === B.forest_floor ? ['fern', 'fern', 'leaf_litter', 'mushroom', 'grass', 'leaf_litter'] : b === B.grass ? ['grass', 'tall_grass', 'fern', 'flower_blue', 'grass'] : null;
      if (!types) continue;
      const t = types[Math.floor(k.r() * types.length)];
      deco.add(t, x + 0.5 + k.rnd(-0.3, 0.3), y, z + 0.5 + k.rnd(-0.3, 0.3), { scale: t === 'tall_grass' ? 1.1 : 0.8, sway: 1 });
    }
  };
  cover(116, 220, 249, 329); cover(16, 304, 115, 329);

  console.log('openworld woods build ms', Math.round(performance.now() - t0));

  // A monster camp's dressing: the shared kit (openworld.js regionContext).
  function campDressing(x, z, o = {}) { c.campDressing(x, z, { ground: B.dirt, ...o }); }

}

// Juniper (a tree nymph) and Charles Beckendorf (Hephaestus). Rewards for levels 2-4.
export const QUESTS = [
  { id: 'woods_web_trouble', giver: 'woods_juniper',
    steps: [{ type: 'kill', kind: 'spider', count: 8, region: 'woods' }, { type: 'return' }],
    reward: { xp: 200, coins: 70, item: 'common' } },
  { id: 'woods_silver_acorns', giver: 'woods_juniper', requires: ['woods_web_trouble'],
    steps: [{ type: 'collect', count: 5 }, { type: 'return' }],
    reward: { xp: 260, coins: 90, item: 'common' } },
  { id: 'woods_shadowfang', giver: 'woods_juniper', requires: ['woods_silver_acorns'],
    steps: [{ type: 'reach', x: 238, z: 300, radius: 8 }, { type: 'champion', id: 'woods_shadowfang' }, { type: 'return' }],
    reward: { xp: 420, coins: 150, item: 'unique' } },
  { id: 'woods_bronze_scrap', giver: 'woods_beckendorf',
    steps: [{ type: 'collect', count: 4 }, { type: 'return' }],
    reward: { xp: 220, coins: 80, item: 'common' } },
  { id: 'woods_fist_door', giver: 'woods_beckendorf', requires: ['woods_bronze_scrap'],
    steps: [{ type: 'reach', x: 222, z: 299, radius: 4 }, { type: 'chest', id: 'woods_fist_vault' }, { type: 'return' }],
    reward: { xp: 280, coins: 100, item: 'rare' } },
  { id: 'woods_border_patrol', giver: 'woods_beckendorf', requires: ['woods_fist_door'],
    steps: [{ type: 'camp', id: 'woods_border_post' }, { type: 'camp', id: 'woods_hollow_logs' }, { type: 'shrine', id: 'woods_artemis' }, { type: 'return' }],
    reward: { xp: 340, coins: 130, item: 'rare' } },
];
