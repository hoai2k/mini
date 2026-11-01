// The sundew struggle's balance (sundew-struggle.js), simulated at 60 Hz:
//   node micro/prototypes/springtail/sundew-struggle.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { newStruggle, stepStruggle } from './sundew-struggle.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // W D S A on a keyboard
/** Play a style for up to 15 s: aHz A presses per s, tugHz stick direction changes per s. */
function play({ aHz = 0, tugHz = 0, holdStick = false, stopAfter = Infinity }) {
  const S = newStruggle(), dt = 1 / 60;
  let nextA = 0.05, nextTug = 0.05, d = 0;
  for (let t = 0; t < 15; t += dt) {
    const on = t < stopAfter;
    const dashPressed = on && aHz > 0 && t >= nextA;
    if (dashPressed) nextA += 1 / aHz;
    if (on && tugHz > 0 && t >= nextTug) { d = (d + 1) % 4; nextTug += 1 / tugHz; }
    const stick = on && (tugHz > 0 || holdStick);
    const [x, y] = DIRS[d];
    const r = stepStruggle(S, { dashPressed, move: stick ? { x, y, m: 1 } : { x: 0, y: 0, m: 0 } }, dt);
    if (r.escaped) return { out: 'escaped', t };
    if (r.engulfed) return { out: 'engulfed', t };
  }
  return { out: 'stuck', t: 15 };
}

test('stick and A together: free in about 2 s', () => {
  const r = play({ aHz: 4, tugHz: 3 });
  assert.equal(r.out, 'escaped');
  assert.ok(r.t > 1.4 && r.t < 2.6, `took ${r.t.toFixed(2)} s`);
  const slow = play({ aHz: 3, tugHz: 2 });
  assert.equal(slow.out, 'escaped');
  assert.ok(slow.t < 3.5, `took ${slow.t.toFixed(2)} s`);
});

test('A alone: only hard mashing gets out, slowly', () => {
  const fast = play({ aHz: 6 });
  assert.equal(fast.out, 'escaped');
  assert.ok(fast.t > 4.5, `A at 6/s took only ${fast.t.toFixed(2)} s`);
  assert.equal(play({ aHz: 3 }).out, 'engulfed');
});

test('stick alone, or a stick held still, is not enough', () => {
  assert.equal(play({ tugHz: 3 }).out, 'engulfed');
  assert.equal(play({ holdStick: true }).out, 'engulfed');
});

test('doing nothing: engulfed in under 4 s', () => {
  const r = play({});
  assert.equal(r.out, 'engulfed');
  assert.ok(r.t > 3 && r.t < 4, `took ${r.t.toFixed(2)} s`);
});

test('stopping part way: progress slips back and the leaf wins', () => {
  assert.equal(play({ aHz: 4, tugHz: 3, stopAfter: 1 }).out, 'engulfed');
});

test('turbo is capped: a press every frame counts no faster than 12.5/s', () => {
  const S = newStruggle();
  let k = 0;
  for (let i = 0; i < 60; i++) if (stepStruggle(S, { dashPressed: true, move: { x: 0, y: 0, m: 0 } }, 1 / 60).kick) k++;
  assert.ok(k <= 13, `${k} kicks in 1 s`);
});
