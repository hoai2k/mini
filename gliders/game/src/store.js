// Saved settings and high scores, in localStorage when it is available.

const SETTINGS_KEY = 'gliders.settings.v1';
const SCORES_KEY = 'gliders.scores.v1';

export const DEFAULTS = {
  volume: 80,
  music: 50,
  sfx: 80,
  assist: 1, // 0 off, 1 gentle, 2 strong
  camera: 1, // 0 near, 1 normal, 2 far
  fov: 74,
  reduceMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  trails: true,
  vibration: true,
  quality: 0, // 0 auto, 1 high, 2 low
  mode: 'best',
  length: 180,
  levelId: 'sherbet-spires',
  invert: {}, // device -> bool
  gliders: {}, // device -> { id, variant }
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
  const s = read(SETTINGS_KEY) || {};
  return { ...DEFAULTS, ...s, invert: { ...(s.invert || {}) }, gliders: { ...(s.gliders || {}) } };
}
export function saveSettings(s) {
  write(SETTINGS_KEY, s);
}

export function loadScores() {
  return read(SCORES_KEY) || {};
}

const scoreKey = (levelId, mode) => `${levelId}|${mode}`;

export function bestScores(levelId, mode) {
  return loadScores()[scoreKey(levelId, mode)] || [];
}

// Adds an entry and returns its rank (0 = new record), or -1 if it did not place.
export function recordScore(levelId, mode, entry, keep = 8) {
  if (!(entry.score > 0)) return -1;
  const all = loadScores();
  const k = scoreKey(levelId, mode);
  const list = all[k] || [];
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const rank = list.indexOf(entry);
  all[k] = list.slice(0, keep);
  write(SCORES_KEY, all);
  return rank < keep ? rank : -1;
}
