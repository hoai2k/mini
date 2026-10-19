import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportOptions, outputSize, fileName, formatBytes, MAX_PIXELS, WEB_LONG_EDGE } from '../src/exporter.js';

const all = () => true;

test('three choices: original, JPEG, JPEG for web', () => {
  const opts = exportOptions('image/png', all);
  assert.deepEqual(opts.map((o) => o.id), ['original', 'jpeg', 'web']);
  assert.equal(opts[0].mime, 'image/png');
  assert.equal(opts[0].label, 'Original format (PNG)');
  assert.equal(opts[1].mime, 'image/jpeg');
  assert.ok(opts[2].quality < opts[1].quality);
});

test('the original format is offered only when the browser can write it', () => {
  const heic = exportOptions('image/heic', all)[0];
  assert.equal(heic.disabled, true);
  assert.match(heic.note, /HEIC/);
  const webpNoSafari = exportOptions('image/webp', (m) => m !== 'image/webp')[0];
  assert.equal(webpNoSafari.disabled, true);
  assert.equal(exportOptions('image/jpeg', all)[0].disabled, false);
});

test('JPEG for web shrinks to the long-edge limit and never grows', () => {
  const web = exportOptions('image/jpeg', all)[2];
  assert.deepEqual(outputSize(4032, 3024, web), { w: WEB_LONG_EDGE, h: 1440, scale: WEB_LONG_EDGE / 4032 });
  assert.equal(outputSize(800, 600, web).w, 800);
});

test('full size stays full size, unless over the canvas limit', () => {
  const jpeg = exportOptions('image/jpeg', all)[1];
  assert.equal(outputSize(4032, 3024, jpeg).w, 4032);
  const big = outputSize(8064, 6048, jpeg);
  assert.ok(big.w * big.h <= MAX_PIXELS);
  assert.ok(Math.abs(big.w / big.h - 8064 / 6048) < 0.01);
});

test('file names keep the original name and get the right extension', () => {
  const [orig, jpeg, web] = exportOptions('image/png', all);
  assert.equal(fileName('Holiday photo.PNG', orig), 'Holiday photo-annotated.png');
  assert.equal(fileName('IMG_0001.HEIC', jpeg), 'IMG_0001-annotated.jpg');
  assert.equal(fileName('a/b:c.jpeg', web), 'a-b-c-annotated-web.jpg');
  assert.equal(fileName('', jpeg), 'image-annotated.jpg');
});

test('sizes read naturally', () => {
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(2.5 * 1024 * 1024), '2.5 MB');
});
