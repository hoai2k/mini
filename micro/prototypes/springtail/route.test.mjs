// The springtail's pool as rings round the start (the owner, 2026-11-01): the
// same challenges in every direction, a short warm-up, each challenge with a
// calm stretch after it, and the portal (the way on, guarded by the wolf
// spider) on a ring of open water at the same distance whichever way you go.
//   node micro/prototypes/springtail/route.test.mjs
import assert from 'node:assert/strict';
import { START, RINGS, PORTAL_R, ZONES, SUNDEW_ISLANDS, SUNDEW_CLUSTERS, ISLANDS, progressAt, poolE, inPool, islandEdge, ringPoint, zoneAt, distFromStart } from './world.js';

assert.ok(inPool(START.x, START.z) && poolE(START.x, START.z) < 0.3, 'the start is on open water, mid-pool');
assert.equal(progressAt(START.x, START.z), 0);
const P = ringPoint(PORTAL_R, 1.1);
assert.ok(Math.abs(progressAt(P.x, P.z) - 1) < 1e-9, 'progress is 1 on the portal ring');

const BEARINGS = Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2);
const open = (x, z, margin) => inPool(x, z) && poolE(x, z) < 0.94 && islandEdge(x, z).d > margin;

// each ring (where its challenge sits) is open water in every direction
for (const a of BEARINGS) {
  for (const k of ['stenus', 'strider', 'crowd']) {
    const p = zoneAt(k, a);
    assert.ok(open(p.x, p.z, 6), `${k}'s water at bearing ${(a * 180 / Math.PI).toFixed(0)} is open water`);
  }
  // the Podura mass needs its whole disc on open water
  const c = zoneAt('crowd', a);
  for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2; assert.ok(open(c.x + Math.cos(t) * ZONES.crowd.r, c.z + Math.sin(t) * ZONES.crowd.r, 1), `crowd disc at ${(a * 180 / Math.PI).toFixed(0)}`); }
  // the portal ring: room for the raft and the spider's arena
  const p = ringPoint(PORTAL_R, a);
  assert.ok(open(p.x, p.z, 12), `portal ring at bearing ${(a * 180 / Math.PI).toFixed(0)} is open water (poolE ${poolE(p.x, p.z).toFixed(3)})`);
  for (const r of [-25, 12]) { const q = ringPoint(PORTAL_R + r, a); assert.ok(inPool(q.x, q.z) && poolE(q.x, q.z) < 0.97, `round the portal at ${(a * 180 / Math.PI).toFixed(0)}, ${r} mm`); }
}

// spans along any bearing (mm from the start): where each challenge reaches you, where it lets go
const S = ZONES.stenus, R = ZONES.strider, C = ZONES.crowd;
const spans = [
  ['Stenus', S.ring - S.r, S.ring + S.r + S.leash],
  ['strider and mass', Math.min(R.ring - R.r, C.ring - C.r), R.ring + R.r + R.leash],
  ['sundews', Math.min(...SUNDEW_ISLANDS.map((I) => distFromStart(I.x, I.z) - I.r - 6)), Math.max(...SUNDEW_ISLANDS.map((I) => distFromStart(I.x, I.z) + I.r + 6))],
  ['boss', ZONES.boss.from * PORTAL_R, PORTAL_R],
];
// the first predator reaches you after a few jumps (~2-3 screen lengths)
assert.ok(spans[0][1] >= 60 && spans[0][1] <= 110, `first predator from ${spans[0][1]} mm`);
// a calm stretch after each challenge: a break, not a trek
for (let i = 1; i < spans.length; i++) {
  const gap = spans[i][1] - spans[i - 1][2];
  assert.ok(gap >= 15 && gap <= 60, `${spans[i - 1][0]} -> ${spans[i][0]}: ${gap.toFixed(0)} mm calm`);
}
for (let i = 1; i < spans.length; i++) assert.ok(spans[i][1] > spans[i - 1][1], `${spans[i][0]} after ${spans[i - 1][0]}`);
// rain from the strider's ring outward, never over Stenus's
assert.ok(ZONES.rain * PORTAL_R > spans[0][2], 'no rain over the first challenge');
assert.ok(ZONES.rain * PORTAL_R <= spans[1][1] + 10, 'rain starts with the strider');
assert.ok(RINGS.warm <= spans[0][1], 'warm-up before Stenus');

// sundew clusters within 30 degrees of every bearing at ring 3
assert.equal(new Set(SUNDEW_ISLANDS.map((I) => I.cluster)).size, SUNDEW_CLUSTERS);
for (let d = 0; d < 360; d += 5) {
  const a = (d * Math.PI) / 180;
  const off = Math.min(...SUNDEW_ISLANDS.map((I) => Math.abs(Math.atan2(Math.sin(Math.atan2(I.z - START.z, I.x - START.x) - a), Math.cos(Math.atan2(I.z - START.z, I.x - START.x) - a)))));
  assert.ok(off <= Math.PI / 6, `a sundew cluster within 30 degrees of ${d}`);
}
// ... and a straight way out in any direction passes within 45 mm of a sundew island (about a screen to one side)
for (let d = 0; d < 360; d += 1) {
  const p = ringPoint(RINGS.sundew, (d * Math.PI) / 180);
  const near = Math.min(...SUNDEW_ISLANDS.map((I) => Math.hypot(I.x - p.x, I.z - p.z)));
  assert.ok(near <= 45, `sundews ${near.toFixed(0)} mm from the way out at ${d}`);
}
// sundew islands do not overlap other islands
for (const I of SUNDEW_ISLANDS) for (const J of ISLANDS) if (I !== J) assert.ok(Math.hypot(I.x - J.x, I.z - J.z) > I.r + J.r + 4, 'sundew islands stand apart');
assert.ok(ISLANDS.length <= 72, `island count ${ISLANDS.length} (the water shader unrolls them)`);

console.log(`ok: ${ISLANDS.length} islands; rings ${spans.map(([k, a, b]) => `${k} ${a.toFixed(0)}-${b.toFixed(0)}`).join(', ')}; portal ${PORTAL_R} mm`);
