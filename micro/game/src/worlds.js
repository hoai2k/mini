// The seven worlds of Micro Zoom, in chain order (largest field first). Data
// on the cards is from micro/design/zoom-chain-levels.md and each
// prototype's README: magnification (or field width), body size, look.
// `fieldMm` is the field width the transition zooms through (log scale).
// `back` says whether the world has a way back up (Y at its ring).
//
// Every word the player sees (name, creature, Latin name, look,
// magnification, field, body, the card's line, the one-line goal, the
// controls labels and the field notes) is in
// micro/text_config.js under `worlds.<id>`; it is merged
// in below, so each world here carries the same fields as before.
import { tx } from '../shared/text.js';

const TEXT_FIELDS = ['name', 'creature', 'latin', 'look', 'mag', 'magNote', 'field', 'body', 'line', 'goal', 'controls', 'facts'];

const DATA = [
  { id: 'springtail', n: 1, fieldMm: 18, card: 'MP-U05', intro: 'MP-G07', tint: ['#6f8f6a', '#1d2a1c'], accent: '#9fbf6a', back: false },
  { id: 'mite', n: 2, fieldMm: 4.2, card: 'MP-U01', intro: 'MP-G08', tint: ['#8a8e92', '#1c1e20'], accent: '#c9cdd1', back: true },
  { id: 'tardigrade', n: 3, fieldMm: 1.8, card: 'MP-U02', intro: 'MP-G09', tint: ['#a9b4a0', '#3d4a3a'], accent: '#c8d4b8', back: true },
  { id: 'amoeba', n: 4, fieldMm: 1.4, card: 'MP-U03', intro: 'MP-G10', tint: ['#efe6cf', '#a99f84'], accent: '#e8d9a8', back: true },
  { id: 'paramecium', n: 5, fieldMm: 0.9, card: 'MP-U04', intro: 'MP-P08', tint: ['#2a4a6a', '#05070b'], accent: '#8fc0e8', back: true },
  { id: 'bacterium', n: 6, fieldMm: 0.18, card: 'MP-U06', intro: 'MP-G12', tint: ['#2a2f3a', '#08090c'], accent: '#a8b4c8', back: true },
  { id: 'phage', n: 7, fieldMm: 0.0012, card: 'MP-U09', intro: 'MP-G14', tint: ['#1f6f80', '#f0b44a'], accent: '#f0c070', back: true },
];

export const WORLDS = DATA.map((w) => ({ ...w, ...Object.fromEntries(TEXT_FIELDS.map((k) => [k, tx(`worlds.${w.id}.${k}`)])) }));

export const byId = Object.fromEntries(WORLDS.map((w) => [w.id, w]));
export const indexOf = (id) => WORLDS.findIndex((w) => w.id === id);
