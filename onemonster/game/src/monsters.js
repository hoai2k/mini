// The seven monsters as the game draws them: their key poses (numbered as in
// their pose sheets, see design/image-requests.md), the animations built from
// them, how big they stand, and their voices. Names and lines follow the book
// (reference/README.md).

export const MONSTERS = {
  trollusk: {
    name: 'The Stamp-Collecting Trollusk',
    short: 'Trollusk',
    wants: 'stamps, every one he can get',
    height: 230, // logical px for the idle pose
    voice: 'gabble',
    poses: { idle: 1, sneakA: 2, sneakB: 3, duck: 4, reach: 5, runA: 6, runB: 7, jolt: 8, scuttle: 9, wail: 10, eye: 11, celebrate: 12, freeze: 13, skid: 14 },
    anims: {
      idle: { frames: ['idle'], bob: 0.02 },
      sneak: { frames: ['sneakA', 'sneakB'], stride: 70 },
      run: { frames: ['runA', 'runB'], stride: 120 },
      duck: { frames: ['duck'] },
      freeze: { frames: ['freeze'] },
      skid: { frames: ['skid'] },
      grab: { frames: ['reach'] },
      jolt: { frames: ['jolt'] },
      scuttle: { frames: ['scuttle', 'runB'], fps: 8 },
      wail: { frames: ['wail'], bob: 0.04 },
      eye: { frames: ['eye'] },
      celebrate: { frames: ['celebrate', 'runB'], fps: 4, hop: 18 },
    },
  },
  bombanat: {
    name: 'The Letter-Eating Bombanat',
    short: 'Bombanat',
    wants: 'a letter to eat',
    height: 190,
    voice: 'flap',
    poses: { glide: 1, flapUp: 2, flapDown: 3, dive: 4, snap: 5, land: 6, grabbed: 7, netted: 8, perched: 9, eye: 10, celebrate: 11, walkA: 12, walkB: 13, stall: 14, swoop: 15 },
    anims: {
      glide: { frames: ['glide'], bob: 0.03 },
      flap: { frames: ['flapUp', 'glide', 'flapDown', 'glide'], fps: 12 },
      dive: { frames: ['dive'] },
      swoop: { frames: ['swoop'] },
      snap: { frames: ['snap'] },
      land: { frames: ['land'] },
      stall: { frames: ['stall'], shake: 3 },
      walk: { frames: ['walkA', 'walkB'], stride: 50 },
      perched: { frames: ['perched'] },
      grabbed: { frames: ['grabbed'], shake: 4 },
      netted: { frames: ['netted'], shake: 3 },
      eye: { frames: ['eye'] },
      celebrate: { frames: ['celebrate'], spin: true },
    },
  },
  grumley: {
    name: 'The Bombanat-Munching Grumley',
    short: 'Grumley',
    wants: 'a nice Bombanat lunch',
    height: 260,
    voice: 'slurp',
    poses: { lurk: 1, rise: 2, lunge: 3, triumph: 4, splutter: 5, lunch: 6, netted: 7, eye: 8, celebrate: 9, glide: 10, fullLunge: 11 },
    anims: {
      lurk: { frames: ['lurk'], bob: 0.03 },
      glide: { frames: ['glide'], bob: 0.03 },
      rise: { frames: ['rise'] },
      lunge: { frames: ['lunge'] },
      fullLunge: { frames: ['fullLunge'] },
      triumph: { frames: ['triumph'], hop: 10 },
      splutter: { frames: ['splutter'], shake: 3 },
      lunch: { frames: ['lunch'], bob: 0.04 },
      netted: { frames: ['netted'], shake: 3 },
      eye: { frames: ['eye'] },
      celebrate: { frames: ['celebrate'], hop: 12 },
    },
  },
  iceferg: {
    name: 'The Furious-Floating Ice-Ferg',
    short: 'Ice-Ferg',
    wants: 'to sink something, anything',
    height: 300,
    voice: 'creak',
    poses: { drift: 1, huff: 2, charge: 3, crash: 4, dazed: 5, eye: 6, celebrate: 7 },
    anims: {
      drift: { frames: ['drift'], bob: 0.02 },
      huff: { frames: ['huff'], shake: 2 },
      charge: { frames: ['charge'] },
      crash: { frames: ['crash'], shake: 6 },
      dazed: { frames: ['dazed'], bob: 0.03 },
      eye: { frames: ['eye'] },
      celebrate: { frames: ['celebrate'], bob: 0.03 },
    },
  },
  typhoonigator: {
    name: "The Wild-'n-Windy Typhoonigator",
    short: 'Typhoonigator',
    wants: 'to suck up everything in its path',
    height: 330,
    voice: 'whoosh',
    poses: { suck: 1, bloated: 2, letgo: 3, wisp: 4, eye: 5, burp: 6, roll: 7 },
    anims: {
      suck: { frames: ['suck'], bob: 0.02 },
      roll: { frames: ['roll'], bob: 0.02 },
      bloated: { frames: ['bloated'], bob: 0.03 },
      letgo: { frames: ['letgo'], shake: 2 },
      wisp: { frames: ['wisp'], bob: 0.03 },
      eye: { frames: ['eye'] },
      celebrate: { frames: ['burp'], bob: 0.04 },
    },
  },
  yalapappus: {
    name: 'The Paper-Munching Yalapappus',
    short: 'Yalapappus',
    wants: 'paper, any paper, for munching',
    height: 250,
    voice: 'munch',
    poses: { idle: 1, trundleA: 2, trundleB: 3, hop: 4, land: 5, munch: 6, bonked: 7, shout: 8, wail: 9, eye: 10, celebrate: 11, dizzy: 12 },
    extras: { ball: ['yalapappus.swaps', 9, 170] }, // [sheet, item, height on screen]
    anims: {
      idle: { frames: ['idle'], bob: 0.02 },
      trundle: { frames: ['trundleA', 'trundleB'], stride: 60 },
      shout: { frames: ['shout', 'trundleB'], stride: 70 },
      hop: { frames: ['hop'] },
      land: { frames: ['land'] },
      munch: { frames: ['munch'], bob: 0.05, fps: 6 },
      bonked: { frames: ['bonked'], shake: 2 },
      wail: { frames: ['wail'], bob: 0.04 },
      dizzy: { frames: ['dizzy'], shake: 2 },
      ball: { frames: ['ball'], spin: true },
      eye: { frames: ['eye'] },
      celebrate: { frames: ['celebrate'], hop: 10 },
    },
  },
  grithix: {
    name: 'The Bombanat-Collecting Grithix',
    short: 'Grithix',
    wants: 'Bombanats for his collection',
    height: 300,
    voice: 'swish',
    poses: { idle: 1, strideA: 2, strideB: 3, windup: 4, swing: 5, slam: 6, post: 7, trip: 8, stroll: 9, eye: 10, celebrate: 11, vaultPlant: 12, vaultTop: 13, vaultLand: 14 },
    anims: {
      idle: { frames: ['idle'], bob: 0.015 },
      stride: { frames: ['strideA', 'strideB'], stride: 90 },
      windup: { frames: ['windup'] },
      swing: { frames: ['swing'] },
      slam: { frames: ['slam'] },
      post: { frames: ['post'] },
      trip: { frames: ['trip'], shake: 2 },
      stroll: { frames: ['stroll', 'strideB'], stride: 80 },
      vault: { frames: ['vaultPlant', 'vaultTop', 'vaultLand'], fps: 4 },
      eye: { frames: ['eye'] },
      celebrate: { frames: ['celebrate'], bob: 0.03 },
    },
  },
};

// The Adventure's new poses (design/adventure.md; requests OM-A01..07), on each
// monster's moves sheet, drawn at the same scale as its key poses. Each is
// [name, fallback key pose drawn until the sheet arrives, animation options].
// They become extras (see art.js) and single-pose animations of the same name;
// boards may build their own cycles from them too.
const MOVES = {
  trollusk: [
    ['crouch', 'duck'], ['jump', 'reach'], ['fall', 'runB'], ['landSquash', 'duck'], ['hang', 'reach', { shake: 1 }],
    ['climb', 'reach'], ['slide', 'duck'], ['tumble', 'scuttle', { shake: 3 }], ['balance', 'sneakA', { bob: 0.03 }],
    ['sniff', 'celebrate', { bob: 0.03 }], ['lookBack', 'runA'], ['soaked', 'wail', { bob: 0.03 }],
  ],
  bombanat: [
    ['carry', 'glide'], ['tumble', 'stall', { shake: 3 }], ['roost', 'perched', { bob: 0.02 }], ['bank', 'glide'],
    ['climb', 'flapDown'], ['pullUp', 'swoop'], ['munch', 'snap', { bob: 0.04 }], ['blownBack', 'stall', { shake: 2 }],
    ['soaked', 'stall', { bob: 0.03 }],
  ],
  grumley: [
    ['swimA', 'glide'], ['swimB', 'glide'], ['diveDown', 'glide'], ['leap', 'fullLunge'], ['jet', 'glide'],
    ['clawsUp', 'lunge'], ['tangled', 'netted', { shake: 3 }], ['dizzy', 'splutter', { shake: 2 }], ['cling', 'lurk', { bob: 0.02 }],
  ],
  iceferg: [
    ['side', 'drift', { bob: 0.02 }], ['sunk', 'drift', { bob: 0.02 }], ['risen', 'drift', { bob: 0.02 }],
    ['chargeSide', 'charge'], ['cracked', 'crash', { shake: 3 }], ['melted', 'dazed', { bob: 0.03 }],
  ],
  typhoonigator: [
    ['rollSide', 'roll', { bob: 0.02 }], ['suckSide', 'suck', { bob: 0.02 }], ['blow', 'letgo', { shake: 2 }],
    ['swollen', 'bloated', { bob: 0.03 }], ['wispSide', 'wisp', { bob: 0.03 }], ['thunder', 'roll', { shake: 3 }],
  ],
  yalapappus: [
    ['crouch', 'land'], ['hopTop', 'hop'], ['pound', 'hop'], ['shakeTree', 'shout', { shake: 3 }], ['gooStuck', 'bonked', { shake: 1 }],
    ['lookUp', 'celebrate'], ['chase', 'shout'], ['rollUp', 'dizzy'],
  ],
  grithix: [
    ['netUp', 'swing'], ['netLow', 'slam'], ['carry', 'stroll'], ['duck', 'windup'], ['balance', 'idle', { bob: 0.02 }],
    ['stepHigh', 'strideA'],
  ],
};
for (const [id, list] of Object.entries(MOVES)) {
  const M = MONSTERS[id];
  M.extras = M.extras || {};
  list.forEach(([name, fallback, opts], i) => {
    M.extras[name] = [`${id}.moves`, i + 1, null, fallback];
    if (!M.anims[name]) M.anims[name] = { frames: [name], ...(opts || {}) };
  });
}

export const ORDER = ['trollusk', 'bombanat', 'grumley', 'iceferg', 'typhoonigator', 'yalapappus', 'grithix'];
