// The saved picture: one project (the original file plus its annotations),
// kept in IndexedDB so it is still there on the next visit.
const DB = 'imageannotator';
const STORE = 'projects';
const KEY = 'current';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

// { name, type, blob, w, h, items, savedAt }
export async function loadProject() {
  try {
    return (await run('readonly', (s) => s.get(KEY))) || null;
  } catch {
    return null;
  }
}

export function saveProject(project) {
  return run('readwrite', (s) => s.put(project, KEY));
}
