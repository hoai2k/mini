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
    const targetWidth = skin === 7 ? 41500 : skin === 6 ? 35500 : 37500;
    const gapTotal = r.steps.reduce((n, s) => n + s[1], 0) * 5;
    const widthScale =
      (targetWidth - gapTotal) / (r.steps.reduce((n, s) => n + s[0], 0) * 5);
    for (let ci = 0; ci < 5; ci++) {
      const chapterStart = x,
        chapterY = y,
        chapterTarget = regionY + CHAPTERS[skin][ci][1];
      const relief = RELIEF[(ci + skin) % RELIEF.length];
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
        const gap = source[1];
        const nextY =
          chapterY +
          ((chapterTarget - chapterY) * (i + 1)) / 9 +
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
        out.platforms.push(p);
        if (i === 0 || i === 4)
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
        // Three genuinely optional signal shelves per region, each rejoining the next main shelf.
        if (
          (ci === 1 && i === 4) ||
          (ci === 2 && i === 6) ||
          (ci === 4 && i === 3)
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
          if ((skin === 4 || skin === 7) && i === 6)
            opt.moving = { axis: 'x', range: 65, speed: 35, phase: 0 };
          if ((skin === 1 || skin === 6) && i === 3) opt.kind = 'crumble';
          out.platforms.push(opt);
          out.collectibles.push({
            id: `signal-${mission}-${ai}-${ci}-${i}`,
            x: opt.x + opt.w * 0.5,
            y: opt.y - 85,
          });
        }
        // Deep crossings have a low recovery shelf. It rejoins the next landing
        // through two steps; a miss costs time instead of an unseen fatal plunge.
        if (gap >= 250 && (i === 3 || i === 5)) {
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
