import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/crow.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const medals = BIRDS.find((b) => b.id === 'crow').medals;

// A signaller: gives the cars a few seconds of green, then lets the birds go
// once a couple are waiting (or one is getting cross); goes back to green
// only when the crossing is empty and the cars have waited longer.
function signaller(minGreen = 3.5, urgent = 0.6) {
  let press = false;
  return (game) => {
    if (press) {
      press = false;
      return { action: false };
    }
    const birds = game.waitingBirds();
    const cars = game.waitingCars();
    const bw = birds.reduce((m, b) => Math.max(m, b.wait / b.patience), 0);
    const cw = cars.reduce((m, c) => Math.max(m, c.wait / c.patience), 0);
    let want = false;
    if (game.light === 'green') want = birds.length > 0 && ((game.phase > minGreen && birds.length >= 2) || bw > urgent);
    else if (game.light === 'red') want = game.onCrossing() === 0 && cars.length > 0 && game.phase > 1 && (birds.length === 0 || cw > bw);
    press = want;
    return { action: want };
  };
}

// Someone who switches blindly every few seconds, never looking.
const blind = (every) => (game, t) => ({ action: t % every < 0.05 });

test('crow: a signaller earns well; blind switching less; idle nothing', () => {
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: signaller() }).game.score);
  const lazy = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: blind(5) }).game.score);
  const idle = [1, 2].map((seed) => run(create, { seed }).game.score);
  console.log('crow signaller', good, 'blind', lazy, 'idle', idle, 'medals', medals);
  assert.ok(Math.max(...idle) < medals[0], `idle ${idle}`);
  assert.ok(Math.min(...good) >= medals[0], `signaller ${good}`);
  assert.ok(Math.max(...good) >= medals[1], `signaller ${good}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(lazy), 'watching the road beats switching blindly');
});

test('crow: green to red goes through amber', () => {
  const game = create(env(1));
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.light, 'amber');
  for (let i = 0; i < 70; i++) game.update(1 / 60, blank());
  assert.equal(game.light, 'red');
});

test('crow: switching to green with birds on the crossing is a near miss', () => {
  const game = create(env(1));
  game.score = 10;
  game.light = 'red';
  game.birds.push({ side: 0, x: 780, y: 600, tx: 780, ty: 760, state: 'cross', wait: 0, patience: 9, color: '#fff', face: 1, hop: 0, size: 1, fly: 0 });
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.light, 'green');
  assert.equal(game.nearMisses, 1);
  assert.equal(game.score, 7);
  assert.equal(game.onCrossing(), 0, 'the birds fly off');
});

test('crow: cars stop at the line on red and cross on green', () => {
  const game = create(env(3));
  game.update(1 / 60, blank({ action: true, actionPressed: true })); // to amber, then red
  for (let i = 0; i < 60 * 8; i++) game.update(1 / 60, blank());
  assert.equal(game.light, 'red');
  assert.ok(game.waitingCars().length > 0, 'cars queue on red');
  assert.equal(game.carInZone(), false, 'no car on the crossing on red');
  const before = game.carsAcross;
  game.birds = []; // nobody crossing
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 60 * 3; i++) game.update(1 / 60, blank());
  assert.ok(game.carsAcross > before, 'cars cross on green');
});
