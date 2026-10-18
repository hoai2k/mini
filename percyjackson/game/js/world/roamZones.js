// Where low-level monsters roam while you walk around (the Minecraft
// Dungeons feel), and where they never go. Pure data and helpers (no
// Three.js), so the node tests can check them; world/roaming.js runs them.
//
// Camp Half-Blood (coordinates after camp.js moves the camp NZ = 64 blocks
// south to make room for the Road West): the cabins, the Big House, the
// forge, the archery range, the climbing wall, the lake and the campfire are
// the protected core. In the books the woods are stocked with monsters for
// training, and nothing crosses the border on Half-Blood Hill: here monsters
// spawn in the east and south woods and along the Road West, and a monster
// that wanders into the core turns back.
export const rect = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });
export const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
export const inAny = (list, x, z) => list.some((r) => inRect(r, x, z));
export const rectCenter = (r) => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];

export const CAMP_CORE = [
  rect(10, 66, 80, 160),     // Half-Blood Hill's camp side, the Big House, the cabins, the lake, the pavilion
  rect(80, 66, 103, 110),    // the forge, the climbing wall, the archery range, the store paths
  rect(64, 150, 94, 168),    // the campfire and the amphitheatre
];
// roam areas: [rect, kinds as [kind, weight]], by place
export const CAMP_ROAM = [
  { name: 'east woods', area: rect(81, 111, 114, 132), kinds: [['pup', 4], ['spider', 4]] },
  { name: 'south woods', area: rect(2, 166, 114, 182), kinds: [['pup', 4], ['spider', 3]] },
  { name: 'south-east woods', area: rect(95, 140, 114, 170), kinds: [['pup', 3], ['spider', 4]] },
  { name: 'the farm road', area: rect(28, 40, 86, 63), kinds: [['pup', 4], ['spider', 2], ['stymphalian', 2]] },
  { name: 'the highway', area: rect(86, 18, 114, 56), kinds: [['scorpion', 2], ['stymphalian', 3], ['pup', 2]] },
  { name: 'the coast road', area: rect(18, 2, 86, 40), kinds: [['stymphalian', 3], ['pup', 3], ['scorpion', 1]] },
];

// Manhattan (the prologue): rats come out of alleys and storm drains.
export const CITY_ROAM_KINDS = [['rat', 1]];

export const ROAM_RULES = {
  minDist: 15,        // never closer than this to any hero
  maxDist: 30,        // and within this of one of them (it should be met soon)
  despawn: 48,        // gone when every hero is this far away (for a few seconds)
  capCamp: 9, capCity: 8, capOpen: 40,
  everyCamp: [7, 12], everyCity: [5, 8], everyOpen: [3, 6],   // seconds between packs (everyOpen: out in the open world's regions and on the Road West)
};

// Out in the open world and on the Road West the roaming monsters come in
// hordes (the Minecraft Dungeons feel): crowds of weak fodder to plow
// through, with now and then a tougher one in the middle of them.
// FODDER_KINDS: the swarm kinds (entities/fodder.js's, and the old minors
// that fight the same way); about three quarters of every region's weight.
export const FODDER_KINDS = new Set(['karpos', 'myrmex', 'myrmex_acid', 'crab', 'shade', 'spartoi', 'telekhine', 'rat', 'pup', 'spider']);
export const isFodder = (kind) => FODDER_KINDS.has(kind);
// how many of a kind come at once, [fewest, most]; a kind not listed comes alone
export const HORDE = {
  karpos: [6, 10], shade: [6, 10], rat: [5, 8], myrmex: [5, 8], crab: [4, 7], pup: [4, 7], spider: [4, 7], spartoi: [4, 7],
  myrmex_acid: [2, 3], telekhine: [2, 3],
  harpy: [2, 3], stymphalian: [2, 3], ghost: [2, 3], automaton: [2, 3], serpent: [1, 2],
};
// A roaming horde from a region's kinds ([[kind, weight]]): the kinds of its
// members, the one picked first. A tough kind (not fodder) brings a crowd of
// the region's fodder round it; a fodder horde now and then has a few of a
// second fodder kind in it. rnd(): [0, 1). room: at most this many.
export function hordeFor(kinds, rnd = Math.random, { room = Infinity } = {}) {
  const lead = pickKind(kinds, rnd());
  const fod = kinds.filter(([k]) => isFodder(k));
  const [a, b] = HORDE[lead] ?? [1, 1];
  const list = [];
  for (let i = a + Math.floor(rnd() * (b - a + 1)); i > 0; i--) list.push(lead);
  if (!isFodder(lead) && fod.length) for (let i = 3 + Math.floor(rnd() * 3); i > 0; i--) list.push(pickKind(fod, rnd()));
  else if (fod.length > 1 && rnd() < 0.35) { const other = fod.filter(([k]) => k !== lead); const k2 = pickKind(other, rnd()); for (let i = 2 + Math.floor(rnd() * 2); i > 0; i--) list.push(k2); }
  return list.slice(0, Math.max(0, room));
}

// A pick from [[kind, weight]] with r() in [0, 1).
export function pickKind(kinds, r) {
  const tw = kinds.reduce((s, k) => s + k[1], 0);
  let x = r * tw;
  for (const [k, w] of kinds) { x -= w; if (x <= 0) return k; }
  return kinds[kinds.length - 1][0];
}
// How many in a pack, and how tough, from how far the save has got
// (chapters finished): light on purpose.
export function packFor(chapters, kind, r) {
  const most = kind === 'scorpion' ? 1 : kind === 'stymphalian' ? 2 : 4;
  const n = (kind === 'scorpion' ? 1 : 2) + Math.floor(r * 2) + (chapters >= 6 ? 1 : 0);
  return { count: Math.max(1, Math.min(most, n)), level: 1 + Math.floor(Math.max(0, chapters) / 4) };
}
// The roam area at (x, z), or null (inside the core, or nowhere monsters go).
export function roamAreaAt(x, z, { core = CAMP_CORE, roam = CAMP_ROAM } = {}) {
  if (inAny(core, x, z)) return null;
  return roam.find((a) => inRect(a.area, x, z)) ?? null;
}
// Is (x, z) an allowed spawn spot, given where the heroes are ([[x, z], ...])?
export function spawnAllowed(x, z, heroes, { core = CAMP_CORE, roam = CAMP_ROAM, minDist = ROAM_RULES.minDist, maxDist = ROAM_RULES.maxDist } = {}) {
  if (roam && !roamAreaAt(x, z, { core, roam })) return false;
  if (inAny(core, x, z)) return false;
  let near = Infinity;
  for (const [hx, hz] of heroes) near = Math.min(near, Math.hypot(hx - x, hz - z));
  return near >= minDist && near <= maxDist;
}
