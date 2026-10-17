// Open-world text for the shore region (merged into js/text_config.js when the open world is finished).
export default {
  waystones: {
    shore_dunes: 'The Dunes',
    shore_lighthouse: 'Lighthouse Point',
    shore_cliffs: 'Gull Cliffs',
  },
  places: {
    shore_lighthouse: 'Lighthouse Point',
    shore_wreck: 'The Wreck of the Thalassa',
    shore_pools: 'Starfish Pools',
    shore_pier: 'The Old Pier',
    shore_caves: 'The Echo Caves',
    shore_roost: 'The Harpy Roost',
    shore_tower: 'The Old Watchtower',
  },
  people: {
    shore_nereid: 'Galene the Nereid',
    shore_lee: 'Lee Fletcher',
  },
  champions: {
    shore_queen_gale: { name: 'Queen Gale' },
  },
  shrines: {
    shore_poseidon: 'Shrine of Poseidon',
  },
  sq: {
    shore_pearls: {
      title: 'Pearls on the Sand',
      offer: [
        'Oh! A demigod! You smell like seaweed and bad decisions. I like you already.',
        'A storm broke my pearl necklace and scattered the pearls all over the beach. Five of them. Fish keep trying to eat them.',
        'Would you find them for me? Try the pools and along the sand.',
      ],
      steps: ['Find Galene’s pearls ({n}/{count})', 'Bring the pearls back to Galene'],
      thanks: ['All five! You are much more useful than a dolphin, and dolphins are VERY useful.', 'Here, a little something from the sea floor.'],
    },
    shore_wreck: {
      title: 'The Dead Crew',
      offer: [
        'See that old ship on the sand? The Thalassa. She sank three thousand years ago and washed up last Tuesday.',
        'Her crew of skeletons still think they are sailing her. They keep shouting at the seagulls.',
        'Send them to their rest, then look in the hold. The captain kept his treasure down there.',
      ],
      steps: ['Clear the skeleton crew from the wreck', 'Open the chest in the ship’s hold', 'Tell Galene the crew is gone'],
      thanks: ['The poor things. Now they can finally sleep.', 'Keep what you found. The captain won’t miss it. He is mostly bones.'],
    },
    shore_trident: {
      title: 'Poseidon’s Shrine',
      offer: [
        'The shrine of Poseidon in the dunes has gone quiet. Monsters keep coming to it, and the sea is grumpy about it.',
        'Thin out the bony ones first, then stand at the shrine and win its trial.',
        'Your father will notice. Probably. He is busy. But probably!',
      ],
      steps: ['Beat skeletons on the shore ({n}/{count})', 'Win the trial at the Shrine of Poseidon', 'Go back to Galene'],
      thanks: ['Do you hear that? The waves are laughing again.', 'The Lord of the Sea is pleased. Take this, with the ocean’s thanks.'],
    },
    shore_harpies: {
      title: 'Harpy Trouble',
      offer: [
        'Hey! Lee Fletcher, Apollo cabin. I came up here to practise archery and the harpies stole my sandwiches.',
        'All of them. Even the one with pickles, which nobody should want.',
        'Help me knock eight of them out of the sky?',
      ],
      steps: ['Beat harpies on the shore ({n}/{count})', 'Tell Lee at the lighthouse'],
      thanks: ['Nice shooting! Well, nice whacking. Same thing.', 'Here, you earned this. I’ll make more sandwiches.'],
    },
    shore_light: {
      title: 'Light the Lighthouse',
      offer: [
        'The lighthouse lamp has gone dark, and ships keep running onto the rocks. That’s how the Thalassa got there. Well, that and three thousand years.',
        'The lamp’s glass prisms got scattered. Harpies love shiny things. Find four of them.',
        'Then climb the stairs to the lamp room at the top and put them back.',
      ],
      steps: ['Find the lamp’s prisms ({n}/{count})', 'Climb to the lamp room at the top of the lighthouse', 'Tell Lee the light is back'],
      thanks: ['Look at it shine! My dad would call that “a pretty decent beam”. That’s high praise from the sun god.', 'Here. Every hero needs something shiny.'],
    },
    shore_queen: {
      title: 'The Queen of the Cliffs',
      offer: [
        'Now we know why the harpies are so bold. They have a queen: Queen Gale, up on the cliffs.',
        'She wears a crown of feathers and throws lightning. She also screams a lot. Like, a LOT.',
        'Break up her roost, then go and knock that crown off. I’ll cover you. From very far away.',
      ],
      steps: ['Clear the Harpy Roost on the cliffs', 'Defeat Queen Gale at her eyrie', 'Go back to Lee'],
      thanks: ['You beat Queen Gale! The whole cabin is going to hear about this.', 'Take this. The shore is safe again, mostly. Watch your sandwiches.'],
    },
  },
};
