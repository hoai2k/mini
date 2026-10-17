// Reads photos on this device: the OCR worker finds the text, then the lines
// are grouped into spines and either looked up (Catalogue) or searched for a
// title (Find Book). Nothing is sent anywhere but Open Library's search.

import { groupLines, matchScore, strongWords, inLine, mergeGroups } from './ocr/spines.js';
import { identify, titleCase, SMALL_PRINT } from './ocr/identify.js';

export const READ_EDGE = 2560; // the detector reads photos at this size; small spine text needs it
let worker = null;
let nextId = 1;
const pending = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./ocr/worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      const msg = event.data;
      const job = pending.get(msg.id);
      if (!job) return;
      if (msg.type === 'progress') { job.onProgress?.(msg); return; }
      pending.delete(msg.id);
      if (msg.type === 'error') job.reject(new Error(msg.message));
      else job.resolve(msg);
    };
    worker.onerror = (e) => {
      for (const job of pending.values()) job.reject(new Error(e.message || 'The reader stopped'));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

function ask(message, transfer, onProgress) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ ...message, id }, transfer);
  });
}

/** Start downloading the reader before it's needed (when the photo picker opens). */
export function warmUp(onProgress) {
  return ask({ type: 'warm' }, [], onProgress).catch(() => {});
}

/** The photo's pixels at no more than READ_EDGE on the long side. */
function pixels(img) {
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  const scale = Math.min(1, READ_EDGE / Math.max(w0, h0));
  const width = Math.round(w0 * scale), height = Math.round(h0 * scale);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  return Object.assign(document.createElement('canvas'), { width, height });
}

/**
 * Every text line in a photo: {lines, width, height}, line boxes in pixels of
 * width x height. onProgress({stage, done, total}).
 */
export async function readPhoto(img, onProgress) {
  const data = pixels(img);
  const msg = await ask({ type: 'read', image: { data: data.data.buffer, width: data.width, height: data.height }, limit: READ_EDGE }, [data.data.buffer], onProgress);
  return { lines: msg.lines, width: data.width, height: data.height };
}

/**
 * The catalogue entries in a read photo: {books, games, unreadable}. `mode`
 * ('books' or 'games', the list the photo was added to) says what everything
 * in it is, and so where it's looked up.
 */
export async function scanLines(lines, { onProgress, fetch: fetchFn = globalThis.fetch?.bind(globalThis), concurrency = 3, mode = 'books' } = {}) {
  let groups = groupLines(lines);
  // Prominent text: letters well above the photo's typical size (a title, not a publisher).
  const heights = lines.map((l) => l.box.th || l.box.h / 2.5).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] || 0;
  const prominent = (g) => Math.max(...g.lines.map((l) => l.box.th || l.box.h / 2.5)) >= 1.3 * median;
  const found = new Array(groups.length).fill(null);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < groups.length) {
      const i = next++;
      try { found[i] = await identify(groups[i], { fetch: fetchFn, prominent: prominent(groups[i]), mode }); } catch { found[i] = null; }
      onProgress?.({ stage: 'lookup', done: ++done, total: groups.length });
    }
  }));
  // Text in line across a shelf may be one lying spine ("OVID   METAMORPHOSES") or
  // labels on two: try unidentified neighbours together, kept only if the lookup knows it.
  for (let i = 0; i < groups.length; i++) {
    if (!groups[i] || found[i]?.lookup || !strongWords(groups[i].text).length) continue;
    for (let j = i + 1; j < groups.length; j++) {
      if (found[j]?.lookup || !groups[j] || !strongWords(groups[j].text).length || !inLine(groups[i], groups[j])) continue;
      const merged = mergeGroups(groups[i], groups[j]);
      let item = null;
      try { item = await identify(merged, { fetch: fetchFn, mode }); } catch { item = null; }
      if (item?.lookup) {
        groups[i] = merged;
        found[i] = item;
        groups[j] = null;
        found[j] = null;
        break;
      }
    }
  }
  const kept = groups.map((g, i) => [g, found[i]]).filter(([g]) => g);
  groups = kept.map(([g]) => g);
  found.splice(0, found.length, ...kept.map(([, f]) => f));
  // A game box's small print ("2-5 players, ages 10+") is never an item itself.
  groups.forEach((g, i) => {
    if (found[i] && !found[i].lookup && SMALL_PRINT.test(g.text) && strongWords(g.text).length <= 4) found[i] = null;
  });
  const items = [];
  // Reading order: top to bottom by shelf, then left to right.
  const order = groups.map((g, i) => i).sort((a, b) => {
    const ga = groups[a].bounds, gb = groups[b].bounds;
    const rowA = Math.round((ga.y0 + ga.y1) / 2 / 200), rowB = Math.round((gb.y0 + gb.y1) / 2 / 200);
    return rowA - rowB || ga.x0 - gb.x0;
  });
  for (const i of order) if (found[i]) items.push(found[i]);
  const unreadable = groups.filter((g, i) => !found[i] && strongWords(g.text).length > 0).length;
  return mode === 'games' ? { books: [], games: items, unreadable } : { books: items, games: [], unreadable };
}

/** A short sentence saying where a box (fractions of the photo) is. */
export function describeWhere(box) {
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  const across = cx < 0.34 ? 'on the left' : cx > 0.66 ? 'on the right' : 'in the middle';
  const down = cy < 0.34 ? 'Near the top' : cy > 0.66 ? 'Near the bottom' : 'Halfway down';
  return `${down}, ${across}.`;
}

/**
 * Where a book is in a read photo. `hint` is the catalogue item the query
 * names, if any ({title, author, read}), which adds its author and how its
 * spine read last time.
 * Returns {found, title, box (fractions), where, similar: [text]}.
 */
export function findInLines(lines, width, height, query, hint = null) {
  const groups = groupLines(lines);
  // The query matches a spine directly (a title, or an author printed on it), or
  // through the catalogue: its full title and author, and how its spine read before.
  const scored = groups.map((g) => {
    const tries = [matchScore(g.text, query)];
    if (hint) {
      const known = matchScore(g.text, hint.title, hint.author || '');
      tries.push({ ...known, score: known.score + (known.author ? 0.25 : 0) });
      if (hint.read) { const before = matchScore(g.text, hint.read); tries.push({ ...before, score: before.score * 0.95 }); }
    }
    return { g, score: Math.max(...tries.map((t) => t.score)), letters: Math.max(...tries.map((t) => t.letters)) };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score || b.letters - a.letters);
  const best = scored[0];
  if (best && best.score >= 0.6 && best.letters >= 3) {
    const b = best.g.bounds;
    const box = { x0: Math.max(0, b.x0 / width), y0: Math.max(0, b.y0 / height), x1: Math.min(1, b.x1 / width), y1: Math.min(1, b.y1 / height) };
    return { found: true, title: hint?.title || query, read: best.g.text, box, where: describeWhere(box), similar: [] };
  }
  // Not there: offer the closest readings, else the clearest ones.
  const similar = (scored.length ? scored.map((s) => s.g) : groups.filter((g) => g.score >= 0.85).sort((a, b) => b.text.length - a.text.length))
    .map((g) => tidy(g.text)).filter((t) => strongWords(t).length).slice(0, 5);
  return { found: false, title: null, box: null, where: '', similar };
}

function tidy(text) {
  return titleCase(text.replace(/\s+/g, ' ').trim().slice(0, 60));
}
