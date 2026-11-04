// The bacterium's army, headless (no page, no GPU): the flock, the beacon, eating
// and the gates, stepped with the real world, swimmer, collective and guards.
//   node micro/game/bacterium/flock.test.mjs
import assert from 'node:assert/strict';
import { createWorld, DROP, rimDist, WORLD, ENCOUNTERS } from './world.js';
import { createSwimmer } from './swim.js';
import { createCollectives, COLL } from './collective.js';
import { createStentor } from './stentor.js';
import { createGuards } from './guards.js';
import { createGame } from './game.js';
import { createFight } from '../shared/predation.js';
import { autoFieldFor, AUTO } from './followcam.js';

function setup(hooks = {}, { quiet = false } = {}) {
  const world = createWorld();
  const stentor = createStentor();
  world.stentor = stentor;
  let guards = null;
  // (a member an enemy eats poisons it, as main.js wires it)
  const coll = createCollectives(world, { ...hooks, onLost: (C, m, kind) => { if (guards && C && C.players.length) guards.poison(kind, m, C); hooks.onLost?.(C, m, kind); } });
  world.coll = coll;
  const sw = createSwimmer(world);
  sw.reset('mtb');
  const P = { slot: 0, S: sw.state, dash: { active: false } };
  coll.reset([P]);
  if (quiet) for (const k of coll.kin) if (!k.coll) coll.park(k); // (no free kin about: the fights measure the swarm they start with)
  guards = createGuards(world, coll, stentor);
  // Stentor's rhythm (main.js runBoss, without the player's own catch): its pull is its bite
  stentor.fight = createFight({ windup: 1.4, strike: 0.9, recoverT: 2.4, repelT: 3.5, retreatT: 22, facingRate: 0, blockHit: 0, biteHit: 0, regain: 0 });
  let t = 0;
  const dt = 1 / 60;
  const boss = () => {
    const B = stentor;
    if (!B.placed || B.beaten) return;
    const d = Math.hypot(P.S.x - B.mouth.x, P.S.y - B.mouth.y);
    if (!B.awake && d < B.wakeR) B.awake = true;
    if (!B.awake) { B.update(dt, 'stalk', 0); return; }
    const f = B.fight.update(dt, { near: d < B.wakeR, inReach: d < B.pullR, facing: true, blocking: false });
    if (f.state === 'strike' && !B.inStrike) { B.inStrike = true; guards.stentorPull(); } else if (f.state !== 'strike') B.inStrike = false;
    B.update(dt, B.fight.state, f.t);
  };
  const step = (n, steer = null) => {
    for (let i = 0; i < n; i++) {
      const inputs = { 0: { steer: steer ? { ...steer } : null, dashActive: false } };
      coll.pre(dt, t, [P], inputs);
      sw.step(dt, t, inputs[0], {});
      world.update(dt, t, P.S);
      boss();
      coll.post(dt, t, [P]);
      guards.update(dt, t, [P]);
      t += dt; world.time = t;
    }
  };
  const fill = (n) => { for (let i = 0; i < COLL.max + 8 && coll.of(P).members.length < n; i++) coll.adopt(P, P.S.x + Math.cos(i * 2.4) * (1.5 + 1.15 * Math.sqrt(i)), P.S.y + Math.sin(i * 2.4) * (1.5 + 1.15 * Math.sqrt(i)), i); };
  const move = (x, y) => { const C = coll.of(P), dx = x - P.S.x, dy = y - P.S.y; for (const m of C.members) { m.x += dx; m.y += dy; } P.S.x = x; P.S.y = y; C.cx += dx; C.cy += dy; if (C.fx === C.fx) { C.fx += dx; C.fy += dy; } };
  return { world, stentor, coll, guards, P, step, fill, move, get t() { return t; } };
}
/** A swarm of n pushed into gate `id` (X every 0.5 s unless x is false): { won, t (s from first contact), left, ... }. */
function fight(id, n, { x = true, maxT = 60 } = {}) {
  const T = setup({}, { quiet: true });
  const { coll, guards, P, step, fill, move, stentor, world } = T;
  const q = guards.byId[id];
  if (id === 'stentor') { world.setPortal(400, 0, 0); stentor.place(400, 0, 0); } else guards.placeGate(q, 400, 0, 0);
  const c = guards.centre(q);
  move(c.x - 70 - (1.05 * Math.sqrt(n) + 1.2) * 2, c.y - (id === 'grazer1' ? 10 : 0)); fill(n); step(60);
  const C = coll.of(P);
  let tt = 0, first = null, maxD = 0, hp0 = q.max, falls = 0;
  const states = new Set();
  for (; tt < maxT && !q.beaten && C.members.length + 1 > 1; tt += 0.25) {
    if (first === null && q.contact) first = tt;
    maxD = Math.max(maxD, q.drills); states.add(q.atk.st);
    if (q.hp < hp0 - 0.5) falls++; hp0 = q.hp;
    let tg = guards.centre(q);
    if (id === 'grazer1') { const g = q.g; tg = { x: tg.x - g.pose.up.x * g.R * 1.3, y: tg.y - g.pose.up.y * g.R * 1.3 }; }
    const dx = tg.x - C.cx, dy = tg.y - C.cy, dl = Math.hypot(dx, dy) || 1;
    step(15, n ? { x: dx / dl, y: dy / dl, m: Math.min(1, dl / 10 + 0.3) } : { x: (tg.x - P.S.x) / (Math.hypot(tg.x - P.S.x, tg.y - P.S.y) || 1), y: (tg.y - P.S.y) / (Math.hypot(tg.x - P.S.x, tg.y - P.S.y) || 1), m: 0.4 });
    if (x && Math.round(tt * 4) % 2 === 0) guards.volley(C, 0);
  }
  return { won: q.beaten, t: first === null ? null : +(tt - first).toFixed(1), left: C.members.length, hp: Math.round(q.hp), max: q.max, maxD, eaten: q.eaten, bites: q.bites, falls, states: [...states] };
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
  assert.ok(ev.waylay >= 1 && ev.lost === 0 && C.members.length >= n0, `pulsing X, nobody is lost (${ev.waylay} drawn off, ${ev.recall} called back, ${ev.lost} lost)`);
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

// --- 2.5D: members spread in depth, amble up and over a grain and settle back ---
{
  const { world, coll, P, step, fill, move } = setup();
  // the biggest grain away from the start; the flock just to its left
  const g = world.grains.filter((q) => q.cap >= 5 && world.distFromStart(q.x, q.y) > 120 && q.y > 30).sort((a, b) => b.r - a.r)[0];
  const others = world.grains.filter((q) => q !== g && Math.hypot(q.x - g.x, q.y - g.y) < g.r + q.r + 40);
  for (const q of others) world.moveGrain(q, q.x + 500, q.y); // (nothing else in the way)
  move(g.x - g.r - 14, g.y); fill(12); step(120);
  const C = coll.of(P);
  const hs = C.members.map((m) => m.hz);
  assert.ok(Math.max(...hs) - Math.min(...hs) > 1, `the flock is spread in depth (${Math.min(...hs).toFixed(1)}–${Math.max(...hs).toFixed(1)} µm)`);
  let peak = 0, over = 0, inside = 0;
  for (let i = 0; i < 150; i++) {
    step(1, { x: 1, y: 0, m: 0.6 });
    for (const m of C.members) {
      const d = Math.hypot(m.x - g.x, m.y - g.y);
      if (d < g.r * 0.5) { inside++; if (m.hz >= world.groundAt(m.x, m.y)) over++; peak = Math.max(peak, m.hz); }
    }
  }
  assert.ok(inside > 20 && over === inside, `members cross the grain's middle on top of it (${inside} member-steps, all over its surface)`);
  assert.ok(peak > Math.min(7, g.cap) * 0.8, `they rise over it (peak ${peak.toFixed(1)} µm; the grain ${g.cap} µm thick)`);
  step(300);
  const after = Math.max(...C.members.map((m) => m.hz));
  assert.ok(after < 5.6, `and settle back on the far side (highest ${after.toFixed(1)} µm)`);
}

// --- no invisible walls: the drop's edge is a soft stop at the meniscus you can see ---
{
  const { P, step, move, world } = setup();
  const a = 2.2, R = DROP.R; // up and to the left, away from the sediment bank
  move(Math.cos(a) * (R - 60), Math.sin(a) * (R - 60));
  const out = { x: Math.cos(a), y: Math.sin(a), m: 1 };
  const radial = [];
  let prev = rimDist(P.S.x, P.S.y);
  for (let i = 0; i < 360; i++) { step(1, out); const d = rimDist(P.S.x, P.S.y); radial.push((prev - d) * 60); prev = d; }
  const end = rimDist(P.S.x, P.S.y);
  assert.ok(end > 0 && end < 3, `swimming straight out, the cell stops at the drop's edge (${end.toFixed(2)} µm inside it, where the meniscus is drawn)`);
  const drops = radial.slice(1).map((v, i) => radial[i] - v);
  assert.ok(Math.max(...drops) < 15 && radial.slice(0, 30).some((v) => v > 30), `it eases to a stop, no wall (fastest out ${Math.max(...radial).toFixed(0)} µm/s, biggest slow-down in a frame ${Math.max(...drops).toFixed(1)} µm/s)`);
  // along the edge it slides freely (surface tension holds it in, it does not hold it still)
  const t0 = { x: P.S.x, y: P.S.y };
  step(120, { x: -Math.sin(a) * 0.95 + Math.cos(a) * 0.3, y: Math.cos(a) * 0.95 + Math.sin(a) * 0.3, m: 1 });
  assert.ok(Math.hypot(P.S.x - t0.x, P.S.y - t0.y) > 40 && rimDist(P.S.x, P.S.y) > 0, `it slides along the edge (${Math.hypot(P.S.x - t0.x, P.S.y - t0.y).toFixed(0)} µm in 2 s)`);
  // and no clamp is left where the old walls were (x = ±560, y = 560)
  move(600, 600); step(150, { x: 0.7, y: 0.7, m: 1 });
  assert.ok(P.S.x > 620 && P.S.y > 620, 'past where the old invisible walls stood');
  void world;
}
{
  // a swarm of 60 pushed at the edge: every member stays inside the drop, piled against the meniscus
  const { P, coll, step, fill, move } = setup();
  const a = 1.9, R = DROP.R;
  move(Math.cos(a) * (R - 80), Math.sin(a) * (R - 80)); fill(60); step(30);
  step(420, { x: Math.cos(a), y: Math.sin(a), m: 1 });
  const C = coll.of(P), ds = C.members.map((m) => rimDist(m.x, m.y));
  assert.ok(Math.min(...ds) > 0 && Math.min(...ds) < 4, `the swarm piles against the edge, none beyond it (nearest ${Math.min(...ds).toFixed(2)} µm inside)`);
}
{
  // the sediment bank: visible, and its EPS thickens until you can go no deeper (a soft stop, not a wall)
  const { P, step, move, world } = setup();
  move(200, world.surfaceY(200) + 30);
  const ys = [];
  for (let i = 0; i < 300; i++) { step(1, { x: 0, y: -1, m: 1 }); ys.push(P.S.y); }
  const depth = world.surfaceY(P.S.x) - P.S.y, v = ys.slice(1).map((y, i) => (ys[i] - y) * 60);
  assert.ok(depth > 2 && depth < 25 && v.at(-1) < 3 && v.at(-1) < v[20] / 5, `into the biofilm it slows to a stop ${depth.toFixed(1)} µm in`);
  assert.ok(Math.max(...v.slice(1).map((x, i) => v[i] - x)) < 15, 'eased, not stopped dead');
}

// --- kin over the old cap of 48 still answer; the stranger strain never does (and looks different: draw.js) ---
{
  const { world, coll, P, step, fill } = setup();
  fill(60); step(30);
  const C = coll.of(P), free = coll.kin.filter((k) => !k.coll && !k.parked && !k.dying);
  free.slice(0, 5).forEach((k, i) => { k.x = k.hx = C.cx + C.extent + 2 + i; k.y = k.hy = C.cy; });
  const s = world.cells.find((c) => c.stranger); s.parked = false; s.x = C.cx + C.extent + 3; s.y = C.cy + 2;
  coll.beacon(P, 900); step(90);
  assert.ok(C.members.length >= 65, `a swarm of 60 still recruits (${C.members.length})`);
  assert.ok(!C.members.includes(s) && !coll.kin.includes(s), 'the stranger strain does not join');
  assert.ok(s.stranger && s.wl < 1.3 && s.L > 3.4, 'and it is built differently (longer, a tighter helix: drawn amber)');
}

// --- members are your health: a predator takes a member, not you, while you have one ---
{
  const { world, coll, P, step, fill } = setup();
  fill(3); step(10);
  const game = createGame(world, { state: P.S, caught: (kind, who) => { P.S.alive = false; P.S.caught = { kind, who }; return true; } });
  game.opts.absorb = (kind, who) => coll.absorb(P, kind, who);
  let lost = 0;
  for (let i = 0; i < 3; i++) { P.safeT = 0; const ev = {}; game.catchBy('amoeba', world.amoeba, ev); if (ev.absorbed) lost++; }
  assert.ok(lost === 3 && P.S.alive && coll.of(P).members.length === 0, `three hits take three members, not you (${coll.of(P).members.length} left, alive ${P.S.alive})`);
  P.safeT = 0; const ev = {}; game.catchBy('amoeba', world.amoeba, ev);
  assert.ok(ev.caught && !P.S.alive, 'with none left, the next takes your own cell');
}

// --- the gate battles: they eat members in a rhythm (a tell, then a bite); members drill in; a modest swarm wins, a big one fast ---
const battle = {};
for (const [id, small, need, big, fast] of [['grazer1', 5, 14, 42, 8], ['bdello', 14, 50, 150, 12], ['amoeba', 60, 150, 450, 8], ['stentor', 120, 300, 900, 10]]) {
  const e = ENCOUNTERS.find((q) => q.id === (id === 'stentor' ? 'portal' : id));
  assert.ok(need <= e.need, `${id}: tested at its need or below (${need} ≤ ${e.need})`);
  const a = fight(id, 0, { maxT: 20 }), b = fight(id, small, { maxT: 40 }), c = fight(id, need), d = fight(id, big);
  assert.ok(!a.won && a.hp > a.max * 0.8, `${id}: a lone cell gets nowhere (${a.hp} of ${a.max} left)`);
  assert.ok(!b.won, `${id}: a small swarm (${small}) loses (${b.hp} of ${b.max} left, ${b.left} cells left)`);
  assert.ok(c.won && c.left > 0 && c.left < need, `${id}: a modest swarm (${need}) wins, losing cells (${c.t} s, ${c.left} left)`);
  assert.ok(d.won && d.t < fast && d.left > big * 0.85, `${id}: a big swarm (${big}) wins fast (${d.t} s, ${d.left} left)`);
  assert.ok(c.maxD >= 5 && c.falls > 4, `${id}: members drill in and wear it down (${c.maxD} drilling at once)`);
  if (id === 'grazer1' || id === 'amoeba') assert.ok(c.states.includes('tell') && c.states.includes('bite') && c.eaten > 0, `${id}: it eats members, a tell before each bite (${c.bites} bites, ${c.eaten} eaten)`);
  battle[id] = `${small} loses; ${need} wins in ${c.t} s (${c.left} left); ${big} in ${d.t} s (${d.left} left)`;
}

// --- a swarm of 1000 steps within a time budget, headless ---
{
  const { world, coll, P, step, fill, move } = setup({}, { quiet: true });
  move(200, 400); fill(1000); step(30);
  const C = coll.of(P);
  // (a view round the swarm, as main.js sets it: members off screen take the cheap path)
  world.watch.inView = (x, y, r) => Math.abs(x - C.cx) < 120 + r && Math.abs(y - C.cy) < 68 + r;
  world.watch.players = [{ x: C.cx, y: C.cy }];
  const t0 = performance.now(); step(120, { x: 1, y: 0.2, m: 1 }); const ms = (performance.now() - t0) / 120;
  assert.equal(C.members.length, 1000);
  assert.ok(ms < 16, `1000 members step in ${ms.toFixed(2)} ms (budget 16 ms, headless)`);
  assert.ok(C.speed > 15 && C.extent < 120, `and still move as one (${C.speed.toFixed(0)} µm/s, ${C.extent.toFixed(0)} µm from the middle)`);
  battle.perf = `${ms.toFixed(2)} ms per step for 1000 members`;
}

// --- the camera: the default field widens as the swarm grows (main.js stepZoom; LT/RT multiply it) ---
{
  const f = [1, 10, 40, 100, 300, 1000].map((n) => autoFieldFor(n, 1.3 * (1.05 * Math.sqrt(n) + 1.2)));
  assert.ok(f[0] === 45 && f.every((v, i) => i === 0 || v >= f[i - 1]) && f[5] > f[2] * 2 && f[5] <= AUTO.max, `the field grows with the swarm (${f.map((v) => v.toFixed(0)).join(', ')} µm)`);
  for (const n of [100, 300, 1000]) { const R0 = 1.05 * Math.sqrt(n) + 1.2; assert.ok(autoFieldFor(n, R0) > 2.2 * R0 * 1.3, `a swarm of ${n} fits its field`); }
}

console.log(`bacterium flock: all checks pass
  battles: ${Object.entries(battle).map(([k, v]) => `${k}: ${v}`).join('\n           ')}`);
