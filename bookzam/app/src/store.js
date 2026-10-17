// Keeps the catalogue on this device, in IndexedDB (photos' thumbnails make it
// too big for localStorage). Falls back to memory if storage is blocked.

import { emptyCatalogue } from './catalogue.js';

const DB = 'bookzam';
const STORE = 'kv';
let dbPromise = null;
let memory = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export async function loadCatalogue() {
  try {
    const saved = await tx('readonly', (s) => s.get('catalogue'));
    if (saved && Array.isArray(saved.books)) return { ...emptyCatalogue(), ...saved };
  } catch (e) {
    console.warn('Bookzam storage unavailable, keeping the catalogue in memory', e);
  }
  return memory || emptyCatalogue();
}

export async function saveCatalogue(cat) {
  memory = cat;
  try {
    // Storing a structured clone; JSON round-trip drops anything unclonable.
    await tx('readwrite', (s) => s.put(JSON.parse(JSON.stringify(cat)), 'catalogue'));
    return true;
  } catch (e) {
    console.warn('Bookzam could not save', e);
    return false;
  }
}

/** Ask the browser not to clear the catalogue under storage pressure. */
export function persist() {
  try { navigator.storage?.persist?.(); } catch {}
}
