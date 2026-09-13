/** Mission three · Beyond the Black Sun: Vermilion Basin, Cobalt Drift and
 * Violet Inversion. Authored to LEVEL-PLAN-M2-M3.md; conventions as in
 * district.ts. Each region's gravity comes from its palette (1.35×, 0.55×,
 * 0.85×), so the same leap is short and heavy here, long and floating there.
 */
import { P, S, windingRoute, type District, type Placement, type ShadowSpawn } from './district';

/** A coral bridge that breaks behind Hopper in three signalled stages. */
const stagedBridge = (x: number, z: number, y: number, length: number): Placement => ({ ...P('structure.red.coralBridge', x, z, y, Math.PI / 2, { length, width: 12 }, 'a'), staged: { stages: 3, after: 1.2 } });

/** Vermilion Basin: the rib road, the Choir Arches, the staged bridge over
 * the basin, the Basin Floor and the terrace ascent toward the eclipse.
 * Gravity is 1.35×: leaps are short, landings heavy, the terraces wide. */
export function vermilionBasin(): District {
  const placements: Placement[] = [
    // Interlude 1 · Rib road (20 → −420): ivory-topped terraces as wide steps,
    // a rib arch across the road, coral spires as cover either side.
    P('prop.checkpointTotem', 0, 20),
    P('structure.red.basinTerrace', 0, -120, 0, 0, { w: 70, d: 40, h: 8 }),
    P('structure.red.coralSpire', -110, -160, 0, 0, { r: 10, h: 70 }),
    P('structure.red.ivoryRibArch', 0, -230, 0, 0, { span: 90, height: 45 }),
    P('prop.signalBeacon', 0, -230, 27, 0),
    P('structure.red.coralSpire', 120, -260, 0, 0.4, { r: 11, h: 80 }),
    P('structure.red.basinTerrace', 0, -330, 0, 0, { w: 80, d: 44, h: 14 }),
    P('structure.red.coralSpire', -130, -360, 0, -0.3, { r: 9, h: 60 }),
    P('prop.checkpointTotem', 0, -230),
    P('prop.checkpointTotem', 0, -420),
    // Stronghold 1 · The Choir Arches (centre 0,−650, r 200): three rib arches
    // in a row with choirs on their crowns, burrowers under the terraces.
    P('structure.red.ivoryRibArch', 0, -540, 0, 0, { span: 90, height: 48 }),
    P('structure.red.basinTerrace', -100, -600, 0, 0.3, { w: 70, d: 40, h: 12 }),
    P('structure.red.coralSpire', 130, -590, 0, 0.2, { r: 12, h: 90 }),
    P('structure.red.ivoryRibArch', 0, -650, 0, 0, { span: 96, height: 50 }),
    P('prop.checkpointTotem', 30, -660),
    P('structure.red.basinTerrace', 110, -700, 0, -0.3, { w: 70, d: 40, h: 12 }),
    P('structure.red.coralSpire', -130, -720, 0, -0.2, { r: 12, h: 90 }),
    P('structure.red.ivoryRibArch', 0, -760, 0, 0, { span: 90, height: 48 }),
    P('prop.recoveryCapsule', 0, -600, 3),
    P('prop.signalBeacon', 130, -590, 55, 0),
    P('prop.checkpointTotem', 0, -880),
    // Interlude 2 · The staged bridge (−880 → −1260): the coral bridge over the
    // basin breaks behind Hopper; dawdle and he drops to the floor, where a
    // spring pad waits.
    P('structure.red.basinTerrace', 0, -940, 0, 0, { w: 70, d: 40, h: 10 }),
    P('structure.red.coralSpire', -120, -960, 0, 0.1, { r: 10, h: 70 }),
    P('structure.red.coralSpire', 120, -1000, 0, 0.2, { r: 10, h: 70 }),
    stagedBridge(0, -1070, 12, 160),
    P('prop.springPad', 0, -1070, 0, 0, { w: 12 }),
    P('prop.signalBeacon', 40, -1070, -78, 0, undefined, 'a'),
    P('structure.red.coralSpire', 130, -1140, 0, -0.4, { r: 10, h: 70 }),
    P('structure.red.basinTerrace', 0, -1200, 0, 0, { w: 70, d: 40, h: 10 }),
    P('structure.red.coralSpire', -120, -1230, 0, 0.3, { r: 9, h: 60 }),
    P('prop.checkpointTotem', 0, -1000),
    P('prop.checkpointTotem', 0, -1260),
    // Stronghold 2 · The Basin Floor (centre 0,−1480, r 210) on the floor with
    // spires and a terrace ring around it.
    P('structure.red.coralSpire', -90, -1380, 0, 0.2, { r: 12, h: 90 }),
    P('structure.red.coralSpire', 100, -1400, 0, -0.2, { r: 12, h: 90 }),
    P('structure.red.basinTerrace', -110, -1480, 0, 0.5, { w: 60, d: 36, h: 12 }),
    P('structure.red.basinTerrace', 110, -1500, 0, -0.5, { w: 60, d: 36, h: 12 }),
    P('structure.red.ivoryRibArch', 0, -1480, 0, 0, { span: 100, height: 52 }),
    P('prop.checkpointTotem', 30, -1490),
    P('structure.red.coralSpire', -100, -1580, 0, -0.3, { r: 12, h: 90 }),
    P('structure.red.coralSpire', 90, -1600, 0, 0.3, { r: 12, h: 90 }),
    P('prop.recoveryCapsule', 0, -1420, 3),
    P('prop.signalBeacon', -90, -1380, 55, 0),
    P('prop.springPad', -30, -1640, 0, 0, { w: 10 }),
    P('prop.checkpointTotem', 0, -1700),
    // Interlude 3 · Terrace ascent (−1700 → −2100): the terraces climb out of
    // the basin toward the eclipse; a spring pad and a thermal on the way.
    P('prop.springPad', 0, -1740, 0, 0, { w: 12 }),
    P('structure.red.basinTerrace', 0, -1800, 0, 0, { w: 80, d: 40, h: 14 }),
    P('structure.red.coralSpire', -120, -1820, 0, 0.2, { r: 10, h: 70 }),
    P('structure.red.coralSpire', 130, -1880, 0, -0.1, { r: 10, h: 70 }),
    P('prop.thermalVent', 0, -1900, 0, 0, { height: 160 }),
    P('structure.red.basinTerrace', 0, -1960, 0, 0, { w: 80, d: 40, h: 14 }),
    P('structure.red.ivoryRibArch', 0, -2040, 0, 0, { span: 90, height: 45 }),
    P('prop.signalBeacon', 0, -2040, 27, 0),
    P('structure.red.coralSpire', -120, -2000, 0, 0.3, { r: 9, h: 60 }),
    P('structure.red.coralSpire', 120, -2060, 0, -0.3, { r: 9, h: 60 }),
    P('prop.checkpointTotem', 0, -1880),
    P('prop.checkpointTotem', 0, -2050),
  ];
  const shadows: ShadowSpawn[] = [
    S('bb1', 'basaltBurrower', 30, -170, { group: 'ribs' }),
    S('bb2', 'basaltBurrower', -30, -290, { group: 'ribs' }),
    // Stronghold 1 host: choirs on the crowns, burrowers off the spire tiers.
    S('ch1', 'thornChoir', 0, -540, { y: 28, group: 'choir', entry: 'perch', delay: 0 }),
    S('ch2', 'thornChoir', 0, -650, { y: 29, group: 'choir', entry: 'perch', delay: 1.5 }),
    S('ch3', 'thornChoir', 0, -760, { y: 28, group: 'choir', entry: 'perch', delay: 3 }),
    S('ch4', 'basaltBurrower', 130, -590, { y: 54, group: 'choir', entry: 'perch', delay: 0.5 }),
    S('ch5', 'basaltBurrower', -130, -720, { y: 54, group: 'choir', entry: 'perch', delay: 2 }),
    S('ch6', 'basaltBurrower', 110, -600, { y: 54, group: 'choir', entry: 'perch', delay: 4 }),
    S('ch7', 'basaltBurrower', -110, -715, { y: 54, group: 'choir', entry: 'ambush', delay: 5 }),
    S('ch8', 'thornChoir', 110, -700, { y: 13, group: 'choir', wave: 1, entry: 'perch' }),
    S('ch9', 'basaltBurrower', 130, -600, { y: 54, group: 'choir', wave: 1, entry: 'perch' }),
    S('ch10', 'basaltBurrower', -120, -710, { y: 54, group: 'choir', wave: 1, entry: 'perch' }),
    // Interlude 2 patrol on the far side.
    S('bb3', 'basaltBurrower', 30, -1180, { group: 'bridge' }),
    S('bb4', 'basaltBurrower', -20, -1240, { group: 'bridge' }),
    // Stronghold 2 host.
    S('bf1', 'basaltBurrower', -90, -1380, { y: 54, group: 'floor', entry: 'perch', delay: 0 }),
    S('bf2', 'basaltBurrower', 100, -1400, { y: 54, group: 'floor', entry: 'perch', delay: 1.5 }),
    S('bf3', 'basaltBurrower', -100, -1580, { y: 54, group: 'floor', entry: 'perch', delay: 3 }),
    S('bf4', 'thornChoir', 0, -1480, { y: 30, group: 'floor', entry: 'perch', delay: 0.5 }),
    S('bf5', 'thornChoir', -110, -1480, { y: 13, group: 'floor', entry: 'perch', delay: 2 }),
    S('bf6', 'thornChoir', 110, -1500, { y: 13, group: 'floor', entry: 'perch', delay: 4 }),
    S('bf7', 'basaltBurrower', 20, -1540, { group: 'floor', entry: 'ambush', delay: 5 }),
    S('bf8', 'thornChoir', 90, -1600, { y: 54, group: 'floor', wave: 1, entry: 'perch' }),
    S('bf9', 'thornChoir', -100, -1570, { y: 54, group: 'floor', wave: 1, entry: 'perch' }),
    S('bf10', 'basaltBurrower', 90, -1610, { y: 54, group: 'floor', wave: 1, entry: 'perch' }),
    // Interlude 3 patrol.
    S('bb5', 'basaltBurrower', 30, -1830, { group: 'ascent' }),
    S('bb6', 'basaltBurrower', -30, -1990, { group: 'ascent' }),
  ];
  return {
    region: 'red',
    mission: 2,
    name: 'Vermilion Basin',
    subtitle: 'Heavy ground. Short leaps. Wide ivory to land on.',
    size: 4800,
    terrain: {
      seed: 61,
      relief: 50,
      plateaus: [
        { x: 0, z: 0, r: 150, y: 0 },
        { x: 0, z: -650, r: 260, y: 10 },
        { x: 0, z: -960, r: 100, y: 12 },
        { x: 0, z: -1480, r: 300, y: -90 },
        { x: 0, z: -1880, r: 120, y: -30 },
        { x: 0, z: -2050, r: 200, y: 40 },
      ],
      valley: { axis: 'x', at: -1070, width: 180, depth: 90 },
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Rib road', z0: 20, z1: -420, beat: 'learn' },
      { name: 'The choir arches', z0: -420, z1: -880, beat: 'fight' },
      { name: 'The staged bridge', z0: -880, z1: -1260, beat: 'hazard' },
      { name: 'The basin floor', z0: -1260, z1: -1700, beat: 'fight' },
      { name: 'Terrace ascent', z0: -1700, z1: -2100, beat: 'climb' },
    ],
    strongholds: [
      { id: 'choir', name: 'The Choir Arches', x: 0, z: -650, r: 200, y: 30 },
      { id: 'floor', name: 'The Basin Floor', x: 0, z: -1480, r: 210, y: 30 },
    ],
    cages: [
      { id: 'cage-red-1', x: -70, z: -400, y: 2, mode: 'r' },
      { id: 'cage-red-2', x: 80, z: -1230, y: 2, mode: 'r' },
      { id: 'cage-red-3', x: -90, z: -1960, y: 2, mode: 'r' },
    ],
    start: { x: 0, z: 20, yaw: Math.PI },
    exit: { x: 0, z: -2050, r: 40, name: 'The eclipse road' },
    landmark: { name: 'The black sun', x: 0, z: -3200 },
    route: windingRoute(placements, { x: 0, z: 20 }, { x: 0, z: -2050 }),
  };
}

/** A reef adrift on a current: it slides slowly between two points. */
const drift = (x: number, z: number, y: number, dx: number, dz: number, r = 30): Placement => ({ ...P('structure.blue.floatingReef', x, z, y, 0, { r, thick: 14 }, 'a'), moving: { to: { x: x + dx, z: z + dz, y }, speed: 4, dwell: 3 } });
/** A reef held still by its roots: the ones a host can perch on. */
const reef = (x: number, z: number, y: number, r = 30): Placement => P('structure.blue.floatingReef', x, z, y, 0, { r, thick: 14 }, 'a');

/** Cobalt Drift: the lowest reefs, the Root Pillars, the current crossing,
 * the High Reef and the moon road, 330 m up by glides, currents and medusa
 * bounces. Gravity is 0.55×; the dust below lifts a fall back to the reefs. */
export function cobaltDrift(): District {
  const placements: Placement[] = [
    // Interlude 1 · The lowest reefs (20 → −420): three reefs adrift on marked
    // currents, the dust below, a root pillar to the side.
    P('prop.checkpointTotem', 0, 20),
    reef(0, -110, 64, 34),
    drift(0, -220, 70, 40, 0),
    P('structure.blue.dustCurrent', -30, -180, 72, 0.3, { length: 120, r: 12 }, 'a'),
    P('structure.blue.rootPillar', -120, -230, 0, 0, { h: 160, r: 6 }),
    P('prop.signalBeacon', -120, -230, 120, 0, undefined, 'a'),
    drift(0, -330, 78, -40, 0),
    reef(120, -360, 90, 26),
    P('prop.checkpointTotem', 0, -230, 70, 0, undefined, 'a'),
    P('prop.checkpointTotem', 0, -420, 90, 0, undefined, 'a'),
    reef(0, -420, 88, 30),
    // Stronghold 1 · The Root Pillars (centre 0,−650, r 220): four pillars with
    // shelves at four heights, reefs between; medusae are the bounces up.
    P('structure.blue.rootPillar', -95, -600, 0, 0, { h: 170, r: 6 }),
    P('structure.blue.rootPillar', 100, -680, 0, 0, { h: 180, r: 6 }),
    reef(0, -560, 110, 30),
    reef(30, -660, 140, 28),
    P('prop.checkpointTotem', 30, -660, 141, 0, undefined, 'a'),
    P('structure.blue.rootPillar', -120, -720, 0, 0, { h: 190, r: 6 }),
    P('structure.blue.rootPillar', 100, -760, 0, 0, { h: 200, r: 6 }),
    reef(-20, -760, 160, 30),
    P('prop.recoveryCapsule', 0, -560, 111, 0, undefined, 'a'),
    P('prop.signalBeacon', 100, -680, 150, 0, undefined, 'a'),
    P('prop.checkpointTotem', 0, -880, 150, 0, undefined, 'a'),
    reef(0, -880, 148, 32),
    // Interlude 2 · Current crossing (−880 → −1260): two currents carry a
    // glide across the gap between reef groups; medusae as the bounces.
    P('structure.blue.dustCurrent', 0, -960, 170, Math.PI / 2, { length: 140, r: 14 }, 'a'),
    P('structure.blue.rootPillar', -130, -980, 0, 0, { h: 220, r: 6 }),
    reef(90, -1000, 180, 24),
    reef(-90, -1120, 205, 24),
    drift(0, -1060, 200, 0, -30),
    P('prop.signalBeacon', 0, -1060, 201, 0, undefined, 'a'),
    P('structure.blue.dustCurrent', 0, -1150, 210, Math.PI / 2, { length: 140, r: 14 }, 'a'),
    P('structure.blue.rootPillar', 130, -1180, 0, 0, { h: 240, r: 6 }),
    P('prop.checkpointTotem', 0, -1060, 201, 0, undefined, 'a'),
    reef(0, -1260, 240, 32),
    P('prop.checkpointTotem', 0, -1260, 241, 0, undefined, 'a'),
    P('prop.thermalVent', 20, -1300, 241, 0, { height: 130 }, 'a'),
    // Stronghold 2 · The High Reef (centre 0,−1480, r 220) at 330 m: a ring of
    // reefs around a great reef.
    reef(-90, -1380, 290, 28),
    reef(90, -1400, 300, 28),
    reef(0, -1480, 330, 46),
    P('prop.checkpointTotem', 30, -1490, 331, 0, undefined, 'a'),
    reef(-100, -1560, 310, 28),
    reef(100, -1580, 320, 28),
    P('structure.blue.rootPillar', -105, -1450, 0, 0, { h: 300, r: 7 }),
    P('structure.blue.rootPillar', 110, -1520, 0, 0, { h: 310, r: 7 }),
    P('prop.recoveryCapsule', 0, -1480, 331, 0, undefined, 'a'),
    P('prop.signalBeacon', 90, -1400, 301, 0, undefined, 'a'),
    reef(0, -1700, 330, 30),
    P('prop.checkpointTotem', 0, -1700, 331, 0, undefined, 'a'),
    // Interlude 3 · The moon road (−1700 → −2100): reefs stepping toward the
    // moon; the exit on the last.
    drift(0, -1800, 332, 30, 0),
    P('structure.blue.rootPillar', -120, -1840, 0, 0, { h: 320, r: 6 }),
    reef(0, -1900, 330, 30),
    P('prop.checkpointTotem', 0, -1880, 331, 0, undefined, 'a'),
    P('structure.blue.dustCurrent', 0, -1960, 335, Math.PI / 2, { length: 120, r: 12 }, 'a'),
    P('structure.blue.rootPillar', 130, -1980, 0, 0, { h: 320, r: 6 }),
    P('prop.signalBeacon', 130, -1980, 320, 0, undefined, 'a'),
    reef(0, -2050, 330, 36),
    P('prop.checkpointTotem', 0, -2050, 331, 0, undefined, 'a'),
  ];
  const shadows: ShadowSpawn[] = [
    S('ps1', 'phaseSkate', 30, -160, { y: 90, mode: 'a', group: 'low' }),
    S('ps2', 'phaseSkate', -30, -300, { y: 100, mode: 'a', group: 'low' }),
    // Stronghold 1 host: medusae and skates off the pillar shelves.
    S('rp1', 'veilMedusa', -95, -600, { y: 160, mode: 'a', group: 'pillars', entry: 'perch', delay: 0 }),
    S('rp2', 'veilMedusa', 100, -680, { y: 170, mode: 'a', group: 'pillars', entry: 'perch', delay: 1.5 }),
    S('rp3', 'veilMedusa', -120, -720, { y: 180, mode: 'a', group: 'pillars', entry: 'perch', delay: 3 }),
    S('rp4', 'phaseSkate', 100, -760, { y: 190, mode: 'a', group: 'pillars', entry: 'perch', delay: 0.5 }),
    S('rp5', 'phaseSkate', -90, -620, { y: 150, mode: 'a', group: 'pillars', entry: 'perch', delay: 2 }),
    S('rp6', 'phaseSkate', 100, -700, { y: 160, mode: 'a', group: 'pillars', entry: 'perch', delay: 4 }),
    S('rp7', 'phaseSkate', 0, -640, { y: 150, mode: 'a', group: 'pillars', entry: 'ambush', delay: 5 }),
    S('rp8', 'veilMedusa', 0, -700, { y: 190, mode: 'a', group: 'pillars', wave: 1, entry: 'perch' }),
    S('rp9', 'phaseSkate', -110, -700, { y: 200, mode: 'a', group: 'pillars', wave: 1, entry: 'perch' }),
    S('rp10', 'phaseSkate', 100, -740, { y: 200, mode: 'a', group: 'pillars', wave: 1, entry: 'perch' }),
    // Interlude 2: two medusae as the bounces across.
    S('vm1', 'veilMedusa', 0, -1000, { y: 190, mode: 'a', group: 'crossing' }),
    S('vm2', 'veilMedusa', 20, -1120, { y: 220, mode: 'a', group: 'crossing' }),
    // Stronghold 2 host.
    S('hr1', 'phaseSkate', -90, -1380, { y: 300, mode: 'a', group: 'high', entry: 'perch', delay: 0 }),
    S('hr2', 'phaseSkate', 90, -1400, { y: 310, mode: 'a', group: 'high', entry: 'perch', delay: 1 }),
    S('hr3', 'phaseSkate', -100, -1560, { y: 320, mode: 'a', group: 'high', entry: 'perch', delay: 2 }),
    S('hr4', 'phaseSkate', 100, -1580, { y: 330, mode: 'a', group: 'high', entry: 'perch', delay: 3 }),
    S('hr5', 'veilMedusa', -105, -1450, { y: 350, mode: 'a', group: 'high', entry: 'perch', delay: 0.5 }),
    S('hr6', 'veilMedusa', 110, -1520, { y: 360, mode: 'a', group: 'high', entry: 'perch', delay: 2.5 }),
    S('hr7', 'phaseSkate', 0, -1440, { y: 340, mode: 'a', group: 'high', entry: 'ambush', delay: 5 }),
    S('hr8', 'phaseSkate', -80, -1400, { y: 340, mode: 'a', group: 'high', wave: 1, entry: 'perch' }),
    S('hr9', 'phaseSkate', 90, -1560, { y: 340, mode: 'a', group: 'high', wave: 1, entry: 'perch' }),
    S('hr10', 'veilMedusa', 0, -1520, { y: 360, mode: 'a', group: 'high', wave: 1, entry: 'perch' }),
    // Interlude 3 patrol.
    S('ps3', 'phaseSkate', 0, -1820, { y: 350, mode: 'a', group: 'moon' }),
    S('ps4', 'phaseSkate', 40, -1960, { y: 360, mode: 'a', group: 'moon' }),
  ];
  return {
    region: 'blue',
    mission: 2,
    name: 'Cobalt Drift',
    subtitle: 'Everything floats. So do you.',
    size: 4800,
    terrain: {
      seed: 67,
      relief: 20,
      plateaus: [
        { x: 0, z: 0, r: 150, y: 60 },
        { x: 0, z: -270, r: 90, y: 16 },
        { x: 0, z: -650, r: 260, y: 20 },
        { x: 0, z: -1060, r: 120, y: 20 },
        { x: 0, z: -1480, r: 300, y: 20 },
        { x: 0, z: -1900, r: 130, y: 20 },
        { x: 0, z: -2050, r: 200, y: 20 },
      ],
      valley: null,
      // The floor of the drift is dust: a fall ends in a slow lift, never a death.
      soft: { kind: 'dust', level: 12, lift: 22 },
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'The lowest reefs', z0: 20, z1: -420, beat: 'learn' },
      { name: 'The root pillars', z0: -420, z1: -880, beat: 'fight' },
      { name: 'Current crossing', z0: -880, z1: -1260, beat: 'run' },
      { name: 'The high reef', z0: -1260, z1: -1700, beat: 'fight' },
      { name: 'The moon road', z0: -1700, z1: -2100, beat: 'vista' },
    ],
    strongholds: [
      { id: 'pillars', name: 'The Root Pillars', x: 0, z: -650, r: 220, y: 140 },
      { id: 'high', name: 'The High Reef', x: 0, z: -1480, r: 220, y: 320 },
    ],
    cages: [
      { id: 'cage-blue-1', x: 12, z: -420, y: 89.5, mode: 'a' },
      { id: 'cage-blue-2', x: 14, z: -1260, y: 241.5, mode: 'a' },
      { id: 'cage-blue-3', x: -14, z: -1900, y: 331.5, mode: 'a' },
    ],
    start: { x: 0, z: 20, yaw: Math.PI },
    exit: { x: 0, z: -2050, r: 40, name: 'The moon reef' },
    landmark: { name: 'The drift moon', x: 0, z: -3200 },
    route: windingRoute(placements, { x: 0, z: 20 }, { x: 0, z: -2050 }, 14),
  };
}

/** A ring shard drifting on a chord of its orbit. */
const shard = (x: number, z: number, y: number, dx: number, dz: number, length = 110): Placement => ({ ...P('structure.violet.ringShard', x, z, y, 0, { length, width: 20 }, 'a'), moving: { to: { x: x + dx, z: z + dz, y }, speed: 5, dwell: 2 } });
/** An obsidian arch tall enough to hold a lane on its lintel's underside. */
const arch = (x: number, z: number, yaw: number, span = 90, height = 85): Placement => P('structure.violet.obsidianArch', x, z, 0, yaw, { span, height, thick: 10 });

/** Violet Inversion: the first arch, the Shard Ring, the inverted gallery,
 * the Cathedral Approach and the eclipse dais where the Regent descends.
 * Gravity is 0.85×; under every arch a seam marks a lane on the lintel's
 * underside, and the gallery can only be crossed inverted. */
export function violetInversion(): District {
  const placements: Placement[] = [
    // Interlude 1 · The first arch (20 → −420): two arches with seams, ring
    // shards drifting overhead, a signal on one lintel's underside lane.
    P('prop.checkpointTotem', 0, 20),
    arch(0, -140, 0),
    P('structure.violet.gravitySeam', 0, -140, 73, 0, { length: 80 }),
    P('prop.signalBeacon', 0, -140, 86, 0),
    shard(-120, -200, 60, 60, 0),
    arch(0, -300, 0, 96, 90),
    P('structure.violet.gravitySeam', 0, -300, 78, 0, { length: 84 }),
    shard(130, -340, 70, -60, 0),
    P('prop.checkpointTotem', 0, -230),
    P('prop.checkpointTotem', 0, -420),
    // Stronghold 1 · The Shard Ring (centre 0,−650, r 220): six shards orbiting
    // an arch; stalkers on the shards and under the lintel, a cantor above.
    arch(0, -650, 0, 110, 100),
    P('structure.violet.gravitySeam', 0, -650, 88, 0, { length: 100 }),
    P('prop.checkpointTotem', 30, -660),
    shard(-110, -560, 50, 40, -30),
    shard(110, -580, 60, -40, -30),
    shard(-130, -680, 70, 20, 40),
    shard(130, -700, 80, -20, 40),
    shard(-80, -780, 90, 60, 0),
    shard(90, -790, 100, -60, 0),
    arch(-120, -760, 0.4, 80, 85),
    arch(120, -540, -0.4, 80, 85),
    P('prop.recoveryCapsule', 0, -600, 3),
    P('prop.signalBeacon', 0, -650, 101, 0),
    P('prop.checkpointTotem', 0, -880),
    // Interlude 2 · The inverted gallery (−880 → −1260): a long arch whose
    // floor is broken; the only way across is the lane under its lintel.
    arch(-110, -960, 0.3, 80, 85),
    shard(110, -1000, 60, -40, 0),
    shard(-120, -1200, 70, 40, 0),
    arch(0, -1070, 0, 120, 90),
    P('structure.violet.gravitySeam', 0, -1070, 78, 0, { length: 110 }),
    P('prop.gravityGate', 0, -1000, 0, 0),
    P('prop.gravityGate', 0, -1140, 0, Math.PI),
    P('prop.signalBeacon', 0, -1070, 92, 0),
    arch(120, -1180, -0.3, 80, 85),
    P('prop.checkpointTotem', 0, -1000),
    P('prop.checkpointTotem', 0, -1260),
    // Stronghold 2 · The Cathedral Approach (centre 0,−1480, r 180): arches and
    // shards before the facade, cantors flipping the approach.
    arch(-90, -1380, 0.2, 90, 90),
    arch(90, -1400, -0.2, 90, 90),
    P('prop.checkpointTotem', 30, -1480),
    shard(-120, -1480, 70, 60, 0),
    shard(120, -1500, 80, -60, 0),
    arch(0, -1500, 0, 110, 100),
    P('structure.violet.gravitySeam', 0, -1500, 88, 0, { length: 100 }),
    arch(-100, -1590, 0.3, 80, 85),
    arch(100, -1600, -0.3, 80, 85),
    P('prop.recoveryCapsule', 0, -1420, 3),
    P('prop.signalBeacon', 0, -1500, 101, 0),
    P('prop.checkpointTotem', 0, -1660),
    // Interlude 3 · The eclipse dais (−1660 → −2300): the dais before the
    // facade at 160 m; the Regent's arena.
    arch(-110, -1740, 0.2, 80, 85),
    shard(-120, -1900, 80, 50, 0),
    shard(120, -1780, 60, -50, 0),
    arch(100, -1860, -0.2, 80, 85),
    P('prop.thermalVent', 0, -1900, 0, 0, { height: 140 }),
    P('structure.violet.eclipseDais', 0, -2140, 0, 0, { r: 40 }),
    // The eclipse canopy: shards held still over the dais, their undersides
    // at 280, the floor the Regent's turned gravity lands Hopper on.
    ...[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((yaw) => P('structure.violet.ringShard', 0, -2140, 286.3, yaw, { length: 130, width: 28 }, 'a')),
    P('structure.violet.cathedralFacade', 0, -2230, 0, 0, { w: 160, h: 140 }),
    P('structure.violet.gravitySeam', -70, -2140, 30, 0, { length: 60 }),
    P('structure.violet.gravitySeam', 70, -2140, 30, 0, { length: 60 }),
    P('prop.recoveryCapsule', 0, -2040, 3),
    P('prop.signalBeacon', 0, -2230, 141, 0),
    P('prop.checkpointTotem', 0, -1900),
    P('prop.checkpointTotem', 0, -2060),
    P('prop.checkpointTotem', 40, -2140),
  ];
  const shadows: ShadowSpawn[] = [
    S('ms1', 'mirrorStalker', 30, -190, { group: 'first' }),
    S('ms2', 'mirrorStalker', -30, -360, { group: 'first' }),
    // Stronghold 1 host: stalkers on the lintels and under one, a cantor over the centre.
    S('sr1', 'mirrorStalker', 0, -650, { y: 100, group: 'shards', entry: 'perch', delay: 0 }),
    S('sr2', 'mirrorStalker', -120, -760, { y: 85, group: 'shards', entry: 'perch', delay: 1.5 }),
    S('sr3', 'mirrorStalker', 20, -650, { y: 116, mode: 'a', group: 'shards', entry: 'perch', delay: 3, ceiling: true }),
    S('sr4', 'gravityCantor', 0, -620, { y: 150, mode: 'a', group: 'shards', entry: 'perch', delay: 0.5 }),
    S('sr5', 'mirrorStalker', 120, -540, { y: 85, group: 'shards', entry: 'perch', delay: 2 }),
    S('sr6', 'mirrorStalker', -30, -700, { group: 'shards', entry: 'ambush', delay: 5 }),
    S('sr7', 'mirrorStalker', 30, -600, { y: 100, group: 'shards', wave: 1, entry: 'perch' }),
    S('sr8', 'mirrorStalker', -20, -700, { y: 100, group: 'shards', wave: 1, entry: 'perch' }),
    S('sr9', 'gravityCantor', 0, -700, { y: 160, mode: 'a', group: 'shards', wave: 1, entry: 'perch' }),
    // Interlude 2: two stalkers on the gallery's ceiling.
    S('ms3', 'mirrorStalker', -20, -1040, { y: 156, mode: 'a', group: 'gallery', ceiling: true }),
    S('ms4', 'mirrorStalker', 20, -1100, { y: 156, mode: 'a', group: 'gallery', ceiling: true }),
    // Stronghold 2 host.
    S('ca1', 'mirrorStalker', -90, -1380, { y: 90, group: 'approach', entry: 'perch', delay: 0 }),
    S('ca2', 'mirrorStalker', 90, -1400, { y: 90, group: 'approach', entry: 'perch', delay: 1.5 }),
    S('ca3', 'mirrorStalker', 0, -1500, { y: 100, group: 'approach', entry: 'perch', delay: 3 }),
    S('ca4', 'gravityCantor', -60, -1440, { y: 170, mode: 'a', group: 'approach', entry: 'perch', delay: 0.5 }),
    S('ca5', 'gravityCantor', 60, -1540, { y: 170, mode: 'a', group: 'approach', entry: 'perch', delay: 2.5 }),
    S('ca6', 'mirrorStalker', 20, -1460, { group: 'approach', entry: 'ambush', delay: 5 }),
    S('ca7', 'mirrorStalker', -100, -1590, { y: 85, group: 'approach', wave: 1, entry: 'perch' }),
    S('ca8', 'mirrorStalker', 100, -1600, { y: 85, group: 'approach', wave: 1, entry: 'perch' }),
    S('ca9', 'gravityCantor', 0, -1440, { y: 180, mode: 'a', group: 'approach', wave: 1, entry: 'perch' }),
    // Interlude 3 patrol.
    S('ms5', 'mirrorStalker', 30, -1800, { group: 'dais' }),
    S('ms6', 'mirrorStalker', -30, -1960, { group: 'dais' }),
  ];
  return {
    region: 'violet',
    mission: 2,
    name: 'Violet Inversion',
    subtitle: 'Under every arch, another floor.',
    size: 4800,
    terrain: {
      seed: 71,
      relief: 45,
      plateaus: [
        { x: 0, z: 0, r: 150, y: 0 },
        { x: 0, z: -650, r: 260, y: 40 },
        { x: 0, z: -1070, r: 130, y: 90 },
        { x: 0, z: -1480, r: 240, y: 130 },
        { x: 0, z: -1900, r: 130, y: 150 },
        { x: 0, z: -2140, r: 320, y: 160 },
      ],
      valley: null,
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'The first arch', z0: 20, z1: -420, beat: 'learn' },
      { name: 'The shard ring', z0: -420, z1: -880, beat: 'fight' },
      { name: 'The inverted gallery', z0: -880, z1: -1260, beat: 'hazard' },
      { name: 'The cathedral approach', z0: -1260, z1: -1660, beat: 'fight' },
      { name: 'The eclipse dais', z0: -1660, z1: -2400, beat: 'finish' },
    ],
    strongholds: [
      { id: 'shards', name: 'The Shard Ring', x: 0, z: -650, r: 220, y: 30 },
      { id: 'approach', name: 'The Cathedral Approach', x: 0, z: -1480, r: 180, y: 30 },
    ],
    cages: [
      { id: 'cage-violet-1', x: 70, z: -400, y: 2, mode: 'r' },
      { id: 'cage-violet-2', x: -80, z: -1240, y: 2, mode: 'r' },
      { id: 'cage-violet-3', x: 90, z: -1940, y: 2, mode: 'r' },
    ],
    boss: { kind: 'eclipseRegent', x: 0, z: -2140, y: 40, r: 170 },
    start: { x: 0, z: 20, yaw: Math.PI },
    exit: { x: 0, z: -2140, r: 40, name: 'The eclipse dais' },
    landmark: { name: 'The eclipse cathedral', x: 0, z: -2230 },
    route: windingRoute(placements, { x: 0, z: 20 }, { x: 0, z: -2140 }),
  };
}
