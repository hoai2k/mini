// The Adventure's nine boards (design/adventure.md), in the book's order. Each
// board module, src/adventure/bNN.js, keeps the same contract as a chapter
// (src/chapters/index.js): default-export create(env) -> board with update,
// draw, time, done, outcome, marks(), hud?(), focus?() and outroTime?. The
// shell runs it exactly as it runs a chapter. The Adventure is solo or turn
// taking, so env.versus is always false and inH is always null.
//
// What a board adds over a chapter:
//   - Its world is wider than the screen: it scrolls with kit.makeCamera and
//     draws the whole frame itself, in screen space (1920 x 1080).
//   - focus() returns the player's position on screen (not in the world), so
//     the shell's phone camera frames it.
//   - Collectibles and a feat: marks() is kit.boardMarks(...).
//   - autopilot(board): an exported function returning the input for the next
//     frame that plays the board to the snatch, for the tests and the browser
//     check (test/adventure.test.mjs). It may read the board's internals.
//
// Art keys a board loads (the shell preloads them): its backdrop panels
// adv/bNN/backdrop-1..3, its props sheet adv.bNN.props, its place's ground
// pieces terrain.<place>, and its monster's poses and moves sheets.

export const BOARDS = [
  {
    n: 1, file: 'b01', snatcher: 'trollusk', holder: 'lookouts', holderName: 'the lookouts', place: 'lane',
    title: 'Faddle Street', scene: 'scenes/trollusk', time: 150,
    eyeing: 'Deep in the wood, under the leaves, the Trollusk was reading his stamp book when he heard it: a letter going into a mailbox on Faddle Street.',
    goal: 'Tiptoe along Faddle Street to Sally Ann’s mailbox before the mailman comes. Hide from the lookouts, don’t wake the dog, and gather every stamp on the wind.',
    controlsS: ['Move: tiptoe (silent)', 'Sprint: scurry (fast, but noisy)', 'Action: hop (hold for higher); at a ledge, grab it', 'Down: duck; in a bush you are hidden', 'Stand still: freeze behind a twig'],
    feat: 'Never caught by a lookout or the dog',
    collect: 'stamps',
    win: 'He grabbed the letter and gabbled away with a smirk on his snerk!',
  },
  {
    n: 2, file: 'b02', snatcher: 'bombanat', holder: 'trollusk', holderName: 'the Trollusk', place: 'wood',
    title: 'Out of Nowhere', scene: 'scenes/bombanat', time: 120,
    eyeing: 'But before the Trollusk could tear off the stamp, a pair of mauve wings came flapping out of Nowhere.',
    goal: 'Fly through the wood after the Trollusk. Weave through the branches, and in each clearing dive on him while he is out in the open.',
    controlsS: ['Action: flap (each press is a wing beat)', 'Down: dive; let go to swoop up', 'Sprint: beat hard (it tires you); glide onto a branch to rest'],
    feat: 'Snap the letter in the first or second clearing',
    collect: 'paper scraps',
    win: 'SNAP! The Bombanat snapped up the letter and flew off over the Blue Ocean of Bubbley Goo.',
  },
  {
    n: 3, file: 'b03', snatcher: 'grumley', holder: 'bombanat', holderName: 'the Bombanat', place: 'goo',
    title: 'A Nice Bombanat Lunch', scene: 'scenes/grumley', time: 120,
    eyeing: 'But before the Bombanat could find a nice place to settle down and eat the letter, two spectacled eyes rose out of the goo.',
    goal: 'Swim under the goo after the Bombanat in the striped necktie, grabbing plain Bombanats for lunch on the way. When he tries to land on the island, grab him!',
    controlsS: ['Move: swim', 'Action: lunge a crab claw; at the surface, up out of the goo', 'Sprint: squirt a jet of goo'],
    feat: 'Never caught in a fishing net',
    collect: 'plain Bombanats for lunch',
    win: 'The Grumley grabbed the Bombanat, letter and all, and licked his lips. SNAP! A big fishing net came down...',
  },
  {
    n: 4, file: 'b04', snatcher: 'iceferg', holder: 'peg', holderName: 'the fishing boat', place: 'sea',
    title: 'SCRUNNCCCHHH!!', scene: 'scenes/iceferg', time: 120,
    eyeing: 'But before the fishing boat could reach land, one beady eye opened in a crevice of the ice.',
    goal: 'Drift after the fishing boat and ram it before it reaches the harbour. Pick up sea lions on the way, and smash what stands in your path.',
    controlsS: ['Move: push along; up to rise, down to sink', 'Action: hold to huff up fury, let go to charge', 'Sprint: ride the current'],
    feat: 'Reach the Peg with eight sea lions aboard',
    collect: 'sea lions',
    win: 'SCRUNNCCCHHH!! As the ship went down, the captain stuffed a note in a bottle, pushed in the letter for good measure, and threw it into the ocean.',
  },
  {
    n: 5, file: 'b05', snatcher: 'typhoonigator', holder: 'bottle', holderName: 'the bottle', place: 'sea',
    title: 'Suck It All Up', scene: 'scenes/typhoonigator', time: 120,
    eyeing: 'But before anyone could find the bottle, a storm cloud with a nose came sniffing over the sea.',
    goal: 'Storm across the sky, sucking up the Blue Ocean of Bubbley Goo. Get the captain’s bottle before the sailors fish it out. The more you swallow, the bigger and slower you get!',
    controlsS: ['Move: roll across the sky', 'Action: hold to suck', 'Sprint: storm along (you rain some out)'],
    feat: 'Suck up nearly all of the goo',
    collect: 'goo',
    win: 'It sucked up the whole Blue Ocean of Bubbley Goo, and the bottle too, and stormed away so full it had to let go.',
  },
  {
    n: 6, file: 'b06', snatcher: 'yalapappus', holder: 'typhoonigator', holderName: 'the Typhoonigator', place: 'nowhere',
    title: 'KER-PLOP', scene: 'scenes/yalapappus', time: 120,
    eyeing: 'By morning the Typhoonigator was so full it had to let go. Down at the edge of Nowhere, someone tied on his napkin.',
    goal: 'Trundle through the edge of Nowhere munching every scrap of paper. Watch the shadows: things are falling! At the end, catch the captain’s bottle on your head.',
    controlsS: ['Action: hop; down in the air to ground-pound', 'Sprint: roll into a ball', 'Mash Action to munch'],
    feat: 'Nothing bonks you on the head (but the bottle)',
    collect: 'paper',
    win: 'KER-PLOP! Tinkle-plinkle! Out fell the Captain’s note and the letter, and he gleefully munched the note.',
  },
  {
    n: 7, file: 'b07', snatcher: 'trollusk', holder: 'yalapappus', holderName: 'the Yalapappus', place: 'nowhere',
    title: 'Just Passing By', scene: 'scenes/yalapappus', time: 100,
    eyeing: 'But before the Yalapappus could munch the letter, a checked top hat rose slowly behind a rock.',
    goal: 'Creep up on the munching Yalapappus (freeze when he looks round), snatch the letter, and run! Hop, slide, and keep ahead of him.',
    controlsS: ['Move: creep, then run', 'Action: snatch; then hop', 'Down while running: slide', 'Sprint: scurry'],
    feat: 'Never caught in the getaway',
    collect: 'stamps',
    win: 'He snatched the letter in his snerk and ran away, and the Yalapappus trundled after him, shouting and loudly grimming.',
  },
  {
    n: 8, file: 'b08', snatcher: 'bombanat', holder: 'trollusk', holderName: 'the Trollusk', place: 'nowhere',
    title: 'SNIP!', scene: 'scenes/yalapappus', time: 90,
    eyeing: 'Suddenly a mauve wing-shadow swept across the open ground.',
    goal: 'Swoop on the running Trollusk across the open ground. Ride the warm air up, dodge what the Yalapappus throws, and dive!',
    controlsS: ['Action: flap', 'Down: dive; let go to swoop', 'Sprint: beat hard'],
    feat: 'The snatch without being hit once',
    collect: 'scraps of the captain’s note',
    win: 'SNIP! Out of the sky swooped the Letter-Eating Bombanat, and snapped up the letter.',
  },
  {
    n: 9, file: 'b09', snatcher: 'grithix', holder: 'bombanat', holderName: 'the Bombanat', place: 'wood',
    title: 'FLIP-FLOP', scene: 'scenes/grithix', time: 150,
    eyeing: 'But before the Bombanat could eat the letter, a long-snouted face peeked round a tree, net raised, smiling.',
    goal: 'Stroll through your wood netting Bombanats for your collection. Net the one with the letter, FLIP-FLOP, and carry it to the official mailbox.',
    controlsS: ['Action: swing the net (up: overhead)', 'Sprint while moving: pole-vault', 'At the mailbox, Action: mail it'],
    feat: 'Everybody netted before posting',
    collect: 'Bombanats',
    win: 'He did what anybody should do with a lost letter. He mailed it!',
  },
];

for (const b of BOARDS) {
  b.holderGoal = '';
  b.controlsH = [];
}

const loaders = Object.fromEntries(BOARDS.map((b) => [b.file, () => import(`./${b.file}.js`)]));

export async function loadBoard(file) {
  return (await loadBoardModule(file))?.default || null;
}

// The whole module: default (the factory), autopilot, and optionally HOWTO
// (the how-to-play page's three steps, as for a chapter; chapters/index.js).
export async function loadBoardModule(file) {
  try {
    return await loaders[file]();
  } catch (e) {
    console.warn('[adventure] could not load', file, e);
    return null;
  }
}

// The art a board uses, for the shell to preload.
export function boardArt(b) {
  const nn = String(b.n).padStart(2, '0');
  return [`adv/b${nn}/backdrop-1`, `adv/b${nn}/backdrop-2`, `adv/b${nn}/backdrop-3`, `adv.b${nn}.props`,
    `terrain.${b.place}`, `${b.snatcher}.moves`, ...(EXTRA_ART[b.n] || [])];
}

// Pieces a board uses beyond its standard sheets (the requests added when the
// delivered art went in: OM-Z01, Z05 to Z09).
const EXTRA_ART = {
  2: ['adv.trunks'],
  3: ['adv.b03.boats', 'bombanat.plain', 'bombanat/plain-perched'],
  5: ['adv.b05.windmill'],
  7: ['adv/b07/palm-arch'],
  9: ['adv.trunks', 'bombanat.plain', 'bombanat/plain-perched'],
};
