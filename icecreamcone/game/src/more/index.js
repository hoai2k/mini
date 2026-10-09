// The book's other birds, on their way into the field guide. Each one that
// has its minigame built has a module here, src/more/<id>.js, default-
// exporting its field-guide entry in the same shape as the entries in
// ../birds.js (id, name, object, rhyme, game, goal, tips, score, pass, tune,
// color), and its game in ../games/<id>.js. Its bird is drawn by
// ../subjects.js until it has a portrait.
//
// They are not in the guide yet: they join it once the art their games need
// has been delivered. Until then `?more` on the URL adds every one that is
// built (listed in BUILT below) after the ten, to try them.

export const MORE_IDS = [
  'milkmidge', 'waterglassgoose', 'niffy', 'snippit', 'buttonbeaks', 'broomwhisk',
  'keycrane', 'garbagecanary', 'steampressersparrow', 'wetweatherwren', 'glovedove', 'titthrush',
  'plugsocketswift', 'saltshakershrike', 'ladlelark', 'drippet', 'sawbird', 'radiobird',
];

// The birds whose games are built, one per line (in any order: they are
// shown in MORE_IDS order).
const BUILT = [
  'snippit',
  'buttonbeaks',
  'broomwhisk',
  'wetweatherwren',
  'glovedove',
  'titthrush',
  'drippet',
  'sawbird',
  'radiobird',
  'keycrane',
  'garbagecanary',
  'steampressersparrow',
];

// Their field-guide entries, in MORE_IDS order; `also` adds birds being
// built that aren't listed yet (?more=<id>,<id>).
export async function loadMoreBirds(also = []) {
  const ids = MORE_IDS.filter((id) => BUILT.includes(id) || also.includes(id));
  return Promise.all(ids.map((id) => import(`./${id}.js`).then((m) => m.default)));
}

export const BUILT_IDS = MORE_IDS.filter((id) => BUILT.includes(id));
