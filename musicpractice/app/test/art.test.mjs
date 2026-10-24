import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pendulumLayout, pick } from '../src/art.js';
import { STANDINS } from '../src/standins.js';
import { THEMES } from '../src/settings.js';

const list = JSON.parse(readFileSync(new URL('../data/asset-list.json', import.meta.url)));
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('the pendulum hub lands on the body pivot', () => {
  const body = { canvas: [800, 1200], anchors: { pivot: [400, 985] } };
  const pend = { canvas: [200, 1000], anchors: { hub: [102, 927] } };
  const l = pendulumLayout(body, pend);
  // The hub's position inside the body, from the layout, equals the pivot.
  const hubX = ((l.left + (l.width * l.originX) / 100) / 100) * 800;
  const hubY = ((l.top + (l.height * l.originY) / 100) / 100) * 1200;
  assert.ok(near(hubX, 400) && near(hubY, 985), `${hubX}, ${hubY}`);
  assert.ok(near(l.width, 25) && near(l.originY, 92.7));
});

test('anchors can differ by theme and by scale', () => {
  const body = { canvas: [1000, 1000], anchors: { pivot: [500, 800] } };
  const pend = { canvas: [100, 400], anchors: { hub: [50, 380] }, scale: 2 };
  const l = pendulumLayout(body, pend);
  assert.ok(near(l.width, 20) && near(l.height, 80));
  assert.ok(near(((l.left + (l.width * l.originX) / 100) / 100) * 1000, 500));
  assert.ok(near(((l.top + (l.height * l.originY) / 100) / 100) * 1000, 800));
});

test('each theme shows its own delivered art, else its own stand-in', () => {
  assert.equal(pick(list, 'classic', 'metronome-body').kind, 'image');
  assert.deepEqual(pick(list, 'classic', 'metronome-body').anchors.pivot, [400, 985]);
  const deco = pick(list, 'deco', 'metronome-body');
  if (deco.kind === 'image') assert.ok(deco.file.includes('/deco/'));
  else assert.equal(deco.html, STANDINS.deco['metronome-body'].html);
});

test('every theme has stand-ins with anchors for every themed image', () => {
  const ids = [...new Set(list.filter((a) => a.theme).map((a) => a.id))];
  for (const t of THEMES) {
    for (const id of ids) {
      const art = pick([], t.id, id);
      assert.ok(art.html.startsWith('<svg'), `${t.id} ${id}`);
    }
    assert.ok(pick([], t.id, 'metronome-body').anchors.pivot);
    assert.ok(pick([], t.id, 'metronome-pendulum').anchors.hub);
  }
  // Delivered layers record their canvas and anchors.
  for (const a of list.filter((x) => x.id.startsWith('metronome-'))) {
    assert.ok(a.canvas && a.anchors, a.file);
  }
});

test('a point turned back into a rotated layer\'s own frame (the swinging rod)', async () => {
  const { unrotate } = await import('../src/art.js');
  const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
  // Rotated 90° clockwise about (0, 0), a point to the right of the hub was straight above it.
  assert.ok(near(unrotate(10, 0, 0, 0, 90), [0, -10]));
  // A point on a rod tilted 24° (the swing), 100 px from a hub at (200, 500), is 100 px straight up once upright.
  const a = (24 * Math.PI) / 180;
  assert.ok(near(unrotate(200 + 100 * Math.sin(a), 500 - 100 * Math.cos(a), 200, 500, 24), [200, 400]));
  assert.ok(near(unrotate(5, 7, 5, 7, 33), [5, 7])); // the hub stays put
});
