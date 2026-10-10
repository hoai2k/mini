import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/drippet.js';
import entry from '../src/more/drippet.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A runner: heads for the thirsty thing that is nearest, and hops when an old
// puddle lies just ahead. `skill` slows the stick, makes it look less far
// ahead and sometimes forget to hop.
function runner(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let target = null;
  let dither = 0;
  return (game) => {
    const open = game.things.filter((t) => !t.over);
    if (!target || target.over || !open.includes(target)) {
      open.sort((a, b) => Math.hypot(a.x - game.x, a.y - game.y) - Math.hypot(b.x - game.x, b.y - game.y));
      target = open[0] || null;
      dither = (1 - skill) * 0.6 * rnd();
    }
    if (!target) return {};
    if (dither > 0) {
      dither -= 1 / 60;
      return {};
    }
    const dx = target.x - game.x;
    const dy = target.y - game.y;
    const d = Math.hypot(dx, dy);
    if (d < 30) return {};
    const s = 0.75 + 0.25 * skill;
    // Look ahead for old puddles: steer round them where it can, hop where
    // it can't. A beginner looks less far and tries fewer ways round.
    const look = 60 + 110 * skill;
    const base = Math.atan2(dy, dx);
    const turns = skill > 0.6 ? [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1] : [0, 0.5, -0.5, 1, -1];
    const clear = (a) => {
      for (let k = 30; k <= Math.min(look, d); k += 15) if (game.puddleAt(game.x + Math.cos(a) * k, game.y + Math.sin(a) * k * 0.8)) return false;
      return true;
    };
    let ang = null;
    for (const tw of turns) if (clear(base + tw)) { ang = base + tw; break; }
    let hop = false;
    if (ang === null) {
      ang = base;
      hop = rnd() < 0.4 + 0.6 * skill;
    }
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    return { x: ux * s, y: uy * s, action: hop };
  };
}

// Hops all the way to each thing, never looking at the floor, and stops
// hopping only once it is there.
const bunny = () => {
  let n = 0;
  return (game) => {
    const t = game.things.find((t) => !t.over);
    if (!t) return {};
    const dx = t.x - game.x;
    const dy = t.y - game.y;
    const d = Math.hypot(dx, dy);
    if (d < 30) return {};
    return { x: dx / d, y: dy / d, action: n++ % 2 === 0 };
  };
};

// Runs straight at each thing, never looking at the floor or hopping.
const straight = () => (game) => {
  const t = game.things.find((t) => !t.over);
  if (!t) return {};
  const dx = t.x - game.x;
  const dy = t.y - game.y;
  const d = Math.hypot(dx, dy);
  return d < 30 ? {} : { x: dx / d, y: dy / d };
};

// Runs in circles around the kitchen, never aiming.
const circler = () => (game, t) => ({ x: Math.cos(t * 1.5), y: Math.sin(t * 1.5) });

test('drippet: a beginner reaches the score, a good runner more; idle and circling do not; careful runners beat constant hopping', () => {
  const beginner = [1, 2, 3, 4, 5, 6].map((seed) => run(create, { seed, bot: runner(0.35, seed) }).game.score);
  const good = [1, 2, 3, 4, 5, 6].map((seed) => run(create, { seed, bot: runner(1, seed) }).game.score);
  const hops = [1, 2, 3, 4, 5, 6].map((seed) => run(create, { seed, bot: bunny() }).game.score);
  const blind = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: straight() }).game.score);
  const circles = [1, 2].map((seed) => run(create, { seed, bot: circler() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('drippet beginner', beginner, 'good', good, 'bunny', hops, 'never looking', blind, 'circles', circles, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(beginner), `good ${good}`);
  assert.ok(Math.max(...circles) < pass, `circles ${circles}`);
  assert.ok(avg(hops) < avg(good), `bunny ${hops}`);
  assert.ok(avg(blind) < avg(good), `never looking ${blind}`);
});

test('drippet: a fresh drip is harmless, an old puddle makes the Drippet skid', () => {
  const game = create(env(1));
  game.puddles.push({ x: game.x - 100, y: game.y, r: 40, max: 40, age: 0.2, life: 9, seed: 1, shape: 0 });
  for (let i = 0; i < 20; i++) game.update(1 / 60, blank({ x: -1 }));
  assert.equal(game.slips, 0, 'fresh puddle is not slippery');
  const g2 = create(env(1));
  g2.puddles.push({ x: g2.x - 100, y: g2.y, r: 40, max: 40, age: 3, life: 9, seed: 1, shape: 0 });
  for (let i = 0; i < 20; i++) g2.update(1 / 60, blank({ x: -1 }));
  assert.equal(g2.slips, 1, 'old puddle skids');
  assert.ok(g2.slip > 0);
  // While skidding the stick does nothing.
  const vx = g2.vx;
  g2.update(1 / 60, blank({ x: 1 }));
  assert.ok(Math.sign(g2.vx) === Math.sign(vx));
});

test('drippet: a hop clears an old puddle', () => {
  const game = create(env(1));
  game.puddles.push({ x: game.x - 90, y: game.y, r: 34, max: 34, age: 3, life: 9, seed: 1, shape: 0 });
  game.update(1 / 60, blank({ x: -1, action: true, actionPressed: true }));
  for (let i = 0; i < 25; i++) game.update(1 / 60, blank({ x: -1, action: true }));
  assert.equal(game.slips, 0);
  assert.ok(game.x < 800 - 125, `went over it (${game.x})`);
});

test('drippet: standing over a thirsty thing fills it and scores', () => {
  const game = create(env(2));
  game.update(1 / 60, blank());
  const t = game.things[0];
  game.x = t.x;
  game.y = t.y;
  game.puddles = [];
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.equal(game.score, 1);
  assert.ok(t.over);
});

test('drippet: a thirsty thing left too long gives up', () => {
  const game = create(env(3));
  for (let i = 0; i < 60 * 13; i++) game.update(1 / 60, blank());
  assert.ok(game.missed >= 1);
  assert.equal(game.score, 0);
});

test('drippet: landing in any puddle, even a fresh one, skids; and a hop needs a rest before the next', () => {
  const game = create(env(1));
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  const land = () => ({ x: game.x, y: game.y });
  for (let i = 0; i < 40 && game.hop > 0; i++) {
    const p = land();
    game.puddles = [{ x: p.x, y: p.y, r: 40, max: 40, age: 0, life: 9, seed: 1, shape: 0 }];
    game.update(1 / 60, blank());
  }
  assert.equal(game.slips, 1);
  const g2 = create(env(1));
  g2.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 40; i++) g2.update(1 / 60, blank());
  g2.puddles = [];
  g2.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(g2.hops, 1, 'too soon to hop again');
});

test('drippet: the cat noses its bowl away from a slippery puddle', () => {
  const game = create(env(1));
  game.update(1 / 60, blank());
  const bowl = { kind: 'bowl', x: 800, y: 700, fill: 0, wait: 0, patience: 99, done: 0, perk: 0, born: 1 };
  game.things = [bowl];
  game.x = 300;
  game.y = 600;
  game.puddles = [{ x: 760, y: 700, r: 40, max: 40, age: 3, life: 9, seed: 1, shape: 0 }];
  for (let i = 0; i < 30; i++) game.update(1 / 60, blank());
  assert.ok(bowl.x > 815, `bowl at ${bowl.x}`);
});

// The Drippet is one size whatever it does: standing (its portrait), running,
// hopping, skidding and pouring, measured against how big each picture is
// painted (design/source/pose-scales.json).
test('drippet: every painted pose shows the Drippet the same size', async () => {
  const { withArt, shownSizes, sizeCheck } = await import('./sprite-rig.mjs');
  await import('../src/subjects.js');
  const undo = withArt();
  try {
    const game = create(env(1));
    const at = (o) => (gm) => Object.assign(gm, { x: 800, y: 700, vx: 0, vy: 0, hop: 0, slip: 0, pouring: 0, pourOn: null, walk: 0.5, things: [] }, o);
    const sizes = shownSizes(game, 'drippet', {
      standing: at({}),
      running: at({ vx: 300 }),
      hopping: at({ hop: 0.01 }),
      skidding: at({ slip: 0.5 }),
      pouring: at({ pouring: 0.1 }),
    }, ['subject.drippet', 'sprites.drippetPoses', 'sprites.drippetMore']);
    const { fails, table } = sizeCheck(sizes, 'standing');
    console.log('drippet pose sizes', table);
    assert.equal(Object.keys(table).length, 5, 'each pose drew one picture');
    assert.deepEqual(fails, []);
  } finally {
    undo();
  }
});

test('drippet: slipping carries momentum, permits steering and hopping', () => {
  const game = create(env(1));
  game.vx = 430;
  game.puddles.push({ x: game.x, y: game.y, r: 40, max: 40, age: 2, life: 10 });
  game.update(1 / 60, blank({ x: 1 }));
  assert.ok(game.slip > 0);
  assert.ok(game.vx > 400);
  const x = game.x;
  game.update(0.1, blank({ y: 1 }));
  assert.ok(game.x > x + 30, 'momentum carries him through');
  assert.ok(game.vy > 0, 'steering remains available');
  game.update(1 / 60, blank({ actionPressed: true }));
  assert.ok(game.hop > 0, 'can hop while slipping');
  assert.equal(game.slip, 0);
});
