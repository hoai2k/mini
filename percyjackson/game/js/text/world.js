// World text: monsters, bosses, mortals, signs, places and minigames.
// Edit the strings; keep the keys and the {placeholders}.
export default {
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
};
