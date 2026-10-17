// The open world: Camp Half-Blood in the middle of a much bigger stretch of
// country you can walk across (world/owLayout.js has the map). Each region
// (world/regions/<id>.js) shapes its own terrain and builds its own places:
// waystones you can teleport between, monster camps guarding chests, roaming
// champions, shrines with trials, treasure, people with side quests, and the
// chapters' start markers. openworld/runtime.js brings them to life.
//
// Built once per visit to camp (a few hundred ms); the World streams its
// chunk meshes around the action (World.stream), so the size costs memory,
// not frame time.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B, BLOCKS } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { buildCamp, FY } from './camp.js';
import { WORLD, CAMP_AT, REGIONS, REGION, regionGrid, borderDistance, coastAt, regionAt } from './owLayout.js';
import { makeNoise, rng } from './noise.js';
import { pine, oak, boulder, scatterOn } from './rooms.js';
import { t } from '../text_config.js';
import * as fields from './regions/fields.js';
import * as woods from './regions/woods.js';
import * as shore from './regions/shore.js';
import * as canyon from './regions/canyon.js';
import * as labyrinth from './regions/labyrinth.js';
import * as othrys from './regions/othrys.js';
import * as asphodel from './regions/asphodel.js';
import * as campRegion from './regions/camp.js';

export const REGION_MODULES = { camp: campRegion, fields, woods, shore, canyon, labyrinth, othrys, asphodel };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function buildOpenWorld({ seed = 7 } = {}) {
  const { sx, sy, sz } = WORLD;
  const W = new World(sx, sy, sz).stream(112);
  const deco = new Decorations(), shafts = new LightShafts();
  const k = new Kit(W, deco, shafts, seed);
  const n = makeNoise(seed);
  const grid = regionGrid(), bd = borderDistance(grid, 26);
  const D = W.data, idx = (x, y, z) => (y * sz + z) * sx + x;

  // ------------------------------------------------------------ terrain
  // heights: each region's shape, faded flat (to the camp's ground, FY) towards every border
  const H = new Int16Array(sx * sz), SURF = new Uint8Array(sx * sz);
  const inCamp = (x, z) => x >= CAMP_AT.x && x < CAMP_AT.x + CAMP_AT.sx && z >= CAMP_AT.z && z < CAMP_AT.z + CAMP_AT.sz;
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const i = z * sx + x, r = REGIONS[grid[i]];
    if (inCamp(x, z)) { H[i] = FY; continue; }
    const mod = REGION_MODULES[r.id];
    let h = mod?.terrain?.height?.(x, z, n) ?? 0;
    h *= smooth(bd[i] / 22);
    // the sea down the west edge
    const c = coastAt(z);
    if (x < c) h = Math.min(h, -Math.min(3, Math.ceil((c - x) / 2)));
    else if (x < c + 4) h = Math.min(h, 0);
    H[i] = Math.max(FY - 4, Math.min(sy - 10, Math.round(FY + h)));
  }
  // walkable slopes: no step of more than one block between neighbours (two passes, forward and back)
  const lip = () => {
    for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) { const i = z * sx + x; if (x) H[i] = Math.min(H[i], H[i - 1] + 1); if (z) H[i] = Math.min(H[i], H[i - sx] + 1); }
    for (let z = sz - 1; z >= 0; z--) for (let x = sx - 1; x >= 0; x--) { const i = z * sx + x; if (x < sx - 1) H[i] = Math.min(H[i], H[i + 1] + 1); if (z < sz - 1) H[i] = Math.min(H[i], H[i + sx] + 1); }
  };
  lip();
  // fill the columns: stone, dirt, the region's surface; water up to the sea / lake level
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const i = z * sx + x; if (inCamp(x, z)) continue;
    const r = REGIONS[grid[i]], mod = REGION_MODULES[r.id], h = H[i];
    const wet = h < FY;
    let top = wet ? (x < coastAt(z) || h < FY - 1 ? B.sand : B.wet_sand) : (mod?.terrain?.surface?.(x, z, h - FY, n) ?? B.grass);
    if (!wet && x < coastAt(z) + 3) top = B.sand;
    SURF[i] = top;
    for (let y = 0; y < h; y++) D[idx(x, y, z)] = y === h - 1 ? top : y >= h - 4 ? (BLOCKS[top].step === 'sand' ? B.sand : B.dirt) : B.stone;
    for (let y = h; y < FY; y++) D[idx(x, y, z)] = B.water;
  }

  // ------------------------------------------------------------ Camp Half-Blood
  const C = buildCamp();
  embed(W, C, CAMP_AT.x, CAMP_AT.z);
  for (const it of C.deco.items) { it.x += CAMP_AT.x; it.z += CAMP_AT.z; deco.items.push(it); }
  for (const p of C.deco.props) { p.x += CAMP_AT.x; p.z += CAMP_AT.z; deco.props.push(p); }
  for (const m of [...C.shafts.group.children]) { m.position.x += CAMP_AT.x; m.position.z += CAMP_AT.z; shafts.group.add(m); }
  const off = V(CAMP_AT.x, 0, CAMP_AT.z), seen = new Set();
  const shift = (v) => { if (v?.isVector3 && !seen.has(v)) { seen.add(v); v.add(off); } };
  for (const v of Object.values(C)) { if (v?.isVector3) shift(v); else if (v && typeof v === 'object' && !v.isObject3D && !(v instanceof World)) for (const u of Object.values(v)) shift(u); }
  for (const b of C.boats ?? []) { b.x += CAMP_AT.x; b.z += CAMP_AT.z; }

  // ------------------------------------------------------------ the regions
  const reg = { waystones: [], camps: [], champions: [], chests: [], shrines: [], npcs: [], items: [], landmarks: [], quests: [] };
  const top = (x, z) => W.groundBelow(x + 0.5, z + 0.5, sy - 1);
  for (const r of REGIONS) {
    const mod = REGION_MODULES[r.id];
    if (!mod?.build) continue;
    const ctx = regionContext({ W, k, deco, shafts, n, r, reg, top, seed });
    mod.build(ctx);
    for (const q of mod.QUESTS ?? []) reg.quests.push({ ...q, region: r.id });
  }
  // the camp's own waystone, by the campfire on the green
  const campWay = C.spawn.clone().add(V(4, 0, -3));
  placeWaystone(W, deco, reg, 'camp', 'camp', Math.floor(campWay.x), Math.floor(campWay.z));

  // ------------------------------------------------------------ roads between the regions
  // from the camp's east side and south woods out to each region's first waystone
  const road = (pts, id = B.dirt_road, w = 3) => layRoad(W, pts, id, w);
  road([[115, 160], [140, 160], [170, 170]], B.dirt_road);                    // the farm lane east, into the fields
  road([[110, 260], [140, 262], [170, 268]], B.dirt_path);                    // the woods trail
  road([[60, 303], [62, 330], [70, 350]], B.stone_brick);                     // south to the Labyrinth
  road([[60, 120], [62, 96], [70, 70]], B.gravel_path);                       // north out of the Road West strip to the shore
  road([[200, 170], [235, 165], [262, 190]], B.dirt_road);                    // the fields to the canyon
  road([[190, 140], [210, 120], [240, 95]], B.cobble);                        // the fields up to Othrys
  road([[200, 300], [235, 320], [262, 330]], B.basalt);                       // the woods down to Asphodel

  // ------------------------------------------------------------ edges
  // the sea: an invisible wall six blocks out (as in camp); the land edges walled
  for (let z = 0; z < sz; z++) { if (inCamp(4, z)) continue; const x = Math.max(0, coastAt(z) - 6); for (let y = FY - 3; y <= FY + 4; y++) if (!D[idx(x, y, z)] || D[idx(x, y, z)] === B.water) D[idx(x, y, z)] = B.barrier; }
  const wall = (x, z) => { const h = H[z * sx + x]; for (let y = Math.max(0, h - 2); y < Math.min(sy, h + 7); y++) D[idx(x, y, z)] = B.barrier; };
  for (let x = 0; x < sx; x++) { wall(x, 0); wall(x, sz - 1); }
  for (let z = 0; z < sz; z++) wall(sx - 1, z);
  W.collectBlockLights();
  // beyond the edges: the sea to the west, land elsewhere (flat planes, as round camp)
  const plane = (x0, z0, x1, z1, y, color, rough = 0.9, metal = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color, roughness: rough, metalness: metal }));
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; W.group.add(m);
  };
  plane(-500, -500, 0, sz + 500, FY - 0.2, 0x1f5a74, 0.15, 0.3);
  plane(0, -500, sx + 500, 0, FY - 0.2, 0x1f5a74, 0.15, 0.3);
  plane(sx, 0, sx + 500, sz + 500, FY - 0.02, 0x3a4a2c);
  plane(0, sz, sx, sz + 500, FY - 0.02, 0x2c2a30);

  const spawn = C.spawn.clone();
  return {
    ...C, world: W, deco, shafts, kit: k, spawn, stage: C.stage, boats: C.boats,
    ow: reg, openWorld: true, heights: H, regionGrid: grid,
  };
}

// Copy a built level (camp) into the big world at (ox, oz) and open its walled edges.
function embed(W, L, ox, oz) {
  const src = L.world, D = W.data;
  for (let y = 0; y < src.sy; y++) for (let z = 0; z < src.sz; z++) for (let x = 0; x < src.sx; x++) {
    const id = src.data[src.idx(x, y, z)];
    D[W.idx(x + ox, y, z + oz)] = id;
  }
  // the camp's outer walls (north, east, south): open them where the world goes on
  const open = (x, z) => {
    for (let y = FY - 3; y <= FY + 6; y++) {
      const i = W.idx(x + ox, y, z + oz);
      if (D[i] !== B.barrier) continue;
      D[i] = y >= FY ? 0 : y === FY - 1 ? B.grass : B.dirt;
    }
  };
  for (let x = 0; x < src.sx; x++) { open(x, 0); open(x, src.sz - 1); }
  for (let z = 0; z < src.sz; z++) open(src.sx - 1, z);
  for (const L2 of src.staticLights) W.staticLights.push({ ...L2, x: L2.x + ox, z: L2.z + oz });
  for (const r of src.roofs) W.roofs.push({ ...r, mesh: null, min: [r.min[0] + ox, r.min[1], r.min[2] + oz], max: [r.max[0] + ox, r.max[1], r.max[2] + oz], interior: r.interior.map((q) => [q[0] + ox, q[1], q[2] + oz]) });
}

// Lay a road of `id` blocks `w` wide along points [[x, z], ...] on the ground.
export function layRoad(W, pts, id, w = 3) {
  const top = (x, z) => W.groundBelow(x + 0.5, z + 0.5, W.sy - 1);
  const ok = new Set([B.grass, B.dirt, B.forest_floor, B.sand, B.desert_sand, B.gravel_path, B.rock, B.mud, B.farm_soil, B.asphodel, B.underworld_rock, B.basalt, B.red_rock, B.moss_floor, B.dead_leaves, B.wet_sand, B.stone]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
    for (let s = 0; s <= steps; s++) {
      const px = ax + (bx - ax) * s / steps, pz = az + (bz - az) * s / steps;
      for (let dz = -w; dz <= w; dz++) for (let dx = -w; dx <= w; dx++) {
        if (Math.hypot(dx, dz) > w / 2) continue;
        const x = Math.floor(px + dx), z = Math.floor(pz + dz);
        let y = top(x, z); if (!isFinite(y)) continue;
        while (y > 1 && [B.leaves, B.pine_leaves, B.poplar_leaves, B.log, B.pine_log].includes(W.get(x, y - 1, z))) y--;
        if (ok.has(W.get(x, y - 1, z))) W.set(x, y - 1, z, id);
        for (let yy = y; yy < y + 4; yy++) { const b = W.get(x, yy, z); if (b === B.leaves || b === B.pine_leaves || b === B.poplar_leaves) W.set(x, yy, z, 0); }
      }
    }
  }
}

// A waystone: a marble pillar with a gold cap and a soft light; walk up to it
// to remember it, then teleport between the ones you have found (the map).
function placeWaystone(W, deco, reg, region, id, x, z) {
  const y = W.groundBelow(x + 0.5, z + 0.5, W.sy - 1);
  if (!isFinite(y)) return null;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { W.set(x + dx, y - 1, z + dz, B.marble_floor); for (let k = 0; k < 3; k++) if (W.get(x + dx, y + k, z + dz) && !(dx === 0 && dz === 0)) W.set(x + dx, y + k, z + dz, 0); }
  W.set(x, y, z, B.waystone); W.set(x, y + 1, z, B.waystone); W.set(x, y + 2, z, B.gold_plate);
  W.addLight(x + 0.5, y + 3.2, z + 0.5, 0xffd890, 3, 8);
  const w = { id, region, name: t(`waystones.${id}`), pos: V(x + 0.5, y, z + 1.8), stone: V(x + 0.5, y + 1.5, z + 0.5) };
  reg.waystones.push(w);
  return w;
}

// What a region's build(ctx) gets: the world, the kit, its noise, a seeded
// random, ground lookups, and add.* to register the places the runtime runs.
function regionContext({ W, k, deco, shafts, n, r, reg, top, seed }) {
  const rand = rng(seed * 131 + REGIONS.indexOf(r) * 977);
  const inRegion = (x, z) => regionAt(x, z) === r;
  const [bx0, bz0, bx1, bz1] = r.rects.reduce((a, [x0, z0, x1, z1]) => [Math.min(a[0], x0), Math.min(a[1], z0), Math.max(a[2], x1), Math.max(a[3], z1)], [1e9, 1e9, -1e9, -1e9]);
  const at = (x, z) => V(x + 0.5, top(x, z), z + 0.5);
  // is a w × d footprint at (x, z) on fairly level, dry, empty ground in this region?
  const level = (x, z, w = 5, d = w, tol = 2) => {
    let lo = Infinity, hi = -Infinity;
    for (let zz = z - (d >> 1); zz <= z + (d >> 1); zz++) for (let xx = x - (w >> 1); xx <= x + (w >> 1); xx++) {
      if (!inRegion(xx, zz)) return false;
      const y = top(xx, zz); if (!isFinite(y)) return false;
      const b = W.get(xx, y - 1, zz); if (b === B.water || BLOCKS[b]?.liquid) return false;
      if (W.get(xx, y, zz)) return false;
      lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    return hi - lo <= tol;
  };
  const tag = (o) => ({ region: r.id, ...o });
  return {
    W, k, deco, shafts, n, rand, region: r, FY, B,
    bounds: { x0: bx0, z0: bz0, x1: bx1, z1: bz1 },
    inRegion, top, at, level,
    // flatten a footprint to height y (fill under, clear above)
    flatten(x0, z0, x1, z1, y, id = null) {
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const g = top(x, z); const cur = isFinite(g) ? W.get(x, g - 1, z) : B.dirt;
        for (let yy = Math.min(g, y) - 3; yy < y; yy++) if (yy >= 0) W.set(x, yy, z, yy === y - 1 ? (id ?? cur ?? B.dirt) : B.dirt);
        for (let yy = y; yy < y + 8; yy++) W.set(x, yy, z, 0);
      }
    },
    trees: { pine: (x, z, o) => pine(k, x, z, top(x, z), o), oak: (x, z, o) => oak(k, x, z, top(x, z), o), boulder: (x, z, R, id) => boulder(k, x, z, top(x, z) - 1, R, id) },
    scatter: (grounds, types, density, scale) => scatterOn(k, bx0, bz0, bx1 - 1, bz1 - 1, grounds, types, density, scale),
    road: (pts, id = B.dirt_path, w = 3) => layRoad(W, pts, id, w),
    add: {
      // id: unique; name text at waystones.<id>
      waystone: (id, x, z) => placeWaystone(W, deco, reg, r.id, id, x, z),
      // a monster camp: { id, x, z, kinds: [kind...], count, level?, radius?, chest?: 'common' | 'rare' }
      camp: (o) => { reg.camps.push(tag({ radius: 9, count: 5, chest: 'common', ...o, pos: at(o.x, o.z) })); },
      // a named champion: { id, x, z, kind, level?, elite? } (name text at champions.<id>)
      champion: (o) => { reg.champions.push(tag({ ...o, pos: at(o.x, o.z), name: t(`champions.${o.id}.name`) })); },
      // a treasure chest: { id, x, z, rarity: 'common' | 'rare' | 'epic', hidden? }
      chest: (o) => { reg.chests.push(tag({ rarity: 'common', ...o, pos: at(o.x, o.z) })); },
      // a shrine trial: { id, x, z, waves?: [[kind...], ...] } (name text at shrines.<id>)
      shrine: (o) => { const p = at(o.x, o.z); W.addLight(p.x, p.y + 2, p.z, 0xffc860, 3, 8); reg.shrines.push(tag({ ...o, pos: p, name: t(`shrines.${o.id}`) })); },
      // a person: { id, x, z, model: 'npc:<id>' | 'mortal:<id>' | 'hero:<id>', yaw?, quest? } (name text at people.<id>)
      npc: (o) => { reg.npcs.push(tag({ yaw: 0, ...o, pos: at(o.x, o.z), name: t(`people.${o.id}`) })); },
      // a quest item to pick up: { id, quest, x, z, look?: 'sparkle' | <deco prop kind> }
      item: (o) => { reg.items.push(tag({ look: 'sparkle', ...o, pos: at(o.x, o.z) })); },
      // a named place shown on the map: { id, x, z } (name text at places.<id>)
      landmark: (o) => { reg.landmarks.push(tag({ ...o, pos: at(o.x, o.z), name: t(`places.${o.id}`) })); },
    },
  };
}
