// The Jackknife Niffy: its field-guide entry. Its game is ../games/niffy.js.
export default {
  id: 'niffy',
  name: 'The Jackknife Niffy',
  object: 'a pocketknife',
  rhyme: ['Snip-snap! The Niffy’s in the air,', 'With one sharp blade and not a care.', 'A feather here, a thread there:', 'But mind the Keeper’s watchful stare!'],
  game: 'Snip Snap',
  goal: 'Swoop down and snip the feathers, flowers, loose threads and price tags from the people strolling below.',
  tips: [
    'A pink ring shows what a swoop would snip: press when it’s on a feather, flower, thread or tag, and the Niffy goes straight for it.',
    'Fly low for quick snips, but the Park Keeper notices you fast down there; up high you’re safe but slower.',
    'When his “!” and eye appear, climb high and keep still until his eye goes: if the ring round it fills, he whistles and dazes you.',
    'Swoop at nothing and people hold on to their things for a moment. Never snip a balloon string; a price tag is worth two.',
  ],
  score: 'snips',
  controls: [['Fly along', 'move', 'Point to fly: left and right, and higher or lower'], ['Fly higher / lower', 'stick or D-pad ▲ ▼, or ↑ ↓ / W S', 'Tap where to swoop'], ['Swoop and snip', 'action']],
  pass: 10,
  tune: 'play',
  color: '#e0a49a',
};
