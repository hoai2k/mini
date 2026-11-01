import test from 'node:test';
import assert from 'node:assert/strict';
import { titleZoomLayout, TITLE_ZOOM } from './src/title-zoom.js';
import { TITLE_ZOOM_START } from './src/title-art.js';

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

test('the title opens on the tardigrade, and the mite comes only after the loop', () => {
  assert.equal(TITLE_ZOOM_START, 2);
  const start = TITLE_ZOOM_START * TITLE_ZOOM.seconds;
  assert.equal(titleZoomLayout(start, 8, 1280, 720).layers[0].index, 2);
  // The mite (plate 1) is the outer layer only once the cycle has come round.
  let firstMite = Infinity;
  for (let t = start; t < start + 80; t += 0.5) {
    if (titleZoomLayout(t, 8, 1280, 720).layers[0].index === 1) { firstMite = t - start; break; }
  }
  assert.equal(firstMite, 70);
});
