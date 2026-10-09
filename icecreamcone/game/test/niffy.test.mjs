import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/niffy.js';
import entry from '../src/more/niffy.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A snipper: flies over the nearest thing worth snipping, leading it by the
// time the swoop takes from its height, and swoops when it is lined up and
// the Keeper's back is turned. `aim` is how far off (pixels) it lines up;
// `careless` the chance it ignores the Keeper, or a balloon, on any one
// swoop. Others keep the height they start at and fly about freely.
// A `wary` one plays the Keeper: it cruises low (quick snips), keeps still
// while he turns or looks, darts when his back is turned (but doesn't start
// a swoop just as he is about to turn, or next to a balloon), and after a
// miss climbs up out of the way so people relax sooner.
function snipper({ aim = 0, careless = 0, wary = false, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let off = 0;
  let reckless = false;
  let wait = 0;
  return (game, t) => {
    const k = game.keeper;
    const away = k.state === 'away' && k.t > 0.6;
    let y = 0;
    if (wary) {
      if (!away) {
        // keep still under his eye; but if something walks into the ring
        // and he has hardly noticed it yet, one quick low swoop
        if (game.state !== 'hover' || t < wait) return {};
        const o = game.aim();
        if (o && o.it.kind !== 'balloon' && game.notice < 0.25 && game.cruise > game.LOW - 20) {
          wait = t + 0.15;
          return { action: true };
        }
        return {};
      }
      const holding = game.walkers.some((w) => w.wary > 0 && Math.abs(w.x - game.x) < 260);
      y = holding ? -1 : 1;
      if (holding) return { y };
    }
    if (game.state !== 'hover') return { y };
    if (t < wait) return { y };
    const safe = reckless || (k.state === 'away' && (!wary || k.t > 0.6));
    const ts = game.targets().filter((o) => (reckless || o.it.kind !== 'balloon') && o.x > 60 && o.x < 1540);
    if (!ts.length) return { y };
    const lead = (o) => o.x + o.vx * game.downTime(o.y - game.y);
    ts.sort((a, b) => Math.abs(lead(a) - game.x) - Math.abs(lead(b) - game.x));
    const o = ts[0];
    const d = lead(o) + off - game.x;
    // a wary one won't swoop where a balloon string is close by
    const balloonNear = wary && game.targets().some((b) => b.it.kind === 'balloon' && Math.abs(lead(b) - game.x) < 120);
    if (Math.abs(d) < 10 && safe && !balloonNear) {
      off = (rnd() * 2 - 1) * aim;
      reckless = rnd() < careless;
      wait = t + 0.15;
      return { action: true, y };
    }
    return { x: Math.max(-1, Math.min(1, d / 60)), y };
  };
}

// Swooping over and over, sweeping along the sky (at the starting height, or
// down low).
const masher = (low = false) => {
  let d = 1;
  return (game, t) => {
    if (game.x > 1500) d = -1;
    if (game.x < 100) d = 1;
    return { x: d, y: low ? 1 : 0, action: Math.floor(t * 60) % 6 < 3 };
  };
};

test('niffy: a beginner opens the next page, a careful snipper more; idling and mashing do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6];
  const beginner = seeds.map((seed) => run(create, { seed, bot: snipper({ aim: 55, careless: 0.15, seed }) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: snipper({ aim: 6, wary: true, seed }) }).game.score);
  const mash = [1, 2, 3].map((seed) => run(create, { seed, bot: masher() }).game.score);
  const mashLow = [1, 2, 3].map((seed) => run(create, { seed, bot: masher(true) }).game.score);
  // swooping over and over from one spot, as people walk under it
  const camp = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => run(create, { seed, bot: (g, t) => ({ y: seed % 2 ? 1 : 0, action: Math.floor(t * 60) % 6 < 3 }) }).game.score);
  const idle = run(create, { seed: 1 }).game;
  console.log('niffy beginner', beginner, 'good', good, 'mash', mash, 'mashLow', mashLow, 'camp', camp, 'idle', idle.score, 'pass', pass);
  assert.equal(idle.score, 0);
  assert.ok(idle.done);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((x, y) => x + y) / a.length;
  assert.ok(avg(good) > avg(beginner) + 2, `good ${good}`);
  assert.ok(Math.max(...mash, ...mashLow, ...camp) < pass, `mashing must not open the next page: ${mash}`);
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

test('niffy: a snap at the air makes the people nearby hold on to their things', () => {
  const game = create(env(6));
  game.spawnT = 99;
  const w = walkerUnder(game, 'flower');
  game.cruise = game.y = game.LOW; // low down, where people stay wary the full time
  w.x += 130; // out of the swoop's reach
  assert.equal(game.aim(), null);
  swoop(game);
  assert.ok(w.wary > 0);
  assert.equal(game.targets().length, 0);
  w.x -= 130;
  swoop(game);
  assert.equal(game.score, 0); // still holding on
  assert.ok(game.pops.some((p) => /holding on/.test(p.text)));
  for (let i = 0; i < 60 * 3; i++) game.update(1 / 60, blank());
  w.x = game.x;
  const [x] = game.spot(w, w.items[0]);
  w.x += game.x - x;
  swoop(game);
  assert.equal(game.score, 1);
});

test('niffy: snipping a balloon string costs one', () => {
  const game = create(env(3));
  game.spawnT = 99;
  game.score = 4;
  walkerUnder(game, 'balloon');
  swoop(game);
  assert.equal(game.popped, 1);
  assert.equal(game.score, 3);
});

test('niffy: a swoop the ring shows on a thing snips it, homing onto it as it walks', () => {
  for (const seed of [1, 2, 3]) {
    const game = create(env(seed));
    game.spawnT = 99;
    const w = walkerUnder(game, 'flower');
    w.vx = -160; // walking briskly left
    w.x += 70; // off to one side, but within the aim
    const o = game.aim();
    assert.ok(o && o.it === w.items[0], 'the ring shows it');
    swoop(game);
    assert.ok(w.items[0].snipped, `seed ${seed}`);
    assert.equal(game.score, 1);
  }
});

test('niffy: the stick sets the cruising height, and a low swoop is quicker', () => {
  const game = create(env(2));
  game.spawnT = 99;
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank({ y: -1 }));
  assert.equal(game.cruise, game.HIGH);
  const high = game.downTime(560 - game.HIGH);
  for (let i = 0; i < 90; i++) game.update(1 / 60, blank({ y: 1 }));
  assert.equal(game.cruise, game.LOW);
  const low = game.downTime(560 - game.LOW);
  assert.ok(low < high * 0.5, `${low} vs ${high}`);
  assert.ok(game.downTime(1) >= 0.14);
});

// Holds the Niffy at a height while the Keeper watches, keeping still,
// flying to and fro, or swooping; returns the noticing after 1 s.
function watched(cruise, how = 'still') {
  const game = create(env(4));
  game.spawnT = 99;
  game.walkers.length = 0;
  game.cruise = cruise;
  game.y = cruise;
  game.keeper.state = 'watch';
  game.keeper.t = 99;
  for (let i = 0; i < 60; i++) {
    const sw = how === 'swoop' && i % 40 === 0;
    game.update(1 / 60, blank({ x: how === 'move' ? (i % 60 < 30 ? 1 : -1) : 0, action: sw, actionPressed: sw }));
  }
  return game.caught ? 1 : game.notice;
}

test('niffy: the Keeper notices only movement: still is safe anywhere, moving high hardly, moving low fast, swooping fast', () => {
  const r = { stillHigh: watched(150), stillLow: watched(385), moveHigh: watched(150, 'move'), moveLow: watched(385, 'move'), swoopLow: watched(385, 'swoop'), swoopHigh: watched(150, 'swoop') };
  console.log('niffy noticing after 1 s', r);
  assert.equal(r.stillHigh, 0);
  assert.equal(r.stillLow, 0);
  assert.ok(r.moveHigh < 0.05, `moving high ${r.moveHigh}`);
  assert.ok(r.moveLow > 0.8, `moving low ${r.moveLow}`);
  assert.ok(r.swoopLow > 0.5 && r.swoopHigh > 0.8, `swooping ${r.swoopLow} ${r.swoopHigh}`);
});

test('niffy: people holding on relax three times as fast while the Niffy is up high', () => {
  const relax = (cruise) => {
    const game = create(env(5));
    game.spawnT = 99;
    game.cruise = game.y = cruise;
    const w = walkerUnder(game, 'flower');
    w.wary = 1.8;
    let t = 0;
    while (w.wary > 0 && t < 5) {
      game.update(1 / 60, blank());
      t += 1 / 60;
    }
    return t;
  };
  const high = relax(150);
  const low = relax(385);
  assert.ok(Math.abs(high - 0.6) < 0.05 && Math.abs(low - 1.8) < 0.05, `high ${high} low ${low}`);
});

test('niffy: being caught dazes the Niffy but costs no points, and the meter drains when he looks away', () => {
  const game = create(env(4));
  game.spawnT = 99;
  game.score = 5;
  game.keeper.state = 'watch';
  game.keeper.t = 5;
  game.notice = 0.95;
  swoop(game);
  assert.equal(game.caught, 1);
  assert.equal(game.score, 5);
  assert.equal(game.state, 'dazed');
  game.keeper.state = 'away';
  game.keeper.t = 9;
  for (let i = 0; i < 60 * 2; i++) game.update(1 / 60, blank());
  assert.ok(game.notice < 0.1, `notice ${game.notice}`);
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
