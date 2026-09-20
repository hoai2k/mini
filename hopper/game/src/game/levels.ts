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
  kind?: 'solid' | 'oneWay' | 'conveyor' | 'crumble' | 'spring' | 'launch';
  moving?: { axis: 'x' | 'y'; range: number; speed: number; phase: number };
  routeRole?:
    | 'main'
    | 'optional'
    | 'arena'
    | 'salvage'
    | 'high'
    | 'low'
    | 'floor';
  ceiling?: boolean;
  area?: number;
  encounter?: Beat;
  /** Conveyor drift in units per second; negative runs against Hopper. */
  drift?: number;
  /** Architectural fill stops this far below the ledge, leaving a corridor. */
  hollow?: number;
  /** A main shelf reached through a required inverted stretch, not a jump. */
  via?: 'inversion';
  /** Boss lockdown wall: solid only while the boss is active and alive. */
  lock?: boolean;
  /** The verb an optional signal shelf is built to reward. */
  teach?: 'catch' | 'parry' | 'high';
  /** A launch pad in the dark below: its jump lands just above this surface y. */
  launchTo?: number;
}
/** The dark floor under an area's route: y = a + b·x between xStart and xEnd. */
export interface Undercroft {
  area: number;
  xStart: number;
  xEnd: number;
  a: number;
  b: number;
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
  /** Pacing tier 0–3: quicker tells and cooldowns as the campaign goes on. */
  tier?: number;
  /** The few that leap, vault, overfly or double-dive. Most spawns are not. */
  agile?: boolean;
  /** Encounter wave; wave 0 is present, later waves jump in as earlier ones fall. */
  wave?: number;
  /** Encounter group for waves (the shelf id). */
  group?: string;
  /** Hardened: a laser shell that mirrors the beam, and closed to a stomp
   * until a kick opens it. Rare, and only in the third episode. */
  hardened?: boolean;
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
  /** The dark below each area: the floor line a missed jump lands on. */
  undercroft: Undercroft[];
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
  // Board one: a chapter that fights on level ground carries no elevation of
  // its own, so its cumulative repeats the one before it. Each region still
  // ends exactly where it did, so the board's descent and climb are unchanged.
  [
    ['Irrigation lesson', -60],
    ['Orchard terraces', -60],
    ['Windbreak ridges', -350],
    ['The seedfall valley', -100],
    ['Road to Crownline', -180],
  ],
  [
    ['Ivory roof ladder', -650],
    ['Transit canyon', -300],
    ['Construction crown', -1500],
    ['The sky bridges', -1500],
    ['Highline observatory', -2700],
  ],
  [
    ['Slate descent', 800],
    ['The storm gorge', 800],
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
/** Every region's authored elevation, scaled. A board is its shelves, and a
 * shelf can only rise so far above the one before it: a region cut to three
 * fifths of its length while climbing the same 2,700 metres would either ask
 * for jumps that cannot be made or grow the shelves back to pay for them.
 * The climb comes down with the length, and a little less than in step with
 * it, so what is left is steeper than it was. */
/** The chapters a region builds. The fourth was the one with nothing of its
 * own - the opener, the glide chapter with its low road and cage, and the
 * summit with its swinging shelf, belt and island all sit at fixed indices,
 * and the fourth was a second turn of the same mixed rhythm between them.
 * Dropping it is three chapters off every board. The indices that remain keep
 * their numbers, so everything keyed to a chapter still lands where it did. */
const CHAPTER_PLAN = [0, 1, 2, 4];
const CLIMB = 1;
const RELIEF: number[][] = [
  [0, -40, 0, -150, 80, 20, -60, 0, -30, 0],
  [0, -100, 20, 80, 10, -120, 80, -70, 60, 0],
  [0, 100, -60, -80, -40, 100, -80, 80, -50, 0],
  [0, -90, 90, -70, 90, -60, 70, 20, -30, 0],
  [0, -30, -30, 100, -50, -20, -70, 90, -70, 0],
];
// One rhythm per fighting chapter, and each beat in it earns its shelf. Every
// chapter has the lesson, one encounter, the rest checkpoint, the crossing and
// the finish that closes it; what separates them is the one travel beat each
// keeps - a run, a drop, a press or a climb. A second fight on a second shelf
// of the same shape was the same encounter twice, and the spare run and climb
// between them were ground to cross rather than anything to do, so they are
// gone. No beat repeats back to back, and none follows the finish: the shelf
// after a finish is the next chapter's entrance.
const CHAPTER_BEATS: Beat[][] = [
  ['learn', 'fight', 'rest', 'vista', 'finish'],
  ['learn', 'fight', 'run', 'rest', 'vista', 'finish'],
  ['learn', 'fight', 'rest', 'vista', 'drop', 'finish'],
  ['learn', 'fight', 'rest', 'vista', 'hazard', 'finish'],
  ['learn', 'climb', 'fight', 'rest', 'vista', 'finish'],
];
/** How much shelf each beat needs, in world units. A shelf is a landing, the
 * room its beat actually asks for, and a takeoff; everything past that is
 * running right with nothing to decide, which is where most of a board's
 * length used to sit. Hopper covers 650 units a second, so 340 is about half
 * a second of approach and 700 a full one.
 *
 * Fights are the exception: an encounter needs ground to spread over, and its
 * later waves need somewhere to wait that is not on top of the first. */
const SHELF: Record<Beat, number> = {
  learn: 400,
  run: 380,
  climb: 380,
  drop: 380,
  rest: 400,
  vista: 400,
  hazard: 520,
  fight: 640,
  finish: 720,
};

/** A chapter's personality: what the whole stretch asks for.
 * `mixed` is the shared rhythm above - jumps and fights interleaved. The other
 * two ask for one thing at a time, so a chapter reads as a place with a job. */
type Shape = 'leaps' | 'skirmish' | 'mixed';
const SHAPE_BEATS: Record<'leaps' | 'skirmish', Beat[]> = {
  // Jumping alone, and only five shelves of it: each carries nearly twice
  // the chapter's rise per step, so every jump is a tall one and none is
  // filler. No shelf here spawns an encounter, and its crossing is unguarded.
  leaps: ['learn', 'climb', 'vista', 'climb', 'rest'],
  // (A leaps chapter with a lot of height to gain takes a climb or two more,
  // so no single jump asks for more than the region's gravity allows; see
  // `leapsBeats`.)
  // Fighting alone, on shelves that barely rise and short hops between them:
  // the fight is the difficulty, not the footing. Two fights and the finish,
  // with one breath between them rather than a shelf of ground before each.
  skirmish: ['learn', 'fight', 'rest', 'fight', 'finish'],
};
/** Every board is authored as a progression rather than five turns of the
 * same rhythm. Board one's first region opens on jumping alone, meets its
 * first enemies on level ground, goes back to jumping, and only then asks for
 * both at once; the two regions after it keep changing personality. Later
 * boards open each region on jumping alone and take one more leaps chapter
 * where the region has nothing keyed to that chapter (the foundry's and the
 * docks' fourth chapters carry their presses). The species introductions
 * fall on the first two fight shelves of each region's first fighting
 * chapter. */
const PLANS: Shape[][][] = [
  [
    ['leaps', 'skirmish', 'leaps', 'mixed', 'mixed'],
    ['mixed', 'leaps', 'mixed', 'skirmish', 'mixed'],
    ['leaps', 'skirmish', 'mixed', 'mixed', 'mixed'],
  ],
  [
    ['leaps', 'mixed', 'mixed', 'mixed', 'mixed'],
    ['leaps', 'mixed', 'mixed', 'mixed', 'mixed'],
    ['leaps', 'mixed', 'mixed', 'leaps', 'mixed'],
  ],
  [
    ['leaps', 'mixed', 'mixed', 'leaps', 'mixed'],
    ['leaps', 'mixed', 'mixed', 'leaps', 'mixed'],
    ['leaps', 'mixed', 'mixed', 'leaps', 'mixed'],
  ],
];
/** The leaps rhythm sized to a chapter's climb: five shelves unless the rise
 * per jump would pass what a held jump reaches under the region's gravity,
 * in which case a climb or two more share it out. The crossing stays in the
 * middle. */
function leapsBeats(rise: number, gravity: number): Beat[] {
  const limit = (0.75 * 300) / Math.pow(gravity, 0.75);
  let n = 5;
  while (Math.abs(rise) / (n - 1) > limit && n < 7) n++;
  const beats: Beat[] = ['learn'];
  for (let i = 1; i < n - 1; i++) beats.push('climb');
  beats.push('rest');
  beats[Math.floor((n - 1) / 2)] = 'vista';
  return beats;
}
/** The most one shelf may stand above or below the one before it, under a
 * region's gravity: what a held jump clears with enough left to land on. The
 * chapter's own climb is kept inside this by `fitClimb`; local relief is
 * clamped to it where it would push a step past. */
function riseLimit(gravity: number): number {
  return 205 / Math.pow(gravity, 0.75);
}
/** A signature's tall chunks, evened out for a short chapter. The profiles
 * were written for nine shelves, where a 2.2 share is one steep step among
 * eight gentle ones; over five it is a step no jump reaches, and paying for
 * it with extra shelves puts the walking back. Blended toward even, the same
 * climb is taken as several steep steps instead of one impossible one - which
 * is what a shorter board with the same height to gain has to look like. */
function evenOut(profile: number[], toward = 0.65): number[] {
  const mean = profile.reduce((n, v) => n + v, 0) / profile.length;
  return profile.map((v) => v + (mean - v) * toward);
}
/** A chapter takes as many shelves as its climb needs. Shortening the boards
 * left every chapter carrying the same elevation over fewer jumps, and past a
 * point a single step asks for more rise than a held jump reaches: one more
 * travel shelf before the crossing shares it out again. This is the rule
 * `leapsBeats` already applies to a jumping chapter, applied to the rest.
 * The limit is the arc's own reach less the room local relief can add. */
function fitClimb(
  beats: Beat[],
  rise: number,
  gravity: number,
  signature: number[],
): Beat[] {
  const limit = riseLimit(gravity);
  let out = beats;
  for (let guard = 0; guard < 4; guard++) {
    const profile = softenIntoFights(evenOut(resample(signature, out.length)), out),
      total = profile.reduce((n, v) => n + v, 0);
    if ((Math.max(...profile) / total) * Math.abs(rise) <= limit) break;
    const at = Math.max(1, out.indexOf('vista'));
    out = [...out.slice(0, at), rise < 0 ? 'climb' : 'drop', ...out.slice(at)];
  }
  return out;
}
/** The hop onto an encounter shelf keeps its share of the chapter's climb
 * small and hands the rest to the steps that carry no fight. An encounter is
 * fought on arrival; with shorter chapters taking the same elevation, the jump
 * into one was becoming the hard part as well, which is two hard things at
 * once. The gap onto a finish is already never stretched; this is the same
 * rule for the rise, and for every fight rather than only the last. */
function softenIntoFights(profile: number[], beats: Beat[]): number[] {
  const into = profile.map(
    (_, i) => beats[i + 1] === 'fight' || beats[i + 1] === 'finish',
  );
  const free = into.filter((v) => !v).length;
  if (!free) return profile;
  let spare = 0;
  const out = profile.map((v, i) => {
    if (!into[i]) return v;
    spare += v * 0.6;
    return v * 0.4;
  });
  return out.map((v, i) => (into[i] ? v : v + spare / free));
}
/** A nine-step profile shared out over `n` shelves: each new step takes the
 * mean of the old steps it covers, so a signature's shape (where its tall
 * chunks fall) survives a shorter chapter. */
function resample(profile: number[], n: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const from = (k * profile.length) / n,
      to = ((k + 1) * profile.length) / n;
    let sum = 0;
    for (let j = Math.floor(from); j < Math.ceil(to); j++)
      sum += profile[j] * (Math.min(to, j + 1) - Math.max(from, j));
    out.push(sum / (to - from));
  }
  return out;
}
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
  // Skirmish: even shelves and short hops, so a fight is fought on level
  // ground. Chosen by a chapter's shape rather than by its index.
  { name: 'skirmish', gap: 0.62, profile: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
];
const SKIRMISH_SIGNATURE = SIGNATURES.length - 1;
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
    undercroft: [],
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
    // A region is as long as its shelves need to be: each one is sized by the
    // beat it carries (see `SHELF`) rather than by a share of an authored
    // total, so the length is the content and not the walking between it.
    for (const ci of CHAPTER_PLAN) {
      const chapterStart = x,
        chapterY = y,
        chapterTarget = regionY + CHAPTERS[skin][ci][1] * CLIMB;
      // Every chapter has one job; `mixed` is the shared rhythm.
      const shape: Shape = PLANS[mission][ai][ci],
        beats = fitClimb(
          shape === 'mixed'
            ? CHAPTER_BEATS[ci]
            : shape === 'leaps'
              ? leapsBeats(chapterTarget - chapterY, r.gravity)
              : SHAPE_BEATS.skirmish,
          // A level chapter repeats the height it starts at, so it has no
          // climb of its own to share out.
          PLANS[mission][ai][ci] === 'skirmish' ? 0 : chapterTarget - chapterY,
          r.gravity,
          SIGNATURES[PLANS[mission][ai][ci] === 'skirmish' ? SKIRMISH_SIGNATURE : ci].profile,
        ),
        // A skirmish chapter is level ground: its elevation target matches the
        // chapter before it, and what relief is left is a hint, not a climb.
        level = shape === 'skirmish',
        fighting = shape !== 'leaps',
        // The crossing is the vista shelf's gap; a level chapter has none, and
        // its first rest's hop stands in for it. The second checkpoint sits on
        // the shelf before the crossing, or on that first rest.
        crossingIndex = level ? -1 : beats.indexOf('vista'),
        checkpointIndex =
          crossingIndex > 0 ? crossingIndex - 1 : beats.indexOf('rest'),
        // The shelves that introduce one species alone: the first two fight
        // shelves of the region's first fighting chapter.
        lessons =
          PLANS[mission][ai].findIndex((q) => q !== 'leaps') === ci
            ? beats
                .map((b, i) => (b === 'fight' || b === 'finish' ? i : -1))
                .filter((i) => i >= 0)
                .slice(0, 2)
            : [];
      const relief = RELIEF[(ci + skin) % RELIEF.length],
        signature = SIGNATURES[level ? SKIRMISH_SIGNATURE : ci],
        // A leaps chapter shares its rise out evenly: every jump is a tall one.
        profile = softenIntoFights(
          evenOut(
            resample(
              shape === 'leaps' ? SIGNATURES[0].profile : signature.profile,
              beats.length,
            ),
          ),
          beats,
        ),
        profileTotal = profile.reduce((n, v) => n + v, 0);
      let profileSum = 0,
        prevGap = 0,
        prevY = y;
      // Short chapters carry more of the elevation change per step, so local
      // relief is damped to keep required rises inside a forgiving jump arc.
      // Local relief is a wobble on top of the chapter's own climb, and with
      // shorter chapters that climb is already near what a jump reaches: a
      // full-strength wobble was the difference between a tall jump and an
      // impossible one, so it is damped to a hint.
      const reliefScale =
        0.32 * (skin === 6 ? 0.7 : skin === 7 ? 1.5 : 1) * (level ? 0.35 : 1);
      beats.forEach((authored, i) => {
        const last = i === beats.length - 1,
          shapeIndex = i === 0 ? 0 : last ? 8 : 1 + ((i - 1 + ci * 3) % 7),
          source = r.steps[shapeIndex];
        let beat = authored;
        // The foundry's and the docks' presses lived on the chapter that is
        // no longer built, so they stand on this one's travel shelf instead.
        if (beat === 'drop' && ci === 2 && (skin === 3 || skin === 5))
          beat = 'hazard';
        if (beat === 'hazard' && skin !== 3 && skin !== 5) beat = 'run';
        // A shelf is a landing as much as a stage: where gravity is light the
        // arc carries further and a shelf sized for it at 1 g is flown over,
        // so every width scales with how far the jump into it travels.
        const w =
          skin === 8 && ci === 1 && i === checkpointIndex
            ? 1100
            : Math.round(SHELF[beat] * Math.pow(r.gravity, -0.35));
        // The chapter crossing is a deliberately long leap; a catch floor
        // below it turns a miss into a climb back rather than a death.
        const crossing = i === crossingIndex;
        // Violet Inversion's drop chapter crosses one gap on the ceiling: the
        // gap is too long to jump, so the inverted stretch is the route.
        const inverted = skin === 8 && ci === 2 && beat === 'drop';
        // The gap onto a finish shelf is never stretched: the finish is a fight
        // fought on arrival, and the jump into it should not be the hard part.
        // The inverted crossing has a floor of its own: whatever its shape
        // asks for, it stays too long to jump across.
        const gap = inverted
          ? Math.max(1000, Math.round(source[1] * 2.6))
          : Math.round(
              source[1] *
                (crossing
                  ? 1.4
                  : beats[i + 1] === 'finish'
                    ? Math.min(1, signature.gap)
                    : signature.gap),
            );
        profileSum += profile[i];
        // The chapter's own share of the climb, and then the local wobble on
        // top of it - clamped so the wobble can never turn a jump the chapter
        // sized correctly into one that cannot be made.
        const share =
          chapterY + ((chapterTarget - chapterY) * profileSum) / profileTotal;
        // No shelf stands further above or below the one before it than a
        // jump clears: `fitClimb` has already sized the chapter's own share
        // to fit, and this keeps the local wobble - which accumulates from
        // shelf to shelf - from pushing a step past it. Each share is an
        // absolute height, so a clamped step is made up by the next one.
        const cap = riseLimit(r.gravity);
        const nextY = Math.max(
          y - cap,
          Math.min(y + cap, share + relief[(i + 1) % relief.length] * reliefScale),
        );
        const dy = Math.round(nextY - y);
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
        if (skin === 3 && (i === 1 || crossing)) p.kind = 'conveyor';
        // Summit chapter: one shelf on the main route swings, so the jump onto
        // it and off it must be timed, and the fight past the crossing runs on
        // a belt that carries Hopper backward unless it keeps winning ground.
        if (ci === 4 && shape === 'mixed' && beat === 'run')
          p.moving = { axis: 'x', range: 90, speed: 60, phase: 0 };
        if (
          ci === 4 &&
          shape === 'mixed' &&
          beat === 'fight' &&
          i > crossingIndex
        ) {
          p.kind = 'conveyor';
          p.drift = -70;
        }
        if (skin === 8 && ci === 2 && i > 0 && beats[i - 1] === 'drop')
          p.via = 'inversion';
        out.platforms.push(p);
        if (i === 0 || i === checkpointIndex)
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
          const floorY = Math.max(y, prevY) + 350;
          p.hollow = 200;
          out.platforms.push({
            id: `${id}-low`,
            x: x - prevGap - 40,
            y: floorY,
            w: prevGap + w + gap - 20,
            h: 90,
            skin,
            kind: 'solid',
            routeRole: 'low',
            area: ai,
          });
          // The way back up is as many steps as the climb needs, sharing it
          // evenly, rather than two at a fixed height: chapters are shorter
          // and their rises steeper now, and a fixed pair left the last hop
          // out of reach wherever the route climbed away from the corridor.
          const climb = floorY - (y + dy),
            steps = Math.max(2, Math.min(5, Math.ceil(climb / 210))),
            run = gap + 200;
          for (let k = 0; k < steps; k++)
            out.platforms.push({
              id: `${id}-low-step-${String.fromCharCode(97 + k)}`,
              x: x + w + 20 + (run * k) / steps,
              y: floorY - (climb * (k + 1)) / (steps + 1),
              // Wide enough to land a body on with something to spare: a
              // 150-wide ledge leaves ten units between his feet and the
              // edges, which is a coin toss rather than a step.
              w: 220,
              h: 55,
              skin,
              kind: 'oneWay',
              routeRole: 'low',
              area: ai,
            });
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
            // A shelf to land a body on, whatever the fight shelf under it
            // and the gap beyond it happen to measure.
            w: Math.max(240, w * 0.22 + gap * 0.6),
            h: 65,
            skin,
            kind: 'oneWay',
            routeRole: 'high',
            area: ai,
          });
        }
        // Pacing tier rises with mission, region and the back half of a region.
        // Encounters grow by waves rather than by tougher individuals: the
        // first wave is the ordinary pair, later waves leap in as it falls.
        const tier = Math.min(
          3,
          mission + (ai >= 1 ? 1 : 0) + (ci >= 3 ? 1 : 0) - (ci === 0 ? 1 : 0),
        );
        if (beat === 'fight' || beat === 'finish') {
          const pair = i % 2 === 0 ? r.enemies : [r.enemies[1], r.enemies[0]];
          // Two to five foes a shelf; finishes start at three and grow slower,
          // since the crossing guard and the next landing add to the same fight.
          const count = Math.min(
            5,
            beat === 'finish'
              ? 3 + Math.floor(Math.max(0, tier - 1) / 2)
              : 2 + Math.max(0, tier),
          );
          // Roughly a third of spawns are agile at tier 1, half from tier 3 on.
          const agileEvery = tier >= 3 ? 2 : tier >= 1 ? 3 : 0;
          for (let n = 0; n < count; n++) {
            let type = pair[n % 2] as EnemyType;
            const wave = n < (beat === 'finish' ? 3 : 2) ? 0 : n < 4 ? 1 : 2;
            // Later waves lie in wait at the far end of the shelf, in plain
            // sight, and come at the landing fight when their turn comes; a
            // flyer in a later wave is placed at its hover height and sweeps
            // in from above when called.
            // Spread across the shelf rather than at fixed offsets from its
            // near edge: the first wave stands in the near half, the ones
            // waiting their turn in the far half, whatever the shelf's width.
            const band = Math.max(150, w - 300);
            const ex =
              wave > 0
                ? x + 150 + band * Math.max(0.45, 1 - (n - 2) * 0.22)
                : x + 150 + band * Math.min(0.5, (n % 3) * 0.25);
            const agile = agileEvery > 0 && (n + i + ci) % agileEvery === 0;
            // Later chapters vary the approach: one foe lies in wait behind
            // the landing, or comes at Hopper from overhead.
            let ambush: EnemySpawn['ambush'];
            if (ci > 0 && n === (beat === 'finish' ? 2 : 1))
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
              tier: Math.max(0, tier),
              agile,
              wave: ambush ? 0 : wave,
              group: id,
              // The rare shadow that refuses both a stomp and the lasers:
              // one per finish shelf, and only in the third episode.
              hardened:
                mission === 2 && beat === 'finish' && n === 0 && ci >= 1,
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
        // An isolated lesson gives each species its own readable introduction:
        // one enemy on an otherwise empty shelf, before any shelf holds two.
        const lesson = lessons.indexOf(i);
        if (lesson >= 0) {
          const type = r.enemies[lesson % 2] as EnemyType;
          out.enemies = out.enemies.filter((e) => !e.id.startsWith(`${id}-`));
          out.enemies.push({
            id: `${id}-lesson`,
            type,
            x: x + w * (0.62 + lesson * 0.04),
            y: y - (FLYING.has(type) ? 120 + lesson * 10 : 0),
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
        if (ci === 1 && i === checkpointIndex) {
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
        if (ci === 2 && i === crossingIndex + 1) {
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
        // The perch signal sits over the summit chapter's high road. It used
        // to be pinned to the fight after the crossing; the chapter has one
        // fight now, so it goes over whichever one carries the high road.
        if (ci === 4 && highRoad) {
          const line = out.platforms.find((q) => q.id === `${id}-high-b`)!;
          const opt: Platform = {
            id: `${id}-signal`,
            x: line.x + 30,
            // A hop above the high road, measured in what a hop reaches here:
            // the same 235 over the heavy basin is out of everyone's reach.
            y: line.y - Math.round(235 / Math.pow(r.gravity, 0.75)),
            // Never narrower than a landing: a perch he cannot stand on is
            // not a reward.
            w: Math.max(220, Math.min(300, line.w - 60)),
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
        // Crossing guards: the long leap is contested from the far side. A
        // flyer hangs over the gap where a stomp or parry mid-arc clears it,
        // or the region's shooter waits at the far landing firing back across.
        if (crossing && fighting && (ci >= 2 || tier >= 1)) {
          const overhead = r.enemies.find((t) => FLYING.has(t)),
            shooter = r.enemies.find((t) => RANGED.has(t));
          if (overhead && ci % 2 === 0)
            out.enemies.push({
              id: `${id}-guard`,
              type: overhead,
              x: x + w + span * 0.5,
              y: Math.min(y, y + dy) - 300,
              patrol: 120,
              area: ai,
              tier: Math.max(0, tier),
              agile: tier >= 2,
            });
          else if (shooter)
            out.enemies.push({
              id: `${id}-guard`,
              type: shooter,
              x: x + w + span + 140,
              y: y + dy - (FLYING.has(shooter) ? 120 : 0),
              patrol: 60,
              area: ai,
              tier: Math.max(0, tier),
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
        // The chapter's midpoint keeps one even where level ground has shortened
        // the hop, so every chapter has a caught mistake in the same place.
        if (
          crossing ||
          (level && i === checkpointIndex) ||
          inverted ||
          (gap >= 250 && i === checkpointIndex - 1 && !lowRoad)
        ) {
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
            gy = y - 820,
            ceilingId = `${id}-invert-ceiling`;
          // Gravity comes back at the gate's end and Hopper drops out of it
          // with his running speed, so the gate ends where a full-speed drop
          // from the ceiling lands a stride into the next shelf (fall time
          // from the ceiling at 1900 px/s², carried at 650 px/s), not over
          // the shelf itself, which overshoots it.
          const fallT = Math.sqrt((2 * Math.max(200, nextY - gy)) / 1900),
            gw = Math.round(gap + 520 - 650 * fallT);
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
        if (skin === 8 && ci === 1 && i === checkpointIndex) {
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
        if ((skin === 3 || skin === 6) && gap >= 180 && !last) {
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
  // Boss enclosure: wider than the screen, sealed by lockdown walls while the
  // boss lives, with pillars to wall-kick, staggered shelves at three heights,
  // a swinging shelf and two spring pads so the fight moves through the air.
  const ax = x,
    ay = y,
    aw = 3400,
    skinB = mission * 3 + 2;
  out.platforms.push({
    id: `m${mission}-arena-floor`,
    x: ax,
    y: ay,
    w: aw,
    h: 190,
    skin: skinB,
    kind: 'solid',
    routeRole: 'arena',
    area: 2,
    encounter: 'finish',
  });
  out.checkpoints.push({ x: ax + 160, y: ay, area: 2 });
  const shelf = (
    id: string,
    dx: number,
    rise: number,
    w: number,
    extra: Partial<Platform> = {},
  ): Platform => ({
    id: `m${mission}-arena-${id}`,
    x: ax + dx,
    y: ay - rise,
    w,
    h: 65,
    skin: skinB,
    kind: 'oneWay',
    routeRole: 'arena',
    area: 2,
    ...extra,
  });
  out.platforms.push(
    { ...shelf('pillar-l', 360, 430, 140), h: 430, kind: 'solid' },
    { ...shelf('pillar-r', aw - 500, 430, 140), h: 430, kind: 'solid' },
    shelf('tier0', 620, 200, 420),
    shelf('tier1', 1180, 390, 380, {
      moving: { axis: 'x', range: 80, speed: 55, phase: 0 },
    }),
    shelf('tier2', 1720, 230, 460),
    shelf('tier3', 2300, 430, 360),
    shelf('tier4', 2780, 210, 420),
    { ...shelf('spring-l', 1040, 0, 160), h: 40, kind: 'spring' },
    { ...shelf('spring-r', 2450, 0, 160), h: 40, kind: 'spring' },
    {
      ...shelf('lock-left', -80, 1500, 80),
      h: 1690,
      kind: 'solid',
      lock: true,
    },
    {
      ...shelf('lock-right', aw, 1500, 80),
      h: 1690,
      kind: 'solid',
      lock: true,
    },
  );
  out.boss = {
    type: BOSS_TYPES[mission],
    x: ax + 2150,
    y: ay - 260,
    arena: { x: ax, y: ay, w: aw, h: 1300 },
  };
  out.width = ax + aw;
  out.areas[2].xEnd = out.width;
  addUndercroft(out);
  return out;
}

/** The floor line of the dark below at x, or null where there is none (the arena). */
export function floorAt(level: LevelData, x: number): number | null {
  const u = level.undercroft.find((f) => x >= f.xStart && x < f.xEnd);
  return u ? u.a + u.b * x : null;
}

export const UNDERCROFT = {
  /** How far below the lowest shelf the floor starts. */
  drop: 560,
  /** Floor segments are stepped this wide; the slope is shallow, so each step is small. */
  segment: 600,
  /** Launch pads sit this far apart along the floor. */
  spacing: 1000,
  padWidth: 180,
};

/** The dark below: a floor under every area, sloping up roughly with the
 * route but a little less, so it falls further behind the higher the
 * route climbs; a missed jump lands on it, slides back to the nearest
 * launch pad, and the pad's jump lands just above the route again. */
function addUndercroft(out: LevelData) {
  const floors: Platform[] = [],
    pads: Platform[] = [];
  for (const area of out.areas) {
    // The boss arena has its own floor and lockdown walls.
    const xEnd = area.id === 2 ? out.boss.arena.x : area.xEnd;
    const tops = out.platforms.filter(
      (p) =>
        !p.ceiling &&
        !p.lock &&
        p.routeRole !== 'floor' &&
        p.x + p.w > area.xStart &&
        p.x < xEnd,
    );
    const mains = tops.filter((p) => p.routeRole === 'main');
    if (mains.length < 2) continue;
    // A straight line through the route's tops, then eased toward level so
    // the gap opens as the route climbs (or closes less as it descends).
    let sx = 0,
      sy = 0,
      sxx = 0,
      sxy = 0;
    for (const p of mains) {
      const cx = p.x + p.w / 2;
      sx += cx;
      sy += p.y;
      sxx += cx * cx;
      sxy += cx * p.y;
    }
    const n = mains.length;
    const b = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
    const slope = b + Math.max(0.3 * Math.abs(b), 0.03);
    let a = -Infinity;
    for (const p of tops)
      a = Math.max(a, p.y + UNDERCROFT.drop - slope * (p.x + p.w / 2));
    out.undercroft.push({
      area: area.id,
      xStart: area.xStart,
      xEnd,
      a,
      b: slope,
    });
    const skin = out.areas.indexOf(area) + (out.areas[0].backgroundIndex ?? 0);
    // Segments are as long as the slope allows while each step between them
    // stays a small one Hopper walks over (30 units): a steep floor under a
    // steep region is cut finer.
    const segment = Math.max(
      200,
      Math.min(
        UNDERCROFT.segment,
        Math.floor(30 / Math.max(1e-6, Math.abs(slope))),
      ),
    );
    const segY = (x: number) => {
      const i = Math.floor((x - area.xStart) / segment);
      return Math.round(a + slope * (area.xStart + (i + 0.5) * segment));
    };
    for (let x = area.xStart, i = 0; x < xEnd; x += segment, i++) {
      floors.push({
        id: `floor-${area.id}-${i}`,
        x,
        y: segY(x),
        w: Math.min(segment, xEnd - x) + 4,
        h: 3000,
        skin,
        kind: 'solid',
        routeRole: 'floor',
        area: area.id,
      });
    }
    for (
      let x = area.xStart + UNDERCROFT.spacing * 0.5, k = 0;
      x < xEnd - 200;
      x += UNDERCROFT.spacing, k++
    ) {
      // The pad stands under the nearest route shelf, so its jump lands on it.
      let target = mains[0],
        best = Infinity;
      for (const p of mains) {
        const d = x < p.x ? p.x - x : x > p.x + p.w ? x - (p.x + p.w) : 0;
        if (d < best) {
          best = d;
          target = p;
        }
      }
      const half = UNDERCROFT.padWidth / 2;
      const px =
        target.w > UNDERCROFT.padWidth + 40
          ? Math.max(
              target.x + half + 20,
              Math.min(target.x + target.w - half - 20, x),
            )
          : target.x + target.w / 2;
      // Two pads pulled under the same short shelf would stand on each other.
      if (pads.length && px - half - pads[pads.length - 1].x < 400) continue;
      pads.push({
        id: `launch-${area.id}-${k}`,
        x: px - half,
        y: segY(px),
        w: UNDERCROFT.padWidth,
        h: 60,
        skin,
        kind: 'launch',
        routeRole: 'floor',
        area: area.id,
        launchTo: target.y,
      });
    }
  }
  // Pads after floors: whichever is stood on last wins, and the pad must.
  out.platforms.push(...floors, ...pads);
}
