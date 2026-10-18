// Cover art from the internet for songs whose files carry none, found on
// Apple's iTunes Search API (free, no key, allows any origin). Stem and edit
// versions ("Yellow (Instrumental)", "song_vocals", "[No Drums]") are searched
// as the original song, so they get the original's cover. The matching is pure
// and takes an injectable fetch, so it runs under node --test.

import { fold } from './library.js';

const SEARCH = 'https://itunes.apple.com/search';

// Words that mark a stem, an edit or a re-recording rather than the song itself.
const EDIT_WORDS = [
  'instrumental', 'instrumentals', 'inst', 'acapella', 'acappella', 'a cappella', 'a capella', 'karaoke',
  'vocals?', 'vox', 'lead vocals?', 'backing vocals?', 'stems?', 'drums?', 'drumless', 'bass', 'bassless',
  'guitars?', 'piano', 'keys', 'synths?', 'strings', 'other', 'melody', 'accompaniment', 'backing track',
  'minus one', 'isolated', 'only', 'no', 'without', 'removed', 'extracted', 'split', 'demucs', 'htdemucs',
  'spleeter', 'uvr', 'mdx', 'lalal', 'moises', 'slowed', 'reverb', 'sped up', 'speed up', 'nightcore',
  '8d', '8d audio', 'remix', 'remixed', 'edit', 'mix', 'version', 'cover', 'live', 'demo', 'remaster(ed)?',
  'mono', 'stereo', 'master', 'final', 'v\\d+', 'take \\d+', 'click', 'metronome', 'practice', 'track',
  'full song', 'original', 'radio edit', 'extended', 'clean', 'explicit', 'lyrics?', 'audio', 'official',
  'video', 'hq', 'hd', '\\d+\\s*bpm', 'key of [a-g][#b♯♭]?\\w*', '[a-g][#b♯♭]? ?(major|minor|maj|min)',
];
const EDIT_RE = new RegExp(`\\b(${EDIT_WORDS.join('|')})\\b`, 'gi');
const HAS_EDIT_RE = new RegExp(`\\b(${EDIT_WORDS.filter((w) => !['no', 'only', 'other', 'track', 'version', 'mix', 'edit', 'original', 'audio'].includes(w)).join('|')})\\b`, 'i');

/** True when a bracket or dash part is all edit words (and filler), so it can go. */
function isEditPart(s) {
  const rest = s.replace(EDIT_RE, ' ').replace(/[\s\-_.,&+/|:;!()[\]{}]+|\b(and|with|w|the|feat|ft|by|of|for)\b/gi, '');
  return rest.length === 0 && /\w/.test(s);
}

/** The song's own title, without stem labels, file-name noise or featured artists. */
const STEM = '(?:stems?|vocals?|vox|drums?|bass|other|instrumental|inst|accompaniment|acapella|a ?cappella|karaoke|guitars?|piano|keys|melody|backing)';
// Stem-splitter file names: "song_vocals", "song.no_drums", "song-stem-bass"
const STEM_SUFFIX = new RegExp(`[_.](?:(?:stem|no|without|minus)[_.-]?)?${STEM}(?:[_.-]?only)?$`, 'i');
// The same with spaces, only for words that can't end a real title
const STEM_WORDS = /\s+(?:no vocals?|no drums?|vocals? only|drums? only|instrumental|acapella|a ?cappella|karaoke|drumless|minus one|backing track|stems?)$/i;

export function cleanTitle(title) {
  let s = String(title ?? '').trim();
  for (let i = 0; i < 3 && STEM_SUFFIX.test(s); i++) s = s.replace(STEM_SUFFIX, '');
  s = s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3 && STEM_WORDS.test(s); i++) s = s.replace(STEM_WORDS, '');
  s = s.replace(/\s*[([{](?:feat\.?|ft\.?|featuring|with)\s[^)\]}]*[)\]}]/gi, '');
  s = s.replace(/\s+(?:feat\.?|ft\.?|featuring)\s.*$/i, '');
  // Bracketed parts that are only edit labels: "(Instrumental)", "[Vocals Only]", "{no drums}"
  s = s.replace(/\s*[([{]([^)\]}]*)[)\]}]/g, (m, inner) => (isEditPart(inner) ? '' : m));
  // Trailing " - Instrumental", " – vocals", ".drums" parts
  for (let i = 0; i < 4; i++) {
    const m = /^(.*\S)\s*(?:\s[-–—|]\s*|[.-])\s*([^-–—|]+)$/.exec(s);
    if (!m || !isEditPart(m[2])) break;
    s = m[1];
  }
  s = s.replace(/[\s\-–—|.,]+$/, '').trim();
  return s || String(title ?? '').trim();
}

/** An artist name fit for searching: no featured artists, nothing for unknowns. */
export function cleanArtist(artist) {
  const s = String(artist ?? '').replace(/\s+(?:feat\.?|ft\.?|featuring)\s.*$/i, '').trim();
  return /^(unknown|unknown artist|various|various artists|va|artist|<unknown>)$/i.test(s) ? '' : s;
}

export function cleanAlbum(album) {
  const s = cleanTitle(album);
  return /^(unknown|unknown album|music|songs|downloads?|misc|stems?|audio|new folder|untitled)$/i.test(s) ? '' : s;
}

const words = (s) => fold(s).replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean);

/** Word-overlap similarity in [0, 1] (Dice coefficient over words). */
export function similarity(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return 0;
  const pool = [...y];
  let hits = 0;
  for (const w of x) {
    const i = pool.indexOf(w);
    if (i >= 0) { hits++; pool.splice(i, 1); }
  }
  return (2 * hits) / (x.length + y.length);
}

/**
 * Score an iTunes result against what the song is. Returns [0, 1].
 * @param {object} r a search result @param {{title?: string, artist?: string, album?: string}} want
 * @param {'song'|'album'|'artist'} kind
 */
export function scoreResult(r, want, kind) {
  if (kind === 'artist') return similarity(r.artistName, want.artist) - (/karaoke|tribute|cover|in the style of/i.test(`${r.artistName} ${r.collectionName}`) ? 0.5 : 0);
  const name = kind === 'album' ? r.collectionName : r.trackName;
  const target = kind === 'album' ? want.album : want.title;
  let s = similarity(cleanTitle(name), target);
  if (want.artist) s = s * 0.6 + similarity(r.artistName, want.artist) * 0.4;
  // A cover or karaoke version of the song is the wrong picture.
  const raw = `${name ?? ''} ${r.collectionName ?? ''} ${r.artistName ?? ''}`;
  if (HAS_EDIT_RE.test(raw) && !HAS_EDIT_RE.test(target ?? '')) s -= 0.2;
  if (/karaoke|tribute|cover|in the style of|made famous|piano covers|lullaby|8.bit/i.test(raw)) s -= 0.25;
  return s;
}

/** The best result over the bar, or null. */
export function pickBest(results, want, kind, bar) {
  let best = null;
  let bestScore = bar;
  for (const r of results ?? []) {
    if (!r.artworkUrl100) continue;
    const s = scoreResult(r, want, kind);
    if (s > bestScore) { best = r; bestScore = s; }
  }
  return best;
}

/** A bigger picture from the 100 px link iTunes returns. */
export const artworkUrl = (url100, size = 600) => url100.replace(/\/\d+x\d+(bb)?(-\d+)?\.(jpg|png|webp)$/i, `/${size}x${size}bb.jpg`);

/** What to search for a group of songs that share an album (or a lone song). */
export function queriesFor(group) {
  const t = group.tracks[0];
  const artist = cleanArtist(t.artist || t.albumArtist);
  const album = cleanAlbum(t.album);
  const base = t.fileName?.replace(/\.[^.]+$/, '');
  let title = cleanTitle(t.title || base);
  // A title guessed from "song_vocals.wav" lost the underscore that marks the
  // stem, so clean the file name itself (and drop a leading track number).
  if (base && STEM_SUFFIX.test(base) && fold(t.title ?? '').replace(/[^\p{L}\p{N}]+/gu, '') === fold(base).replace(/^\d{1,3}[\s._-]*/, '').replace(/[^\p{L}\p{N}]+/gu, '')) {
    title = cleanTitle(base.replace(/^\d{1,3}(?:\s*[-.)]\s*|[\s_]+)/, ''));
  }
  const out = [];
  if (album && artist) out.push({ kind: 'album', term: `${artist} ${album}`, want: { album, artist }, bar: 0.62 });
  if (artist && title) out.push({ kind: 'song', term: `${artist} ${title}`, want: { title, artist }, bar: 0.62 });
  // Title alone only when the artist is unknown: a known artist with no match
  // gets that artist's picture rather than a stranger's same-named song.
  if (title && !artist) out.push({ kind: 'song', term: title, want: { title }, bar: 0.8 });
  if (album && !artist) out.push({ kind: 'album', term: album, want: { album }, bar: 0.85 });
  if (artist) out.push({ kind: 'artist', term: artist, want: { artist }, bar: 0.9 });
  return out;
}

export class RateLimited extends Error {}

/** Search iTunes; returns its results array. */
export async function search(term, kind, { fetch: f = fetch, country } = {}) {
  const params = new URLSearchParams({ term, media: 'music', entity: kind === 'song' ? 'song' : 'album', limit: '10' });
  if (kind === 'artist') params.set('attribute', 'artistTerm');
  if (country) params.set('country', country);
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl && setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await f(`${SEARCH}?${params}`, { signal: ctl?.signal });
    if (res.status === 403 || res.status === 429 || res.status === 503) throw new RateLimited(String(res.status));
    if (!res.ok) return [];
    return (await res.json())?.results ?? [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Find a cover for a group of songs: the queries in order, the first good
 * match wins. Returns { url, from } or null. Throws RateLimited.
 * `wait` paces the requests (iTunes allows about 20 a minute).
 */
export async function findArtwork(group, { fetch: f, wait = async () => {}, country } = {}) {
  for (const q of queriesFor(group)) {
    await wait();
    const results = await search(q.term, q.kind, { fetch: f, country });
    const best = pickBest(results, q.want, q.kind, q.bar);
    if (best) return { url: artworkUrl(best.artworkUrl100), kind: q.kind, from: `${best.artistName} – ${q.kind === 'song' ? best.trackName : best.collectionName}` };
  }
  return null;
}
