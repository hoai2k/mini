// The Buttonbeaks: their field-guide entry. Their game is ../games/buttonbeaks.js.
export default {
  id: 'buttonbeaks',
  name: 'The Buttonbeaks',
  object: 'a pair of buttons',
  rhyme: ['Two little buttons, round and bright,', 'Go everywhere as a pair, just right.', 'They know each coat that needs a stitch:', 'Find the one that makes it match!'],
  game: 'Button Up',
  goal: 'Pick up the button each passing coat is missing, and toss it up into its buttonhole.',
  tips: ['Each empty buttonhole shows the button it wants: look at the colour, the shape and the holes.', 'Pick from a bowl: every hole that button fits glows pink. Walk under that coat and toss.', 'A button that doesn’t match bounces off and makes the Buttonbeaks dizzy.', 'Later the line runs faster, and two bowls of look-alike buttons arrive.'],
  score: 'buttons',
  controls: [['Walk', 'move'], ['Pick up a button, toss it', 'action', 'Tap a bowl to pick a button, tap a coat to toss it']],
  pass: 10,
  tune: 'menu',
  color: '#d9b0a0',
};
