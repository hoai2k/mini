import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/dodo.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'dodo').pass;

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

test('dodo: a sharp-eyed tracker opens the next page; idle earns nothing', () => {
  const sharp = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: tracker() }).game.score);
  const tired = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: tracker(1.2, 6) }).game.score);
  const guess = [1, 2, 3, 4, 5, 6].map((seed) => run(create, { seed, bot: guesser }).game.score);
  const idle = run(create, { seed: 1 }).game;
  assert.equal(idle.score, 0);
  assert.ok(idle.done);
  assert.ok(Math.min(...sharp) >= pass, `sharp ${sharp}`);
  assert.ok(Math.min(...tired) >= pass, `tired ${tired}`);
  const avgGuess = guess.reduce((a, b) => a + b) / guess.length;
  assert.ok(avgGuess < pass, `guessing averages ${avgGuess}`);
  console.log('dodo trackers', sharp, 'loses track from round 6', tired, 'guesser', guess, 'pass', pass);
});

// A beginner: follows the Dodo's hat by eye, and may lose it whenever that
// hat moves, more likely the quicker the move (and more in a feint, a double
// swap or a ring). Once lost, it guesses. Measured from each move as it plays.
function beginner(seed) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let seen = null;
  let lost = false;
  let round = -1;
  let guess = 0;
  return (game, t) => {
    if (game.round !== round) {
      round = game.round;
      lost = false;
    }
    const m = game.move;
    if (m && m !== seen) {
      seen = m;
      const dodo = game.hats.find((h) => h.dodo);
      if (m.hats.includes(dodo)) {
        const p = Math.max(0, (0.6 - m.dur) * 1.3) + (m.legs.length > 2 ? 0.12 : 0) + (m.fake ? 0.12 : 0);
        if (rnd() < p) lost = true;
      }
      guess = Math.floor(rnd() * game.hats.length);
    }
    if (game.phase !== 'pick' || game.pt < 1) return {};
    const target = lost ? Math.min(guess, game.hats.length - 1) : game.dodoSlot();
    if (game.sel === target) return { action: true };
    const flip = Math.floor(t * 60) % 2 === 0;
    return { x: flip ? Math.sign(target - game.sel) : 0 };
  };
}

test('dodo: a beginner passes about half the time or more; guessing does not', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const begin = seeds.map((seed) => run(create, { seed, bot: beginner(seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: tracker() }).game.score);
  const mash = seeds.map((seed) => run(create, { seed, bot: guesser }).game.score);
  console.log('dodo beginner', `${begin}`, 'good', `${good}`, 'mash', `${mash}`, 'pass', pass);
  assert.ok(begin.filter((s) => s >= pass).length >= seeds.length / 2, `beginner ${begin}`);
  // a shell game can be guessed by luck now and then (about one game in ten
  // over 60 seeds); guessing must not pass as a rule
  assert.ok(mash.filter((s) => s >= pass).length <= 1, `guessing ${mash}`);
  assert.ok(mash.reduce((a, b) => a + b) / mash.length < pass * 0.7, `guessing ${mash}`);
});

test('dodo: the first rounds are few, slow swaps; the last are many quick ones', () => {
  const game = create(env(3));
  const rounds = [];
  let move = null;
  for (let i = 0; i < 60 * 200 && !game.done; i++) {
    game.update(1 / 60, blank({ action: game.phase === 'pick' }));
    if (game.move && game.move !== move) {
      move = game.move;
      const r = (rounds[game.round] ||= { n: game.hats.length, moves: 0, dur: 0 });
      r.moves++;
      r.dur += move.dur;
    }
  }
  const first = rounds[0];
  const last = rounds[rounds.length - 1];
  assert.equal(rounds.length, 8);
  assert.ok(first.n === 3 && last.n === 5);
  assert.ok(last.moves >= first.moves * 5, `moves ${first.moves} to ${last.moves}`);
  assert.ok(last.dur / last.moves < (first.dur / first.moves) * 0.4, 'and much quicker');
  // each round is at least as hard as the one before
  for (let i = 1; i < rounds.length; i++) assert.ok(rounds[i].moves >= rounds[i - 1].moves && rounds[i].n >= rounds[i - 1].n, `round ${i + 1}`);
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
