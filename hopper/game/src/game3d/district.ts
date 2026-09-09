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
  /** Encounter group; wave n appears when wave n-1 of the group is down. */
  group?: string;
  wave?: number;
  patrol?: number;
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
  gates?: Gate[];
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
const S = (id: string, kind: ShadowKind, x: number, z: number, extra: Partial<ShadowSpawn> = {}): ShadowSpawn => ({ id, kind, x, z, ...extra });

/** Sunseed Fields: the first district. Five chapters along −z, the Crownline
 * skyline on the horizon, terraces and silos as the first things to climb. */
export function sunseedFields(): District {
  const placements: Placement[] = [
    // Chapter 1 · Irrigation lesson: a totem, a farmhouse and silo to climb, hounds that follow.
    P('prop.checkpointTotem', 0, 20),
    P('structure.fields.farmhouse', -90, -110, 0, 0.3),
    P('structure.fields.silo', -52, -84),
    P('prop.signalBeacon', -90, -110, 13.5, 0),
    P('structure.fields.windbreak', 120, -160, 0, 1.2),
    P('structure.fields.terraceStep', 70, -260, 0, 0.2, { w: 70, d: 40, h: 5, tiers: 3 }),
    P('prop.checkpointTotem', 0, -330),
    // Chapter 2 · Orchard terraces: a spring pad up onto the terrace plateau, spitters on the tiers.
    P('prop.springPad', 80, -410),
    P('structure.fields.terraceStep', 130, -520, 0, -0.2, { w: 110, d: 70, h: 8, tiers: 3 }),
    P('structure.fields.terraceStep', 60, -640, 0, 0.5, { w: 80, d: 50, h: 7, tiers: 2 }),
    P('structure.fields.windbreak', 240, -560, 0, 0.1),
    P('prop.recoveryCapsule', 130, -520, 25),
    P('prop.signalBeacon', 130, -520, 27, 0),
    P('prop.checkpointTotem', 90, -690),
    // Chapter 3 · Windbreak ridges: a thermal lifts Hopper onto the ridge; an irrigation cut hides a signal.
    P('prop.thermalVent', -100, -780, 0, 0, { height: 140 }),
    P('structure.fields.windbreak', -220, -840, 0, 0.9),
    P('structure.fields.windbreak', -260, -930, 0, 0.8),
    P('structure.fields.silo', -300, -880, 0, 0, { h: 30 }),
    P('prop.signalBeacon', -40, -1000, 2, 0),
    P('prop.springPad', 20, -1010),
    P('prop.checkpointTotem', -180, -860),
    // Chapter 4 · The seedfall valley: two fallen vessels and the hounds that came in them.
    P('structure.fields.seedPod', 70, -1250, 0, 0.6),
    P('structure.fields.seedPod', -120, -1330, 0, -0.9, { r: 7 }),
    P('structure.fields.farmhouse', -30, -1180, 0, -0.4),
    P('prop.recoveryCapsule', -30, -1180, 13),
    P('prop.signalBeacon', 70, -1250, 24, 0),
    P('prop.checkpointTotem', 0, -1120),
    // Chapter 5 · Road to Crownline: the rising road under windbreaks, rays over the gate.
    P('structure.fields.windbreak', -80, -1560, 0, 0.05),
    P('structure.fields.windbreak', 80, -1600, 0, -0.05),
    P('structure.fields.silo', 90, -1700, 0, 0, { h: 34 }),
    P('structure.fields.silo', -100, -1740, 0, 0, { h: 28 }),
    P('prop.springPad', 0, -1520),
    P('prop.signalBeacon', 90, -1700, 35, 0),
    P('prop.checkpointTotem', 0, -1480),
    P('prop.checkpointTotem', 0, -1800),
  ];
  const shadows: ShadowSpawn[] = [
    S('h1', 'shadeHound', 40, -230, { group: 'lesson' }),
    S('h2', 'shadeHound', 90, -300, { group: 'lesson' }),
    S('s1', 'seedSpitter', 130, -520, { y: 24.6 }),
    S('s2', 'seedSpitter', 60, -640, { y: 14.6 }),
    S('h3', 'shadeHound', -150, -800, { group: 'ridge' }),
    S('h4', 'shadeHound', -230, -880, { group: 'ridge' }),
    S('h5', 'shadeHound', -200, -900, { group: 'ridge', wave: 1 }),
    S('h6', 'shadeHound', 40, -1220, { group: 'pod' }),
    S('h7', 'shadeHound', 110, -1290, { group: 'pod' }),
    S('h8', 'shadeHound', -90, -1300, { group: 'pod', wave: 1 }),
    S('h9', 'shadeHound', -140, -1360, { group: 'pod', wave: 1 }),
    S('s3', 'seedSpitter', -30, -1180, { y: 12.2 }),
    S('r1', 'windowRay', 0, -1560, { y: 60, mode: 'a' }),
    S('r2', 'windowRay', 60, -1660, { y: 80, mode: 'a' }),
    S('r3', 'windowRay', -60, -1700, { y: 70, mode: 'a' }),
    S('h10', 'shadeHound', 40, -1640, { group: 'gate' }),
    S('h11', 'shadeHound', -40, -1690, { group: 'gate' }),
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
        { x: 120, z: -560, r: 190, y: 26 },
        { x: -220, z: -880, r: 220, y: 60 },
        { x: 20, z: -1260, r: 230, y: 14 },
        { x: 0, z: -1700, r: 260, y: 52 },
      ],
      valley: { axis: 'x', at: -1000, width: 110, depth: 42 },
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Irrigation lesson', z0: 0, z1: -350, beat: 'learn' },
      { name: 'Orchard terraces', z0: -350, z1: -700, beat: 'climb' },
      { name: 'Windbreak ridges', z0: -700, z1: -1050, beat: 'run' },
      { name: 'The seedfall valley', z0: -1050, z1: -1450, beat: 'fight' },
      { name: 'Road to Crownline', z0: -1450, z1: -1850, beat: 'finish' },
    ],
    start: { x: 0, z: 40, yaw: Math.PI },
    exit: { x: 0, z: -1800, r: 30, name: 'The road to Crownline' },
    landmark: { name: 'Crownline City', x: 0, z: -3200 },
    // The trail winds up onto the orchard terraces, swings west over the
    // ridge, drops through the valley and straightens for the road.
    route: [
      { x: 0, z: 40 }, { x: 0, z: 20 }, { x: 30, z: -120 }, { x: 15, z: -240 }, { x: 0, z: -330 },
      { x: 60, z: -420 }, { x: 120, z: -540 }, { x: 90, z: -690 }, { x: -30, z: -770 }, { x: -180, z: -860 },
      { x: -190, z: -960 }, { x: -110, z: -1040 }, { x: 0, z: -1120 }, { x: 30, z: -1250 }, { x: -10, z: -1380 },
      { x: 0, z: -1480 }, { x: 0, z: -1650 }, { x: 0, z: -1800 },
    ],
  };
}

/** Crownline City: the second district. Five chapters along −z climbing 270 m
 * from the street to the observatory, the Thunderhead summit on the horizon
 * the whole way. Elevated structures that don't rest on the terrain (the
 * train car riding its rail span) use mode 'a' with an absolute height
 * computed from the structure they stand on, rather than a relative offset
 * from the ground below. */
export function crownlineCity(): District {
  const placements: Placement[] = [
    // Chapter 1 · Ivory roof ladder: roof decks a tap-jump apart, then the first tower to wall-kick.
    P('prop.checkpointTotem', 0, 10),
    P('structure.city.roofDeck', 70, -60, 0, 0.3, { w: 36, d: 24, h: 30 }),
    P('structure.city.roofDeck', -60, -110, 0, -0.2, { w: 38, d: 24, h: 42 }),
    P('prop.springPad', 40, -70, 0, 0, { w: 10 }),
    P('structure.city.roofDeck', 90, -170, 0, 0.1, { w: 40, d: 26, h: 55 }),
    P('structure.city.roofDeck', -40, -230, 0, 0.4, { w: 42, d: 28, h: 65 }),
    P('prop.recoveryCapsule', 100, -40, 3),
    P('prop.signalBeacon', 150, -40, 2, 0),
    P('structure.city.ivoryTower', 30, -330, 0, 0.15, { h: 95 }),
    P('prop.signalBeacon', 30, -330, 97, 0),
    P('prop.checkpointTotem', 0, -300),
    // Chapter 2 · Transit canyon: the elevated rail span with a shuttling train car.
    P('structure.city.railSpan', 0, -650, 0, 0, { length: 200, height: 34, piers: 5 }),
    { ...P('structure.city.trainCar', -70, -650, 13.7, 0, { length: 22 }, 'a'), moving: { to: { x: 70, z: -650 }, speed: 18, dwell: 2 } },
    P('structure.city.roofDeck', 140, -560, 0, -0.3, { w: 36, d: 24, h: 36 }),
    P('prop.signalBeacon', -150, -700, 2, 0),
    P('prop.springPad', 0, -680, 0, 0, { w: 10 }),
    P('prop.checkpointTotem', 0, -460),
    P('prop.checkpointTotem', 0, -700),
    // Chapter 3 · Construction crown: the crown's floors and jib lift Hopper toward the sky bridges.
    P('structure.city.constructionCrown', 0, -1000, 0, 0, { w: 36, h: 100, floors: 6 }),
    P('structure.city.roofDeck', -90, -900, 0, 0.25, { w: 38, d: 26, h: 50 }),
    P('prop.signalBeacon', 150, -1050, 2, 0),
    P('prop.thermalVent', 40, -1170, 0, 0, { height: 220 }),
    P('prop.recoveryCapsule', 0, -1050, 5),
    P('prop.checkpointTotem', 0, -850),
    P('prop.checkpointTotem', 0, -1050),
    // Chapter 4 · The sky bridges: tower roofs 100 m up, a wind lane across the gap, rays and leeches between them.
    P('structure.city.ivoryTower', -30, -1350, 0, 0.1, { h: 100 }),
    P('structure.city.ivoryTower', 60, -1420, 0, -0.15, { h: 95 }),
    P('structure.city.billboard', -80, -1470, 0, 0.2, { height: 35, h: 14, w: 26 }),
    P('prop.windLane', 15, -1390, 95, 0, { length: 140, r: 20 }),
    P('prop.signalBeacon', -30, -1350, 102, 0),
    P('prop.signalBeacon', 60, -1420, 97, 0),
    P('prop.recoveryCapsule', 0, -1400, 5),
    P('prop.checkpointTotem', 0, -1150),
    P('prop.checkpointTotem', 0, -1350),
    // Chapter 5 · Highline observatory: the gate knot, then the dome on the highest plateau.
    P('prop.checkpointTotem', 0, -1500),
    P('prop.springPad', 30, -1560, 0, 0, { w: 10 }),
    P('structure.city.observatoryDome', 0, -1830, 0, 0, { r: 24, base: 32 }),
    // The last totem stands on the plateau in front of the dome, not inside its drum.
    P('prop.checkpointTotem', 0, -1790),
  ];
  const shadows: ShadowSpawn[] = [
    S('h1', 'shadeHound', 60, -50, { group: 'street' }),
    S('h2', 'shadeHound', -50, -90, { group: 'street' }),
    S('h3', 'shadeHound', 80, -150, { group: 'street', wave: 1 }),
    S('h4', 'shadeHound', -70, -190, { group: 'street', wave: 1 }),
    S('r1', 'windowRay', 0, -200, { y: 100, mode: 'a' }),
    S('r2', 'windowRay', 100, -350, { y: 140, mode: 'a' }),
    S('r3', 'windowRay', -80, -550, { y: 60, mode: 'a' }),
    S('r4', 'windowRay', 60, -1000, { y: 220, mode: 'a' }),
    S('r5', 'windowRay', -60, -1200, { y: 240, mode: 'a' }),
    S('r6', 'windowRay', 0, -1650, { y: 330, mode: 'a', group: 'gate' }),
    S('r7', 'windowRay', 40, -1680, { y: 310, mode: 'a', group: 'gate' }),
    S('r8', 'windowRay', -40, -1620, { y: 350, mode: 'a', group: 'gate' }),
    S('l1', 'spireLeech', 47, -330, { y: 98.5, mode: 'a' }),
    S('l2', 'spireLeech', 13, -330, { y: 113.5, mode: 'a' }),
    S('l3', 'spireLeech', -47, -1350, { y: 268.5, mode: 'a' }),
    S('l4', 'spireLeech', 77, -1420, { y: 253.5, mode: 'a' }),
    S('l5', 'spireLeech', 20, -1650, { y: 290, mode: 'a', group: 'gate' }),
    S('l6', 'spireLeech', -20, -1660, { y: 300, mode: 'a', group: 'gate' }),
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
        { x: 0, z: 0, r: 160, y: 0 },
        { x: 0, z: -300, r: 150, y: 40 },
        { x: 0, z: -650, r: 150, y: -20 },
        { x: 0, z: -1000, r: 150, y: 120 },
        { x: 0, z: -1350, r: 150, y: 200 },
        { x: 0, z: -1750, r: 160, y: 270 },
      ],
      valley: null,
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Ivory roof ladder', z0: 20, z1: -380, beat: 'learn' },
      { name: 'Transit canyon', z0: -380, z1: -780, beat: 'run' },
      { name: 'Construction crown', z0: -780, z1: -1150, beat: 'climb' },
      { name: 'The sky bridges', z0: -1150, z1: -1500, beat: 'fight' },
      { name: 'Highline observatory', z0: -1500, z1: -1950, beat: 'finish' },
    ],
    gates: [{ id: 'gate-observatory', x: 0, z: -1650, r: 120, group: 'gate', y: 40 }],
    cages: [
      { id: 'cage-city-1', x: -120, z: -160, y: 2, mode: 'r' },
      { id: 'cage-city-2', x: 120, z: -950, y: 2, mode: 'r' },
      { id: 'cage-city-3', x: -100, z: -1500, y: 95, mode: 'r' },
    ],
    start: { x: 0, z: 40, yaw: Math.PI },
    exit: { x: 0, z: -1830, r: 40, name: 'The observatory crown' },
    landmark: { name: 'Thunderhead Range', x: 0, z: -3400 },
    // Streets zigzag between the roof decks, under the rail span and round
    // the crown, climbing plateau by plateau to the observatory.
    route: [
      { x: 0, z: 40 }, { x: 0, z: 10 }, { x: -25, z: -90 }, { x: 25, z: -190 }, { x: 0, z: -300 }, { x: -30, z: -390 },
      { x: 0, z: -460 }, { x: 35, z: -570 }, { x: 0, z: -700 }, { x: -30, z: -790 }, { x: 0, z: -850 }, { x: 45, z: -930 },
      { x: 30, z: -1000 }, { x: 0, z: -1050 }, { x: -25, z: -1110 }, { x: 0, z: -1150 }, { x: 35, z: -1250 }, { x: 0, z: -1350 },
      { x: -25, z: -1430 }, { x: 0, z: -1500 }, { x: 30, z: -1600 }, { x: 0, z: -1700 }, { x: 0, z: -1790 }, { x: 0, z: -1830 },
    ],
  };
}

/** Thunderhead Range: the third district and mission-one boss. Chapters drop
 * 110 m into the storm gorge on crag columns, then climb 300 m back out to
 * the summit transmitter, where the Night Rook waits. */
export function thunderheadRange(): District {
  const placements: Placement[] = [
    // Chapter 1 · Slate descent: crag columns step down 110 m into the gorge.
    P('prop.checkpointTotem', 0, 10),
    P('structure.mountains.cragColumn', 40, -80, 0, 0.2, { h: 60, r: 14 }),
    P('structure.mountains.cragColumn', -60, -150, 0, -0.1, { h: 75, r: 15 }),
    P('prop.signalBeacon', -60, -150, 76, 0),
    P('structure.mountains.cragColumn', 80, -220, 0, 0.35, { h: 90, r: 16 }),
    P('prop.checkpointTotem', 0, -180),
    P('structure.mountains.cragColumn', -40, -290, 0, -0.2, { h: 105, r: 16 }),
    P('structure.mountains.cragColumn', 30, -350, 0, 0.1, { h: 120, r: 18 }),
    P('prop.signalBeacon', 30, -350, 121, 0),
    // Chapter 2 · The storm gorge: a viaduct over it at rim height (the trail
    // runs along the floor beneath), ledges and wind lanes down in the cut.
    P('structure.mountains.ravineBridge', 120, -720, -20, Math.PI / 2, { length: 130, width: 14, drop: 88 }, 'a'),
    P('structure.mountains.ledgeShelf', 90, -560, 0, 0.1, { w: 46, d: 18 }),
    P('structure.mountains.ledgeShelf', -110, -640, 0, -0.15, { w: 46, d: 18 }),
    P('prop.windLane', 0, -700, 14, 0, { length: 180, r: 18 }),
    P('structure.mountains.windsock', -100, -700, 0, 0),
    P('prop.windLane', -140, -760, 12, 0.4, { length: 120, r: 16 }),
    P('structure.mountains.windsock', -80, -760, 0, 0.4),
    P('prop.windLane', 140, -780, 12, -0.4, { length: 120, r: 16 }),
    P('structure.mountains.windsock', 60, -780, 0, -0.4),
    P('prop.signalBeacon', 0, -760, 2, 0),
    P('prop.springPad', 60, -750, 0, 0, { w: 10 }),
    P('prop.checkpointTotem', 0, -380),
    P('prop.checkpointTotem', 0, -580),
    // Chapter 3 · Broken ridge: ledge shelves and crag columns up the far wall, a thermal to the top.
    P('structure.mountains.ledgeShelf', 40, -840, 0, 0.1, { w: 50, d: 18 }),
    P('structure.mountains.cragColumn', -70, -900, 0, -0.25, { h: 70, r: 15 }),
    P('prop.thermalVent', 30, -800, 0, 0, { height: 200 }),
    P('structure.mountains.ledgeShelf', -30, -950, 0, -0.1, { w: 50, d: 18 }),
    P('structure.mountains.ledgeShelf', 80, -1050, 0, 0.2, { w: 50, d: 18 }),
    P('prop.signalBeacon', 80, -1050, 9, 0),
    P('prop.recoveryCapsule', 0, -900, 5),
    P('prop.checkpointTotem', 0, -780),
    P('prop.checkpointTotem', 0, -980),
    // Chapter 4 · Cloudstep traverse: condors over a chain of crag columns 150 m up.
    P('structure.mountains.cragColumn', -30, -1220, 0, 0.15, { h: 55, r: 14 }),
    P('prop.thermalVent', -30, -1200, 0, 0, { height: 200 }),
    P('structure.mountains.cragColumn', 50, -1280, 0, -0.1, { h: 65, r: 14 }),
    P('structure.mountains.cragColumn', -60, -1340, 0, 0.3, { h: 70, r: 15 }),
    P('prop.springPad', -60, -1350, 0, 0, { w: 10 }),
    P('structure.mountains.cragColumn', 40, -1400, 0, -0.2, { h: 60, r: 14 }),
    P('prop.signalBeacon', 40, -1400, 61, 0),
    P('prop.recoveryCapsule', 0, -1300, 5),
    P('prop.checkpointTotem', 0, -1180),
    P('prop.checkpointTotem', 0, -1365),
    // Chapter 5 · Summit transmitter: the gate knot, then the mast and the Night Rook's arena.
    P('prop.checkpointTotem', 0, -1550),
    P('structure.mountains.transmitterMast', 0, -1750, 0, 0),
    P('structure.mountains.ledgeShelf', 90, -1720, 0, 0.3, { w: 20, d: 14 }),
    P('structure.mountains.ledgeShelf', -95, -1780, 215, -0.5, { w: 20, d: 14 }, 'a'),
    P('structure.mountains.ledgeShelf', 0, -1840, 240, 0, { w: 20, d: 14 }, 'a'),
    P('prop.recoveryCapsule', 0, -1600, 5),
    P('prop.checkpointTotem', 0, -1700),
  ];
  const shadows: ShadowSpawn[] = [
    S('h1', 'shadeHound', 40, -40, { group: 'entrance' }),
    S('h2', 'shadeHound', -40, -80, { group: 'entrance' }),
    S('t1', 'cragTortoise', 90, -560, { y: 4.2 }),
    S('t2', 'cragTortoise', -110, -640, { y: 4.2 }),
    S('t3', 'cragTortoise', 40, -840, { y: 4.2 }),
    S('t4', 'cragTortoise', -30, -950, { y: 4.2 }),
    S('t5', 'cragTortoise', 0, -1520, { y: 3, group: 'gate' }),
    S('t6', 'cragTortoise', 30, -1560, { y: 3, group: 'gate' }),
    S('c1', 'riftCondor', 0, -700, { y: -60, mode: 'a' }),
    S('c2', 'riftCondor', -80, -780, { y: -30, mode: 'a' }),
    S('c3', 'riftCondor', 60, -900, { y: 140, mode: 'a' }),
    S('c4', 'riftCondor', -60, -1050, { y: 160, mode: 'a' }),
    S('c5', 'riftCondor', -30, -1280, { y: 200, mode: 'a' }),
    S('c6', 'riftCondor', 0, -1530, { y: 260, mode: 'a', group: 'gate' }),
    S('c7', 'riftCondor', 40, -1560, { y: 250, mode: 'a', group: 'gate' }),
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
        { x: 0, z: 0, r: 180, y: 0 },
        { x: 0, z: -500, r: 200, y: 0 },
        { x: 0, z: -1100, r: 200, y: 80 },
        { x: 0, z: -1450, r: 180, y: 150 },
        { x: 0, z: -1750, r: 260, y: 190 },
      ],
      valley: { axis: 'x', at: -700, width: 220, depth: 110 },
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Slate descent', z0: 20, z1: -380, beat: 'drop' },
      { name: 'The storm gorge', z0: -380, z1: -780, beat: 'run' },
      { name: 'Broken ridge', z0: -780, z1: -1180, beat: 'climb' },
      { name: 'Cloudstep traverse', z0: -1180, z1: -1550, beat: 'fight' },
      { name: 'Summit transmitter', z0: -1550, z1: -1950, beat: 'finish' },
    ],
    gates: [{ id: 'gate-summit', x: 0, z: -1500, r: 130, group: 'gate', y: 20 }],
    cages: [
      { id: 'cage-mountains-1', x: 20, z: -240, y: 2, mode: 'r' },
      { id: 'cage-mountains-2', x: -90, z: -1050, y: 12, mode: 'r' },
      { id: 'cage-mountains-3', x: 120, z: -1560, y: 4, mode: 'r' },
    ],
    boss: { kind: 'nightRook', x: 0, z: -1750, y: 40, r: 260 },
    start: { x: 0, z: 20, yaw: Math.PI },
    exit: { x: 0, z: -1750, r: 40, name: 'The summit transmitter' },
    landmark: { name: 'The transmitter', x: 0, z: -1750 },
    // A switchback trail between the crag columns, across the gorge floor and
    // up the broken ridge to the summit.
    route: [
      { x: 0, z: 20 }, { x: 0, z: 10 }, { x: -15, z: -90 }, { x: 0, z: -180 }, { x: 18, z: -250 }, { x: -5, z: -330 },
      { x: 0, z: -380 }, { x: -40, z: -480 }, { x: 0, z: -580 }, { x: 30, z: -670 }, { x: 0, z: -780 }, { x: -30, z: -880 },
      { x: 0, z: -980 }, { x: 40, z: -1080 }, { x: 0, z: -1180 }, { x: 15, z: -1235 }, { x: -20, z: -1300 }, { x: 0, z: -1365 },
      { x: 30, z: -1460 }, { x: 0, z: -1550 }, { x: 0, z: -1700 }, { x: 0, z: -1750 },
    ],
  };
}

/** Episodes are lists of districts played in order; the last carries the boss. */
export const MISSIONS: Array<Array<() => District>> = [[sunseedFields, crownlineCity, thunderheadRange]];
export const DISTRICTS: Array<() => District> = [sunseedFields, crownlineCity, thunderheadRange];
