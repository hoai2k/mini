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
    const gy = c.k.w.groundBelow(x + 0.5, z + 0.5, y + 8);
    if (!isFinite(gy) || c.k.w.solidAt(x + 0.5, gy + 0.5, z + 0.5) || c.k.w.solidAt(x + 0.5, gy + 1.5, z + 0.5)) continue;
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
  const sides = ['n', 's', 'w', 'e'].filter((s) => !c.doors.some((d) => d.side === s));
  if (!sides.length) return null;
  const side = sides[Math.floor(c.r() * sides.length)];
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
      k.floor(x0, z0, x1, z1, y, B.grass, 6, B.mud, 0.18);
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
      k.floor(x0, z0, x1, z1, y, B.grass, 8, B.mud, 0.12);
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
      k.floor(x0, z0, x1, z1, y, B.forest_floor, 6, B.grass, 0.25);
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
      k.floor(x0, z0, x1, z1, y, B.forest_floor, 8, B.grass, 0.3);
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
    k.floor(x0, z0, x1, z1, y, B.grass, 6, B.mud, 0.1);
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
    k.floor(x0, z0, x1, z1, y, B.grass, 6, B.mud, 0.15);
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
    k.floor(x0, z0, x1, z1, y, B.grass, 6, B.mud, 0.15);
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
    k.floor(x0, z0, x1, z1, y, B.grass, 6, B.mud, 0.08);
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
    k.floor(x0, z0, x1, z1, y, B.forest_floor, 6, B.grass, 0.15);
    woodsEdge(c, 12);
    for (let i = 0; i < 6; i++) { const x = x0 + 4 + Math.floor(c.r() * (x1 - x0 - 8)), z = z0 + 4 + Math.floor(c.r() * (z1 - z0 - 8)); if (free(c, x, z) && !doorAisle(c, x, z, 3)) (c.r() < 0.75 ? pine : oak)(k, x, z, y); }
    for (let i = 0; i < 2; i++) { const x = x0 + 4 + Math.floor(c.r() * (x1 - x0 - 8)), z = z0 + 4 + Math.floor(c.r() * (z1 - z0 - 8)); if (free(c, x, z) && !doorAisle(c, x, z, 3)) boulder(k, x, z, y, 1.2 + c.r() * 0.6); }
    // a fallen log
    { const x = x0 + 3 + Math.floor(c.r() * (x1 - x0 - 10)), z = z0 + 3 + Math.floor(c.r() * (z1 - z0 - 6)); let ok = true; for (let i = 0; i < 5; i++) ok = ok && free(c, x + i, z) && !doorAisle(c, x + i, z, 3); if (ok) for (let i = 0; i < 5; i++) k.w.set(x + i, y, z, B.pine_log); }
    woodsDecorate(c);
    spawnGrid(c, 12, 2);
  },
  // The creek: running water with sandy banks, stepping stones and a log bridge.
  creek(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.forest_floor, 6, B.grass, 0.25);
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
    woodsEdge(c, 8);
    boulder(k, alongX ? x0 + 4 : mid - 6, alongX ? mid - 6 : z0 + 4, y, 1.3);
    woodsDecorate(c, 0.8);
    spawnGrid(c, 12, 2);
    c.features.push('creek');
  },
  // Zeus's Fist: a great pile of boulders you can climb.
  zeus_fist(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.forest_floor, 6, B.grass, 0.2);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    boulder(k, cx, cz, y, 3.2); boulder(k, cx - 2, cz + 1, y + 2, 2.4); boulder(k, cx + 1, cz - 1, y + 4, 1.8);
    boulder(k, cx + 3, cz + 2, y, 2);
    // a climbing ramp of single steps up one side
    for (let i = 0; i < 4; i++) for (let w = 0; w < 2; w++) { k.w.fill(cx - 7 + i, y, cz + w, cx - 7 + i, y + i, cz + w, B.rock); k.w.fill(cx - 7 + i, y + i + 1, cz + w, cx - 7 + i, y + i + 4, cz + w, 0); }
    woodsEdge(c, 10);
    k.d.prop('flagpole', cx + 0.5, k.w.groundBelow(cx + 0.5, cz + 0.5, y + 12), cz + 0.5, { h: 4, color: 0xd8322a });
    woodsDecorate(c);
    spawnGrid(c, 12, 2);
    c.features.push('ledges');
  },
  // A moonlit clearing with an old campfire ring and armour left behind.
  clearing(c) {
    const { k, x0, z0, x1, z1, y } = c;
    k.floor(x0, z0, x1, z1, y, B.grass, 6, B.forest_floor, 0.3);
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    k.d.prop('campfire', cx + 0.5, y, cz + 0.5); k.w.addLight(cx + 0.5, y + 1.2, cz + 0.5, 0xff9a40, 5, 11); collider(c, cx, cz, 1);
    for (let a = 0; a < 3; a++) { const x = Math.round(cx + Math.cos(a * 2.1) * 3.5), z = Math.round(cz + Math.sin(a * 2.1) * 3.5); if (free(c, x, z)) k.w.set(x, y, z, B.pine_log); }
    woodsEdge(c, 14);
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
