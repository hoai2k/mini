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
    const ux = dx / d;
    const uy = dy / d;
    const s = 0.55 + 0.45 * skill;
    // Look ahead along the way for an old puddle.
    let hop = false;
    const look = 60 + 100 * skill;
    for (let k = 30; k <= look; k += 15) {
      if (game.puddleAt(game.x + ux * k, game.y + uy * k * 0.8)) {
        hop = rnd() < 0.4 + 0.6 * skill;
        break;
      }
    }
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

// Runs in circles around the kitchen, never aiming.
const circler = () => (game, t) => ({ x: Math.cos(t * 1.5), y: Math.sin(t * 1.5) });

test('drippet: a beginner reaches the score, a good runner more; idle and circling do not, hopping everywhere scores less', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: runner(0.35, seed) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: runner(1, seed) }).game.score);
  const hops = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: bunny() }).game.score);
  const circles = [1, 2].map((seed) => run(create, { seed, bot: circler() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('drippet beginner', beginner, 'good', good, 'bunny', hops, 'circles', circles, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(beginner), `good ${good}`);
  assert.ok(Math.max(...circles) < pass, `circles ${circles}`);
  assert.ok(avg(hops) < avg(good), `bunny ${hops}`);
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
  for (let i = 0; i < 40; i++) game.update(1 / 60, blank());
  assert.equal(game.score, 1);
  assert.ok(t.over);
});

test('drippet: a thirsty thing left too long gives up', () => {
  const game = create(env(3));
  for (let i = 0; i < 60 * 13; i++) game.update(1 / 60, blank());
  assert.ok(game.missed >= 1);
  assert.equal(game.score, 0);
});
