// Saved takes, kept in IndexedDB so they're still there next visit. Audio is
// stored as 16-bit samples. If storage isn't available (private browsing),
// takes live in memory for the session.

import { TEXT } from './text.js';

const DB = 'musicpractice';
const STORE = 'takes';

let dbPromise = null;
const memory = new Map();
let memoryId = 1;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    if (!db) return reject(new Error('no db'));
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export function toInt16(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const v = Math.max(-1, Math.min(1, f32[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

export function toFloat32(i16) {
  const out = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] / (i16[i] < 0 ? 0x8000 : 0x7fff);
  return out;
}

/** @returns {Promise<Array<{ id: number, created: number, sampleRate: number, samples: Float32Array }>>} newest first */
export async function list() {
  try {
    const rows = await run('readonly', (s) => s.getAll());
    return rows.map((r) => ({ id: r.id, created: r.created, name: r.name || '', sampleRate: r.sampleRate, samples: toFloat32(new Int16Array(r.pcm)) })).reverse();
  } catch {
    return [...memory.values()].reverse();
  }
}

/** @returns {Promise<number>} the new take's id */
export async function add(samples, sampleRate, created = Date.now()) {
  try {
    return await run('readwrite', (s) => s.add({ created, sampleRate, pcm: toInt16(samples).buffer }));
  } catch {
    const id = memoryId++;
    memory.set(id, { id, created, sampleRate, samples });
    return id;
  }
}

/** Give a take a name ('' for the default). */
export async function rename(id, name) {
  const m = memory.get(id);
  if (m) m.name = name;
  try {
    await open().then((db) => new Promise((resolve, reject) => {
      if (!db) return reject(new Error('no db'));
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      const req = st.get(id);
      req.onsuccess = () => { if (req.result) st.put({ ...req.result, name }); };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  } catch { /* memory only */ }
}

export async function remove(id) {
  memory.delete(id);
  try { await run('readwrite', (s) => s.delete(id)); } catch { /* memory only */ }
}

/** A routine take's name: the item's, numbered after the takes already named so ("Scales 2"). */
export function routineTakeName(item, takes) {
  const name = item.trim().slice(0, 50);
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`);
  let n = 0;
  for (const t of takes) {
    const m = re.exec(t.name || '');
    if (m) n = Math.max(n, Number(m[1]));
  }
  return TEXT.recorder.routineTake(name, n + 1);
}
