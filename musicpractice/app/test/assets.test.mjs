import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectArt, alignPendulum } from '../src/assets.js';

const list = JSON.parse(readFileSync(new URL('../data/asset-list.json', import.meta.url)));

test('each theme selects one delivered image per slot', () => {
  for (const theme of ['straight', 'deco']) {
    const selected = selectArt(list, theme);
    assert.equal(new Set(selected.map((a) => a.id)).size, selected.length);
    for (const a of selected.filter((a) => a.theme)) assert.equal(a.theme, theme);
  }
  const pending = list.map((a) => a.theme === 'deco' ? { ...a, status: 'requested' } : a);
  assert.equal(selectArt(pending).find((a) => a.id === 'metronome-body').theme, 'straight');
});

test('each theme pins its hub to its measured body pivot', () => {
  for (const theme of ['straight', 'deco']) {
    const art = selectArt(list, theme);
    const body = art.find((a) => a.id === 'metronome-body');
    const rod = art.find((a) => a.id === 'metronome-pendulum');
    const el = { style: {} };
    alignPendulum(el, body, rod);
    const [w, h] = body.canvas;
    const [rw, rh] = rod.canvas;
    const [hx, hy] = el.style.transformOrigin.split(' ').map(parseFloat);
    const x = parseFloat(el.style.left) * w / 100 + hx * rw / 100;
    const y = parseFloat(el.style.top) * h / 100 + hy * rh / 100;
    assert.ok(Math.abs(x - body.anchors.pivot[0]) < 0.001);
    assert.ok(Math.abs(y - body.anchors.pivot[1]) < 0.001);
  }
});
