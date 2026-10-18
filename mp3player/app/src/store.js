// The library on this device, in IndexedDB: song details, the audio itself
// (a copy of each file the listener added, so it plays offline and after a
// reload on every browser, including iOS where picked files can't be reopened
// later), cover art, and small settings such as the custom order. Removing a
// song deletes only this copy; the original file is never touched.

const DB_NAME = 'mp3player';
const VERSION = 1;
let dbPromise = null;

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new DOMException('Aborted', 'AbortError'));
  });
}

export function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('tracks')) db.createObjectStore('tracks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
      if (!db.objectStoreNames.contains('art')) db.createObjectStore('art');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('The library is open in another tab that needs closing first.'));
  });
  return dbPromise;
}

async function store(name, mode = 'readonly') {
  const db = await open();
  return db.transaction(name, mode).objectStore(name);
}

export async function allTracks() {
  return req((await store('tracks')).getAll());
}

export async function putTrack(track) {
  return req((await store('tracks', 'readwrite')).put(track));
}

/** Save a song and its audio in one transaction, so neither exists without the other. */
export async function addTrack(track, blob) {
  const db = await open();
  const tx = db.transaction(['tracks', 'audio'], 'readwrite');
  tx.objectStore('audio').put(blob, track.id);
  tx.objectStore('tracks').put(track);
  return done(tx);
}

export async function audio(id) {
  return req((await store('audio')).get(id));
}

/** Delete songs and their audio; cover art no other song uses goes too. */
export async function deleteTracks(ids, keepArt = new Set()) {
  const db = await open();
  const tx = db.transaction(['tracks', 'audio', 'art'], 'readwrite');
  const tracks = tx.objectStore('tracks');
  const gone = await Promise.all(ids.map((id) => req(tracks.get(id))));
  for (const id of ids) {
    tracks.delete(id);
    tx.objectStore('audio').delete(id);
  }
  for (const t of gone) if (t?.artKey && !keepArt.has(t.artKey)) tx.objectStore('art').delete(t.artKey);
  return done(tx);
}

export async function art(key) {
  return req((await store('art')).get(key));
}

export async function hasArt(key) {
  return (await req((await store('art')).count(key))) > 0;
}

export async function putArt(key, value) {
  return req((await store('art', 'readwrite')).put(value, key));
}

export async function getMeta(key) {
  return req((await store('meta')).get(key));
}

export async function setMeta(key, value) {
  return req((await store('meta', 'readwrite')).put(value, key));
}

export async function clearAll() {
  const db = await open();
  const tx = db.transaction(['tracks', 'audio', 'art', 'meta'], 'readwrite');
  for (const name of ['tracks', 'audio', 'art', 'meta']) tx.objectStore(name).clear();
  return done(tx);
}

/** { usage, quota } in bytes, when the browser says. */
export async function estimate() {
  try {
    return (await navigator.storage?.estimate?.()) ?? {};
  } catch {
    return {};
  }
}

/** Ask the browser not to clear the library when space runs low. */
export async function persist() {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function persisted() {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
