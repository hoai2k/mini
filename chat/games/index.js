// The minigames, in picker order. Each lives in its own file in this folder
// (see README.md). Games load independently: one that fails to load is left
// out of the picker rather than breaking the app.

export const GAME_IDS = [
  'hoops',
  'flappy',
  'airhockey',
  'connect4',
  'quickdraw',
  'stare',
  'copycat',
  'rps',
  'doodle',
  'memory',
  'minigolf',
  'bowling',
  'beachbump',
  'burger',
  'asteroids',
  'dontsmile',
  'snake',
  'battleship',
  'trivia',
  'wordblitz',
  'gofish',
  'whack',
  'baseball',
  'kart',
  'temple',
];

export async function loadGames() {
  const results = await Promise.allSettled(GAME_IDS.map(id => import(`./${id}.js`)));
  const games = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.default?.id === GAME_IDS[i]) games.push(r.value.default);
    else console.warn(`game ${GAME_IDS[i]} not loaded`, r.reason ?? 'wrong id');
  });
  return games;
}
