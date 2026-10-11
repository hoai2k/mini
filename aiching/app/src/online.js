// Guidance from the open web for the day of the reading. Everything here is
// optional: a reading is complete without it, and each source fails quietly.
//
// - Wikipedia's daily feed: an "on this day" event, the news and the picture
//   of the day, each scored against the question, its topic and the trigrams.
// - Wikipedia summaries of lore chosen for the question's topic and the
//   hexagram's trigrams.

import { TRIGRAM_WORDS, TOPIC_WORDS_ONLINE } from './lore.js';

const API = 'https://en.wikipedia.org/api/rest_v1';
const TIMEOUT_MS = 8000;

async function getJSON(url, fetchImpl = globalThis.fetch) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetchImpl(url, { signal: ctrl?.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function cached(key, make) {
  try {
    const hit = sessionStorage.getItem(key);
    if (hit) return Promise.resolve(JSON.parse(hit));
  } catch { /* storage unavailable */ }
  return make().then((value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked */ }
    return value;
  });
}

const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** Score a text by how many of the weighted words it contains. */
export function score(text, weighted) {
  const t = ` ${String(text).toLowerCase()} `;
  let s = 0;
  for (const [word, w] of weighted) {
    if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(t)) s += w;
  }
  return s;
}

/** The words a reading looks for in the day's events, with weights. */
export function matchWords(reading) {
  const out = new Map();
  const add = (w, v) => { if (w && w.length > 2) out.set(w, Math.max(out.get(w) || 0, v)); };
  for (const w of reading.about.keywords) add(w, 5);
  for (const w of TOPIC_WORDS_ONLINE[reading.lens] || []) add(w, 3);
  for (const w of reading.primary.keywords) add(w.toLowerCase(), 2);
  for (const w of TRIGRAM_WORDS[reading.trigrams.upper.key]) add(w, 1.5);
  for (const w of TRIGRAM_WORDS[reading.trigrams.lower.key]) add(w, 1);
  return [...out];
}

function pageOf(p) {
  if (!p) return null;
  return {
    title: stripHtml(p.titles?.normalized || p.title),
    extract: p.extract || '',
    thumb: p.thumbnail?.source || null,
    url: p.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title || '')}`,
  };
}

/** Pick from the day's feed what speaks to the reading. Pure, for tests. */
export function chooseFromFeed(feed, reading) {
  const words = matchWords(reading);
  const events = (feed.onthisday || []).map((e) => {
    const text = `${e.text} ${(e.pages || []).map((p) => `${p.title} ${p.extract || ''}`).join(' ')}`;
    return { e, s: score(text, words) };
  });
  events.sort((a, b) => b.s - a.s);
  // With nothing matching, fall back to the seed so different questions
  // still see different events.
  let best = events[0];
  if (best && best.s === 0) best = events[Number.parseInt(reading.seed, 36) % events.length];
  const news = (feed.news || []).map((n) => ({ n, s: score(stripHtml(n.story), words) })).sort((a, b) => b.s - a.s)[0];

  return {
    event: best ? {
      year: best.e.year,
      text: best.e.text,
      matched: best.s > 0,
      page: pageOf((best.e.pages || []).find((p) => p.thumbnail) || best.e.pages?.[0]),
    } : null,
    news: news && news.s > 0 ? { text: stripHtml(news.n.story), page: pageOf(news.n.links?.[0]) } : null,
    picture: feed.image ? {
      title: stripHtml(feed.image.title).replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
      description: stripHtml(feed.image.description?.text),
      src: feed.image.thumbnail?.source || feed.image.image?.source,
      url: feed.image.file_page,
      artist: stripHtml(feed.image.artist?.text),
    } : null,
    featured: feed.tfa ? pageOf(feed.tfa) : null,
  };
}

export async function dailyFeed(day, fetchImpl) {
  const [y, m, d] = day.split('-');
  return cached(`aiching:feed:${day}`, () => getJSON(`${API}/feed/featured/${y}/${m}/${d}`, fetchImpl));
}

export async function summary(title, fetchImpl) {
  return cached(`aiching:sum:${title}`, () => getJSON(`${API}/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, fetchImpl))
    .then((p) => (p.type === 'disambiguation' ? null : pageOf(p)));
}

/** Everything online for a reading. Resolves with whatever arrived. */
export async function gather(reading, fetchImpl) {
  const [feed, ...lore] = await Promise.allSettled([
    dailyFeed(reading.day, fetchImpl),
    ...reading.online.articles.map((t) => summary(t, fetchImpl)),
  ]);
  return {
    daily: feed.status === 'fulfilled' ? chooseFromFeed(feed.value, reading) : null,
    lore: lore.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value),
  };
}
