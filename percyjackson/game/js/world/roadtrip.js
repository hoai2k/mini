// The Road West, built: the highway from the New Jersey Turnpike to Santa
// Monica (world/rtLayout.js has the map), a separate area from the open world
// round camp. Walk the stops (truck stops, Aunty Em's, St. Louis, Denver, Las
// Vegas, Los Angeles, the beach), ride the stretches between some of them (the
// train over the river and across the plains, the zoo truck through the
// Rockies tunnel) and drive the taxi across the Nevada desert. Each stop
// (world/road/<id>.js) shapes its own ground and builds its own places,
// through the same ctx the open world's regions get (world/openworld.js
// regionContext). openworld/roadtrip.js runs the roadblocks, rides and the car.
//
// The voxels are small (1440 × 40 × 88, 5 MB); the World streams its chunk
// meshes in round the party (World.stream), and decorations are batched by
// tile, so the length costs memory, not frame time.
import * as THREE from 'three/webgpu';
import { World } from './voxel.js';
import { B, BLOCKS } from './blocks.js';
import { Kit } from './kit.js';
import { Decorations } from './deco.js';
import { LightShafts } from './shafts.js';
import { FY } from './camp.js';
import { RT_WORLD, RT_REGIONS, RT_LAYOUT, ROAD_Z, RAIL_Z, ROADBLOCKS, RT_ANCHORS, RIDES, DRIVE, RT_BUS_STOP, RT_GATES, rtRegionAt } from './rtLayout.js';
import { regionContext, placeWaystone, layRoad } from './openworld.js';
import { makeNoise } from './noise.js';
import { t } from '../text_config.js';
import * as turnpike from './road/turnpike.js';
import * as auntyem from './road/auntyem.js';
import * as stlouis from './road/stlouis.js';
import * as denver from './road/denver.js';
import * as vegas from './road/vegas.js';
import * as desert from './road/desert.js';
import * as la from './road/la.js';
import * as santamonica from './road/santamonica.js';

export const ROAD_MODULES = { rt_turnpike: turnpike, rt_auntyem: auntyem, rt_stlouis: stlouis, rt_denver: denver, rt_vegas: vegas, rt_desert: desert, rt_la: la, rt_santamonica: santamonica };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const RT_COAST = 14;   // the Pacific: x below this is sea

export function buildRoadTrip({ seed = 11 } = {}) {
  const { sx, sy, sz } = RT_WORLD;
  const W = new World(sx, sy, sz).stream(112);
  const deco = new Decorations(), shafts = new LightShafts();
  const k = new Kit(W, deco, shafts, seed);
  const n = makeNoise(seed);
  const D = W.data, idx = (x, y, z) => (y * sz + z) * sx + x;
  const H = new Int16Array(sx * sz);
  const regionOf = new Array(sx);
  for (let x = 0; x < sx; x++) regionOf[x] = rtRegionAt(x, ROAD_Z);

  // ------------------------------------------------------------ terrain
  // each stop's hills, flat along the highway (and the railway near the
  // stations), faded to flat at the ends of each stretch so they meet level
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const r = regionOf[x], i = z * sx + x;
    const mod = ROAD_MODULES[r.id];
    let h;
    if (r.ride === 'train' && r.id === 'rt_river') h = -5;                         // the river: water from bank to bank
    else if (r.ride === 'train') h = -10 + Math.round((n.fbm(x, z, 12, 2) - 0.5) * 3);   // the gorge across the plains
    else if (r.ride === 'truck') h = 15 + Math.round(n.fbm(x, z, 30, 3) * 10);    // the Rockies, with the tunnel through
    else {
      h = mod?.terrain?.height?.(x, z, n) ?? (n.fbm(x, z, 48, 3) - 0.35) * 8;
      const off = Math.abs(z - ROAD_Z), railOff = Math.abs(z - RAIL_Z);
      h *= smooth((off - 7) / 14) * smooth((railOff - 3) / 6);
      const edge = Math.min(x - r.x[0], r.x[1] - 1 - x);
      h *= smooth(edge / 16);
    }
    if (x < RT_COAST + 4) h = Math.min(h, x < RT_COAST ? -Math.min(3, Math.ceil((RT_COAST - x) / 2)) : 0);
    H[i] = Math.max(1, Math.min(sy - 6, Math.round(FY + h)));
  }
  // walkable slopes on the stops (steps of one block); the ride stretches keep their cliffs
  const walk = (x) => !regionOf[x].ride;
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) { const i = z * sx + x; if (!walk(x)) continue; if (x && walk(x - 1)) H[i] = Math.min(H[i], H[i - 1] + 1); if (z) H[i] = Math.min(H[i], H[i - sx] + 1); }
  for (let z = sz - 1; z >= 0; z--) for (let x = sx - 1; x >= 0; x--) { const i = z * sx + x; if (!walk(x)) continue; if (x < sx - 1 && walk(x + 1)) H[i] = Math.min(H[i], H[i + 1] + 1); if (z < sz - 1) H[i] = Math.min(H[i], H[i + sx] + 1); }
  // fill the columns
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const r = regionOf[x], mod = ROAD_MODULES[r.id], h = H[z * sx + x];
    let top;
    if (r.id === 'rt_river') top = B.mud;
    else if (r.ride === 'train') top = h < FY - 6 ? B.red_rock : B.rock;
    else if (r.ride === 'truck') top = h > FY + 18 ? B.rock : (z + x) % 7 ? B.rock : B.grass;
    else if (h < FY) top = x < RT_COAST ? B.sand : B.wet_sand;
    else top = mod?.terrain?.surface?.(x, z, h - FY, n) ?? B.grass;
    for (let y = 0; y < h; y++) D[idx(x, y, z)] = y === h - 1 ? top : y >= h - 4 ? (BLOCKS[top].step === 'sand' ? B.sand : B.dirt) : B.stone;
    const wl = r.id === 'rt_river' ? FY - 2 : r.ride === 'train' ? FY - 9 : FY;
    for (let y = h; y < wl; y++) D[idx(x, y, z)] = B.water;
  }

  // ------------------------------------------------------------ the highway
  // seven wide, a dashed yellow line, gravel shoulders; it runs the whole way
  // on the stops (the ride stretches carry their own: the broken bridge, the tunnel)
  const highway = (x0, x1) => {
    for (let x = x0; x < x1; x++) for (let dz = -5; dz <= 5; dz++) {
      const z = ROAD_Z + dz, y = FY - 1;
      for (let yy = y - 3; yy < y; yy++) D[idx(x, yy, z)] = yy === y - 1 ? B.dirt : B.stone;
      D[idx(x, y, z)] = Math.abs(dz) <= 3 ? (dz === 0 && x % 4 < 2 ? B.asphalt_line : B.asphalt) : B.gravel_path;
      for (let yy = FY; yy < FY + 7; yy++) D[idx(x, yy, z)] = 0;
    }
  };
  for (const r of RT_REGIONS) if (!r.ride) highway(Math.max(r.x[0], RT_COAST + 6), r.x[1]);
  // over the river: the old highway bridge, its middle fallen in ("Bridge out")
  const river = RT_REGIONS.find((r) => r.id === 'rt_river');
  for (let x = river.x[0]; x < river.x[1]; x++) {
    const mid = (river.x[0] + river.x[1]) / 2;
    if (Math.abs(x - mid) < 14) continue;
    for (let dz = -4; dz <= 4; dz++) { D[idx(x, FY - 1, ROAD_Z + dz)] = Math.abs(dz) === 4 ? B.guardrail : B.asphalt; D[idx(x, FY - 2, ROAD_Z + dz)] = B.concrete; }
    if ((x - river.x[0]) % 16 === 8) for (let y = 1; y < FY - 2; y++) for (const dz of [-2, 2]) D[idx(x, y, ROAD_Z + dz)] = B.concrete_pillar;
  }
  // through the Rockies: a tunnel for the truck, lit, with the road through it
  const rock = RT_REGIONS.find((r) => r.ride === 'truck');
  for (let x = rock.x[0]; x < rock.x[1]; x++) for (let dz = -5; dz <= 5; dz++) {
    const z = ROAD_Z + dz;
    for (let y = FY - 4; y < FY; y++) D[idx(x, y, z)] = y === FY - 1 ? (Math.abs(dz) <= 3 ? (dz === 0 && x % 4 < 2 ? B.asphalt_line : B.asphalt) : B.concrete) : B.stone;
    const roof = FY + 6 - (Math.abs(dz) >= 5 ? 1 : 0);
    for (let y = FY; y < roof; y++) D[idx(x, y, z)] = Math.abs(dz) === 5 ? B.concrete : 0;
    D[idx(x, roof, z)] = B.concrete;
    if (Math.abs(dz) === 5 && x % 12 === 0) W.addLight(x + 0.5, FY + 4, z + 0.5 - Math.sign(dz) * 0.6, 0xffc070, 2.5, 9);
  }
  // the tunnel mouths: concrete portals in the mountainside
  for (const x of [rock.x[0], rock.x[1] - 1]) for (let dz = -7; dz <= 7; dz++) for (let y = FY; y <= FY + 8; y++) {
    const z = ROAD_Z + dz; if (Math.abs(dz) <= 4 && y < FY + 6) continue;
    D[idx(x, y, z)] = B.concrete;
  }

  // ------------------------------------------------------------ the railway
  // stations at both ends of the two train stretches, the track between them
  // over the river (a viaduct) and the gorge (a timber trestle)
  const track = (x0, x1, deck, legs) => {
    for (let x = x0; x <= x1; x++) for (let dz = -2; dz <= 2; dz++) {
      const z = RAIL_Z + dz;
      D[idx(x, FY - 1, z)] = Math.abs(dz) === 1 ? B.rail : deck;
      for (let y = FY; y < FY + 6; y++) D[idx(x, y, z)] = 0;
      if (legs && (x - x0) % 10 === 5 && Math.abs(dz) === 2) for (let y = 1; y < FY - 1; y++) if (!D[idx(x, y, z)] || D[idx(x, y, z)] === B.water) D[idx(x, y, z)] = legs;
    }
  };
  const stations = [];
  for (const ride of RIDES.filter((r) => r.kind === 'train')) {
    const lo = Math.min(ride.from, ride.to), hi = Math.max(ride.from, ride.to);
    const r = RT_REGIONS.find((q) => q.id === ride.region);
    track(lo - 18, hi + 18, r.id === 'rt_river' ? B.stone_brick : B.dark_planks, r.id === 'rt_river' ? B.stone_brick : B.dark_planks);
    for (const at of [ride.from, ride.to]) stations.push({ ride, x: at, out: at === lo ? -1 : 1 });
  }
  // a station: a platform beside the track, a canopy, a bench and its sign
  for (const s of stations) {
    const x0 = s.x - 9, x1 = s.x + 9, z0 = RAIL_Z - 6, z1 = RAIL_Z - 3;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { D[idx(x, FY - 1, z)] = B.concrete; D[idx(x, FY, z)] = B.concrete; for (let y = FY + 1; y < FY + 6; y++) D[idx(x, y, z)] = 0; }
    for (let x = x0; x <= x1; x += 6) for (let y = FY + 1; y <= FY + 4; y++) D[idx(x, y, z0)] = B.steel_panel;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) D[idx(x, FY + 5, z)] = B.roof_slate;
    // steps up from the road side
    for (let x = s.x - 2; x <= s.x + 2; x++) { D[idx(x, FY, z0 - 1)] = 0; D[idx(x, FY - 1, z0 - 1)] = B.concrete; }
    deco.prop('bench', s.x + 4.5, FY + 1, z0 + 1.2, { rot: 0 });
    deco.prop('text_sign', s.x + 0.5, FY + 1, z0 + 0.6, { text: t('rt.signs.amtrak'), w: 3.2, h: 0.9, post: 2.4, bg: '#1e3a8a', fg: '#ffffff', border: '#c8282a' });
    W.addLight(s.x + 0.5, FY + 4.5, (z0 + z1) / 2 + 0.5, 0xfff0d0, 2.5, 10);
  }
  // a path from the highway up to each station
  for (const s of stations) layRoad(W, [[s.x, ROAD_Z + 5], [s.x, RAIL_Z - 7]], B.gravel_path, 3);

  // ------------------------------------------------------------ gates
  // a wall at each end of the ride and drive stretches: only the vehicles go through
  for (const gx of RT_GATES) for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) if (!D[idx(gx, y, z)] || D[idx(gx, y, z)] === B.water) D[idx(gx, y, z)] = B.barrier;

  // ------------------------------------------------------------ the stops
  const reg = { waystones: [], camps: [], champions: [], chests: [], shrines: [], npcs: [], items: [], landmarks: [], quests: [] };
  const top = (x, z) => W.groundBelow(x + 0.5, z + 0.5, sy - 1);
  for (const r of RT_REGIONS) {
    const mod = ROAD_MODULES[r.id];
    if (!mod?.build) continue;
    const ctx = regionContext({ W, k, deco, shafts, n, r, reg, top, seed, layout: RT_LAYOUT });
    Object.assign(ctx, { ROAD_Z, RAIL_Z, sign: (x, z, text, o = {}) => deco.prop('text_sign', x + 0.5, o.y ?? top(x, z), z + 0.5, { text, w: 3, h: 0.9, post: 2.2, ...o }) });
    mod.build(ctx);
    for (const q of mod.QUESTS ?? []) reg.quests.push({ ...q, region: r.id });
  }

  // ------------------------------------------------------------ the roadblocks' passes
  // at each one the land closes in (cliffs, hedges, walls): the road is the only way on
  const PASS = { wreck: B.rock, statues: B.leaves, bridge: null, rocks: B.rock, gate: B.concrete, beds: B.brownstone, shadow: B.black_marble };
  const blocks = ROADBLOCKS.map((rb) => ({ ...rb }));
  for (const rb of blocks) {
    const id = PASS[rb.kind];
    if (id) for (let x = rb.x - 2; x <= rb.x + 2; x++) for (let z = 1; z < sz - 1; z++) {
      if (Math.abs(z - ROAD_Z) <= 5) continue;
      const g = top(x, z), hh = 9 + ((x * 7 + z * 3) % 3);
      for (let y = Math.max(1, Math.floor(isFinite(g) ? g : FY) - 1); y < FY + hh; y++) D[idx(x, y, z)] = id;
    }
    // (the road itself: an invisible wall until the chapter is done: openworld/roadtrip.js lifts it)
    rb.wall = []; for (let z = ROAD_Z - 5; z <= ROAD_Z + 5; z++) for (let y = FY; y < FY + 8; y++) rb.wall.push([rb.x, y, z]);
    rb.pos = V(rb.x + 0.5, FY, ROAD_Z + 0.5);
  }
  // St. Louis: the Mississippi across the whole strip, under the lift bridge
  const bridge = blocks.find((b) => b.kind === 'bridge');
  for (let x = bridge.x - 7; x <= bridge.x + 7; x++) for (let z = 0; z < sz; z++) {
    if (Math.abs(z - ROAD_Z) <= 4 && Math.abs(x - bridge.x) > 4) { for (let y = FY - 4; y < FY; y++) D[idx(x, y, z)] = y === FY - 1 ? (Math.abs(z - ROAD_Z) === 4 ? B.guardrail : B.asphalt) : B.concrete; continue; }
    for (let y = 1; y < FY + 9; y++) D[idx(x, y, z)] = y < FY - 5 ? B.mud : y < FY - 1 ? B.water : 0;
  }
  bridge.gap = [bridge.x - 4, bridge.x + 4];
  // (kept out of the water: walls along both banks and the bridge's rails, and across both ends of the gap until it closes)
  for (let x = bridge.x - 8; x <= bridge.x + 8; x++) for (let z = 1; z < sz - 1; z++) {
    const dz = Math.abs(z - ROAD_Z), bank = Math.abs(x - bridge.x) === 8 && dz > 4, rail = dz === 4 && Math.abs(x - bridge.x) > 4;
    if (bank || rail) for (let y = FY - 1; y < FY + 3; y++) if (!D[idx(x, y, z)] || D[idx(x, y, z)] === B.water) D[idx(x, y, z)] = B.barrier;
  }
  bridge.wall = [];
  for (const x of [bridge.x - 5, bridge.x + 5]) for (let z = ROAD_Z - 3; z <= ROAD_Z + 3; z++) for (let y = FY; y < FY + 4; y++) bridge.wall.push([x, y, z]);
  for (const x of [bridge.x - 6, bridge.x + 6]) for (const dz of [-6, 6]) for (let y = 1; y < FY + 10; y++) D[idx(x, y, ROAD_Z + dz)] = B.steel_panel;   // the lift towers

  // ------------------------------------------------------------ edges
  for (let x = 0; x < sx; x++) for (const z of [0, sz - 1]) for (let y = 0; y < sy; y++) if (!D[idx(x, y, z)] || D[idx(x, y, z)] === B.water) D[idx(x, y, z)] = B.barrier;
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) { if (!D[idx(sx - 1, y, z)]) D[idx(sx - 1, y, z)] = B.barrier; const cx = RT_COAST - 6; if (!D[idx(cx, y, z)] || D[idx(cx, y, z)] === B.water) D[idx(cx, y, z)] = B.barrier; }
  W.collectBlockLights();
  // beyond the edges: the Pacific to the west, land elsewhere
  const plane = (x0, z0, x1, z1, y, color, rough = 0.9, metal = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color, roughness: rough, metalness: metal }));
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; W.group.add(m);
  };
  plane(-600, -300, 0, sz + 300, FY - 0.2, 0x1f5a74, 0.15, 0.3);
  plane(0, -300, sx + 300, 0, FY - 0.02, 0x4a5a34);
  plane(0, sz, sx + 300, sz + 300, FY - 0.02, 0x4a5a34);
  plane(sx, 0, sx + 600, sz, FY - 0.02, 0x4a5a34);   // (east of the Turnpike's end: more of New Jersey)

  // ------------------------------------------------------------ what the runtime needs
  const at = (x, z) => V(x + 0.5, top(x, z), z + 0.5);
  const anchors = {};
  for (const [key, [x, z]] of Object.entries(RT_ANCHORS)) anchors[key] = at(x, z);
  const busStop = at(RT_BUS_STOP[0], RT_BUS_STOP[1]);
  placeWaystone(W, deco, reg, 'rt_turnpike', 'rt_busstop', RT_BUS_STOP[0] - 6, RT_BUS_STOP[1] + 4);
  return {
    world: W, deco, shafts, kit: k, spawn: busStop.clone().add(V(-3, 0, 1)), anchors, busStop,
    ow: reg, roadTrip: true, layout: RT_LAYOUT, area: 'road', heights: H,
    roadblocks: blocks, rides: RIDES.map((r) => ({ ...r, y: FY })), drive: { ...DRIVE, y: FY }, gates: RT_GATES,
    stage: busStop.clone(), dummy: null,
  };
}
