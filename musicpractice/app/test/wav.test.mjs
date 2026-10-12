import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from '../src/wav.js';

test('encodes 16-bit mono PCM with a correct header', async () => {
  const blob = encodeWav(Float32Array.from([0, 0.5, -1, 1.5]), 48000);
  const v = new DataView(await blob.arrayBuffer());
  const text = (o) => String.fromCharCode(...new Uint8Array(v.buffer, o, 4));
  assert.equal(blob.type, 'audio/wav');
  assert.equal(v.byteLength, 44 + 8);
  assert.deepEqual([text(0), text(8), text(12), text(36)], ['RIFF', 'WAVE', 'fmt ', 'data']);
  assert.equal(v.getUint32(4, true), 36 + 8);
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint16(34, true), 16);
  assert.deepEqual([0, 1, 2, 3].map((i) => v.getInt16(44 + i * 2, true)), [0, 16383, -32768, 32767]);
});
