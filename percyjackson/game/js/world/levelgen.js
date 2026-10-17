// Procedural mission generator. Rooms are laid out on a coarse grid: a main
// path from the start to the boss arena, side rooms branching off it and a
// secret room hidden behind a cracked wall. Rooms are stamped from the
// hand-designed templates in rooms.js and joined by corridors, bridges and
// stairs across height changes, floating over the abyss.
//
// Battles follow Minecraft Dungeons (world/encounters.js): combat rooms fill
// their cell, one on the main path grows across a second cell into a big
// battleground, and monsters wait in the open in groups with scouts posted
// toward the way in (room.packs, room.loose), placed here from the level's
// seed so every browser has the same. Small-room wave fights are traps
// (room.trap): a side room whose doors slam shut until its waves are beaten.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B, BLOCKS } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { TEMPLATES, BIOME_ROOMS, OPEN_ROOMS, DRESS, NO_SPAWN, boulder, column } from './rooms.js';
import { BIOMES } from './biomes.js';
import { MONSTERS } from '../entities/monsters.js';
import { ENC, NONE, planRoles, budget, roster, place, killNeed, walkDist } from './encounters.js';
import { mulberry32 } from '../util.js';

const CELL = 34;   // (26 until the boards were opened up; rooms grew with it, the arena to 30 x 30)
const DIRS = [[1, 0, 'e', 'w'], [-1, 0, 'w', 'e'], [0, 1, 's', 'n'], [0, -1, 'n', 's']];

export const ENEMY_TABLES = {
  // the inherited biomes, restocked with Greek monsters
  jujutsu_high: [['pup', 5], ['harpy', 2], ['automaton', 1.5], ['dracaena', 1], ['fury', 0.8], ['empousa', 0.4]],
  tokyo_night: [['pup', 4], ['harpy', 2.5], ['automaton', 2], ['dracaena', 1.2], ['fury', 1], ['empousa', 0.6]],
  cursed_forest: [['pup', 4], ['harpy', 3], ['automaton', 1], ['dracaena', 0.8], ['fury', 0.6], ['empousa', 1]],
  flooded_subway: [['pup', 4], ['harpy', 1.5], ['automaton', 2.5], ['dracaena', 1.5], ['fury', 1.2], ['empousa', 0.5]],
  shibuya: [['pup', 4], ['harpy', 2], ['automaton', 2], ['dracaena', 1.5], ['fury', 1.5], ['empousa', 1]],
  // Half-Blood Quests. Each board has its signature monsters (the first one
  // or two, and the elite marked *) and mixes the roles round them: fast
  // rushers, steady melee, ranged, an exploder or lobber, a tank or bruiser,
  // now and then a caster or summoner (monsters.js `role`; groups are mixed
  // by role in world/encounters.js).
  museum: [['serpent', 3], ['pup', 2.5], ['harpy', 2], ['spider', 1.2], ['ghost', 1], ['automaton', 0.6], ['fury', 1.4] /* * */, ['dracaena', 0.6], ['empousa', 0.25]],
  storm_hill: [['pup', 4.5], ['harpy', 2.5], ['automaton', 1.5], ['spider', 1], ['hellhound', 0.8] /* * */, ['dracaena', 0.4], ['fury', 0.3]],
  camp_woods: [['spider', 3.5], ['pup', 3], ['serpent', 1], ['harpy', 1], ['automaton', 0.5], ['dracaena', 1.2] /* * */, ['hellhound', 0.8]],
  // the road west (chapters 4-12)
  highway: [['harpy', 3.5], ['pup', 2.5], ['stymphalian', 1], ['automaton', 1], ['serpent', 0.6], ['fury', 1.8] /* * */, ['dracaena', 0.5]],
  statue_garden: [['serpent', 3], ['pup', 2], ['harpy', 1.2], ['automaton', 0.6], ['gorgon_statue', 2.4] /* * */, ['dracaena', 1], ['empousa', 0.25]],
  arch: [['pup', 3.5], ['stymphalian', 2], ['telekhine', 1.2], ['automaton', 1], ['harpy', 0.6], ['hellhound', 1.2] /* * */, ['dracaena', 0.5], ['empousa', 0.3], ['cyclops', 0.15]],
  waterland: [['spider', 6], ['automaton', 2.2], ['telekhine', 1.6], ['pup', 0.6], ['cyclops', 0.35] /* * */, ['scorpion', 0.4]],
  casino: [['pup', 2], ['automaton', 1.2], ['harpy', 1], ['serpent', 1], ['spider', 0.6], ['ghost', 0.4], ['empousa', 1.4] /* * */, ['fury', 0.6], ['dracaena', 0.6]],
  desert: [['pup', 2.5], ['stymphalian', 1.6], ['spartoi', 1.4], ['harpy', 0.8], ['automaton', 0.6], ['scorpion', 2.4] /* * */, ['skeleton', 0.6], ['dracaena', 0.5], ['fury', 0.3]],
  underworld: [['ghost', 3], ['spartoi', 2.6], ['pup', 1.4], ['automaton', 0.4], ['skeleton', 1.4] /* * */, ['hellhound', 1.2], ['fury', 0.8]],
  beach: [['spartoi', 3.2], ['harpy', 2], ['pup', 1.6], ['telekhine', 1], ['automaton', 0.5], ['skeleton', 1.6] /* * */, ['hellhound', 0.7], ['fury', 0.4]],
  olympus: [['stymphalian', 2.6], ['automaton', 2], ['telekhine', 1.4], ['spider', 1], ['pup', 0.6], ['cyclops', 0.5] /* * */, ['dracaena', 1], ['scorpion', 0.5], ['empousa', 0.4]],
};

export function generateLevel(mission) {
  const seed = mission.seed ?? (Math.random() * 1e9) | 0;
  const r = mulberry32(seed);
  const biome = BIOMES[mission.biome];
  const GW = 5, GH = 5;
  // ---------------------------------------------------------------- layout
  let path = null;
  const mainLen = 5 + Math.min(2, Math.floor((mission.difficulty ?? 1) / 2));
  for (let attempt = 0; attempt < 200 && !path; attempt++) {
    const start = [Math.floor(r() * GW), GH - 1];
    const p = [start]; const seen = new Set([start.join()]);
    while (p.length < mainLen) {
      const [cx, cz] = p[p.length - 1];
      const opts = DIRS.map(([dx, dz]) => [cx + dx, cz + dz]).filter(([x, z]) => x >= 0 && z >= 0 && x < GW && z < GH && !seen.has(x + ',' + z));
      if (!opts.length) break;
      // bias toward the far (north) side
      opts.sort((a, b) => (a[1] - b[1]) + (r() - 0.5) * 2.2);
      const n = opts[0]; p.push(n); seen.add(n.join());
    }
    if (p.length === mainLen) path = p;
  }
  const cells = new Map();
  const addRoom = (cx, cz, type, parent) => { const room = { cx, cz, type, parent, links: [] }; cells.set(cx + ',' + cz, room); return room; };
  const rooms = [];
  path.forEach(([cx, cz], i) => rooms.push(addRoom(cx, cz, i === 0 ? 'start' : i === path.length - 1 ? 'boss' : 'combat', i ? rooms[i - 1] : null)));
  for (let i = 1; i < rooms.length; i++) link(rooms[i - 1], rooms[i], 'open');
  // the battleground: one combat room on the main path (not the first or the
  // last, if it can) grows across a free neighbouring cell
  const mainCombat = rooms.filter((q) => q.type === 'combat');
  const arenaOrder = mainCombat.map((q, i) => i).filter((i) => i < mainCombat.length - 1).sort((a, b) => Math.abs(a - (mainCombat.length - 1) / 2) - Math.abs(b - (mainCombat.length - 1) / 2) + (r() - 0.5) * 0.5);
  let arenaAt = -1;
  for (const i of arenaOrder) {
    const q = mainCombat[i];
    const free = DIRS.map(([dx, dz]) => [q.cx + dx, q.cz + dz]).filter(([x, z]) => x >= 0 && z >= 0 && x < GW && z < GH && !cells.has(x + ',' + z));
    if (!free.length) continue;
    const [ex, ez] = free[Math.floor(r() * free.length)];
    q.ext = [ex, ez]; cells.set(ex + ',' + ez, q); arenaAt = i; break;
  }
  // side rooms + a secret room
  const mids = rooms.slice(1, -1);
  let sideCount = 2 + Math.floor(r() * 2), secretDone = false;
  for (let t = 0; t < 40 && sideCount > 0; t++) {
    const host = mids[Math.floor(r() * mids.length)];
    const [dx, dz] = DIRS[Math.floor(r() * 4)];
    const x = host.cx + dx, z = host.cz + dz;
    if (x < 0 || z < 0 || x >= GW || z >= GH || cells.has(x + ',' + z)) continue;
    const secret = !secretDone;
    const room = addRoom(x, z, secret ? 'secret' : 'side', host);
    link(host, room, secret ? 'secret' : 'open');
    rooms.push(room); sideCount--; if (secret) secretDone = true;
  }
  // what part each room plays (world/encounters.js)
  const sideRooms = rooms.filter((q) => q.type === 'side' || q.type === 'secret');
  const roles = planRoles(mainCombat.length, sideRooms.map((q) => ({ secret: q.type === 'secret' })), mission.difficulty ?? 1, r, { arenaAt });
  // straight-to-the-boss chapters: the one fight on the approach is a proper group
  if (mission.objective === 'boss' && roles.main.length) roles.main[roles.main.length - 1] = 'pack';
  mainCombat.forEach((q, i) => { q.role = roles.main[i]; q.breather = q.role === 'breather'; q.pathT = mainCombat.length > 1 ? i / (mainCombat.length - 1) : 0.5; });
  sideRooms.forEach((q, i) => { q.role = roles.sides[i]; q.pathT = q.parent?.pathT ?? 0.5; });
  function link(a, b, kind) { const l = { a, b, kind }; a.links.push(l); b.links.push(l); }

  // ---------------------------------------------------------------- rects + heights
  const SX = GW * CELL, SZ = GH * CELL, SY = 44;
  const world = new World(SX, SY, SZ);
  const deco = new Decorations(); const shafts = new LightShafts();
  const k = new Kit(world, deco, shafts, seed);
  const span = ([lo, hi]) => lo + Math.floor(r() * (hi - lo + 1));
  for (const room of rooms) {
    const big = room.type === 'boss';
    const sz = room.type === 'start' ? [18, 23] : room.type === 'combat' ? ENC.size.combat : room.role === 'trap' ? ENC.size.trap : room.type === 'secret' ? ENC.size.secret : ENC.size.side;
    let w = big ? 30 : span(sz), d = big ? 30 : span(sz);
    let ox = room.cx * CELL + 2 + Math.floor(r() * (CELL - 4 - w + 1)), oz = room.cz * CELL + 2 + Math.floor(r() * (CELL - 4 - d + 1));
    if (room.ext) {
      // two cells: the long side runs across both, the short side fills the cell
      const [ex, ez] = room.ext;
      const cx0 = Math.min(room.cx, ex), cz0 = Math.min(room.cz, ez);
      if (ex !== room.cx) { w = 2 * CELL - 4 - Math.floor(r() * 3); ox = cx0 * CELL + 2 + Math.floor(r() * (2 * CELL - 4 - w + 1)); }
      else { d = 2 * CELL - 4 - Math.floor(r() * 3); oz = cz0 * CELL + 2 + Math.floor(r() * (2 * CELL - 4 - d + 1)); }
      room.cells = 2;
    }
    room.x0 = ox; room.z0 = oz; room.x1 = ox + w - 1; room.z1 = oz + d - 1;
    const parentY = room.parent ? room.parent.y : 12;
    room.y = room.type === 'start' ? 12 : Math.max(9, Math.min(18, parentY + [0, 0, 3, -3][Math.floor(r() * 4)]));
    if (room.type === 'secret') room.y = room.parent.y;
    room.center = new THREE.Vector3((room.x0 + room.x1) / 2 + 0.5, room.y, (room.z0 + room.z1) / 2 + 0.5);
  }
  // door positions along shared sides
  for (const room of rooms) room.doors = [];
  const corridors = [];
  for (const room of rooms) for (const l of room.links) {
    if (l.a !== room) continue;
    const a = l.a, b = l.b;
    const dx = b.cx - a.cx, dz = b.cz - a.cz;
    if (dx) {
      const zlo = Math.max(a.z0, b.z0) + 3, zhi = Math.min(a.z1, b.z1) - 3;
      const at = zlo <= zhi ? Math.floor((zlo + zhi) / 2) : Math.floor((a.center.z + b.center.z) / 2);
      a.doors.push({ side: dx > 0 ? 'e' : 'w', at, link: l }); b.doors.push({ side: dx > 0 ? 'w' : 'e', at, link: l });
      corridors.push({ l, axis: 'x', at, from: dx > 0 ? a.x1 : b.x1, to: dx > 0 ? b.x0 : a.x0, ya: dx > 0 ? a.y : b.y, yb: dx > 0 ? b.y : a.y, aRoom: dx > 0 ? a : b, bRoom: dx > 0 ? b : a });
    } else {
      const xlo = Math.max(a.x0, b.x0) + 3, xhi = Math.min(a.x1, b.x1) - 3;
      const at = xlo <= xhi ? Math.floor((xlo + xhi) / 2) : Math.floor((a.center.x + b.center.x) / 2);
      a.doors.push({ side: dz > 0 ? 's' : 'n', at, link: l }); b.doors.push({ side: dz > 0 ? 'n' : 's', at, link: l });
      corridors.push({ l, axis: 'z', at, from: dz > 0 ? a.z1 : b.z1, to: dz > 0 ? b.z0 : a.z0, ya: dz > 0 ? a.y : b.y, yb: dz > 0 ? b.y : a.y, aRoom: dz > 0 ? a : b, bRoom: dz > 0 ? b : a });
    }
  }
  // ---------------------------------------------------------------- stamp rooms
  const pool = BIOME_ROOMS[mission.biome];
  for (const room of rooms) {
    const c = { k, x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1, y: room.y, b: biome, r, spawns: [], slots: [], features: [], doors: room.doors };
    if (room.type === 'boss') bossArena(c);
    else if (room.type === 'start') startRoom(c);
    else {
      // the open-field fights get the open templates; a trap the tighter ones
      const open = OPEN_ROOMS[mission.biome] ?? pool;
      const list = room.role === 'pack' || room.role === 'arena' || room.role === 'strays' || room.role === 'breather' ? open : room.role === 'trap' ? (pool.filter((x) => !open.includes(x)).length ? pool.filter((x) => !open.includes(x)) : pool) : pool;
      let t = list[Math.floor(r() * list.length)];
      if (room.type === 'secret') t = 'hall';
      TEMPLATES[t](c);
      room.template = t;
      // a big open battleground still needs something to fight round
      if (room.role === 'arena') cover(c, 5 + Math.floor(r() * 3));
      else if (room.role === 'pack') cover(c, 1 + Math.floor(r() * 2));
    }
    room.spawns = c.spawns; room.features = c.features; room.slots = c.slots;
    // make sure every door opening is clear and has floor under it
    for (const d of room.doors) clearDoor(k, room, d);
  }
  // ---------------------------------------------------------------- corridors
  for (const cor of corridors) buildCorridor(k, cor, biome, r);
  // secret wall + boss gate
  const gates = [];
  for (const cor of corridors) {
    if (cor.l.kind === 'secret') sealDoor(k, cor, B.cracked_brick, true);
    const bossSide = cor.aRoom.type === 'boss' ? 'a' : cor.bRoom.type === 'boss' ? 'b' : null;
    if (bossSide) gates.push(sealDoor(k, cor, B.blue_energy, false, bossSide));
  }
  // trap doors: worked out now, slammed shut when the trap is sprung (mission.js)
  const trapGates = [];
  for (const room of rooms) {
    if (room.role !== 'trap') continue;
    room.trap = { gates: [], points: [], sprung: false, done: false };
    for (const cor of corridors) {
      const side = cor.aRoom === room ? 'a' : cor.bRoom === room ? 'b' : null;
      if (!side) continue;
      const gate = sealDoor(k, cor, B.metal_grate, false, side, true);
      gate.trap = true; room.trap.gates.push(trapGates.length); trapGates.push(gate);
    }
  }
  // each room's floor (world/encounters.js): spawn points for chests and
  // objectives only where you can walk to from the door, at floor height
  for (const room of rooms) {
    if (room.type === 'start' || room.type === 'boss') continue;
    const grid = room.grid = roomGrid(k.w, room), dist = walkDist(grid);
    const good = room.spawns.filter(([x, y, z]) => { const i = (Math.floor(z) - room.z0) * grid.W + (Math.floor(x) - room.x0); return dist[i] >= 0 && grid.ok[i] && Math.abs(grid.H[i] - room.y) <= 1 && Math.abs(grid.H[i] - y) <= 1; });
    if (good.length) room.spawns = good;
  }
  // ---------------------------------------------------------------- objectives & props
  const objRooms0 = rooms.filter((q) => (q.type === 'combat' || q.type === 'side') && q.role !== 'trap' && q.role !== 'breather');
  const objRooms = objRooms0.length ? objRooms0 : rooms.filter((q) => q.type === 'combat' || q.type === 'side');
  const objective = { type: mission.objective, items: [], need: 0, done: 0 };
  const pickSpot = (room) => { const s = room.spawns.splice(Math.floor(r() * room.spawns.length), 1)[0]; return s ? new THREE.Vector3(s[0], s[1], s[2]) : room.center.clone(); };
  if (mission.objective === 'rescue' || mission.objective === 'seal') {
    const shuffled = objRooms.slice().sort(() => r() - 0.5);
    for (let i = 0; i < 3; i++) { const room = shuffled[i % shuffled.length]; objective.items.push({ pos: pickSpot(room), room, done: false }); }
    objective.need = 3;
  }
  const chests = [];
  for (const room of rooms) {
    if (room.type === 'start' || room.type === 'boss') continue;
    // a side room is a detour, so it always pays: a chest (W3); the secret room a rare one
    if (room.type === 'secret' || room.type === 'side' || r() < 0.45) chests.push({ pos: pickSpot(room), room, rarity: room.type === 'secret' ? 'rare' : 'common', opened: false });
  }
  // encounters (world/encounters.js): groups, scouts and strays placed on the
  // reachable floor of each room; a trap's waves and spawn points
  const table = ENEMY_TABLES[mission.biome];
  const info = (kind) => MONSTERS[kind];
  const diff = mission.difficulty ?? 1;
  let totalEnemies = 0;
  for (const room of rooms) {
    room.waves = []; room.packs = []; room.loose = [];
    if (room.type === 'start' || room.type === 'boss') continue;
    const grid = room.grid;
    const area = grid.H.reduce((a, h) => a + (h !== NONE ? 1 : 0), 0);
    const plan = roster(budget(room.role ?? 'strays', { diff, t: room.pathT ?? 0.5, area }, r), table, info, diff, r, { champion: diff >= 2 && room.role === 'arena' });
    const spots = place(grid, plan, r);
    const W = (p) => [room.x0 + p[0] + 0.5, p[2], room.z0 + p[1] + 0.5];
    room.packs = spots.packs.map((p, i) => ({ at: W(p.at), theme: plan.packs[i]?.theme, members: p.members.map((m) => ({ ...m, at: W(m.at) })) }));
    room.loose = spots.loose.map((m) => ({ ...m, at: W(m.at) }));
    room.waves = plan.waves;
    if (room.trap) room.trap.points = spots.points.map(W);
    delete room.grid;
    // what one player meets here (traps are a detour; the kill objective doesn't count on them)
    if (room.role !== 'trap') totalEnemies += room.loose.length + room.packs.reduce((a, p) => a + p.members.filter((m) => m.humans <= 1).length, 0);
  }
  if (mission.objective === 'exorcise') objective.need = killNeed(totalEnemies, diff, !!mission.chapter);
  objective.total = totalEnemies;
  world.collectBlockLights();
  const start = rooms[0], boss = rooms.find((q) => q.type === 'boss');
  const spawn = start.center.clone().add(new THREE.Vector3(0, 0, 2));
  const exit = boss.center.clone();
  return { world, deco, shafts, rooms, spawn, bossRoom: boss, gates, trapGates, objective, chests, exit, biome, seed, kit: k, grid: { GW, GH, CELL } };
}

// A room's floor for placing monsters: the standing height in each cell
// nearest the room's floor (NONE where nobody can stand), where a monster may
// stand (not in water or lava, not on a canopy or a prop's collider), the
// door you come in by and every door, in room-local cells.
function roomGrid(w, room) {
  const W = room.x1 - room.x0 + 1, D = room.z1 - room.z0 + 1;
  const H = new Int16Array(W * D).fill(NONE), ok = new Uint8Array(W * D), wet = new Uint8Array(W * D);
  const solid = (x, y, z) => { const id = w.get(x, y, z); return !!(id && BLOCKS[id].solid); };
  const liquid = (x, y, z) => { const id = w.get(x, y, z); return !!(id && BLOCKS[id].liquid); };
  const hot = (x, y, z) => { const id = w.get(x, y, z); const l = id && BLOCKS[id].liquid; return l === 'lava' || l === 'cursed'; };
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const X = room.x0 + x, Z = room.z0 + z;
    let best = NONE;
    for (let y = room.y - 3; y <= room.y + 3; y++) {
      if (!solid(X, y - 1, Z) || solid(X, y, Z) || solid(X, y + 1, Z) || hot(X, y, Z) || hot(X, y - 1, Z)) continue;
      if (best === NONE || Math.abs(y - room.y) < Math.abs(best - room.y)) best = y;
    }
    if (best === NONE) continue;
    H[z * W + x] = best;
    wet[z * W + x] = liquid(X, best, Z) ? 1 : 0;
    ok[z * W + x] = !liquid(X, best, Z) && !liquid(X, best - 1, Z) && !NO_SPAWN.has(w.get(X, best - 1, Z)) && !solid(X, best + 2, Z) ? 1 : 0;
  }
  const local = (d) => d.side === 'n' ? [d.at - room.x0, 0] : d.side === 's' ? [d.at - room.x0, D - 1] : d.side === 'w' ? [0, d.at - room.z0] : [W - 1, d.at - room.z0];
  const entryDoor = room.doors.find((d) => d.link.b === room) ?? room.doors[0];
  return { W, D, H, ok, wet, entry: entryDoor ? local(entryDoor) : [W >> 1, D >> 1], doors: room.doors.map(local) };
}

// Cover in an open battleground: a few boulders, columns or stubs of wall
// (by biome) on open floor, well apart and away from the doors, so there is
// something to circle round and break line of sight with, never a wall across
// the room.
const ROCKY = { storm_hill: B.rock, camp_woods: B.rock, desert: B.red_rock, beach: B.rock, underworld: B.basalt, statue_garden: B.rock };
function cover(c, n) {
  const { k, x0, z0, x1, z1, y, b, r } = c;
  const w = k.w, placed = [];
  const flat = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Z = z + dz; if (!w.get(X, y - 1, Z) || BLOCKS[w.get(X, y - 1, Z)].liquid || w.get(X, y, Z) || w.get(X, y + 1, Z)) return false; } return true; };
  const nearDoor = (x, z) => c.doors.some((d) => {
    const dx = d.side === 'n' || d.side === 's' ? d.at : d.side === 'w' ? x0 : x1, dz = d.side === 'w' || d.side === 'e' ? d.at : d.side === 'n' ? z0 : z1;
    return Math.hypot(x - dx, z - dz) < 7;
  });
  for (let tries = 0; tries < n * 30 && placed.length < n; tries++) {
    const x = x0 + 4 + Math.floor(r() * (x1 - x0 - 7)), z = z0 + 4 + Math.floor(r() * (z1 - z0 - 7));
    if (nearDoor(x, z) || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 7) || !flat(x, z)) continue;
    const rock = ROCKY[b.id];
    if (rock) boulder(k, x, z, y, 1 + r() * 0.5, rock);
    else if (r() < 0.5) { if (b.pillar === B.column) column(k, x, z, y, 4); else k.pillar(x, z, y, 3, b.pillar, b.trim); }
    else { const along = r() < 0.5; for (let t = -1; t <= 1; t++) for (let h = 0; h < (t === 0 ? 2 : 1 + Math.floor(r() * 2)); h++) k.w.set(along ? x + t : x, y + h, along ? z : z + t, h === 0 && b.wall2 ? b.wall2 : b.wall); }
    placed.push([x, z]);
  }
  // (spawn points, chests and objectives never end up on or in a piece of cover)
  for (const [x, z] of placed) c.spawns = c.spawns.filter(([sx, , sz]) => Math.max(Math.abs(sx - x - 0.5), Math.abs(sz - z - 0.5)) > 3.2);
}

// The doorway and the first cells inside it: always open (a prop or a wall a
// template put there would otherwise cut the level in two).
function clearDoor(k, room, d) {
  const w = k.w;
  for (let t = -2; t <= 2; t++) for (let v = 0; v < 3; v++) {
    const x = d.side === 'n' || d.side === 's' ? d.at + t : d.side === 'w' ? room.x0 + v : room.x1 - v;
    const z = d.side === 'w' || d.side === 'e' ? d.at + t : d.side === 'n' ? room.z0 + v : room.z1 - v;
    for (let yy = room.y; yy < room.y + 4; yy++) if (v === 0 || (w.get(x, yy, z) && BLOCKS[w.get(x, yy, z)].solid)) w.set(x, yy, z, 0);
  }
}
function buildCorridor(k, cor, biome, r) {
  const w = k.w;
  const len = cor.to - cor.from - 1;
  const dy = cor.yb - cor.ya;
  const bridge = len >= 5 && r() < 0.45;
  const stepAt = Math.max(0, Math.floor((len - Math.abs(dy)) / 2));
  for (let i = 0; i <= len + 1; i++) {
    const p = cor.from + i;
    // height along the corridor: stairs in the middle
    let y = cor.ya;
    const s = i - stepAt;
    if (dy > 0) y = cor.ya + Math.max(0, Math.min(dy, s));
    else if (dy < 0) y = cor.ya - Math.max(0, Math.min(-dy, s));
    for (let t = -2; t <= 2; t++) {
      const x = cor.axis === 'x' ? p : cor.at + t, z = cor.axis === 'x' ? cor.at + t : p;
      const isRail = Math.abs(t) === 2;
      const top = bridge ? B.planks : (Math.abs(t) < 2 ? biome.path : biome.floor);
      const depth = bridge ? 1 : 4;
      for (let dd = 1; dd <= depth; dd++) w.set(x, y - dd, z, dd === 1 ? top : B.stone);
      for (let yy = y; yy < y + 5; yy++) w.set(x, yy, z, 0);
      if (bridge && isRail && i % 3 === 0) { w.set(x, y, z, B.dark_planks); k.d.add('chain', x + 0.5, y - 1, z + 0.5, { mode: 'hang', scale: 1.6, sway: 0.4 }); }
      else if (!bridge && isRail && i % 5 === 2 && r() < 0.5) { w.set(x, y, z, biome.wall); w.set(x, y + 1, z, biome.wall); }
    }
    // step fill under stairs so there are no holes
    if (dy !== 0) for (let t = -2; t <= 2; t++) { const x = cor.axis === 'x' ? p : cor.at + t, z = cor.axis === 'x' ? cor.at + t : p; for (let yy = Math.min(cor.ya, cor.yb) - 3; yy < y - 1; yy++) if (!w.get(x, yy, z)) w.set(x, yy, z, B.stone); }
  }
  // lanterns at the corridor mouths
  if (len > 2) {
    const a = cor.from + 1, b = cor.to - 1;
    const place = (p, y) => { const x = cor.axis === 'x' ? p : cor.at - 3, z = cor.axis === 'x' ? cor.at - 3 : p; if (!w.get(x, y - 1, z)) return; if (biome.id) { k.d.prop('brazier', x + 0.5, y, z + 0.5); w.set(x, y, z, B.barrier); w.addLight(x + 0.5, y + 1.4, z + 0.5, 0xffa040, 3.5, 8); } else { k.d.prop('paper_lantern', x + 0.5, y + 3.2, z + 0.5); w.addLight(x + 0.5, y + 2.6, z + 0.5, 0xff6a2a, 3, 7); } };
    if (r() < 0.5) place(a, cor.ya); if (r() < 0.5) place(b, cor.yb);
  }
}
// Fill a door opening with blocks (secret cracked wall / boss gate).
function sealDoor(k, cor, id, secretSide, side, dry = false) {
  const room = cor.aRoom.type === 'secret' ? cor.aRoom : cor.bRoom.type === 'secret' ? cor.bRoom : side === 'a' ? cor.aRoom : cor.bRoom;
  const edge = room === cor.aRoom ? cor.from : cor.to;
  const y = room.y;
  const blocks = [];
  // the doorway, plus the room edge either side of it: heroes jump about 1.7
  // blocks, so a gate must not be passable round its ends or over the top. It
  // stands five above the higher end of the corridor (whose stairs and rail posts
  // would otherwise be a step up onto it), and its outer ends cover any floor a
  // diagonal jump from the corridor could land on.
  const top = Math.max(cor.ya, cor.yb, y) + 5;
  for (let t = -6; t <= 6; t++) for (let yy = y; yy < (Math.abs(t) <= 4 ? top : y + 5); yy++) {
    const x = cor.axis === 'x' ? edge : cor.at + t, z = cor.axis === 'x' ? cor.at + t : edge;
    if (Math.abs(t) > 2 && k.w.get(x, yy, z)) continue;
    if (Math.abs(t) > 4 && !k.w.get(x, y - 1, z)) continue;
    if (!dry) k.w.set(x, yy, z, id);
    blocks.push([x, yy, z]);
  }
  const pos = new THREE.Vector3(cor.axis === 'x' ? edge + 0.5 : cor.at + 0.5, y, cor.axis === 'x' ? cor.at + 0.5 : edge + 0.5);
  return { blocks, pos, room, open: dry };
}
function startRoom(c) {
  if (DRESS[c.b.id]) return DRESS[c.b.id].start(c);
  const { k, x0, z0, x1, z1, y, b } = c;
  k.floor(x0, z0, x1, z1, y, b.floor, 6, b.floor2, 0.2);
  const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
  k.d.prop('torii', cx + 0.5, y, cz - 3.5, { w: 5, h: 5 });
  k.lanternPost(cx - 4, cz, y); k.lanternPost(cx + 4, cz, y);
  k.w.set(cx, y - 1, cz + 2, B.gold_trim);
  k.cobwebCorners(x0, z0, x1, z1, y + 2);
  k.scatter(x0, z0, x1, z1, { density: 0.25 });
  for (let x = x0 + 3; x < x1 - 1; x += 6) k.d.add('talisman', x + 0.5, y + 0.02, z1 - 1.5, { mode: 'flat', scale: 1 });
}
function bossArena(c) {
  if (DRESS[c.b.id]) return DRESS[c.b.id].boss(c);
  const { k, x0, z0, x1, z1, y, b } = c;
  k.floor(x0, z0, x1, z1, y, b.floor, 8, b.floor2, 0.3);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = (x1 - x0) / 2;
  // round-off the corners into the abyss
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) > R + 0.6) for (let yy = y - 8; yy < y + 6; yy++) k.w.set(x, yy, z, 0);
  // destructible pillar ring and glowing pools
  for (let a = 0; a < 8; a++) {
    const px = Math.round(cx + Math.cos(a * Math.PI / 4 + 0.39) * R * 0.62), pz = Math.round(cz + Math.sin(a * Math.PI / 4 + 0.39) * R * 0.62);
    k.pillar(px, pz, y, 5, a % 2 ? b.pillar : B.pillar_red, B.lantern);
  }
  const liquid = b.accent === B.lava ? B.lava : B.cursed_pool;
  k.pond(Math.round(cx) - 1, Math.round(z0 + 3), Math.round(cx) + 1, Math.round(z0 + 4), y, liquid, 1, B.obsidian);
  for (let a = 0; a < 16; a++) k.d.add('talisman', cx + Math.cos(a / 16 * Math.PI * 2) * (R - 1), y + 0.02, cz + Math.sin(a / 16 * Math.PI * 2) * (R - 1), { mode: 'flat', scale: 1 });
  for (let a = 0; a < 6; a++) k.torch(Math.round(cx + Math.cos(a) * (R - 1)), y, Math.round(cz + Math.sin(a) * (R - 1)), [0, 0]);
  c.spawns.push([cx, y, cz - R * 0.4]);
}
