/** Authored campaign routes. Coordinates use feet/surface y, positive down.
 * All required landing shelves are static. Optional shortcuts may move or crumble.
 * See audit-levels.mjs for fixed-step reachability and rhythm checks.
 */
export type EnemyType =
  | 'shadeHound'
  | 'seedSpitter'
  | 'windowRay'
  | 'spireLeech'
  | 'cragTortoise'
  | 'riftCondor'
  | 'furnaceHound'
  | 'slagCaster'
  | 'chainManta'
  | 'ballastCrab'
  | 'coilWraith'
  | 'turbineWasp'
  | 'basaltBurrower'
  | 'thornChoir'
  | 'veilMedusa'
  | 'phaseSkate'
  | 'mirrorStalker'
  | 'gravityCantor';
export type Beat =
  | 'learn'
  | 'run'
  | 'fight'
  | 'climb'
  | 'drop'
  | 'hazard'
  | 'vista'
  | 'rest'
  | 'finish';
export interface Platform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  skin: number;
  kind?: 'solid' | 'oneWay' | 'conveyor' | 'crumble' | 'spring';
  moving?: { axis: 'x' | 'y'; range: number; speed: number; phase: number };
  routeRole?: 'main' | 'optional' | 'arena' | 'salvage' | 'high' | 'low';
  ceiling?: boolean;
  area?: number;
  encounter?: Beat;
  /** Conveyor drift in units per second; negative runs against Hopper. */
  drift?: number;
  /** Architectural fill stops this far below the ledge, leaving a corridor. */
  hollow?: number;
  /** A main shelf reached through a required inverted stretch, not a jump. */
  via?: 'inversion';
  /** The verb an optional signal shelf is built to reward. */
  teach?: 'catch' | 'parry' | 'high';
}
export interface Area {
  id: number;
  name: string;
  xStart: number;
  xEnd: number;
  gravity: number;
  palette: { sky: string; haze: string; accent: string; ground: string };
  backgroundIndex: number;
  enemyTypes: EnemyType[];
  subtitle: string;
}
export interface EnemySpawn {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  patrol?: number;
  area: number;
  /** behind: hidden until Hopper passes, then attacks its back. above: perched
   * or hovering overhead. under: hidden in the floor, surfaces beneath Hopper.
   * mirror: shadows Hopper along a parallel shelf and pounces from above. */
  ambush?: 'behind' | 'above' | 'under' | 'mirror';
  /** behind: how far past it Hopper must be before it emerges (default 230). */
  wake?: number;
}
export interface Hazard {
  id: string;
  type: 'spikes' | 'lava' | 'press' | 'wind' | 'arc';
  x: number;
  y: number;
  w: number;
  h: number;
  period?: number;
  phase?: number;
  area?: number;
  /** Wind: constant acceleration applied inside the lane. */
  push?: { x: number; y: number };
}
export interface Checkpoint {
  x: number;
  y: number;
  area: number;
}
export interface Collectible {
  id: string;
  x: number;
  y: number;
  /** Cannot be taken until this barrier is broken by a reflected shot. */
  barrierId?: string;
}
/** A cage that only a parried (reflected) shot can break. */
export interface Barrier {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface GravityGate {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sign: -1;
  ceilingId: string;
  label: string;
  /** The main route passes through this gate; there is no jump around it. */
  required?: boolean;
}
export interface Chapter {
  name: string;
  area: number;
  xStart: number;
  xEnd: number;
}
export interface LevelData {
  chapters: Chapter[];
  gravityGates: GravityGate[];
  barriers: Barrier[];
  name: string;
  width: number;
  start: { x: number; y: number };
  platforms: Platform[];
  areas: Area[];
  enemies: EnemySpawn[];
  hazards: Hazard[];
  checkpoints: Checkpoint[];
  collectibles: Collectible[];
  boss: {
    type: 'nightRook' | 'smelterLeviathan' | 'eclipseRegent';
    x: number;
    y: number;
    arena: { x: number; y: number; w: number; h: number };
  };
}
type Step = [width: number, gap: number, rise: number, beat: Beat];
interface Region {
  name: string;
  subtitle: string;
  gravity: number;
  palette: Area['palette'];
  enemies: [EnemyType, EnemyType];
  steps: Step[];
}
// rise is a signed change in surface y: negative climbs, positive descends.
// Wide shelves anchor each teach / vary / combine / release sequence.
const REGIONS: Region[] = [
  {
    name: 'Sunseed Fields',
    subtitle: 'Eyes forward. Launch behind. Feet downward.',
    gravity: 1,
    palette: {
      sky: '#739cae',
      haze: '#f8c479',
      accent: '#ffdf7a',
      ground: '#456747',
    },
    enemies: ['shadeHound', 'seedSpitter'],
    steps: [
      [1100, 90, -60, 'learn'],
      [650, 140, -90, 'learn'],
      [740, 190, 80, 'fight'],
      [650, 240, 100, 'run'],
      [850, 160, -100, 'rest'],
      [830, 300, 190, 'vista'],
      [740, 230, -80, 'fight'],
      [850, 120, -100, 'finish'],
      [950, 100, 0, 'rest'],
    ],
  },
  {
    name: 'Crownline City',
    subtitle: 'Climb the skyline. Read the next roof before you leap.',
    gravity: 1,
    palette: {
      sky: '#b98687',
      haze: '#f6bd86',
      accent: '#a1efe3',
      ground: '#465663',
    },
    enemies: ['windowRay', 'spireLeech'],
    steps: [
      [1000, 130, -160, 'learn'],
      [550, 160, -190, 'climb'],
      [620, 210, -180, 'fight'],
      [580, 260, -140, 'climb'],
      [840, 150, -100, 'rest'],
      [710, 280, -120, 'vista'],
      [730, 260, 210, 'fight'],
      [740, 150, -80, 'finish'],
      [990, 100, 0, 'rest'],
    ],
  },
  {
    name: 'Thunderhead Range',
    subtitle: 'Descend into the gorge, then rise above the storm.',
    gravity: 1,
    palette: {
      sky: '#7c8d9c',
      haze: '#d5ad8d',
      accent: '#e9d09b',
      ground: '#535963',
    },
    enemies: ['cragTortoise', 'riftCondor'],
    steps: [
      [1000, 160, 210, 'learn'],
      [650, 230, 220, 'drop'],
      [680, 300, 200, 'fight'],
      [600, 350, 200, 'drop'],
      [950, 120, -100, 'rest'],
      [760, 340, -140, 'vista'],
      [590, 220, -200, 'fight'],
      [800, 170, -110, 'finish'],
      [1080, 100, 0, 'rest'],
    ],
  },
  {
    name: 'Cinder Foundries',
    subtitle: 'Ride the casting line. Strike while the furnace cores cool.',
    gravity: 1,
    palette: {
      sky: '#644d45',
      haze: '#c28754',
      accent: '#ffb454',
      ground: '#4d4345',
    },
    enemies: ['furnaceHound', 'slagCaster'],
    steps: [
      [1100, 100, 80, 'learn'],
      [700, 180, 140, 'run'],
      [720, 200, 100, 'fight'],
      [760, 140, 100, 'hazard'],
      [940, 100, 90, 'rest'],
      [740, 240, 120, 'vista'],
      [680, 210, -140, 'fight'],
      [790, 140, -100, 'finish'],
      [1000, 100, 0, 'rest'],
    ],
  },
  {
    name: 'Tempest Docks',
    subtitle: 'Follow the crane booms above the storm channel.',
    gravity: 1,
    palette: {
      sky: '#667d84',
      haze: '#b1c0b5',
      accent: '#b4f2df',
      ground: '#3e5d61',
    },
    enemies: ['chainManta', 'ballastCrab'],
    steps: [
      [1050, 140, -150, 'learn'],
      [580, 180, -190, 'climb'],
      [680, 220, -190, 'fight'],
      [620, 280, -180, 'climb'],
      [960, 140, -120, 'rest'],
      [790, 350, 240, 'vista'],
      [790, 270, 200, 'fight'],
      [790, 150, -100, 'finish'],
      [1020, 100, 0, 'rest'],
    ],
  },
  {
    name: 'Skyhook Works',
    subtitle: 'Drop through the exhaust spine, then climb toward the stars.',
    gravity: 1,
    palette: {
      sky: '#a5a9a5',
      haze: '#efe0bd',
      accent: '#ffd38c',
      ground: '#716566',
    },
    enemies: ['coilWraith', 'turbineWasp'],
    steps: [
      [1080, 150, 220, 'learn'],
      [680, 200, 200, 'drop'],
      [760, 210, 180, 'fight'],
      [780, 180, -120, 'hazard'],
      [950, 130, -140, 'rest'],
      [810, 310, -150, 'vista'],
      [750, 180, -160, 'hazard'],
      [810, 150, -120, 'finish'],
      [1090, 100, 0, 'rest'],
    ],
  },
  {
    name: 'Vermilion Basin',
    subtitle: 'HEAVY GRAVITY · Short, powerful leaps across the red world.',
    gravity: 1.35,
    palette: {
      sky: '#6c2533',
      haze: '#de765d',
      accent: '#fff0bc',
      ground: '#9a4348',
    },
    enemies: ['basaltBurrower', 'thornChoir'],
    steps: [
      [1080, 80, 90, 'learn'],
      [710, 120, 120, 'learn'],
      [740, 180, 110, 'fight'],
      [620, 230, 140, 'drop'],
      [940, 100, 100, 'rest'],
      [830, 230, 110, 'vista'],
      [760, 200, -100, 'fight'],
      [860, 120, -90, 'finish'],
      [1090, 100, 0, 'rest'],
    ],
  },
  {
    name: 'Cobalt Drift',
    subtitle:
      'LOW GRAVITY · Release jump early and steer onto the luminous reefs.',
    gravity: 0.55,
    palette: {
      sky: '#193d77',
      haze: '#478bab',
      accent: '#b9fff1',
      ground: '#355d91',
    },
    enemies: ['veilMedusa', 'phaseSkate'],
    steps: [
      [1120, 240, -180, 'learn'],
      [760, 320, -300, 'learn'],
      [800, 380, -330, 'fight'],
      [740, 450, -340, 'climb'],
      [1050, 200, -160, 'rest'],
      [930, 630, -200, 'vista'],
      [790, 400, 330, 'fight'],
      [970, 220, -150, 'finish'],
      [1140, 100, 0, 'rest'],
    ],
  },
  {
    name: 'Violet Inversion',
    subtitle:
      'The gravity cathedral · Follow the steady ivory path to the eclipse.',
    gravity: 0.85,
    palette: {
      sky: '#251633',
      haze: '#60436c',
      accent: '#e5b8ff',
      ground: '#503653',
    },
    enemies: ['mirrorStalker', 'gravityCantor'],
    steps: [
      [1090, 140, -170, 'learn'],
      [660, 220, -220, 'climb'],
      [710, 250, -200, 'fight'],
      [680, 280, -210, 'climb'],
      [990, 150, -120, 'rest'],
      [840, 420, 250, 'vista'],
      [780, 300, -190, 'fight'],
      [910, 140, -110, 'finish'],
      [1150, 100, 0, 'rest'],
    ],
  },
];
// Every region has five authored chapters with a distinct terrain envelope.
// Values are the cumulative elevation relative to that region's entrance.
const CHAPTERS: [string, number][][] = [
  [
    ['Irrigation lesson', -60],
    ['Orchard terraces', -350],
    ['Windbreak ridges', -100],
    ['The seedfall valley', 250],
    ['Road to Crownline', -180],
  ],
  [
    ['Ivory roof ladder', -650],
    ['Transit canyon', -300],
    ['Construction crown', -1500],
    ['The sky bridges', -1900],
    ['Highline observatory', -2700],
  ],
  [
    ['Slate descent', 800],
    ['The storm gorge', 1100],
    ['Broken ridge', 100],
    ['Cloudstep traverse', -800],
    ['Summit transmitter', -1900],
  ],
  [
    ['The casting line', 300],
    ['Cooling molds', 650],
    ['Slag barge channel', 1000],
    ['Pressure hall', 450],
    ['The iron spillway', 500],
  ],
  [
    ['Container shore', -400],
    ['The crane forest', -1100],
    ['Storm channel descent', -550],
    ['Freighter roof run', -700],
    ['Upper gantry', -1800],
  ],
  [
    ['Cold exhaust shaft', 600],
    ['The piston galleries', -200],
    ['Launch scaffold', -1200],
    ['Rocket ascent', -2200],
    ['Stargate spine', -3000],
  ],
  [
    ['Ivory footholds', 300],
    ['Red coral collapse', 650],
    ['The ribbed basin', 450],
    ['Thorn choir terraces', -100],
    ['Black sun overlook', -400],
  ],
  [
    ['First floating reef', -500],
    ['The dust stair', -1800],
    ['Luminous reef descent', -1000],
    ['Blue void crossing', -2400],
    ['The upper drift', -3300],
  ],
  [
    ['Ivory causeway', -400],
    ['The mirrored galleries', -1000],
    ['Descending obsidian arch', -450],
    ['Shattered orbit', -800],
    ['Cathedral approach', -1600],
  ],
];
const RELIEF: number[][] = [
  [0, -40, 0, -150, 80, 20, -60, 0, -30, 0],
  [0, -100, 20, 80, 10, -120, 80, -70, 60, 0],
  [0, 100, -60, -80, -40, 100, -80, 80, -50, 0],
  [0, -90, 90, -70, 90, -60, 70, 20, -30, 0],
  [0, -30, -30, 100, -50, -20, -70, 90, -70, 0],
];
// One rhythm per chapter: an entrance lesson, two encounters framing a rest
// checkpoint, the chapter's crossing, and a closing push onto the exit shelf.
const CHAPTER_BEATS: Beat[][] = [
  [
    'learn',
    'learn',
    'fight',
    'run',
    'rest',
    'vista',
    'fight',
    'finish',
    'rest',
  ],
  ['learn', 'fight', 'run', 'climb', 'rest', 'vista', 'drop', 'finish', 'rest'],
  ['learn', 'run', 'climb', 'fight', 'rest', 'vista', 'drop', 'finish', 'rest'],
  [
    'learn',
    'fight',
    'fight',
    'run',
    'rest',
    'vista',
    'hazard',
    'finish',
    'rest',
  ],
  [
    'learn',
    'climb',
    'fight',
    'run',
    'rest',
    'vista',
    'fight',
    'finish',
    'rest',
  ],
];
/** Each chapter asks for a different jump. The signature sets how gaps scale
 * and how the chapter's elevation change is spread across its nine shelves. */
interface Signature {
  name: string;
  gap: number;
  /** Relative share of the chapter's elevation change taken by each step. */
  profile: number[];
}
const SIGNATURES: Signature[] = [
  // Lesson: even steps, plain gaps.
  { name: 'lesson', gap: 1, profile: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
  // Ladder: short gaps, the climb taken in tall chunks between flat landings.
  {
    name: 'ladder',
    gap: 0.72,
    profile: [1.4, 1.4, 0.4, 0.4, 1.4, 1.4, 1.3, 0.4, 0.3],
  },
  // Glide: long gaps from height; hold, then release to brake onto the landing.
  {
    name: 'glide',
    gap: 1.22,
    profile: [1.4, 1.3, 1.2, 0.6, 0.9, 1, 1.1, 1.1, 0.4],
  },
  // Sprint: tight gaps and near-flat shelves reward low, fast hops.
  {
    name: 'sprint',
    gap: 0.66,
    profile: [0.5, 0.5, 0.6, 2, 0.5, 0.6, 0.5, 2.2, 1.6],
  },
  // Summit: a mixed run that keeps every technique in play before the finish.
  {
    name: 'summit',
    gap: 1,
    profile: [0.8, 1.4, 1, 0.6, 1.3, 1.5, 0.9, 1.1, 0.4],
  },
];
const MISSION_NAMES = [
  'Earthbound Thunder',
  'The Iron Migration',
  'Beyond the Black Sun',
];
const BOSS_TYPES: LevelData['boss']['type'][] = [
  'nightRook',
  'smelterLeviathan',
  'eclipseRegent',
];
const FLYING = new Set<EnemyType>([
  'windowRay',
  'riftCondor',
  'chainManta',
  'coilWraith',
  'turbineWasp',
  'veilMedusa',
  'phaseSkate',
  'gravityCantor',
]);
/** Ranged types that can hold a high perch and fire down on the route. */
const RANGED = new Set<EnemyType>([
  'seedSpitter',
  'spireLeech',
  'slagCaster',
  'chainManta',
  'coilWraith',
  'thornChoir',
  'veilMedusa',
  'gravityCantor',
]);
/** Mission is zero-based (0,1,2). No randomness: checkpoint retries preserve tells. */
export function buildLevel(mission: number): LevelData {
  mission = Math.max(0, Math.min(2, Math.floor(mission)));
  const out: LevelData = {
    chapters: [],
    gravityGates: [],
    barriers: [],
    name: MISSION_NAMES[mission],
    width: 0,
    start: { x: 180, y: 800 },
    platforms: [],
    areas: [],
    enemies: [],
    hazards: [],
    checkpoints: [],
    collectibles: [],
    boss: {
      type: BOSS_TYPES[mission],
      x: 0,
      y: 0,
      arena: { x: 0, y: 0, w: 2800, h: 1200 },
    },
  };
  let x = 0,
    y = 800;
  for (let ai = 0; ai < 3; ai++) {
    const skin = mission * 3 + ai,
      r = REGIONS[skin],
      start = x;
    const area: Area = {
      id: ai,
      name: r.name,
      xStart: x,
      xEnd: 0,
      gravity: r.gravity,
      palette: r.palette,
      backgroundIndex: skin,
      enemyTypes: r.enemies,
      subtitle: r.subtitle,
    };
    out.areas.push(area);
    const regionY = y;
    // Region width remains substantial without exceeding local jump capabilities.
    const targetWidth = skin === 7 ? 41500 : skin === 6 ? 35500 : 37500;
    const gapTotal = r.steps.reduce((n, s) => n + s[1], 0) * 5;
    const widthScale =
      (targetWidth - gapTotal) / (r.steps.reduce((n, s) => n + s[0], 0) * 5);
    for (let ci = 0; ci < 5; ci++) {
      const chapterStart = x,
        chapterY = y,
        chapterTarget = regionY + CHAPTERS[skin][ci][1];
      const relief = RELIEF[(ci + skin) % RELIEF.length],
        signature = SIGNATURES[ci],
        profileTotal = signature.profile.reduce((n, v) => n + v, 0);
      let profileSum = 0,
        prevGap = 0,
        prevY = y;
      // Half-length chapters carry twice the elevation change per step, so local
      // relief is damped to keep required rises inside a forgiving jump arc.
      const reliefScale = 0.6 * (skin === 6 ? 0.7 : skin === 7 ? 1.5 : 1);
      r.steps.forEach((step, i) => {
        const shapeIndex = i === 0 || i === 8 ? i : 1 + ((i - 1 + ci * 3) % 7);
        const source = r.steps[shapeIndex];
        const w =
          skin === 8 && ci === 1 && i === 4
            ? 1100
            : Math.round(source[0] * widthScale);
        // The chapter crossing (i === 5) is a deliberately long leap; a catch
        // floor below it turns a miss into a climb back rather than a death.
        const crossing = i === 5;
        // Violet Inversion's drop chapter crosses one gap on the ceiling: the
        // gap is too long to jump, so the inverted stretch is the route.
        const inverted = skin === 8 && ci === 2 && i === 6;
        const gap = Math.round(
          source[1] * (crossing ? 1.4 : inverted ? 2.6 : signature.gap),
        );
        profileSum += signature.profile[i];
        const nextY =
          chapterY +
          ((chapterTarget - chapterY) * profileSum) / profileTotal +
          relief[i + 1] * reliefScale;
        const dy = Math.round(nextY - y);
        let beat = CHAPTER_BEATS[ci][i];
        if (beat === 'hazard' && skin !== 3 && skin !== 5) beat = 'run';
        const id = `m${mission}-a${ai}-c${ci}-p${i}`;
        const p: Platform = {
          id,
          x,
          y,
          w,
          h: skin === 7 ? 95 : 130,
          skin,
          kind: 'solid',
          routeRole: 'main',
          area: ai,
          encounter: beat,
        };
        // The industrial moving-belt lesson changes horizontal drift, never landing geometry.
        if (skin === 3 && (i === 1 || i === 5)) p.kind = 'conveyor';
        // Summit chapter: one shelf on the main route swings, so the jump onto
        // it and off it must be timed, and one fight runs on a belt that
        // carries Hopper backward unless it keeps winning ground.
        if (ci === 4 && i === 3)
          p.moving = { axis: 'x', range: 90, speed: 60, phase: 0 };
        if (ci === 4 && i === 6) {
          p.kind = 'conveyor';
          p.drift = -70;
        }
        if (inverted) p.encounter = 'drop';
        if (ci === 2 && i === 7 && skin === 8) p.via = 'inversion';
        out.platforms.push(p);
        if (i === 0 || i === 4)
          out.checkpoints.push({ x: x + 170, y, area: ai });
        // Encounters each begin after an unobstructed landing/reading strip.
        // High road: two light shelves above a fight let Hopper go over the
        // encounter and drop onto the next landing. Overhead ambushers perch here.
        const highRoad = beat === 'fight' && ci > 0 && ci !== 2;
        // Low road: the glide chapter's fight can be gone under instead of over.
        // Drop off the previous landing's far edge onto a corridor floor that
        // runs beneath the fight shelf, then climb two steps back to the route.
        const lowRoad = beat === 'fight' && ci === 2 && i > 0;
        if (lowRoad) {
          const floorY = Math.max(y, prevY) + 360;
          p.hollow = 200;
          out.platforms.push(
            {
              id: `${id}-low`,
              x: x - prevGap - 40,
              y: floorY,
              w: prevGap + w + gap - 20,
              h: 90,
              skin,
              kind: 'solid',
              routeRole: 'low',
              area: ai,
            },
            {
              id: `${id}-low-step-a`,
              x: x + w + 20,
              y: floorY - 150,
              w: 150,
              h: 55,
              skin,
              kind: 'oneWay',
              routeRole: 'low',
              area: ai,
            },
            {
              id: `${id}-low-step-b`,
              x: x + w + gap - 190,
              y: floorY - 300,
              w: 150,
              h: 55,
              skin,
              kind: 'oneWay',
              routeRole: 'low',
              area: ai,
            },
          );
        }
        let perch: Platform | null = null;
        if (highRoad) {
          const rise = skin === 6 ? 235 : skin === 7 ? 380 : 265;
          perch = {
            id: `${id}-high-a`,
            x: x + w * 0.3,
            y: y - rise,
            w: Math.max(240, w * 0.42),
            h: 65,
            skin,
            kind: 'oneWay',
            routeRole: 'high',
            area: ai,
          };
          out.platforms.push(perch, {
            id: `${id}-high-b`,
            x: x + w * 0.78,
            y: y - rise - 70,
            w: w * 0.22 + gap * 0.6,
            h: 65,
            skin,
            kind: 'oneWay',
            routeRole: 'high',
            area: ai,
          });
        }
        if (beat === 'fight' || beat === 'finish') {
          const pair = i % 2 === 0 ? r.enemies : [r.enemies[1], r.enemies[0]];
          const count = beat === 'finish' ? 3 : 2;
          for (let n = 0; n < count; n++) {
            let type = pair[n % 2] as EnemyType;
            const ex = x + Math.min(w - 145, 250 + n * 185);
            // Later chapters vary the approach: one foe lies in wait behind
            // the landing, or comes at Hopper from overhead.
            let ambush: EnemySpawn['ambush'];
            if (ci > 0 && n === count - 1)
              ambush = ci % 2 === 1 || beat === 'finish' ? 'behind' : 'above';
            if (ambush === 'above') {
              const overhead = r.enemies.find((t) => FLYING.has(t));
              if (overhead) type = overhead;
              else if (perch)
                type = r.enemies.find((t) => RANGED.has(t)) || type;
              else ambush = 'behind';
            }
            // Species give their ambush its own shape: burrowers surface under
            // Hopper's feet, mirror stalkers shadow it along the high road and
            // pounce, thorn choirs form a firing line on both high shelves.
            if (ambush === 'behind' && type === 'basaltBurrower')
              ambush = 'under';
            if (ambush === 'behind' && type === 'mirrorStalker' && perch)
              ambush = 'mirror';
            const flyer = FLYING.has(type),
              perched = (ambush === 'above' || ambush === 'mirror') && perch;
            out.enemies.push({
              id: `${id}-e${n}`,
              type,
              x:
                ambush === 'behind'
                  ? x + 95
                  : perched && !flyer
                    ? perch!.x + perch!.w * 0.5
                    : ex,
              y:
                ambush === 'above'
                  ? flyer
                    ? y - 400
                    : perch!.y
                  : ambush === 'mirror'
                    ? perch!.y
                    : y - (flyer ? 120 + 30 * (n % 2) : 0),
              patrol: perched && !flyer ? 60 : Math.min(140, w * 0.19),
              area: ai,
              ambush,
            });
            if (ambush === 'above' && type === 'thornChoir' && perch) {
              const line = out.platforms.find((q) => q.id === `${id}-high-b`)!;
              out.enemies.push({
                id: `${id}-e${n}-line`,
                type,
                x: line.x + Math.min(line.w * 0.5, 200),
                y: line.y,
                patrol: 40,
                area: ai,
                ambush: 'above',
              });
            }
          }
        }
        // An isolated second lesson gives every enemy its own readable introduction.
        if (i === 2 && ci === 0) {
          const type = r.enemies[0];
          out.enemies = out.enemies.filter((e) => !e.id.startsWith(`${id}-`));
          out.enemies.push({
            id: `${id}-lesson`,
            type,
            x: x + w * 0.62,
            y: y - (FLYING.has(type) ? 120 : 0),
            patrol: 110,
            area: ai,
          });
        }
        if (i === 6 && ci === 0) {
          const type = r.enemies[1];
          out.enemies = out.enemies.filter((e) => !e.id.startsWith(`${id}-`));
          out.enemies.push({
            id: `${id}-lesson`,
            type,
            x: x + w * 0.66,
            y: y - (FLYING.has(type) ? 130 : 0),
            patrol: 110,
            area: ai,
          });
        }
        if (beat === 'hazard') {
          out.hazards.push({
            id: `${id}-press`,
            type: skin === 5 ? 'arc' : 'press',
            x: x + w * 0.63,
            y: y - 190,
            w: 90,
            h: 190,
            period: skin === 5 ? 5.5 : 5,
            phase: i * 0.3,
            area: ai,
          });
        }
        // Three optional signal shelves per region, each built around one verb:
        // a lip only a ledge catch reaches, a cage only a reflected shot opens,
        // and a perch only the high road climbs to.
        if (ci === 1 && i === 4) {
          // Just beyond a full jump's apex (which scales with held gravity as
          // roughly g^-0.75); the ledge catch makes up the difference.
          const rise = Math.round(400 / Math.pow(r.gravity, 0.75)) + 45;
          const opt: Platform = {
            id: `${id}-signal`,
            x: x + w * 0.35,
            y: y - rise,
            w: Math.min(430, w * 0.57),
            h: 70,
            skin,
            kind: 'solid',
            routeRole: 'optional',
            area: ai,
            teach: 'catch',
          };
          out.platforms.push(opt);
          out.collectibles.push({
            id: `signal-${mission}-${ai}-${ci}-${i}`,
            x: opt.x + opt.w * 0.5,
            y: opt.y - 85,
          });
        }
        if (ci === 2 && i === 6) {
          const rise = skin === 6 ? 170 : skin === 7 ? 400 : 220;
          const opt: Platform = {
            id: `${id}-signal`,
            x: x + w * 0.35,
            y: y - rise,
            w: Math.min(430, w * 0.57),
            h: 70,
            skin,
            kind: 'oneWay',
            routeRole: 'optional',
            area: ai,
            teach: 'parry',
          };
          out.platforms.push(opt);
          const barrierId = `${id}-barrier`;
          out.barriers.push({
            id: barrierId,
            x: opt.x + opt.w * 0.5 - 120,
            y: opt.y - 250,
            w: 240,
            h: 250,
          });
          out.collectibles.push({
            id: `signal-${mission}-${ai}-${ci}-${i}`,
            x: opt.x + opt.w * 0.5,
            y: opt.y - 190,
            barrierId,
          });
          // The caged shooter is the key: parry its shot back into the bars.
          const shooter =
            r.enemies.find((t) => RANGED.has(t)) || ('spireLeech' as EnemyType);
          out.enemies.push({
            id: `${id}-warden`,
            type: shooter,
            x: opt.x + opt.w * 0.5,
            y: opt.y - (FLYING.has(shooter) ? 110 : 0),
            patrol: 30,
            area: ai,
          });
        }
        if (ci === 4 && i === 6 && highRoad) {
          const line = out.platforms.find((q) => q.id === `${id}-high-b`)!;
          const opt: Platform = {
            id: `${id}-signal`,
            x: line.x + 30,
            y: line.y - 235,
            w: Math.min(300, line.w - 60),
            h: 70,
            skin,
            kind: 'oneWay',
            routeRole: 'optional',
            area: ai,
            teach: 'high',
          };
          out.platforms.push(opt);
          out.collectibles.push({
            id: `signal-${mission}-${ai}-${ci}-${i}`,
            x: opt.x + opt.w * 0.5,
            y: opt.y - 85,
          });
        }
        // Summit crossings are split by an island that is only a bad place to
        // stand: a shadow surfaces behind Hopper the moment it lands, so the
        // clean line is straight through without stopping.
        let span = gap;
        if (crossing && ci === 4) {
          const half = Math.round(gap * 0.55),
            islandY = y + Math.round(dy * 0.5);
          span = half * 2 + 240;
          out.platforms.push({
            id: `${id}-island`,
            x: x + w + half,
            y: islandY,
            w: 240,
            h: 130,
            skin,
            kind: 'solid',
            routeRole: 'main',
            area: ai,
            encounter: 'vista',
          });
          out.enemies.push({
            id: `${id}-island-e`,
            type: r.enemies[0],
            x: x + w + half + 95,
            y: islandY - (FLYING.has(r.enemies[0]) ? 120 : 0),
            patrol: 50,
            area: ai,
            ambush: 'behind',
            wake: 40,
          });
        }
        // Glide crossings: a spring pad at the takeoff makes the long leap
        // without a hold, and a crosswind over the gap leans on the jump so the
        // catch floor below is the intended line for anyone who does not commit.
        if (crossing && ci === 2) {
          out.platforms.push({
            id: `${id}-spring`,
            x: x + w - 200,
            y,
            w: 160,
            h: 40,
            skin,
            kind: 'spring',
            routeRole: 'optional',
            area: ai,
          });
          out.hazards.push({
            id: `${id}-wind`,
            type: 'wind',
            x: x + w,
            y: Math.min(y, y + dy) - 560,
            w: span,
            h: 700,
            push: { x: -150, y: 400 },
            area: ai,
          });
        }
        // Deep crossings have a low recovery shelf. It rejoins the next landing
        // through two steps; a miss costs time instead of an unseen fatal plunge.
        if (crossing || inverted || (gap >= 250 && i === 3 && !lowRoad)) {
          const recoveryY = Math.max(y, y + dy) + 260;
          out.platforms.push({
            id: `${id}-salvage`,
            x: x + w - 90,
            y: recoveryY,
            w: span + Math.min(360, w * 0.45),
            h: 90,
            skin,
            kind: 'solid',
            routeRole: 'salvage',
            area: ai,
          });
          out.platforms.push({
            id: `${id}-recovery-step`,
            x: x + w + span - 240,
            y: recoveryY - 145,
            w: 200,
            h: 70,
            skin,
            kind: 'oneWay',
            routeRole: 'salvage',
            area: ai,
          });
          // A spring on the catch floor is the joyful way back up.
          out.platforms.push({
            id: `${id}-salvage-spring`,
            x: x + w + span - 520,
            y: recoveryY,
            w: 160,
            h: 40,
            skin,
            kind: 'spring',
            routeRole: 'salvage',
            area: ai,
          });
        }
        // The required inverted crossing: leap up into the gate, land on the
        // ceiling, walk it across the gap and drop out onto the next shelf.
        if (inverted) {
          const gx = x + w - 260,
            gw = gap + 520,
            gy = y - 820,
            ceilingId = `${id}-invert-ceiling`;
          out.platforms.push({
            id: ceilingId,
            x: gx,
            y: gy - 70,
            w: gw,
            h: 70,
            skin,
            kind: 'solid',
            routeRole: 'optional',
            ceiling: true,
            area: ai,
          });
          out.gravityGates.push({
            id: `${id}-inversion`,
            x: gx,
            y: gy,
            w: gw,
            h: 480,
            sign: -1,
            ceilingId,
            label: 'INVERTED CROSSING · WALK THE CEILING',
            required: true,
          });
        }
        // Optional inversion gallery sits above a broad uninterrupted normal floor.
        // Its left and right edges return to ordinary gravity over that same shelf.
        if (skin === 8 && ci === 1 && i === 4) {
          const gx = x + 150,
            gy = y - 950,
            gw = Math.max(430, w - 300),
            ceilingId = `${id}-ceiling`;
          out.platforms.push({
            id: `${id}-gallery-entry`,
            x: gx + 60,
            y: y - 250,
            w: 300,
            h: 65,
            skin,
            kind: 'oneWay',
            routeRole: 'optional',
            area: ai,
          });
          out.platforms.push({
            id: ceilingId,
            x: gx,
            y: gy - 70,
            w: gw,
            h: 70,
            skin,
            kind: 'solid',
            routeRole: 'optional',
            ceiling: true,
            area: ai,
          });
          out.gravityGates.push({
            id: `${id}-inversion`,
            x: gx,
            y: gy,
            w: gw,
            h: 450,
            sign: -1,
            ceilingId,
            label: 'OPTIONAL INVERSION · EXIT EITHER SIDE',
          });
        }
        // Pools are below the route; required surface hazards always have clear staging room.
        if (
          (skin === 3 || skin === 6) &&
          gap >= 180 &&
          i !== r.steps.length - 1
        ) {
          out.hazards.push({
            id: `${id}-pool`,
            type: 'lava',
            x: x + w,
            y: Math.max(y, y + dy) + 230,
            w: gap,
            h: 80,
            area: ai,
          });
        }
        prevGap = span;
        prevY = y;
        x += w + span;
        y += dy;
      });
      out.chapters.push({
        name: CHAPTERS[skin][ci][0],
        area: ai,
        xStart: chapterStart,
        xEnd: x,
      });
    }
    area.xEnd = x;
    if (x - start < 10000) throw new Error('Region unexpectedly short');
  }
  // Dedicated refill/checkpoint and a complete lower recovery floor for every boss.
  const ax = x,
    ay = y;
  out.platforms.push({
    id: `m${mission}-arena-floor`,
    x: ax,
    y: ay,
    w: 2800,
    h: 190,
    skin: mission * 3 + 2,
    kind: 'solid',
    routeRole: 'arena',
    area: 2,
    encounter: 'finish',
  });
  out.checkpoints.push({ x: ax + 160, y: ay, area: 2 });
  [500, 1180, 1910].forEach((offset, i) =>
    out.platforms.push({
      id: `m${mission}-arena-tier${i}`,
      x: ax + offset,
      y: ay - (i === 1 ? 340 : 180),
      w: 500,
      h: 65,
      skin: mission * 3 + 2,
      kind: 'oneWay',
      routeRole: 'arena',
      area: 2,
    }),
  );
  out.boss = {
    type: BOSS_TYPES[mission],
    x: ax + 1810,
    y: ay - 260,
    arena: { x: ax, y: ay, w: 2800, h: 1200 },
  };
  out.width = ax + 2800;
  out.areas[2].xEnd = out.width;
  return out;
}
