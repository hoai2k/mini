import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/snippit.js';
import entry from '../src/more/snippit.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A snipper: looks at the tag for a moment (longer with a bigger tangle),
// traces the string (getting it wrong now and then), walks to its knot and
// snips. `skill` 0..1 sets how quick and how sure it is.
function snipper(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let want = null;
  let target = null;
  let wait = 0;
  let pressed = false;
  return (game, t) => {
    if (game.want !== want) {
      want = game.want;
      const n = game.balloons.length;
      wait = t + (1 - skill) * (0.9 + 0.35 * n) + 0.35 + 0.1 * n;
      target = null;
    }
    if (!want || t < wait) return {};
    if (!target || !game.balloons.includes(target)) {
      const right = rnd() < 0.82 + 0.18 * skill;
      const others = game.balloons.filter((b) => b !== want);
      target = right || !others.length ? want : others[Math.floor(rnd() * others.length)];
    }
    const d = target.px - game.cutX();
    if (Math.abs(d) < 14 && game.jam <= 0 && !pressed) {
      pressed = true;
      return { action: true };
    }
    pressed = false;
    return { x: Math.max(-1, Math.min(1, d / 60)) * (0.5 + 0.5 * skill) };
  };
}

// Running up and down the fence snipping all the time.
const masher = () => {
  let d = 1;
  return (game, t) => {
    if (game.x > 1300) d = -1;
    if (game.x < 300) d = 1;
    return { x: d, action: Math.floor(t * 4) % 2 === 0 };
  };
};
// Standing in one place snipping whatever is there.
const camper = () => (game, t) => ({ action: Math.floor(t * 3) % 2 === 0 });

test('snippit: a beginner opens the next page, a good snipper more; mashing and idling do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: snipper(0.3, seed) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: snipper(1, seed) }).game.score);
  const mash = [1, 2, 3].map((seed) => run(create, { seed, bot: masher() }).game.score);
  const camp = [1, 2].map((seed) => run(create, { seed, bot: camper() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('snippit beginner', beginner, 'good', good, 'mash', mash, 'camp', camp, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(Math.min(...good) > Math.max(...beginner), `good ${good}`);
  assert.ok(Math.max(...mash, ...camp) < pass, `mashing must not open the next page: ${mash} ${camp}`);
});

test('snippit: snipping the asked-for string scores and lets it go', () => {
  const game = create(env(2));
  game.update(1 / 60, blank());
  const want = game.want;
  game.x = want.px + game.tip;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.right, 1);
  assert.equal(game.score, 15, 'right and quick');
  assert.ok(!game.balloons.includes(want));
  assert.equal(game.loose.length, 1);
  assert.notEqual(game.want, want, 'a new balloon is asked for');
});

test('snippit: a wrong string costs points and jams the blades', () => {
  const game = create(env(3));
  game.update(1 / 60, blank());
  game.score = 30;
  const other = game.balloons.find((b) => b !== game.want);
  const want = game.want;
  game.x = other.px + game.tip;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.wrong, 1);
  assert.equal(game.score, 25);
  assert.ok(game.jam > 0);
  assert.equal(game.want, want, 'the same one is still wanted');
  // jammed: a second snip does nothing
  game.x = want.px + game.tip;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.right, 0);
});

test('snippit: the tangle is never straight at the start, and grows over time', () => {
  for (let seed = 1; seed < 20; seed++) {
    const game = create(env(seed));
    const byKnot = [...game.balloons].sort((a, b) => a.px - b.px);
    const bySky = [...game.balloons].sort((a, b) => a.bx - b.bx);
    assert.ok(byKnot.some((b, i) => bySky[i] !== b), `seed ${seed}: some strings cross`);
  }
  const game = create(env(1));
  for (let i = 0; i < 60 * 35; i++) game.update(1 / 60, blank());
  assert.equal(game.balloons.length, 6);
  assert.equal(new Set(game.balloons.map((b) => b.color)).size, 6, 'every colour once');
});

test('snippit: a snip away from every knot does nothing', () => {
  const game = create(env(4));
  game.update(1 / 60, blank());
  game.x = 250; // left of every knot (the first is at 400)
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.right + game.wrong, 0);
});

test('snippit: the blades cut toward the tip, and the knot nearest the tip is the one cut', () => {
  const game = create(env(3));
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  const knots = [...game.balloons].sort((a, b) => a.px - b.px);
  const [a, b2] = knots;
  // the tip just past the first knot catches it, though the hinge is far off
  // (the blades run left from the hinge to the tip)
  assert.equal(game.under(a.px + game.tip + 20), a, 'just beyond the tip');
  assert.equal(game.under(a.px + game.tip - 60), a, 'further back along the blades');
  assert.equal(game.under(a.px - 10), null, 'behind the hinge');
  assert.equal(game.under(a.px + game.tip + 60), null, 'well beyond the tip');
  // with two knots between the blades, the one nearer the tip is cut
  a.px = 600;
  b2.px = 650;
  const at = (x) => game.under(x + game.tip);
  assert.equal(at(610), a, 'the left knot is nearer the tip');
  assert.equal(at(640), b2, 'the right knot is nearer the tip');
  assert.equal(at(560), a, 'only the left one is reached, beyond the tip');
});
