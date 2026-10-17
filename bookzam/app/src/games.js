// Board games: first the 5,000 or so games bundled in data/games.json (built
// from Wikidata by tools/build-games.mjs), matched on the phone with no
// network and tolerant of misread letters; then, for games it doesn't have,
// Wikidata's search, among games with a BoardGameGeek ID (property P2339).
// Used where books use Open Library.

import { matchScore, words, wordMatches } from './ocr/spines.js';
import { codeForms } from './barcodes.js';

const API = 'https://www.wikidata.org/w/api.php';
const HEADERS = { 'Api-User-Agent': 'Bookzam/1.0 (https://hoai2k.github.io/mini/bookzam/)' };
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'to', 'for', 'by', 'with', 'game', 'board', 'card']);
const cache = new Map();

function api(params, fetchFn, signal) {
  const url = `${API}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`;
  if (!cache.has(url)) {
    if (cache.size > 500) cache.clear();
    cache.set(url, fetchFn(url, { headers: HEADERS, signal })
      .then((res) => (res.ok ? res.json() : {}))
      .catch((e) => {
        cache.delete(url);
        if (e?.name === 'AbortError') throw e;
        return {};
      }));
  }
  return cache.get(url);
}

/** Forget remembered requests (for tests). */
export function clearGameSearches() {
  cache.clear();
}

// ---------- the bundled games ----------

let local = null; // Promise of {games, index}

/** Use these rows instead of fetching data/games.json (for tests). */
export function setLocalGames(rows) {
  local = Promise.resolve(indexGames(rows));
}

function indexGames(rows) {
  const games = rows.map(([id, label, aliases, bgg, year, minPlayers, maxPlayers, designers, image, links, barcodes = []]) => ({
    id, label, aliases, links, row: { bgg, year, minPlayers, maxPlayers, designers, image, barcodes },
  }));
  const byBarcode = new Map();
  games.forEach((g) => { for (const b of g.row.barcodes) for (const form of codeForms(b)) byBarcode.set(form, g); });
  const index = new Map(); // word -> game numbers
  games.forEach((g, n) => {
    for (const name of [g.label, ...g.aliases]) {
      for (const w of words(name)) {
        if (STOP.has(w)) continue;
        if (!index.has(w)) index.set(w, new Set());
        index.get(w).add(n);
      }
    }
  });
  // Words by first letter, for finding misread ones.
  const byLetter = new Map();
  for (const w of index.keys()) {
    if (w.length < 5) continue;
    if (!byLetter.has(w[0])) byLetter.set(w[0], []);
    byLetter.get(w[0]).push(w);
  }
  return { games, index, byLetter, byBarcode };
}

function loadLocal(fetchFn) {
  if (!local) {
    local = fetchFn(new URL('../data/games.json', import.meta.url))
      .then((res) => (res.ok ? res.json() : []))
      .then(indexGames)
      .catch(() => { local = null; return indexGames([]); });
  }
  return local;
}

/** Bundled games sharing a word with the text (read exactly, or nearly for long words). */
function localCandidates({ games, index, byLetter }, text) {
  const found = new Set();
  for (const w of new Set(words(text))) {
    if (STOP.has(w)) continue;
    for (const n of index.get(w) || []) found.add(n);
    if (w.length >= 5) {
      for (const k of byLetter.get(w[0]) || []) {
        if (k !== w && Math.abs(k.length - w.length) <= 2 && wordMatches(w, k)) for (const n of index.get(k)) found.add(n);
      }
    }
  }
  return [...found].map((n) => games[n]);
}

function localLookup(g) {
  const r = g.row;
  return {
    wikidata: g.id,
    bgg: r.bgg,
    title: g.label,
    year: r.year,
    minPlayers: r.minPlayers,
    maxPlayers: r.maxPlayers,
    designerIds: [],
    designers: r.designers,
    cover: r.image ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(r.image)}?width=240` : null,
  };
}

/** The bundled game the text names: {lookup, match} or null. */
export async function matchLocalGame(text, { fetch: fetchFn = fetch } = {}) {
  const data = await loadLocal(fetchFn);
  const best = pickGame(text, localCandidates(data, text), { fuzzyOneWord: true });
  return best ? { lookup: localLookup(best.game), match: best.match } : null;
}

/**
 * A game for the text: from the bundled list, else from Wikidata's search.
 * {lookup, match} or null.
 */
export async function findGame(text, terms, options = {}) {
  const here = await matchLocalGame(text, options);
  if (here) return here;
  let best = pickGame(text, await searchGames(terms, options));
  if (!best && terms.length > 1) best = pickGame(text, await searchGames(terms, { ...options, any: true }));
  return best ? { lookup: await nameDesigners(toGameLookup(best.game), options), match: best.match } : null;
}

/**
 * The game with this barcode on its box: from the bundled list, else Wikidata
 * (property P3962, a product's GTIN). Its lookup, or null.
 */
export async function gameByBarcode(code, options = {}) {
  const { byBarcode } = await loadLocal(options.fetch || fetch);
  for (const form of codeForms(code)) if (byBarcode.has(form)) return localLookup(byBarcode.get(form));
  for (const form of codeForms(code)) {
    const found = await api({ action: 'query', list: 'search', srsearch: `haswbstatement:P3962=${form}`, srlimit: '1', srprop: '' }, options.fetch || fetch, options.signal);
    const id = found.query?.search?.[0]?.title;
    if (!id) continue;
    const data = await api({ action: 'wbgetentities', ids: id, props: 'labels|aliases|claims', languages: 'en' }, options.fetch || fetch, options.signal);
    const e = data.entities?.[id];
    if (e?.labels?.en) return nameDesigners(toGameLookup({ id, label: e.labels.en.value, aliases: [], claims: e.claims || {} }), options);
  }
  return null;
}

// ---------- Wikidata's search ----------

/** Wikidata items with a BoardGameGeek ID that match the words: [{id, label, aliases, claims}]. */
export async function searchGames(terms, { fetch: fetchFn = fetch, signal, any = false } = {}) {
  if (!terms.length) return [];
  const q = `${terms.join(any ? ' OR ' : ' ')} haswbstatement:P2339`;
  const found = await api({ action: 'query', list: 'search', srsearch: q, srlimit: '6', srprop: '' }, fetchFn, signal);
  const ids = (found.query?.search || []).map((r) => r.title).filter((t) => /^Q\d+$/.test(t));
  if (!ids.length) return [];
  const data = await api({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|aliases|claims', languages: 'en' }, fetchFn, signal);
  return ids.map((id) => data.entities?.[id]).filter(Boolean).map((e) => ({
    id: e.id,
    label: e.labels?.en?.value || '',
    aliases: (e.aliases?.en || []).map((a) => a.value),
    claims: e.claims || {},
  })).filter((g) => g.label);
}

const claim = (g, prop) => (g.claims[prop] || []).map((c) => c.mainsnak?.datavalue?.value).filter((v) => v != null);

/** The game's details for the catalogue (designer names are filled in by `nameDesigners`). */
export function toGameLookup(g) {
  const year = claim(g, 'P577').map((t) => Number(String(t.time).slice(1, 5))).filter(Boolean).sort()[0] || null;
  const amount = (prop) => { const v = claim(g, prop)[0]; return v ? Math.round(Number(v.amount)) : null; };
  const image = claim(g, 'P18')[0];
  return {
    wikidata: g.id,
    bgg: claim(g, 'P2339')[0] || null,
    title: g.label,
    year,
    minPlayers: amount('P1872'),
    maxPlayers: amount('P1873'),
    designerIds: [...claim(g, 'P287'), ...claim(g, 'P178')].map((v) => v.id).filter(Boolean).slice(0, 4),
    designers: [],
    cover: image ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image)}?width=240` : null,
  };
}

/** Fill in designers' names (one request for all of them). */
export async function nameDesigners(lookup, { fetch: fetchFn = fetch, signal } = {}) {
  if (!lookup.designerIds?.length) return lookup;
  const data = await api({ action: 'wbgetentities', ids: lookup.designerIds.join('|'), props: 'labels', languages: 'en' }, fetchFn, signal);
  lookup.designers = lookup.designerIds.map((id) => data.entities?.[id]?.labels?.en?.value).filter(Boolean);
  return lookup;
}

/**
 * The game the text names, or null. Like books, most of the name must be
 * there, in order, and explain most of the text; game names are often one
 * word (Azul, Catan), so one word passes if it was read exactly and is long
 * enough not to be chance.
 */
export function pickGame(text, games, { fuzzyOneWord = false } = {}) {
  let best = null;
  for (const g of games) {
    for (const name of [g.label, ...g.aliases]) {
      const m = matchScore(text, name);
      const nameWords = [...new Set(words(name).filter((w) => !STOP.has(w)))];
      if (m.score < 0.75 || m.explained < 0.5 || !m.inOrder) continue;
      if (nameWords.length < 2) {
        // One word: read exactly, or (from the bundled list, where every name is a
        // real game) nearly, if it's long enough that a near miss isn't chance.
        const one = nameWords[0] || '';
        const exact = one.length >= 4 && words(text).includes(one);
        if (!exact && !(fuzzyOneWord && one.length >= 7)) continue;
      }
      if (m.letters < 4) continue;
      // Better-known games win ties (Wikipedia articles about them).
      const rank = m.score * 2 + m.explained * 2 + Math.min(m.letters, 20) / 20 + (name === g.label ? 0.1 : 0) + Math.log10(1 + (g.links || 0)) / 5;
      if (!best || rank > best.rank) best = { game: g, rank, match: m };
    }
  }
  return best;
}

/** Look a game up by its name (after it's typed in by hand). */
export async function lookupGame(item, options = {}) {
  const terms = words(item.title).filter((w) => !STOP.has(w)).slice(0, 6);
  return (await findGame(item.title, terms, options))?.lookup || null;
}
