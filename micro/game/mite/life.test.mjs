// The small springtails never pop in or out of view (the owner, 2026-11-04: "the other insects sometimes seem
// to disappear. Can we prevent random disappearance? Either it's eaten or if it somehow burrows in the ground
// ... then it should look like that's happening with particles"). Without a browser: life.js createAmbient is
// stepped along a walk with a view (a rectangle round the walker, as main.js passes inSight), zooming out and
// in, through the groups, pushing them, grabbing one and eating it; every springtail drawn in view one frame is
// drawn the next (or is diving into the moss, or in the jaws), none moves faster than MAXV µm/s (no jump), a
// group must dive out of view with crumbs, and an eaten one comes back climbing out of the moss.
//   node --test micro/game/mite/life.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.min.js';
import { createAmbient } from './life.js';
import { insideEdge, toCorridor } from './layout.js';

const scene = { add() {}, remove() {} };
const tex = { cuticle: null };
const DT = 1 / 30;

/** A view: what a camera framing (x, z) at half width hw sees (a rectangle, a little deeper than wide). */
const view = (x, z, hw) => ({ x, z, hw, inSight: (px, pz, r) => Math.abs(px - x) < hw + r && Math.abs(pz - z) < hw * 1.3 + r });

/** Walk `seconds` along a path, the view on the walker; check every springtail in view stays drawn and never jumps. */
function walk(amb, { seconds, at, hw = () => 900, push = null, onFrame = null }) {
  let prev = new Map(), t = 0;
  const out = { frames: 0, inView: 0, popped: [], jumps: [], fastest: 0, dives: 0, rises: 0, crumbs: 0 };
  for (; t < seconds; t += DT) {
    const p = at(t), V = view(p.x, p.z, hw(t));
    amb.update(t, [p], [{ x: p.x, z: p.z }, { x: V.x, z: V.z, r: Math.max(amb.DRAW, 1.25 * V.hw * 2 + 1800) }], V.inSight);
    out.crumbs += amb.events.length;
    if (push) push(amb, p, t);
    const now = new Map(amb.live.map((b) => [b.key, b]));
    for (const [k, b] of prev) {
      if (!V.inSight(b.x, b.z, 0)) continue;
      out.inView++;
      const n = now.get(k);
      if (!n) { if (!(b.dive > 0.9) && !b.held) out.popped.push({ k, t: +t.toFixed(2), x: Math.round(b.x), z: Math.round(b.z), dive: b.dive }); continue; }
      const v = Math.hypot(n.x - b.x, n.z - b.z) / DT;
      if (!n.held && !b.held) { out.fastest = Math.max(out.fastest, v); if (v > amb.MAXV + 2 / DT) out.jumps.push({ k, t: +t.toFixed(2), v: Math.round(v) }); }
    }
    if (onFrame) onFrame(amb, p, t, V);
    prev = now; out.frames++;
  }
  out.dives = amb.stats.dives; out.rises = amb.stats.rises;
  return out;
}

test('walking through the groups, zooming out and in: nothing in view vanishes or jumps', () => {
  const amb = createAmbient({ scene, tex });
  // a zigzag through the moss near the start, the view zooming from a 1.6 mm field to 4.2 mm and back
  const r = walk(amb, {
    seconds: 60,
    at: (t) => ({ x: -1200 * Math.sin(t * 0.21) - 400 * t * 0.3, z: 900 * t * 0.3 + 1500 * Math.sin(t * 0.13) }),
    hw: (t) => 800 + 1300 * (0.5 - 0.5 * Math.cos(t * 0.4)),
  });
  assert.ok(r.inView > 2000, `springtails were in view (${r.inView} springtail-frames)`);
  assert.deepEqual(r.popped, [], 'none in view vanished between frames');
  assert.deepEqual(r.jumps, [], `none jumped (fastest ${r.fastest.toFixed(0)} µm/s; MAXV ${amb.MAXV})`);
});

test('pushed about (as main.js does with shared/push.js), they move with the push, never jump, and stay on their path back', () => {
  const amb = createAmbient({ scene, tex });
  const s = amb.sitesNear(-2000, 4000, 4000)[0];
  assert.ok(s, 'a group near the route');
  // the walker goes straight through the group, shoving each springtail it overlaps out of its 180 µm disc
  const r = walk(amb, {
    seconds: 8,
    at: (t) => ({ x: s.x - 1500 + 400 * t, z: s.z }),
    push: (A, p) => { for (const b of A.live) { const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz); if (d < 180 && d > 1) A.pushBy(b.key, (dx / d) * (180 - d), (dz / d) * (180 - d)); } },
  });
  assert.deepEqual(r.popped, []);
  assert.deepEqual(r.jumps, []);
  // afterwards each offset fades: they walk back to graze (a third left after RETURN s)
  const before = [...amb.offs.values()].reduce((m, o) => Math.max(m, Math.hypot(o.ox, o.oz)), 0);
  for (let t = 8; t < 14; t += DT) amb.update(t, [], [{ x: s.x, z: s.z }]);
  const after = [...amb.offs.values()].reduce((m, o) => Math.max(m, Math.hypot(o.ox, o.oz)), 0);
  assert.ok(after < before * 0.2, `their offsets fade (${before.toFixed(0)} -> ${after.toFixed(0)} µm)`);
});

test('a group that must go while seen dives into the moss in a puff of crumbs; one that must come climbs out', () => {
  // the portal's arena is placed over a group in view (life.js blocked): it may not simply vanish
  let block = null;
  const amb = createAmbient({ scene, tex, blocked: (x, z) => block && Math.hypot(x - block.x, z - block.z) < 1500 });
  const s = amb.sitesNear(-2000, 4000, 4000)[0];
  const p = { x: s.x + 200, z: s.z - 300 };
  const V = view(p.x, p.z, 1600);
  for (let t = 0; t < 1; t += DT) amb.update(t, [], [p], V.inSight);
  const keys = () => amb.live.filter((b) => b.key.startsWith(`${s.k}:`));
  assert.ok(keys().length >= 3, 'the group is drawn');
  block = { x: s.x, z: s.z };
  let t = 1, sawDive = 0, crumbs = 0;
  for (; t < 1 + amb.DIVE + 0.3; t += DT) {
    amb.update(t, [], [p], V.inSight);
    crumbs += amb.events.filter((e) => e.type === 'dive').length;
    for (const b of keys()) sawDive = Math.max(sawDive, b.dive);
    if (keys().length === 0) break;
  }
  assert.ok(crumbs >= 3, `crumbs where each dives (${crumbs})`);
  assert.ok(sawDive > 0.9, `they sank into the moss before they went (${sawDive.toFixed(2)})`);
  assert.equal(keys().length, 0, 'then they are gone');
  assert.ok(t - 1 >= amb.DIVE - 1e-6, `not at once: over ${(t - 1).toFixed(2)} s`);
  // the view still on the spot: it does not pop back
  for (let k = 0; k < 30; k++) { t += DT; amb.update(t, [], [p], V.inSight); }
  assert.equal(keys().length, 0, 'it stays away while the spot is in view');
});

test('one grab: it is held and eaten in the jaws, its group leaps away; another climbs out of the moss later', () => {
  const amb = createAmbient({ scene, tex });
  const s = amb.sitesNear(-2000, 4000, 4000)[0];
  const p = { x: s.x, z: s.z };
  const V = view(p.x, p.z, 1600);
  for (let t = 0; t < 1; t += DT) amb.update(t, [], [p], V.inSight);
  const b = amb.live.find((q) => q.key.startsWith(`${s.k}:`));
  assert.ok(amb.grab(b.key, b.x - 200, b.z), 'grabbed with one press');
  assert.ok(amb.scatters.has(s.k), 'its group leaps away');
  let t = 1;
  const mouth = new THREE.Vector3(b.x - 120, b.y + 40, b.z);
  for (let u = 0; u <= 1; u += 0.05) { t += DT; amb.hold(b.key, mouth, 1 - u); amb.update(t, [], [p], V.inSight); assert.ok(amb.live.some((q) => q.key === b.key && q.held), 'drawn in the jaws while eaten'); }
  amb.eaten(b.key);
  t += DT; amb.update(t, [], [p], V.inSight);
  assert.ok(!amb.live.some((q) => q.key === b.key), 'eaten: gone');
  // 40 s later another wanders into its place: it climbs out of the moss (crumbs), not popping up
  let rose = null, crumbs = 0;
  for (; t < 50; t += DT) {
    amb.update(t, [], [p], V.inSight);
    crumbs += amb.events.filter((e) => e.type === 'rise').length;
    const q = amb.live.find((x) => x.key === b.key);
    if (q && rose === null) rose = q.dive;
  }
  assert.ok(rose !== null && rose > 0.9, `it comes back from under the moss (sunk ${rose && rose.toFixed(2)} on its first frame)`);
  assert.ok(crumbs >= 1, 'in a puff of crumbs');
});

test('the groups lie only inside the corridor', () => {
  const amb = createAmbient({ scene, tex });
  for (let a = -9000; a < 74000; a += 6000) for (let c = -9000; c <= 9000; c += 3000) {
    const x = -0.43244 * a + 0.90166 * c, z = 0.90166 * a + 0.43244 * c;
    for (const s of amb.sitesNear(x, z, 3000)) assert.ok(insideEdge(s.x, s.z, 400), `site at a ${toCorridor(s.x, s.z).a.toFixed(0)} c ${toCorridor(s.x, s.z).c.toFixed(0)}`);
  }
});
