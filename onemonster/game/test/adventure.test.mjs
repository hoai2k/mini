// Every Adventure board keeps the contract in src/adventure/index.js: idle runs
// out the clock and the letter goes on (no postmarks); random mashing never
// breaks it; it draws every frame; its autopilot reaches the snatch in time and
// earns postmarks; focus() is on screen. Each board's own rules are tested in
// test/bNN.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { stubContext, makeEnv, idle, masher } from './harness.mjs';
import { BOARDS } from '../src/adventure/index.js';

const g = stubContext();
const DT = 1 / 30;

for (const b of BOARDS) {
  if (!existsSync(new URL(`../src/adventure/${b.file}.js`, import.meta.url))) continue;
  const mod = await import(`../src/adventure/${b.file}.js`);
  const create = mod.default;

  test(`board ${b.n} (${b.file}): idle runs out the clock and the letter goes on`, () => {
    const ch = create(makeEnv());
    assert.ok(ch.time > 0);
    assert.ok(ch.time >= b.time, 'at least the listed time');
    let t = 0;
    while (!ch.done && t < 400) { ch.update(DT, idle, null); ch.draw(g, t); t += DT; }
    assert.ok(ch.done, 'ends');
    assert.equal(ch.outcome, 'kept');
    assert.deepEqual(ch.marks(), [0, 0]);
    for (let i = 0; i < 60; i++) { ch.update(DT, idle, null); ch.draw(g, t + i * DT); }
  });

  test(`board ${b.n} (${b.file}): mashing never breaks it`, () => {
    for (let seed = 1; seed <= 5; seed++) {
      const env = makeEnv({ seed });
      const ch = create(env);
      const ps = masher(env.rng);
      let t = 0;
      while (!ch.done && t < 400) {
        ch.update(DT, ps(), null);
        if (Math.round(t / DT) % 4 === 0) ch.draw(g, t);
        t += DT;
        assert.ok(Number.isFinite(ch.time));
      }
      assert.ok(ch.done);
      const m = ch.marks();
      for (const v of m) assert.ok(Number.isInteger(v) && v >= 0 && v <= 3, `marks ${m}`);
      if (ch.outcome === 'snatched') assert.ok(m[0] >= 1);
      if (typeof ch.hud === 'function') assert.equal(typeof ch.hud(), 'string');
      const f = ch.focus?.() || [];
      for (const p of f) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'focus is finite');
    }
  });

  test(`board ${b.n} (${b.file}): the autopilot reaches the snatch in time`, () => {
    assert.equal(typeof mod.autopilot, 'function', 'exports autopilot(board)');
    for (const gentle of [false, true]) {
      for (let seed = 1; seed <= 3; seed++) {
        const ch = create(makeEnv({ seed, gentle: [gentle, false] }));
        let t = 0;
        while (!ch.done && t < 400) {
          ch.update(DT, mod.autopilot(ch), null);
          if (Math.round(t / DT) % 10 === 0) ch.draw(g, t);
          t += DT;
        }
        assert.equal(ch.outcome, 'snatched', `seed ${seed}${gentle ? ' gentle' : ''}: snatched with ${ch.time.toFixed(1)} s left`);
        assert.ok(ch.marks()[0] >= 1);
        for (const p of ch.focus?.() || []) assert.ok(p.x >= -50 && p.x <= 1970, 'focus on screen');
      }
    }
  });
}
