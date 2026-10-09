// The Glove Dove: Slippery Dishes. Its game is ../games/glovedove.js.
export default {
  id: 'glovedove',
  name: 'The Glove Dove',
  object: 'a rubber glove',
  rhyme: ['A long pink glove with a dove’s pink head', 'Has washed the plates and the cups, it said.', 'But wet things slip! So, quick as a wink,', 'It flicks them up from the soapy sink.'],
  game: 'Slippery Dishes',
  goal: 'Run under the slippery dishes and flick each one up and along into the plate rack.',
  tips: ['Watch the ring on the counter: that is where the dish comes down.', 'Press just as the dish lands on the glove for a “Hup!”: high, long, and off to the rack.', 'Press too soon and it only hops; don’t press and it bounces once, then slips off.', 'Heavy pans fly lower. A dish that falls back in the sink pops up again.'],
  score: 'points',
  controls: [['Run along the counter', 'move', 'Drag to run under the dishes; tap as one lands to flick it'], ['Flick a dish up (Hup!)', 'action']],
  pass: 35,
  tune: 'play',
  color: '#e8a0b0',
};
