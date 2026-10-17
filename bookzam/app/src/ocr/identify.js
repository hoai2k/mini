// Works out which book a spine's OCR text is: one Open Library search that
// ORs the words it read (so a misread word doesn't sink it), then a fuzzy
// check that the result's title really is in the text.

import { searchWords, matchScore, words, strongWords } from './spines.js';
import { toLookup } from '../lookup.js';
import { searchGames, pickGame, toGameLookup, nameDesigners } from '../games.js';

const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'to', 'for', 'by', 'with', 'de', 'la', 'le', 'el', 'der', 'die', 'das', 'und']);
const FIELDS = 'key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median,publisher,subject,edition_count';
const searches = new Map(); // query -> Promise of Open Library docs, for this page's life

/** Forget remembered searches (for tests). */
export function clearSearches() {
  searches.clear();
}

/** A game box's small print: player counts, ages, playing time. */
export const SMALL_PRINT = /\b(players?|spieler|joueurs|ages?\s*\d+|\d+\s*\+|\d+\s*(?:-|–)\s*\d+\s*min|\d+\s*min(?:utes)?)(?![a-z])/i;

/** The words to search Open Library for: the group's meaningful words, at most eight. */
export function queryWords(group) {
  return searchWords(group).filter((w) => !STOP.has(w) && (w.length >= 3 || /\d/.test(w))).slice(0, 8);
}

/** The best Open Library result for the text, or null if none is convincingly it. */
export function pickMatch(text, docs) {
  const fits = [];
  for (const doc of docs) {
    if (!doc?.title) continue;
    const author = (doc.author_name || [])[0] || '';
    const m = matchScore(text, doc.title, author);
    // Most of the title must be there, enough of it that a common word can't pass
    // alone, and the title and author must account for a fair share of what was read.
    if (m.score < 0.75) continue;
    if (m.letters < 6 && !(m.author && m.letters >= 3)) continue;
    if (m.explained < 0.55) continue;
    const titleWords = [...new Set(words(doc.title).filter((w) => !STOP.has(w)))];
    // A one-word title ("Android", "Starfish") is too easy to hit by chance: it needs its author too.
    if (titleWords.length < 2 && !m.author) continue;
    // Short titles read out of order are a different book, unless the author confirms it.
    if (!m.inOrder && titleWords.length <= 3 && !m.author) continue;
    // A "title" that is just the author's name is a collection or a biography, not this spine.
    const authorWords = words(author);
    if (titleWords.every((w) => authorWords.includes(w)) && words(text).some((w) => w.length > 3 && !authorWords.includes(w))) continue;
    const rank = m.score * 2 + m.explained * 2 + (m.author ? 1.5 : 0) + Math.min(m.letters, 20) / 20 + Math.log10(1 + (doc.edition_count || 0)) / 4;
    fits.push({ doc, rank, match: m });
  }
  if (!fits.length) return null;
  fits.sort((a, b) => b.rank - a.rank);
  const best = fits[0];
  // The same title by someone else fits as well and nothing names the author: the
  // title is right but which book it is isn't known (Obras completas, Collected Poems).
  const norm = (t) => words(t).join(' ');
  // "Stephen Prata" and "Prata, Stephen" are the same author.
  const surname = (doc) => {
    const name = String((doc.author_name || [])[0] || '');
    return (name.includes(',') ? words(name.split(',')[0]) : words(name)).pop() || '';
  };
  // Unless one is far better known (editions of the same book) or the title is long enough to be distinctive.
  const editions = (f) => f.doc.edition_count || 1;
  best.ambiguous = !best.match.author && words(best.doc.title).filter((w) => !STOP.has(w)).length < 3
    && fits.some((f) => f !== best && !f.match.author && norm(f.doc.title) === norm(best.doc.title)
      && surname(f.doc) !== surname(best.doc) && editions(best) < 4 * editions(f));
  return best;
}

/** Title case for text read in capitals; mixed-case readings are kept as printed. */
export function titleCase(s) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s\-/(&".])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase());
}

/**
 * An item for one group of lines, as a book (Open Library) or a board game
 * (Wikidata) as `mode` says: {kind, title, author | designer, confidence,
 * lookup} when it's known, an unconfirmed item when the text is clear enough
 * to keep, or null.
 */
export async function identify(group, { fetch: fetchFn = fetch, signal, prominent = false, mode = 'books' } = {}) {
  const terms = queryWords(group);
  const letters = words(group.text).join('').length;
  if (!terms.length || letters < 4) return null;
  if (mode === 'games') return identifyGame(group, terms, { fetch: fetchFn, signal, prominent });
  const search = (q) => {
    // The same words come up again and again on one shelf (a series, a run of volumes).
    const key = q.toLowerCase();
    if (!searches.has(key)) {
      if (searches.size > 500) searches.clear();
      const url = `https://openlibrary.org/search.json?${new URLSearchParams({ q, limit: '12', fields: FIELDS })}`;
      searches.set(key, fetchFn(url, { signal })
        .then(async (res) => (res.ok ? (await res.json()).docs || [] : []))
        .catch((e) => {
          searches.delete(key);
          if (e?.name === 'AbortError') throw e;
          return [];
        }));
    }
    return searches.get(key);
  };
  // Every word first: precise when the reading is clean. Then any word, so a
  // misread word doesn't sink it and the fuzzy check sorts the results.
  let best = pickMatch(group.text, await search(terms.join(' ')));
  if (!best && terms.length > 1) best = pickMatch(group.text, await search(terms.join(' OR ')));
  if (best?.ambiguous) {
    return { kind: 'book', title: best.doc.title, author: null, confidence: 0.5, lookup: null, read: group.text };
  }
  return best ? bookItem(best, group) : unconfirmed(group, 'book', prominent);
}

function bookItem(best, group) {
  const lookup = toLookup(best.doc);
  return {
    kind: 'book',
    title: best.doc.title,
    author: lookup.authors[0] || null,
    confidence: Math.round(Math.min(1, best.match.score * (best.match.author ? 1 : 0.85)) * 100) / 100,
    lookup,
    read: group.text,
  };
}

async function identifyGame(group, terms, options) {
  let best = pickGame(group.text, await searchGames(terms, options));
  if (!best && terms.length > 1) best = pickGame(group.text, await searchGames(terms, { ...options, any: true }));
  if (!best) return unconfirmed(group, 'game', options.prominent);
  const lookup = await nameDesigners(toGameLookup(best.game), options);
  return {
    kind: 'game',
    title: lookup.title,
    author: null,
    designer: lookup.designers[0] || null,
    year: lookup.year,
    confidence: Math.round(best.match.score * 100) / 100,
    lookup,
    read: group.text,
  };
}

/** Not something the catalogue knows: keep it if the reading is clean, so it can be fixed by hand. */
function unconfirmed(group, kind, prominent) {
  const clean = group.lines.filter((l) => l.score >= 0.88).map((l) => l.text).join(' ').trim();
  const real = strongWords(clean);
  // One word is kept only when it's big, prominent text, and only for games (Azul,
  // Catan); on a bookshelf a lone word is a publisher or a fragment.
  const single = kind === 'game' && real.length === 1 && prominent && real[0].length >= 4;
  if ((real.length >= 2 && real.join('').length >= 8) || single) {
    return {
      single,
      kind,
      title: titleCase(clean).slice(0, 120),
      author: null,
      confidence: 0.4,
      lookup: null,
      read: group.text,
    };
  }
  return null;
}
