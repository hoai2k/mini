// Open-world text for the woods region (merged into js/text_config.js when the open world is finished).
export default {
  waystones: {
    woods_creek: 'The Creek',
    woods_fist: 'Zeus’s Fist',
    woods_bunker: 'Bunker 9',
    woods_south: 'The Old Border Post',
  },
  places: {
    woods_bunker9: 'Bunker 9',
    woods_fist: 'Zeus’s Fist',
    woods_juniper: 'Juniper’s Tree',
    woods_mushrooms: 'The Mushroom Ring',
    woods_logs: 'The Hollow Logs',
    woods_hollow: 'Shadowfang’s Hollow',
    woods_border_post: 'The Old Border Post',
  },
  people: {
    woods_juniper: 'Juniper',
    woods_beckendorf: 'Charles Beckendorf',
  },
  champions: {
    woods_shadowfang: { name: 'Shadowfang' },
  },
  shrines: {
    woods_artemis: 'Shrine of Artemis',
  },
  sq: {
    woods_web_trouble: {
      title: 'Bad Neighbours',
      offer: [
        'Oh! You made me jump. Sorry. I’m Juniper. This is my tree. Isn’t she lovely?',
        'Spiders keep spinning webs in my branches, and it tickles, and not the good kind. Could you chase off eight of them?',
      ],
      steps: ['Beat spiders in the woods: {n}/{count}', 'Tell Juniper her branches are clear'],
      thanks: [
        'My needles feel so much lighter! Thank you, thank you.',
        'If you see a satyr with a reed pipe and a tin can habit, tell him Juniper says hi. Actually, tell him twice.',
      ],
    },
    woods_silver_acorns: {
      title: 'Silver Acorns',
      offer: [
        'The dryads of the woods keep silver acorns for the spring planting. A storm scattered them.',
        'Five of them. One by the mushroom ring, one near the rope bridge, one by the hollow logs, one up on the Hunters’ lookout and one in the marsh.',
        'Please be gentle. Acorns are babies, basically.',
      ],
      steps: ['Find the silver acorns: {n}/{count}', 'Bring the acorns back to Juniper'],
      thanks: [
        'Every single one! The other dryads will be so jealous of me. In a nice way.',
      ],
    },
    woods_shadowfang: {
      title: 'The Hound in the Hollow',
      offer: [
        'There’s something I haven’t told anyone. A hellhound lives in the burnt hollow to the east. A big one, with a broken collar.',
        'The trees near it are all dead. It burned them. The others call it Shadowfang. Please, please stop it before it reaches my tree.',
      ],
      steps: ['Find Shadowfang’s Hollow', 'Beat Shadowfang', 'Go back to Juniper'],
      thanks: [
        'You did it. The woods feel quieter already. Listen. You can hear birds again.',
        'Take this. A gift from all of us who live in trees. We don’t give many.',
      ],
    },
    woods_bronze_scrap: {
      title: 'Bronze Scrap',
      offer: [
        'Hey. Beckendorf, Hephaestus cabin. Welcome to Bunker 9. Don’t touch the dragon.',
        'I’m short on celestial bronze. There are scraps lying round the woods: by the waterfall, by Zeus’s Fist, in the spider thicket and down at the old border post.',
        'Four pieces. They glow. You can’t miss them. Well, you can. People do.',
      ],
      steps: ['Collect bronze scraps: {n}/{count}', 'Bring the scraps to Beckendorf'],
      thanks: [
        'Good bronze. Really good. This’ll make a whole leg.',
        'Of what? You’ll see. Maybe. Here, for your trouble.',
      ],
    },
    woods_fist_door: {
      title: 'The Door in the Fist',
      offer: [
        'Weird thing. Zeus’s Fist, that big pile of rocks to the south-east. There’s a gap at its base, behind a boulder.',
        'I think there’s a door in there with a Greek Delta on it. That’s Daedalus’s mark. Go take a look, and grab whatever’s inside before something else does.',
      ],
      steps: ['Find the hidden way into Zeus’s Fist', 'Open the chest inside the Fist', 'Tell Beckendorf what you saw'],
      thanks: [
        'A Delta. Glowing. I knew it.',
        'Don’t go through that door. Not yet. Some doors you only open when you’re ready. Keep the loot, though.',
      ],
    },
    woods_border_patrol: {
      title: 'Border Patrol',
      offer: [
        'Monsters are getting bold. There’s a dracaena camp at the old border post by the Labyrinth road, and pups nesting in the hollow logs.',
        'Clear them both. Then go to Artemis’s shrine in the moonlit glade and win her trial. The Hunters say it keeps the woods in balance.',
      ],
      steps: ['Clear the camp at the Old Border Post', 'Clear the den in the Hollow Logs', 'Win the trial at the Shrine of Artemis', 'Report to Beckendorf'],
      thanks: [
        'That’s the whole woods safe. For a week, anyway. This is camp.',
        'I made this for you. It’s not a dragon. It’s better. Okay, it’s not better than a dragon.',
      ],
    },
  },
};
