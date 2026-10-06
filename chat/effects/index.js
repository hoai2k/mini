// The face effects, in tray order. Each lives in its own file in this folder
// (see README.md). Effects load independently: one that fails to load is left
// out of the tray rather than breaking the app.

export const EFFECT_IDS = [
  'bubble',
  'puppy',
  'hearteyes',
  'dragon',
  'rainbow',
  'bigeyes',
  'bobblehead',
  'alien',
  'dealwithit',
  'crown',
  'fancy',
  'clown',
  'storm',
  'noodle',
  'swirl',
  'space',
  'underwater',
  'pixel',
  'comic',
  'thermal',
  // Second batch: stickers, worlds, time, warps, filters and particles.
  'flowercrown',
  'kitty',
  'bunny',
  'hotdog',
  'lasereyes',
  'crying',
  'devil',
  'angel',
  'pirate',
  'viking',
  'wizard',
  'butterflies',
  'makeup',
  'beach360',
  'space360',
  'reef360',
  'forest360',
  'city360',
  'snow360',
  'candy360',
  'volcano360',
  'blurbg',
  'colorpop',
  'neonaura',
  'disco',
  'matrix',
  'sunset',
  'echo',
  'delayghost',
  'timewarp',
  'timewarpside',
  'slitscan',
  'strobe',
  'clones',
  'motionglow',
  'tinyface',
  'chubby',
  'babyface',
  'symmetry',
  'cyclops',
  'bigmouth',
  'fisheye',
  'noir',
  'vhs',
  'popart',
  'kaleidoscope',
  'snow',
  'confetti',
  'moneyrain',
  'fireworks',
];

export async function loadEffects() {
  const results = await Promise.allSettled(EFFECT_IDS.map(id => import(`./${id}.js`)));
  const effects = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.default?.id === EFFECT_IDS[i]) effects.push(r.value.default);
    else console.warn(`effect ${EFFECT_IDS[i]} not loaded`, r.reason ?? 'wrong id');
  });
  return effects;
}
