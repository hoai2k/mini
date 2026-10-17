// Talks to the mini-rooms worker, which reads photos with a vision model
// (multiplayer/server/src/bookzam.js). ?api=http://localhost:8787 points the
// page at a local `wrangler dev`.

const DEFAULT_API = 'https://mini-rooms.hoai2k.workers.dev';

export function apiBase(search = globalThis.location?.search || '') {
  const override = new URLSearchParams(search).get('api');
  return override && /^https?:\/\/[\w.:[\]-]+$/.test(override) ? override : DEFAULT_API;
}

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const MESSAGES = {
  rate_limited: 'That was a lot of photos in a few minutes. Wait a little, then try again.',
  bad_request: "That photo couldn't be sent. Try another one.",
  unavailable: 'Photo reading is switched off right now. Try again later.',
  model_failed: "The photo couldn't be read this time. Try again, or take it a little closer.",
  offline: "Can't reach Bookzam's server. Check your connection and try again.",
};

export function errorMessage(e) {
  return MESSAGES[e?.code] || MESSAGES.model_failed;
}

async function post(path, body, signal) {
  let res;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError('offline', MESSAGES.offline);
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const code = data?.error || (res.status === 429 ? 'rate_limited' : 'model_failed');
    throw new ApiError(code, MESSAGES[code] || MESSAGES.model_failed);
  }
  return data;
}

/** {books, games, unreadable, source} for one prepared photo ({image, width, height}). */
export function scanPhoto(photo, signal) {
  return post('/bookzam/scan', photo, signal);
}

/** {found, title, box, where, similar, source} for a prepared photo and a query. */
export function findInPhoto(photo, query, signal) {
  return post('/bookzam/find', { ...photo, query }, signal);
}
