import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, phaseAt, eventsAhead, formatClock, Clock, STRIKE_GAP } from '../src/timer.js';
import { DEFAULTS } from '../src/settings.js';

test('default plan: 5 s preroll, one start strike, three end strikes', () => {
  const p = plan(DEFAULTS);
  assert.equal(p.preroll, 5);
  assert.equal(p.start, 5);
  assert.equal(p.end, 5 + 600);
  assert.deepEqual(p.events.map((e) => [e.at, e.kind]), [
    [5, 'start'], [605, 'end'], [605 + STRIKE_GAP, 'end'], [605 + 2 * STRIKE_GAP, 'end'],
  ]);
});

test('no preroll rings the first chime at once', () => {
  const p = plan({ ...DEFAULTS, preroll: 0 });
  assert.equal(p.events[0].at, 0);
  assert.equal(phaseAt(p, 0).phase, 'session');
});

test('phases and remaining time', () => {
  const p = plan({ ...DEFAULTS, duration: 1 });
  assert.deepEqual(phaseAt(p, 0), { phase: 'preroll', remaining: 5, progress: 0 });
  assert.equal(phaseAt(p, 4.5).phase, 'preroll');
  const mid = phaseAt(p, 35);
  assert.equal(mid.phase, 'session');
  assert.equal(mid.remaining, 30);
  assert.equal(mid.progress, 0.5);
  assert.equal(phaseAt(p, 65).phase, 'done');
});

test('interval chimes fall inside the sitting and never on the end', () => {
  const p = plan({ ...DEFAULTS, duration: 10, interval: 5 });
  assert.deepEqual(p.events.filter((e) => e.kind === 'interval').map((e) => e.at), [305]);
  const q = plan({ ...DEFAULTS, duration: 10, interval: 3 });
  assert.deepEqual(q.events.filter((e) => e.kind === 'interval').map((e) => e.at), [185, 365, 545]);
  assert.ok(q.events.every((e, i, a) => i === 0 || a[i - 1].at <= e.at), 'sorted');
});

test('events ahead skip what has rung', () => {
  const p = plan(DEFAULTS);
  assert.equal(eventsAhead(p, 0).length, 4);
  assert.equal(eventsAhead(p, 5).length, 4);
  assert.equal(eventsAhead(p, 5.1).length, 3);
  assert.equal(eventsAhead(p, 1000).length, 0);
});

test('clock formatting rounds up', () => {
  assert.equal(formatClock(600), '10:00');
  assert.equal(formatClock(599.2), '10:00');
  assert.equal(formatClock(0.3), '0:01');
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(3725), '1:02:05');
});

test('clock pauses and resumes', () => {
  let t = 100;
  const c = new Clock(() => t);
  c.start();
  t = 110;
  assert.equal(c.elapsed(), 10);
  c.pause();
  t = 200;
  assert.equal(c.elapsed(), 10);
  assert.equal(c.running, false);
  c.resume();
  t = 205;
  assert.equal(c.elapsed(), 15);
});
