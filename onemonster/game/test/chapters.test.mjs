// Every chapter keeps the contract in src/chapters/index.js: it runs idle to its
// time limit and ends with the letter kept; random mashing never throws; it
// draws every frame; versus takes the holder's input; postmarks are 0..3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { stubContext, makeEnv, idle, masher } from './harness.mjs';
import { CHAPTERS } from '../src/chapters/index.js';

const g = stubContext();
const DT = 1 / 30;

for (const c of CHAPTERS) {
  if (!existsSync(new URL(`../src/chapters/${c.file}.js`, import.meta.url))) continue;
  const create = (await import(`../src/chapters/${c.file}.js`)).default;

  test(`chapter ${c.n} (${c.file}): idle runs out the clock and keeps the letter`, () => {
    const ch = create(makeEnv());
    assert.ok(ch.time > 0);
    let t = 0;
    while (!ch.done && t < 200) { ch.update(DT, idle, null); ch.draw(g, t); t += DT; }
    assert.ok(ch.done, 'ends');
    assert.ok(['snatched', 'kept'].includes(ch.outcome));
    const m = ch.marks();
    assert.equal(m.length, 2);
    for (const v of m) assert.ok(Number.isInteger(v) && v >= 0 && v <= 3, `marks ${m}`);
    if (ch.outcome === 'kept') assert.equal(m[0], 0, 'no postmarks without the snatch');
    // A finished chapter keeps updating and drawing (the outro) without trouble.
    for (let i = 0; i < 40; i++) { ch.update(DT, idle, null); ch.draw(g, t + i * DT); }
  });

  test(`chapter ${c.n} (${c.file}): mashing never breaks it, solo and versus`, () => {
    for (const versus of [false, true]) {
      for (let seed = 1; seed <= 6; seed++) {
        const env = makeEnv({ versus, seed });
        const ch = create(env);
        const ps = masher(env.rng);
        const ph = masher(env.rng);
        let t = 0;
        while (!ch.done && t < 200) {
          ch.update(DT, ps(), versus ? ph() : null);
          if (Math.round(t / DT) % 5 === 0) ch.draw(g, t);
          t += DT;
          assert.ok(Number.isFinite(ch.time));
        }
        assert.ok(ch.done);
        const m = ch.marks();
        if (ch.outcome === 'snatched') assert.ok(m[0] >= 1, 'a snatch earns a postmark');
        if (typeof ch.hud === 'function') assert.equal(typeof ch.hud(), 'string');
      }
    }
  });
}
