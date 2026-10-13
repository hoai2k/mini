// Chapter 8, SNIP!: the Bombanat's rematch in the open, the Yalapappus stomping
// behind. Nowhere to hide; the Yalapappus's swat is telegraphed (a wind-up
// before the paw lands) and only reaches a Bombanat that comes down low in his
// ring; a held Trollusk is the moment to dive; the autopilot wins most seeds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, stubContext } from './harness.mjs';
import ch08, { autopilot, HOWTO } from '../src/chapters/ch08.js';

const DT = 1 / 30;

function play(seed, skill) {
  const env = makeEnv({ seed, skill });
  env.inputKind = 'controller';
  const ch = ch08(env);
  let t = 0;
  while (!ch.done && t < 100) { ch.update(DT, autopilot(ch, DT), null); t += DT; }
  return ch;
}

test('chapter 8: the autopilot snatches on most seeds, and the computer Trollusk sometimes keeps it', () => {
  let won = 0, spare = 0;
  for (let seed = 1; seed <= 15; seed++) {
    const ch = play(seed, 0.6);
    if (ch.outcome === 'snatched') { won++; spare += ch.time; }
  }
  assert.ok(won >= 9 && won < 15, `won ${won}/15`);
  assert.ok(spare / won > 6, `${(spare / won).toFixed(1)} s left on average`);
});

test('chapter 8: open ground, nowhere to hide', () => {
  const ch = ch08(makeEnv({ seed: 3 }));
  assert.equal(ch.chase.cover.length, 0);
  for (let t = 0; t < 10; t += DT) { ch.update(DT, {}, null); assert.equal(ch.chase.h.hidden, false); }
});

test('chapter 8: the swat is telegraphed, and only lands on a low Bombanat in reach', () => {
  const env = makeEnv({ seed: 9, versus: true });
  const ch = ch08(env);
  const { s, h } = ch.chase;
  const yal = ch.yal;
  h.x = 1500; h.y = 900; // the Trollusk well away
  yal.swatCool = 0; yal.cool = 0; yal.state = 'stomp';
  // High up over him: nothing happens.
  s.x = yal.x + 100; s.y = yal.y;
  for (let t = 0; t < 1; t += DT) ch.update(DT, {}, {});
  assert.equal(yal.state, 'stomp', 'a Bombanat cruising high is left alone');
  // Diving in his ring: a wind-up first, then WHAP.
  s.x = yal.x + 150; s.y = yal.y; s.mode = 'lunge'; s.modeT = 0; s.lx = 1; s.ly = 0;
  ch.update(DT, {}, {});
  assert.equal(yal.state, 'windup', 'he winds up first');
  let whap = false;
  for (let t = 0; t < 1.5 && !whap; t += DT) {
    ch.update(DT, {}, {});
    if (yal.state === 'windup') assert.notEqual(s.mode, 'stumble', 'the warning comes before the hit');
    if (s.mode === 'stumble' && yal.hit) whap = true;
  }
  assert.ok(whap, 'WHAP');
});

test('chapter 8: a held Trollusk is the moment: a dive on him grabs him off the Yalapappus', () => {
  const env = makeEnv({ seed: 11, versus: true });
  const ch = ch08(env);
  const { s, h } = ch.chase;
  const yal = ch.yal;
  h.x = yal.x + 60; h.y = yal.y; yal.cool = 0;
  ch.update(DT, {}, {});
  assert.equal(yal.state, 'hold');
  assert.equal(h.mode, 'grabbed');
  s.x = h.x + 300; s.y = h.y;
  ch.update(DT, { actionPressed: true }, {});
  assert.equal(s.mode, 'lunge', 'the dive goes');
  for (let t = 0; t < 1 && !ch.chase.tug; t += DT) ch.update(DT, {}, {});
  assert.ok(ch.chase.tug, 'the dive grabs the held Trollusk');
  assert.equal(yal.state, 'stomp', 'the Yalapappus lets go');
});

test('chapter 8: stamps the Yalapappus reaches first are munched; the Bombanat only snaps them in the air', () => {
  const env = makeEnv({ seed: 5, versus: true });
  const ch = ch08(env);
  const { h, s } = ch.chase;
  const yal = ch.yal;
  s.x = 1700; s.y = 850;
  h.x = yal.x + 400; h.y = yal.y;
  // A scurrying Trollusk drops a stamp.
  for (let t = 0; t < 3 && !ch.extras.some((e) => e.stamp); t += DT) ch.update(DT, {}, { x: 1, sprint: true });
  const st = ch.extras.find((e) => e.stamp);
  assert.ok(st, 'a stamp fell');
  st.x = yal.x; st.y = yal.y; st.z = 0;
  ch.update(DT, {}, {});
  assert.ok(!ch.extras.includes(st), 'munched');
  assert.equal(ch.bonus, 0);
});

test('chapter 8: draws every phase, solo and versus', () => {
  const g = stubContext();
  for (const versus of [false, true]) {
    const env = makeEnv({ seed: 77, versus });
    env.inputKind = versus ? 'keyboard' : 'touch';
    const ch = ch08(env);
    for (let t = 0; t < 31; t += DT) {
      ch.update(DT, autopilot(ch, DT), versus ? { x: Math.sin(t), y: 0, actionPressed: Math.round(t * 30) % 20 === 0 } : null);
      ch.draw(g, t);
    }
    assert.ok(ch.done);
    assert.equal(typeof ch.hud(), 'string');
    assert.equal(ch.focus().length, 3);
  }
});

test('chapter 8: the how-to page has three captioned steps with the Yalapappus in them', () => {
  assert.equal(HOWTO.length, 3);
  assert.ok(HOWTO.filter((st) => st.items.some((it) => it.creature === 'yalapappus')).length >= 2);
  for (const st of HOWTO) assert.ok(st.text.length > 10 && st.text.length < 110);
});
