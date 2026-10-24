// Settings: defaults, limits and cleaning what comes back from storage (pure).
import { SOUND_IDS } from './sounds.js';

export const DEFAULTS = Object.freeze({
  duration: 10, // minutes of meditation
  preroll: 5, // seconds of quiet before the starting chime
  startSound: 'bowl-large',
  startStrikes: 1,
  endSound: 'bowl-large',
  endStrikes: 3,
  interval: 0, // minutes between interval chimes; 0 = none
  intervalSound: 'bowl-small',
  volume: 80, // percent
  keepAwake: true,
});

export const LIMITS = Object.freeze({
  duration: [1, 180],
  preroll: [0, 120],
  startStrikes: [1, 3],
  endStrikes: [1, 5],
  interval: [0, 60],
  volume: [0, 100],
});

export const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60];
export const PREROLL_PRESETS = [0, 5, 10, 15, 30, 60];
export const INTERVAL_PRESETS = [0, 1, 2, 5, 10, 15, 20, 30];

const STORAGE_KEY = 'meditation.settings.v1';

/** Merge anything (stored JSON, a partial update) over the defaults, keeping only valid values. */
export function sanitize(raw) {
  const out = { ...DEFAULTS };
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, [lo, hi]] of Object.entries(LIMITS)) {
    const v = Number(raw[key]);
    if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '' && Number.isFinite(v)) out[key] = Math.min(hi, Math.max(lo, Math.round(v)));
  }
  for (const key of ['startSound', 'endSound', 'intervalSound']) {
    if (SOUND_IDS.includes(raw[key])) out[key] = raw[key];
  }
  if (typeof raw.keepAwake === 'boolean') out.keepAwake = raw.keepAwake;
  return out;
}

export function load(storage = globalThis.localStorage) {
  try { return sanitize(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return { ...DEFAULTS }; }
}

export function save(settings, storage = globalThis.localStorage) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* private mode: keep it for this visit only */ }
}
