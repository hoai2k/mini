// The Radio Bird's field-guide entry (its game is ../games/radiobird.js). Its
// name in the book isn't known; it is "the Radio Bird" until it is.
export default {
  id: 'radiobird',
  name: 'The Radio Bird',
  object: 'a transistor radio',
  rhyme: ['Hiss and crackle, whistle and hum,', 'Turn the dial and the songs will come.', 'Find the one your friends call for,', 'Then hold it still, and play some more!'],
  game: 'Tune In',
  goal: 'Turn the dial to find the station the listeners ask for, and hold it there while the song plays.',
  tips: ['Watch the signal: the green eye closes as a station comes near.', 'The station’s picture shows in the speaker once it’s tuned in.', 'Every station you find is pencilled on the dial, but the stations drift: follow them.', 'Spin the stick, or hold the action, to turn the dial slowly.'],
  score: 'songs',
  controls: [['Turn the dial', 'move', 'Drag the needle'], ['Turn slowly', 'action']],
  pass: 6,
  tune: null,
  color: '#d0a070',
};
