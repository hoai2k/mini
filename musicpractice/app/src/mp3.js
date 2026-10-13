// Takes as MP3 files, encoded in a worker (src/mp3-worker.js) so the page
// stays responsive. 128 kbps mono: clear for practice recordings, about 1 MB
// a minute.

let worker = null;
let queue = Promise.resolve();

function encodeOnce(samples, sampleRate) {
  worker ||= new Worker(new URL('./mp3-worker.js', import.meta.url));
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => (e.data.mp3 ? resolve(e.data.mp3) : reject(new Error(e.data.error || 'MP3 encoding failed')));
    worker.onerror = (e) => { worker = null; reject(new Error(e.message || 'MP3 encoder failed to load')); };
    worker.postMessage({ samples, sampleRate, kbps: 128 });
  });
}

/** Encode samples as an MP3 Blob (one at a time). */
export function encodeMp3(samples, sampleRate) {
  const job = queue.then(() => encodeOnce(samples, sampleRate));
  queue = job.catch(() => {});
  return job;
}
