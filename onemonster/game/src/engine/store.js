// Saved settings and progress, in localStorage when it is available. The game
// works the same without it; it just forgets.

const SETTINGS_KEY = 'onemonster.settings.v1';
const PROGRESS_KEY = 'onemonster.progress.v1';

export const DEFAULTS = {
  volume: 80,
  music: 50,
  sfx: 80,
  vibration: true,
  reduceMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  gentle: [false, false], // Gentle mode, per player
};

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function loadSettings() {
  const s = { ...DEFAULTS, ...(read(SETTINGS_KEY) || {}) };
  if (!Array.isArray(s.gentle)) s.gentle = [false, false];
  return s;
}
export function saveSettings(s) { write(SETTINGS_KEY, s); }

// { reached: highest chapter reached (1..9), best: { [chapter]: postmarks 0..3 }, journeyBest }
export function loadProgress() {
  const p = read(PROGRESS_KEY);
  return p && typeof p === 'object' ? { reached: 1, best: {}, journeyBest: 0, ...p } : { reached: 1, best: {}, journeyBest: 0 };
}
export function saveProgress(p) { write(PROGRESS_KEY, p); }
export function resetProgress() { write(PROGRESS_KEY, { reached: 1, best: {}, journeyBest: 0 }); }
