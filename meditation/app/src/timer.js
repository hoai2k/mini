// The session timeline and the clock that walks it (pure: no DOM, no audio).
//
// A session is laid out in seconds from the moment Start is pressed:
//   0 ........ preroll ........ start chime ....... duration ....... end chime
// The preroll is silent time to settle; the starting chime rings when it ends
// and the ending chime when the meditation time is up. Interval chimes, if
// any, ring every `interval` minutes in between (never on top of the end).

/** Seconds between the strikes of a multi-strike chime. */
export const STRIKE_GAP = 5;

/**
 * @param {{ duration: number, preroll: number, interval: number,
 *           startStrikes: number, endStrikes: number }} s
 *   duration and interval in minutes (interval 0 = none), preroll in seconds.
 */
export function plan(s) {
  const preroll = Math.max(0, s.preroll);
  const duration = Math.max(1, s.duration) * 60;
  const start = preroll;
  const end = preroll + duration;
  const events = [];
  for (let k = 0; k < s.startStrikes; k++) events.push({ at: start + k * STRIKE_GAP, kind: 'start', strike: k });
  if (s.interval > 0) {
    const step = s.interval * 60;
    // Keep interval chimes clear of the start strikes and the end chime.
    for (let t = start + step; t < end - STRIKE_GAP / 2; t += step) {
      if (t > start + (s.startStrikes - 1) * STRIKE_GAP) events.push({ at: t, kind: 'interval', strike: 0 });
    }
  }
  for (let k = 0; k < s.endStrikes; k++) events.push({ at: end + k * STRIKE_GAP, kind: 'end', strike: k });
  events.sort((a, b) => a.at - b.at);
  return { preroll, duration, start, end, events };
}

/**
 * Where the session stands `elapsed` seconds after Start.
 * phase: 'preroll' (counting down to the first chime), 'session', or 'done'.
 * remaining: seconds left in the current phase. progress: 0..1 through the
 * meditation itself (0 during the preroll).
 */
export function phaseAt(p, elapsed) {
  if (elapsed < p.start) {
    return { phase: 'preroll', remaining: p.start - elapsed, progress: 0 };
  }
  if (elapsed < p.end) {
    return { phase: 'session', remaining: p.end - elapsed, progress: (elapsed - p.start) / p.duration };
  }
  return { phase: 'done', remaining: 0, progress: 1 };
}

/** Events that have not rung yet at `elapsed` (an event exactly due counts as ahead). */
export function eventsAhead(p, elapsed) {
  return p.events.filter((e) => e.at >= elapsed);
}

/** 605 -> "10:05", 3725 -> "1:02:05". Rounds up, so a countdown shows 0:01 until it is truly over. */
export function formatClock(seconds) {
  const t = Math.max(0, Math.ceil(seconds - 1e-6));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** A pausable stopwatch over an injected time source (seconds). */
export class Clock {
  constructor(now) {
    this.now = now;
    this.base = 0; // seconds accumulated before the current run
    this.since = null; // time source reading when the current run began, or null while paused
  }
  get running() { return this.since !== null; }
  start() { this.base = 0; this.since = this.now(); }
  pause() { if (this.running) { this.base = this.elapsed(); this.since = null; } }
  resume() { if (!this.running) this.since = this.now(); }
  elapsed() { return this.base + (this.running ? this.now() - this.since : 0); }
}
