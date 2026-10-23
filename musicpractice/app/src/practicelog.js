// The practice log: how long was practised each day, kept on the device.
// Time counts while something is being practised with (the metronome, the
// drone, the Playback Recorder listening or recording, or a routine running),
// once however many of them are on. Days are the device's own calendar days.

const KEY = 'musicpractice.log.v1';
/** A day counts toward a streak from a minute of practice. */
export const DAY_MIN_SECONDS = 60;
/** Days kept (older ones are dropped). */
export const KEEP_DAYS = 400;
/** The most one tick may add (a phone asleep in a pocket isn't practice). */
export const TICK_MAX = 65;

/** A date's day, 'YYYY-MM-DD', in local time. */
export function dayKey(d) {
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** The day `n` days before `d` (local calendar days, whatever the clock change). */
function daysBefore(d, n) {
  const t = new Date(d);
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() - n, 12);
}

export function cleanLog(v) {
  const days = {};
  if (v && typeof v === 'object' && v.days && typeof v.days === 'object') {
    for (const [k, s] of Object.entries(v.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(s) && s > 0) days[k] = Math.min(86400, Math.round(s));
    }
  }
  return { days };
}

export function loadLog(storage = globalThis.localStorage) {
  try { return cleanLog(JSON.parse(storage?.getItem(KEY) || 'null')); } catch { return cleanLog(null); }
}

export function saveLog(log, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(log)); } catch { /* not kept */ }
}

/** Add `seconds` of practice to the day of `at`, dropping days past KEEP_DAYS. */
export function addPractice(log, at, seconds) {
  if (!(seconds > 0)) return log;
  const k = dayKey(at);
  log.days[k] = Math.min(86400, (log.days[k] || 0) + seconds);
  const oldest = dayKey(daysBefore(at, KEEP_DAYS));
  for (const d of Object.keys(log.days)) if (d < oldest) delete log.days[d];
  return log;
}

const practised = (log, d) => (log.days[dayKey(d)] || 0) >= DAY_MIN_SECONDS;

/** Days in a row practised, up to today (or up to yesterday, while today has yet to be). */
export function streak(log, now) {
  let n = 0;
  let i = practised(log, now) ? 0 : 1;
  while (practised(log, daysBefore(now, i))) { n++; i++; }
  return n;
}

/** The last `n` days, oldest first: { key, date, seconds }. */
export function lastDays(log, now, n) {
  return Array.from({ length: n }, (_, k) => {
    const date = daysBefore(now, n - 1 - k);
    const key = dayKey(date);
    return { key, date, seconds: log.days[key] || 0 };
  });
}

/** Seconds practised over the last `n` days, today included. */
export const recentSeconds = (log, now, n) => lastDays(log, now, n).reduce((a, d) => a + d.seconds, 0);

/** The days practised, newest first: { key, date, seconds }. */
export function practisedDays(log) {
  return Object.keys(log.days).sort().reverse()
    .map((key) => ({ key, date: new Date(`${key}T12:00:00`), seconds: log.days[key] }));
}

/**
 * Counts practice: tick() every few seconds; while `active()` the time since
 * the last tick (at most TICK_MAX) goes in the log, which is saved.
 */
export class PracticeClock {
  constructor({ active, log = loadLog(), save = saveLog, now = () => Date.now() }) {
    Object.assign(this, { active, log, save, now });
    this.last = now();
  }

  tick() {
    const t = this.now();
    const s = Math.min(TICK_MAX, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    if (!this.active() || s <= 0) return false;
    addPractice(this.log, t, s);
    this.save(this.log);
    return true;
  }
}
