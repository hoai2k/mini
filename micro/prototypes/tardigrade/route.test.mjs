// The tardigrade's moss as rings round the start (the encounter pattern,
// micro/design/encounter-pattern.md): a spoke of leaves every 30° out to the
// portal ring, each one walkable leaf to leaf, the same encounters at the same
// distances on every spoke, short calm stretches between them, and the portal
// ring with room for the boss. Builds the world in Node (no browser).
//   node --test micro/prototypes/tardigrade/route.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { World, RINGS, SPOKES, tipU } from './world.js';

const world = new World({ add() {} });
const S = world.start;
const deg = (a) => Math.round((a * 180) / Math.PI);

test('a spoke every 30°, each walkable leaf to leaf out to the portal ring', () => {
  assert.equal(world.spokes.length, SPOKES);
  for (const sp of world.spokes) {
    // the hand-over: a body at the end of one leaf (or the shoot's exit) has its head over the next,
    // close enough for the claws (gait.js considerTransfer: 0.55 directly, 1.2 across a wet film)
    const hand = (L, u, v, hu, hv, M) => {
      const body = L.toWorld(u, v, L.thick / 2 + 0.3), head = L.toWorld(u + 2 * hu, v + 2 * hv, L.thick / 2);
      const loc = M.toLocal(head, {});
      return { inside: M.inside(loc.u, loc.v, 0.35), gap: Math.abs(loc.n) - M.thick / 2, above: M.toLocal(body, {}).n > 0, film: world.filmAt(M, loc.u, loc.v), filmHere: world.filmAt(L, u, v) };
    };
    const e = sp.exit;
    let hu = Math.cos(sp.a) * e.L.U.x + Math.sin(sp.a) * e.L.U.z, hv = Math.cos(sp.a) * e.L.V.x + Math.sin(sp.a) * e.L.V.z;
    const l = Math.hypot(hu, hv); hu /= l; hv /= l;
    const steps = [hand(e.L, e.u, e.v, hu, hv, sp.leaves[0])];
    for (let j = 0; j + 1 < sp.leaves.length; j++) steps.push(hand(sp.leaves[j], tipU(sp.leaves[j]), 0, 1, 0, sp.leaves[j + 1]));
    steps.forEach((h, j) => {
      const where = `spoke ${sp.k} (${deg(sp.a)}°) hand-over ${j}`;
      assert.ok(h.inside && h.above, `${where}: the head is over the next leaf's upper face`);
      assert.ok(h.gap < 0.55 || (h.gap < 1.2 && h.film > 0.12 && h.filmHere > 0.12), `${where}: gap ${h.gap.toFixed(2)}`);
    });
    // it keeps to its bearing, and its rim leaf's tip is on the portal ring
    for (const L of sp.leaves) for (let u = 1; u < L.len; u += 2) {
      const p = L.toWorld(u, 0, 0), off = Math.atan2(Math.sin(world.bearing(p) - sp.a), Math.cos(world.bearing(p) - sp.a));
      assert.ok(Math.abs(off) < 0.2 || world.radius(p) < 20, `spoke ${sp.k} strays ${deg(off)}° off its bearing at ${world.radius(p).toFixed(0)}`);
    }
    const rim = sp.leaves.at(-1);
    assert.ok(rim.pool && rim.kind === 'sphagnum', 'the rim leaf dips into the pool');
    const portal = world.radius(rim.toWorld(rim.len - 2.6, 0, 0));
    assert.ok(Math.abs(portal - RINGS.portal) < 1.5, `spoke ${sp.k}: portal at ${portal.toFixed(1)}`);
    // the boss's arena: its post and the leaf before it on the same rim leaf
    assert.ok(rim.len - 2.6 - RINGS.post - 8.5 > 0.5, `spoke ${sp.k}: room for Prionchulus to be lured off its post (${rim.len.toFixed(1)})`);
  }
});

test('every bearing is within 15° of a spoke', () => {
  for (let d = 0; d < 360; d++) {
    const a = (d * Math.PI) / 180;
    const off = Math.min(...world.spokes.map((sp) => Math.abs(Math.atan2(Math.sin(a - sp.a), Math.cos(a - sp.a)))));
    assert.ok(off <= Math.PI / 12 + 1e-9, `${d}°`);
  }
});

test('the same encounters at the same distances on every spoke, with calm stretches between', () => {
  const M = RINGS.milnesium;
  for (const sp of world.spokes) {
    const z = world.spokeAt(sp.k, M.ring, 2);
    assert.ok(z && Math.abs(world.radius(z.p) - M.ring) < 1, `spoke ${sp.k}: Milnesium's water at ${world.radius(z.p).toFixed(1)}`);
    // the meadow band fits on one leaf at the meadow ring
    const mid = world.spokeAt(sp.k, (RINGS.meadow[0] + RINGS.meadow[1]) / 2, 2);
    assert.ok(mid && mid.leaf.spoke === sp.k && tipU(mid.leaf) - 1 - 1.4 >= RINGS.meadow[1] - RINGS.meadow[0], `spoke ${sp.k}: meadow leaf`);
    // two or three dry patches across the dry ring, staggered (a wet way between them)
    const dry = sp.leaves.flatMap((L) => L.dry.map((d) => ({ L, d, r: world.radius(L.toWorld(d.u, 0, 0)) })));
    assert.ok(dry.length >= 2, `spoke ${sp.k}: ${dry.length} dry patches`);
    for (const { L, d, r } of dry) {
      assert.ok(r > RINGS.dry[0] - 0.5 && r < RINGS.dry[1] + 0.5, `spoke ${sp.k}: dry patch at ${r.toFixed(1)}`);
      assert.ok(world.filmAt(L, d.u, d.v) < 0.03, 'a dry patch is dry');
      assert.ok(world.filmAt(L, d.u, -Math.sign(d.v) * L.hwAt(d.u) * 0.6) > 0.03, 'the other side of it is wet');
    }
  }
  // spans along any spoke (units of 100 µm from the start): where each reaches you, where it lets go
  const spans = [
    ['Milnesium', M.ring - M.r, M.ring + M.r + M.leash],
    ['meadow', RINGS.meadow[0], RINGS.meadow[1]],
    ['dry patches', RINGS.dry[0], RINGS.dry[1]],
    ['Prionchulus', RINGS.portal - RINGS.post - 6.5, RINGS.portal],
  ];
  assert.ok(RINGS.warm <= spans[0][1], 'warm-up before the first encounter');
  assert.ok(spans[0][1] >= 10 && spans[0][1] <= 20, `first encounter from ${spans[0][1]} (about a screen out)`);
  for (let i = 1; i < spans.length; i++) {
    const gap = spans[i][1] - spans[i - 1][2];
    assert.ok(gap >= 3 && gap <= 14, `${spans[i - 1][0]} -> ${spans[i][0]}: ${gap} calm`);
  }
  // spaced roughly evenly from the warm-up to the boss
  const starts = spans.map((s) => s[1]), d = starts.slice(1).map((x, i) => x - starts[i]);
  assert.ok(Math.max(...d) / Math.min(...d) < 1.8, `starts ${starts.join(', ')}`);
  console.log(`ok: ${world.leaves.length} leaves, ${SPOKES} spokes; ${spans.map(([k, a, b]) => `${k} ${a}-${b}`).join(', ')}; portal ${RINGS.portal} (×100 µm)`);
});

test('the start is calm and the film never runs out by itself', () => {
  assert.ok(world.radius(S) < 1e-9);
  assert.equal(world.dry, world.dry0);
  // nothing in the shoot round the start is dry
  for (const L of world.shoot) for (let u = 1; u < L.len - 1; u += 0.5) assert.ok(L.dry.length === 0 && world.filmAt(L, u, 0) > 0.03, `${L.name} is wet at ${u}`);
});
