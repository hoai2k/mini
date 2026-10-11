// Settings and progress in localStorage (recovering quietly when it is unavailable).
const KEY = 'eartrainer.v1';
export const DEFAULTS = {
  settings: { sound: 'grand', volume: 0.85, reverb: 0.35, labels: 'c', key: 'written', first: true, staff: true, light: true, vibrate: true, speed: 1 },
  progress: { score: 0, best: {}, rating: 1, streak: 0, bestStreak: 0, solved: 0, book: 'all', level: 'adaptive' },
};
export function loadState() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* private mode */ }
  return {
    settings: { ...DEFAULTS.settings, ...(saved.settings || {}) },
    progress: { ...DEFAULTS.progress, ...(saved.progress || {}), best: { ...(saved.progress?.best || {}) } },
  };
}
export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
