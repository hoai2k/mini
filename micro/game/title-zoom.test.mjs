import test from 'node:test';
import assert from 'node:assert/strict';
import { titleZoomLayout, TITLE_ZOOM } from './src/title-zoom.js';

test('the full cycle reuses the exact opening layout', () => {
  for (const [width, height] of [[1280, 720], [390, 844], [2560, 1080]]) {
    const first = titleZoomLayout(0, 8, width, height);
    assert.deepEqual(titleZoomLayout(first.duration, 8, width, height), first);
    assert.deepEqual(titleZoomLayout(first.duration * 3, 8, width, height), first);
  }
});

test('every handoff preserves the child transform and hides the outgoing parent', () => {
  for (const [width, height] of [[1280, 720], [390, 844], [2560, 1080]]) {
    for (let step = 1; step <= 8; step++) {
      const before = titleZoomLayout(step * TITLE_ZOOM.seconds - 1e-7, 8, width, height);
      const after = titleZoomLayout(step * TITLE_ZOOM.seconds, 8, width, height);
      for (let depth = 0; depth < after.layers.length - 1; depth++) {
        const a = before.layers[depth + 1], b = after.layers[depth];
        assert.equal(a.index, b.index); assert.equal(a.x, b.x); assert.equal(a.y, b.y);
        assert.ok(Math.abs(a.radius - b.radius) / b.radius < 1e-6);
      }
      assert.ok(before.layers[1].radius * TITLE_ZOOM.core > before.extent);
    }
  }
});

test('images stay in sequence and the first plate is nested again before the loop closes', () => {
  const view = titleZoomLayout(70, 8, 1280, 720);
  assert.equal(view.layers[0].index, 7); assert.equal(view.layers[1].index, 0);
  assert.ok(view.layers.every((p, i, all) => !i || p.radius < all[i - 1].radius));
  assert.deepEqual(titleZoomLayout(0, 0, 1280, 720).layers, []);
});
