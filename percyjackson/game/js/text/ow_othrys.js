// Open-world text for the othrys region (merged into js/text_config.js when the open world is finished).
export default {
  waystones: {
    othrys_pass: 'Titan’s Pass',
    othrys_hollow: 'The Hunters’ Hollow',
    othrys_summit: 'The Black Summit',
    othrys_forge: 'The Cyclops Forge',
  },
  places: {
    oth_pass: 'Titan’s Pass',
    oth_bridge: 'The Chasm Bridge',
    oth_hollow: 'The Hunters’ Hollow',
    oth_crag: 'Zeus’s Crag',
    oth_forge: 'The Cyclops Forge',
    oth_face: 'Kronos’s Fallen Face',
    oth_fortress: 'The Palace of the Titans',
  },
  people: {
    bianca: 'Bianca di Angelo',
    zoe: 'Zoë Nightshade',
  },
  champions: {
    oth_gorgos: { name: 'Gorgos the Cyclops Chief' },
  },
  shrines: {
    oth_zeus_shrine: 'Shrine of Zeus',
  },
  sq: {
    othrys_bianca_harpies: {
      title: 'Feathers on the Road',
      offer: [
        'Hi. I’m Bianca. I only joined the Hunters a little while ago, so they gave me the job of watching the road. Lucky me.',
        'Harpies keep diving at anyone who walks up to the pass. And they’ve made a camp up there, with a smelly totem and everything.',
        'Could you chase them off? I’d help, but my aim is still… let’s say “creative”.',
      ],
      steps: ['Beat harpies on Mount Othrys ({n}/{count})', 'Clear the camp at Titan’s Pass', 'Tell Bianca the road is safe'],
      thanks: [
        'You did it! The road’s quiet. It’s almost peaceful. Almost.',
        'Here. Lady Artemis says a good hunter shares the catch.',
      ],
    },
    othrys_bianca_figures: {
      title: 'Figures for Nico',
      offer: [
        'Can I tell you a secret? My little brother Nico is obsessed with Mythomagic. Cards, figures, all of it.',
        'The Cyclopes down at their forge have a pile of junk, and I’m sure I saw some little figures in it.',
        'I know, I know. Never take things from a monster’s junk heap. But it’s for Nico. Could you grab three?',
      ],
      steps: ['Find Mythomagic figures in the forge’s junk ({n}/{count})', 'Bring the figures to Bianca'],
      thanks: [
        'A Hades figure! He doesn’t have this one! He’s going to go completely nuts.',
        'Thank you. Really. Here, I don’t need this half as much as you do.',
      ],
    },
    othrys_bianca_gorgos: {
      title: 'The Chief on the Junk Throne',
      offer: [
        'Uh-oh. The Cyclopes noticed their figures were missing. Their chief, Gorgos, is furious.',
        'He sits on a throne made of old cars past the forge, waving a whole tree around and shouting.',
        'If he comes up here, the Hunters will have to fight him anyway. Better you get there first?',
      ],
      steps: ['Find Gorgos’s junk throne', 'Defeat Gorgos the Cyclops Chief', 'Go back to Bianca'],
      thanks: [
        'You beat Gorgos?! With a tree swinging at your head and everything?',
        'Okay. When Zoë asks who the bravest camper is, I’m saying you. Take this.',
      ],
    },
    othrys_zoe_hounds: {
      title: 'Hounds of the Mountain',
      offer: [
        'Thou art one of Chiron’s campers. I am Zoë Nightshade, lieutenant of Artemis. Do not touch the tents.',
        'Hellhounds prowl these slopes at night. They have been sniffing at our hollow.',
        'Hunt them. Six will teach the rest some manners.',
      ],
      steps: ['Hunt hellhounds on Mount Othrys ({n}/{count})', 'Report back to Zoë'],
      thanks: [
        'Hmm. Thou didst well. For a boy. Or a girl who has not yet joined the Hunt.',
        'Take this. And wash. Thou smellest of hound.',
      ],
    },
    othrys_zoe_arrows: {
      title: 'Silver Arrows',
      offer: [
        'In the storm last night, a quiver of our silver arrows was torn from a Hunter’s back.',
        'Four arrows lie scattered on the slopes. The quiver itself fell into the great chasm by the bridge.',
        'Bring the arrows, and open whatever lies at the bottom. A silver arrow does not belong in the dirt.',
      ],
      steps: ['Find the silver arrows on the slopes ({n}/{count})', 'Climb down into the chasm and open the chest there', 'Bring the arrows to Zoë'],
      thanks: [
        'All four, and straight still. Thou hast sharp eyes.',
        'Perhaps thou art not so useless as most heroes. Perhaps.',
      ],
    },
    othrys_zoe_palace: {
      title: 'The Black Summit',
      offer: [
        'Atop this mountain lie the ruins of the Titans’ palace. My father’s kind once ruled the world from there.',
        'Something stirs among the broken thrones. Before thou goest, ask Zeus for his blessing at the crag.',
        'Then climb, and clear the palace. I will not have monsters gathering above my Hunters’ heads.',
      ],
      steps: ['Win the trial at the Shrine of Zeus', 'Clear the monsters in the Titans’ palace', 'Return to Zoë in the hollow'],
      thanks: [
        'So the palace is quiet again. Good. Let it stay broken.',
        'Thou hast done the Hunt a service. Take this, with the thanks of Artemis. And mine.',
      ],
    },
  },
};
