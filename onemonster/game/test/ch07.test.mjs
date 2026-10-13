// Chapter 7's own rules: the warning before a look is long enough to act on,
// the Trollusk's freeze pose holds without flicker, the snatch prompt comes up
// when Action would snatch, the getaway says how far he is behind, and the
// autopilot (a competent child) gets away with time to spare on most seeds,
// against the computer and against a versus Yalapappus played by a bot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, stubContext } from './harness.mjs';
import { aiSnatcher } from '../src/chase.js';
import ch07, { autopilot, HOWTO } from '../src/chapters/ch07.js';

const DT = 1 / 20;

function run(env, holderBot = null, limit = 100) {
  const ch = ch07(env);
  const b = {};
  let t = 0;
  while (!ch.done && t < limit) { ch.update(DT, autopilot(ch), holderBot ? holderBot(ch, b, DT) : null); t += DT; }
  return ch;
}

// A versus Yalapappus: looks round whenever he may (a little after the
// Trollusk starts moving), then chases with the kit's own judgement.
const keeper = (ch, b, dt) => {
  b.t = (b.t || 0) + dt;
  if (ch.phase === 'sneak' && (ch.look === 'munch' || ch.look === 'warn' || ch.look === 'look')) {
    const want = b.t - (b.last || -9) > 2.4;
    if (want && ch.look === 'munch') { b.last = b.t; return { x: 0, y: 0, actionPressed: true }; }
    return { x: 0, y: 0 };
  }
  return aiSnatcher(ch.chase, b, 0.6, dt);
};

test('chapter 7: the warning before a look lasts a full second, then the look', () => {
  const ch = ch07(makeEnv({ seed: 2, skill: 0.6 }));
  let warnFor = 0, seen = false;
  for (let t = 0; t < 20 && !seen; t += DT) {
    ch.update(DT, {}, null);
    if (ch.look === 'warn') warnFor += DT;
    if (ch.look === 'look') seen = true;
  }
  assert.ok(seen, 'he looks round');
  assert.ok(warnFor >= 0.95, `the warning lasted ${warnFor.toFixed(2)} s`);
});

test('chapter 7: the freeze pose holds once he stops, and creeping resumes once he moves', () => {
  const ch = ch07(makeEnv({ seed: 3 }));
  for (let t = 0; t < 1; t += DT) ch.update(DT, { x: -1, y: 0 }, null);
  assert.equal(ch.frozen, false, 'creeping');
  let flips = 0, was = ch.frozen;
  for (let t = 0; t < 1; t += DT) { ch.update(DT, {}, null); if (ch.frozen !== was) { flips++; was = ch.frozen; } }
  assert.equal(ch.frozen, true, 'twig up');
  assert.equal(flips, 1, 'one change of pose, no flicker');
  for (let t = 0; t < 0.5; t += DT) ch.update(DT, { x: -1, y: 0 }, null);
  assert.equal(ch.frozen, false, 'creeping again');
});

test('chapter 7: next to him while he munches, Action snatches; the getaway HUD says where he is', () => {
  const ch = ch07(makeEnv({ seed: 4 }));
  const { s: yal, h: tro } = ch.chase;
  tro.x = yal.x + 130; tro.y = yal.y;
  ch.update(DT, {}, null);
  assert.equal(ch.look, 'munch');
  ch.update(DT, { actionPressed: true }, null);
  assert.equal(ch.phase, 'getaway');
  assert.match(ch.hud(), /Away in \d+ m/);
  assert.match(ch.hud(), /\d+ m behind/);
});

test('chapter 7: the autopilot gets away with time to spare against the computer', () => {
  let won = 0, marks = 0, spare = 0;
  const seeds = [11, 23, 35, 47, 59, 71, 83, 95];
  for (const seed of seeds) {
    const ch = run(makeEnv({ seed, skill: 0.6 }));
    if (ch.outcome === 'snatched') { won++; spare += ch.time; }
    marks += ch.marks()[0];
  }
  assert.ok(won >= seeds.length - 1, `won ${won} of ${seeds.length}`);
  assert.ok(marks / seeds.length >= 1.8, `postmarks ${marks / seeds.length}`);
  assert.ok(spare / Math.max(1, won) >= 8, `time to spare ${spare / Math.max(1, won)}`);
});

test('chapter 7: Snatch & Keep is a contest: a keeper who looks and chases wins some, not all', () => {
  let won = 0;
  const seeds = [5, 15, 25, 35, 45, 55, 65, 75];
  for (const seed of seeds) {
    const ch = run(makeEnv({ seed, versus: true }), keeper);
    if (ch.outcome === 'snatched') won++;
  }
  assert.ok(won >= 2 && won <= seeds.length - 1, `the Trollusk won ${won} of ${seeds.length}`);
});

test('chapter 7: the how-to page has three captioned steps, and every phase draws', () => {
  assert.equal(HOWTO.length, 3);
  for (const st of HOWTO) { assert.ok(st.text.length > 10 && st.text.length < 80); assert.ok(st.items.length >= 3); }
  const g = stubContext();
  const ch = ch07(makeEnv({ seed: 9 }));
  for (let t = 0; t < 60 && !ch.done; t += DT) { ch.update(DT, autopilot(ch), null); ch.draw(g, t); }
  for (let i = 0; i < 20; i++) { ch.update(DT, {}, null); ch.draw(g, i * DT); }
  assert.equal(ch.outcome, 'snatched');
});
