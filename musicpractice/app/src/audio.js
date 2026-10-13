// One AudioContext for the whole app (metronome, recorder and playback).
// Browsers only let it start from a tap, so `unlock()` is called from one.

let ctx = null;

export function audio() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
  }
  return ctx;
}

/*
 * Safari keeps an AudioContext on the output it started with. One started
 * while the mic was open (the phone's speaker, in call mode) or before a
 * Bluetooth speaker connected can stay there, so it is marked stale and
 * freshAudio() replaces it at the next tap that starts sound.
 */
let stale = false;
export function markStale() {
  stale = true;
}
navigator.mediaDevices?.addEventListener?.('devicechange', markStale);

/** The AudioContext, replaced first if it may be on an old output. */
export function freshAudio() {
  if (ctx && stale) {
    try { ctx.close(); } catch { /* already closed */ }
    ctx = null;
    away = false;
  }
  stale = false;
  return audio();
}

/**
 * Replace the AudioContext now, and start the new one. Call it from a tap:
 * iPhone can leave a context 'interrupted' for good after another app took
 * the sound (a call, Messenger, a video), and only a new one works again.
 */
export function replaceAudio() {
  if (ctx) {
    try { ctx.close(); } catch { /* already closed */ }
    ctx = null;
  }
  stale = false;
  away = false;
  const c = audio();
  c.resume().catch(() => { /* the next tap resumes it */ });
  return c;
}

/** Has the page been in the background since the context was made? */
let away = false;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && ctx) away = true;
});
export const audioWasAway = () => away;

/** The AudioContext if one exists (without creating one). */
export function existingAudio() {
  return ctx;
}

export async function unlock() {
  const c = audio();
  if (c.state !== 'running') {
    try { await c.resume(); } catch { /* resumed by the next tap */ }
  }
  return c;
}

/**
 * Safari's audio session: 'playback' sounds with the ring/silent switch on and
 * keeps Bluetooth speakers; 'auto' lets Safari choose, which it does while
 * the mic is open. The app never asks for 'play-and-record' itself, so the
 * phone drops back to normal playback as soon as the mic closes.
 */
export function setSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch { /* not supported */ }
}

/**
 * How far behind the sound reaches the ears: the latency the browser reports
 * (large on Bluetooth: often 0.15-0.3 s; Safari doesn't report it) plus a
 * manual adjustment from Audio check. Clamped, so a strange report can't
 * throw the pendulum off.
 */
let extraDelay = 0;
export function setExtraDelay(sec) {
  extraDelay = Math.max(-0.2, Math.min(0.5, Number(sec) || 0));
}
export function reportedLatency() {
  const c = ctx;
  if (!c) return null;
  const v = c.outputLatency || c.baseLatency || 0;
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), 0.6) : 0;
}

/** When the sound scheduled for `t` is heard, in context time (drives the pendulum). */
/*
 * What is reaching the ears now, in context time (drives the pendulum, the
 * pulse and the beat dots). Two estimates, and the later-heard (smaller) one
 * wins, so no delay is counted twice:
 *
 * - currentTime minus the output latency the browser reports. currentTime
 *   moves in steps (10-20 ms in Safari), which makes the pendulum jitter.
 * - getOutputTimestamp(): the context time being played by the output
 *   device at a given moment, which already includes the device's delay
 *   where the browser knows it (Bluetooth too on iPhone and Android), and
 *   moves smoothly when carried forward with performance.now().
 *
 * `lead` is how far ahead to look: a frame drawn now reaches the screen a
 * little later (about a frame), so it should show that moment.
 */
export function heardNow(lead = 0) {
  const c = audio();
  const latency = reportedLatency();
  let t = c.currentTime - latency;
  const ts = typeof c.getOutputTimestamp === 'function' ? c.getOutputTimestamp() : null;
  if (ts && ts.performanceTime > 0 && ts.contextTime > 0) {
    const smooth = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    const lag = c.currentTime - smooth; // how far the device trails the context
    // Ignore a stale or nonsensical timestamp (some browsers right after a start).
    if (lag > -0.05 && lag < 0.8) {
      // If the timestamp already trails by most of the reported latency, it
      // includes it; otherwise allow for the latency on top of it.
      t = latency > 0 && lag < latency * 0.6 ? smooth - latency : smooth;
    }
  }
  return t - extraDelay + lead;
}

/** The delay heardNow() allows for beyond the manual adjustment, in seconds (for Audio check). */
export function measuredDelay() {
  const c = existingAudio();
  if (!c) return null;
  return Math.max(0, c.currentTime - heardNow() - extraDelay);
}

/** Send Web Audio (the metronome) to a chosen speaker, where supported. */
export async function setContextSpeaker(id) {
  const c = audio();
  if (typeof c.setSinkId !== 'function') return false;
  try {
    await c.setSinkId(id === 'default' ? '' : id);
    return true;
  } catch {
    return false;
  }
}

/** Keep the screen awake while something is running. */
let lock = null;
let wanted = false;
export async function keepAwake(on) {
  wanted = on;
  try {
    if (on && !lock && navigator.wakeLock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch { lock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wanted) keepAwake(true);
});
