// Every piece of text the game shows, under readable keys, in one place.
// Edit the strings here to change what players read; keep the keys and the
// {placeholders}. Code asks for text with t('section.key', { vars }).
//
// i18n: a language pack is an object with the same keys (any subset);
// setText(pack) lays it over these strings. Strings read when a module
// loads (names in data tables) take a pack only if it is set before the game
// starts, so call setText before importing main.js.
//
// (While the extraction is under way the sections live in js/text/*.js; they
// are merged into this file when it is finished.)
import story from './text/story.js';
import heroes from './text/heroes.js';
import items from './text/items.js';
import world from './text/world.js';
import ui from './text/ui.js';
import menus from './text/menus.js';
import game from './text/game.js';

export const TEXT = {};
for (const part of [story, heroes, items, world, ui, menus, game]) deepMerge(TEXT, part);

function deepMerge(into, from) {
  for (const [k, v] of Object.entries(from)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) deepMerge(into[k] ??= {}, v);
    else into[k] = v;
  }
  return into;
}

const warned = new Set();
// Look up a dotted key. vars fill {name} placeholders. A missing key warns once
// and shows the key itself, so a gap is visible rather than blank.
export function t(key, vars) {
  let v = TEXT;
  for (const part of key.split('.')) { v = v?.[part]; if (v == null) break; }
  if (v == null) {
    if (!warned.has(key)) { warned.add(key); console.warn(`text_config: no text for "${key}"`); }
    return key;
  }
  if (typeof v !== 'string') return v;   // arrays and groups come back as they are
  return vars ? v.replace(/\{(\w+)\}/g, (m, n) => (vars[n] ?? m)) : v;
}
// Counted text: key.one / key.other (and key.zero if present), with {n} filled in.
export function tn(key, n, vars) {
  const form = n === 0 && t(`${key}.zero`) !== `${key}.zero` ? 'zero' : n === 1 ? 'one' : 'other';
  return t(`${key}.${form}`, { n, ...vars });
}
// Lay a language pack (or any overrides) over the text.
export function setText(pack) { deepMerge(TEXT, pack); }
// Fill HTML text from keys: <span data-t="title.pressStart"></span>, and
// data-t-aria-label / data-t-title / data-t-placeholder for attributes.
export function applyText(root = document) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
    for (const el of root.querySelectorAll(`[data-t-${attr}]`)) el.setAttribute(attr, t(el.getAttribute(`data-t-${attr}`)));
  }
}
