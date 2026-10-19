import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimerRun, cleanRoutine, newItem, PRESETS, totalSeconds, loadTimer, saveTimer, CHIMES } from '../src/timer.js';

const base = { bpm: 100, meter: '3/4', droneMidi: 50, droneVoice: 'organ', droneFifth: true };
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('a first visit starts with Intonation (drone) and Scales (metronome); + offers four', () => {
  const { items, chime } = loadTimer(base, mem());
  assert.deepEqual(items.map((i) => [i.name, i.minutes, i.metronome, i.drone]), [
    ['Intonation practice', 3, false, true],
    ['Scales', 5, true, false],
  ]);
  assert.equal(chime, 'kalimba');
  assert.deepEqual(PRESETS.map((p) => [p.id, p.minutes, p.metronome, p.drone]), [
    ['intonation', 3, false, true], ['scales', 5, true, false], ['rhythms', 3, false, false], ['ghosting', 3, false, false],
  ]);
  assert.equal(newItem('ghosting', base).name, 'Ghosting');
  assert.equal(newItem('rhythms', base).name, 'Clapping rhythms');
  // An item's metronome and drone start from the app's own, then are its own.
  const it = newItem('scales', base);
  assert.deepEqual(it.met, { bpm: 100, meter: '3/4' });
  assert.deepEqual(it.drn, { midi: 50, voice: 'organ', fifth: true });
  assert.equal(newItem(undefined, base).name, ''); // Custom…
});

test('saved routines are kept, cleaned, and an emptied one stays empty', () => {
  const s = mem();
  saveTimer({ items: [], chime: 'celesta' }, s);
  assert.deepEqual(loadTimer(base, s), { items: [], chime: 'celesta' });
  const items = cleanRoutine([{ id: 'a', name: 'x'.repeat(99), minutes: 999, metronome: 1, met: { bpm: 9999, meter: 'nope' }, drn: { midi: 10, voice: '?' } }, { id: 'a' }, 'junk']);
  assert.equal(items.length, 2); // the duplicate id dropped, the junk made a blank item
  assert.equal(items[0].name.length, 60);
  assert.equal(items[0].minutes, 120);
  assert.equal(items[0].metronome, false);
  assert.deepEqual(items[0].met, { bpm: 500, meter: '4/4' });
  assert.deepEqual(items[0].drn, { midi: 36, voice: 'cello', fifth: false });
  assert.deepEqual(CHIMES, ['kalimba', 'two-tone', 'celesta', 'none']);
  assert.equal(totalSeconds([{ minutes: 3 }, { minutes: 5 }]), 480);
});

test('the run moves on at each item\'s end, pauses, skips and finishes', () => {
  const items = [{ minutes: 1 }, { minutes: 2 }, { minutes: 1 }];
  const r = new TimerRun(items, 0);
  assert.equal(r.remaining(30000), 30);
  assert.deepEqual(r.tick(59999), []);
  const c = r.tick(60000);
  assert.equal(c.length, 1);
  assert.equal(c[0].type, 'changed');
  assert.equal(r.index, 1);
  assert.equal(r.remaining(60000), 120);
  r.pause(90000);
  assert.equal(r.remaining(500000), 90); // the clock stops while paused
  assert.deepEqual(r.tick(500000), []);
  r.resume(500000);
  assert.equal(r.remaining(530000), 60);
  // Asleep through the rest: every change is reported, in order.
  const all = r.tick(10_000_000);
  assert.deepEqual(all.map((x) => x.type), ['changed', 'finished']);
  assert.equal(r.done, true);
  assert.equal(r.progress(), 1);
});

test('skip works running or paused; minutes changed while running move the end', () => {
  const r = new TimerRun([{ minutes: 3 }, { minutes: 5 }], 0);
  r.pause(1000);
  r.tick(2000, true);
  assert.equal(r.index, 1);
  assert.equal(r.paused, true);
  assert.equal(r.remaining(99999), 300); // the next item waits at its full time
  r.resume(10000);
  r.item.minutes = 6;
  r.retime(5, 10000);
  assert.equal(r.remaining(10000), 360);
  assert.equal(r.tick(20000, true)[0].type, 'finished');
});
