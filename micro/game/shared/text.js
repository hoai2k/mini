// Text lookup for Micro Zoom: every player-facing string lives in
// text_config.js (TEXT), under readable dotted keys. Code asks for a string by
// key instead of writing it inline:
//
//   t('shell.pause.resume')                          → 'Resume'
//   t('springtail.toasts.fed', { name, pct: 12 })    → 'Fed on aphid (+12% health)'
//   t('shell.intro.begin', { glyph })                → 'Press <A glyph> to begin'
//   tx('worlds.springtail.facts')                    → the array itself
//
// Placeholders: {name} is filled from the vars object; {btn:A} is a button
// glyph, drawn by vars.glyph(button) when given, else by the renderer set
// with setGlyphRenderer, else left as the bare button name ('A').
// A missing key falls back to English (TEXT), then to the key itself, and
// warns once in the console.
//
// Another language later: build an object with the same shape as TEXT
// (only the strings change; any key it leaves out falls back to English) and
// call setLocale(thatObject) before the page builds its text.
import { TEXT } from '../../text_config.js';

let locale = null;
let glyphRenderer = null;
const warned = new Set();

const dig = (root, key) => {
  let o = root;
  for (const k of key.split('.')) { if (o == null || typeof o !== 'object') return undefined; o = o[k]; }
  return o;
};
function lookup(key) {
  const v = locale ? dig(locale, key) : undefined;
  return v !== undefined ? v : dig(TEXT, key);
}
function warn(key) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[micro text] missing text key: ${key}`);
}

/** Use another language's table (same shape as TEXT); null goes back to English. */
export function setLocale(table) { locale = table || null; }

/** How {btn:X} placeholders are drawn when the call passes no vars.glyph. */
export function setGlyphRenderer(fn) { glyphRenderer = fn || null; }

/** True when the key has text (no warning when it has none). */
export function has(key) { return lookup(key) !== undefined; }

/** Fill {name} and {btn:X} placeholders in a string. */
export function fill(s, vars) {
  return String(s).replace(/\{(\w+)(?::([^{}]+))?\}/g, (m, name, arg) => {
    if (arg !== undefined) {
      if (name !== 'btn') return m;
      const g = (vars && typeof vars.glyph === 'function') ? vars.glyph : glyphRenderer;
      return g ? g(arg) : arg;
    }
    return vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
  });
}

/** The string at a dotted key, with its placeholders filled. */
export function t(key, vars) {
  const v = lookup(key);
  if (typeof v !== 'string') { warn(key); return key; }
  return fill(v, vars);
}

/** The raw value at a dotted key (an array, an object or a string), unfilled. */
export function tx(key, fallback) {
  const v = lookup(key);
  if (v === undefined) { warn(key); return fallback !== undefined ? fallback : key; }
  return v;
}

/**
 * Fill static markup from keys: data-t (text), data-t-html (markup, with
 * {btn:X} drawn by opts.glyph), data-t-aria (aria-label), data-t-title
 * (title), data-t-alt (alt).
 */
export function fillText(root = document, { glyph } = {}) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of root.querySelectorAll('[data-t-html]')) el.innerHTML = t(el.dataset.tHtml, { glyph });
  for (const el of root.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(el.dataset.tAria));
  for (const el of root.querySelectorAll('[data-t-title]')) el.title = t(el.dataset.tTitle);
  for (const el of root.querySelectorAll('[data-t-alt]')) el.alt = t(el.dataset.tAlt);
}
