import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/saltshakershrike.js';
import bird from '../src/more/saltshakershrike.js';
import { run, env, blank } from './harness.mjs';

const pass = bird.pass;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Where a pinch shaken now would have to fall to land on plate p: its x
// when the salt reaches its food.
function landing(game, p, extra = 0) {
  const q = { a: p.a + game.omega() * extra };
  let T = game.fall(game.at(q).food);
  for (let i = 0; i < 3; i++) T = game.fall(game.at(q, T).food);
  return { x: game.at(q, T).x, a: q.a + game.omega() * T };
}

// A cook: takes the plates nearest the diner first, shakes where each will
// be when the salt lands, and counts the pinches it sends. `skill` slows it,
// leads too little, aims looser and now and then loses count (one pinch too
// many).
function cook(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const sent = new Map();
  let pressed = false;
  return (game) => {
    if (pressed) {
      pressed = false;
      return {};
    }
    const p = game.plates
      .filter((p) => !p.dessert && p.n > (sent.get(p.id) || 0) && landing(game, p).a < Math.PI - 0.12)
      .sort((a, b) => b.a - a.a)[0];
    if (!p) return {};
    const full = landing(game, p).x;
    const aim = skill >= 1 ? full : p.x + (full - p.x) * 0.7;
    const dx = aim - game.x;
    if (Math.abs(dx) < (skill >= 1 ? 12 : 26) && game.cool <= 0) {
      pressed = true;
      let n = (sent.get(p.id) || 0) + 1;
      if (skill < 1 && rnd() < 0.12) n--; // lost count
      sent.set(p.id, n);
      return { action: true };
    }
    // a good cook keeps pace with where the plate is going
    const follow = skill >= 1 ? (landing(game, p, 0.05).x - full) / 0.05 / 950 : 0;
    return { x: clamp(follow + dx / 50, -1, 1) * (0.55 + 0.45 * skill) };
  };
}

// Mashing: shake as fast as possible, from one spot or wandering about.
const masher = (seed, still) => {
  let r = seed * 31;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let d = 0;
  return (game, t) => {
    if (rnd() < 0.02) d = rnd() * 2 - 1;
    return { x: still ? 0 : d, action: Math.floor(t * 8) % 2 === 0 };
  };
};

// Follows the plate nearest the diner and shakes all the way.
const salter = () => (game, t) => {
  const p = game.plates.filter((p) => !p.dessert && p.a < Math.PI - 0.3).sort((a, b) => b.a - a.a)[0];
  if (!p) return {};
  const dx = landing(game, p).x - game.x;
  return { x: clamp(dx / 50, -1, 1), action: Math.floor(t * 8) % 2 === 0 };
};

test('saltshakershrike: a beginner opens the next page, a good cook more; idle, mashing and over-salting do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const beginner = seeds.map((seed) => run(create, { seed, bot: cook(0.4, seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: cook(1, seed) }).game.score);
  const mash = seeds.map((seed) => run(create, { seed, bot: masher(seed, false) }).game.score);
  const still = seeds.map((seed) => run(create, { seed, bot: masher(seed, true) }).game.score);
  const salt = seeds.map((seed) => run(create, { seed, bot: salter() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('saltshakershrike beginner', `${beginner}`, 'good', `${good}`, 'mash', `${mash}`, 'still', `${still}`, 'salter', `${salt}`, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(beginner.filter((s) => s >= pass).length >= seeds.length * 0.75, `beginner ${beginner}`);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(mean(good) > mean(beginner) + 5, `good ${good}`);
  for (const [name, s] of [['mashing', mash], ['shaking on the spot', still], ['over-salting', salt]]) assert.ok(Math.max(...s) < pass, `${name} must not open the next page: ${s}`);
});

// A plate with its order, alone on the table under the Shrike, the table stopped.
function onePlate(n, dessert = false) {
  const game = create(env(1));
  game.spawnT = 99;
  game.update(1 / 60, blank());
  const a = Math.PI / 2;
  game.plates = [{ id: 99, a, x: game.at({ a }).x, y: game.at({ a }).y, n, got: 0, kind: dessert ? 6 : 0, dessert, who: 0, wob: 0, set: 0 }];
  game.omega = () => 0;
  return game;
}
// Shakes `k` pinches straight down onto the plate and lets them land.
function shake(game, k) {
  const p = game.plates[0];
  game.x = p.x;
  for (let i = 0; i < k; i++) {
    game.update(1 / 60, blank({ action: true, actionPressed: true }));
    for (let j = 0; j < 15; j++) game.update(1 / 60, blank());
  }
  for (let j = 0; j < 60; j++) game.update(1 / 60, blank());
}
// Turns the table until the diner has the plate.
function serve(game) {
  game.omega = () => 0.5;
  for (let i = 0; i < 60 * 10 && game.plates.length; i++) game.update(1 / 60, blank());
}

test('saltshakershrike: just right scores three, one out scores one, more is a frown, none is nothing', () => {
  for (const [n, k, pts] of [[3, 3, 3], [3, 2, 1], [3, 4, 1], [3, 5, 0], [2, 0, 0], [1, 0, 0]]) {
    const game = onePlate(n);
    shake(game, k);
    assert.equal(game.plates[0].got, k, `pinches landed for ${n}/${k}`);
    serve(game);
    assert.equal(game.score, pts, `order ${n}, shook ${k}`);
  }
});

test('saltshakershrike: salt that misses the plate lands on the table', () => {
  const game = onePlate(2);
  game.x = 500;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let j = 0; j < 60; j++) game.update(1 / 60, blank());
  assert.equal(game.plates[0].got, 0);
  assert.equal(game.spilt, 1);
});

test('saltshakershrike: a pudding wants no salt; salting one costs one', () => {
  const plain = onePlate(0, true);
  serve(plain);
  assert.equal(plain.score, 0);
  assert.equal(plain.frowns, 0);
  const salted = onePlate(0, true);
  salted.score = 5;
  shake(salted, 1);
  serve(salted);
  assert.equal(salted.score, 4);
  assert.equal(salted.frowns, 1);
});

test('saltshakershrike: plates creep at the ends of the table and swing fast across the middle', () => {
  const game = create(env(1));
  const w = game.omega();
  const vx = (a) => Math.abs(game.at({ a: a + 0.01 }).x - game.at({ a }).x) / (0.01 / w);
  assert.ok(vx(Math.PI / 2) > 4 * vx(0.1), `middle ${vx(Math.PI / 2)} vs end ${vx(0.1)}`);
});

test('saltshakershrike: the lunch rush builds: mostly one pinch in the first half, more and faster in the second', () => {
  const early = [];
  const late = [];
  const gaps = { early: [], late: [] };
  const turn = { early: [], late: [] };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const game = create(env(seed));
    const seen = new Set();
    let lastSpawn = null;
    while (!game.done) {
      game.update(1 / 60, blank());
      const half = game.elapsed < 22.5 ? 'early' : 'late';
      turn[half].push(game.omega());
      for (const p of game.plates) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        if (lastSpawn !== null) gaps[half].push(game.elapsed - lastSpawn);
        lastSpawn = game.elapsed;
        if (!p.dessert) (half === 'early' ? early : late).push(p.n);
      }
    }
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(Math.max(...early) <= 2, `first half wants at most two pinches: ${early}`);
  assert.ok(early.filter((n) => n === 1).length > early.length / 2, `first half mostly one pinch: ${early}`);
  assert.ok(Math.max(...late) >= 4 && mean(late) > mean(early) + 1, `second half wants more: ${mean(early)} vs ${mean(late)}`);
  assert.ok(mean(turn.late) > mean(turn.early) * 1.4, `the table turns faster: ${mean(turn.early)} vs ${mean(turn.late)}`);
  assert.ok(mean(gaps.late) < mean(gaps.early) * 0.75, `plates come closer together: ${mean(gaps.early)} vs ${mean(gaps.late)}`);
});
