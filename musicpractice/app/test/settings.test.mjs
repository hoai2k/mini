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
  assert.equal(s.recordDuringPlayback, false);
});

test('settings survive a save and load', () => {
  const store = memoryStorage();
  save({ ...DEFAULTS, bpm: 72, meter: '6/8', accent: false, silenceSec: 4.5, startOn: 'any', recordDuringPlayback: true }, store);
  const s = load(store);
  assert.deepEqual([s.bpm, s.meter, s.accent, s.silenceSec, s.startOn, s.recordDuringPlayback], [72, '6/8', false, 4.5, 'any', true]);
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

test('Classic is the default theme; a picked theme is kept', () => {
  assert.equal(load(memoryStorage()).theme, 'classic');
  // An earlier save stored the old default without anyone choosing it.
  assert.equal(sanitize({ theme: 'deco' }).theme, 'classic');
  assert.equal(sanitize({ theme: 'deco', themeChosen: true }).theme, 'deco');
  // Classic used to be called Straight.
  assert.equal(sanitize({ theme: 'straight', themeChosen: true }).theme, 'classic');
  const store = memoryStorage();
  save({ ...DEFAULTS, theme: 'deco', themeChosen: true }, store);
  assert.equal(load(store).theme, 'deco');
});

test('tuner settings: defaults, saved, and bad values fall back', () => {
  const store = memoryStorage();
  const d = load(store);
  assert.deepEqual([d.tuning, d.a4, d.flats, d.transpose], ['chromatic', 440, false, 'C']);
  save({ ...DEFAULTS, tuning: 'bass5', a4: 442, flats: true, transpose: 'Eb' }, store);
  const s = load(store);
  assert.deepEqual([s.tuning, s.a4, s.flats, s.transpose], ['bass5', 442, true, 'Eb']);
  const bad = sanitize({ tuning: 'kazoo', a4: 1000, transpose: 'G' });
  assert.deepEqual([bad.tuning, bad.a4, bad.transpose], ['chromatic', 466, 'C']);
});

test('home order: metronome, tuner, drone, recorder by default; a saved order is kept and repaired', () => {
  assert.deepEqual(load(memoryStorage()).homeOrder, ['metronome', 'tuner', 'drone', 'record']);
  assert.deepEqual(sanitize({ homeOrder: ['record', 'drone', 'metronome', 'tuner'] }).homeOrder, ['record', 'drone', 'metronome', 'tuner']);
  // An order saved before the Drone: it goes in after the Tuner, wherever that is.
  assert.deepEqual(sanitize({ homeOrder: ['metronome', 'tuner', 'record'] }).homeOrder, ['metronome', 'tuner', 'drone', 'record']);
  assert.deepEqual(sanitize({ homeOrder: ['tuner', 'record', 'metronome'] }).homeOrder, ['tuner', 'drone', 'record', 'metronome']);
  // Unknown or repeated tools dropped.
  assert.deepEqual(sanitize({ homeOrder: ['tuner', 'kazoo', 'tuner'] }).homeOrder, ['metronome', 'tuner', 'drone', 'record']);
  assert.deepEqual(sanitize({ homeOrder: 'record' }).homeOrder, ['metronome', 'tuner', 'drone', 'record']);
});

test('drone settings: defaults, kept, and bad values fall back', () => {
  const d = load(memoryStorage());
  assert.deepEqual([d.droneMidi, d.droneVoice, d.droneTimed, d.droneMinutes, d.droneThen, d.droneFifth], [48, 'cello', false, 3, 'stop', false]);
  const s = sanitize({ droneMidi: 41, droneVoice: 'organ', droneTimed: true, droneMinutes: 7.5, droneThen: 'fifths', droneFifth: true });
  assert.deepEqual([s.droneMidi, s.droneVoice, s.droneTimed, s.droneMinutes, s.droneThen, s.droneFifth], [41, 'organ', true, 7.5, 'fifths', true]);
  const bad = sanitize({ droneMidi: 90, droneVoice: 'tanpura', droneMinutes: -2, droneThen: 'random' });
  assert.deepEqual([bad.droneMidi, bad.droneVoice, bad.droneMinutes, bad.droneThen], [59, 'cello', 0.5, 'stop']);
});
