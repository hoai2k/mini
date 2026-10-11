// The books and their chapters. Each chapter is a mission: a generated level
// in its biome, an objective, a boss, how thick the Mist is, and story cards.
//   mist      0 (none) .. 1 (very thick): how fast True Sight drains and how
//             much of the chapter's enemies start disguised as mortals.
//   disguise  the mortal disguises used by disguised monsters in this chapter.
//   card      chapter card image under assets/ (falls back to a drawn card).
//   ready     false = shown on the map but not playable yet.
export const BOOKS = [
  { id: 'book1', num: 1, title: 'The Lightning Thief', card: 'assets/cards/book-1.jpg',
    prophecy: [
      'You shall go west, and face the god who has turned,',
      'You shall find what was stolen, and see it safely returned.',
      'You shall be betrayed by one who calls you a friend,',
      'And you shall fail to save what matters most, in the end.',
    ] },
  { id: 'book2', num: 2, title: 'The Sea of Monsters', card: 'assets/cards/book-2.jpg', prophecy: [] },
  { id: 'book3', num: 3, title: "The Titan's Curse", card: 'assets/cards/book-3.jpg', prophecy: [] },
  { id: 'book4', num: 4, title: 'The Battle of the Labyrinth', card: 'assets/cards/book-4.jpg', prophecy: [] },
  { id: 'book5', num: 5, title: 'The Last Olympian', card: 'assets/cards/book-5.jpg', prophecy: [] },
];

export const CHAPTERS = [
  {
    id: 'lt1', book: 'book1', num: 1, title: 'The Pre-Algebra Teacher', place: 'The museum, on a field trip',
    biome: 'museum', objective: 'exorcise', boss: 'alecto', mist: 1, disguise: ['teacher', 'student', 'tourist'],
    card: 'assets/cards/scene-museum.jpg', ready: true,
    intro: [
      'Look, I didn’t want to be a half-blood.',
      'On the field trip to the museum, Mrs. Dodds keeps staring at you as if you have done something terrible.',
      'Something is wrong with her. Hold LT (or V) to see through the Mist.',
    ],
    outro: 'Mrs. Dodds bursts into yellow dust. Nobody else remembers her. “Mrs. Dodds? There is no Mrs. Dodds.”',
  },
  {
    id: 'lt2', book: 'book1', num: 2, title: 'Half-Blood Hill', place: 'Long Island, in a storm',
    biome: 'storm_hill', objective: 'escort', boss: 'minotaur', mist: 0.75, disguise: ['farmer'],
    card: 'assets/cards/scene-minotaur.jpg', ready: true,
    intro: [
      'Grover is on your doorstep with no trousers on — he has goat legs.',
      'The storm drives you up Half-Blood Hill toward the pine tree and the camp border.',
      'Something huge is following. Lure its charges into the trees.',
    ],
    outro: 'The Minotaur crumbles to dust and you are left holding a horn. Camp Half-Blood lies below.',
  },
  { id: 'lt3', book: 'book1', num: 3, title: 'Capture the Flag', place: 'Camp woods and the creek', biome: 'camp_woods', objective: 'flag', boss: 'hellhound', mist: 0.3, disguise: [], card: 'assets/cards/scene-capture-the-flag.jpg', prophecyLine: null, ready: false },
  { id: 'lt4', book: 'book1', num: 4, title: 'The Kindly Ones', place: 'A Greyhound bus, New Jersey', biome: 'highway', objective: 'exorcise', boss: 'furies', mist: 0.8, disguise: ['old_lady'], card: 'assets/cards/scene-bus.jpg', prophecyLine: 0, ready: false },
  { id: 'lt5', book: 'book1', num: 5, title: 'Aunty Em’s Garden Gnome Emporium', place: 'A statue garden', biome: 'statue_garden', objective: 'rescue', boss: 'medusa', mist: 0.8, disguise: ['old_lady'], card: 'assets/cards/scene-medusa.jpg', ready: false },
  { id: 'lt6', book: 'book1', num: 6, title: 'The Gateway Arch', place: 'St. Louis', biome: 'arch', objective: 'exorcise', boss: 'chimera', mist: 0.6, disguise: ['tourist'], card: 'assets/cards/scene-arch.jpg', ready: false },
  { id: 'lt7', book: 'book1', num: 7, title: 'Waterland', place: 'An abandoned water park, Denver', biome: 'waterland', objective: 'seal', boss: 'spiders', mist: 0.5, disguise: [], card: 'assets/cards/scene-waterland.jpg', ready: false },
  { id: 'lt8', book: 'book1', num: 8, title: 'The Lotus Hotel and Casino', place: 'Las Vegas', biome: 'casino', objective: 'escape', boss: null, mist: 0.9, disguise: ['bellhop'], card: 'assets/cards/scene-lotus.jpg', ready: false },
  { id: 'lt9', book: 'book1', num: 9, title: 'Crusty’s Water Bed Palace', place: 'The Nevada desert', biome: 'desert', objective: 'exorcise', boss: 'procrustes', mist: 0.6, disguise: ['salesman'], card: 'assets/cards/scene-procrustes.jpg', ready: false },
  { id: 'lt10', book: 'book1', num: 10, title: 'DOA Recording Studios', place: 'Los Angeles and the Underworld', biome: 'underworld', objective: 'seal', boss: 'cerberus', mist: 0.2, disguise: [], card: 'assets/cards/scene-underworld.jpg', prophecyLine: 1, ready: false },
  { id: 'lt11', book: 'book1', num: 11, title: 'The God of War', place: 'Santa Monica beach', biome: 'beach', objective: 'boss', boss: 'ares', mist: 0, disguise: [], card: 'assets/cards/scene-ares-beach.jpg', prophecyLine: 3, ready: false },
  { id: 'lt12', book: 'book1', num: 12, title: 'The Six-Hundredth Floor', place: 'Olympus, then camp', biome: 'olympus', objective: 'boss', boss: 'pit_scorpion', mist: 0, disguise: [], card: 'assets/cards/scene-olympus.jpg', prophecyLine: 2, ready: false },
];

export const chapter = (id) => CHAPTERS.find((c) => c.id === id);
export const chaptersOf = (bookId) => CHAPTERS.filter((c) => c.book === bookId);
