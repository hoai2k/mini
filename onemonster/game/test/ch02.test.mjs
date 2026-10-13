// Chapter 2, Out of Nowhere: the Bombanat over the wood, the Trollusk in the
// bushes. The rules a child is told on the how-to page hold: a Trollusk in a
// bush can't be grabbed but hovering flushes him out; a dive that reaches
// starts a tug the stamina decides; the prompts say what to press; the
// autopilot snatches with time to spare; stamps are a bonus, not the game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, stubContext } from './harness.mjs';
import { snatchChance, flushProgress } from '../src/chase.js';
import ch02, { autopilot, HOWTO } from '../src/chapters/ch02.js';

const DT = 1 / 30;

function play(seed, skill, { versus = false, holder = () => ({}) } = {}) {
  const env = makeEnv({ seed, skill, versus });
  env.inputKind = 'controller';
  const ch = ch02(env);
  let t = 0;
  while (!ch.done && t < 100) { ch.update(DT, autopilot(ch), versus ? holder(ch) : null); t += DT; }
  return ch;
}

test('chapter 2: the autopilot snatches with time to spare on most seeds, at every skill', () => {
  for (const skill of [0.3, 0.6, 0.9]) {
    let won = 0, spare = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const ch = play(seed, skill);
      if (ch.outcome === 'snatched') { won++; spare += ch.time; }
    }
    assert.ok(won >= 9, `skill ${skill}: won ${won}/12`);
    assert.ok(spare / won > 12, `skill ${skill}: ${(spare / won).toFixed(1)} s left on average`);
  }
});

test('chapter 2: a Trollusk sitting in a bush cannot be grabbed; hovering over the bush flushes him out', () => {
  const env = makeEnv({ seed: 4, versus: true });
  const ch = ch02(env);
  const { s, h } = ch.chase;
  const bush = ch.chase.cover[0];
  h.x = bush.x; h.y = bush.y; h.vx = h.vy = 0;
  s.x = bush.x + 40; s.y = bush.y; s.vx = s.vy = 0;
  ch.update(DT, {}, {});
  assert.ok(h.hidden, 'still in the bush: hidden');
  assert.equal(snatchChance(ch.chase).kind, null, 'no grab, no dive prompt');
  ch.update(DT, { actionPressed: true }, {});
  assert.equal(ch.chase.tug, null, 'pressing Action does not grab him');
  let flushed = false;
  for (let t = 0; t < 2 && !flushed; t += DT) {
    ch.update(DT, {}, {});
    if (!h.hidden) flushed = true;
    else assert.ok(flushProgress(ch.chase) > 0, 'the flush ring fills while hovering');
  }
  assert.ok(flushed, 'flushed out within two seconds');
  assert.equal(h.mode, 'dodge', 'he bolts out of the bush');
});

test('chapter 2: a dive that reaches a Trollusk who does not dodge starts a tug; mashing wins it', () => {
  const env = makeEnv({ seed: 7, versus: true });
  const ch = ch02(env);
  const { s, h } = ch.chase;
  h.x = 1000; h.y = 950; s.x = 700; s.y = 950;
  ch.update(DT, {}, {});
  assert.equal(snatchChance(ch.chase).kind, 'lunge', 'in dive range: the prompt says Dive');
  ch.update(DT, { actionPressed: true }, {});
  assert.equal(s.mode, 'lunge');
  for (let t = 0; t < 1 && !ch.chase.tug; t += DT) ch.update(DT, {}, {});
  assert.ok(ch.chase.tug, 'the dive grabs him');
  let f = 0;
  for (let t = 0; t < 6 && !ch.done; t += DT) ch.update(DT, { actionPressed: f++ % 4 === 0, x: -1 }, { x: 1 });
  assert.equal(ch.outcome, 'snatched');
  assert.ok(ch.marks()[0] >= 1);
});

test('chapter 2: a dodge beats the dive, and the diver stumbles', () => {
  const env = makeEnv({ seed: 8, versus: true });
  const ch = ch02(env);
  const { s, h } = ch.chase;
  h.x = 1000; h.y = 950; s.x = 700; s.y = 950;
  ch.update(DT, {}, {});
  ch.update(DT, { actionPressed: true }, {});
  let dodged = false;
  for (let t = 0; t < 1 && !dodged; t += DT) {
    const d = Math.hypot(h.x - s.x, h.y - s.y);
    const ev = ch.update(DT, {}, { actionPressed: d < 220 && h.mode === 'move' });
    if (ch.chase.events.some((e) => e.type === 'dodged')) dodged = true;
  }
  assert.ok(dodged, 'Missed!');
  assert.equal(ch.chase.tug, null);
  assert.ok(['lunge', 'stumble'].includes(s.mode));
});

test('chapter 2: stamps are a bonus worth less than a quick snatch', () => {
  const env = makeEnv({ seed: 2 });
  const ch = ch02(env);
  ch.bonus = 9;
  ch.time = ch.time * 0.2; // a slow snatch
  ch.done = true; ch.outcome = 'snatched';
  assert.ok(ch.marks()[0] <= 2, `nine stamps and a slow snatch: ${ch.marks()[0]} postmarks`);
  assert.equal(ch.hud(), 'Stamps 9');
});

test('chapter 2: the poses hold rather than flicker', () => {
  const env = makeEnv({ seed: 5, skill: 0.6 });
  env.inputKind = 'keyboard';
  const ch = ch02(env);
  const g = stubContext();
  let changes = 0, frames = 0, last = null;
  for (let t = 0; t < 20 && !ch.done; t += DT) {
    ch.update(DT, autopilot(ch), null);
    ch.draw(g, t);
    frames++;
    const key = ch.sc.anim + '/' + ch.hc.anim;
    if (key !== last) changes++;
    last = key;
  }
  assert.ok(changes < frames / 6, `${changes} pose changes in ${frames} frames`);
});

test('chapter 2: the how-to page has three captioned steps built from the art', () => {
  assert.equal(HOWTO.length, 3);
  for (const st of HOWTO) {
    assert.ok(st.text.length > 10 && st.text.length < 110);
    assert.equal(st.scene, 'scenes/bombanat');
    assert.ok(st.items.some((it) => it.creature === 'bombanat'));
    assert.ok(st.items.some((it) => it.creature === 'trollusk'));
  }
});
