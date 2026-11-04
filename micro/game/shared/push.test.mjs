// shared/push.js: creatures push each other apart, shared by mass.
//   node --test micro/game/shared/push.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { relax, createPush, deepestOverlap } from './push.js';

const disc = (id, x, z, r, m, extra = {}) => ({ id, x, z, r, m, dx: 0, dz: 0, ...extra });

test('two overlapping discs end apart (no overlap left)', () => {
  const bs = [disc(0, 0, 0, 100, 1), disc(1, 50, 0, 100, 1)];
  relax(bs, { passes: 4 });
  assert.ok(deepestOverlap(bs) <= 0.5 + 1e-9, `overlap ${deepestOverlap(bs)}`);
});

test('equal masses part equally; a body six times heavier moves a sixth as much', () => {
  const eq = [disc(0, 0, 0, 100, 1), disc(1, 100, 0, 100, 1)];
  relax(eq, { passes: 1, slop: 0 });
  assert.ok(Math.abs(eq[0].dx + 50) < 1e-6 && Math.abs(eq[1].dx - 50) < 1e-6, 'each moves half the overlap');
  const big = [disc(0, 0, 0, 100, 1), disc(1, 100, 0, 100, 6)];
  relax(big, { passes: 1, slop: 0 });
  assert.ok(Math.abs(big[0].dx / big[1].dx + 6) < 1e-6, `the light one moves six times as far (${big[0].dx} against ${big[1].dx})`);
  assert.ok(-big[0].dx > 80, 'the small mite is shoved most of the way');
});

test('a fixed body (or mass Infinity) never moves', () => {
  const bs = [disc(0, 0, 0, 200, Infinity), disc(1, 150, 0, 100, 1), disc(2, -150, 0, 100, 1, { fixed: true })];
  relax(bs, { passes: 4 });
  assert.equal(bs[0].x, 0); assert.equal(bs[2].x, -150);
  assert.ok(bs[1].x >= 300 - 0.6, `the free one is pushed clear (${bs[1].x})`);
});

test('a crowd settles: 60 discs dropped on one spot spread with no deep overlap', () => {
  const bs = Array.from({ length: 60 }, (_, i) => disc(i, Math.cos(i) * 30, Math.sin(i * 1.3) * 30, 60 + (i % 3) * 20, 1 + (i % 4)));
  const push = createPush({ cell: 300, carry: 0, passes: 6 });
  for (let k = 0; k < 40; k++) push.step(1 / 30, bs);
  assert.ok(deepestOverlap(bs) < 3, `deepest overlap after settling ${deepestOverlap(bs).toFixed(2)} µm`);
});

test('a walker leaning into another pushes it along, and is slowed (momentum by mass)', () => {
  // the player (mass 1) walks at 600 µm/s into a still mite of the same mass, then into one six times heavier
  for (const [M, label] of [[1, 'same size'], [6, 'bigger']]) {
    const me = disc('me', 0, 0, 110, 1), other = disc('it', 300, 0, 110 * (M > 1 ? 2.2 : 1), M);
    const push = createPush({ carry: 0.35 });
    const dt = 1 / 60;
    for (let k = 0; k < 120; k++) { me.x += 600 * dt; push.step(dt, [me, other]); }
    const otherMoved = other.x - 300;
    assert.ok(deepestOverlap([me, other]) < 1.5, `${label}: no overlap left`);
    if (M === 1) assert.ok(otherMoved > 300, `${label}: pushed along (${otherMoved.toFixed(0)} µm)`);
    else assert.ok(otherMoved > 30 && otherMoved < 300, `${label}: budges a little (${otherMoved.toFixed(0)} µm)`);
  }
});

test('the slide (carry) keeps a shoved body moving a moment, then it stops', () => {
  const a = disc('a', 0, 0, 100, 1), b = disc('b', 120, 0, 100, 1);
  const push = createPush({ carry: 0.5, tau: 0.15 });
  push.step(1 / 60, [a, b]);
  const x1 = b.x;
  push.step(1 / 60, [a, b]);
  assert.ok(b.x > x1, 'it slides on after the contact');
  for (let k = 0; k < 120; k++) push.step(1 / 60, [a, b]);
  const x2 = b.x; push.step(1 / 60, [a, b]);
  assert.ok(Math.abs(b.x - x2) < 0.01, 'and comes to rest');
});
