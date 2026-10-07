// Stage data, in story order. Positions are in field units; the army starts
// at x = 0 and the camera shows about 24 units across. bpm is the Han war
// drum's tempo (how often the enemy acts); the player drums at any speed.
// maxTier is the most intricate rhythm tier the chapter allows.
//
// story: two sentences that set the scene (the chapter's opening card);
// goal: what to do in it (the card, the chapter list, the first caption).
// mode: 'battle' (the default), 'echo' (answer a caller's rhythms; see
// modes.js), 'casting' (repeat a rhythm at a steady tempo), or a battle with
// `survive` seconds and `waves` (hold the line). Echo calls are four-beat
// rhythms that keep the deep strokes (L) at least a beat apart, like the
// commands. music lists beds in order of preference: the first one whose
// file exists plays.

export const STAGES = [
  {
    id: 'garden',
    music: ['mu-bed-garden', 'mu-bed-battle'], // its own bed if delivered, else the shared one
    title: 'The Garden at Mê Linh',
    subtitle: 'Training years',
    story:
      'Mê Linh, in the years before the war. In their father’s garden Trưng Trắc and Trưng Nhị learn the language of the bronze drum, and the women of the village drill to its call among the straw targets.',
    goal:
      'Trắc keeps the deep centre, Nhị the rim. Teach the women to march and strike, then cut down the straw targets.',
    bpm: 92,
    lessons: true, // teaches as it goes (main.js LESSONS), with the children's stones
    guard: 'cover', // the block is forearms over faces, not the shield wall (stones, not bolts)
    unlocked: ['march', 'strike'],
    maxTier: 2,
    troops: 60,
    elephant: false,
    sky: 'dawn',
    ambience: 'amb-garden',
    enemies: [
      { type: 'target', x: 9 },
      { type: 'target', x: 16 },
      { type: 'target', x: 23 },
    ],
  },
  {
    id: 'oath',
    music: ['mu-bed-oath', 'mu-bed-story'], // its own bed if delivered, else the shared one
    mode: 'echo',
    title: 'The Oath',
    subtitle: 'The father’s funeral',
    story:
      'The Han governor has put the sisters’ father to death for defying him. At his funeral the mourning drum sounds through the dusk, and the sisters answer it beat for beat, vowing to drive the Han from their land.',
    goal:
      'Answer each call of the mourning drum evenly; with each answer an incense stick is lit for him.',
    caller: 'mourning',
    calls: [
      { text: 'L R L R', bpm: 56 },
      { text: 'L R R L', bpm: 56 },
      { text: 'L RR L R', bpm: 58 },
      { text: 'L R LR R', bpm: 58 },
      { text: 'L RRR L R', bpm: 60 },
    ],
    matchTempo: false,
    troops: 0,
    elephant: false,
    sky: 'dusk',
    // No ambience: every bed tried here sounded synthetic against the incense
    // and the dusk, so the music carries the scene alone, a little louder.
    ambience: null,
    musicLevel: 0.75,
    enemies: [],
  },
  {
    id: 'casting',
    music: ['mu-bed-foundry', 'mu-bed-story'], // its own bed if delivered, else the shared one
    mode: 'casting',
    title: 'Casting the Drums',
    subtitle: 'The foundry of Nhật Nam',
    story:
      'A rising needs a voice that carries from valley to valley. In the foundries of Nhật Nam the smiths pour bronze for new war drums, and every hammer stroke must keep the bellows’ pace.',
    goal:
      'Drum the hammer rhythm with the bellows, round after round without stopping. Keep in time and the bronze rises, drum by drum; rush, drag or stumble and it spills back to the last drum cast.',
    rhythm: 'L RR L RR',
    bpm: 76, // the bellows' pace: heard as the guide rhythm, never shown as a number
    drums: 3,
    tolerance: 0.14,
    troops: 0,
    elephant: false,
    sky: 'foundry',
    ambience: 'amb-foundry',
    enemies: [],
  },
  {
    id: 'villages',
    music: ['mu-bed-villages', 'mu-bed-story'], // its own bed if delivered, else the shared one
    mode: 'echo',
    title: 'The Villages Answer',
    subtitle: 'A call along the river',
    story:
      'Night falls on the Red River. The sisters’ drum calls from village to village, and in each one a drummer steps out with a rhythm of their own, waiting to hear whether the call is true.',
    goal:
      'Echo each village drummer’s rhythm back evenly, at about their speed, and the village lights its lanterns and joins you.',
    caller: 'village',
    calls: [
      { text: 'L R L R', bpm: 84, label: 'Phong Châu' },
      { text: 'R R L R', bpm: 90, label: 'Chu Diên' },
      { text: 'L RR L R', bpm: 92, label: 'Cửu Chân' },
      { text: 'RR L R L', bpm: 96, label: 'Hợp Phố' },
      { text: 'L R RRR L', bpm: 100, label: 'Nhật Nam' },
      { text: 'RRR L RR L', bpm: 104, label: 'Giao Chỉ' },
    ],
    matchTempo: true,
    tolerance: 0.3,
    troops: 0,
    elephant: false,
    sky: 'night',
    ambience: 'amb-village',
    settle: 2.6, // seconds after a village lights up, back to the crickets, before the next call
    enemies: [],
  },
  {
    id: 'outpost',
    music: ['mu-bed-river', 'mu-bed-battle'], // its own bed if delivered, else the shared one
    title: 'The Outpost on the Hát River',
    subtitle: 'The drums answer',
    story:
      'The rising begins at the Hát River, where a Han outpost guards the ford. For the first time the sisters’ army marches to the drum, straight at the crossbows on the palisade.',
    goal:
      'Break the Han outpost that guards the ford. When a crossbow takes aim, guard just before the bolts land.',
    bpm: 96,
    unlocked: ['march', 'strike'],
    maxTier: 3,
    troops: 100,
    elephant: false,
    sky: 'day',
    ambience: 'amb-river',
    enemies: [
      { type: 'spear', x: 12 },
      { type: 'spear', x: 14 },
      { type: 'crossbow', x: 20 },
      { type: 'spear', x: 26 },
      { type: 'crossbow', x: 30 },
      { type: 'fort', x: 36, hp: 150 },
    ],
  },
  {
    id: 'luylau',
    music: ['mu-bed-luylau', 'mu-bed-battle'], // its own bed if delivered, else the shared one
    title: 'The Citadel at Luy Lâu',
    subtitle: 'Gold armour, war elephants',
    story:
      'Word of the victory runs ahead of the army to Luy Lâu, the Han governor’s seat, where soldiers in gold armour man the walls. The sisters ride into battle on a war elephant, the great drum on its back.',
    goal:
      'Wake the drum, then strike: the elephant charges.',
    bpm: 100,
    unlocked: ['march', 'strike'],
    maxTier: 3,
    troops: 120,
    elephant: true,
    sky: 'night',
    ambience: 'amb-night',
    enemies: [
      { type: 'spear', x: 12 },
      { type: 'crossbow', x: 17 },
      { type: 'spear', x: 20 },
      { type: 'spear', x: 22 },
      { type: 'crossbow', x: 27 },
      { type: 'spear', x: 31 },
      { type: 'crossbow', x: 35 },
      { type: 'spear', x: 38 },
      { type: 'fort', x: 44, hp: 320 },
    ],
  },
  {
    id: 'coronation',
    music: ['mu-bed-coronation', 'mu-bed-story'], // its own bed if delivered, else the shared one
    mode: 'echo',
    title: 'The Coronation at Mê Linh',
    subtitle: 'Two queens',
    story:
      'The governor has fled north, and sixty-five citadels have opened their gates. At Mê Linh the people proclaim Trưng Trắc and Trưng Nhị their queens, and the festival drummers play into the night.',
    goal:
      'The festival drummers call ever richer rhythms: answer them, as evenly as you can, for the crowd.',
    caller: 'festival',
    calls: [
      { text: 'L R L R', bpm: 112 },
      { text: 'L RR L RR', bpm: 112 },
      { text: 'RR L RR L', bpm: 116 },
      { text: 'L RRR L RRR', bpm: 116 },
      { text: 'RRR L RRR L', bpm: 120 },
      { text: 'L RR RRR L', bpm: 120 },
    ],
    matchTempo: false,
    troops: 100,
    elephant: false,
    sky: 'day',
    ambience: 'amb-coronation',
    enemies: [],
  },
  {
    id: 'mavien',
    music: ['mu-bed-mavien', 'mu-bed-battle'], // its own bed if delivered, else the shared one
    title: 'Mã Viện Returns',
    subtitle: 'Hold the ford',
    story:
      'Three years on, the Han emperor sends his general Mã Viện south with a great army. At the ford the last of the sisters’ soldiers must hold the line while Mê Linh empties behind them.',
    goal:
      'Hold the ford for ninety seconds: strike the columns, and raise the shields against every volley.',
    bpm: 100,
    unlocked: ['march', 'strike'],
    maxTier: 3,
    troops: 120,
    elephant: false,
    sky: 'dusk',
    ambience: 'amb-river',
    survive: 90,
    enemies: [
      { type: 'spear', x: 10 },
      { type: 'crossbow', x: 16 },
    ],
    // Columns arrive every few seconds, dx ahead of the army.
    waves: [
      { at: 10, enemies: [{ type: 'spear', dx: 14 }, { type: 'spear', dx: 16 }] },
      { at: 20, enemies: [{ type: 'crossbow', dx: 15 }, { type: 'spear', dx: 13 }] },
      { at: 30, enemies: [{ type: 'spear', dx: 13 }, { type: 'spear', dx: 15 }, { type: 'crossbow', dx: 18 }] },
      { at: 42, enemies: [{ type: 'crossbow', dx: 14 }, { type: 'crossbow', dx: 17 }] },
      { at: 52, enemies: [{ type: 'spear', dx: 12 }, { type: 'spear', dx: 14 }, { type: 'spear', dx: 16 }] },
      { at: 64, enemies: [{ type: 'crossbow', dx: 14 }, { type: 'spear', dx: 12 }, { type: 'crossbow', dx: 18 }] },
      { at: 76, enemies: [{ type: 'spear', dx: 12 }, { type: 'spear', dx: 13 }, { type: 'crossbow', dx: 16 }] },
    ],
  },
  {
    id: 'elegy',
    music: ['mu-bed-elegy', 'mu-ending'], // its own bed if delivered, else the shared one
    mode: 'echo',
    title: 'The Drums Are Melted',
    subtitle: 'Epilogue',
    story:
      'Mã Viện gathers the bronze drums of the Lạc Việt to melt them down, so their voices can never again call the people to rise. Before the fire takes them, the last drummers play them one final time.',
    goal:
      'Answer each drum’s rhythm one last time: each one you answer falls silent, until none are left.',
    caller: 'elegy',
    calls: [
      { text: 'L R L R', bpm: 50 },
      { text: 'L R R L', bpm: 50 },
      { text: 'L RR L R', bpm: 48 },
      { text: 'L R L R', bpm: 46 },
      { text: 'L R R R', bpm: 44 },
    ],
    matchTempo: false,
    troops: 0,
    elephant: false,
    sky: 'ash',
    ambience: 'amb-elegy',
    enemies: [],
  },
];
