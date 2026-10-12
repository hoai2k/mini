// Unit tests that need no browser: face geometry, Hoops physics, and the
// shared-room layer (net.js) running on the in-memory relay.
//   node --test chat/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syntheticFace, templatePoint, TEMPLATE } from '../js/face.js';
import { _physics as hoops } from '../games/hoops.js';
import { createFakeRooms } from './fake-rooms.js';
import { createNet } from '../js/net.js';
import { mapCover } from '../js/flyer.js';
import { EFFECT_IDS } from '../effects/index.js';
import { GAME_IDS } from '../games/index.js';
import { readdirSync } from 'node:fs';
import * as kartTrack from '../games/kart/track.js';
import * as kartSim from '../games/kart/sim.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('template points land on the synthetic face', () => {
  const f = syntheticFace(640, 480, { roll: 0.3 });
  for (const key of ['eyeL', 'eyeR']) {
    const tp = templatePoint(f, TEMPLATE[key].x, TEMPLATE[key].y);
    close(tp.x, f[key].x, 1e-3);
    close(tp.y, f[key].y, 1e-3);
  }
  close(f.roll, 0.3, 1e-9);
  const m = templatePoint(f, TEMPLATE.mouth.x, TEMPLATE.mouth.y);
  assert.ok(Math.hypot(m.x - f.mouth.x, m.y - f.mouth.y) < 2);
});

test('expressions come through from blendshapes', () => {
  const f = syntheticFace(640, 480, { smile: 0.8, pucker: 0.7, blinkL: 1 });
  close(f.smile, 0.8);
  close(f.pucker, 0.7);
  assert.ok(f.wink > 0.5);
});

test('Hoops is 2D and read faithfully: speed sets height, direction sets aim', () => {
  const run = (up, targetX, from = hoops.REST, hoop = hoops.SPOTS[0]) => {
    const b = hoops.newBall(from, hoops.throwVelocity(from, up, targetX, hoop), hoop);
    let crossX = null, maxZ = 0;
    while (!b.done) {
      const z0 = b.z;
      hoops.stepBall(b);
      maxZ = Math.max(maxZ, b.z);
      if (crossX === null && z0 < hoop.z && b.z >= hoop.z) crossX = b.x;
    }
    return { scored: b.scored, crossX, maxZ };
  };
  for (const hoop of hoops.SPOTS) {
    // Nothing goes past the hoop: every throw stops at the backboard's plane.
    for (const up of [0.9, 1.5, 2.4, 4, 8]) assert.ok(run(up, hoop.x, hoops.REST, hoop).maxZ < hoop.z + 0.38, `past the hoop at ${up}`);
    // The middle speed scores; well short and well long don't.
    assert.equal(run(hoops.U0, hoop.x, hoops.REST, hoop).scored, true);
    assert.equal(run(hoops.U0 * 0.55, hoop.x, hoops.REST, hoop).scored, false);
    assert.equal(run(hoops.U0 * 2.2, hoop.x, hoops.REST, hoop).scored, false);
  }
  // The scoring speeds sit around U0 in one window: wide enough to feel,
  // narrow enough to need judging.
  const hoop = hoops.SPOTS[0];
  // (Bank shots off the board can also go in at higher speeds; this is the
  // unbroken window of clean shots around U0.)
  let lo = hoops.U0, hi = hoops.U0;
  while (run(lo - 0.02, hoop.x).scored) lo -= 0.02;
  while (run(hi + 0.02, hoop.x).scored) hi += 0.02;
  assert.ok(lo > hoops.U0 * 0.7 && lo < hoops.U0 * 0.9, `slowest ${lo}`);
  assert.ok(hi > hoops.U0 * 1.1 && hi < hoops.U0 * 1.4, `fastest ${hi}`);
  // Speeds near U0 change the height little; far ones a lot.
  const vy = u => hoops.throwVelocity(hoops.REST, u, 0, hoop)[1];
  assert.ok(vy(hoops.U0 * 1.1) - vy(hoops.U0) < vy(hoops.U0 * 2) - vy(hoops.U0 * 1.9));
  // Aimed off to the side: arrives where aimed, and misses.
  const off = run(hoops.U0, hoop.x + 0.45);
  assert.equal(off.scored, false);
  assert.ok(Math.abs(off.crossX - (hoop.x + 0.45)) < 0.02, `arrives at ${off.crossX}`);
});

test('Hoops physics is deterministic, so ghosts replay exactly', () => {
  const from = { x: 0.2, y: 2.1, z: 0 }, hoop = hoops.SPOTS[2];
  const v = hoops.throwVelocity(from, 2.6, 0.1, hoop);
  const a = hoops.newBall(from, v, hoop), b = hoops.newBall(from, v, hoop);
  while (!a.done) hoops.stepBall(a);
  while (!b.done) hoops.stepBall(b);
  assert.deepEqual(a, b);
});

test('cover mapping centres a cropped video', () => {
  const rect = { left: 0, top: 0, width: 400, height: 400 };
  const p = mapCover(rect, 640, 480, 0.5, 0.5);
  close(p.x, 200);
  close(p.y, 200);
  const q = mapCover(rect, 640, 480, 0, 0);
  assert.ok(q.x < 0 && q.y === 0);
});

test('every listed effect and game has a file', () => {
  const fx = readdirSync(new URL('../effects/', import.meta.url));
  const games = readdirSync(new URL('../games/', import.meta.url));
  for (const id of EFFECT_IDS) assert.ok(fx.includes(`${id}.js`), `effects/${id}.js`);
  for (const id of GAME_IDS) assert.ok(games.includes(`${id}.js`), `games/${id}.js`);
  assert.equal(EFFECT_IDS.length, 75);
  assert.equal(new Set(EFFECT_IDS).size, 75);
  assert.equal(GAME_IDS.length, 24);
});

const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 3000) {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error('timed out');
    await wait(20);
  }
}

test('everyone lands in the same room, and it survives the host leaving', async () => {
  const rooms = createFakeRooms({ latency: 5 });
  const mk = name => createNet({ game: 'chat', room: 'everyone', me: { id: name, name }, rooms });
  const a = mk('a'), b = mk('b');
  await until(() => a.peers.has('b') && b.peers.has('a'));

  const got = [];
  b.onTopic('hi', (d, from) => got.push([d, from]));
  a.send('hi', { n: 1 });
  a.sendTo('nobody', 'hi', { n: 2 });
  await until(() => got.length === 1);
  assert.deepEqual(got[0], [{ n: 1 }, 'a']);

  // A third person joins; then whoever hosts leaves. The other two reconnect
  // into a fresh room and still see each other.
  const c = mk('c');
  await until(() => c.peers.size === 2 && a.peers.size === 2);
  a.leave();
  await until(() => b.peers.size === 1 && c.peers.size === 1 && b.peers.has('c'), 8000);
  assert.equal(b.status, 'connected');
  b.leave();
  c.leave();
});

test('each theme has its own shade of every colour name', async () => {
  const { PALETTES, COLOR_NAMES, themedColor, colorName } = await import('../js/palette.js');
  for (const [t, p] of Object.entries(PALETTES)) {
    assert.equal(p.length, COLOR_NAMES.length, t);
    assert.equal(new Set(p).size, p.length, `${t} shades are distinct`);
  }
  assert.equal(colorName('#4DABF7'), 'blue');
  assert.equal(themedColor('#4dabf7', 'art'), PALETTES.art[5]);
  assert.equal(themedColor('#123456', 'art'), '#123456');
});

test('Go Fish deals thirteen creatures, four of each, and books sets of four', async () => {
  const { newDeck, takeBooks, dealSize } = await import('../games/gofish.js');
  const deck = newDeck();
  assert.equal(deck.length, 52);
  for (let r = 0; r < 13; r++) assert.equal(deck.filter(c => c === r).length, 4);
  assert.equal(dealSize(2), 7);
  assert.equal(dealSize(3), 7);
  assert.equal(dealSize(4), 5);
  const t = takeBooks([3, 1, 3, 3, 5, 3, 1]);
  assert.deepEqual(t.books, [3]);
  assert.deepEqual(t.hand, [1, 5, 1]);
  assert.deepEqual(takeBooks([2, 2, 2]).books, []);
});

test('Hoops: the ball is in front of the rim going up and behind it coming down', () => {
  const { throwVelocity, newBall, stepBall, behindRim, SPOTS, REST, U0 } = hoops;
  const hoop = SPOTS[0];
  let fallingAtHoop = 0;
  for (const k of [0.9, 1, 1.1, 1.25]) {
    const b = newBall(REST, throwVelocity(REST, U0 * k, hoop.x, hoop), hoop);
    for (let i = 0; i < 2000 && !b.done; i++) {
      stepBall(b);
      if (b.vy > 0) assert.equal(behindRim(b, hoop), false, `rising ball in front (k ${k})`);
      // Coming down through rim height near the hoop: behind the front rim.
      if (b.vy < 0 && Math.abs(b.y - hoop.y) < 0.3 && b.z > hoop.z - 0.4) {
        assert.equal(behindRim(b, hoop), true, `falling ball at the rim is behind (k ${k})`);
        fallingAtHoop++;
      }
      if (b.vy < 0 && b.y < hoop.y - 1) break;
    }
  }
  assert.ok(fallingAtHoop > 10, 'shots came down past the rim');
  // A ball that bounced well back towards the player stays in front.
  assert.equal(behindRim({ vy: -2, z: hoop.z - 1.2 }, hoop), false);
});

test('Mob Whack: the same seed gives the same fair spawns', async () => {
  const { _logic: W } = await import('../games/whack.js');
  const a = W.makeSchedule(12345), b = W.makeSchedule(12345), c = W.makeSchedule(999);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  for (const seed of [1, 7, 12345, 4294967295, 2024, 31337, 555, 8080]) {
    const ev = W.makeSchedule(seed);
    const kinds = k => ev.filter(e => e.kind === k).length;
    assert.ok(ev.length > 50, `seed ${seed}: plenty of mobs (${ev.length})`);
    assert.ok(kinds('zombie') > kinds('creeper') && kinds('creeper') >= 3 && kinds('villager') >= 3, `seed ${seed}: mix`);
    assert.ok(kinds('enderman') >= 1 && kinds('enderman') <= 2, `seed ${seed}: an enderman or two`);
    const byHole = Array.from({ length: 9 }, () => []);
    let prev = -1;
    for (const e of ev) {
      assert.ok(e.stops[0].t >= prev, 'in order');
      prev = e.stops[0].t;
      if (e.kind === 'enderman') {
        assert.ok(e.stops.length >= 3, 'an enderman hops at least twice');
        for (let j = 1; j < e.stops.length; j++) assert.notEqual(e.stops[j].hole, e.stops[j - 1].hole, 'hops to another hole');
      } else assert.equal(e.stops.length, 1);
      for (const s of e.stops) {
        assert.ok(Number.isInteger(s.hole) && s.hole >= 0 && s.hole < 9);
        assert.ok(s.t >= 0 && s.t + s.dur <= W.DURATION, 'ends in time');
        byHole[s.hole].push([s.t, s.t + s.dur + W.RISE]);
      }
    }
    for (const list of byHole) {
      list.sort((x, y) => x[0] - y[0]);
      for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1], `seed ${seed}: a hole holds one mob at a time`);
    }
    // It gets faster: more spawns in the last 20 s than the first 20 s.
    const early = ev.filter(e => e.stops[0].t < 20000).length, late = ev.filter(e => e.stops[0].t >= 40000).length;
    assert.ok(late > early, `seed ${seed}: ramps up (${early} then ${late})`);
  }
});

test('Mob Whack: points, combos, layout and untrusted state', async () => {
  const { _logic: W } = await import('../games/whack.js');
  assert.equal(W.comboMult(1), 1);
  assert.equal(W.comboMult(4), 2);
  assert.equal(W.comboMult(40), 4);
  assert.equal(W.pointsFor('zombie', 1), 10);
  assert.equal(W.pointsFor('zombie', 8), 30);
  assert.ok(W.pointsFor('creeper', 1) > W.pointsFor('zombie', 1));
  assert.ok(W.pointsFor('creeper', 1, true) > W.pointsFor('creeper', 1));
  assert.equal(W.pointsFor('enderman', 1), 50);
  assert.ok(W.pointsFor('villager', 9) < 0);
  // The holes and risen mobs stay on screen below the scores, portrait or wide.
  for (const [w, h, top] of [[390, 640, 80], [460, 440, 60], [1900, 440, 60], [1024, 768, 60], [320, 480, 70]]) {
    const { k, ox, oy } = W.fieldLayout(w, h, top);
    const x0 = ox + W.REGION.x0 * k, x1 = ox + W.REGION.x1 * k, y0 = oy + W.REGION.y0 * k, y1 = oy + W.REGION.y1 * k;
    assert.ok(x0 >= -1 && x1 <= w + 1 && y1 <= h + 1 && y0 >= top - 40, `${w}x${h}: region on screen`);
  }
  // Wide enough: the field covers the whole canvas.
  const c = W.fieldLayout(1024, 768, 60);
  assert.ok(c.ox <= 0 && c.oy <= 0 && c.ox + W.IMG_W * c.k >= 1024 && c.oy + W.IMG_H * c.k >= 768);
  assert.ok(W.validShared({ round: 1, seed: 5, startAt: Date.now() }));
  for (const bad of [null, 5, {}, { round: 0, seed: 1, startAt: Date.now() }, { round: 1, seed: -1, startAt: Date.now() }, { round: 1, seed: 1, startAt: 'x' }, { round: 1, seed: 1.5, startAt: Date.now() }]) {
    assert.equal(W.validShared(bad), false);
  }
  assert.equal(W.readState({ round: 2, score: 50 }, 3), null);
  assert.deepEqual(W.readState({ round: 3, score: 1e9, hearts: 99, play: true, out: 'yes' }, 3), { score: 99999, hearts: 3, play: true, out: false });
  assert.deepEqual(W.readState({ round: 3, score: 'lots', hearts: -2 }, 3), { score: 0, hearts: 0, play: false, out: false });
});

test('Baseball: pitches reach their target, and contact decides the hit', async () => {
  const { makePitch, pitchPos, contact, launchVelocity, outcome, fenceDist, TIMING, FOUL } = (await import('../games/baseball.js'))._physics;
  // Every pitch crosses the plate at its target, at its time.
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 30; i++) {
    const p = makePitch(rand);
    const b = pitchPos(p, p.T);
    close(b.x, p.tx, 1e-9);
    close(b.y, p.ty, 1e-9);
    close(b.z, 0, 1e-9);
    assert.ok(['fast', 'change', 'curve'].includes(p.type) && p.T > 0.5 && p.T < 1.1);
    assert.ok(pitchPos(p, p.T + 0.1).z < 0, 'it carries on past the plate');
  }
  // The wall: 377 ft to centre, 322 ft down the lines.
  close(fenceDist(0), 115);
  close(fenceDist(FOUL), 98);

  const from = { x: 0, y: 0.8, z: 0 };
  const hit = (dt, dx, dy) => {
    const c = contact(dt, dx, dy);
    return c && { c, ...outcome(from, launchVelocity(c)) };
  };
  // Right on the ball, right on time: a home run to centre.
  const best = hit(0, 0, 0);
  assert.equal(best.c.q, 1);
  assert.equal(best.kind, 'hr');
  assert.ok(best.dist > fenceDist(0) && best.dist < 150, `carries ${best.dist}`);
  // Outside the timing window or out of reach: a miss.
  assert.equal(contact(TIMING + 0.01, 0, 0), null);
  assert.equal(contact(-TIMING - 0.01, 0, 0), null);
  assert.equal(contact(0, 0, 0.35), null);
  assert.equal(contact(NaN, 0, 0), null);
  // Early pulls it to left field, late pushes it to right; very late is foul.
  assert.ok(hit(-0.05, 0, 0).c.spray < -10);
  assert.ok(hit(0.05, 0, 0).c.spray > 10);
  assert.equal(hit(0.12, 0, 0).kind, 'foul');
  assert.equal(hit(-0.12, 0, 0).kind, 'foul');
  // On top of the ball: a grounder; well under it: a pop-up.
  assert.equal(hit(0, 0, 0.27).kind, 'grounder');
  assert.equal(hit(0, 0, -0.29).kind, 'pop');
  // A slightly early swing still goes out, down the left field side.
  assert.equal(hit(-0.04, 0, 0).kind, 'hr');
});

// --- Kart Dash ---------------------------------------------------------------
const kartWorld = (() => {
  const track = kartTrack.buildTrack();
  const scen = kartTrack.scenery(track);
  const obstacles = kartTrack.obstacleGrid([...scen.trees.map(t => ({ ...t, r: t.k })), ...scen.tyres.map(t => ({ ...t, r: 1.25 }))]);
  return { track, scen, obstacles, pads: kartTrack.boostPads(track) };
})();

test('Kart Dash track: a closed loop inside the world, located both ways', () => {
  const { track, scen } = kartWorld;
  assert.ok(track.length > 700 && track.length < 1100, `length ${track.length}`);
  for (let i = 0; i < track.n; i++) {
    assert.ok(track.xs[i] > track.half && track.xs[i] < kartTrack.WORLD - track.half);
    assert.ok(track.zs[i] > track.half && track.zs[i] < kartTrack.WORLD - track.half);
  }
  // Closed: the last sample is a step from the first.
  const gap = Math.hypot(track.xs[0] - track.xs[track.n - 1], track.zs[0] - track.zs[track.n - 1]);
  assert.ok(gap < track.step * 1.5, `gap ${gap}`);
  // pointAt and locate agree, on the road and beside it.
  for (const s of [0, 123.4, track.length * 0.5, track.length - 2]) {
    for (const d of [-6, 0, 4]) {
      const p = kartTrack.pointAt(track, s, d);
      const l = kartTrack.locate(track, p.x, p.z);
      const ds = Math.abs(((l.s - s + track.length * 1.5) % track.length) - track.length / 2);
      assert.ok(ds < 0.6, `s ${s} -> ${l.s}`);
      close(l.d, d, 0.35);
    }
  }
  // Scenery stays off the road, and every grid spot is on it.
  for (const t of scen.trees) assert.ok(kartTrack.distToCentre(track, t.x, t.z) > track.half + 6);
  for (let slot = 0; slot < 4; slot++) {
    const g = kartTrack.gridSpot(track, slot);
    assert.ok(g.s < 0 && Math.abs(kartTrack.locate(track, g.x, g.z).d) < track.half - 1);
  }
  assert.equal(kartTrack.itemBoxes(track).length, 12);
});

test('Kart Dash laps: progress carries over the line, backwards and jumps do not count', () => {
  const L = 900;
  let total = -10, s = L - 10;
  for (let k = 0; k < 3 * L / 3 + 20; k++) {
    const next = (s + 3) % L;
    total = kartTrack.advance(total, s, next, L);
    s = next;
  }
  close(total, -10 + (3 * L / 3 + 20) * 3, 1e-6);
  assert.deepEqual(kartTrack.lapOf(-5, L), { lap: 1, done: 0, finished: false });
  assert.deepEqual(kartTrack.lapOf(L + 1, L), { lap: 2, done: 1, finished: false });
  assert.deepEqual(kartTrack.lapOf(3 * L + 1, L), { lap: 3, done: 3, finished: true });
  // Reversing over the line takes the lap back off.
  assert.equal(kartTrack.advance(L + 2, 2, L - 3, L), L - 3);
  // A jump to another stretch of track is ignored.
  assert.equal(kartTrack.advance(100, 100, 400, L), 100);
});

test('Kart Dash karts: accelerate, slow on grass, steer, drift into a boost, spin out', () => {
  const { track, obstacles, pads } = kartWorld;
  const env = { track, obstacles, pads, raceTime: 0 };
  const k = kartSim.newKart(kartTrack.gridSpot(track, 0));
  for (let i = 0; i < 240; i++) kartSim.stepKart(k, { steer: 0 }, 1 / 60, env);
  assert.ok(k.v > 20 && k.v <= kartSim.VMAX + 1e-6, `speed ${k.v}`);
  // Off the road it slows to grass speed.
  const g = kartSim.newKart({ ...kartTrack.pointAt(track, 20, track.half + 5), s: 20 });
  g.v = kartSim.VMAX;
  for (let i = 0; i < 120; i++) kartSim.stepKart(g, { steer: 0 }, 1 / 60, env);
  assert.ok(g.offroad && g.v < kartSim.OFFROAD + 2, `grass speed ${g.v}`);
  // Steering turns the kart: right is clockwise (heading increases).
  const r = kartSim.newKart({ ...kartTrack.pointAt(track, 40), s: 40 });
  r.v = 20;
  const h0 = r.h;
  for (let i = 0; i < 20; i++) kartSim.stepKart(r, { steer: 1 }, 1 / 60, env);
  assert.ok(kartTrack.wrapAngle(r.h - h0) > 0.3);
  // A long drift ends in a boost.
  const d = kartSim.newKart({ ...kartTrack.pointAt(track, 40), s: 40 });
  d.v = 22;
  let ev = [];
  for (let i = 0; i < 80; i++) kartSim.stepKart(d, { steer: 1, drift: true }, 1 / 60, env);
  assert.equal(d.drift, 1);
  ev = kartSim.stepKart(d, { steer: 0, drift: false }, 1 / 60, env);
  assert.ok(ev.includes('mini') || ev.includes('super'));
  assert.ok(d.boost > 0);
  // Spinning: no steering, speed bleeds away.
  const sp = kartSim.newKart({ ...kartTrack.pointAt(track, 40), s: 40 });
  sp.v = 25;
  sp.spin = kartSim.SPIN_TIME;
  const hs = sp.h;
  for (let i = 0; i < 30; i++) kartSim.stepKart(sp, { steer: 1 }, 1 / 60, env);
  assert.ok(sp.v < 12 && Math.abs(kartTrack.wrapAngle(sp.h - hs)) < 1e-9);
});

test('Kart Dash autopilot drives three laps and the laps count', () => {
  const { track, obstacles, pads } = kartWorld;
  const k = kartSim.newKart(kartTrack.gridSpot(track, 1));
  const brain = { lane: 1, phase: 0.5, skill: 0.6, stuck: 0 };
  let t = 0, laps = 0, off = 0;
  while (!k.finished && t < 200) {
    kartSim.watchStuck(brain, k, 1 / 60);
    const ev = kartSim.stepKart(k, kartSim.autopilot(k, track, brain, t), 1 / 60, { track, obstacles, pads, raceTime: t });
    if (ev.includes('lap') || ev.includes('finish')) laps++;
    if (k.offroad) off++;
    t += 1 / 60;
  }
  assert.equal(laps, 3);
  assert.equal(k.lapTimes.length, 3);
  assert.ok(k.finished > 60 && k.finished < 120, `finished in ${k.finished}`);
  assert.ok(off / 60 < 3, `${(off / 60).toFixed(1)} s off the road`);
});

test('Kart Dash items: leaders get peels and bombs, the back gets boosts and stars', () => {
  const tally = rank => {
    const n = { boost: 0, banana: 0, bomb: 0, star: 0 };
    for (let i = 0; i < 1000; i++) n[kartSim.rollItem(rank, 4, (i + 0.5) / 1000)]++;
    return n;
  };
  const first = tally(0), last = tally(3);
  for (const n of [first, last]) assert.equal(n.boost + n.banana + n.bomb + n.star, 1000);
  assert.ok(first.banana > last.banana && first.star < last.star && first.boost < last.boost);
  assert.ok(first.star < 50 && last.star > 150);
  for (const r of [0, 0.3, 0.999]) assert.ok(kartSim.ITEMS.includes(kartSim.rollItem(1, 4, r)));
  // A bomb flies ahead, bounces, stops and goes off at its fuse, the same everywhere.
  const b = { x: 50, z: 60, h: 0, v: 40 };
  const p1 = kartSim.bombAt(b, 0.5), p2 = kartSim.bombAt(b, 1.4), p3 = kartSim.bombAt(b, kartSim.BOMB_FUSE);
  assert.ok(p1.x > 50 && p2.x > p1.x && Math.abs(p1.z - 60) < 1e-9);
  close(p3.x, kartSim.bombAt(b, 1.3).x, 1e-9);
  assert.equal(p3.done, true);
  assert.equal(p2.done, false);
  assert.deepEqual(kartSim.bombAt(b, 0.9), kartSim.bombAt(b, 0.9));
  // Standings: finishers by time, then distance.
  const order = kartSim.standings([{ id: 'a', total: 500, finished: 0 }, { id: 'b', total: 2700, finished: 80 }, { id: 'c', total: 900, finished: 0 }, { id: 'd', total: 2700, finished: 75 }]);
  assert.deepEqual(order.map(k => k.id), ['d', 'b', 'c', 'a']);
});

test('Kart Dash holds two items: a box fills the next slot, using takes the first', () => {
  const { track } = kartWorld;
  const k = kartSim.newKart(kartTrack.gridSpot(track, 0));
  assert.deepEqual(k.items, []);
  assert.equal(kartSim.itemReady(k), false);
  assert.equal(kartSim.takeItem(k), null);
  // The first box: rolling, not usable until it stops.
  assert.equal(kartSim.addItem(k, 'banana'), true);
  assert.ok(k.roll > 0);
  assert.equal(kartSim.itemReady(k), false);
  assert.equal(kartSim.takeItem(k), null);
  k.roll = 0;
  // The second box fills slot two; the first can be used while it rolls.
  assert.equal(kartSim.addItem(k, 'bomb'), true);
  assert.deepEqual(k.items, ['banana', 'bomb']);
  assert.equal(kartSim.itemReady(k), true);
  // A third box gives nothing; unknown items are refused.
  assert.equal(kartSim.addItem(k, 'star'), false);
  assert.equal(kartSim.addItem({ items: [] }, 'shell'), false);
  assert.equal(k.items.length, kartSim.ITEM_SLOTS);
  // Using takes the first and the second moves up (still rolling, so it waits).
  assert.equal(kartSim.takeItem(k), 'banana');
  assert.deepEqual(k.items, ['bomb']);
  assert.equal(kartSim.takeItem(k), null);
  k.roll = 0;
  assert.equal(kartSim.takeItem(k), 'bomb');
  assert.deepEqual(k.items, []);
  // A slot freed by using fills again.
  assert.equal(kartSim.addItem(k, 'star', 0), true);
  assert.equal(kartSim.takeItem(k), 'star');
});

test('Kart Dash touch steering: drag from the touch-down point, anchor follows, drag down brakes', () => {
  const W = 400, H = 720;                       // a phone-sized seat
  const r = kartSim.touchLock(W, H), b = kartSim.touchBrake(W, H);
  close(r, 56, 1e-9);                           // 14% of the shorter side
  close(b, 72, 1e-9);                           // 10% of the height
  assert.equal(kartSim.touchLock(2000, 1200), kartSim.TOUCH.lockMax);
  assert.equal(kartSim.touchLock(200, 300), kartSim.TOUCH.lockMin);
  const d0 = { x0: 200, y0: 500, brake: false };
  const at = (dx, dy = 0, d = d0) => kartSim.dragSteer(d, d.x0 + dx, d.y0 + dy, W, H);
  // The dead zone, then a gentle curve: half the lock is less than half the steer, full lock is 1.
  assert.equal(at(2).steer, 0);
  assert.equal(at(-2).steer, 0);
  const half = at(r / 2).steer;
  assert.ok(half > 0.2 && half < 0.5, `half drag steers ${half}`);
  close(at(-r / 2).steer, -half, 1e-12);
  close(at(r).steer, 1, 1e-12);
  close(at(-r).steer, -1, 1e-12);
  // Monotonic.
  let last = -Infinity;
  for (let dx = -r * 1.5; dx <= r * 1.5; dx += 2) { const s = at(dx).steer; assert.ok(s >= last - 1e-12); last = s; }
  // It steers from where the finger went down, not the screen centre.
  assert.equal(kartSim.dragSteer({ x0: 20, y0: 500, brake: false }, 20, 500, W, H).steer, 0);
  assert.ok(kartSim.dragSteer({ x0: 20, y0: 500, brake: false }, 60, 500, W, H).steer > 0.5);
  // Past full lock the anchor follows, so coming back turns the other way at once.
  const far = at(r + 40);
  assert.equal(far.steer, 1);
  close(far.x0, d0.x0 + 40, 1e-9);
  const back = kartSim.dragSteer(far, d0.x0 + 40, 500, W, H);
  assert.equal(back.steer, 0);
  assert.ok(kartSim.dragSteer(far, d0.x0, 500, W, H).steer < -0.5);
  // Dragging well down brakes; a little down does not; sliding back up past half releases.
  assert.equal(at(0, b * 0.8).brake, false);
  const br = at(10, b + 4);
  assert.equal(br.brake, true);
  assert.ok(br.steer > 0, 'it still steers while braking');
  assert.equal(kartSim.dragSteer(br, 210, d0.y0 + b * 0.7, W, H).brake, true);
  assert.equal(kartSim.dragSteer(br, 210, d0.y0 + b * 0.3, W, H).brake, false);
  // The anchor follows the finger up, so dragging down from higher up brakes too.
  const up = at(0, -100);
  assert.equal(up.y0, d0.y0 - 100);
  assert.equal(kartSim.dragSteer(up, 200, d0.y0 - 100 + b + 2, W, H).brake, true);
});

test('Kart Dash network karts are packed small and checked on arrival', () => {
  const { track } = kartWorld;
  const k = kartSim.newKart(kartTrack.gridSpot(track, 0));
  k.spin = 0.5;
  k.star = 2;
  k.drift = 1;
  k.charge = 1.2;
  const a = kartSim.packKart(k);
  assert.equal(a.length, 7);
  const u = kartSim.unpackKart(a);
  close(u.x, k.x, 0.01);
  assert.equal(u.fl, 1 | 4 | 8 | 16 | 32);
  assert.equal(kartSim.unpackKart(null), null);
  assert.equal(kartSim.unpackKart([1, 2, 3]), null);
  assert.equal(kartSim.unpackKart([1, 2, 3, 4, 5, 6, 'x']), null);
  assert.equal(kartSim.unpackKart([1e6, 2, 3, 4, 5, 6, 0]), null);
  assert.equal(kartSim.unpackKart([10, 20, 0, 999, 0, 0, 0]).v, 60);
});

test('Copy Cat: puffed cheeks against the resting face, and one eye shut', async () => {
  const { _logic: C } = await import('../games/copycat.js');
  // A face whose lower cheeks are `w` wide, with eye corners 100 apart.
  const face = (w, extra = {}) => {
    const pts = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
    pts[33] = { x: -50, y: 0 }; pts[263] = { x: 50, y: 0 };
    pts[132] = { x: -w / 2, y: 60 }; pts[361] = { x: w / 2, y: 60 };
    pts[58] = { x: -w / 2 * 0.9, y: 90 }; pts[288] = { x: w / 2 * 0.9, y: 90 };
    return { pts, mouthOpen: 0, smile: 0, cheekPuff: 0, blinkL: 0, blinkR: 0, ...extra };
  };
  const puff = C.EXPRS.find(e => e.text.startsWith('Puff'));
  C.puff.base = 0;
  for (let i = 0; i < 60; i++) C.trackPuff(face(140));
  assert.ok(puff.get() < 0.1, 'resting face is not a puff');
  for (let i = 0; i < 10; i++) C.trackPuff(face(147));   // 5% wider, a third of a second
  assert.ok(puff.get() > puff.thr, `puffed cheeks count (${puff.get().toFixed(2)})`);
  C.trackPuff(face(147, { mouthOpen: 0.6 }));
  assert.ok(puff.get() < puff.thr, 'an open mouth is not a puff');
  C.trackPuff(face(140, { cheekPuff: 0.3 }));
  assert.ok(puff.get() > puff.thr, 'the tracker\'s own cheekPuff still counts');
  const eye = C.EXPRS.find(e => e.text.startsWith('Close one eye'));
  assert.ok(eye.get(face(140, { blinkL: 0.9, blinkR: 0.1 })) > eye.thr);
  assert.ok(eye.get(face(140, { blinkL: 0.9, blinkR: 0.85 })) < eye.thr, 'both eyes shut is not one eye');
  assert.ok(!C.EXPRS.some(e => /both eyes|Wink/.test(e.text)));
});
