import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run the real worker (and the LAME build it loads) in a sandbox.
function worker() {
  const replies = [];
  const self = { postMessage: (m) => replies.push(m) };
  const sandbox = {
    self,
    Blob,
    importScripts: (p) => vm.runInContext(readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8'), ctx),
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../src/mp3-worker.js', import.meta.url), 'utf8'), ctx);
  return (data) => { self.onmessage({ data }); return replies.pop(); };
}

/** MPEG audio frames: [bitrate kbps, sample rate] of each, and how many. */
function frames(bytes) {
  const KBPS = { 3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
  const RATE = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000] };
  const out = [];
  let i = 0;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const version = (bytes[i + 1] >> 3) & 3; // 3: MPEG-1, 2: MPEG-2
    const kbps = KBPS[version]?.[bytes[i + 2] >> 4];
    const rate = RATE[version]?.[(bytes[i + 2] >> 2) & 3];
    if (!kbps || !rate) { i++; continue; }
    const pad = (bytes[i + 2] >> 1) & 1;
    const len = Math.floor(((version === 3 ? 144 : 72) * kbps * 1000) / rate) + pad;
    out.push([kbps, rate]);
    i += len;
  }
  return out;
}

const tone = (sec, rate) => Float32Array.from({ length: Math.round(sec * rate) }, (_, i) => 0.4 * Math.sin((2 * Math.PI * 440 * i) / rate));

test('a take becomes a 128 kbps MP3 of the right length', async () => {
  const run = worker();
  const { mp3, error } = run({ samples: tone(3, 48000), sampleRate: 48000, kbps: 128 });
  assert.equal(error, undefined);
  assert.equal(mp3.type, 'audio/mpeg');
  const f = frames(new Uint8Array(await mp3.arrayBuffer()));
  assert.ok(f.every(([k, r]) => k === 128 && r === 48000), 'every frame 128 kbps, 48 kHz');
  const sec = (f.length * 1152) / 48000;
  assert.ok(Math.abs(sec - 3) < 0.1, `about 3 s of frames (${sec.toFixed(2)})`);
  assert.ok(Math.abs(mp3.size - 48000) < 3000, `about 48 kB (${mp3.size})`);
});

test('44.1 kHz works, and an odd rate is resampled', async () => {
  const run = worker();
  const a = frames(new Uint8Array(await run({ samples: tone(1, 44100), sampleRate: 44100 }).mp3.arrayBuffer()));
  assert.ok(a.length > 30 && a.every(([, r]) => r === 44100));
  const b = frames(new Uint8Array(await run({ samples: tone(1, 96000), sampleRate: 96000 }).mp3.arrayBuffer()));
  assert.ok(b.length > 30 && b.every(([, r]) => r === 48000));
});
