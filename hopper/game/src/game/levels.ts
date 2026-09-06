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
  kind?: 'solid' | 'oneWay' | 'conveyor' | 'crumble';
  moving?: { axis: 'x' | 'y'; range: number; speed: number; phase: number };
  routeRole?: 'main' | 'optional' | 'arena' | 'salvage';
  ceiling?: boolean;
  area?: number;
  encounter?: Beat;
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
      [560, 190, -150, 'climb'],
      [590, 250, -120, 'fight'],
      [830, 300, 190, 'vista'],
      [670, 150, 120, 'drop'],
      [740, 230, -80, 'fight'],
      [600, 200, -140, 'climb'],
      [900, 80, 40, 'rest'],
      [570, 260, 130, 'fight'],
      [660, 360, -40, 'run'],
      [830, 180, -130, 'fight'],
      [670, 210, 50, 'run'],
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
      [560, 180, -180, 'fight'],
      [600, 210, -170, 'climb'],
      [710, 280, -120, 'vista'],
      [570, 170, 200, 'drop'],
      [730, 260, 210, 'fight'],
      [920, 110, -140, 'rest'],
      [610, 220, -180, 'fight'],
      [520, 280, -170, 'climb'],
      [650, 320, -150, 'run'],
      [770, 170, -160, 'fight'],
      [580, 200, -170, 'climb'],
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
      [580, 200, -190, 'climb'],
      [630, 250, -210, 'fight'],
      [620, 200, -190, 'climb'],
      [760, 340, -140, 'vista'],
      [590, 220, -200, 'fight'],
      [930, 130, -80, 'rest'],
      [650, 240, -200, 'climb'],
      [580, 260, -190, 'fight'],
      [670, 330, -170, 'run'],
      [710, 190, -210, 'fight'],
      [590, 180, -200, 'climb'],
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
      [630, 230, 110, 'fight'],
      [610, 270, 120, 'drop'],
      [740, 240, 120, 'vista'],
      [700, 170, -120, 'hazard'],
      [680, 210, -140, 'fight'],
      [940, 110, -90, 'rest'],
      [650, 230, -150, 'climb'],
      [760, 280, -100, 'fight'],
      [720, 320, 120, 'run'],
      [750, 150, 100, 'hazard'],
      [700, 210, -90, 'fight'],
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
      [620, 240, -180, 'fight'],
      [650, 280, -170, 'climb'],
      [790, 350, 240, 'vista'],
      [700, 310, 230, 'drop'],
      [790, 270, 200, 'fight'],
      [1010, 130, -100, 'rest'],
      [590, 200, -200, 'climb'],
      [690, 270, -190, 'fight'],
      [690, 320, -170, 'run'],
      [760, 190, -180, 'fight'],
      [630, 220, -180, 'climb'],
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
      [610, 230, -200, 'climb'],
      [650, 270, -200, 'fight'],
      [680, 280, -180, 'climb'],
      [810, 310, -150, 'vista'],
      [750, 180, -160, 'hazard'],
      [970, 130, -100, 'rest'],
      [600, 240, -200, 'climb'],
      [690, 270, -200, 'fight'],
      [680, 300, -180, 'run'],
      [710, 170, -200, 'fight'],
      [650, 200, -200, 'climb'],
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
      [660, 160, -130, 'fight'],
      [600, 180, -140, 'climb'],
      [830, 230, 110, 'vista'],
      [700, 180, 100, 'drop'],
      [760, 200, -100, 'fight'],
      [960, 100, -80, 'rest'],
      [620, 180, -150, 'climb'],
      [750, 210, -130, 'fight'],
      [680, 250, -70, 'run'],
      [760, 180, -130, 'fight'],
      [680, 170, -150, 'climb'],
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
      [770, 350, -340, 'fight'],
      [730, 450, -350, 'climb'],
      [930, 630, -200, 'vista'],
      [820, 480, 320, 'drop'],
      [790, 400, 330, 'fight'],
      [1090, 190, 290, 'rest'],
      [760, 380, -320, 'climb'],
      [840, 440, -330, 'fight'],
      [830, 590, -230, 'run'],
      [860, 310, -340, 'fight'],
      [740, 380, -350, 'climb'],
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
      [660, 240, 230, 'fight'],
      [710, 330, 250, 'drop'],
      [840, 420, 250, 'vista'],
      [710, 260, -160, 'climb'],
      [780, 300, -190, 'fight'],
      [1010, 130, -100, 'rest'],
      [710, 270, 220, 'drop'],
      [780, 300, 210, 'fight'],
      [750, 400, -120, 'run'],
      [840, 200, -210, 'fight'],
      [700, 240, -220, 'climb'],
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
  [
    0, 20, -40, 20, 0, -40, -150, -80, 80, 110, 20, -10, -60, 70, 0, -80, -30,
    0, 0,
  ],
  [
    0, -20, -100, -50, 20, 0, 80, 120, 10, -80, -120, 0, 80, 20, -70, -20, 60,
    0, 0,
  ],
  [
    0, 40, 100, 30, -60, 0, -80, -140, -40, 40, 100, 0, -80, -20, 80, 20, -50,
    0, 0,
  ],
  [0, -60, -90, 0, 90, 0, -70, 20, 90, 20, -60, 0, 70, 110, 20, -70, -30, 0, 0],
  [
    0, 50, -30, -100, -30, 0, 100, 30, -50, -90, -20, 0, -70, 30, 90, 10, -70,
    0, 0,
  ],
];
const CHAPTER_BEATS: Beat[][] = [
  [
    'learn',
    'learn',
    'fight',
    'run',
    'rest',
    'fight',
    'climb',
    'vista',
    'drop',
    'fight',
    'rest',
    'climb',
    'fight',
    'run',
    'fight',
    'climb',
    'finish',
    'rest',
  ],
  [
    'learn',
    'fight',
    'run',
    'climb',
    'rest',
    'run',
    'fight',
    'vista',
    'drop',
    'fight',
    'rest',
    'climb',
    'fight',
    'fight',
    'run',
    'climb',
    'finish',
    'rest',
  ],
  [
    'learn',
    'run',
    'climb',
    'fight',
    'rest',
    'drop',
    'fight',
    'vista',
    'run',
    'run',
    'rest',
    'fight',
    'climb',
    'fight',
    'fight',
    'climb',
    'finish',
    'rest',
  ],
  [
    'learn',
    'fight',
    'fight',
    'run',
    'rest',
    'climb',
    'hazard',
    'vista',
    'fight',
    'drop',
    'rest',
    'fight',
    'run',
    'climb',
    'fight',
    'run',
    'finish',
    'rest',
  ],
  [
    'learn',
    'climb',
    'fight',
    'run',
    'rest',
    'fight',
    'climb',
    'vista',
    'drop',
    'fight',
    'rest',
    'climb',
    'fight',
    'run',
    'fight',
    'climb',
    'finish',
    'rest',
  ],
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
/** Mission is zero-based (0,1,2). No randomness: checkpoint retries preserve tells. */
export function buildLevel(mission: number): LevelData {
  mission = Math.max(0, Math.min(2, Math.floor(mission)));
  const out: LevelData = {
    chapters: [],
    gravityGates: [],
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
    const targetWidth = skin === 7 ? 83000 : skin === 6 ? 71000 : 75000;
    const gapTotal = r.steps.reduce((n, s) => n + s[1], 0) * 5;
    const widthScale =
      (targetWidth - gapTotal) / (r.steps.reduce((n, s) => n + s[0], 0) * 5);
    for (let ci = 0; ci < 5; ci++) {
      const chapterStart = x,
        chapterY = y,
        chapterTarget = regionY + CHAPTERS[skin][ci][1];
      const relief = RELIEF[(ci + skin) % RELIEF.length];
      const reliefScale = skin === 6 ? 0.7 : skin === 7 ? 1.5 : 1;
      r.steps.forEach((step, i) => {
        const shapeIndex =
          i === 0 || i === 17 ? i : 1 + ((i - 1 + ci * 3) % 16);
        const source = r.steps[shapeIndex];
        const w =
          skin === 8 && ci === 1 && i === 4
            ? 1100
            : Math.round(source[0] * widthScale);
        const gap = source[1];
        const nextY =
          chapterY +
          ((chapterTarget - chapterY) * (i + 1)) / 18 +
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
        if (skin === 3 && (i === 1 || i === 7)) p.kind = 'conveyor';
        out.platforms.push(p);
        if (i === 0 || i === 10)
          out.checkpoints.push({ x: x + 170, y, area: ai });
        // Encounters each begin after an unobstructed landing/reading strip.
        if (beat === 'fight' || beat === 'finish') {
          const pair = i % 2 === 0 ? r.enemies : [r.enemies[1], r.enemies[0]];
          const count = beat === 'finish' ? 3 : 2;
          for (let n = 0; n < count; n++) {
            const type = pair[n % 2] as EnemyType;
            const ex = x + Math.min(w - 145, 250 + n * 185);
            out.enemies.push({
              id: `${id}-e${n}`,
              type,
              x: ex,
              y: y - (FLYING.has(type) ? 120 + 30 * (n % 2) : 0),
              patrol: Math.min(140, w * 0.19),
              area: ai,
            });
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
        if (i === 5 && ci === 0) {
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
        // Three genuinely optional signal shelves per region, each rejoining the next main shelf.
        if (
          (ci === 1 && i === 4) ||
          (ci === 2 && i === 10) ||
          (ci === 4 && i === 15)
        ) {
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
          };
          if ((skin === 4 || skin === 7) && i === 10)
            opt.moving = { axis: 'x', range: 65, speed: 35, phase: 0 };
          if ((skin === 1 || skin === 6) && i === 15) opt.kind = 'crumble';
          out.platforms.push(opt);
          out.collectibles.push({
            id: `signal-${mission}-${ai}-${ci}-${i}`,
            x: opt.x + opt.w * 0.5,
            y: opt.y - 85,
          });
        }
        // Deep crossings have a low recovery shelf. It rejoins the next landing
        // through two steps; a miss costs time instead of an unseen fatal plunge.
        if (gap >= 250 && (i === 7 || i === 13)) {
          const recoveryY = Math.max(y, y + dy) + 260;
          out.platforms.push({
            id: `${id}-salvage`,
            x: x + w - 90,
            y: recoveryY,
            w: gap + Math.min(360, w * 0.45),
            h: 90,
            skin,
            kind: 'solid',
            routeRole: 'salvage',
            area: ai,
          });
          out.platforms.push({
            id: `${id}-recovery-step`,
            x: x + w + gap - 240,
            y: recoveryY - 145,
            w: 200,
            h: 70,
            skin,
            kind: 'oneWay',
            routeRole: 'salvage',
            area: ai,
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
        x += w + gap;
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
