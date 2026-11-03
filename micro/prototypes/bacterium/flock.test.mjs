// The bacterium's army, headless (no page, no GPU): the flock, the beacon, eating
// and the gates, stepped with the real world, swimmer, collective and guards.
//   node micro/prototypes/bacterium/flock.test.mjs
import assert from 'node:assert/strict';
import { createWorld } from './world.js';
import { createSwimmer } from './swim.js';
import { createCollectives } from './collective.js';
import { createStentor } from './stentor.js';
import { createGuards } from './guards.js';

function setup(hooks = {}) {
  const world = createWorld();
  const stentor = createStentor();
  world.stentor = stentor;
  const coll = createCollectives(world, hooks);
  world.coll = coll;
  const sw = createSwimmer(world);
  sw.reset('mtb');
  const P = { slot: 0, S: sw.state, dash: { active: false } };
  coll.reset([P]);
  const guards = createGuards(world, coll, stentor);
  let t = 0;
  const dt = 1 / 60;
  const step = (n, steer = null) => {
    for (let i = 0; i < n; i++) {
      const inputs = { 0: { steer: steer ? { ...steer } : null, dashActive: false } };
      coll.pre(dt, t, [P], inputs);
      sw.step(dt, t, inputs[0], {});
      world.update(dt, t, P.S);
      coll.post(dt, t, [P]);
      guards.update(dt, t, [P]);
      t += dt; world.time = t;
    }
  };
  const fill = (n) => { for (let i = 0; i < 80 && coll.of(P).members.length < n; i++) coll.adopt(P, P.S.x + Math.cos(i * 2.4) * (1.5 + 0.35 * i), P.S.y + Math.sin(i * 2.4) * (1.5 + 0.35 * i), i); };
  const move = (x, y) => { const C = coll.of(P), dx = x - P.S.x, dy = y - P.S.y; for (const m of C.members) { m.x += dx; m.y += dy; } P.S.x = x; P.S.y = y; };
  return { world, stentor, coll, guards, P, step, fill, move, get t() { return t; } };
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const R = { x: 1, y: 0, m: 1 };

// --- a lone cell: the tilt sets the speed, release stops it, the spin follows the speed ---
{
  const { P, step } = setup();
  step(40, R);
  assert.ok(P.S.speed > 40, `full tilt runs (${P.S.speed})`);
  let b = P.S.bodyPhase; step(30, R); const spinRun = (P.S.bodyPhase - b) / 0.5;
  step(40, { x: 1, y: 0, m: 0.3 });
  assert.ok(P.S.speed > 8 && P.S.speed < 20, `a slight tilt drifts slowly (${P.S.speed})`);
  b = P.S.bodyPhase; step(30, { x: 1, y: 0, m: 0.3 }); const spinSlow = (P.S.bodyPhase - b) / 0.5;
  step(20);
  assert.ok(P.S.speed < 0.5, `released, it stops (${P.S.speed})`);
  b = P.S.bodyPhase; const f = P.S.flPhase; step(30);
  assert.ok(spinRun > 2 * spinSlow && P.S.bodyPhase === b && P.S.flPhase === f, `spin tracks speed (run ${spinRun.toFixed(0)}, slow ${spinSlow.toFixed(0)} rad/s, still when stopped)`);
}

// --- the beacon: no joining by touch; X calls the kin in reach, one by one; far kin stay free ---
{
  const { coll, P, step } = setup();
  const free = coll.kin.filter((k) => !k.coll);
  for (const k of free.slice(4)) if (Math.hypot(k.x - P.S.x, k.y - P.S.y) < 60) k.x = k.hx = P.S.x - 150;
  free.slice(0, 3).forEach((k, i) => { k.x = k.hx = P.S.x + 1.5 + i; k.y = k.hy = P.S.y + (i - 1) * 1.4; });
  const far = free[3]; far.x = far.hx = P.S.x + 30; far.y = far.hy = P.S.y;
  step(30);
  assert.equal(coll.of(P).members.length, 0, 'kin touching the cell do not join by themselves');
  assert.ok(coll.beacon(P, 100), 'X sends a beacon');
  assert.equal(coll.beacon(P, 100.1), null, 'one beacon every 0.3 s');
  const joins = [];
  for (let i = 0; i < 60; i++) { step(1); joins.push(coll.of(P).members.length); }
  assert.equal(coll.of(P).members.length, 3, 'the three kin in reach answer and join');
  assert.ok(!far.coll, 'a kin cell 30 µm off does not');
  assert.ok(joins.indexOf(3) - joins.indexOf(1) >= 6, `the answers come one after another (${joins.indexOf(1)}, ${joins.indexOf(2)}, ${joins.indexOf(3)} steps)`);
}

// --- the flock of 40: not lock-step (heading up, away from the gates' first bearing) ---
const UP = { x: 0, y: 1, m: 1 };
{
  const { coll, P, step, fill, move } = setup();
  move(0, 0); fill(40); step(180);
  const C = coll.of(P);
  assert.equal(C.members.length, 40);
  const movingAt = [];
  for (let i = 0; i < 40; i++) { step(1, UP); movingAt.push(C.members.filter((m) => m.vy > 15).length / 40); }
  assert.ok(movingAt[9] < 0.2 && movingAt[39] > 0.8 && movingAt[24] > movingAt[14], `the front moves first and the rest follow (${[9, 14, 24, 39].map((i) => movingAt[i].toFixed(2))})`);
  step(80, UP);
  const sp = C.members.map((m) => m.sp), hd = C.members.map((m) => Math.atan2(Math.sin(m.a), Math.cos(m.a)));
  assert.ok(sd(sp) > 1.5 && sd(hd) > 0.04, `each its own speed and heading (sd ${sd(sp).toFixed(1)} µm/s, ${sd(hd).toFixed(2)} rad)`);
  assert.ok(C.speed > 30, `the flock cruises (${C.speed.toFixed(0)} µm/s)`);
  const when = C.members.map(() => null);
  for (let i = 0; i < 90; i++) { step(1, { x: 0, y: -1, m: 1 }); C.members.forEach((m, j) => { if (when[j] === null && m.vy < -10) when[j] = i / 60; }); }
  const w = when.filter((x) => x !== null).sort((a, b) => a - b);
  assert.ok(w.length >= 36 && w[w.length - 1] - w[0] > 0.3, `they turn round bit by bit (${w.length} turned, first ${w[0].toFixed(2)} s, last ${w[w.length - 1].toFixed(2)} s)`);
  step(240);
  assert.ok(mean(C.members.map((m) => m.sp)) < 1, 'released, the flock settles and stops');
  const b0 = C.members.map((m) => m.bodyPhase); step(30);
  const spins = C.members.map((m, i) => Math.abs(m.bodyPhase - b0[i]) / 0.5).sort((a, b) => b - a);
  assert.ok(spins[2] < 2, `stopped cells barely spin (${spins.slice(0, 4).map((x) => x.toFixed(1))} rad/s)`);
  const f = coll.focus(P);
  assert.ok(f && Math.hypot(f.x - C.cx, f.y - C.cy) < 3, 'the camera follows the flock middle');
}

// --- X eats: a prey rod in reach of a member is lysed, one out of reach is not ---
{
  const { world, coll, P, step, fill } = setup();
  fill(10); step(60);
  const C = coll.of(P), m = C.members[5];
  const rods = world.cells.filter((c) => c.kind === 'rod' && !c.lysed && !c.ghost && !c.attachedBy && !c.bdelloplast);
  rods[0].x = m.x + 1.2; rods[0].y = m.y; rods[1].x = C.cx + C.extent + 25; rods[1].y = C.cy;
  const g0 = m.growth;
  const got = coll.eat(P);
  assert.ok(got.includes(rods[0]) && !got.includes(rods[1]) && rods[0].lysed > 0, 'X lyses prey in reach only');
  assert.ok(m.growth > g0, 'the member that took it grows toward dividing');
}

// --- a gate: a lone cell cannot wear the first peritrich down; an army of 12 can ---
{
  const { coll, guards, P, step, fill, move } = setup();
  const G = guards.byId.grazer1; guards.placeGate(G, 110, 0, 0); // (where the director would put it: here 110 µm out, met heading +x)
  const at = guards.centre(G), g = G.g;
  move(at.x - g.R * 1.05, at.y);
  for (let i = 0; i < 6 && P.S.alive; i++) step(30, { x: 1, y: 0, m: 0.2 });
  assert.ok(G.hp > G.max * 0.5, `a lone cell gets nowhere (${G.hp.toFixed(0)} of ${G.max})`);
}
{
  const { coll, guards, P, step, fill, move } = setup();
  const G = guards.byId.grazer1; guards.placeGate(G, 110, 0, 0); // (where the director would put it: here 110 µm out, met heading +x)
  const at = guards.centre(G), g = G.g;
  move(at.x - 45, at.y - 12); fill(11); step(60);
  const C = coll.of(P);
  let t = 0;
  for (let i = 0; i < 48 && !G.beaten; i++) {
    // at the bell's back, away from its funnel
    const T = { x: at.x - g.pose.up.x * g.R * 1.2, y: at.y - g.pose.up.y * g.R * 1.2 };
    const dx = T.x - C.cx, dy = T.y - C.cy, dl = Math.hypot(dx, dy) || 1;
    step(15, { x: dx / dl, y: dy / dl, m: Math.min(1, dl / 10) }); coll.beacon(P, 1000 + i); guards.volley(C, 0); t += 0.25;
  }
  assert.ok(G.beaten && g.beaten, `an army of 12 beats it (${t} s, ${C.members.length} members left)`);
}

// --- waylaying: a stranger draws a member off visibly; ignored, it is picked off; X calls it back ---
function waylaySetup() {
  const ev = { waylay: 0, lost: 0, recall: 0 };
  const T = setup({ onWaylay: () => ev.waylay++, onWaylaid: () => ev.lost++, onRecall: () => ev.recall++ });
  const { world, coll, P, step, fill, move } = T;
  // out of the meadow (the start stays safe), in open water
  move(world.start.x + 150, world.start.y + 40); fill(10); step(60);
  const C = coll.of(P);
  // one stranger (another magnetotactic cell) a little off the flock; the others far away
  const ss = world.cells.filter((c) => c.kind === 'mtb');
  ss.forEach((c, i) => { c.x = world.start.x - 400; c.y = world.start.y + 100 + i * 30; });
  const s = ss[0]; s.parked = false; s.x = C.cx + C.extent + 18; s.y = C.cy;
  return { ...T, C, s, ev };
}
{
  const { coll, C, s, ev, step } = waylaySetup();
  let i = 0;
  for (; i < 360 && !C.members.some((m) => m.drift); i++) step(1);
  assert.ok(s.waylay && s.waylay.state === 'lure', 'the stranger comes over and loiters at the edge');
  const m = C.members.find((q) => q.drift);
  assert.ok(m && ev.waylay === 1, `its decoy pulse draws a member off (${(i / 60).toFixed(1)} s)`);
  const d0 = Math.hypot(m.x - C.cx, m.y - C.cy);
  step(120);
  assert.ok(m.drift && m.coll === C, 'after 2 s it is still drifting, not yet lost');
  const d1 = Math.hypot(m.x - C.cx, m.y - C.cy);
  assert.ok(d1 > d0 + 2 && d1 > C.R0 + 3, `it leaves the formation toward the stranger (${d0.toFixed(1)} → ${d1.toFixed(1)} µm from the middle)`);
  const n0 = C.members.length;
  step(60 * 6);
  assert.ok(ev.lost >= 1 && !m.coll && m.dying && m.dying.kind === 'waylaid', `ignored, it is picked off (${ev.lost} lost, ${C.members.length} of ${n0} left)`);
  assert.ok(!s.waylay, 'and the stranger swims off with it');
  step(60 * 3);
  assert.ok(m.parked, 'then it is gone');
  assert.equal(coll.waylays().drifting.length, C.members.filter((q) => q.drift).length);
}
{
  const { coll, C, s, ev, P, step, t } = waylaySetup();
  for (let i = 0; i < 360 && !C.members.some((m) => m.drift); i++) step(1);
  const m = C.members.find((q) => q.drift);
  step(90);
  assert.ok(m && m.drift, 'drifting for 1.5 s');
  assert.ok(coll.beacon(P, 500), 'X');
  let back = null;
  for (let i = 0; i < 60; i++) { step(1); if (back === null && !m.drift) back = i / 60; }
  assert.ok(back !== null && back < 0.8, `called back ${back} s after X`);
  assert.ok(!m.drift && m.coll === C && ev.recall >= 1, 'the beacon reaching it calls it back at once');
  assert.ok(!s.waylay && s.wlCool > 0, 'and drives the stranger off');
  step(120);
  assert.ok(Math.hypot(m.x - C.cx, m.y - C.cy) < C.R0 + 4, 'it is back in the formation');
}
{
  // pulsing X now and then (every 1.5 s): members drift but none is ever lost
  const { C, s, ev, P, coll, step } = waylaySetup();
  const n0 = C.members.length;
  for (let k = 0; k < 20; k++) {
    step(90); coll.beacon(P, 1000 + k * 2);
    if (!s.waylay && s.wlCool > 0) { s.wlCool = 0; s.x = C.cx + C.extent + 15; s.y = C.cy + 3; } // a stranger keeps coming
  }
  assert.ok(ev.waylay >= 2 && ev.lost === 0 && C.members.length >= n0, `pulsing X, nobody is lost (${ev.waylay} drawn off, ${ev.recall} called back, ${ev.lost} lost)`);
}
{
  // the meadow round the start stays safe for ever
  const { world, coll, P, step, fill, move } = setup();
  move(world.start.x + 10, world.start.y + 10); fill(10); step(30);
  const C = coll.of(P), s = world.cells.find((c) => c.kind === 'mtb');
  s.parked = false; s.x = C.cx + C.extent + 12; s.y = C.cy;
  step(60 * 6);
  assert.ok(!s.waylay && !C.members.some((m) => m.drift), 'no waylaying in the meadow');
}

console.log('bacterium flock: all checks pass');
