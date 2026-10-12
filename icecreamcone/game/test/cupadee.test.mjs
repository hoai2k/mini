import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/cupadee.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'cupadee').pass;

// A pourer that watches the cup and the tea still falling, and lets go when
// the whole lot will reach the line. `err` is how far off its judgement is
// (in cup-fulls, a different miss for each cup), like a person's.
function pourer(err = 0, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const miss = new Map();
  return (game) => {
    const b = game.birds.find((b) => b.state === 'serve');
    if (!b) return { action: false };
    if (b.motion === 'stroll' && Math.abs(b.x - game.streamX) > (b.size / 400) * 84 - 18) return { action: false };
    if (!miss.has(b)) miss.set(b, (rnd() * 2 - 1) * err);
    const falling = game.parcels.reduce((s, p) => s + p.vol, 0) / b.cap;
    return { action: b.fill + falling + 0.03 / b.cap < b.line + miss.get(b) };
  };
}

test('cupadee: a decent pourer opens the next page, a sharp one far more; idle earns nothing', () => {
  const decent = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: pourer(0.14, seed) }).game.score);
  const sharp = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: pourer(0.04, seed) }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('cupadee decent', decent, 'sharp', sharp, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...decent) >= pass, `decent ${decent}`);
  assert.ok(Math.max(...sharp) >= pass * 2.5, `sharp ${sharp}`);
});

// Mashing: tapping the action at random, or holding it down.
function masher(seed) {
  let r = seed * 31;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  return () => ({ action: rnd() < 0.5 });
}

test('cupadee: a beginner passes about half the time or more; mashing and holding do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const beginner = seeds.map((seed) => run(create, { seed, bot: pourer(0.24, seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: pourer(0.04, seed) }).game.score);
  const mash = seeds.map((seed) => run(create, { seed, bot: masher(seed) }).game.score);
  const hold = run(create, { seed: 1, bot: () => ({ action: true }) }).game.score;
  console.log('cupadee beginner', `${beginner}`, 'good', `${good}`, 'mash', `${mash}`, 'hold', `${hold}`, 'pass', pass);
  assert.ok(beginner.filter((s) => s >= pass).length >= seeds.length / 2, `beginner ${beginner}`);
  assert.ok(Math.max(...mash) < pass, `mashing ${mash}`);
  assert.ok(hold < pass, `holding ${hold}`);
});

test('cupadee: holding on too long spills the cup and breaks the combo', () => {
  const game = create(env(1));
  game.streak = 3;
  for (let i = 0; i < 60 * 12 && !game.spills; i++) game.update(1 / 60, blank({ action: true }));
  assert.equal(game.spills, 1);
  assert.equal(game.streak, 0);
  assert.equal(game.score, 0);
});

test('cupadee: a fill right on the line is Perfect', () => {
  const game = create(env(1));
  let t = 0;
  while (!game.birds.some((b) => b.state === 'serve') && t < 5) {
    game.update(1 / 60, blank());
    t += 1 / 60;
  }
  const b = game.birds.find((b) => b.state === 'serve');
  b.fill = b.line;
  for (let i = 0; i < 40; i++) game.update(1 / 60, blank());
  assert.equal(game.perfects, 1);
  assert.equal(game.score, 100);
  assert.ok(Number.isInteger(game.score));
});

// The Cupadee is one size in every painted pose (standing, beak open), and stands on the
// same line: measured against how big each picture is painted
// (design/source/pose-scales.json).
test('cupadee: every painted pose shows the Cupadee the same size, on the same feet', async () => {
  const { withArt, birdSizes, sizeCheck } = await import('./sprite-rig.mjs');
  const undo = withArt();
  try {
    const feet = { 'bird.cupadee#0': 0.964, 'sprites.cupadeeOpen#0': 0.962 };
    const sizes = await birdSizes('cupadee', { standing: {}, open: { open: true } }, feet);
    const { fails, table } = sizeCheck(sizes, 'standing');
    console.log('cupadee pose sizes', table);
    assert.deepEqual(fails, []);
    const y0 = sizes.standing[0].feetY;
    for (const [name, [d]] of Object.entries(sizes)) assert.ok(Math.abs(d.feetY - y0) < 4, `${name}: feet at ${d.feetY.toFixed(1)}, standing at ${y0.toFixed(1)}`);
  } finally {
    undo();
  }
});

test('cupadee: the round starts with big, still cups and ends with small, moving ones', () => {
  const early = [];
  const late = [];
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const game = create(env(seed));
    const seen = new Set(game.birds);
    while (!game.done) {
      game.update(1 / 60, blank({ action: false }));
      for (const b of game.birds) {
        if (seen.has(b)) continue;
        seen.add(b);
        (game.elapsed < 15 ? early : game.elapsed > 30 ? late : []).push(b);
      }
    }
  }
  const hard = (b) => (b.kind !== 'big' ? 1 : 0) + (b.motion !== 'still' ? 1 : 0);
  const mean = (a, f) => a.reduce((s, b) => s + f(b), 0) / a.length;
  assert.ok(early.length && late.length);
  assert.ok(mean(early, hard) < 0.5, `early cups mostly big and still: ${mean(early, hard)}`);
  assert.ok(mean(late, hard) > mean(early, hard) + 0.7, `late cups harder: ${mean(early, hard)} vs ${mean(late, hard)}`);
  assert.ok(mean(late, (b) => b.cap) < mean(early, (b) => b.cap) * 0.85, 'late cups smaller');
  assert.ok(mean(late, (b) => b.patience) < mean(early, (b) => b.patience), 'late Cupadees less patient');
});
