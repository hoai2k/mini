// Open-world text for the canyon region (merged into js/text_config.js when the open world is finished).
export default {
  waystones: {
    canyon_wash: 'Dry Wash',
    canyon_mesa: 'High Mesa',
    canyon_town: 'Tumbleweed Gulch',
  },
  places: {
    canyon_den: 'The Red King’s Den',
    canyon_hunters: 'Hunters’ Mesa',
    canyon_town: 'Tumbleweed Gulch',
    canyon_slot: 'The Snake Slot',
    canyon_garden: 'Aunty Em’s Garden of Stone',
    canyon_spires: 'The Hoodoos',
    canyon_arch: 'The Sun Arch',
  },
  people: {
    canyon_hedge: 'Coach Hedge',
    canyon_phoebe: 'Phoebe the Hunter',
  },
  champions: {
    canyon_red_king: { name: 'The Red King' },
  },
  shrines: {
    canyon_apollo: 'Shrine of Apollo',
  },
  sq: {
    canyon_cardio: {
      title: 'Desert Cardio',
      offer: [
        'HEY! You! Cupcake! Yeah, you with the sword!',
        'This canyon is CRAWLING with scorpions and you look like you skipped leg day.',
        'Ten scorpions. Go! Hustle! I’ll time you!',
      ],
      steps: ['Beat scorpions in the canyon ({n}/{count})', 'Report back to Coach Hedge'],
      thanks: ['Not bad, cupcake! Not great! But not bad!', 'Here. Champions need gear. And protein.'],
    },
    canyon_cans: {
      title: 'Snack Run',
      offer: [
        'Okay, confession. I came out here for the snacks.',
        'This old town is full of tin cans. Delicious, crunchy tin cans. But a bunch of creepy monsters moved into the street.',
        'Clear them out, then bring me five cans. The rusty ones are the tastiest!',
      ],
      steps: ['Clear the monsters out of Tumbleweed Gulch', 'Find tin cans for the coach ({n}/{count})', 'Bring the cans to Coach Hedge'],
      thanks: ['*CRUNCH* Ohhh, that’s the stuff. Vintage!', 'You’ve earned this. Don’t tell the other satyrs about my can stash.'],
    },
    canyon_king: {
      title: 'The Red King',
      offer: [
        'Now for the main event! There’s a scorpion out here the size of a pickup truck. Red as a fire hydrant. Gold stinger.',
        'Calls himself the Red King. In his den under the north-west mesa. Kids, I hate royalty.',
        'Clear his guards outside, then go in there and show him who’s boss. I’d come, but... my hooves are tired.',
      ],
      steps: ['Clear the scorpions outside the den', 'Defeat the Red King in his den', 'Tell Coach Hedge'],
      thanks: ['YEAH! THAT’S WHAT I’M TALKING ABOUT! *blows whistle very loudly*', 'Best student I ever had. Don’t let it go to your head. Okay, let it go a little bit.'],
    },
    canyon_arrows: {
      title: 'Silver Arrows',
      offer: [
        'Hold. You’re a half-blood? Then you may stay. Briefly.',
        'We Hunters chased a flock of monster birds through this canyon, and some of our silver arrows fell where they fell.',
        'Gather five of them. They shine in the sun. Try the rocks and the dry river.',
      ],
      steps: ['Find the Hunters’ silver arrows ({n}/{count})', 'Bring the arrows to Phoebe'],
      thanks: ['All five, and not a single one bent. Well done.', 'You are useful, for a camper. Take this.'],
    },
    canyon_garden: {
      title: 'The Garden of Stone',
      offer: [
        'South of Split Rock there is a garden full of statues. The statues are people. Medusa’s work, from long ago.',
        'Now some of the statues have started to walk. That should not happen. Even here.',
        'Break the walking statues, then open the chest by the fountain. One of our sisters hid something there.',
      ],
      steps: ['Clear the walking statues in the Garden of Stone', 'Open the chest by the fountain', 'Go back to Phoebe'],
      thanks: ['The garden is quiet again. Good.', 'Keep what you found. Our sister would want it used, not hidden.'],
    },
    canyon_sun: {
      title: 'The Sun on the Butte',
      offer: [
        'Lady Artemis asks a favour of her brother’s shrine. I cannot believe I am saying that out loud.',
        'Win the trial at Apollo’s shrine on the butte. Then go through the Snake Slot in Split Rock. Something waits in the middle.',
        'And do NOT tell Apollo we asked. He will write a poem about it.',
      ],
      steps: ['Win the trial at the Shrine of Apollo', 'Find the chest in the Snake Slot', 'Go back to Phoebe'],
      thanks: ['The sun shines on you, it seems. Do not let him know I said so.', 'You have the heart of a Hunter. Take this, and our thanks.'],
    },
  },
};
