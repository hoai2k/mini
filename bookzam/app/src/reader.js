// Reads photos on this device: the OCR worker finds the text, then the lines
// are grouped into spines and either looked up (Catalogue) or searched for a
// title (Find Book). Barcodes are read too, and each spine's look is kept so
// a known spine can be recognised when its title can't be read. Nothing is
// sent anywhere but the words read, to Open Library or Wikidata.

import { groupLines, matchScore, strongWords, inLine, mergeGroups } from './ocr/spines.js';
import { identify, titleCase, SMALL_PRINT } from './ocr/identify.js';
import { readBarcodes } from './barcodes.js';
import { planes, spineRect, scaleRect, describe, prepare, lookOf, bestMatch, isSure } from './looks.js';

export const READ_EDGE = 2560; // the detector reads photos at this size; small spine text needs it
const LOOK_EDGE = 1024; // spines' looks are taken at this size
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

/** The photo's pixels at no more than `edge` on the long side. */
function pixels(img, edge = READ_EDGE) {
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  const scale = Math.min(1, edge / Math.max(w0, h0));
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
 * Everything read in a photo: {lines, width, height, barcodes, look}. Line
 * boxes are in pixels of width x height; lines that were seen but not read
 * have `unread: true`. `look` is the photo at LOOK_EDGE for taking spines'
 * looks ({planes, scale (from line pixels), image}). onProgress({stage, done, total}).
 */
export async function readPhoto(img, onProgress) {
  const data = pixels(img);
  const small = pixels(img, LOOK_EDGE);
  let barcodes = [];
  try { barcodes = await readBarcodes(data); } catch (e) { console.warn('Bookzam: barcodes not read', e); }
  const { width, height } = data;
  const msg = await ask({ type: 'read', image: { data: data.data.buffer, width, height }, limit: READ_EDGE, keepUnread: true }, [data.data.buffer], onProgress);
  return { lines: msg.lines, width, height, barcodes, look: { planes: planes(small), scale: small.width / width, image: small } };
}

/** The look of a group of lines in a read photo (raw cells, see looks.js). */
export function lookAt(read, group) {
  return describe(read.look.planes, scaleRect(spineRect(group), read.look.scale));
}

/** A saved look for an item found as `group`, and a small upright picture of that spine. */
export function saveLook(read, group) {
  const rect = scaleRect(spineRect(group), read.look.scale);
  return { look: lookOf(read.look.planes, rect), thumb: spineThumb(read.look.image, rect) };
}

/** The spine's label area turned to read left to right, as a small JPEG data URL. */
function spineThumb(image, r) {
  if (typeof document === 'undefined') return null;
  try {
    const page = (w0, h0) => Object.assign(document.createElement('canvas'), { width: w0, height: h0 });
    const src = page(image.width, image.height);
    src.getContext('2d').putImageData(image, 0, 0);
    const h = 40, w = Math.max(40, Math.min(240, Math.round((h * r.len) / r.thick)));
    const out = page(w, h);
    const ctx = out.getContext('2d');
    // Map the spine rectangle (reading along (ax, ay)) onto the w x h picture.
    const sx = w / r.len, sy = h / r.thick;
    ctx.setTransform(r.ax * sx, -r.ay * sy, r.ay * sx, r.ax * sy, 0, 0);
    ctx.translate(-(r.cx - (r.ax * r.len) / 2 + (r.ay * r.thick) / 2), -(r.cy - (r.ay * r.len) / 2 - (r.ax * r.thick) / 2));
    ctx.drawImage(src, 0, 0);
    return out.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}

/**
 * The catalogue entries in a read photo: {books, games, unreadable}. `mode`
 * ('books' or 'games', the list the photo was added to) says what everything
 * in it is, and so where it's looked up.
 */
export async function scanLines(allLines, { onProgress, fetch: fetchFn = globalThis.fetch?.bind(globalThis), concurrency = 3, mode = 'books' } = {}) {
  const lines = allLines.filter((l) => !l.unread);
  let groups = groupLines(lines);
  // Prominent text: letters well above the photo's typical size (a title, not a publisher).
  const heights = lines.map((l) => l.box.th || l.box.h / 2.5).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] || 0;
  const prominent = (g) => Math.max(...g.lines.map((l) => l.box.th || l.box.h / 2.5)) >= 1.3 * median;
  // A game box's small print ("2-5 players, ages 10+") is never an item, and
  // looking it up only finds games with "Ages" in the name.
  const smallPrint = (g) => SMALL_PRINT.test(g.text) && strongWords(g.text).length <= 4;
  groups = groups.filter((g) => !smallPrint(g));
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
  const items = [];
  // Reading order: top to bottom by shelf, then left to right.
  const order = groups.map((g, i) => i).sort((a, b) => {
    const ga = groups[a].bounds, gb = groups[b].bounds;
    const rowA = Math.round((ga.y0 + ga.y1) / 2 / 200), rowB = Math.round((gb.y0 + gb.y1) / 2 / 200);
    return rowA - rowB || ga.x0 - gb.x0;
  });
  for (const i of order) {
    if (!found[i]) continue;
    // Where it was, for taking its look (not enumerable, so it's never saved).
    Object.defineProperty(found[i], 'group', { value: groups[i], enumerable: false });
    items.push(found[i]);
  }
  // Places with text that didn't become an item, and text seen but not read: a
  // known spine may still be recognised there by its look.
  const leftovers = [...groups.filter((g, i) => !found[i]), ...groupLines(allLines.filter((l) => l.unread).map((l) => ({ ...l, text: '' })))];
  const unreadable = groups.filter((g, i) => !found[i] && strongWords(g.text).length > 0).length;
  return mode === 'games' ? { books: [], games: items, unreadable, leftovers } : { books: items, games: [], unreadable, leftovers };
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

/**
 * Find Book in a read photo (from readPhoto): by the text read first, then,
 * for a catalogued item (`hint` with saved `looks`), by its spine's look among
 * the places text was seen, read or not. The result has `byLook: true` when
 * the look found it.
 */
export function findInRead(read, query, hint = null) {
  const readable = read.lines.filter((l) => !l.unread);
  const byText = findInLines(readable, read.width, read.height, query, hint);
  if (byText.found || !hint?.looks?.length) return byText;
  // Places where text was seen, read or not, compared whole with the saved looks:
  // on real shelves that never picked a wrong spine at the SURE threshold, where
  // searching windows inside them did (sibling volumes in a series look alike).
  const places = groupLines(read.lines.map((l) => (l.unread ? { ...l, text: '' } : l)));
  const looks = places.map((g) => prepare(lookAt(read, g)));
  let best = null;
  for (const look of hint.looks) {
    const m = bestMatch(look, looks);
    if (isSure(m) && (!best || m.score > best.score)) best = m;
  }
  if (!best) return byText;
  const b = places[best.index].bounds;
  const box = { x0: Math.max(0, b.x0 / read.width), y0: Math.max(0, b.y0 / read.height), x1: Math.min(1, b.x1 / read.width), y1: Math.min(1, b.y1 / read.height) };
  return { found: true, byLook: true, title: hint.title, box, where: describeWhere(box), similar: [], score: best.score };
}
