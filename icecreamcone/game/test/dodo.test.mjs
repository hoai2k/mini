import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/dodo.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const medals = BIRDS.find((b) => b.id === 'dodo').medals;

// A sharp-eyed player: knows where the Dodo went, takes `react` seconds to
// decide, then steps the marker over with the stick (one step per press).
function tracker(react = 0.6, missFrom = 99) {
  return (game, t) => {
    if (game.phase !== 'pick' || game.pt < react) return {};
    // from round `missFrom` on, it loses track and guesses the first hat
    const target = game.round + 1 >= missFrom ? 0 : game.dodoSlot();
    if (game.sel === target) return { action: true };
    const flip = Math.floor(t * 60) % 2 === 0;
    return { x: flip ? Math.sign(target - game.sel) : 0 };
  };
}

// Guesses at once, pressing the action as soon as it can.
const guesser = (game) => ({ action: game.phase === 'pick' && game.pt > 0.15 });

test('dodo: a sharp-eyed tracker earns at least bronze; idle earns nothing', () => {
  const sharp = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: tracker() }).game.score);
  const tired = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: tracker(1.2, 6) }).game.score);
  const guess = [1, 2, 3, 4, 5, 6].map((seed) => run(create, { seed, bot: guesser }).game.score);
  const idle = run(create, { seed: 1 }).game;
  assert.equal(idle.score, 0);
  assert.ok(idle.done);
  assert.ok(Math.min(...sharp) >= medals[0], `sharp ${sharp}`);
  assert.ok(Math.min(...tired) >= medals[0], `tired ${tired}`);
  const avgGuess = guess.reduce((a, b) => a + b) / guess.length;
  assert.ok(avgGuess < medals[0], `guessing averages ${avgGuess}`);
  console.log('dodo tracker scores', sharp, 'loses track from round 6', tired, 'guesser', guess, 'medals', medals);
});

test('dodo: the shuffle keeps exactly one Dodo and every hat in its own place', () => {
  const game = create(env(5));
  let rounds = 0;
  let was = game.phase;
  for (let i = 0; i < 60 * 200 && !game.done; i++) {
    game.update(1 / 60, blank());
    const now = game.phase;
    if (now === 'pick' && was !== 'pick') {
      rounds++;
      assert.equal(game.hats.filter((h) => h.dodo).length, 1);
      const slots = game.hats.map((h) => h.slot).sort();
      assert.deepEqual(slots, [...Array(game.hats.length).keys()]);
    }
    was = now;
  }
  assert.ok(game.done);
  assert.equal(rounds, 8);
  assert.equal(game.hats.length, 5);
});

test('dodo: the pointer hovers over a hat and a click picks it', () => {
  const game = create(env(2));
  for (let i = 0; i < 60 * 30 && game.phase !== 'pick'; i++) game.update(1 / 60, blank());
  const slot = game.dodoSlot();
  const x = game.hats.find((h) => h.dodo).x;
  for (let i = 0; i < 12; i++) game.update(1 / 60, blank({ pointer: { active: true, x, y: 600 } }));
  assert.equal(game.sel, slot);
  game.update(1 / 60, blank({ action: true, actionPressed: true, pointer: { active: true, x, y: 600 } }));
  assert.ok(game.right);
  assert.ok(game.score >= 100, `score ${game.score}`);
});
