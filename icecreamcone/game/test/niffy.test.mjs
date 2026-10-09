import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/niffy.js';
import entry from '../src/more/niffy.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A snipper: flies over the nearest thing worth snipping, leading it by the
// time the swoop takes, and swoops when it is lined up and the Keeper's back
// is turned. `aim` is how far off (pixels) its swoop may be; `careless` the
// chance it ignores the Keeper, or a balloon, on any one swoop; a `wary` one
// also doesn't start a swoop just as the Keeper is about to turn, or next
// to a balloon.
function snipper({ aim = 0, careless = 0, wary = false, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let off = 0;
  let reckless = false;
  let wait = 0;
  return (game, t) => {
    if (game.state !== 'hover') return {};
    if (t < wait) return {};
    const safe = reckless || (game.keeper.state === 'away' && (!wary || game.keeper.t > 0.5));
    const ts = game.targets().filter((o) => (reckless || o.it.kind !== 'balloon') && o.x > 60 && o.x < 1540);
    if (!ts.length) return {};
    const lead = (o) => o.x + o.vx * game.DOWN;
    ts.sort((a, b) => Math.abs(lead(a) - game.x) - Math.abs(lead(b) - game.x));
    const o = ts[0];
    const d = lead(o) + off - game.x;
    // a wary one won't swoop where a balloon string is close by
    const balloonNear = wary && game.targets().some((b) => b.it.kind === 'balloon' && Math.abs(lead(b) - game.x) < 120);
    if (Math.abs(d) < 10 && safe && !balloonNear) {
      off = (rnd() * 2 - 1) * aim;
      reckless = rnd() < careless;
      wait = t + 0.15;
      return { action: true };
    }
    return { x: Math.max(-1, Math.min(1, d / 60)) };
  };
}

// Swooping over and over, sweeping along the sky.
const masher = () => {
  let d = 1;
  return (game, t) => {
    if (game.x > 1500) d = -1;
    if (game.x < 100) d = 1;
    return { x: d, action: Math.floor(t * 60) % 6 < 3 };
  };
};

test('niffy: a beginner opens the next page, a careful snipper more; idling and mashing do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6];
  const beginner = seeds.map((seed) => run(create, { seed, bot: snipper({ aim: 55, careless: 0.15, seed }) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: snipper({ aim: 6, wary: true, seed }) }).game.score);
  const mash = [1, 2, 3].map((seed) => run(create, { seed, bot: masher() }).game.score);
  const idle = run(create, { seed: 1 }).game;
  console.log('niffy beginner', beginner, 'good', good, 'mash', mash, 'idle', idle.score, 'pass', pass);
  assert.equal(idle.score, 0);
  assert.ok(idle.done);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((x, y) => x + y) / a.length;
  assert.ok(avg(good) > avg(beginner) + 2, `good ${good}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

// A walker carrying one thing, set right under the Niffy.
function walkerUnder(game, kind) {
  game.walkers.length = 0;
  game.walkers.push({ x: game.x, vx: 0, kid: kind === 'balloon', size: 1, coat: '#000', cell: 0, phase: 0, huh: 0, items: [{ kind, snipped: false }] });
  const w = game.walkers[0];
  const [x] = game.spot(w, w.items[0]);
  w.x += game.x - x;
  return w;
}
const swoop = (game) => {
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
};

test('niffy: a swoop snips the thing right below; a price tag is worth two', () => {
  const game = create(env(2));
  game.spawnT = 99;
  const w = walkerUnder(game, 'feather');
  swoop(game);
  assert.ok(w.items[0].snipped);
  assert.equal(game.score, 1);
  walkerUnder(game, 'tag');
  swoop(game);
  assert.equal(game.score, 3);
  // nothing below: a snap at the air
  game.walkers.length = 0;
  swoop(game);
  assert.equal(game.score, 3);
});

test('niffy: snipping a balloon string costs two', () => {
  const game = create(env(3));
  game.spawnT = 99;
  game.score = 4;
  walkerUnder(game, 'balloon');
  swoop(game);
  assert.equal(game.popped, 1);
  assert.equal(game.score, 2);
});

test('niffy: swooping while the Keeper watches gets the Niffy caught', () => {
  const game = create(env(4));
  game.spawnT = 99;
  game.score = 5;
  game.keeper.state = 'watch';
  game.keeper.t = 5;
  swoop(game);
  assert.equal(game.caught, 1);
  assert.equal(game.score, 3);
  assert.notEqual(game.state, 'down');
});

test('niffy: the Keeper turns round with a warning first, and stays away for the first seconds', () => {
  const game = create(env(5));
  const seen = [];
  for (let i = 0; i < 60 * 20; i++) {
    game.update(1 / 60, blank());
    if (seen.at(-1) !== game.keeper.state) seen.push(game.keeper.state);
    if (game.elapsed < 8) assert.equal(game.keeper.state, 'away');
  }
  for (let i = 1; i < seen.length; i++) if (seen[i] === 'watch') assert.equal(seen[i - 1], 'turning');
  assert.ok(seen.includes('watch'));
});
