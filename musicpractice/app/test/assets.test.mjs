import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pick, pendulumLayout } from '../src/art.js';
import { THEMES } from '../src/settings.js';

const list = JSON.parse(readFileSync(new URL('../data/asset-list.json', import.meta.url)));
const IDS = ['home-metronome', 'home-record', 'metronome-body', 'metronome-pendulum'];

test('every theme shows its delivered art or its own stand-in, with the hub on the pivot', () => {
  for (const { id: theme } of THEMES) {
    for (const id of IDS) {
      const entry = list.find((a) => a.id === id && a.theme === theme);
      assert.ok(entry, `${theme} ${id} is in the image requests`);
      // A 'revise' image is delivered and stays in use until its replacement arrives.
      assert.ok(['delivered', 'revise'].includes(entry.status), `${theme} ${id} is delivered`);
      const art = pick(list, theme, id);
      assert.equal(art.kind, 'image', `${theme} ${id}`);
      if (art.kind === 'image') assert.equal(art.theme, theme);
    }
    const body = pick(list, theme, 'metronome-body');
    const rod = pick(list, theme, 'metronome-pendulum');
    const layout = pendulumLayout(body, rod);
    const x = (layout.left + layout.width * layout.originX / 100) * body.canvas[0] / 100;
    const y = (layout.top + layout.height * layout.originY / 100) * body.canvas[1] / 100;
    assert.ok(Math.abs(x - body.anchors.pivot[0]) < 0.001, theme);
    assert.ok(Math.abs(y - body.anchors.pivot[1]) < 0.001, theme);
  }
});

test('the early theme script in index.html knows every theme', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ids = JSON.parse(html.match(/var ids = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  assert.deepEqual(ids, THEMES.map((t) => t.id));
  for (const t of THEMES) {
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    assert.ok(css.includes(`[data-theme="${t.id}"]`), `styles.css has ${t.id}`);
  }
});
