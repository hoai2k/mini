// Open-world text for the camp region (merged into js/text_config.js when the open world is finished).
export default {
  people: {
    camp_clarisse: 'Clarisse La Rue',
    camp_argus: 'Argus',
    camp_silena: 'Silena Beauregard',
  },
  sq: {
    camp_clarisse_warmup: {
      title: 'Warm-Up Laps',
      offer: [
        'You. Yeah, you. You look soft. Camp makes everybody soft.',
        'There are monsters wandering round the Strawberry Fields like they own the place. Go and knock down ten of them.',
        'Call it a warm-up. If you can’t manage ten, don’t bother coming back.',
      ],
      steps: ['Beat monsters in the Strawberry Fields ({n}/{count})', 'Report to Clarisse at the arena'],
      thanks: [
        'Ten? Huh. Not bad. For a beginner.',
        'Don’t let it go to your head. Your head’s big enough already.',
      ],
    },
    camp_clarisse_scorpions: {
      title: 'Stingers for the Trophy Wall',
      offer: [
        'Cabin Five has a trophy wall. There’s a gap on it. I hate gaps.',
        'Out east there’s a whole red desert crawling with giant scorpions. Go past the fields, into the canyon, and bring me six stingers’ worth of victories.',
        'And don’t get stung. If you get stung, it doesn’t count.',
      ],
      steps: ['Head east into the Red Canyon', 'Beat giant scorpions ({n}/{count})', 'Bring the stingers to Clarisse'],
      thanks: [
        'Six. Okay. Fine. That’s actually… fine.',
        'If anyone asks, I let you help me. Got it?',
      ],
    },
    camp_clarisse_hounds: {
      title: 'Hounds of the Underworld',
      offer: [
        'Okay, real talk. Way down south-east the ground goes grey and the Underworld leaks out. There’s a den of hellhounds there, living inside the bones of something huge.',
        'My dad says a real warrior clears that den. My dad says a lot of things.',
        'Go clear it. Then come back and tell me what it was like, so I can say I knew all along.',
      ],
      steps: ['Clear the hellhound den in the Fields of Asphodel', 'Beat hellhounds ({n}/{count})', 'Tell Clarisse you made it back'],
      thanks: [
        'You did it. You actually did it.',
        '…That’s great. That’s really great. Take this before I change my mind about liking you.',
      ],
    },
    camp_argus_shore: {
      title: 'A Hundred Eyes on the Shore',
      offer: [
        'Argus doesn’t speak. He points north, at the road over the hill, then at the eyes on his arm. Several of them blink, worried.',
        'He mimes something flapping and screeching. Harpies, on the North Shore, too close to the camp’s border.',
        'He holds up five fingers. Then he gives you a firm, hopeful thumbs up.',
      ],
      steps: ['Follow the road north to the North Shore', 'Chase off the harpies ({n}/{count})', 'Report back to Argus'],
      thanks: [
        'Argus nods slowly. All hundred of his eyes look pleased, which is a lot of pleased.',
        'He presses a reward into your hand and goes back to watching everything at once.',
      ],
    },
    camp_argus_othrys: {
      title: 'Something Watching from the Mountain',
      offer: [
        'Argus is staring north-east, hard, with every single eye. Even the one on the back of his neck.',
        'He points at the dark mountain on the horizon: Mount Othrys. He mimes a fortress, a crown, and then shivers.',
        'Someone up there is watching camp. He wants you to go up the cobbled road and make them think twice.',
      ],
      steps: ['Take the cobbled road up towards Mount Othrys', 'Beat the monsters on Othrys ({n}/{count})', 'Report back to Argus'],
      thanks: [
        'Argus checks the mountain. He checks it again. Then, for the first time today, some of his eyes close for a little rest.',
        'He hands you a reward and a very small, very serious salute.',
      ],
    },
    camp_silena_letters: {
      title: 'Lost Letters',
      offer: [
        'Oh gods, this is so embarrassing. I was writing letters, and the wind took them. All over camp.',
        'They’re… private. If the Hermes cabin finds them first, they’ll read them out at dinner. In voices.',
        'Could you find all four? Please? I’ll owe you forever. Well, a really long time.',
      ],
      steps: ['Find Silena’s letters around camp ({n}/{count})', 'Bring the letters back to Silena'],
      thanks: [
        'You found them all! And you didn’t read them. You didn’t, right? Right.',
        'You’re a hero. An actual one. Here, take this.',
      ],
    },
    camp_silena_mirror: {
      title: 'Bird Brained',
      offer: [
        'A Stymphalian bird swooped down and stole my mirror. My good one! They love shiny things.',
        'They nest out over the Strawberry Fields. If you knock a few out of the sky, one of them is bound to drop it.',
        'Watch out, their feathers are basically knives. Very rude birds.',
      ],
      steps: ['Bring down Stymphalian birds over the fields ({n}/{count})', 'Give Silena back her mirror'],
      thanks: [
        'My mirror! Not a scratch on it. Okay, one scratch. It’s fine. I love it anyway.',
        'You have bronze feathers in your hair, by the way. It’s a look.',
      ],
    },
    camp_silena_lethe: {
      title: 'A Drop of Forgetting',
      offer: [
        'Okay, so. Drew from my cabin read my diary. Out loud. To everyone.',
        'In the Fields of Asphodel there’s a pool of water from the River Lethe. One sip and you forget things. Just a drop in her hot chocolate and she’ll forget every word.',
        'Some empousai are having a picnic right next to it, though. Don’t eat anything they offer you. And do NOT drink the water yourself!',
      ],
      steps: ['Break up the empousai’s picnic by the Pool of Lethe', 'Fill a vial at the Pool of Lethe', 'Bring the vial to Silena (don’t drink it)'],
      thanks: [
        'You got it! And you remember who I am? Good. Very good.',
        'Actually… I think I’ll just talk to Drew instead. But I’ll keep this. Just in case. Thank you, really.',
      ],
    },
  },
};
