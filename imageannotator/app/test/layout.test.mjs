import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutLabels, rectsOverlap, labelOffset } from '../src/layout.js';
import { anchorOf } from '../src/geometry.js';

const measure = () => ({ w: 160, h: 40 });
const W = 1000;
const H = 800;
const base = { width: 6, fontSize: 30, opacity: 1, color: '#f00', label: null };

test('titles on crowded arrows do not overlap each other and stay on the picture', () => {
  const items = [];
  for (let i = 0; i < 6; i++) {
    items.push({ ...base, id: i + 1, type: 'arrow', x: 500 + (i % 2) * 30, y: 380 + i * 12, angle: Math.PI / 4, length: 150, title: `Title ${i}` });
  }
  const boxes = layoutLabels(items, 1, W, H, measure);
  assert.equal(boxes.size, 6);
  const list = [...boxes.values()];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H, `box ${i} inside`);
    for (let j = i + 1; j < list.length; j++) assert.ok(!rectsOverlap(b, list[j]), `boxes ${i} and ${j} overlap`);
  }
});

test('an arrow title sits past the tail, clear of it', () => {
  const a = { ...base, id: 1, type: 'arrow', x: 600, y: 400, angle: 0, length: 200, title: 'Look' };
  const b = layoutLabels([a], 1, W, H, measure).get(1);
  // the tail is at (400, 400); straight on past it is to the left
  assert.ok(b.x + b.w <= 400, JSON.stringify(b));
  assert.ok(b.y < 400 && b.y + b.h > 400);
  assert.equal(b.target, null);
});

test('circle titles sit outside the circle', () => {
  const c = { ...base, id: 1, type: 'circle', x: 500, y: 400, r: 100, title: 'Here' };
  const b = layoutLabels([c], 1, W, H, measure).get(1);
  const nx = Math.max(b.x, Math.min(500, b.x + b.w));
  const ny = Math.max(b.y, Math.min(400, b.y + b.h));
  assert.ok(Math.hypot(nx - 500, ny - 400) >= 100);
});

test('a title near the edge is pushed back onto the picture', () => {
  const a = { ...base, id: 1, type: 'arrow', x: 200, y: 20, angle: 0, length: 120, title: 'Edge' };
  const b = layoutLabels([a], 1, W, H, measure).get(1);
  assert.ok(b.x >= 0 && b.y >= 0, JSON.stringify(b));
});

test('a dragged title keeps its offset and follows its item', () => {
  const c = { ...base, id: 1, type: 'circle', x: 500, y: 400, r: 50, title: 'Moved', label: { dx: 300, dy: -200 } };
  let b = layoutLabels([c], 1, W, H, measure).get(1);
  assert.deepEqual([b.x + b.w / 2, b.y + b.h / 2], [800, 200]);
  assert.ok(b.target); // far away: a leader line runs back to the circle
  c.x += 50;
  b = layoutLabels([c], 1, W, H, measure).get(1);
  assert.deepEqual([b.x + b.w / 2, b.y + b.h / 2], [850, 200]);
  assert.deepEqual(labelOffset(c, { x: 850, y: 200 }, 1), { dx: 300, dy: -200 });
  assert.deepEqual(anchorOf(c, 1), { x: 550, y: 400 });
});

test('automatic titles avoid dragged ones', () => {
  const fixed = { ...base, id: 1, type: 'circle', x: 500, y: 400, r: 40, title: 'Fixed', label: { dx: 0, dy: -80 } };
  const auto = { ...base, id: 2, type: 'circle', x: 500, y: 400, r: 40, title: 'Auto' };
  const boxes = layoutLabels([fixed, auto], 1, W, H, measure);
  assert.ok(!rectsOverlap(boxes.get(1), boxes.get(2)));
});

test('items without titles get no box', () => {
  const boxes = layoutLabels([{ ...base, id: 1, type: 'circle', x: 1, y: 1, r: 1, title: '  ' }], 1, W, H, measure);
  assert.equal(boxes.size, 0);
});

test('text shows only with Add text on (older items without the switch count as on)', async () => {
  const { hasText } = await import('../src/layout.js');
  assert.equal(hasText({ title: 'Hi', textOn: true }), true);
  assert.equal(hasText({ title: 'Hi', textOn: false }), false);
  assert.equal(hasText({ title: '  ', textOn: true }), false);
  assert.equal(hasText({ title: 'Saved before the switch' }), true);
  const boxes = layoutLabels([{ ...base, id: 1, type: 'circle', x: 500, y: 400, r: 40, title: 'Off', textOn: false }], 1, W, H, measure);
  assert.equal(boxes.size, 0);
});
