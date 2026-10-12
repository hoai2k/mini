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

export async function unlock() {
  const c = audio();
  if (c.state !== 'running') {
    try { await c.resume(); } catch { /* resumed by the next tap */ }
  }
  return c;
}

/**
 * Safari's audio session: 'playback' lets the metronome sound with the
 * ring/silent switch on; 'play-and-record' is needed while the mic is open.
 */
export function setSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch { /* not supported */ }
}

/** When the sound scheduled for `t` is heard, in context time. */
export function heardNow() {
  const c = audio();
  return c.currentTime - (c.outputLatency || c.baseLatency || 0);
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
