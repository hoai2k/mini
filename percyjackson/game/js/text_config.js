// Every piece of text the game shows, under readable keys, in one place.
// Edit the strings here to change what players read; keep the keys and the
// {placeholders}. Code asks for text with t('section.key', { vars }).
//
// i18n: a language pack is an object with the same keys (any subset);
// setText(pack) lays it over these strings. Strings read when a module
// loads (names in data tables) take a pack only if it is set before the game
// starts, so call setText before importing main.js.

// (while the open world is being written, its regions' text lives in js/text/ow_*.js)
import ow_camp from './text/ow_camp.js';
import ow_fields from './text/ow_fields.js';
import ow_woods from './text/ow_woods.js';
import ow_shore from './text/ow_shore.js';
import ow_canyon from './text/ow_canyon.js';
import ow_labyrinth from './text/ow_labyrinth.js';
import ow_othrys from './text/ow_othrys.js';
import ow_asphodel from './text/ow_asphodel.js';
import rt from './text/rt.js';

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
      luke: 'Luke, and the pit scorpion',
      furies: 'The three Furies',
      medusa: 'Medusa',
      chimera: 'The Chimera',
      spiders: 'The spider swarm',
      procrustes: 'Procrustes',
      cerberus: 'Cerberus',
      ares: 'Ares',
      pit_scorpion: 'The pit scorpion',
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
    skip: { pad: 'Hold A to skip', touch: 'Hold the screen to skip', kbm: 'Hold Esc to skip' },
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
      knock: 'In the middle of the night, during a particularly bad storm, someone bangs on the door. It’s Grover. He has no trousers on, and he has hooves instead of feet.',
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
      startPlace: 'the first milestone on the Road West',
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
      outro: 'Hades says you stole his helm. You didn’t, but the master bolt is in your backpack. Three pearls, four of you, and Mom stays behind.',
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
      outro: 'Riptide cuts Ares’s heel and ichor runs gold. The Furies carry Hades’s helm home to the Underworld, and Ares stomps off, sulking.',
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
      vitality: { name: 'Cyclops Hide', desc: 'Max health.', at: '+{health} max health' },
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
      tough: { name: 'Cabin Five', desc: 'Max health and armour.', at: '+{health} max health, +{percent}% armour' },
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
  },

  // Enchantments ({n} is the number the level works out to; {n2} a second one)
  enchantments: {
    // Weapons
    sharpness: { name: 'Celestial Edge', desc: '+{n}% melee damage' },
    swirling: { name: 'Whirlwind', desc: 'Every third hit spins, striking all around for {n}%' },
    committed: { name: 'Relentless', desc: 'Up to +{n}% damage to wounded monsters' },
    rampaging: { name: 'War Frenzy', desc: 'Defeating a monster gives +{n}% attack speed for 5 s' },
    leeching: { name: 'Nectar Thirst', desc: 'Heal {n}% of your health when you defeat a monster' },
    exploding: { name: 'Greek Fire', desc: 'Monsters you defeat explode for {n}% of their health' },
    freezing: { name: 'Boreas’s Chill', desc: 'Hits slow monsters for {n} s' },
    critical: { name: 'Athena’s Eye', desc: '+{n}% critical chance' },
    thundering: { name: 'Zeus’s Spark', desc: '{n}% chance on hit to call down lightning' },
    echo: { name: 'Echo', desc: '{n}% chance to strike twice' },
    bane: { name: 'Monster Bane', desc: '+{n}% damage to elites, champions and bosses' },
    // Armour
    health: { name: 'Ambrosia-Fed', desc: '+{n} health' },
    protection: { name: 'Aegis Ward', desc: '+{n}% damage reduction' },
    swiftness: { name: 'Hermes’s Speed', desc: '+{n}% move speed' },
    cooldown: { name: 'Focus', desc: '-{n}% ability cooldowns (Ambrosia -{n2}%)' },
    surge: { name: 'Godly Blood', desc: '+{n}% Power gain' },
    potency: { name: 'Divine Might', desc: '+{n}% ability damage' },
    vitality: { name: 'Apollo’s Blessing', desc: 'Ambrosia heals {n}% more of your health' },
    nectar: { name: 'Hebe’s Cup', desc: 'Ambrosia refills {n}% faster' },
    quiver: { name: 'Artemis’s Quiver', desc: '+{n} shots in your quiver' },
    thorns: { name: 'Demeter’s Briars', desc: 'Monsters that hit you take {n}% of the damage back' },
    embers: { name: 'Hephaestus’s Embers', desc: 'Burn monsters right next to you for {n} damage a second' },
    evasion: { name: 'Nimble as a Satyr', desc: '{n}% chance to dodge a hit' },
    lucky: { name: 'Tyche’s Luck', desc: '+{n}% drachmas found' },
  },

  // Rarity names (also used for the Blessed gift of a god)
  rarity: {
    common: 'Common',
    rare: 'Rare',
    unique: 'Legendary',
    blessed: 'Blessed',
  },

  // Loot: kinds of gear and the card shown when an item is picked up
  loot: {
    kind: { weapon: 'Weapon', armor: 'Armour', artifact: 'Magic item' },
    blessedName: 'Blessed {name}',
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
    },
  },

  // Inventory screen (pause menu, or I)
  inventory: {
    title: 'Inventory',
    slots: { weapon: 'Weapon', armor: 'Armour', artifact1: 'Magic item 1', artifact2: 'Magic item 2' },
    filters: { all: 'All', weapon: 'Weapons', armor: 'Armour', artifact: 'Magic items' },
    companion: '{hero} (companion)',
    equipped: 'Equipped · {hero}',
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
    temper: 'Temper +1 power (◆{cost})',
    temperCap: 'This item is as strong as the forge can make it for now',
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
      name: 'Pit Scorpion',
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
      summons: 'Luke summons a pit scorpion!',
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

for (const part of [ow_camp, ow_fields, ow_woods, ow_shore, ow_canyon, ow_labyrinth, ow_othrys, ow_asphodel, rt]) deepMerge(TEXT, part);

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
