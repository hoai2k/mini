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
  }
  stale = false;
  return audio();
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
