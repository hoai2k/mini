// The springtail's pool and its encounters, without a browser: the scenery
// (islands, sundews scattered at every distance), and the director placing
// the encounters (world.js ENCOUNTERS: Stenus, the strider and its Podura
// mass, the rain, the wolf spider and the portal) as a player rushes out in
// 16 directions or stands still. The view is a wedge like the low macro
// view (it sees the film from ~37 mm before the springtail to ~55 mm
// beyond, ~40 mm across), looking along the starting camera's yaw.
//   node micro/prototypes/springtail/route.test.mjs
import assert from 'node:assert/strict';
import { createDirector } from '../shared/director.js';
import { START, ZONES, SUNDEW_ISLANDS, SUNDEW_CLUSTERS, ISLANDS, PORTAL, DIRECTOR, ENCOUNTERS, canPlace, inPool, poolE, islandEdge, distFromStart, setZoneAt, parkZone, inReach, setPortal, clearPortal } from './world.js';

assert.ok(inPool(START.x, START.z) && poolE(START.x, START.z) < 0.3, 'the start is on open water, mid-pool');
assert.ok(ISLANDS.length <= 72, `island count ${ISLANDS.length} (the water shader unrolls them)`);
assert.deepEqual(ENCOUNTERS.map((e) => e.id), ['stenus', 'strider', 'rain', 'portal'], 'the order');
assert.ok(ENCOUNTERS.at(-1).final);

// sundews are scenery, scattered at every distance and on every side
assert.equal(new Set(SUNDEW_ISLANDS.map((I) => I.cluster)).size, SUNDEW_CLUSTERS);
const mids = SUNDEW_ISLANDS.filter((I) => I.k === 1);
const ds = mids.map((I) => distFromStart(I.x, I.z));
assert.ok(Math.min(...ds) < 90 && Math.max(...ds) > 380, `sundews from ${Math.min(...ds).toFixed(0)} to ${Math.max(...ds).toFixed(0)} mm out`);
for (let q = 0; q < 4; q++) assert.ok(mids.some((I) => Math.floor(((Math.atan2(I.z - START.z, I.x - START.x) + Math.PI) / (Math.PI / 2)) % 4) === q), `sundews in quadrant ${q}`);
for (const I of SUNDEW_ISLANDS) {
  assert.ok(poolE(I.x, I.z) < 0.9, 'sundew islands well inside the bank');
  for (const J of ISLANDS) if (I !== J) assert.ok(Math.hypot(I.x - J.x, I.z - J.z) > I.r + J.r + 4, 'islands stand apart');
}
assert.ok(SUNDEW_ISLANDS.every((I) => distFromStart(I.x, I.z) > 30), 'no sundew on the start');

// ---- the director with the springtail's settings and a fake world
const DT = 1 / 30;
const YAW = Math.PI - Math.PI / 6; // main.js rig.yaw: the camera sits this way from its target
function view(x, z) {
  const a = YAW + Math.PI, back = 183, h = 0.13, reach = 55;
  const cx = x - Math.cos(a) * back, cz = z - Math.sin(a) * back;
  const plane = (ang) => { const nx = -Math.sin(ang), nz = Math.cos(ang); return [nx, 0, nz, -(nx * cx + nz * cz)]; };
  const fx = Math.cos(a), fz = Math.sin(a);
  return { frustum: [plane(a - h), plane(a + h).map((v) => -v), [fx, 0, fz, -(fx * cx + fz * cz) - (back - 37)], [-fx, 0, -fz, fx * cx + fz * cz + back + reach]], focus: { x, y: 0, z } };
}
function game({ seconds, move }) {
  for (const k of ['stenus', 'strider', 'crowd']) parkZone(k);
  clearPortal();
  const bad = [];
  let D;
  const place = (id) => (x, z, b) => {
    if (id !== 'rain' && D.visibleNow(x, 0, z, ENCOUNTERS.find((e) => e.id === id).visible ?? 0)) bad.push(`${id} placed in view`);
    if (id === 'stenus') setZoneAt('stenus', x, z, b);
    if (id === 'strider') { setZoneAt('strider', x, z, b); setZoneAt('crowd', x, z, b); }
    if (id === 'portal') setPortal(x, z, b);
    return { x, z };
  };
  const met = {
    stenus: (h, [p]) => inReach('stenus', p.x, p.z),
    strider: (h, [p]) => inReach('strider', p.x, p.z) || inReach('crowd', p.x, p.z),
    rain: () => true,
    portal: (h, [p]) => Math.hypot(p.x - PORTAL.x, p.z - PORTAL.z) < PORTAL.reach,
  };
  D = createDirector({ ...DIRECTOR, canPlace, entries: ENCOUNTERS.map((e) => ({ ...e, place: place(e.id), met: met[e.id] })) });
  const p = { id: 0, x: START.x, z: START.z };
  const ev = [];
  let striderT = null;
  for (let t = 0; t < seconds && !D.done; t += DT) {
    move(t, p, D);
    const out = D.update(DT, [p], [view(p.x, p.z)]);
    ev.push(...out);
    // main.js driftStrider: a strider placed out of a lingering player's reach rows over (4 mm/s, after 5 s)
    const S = D.entry('strider');
    if (S.state === 'placed') {
      striderT ??= t;
      const Z = ZONES.strider, d = Math.hypot(p.x - Z.x, p.z - Z.z);
      if (t - striderT > 5 && !D.state().leader.moving && !inReach('strider', p.x, p.z)) { Z.x += ((p.x - Z.x) / d) * 4 * DT; Z.z += ((p.z - Z.z) / d) * 4 * DT; }
    }
  }
  return { ev, bad, D };
}
const at = (ev, type, id) => ev.find((e) => e.type === type && e.id === id);
const times = [];
for (let k = 0; k < 16; k++) {
  let a = (k / 16) * Math.PI * 2;
  const r = game({ seconds: 120, move: (t, p, D) => {
    // rush out with tap jumps (~15 mm/s); at the bank turn back in; once the portal is placed, make for it
    if (PORTAL.placed) a = Math.atan2(PORTAL.z - p.z, PORTAL.x - p.x);
    // round an island (or back off the bank) by turning until the way is clear
    for (let i = 0; i < 12; i++) {
      const b = a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5;
      const nx = p.x + Math.cos(b) * 15 * DT, nz = p.z + Math.sin(b) * 15 * DT;
      if (poolE(nx, nz) > 0.9 && !PORTAL.placed) { a += 2.2; return; }
      if (poolE(nx, nz) < 0.97 && (islandEdge(nx, nz).d > 0.5 || (PORTAL.placed && Math.hypot(PORTAL.x - nx, PORTAL.z - nz) < PORTAL.r))) { p.x = nx; p.z = nz; return; }
    }
  } });
  const tag = `bearing ${k * 22.5}`;
  assert.deepEqual(r.bad, [], tag);
  assert.deepEqual(r.ev.filter((e) => e.type === 'met').map((e) => e.id), ['stenus', 'strider', 'rain', 'portal'], `${tag}: every encounter, in order`);
  for (const e of r.ev.filter((x) => x.type === 'placed' || x.type === 'moved')) {
    const spec = ENCOUNTERS.find((s) => s.id === e.id);
    if (spec.fits) assert.ok(spec.fits(e.x, e.z, e.b), `${tag}: ${e.id} on open water`);
  }
  const T = { stenusPlaced: at(r.ev, 'placed', 'stenus').t, stenus: at(r.ev, 'met', 'stenus').t, strider: at(r.ev, 'met', 'strider').t, rain: at(r.ev, 'met', 'rain').t, portalPlaced: at(r.ev, 'placed', 'portal').t, portal: at(r.ev, 'met', 'portal').t };
  assert.ok(T.stenusPlaced >= 3, `${tag}: a warm-up first (${T.stenusPlaced} s)`);
  assert.ok(T.stenus <= 10, `${tag}: Stenus within ~10 s (${T.stenus} s)`);
  assert.ok(T.strider - T.stenus >= 4, `${tag}: a calm break before the strider`);
  assert.ok(T.portal <= 75, `${tag}: the portal reached within ~a minute (${T.portal} s)`);
  times.push(T);
}
const span = (k) => `${Math.min(...times.map((t) => t[k])).toFixed(1)}-${Math.max(...times.map((t) => t[k])).toFixed(1)} s`;

// ---- lingering at the start: the encounters still come, one by one, and the portal near them (then they go to it)
const r1 = (() => {
  let portalT = null;
  const r = game({ seconds: 300, move: (t, p, D) => {
    const s = D.state();
    if (s.current === 'portal' && s.phase === 'placed') { portalT ??= t; if (t - portalT > 2) { const a = Math.atan2(PORTAL.z - p.z, PORTAL.x - p.x); p.x += Math.cos(a) * 15 * DT; p.z += Math.sin(a) * 15 * DT; } }
  } });
  return r;
})();
assert.deepEqual(r1.bad, []);
assert.deepEqual(r1.ev.filter((e) => e.type === 'met').map((e) => e.id), ['stenus', 'strider', 'rain', 'portal'], 'lingering: every encounter in order');
const lp = at(r1.ev, 'placed', 'portal');
assert.ok(Math.hypot(lp.x - START.x, lp.z - START.z) < 80, 'lingering: the portal comes to them');
for (const e of r1.ev.filter((x) => x.type === 'placed' && x.id !== 'rain')) assert.ok(['near', 'wider'].includes(e.how) && Math.hypot(e.x - START.x, e.z - START.z) < 160, `lingering: ${e.id} placed round them (${e.how}, ${Math.hypot(e.x - START.x, e.z - START.z).toFixed(0)} mm)`);

console.log(`ok: ${ISLANDS.length} islands, ${SUNDEW_CLUSTERS} sundew clusters ${Math.min(...ds).toFixed(0)}-${Math.max(...ds).toFixed(0)} mm out; rushing in 16 directions: Stenus placed ${span('stenusPlaced')}, met ${span('stenus')}, strider ${span('strider')}, rain ${span('rain')}, portal placed ${span('portalPlaced')}, reached ${span('portal')}; lingering: ${r1.ev.filter((e) => e.type === 'placed' || e.type === 'met').map((e) => `${e.id} ${e.type} ${e.t} s${e.how && e.type === 'placed' ? ` (${e.how})` : ''}`).join(', ')}`);
