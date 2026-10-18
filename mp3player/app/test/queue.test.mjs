import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Queue } from '../src/queue.js';

function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const ids = ['a', 'b', 'c', 'd', 'e'];

test('plays a context in order and stops at the end with repeat off', () => {
  const q = new Queue();
  assert.equal(q.play(ids, 'c'), 'c');
  assert.equal(q.next(), 'd');
  assert.equal(q.next(), 'e');
  assert.equal(q.next(), null);
  assert.equal(q.prev(), 'e');
});

test('repeat all loops; repeat one replays only when a song ends by itself', () => {
  const q = new Queue();
  q.play(ids, 'e');
  q.repeat = 'all';
  assert.equal(q.next(), 'a');
  assert.equal(q.prev(), 'e');
  q.repeat = 'one';
  assert.equal(q.next({ auto: true }), 'e');
  assert.equal(q.next(), 'a');
  assert.equal(q.cycleRepeat(), 'off');
});

test('prev at the start stays on the first song', () => {
  const q = new Queue();
  q.play(ids, 'a');
  assert.equal(q.hasPrev(), false);
  assert.equal(q.prev(), 'a');
});

test('shuffle starts with the chosen song, covers every song once, and keeps the current song when toggled', () => {
  const q = new Queue(seeded(7));
  q.play(ids, 'c', undefined, { shuffle: true });
  const heard = ['c'];
  for (let i = 0; i < 4; i++) heard.push(q.next());
  assert.deepEqual([...heard].sort(), ids);
  assert.equal(q.next(), null);
  q.play(ids, 'b');
  q.next();
  const now = q.current;
  q.setShuffle(false);
  assert.equal(q.current, now);
  assert.deepEqual(q.upcoming(), ids.slice(ids.indexOf(now) + 1));
});

test('a new shuffled lap never repeats the last song first', () => {
  for (let seed = 1; seed < 40; seed++) {
    const q = new Queue(seeded(seed));
    q.repeat = 'all';
    q.play(['a', 'b'], 'a', undefined, { shuffle: true });
    const last = q.next();
    assert.notEqual(q.next(), last);
  }
});

test('queued songs play first, then the context continues', () => {
  const q = new Queue();
  q.play(ids, 'a');
  q.addToQueue('x');
  q.playNext('y');
  assert.deepEqual(q.manual, ['y', 'x']);
  assert.equal(q.next(), 'y');
  assert.equal(q.next(), 'x');
  assert.equal(q.prev(), 'a');
  assert.equal(q.next(), 'b');
});

test('jumping in the queue', () => {
  const q = new Queue();
  q.play(ids, 'a');
  q.addToQueue('x');
  q.addToQueue('y');
  assert.equal(q.jumpQueued(1), 'y');
  assert.deepEqual(q.manual, []);
  assert.equal(q.jumpUpcoming(2), 'd');
  assert.equal(q.next(), 'e');
});

test('removing songs and reordering the library', () => {
  const q = new Queue();
  q.play(ids, 'c');
  assert.equal(q.remove('a'), false);
  assert.equal(q.next(), 'd');
  assert.equal(q.remove('d'), true);
  q.reorderContext(['e', 'b', 'c']);
  q.current = 'b';
  q.reorderContext(['e', 'b', 'c']);
  assert.deepEqual(q.upcoming(), ['c']);
});

test('saves and restores, dropping songs no longer in the library', () => {
  const q = new Queue();
  q.play(ids, 'b', { kind: 'album', id: 'k', label: 'Album' }, { shuffle: false });
  q.repeat = 'all';
  q.addToQueue('e');
  const saved = JSON.parse(JSON.stringify(q));
  const r = Queue.from(saved, (id) => id !== 'd');
  assert.equal(r.current, 'b');
  assert.equal(r.repeat, 'all');
  assert.deepEqual(r.context, ['a', 'b', 'c', 'e']);
  assert.deepEqual(r.upcoming(), ['c', 'e']);
  assert.equal(r.source.kind, 'album');
  assert.equal(Queue.from(null, () => true).current, null);
});
