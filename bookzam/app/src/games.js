// Board games on Wikidata: free, open to pages on any site, and most published
// games there carry their BoardGameGeek ID (property P2339), which is what the
// search asks for. Used where books use Open Library.

import { matchScore, words } from './ocr/spines.js';

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
export function pickGame(text, games) {
  let best = null;
  for (const g of games) {
    for (const name of [g.label, ...g.aliases]) {
      const m = matchScore(text, name);
      const nameWords = [...new Set(words(name).filter((w) => !STOP.has(w)))];
      if (m.score < 0.75 || m.explained < 0.5 || !m.inOrder) continue;
      if (nameWords.length < 2 && !(nameWords[0]?.length >= 4 && words(text).includes(nameWords[0]))) continue;
      if (m.letters < 4) continue;
      const rank = m.score * 2 + m.explained * 2 + Math.min(m.letters, 20) / 20 + (name === g.label ? 0.1 : 0);
      if (!best || rank > best.rank) best = { game: g, rank, match: m };
    }
  }
  return best;
}

/** Look a game up by its name (after it's typed in by hand). */
export async function lookupGame(item, options = {}) {
  const terms = words(item.title).filter((w) => !STOP.has(w)).slice(0, 6);
  let best = pickGame(item.title, await searchGames(terms, options));
  if (!best && terms.length > 1) best = pickGame(item.title, await searchGames(terms, { ...options, any: true }));
  return best ? nameDesigners(toGameLookup(best.game), options) : null;
}
