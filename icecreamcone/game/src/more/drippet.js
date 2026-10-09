// The Drippet's field-guide entry (its game is ../games/drippet.js).
export default {
  id: 'drippet',
  name: 'The Drippet',
  object: 'a water tap',
  rhyme: ['Drip and drop goes the Drippet’s spout,', 'Wherever it runs, the water comes out.', 'Give the thirsty things a drink,', 'But mind the puddles: slip! Don’t sink!'],
  game: 'Drip Drop Dash',
  goal: 'Run to each thirsty thing and stand over it until it’s full, without skidding in your own puddles.',
  tips: ['A brand-new drip is safe; a puddle that has sat a moment is slippery.', 'Press the action to hop over a puddle.', 'Every hop lands with a splash, so don’t hop all the time.', 'Running fast spreads your drips out; dawdling makes a big puddle.'],
  score: 'drinks',
  controls: [['Run', 'move'], ['Hop over a puddle', 'action']],
  pass: 10,
  tune: 'play',
  color: '#8ab0d0',
};
