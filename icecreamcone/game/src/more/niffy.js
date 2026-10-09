// The Jackknife Niffy: its field-guide entry. Its game is ../games/niffy.js.
export default {
  id: 'niffy',
  name: 'The Jackknife Niffy',
  object: 'a pocketknife',
  rhyme: ['Snip-snap! The Niffy’s in the air,', 'With one sharp blade and not a care.', 'A feather here, a thread there:', 'But mind the Keeper’s watchful stare!'],
  game: 'Snip Snap',
  goal: 'Swoop down and snip the feathers, flowers, loose threads and price tags from the people strolling below.',
  tips: [
    'The Niffy takes a moment to swoop down: aim where the walker is going, not where they are.',
    'When the Park Keeper’s head turns and a “?” appears, stay up in the sky until he looks away again.',
    'Never snip a balloon string: that costs two.',
    'A price tag is worth two snips.',
  ],
  score: 'snips',
  controls: [['Fly', 'move', 'Tap where to swoop'], ['Swoop and snip', 'action']],
  pass: 7,
  tune: 'play',
  color: '#e0a49a',
};
