// The field guide: one entry per bird, in the order of the book's pages.
// The rhymes are the game's own, not the book's verses.
// `medals` are the scores for bronze, silver and gold in the bird's minigame.

export const BIRDS = [
  {
    id: 'coot',
    name: 'The Ice-Cream Cone Coot',
    object: 'an ice-cream cone',
    rhyme: ['Up in the sky the ice creams fly,', 'The Coot looks up with one blue eye.', 'Catch them high and stack them tall,', 'But lean too far and down they fall!'],
    game: 'Scoop Stack',
    goal: 'Catch the scoops on the Coot’s head and build the tallest stack you can.',
    tips: ['A scoop lands where it touches: catch it in the middle to keep the stack straight.', 'Pickles and socks knock off the top scoop.', 'A golden cherry counts as three.'],
    score: 'scoops in your tallest stack',
    medals: [8, 15, 22],
    tune: 'play',
    color: '#e98aa8',
  },
  {
    id: 'cupadee',
    name: 'The Cupadee',
    object: 'a teacup',
    rhyme: ['The Cupadee walks in for tea,', 'As thirsty as a bird can be.', 'Pour it slow and stop in time:', 'Spill a drop and hear him whine!'],
    game: 'Tea Time',
    goal: 'Hold to pour, and let go when the tea reaches the line.',
    tips: ['Right on the line is perfect.', 'Overfill and it spills: no points for that cup.', 'Later Cupadees are smaller, faster and bouncier.'],
    score: 'points',
    medals: [600, 1100, 1600],
    tune: 'menu',
    color: '#e8d27a',
  },
  {
    id: 'shuttercluck',
    name: 'The Shuttercluck',
    object: 'a camera',
    rhyme: ['It cannot sing, it will not fly,', 'It only stares with one glass eye.', 'Find the birds that hide and peep,', 'Then click! A picture you can keep.'],
    game: 'Say Cheese',
    goal: 'Birds peek out of their hiding places. Frame them and take their picture.',
    tips: ['A bird in the middle of the frame scores most.', 'Rare birds score more, and only peek for a moment.', 'You have ten shots.'],
    score: 'points',
    medals: [400, 750, 1100],
    tune: 'menu',
    color: '#c97b8c',
  },
  {
    id: 'gullfinch',
    name: 'The Gramophone Gullfinch',
    object: 'a gramophone',
    rhyme: ['Give the crank a turn or two,', 'And the Gullfinch sings for you.', 'If the tune begins to sag,', 'Wind it up and don’t let it drag!'],
    game: 'Wind and Sing',
    goal: 'Press as each note reaches the needle, and keep the spring wound up.',
    tips: ['Spin the stick (or drag in circles, or tap fast between notes) to wind the spring.', 'A run-down spring makes the song slow and sad, and the notes harder to hit.', 'Long streaks score a bonus.'],
    score: 'points',
    medals: [1500, 2600, 3600],
    tune: null,
    color: '#b5a642',
  },
  {
    id: 'plume',
    name: 'The Flowerpot Plume',
    object: 'a flowerpot',
    rhyme: ['A drink of water every day', 'And watch the Plume’s bud find its way:', 'A sprout, a stem, a flower crown!', 'But let it dry, and it droops down.'],
    game: 'Bloom',
    goal: 'Move the watering can and hold to water. Bring each Plume to full bloom.',
    tips: ['Each full bloom scores, then the Plume starts again.', 'A dry Plume wilts and loses its growth.', 'Too much water and it gets soggy and stops for a moment.'],
    score: 'blooms',
    medals: [6, 11, 16],
    tune: 'menu',
    color: '#d99a8a',
  },
  {
    id: 'bobolinks',
    name: 'The Highbutton Bobolinks',
    object: 'a pair of boots',
    rhyme: ['Two buttoned boots go out at night', 'To hop the stream by pale moonlight.', 'The left one first, and then the right:', 'Miss a stone, and splash! Not quite.'],
    game: 'Left Foot, Right Foot',
    goal: 'Step on each stone with the matching foot to cross the stream.',
    tips: ['Left stone: left foot. Right stone: right foot.', 'A wrong step splashes and costs a moment.', 'Double stones need both feet at once.'],
    score: 'stones',
    medals: [45, 75, 105],
    tune: 'night',
    color: '#b88aa0',
  },
  {
    id: 'peeper',
    name: 'The Newspaper Peeper',
    object: 'a newspaper',
    rhyme: ['No feathers here, just words and print,', 'The Peeper’s covered, every inch.', 'Its letters flutter, loose and free:', 'Catch them back in order, please!'],
    game: 'Hot off the Press',
    goal: 'Catch the letters of the word in order as they flutter down.',
    tips: ['The next letter you need is underlined.', 'A wrong letter smudges the word and costs a point.', 'Longer words score more.'],
    score: 'points',
    medals: [12, 24, 36],
    tune: 'play',
    color: '#c9c09a',
  },
  {
    id: 'piffle',
    name: 'The Pincushion Piffle',
    object: 'a pincushion',
    rhyme: ['A plump little cushion, prickly with pins,', 'The Piffle is ready when sewing begins.', 'Follow the dots with needle and thread,', 'Keep to the line, or you’ll tangle instead!'],
    game: 'Stitch in Time',
    goal: 'Steer the needle along the dotted seam as the quilt scrolls by.',
    tips: ['Stitches on the line score; stitches off it don’t.', 'Hold the action to sew faster, if you dare.'],
    score: 'stitches',
    medals: [120, 200, 280],
    tune: 'menu',
    color: '#a89a52',
  },
  {
    id: 'dodo',
    name: 'The Dollarbill Dodo',
    object: 'a banknote',
    rhyme: ['The Dodo’s paper, green and flat,', 'And loves to hide beneath a hat.', 'The hats go round and round and round:', 'Keep your eye on it. Where’s it found?'],
    game: 'Spot the Dodo',
    goal: 'Watch the hat the Dodo hides under as they shuffle, then pick it.',
    tips: ['More hats, and faster shuffles, every round.', 'Pick quickly for a bonus.'],
    score: 'points',
    medals: [400, 700, 950],
    tune: 'play',
    color: '#b8c46a',
  },
  {
    id: 'crow',
    name: 'The Safecrossing Crow',
    object: 'a traffic light',
    rhyme: ['Red for stop and green for go,', 'Tall on its stilts stands the Safecrossing Crow.', 'Cars on the road, little birds on the side:', 'Take turns, and everyone gets a safe ride.'],
    game: 'Safe Crossing',
    goal: 'Switch the light so the cars and the little birds take turns to cross.',
    tips: ['Green lets the cars go; red lets the birds cross.', 'Anyone who waits too long gives up and leaves.', 'Switching while birds are still crossing is a near miss: it costs points.'],
    score: 'crossings',
    medals: [40, 65, 90],
    tune: 'play',
    color: '#5e7a5a',
  },
];

export const birdById = (id) => BIRDS.find((b) => b.id === id);

// 0 none, 1 bronze, 2 silver, 3 gold.
export function medalFor(bird, score) {
  let m = 0;
  bird.medals.forEach((t, i) => {
    if (score >= t) m = i + 1;
  });
  return m;
}

export const MEDAL_NAMES = ['No medal', 'Bronze', 'Silver', 'Gold'];
