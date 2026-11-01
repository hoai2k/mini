// The amoeba's slide as rings round the start (the owner, 2026-11-01;
// ../../design/encounter-pattern.md): a warm-up of calm glass, then easy prey,
// fleeing ciliates, fungal traps and Chaos at the portal, spaced evenly and the
// same whichever way you crawl, with the slide running on in every direction.
//   node micro/prototypes/amoeba/route.test.mjs
import assert from 'node:assert/strict';
import { RINGS, PORTAL_R, PATCHES, trapLayout, TRAP_CLUSTERS, buildWorld, portalRoom, leafDist, LEAF, progressOf, ringPoint, segDist } from './world.js';
import { CHAOS_R, CHAOS_WAKE, CHAOS_LEASH } from './chaos.js';

const deg = (a) => `${Math.round((a * 180) / Math.PI)}°`;
const BEAR = Array.from({ length: 360 }, (_, i) => (i * Math.PI) / 180);
assert.equal(progressOf(...ringPoint(PORTAL_R, 1.2)).toFixed(9), (1).toFixed(9));

// spans along any bearing (µm from the start's centre) where each encounter lies
const easy = PATCHES.filter((P) => P.ring === 'easy'), cil = PATCHES.filter((P) => P.ring === 'ciliates');
const hy = trapLayout();
const hDist = (h, x, y) => segDist(x, y, h);
const tNear = Math.min(...hy.map((h) => { let d = Infinity; for (let t = -h.L / 2; t <= h.L / 2; t += 5) d = Math.min(d, Math.hypot(h.x + Math.cos(h.ang) * t, h.y + Math.sin(h.ang) * t)); return d; }));
const tFar = Math.max(...hy.map((h) => Math.hypot(h.x, h.y) + h.L / 2));
const spans = [
  ['easy prey', RINGS.easy - easy[0].r, RINGS.easy + easy[0].r],
  ['ciliates', RINGS.ciliates - cil[0].r, RINGS.ciliates + cil[0].r],
  ['traps', tNear, Math.max(...hy.map((h) => { let d = 0; for (let t = -h.L / 2; t <= h.L / 2; t += 5) d = Math.max(d, Math.hypot(h.x + Math.cos(h.ang) * t, h.y + Math.sin(h.ang) * t)); return d; }))],
  ['Chaos', RINGS.chaos - CHAOS_R, RINGS.portal],
];
void tFar;
// the warm-up: calm glass, a few seconds of crawling (~45 µm/s), the first encounter soon after
assert.ok(spans[0][1] >= RINGS.warm && spans[0][1] <= 600, `first encounter from ${spans[0][1]} µm`);
// a calm break after each encounter, and the breaks about even (not all held back to the second half)
const gaps = [];
for (let i = 1; i < spans.length; i++) {
  const gap = spans[i][1] - spans[i - 1][2];
  gaps.push(gap);
  assert.ok(gap >= 150 && gap <= 500, `${spans[i - 1][0]} -> ${spans[i][0]}: ${gap.toFixed(0)} µm calm`);
}
const starts = spans.map((s) => s[1]);
const steps = starts.slice(1).map((s, i) => s - starts[i]);
assert.ok(Math.max(...steps) / Math.min(...steps) < 1.9, `encounters spaced about evenly: ${steps.map(Math.round).join(', ')} µm apart`);
// Chaos wakes after the traps, not in them, and its leash keeps it near the portal
assert.ok(RINGS.chaos - CHAOS_WAKE > spans[2][2] - 60, `Chaos wakes at ${RINGS.chaos - CHAOS_WAKE} µm, the traps end at ${spans[2][2].toFixed(0)}`);
assert.ok(CHAOS_LEASH < RINGS.chaos - spans[2][2] + 500, 'Chaos does not chase you back through the traps');
// the portal ring: about a minute's straight crawling (~45 µm/s)
assert.ok(PORTAL_R / 45 > 50 && PORTAL_R / 45 < 70, `portal ring ${PORTAL_R} µm`);

// every way out meets each ring: within reach of a patch, close past a trap hypha
for (const a of BEAR) {
  const near = (list, R) => Math.min(...list.map((P) => Math.hypot(P.x - Math.cos(a) * R, P.y - Math.sin(a) * R) - P.r));
  assert.ok(near(easy, RINGS.easy) < 200, `an easy patch near the way out at ${deg(a)}`);
  assert.ok(near(cil, RINGS.ciliates) < 250, `a ciliate patch near the way out at ${deg(a)}`);
  let d = Infinity;
  for (let r = RINGS.traps - 250; r <= RINGS.traps + 250; r += 20) for (const h of hy) d = Math.min(d, hDist(h, Math.cos(a) * r, Math.sin(a) * r));
  assert.ok(d < 190, `a trap hypha (the cell is ~350 µm wide) ${d.toFixed(0)} µm from the way out at ${deg(a)}`);
}
// ... but there is a way between the clusters (a cell can squeeze through)
for (let k = 0; k < TRAP_CLUSTERS; k++) {
  const A = hy.filter((h) => h.cluster === k), B = hy.filter((h) => h.cluster === (k + 1) % TRAP_CLUSTERS);
  let gap = Infinity;
  for (const h of A) for (let t = -h.L / 2; t <= h.L / 2; t += 10) for (const g of B) gap = Math.min(gap, hDist(g, h.x + Math.cos(h.ang) * t, h.y + Math.sin(h.ang) * t));
  assert.ok(gap > 140, `clusters ${k} and ${(k + 1) % TRAP_CLUSTERS} ${gap.toFixed(0)} µm apart`);
}

// the portal (and Chaos) fit on the ring near every bearing, clear of the leaf
for (const a of BEAR) {
  let ok = false;
  for (let i = 0; i < 25 && !ok; i++) ok = portalRoom(a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.05);
  assert.ok(ok, `room for the portal within 35° of ${deg(a)}`);
}
assert.ok(!portalRoom(Math.PI + 0.11), 'not on the leaf');
assert.ok(leafDist(...ringPoint(RINGS.traps, Math.PI)) > 0);

// the slide: calm glass in the warm-up, nothing big where Chaos and the portal go,
// and objects in every direction out to RINGS.field (no empty edges)
const W = buildWorld(7);
const focus = W.obstacles.filter((o) => o.layer === 'focus' && o.type !== 'trap' && o.type !== 'leaf');
for (const o of focus) assert.ok(Math.hypot(o.x, o.y) > RINGS.warm, `${o.type} in the warm-up at ${Math.hypot(o.x, o.y).toFixed(0)} µm`);
for (const o of focus.filter((o) => o.type === 'spiro')) for (let t = -o.L / 2; t <= o.L / 2; t += 50) assert.ok(Math.hypot(o.x + Math.cos(o.ang) * t, o.y + Math.sin(o.ang) * t) > RINGS.portal + 300, 'filaments in focus only beyond the portal ring');
for (let s = 0; s < 12; s++) for (const [r0, r1] of [[RINGS.warm, 1500], [1500, 2600], [2600, 3500], [3500, RINGS.field]]) {
  const n = focus.filter((o) => { const a = (Math.atan2(o.y, o.x) + 2 * Math.PI) % (2 * Math.PI), d = Math.hypot(o.x, o.y); return a >= (s * Math.PI) / 6 && a < ((s + 1) * Math.PI) / 6 && d >= r0 && d < r1; }).length;
  assert.ok(n >= 1, `slide objects at ${s * 30}°-${s * 30 + 30}°, ${r0}-${r1} µm: ${n}`);
}
void LEAF;
console.log(`ok: encounters ${spans.map(([k, a, b]) => `${k} ${a.toFixed(0)}-${b.toFixed(0)}`).join(', ')}; calm ${gaps.map(Math.round).join('/')} µm; portal ${PORTAL_R} µm; ${focus.length} objects in focus`);
