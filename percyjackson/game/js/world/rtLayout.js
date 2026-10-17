// The Road West: the quest's road trip from New Jersey to Los Angeles, one
// long strip of country you walk (and ride, and drive) from east to west, a
// separate area from the open world round camp (world/owLayout.js). The
// Greyhound from the bus stop past Half-Blood Hill brings you to its east end.
// Pure data and helpers (no Three.js), so the node tests can check them;
// world/roadtrip.js builds it, openworld/roadtrip.js runs its roadblocks,
// rides and the car.
//
// Axes as everywhere: +x east, +z south. The highway runs along z = ROAD_Z,
// the railway along z = RAIL_Z. You travel towards x = 0 (west, left on the map).
//
//   x 1440      1260      1108     972      818      690     556      436     318     204       70    0
//   | Turnpike | Aunty Em | river  | St.    | plains | Denver | Rockies| Vegas | desert | Los     | Santa |
//   | (truck   | (gnomes) | (train)| Louis  | (train)|        | (truck)|       | (drive)| Angeles | Monica|
//   |  stop)   |          |        | (Arch) |        |        |        |       |        |         |       |
export const RT_WORLD = { sx: 1440, sy: 40, sz: 88 };
export const ROAD_Z = 44;   // the highway's middle (seven wide)
export const RAIL_Z = 66;   // the railway's middle

// Each stretch of the road, east to west. level: monster levels; kinds:
// roaming monsters as [kind, weight]; safe: no roaming monsters. ride: a
// stretch you can't cross on foot, only on the train or the truck (from a
// station or stop at each end); drive: one you cross in the car.
export const RT_REGIONS = [
  { id: 'rt_turnpike', x: [1260, 1440], level: [3, 4], biome: 'rt_turnpike',
    kinds: [['harpy', 2], ['pup', 3], ['hellhound', 1], ['fury', 1]] },
  { id: 'rt_auntyem', x: [1108, 1260], level: [4, 5], biome: 'rt_auntyem',
    kinds: [['gorgon_statue', 2], ['pup', 2], ['spider', 2], ['dracaena', 1]] },
  { id: 'rt_river', x: [972, 1108], level: [5, 5], biome: 'rt_river', safe: true, ride: 'train' },
  { id: 'rt_stlouis', x: [818, 972], level: [5, 6], biome: 'rt_stlouis',
    kinds: [['spider', 3], ['skeleton', 2], ['stymphalian', 2], ['empousa', 1]] },
  { id: 'rt_plains', x: [690, 818], level: [6, 6], biome: 'rt_plains', safe: true, ride: 'train' },
  { id: 'rt_denver', x: [556, 690], level: [6, 7], biome: 'rt_denver',
    kinds: [['skeleton', 2], ['hellhound', 2], ['spider', 2], ['stymphalian', 1]] },
  { id: 'rt_rockies', x: [436, 556], level: [7, 7], biome: 'rt_rockies', safe: true, ride: 'truck' },
  { id: 'rt_vegas', x: [318, 436], level: [7, 8], biome: 'rt_vegas',
    kinds: [['empousa', 2], ['skeleton', 2], ['harpy', 2], ['scorpion', 1]] },
  { id: 'rt_desert', x: [204, 318], level: [8, 9], biome: 'rt_desert', safe: true, drive: true },
  { id: 'rt_la', x: [70, 204], level: [9, 10], biome: 'rt_la',
    kinds: [['skeleton', 3], ['ghost', 2], ['hellhound', 2], ['fury', 1]] },
  { id: 'rt_santamonica', x: [0, 70], level: [11, 12], biome: 'rt_santamonica',
    kinds: [['harpy', 2], ['skeleton', 2], ['ghost', 1]] },
].map((r) => ({ ...r, rects: [[r.x[0], 0, r.x[1], RT_WORLD.sz]] }));
export const RT_REGION = Object.fromEntries(RT_REGIONS.map((r) => [r.id, r]));

export function rtRegionAt(x, z) {
  if (z < 0 || z >= RT_WORLD.sz) return null;
  for (const r of RT_REGIONS) if (x >= r.x[0] && x < r.x[1]) return r;
  return null;
}
// Monster level: harder towards the west end of each stretch.
export function rtLevelAt(region, x, z, r = 0.5) {
  const [a, b] = region.level ?? [1, 1], [x0, x1] = region.x ?? [0, 1];
  const k = Math.min(1, Math.max(0, (x1 - x) / (x1 - x0)));
  return Math.max(1, Math.min(b, Math.round(a + (b - a) * (k * 0.7 + r * 0.3))));
}

// The roadblocks: each closes the road at x until its chapter is done, then
// opens (an animation, the first time you see it: openworld/roadtrip.js). The
// chapter's start marker stands in front of it, on the east side. anchor: the
// chapter's start (story/chapters.js start.at).
//   kind: how it looks and opens (built by openworld/roadtrip.js)
export const ROADBLOCKS = [
  { id: 'bus_wreck', chapter: 'lt4', anchor: 'road1', x: 1268, kind: 'wreck' },
  { id: 'statue_wall', chapter: 'lt5', anchor: 'road2', x: 1150, kind: 'statues' },
  { id: 'lift_bridge', chapter: 'lt6', anchor: 'road3', x: 866, kind: 'bridge' },
  { id: 'rockslide', chapter: 'lt7', anchor: 'road4', x: 590, kind: 'rocks' },
  { id: 'lotus_gate', chapter: 'lt8', anchor: 'road5', x: 344, kind: 'gate' },
  { id: 'waterbeds', chapter: 'lt9', anchor: 'road6', x: 172, kind: 'beds' },
  { id: 'shadow_wall', chapter: 'lt10', anchor: 'road7', x: 80, kind: 'shadow' },
];
// Where each chapter starts (its marker), for the chapters with no roadblock
// after them (the final two, at Santa Monica).
export const RT_ANCHORS = {
  road1: [1276, ROAD_Z - 6], road2: [1186, ROAD_Z + 10], road3: [902, ROAD_Z - 12], road4: [628, ROAD_Z + 12],
  road5: [372, ROAD_Z - 12], road6: [186, ROAD_Z + 10], road7: [112, ROAD_Z - 10], road8: [40, ROAD_Z + 8], road9: [14, ROAD_Z - 2],
};

// The rides: a vehicle that carries the party between two stops. from/to: the
// x of each end's boarding spot (either end works, in either direction); z:
// where the vehicle runs. kind: what it is (world/vehicles.js).
export const RIDES = [
  { id: 'amtrak_east', kind: 'train', from: 1120, to: 962, z: RAIL_Z, region: 'rt_river' },
  { id: 'amtrak_west', kind: 'train', from: 830, to: 676, z: RAIL_Z, region: 'rt_plains' },
  { id: 'zoo_truck', kind: 'truck', from: 566, to: 430, z: ROAD_Z + 2, region: 'rt_rockies' },
];
// The car you drive across the desert: where it is parked at each end.
export const DRIVE = { id: 'taxi', from: 326, to: 196, z: ROAD_Z + 2, region: 'rt_desert' };
// The bus stop at the east end, where the Greyhound from camp stops (and takes you back).
export const RT_BUS_STOP = [1420, ROAD_Z + 6];
// The gates across the ride and drive stretches: blocks only the vehicles go through.
// (at each end of every ride or drive stretch: a wall one block thick at x)
export const RT_GATES = RT_REGIONS.filter((r) => r.ride || r.drive).flatMap((r) => [r.x[1] - 1, r.x[0]]);

export const RT_LAYOUT = { id: 'rt', area: 'road', WORLD: RT_WORLD, REGIONS: RT_REGIONS, REGION: RT_REGION, regionAt: rtRegionAt, levelAt: rtLevelAt };
