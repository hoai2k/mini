// The catalogue's pure logic: matching titles, merging a scan into the
// catalogue, and the shape of an export. No DOM here, so the tests can run it.

const ARTICLES = /^(the|a|an|le|la|les|der|die|das|el|los|las)\s+/;

/** A title or name reduced to what matters for matching: lower case, no accents, punctuation or leading article. */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(ARTICLES, '');
}

/** The part of a title before a subtitle, so "Dune: Messiah" still differs but "Sapiens: A Brief History" matches "Sapiens". */
function mainTitle(s) {
  return normalize(String(s ?? '').split(/[:(]| - /)[0]);
}

const surname = (name) => normalize(name).split(' ').filter(Boolean).pop() || '';

/** True if two catalogue entries are the same work. */
export function sameItem(a, b) {
  const ta = normalize(a.title), tb = normalize(b.title);
  if (!ta || !tb) return false;
  const titleMatch = ta === tb || mainTitle(a.title) === mainTitle(b.title);
  if (!titleMatch) return false;
  const by = (x) => x.author || x.designer || x.publisher || '';
  const sa = surname(by(a)), sb = surname(by(b));
  return !sa || !sb || sa === sb;
}

export function newId(prefix = 'i') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyCatalogue() {
  return { version: 1, books: [], games: [], photos: [] };
}

/**
 * Merge one scan's answer into the catalogue (mutating it). An item already
 * there gains the photo; a new one is added at the top. Returns {added,
 * existing, pairs: [{entry, item}]} (which item each entry became).
 */
export function mergeScan(cat, scan, photoId, now = new Date().toISOString()) {
  const added = [], existing = [], pairs = [];
  const take = (list, entries, kind) => {
    for (const entry of entries || []) {
      if (!entry?.title) continue;
      const known = list.find((item) => sameItem(item, entry));
      if (known) {
        if (!known.photos.includes(photoId)) known.photos.push(photoId);
        if (!known.author && entry.author) known.author = entry.author;
        if (!known.lookup && entry.lookup) { known.lookup = entry.lookup; known.lookupStatus = 'matched'; }
        if (!known.read && entry.read) known.read = entry.read;
        if (!existing.includes(known)) existing.push(known);
        pairs.push({ entry, item: known });
        continue;
      }
      const item = {
        id: newId(kind[0]),
        kind,
        title: entry.title,
        author: entry.author || null,
        publisher: entry.publisher || null,
        designer: entry.designer || null,
        year: entry.year || null,
        confidence: entry.confidence ?? null,
        photos: [photoId],
        added: now,
        lookup: entry.lookup || null,
        // Found on Open Library while reading: done. Read but not found there: a manual edit looks it up again.
        lookupStatus: entry.lookup ? 'matched' : 'lookup' in entry ? 'none' : 'pending',
        read: entry.read || null, // the spine's text as read, which Find Book matches against
      };
      list.unshift(item);
      added.push(item);
      pairs.push({ entry, item });
    }
  };
  take(cat.books, scan.books, 'book');
  take(cat.games, scan.games, 'game');
  return { added, existing, pairs };
}

const MAX_LOOKS = 3;

/** Keep a look of an item's spine (a few, from different photos), and its picture. */
export function addLook(item, saved) {
  if (!saved?.look) return;
  item.looks ||= [];
  if (item.looks.length >= MAX_LOOKS) item.looks.shift();
  item.looks.push(saved.look);
  if (saved.thumb && !item.thumb) item.thumb = saved.thumb;
}

/** Remove a photo and every item that only that photo found. */
export function removePhoto(cat, photoId) {
  cat.photos = cat.photos.filter((p) => p.id !== photoId);
  for (const key of ['books', 'games']) {
    cat[key] = cat[key].filter((item) => {
      item.photos = item.photos.filter((id) => id !== photoId);
      return item.photos.length > 0 || item.manual;
    });
  }
}

/** Move an item between the book and game lists. */
export function moveItem(cat, id) {
  for (const [from, to, kind] of [['books', 'games', 'game'], ['games', 'books', 'book']]) {
    const i = cat[from].findIndex((item) => item.id === id);
    if (i < 0) continue;
    const [item] = cat[from].splice(i, 1);
    item.kind = kind;
    item.lookup = null;
    item.lookupStatus = 'pending'; // look it up again as the other kind
    cat[to].unshift(item);
    return item;
  }
  return null;
}

export function filterItems(items, query) {
  const q = normalize(query);
  if (!q) return items;
  return items.filter((item) => normalize([item.title, item.author, item.designer, item.publisher, item.lookup?.title].join(' ')).includes(q));
}

export function sortItems(items, order) {
  const list = [...items];
  const key = (item) => normalize(item.title);
  const by = (item) => surname(item.author || item.designer || item.publisher || '') || '~';
  if (order === 'title') list.sort((a, b) => key(a).localeCompare(key(b)));
  else if (order === 'author') list.sort((a, b) => by(a).localeCompare(by(b)) || key(a).localeCompare(key(b)));
  else list.sort((a, b) => String(b.added).localeCompare(String(a.added)));
  return list;
}

/** The JSON a user exports: one list, books or games, in plain fields. */
export function exportData(cat, kind, now = new Date().toISOString()) {
  const items = kind === 'games' ? cat.games : cat.books;
  return {
    app: 'Bookzam',
    kind,
    exported: now,
    count: items.length,
    items: items.map((item) => {
      const l = item.lookup || {};
      const common = { title: item.title, added: item.added, confidence: item.confidence, photos: item.photos.length };
      if (kind === 'games') {
        return {
          ...common,
          designer: item.designer, designers: l.designers ?? (item.designer ? [item.designer] : []), publisher: item.publisher,
          year: l.year ?? item.year ?? null,
          players: l.minPlayers ? (l.maxPlayers && l.maxPlayers !== l.minPlayers ? `${l.minPlayers}-${l.maxPlayers}` : `${l.minPlayers}`) : null,
          boardGameGeek: l.bgg ? `https://boardgamegeek.com/boardgame/${l.bgg}` : `https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${encodeURIComponent(item.title)}`,
          wikidata: l.wikidata ? `https://www.wikidata.org/wiki/${l.wikidata}` : null,
          image: l.cover ?? null,
        };
      }
      return {
        ...common,
        author: item.author,
        year: l.year ?? item.year ?? null,
        isbn: l.isbn ?? null,
        publisher: l.publisher ?? null,
        pages: l.pages ?? null,
        subjects: l.subjects ?? [],
        openLibrary: l.key ? `https://openlibrary.org${l.key}` : null,
        cover: l.cover ?? null,
        matchedTitle: l.title ?? null,
        matchedAuthors: l.authors ?? null,
      };
    }),
  };
}
