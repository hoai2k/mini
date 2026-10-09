// The Milkbottle Midge: its field-guide entry. Its game is ../games/milkmidge.js.
export default {
  id: 'milkmidge',
  name: 'The Milkbottle Midge',
  object: 'a milk bottle',
  rhyme: ['The float hums out at break of day;', 'The Midge lobs pints along the way.', 'One on each step, and not a drop', 'To wake the dogs: plop, plop, plop!'],
  game: 'Milk Round',
  goal: 'Hold to wind up and let go to lob a pint of milk onto each doorstep as the float rolls by.',
  tips: [
    'Hold longer to throw further up the garden path: the dotted ring shows where the bottle will land.',
    'Start winding up before you reach the house, and let go when the ring is on the step.',
    'A smashed bottle costs a pint, and a smash beside a sleeping dog wakes it and costs more.',
    'A "No milk" card on the door means none today: a bottle there comes back.',
  ],
  score: 'pints',
  controls: [['Wind up and throw (hold, then let go)', 'action']],
  pass: 9,
  tune: 'play',
  color: '#c9d9e0',
};
