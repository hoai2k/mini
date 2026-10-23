import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, cleanLog, addPractice, streak, lastDays, recentSeconds, practisedDays, PracticeClock, TICK_MAX, KEEP_DAYS } from '../src/practicelog.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();

test('a day is the local calendar day', () => {
  assert.equal(dayKey(at(2026, 3, 9, 0)), '2026-03-09');
  assert.equal(dayKey(at(2026, 3, 9, 23)), '2026-03-09');
});

test('the log is cleaned when read: only real days and positive seconds', () => {
  assert.deepEqual(cleanLog({ days: { '2026-01-02': 90.4, junk: 5, '2026-01-03': -1, '2026-01-04': 'x', '2026-01-05': 1e9 } }), { days: { '2026-01-02': 90, '2026-01-05': 86400 } });
  assert.deepEqual(cleanLog(null), { days: {} });
});

test('streaks count days with a minute or more, up to today or (today not yet) yesterday', () => {
  const log = { days: {} };
  addPractice(log, at(2026, 5, 1), 600);
  addPractice(log, at(2026, 5, 2), 300);
  addPractice(log, at(2026, 5, 3), 30); // under a minute: not a practised day
  addPractice(log, at(2026, 5, 4), 120);
  addPractice(log, at(2026, 5, 5), 120);
  assert.equal(streak(log, at(2026, 5, 5)), 2);
  assert.equal(streak(log, at(2026, 5, 6)), 2); // today not practised yet
  assert.equal(streak(log, at(2026, 5, 7)), 0);
  assert.equal(streak(log, at(2026, 5, 2)), 2);
  assert.deepEqual(lastDays(log, at(2026, 5, 5), 3).map((d) => [d.key, d.seconds]), [['2026-05-03', 30], ['2026-05-04', 120], ['2026-05-05', 120]]);
  assert.equal(recentSeconds(log, at(2026, 5, 7), 7), 1170);
  assert.deepEqual(practisedDays(log).map((d) => d.key), ['2026-05-05', '2026-05-04', '2026-05-03', '2026-05-02', '2026-05-01']);
});

test('old days are dropped past KEEP_DAYS', () => {
  const log = { days: {} };
  addPractice(log, at(2024, 1, 1), 100);
  addPractice(log, at(2024, 1, 1) + (KEEP_DAYS + 2) * 86400000, 100);
  assert.equal(Object.keys(log.days).length, 1);
});

test('the clock adds the time between ticks while active, at most TICK_MAX', () => {
  let now = at(2026, 6, 1, 10);
  let on = false;
  let saves = 0;
  const clock = new PracticeClock({ active: () => on, log: { days: {} }, save: () => saves++, now: () => now });
  now += 5000;
  assert.equal(clock.tick(), false); // idle time isn't practice
  on = true;
  now += 5000;
  assert.equal(clock.tick(), true);
  now += 3600000; // asleep for an hour
  clock.tick();
  assert.equal(clock.log.days['2026-06-01'], 5 + TICK_MAX);
  assert.equal(saves, 2);
});
