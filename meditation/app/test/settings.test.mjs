import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DEFAULTS, sanitize, load, save } from '../src/settings.js';
import { SOUNDS, SOUND_IDS, CREDITS } from '../src/sounds.js';
import { STANDINS } from '../src/icons.js';

const app = new URL('..', import.meta.url);

test('preroll defaults to 5 seconds', () => {
  assert.equal(DEFAULTS.preroll, 5);
  assert.equal(sanitize(null).preroll, 5);
});

test('sanitize clamps, rounds and drops junk', () => {
  const s = sanitize({ duration: 999, preroll: -3, endStrikes: 2.6, volume: 'loud', startSound: 'kazoo', endSound: 'rin', keepAwake: 'yes' });
  assert.equal(s.duration, 180);
  assert.equal(s.preroll, 0);
  assert.equal(s.endStrikes, 3);
  assert.equal(s.volume, DEFAULTS.volume);
  assert.equal(s.startSound, DEFAULTS.startSound);
  assert.equal(s.endSound, 'rin');
  assert.equal(s.keepAwake, true);
  assert.equal(sanitize({ preroll: '' }).preroll, 5);
  assert.equal(sanitize({ preroll: '12' }).preroll, 12);
});

test('settings round-trip through storage, and bad storage gives defaults', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  save({ ...DEFAULTS, preroll: 20 }, storage);
  assert.equal(load(storage).preroll, 20);
  assert.deepEqual(load({ getItem: () => '{not json' }), { ...DEFAULTS });
  assert.deepEqual(load({ getItem: () => { throw new Error('denied'); } }), { ...DEFAULTS });
});

test('every sound has a recipe, a picture and, if recorded, a file and a credit', () => {
  const assets = JSON.parse(readFileSync(new URL('data/asset-list.json', app)));
  const ids = new Set(assets.map((a) => a.id));
  assert.equal(new Set(SOUND_IDS).size, SOUNDS.length);
  for (const s of SOUNDS) {
    assert.ok(s.partials.length > 0 && s.f0 > 0 && s.length > 0, s.id);
    assert.ok(ids.has(s.image), `${s.id}: image request ${s.image}`);
    assert.ok(STANDINS[s.image], `${s.id}: stand-in for ${s.image}`);
    if (s.file) {
      assert.ok(existsSync(new URL(s.file, app)), `${s.id}: ${s.file}`);
      assert.ok(CREDITS.some((c) => c.sound === s.id), `${s.id}: credit`);
    }
  }
  assert.ok(STANDINS.bowl && ids.has('bowl'));
});

test('the service worker caches every module', () => {
  const sw = readFileSync(new URL('sw.js', app), 'utf8');
  for (const f of ['main', 'timer', 'settings', 'sounds', 'chimes', 'icons']) assert.ok(sw.includes(`'src/${f}.js'`), f);
});
