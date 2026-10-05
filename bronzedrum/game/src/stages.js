// Stage data. Positions are in field units; the army starts at x = 0 and
// the camera shows about 24 units across. bpm is the Han war drum's tempo
// (how often the enemy acts); the player drums at any speed they like.
// maxTier is the most intricate rhythm tier the chapter allows.

export const STAGES = [
  {
    id: 'garden',
    title: 'The Garden at Mê Linh',
    subtitle: 'Training years',
    intro:
      'Before the war, the sisters learn the drum. Trắc keeps the deep centre, Nhị the rim. Teach the women to march and strike, then cut down the straw targets.',
    bpm: 92,
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
    id: 'outpost',
    title: 'The Outpost on the Hát River',
    subtitle: 'The drums answer',
    intro:
      'Villages along the river have heard the drum. Break the Han outpost that guards the ford. When a crossbow takes aim, guard just before the bolts land.',
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
    title: 'The Citadel at Luy Lâu',
    subtitle: 'Gold armour, war elephants',
    intro:
      'The governor’s seat. The sisters ride the war elephant with the great drum on its back. Rally the wounded, and when the drum wakes, charge.',
    bpm: 100,
    unlocked: ['march', 'strike', 'rally', 'charge'],
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
];
