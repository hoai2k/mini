// Every piece of text the game shows, under readable keys, in one place.
// Edit the strings here to change what players read; keep the keys and the
// {placeholders}. Code asks for text with t('section.key', { vars }).
//
// i18n: a language pack is an object with the same keys (any subset);
// setText(pack) lays it over these strings. Strings read when a module
// loads (names in data tables) take a pack only if it is set before the game
// starts, so call setText before importing main.js.


export const TEXT = {
  // ======================================================================
  // Screens: the page, title, hero select, HUD, tracker, chapter map, prophecy, story cards, pause and store
  // ======================================================================
  // index.html: tab title, search description, loading screen
  page: {
    title: 'Half-Blood Quests',
    description: 'Half-Blood Quests: a co-op action dungeon crawler for demigods. Train at Camp Half-Blood, see through the Mist, and fulfil the prophecy.',
    gameName: 'Half-Blood Quests',
    nameLine1: 'HALF-BLOOD',
    nameLine2: 'QUESTS',
    loadingBar: 'Loading',
    loadingText: 'Loading the game…',
  },

  // Button words used on many screens
  common: {
    back: 'Back',
    done: 'Done',
    cancel: 'Cancel',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    areYouSure: 'Are you sure?',
  },

  // Title screen
  title: {
    pressStart: 'Press Start',
    hintNav: 'A select · B back · Menu start',
    hintTap: 'Tap Press Start',
    hintIdle: 'Move left stick for options',
    footer: 'Level {level} · {coins} drachmas',
    options: 'Options',
    instructions: 'Instructions',
    settings: 'Settings',
    debug: 'Debug: scenes',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
  },

  // Hero select and profiles
  heroSelect: {
    device: { keyboard: 'Keyboard', touch: 'Touch', controller: 'Controller {n}' },
    lock: {
      chapter: 'Joins in chapter {n}',
      book3: 'Coming in book 3',
      book2: 'Coming in book 2',
      later: 'Coming in a later book',
    },
    lockedAria: '{name}: {lock}',
    newProfile: 'New profile',
    defaultProfile: 'Player',
    companionAria: 'Companion {n}: {name}',
    none: 'none',
    noOne: 'No one',
    goAlone: 'Go it alone',
    player: 'Player {n}',
    joinHint: 'Press A or Start on a controller to join',
    joinKeyboard: 'Join with keyboard',
    playerDevice: 'Player {n} · {device}',
    profileTitle: 'Profile: saved progress (X on a controller to change)',
    profileAria: 'Profile {name}, change',
    profileLabel: '👤 {name} · Lv {level} ⟳',
    parent: 'Parent: {parent}',
    godlyPower: 'Godly power ',
    chooseHeroGroup: 'Choose a hero',
    prevHero: 'Previous hero',
    nextHero: 'Next hero',
    readyBegin: 'Ready: begin',
    readyDone: 'Ready ✓',
    ready: 'Ready',
    leave: 'Leave',
    yourParty: 'Your party',
    thirdHero: 'The third hero',
    partyHint: 'Companions follow you as allies. Switch to one in play with D-pad ↓ or F.',
    thirdHint: 'An AI companion fights alongside you both. Either of you can swap into it with D-pad ↓ or F.',
    storyBegins: 'The Story Begins',
    chooseHero: 'Choose Your Hero',
    profiles: 'Profiles',
    soon: '🔒 {names}: {lock}',
    storyNote: 'The story begins with Percy. More players join as Grover, then Annabeth and Clarisse. At Camp Half-Blood you can choose any hero you have met.',
    controlsOpening: 'X profile · A ready · Y online · Start begin',
    controls: '◀ ▶ hero · X profile · A ready · Y online · Start begin',
    controlsCompanions: '◀ ▶ hero · ▲ ▼ companions · X profile · A ready · Y online · Start begin',
    playOnline: 'Play online',
    begin: 'Begin the Quest ▶',
    // Profiles screen
    profilesScreen: {
      title: 'Profiles',
      intro: 'Each player’s progress is kept in their profile: level, drachmas, gear for every hero, chapters and the prophecy. To play the same profile on another device, copy its code there and paste it under “Bring a profile here”: progress from both is combined, and nothing is counted twice.',
      nameOf: 'Name of {name}',
      line: 'Level {level} · {chapters}{main}',
      chapters: { one: '{n} chapter', other: '{n} chapters' },
      mainSuffix: ' · this device’s main profile',
      code: 'Code',
      remove: 'Remove',
      codeAria: 'Profile code',
      copy: 'Copy',
      copied: 'Copied',
      bringHeader: 'Bring a profile here',
      pastePlaceholder: 'HBQ2.…',
      pasteAria: 'Paste a profile code',
      notCode: 'That isn’t a profile code.',
      combined: 'Combined with {name}.',
      added: 'Added {name}.',
      bringIt: 'Bring it here',
    },
  },

  // In-game HUD
  hud: {
    dpadDown: 'D-pad ↓',
    trueSight: { meter: 'True Sight meter', label: 'True Sight' },
    minimap: 'Minimap',
    drachmas: 'Drachmas',
    bag: 'Inventory',
    bagNew: { one: '{n} new item', other: '{n} new items' },
    bagOutdated: 'Some of your gear is outdated',
    legendaryArrow: 'Legendary item',
    joinHint: 'Controller: press Start to join',
    playerName: 'P{n} · {name}',
    battleSense: 'Battle Sense',
    power: 'Power',
    quiver: 'Quiver: {name} (refills over time)',
    ammo: 'Ammo',
    ambrosia: 'Ambrosia',
    godlyPower: 'Godly power: {name}',
    companion: '{name} (companion)',
    switch: ' switch',
    down: 'DOWN',
    revive: 'Revive {n}s',
  },

  // Goal tracker arrow
  tracker: {
    distance: '{n} m',
  },

  // Chapter map
  chapterMap: {
    title: 'Chapter Map',
    difficulty: {
      label: 'Difficulty',
      mortal: { name: 'Mortal', tip: 'Gentle: for learning the ropes.' },
      demigod: { name: 'Demigod', tip: 'The way the books play.' },
      hero: { name: 'Hero', tip: 'Tougher monsters.' },
      olympian: { name: 'Olympian', tip: 'For legends only.' },
    },
    difficultyLabel: 'Difficulty: ',
    objectives: {
      exorcise: 'Defeat the monsters',
      escort: 'Escort your friends to safety',
      flag: 'Capture the flag',
      rescue: 'Rescue the captives',
      seal: 'Seal the breaches',
      boss: 'Defeat the boss',
      escape: 'Escape in time',
    },
    bosses: {
      alecto: 'Mrs. Dodds, the Fury',
      minotaur: 'The Minotaur',
      hellhound: 'A hellhound',
      hellhound_alpha: 'A hellhound from the Underworld',
      luke: 'Luke, and his giant scorpion',
      furies: 'The three Furies',
      medusa: 'Medusa',
      chimera: 'The Chimera',
      spiders: 'The spider swarm',
      procrustes: 'Procrustes',
      cerberus: 'Cerberus',
      ares: 'Ares',
      pit_scorpion: 'The giant scorpion',
    },
    noBoss: 'No boss: the place itself is the trap',
    mistRating: 'Mist {n} of 5',
    bookTab: 'Book {n}',
    choose: 'Choose a chapter.',
    bookNotReady: 'This book is not ready yet.',
    playAgain: 'Play again',
    startChapter: 'Start chapter',
    locked: 'Locked',
    comingSoon: 'Coming soon',
    comingSoonDot: 'Coming soon.',
    chapterLine: 'Book {book} · Chapter {n}',
    completedSuffix: ' · Completed',
    mist: 'Mist',
    goal: 'Goal',
    boss: 'Boss',
    starts: 'Starts',
    inCamp: 'In camp: {place}',
    finishBefore: 'Finish the chapter before this one to unlock it.',
    bookComingSoon: 'Coming soon. Finish the books before it to reach it.',
    cardAria: 'Chapter {n}: {title}. {state}',
    completed: 'Completed',
    available: 'Available',
    soon: 'Soon',
    controls: 'A choose · B close',
  },

  // Prophecy scroll
  prophecy: {
    title: 'The Prophecy',
    unfulfilledAria: 'A line of the prophecy that is not yet fulfilled',
    fulfilledIn: 'Fulfilled in: {title}',
    silent: 'The Oracle has not spoken yet.',
    count: '{got} of {total} lines fulfilled',
  },

  // Story cards
  storyCards: {
    count: '{n} / {total}',
    keys: 'A / Enter / click: next · B / Esc: skip',
    skip: 'Skip',
    next: 'Next',
  },

  // Camp store and pause menu
  screens: {
    shop: {
      title: 'Camp Store',
      notEnough: 'Not enough drachmas',
      bought: 'Bought {name}',
      itemLine: '{rarity} {kind} · Power {power} · {desc} Enchantments: {enchants}',
      price: '◆ {n}',
      yourDrachmas: 'Your drachmas: ◆ {n}',
      needRestock: 'Need ◆25',
      restock: 'Restock (◆25)',
    },
    pause: {
      title: 'Paused',
      resume: 'Resume',
      instructions: 'Instructions',
      settings: 'Settings',
      debug: 'Debug: scenes',
      prophecy: 'Prophecy',
      inventory: 'Inventory',
      map: 'Map',
      skillTree: 'Skill tree',
      photoMode: 'Photo mode',
      returnTitle: 'Return to camp?',
      returnText: 'You will leave this chapter and lose its progress.',
      returnYes: 'Return to camp',
      returnButton: 'Return to camp',
      keepPlaying: 'Keep playing',
      quitTitle: 'Quit to title?',
      quitText: 'Your progress is saved, but the current chapter will be lost.',
      quitYes: 'Quit to title',
      quitButton: 'Quit to title',
    },
  },

  // Touch controls
  touch: {
    buttons: {
      attack: 'attack',
      dodge: 'dodge',
      ranged: 'ranged',
      t1: 't1',
      t2: 't2',
      t3: 't3',
      heal: 'heal',
      domain: 'domain',
      sight: 'sight',
      swap: 'swap',
      jump: 'jump',
      inv: 'inv',
    },
    pause: 'Pause',
    rotateHint: 'Rotate your device to landscape to play Half-Blood Quests ⟲',
  },

  // Minimap
  minimap: {
    label: 'Minimap',
  },

  // Skill tree
  skillsScreen: {
    kind: { power: 'New power', upgrade: 'Upgrade', passive: 'Passive' },
    title: 'Skill Tree · {name}',
    toSpend: { one: '{n} point to spend', other: '{n} points to spend' },
    levelLine: ' · Level {level} · one point a level · the whole tree costs {cost}',
    equippedPowers: 'Equipped powers',
    equipped: 'Equipped',
    slotAria: 'Slot {n}: {name}, change',
    emptyLower: 'empty',
    empty: 'Empty',
    chooseAria: 'Choose the power for slot {n}',
    choose: 'Choose the power for slot {n}:',
    inSlot: ' · in slot {n}',
    now: 'Now: ',
    learn: 'Learn: ',
    firstRank: 'First rank: ',
    nextRank: 'Next rank: ',
    max: 'Max',
    points: { one: '{n} pt', other: '{n} pts' },
    nodeAria: '{name}, {kind}, rank {rank} of {max}',
    nodeAriaCost: ', {cost}',
    nodeAriaWhy: ', {why}',
    learned: '{name} learned: choose a slot for it above',
    equippedIn: 'Equipped in slot {n}',
    branchSpent: '{desc} · {n} spent',
    tierGate: 'Tier {tier} · {n} points in this branch\'s tiers above',
    tierLevel: 'Tier {tier} · opens at level {level}',
    reset: {
      title: 'Reset the skill tree?',
      text: 'Every point comes back ({n} in all) and the three starting powers go back in their slots. Free in camp.',
      yes: 'Reset',
      no: 'Keep it',
      done: 'Skill points refunded',
      button: 'Reset points (free)',
      hint: 'Reset the tree with Chiron in camp (free).',
    },
  },

  // ======================================================================
  // Story: books, chapters, cutscenes, the opening and prologue, objectives and mission results
  // ======================================================================
  // Cutscenes (subtitles, one line per shot)
  cutscenes: {
    ariaLabel: 'Cutscene',
    next: { pad: 'A · next', touch: 'Tap · next', kbm: 'Enter · next' },   // (a press skips one shot)
    pause: { pad: 'hold B · pause', touch: 'hold · pause', kbm: 'hold Esc · pause' },   // (held: the cutscene stands still)
    hintSep: '\u00a0\u00a0·\u00a0\u00a0',
    skip: { pad: 'hold A · skip all', touch: '', kbm: 'hold Enter · skip all', button: 'Skip all' },   // (on a touch screen, the Skip all button)
    paused: 'Paused',
    waitingOthers: 'Waiting for the others…',
    waitingHost: 'Waiting for the host…',
    // Cutscene: the bus to the museum
    bus: {
      title: 'The field trip',
      fieldTrip: 'Twenty-eight Yancy Academy kids in one yellow school bus, rolling uptown through New York City in the morning.',
      groverOnBus: 'Grover sits next to you, chewing on an apple core. Nancy Bobofit throws bits of sandwich at his head.',
      museum: 'The American Museum of Natural History. Mr. Brunner promised Greek and Roman treasures.',
      steps: 'Everybody off. Up the steps, past the columns, toward the old marble and bronze.',
      dodds: 'And Mrs. Dodds, your pre-algebra teacher, is watching you, as if you have done something terrible.',
      doddsWord: 'She leans in close. “Later, honey, in the galleries, you and I need a word. Alone.”',
    },
    // Cutscene: summer at Montauk
    summer: {
      title: 'Summer, and a storm',
      cabin: 'Summer. Mom takes you to the cabin at Montauk, on the beach where she first met your father.',
      knock: 'Midnight, in a storm. Someone bangs on the door: Grover, with hooves instead of feet.',
      drive: '“Something is following us!” Mom drives the old Camaro into the storm, as fast as it will go.',
      lightning: 'Toward a hill on Long Island, and a great pine tree at the top.',
      crash: 'BOOM. The lightning hits, the world goes white, and the Camaro flips into a ditch.',
    },
    // Cutscene: waking at the Big House
    wake: {
      title: 'Camp Half-Blood',
      porch: 'You wake up on a porch, in the sun. Somebody is feeding you medicine with a spoon. It tastes like your mom’s cookies.',
      annabeth: '“You know, you drool in your sleep,” says a girl with curly blond hair and storm-grey eyes. Her name is Annabeth.',
      chiron: 'Mr. Brunner, your Latin teacher, trots over on four white legs; he is half horse. “Call me Chiron,” he says.',
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
        'If you think you might be one too, my advice is: stop playing right now. Still here? Okay. You were warned.',
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
        'Summer at Montauk: in a storm, Grover is on your doorstep with no trousers on (he has goat legs). Mom drives you all toward Long Island, until lightning flips the Camaro into a ditch.',
        'Crawl out and climb. The thing that was following you comes out of the dark: a man with the head of a bull. Lure its charges into the trees.',
      ],
      outro: 'The Minotaur crumbles to dust, and you are left holding its horn. But Mom is gone, in a flash of golden light. You stagger toward the pine, and everything goes dark.',
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
      startPlace: "the burning Greyhound on the New Jersey Turnpike",
      intro: [
        'The Oracle gives you a prophecy, and you go west: Annabeth, Grover and you, on a Greyhound bus out of New York.',
        'Three old ladies get on at the back. One of them is knitting. Another has a leather whip in her handbag.',
        'The Furies want to drag you back to their master. See through the Mist, clear the road, then face all three.',
      ],
      outro: 'The bus burns behind you in the woods of New Jersey. You are on foot now, a long way from camp, and Los Angeles is a whole country away.',
    },
    // Chapter 5: Aunty Em’s Garden Gnome Emporium
    lt5: {
      title: 'Aunty Em’s Garden Gnome Emporium',
      place: 'A statue garden',
      objective: 'Free the stone satyrs',
      startPlace: "Aunty Em's Garden Gnome Emporium",
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
      startPlace: "the Gateway Arch in St. Louis",
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
      startPlace: "Waterland, in Denver",
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
      startPlace: "the Lotus Hotel and Casino in Las Vegas",
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
      startPlace: "Crusty's Water Bed Palace",
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
      startPlace: "DOA Recording Studios in Los Angeles",
      intro: [
        'DOA Recording Studios is the way into the Underworld. Charon the ferryman wants drachmas. Lots of them.',
        'Past the river Styx the Fields of Asphodel go on forever, and something deep in Tartarus is calling your name.',
        'Close the rifts (hold X / E) before the dead pour through. At the gates, Cerberus wants to play: throw him the red ball.',
      ],
      outro: 'Hades says you stole his helm. You didn’t, but the master bolt is in your backpack. Three pearls, four of you, and Mom stays behind.',
    },
    // Chapter 11: The God of War
    lt11: {
      title: 'The God of War',
      place: 'Santa Monica beach',
      objective: 'Duel Ares in the surf',
      startPlace: "the beach at Santa Monica",
      intro: [
        'Santa Monica. Ares is waiting on the beach beside a black motorcycle. He set you up from the start.',
        'The god of war wants a fight. The Furies circle overhead, waiting to see who wins.',
        'Stand in the water for the strength of the sea, and strike for his heel.',
      ],
      outro: 'Riptide cuts Ares’s heel and ichor runs gold. The Furies carry Hades’s helm home to the Underworld, and Ares stomps off, sulking.',
    },
    // Chapter 12: The Six-Hundredth Floor
    lt12: {
      title: 'The Six-Hundredth Floor',
      place: 'Olympus, then camp',
      objective: 'Return the master bolt',
      startPlace: "the end of Santa Monica Pier",
      intro: [
        'The six-hundredth floor of the Empire State Building. Zeus takes back his master bolt, and the war is called off.',
        'Back at camp, Luke asks you to walk with him in the woods. He says he has something to tell you.',
        'Luke has served Kronos all along. Dodge his sword, Backbiter, and watch for the giant scorpion he brought.',
      ],
      outro: 'Luke vanishes into the dark, and the scorpion’s poison burns. Your friends find you just in time. Summer is over, but the quest is done.',
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

  // ======================================================================
  // Heroes: names and titles, skill trees, powers and ability callouts
  // ======================================================================
  // Hero select, party screens and the HUD
  heroes: {
    percy: { name: 'Percy', full: 'Percy Jackson', title: 'Son of Poseidon', parent: 'Poseidon', desc: 'Riptide and the sea: water jets, Wave Surge, a healing tide, and Riptide thrown and recalled.', power: 'Hurricane' },
    annabeth: { name: 'Annabeth', full: 'Annabeth Chase', title: 'Daughter of Athena', parent: 'Athena', desc: 'A quick bronze dagger, the invisibility cap, traps and battle plans that mark a weak point for the team.', power: "Wisdom's Gambit" },
    grover: { name: 'Grover', full: 'Grover Underwood', title: 'Satyr Protector', parent: 'Pan (satyr)', desc: 'Reed-pipe songs that tangle, heal and calm; winged sneakers that fly over danger.', power: 'Panic' },
    tyson: { name: 'Tyson', full: 'Tyson', title: 'Cyclops, Son of Poseidon', parent: 'Poseidon', desc: 'Huge fists, thrown boulders, a watch that becomes a shield, and fire that cannot hurt him.', power: 'Big Brother' },
    clarisse: { name: 'Clarisse', full: 'Clarisse La Rue', title: 'Daughter of Ares', parent: 'Ares', desc: 'An electric spear, charges, war cries and a boar shield.', power: "Ares's Fury" },
    thalia: { name: 'Thalia', full: 'Thalia Grace', title: 'Daughter of Zeus', parent: 'Zeus', desc: 'Spear and the terrifying Aegis; lightning that chains between foes.', power: 'Storm of Zeus' },
    nico: { name: 'Nico', full: 'Nico di Angelo', title: 'Son of Hades', parent: 'Hades', desc: 'Stygian iron, shadow travel and an army of the dead.', power: 'King of the Dead' },
  },

  // Skill screen: reasons a rank cannot be bought, then each hero's starters, branches and nodes
  skills: {
    reasons: {
      unknown: 'Unknown skill',
      fullyTrained: 'Fully trained',
      needsSkill: 'Needs {name}',
      needsBranchPoints: 'Needs {gate} points in {branch} ({have} so far)',
      needsPoints: { one: 'Needs {n} point', other: 'Needs {n} points' },
      needsLevel: 'Opens at level {level}',
    },
    // Percy Jackson
    percy: {
      surge: { name: 'Wave Surge', desc: 'A cone of seawater that knocks monsters flat.' },
      tide: { name: 'Healing Tide', desc: 'A pool of seawater that heals heroes in it and slows monsters.' },
      throw: { name: 'Riptide Throw', desc: 'Riptide spins out in a line and comes back to his hand.' },
      branch: {
        blade: { name: 'Riptide', desc: 'Swordsmanship, as Luke taught it' },
        tides: { name: 'Tides', desc: 'Water as a weapon' },
        sea: { name: 'Son of the Sea', desc: 'The sea heals and shields' },
      },
      riptide: { name: 'Celestial Bronze', desc: 'Melee damage.', at: '{pct} melee damage' },
      throw_up: { name: 'Returning Blade', desc: 'Riptide Throw flies further and hits harder.', at: '{metres} m, {damage} damage' },
      disarm: { name: 'Disarming Strike', desc: 'A lunging thrust. The monster it hits is stunned; a boss is left open (marked) instead.', at: '{damage} damage, {seconds} s stun' },
      jet: { name: 'Pressure Jet', desc: 'Water Jet hits harder.', at: '{damage} damage a jet' },
      surge_up: { name: 'Tidal Force', desc: 'Wave Surge reaches further and hits harder.', at: '{metres} m, {damage} damage' },
      geyser: { name: 'Geyser', desc: 'Water bursts out of the ground where you aim and throws monsters into the air.', at: '{damage} damage, {metres} m across' },
      sea: { name: 'Son of the Sea', desc: 'In water Percy heals faster and hits harder.', at: 'heals {n}/s in water, {pct} damage in water' },
      tide_up: { name: 'Deep Tide', desc: 'Healing Tide is wider, lasts longer and heals more.', at: '{metres} m, {seconds} s' },
      bubble: { name: 'Air Bubble', desc: 'A bubble of sea air round Percy and the heroes near him: half damage from every hit.', at: '{seconds} s, heroes within {metres} m' },
      hurricane: { name: 'Eye of the Storm', desc: 'Hurricane lasts longer.', at: '{seconds} s' },
      jet_charges: { name: 'Fire Hose', desc: 'Water Jet holds two charges.', at: '2 charges' },
      sword_master: { name: 'Sword Master', desc: 'More critical hits, and they hit harder.', at: '+{crit}% critical chance, +{dmg}% critical damage' },
      tide_lord: { name: 'Lord of the Tides', desc: 'Powers hit harder and come back sooner.', at: '+{pct}% ability damage, -{cd}% cooldowns' },
    },
    // Annabeth Chase
    annabeth: {
      cap: { name: 'Yankees Cap', desc: 'Invisible for a few seconds; the first hit out of hiding is critical.' },
      plan: { name: 'Battle Plan', desc: "Marks a monster's weak point: it takes +50% damage from the team." },
      trap: { name: 'Daedalus Trap', desc: 'A bronze snare that roots the monsters that step on it.' },
      branch: {
        stealth: { name: 'Stealth', desc: 'The cap and the dagger' },
        strategy: { name: 'Strategy', desc: 'Plans that win battles' },
        workshop: { name: 'Workshop', desc: "Daedalus's inventions" },
      },
      blade: { name: 'Bronze Edge', desc: 'Melee damage.', at: '{pct} melee damage' },
      backstab: { name: 'Weak Spot', desc: 'Hits from behind deal more.', at: '{pct} damage from behind' },
      cap_up: { name: 'Yankees Cap', desc: 'Invisibility lasts longer.', at: '{seconds} s invisible' },
      flank: { name: 'Flank', desc: 'She darts round behind the monster you aim at and strikes: the hit is critical.', at: '{damage} damage, x2 critical' },
      owl: { name: 'Grey Eyes', desc: 'Critical chance.', at: '{pct} critical chance' },
      plan_up: { name: 'Strategist', desc: 'Battle Plan lasts longer and the mark bites harder.', at: '{seconds} s, mark +{percent}%' },
      orders: { name: 'Battle Orders', desc: 'Every hero near her runs faster and gains Power.', at: '+30% speed for {seconds} s, +{power} Power' },
      gambit: { name: 'Wisdom', desc: "Wisdom's Gambit lasts longer.", at: '{seconds} s' },
      trap_up: { name: 'Daedalus Workshop', desc: 'Traps root longer and hit harder.', at: '{seconds} s root, {damage} damage' },
      knives: { name: 'Twin Knives', desc: 'Thrown Knife throws two blades.', at: '2 knives' },
      shadow_strike: { name: 'Shadow Strike', desc: 'More critical hits, and they hit harder.', at: '+{crit}% critical chance, +{dmg}% critical damage' },
      master_builder: { name: 'Master Builder', desc: 'Inventions and powers hit harder and come back sooner.', at: '+{pct}% ability damage, -{cd}% cooldowns' },
      automaton: { name: 'Bronze Automaton', desc: 'A little bronze sentry that throws knives at the monsters near it.', at: '{seconds} s, {damage} damage a knife' },
    },
    // Grover Underwood
    grover: {
      vines: { name: 'Tangle Vines', desc: 'Blocky vines burst from the ground and root monsters.' },
      calm: { name: 'Calming Song', desc: 'Heals every hero near him over a few seconds and slows monsters.' },
      maia: { name: 'Maia!', desc: 'Winged sneakers carry him over gaps and monsters.' },
      branch: {
        wild: { name: 'Wild', desc: 'The forest fights for him' },
        pipes: { name: 'Reed Pipes', desc: 'Songs of Pan' },
        satyr: { name: 'Satyr', desc: 'Hooves, sneakers and snacks' },
      },
      vines_up: { name: 'Wild Growth', desc: 'Tangle Vines cover more ground and hold longer.', at: '{metres} m, {seconds} s' },
      briar: { name: 'Briar Burst', desc: 'Thorns burst up all round Grover, hurting, slowing and pushing back the monsters close by.', at: '{damage} damage, {metres} m' },
      pipes: { name: 'Reed Pipes', desc: 'Pipe Song bolts hit harder.', at: '{damage} damage a bolt' },
      song: { name: 'Calming Song', desc: 'Calming Song heals more.', at: '{percent}% health every half second' },
      lullaby: { name: 'Lullaby', desc: 'A sleepy tune: monsters near him nod off (bosses only slow down).', at: '{seconds} s asleep, {metres} m' },
      panic: { name: 'Voice of Pan', desc: 'Panic lasts longer.', at: '{seconds} s' },
      hooves: { name: 'Hoof Kick', desc: 'Melee damage.', at: '{pct} melee damage' },
      maia_up: { name: 'Maia!', desc: 'Flies further and lands with a stomp that hits harder.', at: '{metres} m, {damage} damage stomp' },
      empathy: { name: 'Empathy Link', desc: 'Calming Song also restores Power to the team.', at: '+2 Power every half second' },
      wild_heart: { name: 'Heart of the Wild', desc: 'Powers hit harder, and Grover heals a little all the time.', at: '+{pct}% ability damage, heals {n} a second' },
      satyr_stamina: { name: 'Satyr Stamina', desc: 'Quicker on his hooves and harder to knock out.', at: '+{speed}% move speed, +{health}% max health' },
      snack: { name: 'Tin-Can Snack', desc: 'Grover munches a tin can: health and Power back.', at: '{percent}% health, +{power} Power' },
    },
    // Tyson
    tyson: {
      pound: { name: 'Ground Pound', desc: 'Leaps and slams the ground, launching everything near.' },
      shield: { name: 'Watch Shield', desc: 'A bronze shield that blocks every hit from the front and bats arrows back.' },
      forge: { name: 'Forge Fire', desc: "Immune to fire; the team's melee hits deal +30% for a while." },
      branch: {
        fists: { name: 'Fists', desc: 'Huge and heavy' },
        hide: { name: 'Cyclops Hide', desc: 'Nothing gets past him' },
        forge: { name: 'Forge and Sea', desc: 'Fire, bronze and a hippocampus friend' },
      },
      fists: { name: 'Heavy Hands', desc: 'Melee damage.', at: '{pct} melee damage' },
      mighty: { name: 'Mighty Blow', desc: 'A wider timing window for Mighty Blows.', at: '{ms} ms window' },
      mighty_ce: { name: "Smith's Rhythm", desc: 'Mighty Blows restore Power.', at: '+{power} Power a Mighty Blow' },
      pound_up: { name: 'Earthshaker', desc: 'Ground Pound covers more ground and hits harder.', at: '{metres} m, {damage} damage' },
      clap: { name: 'Thunder Clap', desc: 'He claps his hands: a shock wave in front of him that stuns.', at: '{damage} damage, {seconds} s stun' },
      vitality: { name: 'Cyclops Hide', desc: 'Max health.', at: '+{health}% more max health' },
      brother: { name: 'Big Brother', desc: 'Big Brother lasts longer.', at: '10 s' },
      cyclops_might: { name: 'Cyclops Might', desc: 'Punches hit harder and throw monsters further.', at: '+{pct}% melee damage, +{knock}% knock-back' },
      forge_born: { name: 'Forge-Born', desc: 'Powers hit harder and Power builds faster.', at: '+{pct}% ability damage, +{ce}% Power gain' },
      shield_up: { name: 'Hephaestus Steel', desc: 'Watch Shield lasts longer.', at: '{seconds} s' },
      ironskin: { name: 'Iron Skin', desc: 'Half damage and no knock-back for a while; every hit he takes gives Power.', at: '{seconds} s, +{power} Power a hit' },
      boulder: { name: 'Bigger Boulders', desc: 'Boulders are bigger and burst wider on landing.', at: '{damage} damage, {metres} m burst' },
      forge_up: { name: 'Hot Forge', desc: 'Forge Fire burns longer.', at: '{seconds} s' },
      rainbow: { name: 'Call Rainbow', desc: 'Rainbow the hippocampus surges through in a line of seawater, trampling monsters.', at: '{damage} damage, {metres} m' },
    },
    // Clarisse La Rue
    clarisse: {
      charge: { name: 'Charge', desc: 'A shield-first dash that carries monsters along and slams them down.' },
      cry: { name: 'War Cry', desc: 'The whole team deals +25% damage for a while.' },
      bash: { name: 'Shield Bash', desc: 'A cone of shield bash that stuns.' },
      branch: {
        spear: { name: 'Spear', desc: 'Lightning down the spear' },
        ares: { name: 'Ares', desc: 'War, and loving it' },
        cabin: { name: 'Cabin Five', desc: 'Tough as the Ares cabin' },
      },
      spear: { name: 'Maimer', desc: 'Melee damage.', at: '{pct} melee damage' },
      volt: { name: 'Live Current', desc: 'Spear Lightning reaches further and stuns longer.', at: '{metres} m, {seconds} s stun' },
      chain: { name: 'Chain Lightning', desc: 'A bolt from the spear that leaps from monster to monster.', at: '{damage} damage, {n} monsters' },
      cry_up: { name: 'Battle Cry', desc: 'War Cry lasts longer and heals the team a little.', at: '{seconds} s, heals {n}' },
      charge_up: { name: 'Battering Ram', desc: 'Charge goes further and slams harder.', at: '{damage} damage slam' },
      frenzy: { name: 'Battle Frenzy', desc: 'Her melee hits deal more and heal her for a while.', at: '{seconds} s, +30% melee, {n} health a hit' },
      fury: { name: 'Blood of Ares', desc: "Ares's Fury lasts longer and burns hotter.", at: '{seconds} s, {n} burn a second' },
      tough: { name: 'Cabin Five', desc: 'Max health and armour.', at: '+{health}% max health, +{percent}% armour' },
      spear_of_ares: { name: 'Spear of Ares', desc: 'Faster thrusts that find the weak spots.', at: '+{speed}% attack speed, +{crit}% critical chance' },
      cabin_pride: { name: 'Cabin Five Pride', desc: 'Even tougher: more health and armour.', at: '+{health}% max health, +{pct}% armour' },
      bash_up: { name: 'Boar Shield', desc: 'Shield Bash is wider and stuns longer.', at: '{seconds} s stun' },
      hold: { name: 'Hold the Line', desc: 'She plants her spear: half damage, and lightning crackles into the monsters round her.', at: '{seconds} s, {damage} damage a zap' },
    },
  },

  // Ability names on the HUD that are not skills (basic ranged attacks)
  powers: {
    base: { ranged: 'Power Bolt' },
    percy: { ranged: 'Water Jet' },
    annabeth: { ranged: 'Thrown Knife' },
    grover: { ranged: 'Pipe Song' },
    tyson: { ranged: 'Boulder' },
    clarisse: { ranged: 'Spear Lightning' },
  },

  // Toasts when an ability is used
  kit: {
    annabeth: { weakPoint: 'Weak point marked', orders: 'Battle Orders: move!' },
    grover: { lullaby: 'Lullaby: the monsters doze off' },
    tyson: { forge: 'Forge Fire: the team hits harder' },
    clarisse: { warCry: 'War Cry: the team hits harder' },
  },

  // ======================================================================
  // Gear: items, enchantments, rarity, loot, inventory and the forge
  // ======================================================================
  // Gear: names and descriptions of every base item, in loot.js order
  items: {
    // Weapons
    fang_dagger: { name: 'Empousa Fang', desc: 'A curved fang set in a bronze hilt. It drinks a little life with every cut.' },
    ram_mace: { name: 'Ram’s-Horn Mace', desc: 'A heavy mace shaped like ram’s horns. Big hits burst out and shove monsters away.' },
    forge_sword: { name: 'Forge-Fire Sword', desc: 'Hammered in the camp forge and still glowing. It sets monsters alight.' },
    boreas_axe: { name: 'Axe of Boreas', desc: 'The North Wind’s own axe. Frost bites with every swing.' },
    storm_spear: { name: 'Spear of the Storm', desc: 'Lightning crackles along it and leaps from monster to monster.' },
    hebe_robe: { name: 'Robe of Hebe', desc: 'Woven by the goddess of youth. Ambrosia shields you as it heals.' },
    wind_cloak: { name: 'Cloak of the West Wind', desc: 'A gift of Zephyros. Magic items send you racing off on the breeze.' },
    training_sword: { name: 'Camp Training Sword', desc: 'A bronze practice sword from the camp armoury. Reliable.' },
    bronze_dagger: { name: 'Bronze Dagger', desc: 'Quick and light. Up close is where a dagger shines.' },
    camp_spear: { name: 'Camp Spear', desc: 'Long reach, steady thrusts.' },
    club: { name: 'Cyclops Club', desc: 'A table leg from the Big House. Heavy, slow, and sends monsters flying.' },
    bronze_axe: { name: 'Bronze Hand Axe', desc: 'Wide, chopping swings that catch several monsters at once.' },
    shepherd_crook: { name: 'Shepherd’s Crook', desc: 'Satyrs swear by it. Long reach and a gentle hook.' },
    xiphos: { name: 'Celestial Bronze Xiphos', desc: 'A leaf-bladed Greek sword. Monsters fear its glow.' },
    hammer: { name: 'Forge Hammer', desc: 'Made in the Hephaestus cabin. Every third blow shakes the ground.' },
    reed_staff: { name: 'Reed Staff of Pan', desc: 'A satyr’s staff, humming with wild music.' },
    lamer: { name: 'Electric Spear', desc: 'A spear that crackles with stolen lightning.' },
    labrys: { name: 'Labrys of Knossos', desc: 'The double axe of the labyrinth’s kings. Huge sweeping arcs.' },
    kopis: { name: 'Spartan Kopis', desc: 'A forward-curved blade that bites hardest into the wounded.' },
    dory: { name: 'Hoplite Dory', desc: 'The great spear of the phalanx. Reach that keeps monsters at bay.' },
    backbiter: { name: 'Backbiter', desc: 'Half celestial bronze, half tempered steel: it cuts mortals and monsters alike, and ignores shields.' },
    stygian_blade: { name: 'Stygian Iron Blade', desc: 'Forged in the Styx. It drinks the essence of what it strikes.' },
    twin_daggers: { name: 'Twin Huntress Knives', desc: 'Silver knives of the Hunters of Artemis. Every hit strikes twice.' },
    imperial_gladius: { name: 'Imperial Gold Gladius', desc: 'A Roman blade of Imperial gold. Sturdy, sharp and fast.' },
    harpe: { name: 'Harpe of Perseus', desc: 'The sickle-sword that took Medusa’s head. Deadly to the mightiest monsters.' },
    heracles_club: { name: 'Club of Heracles', desc: 'Olive wood studded with bronze. Every swing is a thunderclap.' },
    pelian_spear: { name: 'Pelian Spear of Achilles', desc: 'Only Achilles could wield it. Its strikes find every gap in armour.' },
    ares_sword: { name: 'Burning Sword of Ares', desc: 'The war god’s own blade. Monsters it fells burst into flame.' },
    trident_blade: { name: 'Tide-Forged Sword', desc: 'Cooled in the sea by Poseidon’s Cyclopes. It hits like a wave.' },
    // Armour
    camp_shirt: { name: 'Camp Half-Blood T-shirt', desc: 'Orange, with a pegasus. Surprisingly tough.' },
    bronze_breastplate: { name: 'Bronze Breastplate', desc: 'Standard camp battle armour. Heavy.' },
    hermes_uniform: { name: 'Hermes Express Uniform', desc: 'Built for fast deliveries.' },
    linothorax: { name: 'Linothorax', desc: 'Layered linen armour: light and quick to move in.' },
    biker_jacket: { name: 'Biker Jacket of Ares', desc: 'Smells of smoke and war. Fighting makes you stronger.' },
    hunter_parka: { name: 'Hunter’s Silver Parka', desc: 'Silver, light and warm, with a huntress’s quiver. Abilities come back faster.' },
    sea_armor: { name: 'Sea-Green Mail', desc: 'Scales from Poseidon’s armoury. Power flows like the tide.' },
    hoplite_panoply: { name: 'Hoplite Panoply', desc: 'Full bronze armour of a Greek soldier: helm, cuirass and greaves.' },
    spartan_cloak: { name: 'Spartan Crimson Cloak', desc: 'Come back with your shield, or on it.' },
    satyr_vest: { name: 'Satyr’s Woven Vest', desc: 'Wild-grown and alive. It mends you slowly.' },
    nemean_pelt: { name: 'Nemean Lion Pelt', desc: 'The golden pelt no blade can pierce.' },
    fleece_cloak: { name: 'Golden Fleece Mantle', desc: 'Healing magic woven into gold. Ambrosia refills faster.' },
    forge_apron: { name: 'Fireproof Forge Apron', desc: 'Hephaestus’s own. Nothing near you stays cool for long.' },
    amazon_armor: { name: 'Armour of the Amazons', desc: 'Queen Hylla’s fighters move like the wind and strike true.' },
    achilles_armor: { name: 'Armour of Achilles', desc: 'Forged by Hephaestus for the greatest hero of Troy. Nearly invulnerable.' },
    hermes_cap: { name: 'Winged Travelling Cloak', desc: 'Hermes’s own travelling gear. Light as a breeze.' },
    // Magic items
    master_bolt: { name: 'Spark of the Master Bolt', desc: 'A javelin of lightning that pierces every monster in a line.' },
    hephaestus_net: { name: 'Hephaestus’s Golden Net', desc: 'Throw the net and drag every monster it catches to you.' },
    medusa_head: { name: 'Medusa’s Head (in a bag)', desc: 'Lift the bag and every nearby monster turns to stone for 4 seconds. Don’t look.' },
    nemesis_coin: { name: 'Nemesis’s Fortune Coin', desc: 'Balance: damages every monster you hit in the last 5 seconds.' },
    aegis: { name: 'Aegis Charm', desc: 'A shimmer of Zeus’s shield: halves damage taken for 5 seconds.' },
    pegasus_whistle: { name: 'Pegasus Whistle', desc: 'Calls a pegasus who dives at monsters for 12 seconds.' },
    nectar_flask: { name: 'Nectar Flask', desc: 'Heals you and nearby friends over 4 seconds.' },
    bag_of_winds: { name: 'Bag of Winds', desc: 'A gift of Aeolus: a gale that hurls monsters away.' },
    helm_of_darkness: { name: 'Shadow of the Helm', desc: 'For 5 seconds the whole team turns invisible to monsters.' },
    winged_shoes: { name: 'Winged Sneakers', desc: 'Maia! Run much faster for 6 seconds.' },
    greek_fire: { name: 'Jar of Greek Fire', desc: 'A thrown jar: green fire that burns where it lands.' },
    zeus_thunder: { name: 'Thunder of Zeus', desc: 'Lightning strikes the five nearest monsters.' },
    orpheus_lyre: { name: 'Lyre of Orpheus', desc: 'A song so sad that every monster nearby falls asleep. Hitting them wakes them.' },
    apple_of_discord: { name: 'Golden Apple of Discord', desc: '“To the fairest.” Monsters near it turn on each other for 6 seconds.' },
    athena_owl: { name: 'Athena’s Owl', desc: 'The owl marks every monster in sight: your team does +50% damage to them for 8 seconds.' },
    ariadne_thread: { name: 'Ariadne’s Thread', desc: 'A golden thread shows the way to what you seek, and quickens your step.' },
    caduceus: { name: 'Caduceus of Hermes', desc: 'George and Martha, the staff’s two snakes, slither out to bite monsters for 12 seconds.' },
    boar_tusk: { name: 'Erymanthian Boar Tusk', desc: 'Charge forward like the great boar, trampling everything in your path.' },
    trident_charm: { name: 'Trident of the Sea', desc: 'Strike the ground: geysers of seawater burst up all around you.' },
    sun_chariot: { name: 'Ray of the Sun Chariot', desc: 'Apollo’s sunlight burns a line of monsters.' },
    kronos_hourglass: { name: 'Hourglass of Kronos', desc: 'The Titan of time’s sand: monsters slow to a crawl for 4 seconds.' },
    cornucopia: { name: 'Cornucopia', desc: 'The horn of plenty spills healing fruit and drachmas.' },
    stymphalian_feathers: { name: 'Stymphalian Feathers', desc: 'A fan of bronze feathers, thrown like knives.' },
    // the loot rework (design/loot-design.md §4.5): the bosses' signatures and the new finds
    hunter_knives: { name: 'Hunter’s Moon Knives', desc: 'A pair of silver knives of Artemis’s Hunters. Every cut strikes twice.' },
    fury_lash: { name: 'Fury’s Flaming Lash', desc: 'Mrs Dodds’s whip of fire, long enough to reach monsters out of sword range.' },
    minotaur_horn: { name: 'Horn of the Minotaur', desc: 'The horn Percy tore from the bull-man on Half-Blood Hill. It hits like a charge.' },
    chimera_fang: { name: 'Chimera Fang Spear', desc: 'A spear tipped with the Chimera’s poisoned fang. Its hits leave monsters poisoned and slow.' },
    procrustes_axe: { name: 'Procrustes’s Cleaver', desc: 'Crusty’s huge axe, made to cut everything down to size.' },
    counsellor_vest: { name: 'Camp Counsellor Vest', desc: 'An orange vest with a whistle on it. Counsellors always know where to be.' },
    lotus_robe: { name: 'Lotus Hotel Bathrobe', desc: 'So comfy you heal while you wear it, and Ambrosia comes back sooner.' },
    mist_cloak: { name: 'Cloak of the Mist', desc: 'Woven from the Mist itself: monsters miss you more often.' },
    fury_wings: { name: 'Wings of the Kindly Ones', desc: 'Leathery Fury wings, sewn into a cape. Fast, and hard to hit.' },
    hellhound_hide: { name: 'Hellhound Hide', desc: 'The alpha’s thick black hide. Monsters that bite you get hurt back.' },
    drakon_scale: { name: 'Drakon-Scale Plate', desc: 'Armour of drakon scales, the toughest in the world. A little heavy.' },
    ares_shield: { name: 'Shield of Ares', desc: 'Ares’s shield from Waterland: raise a bronze dome that stops shots and shoves monsters back.' },
    lotus_card: { name: 'Lotus Casino Card', desc: 'Flash the card: monsters near you forget what they were doing, slow down and take more damage.' },
    cerberus_ball: { name: 'Cerberus’s Red Ball', desc: 'Throw it: a ghostly three-headed pup chases it, biting every monster on the way.' },
    dionysus_vine: { name: 'Dionysus’s Grapevine', desc: 'Grapevines burst out of the ground and hold monsters near you in place.' },
    hermes_vitamins: { name: 'Hermes’s Multivitamins', desc: 'Two chewable vitamins: run faster and heal for a few seconds.' },
  },

  // Enchantments ({n} is the number the level works out to; {n2} a second one)
  enchantments: {
    // Weapons
    sharpness: { name: 'Celestial Edge', desc: '+{n}% melee damage', plain: 'Your weapon hits harder.' },
    swirling: { name: 'Whirlwind', desc: 'Every third hit spins, striking all around for {n}%', plain: 'Every third hit spins and hits everything round you.' },
    committed: { name: 'Relentless', desc: 'Up to +{n}% damage to wounded monsters', plain: 'Hits harder on monsters that are already hurt.' },
    rampaging: { name: 'War Frenzy', desc: 'Defeating a monster gives +{n}% attack speed for 5 s', plain: 'Beating a monster makes you attack faster for a bit.' },
    leeching: { name: 'Nectar Thirst', desc: 'Heal {n}% of your health when you defeat a monster', plain: 'Beating a monster heals you.' },
    lifesteal: { name: 'Vampire’s Kiss', desc: 'Heal {n}% of the melee damage you deal', plain: 'Every hit heals you a little.' },
    fire_aspect: { name: 'Forge Flame', desc: 'Hits set monsters on fire for {s} s ({n}% of the hit each second)', plain: 'Hits set monsters on fire.' },
    exploding: { name: 'Greek Fire', desc: 'Monsters you defeat explode for {n}% of their health', plain: 'Monsters you beat blow up and hurt the ones near them.' },
    freezing: { name: 'Boreas’s Chill', desc: 'Hits slow monsters for {n} s; {c}% chance to freeze one solid', plain: 'Hits slow monsters, and sometimes freeze them solid.' },
    critical: { name: 'Athena’s Eye', desc: '+{n}% critical chance', plain: 'More big critical hits.' },
    thundering: { name: 'Zeus’s Spark', desc: '{n}% chance on hit to call down lightning', plain: 'Sometimes lightning strikes what you hit.' },
    chain_lightning: { name: 'Chain Lightning', desc: '{c}% chance on hit: lightning leaps to {n} more monsters for {d}% damage', plain: 'Sometimes lightning jumps from your target to the monsters near it.' },
    shockwave: { name: 'Poseidon’s Shove', desc: '{c}% chance on hit to burst out and push monsters back', plain: 'Sometimes a hit bursts out and pushes monsters away.' },
    echo: { name: 'Echo', desc: '{n}% chance to strike twice', plain: 'Sometimes you hit twice.' },
    bane: { name: 'Monster Bane', desc: '+{n}% damage to elites, champions and bosses', plain: 'Hits harder on big monsters and bosses.' },
    // Armour
    health: { name: 'Ambrosia-Fed', desc: '+{n} health', plain: 'More health.' },
    protection: { name: 'Aegis Ward', desc: '+{n}% damage reduction', plain: 'You take less damage.' },
    swiftness: { name: 'Hermes’s Speed', desc: '+{n}% move speed', plain: 'You run faster.' },
    speed_synergy: { name: 'Winged Heels', desc: 'After you use a magic item: +30% speed for {n} s', plain: 'Using a magic item makes you run faster for a bit.' },
    cooldown: { name: 'Focus', desc: '-{n}% ability cooldowns (Ambrosia -{n2}%)', plain: 'Your powers come back sooner.' },
    surge: { name: 'Godly Blood', desc: '+{n}% Power gain', plain: 'Your Power bar fills faster.' },
    potency: { name: 'Divine Might', desc: '+{n}% ability damage', plain: 'Your powers and magic items hit harder.' },
    vitality: { name: 'Apollo’s Blessing', desc: 'Ambrosia heals {n}% more of your health', plain: 'Ambrosia heals more.' },
    potion_barrier: { name: 'Ambrosia Shield', desc: 'After Ambrosia: half damage for {n} s', plain: 'Ambrosia shields you for a moment too.' },
    nectar: { name: 'Hebe’s Cup', desc: 'Ambrosia refills {n}% faster', plain: 'Ambrosia comes back sooner.' },
    quiver: { name: 'Artemis’s Quiver', desc: '+{n} shots in your quiver', plain: 'More shots before you run out.' },
    thorns: { name: 'Demeter’s Briars', desc: 'Monsters that hit you take {n}% of the damage back', plain: 'Monsters that hit you get hurt too.' },
    embers: { name: 'Hephaestus’s Embers', desc: 'Burn monsters right next to you for {n} damage a second', plain: 'Monsters right next to you burn.' },
    evasion: { name: 'Nimble as a Satyr', desc: '{n}% chance to dodge a hit', plain: 'Sometimes a hit misses you.' },
    lucky: { name: 'Tyche’s Luck', desc: '+{n}% drachmas found', plain: 'You find more drachmas.' },
    // Loot (armour and magic items) and the Chimera’s fang
    hermes_haul: { name: 'Hermes’s Haul', desc: '+{n}% chance a monster drops an item', plain: 'Monsters drop items more often.' },
    tyche_favour: { name: 'Tyche’s Favour', desc: '{n}% chance a drop is one rarity better', plain: 'Your drops are sometimes rarer.' },
    venom: { name: 'Chimera Venom', desc: 'Hits poison monsters for {s} s ({n}% of the hit each second) and slow them {p}%', plain: 'Hits poison monsters and slow them.' },
  },

  // Boons: small rolled bonuses on an item, a line each ({n}: the number it rolled)
  boons: {
    keen: { name: 'Keen', desc: '+{n}% melee damage' },
    swift: { name: 'Swift', desc: '+{n}% attack speed' },
    giant: { name: 'Giant-Slayer', desc: '+{n}% damage to elites, champions and bosses' },
    vicious: { name: 'Vicious', desc: '+{n}% critical chance' },
    reach: { name: 'Long Reach', desc: '+{n}% reach' },
    sturdy: { name: 'Sturdy', desc: '+{n} health' },
    guarded: { name: 'Guarded', desc: '+{n}% damage reduction' },
    fleet: { name: 'Fleet', desc: '+{n}% move speed' },
    focused: { name: 'Focused', desc: '−{n}% cooldowns' },
    hale: { name: 'Hale', desc: '+{n}% healing' },
    deep: { name: 'Deep Quiver', desc: '+{n} shots' },
    potent: { name: 'Potent', desc: '+{n}% ability damage' },
    surging: { name: 'Surging', desc: '+{n}% Power gain' },
    lasting: { name: 'Lasting', desc: 'Its effect lasts {n}% longer' },
    fortunate: { name: 'Fortunate', desc: '+{n}% drachmas' },
  },

  // Rarity names (also used for the Blessed gift of a god)
  rarity: {
    common: 'Common',
    rare: 'Rare',
    heroic: 'Heroic',
    unique: 'Legendary',
    blessed: 'Blessed',
  },

  // Loot: kinds of gear and the card shown when an item is picked up
  loot: {
    kind: { weapon: 'Weapon', armor: 'Armour', artifact: 'Magic item' },
    blessedName: 'Blessed {name}',
    fx: { frozen: 'Frozen!' },
    card: {
      newSlot: 'New slot!',
      power: 'Power {arrow}{n}',
      change: '{label} {arrow}{value}',
      damage: 'Damage',
      speed: 'Speed',
      health: 'Health',
      armour: 'Armour',
      nameFor: 'P{n} · {name}',
      sub: '{rarity} {kind} · Power {power}',
      subFavourite: '{rarity} {kind} · Power {power} · {hero}’s favourite',
      hint: 'Equip it from the inventory (pause menu, or I)',
      compact: '{name} · Power {power}',
      merged: { one: '+{n} common item', other: '+{n} common items' },
      legendary: 'LEGENDARY',
      signature: 'Signature drop',
      signatureToast: 'Signature drop · {name}',
      signatureToastFor: 'P{n} · Signature drop · {name}',
      upgrade: '▲ Better than what you wear',
      boon: '{name}: {desc}',
    },
    reward: 'Chapter reward',
  },

  // Inventory screen (pause menu, or I)
  inventory: {
    title: 'Inventory',
    slots: { weapon: 'Weapon', armor: 'Armour', artifact1: 'Magic item 1', artifact2: 'Magic item 2' },
    filters: { all: 'All', weapon: 'Weapons', armor: 'Armour', artifact: 'Magic items', heroic: 'Heroic+' },
    companion: '{hero} (companion)',
    equipped: 'Equipped · {hero}',
    tryingOn: 'Trying on',
    previewLabel: '{hero} in their gear',
    summary: {
      one: 'Level {level} · ◆ {coins} drachmas · {n} enchantment point',
      other: 'Level {level} · ◆ {coins} drachmas · {n} enchantment points',
    },
    empty: 'Nothing here yet. Open chests and defeat monsters for loot.',
    itemLabel: '{name}, power {power}',
    itemLabelEquipped: '{name}, power {power}, equipped',
    new: 'NEW',
    favouriteTitle: '{hero}’s favourite',
    favourite: '★ {hero}’s favourite: +10% power for {hero}',
    choose: 'Choose an item to see it, enchant it or equip it.',
    // Hero stat lines
    stats: {
      health: 'Health',
      melee: 'Melee damage',
      ability: 'Ability damage',
      attackSpeed: 'Attack speed',
      armor: 'Damage reduction',
      speed: 'Move speed',
      crit: 'Critical chance',
      cooldowns: 'Cooldowns',
      dodge: 'Dodge chance',
      flask: 'Ambrosia refills in',
      quiver: 'Quiver',
    },
    percent: '{n}%',
    seconds: '{n} s',
    times: '×{n}',
    change: '{label} {arrow} {value}',
    // Item detail
    rarityLine: '{rarity} {kind} · Power {power}',
    descCooldown: '{desc} Cooldown {n} s.',
    comparedWith: 'Compared with your {slot}:',
    enchantHeading: {
      one: 'Enchantments · {n} point to spend',
      other: 'Enchantments · {n} points to spend',
    },
    builtIn: 'built in',
    chooseOne: 'Choose one:',
    pointCost: '{n} pt',
    levelCost: '{level} · {cost} pt',
    max: 'max',
    blessedMark: '✦',
    godsBlessing: 'a god’s blessing',
    unequip: 'Unequip',
    equip: 'Equip ({slot})',
    equips: '{hero} equips {name}',
    // Salvage
    salvage: 'Salvage (+◆{coins})',
    salvaged: 'Salvaged: +◆{coins}',
    salvagedPoints: 'Salvaged: +◆{coins}, +{points} enchantment points',
    salvageTitle: 'Salvage this item?',
    salvageText: '{name} will be gone. You get ◆{coins}.',
    salvageTextPoints: '{name} will be gone. You get ◆{coins} and {points} enchantment points back.',
    salvageYes: 'Salvage',
    salvageNo: 'Keep',
    close: 'Close',
    // The header chips
    level: 'Level {n}',
    coins: '◆ {n}',
    points: { one: '✦ {n} point', other: '✦ {n} points' },
    heroPower: '⚔ Power {n}',
    heroPowerTip: '{hero}’s Power: the average power of everything {hero} wears',
    // The stash
    tabCount: '{label} · {n}',
    sortHint: 'New finds first, then the strongest.',
    better: 'Better than what you wear',
    outdated: 'Outdated: new finds are a lot stronger. Reforge it at the forge, or swap it.',
    outdatedTitle: 'Outdated',
    boonsHeading: 'Boons',
    wornBy: 'Worn by {hero}',
    // The item
    wearing: 'You are wearing this',
    powerVs: '{arrow} {n} power compared with {name}',
    samePower: 'Same power as {name}',
    fillsSlot: '▲ Fills your empty {slot} slot!',
    cooldown: 'Cooldown {n} s.',
    charges: '{n} uses before it recharges.',
    equipBtn: 'Equip',
    swapIn: 'Swap it in',
    swapped: 'Swapped in {name}!',
    unequipFirst: 'Take it off first, then salvage it.',
    compareTitle: 'Swap it for {name} and you get:',
    compareEmpty: 'Your {slot} slot is empty. You get:',
    compareSame: 'About the same as now.',
    fromTo: '{from} → {to}',
    enchantHelp: 'Enchantments give gear special powers. Spend ✦ points to pick one, then level it up.',
    salvageWorn: '{hero} is wearing it.',
    coinsGained: '+◆{n}',
    hints: {
      pad: 'Ⓐ Look · Ⓐ again: Equip · Ⓧ Salvage · LB / RB Tabs · Ⓑ Close',
      kbm: 'Click to look · Click again (or Enter) to equip · X Salvage · Q / E Tabs · Esc Close',
      touch: 'Tap to look · Tap again to equip',
    },
  },

  // The forge in camp (the inventory with tempering and re-rolling)
  forge: {
    title: 'The Forge',
    summary: {
      one: 'Level {level} · ◆ {coins} drachmas · {n} enchantment point · Temper items and re-roll enchantment choices here',
      other: 'Level {level} · ◆ {coins} drachmas · {n} enchantment points · Temper items and re-roll enchantment choices here',
    },
    noDrachmas: 'Not enough drachmas',
    reroll: 'Re-roll choices (◆{cost})',
    temper: 'Temper +{n} power (◆{cost})',
    help: 'Temper makes an item a little stronger; Reforge brings it straight up to what you find now (rarer items cost more). Re-roll swaps the choices of an enchantment row you haven’t used.',
    temperCap: 'This item is as strong as the forge can make it for now',
    reforge: 'Reforge to level {power} (◆{cost})',
    reforged: 'Reforged to power {n}!',
    reforgeNone: 'Already as strong as what drops now',
  },

  // Store: shop listings use the item, rarity and kind names above
  store: {},

  // Quiver contents per hero: what the ammo is called and the out-of-ammo hint
  resources: {
    ammo: {
      percy: { name: 'water', out: 'Out of water — it comes back over time' },
      annabeth: { name: 'knives', out: 'Out of knives — they come back over time' },
      grover: { name: 'notes', out: 'Out of breath for the pipes — it comes back over time' },
      tyson: { name: 'boulders', out: 'Out of boulders — they come back over time' },
      clarisse: { name: 'sparks', out: 'Out of sparks — they come back over time' },
      default: { name: 'arrows', out: 'Out of arrows — they come back over time' },
    },
  },

  // Pickups: the number shown when an ammo bundle is collected
  pickups: {
    ammoGain: '+{n}',
  },

  // Magic item toasts
  artifacts: {
    owlMarks: { one: 'The owl marks {n} monster', other: 'The owl marks {n} monsters' },
    owlSeesNone: 'The owl sees no monsters',
    threadStill: 'The thread lies still: nothing left to find here',
    bulwark: 'Shield of Ares!',
    lotus: { one: '{n} monster forgets the fight', other: '{n} monsters forget the fight' },
    fetch: 'Fetch, boy!',
    vines: { one: 'The vines hold {n} monster', other: 'The vines hold {n} monsters' },
    vitamins: 'Vitamins!',
  },

  // ======================================================================
  // The open world: regions, waystones, the world map, side quests, camps, chests and shrines
  // ======================================================================
  // Region names (shown on entering a region, on the map) and their subtitles
  regions: {
    camp: { name: 'Camp Half-Blood', sub: 'Long Island Sound, New York' },
    fields: { name: 'Strawberry Fields', sub: 'The camp’s farms and orchards' },
    woods: { name: 'The Camp Woods', sub: 'Stocked with monsters, for training' },
    shore: { name: 'The North Shore', sub: 'Cliffs and beaches on Long Island Sound' },
    canyon: { name: 'The Red Canyon', sub: 'Where the desert came to Long Island' },
    labyrinth: { name: 'The Labyrinth', sub: 'Daedalus’s maze, breaking through' },
    othrys: { name: 'Mount Othrys', sub: 'The Titans’ black fortress' },
    asphodel: { name: 'The Fields of Asphodel', sub: 'Where the Underworld breaks through' },
    levels: 'Monster level {a}–{b}',
    entered: '{name}',
  },
  // Waystones: their names on the map and the teleport list
  waystones: {
    camp: 'The Campfire',
    fields_crossroads: 'Farm Crossroads',
    fields_orchard: 'The Orchard',
    woods_creek: 'The Creek',
    woods_fist: 'Zeus’s Fist',
    shore_dunes: 'The Dunes',
    shore_cliffs: 'Gull Cliffs',
    canyon_wash: 'Dry Wash',
    canyon_mesa: 'High Mesa',
    labyrinth_gate: 'The Maze Gate',
    labyrinth_heart: 'The Heart of the Maze',
    othrys_pass: 'Titan’s Pass',
    othrys_summit: 'The Black Summit',
    asphodel_ferry: 'Charon’s Landing',
    asphodel_gate: 'The Gates of Erebus',
  },
  // The open world: prompts, toasts, the map
  ow: {
    waystoneFound: 'Waystone found: {name}',
    waystoneUse: 'Waystone: travel',
    teleportTo: 'Travel to {name}',
    teleporting: 'Travelling to {name}…',
    notWithMonsters: 'Not with monsters this close',
    hostTravels: 'The host chooses where the party travels',
    map: {
      title: 'Map',
      waystones: 'Waystones',
      none: 'Find waystones to travel between them.',
      travel: 'Travel',
      close: 'Close',
      chapters: 'Chapters',
      quests: 'Quests',
      you: 'You',
      unknown: 'Unexplored',
      legend: '◆ waystone  ✦ chapter  ! quest  ▲ monster camp  ☠ champion  ◈ shrine',
      hint: 'Pick a waystone to travel there.',
    },
    chest: { open: 'Open the chest', found: 'Treasure!' },
    camp: { cleared: 'Monster camp cleared!', ambush: 'A monster camp!' },
    champion: { appears: '{name} appears!', defeated: '{name} is defeated!', title: 'Champion' },
    quest: {
      talk: 'Talk to {name}', accept: 'I’ll help', later: 'Not now', handIn: 'Here you go', ok: 'OK',
      nothing: 'Good luck out there, demigod.', allDone: 'Thanks again for everything.',
      accepted: 'New quest: {title}', completed: 'Quest complete: {title} (+{xp} XP)', pickUp: 'Pick up',
      none: 'No side quests yet. Look for people with a gold “!” over their heads.', doneShort: 'Done',
    },
    shrine: { start: 'Begin the trial', begin: 'The trial of {name} begins', wave: 'Wave {n} of {total}', won: 'Trial won!', rest: 'The shrine is resting', failed: 'The trial is lost' },
  },
  // ======================================================================
  // The world: monsters, bosses, mortal disguises, signs, levels, minigames, the Mist
  // ======================================================================
  monsters: {
    // Monsters (the Greek bestiary: enemy names shown over their health bars)
    pup: {
      name: 'Hellhound Pup',
    },
    rat: {
      name: 'Sewer Rat',
    },
    serpent: {
      name: 'Mist Serpent',
    },
    mortal: {
      name: 'Mortal',
    },
    spider: {
      name: 'Bronze Spider',
    },
    harpy: {
      name: 'Wild Harpy',
    },
    stymphalian: {
      name: 'Stymphalian Bird',
    },
    automaton: {
      name: 'Greek-Fire Automaton',
    },
    ghost: {
      name: 'Restless Spirit',
    },
    fury: {
      name: 'Fury',
    },
    dracaena: {
      name: 'Dracaena',
    },
    hellhound: {
      name: 'Hellhound',
    },
    empousa: {
      name: 'Empousa',
    },
    scorpion: {
      name: 'Giant Scorpion',
    },
    skeleton: {
      name: 'Skeleton Warrior',
    },
    spartoi: {
      name: 'Spartoi',
    },
    telekhine: {
      name: 'Telekhine',
    },
    karpos: {
      name: 'Karpos',
    },
    karpos_slinger: {
      name: 'Karpos Slinger',
    },
    colchis_calf: {
      name: 'Colchis Bull Calf',
    },
    myrmex: {
      name: 'Myrmex',
    },
    myrmex_spitter: {
      name: 'Myrmex Spitter',
    },
    boarlet: {
      name: 'Calydonian Boarlet',
    },
    crab: {
      name: 'Giant Crab',
    },
    king_crab: {
      name: 'King Crab',
    },
    basilisk: {
      name: 'Basilisk',
    },
    earthborn: {
      name: 'Earthborn',
    },
    daedalus_drone: {
      name: 'Daedalus Drone',
    },
    laistrygonian: {
      name: 'Laistrygonian',
    },
    shade: {
      name: 'Shade',
    },
    keres: {
      name: 'Ker',
    },
    gorgon_statue: {
      name: 'Living Statue',
    },
    cyclops: {
      name: 'Cyclops',
    },
  },
  bosses: {
    // Bosses: name, the banner title shown during the fight, then their battle toasts and callouts
    phase: 'PHASE {n}',
    aHero: 'A hero',
    alecto: {
      name: 'Alecto',
      title: 'ALECTO · THE KINDLY ONE',
      shriek: 'Mrs. Dodds draws a breath… get clear!',
      paralyzed: 'Paralyzed!',
    },
    minotaur: {
      name: 'The Minotaur',
      title: 'THE MINOTAUR',
      hornsStuck: 'His horns are stuck! Strike now!',
    },
    hellhound_alpha: {
      name: 'The Hellhound',
      title: 'THE HELLHOUND · SUMMONED INTO CAMP',
      howl: 'The hellhound howls for its pack!',
    },
    furies: {
      name: 'The Furies',
      title: 'THE KINDLY ONES · ALECTO, MEGAERA, TISIPHONE',
      sisters: [
        'Alecto',
        'Megaera',
        'Tisiphone',
      ],
      swoop: '{name} swoops in!',
      die: 'The Kindly Ones shriek and flee to the Underworld!',
    },
    medusa: {
      name: 'Medusa',
      title: 'MEDUSA · AUNTY EM',
      liftsVeil: 'Medusa lifts her veil — TURN AWAY!',
      lookAway: 'Look away!',
      petrified: 'Petrified!',
      turnedToStone: 'Turned to stone! Face away from her when her eyes glow.',
      statuesStir: 'Her statues stir!',
      die: 'Medusa is defeated. Whatever you do, don’t look at the head!',
    },
    chimera: {
      name: 'The Chimera',
      title: 'THE CHIMERA · ECHIDNA’S “CHIHUAHUA”',
    },
    spiders: {
      name: 'The Spider Queen',
      title: 'HEPHAESTUS’S SPIDERS · THE BRONZE QUEEN',
      dieSwarm: 'The queen falls — her swarm winds down!',
      die: 'The bronze queen falls!',
    },
    procrustes: {
      name: 'Procrustes',
      title: 'PROCRUSTES · CRUSTY’S WATER BED PALACE',
      pitch: '“Try the magic fingers! One size fits all!”',
      tipped: 'You tip Crusty onto his own bed!',
      freed: 'Freed!',
      straps: 'Crusty straps {name} to a water bed! Hit him, or mash to break free!',
      salesLines: [
        '“Special offer, today only!”',
        '“Lie down, you look tired!”',
        '“Perfect fit, guaranteed!”',
        '“Everyone fits in the end!”',
      ],
      die: 'Crusty is cut down to size!',
    },
    cerberus: {
      name: 'Cerberus',
      title: 'CERBERUS · GUARDIAN OF THE UNDERWORLD',
      sleepy: 'Cerberus’s heads droop… he’s sleepy! Strike now — double damage!',
      ball: 'If only someone had a red rubber ball…',
    },
    ares: {
      name: 'Ares',
      title: 'ARES · GOD OF WAR',
      roar: 'Ares roars for battle!',
      seaHeals: 'The sea heals you — and your blows land harder!',
      dieWounded: 'Ares is wounded in the heel',
      dieEnemy: '“You’ve made an enemy, kid.”',
    },
    luke: {
      name: 'Luke Castellan',
      title: 'LUKE CASTELLAN · BACKBITER',
      onGuard: 'Luke is on guard — don’t swing into his parry!',
      riposte: 'Riposte!',
      summons: 'Luke summons a giant scorpion!',
      parried: 'Parried',
      die: 'Luke falls back, wounded — “Kronos will rise!”',
    },
  },
  mortals: {
    // Mortals (people in the Mist: their names and the blurbs that describe them)
    teacher: {
      name: 'Mrs. Dodds',
      blurb: 'A pre-algebra teacher who looks at you like you owe her homework.',
    },
    student: {
      name: 'Student',
      blurb: 'Just a kid on the field trip. Probably.',
    },
    guard: {
      name: 'Museum Guard',
      blurb: 'Navy uniform, a peaked cap and a radio. Has seen everything. Not this.',
    },
    tourist: {
      name: 'Tourist',
      blurb: 'Sun hat, camera, and a smile that is slightly too wide.',
    },
    farmer: {
      name: 'Farmer',
      blurb: 'Out checking the fences in a thunderstorm. Odd.',
    },
    old_lady: {
      name: 'Old Lady',
      blurb: 'Knitting socks. Very large socks. With very sharp scissors.',
    },
    bellhop: {
      name: 'Bellhop',
      blurb: 'Welcome to the Lotus! Your stay is on the house. For ever.',
    },
    salesman: {
      name: 'Salesman',
      blurb: 'A big smile, a bigger handshake, and a deal you can’t refuse.',
    },
  },
  signs: {
    // Signs and painted lettering in the world (Greek letters until a hero reads them; \n starts a new line)
    // Camp Half-Blood border sign and the waystones along the road
    campBorder: 'CAMP HALF-BLOOD\nTHE ROAD WEST',
    newJersey: 'NEW JERSEY',
    greyhound: 'GREYHOUND',
    auntyEm: 'AUNTY EM’S',
    stLouis: 'ST. LOUIS',
    denver: 'DENVER',
    lasVegas: 'LAS VEGAS',
    lotus: 'LOTUS\nHOTEL & CASINO',
    nevada: 'NEVADA',
    losAngeles: 'LOS ANGELES',
    doa: 'DOA',
    santaMonica: 'SANTA MONICA',
    olympus: 'OLYMPUS',
    // Prologue: Manhattan and the museum steps
    yancyAcademy: 'YANCY ACADEMY',
    schoolBus: 'SCHOOL BUS',
    deli: 'DELI · BAGELS',
    hardHat: 'DANGER · HARD HAT AREA',
    subway86: '86 St  ·  SUBWAY',
    museum: 'AMERICAN MUSEUM OF NATURAL HISTORY',
    greekRoman: 'GREEK\n&\nROMAN',
    mythsHeroes: 'MYTHS\n&\nHEROES',
    // Chapter levels (turnpike, Aunty Em’s, the Arch, Waterland, the Lotus, Crusty’s, DOA, Santa Monica, Olympus)
    diner: 'DINER',
    exitTrenton: 'EXIT 13\nTRENTON',
    turnpike: 'NEW JERSEY\nTURNPIKE',
    snackBar: 'SNACK BAR',
    gnomeEmporium: 'AUNTY EM’S\nGARDEN GNOME EMPORIUM',
    archTram: 'GATEWAY ARCH\nTRAM TO THE TOP',
    waterland: 'WATERLAND',
    closed: 'CLOSED\nFOR THE SEASON',
    tunnelOfLove: 'TUNNEL OF LOVE',
    exit: 'EXIT',
    crustysNextExit: 'CRUSTY’S\nWATER BED PALACE\nNEXT EXIT',
    crustysPalace: 'CRUSTY’S\nWATER BED PALACE',
    crustys: 'CRUSTY’S',
    doaStudios: 'DOA\nRECORDING STUDIOS',
    santaMonicaPier: 'SANTA MONICA\nPIER',
    floor600: '600',
  },
  biomes: {
    // Place names and sub-titles of the levels (shown on the level banner)
    jujutsu_high: {
      name: 'Jujutsu High',
      sub: 'School Grounds · Night',
    },
    tokyo_night: {
      name: 'Ruined Tokyo',
      sub: 'Streets at Night',
    },
    cursed_forest: {
      name: 'Cursed Forest',
      sub: 'Where the Curses Nest',
    },
    flooded_subway: {
      name: 'Flooded Subway',
      sub: 'Toei Line · Abandoned',
    },
    shibuya: {
      name: 'Shibuya Station',
      sub: 'Halloween · The Incident',
    },
    camp: {
      name: 'Camp Half-Blood',
      sub: 'Long Island Sound · Summer',
    },
    manhattan: {
      name: 'Manhattan',
      sub: 'The Morning of the Field Trip',
    },
    museum: {
      name: 'The Museum',
      sub: 'Greek and Roman Galleries',
    },
    storm_hill: {
      name: 'Half-Blood Hill',
      sub: 'Long Island · Storm',
    },
    camp_woods: {
      name: 'The Camp Woods',
      sub: 'Capture the Flag · Night',
    },
    highway: {
      name: 'The New Jersey Turnpike',
      sub: 'The Kindly Ones · Rain',
    },
    statue_garden: {
      name: 'Aunty Em’s Garden Gnome Emporium',
      sub: 'New Jersey · Dusk',
    },
    arch: {
      name: 'The Gateway Arch',
      sub: 'St. Louis · 630 Feet Up',
    },
    waterland: {
      name: 'Waterland',
      sub: 'Denver · Closed for the Season',
    },
    casino: {
      name: 'The Lotus Hotel and Casino',
      sub: 'Las Vegas · Every Game Is Free',
    },
    desert: {
      name: 'The Nevada Desert',
      sub: 'Crusty’s Water Bed Palace',
    },
    underworld: {
      name: 'The Underworld',
      sub: 'DOA Recording Studios · The River Styx',
    },
    beach: {
      name: 'Santa Monica Beach',
      sub: 'Los Angeles · Dusk',
    },
    olympus: {
      name: 'Mount Olympus',
      sub: 'The Six-Hundredth Floor',
    },
  },
  minigames: {
    // Minigames at camp
    archery: {
      // Archery range
      name: 'Archery Range',
      intro: 'Shoot the targets! RT / right click · wind {wind}',
      go: 'Archery: 45 seconds — go!',
      windCalm: 'calm',
      windStrength: '{n} {arrow}',
      bullseye: 'BULLSEYE +{pts}',
      hudTitle: 'Archery · {n} s',
      hudStatus: 'Score {score} · streak {streak} · wind {wind} · camp record {record}',
      medal: {
        gold: 'Gold medal! ',
        silver: 'Silver medal! ',
        bronze: 'Bronze medal! ',
      },
      newBest: ' — new best!',
      result: '{medal}Score {score}{newBest} · +{drachmas} drachmas',
      campTitle: 'Camp Half-Blood',
      best: 'Archery best: {n}',
    },
    climb: {
      // Climbing wall
      ariaLabel: 'Climbing wall minigame',
      slipped: 'You slipped! Hold on when the wall shakes.',
      lava: 'Lava! Move to another handhold.',
      top: 'THE TOP',
      height: '{n} / {max} m',
      seconds: '{n} s',
      holdOn: 'HOLD ON! (A / Space)',
      controlsClimb: 'Stick / WASD: climb and change handholds',
      controlsHold: 'A / Space: hold on · Menu / Esc: give up',
      quit: 'You let go of the wall.',
      campRecord: ' — camp record!',
      won: 'You reached the top in {time} s{record} · +{drachmas} drachmas',
      lost: 'Out of time at {n} m. The lava wins this round.',
    },
  },
  mist: {
    // True Sight (the Mist)
    tooThick: 'The Mist is too thick — wait a moment',
    closes: 'The Mist closes in again',
    parts: 'The Mist parts — a hidden way!',
  },
  enemies: {
    // Enemies and fighters
    trainingDummy: 'Training Dummy',
    // Elite prefixes shown before a monster’s name
    affix: {
      swift: 'Swift',
      armored: 'Armored',
      vampiric: 'Vampiric',
      explosive: 'Explosive',
      shadow: 'Blinking',
    },
    bonesHint: 'The bones are pulling back together. Hit them before it gets up!',
    // What mortals in the Mist say when a hero swings at them
    scold: {
      teacher: [
        'Young man! Detention!',
        'I beg your pardon?!',
        'I’m telling Mr. Brunner!',
        'That is quite enough!',
      ],
      student: [
        'Hey! Watch it!',
        'Dude, what?!',
        'I’m telling Mr. Brunner!',
        'Ow! Weirdo!',
      ],
      tourist: [
        'Excuse me?!',
        'Hey, I’m taking a picture here!',
        'How rude!',
        'Is this some kind of show?',
      ],
      guard: [
        'No horseplay in the museum!',
        'Hands to yourself, kid.',
        'Do I need to call your teacher?',
        'Walk, don’t swing!',
      ],
      old_lady: [
        'Well, I never!',
        'Mind your manners, dear!',
        'Young people these days!',
        'I’ll knit you some manners!',
      ],
      bellhop: [
        'Sir! Please!',
        'Easy there, valued guest!',
        'Have a lotus and calm down.',
        'No roughhousing in the lobby!',
      ],
      farmer: [
        'Hey now!',
        'Watch where you swing that thing!',
        'Get off my land!',
      ],
      salesman: [
        'Whoa there, friend!',
        'No touching the merchandise!',
        'Is that how you haggle?',
      ],
    },
    // Hero callouts (player.js)
    player: {
      dodged: 'Dodged',
      battleSense: 'Battle Sense!',
      down: '{name} is down! Stand close to revive',
      defaultName: 'Player {n}',
      ambrosia: 'Ambrosia',
    },
  },

  // ======================================================================
  // Menus: instructions, settings, saves and profiles, controls, the debug menu
  // ======================================================================
  // How to Play (js/ui/instructions.js)
  instructions: {
    title: 'Instructions',
    heading: 'How to Play',
    scrollHint: 'Scroll: stick, D-pad, arrow keys or mouse wheel · B or Esc to close',
    close: 'Close',
    quest: {
      heading: 'Your quest',
      objective: '**Objective. **You are a demigod. Clear each chapter: defeat the monsters, see through the Mist, solve the myth that beats the boss, and fulfil the prophecy line by line. Between quests you train at Camp Half-Blood.',
      winning: '**Winning. **Finish the chapter\'s goal, defeat its boss and reach the exit. **Losing. **If every hero is knocked out, the chapter ends and you can try again. Monsters burst into golden dust, and nobody gets hurt for real.',
      heroes: '**Heroes. **Every hero plays differently: a melee combo, a ranged move, three abilities, a dodge roll and a godly power. Play alone with up to two companions, or with up to four players on one screen.',
    },
    tips: {
      heading: 'Tips',
      trueSight: '**True Sight** (click the right stick, or V) rewrites the world in the gods\' gold-and-teal style. Disguised monsters show their true form, and hidden doors and paths appear. It drains the Sight meter and refills in the Mist.',
      battleSense: '**Battle Sense. **Dodge the instant before a hit lands and time slows for the whole team. A meter stops it being spammed; you can switch it off in Settings.',
      switching: '**Switching heroes. **Playing alone, press D-pad ↓ (or F) to take over a companion. Held, it opens a radial menu.',
      reviving: '**Reviving. **A downed teammate can be revived: stand next to them until the ring fills.',
      godly: '**Godly power. **Fighting fills the Power bar. When it is full, press Y + LB together (or 4) to unleash your hero\'s godly power.',
      ambrosia: '**Ambrosia** (LT, or E) heals about two thirds of your health. You carry one square: after a bite it refills over about 20 seconds, shown round its icon, and the icon glows when it\'s ready and you\'re hurt. Gear with Hebe\'s Cup refills it faster. Collect drachmas to spend at the camp store.',
      ammo: '**Ammo. **The ranged attack (RT, or right click) shoots from a quiver of 20 (knives, water, notes… the count is next to its icon). A second after you stop shooting it refills, one shot every couple of seconds, and ammo bundles dropped by monsters, crates and chests top it up. Abilities don\'t use ammo.',
      gear: '**Gear. **Press D-pad ↑ (or I) to open the inventory: equip what you find, spend enchantment points and salvage the rest. The forge in camp tempers and re-rolls items.',
    },
    pad: {
      heading: 'Xbox controller',
      aria: 'Xbox controller diagram. Left stick moves, click it to show the way. Right stick flicks a dodge, click it for True Sight. A jump, and interact when a prompt shows. X melee attack, in the air a jump slam. Y, LB and RB abilities 1, 2 and 3; Y plus LB together godly power. B dodge forward. LT Ambrosia, RT ranged. D-pad up inventory, down switch hero, left and right magic items. View map, Menu pause.',
      leftStick: 'Left stick',
      dpad: 'D-pad',
      rightStick: 'Right stick',
      rightStickFlick: 'Flick to dodge',
      rightStickAim: '(or aim: Settings)',
      rightStickClick: 'click: True Sight',
      melee: 'Melee attack',
      meleeSub: 'In the air: jump slam',
      view: 'View',
      viewMap: 'Map',
      menu: 'Menu',
      menuPause: 'Pause',
    },
    callouts: {
      lt: 'Ambrosia (heal)',
      lb: 'Ability 2',
      lbSub: 'Y + LB together: godly power',
      leftStick: 'Move',
      leftStickSub: 'click: show the way',
      dpad: '↑ Inventory',
      dpadSub: ['↓ Switch hero', '← → Magic items'],
      rt: 'Ranged attack',
      rb: 'Ability 3',
      y: 'Ability 1',
      b: 'Dodge forward',
      a: 'Jump',
      aSub: 'Interact when a prompt shows',
    },
    controls: {
      heading: 'Controls',
      action: 'Action',
      controller: 'Xbox controller',
      keyboard: 'Keyboard and mouse',
    },
    // [action, Xbox controller, keyboard and mouse]
    table: [
      ['Move', 'Left stick', 'W A S D (or the arrow keys)'],
      ['Aim', 'Auto-aim (right stick in Settings → aim)', 'Mouse'],
      ['Melee attack', 'X', 'Left click'],
      ['Attack in place (stand still, face the cursor)', '—', 'Hold Shift'],
      ['Jump slam', 'X in the air after a jump', 'Q'],
      ['Jump', 'A', 'Space'],
      ['Ranged attack', 'RT', 'Right click'],
      ['Dodge (perfect dodge triggers Battle Sense)', 'B (forward), or flick the right stick (that way)', 'R or Mouse 4 (toward the cursor), Mouse 5 (forward)'],
      ['Abilities 1 · 2 · 3', 'Y · LB · RB', '1 · 2 · 3'],
      ['Godly power (when the Power bar is full)', 'Y + LB together', '4, or 1 + 2 together'],
      ['True Sight (see through the Mist)', 'Click the right stick', 'V'],
      ['Show the way to the goal', 'Click the left stick', 'Middle click'],
      ['Interact (talk, open, use)', 'A when a prompt shows', 'Left click when a prompt shows'],
      ['Ambrosia (heal)', 'LT', 'E'],
      ['Switch hero (hold for a radial)', 'D-pad ↓', 'F'],
      ['Magic items', 'D-pad ← · →', 'Z · X'],
      ['Inventory (equip, enchant, salvage)', 'D-pad ↑', 'I or Tab'],
      ['Map (in camp: the chapter map)', 'View', 'M (chapter map: J)'],
      ['Pause', 'Menu', 'Esc'],
      ['Turn the camera (if on in Settings)', '—', '[ · ]'],
      ['Menus', 'D-pad or left stick, A confirm, B back', 'Arrow keys or WASD, Enter, Esc, or the mouse'],
    ],
    together: {
      heading: 'Playing together',
      join: 'On the hero screen each player presses **A** or **Start** on their own controller to join (the keyboard player presses Enter). Pick a hero, press A to be ready. During play a controller can join by pressing Start.',
      touch: '**Touch. **On a phone or tablet drag on the left to move; the buttons on the right attack, dodge and use abilities. Play in landscape.',
    },
  },

  // Settings (title and pause menu; js/ui/settingsScreen.js)
  settings: {
    title: 'Settings',
    done: 'Done',
    tabs: { audio: 'Audio', game: 'Gameplay', graphics: 'Graphics', data: 'Data' },
    // Audio tab
    audio: {
      master: 'Master volume',
      music: 'Music',
      sfx: 'Sound effects',
      vibration: 'Controller vibration',
    },
    // Gameplay tab
    game: {
      shake: 'Screen shake',
      off: 'Off',
      hitstop: 'Hit-stop pauses',
      slowmo: 'Slow-motion moments',
      battleSense: 'Battle Sense (slow time on a perfect dodge)',
      greekText: 'Greek letters on titles and signs (they settle into English)',
      reduceMotion: 'Reduce motion',
      damageNumbers: 'Damage numbers',
      rightStick: 'Controller right stick',
      rightStickDodge: 'Dodge (flick to roll)',
      rightStickAim: 'Aim',
      cameraRotate: 'Camera rotation ([ / ])',
      zoom: 'Default zoom',
    },
    // Graphics tab
    graphics: {
      info: 'GPU: {gpu} · Backend: {backend} · Detected tier: {tier}',
      quality: 'Quality',
      auto: 'Auto ({tier})',
      webgl2: ' (WebGL2)',
      dynRes: 'Dynamic resolution',
      motionBlur: 'Motion blur (Ultra)',
      showFps: 'Show FPS / mode',
      forceWebGL: 'Force WebGL2 (reload)',
      hint: 'Ultra uses WebGPU: light bounce, reflections, soft shadows and depth of field. High: soft shadows, ambient occlusion, bloom and water reflections. Resolution drops automatically before effects if FPS falls below target.',
      photoMode: 'Photo mode',
      reload: 'Reload to apply',
    },
    // Data tab
    data: {
      hint: 'Settings are saved in this browser. Your progress (heroes, drachmas, completed chapters) is saved separately.',
      resetSettings: 'Reset settings',
      resetToDefaults: 'Reset to defaults',
      settingsReset: 'Settings reset',
      saves: 'Saves',
      savesButton: 'Saves…',
      opening: 'The opening',
      skipButton: 'Skip the opening…',
      skipTitle: 'Skip the opening?',
      skipText: 'You go straight to Camp Half-Blood. Chapters 1 and 2 can still be played from their quest markers and the chapter map.',
      skipYes: 'Skip to camp',
      skipNo: 'Keep the story',
      skipped: 'The opening is skipped: welcome to camp',
      debug: 'Debug (jump to any scene; nothing is saved)',
      debugMenu: 'Debug menu',
      scenes: 'Scenes…',
      erase: 'Erase progress',
      resetSave: 'Reset save…',
      eraseTitle: 'Erase all progress?',
      eraseText: 'The main profile of the active save loses its heroes, drachmas, loot and completed chapters. This cannot be undone.',
      eraseYes: 'Erase everything',
      eraseNo: 'Keep my progress',
      erased: 'Progress erased',
    },
  },

  // Save slots (js/ui/saves.js, js/slots.js)
  saves: {
    title: 'Saves',
    intro: 'Each save is a whole game: every player’s progress and where to continue from. Continue on the title plays the active save.',
    done: 'Done',
    back: 'Back',
    // Continue / new game after Press Start
    continue: 'Continue: {where}',
    theStory: 'the story',
    yourQuest: 'your quest',
    yourSave: 'Your save',
    openingSaved: 'The opening · saved {when}',
    difficultySaved: 'Difficulty {n} · saved {when}',
    play: 'Play',
    returnToCamp: 'Return to camp',
    chooseHeroes: 'Choose heroes',
    newGame: 'New game',
    newGameTitle: 'Start a new game?',
    newGameStartText: 'A new save is made, and the story starts from the beginning: a school morning in Manhattan. Your other saves stay as they are, and you can switch between them in Settings → Saves.',
    newGameText: 'A new save is made and becomes active. Your other saves stay as they are.',
    newGameToast: 'New game: {name}',
    skipButton: 'New game (skip the opening)',
    skipTitle: 'New game, skipping the opening?',
    skipText: 'A new save is made that starts in Camp Half-Blood, with chapters 1 and 2 still to play from their quest markers. Your other saves stay as they are.',
    skipYes: 'New game in camp',
    savesButton: 'Saves…',
    // Saves list
    nameOf: 'Name of {name}',
    activePrefix: '★ active · ',
    summary: 'made {created} · played {played} · {time} · {chapters}',
    chapters: { one: '{n} chapter', other: '{n} chapters' },
    minutes: '{m} min',
    hoursMinutes: '{h} h {m} min',
    makeActive: 'Make active',
    playing: 'Playing {name}',
    switchTitle: 'Switch saves?',
    switchText: 'You go back to the title, and Continue then plays this save. Your progress so far is saved.',
    switchYes: 'Switch',
    delete: 'Delete',
    deleteTitle: 'Delete {name}?',
    deleteText: 'All of its progress is deleted for good. Your other saves stay.',
    deleteYes: 'Delete',
    deleteNo: 'Keep it',
    deleted: '{name} deleted',
    // Default names
    defaultFirst: 'Save 1',
    defaultNumbered: 'Save {n}',
    defaultName: 'Save',
  },

  // Default player names (js/profiles.js, js/save.js, js/slots.js)
  profiles: {
    player1: 'Player 1',
    playerN: 'Player {n}',
    playerBase: 'Player',
    demigod: 'Demigod',
  },

  // Controller and keyboard labels shown in hints (js/padmap.js)
  controls: {
    view: 'View',
    menu: 'Menu',
    xAir: 'X (air)',
    click: 'Click',
    space: 'Space',
    shift: 'Shift',
    esc: 'Esc',
  },

  // Debug menu (js/ui/debugMenu.js)
  debug: {
    badge: 'DEBUG · nothing is saved',
    scenes: 'Scenes',
    leave: 'Leave',
    ariaLabel: 'Debug',
    title: 'Debug: jump to a scene',
    hint: 'Jumping starts a test session that saves nothing (your save is left as it is). Leave debug, or reload, to get back to it.',
    hintSandbox: 'Debugging: nothing is being saved. Leave debug to get your save back as it was.',
    opening: 'The opening (the story heroes; cutscenes marked 🎬)',
    camp: 'Camp',
    campButton: 'Camp Half-Blood',
    hero: 'Hero',
    difficulty: 'Difficulty',
    options: 'Options',
    cardsFirst: 'Story cards first',
    startAtBoss: 'Start at the boss',
    toggle: '{label}: {state}',
    on: 'on',
    off: 'off',
    chapters: 'Chapters',
    noBossJumpSuffix: ' (no boss jump)',
    noBossJump: 'This chapter’s boss has its own way in: starting at the beginning',
    aloneOnly: 'Debug jumps are for playing alone (leave the online room first)',
    leaveDebug: 'Leave debug',
    close: 'Close',
  },

  // Continuing a saved game (js/resume.js)
  resume: {
    story: 'Continuing the story',
    checkpoint: 'Continuing from the last checkpoint',
  },

  // ======================================================================
  // The game itself: loading, camp, results, online play, party, photo mode
  // ======================================================================
  // Loading screen, camp, toasts and results (js/main.js)
  game: {
    loading: {
      gpu: 'Detecting GPU…',
      textures: 'Painting textures…',
      camp: 'Building Camp Half-Blood…',
      shaders: 'Compiling shaders…',
      scrolls: 'Unrolling the scrolls…',
      ready: 'Ready',
    },
    failedToStart: 'Failed to start: {error} — your browser needs WebGPU or WebGL2.',
    // Camp Half-Blood
    camp: {
      name: 'Camp Half-Blood',
      objective: 'Big House porch: the chapter map · Camp store · Forge: gear · Chiron: training',
      training: 'Training: call up monsters',
      chapterMap: 'Chapter map',
      store: 'Camp store',
      forge: 'The Forge: temper and enchant gear',
      forgeInventory: 'Forge and inventory',
      chiron: 'Train with Chiron',
      archery: 'Archery range',
      climbing: 'Climbing wall',
      oracle: 'The Oracle',
      cabin: '{parent}\'s cabin: play as {name}',
      iris: 'Iris message: play online',
      irisActive: 'Iris message: online play',
    },
    gearHintPad: 'View: inventory · A: jump',
    gearHintKeys: 'I: inventory · Space: jump',
    nextQuest: 'Next quest: {title}',
    hold: '(hold)',
    // Heroes and chapters
    aHero: 'A hero',
    youAre: 'You are {name}',
    isDown: '{name} is down — revive them!',
    joinsQuest: '{name} joins your quest!',
    hostChooses: 'The host chooses the chapter',
    stillBeingWritten: 'That chapter is still being written',
    chapterSub: 'Chapter {num} · {place}',
    mistThick: 'The Mist is thick here. Click the right stick (V) to see through it.',
    mistSee: 'Click the right stick (V) to see through the Mist.',
    waitingForHost: 'Waiting for the host to return to camp',
    wave: 'Wave {n}',
    levelUp: 'LEVEL {level}! +1 enchantment point, +1 skill point',
    levelUpNamed: '{name}: LEVEL {level}! +1 enchantment point, +1 skill point',
    tierOpen: 'New skills open in the skill tree: tier {tier}!',
    partyDefeated: 'Party defeated — respawning',
    revived: 'Revived',
    revivedRetry: 'Revived: try the fight again',
    // Players joining on controllers
    controllerConnected: 'Controller connected to Player 1',
    playerJoined: 'Player {n} joined',
    playerJoinedAs: 'Player {n} joined as {name}',
    // Results screen
    results: {
      chapterComplete: 'CHAPTER COMPLETE',
      questComplete: 'QUEST COMPLETE',
      defeated: 'DEFEATED',
      kills: 'Monsters defeated',
      time: 'Time',
      coins: 'Drachmas collected',
      secrets: 'Secrets found',
      noLoot: 'No loot this time.',
      retry: 'Retry',
      continueStory: 'Continue the story ▶',
      returnToCamp: 'Return to Camp Half-Blood',
    },
    // FPS readout (Settings → Graphics → Show FPS)
    readout: '{quality} · {backend}\n{fps} FPS · {res}x res\n{draws} draws · {lights} lights',
    readoutDps: '\nDummy DPS {dps}',
    // Graphics quality names (js/gfx/renderer.js)
    quality: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      ultra: 'Ultra · Ray Traced',
      unknownGpu: 'Unknown GPU',
    },
  },

  // Online play: the Iris Message screen, toasts and name tags (js/net/*.js)
  online: {
    roomTitle: '{name}\'s camp',
    aPlayer: 'A player',
    someone: 'Someone',
    // Toasts
    joined: '{name} joined',
    left: '{name} left',
    reconnected: 'Reconnected',
    reconnecting: 'Reconnecting…',
    offline: 'You are offline',
    connectionLost: 'Connection lost: reconnecting…',
    hostLeftNext: 'The host left. {name} is taking over…',
    hostLeftFinding: 'The host left. Finding a new host…',
    hostSilent: 'The host stopped answering: moving on…',
    nowHost: 'You are now the host',
    playerLeftAi: '{name} left: the AI plays {hero} on',
    takeOver: 'You take over {hero}',
    gotThereFirst: 'Someone else got there first',
    campFull: 'That camp already has four heroes.',
    wantsToSkip: '{name} wants to skip',
    trap: 'It’s a trap!',
    fatalToast: '{why} Playing on here offline.',
    fatal: {
      full: 'That camp is full.',
      not_found: 'That camp has closed.',
      taken: 'That code is in use.',
      unreachable: 'Could not reach the Iris network.',
      host_lost: 'Lost the host.',
      other: 'Disconnected ({reason}).',
    },
    // Connection status
    status: {
      connecting: 'Connecting…',
      open: 'Connected',
      reconnecting: 'Connection lost: reconnecting…',
      migrating: 'The host left: moving to the new host…',
      closed: 'Offline',
    },
    // Name tags over heads
    tag: {
      ai: '{hero} · AI',
      holding: ' (holding)',
      reconnecting: '{name} (reconnecting…)',
    },
    // Iris Message screen
    lobby: {
      title: 'Iris Message',
      intro: 'Toss a golden drachma into the rainbow and call your friends: up to {n} heroes across every screen, and players on one screen can play online together. Playing as {name}.',
      unavailable: 'Online play is not available here.',
      unreachable: 'Could not reach the Iris network.',
      youAreHost: 'you are the host',
      hostChooses: 'the host chooses the chapters',
      roomCode: 'Room code',
      thisScreen: ' · this screen',
      missing: ' · reconnecting…',
      companions: 'Companions: {names}',
      swapIn: ' (D-pad ↓ / F to swap in)',
      back: 'Back',
      closeCamp: 'Close my camp',
      leave: 'Leave',
      openCamp: 'Open my camp (host)',
      rejoin: 'Rejoin {title} ({code})',
      joinWithCode: 'Join with a code',
      codeFive: 'A room code has five letters',
      join: 'Join',
      friendsCamps: 'Friends’ camps',
      choose: 'Choose a camp to join:',
      noCamps: 'No open camps right now. Open yours and give a friend the code.',
      room: '{title} · {code} · {n} connected',
      full: ' (full)',
    },
  },

  // The party (js/party.js)
  party: {
    padDisconnected: 'Controller disconnected: reconnect it to carry on',
    aPlayer: 'A player',
    playerLeft: '{name} left: the AI plays {hero} for now',
    and: ' and ',
    join: { one: '{names} joins your party', other: '{names} join your party' },
  },

  // Godly power (js/domain.js)
  domain: {
    godlyPower: 'GODLY POWER',
  },

  // Photo mode (js/photo.js)
  photo: {
    preparing: 'Photo Mode · preparing path tracer…',
    building: 'Photo Mode · building BVH for {k}k triangles…',
    tracing: 'Photo Mode · path tracing · {n} / {max} samples',
    done: ' · done',
    unavailable: 'Photo Mode unavailable on this device: {error}',
    save: '💾 Save PNG',
    close: 'Close',
  },
};

// ---- the open world: Camp Half-Blood's people and side quests
const OW_CAMP = {
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

// ---- the open world: Strawberry Fields
const OW_FIELDS = {
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

// ---- the open world: the Camp Woods
const OW_WOODS = {
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

// ---- the open world: the North Shore
const OW_SHORE = {
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

// ---- the open world: the Red Canyon
const OW_CANYON = {
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

// ---- the open world: the Labyrinth
const OW_LABYRINTH = {
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

// ---- the open world: Mount Othrys
const OW_OTHRYS = {
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
    oth_gorgos: { name: 'Gorgos the Giant Chief' },
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
        'Uh-oh. The Cyclopes noticed their figures were missing. Their boss, the giant Gorgos, is furious.',
        'He sits on a throne made of old cars past the forge, waving a whole tree around and shouting.',
        'If he comes up here, the Hunters will have to fight him anyway. Better you get there first?',
      ],
      steps: ['Find Gorgos’s junk throne', 'Defeat Gorgos the Giant Chief', 'Go back to Bianca'],
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

// ---- the open world: the Fields of Asphodel
const OW_ASPHODEL = {
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

// ---- the open world: the Road West: its stretches, waystones, rides, the taxi and the roadblocks
const RT = {
  regions: {
    rt_turnpike: { name: 'The New Jersey Turnpike', sub: 'Truck stops and a bus that never made it' },
    rt_auntyem: { name: "Aunty Em's", sub: 'Garden gnomes. Lots and lots of garden gnomes' },
    rt_river: { name: 'The River Crossing', sub: 'Bridge out: take the train' },
    rt_stlouis: { name: 'St. Louis', sub: 'Gateway to the West' },
    rt_plains: { name: 'The Great Plains', sub: 'Bridge out: take the train' },
    rt_denver: { name: 'Denver', sub: 'The Mile High City' },
    rt_rockies: { name: 'The Rockies Tunnel', sub: 'Trucks only' },
    rt_vegas: { name: 'Las Vegas', sub: 'What happens in the Lotus stays in the Lotus' },
    rt_desert: { name: 'The Nevada Desert', sub: 'Too hot to walk. Grab a taxi' },
    rt_la: { name: 'Los Angeles', sub: 'The City of Angels (and the way down)' },
    rt_santamonica: { name: 'Santa Monica', sub: 'The end of the road' },
  },
  waystones: {
    rt_busstop: 'Turnpike Bus Stop', rt_truckstop: 'Jersey Pike Plaza', rt_auntyem: "Aunty Em's", rt_amtrak_east: 'Amtrak Station (East)',
    rt_stlouis: 'St. Louis Station', rt_arch: 'The Gateway Arch', rt_stl_west: 'St. Louis West Station',
    rt_denver: 'Denver', rt_truckstop_west: 'Mountain Pass Truck Stop', rt_vegas: 'The Strip', rt_taxirank: 'Lotus Taxi Rank',
    rt_crustys: "Crusty's", rt_la: 'Los Angeles', rt_santamonica: 'Santa Monica Beach',
  },
  places: {
    rt_pikeplaza: 'Jersey Pike Plaza', rt_emporium: "Aunty Em's Garden Gnome Emporium", rt_gatewayarch: 'The Gateway Arch',
    rt_waterland: 'Waterland', rt_diner: 'The Roadside Diner', rt_lotus: 'The Lotus Hotel and Casino', rt_desert: 'The Nevada Desert',
    rt_crustys: "Crusty's Water Bed Palace", rt_doa: 'DOA Recording Studios', rt_pier: 'Santa Monica Pier', rt_olympus: 'The Way Home',
  },
  rt: {
    area: 'The Road West',
    signs: {
      amtrak: 'AMTRAK', pikePlaza: 'JERSEY PIKE PLAZA', auntyEm: "AUNTY EM'S GARDEN GNOME EMPORIUM", arch: 'GATEWAY ARCH',
      waterland: 'WATERLAND', truckStop: 'TRUCK STOP', lotus: 'LOTUS HOTEL & CASINO', crustys: "CRUSTY'S WATER BED PALACE",
      doa: 'DOA RECORDING STUDIOS', santaMonica: 'SANTA MONICA', busStop: 'BUS STOP', bridgeOut: 'BRIDGE OUT', trucksOnly: 'TRUCKS ONLY',
      greyhound: 'GREYHOUND',
    },
    bus: {
      board: 'Take the Greyhound west',
      boardHome: 'Take the bus back to camp',
      leaving: 'All aboard! Next stop: New Jersey.',
      leavingHome: 'Back to Camp Half-Blood.',
      arrive: 'The Road West',
    },
    ride: {
      train: 'Board the train', truck: 'Hop in the back of the zoo truck',
      trainTo: 'Board the train to {name}', truckTo: 'Hop in the zoo truck to {name}',
      riding: 'Riding to {name}… (press A or click to look around)',
      arrived: '{name}',
      calling: 'Here it comes…',
    },
    drive: {
      get: 'Drive the taxi', out: 'Park and get out', hint: 'Steer with the stick or WASD. Drive west to Los Angeles!',
      noExit: 'Not out here: it\'s 115 degrees. Keep driving!', bump: 'Bump!',
    },
    block: {
      wreck: 'The burning Greyhound blocks the road. (Chapter 4 clears it)',
      statues: 'A wall of stone statues blocks the road. (Chapter 5 clears it)',
      bridge: 'The lift bridge is up. (Chapter 6 lowers it)',
      rocks: 'A rockslide blocks the pass. (Chapter 7 clears it)',
      gate: 'The Lotus gates are shut. (Chapter 8 opens them)',
      beds: 'A heap of waterbeds blocks the road. (Chapter 9 clears it)',
      shadow: 'A wall of shadow blocks the road. (Chapter 10 lifts it)',
      opens: 'The road is open!',
    },
    gate: { foot: 'You can\'t cross this on foot.', train: 'Bridge out. Take the train from the station.', truck: 'The tunnel is trucks only. The zoo truck at the truck stop is heading west…', drive: 'Too hot and too far to walk. Grab a taxi at the rank.' },
    map: { startsOnRoad: 'On the Road West: {place}', roadWest: 'The Road West', camp: 'Camp Half-Blood and around', otherArea: 'Travelling there takes the bus.' },
  },
};

// ---- the open world: the Road West's eastern stops (the Turnpike, Aunty Em's, St. Louis, Denver)
const RT_EAST = {
  places: {
    rt_tollplaza: 'Turnpike Toll Plaza', rt_drachmainn: 'The Drachma Inn',
    rt_petesgas: 'Pete’s Last Gas', rt_pruittfarm: 'The Pruitt Farm',
    rt_grandhotel: 'The Gateway Grand Hotel', rt_ravioli: 'Tony’s Toasted Ravioli', rt_ballpark: 'River City Ballpark',
    rt_railyard: 'The Rail Yard', rt_gatewaymotel: 'The Gateway Motel',
    rt_tunneloflove: 'The Tunnel of Love', rt_milehigh: 'The Mile High Motor Lodge', rt_mountainpass: 'Mountain Pass Truck Stop',
  },
  people: {
    rt_turnpike_earl: 'Big Earl, Trucker',
    rt_auntyem_pruitt: 'Mrs. Pruitt',
    rt_stlouis_mae: 'Ranger Mae',
    rt_denver_chad: 'Chad, Ex-Lifeguard',
  },
  champions: {
    rt_turnpike_diesel: { name: 'Diesel, the Turnpike Hound' },
    rt_auntyem_hissy: { name: 'Hissy Lou, Queen of the Corn' },
    rt_stlouis_widow: { name: 'Old Silk, the Rail Yard Widow' },
    rt_denver_rigor: { name: 'Captain Rigor, Skeleton Lifeguard' },
  },
  sq: {
    // ---------------- the Turnpike: Big Earl
    rt_turnpike_chickens: {
      title: 'Lost Load',
      offer: [
        'Kid, you would not believe my morning. Bird-ladies. Big ugly ones. They tore the back off my trailer like it was a bag of chips.',
        'I was hauling rubber chickens. Five crates. Don’t ask who orders that many rubber chickens. A guy in a cave, apparently.',
        'They dropped them all over the Turnpike. Find five for me? They squeak, so you’ll hear them.',
      ],
      steps: ['Find Earl’s rubber chickens: {n}/{count}', 'Bring the chickens back to Big Earl'],
      thanks: [
        'Squeak! Ha! That’s the sound of me getting paid.',
        'Here. Buy yourself a milkshake. Buy two. You look like you’re walking to California.',
      ],
    },
    rt_turnpike_nest: {
      title: 'Bird Ladies',
      offer: [
        'Those bird-ladies built a nest in the woods north of the road. Right behind a billboard. Who builds a nest behind a billboard?',
        'And there are little red-eyed dogs chewing the tyres off every rig in the lot. Every. Single. Rig.',
        'Clear out that nest, and chase off a few of those puppies while you’re at it.',
      ],
      steps: ['Clear out the harpy nest behind the billboard', 'Chase off hellhound pups on the Turnpike: {n}/{count}', 'Tell Big Earl the lot is safe'],
      thanks: [
        'Quiet. Real quiet. I almost miss the squawking. Almost.',
        'You’re all right, kid. Take this. It’s the good kind of souvenir: the kind that’s sharp.',
      ],
    },
    rt_turnpike_diesel: {
      title: 'Diesel',
      offer: [
        'One more thing, and then I’ll let you go. There’s a dog. A big one. Bigger than my cab.',
        'Truckers call him Diesel. He sleeps in the woods behind the toll plaza and he eats exhaust pipes for breakfast.',
        'Go past the toll plaza, find his clearing, and… do whatever it is you kids do. With the swords.',
      ],
      steps: ['Go to the toll plaza', 'Beat Diesel, the Turnpike Hound', 'Tell Big Earl the road is clear'],
      thanks: [
        'You beat Diesel? With that little sword? Remind me never to cut you off in traffic.',
        'Take this. I found it in his clearing years ago. It hums. I don’t like things that hum.',
      ],
    },
    // ---------------- Aunty Em's: Mrs. Pruitt
    rt_auntyem_gnomes: {
      title: 'Gnome Sweet Gnome',
      offer: [
        'Oh, dearie, you look like you have good young eyes. My garden gnomes have gone walking again.',
        'Every night they wander off towards that Emporium down the road. I don’t like that place. Everyone who goes in comes out… heavier.',
        'Five gnomes. Red hats, blue hats, one with a fishing rod. Fetch them home before they get any ideas?',
      ],
      steps: ['Find Mrs. Pruitt’s gnomes: {n}/{count}', 'Bring the gnomes home to Mrs. Pruitt'],
      thanks: [
        'There they are, my little rascals. Look at their faces. They look relieved.',
        'Take this for your trouble. And don’t eat the burgers at Aunty Em’s. Nobody ever finishes one.',
      ],
    },
    rt_auntyem_barn: {
      title: 'Something in the Barn',
      offer: [
        'Now there’s something in my barn. Lots of legs. Too many legs. My cow has gone to live with the neighbours.',
        'Clear the barn out for me, and squash a few of those leggy things while you’re about it.',
      ],
      steps: ['Clear the monsters out of the red barn', 'Beat spiders round Aunty Em’s: {n}/{count}', 'Tell Mrs. Pruitt the barn is safe'],
      thanks: [
        'Oh, well done! Daisy can come home. She’ll be so pleased. She doesn’t show it. She’s a cow.',
        'Here: I found this in the hayloft years ago. I always knew it was waiting for somebody.',
      ],
    },
    rt_auntyem_corn: {
      title: 'Hissy Lou',
      offer: [
        'Last thing, dearie, and it’s a big one. Something hisses in my corn.',
        'It has a woman’s face and two snakes where legs ought to be, and it calls itself the Queen of the Corn. My corn!',
        'Go into the field and send her packing. Mind the stalks. They’re very nearly ready.',
      ],
      steps: ['Go into the corn field', 'Beat Hissy Lou, Queen of the Corn', 'Go back to Mrs. Pruitt'],
      thanks: [
        'Queen of the Corn, my foot. You showed her.',
        'Take this, and a bag of corn for the road. It’s a long way to anywhere from here.',
      ],
    },
    // ---------------- St. Louis: Ranger Mae
    rt_stlouis_birds: {
      title: 'Bird Brains',
      offer: [
        'Welcome to the Gateway Arch! Six hundred and thirty feet of stainless steel. Please don’t climb it. People keep trying.',
        'We have a bird problem. Bronze birds. They peck the Arch and it goes “bonnnng”. All. Day. Long.',
        'Chase six of them out of St. Louis and I’ll find you something nicer than a souvenir keychain.',
      ],
      steps: ['Beat Stymphalian birds in St. Louis: {n}/{count}', 'Tell Ranger Mae the birds are gone'],
      thanks: [
        'Listen. No bonnnng. Beautiful.',
        'Here you go. It isn’t a keychain. I promise. Okay, there’s a keychain too.',
      ],
    },
    rt_stlouis_tickets: {
      title: 'Ticket to Ride',
      offer: [
        'Next problem: the wind blew away a stack of tram tickets. The trams are the little egg-shaped cars that go up the legs.',
        'Four tickets. I saw them fly towards the rail yard, the ballpark, the alleys downtown and the ponds in the park.',
      ],
      steps: ['Find the tram tickets: {n}/{count}', 'Bring the tickets back to Ranger Mae'],
      thanks: [
        'All four! Not even creased. You should be a ranger.',
        'Take this. And keep one ticket. You never know when you’ll need to get somewhere high up in a hurry.',
      ],
    },
    rt_stlouis_widow: {
      title: 'The Rail Yard Widow',
      offer: [
        'The night guard at the rail yard quit. He says there’s a spider down there the size of a boxcar. He says she knits.',
        'I don’t believe him. But I also don’t want to go and look.',
        'Clear the rail yard for me, and if there really is a big one, deal with her.',
      ],
      steps: ['Clear the monsters out of the rail yard', 'Beat Old Silk, the Rail Yard Widow', 'Go back to Ranger Mae'],
      thanks: [
        'She was real? And she knitted? I owe that guard an apology. And a sweater, probably.',
        'Here: the best thing in the lost-and-found. It has been waiting for a hero for a very long time.',
      ],
    },
    // ---------------- Denver: Chad
    rt_denver_floaties: {
      title: 'Floatie Patrol',
      offer: [
        'Hey. Hey, dude. I’m Chad. I was a lifeguard here. Then Waterland closed. I didn’t really… leave.',
        'Nobody ever picked up the floaties. Five of them, all over the park. It’s been bugging me for, like, three years.',
        'Could you grab them? The gate’s chained, but the chain is mostly decorative.',
      ],
      steps: ['Collect the lost floaties in Waterland: {n}/{count}', 'Bring the floaties back to Chad'],
      thanks: [
        'Duuude. That’s all of them. Safety first.',
        'Take this. Employee of the Month, three years running. Because nobody else works here.',
      ],
    },
    rt_denver_hounds: {
      title: 'No Dogs in the Pool',
      offer: [
        'Big black dogs keep coming down off the mountain and drinking out of the wave pool. With bony guys. Walking guys made of bones.',
        'There’s a whole pack up the slope north of the motel. Rule one of Waterland: no dogs in the pool.',
      ],
      steps: ['Clear the camp on the mountainside', 'Beat hellhounds round Denver: {n}/{count}', 'Tell Chad the pool is dog-free'],
      thanks: [
        'You did it! The pool is officially dog-free. Still closed. But dog-free.',
        'Here, dude. I found it in the lost-and-found. It was next to a single flip-flop.',
      ],
    },
    rt_denver_rigor: {
      title: 'Captain Rigor',
      offer: [
        'Okay. Don’t freak out. There’s a skeleton in a lifeguard whistle patrolling the wave pool. He keeps blowing it at me.',
        'He says I’m “running on the deck”. I am not running. I am walking briskly.',
        'Go to the wave pool and tell him his shift is over. Forever.',
      ],
      steps: ['Go to the wave pool', 'Beat Captain Rigor, Skeleton Lifeguard', 'Go back to Chad'],
      thanks: [
        'No more whistle. Dude. You are the best lifeguard this park ever had, and you never even got a chair.',
        'Take this. It’s the last thing in Waterland worth having. Except the slide. The slide is still awesome.',
      ],
    },
  },
  rt: {
    signs: {
      // the Turnpike
      tpGantryL: 'WEST\nI-78 · ALL POINTS WEST', tpGantryR: 'ST. LOUIS 950\nLOS ANGELES 2,790',
      tpToll: 'TOLL · EXACT CHANGE\nNO DRACHMAS', tpOffice: 'OFFICE', tpDrachmaInn: 'DRACHMA INN\nVACANCY · COLOR TV',
      tpDiner: 'DINER · OPEN 24 HRS', tpGas: 'GAS · SNACKS · ICE',
      tpDelphi: 'DELPHI STRAWBERRY SERVICE', tpHermesExpress: 'HERMES EXPRESS\nWE DELIVER. EVENTUALLY.', tpMonsterDonut: 'MONSTER DONUT\nNOW WITH MORE MONSTERS',
      tpBbStrawberries: 'DELPHI STRAWBERRIES\nPICKED BY SATYRS · 2 MI', tpBbAuntyEm: 'AUNTY EM’S GARDEN GNOMES\nSTATUES! BURGERS! · 40 MI',
      tpBbHermes: 'LOST SOMETHING?\nHERMES EXPRESS FINDS IT', tpBbCrustys: 'CRUSTY’S WATER BED PALACE\nONE SIZE FITS ALL · 2,600 MI',
      tpSpeed: 'SPEED\nLIMIT\n65', tpAccidentAhead: 'ACCIDENT\nAHEAD',
      // Aunty Em's
      aeBurgers: 'BURGERS', aeSmile: 'SMILE!', aeAuntyEmRoad: 'AUNTY EM’S\nGNOMES · STATUES · BURGERS',
      aePetesGas: 'PETE’S\nLAST GAS FOR 40 MI', aeCorn: 'FRESH CORN · NOT A TRAP',
      aeGantryL: 'AUNTY EM’S\nNEXT RIGHT', aeGantryR: 'ST. LOUIS 870\nAMTRAK STATION 2',
      aeBbPhoto: 'AUNTY EM’S\nFREE PHOTO WITH EVERY BURGER', aeBbHungry: 'YOU ARE GETTING\nVERY HUNGRY…', aeBbTrain: 'BRIDGE OUT AHEAD\nTAKE THE TRAIN',
      // St. Louis
      stlArchMuseum: 'MUSEUM · TRAM TO THE TOP', stlNoSwimming: 'MISSISSIPPI RIVER\nNO SWIMMING', stlHotel: 'GATEWAY GRAND HOTEL',
      stlRavioli: 'TONY’S TOASTED RAVIOLI', stlBallpark: 'RIVER CITY BALLPARK', stlScoreboard: 'HOME 0 · MONSTERS 3\nNEXT GAME: NEVER',
      stlGatewayMotel: 'GATEWAY MOTEL\nLAST BEDS BEFORE\nTHE PLAINS', stlLastGasPlains: 'LAST GAS BEFORE THE PLAINS',
      stlGantryL: 'WEST · GATEWAY ARCH\nRIVER CROSSING 1', stlGantryR: 'DENVER 850\nLOS ANGELES 1,840',
      stlBbArch: 'SEE THE ARCH!\n630 FEET OF AWESOME', stlBbPlains: 'THE GREAT PLAINS\nBRIDGE OUT · TAKE THE TRAIN',
      // Denver
      dnClosedSeason: 'CLOSED FOR THE SEASON', dnSlide: 'THE PLUNGE', dnTunnelOfLove: 'TUNNEL OF LOVE',
      dnRoadsideDiner: 'ROADSIDE DINER · EAT', dnReservedAres: 'RESERVED\nGOD OF WAR', dnMileHigh: 'MILE HIGH\nMOTOR LODGE\nVACANCY',
      dnKindness: 'KINDNESS INTERNATIONAL\nZOO TRANSPORT', dnLotusTruck: 'LOTUS HOTEL & CASINO\nSTAY A WHILE',
      dnGantryL: 'ROCKIES TUNNEL 1\nTRUCKS ONLY', dnGantryR: 'LAS VEGAS 750\nLOS ANGELES 1,020',
      dnCityLimits: 'DENVER\nELEV. 5,280 FT',
      dnBbLotus: 'LOTUS HOTEL & CASINO\nLAS VEGAS · STAY FOREVER!', dnBbWaterland: 'WATERLAND\nFUN FOR THE WHOLE FAMILY! (CLOSED)',
      dnBbKindness: 'KINDNESS INTERNATIONAL\nWE LOVE ANIMALS!',
    },
  },
};

// ---- the open world: the Road West's western stops (Las Vegas, the desert, Los Angeles, Santa Monica)
const RT_WEST = {
  places: {
    rt_lucky7: 'Lucky 7 Gas', rt_desertrose: 'The Desert Rose Motel', rt_olympuspalace: 'The Olympus Palace', rt_pyramid: 'The Pyramid',
    rt_lastgas: 'Last Gas', rt_drygulch: 'Dry Gulch', rt_drakon: 'See the Drakon!',
    rt_truckstop_la: "Mom's Diner", rt_la_letters: 'The Big Letters', rt_overpass: 'The Freeway Overpass',
    rt_sm_wreck: 'The Wreck of the Sea Biscuit',
  },
  people: {
    rt_vegas_valet: 'Sal the Valet',
    rt_la_guide: 'Trudy the Tour Guide',
    rt_sm_fisher: 'Grandma Mae',
  },
  champions: {
    rt_vegas_pitboss: { name: 'The Pit Boss' },
    rt_la_nighthound: { name: 'The Night Hound' },
    rt_sm_captain: { name: 'Captain Barnacle' },
  },
  rt: {
    signs: {
      // the roadside, everywhere
      gasPrice: 'GAS 4.99', vacancy: 'VACANCY',
      // Las Vegas
      lotusTag: 'NO CLOCKS · NO WINDOWS · NO WORRIES', bbLotus: 'THE LOTUS CASINO: NOBODY EVER WANTS TO LEAVE!',
      lucky7: 'LUCKY 7 GAS', gasPriceVegas: 'GAS 7.77 · ICE · JERKY', taxi: 'TAXI',
      chapel: 'LITTLE WHITE CHAPEL · OPEN 24 HRS', desertRose: 'DESERT ROSE MOTEL',
      olympusPalace: 'OLYMPUS PALACE · ZEUS-SIZED JACKPOTS', pyramid: 'THE PYRAMID', vegasExit: 'LOS ANGELES 270 →',
      // the desert drive
      laMiles: 'LOS ANGELES 268', leavingVegas: 'LEAVING LAS VEGAS · COME BACK SOON!',
      bbCrustys1: "CRUSTY'S WATER BED PALACE: ONE SIZE FITS ALL! (WE MAKE SURE)",
      bbHermes: 'HERMES EXPRESS: WE DELIVER ANYWHERE. EVEN THERE.',
      lastGas: 'LAST GAS', gasPriceDesert: 'LAST GAS FOR 100 MILES',
      wash: 'DIP · FLOODS', saloon: 'SALOON', store: 'GENERAL STORE', sheriff: 'SHERIFF', hotel: 'HOTEL', bank: 'BANK',
      dryGulch: 'DRY GULCH · POP. 0', drakonGate: 'DRAKON VIEWING $2 · DO NOT FEED',
      bbDrakon: 'SEE THE DRAKON! 100% FAKE. PROBABLY. NEXT EXIT',
      bbHercules: "HERCULES' TIRES: TWELVE LABOURS, ONE LOW PRICE",
      bbCrustys2: "CRUSTY'S WATER BEDS · 5 MILES · STAY THE NIGHT!",
      bbSoda: 'ICE COLD SODA · 40 MILES (WARM SODA · 39 MILES)',
      // Los Angeles
      momsDiner: "MOM'S DINER · PIE", truckersWelcome: 'TRUCKERS WELCOME', laMilesNear: 'LOS ANGELES 12',
      freeway: 'SANTA MONICA · BEACHES →',
      shopBurgers: 'UNDERWORLD BURGERS', shopPets: 'CERBERUS PET SUPPLY · BIG CHEW TOYS',
      shopMaps: "STAR MAPS · SEE WHERE THE STARS LIVE", shopSurf: 'STYX & STONES SURF',
      sunsetPalms: 'SUNSET PALMS MOTEL', starTours: 'STAR TOURS · HOMES OF THE STARS', driveIn: 'DRIVE-IN · SHAKES',
      // Santa Monica
      coaster: 'THE SEA SERPENT', arcade: 'PLAYLAND ARCADE', route66: 'ROUTE 66 · END OF THE TRAIL',
      yachtHarbor: 'SANTA MONICA · YACHT HARBOR · SPORT FISHING · BOATING · CAFES',
      surfShack: 'SURF SHACK', sodaFountain: 'SEASHELL SODA FOUNTAIN', oceanHotel: 'OCEAN VIEW HOTEL',
      endOfRoad: 'END OF THE ROAD · PACIFIC OCEAN',
    },
  },
  sq: {
    // ---------------------------------------------------------------- Las Vegas: Sal the valet
    rt_vegas_valet_keys: {
      title: 'Lost Key Tags',
      offer: [
        'Psst. Hey. You look like you can keep a secret. And find stuff.',
        'I park cars for the Lotus. Last night a big gust of wind (with wings) blew my key tags all over the Strip.',
        'Four of them. If the bosses find out, I’m parking golf carts in Reno. Help a guy out?',
      ],
      steps: ['Find Sal’s key tags on the Strip ({n}/{count})', 'Bring the key tags back to Sal'],
      thanks: ['All four! You’re a lifesaver, kid.', 'Here, a little something. Don’t spend it in there. Seriously. Don’t go in there.'],
    },
    rt_vegas_valet_lot: {
      title: 'Trouble in the Parking Lot',
      offer: [
        'So, uh, about that wind. It wasn’t wind.',
        'There are ladies in the parking lot with one bronze leg and one donkey leg. They keep asking people for "a little bite".',
        'Clear out the lot by the zoo truck, and get rid of five of those empousai. I’ll wash your chariot for free. Forever.',
      ],
      steps: ['Clear the monsters from the parking lot', 'Defeat empousai in Las Vegas ({n}/{count})', 'Tell Sal the lot is safe'],
      thanks: ['They’re gone? You’re telling me they’re actually gone?', 'Kid, you’re the best tip I ever got.'],
    },
    rt_vegas_valet_boss: {
      title: 'The Pit Boss',
      offer: [
        'One more thing. The lady who runs those empousai calls herself the Pit Boss. She hangs out behind the Pyramid.',
        'She says the house always wins. I say the house never met you.',
        'Beat her, then check inside the Pyramid. Rumour says she hid her winnings in there.',
      ],
      steps: ['Defeat the Pit Boss behind the Pyramid', 'Find the chest inside the Pyramid', 'Go back to Sal'],
      thanks: ['The house LOST! Ha! Wait till the guys hear about this.', 'Take this. And kid? When you leave Vegas, don’t look back. Just drive.'],
    },
    // ---------------------------------------------------------------- Los Angeles: Trudy the tour guide
    rt_la_guide_maps: {
      title: 'Star Maps',
      offer: [
        'Welcome to Los Angeles! Home of the stars! Would you like a tour? No? Nobody wants a tour.',
        'Well, I can’t give one anyway. Something with big teeth knocked over my rack and my star maps blew all over town.',
        'Find four of them for me? One went up the hill by the big letters. Of course it did.',
      ],
      steps: ['Find Trudy’s star maps ({n}/{count})', 'Bring the maps back to Trudy'],
      thanks: ['My maps! Now I can show people where the stars live!', 'Between you and me, half of them live in the same three houses.'],
    },
    rt_la_guide_hills: {
      title: 'Up by the Letters',
      offer: [
        'Okay, weird question. Do you believe in ghosts?',
        'Because my tour bus goes up by the big letters on the hill, and lately there are things up there. See-through things. Moaning things.',
        'Go take a look and chase them off? I’ll give you the VIP tour. It’s the same tour, but you get a hat.',
      ],
      steps: ['Climb up to the big letters', 'Clear the ghosts on the hill', 'Tell Trudy the hill is safe'],
      thanks: ['You actually went up there? With the ghosts? Brave kid.', 'Here, VIP hat not included. We ran out of hats.'],
    },
    rt_la_guide_hound: {
      title: 'The Night Hound',
      offer: [
        'Last thing, I promise. Remember the thing with big teeth that wrecked my rack?',
        'It lives in the alley behind the shops. Big as a car. Black as a car. Growls like a car with a bad engine.',
        'The shop owners say it guards a chest back there. Beat the hound and the chest is yours!',
      ],
      steps: ['Defeat the Night Hound in the alley', 'Open the chest in the alley', 'Go back to Trudy'],
      thanks: ['You beat it! The whole street is cheering. Well, the burger guy is cheering.', 'Here. And if you ever need a tour of the Underworld... no, never mind. Nobody needs that.'],
    },
    // ---------------------------------------------------------------- Santa Monica: Grandma Mae
    rt_sm_fisher_lures: {
      title: 'Lucky Lures',
      offer: [
        'Hello, dear. Sixty years I’ve fished off this pier, and I’ve never lost a single lure.',
        'Then this morning a bird with a lady’s face snatched my tackle box and dropped it all over the beach.',
        'Four lucky lures. They’re shiny. You can’t miss them. Well, I did, but my eyes aren’t what they were.',
      ],
      steps: ['Find Grandma Mae’s lures on the beach ({n}/{count})', 'Bring the lures back to Grandma Mae'],
      thanks: ['Oh, my lucky lures! You’re a treasure.', 'Here, take this. And take a cookie. You’re too skinny for a hero.'],
    },
    rt_sm_fisher_harpies: {
      title: 'Bird Trouble',
      offer: [
        'Those birds are back. Harpies, my late husband called them. He was a funny man. Also very good with a harpoon.',
        'They’ve made a nest by the old wreck on the north beach and they steal every fish I catch.',
        'Shoo off six of them and clear out their nest, would you, dear?',
      ],
      steps: ['Defeat harpies at Santa Monica ({n}/{count})', 'Clear the nest by the wreck', 'Tell Grandma Mae'],
      thanks: ['Listen to that. Quiet. Just the waves.', 'A fish just bit. A fish just BIT! Here, dear, for your trouble.'],
    },
    rt_sm_fisher_captain: {
      title: 'Captain Barnacle',
      offer: [
        'One more story, dear. That wreck is the Sea Biscuit. She sank in a storm when I was a little girl.',
        'Her captain never left her. He’s all bones now, and grumpy about it, and he guards the old ship’s chest.',
        'Lay him to rest and open his chest. He always said he’d share his treasure with somebody brave.',
      ],
      steps: ['Defeat Captain Barnacle by the wreck', 'Open the chest inside the wreck', 'Go back to Grandma Mae'],
      thanks: ['So he’s finally at peace. Good. He owed me a dollar.', 'You’ve gone a long way, haven’t you? All the way from the other ocean. Go on home now, dear.'],
    },
  },
};
for (const part of [OW_CAMP, OW_FIELDS, OW_WOODS, OW_SHORE, OW_CANYON, OW_LABYRINTH, OW_OTHRYS, OW_ASPHODEL, RT, RT_EAST, RT_WEST]) deepMerge(TEXT, part);

function deepMerge(into, from) {
  for (const [k, v] of Object.entries(from)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) deepMerge(into[k] ??= {}, v);
    else into[k] = v;
  }
  return into;
}

const warned = new Set();
// Look up a dotted key. vars fill {name} placeholders. A missing key warns once
// and shows the key itself, so a gap is visible rather than blank.
export function t(key, vars) {
  let v = TEXT;
  for (const part of key.split('.')) { v = v?.[part]; if (v == null) break; }
  if (v == null) {
    if (!warned.has(key)) { warned.add(key); console.warn(`text_config: no text for "${key}"`); }
    return key;
  }
  if (typeof v !== 'string') return v;   // arrays and groups come back as they are
  return vars ? v.replace(/\{(\w+)\}/g, (m, n) => (vars[n] ?? m)) : v;
}
// Counted text: key.one / key.other (and key.zero if present), with {n} filled in.
export function tn(key, n, vars) {
  const form = n === 0 && t(`${key}.zero`) !== `${key}.zero` ? 'zero' : n === 1 ? 'one' : 'other';
  return t(`${key}.${form}`, { n, ...vars });
}
// Lay a language pack (or any overrides) over the text.
export function setText(pack) { deepMerge(TEXT, pack); }
// Fill HTML text from keys: <span data-t="title.pressStart"></span>, and
// data-t-aria-label / data-t-title / data-t-placeholder for attributes.
export function applyText(root = document) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
    for (const el of root.querySelectorAll(`[data-t-${attr}]`)) el.setAttribute(attr, t(el.getAttribute(`data-t-${attr}`)));
  }
}
