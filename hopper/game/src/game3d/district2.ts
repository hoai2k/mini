/** Mission two · The Iron Migration: Cinder Foundries, Tempest Docks and
 * Skyhook Works. Authored to LEVEL-PLAN-M2-M3.md; the conventions are
 * district.ts's (z runs negative toward the landmark, the trail winds through
 * the props, every stronghold's host perches on its structures in view).
 */
import { P, S, windingRoute, type District, type Placement, type ShadowSpawn } from './district';

/** A placement with a conveyor flow along its own length (+x before yaw). */
const belt = (x: number, z: number, yaw: number, length: number, height: number, forward = 1): Placement => ({ ...P('structure.foundry.conveyorSpan', x, z, 0, yaw, { length, width: 9, height }), flow: { dx: forward, dz: 0, speed: 14 } });
/** A press whose ram rises and falls; standing on it as it rises is a launch. */
const press = (x: number, z: number, yaw: number, h: number, up: number): Placement => ({ ...P('structure.foundry.stampingPress', x, z, 0, yaw, { w: 20, h }), moving: { to: { x, z, y: up }, speed: 42, dwell: 1.4, fling: true } });

/** Cinder Foundries: furnace row, the Casting Yard, the belt run, the Slag
 * Channel in the casting trench, and the trench road out toward the crane
 * forest. Belts carry, presses fling, furnace doors and chimney lips are
 * thermals, and the slag at the trench floor lifts anyone who falls in. */
export function cinderFoundries(): District {
  const placements: Placement[] = [
    // Interlude 1 · Furnace row (20 → −440): two belts on the road with the
    // flow forward, a chimney's thermal to the left, a furnace tower with a
    // glowing door to the right, a press beside the path as a demonstration.
    P('prop.checkpointTotem', 0, 20),
    belt(0, -120, Math.PI / 2, 90, 6, -1),
    P('structure.foundry.chimney', -110, -160, 0, 0, { r: 6, h: 100 }),
    P('prop.thermalVent', -110, -160, 100, 0, { height: 120 }, 'a'),
    P('structure.foundry.furnaceTower', 120, -220, 0, -0.4, { r: 15, h: 70 }),
    P('prop.thermalVent', 120, -186, 0, 0, { height: 160 }),
    P('prop.signalBeacon', 120, -220, 71, 0),
    press(70, -300, 0, 40, 24),
    belt(0, -330, Math.PI / 2, 90, 8, -1),
    P('structure.foundry.slagBarge', -140, -300, 0, 0.3),
    P('prop.checkpointTotem', 0, -250),
    P('prop.checkpointTotem', 0, -440),
    // Stronghold 1 · The Casting Yard (centre 0,−680, r 200): three furnace
    // towers and two chimneys close together, a press at the centre, belts
    // between the towers; the host on the tower decks and the chimney lips.
    P('structure.foundry.furnaceTower', -90, -600, 0, 0.2, { r: 16, h: 80 }),
    P('structure.foundry.furnaceTower', 100, -640, 0, -0.3, { r: 16, h: 80 }),
    P('structure.foundry.chimney', -40, -700, 0, 0, { r: 5, h: 110 }),
    P('structure.foundry.chimney', 60, -740, 0, 0, { r: 5, h: 100 }),
    P('prop.thermalVent', -40, -700, 110, 0, { height: 100 }, 'a'),
    P('structure.foundry.furnaceTower', -80, -790, 0, 0.5, { r: 15, h: 75 }),
    press(0, -680, 0, 44, 26),
    P('prop.checkpointTotem', 20, -700),
    belt(-30, -560, 0.3, 100, 22, 1),
    belt(40, -820, -0.2, 100, 24, -1),
    P('structure.foundry.slagBarge', 170, -720, 0, 0.1),
    P('structure.foundry.slagBarge', -190, -660, 0, -0.2),
    P('prop.recoveryCapsule', 0, -640, 5),
    P('prop.signalBeacon', -40, -700, 111, 0),
    P('prop.checkpointTotem', 0, -900),
    // Interlude 2 · Belt run (−900 → −1240): four belts in sequence past the
    // slag barges at the channel's edge, two presses that launch across the
    // gaps, and a furnace door's thermal at the end.
    belt(0, -960, Math.PI / 2, 80, 10, -1),
    press(-70, -1010, 0, 40, 24),
    belt(0, -1060, Math.PI / 2, 80, 14, -1),
    P('structure.foundry.slagBarge', 150, -1000, 0, 0.2),
    P('structure.foundry.slagBarge', 160, -1120, 0, -0.1),
    press(70, -1120, 0, 40, 24),
    belt(0, -1170, Math.PI / 2, 80, 12, -1),
    P('structure.foundry.chimney', -150, -1080, 0, 0, { r: 5, h: 90 }),
    P('prop.signalBeacon', -150, -1080, 91, 0),
    P('structure.foundry.furnaceTower', -130, -1200, 0, 0.3, { r: 14, h: 60 }),
    P('prop.thermalVent', -130, -1168, 0, 0, { height: 140 }),
    P('prop.checkpointTotem', 0, -1080),
    P('prop.checkpointTotem', 0, -1240),
    // Stronghold 2 · The Slag Channel (centre 0,−1470, r 210): the casting
    // trench, hot slag on its floor, barges as the stepping stones across,
    // casters on the barges and the lip, hounds on the belts spanning it.
    P('structure.foundry.furnaceTower', -120, -1340, 0, 0.1, { r: 16, h: 80 }),
    P('structure.foundry.chimney', 110, -1360, 0, 0, { r: 6, h: 110 }),
    P('prop.thermalVent', 110, -1360, 110, 0, { height: 100 }, 'a'),
    P('structure.foundry.slagBarge', -20, -1440, -63, 0.15, { length: 44, width: 18 }, 'a'),
    P('structure.foundry.slagBarge', 30, -1500, -63, -0.2, { length: 44, width: 18 }, 'a'),
    P('structure.foundry.slagBarge', -40, -1560, -63, 0.1, { length: 40, width: 16 }, 'a'),
    belt(-70, -1470, Math.PI / 2, 110, 46, -1),
    belt(80, -1480, Math.PI / 2, 110, 48, -1),
    P('structure.foundry.chimney', -60, -1410, 0, 0, { r: 6, h: 110 }),
    P('prop.checkpointTotem', -20, -1440, -57.3, 0, undefined, 'a'),
    P('structure.foundry.furnaceTower', 130, -1600, 0, -0.4, { r: 16, h: 80 }),
    P('structure.foundry.chimney', -110, -1620, 0, 0, { r: 5, h: 100 }),
    P('prop.thermalVent', 0, -1590, -60, 0, { height: 130 }, 'a'),
    P('prop.recoveryCapsule', -20, -1440, -57, 0, undefined, 'a'),
    P('prop.signalBeacon', 30, -1500, -57, 0, undefined, 'a'),
    P('prop.checkpointTotem', 0, -1700),
    // Interlude 3 · Trench road (−1700 → −2100): out of the trench on a
    // furnace door's thermal, the road between chimneys toward the cranes.
    P('prop.thermalVent', 0, -1730, 0, 0, { height: 120 }),
    P('structure.foundry.chimney', -120, -1800, 0, 0, { r: 5, h: 90 }),
    P('structure.foundry.furnaceTower', 130, -1850, 0, 0.2, { r: 14, h: 65 }),
    belt(0, -1900, Math.PI / 2, 90, 8, -1),
    P('structure.foundry.slagBarge', -150, -1960, 0, 0.3),
    P('structure.foundry.chimney', 120, -2000, 0, 0, { r: 5, h: 95 }),
    P('prop.signalBeacon', 120, -2000, 96, 0),
    P('prop.checkpointTotem', 0, -1880),
    P('prop.checkpointTotem', 0, -2050),
  ];
  const shadows: ShadowSpawn[] = [
    S('fh1', 'furnaceHound', 40, -180, { group: 'row' }),
    S('fh2', 'furnaceHound', -30, -220, { group: 'row' }),
    // Stronghold 1 host.
    S('y1', 'furnaceHound', -90, -600, { y: 80, group: 'yard', entry: 'perch', delay: 0 }),
    S('y2', 'furnaceHound', 100, -640, { y: 80, group: 'yard', entry: 'perch', delay: 1.5 }),
    S('y3', 'slagCaster', -40, -700, { y: 110, group: 'yard', entry: 'perch', delay: 0.5 }),
    S('y4', 'slagCaster', 60, -740, { y: 100, group: 'yard', entry: 'perch', delay: 2 }),
    S('y5', 'furnaceHound', -30, -560, { group: 'yard', entry: 'perch', delay: 3 }),
    S('y6', 'furnaceHound', 40, -820, { group: 'yard', entry: 'perch', delay: 4 }),
    S('y7', 'furnaceHound', -60, -700, { group: 'yard', entry: 'ambush', delay: 5 }),
    S('y8', 'slagCaster', -80, -790, { y: 75, group: 'yard', wave: 1, entry: 'perch' }),
    S('y9', 'furnaceHound', 30, -620, { group: 'yard', wave: 1, entry: 'perch' }),
    S('y10', 'furnaceHound', -20, -760, { group: 'yard', wave: 1, entry: 'perch' }),
    // Interlude 2 patrol along a belt.
    S('fh3', 'furnaceHound', 20, -1040, { group: 'belts' }),
    S('fh4', 'furnaceHound', -30, -1100, { group: 'belts' }),
    // Stronghold 2 host.
    S('c1', 'slagCaster', -20, -1440, { y: -57.3, mode: 'a', group: 'channel', entry: 'perch', delay: 0 }),
    S('c2', 'slagCaster', 30, -1500, { y: -57.3, mode: 'a', group: 'channel', entry: 'perch', delay: 1.5 }),
    S('c3', 'slagCaster', -120, -1340, { y: 80, group: 'channel', entry: 'perch', delay: 3 }),
    S('c4', 'furnaceHound', -70, -1470, { y: 46, group: 'channel', entry: 'perch', delay: 0.5 }),
    S('c5', 'furnaceHound', 80, -1480, { y: 48, group: 'channel', entry: 'perch', delay: 2 }),
    S('c6', 'furnaceHound', 130, -1600, { y: 80, group: 'channel', entry: 'perch', delay: 4 }),
    S('c7', 'furnaceHound', -40, -1560, { y: -57.3, mode: 'a', group: 'channel', entry: 'ambush', delay: 5 }),
    S('c8', 'slagCaster', 110, -1360, { y: 110, group: 'channel', wave: 1, entry: 'perch' }),
    S('c9', 'slagCaster', -110, -1620, { y: 100, group: 'channel', wave: 1, entry: 'perch' }),
    S('c10', 'furnaceHound', -70, -1520, { y: 46, group: 'channel', wave: 1, entry: 'perch' }),
    // Interlude 3 patrol.
    S('fh5', 'furnaceHound', 30, -1820, { group: 'trench' }),
    S('fh6', 'furnaceHound', -20, -1960, { group: 'trench' }),
  ];
  return {
    region: 'foundry',
    mission: 1,
    name: 'Cinder Foundries',
    subtitle: 'The belts carry. The presses throw. The slag lifts.',
    size: 4800,
    terrain: {
      seed: 41,
      relief: 40,
      plateaus: [
        { x: 0, z: 0, r: 150, y: 0 },
        { x: 0, z: -680, r: 240, y: -4 },
        { x: 0, z: -1070, r: 130, y: -10 },
        { x: 0, z: -1470, r: 270, y: -18 },
        { x: 0, z: -1880, r: 120, y: -40 },
        { x: 0, z: -2050, r: 200, y: -50 },
      ],
      valley: { axis: 'x', at: -1470, width: 110, depth: 47 },
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Furnace row', z0: 20, z1: -440, beat: 'learn' },
      { name: 'The casting yard', z0: -440, z1: -900, beat: 'fight' },
      { name: 'Belt run', z0: -900, z1: -1240, beat: 'run' },
      { name: 'The slag channel', z0: -1240, z1: -1700, beat: 'hazard' },
      { name: 'Trench road', z0: -1700, z1: -2100, beat: 'finish' },
    ],
    strongholds: [
      { id: 'yard', name: 'The Casting Yard', x: 0, z: -680, r: 200, y: 30 },
      { id: 'channel', name: 'The Slag Channel', x: 0, z: -1470, r: 210, y: 10 },
    ],
    cages: [
      { id: 'cage-foundry-1', x: -60, z: -400, y: 2, mode: 'r' },
      { id: 'cage-foundry-2', x: 90, z: -1200, y: 2, mode: 'r' },
      { id: 'cage-foundry-3', x: -70, z: -1980, y: 2, mode: 'r' },
    ],
    start: { x: 0, z: 20, yaw: Math.PI },
    exit: { x: 0, z: -2050, r: 40, name: 'The trench mouth' },
    landmark: { name: 'The crane forest', x: 0, z: -3200 },
    route: windingRoute(placements, { x: 0, z: 20 }, { x: 0, z: -2050 }),
  };
}

/** A container stack on a crane cable: a load that slides along the quay. */
const load = (x: number, z: number, yaw: number, dx: number, dz: number, rows = 3): Placement => ({ ...P('structure.harbor.containerStack', x, z, 0, yaw, { rows, cols: 3 }), moving: { to: { x: x + dx, z: z + dz }, speed: 5, dwell: 2 } });

/** Tempest Docks: the breakwater, the Container Yard, the freighter
 * crossing, the Gantry Tower and the crane forest toward the launch spine.
 * Stacks are stairs, crane loads slide, the sea pushes a fallen Hopper back
 * to the trail, and the last five booms climb to 180 m. */
export function tempestDocks(): District {
  const placements: Placement[] = [
    // Interlude 1 · Breakwater (20 → −420): the breakwater along the left with
    // the sea beyond, stacks of rising height on the road, a boom overhead.
    P('prop.checkpointTotem', 0, 20),
    P('structure.harbor.breakwater', -150, -150, 0, 0, { length: 260, height: 10 }),
    P('structure.harbor.containerStack', 0, -120, 0, 0, { rows: 2, cols: 4 }),
    P('structure.harbor.containerStack', 0, -200, 0, 0, { rows: 3, cols: 4 }),
    P('structure.harbor.containerStack', 0, -280, 0, 0, { rows: 4, cols: 4 }),
    P('structure.harbor.craneBoom', 110, -240, 0, -1.2, { h: 90, reach: 80 }),
    P('prop.signalBeacon', 0, -280, 24, 0),
    P('structure.harbor.containerStack', 140, -340, 0, 0.4, { rows: 3, cols: 3 }),
    P('structure.harbor.breakwater', -150, -420, 0, 0, { length: 200, height: 10 }),
    P('prop.checkpointTotem', 0, -230),
    P('prop.checkpointTotem', 0, -420),
    // Stronghold 1 · The Container Yard (centre 0,−650, r 200): six stacks in
    // two rows, three booms whose loads slide, a gantry tower at the back.
    P('structure.harbor.containerStack', -60, -540, 0, 0, { rows: 4, cols: 4 }),
    P('structure.harbor.containerStack', 60, -560, 0, 0, { rows: 4, cols: 4 }),
    P('structure.harbor.craneBoom', -140, -600, 0, 1.0, { h: 95, reach: 90 }),
    load(-20, -620, 0, 60, 0, 4),
    P('structure.harbor.craneBoom', 150, -660, 0, -1.0, { h: 95, reach: 90 }),
    load(30, -690, 0, -60, 0, 4),
    P('structure.harbor.containerStack', -70, -740, 0, 0, { rows: 4, cols: 4 }),
    P('structure.harbor.containerStack', 70, -760, 0, 0, { rows: 4, cols: 4 }),
    P('structure.harbor.craneBoom', -20, -755, 0, Math.PI, { h: 100, reach: 90 }),
    P('prop.checkpointTotem', 30, -650),
    P('structure.harbor.gantryTower', -160, -800, 0, 0.2, { w: 24, h: 130 }),
    P('prop.recoveryCapsule', 0, -600, 3),
    P('prop.signalBeacon', -160, -800, 133, 0),
    P('prop.checkpointTotem', 0, -880),
    // Interlude 2 · The freighter crossing (−880 → −1260): the ship's decks
    // over the storm channel, a boom on the far quay.
    P('structure.harbor.containerStack', -60, -920, 0, 0, { rows: 3, cols: 3 }),
    P('structure.harbor.freighter', 0, -1070, -20, Math.PI / 2, { length: 240, width: 44, height: 22 }, 'a'),
    P('prop.signalBeacon', -84, -1070, 32, 0, undefined, 'a'),
    P('structure.harbor.breakwater', 160, -1000, 0, Math.PI / 2, { length: 160, height: 10 }),
    P('structure.harbor.breakwater', -160, -1140, 0, Math.PI / 2, { length: 160, height: 10 }),
    P('structure.harbor.craneBoom', 90, -1210, 0, -0.8, { h: 90, reach: 80 }),
    P('prop.thermalVent', 60, -1200, 0, 0, { height: 200 }),
    P('prop.checkpointTotem', 0, -1100, 2, 0, undefined, 'a'),
    P('prop.checkpointTotem', 0, -1260),
    // Stronghold 2 · The Gantry Tower (centre 0,−1480, r 200) on a plateau at
    // 90 m: the tower with four decks and the bridge, stacks round it.
    P('structure.harbor.containerStack', -80, -1360, 0, 0.2, { rows: 4, cols: 4 }),
    P('structure.harbor.containerStack', 90, -1380, 0, -0.2, { rows: 4, cols: 4 }),
    P('structure.harbor.gantryTower', 0, -1480, 0, 0, { w: 26, h: 130 }),
    load(-90, -1470, 0, 0, -60, 4),
    P('structure.harbor.craneBoom', 150, -1500, 0, -1.1, { h: 100, reach: 90 }),
    P('structure.harbor.craneBoom', -160, -1560, 0, 1.1, { h: 100, reach: 90 }),
    P('structure.harbor.containerStack', 70, -1600, 0, 0.1, { rows: 4, cols: 4 }),
    P('structure.harbor.containerStack', -60, -1620, 0, -0.1, { rows: 3, cols: 4 }),
    P('prop.recoveryCapsule', 0, -1400, 3),
    P('prop.signalBeacon', 0, -1480, 133, 0),
    P('prop.springPad', 40, -1440),
    P('prop.checkpointTotem', 40, -1480),
    P('prop.checkpointTotem', 0, -1700),
    // Interlude 3 · Crane forest (−1700 → −2100): five booms of rising height,
    // each tip a landing, toward the launch spine; the exit on the last.
    P('prop.springPad', 0, -1740),
    P('structure.harbor.craneBoom', -70, -1790, 0, 0.9, { h: 70, reach: 70 }),
    P('structure.harbor.craneBoom', 80, -1860, 0, -1.0, { h: 95, reach: 70 }),
    P('structure.harbor.containerStack', -140, -1860, 0, 0.3, { rows: 3, cols: 3 }),
    P('structure.harbor.craneBoom', -80, -1930, 0, 1.1, { h: 120, reach: 70 }),
    P('prop.thermalVent', 0, -1900, 0, 0, { height: 200 }),
    P('structure.harbor.craneBoom', 90, -2000, 0, -1.2, { h: 145, reach: 70 }),
    P('structure.harbor.containerStack', 150, -1960, 0, -0.3, { rows: 3, cols: 3 }),
    P('structure.harbor.craneBoom', 0, -2060, 0, Math.PI, { h: 170, reach: 60 }),
    P('prop.signalBeacon', 0, -2060, 175, 0),
    P('prop.checkpointTotem', 0, -1880),
    P('prop.checkpointTotem', 0, -2050),
  ];
  const shadows: ShadowSpawn[] = [
    S('bc1', 'ballastCrab', 30, -160, { group: 'breakwater' }),
    S('bc2', 'ballastCrab', -30, -240, { group: 'breakwater' }),
    // Stronghold 1 host.
    S('cy1', 'ballastCrab', -60, -540, { y: 24, group: 'yard', entry: 'perch', delay: 0 }),
    S('cy2', 'ballastCrab', 60, -560, { y: 24, group: 'yard', entry: 'perch', delay: 1.5 }),
    S('cy3', 'chainManta', -140, -600, { y: 130, mode: 'a', group: 'yard', entry: 'perch', delay: 0.5 }),
    S('cy4', 'chainManta', 150, -660, { y: 130, mode: 'a', group: 'yard', entry: 'perch', delay: 2 }),
    S('cy5', 'ballastCrab', -70, -740, { y: 24, group: 'yard', entry: 'perch', delay: 3 }),
    S('cy6', 'chainManta', -20, -755, { y: 140, mode: 'a', group: 'yard', entry: 'perch', delay: 3.5 }),
    S('cy7', 'ballastCrab', 20, -700, { group: 'yard', entry: 'ambush', delay: 5 }),
    S('cy8', 'chainManta', -60, -680, { y: 120, mode: 'a', group: 'yard', wave: 1, entry: 'perch' }),
    S('cy9', 'ballastCrab', 70, -760, { y: 24, group: 'yard', wave: 1, entry: 'perch' }),
    S('cy10', 'ballastCrab', -20, -600, { group: 'yard', wave: 1, entry: 'perch' }),
    // Interlude 2 patrol over the channel.
    S('m1', 'chainManta', 0, -1020, { y: 90, mode: 'a', group: 'channel' }),
    S('m2', 'chainManta', 40, -1120, { y: 96, mode: 'a', group: 'channel' }),
    // Stronghold 2 host.
    S('gt1', 'ballastCrab', 0, -1480, { y: 33, group: 'gantry', entry: 'perch', delay: 0 }),
    S('gt2', 'ballastCrab', -80, -1360, { y: 24, group: 'gantry', entry: 'perch', delay: 1.5 }),
    S('gt3', 'ballastCrab', 90, -1380, { y: 24, group: 'gantry', entry: 'perch', delay: 3 }),
    S('gt4', 'chainManta', 150, -1500, { y: 230, mode: 'a', group: 'gantry', entry: 'perch', delay: 0.5 }),
    S('gt5', 'chainManta', -160, -1560, { y: 230, mode: 'a', group: 'gantry', entry: 'perch', delay: 2 }),
    S('gt6', 'chainManta', 0, -1560, { y: 240, mode: 'a', group: 'gantry', entry: 'perch', delay: 4 }),
    S('gt7', 'ballastCrab', 30, -1520, { group: 'gantry', entry: 'ambush', delay: 5 }),
    S('gt8', 'ballastCrab', 70, -1600, { y: 24, group: 'gantry', wave: 1, entry: 'perch' }),
    S('gt9', 'chainManta', -40, -1440, { y: 235, mode: 'a', group: 'gantry', wave: 1, entry: 'perch' }),
    S('gt10', 'chainManta', 60, -1470, { y: 235, mode: 'a', group: 'gantry', wave: 1, entry: 'perch' }),
    // Interlude 3 patrol.
    S('m3', 'chainManta', 0, -1800, { y: 210, mode: 'a', group: 'forest' }),
    S('m4', 'chainManta', 50, -1960, { y: 260, mode: 'a', group: 'forest' }),
  ];
  return {
    region: 'harbor',
    mission: 1,
    name: 'Tempest Docks',
    subtitle: 'Stacks are stairs. Booms are bridges. The sea gives you back.',
    size: 4800,
    terrain: {
      seed: 47,
      relief: 30,
      plateaus: [
        { x: 0, z: 0, r: 150, y: 0 },
        { x: 0, z: -650, r: 240, y: 6 },
        { x: 0, z: -1070, r: 150, y: 10 },
        { x: 0, z: -1480, r: 240, y: 90 },
        { x: 0, z: -1880, r: 130, y: 120 },
        { x: 0, z: -2050, r: 200, y: 150 },
      ],
      valley: { axis: 'x', at: -1070, width: 140, depth: 40 },
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Breakwater', z0: 20, z1: -420, beat: 'climb' },
      { name: 'The container yard', z0: -420, z1: -880, beat: 'fight' },
      { name: 'The freighter crossing', z0: -880, z1: -1260, beat: 'vista' },
      { name: 'The gantry tower', z0: -1260, z1: -1700, beat: 'fight' },
      { name: 'Crane forest', z0: -1700, z1: -2100, beat: 'climb' },
    ],
    strongholds: [
      { id: 'yard', name: 'The Container Yard', x: 0, z: -650, r: 200, y: 30 },
      { id: 'gantry', name: 'The Gantry Tower', x: 0, z: -1480, r: 200, y: 40 },
    ],
    cages: [
      { id: 'cage-harbor-1', x: 60, z: -380, y: 2, mode: 'r' },
      { id: 'cage-harbor-2', x: -90, z: -1230, y: 2, mode: 'r' },
      { id: 'cage-harbor-3', x: 100, z: -1900, y: 2, mode: 'r' },
    ],
    start: { x: 0, z: 20, yaw: Math.PI },
    exit: { x: 0, z: -2050, r: 40, name: 'The last boom' },
    landmark: { name: 'The launch spine', x: 0, z: -3200 },
    route: windingRoute(placements, { x: 0, z: 20 }, { x: 0, z: -2050 }),
  };
}

/** A piston stair that rises and falls as one, out of phase with the next. */
const pistons = (x: number, z: number, yaw: number, count: number, phaseUp: number): Placement => ({ ...P('structure.launchworks.pistonStair', x, z, 0, yaw, { count, w: 12, rise: 14 }), moving: { to: { x, z, y: phaseUp }, speed: 6, dwell: 1.2 } });

/** Skyhook Works: the exhaust shaft, the Piston Yard, the scaffold lanes,
 * the Launch Ring and the gantry elevator where the Leviathan is coiled.
 * The star gate at the top of the elevator is the way out of the mission. */
export function skyhookWorks(): District {
  const placements: Placement[] = [
    // Interlude 1 · Exhaust shaft (20 → −440): the road ends at the rim; the
    // shaft descends by four baffles, climbable faces between, a thermal at
    // the bottom lifts back out to the far rim.
    P('prop.checkpointTotem', 0, 20),
    P('structure.launchworks.rocket', -130, -120, 0, 0, { r: 9, h: 150 }),
    P('structure.launchworks.exhaustShaft', 0, -230, 0, 0, { r: 30, depth: 120 }),
    P('prop.signalBeacon', 0, -230, -118, 0, undefined, 'a'),
    P('structure.launchworks.pistonStair', 120, -150, 0, -0.3, { count: 4 }),
    P('prop.checkpointTotem', 0, -190),
    P('structure.launchworks.pistonStair', -110, -330, 0, 0.4, { count: 4 }),
    P('structure.launchworks.rocket', 140, -380, 0, 0, { r: 8, h: 120 }),
    P('prop.checkpointTotem', 0, -440),
    // Stronghold 1 · The Piston Yard (centre 0,−680, r 200): three stairs
    // rising and falling out of phase, a wraith pair gating the lane between.
    pistons(-60, -580, 0.2, 6, 10),
    pistons(60, -660, -0.2, 6, 14),
    P('structure.launchworks.rocket', -100, -640, 0, 0, { r: 9, h: 150 }),
    P('structure.launchworks.rocket', 90, -570, 0, 0, { r: 8, h: 120 }),
    P('structure.launchworks.rocket', 110, -730, 0, 0, { r: 9, h: 150 }),
    P('prop.checkpointTotem', 30, -680),
    P('structure.launchworks.rocket', -150, -700, 0, 0, { r: 9, h: 160 }),
    P('structure.launchworks.exhaustShaft', 150, -720, 0, 0, { r: 22, depth: 60 }),
    pistons(0, -760, 0, 6, 12),
    P('structure.launchworks.rocket', 120, -820, 0, 0, { r: 8, h: 130 }),
    P('prop.recoveryCapsule', 0, -620, 3),
    P('prop.signalBeacon', -150, -700, 66, 0),
    P('prop.checkpointTotem', 0, -900),
    // Interlude 2 · Scaffold lanes (−900 → −1260): lanes between the rocket
    // gantries, each gated by a wraith pair; wasps as platforms across a gap.
    P('structure.launchworks.rocket', -90, -980, 0, 0, { r: 9, h: 150 }),
    P('structure.launchworks.rocket', 90, -1040, 0, 0, { r: 9, h: 150 }),
    P('structure.launchworks.pistonStair', 0, -1100, 0, Math.PI / 2, { count: 5 }),
    P('prop.signalBeacon', 90, -1040, 100, 0),
    P('structure.launchworks.rocket', -120, -1180, 0, 0, { r: 8, h: 140 }),
    P('prop.thermalVent', 0, -1200, 0, 0, { height: 180 }),
    P('prop.checkpointTotem', 0, -1080),
    P('prop.checkpointTotem', 0, -1260),
    // Stronghold 2 · The Launch Ring (centre 0,−1490, r 220) at 200 m: the
    // ring's eight pads round the spine, piston stairs up to them.
    P('structure.launchworks.launchRing', 0, -1440, 0, 0, { r: 60, tube: 6, height: 120 }),
    P('prop.checkpointTotem', 30, -1440),
    pistons(-130, -1360, 0.6, 6, 12),
    pistons(130, -1380, -0.6, 6, 10),
    P('structure.launchworks.rocket', -140, -1520, 0, 0, { r: 9, h: 160 }),
    P('structure.launchworks.rocket', 150, -1540, 0, 0, { r: 9, h: 160 }),
    P('prop.thermalVent', 0, -1440, 0, 0, { height: 150 }),
    P('prop.recoveryCapsule', 0, -1370, 3),
    P('prop.signalBeacon', 0, -1380, 126, 0),
    P('prop.checkpointTotem', 0, -1640),
    // Interlude 3 · The gantry elevator (−1720 → −2150): the elevator tower
    // on the 300 m plateau with the rocket beside it; the Leviathan's arena.
    P('prop.thermalVent', 30, -1660, 0, 0, { height: 200 }),
    P('structure.launchworks.rocket', -120, -1700, 0, 0, { r: 8, h: 130 }),
    P('structure.launchworks.pistonStair', 100, -1740, 0, -0.3, { count: 5 }),
    P('structure.launchworks.pistonStair', -90, -1820, 0, 0.3, { count: 5 }),
    P('structure.launchworks.rocket', 110, -1880, 0, 0, { r: 9, h: 150 }),
    P('prop.thermalVent', 0, -1900, 0, 0, { height: 160 }),
    P('structure.launchworks.gantryElevator', 0, -2100, 0, 0, { h: 150, w: 16 }),
    P('structure.launchworks.rocket', -70, -2110, 0, 0, { r: 10, h: 170 }),
    P('structure.launchworks.launchRing', 0, -2100, 0, 0, { r: 70, tube: 5, height: 150 }),
    P('prop.thermalVent', 60, -2060, 0, 0, { height: 180 }),
    P('prop.recoveryCapsule', -40, -2000, 3),
    P('prop.signalBeacon', -70, -2110, 171, 0),
    P('prop.checkpointTotem', 0, -1900),
    P('prop.checkpointTotem', 0, -2050),
  ];
  const shadows: ShadowSpawn[] = [
    S('w1', 'turbineWasp', 40, -160, { y: 60, mode: 'a', group: 'rim' }),
    S('w2', 'turbineWasp', -40, -260, { y: 60, mode: 'a', group: 'rim' }),
    // Stronghold 1 host: wasps off the stair tops, a wraith pair across the lane.
    S('p1', 'turbineWasp', -60, -580, { y: 100, mode: 'a', group: 'pistons', entry: 'perch', delay: 0 }),
    S('p2', 'turbineWasp', 60, -660, { y: 100, mode: 'a', group: 'pistons', entry: 'perch', delay: 1.5 }),
    S('p3', 'turbineWasp', 0, -760, { y: 100, mode: 'a', group: 'pistons', entry: 'perch', delay: 3 }),
    S('p4', 'coilWraith', -40, -700, { y: 8, group: 'pistons', entry: 'perch', delay: 0.5, link: [40, 14, -700] }),
    S('p5', 'coilWraith', 40, -700, { y: 8, group: 'pistons', entry: 'perch', delay: 0.5, link: [-40, 14, -700] }),
    S('p6', 'turbineWasp', -30, -640, { y: 80, mode: 'a', group: 'pistons', entry: 'ambush', delay: 5 }),
    S('p7', 'turbineWasp', 30, -600, { y: 110, mode: 'a', group: 'pistons', wave: 1, entry: 'perch' }),
    S('p8', 'turbineWasp', -20, -720, { y: 110, mode: 'a', group: 'pistons', wave: 1, entry: 'perch' }),
    S('p9', 'coilWraith', -60, -620, { y: 8, group: 'pistons', wave: 1, entry: 'perch', link: [60, 14, -620] }),
    // Interlude 2: a wraith pair gating the lane.
    S('cw1', 'coilWraith', -40, -1000, { y: 10, group: 'lanes', link: [40, 16, -1000] }),
    S('cw2', 'coilWraith', 40, -1000, { y: 10, group: 'lanes', link: [-40, 16, -1000] }),
    // Stronghold 2 host.
    S('r1', 'turbineWasp', 52, -1412, { y: 340, mode: 'a', group: 'ring', entry: 'perch', delay: 0 }),
    S('r2', 'turbineWasp', -52, -1468, { y: 340, mode: 'a', group: 'ring', entry: 'perch', delay: 1 }),
    S('r3', 'turbineWasp', 20, -1385, { y: 340, mode: 'a', group: 'ring', entry: 'perch', delay: 2 }),
    S('r4', 'turbineWasp', -20, -1495, { y: 340, mode: 'a', group: 'ring', entry: 'perch', delay: 3 }),
    S('r5', 'coilWraith', -40, -1440, { y: 130, group: 'ring', entry: 'perch', delay: 0.5, link: [40, 136, -1440] }),
    S('r6', 'coilWraith', 40, -1440, { y: 130, group: 'ring', entry: 'perch', delay: 0.5, link: [-40, 136, -1440] }),
    S('r7', 'turbineWasp', -30, -1420, { y: 300, mode: 'a', group: 'ring', entry: 'ambush', delay: 5 }),
    S('r8', 'turbineWasp', 48, -1465, { y: 350, mode: 'a', group: 'ring', wave: 1, entry: 'perch' }),
    S('r9', 'turbineWasp', -48, -1415, { y: 350, mode: 'a', group: 'ring', wave: 1, entry: 'perch' }),
    S('r10', 'turbineWasp', 22, -1497, { y: 350, mode: 'a', group: 'ring', wave: 1, entry: 'perch' }),
    // Interlude 3 patrol over the elevator road.
    S('w3', 'turbineWasp', 0, -1780, { y: 360, mode: 'a', group: 'elevator' }),
    S('w4', 'turbineWasp', 40, -1860, { y: 370, mode: 'a', group: 'elevator' }),
  ];
  return {
    region: 'launchworks',
    mission: 1,
    name: 'Skyhook Works',
    subtitle: 'Down the shaft, up the pistons, round the ring.',
    size: 4800,
    terrain: {
      seed: 53,
      relief: 35,
      plateaus: [
        { x: 0, z: 0, r: 150, y: 0 },
        { x: 0, z: -230, r: 90, y: 0 },
        { x: 0, z: -680, r: 240, y: 40 },
        { x: 0, z: -1080, r: 130, y: 90 },
        { x: 0, z: -1440, r: 240, y: 200 },
        { x: 0, z: -1900, r: 130, y: 260 },
        { x: 0, z: -2100, r: 300, y: 300 },
      ],
      valley: null,
    },
    horizon: { gap: { angle: Math.PI / 2, width: 0.5 } },
    placements,
    shadows,
    chapters: [
      { name: 'Exhaust shaft', z0: 20, z1: -440, beat: 'drop' },
      { name: 'The piston yard', z0: -440, z1: -900, beat: 'fight' },
      { name: 'Scaffold lanes', z0: -900, z1: -1260, beat: 'run' },
      { name: 'The launch ring', z0: -1260, z1: -1640, beat: 'fight' },
      { name: 'The gantry elevator', z0: -1640, z1: -2400, beat: 'finish' },
    ],
    strongholds: [
      { id: 'pistons', name: 'The Piston Yard', x: 0, z: -680, r: 200, y: 30 },
      { id: 'ring', name: 'The Launch Ring', x: 0, z: -1440, r: 180, y: 60 },
    ],
    cages: [
      { id: 'cage-launchworks-1', x: 70, z: -420, y: 2, mode: 'r' },
      { id: 'cage-launchworks-2', x: -80, z: -1240, y: 2, mode: 'r' },
      { id: 'cage-launchworks-3', x: 90, z: -1960, y: 2, mode: 'r' },
    ],
    boss: { kind: 'smelterLeviathan', x: 0, z: -2100, y: 40, r: 180 },
    start: { x: 0, z: 20, yaw: Math.PI },
    exit: { x: 0, z: -2100, r: 40, name: 'The star gate' },
    landmark: { name: 'The star gate', x: 0, z: -2100 },
    route: windingRoute(placements, { x: 0, z: 20 }, { x: 0, z: -2100 }),
  };
}
