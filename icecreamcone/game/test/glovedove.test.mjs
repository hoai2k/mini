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

// A crouch-and-bump player: runs under the next dish and holds the action
// (crouches) `lead` seconds before it comes down, so it settles on the glove;
// then keeps crouching until wound up to `wind` times a full crouch (give or
// take `slop`) and lets go. With `carry`, a dish caught far from the rack is
// carried right before the bump, so the "Hup!" reaches the rack. `forget` is
// the chance it doesn't crouch for a dish at all. `speed` is how hard it
// pushes the stick.
const FULL = 0.45;
function player({ speed = 1, lead = 0.35, wind = 1.1, slop = 0, carry = false, forget = 0, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let want = wind;
  let skip = null;
  let lastHeld = null;
  return (game) => {
    if (game.held) {
      if (game.held !== lastHeld) {
        lastHeld = game.held;
        want = Math.max(0.2, wind + (rnd() - 0.5) * 2 * slop);
      }
      const far = carry && game.catchX() < 760;
      return { x: far ? speed : 0, action: far || game.charge < want * FULL };
    }
    lastHeld = null;
    const n = next(game);
    if (!n) return {};
    if (n.d !== skip && n.d.forgot === undefined) n.d.forgot = rnd() < forget;
    const dx = n.l.x - 20 - game.catchX();
    const x = Math.max(-1, Math.min(1, dx / 30)) * speed;
    const action = !n.d.forgot && n.l.t <= lead && Math.abs(n.l.x - game.catchX()) < 120;
    return { x, action: action || (game.crouch && n.l.t < 0.6) };
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
// Runs under the next dish holding the action all the time: it catches one
// and never lets go.
const holder = () => (game) => {
  const n = next(game);
  const dx = n ? n.l.x - 20 - game.catchX() : 0;
  return { x: Math.max(-1, Math.min(1, dx / 30)), action: true };
};
// Runs under the next dish and never presses: the dishes only bounce.
const bouncer = () => (game) => {
  const n = next(game);
  const dx = n ? n.l.x - 40 - game.catchX() : 0;
  return { x: Math.max(-1, Math.min(1, dx / 30)) };
};

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const seeds = [1, 2, 3, 4, 5, 6];

test('glovedove: beginners open the next page, a good player more; mashing, holding, bouncing and idling do not', () => {
  const beginner = seeds.map((seed) => run(create, { seed, bot: player({ speed: 0.65, lead: 0.4, wind: 1.2, slop: 0.5, seed }) }).game.score);
  const clumsy = seeds.map((seed) => run(create, { seed, bot: player({ speed: 0.5, lead: 0.5, wind: 1.1, slop: 0.6, forget: 0.2, seed }) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: player({ speed: 1, lead: 0.3, wind: 1.05, carry: true, seed }) }).game.score);
  const mash = [2, 4, 8, 16, 30].flatMap((every) => [1, 2].map((seed) => run(create, { seed, bot: masher(every) }).game.score));
  const hold = [1, 2].map((seed) => run(create, { seed, bot: holder() }).game.score);
  const bounce = [1, 2].map((seed) => run(create, { seed, bot: bouncer() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('glovedove beginner', beginner, 'clumsy', clumsy, 'good', good, 'mash', mash, 'hold', hold, 'bounce', bounce, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass * 1.25, `beginner ${beginner}`);
  assert.ok(Math.min(...clumsy) >= pass, `clumsy beginner ${clumsy}`);
  assert.ok(mean(good) > mean(beginner) + 8, `good ${good}`);
  assert.ok(Math.max(...mash, ...hold, ...bounce) < pass, `mashing, holding and bouncing must not open the next page: ${mash} ${hold} ${bounce}`);
});

// A dish falling straight onto the Dove's fingers.
function dropOn(game, off = 30) {
  game.dishes = [{ kind: 0, x: game.catchX() + off, y: 120, vx: 0, vy: 0, spin: 0, a: 0, flicks: 0 }];
  game.spawnT = 99;
  return game.dishes[0];
}
const until = (game, d, input = () => blank()) => {
  for (let i = 0; i < 120 && d.vy >= 0 && game.dishes.includes(d); i++) game.update(1 / 60, input(game.landing(d)));
};

// Crouch (hold) until the dish settles on the glove, keep crouching for
// `wind` seconds more, then let go.
// (`late`: only crouch at the last moment, so the crouch is not wound up.)
function crouchAndBump(wind, late = false) {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const d = dropOn(game);
  let i = 0;
  while (!d.held && i++ < 200) {
    const l = game.landing(d);
    game.update(1 / 60, blank({ action: !late || game.crouch || (l && l.t < 0.04) }));
  }
  assert.ok(d.held, 'the dish settles on the crouched glove');
  for (let k = 0; k < Math.round(wind * 60); k++) game.update(1 / 60, blank({ action: true }));
  game.update(1 / 60, blank({ action: false, actionReleased: true }));
  return { game, d };
}

test('glovedove: crouched, a dish settles on the glove; wound right up, letting go is a Hup! towards the rack; sooner, a hop', () => {
  const full = crouchAndBump(0.6);
  assert.equal(full.game.hups, 1);
  assert.equal(full.game.score, 1);
  assert.ok(full.d.vy < 0 && full.d.vx > 0 && !full.d.held);
  assert.ok(full.game.bumpT > 0, 'the bump pose');
  const quick = crouchAndBump(0.02, true);
  assert.equal(quick.game.hups, 0);
  assert.ok(-quick.d.vy < -full.d.vy && quick.d.vx < full.d.vx, 'a short hop');
  // the head swings back after the bump
  for (let i = 0; i < 20; i++) full.game.update(1 / 60, blank());
  assert.ok(full.game.lookT > 0);
});

test('glovedove: a dish on the glove is carried along while crouched', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const d = dropOn(game);
  let i = 0;
  while (!d.held && i++ < 200) game.update(1 / 60, blank({ action: true }));
  const x0 = d.x;
  for (let k = 0; k < 30; k++) game.update(1 / 60, blank({ action: true, x: 1 }));
  assert.ok(d.held && d.x > x0 + 150, `carried from ${x0} to ${d.x}`);
});

test('glovedove: letting go just as a dish lands bumps it at once', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const d = dropOn(game);
  // crouch a full wind-up while it falls, let go a moment before it would land
  let let_go = false;
  for (let i = 0; i < 200 && game.dishes.includes(d) && d.flicks === 0; i++) {
    const l = game.landing(d);
    const hold = !let_go && !(l && l.t < 0.05 && game.charge >= 0.45);
    if (!hold) let_go = true;
    game.update(1 / 60, blank({ action: hold }));
  }
  assert.equal(d.flicks, 1);
  assert.equal(game.hups, 1);
});

test('glovedove: a dish into the rack is put away; one on the counter smashes, with no points lost', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  game.spawnT = 99;
  game.score = 5;
  game.dishes = [{ kind: 0, x: 1400, y: 300, vx: 0, vy: 100, spin: 0, a: 0, flicks: 0 }, { kind: 1, x: 800, y: 450, vx: 0, vy: 100, spin: 0, a: 0, flicks: 0 }];
  game.x = 400;
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.equal(game.put, 1);
  assert.equal(game.smashed, 1);
  assert.equal(game.score, 8);
});

test('glovedove: a dish that drops back into the sink pops up again', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  game.dishes = [{ kind: 0, x: 200, y: 380, vx: 0, vy: 100, spin: 0, a: 0, flicks: 0 }];
  game.spawnT = 5;
  for (let i = 0; i < 30; i++) game.update(1 / 60, blank());
  assert.equal(game.dishes.length, 0);
  assert.equal(game.smashed, 0);
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.equal(game.dishes.length, 1);
});

test('glovedove: standing, a dish bounces once and then slips off', () => {
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
});
