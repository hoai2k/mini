// The mite's moss as rings round the start (the encounter pattern,
// micro/design/encounter-pattern.md): the same challenges in every direction,
// a short warm-up, obstacles spaced about evenly with calm breaks between, and
// the portal (the wet leaf axil, guarded by the pseudoscorpion) at the same
// distance whichever way you go, about a minute of rushing out.
//   node micro/prototypes/mite/route.test.mjs
import assert from 'node:assert/strict';
import { RINGS, PORTAL_R, PORTAL_PLACE, PORTAL_CLEAR, CLUSTERS, clusterRing, CLUSTER, PRED_GROUND, BOSS, BOUNDS, NPC_HOME, portalAt, predZoneAt, ringPoint, distFromStart } from './layout.js';
import { floorH, TILE, wrapD, tileOf } from './world.js';

// Rushing speeds (µm/s, measured with rush scripts on the page, enemies passive):
// hurrying (RB) with every scramble the stamina allows ~730 over open moss; hurrying alone ~585.
const RUSH = 730, HURRY = 585;

// --- the scenery tile repeats seamlessly (the floor is periodic)
for (const [x, z] of [[0, 0], [123, -4567], [4799, 4800], [-12345, 6789]]) {
  for (const [kx, kz] of [[1, 0], [0, -1], [3, 2], [-2, 5]]) assert.ok(Math.abs(floorH(x, z) - floorH(x + kx * TILE, z + kz * TILE)) < 1e-6, `floor repeats at ${x}, ${z}`);
}
assert.equal(tileOf(TILE * 0.49), 0); assert.equal(tileOf(TILE * 0.51), 1);
assert.ok(Math.abs(wrapD(TILE * 1.25) - TILE * 0.25) < 1e-9);
assert.equal(TILE % 320, 0, 'a whole number of floor-texture repeats to the tile');

// --- spans along any bearing (µm from the start): where each challenge reaches you, where it lets go
const t1 = clusterRing(0), t2 = clusterRing(1);
const spanOf = (list) => [Math.min(...list.map((c) => distFromStart(c.x, c.z) - c.r)), Math.max(...list.map((c) => distFromStart(c.x, c.z) + c.r))];
const P = portalAt(0.7);
const bossFrom = distFromStart(P.post.x, P.post.z) - BOSS.wake;
const spans = [
  ['thickets 1', ...spanOf(t1)],
  ['predator 1', RINGS.pred[0] - PRED_GROUND.r, RINGS.pred[0] + PRED_GROUND.r + PRED_GROUND.chase],
  ['thickets 2', ...spanOf(t2)],
  ['predator 2', RINGS.pred[1] - PRED_GROUND.r, RINGS.pred[1] + PRED_GROUND.r + PRED_GROUND.chase],
  ['boss and portal', bossFrom, PORTAL_R],
];
// a warm-up of a few seconds (two or three screen widths at 1.6 mm), then the first obstacle soon (not at once)
assert.ok(spans[0][1] >= RINGS.warm - 1 && spans[0][1] / RUSH >= 4.5 && spans[0][1] / RUSH <= 10, `first obstacle from ${spans[0][1]} µm (${(spans[0][1] / RUSH).toFixed(1)} s rushing)`);
// in order, a calm break after each (a few seconds, never a trek), roughly even
const gaps = [];
for (let i = 1; i < spans.length; i++) {
  assert.ok(spans[i][1] > spans[i - 1][2], `${spans[i][0]} after ${spans[i - 1][0]}`);
  const gap = spans[i][1] - spans[i - 1][2];
  gaps.push(gap);
  assert.ok(gap >= 2500 && gap <= 7500, `${spans[i - 1][0]} -> ${spans[i][0]}: ${gap} µm calm (${(gap / RUSH).toFixed(1)} s rushing)`);
}
const starts = spans.map((s) => s[1]);
const steps = starts.slice(1).map((s, i) => s - starts[i]);
assert.ok(Math.max(...steps) / Math.min(...steps) < 1.6, `obstacles about evenly spaced: ${steps.join(', ')} µm apart`);
// the portal: about a minute of rushing out (50-60 s hurrying with every scramble), ~1 min hurrying alone
assert.ok(PORTAL_R / RUSH >= 45 && PORTAL_R / RUSH <= 55, `portal ring ${PORTAL_R} µm: ${(PORTAL_R / RUSH).toFixed(0)} s straight-line rushing (plus the thickets' drag)`);
assert.ok(PORTAL_R / HURRY <= 66, `portal ring: ${(PORTAL_R / HURRY).toFixed(0)} s hurrying`);

// --- the thicket rings: every way out meets one (passes within ~400 µm of a cluster: about a mite's length)
for (const [k, list] of [[0, t1], [1, t2]]) {
  for (let d = 0; d < 360; d += 0.5) {
    const a = (d * Math.PI) / 180, ux = Math.cos(a), uz = Math.sin(a);
    // the gap from the straight way out to the nearest cluster's edge
    const near = Math.min(...list.map((c) => { const t = c.x * ux + c.z * uz; return Math.hypot(c.x - ux * t, c.z - uz * t) - c.r; }));
    assert.ok(near <= 400, `ring ${k + 1}: a way out at ${d}° passes ${near.toFixed(0)} µm from the nearest thicket`);
  }
  // clusters stand apart (a squeeze between them) and never on another ring
  for (let i = 0; i < list.length; i++) {
    const a = list[i], b = list[(i + 1) % list.length];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.r + b.r + 300, `ring ${k + 1}: clusters ${i} and ${(i + 1) % list.length} stand apart`);
  }
}
assert.equal(CLUSTERS.length, t1.length + t2.length);
assert.ok(CLUSTERS.length <= 70, `${CLUSTERS.length} thickets (each a few draws when in view)`);
// the warm-up is open: the start, the second box mite's patch and the giant springtail are clear of the thickets
for (const c of CLUSTERS) {
  assert.ok(distFromStart(c.x, c.z) - c.r >= RINGS.warm - 1, 'no thicket in the warm-up');
  assert.ok(Math.hypot(c.x - NPC_HOME.x, c.z - NPC_HOME.z) > c.r + 1400, 'the second box mite wanders clear of the thickets');
}

// --- the predator's rings: its ground (and chase) never reaches a thicket ring or the boss's
for (let d = 0; d < 360; d += 15) {
  const a = (d * Math.PI) / 180;
  for (let k = 0; k < 2; k++) {
    const z = predZoneAt(k, a);
    for (const c of CLUSTERS) assert.ok(Math.hypot(z.x - c.x, z.z - c.z) > z.r + PRED_GROUND.chase + c.r, `predator ring ${k + 1} clear of the thickets at ${d}°`);
  }
  // the portal and its arena: the boss's post before the water, the leash clear of the predator's outer ground
  const q = portalAt(a);
  assert.ok(Math.abs(distFromStart(q.x, q.z) - PORTAL_R) < 1e-6, 'the water lies on the portal ring');
  assert.ok(distFromStart(q.post.x, q.post.z) < PORTAL_R, 'the boss waits on the near side of the water');
  assert.ok(Math.hypot(q.post.x - q.x, q.post.z - q.z) < BOSS.wake + 200, 'its post is beside the way in');
  assert.ok(distFromStart(q.post.x, q.post.z) - BOSS.leash > RINGS.pred[1] + PRED_GROUND.r + PRED_GROUND.chase, `the boss's leash stays clear of the predator at ${d}°`);
}
// the portal is placed out of sight ahead: the first player to get PORTAL_PLACE out (past the last thicket ring)
assert.ok(PORTAL_PLACE > spans[2][2] && PORTAL_PLACE < bossFrom - 4000, `portal placed at ${PORTAL_PLACE} µm out`);
assert.ok(PORTAL_CLEAR >= 1200, 'an arena round the water');
// you can walk past the portal ring in every direction
assert.ok(BOUNDS.half >= PORTAL_R + 4000, 'the walkable square reaches past the portal ring');
const rp = ringPoint(PORTAL_R + 3000, Math.PI / 4);
assert.ok(Math.abs(rp.x) < BOUNDS.half && Math.abs(rp.z) < BOUNDS.half, 'past the portal ring diagonally too');

console.log(`ok: tile ${TILE} µm; ${CLUSTERS.length} thickets (${t1.length} + ${t2.length}); spans ${spans.map(([k, a, b]) => `${k} ${(a / 1000).toFixed(1)}-${(b / 1000).toFixed(1)} mm`).join(', ')}; calm ${gaps.map((g) => (g / 1000).toFixed(1)).join(', ')} mm; portal ${PORTAL_R / 1000} mm (~${(PORTAL_R / RUSH).toFixed(0)} s rushing)`);
