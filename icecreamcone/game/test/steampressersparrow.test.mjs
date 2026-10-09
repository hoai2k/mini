import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/steampressersparrow.js';
import entry from '../src/more/steampressersparrow.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A presser: goes to the nearest crease and runs the iron along it, end to
// end and back, until it's flat, then on to the next. `speed` is how hard it
// pushes the stick; with `steam` it puffs at the start of each stroke.
function presser({ speed = 0.6, steam = false } = {}) {
  let crease = null;
  let idx = 0;
  let dir = 1;
  let press = false;
  return (game) => {
    if (press) {
      press = false;
      return {};
    }
    const open = game.open();
    if (!open.length) return {};
    if (!crease || crease.done || !open.includes(crease)) {
      const d = (c) => Math.min(Math.hypot(c.pts[0].x - game.x, c.pts[0].y - game.y), Math.hypot(c.pts[c.pts.length - 1].x - game.x, c.pts[c.pts.length - 1].y - game.y));
      crease = open.sort((a, b) => d(a) - d(b))[0];
      const p0 = crease.pts[0];
      const p1 = crease.pts[crease.pts.length - 1];
      if (Math.hypot(p0.x - game.x, p0.y - game.y) <= Math.hypot(p1.x - game.x, p1.y - game.y)) {
        idx = 0;
        dir = 1;
      } else {
        idx = crease.pts.length - 1;
        dir = -1;
      }
    }
    let q = crease.pts[idx];
    if (Math.hypot(q.x - game.x, q.y - game.y) < 28) {
      if (idx + dir < 0 || idx + dir >= crease.pts.length) {
        dir = -dir;
        if (steam && game.tank >= 1) press = true;
      }
      idx += dir;
      q = crease.pts[idx];
    }
    const dx = q.x - game.x;
    const dy = q.y - game.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: (dx / l) * speed, y: (dy / l) * speed, action: press };
  };
}

// Stays where it is and puffs steam whenever it can.
const camper = () => (game, t) => ({ action: Math.floor(t * 6) % 2 === 0 });
// Sweeps the whole board, row by row, puffing steam all the while.
const sweeper = () => {
  let row = 0;
  let d = 1;
  return (game, t) => {
    const rows = [430, 500, 570, 640, 710];
    const ty = rows[row];
    if ((d > 0 && game.x > 1370) || (d < 0 && game.x < 250)) {
      d = -d;
      row = (row + 1) % rows.length;
    }
    return { x: d, y: Math.max(-1, Math.min(1, (ty - game.y) / 40)), action: Math.floor(t * 4) % 2 === 0 };
  };
};

test('steampressersparrow: a beginner opens the next page, a good presser more; camping, sweeping and idling do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: presser({ speed: 0.45 }) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: presser({ speed: 0.75, steam: true }) }).game.score);
  const camp = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: camper() }).game.score);
  const sweep = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: sweeper() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('steampressersparrow beginner', beginner, 'good', good, 'camp', camp, 'sweep', sweep, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(beginner), `good ${good}`);
  assert.ok(Math.max(...camp) < pass, `camping must not open the next page: ${camp}`);
  assert.ok(Math.max(...sweep) < pass, `sweeping must not open the next page: ${sweep}`);
});

test('steampressersparrow: running the iron along a crease presses it out', () => {
  const game = create(env(1));
  for (let i = 0; i < 30; i++) game.update(1 / 60, blank()); // let the garment slide in
  const c = game.open()[0];
  const before = game.score;
  for (let pass = 0; pass < 6 && !c.done; pass++) {
    for (const q of pass % 2 ? [...c.pts].reverse() : c.pts) {
      for (let i = 0; i < 6; i++) {
        game.update(1 / 60, blank({ pointer: { active: true, x: q.x, y: q.y } }));
      }
    }
  }
  assert.ok(c.done, 'crease pressed out');
  assert.ok(game.score > before);
});

test('steampressersparrow: lingering with steam scorches the cloth', () => {
  const game = create(env(1));
  for (let i = 0; i < 30; i++) game.update(1 / 60, blank());
  game.score = 10;
  for (let i = 0; i < 180 && !game.scorches; i++) game.update(1 / 60, blank({ action: i % 30 === 0, actionPressed: i % 30 === 0 }));
  assert.equal(game.scorches, 1);
  assert.equal(game.score, 8);
});

test('steampressersparrow: dry, it takes much longer to scorch; steam presses faster', () => {
  const dry = create(env(1));
  for (let i = 0; i < 30; i++) dry.update(1 / 60, blank());
  let t = 0;
  while (!dry.scorches && t < 10) {
    dry.update(1 / 60, blank());
    t += 1 / 60;
  }
  assert.ok(t > 2, `dry scorch after ${t.toFixed(2)} s`);
  // the same short stroke, dry and with steam
  const flat = (steam) => {
    const game = create(env(1));
    for (let i = 0; i < 30; i++) game.update(1 / 60, blank());
    const q = game.open()[0].pts[2];
    game.x = q.x;
    game.y = q.y;
    game.update(1 / 60, blank({ action: steam, actionPressed: steam }));
    for (let i = 0; i < 12; i++) game.update(1 / 60, blank());
    return q.flat;
  };
  assert.ok(flat(true) > flat(false) * 1.6, `${flat(true)} vs ${flat(false)}`);
});

test('steampressersparrow: the next garment comes when its time runs out, and later ones have more creases', () => {
  const game = create(env(1));
  const first = game.garment;
  const n0 = first.creases.length;
  for (let i = 0; i < 60 * 30; i++) game.update(1 / 60, blank());
  assert.notEqual(game.garment, first);
  assert.ok(game.count >= 3);
  assert.ok(game.garment.creases.length >= n0, `${game.garment.creases.length} >= ${n0}`);
});
