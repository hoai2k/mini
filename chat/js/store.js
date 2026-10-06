// Small wrappers around localStorage. Storage can be missing or throw (private
// windows, blocked site data), so every access falls back quietly.

const PREFIX = 'chat.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

// A namespaced store for one game: store.get('best', 0), store.set('best', 12).
export function gameStore(gameId) {
  return {
    get: (key, fallback) => load(`game.${gameId}.${key}`, fallback),
    set: (key, value) => save(`game.${gameId}.${key}`, value),
  };
}

export function randomId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}
