// The books and their chapters. Each chapter is a mission: a generated level
// in its biome, an objective, a boss, how thick the Mist is, and story cards.
//   mist      0 (none) .. 1 (very thick): how fast True Sight drains and how
//             much of the chapter's enemies start disguised as mortals.
//   disguise  the mortal disguises used by disguised monsters (and the real
//             mortals milling around) in this chapter.
//   mistForms what the disguised ones really are under True Sight: creatures
//             nothing like people (entities/mistPeople.js).
//   card      chapter card image under assets/ (preloaded with the title, ui/art.js).
//   ready     false = shown on the map but not playable yet.
//   pending   true = written and wired up, waiting on its boss or biome.
//   objective exorcise | rescue | seal | flag | escape | boss (see mission.js).
//   objText   the objective title shown in the HUD.
//   captive   rescue: 'cage' (default) or 'statue' (stone captives).
//   seal      seal: 'altar' (default), 'trap' or 'rift'.
//   start     where the chapter starts in camp: an anchor in world/camp.js,
//             an offset and a description of the place.
//   prophecyLine  the line of the book's prophecy the chapter fulfils.
//   bossDown  when the boss falls: { stinger (assets/music/<id>.mp3), text }.
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
    biome: 'museum', objective: 'exorcise', objText: 'Follow Mrs. Dodds through the galleries', boss: 'alecto', mist: 1, disguise: ['teacher', 'student', 'tourist', 'guard'], mistForms: ['serpent', 'spider', 'ghost'],
    card: 'assets/cards/scene-museum.jpg', ready: true,
    start: { at: 'spawn', dx: 7, dz: 6, prop: 'bus', place: 'the field-trip bus by the camp road' },
    intro: [
      'Look, I didn’t want to be a half-blood.',
      'On the field trip to the museum, Mrs. Dodds keeps staring at you as if you have done something terrible.',
      'Something is wrong with her. Click the right stick (or press V) to see through the Mist.',
    ],
    outro: 'Mrs. Dodds bursts into yellow dust. Nobody else remembers her. “Mrs. Dodds? There is no Mrs. Dodds.”',
  },
  {
    id: 'lt2', book: 'book1', num: 2, title: 'Half-Blood Hill', place: 'Long Island, in a storm',
    biome: 'storm_hill', objective: 'exorcise', objText: 'Climb Half-Blood Hill', boss: 'minotaur', mist: 0.75, disguise: ['farmer'], mistForms: ['serpent', 'ghost'],
    card: 'assets/cards/scene-minotaur.jpg', ready: true,
    start: { at: 'thaliaPine', dx: 4, dz: 6, place: 'Thalia’s pine on Half-Blood Hill' },
    intro: [
      'Grover is on your doorstep with no trousers on — he has goat legs.',
      'The storm drives you up Half-Blood Hill toward the pine tree and the camp border.',
      'Something huge is following. Lure its charges into the trees.',
    ],
    outro: 'The Minotaur crumbles to dust and you are left holding a horn. Camp Half-Blood lies below.',
  },
  // Chapters 3-12: the quest west. They start along the Road West out of
  // camp (anchors woodsEdge, road1..road9 in world/camp.js). `pending` marks
  // a chapter whose boss or biome is still being built: it stays `ready:
  // false` until it has been played through.
  {
    id: 'lt3', book: 'book1', num: 3, title: 'Capture the Flag', place: 'Camp woods and the creek',
    biome: 'camp_woods', objective: 'flag', objText: 'Capture the red team’s banner', boss: 'hellhound_alpha', mist: 0.3, disguise: [],
    card: 'assets/cards/scene-capture-the-flag.jpg', prophecyLine: null, ready: true,
    start: { at: 'woodsEdge', place: 'the edge of the woods, past the cabins' },
    bossDown: { stinger: 'claimed', text: 'Everyone is staring above your head: a glowing green trident. You have been claimed.' },
    intro: [
      'Friday night is capture the flag. Blue team: Athena, Hermes and you. Red team: Ares, and Clarisse wants to pound you.',
      'Annabeth puts on her Yankees cap and vanishes. You get border patrol by the creek. Some plan.',
      'Find the red banner in the woods and carry it back across the creek. A banner is heavy: no ranged attacks while you carry it.',
    ],
    outro: 'The creek heals every scratch, and a glowing green trident hangs over your head. “It is determined,” says Chiron. Poseidon, Earthshaker, Father of Horses. You have been claimed.',
  },
  {
    id: 'lt4', book: 'book1', num: 4, title: 'The Kindly Ones', place: 'A Greyhound bus, New Jersey',
    biome: 'highway', objective: 'exorcise', objText: 'Get off the bus alive', boss: 'furies', mist: 0.8, disguise: ['old_lady', 'tourist'], mistForms: ['serpent', 'ghost'],
    card: 'assets/cards/scene-bus.jpg', prophecyLine: 0, ready: true,
    start: { at: 'road1', place: 'the first milestone on the Road West' },
    intro: [
      'The Oracle gives you a prophecy, and you go west: Annabeth, Grover and you, on a Greyhound bus out of New York.',
      'Three old ladies get on at the back. One of them is knitting. Another has a leather whip in her handbag.',
      'The Furies want to drag you back to their master. See through the Mist, clear the road, then face all three.',
    ],
    outro: 'The bus burns behind you in the woods of New Jersey. You are on foot now, a long way from camp, and going west.',
  },
  {
    id: 'lt5', book: 'book1', num: 5, title: 'Aunty Em’s Garden Gnome Emporium', place: 'A statue garden',
    biome: 'statue_garden', objective: 'rescue', objText: 'Free the stone satyrs', captive: 'statue', boss: 'medusa', mist: 0.8, disguise: ['old_lady'], mistForms: ['serpent', 'spider'],
    card: 'assets/cards/scene-medusa.jpg', ready: true,
    start: { at: 'road2', place: 'a garden gnome by the Road West' },
    intro: [
      'Hungry and lost, you smell burgers: Aunty Em’s Garden Gnome Emporium. The garden is full of statues, and they all look scared.',
      'Aunty Em wears a black veil. She says she only wants to take your picture.',
      'Free the stone satyrs (hold X / E beside them). When she comes, don’t look at her: keep her in a reflection.',
    ],
    outro: 'You mail Medusa’s head to Mount Olympus, care of the gods. Annabeth says that was rude. It was also very funny.',
  },
  {
    id: 'lt6', book: 'book1', num: 6, title: 'The Gateway Arch', place: 'St. Louis, the top of the Arch',
    biome: 'arch', objective: 'exorcise', objText: 'Climb to the top of the Arch', boss: 'chimera', mist: 0.6, disguise: ['tourist'], mistForms: ['spider', 'ghost'],
    card: 'assets/cards/scene-arch.jpg', ready: true,
    start: { at: 'road3', place: 'the river crossing on the Road West' },
    intro: [
      'St. Louis. Annabeth wants to see the Gateway Arch, because it is a great piece of architecture.',
      'At the top, a fat lady in a denim dress gets in with her little dog. Her “Chihuahua” is called Sonny, and it has a snake for a tail.',
      'The Chimera breathes fire: keep moving and hit it from the side. If it gets too hot, the river is a long way down, and you are Poseidon’s son.',
    ],
    outro: 'You jump six hundred and thirty feet into the Mississippi and breathe underwater. A Nereid has a message: go to Santa Monica.',
  },
  {
    id: 'lt7', book: 'book1', num: 7, title: 'Waterland', place: 'An abandoned water park, Denver',
    biome: 'waterland', objective: 'seal', objText: 'Shut Hephaestus’s traps', seal: 'trap', boss: 'spiders', mist: 0.5, disguise: [],
    card: 'assets/cards/scene-waterland.jpg', ready: true,
    start: { at: 'road4', place: 'a water slide by the Road West' },
    intro: [
      'In a Denver diner, a biker in a red leather duster makes you an offer: fetch his shield from a water park, and he will get you a ride west.',
      'He is Ares, the god of war. Waterland has been closed for years. The Tunnel of Love has not.',
      'Shut the traps (hold X / E) while the bronze spiders swarm. Don’t let go until the trap is shut.',
    ],
    outro: 'You get out of the Tunnel of Love just before it is broadcast to Olympus. Ares gives you a backpack and a ride west on a zoo truck.',
  },
  {
    id: 'lt8', book: 'book1', num: 8, title: 'The Lotus Hotel and Casino', place: 'Las Vegas',
    biome: 'casino', objective: 'escape', objText: 'Get out of the Lotus Casino', boss: null, mist: 0.9, disguise: ['bellhop', 'tourist'], mistForms: ['ghost', 'serpent'],
    card: 'assets/cards/scene-lotus.jpg', ready: true,
    start: { at: 'road5', place: 'a neon sign by the Road West' },
    intro: [
      'The Lotus Hotel and Casino, Las Vegas. A free room, free games, and a green card with unlimited credit. Nobody ever wants to leave.',
      'The bellhops keep offering you lotus flowers. Every one makes you forget a little more, and the days slip by.',
      'Find the way out before too many days pass. True Sight (right stick click / V) shows the door the Mist is hiding. Don’t eat the flowers.',
    ],
    outro: 'Outside, it is five days later than when you went in. The summer solstice is close. You wave down a taxi with the green card: “Los Angeles. And step on it.”',
  },
  {
    id: 'lt9', book: 'book1', num: 9, title: 'Crusty’s Water Bed Palace', place: 'The Nevada desert',
    biome: 'desert', objective: 'exorcise', objText: 'Get past Crusty’s showroom', boss: 'procrustes', mist: 0.6, disguise: ['salesman'], mistForms: ['serpent', 'spider'],
    card: 'assets/cards/scene-procrustes.jpg', ready: true,
    start: { at: 'road6', place: 'a water bed on the Road West' },
    intro: [
      'Crusty’s Water Bed Palace, in the Nevada desert. The salesman is huge, and his smile has too many teeth.',
      'He wants you to try a bed. They are all the perfect size. He makes sure of it.',
      'Clear the showroom, then trick him: get him onto his own bed and the straps will hold him.',
    ],
    outro: 'Procrustes the Stretcher fits his own bed perfectly. Annabeth and Grover climb down, only a little longer than before.',
  },
  {
    id: 'lt10', book: 'book1', num: 10, title: 'DOA Recording Studios', place: 'Los Angeles and the Underworld',
    biome: 'underworld', objective: 'seal', objText: 'Close the rifts to Tartarus', seal: 'rift', boss: 'cerberus', mist: 0.2, disguise: [],
    card: 'assets/cards/scene-underworld.jpg', prophecyLine: 3, ready: true,
    start: { at: 'road7', place: 'a recording-studio door on the Road West' },
    intro: [
      'DOA Recording Studios is the way into the Underworld. Charon the ferryman wants drachmas. Lots of them.',
      'Past the river Styx the Fields of Asphodel go on forever, and something deep in Tartarus is calling your name.',
      'Close the rifts (hold X / E) before the dead pour through. At the gates, Cerberus wants to play: throw him the red ball.',
    ],
    outro: 'Hades says you stole his helm. You didn’t, but the master bolt is in your backpack. Three pearls, four of you, and Mom stays behind. You failed to save what mattered most.',
  },
  {
    id: 'lt11', book: 'book1', num: 11, title: 'The God of War', place: 'Santa Monica beach',
    biome: 'beach', objective: 'boss', objText: 'Duel Ares in the surf', boss: 'ares', mist: 0, disguise: [],
    card: 'assets/cards/scene-ares-beach.jpg', prophecyLine: 1, ready: true,
    start: { at: 'road8', place: 'the surf at the end of the Road West' },
    intro: [
      'Santa Monica. Ares is waiting on the beach beside a black motorcycle. He set you up from the start.',
      'The god of war wants a fight. The Furies circle overhead, waiting to see who wins.',
      'Stand in the water for the strength of the sea, and strike for his heel.',
    ],
    outro: 'Riptide cuts Ares’s heel and ichor runs gold. The Furies carry Hades’s helm home. What was stolen is found, and safely returned.',
  },
  {
    id: 'lt12', book: 'book1', num: 12, title: 'The Six-Hundredth Floor', place: 'Olympus, then camp',
    biome: 'olympus', objective: 'boss', objText: 'Return the master bolt', boss: 'luke', mist: 0, disguise: [],
    card: 'assets/cards/scene-olympus.jpg', prophecyLine: 2, ready: true,
    start: { at: 'road9', place: 'the last milestone on the Road West' },
    intro: [
      'The six-hundredth floor of the Empire State Building. Zeus takes back his master bolt, and the war is called off.',
      'Back at camp, Luke asks you to walk with him in the woods. He says he has something to tell you.',
      'Luke has served Kronos all along. Dodge his sword, Backbiter, and watch for the pit scorpion he brought.',
    ],
    outro: 'Luke vanishes into the dark. The poison burns, and the one who called you a friend is your enemy now. Summer is over, but the quest is done.',
  },
];

export const chapter = (id) => CHAPTERS.find((c) => c.id === id);
// Pending chapters can be tried before they are marked ready by opening the
// game with `?pending` in the address (for play-testing them).
export const previewPending = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').has('pending'); } catch (e) { return false; } };
export const chapterPlayable = (ch) => !!ch && (ch.ready || (!!ch.pending && previewPending()));
export const chaptersOf = (bookId) => CHAPTERS.filter((c) => c.book === bookId);
