import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pick, pendulumLayout } from '../src/art.js';
import { THEMES } from '../src/settings.js';

const list = JSON.parse(readFileSync(new URL('../data/asset-list.json', import.meta.url)));

test('all themes select their delivered art and align measured hubs', () => {
  for (const { id: theme } of THEMES) {
    for (const id of ['home-metronome', 'home-record', 'metronome-body', 'metronome-pendulum']) {
      assert.equal(pick(list, theme, id).kind, 'image');
      assert.equal(pick(list, theme, id).theme, theme);
    }
    const body = pick(list, theme, 'metronome-body');
    const rod = pick(list, theme, 'metronome-pendulum');
    const layout = pendulumLayout(body, rod);
    const x = (layout.left + layout.width * layout.originX / 100) * body.canvas[0] / 100;
    const y = (layout.top + layout.height * layout.originY / 100) * body.canvas[1] / 100;
    assert.ok(Math.abs(x - body.anchors.pivot[0]) < 0.001);
    assert.ok(Math.abs(y - body.anchors.pivot[1]) < 0.001);
  }
});
