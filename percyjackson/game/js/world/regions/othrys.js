// Mount Othrys (open world, north-east): grey crags and scree under storm
// clouds, and the black-marble ruins of the Titans' palace on the summit.
// Levels 8-10.
//
//   x 210        250            300  (chasm)         355         399
//   z 0   +--------------------------------------------------------+
//         |  ledge   Hunters'   Zeus's      harpy     Titans'   scree|
//         |          Hollow     Crag        nests     palace       |
//         |          (Zoë)                            (summit)     |
//         |                Titan's   the Chasm         waystone    |
//         |                Pass      Bridge                 Kronos's|
//         |  waystone  (chains)                             Face   |
//         |  (Bianca)                     the Cyclops Forge        |
//   z 130 +----- road from the fields          waystone   Gorgos   +
//
// One trail climbs from the fields road through the pass, over the chasm
// and up to the summit; branches lead to the hollow, the crag and the forge.
// The mountain's shape is carved round those trails (terrain.height).
import { B } from '../blocks.js';
import { column } from '../rooms.js';

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const SUMMIT = [355, 32], HOLLOW = [246, 40], CRAG = [290, 28], FORGE = [345, 98], PASS = [268, 84], GORGOS = [386, 112], FACE = [380, 72];
// trails: [x, z, height above the camp ground] along each
const TRAILS = [
  [[238, 98, 1], [268, 84, 5], [300, 66, 8], [326, 54, 13], [344, 48, 18], [355, 44, 20]],   // the main climb
  [[262, 87, 4], [254, 60, 3], [247, 47, 2]],                                                 // down into the hollow
  [[250, 36, 2], [270, 31, 8], [283, 29, 14]],                                                // up to Zeus's crag
  [[312, 60, 10], [330, 84, 6], [343, 96, 3]],                                                // down to the forge
  [[350, 104, 3], [366, 112, 5], [380, 113, 7]],                                              // on to Gorgos's throne
];
const SEGS = [];
for (const tr of TRAILS) for (let i = 0; i < tr.length - 1; i++) SEGS.push([tr[i], tr[i + 1]]);
// the nearest trail: [distance, height there]
function nearTrail(x, z) {
  let best = 1e9, e = 0;
  for (const [[ax, az, ae], [bx, bz, be]] of SEGS) {
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; e = ae + (be - ae) * t; }
  }
  return [best, e];
}
// the chasm across the main climb, east of the pass
const CH = { x0: 300, x1: 304, z0: 42, z1: 92, mid: 66 };

export const terrain = {
  height(x, z, n) {
    let h = n.ridge(x, z, 52) * 13 + (n.fbm(x, z, 18) - 0.5) * 4;
    // the summit: a broad cone with a level top for the palace
    const dS = Math.hypot(x - SUMMIT[0], z - SUMMIT[1]);
    h = Math.max(h, dS < 17 ? 20 : 20 * smooth(1 - (dS - 17) / 58));
    // the Hunters' hollow: a sheltered bowl inside a ring of crags
    const dH = Math.hypot(x - HOLLOW[0], z - HOLLOW[1]);
    if (dH < 24) h = Math.min(h, 2 + Math.max(0, dH - 10) * 0.9);
    h = Math.max(h, 10 * smooth(1 - Math.abs(dH - 16) / 5));
    // Zeus's crag: a level top high over the hollow
    const dC = Math.hypot(x - CRAG[0], z - CRAG[1]);
    h = Math.max(h, dC < 7 ? 14 : 14 - (dC - 7) * 1.1);
    // the forge basin, and the rise Gorgos sits on
    const dF = Math.hypot(x - FORGE[0], z - FORGE[1]);
    if (dF < 30) h = Math.min(h, 3 + Math.max(0, dF - 13) * 0.8);
    const dG = Math.hypot(x - GORGOS[0], z - GORGOS[1]);
    h = Math.max(h, dG < 5 ? 7 : 7 - (dG - 5) * 1.2);
    // the trails: a level way through, the slopes either side cut back
    const [d, e] = nearTrail(x, z);
    if (d < 2.5) h = e;
    else if (h > e) h = Math.min(h, e + (d - 2.5) * 0.9);
    else h = e + (h - e) * smooth((d - 2.5) / 6);
    // Titan's Pass: steep walls close in either side of the trail
    const dP = Math.hypot(x - PASS[0], z - PASS[1]);
    if (dP < 26 && d > 4) h = Math.max(h, e + Math.min(12, (d - 4) * 1.5) * smooth(1 - dP / 26));
    return Math.min(22, h);
  },
  surface(x, z, h, n) {
    // grey crag and scree; grass only low down (the basalt tile carries coloured climbing holds, so not here)
    const v = n.value(x * 0.3, z * 0.3), w = n.value(x * 0.9 + 7, z * 0.9);
    if (h >= 15) return v > 0.7 ? B.stone : w > 0.8 ? B.cobble : B.rock;
    if (h >= 8) return v > 0.66 ? B.stone : v < 0.24 ? B.cobble : w > 0.82 ? B.moss_floor : B.rock;
    if (h >= 4) return v > 0.5 ? (w > 0.6 ? B.stone : B.rock) : B.grass;
    return v > 0.8 ? B.rock : B.grass;
  },
};

export function build(c) {
  const { W, k, deco, add, scatter, trees, inRegion, top, rand, n, road } = c;
  const S = (x, y, z, id) => { if (inRegion(x, z) && y >= 0 && y < W.sy) W.set(x, y, z, id); };
  const G = (x, y, z) => W.get(x, y, z);
  const col = (x, z, y0, y1, id) => { for (let y = y0; y <= y1; y++) S(x, y, z, typeof id === 'function' ? id(x, y, z) : id); };
  const clearUp = (x, z, y0, h = 8) => { for (let y = y0; y < y0 + h; y++) S(x, y, z, 0); };
  const marble = (x, y, z) => { const v = n.hash(x * 5 + y, z * 3 - y); return v < 0.18 ? B.underworld_rock : v < 0.26 ? B.obsidian : B.black_marble; };
  const pad = (x0, z0, x1, z1, y, id = null) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!inRegion(x, z)) continue;
      const g = top(x, z), cur = isFinite(g) ? G(x, g - 1, z) : B.rock;
      for (let yy = Math.min(g, y) - 3; yy < y; yy++) S(x, yy, z, yy === y - 1 ? (id ?? cur ?? B.rock) : B.stone);
      clearUp(x, z, y, 10);
    }
  };
  const apron = (x, z, y, [dx, dz], w = 3, id = B.gravel_path) => {
    const px = -dz, pz = dx, prev = new Map();
    for (let s = 1; s <= 16; s++) {
      let changed = false;
      for (let q = -(w >> 1); q <= (w >> 1); q++) {
        const bx = x + dx * s + px * q, bz = z + dz * s + pz * q, p = prev.get(q) ?? y;
        if (!inRegion(bx, bz)) continue;
        const g = top(bx, bz); let lv = g;
        if (g < p - 1) { lv = p - 1; for (let yy = g - 1; yy < lv; yy++) S(bx, yy, bz, yy === lv - 1 ? id : B.stone); changed = true; }
        else if (g > p + 1) { lv = p + 1; for (let yy = lv; yy < g + 2; yy++) S(bx, yy, bz, 0); S(bx, lv - 1, bz, id); changed = true; }
        prev.set(q, lv);
      }
      if (!changed && s > 1) break;
    }
  };
  const light = (x, y, z, color = 0xffb060, i = 3, d = 8) => W.addLight(x + 0.5, y, z + 0.5, color, i, d);
  const bones = (x, z, y, m = 3) => { for (let i = 0; i < m; i++) deco.add(i % 3 === 2 ? 'skull' : 'bone', x + 0.5 + (rand() - 0.5) * 2, y, z + 0.5 + (rand() - 0.5) * 2, { mode: 'flat', scale: 0.6 + rand() * 0.3 }); };
  const fire = (x, z, y) => { deco.prop('campfire', x + 0.5, y, z + 0.5); light(x, y + 1, z, 0xff8a30, 5, 11); };
  const tent = (x, z, y, axis, id) => {
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const yy = y + 2 - Math.abs(b), [bx, bz] = axis === 'x' ? [x + a, z + b] : [x + b, z + a];
      S(bx, yy, bz, id);
      if (a === -2 && Math.abs(b) < 2) for (let q = y; q < yy; q++) S(bx, q, bz, id);
    }
  };
  const totem = (x, z, y) => { col(x, z, y, y + 2, B.bone_block); deco.add('skull', x + 0.5, y + 3, z + 0.5, { scale: 0.9, sway: 0 }); deco.add('banner', x + 0.5, y + 2.4, z - 0.05, { mode: 'wall', facing: [0, -1], scale: 1.2, sway: 0.5 }); };
  // a huge chain of iron links from a to b (sagging), as blocks
  const chain = ([ax, ay, az], [bx, by, bz], sag = 3) => {
    const L = Math.hypot(bx - ax, by - ay, bz - az), steps = Math.ceil(L);
    const ux = (bx - ax) / L, uz = (bz - az) / L, px = -uz, pz = ux;   // horizontal perpendicular
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = Math.round(ax + (bx - ax) * t), z = Math.round(az + (bz - az) * t);
      const y = Math.round(ay + (by - ay) * t - Math.sin(Math.PI * t) * sag);
      S(x, y, z, B.iron_plate);
      if (i % 4 === 1) { S(Math.round(x + px), y, Math.round(z + pz), B.iron_plate); S(Math.round(x - px), y, Math.round(z - pz), B.iron_plate); }
      else if (i % 4 === 3) { S(x, y + 1, z, B.iron_plate); S(x, y - 1, z, B.iron_plate); }
    }
  };
  // a ragged nest of logs and hay
  const nest = (x, z) => {
    const y = top(x, z);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const r = Math.hypot(dx, dz);
      if (r > 2.4) continue;
      if (r > 1.5) S(x + dx, y, z + dz, (dx + dz) & 1 ? B.log : B.old_plank); else S(x + dx, y - 1, z + dz, B.hay);
    }
    bones(x, z, y, 2);
  };

  // ================================================================ the trails
  road(TRAILS[0].map(([x, z]) => [x, z]), B.gravel_path, 3);
  for (const tr of TRAILS.slice(1)) road(tr.map(([x, z]) => [x, z]), B.gravel_path, 2);
  road([[240, 95], [238, 98]], B.cobble, 3);

  // ================================================================ Titan's Pass: the broken chains
  {
    const [px, pz] = PASS, y = top(px, pz);
    const pillar = (x, z) => {
      const g = top(x, z), hgt = 9;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) col(x + dx, z + dz, g - 2, g + hgt, (xx, yy, zz) => (yy === g + hgt ? B.bronze : marble(xx, yy, zz)));
      deco.add('chain', x + 0.5, g + hgt + 1, z + 1.6, { mode: 'hang', scale: 2.6, sway: 0.2 });
      return [x, g + hgt, z];
    };
    const A = pillar(px - 4, pz - 13), Bp = pillar(px + 5, pz + 12);
    chain([A[0], A[1], A[2] + 2], [px - 1, y + 1, pz - 3], 2);
    chain([Bp[0], Bp[1], Bp[2] - 2], [px + 2, y + 1, pz + 3], 2);
    // the broken ends lie across the trail
    for (let i = -3; i <= 3; i++) S(px + i, y, pz + (i > 0 ? 1 : 0), i % 2 ? B.iron_plate : 0);
    deco.add('chain', px + 0.5, y + 0.05, pz - 1.5, { mode: 'flat', scale: 2.2 });
    deco.add('chain', px + 2.5, y + 0.05, pz + 2.5, { mode: 'flat', scale: 2.2 });
    add.landmark({ id: 'oth_pass', x: px, z: pz });
    add.chest({ id: 'oth_pass_chest', x: px - 1, z: pz - 5, rarity: 'common' });
    // monsters camp in the lee of the north wall
    const cx = 274, cz = 79, cy = top(cx, cz);
    tent(cx - 3, cz - 2, cy, 'x', B.old_plank); totem(cx + 3, cz - 3, cy); fire(cx, cz, cy); bones(cx + 2, cz + 2, cy);
    add.camp({ id: 'oth_pass_camp', x: cx, z: cz, kinds: ['hellhound', 'harpy', 'skeleton'], count: 5, radius: 8, chest: 'common' });
    add.waystone('othrys_pass', 244, 103);
    add.npc({ id: 'bianca', x: 249, z: 106, model: 'npc:bianca', yaw: 2.6 });
    deco.prop('flagpole', 251.5, top(251, 108), 108.5, { h: 4, color: 0xd8dce8 });
  }

  // ================================================================ the Chasm Bridge
  {
    const yb = Math.max(top(CH.x0 - 2, CH.mid), top(CH.x1 + 2, CH.mid - 1));
    for (let z = CH.z0; z <= CH.z1; z++) {
      const floor = 4 + Math.max(0, Math.abs(z - CH.mid) - 12);
      for (let x = CH.x0; x <= CH.x1; x++) {
        const g = top(x, z);
        if (floor >= g) continue;
        // ragged walls: the edges bite in and out
        if ((x === CH.x0 || x === CH.x1) && n.hash(x, z) < 0.25) continue;
        for (let y = floor; y < g + 2; y++) S(x, y, z, 0);
        S(x, floor - 1, z, n.hash(x * 3, z) < 0.3 ? B.cobble : B.stone);
      }
    }
    k.bridge(CH.x0 - 2, CH.mid - 2, CH.x1 + 2, CH.mid + 2, yb, B.planks, B.dark_planks);
    for (const x of [CH.x0 - 2, CH.x1 + 2]) for (const z of [CH.mid - 2, CH.mid + 2]) { col(x, z, yb - 3, yb + 1, B.log); }
    for (let x = CH.x0 - 2; x <= CH.x1 + 2; x++) for (const z of [CH.mid - 2, CH.mid + 2]) S(x, yb, z, B.dark_planks);
    for (let x = CH.x0 - 1; x <= CH.x1 + 1; x++) S(x, yb, CH.mid - 2, x === CH.x0 + 2 ? 0 : B.dark_planks);   // one rail is missing
    add.landmark({ id: 'oth_bridge', x: CH.x1 + 4, z: CH.mid });
    add.chest({ id: 'oth_chasm_chest', x: 302, z: 75, rarity: 'rare', hidden: true });
    bones(302, 73, 4, 4);
    light(302, 6, 75, 0x8ab0ff, 2, 7);
    // two more chain pillars on the rims, their broken chains hanging down into the chasm
    for (const [px, pz, ex, ez] of [[295, 55, 302, 60], [308, 79, 302, 85]]) {
      const g = top(px, pz), hgt = 10;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) col(px + dx, pz + dz, g - 2, g + hgt, (xx, yy, zz) => (yy === g + hgt ? B.bronze : marble(xx, yy, zz)));
      chain([px + Math.sign(ex - px) * 2, g + hgt - 1, pz + Math.sign(ez - pz)], [ex, 7, ez], 2);
    }
  }

  // ================================================================ the Hunters' Hollow
  {
    const [hx, hz] = HOLLOW, y = top(hx, hz);
    const silver = (x, z, axis) => { tent(x, z, top(x, z), axis, B.silver_plate); };
    silver(hx - 6, hz - 5, 'z'); silver(hx + 6, hz - 5, 'z'); silver(hx - 7, hz + 4, 'x'); silver(hx + 7, hz + 4, 'x');
    fire(hx, hz, y);
    for (const [dx, dz, r] of [[-3, 0, 1.6], [3, 0, -1.6], [0, -3, 0]]) deco.prop('bench', hx + dx + 0.5, y, hz + dz + 0.5, { rot: r });
    deco.prop('archery_target', hx - 2.5, top(hx - 3, hz + 9), hz + 9.5, { rot: Math.PI });
    deco.prop('archery_target', hx + 2.5, top(hx + 2, hz + 9), hz + 9.5, { rot: Math.PI });
    deco.prop('flagpole', hx + 0.5, y, hz - 7.5, { h: 6, color: 0xc8d0e0 });
    for (const [dx, dz] of [[-10, -3], [10, -3], [-4, 8], [5, 8]]) deco.prop('flagpole', hx + dx + 0.5, top(hx + dx, hz + dz), hz + dz + 0.5, { h: 4, color: 0xe8ecf4 });
    light(hx, y + 2, hz, 0xffb060, 4, 12);
    deco.add('em_artemis', hx + 0.5, y + 0.02, hz + 3.5, { mode: 'flat', scale: 1.4 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, x = Math.round(hx + Math.cos(a) * 12), z = Math.round(hz + Math.sin(a) * 12); if (c.level(x, z, 3, 3, 2)) trees.pine(x, z, { h: 8 }); }
    add.npc({ id: 'zoe', x: hx + 1, z: hz + 3, model: 'npc:zoe', yaw: Math.PI });
    add.chest({ id: 'oth_hollow_chest', x: hx + 9, z: hz - 2, rarity: 'common' });
    add.landmark({ id: 'oth_hollow', x: hx, z: hz - 2 });
    add.waystone('othrys_hollow', 256, 56);
  }

  // ================================================================ Zeus's Crag: the shrine
  {
    const [cx, cz] = CRAG, y = top(cx, cz);
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
      const r = Math.hypot(dx, dz);
      if (r > 6.4) continue;
      S(cx + dx, y - 1, cz + dz, r < 1.6 ? B.gold_marble : r > 5.4 ? B.marble_white : (dx + dz) & 1 ? B.marble_floor : B.marble);
      clearUp(cx + dx, cz + dz, y, 6);
    }
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, x = Math.round(cx + Math.cos(a) * 6), z = Math.round(cz + Math.sin(a) * 6);
      if (i === 3) continue;   // the side the trail comes up stays open
      const hh = 3 + Math.floor(n.hash(x, z) * 3);
      column(k, x, z, y, hh, { cap: hh >= 5 ? B.lightning_stone : B.column });
    }
    // the golden bolt on a plinth behind the altar
    const bx = cx, bz = cz - 4;
    col(bx, bz, y, y, B.black_marble);
    for (const [dx, dy] of [[0, 1], [1, 2], [0, 3], [-1, 3], [0, 4], [1, 5]]) S(bx + dx, y + dy, bz, B.gold_plate);
    light(bx, y + 4, bz, 0xfff0a0, 4, 10);
    deco.add('em_zeus', bx + 0.5, y + 1.5, bz + 0.52, { mode: 'wall', facing: [0, 1], scale: 1.2, sway: 0 });
    deco.prop('brazier', cx - 3.5, y, cz - 3.5); deco.prop('brazier', cx + 4.5, y, cz - 3.5);
    light(cx - 4, y + 1.4, cz - 4, 0xffd080, 3, 8); light(cx + 4, y + 1.4, cz - 4, 0xffd080, 3, 8);
    add.shrine({ id: 'oth_zeus_shrine', x: cx, z: cz, waves: [['harpy', 'harpy', 'skeleton'], ['hellhound', 'harpy', 'automaton', 'skeleton'], ['cyclops', 'harpy', 'harpy'], ['automaton', 'hellhound', 'hellhound', 'cyclops']] });
    add.landmark({ id: 'oth_crag', x: cx, z: cz + 2 });
    add.chest({ id: 'oth_crag_chest', x: bx + 2, z: bz - 1, rarity: 'common' });
  }

  // ================================================================ harpy nests on the ridge
  {
    const cx = 318, cz = 30, y = top(cx, cz);
    for (const [dx, dz] of [[-4, -3], [4, -2], [0, 5], [6, 4]]) nest(cx + dx, cz + dz);
    totem(cx - 1, cz, y);
    add.camp({ id: 'oth_nest_camp', x: cx, z: cz, kinds: ['harpy', 'harpy', 'stymphalian'], count: 5, radius: 9, chest: 'common' });
  }

  // ================================================================ the Titans' palace on the summit
  {
    const [sx, sz] = SUMMIT, x0 = sx - 13, x1 = sx + 13, z0 = sz - 13, z1 = sz + 13, y = top(sx, sz);
    pad(x0 - 2, z0 - 3, x1 + 2, z1 + 2, y, B.obsidian);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) S(x, y - 1, z, n.hash(x, z * 2) < 0.2 ? B.rock : (x + z) & 1 ? B.black_marble : B.obsidian);
    // the outer wall: broken, crenellated
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
      if (z === z1 && Math.abs(x - sx) <= 2) continue;          // the gate
      const r = n.hash(x * 7, z * 11);
      let hh = r < 0.12 ? 1 + Math.floor(r * 15) : 5;
      if (hh === 5 && (x + z) % 2 === 0) hh = 6;
      col(x, z, y, y + hh - 1, marble);
    }
    // gate towers
    for (const tx of [sx - 4, sx + 4]) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) col(tx + dx, z1 + dz, y, y + 7, (xx, yy, zz) => (yy === y + 7 && dx && dz ? B.gold_trim : marble(xx, yy, zz)));
    for (let dx = -2; dx <= 2; dx++) if (dx !== 1) S(sx + dx, y + 6, z1, B.black_marble);   // a cracked lintel
    apron(sx, z1 + 2, y, [0, 1], 5, B.gravel_path);
    // the courtyard: fallen columns, broken statues
    for (const [x, z, hh] of [[sx - 8, sz + 6, 6], [sx + 8, sz + 6, 2], [sx - 8, sz + 1, 3], [sx + 8, sz + 1, 6]]) {
      col(x, z, y, y + hh - 1, B.black_marble); if (hh >= 6) S(x, y + hh, z, B.gold_trim);
    }
    for (let i = 0; i < 5; i++) S(sx - 6 + i, y, sz + 9, B.black_marble);
    for (let i = 0; i < 4; i++) S(sx + 5, y, sz + 3 + i, B.black_marble);
    deco.prop('statue', sx - 5.5, y, sz + 10.5, { bronze: true, pose: 1, rot: 0.4 });
    deco.prop('rubble', sx + 3.5, y, sz + 8.5); deco.prop('rubble', sx - 3.5, y, sz + 4.5);
    // the throne room: a dais of thrones, Kronos's own the largest, cracked down the middle
    for (let z = z0 + 2; z <= sz - 2; z++) for (let x = sx - 9; x <= sx + 5; x++) S(x, y, z, z === sz - 2 && (x + z) & 1 ? B.gold_trim : B.black_marble);
    for (let z = z0 + 2; z <= sz - 2; z++) for (let x = sx - 9; x <= sx + 5; x++) clearUp(x, z, y + 1, 6);
    const ty = y + 1;   // standing on the dais
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = 0; dz <= 1; dz++) S(sx + dx, ty, z0 + 4 + dz, B.black_marble);                       // the seat
      const hh = dx === 1 || dx === 2 ? 4 : 7;                                                             // the back, broken on one side
      col(sx + dx, z0 + 3, ty, ty + hh, (xx, yy) => (yy === ty + hh ? B.gold_trim : B.black_marble));
    }
    col(sx - 3, z0 + 4, ty, ty + 1, B.black_marble); col(sx + 3, z0 + 4, ty, ty + 1, B.black_marble);       // arms
    S(sx - 3, ty + 2, z0 + 4, B.gold_trim);
    deco.prop('round_shield', sx + 2.5, ty + 0.4, z0 + 6.5, { rot: 0.6 });
    for (const [dx, colr] of [[-7, 0x4a4a52], [-5, 0x6a5a3a], [3, 0x5a5a6a]]) deco.prop('throne', sx + dx + 0.5, ty, z0 + 4.5, { color: colr, bronze: dx === -5 });
    deco.prop('rubble', sx + 4.5, ty, z0 + 5.5, {}); deco.prop('rubble', sx - 8.5, ty, z0 + 7.5, {});
    // behind the great throne, a gap in the north wall and a hidden alcove
    for (let yy = ty; yy < ty + 3; yy++) for (let dx = -1; dx <= 1; dx++) S(sx + dx, yy, z0, 0);
    for (let z = z0 - 3; z <= z0 - 1; z++) for (let x = sx - 2; x <= sx + 2; x++) {
      const edge = x === sx - 2 || x === sx + 2 || z === z0 - 3;
      S(x, y, z, B.gold_marble);
      if (edge) col(x, z, y + 1, y + 4, B.black_marble); else clearUp(x, z, y + 1, 5);
    }
    add.chest({ id: 'oth_throne_chest', x: sx, z: z0 - 2, rarity: 'epic', hidden: true });
    // the north-east tower, with a stair up its side
    for (let dz = 0; dz <= 4; dz++) for (let dx = 0; dx <= 4; dx++) {
      const x = x1 - 4 + dx, z = z0 + dz;
      col(x, z, y, y + 8, marble);
      if ((dx === 0 || dx === 4 || dz === 0 || dz === 4) && (dx + dz) % 2 === 0 && !(dx === 0 && dz >= 3)) S(x, y + 9, z, B.black_marble);
    }
    k.stairs(x1 - 4, z0 + 13, y, 9, [0, -1], 2, B.obsidian);
    add.chest({ id: 'oth_tower_chest', x: x1 - 2, z: z0 + 2, rarity: 'rare' });
    for (const [x, z] of [[sx - 6, sz + 11], [sx + 6, sz + 11]]) { deco.prop('brazier', x + 0.5, y, z + 0.5); light(x, y + 1.4, z, 0xff8a3a, 4, 10); }
    // the Titans' black spires: tall broken columns at the corners and along the walls, fire on the tallest
    const spire = (x, z, hh, w = 2) => {
      for (let dz = 0; dz < w; dz++) for (let dx = 0; dx < w; dx++) {
        const cut = w > 1 && dx + dz === 2 * (w - 1) ? 2 : w > 1 && dx + dz === 0 ? 1 : 0;   // a ragged, broken top
        col(x + dx, z + dz, y - 1, y + hh - 1 - cut, (xx, yy, zz) => ((yy - y) % 5 === 4 ? B.obsidian : n.hash(xx + yy, zz * 3) < 0.5 ? B.dark_brick : B.black_marble));
      }
      if (hh >= 13) {
        deco.prop('fire', x + 0.5, y + hh - 1, z + 0.5); light(x, y + hh + 0.5, z, 0xff7a30, 5, 14); }
    };
    for (const [x, z, hh] of [[x0 - 1, z0 - 1, 16], [x1, z0 - 1, 15], [x0 - 1, z1, 14], [x1, z1, 13], [sx - 8, z0 - 1, 12], [sx + 7, z0 - 1, 10], [x0 - 1, sz - 4, 11], [x0 - 1, sz + 5, 9], [x1, sz - 6, 12], [x1, sz + 4, 10], [sx - 10, z1, 12], [sx + 9, z1, 11]]) spire(x, z, hh);
    for (const [x, z, hh] of [[sx - 11, sz - 9, 9], [sx + 8, sz - 10, 8], [sx - 11, sz + 9, 7], [sx + 11, sz + 9, 8]]) spire(x, z, hh, 1);
    // red war banners of the Titans down the south wall and the gate towers, a gold eye on each
    const banner = (x, z, fz) => { for (let yy = y + 2; yy <= y + 5; yy++) for (let dx = 0; dx <= 1; dx++) S(x + dx, yy, z + fz, yy === y + 4 && dx === 0 ? B.gold_trim : yy === y + 2 && dx === 1 ? 0 : B.red_lacquer); };
    for (const x of [sx - 12, sx - 8, sx + 7, sx + 11]) if (G(x, y + 4, z1) && G(x + 1, y + 4, z1)) banner(x, z1, 1);
    for (const tx of [sx - 4, sx + 4]) banner(tx - (tx < sx ? 1 : 0), z1 + 1, 1);
    // the gate towers rise higher, crowned with gold and fire
    for (const tx of [sx - 4, sx + 4]) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) col(tx + dx, z1 + dz, y + 8, y + 10, (xx, yy) => (yy === y + 10 && (dx + dz) % 2 ? 0 : yy === y + 8 ? B.gold_trim : B.black_marble)); deco.prop('fire', tx + 0.5, y + 11, z1 + 0.5); light(tx, y + 12, z1, 0xff7a30, 5, 14); }
    // a cold purple light where Kronos's power lingers: on the cracked throne, and in the gate
    light(sx, ty + 3, z0 + 5, 0xb060ff, 5, 12); light(sx, y + 2, z1 - 1, 0x9a50ff, 3, 8);
    add.camp({ id: 'oth_fortress_camp', x: sx, z: sz + 6, kinds: ['skeleton', 'automaton', 'skeleton', 'harpy'], count: 6, radius: 8, chest: 'rare' });
    add.landmark({ id: 'oth_fortress', x: sx, z: sz });
    add.waystone('othrys_summit', 334, 62);
  }

  // ================================================================ Kronos's fallen face
  {
    const [fx, fz] = FACE, y = top(fx, fz);
    pad(fx - 6, fz - 6, fx + 6, fz + 6, y, B.gravel_path);
    // a great black head lying in the scree, face to the west, its crown split open
    for (let z = fz - 4; z <= fz + 4; z++) for (let x = fx - 3; x <= fx + 4; x++) {
      const shell = x === fx - 3 || x === fx + 4 || z === fz - 4 || z === fz + 4;
      const hh = 7 - Math.max(0, Math.abs(z - fz) - 2) - (x > fx + 2 ? 1 : 0);
      for (let yy = y; yy < y + hh; yy++) if (shell) S(x, yy, z, n.hash(x + yy, z) < 0.15 ? B.underworld_rock : B.black_marble);
      if (!shell && n.hash(x * 3, z) < 0.25) S(x, y, z, B.rock);
    }
    for (let dz = -1; dz <= 1; dz++) for (let yy = y; yy < y + 2; yy++) S(fx - 3, yy, fz + dz, 0);   // the mouth: the way in
    for (const dz of [-2, 2]) { S(fx - 3, y + 4, fz + dz, B.gold_plate); S(fx - 4, y + 3, fz + dz, 0); }   // gold eyes
    col(fx - 4, fz, y + 2, y + 3, B.black_marble);                                                     // the nose
    for (const dz of [-4, -2, 0, 2, 4]) S(fx + 4, y + 6, fz + dz, B.gold_trim);                       // crown points
    apron(fx - 4, fz, y, [-1, 0], 3, B.gravel_path);
    add.chest({ id: 'oth_face_chest', x: fx, z: fz, rarity: 'rare', hidden: true });
    add.landmark({ id: 'oth_face', x: fx - 6, z: fz });
  }

  // ================================================================ the Cyclops Forge
  {
    const [fx, fz] = FORGE, y = top(fx, fz);
    pad(fx - 9, fz - 9, fx + 9, fz + 9, y, B.gravel_path);
    // the forge: a hearth of dark brick with a lava pit, a chimney and anvils
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) S(fx - 5 + dx, y, fz - 5 + dz, B.dark_brick);
    k.pond(fx - 6, fz - 6, fx - 4, fz - 4, y + 1, B.lava, 1, B.dark_brick);
    for (let yy = y; yy < y + 7; yy++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) S(fx - 9 + dx, yy, fz - 9 + dz, B.dark_brick);
    deco.prop('fire', fx - 8.5, y + 7, fz - 8.5, { smoke: true });
    light(fx - 5, y + 1.5, fz - 5, 0xff6a20, 6, 12);
    deco.prop('anvil', fx - 1.5, y, fz - 5.5); deco.prop('anvil', fx - 5.5, y, fz - 1.5, { rot: 1.2 });
    // a hut of rusty sheets
    const hx0 = fx + 3, hz0 = fz - 8, hx1 = fx + 8, hz1 = fz - 3;
    k.room(hx0, hz0, hx1, hz1, y, 3, B.corrugated, { alt: B.rust_metal, altP: 0.4, doors: [{ side: 's', at: fx + 5, width: 1 }] });
    // junk piles: rust, panels, barrels, a car on its back
    const heap = (x, z, r, tall) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const d = Math.hypot(dx, dz); if (d > r + 0.3) continue; const hh = Math.max(1, Math.round((1 - d / (r + 1)) * tall)); for (let yy = 0; yy < hh; yy++) S(x + dx, y + yy, z + dz, [B.rust_metal, B.iron_plate, B.corrugated, B.steel_panel, B.barrel, B.crate][Math.floor(n.hash(x + dx + yy, z + dz) * 6)]); } };
    heap(fx + 6, fz + 6, 2, 3); heap(fx - 7, fz + 5, 2, 2); heap(fx + 8, fz + 1, 1, 2);
    deco.prop('car_flipped', fx + 1.5, y, fz + 7.5, { rot: 0.4 });
    for (const [dx, dz] of [[-2, 4], [3, -1]]) { deco.prop('fire', fx + dx + 0.5, y, fz + dz + 0.5); light(fx + dx, y + 1, fz + dz, 0xff7a30, 4, 9); }
    for (let i = 0; i < 4; i++) S(fx - 3 + i, y, fz + 8, B.log);   // a spare club
    bones(fx, fz + 2, y, 4);
    // the Cyclopes' red tents and a lookout of lashed logs, flying red rags
    for (const [tx, tz, ax] of [[fx - 13, fz - 3, 'z'], [fx - 12, fz + 4, 'x']]) tent(tx, tz, top(tx, tz), ax, B.red_lacquer);
    {
      const ox = fx + 11, oz = fz - 10, oy = top(ox, oz), th = 5;
      for (const [dx, dz] of [[0, 0], [2, 0], [0, 2], [2, 2]]) col(ox + dx, oz + dz, top(ox + dx, oz + dz), oy + th - 1, B.log);
      for (let dz = 0; dz <= 2; dz++) for (let dx = 0; dx <= 2; dx++) S(ox + dx, oy + th, oz + dz, B.old_plank);
      for (const [dx, dz] of [[0, 0], [2, 0], [0, 2], [2, 2]]) S(ox + dx, oy + th + 1, oz + dz, B.log);
      for (let yy = oy + th + 1; yy <= oy + th + 3; yy++) S(ox + 1, yy, oz - 1, yy === oy + th + 1 ? 0 : B.red_lacquer);
      deco.prop('fire', ox + 1.5, oy + th + 1, oz + 1.5, { scale: 0.7 }); light(ox + 1, oy + th + 2, oz + 1, 0xff7a30, 4, 12);
    }
    add.camp({ id: 'oth_forge_camp', x: fx, z: fz + 1, kinds: ['cyclops', 'hellhound', 'hellhound', 'skeleton'], count: 5, radius: 8, chest: 'rare' });
    add.landmark({ id: 'oth_forge', x: fx, z: fz });
    // a hollow heap with a chest in it, its way in hidden on the far side
    const jx = fx - 10, jz = fz + 12, jy = top(jx, jz);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2 || (dx === 0 && dz === 2)) continue;
      for (let yy = jy; yy < jy + 3; yy++) S(jx + dx, yy, jz + dz, [B.rust_metal, B.corrugated, B.crate][Math.floor(n.hash(dx + yy, dz) * 3)]);
    }
    add.chest({ id: 'oth_junk_chest', x: jx, z: jz, rarity: 'rare', hidden: true });
    // Mythomagic figures lost in the junk (Bianca's quest)
    for (const [i, x, z] of [[0, fx + 6, fz + 9], [1, fx - 8, fz + 2], [2, fx + 9, fz - 1]]) add.item({ id: `oth_figure_${i}`, quest: 'othrys_bianca_figures', x, z });
    add.waystone('othrys_forge', 325, 122);
  }

  // ================================================================ Gorgos's junk throne
  {
    const [gx, gz] = GORGOS, y = top(gx, gz);
    pad(gx - 4, gz - 4, gx + 4, gz + 4, y, B.gravel_path);
    for (let dx = -2; dx <= 2; dx++) {
      S(gx + dx, y, gz + 3, B.rust_metal); S(gx + dx, y, gz + 2, B.crate);
      col(gx + dx, gz + 4, y, y + (Math.abs(dx) === 2 ? 3 : 5), (xx, yy) => (yy % 2 ? B.rust_metal : B.corrugated));
    }
    col(gx - 3, gz + 3, y, y + 2, B.barrel); col(gx + 3, gz + 3, y, y + 2, B.barrel);
    deco.prop('car_flipped', gx - 6.5, y, gz - 2.5, { rot: 1.4 });
    for (let i = 0; i < 5; i++) S(gx + 4, y, gz - 3 + i, B.log);
    for (const [dx, dz] of [[-3, -3], [3, -3]]) { deco.prop('brazier', gx + dx + 0.5, y, gz + dz + 0.5); light(gx + dx, y + 1.4, gz + dz, 0xff8a30, 4, 9); }
    totem(gx, gz - 4, y);
    bones(gx, gz - 1, y, 5);
    add.champion({ id: 'oth_gorgos', x: gx, z: gz, kind: 'cyclops' });
  }

  // ================================================================ odd treasure on the heights
  for (const [id, x, z, rarity] of [['oth_ledge_chest', 228, 14, 'common'], ['oth_scree_chest', 390, 30, 'common']]) {
    add.chest({ id, x, z, rarity, hidden: true });
    const y = top(x, z);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1]]) S(x + dx, y, z + dz, B.rock);
  }
  // Zoë's lost arrows on the slopes
  for (const [i, x, z] of [[0, 284, 46], [1, 312, 52], [2, 262, 70], [3, 335, 30]]) add.item({ id: `oth_arrow_${i}`, quest: 'othrys_zoe_arrows', x, z });

  // ================================================================ boulders, a few hardy pines, grass in the low places
  // grey crags: jagged pinnacles of rock standing out of the slopes (the sheet's skyline), kept off the trails and places
  const clear = [[...SUMMIT, 22], [...FORGE, 15], [...CRAG, 10], [...FACE, 9], [...GORGOS, 9], [...HOLLOW, 14], [...PASS, 8], [318, 30, 10], [302, 66, 9], [244, 103, 8], [256, 56, 6], [334, 62, 6], [325, 122, 6],
    [228, 14, 4], [390, 30, 4], [284, 46, 3], [312, 52, 3], [262, 70, 3], [335, 30, 3], [302, 75, 6], [274, 79, 9]];
  const free = (x, z, m = 0) => inRegion(x, z) && inRegion(x + 3, z + 3) && nearTrail(x, z)[0] > 5 + m && !clear.some(([a, b, r]) => Math.hypot(x - a, z - b) < r + m);
  for (let i = 0, placed = 0; i < 320 && placed < 46; i++) {
    const x = 214 + Math.floor(rand() * 180), z = 4 + Math.floor(rand() * 120);
    if (!free(x, z, 3) || x < 222 && z > 100) continue;
    const g = top(x, z), hh = 6 + Math.floor(rand() * 8) + (g - c.FY > 8 ? 4 : 0), w = 2 + Math.floor(rand() * 3);
    for (let dz = 0; dz < w; dz++) for (let dx = 0; dx < w; dx++) {
      const gg = top(x + dx, z + dz), e = Math.max(Math.abs(dx - (w - 1) / 2), Math.abs(dz - (w - 1) / 2));
      const cap = hh - Math.round(e * 3) - Math.floor(n.hash(x + dx, z + dz) * 3);
      for (let yy = gg - 2; yy < g + cap; yy++) S(x + dx, yy, z + dz, yy > g + cap - 3 && n.hash(x + dx, yy + z) < 0.35 ? B.stone : n.hash(x + dx + yy, z + dz) < 0.22 ? B.cobble : B.rock);
    }
    S(x - 1, top(x - 1, z), z, B.cobble); S(x + w, top(x + w, z + 1), z + 1, B.rock);   // scree at the foot
    placed++;
  }
  for (let i = 0, placed = 0; i < 160 && placed < 56; i++) {
    const x = 214 + Math.floor(rand() * 182), z = 4 + Math.floor(rand() * 122);
    if (!free(x, z, 1) || Math.hypot(x - SUMMIT[0], z - SUMMIT[1]) < 20 || Math.hypot(x - FORGE[0], z - FORGE[1]) < 12 || Math.hypot(x - CRAG[0], z - CRAG[1]) < 9 || Math.hypot(x - FACE[0], z - FACE[1]) < 8 || Math.hypot(x - GORGOS[0], z - GORGOS[1]) < 7 || Math.hypot(x - HOLLOW[0], z - HOLLOW[1]) < 11) continue;
    if (!c.level(x, z, 3, 3, 2)) continue;
    const g = top(x, z) - c.FY;
    if (g < 12 && rand() < 0.8) trees.pine(x, z, { h: 7 + Math.floor(rand() * 5), R: 2.2 + rand() * 0.5 });
    else trees.boulder(x, z, 1.2 + rand() * 1.2, rand() < 0.6 ? B.rock : B.stone);
    placed++;
  }
  scatter([B.grass], ['grass', 'dry_grass', 'dry_grass', 'tall_grass'], 0.1);
  scatter([B.rock, B.gravel_path], ['dry_grass', 'chips'], 0.02);
}

export const QUESTS = [
  // Bianca di Angelo, newest of the Hunters, watching the road up the mountain
  { id: 'othrys_bianca_harpies', giver: 'bianca', steps: [{ type: 'kill', kind: 'harpy', count: 6, region: 'othrys' }, { type: 'camp', id: 'oth_pass_camp' }, { type: 'return' }], reward: { xp: 700, coins: 220 } },
  { id: 'othrys_bianca_figures', giver: 'bianca', requires: ['othrys_bianca_harpies'], steps: [{ type: 'collect', count: 3 }, { type: 'return' }], reward: { xp: 760, coins: 240, item: 'rare' } },
  { id: 'othrys_bianca_gorgos', giver: 'bianca', requires: ['othrys_bianca_figures'], steps: [{ type: 'reach', x: 372, z: 112, radius: 6 }, { type: 'champion', id: 'oth_gorgos' }, { type: 'return' }], reward: { xp: 1000, coins: 320, item: 'unique' } },
  // Zoë Nightshade, lieutenant of the Hunters, in the hollow below the crag
  { id: 'othrys_zoe_hounds', giver: 'zoe', steps: [{ type: 'kill', kind: 'hellhound', count: 6, region: 'othrys' }, { type: 'return' }], reward: { xp: 700, coins: 220 } },
  { id: 'othrys_zoe_arrows', giver: 'zoe', requires: ['othrys_zoe_hounds'], steps: [{ type: 'collect', count: 4 }, { type: 'chest', id: 'oth_chasm_chest' }, { type: 'return' }], reward: { xp: 800, coins: 250, item: 'rare' } },
  { id: 'othrys_zoe_palace', giver: 'zoe', requires: ['othrys_zoe_arrows'], steps: [{ type: 'shrine', id: 'oth_zeus_shrine' }, { type: 'camp', id: 'oth_fortress_camp' }, { type: 'return' }], reward: { xp: 1100, coins: 340, item: 'unique' } },
];
