import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dlog, debugEvents, debugText, debugJson, shortId, debugState, MAX_EVENTS } from '../src/debuglog.js';

test('the debug log keeps the newest events, within its size', () => {
  for (let i = 0; i < MAX_EVENTS + 50; i++) dlog('tick', { i });
  const ev = debugEvents();
  assert.equal(ev.length, MAX_EVENTS);
  assert.equal(ev.at(-1).i, MAX_EVENTS + 49); // the newest kept
  assert.equal(ev[0].i, 50); // the oldest let go
  assert.equal(typeof ev[0].t, 'number');
});

test('device ids are shortened, so devices can be told apart and nothing more', () => {
  assert.equal(shortId(''), '');
  assert.equal(shortId('default'), 'default');
  const a = shortId('a'.repeat(64)), b = shortId('b'.repeat(64));
  assert.ok(a.length <= 6 && a !== b);
  assert.equal(shortId('a'.repeat(64)), a); // the same device, the same short id
});

test('the feedback text fits the room it is given, newest events last; the export is all of it', () => {
  debugState('app', () => ({ screen: 'drone', mic: { held: true } }));
  dlog('mic-close', { result: 'held-switched-off', permission: 'prompt' });
  for (const max of [400, 1500, 3000]) {
    const t = debugText(max);
    assert.ok(t.length <= max, `${t.length} > ${max}`);
  }
  const t = debugText(3000);
  assert.match(t, /"screen":"drone"/);
  assert.match(t.split('\n').at(-1), /mic-close .*held-switched-off/);
  const all = JSON.parse(debugJson({ details: 'x' }));
  assert.equal(all.events.length, debugEvents().length);
  assert.equal(all.now.app.screen, 'drone');
  assert.equal(all.details, 'x');
});
