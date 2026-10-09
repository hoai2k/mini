import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/glovedove.js';
import entry from '../src/more/glovedove.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;
const RACK_X0 = 1255;

// The dish to deal with next: the one that comes down onto the glove's
// height soonest, unless it is already on its way into the rack.
function next(game) {
  let best = null;
  for (const d of game.dishes) {
    const l = game.landing(d);
    if (!l || l.x > RACK_X0 - 30 || l.x < 300) continue;
    if (!best || l.t < best.l.t) best = { d, l };
  }
  return best;
}

// A juggler: runs under the next dish (standing `aim` to its left, so the
// dish lands on its far side and flies further), and presses `lead` seconds
// before it lands (give or take `slop`). `speed` is how hard it pushes.
function juggler({ speed = 1, aim = 40, lead = 0.04, slop = 0, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let want = lead;
  let target = null;
  let pressed = false;
  return (game) => {
    const n = next(game);
    if (!n) {
      pressed = false;
      return {};
    }
    if (n.d !== target || n.d.flicks !== target.flicks0) {
      target = n.d;
      target.flicks0 = n.d.flicks;
      want = Math.max(0, lead + (rnd() - 0.5) * 2 * slop);
    }
    const dx = n.l.x - aim - game.catchX();
    const x = Math.max(-1, Math.min(1, dx / 30)) * speed;
    const action = n.l.t <= want && Math.abs(n.l.x - game.catchX()) < 80 && !pressed;
    pressed = action;
    return { x, action };
  };
}

// Runs under the next dish and mashes the button.
const masher = (every = 4) => {
  let k = 0;
  return (game) => {
    const n = next(game);
    const dx = n ? n.l.x - 40 - game.catchX() : 0;
    return { x: Math.max(-1, Math.min(1, dx / 30)), action: k++ % every < every / 2 };
  };
};
// Runs under the next dish and never presses: the dishes only bounce.
const bouncer = () => (game) => {
  const n = next(game);
  const dx = n ? n.l.x - 40 - game.catchX() : 0;
  return { x: Math.max(-1, Math.min(1, dx / 30)) };
};

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const seeds = [1, 2, 3, 4, 5, 6];

test('glovedove: a beginner opens the next page, a good juggler more; mashing, bouncing and idling do not', () => {
  const beginner = seeds.map((seed) => run(create, { seed, bot: juggler({ speed: 0.65, aim: 20, lead: 0.07, slop: 0.08, seed }) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: juggler({ speed: 1, aim: 45, lead: 0.04, slop: 0.02, seed }) }).game.score);
  const mash = [2, 4, 8, 16].flatMap((every) => [1, 2].map((seed) => run(create, { seed, bot: masher(every) }).game.score));
  const bounce = [1, 2].map((seed) => run(create, { seed, bot: bouncer() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('glovedove beginner', beginner, 'good', good, 'mash', mash, 'bounce', bounce, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(mean(good) > mean(beginner) + 8, `good ${good}`);
  assert.ok(Math.max(...mash, ...bounce) < pass, `mashing and bouncing must not open the next page: ${mash} ${bounce}`);
});

// A dish falling straight onto the Dove's fingers.
function dropOn(game, off = 30) {
  game.dishes = [{ kind: 0, x: game.catchX() + off, y: 300, vx: 0, vy: 0, spin: 0, a: 0, flicks: 0 }];
  game.spawnT = 99;
  return game.dishes[0];
}
const until = (game, d, input = () => blank()) => {
  for (let i = 0; i < 120 && d.vy >= 0 && game.dishes.includes(d); i++) game.update(1 / 60, input(game.landing(d)));
};

test('glovedove: pressed just as it lands, a dish flies high and long (Hup!); too soon, feebly; not at all, it bounces', () => {
  const flick = (lead) => {
    const game = create(env(1));
    game.update(1 / 60, blank());
    const d = dropOn(game);
    let done = false;
    until(game, d, (l) => {
      const press = !done && l && l.t <= lead;
      if (press) done = true;
      return blank({ action: press, actionPressed: press });
    });
    return { game, d };
  };
  const hup = flick(0.03);
  assert.equal(hup.game.hups, 1);
  assert.equal(hup.game.score, 1);
  const soon = flick(0.15);
  assert.equal(soon.game.hups, 0);
  assert.ok(-soon.d.vy < -hup.d.vy && soon.d.vx < hup.d.vx, 'a feeble flick');
  const none = flick(-1);
  assert.equal(none.game.flicks, 0);
  assert.equal(none.game.bounces, 1);
  assert.ok(-none.d.vy < -soon.d.vy);
});

test('glovedove: a dish into the rack is put away; one on the counter smashes, with no points lost', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  game.spawnT = 99;
  game.score = 5;
  game.dishes = [{ kind: 0, x: 1400, y: 500, vx: 0, vy: 100, spin: 0, a: 0, flicks: 0 }, { kind: 1, x: 800, y: 600, vx: 0, vy: 100, spin: 0, a: 0, flicks: 0 }];
  game.x = 400;
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.equal(game.put, 1);
  assert.equal(game.smashed, 1);
  assert.equal(game.score, 8);
});

test('glovedove: a dish that drops back into the sink pops up again', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  game.dishes = [{ kind: 0, x: 200, y: 500, vx: 0, vy: 100, spin: 0, a: 0, flicks: 0 }];
  game.spawnT = 5;
  for (let i = 0; i < 30; i++) game.update(1 / 60, blank());
  assert.equal(game.dishes.length, 0);
  assert.equal(game.smashed, 0);
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.equal(game.dishes.length, 1);
});

test('glovedove: unflicked, a dish bounces once and then slips off; a press that catches nothing fumbles', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const d = dropOn(game, 0);
  for (let i = 0; i < 200 && !d.slipped; i++) {
    game.x += d.x - game.catchX(); // keep under it
    game.update(1 / 60, blank());
  }
  assert.equal(game.bounces, 1);
  assert.ok(d.slipped);
  for (let i = 0; i < 90; i++) game.update(1 / 60, blank());
  assert.equal(game.smashed, 1);
  // a press with no dish coming: the fingers fumble a while
  game.dishes = [];
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 15; i++) game.update(1 / 60, blank());
  assert.equal(game.fumbles, 1);
  assert.ok(game.rest > 0.6);
});
