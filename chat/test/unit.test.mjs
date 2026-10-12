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
  assert.equal(GAME_IDS.length, 22);
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
