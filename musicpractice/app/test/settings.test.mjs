import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, sanitize, clampBpm, beatStrengths, DEFAULTS } from '../src/settings.js';
import { pendulumAngle } from '../src/metronome.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

test('defaults: 120 BPM in 4/4 with a strong first beat', () => {
  const s = load(memoryStorage());
  assert.equal(s.bpm, 120);
  assert.equal(s.meter, '4/4');
  assert.equal(s.accent, true);
  assert.equal(s.silenceSec, 3);
});

test('settings survive a save and load', () => {
  const store = memoryStorage();
  save({ ...DEFAULTS, bpm: 72, meter: '6/8', accent: false, silenceSec: 4.5, startOn: 'any' }, store);
  const s = load(store);
  assert.deepEqual([s.bpm, s.meter, s.accent, s.silenceSec, s.startOn], [72, '6/8', false, 4.5, 'any']);
});

test('bad or damaged values fall back safely', () => {
  assert.equal(clampBpm(20), 40);
  assert.equal(clampBpm(9000), 500);
  assert.equal(clampBpm('133.6'), 134);
  assert.equal(clampBpm('abc'), 120);
  const s = sanitize({ bpm: 'x', meter: '13/7', silenceSec: 99, sensitivity: 'max' });
  assert.deepEqual([s.bpm, s.meter, s.silenceSec, s.sensitivity], [120, '4/4', 10, 'medium']);
  const broken = { getItem: () => '{not json', setItem() { throw new Error('full'); } };
  assert.equal(load(broken).bpm, 120);
  save(DEFAULTS, broken); // must not throw
});

test('beat strengths follow the time signature', () => {
  assert.deepEqual(beatStrengths('4/4', true), [2, 0, 0, 0]);
  assert.deepEqual(beatStrengths('3/4', false), [0, 0, 0]);
  assert.deepEqual(beatStrengths('6/8', true), [2, 0, 0, 1, 0, 0]);
  assert.deepEqual(beatStrengths('12/8', true), [2, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
  assert.deepEqual(beatStrengths('1', true), [0]);
});

test('the pendulum reaches alternate ends on each beat', () => {
  const p = 0.5;
  assert.equal(pendulumAngle(null, 0, p), 0);
  assert.equal(pendulumAngle({ time: 1, count: 0 }, 1, p, 24), 24);
  assert.ok(Math.abs(pendulumAngle({ time: 1, count: 0 }, 1.25, p, 24)) < 1e-9);
  assert.equal(pendulumAngle({ time: 1, count: 0 }, 1.5, p, 24), -24);
  assert.equal(pendulumAngle({ time: 1.5, count: 1 }, 1.5, p, 24), -24);
});
