import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/buttonbeaks.js';
import entry from '../src/more/buttonbeaks.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A tailor: takes the coat furthest along the line that still has an open
// hole it can reach, fetches that button and tosses it up under the coat.
// `skill` 0..1 sets its speed, how long it looks, and how often it picks up
// a look-alike by mistake.
function tailor(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let plan = null; // { coat, hole, bowl }
  let thinkUntil = 0;
  let pressed = false;
  const speed = 0.45 + 0.55 * skill;
  return (game, t) => {
    if (pressed) {
      pressed = false;
      return {};
    }
    if (game.daze > 0 || t < thinkUntil) return {};
    const reachable = (coat) => coat.x - 60 > 140 + (Math.abs(coat.x - game.x) + 600) * 0.12;
    if (game.holding === null) {
      if (!plan || plan.hole.sewn || !game.coats.includes(plan.coat) || !reachable(plan.coat)) {
        const coats = game.coats.filter((c) => c.x < 1500 && reachable(c) && c.holes.some((h) => !h.sewn)).sort((a, b) => a.x - b.x);
        const coat = coats[0];
        if (!coat) return { x: (800 - game.x) / 300 };
        const hole = coat.holes.find((h) => !h.sewn);
        let bowl = hole.kind;
        if (rnd() > 0.88 + 0.12 * skill) bowl = (bowl + 4) % game.bowls === bowl ? (bowl + 1) % game.bowls : (bowl + 4) % game.bowls;
        if (bowl >= game.bowls) bowl = hole.kind;
        plan = { coat, hole, bowl };
        thinkUntil = t + (1 - skill) * 0.9 + 0.25;
        return {};
      }
      const d = game.bowlX(plan.bowl) - game.x;
      if (Math.abs(d) < 30) {
        pressed = true;
        return { action: true };
      }
      return { x: Math.max(-1, Math.min(1, d / 50)) * speed };
    }
    // holding: find a coat that wants this button
    const coats = game.coats.filter((c) => c.x > 160 && c.x < 1520 && c.holes.some((h) => !h.sewn && h.kind === game.holding)).sort((a, b) => a.x - b.x);
    const coat = coats[0];
    if (!coat) {
      // nobody wants it: toss it away where no coat is overhead
      plan = null;
      if (!game.coatAbove()) {
        pressed = true;
        return { action: true };
      }
      return { x: 1 };
    }
    const d = coat.x - 40 - game.x;
    if (Math.abs(d) < 40) {
      pressed = true;
      plan = null;
      return { action: true };
    }
    return { x: Math.max(-1, Math.min(1, d / 50)) * speed };
  };
}

// Walking up and down pressing all the time.
const masher = () => {
  let d = 1;
  return (game, t) => {
    if (game.x > 1300) d = -1;
    if (game.x < 300) d = 1;
    return { x: d * 0.7, action: Math.floor(t * 4) % 2 === 0 };
  };
};

test('buttonbeaks: a beginner opens the next page, a good tailor more; mashing and idling do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: tailor(0.3, seed) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: tailor(1, seed) }).game.score);
  const mash = [1, 2, 3].map((seed) => run(create, { seed, bot: masher() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('buttonbeaks beginner', beginner, 'good', good, 'mash', mash, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(Math.min(...good) > Math.max(...beginner), `good ${good}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

test('buttonbeaks: the matching button sews into its hole', () => {
  const game = create(env(1));
  const coat = game.coats[0];
  const hole = coat.holes[0];
  game.x = game.bowlX(hole.kind);
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.holding, hole.kind);
  game.x = coat.x;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.holding, null);
  for (let i = 0; i < 30; i++) game.update(1 / 60, blank());
  assert.ok(hole.sewn);
  assert.equal(game.score, 1);
});

test('buttonbeaks: a button that matches nothing bounces off and dazes them', () => {
  const game = create(env(1));
  const coat = game.coats[0];
  const kind = [0, 1, 2, 3].find((k) => !coat.holes.some((h) => h.kind === k));
  game.x = game.bowlX(kind);
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  game.x = coat.x;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 20; i++) game.update(1 / 60, blank());
  assert.equal(game.score, 0);
  assert.equal(game.wrong, 1);
  assert.ok(game.daze > 0);
  assert.ok(coat.holes.every((h) => !h.sewn));
});

test('buttonbeaks: more bowls, and coats with more holes, later on', () => {
  const game = create(env(2));
  assert.equal(game.bowls, 4);
  let most = 0;
  for (let i = 0; i < 60 * 40; i++) {
    game.update(1 / 60, blank());
    for (const c of game.coats) most = Math.max(most, c.holes.length);
  }
  assert.equal(game.bowls, 6);
  assert.equal(most, 3);
});
