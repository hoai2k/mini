import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/saltshakershrike.js';
import bird from '../src/more/saltshakershrike.js';
import { run, env, blank } from './harness.mjs';

const pass = bird.pass;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// A cook: takes the plates nearest the diner first, shakes ahead of each by
// how far it slides while the salt falls, and counts the pinches it sends.
// `skill` slows it, leads too little, aims looser and now and then loses
// count (one pinch too many).
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
    const lead = game.speed() * game.fallT * (skill >= 1 ? 1 : 0.7);
    const p = game.plates
      .filter((p) => !p.dessert && p.n > (sent.get(p.id) || 0) && p.x - lead > 340)
      .sort((a, b) => a.x - b.x)[0];
    if (!p) return {};
    const dx = p.x - lead - game.x;
    if (Math.abs(dx) < (skill >= 1 ? 12 : 26) && game.cool <= 0) {
      pressed = true;
      let n = (sent.get(p.id) || 0) + 1;
      if (skill < 1 && rnd() < 0.12) n--; // lost count
      sent.set(p.id, n);
      return { action: true };
    }
    const follow = skill >= 1 ? -game.speed() / 950 : 0; // keeps pace with the plate
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
  const p = game.plates.find((p) => !p.dessert && p.x > 400);
  if (!p) return {};
  const dx = p.x - game.speed() * game.fallT - game.x;
  return { x: clamp(dx / 50, -1, 1), action: Math.floor(t * 8) % 2 === 0 };
};

test('saltshakershrike: a beginner opens the next page, a good cook more; idle, mashing and over-salting do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const beginner = seeds.map((seed) => run(create, { seed, bot: cook(0.4, seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: cook(1, seed) }).game.score);
  const mash = seeds.map((seed) => run(create, { seed, bot: masher(seed, false) }).game.score);
  const still = seeds.map((seed) => run(create, { seed, bot: masher(seed, true) }).game.score);
  const salt = seeds.map((seed) => run(create, { seed, bot: salter() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('saltshakershrike beginner', `${beginner}`, 'good', `${good}`, 'mash', `${mash}`, 'still', `${still}`, 'salter', `${salt}`, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(mean(good) > mean(beginner) + 5, `good ${good}`);
  for (const [name, s] of [['mashing', mash], ['shaking on the spot', still], ['over-salting', salt]]) assert.ok(Math.max(...s) < pass, `${name} must not open the next page: ${s}`);
});

// A plate with its order, alone on the counter under the Shrike.
function onePlate(n, dessert = false) {
  const game = create(env(1));
  game.spawnT = 99;
  game.update(1 / 60, blank());
  game.plates = [{ id: 99, x: 900, n, got: 0, kind: dessert ? 6 : 0, dessert, who: 0, wob: 0 }];
  return game;
}
// Shakes `k` pinches straight down, with the plate held still, and lets them land.
function shake(game, k) {
  const p = game.plates[0];
  game.x = p.x;
  for (let i = 0; i < k; i++) {
    game.update(1 / 60, blank({ action: true, actionPressed: true }));
    for (let j = 0; j < 15; j++) game.update(1 / 60, blank());
  }
  for (let j = 0; j < 60; j++) game.update(1 / 60, blank());
}
// Slides the plate to the diner.
function serve(game) {
  for (let i = 0; i < 60 * 10 && game.plates.length; i++) game.update(1 / 60, blank());
}

test('saltshakershrike: just right scores three, one out scores one, more is a frown', () => {
  for (const [n, k, pts] of [[3, 3, 3], [3, 2, 1], [3, 4, 1], [3, 5, 0], [2, 0, 0]]) {
    const game = onePlate(n);
    const speed = game.speed;
    game.speed = () => 0; // hold the plate still while salting
    shake(game, k);
    assert.equal(game.plates[0].got, k, `pinches landed for ${n}/${k}`);
    game.speed = speed;
    serve(game);
    assert.equal(game.score, pts, `order ${n}, shook ${k}`);
  }
});

test('saltshakershrike: salt that misses the plate lands on the counter', () => {
  const game = onePlate(2);
  game.speed = () => 0;
  game.x = 600;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let j = 0; j < 60; j++) game.update(1 / 60, blank());
  assert.equal(game.plates[0].got, 0);
  assert.equal(game.spilt, 1);
});

test('saltshakershrike: a pudding wants no salt', () => {
  const plain = onePlate(0, true);
  serve(plain);
  assert.equal(plain.score, 0);
  assert.equal(plain.frowns, 0);
  const salted = onePlate(0, true);
  salted.score = 5;
  salted.speed = () => 0;
  shake(salted, 1);
  delete salted.speed;
  salted.speed = () => 200;
  serve(salted);
  assert.equal(salted.score, 3);
  assert.equal(salted.frowns, 1);
});
