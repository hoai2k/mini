// The bacterium's army, headless (no page, no GPU): the flock, the beacon, eating
// and the gates, stepped with the real world, swimmer, collective and guards.
//   node micro/game/bacterium/flock.test.mjs
import assert from 'node:assert/strict';
import { createWorld, DROP, rimDist, WORLD, ENCOUNTERS, AMOEBA, AMOEBA_ARMS } from './world.js';
import { createSwimmer } from './swim.js';
import { createCollectives, COLL, densityK } from './collective.js';
import { createStentor } from './stentor.js';
import { createGuards, IRR, PINCH, TUN, WRAP } from './guards.js';
import { createGame } from './game.js';
import { ZOOM, zoomStep } from './followcam.js';
import { SPECIES } from './swim.js';
import { readFileSync } from 'node:fs';

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
  let t = 0;
  const dt = 1 / 60;
  // Stentor (main.js runBoss, without the player's own catch): it wakes, then hunts the swarm's middle
  const boss = () => {
    const B = stentor;
    if (!B.placed) return;
    const C = coll.of(P), f = C && C.members.length ? { x: C.cx, y: C.cy } : { x: P.S.x, y: P.S.y };
    if (!B.awake && !B.beaten && Math.hypot(f.x - B.mouth.x, f.y - B.mouth.y) < B.wakeR) B.awake = true;
    B.update(dt, B.awake ? f : null);
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
/** A point beside Stentor's body, on the swarm's side of it, out of its feeding cone (where a careful swarm drills). */
function stentorFlank(B, x, y) {
  const c = Math.cos(B.ang), s = Math.sin(B.ang), side = Math.sign(-(x - B.foot.x) * s + (y - B.foot.y) * c) || 1, u = B.len * 0.55;
  const w = 2.6 + (0.56 * B.R - 2.6) * Math.pow(0.55, 2.3) + 2;
  return { x: B.foot.x + c * u - s * w * side, y: B.foot.y + s * u + c * w * side };
}
/**
 * A swarm of n pushed into gate `id` (X every 0.5 s unless x is false). careful: pull back straight out from it
 * when it winds up (0.4 s into its tell, or its tunnel's pinch) while any member is in its capture zone; mouth: the peritrich's mouth
 * as the target instead of its bell's back. Returns { won, t (s from first contact), left, eaten, ... }.
 */
function fight(id, n, { x = true, maxT = 60, careful = false, mouth = false, log = false } = {}) {
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
    const cc = guards.centre(q);
    let tg = cc;
    if (id === 'grazer1') { const g = q.g; tg = mouth ? g.pose.mouth : { x: cc.x - g.pose.up.x * g.R * 1.3, y: cc.y - g.pose.up.y * g.R * 1.3 }; }
    if (id === 'stentor') tg = stentorFlank(stentor, C.cx, C.cy);
    if (id === 'amoeba') { const k = careful ? 0 : 25; tg = { x: cc.x + Math.sin(q.A.ang) * k, y: cc.y - Math.cos(q.A.ang) * k }; } // (pushing on into it, past its edge: a reckless swarm burrows deep)
    // (the amoeba's tunnel pinching shut is a tell too)
    // (a player sees the attack coming and reacts: 0.4 s after its tell shows)
    const tell = q.kind === 'stentor' ? false : (q.atk.st === 'tell' && world.time - q.atk0 > 0.4) || q.atk.st === 'bite' || (q.kind === 'amoeba' && q.A.tunnels.some((T) => T.pinch && T.pinch.t > 0.4));
    if (careful && tell && C.members.some((m) => guards.zone(q, m.x, m.y, world.time) > 0)) {
      // pull back: straight out from it (the amoeba's edge faces whoever comes; else away from its middle)
      let ox = C.cx - cc.x, oy = C.cy - cc.y;
      if (q.kind === 'amoeba') { ox = -Math.sin(q.A.ang); oy = Math.cos(q.A.ang); }
      const ol = Math.hypot(ox, oy) || 1;
      step(15, { x: ox / ol, y: oy / ol, m: 1 });
    } else {
      const dx = tg.x - C.cx, dy = tg.y - C.cy, dl = Math.hypot(dx, dy) || 1;
      step(15, n ? { x: dx / dl, y: dy / dl, m: Math.min(1, dl / 10 + 0.3) } : { x: (tg.x - P.S.x) / (Math.hypot(tg.x - P.S.x, tg.y - P.S.y) || 1), y: (tg.y - P.S.y) / (Math.hypot(tg.x - P.S.x, tg.y - P.S.y) || 1), m: 0.4 });
    }
    if (x && Math.round(tt * 4) % 2 === 0) guards.volley(C, 0);
  }
  return { won: q.beaten, t: first === null ? null : +(tt - first).toFixed(1), left: C.members.length, hp: Math.round(q.hp), max: q.max, irr: q.irr, tunnels: q.A ? q.A.tunnels.length : 0, maxD, eaten: q.eaten, bites: q.bites, falls, states: [...states], log: log ? coll.lossLog.slice() : null };
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

// --- the gate battles: losses depend on where your cells are; your cells drill in ---
const battle = {};
for (const [id, big, fast] of [['grazer1', 42, 8], ['bdello', 150, 12], ['amoeba', 450, 8], ['stentor', 900, 12]]) {
  const a = fight(id, 0, { maxT: 20 }), d = fight(id, big);
  assert.ok(!a.won && (id === 'amoeba' ? a.irr < 0.2 : a.hp > a.max * 0.8), `${id}: a lone cell gets nowhere (${id === 'amoeba' ? `irritation ${a.irr.toFixed(2)}` : `${a.hp} of ${a.max} left`})`);
  assert.ok(d.won && d.t < fast, `${id}: a big swarm (${big}) wins fast (${d.t} s, ${d.left} left)`);
  assert.ok(d.maxD >= 5, `${id}: members drill in (${d.maxD} at once)`);
  battle[id] = `${big} wins in ${d.t} s (${d.left} left)`;
}
{
  // the amoeba: a careful swarm of its need (pulling out of each loop as its pseudopods close) wins with most; a reckless one loses many
  const need = ENCOUNTERS.find((q) => q.id === 'amoeba').need;
  // (it is routed, never killed: careful drills its edge and pulls out of each attack; reckless burrows deep)
  const c = fight('amoeba', need, { careful: true }), r = fight('amoeba', need);
  assert.ok(c.won && c.left > need * 0.75, `amoeba: careful, ${need} rout it keeping most (${c.left} left, ${c.t} s, ${c.bites} bites)`);
  assert.ok(r.won && r.t < c.t, `amoeba: reckless, burrowed in, ${need} rout it sooner (${r.t} s against ${c.t} s; ${r.left} left)`);
  // burrowing is the risk: kept up for 15 s (no rout), a swarm burrowed in loses many more than one pulling out
  const k0 = IRR.k; IRR.k = 1e12;
  const c2 = fight('amoeba', need, { careful: true, maxT: 15 }), r2 = fight('amoeba', need, { maxT: 15 });
  IRR.k = k0;
  assert.ok(r2.eaten > c2.eaten * 2, `amoeba: burrowed in for 15 s, ${r2.eaten} engulfed; pulling out of each attack, ${c2.eaten}`);
  assert.ok(c.states.includes('tell') && c.states.includes('bite'), 'amoeba: a tell before each bite');
  assert.ok(c.hp === Infinity && r.hp === Infinity, 'amoeba: never any health lost (it has none to lose)');
  battle.amoebaCareful = `${need} careful: routed it in ${c.t} s, ${c.left} left; reckless (burrowing): routed it in ${r.t} s, ${r.left} left; 15 s with no rout: burrowed ${r2.eaten} engulfed, careful ${c2.eaten}`;
}
{
  // the amoeba engulfs only by an attack it shows first: drilling its edge with no pseudopod, the only losses are to a tunnel's pinch, warned of
  const T = setup({}, { quiet: true });
  const { coll, guards, P, step, fill, move } = T;
  const q = guards.byId.amoeba; guards.placeGate(q, 400, 0, 0);
  const A = q.A, nx = -Math.sin(A.ang), ny = Math.cos(A.ang);
  move(A.x + nx * 40, A.y + ny * 40); fill(80); step(30);
  q.atk.next = 1e9; // (its loop never comes)
  const C = coll.of(P);
  for (let i = 0; i < 40; i++) step(15, { x: -nx, y: -ny, m: 0.6 });
  assert.ok(coll.lossLog.every((e) => e.warned !== null && e.kind === 'amoeba'), `drilling its edge for 10 s with no pseudopod: every loss was a pinch it showed first (${coll.lossLog.length} lost, ${C.members.length} left: ${JSON.stringify(coll.lossLog.filter((e) => e.warned === null || e.kind !== "amoeba").slice(0, 3))})`);
  assert.ok(coll.lossLog.length === q.eaten, `and nothing else took any (${q.eaten} engulfed)`);
}
{
  // a wrap telegraphs (≥ 1.5 s from the pseudopods reaching out to the loop closing); cells that pull out of the loop first survive
  const T = setup({}, { quiet: true });
  const { coll, guards, P, step, fill, move } = T;
  const q = guards.byId.amoeba; guards.placeGate(q, 400, 0, 0);
  const A = q.A, nx = -Math.sin(A.ang), ny = Math.cos(A.ang);
  move(A.x + nx * 30, A.y + ny * 30); fill(60); step(30);
  const C = coll.of(P);
  let t0 = null, tClose = null, out = [], inside = [], fast = false;
  for (let i = 0; i < 1200 && tClose === null; i++) {
    if (t0 === null && A.wrap) {
      t0 = T.t; fast = A.wrap.fast;
      // half the cells in the loop pull out at once (steered out: here put well clear), the rest stay
      inside = C.members.filter((m) => Math.hypot(m.x - A.wrap.x, m.y - A.wrap.y) < A.wrap.R * 0.8);
      out = inside.splice(0, Math.floor(inside.length / 2));
      out.forEach((m, k) => { m.drill = null; m.x = A.wrap.x + nx * (A.wrap.R + 25) + (k % 5) * 2; m.y = A.wrap.y + ny * (A.wrap.R + 25) + Math.floor(k / 5) * 2; });
    }
    if (t0 !== null && A.wrap && A.wrap.done) tClose = T.t;
    if (t0 === null) step(1, { x: -nx, y: -ny, m: 0.5 }); else { step(1); out.forEach((m, k) => { if (!m.dying) { m.x = A.wrap ? A.wrap.x + nx * (A.wrap.R + 25) + (k % 5) * 2 : m.x; } }); }
  }
  // (round cells burrowed in, a tunnel or a dent, it closes WRAP.fast times as fast: still over 1.4 s)
  assert.ok(t0 !== null && tClose - t0 >= (fast ? 1.4 : 1.5), `its pseudopods reach round for ${(tClose - t0).toFixed(2)} s before the loop closes${fast ? ' (round burrowed cells: faster)' : ''}`);
  const lostIn = inside.filter((m) => m.dying).length, lostOut = out.filter((m) => m.dying).length;
  assert.ok(inside.length > 3 && lostIn >= inside.length * 0.6 && lostOut === 0, `the cells left in the loop are engulfed (${lostIn} of ${inside.length}), those that pulled out survive (${lostOut} of ${out.length} lost)`);
}
{
  // every loss had a tell: fights at every gate, then every entry in the loss log was warned first
  const logs = [];
  for (const [id, n, o] of [['grazer1', 8, { mouth: true, x: false }], ['amoeba', 120, {}], ['bdello', 40, {}], ['stentor', 200, {}]]) {
    const T2 = fight(id, n, { ...o, maxT: 25, log: true });
    logs.push(...T2.log.map((e) => ({ ...e, id })));
  }
  const kinds = [...new Set(logs.map((e) => e.kind))];
  assert.ok(logs.length > 20 && ['grazer', 'amoeba', 'bdello', 'stentor'].every((k) => kinds.includes(k)), `losses to every attack were seen (${kinds.join(', ')}: ${logs.length})`);
  const bad = logs.filter((e) => e.warned === null || (e.kind === 'stentor' && e.warned < 0.79));
  assert.deepEqual(bad.slice(0, 5), [], `every loss was warned of first (${logs.length} losses)`);
  battle.tells = `every one of ${logs.length} losses (${kinds.join(', ')}) had its tell first`;
}
{
  // the peritrich: driven into its mouth loses more than drilling its bell's back (out of its vortex)
  const need = ENCOUNTERS.find((q) => q.id === 'grazer1').need;
  const into = fight('grazer1', need, { mouth: true }), back = fight('grazer1', need);
  assert.ok(back.won && back.left > into.left, `peritrich: into its mouth ${into.left} of ${need} left; at its back ${back.left} left and it is beaten`);
  battle.peritrich = `${need} at its back: ${back.left} left; into its mouth: ${into.left} left`;
}
{
  // capture zones: a bite takes members in its zone (by depth) and never one outside it
  for (const id of ['grazer1', 'amoeba']) {
    const T = setup({}, { quiet: true });
    const { coll, guards, P, step, fill, world, stentor } = T;
    const q = guards.byId[id];
    if (id === 'stentor') { world.setPortal(400, 0, 0); stentor.place(400, 0, 0); stentor.awake = true; } else guards.placeGate(q, 400, 0, 0);
    q.engaged = true;
    fill(60); step(2);
    const C = coll.of(P);
    // half of them deep in its zone (at the mouth, or just inside the amoeba's edge), half well outside it
    const deep = (i) => {
      if (id === 'grazer1') { const P2 = q.g.pose; return { x: P2.mouth.x + P2.up.x * (2 + (i % 5)), y: P2.mouth.y + P2.up.y * (2 + (i % 5)) + ((i % 3) - 1) }; }
      if (id === 'amoeba') { const A = q.A, nx = -Math.sin(A.ang), ny = Math.cos(A.ang), c = Math.cos(A.ang), s = Math.sin(A.ang); return { x: A.x + nx * 4 + c * ((i % 6) - 2.5) * 2, y: A.y + ny * 4 + s * ((i % 6) - 2.5) * 2 + ny * Math.floor(i / 6) * 1.2 }; }
      return { x: stentor.mouth.x + ((i % 6) - 3) * 3, y: stentor.mouth.y + ((i % 5) - 2) * 3 };
    };
    const inside = C.members.slice(0, 30), outside = C.members.slice(30);
    inside.forEach((m, i) => { const p = deep(i); m.x = p.x; m.y = p.y; });
    if (id === 'amoeba') { const A = q.A; q.A.wrap = { x: A.x - Math.sin(A.ang) * 6, y: A.y + Math.cos(A.ang) * 6, R: 14, nx: -Math.sin(A.ang), ny: Math.cos(A.ang), p: 1, done: false }; } // (its pseudopods round them)
    outside.forEach((m, i) => { m.x = 250 + (i % 6) * 3; m.y = 60 + Math.floor(i / 6) * 3; });
    assert.ok(inside.every((m) => guards.zone(q, m.x, m.y, world.time) > 0.6) && outside.every((m) => guards.zone(q, m.x, m.y, world.time) === 0), `${id}: the test cells are deep in its zone or well out of it`);
    { const cc = guards.centre(q); C.cx = cc.x; C.cy = cc.y; C.extent = 200; } // (the flock is at it: the bite looks at flocks near it)
    const n = guards.biteNow(q);
    const lostIn = inside.filter((m) => m.dying).length, lostOut = outside.filter((m) => m.dying).length;
    assert.ok(lostOut === 0, `${id}: no member outside its zone is taken`);
    assert.ok(lostIn >= 22 && n === lostIn, `${id}: most of those deep in it are (${lostIn} of 30)`);
    // eaten, seen: each goes through its states, not removed at once
    const m = inside.find((k) => k.dying), E = coll.EATEN[m.dying.kind];
    const p0 = { x: m.x, y: m.y };
    step(Math.round(E.pull * 0.5 * 60));
    assert.ok(m.dying && !m.parked && Math.hypot(m.x - p0.x, m.y - p0.y) > 0.05, `${id}: a taken member is still there, drawn in (${m.dying.kind}, ${m.dying.t.toFixed(2)} s)`);
    step(Math.round((E.pull + 1) * 60));
    assert.ok(m.dying && !m.parked && m.dying.t > E.pull, `${id}: then digesting inside it`);
    step(Math.round(E.digest * 60));
    assert.ok(m.parked, `${id}: and only then gone (after ${(E.pull + E.digest).toFixed(1)} s)`);
  }
}
{
  // a Bdellovibrio strikes the nearest member in reach: it rounds up into a bdelloplast before it fades
  const T = setup({}, { quiet: true });
  const { coll, P, step, fill, world, guards } = T;
  guards.placeGate(guards.byId.bdello, 200, 0, 0);
  fill(3); step(2); // (a swarm under 5: no slime for its ram to glance off)
  const C = coll.of(P), pack = world.cells.filter((c) => c.kind === 'bdello' && c.home), b = pack[0];
  for (const c of pack.slice(1)) c.parked = true; // (one Bdellovibrio, so the far ones are out of every reach)
  b.x = 200; b.y = 0; b.cooldown = 0; b.hidden = 0;
  const m = C.members[0], far = C.members.slice(1);
  m.x = 201.2; m.y = 0;
  far.forEach((k, i) => { k.x = 200 - 30; k.y = 20 + i * 3; });
  P.S.x = 170; P.S.y = 30; C.cx = 190; C.cy = 10;
  let caught = null;
  for (let i = 0; i < 240 && !caught; i++) { step(1); caught = coll.kin.find((k) => k.dying && k.dying.kind === 'bdello'); }
  assert.ok(caught === m && far.every((k) => !k.dying), 'Bdellovibrio: it takes the member in its reach, not the far ones');
  step(30); assert.ok(m.dying && !m.parked && m.dying.bdello, 'and the member rounds up with it inside, still there');
}

// --- Stentor: guards the portal, sucks your swarm in little by little, recoils from your drills, moves smoothly, can be pushed off ---
{
  const T = setup({}, { quiet: true });
  const { coll, guards, P, step, fill, move, world, stentor: B } = T;
  world.setPortal(400, 0, 0); B.place(400, 0, 0);
  const host = { x: 400, y: 0 };
  assert.ok(B.covers(host.x, host.y), 'placed, it covers the host (its body leans over it)');
  const text = readFileSync(new URL('../../text_config.js', import.meta.url), 'utf8');
  assert.ok(/stentor: 'Stentor guards the portal/.test(text), 'the first time you reach it: "Stentor guards the portal ..."');
  // suction by depth: hold 30 members deep in its cone, 30 shallow, 30 outside it, for 3 s
  B.awake = true; B.update(1 / 60, null);
  move(B.mouth.x - 200, B.mouth.y); fill(90); step(2);
  const C = coll.of(P), ms = C.members.slice(0, 90);
  const put = () => ms.forEach((m, i) => { if (m.dying) return; const g = Math.floor(i / 30), d = g === 0 ? 20 : g === 1 ? 95 : 160; m.x = B.mouth.x - d - (i % 5) * 1.5; m.y = B.mouth.y + ((i % 6) - 2.5) * 2; m.drill = null; });
  put();
  const ks = [0, 30, 60].map((i) => B.cone(ms[i].x, ms[i].y).toFixed(2));
  C.cx = B.mouth.x - 80; C.cy = B.mouth.y; C.extent = 120;
  for (let i = 0; i < 240; i++) { put(); world.time += 1 / 60; guards.suck(guards.byId.stentor, 1 / 60); } // (4 s: the first 0.8 s each is only warned)
  const lost = [0, 1, 2].map((g) => ms.slice(g * 30, g * 30 + 30).filter((m) => m.dying).length);
  assert.ok(lost[2] === 0 && lost[0] > lost[1] * 2 && lost[0] >= 5 && lost[0] < 30, `it takes members by depth in its cone, a few at a time (depth ${ks.join(', ')}: ${lost.join(', ')} of 30 taken in 3 s)`);
  const eaten = ms.find((m) => m.dying);
  assert.ok(eaten.dying.kind === 'stentor' && !eaten.parked, 'a member taken is drawn in (still there), not removed');
}
{
  // knockback: drilling on one side makes it flinch away from that side; its size changes only smoothly
  const T = setup({}, { quiet: true });
  const { world, stentor: B } = T;
  world.setPortal(400, 0, 0); B.place(400, 0, 0); B.awake = true;
  const side = { x: B.foot.x + Math.cos(B.ang) * 60 - Math.sin(B.ang) * 20, y: B.foot.y + Math.sin(B.ang) * 60 + Math.cos(B.ang) * 20 };
  const angTo = () => { const dx = side.x - B.foot.x, dy = side.y - B.foot.y; return Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - B.ang), Math.cos(Math.atan2(dy, dx) - B.ang))); };
  const a0 = angTo(), f0 = { ...B.foot };
  let maxDL = 0, maxDR = 0, L = B.len, R = B.R;
  for (let i = 0; i < 120; i++) { B.knock(side.x, side.y, i % 20 === 0 ? 0.8 : 0.02); B.update(1 / 60, null); maxDL = Math.max(maxDL, Math.abs(B.len - L)); maxDR = Math.max(maxDR, Math.abs(B.R - R)); L = B.len; R = B.R; }
  assert.ok(angTo() > a0 + 0.05, `it flinches away from the drill side (${a0.toFixed(2)} → ${angTo().toFixed(2)} rad off its axis)`);
  assert.ok(Math.hypot(B.foot.x - f0.x, B.foot.y - f0.y) > 3, 'and its holdfast is pushed back');
  assert.ok(B.contract > 0.05 && maxDL < 1.5 && maxDR < 0.6, `it contracts a little, smoothly (most per frame: body ${maxDL.toFixed(2)} µm, disc ${maxDR.toFixed(2)} µm)`);
  // beaten: it shrinks shut slowly, never a jump
  B.beaten = true; maxDR = 0; R = B.R;
  for (let i = 0; i < 180; i++) { B.update(1 / 60, null); maxDR = Math.max(maxDR, Math.abs(B.R - R)); R = B.R; }
  assert.ok(B.contract > 0.8 && maxDR < 0.6, `beaten, it closes over ~2 s with no jump (${maxDR.toFixed(2)} µm a frame at most)`);
}
{
  // a swarm drilling its flank pushes it off the host (the way through without beating it), and hurts it
  const T = setup({}, { quiet: true });
  const { coll, guards, P, step, fill, move, world, stentor: B } = T;
  world.setPortal(400, 0, 0); B.place(400, 0, 0);
  guards.byId.stentor.max = guards.byId.stentor.hp = 1e9; // (it must not die: this is about pushing)
  const fl = stentorFlank(B, B.foot.x, B.foot.y + 50);
  move(fl.x, fl.y + 40); fill(300); step(30);
  const C = coll.of(P);
  let off = null, maxD = 0;
  for (let i = 0; i < 160 && off === null; i++) {
    const tg = stentorFlank(B, C.cx, C.cy), dx = tg.x - C.cx, dy = tg.y - C.cy, dl = Math.hypot(dx, dy) || 1;
    step(15, { x: dx / dl, y: dy / dl, m: Math.min(1, dl / 10 + 0.3) }); if (i % 2 === 0) guards.volley(C, 0);
    maxD = Math.max(maxD, guards.byId.stentor.drills);
    if (!B.covers(400, 0)) off = i / 4;
  }
  assert.ok(off !== null && maxD > 10, `sustained drilling pushes it off the host (uncovered after ${off} s; ${maxD} drilling at once)`);
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

// --- the zoom: 118 µm to start, moved only by the triggers, continuous, no field stop (the owner, 2026-11-04) ---
{
  assert.equal(SPECIES.mtb.view, 118, 'the spirillum starts at a 118 µm field');
  const Z = { want: 118, field: 118 };
  for (let i = 0; i < 600; i++) zoomStep(Z, 0, 1 / 60);
  assert.equal(Z.field, 118, 'with the triggers untouched it stays where it is, whatever the swarm (no auto zoom)');
  const seen = [];
  for (let i = 0; i < 600; i++) { zoomStep(Z, 1, 1 / 60); seen.push(Z.field); }
  assert.ok(Z.field >= 500 && seen.every((v, i) => i === 0 || (v >= seen[i - 1] && v - seen[i - 1] < 15)), `LT zooms out smoothly to several hundred µm (${Z.field.toFixed(0)})`);
  for (let i = 0; i < 900; i++) zoomStep(Z, -1, 1 / 60);
  assert.ok(Z.field <= 10.5 && ZOOM.min <= 10, `RT zooms in to ~10 µm (${Z.field.toFixed(1)})`);
  const src = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.ok(/const stopR = 0;/.test(src) && !/autoFieldFor/.test(src) && !/swarmSize/.test(src), 'main.js draws no field stop, has no auto zoom and no view-widening message');
}

// --- the beacon: from the front of the group's mass (not a scout out front), reaching past its edge by the same margin at any size ---
{
  const { coll, P, step, fill, move } = setup({}, { quiet: true });
  move(300, 300); fill(80); step(60);
  for (let i = 0; i < 90; i++) step(1, { x: 1, y: 0, m: 0.8 });
  const C = coll.of(P), o1 = coll.beaconOrigin(C);
  const front = Math.max(...C.members.map((m) => m.x));
  // three scouts far out in front
  C.members.slice(0, 3).forEach((m, i) => { m.x = front + 25 + i * 4; m.y = C.cy + (i - 1) * 3; });
  const o2 = coll.beaconOrigin(C);
  assert.ok(Math.hypot(o2.x - o1.x, o2.y - o1.y) < 2.5 && o2.x < front, `scouts out front barely move the beacon's origin (${Math.hypot(o2.x - o1.x, o2.y - o1.y).toFixed(2)} µm; it stays behind the main body's front)`);
  assert.ok(Math.abs(o2.R - o1.R) < 3, `nor its reach (${o1.R.toFixed(1)} → ${o2.R.toFixed(1)} µm)`);
  const margin = [10, 100, 400].map((n) => { const T = setup({}, { quiet: true }); T.move(300, 300); T.fill(n); T.step(240); const Cn = T.coll.of(T.P), o = T.coll.beaconOrigin(Cn); return [n, o.R, o.ext, o.R - o.ext]; });
  assert.ok(margin.every(([, R, ext, m]) => Math.abs(m - COLL.beaconPad) < 0.01 && R > ext) && margin[2][1] > margin[1][1] && margin[1][1] > margin[0][1], `its reach is the group's radius plus ${COLL.beaconPad} µm at every size (${margin.map(([n, R]) => `${n}: ${R.toFixed(0)} µm`).join(', ')})`);
}

// --- denser when large: above ~100 cells the spacing shrinks with the count ---
{
  assert.ok(densityK(50) === 1 && densityK(100) === 1 && densityK(300) < 0.85 && densityK(1000) <= 0.6 + 1e-9, 'the spacing factor falls from 1 at 100 to 0.6 at 1000');
  const dens = [60, 600].map((n) => { const T = setup({}, { quiet: true }); T.move(300, 300); T.fill(n); T.step(360); const C = T.coll.of(T.P); return n / (Math.PI * C.spread ** 2); });
  assert.ok(dens[1] > dens[0] * 1.6, `a big swarm packs denser (${dens.map((d) => d.toFixed(2)).join(' → ')} cells per µm²)`);
}

// --- the amoeba: a whole cell far bigger than the view, its outline closed (rounded ends, a back), not a strip ---
{
  const { world, guards } = setup({}, { quiet: true });
  guards.placeGate(guards.byId.amoeba, 400, 0, 0);
  const A = world.amoeba, t = 0;
  // the default field is 118 µm tall (~210 across): the body runs past it on both sides and behind
  assert.ok(AMOEBA.width > 3 * 210 && AMOEBA.depth > 118, `the body (${AMOEBA.width} × ${AMOEBA.depth} µm) runs beyond the 118 µm view`);
  const inside = (lx, ly) => { const c = Math.cos(A.ang), s = Math.sin(A.ang); return world.insideAmoeba(A.x + c * lx - s * ly, A.y + s * lx + c * ly, t); };
  assert.ok(inside(0, -5) > 0 && inside(0, 8) < 0 && inside(AMOEBA.a * 0.8, -AMOEBA.b) > 0, 'inside behind its front edge and well along it, outside in front');
  assert.ok(inside(AMOEBA.a * 1.3, -AMOEBA.b) < 0 && inside(0, -AMOEBA.depth * 1.3) < 0, 'its ends and back close (outside beyond them)');
  // its thin pseudopods reach out of its front, and the shader draws the same ones
  const [ax, len, w, lean] = AMOEBA_ARMS[0], ry = AMOEBA.b * Math.sqrt(1 - (ax / AMOEBA.a) ** 2) - AMOEBA.b - 3, ph = Math.PI / 2 + lean, ex = ax + Math.cos(ph) * len * 0.6, ey = ry + Math.sin(ph) * len * 0.6;
  assert.ok(ey > 20 && inside(ex, ey) > 0 && inside(ex + w * 2.5, ey) < 0 && inside(ex - w * 2.5, ey) < 0, 'a thin arm reaches out of its front');
  const src = readFileSync(new URL('../shared/techniques/bacterium-shapes.js', import.meta.url), 'utf8');
  assert.equal(src.match(/export const AMOEBA_ARMS = (\[.*\]);/)[1], JSON.stringify(AMOEBA_ARMS).replace(/,/g, ', '), 'the shader draws the same arms (bacterium-shapes.js AMOEBA_ARMS)');
}


// --- the amoeba cannot be killed, only routed (the owner, 2026-11-04: "the amoeba should essentially have infinite
// HP (because it's huge, right?), but be able to be routed by attacks") ---
const amoebaFight = (n, at = 0) => {
  const T = setup({}, { quiet: true });
  const q = T.guards.byId.amoeba; T.guards.placeGate(q, 400, 0, 0);
  const A = q.A, nx = -Math.sin(A.ang), ny = Math.cos(A.ang), c = Math.cos(A.ang), s = Math.sin(A.ang);
  A._w = T.world; // (for T_world, worldAt)
  T.move(A.x + nx * (12 + Math.sqrt(n)) + c * at, A.y + ny * (12 + Math.sqrt(n)) + s * at); T.fill(n); T.step(30);
  return { ...T, q, A, nx, ny, c, s, C: T.coll.of(T.P) };
};
{
  // no amount of harm kills it: no health, nothing to fall to zero, never dissolved or removed
  const { q, A, guards, step, world } = amoebaFight(10);
  for (let i = 0; i < 50; i++) guards.hurt(q, 1e6, false);
  step(400);
  assert.ok(q.hp === Infinity && guards.GATES.amoeba.max === Infinity, 'it has no health to lose (infinite)');
  assert.ok(q.beaten && A.routed && !A.parked && (A.fade || 0) === 0, 'the most it does is give way (routed), whole: not dissolved, faded or removed');
  const L = world.amoebaLocal(A.x - Math.sin(A.ang) * 50, A.y + Math.cos(A.ang) * 50, { x: 0, y: 0 });
  assert.ok(world.amoebaAt(L.x, L.y - 100, world.time, false) > 0, 'its body is still there, wherever it went');
}
{
  // sustained drilling routs it: its irritation builds (and ebbs when you stop), then it flows off the way
  const { q, A, step, nx, ny, C, world, guards } = amoebaFight(150);
  const H = { x: A.home.x, y: A.home.y };
  q.atk.next = 1e9; // (its loop never comes: this measures the drilling)
  for (let i = 0; i < 12; i++) { step(15, { x: -nx, y: -ny, m: 0.7 }); }
  const mid = q.irr;
  assert.ok(mid > 0.15 && !q.beaten, `drilling builds its irritation (${mid.toFixed(2)} after 3 s), and does not rout it at once`);
  // let go: it ebbs
  for (let i = 0; i < 24; i++) step(15, { x: nx, y: ny, m: 1 });
  assert.ok(q.irr < mid * 0.85, `pulled away, its irritation ebbs (${mid.toFixed(2)} → ${q.irr.toFixed(2)})`);
  for (let i = 0; i < 240 && !q.beaten; i++) step(15, { x: -nx, y: -ny, m: 0.7 });
  assert.ok(q.beaten && A.routed && q.hp === Infinity, `kept up, the drilling routs it (${q.irr.toFixed(2)})`);
  const x0 = A.x, y0 = A.y;
  step(60 * 6);
  const moved = Math.hypot(A.x - x0, A.y - y0);
  const L = world.amoebaLocal(H.x, H.y, { x: 0, y: 0 }), across = Math.abs(L.x);
  assert.ok(moved > 400 && across > AMOEBA.a + 100 && world.amoebaAt(L.x, L.y, world.time, false) < 0, `routed, it flows off the way over a few seconds (${moved.toFixed(0)} µm along its edge: the way at its gate is ${across.toFixed(0)} µm from its middle, clear of it)`);
  assert.ok(world.insideAmoeba(H.x, H.y, world.time) < 0 && !guards.zone(q, H.x, H.y, world.time), 'and the way through is open');
  void C;
  battle.amoebaRout = `150 drilling: irritation ${mid.toFixed(2)} at 3 s, ebbing when they stop; routed, it flowed ${moved.toFixed(0)} µm off the way`;
}
{
  // drilling at one spot bores a tunnel that deepens with more drillers and time; left alone it closes again
  const { q, A, step, nx, ny, C } = amoebaFight(60);
  q.atk.next = 1e9;
  const oldMin = PINCH.minLen; PINCH.minLen = 1e9; // (no pinch: this measures the tunnel)
  const oldK = IRR.k; IRR.k = 1e12; // (nor a rout)
  const lens = [];
  for (let i = 0; i < 16; i++) { step(15, { x: -nx, y: -ny, m: 0.6 }); lens.push(Math.max(0, ...A.tunnels.map((T) => T.len))); }
  const deep = A.tunnels.reduce((a, T) => (T.len > a.len ? T : a), { len: 0 });
  assert.ok(lens[15] > 6 && lens[15] > lens[5] + 2 && lens[5] >= lens[1], `a tunnel deepens as they drill (${lens.filter((_, i) => i % 3 === 0).map((l) => l.toFixed(1)).join(' → ')} µm)`);
  assert.ok(deep.n > 3 && deep.w > TUN.w0, `drillers crowd into it and widen it (${deep.n} drilling, ${deep.w.toFixed(1)} µm half-width)`);
  // a cell inside the tunnel is inside the amoeba's outline (as it was), yet in open water now
  const inT = C.members.filter((m) => { const L = T_world(A, m); return inTun(deep, L) && L.inBody > 1; });
  assert.ok(inT.length >= 2, `cells in the tunnel are inside the amoeba (${inT.length} of them past its surface)`);
  // and the depth along its axis: open (outside) in the tunnel, body either side
  const along = (u, v) => { const ux = Math.cos(deep.a), uy = Math.sin(deep.a); return worldAt(A, deep.x + ux * u - uy * v, deep.y + uy * u + ux * v); };
  assert.ok(along(deep.len * 0.6, 0) < 0 && along(deep.len * 0.6, deep.w + 3) > 0, 'inside the tunnel is open water; beside it, body');
  // steer off: the drills let go, and after a moment the cytoplasm flows back in
  const L0 = deep.len, n0 = deep.n;
  for (let i = 0; i < 8; i++) step(15, { x: nx, y: ny, m: 1 });
  const L1 = deep.len;
  for (let i = 0; i < 60 && A.tunnels.includes(deep); i++) step(15);
  assert.ok(L1 >= L0 - 1.5 && !A.tunnels.includes(deep), `left alone it holds a moment (${L0.toFixed(1)} → ${L1.toFixed(1)} µm in 2 s), then closes up (gone)`);
  PINCH.minLen = oldMin; IRR.k = oldK;
  battle.tunnel = `60 drilling bored ${L0.toFixed(1)} µm in 4 s (${n0} in it); left alone it closed in ${(TUN.hold + L0 / TUN.close).toFixed(0)} s`;
}
/** A member's place in the amoeba's frame, and how deep it is under the body's surface as it was before any tunnel. */
function T_world(A, m) { const W = A._w; const L = W.amoebaLocal(m.x, m.y, { x: 0, y: 0 }); L.inBody = W.amoebaAt(L.x, L.y, W.time, false); return L; }
function inTun(T, L) { const ux = Math.cos(T.a), uy = Math.sin(T.a), px = L.x - T.x, py = L.y - T.y, u = px * ux + py * uy; if (u < 1 || u > T.len + T.w) return false; const s2 = Math.min(T.len, u); return Math.hypot(px - ux * s2, py - uy * s2) < T.w + 1; }
function worldAt(A, lx, ly) { return A._w.amoebaAt(lx, ly, A._w.time); }
{
  // a thin pseudopod can be bored straight through: a passage to its other side
  const T = setup({}, { quiet: true });
  const { coll, guards, P, step, fill, move, world } = T;
  const q = guards.byId.amoeba; guards.placeGate(q, 400, 0, 0);
  const A = q.A; A._w = world; q.atk.next = 1e9;
  // the arm at x = 70 along its edge: halfway out, from its side
  const [ax, len, w, lean] = AMOEBA_ARMS[1], b = AMOEBA.b, ry = b * Math.sqrt(1 - (ax / AMOEBA.a) ** 2) - b - 3, ph = Math.PI / 2 + lean;
  const ux = Math.cos(ph), uy = Math.sin(ph), sA = len * 0.45, mid = { x: ax + ux * sA, y: ry + uy * sA }, side = { x: -uy, y: ux }; // (side: across the arm)
  const thick = 2 * w * (1 - 0.35 * sA / len);
  const start = world.amoebaWorld(mid.x + side.x * 25, mid.y + side.y * 25, { x: 0, y: 0 });
  move(start.x, start.y); fill(40); step(20);
  // (steered at the arm's middle: the swarm presses on its side and stays there)
  let through = null;
  const C = coll.of(P), aim = { x: 0, y: 0 };
  for (let i = 0; i < 80 && !through; i++) {
    world.amoebaWorld(mid.x, mid.y, aim);
    const dx = aim.x - C.cx, dy = aim.y - C.cy, dl = Math.hypot(dx, dy) || 1;
    step(15, { x: dx / dl, y: dy / dl, m: Math.min(0.8, dl / 10 + 0.3) });
    through = A.tunnels.find((T2) => T2.through);
  }
  assert.ok(through && through.len > thick * 0.6, `drilling the side of a thin pseudopod (${thick.toFixed(1)} µm thick) bores a tunnel through it (${A.tunnels.map((T2) => T2.len.toFixed(1)).join(', ')} µm)`);
  // a passage: along its axis from the mouth to past the far side, open water all the way
  let open = true;
  for (let u = 0.5; u < through.len; u += 0.5) if (world.amoebaAt(through.x + Math.cos(through.a) * u, through.y + Math.sin(through.a) * u, world.time) > 0) open = false;
  const far = world.amoebaAt(through.x + Math.cos(through.a) * (through.len + 1), through.y + Math.sin(through.a) * (through.len + 1), world.time, false);
  assert.ok(open && far < 0, 'a passage through: open water all the way to the other side');
  assert.ok(q.hp === Infinity, 'it is not hurt by it, only irritated');
  battle.armThrough = `40 bored through a ${thick.toFixed(1)} µm pseudopod (${through.len.toFixed(1)} µm tunnel, ${world.time.toFixed(1)} s)`;
}
/** Bore a tunnel into the amoeba's front with n cells until it starts to pinch shut (no rout, no loop). Returns the scene and the tunnel. */
function pinchScene(n = 50) {
  const S = amoebaFight(n);
  S.A._w = S.world; S.q.atk.next = 1e9;
  let Tp = null;
  for (let i = 0; i < 2400 && !Tp; i++) { S.step(1, { x: -S.nx, y: -S.ny, m: 0.6 }); Tp = S.A.tunnels.find((T) => T.pinch); }
  return { ...S, Tp };
}
{
  // burrowed cells are trapped more easily: the tunnel's mouth narrows (the tell), then it closes on those still inside
  const oldK = IRR.k; IRR.k = 1e12;
  const S = pinchScene(50), { A, Tp, step, C, world, coll } = S;
  assert.ok(Tp, 'a tunnel with cells in it starts to pinch shut');
  const t0 = world.time, inside = C.members.filter((m) => inTun(Tp, T_world(A, m)) && T_world(A, m).inBody > 0.5);
  // its mouth visibly narrows: a point beside the axis near the mouth goes from open to body over the pinch
  const ux = Math.cos(Tp.a), uy = Math.sin(Tp.a), probe = () => world.amoebaAt(Tp.x + ux * 6 - uy * Tp.w * 0.6, Tp.y + uy * 6 + ux * Tp.w * 0.6, world.time);
  const open0 = probe();
  assert.ok(inside.every((m) => m.warned && m.warned.kind === 'amoeba'), `every cell inside is warned at once (${inside.length})`);
  step(Math.round(PINCH.tell * 0.85 * 60), { x: -S.nx, y: -S.ny, m: 0.6 }); // (staying in)
  const open1 = probe();
  assert.ok(open0 < 0 && open1 > 0, `its mouth narrows as it pinches (beside the axis: ${open0.toFixed(1)} → ${open1.toFixed(1)} µm inside its body)`);
  const lost0 = coll.lossLog.length;
  step(Math.round(PINCH.tell * 0.3 * 60), { x: -S.nx, y: -S.ny, m: 0.6 });
  const taken = coll.lossLog.slice(lost0);
  assert.ok(taken.length >= 3 && taken.every((e) => e.kind === 'amoeba' && e.warned !== null && e.warned >= PINCH.tell * 0.5 - 0.02), `those still inside when it shuts are engulfed (${taken.length}), each warned at least ${PINCH.tell * 0.5} s before (${Math.min(...taken.map((e) => e.warned))}-${Math.max(...taken.map((e) => e.warned))} s)`);
  assert.ok(taken.length <= PINCH.max, 'at most PINCH.max at a time');
  const m = inside.find((k) => k.dying);
  assert.ok(m && m.dying.kind === 'amoeba' && !m.parked, 'engulfed where they are (the vacuole animation plays)');
  assert.ok(world.time - t0 >= PINCH.tell - 0.05, 'not before its tell had run');
  IRR.k = oldK;
  battle.pinch = `a ${Tp.len.toFixed(1)} µm tunnel pinched shut ${PINCH.tell} s after its warning, on ${taken.length} cells left inside`;
}
{
  // backing out in time saves them: steered back out when the pinch shows, none is lost
  const oldK = IRR.k; IRR.k = 1e12;
  const S = pinchScene(50), { A, Tp, step, C, coll } = S;
  const inside = C.members.filter((m) => inTun(Tp, T_world(A, m)));
  step(Math.round(0.4 * 60), { x: -S.nx, y: -S.ny, m: 0.6 }); // (a moment to react)
  const lost0 = coll.lossLog.length;
  for (let i = 0; i < 12; i++) step(15, { x: S.nx, y: S.ny, m: 1 });
  assert.ok(inside.length >= 3 && coll.lossLog.length === lost0 && !inside.some((m) => m.dying), `pulled out of the tunnel in time, all ${inside.length} that were inside are saved`);
  IRR.k = oldK;
}

console.log(`bacterium flock: all checks pass
  battles: ${Object.entries(battle).map(([k, v]) => `${k}: ${v}`).join('\n           ')}`);
