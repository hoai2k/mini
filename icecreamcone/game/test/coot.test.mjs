import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/coot.js';
import { BIRDS } from '../src/birds.js';
import { run, blank, env } from './harness.mjs';

const pass = BIRDS.find((b) => b.id === 'coot').pass;

// A good player: run under the lowest good scoop, and lean against the stack.
function chaser(game) {
  const top = { x: game.x - 86 };
  const good = game.items.filter((i) => i.kind !== 'pickle' && i.kind !== 'sock').sort((a, b) => b.y - a.y)[0];
  const bad = game.items.filter((i) => (i.kind === 'pickle' || i.kind === 'sock') && i.y > 300).sort((a, b) => b.y - a.y)[0];
  let target = good ? good.x : top.x;
  if (bad && Math.abs(bad.x - top.x) < 90) target = top.x + (bad.x > top.x ? -200 : 200);
  const d = target - top.x;
  return { x: Math.max(-1, Math.min(1, d / 60)) };
}

test('coot: a careful chaser opens the next page; idle earns nothing', () => {
  const scores = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: chaser }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  assert.ok(idle < pass, `idle ${idle}`);
  assert.ok(Math.max(...scores) >= pass, `chaser best ${scores}`);
  console.log('coot chaser scores', scores, 'pass', pass);
});

test('coot: an off-centre stack topples', () => {
  const game = create({ W: 1600, H: 900, rng: () => 0.5, sfx: () => {} });
  for (let i = 0; i < 6; i++) game.stack.push({ dx: 30, color: '#fff', kind: 'scoop', count: 1 });
  game.update(1 / 60, { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, left: false, right: false, spin: 0, pointer: { active: false } });
  assert.equal(game.stack.length, 0);
});

// ---------- clinging scoops ----------


function quiet(seed = 1) {
  const g = create(env(seed));
  g.spawn = 1e9; // nothing falls unless a test drops it
  return g;
}
const scoop = (x, y) => ({ x, y, vy: 300, kind: 'scoop', color: '#ea8fb0', spin: 0, a: 0 });
const step = (g, s, inp = blank()) => {
  for (let t = 0; t < s; t += 1 / 60) g.update(1 / 60, inp);
};

test('coot: a scoop that hits the side of the stack clings there, then slips off', () => {
  const g = quiet();
  for (let i = 0; i < 5; i++) g.stack.push({ dx: 0, color: '#fff', kind: 'scoop', count: 1 });
  g.update(1 / 60, blank());
  const col = g.stack.length;
  // drop one beside the middle of the stack
  const mid = g.column()[3];
  g.items.push(scoop(mid.x + 38, mid.y - 30));
  step(g, 0.1);
  assert.equal(g.stack.length, col, 'the stack did not grow');
  assert.equal(g.clingers.length, 1, 'it clings');
  step(g, 4);
  assert.equal(g.clingers.length, 0, 'it slipped down and fell');
});

function holdTime(side) {
  const g = quiet();
  // a stack leaning left
  for (let i = 0; i < 5; i++) g.stack.push({ dx: -6, color: '#fff', kind: 'scoop', count: 1 });
  g.clingers.push({ lvl: 2, side, grip: 1.1, sliding: false, v: 0, t: 0, color: '#fff', kind: 'scoop', count: 1 });
  let t = 0;
  while (t < 10 && g.clingers[0] && !g.clingers[0].sliding) {
    g.update(1 / 60, blank());
    t += 1 / 60;
  }
  return t;
}

test('coot: a clinging scoop holds longer on the side the stack leans away from', () => {
  const right = holdTime(1);
  const left = holdTime(-1);
  assert.ok(right > left * 1.3, `right ${right.toFixed(2)}s vs left ${left.toFixed(2)}s`);
});

test('coot: running into a clinging scoop presses it on; running away peels it off', () => {
  const time = (dir) => {
    const g = quiet();
    for (let i = 0; i < 5; i++) g.stack.push({ dx: 0, color: '#fff', kind: 'scoop', count: 1 });
    g.clingers.push({ lvl: 2, side: 1, grip: 1.1, sliding: false, v: 0, t: 0, color: '#fff', kind: 'scoop', count: 1 });
    let t = 0;
    let k = 0;
    while (t < 10 && g.clingers[0] && !g.clingers[0].sliding) {
      // running back and forth, faster one way than the other
      g.update(1 / 60, blank({ x: k++ % 40 < 20 ? dir : -dir * 0.4 }));
      t += 1 / 60;
    }
    return t;
  };
  assert.ok(time(1) > time(-1), 'pressing holds longer than peeling');
});

test('coot: a slipping scoop comes to rest on a scoop that juts out below it', () => {
  const g = quiet();
  // scoop 2 juts out to the right of scoop 3
  for (const dx of [0, 0, 22, -22, 0]) g.stack.push({ dx, color: '#fff', kind: 'scoop', count: 1 });
  g.clingers.push({ lvl: 3.9, side: 1, grip: 0, sliding: true, v: 0, t: 0, color: '#fff', kind: 'scoop', count: 1 });
  step(g, 0.6);
  assert.equal(g.clingers.length, 1, 'still on the stack');
  assert.ok(!g.clingers[0].sliding, 'resting');
  assert.ok(Math.abs(g.clingers[0].lvl - 3.65) < 0.01, `on the ledge (lvl ${g.clingers[0].lvl})`);
});

test('coot: a scoop cupped by a clinging scoop near the top is pushed up onto the stack', () => {
  const g = quiet();
  for (let i = 0; i < 4; i++) g.stack.push({ dx: 0, color: '#fff', kind: 'scoop', count: 1 });
  g.clingers.push({ lvl: 3, side: 1, grip: 1.1, sliding: false, v: 0, t: 0, color: '#fff', kind: 'scoop', count: 1 });
  g.update(1 / 60, blank());
  const before = g.stack.length;
  // drop one onto the clinging scoop
  const p = g.clingPos(g.clingers[0]);
  g.items.push(scoop(p.x + 2, p.y - 60));
  step(g, 0.3);
  assert.equal(g.stack.length, before + 1, 'the new scoop is on top');
  assert.equal(g.clingers.length, 1, 'and the one that cupped it is still holding on');
});

test('coot: a tall stack zooms the view out, keeping sky above it, and scoops start above the view', () => {
  const g = quiet();
  g.update(1 / 60, blank());
  assert.equal(g.zoom, 1, 'no zoom with an empty head');
  for (let i = 0; i < 18; i++) g.stack.push({ dx: 0, color: '#fff', kind: 'scoop', count: 1 });
  step(g, 3);
  assert.ok(g.zoom < 0.8, `zoomed out (${g.zoom.toFixed(2)})`);
  const top = g.column().at(-1).y;
  const viewTop = 840 - 840 / g.zoom;
  assert.ok(top - viewTop > 300, `sky above the stack: ${Math.round(top - viewTop)} px`);
  g.spawn = 0;
  g.update(1 / 60, blank());
  assert.ok(g.items.length && g.items.at(-1).y < viewTop, 'a new scoop starts above the view');
});
