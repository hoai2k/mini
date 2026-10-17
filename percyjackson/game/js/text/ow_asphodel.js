// Open-world text for the asphodel region (merged into js/text_config.js when the open world is finished).
export default {
  waystones: {
    asphodel_ferry: 'Charon’s Landing',
    asphodel_gate: 'The Gates of Erebus',
    asphodel_hill: 'Sisyphus’s Hill',
    asphodel_barrow: 'The Barrow Road',
  },
  places: {
    asphodel_landing: 'Charon’s Landing',
    asphodel_judgment: 'The Judgment Pavilion',
    asphodel_barrow: 'The Pale King’s Barrow',
    asphodel_erebus: 'The Gates of Erebus',
    asphodel_sisyphus: 'Sisyphus’s Hill',
    asphodel_mausoleum: 'The Poplar Mausoleum',
    asphodel_lethe: 'The Pool of Lethe',
  },
  people: {
    asphodel_charon: 'Charon',
    asphodel_sisyphus: 'Sisyphus',
  },
  champions: {
    asphodel_pale_king: { name: 'The Pale King' },
  },
  shrines: {
    asphodel_hades: 'Shrine of Hades',
  },
  sq: {
    asphodel_charon_fares: {
      title: 'Fares, Please',
      offer: [
        'Ah. Living ones. You smell of sunscreen and hope. Disgusting.',
        'The dead are supposed to pay me one golden drachma for the crossing. Five of them dropped theirs in the ash on the way here. FIVE.',
        'Find my fares. Do not spend them. I will know.',
      ],
      steps: ['Pick up the lost drachmas ({n}/{count})', 'Bring the fares back to Charon'],
      thanks: [
        'One, two, three, four, five. Lovely. Gold never goes out of style.',
        'Here. A tip. Don’t tell anyone I tipped. I have a reputation.',
      ],
    },
    asphodel_charon_shades: {
      title: 'Crowd Control',
      offer: [
        'The shades are getting rowdy. Pushing in the line. One of them tried to swim the Styx. Nobody swims the Styx.',
        'And a gang of them has moved into the old mausoleum in the poplars, scaring the nice, quiet dead.',
        'Thin them out. Politely, if possible. Impolitely is also fine.',
      ],
      steps: ['Settle the restless shades ({n}/{count})', 'Clear out the Poplar Mausoleum', 'Tell Charon the line is quiet'],
      thanks: [
        'Silence. Beautiful, beautiful silence.',
        'You know, I have not had a quiet shift in four thousand years. I may actually put my feet up.',
      ],
    },
    asphodel_charon_raise: {
      title: 'A Modest Raise',
      offer: [
        'I have been rowing this boat since before your gods had gods. Do you know what Lord Hades pays me? The same as in the Bronze Age.',
        'Win his favour at his shrine, then take my request to the Gates of Erebus. Somebody important always reads the post there.',
        'Do this, and I will look kindly on you. Professionally speaking.',
      ],
      steps: ['Win the trial at the Shrine of Hades', 'Deliver Charon’s request to the Gates of Erebus', 'Go back to Charon'],
      thanks: [
        'Delivered? Excellent. I shall buy a new suit. Italian silk. Maybe two.',
        'Take this. And if you ever do die, come to my line. I’ll let you skip.',
      ],
    },
    asphodel_sisyphus_wedges: {
      title: 'Just a Little Wedge',
      offer: [
        'Oh! Hello! Sorry, can’t stop. Well, I can stop. The rock just rolls back down when I do.',
        'Here’s my idea. Three good flat stones, wedged under it at the top, and it stays. Simple! Nobody has ever thought of this!',
        'Find me three wedge stones, then check the top of the hill is clear. I’ll be right here. Always. Forever.',
      ],
      steps: ['Find wedge stones ({n}/{count})', 'Climb to the top of the hill and set the wedges', 'Tell Sisyphus the wedges are in place'],
      thanks: [
        'They’re in? They’re IN! This is the best day of my aft—',
        '…and there it goes. Rolling. Past me. Ha. Well. It was a very good wedge. Thank you, truly.',
      ],
    },
    asphodel_sisyphus_furies: {
      title: 'Somebody Keeps Kicking It',
      offer: [
        'Between you and me, the rock doesn’t always roll down by itself.',
        'The Furies nest on the old columns over the river. They swoop down and give it a little nudge. Then they laugh. Cackle, really.',
        'Would you go and have a word? With your swords?',
      ],
      steps: ['Clear the Furies’ roost across the Styx', 'Drive off the Furies ({n}/{count})', 'Go back to Sisyphus'],
      thanks: [
        'No cackling! I pushed all morning and heard no cackling at all!',
        'It still rolled down, of course. But it rolled down peacefully.',
      ],
    },
    asphodel_sisyphus_king: {
      title: 'The King Under the Hill',
      offer: [
        'I was a king once, you know. Very clever. Too clever. I tricked Death himself. That’s how I got this job.',
        'There’s another king out here: the Pale King, in the barrow by the river. He waves his black sword at anyone who passes, and he keeps the treasure of his whole kingdom down in his tomb.',
        'Beat him, open his hoard, and come and tell me about it. I could do with a story that ends well.',
      ],
      steps: ['Defeat the Pale King on his barrow', 'Open the Pale King’s hoard in the chamber below', 'Tell Sisyphus the story'],
      thanks: [
        'You beat him? And the gold was real? Ha! Sit down, sit down, tell me all of it.',
        'You know, that was the first story I’ve heard in a thousand years that didn’t end with a rock. Take this. You earned it.',
      ],
    },
  },
};
