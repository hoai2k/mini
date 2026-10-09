// The Saw Bird's field-guide entry (its game is ../games/sawbird.js). Its
// name in the book isn't known; it is "the Saw Bird" until it is.
export default {
  id: 'sawbird',
  name: 'The Saw Bird',
  object: 'a handsaw',
  rhyme: ['Zip and zuzz, the Saw Bird sings', 'Its sawdust song of wooden things.', 'Long strokes, slow strokes, follow the chalk:', 'A wobbly saw makes a crooked walk!'],
  game: 'Saw It Straight',
  goal: 'Saw each plank along its chalk line with long, steady strokes, and keep the cut straight.',
  tips: ['Only long strokes cut: push all the way, then pull all the way.', 'Keep a steady rhythm and the saw speeds up.', 'The grain and the knots push the cut aside: tip the saw up or down to steer it back to the line.', 'A dead-straight cut scores 10; a crooked one only 1.'],
  score: 'points',
  controls: [['Saw', 'Long strokes left and right', 'Drag the saw back and forth'], ['Steer the cut', 'Up and down']],
  pass: 30,
  tune: 'play',
  color: '#c9a070',
};
