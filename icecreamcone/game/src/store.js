// Saved settings and progress (best score per bird), in localStorage when it
// is available. The game works the same without it, it just forgets.

const SETTINGS_KEY = 'icecreamcone.settings.v1';
const PROGRESS_KEY = 'icecreamcone.progress.v1';
const STICKERS_KEY = 'icecreamcone.stickers.v1';

export const DEFAULTS = {
  volume: 80,
  music: 50,
  sfx: 80,
  readAloud: false,
  vibration: true,
  reduceMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
};

// In ?debug, progress and the sticker book are kept for this tab's session
// only: they start from what is saved, but every change (a score, a moved
// sticker, a reset) goes to sessionStorage and the saved game is untouched.
// Settings are always saved.
let scratch = null;
export function keepForSessionOnly() {
  try {
    scratch = sessionStorage;
  } catch {
    scratch = null;
  }
}
const SCRATCH = 'icecreamcone.debug.';

function read(key, { session = false } = {}) {
  try {
    if (session && scratch) {
      const v = scratch.getItem(SCRATCH + key);
      if (v !== null) return JSON.parse(v);
    }
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
function write(key, value, { session = false } = {}) {
  try {
    if (session && scratch) scratch.setItem(SCRATCH + key, JSON.stringify(value));
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep going without it */
  }
}

export function loadSettings() {
  return { ...DEFAULTS, ...(read(SETTINGS_KEY) || {}) };
}
export function saveSettings(s) {
  write(SETTINGS_KEY, s);
}

// { [birdId]: { best: number, plays: number } }
export function loadProgress() {
  const p = read(PROGRESS_KEY, { session: true });
  return p && typeof p === 'object' ? p : {};
}

// Records a score; returns true when it is a new best.
export function recordScore(progress, id, score) {
  const e = progress[id] || { best: 0, plays: 0 };
  e.plays++;
  const isBest = score > e.best;
  if (isBest) e.best = score;
  progress[id] = e;
  write(PROGRESS_KEY, progress, { session: true });
  return isBest;
}

export function resetProgress() {
  write(PROGRESS_KEY, {}, { session: true });
}

// The sticker book: where the player has put each sticker, the picture
// behind them and the spread it is open at (see stickerbook.js, which checks
// what comes back). Raw here; null when nothing is saved.
export function loadStickers() {
  return read(STICKERS_KEY, { session: true });
}
export function saveStickers(book) {
  write(STICKERS_KEY, book, { session: true });
}
export function resetStickers() {
  if (scratch) {
    write(STICKERS_KEY, null, { session: true });
    return;
  }
  try {
    localStorage.removeItem(STICKERS_KEY);
  } catch {
    /* storage unavailable */
  }
}
