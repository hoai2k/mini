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
  'moutheyes',
  'hugefeatures',
  'fisheye',
  'noir',
  'vhs',
  'popart',
  'kaleidoscope',
  'snow',
  'confetti',
  'moneyrain',
  'fireworks',
  // Third batch: face and body reshaping.
  'baby',
  'manface',
  'womanface',
  'thinner',
  'fatter',
];

// The three tabs. Backgrounds replace or change what's behind you (new
// backdrops and the 360 worlds). Accessories add things in front of you:
// hats, ears, horns, masks, hearts, rainbows, tears, snow, bubbles and the
// like. Effects are everything else: warps, reshaping, colour, time tricks
// and particles.
export const BACKGROUND_IDS = new Set([
  'space', 'underwater', 'sunset', 'blurbg', 'colorpop', 'neonaura', 'disco', 'matrix',
  'beach360', 'space360', 'reef360', 'forest360', 'city360', 'snow360', 'candy360', 'volcano360',
]);
export const ACCESSORY_IDS = new Set([
  'puppy', 'kitty', 'bunny', 'hearteyes', 'dragon', 'alien', 'dealwithit', 'crown', 'fancy', 'clown',
  'flowercrown', 'devil', 'angel', 'pirate', 'viking', 'wizard', 'hotdog', 'butterflies', 'storm', 'moneyrain',
  'rainbow', 'snow', 'crying', 'bubble',
]);

// Effects that put you in front of a bright scene: a dim camera image is
// brightened to match it.
export const BRIGHTEN_IDS = new Set([
  'underwater', 'sunset', 'beach360', 'reef360', 'forest360', 'city360', 'snow360', 'candy360', 'disco',
]);

export async function loadEffects() {
  const results = await Promise.allSettled(EFFECT_IDS.map(id => import(`./${id}.js`)));
  const effects = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.default?.id === EFFECT_IDS[i]) {
      const fx = r.value.default;
      fx.kind = BACKGROUND_IDS.has(fx.id) ? 'backgrounds' : ACCESSORY_IDS.has(fx.id) ? 'accessories' : 'effects';
      if (BRIGHTEN_IDS.has(fx.id)) fx.brighten = true;
      effects.push(fx);
    }
    else console.warn(`effect ${EFFECT_IDS[i]} not loaded`, r.reason ?? 'wrong id');
  });
  return effects;
}
