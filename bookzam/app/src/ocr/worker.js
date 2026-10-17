// The reading worker: loads ONNX Runtime and the models once, then reads
// photos sent to it off the main thread.
//
//   in:  {type: 'read', id, image: {data, width, height}, limit}
//   out: {type: 'progress', id, stage: 'download' | 'detect' | 'recognise', done, total}
//        {type: 'result', id, lines}   {type: 'error', id, message}

import * as ort from '../../vendor/ort/ort.wasm.min.mjs';
import { OcrEngine, parseDict } from './engine.js';

const base = new URL('../../', import.meta.url);
ort.env.wasm.wasmPaths = new URL('vendor/ort/', base).href;
// Threads need cross-origin isolation, which GitHub Pages can't turn on.
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

const FILES = [
  ['det', 'models/det.onnx', 4_826_518],
  ['rec', 'models/rec.onnx', 7_830_888],
  ['wasm', 'vendor/ort/ort-wasm-simd-threaded.wasm', 11_905_541],
];

/** Fetch a file's bytes, reporting progress across all the downloads. */
async function fetchBytes(path, onBytes) {
  const res = await fetch(new URL(path, base));
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    onBytes(value.length);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

let enginePromise = null;
function engine(report) {
  if (!enginePromise) {
    enginePromise = (async () => {
      const total = FILES.reduce((s, f) => s + f[2], 0);
      let done = 0;
      const tick = (n) => { done += n; report('download', Math.min(done, total), total); };
      const [det, rec, wasm, dictText] = await Promise.all([
        ...FILES.map(([, path]) => fetchBytes(path, tick)),
        fetch(new URL('models/dict.txt', base)).then((r) => r.text()),
      ]);
      ort.env.wasm.wasmBinary = wasm;
      return OcrEngine.create(ort, { det, rec }, parseDict(dictText), { detNorm: 'paddle' });
    })();
    enginePromise.catch(() => { enginePromise = null; });
  }
  return enginePromise;
}

self.onmessage = async (event) => {
  const msg = event.data;
  const report = (stage, done, total) => self.postMessage({ type: 'progress', id: msg.id, stage, done, total });
  try {
    if (msg.type === 'warm') { await engine(report); self.postMessage({ type: 'ready', id: msg.id }); return; }
    if (msg.type !== 'read') return;
    const eng = await engine(report);
    report('detect', 0, 1);
    const image = { data: new Uint8ClampedArray(msg.image.data), width: msg.image.width, height: msg.image.height };
    const lines = await eng.read(image, { limit: msg.limit, onProgress: (d, t) => report('recognise', d, t) });
    self.postMessage({ type: 'result', id: msg.id, lines });
  } catch (e) {
    self.postMessage({ type: 'error', id: msg.id, message: String(e?.message || e) });
  }
};
