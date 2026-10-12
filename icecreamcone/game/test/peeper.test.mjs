import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/peeper.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'peeper').pass;
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

test('peeper: a sharp reader opens the next page; idle earns nothing', () => {
  const sharp = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: reader() }).game.score);
  const slow = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: reader({ speed: 0.5, look: 0, react: 0.6 }) }).game.score);
  const idle = run(create, { seed: 1 }).game;
  assert.ok(idle.score < pass, `idle ${idle.score}`);
  assert.ok(Math.min(...sharp) >= pass, `sharp ${sharp}`);
  console.log('peeper readers', sharp, 'slow', slow, 'idle', idle.score, 'pass', pass);
});

test('peeper: a beginner passes about half the time or more; mashing does not', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const beginner = seeds.map((seed) => run(create, { seed, bot: reader({ speed: 0.5, look: 0, react: 0.6 }) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: reader() }).game.score);
  const mash = seeds.map((seed) => {
    let r = seed * 31;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    let d = 0;
    return run(create, { seed, bot: () => {
      if (rnd() < 0.03) d = rnd() * 2 - 1;
      return { x: d, action: rnd() < 0.5 };
    } }).game.score;
  });
  console.log('peeper beginner', `${beginner}`, 'good', `${good}`, 'mash', `${mash}`, 'pass', pass);
  assert.ok(beginner.filter((s) => s >= pass).length >= seeds.length / 2, `beginner ${beginner}`);
  assert.ok(Math.max(...mash) < pass, `mashing ${mash}`);
});

test('peeper: letters start slow, steady and helpful, and end fast and swaying', () => {
  const early = [];
  const late = [];
  for (const seed of [1, 2, 3, 4]) {
    const game = create(env(seed));
    const seen = new Set();
    while (!game.done) {
      game.update(1 / 60, blank());
      for (const l of game.letters) {
        if (seen.has(l)) continue;
        seen.add(l);
        const half = game.elapsed < 15 ? early : game.elapsed > 30 ? late : null;
        if (half) half.push({ vy: l.vy, amp: l.amp });
      }
    }
  }
  const mean = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
  assert.ok(late.length > early.length * 1.2, `more letters late: ${early.length} vs ${late.length}`);
  assert.ok(mean(late, (l) => l.vy) > mean(early, (l) => l.vy) * 1.6, 'they fall faster');
  assert.ok(mean(late, (l) => l.amp) > mean(early, (l) => l.amp) * 2, 'they sway wider');
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
