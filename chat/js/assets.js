// Loads delivered artwork listed in asset-list.js. Anything not delivered (or
// failing to load) returns null, and callers draw their stand-in instead.
//
//   img('puppy')      // HTMLImageElement once loaded, else null
//   icon('fx-puppy')  // same, for icons
//   assetUrl('logo')  // URL of a delivered asset, else null

import { ASSET_LIST } from './asset-list.js';

const base = new URL('../', import.meta.url);
const images = new Map();

export function assetUrl(name) {
  const entry = ASSET_LIST[name];
  if (!entry || entry.status !== 'delivered') return null;
  return new URL(entry.file, base).href;
}

export function img(name) {
  let rec = images.get(name);
  if (!rec) {
    rec = { el: null, ready: false };
    images.set(name, rec);
    const url = assetUrl(name);
    if (url) {
      const el = new Image();
      el.decoding = 'async';
      el.onload = () => { rec.ready = true; };
      el.src = url;
      rec.el = el;
    }
  }
  return rec.ready ? rec.el : null;
}

export function preload(names) {
  names.forEach(img);
}
