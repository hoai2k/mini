import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/piffle.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'piffle').pass;

// A player who steers the stick toward where the seam will be in `look`
// seconds, with a reaction `lag` (it sees the needle as it was a few frames
// ago), and hurries while the seam ahead is fairly straight (`dare`: the
// sideways drift per px it will still hurry through; 0 never hurries).
function sewer({ look = 0.12, lag = 6, dare = 0, gain = 30 } = {}) {
  const seen = [];
  return (game) => {
    seen.push(game.x);
    const x = seen.length > lag ? seen[seen.length - 1 - lag] + (game.x - seen[seen.length - 1 - lag]) * 0.5 : game.x;
    const ahead = game.dist + game.speed() * look;
    const target = game.seamX(ahead);
    const bend = Math.abs(game.seamX(game.dist + 260) - game.seamX(game.dist)) / 260;
    return { x: Math.max(-1, Math.min(1, (target - x) / gain)), action: dare > 0 && bend < dare };
  };
}

test('piffle: a careful sewer opens the next page; idle earns little', () => {
  const careful = [1, 2, 3].map((seed) => run(create, { seed, bot: sewer({ lag: 12, gain: 45 }) }).game.score);
  const steady = [1, 2, 3].map((seed) => run(create, { seed, bot: sewer({ lag: 6, dare: 0.5 }) }).game.score);
  const bold = [1, 2, 3].map((seed) => run(create, { seed, bot: sewer({ lag: 4, dare: 1.2 }) }).game.score);
  const idle = [1, 2].map((seed) => run(create, { seed }).game.score);
  console.log('piffle careful', careful, 'steady', steady, 'bold', bold, 'idle', idle, 'pass', pass);
  assert.ok(Math.max(...idle) < pass, `idle ${idle}`);
  assert.ok(Math.min(...careful) >= pass, `careful ${careful}`);
});

test('piffle: a stitch on the seam scores, one off it does not', () => {
  const game = create(env(1));
  // the first stretch of seam runs straight down the middle
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.ok(game.score > 0);
  const before = game.score;
  game.x = game.seamX(game.dist) + 200;
  for (let i = 0; i < 20; i++) game.update(1 / 60, blank());
  assert.equal(game.score, before);
  assert.ok(game.wobbly > 0);
});

test('piffle: holding the action sews faster', () => {
  const a = create(env(1));
  const b = create(env(1));
  for (let i = 0; i < 120; i++) {
    a.update(1 / 60, blank());
    b.update(1 / 60, blank({ action: true }));
  }
  assert.ok(b.dist > a.dist * 1.4);
});
