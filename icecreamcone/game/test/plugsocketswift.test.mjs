import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/plugsocketswift.js';
import bird from '../src/more/plugsocketswift.js';
import { run, env, blank } from './harness.mjs';

const pass = bird.pass;
const at = (game, w) => Math.hypot(w.x - game.x, w.y - game.y);

// An electrician: keeps to the lamps the fuse can carry, unplugs sleepers
// to make room, serves the window closest to giving up, and flips the fuse
// back when it blows. `skill` slows its flight, lets a fourth lamp in, and
// sometimes picks a window at random.
function electrician(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let target = null;
  let pressed = false;
  let think = 0;
  const valid = (game, tg) => (tg === 'fuse' ? game.blown : tg && (tg.state === 'ask' || tg.state === 'sleep'));
  return (game, t) => {
    if (pressed) {
      pressed = false;
      return {};
    }
    const limit = skill >= 1 ? 3 : 4;
    if (game.blown) target = 'fuse';
    else if (!valid(game, target) || (t > think && skill >= 1)) {
      think = t + (skill >= 1 ? 0 : 0.5);
      const load = game.load();
      const sleepers = game.sleepers().sort((a, b) => at(game, a) - at(game, b));
      const asking = game.asking().sort((a, b) => a.patience - a.t - (b.patience - b.t));
      if (load >= limit && sleepers.length) target = sleepers[0];
      else if (asking.length && load < limit) target = rnd() < skill ? asking[0] : asking[Math.floor(rnd() * asking.length)];
      else target = sleepers[0] || null;
    }
    if (!target) return {};
    const w = target === 'fuse' ? game.fuse : target;
    const dx = w.x - game.x;
    const dy = w.y - game.y;
    const sp = 0.5 + 0.5 * skill;
    const near = Math.hypot(dx, dy) < 35;
    if (near && (target !== 'fuse' || game.blownT > 0.7)) {
      pressed = true;
      target = null;
      return { action: true };
    }
    return { x: Math.max(-1, Math.min(1, dx / 60)) * sp, y: Math.max(-1, Math.min(1, dy / 60)) * sp };
  };
}

// Plugs in every window that asks and never unplugs anything.
function greedy() {
  let pressed = false;
  return (game) => {
    if (pressed) {
      pressed = false;
      return {};
    }
    const tg = game.blown ? game.fuse : game.asking()[0];
    if (!tg) return {};
    const dx = tg.x - game.x;
    const dy = tg.y - game.y;
    if (Math.hypot(dx, dy) < 35 && (!game.blown || game.blownT > 0.7)) {
      pressed = true;
      return { action: true };
    }
    return { x: Math.max(-1, Math.min(1, dx / 60)), y: Math.max(-1, Math.min(1, dy / 60)) };
  };
}

// Flies about at random, mashing the button.
const masher = (seed) => {
  let r = seed * 31;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let d = [0, 0];
  return (game, t) => {
    if (rnd() < 0.03) d = [rnd() * 2 - 1, rnd() * 2 - 1];
    return { x: d[0], y: d[1], action: Math.floor(t * 8) % 2 === 0 };
  };
};

test('plugsocketswift: a beginner opens the next page, a good electrician more; idle, greedy and mashing do not', () => {
  const seeds = [1, 2, 3, 4, 5];
  const beginner = seeds.map((seed) => run(create, { seed, bot: electrician(0.4, seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: electrician(1, seed) }).game.score);
  const greed = seeds.map((seed) => run(create, { seed, bot: greedy() }).game.score);
  const mash = seeds.map((seed) => run(create, { seed, bot: masher(seed) }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('plugsocketswift beginner', beginner, 'good', good, 'greedy', greed, 'mash', mash, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(Math.min(...good) > Math.max(...beginner) - 2, `good ${good}`);
  assert.ok(Math.max(...greed) < pass, `greedy must not open the next page: ${greed}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

// Puts the Swift on a room and presses the action once.
function pressAt(game, tg) {
  const w = tg === 'fuse' ? game.fuse : tg;
  game.x = w.x;
  game.y = w.y;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  game.x = w.x;
  game.y = w.y;
  game.update(1 / 60, blank({ actionReleased: true }));
}

test('plugsocketswift: a lamp plugged in at an asking window scores when its reader falls asleep, and unplugs', () => {
  const game = create(env(1));
  const r = game.rooms[5];
  r.state = 'ask';
  r.t = 0;
  r.patience = 99;
  r.readT = 1;
  pressAt(game, r);
  assert.equal(r.state, 'lit');
  for (let i = 0; i < 70; i++) {
    game.x = r.x;
    game.y = r.y;
    game.update(1 / 60, blank());
  }
  assert.equal(r.state, 'sleep');
  assert.equal(game.score, 1);
  assert.equal(game.load(), 1);
  pressAt(game, r);
  assert.equal(r.state, 'dark');
  assert.equal(game.load(), 0);
});

test('plugsocketswift: too many lamps blow the fuse; nothing plugs in until it is flipped back', () => {
  const game = create(env(1));
  game.spawnT = 99;
  for (const r of game.rooms.slice(0, 5)) {
    r.state = 'sleep';
    r.t = 0;
  }
  for (let i = 0; i < 60 * 5 && !game.blown; i++) game.update(1 / 60, blank());
  assert.ok(game.blown, 'fuse blew');
  assert.equal(game.fuses, 1);
  assert.equal(game.load(), 0);
  const r = game.rooms[8];
  r.state = 'ask';
  r.t = 0;
  r.patience = 99;
  pressAt(game, r);
  assert.equal(r.state, 'ask', 'no power while blown');
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  pressAt(game, 'fuse');
  assert.equal(game.blown, false);
  pressAt(game, r);
  assert.equal(r.state, 'lit');
});

test('plugsocketswift: three lamps are safe', () => {
  const game = create(env(1));
  game.spawnT = 99;
  for (const r of game.rooms.slice(0, 3)) {
    r.state = 'sleep';
    r.t = 0;
  }
  for (let i = 0; i < 60 * 20; i++) game.update(1 / 60, blank());
  assert.equal(game.blown, false);
  assert.equal(game.heat, 0);
});

test('plugsocketswift: a window left asking gives up', () => {
  const game = create(env(1));
  game.spawnT = 99;
  const r = game.rooms[0];
  r.state = 'ask';
  r.t = 0;
  r.patience = 1;
  for (let i = 0; i < 70; i++) game.update(1 / 60, blank());
  assert.equal(r.state, 'dark');
  assert.equal(game.gaveUp, 1);
});
