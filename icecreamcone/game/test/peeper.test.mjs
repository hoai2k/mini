import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/peeper.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const medals = BIRDS.find((b) => b.id === 'peeper').medals;
const CATCH_Y = 860 - 150;

// A sharp reader: runs to where the next needed letter will be when it
// reaches the Peeper, and steps aside from wrong letters about to land on it.
function reader({ speed = 1, look = 1, react = 0 } = {}) {
  return (game) => {
    const need = game.word[game.idx];
    const eta = (l) => (CATCH_Y - l.y) / l.vy;
    const live = game.letters.filter((l) => !l.dead && l.y < CATCH_Y + 20 && l.age >= react);
    const want = live.filter((l) => l.ch === need && eta(l) > -0.05).sort((a, b) => eta(a) - eta(b))[0];
    let target = want ? game.letterX(want, Math.max(0, eta(want)) * look) : game.x;
    const soon = want ? eta(want) : 9;
    for (const l of live) {
      if (l.ch === need || eta(l) > 0.45 || eta(l) < -0.1 || eta(l) > soon) continue;
      const lx = game.letterX(l, Math.max(0, eta(l)));
      if (Math.abs(lx - target) < 100) target = lx + (target >= lx ? 110 : -110);
    }
    const d = target - game.x;
    return { x: Math.max(-1, Math.min(1, d / 40)) * speed };
  };
}

test('peeper: a sharp reader earns at least bronze; idle earns nothing', () => {
  const sharp = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: reader() }).game.score);
  const slow = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: reader({ speed: 0.5, look: 0, react: 0.6 }) }).game.score);
  const idle = run(create, { seed: 1 }).game;
  assert.ok(idle.score < medals[0], `idle ${idle.score}`);
  assert.ok(Math.min(...sharp) >= medals[0], `sharp ${sharp}`);
  console.log('peeper reader scores', sharp, 'slow', slow, 'idle', idle.score, 'medals', medals);
});

test('peeper: right letters stamp the word, wrong ones smudge, a word pays its length', () => {
  const game = create(env(4));
  const word = game.word;
  // catch a wrong letter first: no points to lose, the score stays at 0
  const wrong = 'Z';
  game.letters.push({ ch: wrong, bx: game.x, y: CATCH_Y, vy: 100, amp: 0, w: 1, ph: 0, age: 0, rot: 0, seed: 1 });
  game.update(1 / 60, blank());
  assert.equal(game.score, 0);
  assert.equal(game.smudged, 1);
  for (const ch of word) {
    game.letters.push({ ch, bx: game.x, y: CATCH_Y, vy: 100, amp: 0, w: 1, ph: 0, age: 0, rot: 0, seed: 1 });
    game.update(1 / 60, blank());
  }
  assert.equal(game.words, 1);
  assert.equal(game.score, word.length * 2);
  assert.ok(game.word.length > word.length, 'the next word is longer');
});

test('peeper: the needed letter keeps coming', () => {
  const game = create(env(9));
  let gapMax = 0;
  let gap = 0;
  for (let i = 0; i < 60 * 44; i++) {
    game.update(1 / 60, blank());
    const has = game.letters.some((l) => !l.dead && l.ch === game.word[game.idx]);
    gap = has ? 0 : gap + 1 / 60;
    gapMax = Math.max(gapMax, gap);
  }
  assert.ok(gapMax < 1.5, `the needed letter was missing for ${gapMax.toFixed(2)} s`);
});
