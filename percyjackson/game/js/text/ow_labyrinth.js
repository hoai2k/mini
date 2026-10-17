// Open-world text for the labyrinth region (merged into js/text_config.js when the open world is finished).
export default {
  waystones: {
    labyrinth_gate: 'The Maze Gate',
    labyrinth_court: 'The Sunken Courtyard',
    labyrinth_workshop: 'Daedalus’s Workshop',
  },
  places: {
    lab_gate: 'The Maze Gate',
    lab_heart: 'The Heart of the Maze',
    lab_court: 'The Sunken Courtyard',
    lab_halls: 'The Webbed Halls',
    lab_colonnade: 'The Fallen Colonnade',
    lab_pit: 'The Bottomless Pit',
    lab_workshop: 'Daedalus’s Workshop',
  },
  people: {
    rachel: 'Rachel Elizabeth Dare',
    quintus: 'Quintus',
  },
  champions: {
    lab_bronze_warden: { name: 'The Bronze Warden' },
  },
  shrines: {
    lab_athena_shrine: 'Shrine of Athena',
  },
  sq: {
    labyrinth_rachel_pages: {
      title: 'Lost in the Margins',
      offer: [
        'Oh good, a demigod. I’m Rachel. I can see through the Mist, which mostly means I see things I’d rather not.',
        'I was drawing the maze when a bronze thing with too many legs chased me. My sketchbook exploded. Pages everywhere.',
        'Four of them blew into the maze. Could you get them back? Some of those drawings are of the way through.',
      ],
      steps: ['Find Rachel’s sketch pages in the maze ({n}/{count})', 'Bring the pages back to Rachel'],
      thanks: [
        'You found them! And you only look a little bit lost.',
        'See this one? I drew it before I’d even been in there. That’s… not normal, is it. Don’t answer that.',
      ],
    },
    labyrinth_rachel_owl: {
      title: 'The Owl in the Courtyard',
      offer: [
        'In one of my pages there’s an owl, sitting over an old fountain. West of here, sunk into the ground.',
        'An owl means Athena. Athena means a test. A test means monsters. I hate this job and I don’t even have it.',
        'Go and win the shrine’s trial. If Athena’s watching, maybe the maze will stop moving its walls on us.',
      ],
      steps: ['Go to the Sunken Courtyard', 'Win the trial at the Shrine of Athena', 'Tell Rachel how it went'],
      thanks: [
        'The walls did stop shifting! Well, mostly. One of them winked at me.',
        'Thank you. Take this. I found it in a hedge, which is a weird place for armour to be.',
      ],
    },
    labyrinth_rachel_webs: {
      title: 'Something in the Webs',
      offer: [
        'Last page. It’s a hall full of webs, south-west, up on the hill. I drew a lot of legs. Like, a LOT of legs.',
        'Whatever lives there keeps dragging people’s stuff inside. Campers have stopped coming this way.',
        'Clear it out? I’ll be right here. Drawing. Bravely.',
      ],
      steps: ['Beat spiders in the Labyrinth ({n}/{count})', 'Clear the nest in the Webbed Halls', 'Go back to Rachel'],
      thanks: [
        'You did it! You also have web in your hair. Hold still. No, the other side.',
        'Here. For the hero who walked into the leg hall so I didn’t have to.',
      ],
    },
    labyrinth_quintus_gears: {
      title: 'Spare Parts',
      offer: [
        'Ah. A visitor who doesn’t clank. Refreshing.',
        'I am Quintus. I… repair things. The bronze guards that wander this maze have gone wrong, and they keep the best gears to themselves.',
        'Break a few of them, and bring me three gears they dropped. Mind the edges. They are sharper than they look.',
      ],
      steps: ['Beat automatons in the Labyrinth ({n}/{count})', 'Pick up loose bronze gears ({n}/{count})', 'Bring the gears to Quintus'],
      thanks: [
        'Fine work. Perfectly fine. Whoever made these knew what he was doing. Mostly.',
        'Take this for your trouble. And do not ask me how I know where every gear goes.',
      ],
    },
    labyrinth_quintus_warden: {
      title: 'The Warden Won’t Stop',
      offer: [
        'In the heart of the maze stands the Bronze Warden. It was built to keep monsters out.',
        'Now it keeps everyone out. Its eye still burns blue. It has forgotten what it was for.',
        'Put it to rest, please. Be quick: it hits like a falling column, because it was built from one.',
      ],
      steps: ['Find your way to the heart of the maze', 'Defeat the Bronze Warden', 'Tell Quintus the Warden is still'],
      thanks: [
        'So it is done. Good. It was a fine machine. It deserved better than to rust in a circle.',
        '…What? No, I did not build it. I simply admire the work. Very much. Here, take this.',
      ],
    },
    labyrinth_quintus_vault: {
      title: 'Wings of Bronze',
      offer: [
        'You have earned a secret. Below this floor there is a vault. I sealed it. Er, someone sealed it.',
        'The only way down is through the pit east of the maze, and something has made a camp on its lip.',
        'Clear them, get into the vault, and take what is in the chest. I have no use for it now. I have had enough of flying.',
      ],
      steps: ['Clear the camp by the Bottomless Pit', 'Open the chest in the vault under the workshop', 'Return to Quintus'],
      thanks: [
        'You found the vault. Then you saw the Delta on its wall.',
        'Some names are heavy, young hero. Let us both keep this one to ourselves. Go well.',
      ],
    },
  },
};
