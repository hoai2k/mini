import { test } from 'node:test';
import assert from 'node:assert/strict';
import { _bowling as b } from '../games/bowling.js';

const state = scores => ({ round: 1, order: ['a', 'b'], turn: 'a', frame: 1, scores, pinsUp: b.FULL, seq: 1, phase: 'roll' });
const present = new Set(['a', 'b']);

test('curved swipes hook in the direction the gesture turns', () => {
  // Moving upward, this arc initially heads right and then turns left.
  const left = [{ x: 100, y: 500 }, { x: 140, y: 420 }, { x: 160, y: 350 }, { x: 140, y: 280 }, { x: 100, y: 200 }];
  const right = left.map(p => ({ x: 200 - p.x, y: p.y }));
  const leftSpin = b.swipeSpin(left, 600), rightSpin = b.swipeSpin(right, 600);
  assert.ok(leftSpin < 0, 'left-turning swipe produces left hook');
  assert.ok(rightSpin > 0, 'right-turning swipe produces right hook');
  assert.equal(leftSpin, -rightSpin);
  for (const [spin, sign] of [[leftSpin, -1], [rightSpin, 1]]) {
    const sim = b.makeSim(b.FULL, { x: 0, angle: 0, speed: 300, spin });
    while (sim.ball.y < b.HEAD * 0.7) b.stepSim(sim);
    assert.ok(sim.ball.x * sign > 0, 'ball moves in the gesture\'s hook direction before reaching pins');
  }
});

test('straight vertical and diagonal swipes do not add spin', () => {
  for (const dx of [-80, 0, 80]) {
    const pts = [0, 0.25, 0.5, 0.75, 1].map(t => ({ x: 100 + dx * t, y: 500 - 300 * t }));
    assert.equal(b.swipeSpin(pts, 600), 0);
  }
});

test('a strike holds the fallen rack and bowler for 1.5 seconds', () => {
  const result = b.applyRoll(state({ a: [], b: [] }), 0, present, 1000);
  assert.equal(result.phase, 'settle');
  assert.equal(result.turn, 'a');
  assert.equal(result.pinsUp, 0);
  assert.deepEqual(result.scores.a, [10]);
  assert.strictEqual(b.advanceRoll(result, 2499), result);
  const next = b.advanceRoll(result, 2500);
  assert.equal(next.turn, 'b');
  assert.equal(next.phase, 'aim');
  assert.equal(next.pinsUp, b.FULL);
});

test('first balls retain the remaining pins; second balls reset only after the pause', () => {
  const first = b.applyRoll(state({ a: [], b: [] }), 7, present, 1000);
  const second = b.advanceRoll(first, 2500);
  assert.equal(second.turn, 'a');
  assert.equal(second.pinsUp, 7);
  const spare = b.applyRoll({ ...second, phase: 'roll', seq: 2 }, 0, present, 3000);
  assert.equal(spare.last.spare, true);
  assert.equal(spare.turn, 'a');
  assert.equal(spare.pinsUp, 0);
  assert.equal(b.advanceRoll(spare, 4500).turn, 'b');
  assert.equal(b.advanceRoll(spare, 4500).pinsUp, b.FULL);
});

test('the last ball also holds before the game-over screen', () => {
  const sh = { ...state({ a: Array(18).fill(0), b: Array(20).fill(0) }), frame: 10, pinsUp: 7 };
  // a has already made its first roll of frame ten.
  sh.scores.a.push(7);
  const result = b.applyRoll(sh, 0, present, 1000);
  assert.equal(result.phase, 'settle');
  // A spare earns a bonus roll, still on a fresh rack after settling.
  const bonus = b.advanceRoll(result, 2500);
  assert.equal(bonus.turn, 'a');
  const finished = b.applyRoll({ ...bonus, phase: 'roll', seq: 2 }, 0, present, 3000);
  assert.equal(finished.phase, 'settle');
  assert.equal(finished.turn, 'a');
  assert.equal(b.advanceRoll(finished, 4500).phase, 'over');
});

test('pins leaving the deck finish toppling rather than freezing halfway', () => {
  for (const th of [{ x: 0, angle: 0, speed: 300, spin: 0 }, { x: 12, angle: -0.03, speed: 470, spin: -0.7 }]) {
    const sim = b.runSim(b.FULL, th);
    assert.ok(sim.pins.some(p => p.out && p.down));
    for (const pin of sim.pins.filter(p => p.down)) assert.ok(pin.ft >= 0.35, `pin ${pin.i} frozen at ${pin.ft}`);
    assert.deepEqual(b.runSim(b.FULL, th), sim);
  }
});
