// The way through the springtail's pool: a calm first half, then every
// challenge in turn, and the landmark up and to the right of the start.
//   node micro/prototypes/springtail/route.test.mjs
import assert from 'node:assert/strict';
import { START, LANDMARK, ROUTE_LEN, ZONES, SUNDEW_ISLANDS, ISLANDS, progressAt, poolE, inPool } from './world.js';

// the landmark is straight ahead (+x) and far: room for exploration, then the challenges
assert.ok(LANDMARK.x > START.x && Math.abs(LANDMARK.z - START.z) < 5, 'landmark straight ahead (+x) of the start');
assert.ok(ROUTE_LEN > 1100, `the way is long enough (${ROUTE_LEN.toFixed(0)} mm)`);
assert.ok(inPool(START.x, START.z) && poolE(START.x, START.z) < 0.8, 'the start is on open water, inside the pool');
assert.equal(progressAt(START.x, START.z), 0);
assert.ok(Math.abs(progressAt(LANDMARK.x, LANDMARK.z) - 1) < 1e-9);

// every challenge starts at or beyond halfway, in order
const reach = (Z) => progressAt(Z.x - Z.r - Z.leash, Z.z);
const order = [['rain', ZONES.rain], ['stenus', reach(ZONES.stenus)], ['strider', reach(ZONES.strider)], ['crowd', ZONES.crowd.from], ['sundew', ZONES.sundew.from], ['boss', ZONES.boss.from]];
for (const [k, u] of order) assert.ok(u >= 0.5, `${k} begins at ${u.toFixed(3)} of the way (>= 0.5)`);
for (let i = 1; i < order.length; i++) assert.ok(order[i][1] > order[i - 1][1], `${order[i][0]} comes after ${order[i - 1][0]}`);
for (const I of SUNDEW_ISLANDS) assert.ok(progressAt(I.x - I.r - 8, I.z) >= 0.5, 'sundews only in the second half');

// the first half is calm: no sundew island there, and the predators' water is beyond it
assert.ok(ISLANDS.filter((I) => I.sundew).every((I) => progressAt(I.x, I.z) > 0.8));
for (const k of ['stenus', 'strider', 'crowd']) assert.ok(inPool(ZONES[k].x, ZONES[k].z), `${k}'s water is open water`);

console.log(`ok: way ${ROUTE_LEN.toFixed(0)} mm; ${order.map(([k, u]) => `${k} ${(u * 100).toFixed(0)}%`).join(', ')}`);
