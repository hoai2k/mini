// Puts the words from text-config.js on the page. index.html names a key on
// each element that shows words, and applyText() fills them in, once, before
// the page shows (the html element carries `text-pending` until then, which
// styles.css keeps invisible). The modules that draw words later ask TEXT
// themselves; rich() is for the few lines that carry **bold** or _emphasis_.

import { TEXT } from './text-config.js';

export { TEXT };

/** The value at a dotted key ('metronome.settings.sound'), or undefined. */
export function lookup(key, table = TEXT) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), table);
}

/**
 * A line with **bold** and _emphasis_ as nodes, nothing else read as markup
 * (so a translated line can never inject HTML).
 */
export function rich(text) {
  const frag = document.createDocumentFragment();
  const re = /\*\*(.+?)\*\*|_(.+?)_/g;
  let at = 0;
  for (let m; (m = re.exec(text));) {
    if (m.index > at) frag.append(text.slice(at, m.index));
    const el = document.createElement(m[1] != null ? 'b' : 'em');
    el.textContent = m[1] ?? m[2];
    frag.append(el);
    at = m.index + m[0].length;
  }
  if (at < text.length) frag.append(text.slice(at));
  return frag;
}

/** Replace an element's contents with a rich line. */
export function setRich(el, text) {
  el.replaceChildren(rich(text));
}

const ATTRIBUTES = ['aria-label', 'placeholder', 'title'];

function value(key) {
  const v = lookup(key);
  if (typeof v === 'string') return v;
  console.error(`text-config: no line for "${key}"`);
  return key;
}

/** Fill every element under `root` that names a key. */
export function applyText(root = document) {
  for (const el of root.querySelectorAll('[data-text]')) el.textContent = value(el.dataset.text);
  for (const el of root.querySelectorAll('[data-text-rich]')) setRich(el, value(el.dataset.textRich));
  for (const attr of ATTRIBUTES) {
    const data = `data-text-${attr}`;
    for (const el of root.querySelectorAll(`[${data}]`)) el.setAttribute(attr, value(el.getAttribute(data)));
  }
  document.documentElement.classList.remove('text-pending');
}

if (typeof document !== 'undefined') applyText();
