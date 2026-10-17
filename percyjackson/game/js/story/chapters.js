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
//   objective exorcise | rescue | seal | flag | escape | boss | museum (see mission.js;
//             museum is chapter 1's walk to Mrs. Dodds, objectives/museum.js).
//   objText   the objective title shown in the HUD.
//   captive   rescue: 'cage' (default) or 'statue' (stone captives).
//   seal      seal: 'altar' (default), 'trap' or 'rift'.
//   start     where the chapter starts in camp: an anchor in world/camp.js,
//             an offset and a description of the place.
//   prophecyLine  the line of the book's prophecy the chapter fulfils.
//   bossDown  when the boss falls: { stinger (assets/music/<id>.mp3), text }.
import { t } from '../text_config.js';

export const BOOKS = [
  { id: 'book1', num: 1, title: t('books.book1.title'), card: 'assets/cards/book-1.jpg',
    prophecy: t('books.book1.prophecy') },
  { id: 'book2', num: 2, title: t('books.book2.title'), card: 'assets/cards/book-2.jpg', prophecy: [] },
  { id: 'book3', num: 3, title: t('books.book3.title'), card: 'assets/cards/book-3.jpg', prophecy: [] },
  { id: 'book4', num: 4, title: t('books.book4.title'), card: 'assets/cards/book-4.jpg', prophecy: [] },
  { id: 'book5', num: 5, title: t('books.book5.title'), card: 'assets/cards/book-5.jpg', prophecy: [] },
];

export const CHAPTERS = [
  {
    id: 'lt1', book: 'book1', num: 1, title: t('chapters.lt1.title'), place: t('chapters.lt1.place'),
    biome: 'museum', objective: 'museum', objText: t('chapters.lt1.objective'), boss: 'alecto', mist: 1, disguise: ['teacher', 'student', 'tourist', 'guard'], mistForms: ['serpent', 'spider', 'ghost'],
    card: 'assets/cards/scene-museum.jpg', ready: true,
    start: { at: 'spawn', dx: 7, dz: 6, prop: 'bus', place: t('chapters.lt1.startPlace') },
    intro: t('chapters.lt1.intro'),
    outro: t('chapters.lt1.outro'),
  },
  {
    id: 'lt2', book: 'book1', num: 2, title: t('chapters.lt2.title'), place: t('chapters.lt2.place'),
    biome: 'storm_hill', objective: 'exorcise', objText: t('chapters.lt2.objective'), boss: 'minotaur', mist: 0.75, disguise: ['farmer'], mistForms: ['serpent', 'ghost'],
    card: 'assets/cards/scene-minotaur.jpg', ready: true,
    start: { at: 'thaliaPine', dx: 4, dz: 6, place: t('chapters.lt2.startPlace') },
    intro: t('chapters.lt2.intro'),
    outro: t('chapters.lt2.outro'),
  },
  // Chapters 3-12: the quest west. They start along the Road West out of
  // camp (anchors woodsEdge, road1..road9 in world/camp.js). `pending` marks
  // a chapter whose boss or biome is still being built: it stays `ready:
  // false` until it has been played through.
  {
    id: 'lt3', book: 'book1', num: 3, title: t('chapters.lt3.title'), place: t('chapters.lt3.place'),
    biome: 'camp_woods', objective: 'flag', objText: t('chapters.lt3.objective'), boss: 'hellhound_alpha', mist: 0.3, disguise: [],
    card: 'assets/cards/scene-capture-the-flag.jpg', prophecyLine: null, ready: true,
    start: { at: 'woodsEdge', place: t('chapters.lt3.startPlace') },
    bossDown: { stinger: 'claimed', text: t('chapters.lt3.bossDown') },
    intro: t('chapters.lt3.intro'),
    outro: t('chapters.lt3.outro'),
  },
  {
    id: 'lt4', book: 'book1', num: 4, title: t('chapters.lt4.title'), place: t('chapters.lt4.place'),
    biome: 'highway', objective: 'exorcise', objText: t('chapters.lt4.objective'), boss: 'furies', mist: 0.8, disguise: ['old_lady', 'tourist'], mistForms: ['serpent', 'ghost'],
    card: 'assets/cards/scene-bus.jpg', prophecyLine: 0, ready: true,
    start: { at: 'road1', place: t('chapters.lt4.startPlace') },
    intro: t('chapters.lt4.intro'),
    outro: t('chapters.lt4.outro'),
  },
  {
    id: 'lt5', book: 'book1', num: 5, title: t('chapters.lt5.title'), place: t('chapters.lt5.place'),
    biome: 'statue_garden', objective: 'rescue', objText: t('chapters.lt5.objective'), captive: 'statue', boss: 'medusa', mist: 0.8, disguise: ['old_lady'], mistForms: ['serpent', 'spider'],
    card: 'assets/cards/scene-medusa.jpg', ready: true,
    start: { at: 'road2', place: t('chapters.lt5.startPlace') },
    intro: t('chapters.lt5.intro'),
    outro: t('chapters.lt5.outro'),
  },
  {
    id: 'lt6', book: 'book1', num: 6, title: t('chapters.lt6.title'), place: t('chapters.lt6.place'),
    biome: 'arch', objective: 'exorcise', objText: t('chapters.lt6.objective'), boss: 'chimera', mist: 0.6, disguise: ['tourist'], mistForms: ['spider', 'ghost'],
    card: 'assets/cards/scene-arch.jpg', ready: true,
    start: { at: 'road3', place: t('chapters.lt6.startPlace') },
    intro: t('chapters.lt6.intro'),
    outro: t('chapters.lt6.outro'),
  },
  {
    id: 'lt7', book: 'book1', num: 7, title: t('chapters.lt7.title'), place: t('chapters.lt7.place'),
    biome: 'waterland', objective: 'seal', objText: t('chapters.lt7.objective'), seal: 'trap', boss: 'spiders', mist: 0.5, disguise: [],
    card: 'assets/cards/scene-waterland.jpg', ready: true,
    start: { at: 'road4', place: t('chapters.lt7.startPlace') },
    intro: t('chapters.lt7.intro'),
    outro: t('chapters.lt7.outro'),
  },
  {
    id: 'lt8', book: 'book1', num: 8, title: t('chapters.lt8.title'), place: t('chapters.lt8.place'),
    biome: 'casino', objective: 'escape', objText: t('chapters.lt8.objective'), boss: null, mist: 0.9, disguise: ['bellhop', 'tourist'], mistForms: ['ghost', 'serpent'],
    card: 'assets/cards/scene-lotus.jpg', ready: true,
    start: { at: 'road5', place: t('chapters.lt8.startPlace') },
    intro: t('chapters.lt8.intro'),
    outro: t('chapters.lt8.outro'),
  },
  {
    id: 'lt9', book: 'book1', num: 9, title: t('chapters.lt9.title'), place: t('chapters.lt9.place'),
    biome: 'desert', objective: 'exorcise', objText: t('chapters.lt9.objective'), boss: 'procrustes', mist: 0.6, disguise: ['salesman'], mistForms: ['serpent', 'spider'],
    card: 'assets/cards/scene-procrustes.jpg', ready: true,
    start: { at: 'road6', place: t('chapters.lt9.startPlace') },
    intro: t('chapters.lt9.intro'),
    outro: t('chapters.lt9.outro'),
  },
  {
    id: 'lt10', book: 'book1', num: 10, title: t('chapters.lt10.title'), place: t('chapters.lt10.place'),
    biome: 'underworld', objective: 'seal', objText: t('chapters.lt10.objective'), seal: 'rift', boss: 'cerberus', mist: 0.2, disguise: [],
    card: 'assets/cards/scene-underworld.jpg', prophecyLine: 3, ready: true,
    start: { at: 'road7', place: t('chapters.lt10.startPlace') },
    intro: t('chapters.lt10.intro'),
    outro: t('chapters.lt10.outro'),
  },
  {
    id: 'lt11', book: 'book1', num: 11, title: t('chapters.lt11.title'), place: t('chapters.lt11.place'),
    biome: 'beach', objective: 'boss', objText: t('chapters.lt11.objective'), boss: 'ares', mist: 0, disguise: [],
    card: 'assets/cards/scene-ares-beach.jpg', prophecyLine: 1, ready: true,
    start: { at: 'road8', place: t('chapters.lt11.startPlace') },
    intro: t('chapters.lt11.intro'),
    outro: t('chapters.lt11.outro'),
  },
  {
    id: 'lt12', book: 'book1', num: 12, title: t('chapters.lt12.title'), place: t('chapters.lt12.place'),
    biome: 'olympus', objective: 'boss', objText: t('chapters.lt12.objective'), boss: 'luke', mist: 0, disguise: [],
    card: 'assets/cards/scene-olympus.jpg', prophecyLine: 2, ready: true,
    start: { at: 'road9', place: t('chapters.lt12.startPlace') },
    intro: t('chapters.lt12.intro'),
    outro: t('chapters.lt12.outro'),
  },
];

export const chapter = (id) => CHAPTERS.find((c) => c.id === id);
// Pending chapters can be tried before they are marked ready by opening the
// game with `?pending` in the address (for play-testing them).
export const previewPending = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').has('pending'); } catch (e) { return false; } };
export const chapterPlayable = (ch) => !!ch && (ch.ready || (!!ch.pending && previewPending()));
export const chaptersOf = (bookId) => CHAPTERS.filter((c) => c.book === bookId);
