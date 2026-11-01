// The way through the springtail's pool: a short warm-up, then each
// challenge in turn with a calm stretch between, and the landmark straight ahead.
//   node micro/prototypes/springtail/route.test.mjs
import assert from 'node:assert/strict';
import { START, LANDMARK, ROUTE_LEN, ZONES, SUNDEW_ISLANDS, ISLANDS, progressAt, poolE, inPool } from './world.js';

// the landmark is straight ahead (+x), at a distance paced as a rhythm (the owner,
// 2026-11-01): a short warm-up, then challenge, calm stretch, challenge ... boss
assert.ok(LANDMARK.x > START.x && Math.abs(LANDMARK.z - START.z) < 5, 'landmark straight ahead (+x) of the start');
assert.ok(ROUTE_LEN > 600 && ROUTE_LEN < 850, `the way is about a minute's rush (${ROUTE_LEN.toFixed(0)} mm)`);
assert.ok(inPool(START.x, START.z) && poolE(START.x, START.z) < 0.8, 'the start is on open water, inside the pool');
assert.equal(progressAt(START.x, START.z), 0);
assert.ok(Math.abs(progressAt(LANDMARK.x, LANDMARK.z) - 1) < 1e-9);

// each challenge as a stretch of the way (mm from the start): where it reaches you, where it lets go
const d = (x) => x - START.x;
const S = ZONES.stenus, R = ZONES.strider, C = ZONES.crowd;
const spans = [
  ['Stenus', d(S.x - S.r - S.leash), d(S.x + S.r + S.leash)],
  ['strider and mass', Math.min(d(R.x - R.r - R.leash), d(C.x - C.r - 20)), d(R.x + R.r + R.leash)],
  ['sundews', d(ZONES.sundew.x - 30), Math.max(...SUNDEW_ISLANDS.map((I) => d(I.x + I.r + 8)))],
  ['boss', ZONES.boss.from * ROUTE_LEN, ROUTE_LEN],
];
// the first challenge comes after a few seconds of moving (~80-150 mm: ~6-10 s of jumping)
assert.ok(spans[0][1] >= 80 && spans[0][1] <= 150, `first challenge at ${spans[0][1].toFixed(0)} mm`);
// a short calm stretch between challenges: a break, not a long trek
for (let i = 1; i < spans.length; i++) {
  const gap = spans[i][1] - spans[i - 1][2];
  assert.ok(gap >= 45 && gap <= 130, `${spans[i - 1][0]} -> ${spans[i][0]}: ${gap.toFixed(0)} mm calm`);
}
// the order holds, and the rain starts with the second challenge
const order = [['stenus', progressAt(S.x - S.r - S.leash, S.z)], ['rain', ZONES.rain], ['crowd', ZONES.crowd.from], ['sundew', ZONES.sundew.from], ['boss', ZONES.boss.from]];
for (let i = 1; i < order.length; i++) assert.ok(order[i][1] >= order[i - 1][1], `${order[i][0]} comes after ${order[i - 1][0]}`);
assert.ok(ZONES.rain * ROUTE_LEN > spans[0][2], 'no rain over the first challenge');

// sundews only in their own band, near the bank; the predators' water is open water
assert.ok(ISLANDS.filter((I) => I.sundew).every((I) => progressAt(I.x, I.z) > 0.75));
for (const k of ['stenus', 'strider', 'crowd']) assert.ok(inPool(ZONES[k].x, ZONES[k].z), `${k}'s water is open water`);

console.log(`ok: way ${ROUTE_LEN.toFixed(0)} mm; ${spans.map(([k, a, b]) => `${k} ${a.toFixed(0)}-${b.toFixed(0)}`).join(', ')}`);
