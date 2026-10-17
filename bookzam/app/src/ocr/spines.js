// Turns OCR text lines into items: lines on the same spine (or the same cover)
// are grouped, and each group's text is what Bookzam looks up. Pure functions.

import { corners } from './core.js';

/** Unit vectors for a line: a along its reading direction, n across it. */
function axes(line) {
  const { ax, ay } = line.dir;
  return { ax, ay, nx: -ay, ny: ax };
}

const textHeight = (line) => line.box.th || line.box.h / 2.5;

/** Where line b lies relative to line a: offset across a's text, and the gap along it (0 if they overlap). */
export function relate(a, b) {
  const { ax, ay, nx, ny } = axes(a);
  const dx = b.box.cx - a.box.cx, dy = b.box.cy - a.box.cy;
  const across = Math.abs(dx * nx + dy * ny);
  const along = Math.abs(dx * ax + dy * ay);
  // Text lengths along the line, without the detector's margin at each end.
  const ends = (l) => Math.max(0, l.box.w - (l.box.h - textHeight(l)));
  const gap = Math.max(0, along - ends(a) / 2 - ends(b) / 2);
  return { across, gap };
}

/**
 * Two lines are on the same spine if they read the same way and either
 * continue one line (in line with each other, a short gap apart) or sit side
 * by side as a spine's second line (within about two letter heights across,
 * overlapping along it). Heights are the letters' own.
 */
export function sameSpine(a, b) {
  const dot = a.dir.ax * b.dir.ax + a.dir.ay * b.dir.ay;
  if (dot < Math.cos((12 * Math.PI) / 180)) return false;
  const ta = textHeight(a), tb = textHeight(b);
  const t = Math.max(ta, tb);
  const { across, gap } = relate(a, b);
  if (across < 0.5 * t) {
    // The same line, broken into words or title and author. Along a spine that can be
    // far; across a shelf, labels on neighbouring spines line up, so only a word space.
    const vertical = Math.abs(a.dir.ay) > Math.SQRT1_2;
    return gap < (vertical ? 6 : 1.2) * t;
  }
  if (Math.min(ta, tb) < 0.55 * t) return false; // very different text sizes across: neighbouring spines
  return across < 1.65 * t && gap < 2 * t;
}

/** Groups of lines, each the text of one item, in reading order. */
export function groupLines(lines) {
  // Greedy, biggest lines first; a line joins a group only if it fits the group's
  // first line and every member, so neighbouring spines can't chain together.
  const order = [...lines].sort((p, q) => q.box.w * q.box.h - p.box.w * p.box.h);
  const clusters = [];
  for (const line of order) {
    const home = clusters.find((c) => sameSpine(c[0], line) && c.every((m) => {
      const { across } = relate(m, line);
      return across < 2.2 * Math.max(textHeight(m), textHeight(line));
    }));
    if (home) home.push(line); else clusters.push([line]);
  }
  return clusters.map(makeGroup);
}

/**
 * Whether two groups lie on one line within a few letter heights of each other:
 * across a shelf that may be one lying spine or labels on two neighbours, so
 * it's for trying both.
 */
export function inLine(a, b) {
  return a.lines.some((p) => b.lines.some((q) => {
    if (p.dir.ax * q.dir.ax + p.dir.ay * q.dir.ay < Math.cos((12 * Math.PI) / 180)) return false;
    const t = Math.max(textHeight(p), textHeight(q));
    const { across, gap } = relate(p, q);
    return across < 0.5 * t && gap < 6 * t;
  }));
}

/** One group from two. */
export function mergeGroups(a, b) {
  return makeGroup([...a.lines, ...b.lines]);
}

function makeGroup(members) {
  {
    // Order by line (across), then along the reading direction.
    const { ax, ay, nx, ny } = axes(members[0]);
    const h = Math.max(...members.map(textHeight));
    members.sort((p, q) => {
      const dn = (p.box.cx - q.box.cx) * nx + (p.box.cy - q.box.cy) * ny;
      if (Math.abs(dn) > h / 2) return dn;
      return (p.box.cx - q.box.cx) * ax + (p.box.cy - q.box.cy) * ay;
    });
    const pts = members.flatMap((m) => corners(m.box));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return {
      lines: members,
      text: members.map((m) => m.text).join(' '),
      score: members.reduce((s, m) => s + m.score * m.text.length, 0) / Math.max(1, members.reduce((s, m) => s + m.text.length, 0)),
      bounds: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
    };
  }
}

const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'to', 'for', 'de', 'la', 'le', 'el', 'der', 'die', 'das', 'und', 'by', 'with']);

/** Lower-case words of at least two letters, without accents. */
export function words(s) {
  return String(s ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/([a-z])(\d)|(\d)([a-z])/g, '$1$3 $2$4') // "erzahlungen1" -> "erzahlungen 1"
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

/** Edit distance, stopping early once it passes `max`. */
export function editDistance(a, b, max = 3) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** True if an OCR'd word is plausibly this word (OCR swaps a letter or two in longer words). */
export function wordMatches(ocr, word, lenient = false) {
  if (ocr === word) return true;
  // Words run together where a space was lost ("PHYLOGENYGOULD", "SKELETONINSIDEYOU").
  if (word.length >= 6 && ocr.length >= word.length + 3 && ocr.includes(word)) return true;
  if (word.length < 5 || ocr.length < 3) return false; // five/fire, java/lava: short words must be exact
  const allowed = word.length >= 8 || (lenient && word.length >= 6) ? 2 : 1;
  // OCR often loses a word's last letter at the edge of a spine.
  if (word.length >= 5 && word.startsWith(ocr) && word.length - ocr.length <= allowed) return true;
  return editDistance(ocr, word, allowed) <= allowed;
}

/** Words OCR read that carry meaning: three letters or more, with a vowel, not a stop word or a number. */
export function strongWords(text) {
  return [...new Set(words(text))].filter((w) => w.length >= 3 && !STOP.has(w) && /[aeiouy]/.test(w) && !/^\d+$/.test(w));
}

/**
 * How well OCR text matches a known title and author: `score` is the share of
 * the title's meaningful words found in the text (0..1), `letters` how many
 * letters of it matched, `author` whether the author's surname is there too,
 * `explained` the share of the text's meaningful words the title and author
 * account for, and `inOrder` whether the title's words came in its order.
 */
export function matchScore(ocrText, title, author = '') {
  const seen = words(ocrText);
  const want = [...new Set(words(title).filter((w) => !STOP.has(w)))];
  const titleWords = want.length ? want : [...new Set(words(title))];
  if (!titleWords.length || !seen.length) return { score: 0, letters: 0, author: false, explained: 0, inOrder: false };
  let found = 0, letters = 0;
  const positions = [];
  for (const w of titleWords) {
    const at = seen.findIndex((s) => wordMatches(s, w));
    if (at >= 0) { found++; letters += w.length; positions.push(at); }
  }
  // Whether the title's words were read in the title's order ("Five Fall" is not "The Fall of Five").
  const inOrder = positions.every((p, i) => i === 0 || p > positions[i - 1]);
  const authorWords = words(author);
  const surname = authorWords[authorWords.length - 1];
  const byAuthor = Boolean(surname && surname.length >= 3 && seen.some((s) => wordMatches(s, surname, true)));
  const known = [...words(title), ...authorWords];
  const strong = strongWords(ocrText);
  const explainedCount = strong.filter((s) => known.some((k) => wordMatches(s, k, true))).length;
  return { score: found / titleWords.length, letters, author: byAuthor, explained: strong.length ? explainedCount / strong.length : 1, inOrder };
}

/** The words worth searching for: OCR'd words that look like words, most confident lines first. */
export function searchWords(group) {
  const out = [];
  for (const line of [...group.lines].sort((a, b) => b.score - a.score)) {
    if (line.score < 0.6) continue;
    for (const w of words(line.text)) {
      if (/^\d+$/.test(w) && w.length < 4) continue; // volume numbers, prices
      if (!/[aeiouy]/.test(w) && w.length > 3) continue; // OCR noise like "rrgs"
      if (!out.includes(w)) out.push(w);
    }
  }
  return out;
}
