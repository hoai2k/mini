// Takes play through one <audio> element rather than Web Audio: a media
// element follows the phone's current output (a Bluetooth speaker, say) more
// reliably than an AudioContext that was started while the mic was open.
//
// Safari lets an element start on its own (after a take is detected) only
// once it has played from a tap, so primeFromTap() plays a moment of
// silence on the first tap.

import { encodeWav } from './wav.js';

let el = null;
let url = null;
let primed = false;
let volume = 1;
// iPhone and iPad ignore an audio element's volume (it stays 1), so there the
// level is put into the samples themselves instead (playing() re-makes the
// sound at the new level, from where it was).
let elementVolume = null;
let current = null; // { samples, sampleRate, remake } while a take plays

/** The one audio element takes play through (also for checks and diagnostics). */
export function element() {
  if (!el) {
    el = document.createElement('audio');
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
  }
  return el;
}

export function primeFromTap() {
  if (primed) return;
  primed = true;
  const a = element();
  a.src = URL.createObjectURL(encodeWav(new Float32Array(2205), 22050));
  a.play().then(() => a.pause()).catch(() => { primed = false; });
}

function canSetVolume() {
  if (elementVolume === null) {
    const a = element();
    a.volume = 0.5;
    elementVolume = Math.abs(a.volume - 0.5) < 0.01;
    a.volume = 1;
  }
  return elementVolume;
}

function source(samples, sampleRate) {
  let data = samples;
  if (!canSetVolume() && volume < 1) {
    data = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) data[i] = samples[i] * volume;
  }
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(encodeWav(data, sampleRate));
  return url;
}

/** Load a new source and wait until it can be moved through. */
function load(a, src) {
  return new Promise((resolve) => {
    const done = () => { a.removeEventListener('loadedmetadata', done); resolve(); };
    a.addEventListener('loadedmetadata', done);
    a.src = src;
    setTimeout(done, 1500); // never stuck
  });
}

/** How loud takes play (0 to 1); a take playing changes at once. */
export function setPlaybackVolume(v) {
  volume = v;
  const a = element();
  if (canSetVolume()) { a.volume = v; return; }
  current?.remake();
}

/**
 * Play samples. Resolves to a handle once playback has started, or rejects
 * if the browser refuses (the caller then plays them another way).
 * @returns {Promise<{ ended: Promise<void>, progress: () => number, stop: () => void, seek: (f: number) => void, hold: () => void, go: () => Promise<void> }>}
 */
export async function playSamples(samples, sampleRate) {
  const a = element();
  a.pause();
  if (canSetVolume()) a.volume = volume;
  await load(a, source(samples, sampleRate));
  let finish;
  const ended = new Promise((resolve) => { finish = resolve; });
  a.onended = () => finish();
  await a.play();
  const duration = samples.length / sampleRate;
  let held = false;
  let remaking = 0;
  current = {
    // On iPhone a new level means new samples: carry on from the same place.
    remake: () => {
      clearTimeout(remaking);
      remaking = setTimeout(async () => {
        const at = a.currentTime;
        const wasPlaying = !a.paused;
        await load(a, source(samples, sampleRate));
        a.currentTime = at;
        if (wasPlaying && !held) a.play().catch(() => {});
      }, 150);
    },
  };
  const done = () => { clearTimeout(remaking); current = null; finish(); };
  a.onended = done;
  return {
    ended,
    progress: () => Math.min(1, a.currentTime / duration),
    stop: () => { a.onended = null; a.pause(); done(); },
    // Phones pause media when the app is left; carry on from there on return.
    isPaused: () => a.paused && !a.ended && !held,
    resume: () => a.play(),
    // Scrubbing: hold still while the playhead is dragged, move, go on from there.
    hold: () => { held = true; a.pause(); },
    seek: (f) => { a.currentTime = Math.max(0, Math.min(1, f)) * duration; },
    go: () => { held = false; return a.play(); },
  };
}

/**
 * After the mic is freed, the phone takes a moment to move sound back to its
 * normal output (a Bluetooth speaker, say). Wait for it to report the change,
 * or `maxMs` at most.
 */
export function outputSettled(maxMs = 700) {
  return new Promise((resolve) => {
    const md = navigator.mediaDevices;
    let timer;
    const done = () => {
      clearTimeout(timer);
      md?.removeEventListener?.('devicechange', changed);
      resolve();
    };
    const changed = () => { clearTimeout(timer); timer = setTimeout(done, 200); };
    md?.addEventListener?.('devicechange', changed);
    timer = setTimeout(done, maxMs);
  });
}

/** Send takes to a chosen speaker ('default' follows the system). */
export async function setSpeaker(id) {
  const a = element();
  if (!('setSinkId' in a)) return false;
  try {
    await a.setSinkId(id === 'default' ? '' : id);
    return true;
  } catch {
    return false;
  }
}
