// Saved settings and progress (best score per bird), in localStorage when it
// is available. The game works the same without it, it just forgets.

const SETTINGS_KEY = 'icecreamcone.settings.v1';
const PROGRESS_KEY = 'icecreamcone.progress.v1';
const PHOTOS_KEY = 'icecreamcone.photos.v1';
const STICKERS_KEY = 'icecreamcone.stickers.v1';

export const DEFAULTS = {
  volume: 80,
  sound: true,
  vibration: true,
  unlockAll: false,
};

// Not settings the player changes: music and effects keep a fixed balance
// under the one volume, and motion follows the device's own preference.
const FIXED = {
  music: 50,
  sfx: 80,
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
    return true;
  } catch {
    return false; // storage unavailable
  }
}

export function loadSettings() {
  const saved = read(SETTINGS_KEY) || {};
  const own = Object.fromEntries(Object.keys(DEFAULTS).filter((k) => k in saved).map((k) => [k, saved[k]]));
  return { ...DEFAULTS, ...own, ...FIXED };
}
export function saveSettings(s) {
  write(SETTINGS_KEY, Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, s[k]])));
}

// { [birdId]: { best: number, plays: number } }
export function loadProgress() {
  const p = read(PROGRESS_KEY, { session: true });
  return p && typeof p === 'object' ? p : {};
}

// Records a score; returns true when it is a new best. `passedNow` marks the
// bird passed for good: a pass is kept even if its pass mark rises later.
export function recordScore(progress, id, score, passedNow = false) {
  const e = progress[id] || { best: 0, plays: 0 };
  e.plays++;
  if (passedNow) e.passed = true;
  const isBest = score > e.best;
  if (isBest) e.best = score;
  progress[id] = e;
  write(PROGRESS_KEY, progress, { session: true });
  return isBest;
}

// Forgetting the scores keeps them aside (the best of everything ever
// forgotten), so Restore can bring them back.
const BACKUP_KEY = 'icecreamcone.progress.backup.v1';
const STICKERS_BACKUP_KEY = 'icecreamcone.stickers.backup.v1';

// The higher best (and the larger number of plays) for every bird in either.
export function mergeProgress(a = {}, b = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id] || { best: 0, plays: 0 };
    const y = b[id] || { best: 0, plays: 0 };
    out[id] = { best: Math.max(x.best || 0, y.best || 0), plays: Math.max(x.plays || 0, y.plays || 0) };
    if (x.passed || y.passed) out[id].passed = true;
  }
  return out;
}

export function resetProgress() {
  const now = loadProgress();
  if (Object.keys(now).length) write(BACKUP_KEY, mergeProgress(loadBackup(), now), { session: true });
  const book = loadStickers();
  if (book) write(STICKERS_BACKUP_KEY, book, { session: true });
  write(PROGRESS_KEY, {}, { session: true });
}

export function loadBackup() {
  const b = read(BACKUP_KEY, { session: true });
  return b && typeof b === 'object' ? b : {};
}

// True when the kept scores hold a best higher than today's for some bird.
export function canRestore(progress) {
  return Object.entries(loadBackup()).some(([id, e]) => (e?.best || 0) > (progress[id]?.best || 0));
}

// Brings back the kept scores, merged with today's; the sticker book comes
// back too if it has been left empty since.
export function restoreProgress(progress) {
  const merged = mergeProgress(progress, loadBackup());
  write(PROGRESS_KEY, merged, { session: true });
  const kept = read(STICKERS_BACKUP_KEY, { session: true });
  if (kept && !loadStickers()) write(STICKERS_KEY, kept, { session: true });
  return merged;
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

// Saves from before passes were kept: a bird counts as passed if its best
// reaches its mark, or if any bird after it in the guide has been played
// (its page could only have been opened by passing this one). Returns true if
// anything changed. Run once, on a save that has no kept passes yet.
export function keepOldPasses(progress, birds) {
  if (Object.values(progress).some((e) => e && 'passed' in e)) return false;
  let changed = false;
  let later = false;
  for (let i = birds.length - 1; i >= 0; i--) {
    const e = progress[birds[i].id];
    if (e && (later || (e.best || 0) >= birds[i].pass)) {
      e.passed = true;
      changed = true;
    }
    if (e && e.plays > 0) later = true;
  }
  if (changed) write(PROGRESS_KEY, progress, { session: true });
  return changed;
}


export const loadPhotos = () => read(PHOTOS_KEY, { session: true });
export const savePhotos = photos => write(PHOTOS_KEY, photos, { session: true });
