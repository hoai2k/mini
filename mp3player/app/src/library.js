// Library helpers with no browser dependencies: naming fallbacks, the custom
// song order, sorting, albums and artists, search, and time formatting.

export const UNKNOWN_ARTIST = 'Unknown artist';
export const UNKNOWN_ALBUM = 'Unknown album';

export const artistOf = (t) => t.artist || t.albumArtist || UNKNOWN_ARTIST;
export const albumArtistOf = (t) => t.albumArtist || t.artist || UNKNOWN_ARTIST;
export const albumOf = (t) => t.album || UNKNOWN_ALBUM;
export const titleOf = (t) => t.title || t.fileName || 'Untitled';

/** Fold case, accents and a leading "The " so sorting and search feel natural. */
export function fold(s) {
  return String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
const sortKey = (s) => fold(s).replace(/^the\s+/, '');
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
export const compareText = (a, b) => collator.compare(sortKey(a), sortKey(b));

export const albumKey = (t) => `${fold(albumArtistOf(t))}\u0001${fold(albumOf(t))}`;

/** Disc, then track number, then title. */
export function compareAlbumOrder(a, b) {
  return (a.disc ?? 1) - (b.disc ?? 1) || (a.track ?? 9999) - (b.track ?? 9999) || compareText(titleOf(a), titleOf(b));
}

/**
 * The custom order with every track in it exactly once: ids of removed tracks
 * drop out, and tracks missing from it are appended oldest-added first.
 * @param {string[]} order @param {{id: string, addedAt?: number}[]} tracks
 */
export function reconcileOrder(order, tracks) {
  const have = new Set(tracks.map((t) => t.id));
  const seen = new Set();
  const out = [];
  for (const id of order) if (have.has(id) && !seen.has(id)) { seen.add(id); out.push(id); }
  const extra = tracks.filter((t) => !seen.has(t.id)).sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0));
  for (const t of extra) out.push(t.id);
  return out;
}

export const SORTS = {
  custom: 'Your order',
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  added: 'Recently added',
};

/** Tracks in display order for a sort mode; `order` is the custom order. */
export function sortTracks(tracks, mode, order = []) {
  const list = tracks.slice();
  if (mode === 'title') return list.sort((a, b) => compareText(titleOf(a), titleOf(b)) || compareText(artistOf(a), artistOf(b)));
  if (mode === 'artist') return list.sort((a, b) => compareText(artistOf(a), artistOf(b)) || compareText(albumOf(a), albumOf(b)) || compareAlbumOrder(a, b));
  if (mode === 'album') return list.sort((a, b) => compareText(albumOf(a), albumOf(b)) || compareAlbumOrder(a, b));
  if (mode === 'added') return list.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
  const rank = new Map(reconcileOrder(order, tracks).map((id, i) => [id, i]));
  return list.sort((a, b) => rank.get(a.id) - rank.get(b.id));
}

/** Move one item; returns a new array. */
export function moveItem(arr, from, to) {
  const out = arr.slice();
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
}

/** @returns {{key: string, name: string, artist: string, year?: number, artKey?: string, tracks: object[]}[]} */
export function groupAlbums(tracks) {
  const map = new Map();
  for (const t of tracks) {
    const key = albumKey(t);
    let a = map.get(key);
    if (!a) map.set(key, (a = { key, name: albumOf(t), artist: albumArtistOf(t), year: t.year, artKey: t.artKey, tracks: [] }));
    a.tracks.push(t);
    a.artKey ??= t.artKey;
    a.year ??= t.year;
  }
  const albums = [...map.values()];
  for (const a of albums) a.tracks.sort(compareAlbumOrder);
  return albums.sort((a, b) => compareText(a.name, b.name) || compareText(a.artist, b.artist));
}

/** Artists by their songs' artist (or album artist); each with albums and songs. */
export function groupArtists(tracks) {
  const map = new Map();
  for (const t of tracks) {
    const name = artistOf(t);
    const key = fold(name);
    let a = map.get(key);
    if (!a) map.set(key, (a = { key, name, tracks: [] }));
    a.tracks.push(t);
  }
  const artists = [...map.values()];
  for (const a of artists) {
    a.albums = groupAlbums(a.tracks);
    a.tracks = a.albums.flatMap((al) => al.tracks);
    a.artKey = a.albums.find((al) => al.artKey)?.artKey;
  }
  return artists.sort((a, b) => compareText(a.name, b.name));
}

/** Every word of the query must appear in the title, artist or album. */
export function searchTracks(tracks, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return tracks.slice();
  return tracks.filter((t) => {
    const hay = fold(`${titleOf(t)} ${artistOf(t)} ${t.albumArtist ?? ''} ${albumOf(t)} ${t.genre ?? ''}`);
    return words.every((w) => hay.includes(w));
  });
}

/** A stable small number from a string (stand-in art and tints). */
export function hashIndex(s, n) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return (h >>> 0) % n;
}

/** 3:07, 1:02:03; "–:––" when unknown. */
export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '–:––';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "42 min", "1 hr 5 min" */
export function formatTotal(sec) {
  const m = Math.round((sec || 0) / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
