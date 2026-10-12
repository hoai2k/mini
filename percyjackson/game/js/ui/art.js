// The pictures the screens show, loaded (and decoded) behind the loading
// screen before the title appears, so nothing is drawn as a placeholder
// first and swapped later: the logo (keyed out of its magenta ground once,
// here), the title backdrop, the heroes' faces and cards, the chapter cards
// and the cutscene pictures. Every one of them is delivered
// (design/image-request-history.md).
//
// After loading, artReady(src) says whether a picture can be shown; a file
// that failed to load is simply left out where it would appear (never a
// drawn stand-in). The images stay referenced here, so the browser keeps them
// decoded for CSS backgrounds and <img> tags with the same URL.
import { CHAPTERS } from '../story/chapters.js';

export const LOGO = 'assets/logo-web.png';
export const TITLE_BG = 'assets/title-bg.jpg';
const HERO_ART = ['percy', 'annabeth', 'grover', 'tyson', 'clarisse', 'thalia', 'nico'].flatMap((id) => [`assets/heroes/${id}-face.jpg`, `assets/heroes/${id}-card.jpg`]);
// the pictures inside the opening's cutscenes (story/cutscenes.js)
export const CUTSCENE_ART = ['scene-field-trip', 'scene-bus-ride', 'scene-museum-steps', 'scene-montauk', 'scene-storm-drive', 'scene-big-house'].map((n) => `assets/cards/${n}.jpg`);
export const CHAPTER_ART = [...new Set(CHAPTERS.map((c) => c.card).filter(Boolean))];
// everything, the title's own pictures first
export const ALL_ART = [...new Set([LOGO, TITLE_BG, ...HERO_ART, ...CHAPTER_ART, ...CUTSCENE_ART])];

const cache = new Map();   // src -> { img, ok, promise }
let logo = null;           // the keyed logo canvas

function load(src) {
  let e = cache.get(src);
  if (e) return e.promise;
  const img = new Image();
  img.decoding = 'async';
  e = { img, ok: false };
  e.promise = new Promise((resolve) => {
    img.onload = () => { (img.decode ? img.decode() : Promise.resolve()).catch(() => { }).then(() => { e.ok = true; resolve(true); }); };
    img.onerror = () => { e.ok = false; console.warn('art: could not load', src); resolve(false); };
  });
  img.src = src;
  cache.set(src, e);
  return e.promise;
}
// Load every picture in `list`; onEach(done, total) after each. Never rejects.
export async function preloadArt(list = ALL_ART, onEach) {
  let done = 0;
  await Promise.all(list.map((src) => load(src).then(() => { done++; onEach?.(done, list.length); })));
  return list.every((s) => cache.get(s)?.ok);
}
export const artReady = (src) => !!cache.get(src)?.ok;
export const artImage = (src) => (cache.get(src)?.ok ? cache.get(src).img : null);
// Start loading one picture (if it isn't yet) and call back once it can be shown.
export function whenArt(src, fn) { return load(src).then((ok) => { if (ok) fn(cache.get(src).img); return ok; }); }

// assets/logo-web.png is drawn on flat magenta (#FF00FF): key it out and trim
// the empty margin.
export function keyMagenta(img, maxW = 1400) {
  const k = Math.min(1, maxW / img.naturalWidth);
  const w = Math.round(img.naturalWidth * k), hh = Math.round(img.naturalHeight * k);
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, hh);
  const id = ctx.getImageData(0, 0, w, hh), d = id.data;
  let x0 = w, y0 = hh, x1 = 0, y1 = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const m = Math.min(r, b) - g;                       // how magenta the pixel is
    let a = 1 - Math.min(1, Math.max(0, (m - 60) / 110));
    if (a < 1) {                                        // remove magenta spill from soft edges
      if (a <= 0.02) { d[i + 3] = 0; continue; }
      d[i] = Math.max(0, Math.min(255, (r - (1 - a) * 255) / a));
      d[i + 2] = Math.max(0, Math.min(255, (b - (1 - a) * 255) / a));
      d[i + 3] = Math.round(d[i + 3] * a);
    }
    if (d[i + 3] > 20) { const p = i / 4, x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  ctx.putImageData(id, 0, 0);
  if (x1 <= x0 || y1 <= y0) return c;
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
// Key the logo (once the picture has loaded). Returns the canvas, or null if the picture is missing.
export function prepareLogo() {
  if (logo) return logo;
  const img = artImage(LOGO);
  if (!img) return null;
  try { logo = keyMagenta(img); } catch (e) { console.warn('logo', e); logo = null; }
  return logo;
}
// A copy of the keyed logo for a screen to show (null if there is none).
export function logoCanvas() {
  const src = prepareLogo(); if (!src) return null;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
