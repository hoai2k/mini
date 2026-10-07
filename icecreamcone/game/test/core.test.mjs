import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BIRDS, medalFor } from '../src/birds.js';
import { run } from './harness.mjs';

test('every bird has its page data and rising medal targets', () => {
  const ids = new Set();
  for (const b of BIRDS) {
    assert.ok(!ids.has(b.id), `duplicate id ${b.id}`);
    ids.add(b.id);
    for (const k of ['name', 'object', 'game', 'goal', 'score', 'color']) assert.ok(b[k], `${b.id}.${k}`);
    assert.equal(b.rhyme.length, 4, `${b.id} rhyme has four lines`);
    assert.equal(b.medals.length, 3);
    assert.ok(b.medals[0] > 0 && b.medals[0] < b.medals[1] && b.medals[1] < b.medals[2], `${b.id} medals rise`);
  }
  assert.equal(BIRDS.length, 10);
});

test('medalFor counts thresholds', () => {
  const b = { medals: [10, 20, 30] };
  assert.equal(medalFor(b, 0), 0);
  assert.equal(medalFor(b, 10), 1);
  assert.equal(medalFor(b, 29), 2);
  assert.equal(medalFor(b, 30), 3);
});

// Every minigame that exists must run to its end with no input and with
// random mashing, and keep a sane score.
for (const b of BIRDS) {
  const file = new URL(`../src/games/${b.id}.js`, import.meta.url);
  test(`${b.id}: runs to the end idle and mashing`, { skip: !existsSync(file) && 'not built yet' }, async () => {
    const create = (await import(file)).default;
    for (const seed of [1, 2]) {
      const idle = run(create, { seed });
      assert.ok(idle.game.done, 'idle game ends');
      assert.ok(Number.isFinite(idle.game.score) && idle.game.score >= 0, 'idle score is a number');
      let r = seed;
      const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      const mash = run(create, {
        seed,
        bot: () => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, action: rnd() < 0.5, left: rnd() < 0.1, right: rnd() < 0.1, spin: rnd() - 0.5 }),
      });
      assert.ok(mash.game.done, 'mashed game ends');
      assert.ok(Number.isFinite(mash.game.score) && mash.game.score >= 0, 'mashed score is a number');
      assert.ok(idle.game.score < b.medals[1], 'doing nothing does not earn silver');
      if (typeof mash.game.hud === 'function') assert.equal(typeof mash.game.hud(), 'string');
      if (typeof mash.game.summary === 'function') assert.ok(Array.isArray(mash.game.summary()));
    }
  });
}
