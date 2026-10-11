// Hand-designed room pieces. Each template stamps a room into the world
// using the building kit and the biome palette, and reports spawn points,
// prop slots and features. Rooms float over the abyss like Minecraft
// Dungeons islands, so open edges are real drops.
import { B } from './blocks.js';

// Room context: { k: Kit, x0, z0, x1, z1, y (floor surface), b: biome, r: rng, spawns: [], slots: [] }
function base(c, opts = {}) {
  const { k, x0, z0, x1, z1, y, b } = c;
  k.floor(x0, z0, x1, z1, y, opts.floor ?? b.floor, 6, opts.alt ?? b.floor2, opts.altP ?? 0.2);
}
function edgeWalls(c, h = 4, gaps = true) {
  const { k, x0, z0, x1, z1, y, b, doors } = c;
  k.room(x0, z0, x1, z1, y, h, b.wall, { alt: b.wall2, altP: 0.15, trim: b.trim, doors: doors.map((d) => ({ ...d, width: 5, height: h })) });
  if (gaps) {
    // crumbled gaps so the room doesn't feel boxed in (and edges you can fall from)
    const n = 2 + Math.floor(c.r() * 3);
    for (let i = 0; i < n; i++) {
      const side = Math.floor(c.r() * 4); const len = 2 + Math.floor(c.r() * 3);
      const at = side < 2 ? x0 + 3 + Math.floor(c.r() * (x1 - x0 - 6)) : z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6));
      for (let t = 0; t < len; t++) for (let yy = y + 1 + Math.floor(c.r() * 2); yy < y + h; yy++) {
        if (side === 0) k.w.set(at + t, yy, z0, 0); else if (side === 1) k.w.set(at + t, yy, z1, 0);
        else if (side === 2) k.w.set(x0, yy, at + t, 0); else k.w.set(x1, yy, at + t, 0);
      }
    }
  }
  // torches on the inside of the walls
  for (let x = x0 + 4; x < x1 - 2; x += 7) { k.torch(x, y + 2, z0, [0, 1]); k.torch(x, y + 2, z1, [0, -1]); }
  for (let z = z0 + 4; z < z1 - 2; z += 7) { k.torch(x0, y + 2, z, [1, 0]); k.torch(x1, y + 2, z, [-1, 0]); }
}
function spawnGrid(c, n = 10, margin = 3) {
  const { x0, z0, x1, z1, y } = c;
  for (let i = 0; i < n * 3 && c.spawns.length < n; i++) {
    const x = x0 + margin + Math.floor(c.r() * (x1 - x0 - margin * 2)), z = z0 + margin + Math.floor(c.r() * (z1 - z0 - margin * 2));
    // search from just above the room floor so roofs, canopies and balconies
    // never take spawns (raised ground up to 2 blocks is fine)
    const gy = c.k.w.groundBelow(x + 0.5, z + 0.5, y + 2.5);
    if (!isFinite(gy) || gy < y - 3 || c.k.w.solidAt(x + 0.5, gy + 0.5, z + 0.5) || c.k.w.solidAt(x + 0.5, gy + 1.5, z + 0.5)) continue;
    c.spawns.push([x + 0.5, gy, z + 0.5]);
  }
}
function scatterBreakables(c, n) {
  const { k, x0, z0, x1, z1, y } = c;
  for (let i = 0; i < n; i++) {
    const x = x0 + 2 + Math.floor(c.r() * (x1 - x0 - 4)), z = z0 + 2 + Math.floor(c.r() * (z1 - z0 - 4));
    if (k.w.get(x, y, z) || !k.w.get(x, y - 1, z)) continue;
    const id = c.r() < 0.5 ? B.crate : B.barrel;
    k.w.set(x, y, z, id);
    if (c.r() < 0.4 && !k.w.get(x + 1, y, z)) k.w.set(x + 1, y, z, id);
    if (c.r() < 0.25) k.w.set(x, y + 1, z, B.crate);
  }
}
function decorate(c, amount = 1) {
  const { k, x0, z0, x1, z1, y, b } = c;
  k.cobwebCorners(x0, z0, x1, z1, y + 3);
  const n = Math.floor((x1 - x0) * (z1 - z0) * 0.02 * amount);
  for (let i = 0; i < n; i++) {
    const x = x0 + 1 + c.r() * (x1 - x0 - 2), z = z0 + 1 + c.r() * (z1 - z0 - 2);
    const bx = Math.floor(x), bz = Math.floor(z);
    if (k.w.get(bx, y, bz) || !k.w.get(bx, y - 1, bz)) continue;
    const t = c.r();
    if (t < 0.25) k.d.add('bone', x, y, z, { mode: 'flat', scale: 0.7 + c.r() * 0.4 });
    else if (t < 0.4) k.d.add('paper', x, y, z, { mode: 'flat', scale: 0.8 });
    else if (t < 0.5) { k.d.prop('candle_cluster', x, y, z); if (c.r() < 0.5) k.w.addLight(x, y + 0.6, z, 0xffa040, 2.2, 5); }
    else if (t < 0.7 && (b.ground === B.grass || b.ground === B.cursed_grass)) k.d.add(c.r() < 0.5 ? 'grass' : 'fern', x, y, z, { scale: 0.8 });
    else if (t < 0.8) k.d.add('cursed_weed', x, y, z, { scale: 0.9 });
  }
}

export const TEMPLATES = {
  // Open plaza with a ring of pillars and lanterns.
  plaza(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    const rx = Math.floor((x1 - x0) / 2) - 3, rz = Math.floor((z1 - z0) / 2) - 3;
    for (let a = 0; a < 8; a++) {
      const px = Math.round(cx + Math.cos(a * Math.PI / 4) * rx * 0.75), pz = Math.round(cz + Math.sin(a * Math.PI / 4) * rz * 0.75);
      if (a % 2 === 0) k.pillar(px, pz, y, 5, b.pillar, b.trim); else k.lanternPost(px, pz, y);
    }
    k.floor(cx - 2, cz - 2, cx + 2, cz + 2, y, b.path, 1);
    scatterBreakables(c, 4); decorate(c);
    edgeWalls(c, 3, true);
    spawnGrid(c, 12);
  },
  // Deep pit crossed by bridges, chains hanging into the dark.
  pit_bridge(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const px0 = x0 + 4, px1 = x1 - 4, pz0 = z0 + 5, pz1 = z1 - 5;
    k.pit(px0, pz0, px1, pz1, y, 40);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    k.bridge(cx - 1, pz0 - 1, cx + 1, pz1 + 1, y, B.planks, B.dark_planks);
    if (c.r() < 0.6) k.bridge(px0 - 1, cz - 1, px1 + 1, cz + 1, y, B.planks, B.dark_planks);
    for (let i = 0; i < 6; i++) k.d.add('chain', px0 + 1 + c.r() * (px1 - px0 - 2), y + 1, pz0 + 1 + c.r() * (pz1 - pz0 - 2), { mode: 'hang', scale: 3 + c.r() * 2, sway: 0.3 });
    edgeWalls(c, 3, true);
    decorate(c, 0.5);
    spawnGrid(c, 10, 2);
    c.features.push('pit');
  },
  // Multi-level: raised ledges with stairs, a pool and a waterfall.
  ledges(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const h = 3;
    const lx1 = x0 + Math.floor((x1 - x0) * 0.45);
    k.w.fill(x0 + 1, y, z0 + 1, lx1, y + h - 1, z1 - 1, b.wall);
    for (let z = z0 + 1; z <= z1 - 1; z++) for (let x = x0 + 1; x <= lx1; x++) k.w.set(x, y + h - 1, z, b.floor);
    const sz = (z0 + z1) >> 1;
    k.stairs(lx1 + h, sz - 1, y, h, [-1, 0], 3, b.floor2);
    k.w.fill(lx1 + 1, y, sz - 1, lx1 + h, y + h, sz + 1, 0);
    k.stairs(lx1 + h, sz - 1, y, h, [-1, 0], 3, b.floor2);
    // pool below the ledge with a waterfall
    const liquid = b.flooded ? B.water : c.r() < 0.5 ? B.water : b.accent === B.lava ? B.lava : B.cursed_pool;
    const pz = z0 + 3;
    k.pond(lx1 + 2, pz, lx1 + 6, pz + 3, y, liquid, 2);
    k.w.fill(lx1, y + h - 1, pz + 1, lx1, y + h - 1, pz + 2, liquid);
    k.w.fill(lx1 + 1, y, pz + 1, lx1 + 1, y + h - 1, pz + 2, liquid);
    // second, higher ledge in the corner
    k.w.fill(x0 + 1, y + h, z1 - 5, x0 + 5, y + h * 2 - 1, z1 - 1, b.wall);
    k.stairs(x0 + 6, z1 - 3, y + h, h, [-1, 0], 2, b.floor2);
    k.lanternPost(x0 + 2, z1 - 3, y + h * 2);
    edgeWalls(c, 4, true);
    scatterBreakables(c, 3); decorate(c);
    spawnGrid(c, 12);
    c.features.push('ledges');
  },
  // Indoor pillared hall with a roof that fades when you enter.
  hall(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c, { floor: b.floor2 === B.grass ? b.floor : b.floor, alt: b.floor2 });
    const h = 6;
    k.room(x0, z0, x1, z1, y, h, b.wall, { alt: b.wall2, altP: 0.2, trim: b.trim, doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
    for (let x = x0 + 3; x <= x1 - 3; x += 4) for (const z of [z0 + 3, z1 - 3]) k.pillar(x, z, y, h - 1, b.pillar, b.trim);
    // roof slab
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + h, z, b.roof);
    k.w.addRoof([x0, y + h, z0], [x1, y + h, z1], [[x0, y, z0], [x1, y + h - 1, z1]]);
    for (let x = x0 + 4; x < x1 - 2; x += 6) { k.torch(x, y + 2, z0, [0, 1]); k.torch(x, y + 2, z1, [0, -1]); }
    // windows with light shafts
    for (let x = x0 + 5; x < x1 - 3; x += 8) { k.w.fill(x, y + 3, z0, x + 1, y + 4, z0, 0); k.s.add({ x: x + 1, y: y + 5, z: z0 + 0.5 }, { x: 0.3, y: -1, z: 0.8 }, 9, 1.6); }
    for (let i = 0; i < 3; i++) { const x = x0 + 3 + Math.floor(c.r() * (x1 - x0 - 6)); k.w.fill(x, y, z0 + 5 + Math.floor(c.r() * 4), x, y + 2, z0 + 5 + Math.floor(c.r() * 4), B.cracked_brick); }
    k.cobwebCorners(x0, z0, x1, z1, y + h - 1);
    for (const x of [x0 + 2, x1 - 2]) k.d.add('banner', x + 0.5, y + 4, z0 + 1.03, { mode: 'wall', facing: [0, 1], scale: 2 });
    scatterBreakables(c, 5); decorate(c);
    spawnGrid(c, 12);
  },
  // Glowing pool (cursed energy or lava) with stepping stones.
  pool(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    const liquid = b.accent === B.lava ? B.lava : b.flooded ? B.water : B.cursed_pool;
    const rx = Math.floor((x1 - x0) * 0.22), rz = Math.floor((z1 - z0) * 0.22);
    k.pond(cx - rx, cz - rz, cx + rx, cz + rz, y, liquid, 2, B.obsidian);
    for (let i = -rx + 1; i < rx; i += 2) k.w.set(cx + i, y - 1, cz + ((i & 2) ? 1 : -1), B.obsidian);
    for (const [dx, dz] of [[-rx - 3, -rz - 3], [rx + 3, -rz - 3], [-rx - 3, rz + 3], [rx + 3, rz + 3]]) k.pillar(cx + dx, cz + dz, y, 4, b.pillar, B.lantern);
    edgeWalls(c, 3, true);
    decorate(c);
    spawnGrid(c, 10);
  },
  // Tree grove with grass, ferns and a small pond.
  grove(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c, { floor: b.ground === B.asphalt ? B.grass : b.ground === B.subway_floor ? B.moss_floor : b.ground, alt: B.dirt, altP: 0.08 });
    const cursed = b === undefined ? false : b.ground === B.cursed_grass;
    for (let i = 0; i < 6; i++) {
      const x = x0 + 3 + Math.floor(c.r() * (x1 - x0 - 6)), z = z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6));
      if (!k.w.get(x, y, z)) k.tree(x, z, y, cursed ? { trunk: B.bark_dark, leaves: B.dead_leaves } : {});
    }
    if (c.r() < 0.6) k.pond(x0 + 4, z1 - 7, x0 + 8, z1 - 4, y, cursed ? B.cursed_pool : B.water, 1);
    k.scatter(x0, z0, x1, z1, { density: 0.3, types: cursed ? ['cursed_weed', 'tall_grass', 'fern', 'grass'] : undefined });
    k.lanternPost(x0 + 2, z0 + 2, y); k.lanternPost(x1 - 2, z1 - 2, y);
    decorate(c, 0.4);
    spawnGrid(c, 12);
  },
  // Jujutsu High: shrine building in a courtyard.
  shrine(c) {
    const { k, x0, z0, x1, z1, y, b } = c;
    base(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    k.shrine(cx - 5, cz - 5, cx + 5, cz + 2, y, { door: 's' });
    k.lanternPost(cx - 3, cz + 5, y); k.lanternPost(cx + 3, cz + 5, y);
    k.d.prop('torii', cx + 0.5, y, z1 - 2.5, { w: 5, h: 5 });
    edgeWalls(c, 3, true);
    scatterBreakables(c, 3); decorate(c);
    spawnGrid(c, 10);
  },
  // Tokyo street: asphalt, lane markings, wrecked cars, streetlights, neon.
  street(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.asphalt, 6, B.asphalt, 0);
    const cx = (x0 + x1) >> 1;
    for (let z = z0; z <= z1; z++) { if (z % 4 < 2) k.w.set(cx, y - 1, z, B.asphalt_line); }
    k.floor(x0, z0, x0 + 3, z1, y + 1, B.concrete, 1); k.floor(x1 - 3, z0, x1, z1, y + 1, B.concrete, 1);
    // building facades with lit/dark windows and neon
    for (const x of [x0, x1]) for (let z = z0; z <= z1; z++) for (let yy = y + 1; yy < y + 8; yy++) {
      const win = (z % 3 !== 0) && (yy % 3 !== 0);
      k.w.set(x, yy, z, win ? (c.r() < 0.35 ? B.window : B.window_dark) : B.concrete);
    }
    for (let z = z0 + 3; z < z1; z += 9) { k.w.set(x0 + 1, y + 4, z, B.neon_pink); k.w.set(x1 - 1, y + 5, z + 3, B.sign); k.w.set(x1 - 1, y + 1, z + 2, B.vending); }
    for (let z = z0 + 4; z < z1 - 2; z += 8) { k.d.prop('streetlight', x0 + 2.5, y + 1, z + 0.5); k.w.addLight(x0 + 3.5, y + 5.5, z + 0.5, 0xffe0b0, 5, 11); }
    for (let i = 0; i < 3; i++) { const z = z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6)); k.d.prop('car', cx + (c.r() < 0.5 ? -3 : 3), y, z, { color: [0x7a1a1a, 0x1a3a6a, 0xd8d8d8, 0x2a2a2a][i % 4], rot: Math.PI / 2 + (c.r() - 0.5) * 0.6 }); k.w.fill(cx - 4, y, z - 1, cx - 2, y, z + 1, B.barrier); }
    for (let i = 0; i < 4; i++) k.d.prop('rubble', x0 + 5 + c.r() * (x1 - x0 - 10), y, z0 + 3 + c.r() * (z1 - z0 - 6));
    for (const d of c.doors) { if (d.side === 'w' || d.side === 'e') { const x = d.side === 'w' ? x0 : x1; for (let t = -2; t <= 2; t++) for (let yy = y + 1; yy < y + 6; yy++) k.w.set(x, yy, d.at + t, 0); } }
    scatterBreakables(c, 3); decorate(c, 0.6);
    spawnGrid(c, 12, 5);
  },
  // Flooded subway platform: tiled walls, tracks sunk under water.
  platform(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.subway_floor, 6, B.metal_grate, 0.08);
    const tz0 = z0 + Math.floor((z1 - z0) * 0.35), tz1 = tz0 + 4;
    for (let z = tz0; z <= tz1; z++) for (let x = x0 + 1; x < x1; x++) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.water); k.w.set(x, y - 3, z, B.rail); }
    for (let x = x0 + 4; x < x1 - 2; x += 6) k.bridge(x, tz0 - 1, x + 1, tz1 + 1, y, B.metal_grate, B.metal_grate);
    k.room(x0, z0, x1, z1, y, 6, B.subway_tile, { alt: B.concrete, altP: 0.1, trim: B.sign, doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
    for (let x = x0 + 3; x < x1 - 2; x += 5) for (const z of [tz0 - 2, tz1 + 2]) k.pillar(x, z, y, 5, B.concrete_pillar, B.concrete);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + 6, z, B.concrete);
    k.w.addRoof([x0, y + 6, z0], [x1, y + 6, z1], [[x0, y, z0], [x1, y + 5, z1]]);
    for (let x = x0 + 3; x < x1; x += 7) { k.w.set(x, y + 5, z0 + 1, B.lantern); k.w.set(x + 3, y + 5, z1 - 1, B.lantern); }
    scatterBreakables(c, 4); decorate(c, 0.8);
    spawnGrid(c, 12, 2);
    c.features.push('flooded');
  },
  // Shibuya concourse: polished floor, glowing signs, ticket gates.
  concourse(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.polished, 6, B.subway_floor, 0.15);
    k.room(x0, z0, x1, z1, y, 6, B.concrete, { alt: B.window, altP: 0.15, trim: B.sign, doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
    const cz = (z0 + z1) >> 1;
    for (let x = x0 + 3; x < x1 - 2; x += 3) if ((x - x0) % 9 !== 0) { k.w.set(x, y, cz, B.metal_grate); }
    for (let x = x0 + 4; x < x1 - 2; x += 6) for (const z of [z0 + 4, z1 - 4]) k.pillar(x, z, y, 5, B.concrete_pillar, B.concrete);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + 6, z, B.concrete);
    k.w.addRoof([x0, y + 6, z0], [x1, y + 6, z1], [[x0, y, z0], [x1, y + 5, z1]]);
    for (let x = x0 + 2; x < x1; x += 5) k.w.set(x, y + 4, z0 + 1, B.sign);
    if (c.r() < 0.6) k.pond(x0 + 3, z1 - 7, x0 + 7, z1 - 4, y, B.lava, 1, B.obsidian);
    scatterBreakables(c, 3); decorate(c, 0.6);
    spawnGrid(c, 12, 2);
  },
  // Classroom block (Jujutsu High): wooden floor, desks, windows.
  classroom(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.floor_boards, 6);
    k.room(x0, z0, x1, z1, y, 5, B.plaster, { alt: B.window, altP: 0.2, trim: B.dark_planks, doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
    for (let x = x0 + 3; x < x1 - 2; x += 3) for (let z = z0 + 3; z < z1 - 2; z += 3) if (c.r() < 0.55) k.w.set(x, y, z, B.planks);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + 5, z, B.roof);
    k.w.addRoof([x0, y + 5, z0], [x1, y + 5, z1], [[x0, y, z0], [x1, y + 4, z1]]);
    k.w.fill(x0 + 3, y + 1, z0, x1 - 3, y + 2, z0, B.dark_planks);
    for (let x = x0 + 3; x < x1; x += 6) k.w.set(x, y + 4, z1 - 1, B.lantern);
    for (let x = x0 + 5; x < x1 - 3; x += 7) { k.w.fill(x, y + 2, z1, x + 1, y + 3, z1, 0); k.s.add({ x: x + 1, y: y + 4, z: z1 - 0.5 }, { x: -0.2, y: -1, z: -0.7 }, 8, 1.5, 0xffe8c0); }
    decorate(c, 0.5);
    spawnGrid(c, 10, 2);
  },
};

// Biome → preferred templates (weights)
export const BIOME_ROOMS = {
  jujutsu_high: ['plaza', 'shrine', 'classroom', 'hall', 'ledges', 'grove', 'pit_bridge', 'pool'],
  tokyo_night: ['street', 'street', 'plaza', 'pit_bridge', 'ledges', 'hall', 'pool'],
  cursed_forest: ['grove', 'grove', 'pool', 'ledges', 'pit_bridge', 'plaza'],
  flooded_subway: ['platform', 'platform', 'hall', 'pit_bridge', 'pool', 'ledges'],
  shibuya: ['concourse', 'concourse', 'street', 'hall', 'pit_bridge', 'pool'],
};

// =====================================================================
// Half-Blood Quests: Greek building helpers, the museum (ch1), Half-Blood
// Hill in the storm (ch2) and the camp woods (ch3). Also used by camp.js.
// =====================================================================

// Pine tree: a straight trunk and a tiered cone of needles.
export function pine(k, x, z, y, { h = 8 + Math.floor(k.r() * 5), wide = false, trunk = B.pine_log, leaves = B.pine_leaves, R } = {}) {
  const W = k.w; const tw = wide ? 2 : 1;
  for (let i = 0; i < h; i++) for (let a = 0; a < tw; a++) for (let b = 0; b < tw; b++) W.set(x + a, y + i, z + b, trunk);
  const base = y + Math.max(2, Math.floor(h * 0.3)), top = y + h + 1;
  const maxR = R ?? (wide ? 4.6 : 2.8);
  const cx = x + (tw - 1) / 2, cz = z + (tw - 1) / 2;
  for (let yy = base; yy <= top; yy++) {
    const t = (yy - base) / Math.max(1, top - base);
    let rad = (1 - t) * maxR + 0.4;
    if ((top - yy) % 3 === 1) rad *= 0.72; // tiers
    const ir = Math.ceil(rad);
    for (let dz = -ir - 1; dz <= ir + 1; dz++) for (let dx = -ir - 1; dx <= ir + 1; dx++) {
      const bx = Math.round(cx + dx), bz = Math.round(cz + dz);
      const d = Math.hypot(bx - cx, bz - cz);
      if (d > rad + 0.25 || (d > rad - 0.6 && k.chance(0.3))) continue;
      if (!W.get(bx, yy, bz)) W.set(bx, yy, bz, leaves);
    }
  }
  W.set(Math.round(cx), top + 1, Math.round(cz), leaves);
}
// Round-crowned broadleaf tree (oak / maple), bigger than Kit.tree.
export function oak(k, x, z, y, { h = 4 + Math.floor(k.r() * 3), R = 2.6 + k.r(), leaves = B.leaves, trunk = B.log } = {}) {
  const W = k.w;
  for (let i = 0; i < h; i++) W.set(x, y + i, z, trunk);
  const cy = y + h + 0.5;
  for (let yy = Math.floor(cy - R); yy <= Math.ceil(cy + R * 0.8); yy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const d = Math.hypot(dx, (yy - cy) * 1.25, dz);
    if (d > R || (d > R - 0.8 && k.chance(0.35))) continue;
    if (!W.get(x + dx, yy, z + dz)) W.set(x + dx, yy, z + dz, leaves);
  }
}
// Greek column: marble base, fluted shaft, capital.
export function column(k, x, z, y, h, { shaft = B.column, cap = B.marble_white, base = B.marble_white } = {}) {
  k.w.set(x, y, z, base);
  for (let i = 1; i < h - 1; i++) k.w.set(x, y + i, z, shaft);
  k.w.set(x, y + h - 1, z, cap);
}
// Gabled roof over a rectangle. axis 'x' = ridge along x (slopes toward z0/z1).
// Returns the ridge height. `end` fills the triangular gable ends.
export function gable(k, x0, z0, x1, z1, y, id, { axis = 'x', end = null, eave = 1, run = 1, ridgeId = null } = {}) {
  const W = k.w; let i = 0;
  const a0 = axis === 'x' ? z0 - eave : x0 - eave, a1 = axis === 'x' ? z1 + eave : x1 + eave;
  const b0 = axis === 'x' ? x0 - eave : z0 - eave, b1 = axis === 'x' ? x1 + eave : z1 + eave;
  const put = (a, b, yy, v) => { if (axis === 'x') W.set(b, yy, a, v); else W.set(a, yy, b, v); };
  for (; a0 + i * run <= a1 - i * run; i++) {
    const lo = a0 + i * run, hi = a1 - i * run, last = hi - lo + 1 <= 2 * run;
    for (let r = 0; r < run; r++) for (const a of [lo + r, hi - r]) {
      if (a > hi || a < lo) continue;
      for (let b = b0; b <= b1; b++) put(a, b, y + i, ridgeId && last ? ridgeId : id);
    }
    if (end) for (let a = lo + run; a <= hi - run; a++) for (const b of [b0 + eave, b1 - eave]) {
      if (a < (axis === 'x' ? z0 : x0) || a > (axis === 'x' ? z1 : x1)) continue;
      put(a, b, y + i, end);
    }
  }
  return y + i - 1;
}
// Scatter sprites on any of the listed ground blocks.
export function scatterOn(k, x0, z0, x1, z1, grounds, types, density = 0.3, scale = 0.8) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (!k.chance(density)) continue;
    const y = k.w.groundBelow(x + 0.5, z + 0.5, k.w.sy - 1);
    if (!isFinite(y) || !grounds.includes(k.w.get(x, y - 1, z)) || k.w.get(x, y, z)) continue;
    const t = types[Math.floor(k.r() * types.length)];
    k.d.add(t, x + 0.5 + k.rnd(-0.3, 0.3), y, z + 0.5 + k.rnd(-0.3, 0.3), { scale: t === 'tall_grass' ? 1.1 : scale, sway: 1 });
  }
}
// Soft patches of another top block (grass in the forest, mud in a field).
export function patches(k, x0, z0, x1, z1, y, id, cover = 0.3, on = null) {
  const o = k.r() * 100, t = 1 - cover * 2;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const n = Math.sin(x * 0.31 + o + Math.sin(z * 0.23 + o) * 2) * Math.cos(z * 0.27 - x * 0.11 + o * 0.5);
    if (n > t && (!on || on.includes(k.w.get(x, y - 1, z)))) k.w.set(x, y - 1, z, id);
  }
}
// Boulder: a lumpy blob of rock blocks.
export function boulder(k, x, z, y, R = 1.6, id = B.rock) {
  for (let yy = -1; yy <= Math.ceil(R); yy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const d = Math.hypot(dx * 0.9, yy * 1.2, dz);
    if (d <= R + (k.r() - 0.5) * 0.6) k.w.set(x + dx, y + yy, z + dz, id);
  }
}

// ------------------------------------------------ shared room bits
const doorAisle = (c, x, z, r = 2) => c.doors.some((d) =>
  (d.side === 'n' || d.side === 's') ? Math.abs(x - d.at) <= r && (d.side === 'n' ? z - c.z0 : c.z1 - z) <= 4
    : Math.abs(z - d.at) <= r && (d.side === 'w' ? x - c.x0 : c.x1 - x) <= 4);
const free = (c, x, z) => !(c.reserved && c.reserved.has(x + ',' + z)) && !c.k.w.get(x, c.y, z) && c.k.w.get(x, c.y - 1, z);
// a solid invisible collider under a prop (1 or 2 blocks high)
const collider = (c, x, z, h = 2) => { for (let i = 0; i < h; i++) c.k.w.set(x, c.y + i, z, B.barrier); };
function dropReservedSpawns(c) { if (c.reserved) c.spawns = c.spawns.filter(([x, , z]) => !c.reserved.has(Math.floor(x) + ',' + Math.floor(z))); }

// Map a wall-local (u along the wall, v depth into the room) to world x,z.
function wallFrame(c, side) {
  const { x0, z0, x1, z1 } = c;
  if (side === 'n') return { len: [x0, x1], P: (u, v) => [u, z0 + v], facing: [0, 1] };
  if (side === 's') return { len: [x0, x1], P: (u, v) => [u, z1 - v], facing: [0, -1] };
  if (side === 'w') return { len: [z0, z1], P: (u, v) => [x0 + v, u], facing: [1, 0] };
  return { len: [z0, z1], P: (u, v) => [x1 - v, u], facing: [-1, 0] };
}

// Secret alcove sealed by a Mist wall (looks like the room's wall). The Mist
// system dissolves B.mist_wall when a hero sees through the Mist.
// Records c.slots {type:'mist_alcove', pos, facing} and reserves the cells.
export function mistAlcove(c, { force = false, wall = B.gallery_wall, cap = B.key_frieze } = {}) {
  const { k, y } = c;
  k.mistCount = k.mistCount ?? 0;
  if (!force && (k.mistCount >= 3 || c.r() > (k.mistCount === 0 ? 0.8 : 0.4))) return null;
  // prefer the far walls (north, west): the default camera sees them face-on
  const sides = ['n', 'w', 's', 'e'].filter((s) => !c.doors.some((d) => d.side === s));
  if (!sides.length) return null;
  const far = sides.filter((s) => s === 'n' || s === 'w');
  const side = far.length && c.r() < 0.85 ? far[Math.floor(c.r() * far.length)] : sides[Math.floor(c.r() * sides.length)];
  const F = wallFrame(c, side);
  const span = F.len[1] - F.len[0];
  if (span < 10) return null;
  const a = F.len[0] + 2 + Math.floor(c.r() * (span - 8));
  c.reserved = c.reserved ?? new Set();
  const set = (u, v, yy, id) => { const [x, z] = F.P(u, v); k.w.set(x, yy, z, id); };
  const blocks = [];
  for (let u = a; u <= a + 4; u++) for (let v = 1; v <= 3; v++) {
    const [x, z] = F.P(u, v);
    c.reserved.add(x + ',' + z);
    for (let yy = y; yy < y + 4; yy++) {
      const edge = u === a || u === a + 4;
      if (edge) set(u, v, yy, wall);
      else if (v === 3) { set(u, v, yy, B.mist_wall); blocks.push([x, yy, z]); }
      else set(u, v, yy, 0);
    }
    set(u, v, y + 4, v === 3 ? cap : wall);
  }
  for (let u = a - 1; u <= a + 5; u++) { const [x, z] = F.P(u, 4); c.reserved.add(x + ',' + z); }
  // treasure inside: a fine amphora and a glint of drachmas
  const [tx, tz] = F.P(a + 2, 1);
  k.d.prop('vase', tx + 0.5, y, tz + 0.5, { scale: 1.1, rot: c.r() * 3 });
  const [gx, gz] = F.P(a + 1, 2); k.w.addLight(gx + 0.5, y + 1, gz + 0.5, 0xffd84a, 1.5, 3);
  const [px, pz] = F.P(a + 2, 2);
  const slot = { type: 'mist_alcove', pos: [px + 0.5, y, pz + 0.5], facing: F.facing, side, blocks };
  c.slots.push(slot); c.features.push('mist_alcove');
  k.mistCount++;
  return slot;
}

// Museum walls: plinth baseboard, plaster, a Greek-key frieze band, a roof slab
// that fades when you walk in, and warm ceiling lights.
function museumShell(c, h = 7, { roof = true, frieze = B.key_frieze } = {}) {
  const { k, x0, z0, x1, z1, y } = c;
  k.room(x0, z0, x1, z1, y, h, B.gallery_wall, { doors: c.doors.map((d) => ({ ...d, width: 5, height: 4 })) });
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) { if (k.w.get(x, y, z)) k.w.set(x, y, z, B.plinth); k.w.set(x, y + 4, z, frieze); k.w.set(x, y + h - 1, z, B.marble_white); }
  for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) { if (k.w.get(x, y, z)) k.w.set(x, y, z, B.plinth); k.w.set(x, y + 4, z, frieze); k.w.set(x, y + h - 1, z, B.marble_white); }
  if (roof) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + h, z, B.marble_white);
    k.w.addRoof([x0, y + h, z0], [x1, y + h, z1], [[x0, y, z0], [x1, y + h - 1, z1]]);
  }
  // warm gallery lights (chandeliers) on a grid
  for (let x = x0 + 4; x < x1 - 1; x += 7) for (let z = z0 + 4; z < z1 - 1; z += 7) {
    k.d.prop('chandelier', x + 0.5, y + h, z + 0.5); k.w.addLight(x + 0.5, y + h - 1.6, z + 0.5, 0xffd9a0, 4, 11);
  }
  // high windows with sunbeams on the north wall
  if (roof) for (let x = x0 + 5; x < x1 - 3; x += 8) { k.w.fill(x, y + 5, z0, x + 1, y + 5, z0, B.glass); k.s.add({ x: x + 1, y: y + 6, z: z0 + 0.5 }, { x: 0.3, y: -1, z: 0.8 }, 9, 1.6, 0xffe6b8); }
}
// museum decoration: banners, stray worksheets (it's a field trip), shards
function museumDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1, y } = c;
  const n = Math.floor((x1 - x0) * (z1 - z0) * 0.012 * amount);
  for (let i = 0; i < n; i++) {
    const x = x0 + 1 + c.r() * (x1 - x0 - 2), z = z0 + 1 + c.r() * (z1 - z0 - 2);
    if (!free(c, Math.floor(x), Math.floor(z))) continue;
    const t = c.r();
    if (t < 0.5) k.d.add('paper', x, y, z, { mode: 'flat', scale: 0.7 + c.r() * 0.3 });
    else if (t < 0.8) k.d.add('shard', x, y, z, { mode: 'flat', scale: 0.8 });
  }
  for (const [x, z, f] of [[x0 + 2, z0, [0, 1]], [x1 - 2, z0, [0, 1]]]) if (!c.doors.some((d) => d.side === 'n' && Math.abs(d.at - x) < 4)) k.d.add('banner', x + 0.5, y + 6, z + 1.03, { mode: 'wall', facing: f, scale: 2, sway: 0.15 });
}
// display case with a vase (collides)
function displayCase(c, x, z) { if (!free(c, x, z) || doorAisle(c, x, z)) return false; c.k.d.prop('display_case', x + 0.5, c.y, z + 0.5, { rot: c.r() < 0.5 ? 0 : Math.PI / 2 }); collider(c, x, z, 2); return true; }
function statue(c, x, z, o = {}) { if (!free(c, x, z) || doorAisle(c, x, z)) return false; c.k.d.prop('statue', x + 0.5, c.y, z + 0.5, { pose: Math.floor(c.r() * 3), rot: o.rot ?? 0, ...o }); collider(c, x, z, 3); return true; }

// ------------------------------------------------ biome start rooms and boss arenas
export const DRESS = {
  museum: {
    // The museum lobby: carpet, columns, benches, and the first Mist wall.
    start(c) {
      const { k, x0, z0, x1, z1, y } = c;
      k.floor(x0, z0, x1, z1, y, B.marble_floor, 6);
      const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
      museumShell(c, 7);
      for (let z = z0 + 1; z < z1; z++) for (let x = cx - 1; x <= cx + 1; x++) k.w.set(x, y - 1, z, B.carpet_red);
      for (let z = z0 + 3; z <= z1 - 3; z += 4) for (const x of [cx - 4, cx + 4]) if (!doorAisle(c, x, z)) column(k, x, z, y, 7);
      mistAlcove(c, { force: true });
      for (const [x, z] of [[cx - 6, cz], [cx + 6, cz]]) if (free(c, x, z)) { k.d.prop('bench_marble', x + 0.5, y, z + 0.5, { rot: Math.PI / 2 }); collider(c, x, z, 1); }
      k.d.prop('bust', cx - 2.5, y, z0 + 2.5); collider(c, cx - 3, z0 + 2, 2);
      k.d.prop('bust', cx + 3.5, y, z0 + 2.5); collider(c, cx + 3, z0 + 2, 2);
      k.w.set(cx, y - 1, cz + 2, B.gold_plate);
      museumDecorate(c, 0.6);
    },
    // The empty Greek gallery where Mrs. Dodds waits.
    boss(c) {
      const { k, x0, z0, x1, z1, y } = c;
      k.floor(x0, z0, x1, z1, y, B.marble_floor, 8);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = (x1 - x0) / 2;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (d > R + 0.6) for (let yy = y - 8; yy < y + 6; yy++) k.w.set(x, yy, z, 0);
        else if (d > R - 0.6) { k.w.set(x, y, z, B.plinth); k.w.set(x, y - 1, z, B.marble_white); }
        else if (d < 3) k.w.set(x, y - 1, z, (Math.floor(x) + Math.floor(z)) % 2 ? B.marble_white : B.teal_panel);
      }
      for (let a = 0; a < 10; a++) {
        const px = Math.round(cx + Math.cos(a * Math.PI / 5 + 0.3) * R * 0.66), pz = Math.round(cz + Math.sin(a * Math.PI / 5 + 0.3) * R * 0.66);
        column(k, px, pz, y, 7);
        k.w.set(px, y + 4, pz, B.key_frieze);
      }
      for (let a = 0; a < 6; a++) {
        const px = cx + Math.cos(a * Math.PI / 3) * R * 0.84, pz = cz + Math.sin(a * Math.PI / 3) * R * 0.84;
        if (a % 2) { k.d.prop('statue', px, y, pz, { pose: a % 3, rot: -a * Math.PI / 3 - Math.PI / 2 }); collider(c, Math.floor(px), Math.floor(pz), 3); }
        else { k.d.prop('brazier', px, y, pz); k.w.addLight(px, y + 1.8, pz, 0xffa850, 5, 11); collider(c, Math.floor(px), Math.floor(pz), 1); }
      }
      for (let i = 0; i < 10; i++) k.d.add('shard', cx + (c.r() - 0.5) * R * 1.4, y, cz + (c.r() - 0.5) * R * 1.4, { mode: 'flat', scale: 0.9 });
      c.spawns.push([cx, y, cz - R * 0.4]);
    },
  },
  storm_hill: {
    // Where the car went off the road: the start of the run up the hill.
    start(c) {
      const { k, x0, z0, x1, z1, y } = c;
      k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.12);
      const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
      for (let z = z0; z <= z1; z++) for (let x = cx - 2; x <= cx + 2; x++) k.w.set(x, y - 1, z, Math.abs(x - cx) === 2 ? B.mud : B.dirt_road);
      k.d.prop('car_flipped', cx - 5.5, y, cz - 2, { rot: 0.5, color: 0x2a3a5a });
      k.w.fill(cx - 7, y, cz - 3, cx - 4, y + 1, cz - 1, B.barrier);
      k.d.prop('fence', x1 - 1.5, y, cz, { len: z1 - z0 - 4, rot: Math.PI / 2 });
      k.d.prop('signpost', cx + 3.5, y, z0 + 3.5, { rot: 0.4 });
      oak(k, x0 + 3, z1 - 3, y); oak(k, x1 - 4, z0 + 3, y);
      scatterOn(k, x0, z0, x1, z1, [B.grass], ['tall_grass', 'grass', 'grass'], 0.3);
      scatterOn(k, x0, z0, x1, z1, [B.mud, B.dirt_road], ['puddle'], 0.15);
      k.w.set(cx, y - 1, cz + 2, B.gold_plate);
    },
    // The hilltop: Thalia's pine tree at the camp border.
    boss(c) {
      const { k, x0, z0, x1, z1, y } = c;
      k.floor(x0, z0, x1, z1, y, B.grass, 8); patches(k, x0, z0, x1, z1, y, B.mud, 0.1);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = (x1 - x0) / 2;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) > R + 0.6 + Math.sin(x * 0.7 + z) * 0.8) for (let yy = y - 8; yy < y + 6; yy++) k.w.set(x, yy, z, 0);
      const tx = Math.round(cx) - 1, tz = Math.round(z0 + 3);
      pine(k, tx, tz, y, { h: 15, wide: true, R: 5.2 });
      for (let a = 0; a < 5; a++) boulder(k, Math.round(cx + Math.cos(a * 1.3 + 2) * R * 0.72), Math.round(cz + Math.sin(a * 1.3 + 2) * R * 0.72), y, 1.2 + c.r() * 0.8);
      scatterOn(k, x0, z0, x1, z1, [B.grass], ['tall_grass', 'grass', 'flower_yellow'], 0.25);
      scatterOn(k, x0, z0, x1, z1, [B.mud], ['puddle'], 0.3);
      c.slots.push({ type: 'pine_tree', pos: [tx + 1, y, tz + 1] });
      c.spawns.push([cx, y, cz + R * 0.3]);
    },
  },
  camp_woods: {
    start(c) {
      const { k, x0, z0, x1, z1, y } = c;
      k.floor(x0, z0, x1, z1, y, B.forest_floor, 6); patches(k, x0, z0, x1, z1, y, B.grass, 0.3);
      const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
      k.d.prop('flagpole', cx + 0.5, y, cz - 3.5, { h: 5, color: 0x2a6ad8 });
      k.d.prop('campfire', cx + 0.5, y, cz + 0.5); k.w.addLight(cx + 0.5, y + 1.2, cz + 0.5, 0xff9a40, 6, 12);
      for (const [x, z] of [[x0 + 2, z0 + 2], [x1 - 3, z0 + 3], [x0 + 3, z1 - 3], [x1 - 2, z1 - 2]]) pine(k, x, z, y);
      boulder(k, x1 - 4, cz, y, 1.5);
      scatterOn(k, x0, z0, x1, z1, [B.forest_floor, B.grass], ['fern', 'grass', 'leaf_litter', 'mushroom'], 0.25);
      k.w.set(cx, y - 1, cz + 3, B.gold_plate);
    },
    // A clearing where the hellhound comes out of the dark.
    boss(c) {
      const { k, x0, z0, x1, z1, y } = c;
      k.floor(x0, z0, x1, z1, y, B.forest_floor, 8); patches(k, x0, z0, x1, z1, y, B.grass, 0.3);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = (x1 - x0) / 2;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) > R + 0.6) for (let yy = y - 8; yy < y + 6; yy++) k.w.set(x, yy, z, 0);
      // the creek across the far side
      for (let x = x0; x <= x1; x++) { const zz = Math.round(z0 + 4 + Math.sin(x * 0.4) * 1.2); for (let dz = 0; dz < 3; dz++) if (k.w.get(x, y - 1, zz + dz)) { k.w.set(x, y - 1, zz + dz, B.water); k.w.set(x, y - 2, zz + dz, B.sand); } }
      for (let a = 0; a < 7; a++) { const px = Math.round(cx + Math.cos(a * 0.9 + 0.5) * R * 0.8), pz = Math.round(cz + Math.sin(a * 0.9 + 0.5) * R * 0.8); if (k.w.get(px, y - 1, pz) !== B.water) pine(k, px, pz, y, { h: 9 + (a % 3) }); }
      boulder(k, Math.round(cx) - 4, Math.round(cz) + 2, y, 1.4); boulder(k, Math.round(cx) + 4, Math.round(cz) - 1, y, 1.2);
      scatterOn(k, x0, z0, x1, z1, [B.forest_floor, B.grass], ['fern', 'leaf_litter', 'mushroom', 'grass'], 0.25);
      c.spawns.push([cx, y, cz - R * 0.4]);
    },
  },
};

// ------------------------------------------------ museum templates
Object.assign(TEMPLATES, {
  // Long Greek gallery: columns along the walls, display cases, statues.
  gallery(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.marble_floor, 6);
    museumShell(c, 7);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    const alongX = (x1 - x0) >= (z1 - z0);
    // carpet runner between the doors
    for (let t = (alongX ? x0 + 1 : z0 + 1); t < (alongX ? x1 : z1); t++) for (let s = -1; s <= 1; s++) k.w.set(alongX ? t : cx + s, y - 1, alongX ? cz + s : t, B.carpet_red);
    mistAlcove(c);
    // columns along the long walls
    for (let t = (alongX ? x0 : z0) + 3; t <= (alongX ? x1 : z1) - 3; t += 4) for (const s of alongX ? [z0 + 2, z1 - 2] : [x0 + 2, x1 - 2]) {
      const x = alongX ? t : s, z = alongX ? s : t;
      if (free(c, x, z) && !doorAisle(c, x, z)) column(k, x, z, y, 7);
    }
    // display cases down the middle, statues between the columns
    for (let t = (alongX ? x0 : z0) + 4; t <= (alongX ? x1 : z1) - 4; t += 4) for (const s of [-3, 3]) {
      const x = alongX ? t : cx + s, z = alongX ? cz + s : t;
      if (c.r() < 0.75) displayCase(c, x, z);
    }
    for (let t = (alongX ? x0 : z0) + 5; t <= (alongX ? x1 : z1) - 5; t += 8) for (const s of alongX ? [z0 + 2, z1 - 2] : [x0 + 2, x1 - 2]) {
      const x = alongX ? t : s, z = alongX ? s : t;
      if (c.r() < 0.7) statue(c, x, z, { rot: alongX ? (z < cz ? 0 : Math.PI) : (x < cx ? Math.PI / 2 : -Math.PI / 2) });
    }
    museumDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // Grand hall: a raised marble dais with a great bronze statue, colonnade, steps.
  grand_hall(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.marble_floor, 6);
    museumShell(c, 8);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    mistAlcove(c);
    // dais 7x7, two high, with steps on all four sides
    const r = 3;
    k.w.fill(cx - r, y, cz - r, cx + r, y, cz + r, B.marble_white);
    k.w.fill(cx - r + 1, y + 1, cz - r + 1, cx + r - 1, y + 1, cz + r - 1, B.marble_white);
    for (let t = -r; t <= r; t++) for (const [x, z] of [[cx + t, cz - r], [cx + t, cz + r], [cx - r, cz + t], [cx + r, cz + t]]) k.w.set(x, y, z, B.key_frieze);
    for (let t = -1; t <= 1; t++) for (const [x, z] of [[cx + t, cz - r - 1], [cx + t, cz + r + 1], [cx - r - 1, cz + t], [cx + r + 1, cz + t]]) if (!k.w.get(x, y, z)) k.w.set(x, y, z, B.marble_white);
    for (let t = -1; t <= 1; t++) for (const [x, z] of [[cx + t, cz - r], [cx + t, cz + r], [cx - r, cz + t], [cx + r, cz + t]]) k.w.set(x, y, z, B.marble_white);
    k.d.prop('statue', cx + 0.5, y + 2, cz + 0.5, { bronze: true, scale: 1.6, pose: 0, rot: Math.PI / 4 }); collider({ ...c, y: y + 2 }, cx, cz, 4);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { k.d.prop('brazier', cx + dx + 0.5, y + 2, cz + dz + 0.5); k.w.addLight(cx + dx + 0.5, y + 3.8, cz + dz + 0.5, 0xffa850, 3.5, 9); }
    // colonnade ring
    for (let x = x0 + 3; x <= x1 - 3; x += 3) for (const z of [z0 + 3, z1 - 3]) if (free(c, x, z) && !doorAisle(c, x, z)) column(k, x, z, y, 8);
    for (let z = z0 + 6; z <= z1 - 6; z += 3) for (const x of [x0 + 3, x1 - 3]) if (free(c, x, z) && !doorAisle(c, x, z)) column(k, x, z, y, 8);
    for (const [x, z] of [[x0 + 2, cz], [x1 - 2, cz]]) if (c.r() < 0.6) statue(c, x, z, { rot: x < cx ? Math.PI / 2 : -Math.PI / 2 });
    museumDecorate(c, 0.8);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
    c.features.push('dais');
  },
  // Sculpture court: open to the sky, a fountain pool, statues and benches.
  sculpture_court(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.marble_floor, 6, B.marble_white, 0.1);
    museumShell(c, 6, { roof: false, frieze: B.vase_frieze });
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    mistAlcove(c);
    k.pond(cx - 2, cz - 2, cx + 2, cz + 2, y, B.water, 1, B.marble_white);
    for (const [x, z] of [[cx - 3, cz - 3], [cx + 3, cz - 3], [cx - 3, cz + 3], [cx + 3, cz + 3]]) k.w.set(x, y, z, B.marble_white);
    k.w.set(cx, y - 1, cz, B.plinth); k.d.prop('statue', cx + 0.5, y - 0.2, cz + 0.5, { pose: 1, rot: Math.PI / 4 }); collider(c, cx, cz, 3);
    for (let a = 0; a < 6; a++) { const x = Math.round(cx + Math.cos(a * 1.047) * 6.5), z = Math.round(cz + Math.sin(a * 1.047) * 5.5); if (a % 2) statue(c, x, z, { rot: -a * 1.047 - Math.PI / 2 }); else if (free(c, x, z) && !doorAisle(c, x, z)) { k.d.prop('bench_marble', x + 0.5, y, z + 0.5, { rot: -a * 1.047 + Math.PI / 2 }); collider(c, x, z, 1); } }
    for (const [x, z] of [[x0 + 2, z0 + 2], [x1 - 2, z0 + 2], [x0 + 2, z1 - 2], [x1 - 2, z1 - 2]]) if (free(c, x, z) && !doorAisle(c, x, z)) { oak(k, x, z, y, { h: 3, R: 1.8 }); }
    k.s.add({ x: cx + 0.5, y: y + 12, z: cz - 2 }, { x: 0.2, y: -1, z: 0.4 }, 13, 4, 0xfff0c8);
    museumDecorate(c, 0.6);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // Antiquities storeroom: rows of cases and busts, shipping crates, vase frieze.
  storeroom(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.marble_floor, 6, B.floor_boards, 0.12);
    museumShell(c, 6, { frieze: B.vase_frieze });
    mistAlcove(c);
    for (let x = x0 + 3; x <= x1 - 3; x += 3) for (let z = z0 + 3; z <= z1 - 3; z += 4) {
      const t = c.r();
      if (t < 0.4) displayCase(c, x, z);
      else if (t < 0.55 && free(c, x, z) && !doorAisle(c, x, z)) { k.d.prop('bust', x + 0.5, y, z + 0.5, { rot: c.r() * 6 }); collider(c, x, z, 2); }
      else if (t < 0.7 && free(c, x, z) && !doorAisle(c, x, z)) { k.d.prop('vase', x + 0.5, y, z + 0.5, { scale: 1.3, red: c.r() < 0.4, rot: c.r() * 6 }); collider(c, x, z, 1); }
    }
    scatterBreakables(c, 5);
    museumDecorate(c, 0.8);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});

// ------------------------------------------------ storm hill templates
function stormDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.grass], ['tall_grass', 'tall_grass', 'grass', 'flower_yellow'], 0.3 * amount);
  scatterOn(k, x0, z0, x1, z1, [B.mud, B.dirt_road], ['puddle'], 0.2 * amount);
}
// low New England fieldstone wall around a room, open at the doors
function stoneWall(c) {
  const { k, x0, z0, x1, z1, y } = c;
  k.room(x0, z0, x1, z1, y, 1, B.rock, { alt: B.cobble, altP: 0.3, doors: c.doors.map((d) => ({ ...d, width: 5, height: 1 })) });
  for (let i = 0; i < 4; i++) { const x = x0 + Math.floor(c.r() * (x1 - x0)), z = c.r() < 0.5 ? z0 : z1; if (k.w.get(x, y, z)) k.w.set(x, y + 1, z, B.rock); }
}
Object.assign(TEMPLATES, {
  // A storm-soaked field: crop rows, hay bales, fences, a lone oak.
  farm_field(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.1);
    stoneWall(c);
    const fx0 = x0 + 3, fx1 = x1 - 3, fz0 = z0 + 3, fz1 = Math.floor((z0 + z1) / 2);
    for (let z = fz0; z <= fz1; z++) for (let x = fx0; x <= fx1; x++) if (!doorAisle(c, x, z)) k.w.set(x, y - 1, z, z % 2 ? B.farm_soil : B.mud);
    for (let z = fz0; z <= fz1; z += 2) for (let x = fx0; x <= fx1; x++) if (c.r() < 0.6 && !doorAisle(c, x, z)) k.d.add('tall_grass', x + 0.5, y, z + 0.5, { scale: 1.2, tint: 1 });
    for (let i = 0; i < 5; i++) { const x = x0 + 3 + Math.floor(c.r() * (x1 - x0 - 6)), z = fz1 + 2 + Math.floor(c.r() * (z1 - fz1 - 4)); if (free(c, x, z) && !doorAisle(c, x, z)) { k.w.set(x, y, z, B.hay); if (c.r() < 0.5 && free(c, x + 1, z)) k.w.set(x + 1, y, z, B.hay); if (c.r() < 0.3) k.w.set(x, y + 1, z, B.hay); } }
    const ox = x1 - 4, oz = z1 - 4; if (free(c, ox, oz) && !doorAisle(c, ox, oz)) oak(k, ox, oz, y);
    k.d.prop('fence', (x0 + x1) / 2 + 0.5, y, fz1 + 1.5, { len: Math.floor((x1 - x0) / 2) * 2 - 6 });
    stormDecorate(c);
    spawnGrid(c, 12, 2);
  },
  // The farm road: muddy ruts, ditches, telephone poles and wrecked cars.
  farm_road(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.12);
    const alongX = c.doors.some((d) => d.side === 'e' || d.side === 'w');
    const mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
    for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) for (let s = -2; s <= 2; s++) {
      const x = alongX ? t : mid + s, z = alongX ? mid + s : t;
      k.w.set(x, y - 1, z, Math.abs(s) === 2 ? B.mud : B.dirt_road);
    }
    // ditch along one side
    for (let t = (alongX ? x0 : z0) + 1; t < (alongX ? x1 : z1); t++) { const x = alongX ? t : mid + 4, z = alongX ? mid + 4 : t; if (!doorAisle(c, x, z, 3)) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.mud); } }
    k.d.prop('car_flipped', (alongX ? (x0 + x1) / 2 : mid - 4) + 0.5, y, (alongX ? mid - 4 : (z0 + z1) / 2) + 0.5, { rot: alongX ? 0.3 : Math.PI / 2 + 0.3, color: [0x7a1a1a, 0x2a4a7a, 0xd8d8d8][Math.floor(c.r() * 3)] });
    { const cxm = alongX ? Math.floor((x0 + x1) / 2) : mid - 4, czm = alongX ? mid - 4 : Math.floor((z0 + z1) / 2); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (alongX ? true : true) k.w.set(cxm + (alongX ? dx : dz), y, czm + (alongX ? dz : dx), B.barrier); }
    for (let t = (alongX ? x0 : z0) + 3; t < (alongX ? x1 : z1) - 2; t += 8) { const x = alongX ? t : mid - 6, z = alongX ? mid - 6 : t; if (free(c, x, z)) { k.pillar(x, z, y, 6, B.pine_log); k.w.set(x, y + 5, z + (alongX ? 0 : 0), B.pine_log); } }
    for (let i = 0; i < 3; i++) { const x = x0 + 2 + Math.floor(c.r() * (x1 - x0 - 4)), z = z0 + 2 + Math.floor(c.r() * (z1 - z0 - 4)); if (free(c, x, z) && !doorAisle(c, x, z) && Math.abs((alongX ? z : x) - mid) > 3) boulder(k, x, z, y, 1 + c.r() * 0.6); }
    for (let i = 0; i < 2; i++) { const x = alongX ? x0 + 3 + Math.floor(c.r() * (x1 - x0 - 6)) : mid + 7, z = alongX ? mid + 7 : z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6)); if (free(c, x, z) && !doorAisle(c, x, z)) oak(k, x, z, y); }
    stormDecorate(c);
    spawnGrid(c, 12, 2);
  },
  // Wrecked farmhouse: red board walls with holes, a broken roof, hay inside.
  farmhouse(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.12);
    const hx0 = x0 + 3, hz0 = z0 + 3, hx1 = x1 - 3, hz1 = z1 - 4;
    k.floor(hx0, hz0, hx1, hz1, y, B.floor_boards, 1);
    k.room(hx0, hz0, hx1, hz1, y, 4, B.barn_red, { alt: B.planks, altP: 0.1, trim: B.white_trim, doors: [{ side: 's', at: (hx0 + hx1) >> 1, width: 3, height: 3 }, { side: 'n', at: (hx0 + hx1) >> 1, width: 3, height: 3 }, { side: 'w', at: (hz0 + hz1) >> 1, width: 3, height: 3 }, { side: 'e', at: (hz0 + hz1) >> 1, width: 3, height: 3 }] });
    // storm damage: knocked-out boards
    for (let i = 0; i < 6; i++) { const side = Math.floor(c.r() * 4); const t = 1 + Math.floor(c.r() * 4); const yy = y + 1 + Math.floor(c.r() * 3); if (side === 0) k.w.set(hx0 + t * 2, yy, hz0, 0); else if (side === 1) k.w.set(hx0 + t * 2, yy, hz1, 0); else if (side === 2) k.w.set(hx0, yy, hz0 + t * 2, 0); else k.w.set(hx1, yy, hz0 + t * 2, 0); }
    for (let x = hx0 + 2; x < hx1 - 1; x += 4) { k.w.set(x, y + 2, hz1, B.window_dark); k.w.set(x, y + 2, hz0, B.window_dark); }
    // half a roof
    const top = gable(k, hx0, hz0, hx1, hz1, y + 4, B.roof_slate, { axis: 'x', end: B.barn_red });
    for (let x = hx0 - 1; x <= hx0 + Math.floor((hx1 - hx0) * 0.4); x++) for (let yy = y + 4; yy <= top; yy++) for (let z = hz0 - 1; z <= hz1 + 1; z++) if (k.w.get(x, yy, z) === B.roof_slate && c.r() < 0.85) k.w.set(x, yy, z, 0);
    k.w.addRoof([hx0 - 1, y + 4, hz0 - 1], [hx1 + 1, top, hz1 + 1], [[hx0, y, hz0], [hx1, y + 3, hz1]]);
    for (let i = 0; i < 4; i++) { const x = hx0 + 1 + Math.floor(c.r() * (hx1 - hx0 - 2)), z = hz0 + 1 + Math.floor(c.r() * (hz1 - hz0 - 2)); if (free(c, x, z)) k.w.set(x, y, z, B.hay); }
    k.w.set(hx1 - 1, y + 3, hz1 - 1, B.lantern);
    k.d.prop('fence', (x0 + x1) / 2, y, z1 - 1.5, { len: Math.floor((x1 - x0) / 2) * 2 - 4, white: true });
    stormDecorate(c, 0.7);
    spawnGrid(c, 12, 2);
  },
  // Hillside: terraces climbing toward the pine, big rocks and trees.
  hillside(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.08);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    // two terraces around the centre (rounded), with ramps of single steps
    for (let z = z0 + 3; z <= z1 - 3; z++) for (let x = x0 + 3; x <= x1 - 3; x++) {
      const d = Math.hypot((x - cx) / ((x1 - x0) / 2 - 3), (z - cz) / ((z1 - z0) / 2 - 3));
      const h = d < 0.45 ? 2 : d < 0.85 ? 1 : 0;
      for (let i = 0; i < h; i++) k.w.set(x, y + i, z, i === h - 1 ? B.grass : B.dirt);
    }
    for (let a = 0; a < 4; a++) { const x = Math.round(cx + Math.cos(a * 1.57 + 0.6) * ((x1 - x0) / 2 - 5)), z = Math.round(cz + Math.sin(a * 1.57 + 0.6) * ((z1 - z0) / 2 - 5)); if (!doorAisle(c, x, z, 3)) boulder(k, x, z, k.w.groundBelow(x + 0.5, z + 0.5, y + 6), 1.3 + c.r() * 0.6); }
    const ty = k.w.groundBelow(cx + 0.5, cz + 0.5, y + 6); oak(k, cx, cz, ty, { h: 5, R: 3.2 });
    for (let i = 0; i < 3; i++) { const x = x0 + 2 + Math.floor(c.r() * (x1 - x0 - 4)), z = z0 + 2 + Math.floor(c.r() * (z1 - z0 - 4)); if (free(c, x, z) && !doorAisle(c, x, z, 3)) pine(k, x, z, y, { h: 7 + Math.floor(c.r() * 3) }); }
    stormDecorate(c);
    spawnGrid(c, 12, 2);
    c.features.push('ledges');
  },
});

// ------------------------------------------------ camp woods templates
function woodsDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.forest_floor, B.grass], ['fern', 'fern', 'grass', 'leaf_litter', 'mushroom', 'tall_grass'], 0.3 * amount);
}
function woodsEdge(c, n = 10) {
  const { k, x0, z0, x1, z1, y } = c;
  for (let i = 0; i < n; i++) {
    const side = Math.floor(c.r() * 4), t = c.r();
    const x = side < 2 ? Math.round(x0 + 1 + t * (x1 - x0 - 2)) : side === 2 ? x0 + 1 : x1 - 1;
    const z = side >= 2 ? Math.round(z0 + 1 + t * (z1 - z0 - 2)) : side === 0 ? z0 + 1 : z1 - 1;
    if (free(c, x, z) && !doorAisle(c, x, z, 3)) pine(k, x, z, y, { h: 8 + Math.floor(c.r() * 5) });
  }
}
Object.assign(TEMPLATES, {
  // Dense pine forest with ferns, boulders and fallen logs.
  woods(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.forest_floor, 6); patches(k, x0, z0, x1, z1, y, B.grass, 0.25);
    woodsEdge(c, 8);
    for (let i = 0; i < 4; i++) { const x = x0 + 4 + Math.floor(c.r() * (x1 - x0 - 8)), z = z0 + 4 + Math.floor(c.r() * (z1 - z0 - 8)); if (free(c, x, z) && !doorAisle(c, x, z, 3)) (c.r() < 0.75 ? pine : oak)(k, x, z, y); }
    for (let i = 0; i < 2; i++) { const x = x0 + 4 + Math.floor(c.r() * (x1 - x0 - 8)), z = z0 + 4 + Math.floor(c.r() * (z1 - z0 - 8)); if (free(c, x, z) && !doorAisle(c, x, z, 3)) boulder(k, x, z, y, 1.2 + c.r() * 0.6); }
    // a fallen log
    { const x = x0 + 3 + Math.floor(c.r() * (x1 - x0 - 10)), z = z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6)); let ok = true; for (let i = 0; i < 5; i++) ok = ok && free(c, x + i, z) && !doorAisle(c, x + i, z, 3); if (ok) for (let i = 0; i < 5; i++) k.w.set(x + i, y, z, B.pine_log); }
    woodsDecorate(c);
    spawnGrid(c, 12, 2);
  },
  // The creek: running water with sandy banks, stepping stones and a log bridge.
  creek(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.forest_floor, 6); patches(k, x0, z0, x1, z1, y, B.grass, 0.3);
    const alongX = (x1 - x0) >= (z1 - z0);
    const mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
    for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) {
      const off = Math.round(Math.sin(t * 0.35) * 2);
      for (let s = -3; s <= 3; s++) {
        const x = alongX ? t : mid + off + s, z = alongX ? mid + off + s : t;
        if (Math.abs(s) <= 1) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.water); k.w.set(x, y - 3, z, B.sand); }
        else k.w.set(x, y - 1, z, Math.abs(s) === 2 ? B.sand : B.grass);
      }
    }
    // stepping stones + a log bridge
    for (let t = (alongX ? x0 : z0) + 3; t < (alongX ? x1 : z1) - 2; t += 6) { const off = Math.round(Math.sin(t * 0.35) * 2); const x = alongX ? t : mid + off, z = alongX ? mid + off : t; k.w.set(x, y - 1, z, B.rock); k.w.set(x, y - 2, z, B.rock); }
    { const t = alongX ? ((x0 + x1) >> 1) + 3 : ((z0 + z1) >> 1) + 3; const off = Math.round(Math.sin(t * 0.35) * 2); for (let s = -3; s <= 3; s++) { const x = alongX ? t : mid + off + s, z = alongX ? mid + off + s : t; k.w.set(x, y - 1, z, B.pine_log); } }
    for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t += 2) { const off = Math.round(Math.sin(t * 0.35) * 2); for (const s of [-2, 2]) if (c.r() < 0.5) k.d.add('reeds', (alongX ? t : mid + off + s) + 0.5, y, (alongX ? mid + off + s : t) + 0.5, { scale: 1, sway: 1 }); }
    woodsEdge(c, 6);
    boulder(k, alongX ? x0 + 4 : mid - 6, alongX ? mid - 6 : z0 + 4, y, 1.3);
    woodsDecorate(c, 0.8);
    spawnGrid(c, 12, 2);
    c.features.push('creek');
  },
  // Zeus's Fist: a great pile of boulders you can climb.
  zeus_fist(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.forest_floor, 6); patches(k, x0, z0, x1, z1, y, B.grass, 0.25);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    boulder(k, cx, cz, y, 3.2); boulder(k, cx - 2, cz + 1, y + 2, 2.4); boulder(k, cx + 1, cz - 1, y + 4, 1.8);
    boulder(k, cx + 3, cz + 2, y, 2);
    // a climbing ramp of single steps up one side
    for (let i = 0; i < 4; i++) for (let w = 0; w < 2; w++) { k.w.fill(cx - 7 + i, y, cz + w, cx - 7 + i, y + i, cz + w, B.rock); k.w.fill(cx - 7 + i, y + i + 1, cz + w, cx - 7 + i, y + i + 4, cz + w, 0); }
    woodsEdge(c, 7);
    k.d.prop('flagpole', cx + 0.5, k.w.groundBelow(cx + 0.5, cz + 0.5, y + 12), cz + 0.5, { h: 4, color: 0xd8322a });
    woodsDecorate(c);
    spawnGrid(c, 12, 2);
    c.features.push('ledges');
  },
  // A moonlit clearing with an old campfire ring and armour left behind.
  clearing(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.forest_floor, 0.3);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    k.d.prop('campfire', cx + 0.5, y, cz + 0.5); k.w.addLight(cx + 0.5, y + 1.2, cz + 0.5, 0xff9a40, 5, 11); collider(c, cx, cz, 1);
    for (let a = 0; a < 3; a++) { const x = Math.round(cx + Math.cos(a * 2.1) * 3.5), z = Math.round(cz + Math.sin(a * 2.1) * 3.5); if (free(c, x, z)) k.w.set(x, y, z, B.pine_log); }
    woodsEdge(c, 10);
    k.s.add({ x: cx + 0.5, y: y + 14, z: cz - 3 }, { x: 0.25, y: -1, z: 0.35 }, 15, 5, 0xc0d4ff);
    scatterOn(k, x0, z0, x1, z1, [B.grass], ['flower_blue', 'flower_yellow', 'grass', 'tall_grass'], 0.3);
    woodsDecorate(c, 0.6);
    spawnGrid(c, 12, 2);
  },
});

BIOME_ROOMS.camp = ['woods', 'clearing', 'creek'];
BIOME_ROOMS.museum = ['gallery', 'gallery', 'grand_hall', 'sculpture_court', 'storeroom'];
BIOME_ROOMS.storm_hill = ['farm_field', 'farm_road', 'farm_road', 'farmhouse', 'hillside'];
BIOME_ROOMS.camp_woods = ['woods', 'woods', 'creek', 'zeus_fist', 'clearing'];

// =====================================================================
// The road west: Book 1, chapters 4-12. Shared helpers, then one section
// per biome (templates, start room and boss arena).
// =====================================================================
const lightAt = (c, x, y, z, col, I = 4, d = 9) => c.k.w.addLight(x, y, z, col, I, d);
// A prop on a free floor cell (not in a doorway), with an invisible collider h high.
function place(c, x, z, kind, o = {}, h = 1, aisle = 2) {
  if (!free(c, x, z) || doorAisle(c, x, z, aisle)) return false;
  c.k.d.prop(kind, x + 0.5, c.y, z + 0.5, o);
  if (h) collider(c, x, z, h);
  return true;
}
// A wide prop: every cell of the footprint must be free; colliders under all of it.
function placeWide(c, x0, z0, x1, z1, kind, o = {}, h = 1) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (!free(c, x, z) || doorAisle(c, x, z, 2)) return false;
  c.k.d.prop(kind, (x0 + x1 + 1) / 2, c.y, (z0 + z1 + 1) / 2, o);
  if (h) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) collider(c, x, z, h);
  return true;
}
// Walls with door openings and an optional roof slab that fades when you walk in.
function shell(c, { wall, alt = null, altP = 0, trim = null, h = 6, roof = null, doorH = 4 }) {
  const { k, x0, z0, x1, z1, y } = c;
  k.room(x0, z0, x1, z1, y, h, wall, { alt, altP, trim, doors: c.doors.map((d) => ({ ...d, width: 5, height: doorH })) });
  if (roof) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) k.w.set(x, y + h, z, roof);
    k.w.addRoof([x0, y + h, z0], [x1, y + h, z1], [[x0, y, z0], [x1, y + h - 1, z1]]);
  }
}
// Carve a boss arena round, with a wobbly edge.
function roundArena(c, wob = 0) {
  const { k, x0, z0, x1, z1, y } = c;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = (x1 - x0) / 2;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) > R + 0.6 + (wob ? Math.sin(x * 0.7 + z) * wob : 0)) for (let yy = y - 8; yy < y + 8; yy++) k.w.set(x, yy, z, 0);
  return { cx, cz, R };
}
const cellIn = (c, m = 2) => [c.x0 + m + Math.floor(c.r() * (c.x1 - c.x0 - m * 2 + 1)), c.z0 + m + Math.floor(c.r() * (c.z1 - c.z0 - m * 2 + 1))];
// The axis a road should run along: between the doors if there are any.
const roadAlongX = (c) => { const ew = c.doors.filter((d) => d.side === 'e' || d.side === 'w').length, ns = c.doors.length - ew; return ew === ns ? (c.x1 - c.x0) >= (c.z1 - c.z0) : ew > ns; };
// Flat signs: a board with words, on posts (see deco 'text_sign').
const sign = (c, x, z, text, o = {}) => c.k.d.prop('text_sign', x, o.y ?? c.y, z, { text, ...o });

// ------------------------------------------------ chapter 4: the New Jersey turnpike
// A Greyhound built of blocks, walkable inside (seats, an aisle, a side door and a
// broken rear window). u runs along the bus (length len), v across (0..6).
function busBlocks(c, ox, oz, len, alongX, { burning = false, flip = false } = {}) {
  const { k, y } = c; const W = k.w;
  const P = (u, v) => { const vv = flip ? 6 - v : v; return alongX ? [ox + u, oz + vv] : [ox + vv, oz + u]; };
  for (let u = 0; u < len; u++) for (let v = 0; v <= 6; v++) {
    const [x, z] = P(u, v);
    c.reserved = c.reserved ?? new Set(); c.reserved.add(x + ',' + z);
    W.set(x, y - 1, z, (v === 0 || v === 6) ? B.dark_brick : B.carpet_red);
    const end = u === 0 || u === len - 1, side = v === 0 || v === 6;
    for (let h = 0; h < 4; h++) {
      let id = 0;
      if (side || end) id = h === 0 ? B.bus_panel : h === 3 ? B.bus_panel : (end && u === len - 1 ? B.glass : side ? B.window_dark : B.bus_panel);
      if (side && h === 1 && u % 4 === 0) id = B.bus_panel;
      W.set(x, y + h, z, id);
    }
    W.set(x, y + 4, z, B.bus_panel);
  }
  // seats in pairs either side of the aisle (v = 3), gaps every third row
  for (let u = 2; u < len - 3; u++) if (u % 3 !== 1) for (const v of [1, 2, 4, 5]) { const [x, z] = P(u, v); W.set(x, y, z, B.bus_seat); }
  // the driver's seat, the side door, the broken back window
  { const [x, z] = P(len - 2, 1); W.set(x, y, z, B.bus_seat); }
  for (let u = len - 4; u <= len - 3; u++) for (let h = 0; h < 3; h++) { const [x, z] = P(u, 6); W.set(x, y + h, z, 0); }
  for (let v = 2; v <= 4; v++) for (let h = 1; h < 3; h++) { const [x, z] = P(0, v); W.set(x, y + h, z, 0); }
  for (let v = 2; v <= 4; v++) { const [x, z] = P(0, v); W.set(x, y, z, 0); }
  const [ax, az] = P(0, 0), [bx, bz] = P(len - 1, 6);
  const mn = [Math.min(ax, bx), y + 4, Math.min(az, bz)], mx = [Math.max(ax, bx), y + 4, Math.max(az, bz)];
  W.addRoof(mn, mx, [[mn[0], y, mn[2]], [mx[0], y + 3, mx[2]]]);
  // the running-dog stripe and the wheels
  for (const u of [2, 3, len - 4, len - 3]) for (const v of [0, 6]) { const [x, z] = P(u, v); W.set(x, y - 1, z, B.dark_brick); }
  { const [x, z] = P(Math.floor(len / 2), 3); lightAt(c, x + 0.5, y + 3, z + 0.5, burning ? 0xff8a3a : 0xffe0b0, burning ? 5 : 3, 9); }
  if (burning) for (let u = 2; u < len - 2; u += 3) { const [x, z] = P(u, 2 + (u % 3)); k.d.prop('fire', x + 0.5, y + 5, z + 0.5, { scale: 0.8 + (u % 2) * 0.4, smoke: u % 2 === 0 }); lightAt(c, x + 0.5, y + 6, z + 0.5, 0xff7a2a, 5, 11); }
  const [dx, dz] = P(len - 3, 7);
  return { door: [dx + 0.5, y, dz + 0.5], aisle: (() => { const [x, z] = P(Math.floor(len / 2), 3); return [x + 0.5, y, z + 0.5]; })() };
}
// asphalt road band with dashed lines; returns its centre line
function roadBand(c, alongX, mid, half = 3, { line = true, shoulder = B.concrete } = {}) {
  const { k, x0, z0, x1, z1, y } = c;
  for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) for (let s = -half - 1; s <= half + 1; s++) {
    const x = alongX ? t : mid + s, z = alongX ? mid + s : t;
    const edge = Math.abs(s) === half + 1;
    k.w.set(x, y - 1, z, edge ? shoulder : line && s === 0 && t % 4 < 2 ? B.asphalt_line : B.asphalt);
  }
}
function highwayDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.asphalt], ['road_crack', 'puddle'], 0.04 * amount, 1);
  scatterOn(k, x0, z0, x1, z1, [B.grass, B.mud], ['tall_grass', 'grass', 'puddle', 'fern'], 0.3 * amount);
}
Object.assign(TEMPLATES, {
  // Four lanes in the rain: guardrails, wrecked cars, cones, the woods either side.
  turnpike(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.1);
    const alongX = roadAlongX(c), mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
    roadBand(c, alongX, mid, 4);
    // guardrails along both shoulders, broken where the doors are
    for (let t = (alongX ? x0 : z0) + 1; t < (alongX ? x1 : z1); t++) for (const s of [-6, 6]) {
      const x = alongX ? t : mid + s, z = alongX ? mid + s : t;
      if (!doorAisle(c, x, z, 3) && t % 9 !== 4) k.w.set(x, y, z, B.guardrail);
    }
    for (let i = 0; i < 3; i++) {
      const t = (alongX ? x0 : z0) + 3 + Math.floor(c.r() * ((alongX ? x1 - x0 : z1 - z0) - 6)), s = (c.r() < 0.5 ? -2 : 2);
      const x = alongX ? t : mid + s, z = alongX ? mid + s : t;
      if (!free(c, x, z)) continue;
      if (i === 0) { k.d.prop('car_flipped', x + 0.5, y, z + 0.5, { rot: (alongX ? 0 : Math.PI / 2) + (c.r() - 0.5), color: [0x7a1a1a, 0x2a4a7a, 0xd8d8d8][Math.floor(c.r() * 3)] }); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) collider(c, x + (alongX ? a : b), z + (alongX ? b : a), 1); }
      else { k.d.prop('car', x + 0.5, y, z + 0.5, { rot: (alongX ? 0 : Math.PI / 2) + (c.r() - 0.5) * 0.6, color: [0x1a3a6a, 0x2a2a2a, 0xb8862a, 0xd8d8d8][Math.floor(c.r() * 4)] }); for (let a = -1; a <= 1; a++) collider(c, x + (alongX ? a : 0), z + (alongX ? 0 : a), 1); }
    }
    for (let i = 0; i < 5; i++) { const t = (alongX ? x0 : z0) + 2 + Math.floor(c.r() * ((alongX ? x1 - x0 : z1 - z0) - 4)); const s = Math.floor(c.r() * 7) - 3; place(c, alongX ? t : mid + s, alongX ? mid + s : t, 'cone', { rot: c.r() * 3 }, 0); }
    // streetlights on the median side, the woods beyond the rails
    for (let t = (alongX ? x0 : z0) + 3; t < (alongX ? x1 : z1) - 1; t += 8) { const x = alongX ? t : mid - 7, z = alongX ? mid - 7 : t; if (free(c, x, z)) { k.d.prop('streetlight', x + 0.5, y, z + 0.5, { rot: alongX ? -Math.PI / 2 : 0 }); collider(c, x, z, 1); lightAt(c, x + 0.5 + (alongX ? 0 : 1), y + 4.8, z + 0.5 + (alongX ? 1 : 0), 0xffd8a0, 5, 11); } }
    for (let i = 0; i < 6; i++) { const t = (alongX ? x0 : z0) + 1 + Math.floor(c.r() * ((alongX ? x1 - x0 : z1 - z0) - 2)); const s = (c.r() < 0.5 ? -1 : 1) * (8 + Math.floor(c.r() * 2)); const x = alongX ? t : mid + s, z = alongX ? mid + s : t; if (free(c, x, z) && !doorAisle(c, x, z, 3) && x > x0 && x < x1 && z > z0 && z < z1) (c.r() < 0.7 ? pine : oak)(k, x, z, y, { h: 6 + Math.floor(c.r() * 4) }); }
    highwayDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The bus pulled over on the shoulder; the Furies' first strike.
  bus_stop(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.1);
    const alongX = (x1 - x0) >= (z1 - z0);
    const mid = alongX ? z0 + 4 : x0 + 4;
    roadBand(c, alongX, mid, 2);
    const len = Math.min(15, (alongX ? x1 - x0 : z1 - z0) - 4);
    const ox = alongX ? x0 + 2 : mid + 4, oz = alongX ? mid + 4 : z0 + 2;
    let clear = true; for (let u = 0; u < len; u++) for (let v = 0; v <= 6; v++) { const x = alongX ? ox + u : ox + v, z = alongX ? oz + v : oz + u; if (doorAisle(c, x, z, 3)) clear = false; }
    if (clear) busBlocks(c, ox, oz, len, alongX, { burning: c.r() < 0.5 });
    else k.d.prop('greyhound', (x0 + x1) / 2 + 0.5, y, (z0 + z1) / 2 + 0.5, { rot: alongX ? 0 : Math.PI / 2 });
    // a bus-stop shelter and a sign
    { const [x, z] = alongX ? [x1 - 3, mid - 4] : [mid - 4, z1 - 3]; if (free(c, x, z) && !doorAisle(c, x, z, 3)) { k.w.fill(x - 1, y, z, x + 1, y + 2, z, B.glass); k.w.fill(x - 1, y + 3, z - 1, x + 1, y + 3, z + 1, B.iron_plate); k.d.prop('bench', x + 0.5, y, z + 1.5); } }
    sign(c, (alongX ? x0 + 3 : mid - 4) + 0.5, (alongX ? mid - 4 : z0 + 3) + 0.5, 'GREYHOUND', { w: 2.6, h: 0.8, post: 2.2, bg: '#1d3a8a', fg: '#ffffff', border: '#c8ccd2', rot: alongX ? 0 : Math.PI / 2 });
    highwayDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // A rest stop: a gas canopy, pumps, a diner with its lights on.
  rest_stop(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.asphalt, 6, B.concrete, 0.06);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    // the canopy on four posts, with pumps beneath
    for (const [dx, dz] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) k.pillar(cx + dx, cz + dz, y, 4, B.white_trim);
    for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 5; x <= cx + 5; x++) k.w.set(x, y + 4, z, (z === cz - 3 || z === cz + 3) ? B.red_plank : B.white_trim);
    k.w.addRoof([cx - 5, y + 4, cz - 3], [cx + 5, y + 4, cz + 3], [[cx - 5, y, cz - 3], [cx + 5, y + 3, cz + 3]]);
    for (const dx of [-2, 2]) for (const dz of [0]) { k.d.prop('gas_pump', cx + dx + 0.5, y, cz + dz + 0.5); collider(c, cx + dx, cz + dz, 1); }
    lightAt(c, cx + 0.5, y + 3.4, cz + 0.5, 0xfff0d0, 6, 12);
    // the diner along the far wall
    const dz0 = z0 + 1, dz1 = z0 + 5, dx0 = x0 + 2, dx1 = Math.min(x1 - 2, x0 + 11);
    let ok = true; for (let x = dx0; x <= dx1; x++) for (let z = dz0; z <= dz1; z++) if (doorAisle(c, x, z, 3)) ok = false;
    if (ok) {
      k.room(dx0, dz0, dx1, dz1, y, 4, B.white_trim, { trim: B.red_plank, doors: [{ side: 's', at: (dx0 + dx1) >> 1, width: 3, height: 3 }] });
      for (let x = dx0 + 1; x < dx1; x += 2) if (x !== ((dx0 + dx1) >> 1) && x !== ((dx0 + dx1) >> 1) - 1 && x !== ((dx0 + dx1) >> 1) + 1) k.w.set(x, y + 1, dz1, B.window);
      for (let z = dz0; z <= dz1; z++) for (let x = dx0; x <= dx1; x++) k.w.set(x, y + 4, z, B.roof_slate);
      k.w.addRoof([dx0, y + 4, dz0], [dx1, y + 4, dz1], [[dx0, y, dz0], [dx1, y + 3, dz1]]);
      k.floor(dx0 + 1, dz0 + 1, dx1 - 1, dz1 - 1, y, B.marble_floor, 1);
      k.w.fill(dx0 + 1, y, dz0 + 1, dx1 - 1, y, dz0 + 1, B.red_plank);
      lightAt(c, (dx0 + dx1) / 2 + 0.5, y + 2.5, dz1 + 1, 0xffd8a0, 4, 9);
      sign(c, (dx0 + dx1) / 2 + 0.5, dz1 + 0.6, 'DINER', { y: y + 4.1, w: 3, h: 0.8, bg: '#2a0a10', fg: '#ff5a7a', glow: true, oneSided: true });
    }
    for (let i = 0; i < 2; i++) { const [x, z] = cellIn(c, 3); if (free(c, x, z) && free(c, x + 1, z) && free(c, x - 1, z) && Math.abs(z - cz) > 3) { k.d.prop('car', x + 0.5, y, z + 0.5, { rot: c.r() * 0.4, color: [0x1a3a6a, 0x7a1a1a][i] }); for (let a = -1; a <= 1; a++) collider(c, x + a, z, 1); } }
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); if (free(c, x, z) && !doorAisle(c, x, z)) { k.w.set(x, y, z, B.barrel); if (c.r() < 0.4) { k.d.prop('fire', x + 0.5, y + 1, z + 0.5, { scale: 0.5 }); lightAt(c, x + 0.5, y + 1.8, z + 0.5, 0xff8a3a, 3, 7); } } }
    highwayDecorate(c, 0.6);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // Wet New Jersey woods beside the road: a ditch, a fallen tree, a green exit sign.
  roadside_woods(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.16); patches(k, x0, z0, x1, z1, y, B.forest_floor, 0.25);
    const alongX = roadAlongX(c), mid = alongX ? z0 + 3 : x0 + 3;
    for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) for (let s = 0; s < 3; s++) { const x = alongX ? t : mid + s, z = alongX ? mid + s : t; k.w.set(x, y - 1, z, s === 1 ? B.water : B.mud); if (s === 1) k.w.set(x, y - 2, z, B.mud); }
    woodsEdge(c, 12);
    for (let i = 0; i < 5; i++) { const [x, z] = cellIn(c, 4); if (free(c, x, z) && !doorAisle(c, x, z, 3)) (c.r() < 0.7 ? pine : oak)(k, x, z, y); }
    { const [x, z] = cellIn(c, 4); let ok = true; for (let i = 0; i < 6; i++) ok = ok && free(c, x + i, z) && !doorAisle(c, x + i, z, 3); if (ok) for (let i = 0; i < 6; i++) k.w.set(x + i, y, z, B.log); }
    sign(c, (alongX ? (x0 + x1) / 2 : mid + 5) + 0.5, (alongX ? mid + 5 : (z0 + z1) / 2) + 0.5, 'EXIT 13\nTRENTON', { w: 2.6, h: 1.2, post: 2.4, bg: '#1e6a3a', fg: '#ffffff', border: '#ffffff', rot: alongX ? 0 : Math.PI / 2 });
    scatterOn(k, x0, z0, x1, z1, [B.forest_floor, B.grass], ['fern', 'leaf_litter', 'tall_grass', 'mushroom'], 0.25);
    highwayDecorate(c, 0.6);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.highway = {
  // The Greyhound parked on the shoulder in the rain.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.mud, 0.12);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    roadBand(c, true, cz - 3, 3);
    k.d.prop('greyhound', cx + 0.5, y, cz - 5.5, { rot: 0 }); k.w.fill(cx - 5, y, cz - 7, cx + 5, y + 2, cz - 5, B.barrier);
    for (let x = x0 + 1; x < x1; x++) if (x % 7 !== 3) k.w.set(x, y, cz + 2, B.guardrail);
    sign(c, x0 + 3.5, cz + 4.5, 'NEW JERSEY\nTURNPIKE', { w: 2.4, h: 1.2, post: 2.2, bg: '#1e6a3a', fg: '#ffffff', border: '#ffffff' });
    k.d.prop('streetlight', x1 - 2.5, y, cz + 3.5, { rot: Math.PI }); lightAt(c, x1 - 3.5, y + 4.8, cz + 3.5, 0xffd8a0, 5, 11);
    pine(k, x0 + 2, z1 - 2, y); pine(k, x1 - 3, z1 - 3, y); oak(k, x0 + 3, cz + 5, y);
    highwayDecorate(c);
    k.w.set(cx, y - 1, cz + 4, B.gold_plate);
  },
  // The roadside crash: the bus on fire across the shoulder, the road, rails and trees.
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 8); patches(k, x0, z0, x1, z1, y, B.mud, 0.15);
    const { cx, cz, R } = roundArena(c, 0.6);
    roadBand(c, true, Math.round(cz) + 3, 3);
    const bus = busBlocks(c, x0 + 3, z0 + 3, 15, true, { burning: true });
    for (let x = x0; x <= x1; x++) if (Math.abs(x + 0.5 - cx) > 3 && k.w.get(x, y - 1, Math.round(cz) + 8)) k.w.set(x, y, Math.round(cz) + 8, B.guardrail);
    for (const [a, rr] of [[0.2, 0.9], [2.6, 0.85], [3.4, 0.9], [5.6, 0.85]]) { const px = Math.round(cx + Math.cos(a) * R * rr), pz = Math.round(cz + Math.sin(a) * R * rr); if (free(c, px, pz)) pine(k, px, pz, y, { h: 9 }); }
    for (let i = 0; i < 4; i++) { const px = Math.round(cx - 6 + i * 4), pz = Math.round(cz) + 2 + (i % 2) * 2; place(c, px, pz, 'cone', { rot: i }, 0); }
    k.d.prop('car_flipped', cx + 6.5, y, cz + 6, { rot: 0.4, color: 0x7a1a1a }); k.w.fill(Math.round(cx) + 5, y, Math.round(cz) + 5, Math.round(cx) + 8, y + 1, Math.round(cz) + 6, B.barrier);
    highwayDecorate(c);
    c.slots.push({ type: 'bus', pos: bus.aisle }, { type: 'bus_door', pos: bus.door });
    c.spawns.push([cx, y, cz + 3]);
  },
};

// ------------------------------------------------ chapter 5: Aunty Em's Garden Gnome Emporium
function gardenDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.grass], ['grass', 'tall_grass', 'flower_yellow', 'flower_red'], 0.25 * amount);
  scatterOn(k, x0, z0, x1, z1, [B.gravel_path, B.cobble], ['leaf_litter', 'grass'], 0.05 * amount);
}
// A stone person: frozen mid-scream, facing a random way (some are satyrs).
function petrified(c, x, z, o = {}) { return place(c, x, z, 'stone_person', { pose: Math.floor(c.r() * 5), rot: c.r() * Math.PI * 2, scale: 1.1 + c.r() * 0.15, ...o }, 2); }
// A low hedge or ivy-covered stone wall around the room, open at the doors.
function hedgeRing(c, id = B.leaves) {
  const { k, x0, z0, x1, z1, y } = c;
  k.room(x0, z0, x1, z1, y, 2, id, { alt: B.mossy_brick, altP: id === B.leaves ? 0 : 0.4, doors: c.doors.map((d) => ({ ...d, width: 5, height: 2 })) });
}
Object.assign(TEMPLATES, {
  // Rows of statues of people who looked at her, in a gravel yard.
  statue_yard(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6, B.dirt, 0.05);
    for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 1; x < x1; x++) if ((x - x0) % 3 === 1 || (z - z0) % 6 === 0) k.w.set(x, y - 1, z, (x + z) % 5 ? B.gravel_path : B.cobble);
    hedgeRing(c, B.stone_brick);
    for (let x = x0; x <= x1; x += 2) for (const z of [z0, z1]) if (k.w.get(x, y, z)) k.d.add('ivy', x + 0.5, y + 1, z + (z === z0 ? 1.03 : -0.03), { mode: 'wall', facing: [0, z === z0 ? 1 : -1], scale: 1.8, sway: 0.1 });
    for (let x = x0 + 3; x <= x1 - 3; x += 3) for (let z = z0 + 3; z <= z1 - 3; z += 3) { const t = c.r(); if (t < 0.45) petrified(c, x + (z % 2), z); else if (t < 0.6) place(c, x, z, 'gnome', { rot: c.r() * 6, color: [0xd8322a, 0x2a6ad8, 0xffd84a][Math.floor(c.r() * 3)] }, 0); }
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 3); if (c.r() < 0.5) place(c, x, z, 'gazing_ball', {}, 1); else place(c, x, z, 'birdbath', {}, 1); }
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 3); if (free(c, x, z) && !doorAisle(c, x, z, 3)) oak(k, x, z, y, { h: 4, R: 2.2 }); }
    gardenDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The warehouse: shelves of gnomes, crates, statues under dust sheets.
  warehouse(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.concrete, 6);
    shell(c, { wall: B.corrugated, alt: B.rust_metal, altP: 0.06, trim: B.iron_plate, h: 6, roof: B.corrugated });
    const alongX = (x1 - x0) >= (z1 - z0);
    for (let t = (alongX ? z0 : x0) + 3; t <= (alongX ? z1 : x1) - 3; t += 4) for (let u = (alongX ? x0 : z0) + 3; u <= (alongX ? x1 : z1) - 4; u++) {
      const x = alongX ? u : t, z = alongX ? t : u;
      if (!free(c, x, z) || doorAisle(c, x, z, 3) || (u - (alongX ? x0 : z0)) % 7 === 5) continue;
      k.w.set(x, y, z, B.planks); k.w.set(x, y + 2, z, B.planks); k.w.set(x, y + 1, z, B.barrier);
      if (c.r() < 0.6) k.d.prop('gnome', x + 0.5, y + 1, z + 0.5, { rot: c.r() * 6, scale: 0.8, color: [0xd8322a, 0x2a6ad8, 0xffd84a][Math.floor(c.r() * 3)] });
      if (c.r() < 0.4) k.d.prop('gnome', x + 0.5, y + 3, z + 0.5, { rot: c.r() * 6, scale: 0.8 });
    }
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); petrified(c, x, z); }
    scatterBreakables(c, 6);
    for (let x = x0 + 4; x < x1 - 2; x += 6) for (let z = z0 + 4; z < z1 - 2; z += 6) { k.d.prop('chandelier', x + 0.5, y + 6, z + 0.5, { scale: 0.7 }); lightAt(c, x + 0.5, y + 4.5, z + 0.5, 0xffd8a0, 3.5, 9); }
    k.cobwebCorners(x0, z0, x1, z1, y + 5);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // Aunty Em's snack bar: a hut with a counter and grill, picnic tables, a striped awning.
  snack_bar(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6, B.gravel_path, 0.1);
    patches(k, x0, z0, x1, z1, y, B.gravel_path, 0.3);
    hedgeRing(c);
    // the hut against a wall with no door: counter open toward the yard
    const side = ['n', 'w', 'e', 's'].find((sd) => !c.doors.some((d) => d.side === sd)) ?? 'n';
    const F = wallFrame(c, side), um = (F.len[0] + F.len[1]) >> 1;
    const hut = (u, v) => F.P(u, v);
    for (let u = um - 4; u <= um + 4; u++) for (let v = 1; v <= 4; v++) {
      const [x, z] = hut(u, v); const edgeU = u === um - 4 || u === um + 4;
      k.w.set(x, y - 1, z, B.floor_boards);
      for (let yy = y; yy < y + 4; yy++) k.w.set(x, yy, z, (edgeU || v === 1) ? (yy === y + 3 ? B.white_trim : B.planks) : v === 4 ? (yy === y ? B.planks : yy === y + 3 ? B.white_trim : 0) : 0);
      k.w.set(x, y + 4, z, B.roof_terracotta);
      c.reserved = c.reserved ?? new Set(); c.reserved.add(x + ',' + z);
    }
    for (let u = um - 4; u <= um + 4; u++) { const [x, z] = hut(u, 5); k.w.set(x, y + 3, z, B.awning); const [x2, z2] = hut(u, 6); k.w.set(x2, y + 2, z2, B.awning); }
    { const [ax, az] = hut(um - 5, 0), [bx, bz] = hut(um + 5, 6); k.w.addRoof([Math.min(ax, bx), y + 2, Math.min(az, bz)], [Math.max(ax, bx), y + 4, Math.max(az, bz)], [[Math.min(ax, bx), y, Math.min(az, bz)], [Math.max(ax, bx), y + 1, Math.max(az, bz)]]); }
    { const [gx, gz] = hut(um - 2, 2); k.w.set(gx, y, gz, B.iron_plate); k.d.prop('fire', gx + 0.5, y + 1, gz + 0.5, { scale: 0.35 }); lightAt(c, gx + 0.5, y + 1.6, gz + 0.5, 0xff9a40, 3, 6); }
    { const [lx, lz] = hut(um, 6); lightAt(c, lx + 0.5, y + 2.4, lz + 0.5, 0xffd8a0, 4, 9); const [sx, sz] = hut(um, 1); sign(c, sx + 0.5 + F.facing[0] * 0.55, sz + 0.5 + F.facing[1] * 0.55, 'SNACK BAR', { y: y + 4.2, w: 3.4, h: 0.8, bg: '#f2efe6', fg: '#c4302a', border: '#3f8a34', rot: Math.atan2(F.facing[0], F.facing[1]) }); }
    const hz1 = -1;
    for (let i = 0; i < 5; i++) { const [x, z] = cellIn(c, 3); if (z > hz1 && free(c, x - 1, z) && free(c, x + 1, z)) { place(c, x, z, 'table', { len: 3, rot: 0 }, 1) && (collider(c, x - 1, z, 1), collider(c, x + 1, z, 1)); if (c.r() < 0.6) k.d.prop('umbrella', x + 0.5, y, z + 0.5, { color: 0x3f8a34 }); } }
    for (let i = 0; i < 2; i++) { const [x, z] = cellIn(c, 2); petrified(c, x, z); }
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'gnome', { rot: c.r() * 6 }, 0); }
    gardenDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The gnome garden: hedge rows, gnomes on every path, a stone fountain.
  gnome_garden(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6);
    hedgeRing(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let z = z0 + 3; z <= z1 - 3; z += 4) for (let x = x0 + 2; x <= x1 - 2; x++) { if (Math.abs(x - cx) < 3 || doorAisle(c, x, z, 3) || !free(c, x, z)) continue; k.w.set(x, y, z, B.leaves); }
    for (let z = z0 + 1; z < z1; z++) for (let x = cx - 1; x <= cx + 1; x++) k.w.set(x, y - 1, z, B.gravel_path);
    k.pond(cx - 1, cz - 1, cx + 1, cz + 1, y, B.water, 1, B.stone_brick);
    k.d.prop('stone_person', cx + 0.5, y - 1, cz + 0.5, { pose: 2, rot: 0.6, scale: 1.2 }); collider(c, cx, cz, 2);
    for (let z = z0 + 2; z <= z1 - 2; z += 2) for (let x = x0 + 2; x <= x1 - 2; x += 3) if (c.r() < 0.35) place(c, x, z, 'gnome', { rot: c.r() * 6, color: [0xd8322a, 0x2a6ad8, 0xffd84a][Math.floor(c.r() * 3)] }, 0);
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); petrified(c, x, z); }
    gardenDecorate(c, 1.2);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.statue_garden = {
  // The drive in, under the emporium's big sign; the warehouse ahead.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6, B.dirt, 0.05);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let z = z0; z <= z1; z++) for (let x = cx - 2; x <= cx + 2; x++) k.w.set(x, y - 1, z, B.gravel_path);
    for (let x = x0; x <= x1; x++) for (let zz = cz - 1; zz <= cz + 1; zz++) k.w.set(x, y - 1, zz, B.gravel_path);
    sign(c, cx + 0.5, z0 + 3.5, 'AUNTY EM’S\nGARDEN GNOME EMPORIUM', { w: 7, h: 2, post: 2.4, bg: '#f2efe6', fg: '#c4302a', border: '#3f8a34' });
    k.w.fill(cx - 3, y, z0 + 3, cx + 3, y, z0 + 3, B.barrier);
    for (let x = x0 + 2; x <= x1 - 2; x += 2) if (Math.abs(x - cx) > 2) { k.d.prop('gnome', x + 0.5, y, cz + 0.5, { rot: Math.PI, color: [0xd8322a, 0x2a6ad8, 0xffd84a][(x >> 1) % 3] }); }
    for (const [x, z, pose] of [[x0 + 3, z1 - 3, 0], [x1 - 3, z1 - 4, 2], [x1 - 4, cz - 3, 4]]) { k.d.prop('stone_person', x + 0.5, y, z + 0.5, { pose, rot: 2.4, scale: 1.15 }); collider(c, x, z, 2); }
    oak(k, x0 + 2, z0 + 2, y, { h: 4 }); oak(k, x1 - 2, z0 + 2, y, { h: 4 });
    for (const x of [x0 + 2, x1 - 2]) { k.d.prop('streetlight', x + 0.5, y, cz + 2.5, { rot: x < cx ? 0 : Math.PI }); lightAt(c, x + (x < cx ? 1.5 : -0.5), y + 4.8, cz + 2.5, 0xffc890, 4, 10); }
    gardenDecorate(c);
    k.w.set(cx, y - 1, cz + 3, B.gold_plate);
  },
  // The statue yard behind the warehouse. Medusa can only be seen in a reflection:
  // gazing balls on pedestals round the yard (slots 'mirror').
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.gravel_path, 8, B.cobble, 0.15);
    patches(k, x0, z0, x1, z1, y, B.grass, 0.3);
    const { cx, cz, R } = roundArena(c);
    // the warehouse front on the far side, its doors open
    for (let x = Math.round(cx) - 6; x <= Math.round(cx) + 6; x++) for (let yy = y; yy < y + 6; yy++) for (const z of [z0 + 1, z0 + 2]) if (k.w.get(x, y - 1, z)) k.w.set(x, yy, z, (Math.abs(x - cx + 0.5) < 2 && yy < y + 3 && z === z0 + 2) ? 0 : z === z0 + 1 ? B.corrugated : (yy === y + 5 ? B.iron_plate : B.corrugated));
    sign(c, cx, z0 + 3.1, 'AUNTY EM’S', { y: y + 3.8, w: 4, h: 0.9, bg: '#f2efe6', fg: '#c4302a', border: '#3f8a34', oneSided: true });
    // statues in a broken ring, ivy-covered pillars
    for (let a = 0; a < 14; a++) { const ang = a / 14 * Math.PI * 2 + 0.2; const px = Math.round(cx + Math.cos(ang) * R * 0.72), pz = Math.round(cz + Math.sin(ang) * R * 0.72); if (pz < z0 + 5) continue; petrified(c, px, pz, { rot: -ang + Math.PI / 2 + (c.r() - 0.5) }); }
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2 + 0.5; const px = Math.round(cx + Math.cos(ang) * R * 0.9), pz = Math.round(cz + Math.sin(ang) * R * 0.9); if (pz < z0 + 5 || !free(c, px, pz)) continue; k.pillar(px, pz, y, 4, B.stone_brick, B.mossy_brick); for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) k.d.add('ivy', px + 0.5 + fx * 0.52, y + 2, pz + 0.5 + fz * 0.52, { mode: 'wall', facing: [fx, fz], scale: 2, sway: 0.1 }); }
    const mirrors = [];
    for (let a = 0; a < 4; a++) { const ang = a / 4 * Math.PI * 2 + Math.PI / 4; const px = Math.round(cx + Math.cos(ang) * R * 0.45), pz = Math.round(cz + Math.sin(ang) * R * 0.45); if (place(c, px, pz, 'gazing_ball', { scale: 1.2 }, 1)) mirrors.push([px + 0.5, y, pz + 0.5]); }
    k.d.prop('birdbath', cx, y, cz, { scale: 1.3 }); collider(c, Math.floor(cx), Math.floor(cz), 1);
    for (let i = 0; i < 12; i++) { const a = c.r() * Math.PI * 2, d = c.r() * R * 0.8; place(c, Math.floor(cx + Math.cos(a) * d), Math.floor(cz + Math.sin(a) * d), 'gnome', { rot: c.r() * 6 }, 0); }
    for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2; lightAt(c, cx + Math.cos(ang) * R * 0.8, y + 3, cz + Math.sin(ang) * R * 0.8, 0xffb070, 3, 9); }
    gardenDecorate(c);
    for (const m of mirrors) c.slots.push({ type: 'mirror', pos: m });
    c.spawns.push([cx, y, z0 + 5]);
  },
};

// ------------------------------------------------ chapter 6: the Gateway Arch, St. Louis
// The stainless steel inside of the Arch: slit windows, a low roof that fades.
function archShell(c, h = 5) {
  const { k, x0, z0, x1, z1, y } = c;
  shell(c, { wall: B.steel_panel, trim: B.iron_plate, h, roof: B.steel_panel });
  for (let x = x0 + 2; x < x1 - 1; x += 2) for (const z of [z0, z1]) if (k.w.get(x, y + 2, z)) k.w.set(x, y + 2, z, B.steel_window);
  for (let z = z0 + 2; z < z1 - 1; z += 2) for (const x of [x0, x1]) if (k.w.get(x, y + 2, z)) k.w.set(x, y + 2, z, B.steel_window);
  for (let x = x0 + 4; x < x1 - 1; x += 6) for (let z = z0 + 4; z < z1 - 1; z += 6) lightAt(c, x + 0.5, y + h - 1, z + 0.5, 0xe8f0ff, 3.5, 9);
}
function riverBand(c, alongX, at, width = 4) {
  const { k, x0, z0, x1, z1, y } = c;
  for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) for (let s = 0; s < width; s++) {
    const x = alongX ? t : at + s, z = alongX ? at + s : t;
    if (doorAisle(c, x, z, 3)) { k.w.set(x, y - 1, z, B.planks); continue; }
    k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.water); k.w.set(x, y - 3, z, B.mud);
  }
}
// The top of the Arch: a long hall with a triangular cross-section (sloped steel
// walls with slit windows), running along the room's door axis, with sky either side.
// Doors that meet a long side get a catwalk and a gap. Returns the hall frame.
function archHall(c, { half = 5, hole = false } = {}) {
  const { k, x0, z0, x1, z1, y } = c; const W = k.w;
  const ew = c.doors.filter((d) => d.side === 'e' || d.side === 'w').length, ns = c.doors.length - ew;
  const alongX = ew > ns || (ew === ns && (x1 - x0) >= (z1 - z0));
  const mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
  const t0 = alongX ? x0 : z0, t1 = alongX ? x1 : z1;
  // wide enough for every doorway in the ends
  for (const d of c.doors) if (alongX ? (d.side === 'e' || d.side === 'w') : (d.side === 'n' || d.side === 's')) half = Math.max(half, Math.abs(d.at - mid) + 3);
  half = Math.min(half, Math.floor(((alongX ? z1 - z0 : x1 - x0)) / 2));
  const P = (t, sv) => alongX ? [t, mid + sv] : [mid + sv, t];
  const rows = [[half, 0, 1], [half - 1, 2, 3], [half - 2, 4, 4]];
  for (let t = t0; t <= t1; t++) for (let sv = -half; sv <= half; sv++) {
    const [x, z] = P(t, sv);
    for (let d = 1; d <= 3; d++) W.set(x, y - d, z, d === 1 ? (Math.abs(sv) <= 1 ? B.carpet_red : B.steel_panel) : B.iron_plate);
    const a = Math.abs(sv);
    for (const [rs, ya, yb] of rows) if (a === rs) for (let yy = y + ya; yy <= y + yb; yy++) W.set(x, yy, z, (yy === y + 1 || yy === y + 2) && t % 2 === 0 ? B.steel_window : B.steel_panel);
    if (a <= half - 3) W.set(x, y + 5, z, B.steel_panel);
    if (t === t0 || t === t1) for (let yy = y; yy <= y + 5; yy++) if (a <= half - (yy <= y + 1 ? 0 : yy <= y + 3 ? 1 : 2) && yy <= y + (a <= half - 3 ? 5 : 4)) W.set(x, yy, z, yy === y + 2 && a < half - 1 ? B.steel_window : B.steel_panel);
  }
  // doorways: the ends open where a door is; doors on the long sides get a catwalk
  for (const d of c.doors) {
    const endDoor = alongX ? (d.side === 'e' || d.side === 'w') : (d.side === 'n' || d.side === 's');
    if (endDoor) { const t = (d.side === 'e' || d.side === 's') ? t1 : t0; for (let o = -2; o <= 2; o++) for (let yy = y; yy < y + 4; yy++) { const [x, z] = P(t, d.at - mid + o); W.set(x, yy, z, 0); } continue; }
    const sgn = (d.side === 's' || d.side === 'e') ? 1 : -1;
    for (let sv = half; sv <= (alongX ? (sgn > 0 ? z1 - mid : mid - z0) : (sgn > 0 ? x1 - mid : mid - x0)); sv++) for (let o = -2; o <= 2; o++) {
      const [x, z] = P(d.at + o, sgn * sv);
      W.set(x, y - 1, z, B.iron_plate); W.set(x, y - 2, z, B.iron_plate);
      for (let yy = y; yy < y + 5; yy++) if (sv <= half) W.set(x, yy, z, 0);
      if (Math.abs(o) === 2 && sv > half) W.set(x, y, z, B.iron_plate);
    }
    for (let o = -2; o <= 2; o++) for (const [rs, ya, yb] of rows) for (let yy = y + ya; yy <= Math.min(y + 3, y + yb); yy++) { const [x, z] = P(d.at + o, sgn * rs); W.set(x, yy, z, 0); }
  }
  const [ax, az] = P(t0, -half), [bx, bz] = P(t1, half);
  const mn = [Math.min(ax, bx), y + 2, Math.min(az, bz)], mx = [Math.max(ax, bx), y + 5, Math.max(az, bz)];
  W.addRoof(mn, mx, [[mn[0], y, mn[2]], [mx[0], y + 4, mx[2]]]);
  for (let t = t0 + 3; t < t1 - 1; t += 5) { const [x, z] = P(t, 0); lightAt(c, x + 0.5, y + 4, z + 0.5, 0xe8f0ff, 3.5, 9); }
  // a mark under where people stand at the windows
  c.reserved = c.reserved ?? new Set();
  return { alongX, mid, t0, t1, P, half };
}
Object.assign(TEMPLATES, {
  // The visitor centre under the legs: ticket desk, rope lines, a tram car at its door.
  arch_lobby(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.polished, 6, B.concrete, 0.1);
    archShell(c, 6);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let x = cx - 3; x <= cx + 3; x++) if (free(c, x, z0 + 3) && !doorAisle(c, x, z0 + 3)) k.w.set(x, y, z0 + 3, B.steel_panel);
    sign(c, cx + 0.5, z0 + 1.2, 'GATEWAY ARCH\nTRAM TO THE TOP', { y: y + 2.4, w: 5, h: 1.3, bg: '#1a2a4a', fg: '#e8eef8', border: '#b8bec6', oneSided: true });
    for (let x = x0 + 3; x <= x1 - 3; x += 3) for (const z of [cz - 1, cz + 2]) if (c.r() < 0.6) place(c, x, z, 'fence', { len: 2, white: true, scale: 0.7 }, 0);
    for (let i = 0; i < 2; i++) { const [x, z] = cellIn(c, 3); place(c, x, z, 'tram_pod', { rot: c.r() * 0.3 }, 2); }
    for (const [x, z] of [[x0 + 2, z1 - 2], [x1 - 2, z1 - 2]]) place(c, x, z, 'bench', { rot: 0 }, 0);
    scatterBreakables(c, 3);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The tram shaft: steel stairs zig-zagging up past tram cars on their rail.
  tram_shaft(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.iron_plate, 6, B.steel_panel, 0.2);
    archShell(c, 7);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    // a raised landing in the middle, stairs up from two sides
    k.w.fill(cx - 3, y, cz - 2, cx + 3, y + 2, cz + 2, B.steel_panel);
    k.stairs(cx - 6, cz - 1, y, 3, [1, 0], 3, B.iron_plate); k.stairs(cx + 6, cz - 1, y, 3, [-1, 0], 3, B.iron_plate);
    k.d.prop('tram_pod', cx + 0.5, y + 3, cz + 0.5, { rot: Math.PI / 2 }); k.w.set(cx, y + 3, cz, B.barrier); k.w.set(cx, y + 4, cz, B.barrier);
    for (let z = z0 + 1; z < z1; z++) { if (doorAisle(c, x0 + 2, z, 3)) continue; k.w.set(x0 + 2, y - 1, z, B.rail); }
    for (let i = 0; i < 2; i++) { const z = z0 + 3 + i * 6; if (z < z1 - 2) place(c, x0 + 2, z, 'tram_pod', { rot: 0 }, 2); }
    scatterBreakables(c, 4);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
    c.features.push('ledges');
  },
  // The observation deck: the narrow triangular hall at the top of the Arch, slit
  // windows in its sloping steel walls, open sky either side.
  observation(c) {
    const { k, x0, z0, x1, z1, y } = c;
    const H = archHall(c);
    for (let i = 0; i < 4; i++) { const t = H.t0 + 3 + Math.floor(c.r() * (H.t1 - H.t0 - 6)); const [x, z] = H.P(t, c.r() < 0.5 ? -2 : 2); place(c, x, z, 'bench', { rot: H.alongX ? 0 : Math.PI / 2 }, 0); }
    for (let i = 0; i < 6; i++) { const [x, z] = H.P(H.t0 + 2 + c.r() * (H.t1 - H.t0 - 4), (c.r() - 0.5) * 6); k.d.add('shard', x, y, z, { mode: 'flat', scale: 0.8 }); }
    scatterBreakables({ ...c, x0: H.alongX ? x0 : H.mid - 3, x1: H.alongX ? x1 : H.mid + 3, z0: H.alongX ? H.mid - 3 : z0, z1: H.alongX ? H.mid + 3 : z1 }, 2);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The riverfront park below: the Mississippi, trees, benches, the Arch overhead.
  riverside(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6); patches(k, x0, z0, x1, z1, y, B.dirt, 0.06);
    const alongX = (x1 - x0) >= (z1 - z0);
    riverBand(c, alongX, alongX ? z1 - 5 : x1 - 5, 5);
    for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) { const x = alongX ? t : x1 - 6, z = alongX ? z1 - 6 : t; if (!doorAisle(c, x, z, 3)) k.w.set(x, y - 1, z, B.cobble); }
    for (let i = 0; i < 5; i++) { const [x, z] = cellIn(c, 3); if (free(c, x, z) && !doorAisle(c, x, z, 3) && (alongX ? z < z1 - 7 : x < x1 - 7)) oak(k, x, z, y, { h: 4 }); }
    for (let t = (alongX ? x0 : z0) + 3; t < (alongX ? x1 : z1) - 2; t += 6) { const x = alongX ? t : x1 - 7, z = alongX ? z1 - 7 : t; place(c, x, z, 'bench', { rot: alongX ? Math.PI : -Math.PI / 2 }, 0); }
    k.d.prop('arch_model', (x0 + x1) / 2 + 0.5, y, (alongX ? z0 + 2 : (z0 + z1) / 2) + 0.5, { span: 12, h: 16, rot: alongX ? 0 : Math.PI / 2 });
    k.d.prop('canoe', (alongX ? (x0 + x1) / 2 : x1 - 2.5) + 0.5, y - 1.3, (alongX ? z1 - 2.5 : (z0 + z1) / 2) + 0.5, { rot: alongX ? 0.1 : Math.PI / 2, color: 0xd8d8d8 });
    scatterOn(k, x0, z0, x1, z1, [B.grass], ['grass', 'flower_yellow', 'tall_grass'], 0.2);
    scatterOn(k, x0, z0, x1, z1, [B.water], ['reeds'], 0.03);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.arch = {
  // The plaza at the foot of the Arch, by the river.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.concrete, 6, B.grass, 0.05);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (Math.abs(x - cx) > 4 && (z < cz - 2 || z > cz + 4)) k.w.set(x, y - 1, z, B.grass);
    k.d.prop('arch_model', cx + 0.5, y, z0 + 2.5, { span: 14, h: 18 });
    k.w.set(cx - 7, y, z0 + 2, B.barrier); k.w.set(cx + 7, y, z0 + 2, B.barrier);
    sign(c, cx + 0.5, cz - 2.5, 'ST. LOUIS', { w: 3.4, h: 0.9, post: 1.6, bg: '#1a2a4a', fg: '#e8eef8', border: '#b8bec6' });
    for (const x of [x0 + 2, x1 - 2]) { k.d.prop('streetlight', x + 0.5, y, cz + 0.5, { rot: x < cx ? 0 : Math.PI }); lightAt(c, x + (x < cx ? 1.5 : -0.5), y + 4.8, cz + 0.5, 0xfff0d0, 4, 10); }
    for (const [x, z] of [[x0 + 3, z1 - 3], [x1 - 3, z1 - 3], [x0 + 3, z0 + 4], [x1 - 3, z0 + 4]]) oak(k, x, z, y, { h: 4 });
    scatterOn(k, x0, z0, x1, z1, [B.grass], ['grass', 'flower_yellow'], 0.2);
    k.w.set(cx, y - 1, cz + 3, B.gold_plate);
  },
  // The observation deck at the top of the Arch, one window blown out over the
  // Mississippi far below (slot 'river_leap': survive until you can jump).
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    const H = archHall(c, { half: 6 });
    const tm = (H.t0 + H.t1) >> 1;
    // the hole on the near (south / east) side, glass on the floor
    for (let t = tm - 3; t <= tm + 3; t++) for (let sv = H.half - 2; sv <= H.half; sv++) for (let yy = y; yy <= y + 4; yy++) { const [x, z] = H.P(t, sv); k.w.set(x, yy, z, 0); }
    for (let t = tm - 3; t <= tm + 3; t++) { const [x, z] = H.P(t, H.half); k.w.set(x, y - 1, z, B.iron_plate); }
    for (let i = 0; i < 12; i++) { const [x, z] = H.P(tm + (c.r() - 0.5) * 7, H.half - 1 - c.r() * 4); k.d.add('shard', x, y, z, { mode: 'flat', scale: 0.9 }); }
    // the river, a long way down
    for (let t = H.t0 - 4; t <= H.t1 + 4; t++) for (let sv = H.half + 1; sv <= H.half + 9; sv++) { const [x, z] = H.P(t, sv); k.w.set(x, 2, z, B.water); k.w.set(x, 1, z, B.water); k.w.set(x, 0, z, B.mud); }
    for (let t = H.t0 - 4; t <= H.t1 + 4; t++) { const [x, z] = H.P(t, H.half + 10); k.w.set(x, 2, z, B.grass); k.w.set(x, 1, z, B.dirt); }
    // benches and the tram doors at the ends
    for (const dt of [-6, 6]) { const [x, z] = H.P(tm + dt, -3); place(c, x, z, 'bench', { rot: H.alongX ? 0 : Math.PI / 2 }, 0); }
    for (const t of [H.t0 + 1, H.t1 - 1]) { const [x, z] = H.P(t, -3); if (free(c, x, z) && !doorAisle(c, x, z, 3)) { k.d.prop('tram_pod', x + 0.5, y, z + 0.5, { scale: 0.9, rot: H.alongX ? Math.PI / 2 : 0 }); collider(c, x, z, 2); } }
    const [hx, hz] = H.P(tm, H.half);
    const d0 = c.doors[0], farT = d0 && (d0.side === 'w' || d0.side === 'n') ? H.t1 - 4 : H.t0 + 4;
    const [fx, fz] = H.P(farT, -2);
    c.slots.push({ type: 'river_leap', pos: [hx + 0.5, y, hz + 0.5], dir: H.alongX ? [0, 1] : [1, 0], waterY: 3 });
    c.spawns.push([fx + 0.5, y, fz + 0.5]);
  },
};

// ------------------------------------------------ chapter 7: Waterland, Denver
function chainLink(c, h = 2) {
  const { k, x0, z0, x1, z1, y } = c;
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) if (!doorAisle(c, x, z, 3)) { for (let yy = 0; yy < h; yy++) k.d.add('chain_link', x + 0.5, y + yy + 0.5, z + 0.5, { mode: 'wall', facing: [0, z === z0 ? 1 : -1], scale: 1, sway: 0.05 }); k.w.fill(x, y, z, x, y + 1, z, B.barrier); }
  for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) if (!doorAisle(c, x, z, 3)) { for (let yy = 0; yy < h; yy++) k.d.add('chain_link', x + 0.5, y + yy + 0.5, z + 0.5, { mode: 'wall', facing: [x === x0 ? 1 : -1, 0], scale: 1, sway: 0.05 }); k.w.fill(x, y, z, x, y + 1, z, B.barrier); }
  for (let x = x0; x <= x1; x += 6) for (const z of [z0, z1]) if (!doorAisle(c, x, z, 3)) k.w.fill(x, y, z, x, y + h - 1, z, B.iron_plate);
  for (let z = z0; z <= z1; z += 6) for (const x of [x0, x1]) if (!doorAisle(c, x, z, 3)) k.w.fill(x, y, z, x, y + h - 1, z, B.iron_plate);
}
function parkDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1, y } = c;
  // sodium lamps still burning in the closed park
  for (let i = 0, n = 0; i < 6 && n < 2; i++) { const [x, z] = cellIn(c, 2); if (place(c, x, z, 'streetlight', { rot: c.r() * 6 }, 1)) { lightAt(c, x + 0.5, y + 4.6, z + 0.5, 0xffb060, 5, 12); n++; } }
  scatterOn(k, x0, z0, x1, z1, [B.concrete, B.pool_tile], ['leaf_litter', 'paper', 'road_crack', 'puddle'], 0.05 * amount, 1);
  scatterOn(k, x0, z0, x1, z1, [B.grass, B.dirt], ['dry_grass', 'tall_grass', 'grass'], 0.3 * amount);
}
// Sink a pool of tiles into the floor: depth deep, optional standing water.
function sunkPool(c, px0, pz0, px1, pz1, depth = 3, water = 0) {
  const { k, y } = c;
  for (let z = pz0; z <= pz1; z++) for (let x = px0; x <= px1; x++) {
    for (let d = 1; d <= depth; d++) k.w.set(x, y - d, z, d <= water ? B.water : 0);
    k.w.set(x, y - depth - 1, z, B.pool_tile);
    const edge = x === px0 || x === px1 || z === pz0 || z === pz1;
    if (edge) for (let d = 1; d <= depth; d++) if (!(d <= water)) { /* walls come from the floor around */ }
  }
  for (let z = pz0 - 1; z <= pz1 + 1; z++) for (let x = px0 - 1; x <= px1 + 1; x++) if (x < px0 || x > px1 || z < pz0 || z > pz1) { for (let d = 1; d <= depth + 1; d++) k.w.set(x, y - d, z, d === 1 ? B.white_trim : B.pool_tile); }
  // steps down at one end
  for (let d = 1; d < depth; d++) k.w.fill(px0, y - depth, pz0 + d - 1, px0 + 2, y - depth - 1 + (depth - d), pz0 + d - 1, B.pool_tile);
  // doorways keep a concrete walk across
  for (let z = pz0 - 1; z <= pz1 + 1; z++) for (let x = px0 - 1; x <= px1 + 1; x++) if (doorAisle(c, x, z, 2)) for (let d = 1; d <= depth + 1; d++) k.w.set(x, y - d, z, d === 1 ? B.concrete : B.pool_tile);
}
Object.assign(TEMPLATES, {
  // A drained wave pool: tiles, a deep end with a stagnant puddle, a diving board.
  dry_pool(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.concrete, 7, B.pool_tile, 0.05);
    chainLink(c);
    const px0 = x0 + 4, px1 = x1 - 4, pz0 = z0 + 4, pz1 = z1 - 4;
    {
      sunkPool(c, px0, pz0, px1, pz1, 3, 0);
      for (let x = px1 - 3; x <= px1; x++) for (let z = pz1 - 3; z <= pz1; z++) { k.w.set(x, y - 3, z, B.water); k.w.set(x, y - 4, z, B.pool_tile); }
      for (let i = 0; i < 4; i++) k.w.set(px1 + 1, y - 1, pz0 + 1 + i, B.planks);
      k.w.fill(px1 - 1, y, (pz0 + pz1) >> 1, px1 + 1, y, (pz0 + pz1) >> 1, B.planks);
      for (let i = 0; i < 3; i++) k.d.prop('deck_chair', (c.r() < 0.5 ? x0 + 2 : x1 - 2) + 0.5, y, z0 + 3 + c.r() * (z1 - z0 - 6), { rot: c.r() * 0.4, color: [0x2aa8a0, 0xf28c28, 0xd8322a][i] });
      scatterOn(k, px0, pz0, px1, pz1, [B.pool_tile], ['leaf_litter', 'paper'], 0.1, 0.9);
    }
    for (const [x, z] of [[x0 + 2, z0 + 2], [x1 - 2, z1 - 2]]) if (free(c, x, z)) { k.d.prop('streetlight', x + 0.5, y, z + 0.5, { rot: x < (x0 + x1) / 2 ? 0 : Math.PI }); lightAt(c, x + 0.5 + (x < (x0 + x1) / 2 ? 1 : -1), y + 4.8, z + 0.5, 0xd8e0ff, 4, 11); collider(c, x, z, 1); }
    parkDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The slide tower: a rusty scaffold with platforms and fibreglass slides spiralling down.
  slide_tower(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.concrete, 6, B.pool_tile, 0.08);
    chainLink(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    // the tower: 5x5 platform at y+4 on four legs, stairs up the west side
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) k.pillar(cx + dx, cz + dz, y, 4, B.rust_metal);
    k.w.fill(cx - 2, y + 3, cz - 2, cx + 2, y + 3, cz + 2, B.rust_metal);
    for (let x = cx - 2; x <= cx + 2; x++) for (const z of [cz - 2, cz + 2]) k.w.set(x, y + 4, z, B.iron_plate);
    k.w.set(cx - 2, y + 4, cz, 0); k.w.set(cx - 2, y + 4, cz - 1, 0); k.w.set(cx - 2, y + 4, cz + 1, 0);
    k.stairs(cx - 6, cz - 1, y, 4, [1, 0], 3, B.rust_metal);
    for (let x = cx - 6; x <= cx - 3; x++) for (let zz = cz - 1; zz <= cz + 1; zz++) for (let yy = y - 1; yy < y + (x - (cx - 6)); yy++) k.w.set(x, yy, zz, B.rust_metal);
    // two slides off the east side, stepping down
    for (const [dz, col] of [[-1, B.slide_glass], [1, B.slide_glass]]) {
      let x = cx + 3, z = cz + dz, h = 3;
      while (h > 0 && x < x1 - 1) { k.w.set(x, y + h - 1, z, col); for (let yy = y; yy < y + h - 1; yy++) if (!k.w.get(x, yy, z)) k.w.set(x, yy, z, B.barrier); x++; if (x % 2 === 0) h--; }
    }
    k.pond(x1 - 4, cz - 3, x1 - 2, cz + 3, y, B.water, 1, B.white_trim);
    k.d.prop('water_tower', x0 + 3.5, y, z0 + 3.5, { color: 0x6ac0e0 }); k.w.fill(x0 + 2, y, z0 + 2, x0 + 4, y + 4, z0 + 4, B.barrier);
    lightAt(c, cx + 0.5, y + 6, cz + 0.5, 0xd8e0ff, 5, 12);
    parkDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
    c.features.push('ledges');
  },
  // The dry lazy river: a winding tiled channel with stranded swan boats.
  lazy_river(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.concrete, 6);
    chainLink(c, 2);
    const alongX = (x1 - x0) >= (z1 - z0);
    const mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
    for (let t = (alongX ? x0 : z0) + 1; t < (alongX ? x1 : z1); t++) {
      const off = Math.round(Math.sin(t * 0.3) * 3);
      for (let s = -2; s <= 2; s++) {
        const x = alongX ? t : mid + off + s, z = alongX ? mid + off + s : t;
        if (doorAisle(c, x, z, 3)) continue;
        k.w.set(x, y - 1, z, Math.abs(s) === 2 ? B.white_trim : 0); if (Math.abs(s) < 2) { k.w.set(x, y - 2, z, B.pool_tile); if (c.r() < 0.12) k.w.set(x, y - 1, z, B.water); }
      }
    }
    for (let i = 0; i < 3; i++) { const t = (alongX ? x0 : z0) + 3 + Math.floor(c.r() * ((alongX ? x1 - x0 : z1 - z0) - 6)); const off = Math.round(Math.sin(t * 0.3) * 3); k.d.prop('swan_boat', (alongX ? t : mid + off) + 0.5, y - 1, (alongX ? mid + off : t) + 0.5, { rot: (alongX ? 0 : Math.PI / 2) + (c.r() - 0.5), rust: true, scale: 0.8 }); }
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); if (Math.abs((alongX ? z : x) - mid) > 5) place(c, x, z, 'palm', { h: 4 + Math.floor(c.r() * 2) }, 2); }
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); if (Math.abs((alongX ? z : x) - mid) > 5) place(c, x, z, 'umbrella', { color: [0xf28c28, 0x2aa8a0, 0xd8322a][i] }, 0); }
    parkDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.waterland = {
  // The gates: a ticket booth, turnstiles and the sign — closed for the season.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.concrete, 6, B.pool_tile, 0.04);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    sign(c, cx + 0.5, z0 + 2.5, 'WATERLAND', { w: 6, h: 1.4, post: 3, bg: '#2aa8a0', fg: '#fff2a0', border: '#f28c28' });
    sign(c, cx + 3.5, cz + 1.5, 'CLOSED\nFOR THE SEASON', { w: 1.8, h: 0.9, post: 1.0, bg: '#f2efe6', fg: '#c4302a', border: '#c4302a', rot: -0.3 });
    for (let x = x0 + 1; x < x1; x++) if (Math.abs(x - cx) > 3) { k.d.add('chain_link', x + 0.5, y + 0.5, z0 + 4.5, { mode: 'wall', facing: [0, 1], scale: 1 }); k.d.add('chain_link', x + 0.5, y + 1.5, z0 + 4.5, { mode: 'wall', facing: [0, 1], scale: 1 }); k.w.fill(x, y, z0 + 4, x, y + 1, z0 + 4, B.barrier); }
    k.room(cx - 7, cz - 1, cx - 4, cz + 2, y, 3, B.teal_panel, { trim: B.white_trim }); k.w.set(cx - 4, y + 1, cz, B.window); k.w.fill(cx - 7, y + 3, cz - 1, cx - 4, y + 3, cz + 2, B.roof_terracotta);
    k.d.prop('water_tower', x1 - 3.5, y, z1 - 3.5, { color: 0x6ac0e0 }); k.w.fill(x1 - 5, y, z1 - 5, x1 - 2, y + 4, z1 - 2, B.barrier);
    for (const x of [x0 + 2, x1 - 2]) { k.d.prop('palm', x + 0.5, y, cz + 0.5, { h: 5 }); collider(c, x, cz, 2); }
    lightAt(c, cx + 0.5, y + 4, z0 + 3.5, 0xffe0a0, 4, 10);
    parkDecorate(c);
    k.w.set(cx, y - 1, cz + 3, B.gold_plate);
  },
  // The Tunnel of Love: a pool you can wade in, swan boats, the heart-arched tunnel and
  // Ares's shield waiting on a boat (slots 'tunnel', 'shield', 'pool').
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.concrete, 8, B.pool_tile, 0.06);
    const { cx, cz, R } = roundArena(c);
    const px0 = Math.round(cx - R * 0.55), px1 = Math.round(cx + R * 0.55), pz0 = Math.round(cz - R * 0.35), pz1 = Math.round(cz + R * 0.45);
    for (let z = pz0; z <= pz1; z++) for (let x = px0; x <= px1; x++) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.pool_tile); }
    for (let z = pz0 - 1; z <= pz1 + 1; z++) for (const x of [px0 - 1, px1 + 1]) k.w.set(x, y - 1, z, B.white_trim);
    for (let x = px0 - 1; x <= px1 + 1; x++) for (const z of [pz0 - 1, pz1 + 1]) k.w.set(x, y - 1, z, B.white_trim);
    // the tunnel: a red archway over the water on the far side
    const tz0 = Math.round(z0 + 2), tz1 = pz0 - 1;
    for (let x = Math.round(cx) - 4; x <= Math.round(cx) + 4; x++) for (let z = tz0; z <= tz1; z++) {
      const wall = Math.abs(x - cx + 0.5) >= 3.5;
      if (k.w.get(x, y - 1, z)) { if (!wall) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.pool_tile); } for (let yy = y; yy < y + 4; yy++) if (wall) k.w.set(x, yy, z, B.red_plank); k.w.set(x, y + 4, z, B.roof_terracotta); }
    }
    k.w.addRoof([Math.round(cx) - 4, y + 4, tz0], [Math.round(cx) + 4, y + 4, tz1], [[Math.round(cx) - 3, y, tz0], [Math.round(cx) + 3, y + 3, tz1]]);
    k.d.add('heart', cx + 0.5, y + 5, tz1 + 1.05, { mode: 'wall', facing: [0, 1], scale: 3, emit: 2.2, sway: 0 });
    lightAt(c, cx + 0.5, y + 4, tz1 + 1.5, 0xff4a8a, 5, 10);
    sign(c, cx + 0.5, tz1 + 1.06, 'TUNNEL OF LOVE', { y: y + 6.4, w: 4.4, h: 0.8, bg: '#3a0a1a', fg: '#ff7ab0', glow: true, oneSided: true });
    // swan boats on the water, one with the shield
    const boats = [[cx - 3, cz], [cx + 3.5, cz + 1.5], [cx, cz + 3]];
    boats.forEach(([bx, bz], i) => k.d.prop('swan_boat', bx + 0.5, y - 0.75, bz + 0.5, { rot: i * 1.3 + 0.3, rust: true }));
    k.d.prop('round_shield', cx - 2.5, y + 0.4, cz + 0.5, { rot: 1.2 });
    chainLink({ ...c, x0: x0 + 1, z0: z0 + 1, x1: x1 - 1, z1: z1 - 1 }, 2);
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2 + 0.3; lightAt(c, cx + Math.cos(ang) * R * 0.8, y + 3, cz + Math.sin(ang) * R * 0.8, a % 2 ? 0xff7ab0 : 0xd8e0ff, 3, 9); }
    parkDecorate(c);
    c.slots.push({ type: 'tunnel', pos: [cx + 0.5, y, tz1] }, { type: 'shield', pos: [cx - 2.5, y, cz + 0.5] }, { type: 'pool', min: [px0, z0, pz0], max: [px1, y, pz1] });
    c.spawns.push([cx, y, pz1 + 2]);
  },
};

// ------------------------------------------------ chapter 8: the Lotus Hotel and Casino
function lotusShell(c, h = 5) {
  const { k, x0, z0, x1, z1, y } = c;
  shell(c, { wall: B.lotus_panel, alt: B.gold_plate, altP: 0.08, trim: B.gold_plate, h, roof: B.lotus_panel });
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) if (k.w.get(x, y + 3, z) && x % 4 === 0) k.w.set(x, y + 3, z, (x >> 2) % 2 ? B.neon_green : B.neon_pink);
  for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) if (k.w.get(x, y + 3, z) && z % 4 === 0) k.w.set(x, y + 3, z, (z >> 2) % 2 ? B.neon_green : B.neon_pink);
  for (let x = x0 + 4; x < x1 - 1; x += 6) for (let z = z0 + 4; z < z1 - 1; z += 6) { k.d.prop('chandelier', x + 0.5, y + h, z + 0.5); lightAt(c, x + 0.5, y + h - 1.6, z + 0.5, 0xffe0b0, 4, 10); }
}
function casinoDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.casino_carpet, B.carpet_red], ['chips', 'paper'], 0.03 * amount, 0.8);
}
Object.assign(TEMPLATES, {
  // Rows of slot machines, all paying out, all the time.
  slot_floor(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.casino_carpet, 6);
    lotusShell(c);
    for (let z = z0 + 3; z <= z1 - 3; z += 4) for (let x = x0 + 3; x <= x1 - 3; x++) { if ((x - x0) % 6 === 0) continue; place(c, x, z, 'slot', { rot: 0, scale: 1.25, color: [0xff4a8a, 0x4ad8ff, 0xffd84a, 0x4affa0][(x + z) % 4] }, 2); }
    for (let i = 0; i < 2; i++) { const [x, z] = cellIn(c, 3); if (free(c, x, z)) k.pillar(x, z, y, 5, B.gold_plate, B.neon_pink); }
    casinoDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // Card tables and a long bar where the drinks never stop coming.
  card_room(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.casino_carpet, 6, B.carpet_red, 0.08);
    lotusShell(c);
    for (let x = x0 + 3; x <= x1 - 3; x++) if (!doorAisle(c, x, z0 + 2, 3) && free(c, x, z0 + 2)) k.w.set(x, y, z0 + 2, B.gold_plate);
    for (let x = x0 + 4; x <= x1 - 4; x += 5) k.d.add('lotus', x + 0.5, y + 1, z0 + 2.5, { scale: 0.9 });
    for (let x = x0 + 4; x <= x1 - 3; x += 5) for (let z = z0 + 6; z <= z1 - 3; z += 5) placeWide(c, x, z, x + 1, z, 'card_table', { rot: 0 }, 1);
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); placeWide(c, x, z, x + 1, z, 'couch', { color: [0x6a1a3a, 0x1e6a5a, 0x3a1a6a][i] }, 1); }
    casinoDecorate(c, 1.3);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The arcade: cabinets, a light-up dance floor, a bungee-jump simulator.
  arcade(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.casino_carpet, 6);
    lotusShell(c);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) k.w.set(x, y - 1, z, (x + z) % 2 ? B.neon_pink : B.neon_green);
    for (let x = x0 + 2; x <= x1 - 2; x += 2) for (const z of [z0 + 2, z1 - 2]) place(c, x, z, 'arcade', { rot: z === z0 + 2 ? 0 : Math.PI, color: [0x2a2a6a, 0x6a1a3a, 0x1a4a3a][x % 3], screen: [0x4ad8ff, 0xff5fb0, 0x4affa0, 0xffd84a][(x >> 1) % 4] }, 2);
    for (let z = z0 + 5; z <= z1 - 5; z += 3) for (const x of [x0 + 2, x1 - 2]) place(c, x, z, 'arcade', { rot: x === x0 + 2 ? Math.PI / 2 : -Math.PI / 2, screen: [0x4ad8ff, 0xff5fb0][z % 2] }, 2);
    casinoDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The pool party: an indoor pool with a slide, palms and loungers, under the dome.
  pool_party(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.pool_tile, 6, B.marble_floor, 0.3);
    lotusShell(c, 6);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    let ok = true; for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 4; x <= cx + 4; x++) if (doorAisle(c, x, z, 3)) ok = false;
    if (ok) {
      k.pond(cx - 4, cz - 3, cx + 4, cz + 3, y, B.water, 2, B.gold_plate);
      for (let i = 0; i < 4; i++) k.w.set(cx + 5, y + 3 - i, cz - 3 + i, B.slide_glass);
      k.w.fill(cx + 5, y, cz - 3, cx + 5, y + 2, cz - 3, B.gold_plate);
      for (let i = 0; i < 5; i++) k.d.add('lotus', cx - 3 + c.r() * 7, y - 1, cz - 2 + c.r() * 5, { mode: 'flat', scale: 0.8 });
    }
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'palm', { h: 5 }, 2); }
    for (let i = 0; i < 5; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'deck_chair', { rot: c.r() * 6, color: [0xff5fb0, 0x4affa0, 0xffd84a][i % 3] }, 0); }
    k.s.add({ x: cx + 0.5, y: y + 12, z: cz - 2 }, { x: 0.2, y: -1, z: 0.4 }, 13, 4, 0xffe0f0);
    casinoDecorate(c, 0.5);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.casino = {
  // The lobby: reception, a lotus fountain, bellhops with trays of lotus cookies.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.marble_floor, 6, B.casino_carpet, 0.0);
    lotusShell(c, 7);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let z = z0 + 1; z < z1; z++) for (let x = cx - 1; x <= cx + 1; x++) k.w.set(x, y - 1, z, B.carpet_red);
    k.w.fill(cx - 4, y, z0 + 2, cx + 4, y, z0 + 2, B.gold_plate);
    sign(c, cx + 0.5, z0 + 1.1, 'LOTUS\nHOTEL & CASINO', { y: y + 2.2, w: 6, h: 1.8, bg: '#0a3a2a', fg: '#4affa0', border: '#d6aa4a', glow: true, oneSided: true });
    k.pond(cx - 2, cz - 2, cx + 2, cz + 1, y, B.water, 1, B.gold_plate);
    for (let i = 0; i < 5; i++) k.d.add('lotus', cx - 1.5 + c.r() * 4, y - 1, cz - 1.5 + c.r() * 3, { mode: 'flat', scale: 0.9 });
    k.d.add('lotus', cx + 0.5, y, cz - 0.5, { scale: 1.6, emit: 0.8 });
    for (const x of [x0 + 2, x1 - 2]) for (const z of [cz - 2, cz + 3]) { k.d.prop('palm', x + 0.5, y, z + 0.5, { h: 5 }); collider(c, x, z, 2); }
    k.w.set(cx, y - 1, cz + 3, B.gold_plate);
  },
  // The grand atrium with the clock that runs too fast and the doors out (slots 'clock', 'exit').
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.casino_carpet, 8);
    const { cx, cz, R } = roundArena(c);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (d < 4) k.w.set(x, y - 1, z, d < 2.5 ? B.gold_plate : B.marble_floor); else if (d > R - 0.6 && d <= R + 0.6) { for (let yy = y; yy < y + 6; yy++) k.w.set(x, yy, z, yy === y + 3 && (x + z) % 4 === 0 ? ((x + z) % 8 ? B.neon_green : B.neon_pink) : yy === y + 5 ? B.gold_plate : B.lotus_panel); } }
    // the clock on the far wall and the exit doors beneath it
    k.d.prop('clock', cx, y + 5, z0 + 1.6, { scale: 1.2 });
    for (let x = Math.round(cx) - 2; x <= Math.round(cx) + 1; x++) for (let yy = y; yy < y + 3; yy++) k.w.set(x, yy, z0 + 1, B.elevator_door);
    sign(c, cx, z0 + 2.06, 'EXIT', { y: y + 3.1, w: 1.6, h: 0.5, bg: '#2a0a0a', fg: '#ff4a4a', glow: true, oneSided: true });
    for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2; const px = Math.round(cx + Math.cos(ang) * R * 0.6), pz = Math.round(cz + Math.sin(ang) * R * 0.6); if (a % 2) place(c, px, pz, 'slot', { rot: -ang - Math.PI / 2, color: 0xff4a8a }, 2); else if (free(c, px, pz)) k.pillar(px, pz, y, 6, B.gold_plate, B.neon_pink); }
    for (let a = 0; a < 4; a++) { const ang = a / 4 * Math.PI * 2 + 0.4; k.d.prop('chandelier', cx + Math.cos(ang) * 5, y + 6, cz + Math.sin(ang) * 5, { scale: 1.4 }); lightAt(c, cx + Math.cos(ang) * 5, y + 5, cz + Math.sin(ang) * 5, 0xffe0b0, 4, 11); }
    k.d.add('lotus', cx, y, cz, { scale: 2.4, emit: 1 });
    casinoDecorate(c, 1.5);
    c.slots.push({ type: 'clock', pos: [cx, y + 5, z0 + 1.6] }, { type: 'exit', pos: [cx, y, z0 + 2.5] });
    c.spawns.push([cx, y, cz]);
  },
};

// ------------------------------------------------ chapter 9: the Nevada desert, Crusty's Water Bed Palace
function desertDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.desert_sand, B.sand], ['dry_grass', 'dry_grass', 'bone', 'road_crack'], 0.08 * amount, 0.9);
}
function mesa(k, x, z, y, R, h) {
  for (let dz = -Math.ceil(R); dz <= Math.ceil(R); dz++) for (let dx = -Math.ceil(R); dx <= Math.ceil(R); dx++) {
    const d = Math.hypot(dx, dz) + Math.sin(dx * 1.3 + dz) * 0.4; if (d > R) continue;
    const hh = Math.max(1, Math.round(h * (1 - Math.max(0, d - R * 0.6) / (R * 0.5))));
    for (let i = 0; i < hh; i++) k.w.set(x + dx, y + i, z + dz, B.red_rock);
  }
}
// A water-bed showroom: carpet, gold, mirrors, beds in rows.
function showroomShell(c, h = 6) {
  const { k, x0, z0, x1, z1, y } = c;
  shell(c, { wall: B.pink_plaster, alt: B.gold_plate, altP: 0.1, trim: B.gold_plate, h, roof: B.white_trim });
  for (let x = x0 + 2; x < x1 - 1; x += 3) for (const z of [z0, z1]) if (k.w.get(x, y + 2, z)) { k.w.set(x, y + 1, z, B.glass); k.w.set(x, y + 2, z, B.glass); }
  for (let x = x0 + 4; x < x1 - 1; x += 6) for (let z = z0 + 4; z < z1 - 1; z += 6) { k.d.prop('chandelier', x + 0.5, y + h, z + 0.5); lightAt(c, x + 0.5, y + h - 1.6, z + 0.5, 0xffd8b0, 4, 10); }
}
Object.assign(TEMPLATES, {
  // Dunes of orange sand, cacti, bleached bones.
  dunes(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.desert_sand, 6, B.sand, 0.15);
    for (let z = z0 + 2; z <= z1 - 2; z++) for (let x = x0 + 2; x <= x1 - 2; x++) {
      if (doorAisle(c, x, z, 3)) continue;
      const h = Math.round(Math.max(0, Math.sin(x * 0.35 + z * 0.12) * 1.3 + Math.cos(z * 0.3 - x * 0.1) * 0.8 - 0.4));
      for (let i = 0; i < h; i++) k.w.set(x, y + i, z, B.desert_sand);
    }
    for (let i = 0; i < 7; i++) { const [x, z] = cellIn(c, 2); const gy = k.w.groundBelow(x + 0.5, z + 0.5, y + 4); if (free({ ...c, y: gy }, x, z) && !doorAisle(c, x, z)) { k.d.prop('cactus', x + 0.5, gy, z + 0.5, { h: 1.6 + c.r() * 1.4, rot: c.r() * 6 }); k.w.set(x, gy, z, B.barrier); } }
    for (let i = 0; i < 2; i++) { const [x, z] = cellIn(c, 4); if (free(c, x, z) && !doorAisle(c, x, z, 3)) boulder(k, x, z, y, 1.2, B.red_rock); }
    desertDecorate(c, 1.4);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // A red-rock canyon: mesas, ledges, a narrow way between.
  canyon(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.desert_sand, 6, B.red_rock, 0.08);
    for (let i = 0, n = 0; i < 12 && n < 4; i++) { const [x, z] = cellIn(c, 4); let ok = true; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (doorAisle(c, x + dx, z + dz, 2)) ok = false; if (ok) { mesa(k, x, z, y, 1.8 + c.r() * 1.4, 2 + Math.floor(c.r() * 4)); n++; } }
    { const x = x0 + 3, z = z0 + 3; let ok = true; for (let dz = 0; dz < 4; dz++) for (let dx = 0; dx < 4; dx++) if (doorAisle(c, x + dx, z + dz, 3)) ok = false; if (ok) { k.w.fill(x, y, z, x + 3, y + 2, z + 3, B.red_rock); k.stairs(x + 4, z + 1, y, 3, [-1, 0], 2, B.red_rock); } }
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'cactus', { h: 1.8 + c.r(), rot: c.r() * 6 }, 1); }
    desertDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
    c.features.push('ledges');
  },
  // The desert highway: a broken-down car, telephone poles, Crusty's billboard.
  desert_road(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.desert_sand, 6, B.sand, 0.2);
    const alongX = roadAlongX(c), mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
    roadBand(c, alongX, mid, 2, { shoulder: B.sand });
    for (let t = (alongX ? x0 : z0) + 2; t < (alongX ? x1 : z1); t += 7) { const x = alongX ? t : mid - 5, z = alongX ? mid - 5 : t; if (free(c, x, z)) { k.pillar(x, z, y, 6, B.pine_log); k.w.set(x + (alongX ? 0 : 0), y + 5, z, B.dark_planks); } }
    { const t = (alongX ? x0 + x1 : z0 + z1) / 2, x = alongX ? t : mid + 2, z = alongX ? mid + 2 : t; k.d.prop('car', x + 0.5, y, z + 0.5, { rot: alongX ? 0.1 : Math.PI / 2 + 0.1, color: 0xb8862a }); for (let a = -1; a <= 1; a++) collider(c, Math.floor(x) + (alongX ? a : 0), Math.floor(z) + (alongX ? 0 : a), 1); k.d.prop('fire', x + 0.5 + (alongX ? 1.6 : 0), y + 0.6, z + 0.5 + (alongX ? 0 : 1.6), { scale: 0.3, smoke: true }); }
    sign(c, (alongX ? (x0 + x1) / 2 - 3 : mid + 6) + 0.5, (alongX ? mid + 6 : (z0 + z1) / 2 - 3) + 0.5, 'CRUSTY’S\nWATER BED PALACE\nNEXT EXIT', { w: 4.2, h: 2, post: 2.6, bg: '#f2efe6', fg: '#c4302a', border: '#2ab0c8', rot: alongX ? 0 : Math.PI / 2 });
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); if (Math.abs((alongX ? z : x) - mid) > 4) place(c, x, z, 'cactus', { h: 1.6 + c.r() * 1.2, rot: c.r() * 6 }, 1); }
    desertDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // Inside the showroom: rows of water beds (a few with straps already on them).
  bed_showroom(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.carpet_red, 6, B.casino_carpet, 0.05);
    showroomShell(c);
    for (let x = x0 + 3; x <= x1 - 4; x += 4) for (let z = z0 + 3; z <= z1 - 5; z += 5) placeWide(c, x, z, x + 1, z + 2, 'waterbed', { blue: c.r() < 0.4, swan: c.r() < 0.15, straps: c.r() < 0.3, rot: 0 }, 1);
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'palm', { h: 3, scale: 0.8 }, 2); }
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.desert = {
  // The desert road outside the showroom, under its neon sign.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.desert_sand, 6, B.sand, 0.2);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    roadBand(c, true, cz + 3, 2, { shoulder: B.sand });
    // the neon frame and sign on two poles
    for (const dx of [-4, 4]) k.pillar(cx + dx, z0 + 3, y, 5, B.iron_plate);
    for (let x = cx - 4; x <= cx + 4; x++) for (const yy of [y + 5, y + 8]) k.w.set(x, yy, z0 + 3, B.neon_bulbs);
    for (const dx of [-4, 4]) for (let yy = y + 5; yy <= y + 8; yy++) k.w.set(cx + dx, yy, z0 + 3, B.neon_bulbs);
    sign(c, cx + 0.5, z0 + 3.6, 'CRUSTY’S\nWATER BED PALACE', { y: y + 5.6, w: 7.2, h: 2.2, bg: '#1a0a2a', fg: '#ff7ab0', glow: true, border: '#2ab0c8', oneSided: true });
    for (const [x, z] of [[x0 + 3, z1 - 3], [x1 - 3, z1 - 2], [x0 + 2, cz - 2], [x1 - 2, cz - 3]]) { k.d.prop('cactus', x + 0.5, y, z + 0.5, { h: 2.2, rot: x }); k.w.set(x, y, z, B.barrier); }
    k.d.prop('car', cx - 4.5, y, cz - 1.5, { rot: 0.2, color: 0x2a4a7a }); k.w.fill(cx - 6, y, cz - 2, cx - 3, y, cz - 1, B.barrier);
    desertDecorate(c);
    k.w.set(cx, y - 1, cz + 1, B.gold_plate);
  },
  // Crusty's showroom: plush carpet, gold columns, beds round the walls and his best bed in
  // the middle (slots 'bed' and 'main_bed': make him lie on his own bed).
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.carpet_red, 8);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    showroomShell(c, 7);
    for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 1; x < x1; x++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < 4.5) k.w.set(x, y - 1, z, B.casino_carpet);
    for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7], [0, -9], [-9, 0], [9, 0]]) { const px = Math.round(cx + dx), pz = Math.round(cz + dz); if (free(c, px, pz) && !doorAisle(c, px, pz, 3)) column(k, px, pz, y, 7, { shaft: B.gold_plate, cap: B.gold_plate, base: B.gold_plate }); }
    const beds = [];
    for (const [dx, dz, swan, blue] of [[-6, -3, false, true], [5, -3, true, false], [-6, 3, false, false], [5, 3, false, true]]) { const bx = Math.round(cx + dx), bz = Math.round(cz + dz); if (placeWide(c, bx, bz - 1, bx + 1, bz + 1, 'waterbed', { swan, blue, straps: true }, 1)) beds.push([bx + 1, y, bz + 0.5]); }
    const mx = Math.round(cx) - 1, mz = Math.round(cz) - 7;
    if (placeWide(c, mx, mz, mx + 1, mz + 2, 'waterbed', { swan: true, straps: true, scale: 1.25 }, 1)) c.slots.push({ type: 'main_bed', pos: [mx + 1, y, mz + 1.5] });
    sign(c, cx, z0 + 1.1, 'CRUSTY’S', { y: y + 4.2, w: 4, h: 1, bg: '#1a0a2a', fg: '#ff7ab0', glow: true, border: '#2ab0c8', oneSided: true });
    lightAt(c, cx, y + 4, z0 + 2, 0xff7ab0, 4, 10);
    for (const b of beds) c.slots.push({ type: 'bed', pos: b });
    c.spawns.push([cx, y, cz - 2]);
  },
};

// ------------------------------------------------ chapter 10: DOA Recording Studios and the Underworld
function underDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.underworld_rock, B.basalt, B.obsidian], ['skull', 'bone', 'bone'], 0.05 * amount, 0.8);
  scatterOn(k, x0, z0, x1, z1, [B.asphodel], ['asphodel', 'asphodel', 'dry_grass'], 0.3 * amount, 0.9);
}
function stalagmite(k, x, z, y, h) { for (let i = 0; i < h; i++) { k.w.set(x, y + i, z, i > h - 2 ? B.basalt : B.underworld_rock); if (i < h / 3) for (const [dx, dz] of [[1, 0], [0, 1]]) k.w.set(x + dx, y + i, z + dz, B.underworld_rock); } }
function greenBrazier(c, x, z) { if (!free(c, x, z)) return false; c.k.d.prop('brazier', x + 0.5, c.y, z + 0.5, { green: true }); collider(c, x, z, 1); lightAt(c, x + 0.5, c.y + 1.8, z + 0.5, 0x5aff8a, 4, 10); return true; }
// black poplars: dark spires
function poplar(k, x, z, y) { pine(k, x, z, y, { h: 7 + Math.floor(k.r() * 4), trunk: B.obsidian, leaves: B.basalt, R: 1.6 }); }
Object.assign(TEMPLATES, {
  // The black shore of the Styx: the river across the room, Charon's ferry, a stone jetty.
  styx_shore(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.underworld_rock, 6, B.obsidian, 0.12);
    const alongX = !roadAlongX(c), mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
    for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) { const off = Math.round(Math.sin(t * 0.25) * 1.5); for (let s = -3; s <= 3; s++) { const x = alongX ? t : mid + off + s, z = alongX ? mid + off + s : t; if (doorAisle(c, x, z, 3)) continue; if (Math.abs(s) <= 2) { k.w.set(x, y - 1, z, B.styx); k.w.set(x, y - 2, z, B.styx); k.w.set(x, y - 3, z, B.obsidian); } else k.w.set(x, y - 1, z, B.basalt); } }
    // a stone causeway across
    { const t = alongX ? ((x0 + x1) >> 1) : ((z0 + z1) >> 1); for (let s = -4; s <= 4; s++) for (let w = -1; w <= 1; w++) { const off = Math.round(Math.sin((t + w) * 0.25) * 1.5); const x = alongX ? t + w : mid + off + s, z = alongX ? mid + off + s : t + w; k.w.set(x, y - 1, z, B.stone_brick); } }
    k.d.prop('ferry', (alongX ? x0 + 5 : mid) + 0.5, y - 1, (alongX ? mid : z0 + 5) + 0.5, { rot: alongX ? 0.1 : Math.PI / 2 + 0.1 });
    lightAt(c, (alongX ? x0 + 3 : mid) + 0.5, y + 2, (alongX ? mid : z0 + 3) + 0.5, 0x5aff8a, 4, 9);
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); if (Math.abs((alongX ? z : x) - mid) > 5) greenBrazier(c, x, z); }
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); if (Math.abs((alongX ? z : x) - mid) > 5 && free(c, x, z) && !doorAisle(c, x, z, 3)) stalagmite(k, x, z, y, 3 + Math.floor(c.r() * 3)); }
    underDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The Fields of Asphodel: grey grass, black poplars, the dead drifting about.
  asphodel(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.asphodel, 6, B.underworld_rock, 0.06);
    for (let i = 0; i < 5; i++) { const [x, z] = cellIn(c, 3); if (free(c, x, z) && !doorAisle(c, x, z, 3)) poplar(k, x, z, y); }
    for (let i = 0; i < 8; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'ghost', { rot: c.r() * 6, scale: 0.9 + c.r() * 0.3 }, 0); }
    for (let i = 0; i < 2; i++) { const [x, z] = cellIn(c, 3); greenBrazier(c, x, z); }
    underDecorate(c, 1.2);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // A cavern: stalagmites, bone piles, a rift that glows.
  cavern(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.underworld_rock, 6, B.basalt, 0.2);
    edgeWalls({ ...c, b: { ...c.b, wall: B.underworld_rock, wall2: B.obsidian, trim: B.basalt } }, 4, true);
    for (let i = 0; i < 7; i++) { const [x, z] = cellIn(c, 2); if (free(c, x, z) && !doorAisle(c, x, z, 3)) stalagmite(k, x, z, y, 2 + Math.floor(c.r() * 5)); }
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    let ok = true; for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) if (doorAisle(c, x, z, 3)) ok = false;
    if (ok) k.pond(cx - 1, cz - 1, cx + 1, cz + 1, y, B.styx, 1, B.obsidian);
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); if (free(c, x, z)) { k.w.set(x, y, z, B.bone_block); if (c.r() < 0.5 && free(c, x + 1, z)) k.w.set(x + 1, y, z, B.bone_block); } }
    underDecorate(c, 1.3);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.underworld = {
  // DOA Recording Studios: black marble, gold, sofas full of the waiting dead, Charon's desk.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.black_marble, 6);
    shell(c, { wall: B.black_marble, trim: B.gold_plate, h: 6, roof: B.black_marble });
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) if (k.w.get(x, y + 4, z)) k.w.set(x, y + 4, z, B.gold_plate);
    for (let x = cx - 3; x <= cx + 3; x++) k.w.set(x, y, z0 + 3, B.black_marble);
    k.w.set(cx - 3, y, z0 + 2, B.black_marble); k.w.set(cx + 3, y, z0 + 2, B.black_marble);
    for (let x = cx - 1; x <= cx + 1; x++) for (let yy = y; yy < y + 3; yy++) k.w.set(x, yy, z0, B.elevator_door);
    sign(c, cx + 0.5, z0 + 1.1, 'DOA\nRECORDING STUDIOS', { y: y + 3.2, w: 5, h: 1.4, bg: '#0a0a0e', fg: '#e8c870', border: '#c9963a', oneSided: true });
    for (const [x, z, r] of [[x0 + 3, cz, Math.PI / 2], [x1 - 3, cz, -Math.PI / 2], [x0 + 3, cz + 4, Math.PI / 2], [x1 - 3, cz + 4, -Math.PI / 2]]) { k.d.prop('couch', x + 0.5, y, z + 0.5, { rot: r, color: 0x2a2a30 }); k.w.fill(x, y, z - 1, x, y, z + 1, B.barrier); k.d.prop('ghost', x + 0.5, y + 0.4, z + 0.5, { rot: r, scale: 0.8 }); }
    for (let x = x0 + 3; x < x1 - 2; x += 5) { k.d.prop('chandelier', x + 0.5, y + 6, cz + 0.5); lightAt(c, x + 0.5, y + 4.4, cz + 0.5, 0xe8d8b0, 3.5, 9); }
    for (const x of [x0 + 2, x1 - 2]) { k.d.prop('palm', x + 0.5, y, z0 + 2.5, { h: 3, scale: 0.8 }); k.w.set(x, y, z0 + 2, B.barrier); }
    k.w.set(cx, y - 1, cz + 3, B.gold_plate);
  },
  // Before the gates of Erebus: a great iron gate, green fires, the queue of the dead
  // (slots 'gate' and 'ball': Cerberus would rather play fetch).
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.underworld_rock, 8, B.obsidian, 0.15);
    const { cx, cz, R } = roundArena(c, 0.8);
    // the gate in a wall of black rock across the far side
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z0 + 2; z++) if (k.w.get(x, y - 1, z)) for (let yy = y; yy < y + 9; yy++) k.w.set(x, yy, z, Math.abs(x + 0.5 - cx) < 4 && z === z0 + 2 ? 0 : B.underworld_rock);
    for (let x = Math.round(cx) - 4; x <= Math.round(cx) + 3; x++) for (let yy = y; yy < y + 7; yy++) for (let z = z0; z <= z0 + 1; z++) k.w.set(x, yy, z, B.barrier);
    k.d.prop('iron_gate', cx, y, z0 + 1.5, { w: 7, h: 6, skulls: true });
    lightAt(c, cx, y + 5, z0 + 3, 0x5aff8a, 9, 18);
    for (const dx of [-4.3, 4.3]) { k.d.prop('fire', cx + dx, y + 7.4, z0 + 1.5, { scale: 0.7, smoke: true }); lightAt(c, cx + dx, y + 8, z0 + 2.5, 0xff7a3a, 6, 14); }
    for (const dx of [-5, 5]) greenBrazier(c, Math.round(cx + dx), z0 + 4);
    // the line of the dead, shuffling toward the gate
    for (let i = 0; i < 9; i++) place(c, Math.round(cx + 6 + Math.sin(i) * 0.6), Math.round(z0 + 5 + i * 1.1), 'ghost', { rot: Math.PI, scale: 0.9 }, 0);
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2 + 0.5; const px = Math.round(cx + Math.cos(ang) * R * 0.78), pz = Math.round(cz + Math.sin(ang) * R * 0.78); if (pz > z0 + 4 && free(c, px, pz)) stalagmite(k, px, pz, y, 3 + (a % 3)); }
    for (let i = 0; i < 5; i++) { const [x, z] = cellIn(c, 3); if (z > z0 + 4 && free(c, x, z)) k.w.set(x, y, z, B.bone_block); }
    underDecorate(c, 1.3);
    c.slots.push({ type: 'gate', pos: [cx, y, z0 + 3] }, { type: 'ball', pos: [cx - 4, y, cz + 4] });
    c.spawns.push([cx, y, z0 + 6]);
  },
};

// ------------------------------------------------ chapter 11: Santa Monica beach
function beachDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.sand, B.wet_sand], ['shell', 'starfish', 'kelp'], 0.05 * amount, 0.6);
}
// Surf along one side: wet sand, then water one deep you can wade in, then two deep.
function surf(c, side, width = 6) {
  const { k, x0, z0, x1, z1, y } = c;
  const F = wallFrame(c, side);
  for (let u = F.len[0]; u <= F.len[1]; u++) for (let v = 0; v < width + 2; v++) {
    const [x, z] = F.P(u, v); if (doorAisle(c, x, z, 2)) continue;
    const wob = Math.round(Math.sin(u * 0.5) * 0.8);
    const vv = v - wob;
    if (vv >= width) k.w.set(x, y - 1, z, B.wet_sand);
    else if (vv >= width - 2) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.wet_sand); }
    else { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.water); k.w.set(x, y - 3, z, B.sand); }
  }
}
Object.assign(TEMPLATES, {
  // The beach: umbrellas, towels, a lifeguard tower and the surf rolling in.
  beach_surf(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.sand, 6, B.wet_sand, 0.05);
    const sides = ['n', 'w', 'e', 's'].filter((s) => !c.doors.some((d) => d.side === s));
    const side = sides[0] ?? 'n';
    surf(c, side, 6);
    { const [x, z] = cellIn(c, 4); placeWide(c, x - 1, z - 1, x + 1, z + 1, 'lifeguard_tower', { rot: side === 'n' ? 0 : side === 's' ? Math.PI : side === 'w' ? Math.PI / 2 : -Math.PI / 2 }, 1); }
    for (let i = 0; i < 5; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'umbrella', { color: [0xd8322a, 0x2a6ad8, 0xffd84a, 0x2aa85a][i % 4] }, 0); }
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); if (free(c, x, z)) k.d.add('paper', x + 0.5, y, z + 0.5, { mode: 'flat', scale: 1.6 }); }
    for (let i = 0; i < 2; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'palm', { h: 5 + Math.floor(c.r() * 2) }, 2); }
    beachDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
    c.features.push('surf');
  },
  // The pier: planks on pylons over the water, rails, lamps, the Ferris wheel.
  pier(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.sand, 6);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.water); k.w.set(x, y - 3, z, B.sand); }
    const alongX = roadAlongX(c), mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
    for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) for (let s = -4; s <= 4; s++) {
      const x = alongX ? t : mid + s, z = alongX ? mid + s : t;
      k.w.set(x, y - 1, z, B.planks);
      if (Math.abs(s) === 4 && t % 2 === 0 && !doorAisle(c, x, z, 3)) k.w.set(x, y, z, B.white_trim);
      if (Math.abs(s) === 4 && t % 4 === 0) for (let yy = y - 4; yy < y - 1; yy++) k.w.set(x, yy, z, B.log);
    }
    for (const d of c.doors) { const F = wallFrame(c, d.side); for (let v = 0; v < 6; v++) for (let w = -2; w <= 2; w++) { const [x, z] = F.P(d.at + w, v); k.w.set(x, y - 1, z, B.planks); } }
    for (let t = (alongX ? x0 : z0) + 3; t < (alongX ? x1 : z1) - 2; t += 6) for (const s of [-3, 3]) { const x = alongX ? t : mid + s, z = alongX ? mid + s : t; if (free(c, x, z)) { k.d.prop('streetlight', x + 0.5, y, z + 0.5, { rot: s < 0 ? (alongX ? -Math.PI / 2 : 0) : (alongX ? Math.PI / 2 : Math.PI) }); collider(c, x, z, 1); lightAt(c, x + 0.5, y + 4.8, z + 0.5, 0xffe0b0, 4, 10); } }
    for (let i = 0; i < 3; i++) { const t = (alongX ? x0 : z0) + 2 + Math.floor(c.r() * ((alongX ? x1 - x0 : z1 - z0) - 4)); const s = c.r() < 0.5 ? -2 : 2; place(c, alongX ? t : mid + s, alongX ? mid + s : t, 'bench', { rot: alongX ? 0 : Math.PI / 2 }, 0); }
    k.d.prop('ferris_wheel', (alongX ? x1 - 4 : mid - 7) + 0.5, y - 1, (alongX ? mid - 7 : z1 - 4) + 0.5, { r: 4.5, rot: alongX ? 0 : Math.PI / 2 });
    k.d.prop('canoe', (alongX ? x0 + 4 : mid + 7) + 0.5, y - 1.3, (alongX ? mid + 7 : z0 + 4) + 0.5, { rot: 0.3, color: 0xf2efe6 });
    beachDecorate(c, 0.3);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The boardwalk: palms, food stands with striped awnings, a lamp-lit promenade.
  boardwalk(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.sand, 6, B.wet_sand, 0.04);
    const alongX = roadAlongX(c), mid = alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1;
    for (let t = alongX ? x0 : z0; t <= (alongX ? x1 : z1); t++) for (let s = -2; s <= 2; s++) { const x = alongX ? t : mid + s, z = alongX ? mid + s : t; k.w.set(x, y - 1, z, Math.abs(s) === 2 ? B.concrete : B.planks); }
    for (let t = (alongX ? x0 : z0) + 2; t < (alongX ? x1 : z1) - 1; t += 4) for (const s of [-4, 4]) { const x = alongX ? t : mid + s, z = alongX ? mid + s : t; place(c, x, z, 'palm', { h: 5 + (t % 2) }, 2); }
    for (let i = 0; i < 2; i++) {
      const t = (alongX ? x0 : z0) + 4 + i * 7, s = i % 2 ? 6 : -7; const x = alongX ? t : mid + s, z = alongX ? mid + s : t;
      let ok = true; for (let a = -1; a <= 2; a++) for (let b = -1; b <= 1; b++) { const xx = x + (alongX ? a : b), zz = z + (alongX ? b : a); if (!free(c, xx, zz) || doorAisle(c, xx, zz, 3)) ok = false; }
      if (!ok) continue;
      for (let a = -1; a <= 2; a++) for (let b = -1; b <= 1; b++) { const xx = x + (alongX ? a : b), zz = z + (alongX ? b : a); k.w.set(xx, y, zz, b === 0 || Math.abs(b) === 1 && (a === -1 || a === 2) ? B.teal_panel : B.white_trim); k.w.set(xx, y + 3, zz, B.awning); }
      lightAt(c, x + 0.5, y + 2.5, z + 0.5, 0xffe0b0, 3, 7);
    }
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); place(c, x, z, 'umbrella', { color: [0xd8322a, 0x2a6ad8, 0xffd84a][i] }, 0); }
    beachDecorate(c);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.beach = {
  // The foot of the pier at dusk, under its arch sign.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.sand, 6, B.wet_sand, 0.05);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let z = z0; z <= z1; z++) for (let x = cx - 2; x <= cx + 2; x++) k.w.set(x, y - 1, z, B.planks);
    k.pillar(cx - 3, z0 + 3, y, 5, B.white_trim); k.pillar(cx + 3, z0 + 3, y, 5, B.white_trim);
    sign(c, cx + 0.5, z0 + 3.5, 'SANTA MONICA\nPIER', { y: y + 4.3, w: 6.6, h: 1.6, bg: '#1a3a6a', fg: '#fff2a0', border: '#ff9a5a', glow: true });
    for (const x of [x0 + 2, x1 - 2]) for (const z of [cz - 3, cz + 3]) { k.d.prop('palm', x + 0.5, y, z + 0.5, { h: 6 }); collider(c, x, z, 2); }
    k.d.prop('ferris_wheel', x1 - 3.5, y, z0 + 2.5, { r: 4.2 });
    beachDecorate(c);
    k.w.set(cx, y - 1, cz + 3, B.gold_plate);
  },
  // The duel in the surf: sand on the near side, waves you can wade in on the far side
  // (slot 'surf' with its bounds: Percy is strongest standing in the water).
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.sand, 8, B.wet_sand, 0.08);
    const { cx, cz, R } = roundArena(c, 0.5);
    const zs = Math.round(cz) - 1;
    for (let z = z0; z <= zs; z++) for (let x = x0; x <= x1; x++) {
      if (!k.w.get(x, y - 1, z)) continue;
      const v = zs - z + Math.round(Math.sin(x * 0.5) * 0.8);
      if (v <= 1) k.w.set(x, y - 1, z, B.wet_sand);
      else if (v <= 5) { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.wet_sand); }
      else { k.w.set(x, y - 1, z, B.water); k.w.set(x, y - 2, z, B.water); k.w.set(x, y - 3, z, B.sand); }
    }
    placeWide(c, Math.round(cx) + 5, Math.round(cz) + 3, Math.round(cx) + 7, Math.round(cz) + 5, 'lifeguard_tower', { rot: 0 }, 1);
    k.d.prop('car', cx - 6, y, cz + 5.5, { rot: 0.5, color: 0x17130f }); k.w.fill(Math.round(cx) - 8, y, Math.round(cz) + 5, Math.round(cx) - 5, y, Math.round(cz) + 6, B.barrier);
    for (const [dx, dz] of [[-8, 1], [8, 1]]) for (let yy = y - 3; yy < y + 1; yy++) k.w.set(Math.round(cx + dx), yy, Math.round(cz + dz), B.log);
    for (let i = 0; i < 3; i++) place(c, Math.round(cx - 3 + i * 3), Math.round(cz) + 6, 'umbrella', { color: [0xd8322a, 0x2a6ad8, 0xffd84a][i] }, 0);
    beachDecorate(c);
    c.slots.push({ type: 'surf', min: [x0, y, z0], max: [x1, y, zs - 2], pos: [cx, y, zs - 4] });
    c.spawns.push([cx, y, cz + 3]);
  },
};

// ------------------------------------------------ chapter 12: Olympus above the Empire State Building
function olympusDecorate(c, amount = 1) {
  const { k, x0, z0, x1, z1 } = c;
  scatterOn(k, x0, z0, x1, z1, [B.grass], ['flower_yellow', 'flower_blue', 'grass', 'flower_red'], 0.25 * amount);
}
// soft cloud blocks around the edge of a room, under it, drifting off the sides
function cloudSkirt(c, n = 10) {
  const { k, x0, z0, x1, z1, y } = c;
  for (let i = 0; i < n; i++) {
    const side = Math.floor(c.r() * 4), t = c.r();
    const x = side < 2 ? Math.round(x0 + t * (x1 - x0)) : side === 2 ? x0 - 1 : x1 + 1, z = side >= 2 ? Math.round(z0 + t * (z1 - z0)) : side === 0 ? z0 - 1 : z1 + 1;
    const R = 1.5 + c.r() * 1.5;
    for (let dy = -3; dy <= 0; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (Math.hypot(dx, dy * 1.6, dz) < R && !k.w.get(x + dx, y - 2 + dy, z + dz)) k.w.set(x + dx, y - 2 + dy, z + dz, B.cloud);
  }
}
function goldLamp(c, x, z) { if (!free(c, x, z) || doorAisle(c, x, z)) return false; c.k.d.prop('brazier', x + 0.5, c.y, z + 0.5); collider(c, x, z, 1); lightAt(c, x + 0.5, c.y + 1.8, z + 0.5, 0xffd890, 3.5, 9); return true; }
// A small temple: a stepped base, columns round it and a gabled roof.
function temple(c, x0, z0, x1, z1) {
  const { k, y } = c;
  k.w.fill(x0, y, z0, x1, y, z1, B.marble_white);
  for (let x = x0; x <= x1; x += 2) for (const z of [z0, z1]) column(k, x, z, y + 1, 5);
  for (let z = z0 + 2; z < z1; z += 2) for (const x of [x0, x1]) column(k, x, z, y + 1, 5);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) k.w.set(x, y + 6, z, (x === x0 || x === x1 || z === z0 || z === z1) ? B.key_frieze : B.marble_white);
  const top = gable(k, x0, z0, x1, z1, y + 7, B.marble_white, { axis: 'z', end: B.gold_marble });
  k.w.addRoof([x0 - 1, y + 6, z0 - 1], [x1 + 1, top, z1 + 1], [[x0, y, z0], [x1, y + 5, z1]]);
}
Object.assign(TEMPLATES, {
  // A palace court: colonnades, a little temple, statues and braziers.
  palace_court(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.gold_marble, 6, B.marble_floor, 0.25);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    let ok = true; for (let z = cz - 4; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) if (doorAisle(c, x, z, 3)) ok = false;
    if (ok) temple(c, cx - 3, cz - 4, cx + 3, cz + 2);
    for (let x = x0 + 2; x <= x1 - 2; x += 3) for (const z of [z0 + 1, z1 - 1]) if (free(c, x, z) && !doorAisle(c, x, z, 3)) column(k, x, z, y, 6);
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); if (free(c, x, z) && !doorAisle(c, x, z)) { k.d.prop('statue', x + 0.5, y, z + 0.5, { pose: Math.floor(c.r() * 3), bronze: c.r() < 0.4, rot: c.r() * 6 }); collider(c, x, z, 3); } }
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); goldLamp(c, x, z); }
    cloudSkirt(c, 8);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // A road of cloud: a marble walkway across open sky, cloud islands, golden lamps.
  cloud_bridge(c) {
    const { k, x0, z0, x1, z1, y } = c;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let d = 1; d <= 6; d++) k.w.set(x, y - d, z, 0);
    const blobs = 7;
    for (let i = 0; i < blobs; i++) { const [x, z] = cellIn(c, 2); const R = 2 + c.r() * 2.5; for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) { const d = Math.hypot(dx, dz); if (d < R) { k.w.set(x + dx, y - 1, z + dz, B.cloud); if (d < R - 1) k.w.set(x + dx, y - 2, z + dz, B.cloud); } } }
    // walkways joining every door through the middle
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    const walk = (ax, az, bx, bz) => { const n = Math.max(Math.abs(bx - ax), Math.abs(bz - az)); for (let s = 0; s <= n; s++) { const px = Math.round(ax + (bx - ax) * s / n), pz = Math.round(az + (bz - az) * s / n); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { k.w.set(px + a, y - 1, pz + b, Math.abs(a) + Math.abs(b) === 2 ? B.gold_marble : B.marble_white); k.w.set(px + a, y - 2, pz + b, B.cloud); } } };
    for (const d of c.doors) { const F = wallFrame(c, d.side); const [ax, az] = F.P(d.at, 0); walk(ax, az, cx, cz); }
    walk(cx - 2, cz, cx + 2, cz);
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) k.w.set(cx + a, y - 1, cz + b, Math.abs(a) === 2 || Math.abs(b) === 2 ? B.key_frieze : B.gold_marble);
    for (const [dx, dz] of [[-2, -2], [2, 2]]) goldLamp(c, cx + dx, cz + dz);
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); if (k.w.get(x, y - 1, z) === B.cloud) goldLamp(c, x, z); }
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
    c.features.push('pit');
  },
  // The throne room: twelve thrones in a U round the hearth.
  throne_hall(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.gold_marble, 6, B.marble_floor, 0.2);
    shell(c, { wall: B.marble_white, alt: B.gold_marble, altP: 0.15, trim: B.key_frieze, h: 6, roof: B.marble_white });
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    const colors = [0xffd84a, 0x2aa8a0, 0x7a2a8a, 0xd8322a, 0xe8e8f0, 0xffa040, 0x3f8a34, 0xc8ccd2, 0xb8452a, 0xff7ab0, 0x2a6ad8, 0x6a2a7a];
    let i = 0;
    for (let x = x0 + 3; x <= x1 - 3; x += 3) { if (i < 12 && place(c, x, z0 + 2, 'throne', { color: colors[i], rot: 0, scale: 1 }, 3)) i++; }
    for (let z = z0 + 5; z <= z1 - 4; z += 3) for (const x of [x0 + 2, x1 - 2]) if (i < 12 && place(c, x, z, 'throne', { color: colors[i], rot: x < cx ? Math.PI / 2 : -Math.PI / 2, scale: 1 }, 3)) i++;
    k.d.prop('campfire', cx + 0.5, y, cz + 0.5, { scale: 1.2 }); collider(c, cx, cz, 1); lightAt(c, cx + 0.5, y + 1.6, cz + 0.5, 0xffa040, 5, 12);
    for (const [dx, dz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) if (free(c, cx + dx, cz + dz) && !doorAisle(c, cx + dx, cz + dz, 3)) column(k, cx + dx, cz + dz, y, 6);
    k.s.add({ x: cx + 0.5, y: y + 14, z: cz - 3 }, { x: 0.25, y: -1, z: 0.35 }, 15, 5, 0xfff0c8);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
  // The gods' gardens: grass, olive trees, a fountain, the Muses' little stage.
  god_garden(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let z = z0; z <= z1; z++) for (let x = cx - 1; x <= cx + 1; x++) k.w.set(x, y - 1, z, B.marble_white);
    for (let x = x0; x <= x1; x++) for (let zz = cz - 1; zz <= cz + 1; zz++) k.w.set(x, y - 1, zz, B.marble_white);
    k.pond(cx - 1, cz - 1, cx + 1, cz + 1, y, B.water, 1, B.gold_marble);
    k.d.prop('statue', cx + 0.5, y - 1, cz + 0.5, { pose: 1, bronze: true, scale: 1.2 }); collider(c, cx, cz, 3);
    for (let i = 0; i < 6; i++) { const [x, z] = cellIn(c, 3); if (free(c, x, z) && !doorAisle(c, x, z, 3) && Math.abs(x - cx) > 2 && Math.abs(z - cz) > 2) oak(k, x, z, y, { h: 3 + Math.floor(c.r() * 2), R: 2.2, leaves: B.leaves }); }
    for (let i = 0; i < 4; i++) { const [x, z] = cellIn(c, 2); goldLamp(c, x, z); }
    olympusDecorate(c);
    cloudSkirt(c, 10);
    spawnGrid(c, 12, 2); dropReservedSpawns(c);
  },
});
DRESS.olympus = {
  // The six-hundredth floor: brass elevator doors, an art-deco lobby, the sky beyond.
  start(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.marble_floor, 6, B.gold_marble, 0.15);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let x = x0; x <= x1; x++) for (let yy = y; yy < y + 6; yy++) k.w.set(x, yy, z0, yy === y + 5 ? B.key_frieze : B.gold_marble);
    for (let x = cx - 1; x <= cx + 1; x++) for (let yy = y; yy < y + 3; yy++) k.w.set(x, yy, z0, B.elevator_door);
    for (const dx of [-5, 5]) for (let x = cx + dx - 1; x <= cx + dx + 1; x++) for (let yy = y; yy < y + 3; yy++) if (x > x0 && x < x1) k.w.set(x, yy, z0, B.elevator_door);
    sign(c, cx + 0.5, z0 + 1.08, '600', { y: y + 3.3, w: 1.6, h: 0.7, bg: '#2a1a0a', fg: '#ffd84a', glow: true, border: '#c9963a', oneSided: true });
    for (let x = x0 + 2; x <= x1 - 2; x += 4) column(k, x, z0 + 2, y, 6);
    k.d.prop('empire_state', x1 - 3.5, y - 9, z1 + 3.5, { h: 12, glow: true });
    for (const [dx, dz] of [[-3, 2], [3, 2]]) goldLamp(c, cx + dx, cz + dz);
    cloudSkirt(c, 12);
    k.w.set(cx, y - 1, cz + 3, B.gold_plate);
  },
  // A hill on camp at night, a pine on the crest and a stream below: where Luke shows his
  // hand. The biome's bossEnv lights it as night (slot 'pine_tree' as on Half-Blood Hill).
  boss(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 8); patches(k, x0, z0, x1, z1, y, B.forest_floor, 0.2);
    const { cx, cz, R } = roundArena(c, 0.8);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const d = Math.hypot(x + 0.5 - cx, z + 0.5 - (cz - 3)); if (d < 4.5 && k.w.get(x, y - 1, z)) { k.w.set(x, y, z, B.grass); k.w.set(x, y - 1, z, B.dirt); } }
    const tx = Math.round(cx) - 1, tz = Math.round(cz) - 4;
    pine(k, tx, tz, y + 1, { h: 13, wide: true, R: 4.6 });
    for (let x = x0; x <= x1; x++) { const zz = Math.round(z1 - 4 + Math.sin(x * 0.5) * 1.2); for (let dz = 0; dz < 2; dz++) if (k.w.get(x, y - 1, zz + dz) && !doorAisle(c, x, zz + dz, 3)) { k.w.set(x, y - 1, zz + dz, B.water); k.w.set(x, y - 2, zz + dz, B.sand); } }
    for (let a = 0; a < 5; a++) { const ang = a * 1.3 + 0.4; const px = Math.round(cx + Math.cos(ang) * R * 0.72), pz = Math.round(cz + Math.sin(ang) * R * 0.72); if (free(c, px, pz) && !doorAisle(c, px, pz, 3)) (a % 2 ? boulder : pine)(k, px, pz, y, a % 2 ? 1.3 : undefined); }
    for (let a = 0; a < 4; a++) { const ang = a / 4 * Math.PI * 2 + 0.8; const px = Math.round(cx + Math.cos(ang) * R * 0.5), pz = Math.round(cz + Math.sin(ang) * R * 0.5); if (free(c, px, pz)) { k.d.prop('brazier', px + 0.5, y, pz + 0.5); collider(c, px, pz, 1); lightAt(c, px + 0.5, y + 1.8, pz + 0.5, 0xffa040, 4, 10); } }
    scatterOn(k, x0, z0, x1, z1, [B.grass, B.forest_floor], ['tall_grass', 'grass', 'fern', 'flower_blue'], 0.25);
    c.slots.push({ type: 'pine_tree', pos: [tx + 1, y + 1, tz + 1] });
    c.spawns.push([cx, y, cz + 2]);
  },
};

// ------------------------------------------------ chapter 3: the camp woods, improved
Object.assign(TEMPLATES, {
  // A flag hill: a grassy mound with a team's banner on top and armour left at the foot.
  flag_hill(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.forest_floor, 6); patches(k, x0, z0, x1, z1, y, B.grass, 0.35);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    const rx = (x1 - x0) / 2 - 3, rz = (z1 - z0) / 2 - 3;
    for (let z = z0 + 2; z <= z1 - 2; z++) for (let x = x0 + 2; x <= x1 - 2; x++) {
      if (doorAisle(c, x, z, 3)) continue;
      const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
      const h = d < 0.35 ? 3 : d < 0.6 ? 2 : d < 0.85 ? 1 : 0;
      for (let i = 0; i < h; i++) k.w.set(x, y + i, z, i === h - 1 ? B.grass : B.dirt);
    }
    const top = k.w.groundBelow(cx + 0.5, cz + 0.5, y + 6);
    const team = c.r() < 0.5;
    k.d.prop('flagpole', cx + 0.5, top, cz + 0.5, { h: 5, color: team ? 0x2a6ad8 : 0xd8322a }); k.w.set(cx, top, cz, B.barrier);
    k.d.prop('brazier', cx + 2.5, k.w.groundBelow(cx + 2.5, cz + 0.5, y + 6), cz + 0.5); lightAt(c, cx + 2.5, top + 1.8, cz + 0.5, 0xffa040, 4, 10);
    for (let i = 0; i < 3; i++) { const [x, z] = cellIn(c, 2); if (free(c, x, z) && !doorAisle(c, x, z, 3) && Math.hypot((x - cx) / rx, (z - cz) / rz) > 0.9) k.d.add('camp_banner', x + 0.5, y, z + 0.5, { scale: 1.6, sway: 0.4 }); }
    woodsEdge(c, 9);
    woodsDecorate(c, 0.8);
    spawnGrid(c, 12, 2);
    c.features.push('ledges');
  },
});
// The hellhound's clearing: darker, the pines closer, the creek that heals Percy (slot
// 'creek') and the black shadows it comes out of (slots 'shadow').
DRESS.camp_woods.boss = function (c) {
  const { k, x0, z0, x1, z1, y } = c;
  k.floor(x0, z0, x1, z1, y, B.forest_floor, 8); patches(k, x0, z0, x1, z1, y, B.grass, 0.25);
  const { cx, cz, R } = roundArena(c, 0.5);
  const creek = [];
  for (let x = x0; x <= x1; x++) { const zz = Math.round(z0 + 4 + Math.sin(x * 0.4) * 1.2); for (let dz = 0; dz < 3; dz++) if (k.w.get(x, y - 1, zz + dz)) { k.w.set(x, y - 1, zz + dz, B.water); k.w.set(x, y - 2, zz + dz, B.sand); if (dz === 1 && x % 4 === 0) creek.push([x + 0.5, y - 1, zz + dz + 0.5]); } }
  for (let x = x0; x <= x1; x += 2) { const zz = Math.round(z0 + 4 + Math.sin(x * 0.4) * 1.2); for (const dz of [-1, 3]) if (k.w.get(x, y - 1, zz + dz) && c.r() < 0.6) k.d.add('reeds', x + 0.5, y, zz + dz + 0.5, { scale: 1 }); }
  const shadows = [];
  for (let a = 0; a < 11; a++) { const ang = a / 11 * Math.PI * 2 + 0.3; const px = Math.round(cx + Math.cos(ang) * R * 0.84), pz = Math.round(cz + Math.sin(ang) * R * 0.84); if (k.w.get(px, y - 1, pz) === B.water || !k.w.get(px, y - 1, pz) || doorAisle(c, px, pz, 3)) continue; pine(k, px, pz, y, { h: 10 + (a % 4) }); if (a % 3 === 0) shadows.push([cx + Math.cos(ang) * R * 0.66, y, cz + Math.sin(ang) * R * 0.66]); }
  for (const [sx, , sz] of shadows) for (let i = 0; i < 6; i++) { const x = Math.floor(sx + (c.r() - 0.5) * 3), z = Math.floor(sz + (c.r() - 0.5) * 3); if (k.w.get(x, y - 1, z) === B.forest_floor || k.w.get(x, y - 1, z) === B.grass) k.w.set(x, y - 1, z, B.mud); }
  boulder(k, Math.round(cx) - 4, Math.round(cz) + 3, y, 1.4); boulder(k, Math.round(cx) + 5, Math.round(cz) + 1, y, 1.2);
  k.d.prop('flagpole', cx + 0.5, y, cz + 5.5, { h: 4, color: 0x2a6ad8 }); collider(c, Math.floor(cx), Math.floor(cz + 5), 1);
  k.s.add({ x: cx + 0.5, y: y + 16, z: cz - 3 }, { x: 0.25, y: -1, z: 0.35 }, 17, 6, 0xb8ccff);
  scatterOn(k, x0, z0, x1, z1, [B.forest_floor, B.grass], ['fern', 'leaf_litter', 'mushroom', 'grass'], 0.25);
  for (const p of creek) c.slots.push({ type: 'creek', pos: p });
  for (const p of shadows) c.slots.push({ type: 'shadow', pos: p });
  c.spawns.push([cx, y, cz - R * 0.2]);
};

BIOME_ROOMS.camp_woods = ['woods', 'woods', 'creek', 'zeus_fist', 'clearing', 'flag_hill'];
BIOME_ROOMS.highway = ['turnpike', 'turnpike', 'bus_stop', 'rest_stop', 'roadside_woods'];
BIOME_ROOMS.statue_garden = ['statue_yard', 'statue_yard', 'warehouse', 'snack_bar', 'gnome_garden'];
BIOME_ROOMS.arch = ['arch_lobby', 'tram_shaft', 'tram_shaft', 'observation', 'riverside'];
BIOME_ROOMS.waterland = ['dry_pool', 'slide_tower', 'lazy_river', 'dry_pool'];
BIOME_ROOMS.casino = ['slot_floor', 'slot_floor', 'card_room', 'arcade', 'pool_party'];
BIOME_ROOMS.desert = ['dunes', 'canyon', 'desert_road', 'bed_showroom'];
BIOME_ROOMS.underworld = ['styx_shore', 'styx_shore', 'asphodel', 'asphodel', 'cavern'];
BIOME_ROOMS.beach = ['beach_surf', 'beach_surf', 'pier', 'boardwalk'];
BIOME_ROOMS.olympus = ['palace_court', 'cloud_bridge', 'throne_hall', 'god_garden'];
