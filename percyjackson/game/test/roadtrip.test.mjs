// The Road West's layout (world/rtLayout.js): its stretches cover the strip
// end to end, every stop you board a vehicle at stands on walkable ground clear
// of the gates and roadblocks, and each chapter's marker is on the near (east)
// side of the roadblock it opens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RT_WORLD, RT_REGIONS, ROADBLOCKS, RT_ANCHORS, RIDES, DRIVE, RT_GATES, RT_BUS_STOP, rtRegionAt, rtLevelAt } from '../js/world/rtLayout.js';

test('the stretches cover the road from end to end, west to east without gaps', () => {
  const xs = [...RT_REGIONS].sort((a, b) => a.x[0] - b.x[0]);
  assert.equal(xs[0].x[0], 0);
  assert.equal(xs.at(-1).x[1], RT_WORLD.sx);
  for (let i = 1; i < xs.length; i++) assert.equal(xs[i].x[0], xs[i - 1].x[1], xs[i].id);
  for (const r of RT_REGIONS) if (!r.safe) assert.ok(r.kinds?.length, r.id + ' has monsters');
});

test('stations, the truck stop and the taxi rank stand on walkable stops, clear of gates and roadblocks', () => {
  const walkable = (x) => { const r = rtRegionAt(x, 44); return r && !r.ride && !r.drive; };
  const clear = (x, m) => RT_GATES.every((g) => Math.abs(g - x) > m) && ROADBLOCKS.every((b) => Math.abs(b.x - x) > m);
  for (const r of RIDES) for (const x of [r.from, r.to]) {
    const m = r.kind === 'train' ? 10 : 4;   // (a station's platform runs nine either side)
    for (const dx of [-m + 1, 0, m - 1]) assert.ok(walkable(x + dx), `${r.id} at ${x + dx}`);
    assert.ok(clear(x, m), `${r.id} at ${x} clear`);
    assert.ok(rtRegionAt((r.from + r.to) / 2, 44).ride === r.kind, `${r.id} crosses a ${r.kind} stretch`);
  }
  for (const x of [DRIVE.from, DRIVE.to]) assert.ok(walkable(x) && clear(x, 4), 'taxi at ' + x);
  assert.ok(rtRegionAt((DRIVE.from + DRIVE.to) / 2, 44).drive);
  assert.ok(walkable(RT_BUS_STOP[0]));
});

test('every roadblock has its chapter marker on its east side, in the same stop', () => {
  for (const b of ROADBLOCKS) {
    const [ax] = RT_ANCHORS[b.anchor];
    assert.ok(ax > b.x, `${b.id}: marker east of the block`);
    assert.equal(rtRegionAt(ax, 44), rtRegionAt(b.x, 44), b.id);
  }
});

test('monster levels rise westward within a stretch', () => {
  const r = RT_REGIONS.find((q) => q.id === 'rt_la');
  assert.ok(rtLevelAt(r, r.x[0] + 1, 44) >= rtLevelAt(r, r.x[1] - 1, 44));
  assert.ok(rtLevelAt(r, r.x[0], 44) <= r.level[1] && rtLevelAt(r, r.x[1] - 1, 44) >= r.level[0]);
});
