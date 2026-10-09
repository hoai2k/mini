// Loads delivered artwork listed in asset-list.js. Anything not delivered (or
// failing to load) returns null, and callers draw their stand-in instead.
//
//   img('puppy')      // image or positioned template canvas once loaded, else null
//   icon('fx-puppy')  // same, for icons
//   assetUrl('logo')  // URL of a delivered asset, else null
//   iconUrl('fx', 'puppy')  // the newest delivered icon: second set, then first

import { ASSET_LIST } from './asset-list.js';

const base = new URL('../', import.meta.url);
const images = new Map();

export function assetUrl(name) {
  const entry = ASSET_LIST[name];
  if (!entry || entry.status !== 'delivered') return null;
  return new URL(entry.file, base).href;
}

// Effect and game icons come in two sets; the second (teen) set replaces the
// first one icon at a time as it is delivered.
export function iconUrl(kind, id) {
  return assetUrl(`${kind}2-${id}`) ?? assetUrl(`${kind}-${id}`);
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
      el.onload = () => {
        const rects = ASSET_LIST[name].templateRects;
        if (rects) {
          // Generated stickers retain their source pixels. Position their parts
          // against the shared face guide once, before the effects draw them.
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1024;
          const ctx = canvas.getContext('2d');
          for (const rect of rects) ctx.drawImage(el, ...rect);
          canvas.dirty = true;
          rec.el = canvas;
        }
        rec.ready = true;
      };
      el.src = url;
      rec.el = el;
    }
  }
  return rec.ready ? rec.el : null;
}

export function preload(names) {
  names.forEach(img);
}
