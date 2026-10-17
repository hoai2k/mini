// Open-world text for the fields region (merged into js/text_config.js when the open world is finished).
export default {
  waystones: {
    fields_crossroads: 'Farm Crossroads',
    fields_orchard: 'The Orchard',
    fields_millpond: 'Mill Pond',
  },
  places: {
    fields_berry_beds: 'The Strawberry Beds',
    fields_windmill: 'The Old Windmill',
    fields_red_barn: 'The Big Red Barn',
    fields_ruined_barn: 'The Burnt Barn',
    fields_mill_pond: 'Mill Pond Farm',
    fields_pumpkins: 'The Pumpkin Patch',
    fields_roost: 'Bronzebeak’s Roost',
  },
  people: {
    fields_katie: 'Katie Gardner',
    fields_travis: 'Travis Stoll',
  },
  champions: {
    fields_bronzebeak: { name: 'Bronzebeak' },
  },
  shrines: {
    fields_demeter: 'Shrine of Demeter',
  },
  sq: {
    fields_berry_thieves: {
      title: 'Berry Thieves',
      offer: [
        'Oh, good, a hero. Something is eating our strawberries. Something with very small teeth and very big appetites.',
        'Rats. Monster rats, from the pumpkin patch. Chase six of them off the farm and I’ll owe you one.',
      ],
      steps: ['Beat rats in the fields: {n}/{count}', 'Tell Katie the berries are safe'],
      thanks: [
        'Six rats! The beds can breathe again.',
        'Take this, and a strawberry. Don’t tell Mr. D. He thinks they’re all for the business.',
      ],
    },
    fields_seed_packets: {
      title: 'Gone With the Wind',
      offer: [
        'A wind came through last night. Not a normal wind. It smelled like bird. It blew my seed packets all over the farm.',
        'There are five. Look in the pumpkin patch, by the burnt barn, up the windmill hill, round the mill pond and in the orchard. They glow a bit. Demeter seeds do that.',
      ],
      steps: ['Find Katie’s seed packets: {n}/{count}', 'Bring the seeds back to Katie'],
      thanks: [
        'All five! Not even a nibble on them.',
        'My mom would be proud. Well. She’d say “more cereal”, but that’s how she shows it.',
      ],
    },
    fields_demeter_blessing: {
      title: 'A Blessing for the Harvest',
      offer: [
        'Hellhound pups have moved into the old burnt barn. They keep trampling the wheat on their way to the shrine.',
        'Clear them out, then go to Demeter’s shrine in the wheat field and win its trial. If she sees the field defended, she’ll bless the harvest.',
      ],
      steps: ['Clear the monsters out of the Burnt Barn', 'Win the trial at the Shrine of Demeter', 'Go back to Katie'],
      thanks: [
        'Can you smell that? Fresh bread. That means she’s happy.',
        'You’re welcome at the farm any time. Bring your own basket.',
      ],
    },
    fields_stoll_stash: {
      title: 'Totally Not Stolen',
      offer: [
        'Hey! Hey, you. Psst. You look trustworthy. Ish.',
        'My brother Connor and I hid a few… totally legal snacks round the farm. Four bags. Then we forgot where. One’s probably in a scarecrow.',
        'Oh, and our big stash is in a chest on the roof of the red barn. You can climb the hay. Don’t ask why we put it there.',
      ],
      steps: ['Find the Stolls’ hidden bags: {n}/{count}', 'Open the chest on the barn roof', 'Bring it all back to Travis'],
      thanks: [
        'You found them! And you only ate… none? Wow. Okay. You’re a better person than me.',
        'Here, have a cut. Hermes cabin rules: finders get paid.',
      ],
    },
    fields_bird_trouble: {
      title: 'Bird Brains',
      offer: [
        'So, funny story. While we were up on the barn roof, we saw birds. Big ones. Bronze ones.',
        'They’re wrecking Katie’s beehives in the orchard. If she finds out we saw and didn’t say anything, she’ll grow vines in our bunks. Again.',
        'Clear the hives and knock four of those birds out of the sky? Please?',
      ],
      steps: ['Clear the monsters at the hives', 'Beat Stymphalian birds in the fields: {n}/{count}', 'Report back to Travis'],
      thanks: [
        'Feathers everywhere! Katie will never know. Well, she’ll know. But she’ll know it was you.',
      ],
    },
    fields_bronzebeak: {
      title: 'The Big One',
      offer: [
        'Okay, the bad news. Those birds have a boss. Bronzebeak. Huge. Razor feathers. Nests on the rock east of Mill Pond Farm.',
        'The good news is it’s not my problem. It’s your problem! Kidding. Mostly. Go find the roost.',
      ],
      steps: ['Find Bronzebeak’s Roost', 'Beat Bronzebeak', 'Tell Travis you did it'],
      thanks: [
        'No way. NO WAY. Connor is going to be so jealous.',
        'I was going to sell you this, but… take it. For free. Don’t tell anybody I said “free”.',
      ],
    },
  },
};
