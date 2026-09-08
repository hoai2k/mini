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
}
export type ShadowKind = 'shadeHound' | 'seedSpitter' | 'windowRay';
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
  start: { x: number; z: number; yaw: number };
  /** Reaching this ends the district. */
  exit: { x: number; z: number; r: number; name: string };
  landmark: { name: string; x: number; z: number };
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
    size: 2400,
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
  };
}

export const DISTRICTS: Array<() => District> = [sunseedFields];
