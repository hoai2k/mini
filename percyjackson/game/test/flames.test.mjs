// The live flames' particle pool (js/entities/flameSim.js; flames.js draws
// it as voxel cubes on a model): a fixed cap that never grows, live particles
// packed at the front, every one gone once its life is up, and a write-out
// that shrinks each cube to nothing as its colour runs down the palette.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FlameSim, PALETTES, paletteStops } from '../js/entities/flameSim.js';

test('the pool never grows past its cap, and refuses spawns when full', () => {
  const s = new FlameSim(8), arrays = [s.pos, s.vel, s.age, s.life, s.size];
  let ok = 0;
  for (let i = 0; i < 20; i++) if (s.spawn(i, 0, 0, 0, 1, 0, 1, 0.1)) ok++;
  assert.equal(ok, 8); assert.equal(s.n, 8);
  for (let i = 0; i < 50; i++) { s.step(0.05, 2, 1, 1); s.spawn(0, 0, 0, 0, 1, 0, 1, 0.1); }
  assert.ok(s.n <= 8);
  // (the same typed arrays all along: nothing is allocated per frame)
  assert.deepEqual([s.pos, s.vel, s.age, s.life, s.size], arrays);
});

test('every particle dies when its life is up, and the live ones stay packed', () => {
  const s = new FlameSim(32);
  for (let i = 0; i < 32; i++) s.spawn(0, 0, 0, 0, 0, 0, 0.1 + (i % 4) * 0.2, 0.2);
  s.step(0.15);   // the 0.1 s ones go
  assert.equal(s.n, 24);
  for (let i = 0; i < s.n; i++) assert.ok(s.life[i] > 0.15 && s.age[i] < s.life[i], `slot ${i} is live`);
  for (let k = 0; k < 10; k++) s.step(0.1);
  assert.equal(s.n, 0);
  assert.equal(s.spawn(0, 0, 0, 0, 0, 0, 0, 1), false, 'no zero-life particles');
});

test('flames rise, and the step is skipped for no time', () => {
  const s = new FlameSim(4);
  s.spawn(0, 0, 0, 0, 0.5, 0, 2, 0.2);
  s.step(0); assert.equal(s.pos[1], 0); assert.equal(s.age[0], 0);
  for (let i = 0; i < 10; i++) s.step(0.05, 3, 0.5, 0.5);
  assert.ok(s.pos[1] > 0.3, `rose to ${s.pos[1]}`);
});

test('the write-out: a cube per live particle, shrinking to nothing, colour from core to tail', () => {
  const stops = paletteStops(PALETTES.greek), s = new FlameSim(4);
  const mats = new Float32Array(4 * 16), cols = new Float32Array(4 * 3);
  s.spawn(1, 2, 3, 0, 0, 0, 1, 0.5);
  assert.equal(s.write(mats, cols, stops), 1);
  assert.deepEqual([mats[12], mats[13], mats[14], mats[15]], [1, 2, 3, 1]);
  // newborn: the hot core colour (greek: whiter, i.e. more red and blue, than the green after it)
  assert.ok(Math.abs(cols[0] - stops[0]) < 1e-6 && Math.abs(cols[1] - stops[1]) < 1e-6);
  const s0 = mats[0];
  s.step(0.12); s.write(mats, cols, stops); const peak = mats[0];
  s.step(0.8); s.write(mats, cols, stops); const late = mats[0];
  assert.ok(peak > s0 && late < peak * 0.25, `sizes ${s0} ${peak} ${late}`);
  // near the end: the dark tail colour (dimmer than the core)
  assert.ok(cols[1] < stops[1] * 0.6);
  assert.ok(mats[5] > mats[0], 'cubes are a little taller than wide');
});

test('every palette runs bright to dark', () => {
  for (const [name, pal] of Object.entries(PALETTES)) {
    const st = paletteStops(pal), lum = (i) => st[i * 3] + st[i * 3 + 1] + st[i * 3 + 2];
    assert.ok(lum(0) > lum(pal.length - 1) * 2, name);
  }
});
