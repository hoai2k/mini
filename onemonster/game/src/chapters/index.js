// The nine snatches (design.md, "The chapters"), in the book's order, and the
// contract every chapter module keeps. The shell (main.js) owns everything
// around play: the eyeing-the-prize scene, the name card, how to play, the
// count-in, the clock, pause, the celebration and the postmarks. A chapter only
// plays.
//
// THE CONTRACT. src/chapters/chNN.js default-exports create(env) -> chapter.
//
//   env = {
//     W: 1920, H: 1080          logical canvas size; draw in these units
//     rng(): [0, 1)             seeded, so tests repeat
//     sfx(name)                 a sound from engine/audio.js (no-op in tests)
//     vibrate(ms)               a short rumble, when supported and allowed
//     reduceMotion: boolean     keep shakes, flashes and spins small
//     versus: boolean           true: the holder is a second player (inH is
//                               given); false: the chapter runs the holder's AI
//     gentle: [bool, bool]      Gentle mode for [snatcher, holder]
//     skill: 0..1               the computer holder's skill (rises in the
//                               journey; lower in Gentle mode)
//     inputKind                 'controller' | 'keyboard' | 'touch': name the
//                               right button in prompts (src/prompt.js)
//   }
//
//   chapter = {
//     update(dt, inS, inH)      advance dt s (the shell caps it at 1/20).
//                               inS: the snatcher's input; inH: the holder's in
//                               versus, else null. Input is
//                               { x, y (-1..1), action, actionPressed,
//                                 actionReleased, sprint, kind }
//     draw(g, t)                the whole frame on a 1920 x 1080 context,
//                               scene included (the shell draws only the HUD)
//     time                      seconds left (the shell shows the clock)
//     done                      true once over; then:
//     outcome                   'snatched' (the snatcher got the letter) or 'kept'
//     marks()                   [snatcher postmarks 0..3, holder postmarks 0..3]
//     hud?()                    a short status line, e.g. "Stamps 3"
//     focus?()                  [snatcher, holder?, ...] as { x, y } in the
//                               1920 x 1080 frame: what the shell's camera
//                               follows on a narrow screen (a phone upright)
//     outroTime?                seconds of outro after done before the celebration
//                               (default 1.4), for a longer story beat
//   }
//
// THE HOW-TO-PLAY PAGE. A chapter module also exports HOWTO: the three steps
// shown on the page before it starts (design.md, Flow), each
//   { text: 'Creep from bush to bush.',      the caption, one short sentence
//     scene: 'scenes/trollusk', crop: [x, y, w, h],   the backdrop: a part of a
//                                            1920 x 1080 scene, scaled to fill
//     items: [ ... ] }                       drawn in order on a 640 x 480 picture
// The picture howto/chNN-k (image-requests.md, OM-H) replaces the composed one
// when it arrives. Items, in 640 x 480 units:
//   { creature: 'trollusk', anim: 'sneak', x, y, h, flip }  feet (fliers: middle) at x, y, h tall
//   { sprite: ['props.trollusk', 5], x, y, h, ax, ay, rot }  a sprite (anchor default bottom middle)
//   { cast: 3, x, y, h }                                    a cast sprite
//   { path: [[x, y], ...], arrow: true }                    a dotted ink path, arrowhead at the end
//   { ring: [x, y, r] }                                     a dashed ink ring, to point something out
//   { word: 'SNAP!', x, y, size }                           a sound word in the book's style
//   { draw: (g, t) => {} }                                  anything else, in code

// Draw creatures with art.js (makeCreature, setAnim, animate, drawCreature),
// props with art.prop(), scenes with art.drawScene(g, 'scenes/<monster>', W, H).
// Chases use chase.js. Time running out must end in the snatch anyway, as in the
// book: set outcome 'kept' (the holder kept it this time; the story still goes on).

export const CHAPTERS = [
  {
    n: 1, file: 'ch01', snatcher: 'trollusk', holder: 'lookouts', holderName: 'the lookouts',
    title: 'Before the Mailman Comes', scene: 'scenes/trollusk', props: 'trollusk', time: 45,
    eyeing: 'Sally Ann put her letter in the mailbox and skipped back indoors. Behind the old tree, something with a snerk was watching.',
    goal: 'Creep from cover to cover to the mailbox and grab the letter before the mailman comes. Don’t get spotted moving in the open: an unseen snatch earns the third postmark.',
    holderGoal: 'You are the lookouts. Choose who looks out, and when. Catch the Trollusk moving in the open!',
    controlsS: ['Move: creep from cover to cover', 'Sprint: hurry, but you make a noise', 'Action: dash out of a ring (loud!); still in a bush: duck; at the mailbox: grab'],
    controlsH: ['Move: choose a lookout (Sally Ann, the neighbour, the dog)', 'Action: make them look out (they need a rest after)'],
    win: 'He grabbed the letter and gabbled away with a smirk on his snerk!',
  },
  {
    n: 2, file: 'ch02', snatcher: 'bombanat', holder: 'trollusk', holderName: 'the Trollusk',
    title: 'Out of Nowhere', scene: 'scenes/bombanat', props: 'bombanat', time: 45,
    eyeing: 'But before the Trollusk could tear off the stamp, a pair of mauve wings came flapping out of Nowhere.',
    goal: 'Swoop on the Trollusk and snap up the letter. He will duck into the bushes, so make him tired first, then dive.',
    holderGoal: 'You are the Trollusk. Keep the letter! Hide in the bushes, dodge the dives, and save your breath.',
    controlsS: ['Move: fly', 'Sprint: beat your wings hard (it tires you)', 'Action: dive! Close up, grab and tug'],
    controlsH: ['Move: run', 'Sprint: scurry (it tires you)', 'Action: dodge a dive; in a tug, mash it to break free'],
    win: 'SNAP! The Bombanat snapped up the letter and flew off over the Blue Ocean of Bubbley Goo.',
  },
  {
    n: 3, file: 'ch03', snatcher: 'grumley', holder: 'bombanat', holderName: 'the Bombanat',
    title: 'A Nice Bombanat Lunch', scene: 'scenes/grumley', props: 'grumley', time: 45,
    eyeing: 'But before the Bombanat could find a nice place to settle down and eat the letter, two spectacled eyes rose out of the goo.',
    goal: 'Lurk under the goo. The Bombanat with the letter has a ring round him. When he dips into your claw’s reach, lunge and grab him! Every miss warns him off.',
    holderGoal: 'You are the Bombanat with the letter. Keep out of the Grumley’s reach (the column over his horns) and watch the bubbles. Your wings tire: rest on the goo far from him.',
    controlsS: ['Move: glide under the goo (keep still and the claw reaches higher)', 'Sprint: glide fast (your bubbles give you away)', 'Action: lunge up and grab'],
    controlsH: ['Move: fly (down to dive, up to glide flat)', 'Action: flap to climb (it tires you; rest on the goo)', 'Sprint: a quick dart'],
    win: 'The Grumley grabbed the Bombanat, letter and all, and licked his lips. SNAP! A big fishing net came down...',
  },
  {
    n: 4, file: 'ch04', snatcher: 'iceferg', holder: 'peg', holderName: 'the fishing boat',
    title: 'SCRUNNCCCHHH!!', scene: 'scenes/iceferg', props: 'iceferg', time: 45,
    eyeing: 'But before the fishing boat could reach land, one beady eye opened in a crevice of the ice.',
    goal: 'Huff up your fury and charge into the Peg, the big teal boat with the letter aboard, before it reaches the harbour. The foam arrows are currents: ride them. Strike at full fury for a bonus postmark.',
    holderGoal: 'You are the captain of the Peg. Steer for the harbour by the lighthouse. When the iceberg rears back, steam out of its way!',
    controlsS: ['Move: steer (the ice drifts with the currents)', 'Action: hold to huff up fury, let go to CHARGE', 'Sprint: ride a current (fast, but it hardly turns)'],
    controlsH: ['Move: steer the Peg', 'Action: a burst of steam to dodge (then it must build up again)'],
    win: 'SCRUNNCCCHHH!! As the ship went down, the captain stuffed a note in a bottle, pushed in the letter for good measure, and threw it into the ocean.',
  },
  {
    n: 5, file: 'ch05', snatcher: 'typhoonigator', holder: 'bottle', holderName: 'the bottle',
    title: 'Suck It All Up', scene: 'scenes/typhoonigator', props: 'typhoonigator', time: 45,
    eyeing: 'But before anyone could find the bottle, a storm cloud with a nose came sniffing over the sea.',
    goal: 'Roll your spout over the captain’s bottle (the red-and-white label) and hold Action to suck it up. Everything else you swallow fills your tummy; full up, you burp.',
    holderGoal: 'You are the captain’s bottle. Drift with the waves, and duck under one when the spout’s ring comes over you.',
    controlsS: ['Move: roll across the sky (the spout follows)', 'Action: hold to suck; let go to stop', 'Sprint: storm along (a wider spout, but it drinks more)'],
    controlsH: ['Move: drift about', 'Action: duck under a wave (then wait a moment before the next)'],
    win: 'It sucked up the whole Blue Ocean of Bubbley Goo, and the bottle too, and stormed away so full it had to let go.',
  },
  {
    n: 6, file: 'ch06', snatcher: 'yalapappus', holder: 'typhoonigator', holderName: 'the Typhoonigator',
    title: 'KER-PLOP', scene: 'scenes/yalapappus', props: 'yalapappus', time: 45,
    eyeing: 'By morning the Typhoonigator was so full it had to let go. Down at the edge of Nowhere, someone tied on his napkin.',
    goal: 'Trundle under the falling things and catch the captain’s bottle on your head. Dodge the boats and the fish! Then munch the note.',
    holderGoal: 'You are the Typhoonigator, letting go. Drop everything you swallowed, and hide the bottle among it.',
    controlsS: ['Move: trundle under the bottle’s shadow', 'Action: hop (over a rock, or aside); at the end, mash it to munch', 'Sprint: roll into a ball (fast, but you can’t catch)'],
    controlsH: ['Move: drift across the sky', 'Action: let the next thing go (the bottle must go by 8 s left)'],
    win: 'KER-PLOP! Tinkle-plinkle! Out fell the Captain’s note and the letter, and he gleefully munched the note.',
  },
  {
    n: 7, file: 'ch07', snatcher: 'trollusk', holder: 'yalapappus', holderName: 'the Yalapappus',
    title: 'Just Passing By', scene: 'scenes/yalapappus', props: 'yalapappus', time: 45,
    eyeing: 'But before the Yalapappus could munch the letter, a checked top hat rose slowly behind a rock.',
    goal: 'Creep up behind the munching Yalapappus (freeze when he looks round), snatch the letter, then get away!',
    holderGoal: 'You are the Yalapappus. Look round now and then while you munch. If he snatches it, chase him!',
    controlsS: ['Move: creep, then run', 'Sprint: scurry', 'Action: snatch; then dodge'],
    controlsH: ['Action: look round (while munching)', 'Move: chase after the snatch', 'Sprint: roll into a ball'],
    win: 'He snatched the letter in his snerk and ran away, and the Yalapappus trundled after him, shouting and loudly grimming.',
  },
  {
    n: 8, file: 'ch08', snatcher: 'bombanat', holder: 'trollusk', holderName: 'the Trollusk',
    title: 'SNIP!', scene: 'scenes/yalapappus', props: 'yalapappus', time: 30,
    eyeing: 'Suddenly a mauve wing-shadow swept across the ground.',
    goal: 'Swoop on the running Trollusk in the open. The Yalapappus is stomping along behind and grabbing at anything in reach!',
    holderGoal: 'You are the Trollusk again, out in the open. Dodge the dives and keep away from the Yalapappus too.',
    controlsS: ['Move: fly', 'Sprint: beat your wings hard', 'Action: dive! Close up, grab and tug'],
    controlsH: ['Move: run', 'Sprint: scurry', 'Action: dodge; in a tug, mash it to break free'],
    win: 'SNIP! Out of the sky swooped the Letter-Eating Bombanat, and snapped up the letter.',
  },
  {
    n: 9, file: 'ch09', snatcher: 'grithix', holder: 'bombanat', holderName: 'the Bombanat',
    title: 'FLIP-FLOP', scene: 'scenes/grithix', props: 'grithix', time: 60,
    eyeing: 'But before the Bombanat could eat the letter, a long-snouted face peeked round a tree, net raised, smiling.',
    goal: 'Net the Bombanat with the letter (FLIP-FLOP!), then carry the letter to the official mailbox. Net the others too, for a bonus.',
    holderGoal: 'You are the Bombanat. Dodge that net! If you are caught, you become the Trollusk and trip him up on his way to the mailbox.',
    controlsS: ['Move: stride', 'Sprint: pole-vault', 'Action: swing the net'],
    controlsH: ['Move: fly', 'Sprint: dart', 'Action: dodge (then trip him, as the Trollusk)'],
    win: 'He did what anybody should do with a lost letter. He mailed it!',
  },
];

const loaders = Object.fromEntries(CHAPTERS.map((c) => [c.file, () => import(`./${c.file}.js`)]));

export async function loadChapter(file) {
  return (await loadChapterModule(file))?.default || null;
}

// The whole module: default (the factory) and HOWTO (the how-to-play page).
export async function loadChapterModule(file) {
  try {
    return await loaders[file]();
  } catch (e) {
    console.warn('[chapters] could not load', file, e);
    return null;
  }
}

// mulberry32: a small seeded random number generator.
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Postmarks for the snatcher from time to spare (0..1 of the chapter), with
// a bonus fraction; for the holder from the fraction of the time they held out.
export function marksFor({ snatched, spareFrac, heldFrac, bonus = 0 }) {
  let s = 0;
  if (snatched) s = 1 + (spareFrac + bonus * 0.25 > 0.3 ? 1 : 0) + (spareFrac + bonus * 0.25 > 0.6 ? 1 : 0);
  const h = snatched ? (heldFrac > 0.75 ? 2 : heldFrac > 0.4 ? 1 : 0) : 3;
  return [Math.min(3, s), h];
}
