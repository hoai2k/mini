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

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
  const p = read(PROGRESS_KEY);
  return p && typeof p === 'object' ? p : {};
}

// Records a score; returns true when it is a new best.
export function recordScore(progress, id, score) {
  const e = progress[id] || { best: 0, plays: 0 };
  e.plays++;
  const isBest = score > e.best;
  if (isBest) e.best = score;
  progress[id] = e;
  write(PROGRESS_KEY, progress);
  return isBest;
}

export function resetProgress() {
  write(PROGRESS_KEY, {});
}

// The sticker book: where the player has put each sticker, the picture
// behind them and the spread it is open at (see stickerbook.js, which checks
// what comes back). Raw here; null when nothing is saved.
export function loadStickers() {
  return read(STICKERS_KEY);
}
export function saveStickers(book) {
  write(STICKERS_KEY, book);
}
export function resetStickers() {
  try {
    localStorage.removeItem(STICKERS_KEY);
  } catch {
    /* storage unavailable */
  }
}
