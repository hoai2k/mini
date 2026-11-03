// The microscope's operator (focus.js): it holds while the swimmer changes
// depth, refocuses once the depth has been still for a moment, and stops the
// knob when the swimmer moves again.
//   node --test micro/game/paramecium/focus.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocus, stepFocus, snapFocus, knob, FOCUS } from './focus.js';

const DT = 1 / 60;
/** Run the operator for `sec` s with the swimmer's depth given by z(t). */
function run(F, sec, z, t0 = 0, trace = null) {
  for (let t = t0; t < t0 + sec - 1e-9; t += DT) { stepFocus(F, z(t + DT), DT); if (trace) trace.push([+(t + DT).toFixed(3), F.z, F.mode]); }
  return F;
}

test('while the swimmer keeps changing depth, the focus holds', () => {
  const F = createFocus(0);
  snapFocus(F, 0);
  // swimming steadily down at 300 µm/s for 0.8 s, then up and down without a pause
  run(F, 0.8, (t) => -300 * t);
  assert.equal(F.z, 0, 'held through a dive');
  run(F, 1.2, (t) => -240 + 200 * Math.sin((t - 0.8) * 6), 0.8);
  assert.equal(F.z, 0, 'held through continual up and down');
  assert.equal(F.turns, 0);
});

test('once the depth is stable, it waits, then turns the knob to it (eased, a slight overshoot, settled)', () => {
  const F = createFocus(0);
  snapFocus(F, 0);
  run(F, 0.5, (t) => -300 * t); // a dive to -150
  const tr = [];
  run(F, 2.5, () => -150, 0.5, tr);
  const started = tr.find(([, z]) => z !== 0);
  assert.ok(started, 'it refocused');
  const wait = started[0] - 0.5;
  assert.ok(wait >= FOCUS.wait - 0.02 && wait <= FOCUS.wait + 0.05, `waited ${wait.toFixed(2)} s`);
  const done = tr.find(([t, z, m]) => t > started[0] && m === 'hold' && Math.abs(z + 150) < 1e-6);
  assert.ok(done, 'settled on the swimmer');
  const turn = done[0] - started[0];
  assert.ok(turn >= FOCUS.turn[0] - 0.03 && turn <= FOCUS.turn[1] + 0.03, `turned over ${turn.toFixed(2)} s`);
  const deepest = Math.min(...tr.map(([, z]) => z));
  assert.ok(deepest < -150 && deepest > -150 - 0.06 * 150, `a slight overshoot (${deepest.toFixed(1)})`);
  // the move is eased: slower at the end than in the middle
  const zAt = (t) => tr.find(([tt]) => tt >= t)[1];
  const mid = started[0] + turn * 0.3;
  assert.ok(Math.abs(zAt(mid + 0.05) - zAt(mid)) > Math.abs(zAt(done[0] - 0.02) - zAt(done[0] - 0.07)), 'it slows into place');
  assert.equal(F.z, -150);
});

test('a longer refocus takes longer, within the range', () => {
  const near = createFocus(0), far = createFocus(0);
  run(near, 0.2, (t) => -100 * t); run(far, 0.2, (t) => -2000 * t);
  run(near, 0.6, () => -20, 0.2); run(far, 0.6, () => -400, 0.2);
  assert.ok(far.dur > near.dur && near.dur >= FOCUS.turn[0] && far.dur <= FOCUS.turn[1]);
});

test('moving again mid-refocus stops the knob, and the wait starts over', () => {
  const F = createFocus(0);
  run(F, 0.5, (t) => -300 * t);
  run(F, FOCUS.wait + 0.25, () => -150, 0.5); // part way into the turn
  assert.equal(F.mode, 'turn');
  const partway = F.z;
  assert.ok(partway < 0 && partway > -150, `part way (${partway.toFixed(1)})`);
  // the swimmer rises again: the knob stops where it is
  const t1 = 0.5 + FOCUS.wait + 0.25;
  run(F, 0.4, (t) => -150 + 300 * (t - t1), t1);
  assert.equal(F.mode, 'hold');
  assert.equal(F.interrupted, 1);
  assert.equal(F.z, partway, 'stopped where it was');
  // still again at -30: waits, then refocuses there
  const t2 = t1 + 0.4;
  run(F, FOCUS.wait - 0.1, () => -30, t2);
  assert.equal(F.z, partway, 'waiting');
  run(F, 1.5, () => -30, t2 + FOCUS.wait - 0.1);
  assert.equal(F.z, -30);
  assert.equal(F.turns, 2);
});

test('the knob ease starts at 0, ends at 1, overshoots slightly', () => {
  assert.equal(knob(0), 0); assert.equal(knob(1), 1);
  let mx = 0; for (let u = 0; u <= 1; u += 0.01) mx = Math.max(mx, knob(u));
  assert.ok(mx > 1 && mx < 1.05);
});
