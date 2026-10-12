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

function element() {
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

/**
 * Play samples. Resolves to a handle once playback has started, or rejects
 * if the browser refuses (the caller then plays them another way).
 * @returns {Promise<{ ended: Promise<void>, progress: () => number, stop: () => void }>}
 */
export async function playSamples(samples, sampleRate) {
  const a = element();
  a.pause();
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(encodeWav(samples, sampleRate));
  a.src = url;
  let finish;
  const ended = new Promise((resolve) => { finish = resolve; });
  a.onended = () => finish();
  await a.play();
  const duration = samples.length / sampleRate;
  return {
    ended,
    progress: () => Math.min(1, a.currentTime / duration),
    stop: () => { a.onended = null; a.pause(); finish(); },
    // Phones pause media when the app is left; carry on from there on return.
    isPaused: () => a.paused && !a.ended,
    resume: () => a.play(),
  };
}

/**
 * After the mic closes, the phone takes a moment to move sound back to its
 * normal output. Wait for it to report the change (or `maxMs` at most).
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
