/** Authored districts for the 3D edition. A district is an open region with a
 * spine of chapters, placed stand-ins (structures, props), shadows and a far
 * landmark. Positions are metres; z runs toward the landmark (negative z is
 * "forward" into the region, matching the stand-in viewer's dioramas).
 */
export interface Placement {
  id: string;
  x: number;
  z: number;
  /** Height offset above the terrain (mode r) or absolute height (mode a). */
  y?: number;
  yaw?: number;
  opts?: Record<string, unknown>;
  mode?: 'r' | 'a';
  /** A moving structure: it shuttles between its placement and `to` and back,
   * carrying whatever stands on it. Speed in m/s, dwell in seconds at each end. */
  moving?: { to: { x: number; z: number; y?: number }; speed: number; dwell?: number };
}
export type ShadowKind = 'shadeHound' | 'seedSpitter' | 'windowRay' | 'spireLeech' | 'cragTortoise' | 'riftCondor';
export interface ShadowSpawn {
  id: string;
  kind: ShadowKind;
  x: number;
  z: number;
  /** Height above terrain (ground shadows) or absolute for flyers (mode a). */
  y?: number;
  mode?: 'r' | 'a';
  /** Encounter group; wave n appears when wave n-1 of the group is down.
   * A group named after a stronghold is its host: dormant until the
   * stronghold activates, then released in `delay` order. */
  group?: string;
  wave?: number;
  patrol?: number;
  /** How the shadow arrives when its stronghold activates: 'drop' falls in
   * from high above, 'leap' waits crouched on its perch and pounces when
   * Hopper is close, 'emerge' rises out of the ground with a flash, 'ambush'
   * stays hidden until Hopper has passed it. Default: already there. */
  entry?: 'drop' | 'leap' | 'emerge' | 'ambush';
  /** Seconds after the stronghold activates before this shadow appears. */
  delay?: number;
}
export interface Chapter {
  name: string;
  z0: number;
  z1: number;
  beat: string;
}
/** A gate knot: lockdown emitters raise a dome around it when Hopper enters;
 * it drops when every shadow of `group` is down. The exit needs it cleared. */
export interface Gate {
  id: string;
  x: number;
  z: number;
  r: number;
  group: string;
  /** Height offset of the dome centre above the terrain. */
  y?: number;
}
/** A stronghold: a battle cluster around something tall enough to see from
 * the previous interlude. Its host (shadows whose group is the stronghold id)
 * pours out when Hopper comes within r; when the host is down the region is
 * freed. `seal` raises a lockdown dome while the fight lasts (the final knot
 * of a district). The exit needs every stronghold freed. */
export interface Stronghold {
  id: string;
  name: string;
  x: number;
  z: number;
  r: number;
  /** Height offset of the field centre above the terrain. */
  y?: number;
  seal?: boolean;
}
/** A caged signal: only a reflected shot at its lock opens the bars. */
export interface Cage {
  id: string;
  x: number;
  z: number;
  y?: number;
  mode?: 'r' | 'a';
}
export interface BossSpec {
  kind: 'nightRook';
  x: number;
  z: number;
  /** Arena centre height above terrain and radius of its lockdown dome. */
  y: number;
  r: number;
}
export interface District {
  region: string;
  mission: number;
  name: string;
  subtitle: string;
  size: number;
  terrain: {
    seed: number;
    relief: number;
    plateaus?: { x: number; z: number; r: number; y: number }[];
    valley?: { axis: 'x' | 'z'; at: number; width: number; depth: number } | null;
  };
  horizon?: { height?: number; gap?: { angle: number; width: number } };
  placements: Placement[];
  shadows: ShadowSpawn[];
  chapters: Chapter[];
  /** Legacy sealed strongholds; prefer `strongholds`. */
  gates?: Gate[];
  strongholds?: Stronghold[];
  cages?: Cage[];
  boss?: BossSpec;
  start: { x: number; z: number; yaw: number };
  /** Reaching this ends the district. */
  exit: { x: number; z: number; r: number; name: string };
  landmark: { name: string; x: number; z: number };
  /** The trail's waypoints in order, start to exit, through every totem in
   * checkpoint order. The camera faces along it and the ground is dressed
   * along it. Omitted, the route runs start → totems → exit in straight legs. */
  route?: { x: number; z: number }[];
}

const P = (id: string, x: number, z: number, y = 0, yaw = 0, opts?: Record<string, unknown>, mode: 'r' | 'a' = 'r'): Placement => ({ id, x, z, y, yaw, opts, mode });
/** The trail through a district: start, every totem in checkpoint order and
 * the exit, with a gentle swing to alternate sides between totems so the
 * road winds through the props instead of running dead straight. The swing
 * stays inside the clear path (|x| < 30) that the jump elements sit on. */
function windingRoute(placements: Placement[], start: { x: number; z: number }, exit: { x: number; z: number }, swing = 26): { x: number; z: number }[] {
  const totems = placements
    .filter((p) => p.id === 'prop.checkpointTotem')
    .map((p) => ({ x: p.x, z: p.z }))
    .sort((a, b) => Math.hypot(a.x - start.x, a.z - start.z) - Math.hypot(b.x - start.x, b.z - start.z));
  const stops = [start, ...totems, exit];
  const route: { x: number; z: number }[] = [];
  for (let i = 0; i < stops.length; i++) {
    route.push({ x: stops[i].x, z: stops[i].z });
    const next = stops[i + 1];
    if (!next || Math.hypot(next.x - stops[i].x, next.z - stops[i].z) < 120) continue;
    // An S between the two: out to one side at a third of the way, back to
    // the other at two thirds, so every leg bends both ways.
    const side = i % 2 ? -1 : 1;
    // Short legs get a shallower swing, so the bend never turns more than the camera can follow.
    const amp = Math.min(swing, Math.hypot(next.x - stops[i].x, next.z - stops[i].z) * 0.09);
    route.push({ x: stops[i].x + (next.x - stops[i].x) / 3 + side * amp, z: stops[i].z + (next.z - stops[i].z) / 3 });
    route.push({ x: stops[i].x + ((next.x - stops[i].x) * 2) / 3 - side * amp, z: stops[i].z + ((next.z - stops[i].z) * 2) / 3 });
  }
  return route;
}
const S = (id: string, kind: ShadowKind, x: number, z: number, extra: Partial<ShadowSpawn> = {}): ShadowSpawn => ({ id, kind, x, z, ...extra });

/** Sunseed Fields: the first district. Three granaries along −z, each a
 * stronghold visible from the interlude before it, the Crownline skyline on
 * the horizon. Hosts are named after their stronghold and pour out when
 * Hopper reaches it; the road between is scenic and nearly empty. */
export function sunseedFields(): District {
  const placements: Placement[] = [
    // Interlude 1 · Irrigation lesson (0 → -370): a clear road, the silo and farmhouse to wall-kick on the left, a two-tier terrace to hop on the road.
    P('prop.checkpointTotem', 0, 20),
    P('structure.fields.silo', -52, -84),
    P('structure.fields.farmhouse', -90, -110, 0, 0.3),
    P('prop.signalBeacon', -90, -110, 13.5, 0),
    P('structure.fields.windbreak', 120, -160, 0, 1.2),
    P('structure.fields.terraceStep', 0, -200, 0, 0, { w: 48, d: 30, h: 5, tiers: 2 }),
    P('structure.fields.farmhouse', 110, -250, 0, -0.5),
    P('structure.fields.windbreak', -160, -280, 0, 0.9),
    P('prop.checkpointTotem', 0, -370),
    // Stronghold 1 · The Orchard Granary (centre 40,-560, r 190): three silos close together, two farmhouses, the big terrace and a seed pod.
    P('prop.springPad', 80, -410),
    P('structure.fields.terraceStep', 130, -520, 0, -0.2, { w: 110, d: 70, h: 8, tiers: 3 }),
    P('structure.fields.silo', -30, -560, 0, 0, { h: 40 }),
    P('structure.fields.silo', -58, -540, 0, 0, { h: 36 }),
    P('structure.fields.silo', -50, -590, 0, 0, { h: 38 }),
    P('structure.fields.farmhouse', 20, -620, 0, 0.2),
    P('structure.fields.farmhouse', -20, -680, 0, -0.6),
    P('structure.fields.terraceStep', 60, -640, 0, 0.5, { w: 80, d: 50, h: 7, tiers: 2 }),
    P('structure.fields.seedPod', 110, -600, 0, 0.6),
    P('structure.fields.windbreak', 240, -560, 0, 0.1),
    P('structure.fields.windbreak', -200, -620, 0, 1.0),
    P('prop.recoveryCapsule', 130, -520, 25),
    P('prop.signalBeacon', -30, -560, 41, 0),
    P('prop.checkpointTotem', 0, -750),
    // Interlude 2 · Windbreak ridges (-750 → -1080): the thermal lifts Hopper onto the ridge; the irrigation cut drops the road and its spring pad throws it back up.
    P('prop.thermalVent', -100, -780, 0, 0, { height: 140 }),
    P('structure.fields.windbreak', -220, -840, 0, 0.9),
    P('structure.fields.windbreak', -260, -930, 0, 0.8),
    P('structure.fields.silo', -300, -880, 0, 0, { h: 30 }),
    P('structure.fields.windbreak', 190, -820, 0, -0.3),
    P('structure.fields.farmhouse', 170, -940, 0, 0.4),
    P('structure.fields.terraceStep', -20, -880, 0, 0, { w: 40, d: 30, h: 6, tiers: 2 }),
    P('prop.signalBeacon', -40, -1000, 2, 0),
    P('prop.springPad', 20, -1010),
    P('prop.checkpointTotem', 0, -1080),
    // Stronghold 2 · The Seedfall Granary (centre 0,-1270, r 190): the fallen vessels among three silos and two farmhouses.
    P('structure.fields.farmhouse', -30, -1180, 0, -0.4),
    P('prop.recoveryCapsule', -30, -1180, 13),
    P('structure.fields.seedPod', 70, -1250, 0, 0.6),
    P('structure.fields.seedPod', -120, -1330, 0, -0.9, { r: 7 }),
    P('structure.fields.silo', 30, -1300, 0, 0, { h: 40 }),
    P('structure.fields.silo', 58, -1320, 0, 0, { h: 36 }),
    P('structure.fields.silo', 40, -1350, 0, 0, { h: 38 }),
    P('structure.fields.farmhouse', -40, -1380, 0, 0.5),
    P('structure.fields.windbreak', -220, -1260, 0, 0.2),
    P('structure.fields.windbreak', 210, -1320, 0, -0.2),
    P('structure.fields.terraceStep', -90, -1420, 0, 0.3, { w: 70, d: 40, h: 6, tiers: 2 }),
    P('prop.signalBeacon', 30, -1300, 41, 0),
    P('prop.checkpointTotem', 0, -1460),
    // Interlude 3 · Road to Crownline (-1460 → -1760): the rising road under windbreaks, a spring pad and a three-tier terrace on it.
    P('structure.fields.windbreak', -110, -1540, 0, 0.05),
    P('structure.fields.windbreak', 120, -1600, 0, -0.05),
    P('structure.fields.silo', -150, -1680, 0, 0, { h: 28 }),
    P('structure.fields.farmhouse', 140, -1700, 0, 0.6),
    P('prop.springPad', 0, -1520),
    P('structure.fields.terraceStep', 0, -1600, 0, 0, { w: 60, d: 40, h: 6, tiers: 3 }),
    P('prop.signalBeacon', -150, -1680, 29, 0),
    P('prop.checkpointTotem', 0, -1760),
    // Stronghold 3 · The Crownline Gate (sealed; centre 0,-1960, r 200): the last granary on the plateau before the city road.
    P('structure.fields.silo', -40, -1990, 0, 0, { h: 40 }),
    P('structure.fields.silo', -70, -1970, 0, 0, { h: 38 }),
    P('structure.fields.silo', -58, -2020, 0, 0, { h: 36 }),
    P('structure.fields.farmhouse', 50, -1920, 0, -0.3),
    P('structure.fields.farmhouse', 80, -1990, 0, 0.4),
    P('structure.fields.seedPod', -110, -2060, 0, 0.9),
    P('structure.fields.windbreak', -170, -1900, 0, 0.1),
    P('structure.fields.windbreak', 170, -2020, 0, -0.1),
    P('structure.fields.terraceStep', 70, -2070, 0, 0.2, { w: 70, d: 40, h: 6, tiers: 2 }),
    P('prop.recoveryCapsule', 0, -1900, 0),
    P('prop.signalBeacon', -40, -1990, 41, 0),
    P('prop.checkpointTotem', 0, -1990),
  ];
  const shadows: ShadowSpawn[] = [
    // Interlude 1 patrol.
    S('h1', 'shadeHound', 40, -230, { group: 'lesson' }),
    S('h2', 'shadeHound', 90, -300, { group: 'lesson' }),
    // The granary's lookout: a rooted spitter already on the big terrace.
    S('s1', 'seedSpitter', 130, -520, { y: 24.6 }),
    // Stronghold 1 host.
    S('g1', 'shadeHound', -30, -560, { y: 40, group: 'granary', entry: 'leap', delay: 0 }),
    S('g2', 'shadeHound', -50, -590, { y: 38, group: 'granary', entry: 'leap', delay: 1 }),
    S('r1', 'windowRay', 60, -500, { y: 106, mode: 'a', group: 'granary', entry: 'drop', delay: 1.5 }),
    S('r2', 'windowRay', -20, -640, { y: 100, mode: 'a', group: 'granary', entry: 'drop', delay: 3 }),
    S('g5', 'shadeHound', 10, -520, { group: 'granary', entry: 'emerge', delay: 0.5 }),
    S('g6', 'shadeHound', -10, -600, { group: 'granary', entry: 'emerge', delay: 2 }),
    S('g3', 'shadeHound', 20, -636, { group: 'granary', entry: 'ambush', delay: 4 }),
    S('s2', 'seedSpitter', 60, -640, { y: 14.6, group: 'granary', entry: 'emerge', delay: 2.5 }),
    S('g7', 'shadeHound', -40, -560, { group: 'granary', wave: 1, entry: 'emerge' }),
    S('g4', 'shadeHound', 60, -580, { group: 'granary', wave: 1, entry: 'emerge' }),
    S('r3', 'windowRay', 40, -560, { y: 110, mode: 'a', group: 'granary', wave: 1, entry: 'drop' }),
    // Interlude 2 patrol on the ridge: a pair, and a third that comes when both are down.
    S('h3', 'shadeHound', -20, -920, { group: 'ridge' }),
    S('h4', 'shadeHound', 30, -960, { group: 'ridge' }),
    S('h5', 'shadeHound', 0, -940, { group: 'ridge', wave: 1 }),
    // Stronghold 2 host.
    S('sf1', 'shadeHound', 30, -1300, { y: 40, group: 'seedfall', entry: 'leap', delay: 0 }),
    S('sf2', 'shadeHound', 40, -1350, { y: 38, group: 'seedfall', entry: 'leap', delay: 1.5 }),
    S('r4', 'windowRay', 0, -1220, { y: 94, mode: 'a', group: 'seedfall', entry: 'drop', delay: 1 }),
    S('r5', 'windowRay', -60, -1320, { y: 90, mode: 'a', group: 'seedfall', entry: 'drop', delay: 3.5 }),
    S('h6', 'shadeHound', 20, -1230, { group: 'seedfall', entry: 'emerge', delay: 0.5 }),
    S('h7', 'shadeHound', -20, -1290, { group: 'seedfall', entry: 'emerge', delay: 2 }),
    S('h8', 'shadeHound', 10, -1340, { group: 'seedfall', entry: 'emerge', delay: 4 }),
    S('h9', 'shadeHound', 70, -1268, { group: 'seedfall', entry: 'ambush', delay: 5 }),
    S('s3', 'seedSpitter', -30, -1180, { y: 12.2, group: 'seedfall', entry: 'emerge', delay: 0 }),
    S('sf3', 'shadeHound', -100, -1330, { group: 'seedfall', wave: 1, entry: 'emerge' }),
    S('sf4', 'shadeHound', 60, -1250, { group: 'seedfall', wave: 1, entry: 'emerge' }),
    S('r6', 'windowRay', 0, -1300, { y: 100, mode: 'a', group: 'seedfall', wave: 1, entry: 'drop' }),
    // Interlude 3 patrol: two rays over the road.
    S('rr1', 'windowRay', 0, -1560, { y: 100, mode: 'a', group: 'road' }),
    S('rr2', 'windowRay', 40, -1640, { y: 108, mode: 'a', group: 'road' }),
    // Stronghold 3 host.
    S('gt1', 'shadeHound', -40, -1990, { y: 40, group: 'gate', entry: 'leap', delay: 0 }),
    S('gt2', 'shadeHound', -58, -2020, { y: 36, group: 'gate', entry: 'leap', delay: 1 }),
    S('gt3', 'shadeHound', -70, -1970, { y: 38, group: 'gate', entry: 'leap', delay: 2.5 }),
    S('r7', 'windowRay', 0, -1900, { y: 132, mode: 'a', group: 'gate', entry: 'drop', delay: 1 }),
    S('r8', 'windowRay', 40, -2000, { y: 140, mode: 'a', group: 'gate', entry: 'drop', delay: 3 }),
    S('h10', 'shadeHound', 20, -1930, { group: 'gate', entry: 'emerge', delay: 0.5 }),
    S('h11', 'shadeHound', -20, -1980, { group: 'gate', entry: 'emerge', delay: 2 }),
    S('h12', 'shadeHound', 10, -2030, { group: 'gate', entry: 'emerge', delay: 4 }),
    S('h13', 'shadeHound', 50, -1938, { group: 'gate', entry: 'ambush', delay: 5 }),
    S('s4', 'seedSpitter', 70, -2070, { y: 12.6, group: 'gate', entry: 'emerge', delay: 1.5 }),
    S('gt4', 'shadeHound', -100, -2060, { group: 'gate', wave: 1, entry: 'emerge' }),
    S('gt5', 'shadeHound', 60, -1990, { group: 'gate', wave: 1, entry: 'emerge' }),
    S('r9', 'windowRay', 0, -1960, { y: 140, mode: 'a', group: 'gate', wave: 1, entry: 'drop' }),
  ];
  return {
    region: 'fields',
    mission: 0,
    name: 'Sunseed Fields',
    subtitle: 'Eyes forward. Wings open. Feet downward.',
    size: 4800,
    terrain: {
      seed: 11,
      relief: 34,
      plateaus: [
        { x: 0, z: 0, r: 140, y: 2 },
        { x: 40, z: -560, r: 220, y: 26 },
        { x: -220, z: -880, r: 220, y: 60 },
        { x: 0, z: -1270, r: 230, y: 14 },
        { x: 0, z: -1600, r: 120, y: 32 },
        { x: 0, z: -1960, r: 260, y: 52 },
      ],
      valley: { axis: 'x', at: -1000, width: 110, depth: 42 },
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Irrigation lesson', z0: 0, z1: -370, beat: 'learn' },
      { name: 'Orchard terraces', z0: -370, z1: -750, beat: 'fight' },
      { name: 'Windbreak ridges', z0: -750, z1: -1080, beat: 'run' },
      { name: 'The seedfall valley', z0: -1080, z1: -1460, beat: 'fight' },
      { name: 'Road to Crownline', z0: -1460, z1: -2200, beat: 'finish' },
    ],
    strongholds: [
      { id: 'granary', name: 'The Orchard Granary', x: 40, z: -560, r: 190, y: 20 },
      { id: 'seedfall', name: 'The Seedfall Granary', x: 0, z: -1270, r: 190, y: 20 },
      { id: 'gate', name: 'The Crownline Gate', x: 0, z: -1960, r: 200, y: 20, seal: true },
    ],
    start: { x: 0, z: 40, yaw: Math.PI },
    exit: { x: 0, z: -2000, r: 30, name: 'The road to Crownline' },
    landmark: { name: 'Crownline City', x: 0, z: -3200 },
    route: windingRoute(placements, { x: 0, z: 40 }, { x: 0, z: -2000 }),
  };
}

/** Crownline City: the second district. The street climbs 270 m to the
 * observatory through three strongholds of ivory towers, the Thunderhead
 * summit on the horizon the whole way. Elevated structures that don't rest on
 * the terrain (the train car riding its rail span) use mode 'a' with an
 * absolute height computed from the structure they stand on. */
export function crownlineCity(): District {
  // The rail span in the transit canyon stands on the y 70 plateau; its deck
  // top is 34 + 1.2 above the span's base, which is sunk 1.5 m into the ground.
  const trainY = 70 - 1.5 + 35.2;
  const placements: Placement[] = [
    // Interlude 1 · Ivory roof ladder (20 → -400): three roof decks a tap-jump apart on the street, taller blocks either side.
    P('prop.checkpointTotem', 0, -10),
    P('structure.city.roofDeck', 80, -70, 0, 0.3, { w: 36, d: 24, h: 30 }),
    P('structure.city.roofDeck', -80, -100, 0, -0.2, { w: 38, d: 24, h: 42 }),
    P('prop.signalBeacon', 150, -40, 2, 0),
    P('structure.city.roofDeck', 0, -140, 0, 0, { w: 30, d: 24, h: 18 }),
    P('structure.city.roofDeck', 0, -195, 0, 0, { w: 30, d: 24, h: 36 }),
    P('structure.city.roofDeck', 0, -250, 0, 0, { w: 30, d: 24, h: 18 }),
    P('structure.city.roofDeck', 90, -230, 0, 0.1, { w: 40, d: 26, h: 55 }),
    P('structure.city.roofDeck', -90, -300, 0, 0.4, { w: 42, d: 28, h: 65 }),
    P('structure.city.billboard', -70, -370, 0, 0.2, { height: 30, h: 12, w: 24 }),
    P('structure.city.billboard', 70, -390, 0, -0.2, { height: 34, h: 12, w: 24 }),
    P('prop.checkpointTotem', 0, -400),
    // Stronghold 1 · The Ivory Ward (centre 0,-600, r 190): two towers over a square, a low block in the middle, a spring pad up.
    P('structure.city.ivoryTower', -70, -560, 0, 0.1, { h: 110 }),
    P('structure.city.ivoryTower', 80, -640, 0, -0.15, { h: 130 }),
    P('structure.city.roofDeck', -110, -680, 0, 0.25, { w: 38, d: 26, h: 40 }),
    P('structure.city.roofDeck', 130, -530, 0, -0.3, { w: 36, d: 24, h: 36 }),
    P('structure.city.roofDeck', 10, -600, 0, 0, { w: 34, d: 24, h: 24 }),
    P('structure.city.billboard', -40, -700, 0, 0.2, { height: 30, h: 12, w: 24 }),
    P('prop.springPad', 40, -560, 0, 0, { w: 10 }),
    P('prop.signalBeacon', -70, -560, 112, 0),
    P('prop.signalBeacon', 80, -640, 132, 0),
    P('prop.recoveryCapsule', -30, -640, 3),
    P('prop.checkpointTotem', 0, -790),
    // Interlude 2 · Transit canyon (-790 → -1090): the elevated rail runs down the street with its shuttling car; a low deck steps onto it.
    P('structure.city.roofDeck', 30, -830, 0, 0, { w: 30, d: 22, h: 16 }),
    P('structure.city.railSpan', 0, -910, 0, Math.PI / 2, { length: 180, height: 34, piers: 5 }),
    { ...P('structure.city.trainCar', 0, -830, trainY, Math.PI / 2, { length: 22 }, 'a'), moving: { to: { x: 0, z: -990 }, speed: 18, dwell: 2 } },
    P('structure.city.roofDeck', -100, -860, 0, 0.25, { w: 38, d: 26, h: 50 }),
    P('structure.city.roofDeck', 110, -900, 0, -0.2, { w: 36, d: 24, h: 38 }),
    P('structure.city.roofDeck', -90, -1000, 0, 0.1, { w: 40, d: 26, h: 44 }),
    P('structure.city.billboard', 100, -1040, 0, -0.3, { height: 32, h: 14, w: 26 }),
    P('prop.thermalVent', -40, -870, 0, 0, { height: 200 }),
    P('prop.signalBeacon', -150, -960, 2, 0),
    P('prop.checkpointTotem', 0, -928),
    P('prop.checkpointTotem', 0, -1090),
    // Stronghold 2 · The Construction Crown (centre 0,-1280, r 190): the crown on the street, towers either side, a thermal to the jib.
    P('structure.city.constructionCrown', 0, -1280, 0, 0, { w: 36, h: 100, floors: 6 }),
    P('structure.city.ivoryTower', -100, -1230, 0, 0.1, { h: 100 }),
    P('structure.city.ivoryTower', 100, -1340, 0, -0.15, { h: 95 }),
    P('structure.city.roofDeck', -120, -1360, 0, 0.3, { w: 38, d: 26, h: 50 }),
    P('structure.city.roofDeck', 130, -1200, 0, -0.2, { w: 36, d: 24, h: 45 }),
    P('structure.city.billboard', -50, -1180, 0, 0.2, { height: 30, h: 12, w: 24 }),
    P('structure.city.billboard', 60, -1400, 0, -0.2, { height: 34, h: 14, w: 26 }),
    P('prop.thermalVent', 40, -1420, 0, 0, { height: 220 }),
    P('prop.springPad', -40, -1240, 0, 0, { w: 10 }),
    P('prop.recoveryCapsule', 30, -1320, 5),
    P('prop.signalBeacon', -100, -1230, 102, 0),
    P('prop.signalBeacon', 2, -1280, 143, 0),
    P('prop.checkpointTotem', 0, -1470),
    // Interlude 3 · The sky bridges (-1470 → -1770): two decks a tap-jump apart, then a spring pad into a wind lane that carries Hopper up to the observatory plateau.
    P('structure.city.billboard', -80, -1530, 0, 0.2, { height: 35, h: 14, w: 26 }),
    P('structure.city.roofDeck', 90, -1560, 0, -0.1, { w: 36, d: 24, h: 40 }),
    P('structure.city.roofDeck', 0, -1550, 0, 0, { w: 30, d: 24, h: 18 }),
    P('structure.city.roofDeck', 0, -1645, 0, 0, { w: 30, d: 24, h: 36 }),
    P('structure.city.roofDeck', -100, -1660, 0, 0.3, { w: 38, d: 26, h: 48 }),
    P('structure.city.billboard', 110, -1720, 0, -0.3, { height: 32, h: 12, w: 24 }),
    P('prop.springPad', 30, -1690, 0, 0, { w: 10 }),
    P('prop.windLane', 0, -1730, 60, Math.PI / 2, { length: 140, r: 20 }),
    P('prop.checkpointTotem', 0, -1600),
    // Stronghold 3 · The Highline Observatory (sealed; centre 0,-1970, r 200): the tallest towers flank the dome on the highest plateau.
    P('prop.checkpointTotem', 0, -1770),
    P('structure.city.ivoryTower', -90, -1930, 0, 0.1, { h: 140 }),
    P('structure.city.ivoryTower', 90, -1990, 0, -0.1, { h: 120 }),
    P('structure.city.roofDeck', 120, -1880, 0, -0.2, { w: 36, d: 24, h: 44 }),
    P('structure.city.roofDeck', -130, -2050, 0, 0.3, { w: 40, d: 26, h: 50 }),
    P('structure.city.billboard', 40, -1860, 0, 0.1, { height: 30, h: 12, w: 24 }),
    P('structure.city.observatoryDome', 0, -2030, 0, 0, { r: 24, base: 32 }),
    P('prop.springPad', -30, -1900, 0, 0, { w: 10 }),
    P('prop.recoveryCapsule', 20, -1940, 3),
    P('prop.signalBeacon', -90, -1930, 142, 0),
    P('prop.signalBeacon', 90, -1990, 122, 0),
    // The last totem stands on the plateau in front of the dome, not inside its drum.
    P('prop.checkpointTotem', 0, -1985),
  ];
  const shadows: ShadowSpawn[] = [
    // Interlude 1 patrol.
    S('h1', 'shadeHound', 30, -80, { group: 'street' }),
    S('h2', 'shadeHound', -30, -300, { group: 'street' }),
    // Stronghold 1 host.
    S('w1', 'shadeHound', -70, -560, { y: 112, group: 'ward', entry: 'leap', delay: 0 }),
    S('w2', 'shadeHound', 80, -640, { y: 132, group: 'ward', entry: 'leap', delay: 1.5 }),
    S('r1', 'windowRay', 0, -540, { y: 120, mode: 'a', group: 'ward', entry: 'drop', delay: 1 }),
    S('r2', 'windowRay', 30, -660, { y: 125, mode: 'a', group: 'ward', entry: 'drop', delay: 3 }),
    S('h3', 'shadeHound', 0, -520, { group: 'ward', entry: 'emerge', delay: 0.5 }),
    S('h4', 'shadeHound', -25, -580, { group: 'ward', entry: 'emerge', delay: 2 }),
    S('h5', 'shadeHound', 20, -650, { group: 'ward', entry: 'emerge', delay: 4 }),
    S('h6', 'shadeHound', -40, -716, { group: 'ward', entry: 'ambush', delay: 5 }),
    S('l1', 'spireLeech', -53, -560, { y: 83.5, mode: 'a', group: 'ward', wave: 1, entry: 'emerge' }),
    S('l2', 'spireLeech', 63, -640, { y: 93.5, mode: 'a', group: 'ward', wave: 1, entry: 'emerge' }),
    S('r3', 'windowRay', 0, -600, { y: 130, mode: 'a', group: 'ward', wave: 1, entry: 'drop' }),
    // Interlude 2 patrol: two rays over the rail.
    S('c1', 'windowRay', 0, -900, { y: 140, mode: 'a', group: 'canyon' }),
    S('c2', 'windowRay', -30, -1000, { y: 145, mode: 'a', group: 'canyon' }),
    // Stronghold 2 host.
    S('k1', 'shadeHound', 0, -1280, { y: 100, group: 'crown', entry: 'leap', delay: 0 }),
    S('k2', 'shadeHound', -100, -1230, { y: 102, group: 'crown', entry: 'leap', delay: 1.5 }),
    S('r4', 'windowRay', -30, -1200, { y: 220, mode: 'a', group: 'crown', entry: 'drop', delay: 1 }),
    S('r5', 'windowRay', 40, -1360, { y: 230, mode: 'a', group: 'crown', entry: 'drop', delay: 3 }),
    S('h7', 'shadeHound', 0, -1160, { group: 'crown', entry: 'emerge', delay: 0.5 }),
    S('h8', 'shadeHound', -30, -1250, { group: 'crown', entry: 'emerge', delay: 2 }),
    S('h9', 'shadeHound', 30, -1330, { group: 'crown', entry: 'emerge', delay: 4 }),
    S('h10', 'shadeHound', -50, -1196, { group: 'crown', entry: 'ambush', delay: 5 }),
    S('l3', 'spireLeech', -83, -1230, { y: 168.5, mode: 'a', group: 'crown', wave: 1, entry: 'emerge' }),
    S('l4', 'spireLeech', 83, -1340, { y: 165, mode: 'a', group: 'crown', wave: 1, entry: 'emerge' }),
    S('r6', 'windowRay', 0, -1280, { y: 240, mode: 'a', group: 'crown', wave: 1, entry: 'drop' }),
    // Interlude 3 patrol: two rays between the bridges.
    S('b1', 'windowRay', 0, -1600, { y: 250, mode: 'a', group: 'bridges' }),
    S('b2', 'windowRay', 30, -1680, { y: 260, mode: 'a', group: 'bridges' }),
    // Stronghold 3 host.
    S('o1', 'shadeHound', -90, -1930, { y: 142, group: 'observatory', entry: 'leap', delay: 0 }),
    S('o2', 'shadeHound', 90, -1990, { y: 122, group: 'observatory', entry: 'leap', delay: 1.5 }),
    S('r7', 'windowRay', 0, -1900, { y: 360, mode: 'a', group: 'observatory', entry: 'drop', delay: 1 }),
    S('r8', 'windowRay', -40, -2000, { y: 350, mode: 'a', group: 'observatory', entry: 'drop', delay: 3 }),
    S('h11', 'shadeHound', 0, -1860, { group: 'observatory', entry: 'emerge', delay: 0.5 }),
    S('h12', 'shadeHound', -30, -1940, { group: 'observatory', entry: 'emerge', delay: 2 }),
    S('h13', 'shadeHound', 30, -1990, { group: 'observatory', entry: 'emerge', delay: 4 }),
    S('h14', 'shadeHound', 40, -1876, { group: 'observatory', entry: 'ambush', delay: 5 }),
    S('l5', 'spireLeech', -73, -1930, { y: 338.5, mode: 'a', group: 'observatory', wave: 1, entry: 'emerge' }),
    S('l6', 'spireLeech', 73, -1990, { y: 330, mode: 'a', group: 'observatory', wave: 1, entry: 'emerge' }),
    S('r9', 'windowRay', 0, -1970, { y: 370, mode: 'a', group: 'observatory', wave: 1, entry: 'drop' }),
  ];
  return {
    region: 'city',
    mission: 0,
    name: 'Crownline City',
    subtitle: 'Climb the skyline. Read the next roof before you leap.',
    size: 4800,
    terrain: {
      seed: 21,
      relief: 12,
      plateaus: [
        { x: 0, z: 0, r: 200, y: 0 },
        { x: 0, z: -600, r: 230, y: 30 },
        { x: 0, z: -940, r: 130, y: 70 },
        { x: 0, z: -1280, r: 230, y: 120 },
        { x: 0, z: -1620, r: 130, y: 170 },
        { x: 0, z: -1980, r: 260, y: 270 },
      ],
      valley: null,
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Ivory roof ladder', z0: 20, z1: -400, beat: 'learn' },
      { name: 'Transit canyon', z0: -400, z1: -1090, beat: 'run' },
      { name: 'Construction crown', z0: -1090, z1: -1470, beat: 'fight' },
      { name: 'The sky bridges', z0: -1470, z1: -1770, beat: 'climb' },
      { name: 'Highline observatory', z0: -1770, z1: -2200, beat: 'finish' },
    ],
    strongholds: [
      { id: 'ward', name: 'The Ivory Ward', x: 0, z: -600, r: 190, y: 40 },
      { id: 'crown', name: 'The Construction Crown', x: 0, z: -1280, r: 190, y: 50 },
      { id: 'observatory', name: 'The Highline Observatory', x: 0, z: -1970, r: 200, y: 50, seal: true },
    ],
    cages: [
      { id: 'cage-city-1', x: -120, z: -160, y: 2, mode: 'r' },
      { id: 'cage-city-2', x: 120, z: -980, y: 2, mode: 'r' },
      { id: 'cage-city-3', x: -100, z: -1700, y: 2, mode: 'r' },
    ],
    start: { x: 0, z: 40, yaw: Math.PI },
    exit: { x: 0, z: -2030, r: 40, name: 'The observatory crown' },
    landmark: { name: 'Thunderhead Range', x: 0, z: -3400 },
    route: windingRoute(placements, { x: 0, z: 40 }, { x: 0, z: -2030 }),
  };
}

/** Thunderhead Range: the third district and mission-one boss. The road
 * drops into the storm gorge, where the first bastion stands on the floor,
 * climbs to the cloudstep bastion 150 m up, then follows the summit road to
 * the transmitter, where the Night Rook waits in its ring of crags. */
export function thunderheadRange(): District {
  const placements: Placement[] = [
    // Interlude 1 · Slate descent (20 → -465): crag columns either side, two low stepping columns on the road, the gorge rim ahead.
    P('prop.checkpointTotem', 0, 10),
    P('structure.mountains.cragColumn', 60, -80, 0, 0.2, { h: 60, r: 14 }),
    P('structure.mountains.cragColumn', -70, -150, 0, -0.1, { h: 75, r: 15 }),
    P('prop.signalBeacon', -70, -150, 76, 0),
    P('structure.mountains.cragColumn', 0, -200, 0, 0, { h: 12, r: 12, tilt: 0 }),
    P('structure.mountains.cragColumn', 0, -250, 0, 0, { h: 24, r: 12, tilt: 0 }),
    P('structure.mountains.cragColumn', 90, -230, 0, 0.35, { h: 90, r: 16 }),
    P('prop.checkpointTotem', 0, -300),
    P('structure.mountains.cragColumn', -60, -330, 0, -0.2, { h: 105, r: 16 }),
    P('structure.mountains.windsock', 50, -400, 0, 0),
    P('structure.mountains.ledgeShelf', -90, -420, 0, 0.1, { w: 46, d: 18 }),
    P('prop.checkpointTotem', 0, -465),
    // Stronghold 1 · The Gorge Bastion (centre 0,-660, r 195): four crags rise from the gorge floor past the rim; wind lanes and a spring pad on the floor.
    P('structure.mountains.ledgeShelf', 100, -560, 0, 0.1, { w: 46, d: 18 }),
    P('structure.mountains.cragColumn', -70, -600, 0, -0.15, { h: 110, r: 17 }),
    P('structure.mountains.cragColumn', 80, -640, 0, 0.2, { h: 115, r: 18 }),
    P('structure.mountains.ledgeShelf', -110, -640, 0, -0.15, { w: 46, d: 18 }),
    P('structure.mountains.ravineBridge', -20, -660, 0, 0.05, { length: 130, width: 12, drop: 45 }),
    P('prop.recoveryCapsule', 0, -640, 3),
    P('prop.windLane', 0, -700, 14, 0, { length: 180, r: 18 }),
    P('structure.mountains.windsock', -100, -700, 0, 0),
    P('prop.springPad', 40, -690, 0, 0, { w: 10 }),
    P('prop.thermalVent', -30, -720, 0, 0, { height: 220 }),
    P('structure.mountains.cragColumn', -50, -720, 0, 0.1, { h: 100, r: 16 }),
    P('prop.windLane', -140, -760, 12, 0.4, { length: 120, r: 16 }),
    P('structure.mountains.windsock', -80, -760, 0, 0.4),
    P('structure.mountains.cragColumn', 60, -760, 0, -0.25, { h: 105, r: 16 }),
    P('prop.windLane', 140, -780, 12, -0.4, { length: 120, r: 16 }),
    P('structure.mountains.windsock', 100, -790, 0, -0.4),
    P('prop.signalBeacon', 80, -640, 116, 0),
    P('prop.checkpointTotem', 0, -855),
    // Interlude 2 · Broken ridge (-855 → -1175): a spring pad throws Hopper up the ridge wall, a thermal lifts it to the cloudstep plateau; shelves and crags either side.
    P('prop.springPad', 0, -880, 0, 0, { w: 10 }),
    P('structure.mountains.cragColumn', -90, -920, 0, -0.25, { h: 70, r: 15 }),
    P('structure.mountains.ledgeShelf', 90, -960, 0, 0.2, { w: 50, d: 18 }),
    P('structure.mountains.ledgeShelf', -80, -1030, 0, -0.1, { w: 50, d: 18 }),
    P('structure.mountains.windsock', 70, -1080, 0, 0.1),
    P('prop.signalBeacon', 90, -960, 1, 0),
    P('prop.thermalVent', -30, -1100, 0, 0, { height: 200 }),
    P('prop.checkpointTotem', 0, -1050),
    P('prop.checkpointTotem', 0, -1175),
    // Stronghold 2 · The Cloudstep Bastion (centre 0,-1370, r 195): a ring of four crags around a low cloudstep column, a wind lane across the ring.
    P('structure.mountains.ledgeShelf', -40, -1240, 0, 0.1, { w: 50, d: 18 }),
    P('structure.mountains.cragColumn', -100, -1290, 0, 0.15, { h: 105, r: 16 }),
    P('prop.windLane', 0, -1300, 40, 0, { length: 160, r: 18 }),
    P('structure.mountains.cragColumn', 100, -1320, 0, -0.1, { h: 110, r: 16 }),
    P('prop.recoveryCapsule', 30, -1350, 5),
    P('structure.mountains.windsock', -60, -1360, 0, 0.2),
    P('structure.mountains.cragColumn', 0, -1380, 0, 0, { h: 40, r: 14 }),
    P('prop.springPad', -50, -1400, 0, 0, { w: 10 }),
    P('structure.mountains.cragColumn', -90, -1440, 0, 0.3, { h: 100, r: 15 }),
    P('structure.mountains.cragColumn', 110, -1450, 0, -0.2, { h: 115, r: 17 }),
    P('structure.mountains.ledgeShelf', 50, -1500, 0, -0.1, { w: 50, d: 18 }),
    P('prop.signalBeacon', 110, -1450, 116, 0),
    P('prop.checkpointTotem', 0, -1565),
    // Interlude 3 · Summit road (-1565 → -1890): two rock steps on the road, a wind lane toward the mast, crags and a windsock either side.
    P('structure.mountains.ledgeShelf', -80, -1620, 0, 0.2, { w: 46, d: 18 }),
    P('structure.mountains.cragColumn', 90, -1650, 0, 0.1, { h: 70, r: 14 }),
    P('structure.mountains.cragColumn', 0, -1680, 0, 0, { h: 10, r: 12, tilt: 0 }),
    P('structure.mountains.cragColumn', 0, -1730, 0, 0, { h: 20, r: 12, tilt: 0 }),
    P('structure.mountains.cragColumn', -100, -1760, 0, -0.2, { h: 80, r: 15 }),
    P('structure.mountains.windsock', 70, -1800, 0, 0),
    P('prop.windLane', 0, -1820, 16, Math.PI / 2, { length: 140, r: 16 }),
    P('prop.recoveryCapsule', 0, -1600, 5),
    P('prop.checkpointTotem', 0, -1890),
    // Boss arena · Summit transmitter (centre 0,-2150, r 260): the mast in a ring of six crags, ledges around it for the Night Rook fight.
    P('structure.mountains.transmitterMast', 0, -2150, 0, 0),
    P('structure.mountains.cragColumn', 150, -2070, 0, 0.2, { h: 110, r: 16 }),
    P('structure.mountains.cragColumn', -150, -2080, 0, -0.1, { h: 105, r: 16 }),
    P('structure.mountains.cragColumn', 170, -2220, 0, 0.3, { h: 120, r: 17 }),
    P('structure.mountains.cragColumn', -170, -2230, 0, -0.2, { h: 115, r: 17 }),
    P('structure.mountains.cragColumn', 70, -2320, 0, 0.1, { h: 110, r: 16 }),
    P('structure.mountains.cragColumn', -70, -2330, 0, -0.3, { h: 118, r: 16 }),
    P('structure.mountains.ledgeShelf', 90, -2120, 0, 0.3, { w: 20, d: 14 }),
    P('structure.mountains.ledgeShelf', -95, -2180, 215, -0.5, { w: 20, d: 14 }, 'a'),
    P('structure.mountains.ledgeShelf', 0, -2240, 240, 0, { w: 20, d: 14 }, 'a'),
    P('prop.recoveryCapsule', 0, -2000, 5),
    P('prop.checkpointTotem', 0, -2110),
  ];
  const shadows: ShadowSpawn[] = [
    // Interlude 1 patrol.
    S('h1', 'shadeHound', 40, -40, { group: 'entrance' }),
    S('h2', 'shadeHound', -40, -80, { group: 'entrance' }),
    // Stronghold 1 host: tortoises crouched on the crag tops, condors from above the rim.
    S('b1', 'cragTortoise', 80, -640, { y: 116, group: 'bastion', entry: 'leap', delay: 0 }),
    S('b2', 'cragTortoise', -70, -600, { y: 111, group: 'bastion', entry: 'leap', delay: 1.5 }),
    S('b3', 'shadeHound', -50, -720, { y: 101, group: 'bastion', entry: 'leap', delay: 3 }),
    S('c1', 'riftCondor', 0, -620, { y: 30, mode: 'a', group: 'bastion', entry: 'drop', delay: 1 }),
    S('c2', 'riftCondor', -40, -720, { y: 30, mode: 'a', group: 'bastion', entry: 'drop', delay: 3.5 }),
    S('t1', 'cragTortoise', 0, -600, { group: 'bastion', entry: 'emerge', delay: 0.5 }),
    S('t2', 'cragTortoise', -20, -680, { group: 'bastion', entry: 'emerge', delay: 2 }),
    S('h3', 'shadeHound', 20, -740, { group: 'bastion', entry: 'emerge', delay: 4 }),
    S('h4', 'shadeHound', -100, -716, { group: 'bastion', entry: 'ambush', delay: 5 }),
    S('c3', 'riftCondor', 0, -660, { y: 40, mode: 'a', group: 'bastion', wave: 1, entry: 'drop' }),
    S('t3', 'cragTortoise', 30, -640, { group: 'bastion', wave: 1, entry: 'emerge' }),
    S('h5', 'shadeHound', -30, -760, { group: 'bastion', wave: 1, entry: 'emerge' }),
    // Stronghold 2 host.
    S('cs1', 'cragTortoise', 100, -1320, { y: 111, group: 'cloudstep', entry: 'leap', delay: 0 }),
    S('cs2', 'cragTortoise', -100, -1290, { y: 106, group: 'cloudstep', entry: 'leap', delay: 1.5 }),
    S('cs3', 'shadeHound', 0, -1380, { y: 41, group: 'cloudstep', entry: 'leap', delay: 2.5 }),
    S('c4', 'riftCondor', 0, -1300, { y: 240, mode: 'a', group: 'cloudstep', entry: 'drop', delay: 1 }),
    S('c5', 'riftCondor', -40, -1440, { y: 250, mode: 'a', group: 'cloudstep', entry: 'drop', delay: 3.5 }),
    S('t4', 'cragTortoise', 0, -1250, { group: 'cloudstep', entry: 'emerge', delay: 0.5 }),
    S('t5', 'cragTortoise', -20, -1420, { group: 'cloudstep', entry: 'emerge', delay: 2 }),
    S('h6', 'shadeHound', 30, -1470, { group: 'cloudstep', entry: 'emerge', delay: 4 }),
    S('h7', 'shadeHound', -60, -1376, { group: 'cloudstep', entry: 'ambush', delay: 5 }),
    S('c6', 'riftCondor', 0, -1370, { y: 260, mode: 'a', group: 'cloudstep', wave: 1, entry: 'drop' }),
    S('t6', 'cragTortoise', 40, -1330, { group: 'cloudstep', wave: 1, entry: 'emerge' }),
    S('h8', 'shadeHound', -40, -1330, { group: 'cloudstep', wave: 1, entry: 'emerge' }),
    // Interlude 3 patrol: two condors over the summit road.
    S('c7', 'riftCondor', 0, -1700, { y: 250, mode: 'a', group: 'summitRoad' }),
    S('c8', 'riftCondor', 40, -1780, { y: 260, mode: 'a', group: 'summitRoad' }),
  ];
  return {
    region: 'mountains',
    mission: 0,
    name: 'Thunderhead Range',
    subtitle: 'Descend into the gorge, then rise above the storm.',
    size: 4800,
    terrain: {
      seed: 33,
      relief: 110,
      plateaus: [
        { x: 0, z: 0, r: 240, y: 0 },
        { x: 0, z: -660, r: 300, y: 0 },
        { x: 0, z: -1050, r: 110, y: 40 },
        { x: 0, z: -1370, r: 240, y: 150 },
        { x: 0, z: -1720, r: 120, y: 170 },
        { x: 0, z: -2150, r: 300, y: 190 },
      ],
      valley: { axis: 'x', at: -660, width: 220, depth: 100 },
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Slate descent', z0: 20, z1: -465, beat: 'drop' },
      { name: 'The storm gorge', z0: -465, z1: -855, beat: 'fight' },
      { name: 'Broken ridge', z0: -855, z1: -1175, beat: 'climb' },
      { name: 'Cloudstep traverse', z0: -1175, z1: -1565, beat: 'fight' },
      { name: 'Summit transmitter', z0: -1565, z1: -2500, beat: 'finish' },
    ],
    strongholds: [
      { id: 'bastion', name: 'The Gorge Bastion', x: 0, z: -660, r: 195, y: 60 },
      { id: 'cloudstep', name: 'The Cloudstep Bastion', x: 0, z: -1370, r: 195, y: 30 },
    ],
    cages: [
      { id: 'cage-mountains-1', x: 60, z: -280, y: 2, mode: 'r' },
      { id: 'cage-mountains-2', x: -90, z: -1050, y: 2, mode: 'r' },
      { id: 'cage-mountains-3', x: 120, z: -1960, y: 4, mode: 'r' },
    ],
    boss: { kind: 'nightRook', x: 0, z: -2150, y: 40, r: 260 },
    start: { x: 0, z: 20, yaw: Math.PI },
    exit: { x: 0, z: -2150, r: 40, name: 'The summit transmitter' },
    landmark: { name: 'The transmitter', x: 0, z: -2150 },
    route: windingRoute(placements, { x: 0, z: 20 }, { x: 0, z: -2150 }),
  };
}

/** Episodes are lists of districts played in order; the last carries the boss. */
export const MISSIONS: Array<Array<() => District>> = [[sunseedFields, crownlineCity, thunderheadRange]];
export const DISTRICTS: Array<() => District> = [sunseedFields, crownlineCity, thunderheadRange];
