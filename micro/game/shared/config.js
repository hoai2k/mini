// Tunable game dynamics for Micro Zoom: the hand-tuned numbers live in
// micro/game_config.js (GAME), under readable dotted keys, the way the text
// lives in text_config.js (read through text.js). Code asks for a value by
// key and gives the default it was built with:
//
//   conf('mite.southWallSeconds', 10)   → 10 (or whatever game_config.js says)
//   conf('mite.predatorHuntSpeeds', [760, 900, 1020])
//
// A missing key, or a value of the wrong kind (a word where a number belongs,
// a list of the wrong length), falls back to the default and warns once in
// the console. Values are read when a module loads, so an edit takes effect
// on the next page load.
import { GAME } from '../../game_config.js';

const warned = new Set();
const dig = (root, key) => {
  let o = root;
  for (const k of key.split('.')) { if (o == null || typeof o !== 'object') return undefined; o = o[k]; }
  return o;
};
function warn(key, why) {
  if (warned.has(key)) return;
  warned.add(key);
  if (typeof console !== 'undefined') console.warn(`[micro config] ${key}: ${why}; using the default`);
}
/** Does v have the same kind as the default d (a finite number, a list of numbers as long, a boolean, a string)? */
function sameKind(v, d) {
  if (typeof d === 'number') return typeof v === 'number' && Number.isFinite(v);
  if (Array.isArray(d)) return Array.isArray(v) && v.length === d.length && v.every((x, i) => sameKind(x, d[i]));
  return typeof v === typeof d;
}

/** The value at a dotted key in game_config.js, or `fallback` when it is missing or of the wrong kind. */
export function conf(key, fallback) {
  const v = dig(GAME, key);
  if (v === undefined) { if (fallback !== undefined) warn(key, 'missing'); return fallback; }
  if (fallback !== undefined && !sameKind(v, fallback)) { warn(key, `expected ${Array.isArray(fallback) ? `a list of ${fallback.length}` : typeof fallback}`); return fallback; }
  return v;
}
/** A reader for one section: const M = section('mite'); M('eatSeconds', 3). */
export const section = (name) => (key, fallback) => conf(`${name}.${key}`, fallback);
/** The whole table (for checks and the README). */
export { GAME };
