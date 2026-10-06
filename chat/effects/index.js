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
