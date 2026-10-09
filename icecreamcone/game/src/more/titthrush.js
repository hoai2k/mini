// The Ten O'clock Tit Trush: Set the Clocks. Its game is ../games/titthrush.js.
export default {
  id: 'titthrush',
  name: 'The Ten O’clock Tit Trush',
  object: 'a pocket watch',
  rhyme: ['Tick, says the Trush, and tock, and tick,', 'Its golden hands go round so quick.', 'Whatever the town clocks call, it’s set;', 'But ten o’clock is its favourite yet.'],
  game: 'Set the Clocks',
  goal: 'Turn the watch’s hands to the time each town clock calls out, then press to set it.',
  tips: ['Spin the stick, drag the long hand round, or hold ← / → to turn the hands. ↑ / ↓ (or a flick of the stick, or dragging the short hand) move a whole hour.', 'The short hand follows the long one: count the hours as it goes round.', 'Set the wrong time and the crown jams for a moment.', 'When a clock calls ten o’clock, the Trush’s own hour, it counts double.'],
  score: 'clocks',
  controls: [['Turn the hands', 'Spin the stick, or hold the arrows', 'Drag round the face; tap to set it'], ['Set the clock', 'action']],
  pass: 9,
  tune: 'menu',
  color: '#d8b040',
};
