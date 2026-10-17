// Story text: books, chapters, cutscenes, the opening and prologue, the quest
// start dialog, objectives, mission messages and Mrs. Dodds.
// (Merged into js/text_config.js at the end of the extraction.)
export default {
  // Cutscenes (subtitles, one line per shot)
  cutscenes: {
    ariaLabel: 'Cutscene',
    skip: { pad: 'Hold A to skip', touch: 'Hold the screen to skip', kbm: 'Hold Esc to skip' },
    waitingOthers: 'Waiting for the others…',
    waitingHost: 'Waiting for the host…',
    // Cutscene: the bus to the museum
    bus: {
      title: 'The field trip',
      fieldTrip: 'Yancy Academy’s field trip: twenty-eight kids, one yellow school bus, and New York in the morning.',
      groverOnBus: 'Grover sits next to you, chewing on an apple core. Nancy Bobofit throws bits of sandwich at his head.',
      museum: 'The American Museum of Natural History. Mr. Brunner promised Greek and Roman treasures.',
      steps: 'Everybody off. Up the steps, past the columns, toward the old marble and bronze.',
      dodds: 'And Mrs. Dodds, your pre-algebra teacher, is watching you, as if you have done something terrible.',
    },
    // Cutscene: summer at Montauk
    summer: {
      title: 'Summer, and a storm',
      cabin: 'Summer. Mom takes you to the cabin at Montauk, on the beach where she met your father.',
      knock: 'In the middle of the night, in a storm, someone bangs on the door. Grover. He has no trousers on. He has hooves.',
      drive: '“Something is following us!” Mom drives the old Camaro into the storm, as fast as it will go.',
      lightning: 'Toward a hill on Long Island, and a great pine tree at the top. Then the lightning hits.',
    },
    // Cutscene: waking at the Big House
    wake: {
      title: 'Camp Half-Blood',
      porch: 'You wake up on a porch, in the sun. Somebody is spooning something into your mouth. It tastes like your mom’s cookies.',
      annabeth: '“You drool when you sleep,” says a girl with curly blond hair and storm-grey eyes. Her name is Annabeth.',
      chiron: 'And Mr. Brunner, your Latin teacher, trots over on four white legs. He is half horse. “Call me Chiron,” he says.',
      welcome: 'Welcome to Camp Half-Blood: the one place in the world where kids like you are safe.',
    },
  },

  // Books (chapter map, prophecy scroll)
  books: {
    book1: { title: 'The Lightning Thief',
      prophecy: [
        'You shall go west, and face the god who has turned,',
        'You shall find what was stolen, and see it safely returned.',
        'You shall be betrayed by one who calls you a friend,',
        'And you shall fail to save what matters most, in the end.',
      ] },
    book2: { title: 'The Sea of Monsters' },
    book3: { title: 'The Titan\'s Curse' },
    book4: { title: 'The Battle of the Labyrinth' },
    book5: { title: 'The Last Olympian' },
  },

  // Chapters: title, place, HUD objective, card text before and after
  chapters: {
    // Chapter 1: The Pre-Algebra Teacher
    lt1: {
      title: 'The Pre-Algebra Teacher',
      place: 'The museum, on a field trip',
      objective: 'Follow Mrs. Dodds through the galleries',
      startPlace: 'the field-trip bus by the camp road',
      intro: [
        'Look, I didn’t want to be a half-blood.',
        'In the Greek and Roman galleries, Mrs. Dodds wants a word with you. Alone.',
        'Something about her is wrong, and the Mist hides what she really is.',
      ],
      outro: 'Mrs. Dodds bursts into yellow dust. Nobody else remembers her. “Mrs. Dodds? There is no Mrs. Dodds.”',
    },
    // Chapter 2: Half-Blood Hill
    lt2: {
      title: 'Half-Blood Hill',
      place: 'Long Island, in a storm',
      objective: 'Climb Half-Blood Hill',
      startPlace: 'Thalia’s pine on Half-Blood Hill',
      intro: [
        'Summer at Montauk: in a storm, Grover is on your doorstep with no trousers on (he has goat legs), and Mom drives you all toward Long Island.',
        'The Camaro lies on its side in a ditch. The camp border is at the top of the hill, in the rain.',
        'The thing that was following you comes out of the dark: a man with the head of a bull. Lure its charges into the trees.',
      ],
      outro: 'The Minotaur crumbles to dust and you are left holding a horn. Camp Half-Blood lies below.',
    },
    // Chapter 3: Capture the Flag
    lt3: {
      title: 'Capture the Flag',
      place: 'Camp woods and the creek',
      objective: 'Capture the red team’s banner',
      startPlace: 'the edge of the woods, past the cabins',
      intro: [
        'Friday night is capture the flag. Blue team: Athena, Hermes and you. Red team: Ares, and Clarisse wants to pound you.',
        'Annabeth puts on her Yankees cap and vanishes. You get border patrol by the creek. Some plan.',
        'Find the red banner in the woods and carry it back across the creek. A banner is heavy: no ranged attacks while you carry it.',
      ],
      outro: 'The creek heals every scratch. “It is determined,” says Chiron, and the whole camp kneels: Poseidon, Earthshaker, Stormbringer, Father of Horses.',
      bossDown: 'Everyone is staring above your head: a glowing green trident. You have been claimed.',
    },
    // Chapter 4: The Kindly Ones
    lt4: {
      title: 'The Kindly Ones',
      place: 'A Greyhound bus, New Jersey',
      objective: 'Get off the bus alive',
      startPlace: 'the first milestone on the Road West',
      intro: [
        'The Oracle gives you a prophecy, and you go west: Annabeth, Grover and you, on a Greyhound bus out of New York.',
        'Three old ladies get on at the back. One of them is knitting. Another has a leather whip in her handbag.',
        'The Furies want to drag you back to their master. See through the Mist, clear the road, then face all three.',
      ],
      outro: 'The bus burns behind you in the woods of New Jersey. You are on foot now, a long way from camp, and going west.',
    },
    // Chapter 5: Aunty Em’s Garden Gnome Emporium
    lt5: {
      title: 'Aunty Em’s Garden Gnome Emporium',
      place: 'A statue garden',
      objective: 'Free the stone satyrs',
      startPlace: 'a garden gnome by the Road West',
      intro: [
        'Hungry and lost, you smell burgers: Aunty Em’s Garden Gnome Emporium. The garden is full of statues, and they all look scared.',
        'Aunty Em wears a black veil. She says she only wants to take your picture.',
        'Free the stone satyrs (hold X / E beside them). When she comes, don’t look at her: keep her in a reflection.',
      ],
      outro: 'You mail Medusa’s head to Mount Olympus, care of the gods. Annabeth says that was rude. It was also very funny.',
    },
    // Chapter 6: The Gateway Arch
    lt6: {
      title: 'The Gateway Arch',
      place: 'St. Louis, the top of the Arch',
      objective: 'Climb to the top of the Arch',
      startPlace: 'the river crossing on the Road West',
      intro: [
        'St. Louis. Annabeth wants to see the Gateway Arch, because it is a great piece of architecture.',
        'At the top, a fat lady in a denim dress gets in with her little dog. Her “Chihuahua” is called Sonny, and it has a snake for a tail.',
        'The Chimera breathes fire: keep moving and hit it from the side. If it gets too hot, the river is a long way down, and you are Poseidon’s son.',
      ],
      outro: 'You jump six hundred and thirty feet into the Mississippi and breathe underwater. A Nereid has a message: go to Santa Monica.',
    },
    // Chapter 7: Waterland
    lt7: {
      title: 'Waterland',
      place: 'An abandoned water park, Denver',
      objective: 'Shut Hephaestus’s traps',
      startPlace: 'a water slide by the Road West',
      intro: [
        'In a Denver diner, a biker in a red leather duster makes you an offer: fetch his shield from a water park, and he will get you a ride west.',
        'He is Ares, the god of war. Waterland has been closed for years. The Tunnel of Love has not.',
        'Shut the traps (hold X / E) while the bronze spiders swarm. Don’t let go until the trap is shut.',
      ],
      outro: 'You get out of the Tunnel of Love just before it is broadcast to Olympus. Ares gives you a backpack and a ride west on a zoo truck.',
    },
    // Chapter 8: The Lotus Hotel and Casino
    lt8: {
      title: 'The Lotus Hotel and Casino',
      place: 'Las Vegas',
      objective: 'Get out of the Lotus Casino',
      startPlace: 'a neon sign by the Road West',
      intro: [
        'The Lotus Hotel and Casino, Las Vegas. A free room, free games, and a green card with unlimited credit. Nobody ever wants to leave.',
        'The bellhops keep offering you lotus flowers. Every one makes you forget a little more, and the days slip by.',
        'Find the way out before too many days pass. True Sight shows the door the Mist is hiding. Don’t eat the flowers.',
      ],
      outro: 'Outside, it is five days later than when you went in. The summer solstice is close. You wave down a taxi with the green card: “Los Angeles. And step on it.”',
    },
    // Chapter 9: Crusty’s Water Bed Palace
    lt9: {
      title: 'Crusty’s Water Bed Palace',
      place: 'The Nevada desert',
      objective: 'Get past Crusty’s showroom',
      startPlace: 'a water bed on the Road West',
      intro: [
        'Crusty’s Water Bed Palace, in the Nevada desert. The salesman is huge, and his smile has too many teeth.',
        'He wants you to try a bed. They are all the perfect size. He makes sure of it.',
        'Clear the showroom, then trick him: get him onto his own bed and the straps will hold him.',
      ],
      outro: 'Procrustes the Stretcher fits his own bed perfectly. Annabeth and Grover climb down, only a little longer than before.',
    },
    // Chapter 10: DOA Recording Studios
    lt10: {
      title: 'DOA Recording Studios',
      place: 'Los Angeles and the Underworld',
      objective: 'Close the rifts to Tartarus',
      startPlace: 'a recording-studio door on the Road West',
      intro: [
        'DOA Recording Studios is the way into the Underworld. Charon the ferryman wants drachmas. Lots of them.',
        'Past the river Styx the Fields of Asphodel go on forever, and something deep in Tartarus is calling your name.',
        'Close the rifts (hold X / E) before the dead pour through. At the gates, Cerberus wants to play: throw him the red ball.',
      ],
      outro: 'Hades says you stole his helm. You didn’t, but the master bolt is in your backpack. Three pearls, four of you, and Mom stays behind. You failed to save what mattered most.',
    },
    // Chapter 11: The God of War
    lt11: {
      title: 'The God of War',
      place: 'Santa Monica beach',
      objective: 'Duel Ares in the surf',
      startPlace: 'the surf at the end of the Road West',
      intro: [
        'Santa Monica. Ares is waiting on the beach beside a black motorcycle. He set you up from the start.',
        'The god of war wants a fight. The Furies circle overhead, waiting to see who wins.',
        'Stand in the water for the strength of the sea, and strike for his heel.',
      ],
      outro: 'Riptide cuts Ares’s heel and ichor runs gold. The Furies carry Hades’s helm home. What was stolen is found, and safely returned.',
    },
    // Chapter 12: The Six-Hundredth Floor
    lt12: {
      title: 'The Six-Hundredth Floor',
      place: 'Olympus, then camp',
      objective: 'Return the master bolt',
      startPlace: 'the last milestone on the Road West',
      intro: [
        'The six-hundredth floor of the Empire State Building. Zeus takes back his master bolt, and the war is called off.',
        'Back at camp, Luke asks you to walk with him in the woods. He says he has something to tell you.',
        'Luke has served Kronos all along. Dodge his sword, Backbiter, and watch for the pit scorpion he brought.',
      ],
      outro: 'Luke vanishes into the dark. The poison burns, and the one who called you a friend is your enemy now. Summer is over, but the quest is done.',
    },
  },

  // The opening, in order (story/opening.js, story/openingFlow.js)
  opening: {
    steps: {
      prologue: { title: 'The morning of the field trip', goal: 'Get to the school bus' },
      done: { title: 'Camp Half-Blood' },
    },
    campTitle: 'Camp Half-Blood',
    arriveInCamp: 'The gold arrow points to your next quest. The Big House porch has the chapter map.',
  },

  // Prologue: Manhattan, the morning of the field trip
  prologue: {
    title: 'Manhattan · The Morning of the Field Trip',
    getOnBus: 'Get on the bus',
    goalDesc: 'Yancy Academy’s field trip leaves from the curb, up the avenue',
    allAboard: 'All aboard!',
    // How-to-play hints, in the words of the device being played
    hints: {
      move: { pad: 'Move: left stick. You’re late: follow the gold arrow to the bus', kbm: 'Move: WASD. You’re late: follow the gold arrow to the bus', touch: 'Move: drag on the left of the screen. You’re late: follow the gold arrow' },
      jump: { pad: 'Jump: A — hop over the dug-up sidewalk', kbm: 'Jump: Space — hop over the dug-up sidewalk', touch: 'Jump: ⤒ — hop over the dug-up sidewalk' },
      melee: { pad: 'Rats! Melee: X', kbm: 'Rats! Melee: left click', touch: 'Rats! Melee: ⚔' },
      dodge: { pad: 'Dodge: B, or flick the right stick — roll out of the way', kbm: 'Dodge: R — roll toward the mouse, out of the way', touch: 'Dodge: ⤳ — roll out of the way' },
      ranged: { pad: 'Ranged: RT — shoot them before they reach you', kbm: 'Ranged: right click — shoot them before they reach you', touch: 'Ranged: ✦ — shoot them before they reach you' },
    },
  },

  // Chapter start dialog and markers in camp (story/questMarkers.js)
  quest: {
    difficulty: { mortal: 'Mortal', demigod: 'Demigod', hero: 'Hero', olympian: 'Olympian' },
    chapterTitle: 'Chapter {num}: {title}',
    locked: 'Locked: finish “{title}” first',
    finishFirst: 'Finish “{title}” first',
    hostChooses: 'The host chooses the chapter',
    hint: '{place} · Mist {mist}',
    hintFinished: '{place} · Mist {mist} · Finished on {difficulty}',
    notYet: 'Not yet',
    begin: 'Begin the quest',
  },

  // Objective titles and HUD lines (objectives/*.js, mission.js)
  objectives: {
    exorcise: { title: 'Defeat the Monsters' },
    rescue: { title: 'Free the Captives' },
    seal: { title: 'Destroy the Cursed Objects' },
    // Chapters 11 and 12: straight to the boss
    boss: {
      title: 'Face the Monster',
      clearWay: 'Clear the way to the arena',
      arenaOpens: 'The way to the arena opens',
    },
    // Chapter 3: Capture the Flag
    flag: {
      title: 'Capture the Flag',
      take: 'Take the red banner',
      aHero: 'A hero',
      carry: '{name} has the banner! Carry it back across the creek',
      has: '{name} has the banner!',
      ambush: 'Clarisse’s cabin is coming for their banner!',
      down: 'The banner is down! Pick it up',
      win: 'Blue team wins! You carried the banner across the creek',
      howl: 'A howl in the woods…',
      coverDesc: 'Cover the banner carrier back across the creek',
      carryDesc: 'Carry the banner back across the creek to the blue side',
      findDesc: 'Find Clarisse’s red banner deep in the woods',
    },
    // Chapter 8: the Lotus Hotel and Casino
    escape: {
      title: 'Escape',
      exit: 'Leave the Lotus Casino',
      clock: '☾ {time} have passed (the Lotus has you at {limit})',
      days: { zero: '{n} days', one: '{n} day', other: '{n} days' },
      hours: { zero: '{n} hours', one: '{n} hour', other: '{n} hours' },
      daysAndHours: '{days}, {hours}',
      eat: 'You eat a lotus flower. Mmm… what were you doing?',
      offered: '“Lotus flower, sir?” You lose an afternoon.',
      found: 'There! The way out the Mist was hiding. Run!',
      failed: 'The Lotus has you. Years go by…',
      lostTitle: 'The Lotus has you',
      lostDesc: 'Too many days have passed',
      openDesc: 'The way out is open: get everyone through the door',
      findDesc: 'Find the hidden way out. True Sight (right stick click / V) shows the trail',
    },
    // Chapter 1: the museum
    museum: {
      title: 'Follow Mrs. Dodds through the galleries',
      waiting: 'She’s waiting in the Greek and Roman gallery',
      name: 'Mrs. Dodds',
      fled: 'Mrs. Dodds — fled',
      find: 'Find Mrs. Dodds',
      defeat: 'Defeat Mrs. Dodds',
      defeatDesc: 'True Sight shows what the Mist hides: only then can you fight it',
      mistLifts: 'The Mist lifts…',
      crowdTurns: 'The museum crowd turns toward you…',
      thereSheIs: 'There she is!',
      petsCrumble: 'Her pets crumble back into the Mist.',
    },
  },

  // Chapter runtime (mission.js)
  mission: {
    progress: {
      monsters: '{done} / {need} monsters defeated',
      freed: '{done} / {need} freed',
      destroyed: '{done} / {need} destroyed',
      shut: '{done} / {need} shut',
      closed: '{done} / {need} closed',
    },
    // What the objective items are called and say when done
    items: {
      statue: { label: 'Break the stone spell', done: 'Freed from the stone!' },
      cage: { label: 'Free them', done: 'Freed!' },
      altar: { label: 'Destroy cursed object', done: 'Destroyed!' },
      trap: { label: 'Shut the trap (hold)', done: 'The trap snaps shut!' },
      rift: { label: 'Close the rift (hold)', done: 'The rift closes!' },
    },
    // Monsters called to guard an objective
    guards: {
      statue: 'Aunty Em’s servants come running!',
      rift: 'The dead pour out of the rift!',
      trap: 'The spiders swarm out to defend it!',
      default: 'Monsters come to guard it!',
    },
    wayOpenFaceBoss: 'The way ahead is open: face the boss',
    somethingWrong: 'Something is wrong here. See through the Mist (right stick click / V)',
    reachExit: 'Reach the way out',
    wayOpen: 'The way ahead is open',
    victory: 'Victory',
    faceMonster: 'Face the Monster',
    openChest: 'Open chest',
    secretFound: 'Secret found!',
    wayAheadOpens: 'The way ahead opens',
    hiddenChamber: 'A hidden chamber…',
    arenaSeals: 'The arena seals: your friends are pulled inside',
    doorsSlam: 'The doors slam shut: your friends are pulled inside',
    itsATrap: 'It’s a trap!',
    trapBeaten: 'The trap is beaten: the doors open',
    dodds: { thereYouAre: '“Ah, there you are, honey.”' },
    returnToCamp: 'Return to camp',
    questFailed: 'The quest has failed',
    waitingHost: 'Waiting for the host to try again…',
  },

  // Chapter 1: Mrs. Dodds, in her voice (story/museumRules.js). {sight} is the
  // device's True Sight instruction, capitalised, e.g. "Press V".
  museum: {
    sight: {
      pad: 'click the right stick ({button})',
      kbm: 'press {key}',
      touch: 'tap the 👁 button',
    },
    dodds: {
      reveal1: 'Enough pretending, honey. You’ve been a very bad student.',
      reveal2: 'Your eyes believe the Mist. {sight} to see what’s really here… and what’s coming for you.',
      reveal3: 'With the Mist up my pets look like nice people. They still bite, and you can’t touch them. Now, class is in session!',
      flee1: 'You’ll have to catch me first, honey!',
      flee2: 'Hide and seek? I always win.',
      flee3: 'One more lesson, and it’s your last!',
      found1: 'Pop quiz!',
      found2: 'Found me? Lucky guess.',
      found3: 'No more running. For you.',
    },
    mistHurtHint: 'Something you can’t see is hurting you! {sight} for True Sight, then fight back.',
    gone: 'She’s gone… find her!',
  },
};
