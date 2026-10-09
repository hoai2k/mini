// The Jackknife Niffy: its field-guide entry. Its game is ../games/niffy.js.
export default {
  id: 'niffy',
  name: 'The Jackknife Niffy',
  object: 'a pocketknife',
  rhyme: ['Snip-snap! The Niffy’s in the air,', 'With one sharp blade and not a care.', 'A feather here, a thread there:', 'But mind the Keeper’s watchful stare!'],
  game: 'Snip Snap',
  goal: 'Swoop down and snip the feathers, flowers, loose threads and price tags from the people strolling below.',
  tips: [
    'The pink ring shows what a swoop would snip: press when it sits on a feather, flower, thread or tag.',
    'Miss, and the people close by hold on to their things for a moment: aim before you swoop.',
    'A red “!” means the Park Keeper is turning round: stay up in the sky until his red eye goes away, or he’ll whistle and daze you.',
    'Never snip a balloon string. A price tag is worth two.',
  ],
  score: 'snips',
  controls: [['Fly', 'move', 'Tap where to swoop'], ['Swoop and snip', 'action']],
  pass: 9,
  tune: 'play',
  color: '#e0a49a',
};
