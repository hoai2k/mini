import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrowTail, hitItem, bounds, defaultArrowAngle, simplifyPath, unitOf, anchorOf, nearestOnItem } from '../src/geometry.js';

const arrow = { type: 'arrow', x: 500, y: 500, angle: 0, length: 200, width: 10 };

test('the tail sits one length behind the tip', () => {
  assert.deepEqual(arrowTail(arrow), { x: 300, y: 500 });
  const t = arrowTail({ ...arrow, angle: Math.PI / 2 });
  assert.ok(Math.abs(t.x - 500) < 1e-9 && Math.abs(t.y - 300) < 1e-9);
});

test('a selected arrow rotates from its tail or its ring and moves from the tip or shaft', () => {
  assert.equal(hitItem(arrow, { x: 300, y: 500 }, 10, 1, true), 'rotate');
  assert.equal(hitItem(arrow, { x: 500, y: 300 }, 10, 1, true), 'rotate'); // on the ring, far from the arrow
  assert.equal(hitItem(arrow, { x: 500, y: 500 }, 10, 1, true), 'move');
  assert.equal(hitItem(arrow, { x: 400, y: 503 }, 10, 1, true), 'move');
  assert.equal(hitItem(arrow, { x: 400, y: 560 }, 10, 1, true), null);
  // unselected: no ring, the tail just picks it up
  assert.equal(hitItem(arrow, { x: 500, y: 300 }, 10, 1, false), null);
  assert.equal(hitItem(arrow, { x: 300, y: 500 }, 10, 1, false), 'move');
});

test('a circle resizes from its edge and, once selected, moves from inside', () => {
  const c = { type: 'circle', x: 100, y: 100, r: 50, width: 6 };
  assert.equal(hitItem(c, { x: 150, y: 100 }, 8, 1, true), 'resize');
  assert.equal(hitItem(c, { x: 110, y: 100 }, 8, 1, true), 'move');
  assert.equal(hitItem(c, { x: 110, y: 100 }, 8, 1, false), null); // a tap inside an unselected circle is free for a new arrow
  assert.equal(hitItem(c, { x: 150, y: 100 }, 8, 1, false), 'move');
});

test('drawings are hit along the stroke', () => {
  const d = { type: 'draw', x: 10, y: 0, width: 4, points: [[0, 0], [100, 0]] };
  assert.equal(hitItem(d, { x: 60, y: 3 }, 5, 1, false), 'move');
  assert.equal(hitItem(d, { x: 60, y: 30 }, 5, 1, false), null);
  assert.deepEqual(bounds(d, 1), { x: 8, y: -2, w: 104, h: 4 });
  assert.deepEqual(anchorOf(d, 1), { x: 60, y: 0 });
});

test('new arrows come from the middle of the picture, so they stay on it', () => {
  // A tap near the right edge: the tail goes left, so the arrow points right.
  const a = defaultArrowAngle({ x: 950, y: 500 }, 1000, 1000, 200);
  assert.ok(Math.abs(a) < 1e-9);
  const t = arrowTail({ x: 950, y: 500, angle: a, length: 200 });
  assert.ok(t.x > 0 && t.x < 1000);
  // A tap in the middle: from the lower left.
  assert.equal(defaultArrowAngle({ x: 500, y: 500 }, 1000, 1000, 200), -Math.PI / 4);
});

test('freehand paths drop crowded points but keep the end', () => {
  const pts = [[0, 0], [0.5, 0], [1, 0], [5, 0], [5.2, 0]];
  assert.deepEqual(simplifyPath(pts, 2), [[0, 0], [5, 0], [5.2, 0]]);
});

test('units scale with the longer side', () => {
  assert.equal(unitOf(4000, 3000), 4);
  assert.equal(unitOf(500, 1000), 1);
});

test('leader lines end on the circle outline', () => {
  const p = nearestOnItem({ type: 'circle', x: 0, y: 0, r: 10 }, { x: 30, y: 0 }, 1);
  assert.deepEqual(p, { x: 10, y: 0 });
});
