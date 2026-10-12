import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/crow.js';
import { BIRDS } from '../src/birds.js';
import { run, env, blank } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'crow').pass;

// A signaller: gives the cars a few seconds of green, then lets the birds go
// once a couple are waiting (or one is getting cross); goes back to green
// only when the crossing is empty and the cars have waited longer.
// `slow` is how long it takes to act once switching is wanted (a beginner).
function signaller(minGreen = 3.5, urgent = 0.6, slow = 0) {
  let press = false;
  let since = -1;
  return (game, t) => {
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
    // a beginner notices late: the wish has to last `slow` seconds first
    if (!want) since = -1;
    else if (since < 0) since = t;
    if (want && t - since < slow) want = false;
    if (want) since = -1;
    press = want;
    return { action: want };
  };
}

// Someone who switches blindly every few seconds, never looking.
const blind = (every) => (game, t) => ({ action: t % every < 0.05 });

test('crow: a signaller earns well, a beginner passes; blind switching less; mashing and idle fail', () => {
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: signaller() }).game.score);
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: signaller(5, 0.8, 0.6) }).game.score);
  const lazy = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: blind(5) }).game.score);
  const mash = [1, 2].map((seed) => run(create, { seed, bot: (g, t) => ({ action: t % 0.4 < 0.2 }) }).game.score);
  const idle = [1, 2].map((seed) => run(create, { seed }).game.score);
  console.log('crow signaller', good, 'beginner', beginner, 'blind', lazy, 'mash', mash, 'idle', idle, 'pass', pass);
  assert.ok(Math.max(...idle) < pass, `idle ${idle}`);
  assert.ok(Math.max(...mash) < pass, `mash ${mash}`);
  assert.ok(beginner.filter((s) => s >= pass).length >= 2, `beginner ${beginner}`);
  assert.ok(Math.min(...good) >= pass, `signaller ${good}`);
  assert.ok(Math.max(...good) >= pass * 1.5, `signaller ${good}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(lazy), 'watching the road beats switching blindly');
});

// The round starts gentle and gets busier: cars and flocks come further
// apart, cars drive slower and everyone waits longer at the start than at the
// end, read from the game's own knobs as it plays.
test('crow: the round starts gentle and ends busier', () => {
  const game = create(env(1));
  const look = () => ({ car: game.carGap(), bird: game.birdGap(), speed: game.carSpeed(), patience: game.patienceNow() });
  const start = look();
  const step = (s) => { for (let i = 0; i < s * 60; i++) game.update(1 / 60, blank()); };
  step(15);
  const third = look();
  step(29);
  const end = look();
  console.log('crow ramp', { start, third, end });
  for (const [a, b] of [[start, third], [third, end]]) {
    assert.ok(a.car > b.car && a.bird > b.bird, 'arrivals come faster');
    assert.ok(a.speed < b.speed, 'cars drive faster');
    assert.ok(a.patience > b.patience, 'patience runs shorter');
  }
  assert.ok(start.car > end.car * 2.5 && start.bird > end.bird * 2, 'the end is much busier than the start');
  assert.ok(third.car > (start.car + end.car) / 2, 'the first third stays on the gentle side');
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

// A chick is one size whatever it does: standing (each of the three standing
// chicks), walking (both steps) and flying off, measured against how big each
// picture is painted (design/source/pose-scales.json).
test('crow: every painted chick is drawn the same size', async () => {
  const { withArt, shownSizes, sizeCheck } = await import('./sprite-rig.mjs');
  const undo = withArt();
  try {
    const game = create(env(1));
    const chick = (o) => (gm) => {
      gm.cars = [];
      gm.birds = [{ side: 0, x: 600, y: 620, tx: 600, ty: 760, sx: 0, state: 'wait', wait: 0, patience: 9, color: '#fff', face: -1, hop: 0, size: 1, fly: 0, ...o }];
    };
    const sizes = shownSizes(game, 'crow', {
      standing: chick({ sx: 0 }),
      standing2: chick({ sx: 1 }),
      standing3: chick({ sx: 2 }),
      stepping: chick({ state: 'cross', hop: 1 }),
      stepping2: chick({ state: 'cross', hop: -1 }),
      flying: chick({ state: 'leave' }),
    }, ['sprites.chicks']);
    const { fails, table } = sizeCheck(sizes, 'standing');
    console.log('crow chick sizes', table);
    assert.equal(Object.keys(table).length, 6, 'each pose drew one picture');
    assert.deepEqual(fails, []);
  } finally {
    undo();
  }
});
