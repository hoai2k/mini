// The Saltshaker Shrike's field-guide entry; its game is ../games/saltshakershrike.js.
export default {
  id: 'saltshakershrike',
  name: 'The Saltshaker Shrike',
  object: 'a salt shaker',
  rhyme: ['Upside down above the plates,', 'The Shrike hangs on and calmly waits.', 'A pinch, a pinch, and that will do:', 'Too much, too little? Diners boo!'],
  game: 'Just a Pinch',
  goal: 'Shake just as many pinches of salt on each plate as its little flag shows.',
  tips: ['One press is one pinch. The flag fills in as the salt lands.', 'Salt takes a moment to fall: shake a little ahead of the plate.', 'Just right scores three; one pinch out scores one.', 'Puddings want no salt at all!'],
  score: 'points',
  controls: [['Move along the rail', 'move', 'Tap above a plate to shake'], ['Shake a pinch', 'action']],
  pass: 30,
  tune: 'play',
  color: '#9ab0b8',
};
